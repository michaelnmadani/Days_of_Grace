// Page layout: turns a year's tracker entries into a display list of vector
// paths and text runs (units: PDF points, origin top-left, y down).
//
// Months are arranged in four staggered "masonry" columns (Jan/May/Sep,
// Feb/Jun/Oct, ...). Each month sits on a hand-painted looking pastel blob
// with its script name and illustration. A scripture verse sits on a peach
// hill in the bottom-left corner. Because the number of entries changes from
// year to year, the layout searches for the largest type scale that fits the
// page, then spreads any spare room between entries so the page looks full.

import { entriesByMonth, MONTHS, DEFAULT_OPTIONS } from './liturgical.js';
import { blob, smoothClosed } from './geometry.js';
import { measure, measureSpaced, shapedWidth, textPath, wrapRich, lineItems } from './text.js';
import { placeIcon } from './icons.js';
import { COLORS, MONTH_COLORS, MONTH_ICONS, PAPER, VERSES } from './theme.js';

const BASE = {
  nameSize: 21.5,
  textSize: 7.5,
  lineH: 9.3,
  entryGap: 6.4,
  checkR: 6,
  headTop: 23,
  padBottom: 10,
  cardGap: 30,
  iconSize: 50,
};

export const DEFAULT_PAGE_OPTIONS = {
  paper: 'a4',
  title: 'Days of Grace',
  subtitle: '{year} CHURCH TRACKER',
  verse: 'ps122', // id from VERSES, or { lines: [...], ref }
};

/** Icon for each month; February uses Candlemas candles when Lent begins in March. */
export function iconsForYear(months) {
  const icons = [...MONTH_ICONS];
  if (!months[1].some((e) => e.key === 'ashWednesday')) icons[1] = 'candles';
  return icons;
}

function resolveVerse(verse) {
  if (verse && typeof verse === 'object') {
    const lines = (Array.isArray(verse.lines) ? verse.lines : String(verse.text || '').split('\n'))
      .map((l) => l.trim())
      .filter(Boolean);
    return { lines, ref: (verse.ref || '').trim() };
  }
  return VERSES.find((v) => v.id === verse) || VERSES[0];
}

/** Wrap, then rebalance so multi-line titles break evenly (no one-word widows). */
function wrapBalanced(face, text, size, maxW) {
  const lines = wrapRich(face, text, size, maxW);
  if (lines.length < 2) return lines;
  let lo = maxW * 0.5, hi = maxW;
  for (let i = 0; i < 12; i++) {
    const mid = (lo + hi) / 2;
    if (wrapRich(face, text, size, mid).length > lines.length) lo = mid;
    else hi = mid;
  }
  return wrapRich(face, text, size, hi);
}

/** Word-wrap script lines to a maximum width (keeps the author's own line breaks). */
function wrapScript(face, lines, size, maxW) {
  const out = [];
  for (const line of lines) {
    let cur = '';
    for (const word of line.split(/\s+/).filter(Boolean)) {
      const next = cur ? `${cur} ${word}` : word;
      if (cur && shapedWidth(face, next, size) > maxW) {
        out.push(cur);
        cur = word;
      } else cur = next;
    }
    out.push(cur);
  }
  return out;
}

function monthCard(month, entries, x, w, k, fonts) {
  const s = (v) => v * k;
  const size = s(BASE.textSize);
  const lineH = s(BASE.lineH);
  const r = s(BASE.checkR);
  const checkX = x + s(8.5) + r;
  const textX = checkX + r + s(5.5);
  const maxW = x + w - s(5) - textX;
  const blocks = entries.map((e) => {
    const face = e.bold ? fonts.faces.bold : fonts.faces.regular;
    const lines = wrapBalanced(face, e.title, size, maxW);
    const sub = e.subtitle ? wrapBalanced(face, e.subtitle, size, maxW) : [];
    const n = 1 + lines.length + sub.length;
    return { e, lines: [...lines, ...sub], height: (n - 1) * lineH + size * 1.05 };
  });
  const content = blocks.reduce((sum, b) => sum + b.height, 0);
  return {
    month,
    blocks,
    x,
    w,
    k,
    size,
    lineH,
    r,
    checkX,
    textX,
    headTop: s(BASE.headTop),
    padBottom: s(BASE.padBottom),
    entryGap: s(BASE.entryGap),
    contentHeight: content,
    height(extraGap = 0, extraPad = 0) {
      return this.headTop + content + (blocks.length - 1) * (this.entryGap + extraGap) + this.padBottom + extraPad;
    },
  };
}

