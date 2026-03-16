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
 * Send a multi-turn chat message to the empathetic AI chatbot.
 * @param {Array<{role: string, content: string}>} messages - Full conversation history,
 *   ending with the new user message (role="user").
 * @returns {Promise<{reply: string}>}
 */
export async function sendChatMessage(messages) {
  const response = await api.post("/chat", { messages });
  return response.data;
}
