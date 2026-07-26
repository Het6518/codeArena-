import { create } from 'zustand';
import { authService } from '../features/auth/services/authService';
import { tokenStorage } from '../features/auth/services/tokenStorage';

export const useAuthStore = create((set) => ({
  user: null,
  token: tokenStorage.get(),
  isAuthenticated: Boolean(tokenStorage.get()),
  loading: true,

  login(authData) {
    tokenStorage.set(authData.token);

    set({
      user: authData.user,
      token: authData.token,
      isAuthenticated: true,
      loading: false,
    });
  },

  logout() {
    tokenStorage.remove();

    set({
      user: null,
      token: null,
      isAuthenticated: false,
      loading: false,
    });
  },

  setUser(user) {
    set({
      user,
      isAuthenticated: Boolean(user),
      loading: false,
    });
  },

  async initializeAuth() {
    const token = tokenStorage.get();

    if (!token) {
      set({ user: null, token: null, isAuthenticated: false, loading: false });
      return;
    }

    set({ token, isAuthenticated: true, loading: true });

    try {
      const response = await authService.getCurrentUser();
      const user = response.user || response.data || response;

      set({ user, token, isAuthenticated: true, loading: false });
    } catch (error) {
      tokenStorage.remove();
      set({ user: null, token: null, isAuthenticated: false, loading: false });
    }
  },
}));
