import axios from "axios";

const BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:8000";

const api = axios.create({ baseURL: BASE_URL });

/**
 * Send a base64 image to the backend and get emotion + track recommendations.
 * @param {string} imageBase64  - data-URI or raw base64 string
 * @returns {Promise<{emotion: string, scores: object, tracks: Array}>}
 */
export async function analyzeAndRecommend(imageBase64) {
  const response = await api.post("/analyze-and-recommend", {
    image: imageBase64,
  });
  return response.data;
}

/**
 * Fetch music recommendations for a given emotion.
 * @param {string} emotion
 * @param {number} limit
 * @returns {Promise<{emotion: string, tracks: Array}>}
 */
export async function getRecommendations(emotion, limit = 10) {
  const response = await api.post("/recommend", { emotion, limit });
  return response.data;
}

/**
 * Send text describing the user's day to the backend for emotion analysis + recommendations.
 * Uses Gemini API on the backend for accurate analysis, with keyword fallback.
 * @param {string} text - User's text description
 * @returns {Promise<{emotion: string, scores: object, tracks: Array}>}
 */
export async function analyzeText(text) {
  const response = await api.post("/analyze-text", { text });
  return response.data;
}

/**
 * Gemini-powered analysis with mood preference.
 * Call this after initial emotion detection to get tailored music recommendations.
 * @param {string} text - User's text description
 * @param {string} moodPreference - "uplifting" or "deeper"
 * @returns {Promise<{emotion: string, scores: object, tracks: Array, gemini_powered: boolean}>}
 */
export async function analyzeTextWithGemini(text, moodPreference) {
  const response = await api.post("/analyze-text-gemini", {
    text,
    mood_preference: moodPreference,
  });
  return response.data;
}
