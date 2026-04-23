/* ══════════════════════════════════════════════════════════════
   app.js — Human-AI Teaming Research Story Board
   D3.js v7 · TopoJSON v3 · All charts + Network Maps
══════════════════════════════════════════════════════════════ */

// ── Globals ──────────────────────────────────────────────────
const DATA_URL = "data/dashboard_data.json";
const TOPO_URL = "https://cdn.jsdelivr.net/npm/world-atlas@2/countries-110m.json";

// Colour helpers
const VIOLET = "#7c3aed", VIOLET_L = "#a78bfa";
const CYAN = "#06b6d4", CYAN_L = "#67e8f9";
const AMBER = "#f59e0b", AMBER_L = "#fcd34d";
const GREEN = "#10b981";
const YEAR_COLORS = { 2022: "#a78bfa", 2023: "#06b6d4", 2024: "#f59e0b", 2025: "#10b981" };
const TOPIC_COLORS = [
    "#7c3aed", "#06b6d4", "#f59e0b", "#10b981", "#ec4899",
    "#3b82f6", "#f97316", "#84cc16", "#14b8a6", "#a855f7",
    "#0ea5e9", "#22c55e"
];

// Country code → ISO numeric (for TopoJSON lookup) — major countries
const CC2_TO_NUM = {
    US: 840, GB: 826, DE: 276, CN: 156, AU: 36, IT: 380, CA: 124, NL: 528, CH: 756,
    GR: 300, SG: 702, ES: 724, FI: 246, IN: 356, KR: 410, FR: 250, JP: 392, SE: 752,
    NO: 578, DK: 208, PT: 620, BE: 56, AT: 40, PL: 616, CZ: 203, HU: 348, RO: 642,
    BR: 76, MX: 484, AR: 32, IL: 376, SA: 682, AE: 784, ZA: 710, EG: 818, NG: 566,
    NZ: 554, HK: 344, TW: 158, MY: 458, TH: 764, ID: 360, PH: 608, VN: 704, PK: 586,
    BD: 50, IR: 364, TR: 792, UA: 804, RU: 643, CL: 152, CO: 170, PE: 604
};

// ── Boot ──────────────────────────────────────────────────────
Promise.all([
    d3.json(DATA_URL),
    d3.json(TOPO_URL)
]).then(([data, world]) => {
    initParticles();
    animateCounters(data.meta);
    setupNav();
    setupReveal();
    drawGrowth(data.year_data);
    drawCoauthorMap(data, world);
    drawCitationMap(data, world);
    drawBubbles(data.topic_data);
    drawKeywords(data.keyword_data.slice(0, 20));
    drawLollipop(data.institution_data);
    drawScatter(data.scatter_data);
}).catch(err => console.error("Data load error:", err));

// ══════════════════════════════════════════════════════════════
// PARTICLES
// ══════════════════════════════════════════════════════════════
function initParticles() {
    const container = document.getElementById("particles");
    const canvas = document.createElement("canvas");
    container.appendChild(canvas);
    const ctx = canvas.getContext("2d");
    let W, H, pts = [];

    function resize() {
        W = canvas.width = container.clientWidth;
        H = canvas.height = container.clientHeight;
    }
    resize();
    window.addEventListener("resize", resize);

    for (let i = 0; i < 70; i++) pts.push({
        x: Math.random() * 2000, y: Math.random() * 1000,
        vx: (Math.random() - .5) * 0.3, vy: (Math.random() - .5) * 0.2,
        r: Math.random() * 1.5 + 0.5,
        a: Math.random() * 0.5 + 0.1
    });

    function frame() {
        ctx.clearRect(0, 0, W, H);
        pts.forEach(p => {
            p.x += p.vx; p.y += p.vy;
            if (p.x < 0) p.x = W; if (p.x > W) p.x = 0;
            if (p.y < 0) p.y = H; if (p.y > H) p.y = 0;
            ctx.beginPath();
            ctx.arc(p.x % W, p.y % H, p.r, 0, Math.PI * 2);
            ctx.fillStyle = `rgba(124,58,237,${p.a})`;
            ctx.fill();
        });
        // Connect close particles
        for (let i = 0; i < pts.length; i++)
            for (let j = i + 1; j < pts.length; j++) {
                const dx = pts[i].x - pts[j].x, dy = pts[i].y - pts[j].y;
                const d = Math.sqrt(dx * dx + dy * dy);
                if (d < 140) {
                    ctx.beginPath();
                    ctx.moveTo(pts[i].x, pts[i].y);
                    ctx.lineTo(pts[j].x, pts[j].y);
                    ctx.strokeStyle = `rgba(124,58,237,${0.12 * (1 - d / 140)})`;
                    ctx.lineWidth = 0.6;
                    ctx.stroke();
                }
            }
        requestAnimationFrame(frame);
    }
    frame();
}

