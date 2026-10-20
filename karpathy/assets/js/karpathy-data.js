/**
 * Course content for the Karpathy learning surface.
 *
 * Every prediction answer was computed from the upstream micrograd source at
 * commit c911406, or from the arithmetic the lecture itself teaches.
 */

export const VARIABLES = [
    { name: "a", value: 2 },
    { name: "b", value: 3 },
    { name: "c", value: 4 },
];

export const PRESETS = [
    "a * b + b ** 3",
    "(a + b) ** 2",
    "relu(a - b) * c",
    "tanh(a * b)",
    "a / b + c",
    "exp(a) - log(b)",
];

export const PREDICTIONS = {
    1: {
        question:
            "با <code>a = 2</code> و <code>b = 3</code>، مشتقِ <code>a * b + b ** 3</code> نسبت به <code>b</code> چقدر است؟",
        answer: 29,
        tolerance: 1e-9,
        explain:
            "قاعدهٔ زنجیره دو راه به <code>b</code> دارد: از <code>a * b</code> می‌آید <code>a = 2</code> و از <code>b ** 3</code> می‌آید <code>3 * b² = 27</code>. جمعشان <code>29</code> می‌شود.",
    },
    2: {
        question: "در دموی <code>MLP(2, [16, 16, 1])</code>، کل شبکه چند پارامتر قابل‌آموزش دارد؟",
        answer: 337,
        tolerance: 0,
        explain:
            "لایهٔ اول ۱۶ نورون با ۲ ورودی: <code>16 × (2 + 1) = 48</code>؛ لایهٔ دوم: <code>16 × (16 + 1) = 272</code>؛ لایهٔ آخر: <code>1 × (16 + 1) = 17</code>. جمع: <code>48 + 272 + 17 = 337</code>.",
    },
    3: {
        question: "در یک لایه با ۱۶ ورودی، هر نورونِ اضافه‌شده چند پارامتر تازه به شبکه اضافه می‌کند؟",
        answer: 17,
        tolerance: 0,
        explain: "هر نورون به ازای هر ورودی یک وزن دارد به‌علاوهٔ یک بایاس: <code>16 + 1 = 17</code> پارامتر.",
    },
    4: {
        question: "در پیاده‌سازی کارپتی، مشتقِ <code>relu</code> در نقطهٔ <code>x = 0</code> چند است؟",
        answer: 0,
        tolerance: 0,
        explain:
            "کدِ کارپتی شرط را <code>out.data &gt; 0</code> می‌گذارد، پس در <code>x = 0</code> مشتق صفر می‌شود — نه نیم و نه یک.",
    },
    5: {
        question: "مشتقِ <code>tanh</code> در نقطهٔ <code>x = 0</code> چقدر است؟",
        answer: 1,
        tolerance: 1e-9,
        explain:
            "از <code>tanh'(x) = 1 − tanh²(x)</code> استفاده می‌کنیم و <code>tanh(0) = 0</code>، پس جواب <code>1</code> می‌شود.",
    },
    6: {
        question:
            "یک لایهٔ <code>conv1d</code> با ۴ کانال ورودی، ۸ کانال خروجی و کرنل ۳ چند پارامتر دارد؟",
        answer: 104,
        tolerance: 0,
        explain: "وزن‌ها: <code>4 × 8 × 3 = 96</code> و بایوس هر کانال خروجی: <code>8</code>؛ جمع <code>104</code>.",
    },
    7: {
        question: "در <code>attention</code> با <code>d = 64</code>، ضریب مقیاس‌دهی <code>1 / √d</code> چند است؟",
        answer: 0.125,
        tolerance: 1e-9,
        explain:
            "<code>√64 = 8</code> و <code>1 / 8 = 0.125</code>. همین مقیاس است که نمره‌های attention را قبل از <code>softmax</code> متعادل می‌کند.",
    },
    8: {
        question:
            "برای رسیدن از ۲۵۶ توکنِ بایتی به واژگانی با ۳۰۰ توکن، چند بار <code>merge</code> لازم است؟",
        answer: 44,
        tolerance: 0,
        explain:
            "هر <code>merge</code> دقیقاً یک توکن تازه به واژگان اضافه می‌کند، پس از ۲۵۶ به ۳۰۰ رسیدن یعنی <code>300 − 256 = 44</code> ادغام.",
    },
};
