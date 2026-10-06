// src/components/dashboard/MainContent.tsx
'use client';

import { ReactNode, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  Users,
  GraduationCap,
  UserCheck,
  Clock,
  TrendingUp,
  AlertCircle,
  Briefcase,
  TrendingDown,
  Minimize2,
  Activity,
  Calendar1,
  Sparkles,
  School,
  BarChart3,
  ArrowBigRight,
  Package,
  Building2,
  ShieldCheck,
  RefreshCw,
  History,
} from 'lucide-react';

import { FeeOverviewChart } from '@/components/dashboard/FeeOverviewChart';

// Add this import at the top of MainContent.tsx
import { AttendanceChart } from './AttendanceChart';

import { Announcements } from './Announcements';

import { CalendarWidget } from './CalendarWidget';

import { ExamsOverview } from './ExamOverview';

import { FaMale, FaFemale, FaBullhorn, FaExpand } from 'react-icons/fa';

import { RecentActivities } from './RecentActivities';

import { GenderDistribution } from './GenderDistributionChart';
import { InventoryUpdatesToday } from './InventoryUpdatesToday';
import { StaffWorkUpdatesToday } from './StaffWorkUpdatesToday';

import { adminApi } from '@/lib/api';

import axios from 'axios';

// Import theme hooks
import { useTheme } from '@/contexts/ThemeContext';
import { useThemeClasses } from '@/hooks/useThemeClasses';
import { InventoryChart } from './InventoryChart';
import CsvUploadFloating from './CsvUploadFloating';

// Define types based on API response
interface DashboardStats {
  meta: {
    date: string;
    academic_year: string;
    generated_at: string;
    role_scope?: 'institution' | 'school';
    school_id?: number | null;
    school_name?: string;
    school_logo?: string | null;
    institution_name?: string;
    institution_logo?: string | null;
    schools?: {
      total: number;
      active: number;
    };
    school_breakdown?: Array<{
      id: number;
      name: string;
      code?: string | null;
      logo?: string | null;
      institution_name?: string | null;
      students: number;
      teachers: number;
      staff: number;
      is_active: boolean;
    }>;
    time_periods: {
      daily: string;
      weekly: string;
      monthly: string;
    };
  };
  students: {
    total: number;
    gender_distribution: {
      male: number;
      female: number;
      other: number;
      male_percentage: number;
      female_percentage: number;
    };
    today: {
      present: number;
      absent: number;
      late: number;
      total_marked: number;
      unmarked: number;
      attendance_percentage: number;
    };
    overall: {
      attendance_percentage: number;
      present_this_month: number;
      absent_this_month: number;
      late_this_month: number;
      monthly_summary: {
        present_percentage: number;
        absent_percentage: number;
        late_percentage: number;
      };
    };
  };
  teachers: {
    total: number;
    today: {
      present: number;
      late: number;
      absent: number;
      attendance_percentage: number;
    };
  };
  staff: {
    total: number;
    today: {
      present: number;
      late: number;
      absent: number;
      attendance_percentage: number;
    };
  };
  academics: {
    total_classes: number;
    total_sections: number;
    class_details: Array<{
      class_name: string;
      student_count: number;
      section_count: number;
    }>;
    system_defined: {
      total_classes: number;
      total_sections: number;
    };
    inactive: {
      classes: number;
      sections: number;
    };
  };
}

// New interface for the dashboard overview API
interface DashboardOverview {
  role_scope?: 'institution' | 'school';
  school_name: string;
  school_id?: number | null;
  school_logo?: string | null;
  institution_name?: string;
  institution_logo?: string | null;
  total_schools?: number;
  active_schools?: number;
  active_academic_year: string;
  total_students: number;
  total_teachers?: number;
  total_staff?: number;
  trend: string; // 'increase' or 'decrease'
  percentage_change: string;
  comparison_text: string;
  previous_year_total?: number; // Add this for comparison
}

interface DashboardSchoolOption {
  id: number;
  name: string;
  code?: string | null;
  logo?: string | null;
  institution_name?: string | null;
  student_count?: number;
  teacher_count?: number;
  staff_count?: number;
}

const StatCard = ({
  title,
  value,
  icon: Icon,
  color = 'blue',
  subtitle = '',
  trend = null,
  trendType = 'neutral',
  compact = false,
  trendPosition = 'inline'
}: {
  title: string;
  value: ReactNode;
  icon: any;
  color?: string;
  subtitle?: ReactNode;
  trend?: number | string | null;
  trendType?: 'increase' | 'decrease' | 'neutral';
  compact?: boolean;
  trendPosition?: 'inline' | 'right';
}) => {
  const { theme } = useTheme();
  const { get } = useThemeClasses();

  const colors: any = {
    blue: theme === 'dark'
      ? 'bg-gradient-to-br from-gray-800 to-blue-900/15 text-blue-300 border-blue-900/30'
      : 'bg-gradient-to-br from-white to-blue-50 text-blue-700 border-blue-100',
    green: theme === 'dark'
      ? 'bg-gradient-to-br from-gray-800 to-emerald-900/15 text-emerald-300 border-emerald-900/30'
      : 'bg-gradient-to-br from-white to-emerald-50 text-emerald-700 border-emerald-100',
    orange: theme === 'dark'
      ? 'bg-gradient-to-br from-gray-800 to-amber-900/15 text-amber-300 border-amber-900/30'
      : 'bg-gradient-to-br from-white to-amber-50 text-amber-700 border-amber-100',
    purple: theme === 'dark'
      ? 'bg-gradient-to-br from-gray-800 to-purple-900/15 text-purple-300 border-purple-900/30'
      : 'bg-gradient-to-br from-white to-purple-50 text-purple-700 border-purple-100',
    red: theme === 'dark'
      ? 'bg-gradient-to-br from-gray-800 to-red-900/15 text-red-300 border-red-900/30'
      : 'bg-gradient-to-br from-white to-red-50 text-red-700 border-red-100',
    indigo: theme === 'dark'
      ? 'bg-gradient-to-br from-gray-800 to-indigo-900/15 text-indigo-300 border-indigo-900/30'
      : 'bg-gradient-to-br from-white to-indigo-50 text-indigo-700 border-indigo-100',
  };

  const getTrendIcon = () => {
    if (trendType === 'increase') {
      return <TrendingUp size={14} className="mr-1" />;
    } else if (trendType === 'decrease') {
      return <TrendingDown size={14} className="mr-1" />;
    }
    return null;
  };

  const getTrendColor = () => {
    if (trendType === 'increase') return 'text-green-600 dark:text-green-400';
    if (trendType === 'decrease') return 'text-red-600 dark:text-red-400';
    return 'text-gray-600 dark:text-gray-400';
  };

  return (
    <div className={`${colors[color]} rounded-xl border p-4 transition-all duration-200 hover:shadow-lg hover:-translate-y-0.5 h-full min-h-[132px] sm:min-h-[144px] lg:min-h-[152px] flex flex-col justify-between`}>
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-2 mb-2.5">
            <p className="font-semibold opacity-80 text-[11px] sm:text-xs lg:text-sm leading-tight break-words uppercase tracking-wide">{title}</p>
          </div>
          <p className={`font-bold text-xl sm:text-2xl mb-1 leading-tight ${get('text', 'primary')}`}>{value}</p>
          {subtitle && trend !== null && trendPosition !== 'right' ? (
            <div className="mt-2 flex items-center justify-between gap-2">
              <p className={`opacity-75 text-[11px] sm:text-xs lg:text-sm leading-tight break-words ${get('text', 'secondary')}`}>
                {subtitle}
              </p>
              <div className={`shrink-0 flex items-center text-[11px] sm:text-xs lg:text-sm ${getTrendColor()}`}>
                {getTrendIcon()}
                {trend}
              </div>
            </div>
          ) : subtitle ? (
            <p className={`opacity-75 text-[11px] sm:text-xs lg:text-sm leading-tight break-words ${get('text', 'secondary')}`}>
              {subtitle}
            </p>
          ) : null}

          {trend !== null && trendPosition === 'right' && (
            <div className={`mt-2 flex items-center text-[11px] sm:text-xs font-semibold ${getTrendColor()}`}>
              {getTrendIcon()}
              {trend}
            </div>
          )}
        </div>
        <div className="ml-1 sm:ml-2 flex flex-col items-center gap-2 shrink-0">
          <div className={`rounded-lg p-2.5 ${theme === 'dark' ? 'bg-gray-900/60 border border-gray-700/70' : 'bg-white border border-gray-100'} shadow-sm`}>
            <Icon className="w-5 h-5 lg:w-6 lg:h-6" />
          </div>
        </div>
      </div>
      {trend !== null && !subtitle && trendPosition !== 'right' && (
        <div className={`flex items-center mt-3 text-sm ${getTrendColor()}`}>
          {getTrendIcon()}
          {trend}
        </div>
      )}
    </div>
  );
};

