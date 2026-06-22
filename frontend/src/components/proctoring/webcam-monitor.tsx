import * as React from "react";
import { Camera, AlertTriangle, CheckCircle2, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import {
  useProctoring,
  type ProctoringEventType,
  severityFor,
  messageFor,
} from "@/context/proctoring-context";

type FaceState = "idle" | "ok" | "no_face" | "multi_face";

interface Props {
  studentId: string;
  studentName: string;
  examId?: string;
  intervalMs?: number;
  className?: string;
}

/**
 * Webcam monitor + skin-tone based face detection (with temporal smoothing).
 * Also publishes the latest frame to ProctoringContext so the teacher's
 * live monitoring page can render the student's webcam in real time.
 */
export function WebcamMonitor({
  studentId,
  studentName,
  examId,
  intervalMs = 2500,
  className,
}: Props) {
  const videoRef = React.useRef<HTMLVideoElement | null>(null);
  const canvasRef = React.useRef<HTMLCanvasElement | null>(null);
  const streamRef = React.useRef<MediaStream | null>(null);
  const [permission, setPermission] = React.useState<"pending" | "granted" | "denied">("pending");
  const [cameraError, setCameraError] = React.useState<string | null>(null);
  const [face, setFace] = React.useState<FaceState>("idle");
  const [lastSent, setLastSent] = React.useState<number | null>(null);
  const lastStateRef = React.useRef<FaceState>("idle");
  const historyRef = React.useRef<FaceState[]>([]);
  const { logEvent, publishFrame } = useProctoring();

  const requestAccess = React.useCallback(async () => {
    try {
      setCameraError(null);
      streamRef.current?.getTracks().forEach((t) => t.stop());
      // Request HD (720p) and let the browser negotiate. We list three ideal
      // resolutions so cameras that can't deliver 720p fall back gracefully
      // (e.g. older laptop cams that only do 480p) instead of failing.
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          width: { ideal: 1280 },
          height: { ideal: 720 },
          frameRate: { ideal: 30, max: 30 },
          facingMode: { ideal: "user" },
        },
        audio: false,
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        // Reflect what the camera actually delivered so the UI can show a
        // truthful "HD 720p" / "SD 480p" hint.
        const track = stream.getVideoTracks?.()[0];
        const settings = track?.getSettings?.();
        if (settings?.width && settings?.height) {
          videoRef.current.dataset.actualWidth = String(settings.width);
          videoRef.current.dataset.actualHeight = String(settings.height);
        }
        await videoRef.current.play().catch(() => {});
      }
      setPermission("granted");
    } catch (err) {
      const error = err as DOMException | Error;
      const name = (error as DOMException).name ?? "";
      const fallbackMessage =
        name === "NotAllowedError"
          ? "Camera permission was blocked. Please allow webcam access in your browser and try again."
          : name === "NotFoundError"
            ? "No webcam was found on this device. Please connect a camera and try again."
            : name === "NotReadableError"
              ? "Your webcam is busy or unavailable. Close other apps using the camera and try again."
              : "Unable to start the webcam. Please check browser permissions and try again.";
      setCameraError(fallbackMessage);
      setPermission("denied");
    }
  }, []);

  React.useEffect(() => {
    requestAccess();
    return () => {
      streamRef.current?.getTracks().forEach((t) => t.stop());
    };
  }, [requestAccess]);

  React.useEffect(() => {
    if (permission !== "granted") return;
    const tick = async () => {
      const v = videoRef.current;
      const c = canvasRef.current;
      if (!v || !c || v.videoWidth === 0) return;

      // HD publish canvas — drives the teacher's live tile. We cap at 1280x720
      // so we never ship a 4K frame over WS/Channels every 2.5s.
      const PUB_MAX_W = 1280;
      const PUB_MAX_H = 720;
      const srcW = v.videoWidth;
      const srcH = v.videoHeight;
      const scale = Math.min(1, PUB_MAX_W / srcW, PUB_MAX_H / srcH);
      const pubW = Math.max(1, Math.round(srcW * scale));
      const pubH = Math.max(1, Math.round(srcH * scale));

      c.width = pubW;
      c.height = pubH;
      const ctx = c.getContext("2d");
      if (!ctx) return;
      ctx.drawImage(v, 0, 0, pubW, pubH);

      // Small analysis canvas for face detection — keeps the skin-tone scan
      // cheap so it doesn't compete with the HD encode.
      const anaW = 240;
      const anaH = Math.round(180 * (pubH / pubW));
      const anaCanvas = document.createElement("canvas");
      anaCanvas.width = anaW;
      anaCanvas.height = anaH;
      const anaCtx = anaCanvas.getContext("2d");
      if (!anaCtx) return;
      anaCtx.drawImage(v, 0, 0, anaW, anaH);

      const now = Date.now();
      setLastSent(now);

      // High-quality JPEG for the teacher feed (q=0.82 ≈ visually lossless
      // for surveillance-style frames while still compressing well).
      const dataUrl = c.toDataURL("image/jpeg", 0.82);
      const analysis = await publishFrame({ studentId, studentName, examId, dataUrl, ts: now });

      let raw: FaceState = analyzeFrame(anaCtx, anaW, anaH);
      if (analysis) {
        if (analysis.warning === "no_face") raw = "no_face";
        else if (analysis.warning === "multiple_faces") raw = "multi_face";
        else if (analysis.face_detected) raw = "ok";
      }

      // Temporal smoothing: only switch state after 2 consecutive same readings
      const hist = historyRef.current;
      hist.push(raw);
      if (hist.length > 3) hist.shift();
      const stable: FaceState =
        hist.length >= 2 && hist[hist.length - 1] === hist[hist.length - 2]
          ? raw
          : lastStateRef.current === "idle"
            ? raw
            : lastStateRef.current;

      setFace(stable);

      if (stable !== lastStateRef.current && stable !== "idle") {
        lastStateRef.current = stable;
        const type = mapToEventType(stable);
        if (type) {
          logEvent({
            studentId,
            studentName,
            examId,
            type,
            severity: severityFor(type),
            message: messageFor(type),
          });
        }
      }
    };
    tick();
    const id = setInterval(() => { void tick(); }, intervalMs);
    return () => clearInterval(id);
  }, [permission, intervalMs, studentId, studentName, examId, logEvent, publishFrame]);

  return (
    <div className={cn("space-y-2", className)}>
      <div className="relative aspect-video rounded-md overflow-hidden bg-linear-to-br from-primary/20 to-accent/20 border">
        <video
          ref={videoRef}
          muted
          playsInline
          className={cn(
            "h-full w-full object-cover",
            permission !== "granted" && "opacity-0",
          )}
        />
        <canvas ref={canvasRef} className="hidden" />

        {permission === "pending" && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 text-xs text-muted-foreground">
            <Loader2 className="h-5 w-5 animate-spin" />
            Requesting webcam access…
          </div>
        )}
        {permission === "denied" && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 p-3 text-center">
            <Camera className="h-6 w-6 text-destructive" />
            <div className="text-xs">Webcam access required to take this exam.</div>
            {cameraError && <div className="max-w-[16rem] text-[11px] text-muted-foreground">{cameraError}</div>}
            <Button size="sm" variant="outline" onClick={requestAccess}>Try again</Button>
          </div>
        )}
        {permission === "granted" && (
          <>
            <div className="absolute top-1.5 left-1.5 h-1.5 w-1.5 rounded-full bg-destructive animate-pulse" />
            <div className="absolute bottom-1.5 left-1.5 text-[10px] bg-background/80 px-1.5 rounded">LIVE</div>
            <div className="absolute top-1.5 right-1.5">
              <FaceBadge face={face} />
            </div>
          </>
        )}
      </div>

      {permission === "granted" && (
        <div className="flex items-center justify-between text-[10px] text-muted-foreground">
          <span>AI face check every {Math.round(intervalMs / 1000)}s</span>
          {lastSent && <span>frame: {new Date(lastSent).toLocaleTimeString()}</span>}
        </div>
      )}
      {permission !== "granted" && (
        <div className="text-[10px] text-muted-foreground">
          If your browser asked for camera permission, choose <span className="font-medium text-foreground">Allow</span>. If it didn’t, click <span className="font-medium text-foreground">Try again</span> after checking the site camera permission in the address bar.
        </div>
      )}
    </div>
  );
}