// ══════════════════════════════════════════════════════════════
// COUNTER ANIMATION
// ══════════════════════════════════════════════════════════════
function animateCounters(meta) {
    const targets = [
        { el: "stat-works", val: meta.total_works },
        { el: "stat-authors", val: meta.total_authors },
        { el: "stat-countries", val: meta.total_countries },
        { el: "stat-citations", val: meta.total_citations },
    ];
    targets.forEach(({ el, val }) => {
        const elem = document.getElementById(el);
        let start = 0, dur = 1800, step = 16;
        const inc = val / (dur / step);
        const timer = setInterval(() => {
            start = Math.min(start + inc, val);
            elem.textContent = Math.floor(start).toLocaleString();
            if (start >= val) clearInterval(timer);
        }, step);
    });
}

// ══════════════════════════════════════════════════════════════
// NAV SCROLL EFFECT
// ══════════════════════════════════════════════════════════════
function setupNav() {
    const nav = document.getElementById("topnav");
    window.addEventListener("scroll", () => {
        nav.classList.toggle("scrolled", window.scrollY > 60);
    });
}

// ══════════════════════════════════════════════════════════════
// INTERSECTION OBSERVER — reveal on scroll
// ══════════════════════════════════════════════════════════════
function setupReveal() {
    const obs = new IntersectionObserver((entries) => {
        entries.forEach(e => { if (e.isIntersecting) e.target.classList.add("visible"); });
    }, { threshold: 0.12 });
    document.querySelectorAll(".reveal").forEach(el => obs.observe(el));
}

// ══════════════════════════════════════════════════════════════
// SECTION 1 — GROWTH AREA CHART
// ══════════════════════════════════════════════════════════════
function drawGrowth(yearData) {
    const card = document.getElementById("growth-card");
    const svg = d3.select("#growth-chart");
    const W = card.clientWidth - 64, H = 340;
    const margin = { top: 40, right: 30, bottom: 50, left: 60 };
    const iw = W - margin.left - margin.right;
    const ih = H - margin.top - margin.bottom;

    svg.attr("width", W).attr("height", H);
    const g = svg.append("g").attr("transform", `translate(${margin.left},${margin.top})`);

    const x = d3.scaleLinear().domain(d3.extent(yearData, d => d.year)).range([0, iw]);
    const y = d3.scaleLinear().domain([0, d3.max(yearData, d => d.count) * 1.1]).range([ih, 0]);

    // Gradient fill
    const grad = svg.append("defs").append("linearGradient")
        .attr("id", "growthGrad").attr("x1", "0%").attr("y1", "0%").attr("x2", "0%").attr("y2", "100%");
    grad.append("stop").attr("offset", "0%").attr("stop-color", VIOLET).attr("stop-opacity", 0.6);
    grad.append("stop").attr("offset", "100%").attr("stop-color", VIOLET).attr("stop-opacity", 0.02);

    // Area
    const area = d3.area().x(d => x(d.year)).y0(ih).y1(d => y(d.count)).curve(d3.curveCatmullRom);
    g.append("path").datum(yearData).attr("fill", "url(#growthGrad)").attr("d", area);

    // Line
    const line = d3.line().x(d => x(d.year)).y(d => y(d.count)).curve(d3.curveCatmullRom);
    const path = g.append("path").datum(yearData)
        .attr("fill", "none").attr("stroke", VIOLET_L).attr("stroke-width", 3)
        .attr("d", line);
    const length = path.node().getTotalLength();
    path.attr("stroke-dasharray", length).attr("stroke-dashoffset", length)
        .transition().duration(1800).ease(d3.easeCubicInOut)
        .attr("stroke-dashoffset", 0);

    // Dots
    const tooltip = d3.select("body").append("div")
        .attr("class", "map-tooltip").style("position", "fixed");
    g.selectAll("circle").data(yearData).join("circle")
        .attr("cx", d => x(d.year)).attr("cy", d => y(d.count))
        .attr("r", 7).attr("fill", VIOLET_L).attr("stroke", "#07071a").attr("stroke-width", 2)
        .style("cursor", "pointer")
        .on("mouseover", (evt, d) => {
            tooltip.style("opacity", 1)
                .style("left", evt.clientX + 14 + "px").style("top", evt.clientY - 36 + "px")
                .html(`<div class="tt-title">${d.year}</div><div class="tt-row"><span class="tt-accent">${d.count}</span> papers published</div>`);
        })
        .on("mousemove", (evt) => tooltip.style("left", evt.clientX + 14 + "px").style("top", evt.clientY - 36 + "px"))
        .on("mouseout", () => tooltip.style("opacity", 0));

    // Labels on dots
    g.selectAll(".dot-label").data(yearData).join("text")
        .attr("class", "dot-label")
        .attr("x", d => x(d.year)).attr("y", d => y(d.count) - 16)
        .attr("text-anchor", "middle")
        .attr("fill", VIOLET_L).attr("font-size", 13).attr("font-weight", 700)
        .attr("font-family", "'Space Grotesk',sans-serif")
        .text(d => d.count);

    // Axes
    g.append("g").attr("transform", `translate(0,${ih})`)
        .call(d3.axisBottom(x).ticks(4).tickFormat(d3.format("d")))
        .select(".domain").remove();
    g.append("g").call(d3.axisLeft(y).ticks(5))
        .select(".domain").remove();
    g.append("text").attr("class", "axis-label")
        .attr("transform", "rotate(-90)").attr("x", -ih / 2).attr("y", -48)
        .attr("text-anchor", "middle").text("Papers Published");
}

