'use client';

import { adminApi } from '@/lib/api';

import { useEffect, useRef, useState } from 'react';
import {
  FaBus,
  FaRoute,
  FaUserFriends,
  FaMapMarkedAlt,
  FaSearch,
  FaFilter,
  FaTimes,
  FaSave,
  FaTrash,
  FaEdit,
  FaArrowLeft,
  FaEye,
  FaUsers,
  FaIdCard,
  FaPhone,
  FaEnvelope,
  FaBriefcase,
  FaMapMarkerAlt,
  FaClock,
  FaSort,
  FaSortUp,
  FaSortDown,
  FaUserTie,
  FaUserGraduate,
  FaUserCog,
  FaCheck,
  FaTimesCircle,
  FaCog,
  FaChevronLeft,
  FaChevronRight,
  FaPlus,
  FaListOl,
  FaLocationArrow,
  FaRoad,
  FaUserCheck,
  FaCalendarAlt,
  FaHistory,
  FaFileInvoiceDollar,
  FaDownload,
  FaUpload,
  FaExclamationTriangle,
  FaInfoCircle,
  FaCheckCircle,
  FaBan,
  FaBusAlt,
  FaMapPin,
  FaStopwatch,
  FaUserClock,
  FaChartLine,
  FaMoneyBillWave,
  FaFileAlt,
  FaImage,
  FaUserPlus,
  FaGlobe
} from 'react-icons/fa';
import { useTheme } from '@/contexts/ThemeContext';
import { useThemeClasses } from '@/hooks/useThemeClasses';
import { toastSuccess, toastError, toastInfo, toastWarning } from '@/lib/toast';
import { requestSidebarCountsRefresh } from '@/lib/sidebar-counts-sync';
import { SchoolScopeSelector, useSchoolScope } from '@/components/admin/SchoolScopeSelector';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

interface Vehicle {
  id: number;
  bus_number: string;
  registration_number: string;
  capacity: number;
  driver: number | null;
  route?: Route | null;
}

interface Route {
  id: number;
  vehicle: number;
  start_location: string;
  end_location: string;
  morning_start_location?: string;
  morning_end_location?: string;
  evening_start_location?: string;
  evening_end_location?: string;
  stops: Stop[];
  is_active?: boolean;
  bus_number?: string;
}

interface Stop {
  id: number;
  trip_type?: 'Morning' | 'Evening';
  stop_name: string;
  order_number: number;
  arrival_time: string;
  latitude?: number | null;
  longitude?: number | null;
}

interface LocationSearchResult {
  place_id: number;
  display_name: string;
  lat: string;
  lon: string;
}

interface Passenger {
  type: 'Student' | 'Teacher' | 'Staff';
  name: string;
  id: string;
  stop_id?: number | null;
  stop_name?: string | null;
}

interface Staff {
  id: number;
  staff_id: string;
  name: string;
  role: string;
  phone: string;
  email?: string;
}

interface Student {
  id: number;
  student_id: string;
  name: string;
  student_name?: string;
  class?: string;
  class_name?: string;
  standard_name?: string;
  section?: string;
  section_name?: string;
}

interface Teacher {
  id: number;
  teacher_id: string;
  name: string;
  teacher_name?: string;
  department?: string;
  teacher_department?: string;
}

interface AllocationData {
  bus_number: string;
  students: string[];
  teachers: string[];
  staff: string[];
}

type PassengerType = 'Student' | 'Teacher' | 'Staff';
type TripType = 'Morning' | 'Evening';

interface RouteStopDraft {
  name: string;
  time: string;
  order: number;
  latitude: string;
  longitude: string;
}

const emptyRouteForm = () => ({
  bus_number: '',
  start: '',
  end: '',
  morning_start: '',
  morning_end: '',
  evening_start: '',
  evening_end: '',
  trips: {
    Morning: [] as RouteStopDraft[],
    Evening: [] as RouteStopDraft[],
  },
});

const tripMeta: Record<TripType, { label: string; description: string; defaultTime: string }> = {
  Morning: {
    label: 'Morning Pickup',
    description: 'Pickup route towards school',
    defaultTime: '08:00',
  },
  Evening: {
    label: 'Evening Drop',
    description: 'Drop route from school',
    defaultTime: '16:00',
  },
};

interface CandidatePassengerRow {
  type: PassengerType;
  id: string;
  name: string;
  details: string;
}

interface AllocationResponse {
  status: number;
  message: string;
  bus_number: string;
  added: string[];
  errors: string[];
}

interface PassengerListResponse {
  status: number;
  bus_number: string;
  capacity: number;
  occupied: number;
  passengers: Passenger[];
}

interface DriverAssignmentResponse {
  status: number;
  bus_number: string;
  driver_name: string;
  driver_id: string;
}

interface RouteResponse {
  status: number;
  data?: Route;
  message?: string;
  bus_number?: string;
  stops?: string[];
}

interface StopResponse {
  status: number;
  message: string;
  data?: Stop;
}

interface ExpenseProof {
  id: number;
  uploader_name: string;
  uploader_id: string;
  bus_number: string;
  title: string;
  description: string;
  proof_file: string;
  timestamp: string;
}

interface BusStats {
  total_buses: number;
  active_routes: number;
  total_drivers: number;
  total_passengers: number;
  occupancy_rate: number;
  buses_with_driver: number;
}

type ViewMode = 'buses' | 'routes' | 'assignments' | 'passengers' | 'attendance' | 'addBus' | 'editBus' | 'addRoute' | 'assignDriver' | 'bulkAssign' | 'expenses' | 'editStop' | 'driverDetails';

