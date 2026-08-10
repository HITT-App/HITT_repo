"""
Turn the owner's 1000-recipe drop into an import-ready payload for the HITT `recipes`
(+ `ingredients` + `steps`) schema.

Taxonomy decision (per owner direction — categorise by TYPE OF MEAL, not by goal):
  meal_type = coarse slot   : breakfast | lunch | dinner | snack | dessert | cheat_meal
  category  = dish type     : normalised from the drop's `sub_type` (~70 values) -> browse variety
The incoming `goal` array is deliberately NOT mapped onto category.

Safety policy for allergens — strictly one-directional, never guesses in the unsafe direction:
  * ADD any allergen detected in the ingredient text; never remove one the author declared.
  * REMOVE any free-from / vegan / vegetarian tag the ingredients contradict; never add one.
  * Anything ambiguous goes to review.tsv instead of being silently "fixed".
"""
import json, re, glob, os, sys, unicodedata
from collections import Counter, defaultdict

S = sys.argv[1] if len(sys.argv) > 1 else os.path.dirname(os.path.abspath(__file__))
OUT = f"{S}/import_ready"
os.makedirs(OUT, exist_ok=True)

inc = []
for f in sorted(glob.glob(f"{S}/recipes_in/inner/meal_db/categories/*.json")):
    inc += json.load(open(f))
inc.sort(key=lambda r: r["id"])

review = []          # (id, name, field, issue) — needs a human
changes = Counter()

def flag(r, field, issue):
    review.append((r["id"], r["meal_name"], field, issue))

# ----------------------------------------------------------------- vocabularies
MEAL_TYPE = {
    "Breakfast": "breakfast", "Lunch": "lunch", "Dinner": "dinner",
    "Snacks": "snack", "Desserts": "dessert", "Healthy Cheat Meals": "cheat_meal",
}
# incoming allergen label -> live DB canonical (dominant existing spelling)
ALLERGEN_CANON = {
    "Milk": "dairy", "Gluten": "gluten", "Egg": "eggs", "Eggs": "eggs", "Fish": "fish",
    "Soy": "soy", "Soya": "soy", "Shellfish": "crustaceans", "Crustaceans": "crustaceans",
    "Peanuts": "peanuts", "Peanut": "peanuts", "Tree Nuts": "tree nuts", "Nuts": "tree nuts",
    "Sesame": "sesame", "Celery": "celery", "Mustard": "mustard", "Molluscs": "molluscs",
    "Sulphites": "sulphites", "Lupin": "lupin",
}
TAG_CANON = {
    "Gluten Free": "gluten-free", "Dairy Free": "dairy_free", "Vegetarian": "vegetarian",
    "Vegan": "vegan", "Pescatarian": "pescatarian", "Nut Free": "nut_free", "Egg Free": "egg_free",
}
# detector bucket -> live canonical allergen
BUCKET_CANON = {
    "Milk": "dairy", "Egg": "eggs", "Gluten": "gluten", "Peanut": "peanuts", "Nuts": "tree nuts",
    "Soya": "soy", "Fish": "fish", "Crustaceans": "crustaceans", "Molluscs": "molluscs",
    "Sesame": "sesame", "Mustard": "mustard", "Celery": "celery", "Sulphites": "sulphites",
    "Lupin": "lupin",
}

