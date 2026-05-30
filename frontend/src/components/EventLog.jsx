const ICONS = { fall:"🚨", sleeping:"😴", inactivity:"💤", anomalous:"❓" };

function timeAgo(ts) {
  const diff = Math.floor((Date.now() - new Date(ts)) / 1000);
  if (diff < 60)  return `${diff}s ago`;
  if (diff < 3600) return `${Math.floor(diff/60)}m ago`;
  return new Date(ts).toLocaleTimeString();
}

export default function EventLog({ events, onAck }) {
  const unacked = events.filter(e => !e.acknowledged);
  const acked   = events.filter(e => e.acknowledged);

  return (
    <div className="card event-card">
      <div className="card-header">
        <span className="card-title">🔔 Event Log</span>
        {unacked.length > 0 && <span className="alert-badge">{unacked.length} new</span>}
      </div>

      {events.length === 0 && <p className="empty">No events recorded</p>}

      {unacked.length > 0 && (
        <div className="event-section">
          <p className="section-label">Unacknowledged</p>
          {unacked.map(ev => <EventItem key={ev.id} ev={ev} onAck={onAck} />)}
        </div>
      )}

      {acked.length > 0 && (
        <div className="event-section">
          <p className="section-label">Acknowledged</p>
          {acked.map(ev => <EventItem key={ev.id} ev={ev} onAck={onAck} />)}
        </div>
      )}
    </div>
  );
}

function EventItem({ ev, onAck }) {
  return (
    <div className={`event-item ${ev.severity} ${ev.acknowledged ? "acked" : ""}`}>
      <div className="event-top">
        <span className="event-type">{ICONS[ev.event_type] || "●"} {ev.event_type.toUpperCase()}</span>
        <span className="event-time">{timeAgo(ev.started_at)}</span>
      </div>
      <div className="event-meta">Person #{ev.track_id} · {ev.severity}</div>
      {!ev.acknowledged && (
        <button className="ack-btn" onClick={() => onAck(ev.id)}>✓ Acknowledge</button>
      )}
    </div>
  );
}
