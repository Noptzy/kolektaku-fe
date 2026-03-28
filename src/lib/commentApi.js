import api from './api';

const commentService = {
  getComments: async (episodeId, params = { page: 1, limit: 50 }) => {
    const response = await api.get(`/api/comments/episode/${episodeId}`, { params });
    return response.data;
  },

  addComment: async (episodeId, content) => {
    const response = await api.post(`/api/comments/episode/${episodeId}`, { content });
    return response.data;
  },

  deleteComment: async (commentId) => {
    const response = await api.delete(`/api/comments/${commentId}`);
    return response.data;
  },
};

export default commentService;
