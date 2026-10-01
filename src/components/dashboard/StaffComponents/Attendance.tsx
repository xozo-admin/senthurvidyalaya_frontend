'use client';

import { useEffect, useState } from 'react';
import {
  FaCalendarAlt,
  FaCalendarCheck,
  FaCalendarTimes,
  FaClock,
  FaUserCheck,
  FaUserTimes,
  FaSearch,
  FaFilter,
  FaTimes,
  FaDownload,
  FaChartBar,
  FaCheck,
  FaTimesCircle,
  FaExclamationTriangle,
  FaEye,
  FaFileDownload,
  FaSort,
  FaSortUp,
  FaSortDown,
  FaUserTie,
  FaIdCard,
  FaPhone,
  FaEnvelope,
  FaBriefcase,
  FaChevronLeft,
  FaChevronRight,
  FaInfoCircle,
  FaPercentage,
  FaCalendarDay,
  FaCalendarWeek,
  FaUsers,
  FaCalendar,
  FaClipboardList,
  FaRegCalendarCheck,
  FaRegCalendarTimes
} from 'react-icons/fa';
import { useTheme } from '@/contexts/ThemeContext';
import { useThemeClasses } from '@/hooks/useThemeClasses';
import { toastSuccess, toastError, toastInfo, toastWarning } from '@/lib/toast';

interface AttendanceRecord {
  id: number;
  staff_id: string;
  staff_name: string;
  date: string;
  check_in_time: string | null;
  check_out_time: string | null;
  status: 'Present' | 'Late' | 'Absent' | 'Leave' | 'Half Day';
  total_hours: string | null;
}

interface AttendanceSummary {
  staff_id: string;
  staff_name: string;
  present: number;
  late: number;
  absent: number;
  leave: number;
  half_day: number;
  total_working_days: number;
  attendance_percentage: string;
}

interface LeaveRequest {
  id: number;
  staff_id: string;
  staff_name: string;
  start_date: string;
  end_date: string;
  reason: string;
  proof_file: string | null;
  status: 'Pending' | 'Approved' | 'Rejected';
  admin_comment: string | null;
  created_at: string;
  leave_type: string;
  total_days: number;
}

interface StaffMember {
  id: number;
  staff_id: string;
  name: string;
  phone: string;
  email: string;
  role: string;
  department: string;
}

type AttendanceView = 'summary' | 'detailed';
type LeaveStatus = 'Pending' | 'Approved' | 'Rejected' | 'all';
type SortField = 'staff_name' | 'date' | 'status' | 'created_at';