PLANT = r"(oat|almond|soya?|coconut|rice|cashew|hemp|pea|plant|vegan|dairy[\s-]?free|lactose[\s-]?free)"
BUCKETS = {
    "Milk":  (["milk","cheese","yoghurt","yogurt","butter","cream","ghee","quark","mozzarella",
               "cheddar","parmesan","feta","ricotta","mascarpone","halloumi","custard","whey",
               "casein","paneer","creme fraiche"],
              re.compile(rf"{PLANT}[\s-]*(milk|yoghurt|yogurt|cream|cheese|butter|spread)|"
                         r"(peanut|almond|cashew|nut|seed|cocoa|shea|sunflower)\s+butter|"
                         r"butter\s*bean|butternut|nutritional\s+yeast")),
    "Egg":   (["egg","eggs","mayonnaise","meringue","aioli"], re.compile(r"egg[\s-]?free|vegan\s+mayo|egg\s*plant")),
    # 'tortilla' is deliberately absent: owner confirms all tortillas/tortilla chips in this
    # pack are corn, so they carry no gluten and don't invalidate a Gluten Free claim.
    "Gluten":(["wheat","flour","bread","pasta","couscous","barley","rye","semolina","breadcrumb",
               "panko","pitta","bagel","noodle","seitan","cracker","croissant","brioche","filo",
               "puff pastry","oats","oat","bran","muesli","granola","wrap"],
              re.compile(r"gluten[\s-]?free|\bgf\b|corn\s+tortilla|rice\s+noodle|buckwheat|"
                         r"(almond|coconut|rice|chickpea|gram|corn|potato|tapioca)\s*flour|cornflour")),
    "Peanut":(["peanut","peanuts","groundnut"], None),
    "Nuts":  (["almond","cashew","walnut","pecan","pistachio","hazelnut","macadamia","brazil nut",
               "pine nut","praline","marzipan"], re.compile(r"nut[\s-]?free")),
    "Soya":  (["soy","soya","tofu","edamame","tempeh","miso","tamari"], None),
    "Fish":  (["salmon","tuna","cod","haddock","mackerel","sardine","anchovy","sea bass","trout",
               "pollock","tilapia","fish sauce","worcestershire"], None),
    "Crustaceans":(["prawn","prawns","shrimp","crab","lobster","langoustine","crayfish"], None),
    "Molluscs":(["mussel","oyster","squid","calamari","scallop","clam","octopus"], None),
    "Sesame":(["sesame","tahini","hummus","houmous"], None),
    "Mustard":(["mustard","dijon"], None),
    "Celery":(["celery","celeriac"], None),
    "Sulphites":(["sulphite","sulfite"], None),
    "Lupin": (["lupin"], None),
}
MEAT = ["chicken","beef","pork","lamb","turkey","bacon","ham","sausage","mince","steak",
        "chorizo","prosciutto","venison","duck","gelatine","gelatin"]
MEAT_NEG = re.compile(r"duck\s+egg|vegan|meat[\s-]?free|quorn|plant[\s-]?based")
FISHY = BUCKETS["Fish"][0] + BUCKETS["Crustaceans"][0] + BUCKETS["Molluscs"][0]
# ingredient phrasings we refuse to auto-classify
AMBIGUOUS = re.compile(r"-free\s*\(|wrap\b(?!ped)", re.I)

# Removed on the owner's instruction:
#   DIN-063 — malformed ingredient line '40g Feta-Free (use Dairy-Free Feta) or omit'
#   DIN-111/DIN-182, LUN-124/LUN-186 — near-identical pairs whose stated macros
#   contradict their ingredient lists (an omitted olive oil that the calories don't reflect)
EXCLUDE = {"DIN-063", "DIN-111", "DIN-182", "LUN-124", "LUN-186"}

def hits(lines, words, neg):
    out = {}
    for ln in lines or []:
        l = ln.lower()
        if neg and neg.search(l): continue
        for w in words:
            if re.search(r"\b" + re.escape(w) + r"s?\b", l): out.setdefault(w, ln)
    return out

# ----------------------------------------------------------------- field cleaners
# free-from claims that are real product/dietary language and must survive
LEGIT_FREE = {"gluten", "dairy", "nut", "nuts", "egg", "eggs", "lactose", "soy", "soya",
              "sugar", "grain", "wheat", "meat", "oil", "salt", "carb"}
# two-token foods, so "Goats Cheese-Free" drops both words not just "Cheese-Free"
COMPOUND = {("goats", "cheese"), ("cottage", "cheese"), ("cream", "cheese"),
            ("peanut", "butter"), ("sea", "bass")}

def clean_name(r):
    """Strip the generator's artefacts: '<food>-Free' where the food is neither a real
       dietary claim nor actually in the recipe, plus 'Final [Milestone] ' scaffolding."""
    orig = r["meal_name"]
    ing = " ".join(r.get("ingredients") or []).lower()
    out = []
    for tok in orig.split():
        m = re.fullmatch(r"([A-Za-z]+)-Free\b[,]?", tok)
        if m:
            food = m.group(1).lower()
            if food in LEGIT_FREE or re.search(r"\b" + re.escape(food), ing):
                out.append(tok)                       # genuine claim — keep
                continue
            if out and (out[-1].lower(), food) in COMPOUND:
                out.pop()                             # drop the compound's first word too
            continue                                  # drop the nonsense token
        out.append(tok)
    name = re.sub(r"\s{2,}", " ", " ".join(out)).strip()
    name = re.sub(r"^Final\s+(Milestone\s+)?", "", name).strip()
    if name != orig:
        changes["name_cleaned"] += 1
    return name or orig

def to_minutes(v):
    """'5 min' -> 5 ; '6 hr (slow cooker)' -> 360 ; '0 min (overnight chill)' -> 0 (+note)."""
    s = str(v or "").lower()
    note = None
    m_note = re.search(r"\(([^)]+)\)", s)
    if m_note: note = m_note.group(1).strip()
    h = re.search(r"(\d+(?:\.\d+)?)\s*(hr|hour)", s)
    m = re.search(r"(\d+(?:\.\d+)?)\s*min", s)
    mins = 0
    if h: mins += float(h.group(1)) * 60
    if m: mins += float(m.group(1))
    return int(round(mins)), note

