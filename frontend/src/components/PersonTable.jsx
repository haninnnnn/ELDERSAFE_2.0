const ICONS = { fall:"🚨", sleeping:"😴", inactivity:"💤", sitting:"🪑", standing:"🧍", walking:"🚶", anomalous:"❓", unknown:"❓" };

export default function PersonTable({ persons }) {
  return (
    <div className="card">
      <div className="card-header">
        <span className="card-title">👥 Active Persons</span>
        <span className="count-badge">{persons.length}</span>
      </div>
      {persons.length === 0
        ? <p className="empty">No persons detected</p>
        : (
          <table>
            <thead><tr><th>ID</th><th>Activity</th><th>Confidence</th></tr></thead>
            <tbody>
              {persons.map(p => (
                <tr key={p.track_id}>
                  <td><span className="track-id">#{p.track_id}</span></td>
                  <td>
                    <span className={`tag ${p.activity}`}>
                      {ICONS[p.activity] || "●"} {p.activity}
                    </span>
                  </td>
                  <td>
                    <div className="conf-bar-wrap">
                      <div className="conf-bar" style={{width: `${((p.confidence||0)*100).toFixed(0)}%`}} />
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
