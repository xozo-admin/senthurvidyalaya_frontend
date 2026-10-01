// lib/api.ts

import axios from 'axios';
import Cookies from 'js-cookie';
import { encryptData, decryptData, isEncryptedResponse, inspectEncryptedResponse } from './encryption';

// Enable encryption based on env flag.
// Accepts "true" (case-insensitive) to enable; everything else is false.
const ENABLE_ENCRYPTION =
  process.env.NEXT_PUBLIC_ENABLE_ENCRYPTION?.toLowerCase() === 'true';


const DEFAULT_BACKEND_API = 'https://senthurvidyalaya-backend.onrender.com';
const configuredBackendApi =
  process.env.NEXT_PUBLIC_BACKEND_API?.trim() ||
  process.env.NEXT_PUBLIC_API_URL?.trim() ||
  process.env.NEXT_PUBLIC_API_BASE_URL?.trim() ||
  DEFAULT_BACKEND_API;

export const backend_api = configuredBackendApi
  .replace(/\/api\/?$/, '')
  .replace(/\/+$/, '');
const API_BASE_HTTP = `${backend_api}/api/`;


declare module 'axios' {
  export interface AxiosRequestConfig {
    skipEncryption?: boolean;
  }
}

const getSessionKey = (): string | null => {
  if (typeof window === 'undefined') return null;
  return Cookies.get('session_key') || null;
};

export const setSessionKey = (key: string | null) => {
  console.log('🔑 Setting session key:', key ? 'present' : 'null');

  if (key) {
    Cookies.set('session_key', key, {
      secure: true,
      sameSite: 'strict',
    });
  } else {
    Cookies.remove('session_key');
  }
};

const apiClient = axios.create({
  baseURL: API_BASE_HTTP,
  headers: {
    'ngrok-skip-browser-warning': 'true'
  }
});

const resolveAuthToken = (): string | null => {
  // Get token only from cookies
  const fromCookie = Cookies.get('token');
  if (!fromCookie) return null;
  return fromCookie.startsWith('Token ') ? fromCookie.slice(6) : fromCookie;
};

const normalizeApiPath = (pathOrUrl: string): string => {
  if (pathOrUrl.startsWith(API_BASE_HTTP)) {
    return pathOrUrl.slice(API_BASE_HTTP.length);
  }
  if (pathOrUrl.startsWith('/')) {
    return pathOrUrl.slice(1);
  }
  return pathOrUrl;
};

// Public endpoints that shouldn't be encrypted
const PUBLIC_ENDPOINTS = [
  'accounts/login/',
  'accounts/verify-otp/',
  'accounts/register/admin/',
  'accounts/super-admin-register/',
  'accounts/register/school/',
  'password-reset/request/',
  'password-reset/verify-otp/',
  'password-reset/confirm/',
];

// Check if an endpoint should be encrypted
const shouldEncrypt = (url: string, config?: any): boolean => {
  // If encryption is disabled globally, don't encrypt anything
  if (!ENABLE_ENCRYPTION) {
    return false;
  }
  
  // Check if this specific request should skip encryption
  if (config?.skipEncryption) {
    return false;
  }
  
  const isPublic = PUBLIC_ENDPOINTS.some(endpoint =>
    url.includes(endpoint)
  );
  return !isPublic && !!getSessionKey();
};

// 🔐 Request interceptor for encryption
apiClient.interceptors.request.use(async (config) => {
  const token = resolveAuthToken();
  const sessionKey = getSessionKey();

  const isPublic = PUBLIC_ENDPOINTS.some(endpoint =>
    config.url?.includes(endpoint)
  );

  if (!isPublic && token) {
    config.headers.Authorization = `Token ${token}`;
  }

  if (config.data instanceof FormData) {
    return config;
  }

  // Pass config to shouldEncrypt to check for skipEncryption flag
  if (config.data && shouldEncrypt(config.url || '', config) && sessionKey) {
    try {
      console.log('🔐 Encrypting request to:', config.url);

      const encryptedBody = await encryptData(config.data, sessionKey);
      config.data = JSON.parse(encryptedBody);
      config.headers['Content-Type'] = 'application/json';
    } catch (error) {
      console.error('Failed to encrypt request:', error);
      return Promise.reject(error);
    }
  }

  return config;
});

// 🔐 Response interceptor for decryption
apiClient.interceptors.response.use(
  async (response) => {
    // Only decrypt if encryption is enabled
    if (!ENABLE_ENCRYPTION) {
      return response;
    }
    
    const sessionKey = getSessionKey();

    if (
      response.data &&
      isEncryptedResponse(response.data) &&
      sessionKey
    ) {
      try {
        console.log('🔓 Decrypting response from:', response.config.url);

        if (process.env.NODE_ENV === 'development') {
          inspectEncryptedResponse(response.data);
        }

        const decryptedData = await decryptData(
          response.data.response,
          sessionKey
        );

        response.data = decryptedData;
      } catch (error) {
        console.error('Failed to decrypt response:', error);
        return Promise.reject(error);
      }
    }

    return response;
  },
  async (error) => {
    if (ENABLE_ENCRYPTION) {
      const sessionKey = getSessionKey();
      const encryptedErrorPayload = error?.response?.data;

      if (sessionKey && encryptedErrorPayload && isEncryptedResponse(encryptedErrorPayload)) {
        try {
          console.log('🔓 Decrypting error response from:', error?.config?.url);
          error.response.data = await decryptData(encryptedErrorPayload.response, sessionKey);
        } catch (decryptError) {
          console.error('Failed to decrypt error response:', decryptError);
        }
      }
    }

    const status = error.response?.status;
    const requestUrl = error.config?.url || '';

    const isAuthRequest =
      requestUrl.includes('/login') ||
      requestUrl.includes('/verify-otp');

    if (status === 401 && !isAuthRequest) {
      console.log('🚫 401 Unauthorized - clearing session');

      Cookies.remove('token');
      Cookies.remove('session_key');
      setSessionKey(null);

      if (typeof window !== 'undefined') {
        window.location.href = '/';
      }
    }

    return Promise.reject(error);
  }
);

// Custom fetch wrapper for non-axios requests
export const apiFetch = async (pathOrUrl: string, options: RequestInit & { skipEncryption?: boolean } = {}) => {
  const token = resolveAuthToken();
  const headers = new Headers(options.headers || {});

  const normalizedPath = normalizeApiPath(pathOrUrl);
  const requestUrl = `${API_BASE_HTTP}${normalizedPath}`;

  const isPublic = PUBLIC_ENDPOINTS.some(endpoint =>
    normalizedPath.includes(endpoint)
  );

  if (!isPublic && token) {
    headers.set('Authorization', `Token ${token}`);
  }

  // Required for ngrok free tunnel warning bypass on fetch-based requests.
  if (!headers.has('ngrok-skip-browser-warning')) {
    headers.set('ngrok-skip-browser-warning', 'true');
  }

  const fetchOptions: RequestInit = {
    ...options,
    headers,
  };

  // Check for skipEncryption in options
  const skipEncryption = options.skipEncryption === true;

  // Don't encrypt FormData
  const isFormData = options.body instanceof FormData;

  // Encrypt body if needed
  let body = options.body;
  const sessionKey = getSessionKey();

  if (body && !isFormData && !skipEncryption && shouldEncrypt(normalizedPath) && sessionKey) {
    try {
      console.log('🔐 Encrypting fetch request to:', normalizedPath);
      const parsedBody = typeof body === 'string' ? JSON.parse(body) : body;
      const encryptedBody = await encryptData(parsedBody, sessionKey);
      // Keep fetch encryption payload shape consistent with axios interceptor:
      // backend expects top-level {iv, ciphertext, tag}.
      body = encryptedBody;
      headers.set('Content-Type', 'application/json');
      fetchOptions.body = body;
    } catch (error) {
      console.error('Failed to encrypt fetch request:', error);
      throw error;
    }
  }

  const response = await fetch(requestUrl, fetchOptions);

  // Decrypt JSON response payloads (success and error) when encryption is enabled.
  if (ENABLE_ENCRYPTION) {
    const contentType = response.headers.get('content-type');
    if (contentType && contentType.includes('application/json')) {
      const responseData = await response.json();
      const sessionKey = getSessionKey();
      if (isEncryptedResponse(responseData) && sessionKey) {
        try {
          console.log('🔓 Decrypting fetch response from:', normalizedPath);
          const decryptedData = await decryptData(responseData.response, sessionKey);
          return new Response(JSON.stringify(decryptedData), {
            status: response.status,
            statusText: response.statusText,
            headers: response.headers,
          });
        } catch (error) {
          console.error('Failed to decrypt fetch response:', error);
          throw error;
        }
      }
      return new Response(JSON.stringify(responseData), {
        status: response.status,
        statusText: response.statusText,
        headers: response.headers,
      });
    }
  }

  return response;
};

// API methods
export const api = {
  auth: {
    login: async (data: { username: string; password: string }) => {
      const response = await apiClient.post('accounts/login/', data);

      // After successful login, check if session key is returned
      if (response.data && response.data.session_key) {
        console.log('🔑 Received session key from login');
        setSessionKey(response.data.session_key);
      }

      return response;
    },

    verifyOtp: (data: { username: string; otp: string }) =>
      apiClient.post('accounts/verify-otp/', data),
  },

  passwordReset: {
    request: (data: { username: string; method: 'email' | 'sms' }) =>
      apiClient.post('accounts/password-reset/request/', data),

    verifyOtp: (data: { username: string; otp: string }) =>
      apiClient.post('accounts/password-reset/verify-otp/', data),

    confirm: (data: { username: string; otp: string; new_password: string; confirm_password: string }) =>
      apiClient.post('accounts/password-reset/confirm/', data),
  },

  admin: {
    register: (data: any) => apiClient.post('accounts/register/admin/', data),
    registerSuper: (data: any) => apiClient.post('accounts/super-admin-register/', data),
  },

  school: {
    register: (data: any) => apiClient.post('accounts/register/school/', data),
  },

  logout: () => {
    console.log('🚪 Logging out - clearing session');
    setSessionKey(null);
    Cookies.remove('token');
    Cookies.remove('session_key');

  },

  profile: {
    get: () => apiClient.get('setup/profile/'),
  },

  dashboard: {
    get: () => apiClient.get('schooladmin/dashboard/'),
  },
};

