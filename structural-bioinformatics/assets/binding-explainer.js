/** An explicit schematic of binding/competition, never a molecular trajectory. */
import { linkGlossaryTerms } from './glossary-terms.js';
const steps = [
  "TNF می‌تواند به گیرندهٔ TNFR روی سلول متصل شود. این اتصال آغازگر پیام‌رسانی درون سلول است؛ در زمینهٔ التهاب، این مسیر می‌تواند پاسخ التهابی را تقویت کند.",
  "بخش شناسایی‌کنندهٔ آدالیموماب، یعنی Fab، به سطحی از TNF متصل می‌شود که با محل اتصال گیرنده هم‌پوشانی دارد. در این طرح، TNF پوشیده‌شده از گیرنده جدا نشان داده شده تا مسدودشدن تعامل روشن باشد.",
  "با محدودشدن اتصال TNF به گیرنده، پیام‌رسانی وابسته به آن کاهش می‌یابد. نتیجهٔ بالینی را باید جدا سنجید؛ این طرح مقدار کاهش CRP، حذف عفونت یا مرگ سلول سرطانی را پیش‌بینی نمی‌کند.",
];

function diagram(step) {
  const blocked = step > 0;
  const centerY = blocked ? 94 : 132;
  const cellColor = step === 2 ? "#f0f3f8" : "#edf2fc";
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 640 330" role="img" aria-labelledby="binding-svg-title binding-svg-desc">
    <title id="binding-svg-title">${["اتصال TNF به گیرنده", "اتصال Fab به TNF", "کاهش پیام وابسته به TNF"][step]}</title>
    <desc id="binding-svg-desc">طرح مفهومی، بدون مقیاس و مختصات اتمی؛ سه دایره نماد TNF و گیرنده در غشای سلول است.</desc>
    <path d="M35 205H605V294H35Z" fill="${cellColor}"/>
    <path d="M35 199H605M35 208H605" fill="none" stroke="#8da7cf" stroke-width="2"/>
    <path d="M302 244V201L286 168M322 244V201L339 168" fill="none" stroke="#536179" stroke-width="9" stroke-linecap="round"/>
    <path d="M287 169Q312 187 338 169" fill="none" stroke="#536179" stroke-width="5" stroke-linecap="round"/>
    <g transform="translate(312 ${centerY})" fill="#087b73" stroke="#fff" stroke-width="2">
      <circle cx="-16" cy="-6" r="23"/><circle cx="16" cy="-6" r="23"/><circle cx="0" cy="20" r="23"/>
    </g>
    ${blocked ? `<g fill="none" stroke-linecap="round"><path d="M400 40L349 83L337 103" stroke="#a95015" stroke-width="10"/><path d="M411 54L365 95L351 114" stroke="#245cb7" stroke-width="8"/></g>
      <path d="M299 151L325 177M325 151L299 177" fill="none" stroke="#912c3d" stroke-width="3"/>` : ""}
    ${step !== 1 ? `<path d="M312 252V274M305 267L312 274L319 267" fill="none" stroke="${step === 2 ? "#8da7cf" : "#245dc4"}" stroke-width="3" ${step === 2 ? 'stroke-dasharray="4 5"' : ""}/>` : ""}
    <g font-family="arad, sans-serif" font-size="17" fill="#172339" text-anchor="middle">
      <text x="235" y="${centerY + 4}" direction="ltr">TNF</text>
      <text x="387" y="223" direction="ltr">TNFR</text>
      <text x="515" y="266">درون سلول</text>
      ${blocked ? '<text x="490" y="45" direction="ltr">Fab (H/L)</text>' : ""}
      <text x="312" y="314">${step === 0 ? "پیام‌رسانی" : step === 1 ? "محدودشدن اتصال به گیرنده" : "پیام‌رسانی وابسته به TNF کمتر"}</text>
    </g>
  </svg>`;
}

export function initializeBindingExplainer() {
  const container = document.getElementById("binding-diagram");
  const readout = document.getElementById("binding-explanation");
  const buttons = [...document.querySelectorAll("[data-binding-step]")];
  if (!container || !readout || !buttons.length) return;
  function show(step) {
    container.innerHTML = diagram(step);
    container.dataset.step = String(step);
    readout.textContent = steps[step];
    linkGlossaryTerms(readout);
    for (const button of buttons) button.setAttribute("aria-pressed", String(Number(button.dataset.bindingStep) === step));
  }
  for (const button of buttons) button.addEventListener("click", () => show(Number(button.dataset.bindingStep)));
  show(0);
}
