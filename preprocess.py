#!/usr/bin/env python3
"""
preprocess.py — Build dashboard_data.json from OpenAlex CSVs
for the Human-AI Teaming Research Story Board.
"""
import csv, json, collections, os, math

DATA_DIR = os.path.join(os.path.dirname(__file__), "data", "raw")
OUT_FILE = os.path.join(os.path.dirname(__file__), "data", "dashboard_data.json")

def load_csv(name):
    with open(os.path.join(DATA_DIR, name), encoding="utf-8") as f:
        return list(csv.DictReader(f))

# ── Load all tables ──────────────────────────────────────────────────────────
print("Loading CSVs…")
works        = load_csv("work.csv")
authors      = load_csv("author.csv")
authorships  = load_csv("authorship.csv")
institutions = load_csv("institution.csv")
keywords     = load_csv("keyword.csv")
sources      = load_csv("source.csv")
work_kw      = load_csv("work_keyword.csv")
work_src     = load_csv("work_source.csv")
work_ref     = load_csv("work_reference.csv")

# ── Index maps ────────────────────────────────────────────────────────────────
inst_map   = {r["institution_id"]: r for r in institutions}   # id → row
kw_map     = {r["keyword_id"]: r["display_name"] for r in keywords}
src_map    = {r["source_id"]: r for r in sources}
work_map   = {r["work_id"]: r for r in works}

# ── Remap HK / TW / Macau → CN ───────────────────────────────────────────────
# Merge these into China before any aggregation so all counts are unified.
REMAP_CC = {"HK": "CN", "TW": "CN", "MO": "CN"}
for inst in institutions:
    if inst.get("country_code") in REMAP_CC:
        inst["country_code"] = REMAP_CC[inst["country_code"]]
# Re-build inst_map after remap
inst_map = {r["institution_id"]: r for r in institutions}


# work_id → set of country codes for that work
work_countries: dict[str, set] = collections.defaultdict(set)
# work_id → set of institution names
work_institutions: dict[str, set] = collections.defaultdict(set)

for a in authorships:
    inst = inst_map.get(a["institution_id"])
    if inst:
        cc = inst["country_code"]
        if cc:
            work_countries[a["work_id"]].add(cc)
        work_institutions[a["work_id"]].add(inst["display_name"])

# ── 1. Year counts ────────────────────────────────────────────────────────────
year_counts = collections.Counter()
for w in works:
    if w["publication_year"]:
        year_counts[int(w["publication_year"])] += 1
year_data = [{"year": y, "count": c} for y, c in sorted(year_counts.items())]

# ── 2. Topic distribution ─────────────────────────────────────────────────────
topic_counts = collections.Counter()
topic_papers: dict[str, list] = collections.defaultdict(list)
for w in works:
    t = w["primary_topic"] or "Other"
    topic_counts[t] += 1
    if len(topic_papers[t]) < 5:
        topic_papers[t].append({
            "title": w["title"][:120],
            "year": w["publication_year"],
            "cited": w["cited_by_count"]
        })
topic_data = [
    {"topic": t, "count": c, "papers": topic_papers[t]}
    for t, c in topic_counts.most_common(12)
]

# ── 3. Keyword distribution ───────────────────────────────────────────────────
kw_counts = collections.Counter()
for row in work_kw:
    name = kw_map.get(row["keyword_id"], "")
    if name:
        kw_counts[name] += 1
keyword_data = [{"keyword": k, "count": c} for k, c in kw_counts.most_common(25)]

# ── 4. Country authorship counts ──────────────────────────────────────────────
country_counts = collections.Counter()
for a in authorships:
    inst = inst_map.get(a["institution_id"])
    if inst and inst["country_code"]:
        country_counts[inst["country_code"]] += 1

country_data = [{"code": cc, "count": c} for cc, c in country_counts.most_common()]

# ── 5. Institution counts (with country) ──────────────────────────────────────
inst_counts: dict[str, dict] = {}
for a in authorships:
    inst = inst_map.get(a["institution_id"])
    if not inst:
        continue
    name = inst["display_name"]
    if name not in inst_counts:
        inst_counts[name] = {"name": name, "country": inst["country_code"], "count": 0}
    inst_counts[name]["count"] += 1

institution_data = sorted(inst_counts.values(), key=lambda x: -x["count"])[:20]

# ── 6. Citation scatter ───────────────────────────────────────────────────────
scatter_data = []
for w in works:
    try:
        fwci = float(w["fwci"]) if w["fwci"] else None
        cited = int(w["cited_by_count"]) if w["cited_by_count"] else 0
        if fwci is not None and fwci < 500:  # remove extreme outliers for display
            scatter_data.append({
                "fwci": round(fwci, 2),
                "cited": cited,
                "year": int(w["publication_year"]) if w["publication_year"] else 0,
                "title": w["title"][:80] if w["title"] else "",
                "topic": w["primary_topic"] or "Other"
            })
    except:
        pass

