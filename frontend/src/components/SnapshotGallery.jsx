import { useState, useEffect } from "react";

import { API_BASE } from "../config"; const API = API_BASE;

const ImageIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="3" y="3" width="18" height="18" rx="2" ry="2"/>
    <circle cx="8.5" cy="8.5" r="1.5"/>
    <polyline points="21 15 16 10 5 21"/>
  </svg>
);

const DownloadIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
    <polyline points="7 10 12 15 17 10"/>
    <line x1="12" y1="15" x2="12" y2="3"/>
  </svg>
);

const CloseIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
  </svg>
);

function timeAgo(mtime) {
  const diff = Math.floor(Date.now() / 1000 - mtime);
  if (diff < 60)   return `${diff}s ago`;
  if (diff < 3600) return `${Math.floor(diff/60)}m ago`;
  return `${Math.floor(diff/3600)}h ago`;
}

function parseName(filename) {
  // fall_1_1748556123.jpg → { type: fall, id: 1 }
  const m = filename.match(/^(\w+)_(\d+)_/);
  return m ? { type: m[1], id: m[2] } : { type: "event", id: "?" };
}

export default function SnapshotGallery() {
  const [snaps, setSnaps]   = useState([]);
  const [selected, setSelected] = useState(null);

  useEffect(() => {
    fetch(`${API}/snapshots`).then(r => r.json()).then(setSnaps);
    const id = setInterval(() => fetch(`${API}/snapshots`).then(r => r.json()).then(setSnaps), 10000);
    return () => clearInterval(id);
  }, []);

  return (
    <div className="card">
      <div className="card-header">
        <span className="card-title"><ImageIcon /> Snapshot Gallery</span>
        <span className="count-badge">{snaps.length}</span>
      </div>

      {snaps.length === 0
        ? <p className="empty">No snapshots yet — fall events save a frame automatically</p>
        : (
          <div className="gallery-grid">
            {snaps.map(s => {
              const { type, id } = parseName(s.filename);
              return (
                <div key={s.filename} className="gallery-item" onClick={() => setSelected(s)}>
                  <img src={`${API}/snapshots/${s.filename}`} alt={s.filename} />
                  <div className="gallery-meta">
                    <span className={`tag ${type}`}>{type.toUpperCase()}</span>
                    <span className="muted small">#{id} · {timeAgo(s.mtime)}</span>
                  </div>
                </div>
              );
            })}
          </div>
        )
      }

      {/* Lightbox */}
      {selected && (
        <div className="lightbox" onClick={() => setSelected(null)}>
          <div className="lightbox-inner" onClick={e => e.stopPropagation()}>
            <img src={`${API}/snapshots/${selected.filename}`} alt={selected.filename} />
            <div style={{ padding: "10px 0", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <span className="muted small">{selected.filename}</span>
              <a href={`${API}/snapshots/${selected.filename}`} download className="ack-btn"><DownloadIcon /> Download</a>
            </div>
            <button className="ack-btn" onClick={() => setSelected(null)}><CloseIcon /> Close</button>
          </div>
        </div>
      )}
    </div>
  );
}
