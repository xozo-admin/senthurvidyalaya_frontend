// app/components/management/ClassesSectionsManager.tsx
'use client';

import { useState, useEffect } from 'react';
import { adminApi } from '@/lib/api';
import { toastSuccess, toastError, toastInfo } from '@/lib/toast';
import {
  Plus,
  Trash2,
  Edit,
  Users,
  Building,
  Check,
  X,
  Filter,
  ChevronRight,
  ChevronDown,
  BookOpen,
  GraduationCap,
  Layers
} from 'lucide-react';
import { FaSchool } from 'react-icons/fa';
import { useTheme } from '@/contexts/ThemeContext';
import { useThemeClasses } from '@/hooks/useThemeClasses';
import { SchoolScopeSelector, useSchoolScope } from '@/components/admin/SchoolScopeSelector';

interface Standard {
  id: number;
  name: string;
  description: string;
  sections: Section[];
}

interface Section {
  id: number;
  name: string;
  standard: number;
  standard_name: string;
  class_teacher?: number;
}

interface Teacher {
  id: number;
  teacher_id: string;
  name: string;
  email: string;
  phone: string;
  date_of_birth: string;
  joining_date: string | null;
  qualification: string;
  department: string;
  address: string;
  user: number;
  assigned_class: string;
  section_name: string | null;
  class_name: string | null;
}

interface BulkSectionMap {
  class_name: string;
  sections: string[];
}

interface ClassTeacherAssignment {
  class_name: string;
  section_name: string;
  teacher_id: string;
}

type LoadingKey = 'standards' | 'sections' | 'teachers';
type SubmitKey = 'standard' | 'bulkStandards' | 'section' | 'bulkSections' | 'classTeacher';

const getErrorMessage = (error: any, fallback: string) => {
  const data = error?.response?.data;
  if (typeof data === 'string') return data;
  if (data?.detail) return data.detail;
  if (data?.error) return data.error;
  if (data?.message) return data.message;
  if (data && typeof data === 'object') {
    const firstValue = Object.values(data)[0];
    if (Array.isArray(firstValue)) return firstValue.join(', ');
    if (typeof firstValue === 'string') return firstValue;
  }
  return fallback;
};

const unwrapArray = <T,>(payload: any, keys: string[] = []): T[] => {
  if (Array.isArray(payload)) return payload;
  for (const key of keys) {
    if (Array.isArray(payload?.[key])) return payload[key];
  }
  if (Array.isArray(payload?.results)) return payload.results;
  if (Array.isArray(payload?.data)) return payload.data;
  return [];
};

const normalizeStandard = (standard: any): Standard => ({
  id: Number(standard.id),
  name: String(standard.name ?? standard.class_name ?? ''),
  description: String(standard.description ?? ''),
  sections: unwrapArray<Section>(standard.sections).map(normalizeSection),
});

const normalizeSection = (section: any): Section => ({
  id: Number(section.id),
  name: String(section.name ?? section.section_name ?? ''),
  standard: Number(section.standard ?? section.standard_id ?? 0),
  standard_name: String(section.standard_name ?? section.class_name ?? section.standard?.name ?? ''),
  class_teacher: section.class_teacher ?? undefined,
});

const normalizeTeacher = (teacher: any): Teacher => ({
  ...teacher,
  id: Number(teacher.id),
  teacher_id: String(teacher.teacher_id ?? ''),
  name: String(teacher.name ?? ''),
  email: String(teacher.email ?? ''),
  phone: String(teacher.phone ?? ''),
  date_of_birth: String(teacher.date_of_birth ?? ''),
  joining_date: teacher.joining_date ?? null,
  qualification: String(teacher.qualification ?? ''),
  department: String(teacher.department ?? ''),
  address: String(teacher.address ?? ''),
  user: Number(teacher.user ?? 0),
  assigned_class: String(teacher.assigned_class ?? 'Not Assigned'),
  section_name: teacher.section_name ?? null,
  class_name: teacher.class_name ?? null,
});