function FaceBadge({ face }: { face: FaceState }) {
  if (face === "ok")
    return (
      <Badge className="bg-success/20 text-success border-0 gap-1 h-5">
        <CheckCircle2 className="h-3 w-3" /> Face OK
      </Badge>
    );
  if (face === "no_face")
    return (
      <Badge className="bg-warning/20 text-warning border-0 gap-1 h-5">
        <AlertTriangle className="h-3 w-3" /> No face
      </Badge>
    );
  if (face === "multi_face")
    return (
      <Badge className="bg-destructive/20 text-destructive border-0 gap-1 h-5">
        <AlertTriangle className="h-3 w-3" /> Multiple
      </Badge>
    );
  return null;
}

function mapToEventType(s: FaceState): ProctoringEventType | null {
  if (s === "no_face") return "NO_FACE_DETECTED";
  if (s === "multi_face") return "MULTIPLE_FACES_DETECTED";
  if (s === "ok") return "FACE_OK";
  return null;
}

/**
 * Skin-tone based face detection heuristic.
 * - Counts skin-colored pixels across the frame.
 * - Splits frame into 3 horizontal bands; bands with a meaningful skin
 *   cluster (>4% of band) count as a "face zone".
 *   0 zones -> no_face
 *   1-2 contiguous zones -> ok
 *   2+ non-contiguous zones with high separation -> multi_face
 */
