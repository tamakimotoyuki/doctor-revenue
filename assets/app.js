// 医師別診療報酬 Webアプリ
const BRAND = "#0068c4";
const ACCENT = "#5BA640";
const TOP_N = 16;
const MONTH_LABELS = ["4月","5月","6月","7月","8月","9月","10月","11月","12月","1月","2月","3月"];

const state = {
  data: null,
  facility: null,
  fy: null,
  mode: "monthly",
  overallChart: null,
  byDoctorChart: null,
  cardCharts: [],
};

// 16色カテゴリカルパレット（区別しやすい色）
const PALETTE = [
  "#0068c4","#5BA640","#e8743b","#9467bd","#d62728","#17becf",
  "#bcbd22","#8c564b","#e377c2","#1f77b4","#2ca02c","#ff7f0e",
  "#7f7f7f","#aec7e8","#98df8a","#c49c94"
];

function cumulative(arr) {
  let s = 0;
  return arr.map(v => (s += (v || 0)));
}

function fmtYen(v) {
  if (v == null) return "—";
  if (v >= 1e8) return `¥${(v/1e8).toFixed(2)}億`;
  if (v >= 1e4) return `¥${Math.round(v/1e4).toLocaleString()}万`;
  return `¥${Math.round(v).toLocaleString()}`;
}

async function loadData() {
  const res = await fetch("data/doctors.json");
  state.data = await res.json();
}

function setupFacilityTabs() {
  const facilities = Object.keys(state.data.facilities);
  state.facility = facilities[0];
  const el = document.getElementById("facilityTabs");
  el.innerHTML = "";
  facilities.forEach(f => {
    const t = document.createElement("div");
    t.className = "tab" + (f === state.facility ? " active" : "");
    t.textContent = f;
    t.onclick = () => { state.facility = f; setupYearTabs(); render(); el.querySelectorAll(".tab").forEach(x => x.classList.toggle("active", x.textContent === f)); };
    el.appendChild(t);
  });
}

function setupYearTabs() {
  const years = Object.keys(state.data.facilities[state.facility].years).sort().reverse();
  state.fy = years[0];
  const el = document.getElementById("yearTabs");
  el.innerHTML = "";
  years.forEach(y => {
    const t = document.createElement("div");
    t.className = "tab" + (y === state.fy ? " active" : "");
    t.textContent = `${y}年度`;
    t.onclick = () => {
      state.fy = y;
      renderByDoctor();
      renderGrid();
      el.querySelectorAll(".tab").forEach(x => x.classList.toggle("active", x.textContent === `${y}年度`));
    };
    el.appendChild(t);
  });
}

function setupModeToggle() {
  document.querySelectorAll('input[name="mode"]').forEach(r => {
    r.onchange = (e) => { state.mode = e.target.value; renderOverall(); renderByDoctor(); renderGrid(); };
  });
}

function getRankedDoctors() {
  const doctors = state.data.facilities[state.facility].years[state.fy] || {};
  return Object.entries(doctors)
    .map(([name, vals]) => ({ name, vals, total: vals.reduce((a,b) => a+(b||0), 0) }))
    .filter(d => d.total > 0)
    .sort((a, b) => b.total - a.total);
}

function renderByDoctor() {
  const ranked = getRankedDoctors().slice(0, TOP_N);
  const ctx = document.getElementById("byDoctorChart").getContext("2d");
  if (state.byDoctorChart) state.byDoctorChart.destroy();
  document.getElementById("byDocTitle").textContent =
    `医師別売上推移（${state.fy}年度・上位${ranked.length}名重ね・${state.mode === "cumulative" ? "累計" : "単月"}・凡例クリックで個別ON/OFF）`;
  state.byDoctorChart = new Chart(ctx, {
    type: "line",
    data: {
      labels: MONTH_LABELS,
      datasets: ranked.map((d, i) => ({
        label: d.name,
        data: state.mode === "cumulative" ? cumulative(d.vals) : d.vals,
        borderColor: PALETTE[i % PALETTE.length],
        backgroundColor: PALETTE[i % PALETTE.length] + "22",
        fill: false,
        tension: 0.2,
        pointRadius: 2,
        borderWidth: 2,
      }))
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      interaction: { mode: "nearest", intersect: false },
      plugins: {
        legend: {
          position: "right",
          labels: { font: { size: 11 }, boxWidth: 12, padding: 6 },
        },
        tooltip: {
          callbacks: { label: (ctx) => `${ctx.dataset.label}: ${fmtYen(ctx.parsed.y)}` },
        },
      },
      scales: {
        x: { ticks: { font: { size: 10 } } },
        y: { ticks: { callback: (v) => fmtYen(v), font: { size: 10 } }, beginAtZero: true },
      }
    }
  });
}

function getFiscalYearsSorted() {
  return Object.keys(state.data.facilities[state.facility].years).sort();
}

