// src/app/admin/students/allstudents/page.tsx

"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useSearchParams } from "next/navigation";
import {
  FaUserGraduate,
  FaUserPlus,
  FaTrash,
  FaEye,
  FaEdit,
  FaArrowLeft,
  FaSave,
  FaSearch,
  FaFilter,
  FaDownload,
  FaPhone,
  FaEnvelope,
  FaCalendar,
  FaUser,
  FaChevronLeft,
  FaChevronRight,
  FaMapMarkerAlt,
  FaSort,
  FaSortUp,
  FaSortDown,
  FaUsers,
  FaChartBar,
  FaSchool,
  FaIdCard,
  FaBirthdayCake,
  FaVenusMars,
  FaSync,
  FaInfoCircle,
  FaCheckCircle,
  FaTimesCircle,
  FaClipboardList,
  FaFileExport,
  FaExclamationTriangle,
  FaBars,
  FaHistory,
} from "react-icons/fa";
import { IoIosSchool, IoMdStats } from "react-icons/io";
import {
  MdClass,
  MdOutlineFamilyRestroom,
  MdOutlineDashboard,
} from "react-icons/md";
import {
  FiCalendar,
  FiFilter,
  FiDownload,
  FiChevronRight,
  FiUsers,
  FiCheckCircle,
  FiXCircle,
  FiClock,
} from "react-icons/fi";
import { useTheme } from "@/contexts/ThemeContext";
import { useThemeClasses } from "@/hooks/useThemeClasses";
import { toastSuccess, toastError, toastInfo, toastWarning } from "@/lib/toast";
import { adminApi } from "@/lib/api";
import { SchoolScopeSelector, useSchoolScope } from "@/components/admin/SchoolScopeSelector";

interface Student {
  student_id: string;
  student_name: string;
  student_email: string | null;
  father_name: string;
  mother_name: string;
  gender: string;
  accommodation?: string | null;
  date_of_birth: string | null;
  father_phone: string | null;
  mother_phone: string | null;
  class_name: string | null;
  section: string | null;
  address: string | null;
  date_of_admission?: string;
  standard?: string;
}

interface PaginatedStudentsResponse {
  count: number;
  next: string | null;
  previous: string | null;
  results: Student[];
}

interface ClassStats {
  class: string;
  count: number;
  sections: string[];
}

interface Section {
  id: number;
  name: string;
  standard: number;
  standard_name: string;
}

interface Standard {
  id: number;
  name: string;
  description: string;
  sections: Section[];
}

interface AcademicYearOption {
  id: number;
  name: string;
  is_current: boolean;
}

interface StudentUploadResult {
  message: string;
  summary: {
    profiles_created: number;
    profiles_updated: number;
    enrolled_in_year: number;
    teachers: number;
    staff: number;
  };
  errors: string[];
}

interface ImageUploadResult {
  message: string;
  success_count: number;
  failed_count: number;
  errors: string[];
}

const emptyStudentForm = {
  student_id: "",
  student_name: "",
  student_email: "",
  father_name: "",
  mother_name: "",
  father_phone: "",
  mother_phone: "",
  date_of_birth: "",
  date_of_admission: "",
  gender: "Male",
  accommodation: "",
  class_name: "",
  section: "",
  address: "",
};

