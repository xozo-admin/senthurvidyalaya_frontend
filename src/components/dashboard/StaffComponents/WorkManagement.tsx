'use client';

import { useEffect, useState } from 'react';
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
  FaDownload,
  FaInfoCircle,
  FaExclamationTriangle,
  FaCheckCircle,
  FaHourglassHalf
} from 'react-icons/fa';
import { useTheme } from '@/contexts/ThemeContext';
import { useThemeClasses } from '@/hooks/useThemeClasses';
import { toastSuccess, toastError, toastInfo } from '@/lib/toast';

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

type TaskStatus = 'all' | 'Pending' | 'Completed' | 'In Progress' | 'Overdue';
type ViewMode = 'daily' | 'weekly' | 'monthly' | 'recurring';
type StaffType = 'external_staff' | 'internal_staff' | 'teaching_staff' | 'all';

export const WorkManagementPage = () => {
  const { theme } = useTheme();
  const { get, combine } = useThemeClasses();
  const [loading, setLoading] = useState(false);
  const [assigning, setAssigning] = useState(false);
  const [workAssignments, setWorkAssignments] = useState<WorkAssignment[]>([]);
  const [recurringSchedules, setRecurringSchedules] = useState<RecurringSchedule[]>([]);
  const [staffList, setStaffList] = useState<StaffMember[]>([]);
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [filterStatus, setFilterStatus] = useState<TaskStatus>('all');
  const [filterStaffType, setFilterStaffType] = useState<StaffType>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [viewMode, setViewMode] = useState<ViewMode>('daily');
  const [currentPage, setCurrentPage] = useState(1);
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [showRecurringModal, setShowRecurringModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedTask, setSelectedTask] = useState<WorkAssignment | null>(null);
  const [editDescription, setEditDescription] = useState('');
  const [deleteMode, setDeleteMode] = useState<'task' | 'assignment' | null>(null);
  const [scheduleToDelete, setScheduleToDelete] = useState<number | null>(null);

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

  // Theme classes
  const getBgClass = () => combine(
    get('bg', 'primary'),
    'min-h-screen transition-colors duration-200'
  );

  const getCardGradientClass = (color: string = 'purple') => {
    const baseClasses = combine(
      'rounded-2xl p-6 border shadow-lg transition-all duration-300 group hover:shadow-xl my-2',
      get('border', 'primary')
    );

    const gradients = {
      purple: theme === 'dark' ? 'from-gray-800 to-purple-900/10' : 'from-white to-purple-50',
      emerald: theme === 'dark' ? 'from-gray-800 to-emerald-900/10' : 'from-white to-emerald-50',
      blue: theme === 'dark' ? 'from-gray-800 to-blue-900/10' : 'from-white to-blue-50',
      amber: theme === 'dark' ? 'from-gray-800 to-amber-900/10' : 'from-white to-amber-50',
      indigo: theme === 'dark' ? 'from-gray-800 to-indigo-900/10' : 'from-white to-indigo-50',
    };

    return combine(baseClasses, 'bg-gradient-to-br', gradients[color as keyof typeof gradients] || gradients.purple);
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

  // Helper function to map role to staff_type
  const mapRoleToStaffType = (role: string): StaffType => {
    if (role.includes('external')) return 'external_staff';
    if (role.includes('teaching') || role.includes('teacher')) return 'teaching_staff';
    if (['admin_staff', 'finance_staff', 'it_staff', 'operations_staff', 'transport_staff'].includes(role)) {
      return 'internal_staff';
    }
    return 'external_staff'; // default
  };

  // Fetch work assignments
  const fetchWorkAssignments = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      let url = 'https://senthurvidyalaya-backend.onrender.com/api/staff_work/admin/manage/';
      
      const params = new URLSearchParams();
      if (selectedDate) params.append('date', selectedDate);
      if (filterStaffType !== 'all') params.append('staff_type', filterStaffType);
      
      if (params.toString()) {
        url += `?${params.toString()}`;
      }

      const res = await fetch(url, {
        headers: { 
          Authorization: `Token ${token}`,
          'Content-Type': 'application/json'
        },
      });
      
      if (res.ok) {
        const data = await res.json();
        setWorkAssignments(data?.data || data || []);
      } else {
        toastError('Failed to fetch work assignments');
      }
    } catch (error) {
      console.error('Error fetching work assignments:', error);
      toastError('Network error while fetching work assignments');
    } finally {
      setLoading(false);
    }
  };

  // Fetch recurring schedules
  const fetchRecurringSchedules = async () => {
    try {
      const token = localStorage.getItem('token');
      const res = await fetch('https://senthurvidyalaya-backend.onrender.com/api/staff_work/admin/recurring-schedule/', {
        headers: { 
          Authorization: `Token ${token}`,
          'Content-Type': 'application/json'
        },
      });
      
      if (res.ok) {
        const data = await res.json();
        setRecurringSchedules(data?.data || data || []);
      }
    } catch (error) {
      console.error('Error fetching recurring schedules:', error);
    }
  };

  // Fetch staff list
  const fetchStaffList = async () => {
    try {
      const token = localStorage.getItem('token');
      const res = await fetch('https://senthurvidyalaya-backend.onrender.com/api/schooladmin/staff/', {
        headers: { 
          Authorization: `Token ${token}`,
          'Content-Type': 'application/json'
        },
      });
      
      if (res.ok) {
        const data = await res.json();
        setStaffList(data || []);
      }
    } catch (error) {
      console.error('Error fetching staff list:', error);
      toastError('Failed to fetch staff list');
    }
  };

  // Assign work to staff
  const assignWork = async () => {
    setAssigning(true);
    try {
      const token = localStorage.getItem('token');
      
      // Prepare tasks with proper formatting
      const tasks: BulkAssignTask[] = assignForm.tasks.map(task => ({
        description: task.description.trim(),
        staff_id: task.staff_id.length === 1 ? task.staff_id[0] : task.staff_id
      })).filter(task => task.description && task.staff_id);

      if (tasks.length === 0) {
        toastError('Please fill in all task details');
        return;
      }

      const payload = {
        staff_type: assignForm.staff_type,
        tasks: tasks
      };

      const res = await fetch('https://senthurvidyalaya-backend.onrender.com/api/staff_work/admin/assign-bulk/', {
        method: 'POST',
        headers: {
          Authorization: `Token ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      const data = await res.json();

      if (res.ok) {
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
      const token = localStorage.getItem('token');
      
      // Filter out empty entries
      const payload: any = {
        staff_type: recurringForm.staff_type
      };

      // Add only non-empty days
      const days = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
      days.forEach(day => {
        const dayTasks = recurringForm[day as keyof typeof recurringForm] as DayTask[];
        const validTasks = dayTasks.filter(task => task.staff_id && task.description.trim());
        if (validTasks.length > 0) {
          payload[day] = validTasks;
        }
      });

      // Check if any tasks were provided
      const hasTasks = Object.keys(payload).some(key => Array.isArray(payload[key]) && payload[key].length > 0);
      if (!hasTasks) {
        toastError('Please add at least one task for the schedule');
        return;
      }

      const res = await fetch('https://senthurvidyalaya-backend.onrender.com/api/staff_work/admin/recurring-schedule/', {
        method: 'POST',
        headers: {
          Authorization: `Token ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      const data = await res.json();

      if (res.ok) {
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
      const token = localStorage.getItem('token');
      const res = await fetch('https://senthurvidyalaya-backend.onrender.com/api/staff_work/admin/manage/', {
        method: 'PUT',
        headers: {
          Authorization: `Token ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          task_id: selectedTask.task_id,
          new_description: editDescription.trim()
        }),
      });

      const data = await res.json();

      if (res.ok) {
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

  // Delete task or assignment
  const deleteTaskOrAssignment = async (id: number, type: 'task' | 'assignment') => {
    setAssigning(true);
    try {
      const token = localStorage.getItem('token');
      const res = await fetch('https://senthurvidyalaya-backend.onrender.com/api/staff_work/admin/manage/', {
        method: 'DELETE',
        headers: {
          Authorization: `Token ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(
          type === 'task' 
            ? { task_id: id }
            : { assignment_id: id }
        ),
      });

      const data = await res.json();

      if (res.ok) {
        toastSuccess(data.message || 'Deleted successfully');
        setDeleteMode(null);
        fetchWorkAssignments();
      } else {
        toastError(data.detail || data.error || 'Failed to delete');
      }
    } catch (error) {
      console.error('Error deleting:', error);
      toastError('Network error while deleting');
    } finally {
      setAssigning(false);
    }
  };

  // Delete recurring schedule
  const deleteRecurringSchedule = async (scheduleId: number) => {
    setAssigning(true);
    try {
      const token = localStorage.getItem('token');
      const res = await fetch('https://senthurvidyalaya-backend.onrender.com/api/staff_work/admin/recurring-schedule/', {
        method: 'DELETE',
        headers: {
          Authorization: `Token ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ schedule_id: scheduleId }),
      });

      const data = await res.json();

      if (res.ok) {
        toastSuccess(data.message || 'Schedule deleted successfully');
        setScheduleToDelete(null);
        fetchRecurringSchedules();
        fetchWorkAssignments();
      } else {
        toastError(data.detail || 'Failed to delete schedule');
      }
    } catch (error) {
      console.error('Error deleting schedule:', error);
      toastError('Network error while deleting schedule');
    } finally {
      setAssigning(false);
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

    // Ensure each day has at least one empty task
    Object.keys(form).forEach(day => {
      if (day !== 'staff_type' && form[day].length === 0) {
        form[day] = [{ staff_id: '', description: '' }];
      }
    });

    setRecurringForm(form);
    setShowRecurringModal(true);
  };

  useEffect(() => {
    fetchWorkAssignments();
    fetchStaffList();
    fetchRecurringSchedules();
  }, [selectedDate, filterStaffType]);

  // Filter staff by type for dropdowns
  const filteredStaffByType = (type: StaffType) => {
    if (type === 'all') return staffList;
    return staffList.filter(staff => mapRoleToStaffType(staff.role) === type);
  };

  // Filter and search
  const filteredAssignments = workAssignments.filter(assignment => {
    const matchesSearch = 
      assignment.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
      assignment.assignments.some(a => 
        a.staff_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        a.staff_id.toLowerCase().includes(searchTerm.toLowerCase())
      );
    
    const matchesStatus = filterStatus === 'all' ||
      assignment.assignments.some(a => a.status === filterStatus);
    
    return matchesSearch && matchesStatus;
  });

  // Pagination
  const totalPages = Math.ceil(filteredAssignments.length / itemsPerPage);
  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentAssignments = filteredAssignments.slice(indexOfFirstItem, indexOfLastItem);

  // Statistics
  const stats = {
    total: workAssignments.length,
    completed: workAssignments.reduce((acc, curr) => 
      acc + curr.assignments.filter(a => a.status === 'Completed').length, 0
    ),
    pending: workAssignments.reduce((acc, curr) => 
      acc + curr.assignments.filter(a => a.status === 'Pending').length, 0
    ),
    inProgress: workAssignments.reduce((acc, curr) => 
      acc + curr.assignments.filter(a => a.status === 'In Progress').length, 0
    ),
    recurring: workAssignments.filter(a => a.is_recurring).length,
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

  const exportWorkReport = () => {
    const headers = ['Date', 'Task', 'Staff Assigned', 'Staff ID', 'Status', 'Completion Note', 'Proof URL'];
    const csvData = workAssignments.flatMap(assignment => 
      assignment.assignments.map(assign => [
        assignment.date,
        assignment.description,
        assign.staff_name,
        assign.staff_id,
        assign.status,
        assign.completion_note || 'N/A',
        assign.proof_url || 'N/A'
      ])
    );
    
    const csvContent = [
      headers.join(','),
      ...csvData.map(row => row.map(field => `"${String(field).replace(/"/g, '""')}"`).join(','))
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
    toastSuccess('Work report exported successfully!');
  };

  return (
    <div className={`p-6 ${getBgClass()}`}>
      <div className="mx-auto w-full">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center space-x-4">
              <div className={combine(
                "p-3 rounded-2xl shadow-lg",
                theme === 'dark' 
                  ? "bg-gradient-to-br from-purple-600 to-purple-700" 
                  : "bg-gradient-to-br from-purple-500 to-purple-600"
              )}>
                <FaTasks className="text-2xl text-white" />
              </div>
              <div>
                <h1 className={combine("text-3xl font-bold", get('text', 'primary'))}>
                  Work Management
                </h1>
                <p className={combine("text-sm mt-1", get('text', 'secondary'))}>
                  Assign and manage tasks for staff members
                </p>
              </div>
            </div>
            
            <div className="flex items-center space-x-3">
              <button
                onClick={exportWorkReport}
                className={combine(getSecondaryButtonClass(), "flex items-center space-x-2")}
              >
                <FaDownload className="text-sm" />
                <span className="text-sm">Export Report</span>
              </button>
              
              <button
                onClick={loadRecurringSchedulesToForm}
                className={combine(getSecondaryButtonClass(), "flex items-center space-x-2")}
              >
                <FaExclamationTriangle className="text-sm" />
                <span className="text-sm">Manage Recurring</span>
              </button>
              
              <button
                onClick={() => setShowAssignModal(true)}
                className={combine(getPrimaryButtonClass(), "flex items-center space-x-2")}
              >
                <FaPlus className="text-sm" />
                <span className="text-sm">Assign Work</span>
              </button>
            </div>
          </div>

          {/* Stats Cards */}
          <div className="grid grid-cols-1 lg:grid-cols-6 gap-6 mb-8">
            <div className={getCardGradientClass('purple')}>
              <div className="flex items-center justify-between">
                <div>
                  <p className={combine("text-xs font-medium", get('text', 'secondary'))}>Total Tasks</p>
                  <p className={combine("text-2xl font-bold mt-2", get('text', 'primary'))}>{stats.total}</p>
                </div>
                <div className={combine(
                  "p-2 rounded-xl",
                  theme === 'dark' ? 'bg-purple-900/30' : 'bg-purple-100'
                )}>
                  <FaTasks className={combine(
                    "text-lg",
                    theme === 'dark' ? 'text-purple-400' : 'text-purple-600'
                  )} />
                </div>
              </div>
              <div className={combine("mt-4 text-xs", get('text', 'tertiary'))}>
                Active work assignments
              </div>
            </div>
            
            <div className={getCardGradientClass('emerald')}>
              <div className="flex items-center justify-between">
                <div>
                  <p className={combine("text-xs font-medium", get('text', 'secondary'))}>Completed</p>
                  <p className={combine("text-2xl font-bold mt-2", get('text', 'primary'))}>{stats.completed}</p>
                </div>
                <div className={combine(
                  "p-2 rounded-xl",
                  theme === 'dark' ? 'bg-emerald-900/30' : 'bg-emerald-100'
                )}>
                  <FaCheckCircle className={combine(
                    "text-lg",
                    theme === 'dark' ? 'text-emerald-400' : 'text-emerald-600'
                  )} />
                </div>
              </div>
              <div className={combine("mt-3 text-xs", get('accent', 'success'))}>
                Tasks completed
              </div>
            </div>
            
            <div className={getCardGradientClass('amber')}>
              <div className="flex items-center justify-between">
                <div>
                  <p className={combine("text-xs font-medium", get('text', 'secondary'))}>In Progress</p>
                  <p className={combine("text-2xl font-bold mt-2", get('text', 'primary'))}>{stats.inProgress}</p>
                </div>
                <div className={combine(
                  "p-2 rounded-xl",
                  theme === 'dark' ? 'bg-amber-900/30' : 'bg-amber-100'
                )}>
                  <FaHourglassHalf className={combine(
                    "text-lg",
                    theme === 'dark' ? 'text-amber-400' : 'text-amber-600'
                  )} />
                </div>
              </div>
              <div className={combine("mt-3 text-xs", get('accent', 'warning'))}>
                Ongoing tasks
              </div>
            </div>
            
            <div className={getCardGradientClass('blue')}>
              <div className="flex items-center justify-between">
                <div>
                  <p className={combine("text-xs font-medium", get('text', 'secondary'))}>Pending</p>
                  <p className={combine("text-2xl font-bold mt-2", get('text', 'primary'))}>{stats.pending}</p>
                </div>
                <div className={combine(
                  "p-2 rounded-xl",
                  theme === 'dark' ? 'bg-blue-900/30' : 'bg-blue-100'
                )}>
                  <FaClock className={combine(
                    "text-lg",
                    theme === 'dark' ? 'text-blue-400' : 'text-blue-600'
                  )} />
                </div>
              </div>
              <div className={combine("mt-3 text-xs", get('accent', 'primary'))}>
                Awaiting start
              </div>
            </div>
            
            <div className={getCardGradientClass('indigo')}>
              <div className="flex items-center justify-between">
                <div>
                  <p className={combine("text-xs font-medium", get('text', 'secondary'))}>Recurring Tasks</p>
                  <p className={combine("text-2xl font-bold mt-2", get('text', 'primary'))}>{stats.recurring}</p>
                </div>
                <div className={combine(
                  "p-2 rounded-xl",
                  theme === 'dark' ? 'bg-indigo-900/30' : 'bg-indigo-100'
                )}>
                  <FaExclamationTriangle className={combine(
                    "text-lg",
                    theme === 'dark' ? 'text-indigo-400' : 'text-indigo-600'
                  )} />
                </div>
              </div>
              <div className={combine("mt-3 text-xs", get('accent', 'primary'))}>
                Daily/Weekly tasks
              </div>
            </div>
            
            <div className={getCardGradientClass('purple')}>
              <div className="flex items-center justify-between">
                <div>
                  <p className={combine("text-xs font-medium", get('text', 'secondary'))}>Schedule Templates</p>
                  <p className={combine("text-2xl font-bold mt-2", get('text', 'primary'))}>{stats.recurringSchedules}</p>
                </div>
                <div className={combine(
                  "p-2 rounded-xl",
                  theme === 'dark' ? 'bg-purple-900/30' : 'bg-purple-100'
                )}>
                  <FaCalendarAlt className={combine(
                    "text-lg",
                    theme === 'dark' ? 'text-purple-400' : 'text-purple-600'
                  )} />
                </div>
              </div>
              <div className={combine("mt-3 text-xs", get('accent', 'primary'))}>
                Recurring schedules
              </div>
            </div>
          </div>
        </div>

        {/* Filters */}
        <div className={getCardGradientClass('purple')}>
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
            <div>
              <label className={combine("block text-sm font-medium mb-2", get('text', 'primary'))}>Date</label>
              <input
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                className={getInputClass()}
              />
            </div>
            <div>
              <label className={combine("block text-sm font-medium mb-2", get('text', 'primary'))}>Staff Type</label>
              <select
                value={filterStaffType}
                onChange={(e) => setFilterStaffType(e.target.value as StaffType)}
                className={getInputClass()}
              >
                <option value="all">All Staff Types</option>
                <option value="external_staff">External Staff</option>
                <option value="internal_staff">Internal Staff</option>
                <option value="teaching_staff">Teaching Staff</option>
              </select>
            </div>
            <div>
              <label className={combine("block text-sm font-medium mb-2", get('text', 'primary'))}>Status</label>
              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value as TaskStatus)}
                className={getInputClass()}
              >
                <option value="all">All Status</option>
                <option value="Pending">Pending</option>
                <option value="In Progress">In Progress</option>
                <option value="Completed">Completed</option>
                <option value="Overdue">Overdue</option>
              </select>
            </div>
            <div>
              <label className={combine("block text-sm font-medium mb-2", get('text', 'primary'))}>Search</label>
              <div className="relative">
                <FaSearch className={combine(
                  "absolute left-4 top-1/2 transform -translate-y-1/2 text-sm",
                  get('icon', 'secondary')
                )} />
                <input
                  type="text"
                  placeholder="Search tasks or staff..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className={getInputClass()}
                  style={{ paddingLeft: '2.5rem' }}
                />
              </div>
            </div>
            <div className="flex items-end">
              <button
                onClick={() => {
                  setSelectedDate(new Date().toISOString().split('T')[0]);
                  setFilterStaffType('all');
                  setFilterStatus('all');
                  setSearchTerm('');
                  setCurrentPage(1);
                }}
                className={combine(getSecondaryButtonClass(), "w-full flex items-center justify-center space-x-2")}
              >
                <FaTimes className="text-sm" />
                <span className="text-sm">Clear Filters</span>
              </button>
            </div>
          </div>
        </div>

        {/* Work Assignments Table */}
        <div className={getCardGradientClass()}>
          <div className={combine("p-4 border-b", get('border', 'primary'))}>
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center space-y-3 md:space-y-0">
              <div>
                <h3 className={combine("text-lg font-bold", get('text', 'primary'))}>Work Assignments</h3>
                <p className={combine("text-sm mt-1", get('text', 'secondary'))}>
                  View and manage staff work assignments
                </p>
              </div>
              
              <div className={combine("text-xs", get('text', 'tertiary'))}>
                Showing {indexOfFirstItem + 1} to {Math.min(indexOfLastItem, filteredAssignments.length)} of {filteredAssignments.length} tasks
              </div>
            </div>
          </div>

          <div className="overflow-x-auto">
            {loading ? (
              <div className="p-8 text-center">
                <div className="inline-flex flex-col items-center">
                  <div className={combine(
                    "animate-spin rounded-full h-8 w-8 border-4",
                    theme === 'dark' ? 'border-purple-500 border-t-transparent' : 'border-purple-600 border-t-transparent'
                  )}></div>
                  <p className={combine("mt-3 text-sm font-medium", get('text', 'secondary'))}>Loading work assignments...</p>
                </div>
              </div>
            ) : currentAssignments.length === 0 ? (
              <div className="p-8 text-center">
                <div className={combine(
                  "inline-block p-3 rounded-full mb-3",
                  theme === 'dark' ? 'bg-purple-900/30' : 'bg-purple-100'
                )}>
                  <FaTasks className={combine(
                    "text-xl",
                    theme === 'dark' ? 'text-purple-400' : 'text-purple-500'
                  )} />
                </div>
                <h3 className={combine("text-base font-medium mb-1", get('text', 'primary'))}>No work assignments found</h3>
                <p className={combine("text-sm mb-4", get('text', 'secondary'))}>
                  {searchTerm || filterStatus !== 'all' || selectedDate || filterStaffType !== 'all'
                    ? 'Try adjusting your filters'
                    : 'Assign tasks to staff to get started'}
                </p>
                {!searchTerm && filterStatus === 'all' && filterStaffType === 'all' && (
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
                <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                  <thead className={combine("bg-[var(--color-bg-secondary)]", get('border', 'primary'))}>
                    <tr>
                      <th className={combine(
                        "px-4 py-3 text-left text-xs font-medium uppercase tracking-wider",
                        get('text', 'tertiary')
                      )}>
                        Task Details
                      </th>
                      <th className={combine(
                        "px-4 py-3 text-left text-xs font-medium uppercase tracking-wider",
                        get('text', 'tertiary')
                      )}>
                        Staff Assigned
                      </th>
                      <th className={combine(
                        "px-4 py-3 text-left text-xs font-medium uppercase tracking-wider",
                        get('text', 'tertiary')
                      )}>
                        Date & Schedule
                      </th>
                      <th className={combine(
                        "px-4 py-3 text-left text-xs font-medium uppercase tracking-wider",
                        get('text', 'tertiary')
                      )}>
                        Status
                      </th>
                      <th className={combine(
                        "px-4 py-3 text-left text-xs font-medium uppercase tracking-wider",
                        get('text', 'tertiary')
                      )}>
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className={combine("divide-y", get('border', 'primary'))}>
                    {currentAssignments.map((assignment) => (
                      <tr key={assignment.task_id} className="hover:bg-[var(--color-bg-hover)]">
                        <td className="px-4 py-3">
                          <div className="max-w-xs">
                            <div className="font-medium text-sm">{assignment.description}</div>
                            {assignment.is_recurring && (
                              <div className={combine("text-xs mt-1 flex items-center", get('accent', 'primary'))}>
                                <FaExclamationTriangle className="mr-1 text-xs" />
                                Recurring Task
                              </div>
                            )}
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <div className="space-y-1">
                            {assignment.assignments.map((assign) => (
                              <div key={assign.assignment_id} className="flex items-center justify-between">
                                <div>
                                  <div className="text-sm font-medium">{assign.staff_name}</div>
                                  <div className={combine("text-xs", get('text', 'tertiary'))}>{assign.staff_id}</div>
                                </div>
                                <button
                                  onClick={() => {
                                    if (confirm(`Remove ${assign.staff_name} from this task?`)) {
                                      deleteTaskOrAssignment(assign.assignment_id, 'assignment');
                                    }
                                  }}
                                  className={combine(
                                    "p-1 hover:text-[var(--color-accent-error)]",
                                    get('icon', 'primary') + " text-sm"
                                  )}
                                  title="Remove Staff"
                                >
                                  <FaTrash className="text-xs" />
                                </button>
                              </div>
                            ))}
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <div className="text-sm">
                            {new Date(assignment.date).toLocaleDateString()}
                          </div>
                          <div className={combine("text-xs mt-1", get('text', 'tertiary'))}>
                            {new Date(assignment.date).toLocaleDateString('en-US', { weekday: 'long' })}
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <div className="space-y-1">
                            {assignment.assignments.map((assign) => (
                              <div key={assign.assignment_id}>
                                <span className={getStatusBadgeClass(assign.status)}>
                                  {assign.status}
                                </span>
                              </div>
                            ))}
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center space-x-1">
                            <button
                              onClick={() => viewTaskDetails(assignment)}
                              className={combine(
                                "p-1.5 rounded-xl transition-all duration-200 hover:text-[var(--color-accent-primary)]",
                                get('icon', 'primary') + " text-sm"
                              )}
                              title="View Details"
                            >
                              <FaEye className="text-sm" />
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
                              <FaEdit className="text-sm" />
                            </button>
                            <button
                              onClick={() => {
                                if (confirm('Delete this entire task for all staff?')) {
                                  deleteTaskOrAssignment(assignment.task_id, 'task');
                                }
                              }}
                              className={combine(
                                "p-1.5 rounded-xl transition-all duration-200 hover:text-[var(--color-accent-error)]",
                                get('icon', 'primary') + " text-sm"
                              )}
                              title="Delete Task"
                            >
                              <FaTrash className="text-sm" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>

                {/* Pagination */}
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

        {/* Recurring Schedules Section */}
        {recurringSchedules.length > 0 && (
          <div className={getCardGradientClass('indigo')}>
            <div className={combine("p-4 border-b", get('border', 'primary'))}>
              <div className="flex flex-col md:flex-row justify-between items-start md:items-center space-y-3 md:space-y-0">
                <div>
                  <h3 className={combine("text-lg font-bold", get('text', 'primary'))}>Recurring Schedules</h3>
                  <p className={combine("text-sm mt-1", get('text', 'secondary'))}>
                    Weekly recurring task templates
                  </p>
                </div>
                <div className={combine("text-xs", get('text', 'tertiary'))}>
                  {recurringSchedules.length} schedule templates
                </div>
              </div>
            </div>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                <thead className={combine("bg-[var(--color-bg-secondary)]", get('border', 'primary'))}>
                  <tr>
                    <th className={combine(
                      "px-4 py-3 text-left text-xs font-medium uppercase tracking-wider",
                      get('text', 'tertiary')
                    )}>
                      Day
                    </th>
                    <th className={combine(
                      "px-4 py-3 text-left text-xs font-medium uppercase tracking-wider",
                      get('text', 'tertiary')
                    )}>
                      Staff
                    </th>
                    <th className={combine(
                      "px-4 py-3 text-left text-xs font-medium uppercase tracking-wider",
                      get('text', 'tertiary')
                    )}>
                      Task Description
                    </th>
                    <th className={combine(
                      "px-4 py-3 text-left text-xs font-medium uppercase tracking-wider",
                      get('text', 'tertiary')
                    )}>
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className={combine("divide-y", get('border', 'primary'))}>
                  {recurringSchedules.map((schedule) => (
                    <tr key={schedule.id} className="hover:bg-[var(--color-bg-hover)]">
                      <td className="px-4 py-3">
                        <div className="font-medium text-sm capitalize">{schedule.day_of_week}</div>
                      </td>
                      <td className="px-4 py-3">
                        <div>
                          <div className="text-sm font-medium">{schedule.staff_name}</div>
                          <div className={combine("text-xs", get('text', 'tertiary'))}>{schedule.staff_id}</div>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="font-medium text-sm">{schedule.description}</div>
                      </td>
                      <td className="px-4 py-3">
                        <button
                          onClick={() => {
                            if (confirm(`Delete this recurring schedule for ${schedule.staff_name} on ${schedule.day_of_week}?`)) {
                              deleteRecurringSchedule(schedule.id);
                            }
                          }}
                          className={combine(
                            "p-1.5 rounded-xl transition-all duration-200 hover:text-[var(--color-accent-error)]",
                            get('icon', 'primary') + " text-sm"
                          )}
                          title="Delete Schedule"
                        >
                          <FaTrash className="text-sm" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

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
                  <label className={combine("block text-sm font-medium mb-2", get('text', 'primary'))}>Staff Type</label>
                  <select
                    value={assignForm.staff_type}
                    onChange={(e) => setAssignForm({...assignForm, staff_type: e.target.value as StaffType})}
                    className={getInputClass()}
                  >
                    <option value="external_staff">External Staff</option>
                    <option value="internal_staff">Internal Staff</option>
                    <option value="teaching_staff">Teaching Staff</option>
                  </select>
                </div>

                {assignForm.tasks.map((task, index) => (
                  <div key={index} className={combine("p-4 rounded-lg", get('bg', 'secondary'))}>
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
                          <FaTrash className="text-sm" />
                        </button>
                      )}
                    </div>

                    <div className="space-y-3">
                      <div>
                        <label className={combine("block text-sm font-medium mb-2", get('text', 'primary'))}>Task Description *</label>
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
                        <label className={combine("block text-sm font-medium mb-2", get('text', 'primary'))}>Assign to Staff *</label>
                        <select
                          multiple
                          value={task.staff_id}
                          onChange={(e) => {
                            const selected = Array.from(e.target.selectedOptions, option => option.value);
                            updateTaskField(index, 'staff_id', selected);
                          }}
                          className={combine(getInputClass(), "h-32")}
                          required
                        >
                          {filteredStaffByType(assignForm.staff_type).map(staff => (
                            <option key={staff.staff_id} value={staff.staff_id}>
                              {staff.name} ({staff.staff_id}) - {staff.role}
                            </option>
                          ))}
                        </select>
                        <p className={combine("text-xs mt-1", get('text', 'tertiary'))}>
                          Hold Ctrl/Cmd to select multiple staff members
                        </p>
                      </div>
                    </div>
                  </div>
                ))}

                <button
                  onClick={addTaskField}
                  className={combine(
                    "w-full px-4 py-3 rounded-xl transition-all duration-200 font-medium flex items-center justify-center gap-2 text-sm",
                    theme === 'dark'
                      ? 'bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white'
                      : 'bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white',
                    "hover:scale-[1.02] active:scale-[0.98]"
                  )}
                >
                  <FaPlus className="text-sm" /> Add Another Task
                </button>

                <div className="flex gap-3 pt-4 border-t border-gray-200 dark:border-gray-700">
                  <button
                    onClick={() => setShowAssignModal(false)}
                    className={combine(getSecondaryButtonClass(), "flex-1 text-sm")}
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
                        <FaCheck className="text-sm" /> Assign Work
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
                  <label className={combine("block text-sm font-medium mb-2", get('text', 'primary'))}>Staff Type</label>
                  <select
                    value={recurringForm.staff_type}
                    onChange={(e) => setRecurringForm({...recurringForm, staff_type: e.target.value as StaffType})}
                    className={getInputClass()}
                  >
                    <option value="external_staff">External Staff</option>
                    <option value="internal_staff">Internal Staff</option>
                    <option value="teaching_staff">Teaching Staff</option>
                  </select>
                </div>

                {['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'].map((day) => (
                  <div key={day} className={combine("p-4 rounded-lg", get('bg', 'secondary'))}>
                    <div className="flex justify-between items-center mb-3">
                      <h3 className={combine("text-sm font-medium capitalize", get('text', 'primary'))}>{day}</h3>
                      <button
                        onClick={() => addDayTask(day)}
                        className={combine(
                          "p-1.5 rounded-xl hover:text-[var(--color-accent-primary)]",
                          get('icon', 'primary') + " text-sm"
                        )}
                      >
                        <FaPlus className="text-sm" />
                      </button>
                    </div>

                    <div className="space-y-3">
                      {Array.isArray(recurringForm[day as keyof typeof recurringForm]) && (recurringForm[day as keyof typeof recurringForm] as any[]).map((task:any, index:any) => (
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
                                <FaTrash className="text-sm" />
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
                    className={combine(getSecondaryButtonClass(), "flex-1 text-sm")}
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
                        <FaCheck className="text-sm" /> Save Recurring Schedule
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
                <h2 className={combine("text-lg font-bold", get('text', 'primary'))}>Edit Task Description</h2>
                <button onClick={() => {
                  setShowEditModal(false);
                  setSelectedTask(null);
                }} className={combine(
                  "p-2 rounded-xl transition-all hover:bg-[var(--color-bg-hover)]",
                  get('icon', 'secondary') + " text-sm"
                )}>
                  <FaTimes className="text-sm" />
                </button>
              </div>

              <div className="space-y-4">
                <div>
                  <label className={combine("block text-sm font-medium mb-2", get('text', 'primary'))}>Task Description</label>
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
                    className={combine(getSecondaryButtonClass(), "flex-1 text-sm")}
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
                        <FaCheck className="text-sm" /> Update Task
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
                  <h2 className={combine("text-lg font-bold", get('text', 'primary'))}>Task Details</h2>
                  <p className={combine("text-sm", get('text', 'secondary'))}>
                    {selectedTask.description}
                  </p>
                </div>
                <button onClick={() => setSelectedTask(null)} className={combine(
                  "p-2 rounded-xl transition-all hover:bg-[var(--color-bg-hover)]",
                  get('icon', 'secondary') + " text-sm"
                )}>
                  <FaTimes className="text-sm" />
                </button>
              </div>

              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className={combine("p-3 rounded-lg", get('bg', 'secondary'))}>
                    <p className={combine("text-sm", get('text', 'tertiary'))}>Date</p>
                    <p className={combine("font-medium text-sm", get('text', 'primary'))}>
                      {new Date(selectedTask.date).toLocaleDateString()}
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
                    {selectedTask.assignments.map((assignment) => (
                      <div key={assignment.assignment_id} className={combine("p-3 rounded-lg", get('bg', 'secondary'))}>
                        <div className="flex justify-between items-start mb-2">
                          <div>
                            <div className="font-medium text-sm">{assignment.staff_name}</div>
                            <div className={combine("text-xs", get('text', 'tertiary'))}>{assignment.staff_id}</div>
                          </div>
                          <span className={getStatusBadgeClass(assignment.status)}>
                            {assignment.status}
                          </span>
                        </div>
                        
                        {assignment.completion_note && (
                          <div className="mt-2">
                            <p className={combine("text-xs font-medium mb-1", get('text', 'tertiary'))}>Completion Note:</p>
                            <p className={combine("text-sm", get('text', 'primary'))}>{assignment.completion_note}</p>
                          </div>
                        )}
                        
                        {assignment.proof_url && (
                          <div className="mt-2">
                            <a
                              href={assignment.proof_url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className={combine(
                                "inline-flex items-center space-x-1 text-xs px-2 py-1 rounded",
                                theme === 'dark'
                                  ? 'bg-purple-900/30 text-purple-300 hover:bg-purple-800/30'
                                  : 'bg-purple-100 text-purple-700 hover:bg-purple-200'
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
      </div>
    </div>
  );
};