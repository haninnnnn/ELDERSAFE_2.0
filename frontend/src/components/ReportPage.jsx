import { useState, useRef } from "react";
import PDFReportButton from "./PDFReportButton";
import "./Report.css";

import { API_BASE } from "../config"; const API = API_BASE;

const AlertIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polygon points="7.86 2 16.14 2 22 7.86 22 16.14 16.14 22 7.86 22 2 16.14 2 7.86 7.86 2"/>
    <line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
  </svg>
);

const VideoIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="2" y="2" width="20" height="20" rx="2.18" ry="2.18"/>
    <line x1="7" y1="2" x2="7" y2="22"/><line x1="17" y1="2" x2="17" y2="22"/>
    <line x1="2" y1="12" x2="22" y2="12"/><line x1="2" y1="7" x2="22" y2="7"/>
    <line x1="2" y1="17" x2="22" y2="17"/>
  </svg>
);

const DownloadIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
    <polyline points="7 10 12 15 17 10"/>
    <line x1="12" y1="15" x2="12" y2="3"/>
  </svg>
);

const WarningIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="10"/>
    <line x1="12" y1="8" x2="12" y2="12"/>
    <line x1="12" y1="16" x2="12.01" y2="16"/>
  </svg>
);

const CheckCircleIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/>
    <polyline points="22 4 12 14.01 9 11.01"/>
  </svg>
);

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
      <h2><AlertIcon /> Video Report</h2>
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
      {status === "error" && <p className="error-msg"><WarningIcon /> {progress || "Something went wrong."}</p>}

      {/* Annotated video player */}
      {status === "done" && jobId && (
        <div className="card" style={{ marginBottom: 16 }}>
          <div className="card-header">
            <span className="card-title"><VideoIcon /> Annotated Output</span>
            <a href={`${API}/report/video/${jobId}`} download className="ack-btn"><DownloadIcon /> Download</a>
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
        <StatCard label="Falls"    value={critEvents.length} accent="#f85149" icon={<AlertIcon />} />
        <StatCard label="Warnings" value={warnEvents.length} accent="#d29922" icon={<WarningIcon />} />
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

      {critEvents.length > 0 && <EventTable title="Fall Events" events={critEvents} color="#f85149" icon={<AlertIcon />} />}
      {warnEvents.length > 0 && <EventTable title="Warning Events" events={warnEvents} color="#d29922" icon={<WarningIcon />} />}
      {critEvents.length === 0 && warnEvents.length === 0 && (
        <p className="all-clear"><CheckCircleIcon /> No critical or warning events detected.</p>
      )}
    </div>
  );
}

function StatCard({ label, value, accent, icon }) {
  return (
    <div className="stat-card">
      <div className="stat-icon" style={accent ? { color: accent } : {}}>{icon}</div>
      <div className="stat-value" style={accent ? { color: accent } : {}}>{value}</div>
      <div className="stat-label">{label}</div>
    </div>
  );
}

function EventTable({ title, events, color, icon }) {
  return (
    <div className="event-table">
      <h4 style={{ color }}>{icon} {title}</h4>
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
