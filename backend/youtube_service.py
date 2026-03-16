"""
youtube_service.py
------------------
Provides YouTube Music search as a fallback when Spotify credentials
are not available. Uses youtubesearchpython (no API key required).
"""

import logging
from typing import Dict, List
from urllib.parse import quote_plus

logger = logging.getLogger(__name__)


def get_youtube_tracks(queries: List[str], emotion: str, limit: int = 10) -> List[Dict]:
    """
    Search YouTube for music tracks based on Gemini-suggested queries.

    Parameters
    ----------
    queries : list of str
        Music search queries (e.g. ``["healing heartbreak songs", ...]``).
    emotion : str
        Detected emotion (used for fallback search if queries are empty).
    limit : int
        Maximum number of tracks to return.

    Returns
    -------
    list of dict
        Each dict contains: ``id``, ``name``, ``artist``, ``album``,
        ``album_art``, ``spotify_url``, ``preview_url``, ``youtube_url``.
    """
    if not queries:
        queries = [f"{emotion} music", f"songs for {emotion} mood"]

    try:
        from youtubesearchpython import VideosSearch  # type: ignore

        tracks: List[Dict] = []
        seen_ids: set = set()
        per_query = max(1, limit // len(queries))

        for query in queries:
            if len(tracks) >= limit:
                break
            try:
                search = VideosSearch(query + " music", limit=per_query + 2)
                results = search.result()
                for video in results.get("result", []):
                    vid_id = video.get("id", "")
                    if not vid_id or vid_id in seen_ids:
                        continue
                    seen_ids.add(vid_id)

                    thumbnails = video.get("thumbnails", [])
                    thumb = thumbnails[0]["url"] if thumbnails else None
                    channel = video.get("channel", {}).get("name", "")

                    tracks.append(
                        {
                            "id": vid_id,
                            "name": video.get("title", "Unknown"),
                            "artist": channel,
                            "album": "",
                            "album_art": thumb,
                            "spotify_url": "",
                            "preview_url": None,
                            "youtube_url": f"https://www.youtube.com/watch?v={vid_id}",
                        }
                    )
                    if len(tracks) >= limit:
                        break
            except Exception as exc:
                logger.warning("YouTube search for '%s' failed: %s", query, exc)
                continue

        if tracks:
            return tracks[:limit]

    except ImportError:
        logger.warning(
            "youtubesearchpython not installed. Falling back to YouTube search URLs."
        )

    # Final fallback: YouTube Music search URL links
    return _build_youtube_search_tracks(queries, limit)


def _build_youtube_search_tracks(queries: List[str], limit: int) -> List[Dict]:
    """
    Build YouTube Music search-URL tracks when direct search isn't available.
    Each track opens a YouTube Music search results page for the query.
    """
    tracks: List[Dict] = []
    for i, query in enumerate(queries):
        if len(tracks) >= limit:
            break
        search_url = f"https://music.youtube.com/search?q={quote_plus(query)}"
        tracks.append(
            {
                "id": f"yt_search_{i}",
                "name": query.title(),
                "artist": "Search on YouTube Music →",
                "album": "",
                "album_art": (
                    "https://www.gstatic.com/youtube/img/branding/"
                    "youtubelogo/svg/youtubelogo.svg"
                ),
                "spotify_url": "",
                "preview_url": None,
                "youtube_url": search_url,
            }
        )
    return tracks[:limit]
