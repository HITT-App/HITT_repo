"""Audit v2 — per-ingredient-line matching with negative qualifiers to kill false positives."""
import json, re, glob, os
from collections import Counter, defaultdict

S = os.path.dirname(os.path.abspath(__file__))
incoming = []
for f in sorted(glob.glob(f"{S}/recipes_in/inner/meal_db/categories/*.json")):
    incoming += json.load(open(f))

def norm(s):
    return re.sub(r"\s+", " ", re.sub(r"[^a-z0-9 ]", " ", (s or "").lower())).strip()

# Each bucket: (positive words, negative regex that exonerates the whole line)
PLANT = r"(oat|almond|soya?|coconut|rice|cashew|hemp|pea|plant|vegan|dairy[\s-]?free|lactose[\s-]?free)"
BUCKETS = {
    "Milk":  (["milk","cheese","yoghurt","yogurt","butter","cream","ghee","quark","mozzarella",
               "cheddar","parmesan","feta","ricotta","mascarpone","halloumi","custard","whey",
               "casein","paneer","creme fraiche","creme"],
              re.compile(rf"{PLANT}[\s-]*(milk|yoghurt|yogurt|cream|cheese|butter|spread)|"
                         r"(peanut|almond|cashew|nut|seed|cocoa|shea|sun\s*flower|sunflower)\s+butter|"
                         r"butter\s*bean|butternut|nutritional\s+yeast")),
    "Egg":   (["egg","eggs","mayonnaise","meringue","aioli"],
              re.compile(r"egg[\s-]?free|vegan\s+mayo|egg\s*plant")),
    "Gluten":(["wheat","flour","bread","pasta","couscous","barley","rye","semolina","breadcrumb",
               "panko","tortilla","pitta","bagel","noodle","seitan","cracker","croissant",
               "brioche","filo","puff pastry","oats","oat","bran","muesli","granola","wrap"],
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

def line_hits(lines, words, neg):
    """Return {word: line} for words genuinely present, per-line negatives applied."""
    out = {}
    for ln in lines or []:
        l = ln.lower()
        if neg and neg.search(l):
            continue
        for w in words:
            if re.search(r"\b" + re.escape(w) + r"s?\b", l):
                out.setdefault(w, ln)
    return out

def declared(allergens):
    out = set()
    for a in allergens or []:
        a = a.lower()
        if "milk" in a or "dairy" in a: out.add("Milk")
        if "egg" in a: out.add("Egg")
        if "gluten" in a or "wheat" in a or "cereal" in a or "oat" in a: out.add("Gluten")
        if "peanut" in a: out.add("Peanut")
        if "nut" in a and "peanut" not in a: out.add("Nuts")
        if "soy" in a: out.add("Soya")
        if "fish" in a and "shell" not in a: out.add("Fish")
        if "crustacean" in a or "shellfish" in a: out |= {"Crustaceans", "Molluscs"}
        if "mollusc" in a: out.add("Molluscs")
        if "sesame" in a: out.add("Sesame")
        if "mustard" in a: out.add("Mustard")
        if "celery" in a: out.add("Celery")
        if "sulph" in a or "sulf" in a: out.add("Sulphites")
        if "lupin" in a: out.add("Lupin")
    return out

undeclared, contradictions, oats_only = [], [], []
allergen_freq = Counter()

for r in incoming:
    rid, name = r["id"], r["meal_name"]
    ings = r.get("ingredients") or []
    tags = {t.lower() for t in (r.get("dietary_tags") or [])}
    dec = declared(r.get("allergens"))
    for a in (r.get("allergens") or []): allergen_freq[a] += 1

    for bucket, (words, neg) in BUCKETS.items():
        found = line_hits(ings, words, neg)
        if not found or bucket in dec:
            continue
        # oats-as-gluten is a labelling nuance, bucket it separately
        if bucket == "Gluten" and set(found) <= {"oat", "oats", "bran", "muesli", "granola"}:
            oats_only.append((rid, name, list(found.values())[0]))
        else:
            undeclared.append((rid, name, bucket, "; ".join(sorted(set(found.values())))[:80]))

    def contra(tag, words, neg, label):
        if tag not in tags: return
        f = line_hits(ings, words, neg)
        if f: contradictions.append((rid, name, label, "; ".join(sorted(set(f.values())))[:80]))

    contra("nut free", BUCKETS["Nuts"][0] + BUCKETS["Peanut"][0], BUCKETS["Nuts"][1], "Nut Free")
    contra("dairy free", *BUCKETS["Milk"], "Dairy Free")
    contra("egg free", *BUCKETS["Egg"], "Egg Free")
    contra("gluten free", *BUCKETS["Gluten"], "Gluten Free")
    contra("vegetarian", MEAT + FISHY, MEAT_NEG, "Vegetarian")
    contra("vegan", MEAT + FISHY + BUCKETS["Milk"][0] + BUCKETS["Egg"][0] + ["honey"],
           re.compile(MEAT_NEG.pattern + "|" + BUCKETS["Milk"][1].pattern), "Vegan")

def head(t): print("\n" + "=" * 72 + "\n" + t + "\n" + "=" * 72)

head(f"UNDECLARED ALLERGENS — {len(undeclared)} across {len({u[0] for u in undeclared})} recipes")
for rid, name, bucket, ev in undeclared:
    print(f"  {rid}  {name[:40]:40s} {bucket:12s} <- {ev}")

head(f"DIETARY TAG CONTRADICTIONS — {len(contradictions)} across {len({c[0] for c in contradictions})} recipes")
for rid, name, tag, ev in contradictions:
    print(f"  {rid}  {name[:40]:40s} {tag:12s} <- {ev}")

head(f"OATS / CEREAL NOT DECLARED AS GLUTEN — {len(oats_only)} recipes")
for rid, name, ev in oats_only[:20]:
    print(f"  {rid}  {name[:40]:40s} <- {ev}")
if len(oats_only) > 20: print(f"  ... and {len(oats_only)-20} more")

head("ALLERGEN VOCABULARY USED IN THE DROP")
for a, c in allergen_freq.most_common():
    print(f"  {a:24s} {c}")
print(f"\nrecipes declaring an empty allergen list: {sum(1 for r in incoming if r.get('allergens') == [])}")

json.dump({"undeclared": undeclared, "contradictions": contradictions, "oats": oats_only},
          open(f"{S}/audit_v2.json", "w"), indent=1)
