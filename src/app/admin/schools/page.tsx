'use client';

import { useEffect, useMemo, useState } from 'react';
import { AlertCircle, Building2, GraduationCap, Pencil, Plus, RefreshCw, School, Trash2, UserRoundCheck, Users, X } from 'lucide-react';
import { adminApi } from '@/lib/api';
import { useAuth } from '@/contexts/AuthContext';
import { toastError, toastSuccess, toastWarning } from '@/lib/toast';
import { useTheme } from '@/contexts/ThemeContext';
import { useThemeClasses } from '@/hooks/useThemeClasses';

type Institution = {
  id: number;
  name: string;
};

type SchoolRecord = {
  id: number;
  institution?: number | null;
  institution_name?: string | null;
  name: string;
  code?: string | null;
  address?: string;
  contact_phone?: string;
  contact_email?: string;
  logo?: string | null;
  is_active: boolean;
  student_count?: number;
  teacher_count?: number;
  staff_count?: number;
  admin_count?: number;
  total_students?: number;
  total_staffs?: number;
  total_teachers?: number;
  total_non_teaching?: number;
};

const initialForm = {
  institution: '',
  name: '',
  code: '',
  address: '',
  contact_phone: '',
  contact_email: '',
  total_students: 0,
  total_staffs: 0,
  total_teachers: 0,
  total_non_teaching: 0,
  logo: null as File | null,
  is_active: true,
};

const CountCard = ({ label, value, icon: Icon }: { label: string; value: number; icon: any }) => (
  <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm transition hover:border-blue-200 hover:shadow-md">
    <div className="flex items-center justify-between">
      <p className="text-sm font-medium text-slate-600">{label}</p>
      <Icon className="h-5 w-5 text-blue-700" />
    </div>
    <p className="mt-2 text-2xl font-bold text-slate-950">{value}</p>
  </div>
);

const getApiMessage = (error: any, fallback: string) => {
  const data = error?.response?.data;
  if (!data) return fallback;
  if (typeof data === 'string') return data;
  return (
    data.detail ||
    data.error ||
    data.message ||
    data.name?.[0] ||
    data.code?.[0] ||
    data.contact_email?.[0] ||
    fallback
  );
};

