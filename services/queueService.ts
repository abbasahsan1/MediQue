import { Department, DepartmentConfig, Patient, PatientStatus, QueueStats } from '../types';
import { DEPARTMENTS, URGENT_SYMPTOMS } from '../constants';

const API_BASE = (import.meta as unknown as { env?: Record<string, string> }).env?.VITE_API_BASE_URL ?? 'http://localhost:4000/api/v1';
const STORAGE_PATIENT_ID = 'mediqueue_patient_id';
const STAFF_TOKEN_PREFIX = 'medique_staff_token_';

type StaffRole = 'ADMIN' | 'DOCTOR' | 'RECEPTION';

type ApiVisitState = 'SCANNED' | 'WAITING' | 'URGENT' | 'CALLED' | 'IN_CONSULTATION' | 'COMPLETED' | 'NO_SHOW';

interface ApiVisit {
  id: string;
  departmentId: string;
  tokenNumber: string;
  patientName: string;
  age: number;
  symptoms: string[];
  state: ApiVisitState;
  priority: 'NORMAL' | 'URGENT';
  doctorId?: string;
  prescriptionText?: string;
  version: number;
  createdAt: number;
  updatedAt: number;
  calledAt?: number;
  consultationStartedAt?: number;
  completedAt?: number;
  noShowAt?: number;
}

interface QueueSnapshot {
  departmentId: string;
  nowServing?: string;
  visits: ApiVisit[];
}

class QueueService {
  private patientsById = new Map<string, Patient>();
  private queueByDepartment = new Map<Department, Patient[]>();
  private listeners = new Set<() => void>();
  private eventSources = new Map<Department, EventSource>();
  private fallbackTimer: number | null = null;
  private departmentsCache: Array<DepartmentConfig & { isActive: boolean }> | null = null;

  private notify() {
    this.listeners.forEach((listener) => listener());
  }

