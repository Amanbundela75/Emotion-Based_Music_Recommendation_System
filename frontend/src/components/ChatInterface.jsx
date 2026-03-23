import { useState, useRef, useEffect, useCallback } from "react";
import { analyzeText, sendChatMessage } from "../api/emotionApi";
import { analyzeTextEmotion } from "../utils/textEmotionAnalyzer";
import MusicGrid from "./MusicGrid";

/**
 * ChatInterface – a ChatGPT-style multi-turn conversation UI.
 *
 * Flow:
 *  1. User types their incident / story and hits Send.
 *  2. Backend analyzes emotion via Gemini, returns empathetic reply + music.
 *  3. Music recommendations appear inline below the AI reply.
 *  4. User can continue chatting for support / follow-up questions.
 *
 * Props:
 *  - onBack: () => void  — called when the user wants to go back to home
 */
export default function ChatInterface({ onBack }) {
  const [messages, setMessages] = useState([]); // { role, content }
  const [tracks, setTracks] = useState([]);
  const [inputText, setInputText] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [voiceError, setVoiceError] = useState(null);
  const [error, setError] = useState(null);
  const bottomRef = useRef(null);
  const recognitionRef = useRef(null);
  const textareaRef = useRef(null);

  const supportsVoice =
    typeof window !== "undefined" &&
    ("SpeechRecognition" in window || "webkitSpeechRecognition" in window);

  // Auto-scroll to bottom whenever messages change
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isLoading]);

  const startListening = useCallback(() => {
    if (!supportsVoice) return;
    setVoiceError(null);
    const SpeechRecognition =
      window.SpeechRecognition || window.webkitSpeechRecognition;
    const recognition = new SpeechRecognition();
    recognition.lang = "en-US";
    recognition.interimResults = false;
    recognition.continuous = false;

    recognition.onresult = (event) => {
      const transcript = event.results[0][0].transcript;
      setInputText((prev) => (prev ? prev + " " + transcript : transcript));
      setIsListening(false);
    };
    recognition.onerror = (event) => {
      setIsListening(false);
      const msgs = {
        "not-allowed": "Microphone access denied.",
        "no-speech": "No speech detected. Please try again.",
        network: "Network error. Please check your connection.",
      };
      setVoiceError(msgs[event.error] || `Voice error: ${event.error}`);
    };
    recognition.onend = () => setIsListening(false);

    recognitionRef.current = recognition;
    recognition.start();
    setIsListening(true);
  }, [supportsVoice]);

  const stopListening = useCallback(() => {
    recognitionRef.current?.stop();
    setIsListening(false);
  }, []);

  const handleSend = useCallback(async () => {
    const text = inputText.trim();
    if (!text || isLoading) return;

    setError(null);
    const isFirstMessage = messages.length === 0;
    const userMessage = { role: "user", content: text };
    const updatedMessages = [...messages, userMessage];

    setMessages(updatedMessages);
    setInputText("");
    setIsLoading(true);

    try {
      if (isFirstMessage) {
        // First message: analyze emotion + get music + AI reply in one call
        let data;
        try {
          data = await analyzeText(text);
        } catch {
          // Backend unavailable – client-side fallback (with local mock tracks)
          const result = analyzeTextEmotion(text);
          data = {
            emotion: result.emotion,
            scores: result.scores,
            tracks: buildMockTracks(result.emotion, 10),
            message: buildOfflineIntro(result.emotion),
          };
        }

        const aiReply =
          data.message ||
          `I've detected that you're feeling ${data.emotion}. Here's some music that might help.`;

        setMessages((prev) => [
          ...prev,
          { role: "assistant", content: aiReply },
        ]);
        if (data.tracks && data.tracks.length > 0) {
          setTracks(data.tracks);
        }
      } else {
        // Follow-up messages: pure chat (no new music search)
        const chatMessages = updatedMessages.map((m) => ({
          role: m.role,
          content: m.content,
        }));
        const data = await sendChatMessage(chatMessages);
        setMessages((prev) => [
          ...prev,
          { role: "assistant", content: data.reply },
        ]);
      }
    } catch (err) {
      const detail =
        err.response?.data?.detail ?? err.message ?? "Unknown error";
      // Offer a graceful offline reply when the backend is unreachable
      const offlineReply = buildOfflineChatReply(messages, inputText);
      if (offlineReply) {
        setMessages((prev) => [
          ...prev,
          { role: "assistant", content: offlineReply },
        ]);
        setError("Backend unreachable. Showing offline chat reply locally.");
      } else {
        setError(`Something went wrong: ${detail}`);
      }
    } finally {
      setIsLoading(false);
    }
  }, [inputText, isLoading, messages]);

  const handleKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleReset = () => {
    setMessages([]);
    setTracks([]);
    setInputText("");
    setError(null);
  };

  return (
    <div className="flex flex-col h-full space-y-4">
      {/* Top bar */}
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-gray-300 flex items-center gap-2">
          <span>💬</span> AI Companion
          <span className="text-xs bg-emerald-900/40 border border-emerald-700 text-emerald-300 px-2 py-0.5 rounded-full">
            ✨ Gemini Powered
          </span>
        </h3>
        <div className="flex gap-2">
          {messages.length > 0 && (
            <button
              className="btn-secondary text-sm"
              onClick={handleReset}
            >
              🔄 New Chat
            </button>
          )}
          <button className="btn-secondary text-sm" onClick={onBack}>
            ← Back
          </button>
        </div>
      </div>

      {/* Chat messages area */}
      <div className="flex-1 overflow-y-auto space-y-4 min-h-[300px] max-h-[60vh] pr-1">
        {messages.length === 0 ? (
          /* Welcome prompt */
          <div className="flex flex-col items-center justify-center h-full py-12 space-y-4 text-center">
            <span className="text-6xl">🤗</span>
            <h4 className="text-xl font-semibold text-white">
              I'm here to listen
            </h4>
            <p className="text-gray-400 max-w-sm">
              Tell me about what happened today, how you're feeling, or anything
              on your mind. I'll listen, offer support, and recommend music
              tailored to your mood.
            </p>
            {/* Suggestion chips */}
            <div className="flex flex-wrap gap-2 justify-center mt-2">
              {[
                "I had a really rough day at work…",
                "I'm feeling anxious about something…",
                "I just got some amazing news!",
                "I'm feeling overwhelmed lately…",
              ].map((suggestion) => (
                <button
                  key={suggestion}
                  onClick={() => setInputText(suggestion)}
                  className="text-xs bg-dark-700 border border-white/10 hover:border-purple-500 text-gray-300 hover:text-white px-3 py-1.5 rounded-full transition-colors"
                >
                  {suggestion}
                </button>
              ))}
            </div>
          </div>
        ) : (
          messages.map((msg, idx) => (
            <div key={idx}>
              <ChatBubble message={msg} />
              {/* Show music after the first AI reply */}
              {msg.role === "assistant" && idx === 1 && tracks.length > 0 && (
                <div className="mt-4 ml-10 space-y-3">
                  <p className="text-sm text-gray-400 flex items-center gap-1">
                    🎵 <span>Recommended tracks for you</span>
                  </p>
                  <MusicGrid tracks={tracks} />
                </div>
              )}
            </div>
          ))
        )}

        {/* Loading indicator */}
        {isLoading && (
          <div className="flex items-start gap-3">
            <div className="w-9 h-9 rounded-full bg-gradient-to-br from-purple-600 to-pink-600 flex items-center justify-center text-lg flex-shrink-0">
              🤖
            </div>
            <div className="bg-dark-700 border border-white/10 rounded-2xl rounded-tl-none px-4 py-3">
              <div className="flex gap-1 items-center h-5">
                <span className="w-2 h-2 bg-purple-400 rounded-full animate-bounce [animation-delay:0ms]" />
                <span className="w-2 h-2 bg-purple-400 rounded-full animate-bounce [animation-delay:150ms]" />
                <span className="w-2 h-2 bg-purple-400 rounded-full animate-bounce [animation-delay:300ms]" />
              </div>
            </div>
          </div>
        )}

        <div ref={bottomRef} />
      </div>

      {/* Music grid for second+ messages (shown below chat) */}
      {messages.length > 2 && tracks.length > 0 && (
        <div className="border-t border-white/10 pt-4 space-y-2">
          <p className="text-sm text-gray-400 flex items-center gap-1">
            🎵 <span>Your recommended playlist</span>
          </p>
          <MusicGrid tracks={tracks} />
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="bg-red-900/30 border border-red-700 rounded-xl p-3 text-red-300 text-sm">
          ⚠️ {error}
        </div>
      )}

      {/* Input area */}
      <div className="card border border-white/10 space-y-2">
        <div className="relative">
          <textarea
            ref={textareaRef}
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={
              messages.length === 0
                ? "Tell me what happened… (Shift+Enter for new line)"
                : "Continue the conversation… (Shift+Enter for new line)"
            }
            rows={3}
            className="w-full bg-dark-900 border border-white/10 rounded-xl p-4 pr-12 text-white placeholder-gray-500 resize-none focus:outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500 transition-colors"
            disabled={isLoading}
          />
          <span className="absolute bottom-3 right-3 text-xs text-gray-600">
            {inputText.length}
          </span>
        </div>

        <div className="flex gap-2">
          {/* Send button */}
          <button
            onClick={handleSend}
            className="btn-primary flex-1"
            disabled={!inputText.trim() || isLoading}
          >
            {isLoading ? (
              <>
                <span className="inline-block w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                Thinking…
              </>
            ) : messages.length === 0 ? (
              "🎵 Analyze & Get Music"
            ) : (
              "Send ➤"
            )}
          </button>

          {/* Voice input */}
          {supportsVoice && (
            <button
              type="button"
              className={`btn-secondary flex items-center gap-2 ${
                isListening ? "ring-2 ring-red-500 bg-red-900/30" : ""
              }`}
              onClick={isListening ? stopListening : startListening}
              disabled={isLoading}
            >
              {isListening ? (
                <>
                  <span className="relative flex h-3 w-3">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75" />
                    <span className="relative inline-flex rounded-full h-3 w-3 bg-red-500" />
                  </span>
                  Stop
                </>
              ) : (
                "🎤"
              )}
            </button>
          )}
        </div>

        {voiceError && (
          <p className="text-xs text-red-400">⚠️ {voiceError}</p>
        )}
        <p className="text-xs text-gray-600 text-center">
          Press <kbd className="bg-dark-700 px-1 rounded">Enter</kbd> to send •{" "}
          <kbd className="bg-dark-700 px-1 rounded">Shift+Enter</kbd> for new line
        </p>
      </div>
    </div>
  );
}

