"use strict";

function clamp(v, lo, hi) {
    return Math.max(lo, Math.min(hi, v));
}

function maxPairs(n) {
    return (n * (n - 1)) / 2;
}

function randomPermutation(n) {
    const arr = Array.from({ length: n }, (_, i) => i + 1);
    for (let i = n - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
}

function conflictsSlowPairwise(genes) {
    const n = genes.length;
    let conflicts = 0;

    for (let i = 0; i < n; i++) {
        for (let j = i + 1; j < n; j++) {
            const qi = genes[i];
            const qj = genes[j];
            if (Math.abs(qi - qj) === Math.abs((i + 1) - (j + 1))) conflicts++;
        }
    }
    return conflicts;
}

function conflictsFastDiagonals(genes) {
    const n = genes.length;
    const diag1 = new Map();
    const diag2 = new Map();
    let conflicts = 0;

    for (let idx = 0; idx < n; idx++) {
        const row = idx + 1;
        const col = genes[idx];
        const d1 = row - col;
        const d2 = row + col;

        const c1 = diag1.get(d1) || 0;
        const c2 = diag2.get(d2) || 0;

        conflicts += c1 + c2;

        diag1.set(d1, c1 + 1);
        diag2.set(d2, c2 + 1);
    }

    return conflicts;
}

let boardSquares = [];
let currentN = 8;

function initBoard(n) {
    currentN = n;
    const board = document.getElementById("nq-board");
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

function conflictRowsByCounts(genes) {
    const n = genes.length;
    const diag1Count = new Map();
    const diag2Count = new Map();

    for (let r = 0; r < n; r++) {
        const row = r + 1;
        const col = genes[r];
        const d1 = row - col;
        const d2 = row + col;
        diag1Count.set(d1, (diag1Count.get(d1) || 0) + 1);
        diag2Count.set(d2, (diag2Count.get(d2) || 0) + 1);
    }

    const conflictRows = new Set();
    for (let r = 0; r < n; r++) {
        const row = r + 1;
        const col = genes[r];
        const d1 = row - col;
        const d2 = row + col;
        if ((diag1Count.get(d1) || 0) > 1 || (diag2Count.get(d2) || 0) > 1) {
            conflictRows.add(row);
        }
    }

    return conflictRows;
}

function setText(id, text) {
    const el = document.getElementById(id);
    if (el) el.textContent = text;
}


function buildFlowSlowPairwise(genes, pairLimit = 50000) {
    const n = genes.length;
    const lines = [];
    let conflicts = 0;
    let shown = 0;

    lines.push(`genes = [${genes.join(", ")}]`);
    lines.push(`rule: conflict if |qi - qj| == |i - j| (rows are 1-based)`);
    lines.push(`----------------------------------------`);

    for (let i = 0; i < n; i++) {
        for (let j = i + 1; j < n; j++) {
            if (shown >= pairLimit) {
                lines.push(`... truncated: too many pairs (shown ${pairLimit}, total pairs = ${maxPairs(n)})`);
                lines.push(`conflicts counted (from shown part) = ${conflicts}`);
                return { text: lines.join("\n"), conflictsShown: conflicts, truncated: true };
            }

            const ri = i + 1, rj = j + 1;
            const qi = genes[i], qj = genes[j];
            const lhs = Math.abs(qi - qj);
            const rhs = Math.abs(ri - rj);
            const hit = lhs === rhs;

            if (hit) conflicts++;

            lines.push(
                `pair (r${ri}, r${rj}): q=(c${qi}, c${qj}) -> |${qi}-${qj}|=${lhs} vs |${ri}-${rj}|=${rhs} ` +
                `=> ${hit ? "CONFLICT (+1)" : "ok"}`
            );

            shown++;
        }
    }

    lines.push(`----------------------------------------`);
    lines.push(`total conflicts = ${conflicts}`);
    return { text: lines.join("\n"), conflictsShown: conflicts, truncated: false };
}

function buildFlowFastDiagonals(genes) {
    const n = genes.length;
    const diag1 = new Map();
    const diag2 = new Map();
    const lines = [];
    let conflicts = 0;

    lines.push(`genes = [${genes.join(", ")}]`);
    lines.push(`d1 = row - col, d2 = row + col`);
    lines.push(`on each row: newConflicts = count(d1) + count(d2) from previous rows`);
    lines.push(`----------------------------------------`);

    for (let idx = 0; idx < n; idx++) {
        const row = idx + 1;
        const col = genes[idx];
        const d1 = row - col;
        const d2 = row + col;

        const c1 = diag1.get(d1) || 0;
        const c2 = diag2.get(d2) || 0;

        const add = c1 + c2;
        conflicts += add;

        lines.push(
            `row ${row}: col=${col} -> d1=${d1}, d2=${d2} | prevCount(d1)=${c1}, prevCount(d2)=${c2} ` +
            `=> add ${add}, total=${conflicts}`
        );

        diag1.set(d1, c1 + 1);
        diag2.set(d2, c2 + 1);
    }

    lines.push(`----------------------------------------`);
    lines.push(`total conflicts = ${conflicts}`);
    return { text: lines.join("\n"), conflicts };
}

function renderSample(genes, slow, fast) {
    const info = document.getElementById("nq-board-info");
    const n = genes.length;

    if (n !== currentN) initBoard(n);

    for (let r = 0; r < n; r++) {
        for (let c = 0; c < n; c++) {
            const sq = boardSquares[r][c];
            sq.textContent = "";
            sq.classList.remove("q", "conflict-q");
            sq.style.background = "";
            sq.style.color = "";
        }
    }

    const conflictRows = conflictRowsByCounts(genes);

    for (let r = 0; r < n; r++) {
        const row1 = r + 1;
        const col = genes[r];
        if (!(col >= 1 && col <= n)) continue;

        const sq = boardSquares[r][col - 1];
        sq.textContent = "♛";
        sq.classList.add("q");

        if (conflictRows.has(row1)) sq.classList.add("conflict-q");
    }

    const mp = maxPairs(n);
    if (info) {
        info.textContent =
            `genes: ${genes.join(" ")}\n` +
            `slow(pairwise) = ${slow}\n` +
            `fast(diagonals) = ${fast}\n` +
            `fitness = C(n,2) - conflicts = ${mp} - ${fast} = ${mp - fast}`;
    }

    const slowFlow = buildFlowSlowPairwise(genes, 220);
    const fastFlow = buildFlowFastDiagonals(genes);

    setText("nq-flow-slow", slowFlow.text);
    setText("nq-flow-fast", fastFlow.text);
}

function runAutoTests() {
    const n = clamp(parseInt(document.getElementById("nq-n")?.value || "8", 10) || 8, 4, 96);
    const trials = clamp(parseInt(document.getElementById("nq-test-count")?.value || "1000", 10) || 1000, 1, 50000);

    initBoard(n);

    let firstMismatch = null;

    for (let t = 0; t < trials; t++) {
        const g = randomPermutation(n);
        const slow = conflictsSlowPairwise(g);
        const fast = conflictsFastDiagonals(g);

        if (slow !== fast) {
            firstMismatch = { genes: g, slow, fast, index: t + 1 };
            break;
        }
    }

    if (!firstMismatch) {
        setText("nq-test-result", `✅ PASS — ${trials} نمونه تصادفی: fast و slow همیشه برابر بودند.`);
        setText(
            "nq-test-details",
            `Fast (یک حلقه با Map قطرها) دقیقاً همان تعداد برخوردی را می‌دهد که Slow (دوحلقه‌ای روی همه‌ی جفت‌ها).\n` +
            `پس بدون pairs هم conflicts درست شمرده می‌شود.`
        );

        const g = randomPermutation(n);
        const slow = conflictsSlowPairwise(g);
        const fast = conflictsFastDiagonals(g);
        renderSample(g, slow, fast);
        return;
    }

    setText("nq-test-result", `❌ FAIL — mismatch در نمونه‌ی شماره ${firstMismatch.index} از ${trials}`);
    setText(
        "nq-test-details",
        `genes: ${firstMismatch.genes.join(" ")}\n` +
        `slow(pairwise)=${firstMismatch.slow} | fast(diagonals)=${firstMismatch.fast}\n` +
        `این نمونه روی برد و در فلوچارت نمایش داده شد.`
    );

    renderSample(firstMismatch.genes, firstMismatch.slow, firstMismatch.fast);
}

function showRandomSample() {
    const n = clamp(parseInt(document.getElementById("nq-n")?.value || "8", 10) || 8, 4, 96);
    initBoard(n);

    const g = randomPermutation(n);
    const slow = conflictsSlowPairwise(g);
    const fast = conflictsFastDiagonals(g);

    setText("nq-test-result", `🎲 نمونه تصادفی نمایش داده شد.`);
    setText("nq-test-details", `slow=${slow} | fast=${fast}`);

    renderSample(g, slow, fast);
}

function showSolvedSample() {
    const n = clamp(parseInt(document.getElementById("nq-n")?.value || "8", 10) || 8, 4, 96);

    let g;
    if (n === 8) g = [1, 5, 8, 6, 3, 7, 2, 4];
    else g = randomPermutation(n);

    initBoard(n);

    const slow = conflictsSlowPairwise(g);
    const fast = conflictsFastDiagonals(g);

    setText("nq-test-result", `✅ نمونه (حل/یا تصادفی) نمایش داده شد.`);
    setText("nq-test-details", `slow=${slow} | fast=${fast}`);

    renderSample(g, slow, fast);
}

document.addEventListener("DOMContentLoaded", () => {
    const btnRun = document.getElementById("nq-run-tests");
    const btnRandom = document.getElementById("nq-show-random");
    const btnSolved = document.getElementById("nq-show-solved");

    const n = clamp(parseInt(document.getElementById("nq-n")?.value || "8", 10) || 8, 4, 96);
    initBoard(n);

    if (btnRun) btnRun.addEventListener("click", runAutoTests);
    if (btnRandom) btnRandom.addEventListener("click", showRandomSample);
    if (btnSolved) btnSolved.addEventListener("click", showSolvedSample);

    runAutoTests();
});
