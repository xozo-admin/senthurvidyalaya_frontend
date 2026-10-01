import axios from 'axios';
import toast from 'react-hot-toast';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'https://senthurvidyalaya-backend.onrender.com';

// Create axios instance with default config
const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor to add auth token
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Token ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor to handle errors
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      window.location.href = '/';
    }
    return Promise.reject(error);
  }
);

export interface Student {
  student_id: string;
  student_name: string;
  student_email: string;
  father_name: string;
  mother_name: string;
  father_phone: string;
  mother_phone: string;
  date_of_birth: string;
  gender: 'Male' | 'Female' | 'Other';
  address: string;
  class_name: string;
  section: string;
  extra_details?: Record<string, any>;
}

export interface StudentFilters {
  class_name?: string;
  section?: string;
  gender?: string;
  search?: string;
}

export interface StudentFormData extends Omit<Student, 'student_id'> {
  student_id?: string;
}

export const studentService = {
  // Get all students
  async getAllStudents(filters?: StudentFilters) {
    try {
      const params = new URLSearchParams();
      if (filters?.class_name) params.append('class_name', filters.class_name);
      if (filters?.section) params.append('section', filters.section);
      if (filters?.gender) params.append('gender', filters.gender);
      if (filters?.search) params.append('search', filters.search);

      const response = await api.get(`/api/setup/students/?${params.toString()}`);
      return response.data;
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to fetch students');
      throw error;
    }
  },

  // Get single student
  async getStudentById(studentId: string) {
    try {
      const response = await api.get(`/api/setup/students/${studentId}/`);
      return response.data;
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Student not found');
      throw error;
    }
  },

  // Create student
  async createStudent(data: StudentFormData) {
    try {
      const response = await api.post('/api/setup/students/', data);
      toast.success('Student created successfully');
      return response.data;
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to create student');
      throw error;
    }
  },

  // Update student
  async updateStudent(studentId: string, data: Partial<StudentFormData>) {
    try {
      const response = await api.put(`/api/setup/students/${studentId}/`, data);
      toast.success('Student updated successfully');
      return response.data;
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to update student');
      throw error;
    }
  },

  // Delete student
  async deleteStudent(studentId: string) {
    try {
      await api.delete(`/api/setup/students/${studentId}/`);
      toast.success('Student deleted successfully');
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to delete student');
      throw error;
    }
  },

  // Bulk assign students to class/section
  async bulkAssignStudents(data: {
    class: string;
    section: string;
    students: { student_id: string }[];
  }) {
    try {
      const response = await api.post('/api/student/assign-bulk/', data);
      toast.success('Students assigned successfully');
      return response.data;
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to assign students');
      throw error;
    }
  },

  // Get student profile
  async getStudentProfile(studentId: string) {
    try {
      const response = await api.get(`/api/student/details/?student_id=${studentId}`);
      return response.data;
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to fetch student profile');
      throw error;
    }
  },

  // Get class distribution
  async getClassDistribution() {
    try {
      const response = await api.get('/api/student/list/');
      return response.data;
    } catch (error: any) {
      toast.error('Failed to fetch class distribution');
      throw error;
    }
  }
};