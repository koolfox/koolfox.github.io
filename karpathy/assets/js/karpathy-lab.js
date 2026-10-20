/**
 * Karpathy learning surface — page behaviour.
 *
 * Wires the workbench (variables, expression, run, graph), the prediction
 * exercises and the progress tracker to the engine in engine.js.
 */

import {
    NODE_WIDTH,
    NODE_HEIGHT,
    ParseError,
    Value,
    collectGraph,
    elbowPath,
    evaluate,
    formatNumber,
    referenceCheck,
} from "./engine.js";
import { PREDICTIONS, PRESETS, VARIABLES } from "./karpathy-data.js";

const STORAGE_KEY = "koolfox.karpathy.progress.v1";
const TOTAL_LESSONS = 8;

const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
let runToken = 0;

const elements = {
    variableFields: document.getElementById("variable-fields"),
    expression: document.getElementById("expression"),
    run: document.getElementById("run"),
    result: document.getElementById("lab-result"),
    sheet: document.getElementById("graph-sheet"),
    presetRow: document.getElementById("preset-row"),
    progressLabel: document.getElementById("progress-label"),
    predictionCount: document.getElementById("prediction-count"),
    progressBar: document.getElementById("progress-bar"),
    progressFill: document.getElementById("progress-fill"),
};

const progress = {
    watched: new Set(),
    predictions: {},
};

/* ── the workbench ───────────────────────────────────────────── */

function buildVariableFields() {
    elements.variableFields.textContent = "";
    for (const variable of VARIABLES) {
        const wrapper = document.createElement("div");
        wrapper.className = "variable-field";

        const label = document.createElement("label");
        label.textContent = variable.name;
        label.htmlFor = `variable-${variable.name}`;

        const input = document.createElement("input");
        input.type = "number";
        input.id = `variable-${variable.name}`;
        input.value = String(variable.value);
        input.step = "any";
        input.dataset.variable = variable.name;

        wrapper.append(label, input);
        elements.variableFields.append(wrapper);
    }
}

function buildPresets() {
    elements.presetRow.textContent = "";
    for (const preset of PRESETS) {
        const chip = document.createElement("button");
        chip.type = "button";
        chip.className = "preset-chip";
        chip.textContent = preset;
        chip.dir = "ltr";
        chip.addEventListener("click", () => {
            elements.expression.value = preset;
            run();
        });
        elements.presetRow.append(chip);
    }
}

function readVariables() {
    const variables = new Map();
    for (const input of elements.variableFields.querySelectorAll("input[data-variable]")) {
        const raw = Number(input.value);
        variables.set(input.dataset.variable, new Value(Number.isFinite(raw) ? raw : 0));
    }
    return variables;
}

function renderResult(root, variables) {
    elements.result.textContent = "";

    const valueList = document.createElement("dl");
    valueList.className = "result-value";

    const term = document.createElement("dt");
    term.textContent = "مقدار عبارت";
    const description = document.createElement("dd");
    description.textContent = formatNumber(root.data);
    description.dir = "ltr";
    valueList.append(term, description);

    const table = document.createElement("table");
    table.className = "gradient-table";

    const head = document.createElement("thead");
    const headRow = document.createElement("tr");
    for (const label of ["متغیر", "گرادیان"]) {
        const cell = document.createElement("th");
        cell.scope = "col";
        cell.textContent = label;
        headRow.append(cell);
    }
    head.append(headRow);

    const body = document.createElement("tbody");
    for (const [name, node] of variables) {
        const row = document.createElement("tr");
        const nameCell = document.createElement("th");
        nameCell.scope = "row";
        nameCell.textContent = `∂ / ∂ ${name}`;
        nameCell.dir = "ltr";
        const valueCell = document.createElement("td");
        valueCell.textContent = formatNumber(node.grad);
        row.append(nameCell, valueCell);
        body.append(row);
    }
    table.append(head, body);

    elements.result.append(valueList, table);
}

function showError(message) {
    elements.result.textContent = "";
    const box = document.createElement("div");
    box.className = "lab-error";
    box.textContent = message;
    elements.result.append(box);
}

/**
 * Draws the graph in Karpathy's own draw_dot idiom: small square boxes, the
 * value on top and the gradient underneath, joined by right-angle edges.
 */
