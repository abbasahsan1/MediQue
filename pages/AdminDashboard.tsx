import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { QRCodeSVG } from 'qrcode.react';
import { queueService, DoctorRecord } from '../services/queueService';
import { QueueStats, Department, DepartmentConfig } from '../types';
import { DEPARTMENTS } from '../constants';
import { QueueGraph } from '../components/QueueGraph';
import {
  BarChart2, Users, QrCode, CheckCircle, Building2,
  ToggleLeft, ToggleRight, Clock, AlertTriangle,
  ShieldCheck, Activity, LogOut, UserPlus, Trash2, Stethoscope,
} from 'lucide-react';

type ManagedDepartment = DepartmentConfig & { isActive: boolean };

const BASE_URL = import.meta.env.VITE_BASE_URL as string | undefined;

/* ── Admin Login Gate ─────────────────────────────── */

function AdminLogin({ onSuccess }: { onSuccess: () => void }) {
  const navigate = useNavigate();
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!password) return;
    setError(null);
    setLoading(true);
    try {
      const ok = await queueService.adminLogin(password);
      if (!ok) {
        setError('Invalid admin password.');
        setLoading(false);
        return;
      }
      onSuccess();
    } catch {
      setError('Login failed.');
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <header className="border-b border-border px-6 py-4 flex items-center gap-2.5">
        <button onClick={() => navigate('/')} className="flex items-center gap-2.5" type="button">
          <div className="h-9 w-9 bg-primary text-primary-foreground rounded-md flex items-center justify-center font-bold text-lg">
            G
          </div>
          <span className="text-lg font-bold text-foreground tracking-tight">Gravity</span>
        </button>
      </header>
      <div className="flex-1 flex items-center justify-center p-6">
        <div className="w-full max-w-sm">
          <div className="flex flex-col items-center mb-8">
            <div className="icon-circle icon-circle-muted mb-4" style={{ width: 56, height: 56 }}>
              <ShieldCheck size={26} />
            </div>
            <h1 className="text-xl font-bold text-foreground">Admin Login</h1>
            <p className="text-sm text-muted-foreground mt-1">Enter the admin password to continue.</p>
          </div>
          {error && (
            <div className="alert alert-error mb-4">
              <AlertTriangle size={14} /><span>{error}</span>
            </div>
          )}
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label htmlFor="admin-pass" className="block text-sm font-semibold text-foreground mb-1.5">Password</label>
              <input
                id="admin-pass"
                type="password"
                required
                autoFocus
                autoComplete="current-password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="input-field"
              />
            </div>
            <button type="submit" disabled={loading || !password} className="btn-primary w-full justify-center py-3">
              {loading ? 'Verifying…' : 'Login'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}

/* ── Admin Dashboard ──────────────────────────────── */

export const AdminDashboard: React.FC = () => {
  const navigate = useNavigate();
  const [authed, setAuthed] = useState(() => queueService.isAdminAuthenticated());

  if (!authed) {
    return <AdminLogin onSuccess={() => setAuthed(true)} />;
  }

  return <AdminDashboardInner onLogout={() => {
    queueService.adminLogout();
    navigate('/', { replace: true });
  }} />;
};

function AdminDashboardInner({ onLogout }: { onLogout: () => void }) {
  const [stats, setStats] = useState<Record<Department, QueueStats>>({} as Record<Department, QueueStats>);
  const [activeTab, setActiveTab] = useState<'overview' | 'qr' | 'departments' | 'doctors'>('overview');
  const [departments, setDepartments] = useState<ManagedDepartment[]>([]);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [deptError, setDeptError] = useState<string | null>(null);
  const [newDepartment, setNewDepartment] = useState({ id: '', name: '', code: '' });
  const [creatingDepartment, setCreatingDepartment] = useState(false);

  // Doctor management state
  const [doctors, setDoctors] = useState<DoctorRecord[]>([]);
  const [doctorForm, setDoctorForm] = useState({ name: '', email: '', password: '', departmentId: '' });
  const [doctorError, setDoctorError] = useState<string | null>(null);
  const [creatingDoctor, setCreatingDoctor] = useState(false);

  useEffect(() => {
    const load = async () => {
      try {
        const nextStats = await queueService.getAllStats();
        setStats(nextStats);
        setLoadError(null);
      } catch (err) {
        setLoadError(err instanceof Error ? err.message : 'Failed to load stats');
      }
      try {
        const nextDepts = await queueService.getManagedDepartments();
        setDepartments(nextDepts as ManagedDepartment[]);
      } catch {}
    };
    void load();
    const iv = setInterval(() => { void load(); }, 5000);
    return () => clearInterval(iv);
  }, []);

  // Load doctors when tab is active
  useEffect(() => {
    if (activeTab !== 'doctors') return;
    const loadDoctors = async () => {
      try {
        const list = await queueService.listDoctors();
        setDoctors(list);
      } catch {}
    };
    void loadDoctors();
  }, [activeTab]);

  const toggleDepartment = async (department: ManagedDepartment) => {
    setDeptError(null);
    try {
      await queueService.updateDepartment(department.id as Department, { isActive: !department.isActive });
      const next = await queueService.getManagedDepartments();
      setDepartments(next as ManagedDepartment[]);
    } catch (err) {
      setDeptError(err instanceof Error ? err.message : 'Failed to update department.');
    }
  };

  const createDepartment = async (event: React.FormEvent) => {
    event.preventDefault();
    setDeptError(null);
    const id = newDepartment.id.trim().toUpperCase();
    const name = newDepartment.name.trim();
    const code = newDepartment.code.trim().toUpperCase();
    if (!id || !name || !code) { setDeptError('All fields required.'); return; }
    setCreatingDepartment(true);
    try {
      await queueService.createDepartment({ id, name, code, color: 'bg-dept-general' });
      const next = await queueService.getManagedDepartments();
      setDepartments(next as ManagedDepartment[]);
      setNewDepartment({ id: '', name: '', code: '' });
    } catch (err) {
      setDeptError(err instanceof Error ? err.message : 'Failed to create department.');
    } finally {
      setCreatingDepartment(false);
    }
  };

  const handleCreateDoctor = async (e: React.FormEvent) => {
    e.preventDefault();
    setDoctorError(null);
    if (!doctorForm.name.trim() || !doctorForm.email.trim() || !doctorForm.password || !doctorForm.departmentId) {
      setDoctorError('All fields are required.');
      return;
    }
    setCreatingDoctor(true);
    try {
      await queueService.createDoctorAccount(
        doctorForm.name.trim(),
        doctorForm.email.trim(),
        doctorForm.password,
        doctorForm.departmentId,
      );
      setDoctorForm({ name: '', email: '', password: '', departmentId: '' });
      const list = await queueService.listDoctors();
      setDoctors(list);
    } catch (err) {
      setDoctorError(err instanceof Error ? err.message : 'Failed to create doctor.');
    } finally {
      setCreatingDoctor(false);
    }
  };

  const handleDeleteDoctor = async (id: string) => {
    if (!window.confirm('Remove this doctor account?')) return;
    try {
      await queueService.deleteDoctor(id);
      setDoctors((prev) => prev.filter((d) => d.id !== id));
    } catch (err) {
      setDoctorError(err instanceof Error ? err.message : 'Failed to delete doctor.');
    }
  };

  const totalWaiting = Object.values(stats).reduce((acc, stat) => acc + stat.waiting, 0);
  const totalCompleted = Object.values(stats).reduce((acc, stat) => acc + stat.completed, 0);
  const totalActiveDepartments = departments.filter((d) => d.isActive).length;
  const qrDepartments = departments.length > 0 ? departments : Object.values(DEPARTMENTS) as unknown as ManagedDepartment[];
  const statsReady = Object.keys(stats).length > 0;

  const TABS = [
    { id: 'overview', label: 'Overview', icon: <BarChart2 size={14} /> },
    { id: 'doctors', label: 'Doctors', icon: <Stethoscope size={14} /> },
    { id: 'qr', label: 'QR Codes', icon: <QrCode size={14} /> },
    { id: 'departments', label: 'Departments', icon: <Building2 size={14} /> },
  ] as const;

  const activeDepts = departments.filter((d) => d.isActive);

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <header className="border-b border-border px-5 py-3 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="h-9 w-9 bg-primary text-primary-foreground rounded-md flex items-center justify-center font-bold text-lg">
            G
          </div>
          <div>
            <span className="text-sm font-bold text-foreground">Admin Panel</span>
            <p className="text-xs text-muted-foreground">Gravity Management</p>
          </div>
        </div>
        <button onClick={onLogout} className="btn-ghost flex items-center gap-1.5 text-sm">
          <LogOut size={14} /> Logout
        </button>
      </header>

      <main className="flex-1 p-5 md:p-6">
        <div className="max-w-6xl mx-auto space-y-6">
          {/* Summary stats */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="stat-block">
              <div className="icon-circle icon-circle-brand"><Users size={21} /></div>
              <div>
                <p className="text-2xl font-bold text-foreground">{totalWaiting}</p>
                <p className="text-sm">Currently Waiting</p>
              </div>
            </div>
            <div className="stat-block">
              <div className="icon-circle icon-circle-success"><CheckCircle size={21} /></div>
              <div>
                <p className="text-2xl font-bold text-foreground">{totalCompleted}</p>
                <p className="text-sm">Served Today</p>
              </div>
            </div>
            <div className="stat-block">
              <div className="icon-circle icon-circle-muted"><Building2 size={21} /></div>
              <div>
                <p className="text-2xl font-bold text-foreground">{totalActiveDepartments || Object.keys(stats).length}</p>
                <p className="text-sm">Active Depts</p>
              </div>
            </div>
          </div>

          {/* Tabs */}
          <div className="flex items-center gap-1 bg-surface border border-border rounded-lg p-1 w-fit">
            {TABS.map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id)}
                className={`tab ${activeTab === tab.id ? 'active' : ''}`}
              >
                {tab.icon} {tab.label}
              </button>
            ))}
          </div>

          {loadError && <div className="alert alert-error"><AlertTriangle size={15} />{loadError}</div>}

          {/* Overview */}
          {activeTab === 'overview' && (
            <div className="space-y-6">
              {!statsReady && <div className="card p-6">Loading live stats…</div>}
              <div>{statsReady && <QueueGraph stats={stats} />}</div>
              {statsReady && (
                <div className="card overflow-hidden">
                  <div className="px-6 py-4 border-b border-border"><h3>Department Breakdown</h3></div>
                  <div className="overflow-x-auto">
                    <table className="w-full text-left">
                      <thead>
                        <tr className="bg-surface-muted border-b border-border">
                          {['Department', 'Waiting', 'Avg Wait', 'Completed'].map((h) => (
                            <th key={h} className="px-6 py-3 text-xs font-semibold uppercase tracking-widest text-muted-foreground">{h}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-border">
                        {Object.entries(stats).map(([deptId, stat]) => (
                          <tr key={deptId}>
                            <td className="px-6 py-4 text-sm font-semibold text-foreground">
                              {DEPARTMENTS[deptId as Department]?.name ?? deptId}
                            </td>
                            <td className="px-6 py-4 text-sm text-secondary">{stat.waiting}</td>
                            <td className="px-6 py-4">
                              <span className={`badge ${stat.avgWaitTime > 20 ? 'badge-destructive' : 'badge-success'}`}>
                                <Clock size={9} /> {stat.avgWaitTime}m
                              </span>
                            </td>
                            <td className="px-6 py-4 text-sm text-secondary">{stat.completed}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Doctors tab */}
          {activeTab === 'doctors' && (
            <div className="space-y-5">
              <div className="card p-0 overflow-hidden">
                <div className="px-6 py-5 border-b border-border">
                  <h3>Create Doctor Account</h3>
                  <p className="text-sm">Add a new doctor and assign them to a department.</p>
                </div>
                {doctorError && <div className="alert alert-error m-4"><AlertTriangle size={15} />{doctorError}</div>}
                <form onSubmit={handleCreateDoctor} className="px-6 py-5 space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-semibold text-foreground mb-1.5">Full Name</label>
                      <input
                        value={doctorForm.name}
                        onChange={(e) => setDoctorForm((p) => ({ ...p, name: e.target.value }))}
                        className="input-field"
                        placeholder="Dr. Ahmed"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-foreground mb-1.5">Email</label>
                      <input
                        type="email"
                        value={doctorForm.email}
                        onChange={(e) => setDoctorForm((p) => ({ ...p, email: e.target.value }))}
                        className="input-field"
                        placeholder="doctor@hospital.com"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-foreground mb-1.5">Password</label>
                      <input
                        type="password"
                        value={doctorForm.password}
                        onChange={(e) => setDoctorForm((p) => ({ ...p, password: e.target.value }))}
                        className="input-field"
                        placeholder="Set a password"
                        required
                        autoComplete="new-password"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-foreground mb-1.5">Department</label>
                      <select
                        value={doctorForm.departmentId}
                        onChange={(e) => setDoctorForm((p) => ({ ...p, departmentId: e.target.value }))}
                        className="input-field"
                        required
                      >
                        <option value="">Select department</option>
                        {activeDepts.map((d) => (
                          <option key={d.id} value={d.id}>{d.name}</option>
                        ))}
                      </select>
                    </div>
                  </div>
                  <button type="submit" disabled={creatingDoctor} className="btn-primary">
                    <UserPlus size={14} /> {creatingDoctor ? 'Creating…' : 'Create Account'}
                  </button>
                </form>
              </div>

              <div className="card p-0 overflow-hidden">
                <div className="px-6 py-4 border-b border-border">
                  <h3>Registered Doctors</h3>
                </div>
                {doctors.length === 0 ? (
                  <div className="px-6 py-8 text-center text-sm text-muted-foreground">No doctors registered yet.</div>
                ) : (
                  <div className="divide-y divide-border">
                    {doctors.map((doc) => (
                      <div key={doc.id} className="flex items-center justify-between px-6 py-4">
                        <div>
                          <p className="font-semibold text-foreground text-sm">{doc.name}</p>
                          <p className="text-xs text-muted-foreground">{doc.email} · {doc.department_name}</p>
                        </div>
                        <button
                          type="button"
                          onClick={() => void handleDeleteDoctor(doc.id)}
                          className="btn-ghost text-destructive hover:bg-destructive/10 btn-sm"
                          aria-label={`Delete ${doc.name}`}
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* QR codes */}
          {activeTab === 'qr' && (
            <div className="space-y-4">
              {!BASE_URL && (
                <div className="alert alert-warn">
                  <AlertTriangle size={15} />
                  VITE_BASE_URL is not configured. QR codes will use the current origin as fallback.
                </div>
              )}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                {qrDepartments.map((dept) => {
                  const origin = BASE_URL ?? window.location.origin;
                  const checkinUrl = `${origin}/${dept.id.toLowerCase()}/newpatient`;
                  return (
                    <div key={dept.id} className="card p-6 flex flex-col items-center text-center">
                      <div className={`w-full h-1 rounded-full ${dept.color} mb-5`} />
                      <h3 className="text-base font-bold text-foreground mb-1">{dept.name}</h3>
                      <p className="text-xs mb-5">Scan to enter queue</p>
                      <div className="bg-white p-4 rounded-lg mb-4">
                        <QRCodeSVG value={checkinUrl} size={160} level="M" />
                      </div>
                      <p className="text-xs text-muted-foreground mb-3 break-all max-w-[220px]">{checkinUrl}</p>
                      <button type="button" onClick={() => window.print()} className="btn-outline btn-sm text-sm">
                        Print Poster
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Departments */}
          {activeTab === 'departments' && (
            <div className="card p-0 overflow-hidden">
              <div className="px-6 py-5 border-b border-border">
                <h3>Department Management</h3>
                <p className="text-sm">Create, enable, and disable departments.</p>
              </div>
              <form onSubmit={createDepartment} className="px-6 py-5 border-b border-border bg-surface-muted/40">
                <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-3">Add Department</p>
                <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                  <input
                    value={newDepartment.id}
                    onChange={(e) => setNewDepartment((p) => ({ ...p, id: e.target.value }))}
                    className="input-field"
                    placeholder="ID (e.g. PEDIATRICS)"
                  />
                  <input
                    value={newDepartment.name}
                    onChange={(e) => setNewDepartment((p) => ({ ...p, name: e.target.value }))}
                    className="input-field md:col-span-2"
                    placeholder="Department name"
                  />
                  <div className="flex gap-3">
                    <input
                      value={newDepartment.code}
                      onChange={(e) => setNewDepartment((p) => ({ ...p, code: e.target.value }))}
                      className="input-field"
                      placeholder="Code"
                      maxLength={5}
                    />
                    <button type="submit" className="btn-primary" disabled={creatingDepartment}>
                      {creatingDepartment ? 'Adding…' : 'Add'}
                    </button>
                  </div>
                </div>
              </form>
              {deptError && <div className="alert alert-error m-4"><AlertTriangle size={15} />{deptError}</div>}
              <div className="divide-y divide-border">
                {departments.map((department) => (
                  <div key={department.id} className="flex items-center justify-between px-6 py-4">
                    <div className="flex items-center gap-4">
                      <div className={`w-2.5 h-2.5 rounded-full ${department.color}`} />
                      <div>
                        <p className="font-semibold text-foreground">{department.name}</p>
                        <p className="text-xs">Code: {department.code}</p>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => void toggleDepartment(department)}
                      className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-semibold border ${
                        department.isActive
                          ? 'border-success/50 bg-success/14 text-success'
                          : 'border-border bg-surface-muted text-secondary'
                      }`}
                    >
                      {department.isActive ? <ToggleRight size={16} /> : <ToggleLeft size={16} />}
                      {department.isActive ? 'Active' : 'Inactive'}
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
