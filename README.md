# Days of Grace – Church Tracker

A small website that creates the **“Days of Grace” church tracker** as a printable
PDF for **any year** (2026, 2027 and onwards): one pastel page with every Sunday,
the holy days and the major feasts of the Catholic liturgical year, each with a
circle to tick off when you go to Mass.

- Pick a year, choose A4 or US Letter, and download a vector PDF (made in the browser – nothing is uploaded).
- Live preview of the page as you change settings.
- The liturgical calendar is calculated, not typed in: Easter, Lent, Advent, the Ordinary Time Sunday numbers,
  feasts that fall on Sundays, and transferred solemnities are worked out for each year.
- Regional options: Epiphany on Sunday or January 6, Ascension on Thursday or Sunday, Corpus Christi on Sunday or Thursday,
  and an option to list more feasts (Presentation, Annunciation, St John the Baptist, Transfiguration, Holy Cross, Lateran Basilica).
- Personalise the title, subtitle and scripture verse; or download several years as one multi-page PDF.
- Twelve original month illustrations (Mary, Mother of God; ashes of Ash Wednesday; palm; Easter cross; Holy Trinity;
  Sacred Heart; Bible; rosary; chalice and host; dove; All Souls candle; Advent wreath), plus Candlemas candles
  for February in years when Lent begins in March.

## Run it

It is a static site – no build step.

```bash
npm install     # only needed for tests and the command-line generator
npm start       # serves the site at http://localhost:8080
```

Any static file server works (`python3 -m http.server`, GitHub Pages, Netlify, Vercel …). Opening
`index.html` straight from disk does not work, because browsers block module scripts and font loading on `file://`.

### Publish on GitHub Pages

Repository **Settings → Pages → Build and deployment → Deploy from a branch**, pick the branch and `/ (root)`.
The site will be at `https://<user>.github.io/Days_of_Grace/`.

### Command line

```bash
npm run sample -- 2027                     # days-of-grace-2027.pdf (A4)
node scripts/generate.mjs 2027 2030 --letter   # one PDF, a page per year
# other flags: --jan6  --ascension-sunday  --corpus-thursday  --extra  --out file.pdf
```

### Tests

```bash
npm test
```

The tests check Easter dates, the full 2026 list against the original printable, transfer rules
(e.g. St Joseph in Holy Week, Immaculate Conception on a Sunday), every year from 1900 to 2200 with every option,
and that the page layout fits for every year from 2026 to 2075 on both paper sizes.

## What is listed

Every Sunday (named after whatever is actually celebrated that day), plus:
Mary, Mother of God · Ash Wednesday · St Joseph · Holy Thursday, Good Friday, Holy Saturday · Ascension (when on Thursday) ·
Sacred Heart · Sts Peter & Paul · Assumption · All Saints · All Souls · Immaculate Conception · Christmas Eve · Christmas ·
Holy Family (when not on a Sunday) · Epiphany / Corpus Christi / Baptism of the Lord when they fall on a weekday.

Precedence and transfers follow the General Norms for the Liturgical Year and the Calendar, for example:
a solemnity on a Sunday of Advent or Lent moves to the Monday; St Joseph in Holy Week moves to the Saturday before Palm Sunday;
feasts of the Lord (Presentation, Transfiguration, Holy Cross, Lateran Basilica) take the place of a Sunday in Ordinary Time.
Dioceses can have their own particular calendars, so check locally.

> The 2026 printable this was modelled on has a few weekday slips (it lists *Wed* Jan 1, *Jul 7*, *Fri* Aug 15, *Sun* Nov 2
> and *Mon* Dec 8). The generator prints the correct days: Thu Jan 1, Sun Jul 5, Sat Aug 15, Mon Nov 2 and Tue Dec 8.

## How it works

| File | Purpose |
| --- | --- |
| `src/liturgical.js` | Liturgical calendar engine (computus, seasons, precedence, transfers) |
| `src/layout.js` | Page layout: staggered month columns, organic blobs, fitting and spacing |
| `src/icons.js` | The month illustrations, drawn as vector shapes |
| `src/geometry.js` | Path parsing/transforming, shapes and blob outlines |
| `src/text.js` | Font loading, measuring, wrapping, superscript ordinals, script lettering as outlines |
| `src/render-svg.js`, `src/render-pdf.js` | The same display list drawn as an SVG preview or a PDF |
| `src/theme.js` | Colours, paper sizes, verses |
| `src/app.js`, `index.html`, `css/site.css` | The website |

The page is laid out once into a list of paths and text runs, which is then drawn either as SVG (the preview)
or into a PDF with [pdf-lib](https://pdf-lib.js.org/), so the download matches the preview exactly.
`vendor/` holds the browser builds of pdf-lib and fontkit (refresh them with `npm run vendor`).

## Credits

- Fonts: [Sacramento](https://fonts.google.com/specimen/Sacramento) by Astigmatic and [Lora](https://fonts.google.com/specimen/Lora)
  by Cyreal – SIL Open Font License 1.1 (`fonts/OFL-*.txt`).
- [pdf-lib](https://github.com/Hopding/pdf-lib) and [@pdf-lib/fontkit](https://github.com/Hopding/fontkit) – MIT (`vendor/*.LICENSE*`).
- Design based on the “Days of Grace – 2026 Church Tracker” printable; the illustrations here are original.