// ══════════════════════════════════════════════════════════════
// HELPERS — shared map drawing
// ══════════════════════════════════════════════════════════════
function buildWorldMap(svgId, world, countryData, colorScale, tooltipEl) {
    const container = document.getElementById(svgId).parentElement;
    const W = container.clientWidth;
    const H = Math.min(W * 0.52, 520);

    const svg = d3.select(`#${svgId}`).attr("width", W).attr("height", H);
    const countries110 = topojson.feature(world, world.objects.countries);

    const proj = d3.geoNaturalEarth1()
        .scale(W / 6.2)
        .translate([W / 2, H / 2]);
    const path = d3.geoPath().projection(proj);

    // Draw countries
    svg.append("g").selectAll("path")
        .data(countries110.features)
        .join("path")
        .attr("d", path)
        .attr("fill", d => {
            const cc = numToCC(+d.id);
            const row = countryData.find(r => r.code === cc);
            return row ? colorScale(row.count) : "rgba(255,255,255,0.05)";
        })
        .attr("stroke", "rgba(255,255,255,0.12)")
        .attr("stroke-width", 0.4)
        .on("mouseover", (evt, d) => {
            const cc = numToCC(+d.id);
            const row = countryData.find(r => r.code === cc);
            if (!row) return;
            tooltipEl.style.opacity = 1;
            tooltipEl.innerHTML = `<div class="tt-title">${ccName(cc)}</div>
        <div class="tt-row">Authorships: <span class="tt-accent">${row.count}</span></div>`;
        })
        .on("mousemove", evt => {
            tooltipEl.style.left = evt.offsetX + 14 + "px";
            tooltipEl.style.top = evt.offsetY - 44 + "px";
        })
        .on("mouseout", () => tooltipEl.style.opacity = 0);

    return { svg, proj, path, W, H };
}

const NUM_TO_CC = {};
Object.entries(CC2_TO_NUM).forEach(([cc, num]) => NUM_TO_CC[num] = cc);
function numToCC(num) { return NUM_TO_CC[num] || null; }

const CC_NAMES = {
    US: "United States", GB: "United Kingdom", DE: "Germany", CN: "China", AU: "Australia",
    IT: "Italy", CA: "Canada", NL: "Netherlands", CH: "Switzerland", GR: "Greece", SG: "Singapore",
    ES: "Spain", FI: "Finland", IN: "India", KR: "South Korea", FR: "France", JP: "Japan",
    SE: "Sweden", NO: "Norway", DK: "Denmark", PT: "Portugal", BE: "Belgium", AT: "Austria",
    PL: "Poland", CZ: "Czechia", HU: "Hungary", RO: "Romania", BR: "Brazil", MX: "Mexico",
    AR: "Argentina", IL: "Israel", SA: "Saudi Arabia", AE: "UAE", ZA: "South Africa",
    EG: "Egypt", NG: "Nigeria", NZ: "New Zealand", HK: "Hong Kong", TW: "Taiwan",
    MY: "Malaysia", TH: "Thailand", ID: "Indonesia", PH: "Philippines", VN: "Vietnam",
    PK: "Pakistan", BD: "Bangladesh", IR: "Iran", TR: "Turkey", UA: "Ukraine", RU: "Russia",
    CL: "Chile", CO: "Colombia", PE: "Peru"
};
function ccName(cc) { return CC_NAMES[cc] || cc; }

