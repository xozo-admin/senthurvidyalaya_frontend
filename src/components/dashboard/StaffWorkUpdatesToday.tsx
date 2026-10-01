'use client';

import { useEffect, useMemo, useState } from 'react';
import { Briefcase, RefreshCw, AlertCircle, Clock, User, Minimize2, CheckCircle2, ChevronRight } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { adminApi } from '@/lib/api';
import { useThemeClasses } from '@/hooks/useThemeClasses';

interface StaffWorkItem {
  assignment_id: number;
  task_id: number | null;
  task_description: string;
  staff_id: string | null;
  staff_name: string;
  staff_role: string | null;
  status: 'Pending' | 'Completed' | string;
  date: string | null;
  completed_at: string | null;
  completion_note: string;
  proof_url: string | null;
}

interface StaffWorkTodayResponse {
  status: number;
  date: string;
  message: string;
  data: {
    pending: {
      count: number;
      works: StaffWorkItem[];
    };
    completed: {
      count: number;
      works: StaffWorkItem[];
    };
    overall: {
      total: number;
      pending: number;
      completed: number;
    };
  };
}

type DisplayWorkItem = StaffWorkItem & {
  bucket: 'pending' | 'completed';
  sortTime: number;
};

const statusBadge = (status: string) => {
  const normalized = status.toLowerCase();
  if (normalized === 'completed') {
    return 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300';
  }
  return 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300';
};

