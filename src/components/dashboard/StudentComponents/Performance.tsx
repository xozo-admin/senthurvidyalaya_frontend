// app/components/management/StudentPerformancePage.tsx
'use client';

import { useEffect, useState, useMemo, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import {
  FaUserGraduate,
  FaChartLine,
  FaChartBar,
  FaChartPie,
  FaSchool,
  FaFilter,
  FaSearch,
  FaSort,
  FaSortUp,
  FaSortDown,
  FaEye,
  FaDownload,
  FaArrowLeft,
  FaChevronLeft,
  FaChevronRight,
  FaBook,
  FaUser,
  FaCalendar,
  FaPercentage,
  FaCrown,
  FaMedal,
  FaTrophy,
  FaStar,
  FaClipboardCheck,
  FaUsers,
  FaCheckCircle,
  FaTimesCircle,
  FaMinusCircle,
  FaInfoCircle,
  FaExclamationTriangle,
  FaLightbulb,
  FaUserCheck,
  FaUserFriends,
  FaBrain,
  FaRegSadTear,
  FaRegSmile,
  FaRegMeh,
  FaComments,
  FaTasks,
  FaHandsHelping,
  FaUserShield,
  FaSync,
  FaExternalLinkAlt,
  FaExpand,
  FaCompress,
  FaBell
} from 'react-icons/fa';
import { 
  TrendingUp, 
  TrendingDown, 
  Minus,
  AlertCircle,
  Target,
  Award,
  BarChart3,
  LineChart,
  PieChart,
  Activity,
  Brain,
  Target as TargetIcon,
  Zap,
  Star,
  CheckCircle,
  XCircle,
  ChevronRight,
  Download,
  Filter,
  Search,
  User,
  Calendar,
  BookOpen,
  GraduationCap,
  Trophy
} from 'lucide-react';
import { useTheme } from '@/contexts/ThemeContext';
import { useThemeClasses } from '@/hooks/useThemeClasses';
import { toastSuccess, toastError, toastInfo, toastWarning } from '@/lib/toast';

interface Student {
  student_id: string;
  student_name: string;
  class_name: string | null;
  section: string | null;
  gender: string;
}

interface PerformanceData {
  status: number;
  type: 'marks' | 'behaviour';
  student?: string;
  subject?: string;
  viewed_by?: string;
  filter_applied?: string;
  graph_data: GraphDataItem[];
}

interface GraphDataItem {
  exam: string;
  value: number;
  change_percentage: number;
  trend: 'increase' | 'decrease' | 'neutral';
}

interface ExamBreakdown {
  status: number;
  student: string;
  exam_type: string;
  term: string;
  breakdown: SubjectBreakdown[];
}

interface SubjectBreakdown {
  subject: string;
  mark: number;
  max_mark: number;
  grade: string;
}

interface StudentPerformanceSummary {
  student_id: string;
  student_name: string;
  class_name: string;
  section: string;
  average_marks: number;
  average_behaviour: number;
  total_subjects: number;
  top_subject: string;
  weakest_subject: string;
  attendance_rate: number;
  overall_trend: 'improving' | 'declining' | 'stable';
}

interface ApiResponse<T> {
  status: number;
  data?: T;
  message?: string;
}

type PerformanceType = 'overall' | 'subject' | 'behaviour' | 'detailed';
type TimeFilter = 'all' | 'Term 1' | 'Term 2' | 'Term 3' | 'annual';
type SortField = 'name' | 'average_marks' | 'average_behaviour' | 'class';
type SortDirection = 'asc' | 'desc';

const BEHAVIOUR_TYPES = [
  { id: 'participation', label: 'Class Participation', icon: FaUserFriends },
  { id: 'responsibility', label: 'Homework Responsibility', icon: FaClipboardCheck },
  { id: 'discipline', label: 'Classroom Discipline', icon: FaUserShield },
  { id: 'attitude', label: 'Learning Attitude', icon: FaBrain },
  { id: 'collaboration', label: 'Social Collaboration', icon: FaHandsHelping }
];

// API service functions
const apiService = {
  getToken: () => localStorage.getItem('token'),
  
  async fetchWithAuth<T>(url: string, options?: RequestInit): Promise<ApiResponse<T>> {
    const token = this.getToken();
    const headers = {
      'Authorization': `Token ${token}`,
      'Content-Type': 'application/json',
      ...options?.headers,
    };

    try {
      const response = await fetch(url, { ...options, headers });
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.message || `HTTP ${response.status}: ${response.statusText}`);
      }
      
      return { status: response.status, data };
    } catch (error) {
      console.error('API Error:', error);
      return { 
        status: 500, 
        message: error instanceof Error ? error.message : 'Unknown error occurred' 
      };
    }
  },

  // Student endpoints
  async fetchStudents(): Promise<ApiResponse<Student[]>> {
    return this.fetchWithAuth<Student[]>('https://senthurvidyalaya-backend.onrender.com/api/schooladmin/students/');
  },

  async fetchPerformanceData(studentId: string, timeFilter: TimeFilter = 'all'): Promise<ApiResponse<PerformanceData>> {
    let url = `https://senthurvidyalaya-backend.onrender.com/api/performance/admin/marks/?student_id=${studentId}`;
    if (timeFilter !== 'all') {
      url += `&term=${encodeURIComponent(timeFilter)}`;
    }
    return this.fetchWithAuth<PerformanceData>(url);
  },

  async fetchBehaviourData(studentId: string): Promise<ApiResponse<PerformanceData>> {
    const url = `https://senthurvidyalaya-backend.onrender.com/api/performance/admin/behaviour/?student_id=${studentId}`;
    return this.fetchWithAuth<PerformanceData>(url);
  },

  async fetchSubjectPerformance(studentId: string, subject: string, timeFilter: TimeFilter = 'all'): Promise<ApiResponse<PerformanceData>> {
    let url = `https://senthurvidyalaya-backend.onrender.com/api/performance/admin/marks/?student_id=${studentId}&subject=${encodeURIComponent(subject)}`;
    if (timeFilter !== 'all') {
      url += `&term=${encodeURIComponent(timeFilter)}`;
    }
    return this.fetchWithAuth<PerformanceData>(url);
  },

  async fetchBehaviourTypeData(studentId: string, subject: string, behaviourType: string): Promise<ApiResponse<PerformanceData>> {
    const url = `https://senthurvidyalaya-backend.onrender.com/api/performance/admin/behaviour-type/?student_id=${studentId}&subject=${encodeURIComponent(subject)}&behaviour_type=${behaviourType}`;
    return this.fetchWithAuth<PerformanceData>(url);
  },

  async fetchExamBreakdown(studentId: string, examType: string, term: string): Promise<ApiResponse<ExamBreakdown>> {
    const url = `https://senthurvidyalaya-backend.onrender.com/api/performance/admin/exam/breakdown/?student_id=${studentId}&exam_type=${encodeURIComponent(examType)}&term=${encodeURIComponent(term)}`;
    return this.fetchWithAuth<ExamBreakdown>(url);
  },

  async fetchStudentSubjects(classId: string): Promise<ApiResponse<string[]>> {
    const url = `https://senthurvidyalaya-backend.onrender.com/api/subjects/?class=${classId}`;
    const response = await this.fetchWithAuth<any>(url);
    
    if (response.data?.subjects) {
      const subjects = response.data.subjects.map((subject: any) => subject.name);
      return { status: response.status, data: subjects };
    }
    
    return { status: response.status, data: [] };
  },

  async fetchAttendanceData(studentId: string, year: number): Promise<ApiResponse<any>> {
    const url = `https://senthurvidyalaya-backend.onrender.com/api/attendance/history/?student_id=${studentId}&year=${year}`;
    return this.fetchWithAuth(url);
  },

  async fetchAvailableExams(): Promise<ApiResponse<{name: string, term: string}[]>> {
    const response = await this.fetchWithAuth<any[]>('https://senthurvidyalaya-backend.onrender.com/api/exams/list/');
    
    if (response.data) {
      const examTypes = response.data.map((exam: any) => ({
        name: exam.name,
        term: exam.term_name
      }));
      return { status: response.status, data: examTypes };
    }
    
    return { status: response.status, data: [] };
  }
};

