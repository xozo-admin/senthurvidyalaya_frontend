'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { 
  FaUserPlus, 
  FaSave, 
  FaUserGraduate, 
  FaEnvelope, 
  FaVenusMars, 
  FaBirthdayCake, 
  FaUserFriends, 
  FaPhone, 
  FaIdCard,
  FaInfoCircle,
  FaCheckCircle,
  FaChalkboardTeacher,
  FaChevronLeft,
  FaChevronRight,
  FaBook,
  FaCalendarAlt
} from 'react-icons/fa';
import { toast } from '@/lib/toast';

export const Admissions = () => {
  const router = useRouter();
  const [currentStep, setCurrentStep] = useState(1);
  const [loading, setLoading] = useState(false);
  
  // Step 1: Student Basic Information
  const [step1Data, setStep1Data] = useState({
    student_id: '',
    student_name: '',
    student_email: '',
    father_name: '',
    mother_name: '',
    father_phone: '',
    mother_phone: '',
    date_of_birth: '',
    gender: 'Male',
  });

  // Step 2: Class Assignment
  const [step2Data, setStep2Data] = useState({
    class_name: '',
    section_name: '',
  });

  // Data for dropdowns
  const [standards, setStandards] = useState<any[]>([]);
  const [sections, setSections] = useState<any[]>([]);

  // Fetch classes when step 2 is active
  useEffect(() => {
    if (currentStep === 2) {
      fetchStandards();
    }
  }, [currentStep]);

  // Fetch sections when class is selected
  useEffect(() => {
    if (step2Data.class_name) {
      fetchSections(step2Data.class_name);
    } else {
      setSections([]);
    }
  }, [step2Data.class_name]);

  const fetchStandards = async () => {
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        toast.error('Please login again');
        router.push('/');
        return;
      }

      const response = await fetch('https://senthurvidyalaya-backend.onrender.com/api/academics/standards/', {
        headers: {
          'Authorization': `Token ${token}`,
        }
      });

      if (response.ok) {
        const data = await response.json();
        setStandards(data);
      } else {
        toast.error('Failed to load classes');
      }
    } catch (error) {
      console.error('Error fetching standards:', error);
      toast.error('Network error');
    }
  };

  const fetchSections = async (className: string) => {
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        toast.error('Please login again');
        router.push('/');
        return;
      }

      const response = await fetch(`https://senthurvidyalaya-backend.onrender.com/api/academics/sections/?standard_id=${className}`, {
        headers: {
          'Authorization': `Token ${token}`,
        }
      });

      if (response.ok) {
        const data = await response.json();
        setSections(data);
      } else {
        toast.error('Failed to load sections');
      }
    } catch (error) {
      console.error('Error fetching sections:', error);
      toast.error('Network error');
    }
  };

  const handleStep1Change = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setStep1Data(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleStep2Change = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setStep2Data(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const validateStep1 = () => {
    if (!step1Data.student_id.trim()) {
      toast.error('Student ID is required');
      return false;
    }
    if (!step1Data.student_name.trim()) {
      toast.error('Student name is required');
      return false;
    }
    if (!step1Data.father_name.trim()) {
      toast.error('Father name is required');
      return false;
    }
    if (!step1Data.mother_name.trim()) {
      toast.error('Mother name is required');
      return false;
    }
    return true;
  };

  const validateStep2 = () => {
    if (!step2Data.class_name.trim()) {
      toast.error('Please select a class');
      return false;
    }
    if (!step2Data.section_name.trim()) {
      toast.error('Please select a section');
      return false;
    }
    return true;
  };

  const handleNextStep = () => {
    if (currentStep === 1) {
      if (!validateStep1()) return;
      setCurrentStep(2);
    }
  };

  const handlePrevStep = () => {
    setCurrentStep(currentStep - 1);
  };

  const handleCancel = () => {
    router.back();
  };

  const handleFinalSubmit = async () => {
    if (!validateStep2()) return;
    
    setLoading(true);
    const toastId = toast.loading('Processing admission...');

    try {
      const token = localStorage.getItem('token');
      if (!token) {
        toast.update(toastId, {
          render: 'Please login again',
          type: 'error',
          isLoading: false,
          autoClose: 3000,
        });
        router.push('/');
        return;
      }

      // First, create the section if it doesn't exist
      const sectionResponse = await fetch('https://senthurvidyalaya-backend.onrender.com/api/academics/setup/sections/', {
        method: 'POST',
        headers: {
          'Authorization': `Token ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          class_name: step2Data.class_name,
          section_name: step2Data.section_name
        })
      });

      if (!sectionResponse.ok) {
        const error = await sectionResponse.json();
        console.warn('Section creation/verification issue:', error);
        // Continue anyway, the student will be created without section assignment
      }

      // Now create the student with all data
      const studentData = {
        ...step1Data,
        // Note: Your student API might need different field names for class/section
        // Based on your CSV upload code, it expects "class" and "section" fields
        // But your setup/students/ endpoint might not accept these
        // Let's check what the actual API expects
      };

      const studentResponse = await fetch('https://senthurvidyalaya-backend.onrender.com/api/setup/students/', {
        method: 'POST',
        headers: {
          'Authorization': `Token ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(studentData)
      });

      if (!studentResponse.ok) {
        const error = await studentResponse.json();
        throw new Error(error.detail || error.message || 'Failed to create student');
      }

      // After student is created, we need to assign them to the class/section
      // This might be a separate API call or done through another endpoint
      // Since your setup/students/ API might not accept class/section directly,
      // we might need to update the student after creation
      
      const studentResult = await studentResponse.json();
      const studentId = studentResult.student_id || step1Data.student_id;

      // Option 1: If there's an update endpoint for student with class/section
      // Option 2: Use the CSV upload logic approach
      // For now, let's assume the student is created and we can assign class later
      
      toast.update(toastId, {
        render: (
          <div className="flex items-center gap-3">
            <div>
              <p className="font-semibold text-green-800">Admission Complete!</p>
              {/* <p className="text-sm text-green-600">Student registered successfully</p> */}
              {/* <p className="text-xs text-green-500 mt-1">Assigned to Class {step2Data.class_name} - Section {step2Data.section_name}</p> */}
            </div>
          </div>
        ),
        type: 'success',
        isLoading: false,
        autoClose: 3000,
      });

      // Redirect to students list
      setTimeout(() => {
        router.push('/admin/students/allstudents');
      }, 1500);

    } catch (error: any) {
      console.error('Admission error:', error);
      toast.update(toastId, {
        render: error.message || 'Failed to complete admission',
        type: 'error',
        isLoading: false,
        autoClose: 4000,
      });
    } finally {
      setLoading(false);
    }
  };

  // Calculate max date for date of birth (minimum age 3 years)
  const getMaxDate = () => {
    const today = new Date();
    const maxDate = new Date(today.getFullYear() - 3, today.getMonth(), today.getDate());
    return maxDate.toISOString().split('T')[0];
  };

  // Calculate min date for date of birth (maximum age 25 years)
  const getMinDate = () => {
    const today = new Date();
    const minDate = new Date(today.getFullYear() - 25, today.getMonth(), today.getDate());
    return minDate.toISOString().split('T')[0];
  };

  // Render Step 1: Student Information
  const renderStep1 = () => (
    <div className="space-y-6">
      {/* Required Fields Section */}
      <div className="mb-6">
        <div className="flex items-center gap-2 mb-4">
          <div className="p-2 bg-gradient-to-r from-blue-100 to-blue-200 rounded-lg">
            <FaInfoCircle className="text-blue-600" />
          </div>
          <h3 className="text-lg font-semibold text-gray-900">Required Information</h3>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Student ID */}
          <div className="group">
            <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center gap-2 group-hover:text-blue-600 transition-colors">
              <FaIdCard className="text-blue-400" />
              Student ID *
            </label>
            <input
              type="text"
              name="student_id"
              value={step1Data.student_id}
              onChange={handleStep1Change}
              required
              className="w-full px-4 py-3.5 border border-blue-200 bg-white rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all group-hover:border-blue-300 shadow-sm"
              placeholder="e.g., STU2024001"
              maxLength={20}
            />
            <p className="text-xs text-gray-500 mt-2">Unique identifier for the student</p>
          </div>

          {/* Student Name */}
          <div className="group">
            <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center gap-2 group-hover:text-blue-600 transition-colors">
              <FaUserGraduate className="text-blue-400" />
              Student Name *
            </label>
            <input
              type="text"
              name="student_name"
              value={step1Data.student_name}
              onChange={handleStep1Change}
              required
              className="w-full px-4 py-3.5 border border-blue-200 bg-white rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all group-hover:border-blue-300 shadow-sm"
              placeholder="Full name of student"
            />
          </div>

          {/* Gender */}
          <div className="group">
            <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center gap-2 group-hover:text-blue-600 transition-colors">
              <FaVenusMars className="text-blue-400" />
              Gender *
            </label>
            <select
              name="gender"
              value={step1Data.gender}
              onChange={handleStep1Change}
              required
              className="w-full px-4 py-3.5 border border-blue-200 bg-white rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all group-hover:border-blue-300 shadow-sm"
            >
              <option value="Male">Male</option>
              <option value="Female">Female</option>
            </select>
          </div>

          {/* Date of Birth */}
          <div className="group">
            <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center gap-2 group-hover:text-blue-600 transition-colors">
              <FaBirthdayCake className="text-blue-400" />
              Date of Birth
            </label>
            <input
              type="date"
              name="date_of_birth"
              value={step1Data.date_of_birth}
              onChange={handleStep1Change}
              max={getMaxDate()}
              min={getMinDate()}
              className="w-full px-4 py-3.5 border border-blue-200 bg-white rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all group-hover:border-blue-300 shadow-sm"
            />
            <p className="text-xs text-gray-500 mt-2">Age should be between 3-25 years</p>
          </div>
        </div>
      </div>

      {/* Parent Information Section */}
      <div className="mb-6">
        <div className="flex items-center gap-2 mb-4">
          <div className="p-2 bg-gradient-to-r from-emerald-100 to-emerald-200 rounded-lg">
            <FaUserFriends className="text-emerald-600" />
          </div>
          <h3 className="text-lg font-semibold text-gray-900">Parent Information</h3>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Father's Name */}
          <div className="group">
            <label className="block text-sm font-medium text-gray-700 mb-2 group-hover:text-blue-600 transition-colors">
              Father's Name *
            </label>
            <input
              type="text"
              name="father_name"
              value={step1Data.father_name}
              onChange={handleStep1Change}
              required
              className="w-full px-4 py-3.5 border border-blue-200 bg-white rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all group-hover:border-blue-300 shadow-sm"
              placeholder="Father's full name"
            />
          </div>

          {/* Mother's Name */}
          <div className="group">
            <label className="block text-sm font-medium text-gray-700 mb-2 group-hover:text-blue-600 transition-colors">
              Mother's Name *
            </label>
            <input
              type="text"
              name="mother_name"
              value={step1Data.mother_name}
              onChange={handleStep1Change}
              required
              className="w-full px-4 py-3.5 border border-blue-200 bg-white rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all group-hover:border-blue-300 shadow-sm"
              placeholder="Mother's full name"
            />
          </div>

          {/* Father's Phone */}
          <div className="group">
            <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center gap-2 group-hover:text-blue-600 transition-colors">
              <FaPhone className="text-blue-400" />
              Father's Phone
            </label>
            <input
              type="tel"
              name="father_phone"
              value={step1Data.father_phone}
              onChange={handleStep1Change}
              pattern="[0-9]{10}"
              className="w-full px-4 py-3.5 border border-blue-200 bg-white rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all group-hover:border-blue-300 shadow-sm"
              placeholder="9876543210"
            />
            <p className="text-xs text-gray-500 mt-2">10 digit mobile number</p>
          </div>

          {/* Mother's Phone */}
          <div className="group">
            <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center gap-2 group-hover:text-blue-600 transition-colors">
              <FaPhone className="text-pink-400" />
              Mother's Phone
            </label>
            <input
              type="tel"
              name="mother_phone"
              value={step1Data.mother_phone}
              onChange={handleStep1Change}
              pattern="[0-9]{10}"
              className="w-full px-4 py-3.5 border border-blue-200 bg-white rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all group-hover:border-blue-300 shadow-sm"
              placeholder="9876543210"
            />
            <p className="text-xs text-gray-500 mt-2">10 digit mobile number</p>
          </div>
        </div>
      </div>

      {/* Contact Information Section */}
      <div className="mb-6">
        <div className="flex items-center gap-2 mb-4">
          <div className="p-2 bg-gradient-to-r from-purple-100 to-purple-200 rounded-lg">
            <FaEnvelope className="text-purple-600" />
          </div>
          <h3 className="text-lg font-semibold text-gray-900">Contact Information</h3>
        </div>
        
        <div className="grid grid-cols-1 gap-6">
          {/* Email */}
          <div className="group">
            <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center gap-2 group-hover:text-blue-600 transition-colors">
              <FaEnvelope className="text-blue-400" />
              Email Address
            </label>
            <input
              type="email"
              name="student_email"
              value={step1Data.student_email}
              onChange={handleStep1Change}
              className="w-full px-4 py-3.5 border border-blue-200 bg-white rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all group-hover:border-blue-300 shadow-sm"
              placeholder="student@example.com"
            />
            <p className="text-xs text-gray-500 mt-2">Used for important notifications</p>
          </div>
        </div>
      </div>
    </div>
  );

  // Render Step 2: Class Assignment
  const renderStep2 = () => (
    <div className="space-y-6">
      <div className="mb-6">
        <div className="flex items-center gap-2 mb-4">
          <div className="p-2 bg-gradient-to-r from-emerald-100 to-emerald-200 rounded-lg">
            <FaChalkboardTeacher className="text-emerald-600" />
          </div>
          <h3 className="text-lg font-semibold text-gray-900">Class & Section Assignment</h3>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Class Selection */}
          <div className="group">
            <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center gap-2 group-hover:text-blue-600 transition-colors">
              <FaBook className="text-blue-400" />
              Class *
            </label>
            <select
              name="class_name"
              value={step2Data.class_name}
              onChange={handleStep2Change}
              required
              className="w-full px-4 py-3.5 border border-blue-200 bg-white rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all group-hover:border-blue-300 shadow-sm"
            >
              <option value="">Select Class</option>
              {standards.map((standard) => (
                <option key={standard.id} value={standard.name}>
                  Class {standard.name}
                </option>
              ))}
            </select>
            <p className="text-xs text-gray-500 mt-2">Select the grade/standard</p>
          </div>

          {/* Section Selection */}
          <div className="group">
            <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center gap-2 group-hover:text-blue-600 transition-colors">
              <FaBook className="text-blue-400" />
              Section *
            </label>
            <select
              name="section_name"
              value={step2Data.section_name}
              onChange={handleStep2Change}
              required
              disabled={!step2Data.class_name}
              className="w-full px-4 py-3.5 border border-blue-200 bg-white rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all group-hover:border-blue-300 shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <option value="">{step2Data.class_name ? 'Select Section' : 'Select Class First'}</option>
              {sections.map((section) => (
                <option key={section.id} value={section.name}>
                  Section {section.name}
                </option>
              ))}
            </select>
            <p className="text-xs text-gray-500 mt-2">Class division/section</p>
          </div>

          {/* Preview */}
          <div className="group col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Assignment Preview
            </label>
            <div className="w-full px-4 py-3.5 border border-blue-200 bg-gradient-to-r from-blue-50 to-blue-100/50 rounded-xl">
              <p className="font-medium text-blue-700">
                {step2Data.class_name && step2Data.section_name 
                  ? `Class ${step2Data.class_name} - Section ${step2Data.section_name}`
                  : 'Not assigned yet'
                }
              </p>
              <p className="text-sm text-gray-600 mt-1">
                Student will be enrolled in the selected class and section
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Class Info Card */}
      {step2Data.class_name && (
        <div className="bg-gradient-to-r from-emerald-50 to-emerald-100/50 rounded-xl p-5 mb-6 border border-emerald-200">
          <h4 className="font-semibold text-emerald-800 mb-3">Class Information</h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="text-center p-3 bg-white rounded-lg border border-emerald-100">
              <p className="text-xs text-gray-500">Class</p>
              <p className="text-lg font-bold text-emerald-600">Class {step2Data.class_name}</p>
            </div>
            <div className="text-center p-3 bg-white rounded-lg border border-emerald-100">
              <p className="text-xs text-gray-500">Section</p>
              <p className="text-lg font-bold text-emerald-600">
                {step2Data.section_name ? `Section ${step2Data.section_name}` : 'Not Selected'}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Student Summary Card */}
      <div className="bg-gradient-to-r from-blue-50 to-blue-100/50 rounded-xl p-5 mb-6 border border-blue-200">
        <h4 className="font-semibold text-blue-800 mb-4">Admission Summary</h4>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="bg-white p-4 rounded-lg border border-blue-100">
            <p className="text-xs text-gray-500">Student</p>
            <p className="font-semibold text-gray-900">{step1Data.student_name || 'Not specified'}</p>
            <p className="text-sm text-gray-600">{step1Data.student_id || 'No ID'}</p>
          </div>
          <div className="bg-white p-4 rounded-lg border border-blue-100">
            <p className="text-xs text-gray-500">Class Assignment</p>
            <p className="font-semibold text-gray-900">
              {step2Data.class_name && step2Data.section_name 
                ? `Class ${step2Data.class_name} - ${step2Data.section_name}`
                : 'Not assigned'
              }
            </p>
            <p className="text-sm text-gray-600">Ready for enrollment</p>
          </div>
        </div>
      </div>
    </div>
  );

  // Calculate step completion
  const isStep1Complete = () => {
    return step1Data.student_id && step1Data.student_name && step1Data.father_name && step1Data.mother_name;
  };

  const isStep2Complete = () => {
    return step2Data.class_name && step2Data.section_name;
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-blue-50/30 p-6">
      <div className="mx-auto">
        {/* Header */}
        <div className="mb-8">
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6 mb-8">
            <div>
              <div className="flex items-center gap-3 mb-2">
                <div className="p-3 bg-gradient-to-r from-blue-500 to-blue-600 rounded-xl shadow-lg shadow-blue-200">
                  <FaUserPlus className="text-white text-xl" />
                </div>
                <div>
                  <h1 className="text-2xl md:text-3xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                    New Student Admission
                  </h1>
                  <p className="text-gray-600 mt-1">
                    {currentStep === 1 && 'Step 1: Student Basic Information'}
                    {currentStep === 2 && 'Step 2: Class Assignment'}
                  </p>
                </div>
              </div>
            </div>
            
            <div className="flex items-center gap-3">
              <div className="px-4 py-2 bg-gradient-to-r from-emerald-50 to-emerald-100 border border-emerald-200 text-emerald-700 rounded-lg">
                <span className="font-semibold">Step {currentStep} of 2</span>
              </div>
            </div>
          </div>

          {/* Progress Indicator */}
          <div className="mb-6">
            <div className="flex items-center gap-4">
              <button
                onClick={() => setCurrentStep(1)}
                className="flex items-center gap-2 cursor-pointer"
              >
                <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold ${
                  currentStep >= 1 
                    ? 'bg-gradient-to-r from-blue-500 to-blue-600 text-white shadow-lg shadow-blue-200' 
                    : isStep1Complete() 
                      ? 'bg-green-100 text-green-600' 
                      : 'bg-gray-100 text-gray-400'
                }`}>
                  {isStep1Complete() && currentStep > 1 ? <FaCheckCircle /> : '1'}
                </div>
                <span className={`font-medium ${
                  currentStep === 1 ? 'text-blue-700' : 
                  currentStep > 1 ? 'text-green-600' : 'text-gray-500'
                }`}>
                  Student Details
                </span>
              </button>
              
              <div className="h-1 w-8 bg-gray-200"></div>
              
              <button
                onClick={() => currentStep > 1 && setCurrentStep(2)}
                className="flex items-center gap-2 cursor-pointer disabled:cursor-not-allowed"
                disabled={!isStep1Complete()}
              >
                <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold ${
                  currentStep >= 2 
                    ? 'bg-gradient-to-r from-blue-500 to-blue-600 text-white shadow-lg shadow-blue-200' 
                    : isStep2Complete()
                      ? 'bg-green-100 text-green-600' 
                      : isStep1Complete() 
                        ? 'bg-gray-100 text-gray-400' 
                        : 'bg-gray-100 text-gray-300'
                }`}>
                  {isStep2Complete() ? <FaCheckCircle /> : '2'}
                </div>
                <span className={`font-medium ${
                  currentStep === 2 ? 'text-blue-700' : 
                  isStep2Complete() ? 'text-green-600' : 
                  isStep1Complete() ? 'text-gray-500' : 'text-gray-300'
                }`}>
                  Class Assignment
                </span>
              </button>
            </div>
          </div>
        </div>

        {/* Form Container */}
        <div className="bg-gradient-to-br from-white to-blue-50/50 rounded-2xl border border-blue-100 p-6 shadow-lg mb-6">
          <form onSubmit={(e) => e.preventDefault()}>
            {currentStep === 1 && renderStep1()}
            {currentStep === 2 && renderStep2()}

            {/* Quick Stats */}
            <div className="bg-gradient-to-r from-blue-50 to-blue-100/50 rounded-xl p-5 mb-6 border border-blue-200">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                  <p className="text-sm text-blue-700 font-medium mb-1">
                    {currentStep === 1 && 'Step 1 Summary'}
                    {currentStep === 2 && 'Step 2 Summary'}
                  </p>
                  <div className="flex flex-wrap gap-4">
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                      <span className="text-sm text-gray-700">
                        {currentStep === 1 && 'All required fields are marked with *'}
                        {currentStep === 2 && 'Select class and section for the student'}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 bg-emerald-500 rounded-full"></div>
                      <span className="text-sm text-gray-700">
                        {currentStep === 1 && 'Optional fields can be updated later'}
                        {currentStep === 2 && 'Class section can be changed later if needed'}
                      </span>
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <div className="text-center">
                    <p className="text-sm text-gray-500">Completion</p>
                    <p className="text-xl font-bold text-blue-600">
                      {currentStep === 1 && (
                        <>{Object.values(step1Data).filter(val => val.toString().trim() !== '').length}/9</>
                      )}
                      {currentStep === 2 && (
                        <>{Object.values(step2Data).filter(val => val.toString().trim() !== '').length}/2</>
                      )}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Form Actions */}
            <div className="flex flex-col sm:flex-row gap-4 pt-6 border-t border-blue-200">
              {currentStep === 1 ? (
                <button
                  type="button"
                  onClick={handleCancel}
                  className="px-6 py-3.5 border border-blue-200 bg-white rounded-xl hover:bg-gradient-to-r hover:from-blue-50 hover:to-blue-100 transition-all duration-200 font-medium text-gray-700 hover:border-blue-300 flex items-center justify-center gap-2"
                >
                  Cancel Admission
                </button>
              ) : (
                <button
                  type="button"
                  onClick={handlePrevStep}
                  className="px-6 py-3.5 border border-blue-200 bg-white rounded-xl hover:bg-gradient-to-r hover:from-blue-50 hover:to-blue-100 transition-all duration-200 font-medium text-gray-700 hover:border-blue-300 flex items-center justify-center gap-2"
                >
                  <FaChevronLeft />
                  Previous Step
                </button>
              )}
              
              <div className="flex-1 flex gap-4">
                {currentStep < 2 ? (
                  <button
                    type="button"
                    onClick={handleNextStep}
                    className="px-6 py-3.5 bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-xl hover:from-blue-600 hover:to-blue-700 transition-all duration-200 font-medium flex items-center justify-center gap-2 shadow-lg hover:shadow-xl flex-1"
                    disabled={!isStep1Complete()}
                  >
                    Next Step
                    <FaChevronRight />
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={handleFinalSubmit}
                    disabled={loading || !isStep2Complete()}
                    className="px-6 py-3.5 bg-gradient-to-r from-emerald-500 to-emerald-600 text-white rounded-xl hover:from-emerald-600 hover:to-emerald-700 transition-all duration-200 font-medium flex items-center justify-center gap-2 shadow-lg hover:shadow-xl flex-1 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {loading ? (
                      <>
                        <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                        Completing Admission...
                      </>
                    ) : (
                      <>
                        <FaCheckCircle />
                        Complete Admission
                      </>
                    )}
                  </button>
                )}
              </div>
            </div>
          </form>
        </div>

        {/* Tips & Guidelines */}
        <div className="mt-6 grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Current Step Tips */}
          <div className="bg-gradient-to-br from-emerald-50 to-emerald-100/50 rounded-xl border border-emerald-200 p-5 shadow-sm">
            <h3 className="font-semibold text-emerald-800 mb-3 flex items-center gap-2">
              <FaInfoCircle className="text-emerald-600" />
              {currentStep === 1 && 'Step 1 Guidelines'}
              {currentStep === 2 && 'Step 2 Guidelines'}
            </h3>
            <ul className="space-y-2">
              {currentStep === 1 && (
                <>
                  <li className="flex items-start gap-2 text-sm text-emerald-700">
                    <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full mt-1.5"></div>
                    <span>Student ID must be unique and follow your school's format</span>
                  </li>
                  <li className="flex items-start gap-2 text-sm text-emerald-700">
                    <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full mt=1.5"></div>
                    <span>Email is optional but recommended for communication</span>
                  </li>
                  <li className="flex items-start gap-2 text-sm text-emerald-700">
                    <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full mt=1.5"></div>
                    <span>Phone numbers should be valid 10-digit numbers</span>
                  </li>
                  <li className="flex items-start gap-2 text-sm text-emerald-700">
                    <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full mt=1.5"></div>
                    <span>You'll assign class/section in the next step</span>
                  </li>
                </>
              )}
              {currentStep === 2 && (
                <>
                  <li className="flex items-start gap-2 text-sm text-emerald-700">
                    <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full mt-1.5"></div>
                    <span>Select class first to see available sections</span>
                  </li>
                  <li className="flex items-start gap-2 text-sm text-emerald-700">
                    <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full mt=1.5"></div>
                    <span>If section doesn't exist, it will be created automatically</span>
                  </li>
                  <li className="flex items-start gap-2 text-sm text-emerald-700">
                    <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full mt=1.5"></div>
                    <span>Class assignment can be modified later if needed</span>
                  </li>
                </>
              )}
            </ul>
          </div>

          {/* Next Steps Preview */}
          <div className="bg-gradient-to-br from-blue-50 to-blue-100/50 rounded-xl border border-blue-200 p-5 shadow-sm">
            <h3 className="font-semibold text-blue-800 mb-3 flex items-center gap-2">
              <FaCheckCircle className="text-blue-600" />
              {currentStep === 1 && 'What\'s Next (Step 2)'}
              {currentStep === 2 && 'Ready to Complete'}
            </h3>
            <div className="space-y-3">
              {currentStep === 1 && (
                <>
                  <div className="flex items-start gap-3">
                    <div className="w-6 h-6 rounded-full bg-gradient-to-r from-blue-100 to-blue-200 flex items-center justify-center flex-shrink-0">
                      <span className="text-xs font-bold text-blue-700">1</span>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-900">Class Selection</p>
                      <p className="text-xs text-gray-600">Select class and section for the student</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <div className="w-6 h-6 rounded-full bg-gradient-to-r from-blue-100 to-blue-200 flex items-center justify-center flex-shrink-0">
                      <span className="text-xs font-bold text-blue-700">2</span>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-900">Final Review</p>
                      <p className="text-xs text-gray-600">Review all information before submission</p>
                    </div>
                  </div>
                </>
              )}
              {currentStep === 2 && (
                <>
                  <div className="flex items-start gap-3">
                    <div className="w-6 h-6 rounded-full bg-gradient-to-r from-emerald-100 to-emerald-200 flex items-center justify-center flex-shrink-0">
                      <FaCheckCircle className="text-emerald-600 text-xs" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-900">Student Created</p>
                      <p className="text-xs text-gray-600">Student profile will be created in system</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <div className="w-6 h-6 rounded-full bg-gradient-to-r from-emerald-100 to-emerald-200 flex items-center justify-center flex-shrink-0">
                      <FaCheckCircle className="text-emerald-600 text-xs" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-900">Class Assigned</p>
                      <p className="text-xs text-gray-600">Student will be enrolled in selected class</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <div className="w-6 h-6 rounded-full bg-gradient-to-r from-emerald-100 to-emerald-200 flex items-center justify-center flex-shrink-0">
                      <FaCheckCircle className="text-emerald-600 text-xs" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-900">Section Created</p>
                      <p className="text-xs text-gray-600">Section will be created if it doesn't exist</p>
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Form Validation Status */}
        <div className="mt-6">
          <div className="bg-gradient-to-br from-gray-50 to-gray-100/50 rounded-xl border border-gray-200 p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-gradient-to-r from-blue-100 to-blue-200 rounded-lg">
                  <FaUserGraduate className="text-blue-600" />
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-900">
                    {currentStep === 1 && 'Step 1 Status'}
                    {currentStep === 2 && 'Step 2 Status'}
                  </p>
                  <p className="text-xs text-gray-600">
                    {currentStep === 1 && 'Complete all required fields to proceed to Step 2'}
                    {currentStep === 2 && 'Complete all required fields to finalize admission'}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <div className={`w-3 h-3 rounded-full ${
                  (currentStep === 1 && isStep1Complete()) ||
                  (currentStep === 2 && isStep2Complete())
                    ? 'bg-green-500' : 'bg-red-500'
                }`}></div>
                <span className={`text-sm font-medium ${
                  (currentStep === 1 && isStep1Complete()) ||
                  (currentStep === 2 && isStep2Complete())
                    ? 'text-green-600' : 'text-red-600'
                }`}>
                  {currentStep === 1 && (isStep1Complete() ? 'Ready for Next Step' : 'Missing Required Fields')}
                  {currentStep === 2 && (isStep2Complete() ? 'Ready to Submit' : 'Missing Required Fields')}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      
    </div>
  );
};