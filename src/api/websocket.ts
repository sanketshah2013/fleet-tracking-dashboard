// WebSocket client for live fleet updates.
// The server pushes vehicle updates roughly every 3 minutes.
// wss://case-study-26cf.onrender.com

import { WsMessage, WsStatus } from "../types";

const WS_URL =
  process.env.REACT_APP_WS_URL || "wss://case-study-26cf.onrender.com";

const RECONNECT_DELAY_MS = 5000;
const MAX_RECONNECT_DELAY_MS = 30000;

export interface CreateFleetSocketOptions {
  onMessage?: (payload: WsMessage) => void;
  onStatusChange?: (status: WsStatus) => void;
}

export interface FleetSocket {
  close: () => void;
}

export const createFleetSocket = ({
  onMessage,
  onStatusChange,
}: CreateFleetSocketOptions): FleetSocket => {
  let socket: WebSocket | null = null;
  let reconnectAttempts = 0;
  let reconnectTimer: ReturnType<typeof setTimeout> | undefined;
  let manuallyClosed = false;

  function connect(): void {
    manuallyClosed = false;
    try {
      socket = new WebSocket(WS_URL);
    } catch (err) {
      scheduleReconnect();
      return;
    }

    onStatusChange?.("connecting");

    socket.onopen = () => {
      reconnectAttempts = 0;
      onStatusChange?.("connected");
    };

    socket.onmessage = (event: MessageEvent) => {
      try {
        // This client is a thin transport layer: it only guarantees valid
        // JSON reached us, it doesn't interpret `type`/`data` here. Message
        // interpretation (initial snapshot vs. incremental update) is left
        // to the consumer (see `WsMessage` in `types.ts` and `FleetContext`)
        // so this module stays agnostic to the fleet domain schema.
        const data = JSON.parse(event.data) as WsMessage;
        onMessage?.(data);
      } catch (err) {
        // Non-JSON payloads are ignored rather than crashing the UI.
        console.warn("Received malformed WebSocket payload", err);
      }
    };

    socket.onerror = () => {
      onStatusChange?.("error");
    };

    socket.onclose = () => {
      onStatusChange?.("disconnected");
      if (!manuallyClosed) {
        scheduleReconnect();
      }
    };
  }

  const scheduleReconnect = (): void => {
    reconnectAttempts += 1;
    const delay = Math.min(
      RECONNECT_DELAY_MS * reconnectAttempts,
      MAX_RECONNECT_DELAY_MS,
    );
    clearTimeout(reconnectTimer);
    reconnectTimer = setTimeout(connect, delay);
  };

  const close = (): void => {
    manuallyClosed = true;
    clearTimeout(reconnectTimer);
    socket?.close();
  };

  connect();

  return { close };
};
