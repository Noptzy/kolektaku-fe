import api from "./api";

/**
 * Anime API Service
 * Handles all anime-related API calls
 */

export const animeService = {
  /**
   * Get all anime with pagination
   * @param {number} page - Page number
   * @param {number} limit - Items per page
   * @returns {Promise}
   */
  getAllAnime: async (page = 1, limit = 20, filters = {}) => {
    const params = new URLSearchParams({ page, limit });
    Object.entries(filters).forEach(([k, v]) => { if (v) params.append(k, v); });
    const { data } = await api.get(`/api/anime?${params.toString()}`);
    return data;
  },

  getFilterOptions: async () => {
    const { data } = await api.get("/api/anime/filters");
    return data;
  },

  /**
   * Search anime by keyword
   * @param {string} keyword - Search keyword
   * @param {number} page - Page number
   * @param {number} limit - Items per page
   * @returns {Promise}
   */
  searchAnime: async (keyword, page = 1, limit = 20) => {
    const { data } = await api.get(
      `/api/anime/search?q=${encodeURIComponent(keyword)}&page=${page}&limit=${limit}`
    );
    return data;
  },

  /**
   * Get anime by slug
   * @param {string} slug - Anime slug
   * @returns {Promise}
   */
  getAnimeBySlug: async (slug) => {
    const { data } = await api.get(`/api/anime/${slug}`);
    return data;
  },

  /**
   * Get episode list for an anime
   * @param {string} slug - Anime slug
   * @returns {Promise}
   */
  getEpisodeList: async (slug) => {
    const { data } = await api.get(`/api/anime/${slug}/eps`);
    return data;
  },

  /**
   * Get episode stream
   * @param {string} slug - Anime slug
   * @param {number|string} episodeNumber - Episode number
   * @returns {Promise}
   */
  getEpisodeStream: async (slug, episodeNumber) => {
    const { data } = await api.get(`/api/anime/${slug}/eps/${episodeNumber}`);
    return data;
  },

  /**
   * Get anime by staff ID
   * @param {string|number} staffId - Staff ID
   * @param {number} page - Page number
   * @param {number} limit - Items per page
   * @returns {Promise}
   */
  getStaffAnime: async (staffId, page = 1, limit = 20) => {
    const { data } = await api.get(
      `/api/anime/staff/${staffId}?page=${page}&limit=${limit}`
    );
    return data;
  },

  /**
   * Get anime by studio ID
   * @param {string|number} studioId - Studio ID
   * @param {number} page - Page number
   * @param {number} limit - Items per page
   * @returns {Promise}
   */
  getStudioAnime: async (studioId, page = 1, limit = 20) => {
    const { data } = await api.get(
      `/api/anime/studio/${studioId}?page=${page}&limit=${limit}`
    );
    return data;
  },

  getVAAnime: async (vaId, page = 1, limit = 20) => {
    const { data } = await api.get(
      `/api/anime/va/${vaId}?page=${page}&limit=${limit}`
    );
    return data;
  },

  /**
   * Get global statistics
   * @returns {Promise}
   */
  getGlobalStats: async () => {
    const { data } = await api.get("/api/anime/stats");
    return data;
  },

  getRandomAnime: async (limit = 10) => {
    const { data } = await api.get(`/api/anime/random?limit=${limit}`);
    return data;
  },

  getRecentlyUpdated: async (limit = 12) => {
    const { data } = await api.get(`/api/anime/recently-updated?limit=${limit}`);
    return data;
  },

  getMostWatched: async (limit = 12) => {
    const { data } = await api.get(`/api/anime/most-watched?limit=${limit}`);
    return data;
  },

  getAiringSchedules: async () => {
    const { data } = await api.get("/api/schedules");
    return data;
  },

  triggerAiringScheduleSync: async () => {
    const { data } = await api.post("/api/admin/schedules/fetch");
    return data;
  },

  getRecommendations: async (limit = 12) => {
    const { data } = await api.get(`/api/anime/recommendations?limit=${limit}`);
    return data;
  },
};

export default animeService;
