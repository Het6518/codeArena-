const TOKEN_KEY = 'codearena_token';

export const tokenStorage = {
  get() {
    return localStorage.getItem(TOKEN_KEY);
  },

  set(token) {
    localStorage.setItem(TOKEN_KEY, token);
  },

  remove() {
    localStorage.removeItem(TOKEN_KEY);
  },
};
