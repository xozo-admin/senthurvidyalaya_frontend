'use client';

import React, { useState, useEffect, useRef } from 'react';
import {
  FaBook, FaUpload, FaTrash, FaEdit, FaEye,
  FaFilePdf, FaFileWord, FaFileExcel, FaFileImage,
  FaFileArchive, FaFileAlt, FaCalendarAlt, FaFilter,
  FaTimes, FaDownload, FaSpinner, FaExclamationTriangle,
  FaCheckCircle, FaSchool, FaChalkboardTeacher, FaUserTie,
  FaClock, FaList, FaThLarge, FaSort, FaSearch, FaSortUp,
  FaSortDown, FaPlus, FaPaperclip, FaTags, FaCalendarDay,
  FaFile, FaFileUpload, FaEyeSlash, FaChevronLeft, FaChevronRight
} from 'react-icons/fa';
import { teacherApi } from '@/lib/api';
import { toastError, toastSuccess } from '@/lib/toast';
import { useTheme } from '@/contexts/ThemeContext';
import { useThemeClasses } from '@/hooks/useThemeClasses';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_MEDIA_BASE_URL || 'https://senthurvidyalaya-backend.onrender.com';

// Types
interface SubjectMaterial {
  id: number;
  class_name: string;
  section: string;
  subject: number;
  subject_name: string;
  title: string;
  description: string;
  file: string | null;
  posted_by: string;
  created_at: string;
  academic_year?: string;
  file_type?: string;
  file_size?: string;
}

interface TeacherAllocation {
  subject_name: string;
  subject_code: string;
  classes: string[];
  sections: string[];
  sections_display?: string[];
}

interface SubjectOption {
  name: string;
  code: string;
  class_name: string;
  sections: string[];
}

// API Service
const apiService = {
  async getTeacherProfile() {
    const response = await teacherApi.profile.get();
    return response.data;
  },

  async getTeacherSubjectAllocations(teacherId: string) {
    const response = await teacherApi.subjects.allocations(teacherId);
    return response.data;
  },

  async getSubjectMaterials(filters: {
    class_name: string;
    section: string;
    subject: string;
    date?: string;
  }) {
    const params = new URLSearchParams();
    params.append('class_name', filters.class_name);
    params.append('section', filters.section);
    params.append('subject', filters.subject);
    if (filters.date) params.append('date', filters.date);

    const response = await teacherApi.materials.list(Object.fromEntries(params.entries()));
    return response.data;
  },

  async createMaterial(formData: FormData) {
    const response = await teacherApi.materials.create(formData);
    return response.data;
  },

  async updateMaterial(materialId: number, description: string) {
    const params = new URLSearchParams();
    params.append('material_id', materialId.toString());
    params.append('description', description);
    const response = await teacherApi.materials.update(params.toString(), {
      'Content-Type': 'application/x-www-form-urlencoded',
    });
    return response.data;
  },

  async deleteMaterial(materialId: number) {
    const response = await teacherApi.materials.delete(materialId);
    return response.data;
  },

  async deleteFile(materialId: number) {
    const response = await teacherApi.materials.deleteFile(materialId);
    return response.data;
  },

  async uploadFile(materialId: number, file: File) {
    const formData = new FormData();
    formData.append('material_id', materialId.toString());
    formData.append('file', file);
    const response = await teacherApi.materials.uploadFile(formData);
    return response.data;
  },
};

