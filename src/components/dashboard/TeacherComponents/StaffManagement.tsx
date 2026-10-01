// components/staff-management.tsx
'use client';

import { useEffect, useState } from 'react';
import {
  FaUsers,
  FaUserPlus,
  FaEdit,
  FaTrash,
  FaSave,
  FaBuilding,
  FaPhone,
  FaEnvelope,
  FaMapMarkerAlt,
  FaSearch,
  FaFilter,
  FaSort,
  FaSortUp,
  FaSortDown,
  FaChevronLeft,
  FaChevronRight,
  FaDownload,
  FaEye,
  FaUserCog,
  FaUserTie,
  FaMoneyBillWave,
  FaDesktop,
  FaCogs,
  FaBus,
  FaUserFriends,
  FaKey,
  FaUserCheck
} from 'react-icons/fa';

// Role types based on your model
type StaffRole = 'admin_staff' | 'finance_staff' | 'it_staff' | 'operations_staff' | 'transport_staff' | 'external_staff';

interface Staff {
  id: number;
  staff_id: string;
  name: string;
  phone: string;
  role: StaffRole;
  email?: string;
  address: string;
  extra_details?: any;
  user?: {
    username: string;
    email: string;
  };
}

// Role display mapping
const ROLE_DISPLAY: Record<StaffRole, string> = {
  'admin_staff': 'Admin Staff',
  'finance_staff': 'Finance Staff',
  'it_staff': 'IT Staff',
  'operations_staff': 'Operations Staff',
  'transport_staff': 'Transport Staff',
  'external_staff': 'External Staff'
};

// Role icons mapping
const ROLE_ICONS: Record<StaffRole, JSX.Element> = {
  'admin_staff': <FaUserTie className="text-purple-600" />,
  'finance_staff': <FaMoneyBillWave className="text-green-600" />,
  'it_staff': <FaDesktop className="text-blue-600" />,
  'operations_staff': <FaCogs className="text-orange-600" />,
  'transport_staff': <FaBus className="text-red-600" />,
  'external_staff': <FaUserFriends className="text-gray-600" />
};

// Role colors for badges
const ROLE_COLORS: Record<StaffRole, { bg: string; text: string }> = {
  'admin_staff': { bg: 'bg-purple-100', text: 'text-purple-800' },
  'finance_staff': { bg: 'bg-green-100', text: 'text-green-800' },
  'it_staff': { bg: 'bg-blue-100', text: 'text-blue-800' },
  'operations_staff': { bg: 'bg-orange-100', text: 'text-orange-800' },
  'transport_staff': { bg: 'bg-red-100', text: 'text-red-800' },
  'external_staff': { bg: 'bg-gray-100', text: 'text-gray-800' }
};