export default function TransportManagementPage() {
  const { theme } = useTheme();
  const { get, combine } = useThemeClasses();
  const schoolScope = useSchoolScope({ storageKey: 'operations_transport_school_scope' });
  const [mode, setMode] = useState<ViewMode>('buses');
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedBus, setSelectedBus] = useState<Vehicle | null>(null);
  const [selectedRoute, setSelectedRoute] = useState<Route | null>(null);
  const [selectedStop, setSelectedStop] = useState<Stop | null>(null);
  const [dateFilter, setDateFilter] = useState('');
  const [monthFilter, setMonthFilter] = useState('');
  const [yearFilter, setYearFilter] = useState('');
  const [activeTab, setActiveTab] = useState<'overview' | 'routes' | 'passengers' | 'drivers' | 'expenses'>('overview');
  
  // Data states
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [routes, setRoutes] = useState<Route[]>([]);
  const [passengers, setPassengers] = useState<Passenger[]>([]);
  const [allStaff, setAllStaff] = useState<Staff[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [availableDrivers, setAvailableDrivers] = useState<Staff[]>([]);
  const [nonTransportStaff, setNonTransportStaff] = useState<Staff[]>([]);
  const [currentBusCapacity, setCurrentBusCapacity] = useState<number>(0);
  const [currentOccupied, setCurrentOccupied] = useState<number>(0);
  const [expenses, setExpenses] = useState<ExpenseProof[]>([]);
  const [busStats, setBusStats] = useState<BusStats>({
    total_buses: 0,
    active_routes: 0,
    total_drivers: 0,
    total_passengers: 0,
    occupancy_rate: 0,
    buses_with_driver: 0
  });
  
  // Form states
  const [busForm, setBusForm] = useState({
    bus_number: '',
    registration_number: '',
    capacity: 20
  });
  
  const [routeForm, setRouteForm] = useState(emptyRouteForm);
  const [activeRouteTrip, setActiveRouteTrip] = useState<TripType>('Morning');
  
  const [stopForm, setStopForm] = useState({
    stop_id: 0,
    trip_type: 'Morning' as TripType,
    name: '',
    time: '',
    order: 0,
    latitude: '',
    longitude: ''
  });
  
  const [bulkAssignForm, setBulkAssignForm] = useState<AllocationData>({
    bus_number: '',
    students: [] as string[],
    teachers: [] as string[],
    staff: [] as string[]
  });
  const [selectedPassengerStops, setSelectedPassengerStops] = useState<Record<string, number | null>>({});
  const [selectedPassengerKeys, setSelectedPassengerKeys] = useState<string[]>([]);
  const [assignmentBusStops, setAssignmentBusStops] = useState<Stop[]>([]);
  const [stopsLoading, setStopsLoading] = useState(false);
  const [assignmentTypeExpanded, setAssignmentTypeExpanded] = useState<Record<PassengerType, boolean>>({
    Student: true,
    Teacher: true,
    Staff: true,
  });
  const [passengerTypeExpanded, setPassengerTypeExpanded] = useState<Record<PassengerType, boolean>>({
    Student: true,
    Teacher: true,
    Staff: true,
  });
  
  const [driverAssignForm, setDriverAssignForm] = useState({
    bus_number: '',
    staff_id: ''
  });
  const [locationPickerState, setLocationPickerState] = useState<{
    isOpen: boolean;
    target: 'route_stop' | 'edit_stop';
    trip: TripType;
    stopIndex: number | null;
    center: [number, number];
    selected: [number, number] | null;
    mapKey: number;
  }>({
    isOpen: false,
    target: 'route_stop',
    trip: 'Morning',
    stopIndex: null,
    center: [13.0827, 80.2707],
    selected: null,
    mapKey: 0,
  });
  const [locationSearchQuery, setLocationSearchQuery] = useState('');
  const [locationSearchResults, setLocationSearchResults] = useState<LocationSearchResult[]>([]);
  const [isSearchingLocation, setIsSearchingLocation] = useState(false);
  const [locationSearchError, setLocationSearchError] = useState('');
  
  const [attendanceForm, setAttendanceForm] = useState({
    date: new Date().toISOString().split('T')[0],
    trip: 'Morning',
    attendance_list: [] as Array<{allocation_id: number, status: 'Present' | 'Absent'}>
  });
  const locationPickerMapRef = useRef<HTMLDivElement | null>(null);
  const locationPickerLeafletRef = useRef<L.Map | null>(null);
  const locationPickerMarkerRef = useRef<L.CircleMarker | null>(null);

  // Helper functions
  const getDriverName = (driverId: number | null | undefined) => {
    if (!driverId) return 'Not Assigned';
    const driver = allStaff.find(staff => staff.id === driverId);
    return driver ? driver.name : `Driver ID: ${driverId}`;
  };

  const getDriverDetails = (driverId: number | null | undefined) => {
    if (!driverId) return null;
    return allStaff.find(staff => staff.id === driverId);
  };

  const formatTime = (time: string) => {
    return time.substring(0, 5);
  };

  const getRouteTripStops = (route: Route, trip: TripType) => (
    route.stops
      .filter(stop => (stop.trip_type || 'Morning') === trip)
      .slice()
      .sort((a, b) => a.order_number - b.order_number)
  );

  const getRouteTripLocation = (route: Route, trip: TripType, point: 'start' | 'end') => {
    if (trip === 'Morning') {
      return point === 'start'
        ? (route.morning_start_location || route.start_location)
        : (route.morning_end_location || route.end_location);
    }

    return point === 'start'
      ? (route.evening_start_location || route.end_location)
      : (route.evening_end_location || route.start_location);
  };

  const buildRouteFormFromRoute = (busNumber: string, route?: Route | null) => {
    if (!route) {
      return {
        ...emptyRouteForm(),
        bus_number: busNumber,
      };
    }

    const morningStops = getRouteTripStops(route, 'Morning');
    const eveningStops = getRouteTripStops(route, 'Evening');

    return {
      bus_number: busNumber,
      start: route.start_location || '',
      end: route.end_location || '',
      morning_start: getRouteTripLocation(route, 'Morning', 'start'),
      morning_end: getRouteTripLocation(route, 'Morning', 'end'),
      evening_start: getRouteTripLocation(route, 'Evening', 'start'),
      evening_end: getRouteTripLocation(route, 'Evening', 'end'),
      trips: {
        Morning: morningStops.map(stop => ({
          name: stop.stop_name,
          time: stop.arrival_time.substring(0, 5),
          order: stop.order_number,
          latitude: stop.latitude?.toString() || '',
          longitude: stop.longitude?.toString() || '',
        })),
        Evening: eveningStops.map(stop => ({
          name: stop.stop_name,
          time: stop.arrival_time.substring(0, 5),
          order: stop.order_number,
          latitude: stop.latitude?.toString() || '',
          longitude: stop.longitude?.toString() || '',
        })),
      },
    };
  };

  const activeRouteStops = routeForm.trips[activeRouteTrip] || [];

  const makePassengerKey = (type: PassengerType, id: string) => `${type}:${id}`;

  const getSelectedStopId = (type: PassengerType, id: string) =>
    selectedPassengerStops[makePassengerKey(type, id)] ?? null;

  const calculateOccupancyRate = () => {
    if (vehicles.length === 0) return 0;
    const totalCapacity = vehicles.reduce((sum, v) => sum + v.capacity, 0);
    const totalPassengers = passengers.length;
    return totalCapacity > 0 ? Math.round((totalPassengers / totalCapacity) * 100) : 0;
  };

  const getStudentName = (student?: Student) =>
    student?.name || student?.student_name || '-';

  const getStudentClassSection = (student?: Student) => {
    const className = student?.class || student?.class_name || student?.standard_name || '';
    const section = student?.section || student?.section_name || '';
    if (!className && !section) return '-';
    return section ? `${className} - ${section}` : className;
  };

  const getTeacherName = (teacher?: Teacher) =>
    teacher?.name || teacher?.teacher_name || '-';

  const getTeacherDepartment = (teacher?: Teacher) =>
    teacher?.department || teacher?.teacher_department || '-';

  const candidatePassengerRows: CandidatePassengerRow[] = [
    ...students.map((student) => ({
      type: 'Student' as const,
      id: student.student_id,
      name: getStudentName(student),
      details: getStudentClassSection(student),
    })),
    ...teachers.map((teacher) => ({
      type: 'Teacher' as const,
      id: teacher.teacher_id,
      name: getTeacherName(teacher),
      details: getTeacherDepartment(teacher),
    })),
    ...nonTransportStaff.map((staffMember) => ({
      type: 'Staff' as const,
      id: staffMember.staff_id,
      name: staffMember.name || staffMember.staff_id,
      details: staffMember.role || '-',
    })),
  ];

  const selectedBusRouteStops = assignmentBusStops;
  const filteredCandidatePassengerRows = candidatePassengerRows.filter(
    (row) => assignmentTypeExpanded[row.type]
  );

  const setPassengerSelection = (type: PassengerType, id: string, checked: boolean) => {
    setBulkAssignForm((prev) => {
      const key = type === 'Student' ? 'students' : type === 'Teacher' ? 'teachers' : 'staff';
      const current = prev[key];
      const next = checked
        ? Array.from(new Set([...current, id]))
        : current.filter((itemId) => itemId !== id);
      return { ...prev, [key]: next };
    });

    if (!checked) {
      setSelectedPassengerStops((prev) => {
        const next = { ...prev };
        delete next[makePassengerKey(type, id)];
        return next;
      });
    }
  };

  const isPassengerSelected = (type: PassengerType, id: string) => {
    if (type === 'Student') return bulkAssignForm.students.includes(id);
    if (type === 'Teacher') return bulkAssignForm.teachers.includes(id);
    return bulkAssignForm.staff.includes(id);
  };

  const setPassengerStop = (type: PassengerType, id: string, stopId: number | null) => {
    setSelectedPassengerStops((prev) => ({
      ...prev,
      [makePassengerKey(type, id)]: stopId,
    }));
  };

  const isPassengerRowSelected = (type: PassengerType, id: string) =>
    selectedPassengerKeys.includes(makePassengerKey(type, id));

  const togglePassengerRowSelection = (type: PassengerType, id: string, checked: boolean) => {
    const key = makePassengerKey(type, id);
    setSelectedPassengerKeys((prev) =>
      checked ? Array.from(new Set([...prev, key])) : prev.filter((item) => item !== key)
    );
  };

  const filteredPassengers = passengers.filter((passenger) => passengerTypeExpanded[passenger.type]);

  // Add these state variables with your other useState declarations
const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
const [deleteConfig, setDeleteConfig] = useState<{
  type: 'bus' | 'route' | 'stop' | 'driver' | 'all';
  id?: number;
  busNumber?: string;
  stopId?: number;
  title: string;
  message: string;
  onConfirm: () => Promise<void>;
} | null>(null);
const [deleting, setDeleting] = useState(false);

// Add this helper function
const confirmDelete = (
  type: 'bus' | 'route' | 'stop' | 'driver' | 'all',
  config: {
    id?: number;
    busNumber?: string;
    stopId?: number;
    title: string;
    message: string;
    onConfirm: () => Promise<void>;
  }
) => {
  setDeleteConfig({ type, ...config });
  setShowDeleteConfirm(true);
};

  // Theme classes
  const getBgClass = () => combine(
    get('bg', 'primary'),
    'min-h-screen transition-colors duration-200'
  );

  const getCardGradientClass = (color: string = 'blue', intensity: string = '500') => {
    const baseClasses = combine(
      'rounded-xl sm:rounded-2xl p-4 sm:p-6 border shadow-lg transition-all duration-300 group hover:shadow-xl my-2',
      get('border', 'primary')
    );

    const gradients = {
      emerald: theme === 'dark' ? 'from-gray-800 to-emerald-900/20' : 'from-white to-emerald-50',
      blue: theme === 'dark' ? 'from-gray-800 to-blue-900/20' : 'from-white to-blue-50',
      amber: theme === 'dark' ? 'from-gray-800 to-amber-900/20' : 'from-white to-amber-50',
      red: theme === 'dark' ? 'from-gray-800 to-red-900/20' : 'from-white to-red-50',
      indigo: theme === 'dark' ? 'from-gray-800 to-indigo-900/20' : 'from-white to-indigo-50',
      pink: theme === 'dark' ? 'from-gray-800 to-pink-900/20' : 'from-white to-pink-50',
      cyan: theme === 'dark' ? 'from-gray-800 to-cyan-900/20' : 'from-white to-cyan-50',
    };

    return combine(baseClasses, 'bg-gradient-to-br', gradients[color as keyof typeof gradients] || gradients.blue);
  };

  const getInputClass = () => combine(
    'px-3 sm:px-4 py-2.5 sm:py-3.5 rounded-lg sm:rounded-xl border outline-none transition-all w-full',
    theme === 'dark' ? '[color-scheme:dark]' : '[color-scheme:light]',
    'text-xs sm:text-sm',
    '!bg-[var(--color-bg-card)]',
    '!text-[var(--color-text-primary)]',
    'border-[var(--color-border-secondary)]',
    'placeholder:text-xs sm:placeholder:text-sm placeholder:text-[var(--color-text-tertiary)]',
    'hover:border-[var(--color-border-strong)]',
    'focus:ring-2 focus:ring-blue-500',
    'focus:border-[var(--color-accent-primary)]'
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
    'px-3 sm:px-4 py-2 sm:py-2.5 rounded-lg sm:rounded-xl transition-all duration-200 font-medium hover:scale-[1.02] active:scale-[0.98]',
    'text-xs sm:text-sm',
    'border',
    get('border', 'secondary'),
    get('bg', 'card'),
    get('text', 'secondary'),
    'hover:bg-[var(--color-bg-hover)] hover:text-[var(--color-text-primary)]'
  );

  const getDangerButtonClass = () => combine(
    'px-3 sm:px-4 py-2 sm:py-2.5 rounded-lg sm:rounded-xl transition-all duration-200 font-medium',
    'text-white shadow-lg hover:shadow-xl hover:scale-[1.02] active:scale-[0.98]',
    'text-xs sm:text-sm',
    theme === 'dark'
      ? 'bg-gradient-to-r from-red-600 to-red-700 hover:from-red-700 hover:to-red-800'
      : 'bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700'
  );

  const getSuccessButtonClass = () => combine(
    'px-3 sm:px-4 py-2 sm:py-2.5 rounded-lg sm:rounded-xl transition-all duration-200 font-medium',
    'text-white shadow-lg hover:shadow-xl hover:scale-[1.02] active:scale-[0.98]',
    'text-xs sm:text-sm',
    theme === 'dark'
      ? 'bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800'
      : 'bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700'
  );

  // ============= API INTEGRATIONS =============

  // 1. VEHICLE MANAGEMENT API's
  const fetchVehicles = async () => {
    setLoading(true);
    try {
      const response = await adminApi.transport.vehicles.list(schoolScope.scopeParams);
      const data = response.data;
      console.log('Vehicles data:', data);
      const vehiclesList = Array.isArray(data.data) ? data.data : [];
      setVehicles(vehiclesList);
      
      // Update stats
      setBusStats(prev => ({
        ...prev,
        total_buses: vehiclesList.length,
        buses_with_driver: vehiclesList.filter((v: { driver: null; }) => v.driver !== null).length
      }));
    } catch (error: any) {
      if (error?.response?.status === 401) {
        toastError('Invalid or missing token');
        return;
      }
      if (error?.response?.status === 403) {
        toastError('Not authorized as admin');
        return;
      }
      console.error('Error fetching vehicles:', error);
      toastError(error?.response?.data?.message || error.message || 'Failed to fetch buses');
    } finally {
      setLoading(false);
    }
  };

  const createBus = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    
    try {
      const response = await adminApi.transport.vehicles.create({
        ...busForm,
        ...schoolScope.scopeParams,
      });
      const data = response.data;

      if (response.status === 200) {
        toastSuccess(data.message || 'Bus created successfully');
        setMode('buses');
        setBusForm({ bus_number: '', registration_number: '', capacity: 20 });
        fetchVehicles();
        requestSidebarCountsRefresh();
      } else {
        toastError(data.message || 'Failed to create bus');
      }
    } catch (error: any) {
      if (error?.response?.status === 400) {
        const errorData = error?.response?.data || {};
        const errorMessages = Object.entries(errorData).map(([field, errors]) =>
          `${field}: ${Array.isArray(errors) ? errors.join(', ') : errors}`
        ).join(', ');
        toastError(errorMessages || 'Failed to create bus');
        return;
      }
      console.error('Error creating bus:', error);
      toastError(error?.response?.data?.message || error.message || 'Network error');
    } finally {
      setLoading(false);
    }
  };

  const deleteBus = (busId: number) => {
  confirmDelete('bus', {
    id: busId,
    title: 'Delete Bus',
    message: 'Are you sure you want to delete this bus? This action will also remove any routes, stops, and passenger assignments associated with this bus. This cannot be undone.',
    onConfirm: async () => {
      setDeleting(true);
      try {
        const response = await adminApi.transport.vehicles.delete(busId, schoolScope.scopeParams);
        if (response.status === 200) {
          const data = response.data;
          toastSuccess(data.message || 'Bus deleted successfully');
          fetchVehicles();
          requestSidebarCountsRefresh();
        }
      } catch (error: any) {
        if (error?.response?.status === 404) {
          toastError(error?.response?.data?.detail || 'Bus not found');
          return;
        }
        console.error('Error deleting bus:', error);
        toastError(error?.response?.data?.message || error.message || 'Network error');
      } finally {
        setDeleting(false);
        setShowDeleteConfirm(false);
      }
    }
  });
};

  // 2. ROUTE MANAGEMENT API's
  const fetchRouteForBus = async (busNumber: string) => {
    if (!busNumber) {
      toastInfo('Bus number is required');
      return null;
    }
    
    try {
      const response = await adminApi.transport.routes.byBus(busNumber, schoolScope.scopeParams);
      if (response.status === 200) {
        const payload: RouteResponse = response.data;
        return payload.data || null;
      }
      return null;
    } catch (error: any) {
      if (error?.response?.status === 404) {
        const data = error?.response?.data;
        if (data?.message) {
          toastError(data.message);
        }
        return null;
      }
      console.error('Error fetching route:', error);
      return null;
    }
  };

  const loadAssignmentBusStops = async (busNumber: string) => {
    if (!busNumber) {
      setAssignmentBusStops([]);
      return;
    }

    const busFromList = vehicles.find((vehicle) => vehicle.bus_number === busNumber);
    const listStops = busFromList?.route?.stops || [];
    if (listStops.length > 0) {
      setAssignmentBusStops(listStops);
      return;
    }

    setStopsLoading(true);
    try {
      const response = await adminApi.transport.routes.byBus(busNumber, schoolScope.scopeParams);
      if (response.status === 200) {
        const payload: RouteResponse = response.data;
        setAssignmentBusStops(payload.data?.stops || []);
      } else {
        setAssignmentBusStops([]);
      }
    } catch {
      setAssignmentBusStops([]);
    } finally {
      setStopsLoading(false);
    }
  };

  const fetchAllRoutes = async () => {
    try {
      const routePromises = vehicles.map(vehicle =>
        fetchRouteForBus(vehicle.bus_number)
      );

      const routeResults = await Promise.all(routePromises);
      const validRoutes = routeResults.filter((route): route is Route => route !== null);

      const routesWithBusNumber = validRoutes.map(route => {
        const vehicle = vehicles.find(v => v.id === route.vehicle);
        return {
          ...route,
          bus_number: vehicle?.bus_number
        };
      });

      setRoutes(routesWithBusNumber);
      setBusStats(prev => ({ ...prev, active_routes: routesWithBusNumber.length }));
    } catch (error: any) {
      console.error('Error fetching routes:', error);
    }
  };

  const createRoute = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {

      const formatStops = (stops: RouteStopDraft[]) => stops.map(stop => ({
        name: stop.name,
        time: stop.time,
        order: stop.order,
        latitude: stop.latitude === '' ? null : Number(stop.latitude),
        longitude: stop.longitude === '' ? null : Number(stop.longitude)
      }));

      const payload = {
        bus_number: routeForm.bus_number,
        start: routeForm.morning_start,
        end: routeForm.morning_end,
        morning_start: routeForm.morning_start,
        morning_end: routeForm.morning_end,
        evening_start: routeForm.evening_start,
        evening_end: routeForm.evening_end,
        trips: {
          morning: {
            start: routeForm.morning_start,
            end: routeForm.morning_end,
            stops: formatStops(routeForm.trips.Morning),
          },
          evening: {
            start: routeForm.evening_start,
            end: routeForm.evening_end,
            stops: formatStops(routeForm.trips.Evening),
          },
        },
      };

      console.log('Sending route payload:', payload);

      const response = await adminApi.transport.routes.create({
        ...payload,
        ...schoolScope.scopeParams,
      });
      const data = response.data;

      if (response.status === 200) {
        toastSuccess(data.message || 'Route updated successfully');
        setMode('routes');
        setRouteForm(emptyRouteForm());
        fetchAllRoutes();
        fetchVehicles();
        requestSidebarCountsRefresh();
      } else {
        toastError(data.error || data.message || 'Failed to create route');
      }
    } catch (error: any) {
      console.error('Error creating route:', error);
      toastError(error?.response?.data?.error || error?.response?.data?.message || error.message || 'Network error');
    } finally {
      setLoading(false);
    }
  };


  const deleteRoute = (busNumber: string) => {
  confirmDelete('route', {
    busNumber,
    title: 'Delete Route',
    message: `Are you sure you want to delete the entire route for Bus ${busNumber}? This will remove all stops and cannot be undone.`,
    onConfirm: async () => {
      setDeleting(true);
      try {
        const response = await adminApi.transport.routes.deleteByBus(busNumber, schoolScope.scopeParams);
        if (response.status === 200) {
          const data = response.data;
          toastSuccess(data.message || `Route deleted for Bus ${busNumber}`);
          fetchAllRoutes();
          fetchVehicles();
          requestSidebarCountsRefresh();
        }
      } catch (error: any) {
        console.error('Error deleting route:', error);
        toastError('Failed to delete route');
      } finally {
        setDeleting(false);
        setShowDeleteConfirm(false);
      }
    }
  });
};

  // 3. STOP MANAGEMENT API's
  const updateStop = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const payload = {
        stop_id: stopForm.stop_id,
        trip_type: stopForm.trip_type,
        name: stopForm.name,
        time: stopForm.time,
        order: stopForm.order,
        latitude: stopForm.latitude === '' ? null : Number(stopForm.latitude),
        longitude: stopForm.longitude === '' ? null : Number(stopForm.longitude)
      };

      const response = await adminApi.transport.stops.update({
        ...payload,
        ...schoolScope.scopeParams,
      });
      const data = response.data;

      if (response.status === 200) {
        toastSuccess(data.message || 'Stop updated successfully');
        setMode('routes');
        setSelectedStop(null);
        setStopForm({ stop_id: 0, trip_type: 'Morning', name: '', time: '', order: 0, latitude: '', longitude: '' });
        fetchAllRoutes();
        requestSidebarCountsRefresh();
      } else {
        toastError(data.message || 'Failed to update stop');
      }
    } catch (error: any) {
      console.error('Error updating stop:', error);
      toastError('Failed to update stop');
    } finally {
      setLoading(false);
    }
  };

  const deleteStop = (stopId: number) => {
  confirmDelete('stop', {
    stopId,
    title: 'Delete Stop',
    message: 'Are you sure you want to delete this stop? This action cannot be undone.',
    onConfirm: async () => {
      setDeleting(true);
      try {
        const response = await adminApi.transport.stops.delete(stopId, schoolScope.scopeParams);
        if (response.status === 200) {
          const data = response.data;
          toastSuccess(data.message || 'Stop deleted successfully');
          fetchAllRoutes();
          requestSidebarCountsRefresh();
        }
      } catch (error: any) {
        console.error('Error deleting stop:', error);
        toastError('Failed to delete stop');
      } finally {
        setDeleting(false);
        setShowDeleteConfirm(false);
      }
    }
  });
};

  // 4. PASSENGER ALLOCATION API's
  const fetchPassengerList = async (busNumber: string) => {
    if (!busNumber) {
      toastInfo('Bus number is required');
      return;
    }

    const busRecord = vehicles.find((vehicle) => vehicle.bus_number === busNumber) || null;
    setSelectedBus(busRecord);
    setBulkAssignForm((prev) => ({ ...prev, bus_number: busNumber }));

    try {
      const response = await adminApi.transport.passengers.list(busNumber, schoolScope.scopeParams);

      if (response.status === 200) {
        const data: PassengerListResponse = response.data;
        setPassengers(data.passengers || []);
        setSelectedPassengerKeys([]);
        setCurrentBusCapacity(data.capacity || 0);
        setCurrentOccupied(data.occupied || 0);
        setMode('passengers');

        // Update stats
        setBusStats(prev => ({
          ...prev,
          total_passengers: data.occupied || 0,
          occupancy_rate: data.capacity > 0 ? Math.round((data.occupied / data.capacity) * 100) : 0
        }));
      } else {
        toastError('Failed to fetch passengers');
      }
    } catch (error: any) {
      console.error('Error fetching passengers:', error);
      toastError('Failed to fetch passengers');
    }
  };

  const fetchAllocation = async (busNumber: string) => {
    try {
      const response = await adminApi.transport.allocation.byBus(busNumber, schoolScope.scopeParams);

      if (response.status === 200) {
        const data = response.data;
        return data.data;
      }
      return null;
    } catch (error: any) {
      console.error('Error fetching allocation:', error);
      return null;
    }
  };

  const extractAssignedIdsFromAllocation = (allocationData: any) => {
    const stopMap: Record<string, number | null> = {};

    const normalizeArray = (value: any, type: PassengerType): string[] => {
      if (!Array.isArray(value)) return [];
      const ids: string[] = [];
      value.forEach((item) => {
        if (typeof item === 'string' || typeof item === 'number') {
          ids.push(String(item));
          return;
        }
        if (item && typeof item === 'object') {
          const id = String(
            item.student_id ??
            item.teacher_id ??
            item.staff_id ??
            item.id ??
            item.user_id ??
            ''
          );
          if (!id) return;
          ids.push(id);
          if (item.stop_id !== undefined && item.stop_id !== null && item.stop_id !== '') {
            const stopIdNum = Number(item.stop_id);
            if (!Number.isNaN(stopIdNum)) {
              stopMap[makePassengerKey(type, id)] = stopIdNum;
            }
          }
        }
      });
      return ids.filter((id) => id.length > 0);
    };

    const passengers = Array.isArray(allocationData?.passengers) ? allocationData.passengers : [];

    const fromPassengers = {
      students: passengers
        .filter((p: any) => (p?.type || '').toLowerCase() === 'student')
        .map((p: any) => {
          const id = String(p.id ?? p.student_id ?? '');
          if (id && p?.stop_id !== undefined && p?.stop_id !== null && p?.stop_id !== '') {
            const stopIdNum = Number(p.stop_id);
            if (!Number.isNaN(stopIdNum)) {
              stopMap[makePassengerKey('Student', id)] = stopIdNum;
            }
          }
          return id;
        })
        .filter(Boolean),
      teachers: passengers
        .filter((p: any) => (p?.type || '').toLowerCase() === 'teacher')
        .map((p: any) => {
          const id = String(p.id ?? p.teacher_id ?? '');
          if (id && p?.stop_id !== undefined && p?.stop_id !== null && p?.stop_id !== '') {
            const stopIdNum = Number(p.stop_id);
            if (!Number.isNaN(stopIdNum)) {
              stopMap[makePassengerKey('Teacher', id)] = stopIdNum;
            }
          }
          return id;
        })
        .filter(Boolean),
      staff: passengers
        .filter((p: any) => (p?.type || '').toLowerCase() === 'staff')
        .map((p: any) => {
          const id = String(p.id ?? p.staff_id ?? '');
          if (id && p?.stop_id !== undefined && p?.stop_id !== null && p?.stop_id !== '') {
            const stopIdNum = Number(p.stop_id);
            if (!Number.isNaN(stopIdNum)) {
              stopMap[makePassengerKey('Staff', id)] = stopIdNum;
            }
          }
          return id;
        })
        .filter(Boolean),
    };

    const students = normalizeArray(
      allocationData?.student_details ??
      allocationData?.students ??
      allocationData?.student_ids ??
      allocationData?.assigned_students,
      'Student'
    );
    const teachers = normalizeArray(
      allocationData?.teacher_details ??
      allocationData?.teachers ??
      allocationData?.teacher_ids ??
      allocationData?.assigned_teachers,
      'Teacher'
    );
    const staff = normalizeArray(
      allocationData?.staff_details ??
      allocationData?.staff ??
      allocationData?.staff_ids ??
      allocationData?.assigned_staff,
      'Staff'
    );

    return {
      students: Array.from(new Set([...students, ...fromPassengers.students])),
      teachers: Array.from(new Set([...teachers, ...fromPassengers.teachers])),
      staff: Array.from(new Set([...staff, ...fromPassengers.staff])),
      stopMap,
    };
  };

  const bulkAssignPassengers = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const payload = {
        bus_number: bulkAssignForm.bus_number,
        students: bulkAssignForm.students.map((id) => ({
          id,
          stop_id: getSelectedStopId('Student', id),
        })),
        teachers: bulkAssignForm.teachers.map((id) => ({
          id,
          stop_id: getSelectedStopId('Teacher', id),
        })),
        staff: bulkAssignForm.staff.map((id) => ({
          id,
          stop_id: getSelectedStopId('Staff', id),
        })),
      };

      console.log('Sending bulk assignment payload:', payload);

      const response = await adminApi.transport.allocation.create({
        ...payload,
        ...schoolScope.scopeParams,
      });
      const data: AllocationResponse = response.data;
      console.log('Bulk assignment response:', data);

      toastSuccess(`Assignment completed with status: ${data.message}`);

      if (response.status === 200) {
        if (data.errors && data.errors.length > 0) {
          toastWarning(`Assignments processed with errors: ${data.errors.join(', ')}`);
        } else {
          toastSuccess(`Successfully assigned ${data.added?.length || 0} passengers`);
        }

        setMode('buses');
        setBulkAssignForm({ bus_number: '', students: [], teachers: [], staff: [] });
        setSelectedPassengerStops({});
        setAssignmentBusStops([]);
        requestSidebarCountsRefresh();
      } else {
        toastError(data.message || 'Failed to assign passengers');
      }
    } catch (error: any) {
      console.error('Error assigning passengers:', error);
      toastError(error?.response?.data?.message || error.message || 'Network error');
    } finally {
      setLoading(false);
    }
  };

  const removePassengers = async (busNumber: string, students: string[], teachers: string[], staff: string[]) => {
    try {
      const payload = {
        bus_number: busNumber,
        students: students,
        teachers: teachers,
        staff: staff,
        ...schoolScope.scopeParams,
      };

      const response = await adminApi.transport.allocation.delete(payload);

      if (response.status === 200) {
        const data = response.data;
        toastSuccess(data.message || `Removed passengers from Bus ${busNumber}`);
        if (selectedBus) {
          fetchPassengerList(selectedBus.bus_number);
        }
        requestSidebarCountsRefresh();
      }
    } catch (error: any) {
      console.error('Error removing passengers:', error);
      toastError('Failed to remove passengers');
    }
  };

  // 5. DRIVER ASSIGNMENT API's
  const fetchDriverForBus = async (busNumber: string) => {
    try {
      const response = await adminApi.transport.drivers.byBus(busNumber, schoolScope.scopeParams);

      if (response.status === 200) {
        const data: DriverAssignmentResponse = response.data;
        return data;
      }
      return null;
    } catch (error: any) {
      console.error('Error fetching driver:', error);
      return null;
    }
  };

  const assignDriver = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    
    try {
      console.log('Sending driver assignment:', driverAssignForm);
      
      const response = await adminApi.transport.drivers.assign({
        ...driverAssignForm,
        ...schoolScope.scopeParams,
      });
      const data = response.data;
      console.log('Driver assignment response:', data);

      if (response.status === 200) {
        toastSuccess(data.message || 'Driver assigned successfully');
        setMode('buses');
        setDriverAssignForm({ bus_number: '', staff_id: '' });
        fetchVehicles();
        requestSidebarCountsRefresh();
      } else {
        toastError(data.message || 'Failed to assign driver');
      }
    } catch (error: any) {
      if (error?.response?.status === 400) {
        toastError(error?.response?.data?.error || error?.response?.data?.message || 'Failed to assign driver');
        return;
      }
      console.error('Error assigning driver:', error);
      toastError(error?.response?.data?.message || error.message || 'Network error');
    } finally {
      setLoading(false);
    }
  };

  const confirmRemoveAllPassengers = (busNumber: string) => {
  confirmDelete('all', {
    busNumber,
    title: 'Remove All Passengers',
    message: `Are you sure you want to remove ALL passengers from Bus ${busNumber}? This action cannot be undone.`,
    onConfirm: async () => {
      setDeleting(true);
      try {
        await removePassengers(
          busNumber,
          passengers.filter(p => p.type === 'Student').map(p => p.id),
          passengers.filter(p => p.type === 'Teacher').map(p => p.id),
          passengers.filter(p => p.type === 'Staff').map(p => p.id)
        );
        toastSuccess(`All passengers removed from Bus ${busNumber}`);
      } catch (error) {
        toastError('Failed to remove passengers');
      } finally {
        setDeleting(false);
        setShowDeleteConfirm(false);
      }
    }
  });
};

  const unassignDriver = (busNumber: string) => {
  confirmDelete('driver', {
    busNumber,
    title: 'Unassign Driver',
    message: `Are you sure you want to unassign the driver from Bus ${busNumber}?`,
    onConfirm: async () => {
      setDeleting(true);
      try {
        const response = await adminApi.transport.drivers.unassign(busNumber, schoolScope.scopeParams);
        if (response.status === 200) {
          const data = response.data;
          toastSuccess(data.message || 'Driver unassigned successfully');
          fetchVehicles();
          requestSidebarCountsRefresh();
        }
      } catch (error: any) {
        console.error('Error unassigning driver:', error);
        toastError('Failed to unassign driver');
      } finally {
        setDeleting(false);
        setShowDeleteConfirm(false);
      }
    }
  });
};

  // 6. EXPENSE MANAGEMENT API's
  const fetchExpenses = async (date?: string, month?: string, year?: string) => {
    try {
      const response = await adminApi.transport.expenses.list({
        date: date || undefined,
        month: month || undefined,
        year: year || undefined,
        ...schoolScope.scopeParams,
      });

      if (response.status === 200) {
        const data = response.data;
        setExpenses(data.data || []);
        setMode('expenses');
      } else {
        toastError('Failed to fetch expenses');
      }
    } catch (error: any) {
      console.error('Error fetching expenses:', error);
      toastError('Failed to fetch expenses');
    }
  };

  // 7. Fetch supporting data
  const fetchTransportStaff = async () => {
    try {
      const response = await adminApi.staff.list(schoolScope.scopeParams);
      const data = response.data;
      const staffList = Array.isArray(data) ? data : (data.data || []);
      setAllStaff(staffList);

      const transportStaff = staffList.filter((staff: Staff) =>
        staff.role.toLowerCase() === 'transport staff' ||
        staff.role.toLowerCase() === 'transport_staff' ||
        staff.role.toLowerCase() === 'driver'
      );
      setAvailableDrivers(transportStaff);
      setBusStats(prev => ({ ...prev, total_drivers: transportStaff.length }));

      const nonTransport = staffList.filter((staff: Staff) =>
        staff.role.toLowerCase() !== 'transport staff' &&
        staff.role.toLowerCase() !== 'transport_staff' &&
        staff.role.toLowerCase() !== 'driver'
      );
      setNonTransportStaff(nonTransport);
    } catch (error: any) {
      console.error('Error fetching staff:', error);
    }
  };

  const fetchStudents = async () => {
    try {
      const response = await adminApi.students.list(schoolScope.scopeParams);
      const data = response.data;
      const studentsList = Array.isArray(data) ? data : (data.data || []);
      setStudents(studentsList);
    } catch (error: any) {
      console.error('Error fetching students:', error);
    }
  };

  const fetchTeachers = async () => {
    try {
      const response = await adminApi.teachers.list(schoolScope.scopeParams);
      const data = response.data;
      const teachersList = Array.isArray(data) ? data : (data.data || []);
      setTeachers(teachersList);
    } catch (error: any) {
      console.error('Error fetching teachers:', error);
    }
  };

  // Form handlers
  const addStop = () => {
    const newOrder = activeRouteStops.length + 1;
    setRouteForm((prev) => ({
      ...prev,
      trips: {
        ...prev.trips,
        [activeRouteTrip]: [
          ...prev.trips[activeRouteTrip],
          { name: '', time: tripMeta[activeRouteTrip].defaultTime, order: newOrder, latitude: '', longitude: '' }
        ]
      }
    }));
  };

  const updateStopForm = (index: number, field: 'name' | 'time' | 'latitude' | 'longitude', value: string) => {
    setRouteForm((prev) => {
      const newStops = [...prev.trips[activeRouteTrip]];
      newStops[index] = { ...newStops[index], [field]: value };
      return {
        ...prev,
        trips: {
          ...prev.trips,
          [activeRouteTrip]: newStops,
        },
      };
    });
  };

  const removeStopForm = (index: number) => {
    const newStops = activeRouteStops.filter((_, i) => i !== index);
    const reorderedStops = newStops.map((stop, idx) => ({ ...stop, order: idx + 1 }));
    setRouteForm({
      ...routeForm,
      trips: {
        ...routeForm.trips,
        [activeRouteTrip]: reorderedStops,
      },
    });
  };

  const openStopLocationPicker = (index: number) => {
    const stop = activeRouteStops[index];
    const lat = stop?.latitude !== '' ? Number(stop.latitude) : null;
    const lng = stop?.longitude !== '' ? Number(stop.longitude) : null;
    const hasValidCoords =
      typeof lat === 'number' &&
      Number.isFinite(lat) &&
      typeof lng === 'number' &&
      Number.isFinite(lng);

    setLocationPickerState((prev) => ({
      isOpen: true,
      target: 'route_stop',
      trip: activeRouteTrip,
      stopIndex: index,
      center: hasValidCoords ? [lat as number, lng as number] : [13.0827, 80.2707],
      selected: hasValidCoords ? [lat as number, lng as number] : null,
      mapKey: prev.mapKey + 1,
    }));
    setLocationSearchQuery('');
    setLocationSearchResults([]);
    setLocationSearchError('');
  };

  const openEditStopLocationPicker = () => {
    const lat = stopForm.latitude !== '' ? Number(stopForm.latitude) : null;
    const lng = stopForm.longitude !== '' ? Number(stopForm.longitude) : null;
    const hasValidCoords =
      typeof lat === 'number' &&
      Number.isFinite(lat) &&
      typeof lng === 'number' &&
      Number.isFinite(lng);

    setLocationPickerState((prev) => ({
      isOpen: true,
      target: 'edit_stop',
      trip: stopForm.trip_type,
      stopIndex: null,
      center: hasValidCoords ? [lat as number, lng as number] : [13.0827, 80.2707],
      selected: hasValidCoords ? [lat as number, lng as number] : null,
      mapKey: prev.mapKey + 1,
    }));
    setLocationSearchQuery('');
    setLocationSearchResults([]);
    setLocationSearchError('');
  };

  const searchStopLocation = async () => {
    const query = locationSearchQuery.trim();
    if (!query) {
      setLocationSearchError('Enter a place or address to search.');
      setLocationSearchResults([]);
      return;
    }

    setIsSearchingLocation(true);
    setLocationSearchError('');
    setLocationSearchResults([]);
    try {
      const params = new URLSearchParams({
        q: query,
        format: 'jsonv2',
        limit: '5',
      });
      const response = await fetch(`https://nominatim.openstreetmap.org/search?${params}`, {
        headers: { 'Accept-Language': navigator.language || 'en' },
      });
      if (!response.ok) throw new Error('Location search is unavailable. Please try again.');

      const results = (await response.json()) as LocationSearchResult[];
      if (!results.length) {
        setLocationSearchError('No matching places found. Try a nearby landmark or address.');
        return;
      }
      setLocationSearchResults(results);
    } catch (error) {
      setLocationSearchError(error instanceof Error ? error.message : 'Could not search for that location.');
    } finally {
      setIsSearchingLocation(false);
    }
  };

  const selectStopSearchResult = (result: LocationSearchResult) => {
    const lat = Number(result.lat);
    const lng = Number(result.lon);
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) return;

    const position: [number, number] = [lat, lng];
    const map = locationPickerLeafletRef.current;
    map?.setView(position, 16, { animate: true });
    locationPickerMarkerRef.current?.remove();
    locationPickerMarkerRef.current = L.circleMarker(position, {
      radius: 8,
      color: '#2563eb',
      fillColor: '#2563eb',
      fillOpacity: 0.7,
    });
    if (map) locationPickerMarkerRef.current.addTo(map);

    if (locationPickerState.target === 'edit_stop') {
      setStopForm((prev) => ({ ...prev, latitude: String(lat), longitude: String(lng) }));
    } else if (locationPickerState.stopIndex !== null) {
      const { trip, stopIndex } = locationPickerState;
      setRouteForm((prev) => {
        const stops = [...prev.trips[trip]];
        if (!stops[stopIndex]) return prev;
        stops[stopIndex] = { ...stops[stopIndex], latitude: String(lat), longitude: String(lng) };
        return { ...prev, trips: { ...prev.trips, [trip]: stops } };
      });
    }
    setLocationSearchResults([]);
  };

  const closeStopLocationPicker = () => {
    setLocationPickerState((prev) => ({
      ...prev,
      isOpen: false,
      target: 'route_stop',
      trip: 'Morning',
      stopIndex: null,
      selected: null,
    }));
  };

  useEffect(() => {
    if (!locationPickerState.isOpen) return;
    if (!locationPickerMapRef.current) return;

    const map = L.map(locationPickerMapRef.current,{
    minZoom: 3,
    maxBounds: L.latLngBounds(L.latLng(-90, -180), L.latLng(90, 180)),
    maxBoundsViscosity: 1.0,
    worldCopyJump: true
  }).setView(locationPickerState.center, 14);
    locationPickerLeafletRef.current = map;

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
      maxZoom: 19,
      minZoom: 3,
      bounds: L.latLngBounds(L.latLng(-90, -180), L.latLng(90, 180)),
    }).addTo(map);

    if (locationPickerState.selected) {
      locationPickerMarkerRef.current = L.circleMarker(locationPickerState.selected, {
        radius: 8,
        color: '#2563eb',
        fillColor: '#2563eb',
        fillOpacity: 0.7,
      }).addTo(map);
    }

    const stopIndex = locationPickerState.stopIndex;
    const target = locationPickerState.target;
    const targetTrip = locationPickerState.trip;
    map.on('click', (event: L.LeafletMouseEvent) => {
      const lat = event.latlng.lat;
      const lng = event.latlng.lng;

      if (locationPickerMarkerRef.current) {
        locationPickerMarkerRef.current.remove();
      }

      locationPickerMarkerRef.current = L.circleMarker([lat, lng], {
        radius: 8,
        color: '#2563eb',
        fillColor: '#2563eb',
        fillOpacity: 0.7,
      }).addTo(map);

      if (target === 'edit_stop') {
        setStopForm((prev) => ({
          ...prev,
          latitude: lat.toString(),
          longitude: lng.toString(),
        }));
      } else if (stopIndex !== null) {
        setRouteForm((prev) => {
          const newStops = [...prev.trips[targetTrip]];
          if (!newStops[stopIndex]) return prev;
          newStops[stopIndex] = {
            ...newStops[stopIndex],
            latitude: lat.toString(),
            longitude: lng.toString(),
          };
          return {
            ...prev,
            trips: {
              ...prev.trips,
              [targetTrip]: newStops,
            },
          };
        });
      }
    });

    const invalidateTimer = setTimeout(() => {
      map.invalidateSize();
    }, 120);

    return () => {
      clearTimeout(invalidateTimer);
      if (locationPickerLeafletRef.current) {
        locationPickerLeafletRef.current.off();
        locationPickerLeafletRef.current.remove();
        locationPickerLeafletRef.current = null;
      }
      locationPickerMarkerRef.current = null;
    };
  }, [locationPickerState.isOpen, locationPickerState.mapKey, locationPickerState.center, locationPickerState.selected, locationPickerState.stopIndex, locationPickerState.target, locationPickerState.trip]);

  // Initialize data
  useEffect(() => {
    setSelectedBus(null);
    setPassengers([]);
    setRoutes([]);
    setAssignmentBusStops([]);
    setSelectedPassengerKeys([]);
    setSelectedPassengerStops({});
    setBulkAssignForm({ bus_number: '', students: [], teachers: [], staff: [] });
    if (mode === 'buses' || mode === 'routes' || mode === 'assignments' || mode === 'assignDriver' || mode === 'expenses') {
      fetchVehicles();
      fetchTransportStaff();
      fetchStudents();
      fetchTeachers();
    }
  }, [mode, schoolScope.selectedSchoolId]);

  useEffect(() => {
    if (vehicles.length > 0 && (mode === 'routes' || mode === 'buses')) {
      fetchAllRoutes();
    }
  }, [vehicles, mode, schoolScope.selectedSchoolId]);

  useEffect(() => {
    if (mode !== 'assignments') return;

    if (!bulkAssignForm.bus_number) {
      setAssignmentBusStops([]);
      return;
    }

    loadAssignmentBusStops(bulkAssignForm.bus_number);
  }, [mode, bulkAssignForm.bus_number, vehicles, schoolScope.selectedSchoolId]);

  useEffect(() => {
    if (mode !== 'assignments' || !bulkAssignForm.bus_number) return;

    let mounted = true;
    (async () => {
      const allocationData = await fetchAllocation(bulkAssignForm.bus_number);
      if (!mounted) return;

      if (allocationData) {
        const assigned = extractAssignedIdsFromAllocation(allocationData);
        setBulkAssignForm((prev) => ({
          ...prev,
          students: assigned.students,
          teachers: assigned.teachers,
          staff: assigned.staff,
        }));
        setSelectedPassengerStops(assigned.stopMap || {});
      } else {
        setBulkAssignForm((prev) => ({
          ...prev,
          students: [],
          teachers: [],
          staff: [],
        }));
        setSelectedPassengerStops({});
      }
    })();

    return () => {
      mounted = false;
    };
  }, [mode, bulkAssignForm.bus_number]);

  useEffect(() => {
    if (selectedBus && mode === 'editBus') {
      setBusForm({
        bus_number: selectedBus.bus_number,
        registration_number: selectedBus.registration_number,
        capacity: selectedBus.capacity
      });
    }
  }, [selectedBus, mode]);

  useEffect(() => {
    if (selectedStop && mode === 'editStop') {
      setStopForm({
        stop_id: selectedStop.id,
        trip_type: selectedStop.trip_type || 'Morning',
        name: selectedStop.stop_name,
        time: selectedStop.arrival_time.substring(0, 5),
        order: selectedStop.order_number,
        latitude: selectedStop.latitude?.toString() || '',
        longitude: selectedStop.longitude?.toString() || ''
      });
    }
  }, [selectedStop, mode]);

  // Navigation tabs
  const tabs = [
    { id: 'buses', label: 'Buses', icon: FaBus, color: 'blue' },
    { id: 'routes', label: 'Routes', icon: FaRoute, color: 'blue' },
    { id: 'assignments', label: 'Assignments', icon: FaUserFriends, color: 'blue' },
    { id: 'expenses', label: 'Expenses', icon: FaFileInvoiceDollar, color: 'blue' },
  ];

  // Filter vehicles based on search
  const filteredVehicles = vehicles.filter(vehicle =>
    vehicle.bus_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
    vehicle.registration_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
    getDriverName(vehicle.driver).toLowerCase().includes(searchTerm.toLowerCase())
  );

  const filteredRoutes = routes.filter(route =>
    route.bus_number?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    route.start_location.toLowerCase().includes(searchTerm.toLowerCase()) ||
    route.end_location.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const filteredExpenses = expenses.filter(expense =>
    expense.bus_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
    expense.uploader_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    expense.title.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className={`dashboard-typography p-3 md:p-4 xl:p-6 ${getBgClass()}`}>
      <div className="mx-auto w-full max-w-[1600px]">
        {/* Header */}
        <div className="mb-6 sm:mb-8">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between mb-4 sm:mb-6 gap-4">
            <div className="flex items-center space-x-3 sm:space-x-4">
              <div className={combine(
                "p-2 sm:p-3 rounded-xl sm:rounded-2xl shadow-lg",
                theme === 'dark' 
                  ? "bg-gradient-to-br from-blue-600 to-blue-700" 
                  : "bg-gradient-to-br from-blue-500 to-blue-600"
              )}>
                <FaBus className="text-xl sm:text-2xl text-white" />
              </div>
              <div>
                <h1 className={combine("text-xl sm:text-2xl md:text-3xl font-bold", get('text', 'primary'))}>
                  Transport Management
                </h1>
                <p className={combine("text-xs sm:text-sm mt-0.5 sm:mt-1", get('text', 'secondary'))}>
                  Comprehensive bus, route, passenger, and driver management system
                </p>
              </div>
            </div>
            
            <div className="flex flex-col sm:flex-row gap-2 sm:gap-3 w-full lg:w-auto">
              <SchoolScopeSelector {...schoolScope} className="w-full sm:w-auto" />
              <button
                onClick={() => {
                  setDateFilter('');
                  setMonthFilter('');
                  setYearFilter('');
                  fetchExpenses();
                }}
                className={combine(getSecondaryButtonClass(), "flex items-center justify-center space-x-2 w-full sm:w-auto")}
              >
                <FaFileInvoiceDollar className="text-sm" />
                <span className="text-sm">Expenses</span>
              </button>
              <button
                onClick={() => {
                  setSelectedBus(null);
                  setBusForm({ bus_number: '', registration_number: '', capacity: 20 });
                  setMode('addBus');
                }}
                className={combine(getPrimaryButtonClass(), "flex items-center justify-center space-x-2 w-full sm:w-auto")}
              >
                <FaPlus className="text-sm" />
                <span className="text-sm">Add Bus</span>
              </button>
            </div>
          </div>

          {/* Dashboard Stats Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-6 gap-3 sm:gap-4 md:gap-6 mb-4 sm:mb-6 md:mb-8">
            <div className={getCardGradientClass('blue')}>
              <div className="flex items-center justify-between">
                <div>
                  <p className={combine("text-xs font-medium", get('text', 'secondary'))}>Total Buses</p>
                  <p className={combine("text-lg sm:text-xl md:text-2xl font-bold mt-1 sm:mt-2", get('text', 'primary'))}>{busStats.total_buses}</p>
                </div>
                <div className={combine(
                  "p-1.5 sm:p-2 rounded-lg sm:rounded-xl",
                  theme === 'dark' ? 'bg-blue-900/30' : 'bg-blue-100'
                )}>
                  <FaBus className={combine(
                    "text-base sm:text-lg",
                    theme === 'dark' ? 'text-blue-400' : 'text-blue-600'
                  )} />
                </div>
              </div>
              <div className="mt-1 sm:mt-2">
                <span className={combine("text-xs", get('text', 'tertiary'))}>
                  {busStats.buses_with_driver} with driver
                </span>
              </div>
            </div>
            
            <div className={getCardGradientClass('blue')}>
              <div className="flex items-center justify-between">
                <div>
                  <p className={combine("text-xs font-medium", get('text', 'secondary'))}>Active Routes</p>
                  <p className={combine("text-lg sm:text-xl md:text-2xl font-bold mt-1 sm:mt-2", get('text', 'primary'))}>
                    {busStats.active_routes}
                  </p>
                </div>
                <div className={combine(
                  "p-1.5 sm:p-2 rounded-lg sm:rounded-xl",
                  theme === 'dark' ? 'bg-blue-900/30' : 'bg-blue-100'
                )}>
                  <FaRoute className={combine(
                    "text-base sm:text-lg",
                    theme === 'dark' ? 'text-blue-400' : 'text-blue-600'
                  )} />
                </div>
              </div>
              <div className="mt-1 sm:mt-2">
                <span className={combine("text-xs", get('text', 'tertiary'))}>
                  {Math.round((busStats.active_routes / (busStats.total_buses || 1)) * 100)}% coverage
                </span>
              </div>
            </div>
            
            <div className={getCardGradientClass('emerald')}>
              <div className="flex items-center justify-between">
                <div>
                  <p className={combine("text-xs font-medium", get('text', 'secondary'))}>Available Drivers</p>
                  <p className={combine("text-lg sm:text-xl md:text-2xl font-bold mt-1 sm:mt-2", get('text', 'primary'))}>
                    {busStats.total_drivers}
                  </p>
                </div>
                <div className={combine(
                  "p-1.5 sm:p-2 rounded-lg sm:rounded-xl",
                  theme === 'dark' ? 'bg-emerald-900/30' : 'bg-emerald-100'
                )}>
                  <FaUserTie className={combine(
                    "text-base sm:text-lg",
                    theme === 'dark' ? 'text-emerald-400' : 'text-emerald-600'
                  )} />
                </div>
              </div>
              <div className="mt-1 sm:mt-2">
                <span className={combine("text-xs", get('text', 'tertiary'))}>
                  {busStats.total_drivers - busStats.buses_with_driver} free
                </span>
              </div>
            </div>
            
            <div className={getCardGradientClass('amber')}>
              <div className="flex items-center justify-between">
                <div>
                  <p className={combine("text-xs font-medium", get('text', 'secondary'))}>Total Passengers</p>
                  <p className={combine("text-lg sm:text-xl md:text-2xl font-bold mt-1 sm:mt-2", get('text', 'primary'))}>
                    {busStats.total_passengers}
                  </p>
                </div>
                <div className={combine(
                  "p-1.5 sm:p-2 rounded-lg sm:rounded-xl",
                  theme === 'dark' ? 'bg-amber-900/30' : 'bg-amber-100'
                )}>
                  <FaUsers className={combine(
                    "text-base sm:text-lg",
                    theme === 'dark' ? 'text-amber-400' : 'text-amber-600'
                  )} />
                </div>
              </div>
              <div className="mt-1 sm:mt-2">
                <span className={combine("text-xs", get('text', 'tertiary'))}>
                  Across {busStats.total_buses} buses
                </span>
              </div>
            </div>
            
            <div className={getCardGradientClass('red')}>
              <div className="flex items-center justify-between">
                <div>
                  <p className={combine("text-xs font-medium", get('text', 'secondary'))}>Occupancy Rate</p>
                  <p className={combine("text-lg sm:text-xl md:text-2xl font-bold mt-1 sm:mt-2", get('text', 'primary'))}>
                    {busStats.occupancy_rate}%
                  </p>
                </div>
                <div className={combine(
                  "p-1.5 sm:p-2 rounded-lg sm:rounded-xl",
                  theme === 'dark' ? 'bg-red-900/30' : 'bg-red-100'
                )}>
                  <FaChartLine className={combine(
                    "text-base sm:text-lg",
                    theme === 'dark' ? 'text-red-400' : 'text-red-600'
                  )} />
                </div>
              </div>
              <div className="mt-1 sm:mt-2">
                <span className={combine("text-xs", get('text', 'tertiary'))}>
                  {busStats.total_passengers} / {vehicles.reduce((sum, v) => sum + v.capacity, 0)} seats
                </span>
              </div>
            </div>
            
            <div className={getCardGradientClass('indigo')}>
              <div className="flex items-center justify-between">
                <div>
                  <p className={combine("text-xs font-medium", get('text', 'secondary'))}>Monthly Expenses</p>
                  <p className={combine("text-lg sm:text-xl md:text-2xl font-bold mt-1 sm:mt-2", get('text', 'primary'))}>
                    {expenses.length}
                  </p>
                </div>
                <div className={combine(
                  "p-1.5 sm:p-2 rounded-lg sm:rounded-xl",
                  theme === 'dark' ? 'bg-indigo-900/30' : 'bg-indigo-100'
                )}>
                  <FaMoneyBillWave className={combine(
                    "text-base sm:text-lg",
                    theme === 'dark' ? 'text-indigo-400' : 'text-indigo-600'
                  )} />
                </div>
              </div>
              <div className="mt-1 sm:mt-2">
                <span className={combine("text-xs", get('text', 'tertiary'))}>
                  {expenses.length} proofs uploaded
                </span>
              </div>
            </div>
          </div>

          {/* Navigation Tabs */}
          <div className={getCardGradientClass('gray')}>
            <div className="flex space-x-1 overflow-x-auto p-1">
              {tabs.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setMode(tab.id as ViewMode)}
                  className={combine(
                    "flex items-center space-x-2 px-3 sm:px-5 py-2 sm:py-2.5 rounded-lg sm:rounded-xl transition-all duration-200 font-medium whitespace-nowrap text-xs sm:text-sm",
                    mode === tab.id
                      ? `bg-gradient-to-r from-${tab.color}-500 to-${tab.color}-600 text-white shadow-md`
                      : getSecondaryButtonClass()
                  )}
                >
                  <tab.icon className="text-sm" />
                  <span>{tab.label}</span>
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Buses List View */}
        {mode === 'buses' && (
          <>
            {/* Search & Filters */}
            <div className={getCardGradientClass('blue')}>
	                <div className="grid grid-cols-1 md:grid-cols-3 gap-3 sm:gap-4">
                <div className="md:col-span-2">
                  <div className="relative">
                    <FaSearch className={combine(
                      "absolute left-3 top-1/2 transform -translate-y-1/2 text-sm",
                      get('icon', 'secondary')
                    )} />
                    <input
                      type="text"
                      placeholder="Search buses by number, registration, or driver..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className={getInputClass()}
                      style={{ paddingLeft: '2.5rem' }}
                    />
                  </div>
                </div>
                <div className="flex flex-col sm:flex-row gap-2">
                  <button
                    onClick={() => {
                      setDriverAssignForm({ bus_number: '', staff_id: '' });
                      setMode('assignDriver');
                    }}
                    className={combine(getSuccessButtonClass(), "flex-1 flex items-center justify-center space-x-2")}
                  >
                    <FaUserTie className="text-sm" />
                    <span className="text-sm">Assign Driver</span>
                  </button>
                  <button
                    onClick={() => {
                      setBulkAssignForm({ bus_number: '', students: [], teachers: [], staff: [] });
                      setSelectedPassengerStops({});
                      setAssignmentBusStops([]);
                      setMode('assignments');
                    }}
                    className={combine(getPrimaryButtonClass(), "flex-1 flex items-center justify-center space-x-2")}
                  >
                    <FaUserFriends className="text-sm" />
                    <span className="text-sm">Bulk Assign</span>
                  </button>
                </div>
              </div>
            </div>

            {/* Buses Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4 sm:gap-6">
              {loading ? (
                <div className="col-span-full p-8 text-center">
                  <div className="text-center">
                    <div className="relative mx-auto w-16 h-16">
                      <div className="animate-spin rounded-full h-16 w-16 border-4 border-blue-200 border-t-blue-600"></div>
                      <div className="absolute inset-0 flex items-center justify-center">
                        <FaBus className="h-8 w-8 text-blue-600 animate-pulse" />
                      </div>
                    </div>
                    <p className={combine("mt-6 text-sm font-medium", get('text', 'secondary'))}>Loading buses...</p>
                    <p className={combine("text-sm mt-2", get('text', 'tertiary'))}>Preparing transport records</p>
                  </div>
                </div>
              ) : filteredVehicles.length === 0 ? (
                <div className="col-span-full p-8 text-center">
                  <div className={combine(
                    "inline-block p-3 rounded-full mb-3",
                    theme === 'dark' ? 'bg-blue-900/30' : 'bg-blue-100'
                  )}>
                    <FaBus className={combine(
                      "text-xl",
                      theme === 'dark' ? 'text-blue-400' : 'text-blue-500'
                    )} />
                  </div>
                  <h3 className={combine("text-base font-medium mb-1", get('text', 'primary'))}>No buses found</h3>
                  <p className={combine("text-sm mb-4", get('text', 'secondary'))}>
                    {searchTerm ? 'Try adjusting your search' : 'Add your first bus to get started'}
                  </p>
                  {!searchTerm && (
                    <button
                      onClick={() => {
                        setSelectedBus(null);
                        setBusForm({ bus_number: '', registration_number: '', capacity: 20 });
                        setMode('addBus');
                      }}
                      className={combine(getPrimaryButtonClass(), "mt-2")}
                    >
                      Add First Bus
                    </button>
                  )}
                </div>
              ) : (
                filteredVehicles.map((vehicle) => (
                  <div key={vehicle.id} className={getCardGradientClass('blue')}>
                    {/* Bus Header */}
                    <div className="flex justify-between items-start mb-4">
                      <div className="flex items-center space-x-3">
                        <div className={combine(
                          "p-2 rounded-lg",
                          theme === 'dark' ? 'bg-blue-900/30' : 'bg-blue-100'
                        )}>
                          <FaBusAlt className={combine(
                            "text-xl",
                            theme === 'dark' ? 'text-blue-400' : 'text-blue-600'
                          )} />
                        </div>
                        <div>
                          <h3 className={combine("text-lg font-bold", get('text', 'primary'))}>
                            Bus {vehicle.bus_number}
                          </h3>
                          <p className={combine("text-xs", get('text', 'tertiary'))}>
                            {vehicle.registration_number}
                          </p>
                        </div>
                      </div>
                      <div className="flex space-x-1">
                        <button
                          onClick={() => fetchPassengerList(vehicle.bus_number)}
                          className={combine(
                            "p-1.5 rounded-lg transition-all duration-200 hover:text-[var(--color-accent-primary)]",
                            get('icon', 'primary')
                          )}
                          title="View Passengers"
                        >
                          <FaUsers className="text-sm" />
                        </button>
                        
                        <button
                          onClick={() => deleteBus(vehicle.id)}
                          className={combine(
                            "p-1.5 rounded-lg transition-all duration-200 hover:text-[var(--color-accent-error)]",
                            get('icon', 'primary')
                          )}
                          title="Delete Bus"
                        >
                          <FaTrash className="text-sm" />
                        </button>
                      </div>
                    </div>
                    
                    {/* Bus Details */}
                    <div className="grid grid-cols-2 gap-4 mb-4">
                      <div className={combine(
                        "p-3 rounded-lg",
                        theme === 'dark' ? 'bg-gray-800/50' : 'bg-gray-50'
                      )}>
                        <p className={combine("text-xs", get('text', 'tertiary'))}>Capacity</p>
                        <div className="flex items-center space-x-2 mt-1">
                          <FaUsers className={combine("text-sm", get('icon', 'secondary'))} />
                          <span className={combine("font-semibold text-lg", get('text', 'primary'))}>
                            {vehicle.capacity}
                          </span>
                          <span className={combine("text-xs", get('text', 'tertiary'))}>seats</span>
                        </div>
                      </div>
                      
                      <div className={combine(
                        "p-3 rounded-lg",
                        theme === 'dark' ? 'bg-gray-800/50' : 'bg-gray-50'
                      )}>
                        <p className={combine("text-xs", get('text', 'tertiary'))}>Driver</p>
                        <div className="flex items-center justify-between">
                          <div className="flex items-center space-x-2 mt-1">
                            <FaUserTie className={combine(
                              "text-sm",
                              vehicle.driver ? 'text-emerald-500' : 'text-gray-400'
                            )} />
                            <span className={combine("font-medium text-sm", get('text', 'primary'))}>
                              {getDriverName(vehicle.driver)}
                            </span>
                          </div>
                          {vehicle.driver && (
                            <button
                              onClick={() => unassignDriver(vehicle.bus_number)}
                              className="text-xs px-2 py-1 rounded bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 hover:bg-red-200 dark:hover:bg-red-900/50"
                            >
                              <FaTimes className="text-xs" />
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                    
                    {/* Route Info */}
                    {vehicle.route && (
                      <div className={combine(
                        "p-3 rounded-lg mb-4",
                        theme === 'dark' ? 'bg-blue-900/20' : 'bg-blue-50'
                      )}>
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center space-x-2">
                            <FaRoute className={combine("text-sm", theme === 'dark' ? 'text-blue-400' : 'text-blue-600')} />
                            <span className={combine("text-xs font-medium", get('text', 'primary'))}>Route</span>
                          </div>
                          <span className={combine("text-xs px-2 py-1 rounded-full",
                            theme === 'dark' ? 'bg-emerald-900/30 text-emerald-400' : 'bg-emerald-100 text-emerald-700'
                          )}>
                            {vehicle.route.stops?.length || 0} stops
                          </span>
                        </div>
                        <div className="flex items-center space-x-2">
                          <FaMapMarkerAlt className={combine("text-xs", get('icon', 'secondary'))} />
                          <span className={combine("text-sm font-medium", get('text', 'primary'))}>
                            {vehicle.route.start_location}
                          </span>
                          <FaArrowLeft className={combine("text-xs rotate-180", get('icon', 'secondary'))} />
                          <span className={combine("text-sm font-medium", get('text', 'primary'))}>
                            {vehicle.route.end_location}
                          </span>
                        </div>
                      </div>
                    )}
                    
                    {/* Action Buttons */}
                    <div className="flex space-x-2 pt-3 border-t border-gray-200 dark:border-gray-700">
	                      <button
	                        onClick={async () => {
	                          const route = await fetchRouteForBus(vehicle.bus_number);
	                          setRouteForm(buildRouteFormFromRoute(vehicle.bus_number, route));
                            setActiveRouteTrip('Morning');
	                          setMode('addRoute');
	                        }}
                        className={combine(getSecondaryButtonClass(), "flex-1 text-center text-xs")}
                      >
                        <FaRoute className="mr-1 inline text-xs" />
                        {vehicle.route ? 'Edit Route' : 'Add Route'}
                      </button>
                      <button
                        onClick={() => {
                          setBulkAssignForm({
                            ...bulkAssignForm,
                            bus_number: vehicle.bus_number
                          });
                          setMode('assignments');
                        }}
                        className={combine(getPrimaryButtonClass(), "flex-1 text-center text-xs")}
                      >
                        <FaUserFriends className="mr-1 inline text-xs" />
                        Assign Passengers
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </>
        )}

        {/* Add/Edit Bus Form */}
        {(mode === 'addBus' || mode === 'editBus') && (
          <div className="animate-fade-in max-w-2xl mx-auto">
            <div className={getCardGradientClass('blue')}>
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center space-x-4">
                  <div className={combine(
                    "p-3 rounded-lg",
                    theme === 'dark' ? 'bg-blue-900/30' : 'bg-blue-100'
                  )}>
                    <FaBus className={combine(
                      "text-lg",
                      theme === 'dark' ? 'text-blue-400' : 'text-blue-600'
                    )} />
                  </div>
                  <div>
                    <h2 className={combine("text-xl font-bold", get('text', 'primary'))}>
                      {mode === 'editBus' ? 'Edit Bus' : 'Add New Bus'}
                    </h2>
                    <p className={combine("text-sm mt-1", get('text', 'secondary'))}>
                      {mode === 'editBus' ? 'Update bus information' : 'Register a new bus in the system'}
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => {
                    setMode('buses');
                    setBusForm({ bus_number: '', registration_number: '', capacity: 20 });
                    setSelectedBus(null);
                  }}
                  className={combine(getSecondaryButtonClass(), "text-sm")}
                >
                  <FaTimes className="mr-1 inline text-xs" />
                  Cancel
                </button>
              </div>

              <form onSubmit={mode === 'editBus' ? (e) => { e.preventDefault(); toastInfo('Edit functionality coming soon'); } : createBus} className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className={combine("block text-sm font-medium mb-2", get('text', 'primary'))}>
                      Bus Number *
                    </label>
                    <input
                      type="text"
                      value={busForm.bus_number}
                      onChange={(e) => setBusForm({...busForm, bus_number: e.target.value})}
                      required
                      className={getInputClass()}
                      placeholder="e.g., 12"
                    />
                    <p className={combine("text-xs mt-1", get('text', 'tertiary'))}>
                      Unique identifier for the bus
                    </p>
                  </div>
                  <div>
                    <label className={combine("block text-sm font-medium mb-2", get('text', 'primary'))}>
                      Registration Number *
                    </label>
                    <input
                      type="text"
                      value={busForm.registration_number}
                      onChange={(e) => setBusForm({...busForm, registration_number: e.target.value})}
                      required
                      className={getInputClass()}
                      placeholder="e.g., TN-01-AB-1234"
                    />
                    <p className={combine("text-xs mt-1", get('text', 'tertiary'))}>
                      Official vehicle registration
                    </p>
                  </div>
                  <div>
                    <label className={combine("block text-sm font-medium mb-2", get('text', 'primary'))}>
                      Capacity *
                    </label>
                    <input
                      type="number"
                      min="1"
                      max="100"
                      value={busForm.capacity}
                      onChange={(e) => setBusForm({...busForm, capacity: parseInt(e.target.value) || 20})}
                      required
                      className={getInputClass()}
                    />
                    <p className={combine("text-xs mt-1", get('text', 'tertiary'))}>
                      Number of seats (max 100)
                    </p>
                  </div>
                </div>

                <div className="flex space-x-3 pt-6 border-t border-gray-200 dark:border-gray-700">
                  <button
                    type="submit"
                    disabled={loading}
                    className={combine(
                      getPrimaryButtonClass(),
                      "flex items-center space-x-2 text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                    )}
                  >
                    {loading ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div>
                        <span className="text-sm">Saving...</span>
                      </>
                    ) : (
                      <>
                        <FaSave className="text-sm" />
                        <span className="text-sm">{mode === 'editBus' ? 'Update Bus' : 'Save Bus'}</span>
                      </>
                    )}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Routes View */}
        {mode === 'routes' && (
          <div className={getCardGradientClass('blue')}>
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4 sm:mb-6">
              <div>
                <h3 className={combine("text-lg sm:text-xl font-bold", get('text', 'primary'))}>Bus Routes Management</h3>
                <p className={combine("text-xs sm:text-sm mt-1", get('text', 'secondary'))}>
                  View and manage routes for all buses
                </p>
              </div>
              <button
	                onClick={() => {
	                  setRouteForm(emptyRouteForm());
                    setActiveRouteTrip('Morning');
	                  setMode('addRoute');
	                }}
                className={combine(getPrimaryButtonClass(), "flex items-center justify-center space-x-2 w-full sm:w-auto")}
              >
                <FaPlus className="text-sm" />
                <span>Add Route</span>
              </button>
            </div>

            {/* Search */}
            <div className="mb-4 sm:mb-6">
              <div className="relative">
                <FaSearch className={combine(
                  "absolute left-3 top-1/2 transform -translate-y-1/2 text-sm",
                  get('icon', 'secondary')
                )} />
                <input
                  type="text"
                  placeholder="Search routes by bus number or location..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className={getInputClass()}
                  style={{ paddingLeft: '2.5rem' }}
                />
              </div>
            </div>

            {filteredRoutes.length === 0 ? (
              <div className="p-6 sm:p-8 text-center">
                <div className={combine(
                  "inline-block p-2.5 sm:p-3 rounded-full mb-3",
                  theme === 'dark' ? 'bg-blue-900/30' : 'bg-blue-100'
                )}>
                  <FaRoute className={combine(
                    "text-lg sm:text-xl",
                    theme === 'dark' ? 'text-blue-400' : 'text-blue-600'
                  )} />
                </div>
                <h3 className={combine("text-sm sm:text-base font-medium mb-1", get('text', 'primary'))}>No routes found</h3>
                <p className={combine("text-xs sm:text-sm mb-4", get('text', 'secondary'))}>
                  {searchTerm ? 'Try adjusting your search' : 'Add a route for a bus to get started'}
                </p>
                {!searchTerm && (
                  <button
	                    onClick={() => {
	                      setRouteForm(emptyRouteForm());
                        setActiveRouteTrip('Morning');
	                      setMode('addRoute');
	                    }}
                    className={combine(getPrimaryButtonClass(), "mt-2")}
                  >
                    Add First Route
                  </button>
                )}
              </div>
            ) : (
              <div className="space-y-4 sm:space-y-6">
                {filteredRoutes.map((route) => (
                  <div key={route.id} className={combine(
                    "p-4 sm:p-6 rounded-lg sm:rounded-xl border-2",
                    theme === 'dark' ? 'border-blue-900/30 bg-gray-800/50' : 'border-blue-100 bg-white'
                  )}>
                    {/* Route Header */}
                    <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-3 sm:gap-4 mb-4">
                      <div className="flex items-center space-x-3">
                        <div className={combine(
                          "p-1.5 sm:p-2 rounded-lg",
                          theme === 'dark' ? 'bg-blue-900/30' : 'bg-blue-100'
                        )}>
                          <FaBus className={combine(
                            "text-base sm:text-lg",
                            theme === 'dark' ? 'text-blue-400' : 'text-blue-600'
                          )} />
                        </div>
                        <div>
                          <h4 className={combine("text-base sm:text-lg font-bold", get('text', 'primary'))}>
                            Bus {route.bus_number || 'Unknown'}
                          </h4>
                          <div className="flex flex-wrap items-center gap-2 mt-1">
                            <span className={combine(
                              "px-2 py-1 rounded-full text-xs font-medium",
                              theme === 'dark' ? 'bg-emerald-900/30 text-emerald-400' : 'bg-emerald-100 text-emerald-700'
                            )}>
                              {route.stops.length} stops
                            </span>
                            <span className={combine("text-xs", get('text', 'tertiary'))}>
                              ID: {route.id}
                            </span>
                          </div>
                        </div>
                      </div>
                      <div className="flex flex-col sm:flex-row gap-2 w-full lg:w-auto">
                        <button
	                          onClick={() => {
	                            setRouteForm(buildRouteFormFromRoute(route.bus_number || '', route));
                              setActiveRouteTrip('Morning');
	                            setMode('addRoute');
	                          }}
                          className={combine(getSecondaryButtonClass(), "w-full sm:w-auto")}
                        >
                          <FaEdit className="mr-1 inline text-xs" />
                          Edit
                        </button>
                        <button
                          onClick={() => route.bus_number && deleteRoute(route.bus_number)}
                          className={combine(getDangerButtonClass(), "w-full sm:w-auto")}
                        >
                          <FaTrash className="mr-1 inline text-xs" />
                          Delete
                        </button>
                      </div>
                    </div>

                      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
                        {(['Morning', 'Evening'] as TripType[]).map((trip) => {
                          const tripStops = getRouteTripStops(route, trip);
                          const startLocation = getRouteTripLocation(route, trip, 'start');
                          const endLocation = getRouteTripLocation(route, trip, 'end');

                          return (
                            <div
                              key={`${route.id}-${trip}`}
                              className={combine(
                                "rounded-xl border p-3 sm:p-4",
                                trip === 'Morning'
                                  ? theme === 'dark' ? 'border-sky-800/60 bg-sky-950/20' : 'border-sky-100 bg-sky-50/70'
                                  : theme === 'dark' ? 'border-indigo-800/60 bg-indigo-950/20' : 'border-indigo-100 bg-indigo-50/70'
                              )}
                            >
                              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-4">
                                <div>
                                  <h5 className={combine("text-sm font-semibold", get('text', 'primary'))}>
                                    <FaRoute className="inline mr-1 text-xs" />
                                    {tripMeta[trip].label}
                                  </h5>
                                  <p className={combine("text-xs mt-0.5", get('text', 'secondary'))}>
                                    {startLocation || 'Start not set'} to {endLocation || 'End not set'}
                                  </p>
                                </div>
                                <span className={combine("text-xs font-medium", get('text', 'tertiary'))}>
                                  {tripStops.length > 0
                                    ? `${formatTime(tripStops[0].arrival_time)} - ${formatTime(tripStops[tripStops.length - 1].arrival_time)}`
                                    : 'No stops'}
                                </span>
                              </div>

                              <div className="relative mb-4">
                                <div className="flex items-center">
                                  <div className={combine("w-3 h-3 rounded-full", theme === 'dark' ? 'bg-emerald-400' : 'bg-emerald-500')}></div>
                                  <div className={combine("flex-1 h-0.5", theme === 'dark' ? 'bg-gray-600' : 'bg-gray-300')}></div>
                                  <div className={combine("w-3 h-3 rounded-full", theme === 'dark' ? 'bg-red-400' : 'bg-red-500')}></div>
                                </div>
                                <div className="flex justify-between gap-3 mt-2">
                                  <div className="min-w-0 flex-1">
                                    <p className={combine("text-xs font-medium", get('text', 'tertiary'))}>Start</p>
                                    <p className={combine("text-xs sm:text-sm font-semibold break-words", get('text', 'primary'))}>{startLocation || 'N/A'}</p>
                                  </div>
                                  <div className="text-right min-w-0 flex-1">
                                    <p className={combine("text-xs font-medium", get('text', 'tertiary'))}>End</p>
                                    <p className={combine("text-xs sm:text-sm font-semibold break-words", get('text', 'primary'))}>{endLocation || 'N/A'}</p>
                                  </div>
                                </div>
                              </div>

                              <div className="space-y-2">
                                {tripStops.length === 0 ? (
                                  <div className={combine("rounded-lg border border-dashed p-4 text-center text-xs", get('border', 'secondary'), get('text', 'tertiary'))}>
                                    No {tripMeta[trip].label.toLowerCase()} stops added
                                  </div>
                                ) : tripStops.map((stop) => (
                                  <div
                                    key={stop.id}
                                    className={combine(
                                      "flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-2.5 rounded-lg",
                                      theme === 'dark' ? 'bg-gray-800 hover:bg-gray-700' : 'bg-white hover:bg-gray-50',
                                      "transition-colors duration-200"
                                    )}
                                  >
                                    <div className="flex items-center space-x-3">
                                      <div className={combine(
                                        "h-7 w-7 rounded-full flex items-center justify-center text-xs font-bold",
                                        theme === 'dark' ? 'bg-blue-900/50 text-blue-400' : 'bg-blue-100 text-blue-600'
                                      )}>
                                        {stop.order_number}
                                      </div>
                                      <div>
                                        <p className={combine("text-sm font-medium", get('text', 'primary'))}>{stop.stop_name}</p>
                                        {stop.latitude && stop.longitude && (
                                          <p className={combine("text-xs", get('text', 'tertiary'))}>
                                            {stop.latitude.toFixed(6)}, {stop.longitude.toFixed(6)}
                                          </p>
                                        )}
                                      </div>
                                    </div>
                                    <div className="flex items-center justify-between sm:justify-end w-full sm:w-auto gap-3">
                                      <div className="flex items-center space-x-1">
                                        <FaClock className={combine("text-xs", get('icon', 'secondary'))} />
                                        <span className={combine("text-xs sm:text-sm", get('text', 'primary'))}>
                                          {stop.arrival_time.substring(0, 5)}
                                        </span>
                                      </div>
                                      <div className="flex space-x-1">
                                        <button
                                          onClick={() => {
                                            setSelectedStop(stop);
                                            setMode('editStop');
                                          }}
                                          className={combine("p-1.5 rounded-lg transition-colors hover:text-blue-500", get('icon', 'secondary'))}
                                          title="Edit Stop"
                                        >
                                          <FaEdit className="text-xs" />
                                        </button>
                                        <button
                                          onClick={() => deleteStop(stop.id)}
                                          className={combine("p-1.5 rounded-lg transition-colors hover:text-red-500", get('icon', 'secondary'))}
                                          title="Delete Stop"
                                        >
                                          <FaTimes className="text-xs" />
                                        </button>
                                      </div>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Add/Edit Route Form */}
        {mode === 'addRoute' && (
          <div className="animate-fade-in max-w-4xl mx-auto">
            <div className={getCardGradientClass('blue')}>
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4 sm:mb-6">
                <div className="flex items-center space-x-3 sm:space-x-4">
                  <div className={combine(
                    "p-2 sm:p-3 rounded-lg sm:rounded-xl",
                    theme === 'dark' ? 'bg-blue-900/30' : 'bg-blue-100'
                  )}>
                    <FaRoute className={combine(
                      "text-base sm:text-lg",
                      theme === 'dark' ? 'text-blue-400' : 'text-blue-600'
                    )} />
                  </div>
                  <div>
                    <h2 className={combine("text-lg sm:text-xl font-bold", get('text', 'primary'))}>
                      {routeForm.bus_number ? 'Edit Route' : 'Add New Route'}
                    </h2>
                    <p className={combine("text-xs sm:text-sm mt-1", get('text', 'secondary'))}>
                      Create or update a bus route with stops and timings
                    </p>
                  </div>
                </div>
                <button
	                  onClick={() => {
	                    setMode('routes');
	                    setRouteForm(emptyRouteForm());
	                  }}
                  className={combine(getSecondaryButtonClass(), "w-full sm:w-auto")}
                >
                  <FaTimes className="mr-1 inline text-xs" />
                  Cancel
                </button>
              </div>

              <form onSubmit={createRoute} className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3 sm:gap-4">
                  <div>
                    <label className={combine("block text-xs sm:text-sm font-medium mb-2", get('text', 'primary'))}>
                      Select Bus *
                    </label>
                    <select
                      value={routeForm.bus_number}
                      onChange={async (e) => {
	                        const selectedBus = e.target.value;
	                        if (!selectedBus) {
	                          setRouteForm(emptyRouteForm());
	                          return;
	                        }

	                        const route = await fetchRouteForBus(selectedBus);
	                        setRouteForm(buildRouteFormFromRoute(selectedBus, route));
                          setActiveRouteTrip('Morning');
	                      }}
                      required
                      className={getInputClass()}
                    >
                      <option value="">Choose a bus</option>
                      {vehicles.map(vehicle => (
                        <option key={vehicle.id} value={vehicle.bus_number}>
                          Bus {vehicle.bus_number} ({vehicle.registration_number})
                        </option>
                      ))}
                    </select>
                    <p className={combine("text-xs mt-1", get('text', 'tertiary'))}>
                      Select the bus for this route
                    </p>
                  </div>
                    <div className="md:col-span-2 grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                      <div>
                        <label className={combine("block text-xs sm:text-sm font-medium mb-2", get('text', 'primary'))}>
                          Morning Start *
                        </label>
                        <input
                          type="text"
                          value={routeForm.morning_start}
                          onChange={(e) => setRouteForm({ ...routeForm, morning_start: e.target.value, start: e.target.value })}
                          required
                          className={getInputClass()}
                          placeholder="e.g., Main Bus Stand"
                        />
                      </div>
                      <div>
                        <label className={combine("block text-xs sm:text-sm font-medium mb-2", get('text', 'primary'))}>
                          Morning End *
                        </label>
                        <input
                          type="text"
                          value={routeForm.morning_end}
                          onChange={(e) => setRouteForm({ ...routeForm, morning_end: e.target.value, end: e.target.value })}
                          required
                          className={getInputClass()}
                          placeholder="e.g., School Campus"
                        />
                      </div>
                      <div>
                        <label className={combine("block text-xs sm:text-sm font-medium mb-2", get('text', 'primary'))}>
                          Evening Start *
                        </label>
                        <input
                          type="text"
                          value={routeForm.evening_start}
                          onChange={(e) => setRouteForm({ ...routeForm, evening_start: e.target.value })}
                          required
                          className={getInputClass()}
                          placeholder="e.g., School Campus"
                        />
                      </div>
                      <div>
                        <label className={combine("block text-xs sm:text-sm font-medium mb-2", get('text', 'primary'))}>
                          Evening End *
                        </label>
                        <input
                          type="text"
                          value={routeForm.evening_end}
                          onChange={(e) => setRouteForm({ ...routeForm, evening_end: e.target.value })}
                          required
                          className={getInputClass()}
                          placeholder="e.g., Main Bus Stand"
                        />
                      </div>
                    </div>
	                </div>

	                {/* Stops Section */}
	                <div className={combine(
	                  "p-3 sm:p-4 rounded-lg sm:rounded-xl",
	                  theme === 'dark' ? 'bg-gray-800' : 'bg-gray-50'
	                )}>
	                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
	                    <div>
	                      <h3 className={combine("text-base sm:text-lg font-semibold", get('text', 'primary'))}>
	                        <FaMapPin className="inline mr-2 text-sm" />
	                        {tripMeta[activeRouteTrip].label} Stops
	                      </h3>
	                      <p className={combine("text-xs mt-1", get('text', 'tertiary'))}>
	                        {tripMeta[activeRouteTrip].description}. Add stops in travel order.
	                      </p>
	                    </div>
                      <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
                        <div className={combine("grid grid-cols-2 rounded-lg border p-1", get('border', 'secondary'), get('bg', 'card'))}>
                          {(['Morning', 'Evening'] as TripType[]).map((trip) => (
                            <button
                              key={trip}
                              type="button"
                              onClick={() => setActiveRouteTrip(trip)}
                              className={combine(
                                "px-3 py-2 rounded-md text-xs sm:text-sm font-medium transition-all",
                                activeRouteTrip === trip
                                  ? theme === 'dark' ? 'bg-blue-600 text-white' : 'bg-blue-600 text-white'
                                  : get('text', 'secondary')
                              )}
                            >
                              {trip === 'Morning' ? 'Morning' : 'Evening'}
                            </button>
                          ))}
                        </div>
                        <button
                          type="button"
                          onClick={addStop}
                          className={combine(getSuccessButtonClass(), "w-full sm:w-auto flex items-center justify-center space-x-2")}
                        >
                          <FaPlus className="text-xs" />
                          <span>Add Stop</span>
                        </button>
                      </div>
	                  </div>

	                  {activeRouteStops.length === 0 ? (
                    <div className={combine(
                      "p-6 sm:p-8 text-center rounded-lg sm:rounded-xl border-2 border-dashed",
                      theme === 'dark' ? 'border-gray-700' : 'border-gray-300'
                    )}>
                      <FaMapMarkerAlt className={combine(
                        "mx-auto text-2xl sm:text-3xl mb-3",
                        get('icon', 'secondary')
                      )} />
                      <p className={combine("text-xs sm:text-sm", get('text', 'secondary'))}>
                        No stops added yet
                      </p>
                      <p className={combine("text-xs mt-1", get('text', 'tertiary'))}>
	                        Click "Add Stop" to start building the {tripMeta[activeRouteTrip].label.toLowerCase()} route
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-3 sm:space-y-4">
	                      {activeRouteStops.map((stop, index) => (
                        <div 
                          key={index} 
                          className={combine(
                            "p-3 sm:p-4 rounded-lg sm:rounded-xl border",
                            theme === 'dark' ? 'border-gray-700 bg-gray-900' : 'border-gray-200 bg-white'
                          )}
                        >
                          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-3">
                            <div className="flex items-center space-x-2 sm:space-x-3">
                              <div className={combine(
                                "h-8 w-8 sm:h-10 sm:w-10 rounded-full flex items-center justify-center text-xs sm:text-sm font-bold",
                                theme === 'dark' ? 'bg-blue-900/50 text-blue-400' : 'bg-blue-100 text-blue-600'
                              )}>
                                {stop.order}
                              </div>
                              <div>
                                <span className={combine("text-sm sm:text-base font-medium", get('text', 'primary'))}>
                                  Stop {stop.order}
                                </span>
                                {index === 0 && (
                                  <span className="ml-2 px-2 py-0.5 text-xs bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400 rounded-full">
                                    First Stop
                                  </span>
                                )}
	                                {index === activeRouteStops.length - 1 && activeRouteStops.length > 1 && (
                                  <span className="ml-2 px-2 py-0.5 text-xs bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400 rounded-full">
                                    Last Stop
                                  </span>
                                )}
                              </div>
                            </div>
                            <div className="flex items-center gap-2 self-end sm:self-auto">
                              <button
                                type="button"
                                onClick={() => openStopLocationPicker(index)}
                                className={combine(
                                  "p-2 rounded-lg transition-colors",
                                  "hover:bg-blue-100 dark:hover:bg-blue-900/30",
                                  "text-blue-600 dark:text-blue-400"
                                )}
                                title="Pick location from map"
                              >
                                <FaGlobe className="text-sm" />
                              </button>
                              <button
                                type="button"
                                onClick={() => removeStopForm(index)}
                                className={combine(
                                  "p-2 rounded-lg transition-colors hover:bg-red-100 dark:hover:bg-red-900/30",
                                  "text-red-600 dark:text-red-400"
                                )}
                                title="Remove stop"
                              >
                                <FaTimes className="text-sm" />
                              </button>
                            </div>
                          </div>
                          
                          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3 sm:gap-4">
                            <div>
                              <label className={combine("block text-xs font-medium mb-1", get('text', 'secondary'))}>
                                Stop Name *
                              </label>
                              <input
                                type="text"
                                value={stop.name}
                                onChange={(e) => updateStopForm(index, 'name', e.target.value)}
                                required
                                className={getInputClass()}
                                placeholder="e.g., Bus Stand"
                              />
                            </div>
                            <div>
                              <label className={combine("block text-xs font-medium mb-1", get('text', 'secondary'))}>
                                Arrival Time *
                              </label>
                              <input
                                type="time"
                                value={stop.time}
                                onChange={(e) => updateStopForm(index, 'time', e.target.value)}
                                required
                                className={getInputClass()}
                              />
                            </div>
                            <div>
                              <label className={combine("block text-xs font-medium mb-1", get('text', 'secondary'))}>
                                Latitude
                              </label>
                              <input
                                type="number"
                                step="any"
                                value={stop.latitude}
                                onChange={(e) => updateStopForm(index, 'latitude', e.target.value)}
                                className={getInputClass()}
                                placeholder="e.g., 10.7905"
                              />
                            </div>
                            <div>
                              <label className={combine("block text-xs font-medium mb-1", get('text', 'secondary'))}>
                                Longitude
                              </label>
                              <input
                                type="number"
                                step="any"
                                value={stop.longitude}
                                onChange={(e) => updateStopForm(index, 'longitude', e.target.value)}
                                className={getInputClass()}
                                placeholder="e.g., 78.7047"
                              />
                            </div>
                          </div>
                        </div>
                      ))}

                      {/* Route Summary */}
                      <div className={combine(
                        "mt-4 p-3 sm:p-4 rounded-lg sm:rounded-xl",
                        theme === 'dark' ? 'bg-emerald-900/20' : 'bg-emerald-50'
                      )}>
                        <h4 className={combine("text-xs sm:text-sm font-semibold mb-2", get('text', 'primary'))}>
                          Route Summary
                        </h4>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                          <div>
                            <p className={combine("text-xs", get('text', 'tertiary'))}>Total Stops</p>
                            <p className={combine("text-base sm:text-lg font-bold", get('text', 'primary'))}>
	                              {activeRouteStops.length}
                            </p>
                          </div>
                          <div>
                            <p className={combine("text-xs", get('text', 'tertiary'))}>Start Time</p>
                            <p className={combine("text-base sm:text-lg font-bold", get('text', 'primary'))}>
	                              {activeRouteStops[0]?.time || 'N/A'}
                            </p>
                          </div>
                          <div>
                            <p className={combine("text-xs", get('text', 'tertiary'))}>End Time</p>
                            <p className={combine("text-base sm:text-lg font-bold", get('text', 'primary'))}>
	                              {activeRouteStops[activeRouteStops.length-1]?.time || 'N/A'}
                            </p>
                          </div>
                          <div>
                            <p className={combine("text-xs", get('text', 'tertiary'))}>Duration</p>
                            <p className={combine("text-base sm:text-lg font-bold", get('text', 'primary'))}>
	                              {activeRouteStops.length > 1 ? 
	                                `${Math.round((new Date(`1970-01-01T${activeRouteStops[activeRouteStops.length-1].time}:00`).getTime() - 
	                                  new Date(`1970-01-01T${activeRouteStops[0].time}:00`).getTime()) / 60000)} min` 
                                : 'N/A'}
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                <div className="flex flex-col sm:flex-row sm:items-center gap-3 pt-4 sm:pt-6 border-t border-gray-200 dark:border-gray-700">
                  <button
                    type="submit"
                    disabled={loading}
                    className={combine(
                      getPrimaryButtonClass(),
                      "w-full sm:w-auto flex items-center justify-center space-x-2 disabled:opacity-50 disabled:cursor-not-allowed"
                    )}
                  >
                    {loading ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div>
                        <span className="text-sm">Saving Route...</span>
                      </>
                    ) : (
                      <>
                        <FaSave className="text-sm" />
                        <span className="text-sm">Save Route</span>
                      </>
                    )}
                  </button>
	                  {routeForm.trips.Morning.length === 0 && routeForm.trips.Evening.length === 0 && (
                    <div className="flex items-center text-amber-600 dark:text-amber-400 text-xs">
                      <FaExclamationTriangle className="mr-1" />
                      No stops added - route will be created without stops
                    </div>
                  )}
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Edit Stop Form */}
        {mode === 'editStop' && selectedStop && (
          <div className="animate-fade-in max-w-2xl mx-auto">
            <div className={getCardGradientClass('indigo')}>
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center space-x-4">
                  <div className={combine(
                    "p-3 rounded-lg",
                    theme === 'dark' ? 'bg-indigo-900/30' : 'bg-indigo-100'
                  )}>
                    <FaMapPin className={combine(
                      "text-lg",
                      theme === 'dark' ? 'text-indigo-400' : 'text-indigo-600'
                    )} />
                  </div>
                  <div>
                    <h2 className={combine("text-xl font-bold", get('text', 'primary'))}>
                      Edit Bus Stop
                    </h2>
                    <p className={combine("text-sm mt-1", get('text', 'secondary'))}>
                      Update stop information
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => {
                    setMode('routes');
                    setSelectedStop(null);
                  }}
                  className={combine(getSecondaryButtonClass(), "text-sm")}
                >
                  <FaTimes className="mr-1 inline text-xs" />
                  Cancel
                </button>
              </div>

              <form onSubmit={updateStop} className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className={combine("block text-sm font-medium mb-2", get('text', 'primary'))}>
                      Trip *
                    </label>
                    <select
                      value={stopForm.trip_type}
                      onChange={(e) => setStopForm({ ...stopForm, trip_type: e.target.value as TripType })}
                      required
                      className={getInputClass()}
                    >
                      <option value="Morning">Morning Pickup</option>
                      <option value="Evening">Evening Drop</option>
                    </select>
                  </div>
                  <div>
                    <label className={combine("block text-sm font-medium mb-2", get('text', 'primary'))}>
                      Stop Name *
                    </label>
                    <input
                      type="text"
                      value={stopForm.name}
                      onChange={(e) => setStopForm({...stopForm, name: e.target.value})}
                      required
                      className={getInputClass()}
                      placeholder="e.g., Central Station"
                    />
                  </div>
                  <div>
                    <label className={combine("block text-sm font-medium mb-2", get('text', 'primary'))}>
                      Arrival Time *
                    </label>
                    <input
                      type="time"
                      value={stopForm.time}
                      onChange={(e) => setStopForm({...stopForm, time: e.target.value})}
                      required
                      className={getInputClass()}
                    />
                  </div>
                  <div>
                    <label className={combine("block text-sm font-medium mb-2", get('text', 'primary'))}>
                      Stop Order *
                    </label>
                    <input
                      type="number"
                      min="1"
                      value={stopForm.order}
                      onChange={(e) => setStopForm({...stopForm, order: parseInt(e.target.value) || 1})}
                      required
                      className={getInputClass()}
                    />
                  </div>
                  <div>
                    <label className={combine("block text-sm font-medium mb-2", get('text', 'primary'))}>
                      Latitude
                    </label>
                    <input
                      type="number"
                      step="any"
                      value={stopForm.latitude}
                      onChange={(e) => setStopForm({...stopForm, latitude: e.target.value})}
                      className={getInputClass()}
                      placeholder="e.g., 10.7905"
                    />
                  </div>
                  <div>
                    <label className={combine("block text-sm font-medium mb-2", get('text', 'primary'))}>
                      Longitude
                    </label>
                    <input
                      type="number"
                      step="any"
                      value={stopForm.longitude}
                      onChange={(e) => setStopForm({...stopForm, longitude: e.target.value})}
                      className={getInputClass()}
                      placeholder="e.g., 78.7047"
                    />
                  </div>
                </div>
                <div className="flex justify-end">
                  <button
                    type="button"
                    onClick={openEditStopLocationPicker}
                    className={combine(
                      getSecondaryButtonClass(),
                      "text-sm flex items-center space-x-2"
                    )}
                    title="Pick location from map"
                  >
                    <FaGlobe className="text-sm" />
                    <span>Pick on Map</span>
                  </button>
                </div>

                <div className="flex space-x-3 pt-6 border-t border-gray-200 dark:border-gray-700">
                  <button
                    type="submit"
                    disabled={loading}
                    className={combine(
                      getPrimaryButtonClass(),
                      "flex items-center space-x-2 text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                    )}
                  >
                    {loading ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div>
                        <span className="text-sm">Updating...</span>
                      </>
                    ) : (
                      <>
                        <FaSave className="text-sm" />
                        <span className="text-sm">Update Stop</span>
                      </>
                    )}
                  </button>
                  <button
                    type="button"
                    onClick={() => deleteStop(stopForm.stop_id)}
                    className={combine(getDangerButtonClass(), "flex items-center space-x-2 text-sm")}
                  >
                    <FaTrash className="text-sm" />
                    <span className="text-sm">Delete Stop</span>
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Assignments View (Bulk Allocation) */}
        {mode === 'assignments' && (
          <div className="animate-fade-in mx-auto">
            <div className={getCardGradientClass('emerald')}>
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4 sm:mb-6">
                <div className="flex items-center space-x-3 sm:space-x-4">
                  <div className={combine(
                    "p-2 sm:p-3 rounded-lg sm:rounded-xl",
                    theme === 'dark' ? 'bg-emerald-900/30' : 'bg-emerald-100'
                  )}>
                    <FaUserFriends className={combine(
                      "text-base sm:text-lg",
                      theme === 'dark' ? 'text-emerald-400' : 'text-emerald-600'
                    )} />
                  </div>
                  <div>
                    <h2 className={combine("text-lg sm:text-xl font-bold", get('text', 'primary'))}>
                      Bulk Passenger Assignment
                    </h2>
                    <p className={combine("text-xs sm:text-sm mt-1", get('text', 'secondary'))}>
                      Assign multiple students, teachers, and staff to a bus with conflict detection
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setMode('buses')}
                  className={combine(getSecondaryButtonClass(), "w-full sm:w-auto")}
                >
                  <FaTimes className="mr-1 inline text-xs" />
                  Close
                </button>
              </div>

              <form onSubmit={bulkAssignPassengers} className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4">
                  <div>
                    <label className={combine("block text-xs sm:text-sm font-medium mb-2", get('text', 'primary'))}>
                      Select Bus *
                    </label>
                    <select
                      value={bulkAssignForm.bus_number}
                      onChange={async (e) => {
                        const selectedBus = e.target.value;
                        if (!selectedBus) {
                          setBulkAssignForm({ bus_number: '', students: [], teachers: [], staff: [] });
                          setSelectedPassengerStops({});
                          setAssignmentBusStops([]);
                          return;
                        }

                        await loadAssignmentBusStops(selectedBus);
                        const allocationData = await fetchAllocation(selectedBus);
                        if (allocationData) {
                          const assigned = extractAssignedIdsFromAllocation(allocationData);
                          setBulkAssignForm({
                            bus_number: selectedBus,
                            students: assigned.students,
                            teachers: assigned.teachers,
                            staff: assigned.staff,
                          });
                          setSelectedPassengerStops(assigned.stopMap || {});
                          toastInfo('Current allocation loaded');
                        } else {
                          setBulkAssignForm({
                            bus_number: selectedBus,
                            students: [],
                            teachers: [],
                            staff: [],
                          });
                          setSelectedPassengerStops({});
                        }
                      }}
                      required
                      className={getInputClass()}
                    >
                      <option value="">Choose a bus</option>
                      {vehicles.map(vehicle => (
                        <option key={vehicle.id} value={vehicle.bus_number}>
                          Bus {vehicle.bus_number} (Capacity: {vehicle.capacity})
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className={combine("block text-xs sm:text-sm font-medium mb-2", get('text', 'primary'))}>
                      Available Capacity
                    </label>
                    <div className={combine(
                      "px-3 sm:px-4 py-2.5 sm:py-3 rounded-lg sm:rounded-xl flex items-center justify-between",
                      theme === 'dark' ? 'bg-gray-800' : 'bg-gray-100'
                    )}>
                      <span className={combine("text-xs sm:text-sm", get('text', 'secondary'))}>
                        {(() => {
                          const bus = vehicles.find(v => v.bus_number === bulkAssignForm.bus_number);
                          const totalAssigned = bulkAssignForm.students.length + 
                                               bulkAssignForm.teachers.length + 
                                               bulkAssignForm.staff.length;
                          const available = bus ? bus.capacity - totalAssigned : 0;
                          return available;
                        })()} seats
                      </span>
                      <FaUsers className={combine(
                        "text-base sm:text-lg",
                        theme === 'dark' ? 'text-gray-600' : 'text-gray-400'
                      )} />
                    </div>
                  </div>
                </div>

                <div className={combine(
                  "p-3 sm:p-4 rounded-lg sm:rounded-xl",
                  theme === 'dark' ? 'bg-gray-800' : 'bg-gray-100'
                )}>
                  <h4 className={combine("text-xs sm:text-sm font-semibold mb-3", get('text', 'primary'))}>
                    Selected Passengers ({bulkAssignForm.students.length + bulkAssignForm.teachers.length + bulkAssignForm.staff.length})
                  </h4>
                  <div className="flex flex-wrap gap-2 mb-3">
                    {(['Student', 'Teacher', 'Staff'] as PassengerType[]).map((type) => (
                      <button
                        key={`assign-toggle-${type}`}
                        type="button"
                        onClick={() =>
                          setAssignmentTypeExpanded((prev) => ({ ...prev, [type]: !prev[type] }))
                        }
                        className={combine(
                          getSecondaryButtonClass(),
                          "px-2.5 py-1.5 text-xs flex items-center gap-1"
                        )}
                      >
                        {assignmentTypeExpanded[type] ? <FaSortUp className="text-xs" /> : <FaSortDown className="text-xs" />}
                        <span>{type === 'Staff' ? 'Staff' : `${type}s`}</span>
                      </button>
                    ))}
                  </div>
                  <div className={combine(
                    "rounded-lg sm:rounded-xl border overflow-hidden",
                    theme === 'dark' ? 'border-gray-700 bg-gray-900' : 'border-gray-200 bg-white'
                  )}>
                    <div className="overflow-x-auto">
                      <table className="w-full min-w-[860px] divide-y divide-gray-200 dark:divide-gray-700">
                        <thead className={combine(theme === 'dark' ? 'bg-gray-800' : 'bg-gray-50')}>
                          <tr>
                            <th className={combine("px-3 py-2.5 text-left text-xs font-semibold", get('text', 'secondary'))}>Select</th>
                            <th className={combine("px-3 py-2.5 text-left text-xs font-semibold", get('text', 'secondary'))}>Type</th>
                            <th className={combine("px-3 py-2.5 text-left text-xs font-semibold", get('text', 'secondary'))}>ID</th>
                            <th className={combine("px-3 py-2.5 text-left text-xs font-semibold", get('text', 'secondary'))}>Name</th>
                            <th className={combine("px-3 py-2.5 text-left text-xs font-semibold", get('text', 'secondary'))}>Details</th>
                            <th className={combine("px-3 py-2.5 text-left text-xs font-semibold", get('text', 'secondary'))}>Stop Location</th>
                          </tr>
                        </thead>
                        <tbody className={combine("divide-y", theme === 'dark' ? 'divide-gray-800' : 'divide-gray-100')}>
                          {filteredCandidatePassengerRows.map((row) => {
                            const checked = isPassengerSelected(row.type, row.id);
                            const selectedStopId = getSelectedStopId(row.type, row.id);
                            return (
                              <tr
                                key={`${row.type}-${row.id}`}
                                className={combine(
                                  "transition-colors",
                                  checked
                                    ? theme === 'dark' ? 'bg-blue-900/20' : 'bg-blue-50'
                                    : theme === 'dark' ? 'hover:bg-gray-800/80' : 'hover:bg-gray-50'
                                )}
                              >
                                <td className="px-3 py-2.5">
                                  <input
                                    type="checkbox"
                                    checked={checked}
                                    onChange={(e) => setPassengerSelection(row.type, row.id, e.target.checked)}
                                    className="h-4 w-4 rounded border-gray-400"
                                  />
                                </td>
                                <td className={combine("px-3 py-2.5 text-xs", get('text', 'primary'))}>{row.type}</td>
                                <td className={combine("px-3 py-2.5 text-xs font-mono", get('text', 'primary'))}>{row.id}</td>
                                <td className={combine("px-3 py-2.5 text-xs", get('text', 'primary'))}>{row.name}</td>
                                <td className={combine("px-3 py-2.5 text-xs", get('text', 'secondary'))}>{row.details}</td>
                                <td className="px-3 py-2.5">
                                  <select
                                    value={selectedStopId ?? ''}
                                    onChange={(e) => {
                                      const value = e.target.value;
                                      setPassengerStop(row.type, row.id, value ? Number(value) : null);
                                    }}
                                    disabled={!checked || selectedBusRouteStops.length === 0 || stopsLoading}
                                    className={combine(
                                      "w-full min-w-[170px] rounded-lg border px-2 py-1.5 text-xs",
                                      theme === 'dark'
                                        ? 'bg-gray-900 border-gray-700 text-gray-100'
                                        : 'bg-white border-gray-300 text-gray-900',
                                      (!checked || selectedBusRouteStops.length === 0 || stopsLoading) ? 'opacity-50 cursor-not-allowed' : ''
                                    )}
                                  >
                                    <option value="">Select stop</option>
                                    {selectedBusRouteStops.map((stop) => (
                                      <option key={stop.id} value={stop.id}>
                                        {stop.stop_name}
                                      </option>
                                    ))}
                                  </select>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  </div>
                  {stopsLoading && bulkAssignForm.bus_number && (
                    <p className={combine("text-xs mt-2", get('text', 'tertiary'))}>
                      Loading stop locations...
                    </p>
                  )}
                  {!stopsLoading && selectedBusRouteStops.length === 0 && bulkAssignForm.bus_number && (
                    <p className={combine("text-xs mt-2", get('text', 'tertiary'))}>
                      No route stops found for this bus. Add route stops to assign stop location.
                    </p>
                  )}
                </div>

                <div className="flex flex-col sm:flex-row sm:items-center gap-3 pt-4 sm:pt-6 border-t border-gray-200 dark:border-gray-700">
                  <button
                    type="submit"
                    disabled={loading || !bulkAssignForm.bus_number}
                    className={combine(
                      getPrimaryButtonClass(),
                      "w-full sm:w-auto flex items-center justify-center space-x-2 disabled:opacity-50 disabled:cursor-not-allowed"
                    )}
                  >
                    {loading ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div>
                        <span className="text-sm">Assigning...</span>
                      </>
                    ) : (
                      <>
                        <FaUserCheck className="text-sm" />
                        <span className="text-sm">Assign Passengers</span>
                      </>
                    )}
                  </button>
                  {bulkAssignForm.bus_number && (
                    <button
                      type="button"
                      onClick={() => fetchPassengerList(bulkAssignForm.bus_number)}
                      className={combine(getSecondaryButtonClass(), "w-full sm:w-auto flex items-center justify-center space-x-2")}
                    >
                      <FaEye className="text-sm" />
                      <span>View Current Passengers</span>
                    </button>
                  )}
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Passengers View */}
        {mode === 'passengers' && (
          <div className="animate-fade-in max-w-4xl mx-auto">
            <div className={getCardGradientClass('indigo')}>
              <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 mb-4 sm:mb-6">
                <div className="flex items-center space-x-3 sm:space-x-4">
                  <div className={combine(
                    "p-2 sm:p-3 rounded-lg sm:rounded-xl",
                    theme === 'dark' ? 'bg-indigo-900/30' : 'bg-indigo-100'
                  )}>
                    <FaUsers className={combine(
                      "text-base sm:text-lg",
                      theme === 'dark' ? 'text-indigo-400' : 'text-indigo-600'
                    )} />
                  </div>
                  <div>
                    <h2 className={combine("text-lg sm:text-xl font-bold", get('text', 'primary'))}>
                      Passenger List
                    </h2>
                    <div className="flex flex-wrap items-center gap-2 sm:gap-3 mt-1">
                      <span className={combine("text-xs sm:text-sm", get('text', 'secondary'))}>
                        Bus {selectedBus?.bus_number || bulkAssignForm.bus_number}
                      </span>
                      <span className={combine(
                        "px-2 py-0.5 text-xs rounded-full",
                        theme === 'dark' ? 'bg-gray-800' : 'bg-gray-200'
                      )}>
                        Capacity: {currentBusCapacity}
                      </span>
                      <span className={combine(
                        "px-2 py-0.5 text-xs rounded-full",
                        currentOccupied >= currentBusCapacity * 0.9
                          ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
                          : 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400'
                      )}>
                        Occupied: {currentOccupied} ({Math.round((currentOccupied / (currentBusCapacity || 1)) * 100)}%)
                      </span>
                    </div>
                  </div>
                </div>
                <div className="flex flex-col sm:flex-row gap-2 w-full lg:w-auto">
                  <button
                    onClick={() => {
                      setBulkAssignForm({ ...bulkAssignForm, bus_number: selectedBus?.bus_number || bulkAssignForm.bus_number });
                      setMode('assignments');
                    }}
                    className={combine(getSuccessButtonClass(), "w-full sm:w-auto flex items-center justify-center space-x-2")}
                  >
                    <FaUserPlus className="text-xs" />
                    <span>Add More</span>
                  </button>
                  <button
                    onClick={() => setMode('buses')}
                    className={combine(getSecondaryButtonClass(), "w-full sm:w-auto")}
                  >
                    <FaArrowLeft className="mr-1 inline text-xs" />
                    Back
                  </button>
                </div>
              </div>

              {passengers.length === 0 ? (
                <div className="p-6 sm:p-8 text-center">
                  <div className={combine(
                    "inline-block p-3 sm:p-4 rounded-full mb-3",
                    theme === 'dark' ? 'bg-indigo-900/30' : 'bg-indigo-100'
                  )}>
                    <FaUsers className={combine(
                      "text-xl sm:text-2xl",
                      theme === 'dark' ? 'text-indigo-400' : 'text-indigo-600'
                    )} />
                  </div>
                  <h3 className={combine("text-base sm:text-lg font-medium mb-1", get('text', 'primary'))}>No passengers assigned</h3>
                  <p className={combine("text-xs sm:text-sm mb-4", get('text', 'secondary'))}>
                    This bus currently has no passengers. Use the bulk assignment feature to add passengers.
                  </p>
                  <button
                    onClick={() => {
                      setBulkAssignForm({ ...bulkAssignForm, bus_number: selectedBus?.bus_number || bulkAssignForm.bus_number });
                      setMode('assignments');
                    }}
                    className={combine(getPrimaryButtonClass(), "mt-2")}
                  >
                    <FaUserFriends className="mr-2 inline" />
                    Assign Passengers
                  </button>
                </div>
              ) : (
                <>
                  <div className="flex flex-wrap gap-2 mb-4">
                    {(['Student', 'Teacher', 'Staff'] as PassengerType[]).map((type) => (
                      <button
                        key={`passenger-toggle-${type}`}
                        type="button"
                        onClick={() =>
                          setPassengerTypeExpanded((prev) => ({ ...prev, [type]: !prev[type] }))
                        }
                        className={combine(
                          getSecondaryButtonClass(),
                          "px-2.5 py-1.5 text-xs flex items-center gap-1"
                        )}
                      >
                        {passengerTypeExpanded[type] ? <FaSortUp className="text-xs" /> : <FaSortDown className="text-xs" />}
                        <span>{type === 'Staff' ? 'Staff' : `${type}s`}</span>
                      </button>
                    ))}
                  </div>
                  {/* Passenger Table */}
                  <div className="w-full overflow-x-auto">
                    <table className="w-full min-w-[860px] xl:min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                      <thead className={theme === 'dark' ? 'bg-gray-800' : 'bg-gray-50'}>
                        <tr>
                          <th className={combine(
                            "px-3 sm:px-4 py-3 text-left text-xs font-medium uppercase tracking-wider whitespace-nowrap",
                            get('text', 'tertiary')
                          )}>
                            Type
                          </th>
                          <th className={combine(
                            "px-3 sm:px-4 py-3 text-left text-xs font-medium uppercase tracking-wider whitespace-nowrap",
                            get('text', 'tertiary')
                          )}>
                            ID
                          </th>
                          <th className={combine(
                            "px-3 sm:px-4 py-3 text-left text-xs font-medium uppercase tracking-wider whitespace-nowrap",
                            get('text', 'tertiary')
                          )}>
                            Name
                          </th>
                          <th className={combine(
                            "px-3 sm:px-4 py-3 text-left text-xs font-medium uppercase tracking-wider whitespace-nowrap",
                            get('text', 'tertiary')
                          )}>
                            Stop Location
                          </th>
                          <th className={combine(
                            "px-3 sm:px-4 py-3 text-left text-xs font-medium uppercase tracking-wider whitespace-nowrap",
                            get('text', 'tertiary')
                          )}>
                            Actions
                          </th>
                        </tr>
                      </thead>
                      <tbody className={combine("divide-y", get('border', 'primary'))}>
                        {filteredPassengers.map((passenger, index) => (
                          <tr 
                            key={index} 
                            className={combine(
                              "transition-colors duration-150",
                              theme === 'dark' ? 'hover:bg-gray-800' : 'hover:bg-gray-50'
                            )}
                          >
                            <td className="px-3 sm:px-4 py-3">
                              <span className={combine(
                                "px-2.5 sm:px-3 py-1 rounded-full text-xs font-medium whitespace-nowrap",
                                passenger.type === 'Student'
                                  ? theme === 'dark' ? 'bg-blue-900/30 text-blue-300' : 'bg-blue-100 text-blue-700'
                                  : passenger.type === 'Teacher'
                                  ? theme === 'dark' ? 'bg-blue-900/30 text-blue-300' : 'bg-blue-100 text-blue-700'
                                  : theme === 'dark' ? 'bg-amber-900/30 text-amber-300' : 'bg-amber-100 text-amber-700'
                              )}>
                                {passenger.type}
                              </span>
                            </td>
                            <td className="px-3 sm:px-4 py-3">
                              <div className="flex items-center space-x-2">
                                {passenger.type === 'Student' && (
                                  <FaUserGraduate className={combine("text-sm", theme === 'dark' ? 'text-blue-400' : 'text-blue-600')} />
                                )}
                                {passenger.type === 'Teacher' && (
                                  <FaUserTie className={combine("text-sm", theme === 'dark' ? 'text-blue-400' : 'text-blue-600')} />
                                )}
                                {passenger.type === 'Staff' && (
                                  <FaUserCog className={combine("text-sm", theme === 'dark' ? 'text-amber-400' : 'text-amber-600')} />
                                )}
                                <span className={combine("font-mono text-xs sm:text-sm", get('text', 'primary'))}>
                                  {passenger.id}
                                </span>
                              </div>
                            </td>
                            <td className="px-3 sm:px-4 py-3">
                              <span className={combine("text-sm sm:text-base font-medium", get('text', 'primary'))}>
                                {passenger.name}
                              </span>
                            </td>
                            <td className="px-3 sm:px-4 py-3">
                              <span className={combine("text-xs sm:text-sm", get('text', 'secondary'))}>
                                {passenger.stop_name || '-'}
                              </span>
                            </td>
                            <td className="px-3 sm:px-4 py-3">
                              <button
                                onClick={() => {
                                  if (selectedBus) {
                                    if (passenger.type === 'Student') {
                                      removePassengers(selectedBus.bus_number, [passenger.id], [], []);
                                    } else if (passenger.type === 'Teacher') {
                                      removePassengers(selectedBus.bus_number, [], [passenger.id], []);
                                    } else {
                                      removePassengers(selectedBus.bus_number, [], [], [passenger.id]);
                                    }
                                  }
                                }}
                                className={combine(
                                  "text-xs px-3 py-1.5 rounded-lg transition-colors whitespace-nowrap",
                                  "bg-red-100 text-red-700 hover:bg-red-200",
                                  "dark:bg-red-900/30 dark:text-red-400 dark:hover:bg-red-900/50"
                                )}
                              >
                                Remove
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  {/* Bulk Actions */}
                  <div className="mt-4 sm:mt-6 pt-4 sm:pt-6 border-t border-gray-200 dark:border-gray-700">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      <p className={combine("text-xs sm:text-sm", get('text', 'secondary'))}>
                        Showing {filteredPassengers.length} of {passengers.length} passengers
                      </p>
                      <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
                        <button
                          onClick={async () => {
                            const busNumber = selectedBus?.bus_number || bulkAssignForm.bus_number;
                            if (!busNumber || selectedPassengerKeys.length === 0) return;
                            const selectedRows = selectedPassengerKeys
                              .map((key) => {
                                const [type, ...rest] = key.split(':');
                                return { type, id: rest.join(':') };
                              })
                              .filter((row) => row.type && row.id);
                            await removePassengers(
                              busNumber,
                              selectedRows.filter((r) => r.type === 'Student').map((r) => r.id),
                              selectedRows.filter((r) => r.type === 'Teacher').map((r) => r.id),
                              selectedRows.filter((r) => r.type === 'Staff').map((r) => r.id)
                            );
                            setSelectedPassengerKeys([]);
                          }}
                          disabled={selectedPassengerKeys.length === 0}
                          className={combine(
                            getDangerButtonClass(),
                            "w-full sm:w-auto disabled:opacity-50 disabled:cursor-not-allowed"
                          )}
                        >
                          <FaTrash className="mr-1 inline text-xs" />
                          Remove Selected
                        </button>
                        <button
                          onClick={() => {
                            if (selectedBus) {
                              confirmRemoveAllPassengers(selectedBus.bus_number);
                            }
                          }}
                          className={combine(getDangerButtonClass(), "w-full sm:w-auto")}
                        >
                          <FaTrash className="mr-1 inline text-xs" />
                          Remove All Passengers
                        </button>
                      </div>
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>
        )}

        {/* Assign Driver View */}
        {mode === 'assignDriver' && (
          <div className="animate-fade-in max-w-2xl mx-auto">
            <div className={getCardGradientClass('emerald')}>
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center space-x-4">
                  <div className={combine(
                    "p-3 rounded-lg",
                    theme === 'dark' ? 'bg-emerald-900/30' : 'bg-emerald-100'
                  )}>
                    <FaUserTie className={combine(
                      "text-lg",
                      theme === 'dark' ? 'text-emerald-400' : 'text-emerald-600'
                    )} />
                  </div>
                  <div>
                    <h2 className={combine("text-xl font-bold", get('text', 'primary'))}>
                      Assign Driver to Bus
                    </h2>
                    <p className={combine("text-sm mt-1", get('text', 'secondary'))}>
                      Assign a transport staff member as driver with validation
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setMode('buses')}
                  className={combine(getSecondaryButtonClass(), "text-sm")}
                >
                  <FaTimes className="mr-1 inline text-xs" />
                  Cancel
                </button>
              </div>

              <form onSubmit={assignDriver} className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className={combine("block text-sm font-medium mb-2", get('text', 'primary'))}>
                      Select Bus *
                    </label>
                    <select
                      value={driverAssignForm.bus_number}
                      onChange={(e) => setDriverAssignForm({...driverAssignForm, bus_number: e.target.value})}
                      required
                      className={getInputClass()}
                    >
                      <option value="">Choose a bus</option>
                      {vehicles.map(vehicle => (
                        <option 
                          key={vehicle.id} 
                          value={vehicle.bus_number}
                          disabled={vehicle.driver !== null}
                          className={vehicle.driver ? 'text-gray-400' : ''}
                        >
                          Bus {vehicle.bus_number} 
                          {vehicle.driver ? ` (Driver: ${getDriverName(vehicle.driver)})` : ' (No Driver)'}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className={combine("block text-sm font-medium mb-2", get('text', 'primary'))}>
                      Select Driver *
                    </label>
                    <select
                      value={driverAssignForm.staff_id}
                      onChange={(e) => setDriverAssignForm({...driverAssignForm, staff_id: e.target.value})}
                      required
                      className={getInputClass()}
                    >
                      <option value="">Choose a driver</option>
                      {availableDrivers.map(driver => (
                        <option key={driver.id} value={driver.staff_id}>
                          {driver.name} ({driver.staff_id})
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Driver Information Card */}
                {driverAssignForm.staff_id && (
                  <div className={combine(
                    "p-4 rounded-lg",
                    theme === 'dark' ? 'bg-gray-800' : 'bg-gray-100'
                  )}>
                    <h4 className={combine("text-sm font-semibold mb-3", get('text', 'primary'))}>
                      Driver Information
                    </h4>
                    {(() => {
                      const driver = availableDrivers.find(d => d.staff_id === driverAssignForm.staff_id);
                      return driver ? (
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <p className={combine("text-xs", get('text', 'tertiary'))}>Full Name</p>
                            <p className={combine("font-medium", get('text', 'primary'))}>{driver.name}</p>
                          </div>
                          <div>
                            <p className={combine("text-xs", get('text', 'tertiary'))}>Staff ID</p>
                            <p className={combine("font-mono font-medium", get('text', 'primary'))}>{driver.staff_id}</p>
                          </div>
                          <div>
                            <p className={combine("text-xs", get('text', 'tertiary'))}>Role</p>
                            <span className={combine(
                              "px-2 py-1 text-xs rounded-full",
                              theme === 'dark' ? 'bg-emerald-900/30 text-emerald-400' : 'bg-emerald-100 text-emerald-700'
                            )}>
                              {driver.role}
                            </span>
                          </div>
                          <div>
                            <p className={combine("text-xs", get('text', 'tertiary'))}>Phone</p>
                            <p className={combine("font-medium", get('text', 'primary'))}>{driver.phone}</p>
                          </div>
                        </div>
                      ) : null;
                    })()}
                  </div>
                )}

                <div className={combine(
                  "p-4 rounded-lg border",
                  theme === 'dark' ? 'border-amber-900/50 bg-amber-900/10' : 'border-amber-200 bg-amber-50'
                )}>
                  <div className="flex items-start space-x-2">
                    <FaInfoCircle className={combine(
                      "mt-0.5",
                      theme === 'dark' ? 'text-amber-400' : 'text-amber-600'
                    )} />
                    <div>
                      <p className={combine("text-sm font-medium", get('text', 'primary'))}>
                        Important Notes:
                      </p>
                      <ul className={combine("text-xs mt-1 space-y-1", get('text', 'secondary'))}>
                        <li>• Only staff with role "Transport Staff" can be assigned as drivers</li>
                        <li>• A driver can only be assigned to one bus at a time</li>
                        <li>• A bus can only have one driver at a time</li>
                        <li>• Unassign existing driver before assigning a new one</li>
                      </ul>
                    </div>
                  </div>
                </div>

                <div className="flex space-x-3 pt-6 border-t border-gray-200 dark:border-gray-700">
                  <button
                    type="submit"
                    disabled={loading}
                    className={combine(
                      getPrimaryButtonClass(),
                      "flex items-center space-x-2 text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                    )}
                  >
                    {loading ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div>
                        <span className="text-sm">Assigning...</span>
                      </>
                    ) : (
                      <>
                        <FaUserCheck className="text-sm" />
                        <span className="text-sm">Assign Driver</span>
                      </>
                    )}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Expenses View */}
        {mode === 'expenses' && (
          <div className={getCardGradientClass('amber')}>
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6">
              <div>
                <h3 className={combine("text-lg sm:text-xl font-bold", get('text', 'primary'))}>Expense Proofs</h3>
                <p className={combine("text-xs sm:text-sm mt-0.5 sm:mt-1", get('text', 'secondary'))}>
                  View all expense proofs with filters
                </p>
              </div>
              <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
                <button
                  onClick={() => {
                    setDateFilter('');
                    setMonthFilter('');
                    setYearFilter('');
                    fetchExpenses();
                  }}
                  className={combine(getSecondaryButtonClass(), "text-xs sm:text-sm w-full sm:w-auto")}
                >
                  <FaHistory className="mr-1 inline text-xs" />
                  Reset
                </button>
                <button
                  onClick={() => setMode('buses')}
                  className={combine(getPrimaryButtonClass(), "text-xs sm:text-sm w-full sm:w-auto")}
                >
                  Back to Buses
                </button>
              </div>
            </div>

            {/* Filters */}
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3 sm:gap-4 mb-6">
              <div>
                <label className={combine("block text-xs sm:text-sm font-medium mb-1.5 sm:mb-2", get('text', 'primary'))}>
                  Filter by Date
                </label>
                <input
                  type="date"
                  value={dateFilter}
                  onChange={(e) => {
                    setDateFilter(e.target.value);
                    setMonthFilter('');
                    setYearFilter('');
                    fetchExpenses(e.target.value);
                  }}
                  className={getInputClass()}
                />
              </div>
              <div>
                <label className={combine("block text-xs sm:text-sm font-medium mb-1.5 sm:mb-2", get('text', 'primary'))}>
                  Filter by Month
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <select
                    value={monthFilter}
                    onChange={(e) => {
                      setMonthFilter(e.target.value);
                      setDateFilter('');
                      if (e.target.value && yearFilter) {
                        fetchExpenses(undefined, e.target.value, yearFilter);
                      }
                    }}
                    className={getInputClass()}
                  >
                    <option value="">Select Month</option>
                    <option value="01">January</option>
                    <option value="02">February</option>
                    <option value="03">March</option>
                    <option value="04">April</option>
                    <option value="05">May</option>
                    <option value="06">June</option>
                    <option value="07">July</option>
                    <option value="08">August</option>
                    <option value="09">September</option>
                    <option value="10">October</option>
                    <option value="11">November</option>
                    <option value="12">December</option>
                  </select>
                  <input
                    type="number"
                    placeholder="Year"
                    value={yearFilter}
                    onChange={(e) => {
                      setYearFilter(e.target.value);
                      setDateFilter('');
                      if (monthFilter && e.target.value) {
                        fetchExpenses(undefined, monthFilter, e.target.value);
                      }
                    }}
                    className={getInputClass()}
                    min="2020"
                    max="2030"
                  />
                </div>
              </div>
              <div>
                <label className={combine("block text-xs sm:text-sm font-medium mb-1.5 sm:mb-2", get('text', 'primary'))}>
                  Search
                </label>
                <div className="relative">
                  <FaSearch className={combine(
                    "absolute left-3 top-1/2 transform -translate-y-1/2 text-xs sm:text-sm",
                    get('icon', 'secondary')
                  )} />
                  <input
                    type="text"
                    placeholder="Search by bus, uploader, title..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className={getInputClass()}
                    style={{ paddingLeft: '2.5rem' }}
                  />
                </div>
              </div>
            </div>

            {loading ? (
              <div className="p-6 sm:p-8 text-center">
                <div className="text-center">
                  <div className="relative mx-auto w-16 h-16">
                    <div className="animate-spin rounded-full h-16 w-16 border-4 border-blue-200 border-t-blue-600"></div>
                    <div className="absolute inset-0 flex items-center justify-center">
                      <FaFileInvoiceDollar className="h-8 w-8 text-blue-600 animate-pulse" />
                    </div>
                  </div>
                  <p className={combine("mt-4 sm:mt-6 text-xs sm:text-sm font-medium", get('text', 'secondary'))}>Loading expenses...</p>
                  <p className={combine("text-xs sm:text-sm mt-1 sm:mt-2", get('text', 'tertiary'))}>Preparing expense records</p>
                </div>
              </div>
            ) : filteredExpenses.length === 0 ? (
              <div className="p-6 sm:p-8 text-center">
                <div className={combine(
                  "inline-block p-3 rounded-full mb-3",
                  theme === 'dark' ? 'bg-amber-900/30' : 'bg-amber-100'
                )}>
                  <FaFileInvoiceDollar className={combine(
                    "text-xl",
                    theme === 'dark' ? 'text-amber-400' : 'text-amber-600'
                  )} />
                </div>
                <h3 className={combine("text-sm sm:text-base font-medium mb-1", get('text', 'primary'))}>No expenses found</h3>
                <p className={combine("text-xs sm:text-sm", get('text', 'secondary'))}>
                  {searchTerm || dateFilter || monthFilter ? 'Try adjusting your filters' : 'No expense proofs have been uploaded yet'}
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-6">
                {filteredExpenses.map((expense) => (
                  <div 
                    key={expense.id} 
                    className={combine(
                      "p-3 sm:p-4 rounded-lg border transition-all duration-200 hover:shadow-lg",
                      theme === 'dark' ? 'border-gray-700 bg-gray-800/50' : 'border-gray-200 bg-white'
                    )}
                  >
                    <div className="flex justify-between items-start mb-3">
                      <div className="flex items-center space-x-3">
                        <div className={combine(
                          "p-2 rounded-lg",
                          theme === 'dark' ? 'bg-amber-900/30' : 'bg-amber-100'
                        )}>
                          <FaMoneyBillWave className={combine(
                            "text-lg",
                            theme === 'dark' ? 'text-amber-400' : 'text-amber-600'
                          )} />
                        </div>
                        <div>
                          <h4 className={combine("font-semibold text-sm sm:text-base", get('text', 'primary'))}>
                            {expense.title}
                          </h4>
                          <p className={combine("text-xs", get('text', 'tertiary'))}>
                            Bus {expense.bus_number}
                          </p>
                        </div>
                      </div>
                      <span className={combine(
                        "px-2 py-1 text-xs rounded-full",
                        theme === 'dark' ? 'bg-gray-700 text-gray-300' : 'bg-gray-100 text-gray-700'
                      )}>
                        #{expense.id}
                      </span>
                    </div>

                    <p className={combine("text-xs sm:text-sm mb-3", get('text', 'secondary'))}>
                      {expense.description}
                    </p>

                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 mt-4 pt-3 border-t border-gray-200 dark:border-gray-700">
                      <div className="flex items-center space-x-2">
                        <FaUserTie className={combine("text-xs", get('icon', 'secondary'))} />
                        <span className={combine("text-xs", get('text', 'primary'))}>
                          {expense.uploader_name}
                        </span>
                      </div>
                      <div className="flex items-center justify-between sm:justify-start space-x-3">
                        <span className={combine("text-xs", get('text', 'tertiary'))}>
                          {new Date(expense.timestamp).toLocaleDateString()}
                        </span>
                        <a
                          href={`https://senthurvidyalaya-backend.onrender.com${expense.proof_file}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className={combine(
                            "text-xs px-3 py-1.5 rounded-lg flex items-center space-x-1",
                            theme === 'dark' 
                              ? 'bg-blue-900/30 text-blue-400 hover:bg-blue-900/50' 
                              : 'bg-blue-100 text-blue-700 hover:bg-blue-200'
                          )}
                        >
                          <FaDownload className="text-xs" />
                          <span>View Proof</span>
                        </a>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
        {locationPickerState.isOpen && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 p-4">
            <div className={combine(
              "w-full max-w-4xl rounded-xl border shadow-2xl",
              get('bg', 'card'),
              get('border', 'primary')
            )}>
              <div className={combine(
                "flex items-center justify-between px-4 py-3 border-b",
                get('border', 'primary')
              )}>
                <h3 className={combine("text-base font-semibold", get('text', 'primary'))}>
                  Pick Stop Location
                </h3>
                <button
                  type="button"
                  onClick={closeStopLocationPicker}
                  className={combine(getSecondaryButtonClass(), "text-sm")}
                >
                  <FaTimes className="mr-1 inline text-xs" />
                  Close
                </button>
              </div>
              <div className="p-4">
                <p className={combine("text-sm mb-3", get('text', 'secondary'))}>
                  Click on the map to set latitude and longitude for this stop.
                </p>
                <div className="mb-3">
                  <div className="flex gap-2">
                    <input
                      type="search"
                      value={locationSearchQuery}
                      onChange={(event) => setLocationSearchQuery(event.target.value)}
                      onKeyDown={(event) => {
                        if (event.key === 'Enter') {
                          event.preventDefault();
                          void searchStopLocation();
                        }
                      }}
                      placeholder="Search for a place or address"
                      aria-label="Search for a stop location"
                      className={combine(getInputClass(), "min-w-0 flex-1")}
                    />
                    <button
                      type="button"
                      onClick={() => void searchStopLocation()}
                      disabled={isSearchingLocation}
                      className={combine(getPrimaryButtonClass(), "shrink-0")}
                    >
                      {isSearchingLocation ? 'Searching…' : 'Search'}
                    </button>
                  </div>
                  <p className={combine("mt-1 text-xs", get('text', 'tertiary'))}>
                    Search powered by OpenStreetMap.
                  </p>
                  {locationSearchError && (
                    <p role="status" className="mt-2 text-sm text-red-500">
                      {locationSearchError}
                    </p>
                  )}
                  {locationSearchResults.length > 0 && (
                    <ul className={combine("mt-2 max-h-40 overflow-y-auto rounded-lg border", get('border', 'primary'))}>
                      {locationSearchResults.map((result) => (
                        <li key={result.place_id}>
                          <button
                            type="button"
                            onClick={() => selectStopSearchResult(result)}
                            className={combine(
                              "w-full px-3 py-2 text-left text-sm transition-colors",
                              get('text', 'primary'),
                              theme === 'dark' ? 'hover:bg-white/10' : 'hover:bg-slate-100',
                            )}
                          >
                            {result.display_name}
                          </button>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
                <div className="h-[420px] rounded-lg overflow-hidden">
                  <div
                    key={`stop-map-${locationPickerState.mapKey}`}
                    ref={locationPickerMapRef}
                    className="h-full w-full"
                  />
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Delete Confirmation Dialog */}
{showDeleteConfirm && deleteConfig && (
  <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-3 sm:p-4 z-[1000] animate-fade-in backdrop-blur-sm">
    <div className={combine(
      getCardGradientClass('red'),
      "max-w-md w-full shadow-2xl"
    )}>
      <div className="text-center">
        <div className={combine(
          "mx-auto flex items-center justify-center h-10 sm:h-12 w-10 sm:w-12 rounded-full mb-2 mb-3",
          theme === 'dark' ? 'bg-red-900/30' : 'bg-red-100'
        )}>
          <FaTrash className={combine(
            "h-4 sm:h-5 w-4 sm:w-5",
            theme === 'dark' ? 'text-red-400' : 'text-red-600'
          )} />
        </div>
        <h3 className={combine("text-base sm:text-lg font-bold mb-1 sm:mb-1.5", get('text', 'primary'))}>
          {deleteConfig.title}
        </h3>
        <p className={combine("text-xs sm:text-sm mb-3 sm:mb-4", get('text', 'secondary'))}>
          {deleteConfig.message}
        </p>
        <div className="flex space-x-2">
          <button
            onClick={() => setShowDeleteConfirm(false)}
            className={combine(getSecondaryButtonClass(), "text-xs sm:text-sm flex-1")}
            disabled={deleting}
          >
            Cancel
          </button>
          <button
            onClick={async () => {
              if (deleteConfig.onConfirm) {
                await deleteConfig.onConfirm();
              }
            }}
            disabled={deleting}
            className={combine(
              getPrimaryButtonClass(),
              "text-xs sm:text-sm flex-1",
              theme === 'dark'
                ? 'bg-gradient-to-r from-red-600 to-red-700 hover:from-red-700 hover:to-red-800'
                : 'bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700'
            )}
          >
            {deleting ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent mr-2 inline-block"></div>
                Deleting...
              </>
            ) : (
              'Delete'
            )}
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
