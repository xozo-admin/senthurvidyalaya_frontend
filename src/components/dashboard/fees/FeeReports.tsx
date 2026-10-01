// components/dashboard/fees/FeeReports.tsx
'use client';

import { useState, useEffect } from 'react';
import { FaDownload, FaPrint, FaChartBar, FaFileExcel, FaFilePdf, FaFilter, FaUsers, FaMoneyBill } from 'react-icons/fa';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { toast } from 'react-toastify';

interface ClassFeeReport {
  student_id: string;
  student_name: string;
  paid_amount: number;
  due_amount: number;
  status: string;
  installments_count: number;
}

interface SchoolDueReport {
  class: string;
  total_due_students: number;
  students: Array<{
    student_id: string;
    student_name: string;
    section: string;
    due_amount: number;
    installments_paid: number;
    status: string;
  }>;
}

interface FeeReportsProps {
  academicYear: string;
}

export default function FeeReports({ academicYear }: FeeReportsProps) {
  const [reportType, setReportType] = useState('class-wise');
  const [selectedFeeType, setSelectedFeeType] = useState('Tuition');
  const [selectedClass, setSelectedClass] = useState('');
  const [selectedSection, setSelectedSection] = useState('');
  const [classReport, setClassReport] = useState<ClassFeeReport[]>([]);
  const [schoolDueReport, setSchoolDueReport] = useState<SchoolDueReport[]>([]);
  const [loading, setLoading] = useState(true);
  const [classes, setClasses] = useState<string[]>([]);
  const [sections, setSections] = useState<string[]>(['A', 'B', 'C', 'D']);
  const [feeTypes, setFeeTypes] = useState<string[]>(['Tuition', 'Transport', 'Hostel', 'Library']);

  useEffect(() => {
    fetchClasses();
    if (reportType === 'class-wise') {
      fetchClassFeeReport();
    } else {
      fetchSchoolDueReport();
    }
  }, [academicYear, selectedFeeType, reportType, selectedClass, selectedSection]);

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
        setClasses(classNames);
        if (classNames.length > 0 && !selectedClass) {
          setSelectedClass(classNames[0]);
        }
      }
    } catch (error) {
      console.error('Error fetching classes:', error);
    }
  };

  const fetchClassFeeReport = async () => {
    if (!selectedClass || !selectedSection) return;
    
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      const response = await fetch(
        `https://senthurvidyalaya-backend.onrender.com/api/fees/report/class/?class=${selectedClass}&section=${selectedSection}&fee_type=${selectedFeeType}`,
        {
          headers: {
            'Authorization': `Token ${token}`,
          },
        }
      );

      if (response.ok) {
        const data = await response.json();
        setClassReport(data.students || []);
      } else {
        toast.error('Failed to fetch class fee report');
      }
    } catch (error) {
      toast.error('Network error occurred');
    } finally {
      setLoading(false);
    }
  };

  const fetchSchoolDueReport = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      const response = await fetch(
        `https://senthurvidyalaya-backend.onrender.com/api/fees/report/due-school/?academic_year=${academicYear}&fee_type=${selectedFeeType}`,
        {
          headers: {
            'Authorization': `Token ${token}`,
          },
        }
      );

      if (response.ok) {
        const data = await response.json();
        setSchoolDueReport(data.dues_by_class || []);
      } else {
        toast.error('Failed to fetch school due report');
      }
    } catch (error) {
      toast.error('Network error occurred');
    } finally {
      setLoading(false);
    }
  };

  const handleExport = (format: string) => {
    toast.info(`Exporting ${format} report...`);
    // In real implementation, generate and download file
  };

  const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8'];

  // Prepare chart data for class report
  const classChartData = [
    {
      status: 'Paid',
      count: classReport.filter(s => s.status === 'PAID').length,
      amount: classReport.filter(s => s.status === 'PAID').reduce((sum, s) => sum + s.paid_amount, 0)
    },
    {
      status: 'Partial',
      count: classReport.filter(s => s.status === 'PARTIAL').length,
      amount: classReport.filter(s => s.status === 'PARTIAL').reduce((sum, s) => sum + s.paid_amount, 0)
    },
    {
      status: 'Unpaid',
      count: classReport.filter(s => s.status === 'UNPAID').length,
      amount: 0
    }
  ];

  // Prepare chart data for school due report
  const schoolChartData = schoolDueReport.map(item => ({
    name: `Class ${item.class}`,
    due_students: item.total_due_students,
    total_due: item.students.reduce((sum, s) => sum + s.due_amount, 0)
  }));

  const totalDueStudents = schoolDueReport.reduce((sum, item) => sum + item.total_due_students, 0);
  const totalDueAmount = schoolDueReport.reduce((sum, item) => 
    sum + item.students.reduce((sSum, s) => sSum + s.due_amount, 0), 0
  );

  return (
    <div>
      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <div>
          <h2 className="text-2xl font-bold text-gray-800">Fee Reports</h2>
          <p className="text-gray-600">Detailed fee collection reports and analysis</p>
        </div>
        
        <div className="flex items-center space-x-4">
          <select
            value={reportType}
            onChange={(e) => setReportType(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          >
            <option value="class-wise">Class-wise Report</option>
            <option value="school-due">School Due Report</option>
          </select>

          <select
            value={selectedFeeType}
            onChange={(e) => setSelectedFeeType(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          >
            {feeTypes.map((type) => (
              <option key={type} value={type}>{type} Fee</option>
            ))}
          </select>

          {reportType === 'class-wise' && (
            <>
              <select
                value={selectedClass}
                onChange={(e) => setSelectedClass(e.target.value)}
                className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                {classes.map((cls) => (
                  <option key={cls} value={cls}>Class {cls}</option>
                ))}
              </select>

              <select
                value={selectedSection}
                onChange={(e) => setSelectedSection(e.target.value)}
                className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="">Select Section</option>
                {sections.map((sec) => (
                  <option key={sec} value={sec}>Section {sec}</option>
                ))}
              </select>
            </>
          )}

          <div className="flex space-x-2">
            <button
              onClick={() => handleExport('pdf')}
              className="flex items-center space-x-2 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors"
            >
              <FaFilePdf />
              <span>PDF</span>
            </button>
            <button
              onClick={() => handleExport('excel')}
              className="flex items-center space-x-2 px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors"
            >
              <FaFileExcel />
              <span>Excel</span>
            </button>
          </div>
        </div>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        <div className="bg-white rounded-xl shadow-lg p-6">
          <h3 className="text-lg font-semibold mb-4">
            {reportType === 'class-wise' ? 'Class Payment Status' : 'School-wide Due Distribution'}
          </h3>
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={reportType === 'class-wise' ? classChartData : schoolChartData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey={reportType === 'class-wise' ? 'status' : 'name'} />
                <YAxis />
                <Tooltip formatter={(value) => [value.toLocaleString(), reportType === 'class-wise' ? 'Count' : 'Amount']} />
                <Legend />
                <Bar 
                  dataKey={reportType === 'class-wise' ? 'count' : 'due_students'} 
                  fill="#8884d8" 
                  name={reportType === 'class-wise' ? 'Student Count' : 'Due Students'} 
                />
                {reportType === 'class-wise' && (
                  <Bar dataKey="amount" fill="#82ca9d" name="Amount Collected (₹)" />
                )}
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-lg p-6">
          <h3 className="text-lg font-semibold mb-4">Status Distribution</h3>
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={reportType === 'class-wise' ? classChartData : schoolChartData.slice(0, 5)}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={(entry) => `${entry.name || entry.status}: ${entry.due_students || entry.count}`}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey={reportType === 'class-wise' ? 'count' : 'due_students'}
                >
                  {COLORS.map((color, index) => (
                    <Cell key={`cell-${index}`} fill={color} />
                  ))}
                </Pie>
                <Tooltip formatter={(value) => [value.toLocaleString(), 'Count']} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Reports Table */}
      <div className="bg-white rounded-xl shadow-lg p-6">
        <div className="overflow-x-auto">
          {reportType === 'class-wise' ? (
            <>
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-semibold">
                  Class {selectedClass} - Section {selectedSection} - {selectedFeeType} Fee Report
                </h3>
                <div className="flex items-center space-x-4">
                  <div className="flex items-center space-x-2">
                    <FaUsers className="text-gray-400" />
                    <span className="text-sm">Total Students: {classReport.length}</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <FaMoneyBill className="text-green-400" />
                    <span className="text-sm">
                      Total Collected: ₹{classReport.reduce((sum, s) => sum + s.paid_amount, 0).toLocaleString()}
                    </span>
                  </div>
                </div>
              </div>
              
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Student ID
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Student Name
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Paid Amount (₹)
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Due Amount (₹)
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Installments
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Status
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
                  ) : classReport.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="px-6 py-8 text-center text-gray-500">
                        No student records found
                      </td>
                    </tr>
                  ) : (
                    classReport.map((student) => (
                      <tr key={student.student_id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className="font-medium">{student.student_id}</span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className="font-medium">{student.student_name}</span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className="font-bold text-green-600">₹{student.paid_amount.toLocaleString()}</span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className="font-bold text-red-600">₹{student.due_amount.toLocaleString()}</span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className="px-3 py-1 rounded-full text-sm bg-blue-100 text-blue-800">
                            {student.installments_count} payments
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                            student.status === 'PAID' ? 'bg-green-100 text-green-800' :
                            student.status === 'PARTIAL' ? 'bg-yellow-100 text-yellow-800' :
                            'bg-red-100 text-red-800'
                          }`}>
                            {student.status}
                          </span>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </>
          ) : (
            <>
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-semibold">
                  School-wide Due Report - {selectedFeeType} Fee - {academicYear}
                </h3>
                <div className="flex items-center space-x-4">
                  <div className="flex items-center space-x-2">
                    <FaUsers className="text-gray-400" />
                    <span className="text-sm">Total Due Students: {totalDueStudents}</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <FaMoneyBill className="text-red-400" />
                    <span className="text-sm">
                      Total Due Amount: ₹{totalDueAmount.toLocaleString()}
                    </span>
                  </div>
                </div>
              </div>
              
              {schoolDueReport.map((classData) => (
                <div key={classData.class} className="mb-6 last:mb-0">
                  <div className="flex items-center justify-between mb-3">
                    <h4 className="text-lg font-semibold text-gray-800">
                      Class {classData.class} - {classData.total_due_students} Students with Dues
                    </h4>
                    <span className="text-red-600 font-bold">
                      Total Due: ₹{classData.students.reduce((sum, s) => sum + s.due_amount, 0).toLocaleString()}
                    </span>
                  </div>
                  
                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Student ID
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Student Name
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Section
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Due Amount (₹)
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Installments Paid
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Status
                          </th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {classData.students.map((student) => (
                          <tr key={student.student_id} className="hover:bg-gray-50">
                            <td className="px-6 py-4 whitespace-nowrap">
                              <span className="font-medium">{student.student_id}</span>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <span className="font-medium">{student.student_name}</span>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <span className="px-3 py-1 rounded-full text-sm bg-blue-100 text-blue-800">
                                {student.section}
                              </span>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <span className="font-bold text-red-600">₹{student.due_amount.toLocaleString()}</span>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <span className="px-3 py-1 rounded-full text-sm bg-gray-100 text-gray-800">
                                {student.installments_paid} payments
                              </span>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                                student.status === 'PAID' ? 'bg-green-100 text-green-800' :
                                student.status === 'PARTIAL' ? 'bg-yellow-100 text-yellow-800' :
                                'bg-red-100 text-red-800'
                              }`}>
                                {student.status}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              ))}
              
              {!loading && schoolDueReport.length === 0 && (
                <div className="text-center py-8 text-gray-500">
                  No due records found for {selectedFeeType} fee in {academicYear}
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}