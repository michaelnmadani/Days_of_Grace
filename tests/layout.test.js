import { test, before } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { PDFDocument } from 'pdf-lib';
import { loadFonts } from '../src/text.js';
import { layoutPage, iconsForYear } from '../src/layout.js';
import { renderPdf } from '../src/render-pdf.js';
import { renderSvg } from '../src/render-svg.js';
import { ICONS } from '../src/icons.js';
import { MONTH_ICONS } from '../src/theme.js';
import { entriesByMonth } from '../src/liturgical.js';
import { pathBounds, parsePath, segsToString } from '../src/geometry.js';

const root = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
let fonts;
before(async () => {
  fonts = await loadFonts(async (f) => fs.readFileSync(path.join(root, 'fonts', f)));
});

test('path parser normalises relative, shorthand and arc commands', () => {
  assert.equal(segsToString(parsePath('M10 10h5v5l-5 0z')), 'M10 10L15 10L15 15L10 15Z');
  assert.equal(segsToString(parsePath('M0 0c1 1 2 2 3 3s1 1 2 2')), 'M0 0C1 1 2 2 3 3C4 4 4 4 5 5');
  const arc = parsePath('M0 0A10 10 0 0 1 20 0');
  assert.ok(arc.slice(1).every((s) => s[0] === 'C'));
  assert.deepEqual(arc.at(-1).slice(-2), [20, 0]);
});

test('every icon exists and draws inside its 100×100 box', () => {
  for (const name of [...MONTH_ICONS, 'candles']) {
    assert.ok(ICONS[name], `missing icon ${name}`);
    for (const p of ICONS[name]()) {
      const b = pathBounds(p.d);
      assert.ok(b.x0 > -8 && b.y0 > -8 && b.x1 < 108 && b.y1 < 108, `${name} out of bounds ${JSON.stringify(b)}`);
      assert.ok(p.fill || p.stroke, `${name} primitive without paint`);
    }
  }
});

test('February shows Candlemas candles when Ash Wednesday is in March', () => {
  assert.equal(iconsForYear(entriesByMonth(2026))[1], 'ashes');
  assert.equal(iconsForYear(entriesByMonth(2038))[1], 'candles');
});

function checkPage(page, label) {
  const { width: W, height: H, meta } = page;
  assert.ok(meta.scale >= 0.85, `${label}: type scaled down to ${meta.scale}`);
  for (const b of meta.blobs) {
    assert.ok(b.x >= 0 && b.x + b.w <= W, `${label}: month ${b.month} outside page horizontally`);
    assert.ok(b.y > 30 && b.y + b.h <= H - 10, `${label}: month ${b.month} outside page vertically`);
    const col = b.month % 4;
    assert.ok(b.y + b.h <= meta.limits[col] + 0.5, `${label}: month ${b.month} runs into the verse`);
  }
  // months stacked in a column must not overlap
  for (let c = 0; c < 4; c++) {
    const col = meta.blobs.filter((b) => b.month % 4 === c).sort((a, b) => a.month - b.month);
    for (let i = 1; i < col.length; i++) assert.ok(col[i].y > col[i - 1].y + col[i - 1].h + 10, `${label}: column ${c} overlaps`);
  }
  for (const it of page.items) {
    if (it.type !== 'text') continue;
    assert.ok(it.x >= 0 && it.x < W && it.y > 0 && it.y < H, `${label}: text off page: ${it.text}`);
  }
  // every tracker entry is on the page
  const dates = new Set(page.items.filter((i) => i.font === 'semibold').map((i) => i.text));
  const expected = meta.months.flat();
  assert.equal(page.items.filter((i) => i.font === 'semibold').length, expected.length, label);
  for (const e of expected) assert.ok(dates.has(e.dateLabel), `${label}: missing ${e.dateLabel}`);
}

test('layout fits every year 2026–2075 on A4 and US Letter, with all options', () => {
  const variants = [
    [{}, { paper: 'a4' }],
    [{}, { paper: 'letter' }],
    [{ extraFeasts: true, epiphany: 'jan6', ascension: 'sunday', corpusChristi: 'thursday' }, { paper: 'letter' }],
    [{ extraFeasts: true }, { paper: 'a4' }],
  ];
  for (let y = 2026; y <= 2075; y++) {
    for (const [cal, pageOpts] of variants) checkPage(layoutPage(y, cal, pageOpts, fonts), `${y} ${JSON.stringify(cal)} ${pageOpts.paper}`);
  }
});

test('custom titles and long verses stay on the page', () => {
  const page = layoutPage(2027, {}, {
    title: 'The Smith Family Mass Tracker',
    subtitle: 'OUR {year} JOURNEY OF FAITH TOGETHER',
    verse: { lines: ['Therefore, since we are surrounded by so great a cloud of witnesses, let us rid ourselves of every burden and sin that clings to us and persevere in running the race that lies before us.'], ref: 'Hebrews 12:1' },
  }, fonts);
  checkPage(page, 'custom');
  const sub = page.items.find((i) => i.text === 'OUR 2027 JOURNEY OF FAITH TOGETHER');
  assert.ok(sub, 'subtitle with year substituted');
  assert.ok(renderSvg(page).startsWith('<svg'));
});

test('PDF: one page per year, correct size, fonts embedded', async () => {
  const pages = [2026, 2027].map((y) => layoutPage(y, {}, { paper: 'letter' }, fonts));
  const bytes = await renderPdf(pages, fonts, { title: 'Test' });
  assert.equal(new TextDecoder().decode(bytes.slice(0, 5)), '%PDF-');
  const doc = await PDFDocument.load(bytes);
  assert.equal(doc.getPageCount(), 2);
  const { width, height } = doc.getPage(0).getSize();
  assert.equal(Math.round(width), 612);
  assert.equal(Math.round(height), 792);
  assert.equal(doc.getTitle(), 'Test');
  assert.ok(bytes.length < 2_000_000, `PDF unexpectedly large: ${bytes.length}`);
});