// Draw curved arcs — quadratic bezier with bounded, inward-pulling control point.
// This avoids great-circle paths going over the top/bottom of the map.
function drawArcs(svg, proj, links, centroids, color, opacity, tooltip, directed = false, mapW = 900, mapH = 480) {
    const maxW = d3.max(links, d => d.weight);
    const wScale = d3.scaleLinear().domain([0, maxW]).range([0.6, 4.5]);
    // Stronger contrast: weak links near-invisible, strong links bold
    const oScale = d3.scaleLinear().domain([0, maxW]).range([0.08, 0.78]);

    const cx0 = mapW / 2, cy0 = mapH / 2; // map centre in screen space

    links.forEach((link) => {
        const sc = centroids[link.source], tc = centroids[link.target];
        if (!sc || !tc) return;

        const sp = proj(sc), tp = proj(tc);
        if (!sp || !tp) return;

        // Midpoint in screen space
        const mx = (sp[0] + tp[0]) / 2;
        const my = (sp[1] + tp[1]) / 2;

        // Screen-space chord length
        const dx = tp[0] - sp[0], dy = tp[1] - sp[1];
        const chordLen = Math.sqrt(dx * dx + dy * dy);

        // Pull control point toward map centre by 25%, then bow upward
        // by a fraction of chord length — capped to prevent wild arcs.
        const pullToCenter = 0.22;
        let cpx = mx + (cx0 - mx) * pullToCenter;
        let cpy = my + (cy0 - my) * pullToCenter;

        // Bow: offset perpendicular to chord, upward (negative y = up on screen)
        // Cap bow height to 20% of chord length, max 70px
        const bowFraction = 0.18;
        const bowMax = 70;
        const bow = Math.min(chordLen * bowFraction, bowMax);
        // Perpendicular unit vector (prefer upward direction)
        const perpX = -dy / chordLen;
        const perpY = dx / chordLen;
        // Choose perpendicular direction that goes upward on screen (negative y)
        const sign = perpY < 0 ? 1 : -1;
        cpx += perpX * bow * sign;
        cpy += perpY * bow * sign;

        // SVG quadratic bezier path
        const pathD = `M ${sp[0]},${sp[1]} Q ${cpx},${cpy} ${tp[0]},${tp[1]}`;

        svg.append("path")
            .attr("d", pathD)
            .attr("fill", "none")
            .attr("stroke", color)
            .attr("stroke-width", wScale(link.weight))
            .attr("stroke-opacity", oScale(link.weight))
            .attr("stroke-linecap", "round")
            .style("cursor", "pointer")
            .style("filter", `drop-shadow(0 0 2px ${color})`)
            .on("mouseover", (evt) => {
                tooltip.style.opacity = 1;
                const arrow = directed ? " → " : " ↔ ";
                tooltip.innerHTML = `<div class="tt-title">${ccName(link.source)}${arrow}${ccName(link.target)}</div>
                  <div class="tt-row">Count: <span class="tt-accent">${link.weight}</span></div>`;
            })
            .on("mousemove", evt => {
                tooltip.style.left = evt.offsetX + 14 + "px";
                tooltip.style.top = evt.offsetY - 44 + "px";
            })
            .on("mouseout", () => tooltip.style.opacity = 0);

        // Arrowhead for directed arcs — placed near the target end of bezier
        if (directed) {
            // Estimate tangent at t=0.92 on quadratic bezier B'(t) = 2(1-t)(cp-sp) + 2t(tp-cp)
            const t = 0.92;
            const tanX = 2 * (1 - t) * (cpx - sp[0]) + 2 * t * (tp[0] - cpx);
            const tanY = 2 * (1 - t) * (cpy - sp[1]) + 2 * t * (tp[1] - cpy);
            // Point on bezier at t
            const bx = (1 - t) * (1 - t) * sp[0] + 2 * (1 - t) * t * cpx + t * t * tp[0];
            const by = (1 - t) * (1 - t) * sp[1] + 2 * (1 - t) * t * cpy + t * t * tp[1];
            const angle = Math.atan2(tanY, tanX);
            const aLen = 7;
            svg.append("polygon")
                .attr("points", `0,${-aLen / 2} ${aLen},0 0,${aLen / 2}`)
                .attr("transform", `translate(${bx},${by}) rotate(${angle * 180 / Math.PI})`)
                .attr("fill", color)
                .attr("fill-opacity", oScale(link.weight) * 0.9);
        }
    });
}

// Animated pulsing nodes on centroids
function drawNodes(svg, proj, countryData, color, scale) {
    countryData.forEach(d => {
        const p = proj([
            d._lon !== undefined ? d._lon : 0,
            d._lat !== undefined ? d._lat : 0
        ]);
    });
}

