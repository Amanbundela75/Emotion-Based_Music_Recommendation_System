# Emotion-Based Music Recommendation System

A full-stack web application that detects your facial expression via webcam and recommends Spotify music tracks that match your mood — in real time.

---

## ✨ Features

- 🎭 **Real-time emotion detection** using [DeepFace](https://github.com/serengil/deepface) and OpenCV
- 📝 **Text-based mood detection** — describe your day and get music that matches your mood
- 🎤 **Voice input support** — use the Web Speech API to narrate your day hands-free
- 🎵 **Music recommendations** via the [Spotify Web API](https://developer.spotify.com/) (Spotipy)
- 📷 **Live webcam capture** with manual or automatic (every 5 s) detection
- 📊 **Confidence score bars** for all detected emotions
- 🌑 **Dark-themed React UI** built with Vite + Tailwind CSS
- 🌐 **GitHub Pages ready** — works as a static site with client-side emotion analysis

Supported emotions: `happy`, `sad`, `angry`, `neutral`, `surprise`, `fear`, `disgust`

---

## 🗂 Project Structure

```
.
├── .github/workflows/
│   └── deploy.yml            # GitHub Pages deployment
├── backend/                  # Python FastAPI backend
│   ├── main.py               # API routes
│   ├── emotion_detector.py   # DeepFace emotion analysis
│   ├── text_emotion_analyzer.py  # Text-based emotion detection
│   ├── spotify_service.py    # Spotify track recommendations
│   ├── requirements.txt
│   ├── Dockerfile
│   └── .env.example
│
├── frontend/                 # React + Tailwind frontend
│   ├── src/
│   │   ├── App.jsx
│   │   ├── api/emotionApi.js
│   │   ├── utils/
│   │   │   └── textEmotionAnalyzer.js  # Client-side text analysis
│   │   └── components/
│   │       ├── WebcamCapture.jsx
│   │       ├── TextVoiceInput.jsx      # Text & voice input
│   │       ├── EmotionDisplay.jsx
│   │       └── MusicGrid.jsx
│   ├── Dockerfile
│   └── .env.example
│
└── docker-compose.yml
```

---

## 🚀 Quick Start

### Prerequisites

- Python 3.10+ and pip
- Node.js 18+ and npm
- [Spotify Developer account](https://developer.spotify.com/dashboard) (for real track recommendations)

---

### 1. Backend Setup

```bash
cd backend

# Copy and fill in your credentials
cp .env.example .env
# Edit .env and set SPOTIFY_CLIENT_ID and SPOTIFY_CLIENT_SECRET

pip install -r requirements.txt

uvicorn main:app --reload --port 8000
```

> If Spotify credentials are not set the API still works, returning mock/placeholder tracks.

**API docs:** http://localhost:8000/docs

---

### 2. Frontend Setup

```bash
cd frontend

cp .env.example .env          # adjust VITE_API_URL if needed

npm install
npm run dev
```

Open **http://localhost:5173** in your browser.

---

### 3. Docker (one-command startup)

```bash
# Copy and fill backend credentials first
cp backend/.env.example backend/.env

docker compose up --build
```

- Frontend: http://localhost:5173
- Backend docs: http://localhost:8000/docs

---

## 🔌 API Reference

| Method | Path | Description |
|--------|------|-------------|
| GET | `/` | Health check |
| POST | `/analyze` | Detect emotion from base64 image |
| POST | `/recommend` | Get tracks for a given emotion |
| POST | `/analyze-and-recommend` | Detect + recommend in one call |
| POST | `/analyze-text` | Detect emotion from text + recommend |

### Example – `/analyze-and-recommend`

**Request**
```json
{ "image": "<base64-encoded JPEG>" }
```

**Response**
```json
{
  "emotion": "happy",
  "scores": { "happy": 94.2, "neutral": 3.1, ... },
  "tracks": [
    {
      "id": "...",
      "name": "Blinding Lights",
      "artist": "The Weeknd",
      "album": "After Hours",
      "album_art": "https://...",
      "spotify_url": "https://open.spotify.com/track/...",
      "preview_url": "https://..."
    }
  ]
}
```

---

## 🎨 Emotion → Music Mapping

| Emotion | Genres | Mood |
|---------|--------|------|
| 😄 Happy | Pop, Dance | Upbeat, Feel-good |
| 😢 Sad | Acoustic, Chill, Indie | Melancholic |
| 😠 Angry | Metal, Rock, Punk | Intense, Aggressive |
| 😐 Neutral | Lo-fi, Ambient, Study | Calm, Focus |
| 😲 Surprise | Electronic, EDM | Energetic, Vibrant |
| 😨 Fear | Ambient, Dark, Cinematic | Atmospheric |
| 🤢 Disgust | Punk, Alternative, Grunge | Raw, Rebellious |

---

## 🛡 Environment Variables

### `backend/.env`

| Variable | Required | Description |
|----------|----------|-------------|
| `SPOTIFY_CLIENT_ID` | Yes* | Spotify app client ID |
| `SPOTIFY_CLIENT_SECRET` | Yes* | Spotify app client secret |
| `ALLOWED_ORIGINS` | No | CORS origins (default: localhost) |

\* Without credentials, mock tracks are returned instead.

### `frontend/.env`

| Variable | Default | Description |
|----------|---------|-------------|
| `VITE_API_URL` | `http://localhost:8000` | Backend base URL |

---

## 🌐 GitHub Pages Deployment

The frontend can be deployed as a static site on GitHub Pages. When no backend is
available, the app uses client-side text emotion analysis and returns mock tracks.

1. Go to your repo **Settings → Pages → Source → GitHub Actions**.
2. Push to `main` — the workflow at `.github/workflows/deploy.yml` builds and deploys automatically.

> **Note:** Camera-based detection requires the backend. Text/voice-based mood detection
> works fully client-side on GitHub Pages.

---

## 📄 License

MIT
