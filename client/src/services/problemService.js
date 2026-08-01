import api from './api';

export const problemService = {
  async getProblems() {
    const response = await api.get('/problems');
    return response.data;
  },

  async getProblemBySlug(slug) {
    const response = await api.get(`/problems/${slug}`);
    return response.data;
  },

  async getProblemSubmissions(problemId) {
    const response = await api.get(`/problems/${problemId}/submissions`);
    return response.data;
  },
};
