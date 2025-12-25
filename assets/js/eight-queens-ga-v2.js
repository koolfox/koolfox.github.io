// n-queens-ga-v3.js
// بازنویسی تمیزترِ نسخه v2 با همان منطق:
// - کروموزوم: جایگشت 1..N (بدون برخورد ستونی)
// - Fitness فقط با شمارش تکرار قطرها (بدون ساخت pairs)
// - درصدها "دقیق" هستند و هیچ auto-fix انجام نمی‌شود
// - اپشن Elite on/off
// - تبدیل درصدها به تعداد (Hamilton / Largest Remainder)
// - PMX همیشه 2 فرزند تولید می‌کند => تعداد فرزندان crossover باید زوج باشد

// =========================
// تنظیمات/ثوابت
// =========================
const UI_LIMITS = {
    N_MIN: 4,
    N_MAX: 2048,
    POP_MIN: 2,
    POP_MAX: 500,
    PATIENCE_MIN: 0,
    PATIENCE_MAX: 20000,
    RESTARTS_MIN: 0,
    RESTARTS_MAX: 5_000_000,
    HARDMAX_MIN: 0,
    HARDMAX_MAX: 2_000_000,
};

// برای جلوگیری از قفل شدن مرورگر، اگر N خیلی بزرگ شود صفحه‌ی شطرنج را رندر نمی‌کنیم
const BOARD_RENDER_LIMIT = 96;

// =========================
// توابع کمکی
// =========================
function clampInt(v, lo, hi) {
    const x = Number.parseInt(String(v), 10);
    if (Number.isNaN(x)) return lo;
    return Math.max(lo, Math.min(hi, x));
}

function maxPairs(n) {
    return (n * (n - 1)) / 2;
}

function arraysEqual(a, b) {
    if (!a || !b) return false;
    if (a.length !== b.length) return false;
    for (let i = 0; i < a.length; i++) if (a[i] !== b[i]) return false;
    return true;
}

function pickRandom(arr) {
    return arr[Math.floor(Math.random() * arr.length)];
}

