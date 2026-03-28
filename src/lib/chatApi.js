import api from './api';

const chatService = {
  getMessages: async (params = { limit: 100 }) => {
    const response = await api.get('/api/chat', { params });
    return response.data;
  },

  sendMessage: async (content) => {
    const response = await api.post('/api/chat', { content });
    return response.data;
  },

  deleteMessage: async (messageId) => {
    const response = await api.delete(`/api/chat/${messageId}`);
    return response.data;
  },
};

export default chatService;
