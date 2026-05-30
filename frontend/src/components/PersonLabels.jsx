import { useState, useEffect } from "react";

const API = "http://localhost:8000/api";

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
        <span className="card-title">🏷 Person Labels</span>
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
                    ? <><button className="ack-btn" onClick={() => save(p.track_id)}>✓ Save</button>
                        <button className="ack-btn" style={{marginLeft:4}} onClick={() => setEditing(null)}>✕</button></>
                    : <button className="ack-btn" onClick={() => { setEditing(p.track_id); setDraft(p.label || ""); }}>✎ Edit</button>
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
