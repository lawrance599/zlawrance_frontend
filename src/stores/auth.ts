import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import { authApi, type UserInfo } from '@/api/auth';
import client from '@/api/client';

export const useAuthStore = defineStore('auth', () => {
  const token = ref<string | null>(localStorage.getItem('token'));
  const user = ref<UserInfo | null>(JSON.parse(localStorage.getItem('user') || 'null'));
  const loading = ref(false);
  const error = ref<string | null>(null);

  const isAuthenticated = computed(() => !!token.value);
  const isAdmin = computed(() => user.value?.role === 'admin');

  async function login(login_type: 'username' | 'phone', id: string, password: string) {
    loading.value = true;
    error.value = null;
    try {
      const response = await client.post('/auth/login', { login_type, id, password });
      const newToken = response.data.data;
      token.value = newToken;
      localStorage.setItem('token', newToken);
      console.log('登录成功，token:', newToken);
      return true;
    } catch (e: any) {
      console.error('登录失败:', e);
      error.value = e.response?.data?.data || '登录失败';
      return false;
    } finally {
      loading.value = false;
    }
  }

  function logout() {
    token.value = null;
    user.value = null;
    localStorage.removeItem('token');
    localStorage.removeItem('user');
  }

  async function fetchUser() {
    if (!token.value) return;
    try {
      const userInfo = await authApi.getMe();
      user.value = userInfo;
      localStorage.setItem('user', JSON.stringify(userInfo));
    } catch {
      logout();
    }
  }

  return {
    token,
    user,
    loading,
    error,
    isAuthenticated,
    isAdmin,
    login,
    logout,
    fetchUser,
  };
});
