'use client';

import React, { useState, useEffect } from 'react';
import { 
  FaChartBar, FaFilter, FaSearch, FaDownload, 
  FaUserGraduate, FaPercent, FaUsers, FaBook,
  FaCheckCircle, FaTimesCircle, FaSpinner, FaExclamationTriangle,
  FaSortAmountDown, FaSortAmountUp, FaEye, FaPrint,
  FaMale, FaFemale, FaTransgenderAlt, FaCalendarAlt,
  FaGraduationCap, FaAward, FaTrophy, FaChartLine,
  FaChartPie, FaCrown, FaStar, FaMedal
} from 'react-icons/fa';
import { toast, Toaster } from 'react-hot-toast';

const API_BASE_URL = 'https://senthurvidyalaya-backend.onrender.com/api';

interface SubjectAnalysisData {
  exam: string;
  class: string;
  subject: string;
  viewed_by: string;
  stats: {
    total_students: number;
    pass_percentage: string;
    grade_distribution: Record<string, number>;
    pass_count: number;
    fail_count: number;
  };
  students: Array<{
    student_id: string;
    name: string;
    mark: number;
    total: number;
    grade: string;
  }>;
}

interface ExamSchedule {
  exam_type: string;
  term: string;
  start_date?: string;  // Optional now
  end_date?: string;    // Optional now
  class_assigned?: string; // Optional now
  subject?: string;
  exam_date?: string;   // New field from API
  session?: string;     // New field from API
  duration?: string;    // New field from API
  standard?: string;    // New field from API
  sections?: string[];  // New field from API - array of sections
  display_text?: string;// New field from API
}

