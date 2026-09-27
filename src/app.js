// Website controller: reads the form, renders the live SVG preview and
// builds the PDF on demand (entirely in the browser).

import { loadFonts } from './text.js';
import { layoutPage, DEFAULT_PAGE_OPTIONS } from './layout.js';
import { renderSvg } from './render-svg.js';
import { VERSES } from './theme.js';
import { keyDates, fromDayNumber, MONTHS, WEEKDAYS } from './liturgical.js';

const form = document.getElementById('controls');
const preview = document.getElementById('preview');
const statusEl = document.getElementById('status');
const keyDatesEl = document.getElementById('key-dates');
const STORAGE_KEY = 'days-of-grace:settings';
const MIN_YEAR = 1583;
const MAX_YEAR = 4099;

const now = new Date();
const defaultYear = now.getMonth() >= 9 ? now.getFullYear() + 1 : now.getFullYear(); // from October, suggest next year
const usesLetter = /^(en-US|en-CA|es-US|es-MX|fr-CA|en-PH|fil)/i.test(navigator.language || '');

const DEFAULTS = {
  year: defaultYear,
  paper: usesLetter ? 'letter' : 'a4',
  epiphany: 'sunday',
  ascension: 'thursday',
  corpusChristi: 'sunday',
  extraFeasts: false,
  title: '',
  subtitle: '',
  verse: 'ps122',
  verseText: '',
  verseRef: '',
  rangeFrom: defaultYear,
  rangeTo: defaultYear + 3,
};

let fonts = null;
let pdfModule = null;

// ------------------------------------------------------------------ state

function loadSettings() {
  const s = { ...DEFAULTS };
  try {
    Object.assign(s, JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}'));
  } catch { /* storage unavailable */ }
  s.year = DEFAULTS.year; // always open on the suggested year unless the URL says otherwise
  const q = new URLSearchParams(location.search);
  for (const key of Object.keys(DEFAULTS)) {
    if (!q.has(key)) continue;
    const v = q.get(key);
    s[key] = typeof DEFAULTS[key] === 'boolean' ? v === '1' || v === 'true' : typeof DEFAULTS[key] === 'number' ? Number(v) : v;
  }
  s.year = clampYear(s.year);
  return s;
}

function clampYear(y) {
  const n = Math.round(Number(y));
  return Number.isFinite(n) ? Math.min(MAX_YEAR, Math.max(MIN_YEAR, n)) : DEFAULTS.year;
}

function readForm() {
  const fd = new FormData(form);
  return {
    year: clampYear(fd.get('year')),
    paper: fd.get('paper') || 'a4',
    epiphany: fd.get('epiphany'),
    ascension: fd.get('ascension'),
    corpusChristi: fd.get('corpusChristi'),
    extraFeasts: fd.get('extraFeasts') === 'on',
    title: String(fd.get('title') || ''),
    subtitle: String(fd.get('subtitle') || ''),
    verse: fd.get('verse'),
    verseText: String(fd.get('verseText') || ''),
    verseRef: String(fd.get('verseRef') || ''),
    rangeFrom: clampYear(fd.get('rangeFrom')),
    rangeTo: clampYear(fd.get('rangeTo')),
  };
}

function writeForm(s) {
  for (const [key, value] of Object.entries(s)) {
    const els = form.elements.namedItem(key);
    if (!els) continue;
    if (els instanceof RadioNodeList) {
      for (const el of els) el.checked = el.value === value;
    } else if (els.type === 'checkbox') {
      els.checked = !!value;
    } else {
      els.value = value;
    }
  }
}

function persist(s) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(s));
  } catch { /* ignore */ }
  const q = new URLSearchParams();
  for (const [key, value] of Object.entries(s)) {
    if (key.startsWith('range')) continue;
    if (key !== 'year' && value === DEFAULTS[key]) continue;
    if (value === '' || value === false) continue;
    q.set(key, typeof value === 'boolean' ? '1' : String(value));
  }
  history.replaceState(null, '', `${location.pathname}?${q}`);
}

function calendarOptions(s) {
  return { epiphany: s.epiphany, ascension: s.ascension, corpusChristi: s.corpusChristi, extraFeasts: s.extraFeasts };
}

