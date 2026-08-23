// src/services/exportService.ts
// One path for getting data out of the app.
//
// On the desktop this goes through the main process, which shows the OS save
// dialog and writes the file the user picked — the renderer never touches the
// filesystem. In a browser it falls back to an object-URL download.

import {getBridge} from './bridge';
import {toCsv} from '../lib/csv';
import {PredictionResult} from './predictionService';

export interface ExportOutcome {
  saved: boolean;
  path: string | null;
  error: string | null;
}

const CANCELLED: ExportOutcome = {saved: false, path: null, error: null};

function timestampSuffix(): string {
  const now = new Date();
  const pad = (value: number) => String(value).padStart(2, '0');
  return (
    String(now.getFullYear()) +
    pad(now.getMonth() + 1) +
    pad(now.getDate()) +
    '-' +
    pad(now.getHours()) +
    pad(now.getMinutes())
  );
}

/** Browser fallback: hand the file to the download machinery. */
function downloadInBrowser(
  fileName: string,
  contents: string,
  mimeType: string,
  base64: boolean,
): ExportOutcome {
  if (typeof document === 'undefined' || typeof URL === 'undefined') {
    return {
      saved: false,
      path: null,
      error: 'Exporting is not supported in this environment.',
    };
  }

  let blob: Blob;
  if (base64) {
    const binary = atob(contents);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) {
      bytes[i] = binary.charCodeAt(i);
    }
    blob = new Blob([bytes], {type: mimeType});
  } else {
    blob = new Blob([contents], {type: mimeType});
  }

  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = fileName;
  document.body.appendChild(anchor);
  anchor.click();
  document.body.removeChild(anchor);
  URL.revokeObjectURL(url);

  return {saved: true, path: fileName, error: null};
}

async function save(
  fileName: string,
  contents: string,
  options: {mimeType: string; extension: string; base64?: boolean},
): Promise<ExportOutcome> {
  const bridge = getBridge();
  const base64 = options.base64 === true;

  if (!bridge) {
    return downloadInBrowser(fileName, contents, options.mimeType, base64);
  }

  try {
    const result = await bridge.files.save({
      defaultName: fileName,
      contents,
      encoding: base64 ? 'base64' : 'utf8',
      filters: [
        {
          name: options.extension.toUpperCase(),
          extensions: [options.extension],
        },
      ],
    });
    return result.saved
      ? {saved: true, path: result.path, error: null}
      : CANCELLED;
  } catch (error) {
    return {
      saved: false,
      path: null,
      error:
        error instanceof Error ? error.message : 'The file could not be saved.',
    };
  }
}

export const exportService = {
  saveText: (
    fileName: string,
    contents: string,
    mimeType: string,
    extension: string,
  ) => save(fileName, contents, {mimeType, extension}),

  saveBinary: (
    fileName: string,
    base64Contents: string,
    mimeType: string,
    extension: string,
  ) => save(fileName, base64Contents, {mimeType, extension, base64: true}),

  async exportHistoryJson(history: PredictionResult[]): Promise<ExportOutcome> {
    return save(
      'PREDICTIQ_History_' + timestampSuffix() + '.json',
      JSON.stringify(history, null, 2),
      {mimeType: 'application/json', extension: 'json'},
    );
  },

  /**
   * CSV export. Every cell goes through the escaper in lib/csv.ts, which quotes
   * separators and neutralises formula leads — a scenario beginning with "="
   * would otherwise execute when the export is opened in a spreadsheet.
   */
  async exportHistoryCsv(history: PredictionResult[]): Promise<ExportOutcome> {
    const headers = [
      'ID',
      'Timestamp',
      'Scenario',
      'Probability',
      'Confidence',
      'DEFCON',
      'Consensus',
      'Active Threats',
      'Factors',
    ];

    const rows = history.map(item => [
      item.id,
      new Date(item.timestamp).toISOString(),
      item.scenario,
      item.probability,
      item.confidence,
      item.defconLevel,
      item.expertConsensus,
      (item.activeThreats || []).join('; '),
      (item.factors || [])
        .map(factor => factor.name + '=' + factor.weight)
        .join('; '),
    ]);

    return save(
      'PREDICTIQ_History_' + timestampSuffix() + '.csv',
      toCsv(headers, rows),
      {
        mimeType: 'text/csv',
        extension: 'csv',
      },
    );
  },
};
