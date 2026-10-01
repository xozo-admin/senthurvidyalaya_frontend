'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  FaCalendarAlt, FaPlus, FaEdit, FaTrash, FaFileUpload, 
  FaCheckCircle, FaTimesCircle, FaHourglassHalf, FaDownload,
  FaFilter, FaCalendarDay, FaCalendarWeek, FaCalendarCheck,
  FaExclamationTriangle, FaSpinner, FaArrowLeft, FaArrowRight,
  FaChevronDown, FaChevronLeft, FaChevronRight, FaChevronUp, FaPaperclip, FaClock, FaHistory,
  FaChartBar, FaUserClock, FaFileMedical, FaBriefcaseMedical,
  FaEye, FaTimes, FaCalendarPlus, FaUserGraduate, FaUserTie,
  FaUsers, FaUserFriends, FaUserCheck, FaUserTimes, FaCommentAlt,
  FaChalkboardTeacher, FaRegCalendarCheck, FaSchool, FaSearch, FaSortDown, FaSortUp
} from 'react-icons/fa';
import { teacherApi } from '@/lib/api';
import { toastError, toastSuccess } from '@/lib/toast';
import { useTheme } from '@/contexts/ThemeContext';
import { useThemeClasses } from '@/hooks/useThemeClasses';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_MEDIA_BASE_URL || 'https://senthurvidyalaya-backend.onrender.com';

type LeaveManagementMode = 'own' | 'student';

// API Service Functions
const leaveApiService = {
  async fetchWithAuth(endpoint: string, options: any = {}) {
    const response = await teacherApi.request(endpoint, options);
    return response.data;
  },

  // GET - View own leave history
  async getLeaveHistory(filters?: { month?: number; year?: number; status?: string }) {
    const response = await teacherApi.leaves.myLeaves(filters as Record<string, any>);
    return response.data;
  },

  // POST - Apply for leave
  async applyForLeave(formData: FormData) {
    const response = await teacherApi.leaves.apply(formData);
    return response.data;
  },

  // PUT - Edit leave
  async editLeave(formData: FormData) {
    const response = await teacherApi.leaves.edit(formData);
    return response.data;
  },

  // DELETE - Delete leave
  async deleteLeave(formData: any) {
    const response = await teacherApi.leaves.delete(formData);
    return response.data;
  },

  // GET - View student leave requests (for class teachers)
  async getStudentLeaves(filters?: { status?: string; month?: number; year?: number }) {
    const response = await teacherApi.leaves.studentLeaves(filters as Record<string, any>);
    return response.data;
  },

  // POST - Approve/Reject student leave
  async approveRejectStudentLeave(data: { leave_id: number; action: 'Approved' | 'Rejected'; comment?: string }) {
    const response = await teacherApi.leaves.actOnStudentLeave(data);
    return response.data;
  }
};

const extractApiError = (err: any, fallback: string) => {
  const responseData = err?.response?.data;
  if (typeof responseData?.error === 'string') return responseData.error;
  if (typeof responseData?.message === 'string') return responseData.message;
  if (typeof responseData?.detail === 'string') return responseData.detail;
  if (responseData && typeof responseData === 'object') {
    const values = Object.values(responseData).flat().filter(Boolean);
    if (values.length) return values.map((value) => String(value)).join(', ');
  }
  if (typeof err?.message === 'string' && err.message.trim()) return err.message;
  return fallback;
};

const extractApiMessage = (payload: any, fallback = '') => {
  if (typeof payload?.message === 'string' && payload.message.trim()) return payload.message;
  if (typeof payload?.detail === 'string' && payload.detail.trim()) return payload.detail;
  if (typeof payload?.error === 'string' && payload.error.trim()) return payload.error;
  return fallback;
};

// Interface Definitions
interface LeaveRequest {
  id: number;
  user_type: string;
  role: string;
  requester_name: string;
  requester_id: string;
  academic_year: number | null;
  academic_year_name: string | null;
  start_date: string;
  end_date: string;
  reason: string;
  proof_file: string | null;
  status: 'Pending' | 'Approved' | 'Rejected';
  admin_comment: string;
  approved_by_name: string;
  created_at: string;
}

interface LeaveStats {
  total: number;
  pending: number;
  approved: number;
  rejected: number;
  thisMonth: number;
}

interface StudentLeaveStats extends LeaveStats {
  totalStudents: number;
  pendingStudents: number;
}

type OwnSortKey = 'start_date' | 'duration' | 'status' | 'created_at';