export default function SubjectAnalysisPage() {
  // State for filters
  const [filters, setFilters] = useState({
    class: '',
    section: '',
    term: '',
    exam_type: '',
    subject: '',
    view_mode: 'detailed' as 'detailed' | 'summary'
  });

  // State for data
  const [analysisData, setAnalysisData] = useState<SubjectAnalysisData | null>(null);
  const [examSchedules, setExamSchedules] = useState<ExamSchedule[]>([]);
  const [availableTerms, setAvailableTerms] = useState<string[]>([]);
  const [availableExamTypes, setAvailableExamTypes] = useState<string[]>([]);
  const [availableSubjects, setAvailableSubjects] = useState<string[]>([]);
  const [availableClasses, setAvailableClasses] = useState<string[]>([]);
  
  // State for UI
  const [loading, setLoading] = useState(false);
  const [loadingAnalysis, setLoadingAnalysis] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [sortConfig, setSortConfig] = useState({
    key: 'mark',
    direction: 'desc' as 'asc' | 'desc'
  });

  useEffect(() => {
    fetchExamSchedules();
  }, []);

  const fetchExamSchedules = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_BASE_URL}/exams/teacher/schedule/`, {
        headers: {
          'Authorization': `Token ${token}`,
          'Content-Type': 'application/json'
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        
        let schedules: ExamSchedule[] = [];
        if (data.scheduled_exams) {
          schedules = data.scheduled_exams;
        } else if (data.data) {
          schedules = data.data;
        }
        
        setExamSchedules(schedules);
        extractFiltersFromSchedules(schedules);
      } else {
        toast.error('Failed to fetch exam schedules');
      }
    } catch (error) {
      console.error('Error fetching schedules:', error);
      toast.error('Error loading exam schedules');
    } finally {
      setLoading(false);
    }
  };

  const extractFiltersFromSchedules = (schedules: ExamSchedule[]) => {
  const terms = new Set<string>();
  const examTypes = new Set<string>();
  const subjects = new Set<string>();
  const classes = new Set<string>();

  schedules.forEach(schedule => {
    if (schedule.term) terms.add(schedule.term);
    if (schedule.exam_type) examTypes.add(schedule.exam_type);
    if (schedule.subject) subjects.add(schedule.subject);
    
    // Handle the new field names from API
    if (schedule.standard) {
      classes.add(schedule.standard.trim());
    } else if (schedule.class_assigned) {
      // Fallback to old format
      const cls = schedule.class_assigned.split(' - ')[0];
      if (cls) classes.add(cls.trim());
    }
    
    // Note: Sections are stored as array in API response
    // We'll handle sections separately when user selects a class
  });

  setAvailableTerms(Array.from(terms));
  setAvailableExamTypes(Array.from(examTypes));
  setAvailableSubjects(Array.from(subjects));
  setAvailableClasses(Array.from(classes));
};

const getDisplayTextForClass = (className: string) => {
  const schedule = examSchedules.find(
    s => s.standard === className || 
    (s.class_assigned && s.class_assigned.startsWith(className))
  );
  
  if (schedule?.display_text) {
    return schedule.display_text;
  }
  
  const sections = getAvailableSections(className);
  return sections.length > 0 
    ? `Class ${className} (Sections: ${sections.join(', ')})`
    : `Class ${className}`;
};

const getAvailableSections = (selectedClass: string) => {
  if (!selectedClass) return [];
  
  const sections = new Set<string>();
  
  examSchedules.forEach(schedule => {
    // Check if this schedule matches the selected class
    if (schedule.standard === selectedClass || 
        (schedule.class_assigned && schedule.class_assigned.startsWith(selectedClass))) {
      // Handle sections from the new API format
      if (schedule.sections && Array.isArray(schedule.sections)) {
        schedule.sections.forEach(section => {
          if (section && typeof section === 'string') {
            sections.add(section.trim());
          }
        });
      } else if (schedule.class_assigned) {
        // Fallback to old format
        const parts = schedule.class_assigned.split(' - ');
        if (parts.length > 1) {
          const sectionList = parts[1].split(',');
          sectionList.forEach(section => {
            if (section) sections.add(section.trim());
          });
        }
      }
    }
  });
  
  return Array.from(sections);
};

  const fetchSubjectAnalysis = async () => {
  if (!filters.class || !filters.section || !filters.subject || !filters.exam_type || !filters.term) {
    toast.error('Please select all required filters');
    return;
  }

  try {
    setLoadingAnalysis(true);
    const token = localStorage.getItem('token');
    
    // Prepare the query parameters
    const params = new URLSearchParams({
      class: filters.class,
      section: filters.section,
      subject: filters.subject,
      exam_type: filters.exam_type,
      term: filters.term
    });

    const response = await fetch(`${API_BASE_URL}/exams/subject-analysis/?${params.toString()}`, {
      headers: {
        'Authorization': `Token ${token}`,
        'Content-Type': 'application/json'
      }
    });

    const data = await response.json();
    
    if (response.ok) {
      setAnalysisData(data);
      toast.success(`Analysis loaded for ${filters.subject}`);
    } else {
      toast.error(data.error || 'Failed to load analysis');
      setAnalysisData(null);
    }
  } catch (error) {
    console.error('Error fetching analysis:', error);
    toast.error('Error loading subject analysis');
    setAnalysisData(null);
  } finally {
    setLoadingAnalysis(false);
  }
};

  const handleSort = (key: string) => {
    setSortConfig({
      key,
      direction: sortConfig.key === key && sortConfig.direction === 'asc' ? 'desc' : 'asc'
    });
  };

  const getSortedStudents = () => {
    if (!analysisData) return [];
    
    let students = [...analysisData.students];
    
    // Apply search filter
    if (searchTerm) {
      students = students.filter(student =>
        student.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        student.student_id.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }
    
    // Apply sorting
    students.sort((a, b) => {
      let aValue: any, bValue: any;
      
      switch (sortConfig.key) {
        case 'mark':
          aValue = a.mark;
          bValue = b.mark;
          break;
        case 'name':
          aValue = a.name.toLowerCase();
          bValue = b.name.toLowerCase();
          break;
        case 'grade':
          const gradeOrder = ['S', 'A', 'B', 'C', 'D', 'E', 'F'];
          aValue = gradeOrder.indexOf(a.grade);
          bValue = gradeOrder.indexOf(b.grade);
          break;
        case 'student_id':
          aValue = a.student_id;
          bValue = b.student_id;
          break;
        default:
          return 0;
      }
      
      if (sortConfig.direction === 'asc') {
        return aValue > bValue ? 1 : -1;
      } else {
        return aValue < bValue ? 1 : -1;
      }
    });
    
    return students;
  };

  const getGradeColor = (grade: string) => {
    const colors: Record<string, string> = {
      'S': 'bg-gradient-to-r from-yellow-100 to-yellow-200 text-yellow-800 border-yellow-300',
      'A': 'bg-gradient-to-r from-green-100 to-green-200 text-green-800 border-green-300',
      'B': 'bg-gradient-to-r from-blue-100 to-blue-200 text-blue-800 border-blue-300',
      'C': 'bg-gradient-to-r from-indigo-100 to-indigo-200 text-indigo-800 border-indigo-300',
      'D': 'bg-gradient-to-r from-purple-100 to-purple-200 text-purple-800 border-purple-300',
      'E': 'bg-gradient-to-r from-pink-100 to-pink-200 text-pink-800 border-pink-300',
      'F': 'bg-gradient-to-r from-red-100 to-red-200 text-red-800 border-red-300'
    };
    return colors[grade] || 'bg-gray-100 text-gray-800 border-gray-300';
  };

  const exportToCSV = () => {
    if (!analysisData) return;
    
    const headers = ['Rank', 'Student ID', 'Name', 'Marks', 'Percentage', 'Grade', 'Status'];
    const rows = getSortedStudents().map((student, index) => [
      index + 1,
      student.student_id,
      `"${student.name}"`,
      student.mark,
      ((student.mark / student.total) * 100).toFixed(2) + '%',
      student.grade,
      student.mark >= (student.total * 0.33) ? 'Pass' : 'Fail'
    ]);
    
    const csvContent = [headers.join(','), ...rows.map(row => row.join(','))].join('\n');
    
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${analysisData.subject}_${analysisData.exam.replace(/[^a-zA-Z0-9]/g, '_')}.csv`;
    a.click();
  };

  const calculateStatistics = () => {
    if (!analysisData) return null;
    
    const stats = analysisData.stats;
    const students = analysisData.students;
    
    const totalMarks = students.reduce((sum, student) => sum + student.mark, 0);
    const averageMarks = totalMarks / students.length;
    const averagePercentage = (averageMarks / students[0]?.total * 100) || 0;
    
    const topStudents = [...students]
      .sort((a, b) => b.mark - a.mark)
      .slice(0, 3);
    
    const toppers = topStudents.map(student => ({
      name: student.name,
      marks: student.mark,
      percentage: (student.mark / student.total * 100).toFixed(2),
      grade: student.grade
    }));
    
    return {
      averageMarks: averageMarks.toFixed(2),
      averagePercentage: averagePercentage.toFixed(2),
      highestMarks: Math.max(...students.map(s => s.mark)),
      lowestMarks: Math.min(...students.map(s => s.mark)),
      toppers
    };
  };

  const renderGradeDistribution = () => {
    if (!analysisData) return null;
    
    const grades = analysisData.stats.grade_distribution;
    const total = analysisData.stats.total_students;
    
    return Object.entries(grades).map(([grade, count]) => {
      const percentage = ((count / total) * 100).toFixed(1);
      return (
        <div key={grade} className="mb-2">
          <div className="flex items-center justify-between mb-1">
            <div className="flex items-center gap-2">
              <div className={`w-3 h-3 rounded ${getGradeColor(grade).split(' ')[0]}`}></div>
              <span className="font-medium">Grade {grade}</span>
            </div>
            <span className="text-gray-700">{count} students ({percentage}%)</span>
          </div>
          <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
            <div 
              className={`h-full ${getGradeColor(grade).split(' ')[0]}`}
              style={{ width: `${percentage}%` }}
            ></div>
          </div>
        </div>
      );
    });
  };

  const stats = analysisData ? calculateStatistics() : null;

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-blue-50 p-4 md:p-6">
      <Toaster position="top-right" />
      
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-8">
            <div>
              <div className="flex items-center gap-3 mb-4">
                <div className="p-3 bg-gradient-to-r from-green-600 to-emerald-600 rounded-xl text-white shadow-lg">
                  <FaChartBar size={28} />
                </div>
                <div>
                  <h1 className="text-3xl md:text-4xl font-bold bg-gradient-to-r from-green-600 to-emerald-600 bg-clip-text text-transparent">
                    Subject Analysis
                  </h1>
                  <p className="text-gray-600 mt-1">Detailed analysis of student performance</p>
                </div>
              </div>
              
              <div className="flex flex-wrap gap-2 mt-4">
                <button
                  onClick={() => setFilters(prev => ({ ...prev, view_mode: 'detailed' }))}
                  className={`px-4 py-2 rounded-lg font-medium transition-all ${filters.view_mode === 'detailed' ? 'bg-green-600 text-white' : 'bg-white text-gray-700 hover:bg-gray-100'}`}
                >
                  <FaEye className="inline mr-2" />
                  Detailed View
                </button>
                <button
                  onClick={() => setFilters(prev => ({ ...prev, view_mode: 'summary' }))}
                  className={`px-4 py-2 rounded-lg font-medium transition-all ${filters.view_mode === 'summary' ? 'bg-green-600 text-white' : 'bg-white text-gray-700 hover:bg-gray-100'}`}
                >
                  <FaChartPie className="inline mr-2" />
                  Summary View
                </button>
              </div>
            </div>
            
            <div className="flex gap-3">
              <button
                onClick={fetchExamSchedules}
                className="px-4 py-2 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
              >
                Refresh
              </button>
              {analysisData && (
                <button
                  onClick={exportToCSV}
                  className="px-4 py-2 bg-gradient-to-r from-green-600 to-green-700 text-white rounded-lg hover:from-green-700 hover:to-green-800 transition-all flex items-center gap-2"
                >
                  <FaDownload />
                  Export CSV
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Filters Section */}
        <div className="bg-white rounded-2xl shadow-lg p-6 mb-8">
          <div className="flex items-center gap-3 mb-6">
            <FaFilter className="text-green-600" />
            <h3 className="text-lg font-semibold text-gray-800">Select Analysis Criteria</h3>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-4">
            {/* Class Filter */}
<div>
  <label className="block text-sm font-medium text-gray-700 mb-2">
    Class *
  </label>
  <select
    value={filters.class}
    onChange={(e) => setFilters({ 
      ...filters, 
      class: e.target.value, 
      section: '' // Reset section when class changes
    })}
    className="w-full px-4 py-3 bg-gray-50 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
  >
    <option value="">Select Class</option>
    {availableClasses.map(cls => {
      // Find schedules for this class to show sections info
      const classSchedules = examSchedules.filter(
        schedule => schedule.standard === cls || 
                   (schedule.class_assigned && schedule.class_assigned.startsWith(cls))
      );
      const sectionsCount = new Set<string>();
      classSchedules.forEach(schedule => {
        if (schedule.sections) {
          schedule.sections.forEach(s => sectionsCount.add(s));
        }
      });
      
      return (
        <option key={cls} value={cls}>
          Class {cls} {sectionsCount.size > 0 ? `(${Array.from(sectionsCount).join(', ')})` : ''}
        </option>
      );
    })}
  </select>
</div>

            {/* Section Filter */}
<div>
  <label className="block text-sm font-medium text-gray-700 mb-2">
    Section *
  </label>
  <select
    value={filters.section}
    onChange={(e) => setFilters({ ...filters, section: e.target.value })}
    disabled={!filters.class}
    className={`w-full px-4 py-3 bg-gray-50 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent ${
      !filters.class ? 'opacity-50 cursor-not-allowed' : ''
    }`}
  >
    <option value="">Select Section</option>
    {getAvailableSections(filters.class).map(section => (
      <option key={section} value={section}>Section {section}</option>
    ))}
  </select>
  {!filters.class && (
    <p className="text-xs text-gray-500 mt-1">Select class first</p>
  )}
</div>

            {/* Term Filter */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Term *
              </label>
              <select
                value={filters.term}
                onChange={(e) => setFilters({ ...filters, term: e.target.value })}
                className="w-full px-4 py-3 bg-gray-50 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
              >
                <option value="">Select Term</option>
                {availableTerms.map(term => (
                  <option key={term} value={term}>{term}</option>
                ))}
              </select>
            </div>

            {/* Exam Type Filter */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Exam Type *
              </label>
              <select
                value={filters.exam_type}
                onChange={(e) => setFilters({ ...filters, exam_type: e.target.value })}
                className="w-full px-4 py-3 bg-gray-50 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
              >
                <option value="">Select Exam Type</option>
                {availableExamTypes.map(type => (
                  <option key={type} value={type}>{type}</option>
                ))}
              </select>
            </div>

            {/* Subject Filter */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Subject *
              </label>
              <select
                value={filters.subject}
                onChange={(e) => setFilters({ ...filters, subject: e.target.value })}
                className="w-full px-4 py-3 bg-gray-50 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
              >
                <option value="">Select Subject</option>
                {availableSubjects.map(subject => (
                  <option key={subject} value={subject}>{subject}</option>
                ))}
              </select>
            </div>
          </div>
          
          <div className="flex justify-between items-center pt-4 border-t">
            <button
              onClick={() => {
                setFilters({
                  class: '',
                  section: '',
                  term: '',
                  exam_type: '',
                  subject: '',
                  view_mode: 'detailed'
                });
                setAnalysisData(null);
              }}
              className="px-4 py-2 text-gray-600 hover:text-gray-800 font-medium"
            >
              Clear All
            </button>
            
            <button
              onClick={fetchSubjectAnalysis}
              disabled={loadingAnalysis || !filters.class || !filters.section || !filters.subject || !filters.term || !filters.exam_type}
              className={`px-6 py-3 rounded-lg font-medium flex items-center gap-2 ${
                loadingAnalysis || !filters.class || !filters.section || !filters.subject || !filters.term || !filters.exam_type
                  ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                  : 'bg-gradient-to-r from-green-600 to-green-700 text-white hover:from-green-700 hover:to-green-800'
              }`}
            >
              {loadingAnalysis ? (
                <>
                  <FaSpinner className="animate-spin" />
                  Loading...
                </>
              ) : (
                <>
                  <FaChartBar />
                  Generate Analysis
                </>
              )}
            </button>
          </div>
        </div>

        {/* Main Content */}
        {loadingAnalysis ? (
          <div className="text-center py-12 bg-white rounded-2xl shadow-lg">
            <FaSpinner className="animate-spin text-4xl text-green-600 mx-auto mb-4" />
            <p className="text-gray-600">Generating subject analysis...</p>
          </div>
        ) : analysisData ? (
          <div className="space-y-8">
            {/* Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
              <div className="bg-gradient-to-br from-green-50 to-emerald-50 border border-green-200 rounded-2xl p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-3xl font-bold text-gray-800">{analysisData.stats.total_students}</div>
                    <div className="text-gray-600">Total Students</div>
                  </div>
                  <FaUsers className="text-3xl text-green-600" />
                </div>
              </div>
              
              <div className="bg-gradient-to-br from-blue-50 to-cyan-50 border border-blue-200 rounded-2xl p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-3xl font-bold text-gray-800">{analysisData.stats.pass_count}</div>
                    <div className="text-gray-600">Passed Students</div>
                  </div>
                  <FaCheckCircle className="text-3xl text-blue-600" />
                </div>
              </div>
              
              <div className="bg-gradient-to-br from-red-50 to-rose-50 border border-red-200 rounded-2xl p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-3xl font-bold text-gray-800">{analysisData.stats.fail_count}</div>
                    <div className="text-gray-600">Failed Students</div>
                  </div>
                  <FaTimesCircle className="text-3xl text-red-600" />
                </div>
              </div>
              
              <div className="bg-gradient-to-br from-purple-50 to-violet-50 border border-purple-200 rounded-2xl p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-3xl font-bold text-gray-800">{analysisData.stats.pass_percentage}</div>
                    <div className="text-gray-600">Pass Percentage</div>
                  </div>
                  <FaPercent className="text-3xl text-purple-600" />
                </div>
              </div>
            </div>

            {/* Detailed Statistics */}
            {filters.view_mode === 'detailed' && stats && (
              <div className="bg-white rounded-2xl shadow-lg p-6">
                <h3 className="text-xl font-bold text-gray-800 mb-6">Performance Statistics</h3>
                
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                  <div className="border border-gray-200 rounded-xl p-5">
                    <div className="flex items-center gap-3 mb-4">
                      <FaChartLine className="text-green-600" />
                      <h4 className="font-semibold text-gray-800">Average Performance</h4>
                    </div>
                    <div className="space-y-2">
                      <div className="flex justify-between">
                        <span className="text-gray-600">Average Marks:</span>
                        <span className="font-bold text-gray-800">{stats.averageMarks}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Average Percentage:</span>
                        <span className="font-bold text-gray-800">{stats.averagePercentage}%</span>
                      </div>
                    </div>
                  </div>
                  
                  <div className="border border-gray-200 rounded-xl p-5">
                    <div className="flex items-center gap-3 mb-4">
                      <FaTrophy className="text-yellow-600" />
                      <h4 className="font-semibold text-gray-800">Marks Range</h4>
                    </div>
                    <div className="space-y-2">
                      <div className="flex justify-between">
                        <span className="text-gray-600">Highest Marks:</span>
                        <span className="font-bold text-green-600">{stats.highestMarks}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Lowest Marks:</span>
                        <span className="font-bold text-red-600">{stats.lowestMarks}</span>
                      </div>
                    </div>
                  </div>
                  
                  <div className="border border-gray-200 rounded-xl p-5">
                    <div className="flex items-center gap-3 mb-4">
                      <FaCrown className="text-purple-600" />
                      <h4 className="font-semibold text-gray-800">Top 3 Students</h4>
                    </div>
                    <div className="space-y-3">
                      {stats.toppers.map((topper, index) => (
                        <div key={index} className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <FaStar className={`${index === 0 ? 'text-yellow-500' : index === 1 ? 'text-gray-400' : 'text-yellow-700'}`} />
                            <span className="font-medium">{topper.name.split(' ')[0]}</span>
                          </div>
                          <div className="text-right">
                            <div className="font-bold">{topper.marks} marks</div>
                            <div className="text-sm text-gray-600">{topper.percentage}%</div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Grade Distribution */}
                <div className="mb-8">
                  <h4 className="font-semibold text-gray-800 mb-4 flex items-center gap-2">
                    <FaChartPie /> Grade Distribution
                  </h4>
                  <div className="bg-gray-50 rounded-xl p-5">
                    {renderGradeDistribution()}
                  </div>
                </div>

                {/* Students List with Search and Sort */}
                <div className="mb-4">
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div className="relative flex-1 max-w-md">
                      <FaSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                      <input
                        type="text"
                        placeholder="Search students by name or ID..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                      />
                    </div>
                    <div className="text-gray-600">
                      Showing {getSortedStudents().length} of {analysisData.students.length} students
                    </div>
                  </div>
                </div>

                {/* Students Table */}
                <div className="overflow-x-auto border border-gray-200 rounded-xl">
                  <table className="w-full">
                    <thead className="bg-gray-50">
                      <tr>
                        <th 
                          className="py-3 px-4 text-left text-sm font-semibold text-gray-700 cursor-pointer"
                          onClick={() => handleSort('student_id')}
                        >
                          <div className="flex items-center gap-2">
                            Student ID
                            {sortConfig.key === 'student_id' && (
                              sortConfig.direction === 'asc' ? <FaSortAmountUp /> : <FaSortAmountDown />
                            )}
                          </div>
                        </th>
                        <th 
                          className="py-3 px-4 text-left text-sm font-semibold text-gray-700 cursor-pointer"
                          onClick={() => handleSort('name')}
                        >
                          <div className="flex items-center gap-2">
                            Student Name
                            {sortConfig.key === 'name' && (
                              sortConfig.direction === 'asc' ? <FaSortAmountUp /> : <FaSortAmountDown />
                            )}
                          </div>
                        </th>
                        <th 
                          className="py-3 px-4 text-left text-sm font-semibold text-gray-700 cursor-pointer"
                          onClick={() => handleSort('mark')}
                        >
                          <div className="flex items-center gap-2">
                            Marks Obtained
                            {sortConfig.key === 'mark' && (
                              sortConfig.direction === 'asc' ? <FaSortAmountUp /> : <FaSortAmountDown />
                            )}
                          </div>
                        </th>
                        <th className="py-3 px-4 text-left text-sm font-semibold text-gray-700">
                          Total Marks
                        </th>
                        <th 
                          className="py-3 px-4 text-left text-sm font-semibold text-gray-700 cursor-pointer"
                          onClick={() => handleSort('grade')}
                        >
                          <div className="flex items-center gap-2">
                            Grade
                            {sortConfig.key === 'grade' && (
                              sortConfig.direction === 'asc' ? <FaSortAmountUp /> : <FaSortAmountDown />
                            )}
                          </div>
                        </th>
                        <th className="py-3 px-4 text-left text-sm font-semibold text-gray-700">
                          Percentage
                        </th>
                        <th className="py-3 px-4 text-left text-sm font-semibold text-gray-700">
                          Status
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                      {getSortedStudents().map((student, index) => {
                        const percentage = (student.mark / student.total) * 100;
                        const isPass = percentage >= 33;
                        return (
                          <tr key={student.student_id} className="hover:bg-gray-50">
                            <td className="py-3 px-4">
                              <div className="font-medium text-gray-800">{student.student_id}</div>
                            </td>
                            <td className="py-3 px-4">
                              <div className="font-medium text-gray-800">{student.name}</div>
                            </td>
                            <td className="py-3 px-4">
                              <div className="font-bold text-gray-800">{student.mark.toFixed(2)}</div>
                            </td>
                            <td className="py-3 px-4">
                              <div className="text-gray-600">{student.total}</div>
                            </td>
                            <td className="py-3 px-4">
                              <span className={`px-3 py-1 rounded-full text-xs font-bold ${getGradeColor(student.grade)}`}>
                                {student.grade}
                              </span>
                            </td>
                            <td className="py-3 px-4">
                              <div className="font-medium text-gray-800">{percentage.toFixed(2)}%</div>
                            </td>
                            <td className="py-3 px-4">
                              {isPass ? (
                                <span className="px-3 py-1 bg-green-100 text-green-800 rounded-full text-xs font-semibold">
                                  Pass
                                </span>
                              ) : (
                                <span className="px-3 py-1 bg-red-100 text-red-800 rounded-full text-xs font-semibold">
                                  Fail
                                </span>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>

                {/* Empty State for Search */}
                {getSortedStudents().length === 0 && (
                  <div className="text-center py-12">
                    <FaSearch className="text-4xl text-gray-300 mx-auto mb-4" />
                    <h4 className="text-lg font-semibold text-gray-600 mb-2">No students found</h4>
                    <p className="text-gray-500">Try adjusting your search terms</p>
                  </div>
                )}
              </div>
            )}

            {/* Summary View */}
            {filters.view_mode === 'summary' && (
              <div className="bg-white rounded-2xl shadow-lg p-6">
                <h3 className="text-xl font-bold text-gray-800 mb-6">Summary Report</h3>
                
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                  {/* Pass/Fail Distribution */}
                  <div>
                    <h4 className="font-semibold text-gray-800 mb-4">Pass/Fail Distribution</h4>
                    <div className="bg-gray-50 rounded-xl p-5">
                      <div className="flex items-center justify-center">
                        <div className="relative w-48 h-48">
                          <div className="absolute inset-0 flex items-center justify-center">
                            <div className="text-center">
                              <div className="text-3xl font-bold text-gray-800">
                                {analysisData.stats.pass_percentage}
                              </div>
                              <div className="text-gray-600">Pass Rate</div>
                            </div>
                          </div>
                          <svg className="w-full h-full" viewBox="0 0 100 100">
                            {/* Pass Segment */}
                            <circle
                              cx="50"
                              cy="50"
                              r="40"
                              fill="transparent"
                              stroke="#10B981"
                              strokeWidth="20"
                              strokeDasharray={`${(analysisData.stats.pass_count / analysisData.stats.total_students) * 251.2} 251.2`}
                              transform="rotate(-90 50 50)"
                            />
                            {/* Fail Segment */}
                            <circle
                              cx="50"
                              cy="50"
                              r="40"
                              fill="transparent"
                              stroke="#EF4444"
                              strokeWidth="20"
                              strokeDasharray={`${(analysisData.stats.fail_count / analysisData.stats.total_students) * 251.2} 251.2`}
                              strokeDashoffset={`-${(analysisData.stats.pass_count / analysisData.stats.total_students) * 251.2}`}
                              transform="rotate(-90 50 50)"
                            />
                          </svg>
                        </div>
                      </div>
                      <div className="flex justify-center gap-6 mt-4">
                        <div className="flex items-center gap-2">
                          <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                          <span className="text-sm">Pass: {analysisData.stats.pass_count}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <div className="w-3 h-3 bg-red-500 rounded-full"></div>
                          <span className="text-sm">Fail: {analysisData.stats.fail_count}</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Grade Distribution Chart */}
                  <div>
                    <h4 className="font-semibold text-gray-800 mb-4">Grade Distribution</h4>
                    <div className="bg-gray-50 rounded-xl p-5">
                      <div className="space-y-3">
                        {Object.entries(analysisData.stats.grade_distribution).map(([grade, count]) => {
                          const percentage = ((count / analysisData.stats.total_students) * 100).toFixed(1);
                          return (
                            <div key={grade} className="flex items-center">
                              <div className="w-16 text-right mr-3">
                                <span className={`px-2 py-1 rounded text-xs font-bold ${getGradeColor(grade)}`}>
                                  Grade {grade}
                                </span>
                              </div>
                              <div className="flex-1">
                                <div className="h-6 bg-gray-200 rounded-full overflow-hidden">
                                  <div 
                                    className={`h-full ${getGradeColor(grade).split(' ')[0]}`}
                                    style={{ width: `${percentage}%` }}
                                  ></div>
                                </div>
                              </div>
                              <div className="w-16 text-right ml-3">
                                <span className="text-sm font-medium">{count} ({percentage}%)</span>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Exam Information */}
                <div className="mt-8 p-5 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl border border-blue-200">
                  <h4 className="font-semibold text-gray-800 mb-3">Exam Information</h4>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div>
                      <div className="text-sm text-gray-600">Exam</div>
                      <div className="font-medium">{analysisData.exam}</div>
                    </div>
                    <div>
                      <div className="text-sm text-gray-600">Class & Section</div>
                      <div className="font-medium">{analysisData.class}</div>
                    </div>
                    <div>
                      <div className="text-sm text-gray-600">Subject</div>
                      <div className="font-medium">{analysisData.subject}</div>
                    </div>
                    <div>
                      <div className="text-sm text-gray-600">Viewed By</div>
                      <div className="font-medium">{analysisData.viewed_by}</div>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="bg-white rounded-2xl shadow-lg p-12 text-center">
            <FaChartBar className="text-5xl text-gray-300 mx-auto mb-6" />
            <h3 className="text-2xl font-bold text-gray-600 mb-4">Subject Analysis Dashboard</h3>
            <p className="text-gray-500 max-w-lg mx-auto mb-8">
              Select your class, section, term, exam type, and subject to generate detailed performance analysis.
            </p>
            <div className="inline-flex items-center gap-2 text-green-600 font-medium">
              <FaExclamationTriangle />
              Select all filters and click "Generate Analysis"
            </div>
          </div>
        )}
      </div>
    </div>
  );
}