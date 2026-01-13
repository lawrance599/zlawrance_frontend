import client from './client';

export interface LoginParams {
  login_type: 'username' | 'phone';
  id: string;
  password: string;
}

export interface UserInfo {
  id: number;
  username: string;
  role: string;
  phone?: string;
  name?: string;
  department?: string;
}

export const authApi = {
  // 用户名密码登录
  async login(params: LoginParams): Promise<string> {
    const response = await client.post('/auth/login', params);
    return response.data.data;
  },

  // 获取当前用户信息
  async getMe(): Promise<UserInfo> {
    const response = await client.get('/auth/me');
    return response.data.data;
  },

  // 获取 OAuth Provider 列表
  async getOAuthProviders(): Promise<{ id: string; name: string }[]> {
    const response = await client.get('/auth/oauth/providers');
    return response.data.data;
  },

  // OAuth 回调处理
  async handleOAuthCallback(provider: string, code: string, state: string) {
    const response = await client.get(`/auth/oauth/${provider}/callback`, {
      params: { code, state },
    });
    return response.data.data;
  },
};