export const adminApi = {
  adminUsers: {
    list: () => apiClient.get('setup/admin-users/'),
    create: (data: {
      admin_name: string;
      admin_phone?: string;
      admin_email: string;
      admin_password: string;
      school_id: number;
      is_active?: boolean;
    }) => apiClient.post('setup/admin-users/', data),
  },
  fee: {
    overviewChart: (params?: URLSearchParams) =>
      apiClient.get('/fees/report/overview-chart/', { params }),
  },
  school: {
    institutions: {
      list: () => apiClient.get('school/institutions/'),
      create: (data: any) => apiClient.post('school/institutions/', data),
      update: (id: number, data: any) => apiClient.patch(`school/institutions/${id}/`, data),
      delete: (id: number) => apiClient.delete(`school/institutions/${id}/`),
    },
    schools: {
      list: (params?: { school_id?: number }) => apiClient.get('school/schools/', { params }),
      create: (data: any) => apiClient.post('school/schools/', data),
      update: (id: number, data: any) => apiClient.patch(`school/schools/${id}/`, data),
      delete: (id: number) => apiClient.delete(`school/schools/${id}/`),
    },
    academicYears: (params?: { school_id?: number }) => apiClient.get('school/academic-years/', { params }),
    createAcademicYear: (data: { name: string; start_date: string; end_date: string; is_current: boolean; school_id?: number }) =>
      apiClient.post('school/academic-years/', data),
    updateAcademicYear: (
      id: number,
      data: { name: string; start_date: string; end_date: string; is_current: boolean; school_id?: number }
    ) => apiClient.put(`school/academic-years/${id}/`, data),
    deleteAcademicYear: (id: number, params?: { school_id?: number }) =>
      apiClient.delete(`school/academic-years/${id}/`, { params }),
  },
  profile: {
    get: () => apiClient.get('setup/profile/'),
  },

  dashboard: {
    get: (params?: { school_id?: number }) => apiClient.get('schooladmin/dashboard/', { params }),
  },

  dashboardStats: {
    get: (params?: { school_id?: number }) => apiClient.get('schooladmin/dashboard-stats/', { params }),
  },

  sidebarCounts: {
    get: () => apiClient.get('schooladmin/sidebar-counts/'),
  },

  setUpCsv: {
    post: (data: any) => apiClient.post('setup/csv/', data),
  },

  notification: {
    listAll: () => apiClient.get('notifications/'),
    markAsRead: (notificationId: number) => apiClient.put(`notifications/`,
      notificationId ? { notification_id: notificationId } : undefined
    ),
    whatsappAlertSettings: {
      list: (params?: { school_id?: number }) => apiClient.get('notifications/whatsapp-alert-settings/', { params }),
      update: (data: { alert_type: string; enabled: boolean; school_id?: number }) =>
        apiClient.patch('notifications/whatsapp-alert-settings/', data),
    },
  },

  meetings: {
    pendingAdminRequests: (params?: { status?: string; school_id?: number }) =>
      apiClient.get('meetings/admin-requests/pending/', { params }),
    approveAdminRequest: (
      requestId: number,
      data?: { final_start?: string; duration_minutes?: number; admin_note?: string; school_id?: number }
    ) => apiClient.patch(`meetings/admin-requests/${requestId}/approve/`, data || {}),
    rejectAdminRequest: (requestId: number, data?: { admin_note?: string; school_id?: number }) =>
      apiClient.patch(`meetings/admin-requests/${requestId}/reject/`, data || {}),
    proposeAdminRequestTime: (
      requestId: number,
      data: { proposed_start: string; duration_minutes?: number; admin_note?: string; school_id?: number }
    ) => apiClient.patch(`meetings/admin-requests/${requestId}/propose-time/`, data),
    triggerReminders: () => apiClient.post('meetings/reminders/trigger/', {}),
  },

  attendance: {
    studentHistory: (studentId: string, date: string) =>
      apiClient.get('attendance/history', {
        params: { student_id: studentId, year: date },
      }),
    overview: (period: string, className: string) =>
      apiClient.get(`attendance/admin/overview/?period=${period}&class_name=${className}`),

    classReport: (date: string, params?: { school_id?: number }) =>
      apiClient.get('attendance/class-report/', {
        params: { date, ...(params || {}) },
      }),

    classDetail: (className: string, date: string, params?: { school_id?: number }) =>
      apiClient.get('attendance/class-detail', {
        params: { class: className, date, ...(params || {}) },
      }),

    update: (data: { student_id: string; date: string; status: string }) =>
      apiClient.put('attendance/update/', data),

    config: {
      get: (params?: { school_id?: number }) => apiClient.get('attendance/config/', { params }),
      create: (data: {
        school_latitude: number;
        school_longitude: number;
        allowed_radius_meters: number;
        late_cutoff_time: string;
        school_id?: number;
      }) => apiClient.post('attendance/config/', data),
      update: (data: {
        school_latitude: number;
        school_longitude: number;
        allowed_radius_meters: number;
        late_cutoff_time: string;
        school_id?: number;
      }) => apiClient.put('attendance/config/', data),
      delete: (params?: { school_id?: number }) => apiClient.delete('attendance/config/', { params }),
    },
    qr: {
      startSession: (data: {
        role_scope?: 'teacher' | 'staff' | 'both';
        duration_minutes?: number;
        rotation_seconds?: number;
        school_id?: number;
      }) => apiClient.post('attendance/qr/session/start/', data),
      getSessionToken: (sessionId: number) =>
        apiClient.get(`attendance/qr/session/${sessionId}/token/`),
      closeSession: (sessionId: number) =>
        apiClient.post(`attendance/qr/session/${sessionId}/close/`, {}),
    },

    teacher: {
      dailyReport: (date: string, status?: string, params?: { school_id?: number }) =>
        apiClient.get('attendance/admin/report/teacher/daily/', {
          params: {
            date,
            ...(status ? { status } : {}),
            ...(params || {}),
          },
        }),
      dailyReportPaginated: (params: {
        date: string;
        status?: string;
        search?: string;
        page?: number;
        page_size?: number;
        school_id?: number;
      }) =>
        apiClient.get('attendance/admin/report/teacher/daily/paginated/', {
          params,
        }),
      history: (
        teacherId: string,
        viewMode: 'daily' | 'monthly' | 'yearly',
        selectedDate: string,
        month: number,
        year: number
      ) => {
        const params: Record<string, string | number> = { teacher_id: teacherId };
        if (viewMode === 'monthly') {
          params.month = month;
          params.year = year;
        } else if (viewMode === 'yearly') {
          params.year = year;
        } else {
          params.date = selectedDate;
        }
        return apiClient.get('attendance/admin/history/teacher/', { params });
      },
      bulkImport: (file: File) => {
        const formData = new FormData();
        formData.append('file', file);
        return apiClient.post('attendance/import/teacher-bulk/', formData);
      },
    },

    staff: {
      dailyReport: (date: string, status?: string, role?: string, params?: { school_id?: number }) =>
        apiClient.get('attendance/admin/report/staff/daily/', {
          params: {
            date,
            ...(status ? { status } : {}),
            ...(role ? { role } : {}),
            ...(params || {}),
          },
        }),
      dailyReportPaginated: (params: {
        date: string;
        status?: string;
        role?: string;
        search?: string;
        page?: number;
        page_size?: number;
        school_id?: number;
      }) =>
        apiClient.get('attendance/admin/report/staff/daily/paginated/', {
          params,
        }),
      history: (
        staffId: string,
        viewMode: 'daily' | 'monthly' | 'yearly',
        selectedDate: string,
        month: number,
        year: number
      ) => {
        const params: Record<string, string | number> = { staff_id: staffId };
        if (viewMode === 'monthly') {
          params.month = month;
          params.year = year;
        } else if (viewMode === 'yearly') {
          params.year = year;
        } else {
          params.date = selectedDate;
        }
        return apiClient.get('attendance/admin/history/staff/', { params });
      },

    },
  },

  academics: {
    standards: (params?: { school_id?: number }) =>
      apiClient.get('academics/standards-new/', { params }),

    createStandard: (data: { name: string; description?: string; school_id?: number }) =>
      apiClient.post('academics/standards/', data),

    bulkCreateStandards: (standards: string[], params?: { school_id?: number }) =>
      apiClient.post('academics/setup/standards/bulk/', { standards }, { params }),

    sections: (standardId: string, params?: { school_id?: number }) =>
      apiClient.get('academics/sections/', {
        params: { standard_id: standardId, ...(params || {}) },
      }),

    allSections: (params?: { school_id?: number }) => apiClient.get('academics/sections/', { params }),

    createSection: (data: { class_name: string; section_name: string; school_id?: number }) =>
      apiClient.post('academics/setup/sections/', data),

    bulkMapSections: (data: Array<{ class_name: string; sections: string[] }>, params?: { school_id?: number }) =>
      apiClient.post('academics/setup/sections/bulk-map/', data, { params }),

    structureManage: (params?: { class?: string; section?: string; subject?: string; school_id?: number }) =>
      apiClient.delete('academics/structure/manage/', { params }),

    structureEdit: (data: {
      type: 'section' | 'subject';
      class_name: string;
      old_name: string;
      new_name: string;
      school_id?: number;
    }) => apiClient.put('academics/structure/edit/', data),
  },

  students: {
    list: (params?: { school_id?: number }) => apiClient.get('schooladmin/students/', { params }),
    listPaginated: (params?: {
      page?: number;
      page_size?: number;
      search?: string;
      gender?: string;
      class_name?: string;
      section?: string;
      academic_year?: number | string;
      assignment_status?: 'all' | 'assigned' | 'unassigned';
      school_id?: number;
    }) =>
      apiClient.get('schooladmin/students/paginated/', { params }),
    enrollments: (params?: { page?: number; page_size?: number; academic_year?: number | string; school_id?: number }) =>
      apiClient.get('student/enrollments/', { params }),
    detail: (studentId: string, params?: { school_id?: number }) =>
      apiClient.get(`schooladmin/students/${studentId}/`, { params }),
    overview: (studentId: string, params?: { school_id?: number }) =>
      apiClient.get('student/overview/', {
        params: { student_id: studentId, ...(params || {}) },
      }),
    create: (data: any, params?: { school_id?: number }) =>
      apiClient.post('schooladmin/students/', data, { params }),
    update: (studentId: string, data: any, params?: { school_id?: number }) =>
      apiClient.put(`schooladmin/students/${studentId}/`, data, { params }),
    delete: (studentId: string, params?: { school_id?: number }) =>
      apiClient.delete(`schooladmin/students/${studentId}/`, { params }),
    rolePermissions: {
      list: (params?: { school_id?: number }) =>
        apiClient.get('student/role-permissions/', { params }),
      update: (data: {
        role_permissions: Record<string, boolean>;
        school_id?: number;
      }) => apiClient.put('student/role-permissions/', data),
    },
  },

  promotions: {
    meta: (params?: { school_id?: number }) => apiClient.get('promotions/admin/meta/', { params }),
    preview: (data: {
      from_year_id: number;
      to_year_id: number;
      school_id?: number;
      section_mode?: 'same_if_exists' | 'none';
      unmapped_action?: 'detain' | 'left' | 'error';
      notes?: string;
      class_mappings: Array<{ from_standard_id: number; to_standard_id: number }>;
      overrides?: Array<{
        student_id: string;
        outcome: 'PROMOTED' | 'DETAINED' | 'GRADUATED' | 'LEFT';
        target_standard_id?: number | null;
        target_section_id?: number | null;
      }>;
    }) => apiClient.post('promotions/admin/preview/', data),
    batches: (params?: { school_id?: number }) => apiClient.get('promotions/admin/batches/', { params }),
    batchDetail: (batchId: number, params?: { school_id?: number }) =>
      apiClient.get(`promotions/admin/batches/${batchId}/`, { params }),
    updateRecordStatus: (
      batchId: number,
      recordId: number,
      row_status: 'READY' | 'PENDING' | 'LEFT' | 'ERROR'
    ) => apiClient.patch(`promotions/admin/batches/${batchId}/records/${recordId}/`, { row_status }),
    deleteBatch: (batchId: number, params?: { school_id?: number }) =>
      apiClient.delete(`promotions/admin/batches/${batchId}/delete/`, { params }),
    applyBatch: (batchId: number, params?: { school_id?: number }) =>
      apiClient.post(`promotions/admin/batches/${batchId}/apply/`, { ...(params || {}) }),
  },

  fees: {
    feeStructure: (queryParams: any) => apiClient.get(`fees/structure/view/?${queryParams}`),
    feeTypes: () => apiClient.get('fees/types/'),
    feeAssign: (data: any) => apiClient.post('fees/assign/', data),
    feeUpdate: (data: any) => apiClient.put('fees/structure/update/', data),
    feeDelete: (data: any) => apiClient.delete('fees/delete/', { data }),
    feePaymentOffline: (data: any) => apiClient.post('fees/payment/offline/', data),
    feeGetConcession: (data: any) => apiClient.get(`fees/concession/?${data}`),
    feePostConcession: (data: any) => apiClient.post('fees/concession/', data),
    feePutConcession: (data: { concession_id: number; new_amount: string | number; school_id?: number }) =>
      apiClient.put('fees/concession/', data),
    feeDeleteConcession: (concessionId: number, params?: { school_id?: number }) =>
      apiClient.delete('fees/concession/', {
        params: { concession_id: concessionId, ...params },
      }),
    feeGetReport: (data: any) => apiClient.get(`fees/report/class/?${data}`),
    feeGetReportDue: (data: any) => apiClient.get(`fees/report/due-school/?${data}`),
    feeDailyReport: (data: any) => apiClient.get(`fees/report/daily/?${data}`),
    feeStatsCards: (params?: { academic_year?: string; school_id?: number }) =>
      apiClient.get('fees/report/stats-cards/', { params }),
    feeStudentSummary: (params: { student_id: string; academic_year?: string; school_id?: number }) =>
      apiClient.get('fees/student/summary/', { params }),
    feeTransaction: (data: any) => apiClient.get(`fees/receipt/?transaction_id=${data}`),
    sendReminders: (data?: { days?: number; school_id?: number }) => apiClient.post('fees/reminders/send/', data || {}),
  },

  teachers: {
    list: (params?: { school_id?: number }) => apiClient.get('schooladmin/teachers/', { params }),
    listPaginated: (params?: {
      page?: number;
      page_size?: number;
      search?: string;
      department?: string;
      status?: 'all' | 'assigned' | 'unassigned';
      class_name?: string;
      section?: string;
      school_id?: number;
    }) => apiClient.get('schooladmin/teachers/paginated/', { params }),

    setupList: (simple?: boolean, params?: { school_id?: number }) =>
      apiClient.get('setup/teachers/', {
        params: { ...(simple ? { simple: true } : {}), ...(params || {}) },
      }),

    allAllocations: (params?: { school_id?: number }) => apiClient.get('teacher/all-allocations/', { params }),

    detail: (teacherId: string | number, params?: { school_id?: number }) =>
      apiClient.get(`schooladmin/teachers/${teacherId}/`, { params }),

    create: (data: any) => apiClient.post('schooladmin/teachers/', data),

    update: (teacherId: string | number, data: any) =>
      apiClient.put(`schooladmin/teachers/${teacherId}/`, data),

    delete: (teacherId: string | number, params?: { school_id?: number }) =>
      apiClient.delete(`schooladmin/teachers/${teacherId}/`, { params }),

    assignClassTeacher: (data: {
      teacher_id: string;
      class_name: string;
      section: string;
      academic_year?: string;
      school_id?: number;
    }) => apiClient.post('schooladmin/assign-teacher/', data),

    allocationsByClass: (params?: { school_id?: number }) =>
      apiClient.get('teacher/teachers-by-class/', { params }),

    subjectAllocations: (teacherId: string) =>
      apiClient.get('teacher/subject-allocations/', {
        params: { teacher_id: teacherId },
      }),

    overview: (teacherId: string, params?: { school_id?: number }) =>
      apiClient.get('schooladmin/teacher/overview/', {
        params: { teacher_id: teacherId, ...(params || {}) },
      }),

    assignSubject: (data: {
      teacher_id: string;
      subject_name: string;
      classes: string[];
      sections?: string[];
      school_id?: number;
    }) => apiClient.post('teacher/assign-subject/', data),

    removeSubject: (data: {
      teacher_id: string;
      subject_name: string;
      class_name?: string;
    }) =>
      apiClient.delete('teacher/remove-subject/', {
        data,
      }),
    rolePermissions: {
      list: (params?: { school_id?: number; teacher_id?: string }) =>
        apiClient.get('teacher/role-permissions/', { params }),
      update: (data: {
        teacher_id: string;
        role_permissions: Record<string, boolean>;
        school_id?: number;
      }) => apiClient.put('teacher/role-permissions/', data),
    },
  },

  staff: {
    list: (params?: { school_id?: number }) => apiClient.get('schooladmin/staff/', { params }),
    listPaginated: (params?: {
      page?: number;
      page_size?: number;
      search?: string;
      role?: string;
      school_id?: number;
    }) => apiClient.get('schooladmin/staff/paginated/', { params }),
    detail: (staffId: string, params?: { school_id?: number }) =>
      apiClient.get(`schooladmin/staff/${staffId}/`, { params }),
    create: (data: any) => apiClient.post('schooladmin/staff/', data),
    update: (staffId: string, data: any) => apiClient.put(`schooladmin/staff/${staffId}/`, data),
    delete: (staffId: string, params?: { school_id?: number }) =>
      apiClient.delete(`schooladmin/staff/${staffId}/`, { params }),
    overview: (staffId: string, params?: { school_id?: number }) =>
      apiClient.get('schooladmin/staff/overview/', {
        params: { staff_id: staffId, ...(params || {}) },
      }),
    rolePermissions: {
      list: (params?: { school_id?: number; role?: string }) =>
        apiClient.get('staff/role-permissions/', { params }),
      update: (data: {
        role: string;
        role_permissions: Record<string, boolean>;
        school_id?: number;
      }) => apiClient.put('staff/role-permissions/', data),
    },
  },

  holidays: {
    list: (params?: { year?: string; month?: string; school_id?: number }) =>
      apiClient.get('holidays/admin/manage/', { params }),
    listPaginated: (params?: {
      year?: string;
      month?: string;
      search?: string;
      applicable_for?: string;
      page?: number;
      page_size?: number;
      school_id?: number;
    }) =>
      apiClient.get('holidays/admin/manage/paginated/', { params }),

    create: (data: { name: string; date: string; applicable_for: string; school_id?: number }) =>
      apiClient.post('holidays/admin/manage/', data),

    update: (data: { holiday_id: number; name: string; date: string; applicable_for: string; school_id?: number }) =>
      apiClient.put('holidays/admin/manage/', data),

    delete: (holidayId: number, params?: { school_id?: number }) =>
      apiClient.delete('holidays/admin/manage/', {
        data: { holiday_id: holidayId, ...(params || {}) },
      }),
  },

  leaves: {
    adminAction: (params?: { month?: string; year?: string; status?: string; school_id?: number }) =>
      apiClient.get('leaves/admin/action/', { params }),
    adminActionPaginated: (params?: {
      month?: string;
      year?: string;
      status?: string;
      search?: string;
      user_type?: string;
      role?: string;
      page?: number;
      page_size?: number;
      school_id?: number;
    }) =>
      apiClient.get('leaves/admin/action/paginated/', { params }),

    takeAction: (data: { leave_id: number; action: 'Approved' | 'Rejected'; comment: string; school_id?: number }) =>
      apiClient.post('leaves/admin/action/', data),
  },

  staffWork: {
    list: (params?: { staff_type?: string; date?: string; school_id?: number }) =>
      apiClient.get('staff-work/admin/manage/', { params }),

    listPaginated: (params?: {
      staff_type?: string;
      date?: string;
      search?: string;
      status?: string;
      page?: number;
      page_size?: number;
      school_id?: number;
    }) =>
      apiClient.get('staff-work/admin/manage/paginated/', { params }),

    updateTask: (data: { task_id: number; new_description: string; school_id?: number }) =>
      apiClient.put('staff-work/admin/manage/', data),

    deleteManage: (data: { task_id?: number; assignment_id?: number; school_id?: number }) =>
      apiClient.delete('staff-work/admin/manage/', { data }),

    assignBulk: (data: { staff_type: string; tasks: Array<{ description: string; staff_id: string | string[] }>; school_id?: number }) =>
      apiClient.post('staff-work/admin/assign-bulk/', data),

    recurringList: (params?: { school_id?: number }) =>
      apiClient.get('staff-work/admin/recurring-schedule/', { params }),

    recurringCreate: (data: any) =>
      apiClient.post('staff-work/admin/recurring-schedule/', data),

    recurringDelete: (scheduleId: number, params?: { school_id?: number }) =>
      apiClient.delete('staff-work/admin/recurring-schedule/', {
        data: { schedule_id: scheduleId, ...(params || {}) },
      }),
  },

  transport: {
    vehicles: {
      list: (params?: { school_id?: number }) => apiClient.get('transport/admin/vehicles/', { params }),
      create: (data: any) => apiClient.post('transport/admin/vehicles/', data),
      delete: (busId: number, params?: { school_id?: number }) =>
        apiClient.delete(`transport/admin/vehicles/${busId}/`, { params }),
    },

    routes: {
      byBus: (busNumber: string, params?: { school_id?: number }) =>
        apiClient.get('transport/admin/routes/', {
          params: { bus_number: busNumber, ...(params || {}) },
        }),
      create: (data: any) => apiClient.post('transport/admin/routes/', data),
      update: (data: any) => apiClient.patch('transport/admin/routes/', data),
      deleteByBus: (busNumber: string, params?: { school_id?: number }) =>
        apiClient.delete('transport/admin/routes/', {
          params: { bus_number: busNumber, ...(params || {}) },
        }),
    },

    stops: {
      update: (data: any) => apiClient.put('transport/admin/stops/', data),
      delete: (stopId: number, params?: { school_id?: number }) =>
        apiClient.delete('transport/admin/stops/', {
          data: { stop_id: stopId, ...(params || {}) },
        }),
    },

    passengers: {
      list: (busNumber: string, params?: { school_id?: number }) =>
        apiClient.get('transport/admin/passengers-list/', {
          params: { bus_number: busNumber, ...(params || {}) },
        }),
    },

    allocation: {
      byBus: (busNumber: string, params?: { school_id?: number }) =>
        apiClient.get('transport/admin/allocation/', {
          params: { bus_number: busNumber, ...(params || {}) },
        }),
      create: (data: any) => apiClient.post('transport/admin/allocation/', data),
      delete: (data: any) => apiClient.delete('transport/admin/allocation/', { data }),
    },

    drivers: {
      byBus: (busNumber: string, params?: { school_id?: number }) =>
        apiClient.get('transport/admin/assign-driver/', {
          params: { bus_number: busNumber, ...(params || {}) },
        }),
      assign: (data: any) => apiClient.post('transport/admin/assign-driver/', data),
      unassign: (busNumber: string, params?: { school_id?: number }) =>
        apiClient.delete('transport/admin/assign-driver/', {
          params: { bus_number: busNumber, ...(params || {}) },
        }),
    },

    expenses: {
      list: (params?: { date?: string; month?: string; year?: string; school_id?: number }) =>
        apiClient.get('transport/admin/expenses/', { params }),
    },

    active: {
      buses: (params?: { school_id?: number }) => apiClient.get('schooladmin/active-buses/', { params }),
    },
  },

  hostel: {
    dashboard: (params?: { school_id?: number }) => apiClient.get('hostel/admin/dashboard/', { params }),

    blocks: {
      list: (params?: { school_id?: number }) => apiClient.get('hostel/admin/blocks/', { params }),
      create: (data: {
        name: string;
        description?: string;
        gender_policy?: 'boys' | 'girls' | 'coed';
        is_active?: boolean;
        school_id?: number;
      }) => apiClient.post('hostel/admin/blocks/', data),
      update: (id: number, data: Partial<{
        name: string;
        description: string;
        gender_policy: 'boys' | 'girls' | 'coed';
        is_active: boolean;
        school_id: number;
      }>) => apiClient.put(`hostel/admin/blocks/${id}/`, data),
      delete: (id: number, params?: { school_id?: number }) =>
        apiClient.delete(`hostel/admin/blocks/${id}/`, { params }),
    },

    rooms: {
      list: (params?: { block_id?: number | string; school_id?: number }) =>
        apiClient.get('hostel/admin/rooms/', { params }),
      create: (data: {
        block: number | string;
        room_number: string;
        floor?: number;
        room_type?: 'standard' | 'ac' | 'deluxe';
        capacity?: number;
        monthly_fee?: number | string;
        is_active?: boolean;
        school_id?: number;
      }) => apiClient.post('hostel/admin/rooms/', data),
      update: (id: number, data: Partial<{
        block: number | string;
        room_number: string;
        floor: number;
        room_type: 'standard' | 'ac' | 'deluxe';
        capacity: number;
        monthly_fee: number | string;
        is_active: boolean;
        school_id: number;
      }>) => apiClient.put(`hostel/admin/rooms/${id}/`, data),
      delete: (id: number, params?: { school_id?: number }) =>
        apiClient.delete(`hostel/admin/rooms/${id}/`, { params }),
    },

    beds: {
      list: (params?: {
        room_id?: number | string;
        block_id?: number | string;
        available_only?: boolean;
        school_id?: number;
      }) => apiClient.get('hostel/admin/beds/', { params }),
      create: (data: {
        room: number | string;
        bed_number: string;
        is_active?: boolean;
        school_id?: number;
      }) => apiClient.post('hostel/admin/beds/', data),
      update: (id: number, data: Partial<{
        room: number | string;
        bed_number: string;
        is_active: boolean;
        school_id: number;
      }>) => apiClient.put(`hostel/admin/beds/${id}/`, data),
      delete: (id: number, params?: { school_id?: number }) =>
        apiClient.delete(`hostel/admin/beds/${id}/`, { params }),
    },

    wardenAssignments: {
      list: (params?: { block_id?: number | string; school_id?: number }) =>
        apiClient.get('hostel/admin/warden-assignments/', { params }),
      create: (data: {
        block: number | string;
        staff: number | string;
        is_primary?: boolean;
        is_active?: boolean;
        school_id?: number;
      }) => apiClient.post('hostel/admin/warden-assignments/', data),
      update: (data: {
        assignment_id: number;
        block?: number | string;
        staff?: number | string;
        is_primary?: boolean;
        is_active?: boolean;
        school_id?: number;
      }) => apiClient.put('hostel/admin/warden-assignments/', data),
      delete: (assignmentId: number) =>
        apiClient.delete('hostel/admin/warden-assignments/', {
          data: { assignment_id: assignmentId },
        }),
    },

    allocations: {
      list: (params?: {
        is_active?: 'true' | 'false';
        block_id?: number | string;
        room_id?: number | string;
        student_id?: string;
        school_id?: number;
      }) => apiClient.get('hostel/admin/allocations/', { params }),
      create: (data: {
        student: number | string;
        bed: number | string;
        academic_year: number | string;
        check_in_date: string;
        expected_check_out_date?: string | null;
        check_out_date?: string | null;
        emergency_contact_name?: string;
        emergency_contact_phone?: string;
        notes?: string;
        is_active?: boolean;
        school_id?: number;
      }) => apiClient.post('hostel/admin/allocations/', data),
      update: (data: {
        allocation_id: number;
        student?: number | string;
        bed?: number | string;
        academic_year?: number | string;
        check_in_date?: string;
        expected_check_out_date?: string | null;
        check_out_date?: string | null;
        emergency_contact_name?: string;
        emergency_contact_phone?: string;
        notes?: string;
        is_active?: boolean;
        school_id?: number;
      }) => apiClient.put('hostel/admin/allocations/', data),
      delete: (allocationId: number, data?: { school_id?: number }) =>
        apiClient.delete('hostel/admin/allocations/', {
          data: { allocation_id: allocationId, ...data },
        }),
    },

    attendance: {
      list: (params?: { date?: string; block_id?: number | string; school_id?: number }) =>
        apiClient.get('hostel/admin/attendance/', { params }),
      upsert: (data: {
        allocation: number | string;
        date: string;
        status: 'present' | 'out_pass' | 'leave' | 'absent';
        remarks?: string;
        school_id?: number;
      }) => apiClient.post('hostel/admin/attendance/', data),
    },

    incidents: {
      list: (params?: { resolved?: 'true' | 'false'; block_id?: number | string; school_id?: number }) =>
        apiClient.get('hostel/admin/incidents/', { params }),
      create: (data: {
        allocation: number | string;
        title: string;
        description: string;
        severity?: 'low' | 'medium' | 'high' | 'critical';
        occurred_at: string;
        resolved?: boolean;
        resolution_note?: string;
        school_id?: number;
      }) => apiClient.post('hostel/admin/incidents/', data),
      update: (data: {
        incident_id: number;
        title?: string;
        description?: string;
        severity?: 'low' | 'medium' | 'high' | 'critical';
        occurred_at?: string;
        resolved?: boolean;
        resolution_note?: string;
        school_id?: number;
      }) => apiClient.put('hostel/admin/incidents/', data),
    },
    inOut: {
      list: (params?: {
        movement_type?: 'in' | 'out';
        block_id?: number | string;
        allocation_id?: number | string;
        date_from?: string;
        date_to?: string;
        school_id?: number;
      }) => apiClient.get('hostel/admin/in-out/', { params }),
      create: (data: {
        allocation: number | string;
        movement_type: 'in' | 'out';
        moved_at: string;
        reason?: string;
        school_id?: number;
      }) => apiClient.post('hostel/admin/in-out/', data),
    },
  },

  inventory: {
    list: (staffType?: string, params?: { school_id?: number }) =>
      apiClient.get('inventory/admin/manage/', {
        params: { ...(staffType ? { staff_type: staffType } : {}), ...(params || {}) },
      }),

    listPaginated: (params?: {
      staff_type?: string;
      search?: string;
      page?: number;
      page_size?: number;
      school_id?: number;
    }) =>
      apiClient.get('inventory/admin/manage/paginated/', { params }),

    createBulk: (data: { staff_type: string; items: Array<{ stock_name: string; quantity: number }>; school_id?: number }) =>
      apiClient.post('inventory/admin/manage/', data),

    update: (data: { item_id: number; stock_name: string; add_stock?: number; school_id?: number }) =>
      apiClient.put('inventory/admin/manage/', data),

    delete: (itemId: number, params?: { school_id?: number }) =>
      apiClient.delete('inventory/admin/manage/', {
        data: { item_id: itemId, ...(params || {}) },
      }),
  },

  salary: {
    staff: {
      // Dashboard endpoints
      allDashboard: (params: { year: number; month: number; school_id?: number }) =>
        apiClient.get('salary/dashboard/staff/all/', { params }),

      dashboard: (params: { year: number; month: number; role: any; school_id?: number }) =>
        apiClient.get('salary/dashboard/staff/', { params }),

      dashboardStaff: (params: { year: number; month: number; staff_id: any; school_id?: number }) =>
        apiClient.get('salary/dashboard/staff/', { params }),

      // Structure management endpoints
      listStructures: (params?: {
        staff_type?: string;
        q?: string;
        page?: number;
        page_size?: number;
        school_id?: number;
      }) =>
        apiClient.get('salary/admin/structure/staff/', {
          params,
        }),

      createOrUpdate: (data: {
        staff_type: string;
        base_salary: number;
        late_penalty_percentage: number;
        school_id?: number;
      }) => apiClient.post('salary/admin/structure/staff/', data),

      deleteStructure: (staffType: string, params?: { school_id?: number }) =>
        apiClient.delete('salary/admin/structure/staff/', {
          params: { staff_type: staffType, ...(params || {}) },
        }),
    },

    teacher: {
      // Dashboard endpoints
      allDashboard: (params: { year: number; month: number; school_id?: number }) =>
        apiClient.get('salary/dashboard/teacher/all/', { params }),

      dashboard: (params: { year: number; month: number; teacher_id: any; school_id?: number }) =>
        apiClient.get('salary/dashboard/teacher/', { params }),

      // Structure management endpoints
      listStructures: (params?: {
        teacher_id?: string;
        q?: string;
        page?: number;
        page_size?: number;
        school_id?: number;
      }) =>
        apiClient.get('salary/admin/structure/teacher/', {
          params,
        }),

      createOrUpdate: (data: {
        teacher_id: string;
        base_salary: number;
        late_penalty_percentage: number;
        school_id?: number;
      }) => apiClient.post('salary/admin/structure/teacher/', data),

      deleteStructure: (teacherId: string, params?: { school_id?: number }) =>
        apiClient.delete('salary/admin/structure/teacher/', {
          params: { teacher_id: teacherId, ...(params || {}) },
        }),
    },

    // Payment management endpoints
    payments: {
      staff: {
        // List all staff payments with filters
        list: (params?: {
          staff_id?: string;
          month?: number;
          year?: number;
          status?: 'pending' | 'processed' | 'failed' | 'cancelled';
          school_id?: number;
        }) => apiClient.get('salary/admin/payments/staff/', { params }),

        // Get specific payment details
        get: (paymentId: number) =>
          apiClient.get(`salary/admin/payments/staff/${paymentId}/`),

        // Process salary for a single staff member
        process: (data: {
          staff_id: number;
          month: number;
          year: number;
          school_id?: number;
        }) => apiClient.post('salary/admin/payments/staff/process/', data),

        // Bulk process salaries for multiple staff members
        bulkProcess: (data: {
          month: number;
          year: number;
          staff_type?: string;
          school_id?: number;
        }) => apiClient.post('salary/admin/payments/staff/bulk-process/', data),

        // Update a payment record
        update: (paymentId: number, data: {
          transaction_id?: string;
          bank_reference?: string;
          payment_status?: 'pending' | 'processed' | 'failed' | 'cancelled';
          remarks?: string;
          school_id?: number;
        }) => apiClient.put(`salary/admin/payments/staff/${paymentId}/`, data),

        // Delete a payment record
        delete: (paymentId: number) =>
          apiClient.delete(`salary/admin/payments/staff/${paymentId}/`),

        processWithBank: (data: {
          staff_id: number;
          month: number;
          year: number;
          bank_code?: string;
        }, USE_REAL_GATEWAY: boolean) => apiClient.post('salary/admin/payments/staff/process-with-bank/', data),

        bulkProcessWithBank: (data: {
          month: number;
          year: number;
          staff_type?: string;
          bank_code?: string;
        }, USE_REAL_GATEWAY: boolean) => apiClient.post('salary/admin/payments/staff/bulk-process-with-bank/', data),
      },

      teacher: {
        // List all teacher payments with filters
        list: (params?: {
          teacher_id?: string;
          month?: number;
          year?: number;
          status?: 'pending' | 'processed' | 'failed' | 'cancelled';
          school_id?: number;
        }) => apiClient.get('salary/admin/payments/teacher/', { params }),

        // Get specific payment details
        get: (paymentId: number) =>
          apiClient.get(`salary/admin/payments/teacher/${paymentId}/`),

        // Process salary for a single teacher
        process: (data: {
          teacher_id: number;
          month: number;
          year: number;
          school_id?: number;
        }) => apiClient.post('salary/admin/payments/teacher/process/', data),

        // Bulk process salaries for all teachers
        bulkProcess: (data: {
          month: number;
          year: number;
          school_id?: number;
        }) => apiClient.post('salary/admin/payments/teacher/bulk-process/', data),

        // Update a payment record
        update: (paymentId: number, data: {
          transaction_id?: string;
          bank_reference?: string;
          payment_status?: 'pending' | 'processed' | 'failed' | 'cancelled';
          remarks?: string;
          school_id?: number;
        }) => apiClient.put(`salary/admin/payments/teacher/${paymentId}/`, data),

        // Delete a payment record
        delete: (paymentId: number) =>
          apiClient.delete(`salary/admin/payments/teacher/${paymentId}/`),


        processWithBank: (data: {
          teacher_id: number;
          month: number;
          year: number;
          bank_code?: string;
        }, USE_REAL_GATEWAY: boolean) => apiClient.post('salary/admin/payments/teacher/process-with-bank/', data),

        bulkProcessWithBank: (data: {
          month: number;
          year: number;
          bank_code?: string;
        }, USE_REAL_GATEWAY: boolean) => apiClient.post('salary/admin/payments/teacher/bulk-process-with-bank/', data),

      },

      verifyTransfer: (paymentType: 'staff' | 'teacher', paymentId: number) =>
        apiClient.get(`salary/admin/payments/verify/${paymentType}/${paymentId}/`),

      transferOtp: {
        send: () => apiClient.post('salary/admin/payments/otp/send/'),
        resend: () => apiClient.post('salary/admin/payments/otp/resend/'),
        verify: (data: { otp: string }) => apiClient.post('salary/admin/payments/otp/verify/', data),
      },

      // Summary endpoint
      summary: (params?: {
        month?: number;
        year?: number;
        school_id?: number;
      }) => apiClient.get('salary/admin/payments/summary/', { params }),

      cardsOverview: (params?: {
        month?: number;
        year?: number;
        school_id?: number;
      }) => apiClient.get('salary/admin/cards/overview/', { params }),
    },

    reports: {
      employeeYearly: (params: {
        employee_type: 'staff' | 'teacher';
        employee_id: string;
        year: number;
        school_id?: number;
      }) => apiClient.get('salary/admin/payments/employee-yearly-report/', { params }),
    },

    audit: {
      logs: (params?: {
        page?: number;
        page_size?: number;
        days?: number;
        month?: number;
        year?: number;
        status?: 'pending' | 'processing' | 'processed' | 'failed' | 'cancelled' | '';
        q?: string;
        school_id?: number;
      }) => apiClient.get('salary/admin/audit/logs/', { params }),
    },
  },

  audit: {
    adminLogs: (params?: {
      page?: number;
      page_size?: number;
      days?: number;
      date_from?: string;
      date_to?: string;
      q?: string;
      action?: string;
      severity?: string;
      gateway_mode?: 'REAL' | 'DUMMY';
    }) => apiClient.get('audit/admin/logs/', { params }),
    staffPaymentLogs: (params?: {
      page?: number;
      page_size?: number;
      days?: number;
      date_from?: string;
      date_to?: string;
      q?: string;
      action?: string;
      severity?: string;
      gateway_mode?: 'REAL' | 'DUMMY';
    }) => apiClient.get('audit/staff/payment-logs/', { params }),
    staffSalaryPaymentLogs: (params?: {
      page?: number;
      page_size?: number;
      days?: number;
      date_from?: string;
      date_to?: string;
      q?: string;
      action?: string;
      severity?: string;
      gateway_mode?: 'REAL' | 'DUMMY';
    }) => apiClient.get('audit/staff/payment-logs/salary/', { params }),
    staffPaymentLogsSummary: (params?: {
      days?: number;
    }) => apiClient.get('audit/staff/payment-logs/summary/', { params }),
    staffPaymentLogsExport: (params?: {
      days?: number;
    }) => apiClient.get('audit/staff/payment-logs/export/', { params }),
    staffPaymentLogDetail: (logId: number) =>
      apiClient.get(`audit/staff/payment-logs/${logId}/`),
    // Backward-compatible alias for admin scope
    logs: (params?: {
      page?: number;
      page_size?: number;
      days?: number;
      date_from?: string;
      date_to?: string;
      q?: string;
      action?: string;
      severity?: string;
      gateway_mode?: 'REAL' | 'DUMMY';
    }) => apiClient.get('audit/admin/logs/', { params }),
  },

  csv: {
    uploadStudents: (file: File, params?: { school_id?: number }) => {
      const formData = new FormData();
      formData.append('file', file);
      return apiClient.post('schooladmin/csv/', formData, { params });
    },
    uploadProfileImagesZip: (type: 'student' | 'teacher' | 'staff', zipFile: File, params?: { school_id?: number }) => {
      const formData = new FormData();
      formData.append('type', type);
      formData.append('zip_file', zipFile);
      return apiClient.post('schooladmin/bulk-upload-images/', formData, { params });
    },
  },

  calendar: {
    getAdminCalendar: (year?: number, month?: number) =>
      apiClient.get('exams/admin/calendar/', {
        params: year && month ? { year, month } : undefined,
      }),
  },

  activities: {
    recent: () =>
      apiClient.get('schooladmin/recent-activities/'),

    summary: () =>
      apiClient.get('schooladmin/activity-summary/'),

    inventoryUpdates: (params?: {
      from?: string;
      to?: string;
      filter?: 'today' | 'this_week' | 'past_week' | 'this_month' | 'past_month';
    }) =>
      apiClient.get('schooladmin/inventory-updates/', {
        params,
      }),

    staffWorkToday: () =>
      apiClient.get('schooladmin/staff-work-today/'),

    inventoryChart: () =>
      apiClient.get('schooladmin/inventory-chart/'),
  },

  announcements: {
    dashboardOverview: (params?: { school_id?: number }) =>
      apiClient.get('announcements/admin/dashboard/overview/', { params }),

    commonList: (params?: { school_id?: number }) =>
      apiClient.get('announcements/admin/common-announcements/', { params }),
    commonListPaginated: (params?: {
      q?: string;
      date?: string;
      year?: string;
      sort_by?: 'date' | 'title' | 'created_at';
      sort_dir?: 'asc' | 'desc';
      page?: number;
      page_size?: number;
      school_id?: number;
    }) =>
      apiClient.get('announcements/admin/common-announcements/paginated/', { params }),

    commonCreate: (data: { title: string; description: string; date: string; school_id?: number }) =>
      apiClient.post('announcements/admin/common-announcements/', data),

    staffList: (params?: { date?: string; role?: string; school_id?: number }) =>
      apiClient.get('announcements/admin/staff-announcements/', { params }),
    staffListPaginated: (params?: {
      q?: string;
      date?: string;
      year?: string;
      role?: string;
      visibility?: 'ALL_STAFF';
      sort_by?: 'date' | 'title' | 'created_at';
      sort_dir?: 'asc' | 'desc';
      page?: number;
      page_size?: number;
      school_id?: number;
    }) =>
      apiClient.get('announcements/admin/staff-announcements/paginated/', { params }),
    teacherListPaginated: (params?: {
      q?: string;
      date?: string;
      role?: string;
      visibility?: string;
      sort_by?: 'date' | 'title' | 'created_at';
      sort_dir?: 'asc' | 'desc';
      page?: number;
      page_size?: number;
      school_id?: number;
    }) =>
      apiClient.get('announcements/admin/teacher-announcements/paginated/', { params }),

    staffCreate: (data: {
      title: string;
      description: string;
      date: string;
      visibility: 'ALL_STAFF' | 'ROLE_SPECIFIC';
      target_role: string;
      school_id?: number;
    }) => apiClient.post('announcements/admin/staff-announcements/', data),

    staffUpdate: (id: number, data: { title: string; description: string; school_id?: number }) =>
      apiClient.put(`announcements/admin/staff-announcements/${id}/`, data),

    staffDelete: (id: number, params?: { school_id?: number }) =>
      apiClient.delete(`announcements/admin/staff-announcements/${id}/`, { params }),
  },

  exams: {
    terms: (params?: { school_id?: number }) =>
      apiClient.get('exams/admin/terms/', { params }),

    createTerm: (data: any) =>
      apiClient.post('exams/admin/terms/', data),

    updateTerm: (data: any) =>
      apiClient.put('exams/admin/terms/', data),

    deleteTerm: (termId: number, params?: { school_id?: number }) =>
      apiClient.delete('exams/admin/terms/', { params: { id: termId, ...(params || {}) } }),

    list: (termId?: number) =>
      apiClient.get('exams/list/', {
        params: termId ? { term_id: termId } : undefined,
      }),

    schedule: (params?: string | URLSearchParams | Record<string, string | number | undefined>) => {
      if (!params) return apiClient.get('exams/admin/schedule/');
      if (typeof params === 'string') return apiClient.get('exams/admin/schedule/' + (params ? `?${params}` : ''));
      return apiClient.get('exams/admin/schedule/', { params });
    },

    termSchedules: (params?: string | URLSearchParams | Record<string, string | number | undefined>) => {
      if (!params) return apiClient.get('exams/admin/term-schedules/');
      if (typeof params === 'string') return apiClient.get('exams/admin/term-schedules/' + (params ? `?${params}` : ''));
      return apiClient.get('exams/admin/term-schedules/', { params });
    },

    createSchedule: (data: any) =>
      apiClient.post('exams/admin/schedule/', data),

    updateSchedule: (data: any) =>
      apiClient.put('exams/admin/schedule/', data),

    deleteSchedule: (scheduleId: number, params?: { school_id?: number }) =>
      apiClient.delete('exams/admin/schedule/', { params: { schedule_id: scheduleId, ...(params || {}) } }),

    classResult: (params: URLSearchParams) =>
      apiClient.get(`exams/class-result/?${params.toString()}`),

    subjectAnalysis: (params: URLSearchParams) =>
      apiClient.get(`exams/subject-analysis/?${params.toString()}`),

    studentResult: (params: URLSearchParams) =>
      apiClient.get(`exams/student-result/?${params.toString()}`),

    studentMarksDetail: (params: URLSearchParams) =>
      apiClient.get(`exams/student-marks-detail/?${params.toString()}`),

    approvals: (params?: { school_id?: number }) =>
      apiClient.get('exams/admin/approvals/', { params }),

    handleApproval: (data: { request_id: number; action: 'APPROVE' | 'REJECT' }) =>
      apiClient.post('exams/admin/approvals/', data),

    overview: (params?: { school_id?: number }) =>
      apiClient.get('exams/admin/overview/', { params }),
  },

  subjects: {
    viewByClass: (className: string, params?: { school_id?: number }) =>
      apiClient.get('subjects/view/', {
        params: { class: className, ...(params || {}) },
      }),

    assignBulk: (data: { class_name: string; subjects: string[]; school_id?: number }) =>
      apiClient.post('subjects/assign/bulk/', data),


    viewAll: (params?: { school_id?: number }) => apiClient.get('subjects/view/all/', { params }),
  },

  timetable: {
    get: (params: { class: string; section: string; day?: string; school_id?: number }) => {
      // Create URLSearchParams properly
      const queryParams = new URLSearchParams();
      queryParams.append('class', params.class);
      queryParams.append('section', params.section);
      if (params.day) {
        queryParams.append('day', params.day);
      }
      if (params.school_id) {
        queryParams.append('school_id', String(params.school_id));
      }
      return apiClient.get(`timetable/manage/?${queryParams.toString()}`);
    },

    create: (data: any) =>
      apiClient.post('timetable/create/', data),

    update: (data: any) =>
      apiClient.put('timetable/manage/', data),

    autoGenerate: (data: {
      class_name: string;
      section?: string;
      sections?: string[];
      days: string[];
      day_period_counts: Record<string, number>;
      period_duration_minutes?: number;
      first_period_start_time?: string;
      max_subject_periods_per_day?: number;
      support_combined_class?: boolean;
      subject_periods?: Record<string, number>;
      section_subject_teachers?: Record<string, Record<string, string>>;
      overwrite_existing?: boolean;
      school_id?: number;
    }) =>
      apiClient.post('timetable/auto-generate/', data),

    substitutionFreeTeachers: (params: { date: string; period: string | number; class_name?: string; section?: string; school_id?: number }) =>
      apiClient.get('timetable/substitution/free-teachers/', { params }),

    substitutionAssign: (
      params: { date: string; class_name?: string; section?: string; school_id?: number },
      data: { period_no: number; subject: string; teacher_id: string }
    ) =>
      apiClient.post('timetable/substitution/assign/', data, { params }),

    substitutionRecent: (params?: { limit?: number; school_id?: number }) =>
      apiClient.get('timetable/substitution/recent/', { params }),

    delete: (params: { class: string; section: string; day?: string; period?: number; school_id?: number }) => {
      // Create URLSearchParams properly
      const queryParams = new URLSearchParams();
      queryParams.append('class', params.class);
      queryParams.append('section', params.section);
      if (params.day) {
        queryParams.append('day', params.day);
      }
      if (params.period) {
        queryParams.append('period', params.period.toString());
      }
      if (params.school_id) {
        queryParams.append('school_id', String(params.school_id));
      }
      return apiClient.delete(`timetable/manage/?${queryParams.toString()}`);
    },

    getBreaks: (className: string, params?: { school_id?: number }) => {
      const queryParams = new URLSearchParams();
      queryParams.append('class', className);
      if (params?.school_id) {
        queryParams.append('school_id', String(params.school_id));
      }
      return apiClient.get(`timetable/break/?${queryParams.toString()}`);
    },

    createBreak: (data: any) =>
      apiClient.post('timetable/break/', data),

    updateBreak: (data: any) =>
      apiClient.put('timetable/break/', data),

    deleteBreak: (id: number, params?: { school_id?: number }) => {
      const queryParams = new URLSearchParams();
      queryParams.append('id', id.toString());
      if (params?.school_id) {
        queryParams.append('school_id', String(params.school_id));
      }
      return apiClient.delete(`timetable/break/?${queryParams.toString()}`);
    },
  },

};

