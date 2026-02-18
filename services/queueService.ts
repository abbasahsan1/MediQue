import { RealtimeChannel } from '@supabase/supabase-js';
import { Department, DepartmentConfig, Gender, Patient, PatientStatus, QueueStats } from '../types';
import { DEPARTMENTS, URGENT_KEYWORDS } from '../constants';
import { supabase } from './supabaseClient';

const STORAGE_PATIENT_ID = 'mediqueue_patient_id';
const STORAGE_GUEST_UUID = 'mediqueue_guest_uuid';
const STORAGE_DOCTOR_SESSION = 'mediqueue_doctor_session';
const STORAGE_ADMIN_AUTH = 'mediqueue_admin_auth';

interface VisitRow {
  id: string;
  patient_name: string;
  age: number;
  gender: string | null;
  problem_description: string | null;
  symptoms: string[] | null;
  department_id: string;
  assigned_doctor_id: string | null;
  status: 'SCANNED' | 'WAITING' | 'URGENT' | 'CALLED' | 'IN_CONSULTATION' | 'COMPLETED' | 'NO_SHOW';
  token_number: number;
  created_at: string;
  called_at: string | null;
  completed_at: string | null;
  prescription_text: string | null;
  version: number;
  doctors?: { name?: string | null } | null;
  departments?: { code?: string | null } | null;
}

interface DepartmentRow {
  id: string;
  name: string;
  code: string;
  color: string;
  is_active: boolean;
}

function isUrgentText(text: string): boolean {
  const lower = text.toLowerCase();
  return URGENT_KEYWORDS.some((kw) => lower.includes(kw));
}

class QueueService {
  private patientsById = new Map<string, Patient>();
  private queueByDepartment = new Map<string, Patient[]>();
  private channels = new Map<string, RealtimeChannel>();
  private subscribers = new Map<string, Set<() => void>>();
  private departmentsCache: Array<DepartmentConfig & { isActive: boolean }> | null = null;

  getGuestUuid(): string {
    const existing = localStorage.getItem(STORAGE_GUEST_UUID);
    if (existing) return existing;
    const next = crypto.randomUUID();
    localStorage.setItem(STORAGE_GUEST_UUID, next);
    return next;
  }

  private async ensureSession(): Promise<string | null> {
    try {
      const { data } = await supabase.auth.getSession();
      if (data.session?.user?.id) return data.session.user.id;
      // Attempt anonymous sign-in; returns null if disabled in project settings
      const { data: anonData } = await supabase.auth.signInAnonymously();
      return anonData.user?.id ?? null;
    } catch {
      return null;
    }
  }

  private mapVisit(row: VisitRow): Patient {
    const symptoms = Array.isArray(row.symptoms) ? row.symptoms : [];
    const problemDesc = row.problem_description ?? '';
    const isUrgent = row.status === 'URGENT'
      || isUrgentText(problemDesc)
      || symptoms.some((s) => isUrgentText(s));

    const status = row.status === 'CALLED'
      ? PatientStatus.CALLED
      : row.status === 'IN_CONSULTATION'
        ? PatientStatus.IN_CONSULTATION
        : row.status === 'COMPLETED'
          ? PatientStatus.COMPLETED
          : row.status === 'NO_SHOW'
            ? PatientStatus.NO_SHOW
            : PatientStatus.WAITING;

    const deptCode = row.departments?.code ?? DEPARTMENTS[row.department_id]?.code ?? row.department_id.slice(0, 3).toUpperCase();
    return {
      id: row.id,
      name: row.patient_name,
      age: row.age,
      gender: (row.gender as Gender) ?? undefined,
      problemDescription: row.problem_description ?? undefined,
      symptoms,
      isUrgent,
      department: row.department_id,
      status,
      tokenNumber: `${deptCode}-${row.token_number}`,
      checkInTime: new Date(row.created_at).getTime(),
      calledTime: row.called_at ? new Date(row.called_at).getTime() : undefined,
      completedTime: row.completed_at ? new Date(row.completed_at).getTime() : undefined,
      notes: row.prescription_text ?? undefined,
      assignedDoctor: row.doctors?.name ?? undefined,
      version: row.version,
    };
  }

