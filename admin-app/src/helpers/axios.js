import axios from 'axios';
import { api } from '../urlConfig';

const axiosInstance = axios.create({
    baseURL: api,
    timeout: 30000
});

let authFailureHandler;

export const setAuthFailureHandler = (handler) => {
    authFailureHandler = handler;
};

export const getApiErrorMessage = (error, fallback = 'The request could not be completed.') => {
    const responseData = error.response?.data;
    const responseMessage = responseData?.message || responseData?.error?.message || responseData?.error;

    if (typeof responseMessage === 'string' && responseMessage.trim()) {
        return responseMessage;
    }
    if (error.code === 'ECONNABORTED') {
        return 'The server took too long to respond. Please try again.';
    }
    if (error.response) {
        return fallback;
    }
    if (error.isAxiosError) {
        return 'Could not connect to the API server. Check your connection and try again.';
    }
    if (typeof error.message === 'string' && error.message.trim()) {
        return error.message;
    }
    return 'Could not connect to the API server. Check your connection and try again.';
};

axiosInstance.interceptors.request.use((config) => {
    const token = window.localStorage.getItem('token');
    config.headers = config.headers || axios.AxiosHeaders.from({});

    if (token) {
        config.headers.set('Authorization', `Bearer ${token}`);
    } else {
        config.headers.delete('Authorization');
    }

    return config;
}, undefined, { synchronous: true });

axiosInstance.interceptors.response.use(
    (response) => response,
    (error) => {
        const requestUrl = error.config?.url || '';
        const isSigninRequest = requestUrl.endsWith('/admin/signin');

        if (error.response?.status === 401 && !isSigninRequest && window.localStorage.getItem('token')) {
            window.localStorage.removeItem('token');
            window.localStorage.removeItem('user');
            authFailureHandler?.();
        }

        return Promise.reject(error);
    }
);

export default axiosInstance;