export const StaffManagementPage = () => {
  const [mode, setMode] = useState<'list' | 'add' | 'edit' | 'detail'>('list');
  const [staffList, setStaffList] = useState<Staff[]>([]);
  const [loading, setLoading] = useState(false);
  const [editId, setEditId] = useState<number | null>(null);
  const [selectedStaff, setSelectedStaff] = useState<Staff | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterRole, setFilterRole] = useState<StaffRole | 'all'>('all');
  const [sortField, setSortField] = useState<'name' | 'staff_id' | 'role'>('name');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  const [formData, setFormData] = useState({
    staff_id: '',
    name: '',
    phone: '',
    role: 'admin_staff' as StaffRole,
    email: '',
    address: '',
    extra_details: {}
  });

  const [showDeleteConfirm, setShowDeleteConfirm] = useState<number | null>(null);
  const [showResetPassword, setShowResetPassword] = useState<number | null>(null);
  const [successMessage, setSuccessMessage] = useState<string>('');

  // Fetch Staff - Using your API
  const fetchStaff = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      const res = await fetch('https://senthurvidyalaya-backend.onrender.com/api/setup/staff/', {
        headers: { 
          Authorization: `Token ${token}`,
          'Content-Type': 'application/json',
        },
      });
      
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data)) {
          setStaffList(data);
        } else if (Array.isArray(data.results)) {
          setStaffList(data.results);
        } else if (Array.isArray(data.data)) {
          setStaffList(data.data);
        } else {
          console.error('Unexpected API response format:', data);
          setStaffList([]);
        }
      } else {
        console.error('Failed to fetch staff:', res.status, res.statusText);
      }
    } catch (error) {
      console.error('Error fetching staff:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStaff();
  }, []);

  // Delete Staff - Using your API
  const deleteStaff = async (id: number) => {
    const staff = staffList.find(s => s.id === id);
    if (!staff) {
      alert('Staff not found');
      return;
    }

    const token = localStorage.getItem('token');
    try {
      const res = await fetch(`https://senthurvidyalaya-backend.onrender.com/api/setup/staff/${staff.staff_id}/`, {
        method: 'DELETE',
        headers: { 
          Authorization: `Token ${token}`,
        },
      });
      
      if (res.ok) {
        setStaffList(prev => prev.filter(s => s.id !== id));
        setSuccessMessage(`Staff ${staff.name} deleted successfully`);
        setTimeout(() => setSuccessMessage(''), 3000);
      } else {
        const errorData = await res.json();
        alert(errorData.detail || errorData.message || 'Failed to delete staff');
      }
    } catch (error) {
      console.error('Delete error:', error);
      alert('Failed to delete staff');
    } finally {
      setShowDeleteConfirm(null);
    }
  };

  // Reset Password
  const resetPassword = async (id: number) => {
    const staff = staffList.find(s => s.id === id);
    if (!staff) {
      alert('Staff not found');
      return;
    }

    const token = localStorage.getItem('token');
    try {
      const res = await fetch(`https://senthurvidyalaya-backend.onrender.com/api/auth/reset-staff-password/${staff.staff_id}/`, {
        method: 'POST',
        headers: { 
          Authorization: `Token ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({}),
      });
      
      if (res.ok) {
        const data = await res.json();
        setSuccessMessage(`Password reset successful! New password: ${data.new_password}`);
        setTimeout(() => setSuccessMessage(''), 5000);
      } else {
        const errorData = await res.json();
        alert(errorData.detail || errorData.message || 'Failed to reset password');
      }
    } catch (error) {
      console.error('Reset password error:', error);
      alert('Failed to reset password');
    } finally {
      setShowResetPassword(null);
    }
  };

  // Start Edit
  const startEdit = (staff: Staff) => {
    setFormData({
      staff_id: staff.staff_id,
      name: staff.name,
      phone: staff.phone,
      role: staff.role,
      email: staff.email || '',
      address: staff.address || '',
      extra_details: staff.extra_details || {}
    });
    setEditId(staff.id);
    setMode('edit');
  };

  // View Details
  const viewDetails = (staff: Staff) => {
    setSelectedStaff(staff);
    setMode('detail');
  };

  // Handle Form Change
  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: name === 'role' ? value as StaffRole : value
    }));
  };

  // Submit Form - Using your API
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const token = localStorage.getItem('token');

    // Prepare payload according to your API
    const payload = {
      staff_id: formData.staff_id,
      name: formData.name,
      phone: formData.phone,
      role: formData.role,
      email: formData.email || null,
      address: formData.address || null,
      extra_details: formData.extra_details
    };

    const url = mode === 'edit' 
      ? `https://senthurvidyalaya-backend.onrender.com/api/setup/staff/${formData.staff_id}/`
      : 'https://senthurvidyalaya-backend.onrender.com/api/setup/staff/';

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
        await fetchStaff();
        setMode('list');
        setFormData({ 
          staff_id: '', 
          name: '', 
          phone: '', 
          role: 'admin_staff',
          email: '', 
          address: '',
          extra_details: {}
        });
        setSuccessMessage(`Staff ${mode === 'edit' ? 'updated' : 'added'} successfully!`);
        setTimeout(() => setSuccessMessage(''), 3000);
      } else {
        const errorMsg = responseData.detail || 
                        Object.values(responseData).flat().join(', ') ||
                        'Operation failed. Please check your data.';
        alert(`Error: ${errorMsg}`);
      }
    } catch (error) {
      console.error('Error:', error);
      alert('Network error. Please check your connection.');
    } finally {
      setLoading(false);
    }
  };

  // Filter & Sort
  const filteredStaff = staffList.filter(staff =>
    (staff.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
     staff.staff_id.toLowerCase().includes(searchTerm.toLowerCase()) ||
     ROLE_DISPLAY[staff.role].toLowerCase().includes(searchTerm.toLowerCase())) &&
    (filterRole === 'all' || staff.role === filterRole)
  );

  const sortedStaff = [...filteredStaff].sort((a, b) => {
    let aValue = a[sortField];
    let bValue = b[sortField];
    
    if (sortField === 'role') {
      aValue = ROLE_DISPLAY[a.role];
      bValue = ROLE_DISPLAY[b.role];
    }
    
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

  // Stats
  const roleCounts = staffList.reduce((acc, staff) => {
    acc[staff.role] = (acc[staff.role] || 0) + 1;
    return acc;
  }, {} as Record<StaffRole, number>);

  const totalStaff = staffList.length;

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-blue-50/30 p-4 md:p-6">
      {/* Success Message */}
      {successMessage && (
        <div className="fixed top-4 right-4 z-50 animate-fade-in">
          <div className="bg-green-500 text-white px-6 py-3 rounded-xl shadow-lg flex items-center gap-2">
            <FaUserCheck />
            <span>{successMessage}</span>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="mb-8">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-gradient-to-r from-purple-500 to-purple-600 rounded-xl shadow-lg">
              <FaUsers className="text-white text-2xl" />
            </div>
            <div>
              <h1 className="text-2xl md:text-3xl font-bold text-gray-900">Non-Teaching Staff</h1>
              <p className="text-gray-600 mt-1">
                {totalStaff} staff members • {Object.keys(roleCounts).length} role categories
              </p>
            </div>
          </div>
          
          <div className="flex gap-3">
            {mode !== 'list' ? (
              <button
                onClick={() => {
                  setMode('list');
                  setFormData({
                    staff_id: '', 
                    name: '', 
                    phone: '', 
                    role: 'admin_staff',
                    email: '', 
                    address: '',
                    extra_details: {}
                  });
                }}
                className="px-4 py-2.5 border border-gray-300 bg-white rounded-xl hover:bg-gray-50 transition-all duration-200 flex items-center gap-2 text-gray-700 font-medium"
              >
                <FaChevronLeft /> Back to List
              </button>
            ) : (
              <button
                onClick={() => setMode('add')}
                className="px-4 py-2.5 bg-gradient-to-r from-purple-500 to-purple-600 text-white rounded-xl hover:from-purple-600 hover:to-purple-700 transition-all duration-200 flex items-center gap-2 font-medium shadow-lg hover:shadow-xl transform hover:-translate-y-0.5"
              >
                <FaUserPlus /> Add Staff
              </button>
            )}
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-2 md:grid-cols-6 gap-3 mb-6">
          {Object.entries(ROLE_DISPLAY).map(([role, display]) => (
            <div key={role} className="bg-white rounded-xl p-4 border border-gray-200 shadow-sm hover:shadow-md transition-shadow duration-200">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-gray-500">{display}</p>
                  <p className="text-xl font-bold text-gray-900">{roleCounts[role as StaffRole] || 0}</p>
                </div>
                <div className="p-2 bg-opacity-20 rounded-lg">
                  {ROLE_ICONS[role as StaffRole]}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* LIST VIEW */}
      {mode === 'list' && (
        <>
          {/* Search & Filter */}
          <div className="bg-white rounded-xl border border-gray-200 p-4 mb-6 shadow-sm">
            <div className="flex flex-col md:flex-row gap-4">
              <div className="flex-1">
                <div className="relative">
                  <FaSearch className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400" />
                  <input
                    type="text"
                    placeholder="Search staff by name, ID, or role..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full pl-12 pr-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-purple-500 outline-none transition-all"
                  />
                </div>
              </div>
              <div className="flex gap-3">
                <select
                  value={filterRole}
                  onChange={(e) => setFilterRole(e.target.value as StaffRole | 'all')}
                  className="px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-purple-500 outline-none"
                >
                  <option value="all">All Roles</option>
                  {Object.entries(ROLE_DISPLAY).map(([value, label]) => (
                    <option key={value} value={value}>{label}</option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* Staff Table */}
          <div className="bg-white rounded-xl border border-gray-200 overflow-hidden shadow-sm">
            {loading ? (
              <div className="p-12 text-center">
                <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600 mb-4"></div>
                <p className="text-gray-600">Loading staff...</p>
              </div>
            ) : currentStaff.length === 0 ? (
              <div className="p-12 text-center">
                <div className="inline-block p-4 bg-gray-100 rounded-full mb-4">
                  <FaUsers className="text-3xl text-gray-400" />
                </div>
                <h3 className="text-lg font-medium text-gray-900 mb-2">No staff found</h3>
                <p className="text-gray-600 mb-6">Try adjusting your search or add new staff</p>
                <button
                  onClick={() => setMode('add')}
                  className="px-4 py-2.5 bg-gradient-to-r from-purple-500 to-purple-600 text-white rounded-xl hover:from-purple-600 hover:to-purple-700 transition-all duration-200"
                >
                  Add Staff
                </button>
              </div>
            ) : (
              <>
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-6 py-4 text-left">
                          <button 
                            onClick={() => {
                              setSortField('staff_id');
                              setSortDirection(sortField === 'staff_id' && sortDirection === 'asc' ? 'desc' : 'asc');
                            }}
                            className="flex items-center gap-1 hover:text-gray-700 transition-colors text-sm font-semibold text-gray-900"
                          >
                            Staff ID
                            {sortField === 'staff_id' ? (
                              sortDirection === 'asc' ? <FaSortUp /> : <FaSortDown />
                            ) : (
                              <FaSort className="text-gray-300" />
                            )}
                          </button>
                        </th>
                        <th className="px-6 py-4 text-left">
                          <button 
                            onClick={() => {
                              setSortField('name');
                              setSortDirection(sortField === 'name' && sortDirection === 'asc' ? 'desc' : 'asc');
                            }}
                            className="flex items-center gap-1 hover:text-gray-700 transition-colors text-sm font-semibold text-gray-900"
                          >
                            Staff Details
                            {sortField === 'name' ? (
                              sortDirection === 'asc' ? <FaSortUp /> : <FaSortDown />
                            ) : (
                              <FaSort className="text-gray-300" />
                            )}
                          </button>
                        </th>
                        <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900">Contact Information</th>
                        <th className="px-6 py-4 text-left">
                          <button 
                            onClick={() => {
                              setSortField('role');
                              setSortDirection(sortField === 'role' && sortDirection === 'asc' ? 'desc' : 'asc');
                            }}
                            className="flex items-center gap-1 hover:text-gray-700 transition-colors text-sm font-semibold text-gray-900"
                          >
                            Role
                            {sortField === 'role' ? (
                              sortDirection === 'asc' ? <FaSortUp /> : <FaSortDown />
                            ) : (
                              <FaSort className="text-gray-300" />
                            )}
                          </button>
                        </th>
                        <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {currentStaff.map((staff) => (
                        <tr key={staff.id} className="hover:bg-gray-50 transition-colors duration-150">
                          <td className="px-6 py-4">
                            <div className="text-sm font-medium text-purple-600 font-mono">
                              {staff.staff_id}
                            </div>
                          </td>
                          <td className="px-6 py-4">
                            <div className="flex items-center">
                              <div className="h-10 w-10 bg-gradient-to-r from-purple-100 to-purple-50 rounded-full flex items-center justify-center mr-4 border border-purple-200">
                                <FaUserCog className="text-purple-600" />
                              </div>
                              <div>
                                <div className="font-semibold text-gray-900">{staff.name}</div>
                                <div className="text-xs text-gray-500 mt-1">
                                  {staff.user?.username || 'No login account'}
                                </div>
                              </div>
                            </div>
                          </td>
                          <td className="px-6 py-4">
                            <div className="space-y-2">
                              {staff.email && (
                                <div className="flex items-center text-sm text-gray-700">
                                  <FaEnvelope className="mr-2 text-gray-400 flex-shrink-0" />
                                  <span className="truncate">{staff.email}</span>
                                </div>
                              )}
                              <div className="flex items-center text-sm text-gray-700">
                                <FaPhone className="mr-2 text-gray-400 flex-shrink-0" />
                                <span>{staff.phone}</span>
                              </div>
                              {staff.address && staff.address !== "Not Provided" && (
                                <div className="flex items-center text-sm text-gray-700">
                                  <FaMapMarkerAlt className="mr-2 text-gray-400 flex-shrink-0" />
                                  <span className="truncate max-w-[200px]">{staff.address}</span>
                                </div>
                              )}
                            </div>
                          </td>
                          <td className="px-6 py-4">
                            <div className="flex items-center gap-2">
                              <div className={`p-1.5 rounded-lg ${ROLE_COLORS[staff.role].bg}`}>
                                {ROLE_ICONS[staff.role]}
                              </div>
                              <span className={`px-3 py-1 text-xs ${ROLE_COLORS[staff.role].bg} ${ROLE_COLORS[staff.role].text} rounded-full font-medium`}>
                                {ROLE_DISPLAY[staff.role]}
                              </span>
                            </div>
                          </td>
                          <td className="px-6 py-4">
                            <div className="flex gap-2">
                              <button
                                onClick={() => viewDetails(staff)}
                                className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors duration-200"
                                title="View Details"
                              >
                                <FaEye />
                              </button>
                              <button
                                onClick={() => startEdit(staff)}
                                className="p-2 text-green-600 hover:bg-green-50 rounded-lg transition-colors duration-200"
                                title="Edit"
                              >
                                <FaEdit />
                              </button>
                              <button
                                onClick={() => setShowResetPassword(staff.id)}
                                className="p-2 text-amber-600 hover:bg-amber-50 rounded-lg transition-colors duration-200"
                                title="Reset Password"
                              >
                                <FaKey />
                              </button>
                              <button
                                onClick={() => setShowDeleteConfirm(staff.id)}
                                className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors duration-200"
                                title="Delete"
                              >
                                <FaTrash />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Pagination */}
                {totalPages > 1 && (
                  <div className="px-6 py-4 border-t border-gray-200">
                    <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
                      <p className="text-sm text-gray-700">
                        Showing {indexOfFirstItem + 1} to {Math.min(indexOfLastItem, sortedStaff.length)} of {sortedStaff.length} staff
                      </p>
                      <div className="flex gap-2">
                        <button
                          onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                          disabled={currentPage === 1}
                          className="p-2 border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                        >
                          <FaChevronLeft />
                        </button>
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
                              className={`px-3 py-2 rounded-lg transition-colors ${
                                currentPage === pageNum
                                  ? 'bg-purple-600 text-white'
                                  : 'border border-gray-300 hover:bg-gray-50'
                              }`}
                            >
                              {pageNum}
                            </button>
                          );
                        })}
                        <button
                          onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                          disabled={currentPage === totalPages}
                          className="p-2 border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                        >
                          <FaChevronRight />
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        </>
      )}

      {/* ADD/EDIT FORM */}
      {(mode === 'add' || mode === 'edit') && (
        <div className="animate-fade-in max-w-4xl mx-auto">
          <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
            <div className="mb-6">
              <div className="flex items-center gap-3 mb-2">
                <div className="p-2 bg-gradient-to-r from-purple-500 to-purple-600 rounded-lg">
                  <FaUsers className="text-white" />
                </div>
                <h2 className="text-xl font-bold text-gray-900">
                  {mode === 'edit' ? 'Edit Staff' : 'Add New Staff'}
                </h2>
              </div>
              <p className="text-gray-600">
                {mode === 'edit' ? 'Update staff information' : 'Fill in the details to register new staff. Login credentials will be automatically generated.'}
              </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Staff ID */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Staff ID *
                  </label>
                  <input
                    type="text"
                    name="staff_id"
                    value={formData.staff_id}
                    onChange={handleChange}
                    required
                    disabled={mode === 'edit'}
                    className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-purple-500 outline-none transition-all disabled:bg-gray-50 font-mono"
                    placeholder="NT001"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Used as username for login (auto-generated credentials)
                  </p>
                </div>

                {/* Staff Name */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Full Name *
                  </label>
                  <input
                    type="text"
                    name="name"
                    value={formData.name}
                    onChange={handleChange}
                    required
                    className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-purple-500 outline-none transition-all"
                    placeholder="John Smith"
                  />
                </div>

                {/* Role */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Role Category *
                  </label>
                  <select
                    name="role"
                    value={formData.role}
                    onChange={handleChange}
                    required
                    className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-purple-500 outline-none transition-all"
                  >
                    {Object.entries(ROLE_DISPLAY).map(([value, label]) => (
                      <option key={value} value={value}>{label}</option>
                    ))}
                  </select>
                </div>

                {/* Phone */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Phone Number *
                  </label>
                  <input
                    type="tel"
                    name="phone"
                    value={formData.phone}
                    onChange={handleChange}
                    required
                    className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-purple-500 outline-none transition-all"
                    placeholder="+91 9876543210"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Used as default password for initial login
                  </p>
                </div>

                {/* Email */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Email Address
                  </label>
                  <input
                    type="email"
                    name="email"
                    value={formData.email}
                    onChange={handleChange}
                    className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-purple-500 outline-none transition-all"
                    placeholder="staff@school.edu"
                  />
                </div>

                {/* Address */}
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Address
                  </label>
                  <input
                    type="text"
                    name="address"
                    value={formData.address}
                    onChange={handleChange}
                    className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-purple-500 outline-none transition-all"
                    placeholder="Full residential address"
                  />
                </div>
              </div>

              {/* FORM ACTIONS */}
              <div className="flex gap-3 pt-6 border-t border-gray-200">
                <button
                  type="button"
                  onClick={() => {
                    setMode('list');
                    setFormData({
                      staff_id: '', 
                      name: '', 
                      phone: '', 
                      role: 'admin_staff',
                      email: '', 
                      address: '',
                      extra_details: {}
                    });
                  }}
                  className="px-6 py-3 border border-gray-300 rounded-xl hover:bg-gray-50 transition-colors duration-200 font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="px-6 py-3 bg-gradient-to-r from-purple-500 to-purple-600 text-white rounded-xl hover:from-purple-600 hover:to-purple-700 transition-all duration-200 font-medium flex items-center gap-2 disabled:opacity-50"
                >
                  {loading ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                      {mode === 'edit' ? 'Updating...' : 'Creating...'}
                    </>
                  ) : (
                    <>
                      <FaSave />
                      {mode === 'edit' ? 'Update Staff' : 'Create Staff'}
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* DETAIL VIEW */}
      {mode === 'detail' && selectedStaff && (
        <div className="animate-fade-in max-w-4xl mx-auto">
          <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
            <div className="mb-6">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="p-3 bg-gradient-to-r from-purple-500 to-purple-600 rounded-xl">
                    {ROLE_ICONS[selectedStaff.role]}
                  </div>
                  <div>
                    <h2 className="text-xl font-bold text-gray-900">{selectedStaff.name}</h2>
                    <p className="text-gray-600">{selectedStaff.staff_id}</p>
                  </div>
                </div>
                <div className={`px-4 py-2 ${ROLE_COLORS[selectedStaff.role].bg} ${ROLE_COLORS[selectedStaff.role].text} rounded-full font-medium`}>
                  {ROLE_DISPLAY[selectedStaff.role]}
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Personal Information */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold text-gray-900 border-b pb-2">Personal Information</h3>
                <div className="space-y-3">
                  <div>
                    <p className="text-sm text-gray-500">Full Name</p>
                    <p className="font-medium">{selectedStaff.name}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Staff ID</p>
                    <p className="font-medium font-mono">{selectedStaff.staff_id}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Role Category</p>
                    <div className="flex items-center gap-2 mt-1">
                      <div className={`p-1.5 rounded-lg ${ROLE_COLORS[selectedStaff.role].bg}`}>
                        {ROLE_ICONS[selectedStaff.role]}
                      </div>
                      <p className="font-medium">{ROLE_DISPLAY[selectedStaff.role]}</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Contact Information */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold text-gray-900 border-b pb-2">Contact Information</h3>
                <div className="space-y-3">
                  <div className="flex items-center gap-3">
                    <FaPhone className="text-gray-400" />
                    <div>
                      <p className="text-sm text-gray-500">Phone</p>
                      <p className="font-medium">{selectedStaff.phone}</p>
                    </div>
                  </div>
                  {selectedStaff.email && (
                    <div className="flex items-center gap-3">
                      <FaEnvelope className="text-gray-400" />
                      <div>
                        <p className="text-sm text-gray-500">Email</p>
                        <p className="font-medium">{selectedStaff.email}</p>
                      </div>
                    </div>
                  )}
                  {selectedStaff.address && selectedStaff.address !== "Not Provided" && (
                    <div className="flex items-start gap-3">
                      <FaMapMarkerAlt className="text-gray-400 mt-1" />
                      <div>
                        <p className="text-sm text-gray-500">Address</p>
                        <p className="font-medium">{selectedStaff.address}</p>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Login Information */}
              <div className="md:col-span-2 space-y-4">
                <h3 className="text-lg font-semibold text-gray-900 border-b pb-2">Login Information</h3>
                <div className="bg-gray-50 rounded-xl p-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm text-gray-500">Username</p>
                      <p className="font-medium font-mono">{selectedStaff.staff_id}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-500">Status</p>
                      <p className="font-medium text-green-600">
                        {selectedStaff.user ? 'Active Account' : 'No Login Account'}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="flex gap-3 pt-6 border-t border-gray-200">
              <button
                onClick={() => setMode('list')}
                className="px-6 py-3 border border-gray-300 rounded-xl hover:bg-gray-50 transition-colors duration-200 font-medium"
              >
                Back to List
              </button>
              <button
                onClick={() => startEdit(selectedStaff)}
                className="px-6 py-3 bg-gradient-to-r from-green-500 to-green-600 text-white rounded-xl hover:from-green-600 hover:to-green-700 transition-all duration-200 font-medium"
              >
                Edit Profile
              </button>
              <button
                onClick={() => setShowResetPassword(selectedStaff.id)}
                className="px-6 py-3 bg-gradient-to-r from-amber-500 to-amber-600 text-white rounded-xl hover:from-amber-600 hover:to-amber-700 transition-all duration-200 font-medium flex items-center gap-2"
              >
                <FaKey /> Reset Password
              </button>
            </div>
          </div>
        </div>
      )}

      {/* DELETE CONFIRMATION MODAL */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50 animate-fade-in">
          <div className="bg-white rounded-xl p-6 max-w-md w-full shadow-xl transform transition-all">
            <div className="text-center">
              <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-red-100 mb-4">
                <FaTrash className="h-6 w-6 text-red-600" />
              </div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">Delete Staff</h3>
              <p className="text-gray-600 mb-6">
                Are you sure you want to delete this staff member? This will also remove their login account.
              </p>
              <div className="flex gap-3">
                <button
                  onClick={() => setShowDeleteConfirm(null)}
                  className="flex-1 px-4 py-2 border border-gray-300 rounded-xl hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={() => deleteStaff(showDeleteConfirm)}
                  className="flex-1 px-4 py-2 bg-red-600 text-white rounded-xl hover:bg-red-700 transition-colors"
                >
                  Delete
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* RESET PASSWORD MODAL */}
      {showResetPassword && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50 animate-fade-in">
          <div className="bg-white rounded-xl p-6 max-w-md w-full shadow-xl transform transition-all">
            <div className="text-center">
              <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-amber-100 mb-4">
                <FaKey className="h-6 w-6 text-amber-600" />
              </div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">Reset Password</h3>
              <p className="text-gray-600 mb-6">
                This will reset the staff member's password to their phone number. Are you sure?
              </p>
              <div className="flex gap-3">
                <button
                  onClick={() => setShowResetPassword(null)}
                  className="flex-1 px-4 py-2 border border-gray-300 rounded-xl hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={() => resetPassword(showResetPassword)}
                  className="flex-1 px-4 py-2 bg-amber-600 text-white rounded-xl hover:bg-amber-700 transition-colors"
                >
                  Reset Password
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Add CSS animations */}
      <style jsx global>{`
        @keyframes fade-in {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .animate-fade-in {
          animation: fade-in 0.3s ease-out;
        }
      `}</style>
    </div>
  );
};