  async checkIn(
    name: string,
    age: number,
    department: Department,
    problemDescription: string,
    gender?: Gender,
  ): Promise<Patient> {
    const authId = await this.ensureSession();
    const guestUuid = this.getGuestUuid();

    // Primary path: use the create_visit RPC (handles token generation atomically)
    const rpc = await supabase.rpc('create_visit', {
      p_department_id: department,
      p_patient_name: name,
      p_age: age,
      p_symptoms: [] as string[],
      p_guest_uuid: guestUuid,
      p_patient_auth_id: authId,
      p_gender: gender ?? null,
      p_problem_description: problemDescription,
    });

    let row = (rpc.data?.[0] ?? rpc.data) as VisitRow | null;
    if (rpc.error || !row) {
      // Fallback: generate token separately then insert
      const token = await supabase.rpc('generate_token', { dept_id: department });
      if (token.error) throw new Error(token.error.message);

      const inserted = await supabase
        .from('visits')
        .insert({
          patient_name: name,
          age,
          symptoms: [] as string[],
          department_id: department,
          status: 'WAITING',
          token_number: Number(token.data),
          guest_uuid: guestUuid,
          patient_auth_id: authId,
          gender: gender ?? null,
          problem_description: problemDescription,
        })
        .select('*, departments(code), doctors(name)')
        .single();

      if (inserted.error || !inserted.data) throw new Error(inserted.error?.message ?? 'Check-in failed');
      row = inserted.data as VisitRow;
    }

    const patient = this.mapVisit(row);
    localStorage.setItem(STORAGE_PATIENT_ID, patient.id);
    this.patientsById.set(patient.id, patient);
    await this.refreshDepartment(department);
    return patient;
  }

  /** Find an active visit for the current guest in a given department */
  async findActiveVisitForGuest(departmentId?: string): Promise<Patient | undefined> {
    const guestUuid = localStorage.getItem(STORAGE_GUEST_UUID);
    if (!guestUuid) return undefined;

    let query = supabase
      .from('visits')
      .select('*, departments(code), doctors(name)')
      .eq('guest_uuid', guestUuid)
      .in('status', ['WAITING', 'URGENT', 'CALLED', 'IN_CONSULTATION'])
      .order('created_at', { ascending: false })
      .limit(1);

    if (departmentId) {
      query = query.eq('department_id', departmentId);
    }

    const { data, error } = await query.maybeSingle();
    if (error || !data) return undefined;

    const patient = this.mapVisit(data as VisitRow);
    this.patientsById.set(patient.id, patient);
    return patient;
  }

  async fetchPatient(patientId: string): Promise<Patient | undefined> {
    const response = await supabase
      .from('visits')
      .select('*, departments(code), doctors(name)')
      .eq('id', patientId)
      .maybeSingle();

    if (response.error || !response.data) {
      this.patientsById.delete(patientId);
      return undefined;
    }

    const patient = this.mapVisit(response.data as VisitRow);
    this.patientsById.set(patient.id, patient);
    return patient;
  }

  getPatient(id: string): Patient | undefined {
    return this.patientsById.get(id);
  }

  async getManagedDepartments(): Promise<Array<DepartmentConfig & { isActive: boolean }>> {
    if (this.departmentsCache) return this.departmentsCache;

    const response = await supabase
      .from('departments')
      .select('id, name, code, color, is_active')
      .order('name', { ascending: true });

    if (response.error || !response.data) {
      const fallback = Object.values(DEPARTMENTS).map((department) => ({ ...department, isActive: true }));
      this.departmentsCache = fallback;
      return fallback;
    }

    const records = (response.data as DepartmentRow[]).map((department) => ({
      id: department.id,
      name: department.name,
      code: department.code,
      color: department.color,
      isActive: department.is_active,
    }));
    this.departmentsCache = records;
    return records;
  }

  async getDepartments(): Promise<DepartmentConfig[]> {
    const records = await this.getManagedDepartments();
    return records.filter((department) => department.isActive);
  }

  async updateDepartment(departmentId: Department, payload: { isActive?: boolean; name?: string; code?: string }): Promise<void> {
    const response = await supabase
      .from('departments')
      .update({
        is_active: payload.isActive,
        name: payload.name,
        code: payload.code?.toUpperCase(),
      })
      .eq('id', departmentId);
    if (response.error) throw new Error(response.error.message);
    this.departmentsCache = null;
  }

  async createDepartment(payload: { id: string; name: string; code: string; color?: string }): Promise<void> {
    const response = await supabase
      .from('departments')
      .insert({
        id: payload.id.trim().toUpperCase(),
        name: payload.name.trim(),
        code: payload.code.trim().toUpperCase(),
        color: payload.color ?? 'bg-dept-general',
        is_active: true,
      });
    if (response.error) throw new Error(response.error.message);
    this.departmentsCache = null;
  }

