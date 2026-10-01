'use client';

import { useEffect, useState } from 'react';
import {
  FaUserTie,
  FaUserPlus,
  FaEdit,
  FaTrash,
  FaSave,
  FaArrowLeft,
  FaPhone,
  FaEnvelope,
  FaSearch,
  FaFilter,
  FaTimes,
  FaCheck,
  FaDownload,
  FaEye,
  FaSort,
  FaSortUp,
  FaSortDown,
  FaCalendarAlt,
  FaMapMarkerAlt,
  FaIdCard,
  FaChartBar,
  FaCog,
  FaChevronLeft,
  FaChevronRight,
  FaBuilding,
  FaMoneyBillWave,
  FaCar,
  FaBox,
  FaInfoCircle,
  FaKey,
  FaUserCircle,
  FaVenusMars,
  FaBirthdayCake,
  FaBriefcase,
  FaTools,
  FaLaptop,
  FaTruck,
  FaUsers,
  FaFileAlt
} from 'react-icons/fa';
import { useTheme } from '@/contexts/ThemeContext';
import { useThemeClasses } from '@/hooks/useThemeClasses';
import { toastSuccess, toastError, toastInfo, toastWarning } from '@/lib/toast';

interface Staff {
  id: number;
  staff_id: string;
  name: string;
  role: string;
  phone: string;
  email?: string;
  address?: string;
  extra_details?: {
    date_of_birth?: string;
    gender?: string;
    date_of_joining?: string;
    salary_grade?: string;
    emergency_contact?: string;
    qualification?: string;
    [key: string]: any;
  };
}

type SortField = 'name' | 'staff_id' | 'role';
type SortDirection = 'asc' | 'desc';