// Peach "hill" in the bottom-left that holds the verse. Returns its path and
// a function giving the y of its top edge at a given x (Infinity where absent).
function verseHill(W, H, bottom, height, right) {
  const top = bottom - height;
  const c = 0.36;
  const g = (u) => {
    if (u < 0 || u > 1) return 0;
    if (u < c) return 1 - 0.3 * ((c - u) / c) ** 2;
    const t = (u - c) / (1 - c);
    return Math.sqrt(Math.max(0, 1 - t * t));
  };
  const yAt = (x) => (x > right ? Infinity : bottom - height * g(Math.max(0, x) / right));
  const pts = [[-12, bottom + 2]];
  for (let i = 0; i <= 26; i++) {
    const u = i / 26;
    const x = u * right;
    pts.push([x, bottom - height * g(u) * (i === 26 ? 0.04 : 1)]);
  }
  pts.push([right * 0.7, bottom + 1], [right * 0.3, bottom + 2]);
  return { d: smoothClosed(pts, 0.9), yAt, top };
}

export function layoutPage(year, calendarOptions = {}, pageOptions = {}, fonts) {
  const opt = { ...DEFAULT_PAGE_OPTIONS, ...pageOptions };
  const paper = PAPER[opt.paper] || PAPER.a4;
  const W = paper.width, H = paper.height;
  const months = entriesByMonth(year, { ...DEFAULT_OPTIONS, ...calendarOptions });
  const icons = iconsForYear(months);
  const { script, regular } = fonts.faces;

  const mx = 18;
  const colGap = 8;
  const colW = (W - 2 * mx - 3 * colGap) / 4;
  const colX = [0, 1, 2, 3].map((c) => mx + c * (colW + colGap));
  const bottomMargin = 20;

  // ---- header
  const titleText = (opt.title || '').trim() || DEFAULT_PAGE_OPTIONS.title;
  let titleSize = 41;
  const maxTitleW = W * 0.52;
  let titleW = shapedWidth(script, titleText, titleSize);
  if (titleW > maxTitleW) { titleSize *= maxTitleW / titleW; titleW = maxTitleW; }
  const hl = { x: mx + 6, y: 14, w: titleW + 30, h: 34 };
  const titleBaseline = hl.y + hl.h - 7;
  const subText = (opt.subtitle ?? DEFAULT_PAGE_OPTIONS.subtitle).replace(/\{year\}/gi, String(year)).trim();
  let subSize = 16, subSpacing = 1.4;
  const subX = hl.x + hl.w + 18;
  const subRoom = W - mx - subX;
  let subW = measureSpaced(regular, subText, subSize, subSpacing);
  if (subW > subRoom) {
    const f = subRoom / subW;
    subSize *= f; subSpacing *= f; subW = subRoom;
  }
  const subBaseline = hl.y + hl.h / 2 + subSize * 0.36;

  // columns under the title start lower than those under the subtitle
  const titleBottom = titleBaseline + titleSize * 0.42;
  const colTop = colX.map((x) => (x < hl.x + hl.w ? titleBottom + 16 : Math.max(subBaseline + 8, 40) + 28));

  // ---- verse + layout search
  const verse = resolveVerse(opt.verse);
  let best = null;
  const vx = mx + 14;
  const maxRight = colX[3] - 10; // the hill never reaches the last column
  for (const vScale of [1, 0.88, 0.76, 0.66]) {
    const vSize = 18 * vScale;
    const vLineH = vSize * 1.2;
    const refSize = 13 * vScale;
    const vLines = wrapScript(script, verse.lines.length ? verse.lines : [''], vSize, maxRight - vx - 36).slice(0, 4);
    const lineWs = vLines.map((l) => shapedWidth(script, l, vSize));
    const hillH = 26 * vScale + vLines.length * vLineH + (verse.ref ? refSize * 1.7 : 0) + 12 * vScale;
    const hillBottom = H - bottomMargin;
    const firstBaseline = hillBottom - hillH + 24 * vScale + vSize * 0.55;
    // widen the hill until every verse line sits inside its curve
    let right = W * 0.56;
    let verseFits = false;
    for (; right <= maxRight; right += 6) {
      const hill = verseHill(W, H, hillBottom, hillH, right);
      verseFits = vLines.every((_, i) => {
        const yTop = firstBaseline + i * vLineH - vSize * 0.7;
        return hill.yAt(vx + lineWs[i] + 10) <= yTop;
      }) && (!verse.ref || hill.yAt(vx + measure(regular, verse.ref, refSize) + 10) <= firstBaseline + vLines.length * vLineH);
      if (verseFits) break;
    }
    right = Math.min(right, maxRight);
    const hill = verseHill(W, H, hillBottom, hillH, right);
    const limits = colX.map((x) => {
      let y = H - bottomMargin - 2;
      for (let t = 0; t <= 10; t++) y = Math.min(y, hill.yAt(x - 3 + ((colW + 6) * t) / 10) - 12);
      return y;
    });

    const fits = (k) => {
      const cards = MONTHS.map((_, m) => monthCard(m, months[m], colX[m % 4] - 1, colW + 2, k, fonts));
      const cols = [0, 1, 2, 3].map((c) => [cards[c], cards[c + 4], cards[c + 8]]);
      const bottoms = cols.map((cc, c) => colTop[c] + cc.reduce((s, card) => s + card.height(), 0) + 2 * BASE.cardGap * k);
      return { ok: bottoms.every((b, c) => b <= limits[c]), cards, cols, bottoms };
    };
    let lo = 0.5, hi = 1;
    if (fits(hi).ok) lo = hi;
    else for (let i = 0; i < 14; i++) { const mid = (lo + hi) / 2; if (fits(mid).ok) lo = mid; else hi = mid; }
    const res = { k: lo, ...fits(lo), hill, limits, vScale, vSize, vLineH, refSize, vLines, vx, firstBaseline, verseFits };
    const better = !best || (res.verseFits && !best.verseFits) || (res.verseFits === best.verseFits && res.k > best.k);
    if (better) best = res;
    if (verseFits && lo >= 0.86) break;
  }

  const { k, cols, hill, limits } = best;
  const items = [];
  const ink = COLORS.ink;

  // ---- background shapes
  items.push({ type: 'path', d: hill.d, fill: COLORS.peach });
  items.push({ type: 'path', d: blob(hl.x, hl.y, hl.w, hl.h, { seed: year % 7 + 40, radius: 11, wobble: 1.4, step: 10 }), fill: COLORS.peach });

  // ---- months: spread spare room, then place
  const placed = [];
  cols.forEach((cc, c) => {
    const used = best.bottoms[c] - colTop[c];
    let slack = Math.max(0, limits[c] - colTop[c] - used);
    const nGaps = cc.reduce((s, card) => s + Math.max(0, card.blocks.length - 1), 0);
    const eg = nGaps ? Math.min((slack * 0.72) / nGaps, BASE.entryGap * k * 1.1) : 0;
    slack -= eg * nGaps;
    const pad = Math.min((slack * 0.3) / 3, 7 * k);
    slack -= pad * 3;
    const cg = Math.min(slack / 2, 18 * k);
    let y = colTop[c];
    cc.forEach((card) => {
      placed.push({ card, y, extraGap: eg, extraPad: pad });
      y += card.height(eg, pad) + BASE.cardGap * k + cg;
    });
  });

  const blobs = [];
  for (const { card, y, extraGap, extraPad } of placed) {
    const h = card.height(extraGap, extraPad);
    const seed = card.month + 1;
    items.push({ type: 'path', d: blob(card.x, y, card.w, h, { seed, radius: 20 * k + 4 }), fill: MONTH_COLORS[card.month] });
    blobs.push({ month: card.month, x: card.x, y, w: card.w, h });
  }

  for (const { card, y, extraGap } of placed) {
    const m = card.month;
    // month name in script, sitting on the top edge of the blob
    const nameSize = BASE.nameSize * k;
    const nameX = card.x + 9 * k;
    const name = textPath(script, MONTHS[m], nameSize, nameX, y + nameSize * 0.24);
    // illustration at the top-right corner, never overlapping the name
    const nameRight = nameX + name.width;
    let iconSize = BASE.iconSize * Math.sqrt(k);
    const right = card.x + card.w + iconSize * 0.08;
    iconSize = Math.min(iconSize, (right - nameRight - 2) / 0.94);
    items.push(...placeIcon(icons[m], right - iconSize * 0.98, y - iconSize * 0.56, iconSize));
    items.push({ type: 'path', d: name.d, fill: ink, stroke: ink, strokeWidth: 0.35 * k, lineJoin: 'round' });

    // entries
    let top = y + card.headTop;
    for (const b of card.blocks) {
      const firstBase = top + card.size * 0.78;
      const cy = top + (card.size * 1.05 + card.lineH) / 2 - card.size * 0.12;
      items.push({ type: 'path', d: circlePath(card.checkX, cy, card.r), stroke: COLORS.checkbox, strokeWidth: 0.8 * k });
      items.push({ type: 'text', text: b.e.dateLabel, x: card.textX, y: firstBase, size: card.size, font: 'semibold', fill: ink });
      b.lines.forEach((runs, i) => {
        items.push(...lineItems(runs, { x: card.textX, y: firstBase + (i + 1) * card.lineH, size: card.size, font: b.e.bold ? 'bold' : 'regular', fill: ink }));
      });
      top += b.height + card.entryGap + extraGap;
    }
  }

  // ---- header text (drawn last so it sits above everything)
  items.push({ type: 'path', d: textPath(script, titleText, titleSize, hl.x + 16, titleBaseline).d, fill: ink, stroke: ink, strokeWidth: 0.45, lineJoin: 'round' });
  if (subText) items.push({ type: 'text', text: subText, x: subX, y: subBaseline, size: subSize, font: 'regular', fill: ink, letterSpacing: subSpacing });

  // ---- verse
  const { vSize, vLineH, refSize, vLines, firstBaseline } = best;
  vLines.forEach((line, i) => {
    if (!line) return;
    items.push({ type: 'path', d: textPath(script, line, vSize, vx, firstBaseline + i * vLineH).d, fill: ink, stroke: ink, strokeWidth: 0.3, lineJoin: 'round' });
  });
  if (verse.ref) items.push({ type: 'text', text: verse.ref, x: vx + 2, y: firstBaseline + (vLines.length - 1) * vLineH + refSize * 1.75, size: refSize, font: 'regular', fill: ink });

  return {
    width: W,
    height: H,
    background: COLORS.paper,
    items,
    meta: { year, scale: k, blobs, limits, colTop, icons, months },
  };
}

function circlePath(cx, cy, r) {
  const k = r * 0.5522847498;
  const f = (v) => Math.round(v * 100) / 100;
  return `M${f(cx + r)} ${f(cy)}C${f(cx + r)} ${f(cy + k)} ${f(cx + k)} ${f(cy + r)} ${f(cx)} ${f(cy + r)}` +
    `C${f(cx - k)} ${f(cy + r)} ${f(cx - r)} ${f(cy + k)} ${f(cx - r)} ${f(cy)}` +
    `C${f(cx - r)} ${f(cy - k)} ${f(cx - k)} ${f(cy - r)} ${f(cx)} ${f(cy - r)}` +
    `C${f(cx + k)} ${f(cy - r)} ${f(cx + r)} ${f(cy - k)} ${f(cx + r)} ${f(cy)}Z`;
}
