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
  publishFrame: (f: LiveFrame) => void;
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
  }, [user]);

  React.useEffect(() => {
    if (!user) return;
    const ws = new WebSocket(wsUrl("/ws/proctoring/"));
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
    return () => ws.close();
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

  const publishFrame = React.useCallback((f: LiveFrame) => {
    setLiveFrames((prev) => ({ ...prev, [f.studentId]: f }));
    if (f.examId) {
      sendProctorFrame(f.examId, f.dataUrl).catch(() => {});
    }
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
