'use client';

import { useState, useEffect } from 'react';
// import { useAuth } from '@/context/AuthContext';
import { 
  ChartBarIcon, 
  UserGroupIcon, 
  AcademicCapIcon,
  ChartPieIcon,
  ArrowTrendingUpIcon,
  ArrowTrendingDownIcon
} from '@heroicons/react/24/outline';
import {
  LineChart, Line, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer
} from 'recharts';

interface Student {
  student_id: string;
  student_name: string;
  section: string;
}

interface ClassData {
  id: string;
  name: string;
  sections: string[];
}

interface PerformanceStats {
  average_score: number;
  top_performer: string;
  improvement_rate: number;
  total_students: number;
  pass_percentage: number;
}

export const TeachersPerformancePage = () => {
  // const { user, token } = useAuth();
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'overview' | 'detailed' | 'comparison'>('overview');
  
  // Filters
  const [selectedClass, setSelectedClass] = useState('');
  const [selectedSection, setSelectedSection] = useState('');
  const [selectedExam, setSelectedExam] = useState('Quarterly');
  const [selectedSubject, setSelectedSubject] = useState('All');
  
  // Data
  const [classes, setClasses] = useState<ClassData[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [performanceStats, setPerformanceStats] = useState<PerformanceStats | null>(null);
  const [performanceData, setPerformanceData] = useState<any[]>([]);
  const [subjectData, setSubjectData] = useState<any[]>([]);
  const [comparisonData, setComparisonData] = useState<any[]>([]);

  // Fetch classes and sections
  useEffect(() => {
      fetchClasses();
  });

  useEffect(() => {
    if (selectedClass) {
      fetchStudents();
      fetchPerformanceData();
    }
  }, [selectedClass, selectedSection, selectedExam, selectedSubject]);

  const fetchClasses = async () => {
    try {
      const token = localStorage.getItem('token');
      // API call to fetch classes
      const response = await fetch(`https://senthurvidyalaya-backend.onrender.com/api/academics/standards/`, {
        headers: {
          'Authorization': `Token ${token}`,
        },
      });
      const data = await response.json();
      
      if (response.ok) {
        // Format class data
        const formattedClasses = data.map((cls: any) => ({
          id: cls.id.toString(),
          name: cls.name,
          sections: cls.sections?.map((sec: any) => sec.name) || ['A', 'B', 'C']
        }));
        setClasses(formattedClasses);
        
        if (formattedClasses.length > 0) {
          setSelectedClass(formattedClasses[0].id);
          if (formattedClasses[0].sections.length > 0) {
            setSelectedSection(formattedClasses[0].sections[0]);
          }
        }
      }
    } catch (error) {
      console.error('Error fetching classes:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchStudents = async () => {
    if (!selectedClass || !selectedSection) return;
    
    try {
      // API call to fetch students in class
      const token = localStorage.getItem('token');
      const response = await fetch(
        `https://senthurvidyalaya-backend.onrender.com/api/students/list/?class=${selectedClass}&section=${selectedSection}`,
        {
          headers: {
            'Authorization': `Token ${token}`,
          },
        }
      );
      const data = await response.json();
      
      if (response.ok && Array.isArray(data)) {
        setStudents(data);
      }
    } catch (error) {
      console.error('Error fetching students:', error);
    }
  };

  const fetchPerformanceData = async () => {
    if (!selectedClass || !selectedSection) return;
    
    try {
      // API call to get class performance
      const token = localStorage.getItem('token');
      const response = await fetch(
        `https://senthurvidyalaya-backend.onrender.com/api/exams/class-result/?class=${selectedClass}&section=${selectedSection}&exam_type=${selectedExam}`,
        {
          headers: {
            'Authorization': `Token ${token}`,
          },
        }
      );
      const data = await response.json();
      
      if (response.ok) {
        // Process performance data
        const analytics = data.analytics || {};
        const studentData = data.data || [];
        
        // Calculate stats
        const stats: PerformanceStats = {
          average_score: studentData.reduce((acc: number, stu: any) => 
            acc + (stu.summative_total || 0), 0) / studentData.length || 0,
          top_performer: studentData.sort((a: any, b: any) => 
            (b.summative_total || 0) - (a.summative_total || 0))[0]?.name || 'N/A',
          improvement_rate: 0, // You might need a separate API for this
          total_students: analytics.total_students || 0,
          pass_percentage: analytics.total_pass ? 
            ((analytics.total_pass / analytics.total_students) * 100) : 0
        };
        
        setPerformanceStats(stats);
        
        // Format performance chart data
        const chartData = analytics.grade_breakdown ? 
          Object.entries(analytics.grade_breakdown).map(([grade, count]) => ({
            name: grade,
            value: count
          })) : [];
        setPerformanceData(chartData);
        
        // If subject selected, fetch subject-specific data
        if (selectedSubject !== 'All') {
          fetchSubjectData();
        }
        
        // Fetch comparison data
        fetchComparisonData();
      }
    } catch (error) {
      console.error('Error fetching performance data:', error);
    }
  };

  const fetchSubjectData = async () => {
    if (!selectedClass || !selectedSection || selectedSubject === 'All') return;
    
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(
        `https://senthurvidyalaya-backend.onrender.com/api/exams/subject-analysis/?class=${selectedClass}&section=${selectedSection}&subject=${selectedSubject}&exam_type=${selectedExam}`,
        {
          headers: {
            'Authorization': `Token ${token}`,
          },
        }
      );
      const data = await response.json();
      
      if (response.ok) {
        const stats = data.stats || {};
        const subjectChartData = stats.grade_distribution ? 
          Object.entries(stats.grade_distribution).map(([grade, count]) => ({
            name: grade,
            value: count
          })) : [];
        setSubjectData(subjectChartData);
      }
    } catch (error) {
      console.error('Error fetching subject data:', error);
    }
  };

  const fetchComparisonData = async () => {
    if (!selectedClass) return;
    
    try {
      // Compare with previous exam
      const examTypes = ['Quarterly', 'Half Yearly', 'Annual'];
      const currentIndex = examTypes.indexOf(selectedExam);
      
      if (currentIndex > 0) {
        const prevExam = examTypes[currentIndex - 1];
        const token = localStorage.getItem('token');
        const response = await fetch(
          `https://senthurvidyalaya-backend.onrender.com/api/exams/class-result/?class=${selectedClass}&section=${selectedSection}&exam_type=${prevExam}`,
          {
            headers: {
              'Authorization': `Token ${token}`,
            },
          }
        );
        
        if (response.ok) {
          const prevData = await response.json();
          const currentData = await fetch(
            `https://senthurvidyalaya-backend.onrender.com/api/exams/class-result/?class=${selectedClass}&section=${selectedSection}&exam_type=${selectedExam}`,
            {
              headers: {
                'Authorization': `Token ${token}`,
              },
            }
          ).then(res => res.ok ? res.json() : null);
          
          if (currentData) {
            const comparison = [
              {
                name: prevExam,
                pass: prevData.analytics?.total_pass || 0,
                fail: (prevData.analytics?.total_students || 0) - (prevData.analytics?.total_pass || 0)
              },
              {
                name: selectedExam,
                pass: currentData.analytics?.total_pass || 0,
                fail: (currentData.analytics?.total_students || 0) - (currentData.analytics?.total_pass || 0)
              }
            ];
            setComparisonData(comparison);
          }
        }
      }
    } catch (error) {
      console.error('Error fetching comparison data:', error);
    }
  };

  // Mock subjects - replace with API call
  const subjects = ['All', 'Mathematics', 'Science', 'English', 'Social Studies', 'Hindi', 'Physics', 'Chemistry'];
  
  // Colors for charts
  const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8', '#82CA9D'];

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="p-6 bg-gray-50 min-h-screen">
      {/* Header */}
      <div className="mb-8">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-gray-800">Teachers Performance Dashboard</h1>
            <p className="text-gray-600 mt-2">Monitor and analyze academic performance across classes</p>
          </div>
          <div className="flex items-center space-x-3">
            <span className="px-4 py-2 bg-blue-100 text-blue-800 text-sm font-medium rounded-full">
              Admin View
            </span>
            <span className="px-4 py-2 bg-purple-100 text-purple-800 text-sm font-medium rounded-full">
              {selectedClass ? `Class ${classes.find(c => c.id === selectedClass)?.name}` : 'Select Class'}
            </span>
          </div>
        </div>
      </div>

      {/* Filters Card */}
      <div className="bg-white rounded-xl shadow-lg p-6 mb-8">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6">
          {/* Class Selector */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              <div className="flex items-center">
                <AcademicCapIcon className="h-5 w-5 mr-2 text-blue-600" />
                Class
              </div>
            </label>
            <select
              value={selectedClass}
              onChange={(e) => setSelectedClass(e.target.value)}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              {classes.map((cls) => (
                <option key={cls.id} value={cls.id}>
                  Class {cls.name}
                </option>
              ))}
            </select>
          </div>

          {/* Section Selector */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Section
            </label>
            <select
              value={selectedSection}
              onChange={(e) => setSelectedSection(e.target.value)}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              {classes.find(c => c.id === selectedClass)?.sections.map((sec) => (
                <option key={sec} value={sec}>
                  Section {sec}
                </option>
              ))}
            </select>
          </div>

          {/* Exam Type Selector */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              <div className="flex items-center">
                <ChartBarIcon className="h-5 w-5 mr-2 text-green-600" />
                Exam Type
              </div>
            </label>
            <select
              value={selectedExam}
              onChange={(e) => setSelectedExam(e.target.value)}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="Quarterly">Quarterly</option>
              <option value="Half Yearly">Half Yearly</option>
              <option value="Annual">Annual</option>
            </select>
          </div>

          {/* Subject Selector */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Subject
            </label>
            <select
              value={selectedSubject}
              onChange={(e) => setSelectedSubject(e.target.value)}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              {subjects.map((subject) => (
                <option key={subject} value={subject}>
                  {subject}
                </option>
              ))}
            </select>
          </div>

          {/* Refresh Button */}
          <div className="flex items-end">
            <button
              onClick={fetchPerformanceData}
              className="w-full px-6 py-3 bg-gradient-to-r from-blue-600 to-blue-700 text-white font-medium rounded-lg hover:from-blue-700 hover:to-blue-800 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
            >
              Refresh Data
            </button>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="mb-8">
        <div className="border-b border-gray-200">
          <nav className="-mb-px flex space-x-8">
            {[
              { id: 'overview', label: 'Overview', icon: ChartPieIcon },
              { id: 'detailed', label: 'Detailed Analysis', icon: ChartBarIcon },
              { id: 'comparison', label: 'Comparison', icon: ArrowTrendingUpIcon },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`
                  py-4 px-1 border-b-2 font-medium text-sm flex items-center space-x-2
                  ${activeTab === tab.id
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }
                `}
              >
                <tab.icon className="h-5 w-5" />
                <span>{tab.label}</span>
              </button>
            ))}
          </nav>
        </div>
      </div>

      {/* Content based on active tab */}
      {activeTab === 'overview' && (
        <>
          {/* Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            {/* Average Score */}
            <div className="bg-white rounded-xl shadow-lg p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Average Score</p>
                  <p className="text-3xl font-bold text-gray-800 mt-2">
                    {performanceStats?.average_score.toFixed(1) || '0.0'}%
                  </p>
                  <p className="text-sm text-gray-500 mt-1">Class Average</p>
                </div>
                <div className="p-3 bg-blue-100 rounded-full">
                  <ChartBarIcon className="h-8 w-8 text-blue-600" />
                </div>
              </div>
              <div className="mt-4">
                <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-gradient-to-r from-blue-500 to-blue-600 rounded-full"
                    style={{ width: `${Math.min(performanceStats?.average_score || 0, 100)}%` }}
                  />
                </div>
              </div>
            </div>

            {/* Top Performer */}
            <div className="bg-white rounded-xl shadow-lg p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Top Performer</p>
                  <p className="text-2xl font-bold text-gray-800 mt-2 truncate">
                    {performanceStats?.top_performer || 'N/A'}
                  </p>
                  <p className="text-sm text-gray-500 mt-1">Highest Score</p>
                </div>
                <div className="p-3 bg-green-100 rounded-full">
                  <UserGroupIcon className="h-8 w-8 text-green-600" />
                </div>
              </div>
              <div className="mt-4">
                <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-green-100 text-green-800">
                  🏆 Top Rank
                </span>
              </div>
            </div>

            {/* Pass Percentage */}
            <div className="bg-white rounded-xl shadow-lg p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Pass Percentage</p>
                  <p className="text-3xl font-bold text-gray-800 mt-2">
                    {performanceStats?.pass_percentage.toFixed(1) || '0'}%
                  </p>
                  <p className="text-sm text-gray-500 mt-1">Students Passed</p>
                </div>
                <div className="p-3 bg-purple-100 rounded-full">
                  <ArrowTrendingUpIcon className="h-8 w-8 text-purple-600" />
                </div>
              </div>
              <div className="mt-4 flex items-center">
                {performanceStats && performanceStats.pass_percentage > 75 ? (
                  <ArrowTrendingUpIcon className="h-5 w-5 text-green-500 mr-1" />
                ) : (
                  <ArrowTrendingDownIcon className="h-5 w-5 text-red-500 mr-1" />
                )}
                <span className={`text-sm ${performanceStats && performanceStats.pass_percentage > 75 ? 'text-green-600' : 'text-red-600'}`}>
                  {performanceStats && performanceStats.pass_percentage > 75 ? 'Good' : 'Needs Improvement'}
                </span>
              </div>
            </div>

            {/* Total Students */}
            <div className="bg-white rounded-xl shadow-lg p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Total Students</p>
                  <p className="text-3xl font-bold text-gray-800 mt-2">
                    {performanceStats?.total_students || 0}
                  </p>
                  <p className="text-sm text-gray-500 mt-1">In Class</p>
                </div>
                <div className="p-3 bg-yellow-100 rounded-full">
                  <UserGroupIcon className="h-8 w-8 text-yellow-600" />
                </div>
              </div>
              <div className="mt-4">
                <span className="text-sm text-gray-600">
                  {students.length} students loaded
                </span>
              </div>
            </div>
          </div>

          {/* Charts */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
            {/* Grade Distribution */}
            <div className="bg-white rounded-xl shadow-lg p-6">
              <h3 className="text-lg font-semibold text-gray-800 mb-6">Grade Distribution</h3>
              <div className="h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={performanceData}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                      outerRadius={80}
                      fill="#8884d8"
                      dataKey="value"
                    >
                      {performanceData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Subject-wise Performance */}
            {selectedSubject !== 'All' && subjectData.length > 0 && (
              <div className="bg-white rounded-xl shadow-lg p-6">
                <h3 className="text-lg font-semibold text-gray-800 mb-6">
                  {selectedSubject} Performance
                </h3>
                <div className="h-80">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={subjectData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="name" />
                      <YAxis />
                      <Tooltip />
                      <Legend />
                      <Bar 
                        dataKey="value" 
                        fill="#8884d8" 
                        radius={[4, 4, 0, 0]}
                        name="Number of Students"
                      />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
            )}
          </div>
        </>
      )}

      {activeTab === 'detailed' && (
        <div className="bg-white rounded-xl shadow-lg p-6">
          <h3 className="text-lg font-semibold text-gray-800 mb-6">Detailed Student Performance</h3>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead>
                <tr className="bg-gray-50">
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Student ID
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Name
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Score
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Grade
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {students.map((student) => (
                  <tr key={student.student_id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">
                        {student.student_id}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">{student.student_name}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">85%</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="px-2 py-1 text-xs font-medium rounded-full bg-green-100 text-green-800">
                        A
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="px-2 py-1 text-xs font-medium rounded-full bg-blue-100 text-blue-800">
                        Pass
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {activeTab === 'comparison' && comparisonData.length > 0 && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <div className="bg-white rounded-xl shadow-lg p-6">
            <h3 className="text-lg font-semibold text-gray-800 mb-6">Exam Comparison</h3>
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={comparisonData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Bar dataKey="pass" fill="#4CAF50" name="Passed" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="fail" fill="#F44336" name="Failed" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-lg p-6">
            <h3 className="text-lg font-semibold text-gray-800 mb-6">Performance Trends</h3>
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart
                  data={[
                    { name: 'Quarterly', score: 75 },
                    { name: 'Half Yearly', score: 82 },
                    { name: 'Annual', score: 85 }
                  ]}
                >
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Line
                    type="monotone"
                    dataKey="score"
                    stroke="#3B82F6"
                    strokeWidth={3}
                    dot={{ r: 6 }}
                    activeDot={{ r: 8 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default TeachersPerformancePage;