import { useEffect, useRef, useState, useCallback } from "react";

const API = "http://localhost:8000/api";

export function useElderSafe() {
  const imgRef    = useRef(null);
  const wsRef     = useRef(null);
  const [persons, setPersons]     = useState([]);
  const [fps, setFps]             = useState(0);
  const [events, setEvents]       = useState([]);
  const [connected, setConnected] = useState(false);

  function connect() {
    if (wsRef.current) wsRef.current.close();
    const ws = new WebSocket(`ws://localhost:8000/ws/feed`);
    wsRef.current = ws;
    ws.onopen  = () => setConnected(true);
    ws.onclose = () => { setConnected(false); setFps(0); };
    ws.onmessage = ({ data }) => {
      const msg = JSON.parse(data);
      if (imgRef.current && msg.frame)
        imgRef.current.src = `data:image/jpeg;base64,${msg.frame}`;
      setPersons(msg.persons || []);
      setFps(msg.fps || 0);
    };
  }

  function disconnect() {
    if (wsRef.current) { wsRef.current.close(); wsRef.current = null; }
    setConnected(false); setPersons([]); setFps(0);
    if (imgRef.current) imgRef.current.src = "";
  }

  // Auto-connect on mount
  useEffect(() => { connect(); return disconnect; }, []);

  const fetchEvents = useCallback(async () => {
    const res = await fetch(`${API}/events?limit=20`);
    setEvents(await res.json());
  }, []);

  useEffect(() => {
    fetchEvents();
    const id = setInterval(fetchEvents, 5000);
    return () => clearInterval(id);
  }, [fetchEvents]);

  const ackEvent = useCallback(async (id) => {
    await fetch(`${API}/events/${id}/acknowledge`, { method: "PATCH" });
    fetchEvents();
  }, [fetchEvents]);

  const startStream = async () => {
    await fetch(`${API}/stream/start`, { method: "POST" });
    connect();  // reconnect WebSocket so backend opens fresh camera
  };

  const stopStream = async () => {
    await fetch(`${API}/stream/stop`, { method: "POST" });
    disconnect();
  };

  return { imgRef, persons, fps, events, connected, ackEvent, startStream, stopStream };
}
