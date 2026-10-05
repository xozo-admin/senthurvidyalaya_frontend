// src/app/admin/teachers/allocations/page.tsx

"use client";

import { adminApi } from "@/lib/api";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  FaUserTie,
  FaUserPlus,
  FaEdit,
  FaTrash,
  FaSave,
  FaChalkboardTeacher,
  FaArrowLeft,
  FaPhone,
  FaEnvelope,
  FaGraduationCap,
  FaBuilding,
  FaCalendar,
  FaSearch,
  FaFilter,
  FaTimes,
  FaCheck,
  FaDownload,
  FaEye,
  FaSort,
  FaSortUp,
  FaSortDown,
  FaMapMarkerAlt,
  FaSchool,
  FaChevronLeft,
  FaChevronRight,
  FaBook,
  FaUsers,
  FaChartBar,
  FaIdCard,
  FaCalendarAlt,
  FaUserCheck,
  FaUserTimes,
  FaClipboardList,
  FaCog,
  FaPlus,
  FaInfoCircle,
  FaMinus,
  FaSync,
  FaKey,
  FaExternalLinkAlt,
  FaShieldAlt,
  FaEllipsisV,
  FaHistory,
  FaMoneyBillWave,
} from "react-icons/fa";
import { useTheme } from "@/contexts/ThemeContext";
import { useThemeClasses } from "@/hooks/useThemeClasses";
import { toastSuccess, toastError, toastWarning } from "@/lib/toast";
import { SchoolScopeSelector, useSchoolScope } from "@/components/admin/SchoolScopeSelector";

interface Teacher {
  id: number;
  teacher_id: string;
  name: string;
  email: string;
  phone: string;
  date_of_birth: string;
  qualification: string;
  department: string;
  address: string;
  joining_date?: string;
  assigned_class?: string;
  class_name?: string;
  section_name?: string;
  bank_account_number?: string;
  ifsc_code?: string;
  account_holder_name?: string;
  bank_name?: string;
  upi_id?: string;
}

interface PaginatedTeachersResponse {
  count: number;
  next: string | null;
  previous: string | null;
  results: Teacher[];
}

type SortField = "name" | "teacher_id" | "department" | "assigned_class";
type SortDirection = "asc" | "desc";

