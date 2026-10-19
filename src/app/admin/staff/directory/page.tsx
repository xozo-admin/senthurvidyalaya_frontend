"use client";

import { adminApi } from "@/lib/api";

import { useEffect, useState } from "react";
import {
  FaUserTie,
  FaUserPlus,
  FaEdit,
  FaTrash,
  FaSave,
  FaArrowLeft,
  FaPhone,
  FaEnvelope,
  FaSearch,
  FaFilter,
  FaTimes,
  FaCheck,
  FaDownload,
  FaEye,
  FaSort,
  FaSortUp,
  FaSortDown,
  FaCalendarAlt,
  FaMapMarkerAlt,
  FaIdCard,
  FaChartBar,
  FaCog,
  FaChevronLeft,
  FaChevronRight,
  FaBuilding,
  FaMoneyBillWave,
  FaCar,
  FaBox,
  FaInfoCircle,
  FaKey,
  FaUserCircle,
  FaVenusMars,
  FaBirthdayCake,
  FaBriefcase,
  FaTools,
  FaLaptop,
  FaTruck,
  FaUsers,
  FaFileAlt,
  FaHistory,
  FaTasks,
  FaSchool,
} from "react-icons/fa";
import { useTheme } from "@/contexts/ThemeContext";
import { useThemeClasses } from "@/hooks/useThemeClasses";
import { toastSuccess, toastError, toastInfo, toastWarning } from "@/lib/toast";
import { useRouter } from "next/navigation";
import { FiClock } from "react-icons/fi";
import { SchoolScopeSelector, useSchoolScope } from "@/components/admin/SchoolScopeSelector";

interface Staff {
  id: number;
  staff_id: string;
  name: string;
  role: string;
  phone: string;
  email?: string;
  address?: string;
  joining_date?: string;
  bank_account_number?: string;
  ifsc_code?: string;
  account_holder_name?: string;
  bank_name?: string;
  upi_id?: string;
  extra_details?: {
    date_of_birth?: string;
    gender?: string;
    salary_grade?: string;
    emergency_contact?: string;
    qualification?: string;
    [key: string]: any;
  };
}

interface PaginatedStaffResponse {
  count: number;
  next: string | null;
  previous: string | null;
  results: Staff[];
}

type SortField = "name" | "staff_id" | "role" | "joining_date";
type SortDirection = "asc" | "desc";

