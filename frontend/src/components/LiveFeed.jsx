export default function LiveFeed({ imgSrc, fps, connected }) {
  return (
    <div className="card feed-card">
      <div className="card-header">
        <span className="card-title">📷 Live Feed</span>
        <span className={`fps-badge ${connected ? "active" : ""}`}>
          {connected ? `${fps} FPS` : "No signal"}
        </span>
      </div>
      <div className="feed-wrapper">
        {imgSrc
          ? <img src={imgSrc} alt="live feed" className="feed-img" />
          : <div className="feed-overlay"><span>⚠ Camera disconnected</span></div>
        }
      </div>
    </div>
  );
}