# ── 7. Country co-authorship network ─────────────────────────────────────────
print("Computing co-authorship network…")
coauthor_pairs = collections.Counter()
for wid, countries in work_countries.items():
    clist = sorted(countries)
    for i in range(len(clist)):
        for j in range(i+1, len(clist)):
            coauthor_pairs[(clist[i], clist[j])] += 1

# Keep top connections (threshold: at least 3 co-authored papers)
coauthor_links = [
    {"source": s, "target": t, "weight": w}
    for (s, t), w in coauthor_pairs.most_common(80)
    if w >= 3
]

# ── 8. Country citation network ───────────────────────────────────────────────
print("Computing citation network…")
citation_pairs = collections.Counter()
for ref in work_ref:
    src_id  = ref["citing_work_id"]
    tgt_id  = ref["cited_work_id"]
    # Both must be in our corpus
    if src_id not in work_map or tgt_id not in work_map:
        continue
    src_countries = work_countries.get(src_id, set())
    tgt_countries = work_countries.get(tgt_id, set())
    for sc in src_countries:
        for tc in tgt_countries:
            if sc != tc:
                citation_pairs[(sc, tc)] += 1

citation_links = [
    {"source": s, "target": t, "weight": w}
    for (s, t), w in citation_pairs.most_common(60)
    if w >= 2
]

# ── 9. Country centroids (approximate lat/lon) ────────────────────────────────
# ISO 3166-1 alpha-2 → [lon, lat] approximate centroids
CENTROIDS = {
    "US": [-95.7, 37.1],  "GB": [-3.4, 55.4],  "DE": [10.5, 51.2],
    "CN": [104.2, 35.9],  "AU": [133.8, -25.3], "IT": [12.6, 41.9],
    "CA": [-96.8, 56.1],  "NL": [5.3, 52.1],   "CH": [8.2, 46.8],
    "GR": [21.8, 39.1],   "SG": [103.8, 1.4],  "ES": [-3.7, 40.4],
    "FI": [25.7, 64.0],   "IN": [78.9, 20.6],  "KR": [127.8, 36.5],
    "FR": [2.2, 46.2],    "JP": [138.3, 36.2],  "SE": [18.6, 59.3],
    "NO": [8.5, 60.5],    "DK": [10.0, 56.0],  "PT": [-8.2, 39.4],
    "BE": [4.5, 50.5],    "AT": [14.5, 47.5],  "PL": [19.1, 51.9],
    "CZ": [15.5, 49.8],   "HU": [19.5, 47.2],  "RO": [24.9, 45.9],
    "BR": [-51.9, -14.2], "MX": [-102.5, 23.6],"AR": [-63.6, -38.4],
    "IL": [34.9, 31.0],   "SA": [45.1, 24.7],  "AE": [53.8, 23.4],
    "ZA": [25.1, -29.0],  "EG": [30.8, 26.8],  "NG": [8.7, 9.1],
    "NZ": [174.9, -40.9], "HK": [114.2, 22.3], "TW": [121.0, 23.7],
    "MY": [109.7, 3.1],   "TH": [100.5, 15.9], "ID": [113.9, -0.8],
    "PH": [121.8, 12.9],  "VN": [108.3, 14.1], "PK": [69.3, 30.4],
    "BD": [90.4, 23.7],   "IR": [53.7, 32.4],  "TR": [35.2, 39.9],
    "UA": [31.2, 49.0],   "RU": [105.3, 61.5], "CL": [-71.5, -35.7],
    "CO": [-74.3, 4.6],   "PE": [-75.0, -9.2],
}

# ── Assemble output ───────────────────────────────────────────────────────────
output = {
    "meta": {
        "total_works": len(works),
        "total_authors": len(authors),
        "total_institutions": len(institutions),
        "total_countries": len(country_counts),
        "total_citations": sum(int(w["cited_by_count"]) for w in works if w["cited_by_count"]),
        "oa_count": sum(1 for w in works if w["is_oa"] == "True"),
        "year_range": [min(year_counts), max(year_counts)],
    },
    "year_data":         year_data,
    "topic_data":        topic_data,
    "keyword_data":      keyword_data,
    "country_data":      country_data,
    "country_centroids": CENTROIDS,
    "institution_data":  institution_data,
    "scatter_data":      scatter_data,
    "coauthor_links":    coauthor_links,
    "citation_links":    citation_links,
}

os.makedirs(os.path.dirname(OUT_FILE), exist_ok=True)
with open(OUT_FILE, "w", encoding="utf-8") as f:
    json.dump(output, f, ensure_ascii=False, indent=2)

print(f"✓ Written {OUT_FILE}")
print(f"  Works: {output['meta']['total_works']}")
print(f"  Authors: {output['meta']['total_authors']}")
print(f"  Countries: {output['meta']['total_countries']}")
print(f"  Co-authorship links: {len(coauthor_links)}")
print(f"  Citation links: {len(citation_links)}")
