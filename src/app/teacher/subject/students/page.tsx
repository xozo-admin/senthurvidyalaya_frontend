'use client';

import React, { useState, useEffect } from 'react';
import { 
  FaUsers, FaFilter, FaSearch, FaUserGraduate, FaPhone, 
  FaEnvelope, FaHome, FaBirthdayCake, FaVenusMars, 
  FaTint, FaExclamationTriangle, FaSpinner, FaUserCircle,
  FaIdCard, FaSchool, FaChalkboardTeacher, FaList,
  FaEye, FaTimes, FaSort, FaSortUp, FaSortDown,
  FaUserFriends, FaUserTie, FaFemale, FaMale, FaTransgender,
  FaBook, FaLock, FaCalendarAlt, FaChartBar, FaPercent,
  FaUserCheck, FaThLarge, FaSortAmountDown, FaSortAmountUp,
  FaExclamationCircle, FaClock
} from 'react-icons/fa';
import { toast, Toaster } from 'react-hot-toast';
import Modal from 'react-modal';

const API_BASE_URL = 'https://senthurvidyalaya-backend.onrender.com/api';

// Modal Styles (same as assignments page)
const customStyles = {
  content: {
    top: '50%',
    left: '50%',
    right: 'auto',
    bottom: 'auto',
    marginRight: '-50%',
    transform: 'translate(-50%, -50%)',
    borderRadius: '20px',
    border: 'none',
    boxShadow: '0 20px 60px rgba(0, 0, 0, 0.3)',
    maxWidth: '600px',
    width: '90%',
    maxHeight: '90vh',
    padding: '0',
    overflow: 'visible',
  },
  overlay: {
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    backdropFilter: 'blur(4px)',
  },
};

// Types
interface SubjectAllocation {
  subject_name: string;
  subject_code: string;
  classes: string[];
  sections: string[];
}

interface TeacherAllocationData {
  status: number;
  teacher_id: string;
  teacher_name: string;
  allocations: SubjectAllocation[];
}

interface Student {
  student_id: string;
  student_name: string;
  student_email?: string;
  phone?: string;
  gender?: string;
  class_name?: string;
  section?: string;
  extra_details?: {
    blood_group?: string;
    emergency_contact?: string;
  };
  date_of_birth?: string;
  father_name?: string;
  father_phone?: string;
  mother_name?: string;
  mother_phone?: string;
  address?: string;
  roll_number?: number;
  email?: string;
}

// API Service Functions
const apiService = {
  async fetchWithAuth(endpoint: string, options = {}) {
    const token = localStorage.getItem('token');
    if (!token) {
      throw new Error('Authentication required');
    }

    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
      ...options,
      headers: {
        'Authorization': `Token ${token}`,
        'Content-Type': 'application/json',
      },
    });

    const data = await response.json();
    
    if (!response.ok) {
      if (data.error) {
        throw new Error(data.error);
      }
      throw new Error(`API Error: ${response.status} - ${JSON.stringify(data)}`);
    }

    return data;
  },

  async getTeacherProfile() {
    return this.fetchWithAuth('/teacher/profile/');
  },

  async getTeacherSubjectAllocations(teacherId: string) {
    return this.fetchWithAuth(`/teacher/subject-allocations/?teacher_id=${teacherId}`) as Promise<TeacherAllocationData>;
  },

  async getSubjectTeacherStudents(className: string, sectionName: string, subjectName: string) {
    return this.fetchWithAuth(
      `/student/subject-teacher/view/?class=${className}&section=${sectionName}&subject=${subjectName}`
    );
  },

  async getStudentDetails(studentId: string) {
    return this.fetchWithAuth(`/student/subject-teacher/details/?student_id=${studentId}`);
  },
};

// Filters interface
interface Filters {
  class: string;
  section: string;
  subject: string;
  gender: string;
  view: 'students' | 'details' | 'reports';
  searchCategory: string;
}

