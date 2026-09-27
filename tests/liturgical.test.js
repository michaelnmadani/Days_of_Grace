import { test } from 'node:test';
import assert from 'node:assert/strict';
import { easter, trackerEntries, entriesByMonth, dayNumber, weekday, keyDates, WEEKDAYS } from '../src/liturgical.js';

const iso = ({ year, month, day }) => `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
const find = (entries, key) => entries.filter((e) => e.key === key);
const on = (entries, y, m, d) => entries.filter((e) => e.dn === dayNumber(y, m, d));

test('Easter dates (Gregorian computus)', () => {
  const known = {
    1818: '03-22', 1943: '04-25', 2000: '04-23', 2008: '03-23', 2019: '04-21', 2022: '04-17', 2024: '03-31',
    2025: '04-20', 2026: '04-05', 2027: '03-28', 2028: '04-16', 2029: '04-01', 2030: '04-21', 2031: '04-13',
    2032: '03-28', 2033: '04-17', 2034: '04-09', 2035: '03-25', 2038: '04-25', 2285: '03-22',
  };
  for (const [y, md] of Object.entries(known)) {
    const e = easter(Number(y));
    assert.equal(`${String(e.month).padStart(2, '0')}-${String(e.day).padStart(2, '0')}`, md, `Easter ${y}`);
  }
});

test('2026 matches the original printable (with the correct weekdays)', () => {
  const got = trackerEntries(2026).map((e) => `${e.dateLabel} | ${e.title}${e.subtitle ? ` / ${e.subtitle}` : ''}${e.bold ? ' *' : ''}`);
  const expected = [
    'Thu, Jan 1 | Solemnity of Mary, Mother of God *', // the printout says "Wed" – Jan 1 2026 is a Thursday
    'Sun, Jan 4 | Epiphany of the Lord',
    'Sun, Jan 11 | Baptism of the Lord',
    'Sun, Jan 18 | 2nd Sunday in Ordinary Time',
    'Sun, Jan 25 | 3rd Sunday in Ordinary Time',
    'Sun, Feb 1 | 4th Sunday in Ordinary Time',
    'Sun, Feb 8 | 5th Sunday in Ordinary Time',
    'Sun, Feb 15 | 6th Sunday in Ordinary Time',
    'Wed, Feb 18 | Ash Wednesday / Start of Lent *',
    'Sun, Feb 22 | 1st Sunday of Lent',
    'Sun, Mar 1 | 2nd Sunday of Lent',
    'Sun, Mar 8 | 3rd Sunday of Lent',
    'Sun, Mar 15 | 4th Sunday of Lent',
    'Thu, Mar 19 | Feast of St. Joseph',
    'Sun, Mar 22 | 5th Sunday of Lent',
    'Sun, Mar 29 | Palm Sunday *',
    'Thu, Apr 2 | Holy Thursday',
    'Fri, Apr 3 | Good Friday',
    'Sat, Apr 4 | Holy Saturday',
    'Sun, Apr 5 | Easter Sunday *',
    'Sun, Apr 12 | Divine Mercy Sunday',
    'Sun, Apr 19 | 3rd Sunday of Easter',
    'Sun, Apr 26 | 4th Sunday of Easter',
    'Sun, May 3 | 5th Sunday of Easter',
    'Sun, May 10 | 6th Sunday of Easter',
    'Thu, May 14 | Ascension of the Lord',
    'Sun, May 17 | 7th Sunday of Easter',
    'Sun, May 24 | Pentecost Sunday *',
    'Sun, May 31 | Holy Trinity Sunday *',
    'Sun, Jun 7 | Corpus Christi',
    'Fri, Jun 12 | Feast of the Sacred Heart of Jesus',
    'Sun, Jun 14 | 11th Sunday in Ordinary Time',
    'Sun, Jun 21 | 12th Sunday in Ordinary Time',
    'Sun, Jun 28 | 13th Sunday in Ordinary Time',
    'Mon, Jun 29 | Feast of Sts. Peter & Paul',
    'Sun, Jul 5 | 14th Sunday in Ordinary Time', // printout says "Jul 7"
    'Sun, Jul 12 | 15th Sunday in Ordinary Time',
    'Sun, Jul 19 | 16th Sunday in Ordinary Time',
    'Sun, Jul 26 | 17th Sunday in Ordinary Time',
    'Sun, Aug 2 | 18th Sunday in Ordinary Time',
    'Sun, Aug 9 | 19th Sunday in Ordinary Time',
    'Sat, Aug 15 | Assumption of the Blessed Virgin Mary', // printout says "Fri"
    'Sun, Aug 16 | 20th Sunday in Ordinary Time',
    'Sun, Aug 23 | 21st Sunday in Ordinary Time',
    'Sun, Aug 30 | 22nd Sunday in Ordinary Time',
    'Sun, Sep 6 | 23rd Sunday in Ordinary Time',
    'Sun, Sep 13 | 24th Sunday in Ordinary Time',
    'Sun, Sep 20 | 25th Sunday in Ordinary Time',
    'Sun, Sep 27 | 26th Sunday in Ordinary Time',
    'Sun, Oct 4 | 27th Sunday in Ordinary Time',
    'Sun, Oct 11 | 28th Sunday in Ordinary Time',
    'Sun, Oct 18 | 29th Sunday in Ordinary Time',
    'Sun, Oct 25 | 30th Sunday in Ordinary Time',
    'Sun, Nov 1 | All Saints’ Day *',
    'Mon, Nov 2 | All Souls’ Day *', // printout says "Sun"
    'Sun, Nov 8 | 32nd Sunday in Ordinary Time',
    'Sun, Nov 15 | 33rd Sunday in Ordinary Time',
    'Sun, Nov 22 | Christ the King Sunday *',
    'Sun, Nov 29 | 1st Sunday of Advent *',
    'Sun, Dec 6 | 2nd Sunday of Advent',
    'Tue, Dec 8 | Immaculate Conception *', // printout says "Mon"
    'Sun, Dec 13 | 3rd Sunday of Advent',
    'Sun, Dec 20 | 4th Sunday of Advent',
    'Thu, Dec 24 | Christmas Eve *',
    'Fri, Dec 25 | Christmas Day *',
    'Sun, Dec 27 | Feast of the Holy Family',
  ];
  assert.deepEqual(got, expected);
});

test('2025: solemnities and feasts that take over Sundays in Ordinary Time', () => {
  const e = trackerEntries(2025);
  assert.equal(on(e, 2025, 2, 2)[0].title, 'Presentation of the Lord');
  assert.equal(on(e, 2025, 6, 22)[0].title, 'Corpus Christi');
  assert.equal(on(e, 2025, 6, 29)[0].key, 'peterPaul');
  assert.equal(on(e, 2025, 7, 6)[0].title, '14th Sunday in Ordinary Time');
  assert.equal(on(e, 2025, 9, 14)[0].title, 'Exaltation of the Holy Cross');
  assert.equal(on(e, 2025, 11, 2)[0].key, 'allSouls');
  assert.equal(on(e, 2025, 11, 9)[0].title, 'Dedication of the Lateran Basilica');
  assert.equal(on(e, 2025, 11, 16)[0].title, '33rd Sunday in Ordinary Time');
  assert.equal(on(e, 2025, 11, 23)[0].key, 'christTheKing');
  assert.equal(on(e, 2025, 11, 30)[0].key, 'advent1');
  // weekday feasts of the Lord are only listed when asked for
  assert.equal(find(trackerEntries(2026), 'presentation').length, 0);
  assert.equal(find(trackerEntries(2026, { extraFeasts: true }), 'presentation').length, 1);
});

test('transfers: Immaculate Conception, St Joseph, Annunciation', () => {
  // Dec 8 on the 2nd Sunday of Advent -> Monday Dec 9
  assert.equal(iso(find(trackerEntries(2024), 'immaculateConception')[0]), '2024-12-09');
  assert.equal(iso(find(trackerEntries(2030), 'immaculateConception')[0]), '2030-12-09');
  // St Joseph in Holy Week -> Saturday before Palm Sunday (as in 2008 and 2035)
  assert.equal(iso(find(trackerEntries(2008), 'joseph')[0]), '2008-03-15');
  assert.equal(iso(find(trackerEntries(2035), 'joseph')[0]), '2035-03-17');
  // St Joseph on a Sunday of Lent -> Monday
  assert.equal(iso(find(trackerEntries(2028), 'joseph')[0]), '2028-03-20');
  // Annunciation in Holy Week -> Monday after Divine Mercy Sunday (2024: April 8)
  assert.equal(iso(find(trackerEntries(2024, { extraFeasts: true }), 'annunciation')[0]), '2024-04-08');
  // Sacred Heart on June 24 (2022): St John the Baptist moved to June 23, as the Holy See decided
  assert.equal(iso(find(trackerEntries(2022, { extraFeasts: true }), 'johnBaptist')[0]), '2022-06-23');
});

test('Christmas season edge cases', () => {
  // Christmas on a Sunday: Holy Family on Friday Dec 30; Christmas Eve shares the 4th Sunday of Advent
  const e22 = trackerEntries(2022);
  assert.equal(iso(find(e22, 'holyFamily')[0]), '2022-12-30');
  const e23 = trackerEntries(2023);
  const dec24 = on(e23, 2023, 12, 24).map((x) => x.key);
  assert.deepEqual(dec24, ['advent4', 'christmasEve']);
  // Jan 1 on a Sunday is Mary, Mother of God; Epiphany Jan 8 -> Baptism on Monday Jan 9
  assert.equal(on(e23, 2023, 1, 1)[0].key, 'maryMotherOfGod');
  assert.equal(iso(find(e23, 'epiphany')[0]), '2023-01-08');
  assert.equal(iso(find(e23, 'baptism')[0]), '2023-01-09');
  assert.equal(on(e23, 2023, 1, 15)[0].title, '2nd Sunday in Ordinary Time');
});

test('regional options', () => {
  const jan6 = trackerEntries(2027, { epiphany: 'jan6' });
  assert.equal(iso(find(jan6, 'epiphany')[0]), '2027-01-06');
  assert.equal(on(jan6, 2027, 1, 3)[0].title, '2nd Sunday after Christmas');
  assert.equal(iso(find(jan6, 'baptism')[0]), '2027-01-10');

  const ascSun = trackerEntries(2026, { ascension: 'sunday' });
  assert.equal(find(ascSun, 'ascension').length, 1);
  assert.equal(iso(find(ascSun, 'ascension')[0]), '2026-05-17');
  assert.equal(find(ascSun, 'easter7').length, 0);

  const corpusThu = trackerEntries(2026, { corpusChristi: 'thursday' });
  assert.equal(iso(find(corpusThu, 'corpusChristi')[0]), '2026-06-04');
  assert.equal(on(corpusThu, 2026, 6, 7)[0].title, '10th Sunday in Ordinary Time');
});

test('every Sunday is listed exactly once, labels match real weekdays (1900–2200, all options)', () => {
  const combos = [];
  for (const epiphany of ['sunday', 'jan6'])
    for (const ascension of ['thursday', 'sunday'])
      for (const corpusChristi of ['sunday', 'thursday'])
        for (const extraFeasts of [false, true]) combos.push({ epiphany, ascension, corpusChristi, extraFeasts });
  for (let y = 1900; y <= 2200; y++) {
    for (const opts of combos) {
      const entries = trackerEntries(y, opts);
      const sundays = entries.filter((e) => e.weekday === 0 && e.key !== 'christmasEve');
      const seen = new Set();
      for (const e of entries) {
        assert.equal(WEEKDAYS[weekday(e.dn)], e.dateLabel.slice(0, 3));
        assert.ok(e.year === y, `entry outside year ${y}`);
        assert.ok(!/undefined|NaN/.test(e.title), `${y} ${e.title}`);
        if (e.key !== 'christmasEve') {
          assert.ok(!seen.has(e.dn), `duplicate day ${e.dateLabel} ${y}`);
          seen.add(e.dn);
        }
      }
      let count = 0;
      for (let d = dayNumber(y, 1, 1); d <= dayNumber(y, 12, 31); d++) if (weekday(d) === 0) count++;
      assert.equal(sundays.length, count, `Sundays in ${y}`);
    }
  }
});

test('Ordinary Time numbering is continuous and ends at the 34th week', () => {
  for (let y = 2026; y <= 2100; y++) {
    const k = keyDates(y);
    const ot = trackerEntries(y).filter((e) => e.key.startsWith('ot')).map((e) => Number(e.key.slice(2)));
    assert.ok(ot.every((n) => n >= 2 && n <= 33), `${y}: ${ot}`);
    const before = ot.filter((_, i, a) => i === 0 || a[i] > a[i - 1]);
    assert.ok(before.length >= ot.length - 1, `${y} numbering goes backwards more than once`);
    assert.equal(weekday(k.christTheKing), 0);
  }
});

test('entriesByMonth groups by month', () => {
  const months = entriesByMonth(2027);
  assert.equal(months.length, 12);
  months.forEach((m, i) => m.forEach((e) => assert.equal(e.month, i + 1)));
});
