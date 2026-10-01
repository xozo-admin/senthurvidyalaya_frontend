'use client';

import { adminApi } from '@/lib/api';
import { useEffect, useState, useMemo, useCallback, useRef } from 'react';
import {
  FaCalendar,
  FaUser,
  FaUserTie,
  FaCheckCircle,
  FaTimesCircle,
  FaClock,
  FaFilter,
  FaSearch,
  FaFileAlt,
  FaComment,
  FaSort,
  FaSortUp,
  FaChartBar,
  FaSortDown,
  FaChevronLeft,
  FaChevronRight,
  FaFilePdf,
  FaUserGraduate,
  FaSpinner,
  FaInfoCircle,
  FaExclamationTriangle,
  FaRedoAlt,
  FaDownload,
} from 'react-icons/fa';
import { FiCalendar, FiFilter, FiClock, FiCheckCircle, FiXCircle } from 'react-icons/fi';
import { useTheme } from '@/contexts/ThemeContext';
import { useThemeClasses } from '@/hooks/useThemeClasses';
import { toastSuccess, toastError, toastInfo } from '@/lib/toast';
import { requestSidebarCountsRefresh } from '@/lib/sidebar-counts-sync';
import { SchoolScopeSelector, useSchoolScope } from '@/components/admin/SchoolScopeSelector';

