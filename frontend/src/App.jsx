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

const CameraIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/>
    <circle cx="12" cy="13" r="4"/>
  </svg>
);

const ChartIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <line x1="18" y1="20" x2="18" y2="10"/>
    <line x1="12" y1="20" x2="12" y2="4"/>
    <line x1="6" y1="20" x2="6" y2="14"/>
  </svg>
);

const TagIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z"/>
    <line x1="7" y1="7" x2="7.01" y2="7"/>
  </svg>
);

const ImageIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="3" y="3" width="18" height="18" rx="2" ry="2"/>
    <circle cx="8.5" cy="8.5" r="1.5"/>
    <polyline points="21 15 16 10 5 21"/>
  </svg>
);

const SettingsIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="3"/>
    <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"/>
  </svg>
);

const ReportIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
    <polyline points="14 2 14 8 20 8"/>
    <line x1="16" y1="13" x2="8" y2="13"/>
    <line x1="16" y1="17" x2="8" y2="17"/>
    <polyline points="10 9 9 9 8 9"/>
  </svg>
);

const ShieldIcon = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
  </svg>
);

const TABS = [
  { id: "live",      label: "Live",      Icon: CameraIcon },
  { id: "timeline",  label: "Timeline",  Icon: ChartIcon },
  { id: "persons",   label: "Persons",   Icon: TagIcon },
  { id: "snapshots", label: "Snapshots", Icon: ImageIcon },
  { id: "settings",  label: "Settings",  Icon: SettingsIcon },
  { id: "report",    label: "Report",    Icon: ReportIcon },
];

export default function App() {
  const { imgSrc, persons, fps, events, connected, ackEvent, startStream, stopStream } = useElderSafe();
  const [tab, setTab] = useState("live");
  const unacked = events.filter(e => !e.acknowledged && e.event_type === "fall").length;

  return (
    <div className="app">
      <header>
        <div className="brand">
          <span className="brand-icon"><ShieldIcon /></span>
          <span className="brand-name">ElderSafe</span>
          <span className={`status-pill ${connected ? "online" : "offline"}`}>
            <span className="status-dot" />
            {connected ? "Live" : "Offline"}
          </span>
        </div>
        <nav className="tabs">
          {TABS.map(t => (
            <button key={t.id} className={`tab ${tab === t.id ? "active" : ""}`}
                    onClick={() => setTab(t.id)}>
              <t.Icon /> {t.label}
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