export default function LeaveManagement({ mode }: { mode: LeaveManagementMode }) {
  const activeTab = mode;
  const { theme } = useTheme();
  const { get, combine } = useThemeClasses();

  const getBgClass = () => combine(get('bg', 'primary'), 'min-h-screen transition-colors duration-200');

  const getCardGradientClass = (color: 'blue' | 'emerald' | 'amber' | 'red' = 'blue') => {
    const base = combine('rounded-xl sm:rounded-2xl p-4 sm:p-6 border shadow-lg transition-all duration-300', get('border', 'primary'));
    if (color === 'blue') return combine(base, 'bg-gradient-to-br', theme === 'dark' ? 'from-gray-800 to-blue-900/10' : 'from-white to-blue-50');
    if (color === 'emerald') return combine(base, 'bg-gradient-to-br', theme === 'dark' ? 'from-gray-800 to-emerald-900/10' : 'from-white to-emerald-50');
    if (color === 'amber') return combine(base, 'bg-gradient-to-br', theme === 'dark' ? 'from-gray-800 to-amber-900/10' : 'from-white to-amber-50');
    return combine(base, 'bg-gradient-to-br', theme === 'dark' ? 'from-gray-800 to-red-900/10' : 'from-white to-red-50');
  };

  const getInputClass = (accent: 'blue' | 'emerald' = 'blue') => combine(
    'w-full px-3 sm:px-4 py-2.5 sm:py-3 rounded-lg sm:rounded-xl border outline-none transition-all text-xs sm:text-sm',
    accent === 'emerald' ? 'focus:ring-2 focus:ring-emerald-500' : 'focus:ring-2 focus:ring-blue-500',
    theme === 'dark'
      ? 'bg-gray-900/70 border-gray-600 text-gray-100 hover:border-gray-500'
      : 'bg-white border-gray-300 text-gray-900 hover:border-gray-400'
  );

  const getPrimaryButtonClass = (accent: 'blue' | 'emerald' = 'blue') => combine(
    'px-4 sm:px-6 py-2.5 sm:py-3 rounded-lg sm:rounded-xl transition-all duration-200 font-medium text-white text-xs sm:text-sm',
    'shadow-lg hover:shadow-xl hover:scale-[1.02] active:scale-[0.98] flex items-center justify-center gap-2',
    accent === 'emerald'
      ? (theme === 'dark'
        ? 'bg-gradient-to-r from-emerald-600 to-emerald-700 hover:from-emerald-700 hover:to-emerald-800'
        : 'bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-600 hover:to-emerald-700')
      : (theme === 'dark'
        ? 'bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800'
        : 'bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700')
  );

  const getDangerButtonClass = () => combine(
    'px-4 sm:px-6 py-2.5 sm:py-3 rounded-lg sm:rounded-xl transition-all duration-200 font-medium text-white text-xs sm:text-sm',
    'shadow-lg hover:shadow-xl hover:scale-[1.02] active:scale-[0.98] flex items-center justify-center gap-2',
    theme === 'dark'
      ? 'bg-gradient-to-r from-red-600 to-red-700 hover:from-red-700 hover:to-red-800'
      : 'bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700'
  );

  const getSecondaryButtonClass = () => combine(
    'px-3 sm:px-4 py-2 sm:py-3 rounded-lg sm:rounded-xl transition-all duration-200 font-medium text-xs sm:text-sm border',
    get('border', 'secondary'),
    get('bg', 'card'),
    get('text', 'secondary'),
    'hover:bg-[var(--color-bg-hover)] hover:shadow-md'
  );
  
  // Leave data states
  const [leaveRequests, setLeaveRequests] = useState<LeaveRequest[]>([]);
  const [studentLeaveRequests, setStudentLeaveRequests] = useState<LeaveRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [studentLoading, setStudentLoading] = useState(false);
  const [error, setError] = useState('');
  const [isClassTeacher, setIsClassTeacher] = useState<boolean | null>(null);
  
  // Stats states
  const [ownStats, setOwnStats] = useState<LeaveStats>({
    total: 0,
    pending: 0,
    approved: 0,
    rejected: 0,
    thisMonth: 0
  });
  
  const [studentStats, setStudentStats] = useState<StudentLeaveStats>({
    total: 0,
    pending: 0,
    approved: 0,
    rejected: 0,
    thisMonth: 0,
    totalStudents: 0,
    pendingStudents: 0
  });
  
  // Filter states for own leaves
  const [ownStatusFilter, setOwnStatusFilter] = useState<string>('all');
  const [monthFilter, setMonthFilter] = useState<number | null>(null);
  const [yearFilter, setYearFilter] = useState<number | null>(null);
  const [ownSearchTerm, setOwnSearchTerm] = useState('');
  const [ownSortConfig, setOwnSortConfig] = useState<{ key: OwnSortKey; direction: 'asc' | 'desc' }>({
    key: 'created_at',
    direction: 'desc',
  });
  
  // Filter states for student leaves
  const [studentStatusFilter, setStudentStatusFilter] = useState<string>('Pending');
  const [studentMonthFilter, setStudentMonthFilter] = useState<number | null>(null);
  const [studentYearFilter, setStudentYearFilter] = useState<number | null>(null);
  const [studentAppliedFilters, setStudentAppliedFilters] = useState<{ status: string; month: number | null; year: number | null }>({
    status: 'Pending',
    month: null,
    year: null,
  });
  
  // Modal states
  const [showApplyModal, setShowApplyModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [showApproveRejectModal, setShowApproveRejectModal] = useState(false);
  
  // Form states
  const [selectedLeave, setSelectedLeave] = useState<LeaveRequest | null>(null);
  const [selectedStudentLeave, setSelectedStudentLeave] = useState<LeaveRequest | null>(null);
  const [formData, setFormData] = useState({
    leave_id: '',
    start_date: '',
    end_date: '',
    reason: '',
  });
  const [proofFile, setProofFile] = useState<File | null>(null);
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);
  
  // Approve/Reject form state
  const [approveRejectData, setApproveRejectData] = useState({
    action: 'Approved' as 'Approved' | 'Rejected',
    comment: ''
  });
  
  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [studentCurrentPage, setStudentCurrentPage] = useState(1);
  const itemsPerPage = 8;
  
  // Load relevant leave data on mount
  useEffect(() => {
    if (mode === 'own') {
      loadOwnLeaveData();
      return;
    }
    loadStudentLeaveData();
  }, []);
  
  // Load own leave data with optional filters
  const loadOwnLeaveData = async () => {
    try {
      setLoading(true);
      setError('');
      
      const filters: any = {};
      if (monthFilter) filters.month = monthFilter;
      if (yearFilter) filters.year = yearFilter;
      if (ownStatusFilter !== 'all') filters.status = ownStatusFilter;
      
      const response = await leaveApiService.getLeaveHistory(filters);
      const data = Array.isArray(response?.data) ? response.data : [];
      setLeaveRequests(data);
      calculateOwnStats(data);
      
    } catch (err: any) {
      const message = extractApiError(err, 'Failed to load leave requests');
      setError(message);
      toastError(message);
    } finally {
      setLoading(false);
    }
  };
  
  // Load student leave data
  const loadStudentLeaveData = async (override?: { status: string; month: number | null; year: number | null }) => {
    try {
      setStudentLoading(true);
      setError('');
      
      const effectiveFilters = override ?? (mode === 'student'
        ? studentAppliedFilters
        : { status: studentStatusFilter, month: studentMonthFilter, year: studentYearFilter });

      const filters: any = {};
      if (effectiveFilters.status !== 'all') filters.status = effectiveFilters.status;
      if (effectiveFilters.month) filters.month = effectiveFilters.month;
      if (effectiveFilters.year) filters.year = effectiveFilters.year;
      
      const response = await leaveApiService.getStudentLeaves(filters);
      const message = extractApiMessage(response, '');
      if (message.toLowerCase().includes('not a class teacher')) {
        setStudentLeaveRequests([]);
        setIsClassTeacher(false);
        setStudentStats({
          total: 0,
          pending: 0,
          approved: 0,
          rejected: 0,
          thisMonth: 0,
          totalStudents: 0,
          pendingStudents: 0
        });
        return;
      }

      const data = Array.isArray(response?.data) ? response.data : [];
      setStudentLeaveRequests(data);
      setIsClassTeacher(true);
      calculateStudentStats(data);
      
    } catch (err: any) {
      const message = extractApiError(err, 'Failed to load student leave requests');
      setError(message);
      toastError(message);
      if (message.toLowerCase().includes('not a class teacher') || err?.response?.status === 403) {
        setIsClassTeacher(false);
      }
    } finally {
      setStudentLoading(false);
    }
  };
  
  // Calculate statistics for own leaves
  const calculateOwnStats = (requests: LeaveRequest[]) => {
    const now = new Date();
    const currentMonth = now.getMonth() + 1;
    const currentYear = now.getFullYear();
    
    const stats: LeaveStats = {
      total: requests.length,
      pending: requests.filter(r => r.status === 'Pending').length,
      approved: requests.filter(r => r.status === 'Approved').length,
      rejected: requests.filter(r => r.status === 'Rejected').length,
      thisMonth: requests.filter(r => {
        const date = new Date(r.start_date);
        return date.getMonth() + 1 === currentMonth && 
               date.getFullYear() === currentYear;
      }).length
    };
    
    setOwnStats(stats);
  };
  
  // Calculate statistics for student leaves
  const calculateStudentStats = (requests: LeaveRequest[]) => {
    const now = new Date();
    const currentMonth = now.getMonth() + 1;
    const currentYear = now.getFullYear();
    
    // Get unique student IDs
    const uniqueStudentIds = new Set(requests.map(r => r.requester_id));
    const pendingStudentIds = new Set(
      requests.filter(r => r.status === 'Pending').map(r => r.requester_id)
    );
    
    const stats: StudentLeaveStats = {
      total: requests.length,
      pending: requests.filter(r => r.status === 'Pending').length,
      approved: requests.filter(r => r.status === 'Approved').length,
      rejected: requests.filter(r => r.status === 'Rejected').length,
      thisMonth: requests.filter(r => {
        const date = new Date(r.start_date);
        return date.getMonth() + 1 === currentMonth && 
               date.getFullYear() === currentYear;
      }).length,
      totalStudents: uniqueStudentIds.size,
      pendingStudents: pendingStudentIds.size
    };
    
    setStudentStats(stats);
  };
  
  // Handle apply for leave
  const handleApplyLeave = async () => {
    // Validate form
    const errors: Record<string, string> = {};
    
    if (!formData.start_date) errors.start_date = 'Start date is required';
    if (!formData.end_date) errors.end_date = 'End date is required';
    if (!formData.reason.trim()) errors.reason = 'Reason is required';
    
    const startDate = new Date(formData.start_date);
    const endDate = new Date(formData.end_date);
    
    if (startDate > endDate) {
      errors.end_date = 'End date must be after start date';
    }
    
    if (Object.keys(errors).length > 0) {
      setFormErrors(errors);
      return;
    }
    
    try {
      setSubmitting(true);
      const formDataObj = new FormData();
      formDataObj.append('start_date', formData.start_date);
      formDataObj.append('end_date', formData.end_date);
      formDataObj.append('reason', formData.reason);
      if (proofFile) {
        formDataObj.append('proof_file', proofFile);
      }
      
      const payload = await leaveApiService.applyForLeave(formDataObj);
      
      toastSuccess(extractApiMessage(payload, 'Leave request submitted successfully!'));
      setShowApplyModal(false);
      resetForm();
      loadOwnLeaveData();
      
    } catch (err: any) {
      toastError(extractApiError(err, 'Failed to submit leave request'));
    } finally {
      setSubmitting(false);
    }
  };
  
  // Handle edit leave
  const handleEditLeave = async () => {
    if (!selectedLeave) return;
    
    try {
      setSubmitting(true);
      const formDataObj = new FormData();
      formDataObj.append('leave_id', selectedLeave.id.toString());
      
      if (formData.start_date) formDataObj.append('start_date', formData.start_date);
      if (formData.end_date) formDataObj.append('end_date', formData.end_date);
      if (formData.reason) formDataObj.append('reason', formData.reason);
      if (proofFile) {
        formDataObj.append('proof_file', proofFile);
      }
      
      const payload = await leaveApiService.editLeave(formDataObj);
      
      toastSuccess(extractApiMessage(payload, 'Leave request updated successfully!'));
      setShowEditModal(false);
      resetForm();
      loadOwnLeaveData();
      
    } catch (err: any) {
      toastError(extractApiError(err, 'Failed to update leave request'));
    } finally {
      setSubmitting(false);
    }
  };
  
  // Handle delete leave
  const handleDeleteLeave = async () => {
    if (!selectedLeave) return;
    
    try {
      setSubmitting(true);
      const formDataObj = new FormData();
      formDataObj.append('leave_id', selectedLeave.id.toString());
      const payload = await leaveApiService.deleteLeave(formDataObj);
      
      toastSuccess(extractApiMessage(payload, 'Leave request deleted successfully!'));
      setShowDeleteModal(false);
      loadOwnLeaveData();
      
    } catch (err: any) {
      toastError(extractApiError(err, 'Failed to delete leave request'));
    } finally {
      setSubmitting(false);
    }
  };
  
  // Handle approve/reject student leave
  const handleApproveRejectStudentLeave = async () => {
    if (!selectedStudentLeave) return;
    
    try {
      setSubmitting(true);
      const payload = await leaveApiService.approveRejectStudentLeave({
        leave_id: selectedStudentLeave.id,
        action: approveRejectData.action,
        comment: approveRejectData.comment || undefined
      });
      
      toastSuccess(extractApiMessage(payload, `Student leave request ${approveRejectData.action.toLowerCase()} successfully!`));
      setShowApproveRejectModal(false);
      setApproveRejectData({ action: 'Approved', comment: '' });
      loadStudentLeaveData();
      
    } catch (err: any) {
      toastError(extractApiError(err, `Failed to ${approveRejectData.action.toLowerCase()} student leave request`));
    } finally {
      setSubmitting(false);
    }
  };
  
  // Reset form
  const resetForm = () => {
    setFormData({
      leave_id: '',
      start_date: '',
      end_date: '',
      reason: '',
    });
    setProofFile(null);
    setFormErrors({});
    setSelectedLeave(null);
  };
  
  // Open apply modal
  const openApplyModal = () => {
    resetForm();
    setShowApplyModal(true);
  };
  
  // Open edit modal
  const openEditModal = (leave: LeaveRequest) => {
    if (leave.status !== 'Pending') {
      toastError('Only pending leave requests can be edited');
      return;
    }
    
    setSelectedLeave(leave);
    setFormData({
      leave_id: leave.id.toString(),
      start_date: leave.start_date,
      end_date: leave.end_date,
      reason: leave.reason,
    });
    setProofFile(null);
    setFormErrors({});
    setShowEditModal(true);
  };
  
  // Open delete modal
  const openDeleteModal = (leave: LeaveRequest) => {
    if (leave.status !== 'Pending') {
      toastError('Only pending leave requests can be deleted');
      return;
    }
    
    setSelectedLeave(leave);
    setShowDeleteModal(true);
  };
  
  // Open details modal
  const openDetailsModal = (leave: LeaveRequest) => {
    setSelectedLeave(leave);
    setShowDetailsModal(true);
  };
  
  // Open approve/reject modal for student leave
  const openApproveRejectModal = (leave: LeaveRequest) => {
    setSelectedStudentLeave(leave);
    setApproveRejectData({
      action: 'Approved',
      comment: ''
    });
    setShowApproveRejectModal(true);
  };
  
  // Open student details modal
  const openStudentDetailsModal = (leave: LeaveRequest) => {
    setSelectedLeave(leave);
    setShowDetailsModal(true);
  };
  
  // Get status badge color
  const getStatusColor = (status: string) => {
    if (theme === 'dark') {
      switch (status) {
        case 'Pending': return 'bg-amber-900/30 text-amber-300 border-amber-800';
        case 'Approved': return 'bg-emerald-900/30 text-emerald-300 border-emerald-800';
        case 'Rejected': return 'bg-red-900/30 text-red-300 border-red-800';
        default: return 'bg-gray-800/40 text-gray-200 border-gray-700';
      }
    }

    switch (status) {
      case 'Pending': return 'bg-amber-100 text-amber-800 border-amber-200';
      case 'Approved': return 'bg-emerald-100 text-emerald-800 border-emerald-200';
      case 'Rejected': return 'bg-red-100 text-red-800 border-red-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };
  
  // Get status icon
  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'Pending': return <FaHourglassHalf className="inline mr-1" />;
      case 'Approved': return <FaCheckCircle className="inline mr-1" />;
      case 'Rejected': return <FaTimesCircle className="inline mr-1" />;
      default: return null;
    }
  };
  
  // Format date
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      weekday: 'short',
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };
  
  // Calculate duration in days
  const calculateDuration = (startDate: string, endDate: string) => {
    const start = new Date(startDate);
    const end = new Date(endDate);
    const diffTime = Math.abs(end.getTime() - start.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
    return diffDays;
  };
  
  // Get month name
  const getMonthName = (month: number) => {
    return new Date(2000, month - 1, 1).toLocaleString('default', { month: 'long' });
  };
  
  // Get current year and month
  const currentYear = new Date().getFullYear();
  const currentMonth = new Date().getMonth() + 1;
  
  // Get years for filter (current year + 2 years back)
  const years = Array.from({ length: 3 }, (_, i) => currentYear - i);
  
  // Get filtered and paginated own leave requests
  const filteredOwnRequests = leaveRequests.filter(request => {
    if (ownStatusFilter !== 'all' && request.status !== ownStatusFilter) return false;
    if (monthFilter) {
      const date = new Date(request.start_date);
      if (date.getMonth() + 1 !== monthFilter) return false;
    }
    if (yearFilter) {
      const date = new Date(request.start_date);
      if (date.getFullYear() !== yearFilter) return false;
    }

    const search = ownSearchTerm.trim().toLowerCase();
    if (search) {
      const haystack = [
        request.reason,
        request.admin_comment,
        request.status,
        request.start_date,
        request.end_date,
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();
      if (!haystack.includes(search)) return false;
    }

    return true;
  });

  const sortedOwnRequests = [...filteredOwnRequests].sort((a, b) => {
    const statusOrder = { Pending: 0, Approved: 1, Rejected: 2 } as const;
    let result = 0;

    if (ownSortConfig.key === 'start_date') {
      result = new Date(a.start_date).getTime() - new Date(b.start_date).getTime();
    } else if (ownSortConfig.key === 'duration') {
      result = calculateDuration(a.start_date, a.end_date) - calculateDuration(b.start_date, b.end_date);
    } else if (ownSortConfig.key === 'status') {
      result = statusOrder[a.status] - statusOrder[b.status];
    } else if (ownSortConfig.key === 'created_at') {
      result = new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
    }

    if (result === 0) {
      result = new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
    }

    return ownSortConfig.direction === 'asc' ? result : -result;
  });
  
  // Get filtered and paginated student leave requests
  const filteredStudentRequests = mode === 'student'
    ? studentLeaveRequests
    : studentLeaveRequests.filter((request) => {
        if (studentStatusFilter !== 'all' && request.status !== studentStatusFilter) return false;
        if (studentMonthFilter) {
          const date = new Date(request.start_date);
          if (date.getMonth() + 1 !== studentMonthFilter) return false;
        }
        if (studentYearFilter) {
          const date = new Date(request.start_date);
          if (date.getFullYear() !== studentYearFilter) return false;
        }
        return true;
      });
  
  // Calculate pagination for own leaves
  const ownTotalPages = Math.ceil(sortedOwnRequests.length / itemsPerPage);
  const ownStartIndex = (currentPage - 1) * itemsPerPage;
  const ownEndIndex = ownStartIndex + itemsPerPage;
  const paginatedOwnRequests = sortedOwnRequests.slice(ownStartIndex, ownEndIndex);
  
  // Calculate pagination for student leaves
  const studentTotalPages = Math.ceil(filteredStudentRequests.length / itemsPerPage);
  const studentStartIndex = (studentCurrentPage - 1) * itemsPerPage;
  const studentEndIndex = studentStartIndex + itemsPerPage;
  const paginatedStudentRequests = filteredStudentRequests.slice(studentStartIndex, studentEndIndex);
  
  // Render loading state
  if (mode === 'own' && loading) {
    return (
      <div className={combine('dashboard-typography px-3 py-3 sm:px-4 sm:py-4 xl:px-6 xl:py-6', getBgClass())}>
        <div className="mx-auto w-full max-w-[1600px]">
          <div className={combine(getCardGradientClass('blue'), 'flex items-center justify-center py-16 text-center')}>
            <div className="space-y-4">
              <div className="relative mx-auto w-20 h-20">
                <div className={combine(
                  'w-20 h-20 border-4 rounded-full animate-spin',
                  theme === 'dark' ? 'border-blue-900/30 border-t-blue-400' : 'border-blue-200 border-t-blue-600'
                )} />
                <FaCalendarAlt className={combine('absolute inset-0 m-auto text-xl', theme === 'dark' ? 'text-blue-300' : 'text-blue-600')} />
              </div>
              <div>
                <h3 className={combine('text-base sm:text-lg font-bold', get('text', 'primary'))}>Loading Leave Requests</h3>
                <p className={combine('mt-1 text-xs sm:text-sm', get('text', 'secondary'))}>Fetching your leave history...</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const handleOwnSort = (key: OwnSortKey) => {
    setOwnSortConfig((prev) => ({
      key,
      direction: prev.key === key && prev.direction === 'asc' ? 'desc' : 'asc',
    }));
    setCurrentPage(1);
  };
  
  return (
    <div className={combine('dashboard-typography px-3 py-3 sm:px-4 sm:py-4 xl:px-6 xl:py-6', getBgClass())}>
      <div className="mx-auto w-full max-w-[1600px]">
        {/* Header Section */}
        <div className="mb-8">
          {activeTab === 'own' ? (
            <div
              className={combine(
                'rounded-xl sm:rounded-2xl p-4 sm:p-6 shadow-lg text-white mb-6',
                theme === 'dark'
                  ? 'bg-gradient-to-r from-blue-700 to-blue-800'
                  : 'bg-gradient-to-r from-blue-500 to-blue-600'
              )}
            >
              <div className="flex flex-col gap-4 sm:gap-5 lg:flex-row lg:items-center lg:justify-between">
                <div className="flex items-start gap-3 sm:gap-4">
                  <div className="p-2.5 sm:p-3 rounded-xl sm:rounded-2xl shadow-lg bg-white/20 backdrop-blur-sm">
                    <FaCalendarAlt className="text-2xl sm:text-3xl" />
                  </div>
                  <div className="min-w-0">
                    <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold mb-1.5 sm:mb-2">My Leaves</h1>
                    <p className="text-xs sm:text-sm text-blue-100">Track your leave requests and approvals</p>
                  </div>
                </div>

                <div className="w-full lg:w-auto">
                  <button onClick={openApplyModal} className={combine(getPrimaryButtonClass('blue'), 'w-full lg:w-auto')}>
                    <FaPlus /> Apply for Leave
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <div
              className={combine(
                'rounded-xl sm:rounded-2xl p-4 sm:p-6 shadow-lg text-white mb-6',
                theme === 'dark'
                  ? 'bg-gradient-to-r from-emerald-700 to-emerald-800'
                  : 'bg-gradient-to-r from-emerald-500 to-emerald-600'
              )}
            >
              <div className="flex items-start gap-3 sm:gap-4">
                <div className="p-2.5 sm:p-3 rounded-xl sm:rounded-2xl shadow-lg bg-white/20 backdrop-blur-sm">
                  <FaUserGraduate className="text-2xl sm:text-3xl" />
                </div>
                <div className="min-w-0">
                  <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold mb-1.5 sm:mb-2">Student Leaves</h1>
                  <p className="text-xs sm:text-sm text-emerald-100">Review and manage leave requests from your class students</p>
                </div>
              </div>
            </div>
          )}
          
          {/* Stats Overview */}
          {activeTab === 'own' ? (
            <div className="mb-6">
              <div className="grid grid-cols-1 min-[520px]:grid-cols-2 xl:grid-cols-4 gap-3 sm:gap-4 md:gap-6">
                <div className={getCardGradientClass('blue')}>
                  <div className="flex items-center justify-between">
                    <div>
                      <div className={combine('text-xl sm:text-2xl md:text-3xl font-bold', get('accent', 'primary'))}>
                        {ownStats.total}
                      </div>
                      <div className={combine('text-xs sm:text-sm font-medium mt-1', get('text', 'secondary'))}>Total Requests</div>
                    </div>
                    <FaRegCalendarCheck className={combine('text-2xl sm:text-3xl', theme === 'dark' ? 'text-blue-400' : 'text-blue-600')} />
                  </div>
                </div>
                <div className={getCardGradientClass('amber')}>
                  <div className="flex items-center justify-between">
                    <div>
                      <div className={combine('text-xl sm:text-2xl md:text-3xl font-bold', get('accent', 'warning'))}>
                        {ownStats.pending}
                      </div>
                      <div className={combine('text-xs sm:text-sm font-medium mt-1', get('text', 'secondary'))}>Pending</div>
                    </div>
                    <FaClock className={combine('text-2xl sm:text-3xl', theme === 'dark' ? 'text-amber-400' : 'text-amber-600')} />
                  </div>
                </div>
                <div className={getCardGradientClass('emerald')}>
                  <div className="flex items-center justify-between">
                    <div>
                      <div className={combine('text-xl sm:text-2xl md:text-3xl font-bold', get('accent', 'success'))}>
                        {ownStats.approved}
                      </div>
                      <div className={combine('text-xs sm:text-sm font-medium mt-1', get('text', 'secondary'))}>Approved</div>
                    </div>
                    <FaCheckCircle className={combine('text-2xl sm:text-3xl', theme === 'dark' ? 'text-emerald-400' : 'text-green-600')} />
                  </div>
                </div>
                <div className={getCardGradientClass('red')}>
                  <div className="flex items-center justify-between">
                    <div>
                      <div className={combine('text-xl sm:text-2xl md:text-3xl font-bold', theme === 'dark' ? 'text-red-300' : 'text-red-600')}>
                        {ownStats.rejected}
                      </div>
                      <div className={combine('text-xs sm:text-sm font-medium mt-1', get('text', 'secondary'))}>Rejected</div>
                    </div>
                    <FaTimesCircle className={combine('text-2xl sm:text-3xl', theme === 'dark' ? 'text-red-300' : 'text-red-600')} />
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-3 sm:gap-4 md:gap-5 mb-6">
              <div className="bg-gradient-to-br from-emerald-50 to-emerald-100/50 border border-emerald-200 rounded-xl sm:rounded-2xl p-4 sm:p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-2xl sm:text-3xl font-bold text-emerald-700">{studentStats.total}</div>
                    <div className="text-xs sm:text-sm text-emerald-600 font-medium">Total Requests</div>
                  </div>
                  <div className="p-2.5 sm:p-3 bg-emerald-500/10 rounded-xl">
                    <FaHistory className="text-xl sm:text-2xl text-emerald-600" />
                  </div>
                </div>
              </div>
              
              <div className="bg-gradient-to-br from-amber-50 to-amber-100/50 border border-amber-200 rounded-xl sm:rounded-2xl p-4 sm:p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-2xl sm:text-3xl font-bold text-amber-700">{studentStats.pending}</div>
                    <div className="text-xs sm:text-sm text-amber-600 font-medium">Pending</div>
                  </div>
                  <div className="p-2.5 sm:p-3 bg-amber-500/10 rounded-xl">
                    <FaHourglassHalf className="text-xl sm:text-2xl text-amber-600" />
                  </div>
                </div>
              </div>
              
              <div className="bg-gradient-to-br from-emerald-50 to-emerald-100/50 border border-emerald-200 rounded-xl sm:rounded-2xl p-4 sm:p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-2xl sm:text-3xl font-bold text-emerald-700">{studentStats.approved}</div>
                    <div className="text-xs sm:text-sm text-emerald-600 font-medium">Approved</div>
                  </div>
                  <div className="p-2.5 sm:p-3 bg-emerald-500/10 rounded-xl">
                    <FaCheckCircle className="text-xl sm:text-2xl text-emerald-600" />
                  </div>
                </div>
              </div>
              
              <div className="bg-gradient-to-br from-red-50 to-red-100/50 border border-red-200 rounded-xl sm:rounded-2xl p-4 sm:p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-2xl sm:text-3xl font-bold text-red-700">{studentStats.rejected}</div>
                    <div className="text-xs sm:text-sm text-red-600 font-medium">Rejected</div>
                  </div>
                  <div className="p-2.5 sm:p-3 bg-red-500/10 rounded-xl">
                    <FaTimesCircle className="text-xl sm:text-2xl text-red-600" />
                  </div>
                </div>
              </div>
              
              <div className="bg-gradient-to-br from-blue-50 to-blue-100/50 border border-blue-200 rounded-xl sm:rounded-2xl p-4 sm:p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-2xl sm:text-3xl font-bold text-blue-700">{studentStats.totalStudents}</div>
                    <div className="text-xs sm:text-sm text-blue-600 font-medium">Students</div>
                  </div>
                  <div className="p-2.5 sm:p-3 bg-blue-500/10 rounded-xl">
                    <FaUsers className="text-xl sm:text-2xl text-blue-600" />
                  </div>
                </div>
              </div>
              
              <div className="bg-gradient-to-br from-violet-50 to-violet-100/50 border border-violet-200 rounded-xl sm:rounded-2xl p-4 sm:p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-2xl sm:text-3xl font-bold text-violet-700">{studentStats.pendingStudents}</div>
                    <div className="text-xs sm:text-sm text-violet-600 font-medium">Pending Students</div>
                  </div>
                  <div className="p-2.5 sm:p-3 bg-violet-500/10 rounded-xl">
                    <FaUserFriends className="text-xl sm:text-2xl text-violet-600" />
                  </div>
                </div>
              </div>
            </div>
          )}
          
          {/* Filters Section */}
          {activeTab === 'own' ? (
            <div className={combine(getCardGradientClass('blue'), 'mb-6')}>
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_minmax(0,1fr)_auto_auto] gap-4 xl:items-end">
                <div>
                  <label className={combine('block text-xs sm:text-sm font-medium mb-1.5', get('text', 'primary'))}>Status</label>
                  <select
                    value={ownStatusFilter}
                    onChange={(e) => { setOwnStatusFilter(e.target.value); setCurrentPage(1); }}
                    className={getInputClass('blue')}
                  >
                    <option value="all">All Status</option>
                    <option value="Pending">Pending</option>
                    <option value="Approved">Approved</option>
                    <option value="Rejected">Rejected</option>
                  </select>
                </div>

                <div>
                  <label className={combine('block text-xs sm:text-sm font-medium mb-1.5', get('text', 'primary'))}>Month</label>
                  <select
                    value={monthFilter || ''}
                    onChange={(e) => { setMonthFilter(e.target.value ? parseInt(e.target.value, 10) : null); setCurrentPage(1); }}
                    className={getInputClass('blue')}
                  >
                    <option value="">All Months</option>
                    {Array.from({ length: 12 }, (_, i) => i + 1).map((month) => (
                      <option key={month} value={month}>
                        {getMonthName(month)}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className={combine('block text-xs sm:text-sm font-medium mb-1.5', get('text', 'primary'))}>Search</label>
                  <div className="relative">
                    <FaSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm sm:text-base" />
                    <input
                      value={ownSearchTerm}
                      onChange={(e) => { setOwnSearchTerm(e.target.value); setCurrentPage(1); }}
                      placeholder="Reason, comment, dates..."
                      className={combine(getInputClass('blue'), 'pl-8 sm:pl-9')}
                    />
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => { setCurrentPage(1); void loadOwnLeaveData(); }}
                  className={getPrimaryButtonClass('blue')}
                >
                  <FaFilter /> Apply
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setOwnStatusFilter('all');
                    setMonthFilter(null);
                    setYearFilter(null);
                    setOwnSearchTerm('');
                    setCurrentPage(1);
                    void loadOwnLeaveData();
                  }}
                  className={getSecondaryButtonClass()}
                >
                  Clear
                </button>
              </div>
            </div>
          ) : (
            <div className={combine(getCardGradientClass('emerald'), 'mb-6')}>
              <div className="flex items-center gap-2 mb-4">
                <FaFilter className={combine('text-sm', get('accent', 'primary'))} />
                <h3 className={combine('text-base sm:text-lg font-semibold', get('text', 'primary'))}>Filter Student Leaves</h3>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-4 gap-3 sm:gap-4 items-end">
                <div>
                  <label className={combine('block text-xs sm:text-sm font-medium mb-2', get('text', 'secondary'))}>Status</label>
                  <select
                    value={studentStatusFilter}
                    onChange={(e) => setStudentStatusFilter(e.target.value)}
                    className={getInputClass('emerald')}
                  >
                    <option value="Pending">Pending</option>
                    <option value="Approved">Approved</option>
                    <option value="Rejected">Rejected</option>
                    <option value="all">All Status</option>
                  </select>
                </div>

                <div>
                  <label className={combine('block text-xs sm:text-sm font-medium mb-2', get('text', 'secondary'))}>Month</label>
                  <select
                    value={studentMonthFilter || ''}
                    onChange={(e) => setStudentMonthFilter(e.target.value ? parseInt(e.target.value) : null)}
                    className={getInputClass('emerald')}
                  >
                    <option value="">All Months</option>
                    {Array.from({ length: 12 }, (_, i) => i + 1).map((month) => (
                      <option key={month} value={month}>
                        {getMonthName(month)}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className={combine('block text-xs sm:text-sm font-medium mb-2', get('text', 'secondary'))}>Year</label>
                  <select
                    value={studentYearFilter || ''}
                    onChange={(e) => setStudentYearFilter(e.target.value ? parseInt(e.target.value) : null)}
                    className={getInputClass('emerald')}
                  >
                    <option value="">All Years</option>
                    {years.map((year) => (
                      <option key={year} value={year}>{year}</option>
                    ))}
                  </select>
                </div>

                <div className="flex flex-col sm:flex-row gap-2">
                  <button
                    onClick={() => {
                      const next = { status: studentStatusFilter, month: studentMonthFilter, year: studentYearFilter };
                      setStudentAppliedFilters(next);
                      setStudentCurrentPage(1);
                      void loadStudentLeaveData(next);
                    }}
                    className={getPrimaryButtonClass('emerald')}
                  >
                    <FaFilter /> Apply
                  </button>
                  <button
                    onClick={() => {
                      const next = { status: 'Pending', month: null, year: null };
                      setStudentStatusFilter('Pending');
                      setStudentMonthFilter(null);
                      setStudentYearFilter(null);
                      setStudentAppliedFilters(next);
                      setStudentCurrentPage(1);
                      void loadStudentLeaveData(next);
                    }}
                    className={getSecondaryButtonClass()}
                  >
                    Clear
                  </button>
                </div>
              </div>
            </div>
          )}
          
          {/* Content Section */}
          {activeTab === 'own' ? (
            /* Own Leave Requests Table */
            filteredOwnRequests.length === 0 ? (
              <div className={combine(getCardGradientClass('blue'), 'text-center py-12')}>
                <div className="inline-flex items-center justify-center h-14 w-14 rounded-2xl bg-blue-500/10 mb-4">
                  <FaCalendarAlt className={combine('text-2xl', theme === 'dark' ? 'text-blue-300' : 'text-blue-600')} />
                </div>
                <h3 className={combine('text-base sm:text-lg font-bold', get('text', 'primary'))}>No Leaves Found</h3>
                <p className={combine('mt-2 text-xs sm:text-sm', get('text', 'secondary'))}>
                  Try changing filters, clearing search, or apply for a leave.
                </p>
                <div className="mt-5 flex flex-col sm:flex-row gap-2 justify-center">
                  <button onClick={openApplyModal} className={combine(getPrimaryButtonClass('blue'), 'px-3 py-2')}>
                    <FaPlus /> Apply
                  </button>
                </div>
              </div>
            ) : (
              <div className={combine(getCardGradientClass('blue'), 'mb-6 overflow-hidden')}>
                <div className="hidden md:block overflow-x-auto">
                  <table className={combine('min-w-full divide-y', theme === 'dark' ? 'divide-gray-700' : 'divide-gray-200')}>
                    <thead>
                      <tr className={combine('bg-gradient-to-r border-b', get('bg', 'secondary'), get('border', 'secondary'))}>
                        <th
                          className={combine('py-4 px-6 text-left font-semibold cursor-pointer select-none', get('text', 'secondary'))}
                          onClick={() => handleOwnSort('start_date')}
                        >
                          <div className="flex items-center gap-2">
                            Leave
                            {ownSortConfig.key === 'start_date' && (ownSortConfig.direction === 'asc' ? <FaSortUp /> : <FaSortDown />)}
                          </div>
                        </th>
                        <th
                          className={combine('py-4 px-6 text-left font-semibold cursor-pointer select-none', get('text', 'secondary'))}
                          onClick={() => handleOwnSort('duration')}
                        >
                          <div className="flex items-center gap-2">
                            Duration
                            {ownSortConfig.key === 'duration' && (ownSortConfig.direction === 'asc' ? <FaSortUp /> : <FaSortDown />)}
                          </div>
                        </th>
                        <th
                          className={combine('py-4 px-6 text-left font-semibold cursor-pointer select-none', get('text', 'secondary'))}
                          onClick={() => handleOwnSort('status')}
                        >
                          <div className="flex items-center gap-2">
                            Status
                            {ownSortConfig.key === 'status' && (ownSortConfig.direction === 'asc' ? <FaSortUp /> : <FaSortDown />)}
                          </div>
                        </th>
                        <th className={combine('py-4 px-6 text-left font-semibold', get('text', 'secondary'))}>Actions</th>
                      </tr>
                    </thead>
                    <tbody className={combine('divide-y', theme === 'dark' ? 'divide-gray-700' : 'divide-gray-200')}>
                      {paginatedOwnRequests.map((request) => {
                        const duration = calculateDuration(request.start_date, request.end_date);
                        const isPending = request.status === 'Pending';
                        return (
                          <tr
                            key={request.id}
                            className={combine('transition-colors', theme === 'dark' ? 'hover:bg-gray-800/50' : 'hover:bg-blue-50')}
                          >
                            <td className="px-6 py-4">
                              <div className="flex items-start gap-3">
                                <div className="w-10 h-10 bg-gradient-to-br from-blue-100 to-blue-200 rounded-lg flex items-center justify-center shrink-0">
                                  <FaCalendarCheck className="text-blue-600" />
                                </div>
                                <div className="min-w-0">
                                  <div className={combine('font-medium', get('text', 'primary'))}>
                                    {formatDate(request.start_date)} - {formatDate(request.end_date)}
                                  </div>
                                  <div className={combine('text-xs sm:text-sm line-clamp-1', get('text', 'tertiary'))} title={request.reason}>
                                    {request.reason}
                                  </div>
                                  <div className={combine('text-xs mt-1', get('text', 'tertiary'))}>
                                    Applied: {new Date(request.created_at).toLocaleDateString()}
                                  </div>
                                </div>
                              </div>
                            </td>
                            <td className="px-6 py-4">
                              <div className="flex items-center">
                                <FaClock className="text-gray-400 mr-2" />
                                <span className={combine('font-medium', get('text', 'secondary'))}>
                                  {duration} day{duration > 1 ? 's' : ''}
                                </span>
                              </div>
                            </td>
                            <td className="px-6 py-4">
                              <span className={combine(
                                'inline-flex items-center px-3 py-1 rounded-full text-xs sm:text-sm font-medium border',
                                getStatusColor(request.status)
                              )}>
                                {request.status}
                              </span>
                              {request.admin_comment && (
                                <div className={combine('text-xs mt-1', get('text', 'tertiary'))} title={request.admin_comment}>
                                  {request.admin_comment.substring(0, 30)}...
                                </div>
                              )}
                            </td>
                            <td className="px-6 py-4">
                              <div className="flex items-center gap-2 flex-wrap">
                                <button
                                  onClick={() => openDetailsModal(request)}
                                  className={combine(getSecondaryButtonClass(), 'px-3 py-2')}
                                  title="View"
                                  aria-label="View"
                                >
                                  <FaEye />
                                </button>
                                {isPending && (
                                  <>
                                    <button
                                      onClick={() => openEditModal(request)}
                                      className={combine(getSecondaryButtonClass(), 'px-3 py-2')}
                                      title="Edit"
                                      aria-label="Edit"
                                    >
                                      <FaEdit />
                                    </button>
                                    <button
                                      onClick={() => openDeleteModal(request)}
                                      className={combine(getDangerButtonClass(), 'px-3 py-2')}
                                      title="Delete"
                                      aria-label="Delete"
                                    >
                                      <FaTrash />
                                    </button>
                                  </>
                                )}
                                {request.proof_file && (
                                  <a
                                    href={`${API_BASE_URL}${request.proof_file}`}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className={combine(getSecondaryButtonClass(), 'px-3 py-2')}
                                    title="Proof"
                                    aria-label="Proof"
                                  >
                                    <FaDownload />
                                  </a>
                                )}
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>

                <div className="md:hidden p-4 space-y-3">
                  {paginatedOwnRequests.map((request) => {
                    const duration = calculateDuration(request.start_date, request.end_date);
                    const isPending = request.status === 'Pending';
                    return (
                      <div key={request.id} className={combine('rounded-xl border p-4 shadow-sm', get('border', 'secondary'), get('bg', 'card'))}>
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <div className={combine('font-semibold text-sm', get('text', 'primary'))}>
                              {formatDate(request.start_date)} - {formatDate(request.end_date)}
                            </div>
                            <div className={combine('text-xs mt-1', get('text', 'tertiary'))}>
                              Applied: {new Date(request.created_at).toLocaleDateString()}
                            </div>
                          </div>
                          <span className={combine('shrink-0 inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold border', getStatusColor(request.status))}>
                            {request.status}
                          </span>
                        </div>

                        <div className="mt-3 grid grid-cols-2 gap-3 text-xs">
                          <div className={combine('rounded-lg p-2.5', get('bg', 'secondary'))}>
                            <div className={combine('text-[11px]', get('text', 'tertiary'))}>Duration</div>
                            <div className={combine('mt-0.5 font-medium', get('text', 'primary'))}>{duration} day{duration > 1 ? 's' : ''}</div>
                          </div>
                          <div className={combine('rounded-lg p-2.5', get('bg', 'secondary'))}>
                            <div className={combine('text-[11px]', get('text', 'tertiary'))}>Status</div>
                            <div className={combine('mt-0.5 font-medium', get('text', 'primary'))}>{request.status}</div>
                          </div>
                        </div>

                        <div className={combine('mt-3 text-xs line-clamp-2', get('text', 'secondary'))} title={request.reason}>
                          {request.reason}
                        </div>

                        {request.admin_comment && (
                          <div className={combine('mt-2 text-xs line-clamp-2', get('text', 'tertiary'))} title={request.admin_comment}>
                            Admin: {request.admin_comment}
                          </div>
                        )}

                        <div className="mt-4 flex flex-wrap gap-2">
                          <button
                            onClick={() => openDetailsModal(request)}
                            className={combine(getSecondaryButtonClass(), 'px-3 py-2')}
                            title="View"
                            aria-label="View"
                          >
                            <FaEye />
                          </button>
                          {isPending && (
                            <>
                              <button
                                onClick={() => openEditModal(request)}
                                className={combine(getSecondaryButtonClass(), 'px-3 py-2')}
                                title="Edit"
                                aria-label="Edit"
                              >
                                <FaEdit />
                              </button>
                              <button
                                onClick={() => openDeleteModal(request)}
                                className={combine(getDangerButtonClass(), 'px-3 py-2')}
                                title="Delete"
                                aria-label="Delete"
                              >
                                <FaTrash />
                              </button>
                            </>
                          )}
                          {request.proof_file && (
                            <a
                              href={`${API_BASE_URL}${request.proof_file}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className={combine(getSecondaryButtonClass(), 'px-3 py-2')}
                              title="Proof"
                              aria-label="Proof"
                            >
                              <FaDownload />
                            </a>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>

                <div className={combine('px-4 sm:px-6 py-4 border-t flex items-center justify-between gap-3 flex-wrap', get('border', 'secondary'))}>
                  <div className={combine('text-xs sm:text-sm', get('text', 'secondary'))}>
                    Showing <span className={combine('font-semibold', get('text', 'primary'))}>{ownStartIndex + 1}</span>
                    {' '}to{' '}
                    <span className={combine('font-semibold', get('text', 'primary'))}>{Math.min(ownEndIndex, sortedOwnRequests.length)}</span>
                    {' '}of{' '}
                    <span className={combine('font-semibold', get('text', 'primary'))}>{sortedOwnRequests.length}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                      disabled={currentPage <= 1}
                      className={combine(getSecondaryButtonClass(), 'px-3 py-2', currentPage <= 1 ? 'opacity-50 cursor-not-allowed' : '')}
                    >
                      <FaChevronLeft />
                    </button>
                    <div className={combine('text-xs sm:text-sm font-medium', get('text', 'secondary'))}>
                      Page <span className={combine('font-semibold', get('text', 'primary'))}>{currentPage}</span> / {Math.max(1, ownTotalPages)}
                    </div>
                    <button
                      type="button"
                      onClick={() => setCurrentPage((p) => Math.min(ownTotalPages, p + 1))}
                      disabled={currentPage >= ownTotalPages}
                      className={combine(getSecondaryButtonClass(), 'px-3 py-2', currentPage >= ownTotalPages ? 'opacity-50 cursor-not-allowed' : '')}
                    >
                      <FaChevronRight />
                    </button>
                  </div>
                </div>
              </div>
            )
          ) : (
            /* Student Leave Requests Section */
            isClassTeacher === false ? (
              <div className="text-center py-16 bg-gradient-to-br from-gray-50 to-white/80 backdrop-blur-sm rounded-3xl border border-gray-200 shadow-xl">
                <div className="inline-flex items-center justify-center w-32 h-32 bg-gradient-to-br from-amber-100 to-amber-200 rounded-full mb-6">
                  <FaChalkboardTeacher className="text-4xl text-amber-600" />
                </div>
                <h3 className="text-2xl font-bold text-gray-800 mb-3">Class Teacher Access Required</h3>
                <p className="text-gray-600 max-w-md mx-auto mb-6">
                  This section is only accessible to teachers who are assigned as class teachers for the current academic year.
                </p>
                <div className="bg-gradient-to-r from-amber-50 to-amber-100/50 border border-amber-200 rounded-xl p-6 max-w-md mx-auto">
                  <div className="flex items-center gap-3 mb-4">
                    <FaSchool className="text-amber-600 text-xl" />
                    <h4 className="font-semibold text-gray-800">How to Access Student Leaves</h4>
                  </div>
                  <ul className="text-left text-gray-700 space-y-2">
                    <li className="flex items-start gap-2">
                      <FaCheckCircle className="text-emerald-500 mt-1 flex-shrink-0" />
                      <span>Be assigned as a class teacher by the administrator</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <FaCheckCircle className="text-emerald-500 mt-1 flex-shrink-0" />
                      <span>Ensure you're assigned for the current academic year</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <FaCheckCircle className="text-emerald-500 mt-1 flex-shrink-0" />
                      <span>Contact your administrator if you believe you should have access</span>
                    </li>
                  </ul>
                </div>
                <Link
                  href="/teacher/leaves"
                  className="mt-8 px-6 py-3 bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-xl hover:from-blue-700 hover:to-blue-800 transition-all duration-300 flex items-center gap-2 font-medium shadow-lg shadow-blue-200 mx-auto w-fit"
                >
                  <FaArrowLeft /> Back to My Leaves
                </Link>
              </div>
            ) : studentLoading ? (
              <div className="text-center py-16 bg-white/80 backdrop-blur-sm rounded-3xl border border-gray-200 shadow-xl">
                <div className="inline-flex items-center justify-center w-24 h-24 bg-gradient-to-br from-emerald-100 to-emerald-200 rounded-full mb-6">
                  <FaSpinner className="text-3xl text-emerald-600 animate-spin" />
                </div>
                <h3 className="text-2xl font-bold text-gray-800 mb-3">Loading Student Leaves</h3>
                <p className="text-gray-600 max-w-md mx-auto mb-8">
                  Fetching student leave requests...
                </p>
              </div>
            ) : filteredStudentRequests.length > 0 ? (
              <div className={mode === 'student' ? combine(getCardGradientClass('emerald'), 'mb-6 overflow-hidden') : 'bg-white/80 backdrop-blur-sm rounded-2xl border border-gray-200 shadow-lg overflow-hidden mb-8'}>
                <div className={mode === 'student' ? 'hidden md:block overflow-x-auto' : 'overflow-x-auto'}>
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gradient-to-r from-emerald-50 to-emerald-100">
                      <tr>
                        <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                          Student Details
                        </th>
                        <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                          Leave Period
                        </th>
                        <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                          Duration
                        </th>
                        <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                          Status
                        </th>
                        <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                          Applied On
                        </th>
                        <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                          Actions
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                      {paginatedStudentRequests.map((request) => {
                        const duration = calculateDuration(request.start_date, request.end_date);
                        const isPending = request.status === 'Pending';
                        
                        return (
                          <tr key={request.id} className="hover:bg-gray-50 transition-colors">
                            <td className="px-6 py-4">
                              <div className="flex items-center space-x-3">
                                <div className="flex-shrink-0">
                                  <div className="w-10 h-10 bg-gradient-to-br from-emerald-100 to-emerald-200 rounded-lg flex items-center justify-center">
                                    <FaUserGraduate className="text-emerald-600" />
                                  </div>
                                </div>
                                <div>
                                  <div className="font-medium text-gray-900">{request.requester_name}</div>
                                  <div className="text-sm text-gray-500">ID: {request.requester_id}</div>
                                  <div className="text-xs text-gray-400">{request.academic_year_name || 'N/A'}</div>
                                </div>
                              </div>
                            </td>
                            <td className="px-6 py-4">
                              <div className="font-medium text-gray-900">{formatDate(request.start_date)}</div>
                              <div className="text-sm text-gray-500">to {formatDate(request.end_date)}</div>
                            </td>
                            <td className="px-6 py-4">
                              <div className="flex items-center">
                                <FaClock className="text-gray-400 mr-2" />
                                <span className="font-medium">{duration} day{duration > 1 ? 's' : ''}</span>
                              </div>
                            </td>
                            <td className="px-6 py-4">
                              <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium border ${getStatusColor(request.status)}`}>
                                {getStatusIcon(request.status)} {request.status}
                              </span>
                              {request.admin_comment && (
                                <div className="text-xs text-gray-500 mt-1" title={request.admin_comment}>
                                  {request.admin_comment.substring(0, 30)}...
                                </div>
                              )}
                            </td>
                            <td className="px-6 py-4 text-sm text-gray-500">
                              {new Date(request.created_at).toLocaleDateString()}
                            </td>
                            <td className="px-6 py-4">
                              <div className="flex items-center space-x-2">
                                <button
                                  onClick={() => openStudentDetailsModal(request)}
                                  className="px-3 py-1.5 bg-gradient-to-r from-blue-50 to-blue-100 text-blue-700 rounded-lg hover:from-blue-100 hover:to-blue-200 transition-all duration-300 text-sm font-medium flex items-center gap-1"
                                >
                                  <FaEye /> View
                                </button>
                                
                                {isPending && (
                                  <>
                                    <button
                                      onClick={() => openApproveRejectModal(request)}
                                      className="px-3 py-1.5 bg-gradient-to-r from-emerald-50 to-emerald-100 text-emerald-700 rounded-lg hover:from-emerald-100 hover:to-emerald-200 transition-all duration-300 text-sm font-medium flex items-center gap-1"
                                    >
                                      <FaCheckCircle /> Approve
                                    </button>
                                    <button
                                      onClick={() => {
                                        setApproveRejectData({ action: 'Rejected', comment: '' });
                                        openApproveRejectModal(request);
                                      }}
                                      className="px-3 py-1.5 bg-gradient-to-r from-red-50 to-red-100 text-red-700 rounded-lg hover:from-red-100 hover:to-red-200 transition-all duration-300 text-sm font-medium flex items-center gap-1"
                                    >
                                      <FaTimesCircle /> Reject
                                    </button>
                                  </>
                                )}
                                
                                {request.proof_file && (
                                  <a
                                    href={`${API_BASE_URL}${request.proof_file}`}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="px-3 py-1.5 bg-gradient-to-r from-violet-50 to-violet-100 text-violet-700 rounded-lg hover:from-violet-100 hover:to-violet-200 transition-all duration-300 text-sm font-medium flex items-center gap-1"
                                  >
                                    <FaDownload /> Proof
                                  </a>
                                )}
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>

                {mode === 'student' && (
                  <div className="md:hidden p-4 space-y-3">
                    {paginatedStudentRequests.map((request) => {
                      const duration = calculateDuration(request.start_date, request.end_date);
                      const isPending = request.status === 'Pending';
                      return (
                        <div
                          key={request.id}
                          className={combine('rounded-xl border p-4 shadow-sm', get('border', 'secondary'), get('bg', 'card'))}
                        >
                          <div className="flex items-start justify-between gap-3">
                            <div className="min-w-0">
                              <div className={combine('font-semibold text-sm', get('text', 'primary'))}>{request.requester_name}</div>
                              <div className={combine('text-xs', get('text', 'tertiary'))}>ID: {request.requester_id}</div>
                              <div className={combine('text-xs', get('text', 'tertiary'))}>{request.academic_year_name || 'N/A'}</div>
                            </div>
                            <span className={combine('shrink-0 inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold border', getStatusColor(request.status))}>
                              {getStatusIcon(request.status)} {request.status}
                            </span>
                          </div>

                          <div className="mt-3 grid grid-cols-2 gap-3 text-xs">
                            <div className={combine('rounded-lg p-2.5', get('bg', 'secondary'))}>
                              <div className={combine('text-[11px]', get('text', 'tertiary'))}>From</div>
                              <div className={combine('mt-0.5 font-medium', get('text', 'primary'))}>{formatDate(request.start_date)}</div>
                            </div>
                            <div className={combine('rounded-lg p-2.5', get('bg', 'secondary'))}>
                              <div className={combine('text-[11px]', get('text', 'tertiary'))}>To</div>
                              <div className={combine('mt-0.5 font-medium', get('text', 'primary'))}>{formatDate(request.end_date)}</div>
                            </div>
                          </div>

                          <div className={combine('mt-3 flex items-center justify-between text-xs', get('text', 'secondary'))}>
                            <div className="flex items-center gap-2">
                              <FaClock className="text-gray-400" />
                              <span>{duration} day{duration > 1 ? 's' : ''}</span>
                            </div>
                            <div>{new Date(request.created_at).toLocaleDateString()}</div>
                          </div>

                          <div className="mt-4 flex flex-wrap gap-2">
                            <button
                              onClick={() => openStudentDetailsModal(request)}
                              className={combine(getSecondaryButtonClass(), 'px-3 py-2')}
                            >
                              <FaEye /> View
                            </button>

                            {isPending && (
                              <>
                                <button
                                  onClick={() => openApproveRejectModal(request)}
                                  className={combine(getPrimaryButtonClass('emerald'), 'px-3 py-2')}
                                >
                                  <FaCheckCircle /> Approve
                                </button>
                                <button
                                  onClick={() => {
                                    setApproveRejectData({ action: 'Rejected', comment: '' });
                                    openApproveRejectModal(request);
                                  }}
                                  className={combine(getDangerButtonClass(), 'px-3 py-2')}
                                >
                                  <FaTimesCircle /> Reject
                                </button>
                              </>
                            )}

                            {request.proof_file && (
                              <a
                                href={`${API_BASE_URL}${request.proof_file}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className={combine(getSecondaryButtonClass(), 'px-3 py-2')}
                              >
                                <FaDownload /> Proof
                              </a>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
                
                {/* Pagination */}
                {studentTotalPages > 1 && (
                  <div className={mode === 'student' ? combine('px-4 sm:px-6 py-4 border-t', get('border', 'secondary')) : 'px-6 py-4 border-t border-gray-200'}>
                    <div className="flex items-center justify-between">
                      <div className="text-sm text-gray-700">
                        Showing <span className="font-medium">{studentStartIndex + 1}</span> to{' '}
                        <span className="font-medium">{Math.min(studentEndIndex, filteredStudentRequests.length)}</span> of{' '}
                        <span className="font-medium">{filteredStudentRequests.length}</span> results
                      </div>
                      <div className="flex items-center space-x-2">
                        <button
                          onClick={() => setStudentCurrentPage(prev => Math.max(prev - 1, 1))}
                          disabled={studentCurrentPage === 1}
                          className="px-3 py-2 bg-gradient-to-r from-gray-50 to-gray-100 border border-gray-300 rounded-lg hover:from-gray-100 hover:to-gray-200 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          <FaArrowLeft />
                        </button>
                        
                        <div className="flex items-center space-x-1">
                          {Array.from({ length: Math.min(5, studentTotalPages) }, (_, i) => {
                            let pageNum: number;
                            if (studentTotalPages <= 5) {
                              pageNum = i + 1;
                            } else if (studentCurrentPage <= 3) {
                              pageNum = i + 1;
                            } else if (studentCurrentPage >= studentTotalPages - 2) {
                              pageNum = studentTotalPages - 4 + i;
                            } else {
                              pageNum = studentCurrentPage - 2 + i;
                            }
                            
                            return (
                              <button
                                key={pageNum}
                                onClick={() => setStudentCurrentPage(pageNum)}
                                className={`px-3 py-2 rounded-lg transition-all duration-300 ${studentCurrentPage === pageNum
                                    ? 'bg-gradient-to-r from-emerald-600 to-emerald-700 text-white'
                                    : 'bg-gradient-to-r from-gray-50 to-gray-100 hover:from-gray-100 hover:to-gray-200'
                                  }`}
                              >
                                {pageNum}
                              </button>
                            );
                          })}
                        </div>
                        
                        <button
                          onClick={() => setStudentCurrentPage(prev => Math.min(prev + 1, studentTotalPages))}
                          disabled={studentCurrentPage === studentTotalPages}
                          className="px-3 py-2 bg-gradient-to-r from-gray-50 to-gray-100 border border-gray-300 rounded-lg hover:from-gray-100 hover:to-gray-200 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          <FaArrowRight />
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="text-center py-16 bg-white/80 backdrop-blur-sm rounded-3xl border border-gray-200 shadow-xl">
                <div className="inline-flex items-center justify-center w-24 h-24 bg-gradient-to-br from-emerald-100 to-emerald-200 rounded-full mb-6">
                  <FaUserGraduate className="text-3xl text-emerald-600" />
                </div>
                <h3 className="text-2xl font-bold text-gray-800 mb-3">No Student Leave Requests</h3>
                <p className="text-gray-600 max-w-md mx-auto mb-8">
                  {studentAppliedFilters.status !== 'Pending' || studentAppliedFilters.month || studentAppliedFilters.year
                    ? 'No student leave requests match the selected filters.'
                    : 'There are no pending student leave requests at the moment.'}
                </p>
                <div className="flex flex-col sm:flex-row gap-3 justify-center">
                  <button 
                    onClick={() => { void loadStudentLeaveData(); }}
                    className="px-6 py-3 bg-gradient-to-r from-emerald-600 to-emerald-700 text-white rounded-xl hover:from-emerald-700 hover:to-emerald-800 transition-all duration-300 flex items-center gap-2 font-medium shadow-lg shadow-emerald-200"
                  >
                    <FaSpinner className="animate-spin" /> Refresh Data
                  </button>
                  <button 
                    onClick={() => {
                      const next = { status: 'Pending', month: null, year: null };
                      setStudentStatusFilter('Pending');
                      setStudentMonthFilter(null);
                      setStudentYearFilter(null);
                      setStudentAppliedFilters(next);
                      void loadStudentLeaveData(next);
                    }}
                    className="px-6 py-3 bg-gradient-to-r from-gray-600 to-gray-700 text-white rounded-xl hover:from-gray-700 hover:to-gray-800 transition-all duration-300 flex items-center gap-2 font-medium shadow-lg shadow-gray-200"
                  >
                    Show All Requests
                  </button>
                </div>
              </div>
            )
          )}
          
          {/* Error State */}
          {error && (
            <div className="mt-8 bg-gradient-to-r from-red-50 to-red-100 border border-red-200 rounded-2xl p-6 shadow-lg animate-fadeIn">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-red-100 rounded-xl">
                  <FaExclamationTriangle className="text-2xl text-red-600" />
                </div>
                <div className="flex-1">
                  <h4 className="font-bold text-gray-800">Error Loading Data</h4>
                  <p className="text-gray-700">{error}</p>
                </div>
                <button
                  onClick={() => { void (activeTab === 'own' ? loadOwnLeaveData() : loadStudentLeaveData()); }}
                  className="px-4 py-2 bg-gradient-to-r from-red-600 to-red-700 text-white rounded-lg hover:from-red-700 hover:to-red-800 transition-all duration-300 font-medium"
                >
                  Retry
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
      
      {/* Apply Leave Modal */}
      {showApplyModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-fadeIn">
          <div className="bg-white rounded-3xl max-w-md w-full shadow-2xl animate-slideUp">
            <div className="relative">
              <div className="bg-gradient-to-br from-blue-500 to-blue-600 p-6">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-4">
                    <div className="p-3 bg-white/20 backdrop-blur-sm rounded-xl">
                      <FaCalendarPlus className="text-2xl text-white" />
                    </div>
                    <div>
                      <h2 className="text-xl font-bold text-white mb-1">
                        Apply for Leave
                      </h2>
                      <p className="text-white/80 text-sm">
                        Submit a new leave request
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() => setShowApplyModal(false)}
                    className="p-2 text-white/80 hover:text-white hover:bg-white/20 rounded-xl transition-colors"
                  >
                    <FaTimes className="text-xl" />
                  </button>
                </div>
              </div>
            </div>
            
            <div className="p-6">
              <div className="space-y-4">
                {/* Start Date */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Start Date <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="date"
                    value={formData.start_date}
                    onChange={(e) => {
                      setFormData({ ...formData, start_date: e.target.value });
                      if (formErrors.start_date) setFormErrors({ ...formErrors, start_date: '' });
                    }}
                    className={`w-full px-4 py-3 border ${formErrors.start_date ? 'border-red-300' : 'border-gray-300'} rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent`}
                  />
                  {formErrors.start_date && (
                    <p className="mt-1 text-sm text-red-600">{formErrors.start_date}</p>
                  )}
                </div>
                
                {/* End Date */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    End Date <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="date"
                    value={formData.end_date}
                    onChange={(e) => {
                      setFormData({ ...formData, end_date: e.target.value });
                      if (formErrors.end_date) setFormErrors({ ...formErrors, end_date: '' });
                    }}
                    className={`w-full px-4 py-3 border ${formErrors.end_date ? 'border-red-300' : 'border-gray-300'} rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent`}
                  />
                  {formErrors.end_date && (
                    <p className="mt-1 text-sm text-red-600">{formErrors.end_date}</p>
                  )}
                </div>
                
                {/* Duration Display */}
                {formData.start_date && formData.end_date && (
                  <div className="p-3 bg-gradient-to-r from-blue-50 to-indigo-50/50 rounded-xl border border-blue-100/50">
                    <div className="text-sm text-blue-600 font-medium mb-1">Leave Duration</div>
                    <div className="font-semibold text-gray-800">
                      {calculateDuration(formData.start_date, formData.end_date)} day{calculateDuration(formData.start_date, formData.end_date) > 1 ? 's' : ''}
                    </div>
                  </div>
                )}
                
                {/* Reason */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Reason <span className="text-red-500">*</span>
                  </label>
                  <textarea
                    value={formData.reason}
                    onChange={(e) => {
                      setFormData({ ...formData, reason: e.target.value });
                      if (formErrors.reason) setFormErrors({ ...formErrors, reason: '' });
                    }}
                    rows={3}
                    className={`w-full px-4 py-3 border ${formErrors.reason ? 'border-red-300' : 'border-gray-300'} rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent`}
                    placeholder="Enter the reason for your leave request..."
                  />
                  {formErrors.reason && (
                    <p className="mt-1 text-sm text-red-600">{formErrors.reason}</p>
                  )}
                </div>
                
                {/* Proof File */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Supporting Document (Optional)
                  </label>
                  <div className="flex items-center justify-center w-full">
                    <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed border-gray-300 rounded-xl cursor-pointer bg-gray-50 hover:bg-gray-100 transition-colors">
                      <div className="flex flex-col items-center justify-center pt-5 pb-6">
                        <FaFileUpload className="w-8 h-8 mb-3 text-gray-400" />
                        <p className="mb-2 text-sm text-gray-500">
                          <span className="font-semibold">Click to upload</span> or drag and drop
                        </p>
                        <p className="text-xs text-gray-500">PDF, DOC, JPG, PNG (MAX. 5MB)</p>
                      </div>
                      <input
                        type="file"
                        className="hidden"
                        onChange={(e) => setProofFile(e.target.files?.[0] || null)}
                        accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"
                      />
                    </label>
                  </div>
                  {proofFile && (
                    <div className="mt-3 p-3 bg-gradient-to-r from-emerald-50 to-emerald-100/50 rounded-xl border border-emerald-200 flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <FaPaperclip className="text-emerald-600" />
                        <div>
                          <div className="font-medium text-gray-800 text-sm">{proofFile.name}</div>
                          <div className="text-xs text-gray-600">
                            {(proofFile.size / 1024 / 1024).toFixed(2)} MB
                          </div>
                        </div>
                      </div>
                      <button
                        onClick={() => setProofFile(null)}
                        className="p-1 hover:bg-white rounded-lg transition-colors"
                      >
                        <FaTimes className="text-gray-400 hover:text-gray-600" />
                      </button>
                    </div>
                  )}
                </div>
              </div>
              
              <div className="flex gap-3 mt-6">
                <button
                  onClick={handleApplyLeave}
                  disabled={submitting}
                  className="flex-1 px-4 py-3 bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-xl hover:from-blue-700 hover:to-blue-800 transition-all duration-300 font-medium text-sm flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {submitting ? (
                    <>
                      <FaSpinner className="animate-spin" /> Submitting...
                    </>
                  ) : (
                    <>
                      <FaCheckCircle /> Submit Leave Request
                    </>
                  )}
                </button>
                <button
                  onClick={() => setShowApplyModal(false)}
                  className="flex-1 px-4 py-3 bg-gradient-to-r from-gray-600 to-gray-700 text-white rounded-xl hover:from-gray-700 hover:to-gray-800 transition-all duration-300 font-medium text-sm"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
      
      {/* Edit Leave Modal */}
      {showEditModal && selectedLeave && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-fadeIn">
          <div className="bg-white rounded-3xl max-w-md w-full shadow-2xl animate-slideUp">
            <div className="relative">
              <div className="bg-gradient-to-br from-amber-500 to-amber-600 p-6">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-4">
                    <div className="p-3 bg-white/20 backdrop-blur-sm rounded-xl">
                      <FaEdit className="text-2xl text-white" />
                    </div>
                    <div>
                      <h2 className="text-xl font-bold text-white mb-1">
                        Edit Leave Request
                      </h2>
                      <p className="text-white/80 text-sm">
                        Update your leave request details
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() => setShowEditModal(false)}
                    className="p-2 text-white/80 hover:text-white hover:bg-white/20 rounded-xl transition-colors"
                  >
                    <FaTimes className="text-xl" />
                  </button>
                </div>
              </div>
            </div>
            
            <div className="p-6">
              <div className="space-y-4">
                {/* Current Status */}
                <div className="p-3 bg-gradient-to-r from-amber-50 to-amber-100/50 rounded-xl border border-amber-200">
                  <div className="text-sm text-amber-600 font-medium mb-1">Current Status</div>
                  <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium border ${getStatusColor(selectedLeave.status)}`}>
                    {getStatusIcon(selectedLeave.status)} {selectedLeave.status}
                  </span>
                </div>
                
                {/* Start Date */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Start Date (Optional)
                  </label>
                  <input
                    type="date"
                    value={formData.start_date}
                    onChange={(e) => setFormData({ ...formData, start_date: e.target.value })}
                    className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                  />
                </div>
                
                {/* End Date */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    End Date (Optional)
                  </label>
                  <input
                    type="date"
                    value={formData.end_date}
                    onChange={(e) => setFormData({ ...formData, end_date: e.target.value })}
                    className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                  />
                </div>
                
                {/* Reason */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Reason (Optional)
                  </label>
                  <textarea
                    value={formData.reason}
                    onChange={(e) => setFormData({ ...formData, reason: e.target.value })}
                    rows={3}
                    className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                    placeholder="Enter updated reason for your leave request..."
                  />
                </div>
                
                {/* Proof File */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Update Supporting Document (Optional)
                  </label>
                  <div className="flex items-center justify-center w-full">
                    <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed border-gray-300 rounded-xl cursor-pointer bg-gray-50 hover:bg-gray-100 transition-colors">
                      <div className="flex flex-col items-center justify-center pt-5 pb-6">
                        <FaFileUpload className="w-8 h-8 mb-3 text-gray-400" />
                        <p className="mb-2 text-sm text-gray-500">
                          <span className="font-semibold">Click to upload</span> or drag and drop
                        </p>
                        <p className="text-xs text-gray-500">PDF, DOC, JPG, PNG (MAX. 5MB)</p>
                      </div>
                      <input
                        type="file"
                        className="hidden"
                        onChange={(e) => setProofFile(e.target.files?.[0] || null)}
                        accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"
                      />
                    </label>
                  </div>
                  {selectedLeave.proof_file && !proofFile && (
                    <div className="mt-3 p-3 bg-gradient-to-r from-blue-50 to-blue-100/50 rounded-xl border border-blue-200">
                      <div className="text-sm text-blue-600 font-medium mb-1">Current Document</div>
                      <a
                        href={`${API_BASE_URL}${selectedLeave.proof_file}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-2 text-sm text-gray-700 hover:text-blue-600 transition-colors"
                      >
                        <FaPaperclip /> View Current File
                      </a>
                    </div>
                  )}
                  {proofFile && (
                    <div className="mt-3 p-3 bg-gradient-to-r from-emerald-50 to-emerald-100/50 rounded-xl border border-emerald-200 flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <FaPaperclip className="text-emerald-600" />
                        <div>
                          <div className="font-medium text-gray-800 text-sm">{proofFile.name}</div>
                          <div className="text-xs text-gray-600">
                            {(proofFile.size / 1024 / 1024).toFixed(2)} MB
                          </div>
                        </div>
                      </div>
                      <button
                        onClick={() => setProofFile(null)}
                        className="p-1 hover:bg-white rounded-lg transition-colors"
                      >
                        <FaTimes className="text-gray-400 hover:text-gray-600" />
                      </button>
                    </div>
                  )}
                </div>
              </div>
              
              <div className="flex gap-3 mt-6">
                <button
                  onClick={handleEditLeave}
                  disabled={submitting}
                  className="flex-1 px-4 py-3 bg-gradient-to-r from-amber-600 to-amber-700 text-white rounded-xl hover:from-amber-700 hover:to-amber-800 transition-all duration-300 font-medium text-sm flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {submitting ? (
                    <>
                      <FaSpinner className="animate-spin" /> Updating...
                    </>
                  ) : (
                    <>
                      <FaEdit /> Update Request
                    </>
                  )}
                </button>
                <button
                  onClick={() => setShowEditModal(false)}
                  className="flex-1 px-4 py-3 bg-gradient-to-r from-gray-600 to-gray-700 text-white rounded-xl hover:from-gray-700 hover:to-gray-800 transition-all duration-300 font-medium text-sm"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
      
      {/* Delete Leave Modal */}
      {showDeleteModal && selectedLeave && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-fadeIn">
          <div className="bg-white rounded-3xl max-w-md w-full shadow-2xl animate-slideUp">
            <div className="relative">
              <div className="bg-gradient-to-br from-red-500 to-red-600 p-6">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-4">
                    <div className="p-3 bg-white/20 backdrop-blur-sm rounded-xl">
                      <FaTrash className="text-2xl text-white" />
                    </div>
                    <div>
                      <h2 className="text-xl font-bold text-white mb-1">
                        Delete Leave Request
                      </h2>
                      <p className="text-white/80 text-sm">
                        This action cannot be undone
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() => setShowDeleteModal(false)}
                    className="p-2 text-white/80 hover:text-white hover:bg-white/20 rounded-xl transition-colors"
                  >
                    <FaTimes className="text-xl" />
                  </button>
                </div>
              </div>
            </div>
            
            <div className="p-6">
              <div className="text-center mb-6">
                <div className="inline-flex items-center justify-center w-20 h-20 bg-gradient-to-br from-red-100 to-red-200 rounded-full mb-4">
                  <FaExclamationTriangle className="text-3xl text-red-600" />
                </div>
                <h3 className="text-lg font-bold text-gray-800 mb-2">Confirm Deletion</h3>
                <p className="text-gray-600">
                  Are you sure you want to delete this leave request?
                </p>
              </div>
              
              <div className="bg-gradient-to-r from-red-50 to-red-100/50 rounded-xl border border-red-200 p-4 mb-6">
                <div className="font-medium text-gray-800 mb-2">Leave Details</div>
                <div className="text-sm text-gray-700 space-y-1">
                  <div>Dates: {formatDate(selectedLeave.start_date)} - {formatDate(selectedLeave.end_date)}</div>
                  <div>Duration: {calculateDuration(selectedLeave.start_date, selectedLeave.end_date)} days</div>
                  <div>Reason: {selectedLeave.reason.substring(0, 50)}...</div>
                </div>
              </div>
              
              <div className="flex gap-3">
                <button
                  onClick={handleDeleteLeave}
                  disabled={submitting}
                  className="flex-1 px-4 py-3 bg-gradient-to-r from-red-600 to-red-700 text-white rounded-xl hover:from-red-700 hover:to-red-800 transition-all duration-300 font-medium text-sm flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {submitting ? (
                    <>
                      <FaSpinner className="animate-spin" /> Deleting...
                    </>
                  ) : (
                    <>
                      <FaTrash /> Delete Request
                    </>
                  )}
                </button>
                <button
                  onClick={() => setShowDeleteModal(false)}
                  className="flex-1 px-4 py-3 bg-gradient-to-r from-gray-600 to-gray-700 text-white rounded-xl hover:from-gray-700 hover:to-gray-800 transition-all duration-300 font-medium text-sm"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
      
      {/* Approve/Reject Student Leave Modal */}
      {showApproveRejectModal && selectedStudentLeave && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-fadeIn">
          <div className="bg-white rounded-3xl max-w-md w-full shadow-2xl animate-slideUp">
            <div className="relative">
              <div className={`bg-gradient-to-br ${approveRejectData.action === 'Approved' ? 'from-emerald-500 to-emerald-600' : 'from-red-500 to-red-600'} p-6`}>
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-4">
                    <div className="p-3 bg-white/20 backdrop-blur-sm rounded-xl">
                      {approveRejectData.action === 'Approved' ? (
                        <FaCheckCircle className="text-2xl text-white" />
                      ) : (
                        <FaTimesCircle className="text-2xl text-white" />
                      )}
                    </div>
                    <div>
                      <h2 className="text-xl font-bold text-white mb-1">
                        {approveRejectData.action} Student Leave
                      </h2>
                      <p className="text-white/80 text-sm">
                        Student: {selectedStudentLeave.requester_name}
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() => setShowApproveRejectModal(false)}
                    className="p-2 text-white/80 hover:text-white hover:bg-white/20 rounded-xl transition-colors"
                  >
                    <FaTimes className="text-xl" />
                  </button>
                </div>
              </div>
            </div>
            
            <div className="p-6">
              <div className="space-y-4">
                {/* Student Info */}
                <div className="p-4 bg-gradient-to-r from-gray-50 to-white border border-gray-200 rounded-xl">
                  <div className="text-sm text-gray-600 mb-2">Student Details</div>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-gray-700">Name:</span>
                      <span className="font-medium">{selectedStudentLeave.requester_name}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-gray-700">Student ID:</span>
                      <span className="font-medium">{selectedStudentLeave.requester_id}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-gray-700">Leave Period:</span>
                      <span className="font-medium">
                        {formatDate(selectedStudentLeave.start_date)} - {formatDate(selectedStudentLeave.end_date)}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-gray-700">Duration:</span>
                      <span className="font-medium">
                        {calculateDuration(selectedStudentLeave.start_date, selectedStudentLeave.end_date)} days
                      </span>
                    </div>
                  </div>
                </div>
                
                {/* Reason */}
                <div className="p-4 bg-gradient-to-r from-blue-50 to-blue-100/50 border border-blue-200 rounded-xl">
                  <div className="text-sm text-blue-600 mb-2">Leave Reason</div>
                  <div className="text-gray-800">
                    {selectedStudentLeave.reason}
                  </div>
                </div>
                
                {/* Action Selection */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Action <span className="text-red-500">*</span>
                  </label>
                  <div className="grid grid-cols-2 gap-3">
                    <button
                      onClick={() => setApproveRejectData({ ...approveRejectData, action: 'Approved' })}
                      className={`px-4 py-3 rounded-xl border transition-all duration-300 ${approveRejectData.action === 'Approved' 
                        ? 'bg-gradient-to-r from-emerald-50 to-emerald-100 border-emerald-300 text-emerald-700 shadow-inner' 
                        : 'bg-white border-gray-300 text-gray-700 hover:bg-gray-50'}`}
                    >
                      <div className="flex items-center justify-center gap-2">
                        <FaCheckCircle /> Approve
                      </div>
                    </button>
                    <button
                      onClick={() => setApproveRejectData({ ...approveRejectData, action: 'Rejected' })}
                      className={`px-4 py-3 rounded-xl border transition-all duration-300 ${approveRejectData.action === 'Rejected' 
                        ? 'bg-gradient-to-r from-red-50 to-red-100 border-red-300 text-red-700 shadow-inner' 
                        : 'bg-white border-gray-300 text-gray-700 hover:bg-gray-50'}`}
                    >
                      <div className="flex items-center justify-center gap-2">
                        <FaTimesCircle /> Reject
                      </div>
                    </button>
                  </div>
                </div>
                
                {/* Comment */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Comment {approveRejectData.action === 'Rejected' && <span className="text-red-500">*</span>}
                  </label>
                  <textarea
                    value={approveRejectData.comment}
                    onChange={(e) => setApproveRejectData({ ...approveRejectData, comment: e.target.value })}
                    rows={3}
                    className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                    placeholder={approveRejectData.action === 'Approved' 
                      ? 'Optional comments for the student...' 
                      : 'Please provide a reason for rejection (required)...'}
                  />
                  {approveRejectData.action === 'Rejected' && !approveRejectData.comment.trim() && (
                    <p className="mt-1 text-sm text-red-600">Reason for rejection is required</p>
                  )}
                </div>
              </div>
              
              <div className="flex gap-3 mt-6">
                <button
                  onClick={handleApproveRejectStudentLeave}
                  disabled={submitting || (approveRejectData.action === 'Rejected' && !approveRejectData.comment.trim())}
                  className="flex-1 px-4 py-3 bg-gradient-to-r from-emerald-600 to-emerald-700 text-white rounded-xl hover:from-emerald-700 hover:to-emerald-800 transition-all duration-300 font-medium text-sm flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {submitting ? (
                    <>
                      <FaSpinner className="animate-spin" /> Processing...
                    </>
                  ) : (
                    <>
                      {approveRejectData.action === 'Approved' ? <FaCheckCircle /> : <FaTimesCircle />}
                      {approveRejectData.action} Leave
                    </>
                  )}
                </button>
                <button
                  onClick={() => setShowApproveRejectModal(false)}
                  className="flex-1 px-4 py-3 bg-gradient-to-r from-gray-600 to-gray-700 text-white rounded-xl hover:from-gray-700 hover:to-gray-800 transition-all duration-300 font-medium text-sm"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
      
      {/* Leave Details Modal */}
      {showDetailsModal && selectedLeave && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-fadeIn">
          <div className="bg-white rounded-3xl max-w-2xl w-full shadow-2xl animate-slideUp max-h-[90vh] overflow-hidden">
            <div className="relative">
              <div className={`${selectedLeave.status === 'Approved' ? 'bg-gradient-to-br from-emerald-500 to-emerald-600' : 
                              selectedLeave.status === 'Rejected' ? 'bg-gradient-to-br from-red-500 to-red-600' : 
                              'bg-gradient-to-br from-amber-500 to-amber-600'} p-6`}>
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-4">
                    <div className="p-3 bg-white/20 backdrop-blur-sm rounded-xl">
                      {activeTab === 'student' ? (
                        <FaUserGraduate className="text-2xl text-white" />
                      ) : (
                        <FaCalendarCheck className="text-2xl text-white" />
                      )}
                    </div>
                    <div>
                      <h2 className="text-xl font-bold text-white mb-1">
                        Leave Request Details
                      </h2>
                      <p className="text-white/80 text-sm">
                        Request ID: #{selectedLeave.id}
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() => setShowDetailsModal(false)}
                    className="p-2 text-white/80 hover:text-white hover:bg-white/20 rounded-xl transition-colors"
                  >
                    <FaTimes className="text-xl" />
                  </button>
                </div>
              </div>
            </div>
            
            <div className="p-6 overflow-y-auto max-h-[calc(90vh-180px)]">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                <div className="space-y-4">
                  {/* Status */}
                  <div className="p-4 bg-gradient-to-r from-gray-50 to-white border border-gray-200 rounded-xl">
                    <div className="text-sm text-gray-600 mb-1">Status</div>
                    <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium border ${getStatusColor(selectedLeave.status)}`}>
                      {getStatusIcon(selectedLeave.status)} {selectedLeave.status}
                    </span>
                  </div>
                  
                  {/* Requester Info */}
                  <div className="p-4 bg-gradient-to-r from-blue-50 to-blue-100/50 border border-blue-200 rounded-xl">
                    <div className="text-sm text-blue-600 mb-2">
                      {activeTab === 'student' ? 'Student Information' : 'Requester Information'}
                    </div>
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-gray-700">Name:</span>
                        <span className="font-medium">{selectedLeave.requester_name}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-gray-700">ID:</span>
                        <span className="font-medium">{selectedLeave.requester_id}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-gray-700">Role:</span>
                        <span className="font-medium">{selectedLeave.role}</span>
                      </div>
                      {selectedLeave.academic_year_name && (
                        <div className="flex items-center justify-between">
                          <span className="text-gray-700">Academic Year:</span>
                          <span className="font-medium">{selectedLeave.academic_year_name}</span>
                        </div>
                      )}
                    </div>
                  </div>
                  
                  {/* Dates */}
                  <div className="p-4 bg-gradient-to-r from-emerald-50 to-emerald-100/50 border border-emerald-200 rounded-xl">
                    <div className="text-sm text-emerald-600 mb-2">Leave Period</div>
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-gray-700">Start Date:</span>
                        <span className="font-medium">{formatDate(selectedLeave.start_date)}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-gray-700">End Date:</span>
                        <span className="font-medium">{formatDate(selectedLeave.end_date)}</span>
                      </div>
                      <div className="flex items-center justify-between pt-2 border-t border-emerald-200">
                        <span className="text-gray-700">Total Duration:</span>
                        <span className="font-bold text-emerald-700">
                          {calculateDuration(selectedLeave.start_date, selectedLeave.end_date)} days
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
                
                <div className="space-y-4">
                  {/* Reason */}
                  <div className="p-4 bg-gradient-to-r from-amber-50 to-amber-100/50 border border-amber-200 rounded-xl">
                    <div className="text-sm text-amber-600 mb-2">Reason for Leave</div>
                    <div className="text-gray-800 whitespace-pre-wrap">
                      {selectedLeave.reason}
                    </div>
                  </div>
                  
                  {/* Admin Comments */}
                  {selectedLeave.admin_comment && (
                    <div className="p-4 bg-gradient-to-r from-violet-50 to-violet-100/50 border border-violet-200 rounded-xl">
                      <div className="text-sm text-violet-600 mb-2">Admin Comments</div>
                      <div className="text-gray-800">
                        {selectedLeave.admin_comment}
                      </div>
                    </div>
                  )}
                  
                  {/* Applied Information */}
                  <div className="p-4 bg-gradient-to-r from-gray-50 to-white border border-gray-200 rounded-xl">
                    <div className="text-sm text-gray-600 mb-2">Request Information</div>
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-gray-700">Applied On:</span>
                        <span className="font-medium">{new Date(selectedLeave.created_at).toLocaleDateString()}</span>
                      </div>
                      {selectedLeave.approved_by_name && (
                        <div className="flex items-center justify-between">
                          <span className="text-gray-700">Processed By:</span>
                          <span className="font-medium">{selectedLeave.approved_by_name}</span>
                        </div>
                      )}
                    </div>
                  </div>
                  
                  {/* Supporting Document */}
                  <div className="p-4 bg-gradient-to-r from-violet-50 to-violet-100/50 border border-violet-200 rounded-xl">
                    <div className="text-sm text-violet-600 mb-2">Supporting Document</div>
                    {selectedLeave.proof_file ? (
                      <a
                        href={`${API_BASE_URL}${selectedLeave.proof_file}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center justify-between p-3 bg-white rounded-lg border border-violet-200 hover:border-violet-300 transition-colors group"
                      >
                        <div className="flex items-center gap-3">
                          <div className="p-2 bg-violet-100 rounded-lg">
                            <FaPaperclip className="text-violet-600" />
                          </div>
                          <div>
                            <div className="font-medium text-gray-800 group-hover:text-violet-600 transition-colors">
                              View Document
                            </div>
                            <div className="text-xs text-gray-600">
                              Click to download
                            </div>
                          </div>
                        </div>
                        <FaDownload className="text-violet-400 group-hover:text-violet-600 transition-colors" />
                      </a>
                    ) : (
                      <div className="text-center py-4 text-gray-500">
                        No supporting document attached
                      </div>
                    )}
                  </div>
                </div>
              </div>
              
              {/* Action Buttons */}
              <div className="flex gap-3">
                {activeTab === 'own' && selectedLeave.status === 'Pending' && (
                  <>
                    <button
                      onClick={() => {
                        setShowDetailsModal(false);
                        openEditModal(selectedLeave);
                      }}
                      className="flex-1 px-4 py-3 bg-gradient-to-r from-amber-600 to-amber-700 text-white rounded-xl hover:from-amber-700 hover:to-amber-800 transition-all duration-300 font-medium text-sm flex items-center justify-center gap-2"
                    >
                      <FaEdit /> Edit Request
                    </button>
                    <button
                      onClick={() => {
                        setShowDetailsModal(false);
                        openDeleteModal(selectedLeave);
                      }}
                      className="flex-1 px-4 py-3 bg-gradient-to-r from-red-600 to-red-700 text-white rounded-xl hover:from-red-700 hover:to-red-800 transition-all duration-300 font-medium text-sm flex items-center justify-center gap-2"
                    >
                      <FaTrash /> Delete Request
                    </button>
                  </>
                )}
                <button
                  onClick={() => setShowDetailsModal(false)}
                  className="flex-1 px-4 py-3 bg-gradient-to-r from-gray-600 to-gray-700 text-white rounded-xl hover:from-gray-700 hover:to-gray-800 transition-all duration-300 font-medium text-sm"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
      
      {/* Add CSS animations */}
      <style jsx global>{`
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes slideUp {
          from { transform: translateY(20px); opacity: 0; }
          to { transform: translateY(0); opacity: 1; }
        }
        @keyframes blob {
          0% { transform: translate(0px, 0px) scale(1); }
          33% { transform: translate(30px, -50px) scale(1.1); }
          66% { transform: translate(-20px, 20px) scale(0.9); }
          100% { transform: translate(0px, 0px) scale(1); }
        }
        .animate-fadeIn {
          animation: fadeIn 0.3s ease-out;
        }
        .animate-slideUp {
          animation: slideUp 0.4s ease-out;
        }
        .animate-blob {
          animation: blob 7s infinite;
        }
        .animation-delay-2000 {
          animation-delay: 2s;
        }
        .animation-delay-4000 {
          animation-delay: 4s;
        }
      `}</style>
    </div>
  );
}
