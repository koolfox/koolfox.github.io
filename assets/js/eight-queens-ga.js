// eight-queens-ga.js
// UI جدیدتر + GA جدیدتر (PMX + Swap + Elite + HardMaxGen<=2)
// ✅ تابع برازندگی: دو حلقه + فقط قطر (بدون ستون) + fitness = 28 - conflicts (برای 8 وزیر)

const N = 8;
const POP_SIZE = 4;

const NUM_CROSSOVER_CHILDREN = 2;
const NUM_MUTANTS = 1;
const NUM_COPIES = 1;

const HARD_MAX_GEN = 2; // طبق صورت/دمو
const MAX_RESTARTS = 30;
const EARLY_STOP_PATIENCE = 1;

// -------------------- ابزارهای پایه --------------------
function clamp(v, lo, hi) {
    return Math.max(lo, Math.min(hi, v));
}

function arraysEqual(a, b) {
    if (!a || !b) return false;
    if (a.length !== b.length) return false;
    for (let i = 0; i < a.length; i++) if (a[i] !== b[i]) return false;
    return true;
}

function maxPairs8() {
    return 28; // C(8,2)
}

function randomPermutation(n) {
    const arr = Array.from({ length: n }, (_, i) => i + 1);
    for (let i = n - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
}

function deterministicPermutation(n, k) {
    const shift = ((k % n) + n) % n;
    const arr = new Array(n);
    for (let i = 0; i < n; i++) arr[i] = ((i + shift) % n) + 1;
    if (k % 3 === 1) arr.reverse();
    return arr;
}

function mutateSwap(genes) {
    const n = genes.length;
    const a = Math.floor(Math.random() * n);
    let b = Math.floor(Math.random() * n);
    while (b === a) b = Math.floor(Math.random() * n);
    [genes[a], genes[b]] = [genes[b], genes[a]];
    return genes;
}

function pickRandom(pop) {
    return pop[Math.floor(Math.random() * pop.length)];
}

// =======================================================
// ✅ برازندگی مطابق فلوچارت: دو حلقه + فقط قطر + 28 ثابت
// =======================================================
function evaluateChromosome(genes, withPairs = false) {
    const n = genes.length; // انتظار: 8
    let conflicts = 0;

    if (!withPairs) {
        for (let i = 0; i < n; i++) {
            for (let j = i + 1; j < n; j++) {
                if (Math.abs(genes[i] - genes[j]) === Math.abs(i - j)) {
                    conflicts++;
                }
            }
        }
        return { fitness: maxPairs8() - conflicts, conflicts, pairs: null };
    }

    const pairs = [];
    for (let i = 0; i < n; i++) {
        for (let j = i + 1; j < n; j++) {
            if (Math.abs(genes[i] - genes[j]) === Math.abs(i - j)) {
                conflicts++;
                pairs.push({ i: i + 1, j: j + 1, type: "قطر مشترک" });
            }
        }
    }

    return { fitness: maxPairs8() - conflicts, conflicts, pairs };
}

function cloneIndividual(ind) {
    return {
        genes: ind.genes.slice(),
        fitness: ind.fitness,
        conflicts: ind.conflicts,
        pairs: ind.pairs ?? null,
        origin: ind.origin || "",
        isTarget: !!ind.isTarget,
    };
}

function findBestIndex(pop) {
    let bestIdx = 0;
    for (let i = 1; i < pop.length; i++) {
        if (pop[i].fitness > pop[bestIdx].fitness) bestIdx = i;
    }
    return bestIdx;
}

// -------------------- PMX --------------------
function pmx(parent1, parent2, cut1, cut2) {
    const n = parent1.length;
    const child1 = new Array(n).fill(null);
    const child2 = new Array(n).fill(null);

    const pos2 = new Array(n + 1);
    const pos1 = new Array(n + 1);
    for (let i = 0; i < n; i++) {
        pos2[parent2[i]] = i;
        pos1[parent1[i]] = i;
    }

    const set1 = new Set();
    const set2 = new Set();

    for (let i = cut1; i <= cut2; i++) {
        child1[i] = parent1[i];
        child2[i] = parent2[i];
        set1.add(child1[i]);
        set2.add(child2[i]);
    }

    function placeGene(child, gene, startPos, pA, posInPB) {
        let pos = startPos;
        let safety = 0;
        while (child[pos] !== null) {
            const mapped = pA[pos];
            pos = posInPB[mapped];
            if (++safety > n + 2) break;
        }
        child[pos] = gene;
    }

    for (let i = cut1; i <= cut2; i++) {
        const g = parent2[i];
        if (set1.has(g)) continue;
        placeGene(child1, g, i, parent1, pos2);
        set1.add(g);
    }
    for (let i = 0; i < n; i++) if (child1[i] === null) child1[i] = parent2[i];

    for (let i = cut1; i <= cut2; i++) {
        const g = parent1[i];
        if (set2.has(g)) continue;
        placeGene(child2, g, i, parent2, pos1);
        set2.add(g);
    }
    for (let i = 0; i < n; i++) if (child2[i] === null) child2[i] = parent1[i];

    return [child1, child2];
}

// -------------------- سناریو هدف (برای Radioها) --------------------
function getTargetGenes(targetId) {
    switch (targetId) {
        case 2: return [2, 4, 6, 8, 3, 1, 7, 5];
        case 3: return [4, 2, 5, 8, 6, 1, 3, 7];
        case 1:
        default: return [1, 5, 8, 6, 3, 7, 2, 4];
    }
}

// -------------------- اجرای GA (طبق اسکریپت جدیدتر) --------------------
function runGA(n, options = {}) {
    const hardMaxGen = Math.min(options.hardMaxGen ?? HARD_MAX_GEN, 2);
    const patience = clamp(options.patience ?? EARLY_STOP_PATIENCE, 0, 20000);
    const maxRestarts = clamp(options.maxRestarts ?? MAX_RESTARTS, 0, 5000000);

    const targetGenes = options.targetGenes ?? null;

    const generations = [];
    let bestOverall = null;

    for (let restart = 0; restart <= maxRestarts; restart++) {
        // نسل 0 (اینجا برای دمو: یکبار deterministic و بعد restarts)
        let pop = Array.from({ length: POP_SIZE }, (_, idx) => {
            const genes = restart === 0
                ? deterministicPermutation(n, idx)     // اولین اجرا قابل بازتولید
                : randomPermutation(n);               // ریستارت‌ها تصادفی

            return { genes, origin: `ریستارت ${restart + 1} / نسل۰`, ...evaluateChromosome(genes, false) };
        });

        let bestFitnessRun = -Infinity;
        let stale = 0;

        for (let gen = 0; gen <= hardMaxGen; gen++) {
            let targetMatched = false;
            let targetIndex = -1;

            if (targetGenes) {
                for (let i = 0; i < pop.length; i++) {
                    if (arraysEqual(pop[i].genes, targetGenes)) {
                        targetMatched = true;
                        targetIndex = i;
                        pop[i].isTarget = true;
                        break;
                    }
                }
            }

            const bestIndex = findBestIndex(pop);
            const best = pop[bestIndex];
            const avgFitness = pop.reduce((s, x) => s + x.fitness, 0) / pop.length;

            if (!bestOverall || best.fitness > bestOverall.fitness) {
                bestOverall = cloneIndividual(best);
                bestOverall.restart = restart;
                bestOverall.gen = gen;
            }

            generations.push({
                restart,
                localIndex: gen,
                individuals: pop.map(cloneIndividual),
                bestIndex,
                targetIndex,
                stats: {
                    n,
                    maxPairs: maxPairs8(),
                    avgFitness,
                    bestFitness: best.fitness,
                    bestConflicts: best.conflicts,
                    solved: best.conflicts === 0,

                    targetEnabled: !!targetGenes,
                    targetMatched,

                    earlyStopped: false,
                    stale,
                    patience,

                    hardMaxGen,
                    maxRestarts,
                },
            });

            if (targetMatched) {
                return { generations, solved: false, stoppedByTarget: true, bestOverall, restartsUsed: restart, targetGenes };
            }

            if (best.conflicts === 0) {
                return { generations, solved: true, stoppedByTarget: false, bestOverall, restartsUsed: restart, targetGenes };
            }

            // early stopping
            if (best.fitness > bestFitnessRun) {
                bestFitnessRun = best.fitness;
                stale = 0;
            } else {
                stale++;
                if (patience > 0 && stale >= patience) {
                    generations[generations.length - 1].stats.earlyStopped = true;
                    break;
                }
            }

            // نسل بعد: 2 PMX + 1 Swap + 1 Elite
            const next = [];

            // 1) crossover -> 2
            {
                const p1 = pickRandom(pop);
                const p2 = pickRandom(pop);

                const cut1 = Math.floor(Math.random() * (n - 1));
                const cut2 = Math.floor(Math.random() * (n - 1 - cut1)) + (cut1 + 1);

                const [c1, c2] = pmx(p1.genes, p2.genes, cut1, cut2);
                next.push({ genes: c1, origin: `تقاطع PMX (${cut1 + 1},${cut2 + 1})`, ...evaluateChromosome(c1, false) });
                next.push({ genes: c2, origin: `تقاطع PMX (${cut1 + 1},${cut2 + 1})`, ...evaluateChromosome(c2, false) });
            }

            // 2) mutation -> 1
            {
                const base = pickRandom(pop).genes.slice();
                const mutated = mutateSwap(base);
                next.push({ genes: mutated, origin: "جهش Swap", ...evaluateChromosome(mutated, false) });
            }

            // 3) copy -> elite
            {
                const elite = pop[bestIndex].genes.slice();
                next.push({ genes: elite, origin: "کپی (بهترین نسل قبل)", ...evaluateChromosome(elite, false) });
            }

            pop = next;
        }
    }

    return { generations, solved: false, stoppedByTarget: false, bestOverall, restartsUsed: MAX_RESTARTS + 1, targetGenes };
}

// -------------------- UI --------------------
let generations = [];
let currentGenIndex = 0;
let currentIndIndex = null;

let boardSquares = [];
let currentN = 8;

function initBoard(n) {
    currentN = n;

    const board = document.getElementById("ga8-board");
    if (!board) return;

    board.style.setProperty("--n", String(n));
    board.innerHTML = "";

    boardSquares = Array.from({ length: n }, () => Array(n).fill(null));

    for (let r = 0; r < n; r++) {
        for (let c = 0; c < n; c++) {
            const sq = document.createElement("div");
            sq.className = "square " + ((r + c) % 2 === 0 ? "light" : "dark");
            board.appendChild(sq);
            boardSquares[r][c] = sq;
        }
    }
}

// فقط برای هایلایت قطرها در UI (برای نمایش بهتر)
function computeDiagonalSetsForUI(genes) {
    const n = genes.length;

    const diag1Count = new Map(); // row-col
    const diag2Count = new Map(); // row+col

    for (let r = 0; r < n; r++) {
        const row = r + 1;
        const col = genes[r];
        const d1 = row - col;
        const d2 = row + col;
        diag1Count.set(d1, (diag1Count.get(d1) || 0) + 1);
        diag2Count.set(d2, (diag2Count.get(d2) || 0) + 1);
    }

    const safeD1 = new Set();
    const safeD2 = new Set();
    const confD1 = new Set();
    const confD2 = new Set();

    for (const [k, c] of diag1Count.entries()) (c > 1 ? confD1 : safeD1).add(k);
    for (const [k, c] of diag2Count.entries()) (c > 1 ? confD2 : safeD2).add(k);

    const conflictRows = new Set();
    for (let r = 0; r < n; r++) {
        const row = r + 1;
        const col = genes[r];
        const d1 = row - col;
        const d2 = row + col;
        if ((diag1Count.get(d1) || 0) > 1 || (diag2Count.get(d2) || 0) > 1) conflictRows.add(row);
    }

    return { safeD1, safeD2, confD1, confD2, conflictRows };
}

function renderGeneration(genIndex) {
    if (!generations.length) return;

    genIndex = clamp(genIndex, 0, generations.length - 1);
    currentGenIndex = genIndex;

    const gen = generations[genIndex];
    const label = document.getElementById("ga8-gen-label");
    const statsBox = document.getElementById("ga8-gen-stats");
    const popBox = document.getElementById("ga8-population-box");

    const isLast = genIndex === generations.length - 1;

    let labelText = `ریستارت ${gen.restart + 1} • نسل ${gen.localIndex}`;
    if (gen.localIndex === 0) labelText += " (جمعیت اولیه)";
    if (isLast) labelText += " (آخرین وضعیت)";
    if (gen.stats?.earlyStopped) labelText += " ⏹️ توقف زودهنگام";
    if (gen.stats?.targetMatched) labelText += " 🎯 هدف پیدا شد";
    if (gen.stats?.solved) labelText += " ✅ جواب بدون برخورد";

    if (label) label.textContent = labelText;

    if (statsBox && gen.stats) {
        statsBox.textContent =
            `N=${gen.stats.n} | ` +
            `C(8,2)=28 | ` +
            `avgFit=${gen.stats.avgFitness.toFixed(2)} | ` +
            `bestFit=${gen.stats.bestFitness} | ` +
            `bestConflicts=${gen.stats.bestConflicts} | ` +
            `stale=${gen.stats.stale}/${gen.stats.patience}`;
    }

    if (!popBox) return;
    popBox.innerHTML = "";

    const table = document.createElement("table");
    table.className = "ga-pop-table";

    const thead = document.createElement("thead");
    const headRow = document.createElement("tr");
    ["#", "کروموزوم (جایگشت)", "عملیات", "برخورد (قطر)", "برازندگی"].forEach(t => {
        const th = document.createElement("th");
        th.textContent = t;
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
        if (idx === gen.targetIndex) tr.classList.add("ga-row-target");

        const td1 = document.createElement("td");
        td1.textContent = String(idx + 1);

        const td2 = document.createElement("td");
        const genesDiv = document.createElement("div");
        genesDiv.className = "chromosome-cell";
        genesDiv.textContent = ind.genes.join(" ");
        td2.appendChild(genesDiv);

        const td3 = document.createElement("td");
        td3.textContent = ind.origin || "—";

        const td4 = document.createElement("td");
        td4.textContent = String(ind.conflicts);

        const td5 = document.createElement("td");
        td5.textContent = String(ind.fitness);

        tr.appendChild(td1);
        tr.appendChild(td2);
        tr.appendChild(td3);
        tr.appendChild(td4);
        tr.appendChild(td5);

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

    if (!generations.length || currentGenIndex == null || currentIndIndex == null) {
        if (info) info.textContent = "هیچ کروموزومی انتخاب نشده است.";
        if (details) details.textContent = "–";
        return;
    }

    const gen = generations[currentGenIndex];
    const ind = gen.individuals[currentIndIndex];
    const n = ind.genes.length;

    if (n !== currentN) initBoard(n);

    // پاکسازی
    for (let r = 0; r < n; r++) {
        for (let c = 0; c < n; c++) {
            const sq = boardSquares[r][c];
            sq.textContent = "";
            sq.classList.remove("conflict", "safe", "diag-safe", "diag-conflict");
        }
    }

    // رسم وزیرها
    for (let r = 0; r < n; r++) {
        const col = ind.genes[r];
        if (col >= 1 && col <= n) boardSquares[r][col - 1].textContent = "♛";
    }

    // هایلایت قطرها (UI)
    const { safeD1, safeD2, confD1, confD2, conflictRows } = computeDiagonalSetsForUI(ind.genes);

    for (let r = 0; r < n; r++) {
        const row = r + 1;
        for (let c = 0; c < n; c++) {
            const col = c + 1;
            const d1 = row - col;
            const d2 = row + col;

            const sq = boardSquares[r][c];

            const isConflictDiag = confD1.has(d1) || confD2.has(d2);
            if (isConflictDiag) {
                sq.classList.add("diag-conflict");
                sq.classList.remove("diag-safe");
                continue;
            }

            const isSafeDiag = safeD1.has(d1) || safeD2.has(d2);
            if (isSafeDiag) sq.classList.add("diag-safe");
        }
    }

    // خودِ وزیرها پررنگ
    for (let r = 0; r < n; r++) {
        const row1based = r + 1;
        const col = ind.genes[r];
        if (!(col >= 1 && col <= n)) continue;
        const sq = boardSquares[r][col - 1];
        if (conflictRows.has(row1based)) sq.classList.add("conflict");
        else sq.classList.add("safe");
    }

    // Lazy pairs برای جزئیات (همان تابع دوحلقه)
    if (!ind.pairs) {
        const verbose = evaluateChromosome(ind.genes, true);
        ind.pairs = verbose.pairs;
        ind.conflicts = verbose.conflicts;
        ind.fitness = verbose.fitness;
    }

    const flags = [];
    if (currentIndIndex === gen.bestIndex) flags.push("⭐ بهترین این نسل");
    if (currentIndIndex === gen.targetIndex) flags.push("🎯 مطابق هدف");
    if (ind.conflicts === 0) flags.push("✅ بدون برخورد");

    if (info) {
        info.textContent =
            `کروموزوم: [${ind.genes.join(" ")}]\n` +
            `عملیات: ${ind.origin || "—"}\n` +
            `برخورد: ${ind.conflicts} | برازندگی: ${ind.fitness}` +
            (flags.length ? `\n${flags.join(" | ")}` : "");
    }

    if (!details) return;

    if (ind.conflicts === 0) {
        details.textContent =
            `بدون برخورد ✅\n` +
            `fitness = 28 - 0 = 28\n` +
            `روش: دو حلقه روی همه جفت‌ها و فقط شرط قطری |qi-qj|=|i-j|`;
        return;
    }

    const showMax = 30;
    const pairsText = (ind.pairs || [])
        .slice(0, showMax)
        .map(p => `(${p.i},${p.j}) ${p.type}`)
        .join(" ؛ ");

    const more = (ind.pairs || []).length > showMax
        ? `\n... و ${(ind.pairs || []).length - showMax} برخورد دیگر`
        : "";

    details.textContent =
        `دو حلقه: برای همه‌ی جفت‌های i<j فقط برخورد قطری بررسی می‌شود.\n` +
        `نمونه برخوردها: ${pairsText}${more}\n` +
        `fitness = 28 - conflicts = 28 - ${ind.conflicts} = ${ind.fitness}`;
}

function showError(msg) {
    const box = document.getElementById("ga8-error");
    if (box) box.textContent = msg || "";
}

function getSelectedTargetId() {
    const radios = document.querySelectorAll('input[name="target-solution"]');
    for (const r of radios) if (r.checked) return parseInt(r.value, 10);
    return 1;
}

// -------------------- DOM --------------------
document.addEventListener("DOMContentLoaded", () => {
    const form = document.getElementById("ga8-form");
    const slider = document.getElementById("ga8-gen-slider");

    initBoard(8);

    if (!form || !slider) return;

    form.addEventListener("submit", (evt) => {
        evt.preventDefault();
        showError("");

        const targetId = getSelectedTargetId();
        const targetGenes = getTargetGenes(targetId);

        const result = runGA(8, {
            hardMaxGen: 2,
            patience: 1,
            maxRestarts: 30,
            targetGenes
        });

        generations = result.generations;

        slider.min = "0";
        slider.max = String(Math.max(0, generations.length - 1));
        slider.value = "0";

        renderGeneration(0);

        if (result.stoppedByTarget) {
            showError("🎯 اجرا به دلیل پیدا شدن «هدف دلخواه» متوقف شد.");
            return;
        }

        if (result.solved) {
            showError("✅ جواب بدون برخورد پیدا شد.");
            return;
        }

        showError("⛔️ تا سقف تنظیم‌شده جواب قطعی پیدا نشد (می‌توانی ریستارت را بیشتر کنی).");
    });

    slider.addEventListener("input", (evt) => {
        const v = parseInt(evt.target.value, 10);
        if (!Number.isNaN(v)) renderGeneration(v);
    });

    // اجرای اولیه
    form.dispatchEvent(new Event("submit"));
});
