/**
 * Generates a genuine custom binary TrueType (.ttf) Voxel Pixel Font:
 * frontend/public/fonts/ThePokerVoxel.ttf
 *
 * Pure Node.js, zero external dependencies.
 * Every glyph is built from crisp 5x7 blocky voxel contours (100 units per pixel, 1000 UPM).
 */
import fs from 'fs';
import path from 'path';

const UPM = 1000;
const PX = 110; // pixel size in font units
const ADVANCE = 700;

// 5x7 crisp blocky voxel bitmaps (row 0 = top, row 6 = bottom)
const BITMAPS = {
  ' ': ['.....', '.....', '.....', '.....', '.....', '.....', '.....'],
  '!': ['..#..', '..#..', '..#..', '..#..', '..#..', '.....', '..#..'],
  '#': ['.#.#.', '#####', '.#.#.', '.#.#.', '#####', '.#.#.', '.....'],
  '%': ['##..#', '##.#.', '..#..', '.#...', '#.##.', '..##.', '.....'],
  '(': ['..##.', '.#...', '#....', '#....', '#....', '.#...', '..##.'],
  ')': ['.##..', '...#.', '....#', '....#', '....#', '...#.', '.##..'],
  '+': ['.....', '..#..', '..#..', '#####', '..#..', '..#..', '.....'],
  ',': ['.....', '.....', '.....', '.....', '..#..', '..#..', '.#...'],
  '-': ['.....', '.....', '.....', '#####', '.....', '.....', '.....'],
  '.': ['.....', '.....', '.....', '.....', '.....', '.##..', '.##..'],
  '/': ['....#', '...#.', '...#.', '..#..', '.#...', '.#...', '#....'],
  ':': ['.....', '.##..', '.##..', '.....', '.##..', '.##..', '.....'],
  '[': ['.###.', '.#...', '.#...', '.#...', '.#...', '.#...', '.###.'],
  ']': ['.###.', '...#.', '...#.', '...#.', '...#.', '...#.', '.###.'],
  '|': ['..#..', '..#..', '..#..', '..#..', '..#..', '..#..', '..#..'],
  '0': ['.###.', '#..##', '#.#.#', '#.#.#', '##..#', '#...#', '.###.'],
  '1': ['..#..', '.##..', '..#..', '..#..', '..#..', '..#..', '.###.'],
  '2': ['.###.', '#...#', '....#', '..##.', '.#...', '#....', '#####'],
  '3': ['####.', '....#', '....#', '.###.', '....#', '....#', '####.'],
  '4': ['...#.', '..##.', '.#.#.', '#..#.', '#####', '...#.', '...#.'],
  '5': ['#####', '#....', '####.', '....#', '....#', '#...#', '.###.'],
  '6': ['.###.', '#....', '####.', '#...#', '#...#', '#...#', '.###.'],
  '7': ['#####', '....#', '...#.', '..#..', '.#...', '.#...', '.#...'],
  '8': ['.###.', '#...#', '#...#', '.###.', '#...#', '#...#', '.###.'],
  '9': ['.###.', '#...#', '#...#', '.####', '....#', '...#.', '.##..'],
  A: ['.###.', '#...#', '#...#', '#####', '#...#', '#...#', '#...#'],
  B: ['####.', '#...#', '#...#', '####.', '#...#', '#...#', '####.'],
  C: ['.###.', '#...#', '#....', '#....', '#....', '#...#', '.###.'],
  D: ['####.', '#...#', '#...#', '#...#', '#...#', '#...#', '####.'],
  E: ['#####', '#....', '#....', '####.', '#....', '#....', '#####'],
  F: ['#####', '#....', '#....', '####.', '#....', '#....', '#....'],
  G: ['.###.', '#...#', '#....', '#..##', '#...#', '#...#', '.###.'],
  H: ['#...#', '#...#', '#...#', '#####', '#...#', '#...#', '#...#'],
  I: ['.###.', '..#..', '..#..', '..#..', '..#..', '..#..', '.###.'],
  J: ['..###', '...#.', '...#.', '...#.', '#..#.', '#..#.', '.##..'],
  K: ['#...#', '#..#.', '#.#..', '##...', '#.#..', '#..#.', '#...#'],
  L: ['#....', '#....', '#....', '#....', '#....', '#....', '#####'],
  M: ['#...#', '##.##', '#.#.#', '#...#', '#...#', '#...#', '#...#'],
  N: ['#...#', '##..#', '#.#.#', '#..##', '#...#', '#...#', '#...#'],
  O: ['.###.', '#...#', '#...#', '#...#', '#...#', '#...#', '.###.'],
  P: ['####.', '#...#', '#...#', '####.', '#....', '#....', '#....'],
  Q: ['.###.', '#...#', '#...#', '#...#', '#.#.#', '#..#.', '.##.#'],
  R: ['####.', '#...#', '#...#', '####.', '#.#..', '#..#.', '#...#'],
  S: ['.####', '#....', '#....', '.###.', '....#', '....#', '####.'],
  T: ['#####', '..#..', '..#..', '..#..', '..#..', '..#..', '..#..'],
  U: ['#...#', '#...#', '#...#', '#...#', '#...#', '#...#', '.###.'],
  V: ['#...#', '#...#', '#...#', '#...#', '.#.#.', '.#.#.', '..#..'],
  W: ['#...#', '#...#', '#...#', '#...#', '#.#.#', '##.##', '#...#'],
  X: ['#...#', '#...#', '.#.#.', '..#..', '.#.#.', '#...#', '#...#'],
  Y: ['#...#', '#...#', '.#.#.', '..#..', '..#..', '..#..', '..#..'],
  Z: ['#####', '....#', '...#.', '..#..', '.#...', '#....', '#####'],
};

