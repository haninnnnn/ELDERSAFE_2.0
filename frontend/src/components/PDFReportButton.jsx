import { useState } from "react";

const API = "http://localhost:8000/api";

const ACT_COLOR = {
  fall: "#f85149", sleeping: "#d29922", inactivity: "#bc8cff",
  sitting: "#58a6ff", standing: "#3fb950", walking: "#56d364",
  anomalous: "#7d8590",
};

function fmt(secs) {
  const h = Math.floor(secs/3600), m = Math.floor((secs%3600)/60), s = Math.floor(secs%60);
  return [h,m,s].map(v=>String(v).padStart(2,"0")).join(":");
}

export default function PDFReportButton({ report, videoName }) {
  const [generating, setGenerating] = useState(false);

  async function generate() {
    if (!report) return;
    setGenerating(true);

    // Dynamically import jsPDF only when needed
    const { jsPDF } = await import("jspdf");
    const doc = new jsPDF({ unit: "mm", format: "a4" });
    const W = 210, margin = 16;
    let y = margin;

    const line = (text, size=10, color=[30,30,30], bold=false) => {
      doc.setFontSize(size);
      doc.setTextColor(...color);
      doc.setFont("helvetica", bold ? "bold" : "normal");
      doc.text(text, margin, y);
      y += size * 0.45 + 2;
    };
    const rule = (col=[220,220,220]) => {
      doc.setDrawColor(...col);
      doc.line(margin, y, W-margin, y);
      y += 4;
    };

    // Header
    doc.setFillColor(15, 17, 23);
    doc.rect(0, 0, W, 28, "F");
    doc.setFontSize(18); doc.setTextColor(255,255,255); doc.setFont("helvetica","bold");
    doc.text("🛡 ElderSafe — Video Analysis Report", margin, 12);
    doc.setFontSize(9); doc.setTextColor(180,180,180); doc.setFont("helvetica","normal");
    doc.text(`Generated: ${new Date().toLocaleString()}  |  File: ${videoName || "—"}`, margin, 20);
    y = 36;

    // Summary
    line("Summary", 13, [30,30,30], true); rule();
    const crit = report.events.filter(e=>e.severity==="critical").length;
    const warn = report.events.filter(e=>e.severity==="warning").length;
    line(`Duration: ${fmt(report.duration_s)}   Persons: ${report.persons}   Critical: ${crit}   Warnings: ${warn}`, 10);
    y += 4;

    // Per-person activity
    line("Activity Breakdown", 13, [30,30,30], true); rule();
    for (const [tid, acts] of Object.entries(report.activity_time)) {
      line(`Person #${tid}`, 11, [30,30,30], true);
      const total = Object.values(acts).reduce((a,b)=>a+b,0)||1;
      for (const [act, secs] of Object.entries(acts).sort((a,b)=>b[1]-a[1])) {
        const pct = (secs/total*100).toFixed(0);
        const barW = (secs/total) * (W - margin*2 - 50);
        const col = ACT_COLOR[act] || "#555";
        const rgb = [parseInt(col.slice(1,3),16), parseInt(col.slice(3,5),16), parseInt(col.slice(5,7),16)];
        doc.setFillColor(...rgb);
        doc.rect(margin+30, y-3.5, barW, 4, "F");
        doc.setFontSize(9); doc.setTextColor(80,80,80); doc.setFont("helvetica","normal");
        doc.text(`${act.padEnd(12)} ${fmt(secs)} (${pct}%)`, margin, y);
        y += 6;
      }
      y += 2;
      if (y > 260) { doc.addPage(); y = margin; }
    }

    // Events
    if (report.events.length > 0) {
      if (y > 220) { doc.addPage(); y = margin; }
      line("Events", 13, [30,30,30], true); rule();
      for (const ev of report.events) {
        const col = ev.severity === "critical" ? [220,50,50] : [200,130,0];
        line(`[${fmt(ev.start_s)} → ${fmt(ev.end_s)}]  Person #${ev.track_id}  ${ev.type.toUpperCase()}  (${(ev.end_s-ev.start_s).toFixed(1)}s)`, 9, col);
        if (y > 270) { doc.addPage(); y = margin; }
      }
    }

    doc.save(`eldersafe-report-${Date.now()}.pdf`);
    setGenerating(false);
  }

  return (
    <button className="btn btn-start" style={{ opacity: report ? 1 : 0.4 }}
            disabled={!report || generating} onClick={generate}>
      {generating ? "Generating…" : "⬇ Download PDF"}
    </button>
  );
}
