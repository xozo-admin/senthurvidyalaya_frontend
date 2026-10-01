'use client';

import { adminApi } from '@/lib/api';
import { Fragment, useEffect, useState } from 'react';
import {
  FaTasks,
  FaCalendarAlt,
  FaUserTie,
  FaCheck,
  FaTimes,
  FaPlus,
  FaEdit,
  FaTrash,
  FaSearch,
  FaFilter,
  FaClock,
  FaCalendarDay,
  FaCalendarWeek,
  FaCalendar,
  FaUsers,
  FaClipboardList,
  FaFileAlt,
  FaArrowRight,
  FaEye,
  FaSort,
  FaSortUp,
  FaSortDown,
  FaChevronLeft,
  FaChevronRight,
  FaChevronDown,
  FaDownload,
  FaInfoCircle,
  FaExclamationTriangle,
  FaCheckCircle,
  FaHourglassHalf,
  FaBan
} from 'react-icons/fa';
import { RefreshCw } from 'lucide-react';
import { useTheme } from '@/contexts/ThemeContext';
import { useThemeClasses } from '@/hooks/useThemeClasses';
import { toastSuccess, toastError, toastInfo } from '@/lib/toast';
import { SchoolScopeSelector, useSchoolScope } from '@/components/admin/SchoolScopeSelector';

interface WorkAssignment {
  task_id: number;
  description: string;
  date: string;
  is_recurring: boolean;
  assignments: {
    assignment_id: number;
    staff_id: string;
    staff_name: string;
    status: 'Pending' | 'Completed' | 'In Progress' | 'Overdue';
    proof_url: string | null;
    completion_note: string;
  }[];
}

interface StaffMember {
  id: number;
  staff_id: string;
  name: string;
  role: string;
  phone: string;
  email: string;
  address: string;
  gender: string;
  date_of_birth?: string;
  qualification?: string;
  date_of_joining: string;
  salary_grade?: string;
  emergency_contact?: string;
  user: number;
}

interface RecurringSchedule {
  id: number;
  day_of_week: string;
  staff_id: string;
  staff_name: string;
  description: string;
}

interface BulkAssignTask {
  description: string;
  staff_id: string | string[];
}

interface DayTask {
  staff_id: string;
  description: string;
}

interface WorkPaginationMeta {
  page: number;
  page_size: number;
  total: number;
  total_pages: number;
  has_next: boolean;
  has_previous: boolean;
}

interface WorkSummary {
  total: number;
  completed: number;
  pending: number;
  inProgress: number;
  recurring: number;
}

type TaskStatus = 'all' | 'Pending' | 'Completed' | 'In Progress' | 'Overdue';
type ViewMode = 'daily' | 'weekly' | 'monthly' | 'recurring';
type StaffType = 'external_staff' | 'admin_staff' | 'finance_staff' | 'it_staff' | 'operations_staff' | 'transport_staff' | 'all';

// Delete confirmation types
type DeleteType = 'task' | 'assignment' | 'recurring' | null;

