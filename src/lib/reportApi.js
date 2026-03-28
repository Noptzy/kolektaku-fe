import api from './api';

const reportService = {
  submitReport: async (episodeId, category, message) => {
    const response = await api.post(`/api/reports/episode/${episodeId}`, {
      category,
      message,
    });
    return response.data;
  },

  getReports: async (params = {}) => {
    const response = await api.get('/api/reports', { params });
    return response.data;
  },

  getUserReports: async () => {
    const response = await api.get('/api/reports/me');
    return response.data;
  },

  resolveReport: async (reportId) => {
    const response = await api.put(`/api/reports/${reportId}/resolve`);
    return response.data;
  },

  dismissReport: async (reportId) => {
    const response = await api.put(`/api/reports/${reportId}/dismiss`);
    return response.data;
  },

  deleteReport: async (reportId) => {
    const response = await api.delete(`/api/reports/${reportId}`);
    return response.data;
  },
};

export default reportService;
