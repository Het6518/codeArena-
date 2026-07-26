import axios from 'axios';
import { API_BASE_URL } from '../constants/app';

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});
// can add the jwt token to the request headers if it exists in local storage, so that the server can authenticate the user and authorize the request. instead of adding the token to the headers in every request, we can use an interceptor to add the token to the headers automatically for every request. This way, we don't have to worry about adding the token to the headers in every request.
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('codearena_token');

  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }

  return config;
});
//An interceptor in Axios is a function that runs before a request is sent or after a response is received.
api.interceptors.response.use(
  (response) => response,
  (error) => {
    const message = error.response?.data?.message || error.message || 'Something went wrong';

    return Promise.reject({
      ...error,
      message,
    });
  },
);

export default api;