export const StudentPerformancePage = () => {
  const router = useRouter();
  const { theme } = useTheme();
  const { get, combine } = useThemeClasses();
  
  const [students, setStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);
  const [selectedSubject, setSelectedSubject] = useState<string>('');
  const [selectedBehaviourType, setSelectedBehaviourType] = useState<string>('participation');
  const [performanceType, setPerformanceType] = useState<PerformanceType>('overall');
  const [timeFilter, setTimeFilter] = useState<TimeFilter>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(10);
  const [sortConfig, setSortConfig] = useState<{ field: SortField; direction: SortDirection }>({
    field: 'average_marks',
    direction: 'desc'
  });
  
  const [performanceData, setPerformanceData] = useState<PerformanceData | null>(null);
  const [examBreakdown, setExamBreakdown] = useState<ExamBreakdown | null>(null);
  const [behaviourData, setBehaviourData] = useState<PerformanceData | null>(null);
  const [subjectBehaviours, setSubjectBehaviours] = useState<PerformanceData | null>(null);
  const [behaviourTypeData, setBehaviourTypeData] = useState<PerformanceData | null>(null);
  const [performanceSummary, setPerformanceSummary] = useState<StudentPerformanceSummary[]>([]);
  const [availableSubjects, setAvailableSubjects] = useState<string[]>([]);
  const [availableExams, setAvailableExams] = useState<{name: string, term: string}[]>([]);
  const [availableTerms, setAvailableTerms] = useState<string[]>(['Term 1', 'Term 2', 'Term 3', 'annual']);
  
  const [loadingPerformance, setLoadingPerformance] = useState(false);
  const [loadingBreakdown, setLoadingBreakdown] = useState(false);
  const [loadingBehaviour, setLoadingBehaviour] = useState(false);
  const [loadingSubjectBehaviour, setLoadingSubjectBehaviour] = useState(false);
  const [loadingBehaviourType, setLoadingBehaviourType] = useState(false);
  const [loadingSubjects, setLoadingSubjects] = useState(false);
  const [showExportMenu, setShowExportMenu] = useState(false);
  const [showFullScreen, setShowFullScreen] = useState(false);
  const [selectedExamType, setSelectedExamType] = useState<string>('');
  const [selectedTerm, setSelectedTerm] = useState<string>('Term 1');
  const [error, setError] = useState<string | null>(null);

  // Theme-aware CSS classes
  const getBgClass = () => combine(
    get('bg', 'primary'),
    'min-h-screen transition-colors duration-200'
  );

  const getCardGradientClass = (color: string = 'blue') => {
    const baseClasses = combine(
      'rounded-2xl p-6 border shadow-lg transition-all duration-300 group hover:shadow-xl my-2',
      get('border', 'primary')
    );

    const gradients: Record<string, string> = {
      blue: theme === 'dark' 
        ? 'from-gray-800 to-blue-900/10' 
        : 'from-white to-blue-50',
      emerald: theme === 'dark'
        ? 'from-gray-800 to-emerald-900/10'
        : 'from-white to-emerald-50',
      amber: theme === 'dark'
        ? 'from-gray-800 to-amber-900/10'
        : 'from-white to-amber-50',
      pink: theme === 'dark'
        ? 'from-gray-800 to-pink-900/10'
        : 'from-white to-pink-50',
      indigo: theme === 'dark'
        ? 'from-gray-800 to-indigo-900/10'
        : 'from-white to-indigo-50',
      purple: theme === 'dark'
        ? 'from-gray-800 to-purple-900/10'
        : 'from-white to-purple-50',
      green: theme === 'dark'
        ? 'from-gray-800 to-green-900/10'
        : 'from-white to-green-50',
      red: theme === 'dark'
        ? 'from-gray-800 to-red-900/10'
        : 'from-white to-red-50'
    };

    return combine(baseClasses, 'bg-gradient-to-br', gradients[color] || gradients.blue);
  };

  const getStatsCardClass = (color: 'blue' | 'emerald' | 'amber' | 'pink' | 'indigo' | 'purple' | 'green' | 'red' = 'blue') => {
    return getCardGradientClass(color);
  };

  const getInputClass = () => combine(
    'px-4 py-3.5 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all w-full',
    'text-sm',
    get('bg', 'card'),
    get('border', 'secondary'),
    get('text', 'primary'),
    'placeholder:text-sm placeholder:text-[var(--color-text-tertiary)]',
    'hover:border-[var(--color-border-strong)]',
    'focus:border-[var(--color-accent-primary)]'
  );

  const getPrimaryButtonClass = () => combine(
    'px-6 py-3.5 rounded-xl transition-all duration-200 font-medium',
    'text-white shadow-lg hover:shadow-xl hover:scale-[1.02] active:scale-[0.98]',
    'text-sm',
    theme === 'dark'
      ? 'bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800'
      : 'bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700'
  );

  const getSecondaryButtonClass = () => combine(
    'px-4 py-3 rounded-xl transition-all duration-200 font-medium hover:scale-[1.02] active:scale-[0.98]',
    'text-sm',
    'border',
    get('border', 'secondary'),
    get('bg', 'card'),
    get('text', 'secondary'),
    'hover:bg-[var(--color-bg-hover)] hover:text-[var(--color-text-primary)]'
  );

  // Initial data fetch
  useEffect(() => {
    fetchInitialData();
  }, []);

  // Fetch all data when student is selected or filters change
  useEffect(() => {
    if (selectedStudent) {
      fetchStudentData();
    }
  }, [selectedStudent, timeFilter]);

  // Fetch subject-specific data when subject changes
  useEffect(() => {
    if (selectedStudent && selectedSubject) {
      fetchSubjectData();
    }
  }, [selectedStudent, selectedSubject, timeFilter]);

  // Fetch behaviour type data when type changes
  useEffect(() => {
    if (selectedStudent && selectedSubject && selectedBehaviourType) {
      fetchBehaviourTypeSpecificData();
    }
  }, [selectedStudent, selectedSubject, selectedBehaviourType]);

  const fetchInitialData = async () => {
    setLoading(true);
    setError(null);
    
    try {
      const [studentsResponse, examsResponse] = await Promise.all([
        apiService.fetchStudents(),
        apiService.fetchAvailableExams()
      ]);

      if (studentsResponse.status === 200 && studentsResponse.data) {
        setStudents(studentsResponse.data);
      } else {
        throw new Error(studentsResponse.message || 'Failed to fetch students');
      }

      if (examsResponse.status === 200 && examsResponse.data) {
        setAvailableExams(examsResponse.data);
        const terms = [...new Set(examsResponse.data.map(exam => exam.term))];
        setAvailableTerms(terms.length > 0 ? terms : ['Term 1', 'Term 2', 'Term 3', 'annual']);
        
        if (examsResponse.data.length > 0) {
          setSelectedExamType(examsResponse.data[0].name);
          setSelectedTerm(examsResponse.data[0].term);
        }
      }
      
      toastSuccess('Data loaded successfully');
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to load initial data';
      setError(message);
      toastError(message);
    } finally {
      setLoading(false);
    }
  };

  const fetchStudentData = async () => {
    if (!selectedStudent) return;

    setError(null);
    
    try {
      // Reset states
      setPerformanceData(null);
      setBehaviourData(null);
      setSubjectBehaviours(null);
      setBehaviourTypeData(null);
      setExamBreakdown(null);
      setAvailableSubjects([]);
      setSelectedSubject('');
      
      // Fetch all student data in parallel
      const [performanceResponse, behaviourResponse, subjectsResponse] = await Promise.all([
        apiService.fetchPerformanceData(selectedStudent.student_id, timeFilter),
        apiService.fetchBehaviourData(selectedStudent.student_id),
        selectedStudent.class_name ? apiService.fetchStudentSubjects(selectedStudent.class_name) : Promise.resolve({ status: 200, data: [] })
      ]);

      // Handle performance data
      if (performanceResponse.status === 200 && performanceResponse.data) {
        setPerformanceData(performanceResponse.data);
      } else if (performanceResponse.status !== 404) {
        throw new Error(performanceResponse.message || 'Failed to fetch performance data');
      }

      // Handle behaviour data
      if (behaviourResponse.status === 200 && behaviourResponse.data) {
        setBehaviourData(behaviourResponse.data);
      } else if (behaviourResponse.status !== 404) {
        throw new Error(behaviourResponse.message || 'Failed to fetch behaviour data');
      }

      // Handle subjects
      if (subjectsResponse.status === 200 && subjectsResponse.data) {
        setAvailableSubjects(subjectsResponse.data);
        if (subjectsResponse.data.length > 0 && !selectedSubject) {
          setSelectedSubject(subjectsResponse.data[0]);
        }
      }

      // Calculate summary
      calculatePerformanceSummary(
        performanceResponse.data,
        behaviourResponse.data,
        subjectsResponse.data || []
      );

    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to fetch student data';
      setError(message);
      toastError(message);
    } finally {
      setLoadingPerformance(false);
      setLoadingBehaviour(false);
      setLoadingSubjects(false);
    }
  };

  const fetchSubjectData = async () => {
    if (!selectedStudent || !selectedSubject) return;

    setLoadingSubjectBehaviour(true);
    setError(null);

    try {
      const response = await apiService.fetchSubjectPerformance(
        selectedStudent.student_id,
        selectedSubject,
        timeFilter
      );

      if (response.status === 200 && response.data) {
        setSubjectBehaviours(response.data);
      } else if (response.status === 404) {
        setSubjectBehaviours(null);
        toastInfo(`No data available for ${selectedSubject}`);
      } else {
        throw new Error(response.message || 'Failed to fetch subject performance');
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to fetch subject data';
      setError(message);
      toastError(message);
    } finally {
      setLoadingSubjectBehaviour(false);
    }
  };

  const fetchBehaviourTypeSpecificData = async () => {
    if (!selectedStudent || !selectedSubject || !selectedBehaviourType) return;

    setLoadingBehaviourType(true);
    setError(null);

    try {
      const response = await apiService.fetchBehaviourTypeData(
        selectedStudent.student_id,
        selectedSubject,
        selectedBehaviourType
      );

      if (response.status === 200 && response.data) {
        setBehaviourTypeData(response.data);
      } else if (response.status === 404) {
        setBehaviourTypeData(null);
        toastInfo(`No behaviour data available for ${selectedBehaviourType}`);
      } else {
        throw new Error(response.message || 'Failed to fetch behaviour type data');
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to fetch behaviour type data';
      setError(message);
      toastError(message);
    } finally {
      setLoadingBehaviourType(false);
    }
  };

  const handleFetchExamBreakdown = async () => {
    if (!selectedStudent || !selectedExamType || !selectedTerm) {
      toastWarning('Please select an exam type and term');
      return;
    }

    setLoadingBreakdown(true);
    setError(null);

    try {
      const response = await apiService.fetchExamBreakdown(
        selectedStudent.student_id,
        selectedExamType,
        selectedTerm
      );

      if (response.status === 200 && response.data) {
        setExamBreakdown(response.data);
        toastSuccess('Exam breakdown loaded successfully');
      } else if (response.status === 404) {
        setExamBreakdown(null);
        toastInfo('No exam breakdown available for the selected criteria');
      } else {
        throw new Error(response.message || 'Failed to fetch exam breakdown');
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to fetch exam breakdown';
      setError(message);
      toastError(message);
    } finally {
      setLoadingBreakdown(false);
    }
  };

  const calculatePerformanceSummary = async (
    perfData: PerformanceData | null | any,
    behData: PerformanceData | null | any,
    subjects: string[]
  ) => {
    if (!selectedStudent) return;

    try {
      // Calculate average marks
      const averageMarks = perfData?.graph_data?.length > 0
        ? perfData.graph_data.reduce((acc: any, item: { value: any; }) => acc + item.value, 0) / perfData.graph_data.length
        : 0;

      // Calculate average behaviour
      const averageBehaviour = behData?.graph_data?.length > 0
        ? behData.graph_data.reduce((acc: any, item: { value: any; }) => acc + item.value, 0) / behData.graph_data.length
        : 0;

      // Determine top and weakest subjects
      let topSubject = 'N/A';
      let weakestSubject = 'N/A';
      
      if (subjects.length > 0) {
        // In a real implementation, you would fetch actual subject marks
        // For now, using the first and last subject as placeholders
        topSubject = subjects[0];
        weakestSubject = subjects[subjects.length - 1];
      }

      // Determine overall trend
      let overallTrend: 'improving' | 'declining' | 'stable' = 'stable';
      if (perfData?.graph_data && perfData.graph_data.length >= 2) {
        const lastTwo = perfData.graph_data.slice(-2);
        if (lastTwo[1].value > lastTwo[0].value) {
          overallTrend = 'improving';
        } else if (lastTwo[1].value < lastTwo[0].value) {
          overallTrend = 'declining';
        }
      }

      // Fetch attendance data
      let attendanceRate = 0;
      try {
        const currentYear = new Date().getFullYear();
        const attendanceResponse = await apiService.fetchAttendanceData(selectedStudent.student_id, currentYear);
        
        if (attendanceResponse.status === 200 && attendanceResponse.data?.annual_summary) {
          const { present, absent, late } = attendanceResponse.data.annual_summary;
          const total = present + absent + late;
          attendanceRate = total > 0 ? (present / total) * 100 : 0;
        }
      } catch (error) {
        console.warn('Could not fetch attendance data:', error);
      }

      const summary: StudentPerformanceSummary = {
        student_id: selectedStudent.student_id,
        student_name: selectedStudent.student_name,
        class_name: selectedStudent.class_name || 'Not Assigned',
        section: selectedStudent.section || 'Not Assigned',
        average_marks: parseFloat(averageMarks.toFixed(1)),
        average_behaviour: parseFloat(averageBehaviour.toFixed(1)),
        total_subjects: subjects.length,
        top_subject: topSubject,
        weakest_subject: weakestSubject,
        attendance_rate: parseFloat(attendanceRate.toFixed(1)),
        overall_trend: overallTrend
      };

      setPerformanceSummary([summary]);
    } catch (error) {
      console.error('Error calculating performance summary:', error);
    }
  };

  const handleSort = (field: SortField) => {
    setSortConfig(current => ({
      field,
      direction: current.field === field && current.direction === 'desc' ? 'asc' : 'desc'
    }));
  };

  const filteredStudents = useMemo(() => {
    return students.filter(student => 
      student.student_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      student.student_id.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (student.class_name && student.class_name.toLowerCase().includes(searchTerm.toLowerCase()))
    );
  }, [students, searchTerm]);

  const sortedStudents = useMemo(() => {
    return [...filteredStudents].sort((a, b) => {
      const aValue = a[sortConfig.field as keyof Student];
      const bValue = b[sortConfig.field as keyof Student];
      
      if (aValue === null || bValue === null) return 0;
      
      if (typeof aValue === 'string' && typeof bValue === 'string') {
        return sortConfig.direction === 'asc' 
          ? aValue.localeCompare(bValue)
          : bValue.localeCompare(aValue);
      }
      
      return 0;
    });
  }, [filteredStudents, sortConfig]);

  const totalPages = Math.ceil(sortedStudents.length / itemsPerPage);
  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentStudents = sortedStudents.slice(indexOfFirstItem, indexOfLastItem);

  const getTrendIcon = (trend: string) => {
    switch (trend) {
      case 'increase':
        return <TrendingUp className="h-4 w-4 text-green-500" />;
      case 'decrease':
        return <TrendingDown className="h-4 w-4 text-red-500" />;
      default:
        return <Minus className="h-4 w-4 text-gray-500" />;
    }
  };

  const getGradeColor = (grade: string) => {
    const gradeColors: Record<string, string> = {
      'S': theme === 'dark' ? 'text-green-400' : 'text-green-700',
      'A+': theme === 'dark' ? 'text-green-400' : 'text-green-700',
      'A': theme === 'dark' ? 'text-green-400' : 'text-green-700',
      'B+': theme === 'dark' ? 'text-blue-400' : 'text-blue-700',
      'B': theme === 'dark' ? 'text-blue-400' : 'text-blue-700',
      'C+': theme === 'dark' ? 'text-yellow-400' : 'text-yellow-700',
      'C': theme === 'dark' ? 'text-yellow-400' : 'text-yellow-700',
      'D': theme === 'dark' ? 'text-orange-400' : 'text-orange-700',
      'E': theme === 'dark' ? 'text-orange-400' : 'text-orange-700',
      'F': theme === 'dark' ? 'text-red-400' : 'text-red-700'
    };

    return gradeColors[grade] || get('text', 'primary');
  };

  const getMarkColor = (mark: number, maxMark: number) => {
    const percentage = (mark / maxMark) * 100;
    if (percentage >= 90) return theme === 'dark' ? 'text-green-400' : 'text-green-700';
    if (percentage >= 75) return theme === 'dark' ? 'text-blue-400' : 'text-blue-700';
    if (percentage >= 60) return theme === 'dark' ? 'text-yellow-400' : 'text-yellow-700';
    if (percentage >= 40) return theme === 'dark' ? 'text-orange-400' : 'text-orange-700';
    return theme === 'dark' ? 'text-red-400' : 'text-red-700';
  };

  const exportPerformanceReport = () => {
    if (!selectedStudent) {
      toastWarning('Please select a student first');
      return;
    }
    
    const report = {
      student: selectedStudent,
      performance: performanceData,
      behaviour: behaviourData,
      subject_performance: subjectBehaviours,
      behaviour_type_data: behaviourTypeData,
      exam_breakdown: examBreakdown,
      summary: performanceSummary[0],
      timestamp: new Date().toISOString(),
      filters: { timeFilter, performanceType }
    };
    
    const dataStr = JSON.stringify(report, null, 2);
    const dataUri = 'data:application/json;charset=utf-8,'+ encodeURIComponent(dataStr);
    const exportFileDefaultName = `performance_report_${selectedStudent.student_id}_${new Date().toISOString().split('T')[0]}.json`;
    
    const linkElement = document.createElement('a');
    linkElement.setAttribute('href', dataUri);
    linkElement.setAttribute('download', exportFileDefaultName);
    linkElement.click();
    
    toastSuccess('Performance report exported successfully');
    setShowExportMenu(false);
  };

  const viewStudentDetails = async (student: Student) => {
    setSelectedStudent(student);
    setPerformanceType('overall');
    setSelectedSubject('');
    setSelectedBehaviourType('participation');
    setTimeFilter('all');
  };

  const renderPerformanceChart = (data: PerformanceData | null, title: string, loading: boolean) => {
    if (loading) {
      return (
        <div className="flex flex-col items-center justify-center h-64 space-y-4">
          <div className={combine(
            "animate-spin rounded-full h-12 w-12 border-4",
            theme === 'dark' ? 'border-blue-500 border-t-transparent' : 'border-blue-600 border-t-transparent'
          )}></div>
          <p className={combine("text-sm", get('text', 'secondary'))}>Loading chart data...</p>
        </div>
      );
    }

    if (!data?.graph_data || data.graph_data.length === 0) {
      return (
        <div className="flex flex-col items-center justify-center h-64 p-6">
          <FaRegSadTear className={combine("h-16 w-16 mb-4", get('icon', 'secondary'))} />
          <p className={combine("text-lg font-medium text-center", get('text', 'primary'))}>No data available</p>
          <p className={combine("text-sm mt-2 text-center", get('text', 'secondary'))}>
            {performanceType === 'overall' ? 'No performance data found for the selected period' :
             performanceType === 'subject' ? 'No subject-specific data available' :
             'No behaviour data available'}
          </p>
          {error && (
            <p className={combine("text-xs mt-4 text-center", get('status', 'error'))}>
              Error: {error}
            </p>
          )}
        </div>
      );
    }

    const maxValue = Math.max(...data.graph_data.map(item => item.value));
    const minValue = Math.min(...data.graph_data.map(item => item.value));
    const range = maxValue - minValue;

    return (
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h4 className={combine("font-semibold text-lg", get('text', 'primary'))}>{title}</h4>
            {data.filter_applied && (
              <p className={combine("text-sm mt-1", get('text', 'tertiary'))}>
                Filter: {data.filter_applied}
              </p>
            )}
          </div>
          {data.student && (
            <span className={combine("text-sm px-3 py-1 rounded-full", get('bg', 'secondary'))}>
              Student: {data.student}
            </span>
          )}
        </div>
        
        <div className="relative h-64">
          {/* Grid lines */}
          <div className="absolute inset-0 flex flex-col justify-between">
            {[0, 25, 50, 75, 100].map((percent) => (
              <div key={percent} className={combine(
                "h-px w-full",
                theme === 'dark' ? 'bg-gray-700' : 'bg-gray-200'
              )}></div>
            ))}
          </div>
          
          {/* Y-axis labels */}
          <div className="absolute left-0 top-0 h-full flex flex-col justify-between py-2">
            {[100, 75, 50, 25, 0].map((value) => (
              <span key={value} className={combine("text-xs", get('text', 'tertiary'))}>
                {value}%
              </span>
            ))}
          </div>
          
          {/* Chart bars */}
          <div className="relative h-full ml-8 flex items-end space-x-2 overflow-x-auto">
            {data.graph_data.map((item, index) => {
              const heightPercentage = range > 0 ? ((item.value - minValue) / range) * 80 + 10 : 50;
              
              return (
                <div key={index} className="flex-1 min-w-[60px] flex flex-col items-center">
                  {/* Value tooltip */}
                  <div className="absolute -top-8 left-1/2 transform -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-opacity">
                    <div className={combine(
                      "px-2 py-1 rounded-lg text-xs font-medium whitespace-nowrap",
                      theme === 'dark' ? 'bg-gray-800 text-white' : 'bg-white text-gray-800 shadow-md'
                    )}>
                      {item.value.toFixed(1)}%
                    </div>
                  </div>
                  
                  {/* Bar */}
                  <div className="w-full flex flex-col items-center justify-end h-full group">
                    <div 
                      className={combine(
                        "w-3/4 rounded-t-lg transition-all duration-300 hover:opacity-80 cursor-help",
                        item.trend === 'increase' 
                          ? theme === 'dark' ? 'bg-green-600' : 'bg-green-500'
                          : item.trend === 'decrease'
                          ? theme === 'dark' ? 'bg-red-600' : 'bg-red-500'
                          : theme === 'dark' ? 'bg-blue-600' : 'bg-blue-500'
                      )}
                      style={{ height: `${heightPercentage}%` }}
                      title={`Value: ${item.value.toFixed(1)}%`}
                    />
                    
                    {/* X-axis label */}
                    <div className="mt-2 text-xs text-center w-full px-1">
                      <div className="truncate font-medium" title={item.exam}>
                        {item.exam}
                      </div>
                      <div className={combine(
                        "flex items-center justify-center gap-1 mt-1",
                        item.trend === 'increase' ? 'text-green-600' :
                        item.trend === 'decrease' ? 'text-red-600' : 'text-gray-600'
                      )}>
                        {getTrendIcon(item.trend)}
                        <span>{item.change_percentage >= 0 ? '+' : ''}{item.change_percentage.toFixed(1)}%</span>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
        
        {/* Legend */}
        <div className="flex flex-wrap gap-4 justify-center text-xs">
          <div className="flex items-center gap-2">
            <div className={combine("w-3 h-3 rounded", theme === 'dark' ? 'bg-green-600' : 'bg-green-500')}></div>
            <span className={get('text', 'secondary')}>Improving</span>
          </div>
          <div className="flex items-center gap-2">
            <div className={combine("w-3 h-3 rounded", theme === 'dark' ? 'bg-red-600' : 'bg-red-500')}></div>
            <span className={get('text', 'secondary')}>Declining</span>
          </div>
          <div className="flex items-center gap-2">
            <div className={combine("w-3 h-3 rounded", theme === 'dark' ? 'bg-blue-600' : 'bg-blue-500')}></div>
            <span className={get('text', 'secondary')}>Stable</span>
          </div>
        </div>
      </div>
    );
  };

  const renderExamBreakdown = () => {
    if (loadingBreakdown) {
      return (
        <div className="flex flex-col items-center justify-center h-64 space-y-4">
          <div className={combine(
            "animate-spin rounded-full h-12 w-12 border-4",
            theme === 'dark' ? 'border-blue-500 border-t-transparent' : 'border-blue-600 border-t-transparent'
          )}></div>
          <p className={combine("text-sm", get('text', 'secondary'))}>Loading exam breakdown...</p>
        </div>
      );
    }

    if (!examBreakdown?.breakdown || examBreakdown.breakdown.length === 0) {
      return (
        <div className="flex flex-col items-center justify-center h-64 p-6">
          <FaInfoCircle className={combine("h-12 w-12 mx-auto mb-4", get('icon', 'secondary'))} />
          <p className={combine("text-lg font-medium text-center", get('text', 'primary'))}>No exam data</p>
          <p className={combine("text-sm mt-2 text-center", get('text', 'secondary'))}>
            Select an exam type and term to view detailed breakdown
          </p>
          {!selectedExamType || !selectedTerm ? (
            <p className={combine("text-xs mt-2 text-center", get('status', 'warning'))}>
              Please select both exam type and term
            </p>
          ) : null}
        </div>
      );
    }

    return (
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h4 className={combine("font-semibold text-lg", get('text', 'primary'))}>
              {examBreakdown.exam_type} - {examBreakdown.term}
            </h4>
            <p className={combine("text-sm mt-1", get('text', 'tertiary'))}>
              Detailed subject-wise performance
            </p>
          </div>
          <div className={combine("text-sm px-3 py-1 rounded-full", get('bg', 'secondary'))}>
            Student: {examBreakdown.student}
          </div>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {examBreakdown.breakdown.map((subject, index) => (
            <div 
              key={index} 
              className={combine(
                "border rounded-xl p-4 transition-all duration-200 hover:shadow-md",
                get('border', 'primary'),
                get('bg', 'card')
              )}
            >
              <div className="flex justify-between items-start mb-4">
                <div className="flex-1 min-w-0">
                  <h5 
                    className={combine("font-semibold truncate", get('text', 'primary'))}
                    title={subject.subject}
                  >
                    {subject.subject}
                  </h5>
                  <div className={combine("text-xs mt-1", get('text', 'tertiary'))}>
                    Max Marks: {subject.max_mark}
                  </div>
                </div>
                <span className={combine(
                  "px-3 py-1 rounded-full text-sm font-bold min-w-[40px] text-center",
                  getGradeColor(subject.grade),
                  theme === 'dark' ? 'bg-gray-800/50' : 'bg-gray-100'
                )}>
                  {subject.grade}
                </span>
              </div>
              
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className={combine("text-sm", get('text', 'tertiary'))}>Score</span>
                  <span className={combine(
                    "font-bold text-lg",
                    getMarkColor(subject.mark, subject.max_mark)
                  )}>
                    {subject.mark.toFixed(1)}/{subject.max_mark}
                  </span>
                </div>
                
                <div className="space-y-1">
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div 
                      className={combine(
                        "h-2 rounded-full transition-all duration-500",
                        subject.mark >= 90 ? 'bg-green-500' :
                        subject.mark >= 75 ? 'bg-blue-500' :
                        subject.mark >= 60 ? 'bg-yellow-500' :
                        subject.mark >= 40 ? 'bg-orange-500' : 'bg-red-500'
                      )}
                      style={{ width: `${(subject.mark / subject.max_mark) * 100}%` }}
                    ></div>
                  </div>
                  
                  <div className="flex justify-between text-xs">
                    <span className={get('text', 'tertiary')}>0%</span>
                    <span className={combine("font-medium", getMarkColor(subject.mark, subject.max_mark))}>
                      {((subject.mark / subject.max_mark) * 100).toFixed(1)}%
                    </span>
                    <span className={get('text', 'tertiary')}>100%</span>
                  </div>
                </div>
                
                <div className="flex justify-between text-xs">
                  <span className={combine(get('text', 'tertiary'))}>
                    Status: {subject.mark >= (subject.max_mark * 0.4) ? 'Pass' : 'Fail'}
                  </span>
                  <span className={combine(get('text', 'tertiary'))}>
                    Grade: {subject.grade}
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  };

  return (
    <div className={`p-6 ${getBgClass()} transition-colors duration-200`}>
      <div className="mx-auto w-full">
        {/* HEADER SECTION */}
        <div className="mb-8">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
            <div className="flex items-center space-x-4">
              <div className={combine(
                "p-3 rounded-2xl shadow-lg",
                theme === 'dark' 
                  ? "bg-gradient-to-br from-blue-600 to-blue-700" 
                  : "bg-gradient-to-br from-blue-500 to-blue-600"
              )}>
                <FaChartLine className="text-2xl text-white" />
              </div>
              <div>
                <h1 className={combine("text-2xl sm:text-3xl font-bold", get('text', 'primary'))}>
                  Student Performance Dashboard
                </h1>
                <p className={combine("text-sm mt-1", get('text', 'secondary'))}>
                  Track and analyze student academic performance and behaviour
                </p>
              </div>
            </div>
            
            <div className="flex items-center space-x-3">
              <button
                onClick={() => setShowExportMenu(!showExportMenu)}
                className={combine(getSecondaryButtonClass(), "flex items-center space-x-2")}
              >
                <FaDownload className="text-sm" />
                <span className="hidden sm:inline text-sm">Export</span>
              </button>
              
              <button
                onClick={() => setShowFullScreen(!showFullScreen)}
                className={combine(getSecondaryButtonClass(), "flex items-center space-x-2")}
              >
                {showFullScreen ? <FaCompress className="text-sm" /> : <FaExpand className="text-sm" />}
                <span className="hidden sm:inline text-sm">
                  {showFullScreen ? 'Exit Fullscreen' : 'Fullscreen'}
                </span>
              </button>
            </div>
          </div>

          {/* Error Display */}
          {error && (
            <div className={combine(
              "mb-6 p-4 rounded-xl border",
              theme === 'dark' 
                ? "bg-red-900/20 border-red-800 text-red-300"
                : "bg-red-50 border-red-200 text-red-700"
            )}>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <FaExclamationTriangle />
                  <div>
                    <p className="font-medium">Error Loading Data</p>
                    <p className="text-sm opacity-90">{error}</p>
                  </div>
                </div>
                <button
                  onClick={() => setError(null)}
                  className="text-sm hover:opacity-70"
                >
                  <FaTimesCircle />
                </button>
              </div>
            </div>
          )}

          {/* QUICK STATS */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            <div className={getStatsCardClass('blue')}>
              <div className="flex items-center justify-between">
                <div>
                  <p className={combine("text-xs font-medium", get('text', 'secondary'))}>Total Students</p>
                  <p className={combine("text-2xl font-bold mt-2", get('text', 'primary'))}>{students.length}</p>
                </div>
                <div className={combine(
                  "p-2 rounded-xl",
                  theme === 'dark' ? 'bg-blue-900/30' : 'bg-blue-100'
                )}>
                  <FaUsers className={combine(
                    "text-lg",
                    theme === 'dark' ? 'text-blue-400' : 'text-blue-600'
                  )} />
                </div>
              </div>
              <div className={combine("mt-4 text-xs", get('accent', 'primary'))}>
                Tracked for performance analysis
              </div>
            </div>
            
            <div className={getStatsCardClass('emerald')}>
              <div className="flex items-center justify-between">
                <div>
                  <p className={combine("text-xs font-medium", get('text', 'secondary'))}>Active Analysis</p>
                  <p className={combine("text-2xl font-bold mt-2", get('text', 'primary'))}>
                    {selectedStudent ? 1 : 0}
                  </p>
                </div>
                <div className={combine(
                  "p-2 rounded-xl",
                  theme === 'dark' ? 'bg-emerald-900/30' : 'bg-emerald-100'
                )}>
                  <FaChartBar className={combine(
                    "text-lg",
                    theme === 'dark' ? 'text-emerald-400' : 'text-emerald-600'
                  )} />
                </div>
              </div>
              <div className={combine("mt-4 text-xs", get('accent', 'success'))}>
                {selectedStudent ? selectedStudent.student_name : 'No student selected'}
              </div>
            </div>
            
            <div className={getStatsCardClass('purple')}>
              <div className="flex items-center justify-between">
                <div>
                  <p className={combine("text-xs font-medium", get('text', 'secondary'))}>Avg Performance</p>
                  <p className={combine("text-2xl font-bold mt-2", get('text', 'primary'))}>
                    {performanceSummary[0]?.average_marks ? `${performanceSummary[0].average_marks.toFixed(1)}%` : 'N/A'}
                  </p>
                </div>
                <div className={combine(
                  "p-2 rounded-xl",
                  theme === 'dark' ? 'bg-purple-900/30' : 'bg-purple-100'
                )}>
                  <FaPercentage className={combine(
                    "text-lg",
                    theme === 'dark' ? 'text-purple-400' : 'text-purple-600'
                  )} />
                </div>
              </div>
              <div className={combine("mt-4 text-xs", get('accent', 'primary'))}>
                {performanceSummary[0]?.overall_trend ? `Trend: ${performanceSummary[0].overall_trend}` : 'No data'}
              </div>
            </div>
            
            <div className={getStatsCardClass('amber')}>
              <div className="flex items-center justify-between">
                <div>
                  <p className={combine("text-xs font-medium", get('text', 'secondary'))}>Behaviour Score</p>
                  <p className={combine("text-2xl font-bold mt-2", get('text', 'primary'))}>
                    {performanceSummary[0]?.average_behaviour ? `${performanceSummary[0].average_behaviour.toFixed(1)}/5` : 'N/A'}
                  </p>
                </div>
                <div className={combine(
                  "p-2 rounded-xl",
                  theme === 'dark' ? 'bg-amber-900/30' : 'bg-amber-100'
                )}>
                  <FaUserCheck className={combine(
                    "text-lg",
                    theme === 'dark' ? 'text-amber-400' : 'text-amber-600'
                  )} />
                </div>
              </div>
              <div className={combine("mt-4 text-xs", get('accent', 'warning'))}>
                5-point scale assessment
              </div>
            </div>
          </div>
        </div>

        {/* MAIN CONTENT */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* LEFT SIDEBAR - STUDENT LIST */}
          <div className="lg:col-span-1">
            <div className={getCardGradientClass()}>
              <div className="mb-6">
                <h2 className={combine("text-xl font-bold mb-4", get('text', 'primary'))}>Student List</h2>
                
                <div className="relative mb-4">
                  <FaSearch className={combine(
                    "absolute left-3 top-1/2 transform -translate-y-1/2",
                    get('icon', 'secondary')
                  )} />
                  <input
                    type="text"
                    placeholder="Search students by name, ID, or class..."
                    value={searchTerm}
                    onChange={(e) => {
                      setSearchTerm(e.target.value);
                      setCurrentPage(1);
                    }}
                    className={combine(getInputClass(), "pl-10")}
                  />
                </div>
                
                {loading ? (
                  <div className="flex flex-col items-center justify-center py-12 space-y-4">
                    <div className={combine(
                      "animate-spin rounded-full h-12 w-12 border-4",
                      theme === 'dark' ? 'border-blue-500 border-t-transparent' : 'border-blue-600 border-t-transparent'
                    )}></div>
                    <p className={combine("text-sm", get('text', 'secondary'))}>
                      Loading students...
                    </p>
                  </div>
                ) : currentStudents.length === 0 ? (
                  <div className="text-center py-8">
                    <FaUserGraduate className={combine("h-12 w-12 mx-auto mb-3", get('icon', 'secondary'))} />
                    <p className={combine(get('text', 'tertiary'), "mb-2")}>No students found</p>
                    {searchTerm && (
                      <p className={combine("text-sm", get('text', 'secondary'))}>
                        Try a different search term
                      </p>
                    )}
                  </div>
                ) : (
                  <>
                    <div className="space-y-2 max-h-[500px] overflow-y-auto pr-2">
                      {currentStudents.map((student) => (
                        <div
                          key={student.student_id}
                          onClick={() => viewStudentDetails(student)}
                          className={combine(
                            "p-4 rounded-xl border transition-all duration-200 cursor-pointer group",
                            get('border', 'primary'),
                            selectedStudent?.student_id === student.student_id
                              ? theme === 'dark' 
                                ? 'bg-blue-900/30 border-blue-700' 
                                : 'bg-blue-50 border-blue-200'
                              : get('bg', 'card'),
                            "hover:bg-[var(--color-bg-hover)] hover:border-[var(--color-border-strong)]"
                          )}
                        >
                          <div className="flex items-center space-x-3">
                            <div className={combine(
                              "h-10 w-10 rounded-full flex items-center justify-center flex-shrink-0",
                              theme === 'dark' ? 'bg-blue-900/30' : 'bg-blue-100',
                              selectedStudent?.student_id === student.student_id && theme === 'dark'
                                ? 'bg-blue-700'
                                : selectedStudent?.student_id === student.student_id
                                ? 'bg-blue-200'
                                : ''
                            )}>
                              <FaUserGraduate className={combine(
                                "text-sm",
                                theme === 'dark' ? 'text-blue-400' : 'text-blue-600',
                                selectedStudent?.student_id === student.student_id && theme === 'dark'
                                  ? 'text-blue-300'
                                  : selectedStudent?.student_id === student.student_id
                                  ? 'text-blue-700'
                                  : ''
                              )} />
                            </div>
                            <div className="flex-1 min-w-0">
                              <h3 className={combine(
                                "font-semibold truncate group-hover:text-[var(--color-accent-primary)]",
                                get('text', 'primary'),
                                selectedStudent?.student_id === student.student_id && get('accent', 'primary')
                              )}>
                                {student.student_name}
                              </h3>
                              <div className="flex items-center flex-wrap gap-x-2 gap-y-1 mt-1">
                                <span className={combine("text-xs", get('text', 'tertiary'))}>
                                  {student.student_id}
                                </span>
                                {student.class_name && (
                                  <>
                                    <span className={get('text', 'tertiary')}>•</span>
                                    <span className={combine(
                                      "text-xs px-2 py-0.5 rounded-full",
                                      theme === 'dark' ? 'bg-gray-800' : 'bg-gray-100',
                                      get('text', 'tertiary')
                                    )}>
                                      Class {student.class_name}
                                    </span>
                                  </>
                                )}
                              </div>
                            </div>
                            <FaChevronRight className={combine(
                              "text-sm flex-shrink-0",
                              get('icon', 'secondary'),
                              "group-hover:translate-x-1 transition-transform"
                            )} />
                          </div>
                        </div>
                      ))}
                    </div>

                    {/* PAGINATION */}
                    {totalPages > 1 && (
                      <div className="flex items-center justify-between mt-4 pt-4 border-t">
                        <button
                          onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                          disabled={currentPage === 1}
                          className={combine(
                            "p-2 rounded-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed",
                            getSecondaryButtonClass()
                          )}
                        >
                          <FaChevronLeft className="text-xs" />
                        </button>
                        <span className={combine("text-sm", get('text', 'tertiary'))}>
                          Page {currentPage} of {totalPages}
                        </span>
                        <button
                          onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                          disabled={currentPage === totalPages}
                          className={combine(
                            "p-2 rounded-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed",
                            getSecondaryButtonClass()
                          )}
                        >
                          <FaChevronRight className="text-xs" />
                        </button>
                      </div>
                    )}
                  </>
                )}
              </div>
            </div>
          </div>

          {/* RIGHT PANEL - PERFORMANCE DATA */}
          <div className="lg:col-span-2">
            {!selectedStudent ? (
              <div className={getCardGradientClass()}>
                <div className="text-center py-12">
                  <FaChartLine className={combine("h-16 w-16 mx-auto mb-4", get('icon', 'secondary'))} />
                  <h2 className={combine("text-2xl font-bold mb-3", get('text', 'primary'))}>
                    Select a Student
                  </h2>
                  <p className={combine("mb-8 max-w-md mx-auto", get('text', 'secondary'))}>
                    Choose a student from the list to view their detailed performance analytics and behaviour patterns
                  </p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-w-md mx-auto">
                    <div className={combine(
                      "p-4 rounded-xl border text-center transition-all duration-200 hover:shadow-md",
                      get('border', 'primary'),
                      get('bg', 'card')
                    )}>
                      <FaChartBar className={combine("h-8 w-8 mx-auto mb-2", get('accent', 'primary'))} />
                      <h4 className={combine("font-semibold", get('text', 'primary'))}>Academic Performance</h4>
                      <p className={combine("text-xs mt-1", get('text', 'tertiary'))}>
                        Track marks and grades across exams
                      </p>
                    </div>
                    <div className={combine(
                      "p-4 rounded-xl border text-center transition-all duration-200 hover:shadow-md",
                      get('border', 'primary'),
                      get('bg', 'card')
                    )}>
                      <FaUserCheck className={combine("h-8 w-8 mx-auto mb-2", get('accent', 'success'))} />
                      <h4 className={combine("font-semibold", get('text', 'primary'))}>Behaviour Analytics</h4>
                      <p className={combine("text-xs mt-1", get('text', 'tertiary'))}>
                        Monitor classroom participation and attitude
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="space-y-6">
                {/* STUDENT HEADER */}
                <div className={getCardGradientClass('blue')}>
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div className="flex items-center space-x-4">
                      <div className={combine(
                        "h-14 w-14 rounded-full flex items-center justify-center text-white font-bold text-xl flex-shrink-0",
                        theme === 'dark' 
                          ? 'bg-gradient-to-br from-blue-600 to-blue-700' 
                          : 'bg-gradient-to-br from-blue-500 to-blue-600'
                      )}>
                        {selectedStudent.student_name.charAt(0)}
                      </div>
                      <div className="min-w-0">
                        <h2 className={combine("text-xl font-bold truncate", get('text', 'primary'))}>
                          {selectedStudent.student_name}
                        </h2>
                        <div className="flex items-center flex-wrap gap-x-3 gap-y-1 mt-1">
                          <span className={combine("text-sm truncate", get('text', 'secondary'))}>
                            ID: {selectedStudent.student_id}
                          </span>
                          {selectedStudent.class_name && (
                            <>
                              <span className={get('text', 'tertiary')}>•</span>
                              <span className={combine(
                                "text-xs px-2 py-1 rounded-full",
                                theme === 'dark' ? 'bg-blue-900/40 text-blue-300' : 'bg-blue-100 text-blue-700'
                              )}>
                                Class {selectedStudent.class_name}
                              </span>
                            </>
                          )}
                          {selectedStudent.section && (
                            <span className={combine(
                              "text-xs px-2 py-1 rounded-full",
                              theme === 'dark' ? 'bg-emerald-900/40 text-emerald-300' : 'bg-emerald-100 text-emerald-700'
                            )}>
                              Section {selectedStudent.section}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                    <button
                      onClick={() => {
                        setSelectedStudent(null);
                        setSelectedSubject('');
                        setPerformanceType('overall');
                        setTimeFilter('all');
                      }}
                      className={combine(getSecondaryButtonClass(), "text-sm whitespace-nowrap")}
                    >
                      <FaArrowLeft className="inline mr-2" />
                      Back to List
                    </button>
                  </div>
                </div>

                {/* PERFORMANCE TYPE SELECTOR */}
                <div className={getCardGradientClass()}>
                  <div className="flex flex-wrap gap-2 mb-6">
                    {[
                      { type: 'overall' as PerformanceType, label: 'Overall Performance', icon: FaChartLine },
                      { type: 'subject' as PerformanceType, label: 'Subject Analysis', icon: FaBook },
                      { type: 'behaviour' as PerformanceType, label: 'Behaviour Analytics', icon: FaUserCheck },
                      { type: 'detailed' as PerformanceType, label: 'Detailed Breakdown', icon: FaClipboardCheck }
                    ].map((item) => {
                      const Icon = item.icon;
                      return (
                        <button
                          key={item.type}
                          onClick={() => setPerformanceType(item.type)}
                          className={combine(
                            "px-4 py-2 rounded-xl transition-all duration-200 font-medium flex items-center gap-2 flex-1 sm:flex-none",
                            performanceType === item.type
                              ? getPrimaryButtonClass()
                              : getSecondaryButtonClass()
                          )}
                        >
                          <Icon className="text-sm flex-shrink-0" />
                          <span className="hidden sm:inline">{item.label}</span>
                          <span className="sm:hidden">{item.label.split(' ')[0]}</span>
                        </button>
                      );
                    })}
                  </div>

                  {/* TIME FILTER */}
                  <div className="mb-6">
                    <label className={combine("block text-sm font-medium mb-2", get('text', 'primary'))}>
                      Time Period Filter
                    </label>
                    <div className="flex flex-wrap gap-2">
                      <button
                        onClick={() => setTimeFilter('all')}
                        className={combine(
                          "px-3 py-2 rounded-xl transition-all duration-200 font-medium text-sm",
                          timeFilter === 'all'
                            ? getPrimaryButtonClass()
                            : getSecondaryButtonClass()
                        )}
                      >
                        All Terms
                      </button>
                      {availableTerms.map((term) => (
                        <button
                          key={term}
                          onClick={() => setTimeFilter(term as TimeFilter)}
                          className={combine(
                            "px-3 py-2 rounded-xl transition-all duration-200 font-medium text-sm",
                            timeFilter === term
                              ? getPrimaryButtonClass()
                              : getSecondaryButtonClass()
                          )}
                        >
                          {term}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* PERFORMANCE CONTENT */}
                  <div className="mt-6">
                    {performanceType === 'overall' && (
                      <div className={getCardGradientClass('blue')}>
                        {renderPerformanceChart(performanceData, 'Overall Academic Performance', loadingPerformance)}
                      </div>
                    )}

                    {performanceType === 'subject' && (
                      <div className="space-y-6">
                        <div className={getCardGradientClass('purple')}>
                          <div className="mb-4">
                            <label className={combine("block text-sm font-medium mb-2", get('text', 'primary'))}>
                              Select Subject
                            </label>
                            <select
                              value={selectedSubject}
                              onChange={(e) => setSelectedSubject(e.target.value)}
                              className={getInputClass()}
                              disabled={loadingSubjects || availableSubjects.length === 0}
                            >
                              <option value="">
                                {loadingSubjects 
                                  ? 'Loading subjects...' 
                                  : availableSubjects.length === 0
                                  ? 'No subjects available'
                                  : 'Choose a subject'}
                              </option>
                              {availableSubjects.map((subject, index) => (
                                <option key={index} value={subject}>
                                  {subject}
                                </option>
                              ))}
                            </select>
                          </div>
                          
                          {selectedSubject ? (
                            renderPerformanceChart(
                              subjectBehaviours,
                              `${selectedSubject} Performance`,
                              loadingSubjectBehaviour
                            )
                          ) : (
                            <div className="text-center py-8">
                              <FaBook className={combine("h-12 w-12 mx-auto mb-4", get('icon', 'secondary'))} />
                              <p className={combine("text-lg font-medium", get('text', 'primary'))}>
                                {availableSubjects.length === 0 ? 'No subjects found' : 'Select a Subject'}
                              </p>
                              <p className={combine("text-sm mt-2", get('text', 'secondary'))}>
                                {availableSubjects.length === 0 
                                  ? 'No subjects assigned to this student\'s class' 
                                  : 'Choose a subject from the dropdown to view detailed performance'}
                              </p>
                            </div>
                          )}
                        </div>
                      </div>
                    )}

                    {performanceType === 'behaviour' && (
                      <div className="space-y-6">
                        <div className={getCardGradientClass('green')}>
                          {renderPerformanceChart(behaviourData, 'Overall Behaviour Performance', loadingBehaviour)}
                        </div>

                        {selectedSubject ? (
                          <div className={getCardGradientClass('amber')}>
                            <div className="mb-4">
                              <label className={combine("block text-sm font-medium mb-2", get('text', 'primary'))}>
                                Behaviour Type Analysis for {selectedSubject}
                              </label>
                              <div className="flex flex-wrap gap-2">
                                {BEHAVIOUR_TYPES.map((type) => {
                                  const Icon = type.icon;
                                  return (
                                    <button
                                      key={type.id}
                                      onClick={() => setSelectedBehaviourType(type.id)}
                                      className={combine(
                                        "px-3 py-2 rounded-xl transition-all duration-200 font-medium text-sm flex items-center gap-2",
                                        selectedBehaviourType === type.id
                                          ? theme === 'dark'
                                            ? 'bg-gradient-to-r from-amber-600 to-amber-700 text-white'
                                            : 'bg-gradient-to-r from-amber-500 to-amber-600 text-white'
                                          : getSecondaryButtonClass()
                                      )}
                                    >
                                      <Icon className="text-sm" />
                                      <span className="hidden sm:inline">{type.label}</span>
                                      <span className="sm:hidden">{type.label.split(' ')[0]}</span>
                                    </button>
                                  );
                                })}
                              </div>
                            </div>
                            
                            {renderPerformanceChart(
                              behaviourTypeData,
                              `${BEHAVIOUR_TYPES.find(t => t.id === selectedBehaviourType)?.label || 'Behaviour'} Analysis`,
                              loadingBehaviourType
                            )}
                          </div>
                        ) : (
                          <div className={getCardGradientClass('amber')}>
                            <div className="text-center py-8">
                              <FaInfoCircle className={combine("h-12 w-12 mx-auto mb-4", get('icon', 'secondary'))} />
                              <p className={combine("text-lg font-medium", get('text', 'primary'))}>
                                Select a Subject First
                              </p>
                              <p className={combine("text-sm mt-2", get('text', 'secondary'))}>
                                Choose a subject to view detailed behaviour analysis
                              </p>
                            </div>
                          </div>
                        )}
                      </div>
                    )}

                    {performanceType === 'detailed' && (
                      <div className="space-y-6">
                        <div className={getCardGradientClass('indigo')}>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                            <div>
                              <label className={combine("block text-sm font-medium mb-2", get('text', 'primary'))}>
                                Exam Type
                              </label>
                              <select
                                value={selectedExamType}
                                onChange={(e) => setSelectedExamType(e.target.value)}
                                className={getInputClass()}
                              >
                                {availableExams.length === 0 ? (
                                  <option value="">No exams available</option>
                                ) : (
                                  availableExams.map((exam, index) => (
                                    <option key={index} value={exam.name}>
                                      {exam.name} ({exam.term})
                                    </option>
                                  ))
                                )}
                              </select>
                            </div>
                            <div>
                              <label className={combine("block text-sm font-medium mb-2", get('text', 'primary'))}>
                                Term
                              </label>
                              <select
                                value={selectedTerm}
                                onChange={(e) => setSelectedTerm(e.target.value)}
                                className={getInputClass()}
                              >
                                {availableTerms.map((term, index) => (
                                  <option key={index} value={term}>
                                    {term}
                                  </option>
                                ))}
                              </select>
                            </div>
                          </div>
                          
                          <button
                            onClick={handleFetchExamBreakdown}
                            disabled={loadingBreakdown || !selectedExamType || !selectedTerm}
                            className={combine(
                              getPrimaryButtonClass(),
                              "flex items-center justify-center gap-2 mb-6 w-full disabled:opacity-50 disabled:cursor-not-allowed"
                            )}
                          >
                            {loadingBreakdown ? (
                              <>
                                <FaSync className="animate-spin" />
                                Loading...
                              </>
                            ) : (
                              <>
                                <FaEye />
                                View Exam Breakdown
                              </>
                            )}
                          </button>
                          
                          {renderExamBreakdown()}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* EXPORT MENU */}
        {showExportMenu && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50 animate-fade-in backdrop-blur-sm">
            <div className={combine(
              getCardGradientClass('emerald'),
              "max-w-md w-full shadow-2xl"
            )}>
              <div className="flex justify-between items-center mb-6">
                <h2 className={combine("text-lg font-bold", get('text', 'primary'))}>Export Options</h2>
                <button 
                  onClick={() => setShowExportMenu(false)}
                  className={combine(
                    "p-2 rounded-xl transition-all hover:bg-[var(--color-bg-hover)]",
                    get('icon', 'secondary')
                  )}
                  aria-label="Close export menu"
                >
                  <FaTimesCircle className="text-lg" />
                </button>
              </div>
              
              <div className="space-y-3">
                <button
                  onClick={exportPerformanceReport}
                  disabled={!selectedStudent}
                  className={combine(
                    "w-full p-4 rounded-xl border transition-all duration-200 flex items-center justify-between disabled:opacity-50 disabled:cursor-not-allowed",
                    get('border', 'primary'),
                    get('bg', 'card'),
                    "hover:bg-[var(--color-bg-hover)] hover:border-[var(--color-border-strong)]"
                  )}
                >
                  <div className="flex items-center gap-3">
                    <div className={combine(
                      "p-2 rounded-xl",
                      theme === 'dark' ? 'bg-blue-900/30' : 'bg-blue-100'
                    )}>
                      <FaDownload className={combine(
                        "text-lg",
                        theme === 'dark' ? 'text-blue-400' : 'text-blue-600'
                      )} />
                    </div>
                    <div className="text-left">
                      <h4 className={combine("font-semibold", get('text', 'primary'))}>JSON Report</h4>
                      <p className={combine("text-xs", get('text', 'tertiary'))}>
                        Complete performance data in JSON format
                      </p>
                    </div>
                  </div>
                  <FaChevronRight className={get('icon', 'secondary')} />
                </button>
                
                <button
                  onClick={() => {
                    toastInfo('CSV export feature coming soon');
                    setShowExportMenu(false);
                  }}
                  className={combine(
                    "w-full p-4 rounded-xl border transition-all duration-200 flex items-center justify-between",
                    get('border', 'primary'),
                    get('bg', 'card'),
                    "hover:bg-[var(--color-bg-hover)] hover:border-[var(--color-border-strong)]"
                  )}
                >
                  <div className="flex items-center gap-3">
                    <div className={combine(
                      "p-2 rounded-xl",
                      theme === 'dark' ? 'bg-emerald-900/30' : 'bg-emerald-100'
                    )}>
                      <FaChartBar className={combine(
                        "text-lg",
                        theme === 'dark' ? 'text-emerald-400' : 'text-emerald-600'
                      )} />
                    </div>
                    <div className="text-left">
                      <h4 className={combine("font-semibold", get('text', 'primary'))}>CSV Summary</h4>
                      <p className={combine("text-xs", get('text', 'tertiary'))}>
                        Tabular data for spreadsheet analysis
                      </p>
                    </div>
                  </div>
                  <FaChevronRight className={get('icon', 'secondary')} />
                </button>
                
                <button
                  onClick={() => {
                    toastInfo('PDF report feature coming soon');
                    setShowExportMenu(false);
                  }}
                  className={combine(
                    "w-full p-4 rounded-xl border transition-all duration-200 flex items-center justify-between",
                    get('border', 'primary'),
                    get('bg', 'card'),
                    "hover:bg-[var(--color-bg-hover)] hover:border-[var(--color-border-strong)]"
                  )}
                >
                  <div className="flex items-center gap-3">
                    <div className={combine(
                      "p-2 rounded-xl",
                      theme === 'dark' ? 'bg-purple-900/30' : 'bg-purple-100'
                    )}>
                      <FaClipboardCheck className={combine(
                        "text-lg",
                        theme === 'dark' ? 'text-purple-400' : 'text-purple-600'
                      )} />
                    </div>
                    <div className="text-left">
                      <h4 className={combine("font-semibold", get('text', 'primary'))}>PDF Report</h4>
                      <p className={combine("text-xs", get('text', 'tertiary'))}>
                        Formal report with charts and analysis
                      </p>
                    </div>
                  </div>
                  <FaChevronRight className={get('icon', 'secondary')} />
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Fullscreen Mode */}
      {showFullScreen && (
        <div className="fixed inset-0 bg-black z-50 overflow-auto">
          <StudentPerformancePage />
        </div>
      )}
    </div>
  );
};