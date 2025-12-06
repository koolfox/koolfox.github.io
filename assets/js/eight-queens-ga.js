// ---------- تابع برازندگی ۸ وزیر ----------
function evaluateChromosome(genes) {
    const n = genes.length;
    let conflicts = 0;
    const pairs = [];

    for (let i = 0; i < n; i++) {
        for (let j = i + 1; j < n; j++) {
            if (genes[i] === genes[j]) {
                conflicts++;
                pairs.push({ i: i + 1, j: j + 1, type: "ستون مشترک" });
            } else if (Math.abs(genes[i] - genes[j]) === Math.abs(i - j)) {
                conflicts++;
                pairs.push({ i: i + 1, j: j + 1, type: "قطر مشترک" });
            }
        }
    }

    const maxPairs = 28; // C(8,2)
    const fitness = maxPairs - conflicts;
    return { fitness, conflicts, pairs };
}

function cloneIndividual(ind) {
    return {
        genes: ind.genes.slice(),
        fitness: ind.fitness,
        conflicts: ind.conflicts,
        pairs: ind.pairs ? ind.pairs.map(p => ({ ...p })) : [],
    };
}

function findBestIndex(pop) {
    let bestIdx = 0;
    let bestFit = pop[0].fitness;
    for (let i = 1; i < pop.length; i++) {
        if (pop[i].fitness > bestFit) {
            bestFit = pop[i].fitness;
            bestIdx = i;
        }
    }
    return bestIdx;
}

// ---------- ساخت سناریو طبق صورت مسئله ----------
//
// targetId ∈ {1,2,3} مشخص می‌کند کدام جواب بهینه هدف باشد:
//
// 1 → [1, 5, 8, 6, 3, 7, 2, 4]
// 2 → [2, 4, 6, 8, 3, 1, 7, 5]
// 3 → [4, 2, 5, 8, 6, 1, 3, 7]
//
// نسل ۰: ۴ کروموزوم دلخواه، یکی از آن‌ها فقط در یک ژن با target فرق دارد.
// نسل ۱: ۵۰٪ از تقاطع، ۲۵٪ جهش، بقیه کپی.
// نسل ۲: فقط برابر نسل ۱ (جواب قبلاً پیدا شده است).

function buildScenario(targetId) {
    let target;
    let gen0Genes;

    switch (targetId) {
        case 2:
            target = [2, 4, 6, 8, 3, 1, 7, 5];
            gen0Genes = [
                [2, 4, 6, 8, 3, 1, 7, 4], // فقط ژن ۸ فرق دارد
                [1, 5, 8, 6, 3, 7, 2, 3],
                [8, 4, 2, 6, 7, 3, 5, 1],
                [1, 2, 3, 4, 5, 8, 7, 6],
            ];
            break;
        case 3:
            target = [4, 2, 5, 8, 6, 1, 3, 7];
            gen0Genes = [
                [4, 2, 5, 8, 6, 1, 3, 5], // فقط ژن ۸ فرق دارد
                [1, 5, 8, 6, 3, 7, 2, 3],
                [8, 4, 2, 6, 7, 3, 5, 1],
                [1, 2, 3, 4, 5, 8, 7, 6],
            ];
            break;
        case 1:
        default:
            target = [1, 5, 8, 6, 3, 7, 2, 4];
            gen0Genes = [
                [1, 5, 8, 6, 3, 7, 2, 3], // فقط ژن ۸ فرق دارد
                [6, 5, 4, 1, 2, 8, 7, 3],
                [8, 4, 2, 6, 7, 3, 5, 1],
                [1, 2, 3, 4, 5, 8, 7, 6],
            ];
            break;
    }

    // --- نسل ۰ ---
    const gen0Inds = gen0Genes.map(genes => ({
        genes,
        ...evaluateChromosome(genes),
    }));

    const gen0 = {
        index: 0,
        individuals: gen0Inds,
        bestIndex: findBestIndex(gen0Inds),
    };

    const C1_0 = gen0Inds[0]; // فرد نزدیک به target
    const C3_0 = gen0Inds[2];
    const C4_0 = gen0Inds[3];

    // --- نسل ۱: یک نسل GA ---
    //
    // ۱) ۵۰٪ جمعیت (۲ فرد) از طریق تقاطع:
    //    بین C1^0 و C3^0، بعد از ژن ۴ تقاطع می‌زنیم.
    const crossoverPoint = 4;
    const childAgenes = C1_0.genes.slice(0, crossoverPoint)
        .concat(C3_0.genes.slice(crossoverPoint));
    const childBgenes = C3_0.genes.slice(0, crossoverPoint)
        .concat(C1_0.genes.slice(crossoverPoint));

    const C2_1 = {
        genes: childAgenes,
        ...evaluateChromosome(childAgenes),
    };
    const C3_1 = {
        genes: childBgenes,
        ...evaluateChromosome(childBgenes),
    };

    // ۲) یک فرد کپی از نسل قبلی
    const C4_1 = cloneIndividual(C4_0);

    // ۳) جهش ۲۵٪ جمعیت (۱ فرد): روی C1^0
    //    فقط ژن هشتم را به مقدار هدف تغییر می‌دهیم → دقیقاً target
    const mutatedGenes = C1_0.genes.slice();
    mutatedGenes[7] = target[7];
    // اگر خواستی سخت‌گیر باشی، می‌توانی جای دیگری را هم تنظیم کنی، ولی این کافی است.
    const C1_1 = {
        genes: mutatedGenes,
        ...evaluateChromosome(mutatedGenes),
    };

    const gen1Inds = [C1_1, C2_1, C3_1, C4_1];
    const gen1 = {
        index: 1,
        individuals: gen1Inds,
        bestIndex: findBestIndex(gen1Inds),
    };

    // --- نسل ۲: برابر نسل ۱ (ما قبل از رسیدن به حداکثر نسل، جواب را یافته‌ایم) ---
    const gen2Inds = gen1Inds.map(cloneIndividual);
    const gen2 = {
        index: 2,
        individuals: gen2Inds,
        bestIndex: findBestIndex(gen2Inds),
    };

    return [gen0, gen1, gen2];
}

