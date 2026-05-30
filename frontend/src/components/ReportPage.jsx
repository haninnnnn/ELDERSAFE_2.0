import { useState, useRef } from "react";
import PDFReportButton from "./PDFReportButton";
import "./Report.css";

const API = "http://localhost:8000/api";

function fmt(secs) {
  const h = Math.floor(secs/3600), m = Math.floor((secs%3600)/60), s = Math.floor(secs%60);
  return [h,m,s].map(v=>String(v).padStart(2,"0")).join(":");
}

const ACT_COLOR = {
  fall:"#f85149", sleeping:"#d29922", inactivity:"#bc8cff",
  sitting:"#58a6ff", standing:"#3fb950", walking:"#3fb950", anomalous:"#7d8590",
};

export default function ReportPage() {
  const [file, setFile]         = useState(null);
  const [status, setStatus]     = useState("idle");
  const [progress, setProgress] = useState("");
  const [report, setReport]     = useState(null);
  const [jobId, setJobId]       = useState(null);
  const pollRef = useRef(null);

  // Resume polling if job is still in progress when component remounts
  function startPolling(job_id) {
    if (pollRef.current) clearInterval(pollRef.current);
    pollRef.current = setInterval(async () => {
      try {
        const r    = await fetch(`${API}/report/status/${job_id}`);
        const data = await r.json();
        setProgress(data.progress || "");
        if (data.status === "done") {
          clearInterval(pollRef.current);
          setReport(data.report);
          setStatus("done");
        } else if (data.status === "error") {
          clearInterval(pollRef.current);
          setStatus("error");
          setProgress(data.error || "Unknown error");
        }
      } catch (_) {}
    }, 1500);
  }

  async function handleRun() {
    if (!file) return;
    setStatus("uploading"); setReport(null); setJobId(null);
    const fd = new FormData();
    fd.append("file", file);
    const res = await fetch(`${API}/report/run`, { method: "POST", body: fd });
    if (!res.ok) { setStatus("error"); return; }
    const { job_id } = await res.json();
    setJobId(job_id);
    setStatus("processing");
    startPolling(job_id);
  }

  return (
    <div className="report-page">
      <h2>📊 Video Report</h2>
      <div className="upload-box">
        <input type="file" accept="video/*" onChange={e => setFile(e.target.files[0])} />
        <button className="btn btn-start" onClick={handleRun}
                disabled={!file || status === "processing" || status === "uploading"}>
          {status === "uploading" ? "Uploading…" : status === "processing" ? "Processing…" : "▶ Analyse"}
        </button>
        <PDFReportButton report={report} videoName={file?.name} />
      </div>

      {status === "processing" && (
        <div className="progress-bar-wrap">
          <div className="progress-bar" />
          <p className="muted">{progress || "Running YOLO inference…"}</p>
        </div>
      )}
      {status === "error" && <p className="error-msg">❌ {progress || "Something went wrong."}</p>}

      {/* Annotated video player */}
      {status === "done" && jobId && (
        <div className="card" style={{ marginBottom: 16 }}>
          <div className="card-header">
            <span className="card-title">🎬 Annotated Output</span>
            <a href={`${API}/report/video/${jobId}`} download className="ack-btn">⬇ Download</a>
          </div>
          <video controls style={{ width: "100%", borderRadius: 8, background: "#000" }}
                 src={`${API}/report/video/${jobId}`} />
        </div>
      )}

      {report && <ReportView report={report} />}
    </div>
  );
}

function ReportView({ report }) {
  const critEvents = report.events.filter(e => e.severity === "critical");
  const warnEvents = report.events.filter(e => e.severity === "warning");

  return (
    <div className="report-view">
      {/* Summary */}
      <div className="summary-row">
        <StatCard label="Duration"    value={fmt(report.duration_s)} />
        <StatCard label="Persons"     value={report.persons} />
        <StatCard label="🚨 Falls"    value={critEvents.length} accent="#f85149" />
        <StatCard label="⚠️ Warnings" value={warnEvents.length} accent="#d29922" />
      </div>

      {/* Per-person stats + activity bars */}
      {Object.entries(report.activity_time).map(([tid, acts]) => {
        const total  = Object.values(acts).reduce((a,b)=>a+b,0) || 1;
        const sorted = Object.entries(acts).sort((a,b)=>b[1]-a[1]);
        const st     = report.stats?.[tid] || {};
        return (
          <div key={tid} className="person-card">
            <h4>Person #{tid}</h4>

            {/* Key stats row */}
            <div className="person-stats-row">
              <div className="person-stat">
                <span className="ps-val">{st.dominant_activity || "—"}</span>
                <span className="ps-lbl">Dominant activity</span>
              </div>
              <div className="person-stat">
                <span className="ps-val">{st.mobility_pct ?? "—"}%</span>
                <span className="ps-lbl">Mobile (standing+walking)</span>
              </div>
              <div className="person-stat">
                <span className="ps-val" style={{ color: st.fall_count > 0 ? "#f85149" : "inherit" }}>
                  {st.fall_count ?? 0}
                </span>
                <span className="ps-lbl">Falls detected</span>
              </div>
              <div className="person-stat">
                <span className="ps-val">{st.fall_duration_s ?? 0}s</span>
                <span className="ps-lbl">Total fall duration</span>
              </div>
              <div className="person-stat">
                <span className="ps-val">{st.inactivity_count ?? 0}</span>
                <span className="ps-lbl">Inactivity episodes</span>
              </div>
            </div>

            {/* Activity bars */}
            {sorted.map(([act, secs]) => (
              <div key={act} className="act-row">
                <span className="act-label" style={{ color: ACT_COLOR[act] || "#aaa" }}>{act}</span>
                <div className="act-bar-bg">
                  <div className="act-bar" style={{
                    width: `${(secs/total*100).toFixed(1)}%`,
                    background: ACT_COLOR[act] || "#555"
                  }} />
                </div>
                <span className="act-time">{fmt(secs)} ({(secs/total*100).toFixed(0)}%)</span>
              </div>
            ))}
          </div>
        );
      })}

      {critEvents.length > 0 && <EventTable title="🚨 Fall Events" events={critEvents} color="#f85149" />}
      {warnEvents.length > 0 && <EventTable title="⚠️ Warning Events" events={warnEvents} color="#d29922" />}
      {critEvents.length === 0 && warnEvents.length === 0 && (
        <p className="all-clear">✅ No critical or warning events detected.</p>
      )}
    </div>
  );
}

function StatCard({ label, value, accent }) {
  return (
    <div className="stat-card">
      <div className="stat-value" style={accent ? { color: accent } : {}}>{value}</div>
      <div className="stat-label">{label}</div>
    </div>
  );
}

function EventTable({ title, events, color }) {
  return (
    <div className="event-table">
      <h4 style={{ color }}>{title}</h4>
      <table>
        <thead><tr><th>Person</th><th>Type</th><th>Start</th><th>End</th><th>Duration</th></tr></thead>
        <tbody>
          {events.map((ev, i) => (
            <tr key={i}>
              <td>#{ev.track_id}</td>
              <td><span className="tag" style={{ background: color+"33", color }}>{ev.type.toUpperCase()}</span></td>
              <td>{fmt(ev.start_s)}</td>
              <td>{fmt(ev.end_s)}</td>
              <td style={{ color: ev.end_s - ev.start_s > 5 ? "#f85149" : "inherit" }}>
                {(ev.end_s - ev.start_s).toFixed(1)}s
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