// Fisher–Yates permutation
function randomPermutation(n) {
    const a = Array.from({ length: n }, (_, i) => i + 1);
    for (let i = n - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
}

// fallback غیرتصادفی (برای وقتی random-init خاموش باشد و manual هم خالی باشد)
function deterministicPermutation(n, k) {
    const shift = ((k % n) + n) % n;
    const a = new Array(n);
    for (let i = 0; i < n; i++) a[i] = ((i + shift) % n) + 1;
    if (k % 3 === 1) a.reverse();
    return a;
}

function mutateSwap(genes) {
    const n = genes.length;
    const a = Math.floor(Math.random() * n);
    let b = Math.floor(Math.random() * n);
    while (b === a) b = Math.floor(Math.random() * n);
    [genes[a], genes[b]] = [genes[b], genes[a]];
    return genes;
}

// =========================
// Fitness (فقط قطرها)
// =========================
function evaluateChromosome(genes) {
    const n = genes.length;
    const mp = maxPairs(n);

    const d1Count = new Map();
    const d2Count = new Map();
    let conflicts = 0;

    for (let i = 0; i < n; i++) {
        const row = i + 1;
        const col = genes[i];
        const d1 = row - col;
        const d2 = row + col;

        const c1 = d1Count.get(d1) || 0;
        const c2 = d2Count.get(d2) || 0;

        conflicts += c1 + c2;

        d1Count.set(d1, c1 + 1);
        d2Count.set(d2, c2 + 1);
    }

    return { fitness: mp - conflicts, conflicts };
}

function cloneIndividual(ind) {
    return {
        genes: ind.genes.slice(),
        fitness: ind.fitness,
        conflicts: ind.conflicts,
        origin: ind.origin || "—",
        isTarget: !!ind.isTarget,
    };
}

function findBestIndex(pop) {
    let best = 0;
    for (let i = 1; i < pop.length; i++) {
        if (pop[i].fitness > pop[best].fitness) best = i;
    }
    return best;
}

function getTopKIndices(pop, k) {
    const idx = pop.map((_, i) => i);
    idx.sort((a, b) => pop[b].fitness - pop[a].fitness);
    return idx.slice(0, k);
}

// =========================
// PMX
// =========================
function pmx(parent1, parent2, cut1, cut2) {
    const n = parent1.length;
    const child1 = new Array(n).fill(null);
    const child2 = new Array(n).fill(null);

    const posInP2 = new Array(n + 1);
    const posInP1 = new Array(n + 1);
    for (let i = 0; i < n; i++) {
        posInP2[parent2[i]] = i;
        posInP1[parent1[i]] = i;
    }

    const set1 = new Set();
    const set2 = new Set();

    // کپی بخش میانی
    for (let i = cut1; i <= cut2; i++) {
        child1[i] = parent1[i]; set1.add(child1[i]);
        child2[i] = parent2[i]; set2.add(child2[i]);
    }

    function placeGene(child, childSet, gene, startPos, pA, posInPB) {
        let pos = startPos;
        let guard = 0;
        while (child[pos] !== null) {
            const mapped = pA[pos];
            pos = posInPB[mapped];
            if (++guard > n + 2) break;
        }
        child[pos] = gene;
        childSet.add(gene);
    }

    // پر کردن child1 با ژن‌های parent2 در ناحیه‌ی cut
    for (let i = cut1; i <= cut2; i++) {
        const g = parent2[i];
        if (set1.has(g)) continue;
        placeGene(child1, set1, g, i, parent1, posInP2);
    }
    for (let i = 0; i < n; i++) if (child1[i] === null) child1[i] = parent2[i];

    // پر کردن child2 با ژن‌های parent1 در ناحیه‌ی cut
    for (let i = cut1; i <= cut2; i++) {
        const g = parent1[i];
        if (set2.has(g)) continue;
        placeGene(child2, set2, g, i, parent2, posInP1);
    }
    for (let i = 0; i < n; i++) if (child2[i] === null) child2[i] = parent1[i];

    return [child1, child2];
}

// =========================
// Parsing ورودی دستی
// =========================
function parsePermutationLine(line, n) {
    const clean = (line || "").trim();
    if (!clean) return null;

    const parts = clean.split(/[\s,]+/).filter(Boolean);
    if (parts.length !== n) return { error: `طول جایگشت باید دقیقاً ${n} عدد باشد.` };

    const nums = parts.map(x => Number(x));
    if (nums.some(x => !Number.isInteger(x))) return { error: "فقط عدد صحیح مجاز است." };

    const seen = new Set(nums);
    if (seen.size !== n) return { error: "اعداد تکراری وجود دارد. باید یک جایگشت باشد." };

    for (let v = 1; v <= n; v++) if (!seen.has(v)) return { error: `جایگشت باید شامل همه اعداد 1..${n} باشد.` };

    return { genes: nums };
}

function parseManualPopulation(text, n, popSize) {
    const lines = (text || "")
        .split(/\r?\n/)
        .map(s => s.trim())
        .filter(s => s.length > 0);

    if (lines.length === 0) return { manualPop: null };

    if (lines.length !== popSize) {
        return { error: `برای Pop=${popSize} باید دقیقاً ${popSize} خط وارد کنید (الان ${lines.length} خط است).` };
    }

    const pop = [];
    for (let i = 0; i < lines.length; i++) {
        const res = parsePermutationLine(lines[i], n);
        if (!res) return { error: "ورودی نامعتبر است." };
        if (res.error) return { error: `خط ${i + 1}: ${res.error}` };
        pop.push(res.genes);
    }
    return { manualPop: pop };
}

function parseTargetChromosome(text, n) {
    const t = (text || "").trim();
    if (!t) return { targetGenes: null };
    const firstLine = t.split(/\r?\n/).map(s => s.trim()).find(s => s.length > 0) || "";
    const res = parsePermutationLine(firstLine, n);
    if (!res) return { targetGenes: null };
    if (res.error) return { error: res.error };
    return { targetGenes: res.genes };
}

// =========================
// Hamilton / Largest Remainder
// =========================
function apportionCounts(popSize, weights) {
    // اولویت tie-break (اگر اعشار برابر شد)
    const priority = { elite: 0, crossover: 1, mutation: 2 };

    const desired = weights.map(w => ({
        key: w.key,
        pct: w.pct,
        exact: (popSize * w.pct) / 100,
    }));

    const base = desired.map(d => ({
        key: d.key,
        count: Math.floor(d.exact),
        frac: d.exact - Math.floor(d.exact),
    }));

    let used = base.reduce((s, x) => s + x.count, 0);
    let left = popSize - used;

    base.sort((a, b) => (b.frac - a.frac) || (priority[a.key] - priority[b.key]));

    let i = 0;
    while (left > 0) {
        base[i].count += 1;
        left -= 1;
        i = (i + 1) % base.length;
    }

    const counts = {};
    for (const b of base) counts[b.key] = b.count;
    return counts;
}

function computeOperatorCountsStrict({ popSize, eliteEnabled, elitePct, crossoverPct, mutationPct }) {
    if (eliteEnabled) {
        const sum = elitePct + crossoverPct + mutationPct;
        if (sum !== 100) return { error: `جمع درصدها باید دقیقاً 100 باشد. (Elite+Cross+Mut = ${sum})` };
    } else {
        const sum = crossoverPct + mutationPct;
        if (sum !== 100) return { error: `وقتی Elite خاموش است، جمع Crossover و Mutation باید دقیقاً 100 باشد. (Cross+Mut = ${sum})` };
        elitePct = 0;
    }

    const weights = [
        { key: "elite", pct: eliteEnabled ? elitePct : 0 },
        { key: "crossover", pct: crossoverPct },
        { key: "mutation", pct: mutationPct },
    ];

    const counts = apportionCounts(popSize, weights);
    const eliteCount = counts.elite ?? 0;
    const crossoverCount = counts.crossover ?? 0; // تعداد فرزندان crossover
    const mutationCount = counts.mutation ?? 0;

    if (eliteCount + crossoverCount + mutationCount !== popSize) {
        return { error: "خطای داخلی: جمع شمارش‌ها با Pop برابر نشد." };
    }

    if (crossoverCount % 2 !== 0) {
        return {
            error:
                `به دلیل PMX، تعداد فرزندان Crossover باید زوج باشد.\n` +
                `الان طبق درصدها: crossoverChildren=${crossoverCount} (فرد) شده است.\n` +
                `راه‌حل: Pop یا درصدها را طوری تنظیم کنید که تعداد Crossover زوج شود.`
        };
    }

    return { eliteCount, crossoverCount, mutationCount };
}

// =========================
// اجرای GA (ذخیره‌ی نسل‌ها برای UI)
// =========================
function makeInitialGenes({ n, useRandomInit, restartIndex, indIndex, manualPop, popSize }) {
    if (manualPop && restartIndex === 0) return manualPop[indIndex].slice();
    if (useRandomInit) return randomPermutation(n);
    return deterministicPermutation(n, restartIndex * popSize + indIndex);
}

function runGA(n, opts) {
    const popSize = opts.popSize;
    const eliteEnabled = opts.eliteEnabled;
    const elitePct = opts.elitePct;
    const crossoverPct = opts.crossoverPct;
    const mutationPct = opts.mutationPct;

    const patience = opts.patience;
    const maxRestarts = opts.maxRestarts;
    const hardMaxGen = opts.hardMaxGen;

    const useRandomInit = opts.useRandomInit;
    const manualPop = opts.manualPop || null;
    const targetGenes = opts.targetGenes || null;

    const op = computeOperatorCountsStrict({ popSize, eliteEnabled, elitePct, crossoverPct, mutationPct });
    if (op.error) return { error: op.error };

    const { eliteCount, crossoverCount, mutationCount } = op;

    const generations = [];
    let bestOverall = null;

    for (let restart = 0; restart <= maxRestarts; restart++) {
        let pop = Array.from({ length: popSize }, (_, idx) => {
            const genes = makeInitialGenes({ n, useRandomInit, restartIndex: restart, indIndex: idx, manualPop, popSize });
            return { genes, origin: `ریستارت ${restart + 1} / نسل۰`, ...evaluateChromosome(genes) };
        });

        let bestFitnessRun = -Infinity;
        let stale = 0;

        for (let gen = 0; gen <= hardMaxGen; gen++) {
            // چک هدف دلخواه
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
                    popSize,
                    eliteEnabled,
                    elitePct,
                    crossoverPct,
                    mutationPct,
                    eliteCount,
                    crossoverCount,
                    mutationCount,
                    maxPairs: maxPairs(n),
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
                    useRandomInit,
                    manualInitUsed: !!(manualPop && restart === 0),
                },
            });

            if (targetMatched) return { generations, solved: false, stoppedByTarget: true, bestOverall, restartsUsed: restart, targetGenes };
            if (best.conflicts === 0) return { generations, solved: true, stoppedByTarget: false, bestOverall, restartsUsed: restart, targetGenes };

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

            // نسل بعد
            const next = [];

            // crossover: هر بار 2 فرزند
            for (let k = 0; k < crossoverCount; k += 2) {
                const p1 = pickRandom(pop);
                const p2 = pickRandom(pop);

                const cut1 = Math.floor(Math.random() * (n - 1));
                const cut2 = Math.floor(Math.random() * (n - 1 - cut1)) + (cut1 + 1);

                const [c1, c2] = pmx(p1.genes, p2.genes, cut1, cut2);
                next.push({ genes: c1, origin: `تقاطع PMX (${cut1 + 1},${cut2 + 1})`, ...evaluateChromosome(c1) });
                next.push({ genes: c2, origin: `تقاطع PMX (${cut1 + 1},${cut2 + 1})`, ...evaluateChromosome(c2) });
            }

            // mutation
            for (let k = 0; k < mutationCount; k++) {
                const base = pickRandom(pop).genes.slice();
                const mutated = mutateSwap(base);
                next.push({ genes: mutated, origin: "جهش Swap", ...evaluateChromosome(mutated) });
            }

            // elite
            if (eliteCount > 0) {
                const topK = getTopKIndices(pop, eliteCount);
                for (let i = 0; i < topK.length; i++) {
                    const elite = pop[topK[i]].genes.slice();
                    next.push({ genes: elite, origin: `کپی الیت #${i + 1}`, ...evaluateChromosome(elite) });
                }
            }

            if (next.length !== popSize) {
                return { error: "خطای داخلی: اندازه نسل بعد با Pop برابر نشد." };
            }

            pop = next;
        }
    }

    return { generations, solved: false, stoppedByTarget: false, bestOverall, restartsUsed: maxRestarts + 1, targetGenes };
}

