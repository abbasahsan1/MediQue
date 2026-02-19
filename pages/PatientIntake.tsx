import React, { useCallback, useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { DepartmentConfig, Gender } from '../types';
import { DEPARTMENTS } from '../constants';
import { DoctorRecord, queueService } from '../services/queueService';
import { VoiceInput } from '../components/VoiceInput';
import {
  Activity,
  ChevronRight,
  ChevronLeft,
  Edit2,
  Loader,
  AlertTriangle,
  CheckCircle,
} from 'lucide-react';

type Step = 'name' | 'age' | 'gender' | 'department' | 'problem' | 'review';

const STEP_LABELS: Record<Step, string> = {
  name: 'What is your name?',
  age: 'What is your age?',
  gender: 'What is your gender?',
  department: 'Which department?',
  problem: 'Describe your problem',
  review: 'Review your information',
};

interface FormData {
  name: string;
  age: string;
  gender: Gender | '';
  department: string;
  problemDescription: string;
}

export const PatientIntake: React.FC = () => {
  const { deptId, doctorId } = useParams<{ deptId?: string; doctorId?: string }>();
  const navigate = useNavigate();

  const [step, setStep] = useState<Step>('name');
  const [formData, setFormData] = useState<FormData>({
    name: '',
    age: '',
    gender: '',
    department: deptId?.toUpperCase() ?? '',
    problemDescription: '',
  });
  const [departments, setDepartments] = useState<DepartmentConfig[]>(Object.values(DEPARTMENTS));
  const [selectedDoctor, setSelectedDoctor] = useState<DoctorRecord | null>(null);
  const [doctorLoading, setDoctorLoading] = useState(Boolean(doctorId));
  const [doctorError, setDoctorError] = useState<string | null>(null);

  const hasFixedDepartment = Boolean(deptId) || Boolean(selectedDoctor?.department_id);
  const STEP_ORDER: Step[] = hasFixedDepartment
    ? ['name', 'age', 'gender', 'problem', 'review']
    : ['name', 'age', 'gender', 'department', 'problem', 'review'];
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [editingField, setEditingField] = useState<Step | null>(null);
  const [restoring, setRestoring] = useState(true);

  useEffect(() => {
    if (!doctorId) {
      setDoctorLoading(false);
      setDoctorError(null);
      setSelectedDoctor(null);
      return;
    }

    const loadDoctor = async () => {
      setDoctorLoading(true);
      setDoctorError(null);
      try {
        const doctor = await queueService.getDoctorById(doctorId);
        if (!doctor) {
          setDoctorError('Doctor QR is invalid or no longer available.');
          return;
        }
        setSelectedDoctor(doctor);
        setFormData((prev) => ({ ...prev, department: doctor.department_id }));
      } catch (err) {
        setDoctorError(err instanceof Error ? err.message : 'Failed to load doctor details.');
      } finally {
        setDoctorLoading(false);
      }
    };

    void loadDoctor();
  }, [doctorId]);

  // Ghost account: Check if patient already has an active visit
  useEffect(() => {
    if (doctorLoading) return;

    const checkExistingVisit = async () => {
      try {
        const resolvedDepartment = selectedDoctor?.department_id ?? deptId?.toUpperCase();
        const existing = await queueService.findActiveVisitForGuest(
          resolvedDepartment,
          selectedDoctor?.id,
        );
        if (existing) {
          navigate(`/patient/${existing.id}`, { replace: true });
          return;
        }
      } catch {
        // No existing visit, continue with form
      }
      setRestoring(false);
    };
    void checkExistingVisit();
  }, [deptId, doctorLoading, navigate, selectedDoctor?.department_id, selectedDoctor?.id]);

  // Ensure guest UUID exists
  useEffect(() => {
    queueService.getGuestUuid();
  }, []);

  // Load departments
  useEffect(() => {
    const load = async () => {
      const records = await queueService.getDepartments().catch(() => Object.values(DEPARTMENTS));
      if (records.length > 0) setDepartments(records);
    };
    void load();
  }, []);

  const stepIndex = STEP_ORDER.indexOf(step);

  const canProceed = useCallback((): boolean => {
    switch (step) {
      case 'name': return formData.name.trim().length >= 2;
      case 'age': {
        const n = Number(formData.age);
        return formData.age !== '' && Number.isInteger(n) && n >= 0 && n <= 120;
      }
      case 'gender': return formData.gender !== '';
      case 'department': return formData.department !== '';
      case 'problem': return formData.problemDescription.trim().length >= 3;
      default: return true;
    }
  }, [step, formData]);

  const goNext = useCallback(() => {
    if (!canProceed()) return;
    if (editingField) {
      setEditingField(null);
      setStep('review');
      return;
    }
    const next = STEP_ORDER[stepIndex + 1];
    if (next) setStep(next);
  }, [STEP_ORDER, canProceed, editingField, stepIndex]);

  const goBack = () => {
    if (editingField) {
      setEditingField(null);
      setStep('review');
      return;
    }
    const prev = STEP_ORDER[stepIndex - 1];
    if (prev) setStep(prev);
  };

  const startEdit = (field: Step) => {
    setEditingField(field);
    setStep(field);
  };

  const handleSubmit = async () => {
    setSubmitError(null);
    setIsSubmitting(true);
    try {
      const patient = await queueService.checkIn(
        formData.name.trim(),
        Number(formData.age),
        formData.department,
        formData.problemDescription.trim(),
        formData.gender as Gender,
        selectedDoctor?.id,
      );
      navigate(`/patient/${patient.id}`, { replace: true });
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : 'Failed to generate token. Please try again.');
      setIsSubmitting(false);
    }
  };

  const deptConfig = departments.find((d) => d.id === formData.department)
    ?? DEPARTMENTS[formData.department]
    ?? null;

  useEffect(() => {
    if (editingField) return;
    if (step !== 'name' && step !== 'age') return;
    if (!canProceed()) return;

    const timer = window.setTimeout(() => {
      goNext();
    }, 900);

    return () => window.clearTimeout(timer);
  }, [canProceed, editingField, formData.age, formData.name, formData.problemDescription, goNext, step]);

  if (restoring || doctorLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader className="animate-spin text-muted-foreground" size={24} />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <header className="page-header px-5 py-4 flex items-center gap-3" role="banner">
        <div className="flex items-center gap-2">
          <div className="h-[30px] w-[30px] bg-primary text-primary-foreground rounded-md flex items-center justify-center font-bold text-sm">
            G
          </div>
          <span className="font-semibold text-foreground text-sm">Gravity</span>
        </div>
        {deptConfig && (
          <span className="badge badge-primary text-xs">{deptConfig.name}</span>
        )}
        {selectedDoctor && (
          <span className="badge badge-success text-xs">Dr. {selectedDoctor.name}</span>
        )}
      </header>

      <main className="flex-1 flex items-start justify-center p-5 pt-10">
        <div className="w-full max-w-lg space-y-6">
          {/* Progress indicator */}
          {step !== 'review' && (
            <div className="flex items-center gap-1">
              {STEP_ORDER.slice(0, -1).map((s, i) => (
                <div
                  key={s}
                  className={`h-1 flex-1 rounded-full transition-colors ${
                    i <= stepIndex ? 'bg-primary' : 'bg-border'
                  }`}
                />
              ))}
            </div>
          )}

          <h2 className="text-xl font-bold text-foreground">
            {editingField ? `Edit: ${STEP_LABELS[editingField]}` : STEP_LABELS[step]}
          </h2>

          {(doctorError || submitError) && step !== 'review' && (
            <div className="alert alert-error">
              <AlertTriangle size={16} />
              <span>{doctorError ?? submitError}</span>
            </div>
          )}

          {/* Name step */}
          {step === 'name' && (
            <div className="space-y-3">
              <label className="block text-sm font-medium text-muted-foreground">Full Name</label>
              <VoiceInput
                value={formData.name}
                onChange={(v) => setFormData((prev) => ({ ...prev, name: v }))}
                placeholder="Say or type your full name"
              />
            </div>
          )}

          {/* Age step */}
          {step === 'age' && (
            <div className="space-y-3">
              <label className="block text-sm font-medium text-muted-foreground">Age in years</label>
              <VoiceInput
                value={formData.age}
                onChange={(v) => {
                  const cleaned = v.replace(/[^0-9]/g, '');
                  setFormData((prev) => ({ ...prev, age: cleaned }));
                }}
                placeholder="Say or type your age"
                inputType="number"
              />
            </div>
          )}

          {/* Gender step */}
          {step === 'gender' && (
            <div className="space-y-3">
              <label className="block text-sm font-medium text-muted-foreground">Select your gender</label>
              <div className="grid grid-cols-3 gap-3">
                {(['Male', 'Female'] as Gender[]).map((g) => (
                  <button
                    key={g}
                    type="button"
                    onClick={() => setFormData((prev) => ({ ...prev, gender: g }))}
                    className={`px-4 py-3 rounded-lg text-sm font-semibold border transition-all ${
                      formData.gender === g
                        ? 'border-primary bg-primary/10 text-primary'
                        : 'border-border bg-surface text-secondary hover:border-primary/40'
                    }`}
                  >
                    {g}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Department step */}
          {step === 'department' && (
            <div className="space-y-3">
              <label className="block text-sm font-medium text-muted-foreground">Select department</label>
              <select
                value={formData.department}
                onChange={(e) => setFormData((prev) => ({ ...prev, department: e.target.value }))}
                className="input-field text-sm"
              >
                <option value="">— Choose department —</option>
                {departments.map((d) => (
                  <option key={d.id} value={d.id}>{d.name}</option>
                ))}
              </select>
            </div>
          )}

          {/* Problem description step */}
          {step === 'problem' && (
            <div className="space-y-3">
              <label className="block text-sm font-medium text-muted-foreground">
                Tell us what's wrong. Speak naturally or type below.
              </label>
              <VoiceInput
                value={formData.problemDescription}
                onChange={(v) => setFormData((prev) => ({ ...prev, problemDescription: v }))}
                placeholder="Describe your symptoms or problem..."
                multiline
              />
            </div>
          )}

          {/* Review step */}
          {step === 'review' && (
            <div className="space-y-4">
              {submitError && (
                <div className="alert alert-error">
                  <AlertTriangle size={16} />
                  <span>{submitError}</span>
                </div>
              )}

              <ReviewRow label="Name" value={formData.name} onEdit={() => startEdit('name')} />
              <ReviewRow label="Age" value={`${formData.age} years`} onEdit={() => startEdit('age')} />
              <ReviewRow label="Gender" value={formData.gender} onEdit={() => startEdit('gender')} />
              {hasFixedDepartment ? (
                <div className="bg-surface border border-border rounded-lg p-4">
                  <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-1">Department</p>
                  <p className="text-sm font-medium text-foreground">{deptConfig?.name ?? formData.department}</p>
                </div>
              ) : (
                <ReviewRow label="Department" value={deptConfig?.name ?? formData.department} onEdit={() => startEdit('department')} />
              )}
              {selectedDoctor && (
                <div className="bg-surface border border-border rounded-lg p-4">
                  <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-1">Assigned Doctor</p>
                  <p className="text-sm font-medium text-foreground">{selectedDoctor.name}</p>
                </div>
              )}
              <ReviewRow label="Problem" value={formData.problemDescription} onEdit={() => startEdit('problem')} />

              <button
                type="button"
                onClick={() => void handleSubmit()}
                disabled={isSubmitting || Boolean(doctorError)}
                className="btn-primary w-full justify-center py-4 text-base mt-4"
              >
                {isSubmitting ? (
                  <><Loader className="animate-spin" size={18} /> Generating Token…</>
                ) : (
                  <><CheckCircle size={18} /> Get Queue Token</>
                )}
              </button>
            </div>
          )}

          {/* Navigation buttons */}
          {step !== 'review' && (
            <div className="flex items-center gap-3 pt-2">
              {stepIndex > 0 && (
                <button type="button" onClick={goBack} className="btn-ghost flex items-center gap-1">
                  <ChevronLeft size={14} /> Back
                </button>
              )}
              <button
                type="button"
                onClick={goNext}
                disabled={!canProceed() || Boolean(doctorError)}
                className="btn-primary flex-1 justify-center"
              >
                {editingField ? 'Save' : 'Next'} <ChevronRight size={14} />
              </button>
            </div>
          )}

          {step === 'review' && (
            <button
              type="button"
              onClick={() => setStep('problem')}
              className="btn-ghost w-full justify-center text-sm"
            >
              <ChevronLeft size={14} /> Go Back
            </button>
          )}
        </div>
      </main>
    </div>
  );
};

function ReviewRow({
  label,
  value,
  onEdit,
}: {
  label: string;
  value: string;
  onEdit: () => void;
}) {
  return (
    <div className="flex items-start justify-between gap-3 bg-surface border border-border rounded-lg p-4">
      <div className="min-w-0">
        <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-1">{label}</p>
        <p className="text-sm font-medium text-foreground break-words">{value || '—'}</p>
      </div>
      <button
        type="button"
        onClick={onEdit}
        className="flex-shrink-0 p-2 rounded-md text-muted-foreground hover:text-foreground hover:bg-surface-muted transition-colors"
        aria-label={`Edit ${label}`}
      >
        <Edit2 size={14} />
      </button>
    </div>
  );
}
