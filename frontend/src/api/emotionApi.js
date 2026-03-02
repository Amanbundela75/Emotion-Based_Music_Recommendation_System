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
