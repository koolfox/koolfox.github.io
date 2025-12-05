// ---------- مولد اعداد تصادفی با بذر ثابت و نمونه‌گیری گسسته ----------

function makeRng(seed) {
    let a = seed >>> 0;
    return function () {
        a |= 0;
        a = (a + 0x6D2B79F5) | 0;
        let t = Math.imul(a ^ (a >>> 15), 1 | a);
        t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
}

function sampleFromPmf(pmf, rng) {
    const u = rng();
    let c = 0;
    for (let i = 0; i < pmf.length; i++) {
        c += pmf[i];
        if (u <= c) return i;
    }
    return pmf.length - 1;
}

function parsePmf(str) {
    const parts = str
        .split(/[, ]+/)
        .map((s) => s.trim())
        .filter((s) => s.length > 0);

    const vals = parts
        .map((s) => parseFloat(s))
        .filter((x) => !Number.isNaN(x) && x >= 0);

    if (vals.length === 0) return [1];
    const sum = vals.reduce((acc, v) => acc + v, 0);
    if (sum <= 0) return [1];
    return vals.map((v) => v / sum);
}

// ---------- شبیه‌سازی سیاست (b,B) ----------

function simulateInventoryPath(x0, weeks, B, b, pmf, seed) {
    const rng = makeRng(seed);
    let x = x0;
    const path = [x0];     // X_0 در زمان ۰
    const history = [];

    for (let week = 1; week <= weeks; week++) {
        let order, startInv, branchType;

        // سیاست (b,B) در ابتدای هفته‌ی 'week':
        if (x < b) {
            branchType = "below-b"; // زیر b
            order = B - x;          // مقدار سفارش = B - X_n
            startInv = B;           // بعد از سفارش، موجودی = B
        } else {
            branchType = "above-b"; // برابر یا بالای b
            order = 0;
            startInv = x;           // بدون سفارش، شروع از X_{week-1}
        }

        // تقاضای Y_week با توزیع گسسته‌ی pmf
        const demand = sampleFromPmf(pmf, rng);

        // موجودی پایان هفته: X_week = max(startInv - demand, 0)
        const xNext = Math.max(startInv - demand, 0);

        history.push({
            week,        // شماره هفته (۱..weeks)
            x_prev: x,   // X_{week-1}
            start: startInv,  // موجودی ابتدای هفته بعد از سفارش
            order,
            demand,
            end: xNext,  // X_week
            branchType,
        });

        x = xNext;
        path.push(xNext);
    }

    return { path, history };
}

// ---------- تنظیم نمودار Chart.js ----------

let inventoryChart = null;
let currentSim = null;
let autoPlayTimer = null;
let globalSlider = null;

function createChart() {
    const ctx = document.getElementById("inventoryChart").getContext("2d");
    inventoryChart = new Chart(ctx, {
        type: "line",
        data: {
            datasets: [
                {
                    label: "موجودی (Xₙ)",
                    data: [],
                    stepped: true,
                    borderColor: "#2563eb",
                    borderWidth: 2,
                    pointRadius: 0,
                    tension: 0,
                },
                {
                    label: "سفارش‌ها (تکمیل تا B)",
                    data: [],
                    type: "scatter",
                    backgroundColor: "#fb923c",
                    borderColor: "#fb923c",
                    pointRadius: 5,
                },
                {
                    label: "نقطه‌نما",
                    data: [],
                    type: "scatter",
                    backgroundColor: "#111827",
                    borderColor: "#111827",
                    pointRadius: 5,
                    showLine: false,
                },
                {
                    label: "آستانه سفارش مجدد b",
                    data: [],
                    borderColor: "#d41515ff",
                    borderWidth: 1.5,
                    pointRadius: 0,
                    borderDash: [6, 4],
                },
            ],
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            parsing: false,
            scales: {
                x: {
                    type: "linear",
                    position: "bottom",
                    title: {
                        display: true,
                        text: "اندیس هفته (زمان n)",
                        color: "#6b7280",
                    },
                    ticks: {
                        color: "#6b7280",
                        stepSize: 1,
                    },
                    grid: {
                        color: "rgba(209, 213, 219, 0.6)",
                    },
                },
                y: {
                    title: {
                        display: true,
                        text: "موجودی",
                        color: "#6b7280",
                    },
                    ticks: {
                        color: "#6b7280",
                        stepSize: 1,
                        autoSkip: false,
                    },
                    grid: {
                        color: "rgba(209, 213, 219, 0.6)",
                    },
                },
            },
            plugins: {
                legend: {
                    labels: {
                        color: "#4b5563",
                    },
                },
            },
        },
    });
}

function updateChart(sim, params) {
    const { path, history } = sim;
    const weeks = history.length;
    const b = params.b;

    // X_n در زمان n (n = 0..weeks)
    const invData = path.map((y, i) => ({ x: i, y }));

    // نقاط سفارش در ابتدای هفته: x = week-1, y = startInv
    const orderData = history
        .filter((h) => h.order > 0)
        .map((h) => ({ x: h.week - 1, y: h.start }));

    // نقطه‌نمای اولیه: ابتدای هفته‌ی ۱ (زمان ۰)
    const pointerData = history.length > 0
        ? [{ x: 0, y: history[0].start }]
        : [];

    // خط آستانه‌ی b برای بازه‌ی [0, weeks]
    const reorderLineData = [
        { x: 0, y: b },
        { x: weeks, y: b },
    ];

    inventoryChart.data.datasets[0].data = invData;
    inventoryChart.data.datasets[1].data = orderData;
    inventoryChart.data.datasets[2].data = pointerData;
    inventoryChart.data.datasets[3].data = reorderLineData;

    const maxY = Math.max(...path, params.B) * 1.2 + 2;
    inventoryChart.options.scales.x.min = 0;
    inventoryChart.options.scales.x.max = weeks;
    inventoryChart.options.scales.y.min = 0;
    inventoryChart.options.scales.y.max = maxY;

    inventoryChart.update();
}

// ---------- رابط کاربری: جزئیات هفته و توضیح رابطه ----------

function updateDetails(weekIndex) {
    const label = document.getElementById("week-label");
    const dStart = document.getElementById("detail-start");
    const dOrder = document.getElementById("detail-order");
    const dDemand = document.getElementById("detail-demand");
    const dEnd = document.getElementById("detail-end");
    const eqBranch = document.getElementById("eq-branch");
    const eqEval = document.getElementById("eq-eval");

    if (!currentSim) {
        label.textContent = "هفته ۱";
        dStart.textContent = dOrder.textContent =
            dDemand.textContent = dEnd.textContent = "–";
        eqBranch.textContent = "–";
        eqEval.textContent = "–";
        return;
    }

    const { history } = currentSim;
    const weeks = history.length;
    const w = Math.max(1, Math.min(weeks, weekIndex));

    const h = history[w - 1];
    const xprev = h.x_prev;
    const startInv = h.start;
    const order = h.order;
    const demand = h.demand;
    const end = h.end;

    label.textContent = "هفته " + w;

    // نقطه‌نما ابتدای هفته‌ی w: زمان = w-1، مقدار = startInv
    inventoryChart.data.datasets[2].data = [{ x: w - 1, y: startInv }];
    inventoryChart.update("none");

    dStart.textContent = startInv;
    dOrder.textContent = order;
    dDemand.textContent = demand;
    dEnd.textContent = end;

    if (h.branchType === "above-b") {
        eqBranch.textContent =
            `X_${w} = max(X_${w - 1} - Y_${w}, 0)` +
            ` (چون X_${w - 1} = ${xprev} >= b است)`;
        eqEval.textContent =
            `X_${w} = max(${xprev} - ${demand}, 0) = max(${xprev - demand}, 0) = ${end}`;
    } else {
        eqBranch.textContent =
            `X_${w} = max(B - Y_${w}, 0)` +
            ` (چون X_${w - 1} = ${xprev} < b است، پس از B = ${startInv} شروع می‌کنیم)`;
        eqEval.textContent =
            `X_${w} = max(${startInv} - ${demand}, 0) = max(${startInv - demand}, 0) = ${end}`;
    }
}

function getFormParams() {
    const weeks = Math.max(
        5,
        Math.min(200, parseInt(document.getElementById("weeks").value || "52", 10))
    );
    const B = Math.max(
        1,
        parseInt(document.getElementById("B").value || "10", 10)
    );
    let b = Math.max(
        0,
        parseInt(document.getElementById("b").value || "4", 10)
    );
    const x0raw = Math.max(
        0,
        parseInt(document.getElementById("x0").value || "5", 10)
    );
    // در مدل تئوری، فضای حالت ۰ تا B است؛ X_0 را به B محدود می‌کنیم
    let x0 = Math.min(x0raw, B);
    if (x0 !== x0raw) {
        document.getElementById("x0").value = String(x0);
    }

    const pmfStr = document.getElementById("pmf").value || "";
    const pmf = parsePmf(pmfStr);

    let seed = Math.max(
        1,
        parseInt(document.getElementById("seed").value || "1", 10)
    );

    if (b > B) {
        b = B;
        document.getElementById("b").value = String(b);
    }

    return { weeks, B, b, x0, pmf, seed };
}

function startAutoPlay(weeks) {
    if (!globalSlider || !currentSim) return;

    if (autoPlayTimer !== null) {
        clearInterval(autoPlayTimer);
        autoPlayTimer = null;
    }

    let current = 1;
    globalSlider.value = "1";
    updateDetails(1);

    autoPlayTimer = setInterval(() => {
        if (current > weeks) {
            clearInterval(autoPlayTimer);
            autoPlayTimer = null;
            return;
        }
        globalSlider.value = String(current);
        updateDetails(current);
        current++;
    }, 400);
}

document.addEventListener("DOMContentLoaded", () => {
    // تنظیم فونت پیش‌فرض برای همه‌ی نمودارهای Chart.js
    if (window.Chart) {
        Chart.defaults.font.family =
            'arad, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif';
    }

    createChart();

    const form = document.getElementById("control-form");
    const slider = document.getElementById("weekSlider");
    const randomSeedBtn = document.getElementById("random-seed-btn");
    globalSlider = slider;

    form.addEventListener("submit", (evt) => {
        evt.preventDefault();
        const params = getFormParams();

        slider.min = "1";
        slider.max = String(params.weeks);
        slider.value = "1";

        const sim = simulateInventoryPath(
            params.x0,
            params.weeks,
            params.B,
            params.b,
            params.pmf,
            params.seed
        );
        currentSim = sim;
        updateChart(sim, params);
        updateDetails(1);

        startAutoPlay(params.weeks);
    });

    slider.addEventListener("input", (evt) => {
        const w = parseInt(evt.target.value, 10);
        updateDetails(w);
    });

    randomSeedBtn.addEventListener("click", () => {
        const newSeed = Math.floor(Math.random() * 1_000_000) + 1;
        document.getElementById("seed").value = String(newSeed);
    });

    // اجرای اولیه با پارامترهای پیش‌فرض
    form.dispatchEvent(new Event("submit"));
});