export default function AllStaffPage() {
  const router = useRouter();
  const { theme } = useTheme();
  const { get, combine } = useThemeClasses();
  const [mode, setMode] = useState<"list" | "add" | "edit" | "profile">("list");
  const [staff, setStaff] = useState<Staff[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterRole, setFilterRole] = useState("all");
  const [sortField, setSortField] = useState<SortField>("name");
  const [sortDirection, setSortDirection] = useState<SortDirection>("asc");
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize] = useState(10);
  const [isMobile, setIsMobile] = useState(false);
  const [totalStaffCount, setTotalStaffCount] = useState(0);
  const [bulkUploadMode, setBulkUploadMode] = useState(false);
  const [csvFile, setCsvFile] = useState<File | null>(null);
  const [imagesZipFile, setImagesZipFile] = useState<File | null>(null);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [roleStats, setRoleStats] = useState<Record<string, number>>({});
  const [selectedStaff, setSelectedStaff] = useState<Staff | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<number | null>(
    null,
  );
  const [resettingStaffId, setResettingStaffId] = useState<number | null>(null);
  const [selectedStaffIds, setSelectedStaffIds] = useState<number[]>([]);
  const schoolScope = useSchoolScope({ storageKey: "allstaff_school_scope" });

  const [formData, setFormData] = useState({
    staff_id: "",
    name: "",
    role: "external_staff",
    phone: "",
    email: "",
    address: "",
    joining_date: "",
    // Extra details fields
    date_of_birth: "",
    gender: "",
    salary_grade: "",
    emergency_contact: "",
    qualification: "",
    account_holder_name: "",
    bank_name: "",
    bank_account_number: "",
    ifsc_code: "",
    upi_id: "",
  });
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const requiredStaffFields = ["staff_id", "name", "role", "phone"];

  const resetStaffLogin = async (member: Staff) => {
    const confirmed = window.confirm(
      `Reset ${member.name}'s login password to the phone number shown in this staff record?`,
    );
    if (!confirmed) return;

    setResettingStaffId(member.id);
    try {
      await adminApi.staff.resetLogin(member.staff_id, schoolScope.scopeParams);
      toastSuccess("Staff login reset. Use the phone number in the staff record as the password.");
    } catch (error: any) {
      const status = error?.response?.status;
      toastError(
        error?.response?.data?.error ||
          error?.response?.data?.detail ||
          error?.response?.data?.message ||
          (status ? `Staff login reset failed (HTTP ${status}).` : error?.message) ||
          "Failed to reset this staff login.",
      );
    } finally {
      setResettingStaffId(null);
    }
  };

  const normalizeStaffType = (value: string) =>
    value?.toString().trim().toLowerCase().replace(/\s+/g, "_");

  // Theme classes (keep your existing theme functions)
  const getBgClass = () =>
    combine(
      get("bg", "primary"),
      "min-h-screen transition-colors duration-200",
    );

  const getCardGradientClass = (color: string = "indigo") => {
    const baseClasses = combine(
      "rounded-xl sm:rounded-2xl p-4 sm:p-6 border shadow-lg transition-all duration-300 group hover:shadow-xl my-2",
      get("border", "primary"),
    );

    const gradients = {
      purple:
        theme === "dark"
          ? "from-gray-800 to-purple-900/10"
          : "from-white to-purple-50",
      emerald:
        theme === "dark"
          ? "from-gray-800 to-emerald-900/10"
          : "from-white to-emerald-50",
      blue:
        theme === "dark"
          ? "from-gray-800 to-blue-900/10"
          : "from-white to-blue-50",
      amber:
        theme === "dark"
          ? "from-gray-800 to-amber-900/10"
          : "from-white to-amber-50",
      red:
        theme === "dark"
          ? "from-gray-800 to-red-900/10"
          : "from-white to-red-50",
      indigo:
        theme === "dark"
          ? "from-gray-800 to-indigo-900/10"
          : "from-white to-indigo-50",
    };

    return combine(
      baseClasses,
      "bg-gradient-to-br",
      gradients[color as keyof typeof gradients] || gradients.indigo,
    );
  };

  const getInputClass = () =>
    combine(
      "px-3 sm:px-4 py-2.5 sm:py-3.5 rounded-lg sm:rounded-xl border focus:ring-2 focus:ring-indigo-500 outline-none transition-all w-full",
      "text-xs sm:text-sm",
      theme === "dark"
        ? "bg-gray-900/70 border-gray-600 text-gray-100 hover:border-gray-500 focus:border-indigo-400"
        : "bg-white border-gray-300 text-gray-900 hover:border-gray-400 focus:border-indigo-500",
      "placeholder:text-xs sm:placeholder:text-sm placeholder:text-[var(--color-text-tertiary)]",
    );

  const getPrimaryButtonClass = () =>
    combine(
      "px-4 sm:px-6 py-2.5 sm:py-3.5 rounded-lg sm:rounded-xl transition-all duration-200 font-medium",
      "text-white shadow-lg hover:shadow-xl hover:scale-[1.02] active:scale-[0.98]",
      "text-xs sm:text-sm",
      theme === "dark"
        ? "bg-gradient-to-r from-indigo-600 to-indigo-700 hover:from-indigo-700 hover:to-indigo-800"
        : "bg-gradient-to-r from-indigo-500 to-indigo-600 hover:from-indigo-600 hover:to-indigo-700",
    );

  const getSecondaryButtonClass = () =>
    combine(
      "px-3 sm:px-4 py-2 sm:py-3 rounded-lg sm:rounded-xl transition-all duration-200 font-medium hover:scale-[1.02] active:scale-[0.98]",
      "text-xs sm:text-sm",
      "border",
      get("border", "secondary"),
      get("bg", "card"),
      get("text", "secondary"),
      "hover:bg-[var(--color-bg-hover)] hover:text-[var(--color-text-primary)]",
    );

  // Role options matching your model
  const roleOptions = [
    {
      value: "admin_staff",
      label: "Admin Staff",
      icon: FaBuilding,
      color: "purple",
    },
    {
      value: "finance_staff",
      label: "Finance Staff",
      icon: FaMoneyBillWave,
      color: "emerald",
    },
    { value: "it_staff", label: "IT Staff", icon: FaLaptop, color: "blue" },
    {
      value: "operations_staff",
      label: "Operations Staff",
      icon: FaTools,
      color: "amber",
    },
    {
      value: "hostel_warden",
      label: "Hostel Warden",
      icon: FaSchool,
      color: "red",
    },
    {
      value: "transport_staff",
      label: "Transport Staff",
      icon: FaTruck,
      color: "indigo",
    },
    {
      value: "external_staff",
      label: "External Staff",
      icon: FaUsers,
      color: "gray",
    },
  ];

  const getStatusBadgeClass = (role: string) => {
    const roleOption = roleOptions.find((r) => r.value === role);
    const color = roleOption?.color || "gray";

    const colorMap: Record<string, string> = {
      purple:
        theme === "dark"
          ? "from-purple-900/30 to-purple-800/30 text-purple-300 border-purple-800"
          : "from-purple-100 to-purple-200 text-purple-700 border-purple-200",
      emerald:
        theme === "dark"
          ? "from-emerald-900/30 to-emerald-800/30 text-emerald-300 border-emerald-800"
          : "from-emerald-100 to-emerald-200 text-emerald-700 border-emerald-200",
      blue:
        theme === "dark"
          ? "from-blue-900/30 to-blue-800/30 text-blue-300 border-blue-800"
          : "from-blue-100 to-blue-200 text-blue-700 border-blue-200",
      amber:
        theme === "dark"
          ? "from-amber-900/30 to-amber-800/30 text-amber-300 border-amber-800"
          : "from-amber-100 to-amber-200 text-amber-700 border-amber-200",
      indigo:
        theme === "dark"
          ? "from-indigo-900/30 to-indigo-800/30 text-indigo-300 border-indigo-800"
          : "from-indigo-100 to-indigo-200 text-indigo-700 border-indigo-200",
      gray:
        theme === "dark"
          ? "from-gray-700 to-gray-800 text-gray-300 border-gray-600"
          : "from-gray-100 to-gray-200 text-gray-700 border-gray-300",
    };

    return combine(
      "px-2 sm:px-3 py-1 sm:py-1.5 text-[10px] sm:text-xs font-medium rounded-full bg-gradient-to-r border flex items-center gap-1 sm:gap-1.5",
      colorMap[color] || colorMap.gray,
    );
  };

  // Fetch all staff
  const fetchStaff = async (page: number) => {
    setLoading(true);
    try {
      const params: {
        page: number;
        page_size: number;
        search?: string;
        role?: string;
        school_id?: number;
      } = {
        page,
        page_size: pageSize,
        ...schoolScope.scopeParams,
      };

      if (searchTerm.trim()) params.search = searchTerm.trim();
      if (filterRole !== "all") params.role = filterRole;

      const res = await adminApi.staff.listPaginated(params);
      const data = (res.data || {}) as PaginatedStaffResponse;
      const results = Array.isArray(data.results) ? data.results : [];
      setStaff(results);
      setTotalStaffCount(typeof data.count === "number" ? data.count : 0);
    } catch (error: any) {
      console.error("Error fetching staff:", error);
      setStaff([]);
      setTotalStaffCount(0);
    } finally {
      setLoading(false);
    }
  };

  const fetchStaffStats = async () => {
    try {
      const allStaff: Staff[] = [];
      let page = 1;
      let hasMore = true;
      const statsPageSize = 200;

      while (hasMore) {
        const params: {
          page: number;
          page_size: number;
          search?: string;
          role?: string;
          school_id?: number;
        } = {
          page,
          page_size: statsPageSize,
          ...schoolScope.scopeParams,
        };

        if (searchTerm.trim()) params.search = searchTerm.trim();
        if (filterRole !== "all") params.role = filterRole;

        const res = await adminApi.staff.listPaginated(params);
        const data = (res.data || {}) as PaginatedStaffResponse;
        const pageResults = Array.isArray(data.results) ? data.results : [];
        allStaff.push(...pageResults);

        hasMore = !!data.next;
        page += 1;
      }

      const counts: Record<string, number> = {};
      roleOptions.forEach((role) => {
        counts[role.value] = allStaff.filter(
          (s) => s.role === role.value,
        ).length;
      });
      setRoleStats(counts);
    } catch (error) {
      console.error("Error fetching staff stats:", error);
      setRoleStats({});
    }
  };

  const updateFormField = (field: string, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    setFormErrors((prev) => ({ ...prev, [field]: "" }));
  };

  const parseApiErrors = (error: any): Record<string, string> => {
    const data = error?.response?.data;
    if (!data || typeof data !== "object") return {};

    const extracted: Record<string, string> = {};
    Object.entries(data).forEach(([field, value]) => {
      if (Array.isArray(value)) {
        extracted[field] = value.join(", ");
      } else if (typeof value === "string") {
        extracted[field] = value;
      } else if (value && typeof value === "object") {
        extracted[field] = Object.values(value as Record<string, unknown>)
          .flat()
          .map((v) => String(v))
          .join(", ");
      }
    });
    if (extracted.staff_id) extracted.staff_id = "Staff ID is required.";
    if (extracted.name) extracted.name = "Staff name is required.";
    if (extracted.role) extracted.role = "Role is required.";
    if (extracted.phone) extracted.phone = "Phone number is required.";
    return extracted;
  };

  const validateStaffForm = (isEdit: boolean) => {
    const nextErrors: Record<string, string> = {};
    if (!isEdit && !formData.staff_id.trim())
      nextErrors.staff_id = "Staff ID is required.";
    if (!formData.name.trim()) nextErrors.name = "Staff name is required.";
    if (!formData.role.trim()) nextErrors.role = "Role is required.";
    if (!formData.phone.trim()) nextErrors.phone = "Phone number is required.";
    setFormErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  };

  // Create new staff
  const createStaff = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateStaffForm(false)) {
      toastError("Please fill all required fields.");
      return;
    }
    setLoading(true);

    // Prepare payload exactly matching serializer
    const payload: any = {
      staff_id: formData.staff_id.trim(),
      name: formData.name.trim(),
      role: formData.role,
      phone: formData.phone.trim(),
      extra_details: {
        ...(formData.date_of_birth && {
          date_of_birth: formData.date_of_birth,
        }),
        ...(formData.gender && { gender: formData.gender }),
        ...(formData.salary_grade.trim() && {
          salary_grade: formData.salary_grade.trim(),
        }),
        ...(formData.emergency_contact.trim() && {
          emergency_contact: formData.emergency_contact.trim(),
        }),
        ...(formData.qualification.trim() && {
          qualification: formData.qualification.trim(),
        }),
      },
    };
    if (formData.email.trim()) payload.email = formData.email.trim();
    if (formData.address.trim()) payload.address = formData.address.trim();
    if (formData.joining_date) payload.joining_date = formData.joining_date;
    if (formData.bank_account_number.trim())
      payload.bank_account_number = formData.bank_account_number.trim();
    if (formData.ifsc_code.trim())
      payload.ifsc_code = formData.ifsc_code.trim();
    if (formData.account_holder_name.trim())
      payload.account_holder_name = formData.account_holder_name.trim();
    if (formData.bank_name.trim())
      payload.bank_name = formData.bank_name.trim();
    if (formData.upi_id.trim()) payload.upi_id = formData.upi_id.trim();

    try {
      await adminApi.staff.create({
        ...payload,
        ...schoolScope.scopeParams,
      });
      toastSuccess("Staff member created successfully");
      setMode("list");
      resetForm();
      fetchStaff(currentPage);
      fetchStaffStats();
    } catch (error: any) {
      console.error("Error creating staff:", error);
      const apiErrors = parseApiErrors(error);
      const requiredApiErrors = Object.fromEntries(
        Object.entries(apiErrors).filter(([key]) =>
          requiredStaffFields.includes(key),
        ),
      );
      if (Object.keys(requiredApiErrors).length > 0)
        setFormErrors(requiredApiErrors);
      const firstError =
        Object.values(requiredApiErrors)[0] ||
        Object.values(apiErrors)[0] ||
        error?.response?.data?.detail ||
        error?.response?.data?.error ||
        "Failed to create staff member.";
      toastError(firstError);
    } finally {
      setLoading(false);
    }
  };

  // Update staff
  const updateStaff = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateStaffForm(true)) {
      toastError("Please fill all required fields.");
      return;
    }
    setLoading(true);

    if (!selectedStaff) {
      setLoading(false);
      return;
    }

    // Prepare payload for update - only model fields
    const payload: any = {
      staff_id: formData.staff_id.trim(),
      name: formData.name.trim(),
      role: formData.role,
      phone: formData.phone.trim(),
      extra_details: {
        ...(selectedStaff.extra_details || {}),
        ...(formData.date_of_birth && {
          date_of_birth: formData.date_of_birth,
        }),
        ...(formData.gender && { gender: formData.gender }),
        ...(formData.salary_grade.trim() && {
          salary_grade: formData.salary_grade.trim(),
        }),
        ...(formData.emergency_contact.trim() && {
          emergency_contact: formData.emergency_contact.trim(),
        }),
        ...(formData.qualification.trim() && {
          qualification: formData.qualification.trim(),
        }),
      },
    };
    if (formData.email.trim()) payload.email = formData.email.trim();
    if (formData.address.trim()) payload.address = formData.address.trim();
    if (formData.joining_date) payload.joining_date = formData.joining_date;
    if (formData.bank_account_number.trim())
      payload.bank_account_number = formData.bank_account_number.trim();
    if (formData.ifsc_code.trim())
      payload.ifsc_code = formData.ifsc_code.trim();
    if (formData.account_holder_name.trim())
      payload.account_holder_name = formData.account_holder_name.trim();
    if (formData.bank_name.trim())
      payload.bank_name = formData.bank_name.trim();
    if (formData.upi_id.trim()) payload.upi_id = formData.upi_id.trim();

    try {
      await adminApi.staff.update(selectedStaff.staff_id, {
        ...payload,
        ...schoolScope.scopeParams,
      });
      toastSuccess("Staff member updated successfully");
      setMode("list");
      resetForm();
      fetchStaff(currentPage);
      fetchStaffStats();
    } catch (error: any) {
      console.error("Error updating staff:", error);
      const apiErrors = parseApiErrors(error);
      const requiredApiErrors = Object.fromEntries(
        Object.entries(apiErrors).filter(([key]) =>
          requiredStaffFields.includes(key),
        ),
      );
      if (Object.keys(requiredApiErrors).length > 0)
        setFormErrors(requiredApiErrors);
      const firstError =
        Object.values(requiredApiErrors)[0] ||
        Object.values(apiErrors)[0] ||
        error?.response?.data?.detail ||
        error?.response?.data?.error ||
        "Failed to update staff member.";
      toastError(firstError);
    } finally {
      setLoading(false);
    }
  };

  // Delete staff
  const deleteStaff = async (id: number) => {
    const staffToDelete = staff.find((s) => s.id === id);
    if (!staffToDelete) return;

    try {
      await adminApi.staff.delete(staffToDelete.staff_id, schoolScope.scopeParams);
      toastSuccess("Staff member deleted successfully");
      fetchStaff(currentPage);
      fetchStaffStats();
      setShowDeleteConfirm(null);
      setSelectedStaff(null);
    } catch (error: any) {
      console.error("Error deleting staff:", error);
    }
  };

  const resetForm = () => {
    setFormData({
      staff_id: "",
      name: "",
      role: "external_staff",
      phone: "",
      email: "",
      address: "",
      joining_date: "",
      date_of_birth: "",
      gender: "",
      salary_grade: "",
      emergency_contact: "",
      qualification: "",
      account_holder_name: "",
      bank_name: "",
      bank_account_number: "",
      ifsc_code: "",
      upi_id: "",
    });
    setSelectedStaff(null);
    setFormErrors({});
  };

  const startEdit = (staffMember: Staff) => {
    setFormData({
      staff_id: staffMember.staff_id,
      name: staffMember.name,
      role: staffMember.role,
      phone: staffMember.phone,
      email: staffMember.email || "",
      address: staffMember.address || "",
      joining_date: staffMember.joining_date || "",
      date_of_birth: staffMember.extra_details?.date_of_birth || "",
      gender: staffMember.extra_details?.gender || "",
      salary_grade: staffMember.extra_details?.salary_grade || "",
      emergency_contact: staffMember.extra_details?.emergency_contact || "",
      qualification: staffMember.extra_details?.qualification || "",
      account_holder_name: staffMember.account_holder_name || "",
      bank_name: staffMember.bank_name || "",
      bank_account_number: staffMember.bank_account_number || "",
      ifsc_code: staffMember.ifsc_code || "",
      upi_id: staffMember.upi_id || "",
    });
    setSelectedStaff(staffMember);
    setFormErrors({});
    setMode("edit");
  };

  useEffect(() => {
    fetchStaff(currentPage);
  }, [currentPage, searchTerm, filterRole, schoolScope.selectedSchoolId]);

  useEffect(() => {
    setCurrentPage(1);
    setSelectedStaffIds([]);
  }, [schoolScope.selectedSchoolId]);

  useEffect(() => {
    const updateViewport = () => {
      setIsMobile(window.innerWidth < 640);
    };
    updateViewport();
    window.addEventListener("resize", updateViewport);
    return () => window.removeEventListener("resize", updateViewport);
  }, []);

  useEffect(() => {
    fetchStaffStats();
  }, [searchTerm, filterRole, schoolScope.selectedSchoolId]);

  // Filter and sort
  const filteredStaff = staff;

  const sortedStaff = [...filteredStaff].sort((a: any, b: any) => {
    let aValue: any = a[sortField];
    let bValue: any = b[sortField];

    if (typeof aValue === "string" && typeof bValue === "string") {
      aValue = aValue.toLowerCase();
      bValue = bValue.toLowerCase();
    }

    if (!aValue) return sortDirection === "asc" ? 1 : -1;
    if (!bValue) return sortDirection === "asc" ? -1 : 1;

    if (aValue < bValue) return sortDirection === "asc" ? -1 : 1;
    if (aValue > bValue) return sortDirection === "asc" ? 1 : -1;
    return 0;
  });

  // Pagination
  const totalPages = Math.max(1, Math.ceil(totalStaffCount / pageSize));
  const indexOfLastItem = Math.min(currentPage * pageSize, totalStaffCount);
  const indexOfFirstItem =
    totalStaffCount === 0 ? 0 : (currentPage - 1) * pageSize + 1;
  const currentStaff = sortedStaff;

  // Stats
  const totalStaff = totalStaffCount;

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === "asc" ? "desc" : "asc");
    } else {
      setSortField(field);
      setSortDirection("asc");
    }
  };

  const exportToCSV = async () => {
    try {
      const allStaff: Staff[] = [];
      let page = 1;
      let hasMore = true;
      const exportPageSize = 200;

      while (hasMore) {
        const params: {
          page: number;
          page_size: number;
          search?: string;
          role?: string;
          school_id?: number;
        } = {
          page,
          page_size: exportPageSize,
          ...schoolScope.scopeParams,
        };

        if (searchTerm.trim()) params.search = searchTerm.trim();
        if (filterRole !== "all") params.role = filterRole;

        const res = await adminApi.staff.listPaginated(params);
        const data = (res.data || {}) as PaginatedStaffResponse;
        const pageResults = Array.isArray(data.results) ? data.results : [];
        allStaff.push(...pageResults);

        hasMore = !!data.next;
        page += 1;
      }

      if (allStaff.length === 0) {
        toastInfo("No staff records to export");
        return;
      }

      const sortedForExport = [...allStaff].sort((a: any, b: any) => {
        let aValue: any = a[sortField];
        let bValue: any = b[sortField];

        if (typeof aValue === "string" && typeof bValue === "string") {
          aValue = aValue.toLowerCase();
          bValue = bValue.toLowerCase();
        }

        if (!aValue) return sortDirection === "asc" ? 1 : -1;
        if (!bValue) return sortDirection === "asc" ? -1 : 1;

        if (aValue < bValue) return sortDirection === "asc" ? -1 : 1;
        if (aValue > bValue) return sortDirection === "asc" ? 1 : -1;
        return 0;
      });

      const csvData = sortedForExport.map((member) => [
        member.staff_id || "",
        member.name || "",
        formatRoleDisplay(member.role || ""),
        member.phone || "",
        member.email || "",
        member.address || "",
        member.joining_date || "",
        member.extra_details?.gender || "",
        member.extra_details?.qualification || "",
        member.extra_details?.salary_grade || "",
        member.extra_details?.emergency_contact || "",
        member.extra_details?.date_of_birth || "",
      ]);

      const headers = [
        "Staff ID",
        "Name",
        "Role",
        "Phone",
        "Email",
        "Address",
        "Joining Date",
        "Gender",
        "Qualification",
        "Salary Grade",
        "Emergency Contact",
        "Date of Birth",
      ];

      const csvContent = [
        headers.join(","),
        ...csvData.map((row) =>
          row
            .map((field) => `"${String(field).replace(/"/g, '""')}"`)
            .join(","),
        ),
      ].join("\n");

      const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `staff_${new Date().toISOString().split("T")[0]}.csv`;
      link.click();
      URL.revokeObjectURL(url);
      toastSuccess(`CSV exported successfully! (${allStaff.length} staff)`);
    } catch (error) {
      console.error("Error exporting staff CSV:", error);
      toastError("Failed to export CSV");
    }
  };

  const handleBulkUpload = async () => {
    if (!csvFile) {
      toastWarning("Please select a CSV file first");
      return;
    }

    setUploadProgress(0);
    try {
      await adminApi.csv.uploadStudents(csvFile, schoolScope.scopeParams);
      toastSuccess("Bulk upload completed successfully!");
      fetchStaff(currentPage);
      fetchStaffStats();
      setBulkUploadMode(false);
      setCsvFile(null);
    } catch (error) {
      console.error("Upload error:", error);
      toastError("Upload failed. Please try again.");
    } finally {
      setUploadProgress(100);
    }
  };

  const handleBulkImageUpload = async () => {
    if (!imagesZipFile) {
      toastWarning("Please select a ZIP file first");
      return;
    }

    try {
      const response = await adminApi.csv.uploadProfileImagesZip(
        "staff",
        imagesZipFile,
        schoolScope.scopeParams,
      );
      const data = response?.data || {};
      const successCount = Number(data?.success_count || 0);
      const failedCount = Number(data?.failed_count || 0);
      const errors: string[] = Array.isArray(data?.errors) ? data.errors : [];

      if (failedCount === 0) {
        toastSuccess(
          `Profile image upload completed. Updated ${successCount} staff members.`,
        );
      } else {
        toastWarning(
          `Profile images processed: ${successCount} updated, ${failedCount} failed.`,
        );
        if (errors.length > 0) {
          console.warn("Bulk image upload errors:", errors);
        }
      }

      setImagesZipFile(null);
      fetchStaff(currentPage);
      fetchStaffStats();
    } catch (error: any) {
      console.error("Image ZIP upload error:", error);
      const apiError =
        error?.response?.data?.error ||
        error?.response?.data?.message ||
        "Image ZIP upload failed. Please try again.";
      toastError(apiError);
    }
  };

  const downloadSampleCSV = () => {
    const headers = ["staff_id", "staff_name", "staff_phone", "staff_role"];
    const sampleRow = ["STF001", "Staff Name", "9876543210", "hostel_warden"];
    const csvContent = [
      headers.join(","),
      sampleRow
        .map((field) => `"${String(field).replace(/"/g, '""')}"`)
        .join(","),
    ].join("\n");

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "staff_sample_template.csv";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
  };

  // Format role for display
  const formatRoleDisplay = (role: string) => {
    const roleOption = roleOptions.find((r) => r.value === role);
    return roleOption?.label || role.replace("_", " ").toUpperCase();
  };

  // Get role icon
  const getRoleIcon = (role: string) => {
    const roleOption = roleOptions.find((r) => r.value === role);
    return roleOption?.icon || FaBriefcase;
  };

  return (
    <div
      className={`dashboard-typography p-3 md:p-4 xl:p-6 ${getBgClass()} transition-colors duration-200`}
    >
      <div className="mx-auto w-full max-w-[1920px]">
        {/* Header */}
        <div className="mb-6 sm:mb-8">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between mb-4 sm:mb-6 gap-4">
            <div className="flex items-center justify-between w-full lg:w-auto">
              <div className="flex items-center space-x-4">
                <div
                  className={combine(
                    "p-3 rounded-2xl shadow-lg",
                    theme === "dark"
                      ? "bg-gradient-to-br from-indigo-600 to-indigo-700"
                      : "bg-gradient-to-br from-indigo-500 to-indigo-600",
                  )}
                >
                  <FaUserTie className="text-2xl text-white" />
                </div>
                <div>
                  <h1
                    className={combine(
                      "text-xl sm:text-2xl md:text-3xl font-bold",
                      get("text", "primary"),
                    )}
                  >
                    Staff Directory
                  </h1>
                  <p
                    className={combine(
                      "text-xs sm:text-sm mt-0.5 sm:mt-1",
                      get("text", "secondary"),
                    )}
                  >
                    Manage all non-teaching staff members
                  </p>
                </div>
              </div>
            </div>

            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-3 w-full lg:w-auto">
              <SchoolScopeSelector {...schoolScope} className="w-full sm:w-auto" />
              {mode === "list" ? (
                <>
                  <button
                    onClick={exportToCSV}
                    className={combine(
                      getSecondaryButtonClass(),
                      "flex items-center space-x-2 shrink-0",
                    )}
                  >
                    <FaDownload className="text-xs" />
                    <span>Export CSV</span>
                  </button>
                  <button
                    onClick={() => setBulkUploadMode(!bulkUploadMode)}
                    className={combine(
                      getSecondaryButtonClass(),
                      "flex items-center space-x-2 shrink-0",
                    )}
                  >
                    <FaFileAlt className="text-xs" />
                    <span>Bulk Upload</span>
                  </button>
                  <button
                    onClick={() => {
                      setFormErrors({});
                      setMode("add");
                    }}
                    className={combine(
                      getPrimaryButtonClass(),
                      "flex items-center space-x-2 shrink-0",
                    )}
                  >
                    <FaUserPlus className="text-xs" />
                    <span>Add Staff</span>
                  </button>
                </>
              ) : (
                <button
                  onClick={() => {
                    setMode("list");
                    resetForm();
                    setFormErrors({});
                  }}
                  className={combine(
                    getSecondaryButtonClass(),
                    "flex items-center space-x-2 shrink-0",
                  )}
                >
                  <FaArrowLeft className="text-xs" />
                  <span>Back</span>
                </button>
              )}
            </div>
          </div>

          {/* Stats Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-3 sm:gap-4 md:gap-6">
            <div className={getCardGradientClass("indigo")}>
              <div className="flex items-center justify-between">
                <div>
                  <p
                    className={combine(
                      "text-xs font-medium",
                      get("text", "secondary"),
                    )}
                  >
                    Total Staff
                  </p>
                  <p
                    className={combine(
                      "text-lg sm:text-2xl font-bold mt-1 sm:mt-2",
                      get("text", "primary"),
                    )}
                  >
                    {totalStaff}
                  </p>
                </div>
                <div
                  className={combine(
                    "p-1.5 sm:p-2 rounded-lg sm:rounded-xl",
                    theme === "dark" ? "bg-indigo-900/30" : "bg-indigo-100",
                  )}
                >
                  <FaUserTie
                    className={combine(
                      "text-base sm:text-lg",
                      theme === "dark" ? "text-indigo-400" : "text-indigo-600",
                    )}
                  />
                </div>
              </div>
            </div>

            {roleOptions.map((role) => (
              <div
                key={role.value}
                className={getCardGradientClass(role.color as any)}
              >
                <div className="flex items-center justify-between">
                  <div>
                    <p
                      className={combine(
                        "text-xs font-medium",
                        get("text", "secondary"),
                      )}
                    >
                      {role.label.split(" ")[0]}
                    </p>
                    <p
                      className={combine(
                        "text-lg sm:text-2xl font-bold mt-1 sm:mt-2",
                        get("text", "primary"),
                      )}
                    >
                      {roleStats[role.value] || 0}
                    </p>
                  </div>
                  <div
                    className={combine(
                      "p-1.5 sm:p-2 rounded-lg sm:rounded-xl",
                      theme === "dark"
                        ? `bg-${role.color}-900/30`
                        : `bg-${role.color}-100`,
                    )}
                  >
                    {role.icon && (
                      <role.icon
                        className={combine(
                          "text-base sm:text-lg",
                          theme === "dark"
                            ? `text-${role.color}-400`
                            : `text-${role.color}-600`,
                        )}
                      />
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* List View */}
        {mode === "list" && (
          <>
            {bulkUploadMode && (
              <div className="animate-fade-in mb-4 sm:mb-6">
                <div className={getCardGradientClass("emerald")}>
                  <div className="flex items-center justify-between mb-3 sm:mb-4">
                    <div className="flex items-center gap-2 sm:gap-3">
                      <div
                        className={combine(
                          "p-1.5 sm:p-2 rounded-lg sm:rounded-xl",
                          theme === "dark"
                            ? "bg-emerald-900/30"
                            : "bg-emerald-100",
                        )}
                      >
                        <FaFileAlt
                          className={combine(
                            "text-base sm:text-lg",
                            theme === "dark"
                              ? "text-emerald-400"
                              : "text-emerald-600",
                          )}
                        />
                      </div>
                      <div>
                        <h3
                          className={combine(
                            "text-base sm:text-lg font-bold",
                            get("text", "primary"),
                          )}
                        >
                          Bulk Upload Staff
                        </h3>
                        <p
                          className={combine(
                            "text-xs sm:text-sm mt-0.5 sm:mt-1",
                            get("text", "secondary"),
                          )}
                        >
                          Upload a CSV file to add multiple staff at once
                        </p>
                      </div>
                    </div>
                    <button
                      onClick={() => setBulkUploadMode(false)}
                      className={combine(
                        "p-1.5 rounded-lg sm:rounded-xl transition-all",
                        "hover:bg-[var(--color-bg-hover)]",
                      )}
                    >
                      <FaTimes
                        className={
                          get("icon", "secondary") + " text-xs sm:text-sm"
                        }
                      />
                    </button>
                  </div>

                  <div className="mb-3 sm:mb-4">
                    <label
                      className={combine(
                        "block text-xs sm:text-sm font-medium mb-1.5 sm:mb-2",
                        get("text", "primary"),
                      )}
                    >
                      Select CSV File
                    </label>
                    <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 sm:gap-3">
                      <input
                        type="file"
                        accept=".csv"
                        onChange={(e) =>
                          setCsvFile(e.target.files?.[0] || null)
                        }
                        className={getInputClass()}
                      />
                      <button
                        type="button"
                        onClick={downloadSampleCSV}
                        className={combine(
                          getSecondaryButtonClass(),
                          "px-3 sm:px-4 py-2 sm:py-2.5 flex items-center justify-center space-x-1 sm:space-x-2",
                        )}
                      >
                        <FaDownload className="text-xs sm:text-sm" />
                        <span className="text-xs sm:text-sm">
                          Download Sample CSV
                        </span>
                      </button>
                      <button
                        onClick={handleBulkUpload}
                        disabled={!csvFile}
                        className={combine(
                          "px-3 sm:px-4 py-2 sm:py-2.5 rounded-lg sm:rounded-xl transition-all duration-200 flex items-center justify-center space-x-1 sm:space-x-2 text-xs sm:text-sm",
                          theme === "dark"
                            ? "bg-gradient-to-r from-emerald-600 to-emerald-700 hover:from-emerald-700 hover:to-emerald-800 text-white"
                            : "bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-600 hover:to-emerald-700 text-white",
                          "disabled:opacity-50 disabled:cursor-not-allowed hover:scale-[1.02] active:scale-[0.98]",
                        )}
                      >
                        <FaDownload className="text-xs sm:text-sm" />
                        <span className="text-xs sm:text-sm">Upload</span>
                      </button>
                    </div>
                    {csvFile && (
                      <p
                        className={combine(
                          "mt-1.5 sm:mt-2 text-xs",
                          theme === "dark"
                            ? "text-emerald-400"
                            : "text-emerald-600",
                        )}
                      >
                        Selected:{" "}
                        <span className="truncate">{csvFile.name}</span>
                      </p>
                    )}
                  </div>

                  <div
                    className={combine(
                      "mb-3 sm:mb-4 pt-3 border-t",
                      get("border", "primary"),
                    )}
                  >
                    <label
                      className={combine(
                        "block text-xs sm:text-sm font-medium mb-1.5 sm:mb-2",
                        get("text", "primary"),
                      )}
                    >
                      Upload Staff Profile Images (.zip)
                    </label>
                    <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 sm:gap-3">
                      <input
                        type="file"
                        accept=".zip"
                        onChange={(e) =>
                          setImagesZipFile(e.target.files?.[0] || null)
                        }
                        className={getInputClass()}
                      />
                      <button
                        onClick={handleBulkImageUpload}
                        disabled={!imagesZipFile}
                        className={combine(
                          "px-3 sm:px-4 py-2 sm:py-2.5 rounded-lg sm:rounded-xl transition-all duration-200 flex items-center justify-center space-x-1 sm:space-x-2 text-xs sm:text-sm",
                          theme === "dark"
                            ? "bg-gradient-to-r from-indigo-600 to-indigo-700 hover:from-indigo-700 hover:to-indigo-800 text-white"
                            : "bg-gradient-to-r from-indigo-500 to-indigo-600 hover:from-indigo-600 hover:to-indigo-700 text-white",
                          "disabled:opacity-50 disabled:cursor-not-allowed hover:scale-[1.02] active:scale-[0.98]",
                        )}
                      >
                        <FaDownload className="text-xs sm:text-sm" />
                        <span className="text-xs sm:text-sm">
                          Upload Images ZIP
                        </span>
                      </button>
                    </div>
                    {imagesZipFile && (
                      <p
                        className={combine(
                          "mt-1.5 sm:mt-2 text-xs",
                          theme === "dark"
                            ? "text-indigo-400"
                            : "text-indigo-600",
                        )}
                      >
                        Selected ZIP:{" "}
                        <span className="truncate">{imagesZipFile.name}</span>
                      </p>
                    )}
                    <p
                      className={combine(
                        "mt-1 text-xs",
                        get("text", "tertiary"),
                      )}
                    >
                      ZIP should contain image files named as staff IDs (e.g.,
                      STF001.jpg, STF002.png).
                    </p>
                  </div>

                  {uploadProgress > 0 && uploadProgress < 100 && (
                    <div className="mb-3 sm:mb-4">
                      <div
                        className={combine(
                          "flex justify-between text-xs mb-0.5 sm:mb-1",
                          get("text", "secondary"),
                        )}
                      >
                        <span>Uploading...</span>
                        <span>{uploadProgress}%</span>
                      </div>
                      <div
                        className={combine(
                          "w-full rounded-full h-1 sm:h-1.5",
                          get("bg", "secondary"),
                        )}
                      >
                        <div
                          className={combine(
                            "h-1 sm:h-1.5 rounded-full transition-all duration-300",
                            theme === "dark"
                              ? "bg-gradient-to-r from-emerald-500 to-emerald-600"
                              : "bg-gradient-to-r from-emerald-400 to-emerald-600",
                          )}
                          style={{ width: `${uploadProgress}%` }}
                        ></div>
                      </div>
                    </div>
                  )}

                  <div className={combine("text-xs", get("text", "secondary"))}>
                    <p
                      className={combine(
                        "font-medium mb-1 sm:mb-2",
                        get("text", "primary"),
                      )}
                    >
                      CSV Format:
                    </p>
                    <div
                      className={combine(
                        "p-2 sm:p-3 rounded-lg sm:rounded-xl font-mono text-xs overflow-x-auto",
                        get("bg", "secondary"),
                        get("text", "primary"),
                      )}
                    >
                      staff_id,staff_name,staff_phone,staff_role
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Search & Filters */}
            <div className={getCardGradientClass("indigo")}>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
                <div>
                  <div className="relative">
                    <FaSearch
                      className={combine(
                        "absolute left-3 top-1/2 transform -translate-y-1/2 text-xs sm:text-sm",
                        get("icon", "secondary"),
                      )}
                    />
                    <input
                      type="text"
                      placeholder="Search staff..."
                      value={searchTerm}
                      onChange={(e) => {
                        setSearchTerm(e.target.value);
                        setCurrentPage(1);
                      }}
                      className={getInputClass()}
                      style={{ paddingLeft: "2.5rem" }}
                    />
                  </div>
                </div>
                <div>
                  <select
                    value={filterRole}
                    onChange={(e) => {
                      setFilterRole(e.target.value);
                      setCurrentPage(1);
                    }}
                    className={getInputClass()}
                  >
                    <option value="all">All Roles</option>
                    {roleOptions.map((role) => (
                      <option key={role.value} value={role.value}>
                        {role.label}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <button
                    onClick={() => {
                      setSearchTerm("");
                      setFilterRole("all");
                      setCurrentPage(1);
                    }}
                    className={combine(
                      getSecondaryButtonClass(),
                      "w-full flex items-center justify-center space-x-2",
                    )}
                  >
                    <FaTimes className="text-xs sm:text-sm" />
                    <span className="text-xs sm:text-sm">Clear Filters</span>
                  </button>
                </div>
              </div>
            </div>

            {/* Staff Table */}
            <div className={getCardGradientClass()}>
              {/* Table Header - Fixed */}
              <div
                className={combine(
                  "p-3 sm:p-4 border-b",
                  get("border", "primary"),
                )}
              >
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 sm:gap-0">
                  <div>
                    <h3
                      className={combine(
                        "text-base sm:text-lg font-bold",
                        get("text", "primary"),
                      )}
                    >
                      Staff Records
                    </h3>
                    <p
                      className={combine(
                        "text-xs sm:text-sm mt-0.5 sm:mt-1",
                        get("text", "secondary"),
                      )}
                    >
                      View and manage staff information
                    </p>
                  </div>
                  <div className={combine("text-xs", get("text", "tertiary"))}>
                    Showing {indexOfFirstItem} to {indexOfLastItem} of{" "}
                    {totalStaff}
                  </div>
                </div>
              </div>

              {/* Table Container with Fixed Height and Scroll */}
              <div className="relative">
                {isMobile ? (
                  <div className="p-2 sm:p-3">
                    {loading ? (
                      <div className="p-6 sm:p-8 min-h-[280px] flex items-center justify-center text-center">
                        <div className="text-center">
                          <div className="relative mx-auto w-16 h-16">
                            <div className="animate-spin rounded-full h-16 w-16 border-4 border-indigo-200 border-t-indigo-600"></div>
                            <div className="absolute inset-0 flex items-center justify-center">
                              <FaSchool className="h-8 w-8 text-indigo-600 animate-pulse" />
                            </div>
                          </div>
                          <p
                            className={combine(
                              "mt-4 sm:mt-6 text-xs sm:text-sm font-medium",
                              get("text", "secondary"),
                            )}
                          >
                            Loading staff...
                          </p>
                          <p
                            className={combine(
                              "text-xs sm:text-sm mt-1 sm:mt-2",
                              get("text", "tertiary"),
                            )}
                          >
                            Preparing staff records
                          </p>
                        </div>
                      </div>
                    ) : currentStaff.length === 0 ? (
                      <div className="p-6 sm:p-8 text-center">
                        <div
                          className={combine(
                            "inline-block p-2 sm:p-3 rounded-full mb-2 sm:mb-3",
                            theme === "dark"
                              ? "bg-indigo-900/30"
                              : "bg-indigo-100",
                          )}
                        >
                          <FaUserTie
                            className={combine(
                              "text-lg sm:text-xl",
                              theme === "dark"
                                ? "text-indigo-400"
                                : "text-indigo-500",
                            )}
                          />
                        </div>
                        <h3
                          className={combine(
                            "text-sm sm:text-base font-medium mb-0.5 sm:mb-1",
                            get("text", "primary"),
                          )}
                        >
                          No staff found
                        </h3>
                        <p
                          className={combine(
                            "text-xs sm:text-sm mb-3 sm:mb-4",
                            get("text", "secondary"),
                          )}
                        >
                          {searchTerm || filterRole !== "all"
                            ? "Try adjusting your search or filters"
                            : "Add your first staff member to get started"}
                        </p>
                        {!searchTerm && filterRole === "all" && (
                          <button
                            onClick={() => setMode("add")}
                            className={combine(getPrimaryButtonClass(), "mt-2")}
                          >
                            Add First Staff
                          </button>
                        )}
                      </div>
                    ) : (
                      <div className="space-y-3">
                        {currentStaff.map((member) => {
                          const RoleIcon = getRoleIcon(member.role);
                          return (
                            <div
                              key={member.id}
                              className={combine(
                                "rounded-xl p-3 border",
                                get("bg", "card"),
                                get("border", "primary"),
                                "shadow-sm hover:shadow-md transition-all duration-200",
                              )}
                            >
                              <div className="flex items-start justify-between gap-3">
                                <div className="min-w-0">
                                  <p
                                    className={combine(
                                      "font-semibold text-sm",
                                      get("text", "primary"),
                                    )}
                                  >
                                    {member.name}
                                  </p>
                                  <p
                                    className={combine(
                                      "text-xs mt-0.5",
                                      get("text", "tertiary"),
                                    )}
                                  >
                                    ID: {member.staff_id}
                                  </p>
                                </div>
                                <span
                                  className={getStatusBadgeClass(member.role)}
                                >
                                  <RoleIcon className="text-xs" />
                                  {formatRoleDisplay(member.role)}
                                </span>
                              </div>

                              <div className="mt-2 grid grid-cols-2 gap-2 text-xs">
                                <div className="col-span-2">
                                  <p
                                    className={combine(
                                      "font-medium",
                                      get("text", "tertiary"),
                                    )}
                                  >
                                    Contact
                                  </p>
                                  <p
                                    className={combine(
                                      "mt-0.5 truncate",
                                      get("text", "secondary"),
                                    )}
                                  >
                                    {member.email || "N/A"}
                                  </p>
                                  <p
                                    className={combine(
                                      "mt-0.5",
                                      get("text", "secondary"),
                                    )}
                                  >
                                    {member.phone}
                                  </p>
                                </div>
                                <div>
                                  <p
                                    className={combine(
                                      "font-medium",
                                      get("text", "tertiary"),
                                    )}
                                  >
                                    Joined
                                  </p>
                                  <p
                                    className={combine(
                                      "mt-0.5",
                                      get("text", "secondary"),
                                    )}
                                  >
                                    {member.joining_date
                                      ? new Date(
                                          member.joining_date,
                                        ).toLocaleDateString()
                                      : "N/A"}
                                  </p>
                                </div>
                                <div>
                                  <p
                                    className={combine(
                                      "font-medium",
                                      get("text", "tertiary"),
                                    )}
                                  >
                                    Gender
                                  </p>
                                  <p
                                    className={combine(
                                      "mt-0.5",
                                      get("text", "secondary"),
                                    )}
                                  >
                                    {member.extra_details?.gender || "N/A"}
                                  </p>
                                </div>
                              </div>

                              <div className="mt-3 flex flex-wrap items-center gap-1.5">
                                <button
                                  onClick={() =>
                                    router.push(
                                      `/admin/staff/overview/${member.staff_id}`,
                                    )
                                  }
                                  className={combine(
                                    "p-1.5 rounded-lg transition-all duration-200 hover:text-[var(--color-accent-primary)]",
                                    get("icon", "primary") + " text-xs",
                                  )}
                                  title="View Profile"
                                >
                                  <FaEye className="text-xs" />
                                </button>
                                <button
                                  onClick={() =>
                                    router.push(
                                      `/admin/staff/attendance?staffId=${member.staff_id}&tab=history&redirectedFrom=staff-directory`,
                                    )
                                  }
                                  className={combine(
                                    "p-1.5 rounded-lg transition-all duration-200 hover:text-[var(--color-accent-info)]",
                                    get("icon", "primary") + " text-xs",
                                  )}
                                  title="View Attendance History"
                                >
                                  <FaHistory className="text-xs" />
                                </button>
                                <button
                                  onClick={() => {
                                    const staffType = normalizeStaffType(
                                      member.role,
                                    );
                                    router.push(
                                      `/admin/staff/resources?search=${encodeURIComponent(member.name)}&staffType=${encodeURIComponent(staffType)}&redirectedFrom=staff-directory`,
                                    );
                                  }}
                                  className={combine(
                                    "p-1.5 rounded-lg transition-all duration-200 hover:text-[var(--color-accent-warning)]",
                                    get("icon", "primary") + " text-xs",
                                  )}
                                  title="View Inventory Usage"
                                >
                                  <FaBox className="text-xs" />
                                </button>
                                <button
                                  onClick={() =>
                                    router.push(
                                      `/admin/staff/work?search=${encodeURIComponent(member.name)}&filterStaffType=${member.role}&redirectedFrom=staff-directory`,
                                    )
                                  }
                                  className={combine(
                                    "p-1.5 rounded-lg transition-all duration-200 hover:text-[var(--color-accent-warning)]",
                                    get("icon", "primary") + " text-xs",
                                  )}
                                  title="View Work Assignments"
                                >
                                  <FaTasks className="text-xs" />
                                </button>
                                <button
                                  onClick={() => {
                                    const params = new URLSearchParams();
                                    params.set("tab", "employeeReport");
                                    params.set("employee_type", "staff");
                                    params.set("employee_id", member.staff_id);
                                    params.set(
                                      "redirectedFrom",
                                      "staff-directory",
                                    );
                                    router.push(
                                      `/admin/salary?${params.toString()}`,
                                    );
                                  }}
                                  className={combine(
                                    "p-1.5 rounded-lg transition-all duration-200 hover:text-[var(--color-accent-success)]",
                                    get("icon", "primary") + " text-xs",
                                  )}
                                  title="View Salary Report"
                                >
                                  <FaMoneyBillWave className="text-xs" />
                                </button>
                                <button
                                  onClick={() => startEdit(member)}
                                  className={combine(
                                    "p-1.5 rounded-lg transition-all duration-200 hover:text-[var(--color-accent-success)]",
                                    get("icon", "primary") + " text-xs",
                                  )}
                                  title="Edit"
                                >
                                  <FaEdit className="text-xs" />
                                </button>
                                <button
                                  onClick={() =>
                                    setShowDeleteConfirm(member.id)
                                  }
                                  className={combine(
                                    "p-1.5 rounded-lg transition-all duration-200 hover:text-[var(--color-accent-error)]",
                                    get("icon", "primary") + " text-xs",
                                  )}
                                  title="Delete"
                                >
                                  <FaTrash className="text-xs" />
                                </button>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="overflow-x-auto overflow-y-auto border-t border-b">
                    <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700 relative text-xs sm:text-sm">
                      <thead
                        className={combine(
                          "bg-[var(--color-bg-secondary)] sticky top-0 z-10",
                          get("border", "primary"),
                          theme === "dark" ? "shadow-md" : "shadow-sm",
                        )}
                      >
                        <tr>
                          <th
                            className={combine(
                              "px-3 sm:px-4 py-2 sm:py-3 text-left text-xs sm:text-sm font-medium uppercase tracking-wider cursor-pointer bg-[var(--color-bg-secondary)]",
                              get("text", "tertiary"),
                              "hover:bg-[var(--color-bg-hover)]",
                            )}
                            onClick={() => handleSort("staff_id")}
                          >
                            <div className="flex items-center space-x-2">
                              <FaIdCard className="text-xs" />
                              <span className="text-xs sm:text-sm">
                                Staff ID
                              </span>
                              {sortField === "staff_id" &&
                                (sortDirection === "asc" ? (
                                  <FaSortUp
                                    className={
                                      get("accent", "primary") + " text-xs"
                                    }
                                  />
                                ) : (
                                  <FaSortDown
                                    className={
                                      get("accent", "primary") + " text-xs"
                                    }
                                  />
                                ))}
                            </div>
                          </th>
                          <th
                            className={combine(
                              "px-3 sm:px-4 py-2 sm:py-3 text-left text-xs sm:text-sm font-medium uppercase tracking-wider cursor-pointer bg-[var(--color-bg-secondary)]",
                              get("text", "tertiary"),
                              "hover:bg-[var(--color-bg-hover)]",
                            )}
                            onClick={() => handleSort("name")}
                          >
                            <div className="flex items-center space-x-2">
                              <FaUserTie className="text-xs" />
                              <span className="text-xs sm:text-sm">Name</span>
                              {sortField === "name" &&
                                (sortDirection === "asc" ? (
                                  <FaSortUp
                                    className={
                                      get("accent", "primary") + " text-xs"
                                    }
                                  />
                                ) : (
                                  <FaSortDown
                                    className={
                                      get("accent", "primary") + " text-xs"
                                    }
                                  />
                                ))}
                            </div>
                          </th>
                          <th
                            className={combine(
                              "px-3 sm:px-4 py-2 sm:py-3 text-left text-xs sm:text-sm font-medium uppercase tracking-wider cursor-pointer bg-[var(--color-bg-secondary)]",
                              get("text", "tertiary"),
                              "hover:bg-[var(--color-bg-hover)]",
                            )}
                            onClick={() => handleSort("role")}
                          >
                            <div className="flex items-center space-x-2">
                              <FaBriefcase className="text-xs" />
                              <span className="text-xs sm:text-sm">Role</span>
                              {sortField === "role" &&
                                (sortDirection === "asc" ? (
                                  <FaSortUp
                                    className={
                                      get("accent", "primary") + " text-xs"
                                    }
                                  />
                                ) : (
                                  <FaSortDown
                                    className={
                                      get("accent", "primary") + " text-xs"
                                    }
                                  />
                                ))}
                            </div>
                          </th>
                          <th
                            className={combine(
                              "px-3 sm:px-4 py-2 sm:py-3 text-left text-xs sm:text-sm font-medium uppercase tracking-wider bg-[var(--color-bg-secondary)]",
                              get("text", "tertiary"),
                            )}
                          >
                            <div className="flex items-center space-x-2">
                              <FaPhone className="text-xs" />
                              <span className="text-xs sm:text-sm">
                                Contact
                              </span>
                            </div>
                          </th>
                          <th
                            className={combine(
                              "px-3 sm:px-4 py-2 sm:py-3 text-left text-xs sm:text-sm font-medium uppercase tracking-wider cursor-pointer bg-[var(--color-bg-secondary)]",
                              get("text", "tertiary"),
                              "hover:bg-[var(--color-bg-hover)]",
                            )}
                            onClick={() => handleSort("joining_date")}
                          >
                            <div className="flex items-center space-x-2">
                              <FaCalendarAlt className="text-xs" />
                              <span className="text-xs sm:text-sm">Joined</span>
                              {sortField === "joining_date" &&
                                (sortDirection === "asc" ? (
                                  <FaSortUp
                                    className={
                                      get("accent", "primary") + " text-xs"
                                    }
                                  />
                                ) : (
                                  <FaSortDown
                                    className={
                                      get("accent", "primary") + " text-xs"
                                    }
                                  />
                                ))}
                            </div>
                          </th>
                          <th
                            className={combine(
                              "px-3 sm:px-4 py-2 sm:py-3 text-left text-xs sm:text-sm font-medium uppercase tracking-wider bg-[var(--color-bg-secondary)]",
                              get("text", "tertiary"),
                            )}
                          >
                            <div className="flex items-center space-x-2">
                              <FaCog className="text-xs" />
                              <span className="text-xs sm:text-sm">
                                Actions
                              </span>
                            </div>
                          </th>
                        </tr>
                      </thead>
                      <tbody
                        className={combine(
                          "divide-y",
                          get("border", "primary"),
                        )}
                      >
                        {loading ? (
                          <tr>
                            <td
                              colSpan={6}
                              className="px-3 sm:px-4 py-8 text-center"
                            >
                              <div className="text-center">
                                <div className="relative mx-auto w-16 h-16">
                                  <div className="animate-spin rounded-full h-16 w-16 border-4 border-indigo-200 border-t-indigo-600"></div>
                                  <div className="absolute inset-0 flex items-center justify-center">
                                    <FaSchool className="h-8 w-8 text-indigo-600 animate-pulse" />
                                  </div>
                                </div>
                                <p
                                  className={combine(
                                    "mt-4 sm:mt-6 text-xs sm:text-sm font-medium",
                                    get("text", "secondary"),
                                  )}
                                >
                                  Loading staff...
                                </p>
                                <p
                                  className={combine(
                                    "text-xs sm:text-sm mt-1 sm:mt-2",
                                    get("text", "tertiary"),
                                  )}
                                >
                                  Preparing staff records
                                </p>
                              </div>
                            </td>
                          </tr>
                        ) : currentStaff.length === 0 ? (
                          <tr>
                            <td
                              colSpan={6}
                              className="px-3 sm:px-4 py-8 text-center"
                            >
                              <div
                                className={combine(
                                  "inline-block p-3 rounded-full mb-3",
                                  theme === "dark"
                                    ? "bg-indigo-900/30"
                                    : "bg-indigo-100",
                                )}
                              >
                                <FaUserTie
                                  className={combine(
                                    "text-xl",
                                    theme === "dark"
                                      ? "text-indigo-400"
                                      : "text-indigo-500",
                                  )}
                                />
                              </div>
                              <h3
                                className={combine(
                                  "text-base font-medium mb-1",
                                  get("text", "primary"),
                                )}
                              >
                                No staff found
                              </h3>
                              <p
                                className={combine(
                                  "text-xs sm:text-sm mb-4",
                                  get("text", "secondary"),
                                )}
                              >
                                {searchTerm || filterRole !== "all"
                                  ? "Try adjusting your search or filters"
                                  : "Add your first staff member to get started"}
                              </p>
                              {!searchTerm && filterRole === "all" && (
                                <button
                                  onClick={() => setMode("add")}
                                  className={combine(
                                    getPrimaryButtonClass(),
                                    "mt-2",
                                  )}
                                >
                                  Add First Staff
                                </button>
                              )}
                            </td>
                          </tr>
                        ) : (
                          currentStaff.map((member) => {
                            const RoleIcon = getRoleIcon(member.role);
                            return (
                              <tr
                                key={member.id}
                                className="transition-colors duration-150 hover:bg-[var(--color-bg-hover)]"
                              >
                                <td className="px-3 sm:px-4 py-2 sm:py-3">
                                  <div
                                    className={combine(
                                      "font-medium text-xs sm:text-sm",
                                      get("accent", "primary"),
                                    )}
                                  >
                                    {member.staff_id}
                                  </div>
                                </td>
                                <td className="px-3 sm:px-4 py-2 sm:py-3">
                                  <div className="flex items-center">
                                    <div
                                      className={combine(
                                        "h-9 w-9 rounded-full flex items-center justify-center mr-3",
                                        theme === "dark"
                                          ? "bg-gray-800"
                                          : "bg-gray-100",
                                      )}
                                    >
                                      <FaUserTie
                                        className={combine(
                                          "text-sm",
                                          theme === "dark"
                                            ? "text-gray-400"
                                            : "text-gray-600",
                                        )}
                                      />
                                    </div>
                                    <div>
                                      <div className="font-semibold text-xs sm:text-sm">
                                        {member.name}
                                      </div>
                                      {member.extra_details?.gender && (
                                        <div
                                          className={combine(
                                            "text-xs mt-0.5",
                                            get("text", "tertiary"),
                                          )}
                                        >
                                          {member.extra_details.gender}
                                        </div>
                                      )}
                                    </div>
                                  </div>
                                </td>
                                <td className="px-3 sm:px-4 py-2 sm:py-3">
                                  <div className="flex items-center space-x-2">
                                    <RoleIcon
                                      className={combine(
                                        "text-sm",
                                        get("icon", "secondary"),
                                      )}
                                    />
                                    <span className={getStatusBadgeClass(member.role)}>
                                      {formatRoleDisplay(member.role)}
                                    </span>
                                  </div>
                                </td>
                                <td className="px-3 sm:px-4 py-2 sm:py-3">
                                  <div className="space-y-1.5">
                                    <div
                                      className={combine(
                                        "flex items-center text-xs",
                                        get("text", "primary"),
                                      )}
                                    >
                                      <FaEnvelope
                                        className={combine(
                                          "mr-2 text-xs",
                                          get("icon", "secondary"),
                                        )}
                                      />
                                      <span className="truncate max-w-[120px] text-xs">
                                        {member.email || "N/A"}
                                      </span>
                                    </div>
                                    <div
                                      className={combine(
                                        "flex items-center text-xs",
                                        get("text", "primary"),
                                      )}
                                    >
                                      <FaPhone
                                        className={combine(
                                          "mr-2 text-xs",
                                          get("icon", "secondary"),
                                        )}
                                      />
                                      <span className="text-xs">{member.phone}</span>
                                    </div>
                                  </div>
                                </td>
                                <td className="px-3 sm:px-4 py-2 sm:py-3">
                                  <div
                                    className={combine(
                                      "text-xs sm:text-sm",
                                      get("text", "secondary"),
                                    )}
                                  >
                                    {member.joining_date
                                      ? new Date(
                                          member.joining_date,
                                        ).toLocaleDateString()
                                      : "N/A"}
                                  </div>
                                </td>
                                <td className="px-3 sm:px-4 py-2 sm:py-3">
                                  <div className="flex space-x-1.5">
                                    <button
                                      onClick={() =>
                                        router.push(
                                          `/admin/staff/overview/${member.staff_id}`,
                                        )
                                      }
                                      className={combine(
                                        "p-1.5 rounded-lg transition-all duration-200 hover:text-[var(--color-accent-primary)]",
                                        get("icon", "primary") + " text-sm",
                                      )}
                                      title="View Profile"
                                    >
                                      <FaEye className="text-sm" />
                                    </button>
                                    <button
                                      onClick={() =>
                                        router.push(
                                          `/admin/staff/attendance?staffId=${member.staff_id}&tab=history&redirectedFrom=staff-directory`,
                                        )
                                      }
                                      className={combine(
                                        "p-1.5 rounded-lg transition-all duration-200 hover:text-[var(--color-accent-info)]",
                                        get("icon", "primary") + " text-sm",
                                      )}
                                      title="View Attendance History"
                                    >
                                      <FaHistory className="text-sm" />
                                    </button>
                                    <button
                                      onClick={() => {
                                        const staffType = normalizeStaffType(
                                          member.role,
                                        );
                                        router.push(
                                          `/admin/staff/resources?search=${encodeURIComponent(member.name)}&staffType=${encodeURIComponent(staffType)}&redirectedFrom=staff-directory`,
                                        );
                                      }}
                                      className={combine(
                                        "p-1.5 rounded-lg transition-all duration-200 hover:text-[var(--color-accent-warning)]",
                                        get("icon", "primary") + " text-sm",
                                      )}
                                      title="View Inventory Usage"
                                    >
                                      <FaBox className="text-sm" />
                                    </button>
                                    <button
                                      onClick={() =>
                                        router.push(
                                          `/admin/staff/work?search=${encodeURIComponent(member.name)}&filterStaffType=${member.role}&redirectedFrom=staff-directory`,
                                        )
                                      }
                                      className={combine(
                                        "p-1.5 rounded-lg transition-all duration-200 hover:text-[var(--color-accent-warning)]",
                                        get("icon", "primary") + " text-sm",
                                      )}
                                      title="View Work Assignments"
                                    >
                                      <FaTasks className="text-sm" />
                                    </button>
                                    <button
                                      onClick={() => {
                                        const params = new URLSearchParams();
                                        params.set("tab", "employeeReport");
                                        params.set("employee_type", "staff");
                                        params.set(
                                          "employee_id",
                                          member.staff_id,
                                        );
                                        params.set(
                                          "redirectedFrom",
                                          "staff-directory",
                                        );
                                        router.push(
                                          `/admin/salary?${params.toString()}`,
                                        );
                                      }}
                                      className={combine(
                                        "p-1.5 rounded-lg transition-all duration-200 hover:text-[var(--color-accent-success)]",
                                        get("icon", "primary") + " text-sm",
                                      )}
                                      title="View Salary Report"
                                    >
                                      <FaMoneyBillWave className="text-sm" />
                                    </button>
                                    <button
                                      onClick={() => resetStaffLogin(member)}
                                      disabled={resettingStaffId === member.id}
                                      className={combine(
                                        "p-1.5 rounded-lg transition-all duration-200 hover:text-[var(--color-accent-warning)] disabled:opacity-50",
                                        get("icon", "primary") + " text-sm",
                                      )}
                                      title="Reset login password to staff phone"
                                    >
                                      <FaKey className="text-sm" />
                                    </button>
                                    <button
                                      onClick={() => startEdit(member)}
                                      className={combine(
                                        "p-1.5 rounded-lg transition-all duration-200 hover:text-[var(--color-accent-success)]",
                                        get("icon", "primary") + " text-sm",
                                      )}
                                      title="Edit"
                                    >
                                      <FaEdit className="text-sm" />
                                    </button>
                                    <button
                                      onClick={() =>
                                        setShowDeleteConfirm(member.id)
                                      }
                                      className={combine(
                                        "p-1.5 rounded-lg transition-all duration-200 hover:text-[var(--color-accent-error)]",
                                        get("icon", "primary") + " text-sm",
                                      )}
                                      title="Delete"
                                    >
                                      <FaTrash className="text-sm" />
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
                )}

                {/* Pagination - Now outside the scrollable area */}
                {totalPages > 1 && !loading && currentStaff.length > 0 && (
                  <div
                    className={combine(
                      "px-4 py-3 border-t",
                      get("border", "primary"),
                    )}
                  >
                    <div className="flex flex-col sm:flex-row justify-between items-center gap-3">
                      <p
                        className={combine("text-xs", get("text", "tertiary"))}
                      >
                        Page {currentPage} of {totalPages}
                      </p>
                      <div className="flex items-center space-x-1.5">
                        <button
                          onClick={() =>
                            setCurrentPage((prev) => Math.max(prev - 1, 1))
                          }
                          disabled={currentPage === 1}
                          className={combine(
                            "p-1.5 rounded-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed hover:scale-[1.02] active:scale-[0.98] text-sm",
                            getSecondaryButtonClass(),
                          )}
                        >
                          <FaChevronLeft className="text-xs" />
                        </button>

                        <div className="flex space-x-1">
                          {Array.from(
                            { length: Math.min(5, totalPages) },
                            (_, i) => {
                              let pageNum: number;
                              if (totalPages <= 5) {
                                pageNum = i + 1;
                              } else if (currentPage <= 3) {
                                pageNum = i + 1;
                              } else if (currentPage >= totalPages - 2) {
                                pageNum = totalPages - 4 + i;
                              } else {
                                pageNum = currentPage - 2 + i;
                              }

                              return (
                                <button
                                  key={pageNum}
                                  onClick={() => setCurrentPage(pageNum)}
                                  className={combine(
                                    "px-3 py-1.5 rounded-lg transition-all font-medium hover:scale-[1.02] active:scale-[0.98] text-xs",
                                    currentPage === pageNum
                                      ? getPrimaryButtonClass()
                                      : getSecondaryButtonClass(),
                                  )}
                                >
                                  {pageNum}
                                </button>
                              );
                            },
                          )}
                        </div>

                        <button
                          onClick={() =>
                            setCurrentPage((prev) =>
                              Math.min(prev + 1, totalPages),
                            )
                          }
                          disabled={currentPage === totalPages}
                          className={combine(
                            "p-1.5 rounded-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed hover:scale-[1.02] active:scale-[0.98] text-sm",
                            getSecondaryButtonClass(),
                          )}
                        >
                          <FaChevronRight className="text-xs" />
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </>
        )}

        {/* Profile View */}
        {mode === "profile" && selectedStaff && (
          <div className="animate-fade-in max-w-6xl mx-auto">
            <div className={getCardGradientClass()}>
              {/* Profile Header */}
              <div className="p-6">
                <div className="flex justify-between items-start mb-6">
                  <div className="flex items-center gap-4">
                    <div
                      className={combine(
                        "h-20 w-20 rounded-full flex items-center justify-center border-4",
                        theme === "dark"
                          ? "bg-gray-800 border-indigo-900/30"
                          : "bg-indigo-100 border-indigo-200",
                      )}
                    >
                      <FaUserTie
                        className={combine(
                          "text-3xl",
                          theme === "dark"
                            ? "text-indigo-400"
                            : "text-indigo-600",
                        )}
                      />
                    </div>
                    <div>
                      <h1
                        className={combine(
                          "text-2xl font-bold",
                          get("text", "primary"),
                        )}
                      >
                        {selectedStaff.name}
                      </h1>
                      <p
                        className={combine(
                          "text-sm mt-1",
                          get("text", "secondary"),
                        )}
                      >
                        {selectedStaff.staff_id} •{" "}
                        {formatRoleDisplay(selectedStaff.role)}
                      </p>
                      <div className="flex gap-3 mt-2">
                        {selectedStaff.extra_details?.gender && (
                          <span
                            className={combine(
                              "px-3 py-1 rounded-full text-sm flex items-center gap-1",
                              theme === "dark"
                                ? "bg-gray-800 text-gray-300"
                                : "bg-gray-100 text-gray-700",
                            )}
                          >
                            <FaVenusMars className="text-xs" />{" "}
                            {selectedStaff.extra_details.gender}
                          </span>
                        )}
                        {selectedStaff.extra_details?.qualification && (
                          <span
                            className={combine(
                              "px-3 py-1 rounded-full text-sm",
                              theme === "dark"
                                ? "bg-gray-800 text-gray-300"
                                : "bg-gray-100 text-gray-700",
                            )}
                          >
                            {selectedStaff.extra_details.qualification}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                  <button
                    onClick={() => setMode("list")}
                    className={combine(
                      "p-2 rounded-lg transition-colors hover:bg-[var(--color-bg-hover)]",
                      get("icon", "secondary") + " text-sm",
                    )}
                  >
                    <FaTimes className="text-sm" />
                  </button>
                </div>

                {/* Profile Content */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Basic Information */}
                  <div>
                    <h2
                      className={combine(
                        "text-lg font-semibold mb-4",
                        get("text", "primary"),
                      )}
                    >
                      Basic Information
                    </h2>
                    <div className="space-y-3">
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <p
                            className={combine(
                              "text-xs",
                              get("text", "tertiary"),
                            )}
                          >
                            Staff ID
                          </p>
                          <p
                            className={combine(
                              "font-medium text-sm mt-1",
                              get("text", "primary"),
                            )}
                          >
                            {selectedStaff.staff_id}
                          </p>
                        </div>
                        <div>
                          <p
                            className={combine(
                              "text-xs",
                              get("text", "tertiary"),
                            )}
                          >
                            Role
                          </p>
                          <span
                            className={getStatusBadgeClass(selectedStaff.role)}
                          >
                            {formatRoleDisplay(selectedStaff.role)}
                          </span>
                        </div>
                      </div>
                      <div>
                        <p
                          className={combine(
                            "text-xs",
                            get("text", "tertiary"),
                          )}
                        >
                          Phone
                        </p>
                        <p
                          className={combine(
                            "font-medium text-sm mt-1",
                            get("text", "primary"),
                          )}
                        >
                          {selectedStaff.phone}
                        </p>
                      </div>
                      <div>
                        <p
                          className={combine(
                            "text-xs",
                            get("text", "tertiary"),
                          )}
                        >
                          Email
                        </p>
                        <p
                          className={combine(
                            "font-medium text-sm mt-1",
                            get("text", "primary"),
                          )}
                        >
                          {selectedStaff.email || "N/A"}
                        </p>
                      </div>
                      <div>
                        <p
                          className={combine(
                            "text-xs",
                            get("text", "tertiary"),
                          )}
                        >
                          Address
                        </p>
                        <p
                          className={combine(
                            "font-medium text-sm mt-1",
                            get("text", "primary"),
                          )}
                        >
                          {selectedStaff.address || "N/A"}
                        </p>
                      </div>
                      <div>
                        <p
                          className={combine(
                            "text-xs",
                            get("text", "tertiary"),
                          )}
                        >
                          Joining Date
                        </p>
                        <p
                          className={combine(
                            "font-medium text-sm mt-1",
                            get("text", "primary"),
                          )}
                        >
                          {selectedStaff.joining_date
                            ? new Date(
                                selectedStaff.joining_date,
                              ).toLocaleDateString()
                            : "N/A"}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Extra Details */}
                  <div>
                    <h2
                      className={combine(
                        "text-lg font-semibold mb-4",
                        get("text", "primary"),
                      )}
                    >
                      Additional Information
                    </h2>
                    <div className="space-y-3">
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <p
                            className={combine(
                              "text-xs",
                              get("text", "tertiary"),
                            )}
                          >
                            Date of Birth
                          </p>
                          <p
                            className={combine(
                              "font-medium text-sm mt-1",
                              get("text", "primary"),
                            )}
                          >
                            {selectedStaff.extra_details?.date_of_birth
                              ? new Date(
                                  selectedStaff.extra_details.date_of_birth,
                                ).toLocaleDateString()
                              : "N/A"}
                          </p>
                        </div>
                        <div>
                          <p
                            className={combine(
                              "text-xs",
                              get("text", "tertiary"),
                            )}
                          >
                            Gender
                          </p>
                          <p
                            className={combine(
                              "font-medium text-sm mt-1",
                              get("text", "primary"),
                            )}
                          >
                            {selectedStaff.extra_details?.gender || "N/A"}
                          </p>
                        </div>
                      </div>
                      <div>
                        <p
                          className={combine(
                            "text-xs",
                            get("text", "tertiary"),
                          )}
                        >
                          Salary Grade
                        </p>
                        <p
                          className={combine(
                            "font-medium text-sm mt-1",
                            get("text", "primary"),
                          )}
                        >
                          {selectedStaff.extra_details?.salary_grade || "N/A"}
                        </p>
                      </div>
                      <div>
                        <p
                          className={combine(
                            "text-xs",
                            get("text", "tertiary"),
                          )}
                        >
                          Emergency Contact
                        </p>
                        <p
                          className={combine(
                            "font-medium text-sm mt-1",
                            get("text", "primary"),
                          )}
                        >
                          {selectedStaff.extra_details?.emergency_contact ||
                            "N/A"}
                        </p>
                      </div>
                      <div>
                        <p
                          className={combine(
                            "text-xs",
                            get("text", "tertiary"),
                          )}
                        >
                          Qualification
                        </p>
                        <p
                          className={combine(
                            "font-medium text-sm mt-1",
                            get("text", "primary"),
                          )}
                        >
                          {selectedStaff.extra_details?.qualification || "N/A"}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Quick Actions */}
                <div
                  className={combine(
                    "mt-6 pt-6 border-t",
                    get("border", "primary"),
                  )}
                >
                  <h2
                    className={combine(
                      "text-lg font-semibold mb-4",
                      get("text", "primary"),
                    )}
                  >
                    Quick Actions
                  </h2>
                  <div className="flex space-x-3">
                    <button
                      onClick={() => startEdit(selectedStaff)}
                      className={combine(
                        getPrimaryButtonClass(),
                        "flex items-center gap-2",
                      )}
                    >
                      <FaEdit /> Edit Profile
                    </button>
                    <button
                      onClick={() => setShowDeleteConfirm(selectedStaff.id)}
                      className={combine(
                        getSecondaryButtonClass(),
                        theme === "dark"
                          ? "text-red-400 border-red-800 hover:bg-red-900/20"
                          : "text-red-600 border-red-200 hover:bg-red-50",
                      )}
                    >
                      <FaTrash /> Delete Staff
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Add/Edit Form */}
        {(mode === "add" || mode === "edit") && (
          <div className="animate-fade-in max-w-4xl mx-auto">
            <div className={getCardGradientClass()}>
              {/* Form Header */}
              <div className="mb-6">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center space-x-4">
                    <div
                      className={combine(
                        "p-3 rounded-lg",
                        theme === "dark" ? "bg-indigo-900/30" : "bg-indigo-100",
                      )}
                    >
                      <FaUserPlus
                        className={combine(
                          "text-lg",
                          theme === "dark"
                            ? "text-indigo-400"
                            : "text-indigo-600",
                        )}
                      />
                    </div>
                    <div>
                      <h2
                        className={combine(
                          "text-lg font-bold",
                          get("text", "primary"),
                        )}
                      >
                        {mode === "edit"
                          ? "Edit Staff Member"
                          : "Add New Staff"}
                      </h2>
                      <p
                        className={combine(
                          "text-sm mt-0.5",
                          get("text", "secondary"),
                        )}
                      >
                        {mode === "edit"
                          ? "Update staff information"
                          : "Register a new staff member"}
                      </p>
                    </div>
                  </div>
                </div>
                <div
                  className={combine(
                    "p-2 sm:p-3 rounded-lg sm:rounded-xl text-xs",
                    theme === "dark" ? "bg-indigo-900/20" : "bg-indigo-50",
                  )}
                >
                  <p
                    className={combine(
                      "flex items-center space-x-2",
                      theme === "dark" ? "text-indigo-300" : "text-indigo-700",
                    )}
                  >
                    <FaInfoCircle className="text-xs" />
                    <span className="text-xs">
                      Fields marked with * are required
                    </span>
                  </p>
                </div>
              </div>

              {/* Form Content */}
              <form
                onSubmit={mode === "add" ? createStaff : updateStaff}
                noValidate
                className="space-y-6"
              >
                <div className="space-y-6">
                  {/* Basic Information - Model Fields */}
                  <div>
                    <h3
                      className={combine(
                        "text-sm font-semibold mb-3",
                        get("text", "primary"),
                      )}
                    >
                      Basic Information
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label
                          className={combine(
                            "block text-xs font-medium mb-2",
                            get("text", "primary"),
                          )}
                        >
                          Staff ID *
                        </label>
                        <input
                          type="text"
                          value={formData.staff_id}
                          onChange={(e) =>
                            updateFormField("staff_id", e.target.value)
                          }
                          disabled={mode === "edit"}
                          className={combine(
                            getInputClass(),
                            "disabled:opacity-50",
                          )}
                          placeholder="STF001"
                        />
                        {formErrors.staff_id && (
                          <p className="mt-1 text-xs text-red-500">
                            {formErrors.staff_id}
                          </p>
                        )}
                      </div>
                      <div>
                        <label
                          className={combine(
                            "block text-xs font-medium mb-2",
                            get("text", "primary"),
                          )}
                        >
                          Full Name *
                        </label>
                        <input
                          type="text"
                          value={formData.name}
                          onChange={(e) =>
                            updateFormField("name", e.target.value)
                          }
                          className={getInputClass()}
                          placeholder="John Smith"
                        />
                        {formErrors.name && (
                          <p className="mt-1 text-xs text-red-500">
                            {formErrors.name}
                          </p>
                        )}
                      </div>
                      <div>
                        <label
                          className={combine(
                            "block text-xs font-medium mb-2",
                            get("text", "primary"),
                          )}
                        >
                          Role *
                        </label>
                        <select
                          value={formData.role}
                          onChange={(e) =>
                            updateFormField("role", e.target.value)
                          }
                          className={getInputClass()}
                        >
                          <option value="">Select Role</option>
                          {roleOptions.map((option) => (
                            <option key={option.value} value={option.value}>
                              {option.label}
                            </option>
                          ))}
                        </select>
                        {formErrors.role && (
                          <p className="mt-1 text-xs text-red-500">
                            {formErrors.role}
                          </p>
                        )}
                      </div>
                      <div>
                        <label
                          className={combine(
                            "block text-xs font-medium mb-2",
                            get("text", "primary"),
                          )}
                        >
                          Phone Number *
                        </label>
                        <input
                          type="tel"
                          value={formData.phone}
                          onChange={(e) =>
                            updateFormField("phone", e.target.value)
                          }
                          className={getInputClass()}
                          placeholder="9876543210"
                        />
                        {formErrors.phone && (
                          <p className="mt-1 text-xs text-red-500">
                            {formErrors.phone}
                          </p>
                        )}
                      </div>
                      <div>
                        <label
                          className={combine(
                            "block text-xs font-medium mb-2",
                            get("text", "primary"),
                          )}
                        >
                          Email (optional)
                        </label>
                        <input
                          type="email"
                          value={formData.email}
                          onChange={(e) =>
                            updateFormField("email", e.target.value)
                          }
                          className={getInputClass()}
                          placeholder="staff@school.edu"
                        />
                      </div>
                      <div>
                        <label
                          className={combine(
                            "block text-xs font-medium mb-2",
                            get("text", "primary"),
                          )}
                        >
                          Address (optional)
                        </label>
                        <textarea
                          value={formData.address}
                          onChange={(e) =>
                            updateFormField("address", e.target.value)
                          }
                          rows={2}
                          className={combine(getInputClass(), "resize-none")}
                          placeholder="Full address"
                        />
                      </div>
                      <div>
                        <label
                          className={combine(
                            "block text-xs font-medium mb-2",
                            get("text", "primary"),
                          )}
                        >
                          Joining Date (optional)
                        </label>
                        <input
                          type="date"
                          value={formData.joining_date}
                          onChange={(e) =>
                            updateFormField("joining_date", e.target.value)
                          }
                          className={getInputClass()}
                        />
                      </div>
                    </div>
                  </div>

                  {/* Extra Details (JSON Field) */}
                  <div>
                    <h3
                      className={combine(
                        "text-sm font-semibold mb-3",
                        get("text", "primary"),
                      )}
                    >
                      Additional Details
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label
                          className={combine(
                            "block text-xs font-medium mb-2",
                            get("text", "primary"),
                          )}
                        >
                          Date of Birth (optional)
                        </label>
                        <input
                          type="date"
                          value={formData.date_of_birth}
                          onChange={(e) =>
                            updateFormField("date_of_birth", e.target.value)
                          }
                          className={getInputClass()}
                        />
                      </div>
                      <div>
                        <label
                          className={combine(
                            "block text-xs font-medium mb-2",
                            get("text", "primary"),
                          )}
                        >
                          Gender (optional)
                        </label>
                        <select
                          value={formData.gender}
                          onChange={(e) =>
                            updateFormField("gender", e.target.value)
                          }
                          className={getInputClass()}
                        >
                          <option value="">Select Gender</option>
                          <option value="Male">Male</option>
                          <option value="Female">Female</option>
                          <option value="Other">Other</option>
                        </select>
                      </div>
                      <div>
                        <label
                          className={combine(
                            "block text-xs font-medium mb-2",
                            get("text", "primary"),
                          )}
                        >
                          Salary Grade (optional)
                        </label>
                        <input
                          type="text"
                          value={formData.salary_grade}
                          onChange={(e) =>
                            updateFormField("salary_grade", e.target.value)
                          }
                          className={getInputClass()}
                          placeholder="Grade 3"
                        />
                      </div>
                      <div>
                        <label
                          className={combine(
                            "block text-xs font-medium mb-2",
                            get("text", "primary"),
                          )}
                        >
                          Emergency Contact (optional)
                        </label>
                        <input
                          type="tel"
                          value={formData.emergency_contact}
                          onChange={(e) =>
                            updateFormField("emergency_contact", e.target.value)
                          }
                          className={getInputClass()}
                          placeholder="9876543211"
                        />
                      </div>
                      <div className="md:col-span-2">
                        <label
                          className={combine(
                            "block text-xs font-medium mb-2",
                            get("text", "primary"),
                          )}
                        >
                          Qualification (optional)
                        </label>
                        <input
                          type="text"
                          value={formData.qualification}
                          onChange={(e) =>
                            updateFormField("qualification", e.target.value)
                          }
                          className={getInputClass()}
                          placeholder="Diploma in Mechanical"
                        />
                      </div>
                    </div>
                  </div>

                  <div>
                    <h3
                      className={combine(
                        "text-sm font-semibold mb-3",
                        get("text", "primary"),
                      )}
                    >
                      Bank Details (Optional)
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label
                          className={combine(
                            "block text-xs font-medium mb-2",
                            get("text", "primary"),
                          )}
                        >
                          Account Holder Name (optional)
                        </label>
                        <input
                          type="text"
                          value={formData.account_holder_name}
                          onChange={(e) =>
                            updateFormField(
                              "account_holder_name",
                              e.target.value,
                            )
                          }
                          className={getInputClass()}
                          placeholder="John Smith"
                        />
                      </div>
                      <div>
                        <label
                          className={combine(
                            "block text-xs font-medium mb-2",
                            get("text", "primary"),
                          )}
                        >
                          Bank Name (optional)
                        </label>
                        <input
                          type="text"
                          value={formData.bank_name}
                          onChange={(e) =>
                            updateFormField("bank_name", e.target.value)
                          }
                          className={getInputClass()}
                          placeholder="State Bank of India"
                        />
                      </div>
                      <div>
                        <label
                          className={combine(
                            "block text-xs font-medium mb-2",
                            get("text", "primary"),
                          )}
                        >
                          Bank Account Number (optional)
                        </label>
                        <input
                          type="text"
                          value={formData.bank_account_number}
                          onChange={(e) =>
                            updateFormField(
                              "bank_account_number",
                              e.target.value,
                            )
                          }
                          className={getInputClass()}
                          placeholder="123456789012"
                        />
                      </div>
                      <div>
                        <label
                          className={combine(
                            "block text-xs font-medium mb-2",
                            get("text", "primary"),
                          )}
                        >
                          IFSC Code (optional)
                        </label>
                        <input
                          type="text"
                          value={formData.ifsc_code}
                          onChange={(e) =>
                            updateFormField("ifsc_code", e.target.value)
                          }
                          className={getInputClass()}
                          placeholder="SBIN0001234"
                        />
                      </div>
                      <div className="md:col-span-2">
                        <label
                          className={combine(
                            "block text-xs font-medium mb-2",
                            get("text", "primary"),
                          )}
                        >
                          UPI ID (optional)
                        </label>
                        <input
                          type="text"
                          value={formData.upi_id}
                          onChange={(e) =>
                            updateFormField("upi_id", e.target.value)
                          }
                          className={getInputClass()}
                          placeholder="name@bank"
                        />
                      </div>
                    </div>
                  </div>
                </div>

                {/* Form Actions */}
                <div
                  className={combine(
                    "flex space-x-3 pt-6 border-t",
                    get("border", "primary"),
                  )}
                >
                  <button
                    type="button"
                    onClick={() => {
                      setMode("list");
                      resetForm();
                      setFormErrors({});
                    }}
                    className={combine(getSecondaryButtonClass(), "text-sm")}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={loading}
                    className={combine(
                      getPrimaryButtonClass(),
                      "flex items-center space-x-2 text-sm disabled:opacity-50 disabled:cursor-not-allowed",
                    )}
                  >
                    {loading ? (
                      <>
                        <div
                          className={combine(
                            "animate-spin rounded-full h-4 w-4 border-b-2",
                            theme === "dark" ? "border-white" : "border-white",
                          )}
                        ></div>
                        <span className="text-sm">
                          {mode === "edit" ? "Updating..." : "Saving..."}
                        </span>
                      </>
                    ) : (
                      <>
                        <FaSave className="text-sm" />
                        <span className="text-sm">
                          {mode === "edit" ? "Update Staff" : "Save Staff"}
                        </span>
                      </>
                    )}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Delete Confirmation Modal */}
        {showDeleteConfirm && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50 animate-fade-in backdrop-blur-sm">
            <div
              className={combine(
                getCardGradientClass("red"),
                "max-w-md w-full",
              )}
            >
              <div className="text-center">
                <div
                  className={combine(
                    "mx-auto flex items-center justify-center h-12 w-12 rounded-full mb-3",
                    theme === "dark" ? "bg-red-900/30" : "bg-red-100",
                  )}
                >
                  <FaTrash
                    className={combine(
                      "h-5 w-5",
                      theme === "dark" ? "text-red-400" : "text-red-600",
                    )}
                  />
                </div>
                <h3
                  className={combine(
                    "text-lg font-bold mb-1.5",
                    get("text", "primary"),
                  )}
                >
                  Delete Staff Member
                </h3>
                <p
                  className={combine("text-sm mb-4", get("text", "secondary"))}
                >
                  {`Are you sure you want to delete ${
                    staff.find((member) => member.id === showDeleteConfirm)
                      ?.name || "this staff member"
                  }? This action cannot be undone.`}
                </p>
                <div className="flex space-x-2">
                  <button
                    onClick={() => setShowDeleteConfirm(null)}
                    className={combine(
                      getSecondaryButtonClass(),
                      "text-sm flex-1",
                    )}
                  >
                    Cancel
                  </button>
                  <button
                    onClick={() => deleteStaff(showDeleteConfirm)}
                    className={combine(
                      getPrimaryButtonClass(),
                      "text-sm flex-1",
                      theme === "dark"
                        ? "bg-gradient-to-r from-red-600 to-red-700 hover:from-red-700 hover:to-red-800"
                        : "bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700",
                    )}
                  >
                    Delete
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
