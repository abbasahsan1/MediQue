import React, { useEffect, useState } from 'react';
import { queueService } from '../services/queueService';
import { Department, Patient, PatientStatus } from '../types';
import { DEPARTMENTS } from '../constants';
import { Clock } from 'lucide-react';

export const TVDisplay: React.FC<{ onExit: () => void }> = ({ onExit }) => {
  const [activePatients, setActivePatients] = useState<Patient[]>([]);
  const [upcomingPatients, setUpcomingPatients] = useState<Record<string, Patient[]>>({});

  useEffect(() => {
    const update = async () => {
      await queueService.refreshAllDepartments();
      const all = queueService.getQueue();
      
      // 1. Get Active (Called/In Consultation)
      const called = all.filter(p => p.status === PatientStatus.CALLED || p.status === PatientStatus.IN_CONSULTATION);
      setActivePatients(called);

      // 2. Get Up Next (Waiting), grouped by Department
      const next: Record<string, Patient[]> = {};
      Object.keys(DEPARTMENTS).forEach(deptId => {
        const waiting = all
          .filter(p => p.department === deptId && p.status === PatientStatus.WAITING)
          .slice(0, 3); // Take top 3
        if (waiting.length > 0) {
          next[deptId] = waiting;
        }
      });
      setUpcomingPatients(next);
    };

    void update();
    const interval = setInterval(() => {
      void update();
    }, 5000);
    const unsub = queueService.subscribe(() => {
      void update();
    });
    
    return () => {
      clearInterval(interval);
      unsub();
    };
  }, []);

  return (
    <div className="min-h-screen bg-gray-900 text-white p-6 flex flex-col font-sans">
      <div className="flex justify-between items-center mb-8 border-b border-gray-800 pb-4">
        <div className="flex items-center gap-4">
            <div className="h-12 w-12 bg-blue-600 rounded-lg flex items-center justify-center font-bold text-2xl">M</div>
            <div>
                <h1 className="text-2xl font-bold tracking-wider uppercase text-gray-100">Queue Status</h1>
                <p className="text-gray-400 text-sm">Real-time Updates</p>
            </div>
        </div>
        
        <div className="text-right">
             <Clock className="inline-block mr-2 text-gray-500" size={20} />
             <span className="text-xl font-mono text-gray-300">
                {new Date().toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
             </span>
             <button onClick={onExit} className="block text-xs text-gray-700 hover:text-gray-500 mt-1">Exit</button>
        </div>
      </div>

      <div className="flex-1 grid grid-cols-12 gap-8">
        
        {/* LEFT COLUMN: NOW SERVING (Prominent) */}
        <div className="col-span-8 grid grid-cols-1 md:grid-cols-2 gap-6 content-start">
           <h2 className="col-span-full text-xl font-bold text-green-400 uppercase tracking-widest mb-2 flex items-center gap-2">
             <span className="h-3 w-3 bg-green-500 rounded-full animate-pulse"></span> Now Serving
           </h2>
           
           {activePatients.length === 0 ? (
              <div className="col-span-full bg-gray-800/50 rounded-2xl p-12 text-center border-2 border-dashed border-gray-700">
                 <p className="text-2xl text-gray-500 font-light">Waiting for doctors...</p>
              </div>
           ) : (
             activePatients.map((p) => {
                const dept = DEPARTMENTS[p.department];
                return (
                  <div key={p.id} className="bg-gray-800 rounded-2xl overflow-hidden border-l-8 border-gray-700 shadow-2xl animate-fade-in relative">
                    <div className={`absolute top-0 left-0 w-full h-1 ${dept.color}`}></div>
                    <div className="p-6">
                      <div className="flex justify-between items-start mb-4">
                         <span className={`text-xs font-bold px-2 py-1 rounded uppercase ${dept.color.replace('bg-', 'text-').replace('-500', '-300')} bg-gray-900`}>
                           {dept.name}
                         </span>
                         {p.status === PatientStatus.CALLED && (
                            <span className="animate-pulse bg-green-500 text-black text-xs font-bold px-2 py-1 rounded">JUST CALLED</span>
                         )}
                      </div>
                      
                      <div className="text-center mb-6">
                        <div className="text-7xl font-black tracking-tighter text-white mb-2">
                          {p.tokenNumber}
                        </div>
                        <div className="text-gray-400 text-lg">
                           Proceed to Room
                        </div>
                      </div>

                      <div className="bg-gray-900/50 p-4 rounded-xl flex items-center justify-center gap-3 border border-gray-700">
                         <div className="h-10 w-10 rounded-full bg-gray-700 flex items-center justify-center text-gray-300 font-bold">Dr</div>
                         <div className="text-lg font-semibold text-gray-200">
                           {p.assignedDoctor || "Available Doctor"}
                         </div>
                      </div>
                    </div>
                  </div>
                );
             })
           )}
        </div>

        {/* RIGHT COLUMN: UP NEXT (List) */}
        <div className="col-span-4 border-l border-gray-800 pl-8 flex flex-col">
            <h2 className="text-xl font-bold text-blue-400 uppercase tracking-widest mb-6">Up Next</h2>
            
            <div className="flex-1 space-y-8 overflow-y-auto no-scrollbar pb-10">
                {Object.keys(DEPARTMENTS).map(deptId => {
                    const dept = DEPARTMENTS[deptId as Department];
                    const waiting = upcomingPatients[deptId] || [];
                    if (waiting.length === 0) return null;

                    return (
                        <div key={deptId} className="bg-gray-800/30 rounded-xl p-4 border border-gray-800">
                            <h3 className={`font-bold text-sm mb-3 ${dept.color.replace('bg-', 'text-').replace('-500', '-400')}`}>
                                {dept.name}
                            </h3>
                            <div className="space-y-2">
                                {waiting.map((p, idx) => (
                                    <div key={p.id} className="flex justify-between items-center bg-gray-900 p-3 rounded-lg border-l-4 border-gray-700">
                                        <span className="text-xl font-bold text-white">{p.tokenNumber}</span>
                                        <span className="text-xs text-gray-500">Wait: {Math.floor((Date.now() - p.checkInTime)/60000)}m</span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    );
                })}
                
                {Object.keys(upcomingPatients).length === 0 && (
                   <p className="text-gray-600 italic">No patients waiting in queue.</p>
                )}
            </div>
        </div>

      </div>
    </div>
  );
};