/**
 * MusicGrid – renders a grid of recommended music tracks.
 *
 * Props:
 *  - tracks: Array<{ id, name, artist, album, album_art, spotify_url, preview_url }>
 */
export default function MusicGrid({ tracks }) {
  if (!tracks || tracks.length === 0) {
    return (
      <p className="text-center text-gray-500 py-8">No tracks to show yet.</p>
    );
  }

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
      {tracks.map((track) => (
        <TrackCard key={track.id} track={track} />
      ))}
    </div>
  );
}

function TrackCard({ track }) {
  const placeholder = `https://via.placeholder.com/300x300/1a1a24/9333ea?text=${encodeURIComponent(
    track.name.slice(0, 2)
  )}`;

  return (
    <a
      href={track.spotify_url || "#"}
      target="_blank"
      rel="noopener noreferrer"
      className="track-card group"
    >
      {/* Album art */}
      <div className="relative w-full aspect-square overflow-hidden">
        <img
          src={track.album_art || placeholder}
          alt={`${track.album} cover`}
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
          onError={(e) => {
            e.currentTarget.src = placeholder;
          }}
        />
        {/* Spotify play overlay */}
        <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex items-center justify-center">
          <span className="text-4xl">▶️</span>
        </div>
      </div>

      {/* Track info */}
      <div className="p-3">
        <p className="font-semibold text-sm truncate text-white">{track.name}</p>
        <p className="text-xs text-gray-400 truncate mt-0.5">{track.artist}</p>
        {track.album && (
          <p className="text-xs text-gray-500 truncate mt-0.5">{track.album}</p>
        )}
      </div>
    </a>
  );
}