function drawCountryNodes(svg, proj, countryData, centroids, color, tooltip) {
    const maxC = d3.max(countryData, d => d.count);
    const rScale = d3.scaleSqrt().domain([0, maxC]).range([2, 14]);

    countryData.forEach(d => {
        const cent = centroids[d.code];
        if (!cent) return;
        const p = proj(cent);
        if (!p) return;

        const r = rScale(d.count);

        // Visual circle — pointer-events:none so it doesn't block the map
        svg.append("circle")
            .attr("cx", p[0]).attr("cy", p[1])
            .attr("r", r)
            .attr("fill", color)
            .attr("fill-opacity", 0.25)
            .attr("stroke", color)
            .attr("stroke-width", 1.5)
            .attr("stroke-opacity", 0.8)
            .style("pointer-events", "none")
            .style("filter", `drop-shadow(0 0 4px ${color})`);

        // Pulse ring — also non-interactive
        if (d.count > 100) {
            const ring = svg.append("circle")
                .attr("cx", p[0]).attr("cy", p[1])
                .attr("r", r)
                .attr("fill", "none")
                .attr("stroke", color)
                .attr("stroke-opacity", 0.5)
                .attr("stroke-width", 1)
                .style("pointer-events", "none");

            function pulse() {
                ring.attr("r", r)
                    .attr("stroke-opacity", 0.6)
                    .transition().duration(1800).ease(d3.easeCubicOut)
                    .attr("r", r + 12)
                    .attr("stroke-opacity", 0)
                    .on("end", pulse);
            }
            pulse();
        }

        // Invisible hit area — larger radius for easy hovering
        if (tooltip) {
            svg.append("circle")
                .attr("cx", p[0]).attr("cy", p[1])
                .attr("r", Math.max(r + 8, 14))  // at least 14px hit radius
                .attr("fill", "transparent")
                .attr("stroke", "none")
                .style("cursor", "pointer")
                .on("mouseover", () => {
                    tooltip.style.opacity = 1;
                    tooltip.innerHTML = `<div class="tt-title">${ccName(d.code)}</div>
                        <div class="tt-row">Authorships: <span class="tt-accent">${d.count.toLocaleString()}</span></div>`;
                })
                .on("mousemove", evt => {
                    tooltip.style.left = evt.offsetX + 14 + "px";
                    tooltip.style.top = evt.offsetY - 44 + "px";
                })
                .on("mouseout", () => tooltip.style.opacity = 0);
        }
    });
}

// ══════════════════════════════════════════════════════════════
// SECTION 2 — CO-AUTHORSHIP NETWORK MAP
// ══════════════════════════════════════════════════════════════
function drawCoauthorMap(data, world) {
    const tooltipEl = document.getElementById("coauthor-tooltip");
    const colorScale = d3.scaleSequential()
        .domain([0, d3.max(data.country_data, d => d.count)])
        .interpolator(d3.interpolate("#1e1040", "#7c3aed"));

    const { svg, proj, W, H } = buildWorldMap(
        "coauthor-map-svg", world, data.country_data, colorScale, tooltipEl
    );

    // Draw all co-authorship links
    const links = data.coauthor_links;
    drawArcs(svg, proj, links, data.country_centroids, CYAN_L, 0.7, tooltipEl, false, W, H);
    drawCountryNodes(svg, proj, data.country_data.slice(0, 30), data.country_centroids, VIOLET_L, tooltipEl);

    // Stats
    document.getElementById("cs-pairs").textContent = data.coauthor_links.length;
    const top = data.coauthor_links[0];
    if (top) document.getElementById("cs-top").textContent = `${ccName(top.source)} + ${ccName(top.target)}`;

    // Most connected country
    const degree = {};
    data.coauthor_links.forEach(l => {
        degree[l.source] = (degree[l.source] || 0) + 1;
        degree[l.target] = (degree[l.target] || 0) + 1;
    });
    const hub = Object.entries(degree).sort((a, b) => b[1] - a[1])[0];
    if (hub) document.getElementById("cs-hub").textContent = ccName(hub[0]);
}

// ══════════════════════════════════════════════════════════════
// SECTION 3 — CITATION NETWORK MAP
// ══════════════════════════════════════════════════════════════
function drawCitationMap(data, world) {
    const tooltipEl = document.getElementById("citation-tooltip");
    const colorScale = d3.scaleSequential()
        .domain([0, d3.max(data.country_data, d => d.count)])
        .interpolator(d3.interpolate("#1a1200", "#d97706"));

    const { svg, proj, W, H } = buildWorldMap(
        "citation-map-svg", world, data.country_data, colorScale, tooltipEl
    );

    // Draw all citation links
    const links = data.citation_links;
    drawArcs(svg, proj, links, data.country_centroids, AMBER_L, 0.75, tooltipEl, true, W, H);
    drawCountryNodes(svg, proj, data.country_data.slice(0, 25), data.country_centroids, AMBER_L, tooltipEl);

    // Stats
    document.getElementById("ct-pairs").textContent = data.citation_links.length;
    const top = data.citation_links[0];
    if (top) document.getElementById("ct-top").textContent = `${ccName(top.source)} → ${ccName(top.target)}`;
    document.getElementById("ct-total").textContent = data.meta.total_citations.toLocaleString();
}

