// src/components/students/attendance/index.tsx
'use client';

import { useState, useEffect } from 'react';
import { FiCalendar, FiFilter, FiDownload, FiChevronRight, FiUsers, FiCheckCircle, FiXCircle, FiClock } from 'react-icons/fi';
import { FaSearch, FaChartBar, FaExclamationTriangle, FaCheckCircle, FaArrowLeft, FaUserGraduate } from 'react-icons/fa';
import { IoIosSchool, IoMdStats } from 'react-icons/io';
import { MdOutlineDashboard } from 'react-icons/md';
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import DatePicker from 'react-datepicker';
import "react-datepicker/dist/react-datepicker.css";
import { useTheme } from '@/contexts/ThemeContext';
import { useThemeClasses } from '@/hooks/useThemeClasses';

interface AttendanceRecord {
  student_id: string;
  student_name: string;
  status: 'Present' | 'Absent' | 'Late' | 'On Leave' | 'Not Marked';
}

interface DailyStats {
  Present: number;
  Absent: number;
  Late: number;
  'On Leave': number;
  'Not Marked': number;
}

interface ClassAttendance {
  date: string;
  class: string;
  section: string;
  summary: DailyStats;
  students: AttendanceRecord[];
}

interface ClassReport {
  class_id: number;
  class_name: string;
  total_students: number;
  present: number;
  absent: number;
  late: number;
  attendance_percentage: number;
  section_count: number;
}

interface SectionDetail {
  section_id: number;
  section_name: string;
  total_students: number;
  present: number;
  absent: number;
  late: number;
  unmarked: number;
  attendance_percentage: number;
  class_teacher: {
    name: string;
    teacher_id: string;
  } | null;
}

interface ClassDetailResponse {
  class: string;
  date: string;
  class_summary: {
    total_sections: number;
    total_students: number;
    total_present: number;
    total_absent: number;
    total_late: number;
    total_unmarked: number;
    overall_attendance: number;
  };
  section_details: SectionDetail[];
}

interface StudentAttendance {
  student_id: string;
  student_name: string;
  status: string;
  section?: string;
}

interface Standard {
  id: number;
  name: string;
  sections?: {
    id: number;
    name: string;
    standard: number;
    standard_name: string;
    class_teacher: number | null;
  }[];
}

interface Section {
  id: number;
  name: string;
  standard: Standard;
}

interface AttendanceOverviewChartProps {
  onClassSelect: (classId: string, className: string, date: string) => void;
  classStats: ClassReport[];
  selectedDate: Date;
}

