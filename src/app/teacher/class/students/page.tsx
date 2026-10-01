'use client';

import React, { useState, useEffect } from 'react';
import { 
  FaUsers, FaUserGraduate, FaIdCard, FaSearch, FaSort, FaSortUp, FaSortDown, 
  FaPhone, FaEnvelope, FaUser, FaGenderless, FaMapMarkerAlt, 
  FaBirthdayCake, FaSchool, FaChalkboardTeacher, FaBook, 
  FaClipboardList, FaDownload, FaFilter, FaEye, FaStar, FaGraduationCap,
  FaHeart, FaCrown, FaAward
} from 'react-icons/fa';
import { GiNotebook, GiSchoolBag } from 'react-icons/gi';
import { MdEmail, MdPhone, MdPerson, MdFamilyRestroom, MdLocationOn } from 'react-icons/md';

// API Configuration
const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || 'https://senthurvidyalaya-backend.onrender.com';

export default function ClassStudents() {
  const [students, setStudents] = useState<any[]>([]);
  const [classInfo, setClassInfo] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedStudent, setSelectedStudent] = useState<any>(null);
  const [studentDetails, setStudentDetails] = useState<any>(null);
  const [activeTab, setActiveTab] = useState('basic');
  const [sortConfig, setSortConfig] = useState({ key: 'roll_no', direction: 'asc' });
  const [detailsLoading, setDetailsLoading] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [filters, setFilters] = useState({
    gender: 'all',
    searchType: 'all'
  });

  useEffect(() => {
    fetchStudentList();
  }, []);

  const fetchStudentList = async () => {
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        setError('Authentication required. Please login.');
        setLoading(false);
        return;
      }

      const response = await fetch(`${API_BASE_URL}/api/student/list/`, {
        headers: {
          'Authorization': `Token ${token}`,
          'Content-Type': 'application/json'
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        
        if (data.students && Array.isArray(data.students)) {
          const enhancedStudents = data.students.map((student: any, index: number) => ({
            ...student,
            roll_no: index + 1,
            class_info: data.class_info
          }));
          setStudents(enhancedStudents);
          setClassInfo({
            class_info: data.class_info,
            count: data.count
          });
        } else {
          setError('Unexpected API response format');
        }
      } else if (response.status === 403) {
        setError('You are not assigned as a Class Teacher. You cannot view class students.');
      } else {
        const errorData = await response.json();
        setError(errorData.error || 'Failed to fetch student list');
      }
    } catch (err) {
      setError('Error connecting to server. Please check your connection.');
      console.error('Fetch error:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchStudentDetails = async (studentId: string) => {
    if (!studentId) return;
    
    setDetailsLoading(true);
    setActiveTab('basic');
    try {
      const token = localStorage.getItem('token');
      const detailsResponse = await fetch(
        `${API_BASE_URL}/api/student/details/?student_id=${studentId}`,
        {
          headers: {
            'Authorization': `Token ${token}`,
            'Content-Type': 'application/json'
          }
        }
      );
      
      if (detailsResponse.ok) {
        const detailsData = await detailsResponse.json();
        setStudentDetails(detailsData);
      } else {
        const errorData = await detailsResponse.json();
        console.error('Details fetch error:', errorData);
        const basicInfo = students.find(s => s.student_id === studentId);
        setStudentDetails(basicInfo || null);
      }
    } catch (err) {
      console.error('Error fetching student details:', err);
      const basicInfo = students.find(s => s.student_id === studentId);
      setStudentDetails(basicInfo || null);
    } finally {
      setDetailsLoading(false);
    }
  };

  const handleViewDetails = async (student: any) => {
    setSelectedStudent(student);
    await fetchStudentDetails(student.student_id);
  };

  const handleSort = (key: string) => {
    let direction = 'asc';
    if (sortConfig.key === key && sortConfig.direction === 'asc') {
      direction = 'desc';
    }
    setSortConfig({ key, direction });
  };

  const getSortedStudents = () => {
    let filtered = students.filter((student) =>
      student.student_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      student.student_id?.toLowerCase().includes(searchTerm.toLowerCase())
    );

    if (filters.gender !== 'all') {
      filtered = filtered.filter(student => {
        if (studentDetails && studentDetails.student_id === student.student_id) {
          return studentDetails.gender?.toLowerCase() === filters.gender.toLowerCase();
        }
        return true;
      });
    }

    return filtered.sort((a, b) => {
      if (sortConfig.key === 'student_name') {
        const nameA = a.student_name || '';
        const nameB = b.student_name || '';
        return sortConfig.direction === 'asc' 
          ? nameA.localeCompare(nameB)
          : nameB.localeCompare(nameA);
      }
      
      if (sortConfig.key === 'student_id') {
        const idA = a.student_id || '';
        const idB = b.student_id || '';
        return sortConfig.direction === 'asc'
          ? idA.localeCompare(idB)
          : idB.localeCompare(idA);
      }
      
      if (sortConfig.key === 'roll_no') {
        const rollA = a.roll_no || 0;
        const rollB = b.roll_no || 0;
        return sortConfig.direction === 'asc'
          ? rollA - rollB
          : rollB - rollA;
      }
      
      return 0;
    });
  };

  const getSortIcon = (key: string) => {
    if (sortConfig.key !== key) {
      return <FaSort className="text-gray-400" />;
    }
    return sortConfig.direction === 'asc' 
      ? <FaSortUp className="text-[#8B5CF6]" />
      : <FaSortDown className="text-[#8B5CF6]" />;
  };

  const exportStudentList = () => {
    const csvContent = [
      ['Roll No', 'Student ID', 'Name', 'Class', 'Section', 'Gender', 'Parent Phone', 'Email'].join(','),
      ...getSortedStudents().map(s => {
        const studentDetail = s.student_id === studentDetails?.student_id ? studentDetails : null;
        return [
          s.roll_no,
          s.student_id,
          `"${s.student_name}"`,
          studentDetail?.class_name || '',
          studentDetail?.section || '',
          studentDetail?.gender || 'N/A',
          studentDetail?.father_phone || 'N/A',
          studentDetail?.student_email || 'N/A'
        ].join(',');
      })
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `students_${classInfo?.class_info || 'class'}_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-screen bg-gradient-to-br from-[#667eea] to-[#764ba2]">
        <div className="animate-spin rounded-full h-20 w-20 border-4 border-white border-t-transparent mb-6"></div>
        <p className="text-white text-xl font-medium">Loading student data...</p>
        <p className="text-white/80 text-sm mt-2">Please wait while we fetch the information</p>
      </div>
    );
  }

  const sortedStudents = getSortedStudents();
  const maleCount = students.filter(s => studentDetails?.student_id === s.student_id && studentDetails?.gender?.toLowerCase() === 'male').length;
  const femaleCount = students.filter(s => studentDetails?.student_id === s.student_id && studentDetails?.gender?.toLowerCase() === 'female').length;

  return (
    <div className="p-4 md:p-6 bg-gradient-to-br from-[#f8fafc] via-[#f1f5f9] to-[#e2e8f0] min-h-screen">
      <div className="max-w-7xl mx-auto">
        {/* Header with Stats */}
        <div className="mb-8">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 mb-8">
            <div>
              <div className="flex items-center gap-3 mb-4">
                <div className="p-3 bg-gradient-to-r from-[#8B5CF6] to-[#EC4899] rounded-xl text-white shadow-lg">
                  <FaUsers size={28} />
                </div>
                <div>
                  <h1 className="text-3xl md:text-4xl font-bold bg-gradient-to-r from-[#8B5CF6] to-[#3B82F6] bg-clip-text text-transparent">
                    Class Students
                  </h1>
                  <p className="text-gray-600 mt-1">Manage and view student information</p>
                </div>
              </div>
              
              <div className="flex flex-wrap items-center gap-3 mt-4">
                <div className="bg-gradient-to-r from-blue-500 to-blue-600 text-white px-4 py-2 rounded-full flex items-center gap-2 shadow-md">
                  <FaSchool />
                  <span className="font-semibold">{classInfo?.class_info || 'N/A'}</span>
                </div>
                <div className="bg-gradient-to-r from-purple-500 to-purple-600 text-white px-4 py-2 rounded-full flex items-center gap-2 shadow-md">
                  <FaUserGraduate />
                  <span className="font-semibold">{classInfo?.count || 0} Students</span>
                </div>
                <div className="bg-gradient-to-r from-pink-500 to-pink-600 text-white px-4 py-2 rounded-full flex items-center gap-2 shadow-md">
                  <FaChalkboardTeacher />
                  <span className="font-semibold">{sortedStudents.length} Listed</span>
                </div>
              </div>
            </div>
            
            <div className="flex flex-wrap gap-3">
              <button
                onClick={fetchStudentList}
                className="px-5 py-3 bg-gradient-to-r from-[#3B82F6] to-[#1D4ED8] text-white rounded-xl font-semibold hover:from-[#1D4ED8] hover:to-[#1E40AF] transition-all shadow-lg hover:shadow-xl flex items-center gap-3 hover:scale-[1.02]"
              >
                <FaSearch />
                Refresh List
              </button>
              <button
                onClick={exportStudentList}
                className="px-5 py-3 bg-gradient-to-r from-[#10B981] to-[#059669] text-white rounded-xl font-semibold hover:from-[#059669] hover:to-[#047857] transition-all shadow-lg hover:shadow-xl flex items-center gap-3 hover:scale-[1.02]"
              >
                <FaDownload />
                Export CSV
              </button>
              <button
                onClick={() => setShowFilters(!showFilters)}
                className="px-5 py-3 bg-gradient-to-r from-[#8B5CF6] to-[#7C3AED] text-white rounded-xl font-semibold hover:from-[#7C3AED] hover:to-[#6D28D9] transition-all shadow-lg hover:shadow-xl flex items-center gap-3 hover:scale-[1.02]"
              >
                <FaFilter />
                Filters
              </button>
            </div>
          </div>
        </div>

        {/* Filters Panel */}
        {showFilters && (
          <div className="bg-white rounded-2xl shadow-2xl p-6 mb-8 border border-gray-200/50 backdrop-blur-sm bg-white/90">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-3">Filter by Gender</label>
                <select 
                  value={filters.gender}
                  onChange={(e) => setFilters(prev => ({ ...prev, gender: e.target.value }))}
                  className="w-full px-4 py-3 bg-gray-50 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-[#8B5CF6] focus:border-transparent transition-all"
                >
                  <option value="all">All Genders</option>
                  <option value="male">Male Students</option>
                  <option value="female">Female Students</option>
                </select>
              </div>
              
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-3">Search Type</label>
                <select 
                  value={filters.searchType}
                  onChange={(e) => setFilters(prev => ({ ...prev, searchType: e.target.value }))}
                  className="w-full px-4 py-3 bg-gray-50 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-[#8B5CF6] focus:border-transparent transition-all"
                >
                  <option value="all">Search All</option>
                  <option value="name">By Student Name</option>
                  <option value="id">By Student ID</option>
                </select>
              </div>
              
              <div className="flex items-end">
                <button
                  onClick={() => {
                    setFilters({ gender: 'all', searchType: 'all' });
                    setSearchTerm('');
                  }}
                  className="w-full px-4 py-3 bg-gradient-to-r from-gray-600 to-gray-700 text-white rounded-xl font-semibold hover:from-gray-700 hover:to-gray-800 transition-all shadow-md hover:shadow-lg"
                >
                  Reset All Filters
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Search Bar */}
        <div className="bg-gradient-to-r from-white to-gray-50 rounded-2xl shadow-2xl p-6 mb-8 border border-gray-200/50">
          <div className="flex flex-col md:flex-row items-center gap-4">
            <div className="flex-1 relative w-full">
              <div className="absolute left-4 top-1/2 transform -translate-y-1/2">
                <div className="p-2 bg-gradient-to-r from-[#8B5CF6] to-[#EC4899] rounded-lg text-white">
                  <FaSearch />
                </div>
              </div>
              <input
                type="text"
                placeholder="Search students by name, ID, or details..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full px-16 py-4 bg-gray-50 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-[#8B5CF6] focus:border-transparent transition-all text-gray-800 placeholder-gray-500"
              />
            </div>
            
            <div className="flex items-center gap-4">
              <div className="px-4 py-2 bg-blue-50 rounded-lg">
                <span className="text-blue-700 font-semibold">
                  {sortedStudents.length} <span className="text-blue-500">/ {students.length}</span>
                </span>
              </div>
              <button
                onClick={() => setSearchTerm('')}
                className="px-4 py-2 text-gray-600 hover:text-gray-800 font-medium transition-colors"
              >
                Clear
              </button>
            </div>
          </div>
        </div>

        {/* Students Table */}
        <div className="bg-white rounded-2xl shadow-2xl overflow-hidden border border-gray-200/50">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-gradient-to-r from-[#8B5CF6] to-[#3B82F6]">
                  <th className="py-6 px-8 text-left">
                    <button
                      onClick={() => handleSort('roll_no')}
                      className="flex items-center gap-3 font-bold text-white hover:text-gray-200 transition-colors"
                    >
                      <span className="flex items-center gap-2">
                        <FaSort className="text-white/80" />
                        Roll No
                      </span>
                      {getSortIcon('roll_no')}
                    </button>
                  </th>
                  <th className="py-6 px-8 text-left">
                    <button
                      onClick={() => handleSort('student_id')}
                      className="flex items-center gap-3 font-bold text-white hover:text-gray-200 transition-colors"
                    >
                      Student ID
                      {getSortIcon('student_id')}
                    </button>
                  </th>
                  <th className="py-6 px-8 text-left">
                    <button
                      onClick={() => handleSort('student_name')}
                      className="flex items-center gap-3 font-bold text-white hover:text-gray-200 transition-colors"
                    >
                      Student Details
                      {getSortIcon('student_name')}
                    </button>
                  </th>
                  <th className="py-6 px-8 text-left">
                    <span className="font-bold text-white">Actions</span>
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {sortedStudents.map((student, index) => (
                  <tr 
                    key={student.student_id} 
                    className={`hover:bg-gradient-to-r hover:from-blue-50 hover:to-purple-50 transition-all duration-300 ${
                      index % 2 === 0 ? 'bg-white' : 'bg-gray-50/50'
                    }`}
                  >
                    <td className="py-6 px-8">
                      <div className="flex items-center gap-4">
                        <div className="relative">
                          <div className="w-12 h-12 bg-gradient-to-br from-[#8B5CF6] to-[#3B82F6] text-white rounded-xl flex items-center justify-center font-bold text-lg shadow-lg">
                            {student.roll_no}
                          </div>
                          {index < 3 && (
                            <div className="absolute -top-2 -right-2 bg-gradient-to-r from-yellow-400 to-yellow-500 text-white text-xs font-bold px-2 py-1 rounded-full">
                              <FaStar size={10} />
                            </div>
                          )}
                        </div>
                        <div className="text-sm text-gray-600">
                          Rank #{student.roll_no}
                        </div>
                      </div>
                    </td>
                    <td className="py-6 px-8">
                      <div className="flex items-center gap-3">
                        <div className="p-3 bg-gradient-to-r from-blue-100 to-blue-200 rounded-lg">
                          <FaIdCard className="text-blue-600" size={20} />
                        </div>
                        <div>
                          <div className="font-mono font-bold text-gray-800 text-lg">{student.student_id}</div>
                          <div className="text-xs text-gray-500">Unique ID</div>
                        </div>
                      </div>
                    </td>
                    <td className="py-6 px-8">
                      <div className="flex items-center gap-4">
                        <div className="relative">
                          <div className="w-14 h-14 bg-gradient-to-r from-[#EC4899] to-[#8B5CF6] rounded-full flex items-center justify-center text-white font-bold text-xl shadow-xl">
                            {student.student_name?.charAt(0) || 'S'}
                          </div>
                          {studentDetails?.student_id === student.student_id && studentDetails?.gender && (
                            <div className={`absolute -bottom-2 -right-2 text-xs font-bold px-2 py-1 rounded-full ${
                              studentDetails.gender.toLowerCase() === 'male' 
                                ? 'bg-gradient-to-r from-blue-500 to-blue-600 text-white'
                                : 'bg-gradient-to-r from-pink-500 to-pink-600 text-white'
                            }`}>
                              {studentDetails.gender === 'Male' ? '♂' : '♀'}
                            </div>
                          )}
                        </div>
                        <div>
                          <div className="font-bold text-gray-800 text-lg">{student.student_name}</div>
                          <div className="flex items-center gap-2 mt-2">
                            {studentDetails?.student_id === student.student_id && studentDetails?.class_name && (
                              <span className="px-3 py-1 bg-gradient-to-r from-green-100 to-green-200 text-green-800 text-xs font-semibold rounded-full">
                                Class {studentDetails.class_name} - {studentDetails.section}
                              </span>
                            )}
                            {studentDetails?.student_id === student.student_id && studentDetails?.gender && (
                              <span className={`px-3 py-1 text-xs font-semibold rounded-full ${
                                studentDetails.gender.toLowerCase() === 'male' 
                                  ? 'bg-gradient-to-r from-blue-100 to-blue-200 text-blue-800'
                                  : 'bg-gradient-to-r from-pink-100 to-pink-200 text-pink-800'
                              }`}>
                                {studentDetails.gender}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="py-6 px-8">
                      <button
                        onClick={() => handleViewDetails(student)}
                        className="px-6 py-3 bg-gradient-to-r from-[#8B5CF6] to-[#3B82F6] text-white rounded-xl font-semibold hover:from-[#7C3AED] hover:to-[#1D4ED8] transition-all shadow-lg hover:shadow-xl flex items-center gap-3 hover:scale-105"
                      >
                        <FaEye />
                        View Profile
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Empty State */}
          {sortedStudents.length === 0 && (
            <div className="text-center py-20">
              <div className="w-32 h-32 bg-gradient-to-r from-gray-200 to-gray-300 rounded-full flex items-center justify-center mx-auto mb-8">
                <GiNotebook className="text-6xl text-gray-400" />
              </div>
              <h3 className="text-3xl font-bold text-gray-600 mb-4">No students found</h3>
              <p className="text-gray-500 text-lg mb-8 max-w-md mx-auto">
                Try adjusting your search terms or filters to find what you're looking for.
              </p>
              <button
                onClick={() => {
                  setSearchTerm('');
                  setFilters({ gender: 'all', searchType: 'all' });
                }}
                className="px-8 py-3 bg-gradient-to-r from-[#8B5CF6] to-[#3B82F6] text-white rounded-xl font-semibold hover:from-[#7C3AED] hover:to-[#1D4ED8] transition-all shadow-lg"
              >
                Reset & Show All Students
              </button>
            </div>
          )}

          {/* Summary Footer */}
          {sortedStudents.length > 0 && (
            <div className="border-t border-gray-200/50 px-8 py-6 bg-gradient-to-r from-gray-50 to-white">
              <div className="flex flex-col md:flex-row justify-between items-center gap-6">
                <div className="flex items-center gap-4">
                  <div className="p-3 bg-gradient-to-r from-blue-100 to-blue-200 rounded-xl">
                    <FaGraduationCap className="text-blue-600" size={20} />
                  </div>
                  <div>
                    <div className="text-gray-700 font-medium">
                      Showing <span className="font-bold text-blue-600">{sortedStudents.length}</span> of{' '}
                      <span className="font-bold text-gray-800">{students.length}</span> students
                    </div>
                    <div className="text-sm text-gray-500 mt-1">
                      Class {classInfo?.class_info?.split(' - ')[0] || 'N/A'} • Section {classInfo?.class_info?.split(' - ')[1] || 'N/A'}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <div className="text-sm text-gray-600 bg-gray-100 px-4 py-2 rounded-lg">
                    Last updated: {new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </div>
                  <button
                    onClick={fetchStudentList}
                    className="px-4 py-2 text-blue-600 hover:text-blue-700 font-medium transition-colors"
                  >
                    Refresh Data
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Student Detail Modal */}
        {selectedStudent && (
          <div className="fixed inset-0 bg-black/80 flex items-center justify-center p-4 z-50 backdrop-blur-sm animate-fadeIn">
            <div className="bg-white rounded-3xl max-w-4xl w-full max-h-[90vh] overflow-y-auto shadow-2xl animate-slideUp">
              <div className="sticky top-0 bg-gradient-to-r from-[#8B5CF6] to-[#3B82F6] text-white px-8 py-6 flex justify-between items-center z-10">
                <div className="flex items-center gap-4">
                  <div className="p-3 bg-white/20 rounded-xl backdrop-blur-sm">
                    <FaUserGraduate size={24} />
                  </div>
                  <div>
                    <h2 className="text-2xl font-bold">Student Profile</h2>
                    <p className="text-white/80 text-sm">Detailed information view</p>
                  </div>
                </div>
                <button
                  onClick={() => {
                    setSelectedStudent(null);
                    setStudentDetails(null);
                  }}
                  className="text-white hover:text-gray-200 text-3xl transition-colors hover:scale-110"
                >
                  ×
                </button>
              </div>
              
              <div className="p-8">
                {detailsLoading ? (
                  <div className="flex justify-center items-center h-96">
                    <div className="animate-spin rounded-full h-16 w-16 border-4 border-[#8B5CF6] border-t-transparent"></div>
                  </div>
                ) : (
                  <>
                    {/* Student Header */}
                    <div className="flex flex-col md:flex-row items-start gap-8 mb-10">
                      <div className="relative">
                        <div className="w-40 h-40 bg-gradient-to-r from-[#EC4899] via-[#8B5CF6] to-[#3B82F6] rounded-2xl flex items-center justify-center text-white text-6xl font-bold shadow-2xl">
                          {selectedStudent.student_name?.charAt(0) || 'S'}
                        </div>
                        <div className="absolute -bottom-4 -right-4 bg-gradient-to-r from-green-500 to-emerald-600 text-white text-sm font-bold px-4 py-2 rounded-full shadow-lg">
                          Active Student
                        </div>
                      </div>
                      <div className="flex-1">
                        <h3 className="text-4xl font-bold bg-gradient-to-r from-[#8B5CF6] to-[#3B82F6] bg-clip-text text-transparent">
                          {selectedStudent.student_name}
                        </h3>
                        <p className="text-gray-600 text-lg mt-2">Student ID: {selectedStudent.student_id}</p>
                        
                        <div className="grid grid-cols-3 gap-4 mt-8">
                          <div className="bg-gradient-to-br from-blue-50 to-blue-100 p-4 rounded-xl">
                            <div className="text-sm text-blue-600 font-semibold">Roll Number</div>
                            <div className="text-2xl font-bold text-blue-800 mt-1">{selectedStudent.roll_no}</div>
                          </div>
                          <div className="bg-gradient-to-br from-purple-50 to-purple-100 p-4 rounded-xl">
                            <div className="text-sm text-purple-600 font-semibold">Class</div>
                            <div className="text-2xl font-bold text-purple-800 mt-1">
                              {studentDetails?.class_name || 'N/A'} - {studentDetails?.section || 'N/A'}
                            </div>
                          </div>
                          <div className="bg-gradient-to-br from-pink-50 to-pink-100 p-4 rounded-xl">
                            <div className="text-sm text-pink-600 font-semibold">Status</div>
                            <div className="text-2xl font-bold text-pink-800 mt-1">Active</div>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Tab Navigation */}
                    <div className="border-b border-gray-200 mb-8">
                      <nav className="flex space-x-1">
                        <button
                          onClick={() => setActiveTab('basic')}
                          className={`px-6 py-3 font-semibold rounded-t-lg transition-all ${
                            activeTab === 'basic'
                              ? 'bg-gradient-to-r from-[#8B5CF6] to-[#3B82F6] text-white shadow-lg'
                              : 'text-gray-600 hover:text-[#8B5CF6] hover:bg-gray-50'
                          }`}
                        >
                          <FaUser className="inline mr-2" />
                          Basic Info
                        </button>
                        <button
                          onClick={() => setActiveTab('contact')}
                          className={`px-6 py-3 font-semibold rounded-t-lg transition-all ${
                            activeTab === 'contact'
                              ? 'bg-gradient-to-r from-[#8B5CF6] to-[#3B82F6] text-white shadow-lg'
                              : 'text-gray-600 hover:text-[#8B5CF6] hover:bg-gray-50'
                          }`}
                        >
                          <FaPhone className="inline mr-2" />
                          Contact Info
                        </button>
                        <button
                          onClick={() => setActiveTab('academic')}
                          className={`px-6 py-3 font-semibold rounded-t-lg transition-all ${
                            activeTab === 'academic'
                              ? 'bg-gradient-to-r from-[#8B5CF6] to-[#3B82F6] text-white shadow-lg'
                              : 'text-gray-600 hover:text-[#8B5CF6] hover:bg-gray-50'
                          }`}
                        >
                          <FaBook className="inline mr-2" />
                          Academic
                        </button>
                      </nav>
                    </div>

                    {/* Tab Content */}
                    <div className="mb-8">
                      {activeTab === 'basic' && studentDetails && (
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                          {/* Personal Information Card */}
                          <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-2xl p-8 shadow-lg">
                            <div className="flex items-center gap-3 mb-6">
                              <div className="p-3 bg-gradient-to-r from-blue-500 to-blue-600 rounded-lg text-white">
                                <FaUser size={20} />
                              </div>
                              <h4 className="text-xl font-bold text-gray-800">Personal Information</h4>
                            </div>
                            <div className="space-y-6">
                              {studentDetails.date_of_birth && (
                                <div className="flex items-center gap-4 p-3 bg-white rounded-xl shadow-sm">
                                  <div className="p-2 bg-gradient-to-r from-blue-100 to-blue-200 rounded-lg">
                                    <FaBirthdayCake className="text-blue-600" />
                                  </div>
                                  <div>
                                    <div className="text-sm text-gray-600">Date of Birth</div>
                                    <div className="font-bold text-gray-800">
                                      {new Date(studentDetails.date_of_birth).toLocaleDateString('en-US', {
                                        year: 'numeric',
                                        month: 'long',
                                        day: 'numeric'
                                      })}
                                    </div>
                                  </div>
                                </div>
                              )}
                              {studentDetails.gender && (
                                <div className="flex items-center gap-4 p-3 bg-white rounded-xl shadow-sm">
                                  <div className={`p-2 rounded-lg ${
                                    studentDetails.gender.toLowerCase() === 'male'
                                      ? 'bg-gradient-to-r from-blue-100 to-blue-200'
                                      : 'bg-gradient-to-r from-pink-100 to-pink-200'
                                  }`}>
                                    <FaGenderless className={
                                      studentDetails.gender.toLowerCase() === 'male'
                                        ? 'text-blue-600'
                                        : 'text-pink-600'
                                    } />
                                  </div>
                                  <div>
                                    <div className="text-sm text-gray-600">Gender</div>
                                    <div className="font-bold text-gray-800">{studentDetails.gender}</div>
                                  </div>
                                </div>
                              )}
                            </div>
                          </div>

                          {/* Address Information Card */}
                          <div className="bg-gradient-to-br from-emerald-50 to-green-50 rounded-2xl p-8 shadow-lg">
                            <div className="flex items-center gap-3 mb-6">
                              <div className="p-3 bg-gradient-to-r from-emerald-500 to-green-600 rounded-lg text-white">
                                <MdLocationOn size={20} />
                              </div>
                              <h4 className="text-xl font-bold text-gray-800">Address Information</h4>
                            </div>
                            {studentDetails.address ? (
                              <div className="p-4 bg-white rounded-xl shadow-sm">
                                <div className="flex items-start gap-3">
                                  <FaMapMarkerAlt className="text-emerald-500 mt-1 flex-shrink-0" />
                                  <div>
                                    <div className="text-sm text-gray-600 mb-2">Residential Address</div>
                                    <div className="font-medium text-gray-800 whitespace-pre-line">
                                      {studentDetails.address}
                                    </div>
                                  </div>
                                </div>
                              </div>
                            ) : (
                              <div className="text-center py-8 text-gray-500">
                                <FaMapMarkerAlt className="text-4xl text-gray-300 mx-auto mb-4" />
                                <div>No address information available</div>
                              </div>
                            )}
                          </div>
                        </div>
                      )}

                      {activeTab === 'contact' && studentDetails && (
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                          {/* Family Contact Card */}
                          <div className="bg-gradient-to-br from-purple-50 to-violet-50 rounded-2xl p-8 shadow-lg">
                            <div className="flex items-center gap-3 mb-6">
                              <div className="p-3 bg-gradient-to-r from-purple-500 to-violet-600 rounded-lg text-white">
                                <MdFamilyRestroom size={20} />
                              </div>
                              <h4 className="text-xl font-bold text-gray-800">Family Contact</h4>
                            </div>
                            <div className="space-y-6">
                              {studentDetails.father_name && (
                                <div className="p-4 bg-white rounded-xl shadow-sm">
                                  <div className="flex items-center gap-3 mb-2">
                                    <MdPerson className="text-purple-500" />
                                    <div className="font-bold text-gray-800">Father's Name</div>
                                  </div>
                                  <div className="text-gray-700 pl-8">{studentDetails.father_name}</div>
                                </div>
                              )}
                              {studentDetails.mother_name && (
                                <div className="p-4 bg-white rounded-xl shadow-sm">
                                  <div className="flex items-center gap-3 mb-2">
                                    <MdPerson className="text-purple-500" />
                                    <div className="font-bold text-gray-800">Mother's Name</div>
                                  </div>
                                  <div className="text-gray-700 pl-8">{studentDetails.mother_name}</div>
                                </div>
                              )}
                            </div>
                          </div>

                          {/* Contact Details Card */}
                          <div className="bg-gradient-to-br from-orange-50 to-amber-50 rounded-2xl p-8 shadow-lg">
                            <div className="flex items-center gap-3 mb-6">
                              <div className="p-3 bg-gradient-to-r from-orange-500 to-amber-600 rounded-lg text-white">
                                <FaPhone size={18} />
                              </div>
                              <h4 className="text-xl font-bold text-gray-800">Contact Details</h4>
                            </div>
                            <div className="space-y-6">
                              {studentDetails.father_phone && (
                                <div className="p-4 bg-white rounded-xl shadow-sm">
                                  <div className="flex items-center gap-3 mb-2">
                                    <MdPhone className="text-orange-500" />
                                    <div className="font-bold text-gray-800">Father's Phone</div>
                                  </div>
                                  <a 
                                    href={`tel:${studentDetails.father_phone}`}
                                    className="text-blue-600 hover:text-blue-800 font-medium pl-8 block"
                                  >
                                    {studentDetails.father_phone}
                                  </a>
                                </div>
                              )}
                              {studentDetails.mother_phone && (
                                <div className="p-4 bg-white rounded-xl shadow-sm">
                                  <div className="flex items-center gap-3 mb-2">
                                    <MdPhone className="text-orange-500" />
                                    <div className="font-bold text-gray-800">Mother's Phone</div>
                                  </div>
                                  <a 
                                    href={`tel:${studentDetails.mother_phone}`}
                                    className="text-blue-600 hover:text-blue-800 font-medium pl-8 block"
                                  >
                                    {studentDetails.mother_phone}
                                  </a>
                                </div>
                              )}
                              {studentDetails.student_email && (
                                <div className="p-4 bg-white rounded-xl shadow-sm">
                                  <div className="flex items-center gap-3 mb-2">
                                    <MdEmail className="text-orange-500" />
                                    <div className="font-bold text-gray-800">Student Email</div>
                                  </div>
                                  <a 
                                    href={`mailto:${studentDetails.student_email}`}
                                    className="text-blue-600 hover:text-blue-800 font-medium pl-8 block"
                                  >
                                    {studentDetails.student_email}
                                  </a>
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      )}

                      {activeTab === 'academic' && studentDetails && (
                        <div className="bg-gradient-to-br from-cyan-50 to-blue-50 rounded-2xl p-8 shadow-lg">
                          <div className="flex items-center gap-3 mb-6">
                            <div className="p-3 bg-gradient-to-r from-cyan-500 to-blue-600 rounded-lg text-white">
                              <FaBook size={20} />
                            </div>
                            <h4 className="text-xl font-bold text-gray-800">Academic Information</h4>
                          </div>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="p-6 bg-white rounded-xl shadow-sm">
                              <div className="flex items-center gap-3 mb-4">
                                <FaSchool className="text-cyan-600" />
                                <div className="font-bold text-gray-800">Current Class</div>
                              </div>
                              <div className="text-3xl font-bold bg-gradient-to-r from-cyan-600 to-blue-600 bg-clip-text text-transparent">
                                Class {studentDetails.class_name || 'N/A'}
                              </div>
                              <div className="text-gray-600 mt-2">Standard Education Level</div>
                            </div>
                            
                            <div className="p-6 bg-white rounded-xl shadow-sm">
                              <div className="flex items-center gap-3 mb-4">
                                <FaUserGraduate className="text-blue-600" />
                                <div className="font-bold text-gray-800">Section</div>
                              </div>
                              <div className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                                Section {studentDetails.section || 'N/A'}
                              </div>
                              <div className="text-gray-600 mt-2">Class Division</div>
                            </div>
                            
                            {studentDetails.date_of_birth && (
                              <div className="p-6 bg-white rounded-xl shadow-sm">
                                <div className="flex items-center gap-3 mb-4">
                                  <FaBirthdayCake className="text-purple-600" />
                                  <div className="font-bold text-gray-800">Age</div>
                                </div>
                                <div className="text-3xl font-bold bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">
                                  {new Date().getFullYear() - new Date(studentDetails.date_of_birth).getFullYear()} yrs
                                </div>
                                <div className="text-gray-600 mt-2">Approximate Age</div>
                              </div>
                            )}
                            
                            <div className="p-6 bg-white rounded-xl shadow-sm">
                              <div className="flex items-center gap-3 mb-4">
                                <FaAward className="text-amber-600" />
                                <div className="font-bold text-gray-800">Status</div>
                              </div>
                              <div className="text-3xl font-bold bg-gradient-to-r from-amber-600 to-orange-600 bg-clip-text text-transparent">
                                Active
                              </div>
                              <div className="text-gray-600 mt-2">Enrollment Status</div>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Action Buttons */}
                    <div className="flex gap-4 pt-8 border-t">
                      <button
                        onClick={() => {
                          setSelectedStudent(null);
                          setStudentDetails(null);
                        }}
                        className="flex-1 px-8 py-4 bg-gradient-to-r from-gray-600 to-gray-700 text-white rounded-xl font-semibold hover:from-gray-700 hover:to-gray-800 transition-all shadow-lg hover:shadow-xl"
                      >
                        Close Profile
                      </button>
                      <div className="flex gap-4">
                        {studentDetails?.father_phone && (
                          <a
                            href={`tel:${studentDetails.father_phone}`}
                            className="px-8 py-4 bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-xl font-semibold hover:from-blue-700 hover:to-blue-800 transition-all shadow-lg hover:shadow-xl flex items-center gap-3"
                          >
                            <FaPhone />
                            Call Parent
                          </a>
                        )}
                        {studentDetails?.student_email && (
                          <a
                            href={`mailto:${studentDetails.student_email}`}
                            className="px-8 py-4 bg-gradient-to-r from-green-600 to-green-700 text-white rounded-xl font-semibold hover:from-green-700 hover:to-green-800 transition-all shadow-lg hover:shadow-xl flex items-center gap-3"
                          >
                            <FaEnvelope />
                            Send Email
                          </a>
                        )}
                      </div>
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Error Display */}
        {error && (
          <div className="mt-6 bg-gradient-to-r from-red-500 to-pink-600 text-white px-8 py-6 rounded-2xl shadow-2xl">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-white/20 rounded-full flex items-center justify-center backdrop-blur-sm">
                  <span className="text-2xl font-bold">!</span>
                </div>
                <div>
                  <div className="font-bold text-xl">Error Encountered</div>
                  <div className="text-white/90 mt-1">{error}</div>
                </div>
              </div>
              <button 
                onClick={() => setError('')}
                className="px-6 py-3 bg-white/20 hover:bg-white/30 text-white font-semibold rounded-xl transition-colors backdrop-blur-sm"
              >
                Dismiss
              </button>
            </div>
          </div>
        )}
      </div>

      <style jsx>{`
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes slideUp {
          from { transform: translateY(20px); opacity: 0; }
          to { transform: translateY(0); opacity: 1; }
        }
        .animate-fadeIn {
          animation: fadeIn 0.3s ease-out;
        }
        .animate-slideUp {
          animation: slideUp 0.4s ease-out;
        }
      `}</style>
    </div>
  );
}