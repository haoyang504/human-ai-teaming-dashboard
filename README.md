# Human-AI Teaming Research Dashboard

An interactive data story board visualizing the global landscape of **Human-AI Teaming (HAT)** research, built from the [OpenAlex](https://openalex.org) academic database.

🔗 **Live site:** [haoyang504.github.io/human-ai-teaming-dashboard](https://haoyang504.github.io/human-ai-teaming-dashboard)

---

## What's Inside

A scrollable, single-page dashboard with six interactive sections:

| Section | Visualization |
|---------|--------------|
| Growth | Animated area chart — publication count 2022–2025 |
| Global Co-authorship | World map with network arcs connecting collaborating countries |
| Citation Flow | Directed world map showing cross-border knowledge transfer |
| Research Topics | Packed bubble chart (click to browse top papers) |
| Keywords | Animated bar chart of research disciplines |
| Impact | Institution lollipop chart + FWCI vs. citation scatter plot |

---

## Data Collection

Data was retrieved from the **[OpenAlex API](https://openalex.org)** — a free, open index of global scholarly works.

**Query:** Papers related to *Human-AI Teaming*, *Human-AI Collaboration*, and *AI-augmented work*, filtered to 2022–2025.

**Dataset:**

| File | Description | Records |
|------|-------------|---------|
| `work.csv` | Paper metadata (title, year, topic, FWCI, citations, abstract) | 1,252 |
| `author.csv` | Author names and ORCIDs | 4,508 |
| `authorship.csv` | Author ↔ paper ↔ institution links | 4,788 |
| `institution.csv` | Institution names and country codes | 1,292 |
| `keyword.csv` | OpenAlex keyword taxonomy | ~800 |
| `work_keyword.csv` | Paper ↔ keyword links | 11,895 |
| `source.csv` | Journal and venue metadata | ~700 |
| `work_source.csv` | Paper ↔ journal links | ~700 |
| `work_reference.csv` | Citation pairs within corpus | ~42,000 |

**Key statistics:**
- **Date range:** 2022–2025
- **Countries represented:** 86
- **Total citations:** 50,226
- **Open Access:** 98.8% of papers

Raw CSVs were preprocessed into `data/dashboard_data.json` using `preprocess.py`, which aggregates country co-authorship networks, citation flows, topic distributions, and institution rankings.

---

## Tech Stack

- **D3.js v7** — world maps, bubble chart, lollipop chart, area chart
- **TopoJSON** — world geography
- **Vanilla HTML/CSS/JS** — no framework dependencies
- **GitHub Pages** — free static hosting

---

## Local Development

```bash
git clone https://github.com/haoyang504/human-ai-teaming-dashboard.git
cd human-ai-teaming-dashboard
python3 -m http.server 8080
# Open http://localhost:8080
```

> Note: A local server is required (not `file://`) because the app fetches `data/dashboard_data.json`.
