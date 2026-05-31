const UserIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
    <circle cx="12" cy="7" r="4"/>
  </svg>
);

const ActivityIcon = ({ activity }) => {
  const icons = {
    fall: <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polygon points="7.86 2 16.14 2 22 7.86 22 16.14 16.14 22 7.86 22 2 16.14 2 7.86 7.86 2"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>,
    sleeping: <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg>,
    inactivity: <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>,
    sitting: <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>,
    standing: <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="2" x2="12" y2="22"/><path d="M17 6H9"/><path d="M17 18H9"/><circle cx="12" cy="5" r="2"/></svg>,
    walking: <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="16 3 13 6 11 8 8 11 5 14"/><polyline points="8 21 5 21 8 18"/><polyline points="19 21 22 21 19 18"/><line x1="12" y1="8" x2="12" y2="21"/></svg>,
  };
  return icons[activity] || null;
};

export default function PersonTable({ persons }) {
  return (
    <div className="card">
      <div className="card-header">
        <span className="card-title"><UserIcon /> Detected Persons</span>
        <span className="count-badge">{persons.length} active</span>
      </div>
      {persons.length === 0
        ? <div className="empty"><div className="empty-icon"><UserIcon /></div>No persons in frame</div>
        : (
          <table>
            <thead>
              <tr><th>ID</th><th>Activity</th><th>Confidence</th></tr>
            </thead>
            <tbody>
              {persons.map(p => (
                <tr key={p.track_id}>
                  <td><span className="track-id">#{p.track_id}</span></td>
                  <td>
                    <span className={`tag ${p.activity}`}>
                      <ActivityIcon activity={p.activity} /> {p.activity}
                    </span>
                  </td>
                  <td>
                    <div className="conf-bar-wrap">
                      <div className="conf-bar" style={{width:`${((p.confidence||0)*80).toFixed(0)}px`}} />
                      <span>{p.confidence ? `${(p.confidence*100).toFixed(0)}%` : "—"}</span>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )
      }
    </div>
  );
}
