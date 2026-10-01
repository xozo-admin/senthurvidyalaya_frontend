// components/dashboard/fees/ConcessionManagement.tsx
'use client';

import { useState, useEffect } from 'react';
import { FaSearch, FaUserGraduate, FaPercent, FaMoneyBill, FaPlus, FaEdit, FaTrash } from 'react-icons/fa';
import { toast } from 'react-toastify';

interface ConcessionRecord {
  fee_type: string;
  status: string;
  original_total: number;
  concession_applied: number;
  new_due: number;
  reason?: string;
}

interface Student {
  student_id: string;
  student_name: string;
  class?: string;
  section?: string;
}

interface ConcessionManagementProps {
  academicYear: string;
}

export default function ConcessionManagement({ academicYear }: ConcessionManagementProps) {
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);
  const [students, setStudents] = useState<Student[]>([]);
  const [concessionHistory, setConcessionHistory] = useState<ConcessionRecord[]>([]);
  const [studentSearchResults, setStudentSearchResults] = useState<Student[]>([]);

  const [concessionForm, setConcessionForm] = useState({
    student_id: '',
    fee_type: 'Tuition',
    discount_amount: '',
    reason: '',
  });

  useEffect(() => {
    // Fetch students for dropdown
    fetchStudents();
  }, []);

  const fetchStudents = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch('https://senthurvidyalaya-backend.onrender.com/api/students/list/', {
        headers: {
          'Authorization': `Token ${token}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        setStudents(data.students || data || []);
      }
    } catch (error) {
      console.error('Error fetching students:', error);
    } finally {
      setLoading(false);
    }
  };

  const searchStudents = async () => {
    if (!searchTerm.trim()) {
      setStudentSearchResults([]);
      return;
    }

    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`https://senthurvidyalaya-backend.onrender.com/api/students/details/?student_id=${searchTerm}`, {
        headers: {
          'Authorization': `Token ${token}`,
        },
      });

      if (response.ok) {
        const student = await response.json();
        if (student) {
          setStudentSearchResults([{
            student_id: student.student_id,
            student_name: student.student_name,
            class: student.class_name,
            section: student.section
          }]);
        }
      }
    } catch (error) {
      console.error('Error searching student:', error);
    }
  };

  const handleApplyConcession = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!selectedStudent) {
      toast.error('Please select a student first');
      return;
    }

    try {
      const token = localStorage.getItem('token');
      const payload = {
        student_id: concessionForm.student_id,
        academic_year: academicYear,
        discounts: [{
          fee_type: concessionForm.fee_type,
          discount_amount: parseFloat(concessionForm.discount_amount)
        }]
      };

      const response = await fetch('https://senthurvidyalaya-backend.onrender.com/api/fees/concession/', {
        method: 'POST',
        headers: {
          'Authorization': `Token ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      if (response.ok) {
        const data = await response.json();
        toast.success('Concession applied successfully!');
        setConcessionHistory(data.report || []);
        setShowModal(false);
        setConcessionForm({
          student_id: '',
          fee_type: 'Tuition',
          discount_amount: '',
          reason: '',
        });
        setSelectedStudent(null);
      } else {
        const error = await response.json();
        toast.error(error.error || 'Failed to apply concession');
      }
    } catch (error) {
      toast.error('Network error occurred');
    }
  };

  const handleSelectStudent = (student: Student) => {
    setSelectedStudent(student);
    setConcessionForm(prev => ({
      ...prev,
      student_id: student.student_id
    }));
    setStudentSearchResults([]);
    setSearchTerm('');
  };

  const feeTypes = ['Tuition', 'Transport', 'Hostel', 'Library', 'Sports', 'Exam'];

  return (
    <div>
      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <div>
          <h2 className="text-2xl font-bold text-gray-800">Concession Management</h2>
          <p className="text-gray-600">Apply and manage fee concessions</p>
        </div>
        
        <button
          onClick={() => setShowModal(true)}
          className="flex items-center space-x-2 bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-lg transition-colors"
        >
          <FaPlus />
          <span>Apply Concession</span>
        </button>
      </div>

      {/* Search Section */}
      <div className="bg-white rounded-lg shadow-sm p-4 mb-6">
        <div className="relative">
          <FaSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="Search Student by ID or Name..."
            value={searchTerm}
            onChange={(e) => {
              setSearchTerm(e.target.value);
              if (e.target.value.trim()) {
                searchStudents();
              } else {
                setStudentSearchResults([]);
              }
            }}
            className="pl-10 pr-4 py-2 w-full border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          />
          
          {studentSearchResults.length > 0 && (
            <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg max-h-60 overflow-y-auto">
              {studentSearchResults.map((student) => (
                <div
                  key={student.student_id}
                  onClick={() => handleSelectStudent(student)}
                  className="p-3 hover:bg-gray-100 cursor-pointer border-b last:border-b-0"
                >
                  <div className="font-medium">{student.student_name}</div>
                  <div className="text-sm text-gray-600">ID: {student.student_id}</div>
                  {student.class && (
                    <div className="text-xs text-gray-500">
                      Class: {student.class} {student.section ? `- ${student.section}` : ''}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Selected Student Info */}
      {selectedStudent && (
        <div className="bg-gradient-to-r from-purple-500 to-purple-600 rounded-xl p-6 mb-6 text-white">
          <div className="flex justify-between items-center">
            <div>
              <h3 className="text-xl font-bold">{selectedStudent.student_name}</h3>
              <p className="text-purple-100">ID: {selectedStudent.student_id}</p>
              {selectedStudent.class && (
                <p className="text-purple-100">
                  Class: {selectedStudent.class} {selectedStudent.section ? `- Section ${selectedStudent.section}` : ''}
                </p>
              )}
            </div>
            <div className="text-right">
              <p className="text-2xl font-bold">Ready for Concession</p>
              <p className="text-purple-100">Select fee type and amount below</p>
            </div>
          </div>
        </div>
      )}

      {/* Concession History */}
      {concessionHistory.length > 0 && (
        <div className="bg-white rounded-xl shadow-lg p-6 mb-6">
          <h3 className="text-lg font-semibold mb-4">Recent Concession History</h3>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Fee Type
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Original Amount
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Concession Applied
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    New Due Amount
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {concessionHistory.map((concession, index) => (
                  <tr key={index} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="font-medium">{concession.fee_type}</span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="text-gray-800">₹{concession.original_total.toLocaleString()}</span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="text-purple-600 font-bold">-₹{concession.concession_applied.toLocaleString()}</span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="text-green-600 font-bold">
                        ₹{concession.new_due.toLocaleString()}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                        concession.status === 'Success' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                      }`}>
                        {concession.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Instructions */}
      {!selectedStudent && concessionHistory.length === 0 && (
        <div className="bg-white rounded-xl shadow-lg p-8 text-center">
          <div className="w-20 h-20 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <FaUserGraduate className="text-purple-600 text-3xl" />
          </div>
          <h3 className="text-xl font-semibold mb-2">No Student Selected</h3>
          <p className="text-gray-600 mb-4">
            Search for a student by ID or name to apply concession
          </p>
          <p className="text-sm text-gray-500">
            Enter student ID in the search box above and select from the results
          </p>
        </div>
      )}

      {/* Apply Concession Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg">
            <div className="p-6">
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-2xl font-bold text-gray-800">Apply Fee Concession</h3>
                <button
                  onClick={() => setShowModal(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  ✕
                </button>
              </div>

              <form onSubmit={handleApplyConcession}>
                <div className="space-y-4">
                  {selectedStudent ? (
                    <div className="bg-gray-50 p-4 rounded-lg">
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <p className="text-sm text-gray-600">Student Name</p>
                          <p className="font-medium">{selectedStudent.student_name}</p>
                        </div>
                        <div>
                          <p className="text-sm text-gray-600">Student ID</p>
                          <p className="font-medium">{selectedStudent.student_id}</p>
                        </div>
                        {selectedStudent.class && (
                          <>
                            <div>
                              <p className="text-sm text-gray-600">Class</p>
                              <p className="font-medium">Class {selectedStudent.class}</p>
                            </div>
                            <div>
                              <p className="text-sm text-gray-600">Section</p>
                              <p className="font-medium">{selectedStudent.section || 'N/A'}</p>
                            </div>
                          </>
                        )}
                      </div>
                    </div>
                  ) : (
                    <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                      <p className="text-yellow-800 text-sm">
                        Please select a student first by searching in the main screen
                      </p>
                    </div>
                  )}

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Fee Type
                    </label>
                    <select
                      value={concessionForm.fee_type}
                      onChange={(e) => setConcessionForm({ ...concessionForm, fee_type: e.target.value })}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      required
                    >
                      {feeTypes.map((type) => (
                        <option key={type} value={type}>{type} Fee</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Concession Amount (₹)
                    </label>
                    <input
                      type="number"
                      value={concessionForm.discount_amount}
                      onChange={(e) => setConcessionForm({ ...concessionForm, discount_amount: e.target.value })}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      placeholder="Enter concession amount"
                      required
                      min="0"
                      step="0.01"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Reason for Concession
                    </label>
                    <textarea
                      value={concessionForm.reason}
                      onChange={(e) => setConcessionForm({ ...concessionForm, reason: e.target.value })}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      placeholder="Enter reason (e.g., Scholarship, Financial Need, etc.)"
                      rows={3}
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
                    disabled={!selectedStudent}
                    className={`px-6 py-2 rounded-lg transition-colors ${
                      selectedStudent 
                        ? 'bg-purple-600 hover:bg-purple-700 text-white' 
                        : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                    }`}
                  >
                    Apply Concession
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