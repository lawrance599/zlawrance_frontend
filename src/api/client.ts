import axios from "axios";

const API_BASE_URL = "https://zlawrance.online/api";

const client = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    "Content-Type": "application/json",
  },
});

// 请求拦截器 - 添加 JWT Token
client.interceptors.request.use((config) => {
  const token = localStorage.getItem("token");
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// 响应拦截器 - 处理错误
client.interceptors.response.use(
  (response) => response,
  (error) => {
    // 只有在调用登录接口时 401 才不清除 token（因为登录失败不应该清除已有 token）
    // 其他接口 401 可能表示 token 过期
    return Promise.reject(error);
  }
);

export default client;
