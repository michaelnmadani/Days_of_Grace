// Font loading, text measurement, rich-text wrapping (with superscript
// ordinals such as 4th) and conversion of text to vector outlines.
//
// Widths are measured the same way pdf-lib draws text (glyph advances after
// substitutions, no kerning), so the SVG preview and the PDF agree.

import fontkit from '@pdf-lib/fontkit';

export const FONT_FILES = {
  script: 'Sacramento-Regular.ttf',
  regular: 'Lora-Regular.ttf',
  semibold: 'Lora-SemiBold.ttf',
  bold: 'Lora-Bold.ttf',
};

/**
 * @param {(file: string) => Promise<ArrayBuffer|Uint8Array>} readFile
 * @returns {Promise<{bytes: Record<string, Uint8Array>, faces: Record<string, any>}>}
 */
export async function loadFonts(readFile) {
  const bytes = {};
  const faces = {};
  await Promise.all(
    Object.entries(FONT_FILES).map(async ([key, file]) => {
      const data = await readFile(file);
      bytes[key] = data instanceof Uint8Array ? data : new Uint8Array(data);
      faces[key] = fontkit.create(bytes[key]);
    }),
  );
  return { bytes, faces };
}

const widthCache = new WeakMap();

export function measure(face, text, size) {
  let cache = widthCache.get(face);
  if (!cache) widthCache.set(face, (cache = new Map()));
  let w = cache.get(text);
  if (w === undefined) {
    const { glyphs } = face.layout(text);
    w = glyphs.reduce((sum, g) => sum + g.advanceWidth, 0) / face.unitsPerEm;
    cache.set(text, w);
  }
  return w * size;
}

/** Width including extra letter spacing after every character but the last. */
export function measureSpaced(face, text, size, spacing = 0) {
  return measure(face, text, size) + spacing * Math.max(0, [...text].length - 1);
}

/**
 * Text as a filled vector outline (true shaping, with kerning and contextual
 * forms). Used for the script lettering so it looks identical everywhere.
 */
export function textPath(face, text, size, x, y) {
  const run = face.layout(text);
  const s = size / face.unitsPerEm;
  const f = (n) => Math.round(n * 100) / 100;
  let pen = 0;
  let d = '';
  run.glyphs.forEach((glyph, i) => {
    const pos = run.positions[i];
    const ox = x + (pen + pos.xOffset) * s;
    const oy = y - pos.yOffset * s;
    for (const { command, args } of glyph.path.commands) {
      const pts = [];
      for (let j = 0; j < args.length; j += 2) pts.push(f(ox + args[j] * s), f(oy - args[j + 1] * s));
      switch (command) {
        case 'moveTo': d += `M${pts.join(' ')}`; break;
        case 'lineTo': d += `L${pts.join(' ')}`; break;
        case 'quadraticCurveTo': d += `Q${pts.join(' ')}`; break;
        case 'bezierCurveTo': d += `C${pts.join(' ')}`; break;
        case 'closePath': d += 'Z'; break;
        default: break;
      }
    }
    pen += pos.xAdvance;
  });
  return { d, width: pen * s };
}

/** Shaped advance width (with kerning) – matches textPath(). */
export function shapedWidth(face, text, size) {
  return (face.layout(text).advanceWidth / face.unitsPerEm) * size;
}

// ------------------------------------------------------------ rich text

const SUP_SCALE = 0.62;
const SUP_RISE = 0.36;

/** Split "4th Sunday" into runs, marking ordinal suffixes as superscript. */
export function richRuns(text) {
  const runs = [];
  const re = /(\d+)(st|nd|rd|th)\b/g;
  let last = 0;
  let m;
  while ((m = re.exec(text))) {
    if (m.index + m[1].length > last) runs.push({ text: text.slice(last, m.index + m[1].length), sup: false });
    runs.push({ text: m[2], sup: true });
    last = m.index + m[0].length;
  }
  if (last < text.length) runs.push({ text: text.slice(last), sup: false });
  return runs;
}

function runWidth(face, run, size) {
  return measure(face, run.text, run.sup ? size * SUP_SCALE : size);
}

/**
 * Greedy word wrap of a rich string.
 * @returns {Array<Array<{text, sup, dx}>>} lines of positioned runs
 */
export function wrapRich(face, text, size, maxWidth) {
  // words are sequences of runs separated by spaces
  const words = [];
  let cur = [];
  for (const run of richRuns(text)) {
    const parts = run.text.split(' ');
    parts.forEach((p, i) => {
      if (i > 0) { words.push(cur); cur = []; }
      if (p) cur.push({ text: p, sup: run.sup });
    });
  }
  words.push(cur);
  const space = measure(face, ' ', size);
  const wordW = (w) => w.reduce((s, r) => s + runWidth(face, r, size), 0);

  const lines = [];
  let line = [];
  let lineW = 0;
  for (const w of words.filter((w) => w.length)) {
    const ww = wordW(w);
    if (line.length && lineW + space + ww > maxWidth) {
      lines.push(line);
      line = [];
      lineW = 0;
    }
    if (line.length) lineW += space;
    line.push({ runs: w, x: lineW });
    lineW += ww;
  }
  if (line.length) lines.push(line);

  // flatten words into positioned runs, merging neighbours of the same style
  return lines.map((ws) => {
    const out = [];
    for (const { runs, x } of ws) {
      let dx = x;
      runs.forEach((r, i) => {
        const prev = out[out.length - 1];
        const rw = runWidth(face, r, size);
        if (prev && prev.sup === r.sup && !r.sup) {
          prev.text += (i === 0 ? ' ' : '') + r.text;
          prev.w = dx + rw - prev.dx;
        } else {
          out.push({ text: r.text, sup: r.sup, dx, w: rw });
        }
        dx += rw;
      });
    }
    return out;
  });
}

/** Display-list text items for one wrapped line. */
export function lineItems(runs, { x, y, size, font, fill }) {
  return runs.map((r) => ({
    type: 'text',
    text: r.text,
    x: x + r.dx,
    y: r.sup ? y - size * SUP_RISE : y,
    size: r.sup ? size * SUP_SCALE : size,
    font,
    fill,
  }));
}