export default function AllTeachersPage() {
  const router = useRouter();
  const { theme } = useTheme();
  const { get, combine } = useThemeClasses();
  const [mode, setMode] = useState<"list" | "add" | "edit" | "profile">("list");
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [loading, setLoading] = useState(false);

  const [editId, setEditId] = useState<number | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterDept, setFilterDept] = useState("all");
  const [filterStatus, setFilterStatus] = useState<
    "all" | "assigned" | "unassigned"
  >("all");
  const [sortField, setSortField] = useState<SortField>("name");
  const [sortDirection, setSortDirection] = useState<SortDirection>("asc");
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize] = useState(10);
  const [totalTeachersCount, setTotalTeachersCount] = useState(0);
  const [isMobile, setIsMobile] = useState(false);
  const [bulkUploadMode, setBulkUploadMode] = useState(false);
  const [csvFile, setCsvFile] = useState<File | null>(null);
  const [imagesZipFile, setImagesZipFile] = useState<File | null>(null);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [fullStats, setFullStats] = useState({
    deptCount: 0,
    assignedCount: 0,
    unassignedCount: 0,
  });

  const [filterClass, setFilterClass] = useState("");
  const [filterSection, setFilterSection] = useState("");
  const schoolScope = useSchoolScope({ storageKey: "allteachers_school_scope" });

  // Add these new state variables for dropdown options
  const [classOptions, setClassOptions] = useState<string[]>([]);
  const [sectionOptions, setSectionOptions] = useState<string[]>([]);
  const [sectionsLoading, setSectionsLoading] = useState(false);

  /* ===== Bulk Actions ===== */
  const [selectedTeachers, setSelectedTeachers] = useState<number[]>([]);
  const [showBulkActions, setShowBulkActions] = useState(false);

  const [formData, setFormData] = useState({
    teacher_id: "",
    name: "",
    phone: "",
    email: "",
    date_of_birth: "",
    qualification: "",
    department: "",
    address: "",
    joining_date: new Date().toISOString().split("T")[0],
    // Note: class_name and section are sent separately for class teacher assignment
    class_name: "",
    section: "",
    bank_account_number: "",
    ifsc_code: "",
    account_holder_name: "",
    bank_name: "",
    upi_id: "",
  });
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});

  const [showDeleteConfirm, setShowDeleteConfirm] = useState<number | null>(
    null,
  );

  // Theme-aware CSS classes using the theme system
  const getBgClass = () =>
    combine(
      get("bg", "primary"),
      "min-h-screen transition-colors duration-200",
    );

  const getCardGradientClass = (color: string = "purple") => {
    const baseClasses = combine(
      "rounded-2xl p-6 border shadow-lg transition-all duration-300 group hover:shadow-xl my-2",
      get("border", "primary"),
    );

    if (color === "purple") {
      return combine(
        baseClasses,
        "bg-gradient-to-br",
        theme === "dark"
          ? "from-gray-800 to-purple-900/10"
          : "from-white to-purple-50",
      );
    }
    if (color === "emerald") {
      return combine(
        baseClasses,
        "bg-gradient-to-br",
        theme === "dark"
          ? "from-gray-800 to-emerald-900/10"
          : "from-white to-emerald-50",
      );
    }
    if (color === "blue") {
      return combine(
        baseClasses,
        "bg-gradient-to-br",
        theme === "dark"
          ? "from-gray-800 to-blue-900/10"
          : "from-white to-blue-50",
      );
    }
    if (color === "amber") {
      return combine(
        baseClasses,
        "bg-gradient-to-br",
        theme === "dark"
          ? "from-gray-800 to-amber-900/10"
          : "from-white to-amber-50",
      );
    }
    if (color === "indigo") {
      return combine(
        baseClasses,
        "bg-gradient-to-br",
        theme === "dark"
          ? "from-gray-800 to-indigo-900/10"
          : "from-white to-indigo-50",
      );
    }
    if (color === "green") {
      return combine(
        baseClasses,
        "bg-gradient-to-br",
        theme === "dark"
          ? "from-gray-800 to-green-900/10"
          : "from-white to-green-50",
      );
    }
    if (color === "red") {
      return combine(
        baseClasses,
        "bg-gradient-to-br",
        theme === "dark"
          ? "from-gray-800 to-red-900/10"
          : "from-white to-red-50",
      );
    }
    return combine(baseClasses, "bg-gradient-to-br", get("bg", "card"));
  };

  const getStatsCardClass = (
    color: "purple" | "emerald" | "blue" | "amber" | "indigo" = "purple",
  ) => {
    return getCardGradientClass(color);
  };

  const getInputClass = () =>
    combine(
      "px-3 sm:px-4 py-2.5 sm:py-3.5 rounded-lg sm:rounded-xl border focus:ring-2 focus:ring-purple-500 outline-none transition-all w-full",
      "text-xs sm:text-sm",
      theme === "dark"
        ? "bg-gray-900/70 border-gray-600 text-gray-100 hover:border-gray-500 focus:border-purple-400"
        : "bg-white border-gray-300 text-gray-900 hover:border-gray-400 focus:border-purple-500",
      "placeholder:text-xs sm:placeholder:text-sm placeholder:text-[var(--color-text-tertiary)]",
      "disabled:opacity-50 disabled:cursor-not-allowed",
    );

  const getPrimaryButtonClass = () =>
    combine(
      "px-4 sm:px-6 py-2.5 sm:py-3.5 rounded-lg sm:rounded-xl transition-all duration-200 font-medium",
      "text-white shadow-lg hover:shadow-xl hover:scale-[1.02] active:scale-[0.98]",
      "text-xs sm:text-sm",
      theme === "dark"
        ? "bg-gradient-to-r from-purple-600 to-purple-700 hover:from-purple-700 hover:to-purple-800"
        : "bg-gradient-to-r from-purple-500 to-purple-600 hover:from-purple-600 hover:to-purple-700",
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

  const getStatusBadgeClass = (type: string) => {
    const colorMap: {
      [key: string]: { bg: string; text: string; border: string };
    } = {
      purple: {
        bg:
          theme === "dark"
            ? "from-purple-900/30 to-purple-800/30"
            : "from-purple-100 to-purple-200",
        text: theme === "dark" ? "text-purple-300" : "text-purple-700",
        border: theme === "dark" ? "border-purple-800" : "border-purple-200",
      },
      emerald: {
        bg:
          theme === "dark"
            ? "from-emerald-900/30 to-emerald-800/30"
            : "from-emerald-100 to-emerald-200",
        text: theme === "dark" ? "text-emerald-300" : "text-emerald-700",
        border: theme === "dark" ? "border-emerald-800" : "border-emerald-200",
      },
      blue: {
        bg:
          theme === "dark"
            ? "from-blue-900/30 to-blue-800/30"
            : "from-blue-100 to-blue-200",
        text: theme === "dark" ? "text-blue-300" : "text-blue-700",
        border: theme === "dark" ? "border-blue-800" : "border-blue-200",
      },
      amber: {
        bg:
          theme === "dark"
            ? "from-amber-900/30 to-amber-800/30"
            : "from-amber-100 to-amber-200",
        text: theme === "dark" ? "text-amber-300" : "text-amber-700",
        border: theme === "dark" ? "border-amber-800" : "border-amber-200",
      },
      indigo: {
        bg:
          theme === "dark"
            ? "from-indigo-900/30 to-indigo-800/30"
            : "from-indigo-100 to-indigo-200",
        text: theme === "dark" ? "text-indigo-300" : "text-indigo-700",
        border: theme === "dark" ? "border-indigo-800" : "border-indigo-200",
      },
      green: {
        bg:
          theme === "dark"
            ? "from-green-900/30 to-green-800/30"
            : "from-green-100 to-green-200",
        text: theme === "dark" ? "text-green-300" : "text-green-700",
        border: theme === "dark" ? "border-green-800" : "border-green-200",
      },
      red: {
        bg:
          theme === "dark"
            ? "from-red-900/30 to-red-800/30"
            : "from-red-100 to-red-200",
        text: theme === "dark" ? "text-red-300" : "text-red-700",
        border: theme === "dark" ? "border-red-800" : "border-red-200",
      },
    };

    const colors = colorMap[type] || colorMap.purple;
    return combine(
      "px-3 py-1.5 text-xs font-medium rounded-full bg-gradient-to-r",
      colors.bg,
      colors.text,
      "border",
      colors.border,
    );
  };

  const getTableRowClass = () =>
    combine(get("bg", "card"), "divide-y", get("border", "primary"));

  /* ================= FETCH TEACHERS ================= */
  const fetchTeachers = async (page: number) => {
    setLoading(true);
    try {
      const params: {
        page: number;
        page_size: number;
        search?: string;
        department?: string;
        status?: "all" | "assigned" | "unassigned";
        class_name?: string;
        section?: string;
        school_id?: number;
      } = {
        page,
        page_size: pageSize,
        ...schoolScope.scopeParams,
      };

      if (searchTerm.trim()) params.search = searchTerm.trim();
      if (filterDept !== "all") params.department = filterDept;
      if (filterStatus !== "all") params.status = filterStatus;
      if (filterClass && filterClass !== "all") params.class_name = filterClass;
      if (filterSection && filterSection !== "all")
        params.section = filterSection;

      const res = await adminApi.teachers.listPaginated(params);
      const data = (res.data || {}) as PaginatedTeachersResponse;
      const teacherResults = Array.isArray(data.results) ? data.results : [];
      setTeachers(teacherResults);
      setTotalTeachersCount(typeof data.count === "number" ? data.count : 0);
    } catch (error) {
      console.error("Error fetching teachers:", error);
      setTeachers([]);
      setTotalTeachersCount(0);
    } finally {
      setLoading(false);
    }
  };

  const fetchTeacherStats = async () => {
    try {
      const allTeachers: Teacher[] = [];
      let page = 1;
      let hasMore = true;
      const statsPageSize = 200;

      while (hasMore) {
        const params: {
          page: number;
          page_size: number;
          search?: string;
          department?: string;
          status?: "all" | "assigned" | "unassigned";
          class_name?: string;
          section?: string;
          school_id?: number;
        } = {
          page,
          page_size: statsPageSize,
          ...schoolScope.scopeParams,
        };

        if (searchTerm.trim()) params.search = searchTerm.trim();
        if (filterDept !== "all") params.department = filterDept;
        if (filterStatus !== "all") params.status = filterStatus;
        if (filterClass && filterClass !== "all")
          params.class_name = filterClass;
        if (filterSection && filterSection !== "all")
          params.section = filterSection;

        const res = await adminApi.teachers.listPaginated(params);
        const data = (res.data || {}) as PaginatedTeachersResponse;
        const pageResults = Array.isArray(data.results) ? data.results : [];
        allTeachers.push(...pageResults);

        hasMore = !!data.next;
        page += 1;
      }

      const assignedCount = allTeachers.filter(
        (t) => t.assigned_class && t.assigned_class !== "Not Assigned",
      ).length;
      const unassignedCount = allTeachers.length - assignedCount;
      const deptCount = Array.from(
        new Set(allTeachers.map((t) => t.department).filter(Boolean)),
      ).length;

      setFullStats({ deptCount, assignedCount, unassignedCount });
    } catch (error) {
      console.error("Error fetching teacher stats:", error);
      setFullStats({ deptCount: 0, assignedCount: 0, unassignedCount: 0 });
    }
  };

  /* ================= FETCH CLASS/SECTION OPTIONS ================= */
  const fetchClassSectionOptions = async () => {
    setSectionsLoading(true);
    try {
      const res = await adminApi.academics.standards(schoolScope.scopeParams);
      const standards = res.data || [];

      const classes = standards
        .map((s: any) => s?.name)
        .filter(Boolean)
        .sort();
      setClassOptions(["all", ...classes]);

      const sections = new Set<string>();
      standards.forEach((s: any) => {
        (s?.sections || []).forEach((sec: any) => {
          if (sec?.name) sections.add(sec.name);
        });
      });
      setSectionOptions(["all", ...Array.from(sections).sort()]);
    } catch (error) {
      console.error("Error fetching class/section options:", error);
      setClassOptions(["all"]);
      setSectionOptions(["all"]);
    } finally {
      setSectionsLoading(false);
    }
  };

  useEffect(() => {
    fetchClassSectionOptions();
  }, [schoolScope.selectedSchoolId]);

  useEffect(() => {
    setCurrentPage(1);
    setFilterClass("");
    setFilterSection("");
    setSelectedTeachers([]);
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
    fetchTeachers(currentPage);
  }, [
    currentPage,
    searchTerm,
    filterDept,
    filterStatus,
    filterClass,
    filterSection,
    schoolScope.selectedSchoolId,
  ]);

  useEffect(() => {
    fetchTeacherStats();
  }, [searchTerm, filterDept, filterStatus, filterClass, filterSection, schoolScope.selectedSchoolId]);

  /* ================= DELETE TEACHER ================= */
  const deleteTeacher = async (id: number) => {
    setShowDeleteConfirm(null);

    try {
      const teacher = teachers.find((t) => t.id === id);
      const teacherId = teacher?.teacher_id;
      if (!teacherId) {
        toastError("Teacher ID not found");
        return;
      }
      await adminApi.teachers.delete(teacherId, schoolScope.scopeParams);
      setTeachers((prev) => prev.filter((t) => t.id !== id));
      setSelectedTeachers((prev) =>
        prev.filter((teacherId) => teacherId !== id),
      );
      toastSuccess("Teacher deleted successfully!");
    } catch (error) {
      console.error("Error deleting teacher:", error);
      toastError("Failed to delete teacher");
      fetchTeachers(currentPage);
    }
  };

  /* ================= BULK DELETE ================= */
  const bulkDeleteTeachers = async () => {
    if (
      !confirm(
        `Are you sure you want to delete ${selectedTeachers.length} teachers?`,
      )
    )
      return;

    let successCount = 0;
    let failCount = 0;

    for (const id of selectedTeachers) {
      try {
        const teacher = teachers.find((t) => t.id === id);
        const teacherId = teacher?.teacher_id;
        if (!teacherId) {
          failCount++;
          continue;
        }
        await adminApi.teachers.delete(teacherId, schoolScope.scopeParams);
        successCount++;
      } catch (error) {
        failCount++;
      }
    }

    toastSuccess(`Deleted ${successCount} teachers, ${failCount} failed.`);
    fetchTeachers(currentPage);
    setSelectedTeachers([]);
    setShowBulkActions(false);
  };

  /* ================= START EDIT ================= */
  const startEdit = (teacher: Teacher) => {
    setFormData({
      teacher_id: teacher.teacher_id,
      name: teacher.name,
      phone: teacher.phone,
      email: teacher.email,
      date_of_birth: teacher.date_of_birth,
      qualification: teacher.qualification,
      department: teacher.department,
      address: teacher.address || "",
      joining_date:
        teacher.joining_date || new Date().toISOString().split("T")[0],
      class_name: teacher.class_name || "",
      section: teacher.section_name || "",
      bank_account_number: teacher.bank_account_number || "",
      ifsc_code: teacher.ifsc_code || "",
      account_holder_name: teacher.account_holder_name || "",
      bank_name: teacher.bank_name || "",
      upi_id: teacher.upi_id || "",
    });
    setFormErrors({});
    setEditId(teacher.id);
    setMode("edit");
  };

  /* ================= HANDLE FORM CHANGE ================= */
  const handleChange = (
    e: React.ChangeEvent<
      HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement
    >,
  ) => {
    const { name, value } = e.target;
    setFormData({ ...formData, [name]: value });
    setFormErrors((prev) => ({ ...prev, [name]: "" }));
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
    if (extracted.address) {
      extracted.address = "Address is required.";
    }
    return extracted;
  };

  const validateForm = () => {
    const nextErrors: Record<string, string> = {};
    const isValidEmail = (value: string) =>
      /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());
    const isValidPhoneNumber = (value: string) => {
      const trimmed = value.trim();
      if (!/^\+?[0-9\s-]+$/.test(trimmed)) return false;
      const digitsOnly = trimmed.replace(/\D/g, "");
      return digitsOnly.length >= 10 && digitsOnly.length <= 15;
    };

    if (!formData.teacher_id.trim())
      nextErrors.teacher_id = "Teacher ID is required.";
    if (!formData.name.trim()) nextErrors.name = "Teacher name is required.";
    if (!formData.email.trim()) nextErrors.email = "Email is required.";
    if (formData.email.trim() && !isValidEmail(formData.email)) {
      nextErrors.email = "Enter a valid email address.";
    }
    if (!formData.phone.trim()) nextErrors.phone = "Phone number is required.";
    if (formData.phone.trim() && !isValidPhoneNumber(formData.phone)) {
      nextErrors.phone = "Enter a valid phone number (10-15 digits).";
    }
    if (!formData.date_of_birth)
      nextErrors.date_of_birth = "Date of birth is required.";
    if (!formData.qualification.trim())
      nextErrors.qualification = "Qualification is required.";
    if (!formData.department.trim())
      nextErrors.department = "Department is required.";
    if (!formData.address.trim()) nextErrors.address = "Address is required.";
    if (
      (formData.class_name.trim() && !formData.section.trim()) ||
      (!formData.class_name.trim() && formData.section.trim())
    ) {
      if (!formData.class_name.trim())
        nextErrors.class_name = "Class is required when section is provided.";
      if (!formData.section.trim())
        nextErrors.section = "Section is required when class is provided.";
    }

    setFormErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  };

  /* ================= SUBMIT FORM ================= */
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) {
      toastError("Please fill all required fields.");
      return;
    }
    setLoading(true);

    // Only include fields that exist in the backend Teacher model
    const payload: any = {
      teacher_id: formData.teacher_id.trim(),
      name: formData.name.trim(),
      email: formData.email.trim(),
      phone: formData.phone.trim(),
      date_of_birth: formData.date_of_birth,
      qualification: formData.qualification.trim(),
      department: formData.department.trim(),
      address: formData.address.trim() || "",
      joining_date: formData.joining_date || null,
      bank_account_number: formData.bank_account_number.trim() || null,
      ifsc_code: formData.ifsc_code.trim() || null,
      account_holder_name: formData.account_holder_name.trim() || null,
      bank_name: formData.bank_name.trim() || null,
      upi_id: formData.upi_id.trim() || null,
    };

    // Add class_name and section for class teacher assignment (these are write-only fields in the serializer)
    if (formData.class_name && formData.section) {
      payload.class_name = formData.class_name;
      payload.section = formData.section;
    } else if (formData.class_name === "" && formData.section === "") {
      // Send empty strings to clear class teacher assignment
      payload.class_name = "";
      payload.section = "";
    }

    const teacherIdForUrl = mode === "edit" ? formData.teacher_id : undefined;

    console.log(payload);

    try {
      if (mode === "edit") {
        await adminApi.teachers.update(teacherIdForUrl || "", {
          ...payload,
          ...schoolScope.scopeParams,
        });
      } else {
        await adminApi.teachers.create({
          ...payload,
          ...schoolScope.scopeParams,
        });
      }

      fetchTeachers(currentPage);
      setMode("list");
      setFormData({
        teacher_id: "",
        name: "",
        phone: "",
        email: "",
        date_of_birth: "",
        qualification: "",
        department: "",
        address: "",
        joining_date: new Date().toISOString().split("T")[0],
        class_name: "",
        section: "",
        bank_account_number: "",
        ifsc_code: "",
        account_holder_name: "",
        bank_name: "",
        upi_id: "",
      });
      setFormErrors({});

      const successMsg =
        mode === "edit"
          ? "Teacher updated successfully!"
          : "Teacher added successfully!";
      toastSuccess(successMsg);
    } catch (error: any) {
      console.error("Network error:", error);
      const apiErrors = parseApiErrors(error);
      if (Object.keys(apiErrors).length > 0) {
        setFormErrors(apiErrors);
      }
      const firstError =
        Object.values(apiErrors)[0] ||
        error?.response?.data?.detail ||
        error?.response?.data?.error ||
        "Operation failed. Please check your data.";
      toastError(`Error: ${firstError}`);
    } finally {
      setLoading(false);
    }
  };

  /* ================= FILTER & SORT ================= */
  const filteredTeachers = teachers;

  const sortedTeachers = [...filteredTeachers].sort((a, b) => {
    let aValue: any = a[sortField];
    let bValue: any = b[sortField];

    if (typeof aValue === "string" && typeof bValue === "string") {
      aValue = aValue.toLowerCase();
      bValue = bValue.toLowerCase();
    }

    if (aValue < bValue) return sortDirection === "asc" ? -1 : 1;
    if (aValue > bValue) return sortDirection === "asc" ? 1 : -1;
    return 0;
  });

  /* ================= PAGINATION ================= */
  const totalPages = Math.max(1, Math.ceil(totalTeachersCount / pageSize));
  const indexOfFirstItem =
    totalTeachersCount === 0 ? 0 : (currentPage - 1) * pageSize + 1;
  const indexOfLastItem = Math.min(currentPage * pageSize, totalTeachersCount);
  const currentTeachers = sortedTeachers;

  /* ================= GET UNIQUE DEPARTMENTS ================= */
  const departments = [
    "all",
    ...Array.from(new Set(teachers.map((t) => t.department).filter(Boolean))),
  ];

  /* ================= STATS ================= */
  const totalTeachers = totalTeachersCount;
  const deptCount = fullStats.deptCount;
  const assignedCount = fullStats.assignedCount;
  const unassignedCount = fullStats.unassignedCount;

  /* ================= SORT HANDLER ================= */
  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === "asc" ? "desc" : "asc");
    } else {
      setSortField(field);
      setSortDirection("asc");
    }
  };

  /* ================= EXPORT CSV ================= */
  const exportToCSV = async () => {
    const headers = [
      "Teacher ID",
      "Name",
      "Email",
      "Phone",
      "Qualification",
      "Department",
      "DOB",
      "Joining Date",
      "Assigned Class",
      "Address",
    ];

    try {
      const allTeachers: Teacher[] = [];
      let page = 1;
      let hasMore = true;
      const exportPageSize = 200;

      while (hasMore) {
        const params: {
          page: number;
          page_size: number;
          search?: string;
          department?: string;
          status?: "all" | "assigned" | "unassigned";
          class_name?: string;
          section?: string;
          school_id?: number;
        } = {
          page,
          page_size: exportPageSize,
          ...schoolScope.scopeParams,
        };

        if (searchTerm.trim()) params.search = searchTerm.trim();
        if (filterDept !== "all") params.department = filterDept;
        if (filterStatus !== "all") params.status = filterStatus;
        if (filterClass && filterClass !== "all")
          params.class_name = filterClass;
        if (filterSection && filterSection !== "all")
          params.section = filterSection;

        const res = await adminApi.teachers.listPaginated(params);
        const data = (res.data || {}) as PaginatedTeachersResponse;
        const pageResults = Array.isArray(data.results) ? data.results : [];
        allTeachers.push(...pageResults);

        hasMore = !!data.next;
        page += 1;
      }

      if (allTeachers.length === 0) {
        toastError("No teachers to export");
        return;
      }

      const sortedForExport = [...allTeachers].sort((a, b) => {
        let aValue: any = a[sortField];
        let bValue: any = b[sortField];

        if (typeof aValue === "string" && typeof bValue === "string") {
          aValue = aValue.toLowerCase();
          bValue = bValue.toLowerCase();
        }

        if (aValue < bValue) return sortDirection === "asc" ? -1 : 1;
        if (aValue > bValue) return sortDirection === "asc" ? 1 : -1;
        return 0;
      });

      const csvData = sortedForExport.map((teacher) => [
        teacher.teacher_id,
        teacher.name,
        teacher.email,
        teacher.phone,
        teacher.qualification,
        teacher.department,
        teacher.date_of_birth,
        teacher.joining_date || "",
        teacher.assigned_class || "Not Assigned",
        teacher.address || "",
      ]);

      const csvContent = [
        headers.join(","),
        ...csvData.map((row) =>
          row
            .map((field) => `"${String(field).replace(/"/g, '""')}"`)
            .join(","),
        ),
      ].join("\n");

      const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `teachers_${new Date().toISOString().split("T")[0]}.csv`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
      toastSuccess(
        `CSV exported successfully! (${allTeachers.length} teachers)`,
      );
    } catch (error) {
      console.error("Error exporting teachers CSV:", error);
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
      const response = await adminApi.csv.uploadStudents(
        csvFile,
        schoolScope.scopeParams,
      );
      const result = response?.data || {};
      const errors: string[] = Array.isArray(result.errors) ? result.errors : [];
      if (errors.length > 0) {
        console.warn("Teacher CSV upload row errors:", errors);
        toastWarning(
          `${result.summary?.teachers || 0} teachers uploaded; ${errors.length} row(s) failed. ${errors[0]}`,
        );
      } else {
        toastSuccess(
          `Bulk upload completed successfully (${result.summary?.teachers || 0} teachers).`,
        );
      }
      fetchTeachers(currentPage);
      fetchTeacherStats();
      setBulkUploadMode(false);
      setCsvFile(null);
    } catch (error: any) {
      console.error("Upload error:", error);
      const responseData = error?.response?.data || {};
      const firstRowError = Array.isArray(responseData.errors)
        ? responseData.errors[0]
        : null;
      toastError(
        firstRowError || responseData.error || responseData.message || "Upload failed. Please try again.",
      );
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
        "teacher",
        imagesZipFile,
        schoolScope.scopeParams,
      );
      const data = response?.data || {};
      const successCount = Number(data?.success_count || 0);
      const failedCount = Number(data?.failed_count || 0);
      const errors: string[] = Array.isArray(data?.errors) ? data.errors : [];

      if (failedCount === 0) {
        toastSuccess(
          `Profile image upload completed. Updated ${successCount} teachers.`,
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
      fetchTeachers(currentPage);
      fetchTeacherStats();
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
    const headers = [
      "teacher_id",
      "teacher_name",
      "teacher_phone",
      "teacher_email",
      "teacher_dob",
      "qualification",
      "department",
      "class",
      "section",
    ];
    const sampleRow = [
      "TCH001",
      "Teacher Name",
      "9876543210",
      "teacher@example.com",
      "1990-01-15",
      "M.Sc, B.Ed",
      "Mathematics",
      "10",
      "A",
    ];

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
    a.download = "teachers_sample_template.csv";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
  };

  return (
    <div
      className={`dashboard-typography p-3 md:p-4 xl:p-6 ${getBgClass()} transition-colors duration-200`}
    >
      <div className="mx-auto w-full max-w-[1920px]">
        {/* HEADER SECTION */}
        <div className="mb-6 sm:mb-8">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between mb-4 sm:mb-6 gap-4">
            <div className="flex items-center justify-between w-full lg:w-auto">
              <div className="flex items-center space-x-4">
                <div
                  className={combine(
                    "p-3 rounded-2xl shadow-lg",
                    theme === "dark"
                      ? "bg-gradient-to-br from-purple-600 to-purple-700"
                      : "bg-gradient-to-br from-purple-500 to-purple-600",
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
                    Teacher Management
                  </h1>
                  <p
                    className={combine(
                      "text-xs sm:text-sm mt-0.5 sm:mt-1",
                      get("text", "secondary"),
                    )}
                  >
                    Manage all teacher records
                  </p>
                </div>
              </div>
            </div>

            {/* Action Buttons - Desktop */}
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-3 w-full lg:w-auto">
              <SchoolScopeSelector {...schoolScope} className="w-full sm:w-auto" />
              {selectedTeachers.length > 0 && (
                <div className="flex items-center space-x-2 mr-4">
                  <span
                    className={combine(
                      "text-xs px-2 py-1 rounded-lg",
                      theme === "dark"
                        ? "bg-blue-900/30 text-blue-300"
                        : "bg-blue-100 text-blue-700",
                    )}
                  >
                    {selectedTeachers.length} selected
                  </span>
                  <button
                    onClick={bulkDeleteTeachers}
                    className={combine(
                      "px-3 py-2 rounded-xl transition-all duration-200 flex items-center space-x-2 hover:scale-[1.02] active:scale-[0.98] text-xs",
                      theme === "dark"
                        ? "bg-gradient-to-r from-red-600 to-red-700 hover:from-red-700 hover:to-red-800 text-white"
                        : "bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 text-white",
                    )}
                  >
                    <FaTrash />
                    <span>Delete Selected</span>
                  </button>
                </div>
              )}

              <button
                onClick={exportToCSV}
                className={combine(
                  getSecondaryButtonClass(),
                  "flex items-center space-x-2 shrink-0",
                )}
              >
                <FaDownload className="text-xs" />
                <span className="inline">Export CSV</span>
              </button>

              <button
                onClick={() => setBulkUploadMode(!bulkUploadMode)}
                className={combine(
                  getSecondaryButtonClass(),
                  "flex items-center space-x-2 shrink-0",
                )}
              >
                <FaClipboardList className="text-xs" />
                <span>Bulk Upload</span>
              </button>

              {mode === "list" ? (
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
                  <span>Add Teacher</span>
                </button>
              ) : (
                <button
                  onClick={() => {
                    setMode("list");
                    setFormErrors({});
                    setFormData({
                      teacher_id: "",
                      name: "",
                      phone: "",
                      email: "",
                      date_of_birth: "",
                      qualification: "",
                      department: "",
                      address: "",
                      joining_date: new Date().toISOString().split("T")[0],
                      class_name: "",
                      section: "",
                      bank_account_number: "",
                      ifsc_code: "",
                      account_holder_name: "",
                      bank_name: "",
                      upi_id: "",
                    });
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

          {/* QUICK STATS */}
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3 sm:gap-4 md:gap-6">
            <div className={getStatsCardClass("purple")}>
              <div className="flex items-center justify-between">
                <div>
                  <p
                    className={combine(
                      "text-xs font-medium",
                      get("text", "secondary"),
                    )}
                  >
                    Total Teachers
                  </p>
                  <p
                    className={combine(
                      "text-2xl font-bold mt-2",
                      get("text", "primary"),
                    )}
                  >
                    {totalTeachers}
                  </p>
                </div>
                <div
                  className={combine(
                    "p-2 rounded-xl",
                    theme === "dark" ? "bg-purple-900/30" : "bg-purple-100",
                  )}
                >
                  <FaUserTie
                    className={combine(
                      "text-lg",
                      theme === "dark" ? "text-purple-400" : "text-purple-600",
                    )}
                  />
                </div>
              </div>
              <div className={combine("mt-3 text-xs", get("text", "tertiary"))}>
                Across all departments (all pages)
              </div>
            </div>

            <div className={getStatsCardClass("emerald")}>
              <div className="flex items-center justify-between">
                <div>
                  <p
                    className={combine(
                      "text-xs font-medium",
                      get("text", "secondary"),
                    )}
                  >
                    Departments
                  </p>
                  <p
                    className={combine(
                      "text-2xl font-bold mt-2",
                      get("text", "primary"),
                    )}
                  >
                    {deptCount}
                  </p>
                </div>
                <div
                  className={combine(
                    "p-2 rounded-xl",
                    theme === "dark" ? "bg-emerald-900/30" : "bg-emerald-100",
                  )}
                >
                  <FaBuilding
                    className={combine(
                      "text-lg",
                      theme === "dark"
                        ? "text-emerald-400"
                        : "text-emerald-600",
                    )}
                  />
                </div>
              </div>
              <div
                className={combine("mt-3 text-xs", get("accent", "success"))}
              >
                Unique departments
              </div>
            </div>

            <div className={getStatsCardClass("blue")}>
              <div className="flex items-center justify-between">
                <div>
                  <p
                    className={combine(
                      "text-xs font-medium",
                      get("text", "secondary"),
                    )}
                  >
                    Assigned
                  </p>
                  <p
                    className={combine(
                      "text-2xl font-bold mt-2",
                      get("text", "primary"),
                    )}
                  >
                    {assignedCount}
                  </p>
                </div>
                <div
                  className={combine(
                    "p-2 rounded-xl",
                    theme === "dark" ? "bg-blue-900/30" : "bg-blue-100",
                  )}
                >
                  <FaUserCheck
                    className={combine(
                      "text-lg",
                      theme === "dark" ? "text-blue-400" : "text-blue-600",
                    )}
                  />
                </div>
              </div>
              <div
                className={combine("mt-3 text-xs", get("accent", "primary"))}
              >
                {totalTeachers > 0
                  ? `${((assignedCount / totalTeachers) * 100).toFixed(1)}%`
                  : "0%"}{" "}
                of total
              </div>
            </div>

            <div className={getStatsCardClass("amber")}>
              <div className="flex items-center justify-between">
                <div>
                  <p
                    className={combine(
                      "text-xs font-medium",
                      get("text", "secondary"),
                    )}
                  >
                    Unassigned
                  </p>
                  <p
                    className={combine(
                      "text-2xl font-bold mt-2",
                      get("text", "primary"),
                    )}
                  >
                    {unassignedCount}
                  </p>
                </div>
                <div
                  className={combine(
                    "p-2 rounded-xl",
                    theme === "dark" ? "bg-amber-900/30" : "bg-amber-100",
                  )}
                >
                  <FaUserTimes
                    className={combine(
                      "text-lg",
                      theme === "dark" ? "text-amber-400" : "text-amber-600",
                    )}
                  />
                </div>
              </div>
              <div
                className={combine("mt-3 text-xs", get("accent", "warning"))}
              >
                {totalTeachers > 0
                  ? `${((unassignedCount / totalTeachers) * 100).toFixed(1)}%`
                  : "0%"}{" "}
                of total
              </div>
            </div>
          </div>
        </div>

        {/* MAIN CONTENT AREA */}
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
                        <FaClipboardList
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
                          Bulk Upload Teachers
                        </h3>
                        <p
                          className={combine(
                            "text-xs sm:text-sm mt-0.5 sm:mt-1",
                            get("text", "secondary"),
                          )}
                        >
                          Upload a CSV file to add multiple teachers at once
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
                      Upload Teacher Profile Images (.zip)
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
                      ZIP should contain image files named as teacher IDs (e.g.,
                      TCH001.jpg, TCH002.png).
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
                      teacher_id,teacher_name,teacher_phone,teacher_email,teacher_dob,qualification,department,class,section
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* SEARCH & FILTERS */}
            <div className={getCardGradientClass("purple")}>
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-6 gap-3 sm:gap-4">
                <div className="col-span-2">
                  <div className="relative">
                    <FaSearch
                      className={combine(
                        "absolute left-3 sm:left-4 top-1/2 transform -translate-y-1/2 text-sm",
                        get("icon", "secondary"),
                      )}
                    />
                    <input
                      type="text"
                      placeholder="Search teachers..."
                      value={searchTerm}
                      onChange={(e) => {
                        setSearchTerm(e.target.value);
                        setCurrentPage(1);
                      }}
                      className={getInputClass()}
                      style={{ paddingLeft: "2.2rem" }}
                    />
                  </div>
                </div>
                <div>
                  <select
                    value={filterDept}
                    onChange={(e) => {
                      setFilterDept(e.target.value);
                      setCurrentPage(1);
                    }}
                    className={getInputClass()}
                  >
                    {departments.map((dept) => (
                      <option key={dept} value={dept}>
                        {dept === "all"
                          ? "All Departments"
                          : dept.length > 15
                            ? dept.substring(0, 12) + "..."
                            : dept}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <select
                    value={filterStatus}
                    onChange={(e) => {
                      setFilterStatus(e.target.value as any);
                      setCurrentPage(1);
                    }}
                    className={getInputClass()}
                  >
                    <option value="all">All Teachers</option>
                    <option value="assigned">Assigned Only</option>
                    <option value="unassigned">Unassigned Only</option>
                  </select>
                </div>
                <div>
                  <select
                    value={filterClass}
                    onChange={(e) => {
                      setFilterClass(e.target.value);
                      setFilterSection("");
                      setCurrentPage(1);
                    }}
                    className={getInputClass()}
                    disabled={sectionsLoading}
                  >
                    <option value="">All Classes</option>
                    {classOptions
                      .filter((c) => c !== "all")
                      .map((className) => (
                        <option key={className} value={className}>
                          Class {className}
                        </option>
                      ))}
                  </select>
                </div>
                <div>
                  <select
                    value={filterSection}
                    onChange={(e) => {
                      setFilterSection(e.target.value);
                      setCurrentPage(1);
                    }}
                    className={getInputClass()}
                    disabled={sectionsLoading}
                  >
                    <option value="">All Sections</option>
                    {sectionOptions
                      .filter((s) => s !== "all")
                      .map((sectionName) => (
                        <option key={sectionName} value={sectionName}>
                          Section {sectionName}
                        </option>
                      ))}
                  </select>
                </div>
              </div>
            </div>

            {/* TEACHERS TABLE */}
            <div className={getCardGradientClass()}>
              {/* Table Header */}
              <div
                className={combine("p-4 border-b", get("border", "primary"))}
              >
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 sm:gap-0">
                  <div>
                    <h3
                      className={combine(
                        "text-base sm:text-lg font-bold",
                        get("text", "primary"),
                      )}
                    >
                      Teacher Records
                    </h3>
                    <p
                      className={combine(
                        "text-xs sm:text-sm mt-0.5 sm:mt-1",
                        get("text", "secondary"),
                      )}
                    >
                      View and manage teacher information
                    </p>
                  </div>

                  <div className={combine("text-xs", get("text", "tertiary"))}>
                    Showing {indexOfFirstItem} to {indexOfLastItem} of{" "}
                    {totalTeachers}
                  </div>
                </div>
              </div>

              {/* Table Content - Fixed height with scroll */}
              <div className="overflow-x-auto">
                {loading ? (
                  <div className="p-6 sm:p-8 min-h-[280px] flex items-center justify-center text-center">
                    <div className="text-center">
                      <div className="relative mx-auto w-16 h-16">
                        <div className="animate-spin rounded-full h-16 w-16 border-4 border-purple-200 border-t-purple-600"></div>
                        <div className="absolute inset-0 flex items-center justify-center">
                          <FaSchool className="h-8 w-8 text-purple-600 animate-pulse" />
                        </div>
                      </div>
                      <p
                        className={combine(
                          "mt-4 sm:mt-6 text-xs sm:text-sm font-medium",
                          get("text", "secondary"),
                        )}
                      >
                        Loading teachers...
                      </p>
                      <p
                        className={combine(
                          "text-xs sm:text-sm mt-1 sm:mt-2",
                          get("text", "tertiary"),
                        )}
                      >
                        Preparing teacher records
                      </p>
                    </div>
                  </div>
                ) : currentTeachers.length === 0 ? (
                  <div className="p-8 text-center">
                    <div
                      className={combine(
                        "inline-block p-3 rounded-full mb-3",
                        theme === "dark" ? "bg-purple-900/30" : "bg-purple-100",
                      )}
                    >
                      <FaUserTie
                        className={combine(
                          "text-xl",
                          theme === "dark"
                            ? "text-purple-400"
                            : "text-purple-500",
                        )}
                      />
                    </div>
                    <h3
                      className={combine(
                        "text-base font-medium mb-1",
                        get("text", "primary"),
                      )}
                    >
                      No teachers found
                    </h3>
                    <p
                      className={combine(
                        "text-sm mb-4",
                        get("text", "secondary"),
                      )}
                    >
                      {searchTerm ||
                      filterDept !== "all" ||
                      filterStatus !== "all"
                        ? "Try adjusting your search or filters"
                        : "Add your first teacher to get started"}
                    </p>
                  </div>
                ) : isMobile ? (
                  <div className="p-2 sm:p-3">
                    <div className="space-y-3">
                      {currentTeachers.map((teacher) => (
                        <div
                          key={teacher.id}
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
                                  "font-semibold text-sm sm:text-base truncate",
                                  get("text", "primary"),
                                )}
                              >
                                {teacher.name}
                              </p>
                              <p
                                className={combine(
                                  "text-xs mt-0.5",
                                  get("text", "tertiary"),
                                )}
                              >
                                ID: {teacher.teacher_id}
                              </p>
                              <p
                                className={combine(
                                  "text-xs mt-0.5 truncate",
                                  get("text", "secondary"),
                                )}
                              >
                                {teacher.qualification}
                              </p>
                            </div>
                            <span className={getStatusBadgeClass("purple")}>
                              {teacher.department}
                            </span>
                          </div>

                          <div className="mt-2 grid grid-cols-2 gap-2 text-xs sm:text-sm">
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
                                {teacher.email}
                              </p>
                              <p
                                className={combine(
                                  "mt-0.5",
                                  get("text", "secondary"),
                                )}
                              >
                                {teacher.phone}
                              </p>
                            </div>
                            <div>
                              <p
                                className={combine(
                                  "font-medium",
                                  get("text", "tertiary"),
                                )}
                              >
                                Joining
                              </p>
                              <p
                                className={combine(
                                  "mt-0.5",
                                  get("text", "secondary"),
                                )}
                              >
                                {teacher.joining_date || "Not specified"}
                              </p>
                            </div>
                            <div>
                              <p
                                className={combine(
                                  "font-medium",
                                  get("text", "tertiary"),
                                )}
                              >
                                Class Status
                              </p>
                              <p
                                className={combine(
                                  "mt-0.5",
                                  get("text", "secondary"),
                                )}
                              >
                                {teacher.assigned_class &&
                                teacher.assigned_class !== "Not Assigned"
                                  ? `Class Teacher: ${teacher.assigned_class}`
                                  : "Not Assigned"}
                              </p>
                            </div>
                          </div>

                          {(!teacher.assigned_class ||
                            teacher.assigned_class === "Not Assigned") && (
                            <div className="mt-2">
                              <button
                                onClick={() => {
                                  const params = new URLSearchParams();
                                  params.set("tab", "class-teacher-allocation");
                                  params.set("redirectedFrom", "allteachers");
                                  params.set("openAssignClassModal", "1");
                                  params.set("teacherId", teacher.teacher_id);
                                  params.set("teacherName", teacher.name);
                                  router.push(
                                    `/admin/teachers/allocations?${params.toString()}`,
                                  );
                                }}
                                className={combine(
                                  "px-2.5 py-1.5 rounded-lg text-xs font-medium inline-flex items-center justify-center",
                                  theme === "dark"
                                    ? "bg-purple-900/30 text-purple-300 border border-purple-800"
                                    : "bg-purple-100 text-purple-700 border border-purple-200",
                                )}
                              >
                                Assign Class
                              </button>
                            </div>
                          )}

                          <div className="mt-3 flex flex-wrap items-center gap-1.5">
                            <button
                              onClick={() =>
                                router.push(
                                  `/admin/teachers/overview/${teacher.teacher_id}`,
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
                              onClick={() => {
                                const params = new URLSearchParams();
                                params.set("teacherName", teacher.name);
                                params.set("tab", "subject-allocations");
                                params.set("redirectedFrom", "allteachers");
                                router.push(
                                  `/admin/teachers/allocations?${params.toString()}`,
                                );
                              }}
                              className={combine(
                                "p-1.5 rounded-lg transition-all duration-200 hover:text-[var(--color-accent-info)]",
                                get("icon", "primary") + " text-xs",
                              )}
                              title="View Subject Allocations"
                            >
                              <FaBook className="text-xs" />
                            </button>
                            <button
                              onClick={() =>
                                router.push(
                                  `/admin/teachers/attendance?teacherId=${teacher.teacher_id}&tab=history&redirectedFrom=allteachers`,
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
                                const params = new URLSearchParams();
                                params.set("tab", "employeeReport");
                                params.set("employee_type", "teacher");
                                params.set("employee_id", teacher.teacher_id);
                                params.set("redirectedFrom", "allteachers");
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
                              onClick={() => startEdit(teacher)}
                              className={combine(
                                "p-1.5 rounded-lg transition-all duration-200 hover:text-[var(--color-accent-success)]",
                                get("icon", "primary") + " text-xs",
                              )}
                              title="Edit"
                            >
                              <FaEdit className="text-xs" />
                            </button>
                            <button
                              onClick={() => setShowDeleteConfirm(teacher.id)}
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
                      ))}
                    </div>
                  </div>
                ) : (
                  <>
                    <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700 relative text-xs sm:text-sm">
                      <thead className="sticky top-0 z-10 bg-[var(--color-bg-secondary)]">
                        <tr>
                          <th
                            className={combine(
                              "px-3 sm:px-4 py-2 sm:py-3 text-left text-xs sm:text-sm font-medium uppercase tracking-wider cursor-pointer",
                              get("text", "tertiary"),
                              "hover:bg-[var(--color-bg-hover)]",
                            )}
                            onClick={() => handleSort("teacher_id")}
                          >
                            <div className="flex items-center space-x-1 sm:space-x-2">
                              <FaIdCard className="text-xs" />
                              <span className="text-xs sm:text-sm">
                                Teacher ID
                              </span>
                              <div className="ml-1">
                                {sortField === "teacher_id" ? (
                                  sortDirection === "asc" ? (
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
                                  )
                                ) : (
                                  <FaSort
                                    className={
                                      get("icon", "secondary") + " text-xs"
                                    }
                                  />
                                )}
                              </div>
                            </div>
                          </th>
                          <th
                            className={combine(
                              "px-3 sm:px-4 py-2 sm:py-3 text-left text-xs sm:text-sm font-medium uppercase tracking-wider cursor-pointer",
                              get("text", "tertiary"),
                              "hover:bg-[var(--color-bg-hover)]",
                            )}
                            onClick={() => handleSort("name")}
                          >
                            <div className="flex items-center space-x-1 sm:space-x-2">
                              <FaUserTie className="text-xs" />
                              <span className="text-xs sm:text-sm">
                                Teacher Details
                              </span>
                              <div className="ml-1">
                                {sortField === "name" ? (
                                  sortDirection === "asc" ? (
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
                                  )
                                ) : (
                                  <FaSort
                                    className={
                                      get("icon", "secondary") + " text-xs"
                                    }
                                  />
                                )}
                              </div>
                            </div>
                          </th>
                          <th
                            className={combine(
                              "px-3 sm:px-4 py-2 sm:py-3 text-left text-xs sm:text-sm font-medium uppercase tracking-wider",
                              get("text", "tertiary"),
                            )}
                          >
                            <div className="flex items-center space-x-1 sm:space-x-2">
                              <FaPhone className="text-xs" />
                              <span className="text-xs sm:text-sm">
                                Contact
                              </span>
                            </div>
                          </th>
                          <th
                            className={combine(
                              "px-3 sm:px-4 py-2 sm:py-3 text-left text-xs sm:text-sm font-medium uppercase tracking-wider cursor-pointer",
                              get("text", "tertiary"),
                              "hover:bg-[var(--color-bg-hover)]",
                            )}
                            onClick={() => handleSort("department")}
                          >
                            <div className="flex items-center space-x-1 sm:space-x-2">
                              <FaBuilding className="text-xs" />
                              <span className="text-xs sm:text-sm">
                                Department
                              </span>
                              <div className="ml-1">
                                {sortField === "department" ? (
                                  sortDirection === "asc" ? (
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
                                  )
                                ) : (
                                  <FaSort
                                    className={
                                      get("icon", "secondary") + " text-xs"
                                    }
                                  />
                                )}
                              </div>
                            </div>
                          </th>
                          
                          <th
                            className={combine(
                              "px-3 sm:px-4 py-2 sm:py-3 text-left text-xs sm:text-sm font-medium uppercase tracking-wider",
                              get("text", "tertiary"),
                            )}
                          >
                            <div className="flex items-center space-x-1 sm:space-x-2">
                              <FaChartBar className="text-xs" />
                              <span className="text-xs sm:text-sm">Status</span>
                            </div>
                          </th>
                          <th
                            className={combine(
                              "px-3 sm:px-4 py-2 sm:py-3 text-left text-xs sm:text-sm font-medium uppercase tracking-wider",
                              get("text", "tertiary"),
                            )}
                          >
                            <div className="flex items-center space-x-1 sm:space-x-2">
                              <FaCog className="text-xs" />
                              <span className="text-xs sm:text-sm">
                                Actions
                              </span>
                            </div>
                          </th>
                        </tr>
                      </thead>
                      <tbody
                        className={combine("divide-y", getTableRowClass())}
                      >
                        {currentTeachers.map((teacher) => (
                          <tr
                            key={teacher.id}
                            className="transition-colors duration-150 hover:bg-[var(--color-bg-hover)]"
                          >
                            <td className="px-3 sm:px-4 py-2 sm:py-3">
                              <div
                                className={combine(
                                  "font-medium text-sm",
                                  get("accent", "primary"),
                                )}
                              >
                                {teacher.teacher_id}
                              </div>
                            </td>
                            <td className="px-3 sm:px-4 py-2 sm:py-3">
                              <div className="flex items-center">
                                <div
                                  className={combine(
                                    "h-8 w-8 rounded-full flex items-center justify-center mr-2",
                                    theme === "dark"
                                      ? "bg-purple-900/30"
                                      : "bg-purple-100",
                                  )}
                                >
                                  <FaUserTie
                                    className={combine(
                                      "text-xs",
                                      theme === "dark"
                                        ? "text-purple-400"
                                        : "text-purple-600",
                                    )}
                                  />
                                </div>
                                <div>
                                  <div className="font-semibold text-sm">
                                    {teacher.name}
                                  </div>
                                  <div
                                    className={combine(
                                      "text-xs mt-0.5 flex items-center space-x-1",
                                      get("text", "tertiary"),
                                    )}
                                  >
                                    <FaGraduationCap className="text-xs" />
                                    <span className="text-xs">
                                      {teacher.qualification}
                                    </span>
                                  </div>
                                </div>
                              </div>
                            </td>
                            <td className="px-3 sm:px-4 py-2 sm:py-3">
                              <div className="space-y-1">
                                <div
                                  className={combine(
                                    "flex items-center text-sm",
                                    get("text", "primary"),
                                  )}
                                >
                                  <FaEnvelope
                                    className={combine(
                                      "mr-1 sm:mr-2 text-xs",
                                      get("icon", "secondary"),
                                    )}
                                  />
                                  <span className="truncate max-w-[100px] sm:max-w-[120px] text-sm">
                                    {teacher.email}
                                  </span>
                                </div>
                                <div
                                  className={combine(
                                    "flex items-center text-sm",
                                    get("text", "primary"),
                                  )}
                                >
                                  <FaPhone
                                    className={combine(
                                      "mr-1 sm:mr-2 text-xs",
                                      get("icon", "secondary"),
                                    )}
                                  />
                                  <span className="text-sm">{teacher.phone}</span>
                                </div>
                              </div>
                            </td>
                            <td className="px-3 sm:px-4 py-2 sm:py-3">
                              <span className={getStatusBadgeClass("purple")}>
                                {teacher.department}
                              </span>
                            </td>
                            
                            <td className="px-3 sm:px-4 py-2 sm:py-3">
                              {teacher.assigned_class &&
                              teacher.assigned_class !== "Not Assigned" ? (
                                <div className="space-y-1.5">
                                  <span
                                    className={combine(
                                      "inline-flex items-center px-2 py-1 text-xs rounded-full font-medium border w-fit",
                                      theme === "dark"
                                        ? "bg-green-900/30 text-green-300 border-green-800"
                                        : "bg-green-100 text-green-700 border-green-200",
                                    )}
                                  >
                                    <FaChalkboardTeacher className="mr-1 text-xs" />
                                    Class Teacher: {teacher.assigned_class}
                                  </span>
                                </div>
                              ) : (
                                <div className="flex flex-col gap-2">
                                  <button
                                    onClick={() => {
                                      const params = new URLSearchParams();
                                      params.set(
                                        "tab",
                                        "class-teacher-allocation",
                                      );
                                      params.set(
                                        "redirectedFrom",
                                        "allteachers",
                                      );
                                      params.set("openAssignClassModal", "1");
                                      params.set(
                                        "teacherId",
                                        teacher.teacher_id,
                                      );
                                      params.set("teacherName", teacher.name);
                                      router.push(
                                        `/admin/teachers/allocations?${params.toString()}`,
                                      );
                                    }}
                                    className={combine(
                                      "px-2.5 py-1.5 rounded-lg text-xs font-medium inline-flex items-center justify-center w-fit",
                                      theme === "dark"
                                        ? "bg-purple-900/30 text-purple-300 border border-purple-800"
                                        : "bg-purple-100 text-purple-700 border border-purple-200",
                                    )}
                                  >
                                    Assign Class
                                  </button>
                                </div>
                              )}
                            </td>
                            <td className="px-3 sm:px-4 py-2 sm:py-3">
                              <div className="flex space-x-1 sm:space-x-1.5">
                                <button
                                  onClick={() =>
                                    router.push(
                                      `/admin/teachers/overview/${teacher.teacher_id}`,
                                    )
                                  }
                                  className={combine(
                                    "p-1 sm:p-1.5 rounded-xl transition-all duration-200 hover:text-[var(--color-accent-primary)]",
                                    get("icon", "primary") + " text-sm",
                                  )}
                                  title="View Profile"
                                >
                                  <FaEye className="text-sm" />
                                </button>

                                {/* New Allocation Button */}
                                <button
                                  onClick={() => {
                                    const params = new URLSearchParams();
                                    params.set("teacherName", teacher.name);
                                    params.set("tab", "subject-allocations");
                                    params.set("redirectedFrom", "allteachers");
                                    router.push(
                                      `/admin/teachers/allocations?${params.toString()}`,
                                    );
                                  }}
                                  className={combine(
                                    "p-1 sm:p-1.5 rounded-xl transition-all duration-200 hover:text-[var(--color-accent-info)]",
                                    get("icon", "primary") + " text-sm",
                                  )}
                                  title="View Subject Allocations"
                                >
                                  <FaBook className="text-sm" />
                                </button>

                                <button
                                  onClick={() =>
                                    router.push(
                                      `/admin/teachers/attendance?teacherId=${teacher.teacher_id}&tab=history&redirectedFrom=allteachers`,
                                    )
                                  }
                                  className={combine(
                                    "p-1 sm:p-1.5 rounded-xl transition-all duration-200 hover:text-[var(--color-accent-info)]",
                                    get("icon", "primary") + " text-sm",
                                  )}
                                  title="View Attendance History"
                                >
                                  <FaHistory className="text-sm" />
                                </button>

                                <button
                                  onClick={() => {
                                    const params = new URLSearchParams();
                                    params.set("tab", "employeeReport");
                                    params.set("employee_type", "teacher");
                                    params.set(
                                      "employee_id",
                                      teacher.teacher_id,
                                    );
                                    params.set("redirectedFrom", "allteachers");
                                    router.push(
                                      `/admin/salary?${params.toString()}`,
                                    );
                                  }}
                                  className={combine(
                                    "p-1 sm:p-1.5 rounded-xl transition-all duration-200 hover:text-[var(--color-accent-success)]",
                                    get("icon", "primary") + " text-sm",
                                  )}
                                  title="View Salary Report"
                                >
                                  <FaMoneyBillWave className="text-sm" />
                                </button>

                                <button
                                  onClick={() => startEdit(teacher)}
                                  className={combine(
                                    "p-1 sm:p-1.5 rounded-xl transition-all duration-200 hover:text-[var(--color-accent-success)]",
                                    get("icon", "primary") + " text-sm",
                                  )}
                                  title="Edit"
                                >
                                  <FaEdit className="text-sm" />
                                </button>

                                <button
                                  onClick={() =>
                                    setShowDeleteConfirm(teacher.id)
                                  }
                                  className={combine(
                                    "p-1 sm:p-1.5 rounded-xl transition-all duration-200 hover:text-[var(--color-accent-error)]",
                                    get("icon", "primary") + " text-sm",
                                  )}
                                  title="Delete"
                                >
                                  <FaTrash className="text-sm" />
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </>
                )}
              </div>

              {/* PAGINATION - Moved outside the scrollable area */}
              {totalPages > 1 && (
                <div
                  className={combine(
                    "px-3 sm:px-4 py-3 border-t",
                    get("border", "primary"),
                  )}
                >
                  <div className="flex flex-col sm:flex-row justify-between items-center gap-3">
                    <p className={combine("text-xs", get("text", "tertiary"))}>
                      Page {currentPage} of {totalPages}
                    </p>
                    <div className="flex items-center space-x-1 sm:space-x-1.5">
                      <button
                        onClick={() =>
                          setCurrentPage((prev) => Math.max(prev - 1, 1))
                        }
                        disabled={currentPage === 1}
                        className={combine(
                          "p-1 sm:p-1.5 rounded-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed hover:scale-[1.02] active:scale-[0.98] text-sm",
                          getSecondaryButtonClass(),
                        )}
                      >
                        <FaChevronLeft className="text-xs" />
                      </button>

                      <div className="flex space-x-0.5 sm:space-x-1">
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
                                  "px-2 sm:px-3 py-1 sm:py-1.5 rounded-xl transition-all font-medium hover:scale-[1.02] active:scale-[0.98] text-xs",
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
                          "p-1 sm:p-1.5 rounded-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed hover:scale-[1.02] active:scale-[0.98] text-sm",
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
          </>
        )}

        {/* ADD/EDIT FORM */}
        {(mode === "add" || mode === "edit") && (
          <div className="animate-fade-in max-w-4xl mx-auto">
            <div className={getCardGradientClass()}>
              {/* Form Header */}
              <div className="mb-4 sm:mb-6">
                <div className="flex items-center justify-between mb-3 sm:mb-4">
                  <div className="flex items-center space-x-2 sm:space-x-4">
                    <div
                      className={combine(
                        "p-2 sm:p-3 rounded-lg sm:rounded-xl",
                        theme === "dark" ? "bg-purple-900/30" : "bg-purple-100",
                      )}
                    >
                      <FaUserPlus
                        className={combine(
                          "text-base sm:text-lg",
                          theme === "dark"
                            ? "text-purple-400"
                            : "text-purple-600",
                        )}
                      />
                    </div>
                    <div>
                      <h2
                        className={combine(
                          "text-base sm:text-lg font-bold",
                          get("text", "primary"),
                        )}
                      >
                        {mode === "edit" ? "Edit Teacher" : "Add New Teacher"}
                      </h2>
                      <p
                        className={combine(
                          "text-xs sm:text-sm mt-0.5",
                          get("text", "secondary"),
                        )}
                      >
                        {mode === "edit"
                          ? "Update teacher information"
                          : "Fill in the details to register a new teacher"}
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() => {
                      setFormErrors({});
                      setMode("list");
                    }}
                    className={combine(
                      "p-1.5 sm:p-2 rounded-lg sm:rounded-xl transition-all hover:bg-[var(--color-bg-hover)]",
                      get("icon", "secondary") + " text-sm",
                    )}
                  >
                    <FaTimes className="text-sm" />
                  </button>
                </div>
                <div
                  className={combine(
                    "p-2 sm:p-3 rounded-lg sm:rounded-xl text-xs",
                    theme === "dark" ? "bg-purple-900/20" : "bg-purple-50",
                  )}
                >
                  <p
                    className={combine(
                      "flex items-center space-x-2",
                      theme === "dark" ? "text-purple-300" : "text-purple-700",
                    )}
                  >
                    <FaInfoCircle className="text-xs" />
                    <span className="text-xs">
                      Fields marked with <span className="text-red-500">*</span>{" "}
                      are required
                    </span>
                  </p>
                </div>
              </div>

              {/* Form Content */}
              <form
                onSubmit={handleSubmit}
                noValidate
                className="space-y-4 space-y-6"
              >
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
                  {/* Basic Information */}
                  <div className="col-span-2">
                    <h3
                      className={combine(
                        "text-base sm:text-lg font-semibold mb-3 sm:mb-4",
                        get("text", "primary"),
                      )}
                    >
                      Basic Information
                    </h3>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                      <div>
                        <label
                          className={combine(
                            "block text-xs sm:text-sm font-medium mb-1.5 sm:mb-2",
                            get("text", "primary"),
                          )}
                        >
                          Teacher ID <span className="text-red-500">*</span>
                        </label>
                        <input
                          type="text"
                          name="teacher_id"
                          value={formData.teacher_id}
                          onChange={handleChange}
                          disabled={mode === "edit"}
                          className={combine(
                            getInputClass(),
                            "disabled:opacity-50",
                          )}
                          placeholder="TCH001"
                        />
                        {formErrors.teacher_id && (
                          <p className="mt-1 text-xs text-red-500">
                            {formErrors.teacher_id}
                          </p>
                        )}
                      </div>
                      <div>
                        <label
                          className={combine(
                            "block text-xs sm:text-sm font-medium mb-1.5 sm:mb-2",
                            get("text", "primary"),
                          )}
                        >
                          Teacher Name <span className="text-red-500">*</span>
                        </label>
                        <input
                          type="text"
                          name="name"
                          value={formData.name}
                          onChange={handleChange}
                          className={getInputClass()}
                          placeholder="John Smith"
                        />
                        {formErrors.name && (
                          <p className="mt-1 text-xs text-red-500">
                            {formErrors.name}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Contact Information */}
                  <div className="col-span-2">
                    <h3
                      className={combine(
                        "text-base sm:text-lg font-semibold mb-3 sm:mb-4",
                        get("text", "primary"),
                      )}
                    >
                      Contact Information
                    </h3>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                      <div>
                        <label
                          className={combine(
                            "block text-xs sm:text-sm font-medium mb-1.5 sm:mb-2",
                            get("text", "primary"),
                          )}
                        >
                          Email Address <span className="text-red-500">*</span>
                        </label>
                        <input
                          type="email"
                          name="email"
                          value={formData.email}
                          onChange={handleChange}
                          className={getInputClass()}
                          placeholder="teacher@school.edu"
                        />
                        {formErrors.email && (
                          <p className="mt-1 text-xs text-red-500">
                            {formErrors.email}
                          </p>
                        )}
                      </div>
                      <div>
                        <label
                          className={combine(
                            "block text-xs sm:text-sm font-medium mb-1.5 sm:mb-2",
                            get("text", "primary"),
                          )}
                        >
                          Phone Number <span className="text-red-500">*</span>
                        </label>
                        <input
                          type="tel"
                          name="phone"
                          value={formData.phone}
                          onChange={handleChange}
                          inputMode="tel"
                          pattern="^\\+?[0-9\\s-]{10,20}$"
                          className={getInputClass()}
                          placeholder="+91 9876543210"
                        />
                        {formErrors.phone && (
                          <p className="mt-1 text-xs text-red-500">
                            {formErrors.phone}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Professional Information */}
                  <div className="col-span-2">
                    <h3
                      className={combine(
                        "text-base sm:text-lg font-semibold mb-3 sm:mb-4",
                        get("text", "primary"),
                      )}
                    >
                      Professional Information
                    </h3>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                      <div>
                        <label
                          className={combine(
                            "block text-xs sm:text-sm font-medium mb-1.5 sm:mb-2",
                            get("text", "primary"),
                          )}
                        >
                          Qualification <span className="text-red-500">*</span>
                        </label>
                        <input
                          type="text"
                          name="qualification"
                          value={formData.qualification}
                          onChange={handleChange}
                          className={getInputClass()}
                          placeholder="M.Sc, B.Ed"
                        />
                        {formErrors.qualification && (
                          <p className="mt-1 text-xs text-red-500">
                            {formErrors.qualification}
                          </p>
                        )}
                      </div>
                      <div>
                        <label
                          className={combine(
                            "block text-xs sm:text-sm font-medium mb-1.5 sm:mb-2",
                            get("text", "primary"),
                          )}
                        >
                          Department <span className="text-red-500">*</span>
                        </label>
                        <input
                          type="text"
                          name="department"
                          value={formData.department}
                          onChange={handleChange}
                          className={getInputClass()}
                          placeholder="Mathematics"
                        />
                        {formErrors.department && (
                          <p className="mt-1 text-xs text-red-500">
                            {formErrors.department}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Additional Details */}
                  <div className="col-span-2">
                    <h3
                      className={combine(
                        "text-base sm:text-lg font-semibold mb-3 sm:mb-4",
                        get("text", "primary"),
                      )}
                    >
                      Additional Details
                    </h3>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                      <div>
                        <label
                          className={combine(
                            "block text-xs sm:text-sm font-medium mb-1.5 sm:mb-2",
                            get("text", "primary"),
                          )}
                        >
                          Date of Birth <span className="text-red-500">*</span>
                        </label>
                        <input
                          type="date"
                          name="date_of_birth"
                          value={formData.date_of_birth}
                          onChange={handleChange}
                          className={getInputClass()}
                        />
                        {formErrors.date_of_birth && (
                          <p className="mt-1 text-xs text-red-500">
                            {formErrors.date_of_birth}
                          </p>
                        )}
                      </div>
                      <div>
                        <label
                          className={combine(
                            "block text-xs sm:text-sm font-medium mb-1.5 sm:mb-2",
                            get("text", "primary"),
                          )}
                        >
                          Joining Date (optional)
                        </label>
                        <input
                          type="date"
                          name="joining_date"
                          value={formData.joining_date}
                          onChange={handleChange}
                          className={getInputClass()}
                        />
                      </div>
                      <div className="col-span-2">
                        <label
                          className={combine(
                            "block text-xs sm:text-sm font-medium mb-1.5 sm:mb-2",
                            get("text", "primary"),
                          )}
                        >
                          Address <span className="text-red-500">*</span>
                        </label>
                        <textarea
                          name="address"
                          value={formData.address}
                          onChange={handleChange}
                          rows={3}
                          className={combine(getInputClass(), "resize-none")}
                          placeholder="Full address"
                        />
                        {formErrors.address && (
                          <p className="mt-1 text-xs text-red-500">
                            {formErrors.address}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Class Teacher Assignment (Optional) */}
                  <div className="col-span-2">
                    <h3
                      className={combine(
                        "text-base sm:text-lg font-semibold mb-3 sm:mb-4",
                        get("text", "primary"),
                      )}
                    >
                      Bank Details (Optional)
                    </h3>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                      <div>
                        <label
                          className={combine(
                            "block text-xs sm:text-sm font-medium mb-1.5 sm:mb-2",
                            get("text", "primary"),
                          )}
                        >
                          Account Holder Name (optional)
                        </label>
                        <input
                          type="text"
                          name="account_holder_name"
                          value={formData.account_holder_name}
                          onChange={handleChange}
                          className={getInputClass()}
                          placeholder="Account holder name"
                        />
                      </div>
                      <div>
                        <label
                          className={combine(
                            "block text-xs sm:text-sm font-medium mb-1.5 sm:mb-2",
                            get("text", "primary"),
                          )}
                        >
                          Bank Name (optional)
                        </label>
                        <input
                          type="text"
                          name="bank_name"
                          value={formData.bank_name}
                          onChange={handleChange}
                          className={getInputClass()}
                          placeholder="Bank name"
                        />
                      </div>
                      <div>
                        <label
                          className={combine(
                            "block text-xs sm:text-sm font-medium mb-1.5 sm:mb-2",
                            get("text", "primary"),
                          )}
                        >
                          Bank Account Number (optional)
                        </label>
                        <input
                          type="text"
                          name="bank_account_number"
                          value={formData.bank_account_number}
                          onChange={handleChange}
                          className={getInputClass()}
                          placeholder="Account number"
                        />
                      </div>
                      <div>
                        <label
                          className={combine(
                            "block text-xs sm:text-sm font-medium mb-1.5 sm:mb-2",
                            get("text", "primary"),
                          )}
                        >
                          IFSC Code (optional)
                        </label>
                        <input
                          type="text"
                          name="ifsc_code"
                          value={formData.ifsc_code}
                          onChange={handleChange}
                          className={getInputClass()}
                          placeholder="IFSC code"
                        />
                      </div>
                      <div className="col-span-2">
                        <label
                          className={combine(
                            "block text-xs sm:text-sm font-medium mb-1.5 sm:mb-2",
                            get("text", "primary"),
                          )}
                        >
                          UPI ID (optional)
                        </label>
                        <input
                          type="text"
                          name="upi_id"
                          value={formData.upi_id}
                          onChange={handleChange}
                          className={getInputClass()}
                          placeholder="example@upi"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Class Teacher Assignment (Optional) */}
                  <div className="col-span-2">
                    <h3
                      className={combine(
                        "text-base sm:text-lg font-semibold mb-3 sm:mb-4",
                        get("text", "primary"),
                      )}
                    >
                      Class Teacher Assignment{" "}
                      {mode === "edit" &&
                        "(Optional - Leave empty to keep current)"}
                    </h3>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                      <div>
                        <label
                          className={combine(
                            "block text-xs sm:text-sm font-medium mb-1.5 sm:mb-2",
                            get("text", "primary"),
                          )}
                        >
                          Class Name (optional)
                        </label>
                        <input
                          type="text"
                          name="class_name"
                          value={formData.class_name}
                          onChange={handleChange}
                          className={getInputClass()}
                          placeholder="e.g., 10"
                        />
                        {formErrors.class_name && (
                          <p className="mt-1 text-xs text-red-500">
                            {formErrors.class_name}
                          </p>
                        )}
                      </div>
                      <div>
                        <label
                          className={combine(
                            "block text-xs sm:text-sm font-medium mb-1.5 sm:mb-2",
                            get("text", "primary"),
                          )}
                        >
                          Section (optional)
                        </label>
                        <input
                          type="text"
                          name="section"
                          value={formData.section}
                          onChange={handleChange}
                          className={getInputClass()}
                          placeholder="e.g., A"
                        />
                        {formErrors.section && (
                          <p className="mt-1 text-xs text-red-500">
                            {formErrors.section}
                          </p>
                        )}
                      </div>
                    </div>
                    <p
                      className={combine(
                        "text-xs mt-1",
                        get("text", "tertiary"),
                      )}
                    >
                      {mode === "edit"
                        ? "Leave both fields empty to keep current class teacher assignment. Fill both to change assignment."
                        : "Fill both fields to assign as class teacher immediately."}
                    </p>
                  </div>
                </div>

                {/* Form Actions */}
                <div
                  className={combine(
                    "flex space-x-2 space-x-3 pt-4 sm:pt-6 border-t",
                    get("border", "primary"),
                  )}
                >
                  <button
                    type="button"
                    onClick={() => {
                      setFormErrors({});
                      setMode("list");
                    }}
                    className={combine(
                      getSecondaryButtonClass(),
                      "text-xs sm:text-sm flex-1",
                    )}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={loading}
                    className={combine(
                      getPrimaryButtonClass(),
                      "flex items-center justify-center space-x-1 sm:space-x-2 text-xs sm:text-sm disabled:opacity-50 disabled:cursor-not-allowed flex-1",
                    )}
                  >
                    {loading ? (
                      <>
                        <div
                          className={combine(
                            "animate-spin rounded-full h-3 w-3 h-4 w-4 border-b-2",
                            theme === "dark" ? "border-white" : "border-white",
                          )}
                        ></div>
                        <span className="text-xs sm:text-sm">
                          {mode === "edit" ? "Updating..." : "Saving..."}
                        </span>
                      </>
                    ) : (
                      <>
                        <FaSave className="text-xs sm:text-sm" />
                        <span className="text-xs sm:text-sm">
                          {mode === "edit" ? "Update Teacher" : "Save Teacher"}
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
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-3 sm:p-4 z-50 animate-fade-in backdrop-blur-sm">
            <div
              className={combine(
                getCardGradientClass("red"),
                "max-w-md w-full shadow-2xl",
              )}
            >
              <div className="text-center">
                <div
                  className={combine(
                    "mx-auto flex items-center justify-center h-10 sm:h-12 w-10 sm:w-12 rounded-full mb-2 mb-3",
                    theme === "dark" ? "bg-red-900/30" : "bg-red-100",
                  )}
                >
                  <FaTrash
                    className={combine(
                      "h-4 sm:h-5 w-4 sm:w-5",
                      theme === "dark" ? "text-red-400" : "text-red-600",
                    )}
                  />
                </div>
                <h3
                  className={combine(
                    "text-base sm:text-lg font-bold mb-1 sm:mb-1.5",
                    get("text", "primary"),
                  )}
                >
                  Delete Teacher
                </h3>
                <p
                  className={combine(
                    "text-xs sm:text-sm mb-3 sm:mb-4",
                    get("text", "secondary"),
                  )}
                >
                  {`Are you sure you want to delete ${
                    teachers.find((t) => t.id === showDeleteConfirm)?.name ||
                    "this teacher"
                  }? This action cannot be undone.`}
                </p>
                <div className="flex space-x-2">
                  <button
                    onClick={() => setShowDeleteConfirm(null)}
                    className={combine(
                      getSecondaryButtonClass(),
                      "text-xs sm:text-sm flex-1",
                    )}
                  >
                    Cancel
                  </button>
                  <button
                    onClick={() => deleteTeacher(showDeleteConfirm)}
                    className={combine(
                      getPrimaryButtonClass(),
                      "text-xs sm:text-sm flex-1",
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
