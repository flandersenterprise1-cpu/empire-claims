/**
 * Extracts text from a carrier PDF, one clearly marked page at a time, so rules
 * and rates can be cited by page number.
 *
 *   node scripts/extract-pdf.cjs <input.pdf> <output.txt>
 *
 * Carrier PDFs are licensed material and are NOT committed to this repository.
 * Only the derived, reviewable data files under src/db/carriers/ are.
 */
const fs = require('fs');
const { PDFParse } = require('pdf-parse');
(async () => {
  const [, , file, out] = process.argv;
  const parser = new PDFParse({ data: new Uint8Array(fs.readFileSync(file)) });
  const res = await parser.getText();
  const pages = res.pages ?? null;
  let s = '';
  if (pages) {
    pages.forEach((p, i) => { s += `\n\n========== PAGE ${p.num ?? i + 1} ==========\n` + (p.text ?? ''); });
  } else {
    s = res.text;
  }
  fs.writeFileSync(out, s);
  console.log(`${file}: ${res.total ?? (pages && pages.length)} pages, ${s.length} chars -> ${out}`);
  await parser.destroy();
})().catch((e) => { console.error('ERR', e.message); process.exit(1); });
