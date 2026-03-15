import { useState } from "react";

/**
 * MoodSelector – after emotion is detected, asks the user whether they want
 * mood-uplifting music or deeper emotional music.
 *
 * Props:
 *  - emotion: string – the detected emotion
 *  - onSelect(preference: "uplifting" | "deeper") – fires when user picks
 *  - isLoading: boolean – disables buttons during API call
 */
export default function MoodSelector({ onSelect, isLoading }) {
  const [selected, setSelected] = useState(null);

  const handleSelect = (pref) => {
    setSelected(pref);
    onSelect(pref);
  };

  return (
    <div className="card border border-white/10 space-y-5">
      <div className="flex items-center gap-3">
        <span className="text-3xl">🎯</span>
        <div>
          <h3 className="text-lg font-semibold text-white">
            What kind of music do you want?
          </h3>
          <p className="text-sm text-gray-400">
            We detected your mood — now tell us how you&apos;d like your music
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {/* Uplifting option */}
        <button
          onClick={() => handleSelect("uplifting")}
          disabled={isLoading}
          className={`relative p-5 rounded-xl border-2 text-left transition-all duration-200 ${
            selected === "uplifting"
              ? "border-yellow-500 bg-yellow-900/20 ring-1 ring-yellow-500/50"
              : "border-white/10 bg-dark-800 hover:border-yellow-500/50 hover:bg-dark-700"
          } disabled:opacity-50 disabled:cursor-not-allowed`}
        >
          <div className="flex items-start gap-3">
            <span className="text-4xl">🌟</span>
            <div>
              <h4 className="font-bold text-white text-base">Mood Uplifting</h4>
              <p className="text-sm text-gray-400 mt-1">
                Lift my spirits! Give me happy, motivational, feel-good songs
                that make everything better.
              </p>
            </div>
          </div>
          {selected === "uplifting" && isLoading && (
            <div className="absolute top-3 right-3">
              <span className="inline-block w-5 h-5 border-2 border-yellow-400 border-t-transparent rounded-full animate-spin" />
            </div>
          )}
        </button>

        {/* Deeper option */}
        <button
          onClick={() => handleSelect("deeper")}
          disabled={isLoading}
          className={`relative p-5 rounded-xl border-2 text-left transition-all duration-200 ${
            selected === "deeper"
              ? "border-purple-500 bg-purple-900/20 ring-1 ring-purple-500/50"
              : "border-white/10 bg-dark-800 hover:border-purple-500/50 hover:bg-dark-700"
          } disabled:opacity-50 disabled:cursor-not-allowed`}
        >
          <div className="flex items-start gap-3">
            <span className="text-4xl">💜</span>
            <div>
              <h4 className="font-bold text-white text-base">
                Feel It Deeply
              </h4>
              <p className="text-sm text-gray-400 mt-1">
                Let me feel my emotions fully. Give me songs that resonate with
                what I&apos;m going through right now.
              </p>
            </div>
          </div>
          {selected === "deeper" && isLoading && (
            <div className="absolute top-3 right-3">
              <span className="inline-block w-5 h-5 border-2 border-purple-400 border-t-transparent rounded-full animate-spin" />
            </div>
          )}
        </button>
      </div>
    </div>
  );
}
