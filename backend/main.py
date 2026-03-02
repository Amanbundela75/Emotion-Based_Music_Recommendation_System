"""
main.py
-------
FastAPI backend for the Emotion-Based Music Recommendation System.

Endpoints
---------
GET  /            — health check
POST /analyze     — accepts a base64 image, returns detected emotion + scores
POST /recommend   — accepts emotion string, returns Spotify track list
POST /analyze-and-recommend — convenience: image → emotion + tracks in one call
"""

import logging
import os
from typing import Dict, List, Optional

from dotenv import load_dotenv
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field

from emotion_detector import analyze_emotion
from spotify_service import EMOTION_GENRE_MAP, get_recommendations

load_dotenv()

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# ---------------------------------------------------------------------------
# App setup
# ---------------------------------------------------------------------------
app = FastAPI(
    title="Emotion-Based Music Recommendation API",
    description=(
        "Detects facial emotion from an image and recommends music tracks "
        "via the Spotify Web API."
    ),
    version="1.0.0",
)

_raw_origins = os.getenv("ALLOWED_ORIGINS", "http://localhost:5173,http://localhost:3000")
allowed_origins = [o.strip() for o in _raw_origins.split(",") if o.strip()]

app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ---------------------------------------------------------------------------
# Request / Response schemas
# ---------------------------------------------------------------------------


class AnalyzeRequest(BaseModel):
    image: str = Field(
        ...,
        description="Base64-encoded image (JPEG/PNG), with optional data-URI prefix.",
    )


class EmotionResponse(BaseModel):
    emotion: str
    scores: Dict[str, float]


class TrackItem(BaseModel):
    id: str
    name: str
    artist: str
    album: str
    album_art: Optional[str]
    spotify_url: str
    preview_url: Optional[str]


class RecommendRequest(BaseModel):
    emotion: str = Field(..., description="Emotion label, e.g. 'happy', 'sad'.")
    limit: int = Field(10, ge=1, le=50, description="Number of tracks to return.")


class RecommendResponse(BaseModel):
    emotion: str
    tracks: List[TrackItem]


class FullAnalysisResponse(BaseModel):
    emotion: str
    scores: Dict[str, float]
    tracks: List[TrackItem]


# ---------------------------------------------------------------------------
# Routes
# ---------------------------------------------------------------------------


@app.get("/", tags=["health"])
def health_check():
    """Simple health-check endpoint."""
    return {"status": "ok", "message": "Emotion-Based Music Recommendation API is running."}


@app.post("/analyze", response_model=EmotionResponse, tags=["emotion"])
def analyze(request: AnalyzeRequest):
    """
    Analyze the facial expression in the provided base64 image.

    Returns the dominant emotion and per-emotion confidence scores.
    """
    try:
        emotion, scores = analyze_emotion(request.image)
    except ValueError as exc:
        raise HTTPException(status_code=422, detail=str(exc)) from exc
    except Exception as exc:
        logger.exception("Unexpected error during emotion analysis")
        raise HTTPException(status_code=500, detail="Internal error during analysis.") from exc

    return EmotionResponse(emotion=emotion, scores=scores)


@app.post("/recommend", response_model=RecommendResponse, tags=["music"])
def recommend(request: RecommendRequest):
    """
    Return music track recommendations for the given emotion.
    """
    emotion = request.emotion.lower()
    if emotion not in EMOTION_GENRE_MAP:
        raise HTTPException(
            status_code=422,
            detail=f"Unknown emotion '{emotion}'. "
                   f"Valid values: {sorted(EMOTION_GENRE_MAP.keys())}",
        )

    tracks = get_recommendations(emotion=emotion, limit=request.limit)
    return RecommendResponse(emotion=emotion, tracks=tracks)


@app.post("/analyze-and-recommend", response_model=FullAnalysisResponse, tags=["emotion", "music"])
def analyze_and_recommend(request: AnalyzeRequest):
    """
    Convenience endpoint: detect emotion from image, then fetch recommendations.
    """
    try:
        emotion, scores = analyze_emotion(request.image)
    except ValueError as exc:
        raise HTTPException(status_code=422, detail=str(exc)) from exc
    except Exception as exc:
        logger.exception("Unexpected error during emotion analysis")
        raise HTTPException(status_code=500, detail="Internal error during analysis.") from exc

    tracks = get_recommendations(emotion=emotion, limit=10)
    return FullAnalysisResponse(emotion=emotion, scores=scores, tracks=tracks)
