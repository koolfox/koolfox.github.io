// ---------- RNG با بذر ثابت ----------
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

// ---------- شبیه‌سازی فرآیند مهره‌ها ----------
// X_n = تعداد مهره‌های سیاه بعد از گام n
// a = سیاه اولیه، b = قرمز (ثابت)، steps = تعداد گام‌ها

function simulateBalls(a, b, steps, seed) {
    const rng = makeRng(seed);

    let black = a;          // X_0
    const path = [black];   // X_0, X_1, ..., X_steps
    const history = [];     // جزئیات هر گام

    for (let n = 1; n <= steps; n++) {
        const total = black + b;
        const u = rng();

        let color;      // "سیاه" یا "قرمز"
        let blackNext;

        if (u < black / total) {
            // مهره‌ی سیاه انتخاب شد → همان را برمی‌گردانیم + یک مهره‌ی سیاه جدید
            color = "سیاه";
            blackNext = black + 1;
        } else {
            // مهره‌ی قرمز انتخاب شد → فقط همان را برمی‌گردانیم
            color = "قرمز";
            blackNext = black;
        }

        history.push({
            step: n,                // گام n
            black_before: black,    // X_{n-1}
            red: b,
            color,
            black_after: blackNext  // X_n
        });

        black = blackNext;
        path.push(blackNext);
    }

    return { path, history, a, b };
}

// ---------- بوم ۲بعدی برای نمایش نقاط ----------

let canvas, ctx;
let canvasWidth = 0;
let canvasHeight = 0;

function initCanvas() {
    const container = document.getElementById("three-container");
    const width = container.clientWidth;
    const height = container.clientHeight;

    canvas = document.createElement("canvas");
    canvasWidth = width;
    canvasHeight = height;
    canvas.width = width * (window.devicePixelRatio || 1);
    canvas.height = height * (window.devicePixelRatio || 1);
    canvas.style.width = width + "px";
    canvas.style.height = height + "px";

    ctx = canvas.getContext("2d");
    ctx.scale(window.devicePixelRatio || 1, window.devicePixelRatio || 1);

    container.innerHTML = "";
    container.appendChild(canvas);

    window.addEventListener("resize", handleResize);
}

function handleResize() {
    const container = document.getElementById("three-container");
    const width = container.clientWidth;
    const height = container.clientHeight;
    if (!width || !height) return;

    canvasWidth = width;
    canvasHeight = height;
    canvas.width = width * (window.devicePixelRatio || 1);
    canvas.height = height * (window.devicePixelRatio || 1);
    canvas.style.width = width + "px";
    canvas.style.height = height + "px";
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.scale(window.devicePixelRatio || 1, window.devicePixelRatio || 1);

    // بعد از ریسایز، آخرین حالت را دوباره رسم کنیم
    if (currentSim) {
        drawState(lastStepIndex, currentSim);
    }
}

// رسم وضعیت گام stepIndex روی بوم
function drawState(stepIndex, sim) {
    if (!ctx || !sim) return;

    const { history, a, b } = sim;

    // محاسبه تعداد سیاه و قرمز در این گام
    let blackCount;
    if (stepIndex === 0) {
        blackCount = a;
    } else {
        blackCount = history[stepIndex - 1].black_after;
    }
    const redCount = b;
    const total = blackCount + redCount;

    ctx.clearRect(0, 0, canvasWidth, canvasHeight);

    // اگر هیچ مهره‌ای نیست، فقط قاب را نشان بده
    const size = Math.min(canvasWidth, canvasHeight) * 0.8;
    const cx = canvasWidth / 2;
    const cy = canvasHeight / 2;
    const x0 = cx - size / 2;
    const y0 = cy - size / 2;

    // قاب جعبه
    ctx.lineWidth = 1.2;
    ctx.strokeStyle = "#9ca3af";
    ctx.strokeRect(x0, y0, size, size);

    if (total === 0) return;

    // چیدمان نقطه‌ها روی grid
    const gridSide = Math.ceil(Math.sqrt(total));
    const cell = size / (gridSide + 1);
    const radius = Math.max(2, Math.min(8, cell * 0.3));

    // کمک: تابع رسم یک نقطه
    function drawDot(x, y, color) {
        ctx.beginPath();
        ctx.arc(x, y, radius, 0, Math.PI * 2);
        ctx.fillStyle = color;
        ctx.fill();
    }

    let index = 0;

    // اول سیاه‌ها (از بالا-چپ شروع)
    for (let i = 0; i < blackCount; i++) {
        const row = Math.floor(index / gridSide);
        const col = index % gridSide;
        const px = x0 + cell * (col + 1);
        const py = y0 + cell * (row + 1);
        drawDot(px, py, "#111827");
        index++;
    }

    // بعد قرمزها
    for (let j = 0; j < redCount; j++) {
        const row = Math.floor(index / gridSide);
        const col = index % gridSide;
        const px = x0 + cell * (col + 1);
        const py = y0 + cell * (row + 1);
        drawDot(px, py, "#dc2626");
        index++;
    }
}

// ---------- جزئیات گام و فرمول‌ها ----------