function pageOptions(s) {
  const verse = s.verse === 'custom'
    ? { lines: s.verseText.split('\n'), ref: s.verseRef }
    : s.verse;
  return {
    paper: s.paper,
    title: s.title.trim() || DEFAULT_PAGE_OPTIONS.title,
    subtitle: s.subtitle.trim() || DEFAULT_PAGE_OPTIONS.subtitle,
    verse,
  };
}

// ------------------------------------------------------------------ rendering

function setStatus(msg, error = false) {
  statusEl.textContent = msg;
  statusEl.classList.toggle('error', error);
}

function renderPreview() {
  const s = readForm();
  persist(s);
  updateChips(s.year);
  document.getElementById('custom-verse').hidden = s.verse !== 'custom';
  if (!fonts) return;
  try {
    const page = layoutPage(s.year, calendarOptions(s), pageOptions(s), fonts);
    preview.innerHTML = renderSvg(page);
    preview.classList.toggle('letter', s.paper === 'letter');
    preview.setAttribute('aria-busy', 'false');
    const svg = preview.querySelector('svg');
    svg.setAttribute('role', 'img');
    svg.setAttribute('aria-label', `Preview of the ${s.year} church tracker`);
    renderKeyDates(s, page);
  } catch (err) {
    console.error(err);
    setStatus(`Sorry – the preview could not be drawn (${err.message}).`, true);
  }
}

function fmtDay(dn) {
  const { month, day, weekday } = fromDayNumber(dn);
  return `${WEEKDAYS[weekday]}, ${MONTHS[month - 1].slice(0, 3)} ${day}`;
}

function renderKeyDates(s, page) {
  const k = keyDates(s.year, calendarOptions(s));
  const count = page.meta.months.reduce((n, m) => n + m.length, 0);
  const rows = [
    ['Ash Wednesday', k.ashWednesday],
    ['Palm Sunday', k.palmSunday],
    ['Easter Sunday', k.easter],
    ['Ascension', k.ascension],
    ['Pentecost', k.pentecost],
    ['Advent begins', k.advent1],
  ];
  keyDatesEl.innerHTML =
    `<h2>Key dates in ${s.year}</h2><dl>` +
    rows.map(([label, dn]) => `<div><dt>${label}</dt><dd>${fmtDay(dn)}</dd></div>`).join('') +
    `</dl><p>${count} days to tick off: every Sunday plus the holy days and major feasts of the year.</p>`;
}

function updateChips(year) {
  const wrap = document.getElementById('year-chips');
  const base = now.getFullYear();
  const years = [base, base + 1, base + 2, base + 3];
  if (!wrap.childElementCount) {
    wrap.innerHTML = years.map((y) => `<button type="button" class="chip" data-year="${y}">${y}</button>`).join('');
  }
  for (const b of wrap.querySelectorAll('.chip')) b.setAttribute('aria-pressed', String(Number(b.dataset.year) === year));
}

// ------------------------------------------------------------------ PDF

async function getPdfModule() {
  if (!pdfModule) pdfModule = await import('./render-pdf.js');
  return pdfModule;
}

async function buildPdf(years) {
  const s = readForm();
  const { renderPdf } = await getPdfModule();
  const pages = years.map((y) => layoutPage(y, calendarOptions(s), pageOptions(s), fonts));
  const label = years.length > 1 ? `${years[0]}–${years[years.length - 1]}` : String(years[0]);
  const title = `${pageOptions(s).title} – ${label} Church Tracker`;
  const bytes = await renderPdf(pages, fonts, { title });
  const slug = (pageOptions(s).title || 'days-of-grace').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'church-tracker';
  return { blob: new Blob([bytes], { type: 'application/pdf' }), filename: `${slug}-${label.replace('–', '-')}.pdf` };
}

function saveBlob(blob, filename) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 60000);
}

async function withBusy(fn) {
  const buttons = form.querySelectorAll('.btn');
  buttons.forEach((b) => (b.disabled = true));
  try {
    await fn();
  } catch (err) {
    console.error(err);
    setStatus(`Sorry – the PDF could not be created (${err.message}).`, true);
  } finally {
    buttons.forEach((b) => (b.disabled = false));
  }
}

