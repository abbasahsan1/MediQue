import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Patient, PatientStatus } from '../types';
import { DEPARTMENTS, URGENT_KEYWORDS } from '../constants';
import { queueService, DoctorSession } from '../services/queueService';
import {
  LogOut, CheckCircle, Clock, XOctagon,
  AlertTriangle, Activity, Users, Inbox, FlaskConical,
} from 'lucide-react';

function isProblemSevere(text?: string): boolean {
  if (!text) return false;
  const lower = text.toLowerCase();
  return URGENT_KEYWORDS.some((kw) => lower.includes(kw));
}

export const DoctorDashboard: React.FC = () => {
  const navigate = useNavigate();
  const [session] = useState<DoctorSession | null>(() => queueService.getDoctorSession());

  const [queue, setQueue] = useState<Patient[]>([]);
  const [currentPatient, setCurrentPatient] = useState<Patient | null>(null);
  const [notes, setNotes] = useState('');
  const [actionError, setActionError] = useState<string | null>(null);
  const [queueError, setQueueError] = useState<string | null>(null);
  const [confirmAction, setConfirmAction] = useState<'no_show' | null>(null);

  // Redirect if not logged in
  useEffect(() => {
    if (!session) navigate('/doctor/login', { replace: true });
  }, [session, navigate]);

  const departmentId = session?.department_id ?? '';
  const doctorName = session?.name ?? '';
  const deptName = session?.department_name ?? DEPARTMENTS[departmentId]?.name ?? departmentId;
  const deptCode = session?.department_code ?? DEPARTMENTS[departmentId]?.code ?? departmentId.slice(0, 3).toUpperCase();

  useEffect(() => {
    if (!departmentId) return;

    const update = async () => {
      try {
        await queueService.refreshDepartment(departmentId);
        setQueueError(null);
      } catch {
        setQueueError('Queue data unavailable — retrying…');
      }
      const q = queueService.getQueue(departmentId);
      setQueue(q);
      const active = q.find(
        (patient) => (patient.status === PatientStatus.CALLED || patient.status === PatientStatus.IN_CONSULTATION)
          && patient.assignedDoctor === doctorName,
      );
      setCurrentPatient(active ?? null);
    };
    void update();
    const unsub = queueService.subscribe(() => { void update(); }, departmentId);
    return () => unsub();
  }, [departmentId, doctorName]);

  const handleCallNext = async () => {
    if (currentPatient) return;
    setActionError(null);
    try {
      const claimed = await queueService.callNextFromDepartment(departmentId, doctorName);
      if (!claimed) {
        setActionError('No waiting patients in department pool.');
      }
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'Failed to call next patient.');
    }
  };

  const handleComplete = async (id: string, prescriptionNotes?: string) => {
    setActionError(null);
    try {
      await queueService.updateStatus(id, PatientStatus.COMPLETED, prescriptionNotes ?? notes, doctorName);
      setNotes('');
      setCurrentPatient(null);
      setConfirmAction(null);
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'Failed to complete visit.');
    }
  };

  const handleReferToLab = async (id: string) => {
    setActionError(null);
    const labNotes = notes ? `${notes}\n\nReferred to Lab for testing.` : 'Referred to Lab for testing.';
    try {
      await queueService.updateStatus(id, PatientStatus.COMPLETED, labNotes, doctorName);
      setNotes('');
      setCurrentPatient(null);
      setConfirmAction(null);
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'Failed to refer patient.');
    }
  };

  const handleNoShow = async (id: string) => {
    setActionError(null);
    try {
      await queueService.updateStatus(id, PatientStatus.NO_SHOW, undefined, doctorName);
      setNotes('');
      setCurrentPatient(null);
      setConfirmAction(null);
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'Failed to mark no-show.');
    }
  };

  const handleLogout = () => {
    queueService.doctorLogout();
    navigate('/doctor/login', { replace: true });
  };

  if (!session) return null;

  const waitingList = queue.filter((patient) => patient.status === PatientStatus.WAITING);
  const completedCount = queue.filter((patient) => patient.status === PatientStatus.COMPLETED).length;

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header */}
      <header className="border-b border-border px-5 py-3 flex items-center gap-3 flex-wrap">
        <div className="flex items-center gap-2.5">
          <div className="h-9 w-9 bg-primary text-primary-foreground rounded-md flex items-center justify-center">
            <Activity size={18} />
          </div>
          <div>
            <p className="text-sm font-bold text-foreground leading-tight">{doctorName}</p>
            <p className="text-xs text-muted-foreground">{deptCode} — {deptName}</p>
          </div>
        </div>
        <div className="flex items-center gap-2 ml-auto flex-wrap">
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-surface border border-border">
            <Users size={12} className="text-primary" />
            <span className="text-xs font-semibold text-foreground">{waitingList.length}</span>
            <span className="text-xs text-muted-foreground">waiting</span>
          </div>
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-surface border border-border">
            <CheckCircle size={12} className="text-primary" />
            <span className="text-xs font-semibold text-foreground">{completedCount} done</span>
          </div>
          <button onClick={handleLogout} aria-label="Logout" className="btn-ghost flex items-center gap-1.5 text-sm">
            <LogOut size={14} /> Logout
          </button>
        </div>
      </header>

      <main className="flex-1 p-5 md:p-6">
        <div className="max-w-6xl mx-auto space-y-5">
          {queueError && <div className="alert alert-warn"><Clock size={14} />{queueError}</div>}
          {actionError && <div className="alert alert-error"><AlertTriangle size={14} />{actionError}</div>}

          <div className="grid grid-cols-1 lg:grid-cols-5 gap-5 items-start">
            {/* Queue list */}
            <div className="lg:col-span-2 space-y-3">
              <div className="flex items-center justify-between">
                <h3>Queue</h3>
                <div className="flex items-center gap-2">
                  <span className="badge badge-primary">{waitingList.length}</span>
                  <button
                    type="button"
                    onClick={() => void handleCallNext()}
                    disabled={!!currentPatient || waitingList.length === 0}
                    className="btn-primary btn-sm"
                  >
                    Call Next
                  </button>
                </div>
              </div>

              {waitingList.length === 0 ? (
                <div className="card p-8 text-center text-sm">Queue is clear.</div>
              ) : (
                <div className="space-y-2 no-scrollbar overflow-y-auto" style={{ maxHeight: '75vh' }}>
                  {waitingList.map((patient) => {
                    const waitTime = Math.floor((Date.now() - patient.checkInTime) / 60000);
                    const severe = isProblemSevere(patient.problemDescription);
                    return (
                      <div
                        key={patient.id}
                        className={`card p-3.5 ${patient.isUrgent ? 'border-destructive/45' : ''}`}
                      >
                        <div className="flex items-center justify-between gap-2">
                          <div className="flex items-center gap-3 min-w-0">
                            <div className={`flex-shrink-0 h-10 w-10 rounded-full flex items-center justify-center font-bold text-sm border-2 ${
                              patient.isUrgent
                                ? 'bg-destructive/10 border-destructive/50 text-destructive'
                                : 'bg-surface-muted border-border text-foreground'
                            }`}>
                              {patient.tokenNumber.split('-')[1] ?? patient.tokenNumber}
                            </div>
                            <div className="min-w-0">
                              <div className="flex items-center gap-2">
                                <span className="font-semibold text-foreground text-sm truncate">{patient.name}</span>
                                <span className="text-xs text-muted-foreground">{patient.age}y</span>
                                {patient.isUrgent && (
                                  <span className="badge badge-destructive text-[10px]">URGENT</span>
                                )}
                              </div>
                              {patient.problemDescription && (
                                <p className={`text-xs mt-0.5 truncate max-w-[200px] ${severe ? 'text-destructive font-semibold' : 'text-muted-foreground'}`}>
                                  {patient.problemDescription}
                                </p>
                              )}
                            </div>
                          </div>
                          <div className="flex items-center gap-1 text-xs text-muted-foreground flex-shrink-0">
                            <Clock size={11} />{waitTime}m
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Active patient */}
            <div className="lg:col-span-3 space-y-4">
              <div className="flex items-center gap-2">
                <span className="h-2.5 w-2.5 rounded-full bg-primary animate-pulse" />
                <h3>Active Patient</h3>
              </div>

              {currentPatient ? (
                <div className="card p-6">
                  <div className="flex items-start justify-between mb-5">
                    <div>
                      <div className="text-4xl font-bold text-foreground leading-none mb-2">{currentPatient.tokenNumber}</div>
                      <p className="text-base font-semibold text-secondary">
                        {currentPatient.name}, <span className="text-muted-foreground font-normal">{currentPatient.age}y</span>
                        {currentPatient.gender && <span className="text-muted-foreground font-normal"> · {currentPatient.gender}</span>}
                      </p>
                    </div>
                    <div className="flex flex-col items-end gap-2">
                      <span className="badge badge-success">In Consultation</span>
                      {currentPatient.isUrgent && (
                        <span className="badge badge-destructive flex items-center gap-1">
                          <AlertTriangle size={9} />URGENT
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="bg-surface-muted border border-border rounded-lg p-4 mb-5">
                    <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-2">Patient's Problem</p>
                    {currentPatient.problemDescription ? (
                      <p className={`text-sm leading-relaxed ${isProblemSevere(currentPatient.problemDescription) ? 'text-destructive font-semibold' : 'text-foreground'}`}>
                        {currentPatient.problemDescription}
                      </p>
                    ) : (
                      <span className="text-sm text-muted-foreground">No description provided</span>
                    )}
                  </div>

                  <div className="mb-5">
                    <label className="block text-sm font-semibold text-foreground mb-2">Doctor's Notes / Prescription</label>
                    <textarea
                      className="input-field text-sm"
                      style={{ minHeight: 100 }}
                      placeholder="Enter diagnosis, prescription, or lab instructions…"
                      value={notes}
                      onChange={(event) => setNotes(event.target.value)}
                    />
                  </div>

                  {confirmAction === 'no_show' ? (
                    <div className="bg-destructive/10 border border-destructive/40 rounded-lg p-4">
                      <p className="text-sm font-semibold text-destructive mb-3">Confirm No-Show for token {currentPatient.tokenNumber}?</p>
                      <div className="flex gap-3">
                        <button type="button" onClick={() => setConfirmAction(null)} className="btn-ghost btn-sm flex-1 justify-center">
                          Cancel
                        </button>
                        <button type="button" onClick={() => void handleNoShow(currentPatient.id)} className="btn-danger btn-sm flex-1 justify-center">
                          <XOctagon size={14} /> Confirm No-Show
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="flex gap-3 flex-wrap">
                      <button type="button" onClick={() => setConfirmAction('no_show')} className="btn-ghost flex items-center gap-2 text-destructive hover:bg-destructive/10">
                        <XOctagon size={15} /> No Show
                      </button>
                      <button type="button" onClick={() => void handleReferToLab(currentPatient.id)} className="btn-outline flex items-center gap-2">
                        <FlaskConical size={15} /> Refer to Lab
                      </button>
                      <button type="button" onClick={() => void handleComplete(currentPatient.id)} className="btn-success flex-1 justify-center">
                        <CheckCircle size={16} /> Complete Visit
                      </button>
                    </div>
                  )}
                </div>
              ) : (
                <div className="card p-10 flex flex-col items-center text-center gap-3">
                  <div className="icon-circle icon-circle-muted opacity-60">
                    <Inbox size={24} />
                  </div>
                  <p className="font-medium">No patient currently being served.</p>
                  <p className="text-sm">Click "Call Next" to serve the next patient.</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};
