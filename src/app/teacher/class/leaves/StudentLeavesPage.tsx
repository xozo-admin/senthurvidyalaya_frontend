'use client';

import React, { useEffect, useMemo, useState } from 'react';
import {
  FaChalkboardTeacher,
  FaCheckCircle,
  FaChevronLeft,
  FaChevronRight,
  FaClock,
  FaDownload,
  FaEye,
  FaFilter,
  FaRegCalendarCheck,
  FaSearch,
  FaSortDown,
  FaSortUp,
  FaSpinner,
  FaTimes,
  FaTimesCircle,
  FaUserGraduate,
} from 'react-icons/fa';
import { teacherApi } from '@/lib/api';
import { toastError, toastSuccess } from '@/lib/toast';
import { useTheme } from '@/contexts/ThemeContext';
import { useThemeClasses } from '@/hooks/useThemeClasses';

const API_MEDIA_BASE_URL = process.env.NEXT_PUBLIC_API_MEDIA_BASE_URL || 'https://senthurvidyalaya-backend.onrender.com';

interface TeacherProfile {
  assigned_class?: string | null;
  section_name?: string | null;
}

interface LeaveRequest {
  id: number;
  requester_name: string;
  requester_id: string;
  academic_year_name?: string | null;
  start_date: string;
  end_date: string;
  reason: string;
  proof_file: string | null;
  status: 'Pending' | 'Approved' | 'Rejected';
  admin_comment?: string;
  created_at: string;
}

type StatusFilter = 'Pending' | 'Approved' | 'Rejected' | 'all';

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

const normalizeLeavesPayload = (payload: any): { leaves: LeaveRequest[]; notClassTeacher: boolean } => {
  const data = payload?.data ?? payload;
  const notClassTeacher = typeof payload?.message === 'string' && payload.message.toLowerCase().includes('not a class teacher');
  const leaves = Array.isArray(data) ? (data as LeaveRequest[]) : Array.isArray(data?.data) ? (data.data as LeaveRequest[]) : [];
  return { leaves, notClassTeacher };
};

const calculateDurationDays = (startDate: string, endDate: string) => {
  const start = new Date(startDate);
  const end = new Date(endDate);
  const diffTime = Math.abs(end.getTime() - start.getTime());
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
};

const formatDate = (dateString: string) =>
  new Date(dateString).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });

const getMonthName = (month: number) => new Date(2000, month - 1, 1).toLocaleString('default', { month: 'long' });

type AppliedFilters = {
  status: StatusFilter;
  month: number | null;
};

type PagedResult = {
  items: LeaveRequest[];
  total: number;
  totalPages: number;
};

type SortKey = 'requester_name' | 'start_date' | 'duration' | 'status';

// New API wrapper: uses the existing teacher endpoint but provides pagination + search client-side.
const studentLeavesApi = {
  async fetchAll(filters: { status: StatusFilter; month: number | null }) {
    const params: Record<string, any> = {};
    if (filters.month) params.month = filters.month;
    // Backend defaults to Pending if status is missing, so for "all" we must send empty string.
    if (filters.status === 'all') params.status = '';
    else params.status = filters.status;

    const response = await teacherApi.leaves.studentLeaves(params);
    return response.data;
  },

  pageFromAll(
    allLeaves: LeaveRequest[],
    filters: { status: StatusFilter; search: string },
    sort: { key: SortKey; direction: 'asc' | 'desc' },
    page: number,
    pageSize: number
  ): PagedResult {
    const search = (filters.search || '').trim().toLowerCase();
    const searched = !search
      ? allLeaves
      : allLeaves.filter((l) => (
        l.requester_name?.toLowerCase().includes(search) ||
        l.requester_id?.toLowerCase().includes(search) ||
        (l.reason || '').toLowerCase().includes(search)
      ));

    const statusFiltered = filters.status === 'all'
      ? searched
      : searched.filter((l) => l.status === filters.status);

    const statusOrder = { Pending: 0, Approved: 1, Rejected: 2 } as const;
    const sorted = [...statusFiltered].sort((a, b) => {
      let result = 0;
      if (sort.key === 'requester_name') {
        result = (a.requester_name || '').localeCompare(b.requester_name || '');
      } else if (sort.key === 'start_date') {
        result = new Date(a.start_date).getTime() - new Date(b.start_date).getTime();
      } else if (sort.key === 'duration') {
        result = calculateDurationDays(a.start_date, a.end_date) - calculateDurationDays(b.start_date, b.end_date);
      } else if (sort.key === 'status') {
        result = statusOrder[a.status] - statusOrder[b.status];
      }

      if (result === 0) {
        // Stable-ish tie breaker: latest applied first.
        result = new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
      }

      return sort.direction === 'asc' ? result : -result;
    });

    const total = sorted.length;
    const totalPages = Math.max(1, Math.ceil(total / pageSize));
    const safePage = Math.min(Math.max(page, 1), totalPages);
    const start = (safePage - 1) * pageSize;
    const end = start + pageSize;

    return { items: sorted.slice(start, end), total, totalPages };
  },
};

