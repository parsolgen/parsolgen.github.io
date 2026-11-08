// ParSolGen site behaviour: mobile menu, code shell tabs, syntax
// highlighting, copy buttons and the documentation sidebar scroll-spy.
(function () {
  "use strict";

  // ---- Mobile navigation -------------------------------------------------
  var nav = document.querySelector(".mainnav");
  var toggle = document.querySelector(".nav-toggle");
  if (nav && toggle) {
    toggle.addEventListener("click", function () {
      var open = nav.classList.toggle("open");
      toggle.setAttribute("aria-expanded", open ? "true" : "false");
    });
    nav.querySelectorAll("a").forEach(function (a) {
      a.addEventListener("click", function () {
        nav.classList.remove("open");
        toggle.setAttribute("aria-expanded", "false");
      });
    });
  }

  // ---- Code shell tabs (home page) ----------------------------------------
  document.querySelectorAll(".shell").forEach(function (shell) {
    var buttons = shell.querySelectorAll(".shell-tabs button");
    var panels = shell.querySelectorAll(".shell-panel");
    buttons.forEach(function (btn, i) {
      btn.addEventListener("click", function () {
        buttons.forEach(function (b, j) {
          b.classList.toggle("active", i === j);
          b.setAttribute("aria-selected", i === j ? "true" : "false");
          panels[j].hidden = i !== j;
        });
      });
    });
  });

  // ---- Syntax highlighting -------------------------------------------------
  var KEYWORDS = {
    sol: "import export sub in out for while if else return",
    cpp: "for while if else return const static auto void struct class namespace using template typename constexpr final public private",
    python: "def class for in while if elif else not and or return import from as pass True False None with try except raise",
    bash: ""
  };
  var TYPES = {
    sol: "int double float bool Array SingleVersionArray GrowingArray",
    cpp: "int double float bool char std size_t",
    python: "Type Array GrowingArray CSRMatrix KernelArgument ArrayElement",
    bash: "sgc mpicxx mpirun pip python3 export cd tar"
  };

  function wordSet(s) {
    var set = Object.create(null);
    s.split(/\s+/).forEach(function (w) { if (w) set[w] = true; });
    return set;
  }

  var PATTERNS = {
    sol: /(\/\/[^\n]*|\/\*[\s\S]*?\*\/)|("(?:\\.|[^"\\])*")|(%\w+)|(\b\d+(?:\.\d+)?(?:[eE][-+]?\d+)?\b)|([A-Za-z_]\w*)/g,
    cpp: /(\/\/[^\n]*|\/\*[\s\S]*?\*\/)|("(?:\\.|[^"\\])*")|(#\w+)|(\b\d+(?:\.\d+)?(?:[eE][-+]?\d+)?\b)|([A-Za-z_]\w*)/g,
    python: /(#[^\n]*)|("""[\s\S]*?"""|"(?:\\.|[^"\\\n])*"|'(?:\\.|[^'\\\n])*')|(@\w+)|(\b\d+(?:\.\d+)?(?:[eE][-+]?\d+)?\b)|([A-Za-z_]\w*)/g,
    bash: /(#[^\n]*)|("(?:\\.|[^"\\])*")|(\$\w+|\B-{1,2}[\w=-]+)|(\b\d+(?:\.\d+)?\b)|([A-Za-z_][\w.-]*)/g
  };

  function esc(s) {
    return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  }

  function highlight(code, lang) {
    var re = PATTERNS[lang];
    if (!re) return esc(code);
    var kw = wordSet(KEYWORDS[lang]);
    var ty = wordSet(TYPES[lang]);
    var out = "";
    var last = 0;
    var m;
    re.lastIndex = 0;
    while ((m = re.exec(code)) !== null) {
      out += esc(code.slice(last, m.index));
      var t = m[0];
      var cls = null;
      if (m[1]) cls = "com";
      else if (m[2]) cls = "str";
      else if (m[3]) cls = lang === "python" ? "dec" : "macro";
      else if (m[4]) cls = "num";
      else if (m[5]) {
        if (kw[t]) cls = "kw";
        else if (ty[t]) cls = "type";
        else if (/^\s*\(/.test(code.slice(re.lastIndex, re.lastIndex + 4))) cls = "fn";
      }
      out += cls ? '<span class="tok-' + cls + '">' + esc(t) + "</span>" : esc(t);
      last = re.lastIndex;
    }
    return out + esc(code.slice(last));
  }

  document.querySelectorAll("pre > code[data-lang]").forEach(function (el) {
    el.innerHTML = highlight(el.textContent, el.getAttribute("data-lang"));
  });

  // ---- Copy buttons ---------------------------------------------------------
  document.querySelectorAll(".code-wrap").forEach(function (wrap) {
    var code = wrap.querySelector("code");
    if (!code) return;
    var btn = document.createElement("button");
    btn.type = "button";
    btn.className = "copy-btn";
    btn.textContent = "Copy";
    btn.addEventListener("click", function () {
      var done = function () {
        btn.textContent = "Copied";
        setTimeout(function () { btn.textContent = "Copy"; }, 1400);
      };
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(code.textContent).then(done, function () {});
      }
    });
    wrap.appendChild(btn);
  });

  // ---- Documentation sidebar scroll-spy -------------------------------------
  var sidebar = document.querySelector(".docs-sidebar");
  if (sidebar && "IntersectionObserver" in window) {
    var links = {};
    sidebar.querySelectorAll('a[href^="#"]').forEach(function (a) {
      links[a.getAttribute("href").slice(1)] = a;
    });
    var visible = Object.create(null);
    var observer = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) { visible[e.target.id] = e.isIntersecting; });
      var current = null;
      Object.keys(links).some(function (id) {
        if (visible[id]) { current = id; return true; }
        return false;
      });
      if (!current) return;
      Object.keys(links).forEach(function (id) {
        links[id].classList.toggle("current", id === current);
      });
    }, { rootMargin: "-70px 0px -60% 0px" });
    Object.keys(links).forEach(function (id) {
      var target = document.getElementById(id);
      if (target) observer.observe(target);
    });
  }

  // ---- Performance charts -----------------------------------------------------
  // Each .chart holds a data table (first column: category, one column per
  // series, data-color on the header). The chart is drawn from that table, so
  // editing the numbers in the HTML is all it takes to update it.
  var SVGNS = "http://www.w3.org/2000/svg";

  function svgEl(name, attrs, parent) {
    var el = document.createElementNS(SVGNS, name);
    Object.keys(attrs).forEach(function (k) { el.setAttribute(k, attrs[k]); });
    if (parent) parent.appendChild(el);
    return el;
  }

  function niceStep(max) {
    var mag = Math.pow(10, Math.floor(Math.log10(max)));
    var steps = [1, 2, 5, 10];
    for (var i = 0; i < steps.length; i++) {
      if (max / (steps[i] * mag) <= 5) return steps[i] * mag;
    }
    return 10 * mag;
  }

  // Column with a 4px rounded data end and a square base on the baseline.
  function columnPath(x, y, w, base) {
    var r = Math.min(4, w / 2, base - y);
    return "M" + x + " " + base + "V" + (y + r) + "Q" + x + " " + y + " " + (x + r) + " " + y +
      "H" + (x + w - r) + "Q" + (x + w) + " " + y + " " + (x + w) + " " + (y + r) + "V" + base + "Z";
  }

  function drawChart(chart) {
    var heads = chart.querySelectorAll("thead th");
    var series = Array.prototype.slice.call(heads, 1).map(function (th) {
      return { name: th.textContent, color: th.getAttribute("data-color") };
    });
    var rows = Array.prototype.map.call(chart.querySelectorAll("tbody tr"), function (tr) {
      return {
        name: tr.querySelector("th").textContent,
        values: Array.prototype.map.call(tr.querySelectorAll("td"), function (td) {
          return parseFloat(td.textContent);
        })
      };
    });
    var unit = chart.getAttribute("data-unit") || "";
    var approx = chart.hasAttribute("data-approx") ? "≈" : "";
    var labelMode = chart.getAttribute("data-label");

    var W = 360, H = 250, L = 34, R = 6, T = 26, B = 42;
    var base = H - B;
    var max = 0;
    rows.forEach(function (r) { r.values.forEach(function (v) { if (v > max) max = v; }); });
    var step = niceStep(max);
    var top = Math.ceil(max / step) * step;
    var yOf = function (v) { return base - (v / top) * (base - T); };

    var legend = document.createElement("div");
    legend.className = "chart-legend";
    series.forEach(function (s) {
      var item = document.createElement("span");
      var key = document.createElement("i");
      key.style.background = s.color;
      item.appendChild(key);
      item.appendChild(document.createTextNode(s.name));
      legend.appendChild(item);
    });

    var svg = svgEl("svg", { viewBox: "0 0 " + W + " " + H, role: "group", "aria-label": chart.getAttribute("aria-label") || "" });
    chart.removeAttribute("aria-label");

    var yTitle = svgEl("text", { x: 0, y: 11, "class": "axis-text" }, svg);
    yTitle.textContent = chart.getAttribute("data-yaxis") || "";
    var xTitle = svgEl("text", { x: L + (W - L - R) / 2, y: H - 4, "text-anchor": "middle", "class": "axis-text" }, svg);
    xTitle.textContent = chart.getAttribute("data-xaxis") || "";

    for (var t = 0; t <= top; t += step) {
      svgEl("line", { x1: L, x2: W - R, y1: yOf(t), y2: yOf(t), "class": "grid" }, svg);
      var tick = svgEl("text", { x: L - 6, y: yOf(t) + 4, "text-anchor": "end", "class": "axis-text" }, svg);
      tick.textContent = t;
    }

    var tip = document.createElement("div");
    tip.className = "chart-tip";
    tip.hidden = true;

    function fill(row) {
      tip.textContent = "";
      var head = document.createElement("div");
      head.className = "tip-head";
      head.textContent = row.name;
      tip.appendChild(head);
      series.forEach(function (s, i) {
        var line = document.createElement("div");
        line.className = "tip-row";
        var key = document.createElement("i");
        key.style.background = s.color;
        var val = document.createElement("b");
        val.textContent = approx + row.values[i] + " " + unit;
        var name = document.createElement("span");
        name.textContent = s.name;
        line.appendChild(key);
        line.appendChild(val);
        line.appendChild(name);
        tip.appendChild(line);
      });
    }

    function show(row, band) {
      fill(row);
      tip.hidden = false;
      var box = chart.getBoundingClientRect();
      var rect = band.getBoundingClientRect();
      var left = rect.left + rect.width / 2 - box.left - tip.offsetWidth / 2;
      tip.style.left = Math.max(4, Math.min(left, box.width - tip.offsetWidth - 4)) + "px";
    }

    var slot = (W - L - R) / rows.length;
    var gap = 2;
    var bw = Math.min(24, (slot * 0.84 - gap * (series.length - 1)) / series.length);
    var lastSeries = series.length - 1;
    var fastest = Math.min.apply(null, rows.map(function (r) { return r.values[lastSeries]; }));

    rows.forEach(function (row, ri) {
      var x0 = L + ri * slot;
      var groupW = bw * series.length + gap * (series.length - 1);
      var bx = x0 + (slot - groupW) / 2;

      // The whole category slot is the hover and keyboard target.
      var band = svgEl("rect", {
        x: x0, y: T, width: slot, height: base - T, "class": "band", tabindex: 0, role: "img",
        "aria-label": row.name + ": " + series.map(function (s, i) {
          return s.name + " " + approx + row.values[i] + " " + unit;
        }).join(", ")
      }, svg);
      band.addEventListener("pointerenter", function () { show(row, band); });
      band.addEventListener("pointerleave", function () { tip.hidden = true; });
      band.addEventListener("focus", function () { show(row, band); });
      band.addEventListener("blur", function () { tip.hidden = true; });

      row.values.forEach(function (v, si) {
        var x = bx + si * (bw + gap);
        svgEl("path", {
          d: columnPath(x, yOf(v), bw, base), fill: series[si].color, "pointer-events": "none"
        }, svg);
        var labelled = labelMode === "all" || (labelMode === "fastest" && si === lastSeries && v === fastest);
        if (labelled) {
          var txt = svgEl("text", {
            x: x + bw / 2, y: yOf(v) - 4, "text-anchor": "middle", "class": "value-text", "pointer-events": "none"
          }, svg);
          txt.textContent = v;
        }
      });

      var cat = svgEl("text", { x: x0 + slot / 2, y: base + 15, "text-anchor": "middle", "class": "axis-text" }, svg);
      cat.textContent = row.name;
    });

    var table = chart.querySelector(".chart-table");
    chart.insertBefore(legend, table);
    chart.insertBefore(svg, table);
    chart.insertBefore(tip, table);
  }

  document.querySelectorAll(".chart").forEach(drawChart);
})();
