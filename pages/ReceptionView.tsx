import React, { useEffect, useState } from 'react';
import { Department, DepartmentConfig, Gender } from '../types';
import { DEPARTMENTS } from '../constants';
import { queueService } from '../services/queueService';
import { User, Activity, AlertCircle, CheckCircle } from 'lucide-react';

export const ReceptionView: React.FC = () => {
  const [selectedDept, setSelectedDept] = useState<Department>(Department.GENERAL);
  const [departments, setDepartments] = useState<DepartmentConfig[]>(Object.values(DEPARTMENTS));
  const [name, setName] = useState('');
  const [age, setAge] = useState('');
  const [gender, setGender] = useState<Gender | ''>('');
  const [problemDescription, setProblemDescription] = useState('');
  const [generatedToken, setGeneratedToken] = useState<string | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    const loadDepartments = async () => {
      const records = await queueService.getDepartments().catch(() => Object.values(DEPARTMENTS));
      if (records.length > 0) {
        setDepartments(records);
        setSelectedDept((current) => (
          records.some((department) => department.id === current) ? current : records[0].id
        ));
      }
    };
    void loadDepartments();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !age) return;
    setSubmitError(null);
    setIsSubmitting(true);
    try {
      const patient = await queueService.checkIn(
        name.trim(),
        parseInt(age, 10),
        selectedDept,
        problemDescription.trim(),
        gender || undefined,
      );
      setGeneratedToken(patient.tokenNumber);
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : 'Registration failed — please retry.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleReset = () => {
    setName('');
    setAge('');
    setGender('');
    setProblemDescription('');
    setGeneratedToken(null);
    setSubmitError(null);
  };

  const dept = departments.find((department) => department.id === selectedDept)
    ?? DEPARTMENTS[selectedDept]
    ?? { id: selectedDept, name: selectedDept, code: selectedDept.slice(0, 4).toUpperCase(), color: 'bg-dept-general' };

  return (
    <div className="page-shell">
      <div className="space-y-1">
        <h1 className="text-xl font-bold">Reception Desk</h1>
        <p className="text-sm">Manual patient entry for assisted walk-in check-ins.</p>
      </div>

      {generatedToken ? (
        <section className="bg-surface border border-border rounded-lg p-6 md:p-8 text-center" role="status" aria-live="assertive">
          <div className="icon-circle icon-circle-success mx-auto mb-5">
            <CheckCircle size={26} aria-hidden="true" />
          </div>
          <p className="text-xs font-semibold uppercase tracking-widest mb-2">Token Generated</p>
          <div className="text-7xl font-bold text-foreground my-5 tracking-tight" aria-label={`Queue token ${generatedToken}`}>
            {generatedToken}
          </div>
          <p className="text-sm text-secondary mb-7">
            Department: <strong>{dept.name}</strong>. Please write this token on a slip for the patient.
          </p>
          <button onClick={handleReset} className="btn-primary">Register Next Patient</button>
        </section>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-5" noValidate>
          <section className="bg-surface border border-border rounded-lg p-5">
            <fieldset>
              <legend className="block text-sm font-semibold text-foreground mb-2">Department</legend>
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2" role="group" aria-label="Select department">
                {departments.map((department) => (
                  <button
                    key={department.id}
                    type="button"
                    onClick={() => setSelectedDept(department.id)}
                    aria-pressed={selectedDept === department.id}
                    className={`px-3 py-2.5 rounded-md text-sm font-medium border text-left transition-all duration-150 ${
                      selectedDept === department.id
                        ? 'border-primary/50 bg-primary/10 text-primary'
                        : 'border-border text-secondary hover:border-primary/35 hover:text-primary'
                    }`}
                  >
                    {department.name}
                  </button>
                ))}
              </div>
            </fieldset>
          </section>

          <section className="bg-surface border border-border rounded-lg p-5">
            {submitError && (
              <div className="alert alert-error mb-4" role="alert">
                <AlertCircle size={16} aria-hidden="true" />
                {submitError}
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label htmlFor="reception-name" className="block text-sm font-semibold text-foreground mb-2 flex items-center gap-1.5">
                  <User size={14} className="text-primary" aria-hidden="true" />
                  Patient Name
                </label>
                <input
                  id="reception-name"
                  type="text"
                  required
                  autoComplete="off"
                  value={name}
                  onChange={(event) => setName(event.target.value)}
                  className="input-field"
                  placeholder="Full Name"
                />
              </div>
              <div>
                <label htmlFor="reception-age" className="block text-sm font-semibold text-foreground mb-2 flex items-center gap-1.5">
                  <Activity size={14} className="text-primary" aria-hidden="true" />
                  Age
                </label>
                <input
                  id="reception-age"
                  type="number"
                  required
                  min="0"
                  max="120"
                  value={age}
                  onChange={(event) => setAge(event.target.value)}
                  className="input-field"
                  placeholder="Years"
                />
              </div>
            </div>

            <div className="mt-4">
              <label className="block text-sm font-semibold text-foreground mb-2">Gender</label>
              <div className="flex gap-2">
                {(['Male', 'Female'] as Gender[]).map((g) => (
                  <button
                    key={g}
                    type="button"
                    onClick={() => setGender(g)}
                    className={`px-4 py-2 rounded-md text-sm font-medium border transition-all ${
                      gender === g
                        ? 'border-primary/50 bg-primary/10 text-primary'
                        : 'border-border text-secondary hover:border-primary/35'
                    }`}
                  >
                    {g}
                  </button>
                ))}
              </div>
            </div>

            <div className="mt-4">
              <label htmlFor="reception-problem" className="block text-sm font-semibold text-foreground mb-1.5 flex items-center gap-1.5">
                <AlertCircle size={14} className="text-primary" aria-hidden="true" />
                Problem Description
                <span className="font-normal ml-1">(optional)</span>
              </label>
              <textarea
                id="reception-problem"
                value={problemDescription}
                onChange={(event) => setProblemDescription(event.target.value)}
                className="input-field text-sm"
                style={{ minHeight: 88 }}
                placeholder="Describe the patient's complaint or symptoms"
              />
            </div>
          </section>

          <button
            type="submit"
            disabled={isSubmitting || !name.trim() || !age}
            className="btn-primary w-full justify-center py-3.5"
          >
            {isSubmitting ? 'Generating…' : 'Generate Token'}
          </button>
        </form>
      )}
    </div>
  );
};