export default function SubjectMaterials() {
  const { theme } = useTheme();
  const { get, combine } = useThemeClasses();
  // State variables
  const [materials, setMaterials] = useState<SubjectMaterial[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMaterials, setLoadingMaterials] = useState(false);
  const [error, setError] = useState('');
  const [teacherProfile, setTeacherProfile] = useState<{
    teacher_id?: string;
    name?: string;
    class_name?: string | null;
    assigned_class?: string | null;
    handled_subjects?: Record<string, Record<string, string[]>>;
  } | null>(null);
  const [subjectAllocations, setSubjectAllocations] = useState<TeacherAllocation[]>([]);
  
  // Filters
  const [filters, setFilters] = useState({
    class_name: '',
    section: '',
    subject: '',
    date: ''
  });
  
  // Modal states
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showFileUploadModal, setShowFileUploadModal] = useState(false);
  const [selectedMaterial, setSelectedMaterial] = useState<SubjectMaterial | null>(null);
  
  // Upload form - Updated to include all filter fields
  const [uploadForm, setUploadForm] = useState({
    class_name: '',
    section_name: '',
    subject_name: '',
    title: '',
    description: '',
    file: null as File | null,
    date: new Date().toISOString().split('T')[0]
  });
  const [uploading, setUploading] = useState(false);
  const [uploadingFile, setUploadingFile] = useState(false);
  const [editingDescription, setEditingDescription] = useState('');
  const [replacementFile, setReplacementFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const replacementFileInputRef = useRef<HTMLInputElement>(null);
  
  // View controls
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [sortConfig, setSortConfig] = useState({
    key: 'created_at',
    direction: 'desc'
  });
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  
  // Available options
  const [availableClasses, setAvailableClasses] = useState<{id: string, name: string}[]>([]);
  const [availableSections, setAvailableSections] = useState<{id: string, name: string}[]>([]);
  const [availableSubjects, setAvailableSubjects] = useState<{id: string, name: string, code: string}[]>([]);

  // For upload modal
  const [uploadModalClasses, setUploadModalClasses] = useState<{id: string, name: string}[]>([]);
  const [uploadModalSections, setUploadModalSections] = useState<{id: string, name: string}[]>([]);
  const [uploadModalSubjects, setUploadModalSubjects] = useState<{id: string, name: string, code: string}[]>([]);

  useEffect(() => {
    loadTeacherData();
  }, []);

  useEffect(() => {
    setCurrentPage(1);
  }, [filters.class_name, filters.section, filters.subject, filters.date, searchTerm, sortConfig.key, sortConfig.direction, viewMode]);

  useEffect(() => {
    // Initialize upload modal filters from main filters
    if (showUploadModal) {
      setUploadForm(prev => ({
        ...prev,
        class_name: filters.class_name || '',
        section_name: filters.section || '',
        subject_name: filters.subject || '',
        date: filters.date || new Date().toISOString().split('T')[0]
      }));
      
      // Initialize upload modal available options
      processAllocationsForUploadModal(subjectAllocations, teacherProfile);
    }
  }, [showUploadModal, filters, subjectAllocations, teacherProfile]);

  const getBgClass = () => combine(
    get('bg', 'primary'),
    'min-h-screen transition-colors duration-200'
  );

  const resolveApiPayload = <T,>(payload: any): T => {
    if (payload && typeof payload === 'object' && 'data' in payload && payload.data !== undefined && payload.data !== null) {
      return payload.data as T;
    }
    return payload as T;
  };

  const extractApiError = (err: any, fallback: string) => {
    const responseData = err?.response?.data;

    if (typeof responseData?.error === 'string') return responseData.error;
    if (typeof responseData?.message === 'string') return responseData.message;
    if (typeof responseData?.detail === 'string') return responseData.detail;

    if (responseData && typeof responseData === 'object') {
      const values = Object.values(responseData).flat().filter(Boolean);
      if (values.length) return values.map((value) => String(value)).join(', ');
    }

    if (typeof err?.message === 'string' && err.message.trim()) return err.message;
    return fallback;
  };

  const extractApiMessage = (payload: any, fallback = '') => {
    if (typeof payload?.message === 'string' && payload.message.trim()) return payload.message;
    if (typeof payload?.detail === 'string' && payload.detail.trim()) return payload.detail;
    if (typeof payload?.error === 'string' && payload.error.trim()) return payload.error;
    return fallback;
  };

  const getSectionsFromDisplay = (displayValues: string[] | undefined, className: string) => {
    const sections = new Set<string>();
    (displayValues || []).forEach((display) => {
      const [displayClass, displaySection] = display.split(':');
      if (displayClass?.trim().replace(/^Class\s+/i, '') === className && displaySection?.trim()) {
        sections.add(displaySection.trim());
      }
    });
    return Array.from(sections).sort();
  };

  const getClassesFromDisplay = (displayValues: string[] | undefined) => {
    const classes = new Set<string>();
    (displayValues || []).forEach((display) => {
      const [displayClass] = display.split(':');
      const normalizedClass = displayClass?.trim().replace(/^Class\s+/i, '');
      if (normalizedClass) classes.add(normalizedClass);
    });
    return Array.from(classes);
  };

  const getAssignedClassValue = (profile: typeof teacherProfile) =>
    profile?.assigned_class?.split(' - ')[0] || profile?.class_name || '';

  const getHandledSubjectsMap = (profile: typeof teacherProfile) =>
    profile?.handled_subjects || {};

  const hasHandledSubjects = (profile: typeof teacherProfile) =>
    Object.keys(getHandledSubjectsMap(profile)).length > 0;

  const getHandledClasses = (profile: typeof teacherProfile) => {
    const classes = new Set<string>();
    Object.values(getHandledSubjectsMap(profile)).forEach((classMap) => {
      Object.keys(classMap || {}).forEach((className) => classes.add(className));
    });
    return Array.from(classes).sort((a, b) => parseInt(a) - parseInt(b));
  };

  const getHandledSectionsForClass = (profile: typeof teacherProfile, className: string) => {
    const sections = new Set<string>();
    Object.values(getHandledSubjectsMap(profile)).forEach((classMap) => {
      (classMap?.[className] || []).forEach((section) => sections.add(section));
    });
    return Array.from(sections).sort();
  };

  const getHandledSubjectsForClass = (profile: typeof teacherProfile, className: string) => {
    const subjects = new Set<string>();
    Object.entries(getHandledSubjectsMap(profile)).forEach(([subjectName, classMap]) => {
      if (classMap?.[className]?.length) subjects.add(subjectName);
    });
    return Array.from(subjects).sort((a, b) => a.localeCompare(b));
  };

  const getHandledSubjectsForClassAndSection = (profile: typeof teacherProfile, className: string, sectionName: string) => {
    const subjects = new Set<string>();
    Object.entries(getHandledSubjectsMap(profile)).forEach(([subjectName, classMap]) => {
      if ((classMap?.[className] || []).includes(sectionName)) subjects.add(subjectName);
    });
    return Array.from(subjects).sort((a, b) => a.localeCompare(b));
  };

  const allocationHandlesClass = (alloc: TeacherAllocation, className: string) =>
    alloc.classes.includes(className) || getClassesFromDisplay(alloc.sections_display).includes(className);

  const getAllocationSectionsForClass = (alloc: TeacherAllocation, className: string) => {
    const displaySections = getSectionsFromDisplay(alloc.sections_display, className);
    if (displaySections.length > 0) return displaySections;
    return [...new Set(alloc.sections || [])].sort();
  };

  const getSubjectCode = (subjectName: string) =>
    subjectAllocations.find((alloc) => alloc.subject_name === subjectName)?.subject_code || subjectName;

  const dedupeSubjectOptions = (subjects: SubjectOption[]) => Array.from(
    new Map(subjects.map((subject) => [subject.name, subject])).values()
  ).sort((a, b) => a.name.localeCompare(b.name));

  const getSubjectsForClass = (className: string): SubjectOption[] => {
    if (hasHandledSubjects(teacherProfile)) {
      return dedupeSubjectOptions(
        getHandledSubjectsForClass(teacherProfile, className).map((subjectName) => ({
          name: subjectName,
          code: getSubjectCode(subjectName),
          class_name: className,
          sections: getHandledSectionsForClass(teacherProfile, className),
        }))
      );
    }

    return dedupeSubjectOptions(
      subjectAllocations
        .filter((alloc) => allocationHandlesClass(alloc, className))
        .map((alloc) => ({
          name: alloc.subject_name,
          code: alloc.subject_code,
          class_name: className,
          sections: getAllocationSectionsForClass(alloc, className),
        }))
    );
  };

  const getSectionsForClass = (className: string) => {
    if (hasHandledSubjects(teacherProfile)) {
      return getHandledSectionsForClass(teacherProfile, className);
    }
    const sections = new Set<string>();
    subjectAllocations.forEach((alloc) => {
      if (!allocationHandlesClass(alloc, className)) return;
      getAllocationSectionsForClass(alloc, className).forEach((section) => sections.add(section));
    });
    return Array.from(sections).sort();
  };

  const getSectionsForClassAndSubject = (className: string, subjectName: string) => {
    if (hasHandledSubjects(teacherProfile)) {
      const classMap = getHandledSubjectsMap(teacherProfile)[subjectName];
      return [...new Set(classMap?.[className] || [])].sort();
    }
    const sections = new Set<string>();
    subjectAllocations.forEach((alloc) => {
      if (!allocationHandlesClass(alloc, className) || alloc.subject_name !== subjectName) return;
      getAllocationSectionsForClass(alloc, className).forEach((section) => sections.add(section));
    });
    return Array.from(sections).sort();
  };

  const getSubjectsForClassAndSection = (className: string, sectionName: string): SubjectOption[] => {
    if (hasHandledSubjects(teacherProfile)) {
      return dedupeSubjectOptions(
        getHandledSubjectsForClassAndSection(teacherProfile, className, sectionName).map((subjectName) => ({
          name: subjectName,
          code: getSubjectCode(subjectName),
          class_name: className,
          sections: [sectionName],
        }))
      );
    }

    return dedupeSubjectOptions(
      subjectAllocations
        .filter((alloc) => {
          if (!allocationHandlesClass(alloc, className)) return false;
          const allocSections = new Set<string>(getAllocationSectionsForClass(alloc, className));
          return allocSections.size === 0 || allocSections.has(sectionName);
        })
        .map((alloc) => ({
          name: alloc.subject_name,
          code: alloc.subject_code,
          class_name: className,
          sections: [sectionName],
        }))
    );
  };

  const getSubjectsForFilterSelection = (className: string, sectionName?: string) => {
    if (!className) return [];
    const assignedClass = getAssignedClassValue(teacherProfile);
    if (assignedClass) {
      if (assignedClass !== className && !getSectionsForClass(className).length) {
        return [];
      }
    }
    if (sectionName) return getSubjectsForClassAndSection(className, sectionName);
    return getSubjectsForClass(className);
  };

  const toSelectOptions = (values: string[]) =>
    values.map((value) => ({ id: value, name: value }));

  const toSubjectSelectOptions = (subjects: SubjectOption[]) =>
    subjects.map((subject) => ({ id: subject.code, name: subject.name, code: subject.code }));

  const getInputClass = () => combine(
    'w-full px-3 sm:px-4 py-2.5 sm:py-3 rounded-lg sm:rounded-xl border focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all text-xs sm:text-sm',
    theme === 'dark'
      ? 'bg-gray-900/70 border-gray-600 text-gray-100 hover:border-gray-500 focus:border-blue-400'
      : 'bg-white border-gray-300 text-gray-900 hover:border-gray-400 focus:border-blue-500',
    'disabled:opacity-50 disabled:cursor-not-allowed'
  );

  const getPrimaryButtonClass = () => combine(
    'px-4 sm:px-6 py-2.5 sm:py-3 rounded-lg sm:rounded-xl transition-all duration-200 font-medium text-white text-xs sm:text-sm',
    'shadow-lg hover:shadow-xl hover:scale-[1.02] active:scale-[0.98]',
    theme === 'dark'
      ? 'bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800'
      : 'bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700'
  );

  const getSecondaryButtonClass = () => combine(
    'px-3 sm:px-4 py-2 sm:py-3 rounded-lg sm:rounded-xl transition-all duration-200 font-medium border text-xs sm:text-sm',
    get('border', 'secondary'),
    get('bg', 'card'),
    get('text', 'secondary'),
    'hover:bg-[var(--color-bg-hover)]'
  );

  const getCardGradientClass = (color: 'blue' | 'emerald' | 'amber' | 'indigo' = 'blue') => {
    const base = combine('rounded-2xl p-6 border shadow-lg', get('border', 'primary'));
    if (color === 'blue') {
      return combine(base, 'bg-gradient-to-br', theme === 'dark' ? 'from-gray-800 to-blue-900/20' : 'from-white to-blue-50');
    }
    if (color === 'emerald') {
      return combine(base, 'bg-gradient-to-br', theme === 'dark' ? 'from-gray-800 to-emerald-900/20' : 'from-white to-emerald-50');
    }
    if (color === 'amber') {
      return combine(base, 'bg-gradient-to-br', theme === 'dark' ? 'from-gray-800 to-amber-900/20' : 'from-white to-amber-50');
    }
    return combine(base, 'bg-gradient-to-br', theme === 'dark' ? 'from-gray-800 to-indigo-900/20' : 'from-white to-indigo-50');
  };

  const normalizeSubjectName = (subject: string): string => (
    subject
      .toLowerCase()
      .replace(/&/g, 'and')
      .replace(/[()]/g, ' ')
      .replace(/[\/_-]+/g, ' ')
      .replace(/\s+/g, ' ')
      .trim()
  );

  const SUBJECT_COLOR_MAP: Record<string, { bg: string; text: string; border: string }> = {
    mathematics: { bg: '#1E40AF', text: '#FFFFFF', border: '#1E40AF' },
    maths: { bg: '#1E40AF', text: '#FFFFFF', border: '#1E40AF' },
    english: { bg: '#B91C1C', text: '#FFFFFF', border: '#B91C1C' },
    science: { bg: '#166534', text: '#FFFFFF', border: '#166534' },
    'general science': { bg: '#166534', text: '#FFFFFF', border: '#166534' },
    'social science': { bg: '#EA580C', text: '#FFFFFF', border: '#EA580C' },
    'social studies': { bg: '#EA580C', text: '#FFFFFF', border: '#EA580C' },
    'computer science': { bg: '#6D28D9', text: '#FFFFFF', border: '#6D28D9' },
    physics: { bg: '#3730A3', text: '#FFFFFF', border: '#3730A3' },
    chemistry: { bg: '#DB2777', text: '#FFFFFF', border: '#DB2777' },
    biology: { bg: '#15803D', text: '#FFFFFF', border: '#15803D' },
    tamil: { bg: '#0F766E', text: '#FFFFFF', border: '#0F766E' },
    hindi: { bg: '#CA8A04', text: '#111827', border: '#CA8A04' },
    sanskrit: { bg: '#78350F', text: '#FFFFFF', border: '#78350F' },
    malayalam: { bg: '#047857', text: '#FFFFFF', border: '#047857' },
    telugu: { bg: '#0891B2', text: '#FFFFFF', border: '#0891B2' },
    kannada: { bg: '#115E59', text: '#FFFFFF', border: '#115E59' },
    urdu: { bg: '#064E3B', text: '#FFFFFF', border: '#064E3B' },
    french: { bg: '#8B5CF6', text: '#FFFFFF', border: '#8B5CF6' },
    accountancy: { bg: '#1E3A8A', text: '#FFFFFF', border: '#1E3A8A' },
    'business studies': { bg: '#7F1D1D', text: '#FFFFFF', border: '#7F1D1D' },
    economics: { bg: '#B45309', text: '#FFFFFF', border: '#B45309' },
    commerce: { bg: '#92400E', text: '#FFFFFF', border: '#92400E' },
    history: { bg: '#C2410C', text: '#FFFFFF', border: '#C2410C' },
    geography: { bg: '#365314', text: '#FFFFFF', border: '#365314' },
    civics: { bg: '#334155', text: '#FFFFFF', border: '#334155' },
    'political science': { bg: '#581C87', text: '#FFFFFF', border: '#581C87' },
    psychology: { bg: '#BE185D', text: '#FFFFFF', border: '#BE185D' },
    sociology: { bg: '#4D7C0F', text: '#FFFFFF', border: '#4D7C0F' },
    'physical education': { bg: '#059669', text: '#FFFFFF', border: '#059669' },
    yoga: { bg: '#2DD4BF', text: '#111827', border: '#2DD4BF' },
    art: { bg: '#C026D3', text: '#FFFFFF', border: '#C026D3' },
    drawing: { bg: '#C026D3', text: '#FFFFFF', border: '#C026D3' },
    'art drawing': { bg: '#C026D3', text: '#FFFFFF', border: '#C026D3' },
    music: { bg: '#7C3AED', text: '#FFFFFF', border: '#7C3AED' },
    dance: { bg: '#E11D48', text: '#FFFFFF', border: '#E11D48' },
    'moral science': { bg: '#0284C7', text: '#FFFFFF', border: '#0284C7' },
    'value ed': { bg: '#0284C7', text: '#FFFFFF', border: '#0284C7' },
    'value education': { bg: '#0284C7', text: '#FFFFFF', border: '#0284C7' },
    'moral science value ed': { bg: '#0284C7', text: '#FFFFFF', border: '#0284C7' },
    'environmental studies': { bg: '#4ADE80', text: '#111827', border: '#4ADE80' },
    evs: { bg: '#4ADE80', text: '#111827', border: '#4ADE80' },
  };

  const getSubjectColor = (subject: string) => {
    const normalized = normalizeSubjectName(subject);
    if (SUBJECT_COLOR_MAP[normalized]) return SUBJECT_COLOR_MAP[normalized];

    const cleaned = normalized
      .replace(/\b(subject|theory|practical|lab|core|elective)\b/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();

    if (SUBJECT_COLOR_MAP[cleaned]) return SUBJECT_COLOR_MAP[cleaned];

    for (const [key, value] of Object.entries(SUBJECT_COLOR_MAP)) {
      if (cleaned.includes(key) || key.includes(cleaned)) {
        return value;
      }
    }

    return {
      bg: '#2563EB',
      text: '#FFFFFF',
      border: '#2563EB',
    };
  };

  const getSubjectGradientStyle = (color: { bg: string; text: string; border: string }) => ({
    backgroundImage: `linear-gradient(135deg, rgba(255,255,255,0.20) 0%, rgba(255,255,255,0.04) 42%, rgba(0,0,0,0.14) 100%), linear-gradient(135deg, ${color.bg} 0%, ${color.bg} 100%)`,
    borderColor: color.border,
    color: color.text
  });

  const loadTeacherData = async () => {
    try {
      setLoading(true);
      setError('');

      const profileResponse = await apiService.getTeacherProfile();
      const profileData = resolveApiPayload<any>(profileResponse);
      setTeacherProfile(profileData);

      const teacherId = profileData?.teacher_id;
      if (!teacherId) {
        throw new Error('Teacher profile is missing teacher_id');
      }

      const allocationsResponse = await apiService.getTeacherSubjectAllocations(teacherId);
      const allocationsData = resolveApiPayload<any>(allocationsResponse);
      const allocations = allocationsData?.allocations || [];

      processAllocations(allocations, profileData);
      processAllocationsForUploadModal(allocations, profileData);
    } catch (err: any) {
      console.error('Error loading teacher data:', err);
      const errorMessage = extractApiError(err, 'Failed to load teacher data');
      setError(errorMessage);
      toastError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const processAllocations = (allocations: TeacherAllocation[], profileData: typeof teacherProfile) => {
    setSubjectAllocations(allocations);

    const classesSet = new Set<string>();
    const assignedClass = getAssignedClassValue(profileData);
    const handledClasses = getHandledClasses(profileData);

    allocations.forEach((allocation) => {
      allocation.classes.forEach((className) => {
        classesSet.add(className);
      });
      getClassesFromDisplay(allocation.sections_display).forEach((className) => {
        classesSet.add(className);
      });
    });

    const classValues = (handledClasses.length > 0
      ? handledClasses
      : Array.from(classesSet).filter((className) => !assignedClass || className === assignedClass || allocations.some((alloc) => allocationHandlesClass(alloc, className)))
    ).sort((a, b) => parseInt(a) - parseInt(b));

    setAvailableClasses(toSelectOptions(classValues));
    setAvailableSections([]);
    setAvailableSubjects([]);
    setFilters((prev) => ({
      ...prev,
      class_name: '',
      section: '',
      subject: '',
    }));
  };

  const processAllocationsForUploadModal = (allocations: TeacherAllocation[], profileData: typeof teacherProfile) => {
    const assignedClass = getAssignedClassValue(profileData);
    const handledClasses = getHandledClasses(profileData);

    if (handledClasses.length > 0) {
      setUploadModalClasses(toSelectOptions(handledClasses));
      setUploadModalSections([]);
      setUploadModalSubjects([]);
      return;
    }

    const classesSet = new Set<string>();
    allocations.forEach((allocation) => {
      allocation.classes.forEach((className) => {
        if (!assignedClass || className === assignedClass || getClassesFromDisplay(allocation.sections_display).includes(className)) {
          classesSet.add(className);
        }
      });
      getClassesFromDisplay(allocation.sections_display).forEach((className) => classesSet.add(className));
    });

    const classValues = Array.from(classesSet).sort((a, b) => parseInt(a) - parseInt(b));
    setUploadModalClasses(toSelectOptions(classValues));
    setUploadModalSections([]);
    setUploadModalSubjects([]);
  };

  const handleClassFilterChange = (className: string) => {
    const nextSections = className ? getSectionsForClass(className) : [];
    setAvailableSections(toSelectOptions(nextSections));
    setAvailableSubjects([]);
    setFilters((prev) => ({
      ...prev,
      class_name: className,
      section: '',
      subject: '',
    }));
  };

  const handleSectionFilterChange = (sectionName: string) => {
    const nextSubjects = filters.class_name
      ? getSubjectsForFilterSelection(filters.class_name, sectionName)
      : [];

    setAvailableSubjects(toSubjectSelectOptions(nextSubjects));
    setFilters((prev) => ({
      ...prev,
      section: sectionName,
      subject: '',
    }));
  };

  const handleSubjectFilterChange = (subjectName: string) => {
    setFilters((prev) => ({
      ...prev,
      subject: subjectName,
    }));
  };

  const handleUploadModalClassChange = (className: string) => {
    setUploadForm((prev) => ({
      ...prev,
      class_name: className,
      section_name: '',
      subject_name: '',
    }));

    setUploadModalSections(toSelectOptions(className ? getSectionsForClass(className) : []));
    setUploadModalSubjects([]);
  };

  const handleUploadModalSectionChange = (sectionName: string) => {
    const nextSubjects = uploadForm.class_name
      ? getSubjectsForFilterSelection(uploadForm.class_name, sectionName)
      : [];

    setUploadForm((prev) => ({
      ...prev,
      section_name: sectionName,
      subject_name: '',
    }));

    setUploadModalSubjects(toSubjectSelectOptions(nextSubjects));
  };

  const handleUploadModalSubjectChange = (subjectName: string) => {
    setUploadForm((prev) => ({
      ...prev,
      subject_name: subjectName,
    }));
  };

  const loadMaterials = async (nextFilters = filters) => {
    if (!nextFilters.class_name || !nextFilters.section || !nextFilters.subject) {
      const message = 'Select class, section, and subject to load materials';
      setError(message);
      toastError(message);
      return;
    }

    try {
      setLoadingMaterials(true);
      setError('');

      const materialsResponse = await apiService.getSubjectMaterials(nextFilters);
      setMaterials(mapMaterialsResponse(materialsResponse));

    } catch (err: any) {
      console.error('Error loading materials:', err);
      const errorMessage = extractApiError(err, 'Failed to load materials');
      setError(errorMessage);
      toastError(errorMessage);
      setMaterials([]);
    } finally {
      setLoadingMaterials(false);
    }
  };

  const getFileType = (filename: string): string => {
    const ext = filename.split('.').pop()?.toLowerCase() || '';
    
    if (['pdf'].includes(ext)) return 'pdf';
    if (['doc', 'docx'].includes(ext)) return 'word';
    if (['xls', 'xlsx', 'csv'].includes(ext)) return 'excel';
    if (['jpg', 'jpeg', 'png', 'gif', 'bmp', 'webp'].includes(ext)) return 'image';
    if (['zip', 'rar', '7z', 'tar', 'gz'].includes(ext)) return 'archive';
    if (['txt', 'text', 'md'].includes(ext)) return 'text';
    
    return 'other';
  };

  const getFileSizeFromUrl = (url: string): string => {
    return '1.2 MB';
  };

  const enhanceMaterial = (material: SubjectMaterial): SubjectMaterial => ({
    ...material,
    file_type: material.file ? getFileType(material.file) : 'unknown',
    file_size: material.file ? getFileSizeFromUrl(material.file) : '0 KB',
  });

  const mapMaterialsResponse = (payload: any): SubjectMaterial[] => {
    const resolvedPayload = resolveApiPayload<any>(payload);

    if (Array.isArray(resolvedPayload)) {
      return resolvedPayload.map((material: SubjectMaterial) => enhanceMaterial(material));
    }

    if (Array.isArray(resolvedPayload?.data)) {
      return resolvedPayload.data.map((material: SubjectMaterial) => enhanceMaterial(material));
    }

    if (Array.isArray(payload?.data)) {
      return payload.data.map((material: SubjectMaterial) => enhanceMaterial(material));
    }

    return [];
  };

  const getFileIcon = (fileType: string) => {
    switch (fileType) {
      case 'pdf': return <FaFilePdf className="text-red-500" />;
      case 'word': return <FaFileWord className="text-blue-500" />;
      case 'excel': return <FaFileExcel className="text-green-500" />;
      case 'image': return <FaFileImage className="text-purple-500" />;
      case 'archive': return <FaFileArchive className="text-yellow-500" />;
      case 'text': return <FaFileAlt className="text-gray-700" />;
      default: return <FaFileAlt className="text-gray-500" />;
    }
  };

  const getFileTypeColor = (type: string) => {
    switch (type) {
      case 'pdf': return 'bg-red-50 text-red-700 border-red-100';
      case 'word': return 'bg-blue-50 text-blue-700 border-blue-100';
      case 'excel': return 'bg-green-50 text-green-700 border-green-100';
      case 'image': return 'bg-purple-50 text-purple-700 border-purple-100';
      case 'archive': return 'bg-yellow-50 text-yellow-700 border-yellow-100';
      case 'text': return 'bg-gray-50 text-gray-700 border-gray-100';
      default: return 'bg-gray-50 text-gray-700 border-gray-100';
    }
  };

  const handleUpload = async () => {
    if (!uploadForm.title) {
      toastError('Please provide title');
      return;
    }

    if (!uploadForm.class_name || !uploadForm.section_name || !uploadForm.subject_name) {
      toastError('Please select class, section, and subject first');
      return;
    }

    try {
      setUploading(true);
      setError('');

      const formData = new FormData();
      formData.append('title', uploadForm.title);
      formData.append('description', uploadForm.description);
      formData.append('class_name', uploadForm.class_name);
      formData.append('section', uploadForm.section_name);
      formData.append('subject', uploadForm.subject_name);
      
      if (uploadForm.file) {
        formData.append('file', uploadForm.file);
      }

      const result = await apiService.createMaterial(formData);
      
      toastSuccess(extractApiMessage(result, 'Material uploaded successfully'));
      setShowUploadModal(false);
      resetUploadForm();

      const nextSections = getSectionsForClass(uploadForm.class_name);
      const nextSubjects = getSubjectsForFilterSelection(uploadForm.class_name, uploadForm.section_name);
      const nextFilters = {
        ...filters,
        class_name: uploadForm.class_name,
        section: uploadForm.section_name,
        subject: uploadForm.subject_name
      };

      setAvailableSections(toSelectOptions(nextSections));
      setAvailableSubjects(toSubjectSelectOptions(nextSubjects));
      setFilters(nextFilters);
      await loadMaterials(nextFilters);

    } catch (err: any) {
      console.error('Error uploading material:', err);
      toastError(extractApiError(err, 'Failed to upload material'));
    } finally {
      setUploading(false);
    }
  };

  const resetUploadForm = () => {
    setUploadForm({
      class_name: filters.class_name || '',
      section_name: filters.section || '',
      subject_name: filters.subject || '',
      title: '',
      description: '',
      file: null,
      date: new Date().toISOString().split('T')[0]
    });
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleUpdateDescription = async () => {
    if (!selectedMaterial || !editingDescription.trim()) {
      toastError('Please enter a description');
      return;
    }

    try {
      const result = await apiService.updateMaterial(selectedMaterial.id, editingDescription);
      
      toastSuccess(extractApiMessage(result, 'Description updated successfully'));
      setShowEditModal(false);
      await loadMaterials();

    } catch (err: any) {
      console.error('Error updating material:', err);
      toastError(extractApiError(err, 'Failed to update description'));
    }
  };

  const handleDeleteMaterial = async () => {
    if (!selectedMaterial) return;

    try {
      const result = await apiService.deleteMaterial(selectedMaterial.id);
      
      toastSuccess(extractApiMessage(result, 'Material deleted successfully'));
      setShowDeleteModal(false);
      setSelectedMaterial(null);
      await loadMaterials();

    } catch (err: any) {
      console.error('Error deleting material:', err);
      toastError(extractApiError(err, 'Failed to delete material'));
    }
  };

  const handleDeleteFile = async (material: SubjectMaterial) => {
    if (!material.file) return;

    if (!confirm('Are you sure you want to delete this file? The description will remain.')) {
      return;
    }

    try {
      const result = await apiService.deleteFile(material.id);
      
      toastSuccess(extractApiMessage(result, 'File deleted successfully'));
      await loadMaterials();

    } catch (err: any) {
      console.error('Error deleting file:', err);
      toastError(extractApiError(err, 'Failed to delete file'));
    }
  };

  const resetReplacementFile = () => {
    setReplacementFile(null);
    if (replacementFileInputRef.current) replacementFileInputRef.current.value = '';
  };

  const openFileUploadModal = (material: SubjectMaterial) => {
    setSelectedMaterial(material);
    resetReplacementFile();
    setShowFileUploadModal(true);
  };

  const handleReplacementFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 10 * 1024 * 1024) {
      toastError('File size should be less than 10MB');
      return;
    }

    const allowedTypes = [
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/vnd.ms-excel',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'image/jpeg',
      'image/png',
      'image/gif',
      'application/zip',
      'application/x-rar-compressed',
      'text/plain',
      'text/markdown'
    ];

    if (!allowedTypes.includes(file.type)) {
      toastError('Invalid file type. Allowed: PDF, DOC, DOCX, XLS, XLSX, JPG, PNG, GIF, ZIP, RAR, TXT, MD');
      return;
    }

    setReplacementFile(file);
  };

  const handleUploadReplacementFile = async () => {
    if (!selectedMaterial) {
      toastError('Select a material first');
      return;
    }

    if (!replacementFile) {
      toastError('Choose a file to upload');
      return;
    }

    try {
      setUploadingFile(true);
      let result: any;

      if (selectedMaterial.file) {
        await apiService.deleteFile(selectedMaterial.id);
        result = await apiService.uploadFile(selectedMaterial.id, replacementFile);
      } else {
        result = await apiService.uploadFile(selectedMaterial.id, replacementFile);
      }

      toastSuccess(
        extractApiMessage(
          result,
          selectedMaterial.file ? 'File updated successfully' : 'File uploaded successfully'
        )
      );
      setShowFileUploadModal(false);
      resetReplacementFile();
      setSelectedMaterial(null);
      await loadMaterials();
    } catch (err: any) {
      console.error('Error uploading file:', err);
      toastError(extractApiError(err, selectedMaterial.file ? 'Failed to update file' : 'Failed to upload file'));
    } finally {
      setUploadingFile(false);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 10 * 1024 * 1024) {
        toastError('File size should be less than 10MB');
        return;
      }
      
      const allowedTypes = [
        'application/pdf',
        'application/msword',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'application/vnd.ms-excel',
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'image/jpeg',
        'image/png',
        'image/gif',
        'application/zip',
        'application/x-rar-compressed',
        'text/plain',
        'text/markdown'
      ];
      
      if (!allowedTypes.includes(file.type)) {
        toastError('Invalid file type. Allowed: PDF, DOC, DOCX, XLS, XLSX, JPG, PNG, GIF, ZIP, RAR, TXT, MD');
        return;
      }
      
      setUploadForm({ ...uploadForm, file });
    }
  };

  const handleDownload = async (material: SubjectMaterial) => {
    if (!material.file) {
      toastError('No file available for download');
      return;
    }

    try {
      const fileUrl = material.file.startsWith('http') 
        ? material.file 
        : `${API_BASE_URL}${material.file.startsWith('/') ? '' : '/'}${material.file}`;
      const blob = await teacherApi.files.downloadByUrl(fileUrl);
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = material.title || 'material';
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      
    } catch (err) {
      console.error('Download error:', err);
      toastError('Failed to download file');
    }
  };

  const handleSort = (key: string) => {
    setSortConfig({
      key,
      direction: sortConfig.key === key && sortConfig.direction === 'asc' ? 'desc' : 'asc'
    });
  };

  const getFilteredAndSortedMaterials = () => {
    let filtered = materials.filter(material => {
      const matchesSearch = searchTerm === '' || 
        material.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        material.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
        material.subject_name.toLowerCase().includes(searchTerm.toLowerCase());
      
      
      return matchesSearch;
    });

    filtered.sort((a, b) => {
      if (sortConfig.key === 'created_at') {
        const dateA = new Date(a.created_at).getTime();
        const dateB = new Date(b.created_at).getTime();
        return sortConfig.direction === 'desc' ? dateB - dateA : dateA - dateB;
      } else if (sortConfig.key === 'title') {
        const titleA = a.title.toLowerCase();
        const titleB = b.title.toLowerCase();
        return sortConfig.direction === 'desc' 
          ? titleB.localeCompare(titleA) 
          : titleA.localeCompare(titleB);
      }
      return 0;
    });

    return filtered;
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-IN', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (loading) {
    return (
      <div className={combine(getBgClass(), 'flex flex-col items-center justify-center px-3 py-3 sm:px-4 sm:py-4 xl:px-6 xl:py-6')}>
        <div className="text-center">
          <div className="relative">
            <FaSpinner className={combine('animate-spin text-5xl mb-4', theme === 'dark' ? 'text-blue-400' : 'text-blue-600')} />
            <div className={combine('absolute inset-0 rounded-full animate-ping opacity-20', theme === 'dark' ? 'bg-blue-900/40' : 'bg-blue-100')}></div>
          </div>
          <h3 className={combine('text-lg sm:text-xl font-semibold mb-2', get('text', 'primary'))}>Loading Subject Materials</h3>
          <p className={combine('text-xs sm:text-sm', get('text', 'secondary'))}>Fetching your teaching allocations...</p>
        </div>
      </div>
    );
  }

  const filteredMaterials = getFilteredAndSortedMaterials();
  const inputClass = getInputClass();
  const cardClass = combine('rounded-xl sm:rounded-2xl border shadow-lg', get('bg', 'card'), get('border', 'primary'));
  const itemsPerPage = 10;
  const totalPages = Math.max(1, Math.ceil(filteredMaterials.length / itemsPerPage));
  const safeCurrentPage = Math.min(currentPage, totalPages);
  const paginatedMaterials = viewMode === 'list'
    ? filteredMaterials.slice((safeCurrentPage - 1) * itemsPerPage, safeCurrentPage * itemsPerPage)
    : filteredMaterials;
  const pageStart = filteredMaterials.length === 0 ? 0 : (safeCurrentPage - 1) * itemsPerPage + 1;
  const pageEnd = viewMode === 'list'
    ? Math.min(safeCurrentPage * itemsPerPage, filteredMaterials.length)
    : filteredMaterials.length;
  const materialsWithFiles = materials.filter((material) => Boolean(material.file)).length;
  const materialsWithoutFiles = materials.length - materialsWithFiles;
  const activeSubjectsCount = new Set(materials.map((material) => material.subject_name)).size;

  return (
    <div className={`dashboard-typography px-3 py-3 sm:px-4 sm:py-4 xl:px-6 xl:py-6 ${getBgClass()} transition-colors duration-200`}>
      <div className="mx-auto w-full max-w-[1600px]">
        {/* Header */}
        <div className="mb-6 sm:mb-8">
          <div className={combine(
            'rounded-xl sm:rounded-2xl p-4 sm:p-6 shadow-lg text-white mb-6',
            theme === 'dark' ? 'bg-gradient-to-r from-blue-700 to-blue-800' : 'bg-gradient-to-r from-blue-500 to-blue-600'
          )}>
            <div className="flex flex-col gap-4 sm:gap-5 lg:flex-row lg:items-center lg:justify-between">
              <div className="flex items-start gap-3 sm:gap-4">
                <div className="p-2.5 sm:p-3 rounded-xl sm:rounded-2xl shadow-lg bg-white/20 backdrop-blur-sm">
                  <FaBook className="text-2xl sm:text-3xl" />
                </div>
                <div className="min-w-0">
                  <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold mb-1.5 sm:mb-2">Subject Materials Manager</h1>
                  <p className="text-xs sm:text-sm text-blue-100">
                    Upload and manage study materials for your subjects
                  </p>
                </div>
              </div>

              <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2 sm:gap-3">
                <div className="px-3 sm:px-4 py-2 sm:py-3 rounded-xl border border-white/20 bg-white/15 backdrop-blur-sm w-full sm:w-auto">
                  <div className="text-[11px] sm:text-xs text-blue-100">Teacher</div>
                  <div className="text-sm sm:text-base font-bold">
                    {teacherProfile?.name || 'Teacher'}
                  </div>
                </div>
                <div className="px-3 sm:px-4 py-2 sm:py-3 rounded-xl border border-white/20 bg-white/15 backdrop-blur-sm w-full sm:w-auto">
                  <div className="text-[11px] sm:text-xs text-blue-100">Subjects</div>
                  <div className="text-sm sm:text-base font-bold">
                    {subjectAllocations.length}
                  </div>
                </div>
                <div className="px-3 sm:px-4 py-2 sm:py-3 rounded-xl border border-white/20 bg-white/15 backdrop-blur-sm w-full sm:w-auto">
                  <div className="text-[11px] sm:text-xs text-blue-100">Materials</div>
                  <div className="text-sm sm:text-base font-bold">
                    {materials.length}
                  </div>
                </div>
                <button
                  onClick={() => setShowUploadModal(true)}
                  className={combine(getPrimaryButtonClass(), 'w-full sm:w-auto justify-center flex items-center gap-2 font-bold')}
                >
                  <FaUpload /> Upload New Material
                </button>
              </div>
            </div>
          </div>

          
        </div>

        {/* Filters Section */}
        <div className={combine(getCardGradientClass('blue'), 'mb-8')}>
          <div className="flex items-center gap-2 mb-6">
            <FaFilter className={combine('text-sm sm:text-base', get('accent', 'primary'))} />
            <h3 className={combine('text-base sm:text-lg font-semibold', get('text', 'primary'))}>Filter Materials</h3>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-5 gap-3 sm:gap-4 md:gap-5 mb-4 items-end">
            {/* Class Filter */}
            <div>
              <label className={combine('block text-xs sm:text-sm font-medium mb-2', get('text', 'secondary'))}>
                <div className="flex items-center gap-2">
                  <FaSchool /> Class *
                </div>
              </label>
              <select
                value={filters.class_name}
                onChange={(e) => handleClassFilterChange(e.target.value)}
                className={inputClass}
              >
                <option value="">Select Class</option>
                {availableClasses.map(cls => (
                  <option key={cls.id} value={cls.name}>
                    Class {cls.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className={combine('block text-xs sm:text-sm font-medium mb-2', get('text', 'secondary'))}>
                <div className="flex items-center gap-2">
                  <FaChalkboardTeacher /> Section *
                </div>
              </label>
              <select
                value={filters.section}
                onChange={(e) => handleSectionFilterChange(e.target.value)}
                disabled={!filters.class_name}
                className={inputClass}
              >
                <option value="">Select Section</option>
                {availableSections.map(sec => (
                  <option key={sec.id} value={sec.name}>
                    Section {sec.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className={combine('block text-xs sm:text-sm font-medium mb-2', get('text', 'secondary'))}>
                <div className="flex items-center gap-2">
                  <FaBook /> Subject *
                </div>
              </label>
              <select
                value={filters.subject}
                onChange={(e) => handleSubjectFilterChange(e.target.value)}
                disabled={!filters.class_name || !filters.section}
                className={inputClass}
              >
                <option value="">Select Subject</option>
                {availableSubjects.map(sub => (
                  <option key={sub.id} value={sub.name}>
                    {sub.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className={combine('block text-xs sm:text-sm font-medium mb-2', get('text', 'secondary'))}>
                <div className="flex items-center gap-2">
                  <FaCalendarAlt /> Date
                </div>
              </label>
              <input
                type="date"
                value={filters.date}
                onChange={(e) => setFilters({ ...filters, date: e.target.value })}
                className={inputClass}
              />
            </div>

            <div className="flex flex-col justify-end h-full">
              <label className="block text-xs sm:text-sm font-medium mb-2 opacity-0 pointer-events-none">
                Load
              </label>
              <button
                onClick={() => loadMaterials()}
                disabled={loadingMaterials || !filters.class_name || !filters.section || !filters.subject}
                className={`w-full flex items-center justify-center gap-2 ${
                  loadingMaterials || !filters.class_name || !filters.section || !filters.subject
                    ? 'bg-gray-300 text-gray-500 cursor-not-allowed px-4 sm:px-6 py-2.5 sm:py-3 rounded-lg sm:rounded-xl text-xs sm:text-sm'
                    : getPrimaryButtonClass()
                }`}
              >
                {loadingMaterials ? <FaSpinner className="animate-spin" /> : <FaFilter />}
                {loadingMaterials ? 'Loading...' : 'Load Materials'}
              </button>
            </div>

          </div>

          {/* Secondary Filters */}
          <div className="grid grid-cols-1 md:grid-cols-[minmax(0,1fr)_auto] gap-4 mt-4 items-end">
            <div>
  <label className={combine('block text-xs sm:text-sm font-medium mb-2', get('text', 'secondary'))}>
    Search
  </label>
  <div className="relative">
    <FaSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm sm:text-base" />
    <input
      type="text"
      placeholder="Search materials..."
      value={searchTerm}
      onChange={(e) => setSearchTerm(e.target.value)}
      className={combine(inputClass, 'pl-8 sm:pl-9')}
    />
  </div>
</div>

            <div className="flex flex-col justify-end">
              <label className="block text-xs sm:text-sm font-medium mb-2 opacity-0 pointer-events-none">
                View
              </label>
              <div className="flex items-center justify-end gap-2">
                <button
                  onClick={() => setViewMode('grid')}
                  className={`p-2.5 sm:p-3 rounded-lg flex items-center justify-center ${viewMode === 'grid' ? (theme === 'dark' ? 'bg-blue-900/30 text-blue-300' : 'bg-blue-100 text-blue-600') : combine(get('bg', 'secondary'), get('text', 'secondary'))}`}
                  title="Grid View"
                >
                  <FaThLarge />
                </button>
                <button
                  onClick={() => setViewMode('list')}
                  className={`p-2.5 sm:p-3 rounded-lg flex items-center justify-center ${viewMode === 'list' ? (theme === 'dark' ? 'bg-blue-900/30 text-blue-300' : 'bg-blue-100 text-blue-600') : combine(get('bg', 'secondary'), get('text', 'secondary'))}`}
                  title="List View"
                >
                  <FaList />
                </button>
              </div>
            </div>
          </div>

          {/* Current Selection Info */}
          {filters.class_name && filters.section && filters.subject && (
            <div className={combine(
              'mt-6 p-4 rounded-xl border',
              theme === 'dark' ? 'bg-gradient-to-r from-blue-900/20 to-indigo-900/20 border-blue-800' : 'bg-gradient-to-r from-blue-50 to-indigo-50 border-blue-200'
            )}>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4 flex-wrap">
                  <div className="flex items-center gap-2">
                    <FaSchool className={combine('text-sm', get('accent', 'primary'))} />
                    <span className={combine('font-semibold text-sm', get('accent', 'primary'))}>Class {filters.class_name}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <FaChalkboardTeacher className={combine('text-sm', get('accent', 'primary'))} />
                    <span className={combine('font-semibold text-sm', get('accent', 'primary'))}>Section {filters.section}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <FaBook className={combine('text-sm', get('accent', 'primary'))} />
                    <span
                      className="inline-flex items-center rounded-full border px-2.5 py-1 text-xs sm:text-sm font-semibold"
                      style={getSubjectGradientStyle(getSubjectColor(filters.subject))}
                    >
                      {filters.subject}
                    </span>
                  </div>
                  {filters.date && (
                    <div className="flex items-center gap-2">
                      <FaCalendarAlt className={combine('text-sm', get('accent', 'primary'))} />
                      <span className={combine('font-semibold text-sm', get('accent', 'primary'))}>
                        {new Date(filters.date).toLocaleDateString('en-US', { 
                          weekday: 'short', 
                          month: 'short', 
                          day: 'numeric' 
                        })}
                      </span>
                    </div>
                  )}
                </div>
                <div className={combine('text-xs sm:text-sm', get('text', 'secondary'))}>
                  {filteredMaterials.length} materials found
                </div>
              </div>
            </div>
          )}
        </div>

        <div className={combine(
          'mb-6 rounded-xl sm:rounded-2xl p-4 sm:p-6 border shadow-lg',
          theme === 'dark'
            ? 'bg-gradient-to-r from-blue-950/40 to-gray-900/60 border-blue-900/40'
            : 'bg-gradient-to-r from-blue-50 to-blue-100/70 border-blue-200'
        )}>
          <div className="grid grid-cols-1 min-[520px]:grid-cols-2 xl:grid-cols-4 gap-3 sm:gap-4 md:gap-6">
            <div className={getCardGradientClass('blue')}>
              <div className="text-center">
                <div className={combine('text-2xl sm:text-3xl font-bold mb-1.5', get('accent', 'primary'))}>
                  {materials.length}
                </div>
                <div className={combine('text-xs sm:text-sm font-medium', get('text', 'secondary'))}>Total Materials</div>
                <div className={combine('text-xs mt-1', get('text', 'tertiary'))}>Current filtered dataset</div>
              </div>
            </div>

            <div className={getCardGradientClass('emerald')}>
              <div className="text-center">
                <div className={combine('text-2xl sm:text-3xl font-bold mb-1.5', get('accent', 'success'))}>
                  {materialsWithFiles}
                </div>
                <div className={combine('text-xs sm:text-sm font-medium', get('text', 'secondary'))}>With File</div>
                <div className={combine('text-xs mt-1', get('text', 'tertiary'))}>Ready to download</div>
              </div>
            </div>

            <div className={getCardGradientClass('amber')}>
              <div className="text-center">
                <div className={combine('text-2xl sm:text-3xl font-bold mb-1.5', get('accent', 'warning'))}>
                  {materialsWithoutFiles}
                </div>
                <div className={combine('text-xs sm:text-sm font-medium', get('text', 'secondary'))}>Without File</div>
                <div className={combine('text-xs mt-1', get('text', 'tertiary'))}>Description-only materials</div>
              </div>
            </div>

            <div className={getCardGradientClass('indigo')}>
              <div className="text-center">
                <div className={combine('text-2xl sm:text-3xl font-bold mb-1.5', theme === 'dark' ? 'text-indigo-300' : 'text-indigo-600')}>
                  {activeSubjectsCount}
                </div>
                <div className={combine('text-xs sm:text-sm font-medium', get('text', 'secondary'))}>Subjects</div>
                <div className={combine('text-xs mt-1', get('text', 'tertiary'))}>Covered in results</div>
              </div>
            </div>
          </div>
        </div>

        {/* Materials Display */}
        {loadingMaterials ? (
          <div className={combine(cardClass, 'text-center py-12 rounded-xl sm:rounded-2xl')}>
            <FaSpinner className={combine('animate-spin text-4xl mx-auto mb-4', theme === 'dark' ? 'text-blue-300' : 'text-blue-600')} />
            <p className={combine('text-xs sm:text-sm', get('text', 'secondary'))}>Loading materials...</p>
          </div>
        ) : filteredMaterials.length > 0 ? (
          <div className={combine('rounded-xl sm:rounded-2xl shadow-lg overflow-hidden border', get('bg', 'card'), get('border', 'primary'))}>
            <div className={combine('p-4 sm:p-6 border-b', get('border', 'primary'))}>
              <div className="flex flex-col gap-3 sm:gap-4 lg:flex-row lg:items-center lg:justify-between">
                <h3 className={combine('text-base sm:text-lg font-semibold', get('text', 'primary'))}>
                  {viewMode === 'grid' ? 'Materials Grid View' : 'Materials List View'}
                </h3>
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:gap-4">
                  <div className={combine('text-xs sm:text-sm', get('text', 'tertiary'))}>
                    {viewMode === 'list'
                      ? `Showing ${pageStart}-${pageEnd} of ${filteredMaterials.length} materials`
                      : `Showing ${filteredMaterials.length} of ${materials.length} materials`}
                  </div>
                 
                </div>
              </div>
            </div>
            
            {viewMode === 'grid' ? (
              <div className="p-4 sm:p-6">
                <div className="grid grid-cols-1 min-[520px]:grid-cols-2 2xl:grid-cols-3 gap-3 sm:gap-4 md:gap-6">
                    {filteredMaterials.map((material) => {
                    const subjectColor = getSubjectColor(material.subject_name);
                    return (
                    <div
                      key={material.id}
                      className={combine(
                        'rounded-xl sm:rounded-2xl shadow-lg hover:shadow-xl transition-all duration-300 border overflow-hidden group',
                        theme === 'dark' ? 'bg-gradient-to-br from-gray-800 to-gray-900/50 border-gray-700' : 'bg-gradient-to-br from-white to-gray-50 border-gray-200'
                      )}
                    >
                      {/* Content */}
                      <div className="p-4 sm:p-6">
                        <div className="mb-4 flex items-center justify-between gap-3">
                          <span
                            className="inline-flex max-w-full items-center rounded-full border px-3 py-1 text-[11px] sm:text-xs font-semibold"
                            style={getSubjectGradientStyle(subjectColor)}
                          >
                            <span className="truncate">{material.subject_name}</span>
                          </span>
                          <span className={combine('text-[11px] sm:text-xs whitespace-nowrap', get('text', 'tertiary'))}>
                            Class {material.class_name}-{material.section}
                          </span>
                        </div>
                        <div className={combine('flex items-start justify-between gap-3 mb-4 pb-3 border-b', get('border', 'secondary'))}>
                          <h3 className={combine('text-base sm:text-lg font-bold line-clamp-2 flex-1', get('text', 'primary'))}>
                            {material.title}
                          </h3>
                          <div className="flex items-center gap-2 flex-shrink-0">
                            <button
                              onClick={() => {
                                setSelectedMaterial(material);
                                setEditingDescription(material.description);
                                setShowEditModal(true);
                              }}
                              className={combine(getSecondaryButtonClass(), 'px-2.5 py-2 flex items-center justify-center')}
                              title="Edit Material"
                            >
                              <FaEdit />
                            </button>
                            <button
                              onClick={() => {
                                setSelectedMaterial(material);
                                setShowDeleteModal(true);
                              }}
                              className={combine('px-2.5 py-2 rounded-lg transition-colors flex items-center justify-center text-xs sm:text-sm border', theme === 'dark' ? 'bg-red-900/20 text-red-300 border-red-800 hover:bg-red-900/30' : 'bg-red-50 text-red-600 border-red-200 hover:bg-red-100')}
                              title="Delete Material"
                            >
                              <FaTrash />
                            </button>
                          </div>
                        </div>
                        
                        <div className="mb-4">
                          <p className={combine('text-xs sm:text-sm line-clamp-3', get('text', 'secondary'))}>
                            {material.description || 'No description'}
                          </p>
                        </div>

                        {/* Details */}
                        <div className="space-y-2 mb-6">
                          <div className={combine('flex items-center gap-2 text-xs sm:text-sm', get('text', 'secondary'))}>
                            <FaUserTie className="text-green-500" />
                            <span>Posted by: {material.posted_by}</span>
                          </div>
                          <div className={combine('flex items-center gap-2 text-xs sm:text-sm', get('text', 'secondary'))}>
                            <FaClock className="text-purple-500" />
                            <span>{formatDate(material.created_at)}</span>
                          </div>
                        </div>

                        {/* File Info */}
                        {material.file && (
                          <div className={combine('mb-6 p-3 rounded-lg border', get('bg', 'secondary'), get('border', 'secondary'))}>
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-3">
                                {getFileIcon(material.file_type || 'unknown')}
                                <div>
                                  <div className={combine('text-xs sm:text-sm font-medium truncate max-w-[150px]', get('text', 'primary'))}>
                                    {material.file.split('/').pop()}
                                  </div>
                                  <div className={combine('text-xs', get('text', 'secondary'))}>
                                    {material.file_size}
                                  </div>
                                </div>
                              </div>
                            </div>
                          </div>
                        )}

                        {/* Actions */}
                        <div className="flex flex-wrap gap-2">
                          {material.file && (
                            <>
                              <button
                                onClick={() => handleDownload(material)}
                                className={combine(getPrimaryButtonClass(), 'flex-1 px-2 sm:px-3 py-2 flex items-center justify-center gap-1.5')}
                              >
                                <FaDownload /> Download
                              </button>
                              <button
                                onClick={() => openFileUploadModal(material)}
                                className={combine(getSecondaryButtonClass(), 'px-2 sm:px-3 py-2 flex items-center justify-center gap-1.5')}
                              >
                                <FaUpload /> Update File
                              </button>
                              <button
                                onClick={() => handleDeleteFile(material)}
                                className={combine('px-2 sm:px-3 py-2 border rounded-lg transition-colors flex items-center gap-1.5 text-xs sm:text-sm', theme === 'dark' ? 'bg-red-900/20 text-red-300 border-red-800 hover:bg-red-900/40' : 'bg-red-50 text-red-600 border-red-200 hover:bg-red-100')}
                              >
                                <FaTrash /> File
                              </button>
                            </>
                          )}
                          {!material.file && (
                            <button
                              onClick={() => openFileUploadModal(material)}
                              className={combine(getPrimaryButtonClass(), 'flex-1 px-2 sm:px-3 py-2 flex items-center justify-center gap-1.5')}
                            >
                              <FaUpload /> Upload File
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  )})}
                </div>
              </div>
            ) : (
              <>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className={combine('border-b', theme === 'dark' ? 'bg-gray-800 border-gray-700' : 'bg-gradient-to-r from-gray-50 to-gray-100 border-gray-200')}>
                        <th 
                          className={combine('py-4 px-6 text-left font-semibold cursor-pointer', get('text', 'secondary'))}
                          onClick={() => handleSort('title')}
                        >
                          <div className="flex items-center gap-2">
                            Title
                            {sortConfig.key === 'title' && (
                              sortConfig.direction === 'asc' ? <FaSortUp /> : <FaSortDown />
                            )}
                          </div>
                        </th>
                        <th className={combine('py-4 px-6 text-left font-semibold', get('text', 'secondary'))}>Subject</th>
                        <th className={combine('py-4 px-6 text-left font-semibold', get('text', 'secondary'))}>File Type</th>
                        <th 
                          className={combine('py-4 px-6 text-left font-semibold cursor-pointer', get('text', 'secondary'))}
                          onClick={() => handleSort('created_at')}
                        >
                          <div className="flex items-center gap-2">
                            Posted Date
                            {sortConfig.key === 'created_at' && (
                              sortConfig.direction === 'asc' ? <FaSortUp /> : <FaSortDown />
                            )}
                          </div>
                        </th>
                        <th className={combine('py-4 px-6 text-left font-semibold', get('text', 'secondary'))}>Posted By</th>
                        <th className={combine('py-4 px-6 text-left font-semibold', get('text', 'secondary'))}>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {paginatedMaterials.map((material) => (
                        <tr key={material.id} className={combine('transition-colors border-b', theme === 'dark' ? 'hover:bg-gray-800 border-gray-700' : 'hover:bg-blue-50 border-gray-200')}>
                          <td className="py-4 px-6">
                            <div>
                              <div className={combine('font-medium', get('text', 'primary'))}>{material.title}</div>
                              {material.description && (
                                <div className={combine('text-sm truncate max-w-xs', get('text', 'secondary'))}>
                                  {material.description}
                                </div>
                              )}
                            </div>
                          </td>
                          
                          <td className="py-4 px-6">
                            <span
                              className="inline-flex items-center rounded-full border px-3 py-1 text-xs font-semibold"
                              style={getSubjectGradientStyle(getSubjectColor(material.subject_name))}
                            >
                              {material.subject_name}
                            </span>
                          </td>
                          
                          <td className="py-4 px-6">
                            <div className={`px-3 py-1 rounded-lg border ${getFileTypeColor(material.file_type || 'unknown')} inline-flex items-center gap-2`}>
                              {getFileIcon(material.file_type || 'unknown')}
                              <span className="capitalize">{material.file_type || 'Text'}</span>
                            </div>
                          </td>
                          
                          <td className="py-4 px-6">
                            <div className={get('text', 'secondary')}>{new Date(material.created_at).toLocaleDateString()}</div>
                          </td>
                          
                          <td className="py-4 px-6">
                            <div className={get('text', 'secondary')}>{material.posted_by}</div>
                          </td>
                          
                          <td className="py-4 px-6">
                            <div className="flex items-center gap-2">
                              {material.file && (
                                <>
                                  <button
                                    onClick={() => handleDownload(material)}
                                    className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                                    title="Download"
                                  >
                                    <FaDownload />
                                  </button>
                                  <button
                                    onClick={() => openFileUploadModal(material)}
                                    className="p-2 text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                                    title="Update File"
                                  >
                                    <FaUpload />
                                  </button>
                                </>
                              )}
                              {!material.file && (
                                <button
                                  onClick={() => openFileUploadModal(material)}
                                  className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                                  title="Upload File"
                                >
                                  <FaUpload />
                                </button>
                              )}
                              <button
                                onClick={() => {
                                  setSelectedMaterial(material);
                                  setEditingDescription(material.description);
                                  setShowEditModal(true);
                                }}
                                className="p-2 text-green-600 hover:bg-green-50 rounded-lg transition-colors"
                                title="Edit"
                              >
                                <FaEdit />
                              </button>
                              <button
                                onClick={() => {
                                  setSelectedMaterial(material);
                                  setShowDeleteModal(true);
                                }}
                                className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
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
              {totalPages > 1 && (
                <div className={combine('px-3 sm:px-4 py-3 border-t', get('border', 'primary'))}>
                  <div className="flex flex-col sm:flex-row justify-between items-center gap-2 sm:gap-3">
                    <p className={combine('text-xs', get('text', 'tertiary'))}>
                      Page {safeCurrentPage} of {totalPages}
                    </p>
                    <div className="flex items-center space-x-1 sm:space-x-1.5">
                      <button
                        onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                        disabled={safeCurrentPage === 1}
                        className={combine(
                          'p-1 sm:p-1.5 rounded-lg sm:rounded-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed text-xs sm:text-sm',
                          getSecondaryButtonClass()
                        )}
                      >
                        <FaChevronLeft className="text-xs" />
                      </button>

                      <div className="flex space-x-0.5 sm:space-x-1">
                        {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                          let pageNum: number;
                          if (totalPages <= 5) {
                            pageNum = i + 1;
                          } else if (safeCurrentPage <= 3) {
                            pageNum = i + 1;
                          } else if (safeCurrentPage >= totalPages - 2) {
                            pageNum = totalPages - 4 + i;
                          } else {
                            pageNum = safeCurrentPage - 2 + i;
                          }

                          return (
                            <button
                              key={pageNum}
                              onClick={() => setCurrentPage(pageNum)}
                              className={combine(
                                'px-2 sm:px-3 py-1 sm:py-1.5 rounded-lg sm:rounded-xl transition-all font-medium text-xs',
                                safeCurrentPage === pageNum
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
                        disabled={safeCurrentPage === totalPages}
                        className={combine(
                          'p-1 sm:p-1.5 rounded-lg sm:rounded-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed text-xs sm:text-sm',
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
        ) : (
          <div className={combine('text-center py-12 sm:py-16 p-6 sm:p-8 rounded-xl sm:rounded-2xl shadow-lg border', get('bg', 'card'), get('border', 'primary'))}>
            <div className={combine('inline-flex items-center justify-center w-24 h-24 rounded-full mb-6', theme === 'dark' ? 'bg-blue-900/30' : 'bg-gradient-to-r from-blue-100 to-indigo-100')}>
              <FaBook className={combine('text-4xl', theme === 'dark' ? 'text-blue-300' : 'text-blue-600')} />
            </div>
            <h3 className={combine('text-xl sm:text-2xl font-bold mb-3', get('text', 'primary'))}>
              {filters.class_name && filters.section && filters.subject 
                ? 'No Materials Found' 
                : 'Select Filters to View Materials'}
            </h3>
            <p className={combine('max-w-md mx-auto mb-8 text-sm sm:text-base', get('text', 'secondary'))}>
              {filters.class_name && filters.section && filters.subject
                ? `No materials found for ${filters.subject} in Class ${filters.class_name}-${filters.section}. You can upload materials using the "Upload New Material" button.`
                : 'Please select a class, section, and subject to view materials'}
            </p>
            {subjectAllocations.length === 0 && (
              <div className="mt-4 p-4 bg-yellow-50 border border-yellow-200 rounded-xl max-w-md mx-auto">
                <p className="text-yellow-700 text-sm">
                  No teaching allocations found. You may not be assigned to any classes/subjects yet.
                </p>
              </div>
            )}
          </div>
        )}

        {/* Upload Modal */}
        {showUploadModal && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50 backdrop-blur-sm">
            <div className={combine('rounded-3xl max-w-[960px] w-[95%] shadow-2xl max-h-[90vh] overflow-hidden border', get('bg', 'card'), get('border', 'primary'))}>
              <div className={combine(
                'sticky top-0 px-4 sm:px-6 py-4 sm:py-5 border-b z-10',
                theme === 'dark'
                  ? 'bg-gradient-to-r from-blue-900 to-blue-950 text-white border-blue-900/60'
                  : 'bg-gradient-to-r from-blue-500 to-blue-600 text-white border-blue-200'
              )}>
                <div className="flex items-start justify-between gap-3 sm:gap-4">
                  <div className="flex min-w-0 items-start gap-3 sm:gap-4">
                    <div className="p-2.5 sm:p-3 rounded-xl sm:rounded-2xl shadow-lg bg-white/15">
                      <FaUpload className="text-xl sm:text-2xl text-white" />
                    </div>
                    <div className="min-w-0">
                      <h2 className="text-lg sm:text-xl md:text-2xl font-bold">Upload New Material</h2>
                      <p className="text-blue-100 text-xs sm:text-sm">Add new study material for your students</p>
                    </div>
                  </div>
                  <button
                    onClick={() => {
                      setShowUploadModal(false);
                      resetUploadForm();
                    }}
                    className="shrink-0 text-white/80 hover:text-white text-3xl hover:bg-white/10 w-10 h-10 rounded-full flex items-center justify-center transition-colors"
                  >
                    ×
                  </button>
                </div>
              </div>
              
              <div className="p-4 sm:p-6 max-h-[70vh] overflow-y-auto">
                <div className="space-y-4 sm:space-y-6">
                  {/* Class/Section/Subject Selection */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4 md:gap-6">
                    {/* Class Selection */}
                    <div>
                      <label className={combine('block text-xs sm:text-sm font-medium mb-2', get('text', 'primary'))}>
                        <div className="flex items-center gap-2">
                          <FaSchool /> Class *
                        </div>
                      </label>
                      <select
                        value={uploadForm.class_name}
                        onChange={(e) => {
                          handleUploadModalClassChange(e.target.value);
                        }}
                        className={inputClass}
                      >
                        <option value="">Select Class</option>
                        {uploadModalClasses.map(cls => (
                          <option key={cls.id} value={cls.name}>
                            Class {cls.name}
                          </option>
                        ))}
                      </select>
                    </div>

                    {/* Section Selection */}
                    <div>
                      <label className={combine('block text-xs sm:text-sm font-medium mb-2', get('text', 'primary'))}>
                        <div className="flex items-center gap-2">
                          <FaChalkboardTeacher /> Section *
                        </div>
                      </label>
                      <select
                        value={uploadForm.section_name}
                        onChange={(e) => {
                          handleUploadModalSectionChange(e.target.value);
                        }}
                        disabled={!uploadForm.class_name}
                        className={inputClass}
                      >
                        <option value="">Select Section</option>
                        {uploadModalSections.map(sec => (
                          <option key={sec.id} value={sec.name}>
                            Section {sec.name}
                          </option>
                        ))}
                      </select>
                    </div>

                    {/* Subject Selection */}
                    <div>
                      <label className={combine('block text-xs sm:text-sm font-medium mb-2', get('text', 'primary'))}>
                        <div className="flex items-center gap-2">
                          <FaBook /> Subject *
                        </div>
                      </label>
                      <select
                        value={uploadForm.subject_name}
                        onChange={(e) => handleUploadModalSubjectChange(e.target.value)}
                        disabled={!uploadForm.class_name || !uploadForm.section_name}
                        className={inputClass}
                      >
                        <option value="">Select Subject</option>
                        {uploadModalSubjects.map(sub => (
                          <option key={sub.id} value={sub.name}>
                            {sub.name}
                          </option>
                        ))}
                      </select>
                    </div>

                    {/* Date Selection */}
                    <div>
                      <label className={combine('block text-xs sm:text-sm font-medium mb-2', get('text', 'primary'))}>
                        <div className="flex items-center gap-2">
                          <FaCalendarAlt /> Date
                        </div>
                      </label>
                      <input
                        type="date"
                        value={uploadForm.date}
                        onChange={(e) => setUploadForm({ ...uploadForm, date: e.target.value })}
                        className={inputClass}
                      />
                    </div>
                  </div>

                  {/* Title */}
                  <div>
                    <label className={combine('block text-xs sm:text-sm font-medium mb-2', get('text', 'primary'))}>
                      Title *
                    </label>
                    <input
                      type="text"
                      value={uploadForm.title}
                      onChange={(e) => setUploadForm({ ...uploadForm, title: e.target.value })}
                      className={inputClass}
                      placeholder="Enter material title"
                    />
                  </div>

                  {/* Description */}
                  <div>
                    <label className={combine('block text-xs sm:text-sm font-medium mb-2', get('text', 'primary'))}>
                      Description
                    </label>
                    <textarea
                      value={uploadForm.description}
                      onChange={(e) => setUploadForm({ ...uploadForm, description: e.target.value })}
                      className={combine(inputClass, 'min-h-[120px] resize-y')}
                      placeholder="Enter material description (optional)"
                      rows={4}
                    />
                  </div>

                  {/* File Upload */}
                  <div>
                    <label className={combine('block text-xs sm:text-sm font-medium mb-2', get('text', 'primary'))}>
                      File (Optional)
                    </label>
                    <div className={combine(
                      'border-2 border-dashed rounded-xl sm:rounded-2xl p-4 sm:p-6 text-center transition-colors',
                      theme === 'dark'
                        ? 'border-gray-700 hover:border-blue-500 bg-gray-900/30'
                        : 'border-gray-300 hover:border-blue-400 bg-gray-50/60'
                    )}>
                      <input
                        ref={fileInputRef}
                        type="file"
                        onChange={handleFileChange}
                        className="hidden"
                        id="file-upload"
                      />
                      <label htmlFor="file-upload" className="cursor-pointer">
                        <div className="flex flex-col items-center gap-3">
                          <FaFileUpload className={combine('text-3xl sm:text-4xl', get('text', 'tertiary'))} />
                          <div>
                            <span className={combine('font-medium text-sm sm:text-base', get('accent', 'primary'))}>Click to upload</span>
                            <span className={combine('text-xs sm:text-sm', get('text', 'secondary'))}> or drag and drop</span>
                          </div>
                          <p className={combine('text-xs sm:text-sm', get('text', 'tertiary'))}>
                            PDF, DOC, DOCX, XLS, XLSX, JPG, PNG, GIF, ZIP, RAR, TXT, MD (Max 10MB)
                          </p>
                        </div>
                      </label>
                      {uploadForm.file && (
                        <div className={combine(
                          'mt-4 p-3 rounded-lg sm:rounded-xl border',
                          theme === 'dark'
                            ? 'bg-emerald-950/20 border-emerald-900/40'
                            : 'bg-green-50 border-green-200'
                        )}>
                          <div className="flex items-center justify-between gap-3">
                            <div className="flex items-center gap-3 min-w-0">
                              {getFileIcon(getFileType(uploadForm.file.name))}
                              <div className="min-w-0">
                                <div className={combine('font-medium text-xs sm:text-sm truncate', get('text', 'primary'))}>
                                  {uploadForm.file.name}
                                </div>
                                <div className={combine('text-xs sm:text-sm', get('text', 'secondary'))}>
                                  {(uploadForm.file.size / 1024 / 1024).toFixed(2)} MB
                                </div>
                              </div>
                            </div>
                            <button
                              onClick={() => {
                                setUploadForm({ ...uploadForm, file: null });
                                if (fileInputRef.current) fileInputRef.current.value = '';
                              }}
                              className={combine(get('accent', 'error'), 'hover:opacity-80')}
                            >
                              <FaTimes />
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Current Selection Info */}
                  {uploadForm.class_name && uploadForm.section_name && uploadForm.subject_name && (
                    <div className={combine(
                      'p-4 sm:p-6 rounded-xl sm:rounded-2xl border shadow-lg',
                      theme === 'dark'
                        ? 'bg-gradient-to-r from-blue-950/40 to-gray-900/60 border-blue-900/40'
                        : 'bg-gradient-to-r from-blue-50 to-blue-100/70 border-blue-200'
                    )}>
                      <div className="text-center">
                        <div className={combine('text-xs sm:text-sm font-semibold mb-1', get('accent', 'primary'))}>
                          Uploading material for:
                        </div>
                        <div className={combine('flex flex-wrap justify-center items-center gap-2 sm:gap-3 text-xs sm:text-sm', get('text', 'secondary'))}>
                          <div className="flex items-center gap-1">
                            <FaSchool className={combine(get('accent', 'primary'))} />
                            <span>Class {uploadForm.class_name}</span>
                          </div>
                          <div className="text-gray-400">•</div>
                          <div className="flex items-center gap-1">
                            <FaChalkboardTeacher className={combine(get('accent', 'primary'))} />
                            <span>Section {uploadForm.section_name}</span>
                          </div>
                          <div className="text-gray-400">•</div>
                          <div className="flex items-center gap-1">
                            <FaBook className={combine(get('accent', 'primary'))} />
                            <span>{uploadForm.subject_name}</span>
                          </div>
                          <div className="text-gray-400">•</div>
                          <div className="flex items-center gap-1">
                            <FaCalendarAlt className={combine(get('accent', 'primary'))} />
                            <span>
                              {new Date(uploadForm.date).toLocaleDateString('en-US', { 
                                weekday: 'short', 
                                month: 'short', 
                                day: 'numeric' 
                              })}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Action Buttons */}
                  <div className={combine('flex flex-col sm:flex-row gap-3 sm:gap-4 pt-6 border-t', get('border', 'secondary'))}>
                    <button
                      onClick={() => {
                        setShowUploadModal(false);
                        resetUploadForm();
                      }}
                      className={combine(getSecondaryButtonClass(), 'flex-1 px-6 py-3')}
                    >
                      Cancel
                    </button>
                    <button
                      onClick={handleUpload}
                      disabled={uploading || !uploadForm.title || !uploadForm.class_name || !uploadForm.section_name || !uploadForm.subject_name}
                      className={`flex-1 px-6 py-3 rounded-lg sm:rounded-xl font-medium text-xs sm:text-sm ${
                        uploading || !uploadForm.title || !uploadForm.class_name || !uploadForm.section_name || !uploadForm.subject_name
                          ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                          : getPrimaryButtonClass()
                      }`}
                    >
                      {uploading ? 'Uploading...' : 'Upload Material'}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* File Upload Modal */}
        {showFileUploadModal && selectedMaterial && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50 backdrop-blur-sm">
            <div className={combine('rounded-3xl max-w-2xl w-full shadow-2xl border', get('bg', 'card'), get('border', 'primary'))}>
              <div className={combine(
                'sticky top-0 px-6 py-5 border-b',
                theme === 'dark'
                  ? 'bg-gradient-to-r from-blue-900 to-blue-950 text-white border-blue-900/60'
                  : 'bg-gradient-to-r from-blue-500 to-blue-600 text-white border-blue-200'
              )}>
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-start gap-4">
                    <div className="p-3 rounded-2xl shadow-lg bg-white/15">
                      <FaFileUpload className="text-xl sm:text-2xl text-white" />
                    </div>
                    <div>
                      <h2 className="text-lg sm:text-xl md:text-2xl font-bold">
                        {selectedMaterial.file ? 'Update Material File' : 'Upload Material File'}
                      </h2>
                      <p className="text-blue-100 text-xs sm:text-sm">
                        {selectedMaterial.file
                          ? 'Replace the current file for this subject material'
                          : 'Add a file to the existing subject material record'}
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() => {
                      setShowFileUploadModal(false);
                      resetReplacementFile();
                    }}
                    className="text-white/80 hover:text-white text-3xl hover:bg-white/10 w-10 h-10 rounded-full flex items-center justify-center transition-colors"
                  >
                    ×
                  </button>
                </div>
              </div>

              <div className="p-6 space-y-6">
                <div className={combine(
                  'p-4 rounded-2xl border',
                  theme === 'dark'
                    ? 'bg-blue-950/20 border-blue-900/40'
                    : 'bg-blue-50/80 border-blue-200'
                )}>
                  <div className="flex flex-wrap items-center gap-3 text-sm">
                    <span className={combine('font-semibold', get('text', 'primary'))}>{selectedMaterial.title}</span>
                    <span className={combine('text-xs sm:text-sm', get('text', 'secondary'))}>
                      Class {selectedMaterial.class_name}-{selectedMaterial.section}
                    </span>
                    <span
                      className="inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-semibold"
                      style={getSubjectGradientStyle(getSubjectColor(selectedMaterial.subject_name))}
                    >
                      {selectedMaterial.subject_name}
                    </span>
                  </div>
                  {selectedMaterial.file && (
                    <div className={combine('mt-3 text-xs sm:text-sm', get('text', 'secondary'))}>
                      Current file: {selectedMaterial.file.split('/').pop()}
                    </div>
                  )}
                </div>

                <div className={combine(
                  'border-2 border-dashed rounded-xl sm:rounded-2xl p-4 sm:p-6 text-center transition-colors',
                  theme === 'dark'
                    ? 'border-gray-700 hover:border-blue-500 bg-gray-900/30'
                    : 'border-gray-300 hover:border-blue-400 bg-gray-50/60'
                )}>
                  <input
                    ref={replacementFileInputRef}
                    type="file"
                    onChange={handleReplacementFileChange}
                    className="hidden"
                    id="replacement-file-upload"
                  />
                  <label htmlFor="replacement-file-upload" className="cursor-pointer">
                    <div className="flex flex-col items-center gap-3">
                      <FaPaperclip className={combine('text-3xl sm:text-4xl', get('text', 'tertiary'))} />
                      <div>
                        <span className={combine('font-medium text-sm sm:text-base', get('accent', 'primary'))}>
                          {selectedMaterial.file ? 'Choose new file' : 'Choose file'}
                        </span>
                        <span className={combine('text-xs sm:text-sm', get('text', 'secondary'))}>
                          {selectedMaterial.file ? ' to replace the current one' : ' for this material'}
                        </span>
                      </div>
                      <p className={combine('text-xs sm:text-sm', get('text', 'tertiary'))}>
                        PDF, DOC, DOCX, XLS, XLSX, JPG, PNG, GIF, ZIP, RAR, TXT, MD (Max 10MB)
                      </p>
                    </div>
                  </label>
                  {replacementFile && (
                    <div className={combine(
                      'mt-4 p-3 rounded-xl border text-left',
                      theme === 'dark'
                        ? 'bg-emerald-950/20 border-emerald-900/40'
                        : 'bg-green-50 border-green-200'
                    )}>
                      <div className="flex items-center justify-between gap-3">
                        <div className="flex items-center gap-3 min-w-0">
                          {getFileIcon(getFileType(replacementFile.name))}
                          <div className="min-w-0">
                            <div className={combine('font-medium text-sm truncate', get('text', 'primary'))}>
                              {replacementFile.name}
                            </div>
                            <div className={combine('text-xs sm:text-sm', get('text', 'secondary'))}>
                              {(replacementFile.size / 1024 / 1024).toFixed(2)} MB
                            </div>
                          </div>
                        </div>
                        <button
                          onClick={resetReplacementFile}
                          className={combine(get('accent', 'error'), 'hover:opacity-80')}
                        >
                          <FaTimes />
                        </button>
                      </div>
                    </div>
                  )}
                </div>

                <div className={combine('flex flex-col sm:flex-row gap-3 pt-2 border-t', get('border', 'secondary'))}>
                  <button
                    onClick={() => {
                      setShowFileUploadModal(false);
                      resetReplacementFile();
                    }}
                    className={combine(getSecondaryButtonClass(), 'flex-1 px-6 py-3')}
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleUploadReplacementFile}
                    disabled={uploadingFile || !replacementFile}
                    className={`flex-1 px-6 py-3 rounded-lg sm:rounded-xl font-medium text-xs sm:text-sm ${
                      uploadingFile || !replacementFile
                        ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                        : getPrimaryButtonClass()
                    }`}
                  >
                    {uploadingFile ? (selectedMaterial.file ? 'Updating...' : 'Uploading...') : (selectedMaterial.file ? 'Update File' : 'Upload File')}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Edit Modal */}
        {showEditModal && selectedMaterial && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50 backdrop-blur-sm">
            <div className={combine('rounded-3xl max-w-2xl w-full shadow-2xl border', get('bg', 'card'), get('border', 'primary'))}>
              <div className={combine('sticky top-0 border-b px-8 py-6 flex justify-between items-center', get('bg', 'card'), get('border', 'primary'))}>
                <div className="flex items-center gap-4">
                  <div className={combine('p-3 rounded-xl', theme === 'dark' ? 'bg-gradient-to-r from-blue-700 to-blue-800' : 'bg-gradient-to-r from-blue-500 to-blue-600')}>
                    <FaEdit className="text-2xl text-white" />
                  </div>
                  <div>
                    <h2 className={combine('text-2xl font-bold', get('text', 'primary'))}>Edit Material</h2>
                    <p className={get('text', 'secondary')}>{selectedMaterial.title}</p>
                  </div>
                </div>
                <button
                  onClick={() => setShowEditModal(false)}
                  className={combine('text-3xl w-10 h-10 rounded-full flex items-center justify-center', get('text', 'secondary'), theme === 'dark' ? 'hover:bg-gray-700' : 'hover:bg-gray-100')}
                >
                  ×
                </button>
              </div>

              <div className="p-8">
                <div>
                  <label className={combine('block text-sm font-medium mb-2', get('text', 'secondary'))}>
                    Description
                  </label>
                  <textarea
                    value={editingDescription}
                    onChange={(e) => setEditingDescription(e.target.value)}
                    className={inputClass}
                    rows={6}
                    placeholder="Enter material description"
                  />
                </div>

                <div className={combine('flex justify-end gap-4 pt-6 border-t', get('border', 'primary'))}>
                  <button
                    onClick={() => setShowEditModal(false)}
                    className={getSecondaryButtonClass()}
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleUpdateDescription}
                    className={getPrimaryButtonClass()}
                  >
                    Update Description
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Delete Modal */}
        {showDeleteModal && selectedMaterial && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50 backdrop-blur-sm">
            <div className={combine('rounded-3xl max-w-md w-full shadow-2xl border', get('bg', 'card'), get('border', 'primary'))}>
              <div className="p-8">
                <div className="text-center mb-6">
                  <div className="inline-flex items-center justify-center w-16 h-16 bg-red-100 rounded-full mb-4">
                    <FaExclamationTriangle className="text-2xl text-red-600" />
                  </div>
                  <h2 className={combine('text-2xl font-bold mb-2', get('text', 'primary'))}>Delete Material</h2>
                  <p className={get('text', 'secondary')}>
                    Are you sure you want to delete "{selectedMaterial.title}"?
                  </p>
                  {selectedMaterial.file && (
                    <p className="text-red-600 mt-2">
                      This will also delete the associated file
                    </p>
                  )}
                </div>

                <div className="flex justify-center gap-4">
                  <button
                    onClick={() => setShowDeleteModal(false)}
                    className={getSecondaryButtonClass()}
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleDeleteMaterial}
                    className="px-6 py-3 bg-gradient-to-r from-red-500 to-red-600 text-white rounded-xl hover:from-red-600 hover:to-red-700"
                  >
                    Delete Material
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Error State */}
        {error && (
          <div className={combine(
            'mt-8 border px-6 py-4 rounded-2xl flex items-center gap-4 shadow-lg',
            theme === 'dark' ? 'bg-red-900/20 border-red-800 text-red-300' : 'bg-gradient-to-r from-red-50 to-red-100 border-red-200 text-red-700'
          )}>
            <div className="p-3 bg-red-100 rounded-xl">
              <FaExclamationTriangle className="text-2xl text-red-600" />
            </div>
            <div className="flex-1">
              <h4 className="font-bold">Error Loading Data</h4>
              <p>{error}</p>
            </div>
            <button
              onClick={loadTeacherData}
              className={combine('px-4 py-2 rounded-lg text-white', theme === 'dark' ? 'bg-red-700 hover:bg-red-800' : 'bg-red-600 hover:bg-red-700')}
            >
              Retry
            </button>
          </div>
        )}

        {/* Footer Info */}
        <div className={combine('mt-8 pt-6 border-t text-center text-sm', get('border', 'primary'), get('text', 'secondary'))}>
          <p>
            Subject Materials Manager • 
            Allocated Subjects: {subjectAllocations.length} • 
            Last updated: {new Date().toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
          </p>
          {filters.class_name && filters.section && filters.subject && (
            <p className={combine('mt-1', theme === 'dark' ? 'text-blue-300' : 'text-blue-600')}>
              Currently viewing materials for {filters.subject} | Class {filters.class_name}-{filters.section}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