// Legend bar
function buildLegend(containerId, colorScale, maxVal, labelColor) {
    const container = document.getElementById(containerId);
    const canvas = document.createElement("canvas");
    canvas.width = 120; canvas.height = 12;
    container.appendChild(canvas);
    const ctx = canvas.getContext("2d");
    for (let i = 0; i < 120; i++) {
        ctx.fillStyle = colorScale(maxVal * i / 120);
        ctx.fillRect(i, 0, 1, 12);
    }

    const labels = document.createElement("div");
    labels.style.cssText = "display:flex;justify-content:space-between;font-size:10px;color:" + labelColor + ";margin-top:4px;width:120px;";
    labels.innerHTML = `<span>0</span><span>${maxVal.toLocaleString()}</span>`;
    container.appendChild(labels);
}

// ══════════════════════════════════════════════════════════════
// SECTION 4 — TOPIC BUBBLES
// ══════════════════════════════════════════════════════════════
function drawBubbles(topicData) {
    const container = document.getElementById("bubble-chart");
    const W = container.clientWidth || 640;
    const H = 480;

    const svg = d3.select("#bubble-chart").append("svg")
        .attr("width", W).attr("height", H);

    const root = d3.hierarchy({ children: topicData })
        .sum(d => d.count);
    const pack = d3.pack().size([W, H]).padding(12);
    pack(root);

    const node = svg.selectAll("g")
        .data(root.leaves())
        .join("g")
        .attr("transform", d => `translate(${d.x},${d.y})`)
        .style("cursor", "pointer");

    node.append("circle")
        .attr("r", 0)
        .attr("fill", (d, i) => TOPIC_COLORS[i % TOPIC_COLORS.length] + "33")
        .attr("stroke", (d, i) => TOPIC_COLORS[i % TOPIC_COLORS.length])
        .attr("stroke-width", 2)
        .style("filter", (d, i) => `drop-shadow(0 0 6px ${TOPIC_COLORS[i % TOPIC_COLORS.length]})`)
        .transition().duration(800).delay((d, i) => i * 60)
        .attr("r", d => d.r);

    node.append("text")
        .attr("text-anchor", "middle")
        .attr("dy", "0.35em")
        .attr("fill", "#f0f0ff")
        .attr("font-size", d => Math.max(9, Math.min(d.r / 4.5, 14)))
        .attr("font-family", "'Space Grotesk',sans-serif")
        .attr("font-weight", 600)
        .attr("pointer-events", "none")
        .each(function (d) {
            const words = d.data.topic.split(" "), maxW = d.r * 1.6;
            let lines = [], line = "";
            words.forEach(w => {
                if ((line + " " + w).trim().length * 7 < maxW) {
                    line = (line + " " + w).trim();
                } else { if (line) lines.push(line); line = w; }
            });
            if (line) lines.push(line);
            lines = lines.slice(0, 3);
            const el = d3.select(this);
            lines.forEach((l, i) => {
                el.append("tspan")
                    .attr("x", 0).attr("dy", i === 0 ? -(lines.length - 1) * 7 : 14)
                    .text(l);
            });
            el.append("tspan")
                .attr("x", 0).attr("dy", 14)
                .attr("fill", VIOLET_L).attr("font-size", 10).attr("font-weight", 400)
                .text(d.data.count + " papers");
        });

    // Hover
    node.on("mouseover", function (evt, d) {
        d3.select(this).select("circle")
            .transition().duration(200)
            .attr("stroke-width", 3.5)
            .attr("fill-opacity", 0.5);
    }).on("mouseout", function () {
        d3.select(this).select("circle")
            .transition().duration(200)
            .attr("stroke-width", 2)
            .attr("fill-opacity", 0.2);
    }).on("click", (evt, d) => showTopicPanel(d.data));
}

function showTopicPanel(topic) {
    document.getElementById("panel-topic-title").textContent = topic.topic;
    const list = document.getElementById("panel-papers");
    list.innerHTML = topic.papers.map(p => `
    <div class="paper-item">
      <div class="paper-title">${p.title}</div>
      <div class="paper-meta">
        <span>${p.year}</span> · <span>${p.cited} citations</span>
      </div>
    </div>
  `).join("");
}