function drawGraph(graph, root) {
    elements.sheet.textContent = "";
    const namespace = "http://www.w3.org/2000/svg";
    const svg = document.createElementNS(namespace, "svg");
    svg.setAttribute("viewBox", `0 0 ${graph.width} ${graph.height}`);
    svg.setAttribute("width", String(graph.width));
    svg.setAttribute("height", String(graph.height));
    svg.setAttribute("role", "img");
    svg.setAttribute(
        "aria-label",
        `گراف محاسبات با ${graph.nodes.length} گره و مقدار نهایی ${formatNumber(root.data)}`,
    );

    const edgeLayer = document.createElementNS(namespace, "g");
    const nodeLayer = document.createElementNS(namespace, "g");
    svg.append(edgeLayer, nodeLayer);

    const drawn = new Map();
    const incoming = new Map();

    for (const node of graph.nodes) {
        const target = graph.positions.get(node);
        const group = document.createElementNS(namespace, "g");
        group.setAttribute("class", `graph-node${node === root ? " is-output" : ""}`);
        group.setAttribute("transform", `translate(${target.x} ${target.y})`);

        const inner = document.createElementNS(namespace, "g");
        inner.setAttribute("class", "graph-node-inner");

        const rect = document.createElementNS(namespace, "rect");
        rect.setAttribute("width", String(NODE_WIDTH));
        rect.setAttribute("height", String(NODE_HEIGHT));
        rect.setAttribute("rx", "4");
        inner.append(rect);

        const value = document.createElementNS(namespace, "text");
        value.setAttribute("x", String(NODE_WIDTH / 2));
        value.setAttribute("y", "19");
        value.setAttribute("text-anchor", "middle");
        value.setAttribute("class", "graph-value");
        value.textContent = formatNumber(node.data);
        inner.append(value);

        const rule = document.createElementNS(namespace, "line");
        rule.setAttribute("x1", "9");
        rule.setAttribute("x2", String(NODE_WIDTH - 9));
        rule.setAttribute("y1", "25.5");
        rule.setAttribute("y2", "25.5");
        rule.setAttribute("class", "graph-rule");
        inner.append(rule);

        const grad = document.createElementNS(namespace, "text");
        grad.setAttribute("x", String(NODE_WIDTH / 2));
        grad.setAttribute("y", "37");
        grad.setAttribute("text-anchor", "middle");
        grad.setAttribute("class", "graph-grad");
        grad.textContent = formatNumber(node.grad);
        inner.append(grad);

        group.append(inner);
        nodeLayer.append(group);
        drawn.set(node, { node, group, inner, grad });
    }

    for (const node of graph.nodes) {
        const target = graph.positions.get(node);
        const paths = [];
        for (const child of node._prev) {
            const source = graph.positions.get(child);
            const path = document.createElementNS(namespace, "path");
            path.setAttribute(
                "d",
                elbowPath(
                    source.x + NODE_WIDTH,
                    source.y + NODE_HEIGHT / 2,
                    target.x,
                    target.y + NODE_HEIGHT / 2,
                ),
            );
            path.setAttribute("class", "graph-edge");
            edgeLayer.append(path);
            paths.push(path);
        }
        incoming.set(node, paths);
    }

    elements.sheet.append(svg);
    return { svg, drawn, incoming };
}

function tweenNumber(element, from, to, duration) {
    if (duration <= 0 || reducedMotion.matches) {
        element.textContent = formatNumber(to);
        return Promise.resolve();
    }
    return new Promise((resolve) => {
        const start = performance.now();
        const step = (now) => {
            const progress = Math.min(1, (now - start) / duration);
            const eased = 1 - (1 - progress) ** 3;
            element.textContent = formatNumber(from + (to - from) * eased);
            if (progress < 1) {
                requestAnimationFrame(step);
            } else {
                element.textContent = formatNumber(to);
                resolve();
            }
        };
        requestAnimationFrame(step);
    });
}

async function animateGraph(drawing, topo) {
    const token = runToken;

    for (const [, entry] of drawing.drawn) {
        entry.group.style.opacity = "0";
        entry.grad.textContent = formatNumber(0);
    }
    for (const paths of drawing.incoming.values()) {
        for (const path of paths) path.classList.remove("is-active");
    }

    if (reducedMotion.matches) {
        for (const [, entry] of drawing.drawn) {
            entry.group.style.opacity = "1";
            entry.grad.textContent = formatNumber(entry.node.grad);
        }
        return;
    }

    for (const node of topo) {
        if (token !== runToken) return;
        const entry = drawing.drawn.get(node);
        entry.inner.animate(
            [
                { opacity: 0, transform: "scale(0.88)" },
                { opacity: 1, transform: "scale(1)" },
            ],
            { duration: 190, easing: "cubic-bezier(.19,1,.22,1)", fill: "both" },
        );
        entry.group.style.opacity = "1";
        await new Promise((resolve) => setTimeout(resolve, 60));
    }

    for (const node of [...topo].reverse()) {
        if (token !== runToken) return;
        const entry = drawing.drawn.get(node);
        entry.group.classList.add("is-active");
        for (const path of drawing.incoming.get(node)) path.classList.add("is-active");
        await tweenNumber(entry.grad, 0, node.grad, 400);
        if (token !== runToken) return;
        entry.group.classList.remove("is-active");
        for (const path of drawing.incoming.get(node)) path.classList.remove("is-active");
    }
}

