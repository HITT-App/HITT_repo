// Every in-app link must land on a route declared in App.tsx. A link to a missing route
// renders the 404 page, and nothing else catches it: the build, tsc and the screen itself all
// look fine until someone taps it (Sleep History → /sleep/:id, Nov 2026).
import { readFileSync, readdirSync, statSync } from "node:fs"
import { join, relative } from "node:path"

const ROOT = join(import.meta.dirname, "..")
const SRC = join(ROOT, "src")

const app = readFileSync(join(SRC, "App.tsx"), "utf8")
const routes = [...app.matchAll(/<Route\s+path="([^"]+)"/g)].map(m => m[1]).filter(p => p !== "*")

const routeRegexes = routes.map(p => new RegExp(
  "^" + p.replace(/\/:[^/]+\?/g, "(/[^/]+)?").replace(/:[^/]+/g, "[^/]+").replace(/\*$/, ".*") + "/?$",
))

function* files(dir: string): Generator<string> {
  for (const name of readdirSync(dir)) {
    const path = join(dir, name)
    if (statSync(path).isDirectory()) yield* files(path)
    else if (/\.tsx?$/.test(name)) yield path
  }
}

const LINK_PATTERNS = [
  /navigate\(\s*(["'`])(\/[^"'`]*)\1/g,
  /\bto=\{?\s*(["'`])(\/[^"'`]*)\1/g,
  /\b(?:path|route|href|url|link)\s*:\s*(["'`])(\/[^"'`]*)\1/g,
]

// External URLs, asset paths and API paths look like links but aren't routes.
const IGNORE = /^\/(assets|api|functions|storage|rest|auth\/v1|favicon|icons?|images?|sounds?|audio|fonts?)\b|\.\w{2,4}$/

// Known dead links parked on purpose. Each entry needs a reason; remove it when the area ships.
const PARKED: { pattern: RegExp; reason: string }[] = [
  {
    pattern: /^\/(article|course|short|workshop)\/|^\/resources\/(categories|browse)$/,
    reason: "Resources is placeholder content, hidden behind resources_enabled until it's built for real",
  },
  {
    pattern: /^\/chat-coach\//,
    reason: "Coaching is off (coaching_enabled); coaches have no app account to message yet",
  },
]

const dead: string[] = []
let parked = 0
let checked = 0
for (const file of files(SRC)) {
  const text = readFileSync(file, "utf8")
  for (const pattern of LINK_PATTERNS) {
    for (const m of text.matchAll(pattern)) {
      const target = m[2].replace(/\$\{[^}]+\}/g, "x").split(/[?#]/)[0]
      if (!target || IGNORE.test(target)) continue
      checked++
      if (!routeRegexes.some(r => r.test(target))) {
        if (PARKED.some(p => p.pattern.test(target))) { parked++; continue }
        const line = text.slice(0, m.index).split("\n").length
        dead.push(`${relative(ROOT, file)}:${line}  ${m[2]}`)
      }
    }
  }
}

console.log(`${routes.length} routes, ${checked} links checked, ${parked} parked`)
if (dead.length) {
  console.log(`\n✗ ${dead.length} link(s) with no matching route:\n`)
  for (const d of dead) console.log(`  ${d}`)
  process.exit(1)
}
console.log("✓ every link has a route")
