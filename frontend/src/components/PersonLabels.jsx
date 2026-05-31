import { useState, useEffect } from "react";

import { API_BASE } from "../config"; const API = API_BASE;

const TagIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z"/>
    <line x1="7" y1="7" x2="7.01" y2="7"/>
  </svg>
);

const EditIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
    <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
  </svg>
);

const SaveIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="20 6 9 17 4 12"/>
  </svg>
);

const CloseIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
  </svg>
);

export default function PersonLabels() {
  const [persons, setPersons] = useState([]);
  const [editing, setEditing] = useState(null); // track_id being edited
  const [draft, setDraft]     = useState("");

  useEffect(() => {
    fetch(`${API}/persons`).then(r => r.json()).then(setPersons);
  }, []);

  async function save(track_id) {
    await fetch(`${API}/persons/${track_id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ label: draft }),
    });
    setPersons(ps => ps.map(p => p.track_id === track_id ? { ...p, label: draft } : p));
    setEditing(null);
  }

  return (
    <div className="card">
      <div className="card-header">
        <span className="card-title"><TagIcon /> Person Labels</span>
        <span className="count-badge">{persons.length}</span>
      </div>
      {persons.length === 0 ? <p className="empty">No persons tracked yet</p> : (
        <table>
          <thead><tr><th>ID</th><th>Label</th><th>First Seen</th><th></th></tr></thead>
          <tbody>
            {persons.map(p => (
              <tr key={p.track_id}>
                <td><span className="track-id">#{p.track_id}</span></td>
                <td>
                  {editing === p.track_id ? (
                    <input className="label-input" value={draft} autoFocus
                      onChange={e => setDraft(e.target.value)}
                      onKeyDown={e => { if (e.key === "Enter") save(p.track_id); if (e.key === "Escape") setEditing(null); }}
                    />
                  ) : (
                    <span className="label-text">{p.label || <em className="muted">unnamed</em>}</span>
                  )}
                </td>
                <td className="muted small">{p.first_seen ? new Date(p.first_seen).toLocaleDateString() : "—"}</td>
                <td>
                  {editing === p.track_id
                    ? <><button className="ack-btn" onClick={() => save(p.track_id)}><SaveIcon /> Save</button>
                        <button className="ack-btn" style={{marginLeft:4}} onClick={() => setEditing(null)}><CloseIcon /></button></>
                    : <button className="ack-btn" onClick={() => { setEditing(p.track_id); setDraft(p.label || ""); }}><EditIcon /> Edit</button>
                  }
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