# ----------------------------------------------------------------- dish-type category
def slug(s):
    s = unicodedata.normalize("NFKD", s or "").encode("ascii", "ignore").decode()
    return re.sub(r"_+", "_", re.sub(r"[^a-z0-9]+", "_", s.lower())).strip("_")

SUBTYPE_MERGE = {   # collapse the drop's near-duplicate sub_types
    "winter_comfort_meal": "winter_comfort", "wraps": "wrap", "breakfast_wrap": "wrap",
    "budget_snack": "budget_meal", "homemade_snack_box": "snack_box",
    "protein_pudding": "protein_dessert", "protein_cheesecake": "protein_dessert",
    "family_meal": "family_meal", "meal_prep": "meal_prep",
}
def dish_category(r):
    c = slug(r.get("sub_type") or "")
    c = SUBTYPE_MERGE.get(c, c)
    if not c:
        c = MEAL_TYPE[r["category"]]
        flag(r, "category", "no sub_type — fell back to meal type")
    return c

# ----------------------------------------------------------------- de-duplication
STOP = {"g","ml","kg","l","tbsp","tsp","large","small","medium","cooked","chopped","sliced",
        "diced","fresh","frozen","grated","optional","or","of","and","to","a","the","cup","cups",
        "scoop","reduced","fat","free","low","peeled","cubed","crushed","julienned","finely"}
def sig(r):
    ws = set()
    for it in r.get("ingredients") or []:
        for w in re.findall(r"[a-z]+", it.lower()):
            if w not in STOP and len(w) > 2: ws.add(w)
    return frozenset(ws)

by_sig = defaultdict(list)
for r in inc: by_sig[sig(r)].append(r)

dropped = {}
for k, group in by_sig.items():
    if len(group) < 2: continue
    exact = defaultdict(list)
    for r in group:
        exact[(r["servings"], json.dumps(r["nutrition"], sort_keys=True))].append(r)
    for _, same in exact.items():
        if len(same) < 2: continue
        # keep the cleanest name: no Deluxe/Final/Homemade/Skinny padding, then shortest
        def noise(r):
            n = r["meal_name"]
            return (len(re.findall(r"\b(Deluxe|Final|Milestone|Homemade|Skinny|Healthy|Budget|Simple)\b", n)), len(n))
        same.sort(key=noise)
        for r in same[1:]:
            dropped[r["id"]] = same[0]["id"]

