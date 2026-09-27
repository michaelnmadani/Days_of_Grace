// Roman Catholic liturgical calendar for any Gregorian year.
//
// Produces the list of days a "church tracker" shows: every Sunday (with the
// celebration that actually takes that Sunday), plus holy days and the major
// weekday celebrations of the year, following the General Norms for the
// Liturgical Year and the Calendar (precedence, transfers, Sunday numbering).
//
// Dates are handled as integer day numbers (days since 1970-01-01, UTC) so
// that there are no time-zone surprises.

export const DEFAULT_OPTIONS = Object.freeze({
  epiphany: 'sunday', // 'sunday' (Sunday between Jan 2–8) or 'jan6'
  ascension: 'thursday', // 'thursday' (Easter + 39) or 'sunday' (replaces 7th Sunday of Easter)
  corpusChristi: 'sunday', // 'sunday' (Trinity + 7) or 'thursday'
  extraFeasts: false, // also list Presentation, Annunciation, St John the Baptist, ...
});

export const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
export const MONTHS_SHORT = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
export const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

const DAY_MS = 86400000;

export function dayNumber(year, month, day) {
  return Math.round(Date.UTC(year, month - 1, day) / DAY_MS);
}

export function fromDayNumber(dn) {
  const d = new Date(dn * DAY_MS);
  return { year: d.getUTCFullYear(), month: d.getUTCMonth() + 1, day: d.getUTCDate(), weekday: d.getUTCDay() };
}

export function weekday(dn) {
  return ((dn % 7) + 7 + 4) % 7; // 1970-01-01 was a Thursday
}

/** Easter Sunday (Gregorian computus, Meeus/Jones/Butcher). */
export function easter(year) {
  const a = year % 19;
  const b = Math.floor(year / 100);
  const c = year % 100;
  const d = Math.floor(b / 4);
  const e = b % 4;
  const f = Math.floor((b + 8) / 25);
  const g = Math.floor((b - f + 1) / 3);
  const h = (19 * a + b - d - g + 15) % 30;
  const i = Math.floor(c / 4);
  const k = c % 4;
  const l = (32 + 2 * e + 2 * i - h - k) % 7;
  const m = Math.floor((a + 11 * h + 22 * l) / 451);
  const month = Math.floor((h + l - 7 * m + 114) / 31);
  const day = ((h + l - 7 * m + 114) % 31) + 1;
  return { month, day, dn: dayNumber(year, month, day) };
}

export function ordinal(n) {
  const s = n % 100 >= 11 && n % 100 <= 13 ? 'th' : ({ 1: 'st', 2: 'nd', 3: 'rd' }[n % 10] || 'th');
  return `${n}${s}`;
}

// Precedence ranks from the Table of Liturgical Days (lower = higher precedence).
const RANK = {
  TRIDUUM: 1,
  PRIVILEGED: 2, // Christmas, Epiphany, Ascension, Pentecost, Sundays of Advent/Lent/Easter, Ash Wed, Holy Week, Easter Octave
  SOLEMNITY: 3, // solemnities of the General Calendar, All Souls
  FEAST_OF_THE_LORD: 5,
  SUNDAY: 6, // Sundays of Christmas time and Ordinary Time
};

/**
 * Key moveable dates of a year, as day numbers.
 */
export function keyDates(year, opts = DEFAULT_OPTIONS) {
  const o = { ...DEFAULT_OPTIONS, ...opts };
  const E = easter(year).dn;
  const dn = (m, d) => dayNumber(year, m, d);
  const sundayOnOrBefore = (x) => x - weekday(x);
  const sundayAfter = (x) => x + (7 - weekday(x));

  const epiphany = o.epiphany === 'jan6' ? dn(1, 6) : sundayOnOrBefore(dn(1, 8));
  let baptism;
  if (o.epiphany === 'jan6') baptism = sundayAfter(dn(1, 6));
  else if (epiphany >= dn(1, 7)) baptism = epiphany + 1; // Monday after an Epiphany on Jan 7 or 8
  else baptism = epiphany + 7;

  const advent1 = sundayOnOrBefore(dn(12, 3));
  const christmas = dn(12, 25);
  const holyFamily = weekday(christmas) === 0 ? dn(12, 30) : sundayAfter(christmas);

  return {
    easter: E,
    epiphany,
    baptism,
    ashWednesday: E - 46,
    lent1: E - 42,
    palmSunday: E - 7,
    holyThursday: E - 3,
    goodFriday: E - 2,
    holySaturday: E - 1,
    divineMercy: E + 7,
    ascension: o.ascension === 'sunday' ? E + 42 : E + 39,
    pentecost: E + 49,
    trinity: E + 56,
    corpusChristi: o.corpusChristi === 'thursday' ? E + 60 : E + 63,
    sacredHeart: E + 68,
    christTheKing: advent1 - 7,
    advent1,
    christmas,
    holyFamily,
  };
}

