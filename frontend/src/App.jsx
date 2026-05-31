import { useState } from "react";
import LiveFeed        from "./components/LiveFeed";
import PersonTable     from "./components/PersonTable";
import EventLog        from "./components/EventLog";
import PersonLabels    from "./components/PersonLabels";
import ActivityTimeline from "./components/ActivityTimeline";
import CameraSwitcher  from "./components/CameraSwitcher";
import SnapshotGallery from "./components/SnapshotGallery";
import ReportPage      from "./components/ReportPage";
import { useElderSafe } from "./hooks/useElderSafe";
import "./App.css";

const TABS = [
  { id: "live",      label: "📷 Live" },
  { id: "timeline",  label: "📈 Timeline" },
  { id: "persons",   label: "🏷 Persons" },
  { id: "snapshots", label: "🖼 Snapshots" },
  { id: "settings",  label: "⚙️ Settings" },
  { id: "report",    label: "📊 Report" },
];

export default function App() {
  const { imgSrc, persons, fps, events, connected, ackEvent, startStream, stopStream } = useElderSafe();
  const [tab, setTab] = useState("live");
  const unacked = events.filter(e => !e.acknowledged && e.event_type === "fall").length;

  return (
    <div className="app">
      <header>
        <div className="brand">
          <span className="brand-icon">🛡</span>
          <span className="brand-name">ElderSafe</span>
          <span className={`status-pill ${connected ? "online" : "offline"}`}>
            {connected ? "● Live" : "● Offline"}
          </span>
        </div>
        <nav className="tabs">
          {TABS.map(t => (
            <button key={t.id} className={`tab ${tab === t.id ? "active" : ""}`}
                    onClick={() => setTab(t.id)}>
              {t.label}
              {t.id === "live" && unacked > 0 &&
                <span className="tab-badge">{unacked}</span>}
            </button>
          ))}
        </nav>
        <div className="header-right">
          {tab === "live" && <>
            <button onClick={startStream} className="btn btn-start">▶ Start</button>
            <button onClick={stopStream}  className="btn btn-stop">■ Stop</button>
          </>}
        </div>
      </header>

      <div className="tab-content">
        {tab === "live" && (
          <main className="grid">
            <div className="col-left">
              <LiveFeed imgSrc={imgSrc} fps={fps} connected={connected} />
              <PersonTable persons={persons} />
            </div>
            <div className="col-right">
              <EventLog events={events} onAck={ackEvent} />
            </div>
          </main>
        )}
        {tab === "timeline"  && <div className="tab-inner"><ActivityTimeline /></div>}
        {tab === "persons"   && <div className="tab-inner"><PersonLabels /></div>}
        {tab === "snapshots" && <div className="tab-inner"><SnapshotGallery /></div>}
        {tab === "settings"  && <div className="tab-inner"><CameraSwitcher /></div>}
        {tab === "report"    && <div className="tab-inner"><ReportPage /></div>}
      </div>
    </div>
  );
}
