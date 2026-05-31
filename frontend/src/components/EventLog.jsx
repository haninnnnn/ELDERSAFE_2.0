const AlertIcon = ({ type }) => {
  const icons = {
    fall: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polygon points="7.86 2 16.14 2 22 7.86 22 16.14 16.14 22 7.86 22 2 16.14 2 7.86 7.86 2"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>,
    sleeping: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg>,
    inactivity: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>,
    anomalous: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>,
  };
  return icons[type] || null;
};

const ActivityIcon = ({ activity }) => {
  const icons = {
    sitting: <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>,
    standing: <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="2" x2="12" y2="22"/><path d="M17 6H9"/><path d="M17 18H9"/><circle cx="12" cy="5" r="2"/><path d="M9 12h6"/></svg>,
    walking: <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="16 3 13 6 11 8 8 11 5 14"/><polyline points="8 21 5 21 8 18"/><polyline points="19 21 22 21 19 18"/><line x1="12" y1="8" x2="12" y2="21"/></svg>,
  };
  return icons[activity] || null;
};

const CheckIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="20 6 9 17 4 12"/>
  </svg>
);

const BellIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/>
    <path d="M13.73 21a2 2 0 0 1-3.46 0"/>
  </svg>
);

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
        <span className="card-title"><BellIcon /> Alerts</span>
        {unacked.length > 0 && <span className="alert-badge">{unacked.length} new</span>}
      </div>

      {events.length === 0 && (
        <div className="empty">
          <div className="empty-icon"><CheckIcon /></div>
          No alerts recorded
        </div>
      )}

      {unacked.length > 0 && (
        <div className="event-section">
          <p className="section-label">Active</p>
          {unacked.map(ev => <EventItem key={ev.id} ev={ev} onAck={onAck} />)}
        </div>
      )}

      {acked.length > 0 && (
        <div className="event-section">
          <p className="section-label">Resolved</p>
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
          <AlertIcon type={ev.event_type} />
          {ev.event_type.toUpperCase()}
        </span>
        <span className="event-time">{timeAgo(ev.started_at)}</span>
      </div>
      <div className="event-meta">
        Person #{ev.track_id} &nbsp;·&nbsp;
        <span style={{color, textTransform:"uppercase", fontSize:10, fontWeight:700}}>{ev.severity}</span>
      </div>
      {!ev.acknowledged && (
        <button className="ack-btn" onClick={() => onAck(ev.id)}>Acknowledge</button>
      )}
    </div>
  );
}
