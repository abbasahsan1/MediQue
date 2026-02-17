import { Patient, Department, PatientStatus, QueueStats } from '../types';
import { DEPARTMENTS, URGENT_SYMPTOMS } from '../constants';

const STORAGE_KEY = 'mediqueue_data_v1';
const EVENT_NAME = 'queue_update';

// Helper to generate a dummy initial state if empty
const getInitialState = (): Patient[] => {
  const stored = localStorage.getItem(STORAGE_KEY);
  if (stored) return JSON.parse(stored);
  return [];
};

class QueueService {
  private patients: Patient[];

  constructor() {
    this.patients = getInitialState();
    // Listen for cross-tab updates
    window.addEventListener('storage', (e) => {
      if (e.key === STORAGE_KEY) {
        this.patients = JSON.parse(e.newValue || '[]');
        this.notify();
      }
    });
  }

  private save() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(this.patients));
    this.notify();
  }

  private notify() {
    window.dispatchEvent(new CustomEvent(EVENT_NAME));
  }

  public subscribe(callback: () => void) {
    window.addEventListener(EVENT_NAME, callback);
    return () => window.removeEventListener(EVENT_NAME, callback);
  }

  // --- Actions ---

  public addPatient(
    name: string,
    age: number,
    department: Department,
    symptoms: string[]
  ): Patient {
    const isUrgent = symptoms.some((s) => URGENT_SYMPTOMS.includes(s));
    
    // Generate Token: e.g., GM-101
    const deptPatients = this.patients.filter(p => p.department === department);
    // Simple logic for daily reset simulation: just count all for now for simplicity
    const tokenNum = deptPatients.length + 101; 
    const code = DEPARTMENTS[department].code;
    
    const newPatient: Patient = {
      id: crypto.randomUUID(),
      name,
      age,
      department,
      symptoms,
      isUrgent,
      status: PatientStatus.WAITING,
      tokenNumber: `${code}-${tokenNum}`,
      checkInTime: Date.now(),
    };

    this.patients.push(newPatient);
    this.save();
    return newPatient;
  }

  public getPatient(id: string): Patient | undefined {
    return this.patients.find((p) => p.id === id);
  }

  public getQueue(department?: Department): Patient[] {
    let queue = this.patients;
    if (department) {
      queue = queue.filter((p) => p.department === department);
    }
    // Sort logic: 
    // 1. Status (WAITING > CALLED > others)
    // 2. Urgent > Normal
    // 3. CheckInTime (First come first serve)
    
    return queue.sort((a, b) => {
       // Status priority for the "Active Queue" list
       const statusWeight = (s: PatientStatus) => {
         if (s === PatientStatus.CALLED) return 3;
         if (s === PatientStatus.WAITING) return 2;
         return 1;
       };
       
       if (statusWeight(a.status) !== statusWeight(b.status)) {
         return statusWeight(b.status) - statusWeight(a.status);
       }

       if (a.isUrgent !== b.isUrgent && a.status === PatientStatus.WAITING) {
         return a.isUrgent ? -1 : 1;
       }
       return a.checkInTime - b.checkInTime;
    });
  }

  public updateStatus(id: string, status: PatientStatus, notes?: string, doctorName?: string) {
    const patient = this.patients.find((p) => p.id === id);
    if (!patient) return;

    patient.status = status;
    if (notes) patient.notes = notes;
    if (doctorName) patient.assignedDoctor = doctorName;
    
    if (status === PatientStatus.CALLED) patient.calledTime = Date.now();
    if (status === PatientStatus.COMPLETED || status === PatientStatus.REFERRED) {
      patient.completedTime = Date.now();
    }

    this.save();
  }

  public getStats(department: Department): QueueStats {
    const deptPatients = this.patients.filter((p) => p.department === department);
    const waiting = deptPatients.filter((p) => p.status === PatientStatus.WAITING || p.status === PatientStatus.CALLED).length;
    // Include Referred in completed count for efficiency stats
    const completed = deptPatients.filter((p) => p.status === PatientStatus.COMPLETED || p.status === PatientStatus.REFERRED).length;
    const urgentCount = deptPatients.filter((p) => p.isUrgent && (p.status === PatientStatus.WAITING)).length;

    // Calculate Avg Wait Time (Mock logic based on completed patients)
    const completedPatients = deptPatients.filter(p => (p.status === PatientStatus.COMPLETED || p.status === PatientStatus.REFERRED) && p.completedTime && p.checkInTime);
    let avgWaitTime = 0;
    if (completedPatients.length > 0) {
      const totalTime = completedPatients.reduce((acc, p) => acc + ((p.completedTime! - p.checkInTime) / 60000), 0);
      avgWaitTime = Math.round(totalTime / completedPatients.length);
    }

    return { waiting, completed, avgWaitTime, urgentCount };
  }
  
  public getAllStats(): Record<Department, QueueStats> {
    const result = {} as Record<Department, QueueStats>;
    Object.values(DEPARTMENTS).forEach(dept => {
      result[dept.id] = this.getStats(dept.id);
    });
    return result;
  }

  public clearData() {
    this.patients = [];
    this.save();
  }
}

export const queueService = new QueueService();