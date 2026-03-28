import api from "./api";

const meService = {
  getFavorites: async (params) => {
    const { data } = await api.get("/api/me/favorites", { params });
    return data;
  },

  addFavorite: async (koleksiId) => {
    const { data } = await api.post(`/api/me/favorites/${koleksiId}`);
    return data;
  },

  removeFavorite: async (koleksiId) => {
    const { data } = await api.delete(`/api/me/favorites/${koleksiId}`);
    return data;
  },

  getWatchHistory: async (params) => {
    const { data } = await api.get("/api/me/history/watch", { params });
    return data;
  },

  getWatchHistoryByEpisode: async (episodeId) => {
    const { data } = await api.get(`/api/me/history/watch/${episodeId}`);
    return data;
  },

  saveWatchHistory: async (payload) => {
    const { data } = await api.post("/api/me/history/watch", payload);
    return data;
  },

  getReadHistory: async (params) => {
    const { data } = await api.get("/api/me/history/read", { params });
    return data;
  },

  getNotifications: async (params) => {
    const { data } = await api.get("/api/me/notifications", { params });
    return data;
  },

  markNotificationRead: async (notificationId) => {
    const { data } = await api.patch(`/api/me/notifications/${notificationId}/read`);
    return data;
  },

  markAllNotificationsRead: async () => {
    const { data } = await api.patch("/api/me/notifications/read-all");
    return data;
  },

  getBilling: async (params) => {
    const { data } = await api.get("/api/me/billing", { params });
    return data;
  },
};

export default meService;