let currentSim = null;
let autoPlayTimer = null;
let globalSlider = null;
let lastStepIndex = 0;

function updateDetails(stepIndex) {
    const label = document.getElementById("step-label");
    const dBlackBefore = document.getElementById("detail-black-before");
    const dRed = document.getElementById("detail-red");
    const dColor = document.getElementById("detail-color");
    const dBlackAfter = document.getElementById("detail-black-after");
    const eqProbs = document.getElementById("eq-probs");
    const eqUpdate = document.getElementById("eq-update");

    lastStepIndex = stepIndex;

    if (!currentSim) {
        label.textContent = "گام ۰";
        dBlackBefore.textContent = dRed.textContent =
            dColor.textContent = dBlackAfter.textContent = "–";
        eqProbs.textContent = "–";
        eqUpdate.textContent = "–";
        return;
    }

    const { history, a, b } = currentSim;
    const steps = history.length;

    const s = Math.max(0, Math.min(steps, stepIndex));
    label.textContent = "گام " + s;

    if (s === 0) {
        const k = a;
        dBlackBefore.textContent = k;
        dRed.textContent = b;
        dColor.textContent = "–";
        dBlackAfter.textContent = k;

        const pBlack = (k / (k + b)).toFixed(3);
        const pRed = (b / (k + b)).toFixed(3);

        eqProbs.textContent =
            `برای X₀ = ${k}:  P(سیاه) = ${pBlack}  ،  P(قرمز) = ${pRed}`;
        eqUpdate.textContent =
            `X₁ = X₀ + 1 با احتمال ${pBlack} ،  و X₁ = X₀ با احتمال ${pRed}`;

        drawState(0, currentSim);
        return;
    }

    const h = history[s - 1];
    const k = h.black_before;
    const pBlack = (k / (k + b)).toFixed(3);
    const pRed = (b / (k + b)).toFixed(3);

    dBlackBefore.textContent = h.black_before;
    dRed.textContent = h.red;
    dColor.textContent = h.color;
    dBlackAfter.textContent = h.black_after;

    eqProbs.textContent =
        `برای X_${s - 1} = ${k}:  P(سیاه) = ${pBlack}  ،  P(قرمز) = ${pRed}`;

    if (h.color === "سیاه") {
        eqUpdate.textContent =
            `X_${s} = X_${s - 1} + 1 = ${k} + 1 = ${h.black_after}`;
    } else {
        eqUpdate.textContent =
            `X_${s} = X_${s - 1} = ${k} (چون مهره‌ی قرمز انتخاب شد)`;
    }

    drawState(s, currentSim);
}

// ---------- خواندن پارامترها از فرم ----------

function getFormParams() {
    const a = Math.max(
        1,
        parseInt(document.getElementById("a").value || "3", 10)
    );
    const b = Math.max(
        1,
        parseInt(document.getElementById("b").value || "5", 10)
    );
    const steps = Math.max(
        5,
        Math.min(300, parseInt(document.getElementById("steps").value || "10", 10))
    );
    const seed = Math.max(
        1,
        parseInt(document.getElementById("seed").value || "1", 10)
    );

    document.getElementById("a").value = String(a);
    document.getElementById("b").value = String(b);
    document.getElementById("steps").value = String(steps);
    document.getElementById("seed").value = String(seed);

    return { a, b, steps, seed };
}

// ---------- پخش خودکار روی گام‌ها ----------

function startAutoPlay(steps) {
    if (!globalSlider || !currentSim) return;

    if (autoPlayTimer !== null) {
        clearInterval(autoPlayTimer);
        autoPlayTimer = null;
    }

    let current = 0;
    globalSlider.value = "0";
    updateDetails(0);

    autoPlayTimer = setInterval(() => {
        if (current > steps) {
            clearInterval(autoPlayTimer);
            autoPlayTimer = null;
            return;
        }
        globalSlider.value = String(current);
        updateDetails(current);
        current++;
    }, 500);
}

// ---------- راه‌اندازی اولیه ----------

document.addEventListener("DOMContentLoaded", () => {
    initCanvas();

    const form = document.getElementById("control-form");
    const slider = document.getElementById("stepSlider");
    const randomSeedBtn = document.getElementById("random-seed-btn");
    globalSlider = slider;

    form.addEventListener("submit", (evt) => {
        evt.preventDefault();
        const params = getFormParams();

        slider.min = "0";
        slider.max = String(params.steps);
        slider.value = "0";

        const sim = simulateBalls(
            params.a,
            params.b,
            params.steps,
            params.seed
        );
        currentSim = sim;

        updateDetails(0);
        startAutoPlay(params.steps);
    });

    slider.addEventListener("input", (evt) => {
        const s = parseInt(evt.target.value, 10);
        updateDetails(s);
    });

    randomSeedBtn.addEventListener("click", () => {
        const newSeed = Math.floor(Math.random() * 1_000_000) + 1;
        document.getElementById("seed").value = String(newSeed);
    });

    // اجرای اولیه با پارامترهای پیش‌فرض
    form.dispatchEvent(new Event("submit"));
});
