// TeacherApiService.js
import axios from 'axios';

const API_BASE_URL = 'https://senthurvidyalaya-backend.onrender.com/api';

// Create axios instance with auth token
const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add token to requests
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Token ${token}`;
  }
  return config;
});

// Handle encryption if needed
const encryptData = (data, sessionKey) => {
  // Your encryption logic here
  return data;
};

export const teacherApi = {
  
  // ========== PROFILE ==========
  getProfile: () => api.get('/teacher/profile/'),
  updateProfile: (data) => api.put('/teacher/details/', data),
  
  // ========== ATTENDANCE ==========
  getClassAttendance: (date) => 
    api.get('/attendance/teacher-my-class/', { params: { date } }),
  
  markAttendance: (date, attendanceList) =>
    api.post('/attendance/mark/', { date, attendance_list: attendanceList }),
  
  updateAttendance: (studentId, date, status) =>
    api.put('/attendance/update/', { student_id: studentId, date, status }),
  
  getStudentHistory: (studentId, year) =>
    api.get('/attendance/history/', { params: { student_id: studentId, year } }),
  
  // ========== ASSIGNMENTS ==========
  createAssignment: (data) => {
    const formData = new FormData();
    Object.keys(data).forEach(key => {
      if (key === 'attachment' && data[key]) {
        formData.append(key, data[key]);
      } else {
        formData.append(key, data[key]);
      }
    });
    return api.post('/assignments/teacher/manage/', formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    });
  },
  
  getMyAssignments: (filters = {}) =>
    api.get('/assignments/teacher/manage/', { params: filters }),
  
  updateAssignment: (assignmentId, description) =>
    api.put('/assignments/teacher/manage/', { assignment_id: assignmentId, description }),
  
  deleteAssignment: (assignmentId) =>
    api.delete('/assignments/teacher/manage/', { params: { assignment_id: assignmentId } }),
  
  deleteAssignmentFile: (assignmentId) =>
    api.delete('/assignments/teacher/file/', { params: { assignment_id: assignmentId } }),
  
  repostAssignmentFile: (assignmentId, file) => {
    const formData = new FormData();
    formData.append('assignment_id', assignmentId);
    formData.append('attachment', file);
    return api.post('/assignments/teacher/file/', formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    });
  },
  
  gradeSubmission: (submissionId, marks) =>
    api.post('/assignments/grade/', { submission_id: submissionId, marks }),
  
  getMonthlyReport: (month, year, className, section, subject) =>
    api.get('/assignments/report/', { 
      params: { month, year, class: className, section, subject } 
    }),
  
  // ========== ANNOUNCEMENTS ==========
  createAnnouncement: (data) =>
    api.post('/announcements/create/', data),
  
  getNoticeBoard: (date, className, section) =>
    api.get('/announcements/notice-board/', { 
      params: { date, class: className, section } 
    }),
  
  getMyPosts: (date, className, section) =>
    api.get('/announcements/my-posts/', { 
      params: { date, class: className, section } 
    }),
  
  updateAnnouncement: (date, number, data) =>
    api.put('/announcements/my-posts/', { ...data, date, number }),
  
  deleteAnnouncement: (date, number) =>
    api.delete('/announcements/my-posts/', { params: { date, number } }),
  
  // ========== TIMETABLE ==========
  getClassTimetable: (date = null) =>
    api.get('/timetable/teacher/my-class-timetable/', { 
      params: date ? { date } : {} 
    }),
  
  getMySchedule: (day = null) =>
    api.get('/timetable/my-schedule/', { params: day ? { day } : {} }),
  
  getFreeTeachersForSubstitution: (date, period) =>
    api.get('/timetable/substitution/free-teachers/', { 
      params: { date, period } 
    }),
  
  assignSubstitution: (date, periodNo, subject, teacherId) =>
    api.post('/timetable/substitution/assign/', 
      { period_no: periodNo, subject, teacher_id: teacherId },
      { params: { date } }
    ),
  
  // ========== EXAMS ==========
  uploadMarks: (className, section, marksData) =>
    api.post('/exams/upload/', marksData, { 
      params: { class: className, section } 
    }),
  
  getClassResults: (className, section, examType) =>
    api.get('/exams/class-result/', { 
      params: { class: className, section, exam_type: examType } 
    }),
  
  getSubjectAnalysis: (className, section, subject, examType) =>
    api.get('/exams/subject-analysis/', { 
      params: { class: className, section, subject, exam_type: examType } 
    }),
  
  getStudentMarksDetail: (studentId, examType) =>
    api.get('/exams/student-marks-detail/', { 
      params: { student_id: studentId, exam_type: examType } 
    }),
  
  editMarks: (studentId, subject, examType, marks) =>
    api.put('/exams/edit-marks/', { 
      student_id: studentId, 
      subject, 
      exam_type: examType, 
      marks 
    }),
  
  // ========== REPORTS ==========
  postBehaviorReport: (data) =>
    api.post('/reports/post/', data),
  
  getClassDashboard: (examType) =>
    api.get('/reports/dashboard/', { params: { exam_type: examType } }),
  
  getStudentDetailedReport: (studentId, subject, examType) =>
    api.get('/reports/details/', { 
      params: { student_id: studentId, subject, exam_type: examType } 
    }),
  
  editBehavior: (studentId, subject, data) =>
    api.put('/reports/edit/', { student_id: studentId, subject, ...data }),
  
  getMyReports: (className, section, subject, examType, studentId = null) => {
    const params = { class: className, section, subject, exam_type: examType };
    if (studentId) params.student_id = studentId;
    return api.get('/reports/view-my-reports/', { params });
  },
  
  getClassBehaviorAnalysis: (examType) =>
    api.get('/reports/behavior-dashboard/', { params: { exam_type: examType } }),
  
  // ========== TASKS ==========
  createTask: (data) =>
    api.post('/tasks/create/', data),
  
  getTasks: (className, section, subject, date) =>
    api.get('/tasks/list/', { 
      params: { class: className, section, subject, date } 
    }),
  
  getTaskDetail: (date, taskNumber) =>
    api.get('/tasks/detail/', { params: { date, task_number: taskNumber } }),
  
  updateTask: (date, taskNumber, data) =>
    api.put('/tasks/detail/', { ...data, date, task_number: taskNumber }),
  
  deleteTask: (date, taskNumber) =>
    api.delete('/tasks/detail/', { params: { date, task_number: taskNumber } }),
  
  // ========== STUDENTS ==========
  getMyStudents: () =>
    api.get('/students/list/'),
  
  getStudentDetail: (studentId) =>
    api.get('/students/details/', { params: { student_id: studentId } }),
  
  getSubjectStudents: (className, section, subject) =>
    api.get('/students/subject-teacher-list/', { 
      params: { class: className, section, subject } 
    }),
  
  // ========== PERFORMANCE ==========
  getStudentMarksTrend: (studentId) =>
    api.get('/performance/class/marks/', { params: { student_id: studentId } }),
  
  getStudentBehaviorTrend: (studentId) =>
    api.get('/performance/class/behaviour/', { params: { student_id: studentId } }),
  
  getSubjectMarksTrend: (studentId, subject) =>
    api.get('/performance/subject/marks/', { 
      params: { student_id: studentId, subject } 
    }),
  
  getSubjectBehaviorTrend: (studentId, subject) =>
    api.get('/performance/subject/behaviour/', { 
      params: { student_id: studentId, subject } 
    }),
  
  getExamMarksBreakdown: (studentId, examType) =>
    api.get('/performance/class/exam/marks/', { 
      params: { student_id: studentId, exam_type: examType } 
    }),
  
  getExamBehaviorBreakdown: (studentId, examType) =>
    api.get('/performance/class/exam/behaviour/', { 
      params: { student_id: studentId, exam_type: examType } 
    }),
  
  getBehaviorCategoryTrend: (studentId, subject, behaviorType) =>
    api.get('/performance/subject/behaviour-type/', { 
      params: { student_id: studentId, subject, behaviour_type: behaviorType } 
    }),
  
  // ========== RESOURCES ==========
  createClassResource: (data) => {
    const formData = new FormData();
    Object.keys(data).forEach(key => {
      if (key === 'file' && data[key]) {
        formData.append(key, data[key]);
      } else {
        formData.append(key, data[key]);
      }
    });
    return api.post('/class-resources/manage/', formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    });
  },
  
  getClassResources: (subject = null, date = null) =>
    api.get('/class-resources/manage/', { 
      params: { subject, date } 
    }),
  
  createSubjectMaterial: (data) => {
    const formData = new FormData();
    Object.keys(data).forEach(key => {
      if (key === 'file' && data[key]) {
        formData.append(key, data[key]);
      } else {
        formData.append(key, data[key]);
      }
    });
    return api.post('/subject-materials/manage/', formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    });
  },
  
  getSubjectMaterials: (className, section, subject, date = null) =>
    api.get('/subject-materials/manage/', { 
      params: { class_name: className, section, subject, date } 
    }),
};