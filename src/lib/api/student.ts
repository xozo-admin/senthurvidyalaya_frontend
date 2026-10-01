// lib/api/student.ts
import axios from 'axios';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'https://senthurvidyalaya-backend.onrender.com';

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add auth token to requests
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Token ${token}`;
  }
  return config;
});

export const studentApi = {
  // Get student's own profile
  getProfile: async () => {
    const response = await api.get('/api/student/profile/');
    return response.data;
  },

  // Get student details by ID (for teachers/admins)
  getStudentDetails: async (studentId: string) => {
    const response = await api.get(`/api/student/details/?student_id=${studentId}`);
    return response.data;
  },

  // Get list of students (class roster)
  getClassRoster: async (className?: string, section?: string) => {
    const params = new URLSearchParams();
    if (className) params.append('class', className);
    if (section) params.append('section', section);
    
    const response = await api.get(`/api/student/list/?${params.toString()}`);
    return response.data;
  },

  // Update student profile
  updateProfile: async (data: any) => {
    const response = await api.put('/api/student/profile/', data);
    return response.data;
  },

  // Get timetable
  getTimetable: async () => {
    const response = await api.get('/api/timetable/student/');
    return response.data;
  },

  // Get attendance
  getAttendance: async (month?: string, year?: string) => {
    const params = new URLSearchParams();
    if (month) params.append('month', month);
    if (year) params.append('year', year);
    
    const response = await api.get(`/api/attendance/student/?${params.toString()}`);
    return response.data;
  },

  // Get subjects
  getSubjects: async () => {
    const response = await api.get('/api/subjects/student/');
    return response.data;
  },

  // Get assignments
  getAssignments: async (status?: 'pending' | 'submitted' | 'graded') => {
    const params = new URLSearchParams();
    if (status) params.append('status', status);
    
    const response = await api.get(`/api/assignments/student/?${params.toString()}`);
    return response.data;
  },

  // Get grades
  getGrades: async () => {
    const response = await api.get('/api/grades/student/');
    return response.data;
  },

  // Get announcements
  getAnnouncements: async () => {
    const response = await api.get('/api/announcements/');
    return response.data;
  },
};