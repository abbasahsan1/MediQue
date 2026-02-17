import React, { useEffect, useState, useRef } from 'react';
import { Patient, PatientStatus } from '../types';
import { queueService } from '../services/queueService';
import { DEPARTMENTS } from '../constants';
import { Bell, Volume2, AlertOctagon, FlaskConical, Stethoscope } from 'lucide-react';

interface PatientViewProps {
  patientId: string;
  onExit: () => void;
}

export const PatientView: React.FC<PatientViewProps> = ({ patientId, onExit }) => {
  const [patient, setPatient] = useState<Patient | undefined>(queueService.getPatient(patientId));
  const [position, setPosition] = useState<number>(0);
  const [currentServing, setCurrentServing] = useState<string>('-');
  const [lastNotifiedPosition, setLastNotifiedPosition] = useState<number>(999);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  // Initialize audio and request notification permissions
  useEffect(() => {
    // Use a standard beep sound for notifications
    const audio = new Audio("https://actions.google.com/sounds/v1/alarms/beep_short.ogg"); 
    audioRef.current = audio;

    if ("Notification" in window && Notification.permission === "default") {
      Notification.requestPermission();
    }
  }, []);

  useEffect(() => {
    const updateData = () => {
      const p = queueService.getPatient(patientId);
      
      // Edge Case: Notifications
      // Check for status change to trigger notification AND Sound
      if (p && p.status === PatientStatus.CALLED && patient?.status !== PatientStatus.CALLED) {
        // 1. Browser Notification
        if ("Notification" in window && Notification.permission === "granted") {
          new Notification("It's Your Turn!", {
            body: `Token ${p.tokenNumber} - Please proceed to the room.`,
            icon: '/favicon.ico'
          });
        }
        
        // 2. Play Sound
        if (audioRef.current) {
          audioRef.current.play().catch(e => console.log("Audio play blocked (user interaction required):", e));
        }
      }

      setPatient(p);

      if (p) {
        const queue = queueService.getQueue(p.department);
        // Find position: count people with status WAITING who are ahead in the array
        const myIndex = queue.findIndex(x => x.id === p.id);
        const waitingBeforeMe = queue.filter((x, idx) => idx < myIndex && x.status === PatientStatus.WAITING).length;
        const currentPosition = waitingBeforeMe + 1;
        
        setPosition(currentPosition);

        // Notify if 3rd in line (and wasn't before notified for this specific milestone)
        if (currentPosition <= 3 && currentPosition > 0 && lastNotifiedPosition > 3 && p.status === PatientStatus.WAITING) {
             if ("Notification" in window && Notification.permission === "granted") {
                new Notification("Almost There", {
                  body: `You are #${currentPosition} in line. Please stay close to the department.`,
                  icon: '/favicon.ico'
                });
             }
             if (audioRef.current) {
                audioRef.current.play().catch(() => {});
             }
             setLastNotifiedPosition(currentPosition);
        } else if (currentPosition > 3) {
             // Reset if they somehow go back in line (rare edge case but good hygiene)
             setLastNotifiedPosition(currentPosition);
        }

        // Who is currently serving?
        // Logic: Find ANYONE serving in this department, prioritizing those called recently.
        const active = queue.find(x => x.status === PatientStatus.CALLED || x.status === PatientStatus.IN_CONSULTATION);
        setCurrentServing(active ? active.tokenNumber : 'None');
      }
    };

    updateData();
    const unsubscribe = queueService.subscribe(updateData);
    return () => unsubscribe();
  }, [patientId, patient?.status, lastNotifiedPosition]);

  if (!patient) return <div className="p-8 text-center text-red-500">Patient record not found. Please rescan.</div>;

  const dept = DEPARTMENTS[patient.department];
  const isCalled = patient.status === PatientStatus.CALLED;
  const isInConsultation = patient.status === PatientStatus.IN_CONSULTATION;
  const isCompleted = patient.status === PatientStatus.COMPLETED;
  const isNoShow = patient.status === PatientStatus.NO_SHOW;
  const isReferred = patient.status === PatientStatus.REFERRED;

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col items-center p-6">
      <div className="w-full max-w-md space-y-6">
        
        {/* Header */}
        <div className="flex justify-between items-center">
            <h1 className="text-xl font-bold text-gray-800">{dept.name}</h1>
            <button onClick={onExit} className="text-sm text-gray-400 hover:text-gray-600">Leave</button>
        </div>

        {/* Token Card */}
        <div className={`bg-white rounded-2xl shadow-xl overflow-hidden border-t-8 ${
          isCalled ? 'border-green-500' : 
          isInConsultation ? 'border-green-600' :
          isNoShow ? 'border-red-500' :
          isReferred ? 'border-indigo-500' :
          dept.color
        }`}>
          <div className="p-8 text-center relative">
            {isCalled && <div className="absolute top-4 right-4 animate-ping text-green-500"><Volume2 size={24} /></div>}
            
            <p className="text-gray-500 uppercase text-sm tracking-widest font-semibold mb-2">Your Token</p>
            <div className="text-6xl font-black text-gray-900 tracking-tighter mb-2">{patient.tokenNumber}</div>
            <div className={`inline-block px-4 py-1 rounded-full text-sm font-bold ${
              isCalled ? 'bg-green-100 text-green-700 animate-pulse' : 
              isInConsultation ? 'bg-green-100 text-green-800' :
              isCompleted ? 'bg-gray-100 text-gray-600' :
              isNoShow ? 'bg-red-100 text-red-600' :
              isReferred ? 'bg-indigo-100 text-indigo-700' :
              'bg-blue-50 text-blue-700'
            }`}>
              {patient.status.replace('_', ' ')}
            </div>
          </div>
          
          {/* Status Footer */}
          {!isCompleted && !isCalled && !isInConsultation && !isNoShow && !isReferred && (
            <div className="bg-gray-50 px-6 py-4 border-t border-gray-100 flex justify-between items-center">
               <div className="text-center">
                 <p className="text-xs text-gray-400 uppercase">Ahead of you</p>
                 <p className={`text-xl font-bold ${position <= 3 ? 'text-orange-500 animate-pulse' : 'text-gray-700'}`}>{Math.max(0, position - 1)}</p>
               </div>
               <div className="h-8 w-px bg-gray-200"></div>
               <div className="text-center">
                 <p className="text-xs text-gray-400 uppercase">Est. Wait</p>
                 <p className="text-xl font-bold text-gray-700">{Math.max(0, position - 1) * 10}m</p>
               </div>
               <div className="h-8 w-px bg-gray-200"></div>
               <div className="text-center">
                 <p className="text-xs text-gray-400 uppercase">Now Serving</p>
                 <p className="text-xl font-bold text-blue-600">{currentServing}</p>
               </div>
            </div>
          )}
        </div>

        {/* Action / Notification Area */}
        {isCalled && (
          <div className="bg-green-600 text-white p-6 rounded-xl shadow-lg animate-bounce text-center">
            <Bell className="mx-auto mb-2" size={32} />
            <h2 className="text-2xl font-bold mb-1">It's Your Turn!</h2>
            <p className="opacity-90">Please proceed to Room 4 immediately.</p>
          </div>
        )}

        {isInConsultation && (
           <div className="bg-green-50 text-green-900 p-6 rounded-xl border border-green-200 shadow-sm text-center flex flex-col items-center animate-fade-in">
             <Stethoscope size={32} className="mb-2 text-green-600" />
             <h2 className="text-xl font-bold">Visit in Progress</h2>
             <p className="text-sm opacity-80 mt-1">You are currently with the doctor.</p>
           </div>
        )}

        {!isCalled && position <= 3 && position > 0 && !isInConsultation && !isCompleted && !isNoShow && (
           <div className="bg-orange-50 text-orange-800 p-4 rounded-xl border border-orange-200 flex items-center gap-3 animate-fade-in-up">
              <AlertOctagon size={24} />
              <div>
                <p className="font-bold">You are Up Next!</p>
                <p className="text-xs">Please stay close to the department entrance.</p>
              </div>
           </div>
        )}

        {isNoShow && (
          <div className="bg-red-50 border border-red-200 p-6 rounded-xl shadow-sm text-center">
            <AlertOctagon className="mx-auto mb-2 text-red-500" size={32} />
            <h2 className="text-xl font-bold text-red-800 mb-1">Missed Appointment</h2>
            <p className="text-red-600 text-sm mb-4">You were marked as absent. Please rejoin the queue if you are still waiting.</p>
            <button 
              onClick={onExit} 
              className="bg-red-600 text-white px-6 py-2 rounded-lg font-medium hover:bg-red-700"
            >
              Rejoin Queue
            </button>
          </div>
        )}

        {isReferred && (
          <div className="bg-indigo-50 border border-indigo-200 p-6 rounded-xl shadow-sm text-center">
            <FlaskConical className="mx-auto mb-2 text-indigo-500" size={32} />
            <h2 className="text-xl font-bold text-indigo-800 mb-1">Referred to Lab</h2>
            <p className="text-indigo-600 text-sm mb-4">Please proceed to the laboratory for further tests.</p>
            {patient.notes && (
              <div className="bg-white p-3 rounded-lg border border-indigo-100 text-sm text-indigo-900 text-left">
                <strong>Instructions:</strong><br/>
                {patient.notes}
              </div>
            )}
            <button 
              onClick={onExit}
              className="mt-6 w-full py-3 bg-gray-900 text-white rounded-lg font-medium"
            >
              Close
            </button>
          </div>
        )}

        {isCompleted && (
          <div className="bg-white p-6 rounded-xl shadow border border-gray-200">
            <h3 className="text-lg font-bold text-gray-800 mb-2">Visit Summary</h3>
            <p className="text-gray-600 text-sm mb-4">Thank you for visiting {dept.name}.</p>
            {patient.notes && (
              <div className="bg-yellow-50 p-4 rounded-lg border border-yellow-200 text-sm text-yellow-800">
                <strong>Doctor's Notes:</strong><br/>
                {patient.notes}
              </div>
            )}
            <button 
              onClick={onExit}
              className="mt-6 w-full py-3 bg-gray-900 text-white rounded-lg font-medium"
            >
              Close
            </button>
          </div>
        )}

        {/* Info */}
        {!isCompleted && !isNoShow && !isReferred && (
            <div className="text-center text-xs text-gray-400 mt-8">
                <p>Do not close this window.</p>
                <p>Your spot is saved automatically.</p>
            </div>
        )}

      </div>
    </div>
  );
};