function run() {
    runToken += 1;
    const token = runToken;
    try {
        const variables = readVariables();
        const root = evaluate(elements.expression.value, variables);
        const topo = root.backward();
        renderResult(root, variables);
        const graph = collectGraph(root);
        const drawing = drawGraph(graph, root);
        animateGraph(drawing, topo).then(() => {
            if (token !== runToken) return;
            for (const paths of drawing.incoming.values()) {
                for (const path of paths) path.classList.remove("is-active");
            }
        });
    } catch (error) {
        showError(error instanceof ParseError ? error.message : `خطا: ${error.message}`);
        elements.sheet.textContent = "";
    }
}

/* ── progress tracker ────────────────────────────────────────── */

function readStoredProgress() {
    try {
        const raw = window.localStorage.getItem(STORAGE_KEY);
        if (!raw) return { watched: [], predictions: {} };
        const parsed = JSON.parse(raw);
        return {
            watched: Array.isArray(parsed.watched) ? parsed.watched : [],
            predictions:
                parsed.predictions && typeof parsed.predictions === "object" ? parsed.predictions : {},
        };
    } catch {
        return { watched: [], predictions: {} };
    }
}

function writeStoredProgress() {
    try {
        window.localStorage.setItem(
            STORAGE_KEY,
            JSON.stringify({ watched: [...progress.watched], predictions: progress.predictions }),
        );
    } catch {
        /* storage may be unavailable; the page still works for this visit */
    }
}

function updateProgressPanel() {
    const watched = progress.watched.size;
    elements.progressLabel.textContent = `${watched.toLocaleString("fa-IR")} از ${TOTAL_LESSONS.toLocaleString("fa-IR")} جلسه دیده شده`;
    const answered = Object.keys(progress.predictions).length;
    elements.predictionCount.textContent = `${answered.toLocaleString("fa-IR")} پیش‌بینی بررسی‌شده`;
    elements.progressBar.setAttribute("aria-valuenow", String(watched));
    elements.progressFill.style.transform = `scaleX(${watched / TOTAL_LESSONS})`;
}

function persist() {
    writeStoredProgress();
    updateProgressPanel();
}

function restoreProgress() {
    const stored = readStoredProgress();
    stored.watched.forEach((id) => progress.watched.add(Number(id)));
    progress.predictions = stored.predictions;

    for (const checkbox of document.querySelectorAll("input[data-progress]")) {
        const id = Number(checkbox.dataset.progress);
        checkbox.checked = progress.watched.has(id);
        checkbox.closest(".lecture")?.classList.toggle("is-watched", checkbox.checked);
    }
    updateProgressPanel();
}

/* ── prediction exercises ─────────────────────────────────────── */

function showVerdict(correct, guess, verdict, explain, spec) {
    verdict.className = `prediction-verdict ${correct ? "is-correct" : "is-wrong"}`;
    verdict.textContent = correct
        ? `درست بود! پاسخ ${formatNumber(spec.answer)} است.`
        : `پاسخ درست ${formatNumber(spec.answer)} است، نه ${guess}.`;
    explain.innerHTML = spec.explain;
}

