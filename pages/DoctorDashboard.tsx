import React, { useEffect, useState } from 'react';
import { Department, Patient, PatientStatus } from '../types';
import { DEPARTMENTS } from '../constants';
import { queueService } from '../services/queueService';
import { PatientCard } from '../components/PatientCard';
import { LogOut, CheckCircle, RefreshCw, XOctagon, FlaskConical, Stethoscope, UserCheck } from 'lucide-react';

interface DoctorDashboardProps {
  departmentId: Department;
  onLogout: () => void;
}

export const DoctorDashboard: React.FC<DoctorDashboardProps> = ({ departmentId, onLogout }) => {
  const [queue, setQueue] = useState<Patient[]>([]);
  const [currentPatient, setCurrentPatient] = useState<Patient | null>(null);
  const [notes, setNotes] = useState('');
  
  // Doctor Session State - Initialize from sessionStorage if available
  const [doctorName, setDoctorName] = useState(() => sessionStorage.getItem('mediqueue_doctor_name') || '');
  const [isSessionStarted, setIsSessionStarted] = useState(() => !!sessionStorage.getItem('mediqueue_doctor_name'));

  const dept = DEPARTMENTS[departmentId];

  useEffect(() => {
    const update = () => {
      const q = queueService.getQueue(departmentId);
      setQueue(q);
      
      // Multi-Doctor Logic:
      // Only show the active patient if they are assigned to THIS doctor.
      if (isSessionStarted && doctorName) {
        const active = q.find(p => 
          (p.status === PatientStatus.CALLED || p.status === PatientStatus.IN_CONSULTATION) &&
          p.assignedDoctor === doctorName
        );
        setCurrentPatient(active || null);
      }
    };

    update();
    const unsub = queueService.subscribe(update);
    return () => unsub();
  }, [departmentId, isSessionStarted, doctorName]);

  const handleCall = (id: string) => {
    if (currentPatient) return; // Prevent calling if already busy
    queueService.updateStatus(id, PatientStatus.CALLED, undefined, doctorName);
  };

  const handleComplete = (id: string) => {
    queueService.updateStatus(id, PatientStatus.COMPLETED, notes);
    setNotes('');
    setCurrentPatient(null);
  };

  const handleRefer = (id: string) => {
    queueService.updateStatus(id, PatientStatus.REFERRED, notes);
    setNotes('');
    setCurrentPatient(null);
  };

  const handleNoShow = (id: string) => {
    if (confirm('Mark this patient as No Show?')) {
      queueService.updateStatus(id, PatientStatus.NO_SHOW);
      setNotes('');
      setCurrentPatient(null);
    }
  };

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if(doctorName.trim()) {
      sessionStorage.setItem('mediqueue_doctor_name', doctorName);
      setIsSessionStarted(true);
    }
  };
  
  const handleLogout = () => {
    sessionStorage.removeItem('mediqueue_doctor_name');
    onLogout();
  };

  // --- View: Doctor Login ---
  if (!isSessionStarted) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-white rounded-xl shadow-xl overflow-hidden animate-fade-in-up">
           <div className={`p-6 ${dept.color} text-white text-center`}>
             <Stethoscope size={48} className="mx-auto mb-4 opacity-80" />
             <h2 className="text-2xl font-bold">Doctor Login</h2>
             <p className="opacity-90">{dept.name}</p>
           </div>
           <div className="p-8">
             <form onSubmit={handleLogin} className="space-y-6">
                <div>
                   <label className="block text-sm font-medium text-gray-700 mb-2">Enter your name to start</label>
                   <input 
                      type="text" 
                      required
                      autoFocus
                      placeholder="e.g. Dr. Smith"
                      value={doctorName}
                      onChange={e => setDoctorName(e.target.value)}
                      className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-blue-500 outline-none"
                   />
                </div>
                <button type="submit" className="w-full bg-gray-900 text-white py-3 rounded-lg font-bold hover:bg-black transition-colors">
                  Start Session
                </button>
                <button onClick={onLogout} type="button" className="w-full text-gray-500 text-sm py-2 hover:text-gray-700">
                  Cancel
                </button>
             </form>
           </div>
        </div>
      </div>
    );
  }

  // Waiting list should ONLY show patients with status WAITING.
  // Patients called by *other* doctors should not appear here.
  const waitingList = queue.filter(p => p.status === PatientStatus.WAITING);

  // Processed count (for stats)
  const patientsProcessedCount = queue.filter(p => p.status === PatientStatus.COMPLETED || p.status === PatientStatus.REFERRED).length;

  // --- View: Dashboard ---
  return (
    <div className="min-h-screen bg-gray-100 flex flex-col md:flex-row">
      {/* Sidebar / Info Panel */}
      <div className="w-full md:w-80 bg-white border-r border-gray-200 flex flex-col h-screen sticky top-0">
        <div className={`p-6 ${dept.color} text-white`}>
          <div className="flex items-center gap-3 mb-2">
            <div className="bg-white/20 p-2 rounded-full"><UserCheck size={20} /></div>
            <div>
              <h1 className="text-lg font-bold">{doctorName}</h1>
              <p className="text-xs opacity-80 uppercase tracking-wide">On Duty</p>
            </div>
          </div>
          <div className="h-px bg-white/20 my-4"></div>
          <h2 className="font-semibold">{dept.name}</h2>
        </div>
        
        <div className="p-6 flex-1 overflow-y-auto">
          <div className="mb-6">
            <h3 className="text-sm font-semibold text-gray-500 uppercase mb-2">Queue Stats</h3>
            <div className="grid grid-cols-2 gap-4">
               <div className="bg-gray-50 p-3 rounded-lg text-center">
                 <span className="block text-2xl font-bold text-gray-800">{waitingList.length}</span>
                 <span className="text-xs text-gray-500">Waiting</span>
               </div>
               <div className="bg-gray-50 p-3 rounded-lg text-center">
                 <span className="block text-2xl font-bold text-green-600">{patientsProcessedCount}</span>
                 <span className="text-xs text-gray-500">Processed</span>
               </div>
            </div>
          </div>
          
          <button 
            onClick={handleLogout}
            className="w-full flex items-center justify-center gap-2 text-red-600 p-3 hover:bg-red-50 rounded-lg transition-colors mt-auto"
          >
            <LogOut size={16} /> End Session
          </button>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 p-6 md:p-8 overflow-y-auto">
        
        {/* Active Patient Area */}
        <div className="mb-8">
          <h2 className="text-xl font-bold text-gray-800 mb-4 flex items-center gap-2">
            <div className="w-3 h-3 bg-green-500 rounded-full animate-pulse"></div>
            Now Serving
          </h2>
          
          {currentPatient ? (
            <div className="bg-white rounded-xl shadow-lg border border-blue-100 p-6 animate-fade-in">
              <div className="flex justify-between items-start mb-6">
                <div>
                  <h1 className="text-4xl font-bold text-gray-900 mb-1">{currentPatient.tokenNumber}</h1>
                  <p className="text-xl text-gray-600">{currentPatient.name}, {currentPatient.age}</p>
                </div>
                <div className="text-right">
                  <span className="inline-block px-3 py-1 bg-green-100 text-green-700 rounded-full text-sm font-bold">
                    In Consultation
                  </span>
                  {currentPatient.assignedDoctor && (
                     <p className="text-xs text-gray-500 mt-1">with {currentPatient.assignedDoctor}</p>
                  )}
                </div>
              </div>

              <div className="bg-gray-50 p-4 rounded-lg mb-6 border border-gray-200">
                <p className="text-sm font-bold text-gray-500 uppercase mb-2">Reported Symptoms</p>
                <div className="flex flex-wrap gap-2">
                  {currentPatient.symptoms.map(s => (
                    <span key={s} className="bg-white border border-gray-300 px-3 py-1 rounded-full text-sm">{s}</span>
                  ))}
                </div>
              </div>

              <div className="mb-6">
                 <label className="block text-sm font-medium text-gray-700 mb-2">Doctor's Notes / Prescription</label>
                 <textarea 
                    className="w-full h-32 p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none resize-none"
                    placeholder="Enter notes, prescriptions, or lab instructions here..."
                    value={notes}
                    onChange={e => setNotes(e.target.value)}
                 />
              </div>

              <div className="flex gap-4">
                <button 
                  onClick={() => handleNoShow(currentPatient.id)}
                  className="px-6 py-3 bg-red-50 hover:bg-red-100 text-red-600 rounded-lg font-bold shadow-sm transition-colors flex items-center gap-2"
                >
                  <XOctagon size={20} /> No Show
                </button>
                <button 
                  onClick={() => handleRefer(currentPatient.id)}
                  className="flex-1 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 py-3 rounded-lg font-bold shadow-sm transition-colors flex justify-center items-center gap-2"
                >
                  <FlaskConical size={20} /> Refer to Lab
                </button>
                <button 
                  onClick={() => handleComplete(currentPatient.id)}
                  className="flex-1 bg-green-600 hover:bg-green-700 text-white py-3 rounded-lg font-bold shadow-md transition-colors flex justify-center items-center gap-2"
                >
                  <CheckCircle size={20} /> Complete Visit
                </button>
              </div>
            </div>
          ) : (
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8 text-center text-gray-400">
              <RefreshCw className="mx-auto mb-3 opacity-50" size={48} />
              <p>No patient currently being served.</p>
              <p className="text-sm">Select 'Call' from the waiting list below.</p>
            </div>
          )}
        </div>

        {/* Up Next List */}
        <div>
          <h2 className="text-xl font-bold text-gray-800 mb-4">Up Next</h2>
          <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4">
            {waitingList.length === 0 && (
               <p className="text-gray-500 col-span-full">Queue is empty.</p>
            )}
            {waitingList.map(patient => (
              <PatientCard 
                key={patient.id} 
                patient={patient} 
                onCall={handleCall}
                onComplete={handleComplete}
                onNoShow={handleNoShow}
                // Disable calling new patients if one is already active
                actionsDisabled={!!currentPatient}
              />
            ))}
          </div>
        </div>

      </div>
    </div>
  );
};