export default function SchoolsPage() {
  const { user, isLoading } = useAuth();
  const { theme } = useTheme();
  const { get, combine } = useThemeClasses();
  const [institutions, setInstitutions] = useState<Institution[]>([]);
  const [schools, setSchools] = useState<SchoolRecord[]>([]);
  const [form, setForm] = useState(initialForm);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [editingSchoolId, setEditingSchoolId] = useState<number | null>(null);
  const [deletingSchoolId, setDeletingSchoolId] = useState<number | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);

  const isSuperAdmin = user?.user_type === 'super_admin';

  const totals = useMemo(() => ({
    schools: schools.length,
    students: schools.reduce((sum, school) => sum + Number(school.student_count || 0), 0),
    teachers: schools.reduce((sum, school) => sum + Number(school.teacher_count || 0), 0),
    staff: schools.reduce((sum, school) => sum + Number(school.staff_count || 0), 0),
  }), [schools]);

  const loadData = async () => {
    try {
      setLoading(true);
      const [institutionResponse, schoolResponse] = await Promise.all([
        adminApi.school.institutions.list(),
        adminApi.school.schools.list(),
      ]);
      const institutionData = institutionResponse.data || [];
      setInstitutions(institutionData);
      setSchools(schoolResponse.data || []);
      setLoadError(null);
      if (!form.institution && institutionData[0]?.id) {
        setForm((current) => ({ ...current, institution: String(institutionData[0].id) }));
      }
    } catch (error: any) {
      const message = getApiMessage(error, 'Failed to load schools');
      setLoadError(message);
      toastError(message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!isLoading && isSuperAdmin) {
      loadData();
    } else if (!isLoading) {
      setLoading(false);
    }
  }, [isLoading, isSuperAdmin]);

  const createDefaultInstitution = async () => {
    const name = user?.institution_name && user.institution_name !== 'Institution Overview'
      ? user.institution_name
      : 'Main Institution';
    const response = await adminApi.school.institutions.create({ name });
    const institution = response.data;
    setInstitutions([institution]);
    setForm((current) => ({ ...current, institution: String(institution.id) }));
    return institution.id;
  };

  const resetForm = (institutionId?: string) => {
    setEditingSchoolId(null);
    setForm({
      ...initialForm,
      institution: institutionId || (institutions[0]?.id ? String(institutions[0].id) : ''),
    });
  };

  const handleEdit = (school: SchoolRecord) => {
    setEditingSchoolId(school.id);
    setForm({
      institution: school.institution ? String(school.institution) : '',
      name: school.name || '',
      code: school.code || '',
      address: school.address || '',
      contact_phone: school.contact_phone || '',
      contact_email: school.contact_email || '',
      total_students: Number(school.total_students || 0),
      total_staffs: Number(school.total_staffs || 0),
      total_teachers: Number(school.total_teachers || 0),
      total_non_teaching: Number(school.total_non_teaching || 0),
      logo: null,
      is_active: school.is_active,
    });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleDelete = async (school: SchoolRecord) => {
    const confirmed = window.confirm(
      `Delete "${school.name}" permanently? This can also delete records associated with this school and cannot be undone.`
    );
    if (!confirmed) return;

    try {
      setDeletingSchoolId(school.id);
      await adminApi.school.schools.delete(school.id);
      if (editingSchoolId === school.id) resetForm();
      setSchools((current) => current.filter((item) => item.id !== school.id));
      toastSuccess('School deleted successfully');
    } catch (error: any) {
      toastError(getApiMessage(error, 'Failed to delete school'));
    } finally {
      setDeletingSchoolId(null);
    }
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!form.name.trim()) {
      toastWarning('School name is required');
      return;
    }

    try {
      setSubmitting(true);
      const institutionId = form.institution || String(await createDefaultInstitution());
      const payload = new FormData();
      payload.append('institution', institutionId);
      payload.append('name', form.name.trim());
      if (form.code.trim()) payload.append('code', form.code.trim());
      payload.append('address', form.address.trim());
      payload.append('contact_phone', form.contact_phone.trim());
      payload.append('contact_email', form.contact_email.trim());
      payload.append('total_students', String(form.total_students));
      payload.append('total_staffs', String(form.total_staffs));
      payload.append('total_teachers', String(form.total_teachers));
      payload.append('total_non_teaching', String(form.total_non_teaching));
      payload.append('is_active', String(form.is_active));
      if (form.logo) payload.append('logo', form.logo);
      if (editingSchoolId) {
        await adminApi.school.schools.update(editingSchoolId, payload);
        toastSuccess('School updated successfully');
      } else {
        await adminApi.school.schools.create(payload);
        toastSuccess('School created successfully');
      }
      resetForm(institutionId);
      await loadData();
    } catch (error: any) {
      toastError(getApiMessage(error, editingSchoolId ? 'Failed to update school' : 'Failed to create school'));
    } finally {
      setSubmitting(false);
    }
  };

  if (!isLoading && !isSuperAdmin) {
    return (
      <div className="min-h-full bg-slate-50 p-6">
        <div className="mx-auto max-w-3xl rounded-lg border border-slate-200 bg-white p-6">
          <h1 className="text-xl font-semibold text-slate-950">Schools</h1>
          <p className="mt-2 text-sm text-slate-600">Only super admin accounts can manage schools.</p>
        </div>
      </div>
    );
  }

  return (
    <div className={`min-h-full p-4 sm:p-6 ${theme === 'dark' ? 'bg-gray-950' : 'bg-slate-50'}`}>
      <div className="mx-auto grid gap-6">
        <div className={combine(
          'rounded-xl border p-4 shadow-sm sm:p-5',
          theme === 'dark' ? 'border-gray-800 bg-gray-900' : 'border-slate-200 bg-white'
        )}>
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-start gap-3">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-blue-50 text-blue-700">
                <Building2 className="h-5 w-5" />
              </div>
              <div>
                <p className="text-sm font-medium text-blue-700">Institution Operations</p>
                <h1 className={`text-2xl font-bold ${get('text', 'primary')}`}>Schools</h1>
                <p className={`mt-1 text-sm ${get('text', 'secondary')}`}>
                  Manage every school branch and keep people records separated by campus.
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={loadData}
              disabled={loading}
              className="inline-flex h-10 items-center justify-center gap-2 rounded-md border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50 disabled:cursor-wait disabled:opacity-60"
            >
              <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
              Refresh
            </button>
          </div>
        </div>

        {loadError && (
          <div className="flex items-start gap-3 rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
            <div>
              <p className="font-semibold">Schools could not be loaded</p>
              <p className="mt-1">{loadError}</p>
            </div>
          </div>
        )}

        <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <CountCard label="Schools" value={totals.schools} icon={School} />
          <CountCard label="Students" value={totals.students} icon={GraduationCap} />
          <CountCard label="Teachers" value={totals.teachers} icon={UserRoundCheck} />
          <CountCard label="Staff" value={totals.staff} icon={Users} />
        </section>

        <section className="grid gap-6 lg:grid-cols-[420px_1fr]">
          <form onSubmit={handleSubmit} className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
            <h2 className="mb-4 flex items-center gap-2 text-lg font-semibold text-slate-950">
              {editingSchoolId ? <Pencil className="h-5 w-5 text-blue-700" /> : <Plus className="h-5 w-5 text-blue-700" />}
              {editingSchoolId ? 'Edit School' : 'Create School'}
            </h2>

            <div className="grid gap-3">
              <label className="block">
                <span className="text-sm font-medium text-slate-700">Institution</span>
                <select
                  value={form.institution}
                  onChange={(event) => setForm({ ...form, institution: event.target.value })}
                  className="mt-1 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm"
                >
                  <option value="">Auto create main institution</option>
                  {institutions.map((institution) => (
                    <option key={institution.id} value={institution.id}>{institution.name}</option>
                  ))}
                </select>
              </label>

              <label className="block">
                <span className="text-sm font-medium text-slate-700">School name</span>
                <input value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm" />
              </label>

              <div className="grid gap-3 sm:grid-cols-2">
                <label className="block">
                  <span className="text-sm font-medium text-slate-700">Code</span>
                  <input value={form.code} onChange={(event) => setForm({ ...form, code: event.target.value })} className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm" />
                </label>
                <label className="block">
                  <span className="text-sm font-medium text-slate-700">Phone</span>
                  <input value={form.contact_phone} onChange={(event) => setForm({ ...form, contact_phone: event.target.value })} className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm" />
                </label>
              </div>

              <label className="block">
                <span className="text-sm font-medium text-slate-700">Email</span>
                <input type="email" value={form.contact_email} onChange={(event) => setForm({ ...form, contact_email: event.target.value })} className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm" />
              </label>

              <label className="block">
                <span className="text-sm font-medium text-slate-700">School logo</span>
                <input
                  type="file"
                  accept="image/*"
                  onChange={(event) => setForm({ ...form, logo: event.target.files?.[0] || null })}
                  className="mt-1 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm"
                />
                <span className="mt-1 block text-xs text-slate-500">Used in dashboard headers and school cards.</span>
              </label>

              <label className="block">
                <span className="text-sm font-medium text-slate-700">Address</span>
                <textarea value={form.address} onChange={(event) => setForm({ ...form, address: event.target.value })} className="mt-1 min-h-20 w-full rounded-md border border-slate-300 px-3 py-2 text-sm" />
              </label>

              <label className="flex items-center gap-2 text-sm font-medium text-slate-700">
                <input
                  type="checkbox"
                  checked={form.is_active}
                  onChange={(event) => setForm({ ...form, is_active: event.target.checked })}
                  className="h-4 w-4 rounded border-slate-300 text-blue-700"
                />
                School is active
              </label>
            </div>

            <div className="mt-5 flex gap-2">
              <button type="submit" disabled={submitting} className="flex flex-1 items-center justify-center gap-2 rounded-md bg-blue-700 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-800 disabled:cursor-not-allowed disabled:opacity-60">
                {editingSchoolId ? <Pencil className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
                {submitting ? (editingSchoolId ? 'Saving...' : 'Creating...') : (editingSchoolId ? 'Save changes' : 'Create school')}
              </button>
              {editingSchoolId && (
                <button
                  type="button"
                  onClick={() => resetForm()}
                  disabled={submitting}
                  className="inline-flex items-center justify-center gap-2 rounded-md border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-60"
                >
                  <X className="h-4 w-4" />
                  Cancel
                </button>
              )}
            </div>
          </form>

          <div className="rounded-lg border border-slate-200 bg-white shadow-sm">
            <div className="border-b border-slate-200 p-4">
              <h2 className="flex items-center gap-2 text-lg font-semibold text-slate-950">
                <Building2 className="h-5 w-5 text-blue-700" />
                School Directory
              </h2>
            </div>

            {loading ? (
              <div className="grid gap-3 p-4 md:grid-cols-2">
                {Array.from({ length: 4 }).map((_, index) => (
                  <div key={index} className="h-40 animate-pulse rounded-lg border border-slate-200 bg-slate-50" />
                ))}
              </div>
            ) : schools.length === 0 ? (
              <p className="p-5 text-sm text-slate-500">No schools created yet.</p>
            ) : (
              <div className="grid gap-3 p-4 md:grid-cols-2">
                {schools.map((school) => (
                  <article key={school.id} className="rounded-lg border border-slate-200 p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <div className="flex items-center gap-3">
                          <img
                            src={school.logo || '/school_logo.jpeg'}
                            alt={`${school.name} logo`}
                            className="h-11 w-11 rounded-lg border border-slate-200 bg-white object-contain p-1"
                            onError={(event) => {
                              event.currentTarget.src = '/school_logo.jpeg';
                            }}
                          />
                          <div>
                            <h3 className="font-semibold text-slate-950">{school.name}</h3>
                            <p className="text-sm text-slate-500">{school.institution_name || 'No institution'}</p>
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => handleEdit(school)}
                          className="rounded-md p-2 text-blue-700 transition hover:bg-blue-50"
                          title={`Edit ${school.name}`}
                          aria-label={`Edit ${school.name}`}
                        >
                          <Pencil className="h-4 w-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDelete(school)}
                          disabled={deletingSchoolId === school.id}
                          className="rounded-md p-2 text-red-600 transition hover:bg-red-50 disabled:cursor-wait disabled:opacity-50"
                          title={`Delete ${school.name}`}
                          aria-label={`Delete ${school.name}`}
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                    <span className={`mt-3 inline-flex rounded-full px-2 py-1 text-xs font-semibold ${school.is_active ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-600'}`}>
                      {school.is_active ? 'Active' : 'Inactive'}
                    </span>
                    {school.address && <p className="mt-3 text-sm text-slate-600">{school.address}</p>}
                    <div className="mt-4 grid grid-cols-4 gap-2 text-center text-xs">
                      <div className="rounded-md bg-slate-50 p-2"><b className="block text-slate-950">{school.student_count || 0}</b>Students</div>
                      <div className="rounded-md bg-slate-50 p-2"><b className="block text-slate-950">{school.teacher_count || 0}</b>Teachers</div>
                      <div className="rounded-md bg-slate-50 p-2"><b className="block text-slate-950">{school.staff_count || 0}</b>Staff</div>
                      <div className="rounded-md bg-slate-50 p-2"><b className="block text-slate-950">{school.admin_count || 0}</b>Admins</div>
                    </div>
                  </article>
                ))}
              </div>
            )}
          </div>
        </section>
      </div>
    </div>
  );
}
