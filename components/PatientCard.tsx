import React from 'react';
import { Patient, PatientStatus } from '../types';
import { Clock, AlertTriangle, User, ArrowRight, XCircle, Lock } from 'lucide-react';

interface PatientCardProps {
  patient: Patient;
  onCall: (id: string) => void;
  onComplete: (id: string) => void;
  onNoShow?: (id: string) => void;
  isActive?: boolean;
  actionsDisabled?: boolean;
}

export const PatientCard: React.FC<PatientCardProps> = ({ patient, onCall, onComplete, onNoShow, isActive, actionsDisabled }) => {
  const waitTime = Math.floor((Date.now() - patient.checkInTime) / 60000);

  return (
    <div 
      className={`relative p-4 rounded-xl border-l-4 shadow-sm transition-all duration-300 hover:shadow-md border ${
        isActive 
          ? 'bg-blue-50 border-blue-200 border-l-blue-500 ring-1 ring-blue-200' 
          : patient.isUrgent 
            ? 'bg-red-50 border-red-200 border-l-red-500' 
            : 'bg-white border-slate-200 border-l-slate-300'
      } ${actionsDisabled && !isActive ? 'opacity-60 grayscale' : ''}`}
    >
      <div className="flex justify-between items-start">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-2xl font-black tracking-tight text-slate-900">{patient.tokenNumber}</span>
            {patient.isUrgent && (
              <span className="flex items-center gap-1 text-xs font-bold text-red-600 bg-red-100 px-2 py-0.5 rounded-full">
                <AlertTriangle size={10} /> URGENT
              </span>
            )}
          </div>
          <div className="text-sm text-slate-600 flex items-center gap-1 mb-2">
             <User size={12} /> {patient.name} ({patient.age}y)
          </div>
          <div className="flex flex-wrap gap-1">
            {patient.symptoms.slice(0, 3).map((s, i) => (
              <span key={i} className="text-xs bg-gray-200 text-gray-700 px-1.5 py-0.5 rounded">
                {s}
              </span>
            ))}
            {patient.symptoms.length > 3 && <span className="text-xs text-gray-500">+{patient.symptoms.length - 3}</span>}
          </div>
        </div>
        
        <div className="text-right flex flex-col items-end gap-2">
           <div className="flex items-center justify-end text-xs text-gray-500 gap-1 mb-1">
             <Clock size={12} /> {waitTime}m wait
           </div>
           
           {patient.status === PatientStatus.WAITING && (
             <div className="flex gap-2">
                {onNoShow && (
                  <button
                    onClick={() => onNoShow(patient.id)}
                    disabled={actionsDisabled}
                    title="Mark No Show"
                    className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-md transition-colors disabled:cursor-not-allowed disabled:hover:text-gray-400 disabled:hover:bg-transparent"
                  >
                    <XCircle size={16} />
                  </button>
                )}
                <button
                    onClick={() => onCall(patient.id)}
                    disabled={actionsDisabled}
                    className={`text-white text-sm px-4 py-2 rounded-md transition-colors shadow-sm flex items-center gap-1 ${
                      actionsDisabled 
                        ? 'bg-gray-400 cursor-not-allowed' 
                        : 'bg-blue-600 hover:bg-blue-700'
                    }`}
                >
                    {actionsDisabled ? <Lock size={14} /> : <ArrowRight size={14} />} Call
                </button>
             </div>
           )}
           
           {(patient.status === PatientStatus.CALLED || patient.status === PatientStatus.IN_CONSULTATION) && (
              <button
                onClick={() => onComplete(patient.id)}
                className="bg-green-600 text-white text-sm px-4 py-2 rounded-md hover:bg-green-700 transition-colors shadow-sm"
             >
                Complete
             </button>
           )}
        </div>
      </div>
    </div>
  );
};