async function download() {
  const { year } = readForm();
  await withBusy(async () => {
    setStatus('Creating your PDF…');
    const { blob, filename } = await buildPdf([year]);
    saveBlob(blob, filename);
    setStatus(`Downloaded ${filename}`);
  });
}

async function downloadRange() {
  const s = readForm();
  const from = Math.min(s.rangeFrom, s.rangeTo);
  const to = Math.min(Math.max(s.rangeFrom, s.rangeTo), from + 49);
  const years = Array.from({ length: to - from + 1 }, (_, i) => from + i);
  await withBusy(async () => {
    setStatus(`Creating ${years.length} pages…`);
    const { blob, filename } = await buildPdf(years);
    saveBlob(blob, filename);
    setStatus(`Downloaded ${filename}`);
  });
}

async function openToPrint() {
  const { year } = readForm();
  // Open the tab synchronously so pop-up blockers allow it, then point it at the PDF.
  const tab = window.open('', '_blank');
  let done = false;
  await withBusy(async () => {
    setStatus('Creating your PDF…');
    const { blob, filename } = await buildPdf([year]);
    if (tab && !tab.closed) {
      const url = URL.createObjectURL(blob);
      tab.location.href = url;
      setTimeout(() => URL.revokeObjectURL(url), 5 * 60000);
      setStatus('Opened in a new tab – use your browser’s print button there.');
    } else {
      saveBlob(blob, filename);
      setStatus(`Your browser blocked the new tab, so the PDF was downloaded instead (${filename}).`);
    }
    done = true;
  });
  if (!done && tab && !tab.closed) tab.close();
}

// ------------------------------------------------------------------ wiring

function debounce(fn, ms) {
  let t;
  return () => {
    clearTimeout(t);
    t = setTimeout(fn, ms);
  };
}

function init() {
  document.getElementById('verse').innerHTML =
    VERSES.map((v) => `<option value="${v.id}">${v.ref} – ${v.lines[0].replace(/[“”‘’]/g, '').slice(0, 34)}…</option>`).join('') +
    '<option value="custom">Write my own…</option>';

  const settings = loadSettings();
  writeForm(settings);
  updateChips(settings.year);

  const soon = debounce(renderPreview, 180);
  form.addEventListener('input', (e) => {
    if (e.target.name?.startsWith('range')) return;
    if (e.target.type === 'text' || e.target.tagName === 'TEXTAREA' || e.target.type === 'number') soon();
    else renderPreview();
  });
  form.addEventListener('change', (e) => {
    if (e.target.name === 'year') {
      e.target.value = clampYear(e.target.value);
      renderPreview();
    }
  });
  const step = (d) => {
    const el = form.elements.namedItem('year');
    el.value = clampYear(Number(el.value) + d);
    renderPreview();
  };
  document.getElementById('year-down').addEventListener('click', () => step(-1));
  document.getElementById('year-up').addEventListener('click', () => step(1));
  document.getElementById('year-chips').addEventListener('click', (e) => {
    const y = e.target.closest('.chip')?.dataset.year;
    if (!y) return;
    form.elements.namedItem('year').value = y;
    renderPreview();
  });
  document.getElementById('download').addEventListener('click', download);
  document.getElementById('open').addEventListener('click', openToPrint);
  document.getElementById('download-range').addEventListener('click', downloadRange);

  renderPreview();
  const fetchFont = async (file) => {
    const res = await fetch(`fonts/${file}`);
    if (!res.ok) throw new Error(`could not load ${file}`);
    return res.arrayBuffer();
  };
  Promise.all([loadFonts(fetchFont), document.fonts.load('10px "DG Lora"'), document.fonts.load('10px "DG Lora SemiBold"'), document.fonts.load('10px "DG Lora Bold"')])
    .then(([f]) => {
      fonts = f;
      renderPreview();
      // warm up the PDF library in the background so the first download is instant
      (window.requestIdleCallback || setTimeout)(() => getPdfModule().catch(() => {}));
    })
    .catch((err) => {
      console.error(err);
      setStatus('The fonts could not be loaded. Please check your connection and reload the page.', true);
    });
}

init();