interface LeaveRequest {
  id: number;
  user_type: 'staff' | 'teacher';
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

interface ApiResponse {
  status: number;
  data: LeaveRequest[];
  summary?: Stats;
  pagination?: PaginationMeta;
}

interface ActionData {
  leave_id: number;
  action: 'Approved' | 'Rejected';
  comment: string;
  school_id?: number;
}

interface Stats {
  pending: number;
  approved: number;
  rejected: number;
  total: number;
}

interface FilterParams {
  status?: string;
  month?: string;
  year?: string;
  search?: string;
  user_type?: string;
  role?: string;
  page?: number;
  page_size?: number;
  school_id?: number;
}

interface PaginationMeta {
  page: number;
  page_size: number;
  total: number;
  total_pages: number;
  has_next: boolean;
  has_previous: boolean;
}

export default function LeaveManagementPage() {
  const { theme } = useTheme();
  const { get, combine } = useThemeClasses();
  const schoolScope = useSchoolScope({ storageKey: 'operations_leave_school_scope' });
  const [leaveRequests, setLeaveRequests] = useState<LeaveRequest[]>([]);
  const [loading, setLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [filterUserType, setFilterUserType] = useState<string>('all');
  const [filterRole, setFilterRole] = useState<string>('all');
  const [filterMonth, setFilterMonth] = useState<string>('');
  const [filterYear, setFilterYear] = useState<string>('');
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(10);
  const [sortConfig, setSortConfig] = useState<{ key: string; direction: 'asc' | 'desc' }>({
    key: 'created_at',
    direction: 'desc'
  });
  const [selectedLeave, setSelectedLeave] = useState<LeaveRequest | null>(null);
  const [showActionModal, setShowActionModal] = useState(false);
  const [actionData, setActionData] = useState<ActionData>({
    leave_id: 0,
    action: 'Approved',
    comment: ''
  });
  const [showProofModal, setShowProofModal] = useState(false);
  const [proofUrl, setProofUrl] = useState<string>('');
  const [stats, setStats] = useState<Stats>({
    pending: 0,
    approved: 0,
    rejected: 0,
    total: 0
  });
  const [error, setError] = useState<string | null>(null);
  const [appliedFilters, setAppliedFilters] = useState<FilterParams>({});
  const [pagination, setPagination] = useState<PaginationMeta>({
    page: 1,
    page_size: 10,
    total: 0,
    total_pages: 1,
    has_next: false,
    has_previous: false
  });
  const hasInitializedFiltersRef = useRef(false);

  // Theme-aware CSS classes
  const getBgClass = () => combine(
    get('bg', 'primary'),
    'min-h-screen transition-colors duration-200'
  );

  const getCardGradientClass = (color: string = 'blue') => {
    const baseClasses = combine(
      'rounded-xl sm:rounded-2xl p-4 sm:p-6 border shadow-lg transition-all duration-300 group hover:shadow-xl my-2',
      get('border', 'primary')
    );

    const gradients = {
      blue: theme === 'dark' ? 'from-gray-800 to-blue-900/10' : 'from-white to-blue-50',
      emerald: theme === 'dark' ? 'from-gray-800 to-emerald-900/10' : 'from-white to-emerald-50',
      amber: theme === 'dark' ? 'from-gray-800 to-amber-900/10' : 'from-white to-amber-50',
      pink: theme === 'dark' ? 'from-gray-800 to-pink-900/10' : 'from-white to-pink-50',
      indigo: theme === 'dark' ? 'from-gray-800 to-indigo-900/10' : 'from-white to-indigo-50',
      purple: theme === 'dark' ? 'from-gray-800 to-purple-900/10' : 'from-white to-purple-50',
    };

    return combine(baseClasses, 'bg-gradient-to-br', gradients[color as keyof typeof gradients] || gradients.blue);
  };

  const getStatsCardClass = (color: 'blue' | 'emerald' | 'amber' | 'pink' | 'indigo' | 'purple' = 'blue') => {
    return getCardGradientClass(color);
  };

  const getInputClass = () => combine(
    'px-3 sm:px-4 py-2.5 sm:py-3.5 rounded-lg sm:rounded-xl border outline-none transition-all w-full',
    theme === 'dark' ? '[color-scheme:dark]' : '[color-scheme:light]',
    'text-xs sm:text-sm',
    '!bg-[var(--color-bg-card)]',
    '!text-[var(--color-text-primary)]',
    'border-[var(--color-border-secondary)]',
    'placeholder:text-xs sm:placeholder:text-sm placeholder:text-[var(--color-text-tertiary)]',
    '[&>option]:bg-[var(--color-bg-card)] [&>option]:text-[var(--color-text-primary)]',
    'hover:border-[var(--color-border-strong)]',
    'focus:ring-2 focus:ring-blue-500',
    'focus:border-[var(--color-accent-primary)]',
    'disabled:opacity-50 disabled:cursor-not-allowed',
  );

  const getPrimaryButtonClass = () => combine(
    'px-4 sm:px-6 py-2.5 sm:py-3.5 rounded-lg sm:rounded-xl transition-all duration-200 font-medium',
    'text-white shadow-lg hover:shadow-xl hover:scale-[1.02] active:scale-[0.98]',
    'text-xs sm:text-sm',
    theme === 'dark'
      ? 'bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800'
      : 'bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700'
  );

  const getSecondaryButtonClass = () => combine(
    'px-3 sm:px-4 py-2 sm:py-3 rounded-lg sm:rounded-xl transition-all duration-200 font-medium hover:scale-[1.02] active:scale-[0.98]',
    'text-xs sm:text-sm',
    'border',
    get('border', 'secondary'),
    get('bg', 'card'),
    get('text', 'secondary'),
    'hover:bg-[var(--color-bg-hover)] hover:text-[var(--color-text-primary)]'
  );

  const getStatusBadgeClass = (status: string) => {
    const colorMap = {
      Pending: {
        bg: theme === 'dark' ? 'from-amber-900/30 to-amber-800/30' : 'from-amber-100 to-amber-200',
        text: theme === 'dark' ? 'text-amber-300' : 'text-amber-700',
        border: theme === 'dark' ? 'border-amber-800' : 'border-amber-200',
        icon: FiClock
      },
      Approved: {
        bg: theme === 'dark' ? 'from-emerald-900/30 to-emerald-800/30' : 'from-emerald-100 to-emerald-200',
        text: theme === 'dark' ? 'text-emerald-300' : 'text-emerald-700',
        border: theme === 'dark' ? 'border-emerald-800' : 'border-emerald-200',
        icon: FiCheckCircle
      },
      Rejected: {
        bg: theme === 'dark' ? 'from-red-900/30 to-red-800/30' : 'from-red-100 to-red-200',
        text: theme === 'dark' ? 'text-red-300' : 'text-red-700',
        border: theme === 'dark' ? 'border-red-800' : 'border-red-200',
        icon: FiXCircle
      },
    };

    const colors = colorMap[status as keyof typeof colorMap] || colorMap.Pending;
    const Icon = colors.icon;
    
    return {
      class: combine(
        'px-3 py-1.5 text-sm font-medium rounded-full bg-gradient-to-r flex items-center space-x-2',
        colors.bg,
        colors.text,
        'border',
        colors.border
      ),
      Icon
    };
  };

  const getUserTypeBadgeClass = (userType: string) => {
    const colorMap = {
      teacher: {
        bg: theme === 'dark' ? 'from-purple-900/30 to-purple-800/30' : 'from-purple-100 to-purple-200',
        text: theme === 'dark' ? 'text-purple-300' : 'text-purple-700',
        border: theme === 'dark' ? 'border-purple-800' : 'border-purple-200'
      },
      staff: {
        bg: theme === 'dark' ? 'from-indigo-900/30 to-indigo-800/30' : 'from-indigo-100 to-indigo-200',
        text: theme === 'dark' ? 'text-indigo-300' : 'text-indigo-700',
        border: theme === 'dark' ? 'border-indigo-800' : 'border-indigo-200'
      },
    };

    const colors = colorMap[userType as keyof typeof colorMap] || colorMap.staff;
    return combine(
      'px-2 py-1 text-xs font-medium rounded-full bg-gradient-to-r',
      colors.bg,
      colors.text,
      'border',
      colors.border
    );
  };

  // Fetch leave requests with server-side filtering
  const fetchLeaveRequests = useCallback(async (params?: FilterParams, targetPage?: number) => {
    setLoading(true);
    setError(null);
    
    try {
      // Build query parameters for server-side filtering
      const queryParams: Record<string, string | number> = {};
      
      // Only add status if it's not 'all' (API might not support 'all')
      if (params?.status && params.status !== 'all') {
        queryParams.status = params.status;
      }
      
      if (params?.month) {
        queryParams.month = params.month;
      }
      
      if (params?.year) {
        queryParams.year = params.year;
      }
      if (params?.search) {
        queryParams.search = params.search;
      }
      if (params?.user_type) {
        queryParams.user_type = params.user_type;
      }
      if (params?.role) {
        queryParams.role = params.role;
      }
      queryParams.page = targetPage || params?.page || currentPage;
      queryParams.page_size = itemsPerPage;
      Object.assign(queryParams, schoolScope.scopeParams);

      const response = await adminApi.leaves.adminActionPaginated(queryParams);
      
      // Handle response based on API structure
      let leaves: LeaveRequest[] = [];
      
      if (response.data && response.data.data) {
        leaves = response.data.data;
      } else if (Array.isArray(response.data)) {
        leaves = response.data;
      } else {
        console.error('Unexpected response format:', response.data);
        throw new Error('Invalid response format from server');
      }
      
      setLeaveRequests(leaves);
      if (response.data?.summary) {
        setStats(response.data.summary);
      } else {
        calculateStats(leaves);
      }
      if (response.data?.pagination) {
        setPagination(response.data.pagination);
        if (response.data.pagination.page !== currentPage) {
          setCurrentPage(response.data.pagination.page);
        }
      }
      
    } catch (error: any) {
      console.error('Error fetching leave requests:', error);
      
      if (error?.response?.status === 403) {
        setError('You do not have permission to access leave management');
        toastError('Access denied. Admin privileges required.');
      } else if (error?.response?.status === 500) {
        setError('Server error. Please try again later.');
        toastError('Database connection error');
      } else if (error?.message === 'Network Error') {
        setError('Network error. Please check your connection.');
        toastError('Network error. Unable to connect to server.');
      } else {
        setError(error?.response?.data?.error || 'Failed to fetch leave requests');
        toastError(error?.response?.data?.error || 'Failed to fetch leave requests');
      }
      
      setLeaveRequests([]);
      calculateStats([]);
    } finally {
      setLoading(false);
    }
  }, [currentPage, itemsPerPage, schoolScope.selectedSchoolId]);

  // Calculate statistics
  const calculateStats = (leaves: LeaveRequest[]) => {
    const pending = leaves.filter(l => l.status === 'Pending').length;
    const approved = leaves.filter(l => l.status === 'Approved').length;
    const rejected = leaves.filter(l => l.status === 'Rejected').length;
    
    setStats({
      pending,
      approved,
      rejected,
      total: leaves.length
    });
  };

  // Apply filters (server-side)
  const applyFilters = useCallback(() => {
    const params: FilterParams = {};
    
    // Only include status if it's not 'all'
    if (filterStatus && filterStatus !== 'all') {
      params.status = filterStatus;
    }
    
    if (filterMonth) {
      params.month = filterMonth;
    }
    
    if (filterYear) {
      params.year = filterYear;
    }
    if (searchTerm.trim()) {
      params.search = searchTerm.trim();
    }
    if (filterUserType !== 'all') {
      params.user_type = filterUserType;
    }
    if (filterRole !== 'all') {
      params.role = filterRole;
    }
    params.page = 1;
    params.page_size = itemsPerPage;
    
    setAppliedFilters(params);
    setCurrentPage(1);
    fetchLeaveRequests(params, 1);
  }, [filterStatus, filterMonth, filterYear, searchTerm, filterUserType, filterRole, fetchLeaveRequests, itemsPerPage]);

  // Initial fetch
  useEffect(() => {
    setCurrentPage(1);
    setSelectedLeave(null);
    setShowActionModal(false);
    setAppliedFilters({ page: 1, page_size: itemsPerPage });
    fetchLeaveRequests({ page: 1, page_size: itemsPerPage }, 1);
  }, [fetchLeaveRequests, itemsPerPage, schoolScope.selectedSchoolId]);

  // Handle filter changes with debounce
  useEffect(() => {
    if (!hasInitializedFiltersRef.current) {
      hasInitializedFiltersRef.current = true;
      return;
    }

    const timer = setTimeout(() => {
      applyFilters();
    }, 500);

    return () => clearTimeout(timer);
  }, [filterStatus, filterMonth, filterYear, searchTerm, filterUserType, filterRole, applyFilters]);

  // Handle leave action
  const handleLeaveAction = async () => {
    if (!actionData.leave_id) {
      toastInfo('Invalid leave request');
      return;
    }

    if (!actionData.action) {
      toastInfo('Please select an action');
      return;
    }

    setActionLoading(true);
    
    try {
      const response = await adminApi.leaves.takeAction({
        ...actionData,
        ...schoolScope.scopeParams,
      });
      
      toastSuccess(response.data?.message || `Request ${actionData.action} successfully`);
      
      // Close modal and reset
      setShowActionModal(false);
      setSelectedLeave(null);
      setActionData({ leave_id: 0, action: 'Approved', comment: '' });
      
      // Refresh the list with current filters
      await fetchLeaveRequests(appliedFilters);
      requestSidebarCountsRefresh();
      
    } catch (error: any) {
      console.error('Error taking action:', error);
      
      if (error?.response?.status === 400) {
        const errorData = error.response.data;
        if (errorData.leave_id) toastError('Leave ID is required');
        else if (errorData.action) toastError('Action is required');
        else toastError(errorData.error || 'Invalid request');
      } else if (error?.response?.status === 403) {
        toastError(error?.response?.data?.error || 'Permission denied');
      } else if (error?.response?.status === 404) {
        toastError('Leave request not found');
      } else {
        toastError(error?.response?.data?.error || error?.message || 'Failed to process action');
      }
    } finally {
      setActionLoading(false);
    }
  };

  // Prepare action modal
  const prepareActionModal = (leave: LeaveRequest, action: 'Approved' | 'Rejected') => {
    if (leave.status !== 'Pending') {
      toastInfo('This request has already been processed');
      return;
    }
    
    setSelectedLeave(leave);
    setActionData({
      leave_id: leave.id,
      action,
      comment: ''
    });
    setShowActionModal(true);
  };

  // View proof
  const viewProof = (proofFile: string) => {
    if (!proofFile) {
      toastInfo('No proof file attached');
      return;
    }
    
    const baseUrl = process.env.NEXT_PUBLIC_API_URL || 'https://senthurvidyalaya-backend.onrender.com';
    const fileUrl = proofFile.startsWith('http') ? proofFile : `${baseUrl}${proofFile}`;
    setProofUrl(fileUrl);
    setShowProofModal(true);
  };

  // Client-side sorting (current page records)
  const sortedLeaves = useMemo(() => {
    return [...leaveRequests].sort((a, b) => {
      const aValue = a[sortConfig.key as keyof LeaveRequest];
      const bValue = b[sortConfig.key as keyof LeaveRequest];

      if (aValue === null || bValue === null || aValue === undefined || bValue === undefined) return 0;

      if (typeof aValue === 'string' && typeof bValue === 'string') {
        const comparison = aValue.localeCompare(bValue);
        return sortConfig.direction === 'asc' ? comparison : -comparison;
      }

      if (aValue < bValue) return sortConfig.direction === 'asc' ? -1 : 1;
      if (aValue > bValue) return sortConfig.direction === 'asc' ? 1 : -1;
      return 0;
    });

  }, [leaveRequests, sortConfig]);

  // Pagination
  const totalPages = pagination.total_pages || 1;
  const activePage = pagination.page || currentPage;
  const indexOfFirstItem = pagination.total > 0 ? ((activePage - 1) * itemsPerPage) + 1 : 0;
  const indexOfLastItem = pagination.total > 0 ? ((activePage - 1) * itemsPerPage) + sortedLeaves.length : 0;
  const currentLeaves = sortedLeaves;

  // Get unique roles
  const uniqueRoles = useMemo(() =>
    Array.from(new Set(leaveRequests.map(l => l.role).filter(role => role?.trim()))), [leaveRequests]
  );

  // Calculate leave duration
  const calculateDuration = (startDate: string, endDate: string) => {
    const start = new Date(startDate);
    const end = new Date(endDate);
    const diffTime = Math.abs(end.getTime() - start.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
    return diffDays;
  };

  // Format date
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  // Generate months and years for filters
  const months = [
    { value: '', label: 'All Months' },
    { value: '1', label: 'January' },
    { value: '2', label: 'February' },
    { value: '3', label: 'March' },
    { value: '4', label: 'April' },
    { value: '5', label: 'May' },
    { value: '6', label: 'June' },
    { value: '7', label: 'July' },
    { value: '8', label: 'August' },
    { value: '9', label: 'September' },
    { value: '10', label: 'October' },
    { value: '11', label: 'November' },
    { value: '12', label: 'December' },
  ];

  const currentYear = new Date().getFullYear();
  const years = [
    { value: '', label: 'All Years' },
    ...Array.from({ length: 5 }, (_, i) => ({
      value: (currentYear - i).toString(),
      label: (currentYear - i).toString()
    }))
  ];

  // Handle page change
  const handlePageChange = (page: number) => {
    if (page >= 1 && page <= totalPages) {
      setCurrentPage(page);
      const nextFilters: FilterParams = {
        ...appliedFilters,
        page,
        page_size: itemsPerPage
      };
      setAppliedFilters(nextFilters);
      fetchLeaveRequests(nextFilters, page);
    }
  };

  // Handle sort
  const handleSort = (key: string) => {
    setSortConfig(current => ({
      key,
      direction: current.key === key && current.direction === 'asc' ? 'desc' : 'asc'
    }));
  };

  // Clear all filters
  const clearAllFilters = () => {
    setSearchTerm('');
    setFilterStatus('all');
    setFilterUserType('all');
    setFilterRole('all');
    setFilterMonth('');
    setFilterYear('');
    setCurrentPage(1);
    setAppliedFilters({ page: 1, page_size: itemsPerPage });
    fetchLeaveRequests({ page: 1, page_size: itemsPerPage }, 1);
  };

  const exportToCSV = async () => {
    try {
      const allLeaves: LeaveRequest[] = [];
      let page = 1;
      let hasMore = true;
      const exportPageSize = 200;

      while (hasMore) {
        const queryParams: Record<string, string | number> = {};

        if (appliedFilters.status && appliedFilters.status !== 'all') {
          queryParams.status = appliedFilters.status;
        }
        if (appliedFilters.month) {
          queryParams.month = appliedFilters.month;
        }
        if (appliedFilters.year) {
          queryParams.year = appliedFilters.year;
        }
        if (appliedFilters.search) {
          queryParams.search = appliedFilters.search;
        }
        Object.assign(queryParams, schoolScope.scopeParams);
        if (appliedFilters.user_type) {
          queryParams.user_type = appliedFilters.user_type;
        }
        if (appliedFilters.role) {
          queryParams.role = appliedFilters.role;
        }

        queryParams.page = page;
        queryParams.page_size = exportPageSize;

        const response = await adminApi.leaves.adminActionPaginated(queryParams);
        const pageData = Array.isArray(response.data?.data) ? response.data.data : [];
        allLeaves.push(...pageData);

        const pagePagination = response.data?.pagination;
        if (pagePagination && typeof pagePagination === 'object') {
          hasMore = Boolean(pagePagination.has_next);
          page = Number(pagePagination.page || page) + 1;
        } else {
          hasMore = false;
        }
      }

      if (allLeaves.length === 0) {
        toastInfo('No leave records to export');
        return;
      }

      const csvHeaders = [
        'Leave ID',
        'User Type',
        'Role',
        'Requester Name',
        'Requester ID',
        'Academic Year',
        'Start Date',
        'End Date',
        'Reason',
        'Status',
        'Admin Comment',
        'Approved By',
        'Created At',
      ];

      const csvRows = allLeaves.map((leave) => [
        leave.id,
        leave.user_type,
        leave.role || '',
        leave.requester_name || '',
        leave.requester_id || '',
        leave.academic_year_name || leave.academic_year || '',
        leave.start_date || '',
        leave.end_date || '',
        leave.reason || '',
        leave.status || '',
        leave.admin_comment || '',
        leave.approved_by_name || '',
        leave.created_at || '',
      ]);

      const csvContent = [
        csvHeaders.join(','),
        ...csvRows.map((row) =>
          row.map((field) => `"${String(field ?? '').replace(/"/g, '""')}"`).join(',')
        ),
      ].join('\n');

      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `leave_requests_${new Date().toISOString().split('T')[0]}.csv`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
      toastSuccess(`CSV exported successfully! (${allLeaves.length} records)`);
    } catch (error) {
      console.error('Error exporting leave CSV:', error);
      toastError('Failed to export CSV');
    }
  };

  return (
    <div className={`dashboard-typography p-3 md:p-4 xl:p-6 ${getBgClass()} transition-colors duration-200`}>
      <div className="mx-auto w-full max-w-[1600px]">
        {/* HEADER SECTION */}
        <div className="mb-6 sm:mb-8">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between mb-4 sm:mb-6 gap-4">
            <div className="flex items-center space-x-3 sm:space-x-4">
              <div className={combine(
                "p-2 sm:p-3 rounded-xl sm:rounded-2xl shadow-lg",
                theme === 'dark'
                  ? "bg-gradient-to-br from-blue-600 to-blue-700"
                  : "bg-gradient-to-br from-blue-500 to-blue-600"
              )}>
                <FaCalendar className="text-xl sm:text-2xl text-white" />
              </div>
              <div>
                <h1 className={combine("text-xl sm:text-2xl md:text-3xl font-bold", get('text', 'primary'))}>
                  Leave Management
                </h1>
                <p className={combine("text-xs sm:text-sm mt-0.5 sm:mt-1 flex items-center", get('text', 'secondary'))}>
                  <FaUserTie className="mr-2 text-xs sm:text-sm" />
                  Approve or reject leave requests from staff and teachers
                </p>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row gap-2 sm:gap-3 w-full lg:w-auto">
              <SchoolScopeSelector {...schoolScope} className="w-full sm:w-auto" />
              <button
                onClick={exportToCSV}
                className={combine(getSecondaryButtonClass(), "flex items-center justify-center space-x-2 w-full sm:w-auto")}
                disabled={loading}
              >
                <FaDownload className="text-xs sm:text-sm" />
                <span>Export CSV</span>
              </button>
              <button
                onClick={() => fetchLeaveRequests(appliedFilters)}
                className={combine(getSecondaryButtonClass(), "flex items-center justify-center space-x-2 w-full sm:w-auto")}
                disabled={loading}
              >
                <FaRedoAlt className={`text-xs sm:text-sm ${loading ? 'animate-spin' : ''}`} />
                <span>Refresh</span>
              </button>
            </div>
          </div>

          {/* STATISTICS */}
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3 sm:gap-4 md:gap-6 mb-4 sm:mb-6 md:mb-8">
            <div className={getStatsCardClass('amber')}>
              <div className="flex items-center justify-between">
                <div>
                  <p className={combine("text-xs font-medium", get('text', 'secondary'))}>Pending Requests</p>
                  <p className={combine("text-lg sm:text-xl md:text-2xl font-bold mt-1 sm:mt-2", get('text', 'primary'))}>
                    {stats.pending}
                  </p>
                </div>
                <div className={combine(
                  "p-1.5 sm:p-2 rounded-lg sm:rounded-xl",
                  theme === 'dark' ? 'bg-amber-900/30' : 'bg-amber-100'
                )}>
                  <FiClock className={combine(
                    "text-base sm:text-lg",
                    theme === 'dark' ? 'text-amber-400' : 'text-amber-600'
                  )} />
                </div>
              </div>
              <div className={combine("mt-1 sm:mt-2 md:mt-3 text-xs", get('text', 'tertiary'))}>
                Awaiting admin action
              </div>
            </div>

            <div className={getStatsCardClass('emerald')}>
              <div className="flex items-center justify-between">
                <div>
                  <p className={combine("text-xs font-medium", get('text', 'secondary'))}>Approved</p>
                  <p className={combine("text-lg sm:text-xl md:text-2xl font-bold mt-1 sm:mt-2", get('text', 'primary'))}>
                    {stats.approved}
                  </p>
                </div>
                <div className={combine(
                  "p-1.5 sm:p-2 rounded-lg sm:rounded-xl",
                  theme === 'dark' ? 'bg-emerald-900/30' : 'bg-emerald-100'
                )}>
                  <FiCheckCircle className={combine(
                    "text-base sm:text-lg",
                    theme === 'dark' ? 'text-emerald-400' : 'text-emerald-600'
                  )} />
                </div>
              </div>
              <div className={combine("mt-1 sm:mt-2 md:mt-3 text-xs", get('accent', 'success'))}>
                {stats.total > 0 ? `${((stats.approved / stats.total) * 100).toFixed(1)}% approval rate` : '0%'}
              </div>
            </div>

            <div className={getStatsCardClass('pink')}>
              <div className="flex items-center justify-between">
                <div>
                  <p className={combine("text-xs font-medium", get('text', 'secondary'))}>Rejected</p>
                  <p className={combine("text-lg sm:text-xl md:text-2xl font-bold mt-1 sm:mt-2", get('text', 'primary'))}>
                    {stats.rejected}
                  </p>
                </div>
                <div className={combine(
                  "p-1.5 sm:p-2 rounded-lg sm:rounded-xl",
                  theme === 'dark' ? 'bg-pink-900/30' : 'bg-pink-100'
                )}>
                  <FiXCircle className={combine(
                    "text-base sm:text-lg",
                    theme === 'dark' ? 'text-pink-400' : 'text-pink-600'
                  )} />
                </div>
              </div>
              <div className={combine("mt-1 sm:mt-2 md:mt-3 text-xs", get('accent', 'warning'))}>
                {stats.total > 0 ? `${((stats.rejected / stats.total) * 100).toFixed(1)}% rejection rate` : '0%'}
              </div>
            </div>

            <div className={getStatsCardClass('blue')}>
              <div className="flex items-center justify-between">
                <div>
                  <p className={combine("text-xs font-medium", get('text', 'secondary'))}>Total Requests</p>
                  <p className={combine("text-lg sm:text-xl md:text-2xl font-bold mt-1 sm:mt-2", get('text', 'primary'))}>
                    {stats.total}
                  </p>
                </div>
                <div className={combine(
                  "p-1.5 sm:p-2 rounded-lg sm:rounded-xl",
                  theme === 'dark' ? 'bg-blue-900/30' : 'bg-blue-100'
                )}>
                  <FaCalendar className={combine(
                    "text-base sm:text-lg",
                    theme === 'dark' ? 'text-blue-400' : 'text-blue-600'
                  )} />
                </div>
              </div>
              <div className={combine("mt-1 sm:mt-2 md:mt-3 text-xs", get('accent', 'primary'))}>
                All leave requests
              </div>
            </div>
          </div>

          {/* FILTERS SECTION */}
          <div className={combine(
            getCardGradientClass('indigo'),
            "transition-all duration-200 backdrop-blur-md bg-opacity-95 mb-4"
          )}>
              <div className="flex flex-col lg:flex-row lg:items-center lg:space-x-6 space-y-4 lg:space-y-0">
                <div className="flex-1">
                  <label className={combine("block text-sm font-medium mb-2", get('text', 'primary'))}>
                    <FaSearch className="inline mr-2 text-sm" />
                    Search
                  </label>
                  <div className="relative">
                    <FaSearch className={combine(
                      "absolute left-3 top-1/2 transform -translate-y-1/2 text-sm",
                      get('icon', 'secondary')
                    )} />
                    <input
                      type="text"
                      placeholder="Search by name, ID, or reason..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className={getInputClass()}
                      style={{ paddingLeft: '2.5rem' }}
                    />
                  </div>
                </div>

                <div className="flex-1">
                  <label className={combine("block text-sm font-medium mb-2", get('text', 'primary'))}>
                    <FaFilter className="inline mr-2 text-sm" />
                    Status
                  </label>
                  <select
                    value={filterStatus}
                    onChange={(e) => setFilterStatus(e.target.value)}
                    className={getInputClass()}
                  >
                    <option value="all">All Status</option>
                    <option value="Pending">Pending</option>
                    <option value="Approved">Approved</option>
                    <option value="Rejected">Rejected</option>
                  </select>
                </div>

                <div className="flex-1">
                  <label className={combine("block text-sm font-medium mb-2", get('text', 'primary'))}>
                    <FaUser className="inline mr-2 text-sm" />
                    User Type 
                  </label>
                  <select
                    value={filterUserType}
                    onChange={(e) => setFilterUserType(e.target.value)}
                    className={getInputClass()}
                  >
                    <option value="all">All Types</option>
                    <option value="staff">Staff</option>
                    <option value="teacher">Teacher</option>
                  </select>
                </div>

                <div className="flex-1">
                  <label className={combine("block text-sm font-medium mb-2", get('text', 'primary'))}>
                    <FaUserTie className="inline mr-2 text-sm" />
                    Role
                  </label>
                  <select
                    value={filterRole}
                    onChange={(e) => setFilterRole(e.target.value)}
                    className={getInputClass()}
                  >
                    <option value="all">All Roles</option>
                    {uniqueRoles.map(role => (
                      <option key={role} value={role}>{role.replace('_', ' ')}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
                <div>
                  <label className={combine("block text-sm font-medium mb-2", get('text', 'primary'))}>
                    <FiCalendar className="inline mr-2 text-sm" />
                    Month
                  </label>
                  <select
                    value={filterMonth}
                    onChange={(e) => setFilterMonth(e.target.value)}
                    className={getInputClass()}
                  >
                    {months.map(month => (
                      <option key={month.value} value={month.value}>{month.label}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className={combine("block text-sm font-medium mb-2", get('text', 'primary'))}>
                    <FiCalendar className="inline mr-2 text-sm" />
                    Year 
                  </label>
                  <select
                    value={filterYear}
                    onChange={(e) => setFilterYear(e.target.value)}
                    className={getInputClass()}
                  >
                    {years.map(year => (
                      <option key={year.value} value={year.value}>{year.label}</option>
                    ))}
                  </select>
                </div>

                <div className="flex items-end space-x-2">
                  <button
                    onClick={applyFilters}
                    className={combine(getPrimaryButtonClass(), "flex-1 text-sm")}
                    disabled={loading}
                  >
                    Apply Filters
                  </button>
                  <button
                    onClick={clearAllFilters}
                    className={combine(getSecondaryButtonClass(), "flex-1 text-sm")}
                  >
                    Clear All
                  </button>
                </div>
              </div>

              {/* Active Filters Indicator */}
              {Object.keys(appliedFilters).length > 0 && (
                <div className="mt-4 pt-3 border-t border-[var(--color-border-secondary)]">
                  <p className={combine("text-xs flex items-center", get('text', 'secondary'))}>
                    <FaFilter className="mr-1" />
                    Active server filters: 
                    {appliedFilters.status && <span className="ml-1 font-medium">{appliedFilters.status}</span>}
                    {appliedFilters.month && <span className="ml-1 font-medium">Month: {months.find(m => m.value === appliedFilters.month)?.label}</span>}
                    {appliedFilters.year && <span className="ml-1 font-medium">Year: {appliedFilters.year}</span>}
                  </p>
                </div>
              )}
            </div>

          {/* LEAVE REQUESTS TABLE */}
          <div className={getCardGradientClass()}>
            <div className={combine(
              "p-4 border-b",
              get('border', 'primary'),
              get('bg', 'secondary'),
            )}>
              <div className="flex flex-col md:flex-row justify-between items-start md:items-center space-y-3 md:space-y-0">
                <div>
                  <h3 className={combine("text-lg font-bold", get('text', 'primary'))}>Leave Requests</h3>
                  <p className={combine("text-sm mt-1", get('text', 'secondary'))}>
                    {appliedFilters.status ? `Showing ${appliedFilters.status} requests` : 'Showing all requests'}
                    {appliedFilters.month && ` for ${months.find(m => m.value === appliedFilters.month)?.label}`}
                    {appliedFilters.year && ` ${appliedFilters.year}`}
                  </p>
                </div>

                {!loading && !error && (
                  <div className={combine("text-xs", get('text', 'tertiary'))}>
                    Showing {indexOfFirstItem} to {indexOfLastItem} of {pagination.total} requests
                  </div>
                )}
              </div>
            </div>

            <div className="overflow-x-auto">
              {loading ? (
                <div className="p-8 text-center">
                  <div className="text-center">
                    <div className="relative mx-auto w-16 h-16">
                      <div className="animate-spin rounded-full h-16 w-16 border-4 border-indigo-200 border-t-indigo-600"></div>
                      <div className="absolute inset-0 flex items-center justify-center">
                        <FaCalendar className="h-8 w-8 text-indigo-600 animate-pulse" />
                      </div>
                    </div>
                    <p className={combine("mt-4 sm:mt-6 text-xs sm:text-sm font-medium", get('text', 'secondary'))}>Loading leave requests...</p>
                    <p className={combine("text-xs sm:text-sm mt-1 sm:mt-2", get('text', 'tertiary'))}>Preparing leave records</p>
                  </div>
                </div>
              ) : error ? (
                <div className="p-8 text-center">
                  <div className={combine(
                    "inline-block p-3 rounded-full mb-3",
                    theme === 'dark' ? 'bg-red-900/30' : 'bg-red-100'
                  )}>
                    <FaExclamationTriangle className={combine(
                      "text-xl",
                      theme === 'dark' ? 'text-red-400' : 'text-red-600'
                    )} />
                  </div>
                  <h3 className={combine("text-base font-medium mb-1", get('text', 'primary'))}>Error Loading Data</h3>
                  <p className={combine("text-sm mb-4", get('text', 'secondary'))}>{error}</p>
                  <button
                    onClick={() => fetchLeaveRequests(appliedFilters)}
                    className={combine(getPrimaryButtonClass(), "text-sm")}
                  >
                    Try Again
                  </button>
                </div>
              ) : currentLeaves.length === 0 ? (
                <div className="p-8 text-center">
                  <div className={combine(
                    "inline-block p-3 rounded-full mb-3",
                    theme === 'dark' ? 'bg-blue-900/30' : 'bg-blue-100'
                  )}>
                    <FaCalendar className={combine(
                      "text-xl",
                      theme === 'dark' ? 'text-blue-400' : 'text-blue-500'
                    )} />
                  </div>
                  <h3 className={combine("text-base font-medium mb-1", get('text', 'primary'))}>No leave requests found</h3>
                  <p className={combine("text-sm mb-4", get('text', 'secondary'))}>
                    {searchTerm || filterUserType !== 'all' || filterRole !== 'all'
                      ? 'Try adjusting your search or client-side filters'
                      : 'No leave requests available with the current server filters'}
                  </p>
                  {(searchTerm || filterUserType !== 'all' || filterRole !== 'all') && (
                    <button
                      onClick={() => {
                        setSearchTerm('');
                        setFilterUserType('all');
                        setFilterRole('all');
                      }}
                      className={combine(getSecondaryButtonClass(), "text-sm mr-2")}
                    >
                      Clear Client Filters
                    </button>
                  )}
                  {(filterStatus !== 'Pending' || filterMonth || filterYear) && (
                    <button
                      onClick={clearAllFilters}
                      className={combine(getSecondaryButtonClass(), "text-sm")}
                    >
                      Clear All Filters
                    </button>
                  )}
                </div>
              ) : (
                <>
                  <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                    <thead className={combine(
                      "sticky top-0 z-20",
                      "bg-[var(--color-bg-secondary)]",
                      "divide-y",
                      get('border', 'primary')
                    )}>
                      <tr>
                        <th
                          className={combine(
                            "px-4 py-3 text-left text-xs font-medium uppercase tracking-wider cursor-pointer transition-colors",
                            get('text', 'tertiary'),
                            "hover:bg-[var(--color-bg-hover)] bg-[var(--color-bg-secondary)]"
                          )}
                          onClick={() => handleSort('requester_name')}
                        >
                          <div className="flex items-center space-x-2">
                            <FaUser className="text-xs" />
                            <span className="text-xs">Requester</span>
                            {sortConfig.key === 'requester_name' && (
                              sortConfig.direction === 'asc' ? 
                                <FaSortUp className={get('accent', 'primary') + " text-xs"} /> : 
                                <FaSortDown className={get('accent', 'primary') + " text-xs"} />
                            )}
                          </div>
                        </th>
                        <th className={combine("px-4 py-3 text-left text-xs font-medium uppercase tracking-wider", get('text', 'tertiary'), "bg-[var(--color-bg-secondary)]")}>
                          <div className="flex items-center space-x-2">
                            <FaUserTie className="text-xs" />
                            <span className="text-xs">User Type / Role</span>
                          </div>
                        </th>
                        <th
                          className={combine(
                            "px-4 py-3 text-left text-xs font-medium uppercase tracking-wider cursor-pointer transition-colors",
                            get('text', 'tertiary'),
                            "hover:bg-[var(--color-bg-hover)] bg-[var(--color-bg-secondary)]"
                          )}
                          onClick={() => handleSort('start_date')}
                        >
                          <div className="flex items-center space-x-2">
                            <FiCalendar className="text-xs" />
                            <span className="text-xs">Leave Dates</span>
                            {sortConfig.key === 'start_date' && (
                              sortConfig.direction === 'asc' ? 
                                <FaSortUp className={get('accent', 'primary') + " text-xs"} /> : 
                                <FaSortDown className={get('accent', 'primary') + " text-xs"} />
                            )}
                          </div>
                        </th>
                        <th className={combine("px-4 py-3 text-left text-xs font-medium uppercase tracking-wider", get('text', 'tertiary'), "bg-[var(--color-bg-secondary)]")}>
                          <div className="flex items-center space-x-2">
                            <FaFileAlt className="text-xs" />
                            <span className="text-xs">Reason</span>
                          </div>
                        </th>
                        <th
                          className={combine(
                            "px-4 py-3 text-left text-xs font-medium uppercase tracking-wider cursor-pointer transition-colors",
                            get('text', 'tertiary'),
                            "hover:bg-[var(--color-bg-hover)] bg-[var(--color-bg-secondary)]"
                          )}
                          onClick={() => handleSort('status')}
                        >
                          <div className="flex items-center space-x-2">
                            <FaCheckCircle className="text-xs" />
                            <span className="text-xs">Status</span>
                            {sortConfig.key === 'status' && (
                              sortConfig.direction === 'asc' ? 
                                <FaSortUp className={get('accent', 'primary') + " text-xs"} /> : 
                                <FaSortDown className={get('accent', 'primary') + " text-xs"} />
                            )}
                          </div>
                        </th>
                        <th className={combine("px-4 py-3 text-left text-xs font-medium uppercase tracking-wider", get('text', 'tertiary'), "bg-[var(--color-bg-secondary)]")}>
                          <div className="flex items-center space-x-2">
                            <FaChartBar className="text-xs" />
                            <span className="text-xs">Actions</span>
                          </div>
                        </th>
                      </tr>
                    </thead>
                    <tbody className={combine("divide-y", get('border', 'primary'))}>
                      {currentLeaves.map((leave) => {
                        const statusBadge = getStatusBadgeClass(leave.status);
                        const StatusIcon = statusBadge.Icon;
                        const duration = calculateDuration(leave.start_date, leave.end_date);
                        
                        return (
                          <tr key={leave.id} className="transition-colors duration-150 hover:bg-[var(--color-bg-hover)]">
                            {/* Requester Info */}
                            <td className="px-4 py-3">
                              <div className="flex items-center">
                                <div className={combine(
                                  "h-10 w-10 rounded-full flex items-center justify-center mr-3 flex-shrink-0",
                                  leave.user_type === 'teacher'
                                    ? theme === 'dark' ? 'bg-purple-900/30' : 'bg-purple-100'
                                    : theme === 'dark' ? 'bg-indigo-900/30' : 'bg-indigo-100'
                                )}>
                                  {leave.user_type === 'teacher' ? (
                                    <FaUserGraduate className={theme === 'dark' ? 'text-purple-400 text-sm' : 'text-purple-600 text-sm'} />
                                  ) : (
                                    <FaUserTie className={theme === 'dark' ? 'text-indigo-400 text-sm' : 'text-indigo-600 text-sm'} />
                                  )}
                                </div>
                                <div>
                                  <h4 className={combine("font-semibold text-sm", get('text', 'primary'))}>
                                    {leave.requester_name}
                                  </h4>
                                  <p className={combine("text-xs", get('text', 'secondary'))}>
                                    ID: {leave.requester_id}
                                  </p>
                                </div>
                              </div>
                            </td>

                            {/* User Type / Role */}
                            <td className="px-4 py-3">
                              <div className="space-y-2">
                                <span className={getUserTypeBadgeClass(leave.user_type)}>
                                  {leave.user_type}
                                </span>
                                <p className={combine("text-xs", get('text', 'secondary'))}>
                                  {leave.role.replace('_', ' ')}
                                </p>
                              </div>
                            </td>

                            {/* Leave Dates */}
                            <td className="px-4 py-3">
                              <div className="space-y-1.5">
                                <div className="flex flex-col">
                                  <span className={combine("font-medium text-sm", get('text', 'primary'))}>
                                    {formatDate(leave.start_date)}
                                  </span>
                                  <span className={combine("text-xs", get('text', 'tertiary'))}>to</span>
                                  <span className={combine("font-medium text-sm", get('text', 'primary'))}>
                                    {formatDate(leave.end_date)}
                                  </span>
                                </div>
                                <div className={combine("text-xs", get('text', 'secondary'))}>
                                  {duration} day{duration > 1 ? 's' : ''}
                                </div>
                              </div>
                            </td>

                            {/* Reason */}
                            <td className="px-4 py-3">
                              <div className="space-y-1.5">
                                <p className={combine("text-xs line-clamp-2", get('text', 'secondary'))}>
                                  {leave.reason}
                                </p>
                                {leave.proof_file && (
                                  <button
                                    onClick={() => viewProof(leave.proof_file!)}
                                    className="text-xs flex items-center space-x-1 text-blue-500 hover:text-blue-600 transition-colors"
                                  >
                                    <FaFilePdf className="text-xs" />
                                    <span className="text-xs">View Proof</span>
                                  </button>
                                )}
                              </div>
                            </td>

                            {/* Status */}
                            <td className="px-4 py-3">
                              <div className="space-y-2">
                                <div className={statusBadge.class}>
                                  <StatusIcon className="text-xs" />
                                  <span className="text-xs">{leave.status}</span>
                                </div>
                                {leave.approved_by_name && leave.status !== 'Pending' && (
                                  <p className={combine("text-xs", get('text', 'secondary'))}>
                                    By: {leave.approved_by_name}
                                  </p>
                                )}
                                {leave.admin_comment && (
                                  <p className={combine("text-xs italic mt-1", get('text', 'tertiary'))}>
                                    "{leave.admin_comment}"
                                  </p>
                                )}
                              </div>
                            </td>

                            {/* Actions */}
                            <td className="px-4 py-3">
                              {leave.status === 'Pending' ? (
                                <div className="flex flex-col space-y-2">
                                  <button
                                    onClick={() => prepareActionModal(leave, 'Approved')}
                                    className="px-3 py-1.5 rounded-xl transition-all duration-200 text-xs font-medium bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-600 hover:to-emerald-700 text-white shadow hover:shadow-md hover:scale-[1.02] active:scale-[0.98]"
                                  >
                                    <FaCheckCircle className="inline mr-1 text-xs" />
                                    Approve
                                  </button>
                                  <button
                                    onClick={() => prepareActionModal(leave, 'Rejected')}
                                    className="px-3 py-1.5 rounded-xl transition-all duration-200 text-xs font-medium bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 text-white shadow hover:shadow-md hover:scale-[1.02] active:scale-[0.98]"
                                  >
                                    <FaTimesCircle className="inline mr-1 text-xs" />
                                    Reject
                                  </button>
                                </div>
                              ) : (
                                <button
                                  onClick={() => {
                                    setSelectedLeave(leave);
                                    setActionData({
                                      leave_id: leave.id,
                                      action: leave.status as 'Approved' | 'Rejected',
                                      comment: leave.admin_comment
                                    });
                                    setShowActionModal(true);
                                  }}
                                  className={combine(
                                    "px-3 py-1.5 rounded-xl transition-all duration-200 text-xs font-medium",
                                    "border",
                                    get('border', 'secondary'),
                                    get('bg', 'card'),
                                    get('text', 'secondary'),
                                    "hover:bg-[var(--color-bg-hover)] hover:text-[var(--color-text-primary)]"
                                  )}
                                >
                                  <FaInfoCircle className="inline mr-1 text-xs" />
                                  View Details
                                </button>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>

                  {/* PAGINATION */}
                  {totalPages > 1 && (
                    <div className={combine("px-4 py-3 border-t", get('border', 'primary'))}>
                      <div className="flex flex-col sm:flex-row justify-between items-center gap-3">
                        <p className={combine("text-xs", get('text', 'tertiary'))}>
                          Page {activePage} of {totalPages}
                        </p>
                        <div className="flex items-center space-x-1.5">
                          <button
                            onClick={() => handlePageChange(activePage - 1)}
                            disabled={!pagination.has_previous}
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
                              } else if (activePage <= 3) {
                                pageNum = i + 1;
                              } else if (activePage >= totalPages - 2) {
                                pageNum = totalPages - 4 + i;
                              } else {
                                pageNum = activePage - 2 + i;
                              }

                              return (
                                <button
                                  key={pageNum}
                                  onClick={() => handlePageChange(pageNum)}
                                  className={combine(
                                    "px-3 py-1.5 rounded-xl transition-all font-medium hover:scale-[1.02] active:scale-[0.98] text-xs",
                                    activePage === pageNum
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
                            onClick={() => handlePageChange(activePage + 1)}
                            disabled={!pagination.has_next}
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
        </div>
      </div>

      {/* ACTION MODAL */}
      {showActionModal && selectedLeave && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50 animate-fade-in backdrop-blur-sm">
          <div className={combine(
            getCardGradientClass(),
            "max-w-md w-full shadow-2xl"
          )}>
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center space-x-3">
                <div className={combine(
                  "p-2 rounded-xl",
                  actionData.action === 'Approved'
                    ? theme === 'dark' ? 'bg-emerald-900/30' : 'bg-emerald-100'
                    : theme === 'dark' ? 'bg-red-900/30' : 'bg-red-100'
                )}>
                  {actionData.action === 'Approved' ? (
                    <FaCheckCircle className={combine(
                      "text-lg",
                      theme === 'dark' ? 'text-emerald-400' : 'text-emerald-600'
                    )} />
                  ) : (
                    <FaTimesCircle className={combine(
                      "text-lg",
                      theme === 'dark' ? 'text-red-400' : 'text-red-600'
                    )} />
                  )}
                </div>
                <div>
                  <h3 className={combine("text-lg font-bold", get('text', 'primary'))}>
                    {selectedLeave.status === 'Pending' ? `${actionData.action} Leave Request` : 'Leave Request Details'}
                  </h3>
                  <p className={combine("text-sm mt-0.5", get('text', 'secondary'))}>
                    {selectedLeave.requester_name} ({selectedLeave.requester_id})
                  </p>
                </div>
              </div>
              <button
                onClick={() => {
                  setShowActionModal(false);
                  setSelectedLeave(null);
                }}
                className={combine(
                  "p-1.5 rounded-xl transition-all hover:bg-[var(--color-bg-hover)]",
                  get('icon', 'secondary') + " text-sm"
                )}
              >
                <FaTimesCircle className="text-sm" />
              </button>
            </div>

            <div className="space-y-4 mb-4">
              <div>
                <label className={combine("block text-sm font-medium mb-1.5", get('text', 'primary'))}>
                  Leave Period
                </label>
                <p className={combine("text-sm", get('text', 'secondary'))}>
                  {formatDate(selectedLeave.start_date)} to {formatDate(selectedLeave.end_date)}
                  <span className={combine("ml-2 text-xs", get('text', 'tertiary'))}>
                    ({calculateDuration(selectedLeave.start_date, selectedLeave.end_date)} days)
                  </span>
                </p>
              </div>

              <div>
                <label className={combine("block text-sm font-medium mb-1.5", get('text', 'primary'))}>
                  Reason
                </label>
                <p className={combine("text-sm italic", get('text', 'secondary'))}>
                  "{selectedLeave.reason}"
                </p>
              </div>

              <div>
                <label className={combine("block text-sm font-medium mb-1.5", get('text', 'primary'))}>
                  Current Status
                </label>
                <div className={getStatusBadgeClass(selectedLeave.status).class}>
                  {selectedLeave.status}
                </div>
              </div>

              {selectedLeave.status !== 'Pending' && (
                <>
                  {selectedLeave.approved_by_name && (
                    <div>
                      <label className={combine("block text-sm font-medium mb-1.5", get('text', 'primary'))}>
                        Processed By
                      </label>
                      <p className={combine("text-sm", get('text', 'secondary'))}>
                        {selectedLeave.approved_by_name}
                      </p>
                    </div>
                  )}

                  {selectedLeave.admin_comment && (
                    <div>
                      <label className={combine("block text-sm font-medium mb-1.5", get('text', 'primary'))}>
                        Admin Comment
                      </label>
                      <p className={combine("text-sm italic", get('text', 'secondary'))}>
                        "{selectedLeave.admin_comment}"
                      </p>
                    </div>
                  )}
                </>
              )}

              {selectedLeave.status === 'Pending' && (
                <div>
                  <label className={combine("block text-sm font-medium mb-1.5", get('text', 'primary'))}>
                    <FaComment className="inline mr-1.5 text-sm" />
                    Admin Comment (Optional)
                  </label>
                  <textarea
                    value={actionData.comment}
                    onChange={(e) => setActionData({ ...actionData, comment: e.target.value })}
                    rows={3}
                    className={combine(getInputClass(), "resize-none")}
                    placeholder="Enter comments or remarks..."
                    disabled={actionLoading}
                  />
                  <p className={combine("text-xs mt-1", get('text', 'tertiary'))}>
                    This comment will be visible to the requester
                  </p>
                </div>
              )}
            </div>

            <div className={combine("flex space-x-2 pt-4 border-t", get('border', 'primary'))}>
              <button
                onClick={() => {
                  setShowActionModal(false);
                  setSelectedLeave(null);
                }}
                className={combine(getSecondaryButtonClass(), "text-sm flex-1")}
                disabled={actionLoading}
              >
                {selectedLeave.status === 'Pending' ? 'Cancel' : 'Close'}
              </button>
              
              {selectedLeave.status === 'Pending' && (
                <button
                  onClick={handleLeaveAction}
                  disabled={actionLoading}
                  className={combine(
                    getPrimaryButtonClass(),
                    "text-sm flex-1",
                    actionData.action === 'Approved'
                      ? theme === 'dark'
                        ? 'bg-gradient-to-r from-emerald-600 to-emerald-700 hover:from-emerald-700 hover:to-emerald-800'
                        : 'bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-600 hover:to-emerald-700'
                      : theme === 'dark'
                        ? 'bg-gradient-to-r from-red-600 to-red-700 hover:from-red-700 hover:to-red-800'
                        : 'bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700',
                    "disabled:opacity-50 disabled:cursor-not-allowed"
                  )}
                >
                  {actionLoading ? (
                    <>
                      <FaSpinner className="animate-spin inline mr-2 text-sm" />
                      Processing...
                    </>
                  ) : (
                    `${actionData.action} Leave`
                  )}
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* PROOF VIEWER MODAL */}
      {showProofModal && proofUrl && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center p-4 z-50 animate-fade-in backdrop-blur-sm">
          <div className={combine(
            getCardGradientClass(),
            "max-w-4xl w-full shadow-2xl max-h-[90vh] overflow-hidden"
          )}>
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center space-x-3">
                <div className={combine(
                  "p-2 rounded-xl",
                  theme === 'dark' ? 'bg-blue-900/30' : 'bg-blue-100'
                )}>
                  <FaFilePdf className={combine(
                    "text-lg",
                    theme === 'dark' ? 'text-blue-400' : 'text-blue-600'
                  )} />
                </div>
                <div>
                  <h3 className={combine("text-lg font-bold", get('text', 'primary'))}>Proof Document</h3>
                  <p className={combine("text-sm mt-0.5", get('text', 'secondary'))}>
                    View leave request proof
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowProofModal(false)}
                className={combine(
                  "p-1.5 rounded-xl transition-all hover:bg-[var(--color-bg-hover)]",
                  get('icon', 'secondary') + " text-sm"
                )}
              >
                <FaTimesCircle className="text-sm" />
              </button>
            </div>

            <div className="h-[70vh] bg-gray-900 rounded-xl overflow-hidden">
              {proofUrl.endsWith('.pdf') ? (
                <iframe
                  src={proofUrl}
                  className="w-full h-full border-0"
                  title="Proof Document"
                />
              ) : (
                <img
                  src={proofUrl}
                  alt="Proof"
                  className="w-full h-full object-contain"
                />
              )}
            </div>

            <div className={combine("flex justify-end pt-4 border-t", get('border', 'primary'))}>
              <button
                onClick={() => window.open(proofUrl, '_blank')}
                className={combine(getPrimaryButtonClass(), "text-sm")}
              >
                Open in New Tab
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
