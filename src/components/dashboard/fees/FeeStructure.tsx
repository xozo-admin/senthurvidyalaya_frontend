// components/dashboard/fees/FeeStructure.tsx
'use client';

import { useState, useEffect } from 'react';
import { FaPlus, FaEdit, FaTrash, FaEye, FaSearch, FaCalendarAlt } from 'react-icons/fa';
import { toast } from 'react-toastify';

interface FeeStructure {
  id: number;
  class: string;
  fee_type: string;
  amount: number;
  due_date: string;
  academic_year?: string;
}

interface FeeStructureProps {
  academicYear: string;
}

export default function FeeStructure({ academicYear }: FeeStructureProps) {
  const [feeStructures, setFeeStructures] = useState<FeeStructure[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingFee, setEditingFee] = useState<FeeStructure | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedFeeType, setSelectedFeeType] = useState('');
  const [feeTypes, setFeeTypes] = useState<string[]>([]);
  const [classes, setClasses] = useState<string[]>([]);

  const [formData, setFormData] = useState({
    class_name: '',
    fee_type: '',
    amount: '',
    due_date: '',
  });

  useEffect(() => {
    fetchFeeStructure();
    fetchClasses();
    extractFeeTypes();
  }, [academicYear, selectedFeeType]);

  const fetchFeeStructure = async () => {
    try {
      const token = localStorage.getItem('token');
      const url = selectedFeeType 
        ? `https://senthurvidyalaya-backend.onrender.com/api/fees/structure/view/?academic_year=${academicYear}&fee_type=${selectedFeeType}`
        : `https://senthurvidyalaya-backend.onrender.com/api/fees/structure/view/?academic_year=${academicYear}&fee_type=Tuition`; // Default to Tuition

      const response = await fetch(url, {
        headers: {
          'Authorization': `Token ${token}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        setFeeStructures(data.structure || []);
      } else {
        toast.error('Failed to fetch fee structure');
      }
    } catch (error) {
      toast.error('Network error occurred');
    } finally {
      setLoading(false);
    }
  };

  const fetchClasses = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch('https://senthurvidyalaya-backend.onrender.com/api/academics/standards/', {
        headers: {
          'Authorization': `Token ${token}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        const classNames = data.map((cls: any) => cls.name);
        classNames.sort((a: string, b: string) => {
          // Sort numeric classes first, then non-numeric
          const aNum = parseInt(a);
          const bNum = parseInt(b);
          if (!isNaN(aNum) && !isNaN(bNum)) return aNum - bNum;
          if (!isNaN(aNum)) return -1;
          if (!isNaN(bNum)) return 1;
          return a.localeCompare(b);
        });
        setClasses(classNames);
      }
    } catch (error) {
      console.error('Error fetching classes:', error);
    }
  };

  const extractFeeTypes = () => {
    // Extract unique fee types from existing structures
    const types = new Set<string>();
    feeStructures.forEach(fee => types.add(fee.fee_type));
    const allTypes = ['Tuition', 'Transport', 'Hostel', 'Library', 'Sports', 'Lab', 'Exam'];
    allTypes.forEach(type => types.add(type));
    setFeeTypes(Array.from(types));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      const token = localStorage.getItem('token');
      const url = editingFee 
        ? 'https://senthurvidyalaya-backend.onrender.com/api/fees/structure/update/'
        : 'https://senthurvidyalaya-backend.onrender.com/api/fees/assign/';
      
      const payload = editingFee
        ? {
            fee_id: editingFee.id,
            class_name: formData.class_name,
            fee_type: formData.fee_type,
            new_amount: parseFloat(formData.amount),
            academic_year: academicYear
          }
        : {
            academic_year: academicYear,
            class_name: formData.class_name,
            fee_type: formData.fee_type,
            amount: parseFloat(formData.amount),
            due_date: formData.due_date
          };

      const response = await fetch(url, {
        method: editingFee ? 'PUT' : 'POST',
        headers: {
          'Authorization': `Token ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      if (response.ok) {
        toast.success(editingFee ? 'Fee structure updated!' : 'Fee structure created!');
        setShowModal(false);
        setFormData({ class_name: '', fee_type: '', amount: '', due_date: '' });
        setEditingFee(null);
        fetchFeeStructure();
      } else {
        const error = await response.json();
        toast.error(error.error || 'Operation failed');
      }
    } catch (error) {
      toast.error('Network error occurred');
    }
  };

  const handleEdit = (fee: FeeStructure) => {
    setEditingFee(fee);
    setFormData({
      class_name: fee.class,
      fee_type: fee.fee_type,
      amount: fee.amount.toString(),
      due_date: fee.due_date,
    });
    setShowModal(true);
  };

  const handleDelete = async (feeId: number) => {
    if (!confirm('Are you sure you want to delete this fee structure?')) return;

    try {
      const token = localStorage.getItem('token');
      const response = await fetch('https://senthurvidyalaya-backend.onrender.com/api/fees/delete/', {
        method: 'DELETE',
        headers: {
          'Authorization': `Token ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ fee_id: feeId }),
      });

      if (response.ok) {
        toast.success('Fee structure deleted!');
        fetchFeeStructure();
      } else {
        const error = await response.json();
        toast.error(error.error || 'Deletion failed');
      }
    } catch (error) {
      toast.error('Network error occurred');
    }
  };

  const filteredFees = feeStructures.filter(fee =>
    fee.class.toLowerCase().includes(searchTerm.toLowerCase()) ||
    fee.fee_type.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div>
      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <div>
          <h2 className="text-2xl font-bold text-gray-800">Fee Structure</h2>
          <p className="text-gray-600">Manage fee definitions for all classes</p>
        </div>
        
        <div className="flex items-center space-x-4">
          <div className="relative">
            <FaSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Search by class or fee type..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>

          <select
            value={selectedFeeType}
            onChange={(e) => setSelectedFeeType(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          >
            <option value="">All Fee Types</option>
            {feeTypes.map((type) => (
              <option key={type} value={type}>{type}</option>
            ))}
          </select>
          
          <button
            onClick={() => {
              setEditingFee(null);
              setFormData({ class_name: '', fee_type: '', amount: '', due_date: '' });
              setShowModal(true);
            }}
            className="flex items-center space-x-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg transition-colors"
          >
            <FaPlus />
            <span>Add Fee Structure</span>
          </button>
        </div>
      </div>

      {/* Fee Structure Table */}
      <div className="overflow-x-auto rounded-lg border border-gray-200">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Class
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Fee Type
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Amount (₹)
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Due Date
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Academic Year
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {loading ? (
              <tr>
                <td colSpan={6} className="px-6 py-8 text-center">
                  <div className="flex justify-center">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                  </div>
                </td>
              </tr>
            ) : filteredFees.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-6 py-8 text-center text-gray-500">
                  No fee structures found. Create your first one!
                </td>
              </tr>
            ) : (
              filteredFees.map((fee) => (
                <tr key={fee.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-blue-100 text-blue-800">
                      Class {fee.class}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <div className="w-3 h-3 rounded-full bg-green-500 mr-2"></div>
                      <span className="font-medium">{fee.fee_type}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className="font-bold text-gray-800">₹{fee.amount.toLocaleString()}</span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <FaCalendarAlt className="text-gray-400 mr-2" />
                      <span>{new Date(fee.due_date).toLocaleDateString('en-IN')}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className="px-3 py-1 rounded-full text-sm bg-gray-100 text-gray-800">
                      {fee.academic_year || academicYear}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                    <div className="flex space-x-2">
                      <button
                        onClick={() => handleEdit(fee)}
                        className="text-blue-600 hover:text-blue-900 p-2 rounded-lg hover:bg-blue-50"
                        title="Edit"
                      >
                        <FaEdit />
                      </button>
                      <button
                        onClick={() => handleDelete(fee.id)}
                        className="text-red-600 hover:text-red-900 p-2 rounded-lg hover:bg-red-50"
                        title="Delete"
                      >
                        <FaTrash />
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Add/Edit Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-md">
            <div className="p-6">
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-2xl font-bold text-gray-800">
                  {editingFee ? 'Edit Fee Structure' : 'Add Fee Structure'}
                </h3>
                <button
                  onClick={() => setShowModal(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  ✕
                </button>
              </div>

              <form onSubmit={handleSubmit}>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Class
                    </label>
                    <select
                      value={formData.class_name}
                      onChange={(e) => setFormData({ ...formData, class_name: e.target.value })}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      required
                    >
                      <option value="">Select Class</option>
                      {classes.map((cls) => (
                        <option key={cls} value={cls}>
                          Class {cls}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Fee Type
                    </label>
                    <select
                      value={formData.fee_type}
                      onChange={(e) => setFormData({ ...formData, fee_type: e.target.value })}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      required
                    >
                      <option value="">Select Fee Type</option>
                      {feeTypes.map((type) => (
                        <option key={type} value={type}>
                          {type} Fee
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Amount (₹)
                    </label>
                    <input
                      type="number"
                      value={formData.amount}
                      onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      placeholder="Enter amount"
                      required
                      min="0"
                      step="0.01"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Due Date
                    </label>
                    <input
                      type="date"
                      value={formData.due_date}
                      onChange={(e) => setFormData({ ...formData, due_date: e.target.value })}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      required
                    />
                  </div>
                </div>

                <div className="flex justify-end space-x-3 mt-8">
                  <button
                    type="button"
                    onClick={() => setShowModal(false)}
                    className="px-6 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
                  >
                    {editingFee ? 'Update Fee' : 'Create Fee'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}