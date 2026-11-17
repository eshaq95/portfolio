// Interactive figures for the projects section.
// Plain SVG and canvas, no libraries. Colours come from the CSS variables, so the charts follow
// the light and dark themes. The data is in projects-data.js, built from my GitHub repos by
// tools/build_project_assets.py.

(() => {
  "use strict";

  const DATA = window.PROJECT_DATA;
  if (!DATA) return;

  const NS = "http://www.w3.org/2000/svg";

  // ---------- Small helpers ----------

  function svgEl(tag, attrs = {}, parent) {
    const node = document.createElementNS(NS, tag);
    for (const [key, value] of Object.entries(attrs)) node.setAttribute(key, value);
    if (parent) parent.appendChild(node);
    return node;
  }

  function svgText(parent, x, y, text, attrs = {}) {
    const node = svgEl("text", { x, y, ...attrs }, parent);
    node.textContent = text;
    return node;
  }

  function tooltip(parent, text) {
    svgEl("title", {}, parent).textContent = text;
  }

  function htmlEl(tag, attrs = {}, text) {
    const node = document.createElement(tag);
    for (const [key, value] of Object.entries(attrs)) node.setAttribute(key, value);
    if (text !== undefined) node.textContent = text;
    return node;
  }

  const slot = (figure, name) => figure.querySelector(`[data-slot="${name}"]`);
  const minus = (text) => text.replace("-", "−");
  const number = new Intl.NumberFormat("en-GB");
  const dateFormat = new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" });

  // A row of toggle buttons. Calls onChange with the chosen value.
  function segmented(host, label, options, initial, onChange) {
    const group = htmlEl("div", { class: "seg", role: "group", "aria-label": label });
    for (const [value, text] of options) {
      const button = htmlEl("button", { type: "button", "aria-pressed": String(value === initial) }, text);
      button.addEventListener("click", () => {
        group.querySelectorAll("button").forEach((b) => b.setAttribute("aria-pressed", String(b === button)));
        onChange(value);
      });
      group.appendChild(button);
    }
    host.appendChild(group);
    return group;
  }

  function textButton(host, text, onClick) {
    const button = htmlEl("button", { type: "button", class: "text-button" }, text);
    button.addEventListener("click", onClick);
    host.appendChild(button);
    return button;
  }

  // Redraw when the element changes width.
  function onResize(element, draw) {
    let width = element.clientWidth;
    let frame = 0;
    new ResizeObserver(() => {
      if (element.clientWidth === width) return;
      width = element.clientWidth;
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(draw);
    }).observe(element);
  }

  function niceMax(value, step) {
    return Math.max(step, Math.ceil(value / step) * step);
  }

  // The smallest of 1, 2, 5 or 10 times a power of ten that is at least raw.
  function niceStep(raw) {
    const power = 10 ** Math.floor(Math.log10(raw));
    return [1, 2, 5, 10].find((m) => m * power >= raw) * power;
  }

  // ---------- Horizontal bar chart ----------
  // rows: { label, value, kind, tip }. kind picks the style: accent, muted or outline.
  function barChart(stage, rows, options = {}) {
    stage.textContent = "";
    const width = Math.max(260, stage.clientWidth);
    const stacked = width < 540;
    const format = options.format || ((v) => v.toFixed(2));
    const values = rows.map((r) => r.value).concat((options.refs || []).map((r) => r.value));
    let lo = Math.min(0, ...values);
    let hi = Math.max(0, ...values);
    if (options.domain) {
      lo = Math.min(lo, options.domain[0]);
      hi = Math.max(hi, options.domain[1]);
    }
    const labelWidth = stacked ? 0 : Math.min(options.labelWidth || 230, Math.round(width * 0.4));
    const padLeft = lo < 0 ? 58 : 0;
    const padRight = 62;
    const x0 = labelWidth + padLeft;
    const plotWidth = Math.max(40, width - x0 - padRight);
    const x = (v) => x0 + ((v - lo) / (hi - lo)) * plotWidth;
    const barHeight = options.barHeight || 15;
    const rowHeight = stacked ? barHeight + 24 : barHeight + 11;
    const top = 6;
    const bottom = top + rows.length * rowHeight;
    const height = bottom + ((options.refs || []).length ? 26 : 6);

    const svg = svgEl("svg", { viewBox: `0 0 ${width} ${height}`, width, height, role: "img" });
    const summary = rows.map((r) => `${r.label} ${format(r.value)}`).join(", ");
    svg.setAttribute("aria-label", options.label ? `${options.label}: ${summary}.` : summary);

    // A vertical line at a value. When the labels sit above the bars, draw it beside each bar only,
    // so it does not cross the labels.
    const barTop = (i) => (stacked ? top + i * rowHeight + 17 : top + i * rowHeight + (rowHeight - barHeight) / 2);
    const vertical = (value, className) => {
      const xv = x(value);
      if (!stacked) {
        svgEl("line", { x1: xv, x2: xv, y1: top - 4, y2: bottom + 4, class: className }, svg);
        return;
      }
      rows.forEach((_, i) => svgEl("line", { x1: xv, x2: xv, y1: barTop(i) - 3, y2: barTop(i) + barHeight + 3, class: className }, svg));
    };
    if (lo < 0) vertical(0, "axis");

    rows.forEach((row, i) => {
      const yRow = top + i * rowHeight;
      const yBar = barTop(i);
      const g = svgEl("g", { class: row.kind ? `is-${row.kind}` : "" }, svg);
      if (stacked) {
        svgText(g, 0, yRow + 11, row.label, { class: "lbl" });
      } else {
        svgText(g, labelWidth - 10, yBar + barHeight / 2, row.label,
          { class: "lbl", "text-anchor": "end", "dominant-baseline": "central" });
      }
      const left = x(Math.min(0, row.value));
      const right = x(Math.max(0, row.value));
      svgEl("rect", { x: left, y: yBar, width: Math.max(1.5, right - left), height: barHeight, rx: 2, class: "bar" }, g);
      svgText(g, row.value >= 0 ? right + 6 : left - 6, yBar + barHeight / 2, format(row.value), {
        class: "val",
        "text-anchor": row.value >= 0 ? "start" : "end",
        "dominant-baseline": "central",
      });
      if (row.tip) tooltip(g, row.tip);
    });

    for (const ref of options.refs || []) {
      const xr = x(ref.value);
      vertical(ref.value, "ref");
      const anchor = xr > width - 140 ? "end" : xr < x0 + 70 ? "start" : "middle";
      svgText(svg, xr, height - 7, ref.label, { class: "ref-lbl", "text-anchor": anchor });
    }
    stage.appendChild(svg);
  }

  // ---------- Column chart ----------
  function columnChart(stage, values, labels, options = {}) {
    stage.textContent = "";
    const width = Math.max(260, stage.clientWidth);
    const height = options.height || 230;
    const m = { l: 40, r: 6, t: 10, b: 26 };
    const step = options.step || 100;
    const yMax = niceMax(Math.max(...values), step);
    const plotW = width - m.l - m.r;
    const plotH = height - m.t - m.b;
    const band = plotW / values.length;
    const barW = Math.max(3, band * 0.72);
    const y = (v) => m.t + plotH - (v / yMax) * plotH;

    const svg = svgEl("svg", { viewBox: `0 0 ${width} ${height}`, width, height, role: "img" });
    svg.setAttribute("aria-label", `${options.label}: ${labels.map((l, i) => `${l} ${values[i]}`).join(", ")}.`);
    const grid = svgEl("g", { class: "grid" }, svg);
    for (let v = 0; v <= yMax; v += step) {
      svgEl("line", { x1: m.l, x2: width - m.r, y1: y(v), y2: y(v) }, grid);
      svgText(svg, m.l - 8, y(v), number.format(v), { class: "tick", "text-anchor": "end", "dominant-baseline": "central" });
    }
    const highlight = options.highlight || [values.indexOf(Math.max(...values))];
    values.forEach((v, i) => {
      const g = svgEl("g", { class: highlight.includes(i) ? "is-accent" : "" }, svg);
      const cx = m.l + band * i + band / 2;
      svgEl("rect", { x: cx - barW / 2, y: y(v), width: barW, height: y(0) - y(v), rx: 1.5, class: "bar" }, g);
      tooltip(g, `${options.tipLabel ? options.tipLabel(i) : labels[i]}: ${number.format(v)} calls`);
      if (i % (options.labelEvery || 1) === 0) svgText(svg, cx, height - 8, labels[i], { class: "tick", "text-anchor": "middle" });
    });
    stage.appendChild(svg);
  }

  // ---------- Line chart ----------
  // series: { points: [[x, y]], className, dots }. Optional readout on hover, tap or arrow keys.
  function lineChart(stage, series, options) {
    stage.textContent = "";
    const width = Math.max(240, stage.clientWidth);
    const height = options.height || Math.round(Math.min(320, Math.max(210, width * 0.4)));
    const m = { l: options.left || 40, r: 12, t: 12, b: 28 };
    const ys = series.flatMap((s) => s.points.map((p) => p[1]));
    const [xMin, xMax] = options.xDomain;
    const lowest = Math.min(0, ...ys);
    const yStep = options.yStep || niceStep((Math.max(...ys) - lowest) / 4);
    const yMin = Math.floor(lowest / yStep) * yStep;
    const yMax = niceMax(Math.max(...ys), yStep);
    const x = (v) => m.l + ((v - xMin) / (xMax - xMin)) * (width - m.l - m.r);
    const y = (v) => m.t + (1 - (v - yMin) / (yMax - yMin)) * (height - m.t - m.b);

    const svg = svgEl("svg", { viewBox: `0 0 ${width} ${height}`, width, height, role: "img" });
    svg.setAttribute("aria-label", options.label);
    const grid = svgEl("g", { class: "grid" }, svg);
    for (let v = yMin; v <= yMax + 1e-9; v += yStep) {
      const tick = Number(v.toFixed(6));
      svgEl("line", { x1: m.l, x2: width - m.r, y1: y(tick), y2: y(tick), class: tick === 0 ? "zero" : "" }, grid);
      svgText(svg, m.l - 8, y(tick), minus(String(tick)), { class: "tick", "text-anchor": "end", "dominant-baseline": "central" });
    }
    for (const [value, text] of options.xTicks) {
      const anchor = value <= xMin ? "start" : value >= xMax ? "end" : "middle";
      svgEl("line", { x1: x(value), x2: x(value), y1: height - m.b, y2: height - m.b + 4, class: "axis" }, svg);
      svgText(svg, x(value), height - 8, text, { class: "tick", "text-anchor": anchor });
    }
    if (options.band) {
      const left = x(options.band.from);
      const right = x(options.band.to);
      svgEl("rect", { x: left, y: m.t, width: Math.max(0, right - left), height: height - m.t - m.b, class: "band" }, svg);
      svgText(svg, right - 4, m.t + 11, options.band.label, { class: "band-lbl", "text-anchor": "end" });
    }
    for (const s of series) {
      const d = s.points.map((p, i) => `${i ? "L" : "M"}${x(p[0]).toFixed(1)} ${y(p[1]).toFixed(1)}`).join("");
      svgEl("path", { d, class: s.className }, svg);
      if (s.dots) for (const p of s.points) svgEl("circle", { cx: x(p[0]), cy: y(p[1]), r: 2.6, class: "dot" }, svg);
    }

    if (options.onHover) {
      const points = options.hoverPoints;
      const guide = svgEl("line", { y1: m.t, y2: height - m.b, class: "guide", visibility: "hidden" }, svg);
      const marker = svgEl("circle", { r: 4, class: "marker", visibility: "hidden" }, svg);
      let index = -1;
      const show = (i) => {
        index = Math.max(0, Math.min(points.length - 1, i));
        const [px, py] = points[index];
        guide.setAttribute("x1", x(px));
        guide.setAttribute("x2", x(px));
        marker.setAttribute("cx", x(px));
        marker.setAttribute("cy", y(py));
        guide.setAttribute("visibility", "visible");
        marker.setAttribute("visibility", "visible");
        options.onHover(index);
      };
      const hide = () => {
        index = -1;
        guide.setAttribute("visibility", "hidden");
        marker.setAttribute("visibility", "hidden");
        options.onHover(-1);
      };
      const nearest = (event) => {
        const box = svg.getBoundingClientRect();
        const px = (event.clientX - box.left) * (width / box.width);
        const value = xMin + ((px - m.l) / (width - m.l - m.r)) * (xMax - xMin);
        let lo = 0;
        let hi = points.length - 1;
        while (hi - lo > 1) {
          const mid = (lo + hi) >> 1;
          if (points[mid][0] < value) lo = mid; else hi = mid;
        }
        return Math.abs(points[lo][0] - value) < Math.abs(points[hi][0] - value) ? lo : hi;
      };
      svg.style.touchAction = "pan-y";
      svg.addEventListener("pointermove", (e) => show(nearest(e)));
      svg.addEventListener("pointerdown", (e) => show(nearest(e)));
      svg.addEventListener("pointerleave", (e) => { if (e.pointerType === "mouse") hide(); });
      svg.setAttribute("tabindex", "0");
      svg.addEventListener("keydown", (e) => {
        const step = { ArrowRight: 1, ArrowLeft: -1, PageUp: 10, PageDown: -10 }[e.key];
        if (step) { e.preventDefault(); show(index < 0 ? points.length - 1 : index + step); }
        if (e.key === "Home") { e.preventDefault(); show(0); }
        if (e.key === "End") { e.preventDefault(); show(points.length - 1); }
        if (e.key === "Escape") hide();
      });
      svg.addEventListener("blur", hide);
    }
    stage.appendChild(svg);
  }

  // ---------- Figures ----------

  const builders = {
    // Ambulance calls: weekly volume with the TBATS forecast, and when in the day and week calls came in.
    ambulance(figure) {
      const A = DATA.ambulance;
      const stage = slot(figure, "stage");
      const readout = slot(figure, "readout");
      const day = 86400000;
      const weeks = A.weeks.map(([d, n]) => [Date.parse(d), n]);
      const start = Date.parse(A.forecastStart);
      const forecast = A.forecast.map((v, i) => [start + i * 7 * day, v]);
      const end = forecast[forecast.length - 1][0] + 4 * day;
      const first = A.forecast[0].toFixed(1);
      const last = A.forecast[A.forecast.length - 1].toFixed(1);
      const hint = "Hover, tap or use the arrow keys to read a week.";
      const forecastText = `The TBATS forecast for the eight weeks from ${dateFormat.format(start)} rises from ${first} to ${last} calls a week.`;
      const hours = Array.from({ length: 24 }, (_, h) => String(h).padStart(2, "0"));
      const days = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
      const months = ["Jan", "Mar", "May", "Jul", "Sep", "Nov"];
      let view = "weeks";

      // Weekly calls from a start date, then the forecast in a shaded strip.
      const weekly = (from, xTicks, summary, label) => {
        const shown = weeks.filter(([t]) => t >= from);
        const points = shown.concat(forecast);
        readout.textContent = summary;
        lineChart(stage, [
          { points: shown, className: "line" },
          { points: [shown[shown.length - 1], ...forecast], className: "line line-accent line-dashed" },
          { points: forecast, className: "line-none", dots: from > weeks[0][0] },
        ], {
          label,
          yStep: 10,
          xDomain: [from, end],
          xTicks,
          band: { from: start - 4 * day, to: end, label: "Forecast" },
          hoverPoints: points,
          onHover(i) {
            if (i < 0) { readout.textContent = summary; return; }
            const [t, v] = points[i];
            readout.textContent = i < shown.length
              ? `Week starting ${dateFormat.format(t)}: ${v} ${v === 1 ? "call" : "calls"}.`
              : `Forecast for the week of ${dateFormat.format(t)}: ${v.toFixed(1)} calls.`;
          },
        });
      };

      const draw = () => {
        if (view === "weeks") {
          weekly(weeks[0][0], [2017, 2018, 2019, 2020, 2021, 2022].map((yr) => [Date.UTC(yr, 0, 1), String(yr)]),
            `Calls fell from about 20 a week in 2017 to under 10 by 2022. The shaded strip is the forecast. ${hint}`,
            "Weekly ambulance calls from January 2017 to October 2022, falling from about 20 a week to under 10, followed by an eight-week forecast.");
        } else if (view === "forecast") {
          weekly(Date.UTC(2022, 0, 1), months.map((name, i) => [Date.UTC(2022, i * 2, 1), i ? name : "Jan 2022"]),
            `${forecastText} ${hint}`,
            `Weekly ambulance calls in 2022, followed by the eight-week TBATS forecast, which rises from ${first} to ${last} calls a week.`);
        } else if (view === "hour") {
          readout.textContent = "Calls by the hour they came in. The busiest hours were 05:00 to 07:00, then 10:00 to 11:00.";
          columnChart(stage, A.hour, hours, {
            label: "Calls by hour of day", step: 100, labelEvery: 3, highlight: [5, 6, 10],
            tipLabel: (i) => `${hours[i]}:00 to ${hours[(i + 1) % 24]}:00`,
          });
        } else {
          readout.textContent = "Calls by day of the week. Weekdays were busier than weekends, and Sunday was the quietest day.";
          columnChart(stage, A.weekday, days, { label: "Calls by day of week", step: 100 });
        }
      };
      segmented(slot(figure, "controls"), "Choose a view",
        [["weeks", "All weeks"], ["forecast", "Forecast"], ["hour", "Hour of day"], ["day", "Day of week"]], view,
        (v) => { view = v; draw(); });
      draw();
      onResize(stage, draw);
    },

    // Car insurance: who is interested, and how the three models compare.
    car(figure) {
      const C = DATA.car;
      const stage = slot(figure, "stage");
      const readout = slot(figure, "readout");
      const sub = slot(figure, "sub");
      const overall = (C.interested / C.rows) * 100;
      let view = "groups";
      let feature = C.features[0].key;
      let metric = 1;
      const metrics = [[1, "PR-AUC"], [2, "ROC-AUC"], [3, "Cohen’s kappa"]];
      const notes = {
        1: "PR-AUC suits imbalanced data like this. Guessing would score about 0.12.",
        2: "ROC-AUC: 0.5 is random guessing and 1 is perfect.",
        3: "Cohen’s kappa: agreement beyond chance, where 0 is chance and 1 is perfect.",
      };
      const baselines = {
        1: { value: C.interested / C.rows, label: `Guessing ${(C.interested / C.rows).toFixed(2)}` },
        2: { value: 0.5, label: "Random 0.5" },
      };

      const draw = () => {
        if (view === "groups") {
          const f = C.features.find((x) => x.key === feature);
          readout.textContent = `${overall.toFixed(1)}% of all ${number.format(C.rows)} customers were interested (dashed line). Groups above that rate are highlighted.`;
          barChart(stage, f.groups.map(([name, n, k]) => {
            const rate = (k / n) * 100;
            return {
              label: name,
              value: rate,
              kind: name === "Not recorded" ? "muted" : rate > overall ? "accent" : "",
              tip: `${name}: ${number.format(k)} of ${number.format(n)} customers interested`,
            };
          }), {
            label: `Share of customers interested in car insurance, by ${f.name.toLowerCase()}`,
            format: (v) => `${v.toFixed(1)}%`,
            domain: [0, 30],
            labelWidth: 140,
            refs: [{ value: overall, label: `All customers ${overall.toFixed(1)}%` }],
          });
        } else {
          const best = Math.max(...C.models.map((mo) => mo[metric]));
          readout.textContent = notes[metric];
          barChart(stage, C.models.map((mo) => ({
            label: mo[0],
            value: mo[metric],
            kind: mo[metric] === best ? "accent" : "",
          })), {
            label: metrics.find((x) => x[0] === metric)[1],
            format: (v) => v.toFixed(3),
            domain: [0, 1],
            labelWidth: 170,
            refs: baselines[metric] ? [baselines[metric]] : [],
          });
        }
      };

      const subControls = () => {
        sub.textContent = "";
        if (view === "groups") {
          segmented(sub, "Choose a feature", C.features.map((f) => [f.key, f.name]), feature, (v) => { feature = v; draw(); });
        } else {
          segmented(sub, "Choose a measure", metrics, metric, (v) => { metric = v; draw(); });
        }
      };
      segmented(slot(figure, "controls"), "Choose a view", [["groups", "Who is interested"], ["models", "Model scores"]],
        view, (v) => { view = v; subControls(); draw(); });
      subControls();
      draw();
      onResize(stage, draw);
    },

    // Text classification: F1 score for each newsgroup, by model.
    text(figure) {
      const models = DATA.text.models;
      const stage = slot(figure, "stage");
      const readout = slot(figure, "readout");
      // Order the newsgroups by their average F1 across the four models, hardest last.
      const f1 = (model, name) => model.classes.find((c) => c[0] === name)[3];
      const mean = (name) => models.reduce((sum, model) => sum + f1(model, name), 0) / models.length;
      const order = models[0].classes.map((c) => c[0]).sort((a, b) => mean(b) - mean(a));
      let current = "BERT";

      const draw = () => {
        const model = models.find((mo) => mo.name === current);
        const scores = order.map((name) => model.classes.find((c) => c[0] === name));
        const third = scores.map((c) => c[3]).sort((a, b) => a - b)[2];
        readout.textContent = `${model.name}: accuracy ${model.accuracy.toFixed(2)} and macro F1 ${model.macroF1.toFixed(2)}.`;
        barChart(stage, scores.map(([name, p, r, score]) => ({
          label: name,
          value: score,
          kind: score <= third ? "accent" : "",
          tip: `${name}: precision ${p.toFixed(2)}, recall ${r.toFixed(2)}, F1 ${score.toFixed(2)}`,
        })), { label: `F1 score by newsgroup for ${model.name}`, domain: [0, 1], labelWidth: 200, barHeight: 12 });
      };
      segmented(slot(figure, "controls"), "Choose a model", models.map((mo) => [mo.name, mo.name]), current,
        (v) => { current = v; draw(); });
      draw();
      onResize(stage, draw);
    },

    // Dissertation: test-period returns, and White's Reality Check on the in-sample period.
    trading(figure) {
      const T = DATA.trading;
      const stage = slot(figure, "stage");
      const readout = slot(figure, "readout");
      const sub = slot(figure, "sub");
      const legend = slot(figure, "legend");
      let view = "returns";
      let measure = 2;
      let test = 1;
      const pct = (v) => minus(`${v > 0 ? "+" : ""}${number.format(Math.round(v * 10) / 10)}%`);
      const wrcNotes = {
        1: "Reality Check p-values against buy and hold, 2010 to June 2021. Only MACD2 is below 0.05, and its Sharpe ratio (−2.18) was still worse than buy and hold’s (−1.93).",
        2: "Reality Check p-values against buy and hold, 2010 to June 2021. All are close to 1, so no rule beat buy and hold on annualised return.",
        3: "Reality Check p-values against buy and hold, 2010 to June 2021. All are close to 1, so no rule beat buy and hold on cumulative return.",
      };

      const draw = () => {
        if (view === "returns") {
          legend.hidden = false;
          readout.textContent = `${measure === 2 ? "Annualised" : "Cumulative"} returns on unseen data, from 23 June 2021 to 22 March 2024. Buy and hold lost money over this period.`;
          const rows = T.test.slice().sort((a, b) => b[measure] - a[measure]);
          barChart(stage, rows.map(([name, kind, annual, total]) => ({
            label: name,
            value: measure === 2 ? annual : total,
            kind: kind === "ml" ? "accent" : kind === "benchmark" ? "outline" : "",
            tip: `${name}: annualised ${pct(annual)}, cumulative ${pct(total)}`,
          })), { label: measure === 2 ? "Annualised return" : "Cumulative return", format: pct, labelWidth: 220 });
        } else {
          legend.hidden = true;
          readout.textContent = wrcNotes[test];
          barChart(stage, T.wrc.map((row) => ({
            label: `${row[0]} rule`,
            value: row[test],
            kind: row[test] < 0.05 ? "accent" : "",
          })), {
            label: "White’s Reality Check p-values",
            format: (v) => v.toFixed(3),
            domain: [0, 1],
            labelWidth: 120,
            refs: [{ value: 0.05, label: "5% level" }],
          });
        }
      };

      const subControls = () => {
        sub.textContent = "";
        if (view === "returns") {
          segmented(sub, "Choose a measure", [[2, "Annualised"], [3, "Cumulative"]], measure, (v) => { measure = v; draw(); });
        } else {
          segmented(sub, "Choose a measure", [[1, "Sharpe ratio"], [2, "Annualised return"], [3, "Cumulative return"]], test,
            (v) => { test = v; draw(); });
        }
      };
      segmented(slot(figure, "controls"), "Choose a view", [["returns", "Test-period returns"], ["wrc", "Reality Check"]],
        view, (v) => { view = v; subControls(); draw(); });
      subControls();
      draw();
      onResize(stage, draw);
    },

    // Turbine: the blade element method from TurbineOptimisation.m, ported line for line.
    turbine(figure) {
      const fixed = { radius: 0.2, elements: 100, attack: 4, cl: 1.051, liftOverDrag: 1 / 0.004, rho: 1.2 };
      const design = { rpm: 2500, wind: 12, blades: 3 };
      const state = { ...design };
      const charts = slot(figure, "stage");
      const stats = slot(figure, "stats");

      function blade({ rpm, wind, blades }) {
        const { radius: R, elements: N, cl, liftOverDrag } = fixed;
        const alpha = (fixed.attack * Math.PI) / 180;
        const tsr = (R * 2 * Math.PI * rpm) / 60 / wind;
        const dr = R / N;
        const twist = [];
        const chord = [];
        let cp = 0;
        let previous = 0;
        for (let i = 1; i <= N; i++) {
          const r = dr * (i - 0.5);
          const local = (tsr * r) / R;
          const phi = (2 / 3) * Math.atan(1 / local);
          const tipLoss = (2 / Math.PI) * Math.acos(Math.exp((-(blades / 2) * (1 - r / R)) / ((r / R) * Math.sin(phi))));
          const c = ((8 * Math.PI * r * tipLoss * Math.sin(phi)) / (blades * cl))
            * (Math.cos(phi) - local * Math.sin(phi)) / (Math.sin(phi) + local * Math.cos(phi));
          const step = i === 1 ? local : local - previous;
          cp += ((8 * step) / tsr ** 2) * tipLoss * Math.sin(phi) ** 2
            * (Math.cos(phi) - local * Math.sin(phi)) * (Math.sin(phi) + local * Math.cos(phi))
            * (1 - (1 / liftOverDrag) / Math.tan(phi)) * local ** 2;
          previous = local;
          twist.push([r / R, ((phi - alpha) * 180) / Math.PI]);
          chord.push([r / R, c * 1000]);
        }
        const power = 0.5 * fixed.rho * Math.PI * R ** 2 * cp * wind ** 3;
        return { tsr, cp, power, twist, chord };
      }

      const original = blade(design);
      const panel = (title) => {
        const box = htmlEl("div");
        const chart = htmlEl("div", { class: "mini-chart" });
        box.append(htmlEl("p", { class: "mini-title" }, title), chart);
        charts.appendChild(box);
        return chart;
      };
      const twistStage = panel("Twist along the blade (degrees)");
      const chordStage = panel("Chord length (mm)");

      const statBox = (label) => {
        const box = htmlEl("div", { class: "stat" });
        const value = htmlEl("p", { class: "stat-value" });
        box.append(htmlEl("p", { class: "stat-label" }, label), value);
        stats.appendChild(box);
        return value;
      };
      const tsrOut = statBox("Tip speed ratio");
      const cpOut = statBox("Power coefficient");
      const powerOut = statBox("Power output");

      const xTicks = [[0, "centre"], [0.25, "0.25"], [0.5, "0.5"], [0.75, "0.75"], [1, "tip"]];
      const draw = () => {
        const result = blade(state);
        const isDesign = state.rpm === design.rpm && state.wind === design.wind && state.blades === design.blades;
        tsrOut.textContent = result.tsr.toFixed(2);
        cpOut.textContent = result.cp.toFixed(3);
        powerOut.textContent = `${result.power.toFixed(result.power < 100 ? 2 : 1)} W`;
        const series = (key) => (isDesign ? [] : [{ points: original[key], className: "line line-ghost" }])
          .concat([{ points: result[key], className: "line line-accent" }]);
        lineChart(twistStage, series("twist"), {
          label: `Blade twist from the centre to the tip, falling from ${result.twist[0][1].toFixed(0)} to ${result.twist[result.twist.length - 1][1].toFixed(0)} degrees.`,
          height: 190, xDomain: [0, 1], xTicks, left: 38,
        });
        lineChart(chordStage, series("chord"), {
          label: `Chord length along the blade, peaking at ${Math.max(...result.chord.map((p) => p[1])).toFixed(0)} millimetres.`,
          height: 190, xDomain: [0, 1], xTicks, left: 38,
        });
      };

      const sliders = slot(figure, "sliders");
      const inputs = {};
      const addSlider = (key, label, min, max, step, unit) => {
        const id = `turbine-${key}`;
        const wrap = htmlEl("div", { class: "slider" });
        const lab = htmlEl("label", { for: id });
        const out = htmlEl("output", { for: id });
        lab.append(htmlEl("span", {}, label), out);
        const input = htmlEl("input", { type: "range", id, min, max, step, value: state[key] });
        const show = () => { out.textContent = `${number.format(state[key])}${unit}`; };
        input.addEventListener("input", () => { state[key] = Number(input.value); show(); draw(); });
        show();
        wrap.append(lab, input);
        sliders.appendChild(wrap);
        inputs[key] = { input, show };
      };
      addSlider("rpm", "Rotor speed", 1500, 3500, 50, " rpm");
      addSlider("wind", "Wind speed", 6, 18, 0.5, " m/s");
      addSlider("blades", "Blades", 2, 5, 1, "");
      textButton(slot(figure, "controls"), "Back to my original design", () => {
        Object.assign(state, design);
        for (const [key, { input, show }] of Object.entries(inputs)) { input.value = state[key]; show(); }
        draw();
      });
      draw();
      onResize(charts, draw);
    },

    // Vision agent: the HSV colour filter from main.py, applied to a frame the agent captured.
    vision(figure) {
      const stage = slot(figure, "stage");
      const readout = slot(figure, "readout");
      const controls = slot(figure, "controls");
      const img = stage.querySelector("img");
      const agent = { hMin: 5, hMax: 19, sMin: 145, sMax: 176, vMin: 92, vMax: 255 };
      const shifts = { sAdd: 0, sSub: 4, vAdd: 90, vSub: 0 };
      const limits = { ...agent };
      let view = "overlay";
      let canvas;
      let ctx;
      let original;
      let hue;
      let sat;
      let val;
      let dimmed;

      // OpenCV's 8-bit conversions: hue 0 to 179, saturation and value 0 to 255.
      const shift = (c, amount) => {
        if (amount > 0) return c >= 255 - amount ? 255 : c + amount;
        if (amount < 0) return c <= -amount ? 0 : c + amount;
        return c;
      };
      const toRgb = (h, s, v, out, k) => {
        const sector = (h * 2) / 60;
        const c = (v * s) / 255;
        const x = c * (1 - Math.abs((sector % 2) - 1));
        const m = v - c;
        let r;
        let g;
        let b;
        switch (Math.floor(sector)) {
          case 0: r = c; g = x; b = 0; break;
          case 1: r = x; g = c; b = 0; break;
          case 2: r = 0; g = c; b = x; break;
          case 3: r = 0; g = x; b = c; break;
          case 4: r = x; g = 0; b = c; break;
          default: r = c; g = 0; b = x;
        }
        out[k] = r + m; out[k + 1] = g + m; out[k + 2] = b + m;
      };

      const draw = () => {
        if (!ctx) return;
        if (view === "original") {
          ctx.putImageData(original, 0, 0);
          readout.textContent = "The frame without the filter. The magenta crosses mark the ore the agent found.";
          return;
        }
        const out = ctx.createImageData(canvas.width, canvas.height);
        const o = out.data;
        const background = view === "overlay" ? dimmed : null;
        let kept = 0;
        for (let i = 0, k = 0; i < hue.length; i++, k += 4) {
          o[k + 3] = 255;
          if (hue[i] >= limits.hMin && hue[i] <= limits.hMax && sat[i] >= limits.sMin && sat[i] <= limits.sMax
            && val[i] >= limits.vMin && val[i] <= limits.vMax) {
            toRgb(hue[i], sat[i], val[i], o, k);
            kept++;
          } else if (background) {
            o[k] = o[k + 1] = o[k + 2] = background[i];
          }
        }
        ctx.putImageData(out, 0, 0);
        const share = `${((kept / hue.length) * 100).toFixed(1)}%`;
        readout.textContent = view === "overlay"
          ? `The filter keeps ${share} of the pixels, shown in colour over a dimmed copy of the frame.`
          : `What template matching searches: only the ${share} of pixels that pass the filter.`;
      };

      const prepare = () => {
        const work = htmlEl("canvas", { class: "hsv-canvas", width: img.naturalWidth, height: img.naturalHeight, role: "img" });
        work.setAttribute("aria-label", "The frame the agent captured, shown through its colour filter.");
        const context = work.getContext("2d", { willReadFrequently: true });
        context.drawImage(img, 0, 0);
        original = context.getImageData(0, 0, work.width, work.height);
        const px = original.data;
        const n = px.length / 4;
        hue = new Uint8Array(n); sat = new Uint8Array(n); val = new Uint8Array(n);
        dimmed = new Uint8Array(n);
        for (let i = 0, k = 0; i < n; i++, k += 4) {
          const r = px[k], g = px[k + 1], b = px[k + 2];
          const v = Math.max(r, g, b);
          const d = v - Math.min(r, g, b);
          let h = 0;
          if (d) {
            if (v === r) h = (60 * (g - b)) / d;
            else if (v === g) h = 120 + (60 * (b - r)) / d;
            else h = 240 + (60 * (r - g)) / d;
            if (h < 0) h += 360;
          }
          hue[i] = Math.round(h / 2) % 180;
          sat[i] = shift(shift(v ? Math.round((255 * d) / v) : 0, shifts.sAdd), -shifts.sSub);
          val[i] = shift(shift(v, shifts.vAdd), -shifts.vSub);
          dimmed[i] = Math.round((0.299 * r + 0.587 * g + 0.114 * b) * 0.32);
        }
        canvas = work;
        ctx = context;
        img.replaceWith(canvas);
        draw();
      };

      // The controls: three views, a reset button, and a pair of sliders for each channel.
      const bar = htmlEl("div", { class: "viz-bar-row" });
      controls.appendChild(bar);
      segmented(bar, "Choose a view", [["overlay", "Kept pixels"], ["agent", "Agent’s view"], ["original", "Original"]], view,
        (v) => { view = v; draw(); });
      const sliders = slot(figure, "sliders");
      const inputs = [];
      const outputs = {};
      const showRange = (channel) => {
        outputs[channel].textContent = `${limits[`${channel}Min`]} to ${limits[`${channel}Max`]}`;
      };
      for (const [channel, name, max] of [["h", "Hue", 179], ["s", "Saturation", 255], ["v", "Value", 255]]) {
        const group = htmlEl("fieldset", { class: "range-pair" });
        const legendEl = htmlEl("legend");
        outputs[channel] = htmlEl("output");
        legendEl.append(htmlEl("span", {}, name), outputs[channel]);
        group.appendChild(legendEl);
        for (const end of ["Min", "Max"]) {
          const key = `${channel}${end}`;
          const input = htmlEl("input", {
            type: "range", min: 0, max, step: 1, value: limits[key],
            "aria-label": `${name} ${end === "Min" ? "minimum" : "maximum"}`,
          });
          input.addEventListener("input", () => {
            limits[key] = Number(input.value);
            showRange(channel);
            if (view === "original") {
              view = "overlay";
              bar.querySelectorAll(".seg button").forEach((b, i) => b.setAttribute("aria-pressed", String(i === 0)));
            }
            requestAnimationFrame(draw);
          });
          input.dataset.key = key;
          group.appendChild(input);
          inputs.push(input);
        }
        showRange(channel);
        sliders.appendChild(group);
      }
      textButton(bar, "Back to the agent’s values", () => {
        Object.assign(limits, agent);
        inputs.forEach((input) => { input.value = limits[input.dataset.key]; });
        ["h", "s", "v"].forEach(showRange);
        draw();
      });

      const start = () => {
        try {
          prepare();
        } catch (error) {
          // The canvas cannot read the image (for example when the page is opened from a file),
          // so leave the plain image in place.
          figure.classList.remove("is-live");
          controls.textContent = "";
          sliders.textContent = "";
          readout.textContent = "";
          console.warn(error);
        }
      };
      // Reading the frame's pixels is the slowest step on the page, so wait until the figure is near the screen.
      const whenReady = () => {
        if (img.complete && img.naturalWidth) start();
        else img.addEventListener("load", start, { once: true });
      };
      readout.textContent = "Loading the frame…";
      if ("IntersectionObserver" in window) {
        const io = new IntersectionObserver((entries) => {
          if (entries.some((entry) => entry.isIntersecting)) {
            io.disconnect();
            whenReady();
          }
        }, { rootMargin: "300px 0px" });
        io.observe(figure);
      } else {
        whenReady();
      }
    },
  };

  // Build every figure as soon as the page loads, so the page does not jump when you scroll to one.
  // Each figure is built in its own short task, so the page stays responsive while they draw.
  const queue = Array.from(document.querySelectorAll("[data-viz]"));
  const buildNext = () => {
    const figure = queue.shift();
    if (!figure) return;
    const builder = builders[figure.dataset.viz];
    if (builder) {
      figure.classList.add("is-live");
      try {
        builder(figure);
      } catch (error) {
        figure.classList.remove("is-live");
        if (figure.classList.contains("viz-js")) figure.hidden = true;
        console.error(error);
      }
    }
    setTimeout(buildNext, 0);
  };
  buildNext();
})();
