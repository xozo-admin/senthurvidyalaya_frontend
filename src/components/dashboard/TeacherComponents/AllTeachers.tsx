'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  FaUserTie,
  FaUserPlus,
  FaEdit,
  FaTrash,
  FaSave,
  FaChalkboardTeacher,
  FaArrowLeft,
  FaPhone,
  FaEnvelope,
  FaGraduationCap,
  FaBuilding,
  FaCalendar,
  FaSearch,
  FaFilter,
  FaTimes,
  FaCheck,
  FaDownload,
  FaEye,
  FaSort,
  FaSortUp,
  FaSortDown,
  FaMapMarkerAlt,
  FaSchool,
  FaChevronLeft,
  FaChevronRight,
  FaBook,
  FaUsers,
  FaChartBar,
  FaIdCard,
  FaCalendarAlt,
  FaUserCheck,
  FaUserTimes,
  FaClipboardList,
  FaCog,
  FaPlus,
  FaInfoCircle,
  FaMinus,
  FaSync,
  FaKey,
  FaExternalLinkAlt,
  FaShieldAlt
} from 'react-icons/fa';
import { useTheme } from '@/contexts/ThemeContext';
import { useThemeClasses } from '@/hooks/useThemeClasses';
import { toastSuccess, toastError, toastInfo, toastWarning } from '@/lib/toast';

interface Teacher {
  id: number;
  teacher_id: string;
  name: string;
  email: string;
  phone: string;
  date_of_birth: string;
  qualification: string;
  department: string;
  address: string;
  assigned_class: string;
  assigned_section?: {
    id: number;
    name: string;
    standard: {
      id: number;
      name: string;
    };
  } | null;
  extra_details?: any;
}

interface TeacherAllocation {
  teacher: number;
  teacher_id: string;
  teacher_name: string;
  subject: string;
  class: string;
  sections: string[];
}

interface TeacherSubjectAssignment {
  subject_name: string;
  subject_code?: string;
  classes: string[];
  sections?: string[];
}

type SortField = 'name' | 'teacher_id' | 'department' | 'assigned_class';
type SortDirection = 'asc' | 'desc';

