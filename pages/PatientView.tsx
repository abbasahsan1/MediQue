import React, { useEffect, useState, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Patient, PatientStatus } from '../types';
import { queueService } from '../services/queueService';
import { DEPARTMENTS } from '../constants';
import { Bell, Volume2, AlertTriangle, Stethoscope, Activity, Clock } from 'lucide-react';

const DEPT_BORDER: Record<string, string> = {
  GENERAL: 'border-dept-general',
  ENT: 'border-dept-ent',
  ORTHOPEDICS: 'border-dept-orthopedics',
  DENTAL: 'border-dept-dental',
  CARDIOLOGY: 'border-dept-cardiology',
};

const AVG_MINUTES_PER_PATIENT = 10;

export const PatientView: React.FC = () => {
  const { patientId } = useParams<{ patientId: string }>();
  const navigate = useNavigate();
  const [patient, setPatient] = useState<Patient | undefined>(undefined);
  const [position, setPosition] = useState<number>(0);
  const [currentServing, setCurrentServing] = useState<string>('-');
  const [lastNotifiedPos, setLastNotifiedPos] = useState<number>(999);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    audioRef.current = new Audio('https://actions.google.com/sounds/v1/alarms/beep_short.ogg');
    if ('Notification' in window && Notification.permission === 'default') {
      void Notification.requestPermission();
    }
  }, []);

  useEffect(() => {
    if (!patientId) return;

    const updateData = async () => {
      const current = await queueService.fetchPatient(patientId);

      if (current && current.status === PatientStatus.CALLED && patient?.status !== PatientStatus.CALLED) {
        if ('Notification' in window && Notification.permission === 'granted') {
          new Notification("It's Your Turn!", {
            body: `Token ${current.tokenNumber} — Please proceed to the room.`,
            icon: '/favicon.ico',
          });
        }
        audioRef.current?.play().catch(() => {});
      }

      setPatient(current);

      if (current) {
        await queueService.refreshDepartment(current.department);
        const queue = queueService.getQueue(current.department);
        const myIndex = queue.findIndex((qPatient) => qPatient.id === current.id);
        const waitingBefore = queue.filter(
          (qPatient, idx) => idx < myIndex && qPatient.status === PatientStatus.WAITING,
        ).length;
        const nextPosition = waitingBefore + 1;
        setPosition(nextPosition);

        if (nextPosition <= 3 && nextPosition > 0 && lastNotifiedPos > 3 && current.status === PatientStatus.WAITING) {
          if ('Notification' in window && Notification.permission === 'granted') {
            new Notification('Almost There', {
              body: `You are #${nextPosition} in line. Please stay near the department.`,
              icon: '/favicon.ico',
            });
          }
          audioRef.current?.play().catch(() => {});
          setLastNotifiedPos(nextPosition);
        } else if (nextPosition > 3) {
          setLastNotifiedPos(nextPosition);
        }

        const active = queue.find(
          (qPatient) => qPatient.status === PatientStatus.CALLED || qPatient.status === PatientStatus.IN_CONSULTATION,
        );
        setCurrentServing(active ? active.tokenNumber : 'None');
      }
    };

    void updateData();
    const unsub = queueService.subscribe(() => { void updateData(); });
    return () => unsub();
  }, [patientId, patient?.status, lastNotifiedPos]);

  if (!patient) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-6">
        <div className="text-center text-sm">Loading your queue status…</div>
      </div>
    );
  }

  const dept = DEPARTMENTS[patient.department] ?? {
    id: patient.department,
    name: patient.department,
    code: patient.department.slice(0, 4).toUpperCase(),
    color: 'bg-dept-general',
  };
  const isCalled = patient.status === PatientStatus.CALLED;
  const isInConsultation = patient.status === PatientStatus.IN_CONSULTATION;
  const isCompleted = patient.status === PatientStatus.COMPLETED;
  const isNoShow = patient.status === PatientStatus.NO_SHOW;
  const aheadCount = Math.max(0, position - 1);
  const estimatedWait = aheadCount * AVG_MINUTES_PER_PATIENT;

  const topBorder = isCalled || isInConsultation
    ? 'border-success'
    : isNoShow
      ? 'border-destructive'
      : (DEPT_BORDER[patient.department] ?? 'border-primary');

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <header className="page-header px-5 py-4 flex items-center justify-between" role="banner">
        <div className="flex items-center gap-2">
          <div className="h-[30px] w-[30px] bg-primary text-primary-foreground rounded-md flex items-center justify-center font-bold text-sm">
            G
          </div>
          <span className="font-semibold text-foreground text-sm">Gravity</span>
        </div>
      </header>

      <div className="flex-1 flex justify-center p-5 pt-8">
        <div className="w-full max-w-sm space-y-4">
          <div className="text-center">
            <p className="text-xs font-semibold uppercase tracking-widest">{dept.name}</p>
          </div>

          <div className={`card overflow-hidden border-t-4 ${topBorder}`}>
            <div className="p-8 text-center relative">
              {isCalled && (
                <div className="absolute top-4 right-4 text-success animate-pulse">
                  <Volume2 size={22} aria-label="Called" />
                </div>
              )}
              <p className="text-xs font-semibold uppercase tracking-widest mb-2">Your Token</p>
              <div className="text-6xl font-bold text-foreground tracking-tight mb-3" aria-label={`Token number ${patient.tokenNumber}`}>
                {patient.tokenNumber}
              </div>
              <span className={`badge text-sm py-1.5 px-4 ${
                isCalled || isInConsultation ? 'badge-success' :
                  isCompleted ? 'badge-neutral' :
                    isNoShow ? 'badge-destructive' :
                      'badge-primary'
              } ${isCalled ? 'animate-pulse' : ''}`}>
                {patient.status.replace('_', ' ')}
              </span>
            </div>

            {/* Live status board for waiting patients */}
            {!isCompleted && !isCalled && !isInConsultation && !isNoShow && (
              <div className="border-t border-border bg-surface-muted px-6 py-5">
                <div className="text-center mb-3">
                  <p className="text-lg font-bold text-foreground">
                    You are <span className="text-primary">#{position}</span> in line
                  </p>
                  <div className="flex items-center justify-center gap-1.5 mt-1">
                    <Clock size={13} className="text-muted-foreground" />
                    <p className="text-sm text-secondary">
                      Estimated wait: <span className="font-semibold text-foreground">{estimatedWait} mins</span>
                    </p>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3 text-center">
                  <div className="bg-surface border border-border rounded-md p-3">
                    <p className="text-xs uppercase mb-1 text-muted-foreground">Ahead of you</p>
                    <p className={`text-2xl font-bold ${aheadCount <= 2 ? 'text-warning' : 'text-foreground'}`} aria-live="polite">
                      {aheadCount}
                    </p>
                  </div>
                  <div className="bg-surface border border-border rounded-md p-3">
                    <p className="text-xs uppercase mb-1 text-muted-foreground">Now Serving</p>
                    <p className="text-2xl font-bold text-primary">{currentServing}</p>
                  </div>
                </div>
              </div>
            )}
          </div>

          {isCalled && (
            <div role="alert" aria-live="assertive" className="bg-success text-success-foreground rounded-lg p-6 text-center">
              <Bell className="mx-auto mb-2" size={28} aria-hidden="true" />
              <h2 className="text-xl font-bold mb-1 text-success-foreground">It's Your Turn!</h2>
              <p className="text-sm text-success-foreground/90">Please proceed to the room immediately.</p>
            </div>
          )}

          {isInConsultation && (
            <div className="card p-6 text-center">
              <Stethoscope size={28} className="mx-auto mb-2 text-success" aria-hidden="true" />
              <h2 className="text-base font-bold text-foreground">Visit in Progress</h2>
              <p className="text-sm mt-1">You are currently with the doctor.</p>
            </div>
          )}

          {!isCalled && aheadCount <= 2 && aheadCount >= 0 && !isInConsultation && !isCompleted && !isNoShow && (
            <div role="alert" aria-live="polite" className="alert alert-warn">
              <AlertTriangle size={16} aria-hidden="true" />
              <div>
                <p className="font-semibold text-sm">Almost Your Turn</p>
                <p className="text-xs mt-0.5">Please stay near the department entrance.</p>
              </div>
            </div>
          )}

          {isNoShow && (
            <div className="card p-6 text-center">
              <AlertTriangle size={28} className="mx-auto mb-3 text-destructive" aria-hidden="true" />
              <h2 className="text-base font-bold text-foreground mb-1">Missed Appointment</h2>
              <p className="text-sm text-secondary mb-5">You were marked absent. Please re-scan the QR code to rejoin the queue.</p>
            </div>
          )}

          {isCompleted && (
            <div className="card p-6">
              <h3 className="text-base font-bold text-foreground mb-1">Visit Complete</h3>
              <p className="text-sm text-secondary mb-4">Thank you for visiting {dept.name}.</p>
              {patient.notes && (
                <div className="alert alert-info mb-5 text-sm">
                  <div>
                    <p className="font-semibold mb-1">Doctor's Notes</p>
                    <p className="leading-relaxed">{patient.notes}</p>
                  </div>
                </div>
              )}
            </div>
          )}

          {!isCompleted && !isNoShow && (
            <p className="text-center text-xs pt-2">Do not close this window — your spot is saved automatically.</p>
          )}
        </div>
      </div>
    </div>
  );
};