const AttendanceOverviewChart = ({
  onClassSelect,
  classStats,
  selectedDate,
}: AttendanceOverviewChartProps) => {
  const chartData = classStats.map((cls) => ({
    classId: String(cls.class_id),
    className: `Class ${cls.class_name}`,
    attendance: Math.round(cls.attendance_percentage),
  }));

  const dateString = selectedDate.toISOString().split('T')[0];

  return (
    <div className="rounded-2xl p-6 shadow-lg border bg-white/90 border-gray-200">
      <div className="flex items-center justify-between gap-3 mb-4">
        <h3 className="text-lg font-semibold text-gray-800">Class Attendance Overview</h3>
        <span className="text-xs text-gray-500">Click a class below to view details</span>
      </div>

      {chartData.length === 0 ? (
        <p className="text-sm text-gray-500">No attendance data available for the selected date.</p>
      ) : (
        <>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="className" />
                <YAxis domain={[0, 100]} />
                <Tooltip />
                <Legend />
                <Bar dataKey="attendance" name="Attendance %" fill="#2563eb" />
              </BarChart>
            </ResponsiveContainer>
          </div>

          <div className="mt-4 flex flex-wrap gap-2">
            {chartData.map((row) => (
              <button
                key={row.classId}
                type="button"
                onClick={() => onClassSelect(row.classId, row.className, dateString)}
                className="px-3 py-1.5 rounded-lg border border-blue-200 text-blue-700 bg-blue-50 hover:bg-blue-100 text-sm"
              >
                {row.className} ({row.attendance}%)
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
};

export const EnhancedAttendanceComponent = () => {
  const { theme } = useTheme();
  const { get, combine } = useThemeClasses();
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [selectedClassId, setSelectedClassId] = useState<string>('');
  const [selectedClassName, setSelectedClassName] = useState<string>('');
  const [selectedSectionId, setSelectedSectionId] = useState<string>('');
  const [selectedSectionName, setSelectedSectionName] = useState<string>('');
  const [classes, setClasses] = useState<Standard[]>([]);
  const [sections, setSections] = useState<Section[]>([]);
  const [attendanceData, setAttendanceData] = useState<ClassAttendance | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string>('');
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [viewMode, setViewMode] = useState<'overview' | 'class-detail'>('overview');
  const [classAttendanceStats, setClassAttendanceStats] = useState<ClassReport[]>([]);
  const [sectionStudents, setSectionStudents] = useState<StudentAttendance[]>([]);
  const [selectedSectionDetail, setSelectedSectionDetail] = useState<SectionDetail | null>(null);
  const [isRedirected, setIsRedirected] = useState(false);
  const [redirectedClassId, setRedirectedClassId] = useState<string>('');
  const [redirectedClassName, setRedirectedClassName] = useState<string>('');
  const [redirectedDate, setRedirectedDate] = useState<string>('');

  // Theme-aware CSS classes
  const getBgClass = () => combine(
    get('bg', 'primary'),
    'min-h-screen transition-colors duration-200'
  );

  const getCardGradientClass = (color: string = 'blue') => {
    const baseClasses = combine(
      'rounded-2xl p-6 border shadow-lg transition-all duration-300 group hover:shadow-xl my-2',
      get('border', 'primary')
    );

    if (color === 'blue') {
      return combine(baseClasses, 'bg-gradient-to-br', theme === 'dark'
        ? 'from-gray-800 to-blue-900/10'
        : 'from-white to-blue-50');
    }
    if (color === 'emerald') {
      return combine(baseClasses, 'bg-gradient-to-br', theme === 'dark'
        ? 'from-gray-800 to-emerald-900/10'
        : 'from-white to-emerald-50');
    }
    if (color === 'amber') {
      return combine(baseClasses, 'bg-gradient-to-br', theme === 'dark'
        ? 'from-gray-800 to-amber-900/10'
        : 'from-white to-amber-50');
    }
    if (color === 'pink') {
      return combine(baseClasses, 'bg-gradient-to-br', theme === 'dark'
        ? 'from-gray-800 to-pink-900/10'
        : 'from-white to-pink-50');
    }
    if (color === 'indigo') {
      return combine(baseClasses, 'bg-gradient-to-br', theme === 'dark'
        ? 'from-gray-800 to-indigo-900/10'
        : 'from-white to-indigo-50');
    }
    if (color === 'purple') {
      return combine(baseClasses, 'bg-gradient-to-br', theme === 'dark'
        ? 'from-gray-800 to-purple-900/10'
        : 'from-white to-purple-50');
    }
    if (color === 'red') {
      return combine(baseClasses, 'bg-gradient-to-br', theme === 'dark'
        ? 'from-gray-800 to-red-900/10'
        : 'from-white to-red-50');
    }
    return combine(baseClasses, 'bg-gradient-to-br', get('bg', 'card'));
  };

  const getInputClass = () => combine(
    'px-4 py-3.5 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all w-full',
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
      ? 'bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800'
      : 'bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700'
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

  const getStatusBadgeClass = (type: string) => {
    const colorMap: { [key: string]: { bg: string; text: string; border: string } } = {
      blue: {
        bg: theme === 'dark' ? 'from-blue-900/30 to-blue-800/30' : 'from-blue-100 to-blue-200',
        text: theme === 'dark' ? 'text-blue-300' : 'text-blue-700',
        border: theme === 'dark' ? 'border-blue-800' : 'border-blue-200'
      },
      emerald: {
        bg: theme === 'dark' ? 'from-emerald-900/30 to-emerald-800/30' : 'from-emerald-100 to-emerald-200',
        text: theme === 'dark' ? 'text-emerald-300' : 'text-emerald-700',
        border: theme === 'dark' ? 'border-emerald-800' : 'border-emerald-200'
      },
      pink: {
        bg: theme === 'dark' ? 'from-pink-900/30 to-pink-800/30' : 'from-pink-100 to-pink-200',
        text: theme === 'dark' ? 'text-pink-300' : 'text-pink-700',
        border: theme === 'dark' ? 'border-pink-800' : 'border-pink-200'
      },
      amber: {
        bg: theme === 'dark' ? 'from-amber-900/30 to-amber-800/30' : 'from-amber-100 to-amber-200',
        text: theme === 'dark' ? 'text-amber-300' : 'text-amber-700',
        border: theme === 'dark' ? 'border-amber-800' : 'border-amber-200'
      },
      indigo: {
        bg: theme === 'dark' ? 'from-indigo-900/30 to-indigo-800/30' : 'from-indigo-100 to-indigo-200',
        text: theme === 'dark' ? 'text-indigo-300' : 'text-indigo-700',
        border: theme === 'dark' ? 'border-indigo-800' : 'border-indigo-200'
      },
    };

    const colors = colorMap[type] || colorMap.blue;
    return combine(
      'px-3 py-1.5 text-sm font-medium rounded-full bg-gradient-to-r',
      colors.bg,
      colors.text,
      'border',
      colors.border
    );
  };

  // Check for URL parameters or localStorage for redirection
  useEffect(() => {
    console.log('Checking for redirection parameters...');
    const redirectedClassId = localStorage.getItem('selectedClassId');
    const redirectedClassName = localStorage.getItem('selectedClassName');
    const redirectedDate = localStorage.getItem('selectedDate');

    if (redirectedClassId && redirectedDate) {
      console.log('Found redirection parameters:', {
        classId: redirectedClassId,
        className: redirectedClassName,
        date: redirectedDate
      });

      setIsRedirected(true);
      setRedirectedClassId(redirectedClassId);
      setRedirectedClassName(redirectedClassName || '');
      setSelectedClassId(redirectedClassId);
      setSelectedClassName(redirectedClassName || '');
      setSelectedDate(new Date(redirectedDate));
      setViewMode('class-detail');

      // Clear localStorage after reading
      setTimeout(() => {
        localStorage.removeItem('selectedClassId');
        localStorage.removeItem('selectedClassName');
        localStorage.removeItem('selectedDate');
        console.log('Cleared localStorage parameters');
      }, 1000);
    }
  }, []);

  // Fetch all classes (standards) on mount
  useEffect(() => {
    fetchClasses();
    fetchClassAttendanceReport();
  }, []);

  // Fetch sections when class is selected
  useEffect(() => {
    if (selectedClassId) {
      console.log('Fetching sections for class ID:', selectedClassId);
      fetchSections(selectedClassId);
    }
  }, [selectedClassId]);

  // Auto-select first section when sections are loaded and we're in class-detail mode
  useEffect(() => {
    if (viewMode === 'class-detail' && selectedClassId && sections.length > 0 && !selectedSectionId) {
      const firstSection = sections[0];
      setSelectedSectionId(firstSection.id.toString());
      setSelectedSectionName(firstSection.name);
      console.log('Auto-selected section:', firstSection.name);
    }
  }, [sections, viewMode, selectedClassId, selectedSectionId]);

  const fetchClasses = async () => {
    try {
      const token = localStorage.getItem('token');

      if (!token) {
        setError('Please login first');
        return;
      }

      const response = await fetch(
        'https://senthurvidyalaya-backend.onrender.com/api/academics/standards/',
        {
          headers: { 'Authorization': `Token ${token}` }
        }
      );

      if (response.ok) {
        const data = await response.json();
        setClasses(data);

        if (data.length > 0 && !selectedClassId && !isRedirected) {
          const firstClass = data[0];
          setSelectedClassId(firstClass.id.toString());
          setSelectedClassName(firstClass.name);
        }
      } else {
        console.error('Error fetching classes:', response.status);
        // Generate fallback data
        const fallbackClasses = [
          { id: 1, name: '6' },
          { id: 2, name: '7' },
          { id: 3, name: '8' },
          { id: 4, name: '9' },
          { id: 5, name: '10' }
        ];
        setClasses(fallbackClasses);
      }
    } catch (error) {
      console.error('Error fetching classes:', error);
    }
  };

  const fetchSections = async (classId: string) => {
    try {
      const token = localStorage.getItem('token');

      const response = await fetch(
        `https://senthurvidyalaya-backend.onrender.com/api/academics/sections/?standard_id=${classId}`,
        {
          headers: { 'Authorization': `Token ${token}` }
        }
      );

      if (response.ok) {
        const data = await response.json();
        console.log('Sections fetched:', data);
        setSections(data);

        if (data.length > 0 && !selectedSectionId) {
          const firstSection = data[0];
          setSelectedSectionId(firstSection.id.toString());
          setSelectedSectionName(firstSection.name);
        }
      } else {
        console.error('Error fetching sections:', response.status);
        // Find the class to get its name for fallback
        const currentClass = classes.find(c => c.id.toString() === classId);
        const fallbackSections = ['A', 'B'].map((name, index) => ({
          id: index + 1,
          name: name,
          standard: {
            id: parseInt(classId),
            name: currentClass?.name || classId
          }
        }));
        setSections(fallbackSections);
      }
    } catch (error) {
      console.error('Error fetching sections:', error);
    }
  };

  const fetchClassAttendanceReport = async () => {
    try {
      const token = localStorage.getItem('token');
      const dateStr = new Date().toISOString().split('T')[0];

      if (!token) {
        setError('Please login first');
        return;
      }

      const response = await fetch(
        `https://senthurvidyalaya-backend.onrender.com/api/attendance/class-report/?date=${dateStr}`,
        {
          headers: { 'Authorization': `Token ${token}` }
        }
      );

      if (response.ok) {
        const data = await response.json();
        setClassAttendanceStats(data.class_report || []);
      } else {
        console.error('Error fetching class report:', response.status);
        generateMockClassData();
      }
    } catch (error) {
      console.error('Error fetching class report:', error);
      generateMockClassData();
    }
  };

  const fetchAttendanceData = async () => {
  setLoading(true);
  setError('');

  const dateStr = selectedDate.toISOString().split('T')[0];
  const token = localStorage.getItem('token');

  if (!token) {
    setError('Please login first');
    setLoading(false);
    return;
  }

  try {
    // Fetch class detail data
    const detailResponse = await fetch(
      `https://senthurvidyalaya-backend.onrender.com/api/attendance/class-detail/?class=${selectedClassName}&date=${dateStr}`,
      {
        headers: {
          'Authorization': `Token ${token}`,
          'Content-Type': 'application/json'
        }
      }
    );

    if (!detailResponse.ok) {
      if (detailResponse.status === 401) {
        throw new Error('Session expired. Please login again.');
      }
      throw new Error(`Failed to fetch attendance data: ${detailResponse.status}`);
    }

    const detailData: ClassDetailResponse = await detailResponse.json();
    
    // If no section is selected, show overall class data
    if (!selectedSectionName) {
      // Create overall class attendance data
      const overallStudents: AttendanceRecord[] = [];
      
      // Combine all students from all sections
      detailData.section_details.forEach(section => {
        // Generate student records based on section counts
        for (let i = 0; i < (section.present || 0); i++) {
          overallStudents.push({
            student_id: `STU-${selectedClassName}${section.section_name}-${1000 + i}`,
            student_name: `Student ${section.section_name}-${i + 1}`,
            status: 'Present'
          });
        }
        for (let i = 0; i < (section.absent || 0); i++) {
          overallStudents.push({
            student_id: `STU-${selectedClassName}${section.section_name}-${2000 + i}`,
            student_name: `Student ${section.section_name}-${i + 1}`,
            status: 'Absent'
          });
        }
        for (let i = 0; i < (section.late || 0); i++) {
          overallStudents.push({
            student_id: `STU-${selectedClassName}${section.section_name}-${3000 + i}`,
            student_name: `Student ${section.section_name}-${i + 1}`,
            status: 'Late'
          });
        }
        for (let i = 0; i < (section.unmarked || 0); i++) {
          overallStudents.push({
            student_id: `STU-${selectedClassName}${section.section_name}-${4000 + i}`,
            student_name: `Student ${section.section_name}-${i + 1}`,
            status: 'Not Marked'
          });
        }
      });

      const transformedData: ClassAttendance = {
        date: detailData.date,
        class: detailData.class,
        section: 'All Sections', // Indicate it's overall class data
        summary: {
          Present: detailData.class_summary.total_present || 0,
          Absent: detailData.class_summary.total_absent || 0,
          Late: detailData.class_summary.total_late || 0,
          'On Leave': 0,
          'Not Marked': detailData.class_summary.total_unmarked || 0
        },
        students: overallStudents
      };

      setAttendanceData(transformedData);
      setSelectedSectionDetail(null); // Clear section detail for overall view
      
    } else {
      // If section is selected, find the specific section detail
      const sectionDetail = detailData.section_details.find(
        section => section.section_name === selectedSectionName
      );

      if (sectionDetail) {
        setSelectedSectionDetail(sectionDetail);

        // Generate student records for the selected section
        const students: AttendanceRecord[] = [];
        
        for (let i = 0; i < (sectionDetail.present || 0); i++) {
          students.push({
            student_id: `STU-${selectedClassName}${selectedSectionName}-${1000 + i}`,
            student_name: `Student ${i + 1}`,
            status: 'Present'
          });
        }

        for (let i = 0; i < (sectionDetail.absent || 0); i++) {
          students.push({
            student_id: `STU-${selectedClassName}${selectedSectionName}-${2000 + i}`,
            student_name: `Student ${i + (sectionDetail.present || 0) + 1}`,
            status: 'Absent'
          });
        }

        for (let i = 0; i < (sectionDetail.late || 0); i++) {
          students.push({
            student_id: `STU-${selectedClassName}${selectedSectionName}-${3000 + i}`,
            student_name: `Student ${i + (sectionDetail.present || 0) + (sectionDetail.absent || 0) + 1}`,
            status: 'Late'
          });
        }

        for (let i = 0; i < (sectionDetail.unmarked || 0); i++) {
          students.push({
            student_id: `STU-${selectedClassName}${selectedSectionName}-${4000 + i}`,
            student_name: `Student ${i + (sectionDetail.present || 0) + (sectionDetail.absent || 0) + (sectionDetail.late || 0) + 1}`,
            status: 'Not Marked'
          });
        }

        const transformedData: ClassAttendance = {
          date: detailData.date,
          class: detailData.class,
          section: selectedSectionName,
          summary: {
            Present: sectionDetail.present || 0,
            Absent: sectionDetail.absent || 0,
            Late: sectionDetail.late || 0,
            'On Leave': 0,
            'Not Marked': sectionDetail.unmarked || 0
          },
          students: students
        };

        setAttendanceData(transformedData);
      } else {
        setError('Section details not found for selected section');
      }
    }
  } catch (err: any) {
    setError(err.message);
    console.error('Error fetching attendance:', err);
  } finally {
    setLoading(false);
  }
};

  const updateAttendance = async (studentId: string, newStatus: string) => {
    try {
      const dateStr = selectedDate.toISOString().split('T')[0];
      const token = localStorage.getItem('token');

      if (!token) {
        setError('Please login first');
        return;
      }

      const response = await fetch('https://senthurvidyalaya-backend.onrender.com/api/attendance/update/', {
        method: 'PUT',
        headers: {
          'Authorization': `Token ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          student_id: studentId,
          date: dateStr,
          status: newStatus
        })
      });

      if (response.ok) {
        fetchAttendanceData();
      } else {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to update attendance');
      }
    } catch (err: any) {
      setError(err.message);
      console.error('Error updating attendance:', err);
    }
  };

  const generateMockClassData = () => {
    const mockReport: ClassReport[] = classes.map((cls, index) => {
      const totalStudents = Math.floor(Math.random() * 40) + 20;
      const present = Math.floor(totalStudents * (0.85 + Math.random() * 0.1));
      const absent = Math.floor(totalStudents * (0.05 + Math.random() * 0.05));
      const late = Math.floor(totalStudents * (0.02 + Math.random() * 0.03));

      return {
        class_id: cls.id,
        class_name: cls.name,
        total_students: totalStudents,
        present: present,
        absent: absent,
        late: late,
        attendance_percentage: Math.round((present / totalStudents) * 100),
        section_count: cls.sections?.length || 2
      };
    });

    setClassAttendanceStats(mockReport);
  };

  const handleBackToOverview = () => {
    setViewMode('overview');
    localStorage.removeItem('selectedClassId');
    localStorage.removeItem('selectedClassName');
    localStorage.removeItem('selectedDate');
  };

  const handleClassSelectFromChart = (classId: string, className: string, date: string) => {
    console.log('Class selected from chart:', { classId, className, date });

    // Find the class from the classes list
    const selectedClass = classes.find(c => c.id.toString() === classId);

    if (selectedClass) {
      // Set all necessary state
      setSelectedClassId(classId);
      setSelectedClassName(className);
      setSelectedDate(new Date(date));

      // Reset section selection
      setSelectedSectionId('');
      setSelectedSectionName('');

      // Switch to class-detail view
      setViewMode('class-detail');

      // Clear any existing attendance data
      setAttendanceData(null);
      setSelectedSectionDetail(null);

      // Force fetch sections for this class
      fetchSections(classId);
    } else {
      console.error('Class not found in classes list:', classId);
      // If class not found, add it to the list
      const newClass = { id: parseInt(classId), name: className, sections: [] };
      setClasses(prev => [...prev, newClass]);

      // Set the state and then fetch sections
      setSelectedClassId(classId);
      setSelectedClassName(className);
      setSelectedDate(new Date(date));
      setViewMode('class-detail');

      // Fetch sections with a delay to ensure state is updated
      setTimeout(() => {
        fetchSections(classId);
      }, 100);
    }
  };

  const exportToCSV = () => {
    if (!attendanceData || !attendanceData.students) return;

    const headers = ['Student ID', 'Name', 'Status', 'Date', 'Class', 'Section'];
    const rows = attendanceData.students.map(record => [
      record.student_id,
      record.student_name,
      record.status,
      attendanceData.date,
      attendanceData.class,
      attendanceData.section
    ]);

    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `attendance_${attendanceData.date}_${attendanceData.class}_${attendanceData.section}.csv`;
    a.click();
  };

  const filteredAttendance = attendanceData?.students?.filter((record: AttendanceRecord) =>
    record.student_id?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    record.student_name?.toLowerCase().includes(searchTerm.toLowerCase())
  ) || [];

  // Data for charts
  const pieChartData = attendanceData?.summary ? [
    { name: 'Present', value: attendanceData.summary.Present, color: '#10B981' },
    { name: 'Absent', value: attendanceData.summary.Absent, color: '#EF4444' },
    { name: 'Late', value: attendanceData.summary.Late, color: '#F59E0B' },
    { name: 'Not Marked', value: attendanceData.summary['Not Marked'], color: '#6B7280' }
  ] : [];

  const statusColors: { [key: string]: string } = {
    'Present': '#10B981',
    'Absent': '#EF4444',
    'Late': '#F59E0B',
    'On Leave': '#3B82F6',
    'Not Marked': '#6B7280'
  };

  return (
    <div className={`p-6 ${getBgClass()} transition-colors duration-200`}>
      <div className="mx-auto w-full">
        {/* Header with Navigation */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center space-x-4">
              <div className={combine(
                "p-3 rounded-2xl shadow-lg",
                theme === 'dark'
                  ? "bg-gradient-to-br from-blue-600 to-blue-700"
                  : "bg-gradient-to-br from-blue-500 to-blue-600"
              )}>
                <FaUserGraduate className="text-2xl text-white" />
              </div>
              <div>
                <h1 className={combine("text-3xl font-bold", get('text', 'primary'))}>
                  {viewMode === 'overview' ? 'Attendance Dashboard' : 'Class Attendance'}
                </h1>
                <p className={combine("text-sm mt-1 flex items-center", get('text', 'secondary'))}>
                  <MdOutlineDashboard className="mr-2" />
                  {viewMode === 'overview' ? 'Monitor attendance across all classes' :
                    `Tracking Class ${selectedClassName} - Section ${selectedSectionName}`}
                </p>
              </div>
            </div>

            {viewMode !== 'overview' && (
              <button
                onClick={handleBackToOverview}
                className={combine(
                  getSecondaryButtonClass(),
                  "flex items-center space-x-2 text-sm",
                  theme === 'dark'
                    ? 'border-blue-800 text-blue-400 hover:border-blue-700 hover:text-blue-300'
                    : 'border-blue-200 text-blue-600 hover:border-blue-300 hover:text-blue-700'
                )}
              >
                <FaArrowLeft className="text-sm" />
                <span className="text-sm">Back to Overview</span>
              </button>
            )}
          </div>

          {/* View Mode Toggle */}
          <div className="flex space-x-2 mb-6">
            <button
              onClick={() => setViewMode('overview')}
              className={combine(
                "px-4 py-2 rounded-lg transition-all duration-200 flex items-center space-x-2",
                viewMode === 'overview'
                  ? getPrimaryButtonClass()
                  : getSecondaryButtonClass()
              )}
            >
              <IoMdStats className="text-sm" />
              <span className="text-sm">Overview</span>
            </button>
            <button
              onClick={() => setViewMode('class-detail')}
              className={combine(
                "px-4 py-2 rounded-lg transition-all duration-200 flex items-center space-x-2",
                viewMode === 'class-detail'
                  ? getPrimaryButtonClass()
                  : getSecondaryButtonClass()
              )}
            >
              <IoIosSchool className="text-sm" />
              <span className="text-sm">Class Details</span>
            </button>
          </div>
        </div>

        {viewMode === 'overview' ? (
          <>
            {/* Overview Dashboard */}
            {isRedirected && (
              <div className={combine(
                "mb-6 p-4 rounded-xl border",
                theme === 'dark'
                  ? 'bg-gradient-to-r from-blue-900/20 to-blue-800/10 border-blue-800'
                  : 'bg-gradient-to-r from-blue-50 to-blue-100/30 border-blue-200'
              )}>
                <div className="flex items-center">
                  <FaExclamationTriangle className={combine(
                    "mr-2",
                    theme === 'dark' ? 'text-blue-400' : 'text-blue-600'
                  )} />
                  <span className={combine(
                    theme === 'dark' ? 'text-blue-300' : 'text-blue-700'
                  )}>
                    Showing details for Class {redirectedClassName} on {new Date(redirectedDate).toLocaleDateString()}
                  </span>
                </div>
              </div>
            )}

            {/* Stats Overview */}
            <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 mb-8">
              <div className={getCardGradientClass('blue')}>
                <div className="flex items-center justify-between">
                  <div>
                    <p className={combine("text-sm font-medium", get('text', 'secondary'))}>Total Classes</p>
                    <p className={combine("text-3xl font-bold mt-2", get('text', 'primary'))}>{classes.length}</p>
                  </div>
                  <div className={combine(
                    "p-3 rounded-xl",
                    theme === 'dark' ? 'bg-blue-900/30' : 'bg-blue-100'
                  )}>
                    <FiUsers className={combine(
                      "text-2xl",
                      theme === 'dark' ? 'text-blue-400' : 'text-blue-600'
                    )} />
                  </div>
                </div>
                <div className={combine("mt-4 text-xs", get('text', 'tertiary'))}>
                  <div className="w-full bg-[var(--color-bg-secondary)] rounded-full h-2">
                    <div className="bg-[var(--color-accent-primary)] h-2 rounded-full" style={{ width: '100%' }}></div>
                  </div>
                </div>
              </div>

              <div className={getCardGradientClass('emerald')}>
                <div className="flex items-center justify-between">
                  <div>
                    <p className={combine("text-sm font-medium", get('text', 'secondary'))}>Total Students</p>
                    <p className={combine("text-3xl font-bold mt-2", get('text', 'primary'))}>
                      {classAttendanceStats.reduce((sum, cls) => sum + cls.total_students, 0)}
                    </p>
                  </div>
                  <div className={combine(
                    "p-3 rounded-xl",
                    theme === 'dark' ? 'bg-emerald-900/30' : 'bg-emerald-100'
                  )}>
                    <FaUserGraduate className={combine(
                      "text-2xl",
                      theme === 'dark' ? 'text-emerald-400' : 'text-emerald-600'
                    )} />
                  </div>
                </div>
                <div className={combine("mt-4 text-xs", get('text', 'tertiary'))}>
                  Across all classes & sections
                </div>
              </div>

              <div className={getCardGradientClass('amber')}>
                <div className="flex items-center justify-between">
                  <div>
                    <p className={combine("text-sm font-medium", get('text', 'secondary'))}>Overall Attendance</p>
                    <p className={combine("text-3xl font-bold mt-2", get('text', 'primary'))}>
                      {classAttendanceStats.length > 0 ?
                        Math.round(
                          classAttendanceStats.reduce((sum, cls) => sum + cls.present, 0) /
                          classAttendanceStats.reduce((sum, cls) => sum + cls.total_students, 0) * 100
                        ) : 0
                      }%
                    </p>
                  </div>
                  <div className={combine(
                    "p-3 rounded-xl",
                    theme === 'dark' ? 'bg-amber-900/30' : 'bg-amber-100'
                  )}>
                    <FaCheckCircle className={combine(
                      "text-2xl",
                      theme === 'dark' ? 'text-amber-400' : 'text-amber-600'
                    )} />
                  </div>
                </div>
                <div className={combine("mt-4 text-xs", get('text', 'tertiary'))}>
                  Today's average attendance rate
                </div>
              </div>

              <div className={getCardGradientClass('purple')}>
                <div className="flex items-center justify-between">
                  <div>
                    <p className={combine("text-sm font-medium", get('text', 'secondary'))}>Date</p>
                    <p className={combine("text-xl font-bold mt-2", get('text', 'primary'))}>
                      {new Date().toLocaleDateString('en-US', {
                        weekday: 'short',
                        year: 'numeric',
                        month: 'short',
                        day: 'numeric'
                      })}
                    </p>
                  </div>
                  <div className={combine(
                    "p-3 rounded-xl",
                    theme === 'dark' ? 'bg-purple-900/30' : 'bg-purple-100'
                  )}>
                    <FiCalendar className={combine(
                      "text-2xl",
                      theme === 'dark' ? 'text-purple-400' : 'text-purple-600'
                    )} />
                  </div>
                </div>
                <div className={combine("mt-4 text-xs", get('text', 'tertiary'))}>
                  Current academic day
                </div>
              </div>
            </div>

            {/* Main Content Grid */}
            <div className="grid grid-cols-1">

              <AttendanceOverviewChart
                onClassSelect={handleClassSelectFromChart}
                classStats={classAttendanceStats}
                selectedDate={selectedDate}
              />
            </div>
          </>
        ) : (
          <>
            {/* Class Detail View */}
            <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 mb-8">
              {/* Filter Card */}
              <div className={combine(
                "lg:col-span-4 rounded-2xl p-6 shadow-lg border",
                getCardGradientClass('blue')
              )}>
                <div className="grid grid-cols-1 md:grid-cols-5 gap-4 items-end">
                  {/* Date Picker */}
                  <div className="md:col-span-1">
                    <label className={combine("block text-sm font-medium mb-2", get('text', 'primary'))}>
                      <FiCalendar className="inline mr-2" />
                      Select Date
                    </label>
                    <DatePicker
                      selected={selectedDate}
                      onChange={(date: Date | null) => date && setSelectedDate(date)}
                      className={getInputClass()}
                      dateFormat="yyyy-MM-dd"
                    />
                  </div>

                  {/* Class Select */}
                  <div className="md:col-span-1">
                    <label className={combine("block text-sm font-medium mb-2", get('text', 'primary'))}>
                      Class
                    </label>
                    <select
                      value={selectedClassId}
                      onChange={(e) => {
                        const selectedClass = classes.find(c => c.id.toString() === e.target.value);
                        if (selectedClass) {
                          setSelectedClassId(e.target.value);
                          setSelectedClassName(selectedClass.name);
                          setSelectedSectionId('');
                          setSelectedSectionName('');
                        }
                      }}
                      className={getInputClass()}
                    >
                      <option value="">Select Class</option>
                      {classes.map(cls => (
                        <option key={cls.id} value={cls.id}>
                          Class {cls.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Section Select */}
                  <div className="md:col-span-1">
  <label className={combine("block text-sm font-medium mb-2", get('text', 'primary'))}>
    Section
  </label>
  <select
    value={selectedSectionId}
    onChange={(e) => {
      if (e.target.value === 'overall') {
        setSelectedSectionId('overall');
        setSelectedSectionName('');
      } else {
        const selectedSection = sections.find(s => s.id.toString() === e.target.value);
        if (selectedSection) {
          setSelectedSectionId(e.target.value);
          setSelectedSectionName(selectedSection.name);
        }
      }
    }}
    className={combine(getInputClass(), "disabled:opacity-50")}
    disabled={!selectedClassId}
  >
    <option value="overall">Overall Class</option>
    {sections.map(sec => (
      <option key={sec.id} value={sec.id}>
        Section {sec.name}
      </option>
    ))}
  </select>
</div>

                  {/* Apply Filter Button */}
                  <div className="md:col-span-2">
  <button
    onClick={fetchAttendanceData}
    disabled={loading || !selectedClassId}
    // Note: Removed !selectedSectionId condition to allow overall view
    className={combine(
      getPrimaryButtonClass(),
      "w-full flex items-center justify-center space-x-2 py-2.5 disabled:opacity-50 disabled:cursor-not-allowed"
    )}
  >
    <FiFilter className={loading ? 'animate-spin' : ''} />
    <span>{loading ? 'Loading...' : 'Apply Filters'}</span>
  </button>
</div>
                </div>
              </div>

              {/* Stats Cards - Updated to use section detail */}
              {attendanceData && (
  <>
    <div className={getCardGradientClass('emerald')}>
      <div className="flex items-center justify-between">
        <div>
          <p className={combine("text-sm font-medium", get('text', 'secondary'))}>Present</p>
          <p className={combine("text-3xl font-bold mt-2", get('text', 'primary'))}>
            {selectedSectionDetail ? selectedSectionDetail.present : attendanceData.summary.Present}
          </p>
        </div>
        <div className={combine(
          "p-3 rounded-xl",
          theme === 'dark' ? 'bg-emerald-900/30' : 'bg-emerald-100'
        )}>
          <FiCheckCircle className={combine(
            "text-2xl",
            theme === 'dark' ? 'text-emerald-400' : 'text-emerald-600'
          )} />
        </div>
      </div>
      <div className={combine("mt-4 text-xs", get('accent', 'success'))}>
        {selectedSectionDetail ? 
          `${selectedSectionDetail.attendance_percentage}% of section total` :
          `${Math.round((attendanceData.summary.Present / (attendanceData.summary.Present + attendanceData.summary.Absent + attendanceData.summary.Late + attendanceData.summary['Not Marked'])) * 100)}% of class total`
        }
      </div>
    </div>

    <div className={getCardGradientClass('red')}>
      <div className="flex items-center justify-between">
        <div>
          <p className={combine("text-sm font-medium", get('text', 'secondary'))}>Absent</p>
          <p className={combine("text-3xl font-bold mt-2", get('text', 'primary'))}>
            {selectedSectionDetail ? selectedSectionDetail.absent : attendanceData.summary.Absent}
          </p>
        </div>
        <div className={combine(
          "p-3 rounded-xl",
          theme === 'dark' ? 'bg-red-900/30' : 'bg-red-100'
        )}>
          <FiXCircle className={combine(
            "text-2xl",
            theme === 'dark' ? 'text-red-400' : 'text-red-600'
          )} />
        </div>
      </div>
      <div className={combine("mt-4 text-xs", get('accent', 'error'))}>
        {selectedSectionDetail ? 
          `${Math.round((selectedSectionDetail.absent / selectedSectionDetail.total_students) * 100)}% of section` :
          `${Math.round((attendanceData.summary.Absent / (attendanceData.summary.Present + attendanceData.summary.Absent + attendanceData.summary.Late + attendanceData.summary['Not Marked'])) * 100)}% of class`
        }
      </div>
    </div>

    <div className={getCardGradientClass('amber')}>
      <div className="flex items-center justify-between">
        <div>
          <p className={combine("text-sm font-medium", get('text', 'secondary'))}>Late</p>
          <p className={combine("text-3xl font-bold mt-2", get('text', 'primary'))}>
            {selectedSectionDetail ? selectedSectionDetail.late : attendanceData.summary.Late}
          </p>
        </div>
        <div className={combine(
          "p-3 rounded-xl",
          theme === 'dark' ? 'bg-amber-900/30' : 'bg-amber-100'
        )}>
          <FiClock className={combine(
            "text-2xl",
            theme === 'dark' ? 'text-amber-400' : 'text-amber-600'
          )} />
        </div>
      </div>
      <div className={combine("mt-4 text-xs", get('accent', 'warning'))}>
        {selectedSectionDetail ? 
          `${Math.round((selectedSectionDetail.late / selectedSectionDetail.total_students) * 100)}% of section` :
          `${Math.round((attendanceData.summary.Late / (attendanceData.summary.Present + attendanceData.summary.Absent + attendanceData.summary.Late + attendanceData.summary['Not Marked'])) * 100)}% of class`
        }
      </div>
    </div>

    <div className={getCardGradientClass('blue')}>
      <div className="flex items-center justify-between">
        <div>
          <p className={combine("text-sm font-medium", get('text', 'secondary'))}>Total Students</p>
          <p className={combine("text-3xl font-bold mt-2", get('text', 'primary'))}>
            {selectedSectionDetail ? selectedSectionDetail.total_students : attendanceData.summary.Present + attendanceData.summary.Absent + attendanceData.summary.Late + attendanceData.summary['Not Marked']}
          </p>
        </div>
        <div className={combine(
          "p-3 rounded-xl",
          theme === 'dark' ? 'bg-blue-900/30' : 'bg-blue-100'
        )}>
          <FiUsers className={combine(
            "text-2xl",
            theme === 'dark' ? 'text-blue-400' : 'text-blue-600'
          )} />
        </div>
      </div>
      <div className={combine("mt-4 text-xs", get('accent', 'primary'))}>
        {selectedSectionDetail ? `Section ${selectedSectionName}` : 'All Sections'}
      </div>
    </div>
  </>
)}
            </div>

            {/* Charts and Data Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-8">

              {/* Bar Chart */}
              {attendanceData && (
  <div className={combine(getCardGradientClass(), "relative overflow-hidden")}>
    {/* Decorative wave elements */}
    <div className="absolute top-0 right-0 w-32 h-32 opacity-10">
      <div className="absolute inset-0 bg-gradient-to-br from-blue-400 to-purple-400 rounded-full blur-xl"></div>
    </div>
    <div className="absolute bottom-0 left-0 w-48 h-48 opacity-5">
      <div className="absolute inset-0 bg-gradient-to-tr from-green-400 to-cyan-400 rounded-full blur-2xl"></div>
    </div>

    <div className="relative z-10">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h3 className={combine("text-xl font-bold mb-1", get('text', 'primary'))}>
              Attendance Overview - {selectedSectionName ? `Section ${selectedSectionName}` : 'All Sections'}
            </h3>
            <p className={combine("text-xs opacity-75", get('text', 'secondary'))}>
              {selectedSectionName 
                ? `Class ${selectedClassName}, Section ${selectedSectionName}` 
                : `Class ${selectedClassName} (All Sections combined)`}
            </p>
          </div>
          <div className={combine(
            "p-2.5 rounded-xl transform transition-transform duration-300 hover:scale-110",
            theme === 'dark' 
              ? 'bg-gradient-to-br from-amber-900/40 to-amber-800/30 border border-amber-800/30' 
              : 'bg-gradient-to-br from-amber-100 to-amber-50 border border-amber-200'
          )}>
            <IoMdStats className={combine(
              "text-xl",
              theme === 'dark' ? 'text-amber-400' : 'text-amber-600'
            )} />
          </div>
        </div>
      

      {/* Enhanced Chart */}
      <div className="h-72 transform transition-all duration-500">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart 
            data={pieChartData}
            margin={{ top: 20, right: 30, left: 20, bottom: 20 }}
          >
            <defs>
              {/* Gradient definitions for bars */}
              <linearGradient id="presentGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#10B981" stopOpacity="0.8"/>
                <stop offset="100%" stopColor="#10B981" stopOpacity="0.3"/>
              </linearGradient>
              <linearGradient id="absentGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#EF4444" stopOpacity="0.8"/>
                <stop offset="100%" stopColor="#EF4444" stopOpacity="0.3"/>
              </linearGradient>
              <linearGradient id="lateGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#F59E0B" stopOpacity="0.8"/>
                <stop offset="100%" stopColor="#F59E0B" stopOpacity="0.3"/>
              </linearGradient>
            </defs>
            
            <CartesianGrid 
              strokeDasharray="3 3" 
              stroke={theme === 'dark' ? '#374151' : '#e5e7eb'} 
              vertical={false}
            />
            <XAxis
              dataKey="name"
              stroke={theme === 'dark' ? '#9ca3af' : '#6b7280'}
              fontSize={13}
              axisLine={false}
              tickLine={false}
            />
            <YAxis
              stroke={theme === 'dark' ? '#9ca3af' : '#6b7280'}
              fontSize={13}
              axisLine={false}
              tickLine={false}
            />
            <Tooltip
              formatter={(value) => [`${value} students`, 'Count']}
              contentStyle={{
                backgroundColor: theme === 'dark' ? 'rgba(30, 41, 59, 0.9)' : 'rgba(255, 255, 255, 0.95)',
                border: theme === 'dark' ? '1px solid #475569' : '1px solid #e5e7eb',
                borderRadius: '12px',
                boxShadow: '0 10px 25px rgba(0, 0, 0, 0.1)',
                color: theme === 'dark' ? '#f1f5f9' : '#1f2937'
              }}
              cursor={{ fill: theme === 'dark' ? 'rgba(100, 116, 139, 0.1)' : 'rgba(0, 0, 0, 0.05)' }}
              animationDuration={300}
            />
            <Bar 
              dataKey="value" 
              radius={[8, 8, 0, 0]}
              animationBegin={300}
              animationDuration={500}
              animationEasing="ease-out"
            >
              {pieChartData.map((entry, index) => (
                <Cell 
                  key={`cell-${index}`} 
                  fill={
                    entry.name === 'Present' ? 'url(#presentGradient)' :
                    entry.name === 'Absent' ? 'url(#absentGradient)' :
                    'url(#lateGradient)'
                  }
                  strokeWidth={2}
                  stroke={entry.color}
                  className="transition-all duration-300 hover:opacity-90"
                />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Status Legend */}
      <div className="flex justify-center space-x-6 mt-6 pt-6 border-t border-dashed border-gray-300 dark:border-gray-700">
        {pieChartData.map((item, index) => (
          <div key={index} className="flex items-center space-x-2">
            <div 
              className="w-3 h-3 rounded-full"
              style={{ backgroundColor: item.color }}
            />
            <span className={combine("text-sm font-medium", get('text', 'secondary'))}>
              {item.name}
            </span>
          </div>
        ))}
      </div>
    </div>
  </div>
)}

        

              {/* Class Info Card - Updated to handle both overall and section views */}
              {attendanceData && (
  <div className={combine(getCardGradientClass('indigo'), "relative overflow-hidden group")}>
    {/* Decorative elements */}
    <div className="absolute -top-10 -right-10 w-40 h-40 opacity-10">
      <div className="absolute inset-0 bg-gradient-to-br from-indigo-500 to-purple-500 rounded-full blur-2xl"></div>
    </div>
    <div className="absolute -bottom-10 -left-10 w-32 h-32 opacity-5">
      <div className="absolute inset-0 bg-gradient-to-tr from-cyan-400 to-blue-400 rounded-full blur-xl"></div>
    </div>

    <div className="relative z-10">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h3 className={combine("text-2xl font-bold mb-2", get('text', 'primary'))}>
            {selectedSectionDetail ? 'Section Information' : 'Class Information'}
          </h3>
          <p className={combine("text-sm opacity-75", get('text', 'secondary'))}>
            {selectedSectionDetail 
              ? `Detailed overview of Class ${selectedClassName} - Section ${selectedSectionName}`
              : `Overall overview of Class ${selectedClassName} (All Sections)`}
          </p>
        </div>
        <div className={combine(
          "p-3 rounded-xl transform transition-transform duration-300 group-hover:scale-110",
          theme === 'dark' 
            ? 'bg-gradient-to-br from-indigo-900/40 to-purple-800/30 border border-indigo-800/30' 
            : 'bg-gradient-to-br from-indigo-100 to-purple-50 border border-indigo-200'
        )}>
          <IoIosSchool className={combine(
            "text-2xl",
            theme === 'dark' ? 'text-indigo-400' : 'text-indigo-600'
          )} />
        </div>
      </div>

      {/* Class Summary Grid */}
      <div className="grid grid-cols-2 gap-4 mb-6">
        <div className={combine(
          "p-4 rounded-xl border",
          theme === 'dark' 
            ? 'bg-gradient-to-br from-gray-800/50 to-indigo-900/10 border-indigo-800/30' 
            : 'bg-gradient-to-br from-white to-indigo-50/50 border-indigo-100'
        )}>
          <div className="flex items-center space-x-3">
            <div className={combine(
              "p-2 rounded-lg",
              theme === 'dark' ? 'bg-indigo-900/30' : 'bg-indigo-100'
            )}>
              <FiUsers className={combine(
                "text-lg",
                theme === 'dark' ? 'text-indigo-400' : 'text-indigo-600'
              )} />
            </div>
            <div>
              <p className={combine("text-xs font-medium", get('text', 'secondary'))}>
                {selectedSectionDetail ? 'Section Students' : 'Total Students'}
              </p>
              <p className={combine("text-xl font-bold mt-1", get('text', 'primary'))}>
                {selectedSectionDetail 
                  ? selectedSectionDetail.total_students 
                  : attendanceData.summary.Present + attendanceData.summary.Absent + 
                    attendanceData.summary.Late + attendanceData.summary['Not Marked']}
              </p>
            </div>
          </div>
        </div>

        <div className={combine(
          "p-4 rounded-xl border",
          theme === 'dark' 
            ? 'bg-gradient-to-br from-gray-800/50 to-blue-900/10 border-blue-800/30' 
            : 'bg-gradient-to-br from-white to-blue-50/50 border-blue-100'
        )}>
          <div className="flex items-center space-x-3">
            <div className={combine(
              "p-2 rounded-lg",
              theme === 'dark' ? 'bg-blue-900/30' : 'bg-blue-100'
            )}>
              <FaUserGraduate className={combine(
                "text-lg",
                theme === 'dark' ? 'text-blue-400' : 'text-blue-600'
              )} />
            </div>
            <div>
              <p className={combine("text-xs font-medium", get('text', 'secondary'))}>
                {selectedSectionDetail ? 'Present Students' : 'Total Present'}
              </p>
              <p className={combine("text-xl font-bold mt-1", get('text', 'primary'))}>
                {selectedSectionDetail 
                  ? selectedSectionDetail.present 
                  : attendanceData.summary.Present}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Main Information Cards */}
      <div className="space-y-4">
        {/* Class Teacher Card - Only show for section view */}
        {selectedSectionDetail && selectedSectionDetail.class_teacher && (
          <div className={combine(
            "p-4 rounded-xl border transform transition-all duration-300 hover:scale-[1.02]",
            theme === 'dark' 
              ? 'bg-gradient-to-r from-indigo-900/20 to-purple-900/10 border-indigo-800/40 hover:border-indigo-700/60' 
              : 'bg-gradient-to-r from-indigo-50/50 to-purple-50/30 border-indigo-200 hover:border-indigo-300'
          )}>
            <div className="flex items-center justify-between">
              <div>
                <p className={combine("text-xs font-medium uppercase tracking-wider", get('text', 'secondary'))}>Class Teacher</p>
                <p className={combine("text-lg font-semibold mt-1", get('accent', 'primary'))}>
                  {selectedSectionDetail.class_teacher.name}
                </p>
                {selectedSectionDetail.class_teacher.teacher_id && (
                  <p className={combine("text-xs mt-1", get('text', 'tertiary'))}>
                    ID: {selectedSectionDetail.class_teacher.teacher_id}
                  </p>
                )}
              </div>
              <div className={combine(
                "p-2 rounded-lg",
                theme === 'dark' ? 'bg-purple-900/30' : 'bg-purple-100'
              )}>
                <FaUserGraduate className={combine(
                  "text-xl",
                  theme === 'dark' ? 'text-purple-400' : 'text-purple-600'
                )} />
              </div>
            </div>
          </div>
        )}

        {/* Attendance Rate Card with Animation */}
        <div className={combine(
          "p-4 rounded-xl border relative overflow-hidden",
          theme === 'dark' 
            ? 'bg-gradient-to-r from-emerald-900/20 to-green-900/10 border-emerald-800/40' 
            : 'bg-gradient-to-r from-emerald-50/50 to-green-50/30 border-emerald-200'
        )}>
          {/* Animated background ring */}
          <div className="absolute top-0 right-0 w-24 h-24 opacity-10">
            <div className="absolute inset-0 bg-gradient-to-br from-emerald-400 to-green-500 rounded-full"></div>
          </div>
          
          <div className="relative z-10">
            <div className="flex items-center justify-between">
              <div>
                <p className={combine("text-xs font-medium uppercase tracking-wider", get('text', 'secondary'))}>
                  {selectedSectionDetail ? 'Section Attendance Rate' : 'Class Attendance Rate'}
                </p>
                <div className="flex items-baseline space-x-2 mt-1">
                  {selectedSectionDetail ? (
                    <>
                      <p className={combine("text-3xl font-bold", get('accent', 'success'))}>
                        {selectedSectionDetail.attendance_percentage}%
                      </p>
                      <div className={combine(
                        "px-2 py-1 rounded-full text-xs font-medium",
                        selectedSectionDetail.attendance_percentage >= 80 
                          ? (theme === 'dark' ? 'bg-emerald-900/30 text-emerald-300' : 'bg-emerald-100 text-emerald-700')
                          : selectedSectionDetail.attendance_percentage >= 60
                          ? (theme === 'dark' ? 'bg-amber-900/30 text-amber-300' : 'bg-amber-100 text-amber-700')
                          : (theme === 'dark' ? 'bg-red-900/30 text-red-300' : 'bg-red-100 text-red-700')
                      )}>
                        {selectedSectionDetail.attendance_percentage >= 80 ? 'Excellent' 
                         : selectedSectionDetail.attendance_percentage >= 60 ? 'Good' 
                         : 'Needs Improvement'}
                      </div>
                    </>
                  ) : (
                    <>
                      <p className={combine("text-3xl font-bold", get('accent', 'success'))}>
                        {Math.round((attendanceData.summary.Present / 
                          (attendanceData.summary.Present + attendanceData.summary.Absent + 
                           attendanceData.summary.Late + attendanceData.summary['Not Marked'])) * 100)}%
                      </p>
                      <div className={combine(
                        "px-2 py-1 rounded-full text-xs font-medium",
                        (attendanceData.summary.Present / 
                         (attendanceData.summary.Present + attendanceData.summary.Absent + 
                          attendanceData.summary.Late + attendanceData.summary['Not Marked']) * 100) >= 80 
                          ? (theme === 'dark' ? 'bg-emerald-900/30 text-emerald-300' : 'bg-emerald-100 text-emerald-700')
                          : (attendanceData.summary.Present / 
                             (attendanceData.summary.Present + attendanceData.summary.Absent + 
                              attendanceData.summary.Late + attendanceData.summary['Not Marked']) * 100) >= 60
                          ? (theme === 'dark' ? 'bg-amber-900/30 text-amber-300' : 'bg-amber-100 text-amber-700')
                          : (theme === 'dark' ? 'bg-red-900/30 text-red-300' : 'bg-red-100 text-red-700')
                      )}>
                        {(attendanceData.summary.Present / 
                          (attendanceData.summary.Present + attendanceData.summary.Absent + 
                           attendanceData.summary.Late + attendanceData.summary['Not Marked']) * 100) >= 80 ? 'Excellent' 
                         : (attendanceData.summary.Present / 
                            (attendanceData.summary.Present + attendanceData.summary.Absent + 
                             attendanceData.summary.Late + attendanceData.summary['Not Marked']) * 100) >= 60 ? 'Good' 
                         : 'Needs Improvement'}
                      </div>
                    </>
                  )}
                </div>
              </div>
              <div className="relative">
                {/* Circular progress indicator */}
                <div className="w-16 h-16 relative">
                  <svg className="w-full h-full transform -rotate-90" viewBox="0 0 36 36">
                    <path
                      d="M18 2.0845
                        a 15.9155 15.9155 0 0 1 0 31.831
                        a 15.9155 15.9155 0 0 1 0 -31.831"
                      fill="none"
                      stroke={theme === 'dark' ? '#374151' : '#e5e7eb'}
                      strokeWidth="2"
                    />
                    <path
                      d="M18 2.0845
                        a 15.9155 15.9155 0 0 1 0 31.831
                        a 15.9155 15.9155 0 0 1 0 -31.831"
                      fill="none"
                      stroke={selectedSectionDetail 
                        ? (selectedSectionDetail.attendance_percentage >= 80 ? '#10B981' 
                           : selectedSectionDetail.attendance_percentage >= 60 ? '#F59E0B' 
                           : '#EF4444')
                        : ((attendanceData.summary.Present / 
                            (attendanceData.summary.Present + attendanceData.summary.Absent + 
                             attendanceData.summary.Late + attendanceData.summary['Not Marked']) * 100) >= 80 ? '#10B981' 
                           : (attendanceData.summary.Present / 
                              (attendanceData.summary.Present + attendanceData.summary.Absent + 
                               attendanceData.summary.Late + attendanceData.summary['Not Marked']) * 100) >= 60 ? '#F59E0B' 
                           : '#EF4444')}
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeDasharray={`${
                        selectedSectionDetail 
                          ? selectedSectionDetail.attendance_percentage
                          : Math.round((attendanceData.summary.Present / 
                              (attendanceData.summary.Present + attendanceData.summary.Absent + 
                               attendanceData.summary.Late + attendanceData.summary['Not Marked'])) * 100)
                      }, 100`}
                    />
                  </svg>
                  <div className="absolute inset-0 flex items-center justify-center">
                    <span className={combine(
                      "text-sm font-bold",
                      selectedSectionDetail 
                        ? (selectedSectionDetail.attendance_percentage >= 80 
                            ? (theme === 'dark' ? 'text-emerald-300' : 'text-emerald-600')
                            : selectedSectionDetail.attendance_percentage >= 60
                            ? (theme === 'dark' ? 'text-amber-300' : 'text-amber-600')
                            : (theme === 'dark' ? 'text-red-300' : 'text-red-600'))
                        : ((attendanceData.summary.Present / 
                            (attendanceData.summary.Present + attendanceData.summary.Absent + 
                             attendanceData.summary.Late + attendanceData.summary['Not Marked']) * 100) >= 80 
                            ? (theme === 'dark' ? 'text-emerald-300' : 'text-emerald-600')
                            : (attendanceData.summary.Present / 
                               (attendanceData.summary.Present + attendanceData.summary.Absent + 
                                attendanceData.summary.Late + attendanceData.summary['Not Marked']) * 100) >= 60
                            ? (theme === 'dark' ? 'text-amber-300' : 'text-amber-600')
                            : (theme === 'dark' ? 'text-red-300' : 'text-red-600'))
                    )}>
                      {selectedSectionDetail 
                        ? selectedSectionDetail.attendance_percentage
                        : Math.round((attendanceData.summary.Present / 
                            (attendanceData.summary.Present + attendanceData.summary.Absent + 
                             attendanceData.summary.Late + attendanceData.summary['Not Marked'])) * 100)
                      }%
                    </span>
                  </div>
                </div>
              </div>
            </div>
            
            {/* Progress bar */}
            <div className="mt-4">
              <div className={combine(
                "w-full h-2 rounded-full overflow-hidden",
                theme === 'dark' ? 'bg-gray-800' : 'bg-gray-200'
              )}>
                <div 
                  className={combine(
                    "h-full rounded-full transition-all duration-1000 ease-out",
                    selectedSectionDetail 
                      ? (selectedSectionDetail.attendance_percentage >= 80 
                          ? (theme === 'dark' ? 'bg-gradient-to-r from-emerald-500 to-green-400' : 'bg-gradient-to-r from-emerald-400 to-green-300')
                          : selectedSectionDetail.attendance_percentage >= 60
                          ? (theme === 'dark' ? 'bg-gradient-to-r from-amber-500 to-yellow-400' : 'bg-gradient-to-r from-amber-400 to-yellow-300')
                          : (theme === 'dark' ? 'bg-gradient-to-r from-red-500 to-pink-400' : 'bg-gradient-to-r from-red-400 to-pink-300'))
                      : ((attendanceData.summary.Present / 
                          (attendanceData.summary.Present + attendanceData.summary.Absent + 
                           attendanceData.summary.Late + attendanceData.summary['Not Marked']) * 100) >= 80 
                          ? (theme === 'dark' ? 'bg-gradient-to-r from-emerald-500 to-green-400' : 'bg-gradient-to-r from-emerald-400 to-green-300')
                          : (attendanceData.summary.Present / 
                             (attendanceData.summary.Present + attendanceData.summary.Absent + 
                              attendanceData.summary.Late + attendanceData.summary['Not Marked']) * 100) >= 60
                          ? (theme === 'dark' ? 'bg-gradient-to-r from-amber-500 to-yellow-400' : 'bg-gradient-to-r from-amber-400 to-yellow-300')
                          : (theme === 'dark' ? 'bg-gradient-to-r from-red-500 to-pink-400' : 'bg-gradient-to-r from-red-400 to-pink-300'))
                  )}
                  style={{ 
                    width: `${selectedSectionDetail 
                      ? selectedSectionDetail.attendance_percentage
                      : Math.round((attendanceData.summary.Present / 
                          (attendanceData.summary.Present + attendanceData.summary.Absent + 
                           attendanceData.summary.Late + attendanceData.summary['Not Marked'])) * 100)
                    }%` 
                  }}
                ></div>
              </div>
            </div>
          </div>
        </div>

        {/* Date and Class Info Card */}
        <div className="grid grid-cols-2 gap-4">
          <div className={combine(
            "p-4 rounded-xl border",
            theme === 'dark' 
              ? 'bg-gradient-to-br from-gray-800/50 to-blue-900/10 border-blue-800/30' 
              : 'bg-gradient-to-br from-white to-blue-50/50 border-blue-100'
          )}>
            <div className="flex items-center space-x-3">
              <div className={combine(
                "p-2 rounded-lg",
                theme === 'dark' ? 'bg-blue-900/30' : 'bg-blue-100'
              )}>
                <FiCalendar className={combine(
                  "text-lg",
                  theme === 'dark' ? 'text-blue-400' : 'text-blue-600'
                )} />
              </div>
              <div>
                <p className={combine("text-xs font-medium", get('text', 'secondary'))}>Date</p>
                <p className={combine("text-sm font-semibold mt-1", get('text', 'primary'))}>
                  {new Date(selectedDate).toLocaleDateString('en-US', {
                    weekday: 'short',
                    month: 'short',
                    day: 'numeric',
                    year: 'numeric'
                  })}
                </p>
              </div>
            </div>
          </div>

          <div className={combine(
            "p-4 rounded-xl border",
            theme === 'dark' 
              ? 'bg-gradient-to-br from-gray-800/50 to-purple-900/10 border-purple-800/30' 
              : 'bg-gradient-to-br from-white to-purple-50/50 border-purple-100'
          )}>
            <div className="flex items-center space-x-3">
              <div className={combine(
                "p-2 rounded-lg",
                theme === 'dark' ? 'bg-purple-900/30' : 'bg-purple-100'
              )}>
                <IoIosSchool className={combine(
                  "text-lg",
                  theme === 'dark' ? 'text-purple-400' : 'text-purple-600'
                )} />
              </div>
              <div>
                <p className={combine("text-xs font-medium", get('text', 'secondary'))}>
                  {selectedSectionDetail ? 'Class & Section' : 'Class'}
                </p>
                <p className={combine("text-sm font-bold mt-1", get('accent', 'primary'))}>
                  {selectedClassName} {selectedSectionDetail ? `- ${selectedSectionName}` : '(All Sections)'}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Unmarked Students Alert */}
        {(selectedSectionDetail ? selectedSectionDetail.unmarked : attendanceData.summary['Not Marked']) > 0 && (
          <div className={combine(
            "p-4 rounded-xl border mt-4",
            theme === 'dark' 
              ? 'bg-gradient-to-r from-amber-900/20 to-yellow-900/10 border-amber-800/40' 
              : 'bg-gradient-to-r from-amber-50/50 to-yellow-50/30 border-amber-200'
          )}>
            <div className="flex items-center space-x-3">
              <div className={combine(
                "p-2 rounded-lg flex-shrink-0",
                theme === 'dark' ? 'bg-amber-900/30' : 'bg-amber-100'
              )}>
                <FaExclamationTriangle className={combine(
                  "text-lg",
                  theme === 'dark' ? 'text-amber-400' : 'text-amber-600'
                )} />
              </div>
              <div>
                <p className={combine("text-sm font-medium", get('accent', 'warning'))}>
                  {(selectedSectionDetail ? selectedSectionDetail.unmarked : attendanceData.summary['Not Marked'])} student(s) not marked
                </p>
                <p className={combine("text-xs mt-1", get('text', 'secondary'))}>
                  Update attendance status in the table below
                </p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  </div>
)}
            </div>

           
          </>
        )}
      </div>
    </div>
  );
};
