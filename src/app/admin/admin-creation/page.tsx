'use client';

import { useEffect, useState } from 'react';
import { AlertCircle, Building2, Pencil, RefreshCw, ShieldCheck, Trash2, UserPlus, X } from 'lucide-react';
import { adminApi } from '@/lib/api';
import { useAuth } from '@/contexts/AuthContext';
import { toastError, toastSuccess, toastWarning } from '@/lib/toast';
import { useTheme } from '@/contexts/ThemeContext';
import { useThemeClasses } from '@/hooks/useThemeClasses';

type AdminUser = {
  id: number;
  username: string;
  first_name: string;
  last_name: string;
  full_name: string;
  email: string;
  phone: string;
  is_active: boolean;
  school_id: number | null;
  school_name?: string;
};

type SchoolOption = {
  id: number;
  name: string;
  code?: string | null;
  student_count?: number;
  teacher_count?: number;
  staff_count?: number;
};

const initialForm = {
  admin_name: '',
  admin_phone: '',
  admin_email: '',
  admin_password: '',
  school_id: '',
  is_active: true,
};

const getApiMessage = (error: any, fallback: string) => {
  const data = error?.response?.data;
  if (!data) return fallback;
  if (typeof data === 'string') return data;
  return (
    data.detail ||
    data.error ||
    data.message ||
    data.admin_name?.[0] ||
    data.admin_email?.[0] ||
    data.admin_password?.[0] ||
    data.school_id?.[0] ||
    fallback
  );
};