const DonutChart = ({ male, female, total }: { male: number; female: number; total: number }) => {
  const { theme } = useTheme();
  const { get } = useThemeClasses();

  const malePercentage = total > 0 ? (male / total) * 100 : 0;
  const femalePercentage = total > 0 ? (female / total) * 100 : 0;

  // Create the SVG donut chart
  const radius = 40;
  const circumference = 2 * Math.PI * radius;
  const maleStroke = (malePercentage / 100) * circumference;
  const femaleStroke = (femalePercentage / 100) * circumference;

  return (
    <div className="relative flex flex-col items-center">
      <div className="relative">
        <svg width="180" height="180" viewBox="0 0 100 100" className="transform -rotate-90">
          {/* Female segment */}
          <circle
            cx="50"
            cy="50"
            r={radius}
            fill="none"
            stroke="#ec4899"
            strokeWidth="12"
            strokeDasharray={`${femaleStroke} ${circumference}`}
            strokeLinecap="round"
          />
          {/* Male segment */}
          <circle
            cx="50"
            cy="50"
            r={radius}
            fill="none"
            stroke="#3b82f6"
            strokeWidth="12"
            strokeDasharray={`${maleStroke} ${circumference}`}
            strokeDashoffset={-femaleStroke}
            strokeLinecap="round"
          />
        </svg>

        {/* Center text */}
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className={`text-2xl font-bold ${get('text', 'primary')}`}>{total}</span>
          <span className={`text-xs ${get('text', 'secondary')}`}>Students</span>
        </div>
      </div>

      {/* Legend */}
      <div className="flex gap-4 mt-4">
        <div className="flex items-center">
          <div className="w-3 h-3 rounded-full bg-blue-500 mr-2"></div>
          <span className={`text-sm ${get('text', 'secondary')}`}>
            <FaMale size={12} className="inline mr-1" />
            {male} ({malePercentage.toFixed(1)}%)
          </span>
        </div>
        <div className="flex items-center">
          <div className="w-3 h-3 rounded-full bg-pink-500 mr-2"></div>
          <span className={`text-sm ${get('text', 'secondary')}`}>
            <FaFemale size={12} className="inline mr-1" />
            {female} ({femalePercentage.toFixed(1)}%)
          </span>
        </div>
      </div>
    </div>
  );
};