// ══════════════════════════════════════════════════════════════
// SECTION 5 — KEYWORD BAR CHART
// ══════════════════════════════════════════════════════════════
function drawKeywords(kwData) {
    const card = document.getElementById("kw-card");
    const W = card.clientWidth - 64;
    const H = kwData.length * 34 + 50;
    const margin = { top: 10, right: 80, bottom: 30, left: 170 };
    const iw = W - margin.left - margin.right;
    const ih = H - margin.top - margin.bottom;

    const svg = d3.select("#keyword-chart").attr("width", W).attr("height", H);
    const g = svg.append("g").attr("transform", `translate(${margin.left},${margin.top})`);

    const x = d3.scaleLinear().domain([0, d3.max(kwData, d => d.count)]).range([0, iw]);
    const y = d3.scaleBand().domain(kwData.map(d => d.keyword)).range([0, ih]).padding(0.28);

    // Gradient for bars
    const defs = svg.append("defs");
    const barGrad = defs.append("linearGradient").attr("id", "barGrad")
        .attr("x1", "0%").attr("y1", "0%").attr("x2", "100%").attr("y2", "0%");
    barGrad.append("stop").attr("offset", "0%").attr("stop-color", VIOLET);
    barGrad.append("stop").attr("offset", "100%").attr("stop-color", CYAN);

    // Bars
    g.selectAll("rect").data(kwData).join("rect")
        .attr("x", 0).attr("y", d => y(d.keyword))
        .attr("height", y.bandwidth())
        .attr("width", 0)
        .attr("rx", 4)
        .attr("fill", "url(#barGrad)")
        .style("filter", "drop-shadow(0 0 4px rgba(124,58,237,0.5))")
        .transition().duration(900).delay((d, i) => i * 40)
        .attr("width", d => x(d.count));

    // Count labels
    g.selectAll(".bar-val").data(kwData).join("text")
        .attr("class", "bar-val")
        .attr("x", d => x(d.count) + 8)
        .attr("y", d => y(d.keyword) + y.bandwidth() / 2 + 4)
        .attr("fill", VIOLET_L).attr("font-size", 11).attr("font-weight", 600)
        .attr("font-family", "'Space Grotesk',sans-serif")
        .text(d => d.count.toLocaleString());

    // Y axis
    g.append("g").call(d3.axisLeft(y).tickSize(0))
        .selectAll("text").attr("fill", "#a0a0c0").attr("font-size", 12);
    g.select(".domain").remove();

    // Gridlines
    g.append("g").attr("class", "grid")
        .call(d3.axisBottom(x).ticks(5).tickSize(ih).tickFormat(""))
        .attr("transform", "translate(0,0)")
        .selectAll("line").attr("stroke", "rgba(255,255,255,0.05)").attr("stroke-dasharray", "4,4");
    g.select(".grid .domain").remove();
}

// ══════════════════════════════════════════════════════════════
// SECTION 6 — LOLLIPOP CHART (Institutions)
// ══════════════════════════════════════════════════════════════
function drawLollipop(instData) {
    const card = document.getElementById("lollipop-card");
    const W = card.clientWidth - 64;
    const H = instData.length * 34 + 60;
    const margin = { top: 10, right: 80, bottom: 30, left: 220 };
    const iw = W - margin.left - margin.right;
    const ih = H - margin.top - margin.bottom;

    const svg = d3.select("#lollipop-chart").attr("width", W).attr("height", H);
    const g = svg.append("g").attr("transform", `translate(${margin.left},${margin.top})`);

    const x = d3.scaleLinear().domain([0, d3.max(instData, d => d.count) * 1.1]).range([0, iw]);
    const y = d3.scaleBand().domain(instData.map(d => d.name)).range([0, ih]).padding(0.45);

    // stems
    g.selectAll(".stem").data(instData).join("line")
        .attr("class", "stem")
        .attr("x1", 0).attr("x2", 0)
        .attr("y1", d => y(d.name) + y.bandwidth() / 2)
        .attr("y2", d => y(d.name) + y.bandwidth() / 2)
        .attr("stroke", d => countryColor(d.country))
        .attr("stroke-width", 2).attr("stroke-opacity", 0.5)
        .transition().duration(700).delay((d, i) => i * 35)
        .attr("x2", d => x(d.count));

    // circles
    g.selectAll(".lolly").data(instData).join("circle")
        .attr("class", "lolly")
        .attr("cx", 0)
        .attr("cy", d => y(d.name) + y.bandwidth() / 2)
        .attr("r", 6)
        .attr("fill", d => countryColor(d.country))
        .attr("stroke", "#07071a").attr("stroke-width", 1.5)
        .style("filter", d => `drop-shadow(0 0 4px ${countryColor(d.country)})`)
        .transition().duration(700).delay((d, i) => i * 35)
        .attr("cx", d => x(d.count));

    // count labels
    g.selectAll(".lval").data(instData).join("text")
        .attr("class", "lval")
        .attr("x", d => x(d.count) + 10)
        .attr("y", d => y(d.name) + y.bandwidth() / 2 + 4)
        .attr("fill", "#a0a0c0").attr("font-size", 11)
        .text(d => d.count);

    // y axis
    g.append("g").call(d3.axisLeft(y).tickSize(0))
        .selectAll("text").attr("fill", "#a0a0c0").attr("font-size", 10.5);
    g.select(".domain").remove();
}

