// src/lib/csv.ts
// CSV serialisation that is safe to hand to a spreadsheet.

/**
 * Characters that make Excel, LibreOffice, and Google Sheets treat a cell as a
 * formula. A record whose scenario text begins with one of these would execute
 * on open, which turns an exported audit log into a delivery mechanism.
 */
const FORMULA_TRIGGERS = ['=', '+', '-', '@'];

/**
 * Neutralises a single cell.
 *
 * Two separate problems are handled here. Formula injection is defused by
 * prefixing a tab, which spreadsheets treat as text while leaving the value
 * legible. CSV structure is preserved by quoting and doubling embedded quotes,
 * so a comma or newline inside a field cannot invent new columns or rows.
 */
export function escapeCsvCell(value: unknown): string {
  if (value === null || value === undefined) {
    return '';
  }

  let text = String(value);

  // Some importers trim leading spaces before deciding whether a cell is a
  // formula, so test past them. The prefix is applied to the original text so
  // no characters are lost from the exported value.
  const probe = text.replace(/^ +/, '');
  const first = probe.charAt(0);
  const isFormulaLead =
    FORMULA_TRIGGERS.indexOf(first) !== -1 ||
    first === '\t' ||
    first === '\r' ||
    first === '\n';

  if (isFormulaLead) {
    text = '\t' + text;
  }
  if (/[",\r\n\t]/.test(text)) {
    text = '"' + text.replace(/"/g, '""') + '"';
  }

  return text;
}

export function toCsvRow(cells: unknown[]): string {
  return cells.map(escapeCsvCell).join(',');
}

/**
 * Builds a complete CSV document. CRLF line endings keep Excel on Windows
 * happy, and a UTF-8 BOM makes it read non-ASCII scenario text correctly.
 */
export function toCsv(
  headers: string[],
  rows: unknown[][],
  options: {bom?: boolean} = {},
): string {
  const lines = [toCsvRow(headers)];
  for (const row of rows) {
    lines.push(toCsvRow(row));
  }
  const body = lines.join('\r\n');
  return options.bom === false ? body : '﻿' + body;
}
