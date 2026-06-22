import * as React from "react";
import { getProctorLogs, getMyProctorLogs, logProctorEvent, sendProctorFrame, wsUrl } from "@/lib/api";
import { useAuth } from "@/context/auth-context";

export type ProctoringSeverity = "LOW" | "MEDIUM" | "HIGH";
export type ProctoringEventType =
  | "NO_FACE_DETECTED"
  | "MULTIPLE_FACES_DETECTED"
  | "FACE_OK"
  | "TAB_SWITCH"
  | "FULLSCREEN_EXIT"
  | "COPY_BLOCKED"
  | "PASTE_BLOCKED"
  | "RIGHT_CLICK_BLOCKED"
  | "EXAM_STARTED"
  | "EXAM_SUBMITTED";

export interface ProctoringEvent {
  id: string;
  studentId: string;
  studentName: string;
  examId?: string;
  type: ProctoringEventType;
  severity: ProctoringSeverity;
  message: string;
  timestamp: number;
}

export interface LiveFrame {
  studentId: string;
  studentName: string;
  examId?: string;
  dataUrl: string;
  ts: number;
}

interface ProctoringContextValue {
  events: ProctoringEvent[];
  logEvent: (e: Omit<ProctoringEvent, "id" | "timestamp">) => void;
  clear: () => void;
  liveFrames: Record<string, LiveFrame>;
  publishFrame: (f: LiveFrame) => Promise<any | null>;
}

const Ctx = React.createContext<ProctoringContextValue | null>(null);

const SEVERITY_BY_TYPE: Record<ProctoringEventType, ProctoringSeverity> = {
  NO_FACE_DETECTED: "MEDIUM",
  MULTIPLE_FACES_DETECTED: "HIGH",
  FACE_OK: "LOW",
  TAB_SWITCH: "HIGH",
  FULLSCREEN_EXIT: "MEDIUM",
  COPY_BLOCKED: "LOW",
  PASTE_BLOCKED: "LOW",
  RIGHT_CLICK_BLOCKED: "LOW",
  EXAM_STARTED: "LOW",
  EXAM_SUBMITTED: "LOW",
};

export function severityFor(type: ProctoringEventType): ProctoringSeverity {
  return SEVERITY_BY_TYPE[type] ?? "LOW";
}

export function ProctoringProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const [events, setEvents] = React.useState<ProctoringEvent[]>([]);
  const [liveFrames, setLiveFrames] = React.useState<Record<string, LiveFrame>>({});

  React.useEffect(() => {
    if (!user) {
      setEvents([]);
      return;
    }
    const fetchLogs = async () => {
      try {
        const data = user.role === "student" ? await getMyProctorLogs() : await getProctorLogs();
        const items = (data?.logs ?? data ?? []) as any[];
        setEvents(items.map(mapLogToEvent).filter(Boolean) as ProctoringEvent[]);
      } catch {
        setEvents([]);
      }
    };
    fetchLogs();
    const id = user.role === "student" ? null : setInterval(fetchLogs, 15000);
    return () => {
      if (id) clearInterval(id);
    };
  }, [user]);

  // Refs used outside the WS effect so publishFrame can find the live socket
  // even after the effect re-runs (login / logout / hot-reload).
  const wsRef = React.useRef<WebSocket | null>(null);
  const wsBufferRef = React.useRef<string[]>([]);
  const wsOpenRef = React.useRef<boolean>(false);

  React.useEffect(() => {
    if (!user) {
      // Close any socket from a previous user.
      try { wsRef.current?.close(); } catch {}
      wsRef.current = null;
      wsOpenRef.current = false;
      (window as any).__proctoring_ws = wsRef;
      (window as any).__proctoring_ws_open__ = false;
      return;
    }

    let cancelled = false;
    let retryDelay = 1000;

    const connect = () => {
      if (cancelled) return;
      const token = (typeof window !== "undefined" && localStorage.getItem("proctorx_access")) || "";
      const url = wsUrl("/ws/proctoring/", token || undefined);
      let ws: WebSocket;
      try {
        ws = new WebSocket(url);
      } catch {
        scheduleReconnect();
        return;
      }
      wsRef.current = ws;
      wsOpenRef.current = false;
      // Expose to the rest of the app (publishFrame, debugging).
      (window as any).__proctoring_ws = wsRef;
      (window as any).__proctoring_ws_open__ = false;

      ws.onopen = () => {
        wsOpenRef.current = true;
        (window as any).__proctoring_ws_open__ = true;
        retryDelay = 1000;
        // Flush queued frames from before the socket was open.
        while (wsBufferRef.current.length && ws.readyState === WebSocket.OPEN) {
          const msg = wsBufferRef.current.shift();
          if (msg) ws.send(msg);
        }
      };

      ws.onmessage = (evt) => {
        try {
          const msg = JSON.parse(evt.data);
          if (msg?.event === "frame" && msg.payload?.frame) {
            const f = msg.payload;
            setLiveFrames((prev) => ({
              ...prev,
              [f.student_id]: {
                studentId: String(f.student_id),
                studentName: f.student_name,
                examId: String(f.exam_id),
                dataUrl: f.frame,
                ts: Date.parse(f.timestamp) || Date.now(),
              },
            }));
            return;
          }
          if (msg?.payload?.event_type || msg?.event) {
            const event = mapBroadcastToEvent(msg);
            if (event) {
              setEvents((prev) => [event, ...prev].slice(0, 200));
            }
          }
        } catch {
          // ignore
        }
      };

      ws.onerror = () => {
        // The close handler will trigger a reconnect.
      };

      ws.onclose = () => {
        wsOpenRef.current = false;
        (window as any).__proctoring_ws_open__ = false;
        if (wsRef.current === ws) wsRef.current = null;
        scheduleReconnect();
      };
    };

    const scheduleReconnect = () => {
      if (cancelled) return;
      const delay = Math.min(retryDelay, 15000);
      retryDelay = Math.min(retryDelay * 2, 15000);
      setTimeout(connect, delay);
    };

    connect();

    return () => {
      cancelled = true;
      try { wsRef.current?.close(); } catch {}
      if (wsRef.current) wsRef.current = null;
      wsOpenRef.current = false;
      (window as any).__proctoring_ws = wsRef;
      (window as any).__proctoring_ws_open__ = false;
    };
  }, [user]);

  const logEvent = React.useCallback<ProctoringContextValue["logEvent"]>((e) => {
    const evt: ProctoringEvent = {
      ...e,
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      timestamp: Date.now(),
    };
    setEvents((prev) => [evt, ...prev].slice(0, 200));
    if (e.examId) {
      logProctorEvent({ examId: e.examId, eventType: e.type, message: e.message }).catch(() => {});
    }
  }, []);

  const publishFrame = React.useCallback(async (f: LiveFrame) => {
    setLiveFrames((prev) => ({ ...prev, [f.studentId]: f }));
    if (f.examId) {
      const frameMessage = JSON.stringify({
        event: "frame",
        payload: {
          exam_id: f.examId,
          student_id: f.studentId,
          student_name: f.studentName,
          frame: f.dataUrl,
          timestamp: new Date().toISOString(),
        },
      });

      // Send the frame over the websocket as a fast path so teachers receive it
      // immediately. Buffer if the socket hasn't opened yet so the first frame
      // isn't dropped during the CONNECTING phase.
      try {
        const wsAny = (window as any).__proctoring_ws;
        const ws = wsAny && wsAny.current ? (wsAny.current as WebSocket) : null;
        if (ws && ws.readyState === WebSocket.OPEN) {
          ws.send(frameMessage);
        } else if (ws && ws.readyState === WebSocket.CONNECTING) {
          // Cap the buffer so we don't grow unbounded if the socket never opens.
          if (wsBufferRef.current.length < 10) wsBufferRef.current.push(frameMessage);
        }
      } catch {
        // ignore websocket send errors
      }

      try {
        return await sendProctorFrame(f.examId, f.dataUrl);
      } catch {
        return null;
      }
    }
    return null;
  }, []);

  const clear = React.useCallback(() => setEvents([]), []);

  return (
    <Ctx.Provider value={{ events, logEvent, clear, liveFrames, publishFrame }}>
      {children}
    </Ctx.Provider>
  );
}