// Map lowercase to uppercase for unified crisp arcade/voxel display
for (let c = 97; c <= 122; c++) {
  const ch = String.fromCharCode(c);
  BITMAPS[ch] = BITMAPS[ch.toUpperCase()];
}

function buildGlyfRecord(rows) {
  // Collect horizontal runs per row into clockwise square contours
  const rects = [];
  for (let r = 0; r < rows.length; r++) {
    const line = rows[r];
    let c = 0;
    while (c < line.length) {
      if (line[c] === '#') {
        const start = c;
        while (c < line.length && line[c] === '#') c++;
        const x1 = 60 + start * PX;
        const x2 = 60 + c * PX;
        const y2 = (7 - r) * PX;
        const y1 = (6 - r) * PX;
        rects.push([x1, y1, x2, y2]);
      } else {
        c++;
      }
    }
  }

  if (rects.length === 0) return Buffer.alloc(0);

  let xMin = 32767, yMin = 32767, xMax = -32768, yMax = -32768;
  const xs = [];
  const ys = [];
  const endPts = [];

  for (const [x1, y1, x2, y2] of rects) {
    xMin = Math.min(xMin, x1);
    yMin = Math.min(yMin, y1);
    xMax = Math.max(xMax, x2);
    yMax = Math.max(yMax, y2);
    // Clockwise contour: (x1,y1) -> (x1,y2) -> (x2,y2) -> (x2,y1)
    xs.push(x1, x1, x2, x2);
    ys.push(y1, y2, y2, y1);
    endPts.push(xs.length - 1);
  }

  const numContours = rects.length;
  const numPts = xs.length;
  const flags = Buffer.alloc(numPts, 0x01); // on-curve, 16-bit deltas

  const xDeltas = Buffer.alloc(numPts * 2);
  const yDeltas = Buffer.alloc(numPts * 2);
  let prevX = 0;
  let prevY = 0;
  for (let i = 0; i < numPts; i++) {
    xDeltas.writeInt16BE(xs[i] - prevX, i * 2);
    yDeltas.writeInt16BE(ys[i] - prevY, i * 2);
    prevX = xs[i];
    prevY = ys[i];
  }

  const header = Buffer.alloc(10 + numContours * 2 + 2);
  header.writeInt16BE(numContours, 0);
  header.writeInt16BE(xMin, 2);
  header.writeInt16BE(yMin, 4);
  header.writeInt16BE(xMax, 6);
  header.writeInt16BE(yMax, 8);
  for (let i = 0; i < numContours; i++) {
    header.writeUInt16BE(endPts[i], 10 + i * 2);
  }
  header.writeUInt16BE(0, 10 + numContours * 2); // instructionLength = 0

  const raw = Buffer.concat([header, flags, xDeltas, yDeltas]);
  const pad = (4 - (raw.length % 4)) % 4;
  return pad ? Buffer.concat([raw, Buffer.alloc(pad)]) : raw;
}

function calcChecksum(buf) {
  const padded = buf.length % 4 === 0 ? buf : Buffer.concat([buf, Buffer.alloc(4 - (buf.length % 4))]);
  let sum = 0;
  for (let i = 0; i < padded.length; i += 4) {
    sum = (sum + padded.readUInt32BE(i)) >>> 0;
  }
  return sum;
}

