// hooks/useWebSocket.ts — Live data from backend WS

import { useEffect, useRef, useState, useCallback } from 'react';

export interface WsMessage {
  type: string;
  data: any;
  ts: number;
}

export function useWebSocket(url: string) {
  const ws      = useRef<WebSocket | null>(null);
  const [status,       setStatus]       = useState<'connecting'|'connected'|'disconnected'>('connecting');
  const [lastMessage,  setLastMessage]  = useState<WsMessage | null>(null);
  const [priceMap,     setPriceMap]     = useState<Record<string, number>>({});
  const [botStatus,    setBotStatus]    = useState<any>(null);
  const reconnectRef = useRef<ReturnType<typeof setTimeout>>();

  const connect = useCallback(() => {
    const socket = new WebSocket(url);
    ws.current = socket;

    socket.onopen  = () => setStatus('connected');
    socket.onclose = () => {
      setStatus('disconnected');
      reconnectRef.current = setTimeout(connect, 3000);
    };
    socket.onerror = () => socket.close();

    socket.onmessage = (e) => {
      try {
        const msg: WsMessage = JSON.parse(e.data);
        setLastMessage(msg);
        if (msg.type === 'PRICE') {
          setPriceMap(prev => ({ ...prev, [msg.data.symbol]: msg.data.price }));
        }
        if (msg.type === 'STATUS') {
          setBotStatus(msg.data);
        }
      } catch (_) {}
    };
  }, [url]);

  useEffect(() => {
    connect();
    return () => {
      clearTimeout(reconnectRef.current);
      ws.current?.close();
    };
  }, [connect]);

  return { status, lastMessage, priceMap, botStatus };
}
