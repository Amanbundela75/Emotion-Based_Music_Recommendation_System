import { useState, useRef, useCallback } from "react";

/**
 * TextVoiceInput – lets users describe their day via text or voice.
 *
 * Props:
 *  - onSubmit(text: string) – called when the user submits their description
 *  - isProcessing: bool – disables input while processing
 */
export default function TextVoiceInput({ onSubmit, isProcessing }) {
  const [text, setText] = useState("");
  const [isListening, setIsListening] = useState(false);
  const recognitionRef = useRef(null);

  const supportsVoice =
    typeof window !== "undefined" &&
    ("SpeechRecognition" in window || "webkitSpeechRecognition" in window);

  const startListening = useCallback(() => {
    if (!supportsVoice) return;

    const SpeechRecognition =
      window.SpeechRecognition || window.webkitSpeechRecognition;
    const recognition = new SpeechRecognition();
    recognition.lang = "en-US";
    recognition.interimResults = false;
    recognition.continuous = false;

    recognition.onresult = (event) => {
      const transcript = event.results[0][0].transcript;
      setText((prev) => (prev ? prev + " " + transcript : transcript));
      setIsListening(false);
    };

    recognition.onerror = () => {
      setIsListening(false);
    };

    recognition.onend = () => {
      setIsListening(false);
    };

    recognitionRef.current = recognition;
    recognition.start();
    setIsListening(true);
  }, [supportsVoice]);

  const stopListening = useCallback(() => {
    if (recognitionRef.current) {
      recognitionRef.current.stop();
    }
    setIsListening(false);
  }, []);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (text.trim() && !isProcessing) {
      onSubmit(text.trim());
    }
  };

  return (
    <div className="card border border-white/10 space-y-4">
      <div className="flex items-center gap-3 mb-2">
        <span className="text-3xl">📝</span>
        <div>
          <h3 className="text-lg font-semibold text-white">
            Tell Us About Your Day
          </h3>
          <p className="text-sm text-gray-400">
            Describe what happened today — type or use voice input
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="relative">
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder='e.g. "I had an amazing day! Got promoted at work and celebrated with friends..."'
            className="w-full h-32 bg-dark-900 border border-white/10 rounded-xl p-4 text-white placeholder-gray-500 resize-none focus:outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500 transition-colors"
            disabled={isProcessing}
          />

          {/* Character count */}
          <span className="absolute bottom-3 right-3 text-xs text-gray-500">
            {text.length} chars
          </span>
        </div>

        <div className="flex flex-wrap gap-3">
          {/* Submit button */}
          <button
            type="submit"
            className="btn-primary flex-1 min-w-[200px]"
            disabled={!text.trim() || isProcessing}
          >
            {isProcessing ? (
              <>
                <span className="inline-block w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                Analyzing…
              </>
            ) : (
              "🎵 Get Music Recommendations"
            )}
          </button>

          {/* Voice input button */}
          {supportsVoice && (
            <button
              type="button"
              className={`btn-secondary flex items-center gap-2 ${
                isListening ? "ring-2 ring-red-500 bg-red-900/30" : ""
              }`}
              onClick={isListening ? stopListening : startListening}
              disabled={isProcessing}
            >
              {isListening ? (
                <>
                  <span className="relative flex h-3 w-3">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75" />
                    <span className="relative inline-flex rounded-full h-3 w-3 bg-red-500" />
                  </span>
                  Stop Recording
                </>
              ) : (
                <>🎤 Voice Input</>
              )}
            </button>
          )}

          {/* Clear button */}
          {text && (
            <button
              type="button"
              className="btn-secondary"
              onClick={() => setText("")}
              disabled={isProcessing}
            >
              ✕ Clear
            </button>
          )}
        </div>
      </form>

      {!supportsVoice && (
        <p className="text-xs text-gray-500">
          💡 Voice input is not supported in this browser. Try Chrome or Edge.
        </p>
      )}
    </div>
  );
}
