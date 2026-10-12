import { create } from 'zustand';
import { authService } from '../features/auth/services/authService';
import { tokenStorage } from '../features/auth/services/tokenStorage';
import { disconnectSocket } from '../services/socket';

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
    // The socket authenticated with the old token; drop it so the next user gets a fresh one.
    disconnectSocket();

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

  // Re-fetches the profile, e.g. after a battle changes rating and win/loss counts.
  async refreshUser() {
    try {
      const response = await authService.getCurrentUser();
      set({ user: response.user });
    } catch {
      // Keep the current profile; the next protected request will surface auth problems.
    }
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
    } catch {
      tokenStorage.remove();
      set({ user: null, token: null, isAuthenticated: false, loading: false });
    }
  },
}));