const resolveProofUrl = (proofUrl: string) => {
  if (/^https?:\/\//i.test(proofUrl)) return proofUrl;
  const normalizedPath = proofUrl.startsWith('/') ? proofUrl : `/${proofUrl}`;
  return `https://senthurvidyalaya-backend.onrender.com${normalizedPath}`;
};

export const StaffWorkUpdatesToday = ({
  isFullScreen = false,
  onCloseFullScreen = () => {},
}: {
  isFullScreen?: boolean;
  onCloseFullScreen?: () => void;
}) => {
  const { get, combine } = useThemeClasses();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [responseData, setResponseData] = useState<StaffWorkTodayResponse | null>(null);
  const [internalFullScreen, setInternalFullScreen] = useState(false);
  const [isMobileScreen, setIsMobileScreen] = useState(false);

  const closeModal = () => {
    setInternalFullScreen(false);
    onCloseFullScreen();
  };

  const fetchStaffWork = async () => {
    try {
      setLoading(true);
      const response = await adminApi.activities.staffWorkToday();
      const payload = response.data as StaffWorkTodayResponse;
      setResponseData(payload);
      setError(null);
    } catch (err: any) {
      const message =
        err?.response?.data?.detail ||
        err?.response?.data?.message ||
        err?.response?.data?.error ||
        'Failed to load staff work updates';
      setError(message);
      setResponseData(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStaffWork();
  }, []);

  useEffect(() => {
    const handleViewport = () => {
      setIsMobileScreen(window.innerWidth < 640);
    };

    handleViewport();
    window.addEventListener('resize', handleViewport);
    return () => window.removeEventListener('resize', handleViewport);
  }, []);

  useEffect(() => {
    if (!(internalFullScreen || isFullScreen)) return;

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setInternalFullScreen(false);
        onCloseFullScreen();
      }
    };

    document.addEventListener('keydown', onKeyDown);
    document.body.style.overflow = 'hidden';

    return () => {
      document.removeEventListener('keydown', onKeyDown);
      document.body.style.overflow = 'unset';
    };
  }, [internalFullScreen, isFullScreen, onCloseFullScreen]);

  const pendingWorks = useMemo(() => responseData?.data?.pending?.works || [], [responseData]);
  const completedWorks = useMemo(() => responseData?.data?.completed?.works || [], [responseData]);
  const overall = responseData?.data?.overall || { total: 0, pending: 0, completed: 0 };

  const allWorks = useMemo<DisplayWorkItem[]>(() => {
    const withTime = (item: StaffWorkItem, bucket: 'pending' | 'completed'): DisplayWorkItem => {
      const timeSource = item.completed_at || item.date;
      const parsed = timeSource ? new Date(timeSource).getTime() : 0;
      return {
        ...item,
        bucket,
        sortTime: Number.isNaN(parsed) ? 0 : parsed,
      };
    };

    return [
      ...pendingWorks.map((item) => withTime(item, 'pending')),
      ...completedWorks.map((item) => withTime(item, 'completed')),
    ].sort((a, b) => b.sortTime - a.sortTime);
  }, [pendingWorks, completedWorks]);

  const previewLimit = 6;
  const previewItems = allWorks.slice(0, previewLimit);
  const hasMore = allWorks.length > previewLimit;

  const getRelativeTime = (item: StaffWorkItem) => {
    const source = item.completed_at || item.date;
    if (!source) return '-';
    const parsed = new Date(source);
    if (Number.isNaN(parsed.getTime())) return '-';
    return formatDistanceToNow(parsed, { addSuffix: true });
  };

  // Loading state with fixed height
  if (loading) {
    return (
      <div className="px-2 sm:px-3 h-[70vh] max-h-[420px] sm:h-[72vh] sm:max-h-[460px] lg:h-[500px] lg:max-h-none flex items-center justify-center">
        <div className="text-center">
          <div className="relative">
            <div className="animate-spin rounded-full h-12 w-12 border-4 border-blue-200 border-t-blue-600 mx-auto"></div>
            <div className="absolute inset-0 flex items-center justify-center">
              <Briefcase className="h-5 w-5 text-blue-600 animate-pulse" />
            </div>
          </div>
          <p className={combine('mt-4 text-sm', get('text', 'secondary'))}>Loading staff work updates...</p>
          <p className={combine('mt-1 text-xs', get('text', 'tertiary'))}>Preparing today&apos;s tasks</p>
        </div>
      </div>
    );
  }

  // Error state with fixed height
  if (error) {
    return (
      <div className="px-2 sm:px-3 h-[70vh] max-h-[420px] sm:h-[72vh] sm:max-h-[460px] lg:h-[500px] lg:max-h-none flex items-center justify-center">
        <div className="w-full">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-start gap-2">
              <AlertCircle className="w-4 h-4 mt-0.5 text-red-500" />
              <p className={combine('text-sm', get('text', 'secondary'))}>{error}</p>
            </div>
            <button
              onClick={fetchStaffWork}
              className="p-2 rounded-lg hover:bg-[var(--color-bg-hover)] transition-colors"
              title="Retry"
            >
              <RefreshCw className={combine('w-4 h-4', get('icon', 'secondary'))} />
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Empty state with fixed height
  if (allWorks.length === 0) {
    return (
      <div className="px-2 sm:px-3 h-[70vh] max-h-[420px] sm:h-[72vh] sm:max-h-[460px] lg:h-[500px] lg:max-h-none flex items-center justify-center">
        <div className="text-center">
          <div className="inline-flex p-3 rounded-full bg-gray-100 dark:bg-gray-800 mb-3">
            <Briefcase className="w-6 h-6 sm:w-7 sm:h-7 text-gray-500" />
          </div>
          <p className={combine('text-sm sm:text-base font-medium', get('text', 'primary'))}>No staff work updates today</p>
          <p className={combine('text-xs sm:text-sm mt-1', get('text', 'tertiary'))}>
            Pending and completed work updates will appear here.
          </p>
        </div>
      </div>
    );
  }

  // Data state with fixed height
  return (
    <>
      <div className="px-2 sm:px-3 h-[70vh] max-h-[420px] sm:h-[72vh] sm:max-h-[460px] lg:h-[530px] lg:max-h-none flex flex-col">
        <div className="flex items-center justify-between flex-shrink-0">
          <p className={combine('text-[10px] sm:text-xs', get('text', 'tertiary'))}>
            {overall.total} update(s) today
          </p>
        </div>

        <div className="grid grid-cols-3 gap-2 sm:gap-3 flex-shrink-0 mt-2">
          <div className="rounded-lg p-2 sm:p-2.5 bg-slate-50 dark:bg-gray-800/40 border border-slate-200 dark:border-gray-700">
            <p className="text-[10px] sm:text-xs text-slate-600 dark:text-gray-400">Total</p>
            <p className="text-base sm:text-lg font-semibold text-slate-800 dark:text-slate-100">{overall.total}</p>
          </div>
          <div className="rounded-lg p-2 sm:p-2.5 bg-amber-50 dark:bg-amber-900/20 border border-amber-100 dark:border-amber-900/30">
            <p className="text-[10px] sm:text-xs text-amber-700 dark:text-amber-300">Pending</p>
            <p className="text-base sm:text-lg font-semibold text-amber-800 dark:text-amber-200">{overall.pending}</p>
          </div>
          <div className="rounded-lg p-2 sm:p-2.5 bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-100 dark:border-emerald-900/30">
            <p className="text-[10px] sm:text-xs text-emerald-700 dark:text-emerald-300">Completed</p>
            <p className="text-base sm:text-lg font-semibold text-emerald-800 dark:text-emerald-200">{overall.completed}</p>
          </div>
        </div>

        <div className="space-y-2 sm:space-y-3 overflow-y-hidden pr-1 flex-1 min-h-0 mt-3">
          {previewItems.map((work) => (
            <div
              key={`${work.assignment_id}-${work.task_id ?? 'na'}`}
              className="rounded-lg border border-gray-200 dark:border-gray-700 p-2.5 sm:p-3 bg-white dark:bg-gray-800/50"
            >
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className={combine('text-xs sm:text-sm font-medium truncate', get('text', 'primary'))}>
                    {work.task_description || 'Work task'}
                  </p>
                  <div className={combine('flex items-center gap-2 sm:gap-3 mt-1 text-[10px] sm:text-xs flex-wrap', get('text', 'tertiary'))}>
                    <span className="flex items-center gap-1 min-w-0">
                      <User className="w-3 h-3 flex-shrink-0" />
                      {work.staff_name || 'Staff'}{work.staff_role ? ` (${work.staff_role})` : ''}
                    </span>
                    <span className="flex items-center gap-1">
                      <Clock className="w-3 h-3 flex-shrink-0" />
                      {getRelativeTime(work)}
                    </span>
                  </div>
                </div>
                <span className={`px-2 py-1 rounded-full text-[10px] sm:text-xs font-medium whitespace-nowrap ${statusBadge(work.status)}`}>
                  {work.status || (work.bucket === 'completed' ? 'Completed' : 'Pending')}
                </span>
              </div>
            </div>
          ))}
        </div>

        {hasMore && (
          <div className="pt-2 text-center border-t border-gray-100 dark:border-gray-800 mt-2">
            <button
              onClick={() => setInternalFullScreen(true)}
              className="text-sm font-medium text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300 transition-colors inline-flex items-center gap-1"
            >
              View more updates
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        )}
      </div>

      {(internalFullScreen || isFullScreen) && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" onClick={closeModal} />
          <div
            className={`relative z-10 bg-white dark:bg-gray-900 shadow-2xl flex flex-col ${
              isMobileScreen
                ? 'w-[100vw] h-[100dvh] rounded-none overflow-y-auto'
                : 'w-[96vw] sm:w-[94vw] lg:w-[90vw] xl:w-[84vw] h-[92vh] rounded-xl sm:rounded-2xl overflow-hidden'
            }`}
          >
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 p-4 sm:p-6 border-b border-gray-200 dark:border-gray-700 bg-gradient-to-r from-gray-50 to-white dark:from-gray-900 dark:to-gray-800">
              <div className="flex items-center gap-2.5 sm:gap-3">
                <div className="p-1.5 sm:p-2 bg-orange-100 dark:bg-orange-900/30 rounded-lg">
                  <Briefcase className="w-5 h-5 sm:w-6 sm:h-6 text-orange-600 dark:text-orange-400" />
                </div>
                <div>
                  <h2 className={combine('text-lg sm:text-2xl font-bold', get('text', 'primary'))}>Staff Work Updates - Full View</h2>
                  <p className={combine('text-xs sm:text-sm', get('text', 'secondary'))}>{overall.total} update(s) today</p>
                </div>
              </div>
              <button
                onClick={closeModal}
                className="flex items-center gap-2 px-3 sm:px-4 py-2 text-xs sm:text-sm bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-lg transition-colors"
              >
                <Minimize2 className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                <span>Exit Full Screen</span>
              </button>
            </div>

            <div className="p-3 sm:p-4 border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50">
              <div className="grid grid-cols-3 gap-2 sm:gap-3">
                <div className="rounded-lg p-2 sm:p-2.5 bg-slate-50 dark:bg-gray-800/40 border border-slate-200 dark:border-gray-700">
                  <p className="text-[10px] sm:text-xs text-slate-600 dark:text-gray-400">Total</p>
                  <p className="text-base sm:text-lg font-semibold text-slate-800 dark:text-slate-100">{overall.total}</p>
                </div>
                <div className="rounded-lg p-2 sm:p-2.5 bg-amber-50 dark:bg-amber-900/20 border border-amber-100 dark:border-amber-900/30">
                  <p className="text-[10px] sm:text-xs text-amber-700 dark:text-amber-300">Pending</p>
                  <p className="text-base sm:text-lg font-semibold text-amber-800 dark:text-amber-200">{overall.pending}</p>
                </div>
                <div className="rounded-lg p-2 sm:p-2.5 bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-100 dark:border-emerald-900/30">
                  <p className="text-[10px] sm:text-xs text-emerald-700 dark:text-emerald-300">Completed</p>
                  <p className="text-base sm:text-lg font-semibold text-emerald-800 dark:text-emerald-200">{overall.completed}</p>
                </div>
              </div>
            </div>

            <div className="flex-1 p-3 sm:p-6 overflow-y-auto bg-gray-50 dark:bg-gray-900/50 space-y-3 sm:space-y-4">
              {allWorks.map((work) => (
                <div
                  key={`full-${work.assignment_id}-${work.task_id ?? 'na'}`}
                  className="rounded-lg border border-gray-200 dark:border-gray-700 p-3 sm:p-4 bg-white dark:bg-gray-800/50"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className={combine('text-xs sm:text-sm font-medium', get('text', 'primary'))}>
                        {work.task_description || 'Work task'}
                      </p>
                      <div className={combine('flex items-center gap-2 sm:gap-3 mt-1 text-[10px] sm:text-xs flex-wrap', get('text', 'tertiary'))}>
                        <span className="flex items-center gap-1 min-w-0">
                          <User className="w-3 h-3 flex-shrink-0" />
                          {work.staff_name || 'Staff'}{work.staff_role ? ` (${work.staff_role})` : ''}
                        </span>
                        <span className="flex items-center gap-1">
                          <Clock className="w-3 h-3 flex-shrink-0" />
                          {getRelativeTime(work)}
                        </span>
                      </div>
                    </div>
                    <span className={`px-2 py-1 rounded-full text-[10px] sm:text-xs font-medium whitespace-nowrap ${statusBadge(work.status)}`}>
                      {work.status || (work.bucket === 'completed' ? 'Completed' : 'Pending')}
                    </span>
                  </div>

                  {work.completion_note && (
                    <p className={combine('text-[10px] sm:text-xs mt-2', get('text', 'secondary'))}>{work.completion_note}</p>
                  )}

                  {work.proof_url && (
                    <a
                      href={resolveProofUrl(work.proof_url)}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-1 mt-2 text-xs text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300"
                    >
                      <CheckCircle2 className="w-3 h-3" />
                      View proof
                    </a>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </>
  );
};
