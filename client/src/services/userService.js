import api from './api';

export const userService = {
  async getLeaderboard(params) {
    const response = await api.get('/users/leaderboard', { params });
    return response.data;
  },

  async getMyBattles(params) {
    const response = await api.get('/users/me/battles', { params });
    return response.data;
  },
};