export const teacherApi = {
  request: (endpoint: string, options: any = {}) => {
    const normalized = endpoint.startsWith('/') ? endpoint.slice(1) : endpoint;
    const method = (options.method || 'GET').toUpperCase();
    const payload =
      typeof options.body === 'string'
        ? (() => {
          try {
            return JSON.parse(options.body);
          } catch {
            return options.body;
          }
        })()
        : (options.body ?? options.data);

    // Don't encrypt FormData
    if (payload instanceof FormData) {
      if (method === 'POST') {
        return apiClient.post(normalized, payload, {
          params: options.params,
          headers: options.headers,
        });
      }
      if (method === 'PUT') {
        return apiClient.put(normalized, payload, {
          params: options.params,
          headers: options.headers,
        });
      }
    }

    if (method === 'GET') {
      return apiClient.get(normalized, { params: options.params });
    }
    if (method === 'POST') {
      return apiClient.post(normalized, payload, {
        params: options.params,
        headers: options.headers,
      });
    }
    if (method === 'PUT') {
      return apiClient.put(normalized, payload, {
        params: options.params,
        headers: options.headers,
      });
    }
    if (method === 'PATCH') {
      return apiClient.patch(normalized, payload, {
        params: options.params,
        headers: options.headers,
      });
    }
    if (method === 'DELETE') {
      return apiClient.delete(normalized, {
        params: options.params,
        data: payload,
        headers: options.headers,
      });
    }
    return apiClient.request({
      url: normalized,
      method,
      params: options.params,
      data: payload,
      headers: options.headers,
    });
  },

  profile: {
    get: () => apiClient.get('teacher/profile/'),
  },

  subjects: {
    allocations: (teacherId: string) =>
      apiClient.get('teacher/subject-allocations/', {
        params: { teacher_id: teacherId },
      }),
    myClass: () => apiClient.get('teacher/my-class-subjects/'),
  },

  timetable: {
    myClass: (date?: string) =>
      apiClient.get('timetable/teacher/my-class-timetable/', {
        params: date ? { date } : undefined,
      }),
    mySchedule: (day?: string) =>
      apiClient.get('timetable/my-schedule/', {
        params: day ? { day } : undefined,
      }),
    substitutionFreeTeachers: (params: { date: string; period: string | number }) =>
      apiClient.get('timetable/substitution/free-teachers/', { params }),
    substitutionAssign: (params: { date: string }, data: { period_no: number; subject: string; teacher_id: string }) =>
      apiClient.post('timetable/substitution/assign/', data, { params }),
    substitutionRecent: (params?: { limit?: number }) =>
      apiClient.get('timetable/substitution/recent/', { params }),
  },

  transport: {
    myBus: () => apiClient.get('transport/my-bus/'),
    userHistory: (params: { date?: string; month?: number }) => {
      const queryParams = new URLSearchParams();
      if (params.date) queryParams.append('date', params.date);
      if (params.month) queryParams.append('month', params.month.toString());
      return apiClient.get(`transport/user/history/?${queryParams.toString()}`);
    },
    todayAttendance: () => {
      const today = new Date().toISOString().split('T')[0];
      return apiClient.get(`transport/user/history/?date=${today}`);
    },
    currentMonthHistory: () => {
      const month = new Date().getMonth() + 1;
      return apiClient.get(`transport/user/history/?month=${month}`);
    },
    attendanceByDate: (date: string) =>
      apiClient.get(`transport/user/history/?date=${date}`),
    attendanceByMonth: (month: number) =>
      apiClient.get(`transport/user/history/?month=${month}`),
  },

  notification: {
    listAll: () => apiClient.get('notifications/'),
    markAsRead: (notificationId?: number) => apiClient.put('notifications/', 
      notificationId ? { notification_id: notificationId } : undefined
    ),
  },

  meetings: {
    requestAdminMeeting: (data: {
      admin: number;
      subject: string;
      message?: string;
      preferred_start: string;
      duration_minutes: number;
    }) => apiClient.post('meetings/admin-requests/create/', data),
    myAdminMeetingRequests: () => apiClient.get('meetings/admin-requests/my/'),
    requestAdminMeetingReschedule: (
      requestId: number,
      data: { proposed_start: string; duration_minutes?: number; admin_note?: string }
    ) => apiClient.patch(`meetings/admin-requests/${requestId}/request-reschedule/`, data),
    createStudentMeeting: (data: {
      student?: number | string;
      student_id?: string;
      subject: string;
      description?: string;
      start_at: string;
      end_at: string;
      mode: 'ONLINE' | 'OFFLINE';
      meeting_link?: string;
      location?: string;
    }) => apiClient.post('meetings/teacher/create/', data),
    myStudentMeetings: () => apiClient.get('meetings/teacher/my/'),
    actionOnStudentMeeting: (
      meetingId: number,
      data: { action: 'confirm' | 'cancel' | 'complete' | 'reschedule'; start_at?: string; end_at?: string; note?: string }
    ) => apiClient.patch(`meetings/teacher/${meetingId}/action/`, data),
  },

  attendance: {
    myClass: (date: string) =>
      apiClient.get('attendance/teacher-my-class/', {
        params: { date },
      }),
    mark: (data: any) => apiClient.post('attendance/mark/', data),
    markList: (date?: string) =>
      apiClient.get('attendance/mark/', {
        params: date ? { date } : undefined,
      }),
    history: (studentId: string, year: string) =>
      apiClient.get('attendance/history/', {
        params: { student_id: studentId, year },
      }),
    update: (data: { student_id: string; date: string; status: string }) =>
      apiClient.put('attendance/update/', data),
    dailyReport: (params: { date: string; class: string; section: string }) =>
      apiClient.get('attendance/daily-report/', { params }),
    selfMark: (data: { latitude: string; longitude: string }) =>
      apiClient.post('attendance/teacher/mark/', data),
    qrScan: (token: string) =>
      apiClient.post('attendance/qr/scan/', { token }),
    selfHistory: (params?: Record<string, any>) =>
      apiClient.get('attendance/teacher/history/self/', { params }),
  },

  assignments: {
    list: (params?: Record<string, any>) =>
      apiClient.get('assignments/teacher/manage/', { params }),
    create: (data: any) => apiClient.post('assignments/teacher/manage/', data),
    update: (data: any) => apiClient.put('assignments/teacher/manage/', data),
    delete: (assignmentId: string) =>
      apiClient.delete('assignments/teacher/manage/', {
        params: { assignment_id: assignmentId },
      }),
    submissions: (assignmentId: string) =>
      apiClient.get('assignments/teacher/submissions/', {
        params: { assignment_id: assignmentId },
      }),
    deleteFile: (assignmentId: string) =>
      apiClient.delete('assignments/teacher/file/', {
        params: { assignment_id: assignmentId },
      }),
    uploadFile: (data: FormData) =>
      apiClient.post('assignments/teacher/file/', data),
    grade: (data: { submission_id: string; marks: number }) =>
      apiClient.post('assignments/grade/', data),
    report: (params?: Record<string, any>) =>
      apiClient.get('assignments/report/', { params }),
  },

  resources: {
    list: (params?: Record<string, any>) =>
      apiClient.get('class-resources/manage/', { params }),
    listAll: (params?: Record<string, any>) =>
      apiClient.get('class-resources/all/', { params }),
    summary: () =>
      apiClient.get('class-resources/summary/'),
    create: (data: any) => apiClient.post('class-resources/manage/', data),
    update: (data: { resource_id: number; description: string }) =>
      apiClient.put('class-resources/manage/', data),
    delete: (resourceId: number) =>
      apiClient.delete('class-resources/manage/', {
        params: { resource_id: resourceId },
      }),
    deleteFile: (resourceId: number) =>
      apiClient.delete('class-resources/file/', {
        params: { resource_id: resourceId },
      }),
    uploadFile: (data: FormData) =>
      apiClient.post('class-resources/file/', data),
  },

  materials: {
    list: (params?: Record<string, any>) =>
      apiClient.get('subject-materials/manage/', { params }),
    create: (data: FormData | any) =>
      apiClient.post('subject-materials/manage/', data),
    update: (data: any, headers?: Record<string, string>) =>
      apiClient.put('subject-materials/manage/', data, { headers }),
    delete: (materialId: number) =>
      apiClient.delete('subject-materials/manage/', {
        params: { material_id: materialId },
      }),
    deleteFile: (materialId: number) =>
      apiClient.delete('subject-materials/file/', {
        params: { material_id: materialId },
      }),
    uploadFile: (data: FormData) =>
      apiClient.post('subject-materials/file/', data),
  },

  tasks: {
    list: (params: Record<string, any>) =>
      apiClient.get('tasks/list/', { params }),
    create: (data: any) => apiClient.post('tasks/create/', data),
    details: (params: { date: string; task_number: string }) =>
      apiClient.get('tasks/detail/', { params }),
    update: (params: { date: string; task_number: string }, data: any) =>
      apiClient.put('tasks/detail/', data, { params }),
    delete: (params: { date: string; task_number: string }) =>
      apiClient.delete('tasks/detail/', { params }),
  },

  announcements: {
    dashboard: (params: { date: string; class: string; section: string }) =>
      apiClient.get('announcements/staff/dashboard/', { params }),
    create: (data: any) => apiClient.post('announcements/create/', data),
    teacherAdminBoard: (params?: { filter?: 'common' | 'all_teachers' | 'class_teacher' | 'subject_teacher'; date?: string }) =>
      apiClient.get('announcements/teacher/admin-board/', { params }),
    noticeBoard: (params: { date: string; class?: string; section?: string }) =>
      apiClient.get('announcements/notice-board/', { params }),
    myPosts: (params: { date: string; class?: string; section?: string; scope?: string }) =>
      apiClient.get('announcements/my-posts/', { params }),
    updateMyPost: (params: { date: string; number: number }, data: any) =>
      apiClient.put('announcements/my-posts/', data, { params }),
    deleteMyPost: (params: { date: string; number: number }) =>
      apiClient.delete('announcements/my-posts/', { params }),
  },

  exams: {
    upload: (data: any) => apiClient.post('exams/upload/', data),
    list: () => apiClient.get('exams/list/'),
    classResult: (params: { class: string; section: string; exam_type: string; term: string }) =>
      apiClient.get('exams/class-result/', { params }),
    teacherSchedule: () => apiClient.get('exams/teacher/schedule/'),
    subjectAnalysis: (params: Record<string, any>) =>
      apiClient.get('exams/subject-analysis/', { params }),
    listMarks: (params: Record<string, any>) =>
      apiClient.get('exams/list-marks/', { params }),
    uploadByClass: (params: { class: string; section: string }, data: any) =>
      apiClient.post('exams/upload/', data, { params }),
    editMarks: (data: any) => apiClient.put('exams/edit-marks/', data),
  },

  classTests: {
    list: (params?: { term?: string }) => apiClient.get('teacher/tests/manage/', { params }),
    create: (data: {
      class: string;
      section: string;
      subject: string;
      term: string;
      test_name: string;
      max_marks: number | string;
    }) => apiClient.post('teacher/tests/manage/', data),
    update: (data: { test_id: number; test_name?: string; max_marks?: number | string }) =>
      apiClient.put('teacher/tests/manage/', data),
    delete: (testId: number) =>
      apiClient.delete('teacher/tests/manage/', { params: { test_id: testId } }),
  },

  classTestMarks: {
    list: (testId: number) =>
      apiClient.get('teacher/tests/marks/', { params: { test_id: testId } }),
    save: (data: { test_id: number; marks_data: Array<{ student_id: string; marks: number }> }) =>
      apiClient.post('teacher/tests/marks/', data),
    update: (data: { test_id: number; student_id: string; marks: number }) =>
      apiClient.put('teacher/tests/marks/', data),
    delete: (params: { test_id: number; student_id?: string; reset?: boolean }) =>
      apiClient.delete('teacher/tests/marks/', { params }),
  },

  reports: {
    create: (data: any) => apiClient.post('reports/post/', data),
    submitted: (params: Record<string, any>) =>
      apiClient.get('reports/get-submitted-reports/', { params }),
    behaviorTrend: (params: { student_id: string; subject: string }) =>
      apiClient.get('performance/subject/behaviour/', { params }),
    behaviorTypeTrend: (params: { student_id: string; subject: string; behaviour_type: string }) =>
      apiClient.get('performance/subject/behaviour-type/', { params }),
  },

  studentPortal: {
    list: (params: { class: string; section: string }) =>
      apiClient.get('student/list/', { params }),
    details: (studentId: string) =>
      apiClient.get('student/details/', {
        params: { student_id: studentId },
      }),
  },

  leaves: {
    myLeaves: (params?: Record<string, any>) =>
      apiClient.get('leaves/apply/', { params }),
    apply: (data: FormData | any) =>
      apiClient.post('leaves/apply/', data),
    edit: (data: FormData | any) =>
      apiClient.put('leaves/apply/', data),
    delete: (data: any) =>
      apiClient.delete('leaves/apply/', { data }),
    studentLeaves: (params?: Record<string, any>) =>
      apiClient.get('leaves/teacher/student-leaves/', { params }),
    actOnStudentLeave: (data: { leave_id: number; action: 'Approved' | 'Rejected'; comment?: string }) =>
      apiClient.post('leaves/teacher/student-leaves/', data),
  },

  salary: {
    dashboard: (params: { month: number; year: number }) =>
      apiClient.get('salary/dashboard/teacher/', { params }),
  },

  files: {
    downloadByUrl: async (absoluteUrl: string) => {
      const token = resolveAuthToken();
      const response = await fetch(absoluteUrl, {
  headers: token ? { Authorization: `Token ${token}` } : undefined,
});
      if (!response.ok) {
        throw new Error(`Failed to download file: ${response.status}`);
      }
      return response.blob();
    },
  },
};

