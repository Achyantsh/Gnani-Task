"use client";

import { useEffect, useRef, useState, useCallback } from "react";

export interface SSETranscriptionData {
  transcript: string;
  summary: string;
  duration_seconds?: number;
  playback_url?: string;
  segments?: unknown[];
}

interface SSEEvent {
  type: string;
  user_id?: string;
  task_id?: string;
  data?: SSETranscriptionData;
}

export function useSSE(userId: string | null) {
  const [isConnected, setIsConnected] = useState(false);
  const [lastEvent, setLastEvent] = useState<SSEEvent | null>(null);

  const eventSourceRef = useRef<EventSource | null>(null);
  const reconnectTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const reconnectAttempts = useRef(0);
  const maxReconnectAttempts = 5;
  const connectRef = useRef<(() => void) | null>(null);

  const doConnect = useCallback(() => {
    if (!userId || eventSourceRef.current) return;

    const eventSource = new EventSource(`/api/events/${userId}`);
    eventSourceRef.current = eventSource;

    eventSource.onopen = () => {
      console.log('[SSE] Connected');
      setIsConnected(true);
      reconnectAttempts.current = 0;
    };

    eventSource.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data) as SSEEvent;
        console.log('[SSE] Received:', data);
        setLastEvent(data);
      } catch (e) {
        console.error('[SSE] Parse error:', e);
      }
    };

    eventSource.onerror = (err) => {
      console.error('[SSE] Error:', err);
      setIsConnected(false);
      eventSource.close();
      eventSourceRef.current = null;

      // Reconnect with exponential backoff
      if (reconnectAttempts.current < maxReconnectAttempts) {
        const delay = Math.min(1000 * 2 ** reconnectAttempts.current, 30000);
        reconnectAttempts.current++;
        console.log(`[SSE] Reconnecting in ${delay}ms (attempt ${reconnectAttempts.current})`);
        reconnectTimeoutRef.current = setTimeout(() => connectRef.current?.(), delay);
      }
    };
  }, [userId]);

  // Update ref when doConnect changes
  useEffect(() => {
    connectRef.current = doConnect;
  }, [doConnect]);

  const disconnect = useCallback(() => {
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
      eventSourceRef.current = null;
    }
    setIsConnected(false);
    reconnectAttempts.current = 0;
  }, []);

  useEffect(() => {
    let mounted = true;

    if (userId) {
      doConnect();
    } else if (mounted) {
      // disconnect() calls setIsConnected(false) - this is a valid state update
      // in response to prop change, not during render
      setTimeout(() => {
        if (mounted) disconnect();
      }, 0);
    }

    return () => {
      mounted = false;
      disconnect();
    };
  }, [userId, doConnect, disconnect]);

  return {
    isConnected,
    lastEvent,
    connect: doConnect,
    disconnect,
  };
}