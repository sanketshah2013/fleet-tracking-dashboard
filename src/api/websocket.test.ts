import { createFleetSocket } from "./websocket";

/**
 * Minimal controllable fake of the browser WebSocket, since jsdom does not
 * implement a real one. Each instance is tracked in `instances` so tests can
 * reach in and fire lifecycle events (onopen/onmessage/onerror/onclose).
 */
class FakeWebSocket {
  static instances: FakeWebSocket[] = [];
  url: string;
  onopen: (() => void) | null = null;
  onmessage: ((event: { data: string }) => void) | null = null;
  onerror: (() => void) | null = null;
  onclose: (() => void) | null = null;
  closeCalls = 0;

  constructor(url: string) {
    this.url = url;
    FakeWebSocket.instances.push(this);
  }

  close(): void {
    this.closeCalls += 1;
    this.onclose?.();
  }
}

describe("createFleetSocket", () => {
  const originalWebSocket = (global as unknown as { WebSocket?: unknown })
    .WebSocket;

  beforeEach(() => {
    FakeWebSocket.instances = [];
    (global as unknown as { WebSocket: unknown }).WebSocket = FakeWebSocket;
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
    (global as unknown as { WebSocket: unknown }).WebSocket = originalWebSocket;
  });

  it('opens a socket immediately and reports "connecting" then "connected"', () => {
    const onStatusChange = jest.fn();
    createFleetSocket({ onStatusChange });

    expect(FakeWebSocket.instances).toHaveLength(1);
    expect(onStatusChange).toHaveBeenCalledWith("connecting");

    FakeWebSocket.instances[0].onopen?.();
    expect(onStatusChange).toHaveBeenCalledWith("connected");
  });

  it("parses valid JSON messages and forwards the payload to onMessage", () => {
    const onMessage = jest.fn();
    createFleetSocket({ onMessage });

    const payload = { data: [{ id: "v1" }] };
    FakeWebSocket.instances[0].onmessage?.({ data: JSON.stringify(payload) });

    expect(onMessage).toHaveBeenCalledWith(payload);
  });

  it("swallows malformed (non-JSON) messages without throwing or calling onMessage", () => {
    const onMessage = jest.fn();
    const warnSpy = jest.spyOn(console, "warn").mockImplementation(() => {});
    createFleetSocket({ onMessage });

    expect(() =>
      FakeWebSocket.instances[0].onmessage?.({ data: "not json{{{" }),
    ).not.toThrow();

    expect(onMessage).not.toHaveBeenCalled();
    expect(warnSpy).toHaveBeenCalled();
    warnSpy.mockRestore();
  });

  it('reports "error" status when the socket errors', () => {
    const onStatusChange = jest.fn();
    createFleetSocket({ onStatusChange });
    FakeWebSocket.instances[0].onerror?.();
    expect(onStatusChange).toHaveBeenCalledWith("error");
  });

  it('reports "disconnected" and schedules a reconnect on close', () => {
    const onStatusChange = jest.fn();
    createFleetSocket({ onStatusChange });

    FakeWebSocket.instances[0].onclose?.();
    expect(onStatusChange).toHaveBeenCalledWith("disconnected");

    // A reconnect should be scheduled: advancing time creates a 2nd socket.
    jest.advanceTimersByTime(5000);
    expect(FakeWebSocket.instances).toHaveLength(2);
  });

  it("uses increasing backoff delays across consecutive reconnect attempts", () => {
    createFleetSocket({});
    expect(FakeWebSocket.instances).toHaveLength(1);

    // 1st close -> reconnect after 5000ms (RECONNECT_DELAY_MS * 1)
    FakeWebSocket.instances[0].onclose?.();
    jest.advanceTimersByTime(4999);
    expect(FakeWebSocket.instances).toHaveLength(1);
    jest.advanceTimersByTime(1);
    expect(FakeWebSocket.instances).toHaveLength(2);

    // 2nd close -> reconnect after 10000ms (RECONNECT_DELAY_MS * 2)
    FakeWebSocket.instances[1].onclose?.();
    jest.advanceTimersByTime(9999);
    expect(FakeWebSocket.instances).toHaveLength(2);
    jest.advanceTimersByTime(1);
    expect(FakeWebSocket.instances).toHaveLength(3);
  });

  it("caps the reconnect delay at MAX_RECONNECT_DELAY_MS (30s)", () => {
    createFleetSocket({});

    // Drive 6 consecutive close->reconnect cycles: delays would be
    // 5000, 10000, 15000, 20000, 25000, 30000 (attempt * 5000, uncapped).
    // The 6th attempt already sits exactly at the 30s cap.
    for (let attempt = 1; attempt <= 6; attempt += 1) {
      const before = FakeWebSocket.instances.length;
      FakeWebSocket.instances[before - 1].onclose?.();
      const expectedDelay = Math.min(attempt * 5000, 30000);

      jest.advanceTimersByTime(expectedDelay - 1);
      expect(FakeWebSocket.instances).toHaveLength(before); // not yet
      jest.advanceTimersByTime(1);
      expect(FakeWebSocket.instances).toHaveLength(before + 1); // reconnected
    }

    // 7th attempt would uncapped be 35000ms; verify it is still capped to 30000ms.
    const before = FakeWebSocket.instances.length;
    FakeWebSocket.instances[before - 1].onclose?.();
    jest.advanceTimersByTime(29999);
    expect(FakeWebSocket.instances).toHaveLength(before);
    jest.advanceTimersByTime(1);
    expect(FakeWebSocket.instances).toHaveLength(before + 1);
  });

  it("resets the reconnect attempt counter after a successful reconnect", () => {
    createFleetSocket({});

    FakeWebSocket.instances[0].onclose?.();
    jest.advanceTimersByTime(5000); // 1st reconnect fires at base delay
    expect(FakeWebSocket.instances).toHaveLength(2);

    // Successful open resets the backoff counter.
    FakeWebSocket.instances[1].onopen?.();

    FakeWebSocket.instances[1].onclose?.();
    jest.advanceTimersByTime(4999);
    expect(FakeWebSocket.instances).toHaveLength(2);
    jest.advanceTimersByTime(1); // back to base delay (5000ms), not 10000ms
    expect(FakeWebSocket.instances).toHaveLength(3);
  });

  it("schedules a reconnect if the WebSocket constructor itself throws synchronously", () => {
    const ThrowingWebSocket = jest.fn(() => {
      throw new Error("constructor failed");
    });
    (global as unknown as { WebSocket: unknown }).WebSocket = ThrowingWebSocket;

    const onStatusChange = jest.fn();
    createFleetSocket({ onStatusChange });

    expect(onStatusChange).not.toHaveBeenCalledWith("connecting");

    // Recover for the next attempt so the reconnect can succeed.
    (global as unknown as { WebSocket: unknown }).WebSocket = FakeWebSocket;
    jest.advanceTimersByTime(5000);
    expect(FakeWebSocket.instances).toHaveLength(1);
  });

  it("does not reconnect after close() is called manually", () => {
    const socket = createFleetSocket({});
    expect(FakeWebSocket.instances).toHaveLength(1);

    socket.close();
    expect(FakeWebSocket.instances[0].closeCalls).toBe(1);

    jest.advanceTimersByTime(60_000);
    expect(FakeWebSocket.instances).toHaveLength(1); // no reconnect attempted
  });

  it("clears a pending reconnect timer when close() is called before it fires", () => {
    const socket = createFleetSocket({});
    expect(FakeWebSocket.instances).toHaveLength(1);

    // Server drops the connection; a reconnect gets scheduled for +5000ms.
    FakeWebSocket.instances[0].onclose?.();
    jest.advanceTimersByTime(1000);

    // Consumer explicitly closes before the scheduled reconnect fires.
    socket.close();

    // The pending reconnect timer must not fire after manual close.
    jest.advanceTimersByTime(60_000);
    expect(FakeWebSocket.instances).toHaveLength(1);
  });
});