// Full Screen Modal Component
const FullScreenChartModal = ({
  isOpen,
  onClose,
  children,
  title = 'Attendance Overview - Full Screen',
  subtitle = 'Interactive chart with detailed analytics',
  footerContent,
  modalSizeClass = 'w-[95%] h-[95%]',
  hideFooter = false,
}: {
  isOpen: boolean;
  onClose: () => void;
  children: React.ReactNode;
  title?: string;
  subtitle?: string;
  footerContent?: React.ReactNode;
  modalSizeClass?: string;
  hideFooter?: boolean;
}) => {
  const { theme } = useTheme();
  const { get } = useThemeClasses();

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener('keydown', handleKeyDown);
      document.body.style.overflow = 'hidden';
    }

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = 'unset';
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/70 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal Content */}
      <div className={`relative z-10 ${modalSizeClass} ${theme === 'dark' ? 'bg-gray-900' : 'bg-white'} flex flex-col rounded-xl shadow-2xl`}>
        {/* Modal Header */}
        <div className={`flex items-center justify-between p-6 border-b ${theme === 'dark' ? 'border-gray-700' : 'border-gray-200'}`}>
          <div>
            <h2 className={`text-2xl font-bold ${get('text', 'primary')}`}>
              {title}
            </h2>
            <p className={`text-sm ${get('text', 'secondary')}`}>
              {subtitle}
            </p>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={onClose}
              className={`flex items-center gap-2 px-4 py-2 ${theme === 'dark' ? 'bg-gray-800 hover:bg-gray-700' : 'bg-gray-100 hover:bg-gray-200'} rounded-lg transition-colors ${get('text', 'primary')}`}
            >
              <Minimize2 size={20} />
              <span>Exit Full Screen</span>
            </button>
            
          </div>
        </div>

        {/* Modal Body - Full screen chart */}
        <div className="flex-1 overflow-auto p-6">
          {children}
        </div>

        {!hideFooter && (
          <div className={`p-4 border-t ${theme === 'dark' ? 'border-gray-700 bg-gray-800/50' : 'border-gray-200 bg-gray-50'}`}>
            {footerContent ? (
              footerContent
            ) : (
              <div className={`flex items-center justify-between text-sm ${get('text', 'secondary')}`}>
                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full bg-green-500"></div>
                    <span>Present</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full bg-red-500"></div>
                    <span>Absent</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full bg-yellow-500"></div>
                    <span>Late</span>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs">Press</span>
                  <kbd className={`px-2 py-1 ${theme === 'dark' ? 'bg-gray-700' : 'bg-gray-200'} rounded text-xs`}>ESC</kbd>
                  <span className="text-xs">to exit</span>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export const MainContent = () => {
  const router = useRouter();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [overview, setOverview] = useState<DashboardOverview | null>(null);
  const [schoolOptions, setSchoolOptions] = useState<DashboardSchoolOption[]>([]);
  const [selectedSchoolId, setSelectedSchoolId] = useState<string>('all');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isAttendanceChartFullScreen, setIsAttendanceChartFullScreen] = useState(false);
  const [isInventoryChartFullScreen, setIsInventoryChartFullScreen] = useState(false);
  const [isGenderFullScreen, setIsGenderFullScreen] = useState(false);
  const [isActivitiesFullScreen, setIsActivitiesFullScreen] = useState(false);
  const [isInventoryFullScreen, setIsInventoryFullScreen] = useState(false);
  const [isStaffWorkFullScreen, setIsStaffWorkFullScreen] = useState(false);
  const [isAnnouncementsFullScreen, setIsAnnouncementsFullScreen] = useState(false);
  const [isCalendarFullScreen, setIsCalendarFullScreen] = useState(false);
  const [isLargeScreen, setIsLargeScreen] = useState(false);

  const [isQuickActionsOpen, setIsQuickActionsOpen] = useState(false);

  const [fullScreenChart, setFullScreenChart] = useState(false);

  // Theme hooks
  const { theme } = useTheme();
  const { get, combine } = useThemeClasses();
  const quickActions: Array<{ label: string; href: string; query?: string }> = [
    {
      label: 'Add Student',
      href: '/admin/students/allstudents',
      query: 'mode=add'  // Add this query parameter
    },
    {
      label: 'View Attendance',
      href: '/admin/students/attendance',
    },
    {
      label: 'View Performance',
      href: '/admin/students/grades',
    },
    {
      label: 'Leave Requests',
      href: '/admin/operations/leave',
    },
    {
      label: 'New Announcement',
      href: '/admin/communications/announcements',
    },
    {
      label: 'Assign Staff Work',
      href: '/admin/staff/work',
    },
  ];

  useEffect(() => {
    const handleViewport = () => {
      setIsLargeScreen(window.innerWidth >= 1024);
    };

    handleViewport();
    window.addEventListener('resize', handleViewport);
    return () => window.removeEventListener('resize', handleViewport);
  }, []);

  useEffect(() => {
    if (!isLargeScreen && isAttendanceChartFullScreen) {
      setIsAttendanceChartFullScreen(false);
    }
  }, [isLargeScreen, isAttendanceChartFullScreen]);

  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        setLoading(true);
        const params = selectedSchoolId !== 'all' && selectedSchoolId !== '__refresh__'
          ? { school_id: Number(selectedSchoolId) }
          : undefined;

        const [statsResponse, overviewResponse, schoolsResponse] = await Promise.all([
          adminApi.dashboardStats.get(params),
          adminApi.dashboard.get(params),
          adminApi.school.schools.list(),
        ]);

        const statsData = statsResponse.data;
        const overviewData = overviewResponse.data;
        setSchoolOptions(schoolsResponse.data || schoolsResponse.data?.data || []);

        // ----- Trend Processing -----
        let percentValue = 0;
        let trend = overviewData.trend;

        if (overviewData.percentage_change) {
          const cleanValue = overviewData.percentage_change
            .toString()
            .replace('%', '')
            .trim();

          percentValue = parseFloat(cleanValue);

          if (!trend && overviewData.percentage_change.includes('+')) {
            trend = 'increase';
          } else if (!trend && overviewData.percentage_change.includes('-')) {
            trend = 'decrease';
          } else if (!trend) {
            trend = 'neutral';
          }
        }

        let previousYearTotal;

        if (overviewData.previous_year_total) {
          previousYearTotal = overviewData.previous_year_total;
        } else {
          if (trend === 'increase') {
            previousYearTotal = Math.round(
              overviewData.total_students / (1 + percentValue / 100)
            );
          } else if (trend === 'decrease') {
            previousYearTotal = Math.round(
              overviewData.total_students / (1 - percentValue / 100)
            );
          } else {
            previousYearTotal = Math.round(
              overviewData.total_students * 0.95
            );
          }
        }

        overviewData.previous_year_total = previousYearTotal;
        overviewData.trend = trend;

        if (
          trend === 'increase' &&
          !overviewData.percentage_change?.startsWith('+')
        ) {
          overviewData.percentage_change = `+${overviewData.percentage_change}`;
        }

        setStats(statsData);
        setOverview(overviewData);
        setError(null);
      } catch (err) {
        console.error('Dashboard fetch error:', err);

        if (axios.isAxiosError(err)) {
          setError(err.response?.data?.detail || 'Failed to load dashboard');
        } else {
          setError('Failed to load dashboard');
        }
      } finally {
        setLoading(false);
      }
    };

    fetchDashboardData();
  }, [selectedSchoolId]);

  // Theme-aware CSS classes using the theme system
  const getBgClass = () => combine(
    'bg-gradient-to-br transition-colors duration-300',
    theme === 'dark'
      ? 'from-[var(--color-bg-primary)] via-[var(--color-bg-secondary)] to-[var(--color-bg-primary)]'
      : 'from-[var(--color-bg-primary)] via-[var(--color-bg-secondary)] to-[var(--color-bg-tertiary)]'
  );

  const getCardGradientClass = (color: string = 'blue') => {
    const baseClasses = combine(
      'rounded-xl sm:rounded-2xl p-3 sm:p-4 lg:p-6 border shadow-lg transition-all duration-300 group hover:shadow-xl',
      get('border', 'primary')
    );

    if (color === 'blue') {
      return combine(baseClasses, 'bg-gradient-to-br', theme === 'dark'
        ? 'from-gray-800 to-blue-900/10'
        : 'from-white to-blue-50');
    }
    if (color === 'green') {
      return combine(baseClasses, 'bg-gradient-to-br', theme === 'dark'
        ? 'from-gray-800 to-green-900/10'
        : 'from-white to-green-50');
    }
    if (color === 'orange') {
      return combine(baseClasses, 'bg-gradient-to-br', theme === 'dark'
        ? 'from-gray-800 to-orange-900/10'
        : 'from-white to-orange-50');
    }
    if (color === 'purple') {
      return combine(baseClasses, 'bg-gradient-to-br', theme === 'dark'
        ? 'from-gray-800 to-purple-900/10'
        : 'from-white to-purple-50');
    }
    if (color === 'indigo') {
      return combine(baseClasses, 'bg-gradient-to-br', theme === 'dark'
        ? 'from-gray-800 to-indigo-900/10'
        : 'from-white to-indigo-50');
    }
    return combine(baseClasses, 'bg-gradient-to-br', get('bg', 'card'));
  };

  const getPrimaryButtonClass = () => combine(
    'px-4 sm:px-6 py-2.5 sm:py-3.5 rounded-lg sm:rounded-xl transition-all duration-200 font-medium',
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

  const getInputClass = () => combine(
    'px-3 sm:px-4 py-2.5 sm:py-3.5 rounded-lg sm:rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all w-full',
    'text-xs sm:text-sm',
    get('bg', 'card'),
    get('border', 'secondary'),
    get('text', 'primary'),
    'placeholder:text-xs sm:placeholder:text-sm placeholder:text-[var(--color-text-tertiary)]',
    'hover:border-[var(--color-border-strong)]',
    'focus:border-[var(--color-accent-primary)]'
  );

  const getStatusBadgeClass = (type: string) => {
    const colorMap: { [key: string]: { bg: string; text: string; border: string } } = {
      blue: {
        bg: theme === 'dark' ? 'from-blue-900/30 to-blue-800/30' : 'from-blue-100 to-blue-200',
        text: theme === 'dark' ? 'text-blue-300' : 'text-blue-700',
        border: theme === 'dark' ? 'border-blue-800' : 'border-blue-200'
      },
      green: {
        bg: theme === 'dark' ? 'from-green-900/30 to-green-800/30' : 'from-green-100 to-green-200',
        text: theme === 'dark' ? 'text-green-300' : 'text-green-700',
        border: theme === 'dark' ? 'border-green-800' : 'border-green-200'
      },
      orange: {
        bg: theme === 'dark' ? 'from-orange-900/30 to-orange-800/30' : 'from-orange-100 to-orange-200',
        text: theme === 'dark' ? 'text-orange-300' : 'text-orange-700',
        border: theme === 'dark' ? 'border-orange-800' : 'border-orange-200'
      },
      purple: {
        bg: theme === 'dark' ? 'from-purple-900/30 to-purple-800/30' : 'from-purple-100 to-purple-200',
        text: theme === 'dark' ? 'text-purple-300' : 'text-purple-700',
        border: theme === 'dark' ? 'border-purple-800' : 'border-purple-200'
      },
      indigo: {
        bg: theme === 'dark' ? 'from-indigo-900/30 to-indigo-800/30' : 'from-indigo-100 to-indigo-200',
        text: theme === 'dark' ? 'text-indigo-300' : 'text-indigo-700',
        border: theme === 'dark' ? 'border-indigo-800' : 'border-indigo-200'
      },
    };

    const colors = colorMap[type] || colorMap.blue;
    return combine(
      'px-2 sm:px-3 py-1 sm:py-1.5 text-xs sm:text-sm font-medium rounded-full bg-gradient-to-r',
      colors.bg,
      colors.text,
      'border',
      colors.border
    );
  };

  if (loading) {
    return (
      <div className={`min-h-full flex items-center justify-center ${getBgClass()}`}>
        <div className="text-center">
          <div className="relative">
            <div className="animate-spin rounded-full h-16 w-16 border-4 border-blue-200 border-t-blue-600 mx-auto"></div>
            <div className="absolute inset-0 flex items-center justify-center">
              <School className="h-8 w-8 text-blue-600 animate-pulse" />
            </div>
          </div>
          <p className={`mt-6 font-medium ${get('text', 'secondary')}`}>Loading your dashboard...</p>
          <p className={`text-sm ${get('text', 'tertiary')} mt-2`}>Preparing your school analytics</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={`min-h-full flex items-center justify-center ${getBgClass()} p-4`}>
        <div className="text-center max-w-md">
          <div className={`${theme === 'dark' ? 'bg-red-900/30' : 'bg-red-100'} rounded-full p-4 w-20 h-20 mx-auto mb-6 flex items-center justify-center`}>
            <AlertCircle className="h-12 w-12 text-red-500" />
          </div>
          <h3 className={`text-2xl font-bold mb-2 ${get('text', 'primary')}`}>Unable to Load Dashboard</h3>
          <p className={`${get('text', 'secondary')} mb-6`}>{error}</p>
          <button
            onClick={() => window.location.reload()}
            className={getPrimaryButtonClass()}
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }



  if (!stats || !overview) return null;

  const totalPresentStudents = stats.students.today.present;
  const totalStudents = stats.students.total;

  const presentAttendancePercentage = totalStudents > 0
    ? Number(((totalPresentStudents / totalStudents) * 100).toFixed(1))
    : 0;
  const totalStudentsAttendance = `${presentAttendancePercentage}%`;

  const isInstitutionDashboard = stats.meta.role_scope === 'institution' || overview.role_scope === 'institution';
  const activeSchoolCount = overview.active_schools ?? stats.meta.schools?.active ?? 0;
  const totalSchoolCount = overview.total_schools ?? stats.meta.schools?.total ?? 0;
  const selectedSchoolOption = schoolOptions.find((school) => String(school.id) === selectedSchoolId);
  const dashboardTitle = 'Dashboard';
  const dashboardSubtitle = isInstitutionDashboard
    ? selectedSchoolId === 'all' ? 'All Schools' : selectedSchoolOption?.name || overview.school_name
    : overview.school_name;
  const identityLogo = (
    isInstitutionDashboard
      ? selectedSchoolId !== 'all' && selectedSchoolId !== '__refresh__'
        ? selectedSchoolOption?.logo || overview.school_logo || stats.meta.school_logo
        : overview.institution_logo || stats.meta.institution_logo
      : overview.school_logo || stats.meta.school_logo
  ) || '/school_logo.jpeg';
  const selectedSchoolName = selectedSchoolId === 'all'
    ? 'All Schools'
    : selectedSchoolOption?.name || overview.school_name;
  const lastUpdatedLabel = stats.meta.generated_at
    ? new Date(stats.meta.generated_at).toLocaleString([], {
        dateStyle: 'medium',
        timeStyle: 'short',
      })
    : 'Just now';
  const refreshDashboard = () => {
    const current = selectedSchoolId;
    setSelectedSchoolId(current === 'all' ? '__refresh__' : 'all');
    window.setTimeout(() => setSelectedSchoolId(current), 0);
  };
  const liveMessages = [
    `${totalPresentStudents}/${totalStudents} students marked present today`,
    `${stats.teachers.today.present} teachers checked in for ${selectedSchoolName}`,
    `${stats.staff.today.present} staff members are active on campus`,
    isInstitutionDashboard
      ? `${activeSchoolCount}/${totalSchoolCount} schools are active and synced`
      : `${selectedSchoolName} dashboard is synced`,
  ];

  return (
   <div className="dashboard-typography">
      <div className={`px-4 sm:px-5 lg:px-8 pt-4 sm:pt-5 lg:pt-8 pb-8 sm:pb-10 ${getBgClass()} transition-colors duration-200`}>
        {/* Attractive Desktop Header - Hidden on Mobile */}
        <div className={combine(
          'mb-5 p-4 sm:p-5 lg:p-6 rounded-xl sm:rounded-2xl border shadow-lg',
          theme === 'dark'
            ? 'bg-gradient-to-r from-gray-900/70 via-gray-800/70 to-indigo-900/30'
            : 'bg-gradient-to-r from-blue-50 via-white to-indigo-50',
          get('border', 'primary')
        )}>
          {/* Top Bar with Greeting and Actions */}
          <div className="flex flex-col xl:flex-row justify-between items-start xl:items-center gap-5">
            <div className="flex min-w-0 w-full items-center gap-4">
              <div className="relative shrink-0">
                <div className="absolute inset-0 bg-gradient-to-r from-blue-600 to-indigo-600 rounded-2xl blur-xl opacity-20"></div>
                <div className="relative flex h-14 w-14 items-center justify-center overflow-hidden rounded-xl border border-white/70 bg-white shadow-lg shadow-blue-600/15 sm:h-16 sm:w-16 lg:h-[72px] lg:w-[72px]">
                  <img
                    src={identityLogo}
                    alt={`${dashboardSubtitle} logo`}
                    className="h-full w-full object-contain p-1"
                    onError={(event) => {
                      event.currentTarget.src = '/school_logo.jpeg';
                    }}
                  />
                </div>
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-2 mb-2">
                  <h1 className={`truncate text-2xl sm:text-3xl lg:text-4xl font-bold bg-gradient-to-r from-gray-900 to-gray-700 dark:from-white dark:to-gray-300 bg-clip-text text-transparent`}>
                    {dashboardTitle}
                  </h1>
                  <Sparkles className="hidden sm:block w-5 h-5 text-yellow-500 animate-pulse" />
                </div>
                <div className="flex flex-wrap items-center gap-2 text-xs sm:text-sm">
                  <div className={`flex min-w-0 items-center gap-2 px-3 py-1.5 ${theme === 'dark' ? 'bg-gray-800/50' : 'bg-white/60'} backdrop-blur-sm rounded-full border ${get('border', 'primary')}`}>
                    {isInstitutionDashboard ? (
                      <Building2 className="w-4 h-4 text-blue-600" />
                    ) : (
                      <School className="w-4 h-4 text-blue-600" />
                    )}
                    <span className={`font-medium ${get('text', 'primary')} max-w-[180px] sm:max-w-none truncate`}>{dashboardSubtitle}</span>
                  </div>
                  <div className={`hidden sm:flex items-center gap-2 px-3 py-1.5 ${theme === 'dark' ? 'bg-gray-800/50' : 'bg-white/50'} backdrop-blur-sm rounded-full border ${get('border', 'primary')}`}>
                    <ShieldCheck className="w-4 h-4 text-emerald-600" />
                    <span className={`font-medium ${get('text', 'primary')}`}>
                      {isInstitutionDashboard ? `${activeSchoolCount}/${totalSchoolCount} active schools` : 'School scoped'}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            <div className='flex w-full flex-col gap-2 sm:flex-row sm:flex-wrap xl:w-auto xl:items-center xl:justify-end'>
              <button
                type="button"
                onClick={refreshDashboard}
                disabled={loading}
                className={`flex h-10 items-center justify-center gap-2 rounded-full border px-4 text-xs font-semibold transition sm:text-sm ${theme === 'dark' ? 'border-gray-700 bg-gray-800/50 text-gray-100 hover:bg-gray-700' : 'border-white/70 bg-white/75 text-slate-700 hover:bg-white'}`}
              >
                <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
                Refresh
              </button>
              <div className={`flex min-h-10 items-center gap-2 rounded-full border px-4 text-xs sm:text-sm ${theme === 'dark' ? 'bg-gray-800/50' : 'bg-white/75'} backdrop-blur-sm ${get('border', 'primary')}`}>
                <Clock className="w-4 h-4 text-green-600" />
                <span className={`font-medium ${get('text', 'primary')}`}>Updated {lastUpdatedLabel}</span>
              </div>
            </div>
          </div>

        </div>

        <div className="mb-6 w-full">
  <div className="w-full space-y-5">
    <div
      className={combine(
        "grid w-full grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3",
        isInstitutionDashboard ? "xl:grid-cols-3" : "xl:grid-cols-3"
      )}
    >
      {isInstitutionDashboard && (
        <div
          className={combine(
            "rounded-xl border p-5 shadow-sm transition hover:shadow-md",
            theme === "dark" ? "bg-gray-900/70" : "bg-white",
            get("border", "primary")
          )}
        >
          <div className="flex min-h-[92px] items-center justify-between gap-3">
            <div>
              <p className={`text-xs font-semibold uppercase ${get("text", "tertiary")}`}>
                Schools
              </p>

              <p className={`mt-1 text-2xl font-bold ${get("text", "primary")}`}>
                {activeSchoolCount}/{totalSchoolCount}
              </p>

              <p className={`mt-1 text-xs ${get("text", "secondary")}`}>
                Active campuses
              </p>
            </div>

            <Building2 className="h-7 w-7 shrink-0 text-blue-700" />
          </div>
        </div>
      )}

      <div
        className={combine(
          "rounded-xl border p-5 shadow-sm transition hover:shadow-md",
          theme === "dark" ? "bg-gray-900/70" : "bg-white",
          get("border", "primary")
        )}
      >
        <div className="flex min-h-[92px] items-center justify-between gap-3">
          <div>
            <p className={`text-xs font-semibold uppercase ${get("text", "tertiary")}`}>
              {isInstitutionDashboard ? "Students" : "School Students"}
            </p>

            <p className={`mt-1 text-2xl font-bold ${get("text", "primary")}`}>
              {overview.total_students}
            </p>

            <p className={`mt-1 text-xs ${get("text", "secondary")}`}>
              {overview.comparison_text}
            </p>
          </div>

          <Users className="h-7 w-7 shrink-0 text-blue-700" />
        </div>
      </div>

      <div
        className={combine(
          "rounded-xl border p-5 shadow-sm transition hover:shadow-md",
          theme === "dark" ? "bg-gray-900/70" : "bg-white",
          get("border", "primary")
        )}
      >
        <div className="flex min-h-[92px] items-center justify-between gap-3">
          <div>
            <p className={`text-xs font-semibold uppercase ${get("text", "tertiary")}`}>
              Academic Year
            </p>

            <p className={`mt-1 text-xl font-bold ${get("text", "primary")}`}>
              {stats?.meta?.academic_year || "N/A"}
            </p>

            <p className={`mt-1 text-xs ${get("text", "secondary")}`}>
              {stats.meta.time_periods.daily}
            </p>
          </div>

          <GraduationCap className="h-7 w-7 shrink-0 text-purple-700" />
        </div>
      </div>
    </div>

    <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
      <div>
        <h2 className={`text-xl font-bold sm:text-2xl ${get("text", "primary")}`}>
          Attendance
        </h2>

        <p className={`mt-1 text-xs sm:text-sm ${get("text", "secondary")}`}>
          Daily presence and academic readiness for {selectedSchoolName}
        </p>
      </div>

      <div className="flex w-full flex-col gap-2 sm:flex-row lg:w-auto lg:items-center lg:justify-end">
        {schoolOptions.length > 1 && (
          <label
            className={`flex min-h-11 w-full items-center gap-2 rounded-xl border px-3 py-2 shadow-sm sm:min-w-[260px] lg:w-[320px] ${
              theme === "dark"
                ? "border-gray-700 bg-gray-900 text-gray-100"
                : "border-slate-200 bg-white text-slate-700"
            }`}
          >
            <School className="h-4 w-4 shrink-0 text-blue-600" />

            <select
              value={selectedSchoolId === "__refresh__" ? "all" : selectedSchoolId}
              onChange={(event) => setSelectedSchoolId(event.target.value)}
              className={`w-full bg-transparent text-sm font-medium outline-none ${get(
                "text",
                "primary"
              )}`}
            >
              <option value="all">All Schools</option>

              {schoolOptions.map((school) => (
                <option key={school.id} value={school.id}>
                  {school.name}
                  {school.code ? ` (${school.code})` : ""}
                </option>
              ))}
            </select>
          </label>
        )}

        <button
          type="button"
          onClick={() => router.push("/admin/students/attendance")}
          className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border shadow-sm transition ${
            theme === "dark"
              ? "border-gray-700 bg-gray-900 text-gray-100 hover:bg-gray-800"
              : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
          }`}
          title="Attendance history"
          aria-label="Attendance history"
        >
          <History className="h-5 w-5" />
        </button>
      </div>
    </div>

    <div className="grid w-full grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
      <StatCard
        title="Students"
        value={totalStudentsAttendance}
        icon={UserCheck}
        color={presentAttendancePercentage >= 80 ? "green" : "orange"}
        subtitle={`${totalPresentStudents}/${totalStudents} present today`}
      />

      <StatCard
        title="Teachers"
        value={stats.teachers.total}
        icon={GraduationCap}
        color="purple"
        subtitle={`${stats.teachers.today.present} present today`}
      />

      <StatCard
        title="Staff"
        value={stats.staff.total}
        icon={Briefcase}
        color="indigo"
        subtitle={`${stats.staff.today.present} present today`}
      />
    </div>
  </div>
</div>

        <div className="block">
          <div className="grid grid-cols-1 2xl:grid-cols-3 gap-4 sm:gap-6">
            {/* Left Column - Donut Chart and Additional Info */}
            <div className="2xl:col-span-1">
              <div className={getCardGradientClass('blue')}>
                <div className='flex items-center justify-between'>
                  <div className="flex items-center gap-3">
                    <div className={`p-1.5 sm:p-2 bg-gradient-to-br ${theme === 'dark' ? 'from-blue-900/30 to-blue-800/30' : 'from-blue-50 to-blue-100'} rounded-lg`}>
                      <Users className={`${theme === 'dark' ? 'text-blue-400' : 'text-blue-600'} w-4 h-4 sm:w-5 sm:h-5`} />
                    </div>
                    <h3 className={`text-base sm:text-lg font-semibold ${get('text', 'primary')}`}>Gender Distribution</h3>
                  </div>

                </div>

                <div className="2xl:col-span-1">
                  <GenderDistribution
                    male={stats.students.gender_distribution.male}
                    female={stats.students.gender_distribution.female}
                    total={stats.students.total}
                    malePercentage={stats.students.gender_distribution.male_percentage}
                    femalePercentage={stats.students.gender_distribution.female_percentage}
                    showLegend={true}
                    showStats={true}
                    variant="default"
                  />
                </div>
              </div>

              <div className="mb-4 sm:mt-6">
                <div className={getCardGradientClass('orange')}>
                  <div className="flex justify-between items-center mb-3 sm:mb-4">
                    <div className="flex items-center gap-3">
                      <div className={`p-1.5 sm:p-2 bg-gradient-to-br ${theme === 'dark' ? 'from-orange-900/30 to-orange-800/30' : 'from-orange-50 to-orange-100'} rounded-lg`}>
                        <Briefcase className={`${theme === 'dark' ? 'text-orange-400' : 'text-orange-600'} w-4 h-4 sm:w-5 sm:h-5`} />
                      </div>
                      <div>
                        <h3 className={`text-sm sm:text-base font-semibold ${get('text', 'primary')}`}>Staff Work Updates</h3>
                        <p className={`text-xs ${get('text', 'tertiary')}`}>Today</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => setIsStaffWorkFullScreen(true)}
                        className={`flex items-center gap-2 px-2.5 sm:px-3 py-1.5 sm:py-2 text-xs sm:text-sm ${theme === 'dark' ? 'bg-gray-700 hover:bg-gray-600' : 'bg-gray-100 hover:bg-gray-200'} rounded-lg transition-colors ${get('text', 'secondary')}`}
                        title="View staff work updates in full screen mode"
                      >
                        <FaExpand className={`w-3.5 h-3.5 sm:w-4 sm:h-4 ${get('icon', 'secondary')}`} />
                      </button>
                    </div>
                  </div>
                  <StaffWorkUpdatesToday
                    isFullScreen={isStaffWorkFullScreen}
                    onCloseFullScreen={() => setIsStaffWorkFullScreen(false)}
                  />
                </div>
              </div>

              <div className={combine(getCardGradientClass('purple'), 'flex min-h-[360px] flex-col p-4 sm:p-5 lg:min-h-[500px]')}>
                <div className="mb-3 flex items-center justify-between gap-3 sm:mb-4">
                  <div className="flex min-w-0 items-center gap-3">
                    <div className={`shrink-0 rounded-lg bg-gradient-to-br p-1.5 sm:p-2 ${theme === 'dark' ? 'from-purple-900/30 to-purple-800/30' : 'from-purple-50 to-purple-100'}`}>
                      <Activity className={`${theme === 'dark' ? 'text-purple-400' : 'text-purple-600'} h-4 w-4 sm:h-5 sm:w-5`} />
                    </div>
                    <div className="min-w-0">
                      <h3 className={`truncate text-sm font-semibold sm:text-base ${get('text', 'primary')}`}>Recent Activities</h3>
                      <p className={`mt-0.5 text-xs ${get('text', 'tertiary')}`}>Today</p>
                    </div>
                  </div>
                  <button
                    onClick={() => setIsActivitiesFullScreen(true)}
                    className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg transition-colors sm:h-10 sm:w-10 ${theme === 'dark' ? 'bg-gray-700 hover:bg-gray-600' : 'bg-gray-100 hover:bg-gray-200'} ${get('text', 'secondary')}`}
                    title="View activities in full screen mode"
                    aria-label="View activities in full screen mode"
                  >
                    <FaExpand className={`h-3.5 w-3.5 sm:h-4 sm:w-4 ${get('icon', 'secondary')}`} />
                  </button>
                </div>
                <div className="min-h-0 flex-1">
                  <RecentActivities
                    compact
                    isFullScreen={isActivitiesFullScreen}
                    onCloseFullScreen={() => setIsActivitiesFullScreen(false)}
                  />
                </div>
              </div>



            </div>

            {/* Right Column - Charts and Additional Data */}
            <div className="2xl:col-span-2 space-y-4 sm:space-y-6">
              

              {/* Attendance Overview Chart with Full Screen Button */}
              <div className={combine(getCardGradientClass('indigo'), 'w-full min-h-[380px] sm:min-h-[460px] lg:min-h-[500px] xl:min-h-[560px]')}>
                <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-2 sm:gap-3 mb-3 sm:mb-4">
                  <div className="flex items-center gap-2 sm:gap-3 min-w-0">
                    <div className={`p-1.5 sm:p-2 md:p-2.5 bg-gradient-to-br ${theme === 'dark' ? 'from-indigo-900/30 to-indigo-800/30' : 'from-indigo-50 to-indigo-100'} rounded-lg`}>
                      <BarChart3 className={`${theme === 'dark' ? 'text-indigo-400' : 'text-indigo-600'} w-4 h-4 sm:w-5 sm:h-5 md:w-6 md:h-6`} />
                    </div>
                    <div className="min-w-0">
                      <h3 className={`text-sm sm:text-base xl:text-lg font-semibold truncate ${get('text', 'primary')}`}>Attendance Overview</h3>
                      <p className={`text-[11px] sm:text-xs ${get('text', 'tertiary')}`}>Class-wise attendance trend</p>
                    </div>
                  </div>
                  <div className="hidden lg:flex items-center gap-2 self-end sm:self-auto">
                    <button
                      onClick={() => setIsAttendanceChartFullScreen(true)}
                      className={`flex items-center gap-1.5 sm:gap-2 px-2.5 sm:px-3 md:px-3.5 py-1.5 sm:py-2 text-[11px] sm:text-xs md:text-sm ${theme === 'dark' ? 'bg-gray-700 hover:bg-gray-600' : 'bg-gray-100 hover:bg-gray-200'} rounded-lg transition-colors ${get('text', 'secondary')}`}
                      title="View chart in full screen mode"
                    >
                      <FaExpand className={`w-3.5 h-3.5 sm:w-4 sm:h-4 md:w-[17px] md:h-[17px] ${get('icon', 'secondary')}`} />
                      <span className="hidden sm:inline">Expand</span>
                    </button>
                  </div>
                </div>
                <div className="w-full min-h-[300px] sm:min-h-[380px] lg:min-h-[420px] xl:min-h-[470px]">
                  <AttendanceChart initialPeriod="this_week" initialClassName="all" />
                </div>
              </div>

              <div className='grid grid-cols-1 2xl:grid-cols-2 gap-4 sm:gap-6'>
                <div className={getCardGradientClass('purple')}>
                  <div className="flex justify-between items-center mb-3 sm:mb-4">
                    <div className="flex items-center gap-3">
                      <div className={`p-1.5 sm:p-2 bg-gradient-to-br ${theme === 'dark' ? 'from-purple-900/30 to-purple-800/30' : 'from-purple-50 to-purple-100'} rounded-lg`}>
                        <FaBullhorn className={`${theme === 'dark' ? 'text-purple-400' : 'text-purple-600'} w-4 h-4 sm:w-5 sm:h-5`} />
                      </div>
                      <div>
                        <h3 className={`text-sm sm:text-base font-semibold ${get('text', 'primary')}`}>Announcements</h3>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => setIsAnnouncementsFullScreen(true)}
                        className={`flex items-center gap-2 px-2.5 sm:px-3 py-1.5 sm:py-2 text-xs sm:text-sm ${theme === 'dark' ? 'bg-gray-700 hover:bg-gray-600' : 'bg-gray-100 hover:bg-gray-200'} rounded-lg transition-colors ${get('text', 'secondary')}`}
                        title="View announcements in full screen mode"
                      >
                        <FaExpand className={`w-3.5 h-3.5 sm:w-4 sm:h-4 ${get('icon', 'secondary')}`} />
                      </button>
                    </div>
                  </div>
                  <Announcements
                    isFullScreen={isAnnouncementsFullScreen}
                    onCloseFullScreen={() => setIsAnnouncementsFullScreen(false)}
                  />
                </div>

                <div className={getCardGradientClass('indigo')}>
                  <div className="flex justify-between items-center mb-3 sm:mb-4">
                    <div className="flex items-center gap-3">
                      <div className={`p-1.5 sm:p-2 bg-gradient-to-br ${theme === 'dark' ? 'from-indigo-900/30 to-indigo-800/30' : 'from-indigo-50 to-indigo-100'} rounded-lg`}>
                        <Calendar1 className={`${theme === 'dark' ? 'text-indigo-400' : 'text-indigo-600'} w-4 h-4 sm:w-5 sm:h-5`} />
                      </div>
                      <div>
                        <h3 className={`text-sm sm:text-base font-semibold ${get('text', 'primary')}`}>School Calendar</h3>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => setIsCalendarFullScreen(true)}
                        className={`flex items-center gap-2 px-2.5 sm:px-3 py-1.5 sm:py-2 text-xs sm:text-sm ${theme === 'dark' ? 'bg-gray-700 hover:bg-gray-600' : 'bg-gray-100 hover:bg-gray-200'} rounded-lg transition-colors ${get('text', 'secondary')}`}
                        title="View calendar in full screen mode"
                      >
                        <FaExpand className={`w-3.5 h-3.5 sm:w-4 sm:h-4 ${get('icon', 'secondary')}`} />
                      </button>
                    </div>
                  </div>
                  <CalendarWidget
                    isFullScreen={isCalendarFullScreen}
                    onCloseFullScreen={() => setIsCalendarFullScreen(false)}
                  />
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="mt-4 sm:mt-6 grid grid-cols-1 2xl:grid-cols-6 gap-4 sm:gap-6">
          {/* Left Column - Inventory Updates (takes 3 columns) */}
          <div className="2xl:col-span-2">
            <div className={getCardGradientClass('green')}>
              <div className="flex justify-between items-center mb-3 sm:mb-4">
                <div className="flex items-center gap-3">
                  <div className={`p-1.5 sm:p-2 bg-gradient-to-br ${theme === 'dark' ? 'from-green-900/30 to-green-800/30' : 'from-green-50 to-green-100'} rounded-lg`}>
                    <Package className={`${theme === 'dark' ? 'text-green-400' : 'text-green-600'} w-4 h-4 sm:w-5 sm:h-5`} />
                  </div>
                  <div>
                    <h3 className={`text-sm sm:text-base font-semibold ${get('text', 'primary')}`}>Inventory Updates</h3>
                    <p className={`text-xs ${get('text', 'tertiary')}`}>Recent activity log</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setIsInventoryFullScreen(true)}
                    className={`flex items-center gap-2 px-2.5 sm:px-3 py-1.5 sm:py-2 text-xs sm:text-sm ${theme === 'dark' ? 'bg-gray-700 hover:bg-gray-600' : 'bg-gray-100 hover:bg-gray-200'} rounded-lg transition-colors ${get('text', 'secondary')}`}
                    title="View inventory updates in full screen mode"
                  >
                    <FaExpand className={`w-3.5 h-3.5 sm:w-4 sm:h-4 ${get('icon', 'secondary')}`} />
                  </button>
                </div>
              </div>
              <InventoryUpdatesToday
                isFullScreen={isInventoryFullScreen}
                onCloseFullScreen={() => setIsInventoryFullScreen(false)}
              />
            </div>
          </div>

          {/* Right Column - Inventory Chart (takes 3 columns) */}
          <div className="2xl:col-span-4">
            <div className={getCardGradientClass('green')}>
              <div className="flex justify-between items-center mb-3 sm:mb-4">
                <div className="flex items-center gap-3">
                  <div className={`p-1.5 sm:p-2 bg-gradient-to-br ${theme === 'dark' ? 'from-green-900/30 to-green-800/30' : 'from-green-50 to-green-100'} rounded-lg`}>
                    <BarChart3 className={`${theme === 'dark' ? 'text-green-400' : 'text-green-600'} w-4 h-4 sm:w-5 sm:h-5`} />
                  </div>
                  <div>
                    <h3 className={`text-sm sm:text-base font-semibold ${get('text', 'primary')}`}>Inventory Chart</h3>
                    <p className={`text-xs ${get('text', 'tertiary')}`}>Stock levels over time</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setIsInventoryChartFullScreen(true)}
                    className={`flex items-center gap-2 px-2.5 sm:px-3 py-1.5 sm:py-2 text-xs sm:text-sm ${theme === 'dark' ? 'bg-gray-700 hover:bg-gray-600' : 'bg-gray-100 hover:bg-gray-200'} rounded-lg transition-colors ${get('text', 'secondary')}`}
                    title="View inventory chart in full screen mode"
                  >
                    <FaExpand className={`w-3.5 h-3.5 sm:w-4 sm:h-4 ${get('icon', 'secondary')}`} />
                  </button>
                </div>
              </div>
              <InventoryChart
                isFullScreen={isInventoryChartFullScreen}
                onCloseFullScreen={() => setIsInventoryChartFullScreen(false)}
              />
            </div>
          </div>
        </div>

        <div className="mt-4 sm:mt-6">
          <div className={combine(getCardGradientClass('green'), 'w-full min-h-[460px] sm:min-h-[560px] lg:min-h-[640px] xl:min-h-[700px] flex flex-col')}>
            <div className="flex justify-between items-center gap-2 sm:gap-3 mb-3 sm:mb-4">
              <div className="flex items-center gap-2 sm:gap-3 min-w-0">
                <div className={`p-1.5 sm:p-2 md:p-2.5 bg-gradient-to-br ${theme === 'dark' ? 'from-green-900/30 to-green-800/30' : 'from-green-50 to-green-100'} rounded-lg`}>
                  <BarChart3 className={`${theme === 'dark' ? 'text-green-400' : 'text-green-600'} w-4 h-4 sm:w-5 sm:h-5 md:w-6 md:h-6`} />
                </div>
                <div className="min-w-0">
                  <h3 className={`text-sm sm:text-base xl:text-lg font-semibold truncate ${get('text', 'primary')}`}>Fee Overview</h3>
                  <p className={`text-[11px] sm:text-xs ${get('text', 'tertiary')}`}>Track collections, pending fees and payment trends</p>
                </div>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <button
                  onClick={() => setFullScreenChart(true)}
                  className={`flex items-center gap-2 px-2.5 sm:px-3 py-1.5 sm:py-2 text-xs sm:text-sm ${theme === 'dark' ? 'bg-gray-700 hover:bg-gray-600' : 'bg-gray-100 hover:bg-gray-200'} rounded-lg transition-colors ${get('text', 'secondary')}`}
                  title="View fee overview in full screen mode"
                >
                  <FaExpand className={`w-3.5 h-3.5 sm:w-4 sm:h-4 ${get('icon', 'secondary')}`} />
                </button>
              </div>
            </div>
            <div className="w-full flex-1 min-h-[360px] sm:min-h-[440px] lg:min-h-[520px]">
              <FeeOverviewChart
                isFullScreen={fullScreenChart}
                onCloseFullScreen={() => setFullScreenChart(false)}
              />
            </div>
          </div>
        </div>



        <div className="block mt-4 sm:mt-6">
          <div className={getCardGradientClass('blue')}>
            <ExamsOverview />
          </div>
        </div>

      </div>

      {/* Full Screen Modal for Attendance Chart */}
      <FullScreenChartModal
        isOpen={isAttendanceChartFullScreen && isLargeScreen}
        onClose={() => setIsAttendanceChartFullScreen(false)}
        modalSizeClass="w-[80vw] h-[80vh]"
        hideFooter
      >
        <AttendanceChart initialPeriod="this_week" initialClassName="all" showSummaryToggle={false} />
      </FullScreenChartModal>

      {/* Full Screen Modal for Gender Distribution */}
      <FullScreenChartModal
        isOpen={isGenderFullScreen}
        onClose={() => setIsGenderFullScreen(false)}
        title="Gender Distribution - Full Screen"
        subtitle="Detailed student gender overview and breakdown"
        footerContent={
          <div className={`flex items-center justify-between text-sm ${get('text', 'secondary')}`}>
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-blue-500"></div>
                <span>Male</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-pink-500"></div>
                <span>Female</span>
              </div>
              {stats.students.gender_distribution.other > 0 && (
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-purple-500"></div>
                  <span>Other</span>
                </div>
              )}
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs">Press</span>
              <kbd className={`px-2 py-1 ${theme === 'dark' ? 'bg-gray-700' : 'bg-gray-200'} rounded text-xs`}>ESC</kbd>
              <span className="text-xs">to exit</span>
            </div>
          </div>
        }
      >
        <div className="max-w-5xl mx-auto">
          <div className={combine(getCardGradientClass('blue'), 'my-0')}>
            <div className="flex items-center justify-between mb-4">
              <h3 className={`text-xl font-semibold ${get('text', 'primary')}`}>
                Gender Distribution Overview
              </h3>
              <span className={getStatusBadgeClass('blue')}>
                Total: {stats.students.total}
              </span>
            </div>
            <GenderDistribution
              male={stats.students.gender_distribution.male}
              female={stats.students.gender_distribution.female}
              other={stats.students.gender_distribution.other}
              total={stats.students.total}
              malePercentage={stats.students.gender_distribution.male_percentage}
              femalePercentage={stats.students.gender_distribution.female_percentage}
              otherPercentage={100 - stats.students.gender_distribution.male_percentage - stats.students.gender_distribution.female_percentage}
              showLegend={true}
              showStats={true}
              variant="detailed"
              size="lg"
            />
          </div>
        </div>
      </FullScreenChartModal>
      <style jsx>{`
        .dashboard-slide-message {
          animation-name: dashboard-slide-message;
          animation-timing-function: linear;
          animation-iteration-count: infinite;
          opacity: 0;
          left: 50%;
          transform: translate(-50%, -120%);
          will-change: transform, opacity;
        }

        @keyframes dashboard-slide-message {
          0% {
            opacity: 0;
            transform: translate(-50%, -120%);
          }
          10% {
            opacity: 1;
          }
          78% {
            opacity: 1;
          }
          100% {
            opacity: 0;
            transform: translate(-50%, 285px);
          }
        }
      `}</style>
      <CsvUploadFloating />
    </div>
  );
};