  private async ensureStaffToken(role: StaffRole, userId: string): Promise<string> {
    const storageKey = `${STAFF_TOKEN_PREFIX}${role}_${userId}`;
    const cached = localStorage.getItem(storageKey);
    if (cached) {
      return cached;
    }

    const response = await fetch(`${API_BASE}/auth/dev-token`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ userId, role }),
    });
    if (!response.ok) {
      throw new Error('Failed to issue staff token');
    }

    const payload = (await response.json()) as { token: string };
    localStorage.setItem(storageKey, payload.token);
    return payload.token;
  }

  private async authHeaders(role: StaffRole, userId: string): Promise<Record<string, string>> {
    const token = await this.ensureStaffToken(role, userId);
    return {
      authorization: `Bearer ${token}`,
      'content-type': 'application/json',
    };
  }

  private mapVisit(visit: ApiVisit): Patient {
    const isUrgent = visit.priority === 'URGENT' || visit.state === 'URGENT' || visit.symptoms.some((s) => URGENT_SYMPTOMS.includes(s));

    const status: PatientStatus =
      visit.state === 'CALLED'
        ? PatientStatus.CALLED
        : visit.state === 'IN_CONSULTATION'
          ? PatientStatus.IN_CONSULTATION
          : visit.state === 'COMPLETED'
            ? PatientStatus.COMPLETED
            : visit.state === 'NO_SHOW'
              ? PatientStatus.NO_SHOW
              : PatientStatus.WAITING;

    return {
      id: visit.id,
      name: visit.patientName,
      age: visit.age,
      symptoms: visit.symptoms,
      isUrgent,
      department: visit.departmentId as Department,
      status,
      tokenNumber: visit.tokenNumber,
      checkInTime: visit.createdAt,
      calledTime: visit.calledAt,
      completedTime: visit.completedAt,
      notes: visit.prescriptionText,
      assignedDoctor: visit.doctorId,
      version: visit.version,
    };
  }

  private ingestSnapshot(snapshot: QueueSnapshot) {
    const department = snapshot.departmentId as Department;
    const mapped = snapshot.visits.map((visit) => this.mapVisit(visit));
    this.queueByDepartment.set(department, mapped);
    mapped.forEach((patient) => this.patientsById.set(patient.id, patient));
  }

  private async issueCheckinToken(departmentId: Department): Promise<string> {
    const headers = await this.authHeaders('ADMIN', 'admin-system');
    const response = await fetch(`${API_BASE}/admin/checkin-token`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ departmentId, expiresInSec: 600 }),
    });
    if (!response.ok) {
      throw new Error('Failed to create check-in token');
    }
    const data = (await response.json()) as { token: string };
    return data.token;
  }

  private getFallbackExpectedVersion(patient: Patient): number {
    return patient.version ?? 1;
  }

  async checkIn(
    name: string,
    age: number,
    department: Department,
    symptoms: string[],
  ): Promise<Patient> {
    const signedCheckinToken = await this.issueCheckinToken(department);
    const idempotencyKey = crypto.randomUUID();
    const restoreToken = crypto.randomUUID();

    const response = await fetch(`${API_BASE}/patient/checkin`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        departmentId: department,
        patientName: name,
        age,
        symptoms,
        signedCheckinToken,
        idempotencyKey,
        restoreToken,
      }),
    });

    if (!response.ok) {
      throw new Error('Check-in failed');
    }

    const visit = (await response.json()) as ApiVisit;
    const patient = this.mapVisit(visit);
    this.patientsById.set(patient.id, patient);
    localStorage.setItem(STORAGE_PATIENT_ID, patient.id);
    await this.refreshDepartment(department);
    this.notify();
    return patient;
  }

  async fetchPatient(patientId: string): Promise<Patient | undefined> {
    const response = await fetch(`${API_BASE}/patient/visits/${patientId}`);
    if (response.status === 404) {
      this.patientsById.delete(patientId);
      return undefined;
    }
    if (!response.ok) {
      throw new Error('Failed to fetch patient');
    }

    const visit = (await response.json()) as ApiVisit;
    const patient = this.mapVisit(visit);
    this.patientsById.set(patient.id, patient);
    return patient;
  }

  getPatient(id: string): Patient | undefined {
    return this.patientsById.get(id);
  }

  async getManagedDepartments(): Promise<Array<DepartmentConfig & { isActive: boolean }>> {
    const headers = await this.authHeaders('RECEPTION', 'reception-system');
    const response = await fetch(`${API_BASE}/admin/departments`, { headers });
    if (!response.ok) {
      return Object.values(DEPARTMENTS).map((department) => ({ ...department, isActive: true }));
    }

    const records = (await response.json()) as Array<DepartmentConfig & { isActive: boolean }>;
    this.departmentsCache = records;
    return records;
  }

  async getDepartments(): Promise<DepartmentConfig[]> {
    const records = await this.getManagedDepartments();
    return records.filter((record) => record.isActive);
  }

  async updateDepartment(departmentId: Department, payload: { isActive?: boolean; name?: string; code?: string }): Promise<void> {
    const headers = await this.authHeaders('ADMIN', 'admin-system');
    const response = await fetch(`${API_BASE}/admin/departments/${departmentId}`, {
      method: 'PUT',
      headers,
      body: JSON.stringify(payload),
    });
    if (!response.ok) {
      throw new Error('Failed to update department');
    }
    this.departmentsCache = null;
  }

  async refreshDepartment(department: Department): Promise<Patient[]> {
    const headers = await this.authHeaders('RECEPTION', 'reception-system');
    const response = await fetch(`${API_BASE}/departments/${department}/queue`, { headers });
    if (!response.ok) {
      throw new Error('Failed to fetch department queue');
    }
    const snapshot = (await response.json()) as QueueSnapshot;
    this.ingestSnapshot(snapshot);
    this.notify();
    return this.getQueue(department);
  }

  async refreshAllDepartments(): Promise<void> {
    const departments = Object.values(Department);
    await Promise.all(departments.map((department) => this.refreshDepartment(department)));
  }

  getQueue(department?: Department): Patient[] {
    if (department) {
      return (this.queueByDepartment.get(department) ?? []).slice();
    }

    return [...this.queueByDepartment.values()].flat();
  }

  private async transitionVisit(
    patient: Patient,
    action: 'call' | 'start' | 'complete' | 'no-show',
    doctorName: string,
    prescriptionText?: string,
  ): Promise<Patient> {
    const headers = await this.authHeaders('DOCTOR', doctorName || 'doctor-user');
    const body: Record<string, unknown> = {
      expectedVersion: this.getFallbackExpectedVersion(patient),
    };
    if (prescriptionText) {
      body.prescriptionText = prescriptionText;
    }

    const response = await fetch(`${API_BASE}/doctor/visits/${patient.id}/${action}`, {
      method: 'POST',
      headers,
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      throw new Error('Visit transition failed');
    }

    const next = this.mapVisit((await response.json()) as ApiVisit);
    this.patientsById.set(next.id, next);
    await this.refreshDepartment(next.department);
    this.notify();
    return next;
  }

  async updateStatus(id: string, status: PatientStatus, notes?: string, doctorName = 'doctor-user') {
    const existing = this.patientsById.get(id) ?? (await this.fetchPatient(id));
    if (!existing) {
      throw new Error('Patient not found');
    }

    if (status === PatientStatus.CALLED) {
      await this.transitionVisit(existing, 'call', doctorName);
      return;
    }

    if (status === PatientStatus.COMPLETED) {
      const latest = this.patientsById.get(id) ?? existing;
      if (latest.status === PatientStatus.CALLED) {
        const started = await this.transitionVisit(latest, 'start', doctorName);
        await this.transitionVisit(started, 'complete', doctorName, notes);
        return;
      }
      await this.transitionVisit(latest, 'complete', doctorName, notes);
      return;
    }

    if (status === PatientStatus.NO_SHOW) {
      await this.transitionVisit(existing, 'no-show', doctorName);
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

  async getAllStats(): Promise<Record<Department, QueueStats>> {
    await this.refreshAllDepartments();
    const result = {} as Record<Department, QueueStats>;
    Object.values(Department).forEach((department) => {
      result[department] = this.getStats(department);
    });
    return result;
  }

  subscribe(callback: () => void, department?: Department) {
    this.listeners.add(callback);

    if (department && !this.eventSources.has(department)) {
      const source = new EventSource(`${API_BASE}/events/departments/${department}`);
      source.addEventListener('queue.updated', (event) => {
        const message = event as MessageEvent;
        const snapshot = JSON.parse(message.data) as QueueSnapshot;
        this.ingestSnapshot(snapshot);
        this.notify();
      });
      source.onerror = () => {
        source.close();
        this.eventSources.delete(department);
      };
      this.eventSources.set(department, source);
    }

    if (!department && this.fallbackTimer === null) {
      this.fallbackTimer = window.setInterval(() => {
        this.notify();
      }, 5000);
    }

    return () => {
      this.listeners.delete(callback);
    };
  }

  async clearData() {
    const headers = await this.authHeaders('ADMIN', 'admin-system');
    await fetch(`${API_BASE}/admin/reset`, { method: 'POST', headers, body: '{}' });
    localStorage.removeItem(STORAGE_PATIENT_ID);
    this.patientsById.clear();
    this.queueByDepartment.clear();
    this.notify();
  }
}

export const queueService = new QueueService();