  async refreshDepartment(department: Department): Promise<Patient[]> {
    const response = await supabase
      .from('visits')
      .select('*, departments(code), doctors(name)')
      .eq('department_id', department)
      .order('created_at', { ascending: true });

    if (response.error) throw new Error(response.error.message);
    const mapped = (response.data as VisitRow[]).map((row) => this.mapVisit(row));
    this.queueByDepartment.set(department, mapped);
    mapped.forEach((patient) => this.patientsById.set(patient.id, patient));
    return mapped.slice();
  }

  async refreshAllDepartments(): Promise<void> {
    const departments = await this.getManagedDepartments();
    const active = departments.filter((department) => department.isActive);
    await Promise.all(active.map((department) => this.refreshDepartment(department.id)));
  }

  getQueue(department?: Department): Patient[] {
    if (department) return (this.queueByDepartment.get(department) ?? []).slice();
    return [...this.queueByDepartment.values()].flat();
  }

  async callNextFromDepartment(departmentId: Department, doctorName: string): Promise<Patient | null> {
    const claim = await supabase.rpc('claim_next_visit', {
      p_department_id: departmentId,
      p_doctor_name: doctorName,
    });
    if (claim.error || !claim.data) return null;

    const raw = Array.isArray(claim.data) ? claim.data[0] : claim.data;
    if (!raw) return null;
    const row = raw as VisitRow;
    const patient = this.mapVisit(row);
    this.patientsById.set(patient.id, patient);
    await this.refreshDepartment(departmentId);
    return patient;
  }

  private async transitionVisit(patient: Patient, toStatus: 'IN_CONSULTATION' | 'COMPLETED' | 'NO_SHOW', doctorName: string, notes?: string): Promise<Patient> {
    const response = await supabase.rpc('transition_visit', {
      p_visit_id: patient.id,
      p_to_status: toStatus,
      p_doctor_name: doctorName,
      p_prescription_text: notes ?? null,
      p_expected_version: patient.version ?? 1,
    });

    if (response.error || !response.data) throw new Error(response.error?.message ?? 'Visit transition failed');
    const row = (Array.isArray(response.data) ? response.data[0] : response.data) as VisitRow;
    const next = this.mapVisit(row);
    this.patientsById.set(next.id, next);
    await this.refreshDepartment(next.department);
    return next;
  }

  async updateStatus(id: string, status: PatientStatus, notes?: string, doctorName = 'doctor-user') {
    const existing = this.patientsById.get(id) ?? (await this.fetchPatient(id));
    if (!existing) throw new Error('Patient not found');

    if (status === PatientStatus.CALLED) {
      await this.callNextFromDepartment(existing.department, doctorName);
      return;
    }

    if (status === PatientStatus.COMPLETED) {
      const latest = this.patientsById.get(id) ?? existing;
      if (latest.status === PatientStatus.CALLED) {
        const started = await this.transitionVisit(latest, 'IN_CONSULTATION', doctorName);
        await this.transitionVisit(started, 'COMPLETED', doctorName, notes);
        return;
      }
      await this.transitionVisit(latest, 'COMPLETED', doctorName, notes);
      return;
    }

    if (status === PatientStatus.NO_SHOW) {
      await this.transitionVisit(existing, 'NO_SHOW', doctorName);
    }
  }

  getStats(department: Department): QueueStats {
    const queue = this.getQueue(department);
    const waiting = queue.filter((patient) => patient.status === PatientStatus.WAITING || patient.status === PatientStatus.CALLED).length;
    const completed = queue.filter((patient) => patient.status === PatientStatus.COMPLETED).length;
    const urgentCount = queue.filter((patient) => patient.isUrgent && patient.status === PatientStatus.WAITING).length;

    const completedPatients = queue.filter((patient) => patient.status === PatientStatus.COMPLETED && patient.completedTime && patient.checkInTime);
    let avgWaitTime = 0;
    if (completedPatients.length > 0) {
      const totalMinutes = completedPatients.reduce((sum, patient) => {
        return sum + (((patient.completedTime ?? 0) - patient.checkInTime) / 60_000);
      }, 0);
      avgWaitTime = Math.round(totalMinutes / completedPatients.length);
    }
    return { waiting, completed, avgWaitTime, urgentCount };
  }

  async getAllStats(): Promise<Record<string, QueueStats>> {
    await this.refreshAllDepartments();
    const departments = await this.getManagedDepartments();
    const result: Record<string, QueueStats> = {};
    departments.forEach((department) => {
      result[department.id] = this.getStats(department.id);
    });
    return result;
  }

