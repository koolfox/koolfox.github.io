/**
 * A working micrograd.
 *
 * A faithful port of karpathy/micrograd (commit c911406): scalar values, a
 * dynamically built DAG, a topological backward pass. The reference outputs
 * of that repository (24.7041 / 138.8338 / 645.5773) are asserted against
 * this engine, so a visitor never sees numbers the real engine would not
 * produce.
 *
 * This module is deliberately free of DOM access so it can be exercised
 * outside a browser.
 */

export class ParseError extends Error {}

export function coerce(other) {
    if (typeof other === "number") return new Value(other);
    if (other instanceof Value) return other;
    throw new ParseError("فقط عدد و متغیر مجاز است");
}

export class Value {
    constructor(data, children = [], op = "") {
        this.data = data;
        this.grad = 0;
        this._backward = () => {};
        this._prev = new Set(children);
        this._op = op;
    }

    add(other) {
        const value = coerce(other);
        const out = new Value(this.data + value.data, [this, value], "+");
        out._backward = () => {
            this.grad += out.grad;
            value.grad += out.grad;
        };
        return out;
    }

    mul(other) {
        const value = coerce(other);
        const out = new Value(this.data * value.data, [this, value], "*");
        out._backward = () => {
            this.grad += value.data * out.grad;
            value.grad += this.data * out.grad;
        };
        return out;
    }

    pow(exponent) {
        if (typeof exponent !== "number" || !Number.isFinite(exponent)) {
            throw new ParseError("توان باید یک عدد باشد");
        }
        const out = new Value(this.data ** exponent, [this], `**${exponent}`);
        out._backward = () => {
            this.grad += exponent * this.data ** (exponent - 1) * out.grad;
        };
        return out;
    }

    div(other) {
        const value = coerce(other);
        if (value.data === 0) throw new ParseError("تقسیم بر صفر");
        return this.mul(value.pow(-1));
    }

    neg() {
        return this.mul(-1);
    }

    sub(other) {
        return this.add(coerce(other).neg());
    }

    relu() {
        const out = new Value(this.data < 0 ? 0 : this.data, [this], "ReLU");
        out._backward = () => {
            this.grad += (out.data > 0 ? 1 : 0) * out.grad;
        };
        return out;
    }

    tanh() {
        const out = new Value(Math.tanh(this.data), [this], "tanh");
        out._backward = () => {
            this.grad += (1 - out.data ** 2) * out.grad;
        };
        return out;
    }

    exp() {
        const out = new Value(Math.exp(this.data), [this], "exp");
        out._backward = () => {
            this.grad += out.data * out.grad;
        };
        return out;
    }

    log() {
        const out = new Value(Math.log(this.data), [this], "log");
        out._backward = () => {
            this.grad += (1 / this.data) * out.grad;
        };
        return out;
    }

    sqrt() {
        const out = new Value(Math.sqrt(this.data), [this], "sqrt");
        out._backward = () => {
            this.grad += (0.5 * out.grad) / out.data;
        };
        return out;
    }

    abs() {
        const out = new Value(Math.abs(this.data), [this], "abs");
        out._backward = () => {
            this.grad += Math.sign(this.data) * out.grad;
        };
        return out;
    }

    backward() {
        const topo = [];
        const visited = new Set();
        const build = (node) => {
            if (visited.has(node)) return;
            visited.add(node);
            for (const child of node._prev) build(child);
            topo.push(node);
        };
        build(this);
        this.grad = 1;
        for (const node of [...topo].reverse()) node._backward();
        return topo;
    }
}

export const FUNCTIONS = {
    relu: (value) => value.relu(),
    tanh: (value) => value.tanh(),
    exp: (value) => value.exp(),
    log: (value) => value.log(),
    sqrt: (value) => value.sqrt(),
    abs: (value) => value.abs(),
};

export function tokenize(source) {
    const tokens = [];
    let index = 0;
    while (index < source.length) {
        const character = source[index];
        if (character === " " || character === "\t" || character === "\n") {
            index += 1;
            continue;
        }
        if (/[0-9.]/.test(character)) {
            let end = index;
            while (end < source.length && /[0-9.]/.test(source[end])) end += 1;
            const text = source.slice(index, end);
            const value = Number(text);
            if (!Number.isFinite(value)) throw new ParseError(`عدد نامعتبر: ${text}`);
            tokens.push({ type: "number", value });
            index = end;
            continue;
        }
        if (/[a-zA-Z_]/.test(character)) {
            let end = index;
            while (end < source.length && /[a-zA-Z0-9_]/.test(source[end])) end += 1;
            tokens.push({ type: "name", value: source.slice(index, end) });
            index = end;
            continue;
        }
        if (character === "*" && source[index + 1] === "*") {
            tokens.push({ type: "operator", value: "**" });
            index += 2;
            continue;
        }
        if ("+-*/^(),".includes(character)) {
            tokens.push({ type: "operator", value: character });
            index += 1;
            continue;
        }
        throw new ParseError(`نویسهٔ ناشناخته: ${character}`);
    }
    tokens.push({ type: "end", value: "" });
    return tokens;
}

class Parser {
    constructor(tokens, variables) {
        this.tokens = tokens;
        this.position = 0;
        this.variables = variables;
    }

    peek() {
        return this.tokens[this.position];
    }

    take() {
        return this.tokens[this.position++];
    }

