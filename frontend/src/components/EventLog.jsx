const ICONS = { fall:"🚨", sleeping:"😴", inactivity:"💤", anomalous:"⚠️" };
const COLORS = { critical: "#C0392B", warning: "#D4813A", info: "#6B7C4A" };

function timeAgo(ts) {
  const diff = Math.floor((Date.now() - new Date(ts)) / 1000);
  if (diff < 60)   return `${diff}s ago`;
  if (diff < 3600) return `${Math.floor(diff/60)}m ago`;
  return new Date(ts).toLocaleTimeString();
}

export default function EventLog({ events, onAck }) {
  const unacked = events.filter(e => !e.acknowledged && e.event_type === "fall");
  const acked   = events.filter(e =>  e.acknowledged);

  return (
    <div className="card event-card">
      <div className="card-header">
        <span className="card-title">🔔 Alerts</span>
        {unacked.length > 0 && <span className="alert-badge">{unacked.length} new</span>}
      </div>

      {events.length === 0 && (
        <div className="empty">
          <div style={{fontSize:"2rem",marginBottom:8}}>✅</div>
          No alerts recorded
        </div>
      )}

      {unacked.length > 0 && (
        <div className="event-section">
          <p className="section-label">⚡ Active</p>
          {unacked.map(ev => <EventItem key={ev.id} ev={ev} onAck={onAck} />)}
        </div>
      )}

      {acked.length > 0 && (
        <div className="event-section">
          <p className="section-label">✓ Resolved</p>
          {acked.map(ev => <EventItem key={ev.id} ev={ev} onAck={onAck} />)}
        </div>
      )}
    </div>
  );
}

function EventItem({ ev, onAck }) {
  const color = COLORS[ev.severity] || "#64748b";
  return (
    <div className={`event-item ${ev.severity} ${ev.acknowledged ? "acked" : ""}`}>
      <div className="event-top">
        <span className="event-type" style={{color}}>
          {ICONS[ev.event_type] || "●"} {ev.event_type.toUpperCase()}
        </span>
        <span className="event-time">{timeAgo(ev.started_at)}</span>
      </div>
      <div className="event-meta">
        Person #{ev.track_id} &nbsp;·&nbsp;
        <span style={{color, textTransform:"uppercase", fontSize:10, fontWeight:700}}>{ev.severity}</span>
      </div>
      {!ev.acknowledged && (
        <button className="ack-btn" onClick={() => onAck(ev.id)}>✓ Acknowledge</button>
      )}
    </div>
  );
}
