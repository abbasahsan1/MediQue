import { Department, DepartmentConfig } from './types';

export const APP_NAME = "MediQueue";

export const DEPARTMENTS: Record<string, DepartmentConfig> = {
  [Department.GENERAL]: { id: Department.GENERAL, name: 'General Medicine', code: 'GM', color: 'bg-dept-general' },
  [Department.ENT]: { id: Department.ENT, name: 'ENT (Ear, Nose, Throat)', code: 'EN', color: 'bg-dept-ent' },
  [Department.ORTHOPEDICS]: { id: Department.ORTHOPEDICS, name: 'Orthopedics', code: 'OR', color: 'bg-dept-orthopedics' },
  [Department.DENTAL]: { id: Department.DENTAL, name: 'Dental Care', code: 'DE', color: 'bg-dept-dental' },
  [Department.CARDIOLOGY]: { id: Department.CARDIOLOGY, name: 'Cardiology', code: 'CA', color: 'bg-dept-cardiology' },
};

/** Keywords checked server-side for urgency triage. Used only for display highlighting. */
export const URGENT_KEYWORDS = [
  'chest pain',
  'shortness of breath',
  'severe bleeding',
  'high fever',
  'loss of consciousness',
  'heart attack',
  'stroke',
  'seizure',
  'unconscious',
  'not breathing',
];
