"""AI engine helpers for proctoring frame analysis using OpenCV + MediaPipe."""
from __future__ import annotations

import base64
import io
import logging
from typing import Dict, List, Optional, Tuple

try:
    import cv2
    import mediapipe as mp
    import numpy as np
except Exception:  # pragma: no cover - optional deps
    cv2 = None
    mp = None
    np = None

logger = logging.getLogger(__name__)


def _decode_base64_image(frame_b64: str) -> Optional[bytes]:
    try:
        if frame_b64.startswith('data:'):
            # strip data URI prefix
            frame_b64 = frame_b64.split(',', 1)[1]
        return base64.b64decode(frame_b64)
    except Exception:
        logger.exception('failed to decode base64 image')
        return None


def detect_faces_from_bytes(image_bytes: bytes) -> Dict[str, object]:
    """Return detected face count, bounding boxes, and annotated bytes."""
    if not cv2 or not mp or not np:
        return {'faces': 0, 'boxes': [], 'annotated_bytes': image_bytes}

    try:
        data = np.frombuffer(image_bytes, dtype=np.uint8)
        img = cv2.imdecode(data, cv2.IMREAD_COLOR)
        if img is None:
            return {'faces': 0, 'boxes': [], 'annotated_bytes': image_bytes}

        with mp.solutions.face_detection.FaceDetection(model_selection=0, min_detection_confidence=0.5) as detector:
            rgb = cv2.cvtColor(img, cv2.COLOR_BGR2RGB)
            results = detector.process(rgb)
            detections = results.detections if results and results.detections else []
            boxes: List[Tuple[int, int, int, int]] = []
            for detection in detections:
                bbox = detection.location_data.relative_bounding_box
                ih, iw = img.shape[:2]
                x = max(int(bbox.xmin * iw), 0)
                y = max(int(bbox.ymin * ih), 0)
                w = max(int(bbox.width * iw), 0)
                h = max(int(bbox.height * ih), 0)
                boxes.append((x, y, w, h))

            annotated = img.copy()
            for (x, y, w, h) in boxes:
                cv2.rectangle(annotated, (x, y), (x + w, y + h), (0, 255, 0), 2)
                cv2.putText(
                    annotated,
                    'Face',
                    (x, max(y - 10, 20)),
                    cv2.FONT_HERSHEY_SIMPLEX,
                    0.6,
                    (0, 255, 0),
                    2,
                    cv2.LINE_AA,
                )

            success, buffer = cv2.imencode('.jpg', annotated)
            annotated_bytes = buffer.tobytes() if success else image_bytes
            return {'faces': len(detections), 'boxes': boxes, 'annotated_bytes': annotated_bytes}
    except Exception:
        logger.exception('error detecting faces')
        return {'faces': 0, 'boxes': [], 'annotated_bytes': image_bytes}


def analyze_frame(frame_input) -> Dict[str, Optional[object]]:
    """High-level analyzer.

    frame_input: either base64 string or raw bytes

    Returns dict with keys: face_detected (bool), multiple_faces (bool), warning (str|None), image_bytes (optional screenshot bytes)
    """
    image_bytes = None
    if isinstance(frame_input, str):
        image_bytes = _decode_base64_image(frame_input)
    elif isinstance(frame_input, (bytes, bytearray)):
        image_bytes = bytes(frame_input)
    else:
        logger.debug('unsupported frame input type: %s', type(frame_input))
        return {'face_detected': False, 'multiple_faces': False, 'warning': 'unsupported_frame', 'image_bytes': None}

    if not image_bytes:
        return {'face_detected': False, 'multiple_faces': False, 'warning': 'invalid_image', 'image_bytes': None}

    res = detect_faces_from_bytes(image_bytes)
    faces = int(res.get('faces', 0))

    if faces == 0:
        return {'face_detected': False, 'multiple_faces': False, 'warning': 'no_face', 'image_bytes': res.get('annotated_bytes') or image_bytes, 'boxes': res.get('boxes', [])}
    if faces > 1:
        return {'face_detected': True, 'multiple_faces': True, 'warning': 'multiple_faces', 'image_bytes': res.get('annotated_bytes') or image_bytes, 'boxes': res.get('boxes', [])}
    return {'face_detected': True, 'multiple_faces': False, 'warning': None, 'image_bytes': res.get('annotated_bytes') or image_bytes, 'boxes': res.get('boxes', [])}
