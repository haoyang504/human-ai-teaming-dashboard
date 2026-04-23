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

Data retrieved from the **[OpenAlex API](https://api.openalex.org/works)**.

**Core filters:** Publication Year: 2022–2026 · Type: `article`

**Boolean search query:**
```
('human-AI' OR 'human AI') AND ('team' OR 'collaborat')
AND ('LLM' OR 'large language model')
```

**Final dataset: 1,252 papers** across 86 countries · 50,226 total citations · 98.8% Open Access

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
