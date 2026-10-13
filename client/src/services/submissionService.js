import api from './api';

export const submissionService = {
  async createSubmission(payload) {
    const response = await api.post('/submissions', payload);
    return response.data;
  },

  async runCode(payload) {
    const response = await api.post('/submissions/run', payload);
    return response.data;
  },

  async getMyProgress() {
    const response = await api.get('/submissions/me/progress');
    return response.data;
  },

  async getMySubmissions(params) {
    const response = await api.get('/submissions/me', { params });
    return response.data;
  },

  async getProblemSubmissions(problemId) {
    const response = await api.get(`/problems/${problemId}/submissions`);
    return response.data;
  },
};