export default function StudentListPage() {
  const [students, setStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingStudents, setLoadingStudents] = useState(false);
  const [error, setError] = useState('');
  const [teacherProfile, setTeacherProfile] = useState<any>(null);
  const [subjectAllocations, setSubjectAllocations] = useState<SubjectAllocation[]>([]);
  
  // Filters and controls
  const [filters, setFilters] = useState<Filters>({
    class: '',
    section: '',
    subject: '',
    gender: 'all',
    view: 'students',
    searchCategory: 'all'
  });
  
  const [availableClasses, setAvailableClasses] = useState<string[]>([]);
  const [availableSections, setAvailableSections] = useState<string[]>([]);
  const [availableSubjects, setAvailableSubjects] = useState<{name: string, code: string}[]>([]);
  
  // View controls
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [sortConfig, setSortConfig] = useState({
    key: 'student_name',
    direction: 'asc'
  });
  const [searchTerm, setSearchTerm] = useState('');
  
  // Modals
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);
  const [showStudentModal, setShowStudentModal] = useState(false);
  
  // Stats
  const [stats, setStats] = useState({
    total: 0,
    male: 0,
    female: 0,
    other: 0,
    present: 0,
    absent: 0
  });

  useEffect(() => {
    loadInitialData();
    Modal.setAppElement('body');
  }, []);

  useEffect(() => {
    if (filters.class) {
      updateFiltersForClass(filters.class);
    }
  }, [filters.class]);

  useEffect(() => {
    if (filters.class && filters.subject) {
      updateSectionsForSubject(filters.class, filters.subject);
    }
  }, [filters.subject]);

  useEffect(() => {
    calculateStats();
  }, [students]);

  const loadInitialData = async () => {
    try {
      setLoading(true);
      setError('');

      const profile = await apiService.getTeacherProfile();
      const profileData = profile.data;
      setTeacherProfile(profileData);
      const teacherId = profileData.teacher_id;

      const allocationsData = await apiService.getTeacherSubjectAllocations(teacherId);
      await processTeacherAllocations(allocationsData, profileData);

    } catch (err: any) {
      console.error('Error loading data:', err);
      setError(err.message || 'Failed to load teacher data');
      toast.error('Failed to load teacher data');
    } finally {
      setLoading(false);
    }
  };

  const processTeacherAllocations = async (allocationsData: TeacherAllocationData, profileData: any) => {
    try {
      setSubjectAllocations(allocationsData.allocations);
      
      const classesSet = new Set<string>();
      const subjectsMap = new Map<string, {name: string, code: string}>();
      
      allocationsData.allocations.forEach((allocation: SubjectAllocation) => {
        allocation.classes.forEach((className: string) => {
          classesSet.add(className);
          subjectsMap.set(allocation.subject_name, {
            name: allocation.subject_name,
            code: allocation.subject_code
          });
        });
      });

      const classesArray = Array.from(classesSet).sort((a, b) => parseInt(a) - parseInt(b));
      const subjectsArray = Array.from(subjectsMap.values()).sort((a, b) => a.name.localeCompare(b.name));
      
      setAvailableClasses(classesArray);
      setAvailableSubjects(subjectsArray);

      if (profileData?.class_name && classesArray.includes(profileData.class_name)) {
        setFilters(prev => ({ 
          ...prev, 
          class: profileData.class_name 
        }));
        
        const subjectForClass = allocationsData.allocations.find(
          (alloc: SubjectAllocation) => alloc.classes.includes(profileData.class_name)
        );
        
        if (subjectForClass) {
          setFilters(prev => ({ 
            ...prev, 
            subject: subjectForClass.subject_name
          }));
        }
      }

    } catch (err) {
      console.error('Error processing allocations:', err);
      throw err;
    }
  };

  const updateFiltersForClass = (className: string) => {
    const subjectsForClass = subjectAllocations
      .filter(alloc => alloc.classes.includes(className))
      .map(alloc => ({
        name: alloc.subject_name,
        code: alloc.subject_code
      }));
    
    const uniqueSubjects = Array.from(
      new Map(subjectsForClass.map(sub => [sub.name, sub])).values()
    ).sort((a, b) => a.name.localeCompare(b.name));
    
    setAvailableSubjects(uniqueSubjects);
    
    if (filters.subject && !uniqueSubjects.some(sub => sub.name === filters.subject)) {
      setFilters(prev => ({ ...prev, subject: '' }));
    }
    
    const sectionsSet = new Set<string>();
    subjectAllocations
      .filter(alloc => alloc.classes.includes(className))
      .forEach(alloc => {
        if (alloc.sections && alloc.sections.length > 0) {
          alloc.sections.forEach(section => sectionsSet.add(section));
        }
      });
    
    const sectionsArray = Array.from(sectionsSet).sort();
    setAvailableSections(sectionsArray);
    
    if (filters.section && !sectionsArray.includes(filters.section)) {
      setFilters(prev => ({ ...prev, section: '' }));
    }
  };

  const updateSectionsForSubject = (className: string, subjectName: string) => {
    const allocation = subjectAllocations.find(
      alloc => alloc.classes.includes(className) && alloc.subject_name === subjectName
    );
    
    if (allocation && allocation.sections && allocation.sections.length > 0) {
      setAvailableSections(allocation.sections.sort());
      
      if (filters.section && !allocation.sections.includes(filters.section)) {
        setFilters(prev => ({ ...prev, section: '' }));
      }
    } else {
      updateFiltersForClass(className);
    }
  };

  const loadStudents = async () => {
    if (!filters.class || !filters.section || !filters.subject) {
      toast.error('Please select class, section, and subject');
      return;
    }

    try {
      setLoadingStudents(true);
      setError('');
      
      const studentsData = await apiService.getSubjectTeacherStudents(
        filters.class, 
        filters.section, 
        filters.subject
      );
      
      if (studentsData.status === 200 && studentsData.students && Array.isArray(studentsData.students)) {
        const studentsWithInfo = studentsData.students.map((student: any) => ({
          ...student,
          class_name: filters.class,
          section: filters.section,
          subject: filters.subject
        }));
        
        setStudents(studentsWithInfo);
        
        toast.success(`Loaded ${studentsWithInfo.length} students for ${filters.subject}`, {
          icon: '📚',
        });
      } else {
        setStudents([]);
        toast.error('No students found or invalid response format');
      }

    } catch (err: any) {
      console.error('Error loading students:', err);
      setError(err.message || 'Failed to load students');
      
      if (err.message.includes('Permission Denied') || err.message.includes('not assigned')) {
        toast.error(`Access Denied: ${err.message}`, {
          icon: '🔒',
          duration: 5000
        });
      } else {
        toast.error('Failed to load students');
      }
      
      setStudents([]);
    } finally {
      setLoadingStudents(false);
    }
  };

  const handleViewStudent = async (studentId: string) => {
    try {
      const response = await apiService.getStudentDetails(studentId);
      
      const studentData = response.data;
      const mappedStudent: Student = {
        student_id: studentData.student_id,
        student_name: studentData.student_name,
        email: studentData.student_email,
        student_email: studentData.student_email,
        phone: studentData.phone || '',
        gender: studentData.gender,
        class_name: studentData.class_name,
        section: studentData.section,
        extra_details: {
          blood_group: studentData.blood_group,
          emergency_contact: studentData.emergency_contact
        },
        date_of_birth: studentData.date_of_birth,
        father_name: studentData.father_name,
        father_phone: studentData.father_phone,
        mother_name: studentData.mother_name,
        mother_phone: studentData.mother_phone,
        address: studentData.address,
        roll_number: studentData.roll_number
      };
      
      setSelectedStudent(mappedStudent);
      setShowStudentModal(true);
    } catch (err: any) {
      console.error('Error loading student details:', err);
      toast.error(err.message || 'Failed to load student details');
    }
  };

  const handleSort = (key: string) => {
    setSortConfig({
      key,
      direction: sortConfig.key === key && sortConfig.direction === 'asc' ? 'desc' : 'asc'
    });
  };

  const getFilteredAndSortedStudents = () => {
    let filtered = students.filter(student => {
      const matchesSearch = searchTerm === '' || 
        student.student_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        student.student_id.toLowerCase().includes(searchTerm.toLowerCase()) ||
        student.email?.toLowerCase().includes(searchTerm.toLowerCase());
      
      const matchesGender = filters.gender === 'all' || 
        student.gender?.toLowerCase() === filters.gender;
      
      return matchesSearch && matchesGender;
    });

    filtered.sort((a, b) => {
      if (sortConfig.key === 'student_name') {
        const nameA = a.student_name.toLowerCase();
        const nameB = b.student_name.toLowerCase();
        return sortConfig.direction === 'desc' 
          ? nameB.localeCompare(nameA) 
          : nameA.localeCompare(nameB);
      } else if (sortConfig.key === 'student_id') {
        const idA = a.student_id.toLowerCase();
        const idB = b.student_id.toLowerCase();
        return sortConfig.direction === 'desc' 
          ? idB.localeCompare(idA) 
          : idA.localeCompare(idB);
      } else if (sortConfig.key === 'roll_number') {
        const rollA = a.roll_number || 0;
        const rollB = b.roll_number || 0;
        return sortConfig.direction === 'desc' ? rollB - rollA : rollA - rollB;
      }
      return 0;
    });

    return filtered;
  };

  const calculateStats = () => {
    const total = students.length;
    const male = students.filter(s => s.gender?.toLowerCase() === 'male').length;
    const female = students.filter(s => s.gender?.toLowerCase() === 'female').length;
    const other = students.filter(s => {
      const gender = s.gender?.toLowerCase();
      return gender && !['male', 'female'].includes(gender);
    }).length;
    
    setStats({ 
      total, 
      male, 
      female, 
      other,
      present: Math.floor(total * 0.85), // Mock data
      absent: Math.floor(total * 0.15)   // Mock data
    });
  };

  const getGenderIcon = (gender: string) => {
    switch (gender?.toLowerCase()) {
      case 'male': return <FaMale className="text-blue-500" />;
      case 'female': return <FaFemale className="text-pink-500" />;
      default: return <FaTransgender className="text-purple-500" />;
    }
  };

  const getGenderColor = (gender: string) => {
    switch (gender?.toLowerCase()) {
      case 'male': return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'female': return 'bg-pink-100 text-pink-800 border-pink-200';
      default: return 'bg-purple-100 text-purple-800 border-purple-200';
    }
  };

  const getBloodGroupColor = (bloodGroup: string) => {
    const colors: any = {
      'A+': 'bg-red-100 text-red-800 border-red-200',
      'A-': 'bg-red-50 text-red-700 border-red-100',
      'B+': 'bg-blue-100 text-blue-800 border-blue-200',
      'B-': 'bg-blue-50 text-blue-700 border-blue-100',
      'AB+': 'bg-purple-100 text-purple-800 border-purple-200',
      'AB-': 'bg-purple-50 text-purple-700 border-purple-100',
      'O+': 'bg-green-100 text-green-800 border-green-200',
      'O-': 'bg-green-50 text-green-700 border-green-100',
    };
    return colors[bloodGroup] || 'bg-gray-100 text-gray-800 border-gray-200';
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-IN', {
      day: 'numeric',
      month: 'short',
      year: 'numeric'
    });
  };

  if (loading && students.length === 0 && !error) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-gradient-to-br from-blue-50 to-gray-50">
        <div className="text-center">
          <div className="relative">
            <FaSpinner className="animate-spin text-5xl text-blue-600 mb-4" />
            <div className="absolute inset-0 bg-blue-100 rounded-full animate-ping opacity-20"></div>
          </div>
          <h3 className="text-xl font-semibold text-gray-700 mb-2">Loading Teacher Data</h3>
          <p className="text-gray-500">Fetching your teaching allocations...</p>
        </div>
      </div>
    );
  }

  const filteredStudents = getFilteredAndSortedStudents();

  return (
    <div className="p-6 bg-gradient-to-br from-blue-50 via-white to-gray-50 min-h-screen">
      <Toaster position="top-right" />
      
      <div className="mx-auto">
        {/* Header - Same design as assignments page */}
        <div className="mb-8">
          <div className="bg-gradient-to-r from-blue-600 to-indigo-700 rounded-2xl p-6 shadow-xl text-white mb-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-6">
                <div className="p-4 bg-white bg-opacity-20 rounded-2xl backdrop-blur-sm">
                  <FaUserFriends className="text-4xl" />
                </div>
                <div>
                  <h1 className="text-3xl font-bold mb-2">Student Management</h1>
                  <p className="text-blue-100">
                    View and manage students for your subjects
                  </p>
                  <div className="flex items-center gap-4 mt-2 text-sm text-blue-200">
                    <span className="flex items-center gap-2">
                      <FaUserTie /> {teacherProfile?.name || 'Teacher'}
                    </span>
                    <span>•</span>
                    <span className="flex items-center gap-2">
                      <FaBook /> {subjectAllocations.length} Subjects
                    </span>
                    <span>•</span>
                    <span className="flex items-center gap-2">
                      <FaUsers /> {students.length} Students
                    </span>
                  </div>
                </div>
              </div>
              
              <div className="text-right">
                <div className="text-4xl font-bold">{stats.total}</div>
                <div className="text-blue-200">Total Students</div>
              </div>
            </div>
          </div>

          {/* Stats Cards - Same design pattern */}
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-8">
            <div className="bg-white rounded-xl p-6 shadow-lg border border-blue-100">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-2xl font-bold text-blue-600">{stats.total}</div>
                  <div className="text-gray-600">Total Students</div>
                </div>
                <FaUsers className="text-3xl text-blue-500" />
              </div>
            </div>
            
            <div className="bg-white rounded-xl p-6 shadow-lg border border-blue-100">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-2xl font-bold text-blue-600">{stats.male}</div>
                  <div className="text-gray-600">Male Students</div>
                </div>
                <FaMale className="text-3xl text-blue-500" />
              </div>
            </div>
            
            <div className="bg-white rounded-xl p-6 shadow-lg border border-pink-100">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-2xl font-bold text-pink-600">{stats.female}</div>
                  <div className="text-gray-600">Female Students</div>
                </div>
                <FaFemale className="text-3xl text-pink-500" />
              </div>
            </div>
            
            <div className="bg-white rounded-xl p-6 shadow-lg border border-purple-100">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-2xl font-bold text-purple-600">{stats.present}</div>
                  <div className="text-gray-600">Present Today</div>
                </div>
                <FaUserCheck className="text-3xl text-purple-500" />
              </div>
            </div>
            
            <div className="bg-white rounded-xl p-6 shadow-lg border border-yellow-100">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-2xl font-bold text-yellow-600">{stats.absent}</div>
                  <div className="text-gray-600">Absent Today</div>
                </div>
                <FaClock className="text-3xl text-yellow-500" />
              </div>
            </div>
          </div>
        </div>

        {/* Filters Section - Same design as assignments page */}
        <div className="bg-white rounded-2xl p-6 shadow-xl mb-8">
          <div className="flex items-center gap-2 mb-6">
            <FaFilter className="text-blue-600" />
            <h3 className="text-lg font-semibold text-gray-800">Filter Students</h3>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
            {/* Class Filter */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                <div className="flex items-center gap-2">
                  <FaSchool /> Class *
                </div>
              </label>
              <select
                value={filters.class}
                onChange={(e) => setFilters({ ...filters, class: e.target.value, section: '', subject: '' })}
                className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="">Select Class</option>
                {availableClasses.map((cls) => (
                  <option key={cls} value={cls}>
                    Class {cls}
                  </option>
                ))}
              </select>
            </div>

            {/* Section Filter */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                <div className="flex items-center gap-2">
                  <FaChalkboardTeacher /> Section *
                </div>
              </label>
              <select
                value={filters.section}
                onChange={(e) => setFilters({ ...filters, section: e.target.value })}
                disabled={!filters.class}
                className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-50"
              >
                <option value="">Select Section</option>
                {availableSections.map((sec) => (
                  <option key={sec} value={sec}>
                    Section {sec}
                  </option>
                ))}
              </select>
            </div>

            {/* Subject Filter */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                <div className="flex items-center gap-2">
                  <FaBook /> Subject *
                </div>
              </label>
              <select
                value={filters.subject}
                onChange={(e) => setFilters({ ...filters, subject: e.target.value })}
                disabled={!filters.class || !filters.section}
                className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-50"
              >
                <option value="">Select Subject</option>
                {availableSubjects.map((subject) => (
                  <option key={subject.code} value={subject.name}>
                    {subject.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Gender Filter */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                <div className="flex items-center gap-2">
                  <FaVenusMars /> Gender
                </div>
              </label>
              <select
                value={filters.gender}
                onChange={(e) => setFilters({ ...filters, gender: e.target.value })}
                className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="all">All Genders</option>
                <option value="male">Male</option>
                <option value="female">Female</option>
                <option value="other">Other</option>
              </select>
            </div>
          </div>

          {/* Secondary Filters */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Search Category
              </label>
              <select
                value={filters.searchCategory}
                onChange={(e) => setFilters({ ...filters, searchCategory: e.target.value })}
                className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="all">All Fields</option>
                <option value="name">Name Only</option>
                <option value="id">ID Only</option>
                <option value="email">Email Only</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Search
              </label>
              <div className="relative">
                <FaSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search students..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
            </div>

            <div className="flex items-end gap-4">
              <div className="flex-1">
                <button
                  onClick={loadStudents}
                  disabled={loadingStudents || !filters.class || !filters.section || !filters.subject}
                  className={`w-full px-6 py-3 rounded-xl font-medium transition-all duration-300 flex items-center justify-center gap-2 ${
                    loadingStudents || !filters.class || !filters.section || !filters.subject
                      ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                      : 'bg-gradient-to-r from-blue-500 to-blue-600 text-white hover:from-blue-600 hover:to-blue-700'
                  }`}
                >
                  {loadingStudents ? <FaSpinner className="animate-spin" /> : <FaFilter />}
                  {loadingStudents ? 'Loading...' : 'Load Students'}
                </button>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setViewMode('grid')}
                  className={`p-3 rounded-lg ${viewMode === 'grid' ? 'bg-blue-100 text-blue-600' : 'bg-gray-100 text-gray-600'}`}
                  title="Grid View"
                >
                  <FaThLarge />
                </button>
                <button
                  onClick={() => setViewMode('list')}
                  className={`p-3 rounded-lg ${viewMode === 'list' ? 'bg-blue-100 text-blue-600' : 'bg-gray-100 text-gray-600'}`}
                  title="List View"
                >
                  <FaList />
                </button>
              </div>
            </div>
          </div>

          {/* Current Selection Info */}
          {filters.class && filters.section && filters.subject && (
            <div className="mt-6 p-4 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl border border-blue-200">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-2">
                    <FaSchool className="text-blue-600" />
                    <span className="font-semibold text-blue-700">Class {filters.class}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <FaChalkboardTeacher className="text-blue-600" />
                    <span className="font-semibold text-blue-700">Section {filters.section}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <FaBook className="text-blue-600" />
                    <span className="font-semibold text-blue-700">{filters.subject}</span>
                  </div>
                </div>
                <div className="text-sm text-gray-600">
                  {filteredStudents.length} students found
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Students Display */}
        {loadingStudents ? (
          <div className="text-center py-12 bg-white rounded-2xl shadow-xl">
            <FaSpinner className="animate-spin text-4xl text-blue-600 mx-auto mb-4" />
            <p className="text-gray-600">Loading students...</p>
          </div>
        ) : filteredStudents.length > 0 ? (
          <div className="bg-white rounded-2xl shadow-xl overflow-hidden">
            <div className="p-6 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold text-gray-800">
                  {viewMode === 'grid' ? 'Students Grid View' : 'Students List View'}
                </h3>
                <div className="flex items-center gap-4">
                  <div className="text-sm text-gray-500">
                    Showing {filteredStudents.length} of {students.length} students
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-gray-600">Sort by:</span>
                    <select
                      value={sortConfig.key}
                      onChange={(e) => handleSort(e.target.value)}
                      className="px-3 py-1 border border-gray-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500 text-sm"
                    >
                      <option value="student_name">Name</option>
                      <option value="student_id">ID</option>
                      <option value="roll_number">Roll Number</option>
                    </select>
                    <button
                      onClick={() => handleSort(sortConfig.key)}
                      className="p-1 hover:bg-gray-100 rounded"
                    >
                      {sortConfig.direction === 'asc' ? <FaSortUp /> : <FaSortDown />}
                    </button>
                  </div>
                </div>
              </div>
            </div>
            
            {viewMode === 'grid' ? (
              <div className="p-6">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {filteredStudents.map((student) => (
                    <div
                      key={student.student_id}
                      className="bg-gradient-to-br from-white to-gray-50 rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 border border-gray-200 hover:border-blue-300 overflow-hidden group"
                      onClick={() => handleViewStudent(student.student_id)}
                    >
                      {/* Student Header */}
                      <div className="bg-gradient-to-r from-blue-500 to-blue-600 p-6 relative overflow-hidden">
                        <div className="absolute top-4 right-4 opacity-20">
                          <FaUserGraduate className="text-6xl text-white" />
                        </div>
                        
                        <div className="flex items-center gap-4">
                          <div className="w-16 h-16 bg-white rounded-full flex items-center justify-center">
                            <span className="text-2xl font-bold text-blue-600">
                              {student.student_name.charAt(0)}
                            </span>
                          </div>
                          <div className="flex-1">
                            <h3 className="text-lg font-bold text-white mb-1">
                              {student.student_name}
                            </h3>
                            <div className="flex items-center gap-2">
                              <FaIdCard className="text-blue-200" />
                              <span className="text-blue-100 font-mono text-sm">ID: {student.student_id}</span>
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Student Info */}
                      <div className="p-6">
                        <div className="grid grid-cols-2 gap-4 mb-4">
                          <div className="flex items-center gap-2">
                            <FaSchool className="text-gray-400" />
                            <div>
                              <div className="text-xs text-gray-500">Class</div>
                              <div className="font-semibold text-gray-800">
                                {student.class_name || filters.class}
                              </div>
                            </div>
                          </div>
                          
                          <div className="flex items-center gap-2">
                            <FaChalkboardTeacher className="text-gray-400" />
                            <div>
                              <div className="text-xs text-gray-500">Section</div>
                              <div className="font-semibold text-gray-800">
                                {student.section || filters.section}
                              </div>
                            </div>
                          </div>
                        </div>

                        {/* Subject Info */}
                        <div className="mb-4 p-3 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg border border-blue-100">
                          <div className="flex items-center gap-2">
                            <FaBook className="text-blue-500" />
                            <span className="font-semibold text-blue-700">{filters.subject}</span>
                          </div>
                        </div>

                        {/* Additional Info */}
                        <div className="space-y-3 mb-6">
                          {student.roll_number && (
                            <div className="flex items-center gap-3 p-3 bg-green-50 rounded-lg border border-green-200">
                              <span className="font-bold text-green-700">Roll No: {student.roll_number}</span>
                            </div>
                          )}
                          
                          {student.gender && (
                            <div className={`px-3 py-1 rounded-full border ${getGenderColor(student.gender)} inline-flex items-center gap-2`}>
                              {getGenderIcon(student.gender)}
                              <span className="text-xs font-semibold capitalize">{student.gender}</span>
                            </div>
                          )}
                        </div>

                        {/* Action Button */}
                        <button 
                          className="w-full py-3 bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-lg hover:from-blue-600 hover:to-blue-700 transition-all duration-300 flex items-center justify-center gap-2 font-medium group-hover:shadow-lg"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleViewStudent(student.student_id);
                          }}
                        >
                          <FaEye /> View Details
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="bg-gradient-to-r from-gray-50 to-gray-100 border-b border-gray-200">
                      <th 
                        className="py-4 px-6 text-left text-gray-700 font-semibold cursor-pointer"
                        onClick={() => handleSort('student_name')}
                      >
                        <div className="flex items-center gap-2">
                          Student
                          {sortConfig.key === 'student_name' && (
                            sortConfig.direction === 'asc' ? <FaSortUp /> : <FaSortDown />
                          )}
                        </div>
                      </th>
                      <th className="py-4 px-6 text-left text-gray-700 font-semibold">Class</th>
                      <th className="py-4 px-6 text-left text-gray-700 font-semibold">Section</th>
                      
                      <th className="py-4 px-6 text-left text-gray-700 font-semibold">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredStudents.map((student) => (
                      <tr 
                        key={student.student_id}
                        className="hover:bg-blue-50 transition-colors border-b border-gray-200"
                        onClick={() => handleViewStudent(student.student_id)}
                      >
                        <td className="py-4 px-6">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 bg-gradient-to-r from-blue-500 to-blue-600 rounded-full flex items-center justify-center">
                              <span className="text-white font-bold">
                                {student.student_name.charAt(0)}
                              </span>
                            </div>
                            <div>
                              <div className="font-semibold text-gray-800">{student.student_name}</div>
                              <div className="text-sm text-gray-500">ID: {student.student_id}</div>
                            </div>
                          </div>
                        </td>
                        
                        <td className="py-4 px-6">
                          <div className="flex items-center gap-2">
                            <FaSchool className="text-gray-400" />
                            <span>{student.class_name || filters.class}</span>
                          </div>
                        </td>
                        
                        <td className="py-4 px-6">
                          <div className="flex items-center gap-2">
                            <FaChalkboardTeacher className="text-gray-400" />
                            <span>{student.section || filters.section}</span>
                          </div>
                        </td>
                        
                        
                        
                        <td className="py-4 px-6">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleViewStudent(student.student_id);
                            }}
                            className="px-4 py-2 bg-blue-100 text-blue-600 rounded-lg hover:bg-blue-200 transition-colors flex items-center gap-2"
                          >
                            <FaEye /> Details
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        ) : (
          <div className="text-center py-16 bg-white rounded-2xl shadow-xl">
            <div className="inline-flex items-center justify-center w-24 h-24 bg-gradient-to-r from-blue-100 to-indigo-100 rounded-full mb-6">
              <FaUserGraduate className="text-4xl text-blue-600" />
            </div>
            <h3 className="text-2xl font-bold text-gray-800 mb-3">
              {filters.class && filters.section && filters.subject 
                ? 'No Students Found' 
                : 'Select Filters to View Students'}
            </h3>
            <p className="text-gray-600 max-w-md mx-auto mb-8">
              {filters.class && filters.section && filters.subject
                ? `No students found for ${filters.subject} in Class ${filters.class}-${filters.section}. Please check your filters.`
                : 'Please select a class, section, and subject to view students'}
            </p>
            <button
              onClick={loadStudents}
              disabled={!filters.class || !filters.section || !filters.subject}
              className={`px-6 py-3 rounded-xl flex items-center gap-2 mx-auto font-bold ${
                !filters.class || !filters.section || !filters.subject
                  ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                  : 'bg-gradient-to-r from-blue-500 to-blue-600 text-white hover:from-blue-600 hover:to-blue-700'
              }`}
            >
              <FaSearch /> Search Students
            </button>
          </div>
        )}

        {/* Error State */}
        {error && (
          <div className="mt-8 bg-gradient-to-r from-red-50 to-red-100 border border-red-200 text-red-700 px-6 py-4 rounded-2xl flex items-center gap-4 shadow-lg">
            <div className="p-3 bg-red-100 rounded-xl">
              <FaExclamationTriangle className="text-2xl text-red-600" />
            </div>
            <div className="flex-1">
              <h4 className="font-bold">Error Loading Data</h4>
              <p>{error}</p>
            </div>
            <button
              onClick={loadInitialData}
              className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
            >
              Retry
            </button>
          </div>
        )}

        {/* Footer Info */}
        <div className="mt-8 pt-6 border-t border-gray-200 text-center text-gray-500 text-sm">
          <p>
            Student Management • 
            Allocated Subjects: {subjectAllocations.length} • 
            Last updated: {new Date().toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
          </p>
          {filters.class && filters.section && filters.subject && (
            <p className="mt-1 text-blue-600">
              Currently viewing students for {filters.subject} | Class {filters.class}-{filters.section}
            </p>
          )}
        </div>
      </div>

      {/* Student Details Modal */}
      <Modal
        isOpen={showStudentModal}
        onRequestClose={() => setShowStudentModal(false)}
        style={{
          ...customStyles,
          content: {
            ...customStyles.content,
            maxWidth: '800px',
          }
        }}
        contentLabel="Student Details"
      >
        <div className="bg-white rounded-3xl overflow-hidden">
          <div className="sticky top-0 bg-white border-b border-gray-200 px-8 py-6 flex justify-between items-center">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-gradient-to-r from-blue-500 to-blue-600 rounded-xl">
                <FaUserGraduate className="text-2xl text-white" />
              </div>
              <div>
                <h2 className="text-2xl font-bold text-gray-800">Student Details</h2>
                <p className="text-gray-600">{selectedStudent?.student_name}</p>
              </div>
            </div>
            <button
              onClick={() => setShowStudentModal(false)}
              className="text-gray-500 hover:text-gray-700 text-3xl hover:bg-gray-100 w-10 h-10 rounded-full flex items-center justify-center"
            >
              ×
            </button>
          </div>
          
          <div className="p-8 max-h-[70vh] overflow-y-auto">
            {selectedStudent && (
              <div className="space-y-8">
                {/* Header Info */}
                <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-2xl p-6 border border-blue-200">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className="w-20 h-20 bg-gradient-to-r from-blue-500 to-blue-600 rounded-xl flex items-center justify-center">
                        <span className="text-3xl font-bold text-white">
                          {selectedStudent.student_name.charAt(0)}
                        </span>
                      </div>
                      <div>
                        <h3 className="text-2xl font-bold text-gray-800">{selectedStudent.student_name}</h3>
                        <div className="flex items-center gap-4 mt-2 text-sm text-gray-600">
                          <span className="flex items-center gap-1">
                            <FaIdCard /> ID: {selectedStudent.student_id}
                          </span>
                          <span>•</span>
                          <span className="flex items-center gap-1">
                            <FaSchool /> Class {selectedStudent.class_name || filters.class}-{selectedStudent.section || filters.section}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Grid Layout */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                  {/* Personal Information */}
                  <div>
                    <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
                      <FaUserCircle /> Personal Information
                    </h3>
                    <div className="space-y-4">
                      {selectedStudent.email && (
                        <div className="flex items-center gap-3 p-4 bg-blue-50 rounded-xl border border-blue-200">
                          <FaEnvelope className="text-blue-500" />
                          <div className="flex-1">
                            <div className="text-sm text-gray-600">Email Address</div>
                            <div className="font-medium text-gray-800">{selectedStudent.email}</div>
                          </div>
                        </div>
                      )}
                      
                      {selectedStudent.phone && (
                        <div className="flex items-center gap-3 p-4 bg-green-50 rounded-xl border border-green-200">
                          <FaPhone className="text-green-500" />
                          <div className="flex-1">
                            <div className="text-sm text-gray-600">Phone Number</div>
                            <div className="font-medium text-gray-800">{selectedStudent.phone}</div>
                          </div>
                        </div>
                      )}
                      
                      {selectedStudent.date_of_birth && (
                        <div className="flex items-center gap-3 p-4 bg-purple-50 rounded-xl border border-purple-200">
                          <FaBirthdayCake className="text-purple-500" />
                          <div className="flex-1">
                            <div className="text-sm text-gray-600">Date of Birth</div>
                            <div className="font-medium text-gray-800">
                              {formatDate(selectedStudent.date_of_birth)}
                            </div>
                          </div>
                        </div>
                      )}
                      
                      {selectedStudent.gender && (
                        <div className="flex items-center gap-3 p-4 bg-pink-50 rounded-xl border border-pink-200">
                          {getGenderIcon(selectedStudent.gender)}
                          <div className="flex-1">
                            <div className="text-sm text-gray-600">Gender</div>
                            <div className="font-medium text-gray-800 capitalize">{selectedStudent.gender}</div>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Academic Information */}
                  <div>
                    <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
                      <FaSchool /> Academic Information
                    </h3>
                    <div className="space-y-4">
                      <div className="p-4 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl border border-blue-200">
                        <div className="font-semibold text-gray-800 mb-1">Current Class</div>
                        <div className="text-lg font-bold text-blue-700">
                          Class {selectedStudent.class_name || filters.class} - Section {selectedStudent.section || filters.section}
                        </div>
                      </div>
                      
                      {selectedStudent.roll_number && (
                        <div className="p-4 bg-gradient-to-r from-green-50 to-emerald-50 rounded-xl border border-green-200">
                          <div className="font-semibold text-gray-800 mb-1">Roll Number</div>
                          <div className="text-2xl font-bold text-green-700">{selectedStudent.roll_number}</div>
                        </div>
                      )}
                      
                      <div className="p-4 bg-gradient-to-r from-purple-50 to-violet-50 rounded-xl border border-purple-200">
                        <div className="font-semibold text-gray-800 mb-1">Subject Teacher View</div>
                        <div className="text-gray-700 text-sm">
                          You are viewing this student as the <strong>{filters.subject}</strong> teacher
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Health Information */}
                {selectedStudent.extra_details?.blood_group && (
                  <div>
                    <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
                      <FaTint /> Health Information
                    </h3>
                    <div className="p-4 bg-gradient-to-r from-red-50 to-rose-50 rounded-xl border border-red-200">
                      <div className="flex items-center justify-between">
                        <div>
                          <div className="font-semibold text-gray-800 mb-1">Blood Group</div>
                          <div className={`px-3 py-1 rounded-full ${getBloodGroupColor(selectedStudent.extra_details.blood_group)} inline-block font-bold`}>
                            {selectedStudent.extra_details.blood_group}
                          </div>
                        </div>
                        {selectedStudent.extra_details.emergency_contact && (
                          <div>
                            <div className="font-semibold text-gray-800 mb-1">Emergency Contact</div>
                            <div className="text-red-700 font-medium">{selectedStudent.extra_details.emergency_contact}</div>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                )}

                {/* Parent Information */}
                {(selectedStudent.father_name || selectedStudent.mother_name) && (
                  <div>
                    <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
                      <FaPhone /> Parent Information
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {selectedStudent.father_name && (
                        <div className="p-4 bg-gradient-to-r from-blue-50 to-cyan-50 rounded-xl border border-blue-200">
                          <div className="font-semibold text-gray-800 mb-1">Father</div>
                          <div className="font-medium text-gray-800">{selectedStudent.father_name}</div>
                          {selectedStudent.father_phone && (
                            <div className="text-sm text-gray-600 mt-1">
                              Phone: {selectedStudent.father_phone}
                            </div>
                          )}
                        </div>
                      )}
                      
                      {selectedStudent.mother_name && (
                        <div className="p-4 bg-gradient-to-r from-pink-50 to-rose-50 rounded-xl border border-pink-200">
                          <div className="font-semibold text-gray-800 mb-1">Mother</div>
                          <div className="font-medium text-gray-800">{selectedStudent.mother_name}</div>
                          {selectedStudent.mother_phone && (
                            <div className="text-sm text-gray-600 mt-1">
                              Phone: {selectedStudent.mother_phone}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Address */}
                {selectedStudent.address && (
                  <div>
                    <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
                      <FaHome /> Address
                    </h3>
                    <div className="p-4 bg-gray-50 rounded-xl border border-gray-200">
                      <div className="text-gray-700 whitespace-pre-line">
                        {selectedStudent.address}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}
            
            <button
              onClick={() => setShowStudentModal(false)}
              className="w-full mt-8 px-6 py-3 border border-gray-300 text-gray-700 rounded-xl hover:bg-gray-50 transition-colors"
            >
              Close
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}