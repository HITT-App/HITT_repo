/**
 * Re-encode oversized storage images to WebP, in place.
 *
 * The owner's workout thumbnails were exported as 6-9MB PNGs at ~1520x2688. Re-encoding to
 * WebP at the SAME dimensions gives a ~96% reduction with no visible quality loss and no
 * resolution change (8,799,743 -> 337,134 bytes on the largest one).
 *
 * This is what caused the 2026-08-14 outage: storage crossed the 1GB free-tier quota and
 * every endpoint — auth included — started returning 402. Pro raised the ceiling; it did not
 * remove the originals.
 *
 * Delivery is already handled separately by src/lib/storage-image.ts, which requests a resized
 * WebP through Supabase's transformer. That fixed what users download. This fixes what we store.
 *
 * SAFETY
 *   - Dry run by default. Nothing is written without --apply.
 *   - An object is only ever replaced after its .webp has been uploaded AND every referencing
 *     database column has been repointed. Delete is last.
 *   - Objects with no database reference are re-encoded but NEVER deleted — an unreferenced
 *     file here is far more likely to be a reference this script doesn't know about than a
 *     genuine orphan. (Deciding "orphaned" from one table once produced a delete list of ~100
 *     live workout videos.)
 *   - --keep-originals skips the delete entirely, so a run is fully reversible.
 *   - Only files that actually get smaller are replaced.
 *
 * Usage:
 *   SUPABASE_URL=... SUPABASE_SERVICE_ROLE_KEY=... npx tsx scripts/reencode-storage-images.ts
 *   ... --apply                 actually do it
 *   ... --bucket meal-images    default: app-assets
 *   ... --min-kb 500            only touch objects above this size (default 500)
 *   ... --limit 5               process at most N objects (good for a cautious first run)
 *   ... --keep-originals        upload + repoint, but don't delete the source
 */
import { createClient } from "@supabase/supabase-js";
import sharp from "sharp";

const URL = process.env.SUPABASE_URL ?? process.env.VITE_SUPABASE_URL ?? "";
const KEY = process.env.SUPABASE_SERVICE_ROLE_KEY ?? "";
if (!URL || !KEY) {
  throw new Error(
    "Set SUPABASE_URL (or VITE_SUPABASE_URL) and SUPABASE_SERVICE_ROLE_KEY.\n" +
      "The service role key is in Supabase → Project Settings → API. Never commit it.",
  );
}

const argv = process.argv.slice(2);
const flag = (name: string, fallback?: string) => {
  const i = argv.indexOf(`--${name}`);
  return i === -1 ? fallback : argv[i + 1];
};
const APPLY = argv.includes("--apply");
const KEEP_ORIGINALS = argv.includes("--keep-originals");
const BUCKET = flag("bucket", "app-assets")!;
const MIN_BYTES = Number(flag("min-kb", "500")) * 1024;
const LIMIT = Number(flag("limit", "0"));
const QUALITY = Number(flag("quality", "82"));

const db = createClient(URL, KEY, { auth: { persistSession: false } });

/** Every column that can point at a storage object. Missing one orphans live content. */
const REFERENCING_COLUMNS: { table: string; column: string }[] = [
  { table: "workouts", column: "thumbnail_url" },
  { table: "workouts", column: "video_url" },
  { table: "workouts", column: "instructor_avatar" },
  { table: "workout_exercises", column: "thumbnail_url" },
  { table: "workout_exercises", column: "video_url" },
  { table: "routes", column: "thumbnail_url" },
  { table: "recipes", column: "image_url" },
  { table: "meals", column: "image_url" },
  { table: "meal_logs", column: "image_url" },
  { table: "community_posts", column: "image_url" },
  { table: "community_posts", column: "before_image_url" },
  { table: "community_posts", column: "after_image_url" },
  { table: "community_profiles", column: "avatar_url" },
  { table: "profiles", column: "avatar_url" },
  { table: "coaches", column: "avatar_url" },
];

const kb = (n: number) => `${(n / 1024).toFixed(0)} kB`;
const mb = (n: number) => `${(n / 1024 / 1024).toFixed(1)} MB`;

type Obj = { name: string; size: number; mimetype: string };

async function listObjects(prefix = ""): Promise<Obj[]> {
  const out: Obj[] = [];
  const walk = async (dir: string) => {
    let offset = 0;
    for (;;) {
      const { data, error } = await db.storage
        .from(BUCKET)
        .list(dir, { limit: 100, offset, sortBy: { column: "name", order: "asc" } });
      if (error) throw error;
      if (!data?.length) break;
      for (const entry of data) {
        const path = dir ? `${dir}/${entry.name}` : entry.name;
        // A folder comes back with no id/metadata — recurse into it.
        if (!entry.id) await walk(path);
        else
          out.push({
            name: path,
            size: Number(entry.metadata?.size ?? 0),
            mimetype: String(entry.metadata?.mimetype ?? ""),
          });
      }
      offset += data.length;
    }
  };
  await walk(prefix);
  return out;
}

