import React from 'react';
import { Patient, PatientStatus } from '../types';
import { URGENT_KEYWORDS } from '../constants';
import { Clock, AlertTriangle, ChevronRight, XCircle } from 'lucide-react';

interface PatientCardProps {
  patient: Patient;
  onCall: (id: string) => void;
  onComplete: (id: string) => void;
  onNoShow?: (id: string) => void;
  isActive?: boolean;
  actionsDisabled?: boolean;
}

function isProblemSevere(text?: string): boolean {
  if (!text) return false;
  const lower = text.toLowerCase();
  return URGENT_KEYWORDS.some((kw) => lower.includes(kw));
}

export const PatientCard: React.FC<PatientCardProps> = ({
  patient, onCall, onComplete, onNoShow, isActive, actionsDisabled,
}) => {
  const waitTime = Math.floor((Date.now() - patient.checkInTime) / 60000);
  const isLongWait = waitTime > 30;
  const severe = isProblemSevere(patient.problemDescription);

  return (
    <div className={[
      'card p-4 transition-all duration-300',
      isActive ? 'ring-2 ring-primary border-primary/40 bg-primary/10' : 'card-hover',
      patient.isUrgent && !isActive ? 'border-destructive/45 bg-destructive/8' : '',
      actionsDisabled && !isActive ? 'opacity-50' : '',
    ].filter(Boolean).join(' ')}>

      <div className="flex items-start justify-between gap-3">
        {/* Left: token + info */}
        <div className="flex items-start gap-3 min-w-0">
          <div className={`flex-shrink-0 h-12 w-12 rounded-full flex items-center justify-center font-bold text-lg border-2 ${
            isActive
              ? 'bg-primary/10 border-primary text-primary'
              : patient.isUrgent
                ? 'bg-destructive/10 border-destructive/50 text-destructive'
                : 'bg-surface-muted border-border text-foreground'
          }`}>
            {patient.tokenNumber.split('-')[1] ?? patient.tokenNumber}
          </div>

          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-semibold text-foreground text-sm truncate max-w-[120px]">{patient.name}</span>
              <span className="text-xs text-muted-foreground">{patient.age}y</span>
              {patient.isUrgent && (
                <span className="badge badge-destructive flex items-center gap-1">
                  <AlertTriangle size={9} /> URGENT
                </span>
              )}
            </div>
            {patient.problemDescription && (
              <p className={`text-xs mt-1 truncate max-w-[180px] ${severe ? 'text-destructive font-semibold' : 'text-muted-foreground'}`}>
                {patient.problemDescription}
              </p>
            )}
          </div>
        </div>

        {/* Right: wait + actions */}
        <div className="flex flex-col items-end gap-2 flex-shrink-0">
          <div className={`flex items-center gap-1 text-xs font-medium ${isLongWait ? 'text-warning' : 'text-muted-foreground'}`}>
            <Clock size={11} />{waitTime}m
          </div>

          {patient.status === PatientStatus.WAITING && (
            <div className="flex items-center gap-1.5">
              {onNoShow && (
                <button
                  type="button"
                  onClick={() => onNoShow(patient.id)}
                  disabled={actionsDisabled}
                  title="Mark as No-Show"
                  className="p-1.5 rounded-md text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                >
                  <XCircle size={15} />
                </button>
              )}
              <button
                type="button"
                onClick={() => onCall(patient.id)}
                disabled={actionsDisabled}
                className="btn-primary btn-sm flex items-center gap-1"
              >
                Call <ChevronRight size={13} />
              </button>
            </div>
          )}

          {(patient.status === PatientStatus.CALLED || patient.status === PatientStatus.IN_CONSULTATION) && (
            <button
              type="button"
              onClick={() => onComplete(patient.id)}
              className="btn-success btn-sm"
            >
              Complete
            </button>
          )}
        </div>
      </div>
    </div>
  );
};