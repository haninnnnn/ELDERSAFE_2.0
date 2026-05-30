import { useState, useEffect } from "react";

const API = "http://localhost:8000/api";
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
        <span className="card-title">📷 Camera Source</span>
        {saved && <span style={{ color: "var(--green)", fontSize: 12 }}>✓ Saved — restart stream to apply</span>}
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