    parse() {
        const value = this.parseExpression();
        if (this.peek().type !== "end") {
            throw new ParseError("عبارت کامل خوانده نشد");
        }
        return value;
    }

    parseExpression() {
        let left = this.parseTerm();
        while (this.peek().value === "+" || this.peek().value === "-") {
            const operator = this.take().value;
            const right = this.parseTerm();
            left = operator === "+" ? left.add(right) : left.sub(right);
        }
        return left;
    }

    parseTerm() {
        let left = this.parseUnary();
        while (this.peek().value === "*" || this.peek().value === "/") {
            const operator = this.take().value;
            const right = this.parseUnary();
            left = operator === "*" ? left.mul(right) : left.div(right);
        }
        return left;
    }

    parseUnary() {
        if (this.peek().value === "-") {
            this.take();
            return this.parseUnary().neg();
        }
        return this.parsePower();
    }

    parsePower() {
        const base = this.parsePrimary();
        if (this.peek().value === "**" || this.peek().value === "^") {
            this.take();
            const exponent = this.parseUnary();
            return base.pow(exponent.data);
        }
        return base;
    }

    parsePrimary() {
        const token = this.take();
        if (token.type === "number") return new Value(token.value);
        if (token.type === "name") {
            if (this.peek().value === "(") {
                this.take();
                const argument = this.parseExpression();
                if (this.peek().value !== ")") throw new ParseError("پرانتز بسته نشده است");
                this.take();
                const fn = FUNCTIONS[token.value];
                if (!fn) throw new ParseError(`تابع ناشناخته: ${token.value}`);
                return fn(argument);
            }
            const variable = this.variables.get(token.value);
            if (!variable) throw new ParseError(`متغیر ناشناخته: ${token.value}`);
            return variable;
        }
        if (token.value === "(") {
            const inner = this.parseExpression();
            if (this.peek().value !== ")") throw new ParseError("پرانتز بسته نشده است");
            this.take();
            return inner;
        }
        throw new ParseError("عبارت نامعتبر");
    }
}

export function evaluate(source, variables) {
    if (!source.trim()) throw new ParseError("عبارتی ننوشته‌ای");
    return new Parser(tokenize(source), variables).parse();
}

/**
 * The example from the upstream README, rebuilt operation by operation so
 * the graph matches the one karpathy draws. Returns the reference numbers.
 */
export function referenceCheck() {
    const a = new Value(-4.0);
    const b = new Value(2.0);

    let c = a.add(b);
    let d = a.mul(b).add(b.pow(3));
    c = c.add(c.add(1));
    c = c.add(c.add(1).add(a.neg()));
    d = d.add(d.mul(2).add(b.add(a).relu()));
    d = d.add(d.mul(3).add(b.sub(a).relu()));
    const e = c.sub(d);
    const f = e.pow(2);
    const g = f.div(2);
    const out = g.add(f.pow(-1).mul(10));
    out.backward();

    return { value: out.data, da: a.grad, db: b.grad };
}

export const NODE_WIDTH = 88;
export const NODE_HEIGHT = 46;
export const GAP_X = 58;
export const GAP_Y = 18;
export const PADDING = 10;

export function collectGraph(root) {
    const nodes = [];
    const seen = new Set();
    const walk = (node) => {
        if (seen.has(node)) return;
        seen.add(node);
        for (const child of node._prev) walk(child);
        nodes.push(node);
    };
    walk(root);

    const layers = new Map();
    const layerOf = (node) => {
        if (layers.has(node)) return layers.get(node);
        layers.set(node, 0);
        let depth = 0;
        for (const child of node._prev) depth = Math.max(depth, layerOf(child) + 1);
        layers.set(node, depth);
        return depth;
    };
    for (const node of nodes) layerOf(node);

    const columns = [];
    for (const node of nodes) {
        const depth = layers.get(node);
        if (!columns[depth]) columns[depth] = [];
        columns[depth].push(node);
    }

    const maxRows = columns.reduce((most, column) => Math.max(most, column.length), 0);
    const positions = new Map();
    for (const [depth, column] of columns.entries()) {
        const columnHeight = column.length * NODE_HEIGHT + (column.length - 1) * GAP_Y;
        const columnHeightMax = maxRows * NODE_HEIGHT + (maxRows - 1) * GAP_Y;
        const startY = PADDING + (columnHeightMax - columnHeight) / 2;
        column.forEach((node, row) => {
            positions.set(node, {
                x: PADDING + depth * (NODE_WIDTH + GAP_X),
                y: startY + row * (NODE_HEIGHT + GAP_Y),
            });
        });
    }

    const width = PADDING * 2 + columns.length * NODE_WIDTH + (columns.length - 1) * GAP_X;
    const height = PADDING * 2 + maxRows * NODE_HEIGHT + (maxRows - 1) * GAP_Y;
    return { nodes, columns, positions, width, height };
}

export function elbowPath(x1, y1, x2, y2) {
    const middle = x1 + (x2 - x1) / 2;
    return `M ${x1} ${y1} H ${middle} V ${y2} H ${x2}`;
}

export function formatNumber(value) {
    if (!Number.isFinite(value)) return String(value);
    if (Number.isInteger(value)) return String(value);
    const magnitude = Math.abs(value);
    if (magnitude !== 0 && (magnitude >= 1e7 || magnitude < 1e-5)) return value.toExponential(4);
    return String(Number(value.toFixed(6)));
}
