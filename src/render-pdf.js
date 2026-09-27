// Display list -> vector PDF (pdf-lib). Text stays real, selectable text with
// the Lora fonts embedded (subset); script lettering and artwork are paths.

import {
  PDFDocument,
  rgb,
  LineCapStyle,
  LineJoinStyle,
  pushGraphicsState,
  popGraphicsState,
  setLineJoin,
  setCharacterSpacing,
} from 'pdf-lib';
import fontkit from '@pdf-lib/fontkit';

const colorCache = new Map();
function color(hex) {
  if (!hex) return undefined;
  let c = colorCache.get(hex);
  if (!c) {
    const h = hex.replace('#', '');
    const v = h.length === 3 ? h.split('').map((x) => x + x).join('') : h;
    c = rgb(parseInt(v.slice(0, 2), 16) / 255, parseInt(v.slice(2, 4), 16) / 255, parseInt(v.slice(4, 6), 16) / 255);
    colorCache.set(hex, c);
  }
  return c;
}

const CAPS = { round: LineCapStyle.Round, butt: LineCapStyle.Butt, square: LineCapStyle.Projecting };

function drawPage(pdfPage, page, fonts) {
  const H = page.height;
  if (page.background && page.background.toLowerCase() !== '#ffffff') {
    pdfPage.drawRectangle({ x: 0, y: 0, width: page.width, height: H, color: color(page.background) });
  }
  for (const it of page.items) {
    if (it.type === 'path') {
      const roundJoin = it.stroke && it.lineJoin === 'round';
      if (roundJoin) pdfPage.pushOperators(pushGraphicsState(), setLineJoin(LineJoinStyle.Round));
      pdfPage.drawSvgPath(it.d, {
        x: 0,
        y: H,
        color: color(it.fill),
        borderColor: it.stroke ? color(it.stroke) : undefined,
        borderWidth: it.stroke ? it.strokeWidth || 1 : 0,
        borderLineCap: it.stroke ? CAPS[it.lineCap] : undefined,
        opacity: it.opacity ?? 1,
        borderOpacity: it.opacity ?? 1,
      });
      if (roundJoin) pdfPage.pushOperators(popGraphicsState());
    } else if (it.type === 'text') {
      const spaced = !!it.letterSpacing;
      if (spaced) pdfPage.pushOperators(pushGraphicsState(), setCharacterSpacing(it.letterSpacing));
      pdfPage.drawText(it.text, { x: it.x, y: H - it.y, size: it.size, font: fonts[it.font], color: color(it.fill) });
      if (spaced) pdfPage.pushOperators(popGraphicsState());
    }
  }
}

/**
 * @param {Array} pages  display lists from layoutPage()
 * @param {{bytes: Record<string, Uint8Array>}} fonts
 * @param {{title?: string, subject?: string}} info
 * @returns {Promise<Uint8Array>}
 */
export async function renderPdf(pages, fonts, info = {}) {
  const doc = await PDFDocument.create();
  doc.registerFontkit(fontkit);
  const embedded = {};
  for (const key of ['regular', 'semibold', 'bold']) {
    embedded[key] = await doc.embedFont(fonts.bytes[key], { subset: true });
  }
  for (const page of pages) drawPage(doc.addPage([page.width, page.height]), page, embedded);

  doc.setTitle(info.title || 'Days of Grace – Church Tracker');
  doc.setSubject(info.subject || 'Printable Catholic church attendance tracker');
  doc.setKeywords(['Catholic', 'liturgical calendar', 'church tracker', 'Mass']);
  doc.setCreator('Days of Grace tracker generator');
  doc.setProducer('Days of Grace (pdf-lib)');
  return doc.save();
}