/** Single chat bubble (user or assistant). */
function ChatBubble({ message }) {
  const isUser = message.role === "user";
  return (
    <div
      className={`flex items-start gap-3 ${isUser ? "flex-row-reverse" : ""}`}
    >
      {/* Avatar */}
      <div
        className={`w-9 h-9 rounded-full flex items-center justify-center text-lg flex-shrink-0 ${
          isUser
            ? "bg-purple-600"
            : "bg-gradient-to-br from-purple-600 to-pink-600"
        }`}
      >
        {isUser ? "👤" : "🤖"}
      </div>

      {/* Bubble */}
      <div
        className={`max-w-[75%] px-4 py-3 rounded-2xl text-sm leading-relaxed ${
          isUser
            ? "bg-purple-700/60 border border-purple-500/30 rounded-tr-none text-white"
            : "bg-dark-700 border border-white/10 rounded-tl-none text-gray-200"
        }`}
      >
        {message.content}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Offline fallbacks (used when backend is unreachable)
// ---------------------------------------------------------------------------

const OFFLINE_PROMPTS = {
  happy:
    "That's wonderful to hear! Keep celebrating those good vibes—here's some upbeat music to match your mood.",
  sad: "I'm sorry you're feeling low. Be gentle with yourself; some soothing music can offer comfort.",
  angry:
    "I hear your frustration. Taking a breath and listening to something energizing-yet-calming might help.",
  fear:
    "It's natural to feel worried. Ground yourself with a few slow breaths while these tracks play quietly.",
  disgust:
    "That sounds unpleasant. Here's a mix of raw, honest tracks that might help you process the feeling.",
  surprise:
    "Wow, that was unexpected! Enjoy this lively set while you take it all in.",
  neutral:
    "Thanks for sharing. Here are some balanced, feel-good tracks to keep you company.",
};

const EMOTION_GENRE_MAP = {
  happy: { genres: ["pop", "dance"] },
  sad: { genres: ["acoustic", "chill"] },
  angry: { genres: ["metal", "rock"] },
  neutral: { genres: ["lo-fi", "ambient"] },
  surprise: { genres: ["electronic", "edm"] },
  fear: { genres: ["ambient", "cinematic"] },
  disgust: { genres: ["punk", "alternative"] },
};

function buildMockTracks(emotion, limit = 10) {
  const params = EMOTION_GENRE_MAP[emotion] || EMOTION_GENRE_MAP.neutral;
  const genre = params.genres[0];
  const nameBase = genre.charAt(0).toUpperCase() + genre.slice(1);
  const PLACEHOLDER_IMAGE_SIZE = "300x300";

  return Array.from({ length: limit }).map((_, index) => {
    const name = `${nameBase} Track ${index + 1}`;
    return {
      id: `offline_${emotion}_${index}`,
      name,
      artist: "Demo Artist",
      album: `${nameBase} Vibes`,
      album_art: `https://via.placeholder.com/${PLACEHOLDER_IMAGE_SIZE}.png?text=${encodeURIComponent(
        genre
      )}`,
      spotify_url: "",
      preview_url: null,
      youtube_url: `https://music.youtube.com/search?q=${encodeURIComponent(
        `${genre} ${emotion} songs`
      )}`,
    };
  });
}

function buildOfflineIntro(emotion) {
  const prompt = OFFLINE_PROMPTS[emotion] || OFFLINE_PROMPTS.neutral;
  return `${prompt} (Offline suggestions)`;
}

function buildOfflineChatReply(history, latestUserMessage) {
  const lastUser =
    latestUserMessage ||
    [...history].reverse().find((m) => m.role === "user")?.content ||
    "";
  if (!lastUser) return null;

  try {
    const { emotion } = analyzeTextEmotion(lastUser);
    return OFFLINE_PROMPTS[emotion] || OFFLINE_PROMPTS.neutral;
  } catch {
    return OFFLINE_PROMPTS.neutral;
  }
}
