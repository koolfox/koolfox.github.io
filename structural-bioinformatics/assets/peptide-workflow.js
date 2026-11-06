const base = 'peptide-ops-39-demo/';
const status = document.getElementById('results-status');
const tbody = document.getElementById('results');
try {
  const paths = ['candidates/manifest.json', 'docking/batch-000001/docking/report.json', 'docking/batch-000002/docking/report.json'];
  const responses = await Promise.all(paths.map(path => fetch(base + path)));
  if (responses.some(response => !response.ok)) throw new Error('گزارش در دسترس نیست.');
  const [manifest, ...reports] = await Promise.all(responses.map(response => response.json()));
  const rows = new Map();
  reports.forEach((report, batch) => report.candidates.forEach(row => rows.set(row.sequence, { ...row, batch: batch + 1 })));
  if (rows.size !== manifest.candidates.length) throw new Error('تعداد نامزدها با گزارش‌ها همخوان نیست.');
  for (const candidate of manifest.candidates) {
    const result = rows.get(candidate.sequence);
    if (!result || result.status !== 'requires_further_validation') throw new Error('نتیجهٔ یک نامزد کامل نیست.');
    const tr = document.createElement('tr');
    for (const value of [candidate.sequence, candidate.change, String(result.poses.length)]) {
      const td = document.createElement('td'); td.textContent = value; tr.append(td);
    }
    const td = document.createElement('td'); const link = document.createElement('a');
    const params = new URLSearchParams({ demo: '39', sequence: candidate.sequence, batch: String(result.batch) });
    link.href = 'docked-pose-viewer.html?' + params; link.textContent = 'نمایش سه‌بعدی'; td.append(link); tr.append(td); tbody.append(tr);
  }
  status.textContent = `${rows.size} نامزد با خروجی ثبت‌شده؛ هرکدام را می‌توانید باز کنید.`;
} catch (error) { tbody.replaceChildren(); status.textContent = 'خواندن نتایج انجام نشد: ' + error.message; }
