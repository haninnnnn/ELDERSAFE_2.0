export default function LiveFeed({ imgRef, fps, connected }) {
  return (
    <div className="card feed-card">
      <div className="card-header">
        <span className="card-title">📷 Live Feed</span>
        <span className={`fps-badge ${connected ? "active" : ""}`}>
          {connected ? `${fps} FPS` : "No signal"}
        </span>
      </div>
      <div className="feed-wrapper">
        <img ref={imgRef} alt="live feed" className="feed-img" />
        {!connected && (
          <div className="feed-overlay">
            <span>⚠ Camera disconnected</span>
          </div>
        )}
      </div>
    </div>
  );
}
