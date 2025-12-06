// ---------- توابع کمکی برای خواندن و بررسی والدها ----------

// تبدیل رشتهٔ ورودی به آرایهٔ ژن‌ها
function parseChromosome(raw) {
    return raw
        .split(/[\s,]+/)
        .map((s) => s.trim())
        .filter((s) => s.length > 0);
}

function hasDuplicates(arr) {
    return new Set(arr).size !== arr.length;
}

// بررسی اینکه دو آرایه جایگشت یک چندمجموعه باشند
function sameMultiset(a, b) {
    if (a.length !== b.length) return false;
    const map = new Map();
    for (const x of a) {
        map.set(x, (map.get(x) || 0) + 1);
    }
    for (const y of b) {
        if (!map.has(y)) return false;
        map.set(y, map.get(y) - 1);
        if (map.get(y) < 0) return false;
    }
    return true;
}

// ---------- هسته‌ی PMX با ثبت فریم‌ها (برای اسلایدر) ----------
//
// هر فریم شامل:
//   - وضعیت child1 و child2
//   - توضیح متنی
//   - اندیس‌های فوکوس (برای هایلایت روی کروموزوم و جدول نگاشت)

function runPmxWithFrames(parent1, parent2, cut1, cut2) {
    const n = parent1.length;
    const child1 = new Array(n).fill(null);
    const child2 = new Array(n).fill(null);
    const frames = [];

    // جدول نگاشت روی بازه‌ی [cut1..cut2]
    const mapping = [];
    for (let i = cut1; i <= cut2; i++) {
        mapping.push({
            index: i,           // اندیس ۰-مبنایی
            p1Gene: parent1[i],
            p2Gene: parent2[i],
        });
    }

    function snapshot(description, focus = {}) {
        frames.push({
            description,
            focus,
            child1: child1.slice(),
            child2: child2.slice(),
        });
    }

    snapshot("در ابتدا هر دو فرزند کاملاً خالی هستند.", {});

    // ۱) کپی بخش میانی در هر دو فرزند
    for (let i = cut1; i <= cut2; i++) {
        child1[i] = parent1[i];
        child2[i] = parent2[i];
    }

    snapshot(
        `بازهٔ [${cut1 + 1} تا ${cut2 + 1}] از والد ۱ به فرزند ۱، و از والد ۲ به فرزند ۲ کپی می‌شود.`,
        {}
    );

    // ---------- ساخت فرزند ۱ (نگاشت والد ۲ → والد ۱) ----------
    for (let i = cut1; i <= cut2; i++) {
        const g = parent2[i];

        if (child1.includes(g)) {
            snapshot(
                `فرزند ۱: ژن ${g} در جایگاه ${i + 1} والد ۲، قبلاً در بخش میانیِ فرزند ۱ وجود دارد → نادیده می‌گیریم.`,
                { p2Index: i }
            );
            continue;
        }

        snapshot(
            `فرزند ۱: شروعِ جای‌گذاری ژن ${g} (آمده از جایگاه ${i + 1} در والد ۲).`,
            { p2Index: i }
        );

        let pos = i;
        let safety = 0;

        while (child1[pos] !== null) {
            const mappingGene = parent1[pos];
            const nextPos = parent2.indexOf(mappingGene);

            snapshot(
                `فرزند ۱: جایگاه ${pos + 1} پر است. `
                + `در همین اندیس، والد ۱ ژن ${mappingGene} را دارد؛ `
                + `همین ژن در والد ۲ در جایگاه ${nextPos + 1} قرار دارد → به آن اندیس می‌رویم.`,
                { p1Index: pos, p2Index: nextPos }
            );

            pos = nextPos;
            if (++safety > n + 2) break;  // محافظ در برابر حلقهٔ بی‌نهایت
        }

        child1[pos] = g;
        snapshot(
            `فرزند ۱: جایگاه خالی ${pos + 1} پیدا شد. ژن ${g} را این‌جا قرار می‌دهیم.`,
            { c1Index: pos }
        );
    }

    // پرکردن خانه‌های خالی فرزند ۱ با والد ۲
    let filled1 = false;
    for (let i = 0; i < n; i++) {
        if (child1[i] === null) {
            child1[i] = parent2[i];
            filled1 = true;
        }
    }
    if (filled1) {
        snapshot(
            "فرزند ۱: همهٔ خانه‌های خالی باقی‌مانده با ژن متناظر از والد ۲ پر می‌شوند.",
            {}
        );
    }

    // ---------- ساخت فرزند ۲ (نگاشت والد ۱ → والد ۲) ----------
    for (let i = cut1; i <= cut2; i++) {
        const g = parent1[i];

        if (child2.includes(g)) {
            snapshot(
                `فرزند ۲: ژن ${g} در جایگاه ${i + 1} والد ۱، قبلاً در بخش میانیِ فرزند ۲ وجود دارد → نادیده می‌گیریم.`,
                { p1Index: i }
            );
            continue;
        }

        snapshot(
            `فرزند ۲: شروعِ جای‌گذاری ژن ${g} (آمده از جایگاه ${i + 1} در والد ۱).`,
            { p1Index: i }
        );

        let pos = i;
        let safety = 0;

        while (child2[pos] !== null) {
            const mappingGene = parent2[pos];
            const nextPos = parent1.indexOf(mappingGene);

            snapshot(
                `فرزند ۲: جایگاه ${pos + 1} پر است. `
                + `در همین اندیس، والد ۲ ژن ${mappingGene} را دارد؛ `
                + `همین ژن در والد ۱ در جایگاه ${nextPos + 1} قرار دارد → به آن اندیس می‌رویم.`,
                { p2Index: pos, p1Index: nextPos }
            );

            pos = nextPos;
            if (++safety > n + 2) break;
        }

        child2[pos] = g;
        snapshot(
            `فرزند ۲: جایگاه خالی ${pos + 1} پیدا شد. ژن ${g} را این‌جا قرار می‌دهیم.`,
            { c2Index: pos }
        );
    }

    // پرکردن خانه‌های خالی فرزند ۲ با والد ۱
    let filled2 = false;
    for (let i = 0; i < n; i++) {
        if (child2[i] === null) {
            child2[i] = parent1[i];
            filled2 = true;
        }
    }
    if (filled2) {
        snapshot(
            "فرزند ۲: همهٔ خانه‌های خالی باقی‌مانده با ژن متناظر از والد ۱ پر می‌شوند.",
            {}
        );
    }

    return {
        parent1,
        parent2,
        cut1,
        cut2,
        mapping,
        frames,
        finalChild1: child1.slice(),
        finalChild2: child2.slice(),
    };
}

