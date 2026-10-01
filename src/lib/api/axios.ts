import axios from 'axios';
import Cookies from 'js-cookie';

const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL || 'https://senthurvidyalaya-backend.onrender.com',
  headers: {
    'Content-Type': 'application/json',
  },
});

// Attach token
api.interceptors.request.use((config) => {
  const token = Cookies.get('token');
  if (token) {
    config.headers.Authorization = `Token ${token}`;
  }
  return config;
});

// Auto logout on 401
api.interceptors.response.use(
  res => res,
  err => {
    if (err.response?.status === 401) {
      Cookies.remove('token');
      Cookies.remove('session_key');
      Cookies.remove('auth_user');
      Cookies.remove('auth_user_type');
      window.location.href = '/';
    }
    return Promise.reject(err);
  }
);

export default api;