function yearColor(idx, total) {
  // 古い年度=薄い青→新しい年度=濃い緑 のグラデーション
  // 試算表アプリ風: 年度を視覚的に並べる
  const t = total <= 1 ? 1 : idx / (total - 1);
  // 補間: #aec7e8 (薄青) → #0068c4 (BRAND) → #5BA640 (ACCENT 濃緑)
  const stops = [
    [174, 199, 232],
    [0, 104, 196],
    [91, 166, 64],
  ];
  const seg = t * (stops.length - 1);
  const i = Math.floor(seg);
  const f = seg - i;
  const a = stops[i];
  const b = stops[Math.min(i + 1, stops.length - 1)];
  const r = Math.round(a[0] + (b[0] - a[0]) * f);
  const g = Math.round(a[1] + (b[1] - a[1]) * f);
  const bl = Math.round(a[2] + (b[2] - a[2]) * f);
  return `rgb(${r},${g},${bl})`;
}

function renderOverall() {
  // 試算表アプリ方式: X=4-3月、各年度を別シリーズの並列棒グラフ
  // 新しい年度ほど濃い色（左→右に古い順で配置・凡例は新しい順）
  const fdata = state.data.facilities[state.facility];
  const years = getFiscalYearsSorted();  // 古→新
  const total = years.length;
  const datasets = years.slice().reverse().map((fy, revIdx) => {
    // revIdx=0が最新年度。色はnewest=濃、oldest=薄
    const doctors = fdata.years[fy] || {};
    const monthSums = new Array(12).fill(0);
    Object.values(doctors).forEach(arr => {
      arr.forEach((v, i) => monthSums[i] += (v || 0));
    });
    const series = state.mode === "cumulative" ? cumulative(monthSums) : monthSums;
    // 色: revIdx=0(最新)→濃紺、revIdx=total-1(最古)→薄水色
    const t = total <= 1 ? 0 : revIdx / (total - 1);
    const r = Math.round(20 + (174 - 20) * t);
    const g = Math.round(60 + (199 - 60) * t);
    const b = Math.round(140 + (232 - 140) * t);
    const color = `rgb(${r},${g},${b})`;
    return {
      label: `${fy}年度`,
      data: series,
      backgroundColor: color,
      borderColor: color,
      borderWidth: 0,
    };
  });

  const ctx = document.getElementById("overallChart").getContext("2d");
  if (state.overallChart) state.overallChart.destroy();
  state.overallChart = new Chart(ctx, {
    type: "bar",
    data: { labels: MONTH_LABELS, datasets },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      animation: false,
      plugins: {
        legend: {
          position: "bottom",
          labels: { font: { size: 11 }, boxWidth: 14, padding: 6 },
        },
        tooltip: {
          callbacks: { label: (ctx) => `${ctx.dataset.label}: ${fmtYen(ctx.parsed.y)}` },
        },
      },
      scales: {
        x: { ticks: { font: { size: 11 } } },
        y: { ticks: { callback: (v) => fmtYen(v), font: { size: 10 } }, beginAtZero: true },
      }
    }
  });
}

function renderGrid() {
  const ranked = getRankedDoctors();

  document.getElementById("gridTitle").textContent =
    `医師別（${state.fy}年度・在籍${ranked.length}名中 上位${Math.min(TOP_N, ranked.length)}名・${state.mode === "cumulative" ? "累計" : "単月"}）`;

  // 既存チャート破棄
  state.cardCharts.forEach(c => c.destroy());
  state.cardCharts = [];

  const gridEl = document.getElementById("grid");
  gridEl.innerHTML = "";

  const top = ranked.slice(0, TOP_N);
  if (top.length === 0) {
    gridEl.innerHTML = '<div class="empty">この年度の在籍医師データがありません</div>';
    return;
  }

  top.forEach(d => {
    const card = document.createElement("div");
    card.className = "card";
    const monthsActive = d.vals.filter(v => v > 0).length;
    const avg = monthsActive > 0 ? d.total / monthsActive : 0;
    card.innerHTML = `
      <div class="name">${d.name}</div>
      <div class="stat">年計 ${fmtYen(d.total)} ／ 稼働月平均 ${fmtYen(avg)}（${monthsActive}ヶ月）</div>
      <canvas></canvas>
    `;
    gridEl.appendChild(card);
    const canvas = card.querySelector("canvas");
    const series = state.mode === "cumulative" ? cumulative(d.vals) : d.vals;
    const chart = new Chart(canvas.getContext("2d"), {
      type: "line",
      data: {
        labels: MONTH_LABELS,
        datasets: [{
          data: series,
          borderColor: ACCENT,
          backgroundColor: ACCENT + "33",
          fill: state.mode === "cumulative",
          tension: 0.25,
          pointRadius: 2,
          borderWidth: 1.5,
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: false },
          tooltip: { callbacks: { label: (ctx) => `${MONTH_LABELS[ctx.dataIndex]}: ${fmtYen(ctx.parsed.y)}` } },
        },
        scales: {
          x: { ticks: { font: { size: 9 }, maxRotation: 0 } },
          y: { ticks: { callback: (v) => fmtYen(v), font: { size: 9 }, maxTicksLimit: 4 }, beginAtZero: true },
        }
      }
    });
    state.cardCharts.push(chart);
  });
}

function render() {
  renderOverall();
  renderByDoctor();
  renderGrid();
}

(async () => {
  await loadData();
  document.getElementById("meta").textContent = `データ生成: ${state.data.generated_at}`;
  setupFacilityTabs();
  setupYearTabs();
  setupModeToggle();
  render();
})();
