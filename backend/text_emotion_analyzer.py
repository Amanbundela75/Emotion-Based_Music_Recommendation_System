"""
text_emotion_analyzer.py
------------------------
Detects emotion from a text description of the user's day/incident
using keyword-based sentiment analysis.
"""

import re
from typing import Dict, Tuple

# Emotion keyword mappings – each emotion has a list of words/phrases
# that strongly correlate with it.
EMOTION_KEYWORDS: Dict[str, list] = {
    "happy": [
        "happy", "great", "amazing", "wonderful", "celebration", "birthday",
        "promotion", "good", "excited", "fun", "joy", "joyful", "love",
        "success", "win", "won", "achieved", "awesome", "fantastic",
        "blessed", "grateful", "party", "enjoy", "enjoyed", "cheerful",
        "delighted", "thrilled", "proud", "accomplish", "married",
        "engaged", "graduated", "passed", "smile", "laughed", "laugh",
    ],
    "sad": [
        "sad", "depressed", "lost", "died", "death", "miss", "missing",
        "lonely", "cry", "crying", "cried", "heartbreak", "broke up",
        "breakup", "divorce", "alone", "grief", "unfortunate", "terrible",
        "worst", "disappointing", "disappointed", "failed", "failure",
        "hopeless", "pain", "painful", "unhappy", "regret", "sorrow",
        "mourning", "funeral",
    ],
    "angry": [
        "angry", "mad", "furious", "annoyed", "frustrated", "irritated",
        "hate", "fight", "fought", "argument", "unfair", "cheated",
        "betrayed", "lied", "disrespected", "rude", "insult", "insulted",
        "rage", "pissed", "outraged", "hostile", "aggressive", "yelled",
        "shouted", "conflict", "revenge",
    ],
    "surprise": [
        "surprise", "surprised", "unexpected", "shocking", "shocked",
        "wow", "unbelievable", "sudden", "suddenly", "astonished",
        "amazed", "speechless", "plot twist", "out of nowhere",
        "didn't expect", "never expected", "can't believe",
    ],
    "fear": [
        "scared", "afraid", "worried", "anxious", "nervous", "terrified",
        "panic", "panicked", "stress", "stressed", "fear", "fearful",
        "nightmare", "dangerous", "threat", "threatened", "uncertain",
        "dread", "horror", "creepy", "phobia", "trembling", "shaking",
        "accident", "hospital",
    ],
    "disgust": [
        "disgusting", "disgusted", "gross", "vile", "sick", "nasty",
        "repulsive", "awful", "horrible", "revolting", "yuck",
        "nauseating", "sickening", "appalling", "dreadful", "repelled",
        "toxic", "corrupt", "filthy",
    ],
    "neutral": [
        "okay", "fine", "normal", "nothing special", "regular", "routine",
        "usual", "same", "boring", "uneventful", "ordinary", "average",
        "meh", "so-so", "alright", "nothing much", "not bad",
    ],
}


def analyze_text_emotion(text: str) -> Tuple[str, Dict[str, float]]:
    """
    Analyze the emotional tone of a text description.

    Parameters
    ----------
    text : str
        Free-form text describing the user's day or incident.

    Returns
    -------
    dominant_emotion : str
        The emotion with the highest match score.
    emotion_scores : dict
        Mapping of emotion label → confidence score (0–100).
    """
    if not text or not text.strip():
        raise ValueError("Text cannot be empty.")

    text_lower = text.lower()
    raw_scores: Dict[str, int] = {emotion: 0 for emotion in EMOTION_KEYWORDS}

    for emotion, keywords in EMOTION_KEYWORDS.items():
        for keyword in keywords:
            # Use word boundary matching for single words, substring for phrases
            if " " in keyword:
                count = text_lower.count(keyword)
            else:
                count = len(re.findall(rf"\b{re.escape(keyword)}\b", text_lower))
            raw_scores[emotion] += count

    total = sum(raw_scores.values())

    if total == 0:
        # Default to neutral when no keywords matched
        emotion_scores = {e: 0.0 for e in EMOTION_KEYWORDS}
        emotion_scores["neutral"] = 100.0
        return "neutral", emotion_scores

    # Normalize to percentages
    emotion_scores = {
        emotion: round((score / total) * 100, 1)
        for emotion, score in raw_scores.items()
    }

    dominant_emotion = max(emotion_scores, key=lambda k: emotion_scores[k])
    return dominant_emotion, emotion_scores
