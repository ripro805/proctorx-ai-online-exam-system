import * as React from "react";
import { useProctoring, severityFor, messageFor } from "@/context/proctoring-context";
import { toast } from "sonner";

interface Options {
  studentId: string;
  studentName: string;
  examId?: string;
  enabled?: boolean;
  onTabSwitch?: () => void;
  onFullscreenExit?: () => void;
}

/**
 * Browser anti-cheat hook:
 *  - Tab switch detection (visibilitychange)
 *  - Fullscreen exit detection
 *  - Disable copy/paste
 *  - Disable right click
 * Every event is pushed into the proctoring stream (same shape the backend
 * /api/proctoring/events/ endpoint would receive).
 */
export function useAntiCheat({
  studentId,
  studentName,
  examId,
  enabled = true,
  onTabSwitch,
  onFullscreenExit,
}: Options) {
  const { logEvent } = useProctoring();
  const log = React.useCallback(
    (type: Parameters<typeof logEvent>[0]["type"]) => {
      logEvent({
        studentId,
        studentName,
        examId,
        type,
        severity: severityFor(type),
        message: messageFor(type),
      });
    },
    [logEvent, studentId, studentName, examId],
  );

  React.useEffect(() => {
    if (!enabled) return;

    const onVis = () => {
      if (document.hidden) {
        log("TAB_SWITCH");
        onTabSwitch?.();
      }
    };
    const onFs = () => {
      if (!document.fullscreenElement) {
        log("FULLSCREEN_EXIT");
        onFullscreenExit?.();
      }
    };
    const onCopy = (e: ClipboardEvent) => {
      e.preventDefault();
      log("COPY_BLOCKED");
      toast.warning("Copy is disabled during exams");
    };
    const onPaste = (e: ClipboardEvent) => {
      e.preventDefault();
      log("PASTE_BLOCKED");
      toast.warning("Paste is disabled during exams");
    };
    const onContext = (e: MouseEvent) => {
      e.preventDefault();
      log("RIGHT_CLICK_BLOCKED");
    };

    document.addEventListener("visibilitychange", onVis);
    document.addEventListener("fullscreenchange", onFs);
    document.addEventListener("copy", onCopy);
    document.addEventListener("paste", onPaste);
    document.addEventListener("contextmenu", onContext);
    return () => {
      document.removeEventListener("visibilitychange", onVis);
      document.removeEventListener("fullscreenchange", onFs);
      document.removeEventListener("copy", onCopy);
      document.removeEventListener("paste", onPaste);
      document.removeEventListener("contextmenu", onContext);
    };
  }, [enabled, log, onTabSwitch, onFullscreenExit]);
}
