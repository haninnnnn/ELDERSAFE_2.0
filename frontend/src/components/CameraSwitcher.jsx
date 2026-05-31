import { useState, useEffect } from "react";

import { API_BASE } from "../config"; const API = API_BASE;

const CameraIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/>
    <circle cx="12" cy="13" r="4"/>
  </svg>
);

const CheckIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="20 6 9 17 4 12"/>
  </svg>
);

const PRESETS = [
  { label: "Webcam (default)", value: "0" },
  { label: "Webcam 2", value: "1" },
];

export default function CameraSwitcher() {
  const [current, setCurrent] = useState("");
  const [input, setInput]     = useState("");
  const [saved, setSaved]     = useState(false);

  useEffect(() => {
    fetch(`${API}/stream/source`).then(r => r.json()).then(d => {
      setCurrent(d.source); setInput(d.source);
    });
  }, []);

  async function apply() {
    const res = await fetch(`${API}/stream/source`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ source: input }),
    });
    const d = await res.json();
    setCurrent(d.source);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }

  return (
    <div className="card">
      <div className="card-header">
        <span className="card-title"><CameraIcon /> Camera Source</span>
        {saved && <span style={{ color: "var(--olive)", fontSize: 12 }}><CheckIcon /> Saved — restart stream to apply</span>}
      </div>

      <p className="muted small" style={{ marginBottom: 10 }}>
        Current: <code style={{ color: "var(--blue)" }}>{current}</code>
      </p>

      <div style={{ display: "flex", gap: 8, marginBottom: 12, flexWrap: "wrap" }}>
        {PRESETS.map(p => (
          <button key={p.value} className="ack-btn"
                  style={input === p.value ? { borderColor: "var(--blue)", color: "var(--blue)" } : {}}
                  onClick={() => setInput(p.value)}>
            {p.label}
          </button>
        ))}
      </div>

      <div style={{ display: "flex", gap: 8 }}>
        <input className="label-input" style={{ flex: 1 }} value={input}
               placeholder="0  or  rtsp://...  or  http://..."
               onChange={e => setInput(e.target.value)} />
        <button className="btn btn-start" style={{ padding: "6px 14px" }} onClick={apply}>Apply</button>
      </div>
      <p className="muted small" style={{ marginTop: 8 }}>
        After applying, click ■ Stop then ▶ Start to reconnect with the new source.
      </p>
    </div>
  );
}