export default function AdminCreationPage() {
  const { user, isLoading } = useAuth();
  const { theme } = useTheme();
  const { get, combine } = useThemeClasses();
  const [admins, setAdmins] = useState<AdminUser[]>([]);
  const [schools, setSchools] = useState<SchoolOption[]>([]);
  const [form, setForm] = useState(initialForm);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [editingAdminId, setEditingAdminId] = useState<number | null>(null);
  const [deletingAdminId, setDeletingAdminId] = useState<number | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);

  const isSuperAdmin = user?.user_type === 'super_admin';

  const loadAdmins = async () => {
    try {
      setLoading(true);
      const response = await adminApi.adminUsers.list();
      setAdmins(response.data?.data || []);
      setLoadError(null);
    } catch (error: any) {
      const message = getApiMessage(error, 'Failed to load admins');
      setLoadError(message);
      toastError(message);
    } finally {
      setLoading(false);
    }
  };

  const loadSchools = async () => {
    try {
      const response = await adminApi.school.schools.list();
      setSchools(response.data || response.data?.data || []);
    } catch (error: any) {
      toastError(getApiMessage(error, 'Failed to load schools'));
    }
  };

  useEffect(() => {
    if (!isLoading && isSuperAdmin) {
      loadAdmins();
      loadSchools();
    } else if (!isLoading) {
      setLoading(false);
    }
  }, [isLoading, isSuperAdmin]);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!form.admin_name.trim() || !form.admin_email.trim() || (!editingAdminId && (!form.admin_password.trim() || !form.school_id))) {
      toastWarning(editingAdminId ? 'Name and email are required' : 'Name, email, password, and school are required');
      return;
    }

    if (form.admin_password && form.admin_password.length < 6) {
      toastWarning('Password must be at least 6 characters');
      return;
    }

    try {
      setSubmitting(true);
      const payload = {
        admin_name: form.admin_name.trim(),
        admin_phone: form.admin_phone.trim(),
        admin_email: form.admin_email.trim(),
        ...(form.admin_password ? { admin_password: form.admin_password } : {}),
        school_id: form.school_id ? Number(form.school_id) : null,
        is_active: form.is_active,
      };
      if (editingAdminId) {
        await adminApi.adminUsers.update(editingAdminId, payload);
        toastSuccess('Admin updated successfully');
      } else {
        await adminApi.adminUsers.create({ ...payload, admin_password: form.admin_password, school_id: Number(form.school_id) });
        toastSuccess('Admin created successfully');
      }
      setForm(initialForm);
      setEditingAdminId(null);
      await loadAdmins();
    } catch (error: any) {
      toastError(getApiMessage(error, editingAdminId ? 'Failed to update admin' : 'Failed to create admin'));
    } finally {
      setSubmitting(false);
    }
  };

  const handleEdit = (admin: AdminUser) => {
    setEditingAdminId(admin.id);
    setForm({
      admin_name: admin.full_name || admin.username,
      admin_phone: admin.phone || '',
      admin_email: admin.email || admin.username,
      admin_password: '',
      school_id: admin.school_id ? String(admin.school_id) : '',
      is_active: admin.is_active,
    });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleDelete = async (admin: AdminUser) => {
    const confirmed = window.confirm(`Delete admin account "${admin.full_name || admin.username}" permanently? This cannot be undone.`);
    if (!confirmed) return;
    try {
      setDeletingAdminId(admin.id);
      await adminApi.adminUsers.delete(admin.id);
      if (editingAdminId === admin.id) {
        setEditingAdminId(null);
        setForm(initialForm);
      }
      await loadAdmins();
      toastSuccess('Admin deleted successfully');
    } catch (error: any) {
      toastError(getApiMessage(error, 'Failed to delete admin'));
    } finally {
      setDeletingAdminId(null);
    }
  };

  if (!isLoading && !isSuperAdmin) {
    return (
      <div className="min-h-full bg-slate-50 p-6">
        <div className="mx-auto max-w-3xl rounded-lg border border-slate-200 bg-white p-6">
          <h1 className="text-xl font-semibold text-slate-950">School Admins</h1>
          <p className="mt-2 text-sm text-slate-600">Only super admin accounts can manage school admins.</p>
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
                <ShieldCheck className="h-5 w-5" />
              </div>
              <div>
                <p className="text-sm font-medium text-blue-700">Super Admin</p>
                <h1 className={`text-2xl font-bold ${get('text', 'primary')}`}>School Admins</h1>
                <p className={`mt-1 text-sm ${get('text', 'secondary')}`}>
                  Create one admin per school or multiple operators for larger campuses.
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => {
                loadAdmins();
                loadSchools();
              }}
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
              <p className="font-semibold">School admins could not be loaded</p>
              <p className="mt-1">{loadError}</p>
            </div>
          </div>
        )}

        <section className="grid gap-6 lg:grid-cols-[420px_1fr]">
          <form onSubmit={handleSubmit} className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
            <h2 className="mb-4 flex items-center gap-2 text-lg font-semibold text-slate-950">
              {editingAdminId ? <Pencil className="h-5 w-5 text-blue-700" /> : <UserPlus className="h-5 w-5 text-blue-700" />}
              {editingAdminId ? 'Edit School Admin' : 'Create School Admin'}
            </h2>

            <div className="space-y-3">
              <label className="block">
                <span className="text-sm font-medium text-slate-700">Assigned school</span>
                <select
                  value={form.school_id}
                  onChange={(event) => setForm({ ...form, school_id: event.target.value })}
                  className="mt-1 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm"
                >
                  <option value="">{editingAdminId ? 'No school assigned' : 'Choose school'}</option>
                  {schools.map((school) => (
                    <option key={school.id} value={school.id}>
                      {school.name}{school.code ? ` (${school.code})` : ''}
                    </option>
                  ))}
                </select>
              </label>

              <label className="block">
                <span className="text-sm font-medium text-slate-700">Admin name</span>
                <input
                  value={form.admin_name}
                  onChange={(event) => setForm({ ...form, admin_name: event.target.value })}
                  className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
                  placeholder="Full name"
                />
              </label>

              <label className="block">
                <span className="text-sm font-medium text-slate-700">Email / username</span>
                <input
                  value={form.admin_email}
                  onChange={(event) => setForm({ ...form, admin_email: event.target.value })}
                  className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
                  placeholder="admin@example.com"
                  type="email"
                />
              </label>

              <label className="block">
                <span className="text-sm font-medium text-slate-700">Phone</span>
                <input
                  value={form.admin_phone}
                  onChange={(event) => setForm({ ...form, admin_phone: event.target.value })}
                  className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
                  placeholder="Phone number"
                />
              </label>

              <label className="block">
                <span className="text-sm font-medium text-slate-700">Password{editingAdminId ? ' (leave blank to keep current)' : ''}</span>
                <input
                  value={form.admin_password}
                  onChange={(event) => setForm({ ...form, admin_password: event.target.value })}
                  className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
                  placeholder={editingAdminId ? 'Optional, minimum 6 characters' : 'Minimum 6 characters'}
                  type="password"
                />
              </label>

              <label className="flex items-center gap-2 text-sm font-medium text-slate-700">
                <input
                  type="checkbox"
                  checked={form.is_active}
                  onChange={(event) => setForm({ ...form, is_active: event.target.checked })}
                  className="h-4 w-4 rounded border-slate-300 text-blue-700"
                />
                Active login
              </label>
            </div>

            <button
              type="submit"
              disabled={submitting}
              className="mt-5 w-full rounded-md bg-blue-700 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-800 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {submitting ? (editingAdminId ? 'Saving...' : 'Creating...') : (editingAdminId ? 'Save changes' : 'Create admin')}
            </button>
            {editingAdminId && (
              <button
                type="button"
                onClick={() => { setEditingAdminId(null); setForm(initialForm); }}
                disabled={submitting}
                className="mt-2 flex w-full items-center justify-center gap-2 rounded-md border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-60"
              >
                <X className="h-4 w-4" /> Cancel editing
              </button>
            )}
          </form>

          <div className="rounded-lg border border-slate-200 bg-white shadow-sm">
            <div className="border-b border-slate-200 p-4">
              <h2 className="flex items-center gap-2 text-lg font-semibold text-slate-950">
                <ShieldCheck className="h-5 w-5 text-blue-700" />
                Existing Admins
              </h2>
              <p className="mt-1 text-sm text-slate-500">{admins.length} admin accounts across {schools.length} schools</p>
            </div>

            {loading ? (
              <div className="divide-y divide-slate-200">
                {Array.from({ length: 5 }).map((_, index) => (
                  <div key={index} className="p-4">
                    <div className="h-5 w-48 animate-pulse rounded bg-slate-100" />
                    <div className="mt-2 h-4 w-64 animate-pulse rounded bg-slate-100" />
                  </div>
                ))}
              </div>
            ) : admins.length === 0 ? (
              <p className="p-5 text-sm text-slate-500">No admins created yet.</p>
            ) : (
              <div className="divide-y divide-slate-200">
                {admins.map((admin) => (
                  <div key={admin.id} className="flex flex-col gap-2 p-4 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <p className="font-semibold text-slate-950">{admin.full_name || admin.username}</p>
                      <p className="text-sm text-slate-500">{admin.email || admin.username}</p>
                      <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-slate-500">
                        {admin.phone && <span>{admin.phone}</span>}
                        <span className="inline-flex items-center gap-1 rounded-full bg-blue-50 px-2 py-1 font-medium text-blue-700">
                          <Building2 className="h-3 w-3" />
                          {admin.school_name || 'No School Assigned'}
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className={`w-fit rounded-full px-3 py-1 text-xs font-semibold ${admin.is_active ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-600'}`}>
                        {admin.is_active ? 'Active' : 'Inactive'}
                      </span>
                      <button type="button" onClick={() => handleEdit(admin)} className="rounded-md p-2 text-blue-700 hover:bg-blue-50" title={`Edit ${admin.full_name || admin.username}`} aria-label={`Edit ${admin.full_name || admin.username}`}>
                        <Pencil className="h-4 w-4" />
                      </button>
                      <button type="button" onClick={() => handleDelete(admin)} disabled={deletingAdminId === admin.id} className="rounded-md p-2 text-red-600 hover:bg-red-50 disabled:opacity-50" title={`Delete ${admin.full_name || admin.username}`} aria-label={`Delete ${admin.full_name || admin.username}`}>
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </section>
      </div>
    </div>
  );
}