function countryColor(cc) {
    const map = {
        US: VIOLET_L, GB: CYAN_L, DE: "#34d399",
        CN: "#f87171", AU: AMBER_L, SG: "#a3e635",
        NL: "#38bdf8", CH: "#e879f9", CA: "#fb923c", IN: "#facc15"
    };
    return map[cc] || "#60607a";
}

// ══════════════════════════════════════════════════════════════
// SECTION 6 — SCATTER PLOT (FWCI vs Citations)
// ══════════════════════════════════════════════════════════════
function drawScatter(rawData) {
    // Filter to visible range
    const data = rawData.filter(d => d.fwci <= 200 && d.cited <= 2000 && d.cited > 0);

    const card = document.getElementById("scatter-card");
    const W = card.clientWidth - 64;
    const H = 380;
    const margin = { top: 20, right: 20, bottom: 55, left: 65 };
    const iw = W - margin.left - margin.right;
    const ih = H - margin.top - margin.bottom;

    const svg = d3.select("#scatter-chart").attr("width", W).attr("height", H);
    const g = svg.append("g").attr("transform", `translate(${margin.left},${margin.top})`);

    const x = d3.scaleLinear().domain([0, d3.max(data, d => d.fwci)]).range([0, iw]);
    const y = d3.scaleLinear().domain([0, d3.max(data, d => d.cited)]).range([ih, 0]);

    // Gridlines
    g.append("g").attr("class", "grid")
        .call(d3.axisLeft(y).ticks(5).tickSize(-iw).tickFormat(""))
        .selectAll("line").attr("stroke", "rgba(255,255,255,0.04)");
    g.select(".grid .domain").remove();

    // Reference line x=1 (FWCI=1 = average)
    g.append("line")
        .attr("x1", x(1)).attr("x2", x(1))
        .attr("y1", 0).attr("y2", ih)
        .attr("stroke", "rgba(124,58,237,0.3)")
        .attr("stroke-dasharray", "5,4");
    g.append("text")
        .attr("x", x(1) + 4).attr("y", 10)
        .attr("fill", "rgba(167,139,250,0.6)").attr("font-size", 9)
        .text("FWCI=1 (avg)");

    const tooltip = d3.select("body").append("div")
        .attr("class", "map-tooltip").style("position", "fixed");

    // Dots
    g.selectAll("circle").data(data).join("circle")
        .attr("cx", d => x(d.fwci))
        .attr("cy", d => y(d.cited))
        .attr("r", 4)
        .attr("fill", d => YEAR_COLORS[d.year] || VIOLET_L)
        .attr("fill-opacity", 0.65)
        .attr("stroke", "none")
        .style("cursor", "pointer")
        .on("mouseover", (evt, d) => {
            tooltip.style("opacity", 1)
                .style("left", evt.clientX + 14 + "px").style("top", evt.clientY - 50 + "px")
                .html(`<div class="tt-title" style="max-width:240px;white-space:normal">${d.title}</div>
          <div class="tt-row">FWCI: <span class="tt-accent">${d.fwci}</span> · Citations: <span class="tt-accent">${d.cited}</span> · ${d.year}</div>`);
        })
        .on("mousemove", evt => tooltip.style("left", evt.clientX + 14 + "px").style("top", evt.clientY - 50 + "px"))
        .on("mouseout", () => tooltip.style("opacity", 0));

    g.append("g").attr("transform", `translate(0,${ih})`).call(d3.axisBottom(x).ticks(5));
    g.append("g").call(d3.axisLeft(y).ticks(5));
    g.select(".domain").attr("stroke", "rgba(255,255,255,0.1)");

    g.append("text").attr("class", "axis-label")
        .attr("x", iw / 2).attr("y", ih + 44).attr("text-anchor", "middle").text("FWCI (Field-Weighted Citation Impact)");
    g.append("text").attr("class", "axis-label")
        .attr("transform", "rotate(-90)").attr("x", -ih / 2).attr("y", -52)
        .attr("text-anchor", "middle").text("Citation Count");

    // Legend
    const leg = document.getElementById("scatter-legend");
    leg.innerHTML = Object.entries(YEAR_COLORS).map(([y, c]) =>
        `<div class="sleg-item"><div class="sleg-dot" style="background:${c}"></div>${y}</div>`
    ).join("");
}
