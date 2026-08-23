import {escapeCsvCell, toCsvRow, toCsv} from '../lib/csv';

describe('escapeCsvCell', () => {
  it('passes ordinary text through untouched', () => {
    expect(escapeCsvCell('Border tension')).toBe('Border tension');
    expect(escapeCsvCell(42)).toBe('42');
  });

  it('renders null and undefined as empty cells', () => {
    expect(escapeCsvCell(null)).toBe('');
    expect(escapeCsvCell(undefined)).toBe('');
  });

  it('quotes separators so a value cannot invent a new column', () => {
    expect(escapeCsvCell('Cyber, Bio')).toBe('"Cyber, Bio"');
  });

  it('quotes newlines so a value cannot invent a new row', () => {
    expect(escapeCsvCell('line one\nline two')).toBe('"line one\nline two"');
  });

  it('doubles embedded quotes', () => {
    expect(escapeCsvCell('he said "go"')).toBe('"he said ""go"""');
  });

  describe('formula injection', () => {
    // A scenario beginning with any of these executes on open in Excel,
    // LibreOffice, and Google Sheets unless it is neutralised first.
    it.each(['=', '+', '-', '@'])('neutralises a leading "%s"', trigger => {
      const payload = trigger + 'cmd|calc';
      const escaped = escapeCsvCell(payload);

      expect(escaped.startsWith('"\t')).toBe(true);
      expect(escaped).toContain(payload);
    });

    it('neutralises a lead hidden behind spaces', () => {
      expect(escapeCsvCell('   =1+1')).toBe('"\t   =1+1"');
    });

    it('neutralises a leading tab and carriage return', () => {
      expect(escapeCsvCell('\t=1+1').startsWith('"\t')).toBe(true);
      expect(escapeCsvCell('\r=1+1').startsWith('"\t')).toBe(true);
    });

    it('leaves a trigger in the middle of a value alone', () => {
      expect(escapeCsvCell('R0 = 2.4')).toBe('R0 = 2.4');
    });
  });
});

describe('toCsvRow', () => {
  it('joins escaped cells with commas', () => {
    expect(toCsvRow(['a', 'b,c', 3])).toBe('a,"b,c",3');
  });
});

describe('toCsv', () => {
  it('emits a BOM and CRLF endings by default', () => {
    const csv = toCsv(['h1', 'h2'], [['a', 'b']]);
    expect(csv.charCodeAt(0)).toBe(0xfeff);
    expect(csv).toContain('\r\n');
  });

  it('omits the BOM on request', () => {
    const csv = toCsv(['h1'], [['a']], {bom: false});
    expect(csv).toBe('h1\r\na');
  });

  it('keeps every row addressable even with hostile content', () => {
    const csv = toCsv(['scenario'], [['=HYPERLINK("http://x")']], {bom: false});
    // Two lines: the header and exactly one data row.
    expect(csv.split('\r\n')).toHaveLength(2);
  });
});