# ----------------------------------------------------------------- build rows
recipes, ingredients, steps = [], [], []
for r in inc:
    if r["id"] in dropped or r["id"] in EXCLUDE:
        continue
    ings = r.get("ingredients") or []
    ing_text_lines = ings
    declared = {ALLERGEN_CANON.get(a, a.lower()) for a in (r.get("allergens") or [])}
    tags = {TAG_CANON.get(t, slug(t)) for t in (r.get("dietary_tags") or [])}

    # --- allergens: additive only -------------------------------------------------
    final_allergens = set(declared)
    for bucket, (words, neg) in BUCKETS.items():
        found = hits(ing_text_lines, words, neg)
        if not found: continue
        canon = BUCKET_CANON[bucket]
        if canon in final_allergens: continue
        amb = [ln for ln in found.values() if AMBIGUOUS.search(ln)]
        if amb and len(amb) == len(found):
            flag(r, "allergens", f"possible {canon} but ingredient is ambiguous: {amb[0]!r}")
            continue
        final_allergens.add(canon)
        changes[f"allergen_added:{canon}"] += 1

    # --- dietary tags: subtractive only -------------------------------------------
    def contradicted(tag_key, words, neg):
        return bool(hits(ing_text_lines, words, neg))
    removals = []
    if "nut_free" in tags and contradicted("nut_free", BUCKETS["Nuts"][0] + BUCKETS["Peanut"][0], BUCKETS["Nuts"][1]):
        removals.append("nut_free")
    if "dairy_free" in tags and contradicted("dairy_free", *BUCKETS["Milk"]):
        removals.append("dairy_free")
    if "egg_free" in tags and contradicted("egg_free", *BUCKETS["Egg"]):
        removals.append("egg_free")
    if "gluten-free" in tags:
        gl = hits(ing_text_lines, *BUCKETS["Gluten"])
        amb = [ln for ln in gl.values() if AMBIGUOUS.search(ln)]
        if gl and len(amb) == len(gl):
            flag(r, "dietary_tags", f"gluten-free claim rests on an ambiguous ingredient: {amb[0]!r}")
        elif gl:
            removals.append("gluten-free")
    if "vegetarian" in tags and contradicted("vegetarian", MEAT + FISHY, MEAT_NEG):
        removals.append("vegetarian")
    if "vegan" in tags:
        # must honour the dairy-free AND egg-free exemptions, or "Egg-Free Noodles"
        # in a genuinely vegan recipe reads as an egg
        veg_neg = re.compile("|".join([MEAT_NEG.pattern, BUCKETS["Milk"][1].pattern,
                                       BUCKETS["Egg"][1].pattern]))
        if hits(ing_text_lines, MEAT + FISHY + BUCKETS["Milk"][0] + BUCKETS["Egg"][0] + ["honey"], veg_neg):
            removals.append("vegan")
    for t in removals:
        tags.discard(t)
        changes[f"tag_removed:{t}"] += 1
        flag(r, "dietary_tags", f"removed '{t}' — contradicted by ingredients")

    # omnivore tag, matching the existing corpus convention
    if hits(ing_text_lines, MEAT + FISHY, MEAT_NEG) and not (tags & {"vegan", "vegetarian"}):
        tags.add("omnivore")

    # `category` is now dish-type, so the goal axis moves to its own column rather than
    # being discarded — ai-coach still needs to select owner recipes by goal.
    GOAL_CANON = {"Fat Loss": "lose_weight", "Muscle Gain": "build_muscle",
                  "Weight Gain": "gain_weight"}
    goals = sorted({GOAL_CANON[g] for g in (r.get("goal") or []) if g in GOAL_CANON})
    if "High Fibre" in (r.get("goal") or []):
        tags.add("high_fibre")

    prep, prep_note = to_minutes(r.get("prep_time"))
    cook, cook_note = to_minutes(r.get("cook_time"))
    notes = " ".join(n for n in (prep_note, cook_note) if n)

    n = r["nutrition"]
    recipes.append({
        "external_id": r["id"],
        "name": clean_name(r),
        "category": dish_category(r),
        "meal_type": MEAL_TYPE[r["category"]],
        "description": (f"{r.get('sub_type','')}. {notes}".strip().strip(".") or None),
        "calories": n["calories"], "protein_g": n["protein"], "carbs_g": n["carbs"], "fat_g": n["fat"],
        "fibre_g": n.get("fibre"), "sugar_g": n.get("sugar"), "salt_g": n.get("salt"),
        "saturated_fat_g": n.get("saturated_fat"), "sodium_mg": n.get("sodium"),
        "servings": r["servings"], "serving_size": r.get("serving_size"),
        "serving_weight_g": r.get("serving_weight_g"),
        "prep_time_minutes": prep, "cook_time_minutes": cook,
        "goals": goals,
        "allergens": sorted(final_allergens), "dietary_tags": sorted(tags),
        "swap_options": r.get("swap_options") or [],
        "source": "owner",
    })
    for i, item in enumerate(ings):
        if AMBIGUOUS.search(item) and "-free (" in item.lower():
            flag(r, "ingredients", f"malformed ingredient line: {item!r}")
        ingredients.append({"external_id": r["id"], "item": item, "sort_order": i})
    for i, ins in enumerate(r.get("instructions") or [], start=1):
        steps.append({"external_id": r["id"], "step_number": i, "instruction": ins})

# ----------------------------------------------------------------- write + report
json.dump({"recipes": recipes, "ingredients": ingredients, "steps": steps},
          open(f"{OUT}/payload.json", "w"), indent=1)
with open(f"{OUT}/review.tsv", "w") as fh:
    fh.write("id\tname\tfield\tissue\n")
    for row in review: fh.write("\t".join(map(str, row)) + "\n")
with open(f"{OUT}/dropped_duplicates.tsv", "w") as fh:
    fh.write("dropped_id\tkept_id\n")
    for d, k in sorted(dropped.items()): fh.write(f"{d}\t{k}\n")

print(f"recipes ready ......... {len(recipes)}  (dropped {len(dropped)} exact duplicates)")
print(f"ingredient rows ....... {len(ingredients)}")
print(f"step rows ............. {len(steps)}")
print(f"rows needing review ... {len(review)}  -> review.tsv")
print("\nmeal_type spread:", dict(Counter(r["meal_type"] for r in recipes)))
print(f"distinct dish categories: {len({r['category'] for r in recipes})}")
print("\nremediation applied:")
for k, v in sorted(changes.items(), key=lambda x: -x[1]):
    print(f"  {k:34s} {v}")
print("\nfinal allergen vocabulary:", dict(Counter(a for r in recipes for a in r["allergens"]).most_common()))
print("final tag vocabulary:", dict(Counter(t for r in recipes for t in r["dietary_tags"]).most_common()))
