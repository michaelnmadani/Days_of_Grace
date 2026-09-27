// Display list -> SVG markup (used for the on-screen preview).

export const SVG_FONT_FAMILIES = {
  regular: "'DG Lora', Georgia, serif",
  semibold: "'DG Lora SemiBold', Georgia, serif",
  bold: "'DG Lora Bold', Georgia, serif",
};

const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const n = (v) => String(Math.round(v * 100) / 100);

export function itemToSvg(it) {
  if (it.type === 'path') {
    const a = [`d="${it.d}"`, `fill="${it.fill || 'none'}"`];
    if (it.stroke) {
      a.push(`stroke="${it.stroke}"`, `stroke-width="${n(it.strokeWidth || 1)}"`);
      if (it.lineCap) a.push(`stroke-linecap="${it.lineCap}"`);
      if (it.lineJoin) a.push(`stroke-linejoin="${it.lineJoin}"`);
    }
    if (it.opacity != null && it.opacity < 1) a.push(`opacity="${it.opacity}"`);
    return `<path ${a.join(' ')}/>`;
  }
  if (it.type === 'text') {
    const ls = it.letterSpacing ? ` letter-spacing="${n(it.letterSpacing)}"` : '';
    return `<text x="${n(it.x)}" y="${n(it.y)}" font-family="${SVG_FONT_FAMILIES[it.font]}" font-size="${n(it.size)}" fill="${it.fill}"${ls}>${esc(it.text)}</text>`;
  }
  return '';
}

export function renderSvg(page) {
  const { width, height, items } = page;
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${n(width)} ${n(height)}" width="${n(width)}" height="${n(height)}" style="font-kerning:none;text-rendering:geometricPrecision">` +
    `<rect width="100%" height="100%" fill="${page.background || '#fff'}"/>` +
    items.map(itemToSvg).join('') +
    '</svg>';
}