function sundayCelebration(s, k, year, o) {
  const jan1 = dayNumber(year, 1, 1);
  if (s === k.easter) return { key: 'easter', title: 'Easter Sunday', bold: true, rank: RANK.PRIVILEGED };
  if (s === k.palmSunday) return { key: 'palmSunday', title: 'Palm Sunday', bold: true, rank: RANK.PRIVILEGED };
  if (s > k.ashWednesday && s < k.palmSunday) {
    const n = (s - k.lent1) / 7 + 1;
    return { key: `lent${n}`, title: `${ordinal(n)} Sunday of Lent`, rank: RANK.PRIVILEGED };
  }
  if (s === k.divineMercy) return { key: 'divineMercy', title: 'Divine Mercy Sunday', rank: RANK.PRIVILEGED };
  if (s > k.easter && s < k.pentecost) {
    if (s === k.ascension) return { key: 'ascension', title: 'Ascension of the Lord', rank: RANK.PRIVILEGED };
    const n = (s - k.easter) / 7 + 1;
    return { key: `easter${n}`, title: `${ordinal(n)} Sunday of Easter`, rank: RANK.PRIVILEGED };
  }
  if (s === k.pentecost) return { key: 'pentecost', title: 'Pentecost Sunday', bold: true, rank: RANK.PRIVILEGED };
  if (s === k.trinity) return { key: 'trinity', title: 'Holy Trinity Sunday', bold: true, rank: RANK.SOLEMNITY };
  if (s === k.corpusChristi) return { key: 'corpusChristi', title: 'Corpus Christi', rank: RANK.SOLEMNITY };
  if (s === k.christTheKing) return { key: 'christTheKing', title: 'Christ the King Sunday', bold: true, rank: RANK.SOLEMNITY };
  if (s >= k.advent1 && s < k.christmas) {
    const n = (s - k.advent1) / 7 + 1;
    return { key: `advent${n}`, title: `${ordinal(n)} Sunday of Advent`, bold: n === 1, rank: RANK.PRIVILEGED };
  }
  if (s === k.christmas) return null; // handled as a fixed celebration
  if (s === k.holyFamily) return { key: 'holyFamily', title: 'Feast of the Holy Family', rank: RANK.FEAST_OF_THE_LORD };
  if (s === jan1) return null; // Mary, Mother of God (fixed)
  if (s === k.epiphany) return { key: 'epiphany', title: 'Epiphany of the Lord', rank: RANK.PRIVILEGED };
  if (s < k.epiphany) return { key: 'christmas2', title: `${ordinal(2)} Sunday after Christmas`, rank: RANK.SUNDAY };
  if (s === k.baptism) return { key: 'baptism', title: 'Baptism of the Lord', rank: RANK.FEAST_OF_THE_LORD };
  if (s > k.baptism && s < k.ashWednesday) {
    const firstOT = k.baptism + (7 - weekday(k.baptism)); // first Sunday after the Baptism
    const n = 2 + (s - firstOT) / 7;
    return { key: `ot${n}`, title: `${ordinal(n)} Sunday in Ordinary Time`, rank: RANK.SUNDAY };
  }
  if (s > k.pentecost && s < k.christTheKing) {
    const n = 34 - (k.christTheKing - s) / 7;
    return { key: `ot${n}`, title: `${ordinal(n)} Sunday in Ordinary Time`, rank: RANK.SUNDAY };
  }
  throw new Error(`Unclassified Sunday ${JSON.stringify(fromDayNumber(s))}`);
}