function buildTTF() {
  const charCodes = Object.keys(BITMAPS)
    .map((ch) => ch.charCodeAt(0))
    .sort((a, b) => a - b);

  // Glyph 0 = .notdef (empty box)
  const glyphBuffers = [
    buildGlyfRecord(['#####', '#...#', '#...#', '#...#', '#...#', '#...#', '#####']),
  ];
  const codeToGid = new Map();
  for (const code of charCodes) {
    const ch = String.fromCharCode(code);
    codeToGid.set(code, glyphBuffers.length);
    glyphBuffers.push(buildGlyfRecord(BITMAPS[ch]));
  }

  const numGlyphs = glyphBuffers.length;

  // loca (long format, 4 bytes per entry) & glyf
  const loca = Buffer.alloc((numGlyphs + 1) * 4);
  let offset = 0;
  for (let i = 0; i < numGlyphs; i++) {
    loca.writeUInt32BE(offset, i * 4);
    offset += glyphBuffers[i].length;
  }
  loca.writeUInt32BE(offset, numGlyphs * 4);
  const glyf = Buffer.concat(glyphBuffers);

  // hmtx
  const hmtx = Buffer.alloc(numGlyphs * 4);
  for (let i = 0; i < numGlyphs; i++) {
    hmtx.writeUInt16BE(ADVANCE, i * 4);
    hmtx.writeInt16BE(60, i * 4 + 2);
  }

  // head
  const head = Buffer.alloc(54);
  head.writeUInt32BE(0x00010000, 0);
  head.writeUInt32BE(0x00010000, 4);
  head.writeUInt32BE(0, 8); // checkSumAdjustment filled later
  head.writeUInt32BE(0x5f0f3cf5, 12); // magic
  head.writeUInt16BE(0x000b, 16); // flags
  head.writeUInt16BE(UPM, 18);
  head.writeInt16BE(0, 36); // xMin
  head.writeInt16BE(-100, 38); // yMin
  head.writeInt16BE(ADVANCE, 40); // xMax
  head.writeInt16BE(850, 42); // yMax
  head.writeUInt16BE(8, 46); // lowestRecPPEM
  head.writeInt16BE(2, 48); // fontDirectionHint
  head.writeInt16BE(1, 50); // indexToLocFormat = long

  // hhea (metricDataFormat MUST be 0 per OpenType spec)
  const hhea = Buffer.alloc(36);
  hhea.writeUInt32BE(0x00010000, 0);
  hhea.writeInt16BE(820, 4); // ascent
  hhea.writeInt16BE(-180, 6); // descent
  hhea.writeInt16BE(0, 8); // lineGap
  hhea.writeUInt16BE(ADVANCE, 10);
  hhea.writeInt16BE(0, 32); // metricDataFormat = 0
  hhea.writeUInt16BE(numGlyphs, 34);

  // maxp (version 1.0: maxZones at offset 14 MUST be 2)
  const maxp = Buffer.alloc(32);
  maxp.writeUInt32BE(0x00010000, 0);
  maxp.writeUInt16BE(numGlyphs, 4);
  maxp.writeUInt16BE(120, 6); // maxPoints
  maxp.writeUInt16BE(30, 8); // maxContours
  maxp.writeUInt16BE(2, 14); // maxZones = 2

  // OS/2 (version 3)
  const os2 = Buffer.alloc(96);
  os2.writeUInt16BE(3, 0);
  os2.writeInt16BE(ADVANCE, 2);
  os2.writeUInt16BE(700, 4); // bold weight
  os2.writeUInt16BE(5, 6);
  os2.writeInt16BE(820, 68); // sTypoAscender
  os2.writeInt16BE(-180, 70); // sTypoDescender
  os2.writeUInt16BE(820, 74); // usWinAscent
  os2.writeUInt16BE(180, 76); // usWinDescent
  os2.writeUInt16BE(0x0020, 64); // firstCharIndex
  os2.writeUInt16BE(0x007e, 66); // lastCharIndex
  os2.writeUInt16BE(0x0040, 62); // fsSelection = REGULAR

  // post (format 3.0)
  const post = Buffer.alloc(32);
  post.writeUInt32BE(0x00030000, 0);

  // cmap (format 4 BMP)
  const segs = [];
  for (const code of charCodes) {
    const gid = codeToGid.get(code);
    segs.push({ start: code, end: code, delta: (gid - code) & 0xffff });
  }
  segs.push({ start: 0xffff, end: 0xffff, delta: 1 });

  const segCount = segs.length;
  const segCountX2 = segCount * 2;
  const searchRange = 2 * Math.pow(2, Math.floor(Math.log2(segCount)));
  const entrySelector = Math.floor(Math.log2(searchRange / 2));
  const rangeShift = segCountX2 - searchRange;

  const subtableLen = 16 + segCount * 8;
  const cmap = Buffer.alloc(12 + subtableLen);
  cmap.writeUInt16BE(0, 0); // version
  cmap.writeUInt16BE(1, 2); // numTables
  cmap.writeUInt16BE(3, 4); // platformID = Windows
  cmap.writeUInt16BE(1, 6); // encodingID = Unicode BMP
  cmap.writeUInt32BE(12, 8); // offset

  let p = 12;
  cmap.writeUInt16BE(4, p); p += 2;
  cmap.writeUInt16BE(subtableLen, p); p += 2;
  cmap.writeUInt16BE(0, p); p += 2;
  cmap.writeUInt16BE(segCountX2, p); p += 2;
  cmap.writeUInt16BE(searchRange, p); p += 2;
  cmap.writeUInt16BE(entrySelector, p); p += 2;
  cmap.writeUInt16BE(rangeShift, p); p += 2;

  for (const s of segs) { cmap.writeUInt16BE(s.end, p); p += 2; }
  cmap.writeUInt16BE(0, p); p += 2; // reservedPad
  for (const s of segs) { cmap.writeUInt16BE(s.start, p); p += 2; }
  for (const s of segs) { cmap.writeUInt16BE(s.delta, p); p += 2; }
  for (let i = 0; i < segCount; i++) { cmap.writeUInt16BE(0, p); p += 2; }

  // name table
  const fontName = 'ThePokerVoxel';
  const records = [
    [1, fontName],
    [2, 'Regular'],
    [4, fontName],
    [6, fontName],
  ];
  // UTF-16BE proper encoding:
  const strBufs = records.map(([, str]) => {
    const b = Buffer.alloc(str.length * 2);
    for (let i = 0; i < str.length; i++) b.writeUInt16BE(str.charCodeAt(i), i * 2);
    return b;
  });
  const storageOffset = 6 + records.length * 12;
  const nameHeader = Buffer.alloc(storageOffset);
  nameHeader.writeUInt16BE(0, 0);
  nameHeader.writeUInt16BE(records.length, 2);
  nameHeader.writeUInt16BE(storageOffset, 4);
  let strOff = 0;
  for (let i = 0; i < records.length; i++) {
    const [nameId] = records[i];
    const sb = strBufs[i];
    const base = 6 + i * 12;
    nameHeader.writeUInt16BE(3, base); // Windows
    nameHeader.writeUInt16BE(1, base + 2); // Unicode BMP
    nameHeader.writeUInt16BE(0x0409, base + 4); // en-US
    nameHeader.writeUInt16BE(nameId, base + 6);
    nameHeader.writeUInt16BE(sb.length, base + 8);
    nameHeader.writeUInt16BE(strOff, base + 10);
    strOff += sb.length;
  }
  const nameTable = Buffer.concat([nameHeader, ...strBufs]);

  // OpenType table directory MUST be sorted in strict ASCII byte order (NOT localeCompare!)
  const tables = [
    ['OS/2', os2],
    ['cmap', cmap],
    ['glyf', glyf],
    ['head', head],
    ['hhea', hhea],
    ['hmtx', hmtx],
    ['loca', loca],
    ['maxp', maxp],
    ['name', nameTable],
    ['post', post],
  ].sort((a, b) => (a[0] < b[0] ? -1 : a[0] > b[0] ? 1 : 0));

  const numTables = tables.length;
  const entrySel = Math.floor(Math.log2(numTables));
  const sr = Math.pow(2, entrySel) * 16;
  const rs = numTables * 16 - sr;

  const sfntHeader = Buffer.alloc(12);
  sfntHeader.writeUInt32BE(0x00010000, 0);
  sfntHeader.writeUInt16BE(numTables, 4);
  sfntHeader.writeUInt16BE(sr, 6);
  sfntHeader.writeUInt16BE(entrySel, 8);
  sfntHeader.writeUInt16BE(rs, 10);

  const dir = Buffer.alloc(numTables * 16);
  let curOffset = 12 + numTables * 16;
  const bodyChunks = [];
  let headOffset = 0;

  for (let i = 0; i < numTables; i++) {
    const [tag, buf] = tables[i];
    if (tag === 'head') headOffset = curOffset;
    const checksum = calcChecksum(buf);
    dir.write(tag, i * 16, 4, 'ascii');
    dir.writeUInt32BE(checksum, i * 16 + 4);
    dir.writeUInt32BE(curOffset, i * 16 + 8);
    dir.writeUInt32BE(buf.length, i * 16 + 12);

    const pad = (4 - (buf.length % 4)) % 4;
    const padded = pad ? Buffer.concat([buf, Buffer.alloc(pad)]) : buf;
    bodyChunks.push(padded);
    curOffset += padded.length;
  }

  const font = Buffer.concat([sfntHeader, dir, ...bodyChunks]);
  const fullChecksum = calcChecksum(font);
  const adjustment = (0xb1b0afba - fullChecksum) >>> 0;
  font.writeUInt32BE(adjustment, headOffset + 8);
  return font;
}

const outPath = path.resolve('frontend/public/fonts/ThePokerVoxel.ttf');
fs.mkdirSync(path.dirname(outPath), { recursive: true });
const ttf = buildTTF();
fs.writeFileSync(outPath, ttf);
console.log(`Generated custom Voxel font: ${outPath} (${ttf.length} bytes)`);
