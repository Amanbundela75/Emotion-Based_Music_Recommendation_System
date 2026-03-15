import { useState, useCallback, useRef } from "react";
import WebcamCapture from "./components/WebcamCapture";
import EmotionDisplay from "./components/EmotionDisplay";
import MusicGrid from "./components/MusicGrid";
import TextVoiceInput from "./components/TextVoiceInput";
import MoodSelector from "./components/MoodSelector";
import { analyzeAndRecommend, analyzeText, analyzeTextWithGemini, getRecommendations } from "./api/emotionApi";
import { analyzeTextEmotion } from "./utils/textEmotionAnalyzer";

const AUTO_DETECT_INTERVAL_MS = 5000;

const EMOTION_GENRES = {
  happy: "Pop",
  sad: "Acoustic",
  angry: "Rock",
  neutral: "Lo-fi",
  surprise: "Electronic",
  fear: "Ambient",
  disgust: "Punk",
};

function buildMockTracks(emotion, count = 10) {
  const genre = EMOTION_GENRES[emotion] || "Lo-fi";
  return Array.from({ length: count }, (_, i) => ({
    id: `mock_${emotion}_${i}`,
    name: `${genre} Track ${i + 1}`,
    artist: "Demo Artist",
    album: "Demo Album",
    album_art: `https://via.placeholder.com/300x300.png?text=${encodeURIComponent(genre)}`,
    spotify_url: "https://open.spotify.com",
    preview_url: null,
  }));
}

