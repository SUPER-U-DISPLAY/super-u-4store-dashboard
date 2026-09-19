/* SUPER U 四店对比看板 · 应用层 */
(function () {
  var D = window.DATA;
  var COLORS = { rongxin: "#c0392b", superushop: "#3E7096", superudisplay: "#2e7d4f", finey: "#8a6d3b" };
  var NAMES = { rongxin: "荣欣 rongxinfixtures", superushop: "superushop 倚巍", superudisplay: "superudisplay", finey: "Finey fineystorefixture" };
  var charts = [];
  var ANNO_KEY = "su-anno-v1";
  var currentPage = "overview";

  if (window.Chart) {
    Chart.defaults.font.family = '"PingFang SC","Microsoft YaHei",sans-serif';
    Chart.defaults.font.size = 11.5;
    Chart.defaults.color = "#5b6b7c";
    Chart.defaults.animation = false; /* 数据看板不需要动画，且避免自动化截图取到未绘帧 */
  }

  /* ---------- 标注存储 ---------- */
  function loadAnno() { try { return JSON.parse(localStorage.getItem(ANNO_KEY) || "{}"); } catch (e) { return {}; } }
  function saveAnno(o) { localStorage.setItem(ANNO_KEY, JSON.stringify(o)); }
  function annoCount(pk) { var a = loadAnno()[pk] || []; return a.length; }
  function totalAnno() { var a = loadAnno(), n = 0; Object.keys(a).forEach(function (k) { n += a[k].length; }); return n; }

  /* ---------- 小工具 ---------- */
  function esc(s) { return String(s == null ? "" : s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;"); }
  function judgeBadge(j) {
    if (j === "ok") return '<span class="badge b-ok">良好</span>';
    if (j === "warn") return '<span class="badge b-warn">关注</span>';
    if (j === "bad") return '<span class="badge b-bad">落后</span>';
    return "";
  }
  function reg(c) { try { c.update("none"); } catch (e) {} charts.push(c); return c; }
  function destroyCharts() { charts.forEach(function (c) { try { c.destroy(); } catch (e) {} }); charts = []; }

  /* ---------- 侧边导航 ---------- */
  function buildNav() {
    var nav = document.getElementById("nav");
    var html = '<div class="group">总览</div>' +
      '<button class="nav-item" data-page="overview"><span class="dot" style="background:#C68E31"></span>集团总览与对比</button>' +
      '<div class="group">四家店铺</div>';
    D.meta.stores.forEach(function (k) {
      var s = D.stores[k];
      html += '<button class="nav-item" data-page="' + k + '"><span class="dot" style="background:' + s.color + '"></span>' + esc(s.short) + '</button>';
    });
    html += '<div class="group">行动</div>' +
      '<button class="nav-item" data-page="actions"><span class="dot" style="background:#c0392b"></span>集团运营调整建议</button>';
    nav.innerHTML = html;
    nav.addEventListener("click", function (e) {
      var b = e.target.closest(".nav-item");
      if (b) go(b.getAttribute("data-page"));
    });
  }
  function markNav() {
    document.querySelectorAll(".nav-item").forEach(function (b) {
      b.classList.toggle("active", b.getAttribute("data-page") === currentPage);
    });
    var cnt = totalAnno();
    document.querySelectorAll(".nav-item").forEach(function (b) {
      var c = b.querySelector(".cnt"); if (c) c.remove();
      var n = annoCount(b.getAttribute("data-page"));
      if (n > 0) { var s = document.createElement("span"); s.className = "cnt"; s.textContent = n; b.appendChild(s); }
    });
  }

  /* ---------- 路由 ---------- */
  function go(page) {
    currentPage = page;
    destroyCharts();
    var el = document.getElementById("main");
    if (page === "overview") el.innerHTML = pageOverview();
    else if (page === "actions") el.innerHTML = pageActions();
    else el.innerHTML = pageStore(page);
    el.innerHTML += annoSection(page);
    bindAnnoSection();
    renderCharts(page);
    markNav();
    document.getElementById("topTitle").textContent = pageTitle(page);
    closeSidebar();
    window.scrollTo({ top: 0 });
  }
  function pageTitle(p) {
    if (p === "overview") return "集团总览与对比";
    if (p === "actions") return "集团运营调整建议";
    return NAMES[p] || "";
  }

  /* ---------- 页面：总览 ---------- */
  function pageOverview() {
    var h = '';
    h += '<div class="card hero"><div class="k">Super U Group · Store Performance Dashboard</div>';
    h += '<h1 class="serif">四家店，同一个病人：流量都够，接不住</h1>';
    h += '<p>' + esc(D.meta.window) + '。90 天四店合计广告投入约 ¥38.1 万、合计询盘 1,116 条、稳定询盘商品合计约 52 个。四店曝光均为同行 3-4 倍，但 UV→商机率全部低于或接近同行均值——<b>集团的问题不是没流量，是接不住。</b></p></div>';

    h += '<div class="card"><h2>核心指标对比</h2><div class="sub">点击左侧栏切换查看各店完整诊断</div><div class="tbl-wrap"><table><thead><tr><th>指标</th><th class="num">荣欣</th><th class="num">superushop</th><th class="num">superudisplay</th><th class="num">Finey</th></tr></thead><tbody>';
    D.compare.table.forEach(function (r) {
      h += "<tr><td><b>" + esc(r[0]) + "</b></td>";
      for (var i = 1; i <= 4; i++) h += '<td class="num">' + esc(r[i]) + "</td>";
      h += "</tr>";
    });
    h += "</tbody></table></div>";
    h += '<div class="note">口径：各店「付费询盘/¥每询盘」为报告披露或按广告询盘折算；稳定询盘品口径为「连续 3 个月有询盘商品数」（倚巍为 ≥3 月口径，荣欣另有 ≥2 月估算 12-14 个）；「要设计」为 30 天会话中明确提出设计需求数。完整口径见各店报告附录。</div></div>';

    h += '<div class="card"><h2>四店横向四张图</h2><div class="sub">曝光/询盘/转化率/单询盘成本 · 本店数据 vs 同行参考</div><div class="chart-grid">';
    h += '<div class="canvas-holder"><h3>90 天曝光（万次）</h3><div class="chart-box"><canvas id="cExp"></canvas></div></div>';
    h += '<div class="canvas-holder"><h3>90 天询盘（条）</h3><div class="chart-box"><canvas id="cEnq"></canvas></div></div>';
    h += '<div class="canvas-holder"><h3>UV→商机率（%）— 全部低于同行均值</h3><div class="chart-box"><canvas id="cUv"></canvas></div></div>';
    h += '<div class="canvas-holder"><h3>约 ¥/付费询盘（越低越好）</h3><div class="chart-box"><canvas id="cCost"></canvas></div></div>';
    h += "</div>";
    h += '<div class="note">UV→商机率：荣欣 3.0%（报告内另有 5.8% 口径）/ superushop 4.9% / superudisplay 5.99%（均值 6.74%）/ Finey 2.99%（均值 6.52%）；同行均值参考条取 6.0% 代表值，各店对标线以其报告为准。¥/付费询盘：荣欣 198 条付费询盘、superushop 124、superudisplay 100（全站推口径）、Finey 206。</div></div>';

    h += '<div class="card"><h2>四店同病：五个集团级规律</h2><div class="sub">单店各自的问题见各店页签；以下为跨店重复出现、需要集团统一解决的</div><div class="grid2">';
    D.compare.patterns.forEach(function (p, i) {
      h += '<div class="pat"><h3>' + (i + 1) + ". " + esc(p.t) + " " + judgeBadge(p.tag) + "</h3><p>" + esc(p.d) + "</p></div>";
    });
    h += "</div>" + plain(D.compare.plain) + "</div>";

    h += '<div class="card"><h2>下一步</h2><div class="sub">集团级 P0/P1/P2 调整建议已单列一页</div>';
    h += '<ul class="tick good"><li><b>集团运营调整建议</b>：承诺台账 / 广告止血 / 时区排班 / 设计 SLA / 新品 SOP —— 见左侧「集团运营调整建议」</li>';
    h += "<li><b>单店深挖</b>：每家店的完整八章诊断结论、逐计划广告明细、子账号红黑榜、P0/P1/P2 —— 见左侧四家店铺页签</li></ul></div>";
    return h;
  }

  /* ---------- 页面：单店 ---------- */
  function pageStore(k) {
    var s = D.stores[k];
    var h = '';
    h += '<div class="card hero" style="border-top:4px solid ' + s.color + '"><div class="k">' + esc(s.company) + " · " + esc(s.login) + '</div>';
    h += '<h1 class="serif">' + esc(s.name) + '</h1>';
    h += '<p><span class="mode-chip" style="background:rgba(255,255,255,.12);border-color:rgba(255,255,255,.25);color:#fff">' + esc(s.mode) + "</span></p></div>";

    h += '<div class="card"><h2>KPI 总览</h2><div class="sub">90 天基线（2026-06-20 ~ 09-17）</div><div class="kpis">';
    s.kpis.forEach(function (x) { h += '<div class="kpi"><div class="l">' + esc(x.label) + '</div><div class="v">' + esc(x.value) + '</div><div class="n">' + esc(x.note) + "</div></div>"; });
    h += "</div></div>";

    h += '<div class="card"><h2>大盘判断</h2><p class="verdict">' + esc(s.verdict) + "</p>";
    h += '<div class="grid2" style="margin-top:14px"><div><h3 style="font-size:14px;margin-bottom:6px">▲ 三个最要紧的问题</h3><ul class="tick danger">';
    s.problems.forEach(function (p) { h += "<li>" + esc(p) + "</li>"; });
    h += '</ul></div><div><h3 style="font-size:14px;margin-bottom:6px">◆ 三个最值钱的机会</h3><ul class="tick good">';
    s.chances.forEach(function (p) { h += "<li>" + esc(p) + "</li>"; });
    h += "</ul></div></div>" + plain(s.plain) + "</div>";

    h += '<div class="card"><h2>转化漏斗 <small>vs 同行</small></h2><div class="tbl-wrap"><table><thead><tr><th>环节</th><th class="num">本店 90 天</th><th class="num">对标</th><th>判定</th><th>说明</th></tr></thead><tbody>';
    s.funnel.forEach(function (r) {
      h += "<tr><td><b>" + esc(r.label) + "</b></td><td class=\"num\"><b>" + esc(r.v) + "</b></td><td class=\"num\">" + esc(r.peer) + "</td><td>" + judgeBadge(r.judge) + "</td><td>" + esc(r.note) + "</td></tr>";
    });
    h += "</tbody></table></div></div>";

    h += '<div class="card"><h2>广告 <small>' + esc(s.ads.total) + "</small></h2><div class=\"sub\">逐计划：花费 → 询盘 → 商机成本</div><div class=\"tbl-wrap\"><table><thead><tr><th>计划</th><th class=\"num\">花费</th><th class=\"num\">询盘</th><th class=\"num\">约¥/商机</th><th>判定</th></tr></thead><tbody>";
    s.ads.plans.forEach(function (r) {
      h += "<tr><td>" + esc(r[0]) + '</td><td class="num">' + esc(r[1]) + '</td><td class="num">' + esc(r[2]) + '</td><td class="num">' + esc(r[3]) + "</td><td>" + esc(r[4]) + "</td></tr>";
    });
    h += "</tbody></table></div>";
    h += '<div class="note">总花费 ' + esc(s.ads.total) + "；" + esc(s.ads.perEnq) + "。</div>";
    h += '<p style="font-size:13px;color:#43566b;margin-top:10px">' + esc(s.ads.note) + "</p></div>";

    h += '<div class="card"><h2>询盘画像 <small>' + esc(s.enq.total) + " · " + esc(s.enq.hot) + "</small></h2>";
    h += '<div class="grid2"><div class="canvas-holder"><h3>需求 4 分型（会话数）</h3><div class="chart-box"><canvas id="cDemand"></canvas></div></div>';
    h += '<div><h3 style="font-size:13.5px;margin-bottom:8px;color:#43566b">客户画像分布</h3><div class="tbl-wrap"><table><thead><tr><th>类型</th><th class="num">会话</th><th class="num">占比</th></tr></thead><tbody>';
    s.enq.persona.forEach(function (r) { h += "<tr><td>" + esc(r[0]) + '</td><td class="num">' + esc(r[1]) + '</td><td class="num">' + esc(r[2]) + "</td></tr>"; });
    h += "</tbody></table></div></div></div>";

    h += '<h3 style="font-size:14px;margin:16px 0 8px">平台运营问题清单</h3><div class="tbl-wrap"><table><thead><tr><th>#</th><th>问题</th><th>数据证据</th><th>运营动作</th></tr></thead><tbody>';
    s.enq.issues.forEach(function (r, i) {
      h += "<tr><td>" + (i + 1) + "</td><td><b>" + esc(r[0]) + "</b></td><td>" + esc(r[1]) + "</td><td>" + esc(r[2]) + "</td></tr>";
    });
    h += "</tbody></table></div></div>";

    h += '<div class="card"><h2>子账号表现</h2><div class="tbl-wrap"><table><thead><tr><th>账号</th><th class="num">会话</th><th class="num">高意向</th><th class="num">响应</th><th>判定</th></tr></thead><tbody>';
    s.team.rows.forEach(function (r) {
      h += "<tr><td>" + esc(r[0]) + '</td><td class="num">' + esc(r[1]) + '</td><td class="num">' + esc(r[2]) + '</td><td class="num">' + esc(r[3]) + "</td><td>" + esc(r[4]) + "</td></tr>";
    });
    h += "</tbody></table></div>";
    h += '<div class="note">' + esc(s.team.note) + "</div>";
    h += '<p style="font-size:13px;color:#43566b;margin-top:10px"><b>竞品对标：</b>' + esc(s.competitor) + "</p></div>";

    h += '<div class="card"><h2>行动计划 <small>P0 两周内 / P1 本月 / P2 本季度</small></h2>';
    ["P0", "P1", "P2"].forEach(function (lv) {
      h += '<div class="plist" style="margin-bottom:14px">';
      s.actions[lv].forEach(function (a, i) {
        h += '<div class="pc ' + lv.toLowerCase() + '"><span class="tag">' + lv + "-" + (i + 1) + "</span><h3>" + esc(a.t) + "</h3>";
        h += '<div class="row"><b class="k">解决什么：</b>' + esc(a.p) + "</div>";
        h += '<div class="row"><b class="k">做什么：</b>' + esc(a.a) + "</div>";
        h += '<div class="row"><b class="k">怎么验证：</b>' + esc(a.v) + "</div></div>";
      });
      h += "</div>";
    });
    h += '<div class="note">稳定询盘商品：' + esc(JSON.stringify(s.stable).replace(/[{}"]/g, "").replace(/,/g, " · ")) + "</div></div>";
    return h;
  }

  /* ---------- 页面：集团建议 ---------- */
  function pageActions() {
    var g = D.groupActions;
    var h = '<div class="card hero"><div class="k">Group Action Plan</div><h1 class="serif">集团平台运营调整建议</h1><p>' + esc(g.intro) + "</p></div>";
    [["P0", "两周内 · 止血", "p0"], ["P1", "本月 · 建机制", "p1"], ["P2", "本季度 · 建资产", "p2"]].forEach(function (lv) {
      var key = lv[0];
      h += '<div class="card"><h2>' + key + " <small>" + esc(lv[1]) + "</small></h2><div class=\"plist\">";
      g[key].forEach(function (a, i) {
        h += '<div class="pc ' + lv[2] + '"><span class="tag">' + key + "-" + (i + 1) + "</span><h3>" + esc(a.t) + "</h3>";
        h += '<div class="row"><b class="k">为什么：</b>' + esc(a.p) + "</div>";
        h += '<div class="row"><b class="k">做什么：</b>' + esc(a.a) + "</div>";
        h += '<div class="row"><b class="k">怎么验证：</b>' + esc(a.v) + "</div></div>";
      });
      h += "</div></div>";
    });
    h += '<div class="card">' + plain(g.plain) + "</div>";
    return h;
  }

  /* ---------- 图表 ---------- */
  function renderCharts(page) {
    if (!window.Chart) return;
    if (page === "overview") {
      var c = D.compare.charts;
      var mk = function (id, labels, values, colors, unit) {
        return reg(new Chart(document.getElementById(id), {
          type: "bar",
          data: { labels: labels, datasets: [{ data: values, backgroundColor: colors, borderRadius: 6, maxBarThickness: 46 }] },
          options: {
            responsive: true, maintainAspectRatio: false,
            plugins: { legend: { display: false } },
            scales: { y: { beginAtZero: true, grid: { color: "#edf1f5" }, ticks: { callback: function (v) { return v + (unit || ""); } } }, x: { grid: { display: false } } }
          }
        }));
      };
      mk("cExp", c.exposure.labels, c.exposure.values, storeColors(), "万");
      mk("cEnq", c.enquiry.labels, c.enquiry.values, storeColors(), "");
      mk("cUv", c.uvRate.labels, c.uvRate.values, c.uvRate.values.map(function (v, i) { return i === c.uvRate.values.length - 1 ? "#9aa9b8" : storeColors()[i]; }), "%");
      mk("cCost", c.cost.labels, c.cost.values, storeColors(), "");
    }
    if (D.stores[page]) {
      var dm = D.stores[page].enq.demand;
      reg(new Chart(document.getElementById("cDemand"), {
        type: "bar",
        data: { labels: dm.map(function (r) { return r[0]; }), datasets: [{ data: dm.map(function (r) { return parseFloat(r[1]) || 0; }), backgroundColor: "#3E7096", borderRadius: 6, maxBarThickness: 22 }] },
        options: {
          indexAxis: "y", responsive: true, maintainAspectRatio: false,
          plugins: { legend: { display: false }, tooltip: { callbacks: { label: function (ctx) { return ctx.parsed.x + " 会话（" + dm[ctx.dataIndex][2] + "）"; } } } },
          scales: { x: { beginAtZero: true, grid: { color: "#edf1f5" } }, y: { grid: { display: false } } }
        }
      }));
    }
  }
  function storeColors() { return D.meta.stores.map(function (k) { return COLORS[k]; }); }

  function plain(t) { return '<div class="plain"><span class="t">🗣️ Jay大白话：</span>' + t + "</div>"; }

  /* ---------- 标注 ---------- */
  function annoSection(pageKey) {
    var a = loadAnno()[pageKey] || [];
    var h = '<div class="card" id="annoCard"><h2>本页标注 <small>' + (a.length ? a.length + " 条" : "暂无") + '</small></h2><div class="sub">标注保存在本机浏览器（localStorage）。换设备或换浏览器不共享；需要汇总时点「导出全部标注」把文件发给助理归档。</div>';
    if (!a.length) h += '<p style="font-size:13px;color:#5b6b7c">点右下角「📝 写标注」即可针对本页内容留下你的判断、待办或质疑。</p>';
    a.slice().reverse().forEach(function (it) {
      var t = new Date(it.ts);
      var time = t.toLocaleString("zh-CN", { month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit" });
      h += '<div class="anno-item"><button class="del" data-del="' + it.id + '">删除</button><div class="meta"><span class="anchor-badge">' + esc(pageTitle(pageKey)) + "</span><span>" + time + "</span></div><div class=\"body\">" + esc(it.text) + "</div></div>";
    });
    h += '<div style="margin-top:12px;display:flex;gap:10px;flex-wrap:wrap" class="noprint">';
    h += '<button id="annoOpen2" style="border:1px solid var(--line);background:#fff;border-radius:9px;padding:8px 16px;cursor:pointer;font-size:13.5px">📝 写标注</button>';
    h += '<button id="annoExport" style="border:1px solid var(--line);background:#fff;border-radius:9px;padding:8px 16px;cursor:pointer;font-size:13.5px">⬇ 导出全部标注（JSON）</button>';
    h += "</div></div>";
    return h;
  }
  function bindAnnoSection() {
    var o2 = document.getElementById("annoOpen2");
    if (o2) o2.addEventListener("click", openModal);
    var ex = document.getElementById("annoExport");
    if (ex) ex.addEventListener("click", function () {
      var blob = new Blob([JSON.stringify(loadAnno(), null, 2)], { type: "application/json" });
      var url = URL.createObjectURL(blob);
      var a = document.createElement("a");
      a.href = url; a.download = "SUPERU-标注-" + new Date().toISOString().slice(0, 10) + ".json";
      document.body.appendChild(a); a.click(); a.remove();
      setTimeout(function () { URL.revokeObjectURL(url); }, 3000);
    });
    document.querySelectorAll("[data-del]").forEach(function (b) {
      b.addEventListener("click", function () {
        var all = loadAnno();
        all[currentPage] = (all[currentPage] || []).filter(function (it) { return it.id !== b.getAttribute("data-del"); });
        saveAnno(all); go(currentPage);
      });
    });
  }
  function openModal() {
    var m = document.getElementById("modal");
    document.getElementById("annoPage").textContent = "页面：" + pageTitle(currentPage);
    document.getElementById("annoText").value = "";
    m.classList.add("open");
    setTimeout(function () { document.getElementById("annoText").focus(); }, 60);
  }
  function closeModal() { document.getElementById("modal").classList.remove("open"); }

  /* ---------- 移动端侧栏 ---------- */
  function closeSidebar() { document.getElementById("sidebar").classList.remove("open"); document.getElementById("scrim").classList.remove("show"); }

  /* ---------- init ---------- */
  document.getElementById("burger").addEventListener("click", function () {
    document.getElementById("sidebar").classList.toggle("open");
    document.getElementById("scrim").classList.toggle("show");
  });
  document.getElementById("scrim").addEventListener("click", closeSidebar);
  document.getElementById("fab").addEventListener("click", openModal);
  document.getElementById("annoCancel").addEventListener("click", closeModal);
  document.getElementById("modal").addEventListener("click", function (e) { if (e.target === this) closeModal(); });
  document.getElementById("annoSave").addEventListener("click", function () {
    var t = document.getElementById("annoText").value.trim();
    if (!t) { closeModal(); return; }
    var all = loadAnno();
    if (!all[currentPage]) all[currentPage] = [];
    all[currentPage].push({ id: Date.now().toString(36) + Math.random().toString(36).slice(2, 6), ts: Date.now(), text: t });
    saveAnno(all); closeModal(); go(currentPage);
  });
  document.addEventListener("keydown", function (e) { if (e.key === "Escape") closeModal(); });

  buildNav();
  go("overview");
})();

