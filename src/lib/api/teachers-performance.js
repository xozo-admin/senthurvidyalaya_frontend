// API functions for teachers performance
const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'https://senthurvidyalaya-backend.onrender.com/api';

export const teachersPerformanceAPI = {
  // Get class teacher marks view
  getClassTeacherMarks: async (token, studentId) => {
    try {
      const response = await fetch(
        `${API_BASE}/performance/class/marks/?student_id=${studentId}`,
        {
          headers: {
            'Authorization': `Token ${token}`,
            'Content-Type': 'application/json',
          },
        }
      );
      return await response.json();
    } catch (error) {
      console.error('Error fetching class teacher marks:', error);
      throw error;
    }
  },

  // Get class teacher behavior view
  getClassTeacherBehaviour: async (token, studentId) => {
    try {
      const response = await fetch(
        `${API_BASE}/performance/class/behaviour/?student_id=${studentId}`,
        {
          headers: {
            'Authorization': `Token ${token}`,
            'Content-Type': 'application/json',
          },
        }
      );
      return await response.json();
    } catch (error) {
      console.error('Error fetching class teacher behaviour:', error);
      throw error;
    }
  },

  // Get subject teacher marks view
  getSubjectTeacherMarks: async (token, studentId, subject) => {
    try {
      const response = await fetch(
        `${API_BASE}/performance/subject/marks/?student_id=${studentId}&subject=${subject}`,
        {
          headers: {
            'Authorization': `Token ${token}`,
            'Content-Type': 'application/json',
          },
        }
      );
      return await response.json();
    } catch (error) {
      console.error('Error fetching subject teacher marks:', error);
      throw error;
    }
  },

  // Get subject teacher behavior view
  getSubjectTeacherBehaviour: async (token, studentId, subject) => {
    try {
      const response = await fetch(
        `${API_BASE}/performance/subject/behaviour/?student_id=${studentId}&subject=${subject}`,
        {
          headers: {
            'Authorization': `Token ${token}`,
            'Content-Type': 'application/json',
          },
        }
      );
      return await response.json();
    } catch (error) {
      console.error('Error fetching subject teacher behaviour:', error);
      throw error;
    }
  },

  // Get exam-specific breakdown
  getExamMarksDetail: async (token, studentId, examType) => {
    try {
      const response = await fetch(
        `${API_BASE}/performance/class/exam/marks/?student_id=${studentId}&exam_type=${examType}`,
        {
          headers: {
            'Authorization': `Token ${token}`,
            'Content-Type': 'application/json',
          },
        }
      );
      return await response.json();
    } catch (error) {
      console.error('Error fetching exam marks detail:', error);
      throw error;
    }
  },

  // Get exam behaviour detail
  getExamBehaviourDetail: async (token, studentId, examType) => {
    try {
      const response = await fetch(
        `${API_BASE}/performance/class/exam/behaviour/?student_id=${studentId}&exam_type=${examType}`,
        {
          headers: {
            'Authorization': `Token ${token}`,
            'Content-Type': 'application/json',
          },
        }
      );
      return await response.json();
    } catch (error) {
      console.error('Error fetching exam behaviour detail:', error);
      throw error;
    }
  },

  // Get specific behaviour trend
  getBehaviourTrend: async (token, studentId, subject, behaviourType) => {
    try {
      const response = await fetch(
        `${API_BASE}/performance/subject/behaviour-type/?student_id=${studentId}&subject=${subject}&behaviour_type=${behaviourType}`,
        {
          headers: {
            'Authorization': `Token ${token}`,
            'Content-Type': 'application/json',
          },
        }
      );
      return await response.json();
    } catch (error) {
      console.error('Error fetching behaviour trend:', error);
      throw error;
    }
  },

  // Get student list for teacher
  getStudentsList: async (token, class_name, section, subject) => {
    try {
      const response = await fetch(
        `${API_BASE}/students/subject-teacher-list/?class=${class_name}&section=${section}&subject=${subject}`,
        {
          headers: {
            'Authorization': `Token ${token}`,
            'Content-Type': 'application/json',
          },
        }
      );
      return await response.json();
    } catch (error) {
      console.error('Error fetching students list:', error);
      throw error;
    }
  },

  // Get subject analysis from exams
  getSubjectAnalysis: async (token, class_name, section, subject, examType) => {
    try {
      const response = await fetch(
        `${API_BASE}/exams/subject-analysis/?class=${class_name}&section=${section}&subject=${subject}&exam_type=${examType}`,
        {
          headers: {
            'Authorization': `Token ${token}`,
            'Content-Type': 'application/json',
          },
        }
      );
      return await response.json();
    } catch (error) {
      console.error('Error fetching subject analysis:', error);
      throw error;
    }
  },
};