export const staffApi = {
  request: (endpoint: string, options: any = {}) => {
    const normalized = endpoint.startsWith('/') ? endpoint.slice(1) : endpoint;
    const method = (options.method || 'GET').toUpperCase();
    const payload =
      typeof options.body === 'string'
        ? (() => {
          try {
            return JSON.parse(options.body);
          } catch {
            return options.body;
          }
        })()
        : (options.body ?? options.data);

    // Don't encrypt FormData
    if (payload instanceof FormData) {
      if (method === 'POST') {
        return apiClient.post(normalized, payload, {
          params: options.params,
          headers: options.headers,
        });
      }
      if (method === 'PUT') {
        return apiClient.put(normalized, payload, {
          params: options.params,
          headers: options.headers,
        });
      }
    }

    if (method === 'GET') {
      return apiClient.get(normalized, { params: options.params });
    }
    if (method === 'POST') {
      return apiClient.post(normalized, payload, {
        params: options.params,
        headers: options.headers,
      });
    }
    if (method === 'PUT') {
      return apiClient.put(normalized, payload, {
        params: options.params,
        headers: options.headers,
      });
    }
    if (method === 'PATCH') {
      return apiClient.patch(normalized, payload, {
        params: options.params,
        headers: options.headers,
      });
    }
    if (method === 'DELETE') {
      return apiClient.delete(normalized, {
        params: options.params,
        data: payload,
        headers: options.headers,
      });
    }
    return apiClient.request({
      url: normalized,
      method,
      params: options.params,
      data: payload,
      headers: options.headers,
    });
  },

  profile: {
    get: () => apiClient.get('staff/profile/'),
  },

  work: {
    operations: (params?: Record<string, any>) =>
      apiClient.get('staff-work/staff/operations/', { params }),
    submit: (data: FormData | Record<string, any>) =>
      apiClient.post('staff-work/staff/operations/', data),
    update: (data: FormData | Record<string, any>) =>
      apiClient.put('staff-work/staff/operations/', data),
    reset: (data: FormData | Record<string, any>) =>
      apiClient.delete('staff-work/staff/operations/', { data }),
  },

  inventory: {
    actions: () => apiClient.get('inventory/staff/actions/'),
    consume: (data: { item_id: number; action: 'used' | string }) =>
      apiClient.post('inventory/staff/actions/', data),
    undo: (data: { log_id: number }) =>
      apiClient.delete('inventory/staff/actions/', { data }),
  },

  announcements: {
    dashboard: (params?: { date?: string; source?: string }) =>
      apiClient.get('announcements/staff/dashboard/', { params }),
  },

  attendance: {
    history: (params: { month: number; year: number }) =>
      apiClient.get('attendance/staff/history/', { params }),
    selfHistory: (params?: Record<string, any>) =>
      apiClient.get('attendance/staff/history/self/', { params }),
    mark: (data: { staff_id?: string; password?: string; latitude?: number; longitude?: number }) =>
      apiClient.post('attendance/staff/mark/', data),
    qrScan: (token: string) =>
      apiClient.post('attendance/qr/scan/', { token }),
  },

  leaves: {
    list: (params?: Record<string, any>) =>
      apiClient.get('leaves/apply/', { params }),
    apply: (data: FormData | Record<string, any>) =>
      apiClient.post('leaves/apply/', data),
  },

  salary: {
    dashboard: (params: { month: number; year: number }) =>
      apiClient.get('salary/my-dashboard/', { params }),
    staffDashboard: (params: { month: number; year: number }) =>
      apiClient.get('salary/dashboard/staff/', { params }),
  },

  meetings: {
    requestAdminMeeting: (data: {
      admin: number;
      subject: string;
      message?: string;
      preferred_start: string;
      duration_minutes: number;
    }) => apiClient.post('meetings/admin-requests/create/', data),
    adminStaffRecipients: () => apiClient.get('meetings/admin-requests/admin-staff-recipients/'),
    myAdminMeetingRequests: () => apiClient.get('meetings/admin-requests/my/'),
    pendingAdminRequests: (params?: { status?: string }) =>
      apiClient.get('meetings/admin-requests/pending/', { params }),
    approveAdminRequest: (
      requestId: number,
      data?: { final_start?: string; duration_minutes?: number; admin_note?: string }
    ) => apiClient.patch(`meetings/admin-requests/${requestId}/approve/`, data || {}),
    rejectAdminRequest: (requestId: number, data?: { admin_note?: string }) =>
      apiClient.patch(`meetings/admin-requests/${requestId}/reject/`, data || {}),
    requestAdminMeetingReschedule: (
      requestId: number,
      data: { proposed_start: string; duration_minutes?: number; admin_note?: string }
    ) => apiClient.patch(`meetings/admin-requests/${requestId}/request-reschedule/`, data),
  },

  transport: {
    myPassengers: () => apiClient.get('transport/driver/my-passengers/'),

    getTodayAttendance: (params?: { date?: string; trip_type?: 'Morning' | 'Evening' }) =>
      apiClient.get('transport/driver/attendance/', { params }),

    markAttendance: (data: {
      allocations: { allocation_id: number; status: 'Present' | 'Absent' }[];
      trip_type: 'Morning' | 'Evening';
      date: string;
    }) => apiClient.post('transport/driver/attendance/', data),

    getMyBusInfo: () => apiClient.get('transport/my-bus/'),

    getMyAttendanceHistory: (params?: { year?: number; month?: number; date?: string }) =>
      apiClient.get('transport/user/history/', { params }),

    submitExpense: (formData: FormData) =>
      apiClient.post('transport/driver/expenses/', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      }),

    getMyExpenses: () => apiClient.get('transport/driver/expenses/'),
  },

  hostel: {
    dashboard: () => apiClient.get('hostel/staff/dashboard/'),
    occupancy: (params?: { is_active?: 'true' | 'false' }) =>
      apiClient.get('hostel/staff/occupancy/', { params }),
    attendance: {
      list: (params?: { date?: string }) =>
        apiClient.get('hostel/staff/attendance/', { params }),
      upsert: (data: {
        allocation: number | string;
        date: string;
        status: 'present' | 'out_pass' | 'leave' | 'absent';
        remarks?: string;
      }) => apiClient.post('hostel/staff/attendance/', data),
    },
    incidents: {
      list: (params?: { resolved?: 'true' | 'false' }) =>
        apiClient.get('hostel/staff/incidents/', { params }),
      create: (data: {
        allocation: number | string;
        title: string;
        description: string;
        severity?: 'low' | 'medium' | 'high' | 'critical';
        occurred_at: string;
        resolved?: boolean;
        resolution_note?: string;
      }) => apiClient.post('hostel/staff/incidents/', data),
      update: (data: {
        incident_id: number;
        title?: string;
        description?: string;
        severity?: 'low' | 'medium' | 'high' | 'critical';
        occurred_at?: string;
        resolved?: boolean;
        resolution_note?: string;
      }) => apiClient.put('hostel/staff/incidents/', data),
    },
    inOut: {
      list: (params?: {
        movement_type?: 'in' | 'out';
        allocation_id?: number | string;
        date_from?: string;
        date_to?: string;
      }) => apiClient.get('hostel/staff/in-out/', { params }),
      create: (data: {
        allocation: number | string;
        movement_type: 'in' | 'out';
        moved_at: string;
        reason?: string;
      }) => apiClient.post('hostel/staff/in-out/', data),
    },
  },
};

