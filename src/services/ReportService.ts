// src/services/ReportService.ts
// Board-ready exports: a PDF audit log and a PPTX briefing deck.
//
// Both are generated in memory and handed to exportService, which routes them
// through the OS save dialog on desktop. The libraries' own save() helpers were
// used before; they trigger a browser download that bypasses the save dialog
// and cannot report where the file landed.

import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import PptxGenJS from 'pptxgenjs';
import {PredictionResult} from './predictionService';
import {exportService, ExportOutcome} from './exportService';

const SLATE_900: [number, number, number] = [15, 23, 42];
const SLATE_800 = '1e293b';
const SLATE_400 = '94a3b8';
const SLATE_50 = 'f8fafc';

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

/** jsPDF returns a data URI; the payload after the comma is what gets written. */
function dataUriToBase64(dataUri: string): string {
  const marker = 'base64,';
  const index = dataUri.indexOf(marker);
  return index === -1 ? '' : dataUri.slice(index + marker.length);
}

/**
 * Counts how often each risk domain appears across the assessments. Domains
 * come from the stored factors, which the engine derives from the council, so
 * this reflects the actual analysis rather than a substring search over prose.
 */
export function summariseDomains(history: PredictionResult[]): {
  labels: string[];
  values: number[];
} {
  const counts = new Map<string, number>();

  for (const item of history) {
    for (const factor of item.factors || []) {
      // Factor names look like "Cyber (exploit, grid)"; the domain is the head.
      const domain = factor.name.split(' (')[0].trim();
      if (domain) {
        counts.set(domain, (counts.get(domain) || 0) + 1);
      }
    }
  }

  const entries = Array.from(counts.entries()).sort((a, b) => b[1] - a[1]);
  return {
    labels: entries.map(entry => entry[0]),
    values: entries.map(entry => entry[1]),
  };
}

export const reportService = {
  /** Text-heavy PDF audit log of every assessment supplied. */
  async generatePDF(history: PredictionResult[]): Promise<ExportOutcome> {
    if (history.length === 0) {
      return {saved: false, path: null, error: 'There is nothing to export.'};
    }

    const doc = new jsPDF();

    doc.setFontSize(20);
    doc.text('PREDICTIQ Global Threat Assessment Log', 14, 22);

    doc.setFontSize(11);
    doc.setTextColor(100);
    doc.text('Generated: ' + new Date().toLocaleString(), 14, 30);
    doc.text('Total records: ' + history.length, 14, 36);

    autoTable(doc, {
      head: [
        ['Timestamp', 'DEFCON', 'Scenario', 'Consensus', 'Active threats'],
      ],
      body: history.map(item => [
        new Date(item.timestamp).toLocaleString(),
        'DEFCON ' + item.defconLevel,
        item.scenario,
        item.expertConsensus,
        (item.activeThreats || []).join(', '),
      ]),
      startY: 45,
      styles: {fontSize: 8, cellPadding: 3, overflow: 'linebreak'},
      headStyles: {fillColor: SLATE_900},
      columnStyles: {
        0: {cellWidth: 32},
        1: {cellWidth: 20},
        2: {cellWidth: 45},
        3: {cellWidth: 'auto'},
        4: {cellWidth: 35},
      },
    });

    return exportService.saveBinary(
      'PREDICTIQ_Audit_Log_' + timestampSuffix() + '.pdf',
      dataUriToBase64(doc.output('datauristring')),
      'application/pdf',
      'pdf',
    );
  },

  /** Visual PowerPoint briefing for stakeholders. */
  async generatePPTX(history: PredictionResult[]): Promise<ExportOutcome> {
    if (history.length === 0) {
      return {saved: false, path: null, error: 'There is nothing to export.'};
    }

    const pptx = new PptxGenJS();
    pptx.layout = 'LAYOUT_16x9';
    pptx.defineSlideMaster({
      title: 'MASTER_SLIDE',
      background: {color: '0f172a'},
      objects: [
        {rect: {x: 0, y: 0, w: '100%', h: 0.5, fill: {color: SLATE_800}}},
        {
          text: {
            text: 'PREDICTIQ INTELLIGENCE',
            options: {x: 0.5, y: 0.1, color: SLATE_400, fontSize: 10},
          },
        },
      ],
    });

    const title = pptx.addSlide({masterName: 'MASTER_SLIDE'});
    title.addText('Executive Risk Assessment', {
      x: 1.5,
      y: 2.5,
      w: 7,
      fontSize: 36,
      color: SLATE_50,
      align: 'center',
      bold: true,
    });
    title.addText(
      history.length +
        ' assessments • generated ' +
        new Date().toLocaleDateString(),
      {x: 1.5, y: 3.5, w: 7, fontSize: 14, color: SLATE_400, align: 'center'},
    );

    // Oldest first, so the trend reads left to right.
    const chronological = history.slice().reverse();
    const trend = pptx.addSlide({masterName: 'MASTER_SLIDE'});
    trend.addText('Global DEFCON Velocity', {
      x: 0.5,
      y: 0.7,
      fontSize: 18,
      color: SLATE_50,
      bold: true,
    });
    trend.addChart(
      pptx.ChartType.line,
      [
        {
          name: 'DEFCON level',
          labels: chronological.map(item =>
            new Date(item.timestamp).toLocaleDateString([], {
              month: 'short',
              day: 'numeric',
            }),
          ),
          values: chronological.map(item => item.defconLevel),
        },
      ],
      {
        x: 0.5,
        y: 1.2,
        w: 9,
        h: 4,
        chartColors: ['ef4444'],
        chartColorsOpacity: 80,
        showLegend: true,
        legendPos: 'b',
        // DEFCON 1 is the most severe, so the axis is inverted to keep "worse"
        // pointing upward for a reader who does not know the scale.
        valAxisMaxVal: 5,
        valAxisMinVal: 1,
      },
    );

    const domains = summariseDomains(history);
    const breakdown = pptx.addSlide({masterName: 'MASTER_SLIDE'});
    breakdown.addText('Threat Domain Distribution', {
      x: 0.5,
      y: 0.7,
      fontSize: 18,
      color: SLATE_50,
      bold: true,
    });

    if (domains.labels.length === 0) {
      breakdown.addText('No domain-level findings were recorded.', {
        x: 0.5,
        y: 2.5,
        w: 9,
        fontSize: 14,
        color: SLATE_400,
        align: 'center',
      });
    } else {
      breakdown.addChart(
        pptx.ChartType.bar,
        [
          {
            name: 'Findings by domain',
            labels: domains.labels,
            values: domains.values,
          },
        ],
        {
          x: 0.5,
          y: 1.2,
          w: 9,
          h: 4,
          chartColors: ['3b82f6'],
          showValue: true,
          dataLabelColor: SLATE_50,
        },
      );
    }

    const base64 = (await pptx.write({outputType: 'base64'})) as string;
    return exportService.saveBinary(
      'PREDICTIQ_Briefing_' + timestampSuffix() + '.pptx',
      base64,
      'application/vnd.openxmlformats-officedocument.presentationml.presentation',
      'pptx',
    );
  },
};