/**
 * Fixed-date celebrations. `list` = shown on the tracker even on a weekday;
 * `extra` = shown on a weekday only when opts.extraFeasts is set (they always
 * show when they take over a Sunday).
 */
const FIXED = [
  { m: 1, d: 1, key: 'maryMotherOfGod', title: 'Solemnity of Mary, Mother of God', bold: true, rank: RANK.SOLEMNITY, list: true },
  { m: 2, d: 2, key: 'presentation', title: 'Presentation of the Lord', rank: RANK.FEAST_OF_THE_LORD, extra: true },
  { m: 3, d: 19, key: 'joseph', title: 'Feast of St. Joseph', rank: RANK.SOLEMNITY, list: true, transfer: 'joseph' },
  { m: 3, d: 25, key: 'annunciation', title: 'Annunciation of the Lord', rank: RANK.SOLEMNITY, extra: true, transfer: 'annunciation' },
  { m: 6, d: 24, key: 'johnBaptist', title: 'Nativity of St. John the Baptist', rank: RANK.SOLEMNITY, extra: true },
  { m: 6, d: 29, key: 'peterPaul', title: 'Feast of Sts. Peter & Paul', rank: RANK.SOLEMNITY, list: true },
  { m: 8, d: 6, key: 'transfiguration', title: 'Transfiguration of the Lord', rank: RANK.FEAST_OF_THE_LORD, extra: true },
  { m: 8, d: 15, key: 'assumption', title: 'Assumption of the Blessed Virgin Mary', rank: RANK.SOLEMNITY, list: true },
  { m: 9, d: 14, key: 'holyCross', title: 'Exaltation of the Holy Cross', rank: RANK.FEAST_OF_THE_LORD, extra: true },
  { m: 11, d: 1, key: 'allSaints', title: 'All Saints’ Day', bold: true, rank: RANK.SOLEMNITY, list: true },
  { m: 11, d: 2, key: 'allSouls', title: 'All Souls’ Day', bold: true, rank: RANK.SOLEMNITY, list: true },
  { m: 11, d: 9, key: 'lateran', title: 'Dedication of the Lateran Basilica', rank: RANK.FEAST_OF_THE_LORD, extra: true },
  { m: 12, d: 8, key: 'immaculateConception', title: 'Immaculate Conception', bold: true, rank: RANK.SOLEMNITY, list: true },
  { m: 12, d: 25, key: 'christmas', title: 'Christmas Day', bold: true, rank: RANK.PRIVILEGED, list: true },
];

/**
 * All tracker entries for a year, sorted by date.
 * Each entry: { dn, year, month, day, weekday, key, title, subtitle?, bold, dateLabel }
 */
