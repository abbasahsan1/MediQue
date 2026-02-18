import React, { useEffect, useState } from 'react';
import { queueService } from '../services/queueService';
import { Department, DepartmentConfig, Patient, PatientStatus } from '../types';
import { DEPARTMENTS } from '../constants';
import { Activity, Clock } from 'lucide-react';

const DEPT_COLORS: Record<string, string> = {
  GENERAL: 'var(--dept-general)',
  ENT: 'var(--dept-ent)',
  ORTHOPEDICS: 'var(--dept-orthopedics)',
  DENTAL: 'var(--dept-dental)',
  CARDIOLOGY: 'var(--dept-cardiology)',
};

export const TVDisplay: React.FC<{ onExit: () => void }> = ({ onExit }) => {
  const [activePatients, setActivePatients] = useState<Patient[]>([]);
  const [upcomingPatients, setUpcomingPatients] = useState<Record<string, Patient[]>>({});
  const [managedDepartments, setManagedDepartments] = useState<DepartmentConfig[]>(Object.values(DEPARTMENTS));
  const [currentTime, setCurrentTime] = useState(() =>
    new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
  );

  useEffect(() => {
    const tick = setInterval(() => {
      setCurrentTime(new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }));
    }, 10_000);
    return () => clearInterval(tick);
  }, []);

  useEffect(() => {
    const update = async () => {
      const departments = await queueService.getManagedDepartments().catch(() => Object.values(DEPARTMENTS));
      setManagedDepartments(departments as DepartmentConfig[]);
      await queueService.refreshAllDepartments();
      const all = queueService.getQueue();

      const called = all.filter(
        (patient) => patient.status === PatientStatus.CALLED || patient.status === PatientStatus.IN_CONSULTATION,
      );
      setActivePatients(called);

      const next: Record<string, Patient[]> = {};
      departments.forEach((department) => {
        const deptId = department.id;
        const waiting = all
          .filter((patient) => patient.department === deptId && patient.status === PatientStatus.WAITING)
          .slice(0, 3);
        if (waiting.length > 0) next[deptId] = waiting;
      });
      setUpcomingPatients(next);
    };

    void update();
    const interval = setInterval(() => { void update(); }, 5_000);
    const unsub = queueService.subscribe(() => { void update(); });
    return () => {
      clearInterval(interval);
      unsub();
    };
  }, []);

  return (
    <div
      className="min-h-screen bg-background text-foreground flex flex-col select-none"
      role="main"
      aria-label="Queue Status Display"
      style={{ fontFamily: "'IBM Plex Sans', Inter, system-ui, sans-serif" }}
    >
      <header className="border-b border-border px-5 md:px-8 py-5 flex items-center justify-between" role="banner">
        <div className="flex items-center gap-4">
          <div className="h-10 w-10 bg-primary text-primary-foreground rounded-md flex items-center justify-center">
            <Activity size={20} aria-hidden="true" />
          </div>
          <div>
            <h1 className="text-lg font-semibold tracking-wide">MediQue</h1>
            <p className="text-xs uppercase tracking-widest">Queue Status Board</p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <Clock size={16} className="text-muted-foreground" aria-hidden="true" />
          <span
            className="text-2xl font-semibold"
            aria-live="polite"
            aria-label={`Current time ${currentTime}`}
          >
            {currentTime}
          </span>
          <button
            onClick={onExit}
            aria-label="Exit TV display mode"
            className="ml-4 text-xs text-muted-foreground hover:text-foreground transition-colors px-3 py-1.5 rounded-md hover:bg-surface-muted"
          >
            Exit
          </button>
        </div>
      </header>

      <div className="flex-1 grid grid-cols-1 lg:grid-cols-12 overflow-hidden">
        <section className="lg:col-span-8 p-5 md:p-8 flex flex-col" aria-label="Now serving">
          <h2 className="flex items-center gap-2.5 text-base font-semibold uppercase tracking-widest text-foreground mb-6">
            <span className="h-3 w-3 rounded-full bg-primary animate-pulse" aria-hidden="true" />
            Now Serving
          </h2>

          {activePatients.length === 0 ? (
            <div className="flex-1 flex items-center justify-center border border-border rounded-lg bg-surface">
              <p className="text-2xl font-light text-muted-foreground">Waiting for doctors to call patients…</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5 content-start">
              {activePatients.map((patient) => {
                const dept = managedDepartments.find((department) => department.id === patient.department) ?? DEPARTMENTS[patient.department];
                const deptColor = DEPT_COLORS[patient.department] ?? 'var(--muted-foreground)';
                return (
                  <article
                    key={patient.id}
                    className="bg-surface border border-border rounded-lg overflow-hidden"
                    aria-label={`Token ${patient.tokenNumber}, ${dept?.name ?? patient.department}`}
                  >
                    <div className="h-1 w-full" style={{ background: deptColor }} />
                    <div className="p-6">
                      <div className="flex justify-between items-start mb-5">
                        <span className="text-xs font-semibold uppercase tracking-wider" style={{ color: deptColor }}>
                          {dept?.name ?? patient.department}
                        </span>
                        {patient.status === PatientStatus.CALLED && (
                          <span className="badge badge-success animate-pulse text-[10px]">Just Called</span>
                        )}
                      </div>

                      <div className="text-8xl font-bold tracking-tight text-foreground text-center my-4 leading-none" aria-label={`Token ${patient.tokenNumber}`}>
                        {patient.tokenNumber}
                      </div>

                      <div className="bg-surface-muted border border-border rounded-md p-3 flex items-center gap-3">
                        <div className="h-9 w-9 rounded-full bg-surface border border-border flex items-center justify-center text-muted-foreground font-semibold text-sm flex-shrink-0">
                          Dr
                        </div>
                        <p className="text-base font-semibold text-foreground">
                          {patient.assignedDoctor ?? 'Available Doctor'}
                        </p>
                      </div>
                    </div>
                  </article>
                );
              })}
            </div>
          )}
        </section>

        <section className="lg:col-span-4 border-l-0 lg:border-l border-border p-5 md:p-6 flex flex-col overflow-hidden" aria-label="Upcoming patients">
          <h2 className="text-base font-semibold uppercase tracking-widest text-foreground mb-5">Up Next</h2>

          <div className="flex-1 space-y-5 overflow-y-auto no-scrollbar pb-6">
            {managedDepartments.map((department) => {
              const deptId = department.id;
              const dept = department ?? DEPARTMENTS[deptId as Department];
              const waiting = upcomingPatients[deptId] ?? [];
              if (waiting.length === 0) return null;
              const color = DEPT_COLORS[deptId] ?? 'var(--muted-foreground)';

              return (
                <div key={deptId} className="bg-surface border border-border rounded-md p-4" role="region" aria-label={`${dept.name} queue`}>
                  <p className="text-xs font-semibold uppercase tracking-wider mb-3" style={{ color }}>
                    {dept.code} — {dept.name}
                  </p>
                  <div className="space-y-2">
                    {waiting.map((patient) => {
                      const waitMin = Math.floor((Date.now() - patient.checkInTime) / 60_000);
                      return (
                        <div
                          key={patient.id}
                          className="flex justify-between items-center bg-surface-muted px-3 py-2.5 rounded-md border-l-4"
                          style={{ borderLeftColor: color }}
                          aria-label={`Token ${patient.tokenNumber}, waiting ${waitMin} minutes`}
                        >
                          <span className="text-xl font-bold text-foreground">{patient.tokenNumber}</span>
                          <span className="text-xs text-muted-foreground">{waitMin}m</span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}

            {Object.keys(upcomingPatients).length === 0 && (
              <p className="text-sm text-muted-foreground italic">No patients waiting in queue.</p>
            )}
          </div>
        </section>
      </div>
    </div>
  );
};
