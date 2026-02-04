// src/services/ReportService.ts
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import PptxGenJS from 'pptxgenjs';
import {PredictionResult} from './predictionService';

export const reportService = {
  /**
   * Generates a text-heavy PDF Audit Log
   */
  generatePDF: (history: PredictionResult[]) => {
    const doc = new jsPDF();

    // Title
    doc.setFontSize(20);
    doc.text('PREDICTIQ Global Threat Assessment Log', 14, 22);

    // Metadata
    doc.setFontSize(11);
    doc.setTextColor(100);
    doc.text(`Generated: ${new Date().toLocaleString()}`, 14, 30);
    doc.text(`Total Records: ${history.length}`, 14, 36);

    // Prepare table data
    const tableData = history.map(item => [
      new Date(item.timestamp).toLocaleString(),
      `DEFCON ${item.defconLevel}`,
      item.expertConsensus,
      (item.activeThreats || []).join(', '),
    ]);

    // Table
    autoTable(doc, {
      head: [['Timestamp', 'Severity', 'Consensus Analysis', 'Active Threats']],
      body: tableData,
      startY: 45,
      styles: {fontSize: 8, cellPadding: 3},
      headStyles: {fillColor: [30, 41, 59]}, // Corresponds to our dark theme
      columnStyles: {
        0: {cellWidth: 35}, // Timestamp
        1: {cellWidth: 20}, // Severity
        2: {cellWidth: 'auto'}, // Consensus
        3: {cellWidth: 40}, // Threats
      },
    });

    doc.save(`PREDICTIQ_Audit_Log_${Date.now()}.pdf`);
  },

  /**
   * Generates a visual PowerPoint presentation for stakeholders
   */
  generatePPTX: (history: PredictionResult[]) => {
    const pptx = new PptxGenJS();

    // --- Layout & Branding ---
    pptx.layout = 'LAYOUT_16x9';
    pptx.defineSlideMaster({
      title: 'MASTER_SLIDE',
      background: {color: '0f172a'}, // Dark Slate background
      objects: [
        {rect: {x: 0, y: 0, w: '100%', h: 0.5, fill: {color: '1e293b'}}}, // Header Bar
        {
          text: {
            text: 'PREDICTIQ INTELLIGENCE',
            options: {x: 0.5, y: 0.1, color: '94a3b8', fontSize: 10},
          },
        },
      ],
    });

    // --- Slide 1: Title Slide ---
    const slide1 = pptx.addSlide({masterName: 'MASTER_SLIDE'});
    slide1.addText('Executive Risk Assessment', {
      x: 1.5,
      y: 2.5,
      w: 7,
      fontSize: 36,
      color: 'f8fafc',
      align: 'center',
      bold: true,
    });
    slide1.addText(`Generated: ${new Date().toLocaleDateString()}`, {
      x: 1.5,
      y: 3.5,
      w: 7,
      fontSize: 14,
      color: '94a3b8',
      align: 'center',
    });

    // --- Slide 2: Severity Trend Chart ---
    // Prepare data
    const reversedHistory = [...history].reverse(); // Oldest to newest
    const labels = reversedHistory.map(h =>
      new Date(h.timestamp).toLocaleTimeString([], {
        hour: '2-digit',
        minute: '2-digit',
      }),
    );
    const dataPoints = reversedHistory.map(h => h.defconLevel); // 1-5

    // Invert DEFCON for visualization (Level 1 is HIGHER visual risk than 5, but charts usually go up)
    // Let's plot pure DEFCON but maybe annotate? Actually sticking to the value is safest.

    const slide2 = pptx.addSlide({masterName: 'MASTER_SLIDE'});
    slide2.addText('Global Defcon Velocity', {
      x: 0.5,
      y: 0.7,
      fontSize: 18,
      color: 'f8fafc',
      bold: true,
    });

    slide2.addChart(
      pptx.ChartType.line,
      [
        {
          name: 'DEFCON Level',
          labels: labels,
          values: dataPoints,
        },
      ],
      {
        x: 0.5,
        y: 1.2,
        w: 9,
        h: 4,
        chartColors: ['ef4444'], // Red
        chartColorsOpacity: 80,
        showLegend: true,
        legendPos: 'b',
      },
    );

    // --- Slide 3: Threat Breakdown (Bar Chart) ---
    // Calculate simple stats
    const domains: Record<string, number> = {
      Cyber: 0,
      Bio: 0,
      Geo: 0,
      Orbital: 0,
    };
    history.forEach(h => {
      const text = (
        h.expertConsensus + (h.activeThreats || []).join(' ')
      ).toLowerCase();
      if (text.includes('cyber')) {
        domains.Cyber++;
      }
      if (text.includes('bio')) {
        domains.Bio++;
      }
      if (text.includes('border') || text.includes('geo')) {
        domains.Geo++;
      }
      if (text.includes('orbit')) {
        domains.Orbital++;
      }
    });

    const slide3 = pptx.addSlide({masterName: 'MASTER_SLIDE'});
    slide3.addText('Threat Domain Distribution', {
      x: 0.5,
      y: 0.7,
      fontSize: 18,
      color: 'f8fafc',
      bold: true,
    });

    slide3.addChart(
      pptx.ChartType.bar,
      [
        {
          name: 'Alerts by Domain',
          labels: Object.keys(domains),
          values: Object.values(domains),
        },
      ],
      {
        x: 0.5,
        y: 1.2,
        w: 9,
        h: 4,
        chartColors: ['3b82f6'], // Blue
        showValue: true,
        valueColor: 'f8fafc',
      },
    );

    // Save
    pptx.writeFile({fileName: `PREDICTIQ_Briefing_${Date.now()}.pptx`});
  },
};
