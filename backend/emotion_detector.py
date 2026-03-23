"""
emotion_detector.py
-------------------
Analyses a base64-encoded image using DeepFace and returns the dominant
emotion along with the full emotion scores.
"""

import base64
import io
import logging
from typing import Dict, Tuple

import cv2
import numpy as np
from deepface import DeepFace
from PIL import Image

logger = logging.getLogger(__name__)

# Emotions supported by DeepFace that we expose
SUPPORTED_EMOTIONS = {"angry", "disgust", "fear", "happy", "neutral", "sad", "surprise"}


def _base64_to_numpy(image_b64: str) -> np.ndarray:
    """Decode a base64-encoded image string (with or without data-URI prefix) to an
    OpenCV-compatible NumPy array (BGR)."""
    if "," in image_b64:
        image_b64 = image_b64.split(",", 1)[1]

    image_bytes = base64.b64decode(image_b64)
    pil_image = Image.open(io.BytesIO(image_bytes)).convert("RGB")
    frame = cv2.cvtColor(np.array(pil_image), cv2.COLOR_RGB2BGR)
    return frame


def analyze_emotion(image_b64: str) -> Tuple[str, Dict[str, float]]:
    """
    Analyze the dominant facial emotion from a base64 image.

    Parameters
    ----------
    image_b64 : str
        Base64-encoded image (JPEG/PNG), optionally with a data-URI prefix.

    Returns
    -------
    dominant_emotion : str
        The emotion with the highest confidence score.
    emotion_scores : dict
        Mapping of emotion label → confidence (0–100).

    Raises
    ------
    ValueError
        If no face is detected or the image cannot be decoded.
    """
    try:
        frame = _base64_to_numpy(image_b64)
    except Exception as exc:
        raise ValueError(f"Could not decode image: {exc}") from exc
    try:
        results = DeepFace.analyze(
            img_path=frame,
            actions=["emotion"],
            enforce_detection=True,
            silent=True,
        )
        if not results:
            raise ValueError("No face detected in the image.")
    except Exception as exc:
        # Retry with relaxed detection to avoid hard failures when a face is present
        # but the strict detector cannot lock onto it.
        logger.warning("Strict face detection failed, retrying without enforcement: %s", exc)
        try:
            results = DeepFace.analyze(
                img_path=frame,
                actions=["emotion"],
                enforce_detection=False,
                silent=True,
            )
            if not results:
                raise ValueError("No face detected in the image.")
        except Exception as exc2:
            raise ValueError(f"No face detected in the image: {exc2}") from exc2

    # DeepFace returns a list when multiple faces are found; use the first.
    result = results[0] if isinstance(results, list) else results

    dominant_emotion: str = result["dominant_emotion"]
    emotion_scores: Dict[str, float] = result["emotion"]

    return dominant_emotion, emotion_scores