export const AllTeachersPage = () => {
  const router = useRouter();
  const { theme } = useTheme();
  const { get, combine } = useThemeClasses();
  const [mode, setMode] = useState<'list' | 'add' | 'edit' | 'profile'>('list');
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [teacherAllocations, setTeacherAllocations] = useState<TeacherAllocation[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingAllocations, setLoadingAllocations] = useState(false);
  const [editId, setEditId] = useState<number | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterDept, setFilterDept] = useState('all');
  const [filterStatus, setFilterStatus] = useState<'all' | 'assigned' | 'unassigned'>('all');
  const [sortField, setSortField] = useState<SortField>('name');
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc');
  const [currentPage, setCurrentPage] = useState(1);
  const [activeTab, setActiveTab] = useState<'teachers' | 'allocations'>('teachers');
  const itemsPerPage = 10;

  /* ===== Assign Subject Modal ===== */
  const [showAssignSubjectModal, setShowAssignSubjectModal] = useState(false);
  const [subjectAssignTeacherId, setSubjectAssignTeacherId] = useState<string | null>(null);
  const [subjectAssignTeacherName, setSubjectAssignTeacherName] = useState('');
  const [subjectAssignData, setSubjectAssignData] = useState({
    subject_name: '',
    classes: '',
    sections: ''
  });

  /* ===== Manage Subjects Modal ===== */
  const [showManageSubjectsModal, setShowManageSubjectsModal] = useState(false);
  const [manageSubjectsTeacherId, setManageSubjectsTeacherId] = useState<string | null>(null);
  const [manageSubjectsTeacherName, setManageSubjectsTeacherName] = useState('');
  const [teacherSubjects, setTeacherSubjects] = useState<TeacherSubjectAssignment[]>([]);
  const [newSubject, setNewSubject] = useState({ subject_name: '', classes: '', sections: '' });

  /* ===== Assign Class Teacher Modal ===== */
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [assignTeacherId, setAssignTeacherId] = useState<string | null>(null);
  const [assignTeacherName, setAssignTeacherName] = useState<string>('');
  const [assignData, setAssignData] = useState({
    class_name: '',
    section: '',
  });

  /* ===== View Teacher Details ===== */
  const [selectedTeacher, setSelectedTeacher] = useState<Teacher | null>(null);

  /* ===== Bulk Actions ===== */
  const [selectedTeachers, setSelectedTeachers] = useState<number[]>([]);
  const [showBulkActions, setShowBulkActions] = useState(false);

  const [formData, setFormData] = useState({
    teacher_id: '',
    name: '',
    phone: '',
    email: '',
    date_of_birth: '',
    qualification: '',
    department: '',
    address: '',
    gender: '',
    blood_group: '',
    emergency_contact: '',
    joining_date: new Date().toISOString().split('T')[0],
  });

  const [showDeleteConfirm, setShowDeleteConfirm] = useState<number | null>(null);

  // Theme-aware CSS classes using the theme system
  const getBgClass = () => combine(
    get('bg', 'primary'),
    'min-h-screen transition-colors duration-200'
  );

  const getCardGradientClass = (color: string = 'purple') => {
    const baseClasses = combine(
      'rounded-2xl p-6 border shadow-lg transition-all duration-300 group hover:shadow-xl my-2',
      get('border', 'primary')
    );

    if (color === 'purple') {
      return combine(baseClasses, 'bg-gradient-to-br', theme === 'dark' 
        ? 'from-gray-800 to-purple-900/10' 
        : 'from-white to-purple-50');
    }
    if (color === 'emerald') {
      return combine(baseClasses, 'bg-gradient-to-br', theme === 'dark'
        ? 'from-gray-800 to-emerald-900/10'
        : 'from-white to-emerald-50');
    }
    if (color === 'blue') {
      return combine(baseClasses, 'bg-gradient-to-br', theme === 'dark'
        ? 'from-gray-800 to-blue-900/10'
        : 'from-white to-blue-50');
    }
    if (color === 'amber') {
      return combine(baseClasses, 'bg-gradient-to-br', theme === 'dark'
        ? 'from-gray-800 to-amber-900/10'
        : 'from-white to-amber-50');
    }
    if (color === 'indigo') {
      return combine(baseClasses, 'bg-gradient-to-br', theme === 'dark'
        ? 'from-gray-800 to-indigo-900/10'
        : 'from-white to-indigo-50');
    }
    if (color === 'green') {
      return combine(baseClasses, 'bg-gradient-to-br', theme === 'dark'
        ? 'from-gray-800 to-green-900/10'
        : 'from-white to-green-50');
    }
    if (color === 'red') {
      return combine(baseClasses, 'bg-gradient-to-br', theme === 'dark'
        ? 'from-gray-800 to-red-900/10'
        : 'from-white to-red-50');
    }
    return combine(baseClasses, 'bg-gradient-to-br', get('bg', 'card'));
  };

  const getStatsCardClass = (color: 'purple' | 'emerald' | 'blue' | 'amber' | 'indigo' = 'purple') => {
    return getCardGradientClass(color);
  };

  const getInputClass = () => combine(
    'px-4 py-3.5 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-purple-500 outline-none transition-all w-full',
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
      ? 'bg-gradient-to-r from-purple-600 to-purple-700 hover:from-purple-700 hover:to-purple-800'
      : 'bg-gradient-to-r from-purple-500 to-purple-600 hover:from-purple-600 hover:to-purple-700'
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

  const getStatusBadgeClass = (type: string) => {
    const colorMap: { [key: string]: { bg: string; text: string; border: string } } = {
      purple: {
        bg: theme === 'dark' ? 'from-purple-900/30 to-purple-800/30' : 'from-purple-100 to-purple-200',
        text: theme === 'dark' ? 'text-purple-300' : 'text-purple-700',
        border: theme === 'dark' ? 'border-purple-800' : 'border-purple-200'
      },
      emerald: {
        bg: theme === 'dark' ? 'from-emerald-900/30 to-emerald-800/30' : 'from-emerald-100 to-emerald-200',
        text: theme === 'dark' ? 'text-emerald-300' : 'text-emerald-700',
        border: theme === 'dark' ? 'border-emerald-800' : 'border-emerald-200'
      },
      blue: {
        bg: theme === 'dark' ? 'from-blue-900/30 to-blue-800/30' : 'from-blue-100 to-blue-200',
        text: theme === 'dark' ? 'text-blue-300' : 'text-blue-700',
        border: theme === 'dark' ? 'border-blue-800' : 'border-blue-200'
      },
      amber: {
        bg: theme === 'dark' ? 'from-amber-900/30 to-amber-800/30' : 'from-amber-100 to-amber-200',
        text: theme === 'dark' ? 'text-amber-300' : 'text-amber-700',
        border: theme === 'dark' ? 'border-amber-800' : 'border-amber-200'
      },
      indigo: {
        bg: theme === 'dark' ? 'from-indigo-900/30 to-indigo-800/30' : 'from-indigo-100 to-indigo-200',
        text: theme === 'dark' ? 'text-indigo-300' : 'text-indigo-700',
        border: theme === 'dark' ? 'border-indigo-800' : 'border-indigo-200'
      },
      green: {
        bg: theme === 'dark' ? 'from-green-900/30 to-green-800/30' : 'from-green-100 to-green-200',
        text: theme === 'dark' ? 'text-green-300' : 'text-green-700',
        border: theme === 'dark' ? 'border-green-800' : 'border-green-200'
      },
      red: {
        bg: theme === 'dark' ? 'from-red-900/30 to-red-800/30' : 'from-red-100 to-red-200',
        text: theme === 'dark' ? 'text-red-300' : 'text-red-700',
        border: theme === 'dark' ? 'border-red-800' : 'border-red-200'
      },
    };

    const colors = colorMap[type] || colorMap.purple;
    return combine(
      'px-3 py-1.5 text-sm font-medium rounded-full bg-gradient-to-r',
      colors.bg,
      colors.text,
      'border',
      colors.border
    );
  };

  const getTableHeaderClass = () => combine(
    get('bg', 'secondary'),
    'divide-y',
    get('border', 'primary')
  );

  const getTableRowClass = () => combine(
    get('bg', 'card'),
    'divide-y',
    get('border', 'primary'),
    'hover:bg-[var(--color-bg-hover)]'
  );

  /* ================= FETCH TEACHERS ================= */
  const fetchTeachers = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      const res = await fetch('https://senthurvidyalaya-backend.onrender.com/api/schooladmin/teachers/', {
        headers: { 
          Authorization: `Token ${token}`,
          'Content-Type': 'application/json'
        },
      });
      
      if (!res.ok) {
        throw new Error(`HTTP error! status: ${res.status}`);
      }
      
      const data = await res.json();
      setTeachers(data?.data || data || []);
    } catch (error) {
      console.error('Error fetching teachers:', error);
      toastError('Failed to fetch teachers. Please check your connection.');
    } finally {
      setLoading(false);
    }
  };

  /* ================= FETCH TEACHER ALLOCATIONS ================= */
  const fetchTeacherAllocations = async () => {
    setLoadingAllocations(true);
    try {
      const token = localStorage.getItem('token');
      const res = await fetch('https://senthurvidyalaya-backend.onrender.com/api/teacher/teachers-by-class/', {
        headers: { 
          Authorization: `Token ${token}`,
          'Content-Type': 'application/json'
        },
      });
      
      if (res.ok) {
        const data = await res.json();
        setTeacherAllocations(data);
      }
    } catch (error) {
      console.error('Error fetching allocations:', error);
    } finally {
      setLoadingAllocations(false);
    }
  };

  /* ================= FETCH TEACHER SUBJECTS ================= */
  const fetchTeacherSubjects = async (teacherId: string) => {
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`https://senthurvidyalaya-backend.onrender.com/api/teacher/subject-allocations/?teacher_id=${teacherId}`, {
        headers: { 
          Authorization: `Token ${token}`,
          'Content-Type': 'application/json'
        },
      });
      
      if (res.ok) {
        const data = await res.json();
        // Transform API response to match our interface
        const subjects = data.allocations.map((alloc: any) => ({
          subject_name: alloc.subject_name,
          subject_code: alloc.subject_code,
          classes: alloc.classes,
          sections: alloc.sections
        }));
        setTeacherSubjects(subjects);
      }
    } catch (error) {
      console.error('Error fetching teacher subjects:', error);
    }
  };

  /* ================= REMOVE TEACHER SUBJECT ================= */
  const removeTeacherSubject = async (subjectName: string, className?: string) => {
    if (!manageSubjectsTeacherId) return;
    
    if (!confirm(`Remove ${subjectName}${className ? ` for Class ${className}` : ''}?`)) return;
    
    const token = localStorage.getItem('token');
    const payload = {
      teacher_id: manageSubjectsTeacherId,
      subject_name: subjectName,
      ...(className && { class_name: className })
    };
    
    try {
      const res = await fetch('https://senthurvidyalaya-backend.onrender.com/api/teacher/remove-subject/', {
        method: 'DELETE',
        headers: {
          Authorization: `Token ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });
      
      if (res.ok) {
        toastSuccess('Subject removed successfully');
        fetchTeacherSubjects(manageSubjectsTeacherId);
        fetchTeacherAllocations();
      } else {
        const data = await res.json();
        toastError(data.error || 'Failed to remove subject');
      }
    } catch (error) {
      console.error('Error removing subject:', error);
      toastError('Failed to remove subject');
    }
  };

  useEffect(() => {
    fetchTeachers();
    if (activeTab === 'allocations') {
      fetchTeacherAllocations();
    }
  }, [activeTab]);

  /* ================= DELETE TEACHER ================= */
  const deleteTeacher = async (id: number) => {
    setShowDeleteConfirm(null);
    const token = localStorage.getItem('token');

    try {
      const response = await fetch(`https://senthurvidyalaya-backend.onrender.com/api/schooladmin/teachers/${id}/`, {
        method: 'DELETE',
        headers: { 
          Authorization: `Token ${token}`,
          'Content-Type': 'application/json'
        },
      });
      
      if (!response.ok) {
        throw new Error('Delete failed');
      }
      
      setTeachers(prev => prev.filter(t => t.id !== id));
      setSelectedTeachers(prev => prev.filter(teacherId => teacherId !== id));
      toastSuccess('Teacher deleted successfully!');
    } catch (error) {
      console.error('Error deleting teacher:', error);
      toastError('Failed to delete teacher');
      fetchTeachers();
    }
  };

  /* ================= BULK DELETE ================= */
  const bulkDeleteTeachers = async () => {
    if (!confirm(`Are you sure you want to delete ${selectedTeachers.length} teachers?`)) return;
    
    const token = localStorage.getItem('token');
    let successCount = 0;
    let failCount = 0;

    for (const id of selectedTeachers) {
      try {
        const response = await fetch(`https://senthurvidyalaya-backend.onrender.com/api/schooladmin/teachers/${id}/`, {
          method: 'DELETE',
          headers: { 
            Authorization: `Token ${token}`,
            'Content-Type': 'application/json'
          },
        });
        
        if (response.ok) {
          successCount++;
        } else {
          failCount++;
        }
      } catch (error) {
        failCount++;
      }
    }

    toastSuccess(`Deleted ${successCount} teachers, ${failCount} failed.`);
    fetchTeachers();
    setSelectedTeachers([]);
    setShowBulkActions(false);
  };

  /* ================= START EDIT ================= */
  const startEdit = (teacher: Teacher) => {
    setFormData({
      teacher_id: teacher.teacher_id,
      name: teacher.name,
      phone: teacher.phone,
      email: teacher.email,
      date_of_birth: teacher.date_of_birth,
      qualification: teacher.qualification,
      department: teacher.department,
      address: teacher.address || '',
      gender: teacher.extra_details?.gender || '',
      blood_group: teacher.extra_details?.blood_group || '',
      emergency_contact: teacher.extra_details?.emergency_contact || '',
      joining_date: teacher.extra_details?.joining_date || new Date().toISOString().split('T')[0],
    });
    setEditId(teacher.id);
    setMode('edit');
  };

  /* ================= VIEW TEACHER PROFILE ================= */
  const viewTeacherProfile = (teacher: Teacher) => {
    setSelectedTeacher(teacher);
    setMode('profile');
  };

  /* ================= HANDLE FORM CHANGE ================= */
  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  /* ================= SUBMIT FORM ================= */
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const token = localStorage.getItem('token');

    const payload = {
      teacher_id: formData.teacher_id,
      name: formData.name,
      email: formData.email,
      phone: formData.phone,
      date_of_birth: formData.date_of_birth,
      qualification: formData.qualification,
      department: formData.department,
      address: formData.address || null,
      extra_details: {
        gender: formData.gender,
        blood_group: formData.blood_group,
        emergency_contact: formData.emergency_contact,
        joining_date: formData.joining_date,
      }
    };

    // FIX: For UPDATE, use the teacher's ID from the teachers array
    const teacherToUpdate = teachers.find(t => t.id === editId);
    const teacherIdForUrl = mode === 'edit' ? teacherToUpdate?.teacher_id : formData.teacher_id;

    // FIX: Use the correct endpoint format for update
    const url = mode === 'edit'
      ? `https://senthurvidyalaya-backend.onrender.com/api/schooladmin/teachers/${teacherIdForUrl}/`
      : 'https://senthurvidyalaya-backend.onrender.com/api/schooladmin/teachers/';

    const method = mode === 'edit' ? 'PUT' : 'POST';

    try {
      const res = await fetch(url, {
        method,
        headers: {
          Authorization: `Token ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      const responseData = await res.json();

      if (res.ok) {
        fetchTeachers();
        setMode('list');
        setFormData({
          teacher_id: '',
          name: '',
          phone: '',
          email: '',
          date_of_birth: '',
          qualification: '',
          department: '',
          address: '',
          gender: '',
          blood_group: '',
          emergency_contact: '',
          joining_date: new Date().toISOString().split('T')[0],
        });
        
        const successMsg = mode === 'edit' 
          ? 'Teacher updated successfully!' 
          : 'Teacher added successfully!';
        toastSuccess(successMsg);
      } else {
        const errorMsg = responseData.message || 
                        responseData.detail || 
                        Object.values(responseData).flat().join(', ') ||
                        'Operation failed. Please check your data.';
        toastError(`Error: ${errorMsg}`);
      }
    } catch (error) {
      console.error('Network error:', error);
      toastError('Network error. Please check your connection.');
    } finally {
      setLoading(false);
    }
  };

  /* ================= ASSIGN CLASS TEACHER ================= */
  const assignClassTeacher = async () => {
    if (!assignTeacherId || !assignData.class_name || !assignData.section) {
      toastWarning('Class and Section are required');
      return;
    }

    const token = localStorage.getItem('token');

    try {
      const res = await fetch('https://senthurvidyalaya-backend.onrender.com/api/schooladmin/assign-teacher/', {
        method: 'POST',
        headers: {
          Authorization: `Token ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          teacher_id: assignTeacherId,
          class_name: assignData.class_name,
          section: assignData.section,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        toastError(data.error || data.detail || 'Assignment failed');
        return;
      }

      toastSuccess(data.message || `Teacher assigned to ${assignData.class_name} - ${assignData.section}`);
      setShowAssignModal(false);
      setAssignData({ class_name: '', section: '' });
      fetchTeachers();
    } catch (error) {
      console.error('Error assigning teacher:', error);
      toastError('Failed to assign teacher');
    }
  };

  /* ================= ASSIGN TEACHER TO SUBJECT ================= */
  const assignTeacherToSubject = async () => {
    if (!subjectAssignTeacherId || !subjectAssignData.subject_name || !subjectAssignData.classes) {
      toastWarning('Subject and Classes are required');
      return;
    }

    const token = localStorage.getItem('token');

    const payload: any = {
      teacher_id: subjectAssignTeacherId,
      subject_name: subjectAssignData.subject_name,
      classes: subjectAssignData.classes
        .split(',')
        .map(c => c.trim())
        .filter(Boolean),
    };

    // Add sections if provided
    if (subjectAssignData.sections) {
      payload.sections = subjectAssignData.sections
        .split(',')
        .map(s => s.trim())
        .filter(Boolean);
    }

    try {
      const res = await fetch(
        'https://senthurvidyalaya-backend.onrender.com/api/teacher/assign-subject/',
        {
          method: 'POST',
          headers: {
            Authorization: `Token ${token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(payload),
        }
      );

      const data = await res.json();

      if (!res.ok) {
        toastError(data.error || data.detail || 'Subject assignment failed');
        return;
      }

      toastSuccess(data.message || 'Subject assigned successfully');
      setShowAssignSubjectModal(false);
      setSubjectAssignData({ subject_name: '', classes: '', sections: '' });
      fetchTeacherAllocations();
    } catch (error) {
      console.error('Assign subject error:', error);
      toastError('Failed to assign subject');
    }
  };

  /* ================= MANAGE TEACHER SUBJECTS ================= */
  const openManageSubjects = async (teacherId: string, teacherName: string) => {
    setManageSubjectsTeacherId(teacherId);
    setManageSubjectsTeacherName(teacherName);
    await fetchTeacherSubjects(teacherId);
    setShowManageSubjectsModal(true);
  };

  const addTeacherSubject = async () => {
    if (!newSubject.subject_name || !newSubject.classes) {
      toastWarning('Subject name and classes are required');
      return;
    }

    const token = localStorage.getItem('token');
    const payload: any = {
      teacher_id: manageSubjectsTeacherId,
      subject_name: newSubject.subject_name,
      classes: newSubject.classes.split(',').map(c => c.trim()).filter(Boolean),
    };

    // Add sections if provided
    if (newSubject.sections) {
      payload.sections = newSubject.sections.split(',').map(s => s.trim()).filter(Boolean);
    }

    try {
      const res = await fetch('https://senthurvidyalaya-backend.onrender.com/api/teacher/assign-subject/', {
        method: 'POST',
        headers: {
          Authorization: `Token ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        const newSubjectObj: TeacherSubjectAssignment = {
          subject_name: newSubject.subject_name,
          classes: newSubject.classes.split(',').map(c => c.trim())
        };
        
        if (newSubject.sections) {
          newSubjectObj.sections = newSubject.sections.split(',').map(s => s.trim());
        }
        
        setTeacherSubjects([...teacherSubjects, newSubjectObj]);
        setNewSubject({ subject_name: '', classes: '', sections: '' });
        fetchTeacherAllocations();
        toastSuccess('Subject added successfully');
      } else {
        toastError('Failed to add subject');
      }
    } catch (error) {
      console.error('Error adding subject:', error);
      toastError('Failed to add subject');
    }
  };

  /* ================= FILTER & SORT ================= */
  const filteredTeachers = teachers.filter(teacher => {
    const matchesSearch = 
      teacher.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      teacher.teacher_id.toLowerCase().includes(searchTerm.toLowerCase()) ||
      teacher.department.toLowerCase().includes(searchTerm.toLowerCase()) ||
      teacher.qualification.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesDept = filterDept === 'all' || teacher.department === filterDept;
    
    const matchesStatus = filterStatus === 'all' ||
      (filterStatus === 'assigned' && teacher.assigned_class && teacher.assigned_class !== 'Not Assigned') ||
      (filterStatus === 'unassigned' && (!teacher.assigned_class || teacher.assigned_class === 'Not Assigned'));
    
    return matchesSearch && matchesDept && matchesStatus;
  });

  const sortedTeachers = [...filteredTeachers].sort((a, b) => {
    let aValue = a[sortField];
    let bValue = b[sortField];
    
    if (typeof aValue === 'string' && typeof bValue === 'string') {
      aValue = aValue.toLowerCase();
      bValue = bValue.toLowerCase();
    }
    
    if (aValue < bValue) return sortDirection === 'asc' ? -1 : 1;
    if (aValue > bValue) return sortDirection === 'asc' ? 1 : -1;
    return 0;
  });

  /* ================= PAGINATION ================= */
  const totalPages = Math.ceil(sortedTeachers.length / itemsPerPage);
  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentTeachers = sortedTeachers.slice(indexOfFirstItem, indexOfLastItem);

  /* ================= GET UNIQUE DEPARTMENTS ================= */
  const departments = ['all', ...Array.from(new Set(teachers.map(t => t.department).filter(Boolean)))];

  /* ================= STATS ================= */
  const totalTeachers = teachers.length;
  const deptCount = Array.from(new Set(teachers.map(t => t.department).filter(Boolean))).length;
  const assignedCount = teachers.filter(t => t.assigned_class && t.assigned_class !== 'Not Assigned').length;
  const unassignedCount = totalTeachers - assignedCount;

  /* ================= SORT HANDLER ================= */
  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  /* ================= SELECT TEACHER ================= */
  const toggleSelectTeacher = (id: number) => {
    setSelectedTeachers(prev => 
      prev.includes(id) 
        ? prev.filter(teacherId => teacherId !== id)
        : [...prev, id]
    );
  };

  const selectAllTeachers = () => {
    if (selectedTeachers.length === currentTeachers.length) {
      setSelectedTeachers([]);
    } else {
      setSelectedTeachers(currentTeachers.map(t => t.id));
    }
  };

  /* ================= EXPORT CSV ================= */
  const exportToCSV = () => {
    const headers = ['Teacher ID', 'Name', 'Email', 'Phone', 'Qualification', 'Department', 'DOB', 'Assigned Class', 'Address'];
    const csvData = teachers.map(teacher => [
      teacher.teacher_id,
      teacher.name,
      teacher.email,
      teacher.phone,
      teacher.qualification,
      teacher.department,
      teacher.date_of_birth,
      teacher.assigned_class || 'Not Assigned',
      teacher.address || ''
    ]);
    
    const csvContent = [
      headers.join(','),
      ...csvData.map(row => row.map(field => `"${field}"`).join(','))
    ].join('\n');
    
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `teachers_${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
    toastSuccess('CSV exported successfully!');
  };

  /* ================= RESET PASSWORD ================= */
  const resetTeacherPassword = async (teacherId: string, teacherName: string) => {
    if (!confirm(`Reset password for ${teacherName}? Default password will be their phone number.`)) return;
    
    toastInfo(`Password reset initiated for ${teacherName}. Check backend implementation.`);
  };

  return (
    <div className={`p-6 ${getBgClass()} transition-colors duration-200`}>
      <div className="mx-auto w-full">
        {/* HEADER SECTION */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center space-x-4">
              <div className={combine(
                "p-3 rounded-2xl shadow-lg",
                theme === 'dark' 
                  ? "bg-gradient-to-br from-purple-600 to-purple-700" 
                  : "bg-gradient-to-br from-purple-500 to-purple-600"
              )}>
                <FaUserTie className="text-2xl text-white" />
              </div>
              <div>
                <h1 className={combine("text-3xl font-bold", get('text', 'primary'))}>
                  Teacher Management
                </h1>
                <p className={combine("text-sm mt-1", get('text', 'secondary'))}>
                  Manage all teachers, assignments, and subject allocations
                </p>
              </div>
            </div>
            
            <div className="flex items-center space-x-3">
              {selectedTeachers.length > 0 && (
                <div className="flex items-center space-x-2 mr-4">
                  <span className={combine(
                    "text-sm px-3 py-1.5 rounded-lg",
                    theme === 'dark' ? 'bg-blue-900/30 text-blue-300' : 'bg-blue-100 text-blue-700'
                  )}>
                    {selectedTeachers.length} selected
                  </span>
                  <button
                    onClick={bulkDeleteTeachers}
                    className={combine(
                      "px-4 py-2.5 rounded-xl transition-all duration-200 flex items-center space-x-2 hover:scale-[1.02] active:scale-[0.98]",
                      theme === 'dark'
                        ? 'bg-gradient-to-r from-red-600 to-red-700 hover:from-red-700 hover:to-red-800 text-white'
                        : 'bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 text-white'
                    )}
                  >
                    <FaTrash />
                    <span className="text-sm">Delete Selected</span>
                  </button>
                </div>
              )}
              
              <button
                onClick={() => setActiveTab(activeTab === 'teachers' ? 'allocations' : 'teachers')}
                className={combine(getSecondaryButtonClass(), "flex items-center space-x-2")}
              >
                <FaClipboardList className="text-sm" />
                <span className="text-sm">{activeTab === 'teachers' ? 'View Allocations' : 'View Teachers'}</span>
              </button>
              
              <button
                onClick={exportToCSV}
                className={combine(getSecondaryButtonClass(), "flex items-center space-x-2")}
              >
                <FaDownload className="text-sm" />
                <span className="text-sm">Export CSV</span>
              </button>
              
              {mode === 'list' ? (
                <button
                  onClick={() => setMode('add')}
                  className={combine(getPrimaryButtonClass(), "flex items-center space-x-2")}
                >
                  <FaUserPlus className="text-sm" />
                  <span className="text-sm">Add Teacher</span>
                </button>
              ) : (
                <button
                  onClick={() => {
                    setMode('list');
                    setFormData({
                      teacher_id: '',
                      name: '',
                      phone: '',
                      email: '',
                      date_of_birth: '',
                      qualification: '',
                      department: '',
                      address: '',
                      gender: '',
                      blood_group: '',
                      emergency_contact: '',
                      joining_date: new Date().toISOString().split('T')[0],
                    });
                  }}
                  className={combine(getSecondaryButtonClass(), "flex items-center space-x-2")}
                >
                  <FaArrowLeft className="text-sm" />
                  <span className="text-sm">Back to List</span>
                </button>
              )}
            </div>
          </div>

          {/* QUICK STATS */}
          <div className="grid grid-cols-1 lg:grid-cols-5 gap-6 mb-8">
            <div className={getStatsCardClass('purple')}>
              <div className="flex items-center justify-between">
                <div>
                  <p className={combine("text-xs font-medium", get('text', 'secondary'))}>Total Teachers</p>
                  <p className={combine("text-2xl font-bold mt-2", get('text', 'primary'))}>{totalTeachers}</p>
                </div>
                <div className={combine(
                  "p-2 rounded-xl",
                  theme === 'dark' ? 'bg-purple-900/30' : 'bg-purple-100'
                )}>
                  <FaUserTie className={combine(
                    "text-lg",
                    theme === 'dark' ? 'text-purple-400' : 'text-purple-600'
                  )} />
                </div>
              </div>
              <div className={combine("mt-4 text-xs", get('text', 'tertiary'))}>
                Across all departments
              </div>
            </div>
            
            <div className={getStatsCardClass('emerald')}>
              <div className="flex items-center justify-between">
                <div>
                  <p className={combine("text-xs font-medium", get('text', 'secondary'))}>Departments</p>
                  <p className={combine("text-2xl font-bold mt-2", get('text', 'primary'))}>{deptCount}</p>
                </div>
                <div className={combine(
                  "p-2 rounded-xl",
                  theme === 'dark' ? 'bg-emerald-900/30' : 'bg-emerald-100'
                )}>
                  <FaBuilding className={combine(
                    "text-lg",
                    theme === 'dark' ? 'text-emerald-400' : 'text-emerald-600'
                  )} />
                </div>
              </div>
              <div className={combine("mt-3 text-xs", get('accent', 'success'))}>
                Unique departments
              </div>
            </div>
            
            <div className={getStatsCardClass('blue')}>
              <div className="flex items-center justify-between">
                <div>
                  <p className={combine("text-xs font-medium", get('text', 'secondary'))}>Assigned</p>
                  <p className={combine("text-2xl font-bold mt-2", get('text', 'primary'))}>{assignedCount}</p>
                </div>
                <div className={combine(
                  "p-2 rounded-xl",
                  theme === 'dark' ? 'bg-blue-900/30' : 'bg-blue-100'
                )}>
                  <FaUserCheck className={combine(
                    "text-lg",
                    theme === 'dark' ? 'text-blue-400' : 'text-blue-600'
                  )} />
                </div>
              </div>
              <div className={combine("mt-3 text-xs", get('accent', 'primary'))}>
                {totalTeachers > 0 ? `${((assignedCount / totalTeachers) * 100).toFixed(1)}%` : '0%'} of total
              </div>
            </div>
            
            <div className={getStatsCardClass('amber')}>
              <div className="flex items-center justify-between">
                <div>
                  <p className={combine("text-xs font-medium", get('text', 'secondary'))}>Unassigned</p>
                  <p className={combine("text-2xl font-bold mt-2", get('text', 'primary'))}>{unassignedCount}</p>
                </div>
                <div className={combine(
                  "p-2 rounded-xl",
                  theme === 'dark' ? 'bg-amber-900/30' : 'bg-amber-100'
                )}>
                  <FaUserTimes className={combine(
                    "text-lg",
                    theme === 'dark' ? 'text-amber-400' : 'text-amber-600'
                  )} />
                </div>
              </div>
              <div className={combine("mt-3 text-xs", get('accent', 'warning'))}>
                {totalTeachers > 0 ? `${((unassignedCount / totalTeachers) * 100).toFixed(1)}%` : '0%'} of total
              </div>
            </div>
            
            <div className={getStatsCardClass('indigo')}>
              <div className="flex items-center justify-between">
                <div>
                  <p className={combine("text-xs font-medium", get('text', 'secondary'))}>Filtered</p>
                  <p className={combine("text-2xl font-bold mt-2", get('text', 'primary'))}>{filteredTeachers.length}</p>
                </div>
                <div className={combine(
                  "p-2 rounded-xl",
                  theme === 'dark' ? 'bg-indigo-900/30' : 'bg-indigo-100'
                )}>
                  <FaFilter className={combine(
                    "text-lg",
                    theme === 'dark' ? 'text-indigo-400' : 'text-indigo-600'
                  )} />
                </div>
              </div>
              <div className={combine("mt-3 text-xs", get('accent', 'primary'))}>
                {totalTeachers > 0 ? `${((filteredTeachers.length / totalTeachers) * 100).toFixed(1)}%` : '0%'} of total
              </div>
            </div>
          </div>
        </div>

        {/* MAIN CONTENT AREA */}
        {mode === 'list' && (
          <>
            {/* TABS */}
            <div className="mb-6">
              <div className="border-b border-gray-200 dark:border-gray-700">
                <nav className="-mb-px flex space-x-8">
                  <button
                    onClick={() => setActiveTab('teachers')}
                    className={combine(
                      "py-2 px-1 border-b-2 font-medium text-sm",
                      activeTab === 'teachers'
                        ? 'border-purple-500 text-purple-600 dark:text-purple-400 dark:border-purple-400'
                        : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 hover:border-gray-300 dark:hover:border-gray-600'
                    )}
                  >
                    <FaUserTie className="inline mr-2 text-sm" />
                    Teachers ({teachers.length})
                  </button>
                  <button
                    onClick={() => setActiveTab('allocations')}
                    className={combine(
                      "py-2 px-1 border-b-2 font-medium text-sm",
                      activeTab === 'allocations'
                        ? 'border-purple-500 text-purple-600 dark:text-purple-400 dark:border-purple-400'
                        : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 hover:border-gray-300 dark:hover:border-gray-600'
                    )}
                  >
                    <FaClipboardList className="inline mr-2 text-sm" />
                    Subject Allocations
                  </button>
                </nav>
              </div>
            </div>

            {/* TEACHERS TAB */}
            {activeTab === 'teachers' && (
              <>
                {/* SEARCH & FILTERS */}
                <div className={getCardGradientClass('purple')}>
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <div className="md:col-span-2">
                      <div className="relative">
                        <FaSearch className={combine(
                          "absolute left-4 top-1/2 transform -translate-y-1/2 text-sm",
                          get('icon', 'secondary')
                        )} />
                        <input
                          type="text"
                          placeholder="Search teachers by name, ID, department, or qualification..."
                          value={searchTerm}
                          onChange={(e) => setSearchTerm(e.target.value)}
                          className={getInputClass()}
                          style={{ paddingLeft: '2.5rem' }}
                        />
                      </div>
                    </div>
                    <div>
                      <select
                        value={filterDept}
                        onChange={(e) => setFilterDept(e.target.value)}
                        className={getInputClass()}
                      >
                        {departments.map(dept => (
                          <option key={dept} value={dept}>
                            {dept === 'all' ? 'All Departments' : dept}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <select
                        value={filterStatus}
                        onChange={(e) => setFilterStatus(e.target.value as any)}
                        className={getInputClass()}
                      >
                        <option value="all">All Teachers</option>
                        <option value="assigned">Assigned Only</option>
                        <option value="unassigned">Unassigned Only</option>
                      </select>
                    </div>
                  </div>
                </div>

                {/* TEACHERS TABLE */}
                <div className={getCardGradientClass()}>
                  {/* Table Header */}
                  <div className={combine("p-4 border-b", get('border', 'primary'))}>
                    <div className="flex flex-col md:flex-row justify-between items-start md:items-center space-y-3 md:space-y-0">
                      <div>
                        <h3 className={combine("text-lg font-bold", get('text', 'primary'))}>Teacher Records</h3>
                        <p className={combine("text-sm mt-1", get('text', 'secondary'))}>
                          View and manage teacher information
                        </p>
                      </div>
                      
                      <div className={combine("text-xs", get('text', 'tertiary'))}>
                        Showing {indexOfFirstItem + 1} to {Math.min(indexOfLastItem, filteredTeachers.length)} of {filteredTeachers.length} teachers
                      </div>
                    </div>
                  </div>

                  {/* Table Content */}
                  <div className="overflow-x-auto">
                    {loading ? (
                      <div className="p-8 text-center">
                        <div className="inline-flex flex-col items-center">
                          <div className={combine(
                            "animate-spin rounded-full h-8 w-8 border-4",
                            theme === 'dark' ? 'border-purple-500 border-t-transparent' : 'border-purple-600 border-t-transparent'
                          )}></div>
                          <p className={combine("mt-3 text-sm font-medium", get('text', 'secondary'))}>Loading teachers...</p>
                        </div>
                      </div>
                    ) : currentTeachers.length === 0 ? (
                      <div className="p-8 text-center">
                        <div className={combine(
                          "inline-block p-3 rounded-full mb-3",
                          theme === 'dark' ? 'bg-purple-900/30' : 'bg-purple-100'
                        )}>
                          <FaUserTie className={combine(
                            "text-xl",
                            theme === 'dark' ? 'text-purple-400' : 'text-purple-500'
                          )} />
                        </div>
                        <h3 className={combine("text-base font-medium mb-1", get('text', 'primary'))}>No teachers found</h3>
                        <p className={combine("text-sm mb-4", get('text', 'secondary'))}>
                          {searchTerm || filterDept !== 'all' || filterStatus !== 'all' 
                            ? 'Try adjusting your search or filters'
                            : 'Add your first teacher to get started'}
                        </p>
                       
                      </div>
                    ) : (
                      <>
                        <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                          <thead className={getTableHeaderClass()}>
                            <tr>
                              
                              <th className={combine(
                                "px-4 py-3 text-left text-xs font-medium uppercase tracking-wider cursor-pointer",
                                get('text', 'tertiary'),
                                "hover:bg-[var(--color-bg-hover)]"
                              )}
                                onClick={() => handleSort('teacher_id')}
                              >
                                <div className="flex items-center space-x-2">
                                  <FaIdCard className="text-xs" />
                                  <span className="text-xs">Teacher ID</span>
                                  <div className="ml-1">
                                    {sortField === 'teacher_id' ? (
                                      sortDirection === 'asc' ? 
                                        <FaSortUp className={get('accent', 'primary') + " text-xs"} /> : 
                                        <FaSortDown className={get('accent', 'primary') + " text-xs"} />
                                    ) : (
                                      <FaSort className={get('icon', 'secondary') + " text-xs"} />
                                    )}
                                  </div>
                                </div>
                              </th>
                              <th className={combine(
                                "px-4 py-3 text-left text-xs font-medium uppercase tracking-wider cursor-pointer",
                                get('text', 'tertiary'),
                                "hover:bg-[var(--color-bg-hover)]"
                              )}
                                onClick={() => handleSort('name')}
                              >
                                <div className="flex items-center space-x-2">
                                  <FaUserTie className="text-xs" />
                                  <span className="text-xs">Teacher Details</span>
                                  <div className="ml-1">
                                    {sortField === 'name' ? (
                                      sortDirection === 'asc' ? 
                                        <FaSortUp className={get('accent', 'primary') + " text-xs"} /> : 
                                        <FaSortDown className={get('accent', 'primary') + " text-xs"} />
                                    ) : (
                                      <FaSort className={get('icon', 'secondary') + " text-xs"} />
                                    )}
                                  </div>
                                </div>
                              </th>
                              <th className={combine(
                                "px-4 py-3 text-left text-xs font-medium uppercase tracking-wider",
                                get('text', 'tertiary')
                              )}>
                                <div className="flex items-center space-x-2">
                                  <FaPhone className="text-xs" />
                                  <span className="text-xs">Contact</span>
                                </div>
                              </th>
                              <th className={combine(
                                "px-4 py-3 text-left text-xs font-medium uppercase tracking-wider cursor-pointer",
                                get('text', 'tertiary'),
                                "hover:bg-[var(--color-bg-hover)]"
                              )}
                                onClick={() => handleSort('department')}
                              >
                                <div className="flex items-center space-x-2">
                                  <FaBuilding className="text-xs" />
                                  <span className="text-xs">Department</span>
                                  <div className="ml-1">
                                    {sortField === 'department' ? (
                                      sortDirection === 'asc' ? 
                                        <FaSortUp className={get('accent', 'primary') + " text-xs"} /> : 
                                        <FaSortDown className={get('accent', 'primary') + " text-xs"} />
                                    ) : (
                                      <FaSort className={get('icon', 'secondary') + " text-xs"} />
                                    )}
                                  </div>
                                </div>
                              </th>
                              <th className={combine(
                                "px-4 py-3 text-left text-xs font-medium uppercase tracking-wider",
                                get('text', 'tertiary')
                              )}>
                                <div className="flex items-center space-x-2">
                                  <FaChartBar className="text-xs" />
                                  <span className="text-xs">Status</span>
                                </div>
                              </th>
                              <th className={combine(
                                "px-4 py-3 text-left text-xs font-medium uppercase tracking-wider",
                                get('text', 'tertiary')
                              )}>
                                <div className="flex items-center space-x-2">
                                  <FaCog className="text-xs" />
                                  <span className="text-xs">Actions</span>
                                </div>
                              </th>
                            </tr>
                          </thead>
                          <tbody className={combine("divide-y", getTableRowClass())}>
                            {currentTeachers.map((teacher) => (
                              <tr 
                                key={teacher.id} 
                                className="transition-colors duration-150 hover:bg-[var(--color-bg-hover)]"
                              >
                                
                                <td className="px-4 py-3">
                                  <div className={combine("font-medium text-sm", get('accent', 'primary'))}>
                                    {teacher.teacher_id}
                                  </div>
                                </td>
                                <td className="px-4 py-3">
                                  <div className="flex items-center">
                                    <div className={combine(
                                      "h-10 w-10 rounded-full flex items-center justify-center mr-3",
                                      theme === 'dark' ? 'bg-purple-900/30' : 'bg-purple-100'
                                    )}>
                                      <FaUserTie className={combine(
                                        "text-sm",
                                        theme === 'dark' ? 'text-purple-400' : 'text-purple-600'
                                      )} />
                                    </div>
                                    <div>
                                      <div className="font-semibold text-sm">{teacher.name}</div>
                                      <div className={combine("text-xs mt-1 flex items-center space-x-2", get('text', 'tertiary'))}>
                                        <FaGraduationCap className="text-xs" />
                                        <span className="text-xs">{teacher.qualification}</span>
                                      </div>
                                    </div>
                                  </div>
                                </td>
                                <td className="px-4 py-3">
                                  <div className="space-y-1.5">
                                    <div className={combine("flex items-center text-xs", get('text', 'primary'))}>
                                      <FaEnvelope className={combine("mr-2 text-xs", get('icon', 'secondary'))} />
                                      <span className="truncate max-w-[120px] text-xs">{teacher.email}</span>
                                    </div>
                                    <div className={combine("flex items-center text-xs", get('text', 'primary'))}>
                                      <FaPhone className={combine("mr-2 text-xs", get('icon', 'secondary'))} />
                                      <span className="text-xs">{teacher.phone}</span>
                                    </div>
                                  </div>
                                </td>
                                <td className="px-4 py-3">
                                  <span className={getStatusBadgeClass('purple')}>
                                    {teacher.department}
                                  </span>
                                </td>
                                <td className="px-4 py-3">
                                  <div className="space-y-1">
                                    {teacher.assigned_class && teacher.assigned_class !== 'Not Assigned' ? (
                                      <div className="flex items-center space-x-2">
                                        <span className={combine(
                                          "px-2 py-1 text-xs rounded-full font-medium border",
                                          theme === 'dark' ? 'bg-green-900/30 text-green-300 border-green-800' : 'bg-green-100 text-green-700 border-green-200'
                                        )}>
                                          <FaChalkboardTeacher className="inline mr-1 text-xs" />
                                          {teacher.assigned_class}
                                        </span>
                                        <span className={combine(
                                          "text-xs px-1.5 py-0.5 rounded",
                                          theme === 'dark' ? 'bg-blue-900/30 text-blue-300' : 'bg-blue-100 text-blue-600'
                                        )}>
                                          Class Teacher
                                        </span>
                                      </div>
                                    ) : (
                                      <span className={combine(
                                        "px-2 py-1 text-xs rounded-full font-medium border",
                                        theme === 'dark' ? 'bg-gray-700 text-gray-400 border-gray-600' : 'bg-gray-100 text-gray-600 border-gray-300'
                                      )}>
                                        Not Assigned
                                      </span>
                                    )}
                                    <div className={combine("text-xs flex items-center space-x-1", get('text', 'tertiary'))}>
                                      <FaCalendar className="text-xs" />
                                      <span className="text-xs">{teacher.date_of_birth}</span>
                                    </div>
                                  </div>
                                </td>
                                <td className="px-4 py-3">
                                  <div className="flex space-x-1.5">
                                    <button
                                      onClick={() => viewTeacherProfile(teacher)}
                                      className={combine(
                                        "p-1.5 rounded-xl transition-all duration-200 hover:text-[var(--color-accent-primary)]",
                                        get('icon', 'primary') + " text-sm"
                                      )}
                                      title="View Profile"
                                    >
                                      <FaEye className="text-sm" />
                                    </button>
                                    <button
                                      onClick={() => startEdit(teacher)}
                                      className={combine(
                                        "p-1.5 rounded-xl transition-all duration-200 hover:text-[var(--color-accent-success)]",
                                        get('icon', 'primary') + " text-sm"
                                      )}
                                      title="Edit"
                                    >
                                      <FaEdit className="text-sm" />
                                    </button>
                                    <button
                                      onClick={() => {
                                        setAssignTeacherId(teacher.teacher_id);
                                        setAssignTeacherName(teacher.name);
                                        setShowAssignModal(true);
                                      }}
                                      className={combine(
                                        "p-1.5 rounded-xl transition-all duration-200 hover:text-[var(--color-accent-primary)]",
                                        get('icon', 'primary') + " text-sm"
                                      )}
                                      title="Assign Class"
                                    >
                                      <FaChalkboardTeacher className="text-sm" />
                                    </button>
                                    <button
                                      onClick={() => openManageSubjects(teacher.teacher_id, teacher.name)}
                                      className={combine(
                                        "p-1.5 rounded-xl transition-all duration-200 hover:text-[var(--color-accent-primary)]",
                                        get('icon', 'primary') + " text-sm"
                                      )}
                                      title="Manage Subjects"
                                    >
                                      <FaBook className="text-sm" />
                                    </button>
                                    
                                    <button
                                      onClick={() => setShowDeleteConfirm(teacher.id)}
                                      className={combine(
                                        "p-1.5 rounded-xl transition-all duration-200 hover:text-[var(--color-accent-error)]",
                                        get('icon', 'primary') + " text-sm"
                                      )}
                                      title="Delete"
                                    >
                                      <FaTrash className="text-sm" />
                                    </button>
                                  </div>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>

                        {/* PAGINATION */}
                        {totalPages > 1 && (
                          <div className={combine("px-4 py-3 border-t", get('border', 'primary'))}>
                            <div className="flex flex-col sm:flex-row justify-between items-center gap-3">
                              <p className={combine("text-xs", get('text', 'tertiary'))}>
                                Page {currentPage} of {totalPages}
                              </p>
                              <div className="flex items-center space-x-1.5">
                                <button
                                  onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                                  disabled={currentPage === 1}
                                  className={combine(
                                    "p-1.5 rounded-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed hover:scale-[1.02] active:scale-[0.98] text-sm",
                                    getSecondaryButtonClass()
                                  )}
                                >
                                  <FaChevronLeft className="text-xs" />
                                </button>
                                
                                <div className="flex space-x-1">
                                  {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                                    let pageNum: number;
                                    if (totalPages <= 5) {
                                      pageNum = i + 1;
                                    } else if (currentPage <= 3) {
                                      pageNum = i + 1;
                                    } else if (currentPage >= totalPages - 2) {
                                      pageNum = totalPages - 4 + i;
                                    } else {
                                      pageNum = currentPage - 2 + i;
                                    }
                                    
                                    return (
                                      <button
                                        key={pageNum}
                                        onClick={() => setCurrentPage(pageNum)}
                                        className={combine(
                                          "px-3 py-1.5 rounded-xl transition-all font-medium hover:scale-[1.02] active:scale-[0.98] text-xs",
                                          currentPage === pageNum
                                            ? getPrimaryButtonClass()
                                            : getSecondaryButtonClass()
                                        )}
                                      >
                                        {pageNum}
                                      </button>
                                    );
                                  })}
                                </div>
                                
                                <button
                                  onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                                  disabled={currentPage === totalPages}
                                  className={combine(
                                    "p-1.5 rounded-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed hover:scale-[1.02] active:scale-[0.98] text-sm",
                                    getSecondaryButtonClass()
                                  )}
                                >
                                  <FaChevronRight className="text-xs" />
                                </button>
                              </div>
                            </div>
                          </div>
                        )}
                      </>
                    )}
                  </div>
                </div>
              </>
            )}

            {/* ALLOCATIONS TAB */}
            {activeTab === 'allocations' && (
              <div className={getCardGradientClass()}>
                {loadingAllocations ? (
                  <div className="p-8 text-center">
                    <div className="inline-flex flex-col items-center">
                      <div className={combine(
                        "animate-spin rounded-full h-8 w-8 border-4",
                        theme === 'dark' ? 'border-purple-500 border-t-transparent' : 'border-purple-600 border-t-transparent'
                      )}></div>
                      <p className={combine("mt-3 text-sm font-medium", get('text', 'secondary'))}>Loading allocations...</p>
                    </div>
                  </div>
                ) : teacherAllocations.length === 0 ? (
                  <div className="p-8 text-center">
                    <div className={combine(
                      "inline-block p-3 rounded-full mb-3",
                      theme === 'dark' ? 'bg-purple-900/30' : 'bg-purple-100'
                    )}>
                      <FaClipboardList className={combine(
                        "text-xl",
                        theme === 'dark' ? 'text-purple-400' : 'text-purple-500'
                      )} />
                    </div>
                    <h3 className={combine("text-base font-medium mb-1", get('text', 'primary'))}>No subject allocations found</h3>
                    <p className={combine("text-sm", get('text', 'secondary'))}>Assign subjects to teachers to see allocations here</p>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                      <thead className={getTableHeaderClass()}>
                        <tr>
                          <th className={combine(
                            "px-4 py-3 text-left text-xs font-medium uppercase tracking-wider",
                            get('text', 'tertiary')
                          )}>
                            <div className="flex items-center space-x-2">
                              <FaUserTie className="text-xs" />
                              <span className="text-xs">Teacher</span>
                            </div>
                          </th>
                          <th className={combine(
                            "px-4 py-3 text-left text-xs font-medium uppercase tracking-wider",
                            get('text', 'tertiary')
                          )}>
                            <div className="flex items-center space-x-2">
                              <FaBook className="text-xs" />
                              <span className="text-xs">Subject</span>
                            </div>
                          </th>
                          <th className={combine(
                            "px-4 py-3 text-left text-xs font-medium uppercase tracking-wider",
                            get('text', 'tertiary')
                          )}>
                            <div className="flex items-center space-x-2">
                              <FaSchool className="text-xs" />
                              <span className="text-xs">Class</span>
                            </div>
                          </th>
                          <th className={combine(
                            "px-4 py-3 text-left text-xs font-medium uppercase tracking-wider",
                            get('text', 'tertiary')
                          )}>
                            <div className="flex items-center space-x-2">
                              <FaUsers className="text-xs" />
                              <span className="text-xs">Sections</span>
                            </div>
                          </th>
                          <th className={combine(
                            "px-4 py-3 text-left text-xs font-medium uppercase tracking-wider",
                            get('text', 'tertiary')
                          )}>
                            <div className="flex items-center space-x-2">
                              <FaCog className="text-xs" />
                              <span className="text-xs">Actions</span>
                            </div>
                          </th>
                        </tr>
                      </thead>
                      <tbody className={combine("divide-y", getTableRowClass())}>
                        {teacherAllocations.map((allocation) => (
                          <tr key={`${allocation.teacher_id}-${allocation.subject}-${allocation.class}`} className="hover:bg-[var(--color-bg-hover)]">
                            <td className="px-4 py-3">
                              <div className="flex items-center">
                                <div className={combine(
                                  "h-10 w-10 rounded-full flex items-center justify-center mr-3",
                                  theme === 'dark' ? 'bg-blue-900/30' : 'bg-blue-100'
                                )}>
                                  <FaUserTie className={combine(
                                    "text-sm",
                                    theme === 'dark' ? 'text-blue-400' : 'text-blue-600'
                                  )} />
                                </div>
                                <div>
                                  <div className="font-medium text-sm">{allocation.teacher_name}</div>
                                  <div className={combine("text-xs", get('text', 'tertiary'))}>{allocation.teacher_id}</div>
                                </div>
                              </div>
                            </td>
                            <td className="px-4 py-3">
                              <span className={getStatusBadgeClass('blue')}>
                                {allocation.subject}
                              </span>
                            </td>
                            <td className="px-4 py-3">
                              <span className={getStatusBadgeClass('green')}>
                                Class {allocation.class}
                              </span>
                            </td>
                            <td className="px-4 py-3">
                              <div className="flex flex-wrap gap-1">
                                {allocation.sections.map((section) => (
                                  <span key={section} className={combine(
                                    "px-2 py-1 rounded text-xs",
                                    theme === 'dark'
                                      ? 'bg-gray-700 text-gray-300'
                                      : 'bg-gray-100 text-gray-700'
                                  )}>
                                    {section}
                                  </span>
                                ))}
                              </div>
                            </td>
                            <td className="px-4 py-3">
                              <button
                                onClick={() => {
                                  const teacher = teachers.find(t => t.teacher_id === allocation.teacher_id);
                                  if (teacher) {
                                    openManageSubjects(teacher.teacher_id, teacher.name);
                                  }
                                }}
                                className={combine(
                                  "px-3 py-1 text-sm rounded-lg transition-all hover:scale-[1.02] active:scale-[0.98]",
                                  theme === 'dark'
                                    ? 'bg-purple-900/30 text-purple-300 hover:bg-purple-800/30'
                                    : 'bg-purple-100 text-purple-700 hover:bg-purple-200'
                                )}
                              >
                                Manage
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}
          </>
        )}

        {/* TEACHER PROFILE VIEW */}
        {mode === 'profile' && selectedTeacher && (
          <div className="animate-fade-in max-w-6xl mx-auto">
            <div className={getCardGradientClass()}>
              {/* Profile Header */}
              <div className="bg-gradient-to-r from-purple-500 to-purple-600 p-6 text-white">
                <div className="flex justify-between items-start">
                  <div className="flex items-center gap-4">
                    <div className="h-20 w-20 bg-white/20 rounded-full flex items-center justify-center border-4 border-white/30">
                      <FaUserTie className="text-3xl" />
                    </div>
                    <div>
                      <h1 className="text-2xl font-bold">{selectedTeacher.name}</h1>
                      <p className="text-purple-100">{selectedTeacher.teacher_id} • {selectedTeacher.department}</p>
                      <div className="flex gap-4 mt-2">
                        <span className="bg-white/20 px-3 py-1 rounded-full text-sm">
                          {selectedTeacher.qualification}
                        </span>
                        {selectedTeacher.assigned_class && selectedTeacher.assigned_class !== 'Not Assigned' && (
                          <span className="bg-green-500/20 px-3 py-1 rounded-full text-sm">
                            Class Teacher: {selectedTeacher.assigned_class}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                  <button
                    onClick={() => setMode('list')}
                    className="p-2 hover:bg-white/20 rounded-lg transition-colors"
                  >
                    <FaTimes className="text-xl" />
                  </button>
                </div>
              </div>

              {/* Profile Content */}
              <div className="p-6">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  {/* Personal Information */}
                  <div className="md:col-span-2">
                    <h2 className={combine("text-lg font-semibold mb-4", get('text', 'primary'))}>Personal Information</h2>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className={combine("p-4 rounded-lg", get('bg', 'secondary'))}>
                        <p className={combine("text-sm", get('text', 'tertiary'))}>Email</p>
                        <p className={combine("font-medium text-sm", get('text', 'primary'))}>{selectedTeacher.email}</p>
                      </div>
                      <div className={combine("p-4 rounded-lg", get('bg', 'secondary'))}>
                        <p className={combine("text-sm", get('text', 'tertiary'))}>Phone</p>
                        <p className={combine("font-medium text-sm", get('text', 'primary'))}>{selectedTeacher.phone}</p>
                      </div>
                      <div className={combine("p-4 rounded-lg", get('bg', 'secondary'))}>
                        <p className={combine("text-sm", get('text', 'tertiary'))}>Date of Birth</p>
                        <p className={combine("font-medium text-sm", get('text', 'primary'))}>{selectedTeacher.date_of_birth}</p>
                      </div>
                      <div className={combine("p-4 rounded-lg", get('bg', 'secondary'))}>
                        <p className={combine("text-sm", get('text', 'tertiary'))}>Address</p>
                        <p className={combine("font-medium text-sm", get('text', 'primary'))}>{selectedTeacher.address || 'Not specified'}</p>
                      </div>
                    </div>

                    {/* Additional Details */}
                    {selectedTeacher.extra_details && (
                      <div className="mt-6">
                        <h3 className={combine("text-lg font-semibold mb-4", get('text', 'primary'))}>Additional Details</h3>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                          {selectedTeacher.extra_details.gender && (
                            <div className={combine("p-4 rounded-lg", get('bg', 'secondary'))}>
                              <p className={combine("text-sm", get('text', 'tertiary'))}>Gender</p>
                              <p className={combine("font-medium text-sm", get('text', 'primary'))}>{selectedTeacher.extra_details.gender}</p>
                            </div>
                          )}
                          {selectedTeacher.extra_details.blood_group && (
                            <div className={combine("p-4 rounded-lg", get('bg', 'secondary'))}>
                              <p className={combine("text-sm", get('text', 'tertiary'))}>Blood Group</p>
                              <p className={combine("font-medium text-sm", get('text', 'primary'))}>{selectedTeacher.extra_details.blood_group}</p>
                            </div>
                          )}
                          {selectedTeacher.extra_details.joining_date && (
                            <div className={combine("p-4 rounded-lg", get('bg', 'secondary'))}>
                              <p className={combine("text-sm", get('text', 'tertiary'))}>Joining Date</p>
                              <p className={combine("font-medium text-sm", get('text', 'primary'))}>{selectedTeacher.extra_details.joining_date}</p>
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Quick Actions */}
                  <div>
                    <h2 className={combine("text-lg font-semibold mb-4", get('text', 'primary'))}>Quick Actions</h2>
                    <div className="space-y-3">
                      <button
                        onClick={() => startEdit(selectedTeacher)}
                        className={combine(
                          "w-full p-3 rounded-lg transition-all duration-200 flex items-center justify-center gap-2 hover:scale-[1.02] active:scale-[0.98] text-sm",
                          theme === 'dark'
                            ? 'bg-gradient-to-r from-emerald-600 to-emerald-700 hover:from-emerald-700 hover:to-emerald-800 text-white'
                            : 'bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-600 hover:to-emerald-700 text-white'
                        )}
                      >
                        <FaEdit /> Edit Profile
                      </button>
                      <button
                        onClick={() => {
                          setAssignTeacherId(selectedTeacher.teacher_id);
                          setAssignTeacherName(selectedTeacher.name);
                          setShowAssignModal(true);
                        }}
                        className={combine(
                          "w-full p-3 rounded-lg transition-all duration-200 flex items-center justify-center gap-2 hover:scale-[1.02] active:scale-[0.98] text-sm",
                          theme === 'dark'
                            ? 'bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white'
                            : 'bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white'
                        )}
                      >
                        <FaChalkboardTeacher /> Assign Class
                      </button>
                      <button
                        onClick={() => openManageSubjects(selectedTeacher.teacher_id, selectedTeacher.name)}
                        className={combine(
                          "w-full p-3 rounded-lg transition-all duration-200 flex items-center justify-center gap-2 hover:scale-[1.02] active:scale-[0.98] text-sm",
                          getPrimaryButtonClass()
                        )}
                      >
                        <FaBook /> Manage Subjects
                      </button>
                      <button
                        onClick={() => resetTeacherPassword(selectedTeacher.teacher_id, selectedTeacher.name)}
                        className={combine(
                          "w-full p-3 rounded-lg transition-all duration-200 flex items-center justify-center gap-2 hover:scale-[1.02] active:scale-[0.98] text-sm",
                          theme === 'dark'
                            ? 'bg-gradient-to-r from-amber-600 to-amber-700 hover:from-amber-700 hover:to-amber-800 text-white'
                            : 'bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-white'
                        )}
                      >
                        <FaKey /> Reset Password
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ADD/EDIT FORM */}
        {(mode === 'add' || mode === 'edit') && (
          <div className="animate-fade-in max-w-4xl mx-auto">
            <div className={getCardGradientClass()}>
              {/* Form Header */}
              <div className="mb-6">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center space-x-4">
                    <div className={combine(
                      "p-3 rounded-xl",
                      theme === 'dark' ? 'bg-purple-900/30' : 'bg-purple-100'
                    )}>
                      <FaUserPlus className={combine(
                        "text-lg",
                        theme === 'dark' ? 'text-purple-400' : 'text-purple-600'
                      )} />
                    </div>
                    <div>
                      <h2 className={combine("text-lg font-bold", get('text', 'primary'))}>
                        {mode === 'edit' ? 'Edit Teacher' : 'Add New Teacher'}
                      </h2>
                      <p className={combine("text-sm mt-0.5", get('text', 'secondary'))}>
                        {mode === 'edit' ? 'Update teacher information' : 'Fill in the details to register a new teacher'}
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() => setMode('list')}
                    className={combine(
                      "p-2 rounded-xl transition-all hover:bg-[var(--color-bg-hover)]",
                      get('icon', 'secondary') + " text-sm"
                    )}
                  >
                    <FaTimes className="text-sm" />
                  </button>
                </div>
                <div className={combine(
                  "p-3 rounded-xl text-xs",
                  theme === 'dark' ? 'bg-purple-900/20' : 'bg-purple-50'
                )}>
                  <p className={combine(
                    "flex items-center space-x-2",
                    theme === 'dark' ? 'text-purple-300' : 'text-purple-700'
                  )}>
                    <FaInfoCircle className="text-xs" />
                    <span className="text-xs">Fields marked with * are required</span>
                  </p>
                </div>
              </div>

              {/* Form Content */}
              <form onSubmit={handleSubmit} className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Basic Information */}
                  <div className="md:col-span-2">
                    <h3 className={combine("text-lg font-semibold mb-4", get('text', 'primary'))}>Basic Information</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className={combine("block text-sm font-medium mb-2", get('text', 'primary'))}>
                          Teacher ID *
                        </label>
                        <input
                          type="text"
                          name="teacher_id"
                          value={formData.teacher_id}
                          onChange={handleChange}
                          required
                          disabled={mode === 'edit'}
                          className={combine(getInputClass(), "disabled:opacity-50")}
                          placeholder="TCH001"
                        />
                      </div>
                      <div>
                        <label className={combine("block text-sm font-medium mb-2", get('text', 'primary'))}>
                          Teacher Name *
                        </label>
                        <input
                          type="text"
                          name="name"
                          value={formData.name}
                          onChange={handleChange}
                          required
                          className={getInputClass()}
                          placeholder="John Smith"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Contact Information */}
                  <div className="md:col-span-2">
                    <h3 className={combine("text-lg font-semibold mb-4", get('text', 'primary'))}>Contact Information</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className={combine("block text-sm font-medium mb-2", get('text', 'primary'))}>
                          Email Address *
                        </label>
                        <input
                          type="email"
                          name="email"
                          value={formData.email}
                          onChange={handleChange}
                          required
                          className={getInputClass()}
                          placeholder="teacher@school.edu"
                        />
                      </div>
                      <div>
                        <label className={combine("block text-sm font-medium mb-2", get('text', 'primary'))}>
                          Phone Number *
                        </label>
                        <input
                          type="tel"
                          name="phone"
                          value={formData.phone}
                          onChange={handleChange}
                          required
                          className={getInputClass()}
                          placeholder="+91 9876543210"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Professional Information */}
                  <div className="md:col-span-2">
                    <h3 className={combine("text-lg font-semibold mb-4", get('text', 'primary'))}>Professional Information</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className={combine("block text-sm font-medium mb-2", get('text', 'primary'))}>
                          Qualification *
                        </label>
                        <input
                          type="text"
                          name="qualification"
                          value={formData.qualification}
                          onChange={handleChange}
                          required
                          className={getInputClass()}
                          placeholder="M.Sc, B.Ed"
                        />
                      </div>
                      <div>
                        <label className={combine("block text-sm font-medium mb-2", get('text', 'primary'))}>
                          Department *
                        </label>
                        <input
                          type="text"
                          name="department"
                          value={formData.department}
                          onChange={handleChange}
                          required
                          className={getInputClass()}
                          placeholder="Mathematics"
                        />
                      </div>
                      <div>
                        <label className={combine("block text-sm font-medium mb-2", get('text', 'primary'))}>
                          Joining Date
                        </label>
                        <input
                          type="date"
                          name="joining_date"
                          value={formData.joining_date}
                          onChange={handleChange}
                          className={getInputClass()}
                        />
                      </div>
                    </div>
                  </div>

                  {/* Additional Details */}
                  <div className="md:col-span-2">
                    <h3 className={combine("text-lg font-semibold mb-4", get('text', 'primary'))}>Additional Details</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className={combine("block text-sm font-medium mb-2", get('text', 'primary'))}>
                          Date of Birth *
                        </label>
                        <input
                          type="date"
                          name="date_of_birth"
                          value={formData.date_of_birth}
                          onChange={handleChange}
                          required
                          className={getInputClass()}
                        />
                      </div>
                      <div>
                        <label className={combine("block text-sm font-medium mb-2", get('text', 'primary'))}>
                          Gender
                        </label>
                        <select
                          name="gender"
                          value={formData.gender}
                          onChange={handleChange}
                          className={getInputClass()}
                        >
                          <option value="">Select Gender</option>
                          <option value="Male">Male</option>
                          <option value="Female">Female</option>
                          <option value="Other">Other</option>
                        </select>
                      </div>
                      <div>
                        <label className={combine("block text-sm font-medium mb-2", get('text', 'primary'))}>
                          Blood Group
                        </label>
                        <select
                          name="blood_group"
                          value={formData.blood_group}
                          onChange={handleChange}
                          className={getInputClass()}
                        >
                          <option value="">Select Blood Group</option>
                          <option value="A+">A+</option>
                          <option value="A-">A-</option>
                          <option value="B+">B+</option>
                          <option value="B-">B-</option>
                          <option value="O+">O+</option>
                          <option value="O-">O-</option>
                          <option value="AB+">AB+</option>
                          <option value="AB-">AB-</option>
                        </select>
                      </div>
                      <div>
                        <label className={combine("block text-sm font-medium mb-2", get('text', 'primary'))}>
                          Emergency Contact
                        </label>
                        <input
                          type="tel"
                          name="emergency_contact"
                          value={formData.emergency_contact}
                          onChange={handleChange}
                          className={getInputClass()}
                          placeholder="Emergency contact number"
                        />
                      </div>
                      <div className="md:col-span-2">
                        <label className={combine("block text-sm font-medium mb-2", get('text', 'primary'))}>
                          Address
                        </label>
                        <textarea
                          name="address"
                          value={formData.address}
                          onChange={handleChange}
                          rows={3}
                          className={combine(getInputClass(), "resize-none")}
                          placeholder="Full address"
                        />
                      </div>
                    </div>
                  </div>
                </div>

                {/* Form Actions */}
                <div className={combine("flex space-x-3 pt-6 border-t", get('border', 'primary'))}>
                  <button
                    type="button"
                    onClick={() => setMode('list')}
                    className={combine(getSecondaryButtonClass(), "text-sm")}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={loading}
                    className={combine(
                      getPrimaryButtonClass(),
                      "flex items-center space-x-2 text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                    )}
                  >
                    {loading ? (
                      <>
                        <div className={combine(
                          "animate-spin rounded-full h-4 w-4 border-b-2",
                          theme === 'dark' ? 'border-white' : 'border-white'
                        )}></div>
                        <span className="text-sm">{mode === 'edit' ? 'Updating...' : 'Saving...'}</span>
                      </>
                    ) : (
                      <>
                        <FaSave className="text-sm" />
                        <span className="text-sm">{mode === 'edit' ? 'Update Teacher' : 'Save Teacher'}</span>
                      </>
                    )}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* MODALS */}
        {/* Assign Class Teacher Modal */}
        {showAssignModal && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50 animate-fade-in backdrop-blur-sm">
            <div className={combine(
              getCardGradientClass('emerald'),
              "max-w-md w-full shadow-2xl"
            )}>
              <div className="flex justify-between items-center mb-4">
                <h2 className={combine("text-lg font-bold", get('text', 'primary'))}>Assign Class Teacher</h2>
                <button onClick={() => setShowAssignModal(false)} className={combine(
                  "p-2 rounded-xl transition-all hover:bg-[var(--color-bg-hover)]",
                  get('icon', 'secondary') + " text-sm"
                )}>
                  <FaTimes className="text-sm" />
                </button>
              </div>
              <div className={combine(
                "mb-4 p-3 rounded-lg text-xs",
                theme === 'dark' ? 'bg-emerald-900/30' : 'bg-emerald-50'
              )}>
                <p className={combine(
                  "flex items-center space-x-2",
                  theme === 'dark' ? 'text-emerald-300' : 'text-emerald-800'
                )}>
                  <FaInfoCircle className="text-xs" />
                  <span className="text-xs">Assigning teacher: <span className="font-bold">{assignTeacherName}</span></span>
                </p>
              </div>
              <div className="space-y-4">
                <div>
                  <label className={combine("block text-sm font-medium mb-2", get('text', 'primary'))}>Class *</label>
                  <input
                    placeholder="Class (e.g., 10)"
                    value={assignData.class_name}
                    onChange={e => setAssignData({ ...assignData, class_name: e.target.value })}
                    className={combine(getInputClass(), "focus:ring-emerald-500 focus:border-emerald-500")}
                    required
                  />
                </div>
                <div>
                  <label className={combine("block text-sm font-medium mb-2", get('text', 'primary'))}>Section *</label>
                  <input
                    placeholder="Section (e.g., A)"
                    value={assignData.section}
                    onChange={e => setAssignData({ ...assignData, section: e.target.value })}
                    className={combine(getInputClass(), "focus:ring-emerald-500 focus:border-emerald-500")}
                    required
                  />
                </div>
              </div>
              <div className="flex gap-3 mt-6">
                <button onClick={() => setShowAssignModal(false)} className={combine(getSecondaryButtonClass(), "flex-1 text-sm")}>
                  Cancel
                </button>
                <button onClick={assignClassTeacher} className={combine(
                  "flex-1 px-4 py-3.5 rounded-xl transition-all duration-200 font-medium flex items-center justify-center gap-2 text-sm",
                  theme === 'dark'
                    ? 'bg-gradient-to-r from-emerald-600 to-emerald-700 hover:from-emerald-700 hover:to-emerald-800 text-white'
                    : 'bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-600 hover:to-emerald-700 text-white',
                  "hover:scale-[1.02] active:scale-[0.98]"
                )}>
                  <FaCheck className="text-sm" /> Assign Teacher
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Assign Subject Modal */}
        {showAssignSubjectModal && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50 animate-fade-in backdrop-blur-sm">
            <div className={combine(
              getCardGradientClass('purple'),
              "max-w-md w-full shadow-2xl"
            )}>
              <div className="flex justify-between items-center mb-4">
                <h2 className={combine("text-lg font-bold", get('text', 'primary'))}>Assign Subject</h2>
                <button onClick={() => setShowAssignSubjectModal(false)} className={combine(
                  "p-2 rounded-xl transition-all hover:bg-[var(--color-bg-hover)]",
                  get('icon', 'secondary') + " text-sm"
                )}>
                  <FaTimes className="text-sm" />
                </button>
              </div>
              <div className={combine(
                "mb-4 p-3 rounded-lg text-xs",
                theme === 'dark' ? 'bg-purple-900/30' : 'bg-purple-50'
              )}>
                <p className={combine(
                  "flex items-center space-x-2",
                  theme === 'dark' ? 'text-purple-300' : 'text-purple-800'
                )}>
                  <FaInfoCircle className="text-xs" />
                  <span className="text-xs">Assigning teacher: <span className="font-bold">{subjectAssignTeacherName}</span></span>
                </p>
              </div>
              <div className="space-y-4">
                <div>
                  <label className={combine("block text-sm font-medium mb-2", get('text', 'primary'))}>
                    Subject Name *
                  </label>
                  <input
                    value={subjectAssignData.subject_name}
                    onChange={e => setSubjectAssignData({ ...subjectAssignData, subject_name: e.target.value })}
                    placeholder="Mathematics"
                    className={getInputClass()}
                  />
                </div>
                <div>
                  <label className={combine("block text-sm font-medium mb-2", get('text', 'primary'))}>
                    Classes *
                  </label>
                  <input
                    value={subjectAssignData.classes}
                    onChange={e => setSubjectAssignData({ ...subjectAssignData, classes: e.target.value })}
                    placeholder="10,11,12"
                    className={getInputClass()}
                  />
                  <p className={combine("text-xs mt-1", get('text', 'tertiary'))}>
                    Separate classes with commas
                  </p>
                </div>
                <div>
                  <label className={combine("block text-sm font-medium mb-2", get('text', 'primary'))}>
                    Sections (Optional)
                  </label>
                  <input
                    value={subjectAssignData.sections || ''}
                    onChange={e => setSubjectAssignData({ ...subjectAssignData, sections: e.target.value })}
                    placeholder="A,B,C"
                    className={getInputClass()}
                  />
                  <p className={combine("text-xs mt-1", get('text', 'tertiary'))}>
                    Specific sections (comma separated). Leave empty for all sections.
                  </p>
                </div>
              </div>
              <div className="flex gap-3 mt-6">
                <button onClick={() => setShowAssignSubjectModal(false)} className={combine(getSecondaryButtonClass(), "flex-1 text-sm")}>
                  Cancel
                </button>
                <button onClick={assignTeacherToSubject} className={combine(
                  getPrimaryButtonClass(),
                  "flex-1 flex items-center justify-center gap-2 text-sm"
                )}>
                  <FaCheck className="text-sm" /> Assign Subject
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Manage Subjects Modal */}
        {showManageSubjectsModal && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50 animate-fade-in backdrop-blur-sm">
            <div className={combine(
              getCardGradientClass(),
              "max-w-lg w-full shadow-2xl"
            )}>
              <div className="flex justify-between items-center mb-4">
                <div>
                  <h2 className={combine("text-lg font-bold", get('text', 'primary'))}>Manage Subjects</h2>
                  <p className={combine("text-sm", get('text', 'secondary'))}>{manageSubjectsTeacherName}</p>
                </div>
                <button onClick={() => setShowManageSubjectsModal(false)} className={combine(
                  "p-2 rounded-xl transition-all hover:bg-[var(--color-bg-hover)]",
                  get('icon', 'secondary') + " text-sm"
                )}>
                  <FaTimes className="text-sm" />
                </button>
              </div>

              <div className="mb-6">
                <h3 className={combine("text-lg font-semibold mb-3", get('text', 'primary'))}>Current Subjects</h3>
                <div className="space-y-3">
                  {teacherSubjects.length === 0 ? (
                    <p className={combine("text-center py-4 text-sm", get('text', 'tertiary'))}>No subjects assigned</p>
                  ) : (
                    teacherSubjects.map((subject, index) => (
                      <div key={index} className={combine("p-3 rounded-lg", get('bg', 'secondary'))}>
                        <div className="flex justify-between items-start mb-2">
                          <div>
                            <span className={combine("font-medium text-sm", get('text', 'primary'))}>
                              {subject.subject_name}
                            </span>
                            {subject.subject_code && (
                              <span className={combine("text-xs ml-2", get('text', 'tertiary'))}>
                                ({subject.subject_code})
                              </span>
                            )}
                          </div>
                          <button
                            onClick={() => removeTeacherSubject(subject.subject_name)}
                            className={combine(
                              "p-1 hover:text-[var(--color-accent-error)]",
                              get('icon', 'primary') + " text-sm"
                            )}
                            title="Remove Subject"
                          >
                            <FaTrash className="text-sm" />
                          </button>
                        </div>
                        <div className="space-y-1">
                          <div className={combine("text-xs", get('text', 'tertiary'))}>
                            Classes: {subject.classes.join(', ')}
                          </div>
                          {subject.sections && subject.sections.length > 0 && (
                            <div className={combine("text-xs", get('text', 'tertiary'))}>
                              Sections: {subject.sections.join(', ')}
                            </div>
                          )}
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>

              <div className={combine("border-t pt-4", get('border', 'primary'))}>
                <h3 className={combine("text-lg font-semibold mb-3", get('text', 'primary'))}>Add New Subject</h3>
                <div className="space-y-4">
                  <div>
                    <label className={combine("block text-sm font-medium mb-2", get('text', 'primary'))}>Subject Name</label>
                    <input
                      value={newSubject.subject_name}
                      onChange={e => setNewSubject({ ...newSubject, subject_name: e.target.value })}
                      placeholder="Subject name"
                      className={getInputClass()}
                    />
                  </div>
                  <div>
                    <label className={combine("block text-sm font-medium mb-2", get('text', 'primary'))}>Classes</label>
                    <input
                      value={newSubject.classes}
                      onChange={e => setNewSubject({ ...newSubject, classes: e.target.value })}
                      placeholder="10,11,12"
                      className={getInputClass()}
                    />
                    <p className={combine("text-xs mt-1", get('text', 'tertiary'))}>
                      Separate classes with commas
                    </p>
                  </div>
                  <div>
                    <label className={combine("block text-sm font-medium mb-2", get('text', 'primary'))}>Sections (Optional)</label>
                    <input
                      value={newSubject.sections}
                      onChange={e => setNewSubject({ ...newSubject, sections: e.target.value })}
                      placeholder="A,B,C"
                      className={getInputClass()}
                    />
                    <p className={combine("text-xs mt-1", get('text', 'tertiary'))}>
                      Separate sections with commas
                    </p>
                  </div>
                  <button
                    onClick={addTeacherSubject}
                    className={combine(
                      "w-full px-4 py-3.5 rounded-xl transition-all duration-200 font-medium flex items-center justify-center gap-2 text-sm",
                      theme === 'dark'
                        ? 'bg-gradient-to-r from-emerald-600 to-emerald-700 hover:from-emerald-700 hover:to-emerald-800 text-white'
                        : 'bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-600 hover:to-emerald-700 text-white',
                      "hover:scale-[1.02] active:scale-[0.98]"
                    )}
                  >
                    <FaPlus className="text-sm" /> Add Subject
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Delete Confirmation Modal */}
        {showDeleteConfirm && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50 animate-fade-in backdrop-blur-sm">
            <div className={combine(
              getCardGradientClass('red'),
              "max-w-md w-full shadow-2xl"
            )}>
              <div className="text-center">
                <div className={combine(
                  "mx-auto flex items-center justify-center h-12 w-12 rounded-full mb-3",
                  theme === 'dark' ? 'bg-red-900/30' : 'bg-red-100'
                )}>
                  <FaTrash className={combine(
                    "h-5 w-5",
                    theme === 'dark' ? 'text-red-400' : 'text-red-600'
                  )} />
                </div>
                <h3 className={combine("text-lg font-bold mb-1.5", get('text', 'primary'))}>Delete Teacher</h3>
                <p className={combine("text-sm mb-4", get('text', 'secondary'))}>
                  Are you sure you want to delete this teacher? This action cannot be undone.
                </p>
                <div className="flex space-x-2">
                  <button
                    onClick={() => setShowDeleteConfirm(null)}
                    className={combine(getSecondaryButtonClass(), "text-sm flex-1")}
                  >
                    Cancel
                  </button>
                  <button
                    onClick={() => deleteTeacher(showDeleteConfirm)}
                    className={combine(
                      getPrimaryButtonClass(),
                      "text-sm flex-1",
                      theme === 'dark'
                        ? 'bg-gradient-to-r from-red-600 to-red-700 hover:from-red-700 hover:to-red-800'
                        : 'bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700'
                    )}
                  >
                    Delete
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};