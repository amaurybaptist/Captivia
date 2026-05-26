import axios, { AxiosError, InternalAxiosRequestConfig } from 'axios';

const DEFAULT_API = 'http://localhost:3001';
const BACKEND_PORT = '3001';

function getApiBase(): string {
  if (typeof window !== 'undefined') {
    const host = window.location.hostname;
    if (host !== 'localhost' && host !== '127.0.0.1') {
      return `http://${host}:${BACKEND_PORT}`;
    }
  }
  const raw = process.env.NEXT_PUBLIC_API_URL || DEFAULT_API;
  const base = (typeof raw === 'string' ? raw : '').trim() || DEFAULT_API;
  if (!/^https?:\/\//i.test(base)) return DEFAULT_API;
  try {
    new URL(base);
    return base;
  } catch {
    return DEFAULT_API;
  }
}

export const BACKEND_UNAVAILABLE_MESSAGE =
  'Backend non connecté. En local, lancez-le avec : cd backend && npm run start:dev (port 3001).';

export function isBackendUnavailable(err: unknown): boolean {
  if (err instanceof AxiosError && !err.response) return true;
  return err instanceof Error && err.message === BACKEND_UNAVAILABLE_MESSAGE;
}

const apiClient = axios.create({
  baseURL: getApiBase(),
  timeout: 15000,
  headers: { 'Content-Type': 'application/json' },
});

apiClient.interceptors.request.use((config: InternalAxiosRequestConfig) => {
  if (typeof window !== 'undefined') {
    const token = localStorage.getItem('token');
    if (token && config.headers) {
      config.headers.Authorization = `Bearer ${token}`;
    }
  }
  return config;
});

apiClient.interceptors.response.use(
  (response) => response,
  (error: AxiosError) => {
    if (!error.response) {
      return Promise.reject(new Error(BACKEND_UNAVAILABLE_MESSAGE));
    }

    const status = error.response.status;
    if (status === 401 || status === 403) {
      if (typeof window !== 'undefined') {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        window.dispatchEvent(new CustomEvent('auth:logout'));
      }
    }

    const data = error.response.data as { message?: string | string[] };
    const message = Array.isArray(data?.message)
      ? data.message.join(', ')
      : data?.message || error.message;

    return Promise.reject(new Error(message));
  },
);

export default apiClient;
