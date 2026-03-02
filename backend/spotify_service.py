"""
spotify_service.py
------------------
Maps detected emotions to music genres/moods and fetches track
recommendations from the Spotify Web API via Spotipy.
"""

import logging
import os
from typing import Dict, List, Optional

import spotipy
from spotipy.oauth2 import SpotifyClientCredentials

logger = logging.getLogger(__name__)

# ---------------------------------------------------------------------------
# Emotion → Spotify search parameters
# ---------------------------------------------------------------------------
EMOTION_GENRE_MAP: Dict[str, Dict] = {
    "happy": {
        "genres": ["pop", "dance"],
        "mood_keywords": ["happy", "upbeat", "feel good"],
        "energy": "high",
    },
    "sad": {
        "genres": ["acoustic", "chill", "indie"],
        "mood_keywords": ["sad", "melancholic", "heartbreak"],
        "energy": "low",
    },
    "angry": {
        "genres": ["metal", "rock", "punk"],
        "mood_keywords": ["angry", "intense", "aggressive"],
        "energy": "high",
    },
    "neutral": {
        "genres": ["lo-fi", "ambient", "study"],
        "mood_keywords": ["calm", "focus", "neutral"],
        "energy": "medium",
    },
    "surprise": {
        "genres": ["electronic", "edm", "experimental"],
        "mood_keywords": ["surprise", "energetic", "vibrant"],
        "energy": "high",
    },
    "fear": {
        "genres": ["ambient", "dark", "cinematic"],
        "mood_keywords": ["dark", "atmospheric", "eerie"],
        "energy": "medium",
    },
    "disgust": {
        "genres": ["punk", "alternative", "grunge"],
        "mood_keywords": ["raw", "rebellious", "edgy"],
        "energy": "high",
    },
}

DEFAULT_TRACK_LIMIT = 10


def _get_spotify_client() -> Optional[spotipy.Spotify]:
    """Create and return a Spotipy client using Client Credentials flow.
    Returns None if credentials are not configured."""
    client_id = os.getenv("SPOTIFY_CLIENT_ID", "")
    client_secret = os.getenv("SPOTIFY_CLIENT_SECRET", "")

    if not client_id or not client_secret:
        logger.warning(
            "SPOTIFY_CLIENT_ID and/or SPOTIFY_CLIENT_SECRET are not set. "
            "Returning mock tracks."
        )
        return None

    auth_manager = SpotifyClientCredentials(
        client_id=client_id, client_secret=client_secret
    )
    return spotipy.Spotify(auth_manager=auth_manager)


def _build_mock_tracks(emotion: str, limit: int) -> List[Dict]:
    """Return placeholder tracks when Spotify credentials are not available."""
    params = EMOTION_GENRE_MAP.get(emotion, EMOTION_GENRE_MAP["neutral"])
    genre = params["genres"][0]
    return [
        {
            "id": f"mock_{emotion}_{i}",
            "name": f"{genre.title()} Track {i + 1}",
            "artist": "Demo Artist",
            "album": "Demo Album",
            "album_art": (
                "https://via.placeholder.com/300x300.png?text="
                + genre.replace(" ", "+")
            ),
            "spotify_url": "https://open.spotify.com",
            "preview_url": None,
        }
        for i in range(limit)
    ]


def get_recommendations(emotion: str, limit: int = DEFAULT_TRACK_LIMIT) -> List[Dict]:
    """
    Fetch music recommendations from Spotify based on the detected emotion.

    Parameters
    ----------
    emotion : str
        Detected emotion (e.g. ``"happy"``, ``"sad"``).
    limit : int
        Number of tracks to return (default 10, max 50).

    Returns
    -------
    list of dict
        Each dict contains: ``id``, ``name``, ``artist``, ``album``,
        ``album_art``, ``spotify_url``, ``preview_url``.
    """
    emotion = emotion.lower()
    limit = min(max(1, limit), 50)
    params = EMOTION_GENRE_MAP.get(emotion, EMOTION_GENRE_MAP["neutral"])

    sp = _get_spotify_client()
    if sp is None:
        return _build_mock_tracks(emotion, limit)

    keyword = params["mood_keywords"][0]
    genre = params["genres"][0]
    query = f"{keyword} {genre}"

    try:
        search_results = sp.search(q=query, type="track", limit=limit)
        items = search_results.get("tracks", {}).get("items", [])
    except Exception as exc:
        logger.error("Spotify search failed: %s", exc)
        return _build_mock_tracks(emotion, limit)

    tracks = []
    for item in items:
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
            }
        )

    return tracks
