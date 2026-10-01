'use client';

import { useEffect, useState } from 'react';
import {
  FaMoneyBillWave,
  FaCalculator,
  FaChartBar,
  FaDownload,
  FaSearch,
  FaFilter,
  FaTimes,
  FaUserTie,
  FaCalendarAlt,
  FaIdCard,
  FaRupeeSign,
  FaPercentage,
  FaExclamationTriangle,
  FaCheckCircle,
  FaClock,
  FaEdit,
  FaSave,
  FaSort,
  FaSortUp,
  FaSortDown,
  FaChevronLeft,
  FaChevronRight,
  FaInfoCircle,
  FaFileInvoiceDollar,
  FaReceipt
} from 'react-icons/fa';
import { useTheme } from '@/contexts/ThemeContext';
import { useThemeClasses } from '@/hooks/useThemeClasses';
import { toastSuccess, toastError, toastInfo } from '@/lib/toast';

interface SalaryStructure {
  staff_type: string;
  base_salary: number;
  late_penalty_percentage: number;
  created_at?: string;
}

interface StaffMember {
  staff_id: string;
  name: string;
  role: string;
  extra_details?: {
    salary_grade: string;
  };
}

type SortField = 'name' | 'staff_id' | 'role' | 'base_salary';

export const SalaryPayrollPage = () => {
  const { theme } = useTheme();
  const { get, combine } = useThemeClasses();
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [staffList, setStaffList] = useState<StaffMember[]>([]);
  const [salaryStructures, setSalaryStructures] = useState<SalaryStructure[]>([]);
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [showStructureModal, setShowStructureModal] = useState(false);
  const [editingStructure, setEditingStructure] = useState<SalaryStructure | null>(null);
  const [sortField, setSortField] = useState<SortField>('name');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');

  const [structureForm, setStructureForm] = useState<SalaryStructure>({
    staff_type: '',
    base_salary: 0,
    late_penalty_percentage: 10
  });

  const itemsPerPage = 10;
  const months = Array.from({ length: 12 }, (_, i) => ({
    value: i + 1,
    label: new Date(2000, i).toLocaleString('default', { month: 'long' })
  }));

  const years = Array.from({ length: 10 }, (_, i) => new Date().getFullYear() - 5 + i);

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

  // Fetch staff list
  const fetchStaffList = async () => {
    setLoading(true);
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
        setStaffList(data?.data || data || []);
      }
    } catch (error) {
      console.error('Error fetching staff list:', error);
      toastError('Failed to fetch staff list');
    } finally {
      setLoading(false);
    }
  };

  // Fetch salary structures
  const fetchSalaryStructures = async () => {
    try {
      const token = localStorage.getItem('token');
      // Note: This endpoint needs to be created based on API 10
      // For now, we'll use localStorage or mock data
      toastInfo('Salary structure API integration pending');
    } catch (error) {
      console.error('Error fetching salary structures:', error);
    }
  };

  // Save salary structure
  const saveSalaryStructure = async () => {
    setSaving(true);
    try {
      const token = localStorage.getItem('token');
      const res = await fetch('https://senthurvidyalaya-backend.onrender.com/api/salary/admin/structure/', {
        method: 'POST',
        headers: {
          Authorization: `Token ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(structureForm),
      });

      const data = await res.json();

      if (res.ok) {
        toastSuccess(data.message || 'Salary structure saved successfully');
        setShowStructureModal(false);
        setStructureForm({
          staff_type: '',
          base_salary: 0,
          late_penalty_percentage: 10
        });
        fetchSalaryStructures();
      } else {
        toastError(data.message || 'Failed to save salary structure');
      }
    } catch (error) {
      console.error('Error saving salary structure:', error);
      toastError('Network error');
    } finally {
      setSaving(false);
    }
  };

  useEffect(() => {
    fetchStaffList();
    fetchSalaryStructures();
  }, []);

  // Filter and sort staff
  const filteredStaff = staffList.filter(staff => 
    staff.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    staff.staff_id.toLowerCase().includes(searchTerm.toLowerCase()) ||
    staff.role.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const sortedStaff = [...filteredStaff].sort((a:any, b:any) => {
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
  const totalPages = Math.ceil(sortedStaff.length / itemsPerPage);
  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentStaff = sortedStaff.slice(indexOfFirstItem, indexOfLastItem);

  // Calculate salary statistics
  const salaryStats = {
    totalStaff: staffList.length,
    averageSalary: staffList.length > 0 
      ? Math.round(staffList.reduce((sum, staff) => sum + 25000, 0) / staffList.length)
      : 0,
    totalMonthly: staffList.length * 25000,
    pendingPayments: Math.ceil(staffList.length * 0.2) // 20% pending
  };

  const exportPayrollReport = () => {
    const headers = ['Staff ID', 'Name', 'Role', 'Salary Grade', 'Base Salary', 'Month', 'Status'];
    const csvData = staffList.map(staff => [
      staff.staff_id,
      staff.name,
      staff.role,
      staff.extra_details?.salary_grade || 'N/A',
      '₹25,000',
      `${months[selectedMonth - 1].label} ${selectedYear}`,
      'Pending'
    ]);
    
    const csvContent = [
      headers.join(','),
      ...csvData.map(row => row.map(field => `"${field}"`).join(','))
    ].join('\n');
    
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `payroll_${selectedMonth}_${selectedYear}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
    toastSuccess('Payroll report exported successfully!');
  };

  const getRoleBadgeClass = (role: string) => {
    const colorMap: Record<string, string> = {
      'Transport Staff': theme === 'dark' ? 'from-blue-900/30 to-blue-800/30 text-blue-300 border-blue-800' : 'from-blue-100 to-blue-200 text-blue-700 border-blue-200',
      'IT Staff': theme === 'dark' ? 'from-emerald-900/30 to-emerald-800/30 text-emerald-300 border-emerald-800' : 'from-emerald-100 to-emerald-200 text-emerald-700 border-emerald-200',
      'Administrative Staff': theme === 'dark' ? 'from-purple-900/30 to-purple-800/30 text-purple-300 border-purple-800' : 'from-purple-100 to-purple-200 text-purple-700 border-purple-200',
    };

    const defaultClass = theme === 'dark' 
      ? 'from-gray-700 to-gray-800 text-gray-300 border-gray-600' 
      : 'from-gray-100 to-gray-200 text-gray-700 border-gray-300';

    return combine(
      'px-3 py-1.5 text-xs font-medium rounded-full bg-gradient-to-r border',
      colorMap[role] || defaultClass
    );
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
                <FaMoneyBillWave className="text-2xl text-white" />
              </div>
              <div>
                <h1 className={combine("text-3xl font-bold", get('text', 'primary'))}>
                  Salary & Payroll
                </h1>
                <p className={combine("text-sm mt-1", get('text', 'secondary'))}>
                  Manage staff salary structures and payroll processing
                </p>
              </div>
            </div>
            
            <div className="flex items-center space-x-3">
              <button
                onClick={exportPayrollReport}
                className={combine(getSecondaryButtonClass(), "flex items-center space-x-2")}
              >
                <FaDownload className="text-sm" />
                <span className="text-sm">Export Report</span>
              </button>
              
              <button
                onClick={() => {
                  setEditingStructure(null);
                  setStructureForm({
                    staff_type: '',
                    base_salary: 0,
                    late_penalty_percentage: 10
                  });
                  setShowStructureModal(true);
                }}
                className={combine(getPrimaryButtonClass(), "flex items-center space-x-2")}
              >
                <FaCalculator className="text-sm" />
                <span className="text-sm">Set Salary Structure</span>
              </button>
            </div>
          </div>

          {/* Stats Cards */}
          <div className="grid grid-cols-1 lg:grid-cols-5 gap-6 mb-8">
            <div className={getCardGradientClass('purple')}>
              <div className="flex items-center justify-between">
                <div>
                  <p className={combine("text-xs font-medium", get('text', 'secondary'))}>Total Staff</p>
                  <p className={combine("text-2xl font-bold mt-2", get('text', 'primary'))}>{salaryStats.totalStaff}</p>
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
                Active staff members
              </div>
            </div>
            
            <div className={getCardGradientClass('emerald')}>
              <div className="flex items-center justify-between">
                <div>
                  <p className={combine("text-xs font-medium", get('text', 'secondary'))}>Avg Salary</p>
                  <p className={combine("text-2xl font-bold mt-2", get('text', 'primary'))}>
                    ₹{salaryStats.averageSalary.toLocaleString()}
                  </p>
                </div>
                <div className={combine(
                  "p-2 rounded-xl",
                  theme === 'dark' ? 'bg-emerald-900/30' : 'bg-emerald-100'
                )}>
                  <FaRupeeSign className={combine(
                    "text-lg",
                    theme === 'dark' ? 'text-emerald-400' : 'text-emerald-600'
                  )} />
                </div>
              </div>
              <div className={combine("mt-3 text-xs", get('accent', 'success'))}>
                Monthly average
              </div>
            </div>
            
            <div className={getCardGradientClass('blue')}>
              <div className="flex items-center justify-between">
                <div>
                  <p className={combine("text-xs font-medium", get('text', 'secondary'))}>Monthly Payroll</p>
                  <p className={combine("text-2xl font-bold mt-2", get('text', 'primary'))}>
                    ₹{salaryStats.totalMonthly.toLocaleString()}
                  </p>
                </div>
                <div className={combine(
                  "p-2 rounded-xl",
                  theme === 'dark' ? 'bg-blue-900/30' : 'bg-blue-100'
                )}>
                  <FaFileInvoiceDollar className={combine(
                    "text-lg",
                    theme === 'dark' ? 'text-blue-400' : 'text-blue-600'
                  )} />
                </div>
              </div>
              <div className={combine("mt-3 text-xs", get('accent', 'primary'))}>
                Total monthly payout
              </div>
            </div>
            
            <div className={getCardGradientClass('amber')}>
              <div className="flex items-center justify-between">
                <div>
                  <p className={combine("text-xs font-medium", get('text', 'secondary'))}>Pending</p>
                  <p className={combine("text-2xl font-bold mt-2", get('text', 'primary'))}>{salaryStats.pendingPayments}</p>
                </div>
                <div className={combine(
                  "p-2 rounded-xl",
                  theme === 'dark' ? 'bg-amber-900/30' : 'bg-amber-100'
                )}>
                  <FaClock className={combine(
                    "text-lg",
                    theme === 'dark' ? 'text-amber-400' : 'text-amber-600'
                  )} />
                </div>
              </div>
              <div className={combine("mt-3 text-xs", get('accent', 'warning'))}>
                Payments pending
              </div>
            </div>
            
            <div className={getCardGradientClass('indigo')}>
              <div className="flex items-center justify-between">
                <div>
                  <p className={combine("text-xs font-medium", get('text', 'secondary'))}>Processing</p>
                  <p className={combine("text-2xl font-bold mt-2", get('text', 'primary'))}>
                    {selectedMonth}/{selectedYear}
                  </p>
                </div>
                <div className={combine(
                  "p-2 rounded-xl",
                  theme === 'dark' ? 'bg-indigo-900/30' : 'bg-indigo-100'
                )}>
                  <FaCalendarAlt className={combine(
                    "text-lg",
                    theme === 'dark' ? 'text-indigo-400' : 'text-indigo-600'
                  )} />
                </div>
              </div>
              <div className={combine("mt-3 text-xs", get('accent', 'primary'))}>
                Current period
              </div>
            </div>
          </div>
        </div>

        {/* Filters */}
        <div className={getCardGradientClass('purple')}>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
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
              <label className={combine("block text-sm font-medium mb-2", get('text', 'primary'))}>Search</label>
              <div className="relative">
                <FaSearch className={combine(
                  "absolute left-4 top-1/2 transform -translate-y-1/2 text-sm",
                  get('icon', 'secondary')
                )} />
                <input
                  type="text"
                  placeholder="Search staff..."
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
                  setSelectedMonth(new Date().getMonth() + 1);
                  setSelectedYear(new Date().getFullYear());
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

        {/* Salary Structure Table */}
        <div className={getCardGradientClass()}>
          <div className={combine("p-4 border-b", get('border', 'primary'))}>
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center space-y-3 md:space-y-0">
              <div>
                <h3 className={combine("text-lg font-bold", get('text', 'primary'))}>Staff Salary Overview</h3>
                <p className={combine("text-sm mt-1", get('text', 'secondary'))}>
                  View and manage staff salary information for {months[selectedMonth - 1].label} {selectedYear}
                </p>
              </div>
              
              <div className={combine("text-xs", get('text', 'tertiary'))}>
                Showing {indexOfFirstItem + 1} to {Math.min(indexOfLastItem, filteredStaff.length)} of {filteredStaff.length} staff
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
                  <p className={combine("mt-3 text-sm font-medium", get('text', 'secondary'))}>Loading salary data...</p>
                </div>
              </div>
            ) : currentStaff.length === 0 ? (
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
                <h3 className={combine("text-base font-medium mb-1", get('text', 'primary'))}>No staff found</h3>
                <p className={combine("text-sm", get('text', 'secondary'))}>
                  {searchTerm ? 'Try adjusting your search' : 'No staff members available'}
                </p>
              </div>
            ) : (
              <>
                <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                  <thead className={combine("bg-[var(--color-bg-secondary)]", get('border', 'primary'))}>
                    <tr>
                      <th className={combine(
                        "px-4 py-3 text-left text-xs font-medium uppercase tracking-wider cursor-pointer",
                        get('text', 'tertiary'),
                        "hover:bg-[var(--color-bg-hover)]"
                      )}
                        onClick={() => {
                          setSortField('staff_id');
                          setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
                        }}
                      >
                        <div className="flex items-center space-x-2">
                          <FaIdCard className="text-xs" />
                          <span className="text-xs">Staff ID</span>
                          {sortField === 'staff_id' && (
                            sortDirection === 'asc' ? 
                              <FaSortUp className={get('accent', 'primary') + " text-xs"} /> : 
                              <FaSortDown className={get('accent', 'primary') + " text-xs"} />
                          )}
                        </div>
                      </th>
                      <th className={combine(
                        "px-4 py-3 text-left text-xs font-medium uppercase tracking-wider cursor-pointer",
                        get('text', 'tertiary'),
                        "hover:bg-[var(--color-bg-hover)]"
                      )}
                        onClick={() => {
                          setSortField('name');
                          setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
                        }}
                      >
                        <div className="flex items-center space-x-2">
                          <FaUserTie className="text-xs" />
                          <span className="text-xs">Staff Member</span>
                          {sortField === 'name' && (
                            sortDirection === 'asc' ? 
                              <FaSortUp className={get('accent', 'primary') + " text-xs"} /> : 
                              <FaSortDown className={get('accent', 'primary') + " text-xs"} />
                          )}
                        </div>
                      </th>
                      <th className={combine(
                        "px-4 py-3 text-left text-xs font-medium uppercase tracking-wider cursor-pointer",
                        get('text', 'tertiary'),
                        "hover:bg-[var(--color-bg-hover)]"
                      )}
                        onClick={() => {
                          setSortField('role');
                          setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
                        }}
                      >
                        <div className="flex items-center space-x-2">
                          <span className="text-xs">Role</span>
                          {sortField === 'role' && (
                            sortDirection === 'asc' ? 
                              <FaSortUp className={get('accent', 'primary') + " text-xs"} /> : 
                              <FaSortDown className={get('accent', 'primary') + " text-xs"} />
                          )}
                        </div>
                      </th>
                      <th className={combine(
                        "px-4 py-3 text-left text-xs font-medium uppercase tracking-wider",
                        get('text', 'tertiary')
                      )}>
                        Salary Grade
                      </th>
                      <th className={combine(
                        "px-4 py-3 text-left text-xs font-medium uppercase tracking-wider",
                        get('text', 'tertiary')
                      )}>
                        Base Salary
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
                    {currentStaff.map((staff) => (
                      <tr key={staff.staff_id} className="hover:bg-[var(--color-bg-hover)]">
                        <td className="px-4 py-3">
                          <div className={combine("font-medium text-sm", get('accent', 'primary'))}>
                            {staff.staff_id}
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <div className="font-medium text-sm">{staff.name}</div>
                        </td>
                        <td className="px-4 py-3">
                          <span className={getRoleBadgeClass(staff.role)}>
                            {staff.role}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <div className={combine("text-sm", get('text', 'primary'))}>
                            {staff.extra_details?.salary_grade || 'N/A'}
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <div className={combine("text-sm font-bold", get('accent', 'primary'))}>
                            ₹25,000
                          </div>
                          <div className={combine("text-xs", get('text', 'tertiary'))}>
                            Monthly
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <span className={combine(
                            "px-3 py-1.5 text-xs font-medium rounded-full border",
                            theme === 'dark' 
                              ? 'bg-amber-900/30 text-amber-300 border-amber-800' 
                              : 'bg-amber-100 text-amber-700 border-amber-200'
                          )}>
                            <FaClock className="inline mr-1 text-xs" />
                            Pending
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <button
                            onClick={() => {
                              // Process payment for this staff
                              toastInfo(`Processing payment for ${staff.name}`);
                            }}
                            className={combine(
                              "px-3 py-1.5 text-sm rounded-lg transition-all hover:scale-[1.02] active:scale-[0.98]",
                              theme === 'dark'
                                ? 'bg-emerald-900/30 text-emerald-300 hover:bg-emerald-800/30'
                                : 'bg-emerald-100 text-emerald-700 hover:bg-emerald-200'
                            )}
                          >
                            Process Payment
                          </button>
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

        {/* Salary Structure Modal */}
        {showStructureModal && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50 animate-fade-in backdrop-blur-sm">
            <div className={combine(
              getCardGradientClass('emerald'),
              "max-w-md w-full shadow-2xl"
            )}>
              <div className="flex justify-between items-center mb-4">
                <h2 className={combine("text-lg font-bold", get('text', 'primary'))}>
                  {editingStructure ? 'Edit Salary Structure' : 'Set Salary Structure'}
                </h2>
                <button onClick={() => setShowStructureModal(false)} className={combine(
                  "p-2 rounded-xl transition-all hover:bg-[var(--color-bg-hover)]",
                  get('icon', 'secondary') + " text-sm"
                )}>
                  <FaTimes className="text-sm" />
                </button>
              </div>

              <div className="space-y-4">
                <div>
                  <label className={combine("block text-sm font-medium mb-2", get('text', 'primary'))}>Staff Type *</label>
                  <select
                    value={structureForm.staff_type}
                    onChange={(e) => setStructureForm({...structureForm, staff_type: e.target.value})}
                    className={getInputClass()}
                    required
                  >
                    <option value="">Select Staff Type</option>
                    <option value="external_staff">External Staff</option>
                    <option value="internal_staff">Internal Staff</option>
                    <option value="teaching_staff">Teaching Staff</option>
                    <option value="administrative_staff">Administrative Staff</option>
                    <option value="transport_staff">Transport Staff</option>
                  </select>
                </div>

                <div>
                  <label className={combine("block text-sm font-medium mb-2", get('text', 'primary'))}>Base Salary *</label>
                  <div className="relative">
                    <FaRupeeSign className={combine(
                      "absolute left-4 top-1/2 transform -translate-y-1/2 text-sm",
                      get('icon', 'secondary')
                    )} />
                    <input
                      type="number"
                      value={structureForm.base_salary}
                      onChange={(e) => setStructureForm({...structureForm, base_salary: parseInt(e.target.value) || 0})}
                      placeholder="Enter base salary"
                      className={combine(getInputClass(), "pl-10")}
                      required
                      min="0"
                    />
                  </div>
                </div>

                <div>
                  <label className={combine("block text-sm font-medium mb-2", get('text', 'primary'))}>Late Penalty Percentage</label>
                  <div className="relative">
                    <FaPercentage className={combine(
                      "absolute right-4 top-1/2 transform -translate-y-1/2 text-sm",
                      get('icon', 'secondary')
                    )} />
                    <input
                      type="number"
                      value={structureForm.late_penalty_percentage}
                      onChange={(e) => setStructureForm({...structureForm, late_penalty_percentage: parseInt(e.target.value) || 0})}
                      placeholder="Late penalty percentage"
                      className={combine(getInputClass(), "pr-10")}
                      min="0"
                      max="100"
                    />
                  </div>
                  <p className={combine("text-xs mt-1", get('text', 'tertiary'))}>
                    Percentage of salary deducted for late attendance
                  </p>
                </div>

                <div className="flex gap-3 pt-4 border-t border-gray-200 dark:border-gray-700">
                  <button
                    onClick={() => setShowStructureModal(false)}
                    className={combine(getSecondaryButtonClass(), "flex-1 text-sm")}
                  >
                    Cancel
                  </button>
                  <button
                    onClick={saveSalaryStructure}
                    disabled={saving || !structureForm.staff_type || !structureForm.base_salary}
                    className={combine(
                      getPrimaryButtonClass(),
                      "flex-1 flex items-center justify-center gap-2 text-sm disabled:opacity-50"
                    )}
                  >
                    {saving ? (
                      <>
                        <div className={combine(
                          "animate-spin rounded-full h-4 w-4 border-b-2",
                          theme === 'dark' ? 'border-white' : 'border-white'
                        )}></div>
                        Saving...
                      </>
                    ) : (
                      <>
                        <FaSave className="text-sm" /> Save Structure
                      </>
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