// =========================
// UI
// =========================
let generations = [];
let currentGenIndex = 0;
let currentIndIndex = null;

let boardSquares = [];
let currentN = 8;

function $(id) { return document.getElementById(id); }

function showError(msg) {
    const box = $("nq-error");
    if (box) box.textContent = msg || "";
}

function setDisabled(id, disabled) {
    const el = $(id);
    if (!el) return;
    el.disabled = !!disabled;
}

function initBoard(n) {
    currentN = n;
    const titleN = $("nq-title-n");
    if (titleN) titleN.textContent = String(n);

    const board = $("nq-board");
    const info = $("nq-selected-info");
    if (!board) return;

    // اگر N بزرگ باشد، برد را رندر نمی‌کنیم
    if (n > BOARD_RENDER_LIMIT) {
        board.innerHTML = "";
        boardSquares = [];
        board.style.setProperty("--n", "8");
        if (info) info.textContent = `N=${n} خیلی بزرگ است؛ برای جلوگیری از کندی مرورگر، صفحه‌ی شطرنج رندر نمی‌شود.`;
        return;
    }

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

function renderBadgeFromGen(gen) {
    const badge = $("nq-badge");
    const popLbl = $("nq-pop-label");
    const opsHelp = $("nq-help-ops");

    if (popLbl) popLbl.textContent = String(gen?.stats?.popSize ?? "—");
    if (!gen?.stats) return;

    const s = gen.stats;
    const eliteText = s.eliteEnabled ? `Elite=${s.elitePct}%` : `Elite=OFF`;
    const countsText = `E=${s.eliteCount}, X=${s.crossoverCount}, M=${s.mutationCount}`;

    if (badge) {
        badge.textContent =
            `Pop=${s.popSize} • ${eliteText} • Cross=${s.crossoverPct}% • Mut=${s.mutationPct}% • ${countsText} • PMX+Swap`;
    }
    if (opsHelp) {
        opsHelp.textContent = `Elite=${s.eliteCount} | CrossoverChildren=${s.crossoverCount} | Mutation=${s.mutationCount}`;
    }
}

function computeDiagonalSets(genes) {
    const n = genes.length;
    const diag1 = new Map();
    const diag2 = new Map();

    for (let r = 0; r < n; r++) {
        const row = r + 1;
        const col = genes[r];
        const d1 = row - col;
        const d2 = row + col;
        diag1.set(d1, (diag1.get(d1) || 0) + 1);
        diag2.set(d2, (diag2.get(d2) || 0) + 1);
    }

    const safeD1 = new Set();
    const safeD2 = new Set();
    const confD1 = new Set();
    const confD2 = new Set();

    for (const [k, c] of diag1.entries()) (c > 1 ? confD1 : safeD1).add(k);
    for (const [k, c] of diag2.entries()) (c > 1 ? confD2 : safeD2).add(k);

    const conflictRows = new Set();
    for (let r = 0; r < n; r++) {
        const row = r + 1;
        const col = genes[r];
        const d1 = row - col;
        const d2 = row + col;
        if ((diag1.get(d1) || 0) > 1 || (diag2.get(d2) || 0) > 1) conflictRows.add(row);
    }

    const conflictDiag1 = [];
    const conflictDiag2 = [];
    for (const [k, c] of diag1.entries()) if (c > 1) conflictDiag1.push({ k, c });
    for (const [k, c] of diag2.entries()) if (c > 1) conflictDiag2.push({ k, c });

    conflictDiag1.sort((a, b) => b.c - a.c);
    conflictDiag2.sort((a, b) => b.c - a.c);

    return { safeD1, safeD2, confD1, confD2, conflictRows, conflictDiag1, conflictDiag2 };
}

function renderSelectedIndividual() {
    const info = $("nq-selected-info");
    const details = $("nq-fitness-details");

    if (!generations.length || currentGenIndex == null || currentIndIndex == null) {
        if (info) info.textContent = "هیچ کروموزومی انتخاب نشده است.";
        if (details) details.textContent = "–";
        return;
    }

    const gen = generations[currentGenIndex];
    const ind = gen.individuals[currentIndIndex];
    const n = ind.genes.length;

    // برد اگر بزرگ باشد، همینجا تمام
    if (n > BOARD_RENDER_LIMIT) {
        if (info) {
            info.textContent =
                `کروموزوم: [${ind.genes.join(" ")}]\n` +
                `عملیات: ${ind.origin || "—"}\n` +
                `برخورد: ${ind.conflicts} | برازندگی: ${ind.fitness}\n` +
                `N=${n} بزرگ است و برد رندر نمی‌شود.`;
        }
        if (details) details.textContent = "–";
        return;
    }

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

    const { safeD1, safeD2, confD1, confD2, conflictRows, conflictDiag1, conflictDiag2 } =
        computeDiagonalSets(ind.genes);

    // هایلایت قطرها
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
                continue;
            }
            const isSafeDiag = safeD1.has(d1) || safeD2.has(d2);
            if (isSafeDiag) sq.classList.add("diag-safe");
        }
    }

    // خود وزیرها: امن/درگیر
    for (let r = 0; r < n; r++) {
        const row1 = r + 1;
        const col = ind.genes[r];
        if (!(col >= 1 && col <= n)) continue;
        const sq = boardSquares[r][col - 1];
        if (conflictRows.has(row1)) sq.classList.add("conflict");
        else sq.classList.add("safe");
    }

    const mp = maxPairs(n);
    const flags = [];
    if (currentIndIndex === gen.bestIndex) flags.push("⭐ بهترین این نسل");
    if (currentIndIndex === gen.targetIndex) flags.push("🎯 مطابق جواب دلخواه");
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
            `fitness = C(${n},2) = ${mp}\n` +
            `روش: d1=i−qᵢ و d2=i+qᵢ (فقط با شمارش تکرار کلیدها)`;
        return;
    }

    const cap = 12;
    const d1Text = conflictDiag1.slice(0, cap).map(x => `d1=${x.k} (count=${x.c})`).join(" ، ");
    const d2Text = conflictDiag2.slice(0, cap).map(x => `d2=${x.k} (count=${x.c})`).join(" ، ");

    const more1 = conflictDiag1.length > cap ? `\n... و ${conflictDiag1.length - cap} قطر اصلیِ درگیر دیگر` : "";
    const more2 = conflictDiag2.length > cap ? `\n... و ${conflictDiag2.length - cap} قطر فرعیِ درگیر دیگر` : "";

    details.textContent =
        `روش قطرها (بدون pairs):\n` +
        `conflicts با جمع‌کردن c1+c2 در حین پیمایش محاسبه می‌شود.\n` +
        `قطرهای اصلیِ درگیر: ${d1Text || "—"}${more1}\n` +
        `قطرهای فرعیِ درگیر: ${d2Text || "—"}${more2}\n` +
        `fitness = C(${n},2) - conflicts = ${mp} - ${ind.conflicts} = ${ind.fitness}`;
}