export const StaffAttendancePage = () => {
  const { theme } = useTheme();
  const { get, combine } = useThemeClasses();
  
  const [activeTab, setActiveTab] = useState<'attendance' | 'leaves'>('attendance');
  const [attendanceView, setAttendanceView] = useState<AttendanceView>('summary');
  const [leaveStatusFilter, setLeaveStatusFilter] = useState<LeaveStatus>('all');
  
  const [loading, setLoading] = useState(false);
  const [loadingLeaves, setLoadingLeaves] = useState(false);
  const [loadingAttendance, setLoadingAttendance] = useState(false);
  
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [selectedStaffId, setSelectedStaffId] = useState<string>('');
  
  const [attendanceSummary, setAttendanceSummary] = useState<AttendanceSummary[]>([]);
  const [attendanceRecords, setAttendanceRecords] = useState<AttendanceRecord[]>([]);
  const [leaveRequests, setLeaveRequests] = useState<LeaveRequest[]>([]);
  const [staffList, setStaffList] = useState<StaffMember[]>([]);
  
  const [currentPage, setCurrentPage] = useState(1);
  const [leaveCurrentPage, setLeaveCurrentPage] = useState(1);
  const [attendanceCurrentPage, setAttendanceCurrentPage] = useState(1);
  
  const [searchTerm, setSearchTerm] = useState('');
  const [searchLeaveTerm, setSearchLeaveTerm] = useState('');
  
  const [sortField, setSortField] = useState<SortField | any>('created_at');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');
  
  const [viewLeaveDetails, setViewLeaveDetails] = useState<LeaveRequest | null | any>(null);
  const [adminComment, setAdminComment] = useState('');
  
  const itemsPerPage = 10;

  // Get auth token from localStorage
  const getAuthToken = () => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('token') || '';
    }
    return '';
  };

  // Get auth headers
  const getAuthHeaders = () => {
    const token = getAuthToken();
    return {
      'Authorization': `Token ${token}`,
      'Content-Type': 'application/json',
    };
  };

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
      red: theme === 'dark' ? 'from-gray-800 to-red-900/10' : 'from-white to-red-50',
      indigo: theme === 'dark' ? 'from-gray-800 to-indigo-900/10' : 'from-white to-indigo-50',
      cyan: theme === 'dark' ? 'from-gray-800 to-cyan-900/10' : 'from-white to-cyan-50',
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

  // Fetch staff list
  const fetchStaffList = async () => {
    try {
      const res = await fetch('https://senthurvidyalaya-backend.onrender.com/api/schooladmin/staff/', {
        headers: getAuthHeaders(),
      });
      
      if (res.ok) {
        const data = await res.json();
        let staffData = [];
        
        if (Array.isArray(data)) {
          staffData = data;
        } else if (data.data && Array.isArray(data.data)) {
          staffData = data.data;
        } else if (data.teachers) {
          staffData = data.teachers;
        }
        
        setStaffList(staffData);
      }
    } catch (error) {
      console.error('Error:', error);
      toastError('Failed to fetch staff');
    }
  };

  // Fetch attendance summary
  const fetchAttendanceSummary = async () => {
    setLoadingAttendance(true);
    try {
      const url = `https://senthurvidyalaya-backend.onrender.com/api/attendance/admin/staff-summary/?month=${selectedMonth}&year=${selectedYear}`;
      const res = await fetch(url, {
        headers: getAuthHeaders(),
      });
      
      if (res.ok) {
        const data = await res.json();
        console.log('Attendance summary:', data);
        
        if (data.data && Array.isArray(data.data)) {
          setAttendanceSummary(data.data);
        } else if (Array.isArray(data)) {
          setAttendanceSummary(data);
        }
      }
    } catch (error) {
      console.error('Error:', error);
      toastError('Failed to fetch attendance summary');
    } finally {
      setLoadingAttendance(false);
    }
  };

  // Fetch detailed attendance records
  const fetchAttendanceRecords = async () => {
    setLoadingAttendance(true);
    try {
      let url = `https://senthurvidyalaya-backend.onrender.com/api/attendance/admin/staff/?date=${selectedDate}`;
      
      if (selectedStaffId) {
        url += `&staff_id=${selectedStaffId}`;
      }
      
      const res = await fetch(url, {
        headers: getAuthHeaders(),
      });
      
      if (res.ok) {
        const data = await res.json();
        console.log('Attendance records:', data);
        
        if (data.data && Array.isArray(data.data)) {
          setAttendanceRecords(data.data);
        } else if (Array.isArray(data)) {
          setAttendanceRecords(data);
        } else {
          setAttendanceRecords([]);
        }
      }
    } catch (error) {
      console.error('Error:', error);
      toastError('Failed to fetch attendance records');
    } finally {
      setLoadingAttendance(false);
    }
  };

  // Fetch leave requests
  const fetchLeaveRequests = async () => {
    setLoadingLeaves(true);
    try {
      const token = getAuthToken();
      if (!token) {
        toastError('Please login to access this page');
        setLoadingLeaves(false);
        return;
      }

      let url = 'https://senthurvidyalaya-backend.onrender.com/api/leaves/admin/action/';
      
      if (leaveStatusFilter !== 'all') {
        url += `?status=${leaveStatusFilter}`;
      }

      const res = await fetch(url, {
        headers: getAuthHeaders(),
      });
      
      if (res.status === 401) {
        toastError('Session expired. Please login again.');
        setLoadingLeaves(false);
        return;
      }
      
      if (res.ok) {
        const data = await res.json();
        console.log('Leave response:', data);
        
        let leavesData = [];
        if (Array.isArray(data)) {
          leavesData = data;
        } else if (data.data && Array.isArray(data.data)) {
          leavesData = data.data;
        }
        
        setLeaveRequests(leavesData);
      } else {
        const errorData = await res.json().catch(() => ({}));
        toastError(errorData.error || 'Failed to fetch leave requests');
      }
    } catch (error) {
      console.error('Error fetching leave requests:', error);
      toastError('Network error. Please check your connection.');
    } finally {
      setLoadingLeaves(false);
    }
  };

  // Update leave status
  const updateLeaveStatus = async (leaveId: number, status: 'Approved' | 'Rejected') => {
    if (!adminComment.trim() && status === 'Rejected') {
      toastError('Please provide a comment when rejecting a leave request');
      return;
    }

    try {
      const token = getAuthToken();
      if (!token) {
        toastError('Please login to perform this action');
        return;
      }

      const res = await fetch('https://senthurvidyalaya-backend.onrender.com/api/leaves/admin/action/', {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({
          leave_id: leaveId,
          action: status,
          comment: adminComment || (status === 'Approved' ? 'Leave approved' : 'Leave rejected')
        }),
      });

      if (res.status === 401) {
        toastError('Session expired. Please login again.');
        return;
      }

      if (res.ok) {
        toastSuccess(`Leave request ${status.toLowerCase()} successfully`);
        fetchLeaveRequests();
        setViewLeaveDetails(null);
        setAdminComment('');
      } else {
        const errorData = await res.json().catch(() => ({}));
        toastError(errorData.error || 'Failed to update leave status');
      }
    } catch (error) {
      console.error('Error updating leave status:', error);
      toastError('Network error. Please check your connection.');
    }
  };

  // Load data on component mount and when filters change
  useEffect(() => {
    fetchStaffList();
    fetchLeaveRequests();
  }, [leaveStatusFilter]);

  useEffect(() => {
    if (activeTab === 'attendance') {
      if (attendanceView === 'summary') {
        fetchAttendanceSummary();
      } else {
        fetchAttendanceRecords();
      }
    }
  }, [activeTab, attendanceView, selectedMonth, selectedYear, selectedDate, selectedStaffId]);

  // Generate months and years
  const months = Array.from({ length: 12 }, (_, i) => ({
    value: i + 1,
    label: new Date(2000, i).toLocaleString('default', { month: 'long' })
  }));

  const years = Array.from({ length: 10 }, (_, i) => new Date().getFullYear() - 5 + i);

  // Filter and sort leave requests
  const filteredLeaves = leaveRequests.filter((leave:any) => {
    const matchesSearch = 
      leave.staff_name.toLowerCase().includes(searchLeaveTerm.toLowerCase()) ||
      leave.staff_id.toLowerCase().includes(searchLeaveTerm.toLowerCase()) ||
      leave.reason.toLowerCase().includes(searchLeaveTerm.toLowerCase());
    
    return matchesSearch;
  });

  const sortedLeaves:any = [...filteredLeaves].sort((a:any, b:any) => {
    let aValue: any = a[sortField];
    let bValue: any = b[sortField];

    if (typeof aValue === 'string' && typeof bValue === 'string') {
      aValue = aValue.toLowerCase();
      bValue = bValue.toLowerCase();
    }

    if (aValue < bValue) return sortDirection === 'asc' ? -1 : 1;
    if (aValue > bValue) return sortDirection === 'asc' ? 1 : -1;
    return 0;
  });

  // Pagination
  const totalLeavePages = Math.ceil(sortedLeaves.length / itemsPerPage);
  const indexOfLastLeave = leaveCurrentPage * itemsPerPage;
  const indexOfFirstLeave = indexOfLastLeave - itemsPerPage;
  const currentLeaves = sortedLeaves.slice(indexOfFirstLeave, indexOfLastLeave);

  // Filter attendance records
  const filteredAttendance = attendanceRecords.filter(record =>
    record.staff_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    record.staff_id.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Calculate statistics
  const totalStaff = staffList.length;
  const todayPresent = attendanceRecords.filter(r => r.status === 'Present' || r.status === 'Late').length;
  const todayAbsent = attendanceRecords.filter(r => r.status === 'Absent').length;
  const todayLeave = attendanceRecords.filter(r => r.status === 'Leave').length;
  
  const leaveStats = {
    pending: leaveRequests.filter(l => l.status === 'Pending').length,
    approved: leaveRequests.filter(l => l.status === 'Approved').length,
    rejected: leaveRequests.filter(l => l.status === 'Rejected').length,
    total: leaveRequests.length
  };

  // Get status badge classes
  const getStatusBadgeClass = (status: string) => {
    const classes = {
      Pending: theme === 'dark' 
        ? 'bg-amber-900/30 text-amber-300 border-amber-800' 
        : 'bg-amber-100 text-amber-700 border-amber-200',
      Approved: theme === 'dark' 
        ? 'bg-emerald-900/30 text-emerald-300 border-emerald-800' 
        : 'bg-emerald-100 text-emerald-700 border-emerald-200',
      Rejected: theme === 'dark' 
        ? 'bg-red-900/30 text-red-300 border-red-800' 
        : 'bg-red-100 text-red-700 border-red-200',
      Present: theme === 'dark' 
        ? 'bg-emerald-900/30 text-emerald-300 border-emerald-800' 
        : 'bg-emerald-100 text-emerald-700 border-emerald-200',
      Late: theme === 'dark' 
        ? 'bg-amber-900/30 text-amber-300 border-amber-800' 
        : 'bg-amber-100 text-amber-700 border-amber-200',
      Absent: theme === 'dark' 
        ? 'bg-red-900/30 text-red-300 border-red-800' 
        : 'bg-red-100 text-red-700 border-red-200',
      Leave: theme === 'dark' 
        ? 'bg-blue-900/30 text-blue-300 border-blue-800' 
        : 'bg-blue-100 text-blue-700 border-blue-200',
      'Half Day': theme === 'dark' 
        ? 'bg-cyan-900/30 text-cyan-300 border-cyan-800' 
        : 'bg-cyan-100 text-cyan-700 border-cyan-200',
    };

    return combine(
      'px-3 py-1.5 text-xs font-medium rounded-full border',
      classes[status as keyof typeof classes] || 'bg-gray-100 text-gray-700'
    );
  };

  // Export reports
  const exportLeaveReport = () => {
    const headers = ['Staff ID', 'Name', 'Start Date', 'End Date', 'Reason', 'Leave Type', 'Status', 'Applied On'];
    const csvData = leaveRequests.map(leave => [
      leave.staff_id,
      leave.staff_name,
      leave.start_date,
      leave.end_date,
      leave.reason,
      leave.leave_type,
      leave.status,
      new Date(leave.created_at).toLocaleDateString()
    ]);
    
    const csvContent = [
      headers.join(','),
      ...csvData.map(row => row.map(field => `"${field}"`).join(','))
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
    toastSuccess('Leave report exported successfully!');
  };

  const exportAttendanceReport = () => {
    const headers = ['Staff ID', 'Name', 'Date', 'Check-in Time', 'Check-out Time', 'Status', 'Total Hours'];
    const csvData = attendanceRecords.map(record => [
      record.staff_id,
      record.staff_name,
      record.date,
      record.check_in_time || 'N/A',
      record.check_out_time || 'N/A',
      record.status,
      record.total_hours || 'N/A'
    ]);
    
    const csvContent = [
      headers.join(','),
      ...csvData.map(row => row.map(field => `"${field}"`).join(','))
    ].join('\n');
    
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `attendance_${selectedDate}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
    toastSuccess('Attendance report exported successfully!');
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
                <FaCalendarAlt className="text-2xl text-white" />
              </div>
              <div>
                <h1 className={combine("text-3xl font-bold", get('text', 'primary'))}>
                  Staff Management Portal
                </h1>
                <p className={combine("text-sm mt-1", get('text', 'secondary'))}>
                  Track staff attendance and manage leave requests efficiently
                </p>
              </div>
            </div>
            
            <div className="flex items-center space-x-3">
              <button
                onClick={() => {
                  if (activeTab === 'leaves') {
                    exportLeaveReport();
                  } else {
                    exportAttendanceReport();
                  }
                }}
                className={combine(getSecondaryButtonClass(), "flex items-center space-x-2")}
                disabled={(activeTab === 'leaves' ? leaveRequests : attendanceRecords).length === 0}
              >
                <FaFileDownload className="text-sm" />
                <span className="text-sm">Export</span>
              </button>
            </div>
          </div>

          {/* Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            <div className={getCardGradientClass('purple')}>
              <div className="flex items-center justify-between">
                <div>
                  <p className={combine("text-xs font-medium", get('text', 'secondary'))}>Total Staff</p>
                  <p className={combine("text-2xl font-bold mt-2", get('text', 'primary'))}>{totalStaff}</p>
                </div>
                <div className={combine(
                  "p-2 rounded-xl",
                  theme === 'dark' ? 'bg-purple-900/30' : 'bg-purple-100'
                )}>
                  <FaUsers className={combine(
                    "text-lg",
                    theme === 'dark' ? 'text-purple-400' : 'text-purple-600'
                  )} />
                </div>
              </div>
              <div className={combine("mt-3 text-xs", get('text', 'tertiary'))}>
                Registered staff members
              </div>
            </div>
            
            <div className={getCardGradientClass('emerald')}>
              <div className="flex items-center justify-between">
                <div>
                  <p className={combine("text-xs font-medium", get('text', 'secondary'))}>Today's Present</p>
                  <p className={combine("text-2xl font-bold mt-2", get('text', 'primary'))}>{todayPresent}</p>
                </div>
                <div className={combine(
                  "p-2 rounded-xl",
                  theme === 'dark' ? 'bg-emerald-900/30' : 'bg-emerald-100'
                )}>
                  <FaUserCheck className={combine(
                    "text-lg",
                    theme === 'dark' ? 'text-emerald-400' : 'text-emerald-600'
                  )} />
                </div>
              </div>
              <div className={combine("mt-3 text-xs", get('text', 'tertiary'))}>
                {new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' })}
              </div>
            </div>
            
            <div className={getCardGradientClass('amber')}>
              <div className="flex items-center justify-between">
                <div>
                  <p className={combine("text-xs font-medium", get('text', 'secondary'))}>Pending Leaves</p>
                  <p className={combine("text-2xl font-bold mt-2", get('text', 'primary'))}>{leaveStats.pending}</p>
                </div>
                <div className={combine(
                  "p-2 rounded-xl",
                  theme === 'dark' ? 'bg-amber-900/30' : 'bg-amber-100'
                )}>
                  <FaExclamationTriangle className={combine(
                    "text-lg",
                    theme === 'dark' ? 'text-amber-400' : 'text-amber-600'
                  )} />
                </div>
              </div>
              <div className={combine("mt-3 text-xs", get('accent', 'warning'))}>
                Awaiting approval
              </div>
            </div>
            
            <div className={getCardGradientClass('blue')}>
              <div className="flex items-center justify-between">
                <div>
                  <p className={combine("text-xs font-medium", get('text', 'secondary'))}>Today's Attendance Rate</p>
                  <p className={combine("text-2xl font-bold mt-2", get('text', 'primary'))}>
                    {totalStaff > 0 ? `${Math.round((todayPresent / totalStaff) * 100)}%` : '0%'}
                  </p>
                </div>
                <div className={combine(
                  "p-2 rounded-xl",
                  theme === 'dark' ? 'bg-blue-900/30' : 'bg-blue-100'
                )}>
                  <FaPercentage className={combine(
                    "text-lg",
                    theme === 'dark' ? 'text-blue-400' : 'text-blue-600'
                  )} />
                </div>
              </div>
              <div className={combine("mt-3 text-xs", get('accent', 'primary'))}>
                Daily attendance
              </div>
            </div>
          </div>
        </div>

        {/* Main Tabs */}
        <div className="mb-8">
          <div className="flex space-x-1 p-1 rounded-2xl max-w-md">
            <button
              onClick={() => setActiveTab('attendance')}
              className={`flex-1 py-3 px-4 rounded-xl text-sm font-medium transition-all duration-200 flex items-center justify-center space-x-2 ${
                activeTab === 'attendance'
                  ? combine('bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300', get('border', 'primary'), 'border')
                      : combine(get('text', 'secondary'), 'hover:text-[var(--color-text-primary)]')
              }`}
            >
              <FaCalendarCheck className="text-sm" />
              <span>Attendance</span>
            </button>
            <button
              onClick={() => setActiveTab('leaves')}
              className={`flex-1 py-3 px-4 rounded-xl text-sm font-medium transition-all duration-200 flex items-center justify-center space-x-2 ${
                activeTab === 'leaves'
                  ? combine('bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300', get('border', 'primary'), 'border')
                      : combine(get('text', 'secondary'), 'hover:text-[var(--color-text-primary)]')
              }`}
            >
              <FaClipboardList className="text-sm" />
              <span>Leave Requests</span>
            </button>
          </div>
        </div>

        {/* Attendance Tab Content */}
        {activeTab === 'attendance' && (
          <div className="space-y-6">
            {/* Attendance View Toggle */}
            <div className="flex justify-between items-center mb-4">
              <div className="flex space-x-2">
                <button
                  onClick={() => setAttendanceView('summary')}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                    attendanceView === 'summary'
                      ? combine('bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300', get('border', 'primary'), 'border')
                      : combine(get('text', 'secondary'), 'hover:text-[var(--color-text-primary)]')
                  }`}
                >
                  <FaChartBar className="inline mr-2 text-sm" />
                  Monthly Summary
                </button>
                <button
                  onClick={() => setAttendanceView('detailed')}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                    attendanceView === 'detailed'
                      ? combine('bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300', get('border', 'primary'), 'border')
                      : combine(get('text', 'secondary'), 'hover:text-[var(--color-text-primary)]')
                  }`}
                >
                  <FaCalendarDay className="inline mr-2 text-sm" />
                  Daily View
                </button>
              </div>
            </div>

            {/* Filters */}
            <div className={getCardGradientClass('purple')}>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                {attendanceView === 'summary' ? (
                  <>
                    <div>
                      <label className={combine("block text-sm font-medium mb-2", get('text', 'primary'))}>Month</label>
                      <select
                        value={selectedMonth}
                        onChange={(e) => setSelectedMonth(parseInt(e.target.value))}
                        className={getInputClass()}
                      >
                        {months.map(month => (
                          <option key={month.value} value={month.value}>
                            {month.label}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className={combine("block text-sm font-medium mb-2", get('text', 'primary'))}>Year</label>
                      <select
                        value={selectedYear}
                        onChange={(e) => setSelectedYear(parseInt(e.target.value))}
                        className={getInputClass()}
                      >
                        {years.map(year => (
                          <option key={year} value={year}>
                            {year}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className={combine("block text-sm font-medium mb-2", get('text', 'primary'))}>Staff Member</label>
                      <select
                        value={selectedStaffId}
                        onChange={(e) => setSelectedStaffId(e.target.value)}
                        className={getInputClass()}
                      >
                        <option value="">All Staff</option>
                        {staffList.map(staff => (
                          <option key={staff.id} value={staff.staff_id}>
                            {staff.name} ({staff.staff_id})
                          </option>
                        ))}
                      </select>
                    </div>
                  </>
                ) : (
                  <>
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
                      <label className={combine("block text-sm font-medium mb-2", get('text', 'primary'))}>Staff Member</label>
                      <select
                        value={selectedStaffId}
                        onChange={(e) => setSelectedStaffId(e.target.value)}
                        className={getInputClass()}
                      >
                        <option value="">All Staff</option>
                        {staffList.map(staff => (
                          <option key={staff.id} value={staff.staff_id}>
                            {staff.name} ({staff.staff_id})
                          </option>
                        ))}
                      </select>
                    </div>
                    <div className="relative">
                      <label className={combine("block text-sm font-medium mb-2", get('text', 'primary'))}>Search</label>
                      <div className="relative">
                        <FaSearch className={combine(
                          "absolute left-3 top-1/2 transform -translate-y-1/2 text-sm",
                          get('icon', 'secondary')
                        )} />
                        <input
                          type="text"
                          placeholder="Search staff..."
                          value={searchTerm}
                          onChange={(e) => setSearchTerm(e.target.value)}
                          className={combine(getInputClass(), "pl-9")}
                        />
                      </div>
                    </div>
                  </>
                )}
                <div className="flex items-end">
                  <button
                    onClick={() => {
                      if (attendanceView === 'summary') {
                        fetchAttendanceSummary();
                      } else {
                        fetchAttendanceRecords();
                      }
                    }}
                    disabled={loadingAttendance}
                    className={combine(getPrimaryButtonClass(), "w-full flex items-center justify-center space-x-2")}
                  >
                    {loadingAttendance ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div>
                        <span className="text-sm">Loading...</span>
                      </>
                    ) : (
                      <>
                        <FaSearch className="text-sm" />
                        <span className="text-sm">Search</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>

            {/* Attendance Summary View */}
            {attendanceView === 'summary' && (
              <div className={getCardGradientClass('blue')}>
                <h3 className={combine("text-lg font-bold mb-4", get('text', 'primary'))}>
                  Monthly Attendance Summary - {months[selectedMonth - 1]?.label} {selectedYear}
                </h3>
                
                {loadingAttendance ? (
                  <div className="p-8 text-center">
                    <div className="inline-flex flex-col items-center">
                      <div className={combine(
                        "animate-spin rounded-full h-8 w-8 border-4",
                        theme === 'dark' ? 'border-purple-500 border-t-transparent' : 'border-purple-600 border-t-transparent'
                      )}></div>
                      <p className={combine("mt-3 text-sm font-medium", get('text', 'secondary'))}>Loading attendance summary...</p>
                    </div>
                  </div>
                ) : attendanceSummary.length === 0 ? (
                  <div className="p-8 text-center">
                    <div className={combine(
                      "inline-block p-3 rounded-full mb-3",
                      theme === 'dark' ? 'bg-blue-900/30' : 'bg-blue-100'
                    )}>
                      <FaChartBar className={combine(
                        "text-xl",
                        theme === 'dark' ? 'text-blue-400' : 'text-blue-500'
                      )} />
                    </div>
                    <h3 className={combine("text-base font-medium mb-1", get('text', 'primary'))}>No attendance data found</h3>
                    <p className={combine("text-sm", get('text', 'secondary'))}>
                      Select a different month or staff member
                    </p>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                      <thead className={combine("bg-[var(--color-bg-secondary)]", get('border', 'primary'))}>
                        <tr>
                          <th className={combine(
                            "px-4 py-3 text-left text-xs font-medium uppercase tracking-wider",
                            get('text', 'tertiary')
                          )}>
                            Staff Details
                          </th>
                          <th className={combine(
                            "px-4 py-3 text-left text-xs font-medium uppercase tracking-wider",
                            get('text', 'tertiary')
                          )}>
                            Present
                          </th>
                          <th className={combine(
                            "px-4 py-3 text-left text-xs font-medium uppercase tracking-wider",
                            get('text', 'tertiary')
                          )}>
                            Late
                          </th>
                          <th className={combine(
                            "px-4 py-3 text-left text-xs font-medium uppercase tracking-wider",
                            get('text', 'tertiary')
                          )}>
                            Absent
                          </th>
                          <th className={combine(
                            "px-4 py-3 text-left text-xs font-medium uppercase tracking-wider",
                            get('text', 'tertiary')
                          )}>
                            Leave
                          </th>
                          <th className={combine(
                            "px-4 py-3 text-left text-xs font-medium uppercase tracking-wider",
                            get('text', 'tertiary')
                          )}>
                            Working Days
                          </th>
                          <th className={combine(
                            "px-4 py-3 text-left text-xs font-medium uppercase tracking-wider",
                            get('text', 'tertiary')
                          )}>
                            Attendance %
                          </th>
                        </tr>
                      </thead>
                      <tbody className={combine("divide-y", get('border', 'primary'))}>
                        {attendanceSummary.map((summary, index) => (
                          <tr key={index} className="hover:bg-[var(--color-bg-hover)]">
                            <td className="px-4 py-3">
                              <div>
                                <div className="font-medium text-sm">{summary.staff_name}</div>
                                <div className={combine("text-xs", get('text', 'tertiary'))}>{summary.staff_id}</div>
                              </div>
                            </td>
                            <td className="px-4 py-3">
                              <div className={combine("text-sm font-medium", get('accent', 'success'))}>
                                {summary.present}
                              </div>
                            </td>
                            <td className="px-4 py-3">
                              <div className={combine("text-sm font-medium", get('accent', 'warning'))}>
                                {summary.late}
                              </div>
                            </td>
                            <td className="px-4 py-3">
                              <div className={combine("text-sm font-medium", get('accent', 'error'))}>
                                {summary.absent}
                              </div>
                            </td>
                            <td className="px-4 py-3">
                              <div className={combine("text-sm font-medium", get('accent', 'primary'))}>
                                {summary.leave}
                              </div>
                            </td>
                            <td className="px-4 py-3">
                              <div className={combine("text-sm font-medium", get('text', 'primary'))}>
                                {summary.total_working_days}
                              </div>
                            </td>
                            <td className="px-4 py-3">
                              <div className={combine("text-sm font-medium", get('accent', 'primary'))}>
                                {summary.attendance_percentage}%
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}

            {/* Daily Attendance View */}
            {attendanceView === 'detailed' && (
              <div className={getCardGradientClass('emerald')}>
                <h3 className={combine("text-lg font-bold mb-4", get('text', 'primary'))}>
                  Daily Attendance - {new Date(selectedDate).toLocaleDateString('en-US', { 
                    weekday: 'long', 
                    year: 'numeric', 
                    month: 'long', 
                    day: 'numeric' 
                  })}
                </h3>
                
                {loadingAttendance ? (
                  <div className="p-8 text-center">
                    <div className="inline-flex flex-col items-center">
                      <div className={combine(
                        "animate-spin rounded-full h-8 w-8 border-4",
                        theme === 'dark' ? 'border-emerald-500 border-t-transparent' : 'border-emerald-600 border-t-transparent'
                      )}></div>
                      <p className={combine("mt-3 text-sm font-medium", get('text', 'secondary'))}>Loading attendance records...</p>
                    </div>
                  </div>
                ) : filteredAttendance.length === 0 ? (
                  <div className="p-8 text-center">
                    <div className={combine(
                      "inline-block p-3 rounded-full mb-3",
                      theme === 'dark' ? 'bg-emerald-900/30' : 'bg-emerald-100'
                    )}>
                      <FaCalendarDay className={combine(
                        "text-xl",
                        theme === 'dark' ? 'text-emerald-400' : 'text-emerald-500'
                      )} />
                    </div>
                    <h3 className={combine("text-base font-medium mb-1", get('text', 'primary'))}>No attendance records found</h3>
                    <p className={combine("text-sm", get('text', 'secondary'))}>
                      Select a different date or staff member
                    </p>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                      <thead className={combine("bg-[var(--color-bg-secondary)]", get('border', 'primary'))}>
                        <tr>
                          <th className={combine(
                            "px-4 py-3 text-left text-xs font-medium uppercase tracking-wider",
                            get('text', 'tertiary')
                          )}>
                            Staff Details
                          </th>
                          <th className={combine(
                            "px-4 py-3 text-left text-xs font-medium uppercase tracking-wider",
                            get('text', 'tertiary')
                          )}>
                            Check-in Time
                          </th>
                          <th className={combine(
                            "px-4 py-3 text-left text-xs font-medium uppercase tracking-wider",
                            get('text', 'tertiary')
                          )}>
                            Check-out Time
                          </th>
                          <th className={combine(
                            "px-4 py-3 text-left text-xs font-medium uppercase tracking-wider",
                            get('text', 'tertiary')
                          )}>
                            Total Hours
                          </th>
                          <th className={combine(
                            "px-4 py-3 text-left text-xs font-medium uppercase tracking-wider",
                            get('text', 'tertiary')
                          )}>
                            Status
                          </th>
                        </tr>
                      </thead>
                      <tbody className={combine("divide-y", get('border', 'primary'))}>
                        {filteredAttendance.map((record) => (
                          <tr key={record.id} className="hover:bg-[var(--color-bg-hover)]">
                            <td className="px-4 py-3">
                              <div>
                                <div className="font-medium text-sm">{record.staff_name}</div>
                                <div className={combine("text-xs", get('text', 'tertiary'))}>{record.staff_id}</div>
                              </div>
                            </td>
                            <td className="px-4 py-3">
                              <div className={combine("text-sm flex items-center space-x-2", get('text', 'primary'))}>
                                <FaClock className="text-xs" />
                                <span>{record.check_in_time || 'Not Recorded'}</span>
                              </div>
                            </td>
                            <td className="px-4 py-3">
                              <div className={combine("text-sm flex items-center space-x-2", get('text', 'primary'))}>
                                <FaClock className="text-xs" />
                                <span>{record.check_out_time || 'Not Recorded'}</span>
                              </div>
                            </td>
                            <td className="px-4 py-3">
                              <div className={combine("text-sm font-medium", get('text', 'primary'))}>
                                {record.total_hours || 'N/A'}
                              </div>
                            </td>
                            <td className="px-4 py-3">
                              <span className={getStatusBadgeClass(record.status)}>
                                {record.status}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* Leaves Tab Content */}
        {activeTab === 'leaves' && (
          <div className="space-y-6">
            {/* Leave Stats */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className={getCardGradientClass('amber')}>
                <div className="flex items-center justify-between">
                  <div>
                    <p className={combine("text-xs font-medium", get('text', 'secondary'))}>Pending Requests</p>
                    <p className={combine("text-2xl font-bold mt-2", get('text', 'primary'))}>{leaveStats.pending}</p>
                  </div>
                  <div className={combine(
                    "p-2 rounded-xl",
                    theme === 'dark' ? 'bg-amber-900/30' : 'bg-amber-100'
                  )}>
                    <FaExclamationTriangle className={combine(
                      "text-lg",
                      theme === 'dark' ? 'text-amber-400' : 'text-amber-600'
                    )} />
                  </div>
                </div>
                <div className={combine("mt-3 text-xs", get('accent', 'warning'))}>
                  Requires your attention
                </div>
              </div>
              
              <div className={getCardGradientClass('emerald')}>
                <div className="flex items-center justify-between">
                  <div>
                    <p className={combine("text-xs font-medium", get('text', 'secondary'))}>Approved Leaves</p>
                    <p className={combine("text-2xl font-bold mt-2", get('text', 'primary'))}>{leaveStats.approved}</p>
                  </div>
                  <div className={combine(
                    "p-2 rounded-xl",
                    theme === 'dark' ? 'bg-emerald-900/30' : 'bg-emerald-100'
                  )}>
                    <FaCheck className={combine(
                      "text-lg",
                      theme === 'dark' ? 'text-emerald-400' : 'text-emerald-600'
                    )} />
                  </div>
                </div>
                <div className={combine("mt-3 text-xs", get('accent', 'success'))}>
                  Approved this month
                </div>
              </div>
              
              <div className={getCardGradientClass('red')}>
                <div className="flex items-center justify-between">
                  <div>
                    <p className={combine("text-xs font-medium", get('text', 'secondary'))}>Rejected Requests</p>
                    <p className={combine("text-2xl font-bold mt-2", get('text', 'primary'))}>{leaveStats.rejected}</p>
                  </div>
                  <div className={combine(
                    "p-2 rounded-xl",
                    theme === 'dark' ? 'bg-red-900/30' : 'bg-red-100'
                  )}>
                    <FaTimesCircle className={combine(
                      "text-lg",
                      theme === 'dark' ? 'text-red-400' : 'text-red-600'
                    )} />
                  </div>
                </div>
                <div className={combine("mt-3 text-xs", get('accent', 'error'))}>
                  Rejected this month
                </div>
              </div>
            </div>

            {/* Leave Filters */}
            <div className={getCardGradientClass('purple')}>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="relative">
                  <label className={combine("block text-sm font-medium mb-2", get('text', 'primary'))}>Search</label>
                  <div className="relative">
                    <FaSearch className={combine(
                      "absolute left-3 top-1/2 transform -translate-y-1/2 text-sm",
                      get('icon', 'secondary')
                    )} />
                    <input
                      type="text"
                      placeholder="Search by staff name, ID or reason..."
                      value={searchLeaveTerm}
                      onChange={(e) => setSearchLeaveTerm(e.target.value)}
                      className={combine(getInputClass(), "pl-9")}
                    />
                  </div>
                </div>
                <div>
                  <label className={combine("block text-sm font-medium mb-2", get('text', 'primary'))}>Status</label>
                  <select
                    value={leaveStatusFilter}
                    onChange={(e) => setLeaveStatusFilter(e.target.value as LeaveStatus)}
                    className={getInputClass()}
                  >
                    <option value="all">All Status</option>
                    <option value="Pending">Pending</option>
                    <option value="Approved">Approved</option>
                    <option value="Rejected">Rejected</option>
                  </select>
                </div>
                <div>
                  <label className={combine("block text-sm font-medium mb-2", get('text', 'primary'))}>Sort By</label>
                  <select
                    value={sortField}
                    onChange={(e) => setSortField(e.target.value as SortField)}
                    className={getInputClass()}
                  >
                    <option value="created_at">Applied Date</option>
                    <option value="staff_name">Staff Name</option>
                    <option value="start_date">Start Date</option>
                    <option value="status">Status</option>
                  </select>
                </div>
                <div className="flex items-end">
                  <button
                    onClick={() => setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc')}
                    className={combine(getSecondaryButtonClass(), "w-full flex items-center justify-center space-x-2")}
                  >
                    {sortDirection === 'asc' ? <FaSortUp className="text-sm" /> : <FaSortDown className="text-sm" />}
                    <span className="text-sm">{sortDirection === 'asc' ? 'Ascending' : 'Descending'}</span>
                  </button>
                </div>
              </div>
            </div>

            {/* Leave Requests Table */}
            <div className={getCardGradientClass()}>
              <div className={combine("p-4 border-b", get('border', 'primary'))}>
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center space-y-3 md:space-y-0">
                  <div>
                    <h3 className={combine("text-lg font-bold", get('text', 'primary'))}>Leave Requests</h3>
                    <p className={combine("text-sm mt-1", get('text', 'secondary'))}>
                      Review and manage staff leave applications
                    </p>
                  </div>
                  
                  {loadingLeaves && (
                    <div className={combine("text-xs flex items-center", get('accent', 'primary'))}>
                      <div className={combine(
                        "animate-spin rounded-full h-4 w-4 border-2 mr-2",
                        theme === 'dark' ? 'border-purple-500 border-t-transparent' : 'border-purple-600 border-t-transparent'
                      )}></div>
                      Loading...
                    </div>
                  )}
                </div>
              </div>

              <div className="overflow-x-auto">
                {loadingLeaves ? (
                  <div className="p-8 text-center">
                    <div className="inline-flex flex-col items-center">
                      <div className={combine(
                        "animate-spin rounded-full h-8 w-8 border-4",
                        theme === 'dark' ? 'border-purple-500 border-t-transparent' : 'border-purple-600 border-t-transparent'
                      )}></div>
                      <p className={combine("mt-3 text-sm font-medium", get('text', 'secondary'))}>Loading leave requests...</p>
                    </div>
                  </div>
                ) : currentLeaves.length === 0 ? (
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
                    <h3 className={combine("text-base font-medium mb-1", get('text', 'primary'))}>No leave requests found</h3>
                    <p className={combine("text-sm", get('text', 'secondary'))}>
                      {searchLeaveTerm || leaveStatusFilter !== 'all' 
                        ? 'Try adjusting your search or filters'
                        : 'No leave requests available'}
                    </p>
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
                            Staff Member
                          </th>
                          <th className={combine(
                            "px-4 py-3 text-left text-xs font-medium uppercase tracking-wider",
                            get('text', 'tertiary')
                          )}>
                            Leave Period
                          </th>
                          <th className={combine(
                            "px-4 py-3 text-left text-xs font-medium uppercase tracking-wider",
                            get('text', 'tertiary')
                          )}>
                            Reason
                          </th>
                          <th className={combine(
                            "px-4 py-3 text-left text-xs font-medium uppercase tracking-wider",
                            get('text', 'tertiary')
                          )}>
                            Type
                          </th>
                          <th className={combine(
                            "px-4 py-3 text-left text-xs font-medium uppercase tracking-wider",
                            get('text', 'tertiary')
                          )}>
                            Applied On
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
                        {currentLeaves.map((leave:any) => (
                          <tr key={leave.id} className="hover:bg-[var(--color-bg-hover)]">
                            <td className="px-4 py-3">
                              <div>
                                <div className="font-medium text-sm">{leave.staff_name}</div>
                                <div className={combine("text-xs", get('text', 'tertiary'))}>{leave.staff_id}</div>
                              </div>
                            </td>
                            <td className="px-4 py-3">
                              <div className="text-sm">
                                {new Date(leave.start_date).toLocaleDateString()}
                              </div>
                              <div className={combine("text-xs", get('text', 'tertiary'))}>
                                {leave.total_days} day(s)
                              </div>
                            </td>
                            <td className="px-4 py-3">
                              <div className={combine("text-sm max-w-xs truncate", get('text', 'primary'))}>
                                {leave.reason}
                              </div>
                            </td>
                            <td className="px-4 py-3">
                              <div className={combine("text-sm", get('text', 'primary'))}>
                                {leave.leave_type || 'Regular'}
                              </div>
                            </td>
                            <td className="px-4 py-3">
                              <div className={combine("text-sm", get('text', 'primary'))}>
                                {new Date(leave.created_at).toLocaleDateString()}
                              </div>
                            </td>
                            <td className="px-4 py-3">
                              <span className={getStatusBadgeClass(leave.status)}>
                                {leave.status}
                              </span>
                            </td>
                            <td className="px-4 py-3">
                              <div className="flex space-x-2">
                                <button
                                  onClick={() => setViewLeaveDetails(leave)}
                                  className={combine(
                                    "p-1.5 rounded-xl transition-all duration-200 hover:text-[var(--color-accent-primary)]",
                                    get('icon', 'primary') + " text-sm"
                                  )}
                                  title="View Details"
                                >
                                  <FaEye className="text-sm" />
                                </button>
                                {leave.status === 'Pending' && (
                                  <>
                                    <button
                                      onClick={() => {
                                        setViewLeaveDetails(leave);
                                        setAdminComment('');
                                      }}
                                      className={combine(
                                        "p-1.5 rounded-xl transition-all duration-200 hover:text-[var(--color-accent-success)]",
                                        get('icon', 'primary') + " text-sm"
                                      )}
                                      title="Approve"
                                    >
                                      <FaCheck className="text-sm" />
                                    </button>
                                    <button
                                      onClick={() => {
                                        setViewLeaveDetails(leave);
                                        setAdminComment('');
                                      }}
                                      className={combine(
                                        "p-1.5 rounded-xl transition-all duration-200 hover:text-[var(--color-accent-error)]",
                                        get('icon', 'primary') + " text-sm"
                                      )}
                                      title="Reject"
                                    >
                                      <FaTimes className="text-sm" />
                                    </button>
                                  </>
                                )}
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>

                    {/* Pagination */}
                    {totalLeavePages > 1 && (
                      <div className={combine("px-4 py-3 border-t", get('border', 'primary'))}>
                        <div className="flex flex-col sm:flex-row justify-between items-center gap-3">
                          <p className={combine("text-xs", get('text', 'tertiary'))}>
                            Showing {indexOfFirstLeave + 1} to {Math.min(indexOfLastLeave, filteredLeaves.length)} of {filteredLeaves.length} leaves
                          </p>
                          <div className="flex items-center space-x-1.5">
                            <button
                              onClick={() => setLeaveCurrentPage(prev => Math.max(prev - 1, 1))}
                              disabled={leaveCurrentPage === 1}
                              className={combine(
                                "p-1.5 rounded-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed hover:scale-[1.02] active:scale-[0.98] text-sm",
                                getSecondaryButtonClass()
                              )}
                            >
                              <FaChevronLeft className="text-xs" />
                            </button>
                            
                            <div className="flex space-x-1">
                              {Array.from({ length: Math.min(5, totalLeavePages) }, (_, i) => {
                                let pageNum: number;
                                if (totalLeavePages <= 5) {
                                  pageNum = i + 1;
                                } else if (leaveCurrentPage <= 3) {
                                  pageNum = i + 1;
                                } else if (leaveCurrentPage >= totalLeavePages - 2) {
                                  pageNum = totalLeavePages - 4 + i;
                                } else {
                                  pageNum = leaveCurrentPage - 2 + i;
                                }
                                
                                return (
                                  <button
                                    key={pageNum}
                                    onClick={() => setLeaveCurrentPage(pageNum)}
                                    className={combine(
                                      "px-3 py-1.5 rounded-xl transition-all font-medium hover:scale-[1.02] active:scale-[0.98] text-xs",
                                      leaveCurrentPage === pageNum
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
                              onClick={() => setLeaveCurrentPage(prev => Math.min(prev + 1, totalLeavePages))}
                              disabled={leaveCurrentPage === totalLeavePages}
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
        )}

        {/* Leave Details Modal */}
        {viewLeaveDetails && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50 animate-fade-in backdrop-blur-sm">
            <div className={combine(
              getCardGradientClass(),
              "max-w-2xl w-full shadow-2xl max-h-[90vh] overflow-y-auto"
            )}>
              <div className="flex justify-between items-center mb-6">
                <div>
                  <h2 className={combine("text-xl font-bold", get('text', 'primary'))}>Leave Request Details</h2>
                  <p className={combine("text-sm", get('text', 'secondary'))}>
                    {viewLeaveDetails.staff_name} ({viewLeaveDetails.staff_id})
                  </p>
                </div>
                <button 
                  onClick={() => {
                    setViewLeaveDetails(null);
                    setAdminComment('');
                  }} 
                  className={combine(
                    "p-2 rounded-xl transition-all hover:bg-[var(--color-bg-hover)]",
                    get('icon', 'secondary') + " text-sm"
                  )}
                >
                  <FaTimes className="text-sm" />
                </button>
              </div>

              <div className="space-y-6">
                {/* Leave Info */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className={combine("p-4 rounded-lg", get('bg', 'secondary'))}>
                    <p className={combine("text-xs font-medium mb-1", get('text', 'tertiary'))}>Start Date</p>
                    <p className={combine("font-medium text-sm", get('text', 'primary'))}>
                      {new Date(viewLeaveDetails.start_date).toLocaleDateString('en-US', { 
                        weekday: 'long', 
                        year: 'numeric', 
                        month: 'long', 
                        day: 'numeric' 
                      })}
                    </p>
                  </div>
                  <div className={combine("p-4 rounded-lg", get('bg', 'secondary'))}>
                    <p className={combine("text-xs font-medium mb-1", get('text', 'tertiary'))}>End Date</p>
                    <p className={combine("font-medium text-sm", get('text', 'primary'))}>
                      {new Date(viewLeaveDetails.end_date).toLocaleDateString('en-US', { 
                        weekday: 'long', 
                        year: 'numeric', 
                        month: 'long', 
                        day: 'numeric' 
                      })}
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className={combine("p-4 rounded-lg", get('bg', 'secondary'))}>
                    <p className={combine("text-xs font-medium mb-1", get('text', 'tertiary'))}>Total Days</p>
                    <p className={combine("font-bold text-lg", get('text', 'primary'))}>
                      {viewLeaveDetails.total_days} day(s)
                    </p>
                  </div>
                  <div className={combine("p-4 rounded-lg", get('bg', 'secondary'))}>
                    <p className={combine("text-xs font-medium mb-1", get('text', 'tertiary'))}>Leave Type</p>
                    <p className={combine("font-medium text-sm", get('text', 'primary'))}>
                      {viewLeaveDetails.leave_type || 'Regular Leave'}
                    </p>
                  </div>
                </div>

                {/* Reason */}
                <div>
                  <h3 className={combine("text-sm font-medium mb-2", get('text', 'primary'))}>Reason for Leave</h3>
                  <div className={combine("p-4 rounded-lg", get('bg', 'secondary'))}>
                    <p className={combine("text-sm leading-relaxed", get('text', 'primary'))}>
                      {viewLeaveDetails.reason}
                    </p>
                  </div>
                </div>

                {/* Proof Document */}
                {viewLeaveDetails.proof_file && (
                  <div>
                    <h3 className={combine("text-sm font-medium mb-2", get('text', 'primary'))}>Supporting Document</h3>
                    <a
                      href={viewLeaveDetails.proof_file}
                      target="_blank"
                      rel="noopener noreferrer"
                      className={combine(
                        "inline-flex items-center space-x-2 px-4 py-2 rounded-lg transition-all hover:scale-[1.02]",
                        theme === 'dark'
                          ? 'bg-purple-900/30 text-purple-300 hover:bg-purple-800/30'
                          : 'bg-purple-100 text-purple-700 hover:bg-purple-200'
                      )}
                    >
                      <FaFileDownload className="text-sm" />
                      <span className="text-sm">View Document</span>
                    </a>
                  </div>
                )}

                {/* Previous Comment */}
                {viewLeaveDetails.admin_comment && (
                  <div>
                    <h3 className={combine("text-sm font-medium mb-2", get('text', 'primary'))}>Previous Admin Note</h3>
                    <div className={combine("p-4 rounded-lg", get('bg', 'secondary'))}>
                      <p className={combine("text-sm italic", get('text', 'primary'))}>
                        "{viewLeaveDetails.admin_comment}"
                      </p>
                    </div>
                  </div>
                )}

                {/* Action Section for Pending Requests */}
                {viewLeaveDetails.status === 'Pending' && (
                  <>
                    <div>
                      <h3 className={combine("text-sm font-medium mb-2", get('text', 'primary'))}>
                        Admin Comment {viewLeaveDetails.status === 'Rejected' && <span className="text-red-500">*</span>}
                      </h3>
                      <textarea
                        value={adminComment}
                        onChange={(e) => setAdminComment(e.target.value)}
                        placeholder={viewLeaveDetails.status === 'Rejected' ? 'Required: Please provide a reason for rejection' : 'Optional: Add a comment'}
                        rows={3}
                        className={combine(getInputClass(), "resize-none")}
                      />
                      {viewLeaveDetails.status === 'Rejected' && !adminComment.trim() && (
                        <p className={combine("text-xs mt-1", get('accent', 'error'))}>
                          Comment is required when rejecting a leave request
                        </p>
                      )}
                    </div>

                    <div className="flex gap-3 pt-4 border-t border-gray-200 dark:border-gray-700">
                      <button
                        onClick={() => updateLeaveStatus(viewLeaveDetails.id, 'Approved')}
                        className={combine(
                          "flex-1 px-4 py-3 rounded-xl transition-all duration-200 font-medium flex items-center justify-center gap-2 text-sm",
                          theme === 'dark'
                            ? 'bg-gradient-to-r from-emerald-600 to-emerald-700 hover:from-emerald-700 hover:to-emerald-800 text-white'
                            : 'bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-600 hover:to-emerald-700 text-white',
                          "hover:scale-[1.02] active:scale-[0.98]"
                        )}
                      >
                        <FaCheck className="text-sm" /> Approve Leave
                      </button>
                      <button
                        onClick={() => {
                          if (!adminComment.trim()) {
                            toastError('Please provide a comment when rejecting a leave request');
                            return;
                          }
                          updateLeaveStatus(viewLeaveDetails.id, 'Rejected');
                        }}
                        className={combine(
                          "flex-1 px-4 py-3 rounded-xl transition-all duration-200 font-medium flex items-center justify-center gap-2 text-sm",
                          theme === 'dark'
                            ? 'bg-gradient-to-r from-red-600 to-red-700 hover:from-red-700 hover:to-red-800 text-white'
                            : 'bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 text-white',
                          "hover:scale-[1.02] active:scale-[0.98]"
                        )}
                      >
                        <FaTimes className="text-sm" /> Reject Leave
                      </button>
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};