export const studentApi = {
  request: (endpoint: string, options: any = {}) => {
    const normalized = endpoint.startsWith('/') ? endpoint.slice(1) : endpoint;
    const method = (options.method || 'GET').toUpperCase();
    const payload =
      typeof options.body === 'string'
        ? (() => {
          try {
            return JSON.parse(options.body);
          } catch {
            return options.body;
          }
        })()
        : (options.body ?? options.data);

    // Don't encrypt FormData
    if (payload instanceof FormData) {
      if (method === 'POST') {
        return apiClient.post(normalized, payload, {
          params: options.params,
          headers: options.headers,
        });
      }
      if (method === 'PUT') {
        return apiClient.put(normalized, payload, {
          params: options.params,
          headers: options.headers,
        });
      }
    }

    if (method === 'GET') {
      return apiClient.get(normalized, { params: options.params });
    }
    if (method === 'POST') {
      return apiClient.post(normalized, payload, {
        params: options.params,
        headers: options.headers,
      });
    }
    if (method === 'PUT') {
      return apiClient.put(normalized, payload, {
        params: options.params,
        headers: options.headers,
      });
    }
    if (method === 'PATCH') {
      return apiClient.patch(normalized, payload, {
        params: options.params,
        headers: options.headers,
      });
    }
    if (method === 'DELETE') {
      return apiClient.delete(normalized, {
        params: options.params,
        data: payload,
        headers: options.headers,
      });
    }
    return apiClient.request({
      url: normalized,
      method,
      params: options.params,
      data: payload,
      headers: options.headers,
    });
  },

  profile: {
    get: () => apiClient.get('student/profile/'),
  },

  subjects: {
    mySubjects: () => apiClient.get('subjects/student/my-subjects/'),
  },

  assignments: {
    feed: (date?: string) =>
      apiClient.get('assignments/student/feed/', {
        params: date ? { date } : undefined,
      }),
    feedWithFilters: (params?: Record<string, any>) =>
      apiClient.get('assignments/student/feed/', { params }),
    myAssignments: () => apiClient.get('assignments/my-assignments/'),
    myAssignmentsCombined: () => apiClient.get('assignments/student/combined/'),
    submissionByAssignment: (assignmentId: number) =>
      apiClient.get('assignments/student/submit/', {
        params: { assignment_id: assignmentId },
      }),
    submissionFallbackList: (assignmentId: number) =>
      apiClient.get('assignments/submissions/', {
        params: { assignment: assignmentId },
      }),
    submit: (data: FormData) =>
      apiClient.post('assignments/student/submit/', data),
    updateSubmission: (data: FormData) =>
      apiClient.put('assignments/student/submit/', data),
    deleteSubmission: (submissionId: number, type?: 'file') =>
      apiClient.delete('assignments/student/submit/', {
        params: {
          submission_id: submissionId,
          ...(type ? { type } : {}),
          },
        }),
      bulkImport: (file: File) => {
        const formData = new FormData();
        formData.append('file', file);
        return apiClient.post('attendance/import/teacher-bulk/', formData);
      },
    },

  timetable: {
    dashboardNow: () => apiClient.get('timetable/student/dashboard/now/'),
    myTimetable: () => apiClient.get('timetable/student/my-timetable/'),
  },

  attendance: {
    self: (year?: number) =>
      apiClient.get('attendance/student/me/', {
        params: year ? { year } : undefined,
      }),
    today: (date: string) =>
      apiClient.get('attendance/student/me/', {
        params: { date },
      }),
    monthly: (month: number, year?: number) =>
      apiClient.get('attendance/student/me/', {
        params: year ? { month, year } : { month },
      }),
    history: (studentId: string, year: string) =>
      apiClient.get('attendance/history/', {
        params: {
          student_id: studentId,
          year,
        },
      }),
  },

  exams: {
    dashboard: () => apiClient.get('exams/student/dashboard/'),
    analytics: (params?: Record<string, any>) =>
      apiClient.get('exams/student/analytics/', { params }),
    timetable: (scheduleId: number) =>
      apiClient.get('exams/student/timetable/', {
        params: { schedule_id: scheduleId },
      }),
    result: (params: { exam_type: string; term: string }) =>
      apiClient.get('exams/student-result/', { params }),
  },

  announcements: {
    board: (params?: { date?: string; source?: string }) =>
      apiClient.get('announcements/student/board/', {
        params,
      }),
    boardWithDateResponse: (params?: { date?: string; source?: string }) =>
      apiClient.get('announcements/student/board-with-date/', {
        params,
      }),
    boardWithDate: async (params?: { date?: string; source?: string }) => {
      const response = await apiClient.get('announcements/student/board/', { params });
      const payload = response.data?.data || response.data;

      const enrich = (list?: any[]) =>
        (list || []).map((item) => ({
          ...item,
          posted_date: item?.posted_date || (typeof item?.posted_time === 'string' && item.posted_time.includes('T')
            ? item.posted_time.split('T')[0]
            : item?.posted_time)
        }));

      const enriched = payload && typeof payload === 'object'
        ? {
          ...payload,
          class_announcements: enrich(payload.class_announcements),
          school_announcements: enrich(payload.school_announcements),
        }
        : payload;

      if (response.data?.data) {
        return { ...response, data: { ...response.data, data: enriched } };
      }
      return { ...response, data: enriched };
    },
  },

  notification: {
    listAll: () => apiClient.get('notifications/'),
    markAsRead: (notificationId?: number) => apiClient.put('notifications/', 
      notificationId ? { notification_id: notificationId } : undefined
    ),
  },

  meetings: {
    inbox: () => apiClient.get('meetings/student/inbox/'),
    respond: (
      meetingId: number,
      data: {
        actor_type?: 'STUDENT' | 'PARENT';
        response: 'ACCEPT' | 'RESCHEDULE';
        comment?: string;
        proposed_start?: string;
        proposed_end?: string;
      }
    ) => apiClient.patch(`meetings/student/${meetingId}/respond/`, data),
  },

  tasks: {
    view: (params?: Record<string, any>) =>
      apiClient.get('tasks/student/view/', { params }),
    viewAll: (params?: Record<string, any>) =>
      apiClient.get('tasks/student/all/', { params }),
    summary: (params?: Record<string, any>) =>
      apiClient.get('tasks/student/summary/', { params }),
  },

  materials: {
    classResources: (params?: Record<string, any>) =>
      apiClient.get('class-resources/student/view/', { params }),
    subjectMaterials: (params?: Record<string, any>) =>
      apiClient.get('subject-materials/student/view/', { params }),
    combined: () => apiClient.get('subject-materials/student/combined/'),
  },

  behaviour: {
    analytics: (params?: Record<string, any>) =>
      apiClient.get('reports/student/behavior-analytics/', { params }),
  },

  leaves: {
    history: (params?: Record<string, any>) =>
      apiClient.get('leaves/apply/', { params }),
    apply: (data: FormData) =>
      apiClient.post('leaves/apply/', data),
    edit: (data: FormData) =>
      apiClient.put('leaves/apply/', data),
    delete: (data: FormData) =>
      apiClient.delete('leaves/apply/', { data }),
  },

  fees: {
  // Get fee summary for student
  summary: (params?: { academic_year?: string, student_id?:any }) =>
    apiClient.get('fees/student/summary/', { params }),

  // Initiate Razorpay payment
  initiatePayment: (data:any) => apiClient.post('fees/payment/initiate/', data), 

  // Verify Razorpay payment
  verifyPayment: (data: {
    razorpay_order_id: string;
    razorpay_payment_id: string;
    razorpay_signature: string;
  }) => apiClient.post('fees/payment/verify/', data),

  // Cancel Razorpay payment when checkout is dismissed
  cancelPayment: (data: { razorpay_order_id: string; reason?: string }) =>
    apiClient.post('fees/payment/cancel/', data),

  // Get receipt by transaction ID or payment ID
  receipt: (params: { transaction_id?: string; payment_id?: string }) =>
    apiClient.get('fees/receipt/', { params }),

  // Get fee types list
  feeTypes: () => apiClient.get('fees/types/'),

  // Get fee structure for student's class
  feeStructure: () => apiClient.get('fees/structure/student/'),
},

  transport: {
    myBus: () => apiClient.get('transport/my-bus/'),

    userHistory: (params: { date?: string; month?: number }) => {
      const queryParams = new URLSearchParams();
      if (params.date) queryParams.append('date', params.date);
      if (params.month) queryParams.append('month', params.month.toString());

      return apiClient.get(`transport/user/history/?${queryParams.toString()}`);
    },

    todayAttendance: () => {
      const today = new Date().toISOString().split('T')[0];
      return apiClient.get(`transport/user/history/?date=${today}`);
    },

    currentMonthHistory: () => {
      const month = new Date().getMonth() + 1;
      return apiClient.get(`transport/user/history/?month=${month}`);
    },

    attendanceByDate: (date: string) =>
      apiClient.get(`transport/user/history/?date=${date}`),

    attendanceByMonth: (month: number) =>
      apiClient.get(`transport/user/history/?month=${month}`),
  },

  hostel: {
    myHostel: () => apiClient.get('hostel/student/my-hostel/'),
  },
};

export default apiClient;
