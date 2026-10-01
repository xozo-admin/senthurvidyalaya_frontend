// components/schedule-management-fixed.tsx
'use client';

import { useState, useEffect } from 'react';
import {
  FaCalendarAlt,
  FaPlus,
  FaEdit,
  FaTrash,
  FaClock,
  FaChalkboardTeacher,
  FaBook,
  FaSearch,
  FaFilter,
  FaSync,
  FaPrint,
  FaTimes,
  FaSave,
  FaCheck,
  FaUser,
  FaExchangeAlt,
  FaUserClock
} from 'react-icons/fa';

interface TimetableSlot {
  id: number;
  day: string;
  period_no: number;
  start_time: string;
  end_time: string;
  subject: { name: string; id: number };
  teacher: { name: string; teacher_id: string; id: number };
  section: {
    name: string;
    id: number;
    standard: { name: string; id: number };
  };
}

interface Substitution {
  id: number;
  slot: TimetableSlot;
  date: string;
  substitute_teacher: { name: string; teacher_id: string };
  subject?: { name: string };
  created_at: string;
}

export const ScheduleManagementPage = () => {
  const [view, setView] = useState<'timetable' | 'substitutions'>('timetable');
  const [slots, setSlots] = useState<TimetableSlot[]>([]);
  const [substitutions, setSubstitutions] = useState<Substitution[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedClass, setSelectedClass] = useState('');
  const [selectedSection, setSelectedSection] = useState('');
  const [selectedDay, setSelectedDay] = useState('Monday');
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  
  // States for dropdowns
  const [standards, setStandards] = useState<any[]>([]);
  const [sections, setSections] = useState<any[]>([]);
  const [teachers, setTeachers] = useState<any[]>([]);
  
  // Modal states
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showSubstitutionModal, setShowSubstitutionModal] = useState(false);
  const [showFreeTeachersModal, setShowFreeTeachersModal] = useState(false);
  
  // Form states
  const [formData, setFormData] = useState({
    class_name: '',
    section: '',
    day: 'Monday',
    timetable: [{
      period_no: 1,
      start_time: '09:00',
      end_time: '09:45',
      subject: '',
      teacher_id: ''
    }]
  });

  const [substitutionForm, setSubstitutionForm] = useState({
    period_no: '',
    subject: '',
    teacher_id: '',
    date: new Date().toISOString().split('T')[0]
  });

  const [freeTeachers, setFreeTeachers] = useState<any[]>([]);

  /* ========== FETCH DATA ========== */
  
  // Fetch Standards
  const fetchStandards = async () => {
    try {
      const token = localStorage.getItem('token');
      const res = await fetch('https://senthurvidyalaya-backend.onrender.com/api/academics/standards/', {
        headers: { Authorization: `Token ${token}` },
      });
      
      if (res.ok) {
        const data = await res.json();
        setStandards(data || []);
      }
    } catch (error) {
      console.error('Error fetching standards:', error);
    }
  };

  // Fetch Sections
  const fetchSections = async (className: string) => {
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`https://senthurvidyalaya-backend.onrender.com/api/academics/sections/?standard_id=${className}`, {
        headers: { Authorization: `Token ${token}` },
      });
      
      if (res.ok) {
        const data = await res.json();
        setSections(data || []);
      }
    } catch (error) {
      console.error('Error fetching sections:', error);
    }
  };

  // Fetch Teachers
  const fetchTeachers = async () => {
    try {
      const token = localStorage.getItem('token');
      const res = await fetch('https://senthurvidyalaya-backend.onrender.com/api/setup/teachers/', {
        headers: { Authorization: `Token ${token}` },
      });
      
      if (res.ok) {
        const data = await res.json();
        setTeachers(data || []);
      }
    } catch (error) {
      console.error('Error fetching teachers:', error);
    }
  };

  // Fetch Timetable
  const fetchTimetable = async () => {
    if (!selectedClass || !selectedSection) return;
    
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(
        `https://senthurvidyalaya-backend.onrender.com/api/timetable/manage/?class=${selectedClass}&section=${selectedSection}`,
        {
          headers: { Authorization: `Token ${token}` },
        }
      );
      
      if (res.ok) {
        const data = await res.json();
        console.log('Timetable data:', data);
        
        if (data.timetable) {
          // Convert API response to our format
          const allSlots: TimetableSlot[] = [];
          Object.keys(data.timetable).forEach(day => {
            const daySlots = data.timetable[day];
            daySlots.forEach((slot: any) => {
              allSlots.push({
                id: slot.original_slot_id || Math.random(),
                day: day,
                period_no: slot.period,
                start_time: slot.time?.split(' - ')[0] || '09:00',
                end_time: slot.time?.split(' - ')[1] || '09:45',
                subject: { name: slot.subject, id: 0 },
                teacher: { 
                  name: slot.teacher?.split(' (')[0] || 'No Teacher', 
                  teacher_id: slot.teacher?.match(/\(([^)]+)\)/)?.[1] || '',
                  id: 0
                },
                section: {
                  name: selectedSection,
                  id: 0,
                  standard: { name: selectedClass, id: 0 }
                }
              });
            });
          });
          setSlots(allSlots);
        }
      } else {
        console.error('Failed to fetch timetable:', await res.text());
      }
    } catch (error) {
      console.error('Error fetching timetable:', error);
    } finally {
      setLoading(false);
    }
  };

  // Fetch Substitutions
  const fetchSubstitutions = async () => {
    if (!selectedClass || !selectedSection || !selectedDate) return;
    
    try {
      const token = localStorage.getItem('token');
      // Using teacher timetable view with date param to get substitutions
      const res = await fetch(
        `https://senthurvidyalaya-backend.onrender.com/api/timetable/teacher/my-class-timetable/?date=${selectedDate}`,
        {
          headers: { Authorization: `Token ${token}` },
        }
      );
      
      if (res.ok) {
        const data = await res.json();
        console.log('Substitution data:', data);
      }
    } catch (error) {
      console.error('Error fetching substitutions:', error);
    }
  };

  // Fetch Free Teachers
  const fetchFreeTeachers = async () => {
    if (!selectedDate || !substitutionForm.period_no) return;
    
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(
        `https://senthurvidyalaya-backend.onrender.com/api/timetable/substitution/free-teachers/?date=${selectedDate}&period=${substitutionForm.period_no}`,
        {
          headers: { Authorization: `Token ${token}` },
        }
      );
      
      if (res.ok) {
        const data = await res.json();
        setFreeTeachers(data.teachers || []);
        setShowFreeTeachersModal(true);
      }
    } catch (error) {
      console.error('Error fetching free teachers:', error);
    }
  };

  /* ========== CRUD OPERATIONS ========== */
  
  // Create Timetable
  const createTimetable = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      const res = await fetch('https://senthurvidyalaya-backend.onrender.com/api/timetable/create/', {
        method: 'POST',
        headers: {
          Authorization: `Token ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      });

      if (res.ok) {
        alert('Timetable created successfully!');
        setShowCreateModal(false);
        fetchTimetable();
        resetForm();
      } else {
        const error = await res.json();
        alert(error.error || 'Failed to create timetable');
      }
    } catch (error) {
      console.error('Error:', error);
      alert('Failed to create timetable');
    } finally {
      setLoading(false);
    }
  };

  // Assign Substitution
  const assignSubstitution = async () => {
    if (!substitutionForm.period_no || !substitutionForm.teacher_id) {
      alert('Please select period and teacher');
      return;
    }

    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(
        `https://senthurvidyalaya-backend.onrender.com/api/timetable/substitution/assign/?date=${selectedDate}`,
        {
          method: 'POST',
          headers: {
            Authorization: `Token ${token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(substitutionForm),
        }
      );

      if (res.ok) {
        const data = await res.json();
        alert(data.message || 'Substitution assigned successfully!');
        setShowSubstitutionModal(false);
        setSubstitutionForm({
          period_no: '',
          subject: '',
          teacher_id: '',
          date: new Date().toISOString().split('T')[0]
        });
        fetchSubstitutions();
      } else {
        const error = await res.json();
        alert(error.error || 'Failed to assign substitution');
      }
    } catch (error) {
      console.error('Error:', error);
      alert('Failed to assign substitution');
    } finally {
      setLoading(false);
    }
  };

  /* ========== HELPER FUNCTIONS ========== */
  
  const resetForm = () => {
    setFormData({
      class_name: '',
      section: '',
      day: 'Monday',
      timetable: [{
        period_no: 1,
        start_time: '09:00',
        end_time: '09:45',
        subject: '',
        teacher_id: ''
      }]
    });
  };

  const handleFormChange = (periodIndex: number, field: string, value: string) => {
    const updatedTimetable = [...formData.timetable];
    updatedTimetable[periodIndex] = {
      ...updatedTimetable[periodIndex],
      [field]: value
    };
    setFormData({ ...formData, timetable: updatedTimetable });
  };

  const addPeriod = () => {
    const newPeriod = {
      period_no: formData.timetable.length + 1,
      start_time: '09:00',
      end_time: '09:45',
      subject: '',
      teacher_id: ''
    };
    setFormData({
      ...formData,
      timetable: [...formData.timetable, newPeriod]
    });
  };

  const removePeriod = (index: number) => {
    const updatedTimetable = formData.timetable.filter((_, i) => i !== index);
    setFormData({ ...formData, timetable: updatedTimetable });
  };

  const getPeriodTime = (period: number) => {
    const times = [
      '09:00 - 09:45',
      '09:45 - 10:30',
      '10:45 - 11:30',
      '11:30 - 12:15',
      '13:00 - 13:45',
      '13:45 - 14:30',
      '14:45 - 15:30',
      '15:30 - 16:15'
    ];
    return times[period - 1] || '--:-- - --:--';
  };

  /* ========== USE EFFECTS ========== */
  
  useEffect(() => {
    fetchStandards();
    fetchTeachers();
  }, []);

  useEffect(() => {
    if (selectedClass) {
      fetchSections(selectedClass);
    }
  }, [selectedClass]);

  useEffect(() => {
    if (selectedClass && selectedSection) {
      if (view === 'timetable') {
        fetchTimetable();
      } else {
        fetchSubstitutions();
      }
    }
  }, [selectedClass, selectedSection, view, selectedDate]);

  /* ========== RENDER ========== */
  
  // Group slots by day
  const groupedSlots = slots.reduce((acc, slot) => {
    if (!acc[slot.day]) acc[slot.day] = [];
    acc[slot.day].push(slot);
    return acc;
  }, {} as Record<string, TimetableSlot[]>);

  const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  const periods = Array.from({ length: 8 }, (_, i) => i + 1);

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-indigo-50/30 p-4 md:p-6">
      {/* Header */}
      <div className="mb-6 md:mb-8">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-gradient-to-r from-indigo-500 to-purple-600 rounded-xl shadow-lg">
              <FaCalendarAlt className="text-white text-xl" />
            </div>
            <div>
              <h1 className="text-2xl md:text-3xl font-bold text-gray-900">Schedule Management</h1>
              <p className="text-gray-600 mt-1">Manage timetables and teacher substitutions</p>
            </div>
          </div>
          
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => setShowCreateModal(true)}
              className="px-4 py-2.5 bg-gradient-to-r from-indigo-500 to-indigo-600 text-white rounded-xl hover:from-indigo-600 hover:to-indigo-700 transition-all duration-200 flex items-center gap-2 font-medium shadow-lg hover:shadow"
            >
              <FaPlus /> Create Schedule
            </button>
          </div>
        </div>

        {/* View Toggle */}
        <div className="bg-white rounded-xl border border-gray-200 p-1 mb-6 shadow-sm inline-flex">
          <button
            onClick={() => setView('timetable')}
            className={`px-4 py-2.5 rounded-lg ${view === 'timetable' 
              ? 'bg-gradient-to-r from-indigo-500 to-indigo-600 text-white shadow' 
              : 'text-gray-700 hover:bg-gray-50'}`}
          >
            <FaCalendarAlt className="inline mr-2" /> Timetable
          </button>
          <button
            onClick={() => setView('substitutions')}
            className={`px-4 py-2.5 rounded-lg ${view === 'substitutions' 
              ? 'bg-gradient-to-r from-purple-500 to-purple-600 text-white shadow' 
              : 'text-gray-700 hover:bg-gray-50'}`}
          >
            <FaExchangeAlt className="inline mr-2" /> Substitutions
          </button>
        </div>

        {/* Filters */}
        <div className="bg-white rounded-xl border border-gray-200 p-4 mb-6 shadow-sm">
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
            <div>
              <label className="block text-sm mb-2 font-medium text-gray-700">Class</label>
              <select
                value={selectedClass}
                onChange={(e) => {
                  setSelectedClass(e.target.value);
                  setSelectedSection('');
                }}
                className="w-full px-3 py-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all"
              >
                <option value="">Select Class</option>
                {standards.map(cls => (
                  <option key={cls.id} value={cls.name}>{cls.name}</option>
                ))}
              </select>
            </div>
            
            <div>
              <label className="block text-sm mb-2 font-medium text-gray-700">Section</label>
              <select
                value={selectedSection}
                onChange={(e) => setSelectedSection(e.target.value)}
                disabled={!selectedClass}
                className="w-full px-3 py-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all disabled:bg-gray-100"
              >
                <option value="">Select Section</option>
                {sections.map(sec => (
                  <option key={sec.id} value={sec.name}>{sec.name}</option>
                ))}
              </select>
            </div>
            
            {view === 'substitutions' && (
              <div>
                <label className="block text-sm mb-2 font-medium text-gray-700">Date</label>
                <input
                  type="date"
                  value={selectedDate}
                  onChange={(e) => setSelectedDate(e.target.value)}
                  className="w-full px-3 py-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-purple-500 outline-none transition-all"
                />
              </div>
            )}
            
            {view === 'timetable' && (
              <div>
                <label className="block text-sm mb-2 font-medium text-gray-700">Day</label>
                <select
                  value={selectedDay}
                  onChange={(e) => setSelectedDay(e.target.value)}
                  className="w-full px-3 py-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all"
                >
                  {days.map(day => (
                    <option key={day} value={day}>{day}</option>
                  ))}
                </select>
              </div>
            )}
            
            <div className="flex items-end">
              <button
                onClick={view === 'timetable' ? fetchTimetable : fetchSubstitutions}
                disabled={!selectedClass || !selectedSection}
                className="w-full px-4 py-2.5 bg-gradient-to-r from-gray-600 to-gray-700 text-white rounded-xl hover:from-gray-700 hover:to-gray-800 transition-all duration-200 flex items-center justify-center gap-2 disabled:opacity-50"
              >
                <FaSync /> Refresh
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      {view === 'timetable' ? (
        <TimetableView 
          loading={loading}
          selectedClass={selectedClass}
          selectedSection={selectedSection}
          days={days}
          periods={periods}
          groupedSlots={groupedSlots}
          getPeriodTime={getPeriodTime}
          onSubstitutionClick={() => setShowSubstitutionModal(true)}
        />
      ) : (
        <SubstitutionsView 
          selectedDate={selectedDate}
          onAssignSubstitution={() => setShowSubstitutionModal(true)}
        />
      )}

      {/* Modals */}
      <CreateScheduleModal
        show={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        formData={formData}
        setFormData={setFormData}
        standards={standards}
        sections={sections}
        teachers={teachers}
        loading={loading}
        handleFormChange={handleFormChange}
        addPeriod={addPeriod}
        removePeriod={removePeriod}
        onSubmit={createTimetable}
      />

      <SubstitutionModal
        show={showSubstitutionModal}
        onClose={() => setShowSubstitutionModal(false)}
        formData={substitutionForm}
        setFormData={setSubstitutionForm}
        selectedClass={selectedClass}
        selectedSection={selectedSection}
        selectedDate={selectedDate}
        loading={loading}
        onFindTeachers={fetchFreeTeachers}
        onSubmit={assignSubstitution}
      />

      <FreeTeachersModal
        show={showFreeTeachersModal}
        onClose={() => setShowFreeTeachersModal(false)}
        teachers={freeTeachers}
        onSelectTeacher={(teacherId: any) => {
          setSubstitutionForm({...substitutionForm, teacher_id: teacherId});
          setShowFreeTeachersModal(false);
        }}
      />
    </div>
  );
};

/* ========== SUBCOMPONENTS ========== */

const TimetableView = ({ 
  loading, 
  selectedClass, 
  selectedSection, 
  days, 
  periods, 
  groupedSlots, 
  getPeriodTime,
  onSubstitutionClick 
}: any) => (
  <div className="bg-white rounded-xl border border-gray-200 overflow-hidden shadow-lg">
    {loading ? (
      <div className="p-12 text-center">
        <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mb-4"></div>
        <p className="text-gray-600">Loading timetable...</p>
      </div>
    ) : !selectedClass || !selectedSection ? (
      <EmptyState
        icon={<FaCalendarAlt className="text-4xl text-gray-400" />}
        title="No Class/Section Selected"
        message="Please select a class and section to view timetable"
      />
    ) : Object.keys(groupedSlots).length === 0 ? (
      <EmptyState
        icon={<FaCalendarAlt className="text-4xl text-gray-400" />}
        title="No Timetable Found"
        message="Create a timetable for this class and section"
      />
    ) : (
      <div className="overflow-x-auto">
        <table className="min-w-full">
          <thead className="bg-gradient-to-r from-indigo-50 to-purple-50">
            <tr>
              <th className="px-6 py-4 text-left font-semibold text-gray-700">Period</th>
              <th className="px-6 py-4 text-left font-semibold text-gray-700">Time</th>
              {days.map((day:any) => (
                <th key={day} className="px-6 py-4 text-center font-semibold text-gray-700">
                  {day}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {periods.map((period:any) => (
              <tr key={period} className="hover:bg-gray-50 transition-colors border-b">
                <td className="px-6 py-4 text-center font-medium text-gray-900">
                  {period}
                </td>
                <td className="px-6 py-4 text-center text-sm text-gray-600">
                  {getPeriodTime(period)}
                </td>
                {days.map((day:any) => {
                  const slot = groupedSlots[day]?.find((s:any) => s.period_no === period);
                  return (
                    <td key={`${day}-${period}`} className="px-4 py-3">
                      {slot ? (
                        <div className="bg-gradient-to-r from-indigo-50 to-indigo-100 rounded-xl p-3 border border-indigo-200 hover:shadow transition-shadow">
                          <div className="font-semibold text-gray-900">{slot.subject.name}</div>
                          <div className="text-sm text-gray-700 mt-1 flex items-center gap-1">
                            <FaChalkboardTeacher className="text-gray-500" />
                            <span>{slot.teacher.name}</span>
                          </div>
                          <div className="text-xs text-gray-600 mt-2 flex items-center justify-between">
                            <span className="flex items-center gap-1">
                              <FaClock />
                              {slot.start_time} - {slot.end_time}
                            </span>
                            <button
                              onClick={onSubstitutionClick}
                              className="text-xs px-2 py-1 bg-purple-100 text-purple-700 rounded hover:bg-purple-200 transition-colors"
                              title="Assign Substitute"
                            >
                              <FaExchangeAlt />
                            </button>
                          </div>
                        </div>
                      ) : (
                        <div className="text-center p-4 text-gray-400 border border-dashed border-gray-300 rounded-lg bg-gray-50">
                          Free period
                        </div>
                      )}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    )}
  </div>
);

const SubstitutionsView = ({ selectedDate, onAssignSubstitution }: any) => (
  <div className="space-y-6">
    <div className="bg-gradient-to-r from-purple-50 to-pink-50 rounded-xl p-6 border border-purple-200">
      <div className="flex justify-between items-center mb-4">
        <div>
          <h3 className="text-lg font-semibold text-gray-900">Substitutions for {selectedDate}</h3>
          <p className="text-gray-600">Manage teacher substitutions for selected date</p>
        </div>
        <button
          onClick={onAssignSubstitution}
          className="px-4 py-2.5 bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-xl hover:from-purple-600 hover:to-pink-600 transition-all flex items-center gap-2"
        >
          <FaExchangeAlt /> Assign Substitution
        </button>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {[1, 2, 3].map(i => (
          <div key={i} className="bg-white rounded-lg p-4 border shadow-sm">
            <div className="flex justify-between items-start mb-3">
              <div>
                <span className="px-2 py-1 bg-blue-100 text-blue-700 text-xs rounded">Period {i}</span>
                <h4 className="font-medium text-gray-900 mt-2">Mathematics</h4>
              </div>
              <span className="text-xs px-2 py-1 bg-amber-100 text-amber-700 rounded">Substituted</span>
            </div>
            <div className="space-y-2">
              <div className="flex items-center text-sm">
                <FaUser className="text-gray-400 mr-2" />
                <span className="text-gray-600">Original: Mr. Rajesh</span>
              </div>
              <div className="flex items-center text-sm">
                <FaUserClock className="text-green-500 mr-2" />
                <span className="text-gray-900 font-medium">Substitute: Ms. Priya</span>
              </div>
              <div className="text-xs text-gray-500">Assigned: Today 10:30 AM</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  </div>
);

const EmptyState = ({ icon, title, message }: any) => (
  <div className="p-12 text-center">
    <div className="inline-block p-4 bg-gradient-to-r from-gray-100 to-gray-200 rounded-full mb-4">
      {icon}
    </div>
    <h3 className="text-lg font-medium text-gray-900 mb-2">{title}</h3>
    <p className="text-gray-600 mb-6">{message}</p>
  </div>
);

const CreateScheduleModal = ({ 
  show, 
  onClose, 
  formData, 
  setFormData, 
  standards, 
  sections, 
  teachers, 
  loading, 
  handleFormChange, 
  addPeriod, 
  removePeriod, 
  onSubmit 
}: any) => (
  show && (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-2xl p-6 max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-bold text-gray-900">Create Timetable</h2>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-lg">
            <FaTimes className="text-gray-500" />
          </button>
        </div>
        
        <div className="space-y-6">
          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Class *</label>
              <select
                value={formData.class_name}
                onChange={(e) => setFormData({...formData, class_name: e.target.value})}
                className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-indigo-500"
              >
                <option value="">Select Class</option>
                {standards.map((c: any) => (
                  <option key={c.id} value={c.name}>{c.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Section *</label>
              <select
                value={formData.section}
                onChange={(e) => setFormData({...formData, section: e.target.value})}
                className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-indigo-500"
              >
                <option value="">Select Section</option>
                {sections.map((s: any) => (
                  <option key={s.id} value={s.name}>{s.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Day *</label>
              <select
                value={formData.day}
                onChange={(e) => setFormData({...formData, day: e.target.value})}
                className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-indigo-500"
              >
                <option value="Monday">Monday</option>
                <option value="Tuesday">Tuesday</option>
                <option value="Wednesday">Wednesday</option>
                <option value="Thursday">Thursday</option>
                <option value="Friday">Friday</option>
                <option value="Saturday">Saturday</option>
              </select>
            </div>
          </div>

          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <h3 className="text-lg font-medium text-gray-900">Periods</h3>
              <button
                type="button"
                onClick={addPeriod}
                className="px-4 py-2 text-indigo-600 hover:bg-indigo-50 rounded-xl flex items-center gap-2"
              >
                <FaPlus /> Add Period
              </button>
            </div>
            
            {formData.timetable.map((period: any, index: number) => (
              <div key={index} className="border border-gray-200 p-4 rounded-xl bg-gray-50">
                <div className="flex justify-between items-center mb-4">
                  <div className="font-medium text-gray-900">Period {period.period_no}</div>
                  {formData.timetable.length > 1 && (
                    <button
                      type="button"
                      onClick={() => removePeriod(index)}
                      className="p-1 text-red-600 hover:bg-red-50 rounded"
                    >
                      <FaTimes />
                    </button>
                  )}
                </div>
                <div className="grid grid-cols-4 gap-4">
                  <div>
                    <label className="block text-sm text-gray-700 mb-1">Start Time</label>
                    <input
                      type="time"
                      value={period.start_time}
                      onChange={(e) => handleFormChange(index, 'start_time', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                    />
                  </div>
                  <div>
                    <label className="block text-sm text-gray-700 mb-1">End Time</label>
                    <input
                      type="time"
                      value={period.end_time}
                      onChange={(e) => handleFormChange(index, 'end_time', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                    />
                  </div>
                  <div>
                    <label className="block text-sm text-gray-700 mb-1">Subject *</label>
                    <input
                      type="text"
                      value={period.subject}
                      onChange={(e) => handleFormChange(index, 'subject', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                      placeholder="Mathematics"
                    />
                  </div>
                  <div>
                    <label className="block text-sm text-gray-700 mb-1">Teacher ID *</label>
                    <input
                      type="text"
                      value={period.teacher_id}
                      onChange={(e) => handleFormChange(index, 'teacher_id', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                      placeholder="TCH001"
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="flex gap-3 mt-6 pt-6 border-t border-gray-200">
          <button
            onClick={onClose}
            className="flex-1 px-4 py-3 border border-gray-300 rounded-xl hover:bg-gray-50"
          >
            Cancel
          </button>
          <button
            onClick={onSubmit}
            disabled={loading}
            className="flex-1 px-4 py-3 bg-gradient-to-r from-indigo-500 to-indigo-600 text-white rounded-xl hover:from-indigo-600 hover:to-indigo-700 flex items-center justify-center gap-2"
          >
            {loading ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                Creating...
              </>
            ) : (
              <>
                <FaSave />
                Create Schedule
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  )
);

const SubstitutionModal = ({ 
  show, 
  onClose, 
  formData, 
  setFormData, 
  selectedClass, 
  selectedSection, 
  selectedDate, 
  loading, 
  onFindTeachers, 
  onSubmit 
}: any) => (
  show && (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-2xl p-6 max-w-md w-full">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-bold text-gray-900">Assign Substitution</h2>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-lg">
            <FaTimes className="text-gray-500" />
          </button>
        </div>
        
        <div className="space-y-4">
          <div className="bg-purple-50 p-3 rounded-lg">
            <p className="text-sm text-purple-800">
              Class: <span className="font-bold">{selectedClass || '--'}</span> • 
              Section: <span className="font-bold">{selectedSection || '--'}</span> • 
              Date: <span className="font-bold">{selectedDate}</span>
            </p>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Period Number *</label>
            <select
              value={formData.period_no}
              onChange={(e) => setFormData({...formData, period_no: e.target.value})}
              className="w-full px-4 py-3 border border-gray-300 rounded-xl"
            >
              <option value="">Select Period</option>
              {[1,2,3,4,5,6,7,8].map(p => (
                <option key={p} value={p}>Period {p}</option>
              ))}
            </select>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Subject</label>
            <input
              type="text"
              value={formData.subject}
              onChange={(e) => setFormData({...formData, subject: e.target.value})}
              className="w-full px-4 py-3 border border-gray-300 rounded-xl"
              placeholder="Mathematics"
            />
          </div>
          
          <div>
            <div className="flex justify-between items-center mb-2">
              <label className="block text-sm font-medium text-gray-700">Teacher *</label>
              <button
                onClick={onFindTeachers}
                disabled={!formData.period_no}
                className="text-sm text-indigo-600 hover:text-indigo-700 disabled:opacity-50"
              >
                Find Available Teachers
              </button>
            </div>
            <input
              type="text"
              value={formData.teacher_id}
              onChange={(e) => setFormData({...formData, teacher_id: e.target.value})}
              className="w-full px-4 py-3 border border-gray-300 rounded-xl"
              placeholder="TCH001"
            />
          </div>
        </div>

        <div className="flex gap-3 mt-6">
          <button
            onClick={onClose}
            className="flex-1 px-4 py-3 border border-gray-300 rounded-xl hover:bg-gray-50"
          >
            Cancel
          </button>
          <button
            onClick={onSubmit}
            disabled={loading || !formData.period_no || !formData.teacher_id}
            className="flex-1 px-4 py-3 bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-xl hover:from-purple-600 hover:to-pink-600 flex items-center justify-center gap-2 disabled:opacity-50"
          >
            {loading ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                Assigning...
              </>
            ) : (
              <>
                <FaExchangeAlt />
                Assign Substitution
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  )
);

const FreeTeachersModal = ({ show, onClose, teachers, onSelectTeacher }: any) => (
  show && (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-2xl p-6 max-w-md w-full">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-bold text-gray-900">Available Teachers</h2>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-lg">
            <FaTimes className="text-gray-500" />
          </button>
        </div>
        
        <div className="space-y-3 max-h-96 overflow-y-auto">
          {teachers.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              No available teachers found for this period
            </div>
          ) : (
            teachers.map((teacher: any) => (
              <div 
                key={teacher.teacher_id}
                className="flex items-center justify-between p-3 border border-gray-200 rounded-lg hover:bg-gray-50 cursor-pointer"
                onClick={() => onSelectTeacher(teacher.teacher_id)}
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-gradient-to-r from-blue-100 to-blue-200 rounded-full flex items-center justify-center">
                    <FaUser className="text-blue-600" />
                  </div>
                  <div>
                    <div className="font-medium text-gray-900">{teacher.name}</div>
                    <div className="text-sm text-gray-600">{teacher.default_subject}</div>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-sm font-medium text-gray-900">{teacher.teacher_id}</div>
                  <div className="text-xs text-gray-500">{teacher.department}</div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  )
);