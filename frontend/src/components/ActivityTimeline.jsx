import { useState, useEffect } from "react";

const API = "http://localhost:8000/api";

const ACT_COLOR = {
  fall: "#f85149", sleeping: "#d29922", inactivity: "#bc8cff",
  sitting: "#58a6ff", standing: "#3fb950", walking: "#56d364",
  anomalous: "#7d8590", unknown: "#484f58",
};

function fmt(ts) {
  return new Date(ts).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" });
}

export default function ActivityTimeline() {
  const [logs, setLogs]       = useState([]);
  const [persons, setPersons] = useState([]);
  const [selId, setSelId]     = useState("all");

  useEffect(() => {
    async function load() {
      const [l, p] = await Promise.all([
        fetch(`${API}/activity-logs?limit=200`).then(r => r.json()),
        fetch(`${API}/persons`).then(r => r.json()),
      ]);
      setLogs(l);
      setPersons(p);
    }
    load();
    const id = setInterval(load, 5000);
    return () => clearInterval(id);
  }, []);

  const filtered = selId === "all" ? logs : logs.filter(l => l.track_id === Number(selId));

  // Group consecutive same-activity entries into segments
  const segments = [];
  for (const log of [...filtered].reverse()) {
    const last = segments[segments.length - 1];
    if (last && last.track_id === log.track_id && last.activity === log.activity) {
      last.end = log.frame_ts;
      last.count++;
    } else {
      segments.push({ track_id: log.track_id, activity: log.activity,
                      start: log.frame_ts, end: log.frame_ts, count: 1 });
    }
  }

  const labelFor = tid => {
    const p = persons.find(p => p.track_id === tid);
    return p?.label ? `${p.label} (#${tid})` : `#${tid}`;
  };

  // Group segments by track_id for swimlane view
  const lanes = {};
  for (const seg of segments) {
    if (!lanes[seg.track_id]) lanes[seg.track_id] = [];
    lanes[seg.track_id].push(seg);
  }

  return (
    <div className="card timeline-card">
      <div className="card-header">
        <span className="card-title">📈 Activity Timeline</span>
        <select className="sel" value={selId} onChange={e => setSelId(e.target.value)}>
          <option value="all">All persons</option>
          {persons.map(p => <option key={p.track_id} value={p.track_id}>{labelFor(p.track_id)}</option>)}
        </select>
      </div>

      {/* Legend */}
      <div className="legend">
        {Object.entries(ACT_COLOR).map(([act, col]) => (
          <span key={act} className="legend-item">
            <span className="legend-dot" style={{ background: col }} />{act}
          </span>
        ))}
      </div>

      {/* Swimlanes */}
      {Object.keys(lanes).length === 0
        ? <p className="empty">No activity data yet</p>
        : Object.entries(lanes).map(([tid, segs]) => (
          <div key={tid} className="lane">
            <div className="lane-label">{labelFor(Number(tid))}</div>
            <div className="lane-track">
              {segs.slice(-60).map((seg, i) => (
                <div key={i} className="lane-seg" title={`${seg.activity} @ ${fmt(seg.start)}`}
                     style={{ background: ACT_COLOR[seg.activity] || "#555",
                              flex: Math.max(seg.count, 1) }} />
              ))}
            </div>
          </div>
        ))
      }

      {/* Recent log table */}
      <div className="log-table-wrap">
        <table>
          <thead><tr><th>Person</th><th>Activity</th><th>Time</th></tr></thead>
          <tbody>
            {filtered.slice(0, 30).map(l => (
              <tr key={l.id}>
                <td><span className="track-id">#{l.track_id}</span></td>
                <td><span className="tag" style={{ background: (ACT_COLOR[l.activity]||"#555")+"33",
                           color: ACT_COLOR[l.activity]||"#aaa" }}>{l.activity}</span></td>
                <td className="muted small">{l.frame_ts ? fmt(l.frame_ts) : "—"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