export function trackerEntries(year, opts = {}) {
  const o = { ...DEFAULT_OPTIONS, ...opts };
  const k = keyDates(year, o);
  const byDay = new Map(); // dn -> celebration occupying the liturgical day
  const extras = []; // additional entries that share a day (e.g. Christmas Eve)

  const start = dayNumber(year, 1, 1);
  const end = dayNumber(year, 12, 31);

  // 1. Sundays.
  for (let s = start + ((7 - weekday(start)) % 7); s <= end; s += 7) {
    const c = sundayCelebration(s, k, year, o);
    if (c) byDay.set(s, { ...c, list: true, sunday: true });
  }

  // 2. Moveable weekday celebrations.
  const moveable = [
    { dn: k.ashWednesday, key: 'ashWednesday', title: 'Ash Wednesday', subtitle: 'Start of Lent', bold: true, rank: RANK.PRIVILEGED },
    { dn: k.holyThursday, key: 'holyThursday', title: 'Holy Thursday', rank: RANK.TRIDUUM },
    { dn: k.goodFriday, key: 'goodFriday', title: 'Good Friday', rank: RANK.TRIDUUM },
    { dn: k.holySaturday, key: 'holySaturday', title: 'Holy Saturday', rank: RANK.TRIDUUM },
    { dn: k.sacredHeart, key: 'sacredHeart', title: 'Feast of the Sacred Heart of Jesus', rank: RANK.SOLEMNITY },
  ];
  if (o.ascension !== 'sunday') moveable.push({ dn: k.ascension, key: 'ascension', title: 'Ascension of the Lord', rank: RANK.PRIVILEGED });
  if (o.corpusChristi === 'thursday') moveable.push({ dn: k.corpusChristi, key: 'corpusChristi', title: 'Corpus Christi', rank: RANK.SOLEMNITY });
  if (o.epiphany === 'jan6' && weekday(k.epiphany) !== 0) moveable.push({ dn: k.epiphany, key: 'epiphany', title: 'Epiphany of the Lord', rank: RANK.PRIVILEGED });
  if (weekday(k.baptism) !== 0) moveable.push({ dn: k.baptism, key: 'baptism', title: 'Baptism of the Lord', rank: RANK.FEAST_OF_THE_LORD });
  if (weekday(k.holyFamily) !== 0) moveable.push({ dn: k.holyFamily, key: 'holyFamily', title: 'Feast of the Holy Family', rank: RANK.FEAST_OF_THE_LORD });
  for (const c of moveable) {
    const { dn, ...rest } = c;
    byDay.set(dn, { ...rest, list: true });
  }
  // Days that impede a solemnity even though they are not listed themselves.
  const impeding = new Set();
  for (let d = k.palmSunday; d <= k.divineMercy; d++) impeding.add(d); // Holy Week + Easter Octave

  // 3. Fixed celebrations, applying precedence and transfers.
  for (const f of FIXED) {
    const date = dayNumber(year, f.m, f.d);
    const target = resolveFixed(f, date, k, byDay, impeding);
    if (target === null) continue;
    const listed = f.list || (f.extra && o.extraFeasts);
    const existing = byDay.get(target);
    if (existing && existing.sunday) {
      byDay.set(target, { ...f, list: true, sunday: true }); // takes over the Sunday
    } else if (listed) {
      byDay.set(target, { ...f, list: true });
    }
  }

  // Christmas Eve is its own entry even when it shares the day with the 4th Sunday of Advent.
  extras.push({ dn: dayNumber(year, 12, 24), key: 'christmasEve', title: 'Christmas Eve', bold: true, list: true });

  const entries = [];
  for (const [dn, c] of byDay) if (c.list) entries.push(makeEntry(dn, c));
  for (const c of extras) entries.push(makeEntry(c.dn, c));
  entries.sort((a, b) => a.dn - b.dn || (a.key === 'christmasEve' ? 1 : -1));
  return entries;
}

// Returns the day a fixed celebration is actually kept on, or null if it is omitted that year.
function resolveFixed(f, date, k, byDay, impeding) {
  const here = byDay.get(date);
  const outranked = here && here.rank <= f.rank;

  if (f.transfer === 'joseph') {
    // In Holy Week: anticipated to the Saturday before Palm Sunday.
    if (date >= k.palmSunday && date <= k.holySaturday) return k.palmSunday - 1;
    if (outranked) return date + 1; // Sunday of Lent -> Monday
    return date;
  }
  if (f.transfer === 'annunciation') {
    // In Holy Week or the Easter Octave: Monday after the Second Sunday of Easter.
    if (impeding.has(date)) return k.divineMercy + 1;
    if (outranked) return date + 1;
    return date;
  }
  if (!outranked) return date;
  if (f.rank > RANK.SOLEMNITY) return null; // an impeded feast is simply omitted
  if (here && here.sunday) return date + 1; // e.g. Immaculate Conception on the 2nd Sunday of Advent -> Monday
  // A solemnity on the same day as another solemnity (e.g. the Sacred Heart):
  // kept on the preceding day, as the Holy See did for St John the Baptist in 2022.
  return byDay.has(date - 1) ? date + 1 : date - 1;
}

function makeEntry(dn, c) {
  const { year, month, day, weekday: wd } = fromDayNumber(dn);
  return {
    dn,
    year,
    month,
    day,
    weekday: wd,
    key: c.key,
    title: c.title,
    subtitle: c.subtitle,
    bold: !!c.bold,
    dateLabel: `${WEEKDAYS[wd]}, ${MONTHS_SHORT[month - 1]} ${day}`,
  };
}

/** Entries grouped by month: array of 12 arrays. */
export function entriesByMonth(year, opts = {}) {
  const months = Array.from({ length: 12 }, () => []);
  for (const e of trackerEntries(year, opts)) months[e.month - 1].push(e);
  return months;
}
