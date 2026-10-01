import axios from 'axios';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'https://senthurvidyalaya-backend.onrender.com/api';

export const authApi = {
  // Login (assuming you have this endpoint in accounts app)
  login: async (username: string, password: string) => {
    const response = await axios.post(`${API_BASE_URL}/accounts/login/`, {
      username,
      password
    });
    return response.data;
  },

  // Register student
  register: async (studentData: any) => {
    const response = await axios.post(`${API_BASE_URL}/accounts/register/`, {
      ...studentData,
      user_type: 'student'
    });
    return response.data;
  },

  // Get current user
  getCurrentUser: async (token?: string) => {
    const headers = token ? { Authorization: `Token ${token}` } : {};
    const response = await axios.get(`${API_BASE_URL}/accounts/me/`, { headers });
    return response.data;
  },

  // Logout
  logout: async () => {
    const response = await axios.post(`${API_BASE_URL}/accounts/logout/`);
    return response.data;
  }
};
