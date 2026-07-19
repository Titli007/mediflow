import { create } from 'zustand';
import { apiClient } from '../api/client';
import { getApiErrorMessage } from '../utils/apiError';

interface User {
  id: number;
  email: string;
  phone?: string;
  full_name?: string;
  created_at: string;
}

interface AuthState {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
  login: (email: string, password: string) => Promise<boolean>;
  register: (email: string, password: string, fullName: string, phone: string) => Promise<boolean>;
  logout: () => void;
  fetchCurrentUser: () => Promise<void>;
  clearError: () => void;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  token: localStorage.getItem('mediflow_token'),
  isAuthenticated: !!localStorage.getItem('mediflow_token'),
  isLoading: false,
  error: null,

  clearError: () => set({ error: null }),

  login: async (email, password) => {
    set({ isLoading: true, error: null });
    try {
      const formData = new URLSearchParams();
      formData.append('username', email);
      formData.append('password', password);

      const response = await apiClient.post('/api/auth/token', formData, {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
      });

      const { access_token } = response.data;
      localStorage.setItem('mediflow_token', access_token);
      set({ token: access_token, isAuthenticated: true });
      
      await get().fetchCurrentUser();
      set({ isLoading: false });
      return true;
    } catch (err: any) {
      const errorMsg = getApiErrorMessage(err, 'Invalid email or password');
      set({ error: errorMsg, isLoading: false, isAuthenticated: false, token: null });
      return false;
    }
  },

  register: async (email, password, fullName, phone) => {
    set({ isLoading: true, error: null });
    try {
      await apiClient.post('/api/auth/register', {
        email,
        password,
        full_name: fullName,
        phone,
      });
      set({ isLoading: false });
      return await get().login(email, password);
    } catch (err: any) {
      const errorMsg = getApiErrorMessage(err, 'Registration failed. Email may already be registered.');
      set({ error: errorMsg, isLoading: false });
      return false;
    }
  },

  logout: () => {
    localStorage.removeItem('mediflow_token');
    set({ user: null, token: null, isAuthenticated: false });
  },

  fetchCurrentUser: async () => {
    try {
      const response = await apiClient.get('/api/auth/me');
      set({ user: response.data, isAuthenticated: true });
    } catch (err) {
      get().logout();
    }
  },
}));
