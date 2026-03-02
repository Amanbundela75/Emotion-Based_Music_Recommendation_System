const EMOTION_META = {
  happy: { emoji: "😄", label: "Happy", color: "text-yellow-400", bg: "bg-yellow-900/30" },
  sad: { emoji: "😢", label: "Sad", color: "text-blue-400", bg: "bg-blue-900/30" },
  angry: { emoji: "😠", label: "Angry", color: "text-red-400", bg: "bg-red-900/30" },
  neutral: { emoji: "😐", label: "Neutral", color: "text-gray-300", bg: "bg-gray-800/40" },
  surprise: { emoji: "😲", label: "Surprised", color: "text-pink-400", bg: "bg-pink-900/30" },
  fear: { emoji: "😨", label: "Fearful", color: "text-indigo-400", bg: "bg-indigo-900/30" },
  disgust: { emoji: "🤢", label: "Disgusted", color: "text-green-400", bg: "bg-green-900/30" },
};

/**
 * EmotionDisplay – shows the detected emotion with an emoji and confidence bars.
 *
 * Props:
 *  - emotion: string
 *  - scores: { [emotionKey]: number }
 */
export default function EmotionDisplay({ emotion, scores }) {
  const meta = EMOTION_META[emotion] ?? {
    emoji: "🎭",
    label: emotion,
    color: "text-purple-400",
    bg: "bg-purple-900/30",
  };

  const sortedScores = Object.entries(scores).sort(([, a], [, b]) => b - a);

  return (
    <div className={`card ${meta.bg} border border-white/10`}>
      {/* Primary emotion */}
      <div className="flex items-center gap-4 mb-5">
        <span className="text-7xl">{meta.emoji}</span>
        <div>
          <p className="text-sm text-gray-400 uppercase tracking-widest mb-1">
            Detected Emotion
          </p>
          <h2 className={`text-4xl font-bold ${meta.color}`}>{meta.label}</h2>
        </div>
      </div>

      {/* Confidence bars */}
      <div className="space-y-2">
        {sortedScores.map(([key, value]) => {
          const m = EMOTION_META[key] ?? { emoji: "🎭", color: "text-purple-400" };
          const pct = Math.round(value);
          return (
            <div key={key} className="flex items-center gap-2 text-sm">
              <span className="w-6 text-center">{m.emoji}</span>
              <span className="w-20 capitalize text-gray-300">{key}</span>
              <div className="flex-1 bg-dark-900 rounded-full h-2 overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all duration-700 ${
                    key === emotion ? "bg-purple-500" : "bg-gray-600"
                  }`}
                  style={{ width: `${pct}%` }}
                />
              </div>
              <span className="w-10 text-right text-gray-400">{pct}%</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