// New cards API: always fetches all statuses (status='') for accurate counts.
const studentLeavesCardsApi = {
  async getSummary(filters: { month: number | null }) {
    const payload = await studentLeavesApi.fetchAll({ status: 'all', month: filters.month });
    const { leaves, notClassTeacher } = normalizeLeavesPayload(payload);
    if (notClassTeacher) {
      return { notClassTeacher: true, summary: { total: 0, pending: 0, approved: 0, rejected: 0 } };
    }
    return {
      notClassTeacher: false,
      summary: {
        total: leaves.length,
        pending: leaves.filter((l) => l.status === 'Pending').length,
        approved: leaves.filter((l) => l.status === 'Approved').length,
        rejected: leaves.filter((l) => l.status === 'Rejected').length,
      },
    };
  },
};

export default function StudentLeavesPage() {
  const { theme } = useTheme();
  const { get, combine } = useThemeClasses();

  const [profile, setProfile] = useState<TeacherProfile | null>(null);
  const [isClassTeacher, setIsClassTeacher] = useState<boolean | null>(null);

  const [loading, setLoading] = useState(true);
  const [acting, setActing] = useState(false);
  const [error, setError] = useState('');

  const [draftStatus, setDraftStatus] = useState<StatusFilter>('Pending');
  const [draftMonth, setDraftMonth] = useState<number | null>(null);
  const [searchTerm, setSearchTerm] = useState('');

  const [applied, setApplied] = useState<AppliedFilters>({ status: 'Pending', month: null });
  const [allLeaves, setAllLeaves] = useState<LeaveRequest[]>([]);
  const [cardsSummary, setCardsSummary] = useState({ total: 0, pending: 0, approved: 0, rejected: 0 });
  const [cardsLoading, setCardsLoading] = useState(true);

  const [sortConfig, setSortConfig] = useState<{ key: SortKey; direction: 'asc' | 'desc' }>({ key: 'start_date', direction: 'asc' });
  const [page, setPage] = useState(1);
  const pageSize = 10;

  const [detailsLeave, setDetailsLeave] = useState<LeaveRequest | null>(null);
  const [actionLeave, setActionLeave] = useState<LeaveRequest | null>(null);
  const [action, setAction] = useState<'Approved' | 'Rejected'>('Approved');
  const [comment, setComment] = useState('');

  const getBgClass = () => combine(get('bg', 'primary'), 'min-h-screen transition-colors duration-200');

  const getCardGradientClass = (color: 'blue' | 'emerald' | 'amber' | 'red' = 'blue') => {
    const base = combine(
      'rounded-xl sm:rounded-2xl p-4 sm:p-6 border shadow-lg transition-all duration-300',
      get('border', 'primary')
    );
    if (color === 'emerald') return combine(base, 'bg-gradient-to-br', theme === 'dark' ? 'from-gray-800 to-emerald-900/10' : 'from-white to-emerald-50');
    if (color === 'amber') return combine(base, 'bg-gradient-to-br', theme === 'dark' ? 'from-gray-800 to-amber-900/10' : 'from-white to-amber-50');
    if (color === 'red') return combine(base, 'bg-gradient-to-br', theme === 'dark' ? 'from-gray-800 to-red-900/10' : 'from-white to-red-50');
    return combine(base, 'bg-gradient-to-br', theme === 'dark' ? 'from-gray-800 to-blue-900/10' : 'from-white to-blue-50');
  };

  const getInputClass = () => combine(
    'w-full px-3 sm:px-4 py-2.5 sm:py-3 rounded-lg sm:rounded-xl border outline-none transition-all text-xs sm:text-sm',
    'focus:ring-2 focus:ring-blue-500',
    theme === 'dark'
      ? 'bg-gray-900/70 border-gray-600 text-gray-100 hover:border-gray-500'
      : 'bg-white border-gray-300 text-gray-900 hover:border-gray-400'
  );

  const getPrimaryButtonClass = () => combine(
    'px-4 sm:px-6 py-2.5 sm:py-3 rounded-lg sm:rounded-xl transition-all duration-200 font-medium text-white text-xs sm:text-sm',
    'shadow-lg hover:shadow-xl hover:scale-[1.02] active:scale-[0.98] flex items-center justify-center gap-2',
    theme === 'dark'
      ? 'bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800'
      : 'bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700'
  );

  const getSecondaryButtonClass = () => combine(
    'px-3 sm:px-4 py-2 sm:py-3 rounded-lg sm:rounded-xl transition-all duration-200 font-medium text-xs sm:text-sm border',
    get('border', 'secondary'),
    get('bg', 'card'),
    get('text', 'secondary'),
    'hover:bg-[var(--color-bg-hover)] hover:shadow-md'
  );

  const getDangerButtonClass = () => combine(
    'px-4 sm:px-6 py-2.5 sm:py-3 rounded-lg sm:rounded-xl transition-all duration-200 font-medium text-white text-xs sm:text-sm',
    'shadow-lg hover:shadow-xl hover:scale-[1.02] active:scale-[0.98] flex items-center justify-center gap-2',
    theme === 'dark'
      ? 'bg-gradient-to-r from-red-600 to-red-700 hover:from-red-700 hover:to-red-800'
      : 'bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700'
  );

  const paged = useMemo(
    () => studentLeavesApi.pageFromAll(allLeaves, { status: applied.status, search: searchTerm }, sortConfig, page, pageSize),
    [allLeaves, applied.status, searchTerm, sortConfig, page]
  );

  const headerClassLabel = useMemo(() => {
    const assignedClass = (profile?.assigned_class || '').toString().trim();
    const section = (profile?.section_name || '').toString().trim();
    if (!assignedClass || assignedClass.toLowerCase() === 'not assigned') return null;
    return { assignedClass, section };
  }, [profile]);

  const getStatusBadgeClass = (status: LeaveRequest['status']) => {
    if (theme === 'dark') {
      if (status === 'Pending') return 'bg-amber-900/30 text-amber-300 border-amber-800';
      if (status === 'Approved') return 'bg-emerald-900/30 text-emerald-300 border-emerald-800';
      return 'bg-red-900/30 text-red-300 border-red-800';
    }
    if (status === 'Pending') return 'bg-amber-100 text-amber-800 border-amber-200';
    if (status === 'Approved') return 'bg-emerald-100 text-emerald-800 border-emerald-200';
    return 'bg-red-100 text-red-800 border-red-200';
  };

  const loadProfile = async () => {
    try {
      const response = await teacherApi.profile.get();
      const data = response.data?.data || response.data;
      setProfile(data || null);
    } catch {
      setProfile(null);
    }
  };

  const loadLeaves = async (nextApplied: AppliedFilters) => {
    try {
      setLoading(true);
      setError('');

      const payload = await studentLeavesApi.fetchAll({ status: nextApplied.status, month: nextApplied.month });
      const { leaves, notClassTeacher } = normalizeLeavesPayload(payload);
      setAllLeaves(leaves);
      setIsClassTeacher(!notClassTeacher);
    } catch (err: any) {
      const message = extractApiError(err, 'Failed to load student leaves');
      setError(message);
      toastError(message);
      setAllLeaves([]);
    } finally {
      setLoading(false);
    }
  };

  const loadCards = async (month: number | null) => {
    try {
      setCardsLoading(true);
      const result = await studentLeavesCardsApi.getSummary({ month });
      setCardsSummary(result.summary);
      if (result.notClassTeacher) setIsClassTeacher(false);
    } catch (err: any) {
      // Cards should never block the table; just fall back silently.
      setCardsSummary({ total: 0, pending: 0, approved: 0, rejected: 0 });
    } finally {
      setCardsLoading(false);
    }
  };

  const applyFilters = async () => {
    const next: AppliedFilters = { status: draftStatus, month: draftMonth };
    setApplied(next);
    setPage(1);
    await Promise.all([loadLeaves(next), loadCards(next.month)]);
  };

  const clearFilters = async () => {
    setDraftStatus('Pending');
    setDraftMonth(null);
    setSearchTerm('');
    const next: AppliedFilters = { status: 'Pending', month: null };
    setApplied(next);
    setPage(1);
    await Promise.all([loadLeaves(next), loadCards(next.month)]);
  };

  const handleSort = (key: SortKey) => {
    setSortConfig((prev) => ({
      key,
      direction: prev.key === key && prev.direction === 'asc' ? 'desc' : 'asc',
    }));
    setPage(1);
  };

  const actOnLeave = async () => {
    if (!actionLeave) return;
    if (action === 'Rejected' && !comment.trim()) {
      toastError('Comment is required for rejection');
      return;
    }
    try {
      setActing(true);
      const payload = await teacherApi.leaves.actOnStudentLeave({
        leave_id: actionLeave.id,
        action,
        comment: comment.trim() || undefined,
      });
      toastSuccess(extractApiMessage(payload?.data ?? payload, `Student leave ${action.toLowerCase()} successfully`));
      setActionLeave(null);
      setComment('');
      await loadLeaves(applied);
    } catch (err: any) {
      toastError(extractApiError(err, `Failed to ${action.toLowerCase()} leave`));
    } finally {
      setActing(false);
    }
  };

  useEffect(() => {
    void loadProfile();
    void loadLeaves(applied);
    void loadCards(applied.month);
  }, []);

  return (
    <div className={combine('dashboard-typography px-3 py-3 sm:px-4 sm:py-4 xl:px-6 xl:py-6', getBgClass())}>
      <div className="mx-auto w-full max-w-[1600px]">
        <div className="mb-6 sm:mb-8">
          <div
            className={combine(
              'rounded-xl sm:rounded-2xl p-4 sm:p-6 shadow-lg text-white mb-6',
              theme === 'dark'
                ? 'bg-gradient-to-r from-blue-700 to-blue-800'
                : 'bg-gradient-to-r from-blue-500 to-blue-600'
            )}
          >
            <div className="flex flex-col gap-4 sm:gap-5 lg:flex-row lg:items-center lg:justify-between">
              <div className="flex items-start gap-3 sm:gap-4">
                <div className="p-2.5 sm:p-3 rounded-xl sm:rounded-2xl shadow-lg bg-white/20 backdrop-blur-sm">
                  <FaUserGraduate className="text-2xl sm:text-3xl" />
                </div>
                <div className="min-w-0">
                  <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold mb-1.5 sm:mb-2">Student Leaves</h1>
                  <p className="text-xs sm:text-sm text-blue-100">
                    Review and manage leave requests from your class students
                  </p>
                </div>
              </div>

              {headerClassLabel && (
                <div className="w-full lg:w-auto">
                  <div className="rounded-xl sm:rounded-2xl border border-white/20 bg-white/10 px-4 py-3 flex items-center gap-3">
                    <div className="p-2 rounded-xl bg-white/10">
                      <FaChalkboardTeacher className="text-white" />
                    </div>
                    <div className="min-w-0">
                      <div className="text-[11px] sm:text-xs font-medium text-blue-100">My Class</div>
                      <div className="text-xs sm:text-sm font-semibold truncate">
                        Class {headerClassLabel.assignedClass}{headerClassLabel.section ? ` • ${headerClassLabel.section}` : ''}
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {isClassTeacher === false ? (
          <div className={combine(getCardGradientClass('amber'), 'mb-6 text-center')}>
            <div className="mx-auto max-w-xl">
              <div className="inline-flex items-center justify-center h-14 w-14 rounded-2xl bg-amber-500/10 mb-4">
                <FaChalkboardTeacher className="text-2xl text-amber-600" />
              </div>
              <h2 className={combine('text-lg sm:text-xl font-bold', get('text', 'primary'))}>Class Teacher Access Required</h2>
              <p className={combine('mt-2 text-xs sm:text-sm', get('text', 'secondary'))}>
                You can view student leave requests only if you are assigned as a class teacher for the current academic year.
              </p>
            </div>
          </div>
        ) : (
          <>
            <div className="mb-6">
              <div className="grid grid-cols-1 min-[520px]:grid-cols-2 xl:grid-cols-4 gap-3 sm:gap-4 md:gap-6">
                <div className={getCardGradientClass('blue')}>
                  <div className="flex items-center justify-between">
                    <div>
                      <div className={combine('text-xl sm:text-2xl md:text-3xl font-bold', get('accent', 'primary'))}>
                        {cardsLoading ? '-' : cardsSummary.total}
                      </div>
                      <div className={combine('text-xs sm:text-sm font-medium mt-1', get('text', 'secondary'))}>Total Requests</div>
                    </div>
                    <FaRegCalendarCheck className={combine('text-2xl sm:text-3xl', theme === 'dark' ? 'text-blue-400' : 'text-blue-600')} />
                  </div>
                </div>
                <div className={getCardGradientClass('amber')}>
                  <div className="flex items-center justify-between">
                    <div>
                      <div className={combine('text-xl sm:text-2xl md:text-3xl font-bold', get('accent', 'warning'))}>
                        {cardsLoading ? '-' : cardsSummary.pending}
                      </div>
                      <div className={combine('text-xs sm:text-sm font-medium mt-1', get('text', 'secondary'))}>Pending</div>
                    </div>
                    <FaClock className={combine('text-2xl sm:text-3xl', theme === 'dark' ? 'text-amber-400' : 'text-amber-600')} />
                  </div>
                </div>
                <div className={getCardGradientClass('emerald')}>
                  <div className="flex items-center justify-between">
                    <div>
                      <div className={combine('text-xl sm:text-2xl md:text-3xl font-bold', get('accent', 'success'))}>
                        {cardsLoading ? '-' : cardsSummary.approved}
                      </div>
                      <div className={combine('text-xs sm:text-sm font-medium mt-1', get('text', 'secondary'))}>Approved</div>
                    </div>
                    <FaCheckCircle className={combine('text-2xl sm:text-3xl', theme === 'dark' ? 'text-emerald-400' : 'text-green-600')} />
                  </div>
                </div>
                <div className={getCardGradientClass('red')}>
                  <div className="flex items-center justify-between">
                    <div>
                      <div className={combine('text-xl sm:text-2xl md:text-3xl font-bold', theme === 'dark' ? 'text-red-300' : 'text-red-600')}>
                        {cardsLoading ? '-' : cardsSummary.rejected}
                      </div>
                      <div className={combine('text-xs sm:text-sm font-medium mt-1', get('text', 'secondary'))}>Rejected</div>
                    </div>
                    <FaTimesCircle className={combine('text-2xl sm:text-3xl', theme === 'dark' ? 'text-red-300' : 'text-red-600')} />
                  </div>
                </div>
              </div>
            </div>

            <div className={combine(getCardGradientClass('blue'), 'mb-6')}>
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_minmax(0,1fr)_auto_auto] gap-4 xl:items-end">
                <div>
                  <label className={combine('block text-xs sm:text-sm font-medium mb-1.5', get('text', 'primary'))}>Status</label>
                  <select value={draftStatus} onChange={(e) => setDraftStatus(e.target.value as StatusFilter)} className={getInputClass()}>
                    <option value="Pending">Pending</option>
                    <option value="Approved">Approved</option>
                    <option value="Rejected">Rejected</option>
                    <option value="all">All Status</option>
                  </select>
                </div>

                <div>
                  <label className={combine('block text-xs sm:text-sm font-medium mb-1.5', get('text', 'primary'))}>Month</label>
                  <select value={draftMonth || ''} onChange={(e) => setDraftMonth(e.target.value ? parseInt(e.target.value, 10) : null)} className={getInputClass()}>
                    <option value="">All Months</option>
                    {Array.from({ length: 12 }, (_, i) => i + 1).map((m) => (
                      <option key={m} value={m}>{getMonthName(m)}</option>
                    ))}
                  </select>
                </div>

                <div>
  <label className={combine('block text-xs sm:text-sm font-medium mb-1.5', get('text', 'primary'))}>
    Search
  </label>
  <div className="relative">
    <FaSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm sm:text-base" />
    <input
      value={searchTerm}
      onChange={(e) => { setSearchTerm(e.target.value); setPage(1); }}
      placeholder="Student name, ID, reason..."
      className={combine(getInputClass(), 'pl-8 sm:pl-9')}
    />
  </div>
</div>

                <button
                  onClick={() => { void applyFilters(); }}
                  disabled={loading}
                  className={combine(getPrimaryButtonClass(), loading ? 'opacity-60 cursor-not-allowed' : '')}
                >
                  {loading ? <FaSpinner className="animate-spin" /> : <FaFilter />} Apply
                </button>
                <button
                  onClick={() => { void clearFilters(); }}
                  disabled={loading}
                  className={combine(getSecondaryButtonClass(), loading ? 'opacity-60 cursor-not-allowed' : '')}
                >
                  Clear
                </button>
              </div>
            </div>

            {loading ? (
              <div className={combine(getCardGradientClass('emerald'), 'text-center py-12')}>
                <FaSpinner className={combine('animate-spin text-4xl mx-auto mb-4', get('accent', 'primary'))} />
                <p className={combine('text-xs sm:text-sm', get('text', 'secondary'))}>Loading student leaves...</p>
              </div>
            ) : paged.items.length === 0 ? (
              <div className={combine(getCardGradientClass('emerald'), 'text-center py-12')}>
                <div className="inline-flex items-center justify-center h-14 w-14 rounded-2xl bg-emerald-500/10 mb-4">
                  <FaUserGraduate className="text-2xl text-emerald-600" />
                </div>
                <h3 className={combine('text-base sm:text-lg font-bold', get('text', 'primary'))}>No Leaves Found</h3>
                <p className={combine('mt-2 text-xs sm:text-sm', get('text', 'secondary'))}>
                  Try changing filters or clearing search.
                </p>
              </div>
            ) : (
              <div className={combine(getCardGradientClass('blue'), 'mb-6 overflow-hidden')}>
                <div className="hidden md:block overflow-x-auto">
                  <table className={combine(
                    'min-w-full divide-y',
                    theme === 'dark' ? 'divide-gray-700' : 'divide-gray-200'
                  )}>
                    <thead>
                      <tr className={combine('bg-gradient-to-r border-b', get('bg', 'secondary'), get('border', 'secondary'))}>
                        <th
                          className={combine('py-4 px-6 text-left font-semibold cursor-pointer select-none', get('text', 'secondary'))}
                          onClick={() => handleSort('requester_name')}
                        >
                          <div className="flex items-center gap-2">
                            Student
                            {sortConfig.key === 'requester_name' && (sortConfig.direction === 'asc' ? <FaSortUp /> : <FaSortDown />)}
                          </div>
                        </th>
                        <th
                          className={combine('py-4 px-6 text-left font-semibold cursor-pointer select-none', get('text', 'secondary'))}
                          onClick={() => handleSort('start_date')}
                        >
                          <div className="flex items-center gap-2">
                            Leave
                            {sortConfig.key === 'start_date' && (sortConfig.direction === 'asc' ? <FaSortUp /> : <FaSortDown />)}
                          </div>
                        </th>
                        <th
                          className={combine('py-4 px-6 text-left font-semibold cursor-pointer select-none', get('text', 'secondary'))}
                          onClick={() => handleSort('duration')}
                        >
                          <div className="flex items-center gap-2">
                            Duration
                            {sortConfig.key === 'duration' && (sortConfig.direction === 'asc' ? <FaSortUp /> : <FaSortDown />)}
                          </div>
                        </th>
                        <th
                          className={combine('py-4 px-6 text-left font-semibold cursor-pointer select-none', get('text', 'secondary'))}
                          onClick={() => handleSort('status')}
                        >
                          <div className="flex items-center gap-2">
                            Status
                            {sortConfig.key === 'status' && (sortConfig.direction === 'asc' ? <FaSortUp /> : <FaSortDown />)}
                          </div>
                        </th>
                        <th className={combine('py-4 px-6 text-left font-semibold', get('text', 'secondary'))}>Actions</th>
                      </tr>
                    </thead>
                    <tbody className={combine(
                      'divide-y',
                      theme === 'dark' ? 'divide-gray-700' : 'divide-gray-200'
                    )}>
                      {paged.items.map((leave) => {
                        const duration = calculateDurationDays(leave.start_date, leave.end_date);
                        const isPending = leave.status === 'Pending';
                        return (
                          <tr
                            key={leave.id}
                            className={combine(
                              'transition-colors',
                              theme === 'dark' ? 'hover:bg-gray-800/50' : 'hover:bg-blue-50'
                            )}
                          >
                            <td className="px-6 py-4">
                              <div className="flex items-center gap-3">
                                <div className="w-10 h-10 bg-gradient-to-br from-emerald-100 to-emerald-200 rounded-lg flex items-center justify-center">
                                  <FaUserGraduate className="text-emerald-600" />
                                </div>
                                <div>
                                  <div className={combine('font-medium', get('text', 'primary'))}>{leave.requester_name}</div>
                                  <div className={combine('text-xs sm:text-sm', get('text', 'tertiary'))}>ID: {leave.requester_id}</div>
                                </div>
                              </div>
                            </td>
                            <td className="px-6 py-4">
                              <div className={combine('font-medium', get('text', 'primary'))}>{formatDate(leave.start_date)}</div>
                              <div className={combine('text-xs sm:text-sm', get('text', 'tertiary'))}>to {formatDate(leave.end_date)}</div>
                              <div className={combine('text-xs mt-1 line-clamp-1', get('text', 'tertiary'))} title={leave.reason}>{leave.reason}</div>
                            </td>
                            <td className="px-6 py-4">
                              <div className="flex items-center">
                                <FaClock className="text-gray-400 mr-2" />
                                <span className={combine('font-medium', get('text', 'secondary'))}>{duration} day{duration > 1 ? 's' : ''}</span>
                              </div>
                            </td>
                            <td className="px-6 py-4">
                              <span className={combine(
                                'inline-flex items-center px-3 py-1 rounded-full text-xs sm:text-sm font-medium border',
                                getStatusBadgeClass(leave.status)
                              )}>
                                {leave.status}
                              </span>
                              {leave.admin_comment && (
                                <div className={combine('text-xs mt-1', get('text', 'tertiary'))} title={leave.admin_comment}>
                                  {leave.admin_comment.substring(0, 30)}...
                                </div>
                              )}
                            </td>
                            <td className="px-6 py-4">
                              <div className="flex items-center gap-2 flex-wrap">
                                <button
                                  onClick={() => setDetailsLeave(leave)}
                                  className={combine(getSecondaryButtonClass(), 'px-3 py-2')}
                                  title="View"
                                  aria-label="View"
                                >
                                  <FaEye />
                                </button>
                                {isPending && (
                                  <>
                                    <button
                                      onClick={() => { setAction('Approved'); setComment(''); setActionLeave(leave); }}
                                      className={combine(getPrimaryButtonClass(), 'px-3 py-2')}
                                      title="Approve"
                                      aria-label="Approve"
                                    >
                                      <FaCheckCircle />
                                    </button>
                                    <button
                                      onClick={() => { setAction('Rejected'); setComment(''); setActionLeave(leave); }}
                                      className={combine(getDangerButtonClass(), 'px-3 py-2')}
                                      title="Reject"
                                      aria-label="Reject"
                                    >
                                      <FaTimesCircle />
                                    </button>
                                  </>
                                )}
                                {leave.proof_file && (
                                  <a
                                    href={`${API_MEDIA_BASE_URL}${leave.proof_file}`}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className={combine(getSecondaryButtonClass(), 'px-3 py-2')}
                                    title="Proof"
                                    aria-label="Proof"
                                  >
                                    <FaDownload />
                                  </a>
                                )}
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>

                <div className="md:hidden p-4 space-y-3">
                  {paged.items.map((leave) => {
                    const duration = calculateDurationDays(leave.start_date, leave.end_date);
                    const isPending = leave.status === 'Pending';
                    return (
                      <div key={leave.id} className={combine('rounded-xl border p-4 shadow-sm', get('border', 'secondary'), get('bg', 'card'))}>
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <div className={combine('font-semibold text-sm', get('text', 'primary'))}>{leave.requester_name}</div>
                            <div className={combine('text-xs', get('text', 'tertiary'))}>ID: {leave.requester_id}</div>
                          </div>
                          <span className={combine(
                            'shrink-0 inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold border',
                            getStatusBadgeClass(leave.status)
                          )}>
                            {leave.status}
                          </span>
                        </div>

                        <div className="mt-3 grid grid-cols-2 gap-3 text-xs">
                          <div className={combine('rounded-lg p-2.5', get('bg', 'secondary'))}>
                            <div className={combine('text-[11px]', get('text', 'tertiary'))}>From</div>
                            <div className={combine('mt-0.5 font-medium', get('text', 'primary'))}>{formatDate(leave.start_date)}</div>
                          </div>
                          <div className={combine('rounded-lg p-2.5', get('bg', 'secondary'))}>
                            <div className={combine('text-[11px]', get('text', 'tertiary'))}>To</div>
                            <div className={combine('mt-0.5 font-medium', get('text', 'primary'))}>{formatDate(leave.end_date)}</div>
                          </div>
                        </div>

                        <div className={combine('mt-3 flex items-center justify-between text-xs', get('text', 'secondary'))}>
                          <div className="flex items-center gap-2">
                            <FaClock className="text-gray-400" />
                            <span>{duration} day{duration > 1 ? 's' : ''}</span>
                          </div>
                          <div>{new Date(leave.created_at).toLocaleDateString()}</div>
                        </div>

                        <div className={combine('mt-3 text-xs line-clamp-2', get('text', 'secondary'))} title={leave.reason}>{leave.reason}</div>

                        <div className="mt-4 flex flex-wrap gap-2">
                          <button
                            onClick={() => setDetailsLeave(leave)}
                            className={combine(getSecondaryButtonClass(), 'px-3 py-2')}
                            title="View"
                            aria-label="View"
                          >
                            <FaEye />
                          </button>
                          {isPending && (
                            <>
                              <button
                                onClick={() => { setAction('Approved'); setComment(''); setActionLeave(leave); }}
                                className={combine(getPrimaryButtonClass(), 'px-3 py-2')}
                                title="Approve"
                                aria-label="Approve"
                              >
                                <FaCheckCircle />
                              </button>
                              <button
                                onClick={() => { setAction('Rejected'); setComment(''); setActionLeave(leave); }}
                                className={combine(getDangerButtonClass(), 'px-3 py-2')}
                                title="Reject"
                                aria-label="Reject"
                              >
                                <FaTimesCircle />
                              </button>
                            </>
                          )}
                          {leave.proof_file && (
                            <a
                              href={`${API_MEDIA_BASE_URL}${leave.proof_file}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className={combine(getSecondaryButtonClass(), 'px-3 py-2')}
                              title="Proof"
                              aria-label="Proof"
                            >
                              <FaDownload />
                            </a>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>

                <div className={combine('px-4 sm:px-6 py-4 border-t flex items-center justify-between gap-3 flex-wrap', get('border', 'secondary'))}>
                  <div className={combine('text-xs sm:text-sm', get('text', 'secondary'))}>
                    Showing <span className={combine('font-semibold', get('text', 'primary'))}>{(page - 1) * pageSize + 1}</span>
                    {' '}to{' '}
                    <span className={combine('font-semibold', get('text', 'primary'))}>{Math.min(page * pageSize, paged.total)}</span>
                    {' '}of{' '}
                    <span className={combine('font-semibold', get('text', 'primary'))}>{paged.total}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setPage((p) => Math.max(1, p - 1))}
                      disabled={page <= 1}
                      className={combine(getSecondaryButtonClass(), 'px-3 py-2', page <= 1 ? 'opacity-50 cursor-not-allowed' : '')}
                    >
                      <FaChevronLeft />
                    </button>
                    <div className={combine('text-xs sm:text-sm font-medium', get('text', 'secondary'))}>
                      Page <span className={combine('font-semibold', get('text', 'primary'))}>{page}</span> / {paged.totalPages}
                    </div>
                    <button
                      type="button"
                      onClick={() => setPage((p) => Math.min(paged.totalPages, p + 1))}
                      disabled={page >= paged.totalPages}
                      className={combine(getSecondaryButtonClass(), 'px-3 py-2', page >= paged.totalPages ? 'opacity-50 cursor-not-allowed' : '')}
                    >
                      <FaChevronRight />
                    </button>
                  </div>
                </div>
              </div>
            )}
          </>
        )}

        {error && (
          <div className={combine('mt-6 border px-6 py-4 rounded-2xl flex items-center gap-4 shadow-lg', theme === 'dark' ? 'bg-red-900/20 border-red-800 text-red-300' : 'bg-gradient-to-r from-red-50 to-red-100 border-red-200 text-red-700')}>
            <div className="p-3 bg-red-100 rounded-xl"><FaTimesCircle className="text-2xl text-red-600" /></div>
            <div className="flex-1"><h4 className="font-bold">Error</h4><p>{error}</p></div>
            <button onClick={() => { void loadLeaves(applied); }} className={getSecondaryButtonClass()}>Retry</button>
          </div>
        )}
      </div>

      {detailsLeave && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50 backdrop-blur-sm">
          <div className={combine('rounded-3xl max-w-2xl w-full shadow-2xl border overflow-hidden', get('bg', 'card'), get('border', 'primary'))}>
            <div className={combine('p-6 border-b flex items-start justify-between', get('border', 'secondary'), get('bg', 'secondary'))}>
              <div className="min-w-0">
                <h3 className={combine('text-lg font-bold', get('text', 'primary'))}>Leave Details</h3>
                <p className={combine('text-xs sm:text-sm', get('text', 'secondary'))}>Request #{detailsLeave.id}</p>
              </div>
              <button onClick={() => setDetailsLeave(null)} className={combine(getSecondaryButtonClass(), 'px-3 py-2')}>
                <FaTimes />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className={combine('rounded-xl p-4', get('bg', 'secondary'))}>
                  <div className={combine('text-xs', get('text', 'tertiary'))}>Student</div>
                  <div className={combine('mt-1 font-semibold', get('text', 'primary'))}>{detailsLeave.requester_name}</div>
                  <div className={combine('text-xs', get('text', 'tertiary'))}>ID: {detailsLeave.requester_id}</div>
                </div>
                <div className={combine('rounded-xl p-4', get('bg', 'secondary'))}>
                  <div className={combine('text-xs', get('text', 'tertiary'))}>Status</div>
                  <div className={combine('mt-1 font-semibold', get('text', 'primary'))}>{detailsLeave.status}</div>
                  {detailsLeave.admin_comment && (
                    <div className={combine('mt-1 text-xs', get('text', 'secondary'))}>{detailsLeave.admin_comment}</div>
                  )}
                </div>
              </div>
              <div className={combine('rounded-xl p-4', get('bg', 'secondary'))}>
                <div className={combine('text-xs', get('text', 'tertiary'))}>Leave Period</div>
                <div className={combine('mt-1 font-semibold', get('text', 'primary'))}>
                  {formatDate(detailsLeave.start_date)} to {formatDate(detailsLeave.end_date)} ({calculateDurationDays(detailsLeave.start_date, detailsLeave.end_date)} days)
                </div>
              </div>
              <div className={combine('rounded-xl p-4', get('bg', 'secondary'))}>
                <div className={combine('text-xs', get('text', 'tertiary'))}>Reason</div>
                <div className={combine('mt-1 text-sm', get('text', 'secondary'))}>{detailsLeave.reason}</div>
              </div>
            </div>
          </div>
        </div>
      )}

      {actionLeave && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50 backdrop-blur-sm">
          <div className={combine('rounded-3xl max-w-md w-full shadow-2xl border overflow-hidden', get('bg', 'card'), get('border', 'primary'))}>
            <div className={combine('p-6 border-b flex items-start justify-between', get('border', 'secondary'), get('bg', 'secondary'))}>
              <div>
                <h3 className={combine('text-lg font-bold', get('text', 'primary'))}>{action} Leave</h3>
                <p className={combine('text-xs sm:text-sm', get('text', 'secondary'))}>{actionLeave.requester_name}</p>
              </div>
              <button onClick={() => { setActionLeave(null); setComment(''); }} className={combine(getSecondaryButtonClass(), 'px-3 py-2')}>
                <FaTimes />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div className={combine('rounded-xl p-4', get('bg', 'secondary'))}>
                <div className={combine('text-xs', get('text', 'tertiary'))}>Period</div>
                <div className={combine('mt-1 font-semibold', get('text', 'primary'))}>{formatDate(actionLeave.start_date)} to {formatDate(actionLeave.end_date)}</div>
              </div>
              <div>
                <label className={combine('block text-xs sm:text-sm font-medium mb-2', get('text', 'secondary'))}>
                  Comment {action === 'Rejected' && <span className="text-red-500">*</span>}
                </label>
                <textarea
                  value={comment}
                  onChange={(e) => setComment(e.target.value)}
                  rows={3}
                  className={combine(getInputClass(), 'min-h-[90px]')}
                  placeholder={action === 'Rejected' ? 'Reason for rejection...' : 'Optional comment...'}
                />
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => { void actOnLeave(); }}
                  disabled={acting || (action === 'Rejected' && !comment.trim())}
                  className={combine(action === 'Rejected' ? getDangerButtonClass() : getPrimaryButtonClass(), 'flex-1', (acting || (action === 'Rejected' && !comment.trim())) ? 'opacity-60 cursor-not-allowed' : '')}
                >
                  {acting ? <FaSpinner className="animate-spin" /> : action === 'Rejected' ? <FaTimesCircle /> : <FaCheckCircle />}
                  {action}
                </button>
                <button onClick={() => { setActionLeave(null); setComment(''); }} className={combine(getSecondaryButtonClass(), 'flex-1')}>
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
