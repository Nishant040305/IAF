import axios from 'axios';
import { router } from 'expo-router';

import { clearToken, getToken } from './authStorage';

type UnauthorizedHandler = () => Promise<void> | void;

let unauthorizedHandler: UnauthorizedHandler | null = null;

export const setUnauthorizedHandler = (handler: UnauthorizedHandler | null) => {
  unauthorizedHandler = handler;
};

const apiClient = axios.create();

apiClient.interceptors.request.use(async (config) => {
  const url = config.url || '';
  const isAuthFlow = url.includes('/api/auth/login/');
  if (!isAuthFlow) {
    const token = await getToken();
    if (token) {
      config.headers = {
        ...config.headers,
        Authorization: `Bearer ${token}`,
      };
    }
  }
  return config;
});

apiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    const status = error?.response?.status;
    if (status === 401 || status === 403) {
      if (unauthorizedHandler) {
        await unauthorizedHandler();
      } else {
        await clearToken();
      }
      router.replace('/auth/login');
    }
    return Promise.reject(error);
  }
);

export default apiClient;