export default function WorkManagementPage() {
  const { theme } = useTheme();
  const { get, combine } = useThemeClasses();
  const schoolScope = useSchoolScope({ storageKey: 'staff_work_school_scope' });
  const getLocalToday = () => {
    const now = new Date();
    const tzAdjusted = new Date(now.getTime() - now.getTimezoneOffset() * 60000);
    return tzAdjusted.toISOString().split('T')[0];
  };
  const [loading, setLoading] = useState(false);
  const [assigning, setAssigning] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [workAssignments, setWorkAssignments] = useState<WorkAssignment[]>([]);
  const [recurringSchedules, setRecurringSchedules] = useState<RecurringSchedule[]>([]);
  const [staffList, setStaffList] = useState<StaffMember[]>([]);
  const [selectedDate, setSelectedDate] = useState(getLocalToday());
  const [filterStatus, setFilterStatus] = useState<TaskStatus>('all');
  const [filterStaffType, setFilterStaffType] = useState<StaffType>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [viewMode, setViewMode] = useState<ViewMode>('daily');
  const [currentPage, setCurrentPage] = useState(1);
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [showRecurringModal, setShowRecurringModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [selectedTask, setSelectedTask] = useState<WorkAssignment | null>(null);
  const [expandedRecurringStaff, setExpandedRecurringStaff] = useState<string[]>([]);
  const [editDescription, setEditDescription] = useState('');
  const [deleteMode, setDeleteMode] = useState<DeleteType>(null);
  const [deleteId, setDeleteId] = useState<number | null>(null);
  const [deleteMetadata, setDeleteMetadata] = useState<{
    name?: string;
    type: string;
    description?: string;
  }>({ type: '' });
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [workPagination, setWorkPagination] = useState<WorkPaginationMeta>({
    page: 1,
    page_size: 10,
    total: 0,
    total_pages: 1,
    has_next: false,
    has_previous: false
  });
  const [workSummary, setWorkSummary] = useState<WorkSummary>({
    total: 0,
    completed: 0,
    pending: 0,
    inProgress: 0,
    recurring: 0
  });
  const [showRedirectBackButton, setShowRedirectBackButton] = useState(false);

  // Assign form state
  const [assignForm, setAssignForm] = useState({
    staff_type: 'external_staff' as StaffType,
    tasks: [{
      description: '',
      staff_id: [] as string[]
    }]
  });

  // Recurring schedule form
  const [recurringForm, setRecurringForm] = useState({
    staff_type: 'external_staff' as StaffType,
    monday: [{ staff_id: '', description: '' }],
    tuesday: [{ staff_id: '', description: '' }],
    wednesday: [{ staff_id: '', description: '' }],
    thursday: [{ staff_id: '', description: '' }],
    friday: [{ staff_id: '', description: '' }],
    saturday: [{ staff_id: '', description: '' }],
    sunday: [{ staff_id: '', description: '' }]
  });

  const itemsPerPage = 10;
  const dayOrder: Record<string, number> = {
    monday: 1,
    tuesday: 2,
    wednesday: 3,
    thursday: 4,
    friday: 5,
    saturday: 6,
    sunday: 7
  };

  // Theme classes
  const getBgClass = () => combine(
    get('bg', 'primary'),
    'min-h-screen transition-colors duration-200'
  );

  const getCardGradientClass = (color: string = 'indigo') => {
    const baseClasses = combine(
      'rounded-xl sm:rounded-2xl p-4 sm:p-6 border shadow-lg transition-all duration-300 group hover:shadow-xl my-2',
      get('border', 'primary')
    );

    const gradients = {
      emerald: theme === 'dark' ? 'from-gray-800 to-emerald-900/10' : 'from-white to-emerald-50',
      blue: theme === 'dark' ? 'from-gray-800 to-blue-900/10' : 'from-white to-blue-50',
      amber: theme === 'dark' ? 'from-gray-800 to-amber-900/10' : 'from-white to-amber-50',
      indigo: theme === 'dark' ? 'from-gray-800 to-indigo-900/10' : 'from-white to-indigo-50',
      red: theme === 'dark' ? 'from-gray-800 to-red-900/10' : 'from-white to-red-50',
    };

    return combine(baseClasses, 'bg-gradient-to-br', gradients[color as keyof typeof gradients] || gradients.indigo);
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
    'focus:ring-2 focus:ring-indigo-500',
    'focus:border-[var(--color-accent-primary)]',
    'disabled:opacity-50 disabled:cursor-not-allowed',
  );

  const getPrimaryButtonClass = () => combine(
    'px-4 sm:px-6 py-2.5 sm:py-3.5 rounded-lg sm:rounded-xl transition-all duration-200 font-medium',
    'text-white shadow-lg hover:shadow-xl hover:scale-[1.02] active:scale-[0.98]',
    'text-xs sm:text-sm',
    theme === 'dark'
      ? 'bg-gradient-to-r from-indigo-600 to-indigo-700 hover:from-indigo-700 hover:to-indigo-800'
      : 'bg-gradient-to-r from-indigo-500 to-indigo-600 hover:from-indigo-600 hover:to-indigo-700'
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

  // Helper function to safely get array from API response
  const safeArray = (data: any): any[] => {
    if (Array.isArray(data)) return data;
    if (data && typeof data === 'object') {
      // Check if it's a paginated response with data field
      if (data.data && Array.isArray(data.data)) return data.data;
      // Check if it's an object with results field
      if (data.results && Array.isArray(data.results)) return data.results;
      // Return empty array for any other object to prevent errors
      return [];
    }
    return [];
  };

  // Fetch work assignments
  const [urlParamsProcessed, setUrlParamsProcessed] = useState(false);

  // ========== READ URL PARAMETERS ==========
  useEffect(() => {
    // Get URL parameters
    const params = new URLSearchParams(window.location.search);
    const searchParam = params.get('search');
    const staffTypeParam = params.get('filterStaffType');
    const redirectedFrom = params.get('redirectedFrom');

    let shouldUpdate = false;

    if (searchParam) {
      setSearchTerm(searchParam);
      shouldUpdate = true;
    }

    if (staffTypeParam && staffTypeParam !== 'all') {
      setFilterStaffType(staffTypeParam as StaffType);
      shouldUpdate = true;
    }

    setShowRedirectBackButton(redirectedFrom === 'staff-directory');

    // If we have URL params, show a toast
    if (shouldUpdate) {
      // toastInfo(`Showing work assignments for: ${searchParam || 'selected staff'}`);
    }

    // Mark URL params as processed
    setUrlParamsProcessed(true);
  }, []); // Run only once on mount

  const handleRedirectBack = () => {
    if (typeof window === 'undefined') return;
    if (window.history.length > 1) {
      window.history.back();
      return;
    }
    window.location.href = '/admin/staff/directory';
  };

  // ========== FETCH DATA ==========
  const fetchWorkAssignments = async (showLoading = true) => {
    if (showLoading) setLoading(true);
    setFetchError(null);
    try {
      const response = await adminApi.staffWork.listPaginated({
        staff_type: filterStaffType !== 'all' ? filterStaffType : undefined,
        date: selectedDate || undefined,
        search: searchTerm || undefined,
        status: filterStatus !== 'all' ? filterStatus : undefined,
        page: currentPage,
        page_size: itemsPerPage,
        ...schoolScope.scopeParams,
      });
      
      // Safely extract data from response
      let data = response?.data;
      
      // Handle different response structures
      if (data && typeof data === 'object') {
        const list = safeArray(data);
        setWorkAssignments(list as WorkAssignment[]);

        const pagination = data.pagination;
        if (pagination && typeof pagination === 'object') {
          const serverPage = Number(pagination.page || currentPage);
          setWorkPagination({
            page: serverPage,
            page_size: Number(pagination.page_size || itemsPerPage),
            total: Number(pagination.total || 0),
            total_pages: Number(pagination.total_pages || 1),
            has_next: Boolean(pagination.has_next),
            has_previous: Boolean(pagination.has_previous)
          });
          if (serverPage !== currentPage) {
            setCurrentPage(serverPage);
          }
        } else {
          const totalFallback = list.length;
          setWorkPagination({
            page: currentPage,
            page_size: itemsPerPage,
            total: totalFallback,
            total_pages: Math.max(1, Math.ceil(totalFallback / itemsPerPage)),
            has_next: false,
            has_previous: currentPage > 1
          });
        }

        const summary = data.summary;
        if (summary && typeof summary === 'object') {
          setWorkSummary({
            total: Number(summary.total || 0),
            completed: Number(summary.completed || 0),
            pending: Number(summary.pending || 0),
            inProgress: Number(summary.inProgress || 0),
            recurring: Number(summary.recurring || 0)
          });
        } else {
          setWorkSummary({
            total: list.length,
            completed: list.reduce((acc: number, curr: any) => {
              const assignments = Array.isArray(curr?.assignments) ? curr.assignments : [];
              return acc + assignments.filter((a: any) => a?.status === 'Completed').length;
            }, 0),
            pending: list.reduce((acc: number, curr: any) => {
              const assignments = Array.isArray(curr?.assignments) ? curr.assignments : [];
              return acc + assignments.filter((a: any) => a?.status === 'Pending').length;
            }, 0),
            inProgress: list.reduce((acc: number, curr: any) => {
              const assignments = Array.isArray(curr?.assignments) ? curr.assignments : [];
              return acc + assignments.filter((a: any) => a?.status === 'In Progress').length;
            }, 0),
            recurring: list.filter((a: any) => Boolean(a?.is_recurring)).length
          });
        }
      } else {
        setWorkAssignments([]);
        setWorkPagination({
          page: currentPage,
          page_size: itemsPerPage,
          total: 0,
          total_pages: 1,
          has_next: false,
          has_previous: currentPage > 1
        });
        setWorkSummary({
          total: 0,
          completed: 0,
          pending: 0,
          inProgress: 0,
          recurring: 0
        });
      }
    } catch (error: any) {
      console.error('Error fetching work assignments:', error);
      setFetchError(error.message || 'Failed to fetch work assignments');
      setWorkAssignments([]); // Reset to empty array on error
      toastError('Network error while fetching work assignments');
    } finally {
      if (showLoading) setLoading(false);
    }
  };

  const fetchRecurringSchedules = async () => {
    try {
      const response = await adminApi.staffWork.recurringList(schoolScope.scopeParams);
      const data = response?.data;
      setRecurringSchedules(safeArray(data));
    } catch (error) {
      console.error('Error fetching recurring schedules:', error);
      setRecurringSchedules([]); // Reset to empty array on error
    }
  };

  const fetchStaffList = async () => {
    try {
      const response = await adminApi.staff.list(schoolScope.scopeParams);
      const data = response?.data;
      setStaffList(safeArray(data));
    } catch (error) {
      console.error('Error fetching staff list:', error);
      setStaffList([]); // Reset to empty array on error
      toastError('Failed to fetch staff list');
    }
  };

  // ========== INITIAL DATA LOAD ==========
  useEffect(() => {
    const loadInitialData = async () => {
      setLoading(true);
      try {
        // Load all data in parallel
        await Promise.all([
          fetchStaffList(),
          fetchRecurringSchedules()
        ]);
      } catch (error) {
        console.error('Error loading initial data:', error);
      } finally {
        setLoading(false);
      }
    };

    loadInitialData();
  }, [schoolScope.selectedSchoolId]);

  // ========== SERVER-SIDE FILTER + PAGINATION FETCH ==========
  useEffect(() => {
    if (!urlParamsProcessed) return;
    fetchWorkAssignments();
  }, [urlParamsProcessed, currentPage, filterStaffType, selectedDate, filterStatus, searchTerm, schoolScope.selectedSchoolId]);

  // Assign work to staff
  const assignWork = async () => {
    setAssigning(true);
    try {
      const tasks: BulkAssignTask[] = assignForm.tasks.map(task => ({
        description: task.description.trim(),
        staff_id: task.staff_id.length === 1 ? task.staff_id[0] : task.staff_id
      })).filter(task => task.description && (Array.isArray(task.staff_id) ? task.staff_id.length > 0 : Boolean(task.staff_id)));

      if (tasks.length === 0) {
        toastError('Please fill in all task details');
        return;
      }

      const payload = {
        staff_type: assignForm.staff_type,
        tasks: tasks,
        ...schoolScope.scopeParams,
      };

      const response = await adminApi.staffWork.assignBulk(payload);
      const data = response.data;

      if (response.status === 200) {
        toastSuccess(data.message || 'Work assigned successfully');
        if (data.errors && data.errors.length > 0) {
          data.errors.forEach((error: any) => {
            toastError(typeof error === 'object' ? JSON.stringify(error) : error);
          });
        }
        setShowAssignModal(false);
        setAssignForm({
          staff_type: 'external_staff',
          tasks: [{ description: '', staff_id: [] }]
        });
        fetchWorkAssignments();
      } else {
        toastError(data.message || data.error || 'Failed to assign work');
      }
    } catch (error) {
      console.error('Error assigning work:', error);
      toastError('Network error while assigning work');
    } finally {
      setAssigning(false);
    }
  };

  // Set recurring schedule
  const setRecurringSchedule = async () => {
    setAssigning(true);
    try {
      const payload: any = {
        staff_type: recurringForm.staff_type
      };

      const days = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
      days.forEach(day => {
        const dayTasks = recurringForm[day as keyof typeof recurringForm] as DayTask[];
        const validTasks = dayTasks.filter(task => task.staff_id && task.description.trim());
        if (validTasks.length > 0) {
          payload[day] = validTasks;
        }
      });

      const hasTasks = Object.keys(payload).some(key => Array.isArray(payload[key]) && payload[key].length > 0);
      if (!hasTasks) {
        toastError('Please add at least one task for the schedule');
        return;
      }

      const response = await adminApi.staffWork.recurringCreate({
        ...payload,
        ...schoolScope.scopeParams,
      });
      const data = response.data;

      if (response.status === 200) {
        toastSuccess(data.message || 'Recurring schedule set successfully');
        if (data.errors && data.errors.length > 0) {
          data.errors.forEach((error: string) => {
            toastError(error);
          });
        }
        setShowRecurringModal(false);
        resetRecurringForm();
        fetchRecurringSchedules();
        fetchWorkAssignments();
      } else {
        toastError(data.message || 'Failed to set recurring schedule');
      }
    } catch (error) {
      console.error('Error setting recurring schedule:', error);
      toastError('Network error while setting schedule');
    } finally {
      setAssigning(false);
    }
  };

  // Update task description
  const updateTaskDescription = async () => {
    if (!selectedTask || !editDescription.trim()) return;

    setAssigning(true);
    try {
      const response = await adminApi.staffWork.updateTask({
        task_id: selectedTask.task_id,
        new_description: editDescription.trim(),
        ...schoolScope.scopeParams,
      });
      const data = response.data;

      if (response.status === 200) {
        toastSuccess(data.message || 'Task updated successfully');
        setShowEditModal(false);
        setSelectedTask(null);
        setEditDescription('');
        fetchWorkAssignments();
      } else {
        toastError(data.detail || data.error || 'Failed to update task');
      }
    } catch (error) {
      console.error('Error updating task:', error);
      toastError('Network error while updating task');
    } finally {
      setAssigning(false);
    }
  };

  // Show delete confirmation
  const confirmDelete = (id: number, type: 'task' | 'assignment' | 'recurring', metadata?: { name?: string; description?: string }) => {
    setDeleteId(id);
    setDeleteMode(type);

    let deleteTypeText = '';
    let deleteDescription = '';

    switch (type) {
      case 'task':
        deleteTypeText = 'Task';
        deleteDescription = metadata?.description || 'This will delete the entire task for all assigned staff members.';
        break;
      case 'assignment':
        deleteTypeText = 'Staff Assignment';
        deleteDescription = metadata?.name
          ? `Remove ${metadata.name} from this task.`
          : 'This will remove this staff member from the task.';
        break;
      case 'recurring':
        deleteTypeText = 'Recurring Schedule';
        deleteDescription = metadata?.description
          ? `Delete the recurring schedule${metadata.name ? ` for ${metadata.name}` : ''} on ${metadata.description}.`
          : 'This will delete the recurring schedule template.';
        break;
    }

    setDeleteMetadata({
      type: deleteTypeText,
      name: metadata?.name,
      description: deleteDescription
    });

    setShowDeleteConfirm(true);
  };

  // Execute delete after confirmation
  const executeDelete = async () => {
    if (!deleteId || !deleteMode) return;

    setDeleting(true);
    try {
      if (deleteMode === 'recurring') {
        const response = await adminApi.staffWork.recurringDelete(deleteId, schoolScope.scopeParams);
        const data = response.data;

        if (response.status === 200) {
          toastSuccess(data.message || 'Schedule deleted successfully');
          fetchRecurringSchedules();
          fetchWorkAssignments();
        } else {
          toastError(data.detail || 'Failed to delete schedule');
        }
      } else {
        const response = await adminApi.staffWork.deleteManage(
          deleteMode === 'task'
            ? { task_id: deleteId, ...schoolScope.scopeParams }
            : { assignment_id: deleteId, ...schoolScope.scopeParams }
        );
        const data = response.data;

        if (response.status === 200) {
          toastSuccess(data.message || 'Deleted successfully');
          fetchWorkAssignments();
        } else {
          toastError(data.detail || data.error || 'Failed to delete');
        }
      }

      setShowDeleteConfirm(false);
      setDeleteId(null);
      setDeleteMode(null);
    } catch (error) {
      console.error('Error deleting:', error);
      toastError('Network error while deleting');
    } finally {
      setDeleting(false);
    }
  };

  const resetRecurringForm = () => {
    setRecurringForm({
      staff_type: 'external_staff',
      monday: [{ staff_id: '', description: '' }],
      tuesday: [{ staff_id: '', description: '' }],
      wednesday: [{ staff_id: '', description: '' }],
      thursday: [{ staff_id: '', description: '' }],
      friday: [{ staff_id: '', description: '' }],
      saturday: [{ staff_id: '', description: '' }],
      sunday: [{ staff_id: '', description: '' }]
    });
  };

  // Initialize form with existing schedules
  const loadRecurringSchedulesToForm = () => {
    const form: any = {
      staff_type: 'external_staff',
      monday: [],
      tuesday: [],
      wednesday: [],
      thursday: [],
      friday: [],
      saturday: [],
      sunday: []
    };

    recurringSchedules.forEach(schedule => {
      const day = schedule.day_of_week.toLowerCase();
      if (form[day]) {
        form[day].push({
          staff_id: schedule.staff_id,
          description: schedule.description
        });
      }
    });

    Object.keys(form).forEach(day => {
      if (day !== 'staff_type' && form[day].length === 0) {
        form[day] = [{ staff_id: '', description: '' }];
      }
    });

    setRecurringForm(form);
    setShowRecurringModal(true);
  };

  // Filter staff by type for dropdowns
  const filteredStaffByType = (type: StaffType) => {
    if (type === 'all') return staffList;
    return staffList.filter(staff => staff.role === type);
  };

  const currentAssignments = Array.isArray(workAssignments) ? workAssignments : [];

  const clearFilters = () => {
    setSelectedDate('');
    setFilterStaffType('all');
    setFilterStatus('all');
    setSearchTerm('');
    setCurrentPage(1);

    // Clear URL parameters without reloading
    const url = new URL(window.location.href);
    url.searchParams.delete('search');
    url.searchParams.delete('filterStaffType');
    window.history.replaceState({}, '', url.toString());
  };

  // Pagination
  const activePage = workPagination.page || currentPage;
  const totalPages = workPagination.total_pages || 1;
  const indexOfFirstItem = workPagination.total > 0 ? (activePage - 1) * itemsPerPage + 1 : 0;
  const indexOfLastItem = workPagination.total > 0 ? ((activePage - 1) * itemsPerPage) + currentAssignments.length : 0;
  const recurringGroupedByStaff = Object.values(
    recurringSchedules.reduce((acc, schedule) => {
      const groupKey = schedule.staff_id || `unknown-${schedule.staff_name || schedule.id}`;
      if (!acc[groupKey]) {
        acc[groupKey] = {
          key: groupKey,
          staff_id: schedule.staff_id || 'N/A',
          staff_name: schedule.staff_name || 'Unknown',
          schedules: [] as RecurringSchedule[]
        };
      }
      acc[groupKey].schedules.push(schedule);
      return acc;
    }, {} as Record<string, { key: string; staff_id: string; staff_name: string; schedules: RecurringSchedule[] }>)
  ).map((group) => ({
    ...group,
    schedules: [...group.schedules].sort((a, b) => {
      const first = dayOrder[(a.day_of_week || '').toLowerCase()] || 99;
      const second = dayOrder[(b.day_of_week || '').toLowerCase()] || 99;
      return first - second;
    })
  }));

  // Statistics - safely calculate with array check
  const stats = {
    total: workSummary.total,
    completed: workSummary.completed,
    pending: workSummary.pending,
    inProgress: workSummary.inProgress,
    recurring: workSummary.recurring,
    recurringSchedules: recurringSchedules.length
  };

  const getStatusBadgeClass = (status: string) => {
    const classes = {
      Completed: theme === 'dark'
        ? 'bg-emerald-900/30 text-emerald-300 border-emerald-800'
        : 'bg-emerald-100 text-emerald-700 border-emerald-200',
      Pending: theme === 'dark'
        ? 'bg-amber-900/30 text-amber-300 border-amber-800'
        : 'bg-amber-100 text-amber-700 border-amber-200',
      'In Progress': theme === 'dark'
        ? 'bg-blue-900/30 text-blue-300 border-blue-800'
        : 'bg-blue-100 text-blue-700 border-blue-200',
      Overdue: theme === 'dark'
        ? 'bg-red-900/30 text-red-300 border-red-800'
        : 'bg-red-100 text-red-700 border-red-200',
    };

    return combine(
      'px-3 py-1.5 text-xs font-medium rounded-full border',
      classes[status as keyof typeof classes] || 'bg-gray-100 text-gray-700'
    );
  };

  const addTaskField = () => {
    setAssignForm({
      ...assignForm,
      tasks: [...assignForm.tasks, { description: '', staff_id: [] }]
    });
  };

  const removeTaskField = (index: number) => {
    if (assignForm.tasks.length > 1) {
      const newTasks = [...assignForm.tasks];
      newTasks.splice(index, 1);
      setAssignForm({ ...assignForm, tasks: newTasks });
    }
  };

  const updateTaskField = (index: number, field: string, value: any) => {
    const newTasks = [...assignForm.tasks];
    newTasks[index] = { ...newTasks[index], [field]: value };
    setAssignForm({ ...assignForm, tasks: newTasks });
  };

  const addDayTask = (day: string) => {
    const dayKey = day as keyof typeof recurringForm;
    setRecurringForm({
      ...recurringForm,
      [dayKey]: [...recurringForm[dayKey], { staff_id: '', description: '' }]
    });
  };

  const removeDayTask = (day: string, index: number) => {
    const dayKey = day as keyof typeof recurringForm;
    const dayTasks = [...recurringForm[dayKey]];
    if (dayTasks.length > 1) {
      dayTasks.splice(index, 1);
      setRecurringForm({ ...recurringForm, [dayKey]: dayTasks });
    }
  };

  const updateDayTask = (day: string, index: number, field: string, value: string) => {
    const dayKey = day as keyof typeof recurringForm;
    const dayTasks: any = [...recurringForm[dayKey]];
    dayTasks[index] = { ...dayTasks[index], [field]: value };
    setRecurringForm({ ...recurringForm, [dayKey]: dayTasks });
  };

  const viewTaskDetails = (task: WorkAssignment) => {
    setSelectedTask(task);
    setEditDescription(task.description);
  };

  const exportWorkReport = async () => {
    try {
      const allAssignments: WorkAssignment[] = [];
      let page = 1;
      let hasMore = true;
      const exportPageSize = 200;

      while (hasMore) {
        const response = await adminApi.staffWork.listPaginated({
          staff_type: filterStaffType !== 'all' ? filterStaffType : undefined,
          date: selectedDate || undefined,
          search: searchTerm || undefined,
          status: filterStatus !== 'all' ? filterStatus : undefined,
          page,
          page_size: exportPageSize,
          ...schoolScope.scopeParams,
        });

        const data = response?.data || {};
        const list = safeArray(data) as WorkAssignment[];
        allAssignments.push(...list);

        const pagination = data?.pagination;
        if (pagination && typeof pagination === 'object') {
          hasMore = Boolean(pagination.has_next);
          page = Number(pagination.page || page) + 1;
        } else {
          hasMore = false;
        }
      }

      if (allAssignments.length === 0) {
        toastError('No data to export');
        return;
      }

      const headers = ['Date', 'Task', 'Staff Assigned', 'Staff ID', 'Status', 'Completion Note', 'Proof URL'];
      const csvData = allAssignments.flatMap((assignment: WorkAssignment) => {
        const assignments = Array.isArray(assignment.assignments) ? assignment.assignments : [];
        return assignments.map((assign: any) => [
          assignment.date || '',
          assignment.description || '',
          assign?.staff_name || '',
          assign?.staff_id || '',
          assign?.status || '',
          assign?.completion_note || 'N/A',
          assign?.proof_url || 'N/A'
        ]);
      });

      const csvContent = [
        headers.join(','),
        ...csvData.map((row: any[]) => row.map((field: any) => `"${String(field || '').replace(/"/g, '""')}"`).join(','))
      ].join('\n');

      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `work_assignments_${selectedDate || new Date().toISOString().split('T')[0]}.csv`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
      toastSuccess(`Work report exported successfully! (${csvData.length} rows)`);
    } catch (error) {
      console.error('Error exporting work report CSV:', error);
      toastError('Failed to export CSV');
    }
  };

  return (
    <div className={`dashboard-typography p-3 md:p-4 xl:p-6 ${getBgClass()} transition-colors duration-200`}>
      <div className="mx-auto w-full max-w-[1920px]">
        {/* Header */}
        <div className="mb-6 sm:mb-8">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between mb-4 sm:mb-6 gap-4">
            <div className="flex items-center space-x-3 sm:space-x-4">
              <div className={combine(
                "p-2 sm:p-3 rounded-xl sm:rounded-2xl shadow-lg",
                theme === 'dark'
                  ? "bg-gradient-to-br from-indigo-600 to-indigo-700"
                  : "bg-gradient-to-br from-indigo-500 to-indigo-600"
              )}>
                <FaTasks className="text-xl sm:text-2xl text-white" />
              </div>
              <div>
                <h1 className={combine("text-xl sm:text-2xl md:text-3xl font-bold", get('text', 'primary'))}>
                  Work Management
                </h1>
                <p className={combine("text-xs sm:text-sm mt-0.5 sm:mt-1", get('text', 'secondary'))}>
                  Assign and manage tasks for staff members
                </p>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 sm:gap-3 w-full lg:w-auto">
              <SchoolScopeSelector {...schoolScope} className="w-full sm:w-auto" />
              {showRedirectBackButton && (
                <button
                  onClick={handleRedirectBack}
                  className={combine(getSecondaryButtonClass(), "flex items-center justify-center space-x-2 w-full sm:w-auto")}
                >
                  <span>Back</span>
                </button>
              )}
              <button
                onClick={exportWorkReport}
                className={combine(getSecondaryButtonClass(), "flex items-center justify-center space-x-2 w-full sm:w-auto")}
              >
                <FaDownload className="text-xs sm:text-sm" />
                <span>Export Report</span>
              </button>

              <button
                onClick={loadRecurringSchedulesToForm}
                className={combine(getSecondaryButtonClass(), "flex items-center justify-center space-x-2 w-full sm:w-auto")}
              >
                <FaCalendarAlt className="text-xs sm:text-sm" />
                <span>Manage Recurring</span>
              </button>

              <button
                onClick={() => setShowAssignModal(true)}
                className={combine(getPrimaryButtonClass(), "flex items-center justify-center space-x-2 w-full sm:w-auto")}
              >
                <FaPlus className="text-xs sm:text-sm" />
                <span>Assign Work</span>
              </button>
            </div>
          </div>

          {/* Stats Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-6 gap-3 sm:gap-4 md:gap-6 mb-4 sm:mb-6 md:mb-8">
            <div className={getCardGradientClass('indigo')}>
              <div className="flex items-center justify-between">
                <div>
                  <p className={combine("text-xs font-medium", get('text', 'secondary'))}>Total Tasks</p>
                  <p className={combine("text-lg sm:text-xl md:text-2xl font-bold mt-1 sm:mt-2", get('text', 'primary'))}>{stats.total}</p>
                </div>
                <div className={combine(
                  "p-1.5 sm:p-2 rounded-lg sm:rounded-xl",
                  theme === 'dark' ? 'bg-indigo-900/30' : 'bg-indigo-100'
                )}>
                  <FaTasks className={combine(
                    "text-base sm:text-lg",
                    theme === 'dark' ? 'text-indigo-400' : 'text-indigo-600'
                  )} />
                </div>
              </div>
              <div className={combine("mt-1 sm:mt-2 md:mt-3 text-xs", get('text', 'tertiary'))}>
                Active work assignments
              </div>
            </div>

            <div className={getCardGradientClass('emerald')}>
              <div className="flex items-center justify-between">
                <div>
                  <p className={combine("text-xs font-medium", get('text', 'secondary'))}>Completed</p>
                  <p className={combine("text-lg sm:text-xl md:text-2xl font-bold mt-1 sm:mt-2", get('text', 'primary'))}>{stats.completed}</p>
                </div>
                <div className={combine(
                  "p-1.5 sm:p-2 rounded-lg sm:rounded-xl",
                  theme === 'dark' ? 'bg-emerald-900/30' : 'bg-emerald-100'
                )}>
                  <FaCheckCircle className={combine(
                    "text-base sm:text-lg",
                    theme === 'dark' ? 'text-emerald-400' : 'text-emerald-600'
                  )} />
                </div>
              </div>
              <div className={combine("mt-1 sm:mt-2 md:mt-3 text-xs", get('accent', 'success'))}>
                Tasks completed
              </div>
            </div>

            <div className={getCardGradientClass('amber')}>
              <div className="flex items-center justify-between">
                <div>
                  <p className={combine("text-xs font-medium", get('text', 'secondary'))}>In Progress</p>
                  <p className={combine("text-lg sm:text-xl md:text-2xl font-bold mt-1 sm:mt-2", get('text', 'primary'))}>{stats.inProgress}</p>
                </div>
                <div className={combine(
                  "p-1.5 sm:p-2 rounded-lg sm:rounded-xl",
                  theme === 'dark' ? 'bg-amber-900/30' : 'bg-amber-100'
                )}>
                  <FaHourglassHalf className={combine(
                    "text-base sm:text-lg",
                    theme === 'dark' ? 'text-amber-400' : 'text-amber-600'
                  )} />
                </div>
              </div>
              <div className={combine("mt-1 sm:mt-2 md:mt-3 text-xs", get('accent', 'warning'))}>
                Ongoing tasks
              </div>
            </div>

            <div className={getCardGradientClass('blue')}>
              <div className="flex items-center justify-between">
                <div>
                  <p className={combine("text-xs font-medium", get('text', 'secondary'))}>Pending</p>
                  <p className={combine("text-lg sm:text-xl md:text-2xl font-bold mt-1 sm:mt-2", get('text', 'primary'))}>{stats.pending}</p>
                </div>
                <div className={combine(
                  "p-1.5 sm:p-2 rounded-lg sm:rounded-xl",
                  theme === 'dark' ? 'bg-blue-900/30' : 'bg-blue-100'
                )}>
                  <FaClock className={combine(
                    "text-base sm:text-lg",
                    theme === 'dark' ? 'text-blue-400' : 'text-blue-600'
                  )} />
                </div>
              </div>
              <div className={combine("mt-1 sm:mt-2 md:mt-3 text-xs", get('accent', 'primary'))}>
                Awaiting start
              </div>
            </div>

            <div className={getCardGradientClass('indigo')}>
              <div className="flex items-center justify-between">
                <div>
                  <p className={combine("text-xs font-medium", get('text', 'secondary'))}>Recurring Tasks</p>
                  <p className={combine("text-lg sm:text-xl md:text-2xl font-bold mt-1 sm:mt-2", get('text', 'primary'))}>{stats.recurring}</p>
                </div>
                <div className={combine(
                  "p-1.5 sm:p-2 rounded-lg sm:rounded-xl",
                  theme === 'dark' ? 'bg-indigo-900/30' : 'bg-indigo-100'
                )}>
                  <FaExclamationTriangle className={combine(
                    "text-base sm:text-lg",
                    theme === 'dark' ? 'text-indigo-400' : 'text-indigo-600'
                  )} />
                </div>
              </div>
              <div className={combine("mt-1 sm:mt-2 md:mt-3 text-xs", get('accent', 'primary'))}>
                Daily/Weekly tasks
              </div>
            </div>

            <div className={getCardGradientClass('indigo')}>
              <div className="flex items-center justify-between">
                <div>
                  <p className={combine("text-xs font-medium", get('text', 'secondary'))}>Schedule Templates</p>
                  <p className={combine("text-lg sm:text-xl md:text-2xl font-bold mt-1 sm:mt-2", get('text', 'primary'))}>{stats.recurringSchedules}</p>
                </div>
                <div className={combine(
                  "p-1.5 sm:p-2 rounded-lg sm:rounded-xl",
                  theme === 'dark' ? 'bg-indigo-900/30' : 'bg-indigo-100'
                )}>
                  <FaCalendarAlt className={combine(
                    "text-base sm:text-lg",
                    theme === 'dark' ? 'text-indigo-400' : 'text-indigo-600'
                  )} />
                </div>
              </div>
              <div className={combine("mt-1 sm:mt-2 md:mt-3 text-xs", get('accent', 'primary'))}>
                Recurring schedules
              </div>
            </div>
          </div>
        </div>

        {/* Filters */}
        <div className={getCardGradientClass('indigo')}>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 sm:gap-4">
            <div>
              <div className="relative">
                <FaSearch className={combine(
                  "absolute left-4 top-1/2 transform -translate-y-1/2 text-xs sm:text-sm",
                  get('icon', 'secondary')
                )} />
                <input
                  type="text"
                  placeholder="Search tasks or staff..."
                  value={searchTerm}
                  onChange={(e) => {
                    setSearchTerm(e.target.value);
                    setCurrentPage(1);
                  }}
                  className={getInputClass()}
                  style={{ paddingLeft: '2.5rem', paddingRight: searchTerm ? '2.5rem' : '1rem' }}
                />
                {searchTerm && (
                  <button
                    onClick={() => {
                      setSearchTerm('');
                      setCurrentPage(1);
                    }}
                    className={combine(
                      "absolute right-4 top-1/2 transform -translate-y-1/2 p-1 rounded-full hover:bg-[var(--color-bg-hover)]",
                      get('icon', 'secondary')
                    )}
                    title="Clear search"
                  >
                    <FaTimes className="text-xs" />
                  </button>
                )}
              </div>
            </div>
            <div>
              <input
                type="date"
                value={selectedDate}
                onChange={(e) => {
                  setSelectedDate(e.target.value);
                  setCurrentPage(1);
                }}
                className={getInputClass()}
              />
            </div>
            <div>
              <select
                value={filterStaffType}
                onChange={(e) => {
                  setFilterStaffType(e.target.value as StaffType);
                  setCurrentPage(1);
                }}
                className={getInputClass()}
              >
                <option value="all">All Staff Types</option>
                <option value="external_staff">External Staff</option>
                <option value="admin_staff">Admin Staff</option>
                <option value="finance_staff">Finance Staff</option>
                <option value="it_staff">IT Staff</option>
                <option value="operations_staff">Operations Staff</option>
                <option value="transport_staff">Transport Staff</option>
              </select>
            </div>
            <div>
              <select
                value={filterStatus}
                onChange={(e) => {
                  setFilterStatus(e.target.value as TaskStatus);
                  setCurrentPage(1);
                }}
                className={getInputClass()}
              >
                <option value="all">All Status</option>
                <option value="Pending">Pending</option>
                <option value="In Progress">In Progress</option>
                <option value="Completed">Completed</option>
                <option value="Overdue">Overdue</option>
              </select>
            </div>
            
            <div className="flex items-end">
              <button
                onClick={clearFilters}
                className={combine(getSecondaryButtonClass(), "w-full flex items-center justify-center space-x-2")}
              >
                <FaTimes className="text-xs sm:text-sm" />
                <span>Clear Filters</span>
              </button>
            </div>
          </div>
        </div>

        {/* Work Assignments Table with Sticky Header */}
        <div className={getCardGradientClass()}>
          <div className={combine("p-3 sm:p-4 border-b", get('border', 'primary'))}>
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 sm:gap-0">
              <div>
                <h3 className={combine("text-base sm:text-lg font-bold", get('text', 'primary'))}>Work Assignments</h3>
                <p className={combine("text-xs sm:text-sm mt-0.5 sm:mt-1", get('text', 'secondary'))}>
                  View and manage staff work assignments
                </p>
              </div>

              <div className={combine("text-xs", get('text', 'tertiary'))}>
                Showing {indexOfFirstItem} to {indexOfLastItem} of {workPagination.total} tasks
              </div>
            </div>
          </div>

          <div className="relative">
            {loading ? (
              <div className="p-6 sm:p-8 text-center">
                <div className="text-center">
                  <div className="relative mx-auto w-16 h-16">
                    <div className="animate-spin rounded-full h-16 w-16 border-4 border-indigo-200 border-t-indigo-600"></div>
                    <div className="absolute inset-0 flex items-center justify-center">
                      <FaTasks className="h-8 w-8 text-indigo-600 animate-pulse" />
                    </div>
                  </div>
                  <p className={combine("mt-4 sm:mt-6 text-xs sm:text-sm font-medium", get('text', 'secondary'))}>Loading work assignments...</p>
                  <p className={combine("text-xs sm:text-sm mt-1 sm:mt-2", get('text', 'tertiary'))}>Preparing work records</p>
                </div>
              </div>
            ) : fetchError ? (
              <div className="p-6 sm:p-8 text-center">
                <div className={combine(
                  "inline-block p-3 rounded-full mb-3",
                  theme === 'dark' ? 'bg-red-900/30' : 'bg-red-100'
                )}>
                  <FaExclamationTriangle className={combine(
                    "text-xl",
                    theme === 'dark' ? 'text-red-400' : 'text-red-500'
                  )} />
                </div>
                <h3 className={combine("text-base font-medium mb-1", get('text', 'primary'))}>Error Loading Data</h3>
                <p className={combine("text-xs sm:text-sm mb-4", get('text', 'secondary'))}>
                  {fetchError}
                </p>
                <button
                  onClick={() => fetchWorkAssignments()}
                  className={combine(getPrimaryButtonClass(), "mt-2")}
                >
                  Try Again
                </button>
              </div>
            ) : currentAssignments.length === 0 ? (
              <div className="p-6 sm:p-8 text-center">
                <div className={combine(
                  "inline-block p-3 rounded-full mb-3",
                  theme === 'dark' ? 'bg-indigo-900/30' : 'bg-indigo-100'
                )}>
                  <FaTasks className={combine(
                    "text-xl",
                    theme === 'dark' ? 'text-indigo-400' : 'text-indigo-500'
                  )} />
                </div>
                <h3 className={combine("text-base font-medium mb-1", get('text', 'primary'))}>No work assignments found</h3>
                <p className={combine("text-xs sm:text-sm mb-4", get('text', 'secondary'))}>
                  {searchTerm || filterStatus !== 'all' || selectedDate || filterStaffType !== 'all'
                    ? 'Try adjusting your filters'
                    : 'Assign tasks to staff to get started'}
                </p>
                {!searchTerm && filterStatus === 'all' && filterStaffType === 'all' && !selectedDate && (
                  <button
                    onClick={() => setShowAssignModal(true)}
                    className={combine(getPrimaryButtonClass(), "mt-2")}
                  >
                    Assign First Task
                  </button>
                )}
              </div>
            ) : (
              <>
                <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700 text-xs sm:text-sm">
                  <thead className={combine(
                    "bg-[var(--color-bg-secondary)] sticky top-0 z-10",
                    get('border', 'primary')
                  )}>
                    <tr>
                      <th className={combine(
                        "px-3 sm:px-4 py-2.5 sm:py-3 text-center text-xs sm:text-sm font-medium uppercase tracking-wider",
                        get('text', 'tertiary')
                      )}>
                        Task Details
                      </th>
                      <th className={combine(
                        "px-3 sm:px-4 py-2.5 sm:py-3 text-center text-xs sm:text-sm font-medium uppercase tracking-wider",
                        get('text', 'tertiary')
                      )}>
                        Staff Assigned
                      </th>
                      <th className={combine(
                        "px-3 sm:px-4 py-2.5 sm:py-3 text-center text-xs sm:text-sm font-medium uppercase tracking-wider",
                        get('text', 'tertiary')
                      )}>
                        Date & Schedule
                      </th>
                      <th className={combine(
                        "px-3 sm:px-4 py-2.5 sm:py-3 text-center text-xs sm:text-sm font-medium uppercase tracking-wider",
                        get('text', 'tertiary')
                      )}>
                        Status
                      </th>
                      <th className={combine(
                        "px-3 sm:px-4 py-2.5 sm:py-3 text-center text-xs sm:text-sm font-medium uppercase tracking-wider",
                        get('text', 'tertiary')
                      )}>
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className={combine("divide-y", get('border', 'primary'))}>
                    {currentAssignments.map((assignment: WorkAssignment) => (
                      <tr key={assignment.task_id} className="hover:bg-[var(--color-bg-hover)]">
                        <td className="px-3 sm:px-4 py-3 sm:py-4 align-middle text-center">
                          <div className="max-w-[220px] mx-auto">
                            <div className="font-medium text-xs sm:text-sm">{assignment.description || 'No description'}</div>
                            {assignment.is_recurring && (
                              <div className={combine("text-xs mt-1 flex items-center justify-center", get('accent', 'primary'))}>
                                <FaExclamationTriangle className="mr-1 text-xs" />
                                Recurring Task
                              </div>
                            )}
                          </div>
                        </td>
                        <td className="px-3 sm:px-4 py-3 sm:py-4 align-middle text-center">
                          <div className="space-y-2">
                            {Array.isArray(assignment.assignments) && assignment.assignments.length > 0 ? (
                              assignment.assignments.map((assign: any, index: number) => (
                                <div
                                  key={assign?.assignment_id ?? `${assignment.task_id}-staff-${index}`}
                                  className={combine(
                                    "rounded-lg px-2.5 py-2 min-h-[56px] flex flex-col justify-center items-center",
                                    get('bg', 'card')
                                  )}
                                >
                                  <div className="text-xs sm:text-sm font-medium">{assign?.staff_name || 'Unknown'}</div>
                                  <div className={combine("text-xs", get('text', 'tertiary'))}>{assign?.staff_id || 'N/A'}</div>
                                </div>
                              ))
                            ) : (
                              <div className={combine("rounded-lg px-2.5 py-2 text-sm min-h-[56px] flex items-center justify-center", get('bg', 'card'))}>
                                Unassigned
                              </div>
                            )}
                          </div>
                        </td>
                        <td className="px-3 sm:px-4 py-3 sm:py-4 align-middle text-center">
                          <div className="text-xs sm:text-sm">
                            {assignment.date ? new Date(assignment.date).toLocaleDateString() : 'No date'}
                          </div>
                          {assignment.date && (
                            <div className={combine("text-xs mt-1", get('text', 'tertiary'))}>
                              {new Date(assignment.date).toLocaleDateString('en-US', { weekday: 'long' })}
                            </div>
                          )}
                        </td>
                        <td className="px-3 sm:px-4 py-3 sm:py-4 align-middle text-center">
                          <div className="space-y-2">
                            {Array.isArray(assignment.assignments) && assignment.assignments.length > 0 ? (
                              assignment.assignments.map((assign: any, index: number) => (
                                <div
                                  key={assign?.assignment_id ?? `${assignment.task_id}-status-${index}`}
                                  className={combine("rounded-lg px-2.5 py-2 min-h-[56px] flex items-center justify-center")}
                                >
                                  <span className={getStatusBadgeClass(assign?.status || 'Pending')}>
                                    {assign?.status || 'Pending'}
                                  </span>
                                </div>
                              ))
                            ) : (
                              <div className={combine("rounded-lg px-2.5 py-2 min-h-[56px] flex items-center justify-center")}>
                                <span className={getStatusBadgeClass('Pending')}>Pending</span>
                              </div>
                            )}
                          </div>
                        </td>
                        <td className="px-3 sm:px-4 py-3 sm:py-4 align-middle text-center">
                          <div className="flex items-center justify-center space-x-1">
                            <button
                              onClick={() => viewTaskDetails(assignment)}
                              className={combine(
                                "p-1.5 rounded-xl transition-all duration-200 hover:text-[var(--color-accent-primary)]",
                                get('icon', 'primary') + " text-sm"
                              )}
                              title="View Details"
                            >
                              <FaEye className="text-xs sm:text-sm" />
                            </button>
                            <button
                              onClick={() => {
                                viewTaskDetails(assignment);
                                setShowEditModal(true);
                              }}
                              className={combine(
                                "p-1.5 rounded-xl transition-all duration-200 hover:text-[var(--color-accent-primary)]",
                                get('icon', 'primary') + " text-sm"
                              )}
                              title="Edit Task"
                            >
                              <FaEdit className="text-xs sm:text-sm" />
                            </button>
                            <button
                              onClick={() => confirmDelete(
                                assignment.task_id,
                                'task',
                                { description: assignment.description || 'task' }
                              )}
                              className={combine(
                                "p-1.5 rounded-xl transition-all duration-200 hover:text-[var(--color-accent-error)]",
                                get('icon', 'primary') + " text-sm"
                              )}
                              title="Delete Task"
                            >
                              <FaTrash className="text-xs sm:text-sm" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                </div>
              </>
            )}
          </div>

          {/* Pagination - outside the scrollable area */}
          {totalPages > 1 && (
            <div className={combine("px-3 sm:px-4 py-2.5 sm:py-3 border-t", get('border', 'primary'))}>
              <div className="flex flex-col sm:flex-row justify-between items-center gap-3">
                <p className={combine("text-xs", get('text', 'tertiary'))}>
                  Page {activePage} of {totalPages}
                </p>
                <div className="flex items-center space-x-1.5">
                  <button
                    onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                    disabled={!workPagination.has_previous}
                    className={combine(
                      "p-1.5 rounded-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed hover:scale-[1.02] active:scale-[0.98] text-xs sm:text-sm",
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
                          onClick={() => setCurrentPage(pageNum)}
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
                    onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                    disabled={!workPagination.has_next}
                    className={combine(
                      "p-1.5 rounded-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed hover:scale-[1.02] active:scale-[0.98] text-xs sm:text-sm",
                      getSecondaryButtonClass()
                    )}
                  >
                    <FaChevronRight className="text-xs" />
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Assign Work Modal */}
        {showAssignModal && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50 animate-fade-in backdrop-blur-sm">
            <div className={combine(
              getCardGradientClass('emerald'),
              "max-w-2xl w-full shadow-2xl max-h-[90vh] overflow-y-auto"
            )}>
              <div className="flex justify-between items-center mb-4">
                <h2 className={combine("text-lg font-bold", get('text', 'primary'))}>Assign Work to Staff</h2>
                <button onClick={() => setShowAssignModal(false)} className={combine(
                  "p-2 rounded-xl transition-all hover:bg-[var(--color-bg-hover)]",
                  get('icon', 'secondary') + " text-sm"
                )}>
                  <FaTimes className="text-sm" />
                </button>
              </div>

              <div className="space-y-4">
                <div>
                  <label className={combine("block text-xs sm:text-sm font-medium mb-2", get('text', 'primary'))}>Staff Type</label>
                  <select
                    value={assignForm.staff_type}
                    onChange={(e) => setAssignForm({ ...assignForm, staff_type: e.target.value as StaffType })}
                    className={getInputClass()}
                  >
                    <option value="external_staff">External Staff</option>
                    <option value="admin_staff">Admin Staff</option>
                    <option value="finance_staff">Finance Staff</option>
                    <option value="it_staff">IT Staff</option>
                    <option value="operations_staff">Operations Staff</option>
                    <option value="transport_staff">Transport Staff</option>
                  </select>
                </div>

                {assignForm.tasks.map((task, index) => (
                  <div key={index} className={combine("p-3 sm:p-4 rounded-lg", get('bg', 'secondary'))}>
                    <div className="flex justify-between items-center mb-3">
                      <h3 className={combine("text-sm font-medium", get('text', 'primary'))}>Task #{index + 1}</h3>
                      {assignForm.tasks.length > 1 && (
                        <button
                          onClick={() => removeTaskField(index)}
                          className={combine(
                            "p-1 hover:text-[var(--color-accent-error)]",
                            get('icon', 'primary') + " text-sm"
                          )}
                        >
                          <FaTrash className="text-xs sm:text-sm" />
                        </button>
                      )}
                    </div>

                    <div className="space-y-3">
                      <div>
                        <label className={combine("block text-xs sm:text-sm font-medium mb-2", get('text', 'primary'))}>Task Description *</label>
                        <input
                          type="text"
                          value={task.description}
                          onChange={(e) => updateTaskField(index, 'description', e.target.value)}
                          placeholder="Describe the task..."
                          className={getInputClass()}
                          required
                        />
                      </div>

                      <div>
                        <label className={combine("block text-xs sm:text-sm font-medium mb-2", get('text', 'primary'))}>Assign to Staff *</label>
                        <div className={combine(
                          "max-h-48 overflow-y-auto rounded-lg sm:rounded-xl border p-2 sm:p-3 space-y-2",
                          get('bg', 'card'),
                          get('border', 'secondary')
                        )}>
                          {filteredStaffByType(assignForm.staff_type).length === 0 ? (
                            <p className={combine("text-xs sm:text-sm", get('text', 'tertiary'))}>
                              No staff available for the selected staff type.
                            </p>
                          ) : (
                            filteredStaffByType(assignForm.staff_type).map(staff => {
                              const selectedStaffIds = Array.isArray(task.staff_id) ? task.staff_id : [];
                              const isChecked = selectedStaffIds.includes(staff.staff_id);

                              return (
                                <label
                                  key={staff.staff_id}
                                  className={combine(
                                    "flex items-start gap-2.5 p-2 rounded-lg cursor-pointer transition-colors",
                                    isChecked
                                      ? (theme === 'dark' ? 'bg-indigo-900/20' : 'bg-indigo-100/70')
                                      : 'hover:bg-[var(--color-bg-hover)]'
                                  )}
                                >
                                  <input
                                    type="checkbox"
                                    checked={isChecked}
                                    onChange={(e) => {
                                      if (e.target.checked) {
                                        updateTaskField(index, 'staff_id', [...selectedStaffIds, staff.staff_id]);
                                      } else {
                                        updateTaskField(
                                          index,
                                          'staff_id',
                                          selectedStaffIds.filter((id) => id !== staff.staff_id)
                                        );
                                      }
                                    }}
                                    className="mt-0.5 h-4 w-4 rounded border-gray-400 text-indigo-600 focus:ring-indigo-500"
                                  />
                                  <span className="min-w-0">
                                    <span className={combine("block text-xs sm:text-sm font-medium", get('text', 'primary'))}>
                                      {staff.name} ({staff.staff_id})
                                    </span>
                                    <span className={combine("block text-xs mt-0.5", get('text', 'tertiary'))}>
                                      {staff.role}
                                    </span>
                                  </span>
                                </label>
                              );
                            })
                          )}
                        </div>
                        <p className={combine("text-xs mt-1", get('text', 'tertiary'))}>
                          Select one or more staff members
                        </p>
                      </div>
                    </div>
                  </div>
                ))}

                <button
                  onClick={addTaskField}
                  className={combine(
                    "w-full px-4 py-2.5 sm:py-3 rounded-xl transition-all duration-200 font-medium flex items-center justify-center gap-2 text-xs sm:text-sm",
                    theme === 'dark'
                      ? 'bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white'
                      : 'bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white',
                    "hover:scale-[1.02] active:scale-[0.98]"
                  )}
                >
                  <FaPlus className="text-xs sm:text-sm" /> Add Another Task
                </button>

                <div className="flex gap-3 pt-4 border-t border-gray-200 dark:border-gray-700">
                  <button
                    onClick={() => setShowAssignModal(false)}
                    className={combine(getSecondaryButtonClass(), "flex-1")}
                  >
                    Cancel
                  </button>
                  <button
                    onClick={assignWork}
                    disabled={assigning}
                    className={combine(
                      getPrimaryButtonClass(),
                      "flex-1 flex items-center justify-center gap-2 text-sm disabled:opacity-50"
                    )}
                  >
                    {assigning ? (
                      <>
                        <div className={combine(
                          "animate-spin rounded-full h-4 w-4 border-b-2",
                          theme === 'dark' ? 'border-white' : 'border-white'
                        )}></div>
                        Assigning...
                      </>
                    ) : (
                      <>
                        <FaCheck className="text-xs sm:text-sm" /> Assign Work
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Recurring Schedule Modal */}
        {showRecurringModal && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50 animate-fade-in backdrop-blur-sm">
            <div className={combine(
              getCardGradientClass('indigo'),
              "max-w-4xl w-full shadow-2xl max-h-[90vh] overflow-y-auto"
            )}>
              <div className="flex justify-between items-center mb-4">
                <h2 className={combine("text-lg font-bold", get('text', 'primary'))}>Set Recurring Work Schedule</h2>
                <button onClick={() => setShowRecurringModal(false)} className={combine(
                  "p-2 rounded-xl transition-all hover:bg-[var(--color-bg-hover)]",
                  get('icon', 'secondary') + " text-sm"
                )}>
                  <FaTimes className="text-sm" />
                </button>
              </div>

              <div className="space-y-6">
                <div>
                  <label className={combine("block text-xs sm:text-sm font-medium mb-2", get('text', 'primary'))}>Staff Type</label>
                  <select
                    value={recurringForm.staff_type}
                    onChange={(e) => setRecurringForm({ ...recurringForm, staff_type: e.target.value as StaffType })}
                    className={getInputClass()}
                  >
                    <option value="external_staff">External Staff</option>
                    <option value="admin_staff">Admin Staff</option>
                    <option value="finance_staff">Finance Staff</option>
                    <option value="it_staff">IT Staff</option>
                    <option value="operations_staff">Operations Staff</option>
                    <option value="transport_staff">Transport Staff</option>
                  </select>
                </div>

                {['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'].map((day) => (
                  <div key={day} className={combine("p-3 sm:p-4 rounded-lg", get('bg', 'secondary'))}>
                    <div className="flex justify-between items-center mb-3">
                      <h3 className={combine("text-sm font-medium capitalize", get('text', 'primary'))}>{day}</h3>
                      <button
                        onClick={() => addDayTask(day)}
                        className={combine(
                          "p-1.5 rounded-xl hover:text-[var(--color-accent-primary)]",
                          get('icon', 'primary') + " text-sm"
                        )}
                      >
                        <FaPlus className="text-xs sm:text-sm" />
                      </button>
                    </div>

                    <div className="space-y-3">
                      {Array.isArray(recurringForm[day as keyof typeof recurringForm]) && (recurringForm[day as keyof typeof recurringForm] as any[]).map((task: any, index: any) => (
                        <div key={index} className="grid grid-cols-1 md:grid-cols-3 gap-3">
                          <div className="md:col-span-2">
                            <input
                              type="text"
                              value={task.description}
                              onChange={(e) => updateDayTask(day, index, 'description', e.target.value)}
                              placeholder="Task description"
                              className={getInputClass()}
                            />
                          </div>
                          <div className="flex gap-2">
                            <select
                              value={task.staff_id}
                              onChange={(e) => updateDayTask(day, index, 'staff_id', e.target.value)}
                              className={getInputClass()}
                            >
                              <option value="">Select Staff</option>
                              {filteredStaffByType(recurringForm.staff_type).map(staff => (
                                <option key={staff.staff_id} value={staff.staff_id}>
                                  {staff.name} ({staff.staff_id})
                                </option>
                              ))}
                            </select>
                            {recurringForm[day as keyof typeof recurringForm].length > 1 && (
                              <button
                                onClick={() => removeDayTask(day, index)}
                                className={combine(
                                  "p-2 rounded-xl hover:text-[var(--color-accent-error)]",
                                  get('icon', 'primary') + " text-sm"
                                )}
                              >
                                <FaTrash className="text-xs sm:text-sm" />
                              </button>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}

                <div className="flex gap-3 pt-4 border-t border-gray-200 dark:border-gray-700">
                  <button
                    onClick={() => setShowRecurringModal(false)}
                    className={combine(getSecondaryButtonClass(), "flex-1")}
                  >
                    Cancel
                  </button>
                  <button
                    onClick={setRecurringSchedule}
                    disabled={assigning}
                    className={combine(
                      getPrimaryButtonClass(),
                      "flex-1 flex items-center justify-center gap-2 text-sm disabled:opacity-50"
                    )}
                  >
                    {assigning ? (
                      <>
                        <div className={combine(
                          "animate-spin rounded-full h-4 w-4 border-b-2",
                          theme === 'dark' ? 'border-white' : 'border-white'
                        )}></div>
                        Saving Schedule...
                      </>
                    ) : (
                      <>
                        <FaCheck className="text-xs sm:text-sm" /> Save Recurring Schedule
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Edit Task Modal */}
        {showEditModal && selectedTask && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50 animate-fade-in backdrop-blur-sm">
            <div className={combine(
              getCardGradientClass('blue'),
              "max-w-md w-full shadow-2xl"
            )}>
              <div className="flex justify-between items-center mb-4">
                <h2 className={combine("text-base sm:text-lg font-bold", get('text', 'primary'))}>Edit Task Description</h2>
                <button onClick={() => {
                  setShowEditModal(false);
                  setSelectedTask(null);
                }} className={combine(
                  "p-2 rounded-xl transition-all hover:bg-[var(--color-bg-hover)]",
                  get('icon', 'secondary') + " text-sm"
                )}>
                  <FaTimes className="text-xs sm:text-sm" />
                </button>
              </div>

              <div className="space-y-4">
                <div>
                  <label className={combine("block text-xs sm:text-sm font-medium mb-2", get('text', 'primary'))}>Task Description</label>
                  <textarea
                    value={editDescription}
                    onChange={(e) => setEditDescription(e.target.value)}
                    className={combine(getInputClass(), "h-32 resize-none")}
                    placeholder="Enter task description..."
                  />
                </div>

                <div className="flex gap-3 pt-4 border-t border-gray-200 dark:border-gray-700">
                  <button
                    onClick={() => {
                      setShowEditModal(false);
                      setSelectedTask(null);
                    }}
                    className={combine(getSecondaryButtonClass(), "flex-1")}
                  >
                    Cancel
                  </button>
                  <button
                    onClick={updateTaskDescription}
                    disabled={assigning || !editDescription.trim()}
                    className={combine(
                      getPrimaryButtonClass(),
                      "flex-1 flex items-center justify-center gap-2 text-sm disabled:opacity-50"
                    )}
                  >
                    {assigning ? (
                      <>
                        <div className={combine(
                          "animate-spin rounded-full h-4 w-4 border-b-2",
                          theme === 'dark' ? 'border-white' : 'border-white'
                        )}></div>
                        Updating...
                      </>
                    ) : (
                      <>
                        <FaCheck className="text-xs sm:text-sm" /> Update Task
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Task Details Modal */}
        {selectedTask && !showEditModal && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50 animate-fade-in backdrop-blur-sm">
            <div className={combine(
              getCardGradientClass(),
              "max-w-3xl w-full shadow-2xl max-h-[90vh] overflow-y-auto"
            )}>
              <div className="flex justify-between items-center mb-4">
                <div>
                  <h2 className={combine("text-base sm:text-lg font-bold", get('text', 'primary'))}>Task Details</h2>
                  <p className={combine("text-sm", get('text', 'secondary'))}>
                    {selectedTask.description || 'No description'}
                  </p>
                </div>
                <button onClick={() => setSelectedTask(null)} className={combine(
                  "p-2 rounded-xl transition-all hover:bg-[var(--color-bg-hover)]",
                  get('icon', 'secondary') + " text-sm"
                )}>
                  <FaTimes className="text-xs sm:text-sm" />
                </button>
              </div>

              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className={combine("p-3 rounded-lg", get('bg', 'secondary'))}>
                    <p className={combine("text-sm", get('text', 'tertiary'))}>Date</p>
                    <p className={combine("font-medium text-sm", get('text', 'primary'))}>
                      {selectedTask.date ? new Date(selectedTask.date).toLocaleDateString() : 'No date'}
                    </p>
                  </div>
                  <div className={combine("p-3 rounded-lg", get('bg', 'secondary'))}>
                    <p className={combine("text-sm", get('text', 'tertiary'))}>Schedule Type</p>
                    <p className={combine("font-medium text-sm", get('text', 'primary'))}>
                      {selectedTask.is_recurring ? 'Recurring Task' : 'One-time Task'}
                    </p>
                  </div>
                </div>

                <div>
                  <h3 className={combine("text-sm font-medium mb-3", get('text', 'primary'))}>Assigned Staff</h3>
                  <div className="space-y-3">
                    {Array.isArray(selectedTask.assignments) && selectedTask.assignments.map((assignment: any) => (
                      <div key={assignment?.assignment_id || Math.random()} className={combine("p-3 rounded-lg", get('bg', 'secondary'))}>
                        <div className="flex justify-between items-start mb-2">
                          <div>
                            <div className="font-medium text-sm">{assignment?.staff_name || 'Unknown'}</div>
                            <div className={combine("text-xs", get('text', 'tertiary'))}>{assignment?.staff_id || 'N/A'}</div>
                          </div>
                          <span className={getStatusBadgeClass(assignment?.status || 'Pending')}>
                            {assignment?.status || 'Pending'}
                          </span>
                        </div>

                        {assignment?.completion_note && (
                          <div className="mt-2">
                            <p className={combine("text-xs font-medium mb-1", get('text', 'tertiary'))}>Completion Note:</p>
                            <p className={combine("text-sm", get('text', 'primary'))}>{assignment.completion_note}</p>
                          </div>
                        )}

                        {assignment?.proof_url && (
                          <div className="mt-2">
                            <a
                              href={/^https?:\/\//i.test(assignment.proof_url) ? assignment.proof_url : `https://senthurvidyalaya-backend.onrender.com${assignment.proof_url.startsWith('/') ? '' : '/'}${assignment.proof_url}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className={combine(
                                "inline-flex items-center space-x-1 text-xs px-2 py-1 rounded",
                                theme === 'dark'
                                  ? 'bg-indigo-900/30 text-indigo-300 hover:bg-indigo-800/30'
                                  : 'bg-indigo-100 text-indigo-700 hover:bg-indigo-200'
                              )}
                            >
                              <FaFileAlt className="text-xs" />
                              <span>View Proof</span>
                            </a>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Delete Confirmation Modal */}
        {showDeleteConfirm && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-3 sm:p-4 z-[1000] animate-fade-in backdrop-blur-sm">
            <div className={combine(
              getCardGradientClass('red'),
              "max-w-md w-full shadow-2xl"
            )}>
              <div className="text-center">
                <div className={combine(
                  "mx-auto flex items-center justify-center h-10 sm:h-12 w-10 sm:w-12 rounded-full mb-2 mb-3",
                  theme === 'dark' ? 'bg-red-900/30' : 'bg-red-100'
                )}>
                  <FaTrash className={combine(
                    "h-4 sm:h-5 w-4 sm:w-5",
                    theme === 'dark' ? 'text-red-400' : 'text-red-600'
                  )} />
                </div>
                <h3 className={combine("text-base sm:text-lg font-bold mb-1 sm:mb-1.5", get('text', 'primary'))}>
                  Delete {deleteMetadata.type}
                </h3>
                <p className={combine("text-xs sm:text-sm mb-3 sm:mb-4", get('text', 'secondary'))}>
                  {deleteMetadata.description || `Are you sure you want to delete this ${deleteMetadata.type?.toLowerCase()}? This action cannot be undone.`}
                </p>
                <div className="flex space-x-2">
                  <button
                    onClick={() => {
                      setShowDeleteConfirm(false);
                      setDeleteId(null);
                      setDeleteMode(null);
                    }}
                    className={combine(getSecondaryButtonClass(), "text-xs sm:text-sm flex-1")}
                    disabled={deleting}
                  >
                    Cancel
                  </button>
                  <button
                    onClick={executeDelete}
                    disabled={deleting}
                    className={combine(
                      getPrimaryButtonClass(),
                      "text-xs sm:text-sm flex-1",
                      theme === 'dark'
                        ? 'bg-gradient-to-r from-red-600 to-red-700 hover:from-red-700 hover:to-red-800'
                        : 'bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700'
                    )}
                  >
                    {deleting ? (
                      <span className="flex items-center justify-center gap-2">
                        <RefreshCw className="h-4 w-4 animate-spin" />
                        Deleting...
                      </span>
                    ) : (
                      'Delete'
                    )}
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
