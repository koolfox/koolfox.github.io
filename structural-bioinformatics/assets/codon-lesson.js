// A reference-sequence lesson. No patient RNA-seq reconstruction or reverse translation.
const $ = id => document.getElementById(id);
const fa = new Intl.NumberFormat('fa-IR');
let data;
let selected = 0;
let terminal = false;
const make = (tag, text, className) => {
  const node = document.createElement(tag);
  if (text !== undefined) node.textContent = text;
  if (className) node.className = className;
  return node;
};

function row(label, value, latin = false) {
  const group = make('div');
  const output = make('dd');
  if (latin) {
    const span = make('bdi', value);
    span.dir = 'ltr';
    output.append(span);
  } else output.textContent = value;
  group.append(make('dt', label), output);
  $('codon-readout').append(group);
}

function render() {
  const record = data.examples.find(item => item.gene === $('codon-gene').value);
  const codon = terminal ? record.terminal_stop : record.preview_codons[selected];
  $('codon-readout').replaceChildren();
  row('رکورد RNA مرجع', record.mRNA_accession, true);
  row('جایگاه در رونوشت؛ از ۱', `${codon.transcript_start_1based}–${codon.transcript_start_1based + 2}`, true);
  row('حروف فایل مرجع', codon.record_letters, true);
  row('کدون با حروف RNA', codon.rna_display, true);
  row('آمینواسید', codon.amino_acid.name_fa);
  row('علامت در توالی پروتئین', terminal ? 'توقف؛ آمینواسید اضافه نمی‌شود' : `${codon.amino_acid.three_letter} / ${codon.amino_acid.one_letter}`, !terminal);
  $('codon-number').textContent = terminal
    ? `کدون پایان شمارهٔ ${fa.format(codon.codon_index_1based)}؛ پایان بخش کدکننده`
    : `کدون ${fa.format(codon.codon_index_1based)} از ۱۲ کدون نخستِ بخش کدکننده`;
  $('codon-reference').href = record.source_page;
  $('codon-reference').textContent = 'رکورد اصلی ' + record.mRNA_accession;
  $('codon-strip').replaceChildren();
  record.preview_codons.forEach((item, index) => {
    const li = make('li');
    const button = make('button');
    button.type = 'button';
    button.dir = 'ltr';
    button.setAttribute('aria-pressed', String(!terminal && selected === index));
    button.setAttribute('aria-label', `کدون ${fa.format(index + 1)}، ${item.rna_display}، ${item.amino_acid.name_fa}`);
    button.append(make('span', item.rna_display), make('small', item.amino_acid.three_letter));
    button.addEventListener('click', () => { selected = index; terminal = false; render();
      $('codon-strip').querySelectorAll('button')[index].focus({ preventScroll: true }); });
    li.append(button);
    $('codon-strip').append(li);
  });
  $('codon-stop').setAttribute('aria-pressed', String(terminal));
  $('codon-note').textContent = terminal
    ? 'این کدون پایان CDS است. برای بازگشت، یکی از ۱۲ کدون آغازین را انتخاب کنید. بخش میانی در این پیش‌نمایش نمایش داده نمی‌شود.'
    : `ترجمهٔ کامل CDS با پروتئین مرجع ${record.protein_accession}، به طول ${fa.format(record.cds.translated_length_aa)} آمینواسید، تطبیق داده شده است. این توالی مرجع است؛ RNA یک بیمار یا جدول شمارش نیست.`;
}

async function load() {
  const status = $('codon-status');
  status.dataset.state = 'loading';
  status.textContent = 'در حال خواندن نمونه‌های واقعی کدون…';
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 12000);
  try {
    const response = await fetch(new URL('../data/processed/codon-lesson.json', import.meta.url), { signal: controller.signal });
    if (!response.ok) throw new Error('HTTP ' + response.status);
    data = await response.json();
    if (Object.keys(data.genetic_code.codons).length !== 64 || data.examples.length !== 2) throw new Error('Invalid codon lesson');
    const gene = $('codon-gene');
    gene.replaceChildren();
    for (const record of data.examples) {
      const option = make('option', record.gene);
      option.value = record.gene;
      gene.append(option);
    }
    gene.disabled = false;
    $('codon-stop').disabled = false;
    $('codon-content').hidden = false;
    render();
    $('codon-code-body').replaceChildren();
    for (const [rna, amino] of Object.entries(data.genetic_code.codons).sort()) {
      const tr = make('tr');
      for (const value of [rna, rna.replaceAll('U', 'T'), amino.three_letter]) {
        const td = make('td');
        const bdi = make('bdi', value);
        bdi.dir = 'ltr'; td.append(bdi); tr.append(td);
      }
      tr.append(make('td', amino.name_fa));
      $('codon-code-body').append(tr);
    }
    $('codon-drug-chains').replaceChildren();
    for (const fragment of data.drug_fragments) {
      const group = make('div');
      const letters = make('bdi', fragment.first_12_amino_acids);
      letters.dir = 'ltr';
      const dd = make('dd'); dd.append(letters);
      group.append(make('dt', `زنجیرهٔ ${fragment.auth_chain_id}؛ ۱۲ آمینواسید نخست`), dd);
      $('codon-drug-chains').append(group);
    }
    status.dataset.state = 'ready';
    status.textContent = 'CDS مرجع TNF و TOP2A و توالی زنجیره‌های Fab؛ با منشأ قابل بررسی.';
  } catch {
    $('codon-gene').disabled = true;
    $('codon-stop').disabled = true;
    $('codon-content').hidden = true;
    status.dataset.state = 'error';
    status.replaceChildren(make('span', 'نمونه‌های کدون خوانده نشدند؛ درس متنی و بخش‌های دیگر در دسترس‌اند. '));
    const retry = make('button', 'تلاش دوباره'); retry.type = 'button';
    retry.addEventListener('click', () => void load()); status.append(retry);
  } finally { clearTimeout(timer); }
}

if ($('codon-lesson')) {
  $('codon-gene').addEventListener('change', () => { selected = 0; terminal = false; render(); });
  $('codon-stop').addEventListener('click', () => { terminal = true; render(); });
  void load();
}
