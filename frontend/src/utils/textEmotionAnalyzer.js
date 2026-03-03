/**
 * textEmotionAnalyzer.js
 * ----------------------
 * Client-side keyword-based emotion detection from text.
 * Used as a fallback when no backend is available (e.g. GitHub Pages).
 */

const EMOTION_KEYWORDS = {
  happy: [
    "happy", "great", "amazing", "wonderful", "celebration", "birthday",
    "promotion", "good", "excited", "fun", "joy", "joyful", "love",
    "success", "win", "won", "achieved", "awesome", "fantastic",
    "blessed", "grateful", "party", "enjoy", "enjoyed", "cheerful",
    "delighted", "thrilled", "proud", "accomplish", "married",
    "engaged", "graduated", "passed", "smile", "laughed", "laugh",
  ],
  sad: [
    "sad", "depressed", "lost", "died", "death", "miss", "missing",
    "lonely", "cry", "crying", "cried", "heartbreak", "broke up",
    "breakup", "divorce", "alone", "grief", "unfortunate", "terrible",
    "worst", "disappointing", "disappointed", "failed", "failure",
    "hopeless", "pain", "painful", "unhappy", "regret", "sorrow",
    "mourning", "funeral",
  ],
  angry: [
    "angry", "mad", "furious", "annoyed", "frustrated", "irritated",
    "hate", "fight", "fought", "argument", "unfair", "cheated",
    "betrayed", "lied", "disrespected", "rude", "insult", "insulted",
    "rage", "pissed", "outraged", "hostile", "aggressive", "yelled",
    "shouted", "conflict", "revenge",
  ],
  surprise: [
    "surprise", "surprised", "unexpected", "shocking", "shocked",
    "wow", "unbelievable", "sudden", "suddenly", "astonished",
    "amazed", "speechless", "plot twist", "out of nowhere",
    "didn't expect", "never expected", "can't believe",
  ],
  fear: [
    "scared", "afraid", "worried", "anxious", "nervous", "terrified",
    "panic", "panicked", "stress", "stressed", "fear", "fearful",
    "nightmare", "dangerous", "threat", "threatened", "uncertain",
    "dread", "horror", "creepy", "phobia", "trembling", "shaking",
    "accident", "hospital",
  ],
  disgust: [
    "disgusting", "disgusted", "gross", "vile", "sick", "nasty",
    "repulsive", "awful", "horrible", "revolting", "yuck",
    "nauseating", "sickening", "appalling", "dreadful", "repelled",
    "toxic", "corrupt", "filthy",
  ],
  neutral: [
    "okay", "fine", "normal", "nothing special", "regular", "routine",
    "usual", "same", "boring", "uneventful", "ordinary", "average",
    "meh", "so-so", "alright", "nothing much", "not bad",
  ],
};

/**
 * Analyze text and detect the dominant emotion.
 * @param {string} text - User's text describing their day/incident
 * @returns {{ emotion: string, scores: Object<string, number> }}
 */
export function analyzeTextEmotion(text) {
  if (!text || !text.trim()) {
    throw new Error("Text cannot be empty.");
  }

  const textLower = text.toLowerCase();
  const rawScores = {};

  for (const emotion of Object.keys(EMOTION_KEYWORDS)) {
    rawScores[emotion] = 0;
  }

  for (const [emotion, keywords] of Object.entries(EMOTION_KEYWORDS)) {
    for (const keyword of keywords) {
      if (keyword.includes(" ")) {
        // Phrase: count substring occurrences
        let idx = 0;
        while ((idx = textLower.indexOf(keyword, idx)) !== -1) {
          rawScores[emotion]++;
          idx += keyword.length;
        }
      } else {
        // Single word: use word-boundary regex
        const regex = new RegExp(`\\b${keyword}\\b`, "gi");
        const matches = textLower.match(regex);
        if (matches) rawScores[emotion] += matches.length;
      }
    }
  }

  const total = Object.values(rawScores).reduce((a, b) => a + b, 0);

  if (total === 0) {
    const scores = {};
    for (const emotion of Object.keys(EMOTION_KEYWORDS)) {
      scores[emotion] = 0;
    }
    scores.neutral = 100;
    return { emotion: "neutral", scores };
  }

  const scores = {};
  for (const [emotion, score] of Object.entries(rawScores)) {
    scores[emotion] = Math.round((score / total) * 1000) / 10;
  }

  const dominant = Object.entries(scores).sort(([, a], [, b]) => b - a)[0][0];
  return { emotion: dominant, scores };
}