export default function App() {
  const [mode, setMode] = useState(null); // null | "camera" | "text"
  const [showCamera, setShowCamera] = useState(false);
  const [isDetecting, setIsDetecting] = useState(false);
  const [isAutoDetect, setIsAutoDetect] = useState(false);
  const [emotion, setEmotion] = useState(null);
  const [scores, setScores] = useState(null);
  const [tracks, setTracks] = useState([]);
  const [error, setError] = useState(null);
  const [userText, setUserText] = useState("");           // Store the user's incident text
  const [showMoodSelector, setShowMoodSelector] = useState(false); // Show mood preference
  const [isMoodLoading, setIsMoodLoading] = useState(false);
  const [geminiPowered, setGeminiPowered] = useState(false);
  const autoTimerRef = useRef(null);
  const lastImageRef = useRef(null);

  const handleCapture = useCallback(async (imageSrc) => {
    lastImageRef.current = imageSrc;
    setIsDetecting(true);
    setError(null);
    try {
      const data = await analyzeAndRecommend(imageSrc);
      setEmotion(data.emotion);
      setScores(data.scores);
      setTracks(data.tracks);
    } catch (err) {
      const detail =
        err.response?.data?.detail ?? err.message ?? "Unknown error";
      setError(`Detection failed: ${detail}`);
    } finally {
      setIsDetecting(false);
    }
  }, []);

  const toggleAutoDetect = () => {
    if (isAutoDetect) {
      clearInterval(autoTimerRef.current);
      setIsAutoDetect(false);
    } else {
      setIsAutoDetect(true);
      autoTimerRef.current = setInterval(() => {
        if (lastImageRef.current) handleCapture(lastImageRef.current);
      }, AUTO_DETECT_INTERVAL_MS);
    }
  };

  const handleTextSubmit = useCallback(async (text) => {
    setIsDetecting(true);
    setError(null);
    setUserText(text);
    setShowMoodSelector(false);
    setTracks([]);
    setGeminiPowered(false);
    try {
      // Try backend first, fall back to client-side analysis
      let data;
      try {
        data = await analyzeText(text);
        setGeminiPowered(!!data.gemini_powered);
      } catch {
        // Backend unavailable – use client-side analysis + mock recommendations
        const result = analyzeTextEmotion(text);
        let recData;
        try {
          recData = await getRecommendations(result.emotion);
        } catch {
          // Build mock tracks client-side when backend is fully unavailable
          recData = { tracks: buildMockTracks(result.emotion) };
        }
        data = { emotion: result.emotion, scores: result.scores, tracks: recData.tracks };
      }
      setEmotion(data.emotion);
      setScores(data.scores);
      setTracks(data.tracks);
      // Show mood selector so user can choose uplifting vs deeper
      setShowMoodSelector(true);
    } catch (err) {
      const detail = err.response?.data?.detail ?? err.message ?? "Unknown error";
      setError(`Analysis failed: ${detail}`);
    } finally {
      setIsDetecting(false);
    }
  }, []);

  const handleMoodSelect = useCallback(async (preference) => {
    if (!userText) return;
    setIsMoodLoading(true);
    setError(null);
    try {
      // Try Gemini-powered analysis with mood preference
      let data;
      try {
        data = await analyzeTextWithGemini(userText, preference);
        setGeminiPowered(true);
      } catch {
        // Fallback: use the existing emotion to get recommendations
        const emotionForRec = preference === "uplifting" ? "happy" : (emotion || "neutral");
        let recData;
        try {
          recData = await getRecommendations(emotionForRec);
        } catch {
          recData = { tracks: buildMockTracks(emotionForRec) };
        }
        data = { emotion: emotion || "neutral", scores: scores || {}, tracks: recData.tracks };
      }
      setEmotion(data.emotion);
      if (data.scores && Object.keys(data.scores).length > 0) {
        setScores(data.scores);
      }
      setTracks(data.tracks);
    } catch (err) {
      const detail = err.response?.data?.detail ?? err.message ?? "Unknown error";
      setError(`Failed to get recommendations: ${detail}`);
    } finally {
      setIsMoodLoading(false);
    }
  }, [userText, emotion, scores]);

  return (
    <div className="min-h-screen bg-dark-900 text-white">
      {/* Header */}
      <header className="bg-dark-800 border-b border-white/10 px-6 py-4 flex items-center gap-3">
        <span className="text-2xl">🎵</span>
        <h1 className="text-xl font-bold bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent">
          Emotion Music
        </h1>
        <span className="ml-auto text-xs text-gray-500">
          Powered by Gemini AI + Spotify
        </span>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-8 space-y-8">
        {/* Hero */}
        {!mode && !emotion && (
          <section className="text-center py-16 space-y-6">
            <div className="text-8xl mb-4">🎭</div>
            <h2 className="text-5xl font-extrabold bg-gradient-to-r from-purple-400 via-pink-400 to-yellow-400 bg-clip-text text-transparent">
              Feel the Music
            </h2>
            <p className="text-gray-400 max-w-md mx-auto text-lg">
              Share your story or show your face — our AI understands your
              emotions and finds the perfect tracks for you.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <button
                className="btn-primary text-lg px-10 py-4"
                onClick={() => { setMode("camera"); setShowCamera(true); }}
              >
                🎥 Use Camera
              </button>
              <button
                className="btn-primary text-lg px-10 py-4"
                onClick={() => setMode("text")}
              >
                📝 Share Your Story
              </button>
            </div>
          </section>
        )}

        {/* Text/Voice input section */}
        {mode === "text" && (
          <section className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold text-gray-300">
                📝 Share What Happened
              </h3>
              <button
                className="btn-secondary text-sm"
                onClick={() => {
                  setMode(null);
                  setEmotion(null);
                  setTracks([]);
                  setScores(null);
                  setShowMoodSelector(false);
                  setUserText("");
                  setGeminiPowered(false);
                }}
              >
                ← Back
              </button>
            </div>
            <TextVoiceInput
              onSubmit={handleTextSubmit}
              isProcessing={isDetecting}
            />
            {/* Emotion result for text mode */}
            {!isDetecting && emotion && scores && (
              <div className="mt-4 space-y-4">
                <div className="flex items-center gap-2">
                  <h3 className="text-lg font-semibold text-gray-300">
                    🎭 Detected Mood
                  </h3>
                  {geminiPowered && (
                    <span className="text-xs bg-emerald-900/40 border border-emerald-700 text-emerald-300 px-2 py-0.5 rounded-full">
                      ✨ AI Powered
                    </span>
                  )}
                </div>
                <EmotionDisplay emotion={emotion} scores={scores} />
              </div>
            )}

            {/* Mood selector – appears after emotion detection */}
            {!isDetecting && emotion && showMoodSelector && (
              <div className="mt-4">
                <MoodSelector
                  onSelect={handleMoodSelect}
                  isLoading={isMoodLoading}
                />
              </div>
            )}
          </section>
        )}

        {/* Camera section */}
        {showCamera && (
          <section className="flex flex-col lg:flex-row gap-8 items-start">
            <div className="flex-1 min-w-0">
              <h3 className="text-lg font-semibold mb-4 text-gray-300">
                📷 Live Camera Feed
              </h3>
              <WebcamCapture
                onCapture={handleCapture}
                isDetecting={isDetecting}
              />

              {/* Controls */}
              <div className="mt-4 flex flex-wrap gap-3">
                <button
                  className={`btn-secondary text-sm ${
                    isAutoDetect ? "ring-2 ring-purple-500" : ""
                  }`}
                  onClick={toggleAutoDetect}
                  disabled={isDetecting}
                >
                  {isAutoDetect ? "⏹ Stop Auto" : "🔄 Auto-detect (5s)"}
                </button>
                <button
                  className="btn-secondary text-sm"
                  onClick={() => {
                    clearInterval(autoTimerRef.current);
                    setIsAutoDetect(false);
                    setShowCamera(false);
                    setMode(null);
                    setEmotion(null);
                    setTracks([]);
                  }}
                >
                  ✕ Close Camera
                </button>
              </div>
            </div>

            {/* Emotion result panel */}
            {isDetecting && (
              <div className="flex-1 flex items-center justify-center min-h-48">
                <div className="text-center space-y-3">
                  <div className="w-12 h-12 border-4 border-purple-500 border-t-transparent rounded-full animate-spin mx-auto" />
                  <p className="text-gray-400">Analyzing your expression…</p>
                </div>
              </div>
            )}
            {!isDetecting && emotion && scores && (
              <div className="flex-1 min-w-0">
                <h3 className="text-lg font-semibold mb-4 text-gray-300">
                  🎭 Detection Result
                </h3>
                <EmotionDisplay emotion={emotion} scores={scores} />
              </div>
            )}
          </section>
        )}

        {/* Error */}
        {error && (
          <div className="bg-red-900/30 border border-red-700 rounded-xl p-4 text-red-300 text-sm">
            ⚠️ {error}
          </div>
        )}

        {/* Music recommendations */}
        {tracks.length > 0 && (
          <section>
            <div className="flex items-center gap-3 mb-6">
              <h3 className="text-2xl font-bold text-white">🎵 Your Playlist</h3>
              {emotion && (
                <span className="bg-purple-900/40 border border-purple-700 text-purple-300 text-sm px-3 py-1 rounded-full capitalize">
                  {emotion}
                </span>
              )}
              <span className="ml-auto text-gray-500 text-sm">
                {tracks.length} tracks • Click to play
              </span>
            </div>
            <MusicGrid tracks={tracks} />
          </section>
        )}

        {/* "No camera yet" prompt when emotion is known but camera is closed */}
        {!showCamera && !mode && emotion && (
          <div className="text-center flex flex-col sm:flex-row gap-4 justify-center">
            <button
              className="btn-primary"
              onClick={() => { setMode("camera"); setShowCamera(true); }}
            >
              🎥 Detect Again
            </button>
            <button
              className="btn-primary"
              onClick={() => setMode("text")}
            >
              📝 Share Your Story
            </button>
          </div>
        )}
      </main>
    </div>
  );
}
