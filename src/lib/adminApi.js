import api from "./api";

export const adminService = {
  // Users
  getUsers: async (params) => {
    const { data } = await api.get("/api/users", { params });
    return data;
  },
  updateUserRole: async (id, roleId) => {
    const { data } = await api.put(`/api/users/${id}/role`, { roleId });
    return data;
  },
  assignMembership: async (userId, planId) => {
    const { data } = await api.post(`/api/users/${userId}/membership`, { planId });
    return data;
  },
  deleteUser: async (id) => {
    const { data } = await api.delete(`/api/users/${id}`);
    return data;
  },

  // Anime
  getAnime: async (params) => {
    const { data } = await api.get("/api/admin/anime", { params });
    return data;
  },
  getFilterOptions: async () => {
    const { data } = await api.get("/api/admin/anime/filter-options");
    return data;
  },
  getAnimeById: async (id) => {
    const { data } = await api.get(`/api/admin/anime/${id}`);
    return data;
  },
  updateAnime: async (id, payload) => {
    const { data } = await api.put(`/api/admin/anime/${id}`, payload);
    return data;
  },
  toggleAnimeVisibility: async (id, publishStatus) => {
    const { data } = await api.patch(`/api/admin/anime/${id}/visibility`, { publishStatus });
    return data;
  },
  triggerScrape: async (id, type) => {
    const { data } = await api.post(`/api/admin/anime/${id}/scrape`, { type });
    return data;
  },
  triggerBatchMapping: async () => {
    const { data } = await api.post("/api/admin/anime/batch-map");
    return data;
  },
  manualAddAnime: async (payload) => {
    const { data } = await api.post("/api/admin/anime/manual-add", payload);
    return data;
  },

  // Episodes
  getEpisodes: async (animeDetailId, params) => {
    const { data } = await api.get(`/api/admin/anime-detail/${animeDetailId}/episodes`, { params });
    return data;
  },
  createEpisode: async (animeDetailId, payload) => {
    const { data } = await api.post(`/api/admin/anime-detail/${animeDetailId}/episodes`, payload);
    return data;
  },
  deleteAllEpisodes: async (animeDetailId) => {
    const { data } = await api.delete(`/api/admin/anime-detail/${animeDetailId}/episodes`);
    return data;
  },
  updateEpisode: async (episodeId, payload) => {
    const { data } = await api.put(`/api/admin/episodes/${episodeId}`, payload);
    return data;
  },
  deleteEpisode: async (episodeId) => {
    const { data } = await api.delete(`/api/admin/episodes/${episodeId}`);
    return data;
  },

  // Episode Sources
  getEpisodeSources: async (episodeId) => {
    const { data } = await api.get(`/api/admin/episodes/${episodeId}/sources`);
    return data;
  },
  createEpisodeSource: async (episodeId, payload) => {
    const { data } = await api.post(`/api/admin/episodes/${episodeId}/sources`, payload);
    return data;
  },
  updateEpisodeSource: async (sourceId, payload) => {
    const { data } = await api.put(`/api/admin/sources/${sourceId}`, payload);
    return data;
  },
  deleteEpisodeSource: async (sourceId) => {
    const { data } = await api.delete(`/api/admin/sources/${sourceId}`);
    return data;
  },

  // Vouchers
  getVouchers: async (params) => {
    const { data } = await api.get("/api/vouchers", { params });
    return data;
  },
  createVoucher: async (payload) => {
    const { data } = await api.post("/api/vouchers", payload);
    return data;
  },
  deleteVoucher: async (id) => {
    const { data } = await api.delete(`/api/vouchers/${id}`);
    return data;
  },

  // Membership Plans
  createPlan: async (payload) => {
    const { data } = await api.post("/api/plans", payload);
    return data;
  },
  updatePlan: async (id, payload) => {
    const { data } = await api.put(`/api/plans/${id}`, payload);
    return data;
  },
  deletePlan: async (id) => {
    const { data } = await api.delete(`/api/plans/${id}`);
    return data;
  },

  // Mappings
  connectMapping: async (koleksiId, payload) => {
    const { data } = await api.post(`/api/admin/mappings/connect/${koleksiId}`, payload);
    return data;
  },
  getMappings: async (params) => {
    const { data } = await api.get("/api/admin/mappings", { params });
    return data;
  },
  approveMapping: async (id, candidateId) => {
    const { data } = await api.post(`/api/admin/mappings/${id}/approve`, { candidateId });
    return data;
  },
  ignoreMapping: async (id) => {
    const { data } = await api.post(`/api/admin/mappings/${id}/ignore`);
    return data;
  },
  manualConnectMapping: async (id, koleksiId) => {
    const { data } = await api.post(`/api/admin/mappings/${id}/manual`, { koleksiId });
    return data;
  },
  bulkApproveMapping: async (items) => {
    const { data } = await api.post("/api/admin/mappings/bulk-approve", { items });
    return data;
  },
  bulkIgnoreMapping: async (mappingIds) => {
    const { data } = await api.post("/api/admin/mappings/bulk-ignore", { mappingIds });
    return data;
  },

  // Audit Logs
  getAuditLogs: async (params) => {
    const { data } = await api.get("/api/admin/audit-logs", { params });
    return data;
  },

  // Broadcasts
  getBroadcasts: async (params) => {
    const { data } = await api.get("/api/admin/broadcasts", { params });
    return data;
  },
  createBroadcast: async (payload) => {
    const { data } = await api.post("/api/admin/broadcasts", payload);
    return data;
  },

  // Transactions
  getTransactions: async (params) => {
    const { data } = await api.get("/api/admin/transactions", { params });
    return data;
  }
};

export default adminService;