/** Find every row pointing at this object, across all known columns. */
async function findReferences(objectName: string) {
  const hits: { table: string; column: string; id: string; url: string }[] = [];
  for (const { table, column } of REFERENCING_COLUMNS) {
    const { data, error } = await db
      .from(table)
      .select(`id, ${column}`)
      .like(column, `%${objectName}`);
    // A table or column that doesn't exist in this project is not an error worth stopping for.
    if (error) continue;
    for (const row of data ?? []) {
      const url = (row as Record<string, unknown>)[column];
      if (typeof url === "string") hits.push({ table, column, id: String((row as { id: unknown }).id), url });
    }
  }
  return hits;
}

async function main() {
  console.log(
    `\n${APPLY ? "APPLYING" : "DRY RUN"} — bucket "${BUCKET}", images over ${kb(MIN_BYTES)}, WebP q${QUALITY}` +
      `${KEEP_ORIGINALS ? ", keeping originals" : ""}\n`,
  );

  const all = await listObjects();
  let candidates = all
    .filter((o) => o.mimetype.startsWith("image/") && o.mimetype !== "image/webp")
    .filter((o) => o.size >= MIN_BYTES)
    .sort((a, b) => b.size - a.size);
  if (LIMIT > 0) candidates = candidates.slice(0, LIMIT);

  if (!candidates.length) {
    console.log("Nothing to do — no non-WebP images above the threshold.");
    return;
  }

  console.log(`${candidates.length} candidate(s), ${mb(candidates.reduce((s, o) => s + o.size, 0))} total\n`);

  let before = 0;
  let after = 0;
  let converted = 0;
  let skipped = 0;
  let unreferenced = 0;

  for (const obj of candidates) {
    const refs = await findReferences(obj.name);
    const label = `${obj.name}  ${kb(obj.size)}`;

    const { data: blob, error: dlErr } = await db.storage.from(BUCKET).download(obj.name);
    if (dlErr || !blob) {
      console.log(`  SKIP  ${label} — download failed: ${dlErr?.message}`);
      skipped++;
      continue;
    }

    const input = Buffer.from(await blob.arrayBuffer());
    // No resize: dimensions are preserved, only the encoding changes.
    const output = await sharp(input).webp({ quality: QUALITY, effort: 6 }).toBuffer();

    before += obj.size;

    if (output.length >= obj.size) {
      console.log(`  SKIP  ${label} — WebP is not smaller (${kb(output.length)})`);
      after += obj.size;
      skipped++;
      continue;
    }

    after += output.length;
    converted++;
    const saving = (100 * (1 - output.length / obj.size)).toFixed(0);
    const newName = obj.name.replace(/\.[^.]+$/, ".webp");
    const refNote = refs.length
      ? `${refs.length} reference(s)`
      : "NO references — will re-encode but NOT delete original";
    if (!refs.length) unreferenced++;

    console.log(`  ${APPLY ? "CONV" : "would"}  ${label} → ${kb(output.length)} (−${saving}%)  [${refNote}]`);
    for (const r of refs) console.log(`          ${r.table}.${r.column} (${r.id})`);

    if (!APPLY) continue;

    // 1. upload the new object
    const { error: upErr } = await db.storage
      .from(BUCKET)
      .upload(newName, output, { contentType: "image/webp", upsert: true });
    if (upErr) {
      console.log(`        UPLOAD FAILED — ${upErr.message}; original left untouched`);
      continue;
    }

    // 2. repoint every referencing row before removing anything
    let repointFailed = false;
    for (const r of refs) {
      const nextUrl = r.url.replace(obj.name, newName);
      const { error: updErr } = await db.from(r.table).update({ [r.column]: nextUrl }).eq("id", r.id);
      if (updErr) {
        console.log(`        REPOINT FAILED — ${r.table}.${r.column} ${r.id}: ${updErr.message}`);
        repointFailed = true;
      }
    }

    // 3. only now is the original safe to remove
    if (repointFailed) {
      console.log("        original kept (a reference could not be updated)");
    } else if (KEEP_ORIGINALS) {
      console.log("        original kept (--keep-originals)");
    } else if (!refs.length) {
      console.log("        original kept (nothing referenced it — not assuming it is an orphan)");
    } else {
      const { error: rmErr } = await db.storage.from(BUCKET).remove([obj.name]);
      if (rmErr) console.log(`        original kept — delete failed: ${rmErr.message}`);
    }
  }

  console.log(
    `\n${APPLY ? "Done" : "Dry run complete"} — ${converted} to convert, ${skipped} skipped` +
      `${unreferenced ? `, ${unreferenced} with no known reference (originals retained)` : ""}`,
  );
  console.log(`Storage for these objects: ${mb(before)} → ${mb(after)} (saves ${mb(before - after)})`);
  if (!APPLY) console.log("\nRe-run with --apply to make these changes.");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