export default function ClassesSectionsManager() {
  const { theme } = useTheme();
  const { get, combine } = useThemeClasses();
  const schoolScope = useSchoolScope({ storageKey: 'academics_classes_school_scope' });

  const [standards, setStandards] = useState<Standard[]>([]);
  const [sections, setSections] = useState<Section[]>([]);
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [sectionTeacherMap, setSectionTeacherMap] = useState<Record<string, Teacher>>({});
  const [loading, setLoading] = useState({
    standards: true,
    sections: true,
    teachers: true
  });
  const [submitting, setSubmitting] = useState<Record<SubmitKey, boolean>>({
    standard: false,
    bulkStandards: false,
    section: false,
    bulkSections: false,
    classTeacher: false,
  });
  const [loadErrors, setLoadErrors] = useState<Record<LoadingKey, string | null>>({
    standards: null,
    sections: null,
    teachers: null,
  });

  const [activeTab, setActiveTab] = useState<'classes' | 'sections' | 'bulk'>('classes');
  const [expandedClass, setExpandedClass] = useState<number | null>(null);
  const [selectedStandard, setSelectedStandard] = useState<string>('');
  const [structureAction, setStructureAction] = useState<string | null>(null);

  // Forms
  const [newStandard, setNewStandard] = useState<string>('');
  const [newSections, setNewSections] = useState<BulkSectionMap[]>([{ class_name: '', sections: [] }]);
  const [showAddSection, setShowAddSection] = useState(false);
  const [sectionData, setSectionData] = useState({
    class_name: '',
    section_name: '',
    description: ''
  });
  const [classTeacherData, setClassTeacherData] = useState<ClassTeacherAssignment>({
    class_name: '',
    section_name: '',
    teacher_id: ''
  });
  const [showAssignTeacher, setShowAssignTeacher] = useState(false);

  // Theme-aware CSS classes using the same system as other pages
  const getBgClass = () => combine(
    get('bg', 'primary'),
    'min-h-screen transition-colors duration-200'
  );

  const getCardGradientClass = (color: string = 'blue') => {
    const baseClasses = combine(
      'rounded-xl sm:rounded-2xl p-4 sm:p-6 border shadow-lg transition-all duration-300 group hover:shadow-xl my-2',
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
    if (color === 'green') {
      return combine(baseClasses, 'bg-gradient-to-br', theme === 'dark'
        ? 'from-gray-800 to-green-900/10'
        : 'from-white to-green-50');
    }
    return combine(baseClasses, 'bg-gradient-to-br', get('bg', 'card'));
  };

  const getStatsCardClass = (color: 'blue' | 'emerald' | 'amber' | 'pink' | 'indigo' | 'purple' | 'green' = 'blue') => {
    return getCardGradientClass(color);
  };

  const getInputClass = () => combine(
    'px-3 sm:px-4 py-2.5 sm:py-3.5 rounded-lg sm:rounded-xl border focus:ring-2 focus:ring-blue-500 outline-none transition-all w-full',
    'text-xs sm:text-sm',
    theme === 'dark'
      ? 'bg-gray-900/70 border-gray-600 text-gray-100 hover:border-gray-500 focus:border-blue-400'
      : 'bg-white border-gray-300 text-gray-900 hover:border-gray-400 focus:border-blue-500',
    'placeholder:text-xs sm:placeholder:text-sm placeholder:text-[var(--color-text-tertiary)]',
    'disabled:opacity-50 disabled:cursor-not-allowed'
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
      purple: {
        bg: theme === 'dark' ? 'from-purple-900/30 to-purple-800/30' : 'from-purple-100 to-purple-200',
        text: theme === 'dark' ? 'text-purple-300' : 'text-purple-700',
        border: theme === 'dark' ? 'border-purple-800' : 'border-purple-200'
      },
      green: {
        bg: theme === 'dark' ? 'from-green-900/30 to-green-800/30' : 'from-green-100 to-green-200',
        text: theme === 'dark' ? 'text-green-300' : 'text-green-700',
        border: theme === 'dark' ? 'border-green-800' : 'border-green-200'
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

  const getTableHeaderClass = () => combine(
    get('bg', 'secondary'),
    'divide-y',
    get('border', 'primary')
  );

  const getTableRowClass = () => combine(
    get('bg', 'card'),
    'divide-y',
    get('border', 'primary'),
    'hover:bg-[var(--color-bg-hover)]'
  );

  const getTabClass = (isActive: boolean) => {
    const base = 'flex items-center justify-center gap-2 px-3 sm:px-4 py-3 sm:py-4 font-medium text-xs sm:text-sm transition-all duration-200 whitespace-nowrap flex-1 sm:flex-none min-w-[132px] sm:min-w-0';
    if (isActive) {
      return combine(base, 'text-blue-600 border-b-2 border-blue-600', get('bg', 'secondary'));
    }
    return combine(base, get('text', 'secondary'), 'hover:text-[var(--color-text-primary)]');
  };

  // Build section to teacher mapping from teachers data
  const setLoadingKey = (key: LoadingKey, value: boolean) => {
    setLoading(prev => ({ ...prev, [key]: value }));
  };

  const setSubmitKey = (key: SubmitKey, value: boolean) => {
    setSubmitting(prev => ({ ...prev, [key]: value }));
  };

  const buildSectionTeacherMap = (teachersList: Teacher[]) => {
    const map: Record<string, Teacher> = {};
    teachersList.forEach(teacher => {
      if (teacher.class_name && teacher.section_name) {
        const key = `${teacher.class_name}-${teacher.section_name}`;
        map[key] = teacher;
      }
    });
    setSectionTeacherMap(map);
  };

  // Fetch all data
  useEffect(() => {
    setLoading({ standards: true, sections: true, teachers: true });
    setLoadErrors({ standards: null, sections: null, teachers: null });
    void Promise.all([fetchStandards(), fetchSections(), fetchTeachers()]);
  }, [schoolScope.selectedSchoolId]);

  const fetchStandards = async () => {
    setLoadingKey('standards', true);
    setLoadErrors(prev => ({ ...prev, standards: null }));
    try {
      const response = await adminApi.academics.standards(schoolScope.scopeParams);
      setStandards(unwrapArray<any>(response.data, ['standards']).map(normalizeStandard));
    } catch (error) {
      const message = getErrorMessage(error, 'Failed to load classes');
      setStandards([]);
      setLoadErrors(prev => ({ ...prev, standards: message }));
      toastError(message);
    } finally {
      setLoadingKey('standards', false);
    }
  };

  const fetchSections = async (standardId?: string) => {
    setLoadingKey('sections', true);
    setLoadErrors(prev => ({ ...prev, sections: null }));
    try {
      const response = standardId
        ? await adminApi.academics.sections(standardId, schoolScope.scopeParams)
        : await adminApi.academics.allSections(schoolScope.scopeParams);
      setSections(unwrapArray<any>(response.data, ['sections']).map(normalizeSection));
    } catch (error) {
      const message = getErrorMessage(error, 'Failed to load sections');
      setSections([]);
      setLoadErrors(prev => ({ ...prev, sections: message }));
      toastError(message);
    } finally {
      setLoadingKey('sections', false);
    }
  };

  const fetchTeachers = async () => {
    setLoadingKey('teachers', true);
    setLoadErrors(prev => ({ ...prev, teachers: null }));
    try {
      const response = await adminApi.teachers.list(schoolScope.scopeParams);
      const teachersArray = unwrapArray<any>(response.data, ['teachers']).map(normalizeTeacher);
      setTeachers(teachersArray);

      buildSectionTeacherMap(teachersArray);
    } catch (error) {
      const message = getErrorMessage(error, 'Failed to load teachers');
      setTeachers([]);
      setSectionTeacherMap({});
      setLoadErrors(prev => ({ ...prev, teachers: message }));
      toastError(message);
    } finally {
      setLoadingKey('teachers', false);
    }
  };

  const handleCreateStandard = async () => {
    if (!newStandard.trim()) {
      toastInfo('Please enter class name');
      return;
    }

    setSubmitKey('standard', true);
    try {
      await adminApi.academics.createStandard({
        name: newStandard.trim(),
        description: `Class ${newStandard.trim()}`,
        ...schoolScope.scopeParams,
      });
      toastSuccess('Class created successfully');
      setNewStandard('');
      await Promise.all([fetchStandards(), fetchSections()]);
    } catch (error: any) {
      toastError(getErrorMessage(error, 'Failed to create class'));
    } finally {
      setSubmitKey('standard', false);
    }
  };

  const handleBulkCreateStandards = async () => {
    if (!newStandard.trim()) {
      toastInfo('Please enter classes to create');
      return;
    }

    setSubmitKey('bulkStandards', true);
    try {
      const standardsArray = newStandard.split(',').map(s => s.trim()).filter(s => s);
      const response = await adminApi.academics.bulkCreateStandards(standardsArray, schoolScope.scopeParams);
      const result = response.data;
      toastSuccess(`Created ${result.created_count ?? 0} classes successfully`);
      setNewStandard('');
      await fetchStandards();
    } catch (error: any) {
      toastError(getErrorMessage(error, 'Failed to create classes'));
    } finally {
      setSubmitKey('bulkStandards', false);
    }
  };

  const handleCreateSection = async () => {
    if (!sectionData.class_name || !sectionData.section_name) {
      toastInfo('Please fill all required fields');
      return;
    }

    setSubmitKey('section', true);
    try {
      await adminApi.academics.createSection({
        class_name: sectionData.class_name,
        section_name: sectionData.section_name,
        ...schoolScope.scopeParams,
      });
      toastSuccess('Section created successfully');
      setSectionData({ class_name: '', section_name: '', description: '' });
      setShowAddSection(false);
      await Promise.all([fetchSections(selectedStandard || undefined), fetchStandards()]);
    } catch (error: any) {
      toastError(getErrorMessage(error, 'Failed to create section'));
    } finally {
      setSubmitKey('section', false);
    }
  };

  const handleBulkAssignSections = async () => {
    const validMappings = newSections.filter(m =>
      m.class_name.trim() && m.sections.length > 0
    );

    if (validMappings.length === 0) {
      toastInfo('Please add at least one valid section mapping');
      return;
    }

    setSubmitKey('bulkSections', true);
    try {
      const response = await adminApi.academics.bulkMapSections(validMappings, schoolScope.scopeParams);
      const result = response.data;
      toastSuccess(`Created ${result.total_new_sections ?? 0} new sections`);
      setNewSections([{ class_name: '', sections: [] }]);
      await Promise.all([fetchSections(selectedStandard || undefined), fetchStandards()]);
    } catch (error: any) {
      toastError(getErrorMessage(error, 'Failed to assign sections'));
    } finally {
      setSubmitKey('bulkSections', false);
    }
  };

  const handleAssignClassTeacher = async () => {
    if (!classTeacherData.class_name || !classTeacherData.section_name || !classTeacherData.teacher_id) {
      toastInfo('Please fill all fields');
      return;
    }

    setSubmitKey('classTeacher', true);
    try {
      await adminApi.teachers.assignClassTeacher({
        teacher_id: classTeacherData.teacher_id,
        class_name: classTeacherData.class_name,
        section: classTeacherData.section_name,
        ...schoolScope.scopeParams,
      });
      toastSuccess('Class teacher assigned successfully');
      setClassTeacherData({ class_name: '', section_name: '', teacher_id: '' });
      setShowAssignTeacher(false);
      
      await Promise.all([
        fetchTeachers(),
        fetchSections(selectedStandard || undefined),
        fetchStandards(),
      ]);
    } catch (error: any) {
      toastError(getErrorMessage(error, 'Failed to assign class teacher'));
    } finally {
      setSubmitKey('classTeacher', false);
    }
  };

  const refreshAcademicStructure = async (standardId?: string) => {
    await Promise.all([
      fetchStandards(),
      fetchSections(standardId),
      fetchTeachers(),
    ]);
  };

  const handleEditClass = async (standard: Standard) => {
    const newName = window.prompt('Enter the new class name', standard.name)?.trim();
    if (!newName || newName === standard.name) return;

    const actionKey = `class-edit-${standard.id}`;
    try {
      setStructureAction(actionKey);
      await adminApi.academics.structureEdit({
        type: 'class',
        class_name: standard.name,
        old_name: standard.name,
        new_name: newName,
        ...schoolScope.scopeParams,
      });
      toastSuccess(`Class ${standard.name} renamed to ${newName}`);
      await refreshAcademicStructure(selectedStandard || undefined);
    } catch (error: any) {
      toastError(getErrorMessage(error, 'Failed to update class'));
    } finally {
      setStructureAction(null);
    }
  };

  const handleDeleteClass = async (standard: Standard) => {
    const confirmed = window.confirm(
      `Delete Class ${standard.name} permanently? Its sections and linked academic records can also be deleted. This cannot be undone.`
    );
    if (!confirmed) return;

    const actionKey = `class-delete-${standard.id}`;
    try {
      setStructureAction(actionKey);
      await adminApi.academics.structureManage({
        class: standard.name,
        ...schoolScope.scopeParams,
      });
      setExpandedClass(null);
      setSelectedStandard('');
      toastSuccess(`Class ${standard.name} deleted successfully`);
      await refreshAcademicStructure();
    } catch (error: any) {
      toastError(getErrorMessage(error, 'Failed to delete class'));
    } finally {
      setStructureAction(null);
    }
  };

  const handleEditSection = async (section: Section) => {
    const newName = window.prompt('Enter the new section name', section.name)?.trim();
    if (!newName || newName === section.name) return;

    const actionKey = `section-edit-${section.id}`;
    try {
      setStructureAction(actionKey);
      await adminApi.academics.structureEdit({
        type: 'section',
        class_name: section.standard_name,
        old_name: section.name,
        new_name: newName,
        ...schoolScope.scopeParams,
      });
      toastSuccess(`Section ${section.name} renamed to ${newName}`);
      await refreshAcademicStructure(selectedStandard || undefined);
    } catch (error: any) {
      toastError(getErrorMessage(error, 'Failed to update section'));
    } finally {
      setStructureAction(null);
    }
  };

  const handleDeleteSection = async (section: Section) => {
    const confirmed = window.confirm(
      `Delete Section ${section.name} from Class ${section.standard_name}? Linked section records can also be deleted. This cannot be undone.`
    );
    if (!confirmed) return;

    const actionKey = `section-delete-${section.id}`;
    try {
      setStructureAction(actionKey);
      await adminApi.academics.structureManage({
        class: section.standard_name,
        section: section.name,
        ...schoolScope.scopeParams,
      });
      toastSuccess(`Section ${section.name} deleted successfully`);
      await refreshAcademicStructure(selectedStandard || undefined);
    } catch (error: any) {
      toastError(getErrorMessage(error, 'Failed to delete section'));
    } finally {
      setStructureAction(null);
    }
  };

  const addSectionMapping = () => {
    setNewSections([...newSections, { class_name: '', sections: [] }]);
  };

  const updateSectionMapping = (index: number, field: keyof BulkSectionMap, value: any) => {
    const updated = [...newSections];
    if (field === 'sections') {
      if (typeof value === 'string') {
        const sectionsArray = value.split(/[\n,]/)
          .map((s: string) => s.trim())
          .filter((s: string) => s !== '');
        updated[index].sections = sectionsArray;
      } else {
        updated[index].sections = value;
      }
    } else {
      updated[index][field] = value;
    }
    setNewSections(updated);
  };

  const removeSectionMapping = (index: number) => {
    if (newSections.length === 1) {
      setNewSections([{ class_name: '', sections: [] }]);
    } else {
      setNewSections(newSections.filter((_, i) => i !== index));
    }
  };

  const getSectionsForClass = (className: string) => {
    return sections.filter(section => section.standard_name === className);
  };

  const handleStandardFilter = (standardId: string) => {
    setSelectedStandard(standardId);
    void fetchSections(standardId || undefined);
  };

  const handleAddSectionFromClassTab = () => {
    setActiveTab('sections');
    setTimeout(() => {
      setShowAddSection(true);
    }, 100);
  };

  const getClassSuggestions = () => {
    return standards.map(std => std.name);
  };

  // Get teacher for a specific class and section
  const getTeacherForSection = (className: string, sectionName: string): Teacher | undefined => {
    const key = `${className}-${sectionName}`;
    return sectionTeacherMap[key];
  };

  return (
    <div className={`dashboard-typography p-3 md:p-4 xl:p-6 ${getBgClass()} transition-colors duration-200`}>
      <div className="mx-auto max-w-[1600px]">
        {/* Header */}
        <div className="mb-6 sm:mb-8">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-5 sm:mb-6">
            <div className="flex items-center gap-3 sm:gap-4">
              <div className={combine(
                "p-2.5 sm:p-3 rounded-xl sm:rounded-2xl shadow-lg",
                theme === 'dark'
                  ? "bg-gradient-to-br from-blue-600 to-blue-700"
                  : "bg-gradient-to-br from-blue-500 to-blue-600"
              )}>
                <GraduationCap className="h-5 w-5 sm:h-6 sm:w-6 text-white" />
              </div>
              <div>
                <h1 className={combine("text-2xl sm:text-3xl font-bold", get('text', 'primary'))}>
                  Academic Structure
                </h1>
                <p className={combine("text-xs sm:text-sm mt-1", get('text', 'secondary'))}>
                  Manage classes, sections, and assign class teachers
                </p>
              </div>
            </div>
            <SchoolScopeSelector {...schoolScope} className="w-full sm:w-auto" />
          </div>

          {/* Stats Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4 sm:gap-6 mb-6 sm:mb-8">
            <div className={getStatsCardClass('blue')}>
              <div className="flex items-center justify-between">
                <div>
                  <p className={combine("text-sm font-medium", get('text', 'secondary'))}>Total Classes</p>
                  <p className={combine("text-2xl sm:text-3xl font-bold mt-2", get('text', 'primary'))}>
                    {loading.standards ? '...' : standards.length}
                  </p>
                </div>
                <div className={combine(
                  "p-2.5 sm:p-3 rounded-xl",
                  theme === 'dark' ? 'bg-blue-900/30' : 'bg-blue-100'
                )}>
                  <Building className={combine(
                    "h-5 w-5 sm:h-6 sm:w-6",
                    theme === 'dark' ? 'text-blue-400' : 'text-blue-600'
                  )} />
                </div>
              </div>
              <div className={combine("mt-4 text-xs", get('accent', 'primary'))}>
                Active academic classes
              </div>
            </div>

            <div className={getStatsCardClass('emerald')}>
              <div className="flex items-center justify-between">
                <div>
                  <p className={combine("text-sm font-medium", get('text', 'secondary'))}>Total Sections</p>
                  <p className={combine("text-2xl sm:text-3xl font-bold mt-2", get('text', 'primary'))}>
                    {loading.sections ? '...' : sections.length}
                  </p>
                </div>
                <div className={combine(
                  "p-2.5 sm:p-3 rounded-xl",
                  theme === 'dark' ? 'bg-emerald-900/30' : 'bg-emerald-100'
                )}>
                  <Layers className={combine(
                    "h-5 w-5 sm:h-6 sm:w-6",
                    theme === 'dark' ? 'text-emerald-400' : 'text-emerald-600'
                  )} />
                </div>
              </div>
              <div className={combine("mt-4 text-xs", get('accent', 'success'))}>
                Across all classes
              </div>
            </div>

            <div className={getStatsCardClass('purple')}>
              <div className="flex items-center justify-between">
                <div>
                  <p className={combine("text-sm font-medium", get('text', 'secondary'))}>Available Teachers</p>
                  <p className={combine("text-2xl sm:text-3xl font-bold mt-2", get('text', 'primary'))}>
                    {loading.teachers ? '...' : teachers.length}
                  </p>
                </div>
                <div className={combine(
                  "p-2.5 sm:p-3 rounded-xl",
                  theme === 'dark' ? 'bg-purple-900/30' : 'bg-purple-100'
                )}>
                  <Users className={combine(
                    "h-5 w-5 sm:h-6 sm:w-6",
                    theme === 'dark' ? 'text-purple-400' : 'text-purple-600'
                  )} />
                </div>
              </div>
              <div className={combine("mt-4 text-xs", get('accent', 'primary'))}>
                {Object.keys(sectionTeacherMap).length} teachers assigned
              </div>
            </div>
          </div>

          {(loadErrors.standards || loadErrors.sections || loadErrors.teachers) && (
            <div className={combine(
              "mb-6 rounded-xl border p-4 text-sm",
              theme === 'dark'
                ? "border-red-800 bg-red-950/30 text-red-200"
                : "border-red-200 bg-red-50 text-red-700"
            )}>
              <div className="font-semibold">Some academic data could not be loaded.</div>
              <div className="mt-1 space-y-1">
                {loadErrors.standards && <div>Classes: {loadErrors.standards}</div>}
                {loadErrors.sections && <div>Sections: {loadErrors.sections}</div>}
                {loadErrors.teachers && <div>Teachers: {loadErrors.teachers}</div>}
              </div>
              <button
                type="button"
                onClick={() => void Promise.all([fetchStandards(), fetchSections(selectedStandard || undefined), fetchTeachers()])}
                className={combine(
                  "mt-3 rounded-lg px-3 py-2 text-xs font-semibold transition-colors",
                  theme === 'dark'
                    ? "bg-red-900/40 text-red-100 hover:bg-red-900/60"
                    : "bg-red-100 text-red-700 hover:bg-red-200"
                )}
              >
                Retry
              </button>
            </div>
          )}
        </div>

        {/* Main Content */}
        <div className={getCardGradientClass('blue')}>
          {/* Tabs */}
          <div className={combine("border-b", get('border', 'primary'))}>
            <div className="flex sm:grid sm:grid-cols-3 overflow-x-auto pb-1">
              <button
                onClick={() => setActiveTab('classes')}
                className={getTabClass(activeTab === 'classes')}
              >
                <BookOpen className="h-4 w-4" />
                Classes
              </button>
              <button
                onClick={() => setActiveTab('sections')}
                className={getTabClass(activeTab === 'sections')}
              >
                <Layers className="h-4 w-4" />
                Sections
              </button>
              <button
                onClick={() => setActiveTab('bulk')}
                className={getTabClass(activeTab === 'bulk')}
              >
                <Plus className="h-4 w-4" />
                Bulk Operations
              </button>
            </div>
          </div>

          {/* Content Area */}
          <div className="p-4 sm:p-6">
            {activeTab === 'classes' && (
              <div className="space-y-6">
                {/* Add New Class */}
                <div className={getCardGradientClass('blue')}>
                  <h3 className={combine("text-lg font-semibold mb-4 flex items-center gap-2", get('text', 'primary'))}>
                    
                    Add New Class
                  </h3>
                  <div className="flex flex-col md:flex-row gap-3">
                    <input
                      type="text"
                      value={newStandard}
                      onChange={(e) => setNewStandard(e.target.value)}
                      placeholder="Enter class name (e.g., 10, 11, 12 or LKG, UKG)"
                      className={combine(getInputClass(), "flex-1")}
                    />
                    <button
                      onClick={handleCreateStandard}
                      disabled={submitting.standard || !newStandard.trim()}
                      className={combine(getPrimaryButtonClass(), "w-full md:w-auto flex items-center justify-center gap-2 hover:scale-[1.02] active:scale-[0.98]")}
                    >
                      <Plus className="h-4 w-4" />
                      {submitting.standard ? 'Adding...' : 'Add Single Class'}
                    </button>
                  </div>
                </div>

                {/* Classes List */}
                <div>
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 mb-4">
                    <h3 className={combine("text-lg font-semibold", get('text', 'primary'))}>
                      All Classes
                    </h3>
                    <div className={combine("text-sm", get('text', 'tertiary'))}>
                      {standards.length} classes • {sections.length} sections
                    </div>
                  </div>

                  {loading.standards ? (
                    <div className="p-6 sm:p-8 text-center">
                      <div className="text-center">
                        <div className="relative mx-auto w-16 h-16">
                          <div className="animate-spin rounded-full h-16 w-16 border-4 border-blue-200 border-t-blue-600"></div>
                          <div className="absolute inset-0 flex items-center justify-center">
                            <FaSchool className="h-8 w-8 text-blue-600 animate-pulse" />
                          </div>
                        </div>
                        <p className={combine("mt-4 sm:mt-6 text-xs sm:text-sm font-medium", get('text', 'secondary'))}>Loading classes...</p>
                        <p className={combine("text-xs sm:text-sm mt-1 sm:mt-2", get('text', 'tertiary'))}>Preparing class records</p>
                      </div>
                    </div>
                  ) : standards.length === 0 ? (
                    <div className={combine(
                      "text-center py-12 border-2 border-dashed rounded-xl",
                      get('border', 'secondary'),
                      get('bg', 'secondary')
                    )}>
                      <BookOpen className={combine(
                        "h-12 w-12 mx-auto mb-3",
                        get('icon', 'secondary')
                      )} />
                      <p className={combine(get('text', 'tertiary'))}>
                        No classes found. Create your first class above.
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {standards.map((standard) => (
                        <div key={standard.id} className={combine(
                          "border rounded-xl overflow-hidden",
                          get('border', 'primary'),
                          get('bg', 'card')
                        )}>
                          <button
                            onClick={() => setExpandedClass(expandedClass === standard.id ? null : standard.id)}
                            className={combine(
                              "w-full px-4 sm:px-6 py-4 flex items-center justify-between transition-colors",
                              get('bg', 'card'),
                              "hover:bg-[var(--color-bg-hover)]"
                            )}
                          >
                            <div className="flex items-center gap-3 sm:gap-4">
                              <div className={combine(
                                "p-2 rounded-xl",
                                theme === 'dark' ? 'bg-blue-900/30' : 'bg-blue-100'
                              )}>
                                <BookOpen className={combine(
                                  "h-5 w-5",
                                  theme === 'dark' ? 'text-blue-400' : 'text-blue-600'
                                )} />
                              </div>
                              <div className="text-left">
                                <h4 className={combine("font-bold text-base sm:text-lg", get('text', 'primary'))}>
                                  Class {standard.name}
                                </h4>
                              </div>
                            </div>
                            <div className="flex items-center gap-2 sm:gap-4">
                              <span className={getStatusBadgeClass('blue')}>
                                {standard.sections?.length || 0} Sections
                              </span>
                              {expandedClass === standard.id ? (
                                <ChevronDown className={combine(
                                  "h-5 w-5",
                                  get('icon', 'secondary')
                                )} />
                              ) : (
                                <ChevronRight className={combine(
                                  "h-5 w-5",
                                  get('icon', 'secondary')
                                )} />
                              )}
                            </div>
                          </button>

                          {expandedClass === standard.id && (
                            <div className={combine(
                              "px-4 sm:px-6 py-4 border-t",
                              get('border', 'primary'),
                              get('bg', 'secondary')
                            )}>
                              <div className="mb-4">
                                <div className="flex items-center justify-between mb-4">
                                  <h5 className={combine("font-medium", get('text', 'primary'))}>
                                    Sections ({standard.sections?.length || 0})
                                  </h5>
                                  <div className="flex flex-wrap justify-end gap-2">
                                    <button
                                      onClick={() => handleEditClass(standard)}
                                      disabled={structureAction !== null}
                                      className={combine(
                                        "px-3 py-1.5 text-sm font-medium rounded-xl transition-all duration-200 flex items-center gap-1 disabled:cursor-wait disabled:opacity-50",
                                        theme === 'dark'
                                          ? 'bg-amber-900/30 text-amber-300 hover:bg-amber-800/30'
                                          : 'bg-amber-100 text-amber-700 hover:bg-amber-200'
                                      )}
                                    >
                                      <Edit className="h-3 w-3" />
                                      Edit Class
                                    </button>
                                    <button
                                      onClick={() => handleDeleteClass(standard)}
                                      disabled={structureAction !== null}
                                      className={combine(
                                        "px-3 py-1.5 text-sm font-medium rounded-xl transition-all duration-200 flex items-center gap-1 disabled:cursor-wait disabled:opacity-50",
                                        theme === 'dark'
                                          ? 'bg-red-900/30 text-red-300 hover:bg-red-800/30'
                                          : 'bg-red-100 text-red-700 hover:bg-red-200'
                                      )}
                                    >
                                      <Trash2 className="h-3 w-3" />
                                      Delete Class
                                    </button>
                                    <button
                                      onClick={handleAddSectionFromClassTab}
                                      className={combine(
                                        "px-3 py-1.5 text-sm font-medium rounded-xl transition-all duration-200 flex items-center gap-1",
                                        theme === 'dark'
                                          ? 'bg-blue-900/30 text-blue-300 hover:bg-blue-800/30 hover:text-blue-200'
                                          : 'bg-blue-100 text-blue-600 hover:bg-blue-200 hover:text-blue-800'
                                      )}
                                    >
                                      <Plus className="h-3 w-3" />
                                      Add Section
                                    </button>
                                  </div>
                                </div>

                                {standard.sections && standard.sections.length > 0 ? (
                                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-3">
                                    {standard.sections.map((section) => {
                                      const teacher = getTeacherForSection(standard.name, section.name);

                                      return (
                                        <div
                                          key={section.id}
                                          className={combine(
                                            "p-4 rounded-xl border transition-all duration-200",
                                            get('border', 'primary'),
                                            get('bg', 'card'),
                                            "hover:bg-[var(--color-bg-hover)]"
                                          )}
                                        >
                                          <div className="flex flex-col items-center text-center">
                                            <div className={combine(
                                              "mb-2 p-2 rounded-xl",
                                              theme === 'dark' ? 'bg-emerald-900/30' : 'bg-emerald-100'
                                            )}>
                                              <Layers className={combine(
                                                "h-5 w-5",
                                                theme === 'dark' ? 'text-emerald-400' : 'text-emerald-600'
                                              )} />
                                            </div>
                                            <h6 className={combine("font-bold text-lg", get('text', 'primary'))}>
                                              Section {section.name}
                                            </h6>

                                            {teacher ? (
                                              <div className="mt-2 w-full">
                                                <div className={combine("text-xs font-medium mb-1", get('text', 'tertiary'))}>
                                                  Class Teacher
                                                </div>
                                                <div className="flex items-center justify-center gap-2">
                                                  <div className={combine(
                                                    "w-6 h-6 rounded-full flex items-center justify-center",
                                                    theme === 'dark' ? 'bg-purple-900/30' : 'bg-purple-100'
                                                  )}>
                                                    <Users className={combine(
                                                      "h-3 w-3",
                                                      theme === 'dark' ? 'text-purple-400' : 'text-purple-600'
                                                    )} />
                                                  </div>
                                                  <span className={combine("text-xs truncate", get('text', 'primary'))}>
                                                    {teacher.name}
                                                  </span>
                                                </div>
                                                <div className={combine("text-[10px] mt-1", get('text', 'tertiary'))}>
                                                  {teacher.teacher_id}
                                                </div>
                                              </div>
                                            ) : (
                                              <div className="mt-2">
                                                <span className={combine("text-xs italic", get('text', 'tertiary'))}>
                                                  No teacher assigned
                                                </span>
                                              </div>
                                            )}

                                            <button
                                              onClick={() => {
                                                setClassTeacherData({
                                                  class_name: standard.name,
                                                  section_name: section.name,
                                                  teacher_id: teacher?.teacher_id || ''
                                                });
                                                setShowAssignTeacher(true);
                                                setActiveTab('sections');
                                              }}
                                              className={combine(
                                                "mt-3 w-full text-xs font-medium px-3 py-1.5 rounded-lg transition-all duration-200",
                                                theme === 'dark'
                                                  ? 'text-purple-400 hover:bg-purple-900/30 hover:text-purple-300'
                                                  : 'text-purple-600 hover:bg-purple-100 hover:text-purple-800'
                                              )}
                                            >
                                              {teacher ? 'Change Teacher' : 'Assign Teacher'}
                                            </button>
                                            <div className="mt-2 flex w-full gap-2">
                                              <button
                                                type="button"
                                                onClick={() => handleEditSection(section)}
                                                disabled={structureAction !== null}
                                                className={combine(
                                                  "flex flex-1 items-center justify-center gap-1 rounded-lg px-2 py-1.5 text-xs font-medium disabled:cursor-wait disabled:opacity-50",
                                                  theme === 'dark'
                                                    ? 'text-amber-300 hover:bg-amber-900/30'
                                                    : 'text-amber-700 hover:bg-amber-100'
                                                )}
                                              >
                                                <Edit className="h-3.5 w-3.5" />
                                                Edit
                                              </button>
                                              <button
                                                type="button"
                                                onClick={() => handleDeleteSection(section)}
                                                disabled={structureAction !== null}
                                                className={combine(
                                                  "flex flex-1 items-center justify-center gap-1 rounded-lg px-2 py-1.5 text-xs font-medium disabled:cursor-wait disabled:opacity-50",
                                                  theme === 'dark'
                                                    ? 'text-red-300 hover:bg-red-900/30'
                                                    : 'text-red-700 hover:bg-red-100'
                                                )}
                                              >
                                                <Trash2 className="h-3.5 w-3.5" />
                                                Delete
                                              </button>
                                            </div>
                                          </div>
                                        </div>
                                      );
                                    })}
                                  </div>
                                ) : (
                                  <div className="text-center py-8">
                                    <div className={combine(
                                      "inline-flex items-center justify-center w-16 h-16 rounded-full mb-4",
                                      theme === 'dark' ? 'bg-blue-900/30 text-blue-300' : 'bg-blue-100 text-blue-600'
                                    )}>
                                      <Layers className="h-8 w-8" />
                                    </div>
                                    <p className={combine("font-medium mb-2", get('text', 'primary'))}>
                                      No sections created yet
                                    </p>
                                    <p className={combine("text-sm mb-4", get('text', 'secondary'))}>
                                      Click "Add Section" to create sections for this class
                                    </p>
                                    <button
                                      onClick={handleAddSectionFromClassTab}
                                      className={combine(
                                        "px-4 py-2 text-sm font-medium rounded-xl transition-all duration-200 flex items-center gap-2 mx-auto",
                                        theme === 'dark'
                                          ? 'bg-blue-900/30 text-blue-300 hover:bg-blue-800/30 hover:text-blue-200'
                                          : 'bg-blue-100 text-blue-600 hover:bg-blue-200 hover:text-blue-800'
                                      )}
                                    >
                                      <Plus className="h-3 w-3" />
                                      Create First Section
                                    </button>
                                  </div>
                                )}
                              </div>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}

            {activeTab === 'sections' && (
              <div className="space-y-6 -mx-1 sm:-mx-2">
                {/* Section Creation Form */}
                {showAddSection && (
                  <div className={getCardGradientClass('emerald')}>
                    <div className="flex items-center justify-between mb-4">
                      <h3 className={combine("text-lg font-semibold", get('text', 'primary'))}>
                        Create New Section
                      </h3>
                      <button
                        onClick={() => setShowAddSection(false)}
                        className={combine(
                          "p-1 rounded-xl transition-all hover:bg-[var(--color-bg-hover)]",
                          get('icon', 'secondary')
                        )}
                      >
                        <X className="h-5 w-5" />
                      </button>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div>
                        <label className={combine("block text-sm font-medium mb-2", get('text', 'primary'))}>
                          Class Name
                        </label>
                        <select
                          value={sectionData.class_name}
                          onChange={(e) => setSectionData({ ...sectionData, class_name: e.target.value })}
                          className={getInputClass()}
                        >
                          <option value="">Select Class</option>
                          {standards.map((standard) => (
                            <option key={standard.id} value={standard.name}>
                              Class {standard.name}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div>
                        <label className={combine("block text-sm font-medium mb-2", get('text', 'primary'))}>
                          Section Name
                        </label>
                        <input
                          type="text"
                          value={sectionData.section_name}
                          onChange={(e) => setSectionData({ ...sectionData, section_name: e.target.value })}
                          placeholder="e.g., A, B, C"
                          className={getInputClass()}
                        />
                      </div>

                      <div className="flex items-end">
                        <button
                          onClick={handleCreateSection}
                          disabled={submitting.section || !sectionData.class_name || !sectionData.section_name}
                          className={combine(
                            "w-full px-6 py-3 rounded-xl transition-all duration-200 font-medium flex items-center justify-center gap-2",
                            theme === 'dark'
                              ? 'bg-gradient-to-r from-emerald-600 to-emerald-700 hover:from-emerald-700 hover:to-emerald-800 text-white'
                              : 'bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-600 hover:to-emerald-700 text-white',
                            "disabled:opacity-50 disabled:cursor-not-allowed hover:scale-[1.02] active:scale-[0.98]"
                          )}
                        >
                          <Check className="h-4 w-4" />
                          {submitting.section ? 'Creating...' : 'Create Section'}
                        </button>
                      </div>
                    </div>
                  </div>
                )}

                {/* Assign Teacher Form */}
                {showAssignTeacher && (
                  <div className={getCardGradientClass('purple')}>
                    <div className="flex items-center justify-between mb-4">
                      <h3 className={combine("text-lg font-semibold", get('text', 'primary'))}>
                        Assign Class Teacher
                      </h3>
                      <button
                        onClick={() => setShowAssignTeacher(false)}
                        className={combine(
                          "p-1 rounded-xl transition-all hover:bg-[var(--color-bg-hover)]",
                          get('icon', 'secondary')
                        )}
                      >
                        <X className="h-5 w-5" />
                      </button>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                      <div>
                        <label className={combine("block text-sm font-medium mb-2", get('text', 'primary'))}>
                          Class Name
                        </label>
                        <select
                          value={classTeacherData.class_name}
                          onChange={(e) => setClassTeacherData({ ...classTeacherData, class_name: e.target.value })}
                          className={getInputClass()}
                        >
                          <option value="">Select Class</option>
                          {standards.map((standard) => (
                            <option key={standard.id} value={standard.name}>
                              Class {standard.name}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div>
                        <label className={combine("block text-sm font-medium mb-2", get('text', 'primary'))}>
                          Section Name
                        </label>
                        <select
                          value={classTeacherData.section_name}
                          onChange={(e) => setClassTeacherData({ ...classTeacherData, section_name: e.target.value })}
                          disabled={!classTeacherData.class_name}
                          className={combine(getInputClass(), "disabled:opacity-50")}
                        >
                          <option value="">Select Section</option>
                          {getSectionsForClass(classTeacherData.class_name).map((section) => (
                            <option key={section.id} value={section.name}>
                              Section {section.name}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div>
                        <label className={combine("block text-sm font-medium mb-2", get('text', 'primary'))}>
                          Teacher
                        </label>
                        <select
                          value={classTeacherData.teacher_id}
                          onChange={(e) => setClassTeacherData({ ...classTeacherData, teacher_id: e.target.value })}
                          className={getInputClass()}
                        >
                          <option value="">Select Teacher</option>
                          {teachers
                            .filter(t => !t.class_name || t.class_name === classTeacherData.class_name)
                            .map((teacher) => (
                              <option key={teacher.id} value={teacher.teacher_id}>
                                {teacher.name} ({teacher.teacher_id}) {teacher.class_name ? `- Currently assigned to ${teacher.class_name} ${teacher.section_name}` : ''}
                              </option>
                            ))}
                        </select>
                      </div>

                      <div className="flex items-end">
                        <button
                          onClick={handleAssignClassTeacher}
                          disabled={submitting.classTeacher || !classTeacherData.class_name || !classTeacherData.section_name || !classTeacherData.teacher_id}
                          className={combine(
                            "w-full px-6 py-3 rounded-xl transition-all duration-200 font-medium flex items-center justify-center gap-2",
                            theme === 'dark'
                              ? 'bg-gradient-to-r from-purple-600 to-purple-700 hover:from-purple-700 hover:to-purple-800 text-white'
                              : 'bg-gradient-to-r from-purple-500 to-purple-600 hover:from-purple-600 hover:to-purple-700 text-white',
                            "disabled:opacity-50 disabled:cursor-not-allowed hover:scale-[1.02] active:scale-[0.98]"
                          )}
                        >
                          <Check className="h-4 w-4" />
                          {submitting.classTeacher ? 'Assigning...' : 'Assign Teacher'}
                        </button>
                      </div>
                    </div>
                  </div>
                )}

                {/* Filter and Action Bar */}
                <div className="flex flex-col md:flex-row gap-4 justify-between items-start md:items-center">
                  <div className="flex items-center gap-3">
                    <div className={combine(
                      "flex items-center gap-2 px-4 py-2 rounded-xl",
                      get('bg', 'secondary'),
                      get('text', 'secondary')
                    )}>
                      <Filter className="h-4 w-4" />
                      <select
                        value={selectedStandard}
                        onChange={(e) => handleStandardFilter(e.target.value)}
                        className={combine(
                          "bg-transparent border-none focus:ring-0 text-sm font-medium",
                          get('text', 'primary')
                        )}
                      >
                        <option value="">All Classes</option>
                        {standards.map((standard) => (
                          <option key={standard.id} value={standard.id.toString()}>
                            Class {standard.name}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div className="flex gap-2">
                    <button
                      onClick={() => setShowAddSection(true)}
                      className={combine(getSecondaryButtonClass(), "flex items-center gap-2 hover:scale-[1.02] active:scale-[0.98]")}
                    >
                      <Plus className="h-4 w-4" />
                      Add Section
                    </button>
                    <button
                      onClick={() => setShowAssignTeacher(true)}
                      className={combine(
                        "px-4 py-2 rounded-xl transition-all duration-200 font-medium flex items-center gap-2",
                        theme === 'dark'
                          ? 'bg-gradient-to-r from-purple-600 to-purple-700 hover:from-purple-700 hover:to-purple-800 text-white'
                          : 'bg-gradient-to-r from-purple-500 to-purple-600 hover:from-purple-600 hover:to-purple-700 text-white',
                        "hover:scale-[1.02] active:scale-[0.98]"
                      )}
                    >
                      <Users className="h-4 w-4" />
                      Assign Teacher
                    </button>
                  </div>
                </div>

                {/* Sections Table */}
                <div className={combine(
                  "rounded-lg sm:rounded-xl overflow-hidden border",
                  get('border', 'primary')
                )}>
                  <div className="w-full overflow-x-auto">
                    <table className="w-full min-w-[760px] xl:min-w-full table-auto">
                      <thead className={getTableHeaderClass()}>
                        <tr>
                          <th className={combine("w-[18%] px-3 sm:px-4 lg:px-6 py-3 sm:py-4 text-left text-xs sm:text-sm font-semibold whitespace-nowrap", get('text', 'primary'))}>
                            Class
                          </th>
                          <th className={combine("w-[16%] px-3 sm:px-4 lg:px-6 py-3 sm:py-4 text-left text-xs sm:text-sm font-semibold whitespace-nowrap", get('text', 'primary'))}>
                            Section
                          </th>
                          <th className={combine("w-[34%] px-3 sm:px-4 lg:px-6 py-3 sm:py-4 text-left text-xs sm:text-sm font-semibold whitespace-nowrap", get('text', 'primary'))}>
                            Class Teacher
                          </th>
                          <th className={combine("w-[18%] px-3 sm:px-4 lg:px-6 py-3 sm:py-4 text-left text-xs sm:text-sm font-semibold whitespace-nowrap", get('text', 'primary'))}>
                            Teacher ID
                          </th>
                          <th className={combine("w-[14%] px-3 sm:px-4 lg:px-6 py-3 sm:py-4 text-left text-xs sm:text-sm font-semibold whitespace-nowrap", get('text', 'primary'))}>
                            Actions
                          </th>
                        </tr>
                      </thead>
                      <tbody className={combine("divide-y", getTableRowClass())}>
                        {loading.sections ? (
                          <tr>
                            <td colSpan={5} className="px-4 sm:px-6 py-10 sm:py-12 text-center">
                              <div className="text-center">
                                <div className="relative mx-auto w-16 h-16">
                                  <div className="animate-spin rounded-full h-16 w-16 border-4 border-blue-200 border-t-blue-600"></div>
                                  <div className="absolute inset-0 flex items-center justify-center">
                                    <FaSchool className="h-8 w-8 text-blue-600 animate-pulse" />
                                  </div>
                                </div>
                                <p className={combine("mt-4 sm:mt-6 text-xs sm:text-sm font-medium", get('text', 'secondary'))}>
                                  Loading sections...
                                </p>
                                <p className={combine("text-xs sm:text-sm mt-1 sm:mt-2", get('text', 'tertiary'))}>Preparing section records</p>
                              </div>
                            </td>
                          </tr>
                        ) : sections.length === 0 ? (
                          <tr>
                            <td colSpan={5} className="px-4 sm:px-6 py-10 sm:py-12 text-center">
                              <Layers className={combine(
                                "h-12 w-12 mx-auto mb-3",
                                get('icon', 'secondary')
                              )} />
                              <p className={combine(get('text', 'tertiary'))}>
                                No sections found. Create your first section.
                              </p>
                            </td>
                          </tr>
                        ) : (
                          sections.map((section) => {
                            const teacher = getTeacherForSection(section.standard_name, section.name);

                            return (
                              <tr key={section.id} className="transition-colors hover:bg-[var(--color-bg-hover)]">
                                <td className="px-3 sm:px-4 lg:px-6 py-3 sm:py-4 align-middle">
                                  <div className="flex items-center gap-2 sm:gap-3 min-h-[44px]">
                                    <div className={combine(
                                      "p-1.5 sm:p-2 rounded-lg sm:rounded-xl shrink-0",
                                      theme === 'dark' ? 'bg-blue-900/30' : 'bg-blue-100'
                                    )}>
                                      <BookOpen className={combine(
                                        "h-3.5 w-3.5 sm:h-4 sm:w-4",
                                        theme === 'dark' ? 'text-blue-400' : 'text-blue-600'
                                      )} />
                                    </div>
                                    <span className={combine("font-medium text-xs sm:text-sm whitespace-nowrap", get('text', 'primary'))}>
                                      Class {section.standard_name}
                                    </span>
                                  </div>
                                </td>
                                <td className="px-3 sm:px-4 lg:px-6 py-3 sm:py-4 align-middle">
                                  <span className={getStatusBadgeClass('emerald')}>
                                    Section {section.name}
                                  </span>
                                </td>
                                <td className="px-3 sm:px-4 lg:px-6 py-3 sm:py-4 align-middle">
                                  {teacher ? (
                                    <div className="flex items-center gap-2 sm:gap-3 min-h-[44px]">
                                      <div className={combine(
                                        "w-7 h-7 sm:w-8 sm:h-8 rounded-full flex items-center justify-center shrink-0",
                                        theme === 'dark' ? 'bg-purple-900/30' : 'bg-purple-100'
                                      )}>
                                        <Users className={combine(
                                          "h-3.5 w-3.5 sm:h-4 sm:w-4",
                                          theme === 'dark' ? 'text-purple-400' : 'text-purple-600'
                                        )} />
                                      </div>
                                      <div className="min-w-0">
                                        <span className={combine("font-medium block text-xs sm:text-sm truncate", get('text', 'primary'))}>
                                          {teacher.name}
                                        </span>
                                        <span className={combine("text-[11px] sm:text-xs truncate block", get('text', 'tertiary'))}>
                                          {teacher.department} • {teacher.qualification}
                                        </span>
                                      </div>
                                    </div>
                                  ) : (
                                    <span className={combine("italic text-xs sm:text-sm whitespace-nowrap", get('text', 'tertiary'))}>
                                      Not assigned
                                    </span>
                                  )}
                                </td>
                                <td className="px-3 sm:px-4 lg:px-6 py-3 sm:py-4 align-middle">
                                  <span className={combine("text-xs sm:text-sm font-medium whitespace-nowrap", get('text', 'secondary'))}>
                                    {teacher ? teacher.teacher_id : '-'}
                                  </span>
                                </td>
                                <td className="px-3 sm:px-4 lg:px-6 py-3 sm:py-4 align-middle">
                                  <div className="flex items-center gap-2">
                                    <button
                                      onClick={() => {
                                        setClassTeacherData({
                                          class_name: section.standard_name,
                                          section_name: section.name,
                                          teacher_id: teacher?.teacher_id || ''
                                        });
                                        setShowAssignTeacher(true);
                                      }}
                                      className={combine(
                                        "p-1.5 sm:p-2 rounded-lg sm:rounded-xl transition-all duration-200 hover:bg-[var(--color-bg-hover)]",
                                        get('icon', 'primary')
                                      )}
                                      title={teacher ? "Change Teacher" : "Assign Teacher"}
                                    >
                                      {teacher ? (
                                        <Edit className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                                      ) : (
                                        <Users className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                                      )}
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => handleEditSection(section)}
                                      disabled={structureAction !== null}
                                      className={combine(
                                        "p-1.5 sm:p-2 rounded-lg sm:rounded-xl transition-all duration-200 disabled:cursor-wait disabled:opacity-50",
                                        theme === 'dark' ? 'text-amber-300 hover:bg-amber-900/30' : 'text-amber-700 hover:bg-amber-100'
                                      )}
                                      title="Edit Section"
                                      aria-label={`Edit Section ${section.name}`}
                                    >
                                      <Edit className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => handleDeleteSection(section)}
                                      disabled={structureAction !== null}
                                      className={combine(
                                        "p-1.5 sm:p-2 rounded-lg sm:rounded-xl transition-all duration-200 disabled:cursor-wait disabled:opacity-50",
                                        theme === 'dark' ? 'text-red-300 hover:bg-red-900/30' : 'text-red-700 hover:bg-red-100'
                                      )}
                                      title="Delete Section"
                                      aria-label={`Delete Section ${section.name}`}
                                    >
                                      <Trash2 className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                                    </button>
                                  </div>
                                </td>
                              </tr>
                            );
                          })
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'bulk' && (
              <div className="space-y-6">
                {/* Bulk Create Classes */}
                <div className={getCardGradientClass('indigo')}>
                  <h3 className={combine("text-lg font-semibold mb-4", get('text', 'primary'))}>
                    Bulk Create Classes
                  </h3>
                  <div className="space-y-4">
                    <div>
                      <label className={combine("block text-sm font-medium mb-2", get('text', 'primary'))}>
                        Enter class names separated by commas
                      </label>
                      <textarea
                        value={newStandard}
                        onChange={(e) => setNewStandard(e.target.value)}
                        placeholder="e.g., 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, LKG, UKG"
                        rows={3}
                        className={combine(getInputClass(), "w-full resize-none")}
                      />
                    </div>
                    <button
                      onClick={handleBulkCreateStandards}
                      disabled={submitting.bulkStandards || !newStandard.trim()}
                      className={combine(
                        "px-6 py-3 rounded-xl transition-all duration-200 font-medium flex items-center justify-center gap-2",
                        theme === 'dark'
                          ? 'bg-gradient-to-r from-indigo-600 to-indigo-700 hover:from-indigo-700 hover:to-indigo-800 text-white'
                          : 'bg-gradient-to-r from-indigo-500 to-indigo-600 hover:from-indigo-600 hover:to-indigo-700 text-white',
                        "disabled:opacity-50 disabled:cursor-not-allowed hover:scale-[1.02] active:scale-[0.98]"
                      )}
                    >
                      <Plus className="h-4 w-4" />
                      {submitting.bulkStandards ? 'Creating...' : 'Create Multiple Classes'}
                    </button>
                    <p className={combine("text-sm", get('text', 'tertiary'))}>
                      Creates multiple classes at once. Existing classes will be skipped.
                    </p>
                  </div>
                </div>

                {/* Bulk Assign Sections */}
                <div className={getCardGradientClass('green')}>
                  <div className="flex items-center justify-between mb-4">
                    <h3 className={combine("text-lg font-semibold", get('text', 'primary'))}>
                      Bulk Assign Sections to Classes
                    </h3>
                    <div className="flex items-center gap-2">
                      <span className={combine("text-sm", get('text', 'tertiary'))}>
                        {newSections.length} mappings
                      </span>
                      <button
                        onClick={addSectionMapping}
                        className={combine(
                          "p-1 rounded-xl transition-all hover:bg-[var(--color-bg-hover)]",
                          theme === 'dark' ? 'text-green-400' : 'text-green-600'
                        )}
                        title="Add another mapping"
                      >
                        <Plus className="h-4 w-4" />
                      </button>
                    </div>
                  </div>

                  <div className="space-y-4">
                    {newSections.map((mapping, index) => (
                      <div key={index} className={combine(
                        "p-4 rounded-xl border",
                        get('border', 'primary'),
                        get('bg', 'card')
                      )}>
                        <div className="flex items-center justify-between mb-3">
                          <span className={combine("font-medium", get('text', 'primary'))}>
                            Mapping #{index + 1}
                          </span>
                          <button
                            onClick={() => removeSectionMapping(index)}
                            className={combine(
                              "p-1 rounded-xl transition-all hover:bg-[var(--color-bg-hover)]",
                              theme === 'dark' ? 'text-red-400' : 'text-red-600'
                            )}
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div>
                            <label className={combine("block text-sm font-medium mb-2", get('text', 'primary'))}>
                              Class Name
                            </label>
                            <div className="relative">
                              <input
                                type="text"
                                value={mapping.class_name}
                                onChange={(e) => updateSectionMapping(index, 'class_name', e.target.value)}
                                placeholder="e.g., 10"
                                list={`class-suggestions-${index}`}
                                className={getInputClass()}
                              />
                              <datalist id={`class-suggestions-${index}`}>
                                {getClassSuggestions().map((className, idx) => (
                                  <option key={idx} value={className} />
                                ))}
                              </datalist>
                            </div>
                            {!getClassSuggestions().includes(mapping.class_name) && mapping.class_name && (
                              <p className={combine("text-sm mt-1", get('accent', 'warning'))}>
                                ⚠️ This class doesn't exist yet. Make sure to create it first.
                              </p>
                            )}
                          </div>
                          <div>
                            <label className={combine("block text-sm font-medium mb-2", get('text', 'primary'))}>
                              Sections (one per line or comma separated)
                            </label>
                            <div className="space-y-2">
                              <div className="flex flex-wrap gap-2 mb-2">
                                <button
                                  type="button"
                                  onClick={() => updateSectionMapping(index, 'sections', ['A', 'B', 'C'])}
                                  className={combine(
                                    "text-xs px-3 py-1 rounded hover:scale-[1.05] transition-all",
                                    theme === 'dark' ? 'bg-blue-900/30 text-blue-300 hover:bg-blue-800/30' : 'bg-blue-100 text-blue-700 hover:bg-blue-200'
                                  )}
                                >
                                  A, B, C
                                </button>
                                <button
                                  type="button"
                                  onClick={() => updateSectionMapping(index, 'sections', ['A', 'B', 'C', 'D'])}
                                  className={combine(
                                    "text-xs px-3 py-1 rounded hover:scale-[1.05] transition-all",
                                    theme === 'dark' ? 'bg-blue-900/30 text-blue-300 hover:bg-blue-800/30' : 'bg-blue-100 text-blue-700 hover:bg-blue-200'
                                  )}
                                >
                                  A, B, C, D
                                </button>
                                <button
                                  type="button"
                                  onClick={() => updateSectionMapping(index, 'sections', Array.from({ length: 10 }, (_, i) => String.fromCharCode(65 + i)))}
                                  className={combine(
                                    "text-xs px-3 py-1 rounded hover:scale-[1.05] transition-all",
                                    theme === 'dark' ? 'bg-blue-900/30 text-blue-300 hover:bg-blue-800/30' : 'bg-blue-100 text-blue-700 hover:bg-blue-200'
                                  )}
                                >
                                  A-J
                                </button>
                              </div>
                              <textarea
                                value={mapping.sections.join('\n')}
                                onChange={(e) => {
                                  const value = e.target.value;
                                  const sectionsArray = value.split(/[\n,]/)
                                    .map((s: string) => s.trim())
                                    .filter((s: string) => s !== '');
                                  updateSectionMapping(index, 'sections', sectionsArray);
                                }}
                                placeholder="Enter one section per line or separate by commas:
A
B
C
D
OR
A, B, C, D"
                                rows={4}
                                className={combine(getInputClass(), "w-full font-mono resize-none")}
                              />
                              {mapping.sections.length > 0 && (
                                <div className="mt-2">
                                  <p className={combine("text-sm mb-1", get('text', 'tertiary'))}>
                                    Preview ({mapping.sections.length} sections):
                                  </p>
                                  <div className={combine("flex flex-wrap gap-1 p-2 rounded-xl", get('bg', 'secondary'))}>
                                    {mapping.sections.map((section, secIndex) => (
                                      <span
                                        key={secIndex}
                                        className={combine(
                                          "px-3 py-1 text-sm font-medium rounded-full flex items-center gap-1",
                                          theme === 'dark' ? 'bg-green-900/30 text-green-300' : 'bg-green-100 text-green-800'
                                        )}
                                      >
                                        {section}
                                        <button
                                          type="button"
                                          onClick={() => {
                                            const newSections = [...mapping.sections];
                                            newSections.splice(secIndex, 1);
                                            updateSectionMapping(index, 'sections', newSections);
                                          }}
                                          className={combine(
                                            "ml-1",
                                            theme === 'dark' ? 'text-green-400 hover:text-green-300' : 'text-green-600 hover:text-green-800'
                                          )}
                                        >
                                          <X className="h-3 w-3" />
                                        </button>
                                      </span>
                                    ))}
                                  </div>
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}

                    <div className="flex flex-wrap gap-3 pt-4">
                      <button
                        onClick={addSectionMapping}
                        className={combine(getSecondaryButtonClass(), "flex items-center gap-2 hover:scale-[1.02] active:scale-[0.98]")}
                      >
                        <Plus className="h-4 w-4" />
                        Add Another Mapping
                      </button>
                      <button
                        onClick={handleBulkAssignSections}
                        disabled={submitting.bulkSections}
                        className={combine(
                          "px-6 py-2 rounded-xl transition-all duration-200 font-medium flex items-center gap-2",
                          theme === 'dark'
                            ? 'bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800 text-white'
                            : 'bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white',
                          "hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed"
                        )}
                      >
                        <Check className="h-4 w-4" />
                        {submitting.bulkSections ? 'Assigning...' : 'Assign All Sections'}
                      </button>
                    </div>
                  </div>

                  <div className={combine(
                    "mt-4 p-3 rounded-xl text-sm",
                    theme === 'dark' ? 'bg-green-900/20 text-green-300' : 'bg-green-100 text-green-800'
                  )}>
                    <p>
                      💡 Tip: Enter multiple sections per class separated by commas. Example: "A, B, C, D" for Class 10.
                      <br />
                      Existing sections will be skipped automatically.
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

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
