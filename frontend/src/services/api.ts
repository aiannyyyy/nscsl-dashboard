import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

const api = axios.create({
    baseURL: API_BASE_URL,
    headers: {
        'Content-Type': 'application/json',
    },
    withCredentials: true,
});

api.interceptors.request.use(
    (config) => {
        const token = localStorage.getItem('authToken');

        if (token) {
            config.headers.Authorization = `Bearer ${token}`;
        }

        // Let the browser set multipart boundary — default application/json breaks file uploads
        if (config.data instanceof FormData) {
            delete config.headers['Content-Type'];
        }

        return config;
    },
    (error) => {
        return Promise.reject(error);
    }
);
// Add a response interceptor to handle auth errors
api.interceptors.response.use(
    (response) => response,
    (error) => {
        if (error.response?.status === 401) {
            console.log('❌ 401 Authentication error - redirecting to login');
            // You can add redirect logic here if needed
            // window.location.href = '/login';
        }
        return Promise.reject(error);
    }
);

export function getAxiosErrorMessage(error: unknown, fallback = 'Request failed'): string {
    if (axios.isAxiosError(error)) {
        const data = error.response?.data;
        if (data && typeof data === 'object' && 'error' in data) {
            return String((data as { error?: string }).error || fallback);
        }
        if (typeof data === 'string' && data.trim()) return data;
    }
    if (error instanceof Error && error.message) return error.message;
    return fallback;
}

export default api;