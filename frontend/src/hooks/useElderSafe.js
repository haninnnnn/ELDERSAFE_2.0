import { useEffect, useRef, useState, useCallback } from "react";
import { API_BASE, WS_BASE } from "../config";

export function useElderSafe() {
  const wsRef = useRef(null);
  const [imgSrc, setImgSrc]       = useState("");
  const [persons, setPersons]     = useState([]);
  const [fps, setFps]             = useState(0);
  const [events, setEvents]       = useState([]);
  const [connected, setConnected] = useState(false);

  const reconnectRef = useRef(null);

  const connect = useCallback(() => {
    if (wsRef.current) {
      wsRef.current.onclose = null;
      wsRef.current.close();
    }
    const ws = new WebSocket(WS_BASE);
    wsRef.current = ws;
    ws.onopen  = () => { setConnected(true); if (reconnectRef.current) { clearTimeout(reconnectRef.current); reconnectRef.current = null; } };
    ws.onclose = () => {
      setConnected(false); setFps(0);
      // auto-reconnect after 3 seconds
      reconnectRef.current = setTimeout(() => connect(), 3000);
    };
    ws.onerror = () => { setConnected(false); setFps(0); };
    ws.onmessage = ({ data }) => {
      const msg = JSON.parse(data);
      if (msg.frame) setImgSrc(`data:image/jpeg;base64,${msg.frame}`);
      setPersons(msg.persons || []);
      setFps(msg.fps || 0);
    };
  }, []);

  const disconnect = useCallback(() => {
    if (reconnectRef.current) { clearTimeout(reconnectRef.current); reconnectRef.current = null; }
    if (wsRef.current) {
      wsRef.current.onclose = null;
      wsRef.current.close();
      wsRef.current = null;
    }
    setConnected(false); setPersons([]); setFps(0); setImgSrc("");
  }, []);

  useEffect(() => {
    connect();
    return () => {
      if (wsRef.current) { wsRef.current.onclose = null; wsRef.current.close(); }
    };
  }, []);

  const fetchEvents = useCallback(async () => {
    try {
      const res = await fetch(`${API_BASE}/events?limit=20`);
      if (res.ok) setEvents(await res.json());
    } catch (e) {
      // Backend not available - this is expected in demo mode
    }
  }, []);

  useEffect(() => {
    fetchEvents();
    const id = setInterval(fetchEvents, 5000);
    return () => clearInterval(id);
  }, [fetchEvents]);

  const ackEvent = useCallback(async (id) => {
    await fetch(`${API_BASE}/events/${id}/acknowledge`, { method: "PATCH" });
    fetchEvents();
  }, [fetchEvents]);

  const startStream = async () => {
    await fetch(`${API_BASE}/stream/start`, { method: "POST" });
    connect();
  };

  const stopStream = async () => {
    await fetch(`${API_BASE}/stream/stop`, { method: "POST" });
    disconnect();
  };

  return { imgSrc, persons, fps, events, connected, ackEvent, startStream, stopStream };
}
