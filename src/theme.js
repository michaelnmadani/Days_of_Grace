// Colours and page sizes. The palette follows the original printable:
// soft, slightly chalky pastels, one per month, with warm charcoal text.

export const PAPER = {
  a4: { name: 'A4', width: 595.28, height: 841.89 },
  letter: { name: 'US Letter', width: 612, height: 792 },
};

export const COLORS = {
  ink: '#3b3533',
  checkbox: '#4a4341',
  peach: '#f5d6c8', // title highlight + verse hill
  paper: '#ffffff',
};

// Month blob colours, January..December.
export const MONTH_COLORS = [
  '#d3e3f1', // January – soft sky blue
  '#f6dcdd', // February – blush pink
  '#f8eeb8', // March – butter yellow
  '#d6e5c4', // April – spring sage
  '#dfd9ef', // May – lavender
  '#acd3da', // June – sea-glass teal
  '#f4e3e0', // July – rose quartz
  '#f7ebc5', // August – buttercream
  '#e3e8d8', // September – pale sage
  '#f6dabe', // October – apricot
  '#e9c9bc', // November – dusty rose
  '#e2ebdc', // December – frosted mint
];

// Default icon for each month (see icons.js). February switches to the
// Candlemas candles in years when Ash Wednesday falls in March.
export const MONTH_ICONS = [
  'madonna', 'ashes', 'palm', 'easter', 'trinity', 'sacredHeart',
  'bible', 'rosary', 'eucharist', 'dove', 'candle', 'wreath',
];

export const VERSES = [
  {
    id: 'ps122',
    lines: ['“I rejoiced with those who said to me,', '‘Let us go to the house of the Lord.’”'],
    ref: 'Psalm 122:1',
  },
  {
    id: 'ps118',
    lines: ['“This is the day the Lord has made;', 'let us rejoice in it and be glad.”'],
    ref: 'Psalm 118:24',
  },
  {
    id: 'mt18',
    lines: ['“For where two or three are gathered in', 'my name, there am I in the midst of them.”'],
    ref: 'Matthew 18:20',
  },
  {
    id: 'ps95',
    lines: ['“Come, let us worship and bow down;', 'let us kneel before the Lord, our Maker.”'],
    ref: 'Psalm 95:6',
  },
  {
    id: 'ps84',
    lines: ['“Better is one day in your courts', 'than a thousand elsewhere.”'],
    ref: 'Psalm 84:10',
  },
];
