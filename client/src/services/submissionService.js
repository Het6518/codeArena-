import api from './api';

export const submissionService = {
  async createSubmission(payload) {
    const response = await api.post('/submissions', payload);
    return response.data;
  },

  async getMySubmissions() {
    const response = await api.get('/submissions/me');
    return response.data;
  },

  async getProblemSubmissions(problemId) {
    const response = await api.get(`/problems/${problemId}/submissions`);
    return response.data;
  },
};