  subscribe(callback: () => void, department?: Department) {
    const key = department ? `dept:${department}` : 'dept:ALL';
    const listeners = this.subscribers.get(key) ?? new Set<() => void>();
    listeners.add(callback);
    this.subscribers.set(key, listeners);

    // Polling fallback: ensures updates even if Realtime is not enabled
    const pollInterval = setInterval(() => {
      const fire = async () => {
        if (department) await this.refreshDepartment(department).catch(() => undefined);
        else await this.refreshAllDepartments().catch(() => undefined);
        callback();
      };
      void fire();
    }, 3000);

    if (!this.channels.has(key)) {
      const channel = supabase
        .channel(key)
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'visits',
            filter: department ? `department_id=eq.${department}` : undefined,
          },
          async () => {
            if (department) await this.refreshDepartment(department).catch(() => undefined);
            else await this.refreshAllDepartments().catch(() => undefined);
            const callbacks = this.subscribers.get(key);
            callbacks?.forEach((listener) => listener());
          },
        )
        .subscribe();
      this.channels.set(key, channel);
    }

    return () => {
      clearInterval(pollInterval);
      const callbacks = this.subscribers.get(key);
      if (!callbacks) return;
      callbacks.delete(callback);
      if (callbacks.size === 0) {
        this.subscribers.delete(key);
        const channel = this.channels.get(key);
        if (channel) {
          void supabase.removeChannel(channel);
          this.channels.delete(key);
        }
      }
    };
  }

  async clearData() {
    await supabase.rpc('admin_reset');
    localStorage.removeItem(STORAGE_PATIENT_ID);
    this.patientsById.clear();
    this.queueByDepartment.clear();
  }

  /* ── Doctor auth ─────────────────────────────────── */

  async doctorLogin(email: string, password: string): Promise<DoctorSession | null> {
    const { data, error } = await supabase.rpc('verify_doctor_login', {
      p_email: email,
      p_password: password,
    });
    if (error || !data) return null;
    const session: DoctorSession = data as DoctorSession;
    localStorage.setItem(STORAGE_DOCTOR_SESSION, JSON.stringify(session));
    return session;
  }

  getDoctorSession(): DoctorSession | null {
    const raw = localStorage.getItem(STORAGE_DOCTOR_SESSION);
    if (!raw) return null;
    try {
      return JSON.parse(raw) as DoctorSession;
    } catch {
      return null;
    }
  }

  doctorLogout(): void {
    localStorage.removeItem(STORAGE_DOCTOR_SESSION);
  }

  /* ── Admin auth ──────────────────────────────────── */

  async adminLogin(password: string): Promise<boolean> {
    const { data, error } = await supabase.rpc('verify_admin_login', {
      p_password: password,
    });
    if (error) return false;
    const ok = data === true;
    if (ok) sessionStorage.setItem(STORAGE_ADMIN_AUTH, '1');
    return ok;
  }

  isAdminAuthenticated(): boolean {
    return sessionStorage.getItem(STORAGE_ADMIN_AUTH) === '1';
  }

  adminLogout(): void {
    sessionStorage.removeItem(STORAGE_ADMIN_AUTH);
  }

  /* ── Doctor management (admin) ───────────────────── */

  async createDoctorAccount(name: string, email: string, password: string, departmentId: string): Promise<{ id: string; name: string; email: string; department_id: string }> {
    const { data, error } = await supabase.rpc('create_doctor_account', {
      p_name: name,
      p_email: email,
      p_password: password,
      p_department_id: departmentId,
    });
    if (error) throw new Error(error.message);
    return data as { id: string; name: string; email: string; department_id: string };
  }

  async listDoctors(): Promise<DoctorRecord[]> {
    const { data, error } = await supabase.rpc('list_doctors');
    if (error) throw new Error(error.message);
    return (data ?? []) as DoctorRecord[];
  }

  async deleteDoctor(doctorId: string): Promise<void> {
    const { error } = await supabase.rpc('delete_doctor', { p_doctor_id: doctorId });
    if (error) throw new Error(error.message);
  }
}

export interface DoctorSession {
  id: string;
  name: string;
  email: string;
  department_id: string;
  department_name: string;
  department_code: string;
  status: string;
}

export interface DoctorRecord {
  id: string;
  name: string;
  email: string;
  department_id: string;
  department_name: string;
  status: string;
  created_at: string;
}

export const queueService = new QueueService();