const getApiErrorMessage = (error: any, fallback: string) => {
  const data = error?.response?.data;
  if (typeof data === "string") return data;
  if (data?.detail) return data.detail;
  if (data?.error) return data.error;
  if (data?.message) return data.message;
  if (data && typeof data === "object") {
    const firstValue = Object.values(data)[0];
    if (Array.isArray(firstValue)) return firstValue.join(", ");
    if (typeof firstValue === "string") return firstValue;
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

const normalizeSection = (section: any): Section => ({
  id: Number(section?.id),
  name: String(section?.name ?? section?.section_name ?? ""),
  standard: Number(section?.standard ?? section?.standard_id ?? 0),
  standard_name: String(
    section?.standard_name ?? section?.class_name ?? section?.standard?.name ?? "",
  ),
});

const normalizeStandard = (standard: any): Standard => ({
  id: Number(standard?.id),
  name: String(standard?.name ?? standard?.class_name ?? ""),
  description: String(standard?.description ?? ""),
  sections: unwrapArray<any>(standard?.sections).map(normalizeSection),
});

const normalizeStudent = (student: any): Student => ({
  student_id: String(student?.student_id ?? ""),
  student_name: String(student?.student_name ?? ""),
  student_email: student?.student_email ?? null,
  father_name: String(student?.father_name ?? ""),
  mother_name: String(student?.mother_name ?? ""),
  gender: String(student?.gender ?? ""),
  accommodation: student?.accommodation ?? null,
  date_of_birth: student?.date_of_birth ?? null,
  father_phone: student?.father_phone ?? null,
  mother_phone: student?.mother_phone ?? null,
  class_name: student?.class_name ?? null,
  section: student?.section === "N/A" ? null : student?.section ?? null,
  address: student?.address ?? null,
  date_of_admission: student?.date_of_admission ?? "",
  standard: student?.standard,
});

const normalizeStudentUploadResult = (payload: any): StudentUploadResult => ({
  message: String(payload?.message ?? "Bulk upload processed."),
  summary: {
    profiles_created: Number(payload?.summary?.profiles_created ?? 0),
    profiles_updated: Number(payload?.summary?.profiles_updated ?? 0),
    enrolled_in_year: Number(payload?.summary?.enrolled_in_year ?? 0),
    teachers: Number(payload?.summary?.teachers ?? 0),
    staff: Number(payload?.summary?.staff ?? 0),
  },
  errors: Array.isArray(payload?.errors) ? payload.errors.map(String) : [],
});

const normalizeImageUploadResult = (payload: any): ImageUploadResult => ({
  message: String(payload?.message ?? "Bulk image upload processed."),
  success_count: Number(payload?.success_count ?? 0),
  failed_count: Number(payload?.failed_count ?? 0),
  errors: Array.isArray(payload?.errors) ? payload.errors.map(String) : [],
});

export default function AllStudentsPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { theme } = useTheme();
  const { get, combine } = useThemeClasses();
  const [mode, setMode] = useState<"list" | "add" | "edit">("list");
  const [students, setStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterGender, setFilterGender] = useState("all");
  const [filterClass, setFilterClass] = useState("all");
  const [filterAcademicYear, setFilterAcademicYear] = useState<string>("");
  const [filterAssignmentStatus, setFilterAssignmentStatus] = useState<
    "all" | "assigned" | "unassigned"
  >("all");
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize] = useState(10);
  const [totalStudentsCount, setTotalStudentsCount] = useState(0);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<string | null>(
    null,
  );
  const [sortConfig, setSortConfig] = useState<{
    key: string;
    direction: "asc" | "desc";
  }>({
    key: "student_name",
    direction: "asc",
  });
  const [classStats, setClassStats] = useState<ClassStats[]>([]);
  const [statsLoading, setStatsLoading] = useState(true);
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);
  const [showStudentModal, setShowStudentModal] = useState(false);
  const [bulkUploadMode, setBulkUploadMode] = useState(false);
  const [csvFile, setCsvFile] = useState<File | null>(null);
  const [imagesZipFile, setImagesZipFile] = useState<File | null>(null);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadingStudents, setUploadingStudents] = useState(false);
  const [uploadingImages, setUploadingImages] = useState(false);
  const [studentUploadResult, setStudentUploadResult] =
    useState<StudentUploadResult | null>(null);
  const [imageUploadResult, setImageUploadResult] =
    useState<ImageUploadResult | null>(null);
  const [standards, setStandards] = useState<Standard[]>([]);
  const [academicYears, setAcademicYears] = useState<AcademicYearOption[]>([]);
  const [sectionsLoading, setSectionsLoading] = useState(false);
  const [academicYearsLoading, setAcademicYearsLoading] = useState(false);
  const [classCarouselPage, setClassCarouselPage] = useState(0);
  const [cardsPerPage, setCardsPerPage] = useState(6);
  const [genderStats, setGenderStats] = useState({ male: 0, female: 0 });
  const [isMobile, setIsMobile] = useState(false);

  const [filterSection, setFilterSection] = useState("all");
  const [availableSections, setAvailableSections] = useState<string[]>([]);
  const schoolScope = useSchoolScope({ storageKey: "allstudents_school_scope" });

  const [formData, setFormData] = useState(emptyStudentForm);
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});

  // Responsive layout intentionally disabled for this page.

  // Theme-aware CSS classes using the theme system
  const headerClasses = combine(
    get("bg", "primary"),
    "border-b",
    get("border", "primary"),
    "px-4 sm:px-6 py-4",
    "transition-all duration-150",
  );

  const getBgClass = () =>
    combine(get("bg", "primary"), "transition-colors duration-200");

  const getCardGradientClass = (color: string = "blue") => {
    const baseClasses = combine(
      "rounded-xl sm:rounded-2xl p-4 sm:p-6 border shadow-lg transition-all duration-300 group hover:shadow-xl",
      get("border", "primary"),
    );

    if (color === "blue") {
      return combine(
        baseClasses,
        "bg-gradient-to-br",
        theme === "dark"
          ? "from-gray-800 to-blue-900/10"
          : "from-white to-blue-50",
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
    if (color === "amber") {
      return combine(
        baseClasses,
        "bg-gradient-to-br",
        theme === "dark"
          ? "from-gray-800 to-amber-900/10"
          : "from-white to-amber-50",
      );
    }
    if (color === "pink") {
      return combine(
        baseClasses,
        "bg-gradient-to-br",
        theme === "dark"
          ? "from-gray-800 to-pink-900/10"
          : "from-white to-pink-50",
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
    return combine(baseClasses, "bg-gradient-to-br", get("bg", "card"));
  };

  const getStatsCardClass = (
    color: "blue" | "emerald" | "amber" | "pink" | "indigo" = "blue",
  ) => {
    return getCardGradientClass(color);
  };

  const getInputClass = () =>
    combine(
      "px-3 sm:px-4 py-2.5 sm:py-3.5 rounded-lg sm:rounded-xl border focus:ring-2 focus:ring-blue-500 outline-none transition-all w-full",
      "text-xs sm:text-sm",
      theme === "dark"
        ? "bg-gray-900/70 border-gray-600 text-gray-100 hover:border-gray-500 focus:border-blue-400"
        : "bg-white border-gray-300 text-gray-900 hover:border-gray-400 focus:border-blue-500",
      "placeholder:text-xs sm:placeholder:text-sm placeholder:text-[var(--color-text-tertiary)]",
      "disabled:opacity-50 disabled:cursor-not-allowed",
    );

  const getPrimaryButtonClass = () =>
    combine(
      "px-4 sm:px-6 py-2.5 sm:py-3.5 rounded-lg sm:rounded-xl transition-all duration-200 font-medium",
      "text-white shadow-lg hover:shadow-xl hover:scale-[1.02] active:scale-[0.98]",
      "text-xs sm:text-sm",
      theme === "dark"
        ? "bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800"
        : "bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700",
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
      blue: {
        bg:
          theme === "dark"
            ? "from-blue-900/30 to-blue-800/30"
            : "from-blue-100 to-blue-200",
        text: theme === "dark" ? "text-blue-300" : "text-blue-700",
        border: theme === "dark" ? "border-blue-800" : "border-blue-200",
      },
      emerald: {
        bg:
          theme === "dark"
            ? "from-emerald-900/30 to-emerald-800/30"
            : "from-emerald-100 to-emerald-200",
        text: theme === "dark" ? "text-emerald-300" : "text-emerald-700",
        border: theme === "dark" ? "border-emerald-800" : "border-emerald-200",
      },
      pink: {
        bg:
          theme === "dark"
            ? "from-pink-900/30 to-pink-800/30"
            : "from-pink-100 to-pink-200",
        text: theme === "dark" ? "text-pink-300" : "text-pink-700",
        border: theme === "dark" ? "border-pink-800" : "border-pink-200",
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
    };

    const colors = colorMap[type] || colorMap.blue;
    return combine(
      "px-2 sm:px-3 py-1 sm:py-1.5 text-xs sm:text-sm font-medium rounded-full bg-gradient-to-r",
      colors.bg,
      colors.text,
      "border",
      colors.border,
    );
  };

  const getTableHeaderClass = () =>
    combine(get("bg", "secondary"), "divide-y", get("border", "primary"));

  const getTableRowClass = () =>
    combine(get("bg", "card"), "divide-y", get("border", "primary"));

  const fetchClassesAndSections = async () => {
    setSectionsLoading(true);
    try {
      const res = await adminApi.academics.standards(schoolScope.scopeParams);
      const rows = unwrapArray<any>(res?.data, ["standards"]).map(normalizeStandard);
      setStandards(rows);
    } catch (error: any) {
      console.error("Error fetching classes and sections:", error);
      setStandards([]);
      toastError(getApiErrorMessage(error, "Failed to load classes and sections"));
    } finally {
      setSectionsLoading(false);
    }
  };

  const fetchAcademicYears = async () => {
    setAcademicYearsLoading(true);
    try {
      const res = await adminApi.school.academicYears(schoolScope.scopeParams);
      const rows = unwrapArray<any>(res?.data, ["academic_years", "years"]);
      const normalized: AcademicYearOption[] = rows
        .map((item: any) => ({
          id: Number(item?.id),
          name: String(item?.name || ""),
          is_current: Boolean(item?.is_current),
        }))
        .filter((item) => item.id && item.name);

      setAcademicYears(normalized);

      const current = normalized.find((year) => year.is_current);
      if (current) {
        setFilterAcademicYear(String(current.id));
      } else if (normalized.length > 0) {
        setFilterAcademicYear(String(normalized[0].id));
      } else {
        setFilterAcademicYear("");
      }
    } catch (error: any) {
      console.error("Error fetching academic years:", error);
      setAcademicYears([]);
      setFilterAcademicYear("");
      toastError(getApiErrorMessage(error, "Failed to load academic years"));
    } finally {
      setAcademicYearsLoading(false);
    }
  };

  /* ================= FETCH STUDENTS ================= */
  const fetchStudents = async (page: number) => {
    if (!filterAcademicYear) {
      setLoading(false);
      setStatsLoading(false);
      setStudents([]);
      setTotalStudentsCount(0);
      return;
    }
    setLoading(true);
    try {
      const params: {
        page: number;
        page_size: number;
        search?: string;
        gender?: string;
        class_name?: string;
        section?: string;
        academic_year?: number | string;
        assignment_status?: "all" | "assigned" | "unassigned";
        school_id?: number;
      } = {
        page,
        page_size: pageSize,
        ...schoolScope.scopeParams,
      };

      if (searchTerm.trim()) params.search = searchTerm.trim();
      if (filterGender !== "all") params.gender = filterGender;
      if (filterClass !== "all") params.class_name = filterClass;
      if (filterSection !== "all") params.section = filterSection;
      params.academic_year = filterAcademicYear;
      if (filterAssignmentStatus !== "all")
        params.assignment_status = filterAssignmentStatus;

      const res = await adminApi.students.listPaginated(params);
      const rawData = res.data || {};
      const data = rawData as PaginatedStudentsResponse | Student[];
      const studentResults = unwrapArray<any>(data).map(normalizeStudent);
      setStudents(studentResults);
      setTotalStudentsCount(
        !Array.isArray(data) && typeof data.count === "number"
          ? data.count
          : studentResults.length,
      );
    } catch (error: any) {
      console.error("Error fetching students:", error);
      setStudents([]);
      setTotalStudentsCount(0);
      toastError(getApiErrorMessage(error, "Failed to load students"));
    } finally {
      setLoading(false);
      setStatsLoading(false);
    }
  };

  const fetchGenderStats = async () => {
    if (!filterAcademicYear) {
      setGenderStats({ male: 0, female: 0 });
      setClassStats([]);
      return;
    }
    try {
      const allStudents: Student[] = [];
      let page = 1;
      let hasMore = true;
      const fetchPageSize = 200;

      while (hasMore) {
        const params: {
          page: number;
          page_size: number;
          search?: string;
          gender?: string;
          class_name?: string;
          section?: string;
          academic_year?: number | string;
          assignment_status?: "all" | "assigned" | "unassigned";
          school_id?: number;
        } = {
          page,
          page_size: fetchPageSize,
          ...schoolScope.scopeParams,
        };

        if (searchTerm.trim()) params.search = searchTerm.trim();
        if (filterGender !== "all") params.gender = filterGender;
        if (filterClass !== "all") params.class_name = filterClass;
        if (filterSection !== "all") params.section = filterSection;
        params.academic_year = filterAcademicYear;
        if (filterAssignmentStatus !== "all")
          params.assignment_status = filterAssignmentStatus;

        const res = await adminApi.students.listPaginated(params);
        const data = (res.data || {}) as PaginatedStudentsResponse;
        const pageResults = unwrapArray<any>(data).map(normalizeStudent);
        allStudents.push(...pageResults);
        hasMore = !!data.next;
        page += 1;
      }

      setGenderStats({
        male: allStudents.filter((s) => s.gender === "Male").length,
        female: allStudents.filter((s) => s.gender === "Female").length,
      });
      calculateClassStats(allStudents);
    } catch (error: any) {
      console.error("Error fetching gender stats:", error);
      setGenderStats({ male: 0, female: 0 });
      setClassStats([]);
    }
  };

  /* ================= CALCULATE CLASS STATS ================= */
  const calculateClassStats = (studentsList: Student[]) => {
    const stats: { [key: string]: ClassStats } = {};

    studentsList.forEach((student) => {
      const className = student.class_name || "Not Assigned";
      if (!stats[className]) {
        stats[className] = {
          class: className,
          count: 0,
          sections: [],
        };
      }
      stats[className].count++;
      if (
        student.section &&
        !stats[className].sections.includes(student.section)
      ) {
        stats[className].sections.push(student.section);
      }
    });

    setClassStats(
      Object.values(stats).sort((a, b) => {
        if (a.class === "Not Assigned") return 1;
        if (b.class === "Not Assigned") return -1;
        return parseInt(a.class) - parseInt(b.class);
      }),
    );
  };

  useEffect(() => {
    const modeParam = searchParams.get("mode");
    if (modeParam === "add") {
      setMode("add");
    } else if (modeParam === "edit") {
      // Handle edit mode if needed
      const idParam = searchParams.get("id");
      if (idParam) {
        setEditId(idParam);
        setMode("edit");
        // You might want to fetch the student data here
        // fetchStudentById(idParam);
      }
    }
  }, [searchParams]);

  useEffect(() => {
    fetchClassesAndSections();
    fetchAcademicYears();
  }, [schoolScope.selectedSchoolId]);

  useEffect(() => {
    setCurrentPage(1);
    setFilterClass("all");
    setFilterSection("all");
    setClassCarouselPage(0);
  }, [schoolScope.selectedSchoolId]);

  useEffect(() => {
    fetchStudents(currentPage);
  }, [
    currentPage,
    searchTerm,
    filterGender,
    filterClass,
    filterSection,
    filterAcademicYear,
    filterAssignmentStatus,
    schoolScope.selectedSchoolId,
  ]);

  useEffect(() => {
    fetchGenderStats();
  }, [
    searchTerm,
    filterGender,
    filterClass,
    filterSection,
    filterAcademicYear,
    filterAssignmentStatus,
    schoolScope.selectedSchoolId,
  ]);

  useEffect(() => {
    const updateCardsPerPage = () => {
      setIsMobile(window.innerWidth < 640);
      if (window.innerWidth < 640) {
        setCardsPerPage(2);
      } else if (window.innerWidth < 1024) {
        setCardsPerPage(3);
      } else if (window.innerWidth < 1280) {
        setCardsPerPage(4);
      } else {
        setCardsPerPage(6);
      }
    };

    updateCardsPerPage();
    window.addEventListener("resize", updateCardsPerPage);
    return () => window.removeEventListener("resize", updateCardsPerPage);
  }, []);

  useEffect(() => {
    if (filterClass === "all") {
      // Build section options from class master data so pagination doesn't hide options.
      const sections = new Set<string>();
      standards.forEach((std) => {
        std.sections?.forEach((sec) => sections.add(sec.name));
      });
      setAvailableSections(Array.from(sections).sort());
    } else {
      // Get sections for the selected class
      const selectedStandard = standards.find(
        (std) => std.name === filterClass,
      );
      if (selectedStandard?.sections) {
        setAvailableSections(
          selectedStandard.sections.map((s) => s.name).sort(),
        );
      } else {
        setAvailableSections([]);
      }
    }
    setFilterSection("all"); // Reset section filter when class changes
  }, [filterClass, standards]);

  /* ================= DELETE STUDENT ================= */
  const deleteStudent = async (id: string) => {
    setShowDeleteConfirm(null);

    try {
      await adminApi.students.delete(id, schoolScope.scopeParams);

      setStudents((prev) => prev.filter((s) => s.student_id !== id));
      toastSuccess("Student deleted successfully!");
    } catch (error) {
      console.error("Delete error:", error);
      toastError("Failed to delete student");
      fetchStudents(currentPage);
    }
  };

  // Add this function in the AllStudentsPage component
  const handleViewAttendance = (student: Student) => {
    // Encode the parameters in the URL
    const params = new URLSearchParams({
      view: "history",
      studentId: student.student_id,
      studentName: student.student_name,
      year: "2025-2026", // You can make this dynamic if needed
      redirectedFrom: "allstudents",
    });

    // Redirect to attendance page with query parameters
    router.push(`/admin/students/attendance?${params.toString()}`);
  };

  const handleViewResults = (student: Student) => {
    const params = new URLSearchParams({
      tab: "student",
      studentId: student.student_id,
      redirectedFrom: "allstudents",
    });

    router.push(`/admin/students/grades?${params.toString()}`);
  };

  const handleViewFeeReport = (student: Student) => {
    const params = new URLSearchParams({
      tab: "studentReports",
      studentId: student.student_id,
      redirectedFrom: "allstudents",
    });

    router.push(`/admin/finance/feereports?${params.toString()}`);
  };

  /* ================= START EDIT ================= */
  const startEdit = (s: Student) => {
    setFormData({
      student_id: s.student_id,
      student_name: s.student_name,
      student_email: s.student_email || "",
      father_name: s.father_name,
      mother_name: s.mother_name,
      father_phone: s.father_phone || "",
      mother_phone: s.mother_phone || "",
      date_of_birth: s.date_of_birth || "",
      gender: s.gender,
      accommodation: s.accommodation || "",
      class_name: s.class_name || "",
      section: s.section || "",
      address: s.address || "",
      date_of_admission: s.date_of_admission || "",
    });
    setFormErrors({});
    setEditId(s.student_id);
    setMode("edit");
  };

  /* ================= HANDLE FORM CHANGE ================= */
  const handleChange = (
    e: React.ChangeEvent<
      HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement
    >,
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
      ...(name === "class_name" ? { section: "" } : {}),
    }));
    setFormErrors((prev) => ({
      ...prev,
      [name]: "",
      ...(name === "class_name" ? { section: "" } : {}),
    }));
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
    return extracted;
  };

  const validateForm = () => {
    const nextErrors: Record<string, string> = {};
    const isValidPhoneNumber = (value: string) => {
      const trimmed = value.trim();
      if (!/^\+?[0-9\s-]+$/.test(trimmed)) return false;
      const digitsOnly = trimmed.replace(/\D/g, "");
      return digitsOnly.length >= 10 && digitsOnly.length <= 15;
    };
    const isValidEmail = (value: string) =>
      /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());

    if (!formData.student_id.trim())
      nextErrors.student_id = "Student ID is required.";
    if (!formData.student_name.trim())
      nextErrors.student_name = "Student name is required.";
    if (
      formData.student_email.trim() &&
      !isValidEmail(formData.student_email)
    ) {
      nextErrors.student_email = "Enter a valid email address.";
    }
    if (!formData.father_name.trim())
      nextErrors.father_name = "Father's name is required.";
    if (!formData.mother_name.trim())
      nextErrors.mother_name = "Mother's name is required.";
    if (!formData.father_phone.trim())
      nextErrors.father_phone = "Father's phone is required.";
    if (!formData.mother_phone.trim())
      nextErrors.mother_phone = "Mother's phone is required.";
    if (
      formData.father_phone.trim() &&
      !isValidPhoneNumber(formData.father_phone)
    ) {
      nextErrors.father_phone =
        "Enter a valid father's phone number (10-15 digits).";
    }
    if (
      formData.mother_phone.trim() &&
      !isValidPhoneNumber(formData.mother_phone)
    ) {
      nextErrors.mother_phone =
        "Enter a valid mother's phone number (10-15 digits).";
    }
    if (!formData.date_of_birth)
      nextErrors.date_of_birth = "Date of birth is required.";
    if (!formData.gender.trim()) nextErrors.gender = "Gender is required.";
    if (formData.section.trim() && !formData.class_name.trim()) {
      nextErrors.class_name = "Class is required when section is selected.";
    }
    if (formData.section.trim() && formData.class_name.trim()) {
      const selectedStandard = standards.find(
        (std) => std.name === formData.class_name,
      );
      const sectionExists = selectedStandard?.sections?.some(
        (section) => section.name === formData.section,
      );
      if (!sectionExists) {
        nextErrors.section = `Section '${formData.section}' does not exist in Class '${formData.class_name}'.`;
      }
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

    const payload: Record<string, string | null> = {
      student_id: formData.student_id.trim(),
      student_name: formData.student_name.trim(),
      student_email: formData.student_email.trim() || null,
      father_name: formData.father_name.trim(),
      mother_name: formData.mother_name.trim(),
      father_phone: formData.father_phone.trim(),
      mother_phone: formData.mother_phone.trim(),
      date_of_birth: formData.date_of_birth,
      gender: formData.gender,
    };
    if (formData.accommodation) payload.accommodation = formData.accommodation;
    if (formData.date_of_admission)
      payload.date_of_admission = formData.date_of_admission;
    if (mode === "edit" || formData.class_name) {
      payload.class_name = formData.class_name || null;
      payload.section = formData.class_name ? formData.section || null : null;
    }
    if (formData.address.trim()) payload.address = formData.address.trim();

    try {
      if (mode === "edit" && editId) {
        await adminApi.students.update(editId, payload, schoolScope.scopeParams);
      } else {
        await adminApi.students.create(payload, schoolScope.scopeParams);
      }
      await Promise.all([
        fetchStudents(currentPage),
        fetchGenderStats(),
        fetchClassesAndSections(),
      ]);
      setMode("list");
      setFormData(emptyStudentForm);
      setFormErrors({});

      const successMsg =
        mode === "edit"
          ? "Student updated successfully!"
          : "Student added successfully!";
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
        "Operation failed. Please check your data and try again.";
      toastError(firstError);
    } finally {
      setLoading(false);
    }
  };

  /* ================= BULK UPLOAD CSV ================= */
  const handleBulkUpload = async () => {
    if (!csvFile) {
      toastWarning("Please select a CSV file first");
      return;
    }

    setUploadProgress(0);
    setUploadingStudents(true);
    setStudentUploadResult(null);

    try {
      setUploadProgress(35);
      const response = await adminApi.csv.uploadStudents(csvFile, schoolScope.scopeParams);
      const result = normalizeStudentUploadResult(response?.data);
      setStudentUploadResult(result);

      const totalChanged =
        result.summary.profiles_created +
        result.summary.profiles_updated +
        result.summary.enrolled_in_year;

      if (result.errors.length > 0) {
        toastWarning(
          `CSV processed with ${result.errors.length} row issue${result.errors.length === 1 ? "" : "s"}.`,
        );
      } else {
        toastSuccess(
          `CSV upload completed: ${totalChanged} student change${totalChanged === 1 ? "" : "s"}.`,
        );
      }

      await Promise.all([
        fetchStudents(currentPage),
        fetchGenderStats(),
        fetchClassesAndSections(),
      ]);
      setCsvFile(null);
    } catch (error: any) {
      console.error("Upload error:", error);
      const message = getApiErrorMessage(error, "Upload failed. Please try again.");
      const result = error?.response?.data
        ? normalizeStudentUploadResult(error.response.data)
        : null;
      setStudentUploadResult(result);
      toastError(message);
    } finally {
      setUploadProgress(100);
      setUploadingStudents(false);
    }
  };

  const handleBulkImageUpload = async () => {
    if (!imagesZipFile) {
      toastWarning("Please select a ZIP file first");
      return;
    }

    setUploadingImages(true);
    setImageUploadResult(null);

    try {
      const response = await adminApi.csv.uploadProfileImagesZip(
        "student",
        imagesZipFile,
        schoolScope.scopeParams,
      );
      const result = normalizeImageUploadResult(response?.data);
      setImageUploadResult(result);

      if (result.failed_count === 0) {
        toastSuccess(
          `Profile image upload completed. Updated ${result.success_count} students.`,
        );
      } else {
        toastWarning(
          `Profile images processed: ${result.success_count} updated, ${result.failed_count} failed.`,
        );
        if (result.errors.length > 0) {
          const preview = result.errors.slice(0, 2).join(" | ");
          toastInfo(preview);
        }
      }

      setImagesZipFile(null);
      await fetchStudents(currentPage);
    } catch (error: any) {
      console.error("Image ZIP upload error:", error);
      toastError(getApiErrorMessage(error, "Image ZIP upload failed. Please try again."));
    } finally {
      setUploadingImages(false);
    }
  };

  const downloadSampleCSV = () => {
    const headers = [
      "student_id",
      "student_name",
      "student_email",
      "father_name",
      "mother_name",
      "father_phone",
      "mother_phone",
      "date_of_birth",
      "date_of_admission",
      "gender",
      "accommodation",
      "class_name",
      "section",
      "address",
    ];
    const sampleRow = [
      "STU001",
      "Student Name",
      "student@example.com",
      "Father Name",
      "Mother Name",
      "9876543210",
      "9876543211",
      "2012-01-15",
      "2025-06-01",
      "Male",
      "day_scholar",
      "10",
      "A",
      "Chennai",
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
    a.download = "students_sample_template.csv";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
  };

  /* ================= SORTING ================= */
  const handleSort = (key: string) => {
    setSortConfig((current) => ({
      key,
      direction:
        current.key === key && current.direction === "asc" ? "desc" : "asc",
    }));
  };

  const sortedStudents = [...students].sort((a, b) => {
    const aValue: any = a[sortConfig.key as keyof Student];
    const bValue: any = b[sortConfig.key as keyof Student];

    if (aValue === null || bValue === null) return 0;

    if (aValue < bValue) return sortConfig.direction === "asc" ? -1 : 1;
    if (aValue > bValue) return sortConfig.direction === "asc" ? 1 : -1;
    return 0;
  });

  /* ================= FILTER & SEARCH ================= */
  const filteredStudents = sortedStudents;

  /* ================= PAGINATION ================= */
  const totalPages = Math.max(1, Math.ceil(totalStudentsCount / pageSize));
  const indexOfFirstItem =
    totalStudentsCount === 0 ? 0 : (currentPage - 1) * pageSize + 1;
  const indexOfLastItem = Math.min(currentPage * pageSize, totalStudentsCount);
  const currentStudents = filteredStudents;

  const deleteStudentName = showDeleteConfirm
    ? students.find((s) => s.student_id === showDeleteConfirm)?.student_name ||
      showDeleteConfirm
    : "";

  /* ================= STATS ================= */
  const maleCount = genderStats.male;
  const femaleCount = genderStats.female;
  const totalStudents = totalStudentsCount;

  /* ================= EXPORT CSV ================= */
  const exportToCSV = async () => {
    const headers = [
      "Student ID",
      "Name",
      "Email",
      "Gender",
      "Accommodation",
      "DOB",
      "Father",
      "Mother",
      "Father Phone",
      "Mother Phone",
      "Class",
      "Section",
      "Address",
    ];
    try {
      const allStudents: Student[] = [];
      let page = 1;
      let hasMore = true;
      const exportPageSize = 200;

      while (hasMore) {
        const params: {
          page: number;
          page_size: number;
          search?: string;
          gender?: string;
          class_name?: string;
          section?: string;
          academic_year?: number | string;
          assignment_status?: "all" | "assigned" | "unassigned";
          school_id?: number;
        } = {
          page,
          page_size: exportPageSize,
          ...schoolScope.scopeParams,
        };

        if (searchTerm.trim()) params.search = searchTerm.trim();
        if (filterGender !== "all") params.gender = filterGender;
        if (filterClass !== "all") params.class_name = filterClass;
        if (filterSection !== "all") params.section = filterSection;
        if (filterAcademicYear) params.academic_year = filterAcademicYear;
        if (filterAssignmentStatus !== "all")
          params.assignment_status = filterAssignmentStatus;

        const res = await adminApi.students.listPaginated(params);
        const data = (res.data || {}) as PaginatedStudentsResponse;
        const pageResults = unwrapArray<any>(data).map(normalizeStudent);
        allStudents.push(...pageResults);

        hasMore = !!data.next;
        page += 1;
      }

      if (allStudents.length === 0) {
        toastInfo("No students to export");
        return;
      }

      const sortedForExport = [...allStudents].sort((a, b) => {
        const aValue: any = a[sortConfig.key as keyof Student];
        const bValue: any = b[sortConfig.key as keyof Student];

        if (aValue === null || bValue === null) return 0;
        if (aValue < bValue) return sortConfig.direction === "asc" ? -1 : 1;
        if (aValue > bValue) return sortConfig.direction === "asc" ? 1 : -1;
        return 0;
      });

      const csvData = sortedForExport.map((student) => [
        student.student_id,
        student.student_name,
        student.student_email || "",
        student.gender,
        student.accommodation || "",
        student.date_of_birth || "",
        student.father_name,
        student.mother_name,
        student.father_phone || "",
        student.mother_phone || "",
        student.class_name || "",
        student.section || "",
        student.address || "",
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
      a.download = `students_${new Date().toISOString().split("T")[0]}.csv`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
      toastSuccess(
        `CSV exported successfully! (${allStudents.length} students)`,
      );
    } catch (error) {
      console.error("Error exporting students CSV:", error);
      toastError("Failed to export CSV");
    }
  };

  /* ================= GET UNIQUE CLASSES ================= */
  const uniqueClasses = standards.map((std) => std.name);
  const totalClassPages = Math.max(
    1,
    Math.ceil(standards.length / cardsPerPage),
  );
  const safeCarouselPage = Math.min(classCarouselPage, totalClassPages - 1);
  const visibleStandards = standards.slice(
    safeCarouselPage * cardsPerPage,
    safeCarouselPage * cardsPerPage + cardsPerPage,
  );

  useEffect(() => {
    if (classCarouselPage > totalClassPages - 1) {
      setClassCarouselPage(0);
    }
  }, [classCarouselPage, totalClassPages]);

  /* ================= AGE CALCULATION ================= */
  const calculateAge = (dob: string) => {
    if (!dob) return "N/A";
    const birthDate = new Date(dob);
    const today = new Date();
    let age = today.getFullYear() - birthDate.getFullYear();
    const m = today.getMonth() - birthDate.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
      age--;
    }
    return age;
  };

  // Always show all columns (non-responsive table layout).
  const shouldShowColumn = (_column: string) => true;

  return (
    <div
      className={`dashboard-typography p-3 md:p-4 xl:p-6 ${getBgClass()} transition-colors duration-200`}
    >
      <div className="mx-auto w-full max-w-[1600px]">
        {/* HEADER SECTION */}
        <div className="mb-3 sm:mb-4 md:mb-6">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 sm:gap-4 mb-4 sm:mb-6">
            <div className="flex items-center space-x-3">
              <div
                className={combine(
                  "p-2 sm:p-3 rounded-xl sm:rounded-2xl shadow-lg",
                  theme === "dark"
                    ? "bg-gradient-to-br from-blue-600 to-blue-700"
                    : "bg-gradient-to-br from-blue-500 to-blue-600",
                )}
              >
                <FaUserGraduate className="text-xl sm:text-2xl text-white" />
              </div>
              <div>
                <h1
                  className={combine(
                    "text-xl sm:text-2xl md:text-3xl font-bold",
                    get("text", "primary"),
                  )}
                >
                  Student Management
                </h1>
                <p
                  className={combine(
                    "text-xs sm:text-sm mt-0.5 sm:mt-1 flex items-center",
                    get("text", "secondary"),
                  )}
                >
                  <MdOutlineDashboard className="mr-1 sm:mr-2 text-xs sm:text-sm" />
                  Manage all student records and information
                </p>
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
                    <span className="inline">Export CSV</span>
                  </button>

                  <button
                    onClick={() => {
                      setBulkUploadMode(!bulkUploadMode);
                      setStudentUploadResult(null);
                      setImageUploadResult(null);
                    }}
                    className={combine(
                      getSecondaryButtonClass(),
                      "flex items-center space-x-2 shrink-0",
                    )}
                  >
                    <FaClipboardList className="text-xs" />
                    <span>Bulk Upload</span>
                  </button>

                  <button
                    type="button"
                    disabled
                    aria-disabled="true"
                    title="Adding students is temporarily disabled"
                    className={combine(
                      getPrimaryButtonClass(),
                      "flex items-center space-x-2 shrink-0 opacity-50 cursor-not-allowed",
                    )}
                  >
                    <FaUserPlus className="text-xs" />
                    <span>Add Student</span>
                  </button>
                </>
              ) : (
                <button
                  onClick={() => {
                    setFormErrors({});
                    setMode("list");
                  }}
                  className={combine(
                    getSecondaryButtonClass(),
                    "flex items-center space-x-2",
                  )}
                >
                  <FaArrowLeft className="text-xs" />
                  <span>Back to List</span>
                </button>
              )}
            </div>
          </div>

          {/* QUICK STATS - Responsive grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3 sm:gap-4 md:gap-6 mb-4 sm:mb-6 md:mb-8">
            <div className={getStatsCardClass("blue")}>
              <div className="flex items-center justify-between">
                <div>
                  <p
                    className={combine(
                      "text-xs font-medium",
                      get("text", "secondary"),
                    )}
                  >
                    Total Students
                  </p>
                  <p
                    className={combine(
                      "text-lg sm:text-xl md:text-2xl font-bold mt-1 sm:mt-2",
                      get("text", "primary"),
                    )}
                  >
                    {totalStudents}
                  </p>
                </div>
                <div
                  className={combine(
                    "p-1.5 sm:p-2 rounded-lg sm:rounded-xl",
                    theme === "dark" ? "bg-blue-900/30" : "bg-blue-100",
                  )}
                >
                  <FiUsers
                    className={combine(
                      "text-base sm:text-lg",
                      theme === "dark" ? "text-blue-400" : "text-blue-600",
                    )}
                  />
                </div>
              </div>
              <div
                className={combine(
                  "mt-2 sm:mt-3 md:mt-4 text-xs",
                  get("text", "tertiary"),
                )}
              >
                Across all classes & sections (all pages)
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
                    Male Students
                  </p>
                  <p
                    className={combine(
                      "text-lg sm:text-xl md:text-2xl font-bold mt-1 sm:mt-2",
                      get("text", "primary"),
                    )}
                  >
                    {maleCount}
                  </p>
                </div>
                <div
                  className={combine(
                    "p-1.5 sm:p-2 rounded-lg sm:rounded-xl",
                    theme === "dark" ? "bg-emerald-900/30" : "bg-emerald-100",
                  )}
                >
                  <FaUser
                    className={combine(
                      "text-base sm:text-lg",
                      theme === "dark"
                        ? "text-emerald-400"
                        : "text-emerald-600",
                    )}
                  />
                </div>
              </div>
              <div
                className={combine(
                  "mt-1 sm:mt-2 md:mt-3 text-xs",
                  get("accent", "success"),
                )}
              >
                {totalStudents > 0
                  ? `${((maleCount / totalStudents) * 100).toFixed(1)}%`
                  : "0%"}{" "}
                of total
              </div>
            </div>

            <div className={getStatsCardClass("pink")}>
              <div className="flex items-center justify-between">
                <div>
                  <p
                    className={combine(
                      "text-xs font-medium",
                      get("text", "secondary"),
                    )}
                  >
                    Female Students
                  </p>
                  <p
                    className={combine(
                      "text-lg sm:text-xl md:text-2xl font-bold mt-1 sm:mt-2",
                      get("text", "primary"),
                    )}
                  >
                    {femaleCount}
                  </p>
                </div>
                <div
                  className={combine(
                    "p-1.5 sm:p-2 rounded-lg sm:rounded-xl",
                    theme === "dark" ? "bg-pink-900/30" : "bg-pink-100",
                  )}
                >
                  <FaUser
                    className={combine(
                      "text-base sm:text-lg",
                      theme === "dark" ? "text-pink-400" : "text-pink-600",
                    )}
                  />
                </div>
              </div>
              <div
                className={combine(
                  "mt-1 sm:mt-2 md:mt-3 text-xs",
                  get("accent", "warning"),
                )}
              >
                {totalStudents > 0
                  ? `${((femaleCount / totalStudents) * 100).toFixed(1)}%`
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
                    Total Classes
                  </p>
                  <p
                    className={combine(
                      "text-lg sm:text-xl md:text-2xl font-bold mt-1 sm:mt-2",
                      get("text", "primary"),
                    )}
                  >
                    {uniqueClasses.length}
                  </p>
                </div>
                <div
                  className={combine(
                    "p-1.5 sm:p-2 rounded-lg sm:rounded-xl",
                    theme === "dark" ? "bg-amber-900/30" : "bg-amber-100",
                  )}
                >
                  <IoIosSchool
                    className={combine(
                      "text-base sm:text-lg",
                      theme === "dark" ? "text-amber-400" : "text-amber-600",
                    )}
                  />
                </div>
              </div>
              <div
                className={combine(
                  "mt-1 sm:mt-2 md:mt-3 text-xs",
                  get("accent", "warning"),
                )}
              >
                {uniqueClasses.length} active classes
              </div>
            </div>
          </div>

          {/* BULK UPLOAD MODAL */}
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
                        Bulk Upload Students
                      </h3>
                      <p
                        className={combine(
                          "text-xs sm:text-sm mt-0.5 sm:mt-1",
                          get("text", "secondary"),
                        )}
                      >
                        Upload a CSV file to add multiple students at once
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
                    <FaTimesCircle
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
                      onChange={(e) => {
                        setCsvFile(e.target.files?.[0] || null);
                        setStudentUploadResult(null);
                      }}
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
                      disabled={!csvFile || uploadingStudents}
                      className={combine(
                        "px-3 sm:px-4 py-2 sm:py-2.5 rounded-lg sm:rounded-xl transition-all duration-200 flex items-center justify-center space-x-1 sm:space-x-2 text-xs sm:text-sm",
                        theme === "dark"
                          ? "bg-gradient-to-r from-emerald-600 to-emerald-700 hover:from-emerald-700 hover:to-emerald-800 text-white"
                          : "bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-600 hover:to-emerald-700 text-white",
                        "disabled:opacity-50 disabled:cursor-not-allowed hover:scale-[1.02] active:scale-[0.98]",
                      )}
                    >
                      <FiDownload className="text-xs sm:text-sm" />
                      <span className="text-xs sm:text-sm">
                        {uploadingStudents ? "Uploading..." : "Upload"}
                      </span>
                    </button>
                  </div>
                  {csvFile && (
                    <p
                      className={combine(
                        "mt-1.5 sm:mt-2 text-xs flex items-center gap-1.5 sm:gap-2",
                        theme === "dark"
                          ? "text-emerald-400"
                          : "text-emerald-600",
                      )}
                    >
                      <FiCheckCircle className="text-xs sm:text-sm" />
                      Selected: <span className="truncate">{csvFile.name}</span>
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
                    Upload Student Profile Images (.zip)
                  </label>
                  <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 sm:gap-3">
                    <input
                      type="file"
                      accept=".zip"
                      onChange={(e) =>
                        {
                          setImagesZipFile(e.target.files?.[0] || null);
                          setImageUploadResult(null);
                        }
                      }
                      className={getInputClass()}
                    />
                    <button
                      onClick={handleBulkImageUpload}
                      disabled={!imagesZipFile || uploadingImages}
                      className={combine(
                        "px-3 sm:px-4 py-2 sm:py-2.5 rounded-lg sm:rounded-xl transition-all duration-200 flex items-center justify-center space-x-1 sm:space-x-2 text-xs sm:text-sm",
                        theme === "dark"
                          ? "bg-gradient-to-r from-indigo-600 to-indigo-700 hover:from-indigo-700 hover:to-indigo-800 text-white"
                          : "bg-gradient-to-r from-indigo-500 to-indigo-600 hover:from-indigo-600 hover:to-indigo-700 text-white",
                        "disabled:opacity-50 disabled:cursor-not-allowed hover:scale-[1.02] active:scale-[0.98]",
                      )}
                    >
                      <FiDownload className="text-xs sm:text-sm" />
                      <span className="text-xs sm:text-sm">
                        {uploadingImages ? "Uploading..." : "Upload Images ZIP"}
                      </span>
                    </button>
                  </div>
                  {imagesZipFile && (
                    <p
                      className={combine(
                        "mt-1.5 sm:mt-2 text-xs flex items-center gap-1.5 sm:gap-2",
                        theme === "dark"
                          ? "text-indigo-400"
                          : "text-indigo-600",
                      )}
                    >
                      <FiCheckCircle className="text-xs sm:text-sm" />
                      Selected ZIP:{" "}
                      <span className="truncate">{imagesZipFile.name}</span>
                    </p>
                  )}
                  <p
                    className={combine("mt-1 text-xs", get("text", "tertiary"))}
                  >
                    ZIP should contain image files named as student IDs (e.g.,
                    STU001.jpg, STU002.png).
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

                {studentUploadResult && (
                  <div
                    className={combine(
                      "mb-3 sm:mb-4 rounded-lg sm:rounded-xl border p-3 text-xs sm:text-sm",
                      studentUploadResult.errors.length
                        ? theme === "dark"
                          ? "border-amber-800 bg-amber-950/30 text-amber-200"
                          : "border-amber-200 bg-amber-50 text-amber-800"
                        : theme === "dark"
                          ? "border-emerald-800 bg-emerald-950/30 text-emerald-200"
                          : "border-emerald-200 bg-emerald-50 text-emerald-800",
                    )}
                  >
                    <p className="font-semibold">{studentUploadResult.message}</p>
                    <div className="mt-2 grid grid-cols-1 sm:grid-cols-3 gap-2">
                      <span>Created: {studentUploadResult.summary.profiles_created}</span>
                      <span>Updated: {studentUploadResult.summary.profiles_updated}</span>
                      <span>Enrolled: {studentUploadResult.summary.enrolled_in_year}</span>
                    </div>
                    {studentUploadResult.errors.length > 0 && (
                      <div className="mt-2">
                        <p className="font-medium">Row issues:</p>
                        <ul className="mt-1 max-h-28 overflow-y-auto space-y-1">
                          {studentUploadResult.errors.slice(0, 8).map((error, index) => (
                            <li key={`${error}-${index}`}>{error}</li>
                          ))}
                        </ul>
                        {studentUploadResult.errors.length > 8 && (
                          <p className="mt-1">
                            +{studentUploadResult.errors.length - 8} more issue(s)
                          </p>
                        )}
                      </div>
                    )}
                  </div>
                )}

                {imageUploadResult && (
                  <div
                    className={combine(
                      "mb-3 sm:mb-4 rounded-lg sm:rounded-xl border p-3 text-xs sm:text-sm",
                      imageUploadResult.failed_count
                        ? theme === "dark"
                          ? "border-amber-800 bg-amber-950/30 text-amber-200"
                          : "border-amber-200 bg-amber-50 text-amber-800"
                        : theme === "dark"
                          ? "border-indigo-800 bg-indigo-950/30 text-indigo-200"
                          : "border-indigo-200 bg-indigo-50 text-indigo-800",
                    )}
                  >
                    <p className="font-semibold">{imageUploadResult.message}</p>
                    <div className="mt-2 flex flex-wrap gap-3">
                      <span>Updated: {imageUploadResult.success_count}</span>
                      <span>Failed: {imageUploadResult.failed_count}</span>
                    </div>
                    {imageUploadResult.errors.length > 0 && (
                      <ul className="mt-2 max-h-24 overflow-y-auto space-y-1">
                        {imageUploadResult.errors.slice(0, 6).map((error, index) => (
                          <li key={`${error}-${index}`}>{error}</li>
                        ))}
                      </ul>
                    )}
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
                    student_id,student_name,student_email,father_name,mother_name,father_phone,mother_phone,date_of_birth,date_of_admission,gender,accommodation,class_name,section,address
                  </div>
                  <p className={combine("mt-2 text-xs", get("text", "tertiary"))}>
                    Dates support YYYY-MM-DD, DD-MM-YYYY, DD/MM/YYYY, MM/DD/YYYY, and DD Mon YYYY. Use accommodation values day_scholar/day scholar or hosteller/hostel; accepted headers include accommodation, accomodation, student_accommodation, and student_accomodation. Class and section are created automatically during CSV upload; manual form entries must use existing class-section records. Profile images are uploaded separately in a ZIP named by student ID, for example STU001.jpg.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* CLASS DISTRIBUTION CHART */}
          {!statsLoading && (
            <div className={getCardGradientClass("indigo")}>
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 sm:gap-3 mb-3 sm:mb-4">
                <div className="flex items-center gap-2 sm:gap-3">
                  <div
                    className={combine(
                      "p-1.5 sm:p-2 rounded-lg sm:rounded-xl",
                      theme === "dark" ? "bg-indigo-900/30" : "bg-indigo-100",
                    )}
                  >
                    <IoMdStats
                      className={combine(
                        "text-base sm:text-lg",
                        theme === "dark"
                          ? "text-indigo-400"
                          : "text-indigo-600",
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
                      Class Distribution
                    </h3>
                    <p
                      className={combine(
                        "text-xs sm:text-sm mt-0.5 sm:mt-1",
                        get("text", "secondary"),
                      )}
                    >
                      Student count across different classes
                    </p>
                  </div>
                </div>
                {standards.length > cardsPerPage && (
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() =>
                        setClassCarouselPage((prev) => Math.max(prev - 1, 0))
                      }
                      disabled={safeCarouselPage === 0}
                      className={combine(
                        "p-2 rounded-lg border transition-all",
                        get("border", "primary"),
                        get("bg", "card"),
                        safeCarouselPage === 0
                          ? "opacity-50 cursor-not-allowed"
                          : "hover:scale-105",
                      )}
                      aria-label="Previous class cards"
                    >
                      <FaChevronLeft
                        className={combine(
                          "text-xs sm:text-sm",
                          get("icon", "primary"),
                        )}
                      />
                    </button>
                    <span
                      className={combine(
                        "text-xs sm:text-sm font-medium",
                        get("text", "secondary"),
                      )}
                    >
                      {safeCarouselPage + 1}/{totalClassPages}
                    </span>
                    <button
                      onClick={() =>
                        setClassCarouselPage((prev) =>
                          Math.min(prev + 1, totalClassPages - 1),
                        )
                      }
                      disabled={safeCarouselPage === totalClassPages - 1}
                      className={combine(
                        "p-2 rounded-lg border transition-all",
                        get("border", "primary"),
                        get("bg", "card"),
                        safeCarouselPage === totalClassPages - 1
                          ? "opacity-50 cursor-not-allowed"
                          : "hover:scale-105",
                      )}
                      aria-label="Next class cards"
                    >
                      <FaChevronRight
                        className={combine(
                          "text-xs sm:text-sm",
                          get("icon", "primary"),
                        )}
                      />
                    </button>
                  </div>
                )}
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-2 sm:gap-3">
                {standards.length > 0 ? (
                  visibleStandards.map((standard) => {
                    const classStat = classStats.find(
                      (c) => c.class === standard.name,
                    );
                    const studentCount = classStat?.count || 0;
                    const sections =
                      standard.sections?.map((s) => s.name) || [];
                    const barWidth =
                      totalStudentsCount > 0
                        ? (studentCount / totalStudentsCount) * 100
                        : 0;

                    return (
                      <div
                        key={standard.id}
                        className={combine(
                          "rounded-lg sm:rounded-xl p-2 sm:p-3 border shadow-sm hover:shadow-md transition-all hover:scale-[1.02]",
                          get("bg", "card"),
                          get("border", "primary"),
                        )}
                      >
                        <div className="flex items-center justify-between mb-1 sm:mb-2">
                          <span
                            className={combine(
                              "font-bold text-xs sm:text-sm truncate",
                              get("text", "primary"),
                            )}
                          >
                            Class {standard.name}
                          </span>
                          <span className={getStatusBadgeClass("blue")}>
                            {studentCount}
                          </span>
                        </div>
                        <div
                          className={combine(
                            "text-xs",
                            get("text", "tertiary"),
                          )}
                        >
                          {sections.length} section
                          {sections.length !== 1 ? "s" : ""}
                        </div>
                      </div>
                    );
                  })
                ) : (
                  <div
                    className={combine(
                      "col-span-full text-center py-4 sm:py-6 md:py-8",
                      get("text", "secondary"),
                    )}
                  >
                    <p className="text-xs sm:text-sm font-medium">
                      No classes available
                    </p>
                    <p className="text-xs mt-1">
                      Class distribution will appear once classes are
                      configured.
                    </p>
                  </div>
                )}
              </div>
              {standards.length > cardsPerPage && (
                <div className="mt-3 flex items-center justify-center gap-1.5">
                  {Array.from({ length: totalClassPages }).map((_, idx) => (
                    <button
                      key={idx}
                      onClick={() => setClassCarouselPage(idx)}
                      className={combine(
                        "h-2 rounded-full transition-all",
                        idx === safeCarouselPage
                          ? "w-5 bg-indigo-500"
                          : combine(
                              "w-2",
                              theme === "dark" ? "bg-gray-600" : "bg-gray-300",
                            ),
                      )}
                      aria-label={`Go to class page ${idx + 1}`}
                    />
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {mode === "list" && (
          <div className="animate-fade-in">
            {/* SEARCH & FILTERS */}
            <div
              className={combine(
                getCardGradientClass("blue"),
                "transition-all duration-200 backdrop-blur-md bg-opacity-95 mb-3 sm:mb-4",
              )}
            >
              {/* Filters container */}
              <div className="block">
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-7 gap-3 sm:gap-4">
                  <div className="col-span-full lg:col-span-2">
                    <label
                      className={combine(
                        "block text-xs sm:text-sm font-medium mb-1.5",
                        get("text", "primary"),
                      )}
                    >
                      <FaSearch className="inline mr-1.5 text-xs sm:text-sm" />
                      Search Students
                    </label>
                    <div className="relative">
                      <FaSearch
                        className={combine(
                          "absolute left-3 top-1/2 transform -translate-y-1/2 text-xs sm:text-sm",
                          get("icon", "secondary"),
                        )}
                      />
                      <input
                        type="text"
                        placeholder="Search by name, ID, class, phone, or email..."
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
                    <label
                      className={combine(
                        "block text-xs sm:text-sm font-medium mb-1.5",
                        get("text", "primary"),
                      )}
                    >
                      <FaVenusMars className="inline mr-1.5 text-xs sm:text-sm" />
                      Gender
                    </label>
                    <select
                      value={filterGender}
                      onChange={(e) => {
                        setFilterGender(e.target.value);
                        setCurrentPage(1);
                      }}
                      className={getInputClass()}
                    >
                      <option value="all">All Genders</option>
                      <option value="Male">Male</option>
                      <option value="Female">Female</option>
                    </select>
                  </div>

                  <div>
                    <label
                      className={combine(
                        "block text-xs sm:text-sm font-medium mb-1.5",
                        get("text", "primary"),
                      )}
                    >
                      <FaCalendar className="inline mr-1.5 text-xs sm:text-sm" />
                      Academic Year
                    </label>
                    <select
                      value={filterAcademicYear}
                      onChange={(e) => {
                        setFilterAcademicYear(e.target.value);
                        setCurrentPage(1);
                      }}
                      className={getInputClass()}
                      disabled={
                        academicYearsLoading || academicYears.length === 0
                      }
                    >
                      <option value="">
                        {academicYearsLoading
                          ? "Loading academic years..."
                          : "Select Academic Year"}
                      </option>
                      {academicYears.map((year) => (
                        <option key={year.id} value={String(year.id)}>
                          {year.name} {year.is_current ? "(Current)" : ""}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label
                      className={combine(
                        "block text-xs sm:text-sm font-medium mb-1.5",
                        get("text", "primary"),
                      )}
                    >
                      <FaUsers className="inline mr-1.5 text-xs sm:text-sm" />
                      Assignment
                    </label>
                    <select
                      value={filterAssignmentStatus}
                      onChange={(e) => {
                        setFilterAssignmentStatus(
                          e.target.value as "all" | "assigned" | "unassigned",
                        );
                        setCurrentPage(1);
                      }}
                      className={getInputClass()}
                    >
                      <option value="all">All Students</option>
                      <option value="assigned">Class Assigned Student</option>
                      <option value="unassigned">
                        Not Class Assigned Student
                      </option>
                    </select>
                  </div>

                  <div>
                    <label
                      className={combine(
                        "block text-xs sm:text-sm font-medium mb-1.5",
                        get("text", "primary"),
                      )}
                    >
                      <FaSchool className="inline mr-1.5 text-xs sm:text-sm" />
                      Class
                    </label>
                    <select
                      value={filterClass}
                      onChange={(e) => {
                        setFilterClass(e.target.value);
                        setCurrentPage(1);
                      }}
                      className={getInputClass()}
                      disabled={sectionsLoading}
                    >
                      <option value="all">All Classes</option>
                      {standards.length > 0 &&
                        standards.map((std) => (
                          <option key={std.id} value={std.name}>
                            Class {std.name}
                          </option>
                        ))}
                    </select>
                  </div>

                  <div>
                    <label
                      className={combine(
                        "block text-xs sm:text-sm font-medium mb-1.5",
                        get("text", "primary"),
                      )}
                    >
                      <MdClass className="inline mr-1.5 text-xs sm:text-sm" />
                      Section
                    </label>
                    <select
                      value={filterSection}
                      onChange={(e) => {
                        setFilterSection(e.target.value);
                        setCurrentPage(1);
                      }}
                      className={getInputClass()}
                      disabled={availableSections.length === 0}
                    >
                      <option value="all">
                        {filterClass === "all"
                          ? "All Sections"
                          : `All Sections in Class ${filterClass}`}
                      </option>
                      {availableSections.map((section) => (
                        <option key={section} value={section}>
                          Section {section}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>
            </div>

            {/* STUDENTS TABLE */}
            <div className={getCardGradientClass()}>
              <div
                className={combine(
                  "p-3 sm:p-4 border-b",
                  get("border", "primary"),
                  get("bg", "secondary"),
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
                      Student Records
                    </h3>
                    <p
                      className={combine(
                        "text-xs sm:text-sm mt-0.5 sm:mt-1",
                        get("text", "secondary"),
                      )}
                    >
                      View and manage student information
                    </p>
                  </div>

                  <div className={combine("text-xs", get("text", "tertiary"))}>
                    Showing {indexOfFirstItem} to {indexOfLastItem} of{" "}
                    {totalStudents} students
                  </div>
                </div>
              </div>

              {/* Table Content with Fixed Height and Sticky Header */}
              {isMobile ? (
                // MOBILE CARD VIEW (unchanged)
                <div className="p-2 sm:p-3">
                  {loading ? (
                    <div className="p-6 sm:p-8 min-h-[280px] flex items-center justify-center text-center">
                      <div className="text-center">
                        <div className="relative mx-auto w-16 h-16">
                          <div className="animate-spin rounded-full h-16 w-16 border-4 border-blue-200 border-t-blue-600"></div>
                          <div className="absolute inset-0 flex items-center justify-center">
                            <FaSchool className="h-8 w-8 text-blue-600 animate-pulse" />
                          </div>
                        </div>
                        <p
                          className={combine(
                            "mt-4 sm:mt-6 text-xs sm:text-sm font-medium",
                            get("text", "secondary"),
                          )}
                        >
                          Loading students...
                        </p>
                        <p
                          className={combine(
                            "text-xs sm:text-sm mt-1 sm:mt-2",
                            get("text", "tertiary"),
                          )}
                        >
                          Preparing student records
                        </p>
                      </div>
                    </div>
                  ) : currentStudents.length === 0 ? (
                    <div className="p-6 sm:p-8 text-center">
                      <div
                        className={combine(
                          "inline-block p-2 sm:p-3 rounded-full mb-2 sm:mb-3",
                          theme === "dark" ? "bg-blue-900/30" : "bg-blue-100",
                        )}
                      >
                        <FaUserGraduate
                          className={combine(
                            "text-lg sm:text-xl",
                            theme === "dark"
                              ? "text-blue-400"
                              : "text-blue-500",
                          )}
                        />
                      </div>
                      <h3
                        className={combine(
                          "text-sm sm:text-base font-medium mb-0.5 sm:mb-1",
                          get("text", "primary"),
                        )}
                      >
                        No students found
                      </h3>
                      <p
                        className={combine(
                          "text-xs sm:text-sm mb-3 sm:mb-4",
                          get("text", "secondary"),
                        )}
                      >
                        {searchTerm ||
                        filterGender !== "all" ||
                        filterClass !== "all" ||
                        !!filterAcademicYear
                          ? "Try adjusting your search or filters"
                          : "Add your first student to get started"}
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {currentStudents.map((student) => (
                        <div
                          key={student.student_id}
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
                                {student.student_name}
                              </p>
                              <p
                                className={combine(
                                  "text-xs mt-0.5",
                                  get("text", "tertiary"),
                                )}
                              >
                                ID: {student.student_id}
                              </p>
                            </div>
                            <div className="flex items-center gap-1.5 shrink-0">
                              <button
                                onClick={() =>
                                  router.push(
                                    `/admin/students/overview/${student.student_id}`,
                                  )
                                }
                                className={combine(
                                  "p-1.5 rounded-lg",
                                  get("icon", "primary"),
                                )}
                                title="View Details"
                              >
                                <FaEye className="text-xs" />
                              </button>
                              <button
                                onClick={() => startEdit(student)}
                                className={combine(
                                  "p-1.5 rounded-lg",
                                  get("icon", "primary"),
                                )}
                                title="Edit"
                              >
                                <FaEdit className="text-xs" />
                              </button>
                              <button
                                onClick={() =>
                                  setShowDeleteConfirm(student.student_id)
                                }
                                className={combine(
                                  "p-1.5 rounded-lg",
                                  get("icon", "primary"),
                                )}
                                title="Delete"
                              >
                                <FaTrash className="text-xs" />
                              </button>
                            </div>
                          </div>

                          <div className="mt-2 grid grid-cols-2 gap-2 text-xs">
                            <div>
                              <p
                                className={combine(
                                  "font-medium",
                                  get("text", "tertiary"),
                                )}
                              >
                                Class
                              </p>
                              <p
                                className={combine(
                                  "mt-0.5",
                                  get("text", "secondary"),
                                )}
                              >
                                {student.class_name || "Not Assigned"}
                                {student.section ? ` - ${student.section}` : ""}
                              </p>
                            </div>
                            <div>
                              <p
                                className={combine(
                                  "font-medium",
                                  get("text", "tertiary"),
                                )}
                              >
                                Admission
                              </p>
                              <p
                                className={combine(
                                  "mt-0.5",
                                  get("text", "secondary"),
                                )}
                              >
                                {student.date_of_admission || "Not Provided"}
                              </p>
                            </div>
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
                                  "mt-0.5",
                                  get("text", "secondary"),
                                )}
                              >
                                {student.father_phone ||
                                  student.mother_phone ||
                                  "Not Provided"}
                              </p>
                            </div>
                            <div className="col-span-2">
                              <p
                                className={combine(
                                  "font-medium",
                                  get("text", "tertiary"),
                                )}
                              >
                                Address
                              </p>
                              <p
                                className={combine(
                                  "mt-0.5 truncate",
                                  get("text", "secondary"),
                                )}
                              >
                                {student.address || "Not provided"}
                              </p>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ) : (
                // DESKTOP/TABLET TABLE VIEW WITH FIXED HEIGHT AND STICKY HEADER
                <div className="relative">
                  {/* Fixed height container with scrollable content */}
                  <div className="overflow-y-auto">
                    <table className="w-full border-collapse text-xs sm:text-sm">
                      <thead className="sticky top-0 z-20">
                        <tr
                          className={combine(
                            "bg-[var(--color-bg-secondary)]",
                            "shadow-sm",
                          )}
                        >
                          {shouldShowColumn("student_id") && (
                            <th
                              className={combine(
                                "px-3 sm:px-4 py-2 sm:py-3 text-left text-xs sm:text-sm font-medium uppercase tracking-wider cursor-pointer transition-colors",
                                get("text", "tertiary"),
                                "hover:bg-[var(--color-bg-hover)]",
                              )}
                              onClick={() => handleSort("student_id")}
                            >
                              <div className="flex items-center space-x-1 sm:space-x-2">
                                <FaIdCard className="text-xs" />
                                <span className="text-xs sm:text-sm">ID</span>
                                <div className="ml-1">
                                  {sortConfig.key === "student_id" ? (
                                    sortConfig.direction === "asc" ? (
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
                          )}

                          {shouldShowColumn("student_name") && (
                            <th
                              className={combine(
                                "px-3 sm:px-4 py-2 sm:py-3 text-left text-xs sm:text-sm font-medium uppercase tracking-wider cursor-pointer transition-colors",
                                get("text", "tertiary"),
                                "hover:bg-[var(--color-bg-hover)]",
                              )}
                              onClick={() => handleSort("student_name")}
                            >
                              <div className="flex items-center space-x-1 sm:space-x-2">
                                <FaUser className="text-xs" />
                                <span className="text-xs sm:text-sm">Name</span>
                                <div className="ml-1">
                                  {sortConfig.key === "student_name" ? (
                                    sortConfig.direction === "asc" ? (
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
                          )}

                          {shouldShowColumn("class_info") && (
                            <th
                              className={combine(
                                "px-3 sm:px-4 py-2 sm:py-3 text-left text-xs sm:text-sm font-medium uppercase tracking-wider cursor-pointer transition-colors",
                                get("text", "tertiary"),
                                "hover:bg-[var(--color-bg-hover)]",
                              )}
                              onClick={() => handleSort("class_name")}
                            >
                              <div className="flex items-center space-x-1 sm:space-x-2">
                                <FaSchool className="text-xs" />
                                <span className="text-xs sm:text-sm">
                                  Class
                                </span>
                                <div className="ml-1">
                                  {sortConfig.key === "class_name" ? (
                                    sortConfig.direction === "asc" ? (
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
                          )}

                          {shouldShowColumn("address") && (
                            <th
                              className={combine(
                                "px-3 sm:px-4 py-2 sm:py-3 text-left text-xs sm:text-sm font-medium uppercase tracking-wider",
                                get("text", "tertiary"),
                              )}
                            >
                              <div className="flex items-center space-x-1 sm:space-x-2">
                                <FaMapMarkerAlt className="text-xs" />
                                <span className="text-xs sm:text-sm">
                                  Address
                                </span>
                              </div>
                            </th>
                          )}

                          {shouldShowColumn("date_of_admission") && (
                            <th
                              className={combine(
                                "px-3 sm:px-4 py-2 sm:py-3 text-left text-xs sm:text-sm font-medium uppercase tracking-wider cursor-pointer transition-colors",
                                get("text", "tertiary"),
                                "hover:bg-[var(--color-bg-hover)]",
                              )}
                              onClick={() => handleSort("date_of_admission")}
                            >
                              <div className="flex items-center space-x-1 sm:space-x-2">
                                <FaCalendar className="text-xs" />
                                <span className="text-xs sm:text-sm">
                                  Admission Date
                                </span>
                                <div className="ml-1">
                                  {sortConfig.key === "date_of_admission" ? (
                                    sortConfig.direction === "asc" ? (
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
                          )}

                          {shouldShowColumn("contact_info") && (
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
                          )}

                          {shouldShowColumn("actions") && (
                            <th
                              className={combine(
                                "px-3 sm:px-4 py-2 sm:py-3 text-left text-xs sm:text-sm font-medium uppercase tracking-wider",
                                get("text", "tertiary"),
                              )}
                            >
                              <div className="flex items-center space-x-1 sm:space-x-2">
                                <FaChartBar className="text-xs" />
                                <span className="text-xs sm:text-sm">
                                  Actions
                                </span>
                              </div>
                            </th>
                          )}
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
                              colSpan={7}
                              className="px-3 sm:px-4 py-8 h-[280px] align-middle text-center"
                            >
                              <div className="h-full flex flex-col items-center justify-center text-center">
                                <div className="relative mx-auto w-16 h-16">
                                  <div className="animate-spin rounded-full h-16 w-16 border-4 border-blue-200 border-t-blue-600"></div>
                                  <div className="absolute inset-0 flex items-center justify-center">
                                    <FaSchool className="h-8 w-8 text-blue-600 animate-pulse" />
                                  </div>
                                </div>
                                <p
                                  className={combine(
                                    "mt-6 text-sm font-medium",
                                    get("text", "secondary"),
                                  )}
                                >
                                  Loading students...
                                </p>
                                <p
                                  className={combine(
                                    "text-sm mt-2",
                                    get("text", "tertiary"),
                                  )}
                                >
                                  Preparing student records
                                </p>
                              </div>
                            </td>
                          </tr>
                        ) : currentStudents.length === 0 ? (
                          <tr>
                            <td
                              colSpan={7}
                              className="px-3 sm:px-4 py-8 text-center"
                            >
                              <div
                                className={combine(
                                  "inline-block p-3 rounded-full mb-3",
                                  theme === "dark"
                                    ? "bg-blue-900/30"
                                    : "bg-blue-100",
                                )}
                              >
                                <FaUserGraduate
                                  className={combine(
                                    "text-xl",
                                    theme === "dark"
                                      ? "text-blue-400"
                                      : "text-blue-500",
                                  )}
                                />
                              </div>
                              <h3
                                className={combine(
                                  "text-base font-medium mb-1",
                                  get("text", "primary"),
                                )}
                              >
                                No students found
                              </h3>
                              <p
                                className={combine(
                                  "text-sm mb-4",
                                  get("text", "secondary"),
                                )}
                              >
                                {searchTerm ||
                                filterGender !== "all" ||
                                filterClass !== "all" ||
                                !!filterAcademicYear
                                  ? "Try adjusting your search or filters"
                                  : "Add your first student to get started"}
                              </p>
                            </td>
                          </tr>
                        ) : (
                          currentStudents.map((student) => (
                            <tr
                              key={student.student_id}
                              className="transition-colors duration-150 hover:bg-[var(--color-bg-hover)]"
                            >
                              {shouldShowColumn("student_id") && (
                                <td className="px-3 sm:px-4 py-2 sm:py-3">
                                  <div className="flex items-center">
                                    <div
                                      className={combine(
                                        "h-8 w-8 sm:h-10 sm:w-10 rounded-full flex items-center justify-center mr-2 sm:mr-3",
                                        student.gender === "Male"
                                          ? theme === "dark"
                                            ? "bg-blue-900/30"
                                            : "bg-blue-100"
                                          : theme === "dark"
                                            ? "bg-pink-900/30"
                                            : "bg-pink-100",
                                      )}
                                    >
                                      <FaIdCard
                                        className={
                                          student.gender === "Male"
                                            ? theme === "dark"
                                              ? "text-blue-400 text-xs sm:text-sm"
                                              : "text-blue-600 text-xs sm:text-sm"
                                            : theme === "dark"
                                              ? "text-pink-400 text-xs sm:text-sm"
                                              : "text-pink-600 text-xs sm:text-sm"
                                        }
                                      />
                                    </div>
                                    <div>
                                      <h4
                                        className={combine(
                                          "font-semibold text-xs sm:text-sm md:text-sm",
                                          get("text", "primary"),
                                        )}
                                      >
                                        {student.student_id}
                                      </h4>
                                    </div>
                                  </div>
                                </td>
                              )}

                              {shouldShowColumn("student_name") && (
                                <td className="px-3 sm:px-4 py-2 sm:py-3">
                                  <div className="space-y-0.5 sm:space-y-1">
                                    <div className="flex items-center">
                                      <h4
                                        className={combine(
                                          "font-semibold text-xs sm:text-sm md:text-sm mx-1 sm:mx-2",
                                          get("text", "primary"),
                                        )}
                                      >
                                        {student.student_name}
                                      </h4>
                                    </div>
                                  </div>
                                </td>
                              )}

                              {shouldShowColumn("class_info") && (
                                <td className="px-3 sm:px-4 py-2 sm:py-3">
                                  <div className="space-y-0.5 sm:space-y-1">
                                    <div className="flex items-center space-x-1 sm:space-x-2">
                                      <span
                                        className={combine(
                                          "font-medium text-xs sm:text-sm md:text-sm",
                                          get("text", "primary"),
                                        )}
                                      >
                                        {student.class_name || "Not Assigned"}
                                      </span>
                                      {student.section && (
                                        <span
                                          className={combine(
                                            "font-medium text-xs sm:text-sm md:text-sm",
                                            get("text", "primary"),
                                          )}
                                        >
                                          - {student.section}
                                        </span>
                                      )}
                                    </div>
                                  </div>
                                </td>
                              )}

                              {shouldShowColumn("address") && (
                                <td className="px-3 sm:px-4 py-2 sm:py-3">
                                  <div className="space-y-0.5 sm:space-y-1">
                                    {student.address ? (
                                      <div>
                                        <p
                                          className={combine(
                                            "text-xs sm:text-sm truncate max-w-[120px] sm:max-w-[180px]",
                                            get("text", "secondary"),
                                          )}
                                        >
                                          {student.address}
                                        </p>
                                      </div>
                                    ) : (
                                      <span
                                        className={combine(
                                          "text-xs sm:text-sm italic",
                                          get("text", "tertiary"),
                                        )}
                                      >
                                        Not provided
                                      </span>
                                    )}
                                  </div>
                                </td>
                              )}

                              {shouldShowColumn("date_of_admission") && (
                                <td className="px-3 sm:px-4 py-2 sm:py-3">
                                  <span
                                    className={combine(
                                      "text-xs sm:text-sm",
                                      get("text", "secondary"),
                                    )}
                                  >
                                    {student.date_of_admission ||
                                      "Not Provided"}
                                  </span>
                                </td>
                              )}

                              {shouldShowColumn("contact_info") && (
                                <td className="px-3 sm:px-4 py-2 sm:py-3">
                                  <div className="space-y-0.5 sm:space-y-1">
                                    <div>
                                      {student.father_phone && (
                                        <p
                                          className={combine(
                                            "text-xs sm:text-sm flex items-center space-x-1",
                                            get("text", "secondary"),
                                          )}
                                        >
                                          <FaPhone className="text-xs" />
                                          <span className="text-xs sm:text-sm truncate max-w-[80px] sm:max-w-[120px]">
                                            {student.father_phone}
                                          </span>
                                        </p>
                                      )}
                                      {student.mother_phone && (
                                        <p
                                          className={combine(
                                            "text-xs sm:text-sm flex items-center space-x-1 mt-0.5 sm:mt-1",
                                            get("text", "secondary"),
                                          )}
                                        >
                                          <FaPhone className="text-xs" />
                                          <span className="text-xs sm:text-sm truncate max-w-[80px] sm:max-w-[120px]">
                                            {student.mother_phone}
                                          </span>
                                        </p>
                                      )}
                                    </div>
                                  </div>
                                </td>
                              )}

                              {shouldShowColumn("actions") && (
                                <td className="px-3 sm:px-4 py-2 sm:py-3">
                                  <div className="flex space-x-1 sm:space-x-1.5">
                                    {/* Add this new View Attendance button */}

                                    <button
                                      onClick={() =>
                                        router.push(
                                          `/admin/students/overview/${student.student_id}`,
                                        )
                                      }
                                      className={combine(
                                        "p-1 sm:p-1.5 rounded-lg sm:rounded-xl transition-all duration-200 hover:text-[var(--color-accent-primary)]",
                                        get("icon", "primary") +
                                          " text-xs sm:text-sm",
                                      )}
                                      title="View Details"
                                    >
                                      <FaEye className="text-xs sm:text-sm" />
                                    </button>

                                    <button
                                      onClick={() =>
                                        handleViewAttendance(student)
                                      }
                                      className={combine(
                                        "p-1 sm:p-1.5 rounded-lg sm:rounded-xl transition-all duration-200 hover:text-[var(--color-accent-success)]",
                                        get("icon", "primary") +
                                          " text-xs sm:text-sm",
                                      )}
                                      title="View Attendance History"
                                      data-title="View Attendance History"
                                    >
                                      <FaHistory className="text-xs sm:text-sm" />
                                    </button>
                                    <button
                                      onClick={() => handleViewResults(student)}
                                      className={combine(
                                        "p-1 sm:p-1.5 rounded-lg sm:rounded-xl transition-all duration-200 hover:text-[var(--color-accent-primary)]",
                                        get("icon", "primary") +
                                          " text-xs sm:text-sm",
                                      )}
                                      title="View Results"
                                      data-title="View Results"
                                    >
                                      <FaChartBar className="text-xs sm:text-sm" />
                                    </button>
                                    <button
                                      onClick={() =>
                                        handleViewFeeReport(student)
                                      }
                                      className={combine(
                                        "p-1 sm:p-1.5 rounded-lg sm:rounded-xl transition-all duration-200 hover:text-[var(--color-accent-primary)]",
                                        get("icon", "primary") +
                                          " text-xs sm:text-sm",
                                      )}
                                      title="View Fee Report"
                                      data-title="View Fee Report"
                                    >
                                      <FaClipboardList className="text-xs sm:text-sm" />
                                    </button>
                                    <button
                                      onClick={() => startEdit(student)}
                                      className={combine(
                                        "p-1 sm:p-1.5 rounded-lg sm:rounded-xl transition-all duration-200 hover:text-[var(--color-accent-success)]",
                                        get("icon", "primary") +
                                          " text-xs sm:text-sm",
                                      )}
                                      title="Edit"
                                    >
                                      <FaEdit className="text-xs sm:text-sm" />
                                    </button>
                                    <button
                                      onClick={() =>
                                        setShowDeleteConfirm(student.student_id)
                                      }
                                      className={combine(
                                        "p-1 sm:p-1.5 rounded-lg sm:rounded-xl transition-all duration-200 hover:text-[var(--color-accent-error)]",
                                        get("icon", "primary") +
                                          " text-xs sm:text-sm",
                                      )}
                                      title="Delete"
                                    >
                                      <FaTrash className="text-xs sm:text-sm" />
                                    </button>
                                  </div>
                                </td>
                              )}
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* PAGINATION - Responsive */}
              {totalPages > 1 && (
                <div
                  className={combine(
                    "px-3 sm:px-4 py-2 sm:py-3 border-t",
                    get("border", "primary"),
                  )}
                >
                  <div className="flex flex-col sm:flex-row justify-between items-center gap-2 sm:gap-3">
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
                          "p-1 sm:p-1.5 rounded-lg sm:rounded-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed hover:scale-[1.02] active:scale-[0.98] text-xs sm:text-sm",
                          getSecondaryButtonClass(),
                        )}
                      >
                        <FaChevronLeft className="text-xs" />
                      </button>

                      <div className="flex space-x-0.5 sm:space-x-1">
                        {Array.from(
                          { length: Math.min(isMobile ? 3 : 5, totalPages) },
                          (_, i) => {
                            let pageNum: number;
                            if (totalPages <= (isMobile ? 3 : 5)) {
                              pageNum = i + 1;
                            } else if (currentPage <= (isMobile ? 2 : 3)) {
                              pageNum = i + 1;
                            } else if (
                              currentPage >=
                              totalPages - (isMobile ? 1 : 2)
                            ) {
                              pageNum = totalPages - (isMobile ? 2 : 4) + i;
                            } else {
                              pageNum = currentPage - (isMobile ? 1 : 2) + i;
                            }

                            return (
                              <button
                                key={pageNum}
                                onClick={() => setCurrentPage(pageNum)}
                                className={combine(
                                  "px-2 sm:px-3 py-1 sm:py-1.5 rounded-lg sm:rounded-xl transition-all font-medium hover:scale-[1.02] active:scale-[0.98] text-xs",
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
                          "p-1 sm:p-1.5 rounded-lg sm:rounded-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed hover:scale-[1.02] active:scale-[0.98] text-xs sm:text-sm",
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
        )}

        {/* ADD/EDIT FORM */}
        {(mode === "add" || mode === "edit") && (
          <div className="animate-fade-in max-w-2xl lg:max-w-4xl mx-auto">
            <div className={getCardGradientClass()}>
              {/* Form Header */}
              <div className="mb-3 sm:mb-4">
                <div className="flex items-center justify-between mb-2 sm:mb-3">
                  <div className="flex items-center space-x-2 sm:space-x-3">
                    <div
                      className={combine(
                        "p-1.5 sm:p-2 rounded-lg sm:rounded-xl",
                        theme === "dark" ? "bg-blue-900/30" : "bg-blue-100",
                      )}
                    >
                      <FaUserPlus
                        className={combine(
                          "text-base sm:text-lg",
                          theme === "dark" ? "text-blue-400" : "text-blue-600",
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
                        {mode === "edit" ? "Edit Student" : "Add New Student"}
                      </h2>
                      <p
                        className={combine(
                          "text-xs sm:text-sm mt-0.5",
                          get("text", "secondary"),
                        )}
                      >
                        {mode === "edit"
                          ? "Update student information"
                          : "Fill in the details to register a new student"}
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() => {
                      setMode("list");
                      setFormErrors({});
                      setFormData(emptyStudentForm);
                    }}
                    className={combine(
                      "p-1 sm:p-1.5 rounded-lg sm:rounded-xl transition-all hover:bg-[var(--color-bg-hover)]",
                      get("icon", "secondary") + " text-xs sm:text-sm",
                    )}
                  >
                    <FaTimesCircle className="text-xs sm:text-sm" />
                  </button>
                </div>
                <div
                  className={combine(
                    "p-1.5 sm:p-2 rounded-lg sm:rounded-xl text-xs",
                    theme === "dark" ? "bg-blue-900/20" : "bg-blue-50",
                  )}
                >
                  <p
                    className={combine(
                      "flex items-center space-x-1.5 sm:space-x-2",
                      theme === "dark" ? "text-blue-300" : "text-blue-700",
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
                onSubmit={handleSubmit}
                noValidate
                className="space-y-3 sm:space-y-4"
              >
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                  {/* Student ID */}
                  <div>
                    <label
                      className={combine(
                        "block text-xs sm:text-sm font-medium mb-1 sm:mb-1.5",
                        get("text", "primary"),
                      )}
                    >
                      <FaIdCard className="inline mr-1 text-xs sm:text-sm" />
                      Student ID *
                    </label>
                    <input
                      type="text"
                      name="student_id"
                      value={formData.student_id}
                      onChange={handleChange}
                      disabled={mode === "edit"}
                      className={combine(
                        getInputClass(),
                        "disabled:opacity-50",
                      )}
                      placeholder="STU001"
                    />
                    {formErrors.student_id && (
                      <p className="mt-1 text-xs text-red-500">
                        {formErrors.student_id}
                      </p>
                    )}
                  </div>

                  {/* Student Name */}
                  <div>
                    <label
                      className={combine(
                        "block text-xs sm:text-sm font-medium mb-1 sm:mb-1.5",
                        get("text", "primary"),
                      )}
                    >
                      <FaUser className="inline mr-1 text-xs sm:text-sm" />
                      Student Name *
                    </label>
                    <input
                      type="text"
                      name="student_name"
                      value={formData.student_name}
                      onChange={handleChange}
                      className={getInputClass()}
                      placeholder="John Doe"
                    />
                    {formErrors.student_name && (
                      <p className="mt-1 text-xs text-red-500">
                        {formErrors.student_name}
                      </p>
                    )}
                  </div>

                  {/* Email */}
                  <div>
                    <label
                      className={combine(
                        "block text-xs sm:text-sm font-medium mb-1 sm:mb-1.5",
                        get("text", "primary"),
                      )}
                    >
                      <FaEnvelope className="inline mr-1 text-xs sm:text-sm" />
                      Email Address (optional)
                    </label>
                    <input
                      type="email"
                      name="student_email"
                      value={formData.student_email}
                      onChange={handleChange}
                      className={getInputClass()}
                      placeholder="student@example.com"
                    />
                    {formErrors.student_email && (
                      <p className="mt-1 text-xs text-red-500">
                        {formErrors.student_email}
                      </p>
                    )}
                  </div>

                  {/* Gender */}
                  <div>
                    <label
                      className={combine(
                        "block text-xs sm:text-sm font-medium mb-1 sm:mb-1.5",
                        get("text", "primary"),
                      )}
                    >
                      <FaVenusMars className="inline mr-1 text-xs sm:text-sm" />
                      Gender *
                    </label>
                    <select
                      name="gender"
                      value={formData.gender}
                      onChange={handleChange}
                      className={getInputClass()}
                    >
                      <option value="Male">Male</option>
                      <option value="Female">Female</option>
                    </select>
                    {formErrors.gender && (
                      <p className="mt-1 text-xs text-red-500">
                        {formErrors.gender}
                      </p>
                    )}
                  </div>

                  <div>
                    <label
                      className={combine(
                        "block text-xs sm:text-sm font-medium mb-1 sm:mb-1.5",
                        get("text", "primary"),
                      )}
                    >
                      <FaSchool className="inline mr-1 text-xs sm:text-sm" />
                      Accommodation (optional)
                    </label>
                    <select
                      name="accommodation"
                      value={formData.accommodation}
                      onChange={handleChange}
                      className={getInputClass()}
                    >
                      <option value="">Select Accommodation</option>
                      <option value="day_scholar">Day Scholar</option>
                      <option value="hosteller">Hosteller</option>
                    </select>
                  </div>

                  {/* Date of Birth */}
                  <div>
                    <label
                      className={combine(
                        "block text-xs sm:text-sm font-medium mb-1 sm:mb-1.5",
                        get("text", "primary"),
                      )}
                    >
                      <FaCalendar className="inline mr-1 text-xs sm:text-sm" />
                      Date of Birth *
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

                  {/* Date of Admission */}
                  <div>
                    <label
                      className={combine(
                        "block text-xs sm:text-sm font-medium mb-1 sm:mb-1.5",
                        get("text", "primary"),
                      )}
                    >
                      <FaCalendar className="inline mr-1 text-xs sm:text-sm" />
                      Date of Admission (optional)
                    </label>
                    <input
                      type="date"
                      name="date_of_admission"
                      value={formData.date_of_admission}
                      onChange={handleChange}
                      className={getInputClass()}
                    />
                  </div>

                  {/* Father's Name */}
                  <div>
                    <label
                      className={combine(
                        "block text-xs sm:text-sm font-medium mb-1 sm:mb-1.5",
                        get("text", "primary"),
                      )}
                    >
                      <FaUser className="inline mr-1 text-xs sm:text-sm" />
                      Father's Name *
                    </label>
                    <input
                      type="text"
                      name="father_name"
                      value={formData.father_name}
                      onChange={handleChange}
                      className={getInputClass()}
                      placeholder="Father's full name"
                    />
                    {formErrors.father_name && (
                      <p className="mt-1 text-xs text-red-500">
                        {formErrors.father_name}
                      </p>
                    )}
                  </div>

                  {/* Mother's Name */}
                  <div>
                    <label
                      className={combine(
                        "block text-xs sm:text-sm font-medium mb-1 sm:mb-1.5",
                        get("text", "primary"),
                      )}
                    >
                      <FaUser className="inline mr-1 text-xs sm:text-sm" />
                      Mother's Name *
                    </label>
                    <input
                      type="text"
                      name="mother_name"
                      value={formData.mother_name}
                      onChange={handleChange}
                      className={getInputClass()}
                      placeholder="Mother's full name"
                    />
                    {formErrors.mother_name && (
                      <p className="mt-1 text-xs text-red-500">
                        {formErrors.mother_name}
                      </p>
                    )}
                  </div>

                  {/* Father's Phone */}
                  <div>
                    <label
                      className={combine(
                        "block text-xs sm:text-sm font-medium mb-1 sm:mb-1.5",
                        get("text", "primary"),
                      )}
                    >
                      <FaPhone className="inline mr-1 text-xs sm:text-sm" />
                      Father's Phone *
                    </label>
                    <input
                      type="tel"
                      name="father_phone"
                      value={formData.father_phone}
                      onChange={handleChange}
                      inputMode="tel"
                      pattern="^\+?[0-9\s-]{10,20}$"
                      className={getInputClass()}
                      placeholder="+91 9876543210"
                    />
                    {formErrors.father_phone && (
                      <p className="mt-1 text-xs text-red-500">
                        {formErrors.father_phone}
                      </p>
                    )}
                  </div>

                  {/* Mother's Phone */}
                  <div>
                    <label
                      className={combine(
                        "block text-xs sm:text-sm font-medium mb-1 sm:mb-1.5",
                        get("text", "primary"),
                      )}
                    >
                      <FaPhone className="inline mr-1 text-xs sm:text-sm" />
                      Mother's Phone *
                    </label>
                    <input
                      type="tel"
                      name="mother_phone"
                      value={formData.mother_phone}
                      onChange={handleChange}
                      inputMode="tel"
                      pattern="^\+?[0-9\s-]{10,20}$"
                      className={getInputClass()}
                      placeholder="+91 9876543210"
                    />
                    {formErrors.mother_phone && (
                      <p className="mt-1 text-xs text-red-500">
                        {formErrors.mother_phone}
                      </p>
                    )}
                  </div>

                  {/* Class */}
                  <div>
                    <label
                      className={combine(
                        "block text-xs sm:text-sm font-medium mb-1 sm:mb-1.5",
                        get("text", "primary"),
                      )}
                    >
                      <FaSchool className="inline mr-1 text-xs sm:text-sm" />
                      Class (optional)
                    </label>
                    <select
                      name="class_name"
                      value={formData.class_name}
                      onChange={handleChange}
                      className={getInputClass()}
                      disabled={sectionsLoading}
                    >
                      <option value="">Select Class</option>
                      {standards.length > 0 &&
                        standards.map((std) => (
                          <option key={std.id} value={std.name}>
                            Class {std.name}
                          </option>
                        ))}
                    </select>
                    {formErrors.class_name && (
                      <p className="mt-1 text-xs text-red-500">
                        {formErrors.class_name}
                      </p>
                    )}
                  </div>

                  {/* Section */}
                  <div>
                    <label
                      className={combine(
                        "block text-xs sm:text-sm font-medium mb-1 sm:mb-1.5",
                        get("text", "primary"),
                      )}
                    >
                      <MdClass className="inline mr-1 text-xs sm:text-sm" />
                      Section (optional)
                    </label>
                    <select
                      name="section"
                      value={formData.section}
                      onChange={handleChange}
                      className={getInputClass()}
                      disabled={!formData.class_name || sectionsLoading}
                    >
                      <option value="">Select Section</option>
                      {formData.class_name &&
                        standards.length > 0 &&
                        (() => {
                          const selectedStandard = standards.find(
                            (std) => std.name === formData.class_name,
                          );
                          return (
                            selectedStandard?.sections?.map((section) => (
                              <option key={section.id} value={section.name}>
                                Section {section.name}
                              </option>
                            )) || null
                          );
                        })()}
                    </select>
                    {formErrors.section && (
                      <p className="mt-1 text-xs text-red-500">
                        {formErrors.section}
                      </p>
                    )}
                  </div>
                </div>

                {/* Address */}
                <div>
                  <label
                    className={combine(
                      "block text-xs sm:text-sm font-medium mb-1 sm:mb-1.5",
                      get("text", "primary"),
                    )}
                  >
                    <FaMapMarkerAlt className="inline mr-1 text-xs sm:text-sm" />
                    Address (optional)
                  </label>
                  <textarea
                    name="address"
                    value={formData.address}
                    onChange={handleChange}
                    rows={2}
                    className={combine(getInputClass(), "resize-none")}
                    placeholder="Full address"
                  />
                </div>

                {/* Form Actions */}
                <div
                  className={combine(
                    "flex flex-col sm:flex-row gap-2 sm:space-x-2 pt-3 sm:pt-4 border-t",
                    get("border", "primary"),
                  )}
                >
                  <button
                    type="button"
                    onClick={() => {
                      setMode("list");
                      setFormErrors({});
                      setFormData(emptyStudentForm);
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
                            "animate-spin rounded-full h-3 w-3 sm:h-4 sm:w-4 border-b-2",
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
                          {mode === "edit" ? "Update Student" : "Save Student"}
                        </span>
                      </>
                    )}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* STUDENT DETAILS MODAL */}
        {showStudentModal && selectedStudent && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-2 sm:p-4 z-50 animate-fade-in backdrop-blur-sm">
            <div
              className={combine(
                getCardGradientClass(),
                "max-w-full sm:max-w-2xl md:max-w-4xl w-full shadow-2xl max-h-[90vh] overflow-y-auto",
              )}
            >
              {/* Modal Header */}
              <div className="flex items-center justify-between mb-3 sm:mb-4">
                <div className="flex items-center space-x-2 sm:space-x-3">
                  <div
                    className={combine(
                      "p-1.5 sm:p-2 rounded-lg sm:rounded-xl",
                      theme === "dark" ? "bg-blue-900/30" : "bg-blue-100",
                    )}
                  >
                    <FaUserGraduate
                      className={combine(
                        "text-base sm:text-lg",
                        theme === "dark" ? "text-blue-400" : "text-blue-600",
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
                      Student Details
                    </h3>
                    <p
                      className={combine(
                        "text-xs sm:text-sm mt-0.5",
                        get("text", "secondary"),
                      )}
                    >
                      Complete information about {selectedStudent.student_name}
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setShowStudentModal(false)}
                  className={combine(
                    "p-1 sm:p-1.5 rounded-lg sm:rounded-xl transition-all hover:bg-[var(--color-bg-hover)]",
                    get("icon", "secondary") + " text-xs sm:text-sm",
                  )}
                >
                  <FaTimesCircle className="text-xs sm:text-sm" />
                </button>
              </div>

              {/* Modal Content - Responsive Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4 mb-3 sm:mb-4">
                {/* Personal Information */}
                <div
                  className={combine(
                    "rounded-lg sm:rounded-xl p-3 sm:p-4 border",
                    theme === "dark"
                      ? "from-gray-800/50 to-gray-800/30"
                      : "from-blue-50 to-blue-100/30",
                    theme === "dark" ? "border-gray-700" : "border-blue-200",
                    "bg-gradient-to-br",
                  )}
                >
                  <h4
                    className={combine(
                      "font-semibold text-xs sm:text-sm mb-2 sm:mb-3 flex items-center space-x-1.5 sm:space-x-2",
                      get("text", "primary"),
                    )}
                  >
                    <FaUser
                      className={
                        theme === "dark"
                          ? "text-blue-400 text-xs sm:text-sm"
                          : "text-blue-500 text-xs sm:text-sm"
                      }
                    />
                    <span className="text-xs sm:text-sm">
                      Personal Information
                    </span>
                  </h4>
                  <div className="space-y-1.5 sm:space-y-2">
                    <div className="flex justify-between">
                      <span
                        className={combine("text-xs", get("text", "tertiary"))}
                      >
                        Student ID
                      </span>
                      <span
                        className={combine(
                          "font-medium text-xs sm:text-sm",
                          get("text", "primary"),
                        )}
                      >
                        {selectedStudent.student_id}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span
                        className={combine("text-xs", get("text", "tertiary"))}
                      >
                        Full Name
                      </span>
                      <span
                        className={combine(
                          "font-medium text-xs sm:text-sm",
                          get("text", "primary"),
                        )}
                      >
                        {selectedStudent.student_name}
                      </span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span
                        className={combine("text-xs", get("text", "tertiary"))}
                      >
                        Gender
                      </span>
                      <span
                        className={getStatusBadgeClass(
                          selectedStudent.gender === "Male" ? "blue" : "pink",
                        )}
                      >
                        {selectedStudent.gender}
                      </span>
                    </div>
                    {selectedStudent.accommodation && (
                      <div className="flex justify-between">
                        <span
                          className={combine(
                            "text-xs",
                            get("text", "tertiary"),
                          )}
                        >
                          Accommodation
                        </span>
                        <span
                          className={combine(
                            "font-medium text-xs sm:text-sm",
                            get("text", "primary"),
                          )}
                        >
                          {selectedStudent.accommodation === "day_scholar"
                            ? "Day Scholar"
                            : "Hosteller"}
                        </span>
                      </div>
                    )}
                    {selectedStudent.date_of_birth && (
                      <div className="flex justify-between">
                        <span
                          className={combine(
                            "text-xs",
                            get("text", "tertiary"),
                          )}
                        >
                          Date of Birth
                        </span>
                        <span
                          className={combine(
                            "font-medium text-xs sm:text-sm",
                            get("text", "primary"),
                          )}
                        >
                          {selectedStudent.date_of_birth}
                        </span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Academic Information */}
                <div
                  className={combine(
                    "rounded-lg sm:rounded-xl p-3 sm:p-4 border",
                    theme === "dark"
                      ? "from-gray-800/50 to-gray-800/30"
                      : "from-emerald-50 to-emerald-100/30",
                    theme === "dark" ? "border-gray-700" : "border-emerald-200",
                    "bg-gradient-to-br",
                  )}
                >
                  <h4
                    className={combine(
                      "font-semibold text-xs sm:text-sm mb-2 sm:mb-3 flex items-center space-x-1.5 sm:space-x-2",
                      get("text", "primary"),
                    )}
                  >
                    <FaSchool
                      className={
                        theme === "dark"
                          ? "text-emerald-400 text-xs sm:text-sm"
                          : "text-emerald-500 text-xs sm:text-sm"
                      }
                    />
                    <span className="text-xs sm:text-sm">
                      Academic Information
                    </span>
                  </h4>
                  <div className="space-y-1.5 sm:space-y-2">
                    <div className="flex justify-between">
                      <span
                        className={combine("text-xs", get("text", "tertiary"))}
                      >
                        Class
                      </span>
                      <span
                        className={combine(
                          "font-medium text-xs sm:text-sm",
                          get("text", "primary"),
                        )}
                      >
                        {selectedStudent.class_name || "Not Assigned"}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span
                        className={combine("text-xs", get("text", "tertiary"))}
                      >
                        Section
                      </span>
                      <span
                        className={combine(
                          "font-medium text-xs sm:text-sm",
                          get("text", "primary"),
                        )}
                      >
                        {selectedStudent.section || "Not Assigned"}
                      </span>
                    </div>
                    {selectedStudent.student_email && (
                      <div className="flex justify-between">
                        <span
                          className={combine(
                            "text-xs",
                            get("text", "tertiary"),
                          )}
                        >
                          Email
                        </span>
                        <span
                          className={combine(
                            "font-medium text-xs sm:text-sm",
                            get("accent", "primary"),
                          )}
                        >
                          {selectedStudent.student_email}
                        </span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Parent Information */}
                <div className="md:col-span-2">
                  <div
                    className={combine(
                      "rounded-lg sm:rounded-xl p-3 sm:p-4 border",
                      theme === "dark"
                        ? "from-gray-800/50 to-gray-800/30"
                        : "from-purple-50 to-purple-100/30",
                      theme === "dark"
                        ? "border-gray-700"
                        : "border-purple-200",
                      "bg-gradient-to-br",
                    )}
                  >
                    <h4
                      className={combine(
                        "font-semibold text-xs sm:text-sm mb-2 sm:mb-3 flex items-center space-x-1.5 sm:space-x-2",
                        get("text", "primary"),
                      )}
                    >
                      <MdOutlineFamilyRestroom
                        className={
                          theme === "dark"
                            ? "text-purple-400 text-xs sm:text-sm"
                            : "text-purple-500 text-xs sm:text-sm"
                        }
                      />
                      <span className="text-xs sm:text-sm">
                        Parent Information
                      </span>
                    </h4>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                      <div>
                        <div className="space-y-1.5 sm:space-y-2">
                          <div className="flex justify-between">
                            <span
                              className={combine(
                                "text-xs",
                                get("text", "tertiary"),
                              )}
                            >
                              Father's Name
                            </span>
                            <span
                              className={combine(
                                "font-medium text-xs sm:text-sm",
                                get("text", "primary"),
                              )}
                            >
                              {selectedStudent.father_name}
                            </span>
                          </div>
                          {selectedStudent.father_phone && (
                            <div className="flex justify-between">
                              <span
                                className={combine(
                                  "text-xs",
                                  get("text", "tertiary"),
                                )}
                              >
                                Father's Phone
                              </span>
                              <span
                                className={combine(
                                  "font-medium text-xs sm:text-sm",
                                  get("text", "primary"),
                                )}
                              >
                                {selectedStudent.father_phone}
                              </span>
                            </div>
                          )}
                        </div>
                      </div>
                      <div>
                        <div className="space-y-1.5 sm:space-y-2">
                          <div className="flex justify-between">
                            <span
                              className={combine(
                                "text-xs",
                                get("text", "tertiary"),
                              )}
                            >
                              Mother's Name
                            </span>
                            <span
                              className={combine(
                                "font-medium text-xs sm:text-sm",
                                get("text", "primary"),
                              )}
                            >
                              {selectedStudent.mother_name}
                            </span>
                          </div>
                          {selectedStudent.mother_phone && (
                            <div className="flex justify-between">
                              <span
                                className={combine(
                                  "text-xs",
                                  get("text", "tertiary"),
                                )}
                              >
                                Mother's Phone
                              </span>
                              <span
                                className={combine(
                                  "font-medium text-xs sm:text-sm",
                                  get("text", "primary"),
                                )}
                              >
                                {selectedStudent.mother_phone}
                              </span>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Address Section */}
              {selectedStudent.address && (
                <div
                  className={combine(
                    "rounded-lg sm:rounded-xl p-3 sm:p-4 border mb-3 sm:mb-4",
                    theme === "dark"
                      ? "from-gray-800/50 to-gray-800/30"
                      : "from-amber-50 to-amber-100/30",
                    theme === "dark" ? "border-gray-700" : "border-amber-200",
                    "bg-gradient-to-br",
                  )}
                >
                  <h4
                    className={combine(
                      "font-semibold text-xs sm:text-sm mb-2 sm:mb-3 flex items-center space-x-1.5 sm:space-x-2",
                      get("text", "primary"),
                    )}
                  >
                    <FaMapMarkerAlt
                      className={
                        theme === "dark"
                          ? "text-amber-400 text-xs sm:text-sm"
                          : "text-amber-500 text-xs sm:text-sm"
                      }
                    />
                    <span className="text-xs sm:text-sm">Address</span>
                  </h4>
                  <p
                    className={combine(
                      "font-medium text-xs sm:text-sm",
                      get("text", "primary"),
                    )}
                  >
                    {selectedStudent.address}
                  </p>
                </div>
              )}

              {/* Modal Actions */}
              <div
                className={combine(
                  "flex flex-col sm:flex-row gap-2 sm:space-x-2 pt-3 sm:pt-4 border-t",
                  get("border", "primary"),
                )}
              >
                <button
                  onClick={() => {
                    startEdit(selectedStudent);
                    setShowStudentModal(false);
                  }}
                  className={combine(
                    getPrimaryButtonClass(),
                    "flex items-center justify-center space-x-1 sm:space-x-2 text-xs sm:text-sm flex-1",
                    theme === "dark"
                      ? "bg-gradient-to-r from-emerald-600 to-emerald-700 hover:from-emerald-700 hover:to-emerald-800"
                      : "bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-600 hover:to-emerald-700",
                  )}
                >
                  <FaEdit className="text-xs sm:text-sm" />
                  <span className="text-xs sm:text-sm">Edit Student</span>
                </button>
                <button
                  onClick={() => setShowStudentModal(false)}
                  className={combine(
                    getSecondaryButtonClass(),
                    "text-xs sm:text-sm flex-1",
                  )}
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        )}

        {/* DELETE CONFIRMATION MODAL */}
        {showDeleteConfirm && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-2 sm:p-4 z-50 animate-fade-in backdrop-blur-sm">
            <div
              className={combine(
                getCardGradientClass(),
                "max-w-full sm:max-w-md w-full shadow-2xl",
              )}
            >
              <div className="text-center p-4 sm:p-6">
                <div
                  className={combine(
                    "mx-auto flex items-center justify-center h-10 w-10 sm:h-12 sm:w-12 rounded-full mb-2 sm:mb-3",
                    theme === "dark" ? "bg-red-900/30" : "bg-red-100",
                  )}
                >
                  <FaTrash
                    className={combine(
                      "h-4 w-4 sm:h-5 sm:w-5",
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
                  Delete Student
                </h3>
                <p
                  className={combine(
                    "text-xs sm:text-sm mb-3 sm:mb-4",
                    get("text", "secondary"),
                  )}
                >
                  Are you sure you want to delete{" "}
                  <span
                    className={combine("font-semibold", get("text", "primary"))}
                  >
                    {deleteStudentName}
                  </span>
                  ? This action cannot be undone.
                </p>
                <div className="flex flex-col sm:flex-row gap-2 sm:space-x-2">
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
                    onClick={() => deleteStudent(showDeleteConfirm)}
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