// ---------- وضعیت global و رندر کردن فریم‌ها ----------

let currentRun = null;
let pmxSlider = null;
let autoPlayTimer = null;

function renderFrame(frameIndex) {
    if (!currentRun) return;

    const { parent1, parent2, cut1, cut2, frames, mapping } = currentRun;

    const idx = Math.max(0, Math.min(frames.length - 1, frameIndex));
    const frame = frames[idx];

    const label = document.getElementById("pmx-step-label");
    const explanation = document.getElementById("pmx-explanation");
    const p1Display = document.getElementById("pmx-p1-display");
    const p2Display = document.getElementById("pmx-p2-display");
    const c1Display = document.getElementById("pmx-c1-display");
    const c2Display = document.getElementById("pmx-c2-display");
    const chromBox = document.getElementById("pmx-chromosome-box");
    const mappingBox = document.getElementById("pmx-mapping-table");

    label.textContent = `گام ${idx} از ${frames.length - 1}`;
    explanation.textContent = frame.description;

    p1Display.textContent = parent1.join(" ");
    p2Display.textContent = parent2.join(" ");
    c1Display.textContent = frame.child1.map((g) => (g === null ? "·" : g)).join(" ");
    c2Display.textContent = frame.child2.map((g) => (g === null ? "·" : g)).join(" ");

    // ----- رسم ردیف‌های کروموزوم‌ها -----
    chromBox.innerHTML = "";

    function makeRow(labelText, rowName, genes, focus) {
        const row = document.createElement("div");
        row.className = "chrom-row";

        const labelEl = document.createElement("div");
        labelEl.className = "chrom-label";
        labelEl.textContent = labelText;

        const genesBox = document.createElement("div");
        genesBox.className = "chrom-genes";

        const focusIndex =
            rowName === "p1" ? focus.p1Index :
                rowName === "p2" ? focus.p2Index :
                    rowName === "c1" ? focus.c1Index :
                        rowName === "c2" ? focus.c2Index :
                            undefined;

        genes.forEach((g, i) => {
            const cell = document.createElement("div");
            cell.className = "chrom-gene";

            if (i >= cut1 && i <= cut2) {
                cell.classList.add("segment");
            }
            if (focusIndex === i) {
                cell.classList.add("focus");
            }
            if (g === null) {
                cell.classList.add("empty");
                cell.textContent = "·";
            } else {
                cell.textContent = g;
            }

            genesBox.appendChild(cell);
        });

        row.appendChild(labelEl);
        row.appendChild(genesBox);
        return row;
    }

    chromBox.appendChild(makeRow("والد ۱", "p1", parent1, frame.focus || {}));
    chromBox.appendChild(makeRow("والد ₂", "p2", parent2, frame.focus || {}));
    chromBox.appendChild(makeRow("فرزند ۱", "c1", frame.child1, frame.focus || {}));
    chromBox.appendChild(makeRow("فرزند ₂", "c2", frame.child2, frame.focus || {}));

    // ----- رسم جدول نگاشت روی بازهٔ تقاطع -----
    mappingBox.innerHTML = "";

    if (mapping && mapping.length) {
        const table = document.createElement("div");
        table.className = "mapping-table";

        function makeCell(text, isHeader = false, isActive = false) {
            const c = document.createElement("div");
            c.className = "mapping-cell";
            if (isHeader) c.classList.add("mapping-header");
            if (isActive) c.classList.add("mapping-cell-active");
            c.textContent = text;
            return c;
        }

        // سطر عنوان
        table.appendChild(makeCell("جایگاه", true, false));
        table.appendChild(makeCell("ژن والد ۱", true, false));
        table.appendChild(makeCell("ژن والد ۲", true, false));

        const f = frame.focus || {};

        mapping.forEach((row) => {
            const isActive =
                row.index === f.p1Index || row.index === f.p2Index;

            const pos1based = row.index + 1;
            table.appendChild(makeCell(pos1based, false, isActive));
            table.appendChild(makeCell(row.p1Gene, false, isActive));
            table.appendChild(makeCell(row.p2Gene, false, isActive));
        });

        mappingBox.appendChild(table);
    } else {
        mappingBox.textContent = "نگاشتی وجود ندارد (بازهٔ تقاطع خالی است).";
    }
}