// ---------- UI ----------

let generations = [];
let currentGenIndex = 0;
let currentIndIndex = null;

function initBoard() {
    const board = document.getElementById("ga8-board");
    if (!board) return;
    board.innerHTML = "";
    for (let row = 0; row < 8; row++) {
        for (let col = 0; col < 8; col++) {
            const sq = document.createElement("div");
            sq.className = "square " + ((row + col) % 2 === 0 ? "light" : "dark");
            sq.dataset.row = String(row + 1);
            sq.dataset.col = String(col + 1);
            board.appendChild(sq);
        }
    }
}

function renderGeneration(genIndex) {
    if (!generations.length) return;

    genIndex = Math.max(0, Math.min(generations.length - 1, genIndex));
    currentGenIndex = genIndex;

    const gen = generations[genIndex];
    const label = document.getElementById("ga8-gen-label");
    const popBox = document.getElementById("ga8-population-box");

    let labelText = `نسل ${genIndex}`;
    if (genIndex === 0) labelText += " (جمعیت اولیه)";
    if (genIndex === 1) labelText += " (بعد از یک نسل GA)";
    if (genIndex === 2) labelText += " (نسل نهایی)";
    label.textContent = labelText;

    popBox.innerHTML = "";

    const table = document.createElement("table");
    table.className = "ga-pop-table";

    const thead = document.createElement("thead");
    const headRow = document.createElement("tr");
    ["#", "کروموزوم", "تعداد برخورد", "برازندگی"].forEach(txt => {
        const th = document.createElement("th");
        th.textContent = txt;
        headRow.appendChild(th);
    });
    thead.appendChild(headRow);
    table.appendChild(thead);

    const tbody = document.createElement("tbody");

    gen.individuals.forEach((ind, idx) => {
        const tr = document.createElement("tr");
        tr.classList.add("ga-row-selectable");
        if (idx === gen.bestIndex) tr.classList.add("ga-row-best");
        if (ind.conflicts === 0) tr.classList.add("ga-row-solution");

        const tdIdx = document.createElement("td");
        tdIdx.textContent = String(idx + 1);
        const tdGenes = document.createElement("td");
        tdGenes.textContent = ind.genes.join(" ");
        const tdConf = document.createElement("td");
        tdConf.textContent = String(ind.conflicts);
        const tdFit = document.createElement("td");
        tdFit.textContent = String(ind.fitness);

        tr.appendChild(tdIdx);
        tr.appendChild(tdGenes);
        tr.appendChild(tdConf);
        tr.appendChild(tdFit);

        tr.addEventListener("click", () => {
            currentIndIndex = idx;
            renderSelectedIndividual();
        });

        tbody.appendChild(tr);
    });

    table.appendChild(tbody);
    popBox.appendChild(table);

    currentIndIndex = gen.bestIndex;
    renderSelectedIndividual();
}

