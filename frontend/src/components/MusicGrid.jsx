import { useState, useRef } from "react";

/**
 * MusicGrid – renders a grid of recommended music tracks with inline playback.
 *
 * Props:
 *  - tracks: Array<{ id, name, artist, album, album_art, spotify_url, preview_url }>
 */
export default function MusicGrid({ tracks }) {
  const [activeTrack, setActiveTrack] = useState(null);

  if (!tracks || tracks.length === 0) {
    return (
      <p className="text-center text-gray-500 py-8">No tracks to show yet.</p>
    );
  }

  return (
    <div className="space-y-6">
      {/* Embedded player – shows when a track is selected */}
      {activeTrack && (
        <NowPlaying
          key={activeTrack.id}
          track={activeTrack}
          onClose={() => setActiveTrack(null)}
        />
      )}

      {/* Track grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
        {tracks.map((track) => (
          <TrackCard
            key={track.id}
            track={track}
            isActive={activeTrack?.id === track.id}
            onPlay={() => setActiveTrack(track)}
          />
        ))}
      </div>
    </div>
  );
}

/**
 * NowPlaying – embedded player bar that plays music on the same page.
 * Uses Spotify embed iframe for Spotify tracks, HTML5 audio for preview URLs,
 * or opens YouTube in a new tab for YouTube tracks.
 * Remounts (via key) when a different track is selected, resetting all state.
 */
function NowPlaying({ track, onClose }) {
  const audioRef = useRef(null);
  const [isPlaying, setIsPlaying] = useState(false);

  // Determine the source type
  const isYouTube =
    track.youtube_url &&
    (track.youtube_url.includes("youtube.com") ||
      track.youtube_url.includes("music.youtube.com"));
  const isYouTubeVideo =
    isYouTube && track.id && !track.id.startsWith("yt_search_");

  const spotifyTrackId =
    track.spotify_url &&
    !track.id.startsWith("mock_") &&
    !isYouTube
      ? track.id
      : null;

  const [useSpotifyEmbed, setUseSpotifyEmbed] = useState(!!spotifyTrackId);

  const toggleAudioPlay = () => {
    if (!audioRef.current) return;
    if (isPlaying) {
      audioRef.current.pause();
    } else {
      audioRef.current.play();
    }
    setIsPlaying(!isPlaying);
  };

  const placeholder = `https://via.placeholder.com/300x300/1a1a24/9333ea?text=${encodeURIComponent(
    track.name.slice(0, 2)
  )}`;

  return (
    <div className="bg-dark-800 border border-purple-500/30 rounded-2xl overflow-hidden shadow-lg shadow-purple-900/20">
      {/* Header bar */}
      <div className="flex items-center gap-3 px-4 py-3 bg-dark-700 border-b border-white/10">
        <span className="text-lg">🎵</span>
        <span className="text-sm font-semibold text-purple-300">Now Playing</span>
        <div className="ml-auto flex items-center gap-2">
          {/* Toggle between Spotify embed and audio preview */}
          {track.preview_url && spotifyTrackId && (
            <button
              onClick={() => setUseSpotifyEmbed(!useSpotifyEmbed)}
              className="text-xs text-gray-400 hover:text-white transition-colors px-2 py-1 rounded bg-dark-600"
            >
              {useSpotifyEmbed ? "🎧 Preview" : "🟢 Spotify"}
            </button>
          )}
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white transition-colors p-1"
            aria-label="Close player"
          >
            ✕
          </button>
        </div>
      </div>

      {/* Player content */}
      <div className="p-4">
        {isYouTubeVideo ? (
          /* YouTube embed */
          <iframe
            src={`https://www.youtube.com/embed/${track.id}?autoplay=1`}
            width="100%"
            height="200"
            frameBorder="0"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
            loading="lazy"
            className="rounded-xl"
            title={`Play ${track.name} by ${track.artist}`}
          />
        ) : useSpotifyEmbed && spotifyTrackId ? (
          /* Spotify Embed iframe */
          <iframe
            src={`https://open.spotify.com/embed/track/${spotifyTrackId}?utm_source=generator&theme=0`}
            width="100%"
            height="152"
            frameBorder="0"
            allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture"
            loading="lazy"
            className="rounded-xl"
            title={`Play ${track.name} by ${track.artist}`}
          />
        ) : track.preview_url ? (
          /* Audio preview player */
          <div className="flex items-center gap-4">
            <img
              src={track.album_art || placeholder}
              alt={`${track.album} cover`}
              className="w-16 h-16 rounded-lg object-cover flex-shrink-0"
              onError={(e) => {
                e.currentTarget.src = placeholder;
              }}
            />
            <div className="flex-1 min-w-0">
              <p className="font-semibold text-white truncate">{track.name}</p>
              <p className="text-sm text-gray-400 truncate">{track.artist}</p>
              <p className="text-xs text-gray-500 mt-1">30-second preview</p>
            </div>
            <button
              onClick={toggleAudioPlay}
              className="flex-shrink-0 w-12 h-12 rounded-full bg-purple-600 hover:bg-purple-700 flex items-center justify-center text-2xl transition-colors"
            >
              {isPlaying ? "⏸" : "▶️"}
            </button>
            <audio
              ref={audioRef}
              src={track.preview_url}
              onEnded={() => setIsPlaying(false)}
              onError={() => setIsPlaying(false)}
            />
          </div>
        ) : spotifyTrackId ? (
          /* Fallback: Spotify embed when no preview available */
          <iframe
            src={`https://open.spotify.com/embed/track/${spotifyTrackId}?utm_source=generator&theme=0`}
            width="100%"
            height="152"
            frameBorder="0"
            allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture"
            loading="lazy"
            className="rounded-xl"
            title={`Play ${track.name} by ${track.artist}`}
          />
        ) : (
          /* No playback available */
          <div className="flex items-center gap-4">
            <img
              src={track.album_art || placeholder}
              alt={`${track.album} cover`}
              className="w-16 h-16 rounded-lg object-cover flex-shrink-0"
              onError={(e) => {
                e.currentTarget.src = placeholder;
              }}
            />
            <div className="flex-1 min-w-0">
              <p className="font-semibold text-white truncate">{track.name}</p>
              <p className="text-sm text-gray-400 truncate">{track.artist}</p>
              <p className="text-xs text-yellow-400 mt-1">
                Preview not available — connect Spotify to play
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function TrackCard({ track, isActive, onPlay }) {
  const placeholder = `https://via.placeholder.com/300x300/1a1a24/9333ea?text=${encodeURIComponent(
    track.name.slice(0, 2)
  )}`;

  // Determine the external link: prefer YouTube, then Spotify
  const externalUrl = track.youtube_url || track.spotify_url || null;
  const isYouTube =
    externalUrl &&
    (externalUrl.includes("youtube.com") ||
      externalUrl.includes("music.youtube.com"));

  const handleClick = (e) => {
    e.preventDefault();
    // If it's a YouTube search link (no real video ID), open externally
    if (isYouTube && track.id.startsWith("yt_search_")) {
      window.open(externalUrl, "_blank", "noopener,noreferrer");
      return;
    }
    onPlay();
  };

  return (
    <button
      onClick={handleClick}
      className={`track-card group text-left w-full ${
        isActive ? "ring-2 ring-purple-500 scale-[1.02]" : ""
      }`}
    >
      {/* Album art */}
      <div className="relative w-full aspect-square overflow-hidden">
        <img
          src={track.album_art || placeholder}
          alt={`${track.album || track.name} cover`}
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
          onError={(e) => {
            e.currentTarget.src = placeholder;
          }}
        />
        {/* Play overlay */}
        <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex items-center justify-center">
          <span className="text-4xl">
            {isActive ? "🎵" : isYouTube ? "▶️" : "▶️"}
          </span>
        </div>
        {/* YouTube badge */}
        {isYouTube && (
          <div className="absolute top-1.5 right-1.5 bg-red-600 text-white text-[9px] font-bold px-1.5 py-0.5 rounded">
            YT
          </div>
        )}
      </div>

      {/* Track info */}
      <div className="p-3">
        <p className="font-semibold text-sm truncate text-white">{track.name}</p>
        <p className="text-xs text-gray-400 truncate mt-0.5">{track.artist}</p>
        {track.album && (
          <p className="text-xs text-gray-500 truncate mt-0.5">{track.album}</p>
        )}
      </div>
    </button>
  );
}