function renderGeneration(genIndex) {
    if (!generations.length) return;

    genIndex = Math.max(0, Math.min(generations.length - 1, genIndex));
    currentGenIndex = genIndex;

    const gen = generations[genIndex];
    renderBadgeFromGen(gen);

    const label = $("nq-gen-label");
    const statsBox = $("nq-gen-stats");
    const popBox = $("nq-population-box");

    const isLast = genIndex === generations.length - 1;

    let labelText = `ریستارت ${gen.restart + 1} • نسل ${gen.localIndex}`;
    if (gen.localIndex === 0) labelText += " (جمعیت اولیه)";
    if (gen.stats?.manualInitUsed) labelText += " ✍️ (نسل اولیه دستی)";
    if (isLast) labelText += " (آخرین وضعیت)";
    if (gen.stats?.earlyStopped) labelText += " ⏹️ توقف زودهنگام";
    if (gen.stats?.targetMatched) labelText += " 🎯 هدف دلخواه پیدا شد";
    if (gen.stats?.solved) labelText += " ✅ جواب بدون برخورد";

    if (label) label.textContent = labelText;

    if (statsBox && gen.stats) {
        statsBox.textContent =
            `N=${gen.stats.n} | Pop=${gen.stats.popSize} | ` +
            `C(n,2)=${gen.stats.maxPairs} | avgFit=${gen.stats.avgFitness.toFixed(2)} | ` +
            `bestFit=${gen.stats.bestFitness} | bestConf=${gen.stats.bestConflicts} | ` +
            `stale=${gen.stats.stale}/${gen.stats.patience}` +
            (gen.stats.targetEnabled ? ` | target=ON` : ` | target=OFF`);
    }

    if (!popBox) return;
    popBox.innerHTML = "";

    const table = document.createElement("table");
    table.className = "ga-pop-table";

    const thead = document.createElement("thead");
    const headRow = document.createElement("tr");
    ["#", "کروموزوم (جایگشت)", "عملیات", "برخورد", "برازندگی"].forEach(t => {
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

        tr.append(td1, td2, td3, td4, td5);

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

// =========================
// اتصال به DOM
// =========================
document.addEventListener("DOMContentLoaded", () => {
    const form = $("nq-form");
    const slider = $("nq-gen-slider");
    const chkRandom = $("nq-random-init");
    const chkElite = $("nq-elite-enabled");

    initBoard(8);

    function syncManualInitUI() {
        const useRandom = chkRandom ? chkRandom.checked : true;
        setDisabled("nq-init-pop", useRandom);
    }

    function syncEliteUI() {
        const enabled = chkElite ? chkElite.checked : true;
        setDisabled("nq-elite-pct", !enabled);
    }

    if (chkRandom) {
        chkRandom.addEventListener("change", syncManualInitUI);
        syncManualInitUI();
    }
    if (chkElite) {
        chkElite.addEventListener("change", syncEliteUI);
        syncEliteUI();
    }

    if (!form || !slider) return;

    form.addEventListener("submit", (evt) => {
        evt.preventDefault();
        showError("");

        const n = clampInt($("nq-n")?.value, UI_LIMITS.N_MIN, UI_LIMITS.N_MAX);
        if (n < UI_LIMITS.N_MIN || n > UI_LIMITS.N_MAX) {
            showError(`N باید بین ${UI_LIMITS.N_MIN} تا ${UI_LIMITS.N_MAX} باشد.`);
            return;
        }

        const popSize = clampInt($("nq-pop")?.value, UI_LIMITS.POP_MIN, UI_LIMITS.POP_MAX);

        const eliteEnabled = !!$("nq-elite-enabled")?.checked;
        const elitePct = clampInt($("nq-elite-pct")?.value, 0, 100);
        const crossoverPct = clampInt($("nq-crossover")?.value, 0, 100);
        const mutationPct = clampInt($("nq-mutation")?.value, 0, 100);

        const patience = clampInt($("nq-patience")?.value, UI_LIMITS.PATIENCE_MIN, UI_LIMITS.PATIENCE_MAX);
        const maxRestarts = clampInt($("nq-restarts")?.value, UI_LIMITS.RESTARTS_MIN, UI_LIMITS.RESTARTS_MAX);
        const hardMaxGen = clampInt($("nq-hardmax")?.value, UI_LIMITS.HARDMAX_MIN, UI_LIMITS.HARDMAX_MAX);

        const useRandomInit = !!$("nq-random-init")?.checked;

        // manual population
        let manualPop = null;
        if (!useRandomInit) {
            const manualText = $("nq-init-pop")?.value || "";
            const parsed = parseManualPopulation(manualText, n, popSize);
            if (parsed.error) {
                showError(`خطا در نسل اولیه دستی:\n${parsed.error}`);
                return;
            }
            manualPop = parsed.manualPop;
        }

        // target chromosome
        const targetText = $("nq-target")?.value || "";
        const parsedTarget = parseTargetChromosome(targetText, n);
        if (parsedTarget.error) {
            showError(`خطا در "جواب دلخواه":\n${parsedTarget.error}`);
            return;
        }
        const targetGenes = parsedTarget.targetGenes;

        initBoard(n);

        const result = runGA(n, {
            popSize,
            eliteEnabled,
            elitePct,
            crossoverPct,
            mutationPct,
            patience,
            maxRestarts,
            hardMaxGen,
            useRandomInit,
            manualPop,
            targetGenes
        });

        if (result?.error) {
            showError(`خطا در پارامترها:\n${result.error}`);
            return;
        }

        generations = result.generations;

        slider.min = "0";
        slider.max = String(Math.max(0, generations.length - 1));
        slider.value = "0";

        renderGeneration(0);

        if (result.stoppedByTarget) {
            showError(`🎯 اجرا به دلیل پیدا شدن "جواب دلخواه" متوقف شد.`);
            return;
        }
        if (result.solved) {
            showError(`✅ جواب بدون برخورد پیدا شد.`);
            return;
        }

        const b = result.bestOverall;
        showError(
            `⛔️ تا سقف تنظیم‌شده جواب قطعی پیدا نشد.\n` +
            `بهترینِ دیده‌شده: conflicts=${b?.conflicts ?? "?"}, fitness=${b?.fitness ?? "?"}\n` +
            `پیشنهاد: maxRestarts یا hardMaxGen را بیشتر کن.`
        );
    });

    slider.addEventListener("input", (evt) => {
        const v = Number.parseInt(evt.target.value, 10);
        if (!Number.isNaN(v)) renderGeneration(v);
    });

    // اجرای اولیه
    form.dispatchEvent(new Event("submit"));
});
