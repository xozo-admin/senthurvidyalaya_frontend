'use client';

import React, { useState, useEffect } from 'react';
import { FaUpload, FaFilePdf, FaFileWord, FaFileExcel, FaFileImage, FaDownload, FaTrash, FaEye, FaCalendar, FaBook, FaFilter, FaTimes, FaEdit, FaExclamationTriangle, FaThLarge, FaList } from 'react-icons/fa';
import { IoDocumentText } from 'react-icons/io5';
import { teacherApi } from '@/lib/api';
import { toastSuccess, toastError } from '@/lib/toast';
import { useTheme } from '@/contexts/ThemeContext';
import { useThemeClasses } from '@/hooks/useThemeClasses';

// Define TypeScript interfaces
interface ClassResource {
  id: number;
  title: string;
  description: string;
  subject_name: string | null;
  section: string;
  class_name?: string;
  file: string;
  posted_by_name: string;
  created_at: string;
  subject?: {
    name: string;
  };
  academic_year?: string;
}

interface Subject {
  subject_id: number;
  subject_name: string;
  subject_code: string;
}

interface ClassResourceSummary {
  class_name: string;
  section: string;
  academic_year: string;
  total_resources: number;
  general_resources: number;
  subject_resources: number;
  unique_subjects: number;
}

const MEDIA_BASE_URL = process.env.NEXT_PUBLIC_API_MEDIA_BASE_URL || 'https://senthurvidyalaya-backend.onrender.com';