function renderSelectedIndividual() {
    const info = document.getElementById("ga8-selected-info");
    const details = document.getElementById("ga8-fitness-details");
    const board = document.getElementById("ga8-board");

    if (!generations.length ||
        currentGenIndex == null ||
        currentIndIndex == null) {
        info.textContent = "هیچ کروموزومی انتخاب نشده است.";
        details.textContent = "–";
        return;
    }

    const gen = generations[currentGenIndex];
    const ind = gen.individuals[currentIndIndex];

    Array.from(board.children).forEach(sq => {
        sq.textContent = "";
        sq.classList.remove("conflict");
    });

    ind.genes.forEach((col, rowIdx) => {
        const row = rowIdx + 1;
        const selector = `.square[data-row="${row}"][data-col="${col}"]`;
        const sq = board.querySelector(selector);
        if (sq) sq.textContent = "♛";
    });

    const conflictRows = new Set();
    ind.pairs.forEach(p => {
        conflictRows.add(p.i);
        conflictRows.add(p.j);
    });

    conflictRows.forEach(r => {
        const row = r;
        const col = ind.genes[row - 1];
        const selector = `.square[data-row="${row}"][data-col="${col}"]`;
        const sq = board.querySelector(selector);
        if (sq) sq.classList.add("conflict");
    });

    if (ind.conflicts === 0) {
        info.textContent =
            `کروموزوم انتخاب‌شده: [${ind.genes.join(" ")}] — بدون برخورد (جواب بهینه).`;
        details.textContent =
            `هیچ دو وزیری در یک ستون یا قطر مشترک نیستند؛ بنابراین تعداد برخورد = ۰ و برازندگی = ۲۸ − ۰ = ۲۸.`;
    } else {
        info.textContent =
            `کروموزوم انتخاب‌شده: [${ind.genes.join(" ")}] — تعداد برخورد: ${ind.conflicts} ، برازندگی: ${ind.fitness}.`;

        if (!ind.pairs || !ind.pairs.length) {
            details.textContent =
                `در این کروموزوم ${ind.conflicts} جفت وزیر با هم برخورد دارند؛ در نتیجه برازندگی = ۲۸ − ${ind.conflicts} = ${ind.fitness}.`;
        } else {
            const pairsText = ind.pairs
                .map(p => `(${p.i}, ${p.j}) – ${p.type}`)
                .join(" ؛ ");
            details.textContent =
                `برای همه‌ی جفت‌های (i, j) با i < j، هم‌ستونی یا هم‌قطری بودن بررسی شده است.\n` +
                `جفت‌های درگیر برخورد: ${pairsText}.\n` +
                `بنابراین تعداد برخورد = ${ind.conflicts} و برازندگی = ۲۸ − ${ind.conflicts} = ${ind.fitness}.`;
        }
    }
}

function showError(msg) {
    const box = document.getElementById("ga8-error");
    if (!box) return;
    box.textContent = msg || "";
}

function getSelectedTargetId() {
    const radios = document.querySelectorAll('input[name="target-solution"]');
    for (const r of radios) {
        if (r.checked) return parseInt(r.value, 10);
    }
    return 1;
}

document.addEventListener("DOMContentLoaded", () => {
    const form = document.getElementById("ga8-form");
    const slider = document.getElementById("ga8-gen-slider");

    initBoard();

    if (!form || !slider) return;

    form.addEventListener("submit", (evt) => {
        evt.preventDefault();
        showError("");

        const targetId = getSelectedTargetId();
        generations = buildScenario(targetId);

        slider.min = "0";
        slider.max = String(generations.length - 1); // ۰،۱،۲
        slider.value = "0";

        renderGeneration(0);
    });

    slider.addEventListener("input", (evt) => {
        const v = parseInt(evt.target.value, 10);
        if (!Number.isNaN(v)) {
            renderGeneration(v);
        }
    });

    // اجرای اولیه
    form.dispatchEvent(new Event("submit"));
});
