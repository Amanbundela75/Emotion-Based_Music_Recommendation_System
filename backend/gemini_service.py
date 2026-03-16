"""
gemini_service.py
-----------------
Uses Google Gemini API to understand user incidents and detect emotions
with much higher accuracy than keyword-based analysis.
"""

import json
import logging
import os
from typing import Dict, List, Optional, Tuple

import google.generativeai as genai

logger = logging.getLogger(__name__)

_client_configured = False


def _ensure_configured() -> bool:
    """Configure the Gemini client once. Returns True if ready."""
    global _client_configured
    if _client_configured:
        return True

    api_key = os.getenv("GEMINI_API_KEY", "")
    if not api_key:
        logger.warning("GEMINI_API_KEY is not set. Gemini analysis unavailable.")
        return False

    genai.configure(api_key=api_key)
    _client_configured = True
    return True


def analyze_emotion_with_gemini(
    text: str,
    mood_preference: Optional[str] = None,
) -> Tuple[str, Dict[str, float], List[str], str]:
    """
    Use Gemini to analyse the user's incident text and return:
      - dominant emotion
      - confidence scores for all 7 emotions
      - list of music search queries tailored to the incident
      - a short empathetic / supportive message for the user

    Parameters
    ----------
    text : str
        The user's free-form description of their incident / day.
    mood_preference : str | None
        ``"uplifting"`` or ``"deeper"`` — controls whether Gemini suggests
        feel-good tracks or emotionally resonant ones.  When *None* Gemini
        decides the best direction automatically.

    Returns
    -------
    (dominant_emotion, scores, music_queries, message)

    Raises
    ------
    RuntimeError  if Gemini API is not configured or the call fails.
    """
    if not _ensure_configured():
        raise RuntimeError("Gemini API key is not configured.")

    preference_instruction = ""
    if mood_preference == "uplifting":
        preference_instruction = (
            "The user wants MOOD UPLIFTING music. Suggest cheerful, motivational, "
            "feel-good songs that will lift their spirits regardless of the emotion "
            "detected. The search queries should reflect positive, upbeat music."
        )
    elif mood_preference == "deeper":
        preference_instruction = (
            "The user wants to DEEPLY FEEL their emotion. Suggest songs that "
            "resonate with and amplify the detected emotion — e.g. melancholic "
            "songs for sadness, intense songs for anger, etc. The search queries "
            "should reflect the raw emotional tone."
        )

    prompt = f"""You are an empathetic emotion analysis and music recommendation expert.

Analyze the following user incident/story and:
1. Detect the PRIMARY emotion from these 7 options ONLY: happy, sad, angry, neutral, surprise, fear, disgust
2. Provide confidence scores (0-100) for ALL 7 emotions that sum to 100
3. Write a short, warm, empathetic message (2-3 sentences) that acknowledges the user's feelings, offers supportive advice, and explains why you are recommending the music below
4. Generate 5 specific music search queries that would find the BEST songs for this person's situation

{preference_instruction}

User's incident:
\"\"\"{text}\"\"\"

IMPORTANT: You MUST respond with valid JSON only, no markdown, no extra text.
Use this exact structure:
{{
  "emotion": "sad",
  "scores": {{
    "happy": 5,
    "sad": 60,
    "angry": 10,
    "neutral": 5,
    "surprise": 5,
    "fear": 10,
    "disgust": 5
  }},
  "message": "It sounds like you're going through a tough time. Remember, it's okay to feel this way. Here's some music to help you process your emotions and find comfort.",
  "music_queries": [
    "healing heartbreak songs",
    "songs about moving on",
    "emotional acoustic ballads",
    "comforting sad songs",
    "songs for when you feel lost"
  ]
}}"""

    try:
        model = genai.GenerativeModel("gemini-2.0-flash")
        response = model.generate_content(prompt)
        raw = response.text.strip()

        # Strip markdown code fences if present
        if raw.startswith("```"):
            raw = raw.split("\n", 1)[1] if "\n" in raw else raw[3:]
        if raw.endswith("```"):
            raw = raw[:-3]
        raw = raw.strip()

        data = json.loads(raw)

        emotion = data.get("emotion", "neutral").lower()
        valid_emotions = {"happy", "sad", "angry", "neutral", "surprise", "fear", "disgust"}
        if emotion not in valid_emotions:
            emotion = "neutral"

        scores = {}
        raw_scores = data.get("scores", {})
        for e in valid_emotions:
            scores[e] = float(raw_scores.get(e, 0))

        total = sum(scores.values())
        if total > 0:
            scores = {k: round((v / total) * 100, 1) for k, v in scores.items()}
        else:
            scores = {e: 0.0 for e in valid_emotions}
            scores["neutral"] = 100.0

        music_queries = data.get("music_queries", [])
        if not isinstance(music_queries, list):
            music_queries = []

        message = data.get("message", "")
        if not isinstance(message, str):
            message = ""

        return emotion, scores, music_queries, message

    except json.JSONDecodeError as exc:
        logger.error("Gemini returned invalid JSON: %s", exc)
        raise RuntimeError("Failed to parse Gemini response.") from exc
    except Exception as exc:
        logger.error("Gemini API call failed: %s", exc)
        raise RuntimeError(f"Gemini API error: {exc}") from exc


_CHAT_SYSTEM_PROMPT = (
    "You are an empathetic AI companion and mental wellness assistant. "
    "Your role is to:\n"
    "1. Listen carefully to users' problems and incidents.\n"
    "2. Provide emotional support and practical, actionable solutions.\n"
    "3. Suggest coping strategies and concrete next steps.\n"
    "4. Be warm, understanding, and non-judgmental.\n"
    "5. Help users feel heard and supported.\n\n"
    "Keep responses warm and concise (3-5 sentences). "
    "Always acknowledge the user's feelings first, then offer practical advice."
)


def chat_with_gemini(messages: List[dict]) -> str:
    """
    Multi-turn empathetic chat powered by Gemini.

    Parameters
    ----------
    messages : list of dict
        Conversation history.  Each entry must have ``"role"``
        (``"user"`` or ``"assistant"``) and ``"content"`` keys.
        The last entry is the new user message.

    Returns
    -------
    str
        Gemini's reply text.

    Raises
    ------
    RuntimeError
        If the Gemini API is not configured or the call fails.
    """
    if not _ensure_configured():
        raise RuntimeError("Gemini API key is not configured.")

    if not messages:
        raise ValueError("messages list must not be empty.")

    try:
        model = genai.GenerativeModel(
            "gemini-2.0-flash",
            system_instruction=_CHAT_SYSTEM_PROMPT,
        )

        # Build history for multi-turn chat (all messages except the last).
        history = []
        for msg in messages[:-1]:
            role = "user" if msg["role"] == "user" else "model"
            history.append({"role": role, "parts": [msg["content"]]})

        chat_session = model.start_chat(history=history)
        response = chat_session.send_message(messages[-1]["content"])
        return response.text.strip()

    except Exception as exc:
        logger.error("Gemini chat failed: %s", exc)
        raise RuntimeError(f"Gemini chat error: {exc}") from exc
