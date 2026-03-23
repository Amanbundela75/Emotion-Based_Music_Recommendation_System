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
POST /analyze-text — text emotion analysis (Gemini first, keyword fallback)
POST /analyze-text-gemini — Gemini-powered analysis with mood preference
"""

import logging
import os
from typing import Dict, List, Optional

from dotenv import load_dotenv
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field

from emotion_detector import analyze_emotion
from gemini_service import analyze_emotion_with_gemini, chat_with_gemini
from spotify_service import EMOTION_GENRE_MAP, get_recommendations
from text_emotion_analyzer import analyze_text_emotion

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
        "via the Spotify Web API. Uses Google Gemini for accurate text analysis."
    ),
    version="2.0.0",
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
    spotify_url: Optional[str] = None
    preview_url: Optional[str]
    youtube_url: Optional[str] = None


class AnalyzeTextRequest(BaseModel):
    text: str = Field(
        ...,
        description="Free-form text describing the user's day or incident.",
    )


class AnalyzeTextGeminiRequest(BaseModel):
    text: str = Field(
        ...,
        description="Free-form text describing the user's day or incident.",
    )
    mood_preference: Optional[str] = Field(
        None,
        description="'uplifting' for mood-boosting music, 'deeper' for emotionally resonant music.",
    )


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
    message: Optional[str] = None


class GeminiAnalysisResponse(BaseModel):
    emotion: str
    scores: Dict[str, float]
    tracks: List[TrackItem]
    message: Optional[str] = None
    gemini_powered: bool = True


class ChatMessage(BaseModel):
    role: str = Field(..., description="'user' or 'assistant'")
    content: str = Field(..., description="Message text.")


class ChatRequest(BaseModel):
    messages: List[ChatMessage] = Field(
        ..., description="Full conversation history, ending with the new user message."
    )


class ChatResponse(BaseModel):
    reply: str


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


@app.post("/analyze-text", response_model=FullAnalysisResponse, tags=["emotion", "music"])
def analyze_text(request: AnalyzeTextRequest):
    """
    Analyze emotion from a text description of the user's day/incident.

    Tries Gemini API first for accurate contextual analysis, then falls
    back to the keyword-based analyser if Gemini is unavailable.
    """
    # Try Gemini first
    try:
        emotion, scores, music_queries, message = analyze_emotion_with_gemini(request.text)
        tracks = _get_tracks_from_queries(music_queries, emotion)
        return FullAnalysisResponse(emotion=emotion, scores=scores, tracks=tracks, message=message)
    except RuntimeError:
        logger.info("Gemini unavailable, falling back to keyword analysis")
    except Exception:
        logger.exception("Gemini analysis failed, falling back to keyword analysis")

    # Fallback to keyword-based
    try:
        emotion, scores = analyze_text_emotion(request.text)
    except ValueError as exc:
        raise HTTPException(status_code=422, detail=str(exc)) from exc
    except Exception as exc:
        logger.exception("Unexpected error during text emotion analysis")
        raise HTTPException(
            status_code=500, detail="Internal error during text analysis."
        ) from exc

    tracks = get_recommendations(emotion=emotion, limit=10)
    return FullAnalysisResponse(emotion=emotion, scores=scores, tracks=tracks)


@app.post(
    "/analyze-text-gemini",
    response_model=GeminiAnalysisResponse,
    tags=["emotion", "music"],
)
def analyze_text_gemini(request: AnalyzeTextGeminiRequest):
    """
    Gemini-powered text analysis with optional mood preference.

    After the user shares their incident, the frontend should call this
    endpoint with ``mood_preference`` set to either ``"uplifting"`` (mood-
    boosting tracks) or ``"deeper"`` (emotionally resonant tracks) to get
    personalised music recommendations.
    """
    if request.mood_preference and request.mood_preference not in ("uplifting", "deeper"):
        raise HTTPException(
            status_code=422,
            detail="mood_preference must be 'uplifting' or 'deeper'.",
        )

    try:
        emotion, scores, music_queries, message = analyze_emotion_with_gemini(
            request.text, mood_preference=request.mood_preference
        )
    except RuntimeError as exc:
        raise HTTPException(status_code=503, detail=str(exc)) from exc
    except Exception as exc:
        logger.exception("Gemini analysis failed")
        raise HTTPException(
            status_code=500, detail="Internal error during Gemini analysis."
        ) from exc

    tracks = _get_tracks_from_queries(music_queries, emotion)
    return GeminiAnalysisResponse(
        emotion=emotion, scores=scores, tracks=tracks, message=message, gemini_powered=True
    )


@app.post("/chat", response_model=ChatResponse, tags=["chat"])
def chat(request: ChatRequest):
    """
    Multi-turn empathetic chatbot powered by Gemini.

    Accepts the full conversation history (user + assistant turns) ending
    with the latest user message, and returns Gemini's reply.
    """
    if not request.messages:
        raise HTTPException(status_code=422, detail="messages list must not be empty.")

    last_role = request.messages[-1].role
    if last_role != "user":
        raise HTTPException(
            status_code=422, detail="The last message must have role='user'."
        )

    messages = [{"role": m.role, "content": m.content} for m in request.messages]

    try:
        reply = chat_with_gemini(messages)
        return ChatResponse(reply=reply)
    except RuntimeError as exc:
        logger.info("Gemini chat unavailable, using fallback response: %s", exc)
        reply = _offline_chat_reply(messages)
        return ChatResponse(reply=reply)
    except Exception as exc:
        logger.exception("Chat endpoint failed")
        raise HTTPException(status_code=500, detail="Internal error during chat.") from exc


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------


def _get_tracks_from_queries(
    music_queries: List[str], emotion: str, limit: int = 10
) -> List[dict]:
    """
    Try to fetch tracks using the Gemini-suggested search queries.

    Priority:
    1. Spotify (if credentials configured)
    2. YouTube via youtubesearchpython (no credentials needed)
    3. YouTube Music search URL fallback
    """
    from spotify_service import _get_spotify_client, _build_mock_tracks
    from youtube_service import get_youtube_tracks

    sp = _get_spotify_client()
    if sp is None:
        # No Spotify – use YouTube as the real music source
        return get_youtube_tracks(music_queries, emotion, limit)

    if not music_queries:
        return get_recommendations(emotion=emotion, limit=limit)

    tracks: List[dict] = []
    seen_ids: set = set()
    per_query = max(1, limit // len(music_queries))

    for query in music_queries:
        if len(tracks) >= limit:
            break
        try:
            results = sp.search(q=query, type="track", limit=per_query + 2)
            for item in results.get("tracks", {}).get("items", []):
                if item["id"] in seen_ids:
                    continue
                seen_ids.add(item["id"])
                album_images = item.get("album", {}).get("images", [])
                album_art = album_images[0]["url"] if album_images else None
                artists = ", ".join(a["name"] for a in item.get("artists", []))
                tracks.append(
                    {
                        "id": item["id"],
                        "name": item["name"],
                        "artist": artists,
                        "album": item.get("album", {}).get("name", ""),
                        "album_art": album_art,
                        "spotify_url": item.get("external_urls", {}).get("spotify", ""),
                        "preview_url": item.get("preview_url"),
                        "youtube_url": None,
                    }
                )
                if len(tracks) >= limit:
                    break
        except Exception as exc:
            logger.warning("Spotify search for query '%s' failed: %s", query, exc)
            continue

    # If Gemini queries yielded nothing, fall back to standard recommendations
    if not tracks:
        return get_recommendations(emotion=emotion, limit=limit)

    return tracks[:limit]


DEFAULT_OFFLINE_REPLY = (
    "I'm here with you. Share more if you'd like, and I'll do my best to help."
)

OFFLINE_PROMPTS = {
    "happy": "It sounds like you're feeling upbeat! Savor the good moments; some joyful music can make it even better.",
    "sad": "I'm sorry you're going through a tough time. Be gentle with yourself—taking a short break or listening to comforting music can help you process what you're feeling.",
    "angry": "I hear your frustration. Try a few deep breaths or a quick walk to release that tension; music can also help channel that energy constructively.",
    "fear": "Feeling worried is natural. Ground yourself with slow breaths and focus on what you can control right now. I'm here to listen.",
    "disgust": "That situation sounds unpleasant. Setting a boundary or stepping away for a bit might help. You've got this.",
    "surprise": "That was unexpected! Take a moment to process it—it's okay to feel a mix of emotions.",
    "neutral": "Thanks for sharing. I'm here if you want to talk more or explore some music to match your mood.",
}


def _offline_chat_reply(messages: List[dict]) -> str:
    """
    Lightweight, non-Gemini fallback reply for the chat endpoint.
    Uses the keyword-based text emotion analyser to craft a warm response so
    the chat feature keeps working even without Gemini credentials.

    Parameters
    ----------
    messages : List[dict]
        Conversation history from the chat endpoint. Each dictionary should
        include at least a ``content`` string (the user's message) and may
        include a ``role`` field (e.g., ``user`` or ``assistant``). Only the
        ``content`` from the most recent message is used for emotion analysis
        in this fallback path.
    """
    if not messages:
        return DEFAULT_OFFLINE_REPLY

    latest = messages[-1].get("content", "")
    try:
        emotion, _ = analyze_text_emotion(latest)
    except Exception:
        emotion = "neutral"

    return OFFLINE_PROMPTS.get(emotion, DEFAULT_OFFLINE_REPLY)