function startAutoPlay() {
    if (!currentRun || !pmxSlider) return;

    if (autoPlayTimer !== null) {
        clearInterval(autoPlayTimer);
        autoPlayTimer = null;
    }

    let current = 0;
    const max = currentRun.frames.length - 1;

    pmxSlider.value = "0";
    renderFrame(0);

    autoPlayTimer = setInterval(() => {
        if (current > max) {
            clearInterval(autoPlayTimer);
            autoPlayTimer = null;
            return;
        }
        pmxSlider.value = String(current);
        renderFrame(current);
        current++;
    }, 700);
}

function showError(msg) {
    const box = document.getElementById("pmx-error");
    if (!box) return;
    box.textContent = msg || "";
}

// ---------- وصل‌کردن رویدادها به DOM ----------

document.addEventListener("DOMContentLoaded", () => {
    const form = document.getElementById("pmx-form");
    pmxSlider = document.getElementById("pmx-step-slider");

    if (!form || !pmxSlider) return;

    form.addEventListener("submit", (evt) => {
        evt.preventDefault();
        showError("");

        const rawP1 = document.getElementById("parent1").value || "";
        const rawP2 = document.getElementById("parent2").value || "";
        const p1 = parseChromosome(rawP1);
        const p2 = parseChromosome(rawP2);

        if (!p1.length || !p2.length) {
            showError("رشتهٔ والدها نباید خالی باشد.");
            return;
        }
        if (p1.length !== p2.length) {
            showError("طول دو والد باید برابر باشد.");
            return;
        }

        const n = p1.length;

        if (hasDuplicates(p1) || hasDuplicates(p2)) {
            showError("هر والد باید جایگشتی بدون تکرار از ژن‌ها باشد.");
            return;
        }
        if (!sameMultiset(p1, p2)) {
            showError("دو والد باید جایگشت یک مجموعه ژن مشترک باشند (همان چندمجموعه).");
            return;
        }

        let cut1 = parseInt(document.getElementById("cut1").value, 10);
        let cut2 = parseInt(document.getElementById("cut2").value, 10);

        if (Number.isNaN(cut1) || Number.isNaN(cut2)) {
            showError("نقاط تقاطع باید عدد صحیح معتبر باشند.");
            return;
        }

        if (cut1 < 1 || cut2 < 1 || cut1 > n || cut2 > n || cut1 > cut2) {
            showError(`باید داشته باشیم: ۱ ≤ نقطهٔ اول ≤ نقطهٔ دوم ≤ ${n}.`);
            return;
        }

        // تبدیل به اندیس ۰-مبنایی
        cut1 -= 1;
        cut2 -= 1;

        currentRun = runPmxWithFrames(p1, p2, cut1, cut2);

        pmxSlider.min = "0";
        pmxSlider.max = String(currentRun.frames.length - 1);
        pmxSlider.value = "0";

        renderFrame(0);
        startAutoPlay();
    });

    pmxSlider.addEventListener("input", (evt) => {
        const v = parseInt(evt.target.value, 10);
        if (!Number.isNaN(v)) {
            renderFrame(v);
        }
    });

    // اجرای اولیه با مقادیر پیش‌فرض فرم
    form.dispatchEvent(new Event("submit"));
});