export default function ClassResources() {
  const { theme } = useTheme();
  const { get, combine } = useThemeClasses();
  const [allResources, setAllResources] = useState<ClassResource[]>([]);
  const [filteredResources, setFilteredResources] = useState<ClassResource[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [updating, setUpdating] = useState(false);
  const [editingResource, setEditingResource] = useState<ClassResource | null>(null);
  const [editDescription, setEditDescription] = useState('');
  const [confirmAction, setConfirmAction] = useState<{
    type: 'delete-resource';
    resource: ClassResource;
  } | null>(null);
  
  // Filters
  const [selectedDate, setSelectedDate] = useState('');
  const [selectedSubject, setSelectedSubject] = useState<string>('all');
  const [filterApplied, setFilterApplied] = useState(false);
  
  // User info and subjects
  const [userInfo, setUserInfo] = useState({
    class: '',
    section: '',
    isClassTeacher: false,
    teacherName: ''
  });
  
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [loadingSubjects, setLoadingSubjects] = useState(false);
  const [summary, setSummary] = useState<ClassResourceSummary>({
    class_name: '',
    section: '',
    academic_year: '',
    total_resources: 0,
    general_resources: 0,
    subject_resources: 0,
    unique_subjects: 0,
  });

  // Form state for teacher upload
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    subject: '',
    file: null as File | null
  });

  const [activeYearLabel, setActiveYearLabel] = useState('');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');

  const getBgClass = () => combine(
    get('bg', 'primary'),
    'min-h-screen transition-colors duration-200'
  );

  const getCardGradientClass = (color: string = 'blue') => {
    const baseClasses = combine(
      'rounded-xl sm:rounded-2xl p-4 sm:p-6 border shadow-lg transition-all duration-300',
      get('border', 'primary')
    );

    if (color === 'blue') {
      return combine(baseClasses, 'bg-gradient-to-br', theme === 'dark' ? 'from-gray-800 to-blue-900/10' : 'from-white to-blue-50');
    }
    if (color === 'emerald') {
      return combine(baseClasses, 'bg-gradient-to-br', theme === 'dark' ? 'from-gray-800 to-emerald-900/10' : 'from-white to-emerald-50');
    }
    if (color === 'purple') {
      return combine(baseClasses, 'bg-gradient-to-br', theme === 'dark' ? 'from-gray-800 to-purple-900/10' : 'from-white to-purple-50');
    }
    return combine(baseClasses, 'bg-gradient-to-br', get('bg', 'card'));
  };

  const getInputClass = () => combine(
    'w-full px-3 sm:px-4 py-2.5 sm:py-3 rounded-lg sm:rounded-xl border focus:ring-2 focus:ring-blue-500 outline-none transition-all',
    'text-xs sm:text-sm',
    theme === 'dark'
      ? 'bg-gray-900 border-gray-600 text-gray-100 hover:border-gray-500 focus:border-blue-400'
      : 'bg-white border-gray-300 text-gray-900 hover:border-gray-400 focus:border-blue-500'
  );

  const getPrimaryButtonClass = () => combine(
    'px-4 sm:px-6 py-2.5 sm:py-3 rounded-lg sm:rounded-xl transition-all duration-200 font-medium',
    'text-white shadow-lg hover:shadow-xl hover:scale-[1.02] active:scale-[0.98]',
    'text-xs sm:text-sm',
    theme === 'dark'
      ? 'bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800'
      : 'bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700'
  );

  const getSecondaryButtonClass = () => combine(
    'px-3 sm:px-4 py-2 sm:py-3 rounded-lg sm:rounded-xl transition-all duration-200 font-medium hover:scale-[1.02] active:scale-[0.98]',
    'text-xs sm:text-sm',
    'border',
    get('border', 'secondary'),
    get('bg', 'card'),
    get('text', 'secondary'),
    'hover:bg-[var(--color-bg-hover)] hover:text-[var(--color-text-primary)]'
  );

  const getModalBgClass = () => combine(
    'rounded-xl sm:rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto border shadow-xl',
    theme === 'dark' ? 'bg-gray-900 border-gray-700' : 'bg-white border-gray-200'
  );

  const getModalHeaderClass = () => combine(
    'sticky top-0 border-b px-6 py-4 flex justify-between items-center',
    theme === 'dark' ? 'bg-gray-900 border-gray-700' : 'bg-white border-gray-200'
  );

  const getModalBodyClass = () => combine(
    'p-6',
    theme === 'dark' ? 'bg-gray-900' : 'bg-white'
  );

  const getFileUploadAreaClass = () => {
    const baseClass = 'border-2 rounded-lg sm:rounded-xl p-6 text-center transition-all';
    if (formData.file) {
      return combine(
        baseClass,
        theme === 'dark' 
          ? 'border-emerald-700 bg-emerald-900/20' 
          : 'border-green-500 bg-green-50'
      );
    }
    return combine(
      baseClass,
      'border-dashed',
      theme === 'dark' 
        ? 'border-gray-600 bg-gray-800/50 hover:border-gray-500' 
        : 'border-gray-300 bg-gray-50 hover:border-gray-400'
    );
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
    'commerce general': { bg: '#92400E', text: '#FFFFFF', border: '#92400E' },
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

    return null;
  };

  const getSubjectGradientStyle = (color: { bg: string; text: string; border: string }) => ({
    backgroundImage: `linear-gradient(135deg, rgba(255,255,255,0.20) 0%, rgba(255,255,255,0.04) 42%, rgba(0,0,0,0.14) 100%), linear-gradient(135deg, ${color.bg} 0%, ${color.bg} 100%)`,
    borderColor: color.border,
    color: color.text
  });

  const getSubjectHeaderStyle = (color: { bg: string; text: string; border: string }) => ({
    backgroundImage: `linear-gradient(135deg, rgba(255,255,255,0.18) 0%, rgba(255,255,255,0.06) 60%, rgba(0,0,0,0.18) 100%), linear-gradient(135deg, ${color.bg} 0%, ${color.bg} 100%)`,
    borderColor: color.border,
    color: color.text
  });

  const getTagClass = (type: 'subject' | 'class' | 'teacher' | 'badge') => {
    const baseClass = 'px-2 sm:px-3 py-1 rounded-full font-medium text-xs sm:text-sm';
    
    if (type === 'subject') {
      return combine(
        baseClass,
        theme === 'dark' 
          ? 'bg-blue-900/30 text-blue-300' 
          : 'bg-blue-100 text-blue-800'
      );
    }
    if (type === 'class') {
      return combine(
        baseClass,
        theme === 'dark' 
          ? 'bg-emerald-900/30 text-emerald-300' 
          : 'bg-green-100 text-green-800'
      );
    }
    if (type === 'teacher') {
      return combine(
        baseClass,
        theme === 'dark' 
          ? 'bg-purple-900/30 text-purple-300' 
          : 'bg-purple-100 text-purple-800'
      );
    }
    return combine(
      baseClass,
      theme === 'dark' 
        ? 'bg-gray-700 text-gray-300' 
        : 'bg-gray-100 text-gray-800'
    );
  };

  const extractApiError = (err: any, fallback: string) => {
    const responseData = err?.response?.data;

    if (typeof responseData?.error === 'string') {
      return responseData.error;
    }

    if (typeof responseData?.message === 'string') {
      return responseData.message;
    }

    if (Array.isArray(responseData)) {
      return responseData.join(', ');
    }

    if (responseData && typeof responseData === 'object') {
      const values = Object.values(responseData).flat().filter(Boolean);
      if (values.length) {
        return values.map((value) => String(value)).join(', ');
      }
    }

    return fallback;
  };

  const normalizeClassResource = (resource: any): ClassResource => ({
    id: resource.id,
    title: resource.title || '',
    description: resource.description || '',
    subject_name: resource.subject_name || null,
    section: resource.section_name || resource.section || '',
    class_name: resource.class_name || userInfo.class,
    file: resource.file || '',
    posted_by_name: resource.posted_by_name || '',
    created_at: resource.created_at || '',
    academic_year: resource.academic_year,
  });

  const fetchUserInfoAndSubjects = async () => {
    try {
      const profileResponse = await teacherApi.profile.get();
      const profileData = profileResponse.data?.data || profileResponse.data;
      const subjectResponse = await teacherApi.subjects.myClass();
      const subjectData = subjectResponse.data?.data || subjectResponse.data || {};

      const className =
        subjectData?.assigned_class?.class_name ||
        profileData?.class_name ||
        '';
      const sectionName =
        subjectData?.assigned_class?.section_name ||
        profileData?.section_name ||
        '';

      setUserInfo({
        class: className,
        section: sectionName,
        isClassTeacher: Boolean(subjectData?.assigned_class),
        teacherName: profileData?.name || ''
      });

      setSubjects(Array.isArray(subjectData?.subjects) ? subjectData.subjects : []);
    } catch (err) {
      console.error('Error fetching user info:', err);
      setSubjects([]);
      toastError(extractApiError(err, 'Failed to load teacher class and subject details.'));
    }
  };

  const fetchResources = async (filters?: { date?: string; subject?: string }) => {
    try {
      setLoading(true);

      if (!userInfo.isClassTeacher || !userInfo.class || !userInfo.section) {
        setActiveYearLabel('');
        setAllResources([]);
        setFilteredResources([]);
        setLoading(false);
        return;
      }

      const requestParams = {
        ...(filters?.date ? { date: filters.date } : {}),
        ...(filters?.subject && !['general', 'all'].includes(filters.subject)
          ? { subject: filters.subject }
          : {}),
      };

      const response =
        filters?.subject === 'all'
          ? await teacherApi.resources.listAll(requestParams)
          : await teacherApi.resources.list(requestParams);

      const payload = response.data || {};
      if (payload?.year) {
        setActiveYearLabel(payload.year);
      }

      const resources = (payload?.data || payload || [])
        .map(normalizeClassResource)
        .sort((a: ClassResource, b: ClassResource) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

      setAllResources(resources);
      setFilteredResources(resources);
    } catch (err: any) {
      console.error('Network error:', err);
      toastError(extractApiError(err, 'Error fetching resources. Please check your connection.'));
      setAllResources([]);
      setFilteredResources([]);
    } finally {
      setLoading(false);
    }
  };

  const fetchAllResources = async () => {
    await fetchResources({ subject: 'all' });
  };

  const fetchResourceSummary = async () => {
    try {
      const response = await teacherApi.resources.summary();
      const summaryData = response.data?.data || response.data || {};

      setSummary({
        class_name: summaryData.class_name || '',
        section: summaryData.section || '',
        academic_year: summaryData.academic_year || '',
        total_resources: Number(summaryData.total_resources || 0),
        general_resources: Number(summaryData.general_resources || 0),
        subject_resources: Number(summaryData.subject_resources || 0),
        unique_subjects: Number(summaryData.unique_subjects || 0),
      });
    } catch (err) {
      console.error('Error fetching resource summary:', err);
      setSummary({
        class_name: '',
        section: '',
        academic_year: '',
        total_resources: 0,
        general_resources: 0,
        subject_resources: 0,
        unique_subjects: 0,
      });
    }
  };

  const handleApplyFilters = async () => {
    const filters: { date?: string; subject?: string } = {};
    
    if (selectedDate) {
      filters.date = selectedDate;
    }
    
    if (selectedSubject) {
      filters.subject = selectedSubject;
    }
    
    await fetchResources(filters);
    setFilterApplied(Boolean(filters.date || (filters.subject && !['general'].includes(filters.subject))));
  };

  const handleClearFilters = async () => {
    setSelectedDate('');
    setSelectedSubject('all');
    setFilterApplied(false);
    await fetchAllResources();
  };

  useEffect(() => {
    const loadInitialData = async () => {
      setLoadingSubjects(true);
      await fetchUserInfoAndSubjects();
      setLoadingSubjects(false);
    };

    loadInitialData();
  }, []);

  useEffect(() => {
    if (userInfo.class && userInfo.section) {
      fetchResourceSummary();
      fetchAllResources();
    }
  }, [userInfo.class, userInfo.section, userInfo.isClassTeacher, subjects.length]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      if (file.size > 10 * 1024 * 1024) {
        toastError('File size must be less than 10MB.');
        return;
      }
      setFormData(prev => ({ ...prev, file }));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.file) {
      toastError('Please select a file.');
      return;
    }

    if (!formData.title.trim()) {
      toastError('Please enter a title.');
      return;
    }

    if (!userInfo.class || !userInfo.section) {
      toastError('Class and section details are required before uploading resources.');
      return;
    }

    if (!userInfo.isClassTeacher) {
      toastError('Only class teachers can manage class resources.');
      return;
    }

    try {
      setUploading(true);
      const formDataToSend = new FormData();
      
      formDataToSend.append('title', formData.title.trim());
      
      if (formData.description.trim()) {
        formDataToSend.append('description', formData.description.trim());
      }
      
      formDataToSend.append('file', formData.file);

      if (formData.subject.trim()) {
        formDataToSend.append('subject', formData.subject.trim());
      }

      const response = await teacherApi.resources.create(formDataToSend);
      toastSuccess(response.data?.message || 'Resource posted successfully.');
      setShowUploadModal(false);
      setFormData({
        title: '',
        description: '',
        subject: '',
        file: null
      });
      await fetchResourceSummary();
      await handleApplyFilters();
    } catch (err: any) {
      console.error('Upload error:', err);
      toastError(extractApiError(err, err?.message || 'Error uploading resource. Please try again.'));
    } finally {
      setUploading(false);
    }
  };

  const handleDeleteResource = async (resource: ClassResource) => {
    setConfirmAction({ type: 'delete-resource', resource });
  };

  const confirmDeleteResource = async (resource: ClassResource) => {

    try {
      const response = await teacherApi.resources.delete(resource.id);
      toastSuccess(response.data?.message || 'Resource deleted successfully.');
      await fetchResourceSummary();
      await handleApplyFilters();
    } catch (err: any) {
      console.error('Delete error:', err);
      toastError(extractApiError(err, 'Error deleting resource. Please try again.'));
    } finally {
      setConfirmAction(null);
    }
  };

  const handleOpenEditModal = (resource: ClassResource) => {
    setEditingResource(resource);
    setEditDescription(resource.description || '');
    setShowEditModal(true);
  };

  const handleUpdateResource = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!editingResource) {
      return;
    }

    if (!editDescription.trim()) {
      toastError('Description is required.');
      return;
    }

    try {
      setUpdating(true);

      const response = await teacherApi.resources.update({
        resource_id: editingResource.id,
        description: editDescription.trim(),
      });
      toastSuccess(response.data?.message || 'Resource updated successfully.');
      setShowEditModal(false);
      setEditingResource(null);
      setEditDescription('');
      await fetchResourceSummary();
      await handleApplyFilters();
    } catch (err: any) {
      console.error('Update error:', err);
      toastError(extractApiError(err, 'Error updating resource. Please try again.'));
    } finally {
      setUpdating(false);
    }
  };

  const getFileIcon = (filename: string) => {
    const ext = filename.split('.').pop()?.toLowerCase();
    switch (ext) {
      case 'pdf': return <FaFilePdf className="text-red-500 text-xl" />;
      case 'doc':
      case 'docx': return <FaFileWord className="text-blue-500 text-xl" />;
      case 'xls':
      case 'xlsx': return <FaFileExcel className="text-green-500 text-xl" />;
      case 'jpg':
      case 'jpeg':
      case 'png':
      case 'gif': return <FaFileImage className="text-purple-500 text-xl" />;
      default: return <IoDocumentText className={combine("text-xl", get('text', 'tertiary'))} />;
    }
  };

  const formatDate = (dateString: string) => {
    try {
      return new Date(dateString).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch {
      return dateString;
    }
  };

  const getFileNameFromUrl = (url: string) => {
    try {
      return url.split('/').pop() || 'file';
    } catch {
      return 'file';
    }
  };

  const buildFileUrl = (filePath: string) => {
    if (!filePath) {
      return '';
    }

    if (filePath.startsWith('http')) {
      return filePath;
    }
    return `${MEDIA_BASE_URL}${filePath}`;
  };

  const canManageResourceActions = (resource: ClassResource) => {
    if (!resource.subject_name) {
      return true;
    }

    return resource.posted_by_name.trim().toLowerCase() === userInfo.teacherName.trim().toLowerCase();
  };

  const subjectCount = subjects.length;
  const canManageResources = userInfo.isClassTeacher && Boolean(userInfo.class) && Boolean(userInfo.section);
  const classLabel = summary.class_name || userInfo.class || '--';
  const sectionLabel = summary.section || userInfo.section || '--';
  const editSubjectColor = editingResource?.subject_name
    ? getSubjectColor(editingResource.subject_name)
    : null;

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-[400px]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className={`dashboard-typography px-3 py-3 sm:px-4 sm:py-4 xl:px-6 xl:py-6 ${getBgClass()} transition-colors duration-200`}>
      <div className="mx-auto w-full max-w-[1600px]">
        {/* Header */}
        <div className="mb-6 sm:mb-8">
          <div className={combine(
            "rounded-xl sm:rounded-2xl p-4 sm:p-6 shadow-lg text-white mb-6",
            theme === 'dark'
              ? "bg-gradient-to-r from-blue-700 to-blue-800"
              : "bg-gradient-to-r from-blue-500 to-blue-600"
          )}>
            <div className="flex flex-col gap-4 sm:gap-5 lg:flex-row lg:items-center lg:justify-between">
              <div className="flex items-start gap-3 sm:gap-4">
                <div className="p-2.5 sm:p-3 rounded-xl sm:rounded-2xl shadow-lg bg-white/20 backdrop-blur-sm">
                  <FaBook className="text-2xl sm:text-3xl" />
                </div>
                <div className="min-w-0">
                  <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold mb-1.5 sm:mb-2">Class Resources</h1>
                  <p className="text-xs sm:text-sm text-blue-100 flex items-center gap-2">
                    <FaFilter className="text-xs sm:text-sm" />
                    Share and manage educational materials with your class
                  </p>
                </div>
              </div>

              <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2 sm:gap-3">
                <button
                  onClick={() => {
                    setShowUploadModal(true);
                  }}
                  className={combine(
                    getPrimaryButtonClass(),
                    "flex w-full sm:w-auto items-center justify-center gap-2"
                  )}
                  disabled={!canManageResources}
                  title={
                    !userInfo.class || !userInfo.section
                      ? 'Teacher class details are not available yet'
                      : !canManageResources
                        ? 'Only class teachers can manage class resources'
                        : ''
                  }
                >
                  <FaUpload className="text-sm" />
                  <span>Upload Resource</span>
                </button>
                <div className="px-3 sm:px-4 py-2 sm:py-3 rounded-xl border border-white/20 bg-white/15 backdrop-blur-sm w-full sm:w-auto">
                  <div className="text-[11px] sm:text-xs text-blue-100">Total Resources</div>
                  <div className="text-sm sm:text-base font-bold">
                    {summary.total_resources}
                  </div>
                </div>
                <div className="px-3 sm:px-4 py-2 sm:py-3 rounded-xl border border-white/20 bg-white/15 backdrop-blur-sm w-full sm:w-auto">
                  <div className="text-[11px] sm:text-xs text-blue-100">Class</div>
                  <div className="text-sm sm:text-base font-bold">
                    {classLabel}
                  </div>
                </div>
                <div className="px-3 sm:px-4 py-2 sm:py-3 rounded-xl border border-white/20 bg-white/15 backdrop-blur-sm w-full sm:w-auto">
                  <div className="text-[11px] sm:text-xs text-blue-100">Section</div>
                  <div className="text-sm sm:text-base font-bold">
                    {sectionLabel}
                  </div>
                </div>
              </div>
            </div>
          </div>

          
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 min-[520px]:grid-cols-2 xl:grid-cols-4 gap-3 sm:gap-4 md:gap-6 mb-6">
          <div className={getCardGradientClass('purple')}>
            <div className="flex items-center justify-between gap-4">
              <div>
                <div className={combine("text-xl sm:text-2xl md:text-3xl font-bold", theme === 'dark' ? 'text-purple-400' : 'text-purple-600')}>
                  {summary.class_name ? `${summary.class_name}-${summary.section}` : userInfo.class ? `${userInfo.class}-${userInfo.section}` : '--'}
                </div>
                <div className={combine("text-xs sm:text-sm font-medium mt-1", get('text', 'secondary'))}>
                  Assigned Class
                </div>
                <div className={combine("text-xs mt-1", get('text', 'tertiary'))}>
                  {summary.academic_year || activeYearLabel || 'Current academic year'}
                </div>
              </div>
              <FaBook className={combine("text-2xl sm:text-3xl", theme === 'dark' ? 'text-purple-400' : 'text-purple-600')} />
            </div>
          </div>

          <div className={getCardGradientClass('blue')}>
            <div className="flex items-center justify-between">
              <div>
                <div className={combine("text-xl sm:text-2xl md:text-3xl font-bold", get('accent', 'primary'))}>
                  {summary.total_resources}
                </div>
                <div className={combine("text-xs sm:text-sm font-medium mt-1", get('text', 'secondary'))}>
                  Total Resources
                </div>
              </div>
              <IoDocumentText className={combine("text-2xl sm:text-3xl", theme === 'dark' ? 'text-blue-400' : 'text-blue-600')} />
            </div>
          </div>
          
          <div className={getCardGradientClass('emerald')}>
            <div className="flex items-center justify-between">
              <div>
                <div className={combine("text-xl sm:text-2xl md:text-3xl font-bold", get('accent', 'success'))}>
                  {summary.subject_resources}
                </div>
                <div className={combine("text-xs sm:text-sm font-medium mt-1", get('text', 'secondary'))}>
                  Subject-specific
                </div>
              </div>
              <FaBook className={combine("text-2xl sm:text-3xl", theme === 'dark' ? 'text-emerald-400' : 'text-green-600')} />
            </div>
          </div>
          
          <div className={getCardGradientClass('blue')}>
            <div className="flex items-center justify-between">
              <div>
                <div className={combine("text-xl sm:text-2xl md:text-3xl font-bold", get('accent', 'primary'))}>
                  {summary.general_resources}
                </div>
                <div className={combine("text-xs sm:text-sm font-medium mt-1", get('text', 'secondary'))}>
                  General Resources
                </div>
                <div className={combine("text-xs mt-1", get('text', 'tertiary'))}>
                  Subjects: {summary.unique_subjects || subjectCount}
                </div>
              </div>
              <FaFilter className={combine("text-2xl sm:text-3xl", theme === 'dark' ? 'text-blue-400' : 'text-blue-600')} />
            </div>
          </div>
        </div>

        {/* Filters */}
        <div className={combine(getCardGradientClass('blue'), "mb-6")}>
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_auto_auto_auto] gap-4 xl:items-end">
            <div>
              <label className={combine("block text-xs sm:text-sm font-medium mb-1.5", get('text', 'primary'))}>
                Filter by Date
              </label>
              <input
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                className={getInputClass()}
              />
            </div>

            <div>
              <label className={combine("block text-xs sm:text-sm font-medium mb-1.5", get('text', 'primary'))}>
                Filter by Subject
              </label>
              <select
                value={selectedSubject}
                onChange={(e) => setSelectedSubject(e.target.value)}
                className={combine(getInputClass(), "appearance-none")}
                disabled={loadingSubjects}
              >
                  <option value="general">General Resources Only</option>
                  <option value="all">All Resources</option>
                  {subjects.map((subject) => (
                  <option key={subject.subject_id} value={subject.subject_name}>
                    {subject.subject_name} ({subject.subject_code})
                  </option>
                ))}
              </select>
            </div>

            <button
              onClick={handleApplyFilters}
              className={combine(getPrimaryButtonClass(), "w-full xl:w-auto flex items-center justify-center gap-2")}
            >
              <FaFilter className="text-xs" />
              <span>Apply Filters</span>
            </button>
            <button
              onClick={handleClearFilters}
              className={combine(getSecondaryButtonClass(), "w-full xl:w-auto")}
            >
              Clear
            </button>

            <div className="flex flex-col justify-end h-full">
              <label className="block text-xs sm:text-sm font-medium mb-2 opacity-0 pointer-events-none">
                View
              </label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={() => setViewMode('grid')}
                  className={`w-full p-2.5 sm:p-3 rounded-lg flex items-center justify-center ${viewMode === 'grid' ? (theme === 'dark' ? 'bg-blue-900/30 text-blue-300' : 'bg-blue-100 text-blue-600') : combine(get('bg', 'secondary'), get('text', 'secondary'))}`}
                  title="Grid View"
                >
                  <FaThLarge />
                </button>
                <button
                  onClick={() => setViewMode('list')}
                  className={`w-full p-2.5 sm:p-3 rounded-lg flex items-center justify-center ${viewMode === 'list' ? (theme === 'dark' ? 'bg-blue-900/30 text-blue-300' : 'bg-blue-100 text-blue-600') : combine(get('bg', 'secondary'), get('text', 'secondary'))}`}
                  title="List View"
                >
                  <FaList />
                </button>
              </div>
            </div>
          </div>
          
          {filterApplied && (
            <div className="mt-4 pt-4 border-t" style={{ borderColor: 'var(--color-border-secondary)' }}>
              <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                <div className="flex flex-wrap items-center gap-2">
                  <FaFilter className={combine("text-sm", theme === 'dark' ? 'text-blue-400' : 'text-blue-500')} />
                  <span className={combine("text-xs sm:text-sm font-medium", get('text', 'primary'))}>Active Filters:</span>
                  {selectedDate && (
                    <span className={combine(
                      "text-xs px-2 py-1 rounded flex items-center gap-1",
                      theme === 'dark' ? 'bg-blue-900/30 text-blue-300' : 'bg-blue-100 text-blue-800'
                    )}>
                      Date: {selectedDate}
                      <button
                        onClick={async () => {
                          setSelectedDate('');
                          const nextFilters = selectedSubject && !['general', 'all'].includes(selectedSubject)
                            ? { subject: selectedSubject }
                            : selectedSubject === 'all'
                              ? { subject: 'all' }
                              : selectedSubject === 'general'
                                ? { subject: 'general' }
                              : {};
                          await fetchResources(nextFilters);
                          setFilterApplied(Boolean(selectedSubject && selectedSubject !== 'general'));
                        }}
                        className="hover:opacity-70"
                      >
                        <FaTimes size={10} />
                      </button>
                    </span>
                  )}
                  {selectedSubject && (
                    <span className={combine(
                      "text-xs px-2 py-1 rounded flex items-center gap-1",
                      theme === 'dark' ? 'bg-emerald-900/30 text-emerald-300' : 'bg-green-100 text-green-800'
                    )}>
                      Subject: {selectedSubject === 'general' ? 'General Resources' : selectedSubject === 'all' ? 'All Resources' : selectedSubject}
                      <button
                        onClick={async () => {
                          setSelectedSubject('all');
                          const nextFilters = {
                            ...(selectedDate ? { date: selectedDate } : {}),
                            subject: 'all'
                          };
                          await fetchResources(nextFilters);
                          setFilterApplied(Boolean(selectedDate));
                        }}
                        className="hover:opacity-70"
                      >
                        <FaTimes size={10} />
                      </button>
                    </span>
                  )}
                </div>
                <span className={combine("text-xs sm:text-sm", get('text', 'tertiary'))}>
                  Showing {filteredResources.length} resource{filteredResources.length !== 1 ? 's' : ''}
                </span>
              </div>
            </div>
          )}
        </div>

        {filteredResources.length > 0 && (
          <div className={combine("rounded-xl sm:rounded-2xl shadow-lg overflow-hidden border", get('bg', 'card'), get('border', 'primary'))}>
            <div className="p-4 sm:p-6 border-b" style={{ borderColor: 'var(--color-border-secondary)' }}>
              <div className="flex flex-col gap-3 sm:gap-4 lg:flex-row lg:items-center lg:justify-between">
                <h3 className={combine("text-base sm:text-lg font-semibold", get('text', 'primary'))}>
                  {viewMode === 'grid' ? 'Resources Grid View' : 'Resources List View'}
                </h3>
                <div className={combine("text-xs sm:text-sm", get('text', 'tertiary'))}>
                  Showing {filteredResources.length} resource{filteredResources.length !== 1 ? 's' : ''}
                </div>
              </div>
            </div>

            {viewMode === 'grid' ? (
              <div className="p-4 sm:p-6">
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 sm:gap-6">
                  {filteredResources.map((resource) => {
                    const subjectColor = resource.subject_name ? getSubjectColor(resource.subject_name) : null;
                    const isSubjectResource = Boolean(resource.subject_name);

                    return (
                      <div
                        key={resource.id}
                        className={combine(
                          "rounded-xl sm:rounded-2xl shadow-lg overflow-hidden hover:shadow-xl transition-all duration-300 border h-full flex flex-col",
                          !subjectColor ? get('bg', 'card') : '',
                          get('border', 'primary')
                        )}
                        style={subjectColor ? getSubjectGradientStyle(subjectColor) : undefined}
                      >
                        {/* Resource Header */}
                        <div className={combine(
                          "p-4 sm:p-6 flex-1"
                        )}>
                          <div className="flex items-start justify-between mb-4">
                            <div className="flex items-start gap-3">
                              <div className="text-2xl sm:text-3xl flex-shrink-0">
                                {getFileIcon(resource.file)}
                              </div>
                              <div className="flex-1 min-w-0">
                                {resource.subject_name ? (
                                  <span
                                    className={combine(
                                      "text-xs font-semibold px-2.5 py-1 rounded-full inline-block border"
                                    )}
                                    style={subjectColor ? {
                                      backgroundColor: `${subjectColor.bg}22`,
                                      color: subjectColor.text,
                                      borderColor: `${subjectColor.border}99`
                                    } : undefined}
                                  >
                                    {resource.subject_name}
                                  </span>
                                ) : (
                                  <span className={combine(
                                    "text-xs font-semibold px-2.5 py-1 rounded-full inline-block",
                                    theme === 'dark' ? 'bg-gray-700 text-gray-300' : 'bg-gray-100 text-gray-800'
                                  )}>
                                    General
                                  </span>
                                )}
                                <p
                                  className={combine("text-xs mt-2", !subjectColor ? get('text', 'secondary') : '')}
                                  style={subjectColor ? { color: subjectColor.text, opacity: 0.92 } : undefined}
                                >
                                  {resource.class_name || userInfo.class || '--'} - {resource.section || userInfo.section || '--'}
                                </p>
                              </div>
                            </div>
                            {canManageResourceActions(resource) && (
                              <div className="flex gap-1 flex-shrink-0">
                                <button
                                  onClick={() => handleOpenEditModal(resource)}
                                  className={combine(
                                    "p-2 rounded-lg transition-colors",
                                    !subjectColor ? get('text', 'tertiary') : '',
                                    theme === 'dark' ? 'hover:text-blue-400 hover:bg-blue-900/20' : 'hover:text-blue-500 hover:bg-blue-50'
                                  )}
                                  style={subjectColor ? { color: subjectColor.text } : undefined}
                                  title="Edit description"
                                >
                                  <FaEdit className="h-4 w-4" />
                                </button>
                                <button
                                  onClick={() => handleDeleteResource(resource)}
                                  className={combine(
                                    "p-2 rounded-lg transition-colors",
                                    !subjectColor ? get('text', 'tertiary') : '',
                                    theme === 'dark' ? 'hover:text-red-400 hover:bg-red-900/20' : 'hover:text-red-500 hover:bg-red-50'
                                  )}
                                  style={subjectColor ? { color: subjectColor.text } : undefined}
                                  title="Delete entire resource"
                                >
                                  <FaTrash className="h-4 w-4" />
                                </button>
                              </div>
                            )}
                          </div>
                          
                          <h3
                            className={combine("text-base sm:text-lg md:text-xl font-bold mb-2 line-clamp-2", !subjectColor ? get('text', 'primary') : '')}
                            style={subjectColor ? { color: subjectColor.text } : undefined}
                          >
                            {resource.title}
                          </h3>
                          <p
                            className={combine("text-xs sm:text-sm line-clamp-2 mb-4", !subjectColor ? get('text', 'secondary') : '')}
                            style={subjectColor ? { color: subjectColor.text, opacity: 0.92 } : undefined}
                          >
                            {resource.description || 'No description provided'}
                          </p>

                          {/* Resource Details */}
                          <div className="space-y-2 mt-auto">
                            <div
                              className={combine("flex items-center gap-2 text-xs", !subjectColor ? get('text', 'secondary') : '')}
                              style={subjectColor ? { color: subjectColor.text, opacity: 0.92 } : undefined}
                            >
                              <FaCalendar className={combine("flex-shrink-0", !subjectColor ? (theme === 'dark' ? 'text-blue-400' : 'text-blue-500') : '')} />
                              <span className="truncate">{formatDate(resource.created_at)}</span>
                            </div>
                            
                            <div
                              className={combine("flex items-center gap-2 text-xs", !subjectColor ? get('text', 'secondary') : '')}
                              style={subjectColor ? { color: subjectColor.text, opacity: 0.92 } : undefined}
                            >
                              <FaUpload className={combine("flex-shrink-0", !subjectColor ? (theme === 'dark' ? 'text-emerald-400' : 'text-green-500') : '')} />
                              <span className="truncate">By: {resource.posted_by_name}</span>
                            </div>

                            {resource.file ? (
                              <div
                                className={combine("text-xs truncate", !subjectColor ? get('text', 'tertiary') : '')}
                                style={subjectColor ? { color: subjectColor.text, opacity: 0.84 } : undefined}
                                title={getFileNameFromUrl(resource.file)}
                              >
                                📎 {getFileNameFromUrl(resource.file)}
                              </div>
                            ) : (
                              <div
                                className={combine("text-xs", !subjectColor ? get('text', 'tertiary') : '')}
                                style={subjectColor ? { color: subjectColor.text, opacity: 0.84 } : undefined}
                              >
                                No file attached
                              </div>
                            )}
                          </div>
                        </div>

                        {/* Action Buttons */}
                        <div className={combine(
                          "p-4 border-t flex gap-2",
                          !subjectColor ? (theme === 'dark' ? 'border-gray-700' : 'border-gray-200') : ''
                        )}>
                          {resource.file ? (
                            <>
                              <a
                                href={buildFileUrl(resource.file)}
                                target="_blank"
                                rel="noopener noreferrer"
                                className={combine(
                                  "flex-1 flex items-center justify-center gap-2 px-3 py-2 rounded-lg font-medium transition-colors text-xs",
                                  isSubjectResource && subjectColor
                                    ? ''
                                    : theme === 'dark' 
                                    ? 'bg-blue-900/20 text-blue-300 hover:bg-blue-900/30' 
                                    : 'bg-blue-50 text-blue-700 hover:bg-blue-100'
                                )}
                                style={isSubjectResource && subjectColor ? {
                                  backgroundColor: `${subjectColor.bg}22`,
                                  color: subjectColor.text
                                } : undefined}
                              >
                                <FaEye className="text-xs" />
                                <span>View</span>
                              </a>
                              
                              <a
                                href={buildFileUrl(resource.file)}
                                download
                                className={combine(
                                  "flex-1 flex items-center justify-center gap-2 px-3 py-2 rounded-lg font-medium transition-colors text-xs",
                                  isSubjectResource && subjectColor
                                    ? ''
                                    : theme === 'dark' 
                                    ? 'bg-emerald-900/20 text-emerald-300 hover:bg-emerald-900/30' 
                                    : 'bg-green-50 text-green-700 hover:bg-green-100'
                                )}
                                style={isSubjectResource && subjectColor ? {
                                  backgroundColor: `${subjectColor.bg}18`,
                                  color: subjectColor.text
                                } : undefined}
                              >
                                <FaDownload className="text-xs" />
                                <span>Download</span>
                              </a>
                            </>
                          ) : (
                            <div
                              className={combine("w-full text-center text-xs font-medium py-2", !subjectColor ? get('text', 'tertiary') : '')}
                              style={subjectColor ? { color: subjectColor.text, opacity: 0.84 } : undefined}
                            >
                              Description only resource
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ) : (
              <div className="p-4 sm:p-6 space-y-3">
                {filteredResources.map((resource) => {
                  const subjectColor = resource.subject_name ? getSubjectColor(resource.subject_name) : null;
                  const isSubjectResource = Boolean(resource.subject_name);
                  return (
                    <div
                      key={resource.id}
                      className={combine(
                        "rounded-xl border p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center gap-4 hover:shadow-md transition-all",
                        get('bg', 'card'),
                        get('border', 'primary')
                      )}
                      style={subjectColor ? { ...getSubjectGradientStyle(subjectColor), borderColor: `${subjectColor.border}AA`, borderWidth: '2px' } : undefined}
                    >
                      <div className="flex-1 min-w-0">
                        <div className="flex flex-wrap items-center gap-2 mb-2">
                          {resource.subject_name ? (
                            <span
                              className="text-xs font-semibold px-2.5 py-1 rounded-full inline-block border"
                              style={subjectColor ? {
                                backgroundColor: `${subjectColor.bg}22`,
                                color: subjectColor.text,
                                borderColor: `${subjectColor.border}99`
                              } : undefined}
                            >
                              {resource.subject_name}
                            </span>
                          ) : (
                            <span className={combine(
                              "text-xs font-semibold px-2.5 py-1 rounded-full inline-block",
                              theme === 'dark' ? 'bg-gray-700 text-gray-300' : 'bg-gray-100 text-gray-800'
                            )}>
                              General
                            </span>
                          )}
                          <span className={combine("text-xs", get('text', 'tertiary'))}>
                            {resource.class_name || userInfo.class || '--'} - {resource.section || userInfo.section || '--'}
                          </span>
                        </div>
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <h3 className={combine("text-base sm:text-lg font-semibold truncate", get('text', 'primary'))}>
                              {resource.title}
                            </h3>
                            <p className={combine("text-xs sm:text-sm mt-1 line-clamp-2", get('text', 'secondary'))}>
                              {resource.description || 'No description provided'}
                            </p>
                          </div>
                          {canManageResourceActions(resource) && (
                            <div className="flex gap-1 flex-shrink-0">
                              <button
                                onClick={() => handleOpenEditModal(resource)}
                                className={combine(
                                  "p-2 rounded-lg transition-colors",
                                  theme === 'dark' ? 'hover:text-blue-400 hover:bg-blue-900/20' : 'hover:text-blue-500 hover:bg-blue-50'
                                )}
                                title="Edit description"
                              >
                                <FaEdit className="h-4 w-4" />
                              </button>
                              <button
                                onClick={() => handleDeleteResource(resource)}
                                className={combine(
                                  "p-2 rounded-lg transition-colors",
                                  theme === 'dark' ? 'hover:text-red-400 hover:bg-red-900/20' : 'hover:text-red-500 hover:bg-red-50'
                                )}
                                title="Delete entire resource"
                              >
                                <FaTrash className="h-4 w-4" />
                              </button>
                            </div>
                          )}
                        </div>
                        <div className="mt-3 flex flex-wrap items-center gap-4 text-xs">
                          <span className={combine("flex items-center gap-1.5", get('text', 'tertiary'))}>
                            <FaCalendar className="h-3.5 w-3.5" />
                            {formatDate(resource.created_at)}
                          </span>
                          <span className={combine("flex items-center gap-1.5", get('text', 'tertiary'))}>
                            <FaUpload className="h-3.5 w-3.5" />
                            {resource.posted_by_name}
                          </span>
                          {resource.file && (
                            <span className={combine("flex items-center gap-1.5 truncate", get('text', 'tertiary'))}>
                              📎 {getFileNameFromUrl(resource.file)}
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="flex gap-2 w-full sm:w-auto">
                        {resource.file ? (
                          <>
                            <a
                              href={buildFileUrl(resource.file)}
                              target="_blank"
                              rel="noopener noreferrer"
                              className={combine(
                                "flex-1 sm:flex-none flex items-center justify-center gap-2 px-3 py-2 rounded-lg font-medium transition-colors text-xs",
                                isSubjectResource && subjectColor
                                  ? ''
                                  : theme === 'dark'
                                  ? 'bg-blue-900/20 text-blue-300 hover:bg-blue-900/30'
                                  : 'bg-blue-50 text-blue-700 hover:bg-blue-100'
                              )}
                              style={isSubjectResource && subjectColor ? {
                                backgroundColor: `${subjectColor.bg}22`,
                                color: subjectColor.text
                              } : undefined}
                            >
                              <FaEye className="text-xs" />
                              <span>View</span>
                            </a>
                            <a
                              href={buildFileUrl(resource.file)}
                              download
                              className={combine(
                                "flex-1 sm:flex-none flex items-center justify-center gap-2 px-3 py-2 rounded-lg font-medium transition-colors text-xs",
                                isSubjectResource && subjectColor
                                  ? ''
                                  : theme === 'dark'
                                  ? 'bg-emerald-900/20 text-emerald-300 hover:bg-emerald-900/30'
                                  : 'bg-green-50 text-green-700 hover:bg-green-100'
                              )}
                              style={isSubjectResource && subjectColor ? {
                                backgroundColor: `${subjectColor.bg}18`,
                                color: subjectColor.text
                              } : undefined}
                            >
                              <FaDownload className="text-xs" />
                              <span>Download</span>
                            </a>
                          </>
                        ) : (
                          <div className={combine("w-full text-center text-xs font-medium py-2", get('text', 'tertiary'))}>
                            Description only resource
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* Empty State */}
        {filteredResources.length === 0 && !loading && (
          <div className={combine(
            "text-center py-16 px-4 rounded-xl sm:rounded-2xl shadow-lg border",
            get('bg', 'card'),
            get('border', 'primary')
          )}>
            <IoDocumentText className={combine("text-5xl sm:text-6xl mx-auto mb-4", get('text', 'tertiary'))} />
            <h3 className={combine("text-lg sm:text-xl font-semibold mb-2", get('text', 'secondary'))}>No resources found</h3>
            <p className={combine("text-xs sm:text-sm mb-6 max-w-md mx-auto", get('text', 'tertiary'))}>
              {filterApplied 
                ? 'No resources match your filters. Try changing your filters or clear them to see all resources.'
                : 'Upload your first resource to share with the class'}
            </p>
            <div className="flex flex-wrap gap-3 justify-center">
              {filterApplied && (
                <button
                  onClick={handleClearFilters}
                  className={getSecondaryButtonClass()}
                >
                  Clear Filters
                </button>
              )}
              <button
                onClick={() => {
                  setShowUploadModal(true);
                }}
                className={getPrimaryButtonClass()}
                disabled={!canManageResources}
              >
                Upload Resource
              </button>
            </div>
          </div>
        )}

        {/* Upload Modal */}
        {showUploadModal && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
            <div className={getModalBgClass()}>
              <div className={getModalHeaderClass()}>
                <div>
                  <h2 className={combine("text-xl sm:text-2xl font-bold", get('text', 'primary'))}>
                    Upload Resource
                  </h2>
                  {userInfo.class && (
                    <p className={combine("text-xs sm:text-sm mt-1", get('text', 'secondary'))}>
                      For Class: {userInfo.class} - {userInfo.section}
                    </p>
                  )}
                  {userInfo.isClassTeacher ? (
                    <p className={combine("text-xs sm:text-sm mt-1", theme === 'dark' ? 'text-emerald-400' : 'text-green-600')}>
                      ✓ Class Teacher: Can upload and manage class resources
                    </p>
                  ) : (
                    <p className={combine("text-xs sm:text-sm mt-1", theme === 'dark' ? 'text-amber-400' : 'text-yellow-600')}>
                      Only class teachers can access class resource management
                    </p>
                  )}
                </div>
                <button
                  onClick={() => {
                    setShowUploadModal(false);
                  }}
                  className={combine(
                    "text-2xl w-8 h-8 flex items-center justify-center rounded-full transition-colors",
                    get('text', 'tertiary'),
                    'hover:bg-[var(--color-bg-hover)]'
                  )}
                >
                  ×
                </button>
              </div>
              
              <form onSubmit={handleSubmit} className={getModalBodyClass()}>
                <div className="space-y-5">
                  <div>
                    <label className={combine("block text-xs sm:text-sm font-medium mb-1.5", get('text', 'primary'))}>
                      Resource Title *
                    </label>
                    <input
                      type="text"
                      required
                      value={formData.title}
                      onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
                      className={getInputClass()}
                      placeholder="e.g., Science Notes Chapter 1"
                    />
                  </div>
                  
                  <div>
                    <label className={combine("block text-xs sm:text-sm font-medium mb-1.5", get('text', 'primary'))}>
                      Subject (Optional)
                    </label>
                    <select
                      value={formData.subject}
                      onChange={(e) => setFormData(prev => ({ ...prev, subject: e.target.value }))}
                      className={combine(getInputClass(), "appearance-none")}
                      disabled={subjects.length === 0}
                    >
                      <option value="">General Resource (No specific subject)</option>
                      {subjects.map((subject) => (
                        <option key={subject.subject_id} value={subject.subject_name}>
                          {subject.subject_name} ({subject.subject_code})
                        </option>
                      ))}
                    </select>
                    <p className={combine("text-xs mt-1.5", get('text', 'tertiary'))}>
                      {subjects.length > 0 
                        ? 'Select a subject to post a subject-specific class resource, or leave empty to post a general class resource'
                        : 'No subjects assigned to your class yet. You can still upload a general class resource.'}
                    </p>
                  </div>
                  
                  <div>
                    <label className={combine("block text-xs sm:text-sm font-medium mb-1.5", get('text', 'primary'))}>
                      Description
                    </label>
                    <textarea
                      value={formData.description}
                      onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                      className={getInputClass()}
                      rows={3}
                      placeholder="Describe the resource content..."
                    />
                  </div>
                  
                  <div>
                    <label className={combine("block text-xs sm:text-sm font-medium mb-1.5", get('text', 'primary'))}>
                      Upload File *
                    </label>
                    <div className={getFileUploadAreaClass()}>
                      <input
                        type="file"
                        onChange={handleFileChange}
                        className="hidden"
                        id="file-upload"
                        required
                        accept=".pdf,.doc,.docx,.xls,.xlsx,.jpg,.jpeg,.png,.gif,.txt"
                      />
                      <label htmlFor="file-upload" className="cursor-pointer block">
                        <div className="text-4xl mb-3">
                          {formData.file ? (
                            <div className={theme === 'dark' ? 'text-emerald-400' : 'text-green-600'}>
                              {getFileIcon(formData.file.name)}
                            </div>
                          ) : (
                            <FaUpload className={combine("mx-auto text-3xl", get('text', 'tertiary'))} />
                          )}
                        </div>
                        <p className={combine("mb-1 font-medium text-xs sm:text-sm", get('text', 'secondary'))}>
                          {formData.file ? formData.file.name : 'Click to select file'}
                        </p>
                        <p className={combine("text-xs sm:text-sm", get('text', 'tertiary'))}>
                          PDF, DOC, XLS, Images, Text files (Max 10MB)
                        </p>
                        {formData.file && (
                          <p className={combine("text-xs sm:text-sm mt-2", theme === 'dark' ? 'text-emerald-400' : 'text-green-600')}>
                            ✓ File selected: {(formData.file.size / 1024 / 1024).toFixed(2)} MB
                          </p>
                        )}
                      </label>
                    </div>
                  </div>
                </div>
                
                <div className="flex justify-end gap-4 mt-8 pt-6 border-t" style={{ borderColor: 'var(--color-border-secondary)' }}>
                  <button
                    type="button"
                    onClick={() => {
                      setShowUploadModal(false);
                    }}
                    className={getSecondaryButtonClass()}
                    disabled={uploading}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={uploading || !canManageResources}
                    className={combine(getPrimaryButtonClass(), "disabled:opacity-50 flex items-center gap-2")}
                  >
                    {uploading ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                        <span>Uploading...</span>
                      </>
                    ) : (
                      <>
                        <FaUpload className="text-sm" />
                        <span>Upload Resource</span>
                      </>
                    )}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {showEditModal && editingResource && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
            <div className={combine(getModalBgClass(), "max-w-xl")}>
              <div
                className={getModalHeaderClass()}
                style={editSubjectColor ? getSubjectHeaderStyle(editSubjectColor) : undefined}
              >
                <div>
                  <h2
                    className={combine("text-xl sm:text-2xl font-bold", get('text', 'primary'))}
                    style={editSubjectColor ? { color: editSubjectColor.text } : undefined}
                  >
                    Edit Resource
                  </h2>
                  <p
                    className={combine("text-xs sm:text-sm mt-1", get('text', 'secondary'))}
                    style={editSubjectColor ? { color: editSubjectColor.text, opacity: 0.9 } : undefined}
                  >
                    Update description for {editingResource.title}
                  </p>
                </div>
                <button
                  onClick={() => {
                    setShowEditModal(false);
                    setEditingResource(null);
                    setEditDescription('');
                  }}
                  className={combine(
                    "text-2xl w-8 h-8 flex items-center justify-center rounded-full transition-colors",
                    get('text', 'tertiary'),
                    'hover:bg-[var(--color-bg-hover)]'
                  )}
                  style={editSubjectColor ? { color: editSubjectColor.text } : undefined}
                >
                  ×
                </button>
              </div>

              <form onSubmit={handleUpdateResource} className={getModalBodyClass()}>
                <div className="space-y-5">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className={combine(
                      "rounded-xl border px-4 py-3",
                      get('bg', 'card'),
                      get('border', 'secondary')
                    )}>
                      <div className={combine("text-xs font-medium mb-1", get('text', 'tertiary'))}>
                        Subject
                      </div>
                      <div className={combine("text-sm font-semibold", get('text', 'primary'))}>
                        {editingResource.subject_name || 'General'}
                      </div>
                    </div>
                    <div className={combine(
                      "rounded-xl border px-4 py-3",
                      get('bg', 'card'),
                      get('border', 'secondary')
                    )}>
                      <div className={combine("text-xs font-medium mb-1", get('text', 'tertiary'))}>
                        Resource Type
                      </div>
                      <div className={combine("text-sm font-semibold", get('text', 'primary'))}>
                        Class Resource
                      </div>
                    </div>
                  </div>

                  <div>
                    <label className={combine("block text-xs sm:text-sm font-medium mb-1.5", get('text', 'primary'))}>
                      Description *
                    </label>
                    <textarea
                      value={editDescription}
                      onChange={(e) => setEditDescription(e.target.value)}
                      className={getInputClass()}
                      rows={5}
                      placeholder="Update the resource description..."
                    />
                  </div>
                </div>

                <div className="flex justify-end gap-4 mt-8 pt-6 border-t" style={{ borderColor: 'var(--color-border-secondary)' }}>
                  <button
                    type="button"
                    onClick={() => {
                      setShowEditModal(false);
                      setEditingResource(null);
                      setEditDescription('');
                    }}
                    className={getSecondaryButtonClass()}
                    disabled={updating}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={updating}
                    className={combine(getPrimaryButtonClass(), "disabled:opacity-50 flex items-center gap-2")}
                  >
                    {updating ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                        <span>Saving...</span>
                      </>
                    ) : (
                      <>
                        <FaEdit className="text-sm" />
                        <span>Save Changes</span>
                      </>
                    )}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {confirmAction && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
            <div className={combine(getModalBgClass(), "max-w-md")}>
              <div className={getModalHeaderClass()}>
                <div className="flex items-center gap-3">
                  <div className={combine(
                    "w-10 h-10 rounded-full flex items-center justify-center",
                    theme === 'dark' ? 'bg-red-900/30 text-red-300' : 'bg-red-100 text-red-600'
                  )}>
                    <FaExclamationTriangle className="text-lg" />
                  </div>
                  <div>
                    <h2 className={combine("text-lg sm:text-xl font-bold", get('text', 'primary'))}>
                      Confirm Action
                    </h2>
                    <p className={combine("text-xs sm:text-sm mt-1", get('text', 'secondary'))}>
                      This will permanently remove the full resource.
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setConfirmAction(null)}
                  className={combine(
                    "text-2xl w-8 h-8 flex items-center justify-center rounded-full transition-colors",
                    get('text', 'tertiary'),
                    'hover:bg-[var(--color-bg-hover)]'
                  )}
                >
                  ×
                </button>
              </div>

              <div className={getModalBodyClass()}>
                <div className={combine(
                  "rounded-xl border px-4 py-3",
                  get('bg', 'card'),
                  get('border', 'secondary')
                )}>
                  <div className={combine("text-xs font-medium mb-1", get('text', 'tertiary'))}>
                    Resource
                  </div>
                  <div className={combine("text-sm font-semibold", get('text', 'primary'))}>
                    {confirmAction.resource.title}
                  </div>
                </div>

                <div className="flex justify-end gap-4 mt-8 pt-6 border-t" style={{ borderColor: 'var(--color-border-secondary)' }}>
                  <button
                    type="button"
                    onClick={() => setConfirmAction(null)}
                    className={getSecondaryButtonClass()}
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={() => confirmDeleteResource(confirmAction.resource)}
                    className={combine(
                      getPrimaryButtonClass(),
                      theme === 'dark'
                        ? 'from-red-600 to-red-700 hover:from-red-700 hover:to-red-800'
                        : 'from-red-500 to-red-600 hover:from-red-600 hover:to-red-700',
                      "flex items-center gap-2"
                    )}
                  >
                    <FaTrash className="text-sm" />
                    <span>Delete Resource</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
