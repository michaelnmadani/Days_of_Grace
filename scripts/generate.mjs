#!/usr/bin/env node
// Command-line PDF generator:
//   node scripts/generate.mjs 2027                 -> days-of-grace-2027.pdf (A4)
//   node scripts/generate.mjs 2027 2030 --letter   -> one PDF with a page per year
// Options: --letter, --jan6 (Epiphany on Jan 6), --ascension-sunday,
//          --corpus-thursday, --extra (more feasts), --out <file>

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { loadFonts } from '../src/text.js';
import { layoutPage } from '../src/layout.js';
import { renderPdf } from '../src/render-pdf.js';

const root = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const args = process.argv.slice(2);
const flag = (f) => args.includes(f);
const years = args.filter((a) => /^\d{4}$/.test(a)).map(Number);
if (!years.length) years.push(new Date().getFullYear());
const [from, to = from] = years;
const outIdx = args.indexOf('--out');

const calendar = {
  epiphany: flag('--jan6') ? 'jan6' : 'sunday',
  ascension: flag('--ascension-sunday') ? 'sunday' : 'thursday',
  corpusChristi: flag('--corpus-thursday') ? 'thursday' : 'sunday',
  extraFeasts: flag('--extra'),
};
const pageOpts = { paper: flag('--letter') ? 'letter' : 'a4' };

const fonts = await loadFonts(async (f) => fs.readFileSync(path.join(root, 'fonts', f)));
const pages = [];
for (let y = Math.min(from, to); y <= Math.max(from, to); y++) pages.push(layoutPage(y, calendar, pageOpts, fonts));
const bytes = await renderPdf(pages, fonts, { title: `Days of Grace – ${from === to ? from : `${from}–${to}`} Church Tracker` });
const out = outIdx >= 0 ? args[outIdx + 1] : `days-of-grace-${from === to ? from : `${from}-${to}`}.pdf`;
fs.writeFileSync(out, bytes);
console.log(`Wrote ${out} (${pages.length} page${pages.length > 1 ? 's' : ''}, ${(bytes.length / 1024).toFixed(0)} KB)`);