function buildPrediction(container) {
    const id = Number(container.dataset.prediction);
    const spec = PREDICTIONS[id];
    if (!spec) return;

    container.textContent = "";

    const question = document.createElement("p");
    question.className = "prediction-question";
    question.innerHTML = spec.question;

    const row = document.createElement("div");
    row.className = "prediction-row";

    const input = document.createElement("input");
    input.type = "text";
    input.inputMode = "decimal";
    input.placeholder = "عدد";
    input.dir = "ltr";
    input.setAttribute("aria-label", "پیش‌بینی شما");

    const button = document.createElement("button");
    button.type = "button";
    button.className = "ghost-button";
    button.textContent = "بررسی";

    row.append(input, button);

    const verdict = document.createElement("p");
    verdict.className = "prediction-verdict";
    verdict.setAttribute("aria-live", "polite");

    const explain = document.createElement("p");
    explain.className = "prediction-explain";

    container.append(question, row, verdict, explain);

    const stored = progress.predictions[id];
    if (stored) {
        input.value = stored.guess;
        showVerdict(stored.correct, stored.guess, verdict, explain, spec);
    }

    const check = () => {
        const guess = Number(input.value.replace(/[^0-9.eE+-]/g, ""));
        if (!Number.isFinite(guess) || input.value.trim() === "") {
            verdict.className = "prediction-verdict is-wrong";
            verdict.textContent = "یک عدد وارد کن.";
            explain.innerHTML = "";
            return;
        }
        const correct = Math.abs(guess - spec.answer) <= spec.tolerance;
        progress.predictions[id] = { guess: input.value.trim(), correct };
        persist();
        showVerdict(correct, input.value.trim(), verdict, explain, spec);
    };

    button.addEventListener("click", check);
    input.addEventListener("keydown", (event) => {
        if (event.key === "Enter") {
            event.preventDefault();
            check();
        }
    });
}

function bindCatalogue() {
    for (const button of document.querySelectorAll('[data-action="predict"]')) {
        button.addEventListener("click", () => {
            const container = button.closest(".lecture").querySelector(".prediction");
            const wasOpen = !container.hidden;
            container.hidden = wasOpen;
            button.textContent = wasOpen ? "پیش‌بینی کن" : "بستن";
            if (!wasOpen) {
                buildPrediction(container);
                container.querySelector("input")?.focus();
            }
        });
    }

    for (const checkbox of document.querySelectorAll("input[data-progress]")) {
        checkbox.addEventListener("change", () => {
            const id = Number(checkbox.dataset.progress);
            if (checkbox.checked) {
                progress.watched.add(id);
            } else {
                progress.watched.delete(id);
            }
            checkbox.closest(".lecture")?.classList.toggle("is-watched", checkbox.checked);
            persist();
        });
    }

    const reset = document.getElementById("reset-progress");
    if (reset) {
        reset.addEventListener("click", () => {
            progress.watched.clear();
            progress.predictions = {};
            persist();
            for (const checkbox of document.querySelectorAll("input[data-progress]")) {
                checkbox.checked = false;
                checkbox.closest(".lecture")?.classList.remove("is-watched");
            }
            for (const container of document.querySelectorAll(".prediction")) {
                container.hidden = true;
                const button = container.closest(".lecture").querySelector('[data-action="predict"]');
                if (button) button.textContent = "پیش‌بینی کن";
            }
        });
    }
}

/* ── lecture thumbnails ──────────────────────────────────────── */

const PLAY_MARK = `<svg viewBox="0 0 24 24" width="26" height="26" aria-hidden="true" focusable="false">
        <path d="M8 5.5v13l11-6.5z" fill="currentColor"></path>
    </svg>`;

/**
 * YouTube's thumbnail host is a third party. When an image fails, the lesson
 * still has to read as a lesson, so the thumbnail is replaced by a neutral
 * plate and the watch link keeps working.
 */
function bindThumbnails() {
    for (const image of document.querySelectorAll(".lecture-thumb img")) {
        image.addEventListener(
            "error",
            () => {
                const lesson = image.closest(".lecture");
                const number = lesson?.dataset.lesson ?? "";
                const plate = document.createElement("span");
                plate.className = "thumb-fallback";
                plate.innerHTML = PLAY_MARK;
                const label = document.createElement("span");
                label.className = "thumb-fallback-label";
                label.textContent = `جلسهٔ ${number}`;
                plate.append(label);
                image.replaceWith(plate);
            },
            { once: true },
        );
    }
}

/* ── boot ────────────────────────────────────────────────────── */

buildVariableFields();
buildPresets();
bindCatalogue();
bindThumbnails();
restoreProgress();

elements.run.addEventListener("click", run);
elements.expression.addEventListener("keydown", (event) => {
    if (event.key === "Enter") {
        event.preventDefault();
        run();
    }
});

const reference = referenceCheck();
const referenceOk =
    Math.abs(reference.value - 24.7041) < 1e-4 &&
    Math.abs(reference.da - 138.8338) < 1e-4 &&
    Math.abs(reference.db - 645.5773) < 1e-4;
if (!referenceOk) {
    showError("بررسی سازگاری با micrograd ناموفق بود — اعداد این صفحه معتبر نیستند.");
}

run();

window.karpathyLab = {
    run,
    evaluate,
    referenceCheck,
    referenceOk,
    predictions: PREDICTIONS,
    progress,
};
