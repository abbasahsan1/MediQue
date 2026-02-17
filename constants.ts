import { Department, DepartmentConfig } from './types';

export const APP_NAME = "MediQueue";

export const DEPARTMENTS: Record<Department, DepartmentConfig> = {
  [Department.GENERAL]: { id: Department.GENERAL, name: 'General Medicine', code: 'GM', color: 'bg-blue-500' },
  [Department.ENT]: { id: Department.ENT, name: 'ENT (Ear, Nose, Throat)', code: 'EN', color: 'bg-indigo-500' },
  [Department.ORTHOPEDICS]: { id: Department.ORTHOPEDICS, name: 'Orthopedics', code: 'OR', color: 'bg-orange-500' },
  [Department.DENTAL]: { id: Department.DENTAL, name: 'Dental Care', code: 'DE', color: 'bg-teal-500' },
  [Department.CARDIOLOGY]: { id: Department.CARDIOLOGY, name: 'Cardiology', code: 'CA', color: 'bg-red-500' },
};

export const URGENT_SYMPTOMS = [
  'Chest Pain',
  'Shortness of Breath',
  'Severe Bleeding',
  'High Fever (>103°F)',
  'Loss of Consciousness'
];

export const COMMON_SYMPTOMS = [
  'Fever',
  'Cough',
  'Headache',
  'Sore Throat',
  'Stomach Pain',
  'Back Pain',
  'Toothache',
  'Nausea',
  'Dizziness',
  ...URGENT_SYMPTOMS
];