export function useProctoring() {
  const v = React.useContext(Ctx);
  if (!v) throw new Error("useProctoring must be used within ProctoringProvider");
  return v;
}


function messageFor(type: ProctoringEventType): string {
  switch (type) {
    case "NO_FACE_DETECTED": return "No face detected in webcam";
    case "MULTIPLE_FACES_DETECTED": return "Multiple faces detected";
    case "FACE_OK": return "Face detected — normal";
    case "TAB_SWITCH": return "Tab switch detected";
    case "FULLSCREEN_EXIT": return "Exited fullscreen mode";
    case "COPY_BLOCKED": return "Copy attempt blocked";
    case "PASTE_BLOCKED": return "Paste attempt blocked";
    case "RIGHT_CLICK_BLOCKED": return "Right-click blocked";
    case "EXAM_STARTED": return "Exam session started";
    case "EXAM_SUBMITTED": return "Exam submitted";
  }
}

function mapLogToEvent(log: any): ProctoringEvent | null {
  if (!log) return null;
  const type = mapBackendEventType(log.event_type ?? log.eventType ?? log.event);
  return {
    id: String(log.id ?? `${Date.now()}-${Math.random()}`),
    studentId: String(log.student ?? log.student_id ?? "unknown"),
    studentName: log.student_name ?? log.studentName ?? "Student",
    examId: String(log.exam ?? log.exam_id ?? ""),
    type,
    severity: (log.severity ?? severityFor(type)).toUpperCase() as ProctoringSeverity,
    message: log.message ?? messageFor(type),
    timestamp: log.timestamp ? Date.parse(log.timestamp) : Date.now(),
  };
}

function mapBroadcastToEvent(msg: any): ProctoringEvent | null {
  const payload = msg.payload ?? {};
  const type = mapBackendEventType(payload.event_type ?? msg.event ?? msg.event_type);
  if (!type) return null;
  return {
    id: String(payload.id ?? `${Date.now()}-${Math.random()}`),
    studentId: String(payload.student_id ?? "unknown"),
    studentName: payload.student_name ?? "Student",
    examId: payload.exam_id ? String(payload.exam_id) : undefined,
    type,
    severity: severityFor(type),
    message: payload.message ?? messageFor(type),
    timestamp: payload.timestamp ? Date.parse(payload.timestamp) : Date.now(),
  };
}

function mapBackendEventType(type: string): ProctoringEventType {
  const map: Record<string, ProctoringEventType> = {
    no_face: "NO_FACE_DETECTED",
    multiple_faces: "MULTIPLE_FACES_DETECTED",
    face_not_centered: "FACE_OK",
    tab_switch: "TAB_SWITCH",
    fullscreen_exit: "FULLSCREEN_EXIT",
    copy_attempt: "COPY_BLOCKED",
    paste_attempt: "PASTE_BLOCKED",
    right_click: "RIGHT_CLICK_BLOCKED",
    exam_started: "EXAM_STARTED",
    exam_submitted: "EXAM_SUBMITTED",
  };
  return map[type] ?? (type as ProctoringEventType);
}

export { messageFor };
