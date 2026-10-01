import axios from 'axios';
import Cookies from 'js-cookie';
import { decryptData, inspectEncryptedResponse, isEncryptedResponse } from './encryption';

const DEFAULT_API_BASE = 'https://senthurvidyalaya-backend.onrender.com/api/';

const resolveBaseUrl = (): string => {
  const envBase =
    process.env.NEXT_PUBLIC_BACKEND_API?.trim() ||
    process.env.NEXT_PUBLIC_API_URL?.trim();
  if (!envBase) return DEFAULT_API_BASE;

  const trimmed = envBase.replace(/\/+$/, '');
  const withApi = trimmed.endsWith('/api') ? trimmed : `${trimmed}/api`;
  return `${withApi}/`;
};

const resolveWebSocketBase = (): string => {
  const httpBase = resolveBaseUrl();
  const parsed = new URL(httpBase);
  const wsProtocol = parsed.protocol === 'https:' ? 'wss:' : 'ws:';
  return `${wsProtocol}//${parsed.host}`;
};

const resolveAuthToken = (): string | null => {
  const raw = Cookies.get('token');
  if (!raw) return null;
  return raw.startsWith('Token ') ? raw.slice(6) : raw;
};

const getSessionKey = (): string | null => {
  return Cookies.get('session_key') || null;
};

const transportLiveClient = axios.create({
  baseURL: resolveBaseUrl(),
  timeout: 30000,
  headers: {
    'ngrok-skip-browser-warning': 'true',
  },
});

transportLiveClient.interceptors.request.use((config) => {
  const token = Cookies.get('token');
  if (token) {
    config.headers.Authorization = token.startsWith('Token ') ? token : `Token ${token}`;
  }
  return config;
});

transportLiveClient.interceptors.response.use(
  async (response) => {
    const sessionKey = getSessionKey();

    if (sessionKey && response.data && isEncryptedResponse(response.data)) {
      if (process.env.NODE_ENV === 'development') {
        inspectEncryptedResponse(response.data);
      }
      try {
        response.data = await decryptData(response.data.response, sessionKey);
      } catch (decryptError) {
        console.error('Failed to decrypt transport response:', decryptError);
        return Promise.reject(decryptError);
      }
    }

    return response;
  },
  async (error) => {
    const sessionKey = getSessionKey();
    const encryptedErrorPayload = error?.response?.data;

    if (sessionKey && encryptedErrorPayload && isEncryptedResponse(encryptedErrorPayload)) {
      try {
        error.response.data = await decryptData(encryptedErrorPayload.response, sessionKey);
      } catch (decryptError) {
        console.error('Failed to decrypt transport error response:', decryptError);
      }
    }

    if (error?.response?.status === 401) {
      Cookies.remove('token');
      Cookies.remove('session_key');
      if (typeof window !== 'undefined') {
        window.location.href = '/';
      }
    }
    return Promise.reject(error);
  }
);

export const transportLiveApi = {
  auth: {
    token: resolveAuthToken,
  },
  websocket: {
    trackUrl: (routeId: number | string, token?: string) => {
      const authToken = token || resolveAuthToken();
      const query = authToken ? `?token=${encodeURIComponent(authToken)}` : '';
      return `${resolveWebSocketBase()}/ws/track/${routeId}/${query}`;
    },
    adminLiveUrl: (token?: string) => {
      const authToken = token || resolveAuthToken();
      const query = authToken ? `?token=${encodeURIComponent(authToken)}` : '';
      return `${resolveWebSocketBase()}/ws/track/admin/live/${query}`;
    },
  },
  staff: {
    profile: () => transportLiveClient.get('staff/profile/'),
  },
  driver: {
    myPassengers: () => transportLiveClient.get('transport/driver/my-passengers/'),
  },
  buses: {
    list: () => transportLiveClient.get('transport/transport-admin/bus-list/'),
    active: (params?: { school_id?: number }) => transportLiveClient.get('transport/active-buses/', { params }),
    dateView: (busNumber: string, date: string, params?: { school_id?: number }) =>
      transportLiveClient.get('transport/transport-admin/bus-date-view/', {
        params: { bus_number: busNumber, date, ...(params || {}) },
      }),
  },
  routes: {
    byBus: (busNumber: string) =>
      transportLiveClient.get('transport/admin/routes/', {
        params: { bus_number: busNumber },
      }),
  },
  passengers: {
    byBus: (busNumber: string) =>
      transportLiveClient.get('transport/admin/passengers-list/', {
        params: { bus_number: busNumber },
      }),
  },
};
