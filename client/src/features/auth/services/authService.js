import api from '../../../services/api';

export const authService = {
  async register(payload) {
    const response = await api.post('/auth/register', payload);
    return response.data;
  },
//axios api call to the backend to login the user and get the token and user data
  async login(payload) {
    const response = await api.post('/auth/login', payload);
    return response.data;
  },

  async getCurrentUser() {
    const response = await api.get('/users/me');
    return response.data;
  },
};
