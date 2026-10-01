'use client';

import React, { useState, useEffect } from 'react';
import { 
  FaChartBar, 
  FaChartLine, 
  FaChartPie, 
  FaUserGraduate, 
  FaSearch,
  FaArrowUp,
  FaArrowDown,
  FaEquals,
  FaFilter
} from 'react-icons/fa';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, BarChart, Bar } from 'recharts';

export default function PerformanceAnalytics() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [analyticsData, setAnalyticsData] = useState<any>(null);
  const [studentId, setStudentId] = useState('');
  const [selectedStudent, setSelectedStudent] = useState<any>(null);
  const [students, setStudents] = useState<any[]>([]);
  const [viewType, setViewType] = useState<'marks' | 'comparative'>('marks');

  useEffect(() => {
    fetchClassStudents();
  }, []);

  const fetchClassStudents = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch('https://senthurvidyalaya-backend.onrender.com/api/student/list/', {
        headers: {
          'Authorization': `Token ${token}`,
          'Content-Type': 'application/json'
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        setStudents(data.students || []);
      }
    } catch (err) {
      console.error('Error fetching students:', err);
    }
  };

  const fetchPerformanceAnalytics = async (id: string) => {
    try {
      setLoading(true);
      setError('');
      
      const token = localStorage.getItem('token');
      const response = await fetch(
        `https://senthurvidyalaya-backend.onrender.com/api/performance/class/marks/?student_id=${id}`,
        {
          headers: {
            'Authorization': `Token ${token}`,
            'Content-Type': 'application/json'
          }
        }
      );

      if (response.ok) {
        const data = await response.json();
        setAnalyticsData(data);
        
        // Find selected student
        const student = students.find(s => s.student_id === id);
        setSelectedStudent(student);
      } else {
        setError('Failed to fetch performance analytics');
      }
    } catch (err) {
      setError('Error fetching performance data');
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (studentId) {
      fetchPerformanceAnalytics(studentId);
    }
  };

  const getTrendIcon = (trend: string) => {
    switch (trend.toLowerCase()) {
      case 'increase': return <FaArrowUp className="text-green-500" />;
      case 'decrease': return <FaArrowDown className="text-red-500" />;
      default: return <FaEquals className="text-gray-500" />;
    }
  };

  const getTrendColor = (trend: string) => {
    switch (trend.toLowerCase()) {
      case 'increase': return 'text-green-600 bg-green-50';
      case 'decrease': return 'text-red-600 bg-red-50';
      default: return 'text-gray-600 bg-gray-50';
    }
  };

  // Prepare data for charts
  const prepareChartData = () => {
    if (!analyticsData?.graph_data) return [];
    
    return analyticsData.graph_data.map((item: any) => ({
      name: item.exam,
      marks: item.value,
      change: item.change_percentage
    }));
  };

  // Prepare comparative data (if available)
  const prepareComparativeData = () => {
    // This would require additional API endpoint for class averages
    // For now, we'll create sample data
    if (!analyticsData?.graph_data) return [];
    
    return analyticsData.graph_data.map((item: any, index: number) => ({
      name: item.exam,
      student: item.value,
      classAverage: 75 + (index * 5), // Sample average data
      topScore: 95 - (index * 2) // Sample top score data
    }));
  };

  return (
    <div className="p-6 bg-gradient-to-br from-blue-50 to-gray-50 min-h-screen">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-blue-100 rounded-xl">
              <FaChartLine className="text-3xl text-blue-600" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-gray-800">Performance Analytics</h1>
              <p className="text-gray-600">Track and analyze student academic performance</p>
            </div>
          </div>
        </div>

        {/* Search and Controls */}
        <div className="bg-white rounded-2xl shadow-xl p-6 mb-6">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex-1">
              <form onSubmit={handleSearch} className="flex gap-3">
                <div className="flex-1 relative">
                  <input
                    type="text"
                    value={studentId}
                    onChange={(e) => setStudentId(e.target.value)}
                    placeholder="Enter Student ID..."
                    className="w-full px-4 py-3 pl-12 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  />
                  <FaSearch className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400" />
                </div>
                <button
                  type="submit"
                  disabled={loading || !studentId}
                  className="px-6 py-3 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 disabled:opacity-50"
                >
                  {loading ? 'Loading...' : 'Analyze'}
                </button>
              </form>
            </div>
            
            <div className="flex gap-2">
              <button
                onClick={() => setViewType('marks')}
                className={`px-4 py-2 rounded-lg font-medium ${
                  viewType === 'marks' 
                    ? 'bg-blue-600 text-white' 
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                <FaChartBar className="inline mr-2" />
                Marks Trend
              </button>
              <button
                onClick={() => setViewType('comparative')}
                className={`px-4 py-2 rounded-lg font-medium ${
                  viewType === 'comparative' 
                    ? 'bg-blue-600 text-white' 
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                <FaChartPie className="inline mr-2" />
                Comparative
              </button>
            </div>
          </div>
        </div>

        {selectedStudent && analyticsData ? (
          <>
            {/* Student Info Card */}
            <div className="bg-white rounded-2xl shadow-xl p-6 mb-6">
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-4">
                  <div className="w-16 h-16 bg-gradient-to-r from-blue-500 to-purple-600 rounded-full flex items-center justify-center text-white text-2xl font-bold">
                    {selectedStudent.student_name?.charAt(0) || 'S'}
                  </div>
                  <div>
                    <h2 className="text-2xl font-bold text-gray-800">{selectedStudent.student_name}</h2>
                    <div className="flex items-center gap-4 mt-1">
                      <span className="text-gray-600">ID: {selectedStudent.student_id}</span>
                      <span className="text-blue-600 font-medium">
                        {analyticsData.type === 'marks' ? 'Academic Performance' : 'Behavior Analysis'}
                      </span>
                    </div>
                  </div>
                </div>
                
                <div className="text-right">
                  <div className="text-3xl font-bold text-blue-600">
                    {analyticsData.graph_data.length > 0 
                      ? `${analyticsData.graph_data[analyticsData.graph_data.length - 1].value}%`
                      : 'N/A'
                    }
                  </div>
                  <p className="text-sm text-gray-500">Latest Score</p>
                </div>
              </div>

              {/* Quick Stats */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {analyticsData.graph_data.map((item: any, index: number) => (
                  <div key={index} className="bg-gray-50 rounded-lg p-4">
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-medium text-gray-700">{item.exam}</span>
                      {getTrendIcon(item.trend)}
                    </div>
                    <div className="flex items-baseline gap-2">
                      <span className="text-2xl font-bold">{item.value}%</span>
                      <span className={`text-sm font-medium ${getTrendColor(item.trend).split(' ')[0]}`}>
                        {item.change_percentage > 0 ? '+' : ''}{item.change_percentage}%
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Charts Section */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
              {/* Line Chart */}
              <div className="bg-white rounded-2xl shadow-xl p-6">
                <h3 className="text-lg font-bold text-gray-800 mb-4">Performance Trend</h3>
                <div className="h-72">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={prepareChartData()}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                      <XAxis dataKey="name" stroke="#666" />
                      <YAxis stroke="#666" />
                      <Tooltip 
                        formatter={(value) => [`${value}%`, 'Marks']}
                        labelFormatter={(label) => `Exam: ${label}`}
                      />
                      <Legend />
                      <Line 
                        type="monotone" 
                        dataKey="marks" 
                        name="Marks" 
                        stroke="#3b82f6" 
                        strokeWidth={2}
                        dot={{ r: 4 }}
                        activeDot={{ r: 6 }}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* Bar Chart */}
              <div className="bg-white rounded-2xl shadow-xl p-6">
                <h3 className="text-lg font-bold text-gray-800 mb-4">Performance Comparison</h3>
                <div className="h-72">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={prepareComparativeData()}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                      <XAxis dataKey="name" stroke="#666" />
                      <YAxis stroke="#666" />
                      <Tooltip 
                        formatter={(value) => [`${value}%`, 'Score']}
                        labelFormatter={(label) => `Exam: ${label}`}
                      />
                      <Legend />
                      <Bar 
                        name="Student" 
                        dataKey="student" 
                        fill="#3b82f6" 
                        radius={[4, 4, 0, 0]}
                      />
                      <Bar 
                        name="Class Average" 
                        dataKey="classAverage" 
                        fill="#10b981" 
                        radius={[4, 4, 0, 0]}
                      />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>

            {/* Detailed Analysis */}
            <div className="bg-white rounded-2xl shadow-xl p-6">
              <h3 className="text-lg font-bold text-gray-800 mb-4">Detailed Performance Analysis</h3>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="bg-gray-50">
                      <th className="py-3 px-4 text-left">Exam</th>
                      <th className="py-3 px-4 text-left">Marks</th>
                      <th className="py-3 px-4 text-left">Change %</th>
                      <th className="py-3 px-4 text-left">Trend</th>
                      <th className="py-3 px-4 text-left">Analysis</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {analyticsData.graph_data.map((item: any, index: number) => (
                      <tr key={index}>
                        <td className="py-3 px-4 font-medium">{item.exam}</td>
                        <td className="py-3 px-4">
                          <div className="flex items-center gap-2">
                            <span className="text-lg font-bold">{item.value}%</span>
                          </div>
                        </td>
                        <td className="py-3 px-4">
                          <span className={`px-3 py-1 rounded-full text-sm font-medium ${getTrendColor(item.trend)}`}>
                            {item.change_percentage > 0 ? '+' : ''}{item.change_percentage}%
                          </span>
                        </td>
                        <td className="py-3 px-4">
                          <div className="flex items-center gap-2">
                            {getTrendIcon(item.trend)}
                            <span className="capitalize">{item.trend}</span>
                          </div>
                        </td>
                        <td className="py-3 px-4">
                          {item.trend === 'increase' && (
                            <span className="text-green-600">Showing consistent improvement</span>
                          )}
                          {item.trend === 'decrease' && (
                            <span className="text-red-600">Needs attention and support</span>
                          )}
                          {item.trend === 'neutral' && (
                            <span className="text-gray-600">Maintaining steady performance</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </>
        ) : (
          /* Empty State or Search Prompt */
          <div className="bg-white rounded-2xl shadow-xl p-12 text-center">
            <div className="max-w-md mx-auto">
              <FaChartLine className="text-6xl text-gray-300 mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-gray-600 mb-2">
                {studentId ? 'No Data Found' : 'Search Student Performance'}
              </h3>
              <p className="text-gray-500 mb-6">
                {studentId 
                  ? `No performance data found for student ID: ${studentId}`
                  : 'Enter a student ID to view their performance analytics'
                }
              </p>
              
              {/* Student Quick Select */}
              <div className="mt-6">
                <h4 className="text-sm font-medium text-gray-700 mb-3">Quick Select</h4>
                <div className="flex flex-wrap gap-2 justify-center">
                  {students.slice(0, 5).map((student) => (
                    <button
                      key={student.student_id}
                      onClick={() => {
                        setStudentId(student.student_id);
                        fetchPerformanceAnalytics(student.student_id);
                      }}
                      className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 text-sm font-medium"
                    >
                      {student.student_name}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {error && (
          <div className="mt-6 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
            {error}
          </div>
        )}
      </div>
    </div>
  );
}