export const AllStaffPage = () => {
  const { theme } = useTheme();
  const { get, combine } = useThemeClasses();
  const [mode, setMode] = useState<'list' | 'add' | 'edit' | 'profile'>('list');
  const [staff, setStaff] = useState<Staff[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterRole, setFilterRole] = useState('all');
  const [sortField, setSortField] = useState<SortField>('name');
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc');
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedStaff, setSelectedStaff] = useState<Staff | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<number | null>(null);
  const [selectedStaffIds, setSelectedStaffIds] = useState<number[]>([]);

  const [formData, setFormData] = useState({
    staff_id: '',
    name: '',
    role: 'external_staff',
    phone: '',
    email: '',
    address: '',
    // Extra details fields
    date_of_birth: '',
    gender: '',
    date_of_joining: new Date().toISOString().split('T')[0],
    salary_grade: '',
    emergency_contact: '',
    qualification: '',
  });

  const itemsPerPage = 10;

  // Theme classes (keep your existing theme functions)
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
    };

    return combine(baseClasses, 'bg-gradient-to-br', gradients[color as keyof typeof gradients] || gradients.purple);
  };

  const getInputClass = () => combine(
    'px-4 py-3 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 outline-none transition-all w-full',
    'text-sm',
    get('bg', 'card'),
    get('border', 'secondary'),
    get('text', 'primary'),
    'placeholder:text-sm placeholder:text-[var(--color-text-tertiary)]',
    'hover:border-[var(--color-border-strong)]',
    'focus:border-[var(--color-accent-primary)]'
  );

  const getPrimaryButtonClass = () => combine(
    'px-5 py-2.5 rounded-lg transition-all duration-200 font-medium',
    'text-white shadow-lg hover:shadow-xl hover:scale-[1.02] active:scale-[0.98]',
    'text-sm',
    theme === 'dark'
      ? 'bg-gradient-to-r from-purple-600 to-purple-700 hover:from-purple-700 hover:to-purple-800'
      : 'bg-gradient-to-r from-purple-500 to-purple-600 hover:from-purple-600 hover:to-purple-700'
  );

  const getSecondaryButtonClass = () => combine(
    'px-4 py-2 rounded-lg transition-all duration-200 font-medium hover:scale-[1.02] active:scale-[0.98]',
    'text-sm',
    'border',
    get('border', 'secondary'),
    get('bg', 'card'),
    get('text', 'secondary'),
    'hover:bg-[var(--color-bg-hover)] hover:text-[var(--color-text-primary)]'
  );

  // Role options matching your model
  const roleOptions = [
    { value: 'admin_staff', label: 'Admin Staff', icon: FaBuilding, color: 'purple' },
    { value: 'finance_staff', label: 'Finance Staff', icon: FaMoneyBillWave, color: 'emerald' },
    { value: 'it_staff', label: 'IT Staff', icon: FaLaptop, color: 'blue' },
    { value: 'operations_staff', label: 'Operations Staff', icon: FaTools, color: 'amber' },
    { value: 'transport_staff', label: 'Transport Staff', icon: FaTruck, color: 'indigo' },
    { value: 'external_staff', label: 'External Staff', icon: FaUsers, color: 'gray' },
  ];

  const getStatusBadgeClass = (role: string) => {
    const roleOption = roleOptions.find(r => r.value === role);
    const color = roleOption?.color || 'gray';
    
    const colorMap: Record<string, string> = {
      'purple': theme === 'dark' ? 'from-purple-900/30 to-purple-800/30 text-purple-300 border-purple-800' : 'from-purple-100 to-purple-200 text-purple-700 border-purple-200',
      'emerald': theme === 'dark' ? 'from-emerald-900/30 to-emerald-800/30 text-emerald-300 border-emerald-800' : 'from-emerald-100 to-emerald-200 text-emerald-700 border-emerald-200',
      'blue': theme === 'dark' ? 'from-blue-900/30 to-blue-800/30 text-blue-300 border-blue-800' : 'from-blue-100 to-blue-200 text-blue-700 border-blue-200',
      'amber': theme === 'dark' ? 'from-amber-900/30 to-amber-800/30 text-amber-300 border-amber-800' : 'from-amber-100 to-amber-200 text-amber-700 border-amber-200',
      'indigo': theme === 'dark' ? 'from-indigo-900/30 to-indigo-800/30 text-indigo-300 border-indigo-800' : 'from-indigo-100 to-indigo-200 text-indigo-700 border-indigo-200',
      'gray': theme === 'dark' ? 'from-gray-700 to-gray-800 text-gray-300 border-gray-600' : 'from-gray-100 to-gray-200 text-gray-700 border-gray-300',
    };

    return combine(
      'px-3 py-1.5 text-xs font-medium rounded-full bg-gradient-to-r border flex items-center gap-1.5',
      colorMap[color] || colorMap.gray
    );
  };

  // Fetch all staff
  const fetchStaff = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        toastError('Please login again');
        return;
      }

      const res = await fetch('https://senthurvidyalaya-backend.onrender.com/api/schooladmin/staff/', {
        headers: { 
          'Authorization': `Token ${token}`,
          'Content-Type': 'application/json'
        },
      });
      
      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.message || 'Failed to fetch staff');
      }
      
      const data = await res.json();
      
      // Handle response format
      if (Array.isArray(data)) {
        setStaff(data);
      } else if (data.data && Array.isArray(data.data)) {
        setStaff(data.data);
      } else {
        setStaff([]);
      }
    } catch (error: any) {
      console.error('Error fetching staff:', error);
      toastError(error.message || 'Failed to fetch staff members');
      setStaff([]);
    } finally {
      setLoading(false);
    }
  };

  // Fetch specific staff details
  const fetchStaffDetails = async (staffId: string) => {
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`https://senthurvidyalaya-backend.onrender.com/api/schooladmin/staff/${staffId}/`, {
        headers: { 
          'Authorization': `Token ${token}`,
          'Content-Type': 'application/json'
        },
      });
      
      if (res.ok) {
        const data = await res.json();
        setSelectedStaff(data);
        setMode('profile');
      } else {
        const errorData = await res.json().catch(() => ({}));
        toastError(errorData.message || 'Failed to fetch staff details');
      }
    } catch (error: any) {
      console.error('Error fetching staff details:', error);
      toastError(error.message || 'Failed to fetch staff details');
    }
  };

  // Create new staff
  const createStaff = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    
    const token = localStorage.getItem('token');
    
    // Validate required fields
    if (!formData.staff_id || !formData.name || !formData.role || !formData.phone) {
      toastError('Please fill in all required fields (Staff ID, Name, Role, Phone)');
      setLoading(false);
      return;
    }

    // Prepare payload exactly matching serializer
    const payload = {
      staff_id: formData.staff_id,
      name: formData.name,
      role: formData.role,
      phone: formData.phone,
      email: formData.email || null,
      address: formData.address || null,
      extra_details: {
        ...(formData.date_of_birth && { date_of_birth: formData.date_of_birth }),
        ...(formData.gender && { gender: formData.gender }),
        ...(formData.date_of_joining && { date_of_joining: formData.date_of_joining }),
        ...(formData.salary_grade && { salary_grade: formData.salary_grade }),
        ...(formData.emergency_contact && { emergency_contact: formData.emergency_contact }),
        ...(formData.qualification && { qualification: formData.qualification }),
      }
    };

    try {
      const res = await fetch('https://senthurvidyalaya-backend.onrender.com/api/staff/create/', {
        method: 'POST',
        headers: {
          'Authorization': `Token ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      const data = await res.json();

      if (res.ok) {
        toastSuccess('Staff member created successfully');
        setMode('list');
        resetForm();
        fetchStaff();
      } else {
        // Display validation errors
        if (data.errors) {
          const errorMessages = Object.values(data.errors).flat().join(', ');
          toastError(errorMessages);
        } else if (data.message) {
          toastError(data.message);
        } else if (data.error) {
          toastError(data.error);
        } else {
          toastError('Failed to create staff member');
        }
      }
    } catch (error: any) {
      console.error('Error creating staff:', error);
      toastError(error.message || 'Network error');
    } finally {
      setLoading(false);
    }
  };

  // Update staff
  const updateStaff = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    
    if (!selectedStaff) return;
    
    const token = localStorage.getItem('token');
    
    // Validate required fields
    if (!formData.name || !formData.role || !formData.phone) {
      toastError('Please fill in all required fields (Name, Role, Phone)');
      setLoading(false);
      return;
    }

    // Prepare payload for update
    const payload = {
      staff_id: formData.staff_id,
      name: formData.name,
      role: formData.role,
      phone: formData.phone,
      email: formData.email || null,
      address: formData.address || null,
      extra_details: {
        ...selectedStaff.extra_details,
        ...(formData.date_of_birth && { date_of_birth: formData.date_of_birth }),
        ...(formData.gender && { gender: formData.gender }),
        ...(formData.date_of_joining && { date_of_joining: formData.date_of_joining }),
        ...(formData.salary_grade && { salary_grade: formData.salary_grade }),
        ...(formData.emergency_contact && { emergency_contact: formData.emergency_contact }),
        ...(formData.qualification && { qualification: formData.qualification }),
      }
    };

    try {
      const res = await fetch(`https://senthurvidyalaya-backend.onrender.com/api/schooladmin/staff/${selectedStaff.staff_id}/`, {
        method: 'PUT',
        headers: {
          'Authorization': `Token ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      const data = await res.json();

      if (res.ok) {
        toastSuccess('Staff member updated successfully');
        setMode('list');
        resetForm();
        fetchStaff();
      } else {
        if (data.errors) {
          const errorMessages = Object.values(data.errors).flat().join(', ');
          toastError(errorMessages);
        } else if (data.message) {
          toastError(data.message);
        } else if (data.error) {
          toastError(data.error);
        } else {
          toastError('Failed to update staff member');
        }
      }
    } catch (error: any) {
      console.error('Error updating staff:', error);
      toastError(error.message || 'Network error');
    } finally {
      setLoading(false);
    }
  };

  // Delete staff
  const deleteStaff = async (id: number) => {
    const staffToDelete = staff.find(s => s.id === id);
    if (!staffToDelete) return;

    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`https://senthurvidyalaya-backend.onrender.com/api/schooladmin/staff/${staffToDelete.staff_id}/`, {
        method: 'DELETE',
        headers: { 
          'Authorization': `Token ${token}`,
          'Content-Type': 'application/json'
        },
      });

      if (res.ok) {
        toastSuccess('Staff member deleted successfully');
        fetchStaff();
        setShowDeleteConfirm(null);
        setSelectedStaff(null);
      } else {
        const errorData = await res.json().catch(() => ({}));
        toastError(errorData.message || 'Failed to delete staff member');
      }
    } catch (error: any) {
      console.error('Error deleting staff:', error);
      toastError(error.message || 'Network error');
    }
  };

  const resetForm = () => {
    setFormData({
      staff_id: '',
      name: '',
      role: 'external_staff',
      phone: '',
      email: '',
      address: '',
      date_of_birth: '',
      gender: '',
      date_of_joining: new Date().toISOString().split('T')[0],
      salary_grade: '',
      emergency_contact: '',
      qualification: '',
    });
    setSelectedStaff(null);
  };

  const startEdit = (staffMember: Staff) => {
    setFormData({
      staff_id: staffMember.staff_id,
      name: staffMember.name,
      role: staffMember.role,
      phone: staffMember.phone,
      email: staffMember.email || '',
      address: staffMember.address || '',
      date_of_birth: staffMember.extra_details?.date_of_birth || '',
      gender: staffMember.extra_details?.gender || '',
      date_of_joining: staffMember.extra_details?.date_of_joining || new Date().toISOString().split('T')[0],
      salary_grade: staffMember.extra_details?.salary_grade || '',
      emergency_contact: staffMember.extra_details?.emergency_contact || '',
      qualification: staffMember.extra_details?.qualification || '',
    });
    setSelectedStaff(staffMember);
    setMode('edit');
  };

  const viewProfile = (staffMember: Staff) => {
    fetchStaffDetails(staffMember.staff_id);
  };

  useEffect(() => {
    fetchStaff();
  }, []);

  // Filter and sort
  const filteredStaff = staff.filter(member => {
    const matchesSearch = 
      member.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      member.staff_id?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      member.role?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      member.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      member.phone?.includes(searchTerm);
    
    const matchesRole = filterRole === 'all' || member.role === filterRole;
    
    return matchesSearch && matchesRole;
  });

  const sortedStaff = [...filteredStaff].sort((a: any, b: any) => {
    let aValue: any = a[sortField];
    let bValue: any = b[sortField];

    if (typeof aValue === 'string' && typeof bValue === 'string') {
      aValue = aValue.toLowerCase();
      bValue = bValue.toLowerCase();
    }

    if (!aValue) return sortDirection === 'asc' ? 1 : -1;
    if (!bValue) return sortDirection === 'asc' ? -1 : 1;
    
    if (aValue < bValue) return sortDirection === 'asc' ? -1 : 1;
    if (aValue > bValue) return sortDirection === 'asc' ? 1 : -1;
    return 0;
  });

  // Pagination
  const totalPages = Math.ceil(sortedStaff.length / itemsPerPage);
  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentStaff = sortedStaff.slice(indexOfFirstItem, indexOfLastItem);

  // Get unique roles from staff data
  const roles = ['all', ...Array.from(new Set(staff.map(s => s.role).filter(Boolean)))];

  // Stats
  const totalStaff = staff.length;
  const roleCount = Array.from(new Set(staff.map(s => s.role).filter(Boolean))).length;

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  // Format role for display
  const formatRoleDisplay = (role: string) => {
    const roleOption = roleOptions.find(r => r.value === role);
    return roleOption?.label || role.replace('_', ' ').toUpperCase();
  };

  // Get role icon
  const getRoleIcon = (role: string) => {
    const roleOption = roleOptions.find(r => r.value === role);
    return roleOption?.icon || FaBriefcase;
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
                <FaUserTie className="text-2xl text-white" />
              </div>
              <div>
                <h1 className={combine("text-3xl font-bold", get('text', 'primary'))}>
                  Staff Directory
                </h1>
                <p className={combine("text-sm mt-1", get('text', 'secondary'))}>
                  Manage all non-teaching staff members
                </p>
              </div>
            </div>
            
            <div className="flex items-center space-x-3">
              {mode === 'list' ? (
                <button
                  onClick={() => setMode('add')}
                  className={combine(getPrimaryButtonClass(), "flex items-center space-x-2")}
                >
                  <FaUserPlus className="text-sm" />
                  <span className="text-sm">Add Staff</span>
                </button>
              ) : (
                <button
                  onClick={() => {
                    setMode('list');
                    resetForm();
                  }}
                  className={combine(getSecondaryButtonClass(), "flex items-center space-x-2")}
                >
                  <FaArrowLeft className="text-sm" />
                  <span className="text-sm">Back to List</span>
                </button>
              )}
            </div>
          </div>

          {/* Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4 mb-8">
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
                  <FaUserTie className={combine(
                    "text-lg",
                    theme === 'dark' ? 'text-purple-400' : 'text-purple-600'
                  )} />
                </div>
              </div>
            </div>
            
            {roleOptions.map(role => (
              <div key={role.value} className={getCardGradientClass(role.color as any)}>
                <div className="flex items-center justify-between">
                  <div>
                    <p className={combine("text-xs font-medium", get('text', 'secondary'))}>
                      {role.label.split(' ')[0]}
                    </p>
                    <p className={combine("text-2xl font-bold mt-2", get('text', 'primary'))}>
                      {staff.filter(s => s.role === role.value).length}
                    </p>
                  </div>
                  <div className={combine(
                    "p-2 rounded-xl",
                    theme === 'dark' ? `bg-${role.color}-900/30` : `bg-${role.color}-100`
                  )}>
                    {role.icon && (
                      <role.icon className={combine(
                        "text-lg",
                        theme === 'dark' ? `text-${role.color}-400` : `text-${role.color}-600`
                      )} />
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* List View */}
        {mode === 'list' && (
          <>
            {/* Search & Filters */}
            <div className={getCardGradientClass('purple')}>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
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
                      className={getInputClass()}
                      style={{ paddingLeft: '2.5rem' }}
                    />
                  </div>
                </div>
                <div>
                  <select
                    value={filterRole}
                    onChange={(e) => setFilterRole(e.target.value)}
                    className={getInputClass()}
                  >
                    <option value="all">All Roles</option>
                    {roleOptions.map(role => (
                      <option key={role.value} value={role.value}>
                        {role.label}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <button
                    onClick={() => {
                      setSearchTerm('');
                      setFilterRole('all');
                    }}
                    className={combine(getSecondaryButtonClass(), "w-full flex items-center justify-center space-x-2")}
                  >
                    <FaTimes className="text-sm" />
                    <span className="text-sm">Clear Filters</span>
                  </button>
                </div>
              </div>
            </div>

            {/* Staff Table */}
            <div className={getCardGradientClass()}>
              {/* Table Header */}
              <div className={combine("p-4 border-b", get('border', 'primary'))}>
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center space-y-3 md:space-y-0">
                  <div>
                    <h3 className={combine("text-lg font-bold", get('text', 'primary'))}>Staff Records</h3>
                    <p className={combine("text-sm mt-1", get('text', 'secondary'))}>
                      {sortedStaff.length} staff members found
                    </p>
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
                      <p className={combine("mt-3 text-sm font-medium", get('text', 'secondary'))}>Loading staff...</p>
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
                    <p className={combine("text-sm mb-4", get('text', 'secondary'))}>
                      {searchTerm || filterRole !== 'all' 
                        ? 'Try adjusting your search or filters'
                        : 'Add your first staff member to get started'}
                    </p>
                    {!searchTerm && filterRole === 'all' && (
                      <button
                        onClick={() => setMode('add')}
                        className={combine(getPrimaryButtonClass(), "mt-2")}
                      >
                        Add First Staff
                      </button>
                    )}
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
                            onClick={() => handleSort('staff_id')}
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
                            onClick={() => handleSort('name')}
                          >
                            <div className="flex items-center space-x-2">
                              <FaUserTie className="text-xs" />
                              <span className="text-xs">Name</span>
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
                            onClick={() => handleSort('role')}
                          >
                            <div className="flex items-center space-x-2">
                              <FaBriefcase className="text-xs" />
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
                            <div className="flex items-center space-x-2">
                              <FaPhone className="text-xs" />
                              <span className="text-xs">Contact</span>
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
                      <tbody className={combine("divide-y", get('border', 'primary'))}>
                        {currentStaff.map((member) => {
                          const RoleIcon = getRoleIcon(member.role);
                          return (
                            <tr 
                              key={member.id} 
                              className="transition-colors duration-150 hover:bg-[var(--color-bg-hover)]"
                            >
                              <td className="px-4 py-3">
                                <div className={combine("font-medium text-sm", get('accent', 'primary'))}>
                                  {member.staff_id}
                                </div>
                              </td>
                              <td className="px-4 py-3">
                                <div className="flex items-center">
                                  <div className={combine(
                                    "h-9 w-9 rounded-full flex items-center justify-center mr-3",
                                    theme === 'dark' ? 'bg-gray-800' : 'bg-gray-100'
                                  )}>
                                    <FaUserTie className={combine(
                                      "text-sm",
                                      theme === 'dark' ? 'text-gray-400' : 'text-gray-600'
                                    )} />
                                  </div>
                                  <div>
                                    <div className="font-semibold text-sm">{member.name}</div>
                                    {member.extra_details?.gender && (
                                      <div className={combine("text-xs mt-0.5", get('text', 'tertiary'))}>
                                        {member.extra_details.gender}
                                      </div>
                                    )}
                                  </div>
                                </div>
                              </td>
                              <td className="px-4 py-3">
                                <div className="flex items-center space-x-2">
                                  <RoleIcon className={combine("text-sm", get('icon', 'secondary'))} />
                                  <span className={getStatusBadgeClass(member.role)}>
                                    {formatRoleDisplay(member.role)}
                                  </span>
                                </div>
                              </td>
                              <td className="px-4 py-3">
                                <div className="space-y-1.5">
                                  <div className={combine("flex items-center text-xs", get('text', 'primary'))}>
                                    <FaEnvelope className={combine("mr-2 text-xs", get('icon', 'secondary'))} />
                                    <span className="truncate max-w-[120px] text-xs">{member.email || 'N/A'}</span>
                                  </div>
                                  <div className={combine("flex items-center text-xs", get('text', 'primary'))}>
                                    <FaPhone className={combine("mr-2 text-xs", get('icon', 'secondary'))} />
                                    <span className="text-xs">{member.phone}</span>
                                  </div>
                                </div>
                              </td>
                              <td className="px-4 py-3">
                                <div className="flex space-x-1.5">
                                  <button
                                    onClick={() => viewProfile(member)}
                                    className={combine(
                                      "p-1.5 rounded-lg transition-all duration-200 hover:text-[var(--color-accent-primary)]",
                                      get('icon', 'primary') + " text-sm"
                                    )}
                                    title="View Profile"
                                  >
                                    <FaEye className="text-sm" />
                                  </button>
                                  <button
                                    onClick={() => startEdit(member)}
                                    className={combine(
                                      "p-1.5 rounded-lg transition-all duration-200 hover:text-[var(--color-accent-success)]",
                                      get('icon', 'primary') + " text-sm"
                                    )}
                                    title="Edit"
                                  >
                                    <FaEdit className="text-sm" />
                                  </button>
                                  <button
                                    onClick={() => setShowDeleteConfirm(member.id)}
                                    className={combine(
                                      "p-1.5 rounded-lg transition-all duration-200 hover:text-[var(--color-accent-error)]",
                                      get('icon', 'primary') + " text-sm"
                                    )}
                                    title="Delete"
                                  >
                                    <FaTrash className="text-sm" />
                                  </button>
                                </div>
                              </td>
                            </tr>
                          );
                        })}
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
                                "p-1.5 rounded-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed hover:scale-[1.02] active:scale-[0.98] text-sm",
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
                                      "px-3 py-1.5 rounded-lg transition-all font-medium hover:scale-[1.02] active:scale-[0.98] text-xs",
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
                                "p-1.5 rounded-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed hover:scale-[1.02] active:scale-[0.98] text-sm",
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

        {/* Profile View */}
        {mode === 'profile' && selectedStaff && (
          <div className="animate-fade-in max-w-6xl mx-auto">
            <div className={getCardGradientClass()}>
              {/* Profile Header */}
              <div className="p-6">
                <div className="flex justify-between items-start mb-6">
                  <div className="flex items-center gap-4">
                    <div className={combine(
                      "h-20 w-20 rounded-full flex items-center justify-center border-4",
                      theme === 'dark' ? 'bg-gray-800 border-purple-900/30' : 'bg-purple-100 border-purple-200'
                    )}>
                      <FaUserTie className={combine(
                        "text-3xl",
                        theme === 'dark' ? 'text-purple-400' : 'text-purple-600'
                      )} />
                    </div>
                    <div>
                      <h1 className={combine("text-2xl font-bold", get('text', 'primary'))}>{selectedStaff.name}</h1>
                      <p className={combine("text-sm mt-1", get('text', 'secondary'))}>
                        {selectedStaff.staff_id} • {formatRoleDisplay(selectedStaff.role)}
                      </p>
                      <div className="flex gap-3 mt-2">
                        {selectedStaff.extra_details?.gender && (
                          <span className={combine(
                            "px-3 py-1 rounded-full text-sm flex items-center gap-1",
                            theme === 'dark' ? 'bg-gray-800 text-gray-300' : 'bg-gray-100 text-gray-700'
                          )}>
                            <FaVenusMars className="text-xs" /> {selectedStaff.extra_details.gender}
                          </span>
                        )}
                        {selectedStaff.extra_details?.qualification && (
                          <span className={combine(
                            "px-3 py-1 rounded-full text-sm",
                            theme === 'dark' ? 'bg-gray-800 text-gray-300' : 'bg-gray-100 text-gray-700'
                          )}>
                            {selectedStaff.extra_details.qualification}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                  <button
                    onClick={() => setMode('list')}
                    className={combine(
                      "p-2 rounded-lg transition-colors hover:bg-[var(--color-bg-hover)]",
                      get('icon', 'secondary') + " text-sm"
                    )}
                  >
                    <FaTimes className="text-sm" />
                  </button>
                </div>

                {/* Profile Content */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Basic Information */}
                  <div>
                    <h2 className={combine("text-lg font-semibold mb-4", get('text', 'primary'))}>Basic Information</h2>
                    <div className="space-y-3">
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <p className={combine("text-xs", get('text', 'tertiary'))}>Staff ID</p>
                          <p className={combine("font-medium text-sm mt-1", get('text', 'primary'))}>{selectedStaff.staff_id}</p>
                        </div>
                        <div>
                          <p className={combine("text-xs", get('text', 'tertiary'))}>Role</p>
                          <span className={getStatusBadgeClass(selectedStaff.role)}>
                            {formatRoleDisplay(selectedStaff.role)}
                          </span>
                        </div>
                      </div>
                      <div>
                        <p className={combine("text-xs", get('text', 'tertiary'))}>Phone</p>
                        <p className={combine("font-medium text-sm mt-1", get('text', 'primary'))}>{selectedStaff.phone}</p>
                      </div>
                      <div>
                        <p className={combine("text-xs", get('text', 'tertiary'))}>Email</p>
                        <p className={combine("font-medium text-sm mt-1", get('text', 'primary'))}>{selectedStaff.email || 'N/A'}</p>
                      </div>
                      <div>
                        <p className={combine("text-xs", get('text', 'tertiary'))}>Address</p>
                        <p className={combine("font-medium text-sm mt-1", get('text', 'primary'))}>{selectedStaff.address || 'N/A'}</p>
                      </div>
                    </div>
                  </div>

                  {/* Extra Details */}
                  <div>
                    <h2 className={combine("text-lg font-semibold mb-4", get('text', 'primary'))}>Additional Information</h2>
                    <div className="space-y-3">
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <p className={combine("text-xs", get('text', 'tertiary'))}>Date of Birth</p>
                          <p className={combine("font-medium text-sm mt-1", get('text', 'primary'))}>
                            {selectedStaff.extra_details?.date_of_birth || 'N/A'}
                          </p>
                        </div>
                        <div>
                          <p className={combine("text-xs", get('text', 'tertiary'))}>Date of Joining</p>
                          <p className={combine("font-medium text-sm mt-1", get('text', 'primary'))}>
                            {selectedStaff.extra_details?.date_of_joining || 'N/A'}
                          </p>
                        </div>
                      </div>
                      <div>
                        <p className={combine("text-xs", get('text', 'tertiary'))}>Salary Grade</p>
                        <p className={combine("font-medium text-sm mt-1", get('text', 'primary'))}>
                          {selectedStaff.extra_details?.salary_grade || 'N/A'}
                        </p>
                      </div>
                      <div>
                        <p className={combine("text-xs", get('text', 'tertiary'))}>Emergency Contact</p>
                        <p className={combine("font-medium text-sm mt-1", get('text', 'primary'))}>
                          {selectedStaff.extra_details?.emergency_contact || 'N/A'}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Quick Actions */}
                <div className={combine("mt-6 pt-6 border-t", get('border', 'primary'))}>
                  <h2 className={combine("text-lg font-semibold mb-4", get('text', 'primary'))}>Quick Actions</h2>
                  <div className="flex space-x-3">
                    <button
                      onClick={() => startEdit(selectedStaff)}
                      className={combine(getPrimaryButtonClass(), "flex items-center gap-2")}
                    >
                      <FaEdit /> Edit Profile
                    </button>
                    <button
                      onClick={() => setShowDeleteConfirm(selectedStaff.id)}
                      className={combine(
                        getSecondaryButtonClass(),
                        theme === 'dark'
                          ? 'text-red-400 border-red-800 hover:bg-red-900/20'
                          : 'text-red-600 border-red-200 hover:bg-red-50'
                      )}
                    >
                      <FaTrash /> Delete Staff
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Add/Edit Form */}
        {(mode === 'add' || mode === 'edit') && (
          <div className="animate-fade-in max-w-4xl mx-auto">
            <div className={getCardGradientClass()}>
              {/* Form Header */}
              <div className="mb-6">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center space-x-4">
                    <div className={combine(
                      "p-3 rounded-lg",
                      theme === 'dark' ? 'bg-purple-900/30' : 'bg-purple-100'
                    )}>
                      <FaUserPlus className={combine(
                        "text-lg",
                        theme === 'dark' ? 'text-purple-400' : 'text-purple-600'
                      )} />
                    </div>
                    <div>
                      <h2 className={combine("text-lg font-bold", get('text', 'primary'))}>
                        {mode === 'edit' ? 'Edit Staff Member' : 'Add New Staff'}
                      </h2>
                      <p className={combine("text-sm mt-0.5", get('text', 'secondary'))}>
                        {mode === 'edit' ? 'Update staff information' : 'Register a new staff member'}
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Form Content */}
              <form onSubmit={mode === 'add' ? createStaff : updateStaff} className="space-y-6">
                <div className="space-y-6">
                  {/* Required Fields */}
                  <div>
                    <h3 className={combine("text-sm font-semibold mb-3", get('text', 'primary'))}>Required Information</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className={combine("block text-xs font-medium mb-2", get('text', 'primary'))}>
                          Staff ID *
                        </label>
                        <input
                          type="text"
                          value={formData.staff_id}
                          onChange={(e) => setFormData({...formData, staff_id: e.target.value})}
                          required
                          disabled={mode === 'edit'}
                          className={combine(getInputClass(), "disabled:opacity-50")}
                          placeholder="STF001"
                        />
                      </div>
                      <div>
                        <label className={combine("block text-xs font-medium mb-2", get('text', 'primary'))}>
                          Full Name *
                        </label>
                        <input
                          type="text"
                          value={formData.name}
                          onChange={(e) => setFormData({...formData, name: e.target.value})}
                          required
                          className={getInputClass()}
                          placeholder="John Smith"
                        />
                      </div>
                      <div>
                        <label className={combine("block text-xs font-medium mb-2", get('text', 'primary'))}>
                          Role *
                        </label>
                        <select
                          value={formData.role}
                          onChange={(e) => setFormData({...formData, role: e.target.value})}
                          required
                          className={getInputClass()}
                        >
                          <option value="">Select Role</option>
                          {roleOptions.map(option => (
                            <option key={option.value} value={option.value}>
                              {option.label}
                            </option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label className={combine("block text-xs font-medium mb-2", get('text', 'primary'))}>
                          Phone Number *
                        </label>
                        <input
                          type="tel"
                          value={formData.phone}
                          onChange={(e) => setFormData({...formData, phone: e.target.value})}
                          required
                          className={getInputClass()}
                          placeholder="9876543210"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Contact Information */}
                  <div>
                    <h3 className={combine("text-sm font-semibold mb-3", get('text', 'primary'))}>Contact Information</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className={combine("block text-xs font-medium mb-2", get('text', 'primary'))}>
                          Email Address
                        </label>
                        <input
                          type="email"
                          value={formData.email}
                          onChange={(e) => setFormData({...formData, email: e.target.value})}
                          className={getInputClass()}
                          placeholder="staff@school.edu"
                        />
                      </div>
                      <div>
                        <label className={combine("block text-xs font-medium mb-2", get('text', 'primary'))}>
                          Emergency Contact
                        </label>
                        <input
                          type="tel"
                          value={formData.emergency_contact}
                          onChange={(e) => setFormData({...formData, emergency_contact: e.target.value})}
                          className={getInputClass()}
                          placeholder="9876543211"
                        />
                      </div>
                      <div className="md:col-span-2">
                        <label className={combine("block text-xs font-medium mb-2", get('text', 'primary'))}>
                          Address
                        </label>
                        <textarea
                          value={formData.address}
                          onChange={(e) => setFormData({...formData, address: e.target.value})}
                          rows={2}
                          className={combine(getInputClass(), "resize-none")}
                          placeholder="Full address"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Personal Details */}
                  <div>
                    <h3 className={combine("text-sm font-semibold mb-3", get('text', 'primary'))}>Personal Details</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className={combine("block text-xs font-medium mb-2", get('text', 'primary'))}>
                          Date of Birth
                        </label>
                        <input
                          type="date"
                          value={formData.date_of_birth}
                          onChange={(e) => setFormData({...formData, date_of_birth: e.target.value})}
                          className={getInputClass()}
                        />
                      </div>
                      <div>
                        <label className={combine("block text-xs font-medium mb-2", get('text', 'primary'))}>
                          Gender
                        </label>
                        <select
                          value={formData.gender}
                          onChange={(e) => setFormData({...formData, gender: e.target.value})}
                          className={getInputClass()}
                        >
                          <option value="">Select Gender</option>
                          <option value="Male">Male</option>
                          <option value="Female">Female</option>
                          <option value="Other">Other</option>
                        </select>
                      </div>
                      <div>
                        <label className={combine("block text-xs font-medium mb-2", get('text', 'primary'))}>
                          Date of Joining
                        </label>
                        <input
                          type="date"
                          value={formData.date_of_joining}
                          onChange={(e) => setFormData({...formData, date_of_joining: e.target.value})}
                          className={getInputClass()}
                        />
                      </div>
                      <div>
                        <label className={combine("block text-xs font-medium mb-2", get('text', 'primary'))}>
                          Salary Grade
                        </label>
                        <input
                          type="text"
                          value={formData.salary_grade}
                          onChange={(e) => setFormData({...formData, salary_grade: e.target.value})}
                          className={getInputClass()}
                          placeholder="Grade 3"
                        />
                      </div>
                      <div className="md:col-span-2">
                        <label className={combine("block text-xs font-medium mb-2", get('text', 'primary'))}>
                          Qualification
                        </label>
                        <input
                          type="text"
                          value={formData.qualification}
                          onChange={(e) => setFormData({...formData, qualification: e.target.value})}
                          className={getInputClass()}
                          placeholder="Diploma in Mechanical"
                        />
                      </div>
                    </div>
                  </div>
                </div>

                {/* Form Actions */}
                <div className={combine("flex space-x-3 pt-6 border-t", get('border', 'primary'))}>
                  <button
                    type="button"
                    onClick={() => {
                      setMode('list');
                      resetForm();
                    }}
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
                        <span className="text-sm">{mode === 'edit' ? 'Update Staff' : 'Save Staff'}</span>
                      </>
                    )}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Delete Confirmation Modal */}
        {showDeleteConfirm && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50 animate-fade-in backdrop-blur-sm">
            <div className={combine(
              getCardGradientClass('red'),
              "max-w-md w-full"
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
                <h3 className={combine("text-lg font-bold mb-1.5", get('text', 'primary'))}>Delete Staff Member</h3>
                <p className={combine("text-sm mb-4", get('text', 'secondary'))}>
                  Are you sure you want to delete this staff member? This action cannot be undone.
                </p>
                <div className="flex space-x-2">
                  <button
                    onClick={() => setShowDeleteConfirm(null)}
                    className={combine(getSecondaryButtonClass(), "text-sm flex-1")}
                  >
                    Cancel
                  </button>
                  <button
                    onClick={() => deleteStaff(showDeleteConfirm)}
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