function analyzeFrame(ctx: CanvasRenderingContext2D, w: number, h: number): FaceState {
  try {
    const img = ctx.getImageData(0, 0, w, h);
    const data = img.data;
    // 3 horizontal bands (vertical slices) — left / center / right
    const bands = [0, 0, 0];
    const bandPixels = [0, 0, 0];
    for (let y = 0; y < h; y += 2) {
      for (let x = 0; x < w; x += 2) {
        const i = (y * w + x) * 4;
        const r = data[i], g = data[i + 1], b = data[i + 2];
        const bandIdx = x < w / 3 ? 0 : x < (2 * w) / 3 ? 1 : 2;
        bandPixels[bandIdx]++;
        if (isSkin(r, g, b)) bands[bandIdx]++;
      }
    }
    const ratios = bands.map((c, i) => c / Math.max(1, bandPixels[i]));
    const SKIN_THRESHOLD = 0.05;
    const active = ratios.map((r) => r > SKIN_THRESHOLD);
    const activeCount = active.filter(Boolean).length;

    if (activeCount === 0) return "no_face";
    // Multiple faces: left AND right band active but center NOT (two people)
    if (active[0] && active[2] && !active[1]) return "multi_face";
    // Also: all 3 bands active with strong skin in left+right
    if (active[0] && active[2] && ratios[0] > 0.08 && ratios[2] > 0.08 && ratios[1] < ratios[0] && ratios[1] < ratios[2])
      return "multi_face";
    return "ok";
  } catch {
    return "idle";
  }
}

// Simple RGB skin-tone rule (Kovac et al.)
function isSkin(r: number, g: number, b: number): boolean {
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  return (
    r > 95 &&
    g > 40 &&
    b > 20 &&
    max - min > 15 &&
    Math.abs(r - g) > 15 &&
    r > g &&
    r > b
  );
}
