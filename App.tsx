import React, { useState, useEffect } from 'react';
import { Department, DepartmentConfig, PatientStatus } from './types';
import { DEPARTMENTS } from './constants';
import { queueService } from './services/queueService';

// Pages
import { PatientForm } from './components/PatientForm';
import { PatientView } from './pages/PatientView';
import { DoctorDashboard } from './pages/DoctorDashboard';
import { AdminDashboard } from './pages/AdminDashboard';
import { TVDisplay } from './pages/TVDisplay';
import { ReceptionView } from './pages/ReceptionView';

// Icons
import { LayoutGrid, Stethoscope, Smartphone, Monitor, ClipboardList } from 'lucide-react';

// Simple Enum for rudimentary routing without react-router
enum View {
  LANDING,
  PATIENT_CHECKIN,
  PATIENT_STATUS,
  DOCTOR_DASHBOARD,
  ADMIN_DASHBOARD,
  TV_DISPLAY,
  RECEPTION
}

function App() {
  const [currentView, setCurrentView] = useState<View>(View.LANDING);
  const [selectedDept, setSelectedDept] = useState<Department>(Department.GENERAL);
  const [patientId, setPatientId] = useState<string>('');
  const [availableDepartments, setAvailableDepartments] = useState<DepartmentConfig[]>(Object.values(DEPARTMENTS));

  // Edge Case: Session Persistence
  // Check for existing patient session on mount (Browser Reload / Re-open)
  useEffect(() => {
    const restore = async () => {
      const storedId = localStorage.getItem('mediqueue_patient_id');
      if (!storedId) return;
      try {
        const patient = await queueService.fetchPatient(storedId);
        if (patient && patient.status !== PatientStatus.COMPLETED && patient.status !== PatientStatus.NO_SHOW) {
          setPatientId(storedId);
          setCurrentView(View.PATIENT_STATUS);
        } else {
          localStorage.removeItem('mediqueue_patient_id');
        }
      } catch {
        localStorage.removeItem('mediqueue_patient_id');
      }
    };

    void restore();
  }, []);

  useEffect(() => {
    const loadDepartments = async () => {
      try {
        const departments = await queueService.getDepartments();
        if (departments.length > 0) {
          setAvailableDepartments(departments);
          setSelectedDept(departments[0].id as Department);
        }
      } catch {
        setAvailableDepartments(Object.values(DEPARTMENTS));
      }
    };

    void loadDepartments();
  }, []);

  // Routing Handlers
  const goHome = () => {
    // Edge Case: Shared Phones
    // Explicitly clear session when user chooses to leave to prevent next user from seeing previous data
    localStorage.removeItem('mediqueue_patient_id');
    setPatientId('');
    setCurrentView(View.LANDING);
  };
  
  const handleScanQR = (deptId: Department) => {
    setSelectedDept(deptId);
    setCurrentView(View.PATIENT_CHECKIN);
  };

  const handlePatientCheckedIn = (pid: string) => {
    // Save session to local storage
    localStorage.setItem('mediqueue_patient_id', pid);
    setPatientId(pid);
    setCurrentView(View.PATIENT_STATUS);
  };

  const handleDoctorLogin = (deptId: Department) => {
    setSelectedDept(deptId);
    setCurrentView(View.DOCTOR_DASHBOARD);
  };

  // --- Views ---

  if (currentView === View.ADMIN_DASHBOARD) {
    return <AdminDashboard onExit={goHome} />;
  }

  if (currentView === View.TV_DISPLAY) {
    return <TVDisplay onExit={goHome} />;
  }

  if (currentView === View.RECEPTION) {
    return <ReceptionView onExit={goHome} />;
  }

  if (currentView === View.DOCTOR_DASHBOARD) {
    return <DoctorDashboard departmentId={selectedDept} onLogout={goHome} />;
  }

  if (currentView === View.PATIENT_CHECKIN) {
    return (
      <div className="min-h-screen bg-gray-50 p-4 flex flex-col justify-center">
        <button onClick={goHome} className="absolute top-4 left-4 text-gray-500 hover:text-gray-800">
           &larr; Cancel
        </button>
        <PatientForm departmentId={selectedDept} onSuccess={handlePatientCheckedIn} />
      </div>
    );
  }

  if (currentView === View.PATIENT_STATUS) {
    return <PatientView patientId={patientId} onExit={goHome} />;
  }

  // --- Landing Page (Role Selection) ---
  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top,_#e2e8f0,_#f8fafc_40%,_#ffffff_80%)] flex items-center justify-center p-6">
      <div className="max-w-7xl w-full">
        <div className="text-center mb-12">
          <p className="text-sm uppercase tracking-[0.35em] text-slate-500 mb-3">Hospital Queue Platform</p>
          <h1 className="text-5xl font-black text-slate-900 mb-4 tracking-tight">MediQue Control Console</h1>
          <p className="text-lg text-slate-600">Choose a workspace to continue your shift.</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-6">
          
          {/* 1. Patient Flow (QR Simulation) */}
          <div className="bg-white/95 backdrop-blur p-6 rounded-2xl shadow-xl border border-slate-200 hover:scale-[1.02] transition-transform duration-300">
             <div className="h-12 w-12 bg-blue-100 text-blue-700 rounded-xl flex items-center justify-center mb-4">
               <Smartphone size={24} />
             </div>
             <h3 className="text-lg font-bold text-slate-900 mb-2">Patient Check-In</h3>
             <p className="text-sm text-slate-500 mb-4">Open a department QR flow on a patient device.</p>
             <div className="space-y-2">
               {availableDepartments.slice(0, 4).map(dept => (
                 <button 
                   key={dept.id}
                   onClick={() => handleScanQR(dept.id as Department)}
                   className="w-full text-left px-3 py-2 text-sm font-medium text-slate-700 bg-slate-50 hover:bg-blue-50 hover:text-blue-700 rounded-lg transition-colors"
                 >
                   → {dept.name}
                 </button>
               ))}
             </div>
          </div>

          {/* 2. Doctor Flow */}
          <div className="bg-white/95 backdrop-blur p-6 rounded-2xl shadow-xl border border-slate-200 hover:scale-[1.02] transition-transform duration-300">
             <div className="h-12 w-12 bg-indigo-100 text-indigo-700 rounded-xl flex items-center justify-center mb-4">
               <Stethoscope size={24} />
             </div>
             <h3 className="text-lg font-bold text-gray-900 mb-2">Doctor Portal</h3>
             <p className="text-sm text-slate-500 mb-4">Call patients, consult, and complete visits quickly.</p>
             <div className="space-y-2">
               {availableDepartments.slice(0, 4).map(dept => (
                 <button 
                   key={dept.id}
                   onClick={() => handleDoctorLogin(dept.id as Department)}
                   className="w-full text-left px-3 py-2 text-sm font-medium text-slate-700 bg-slate-50 hover:bg-indigo-50 hover:text-indigo-700 rounded-lg transition-colors"
                 >
                   Login to {dept.code}
                 </button>
               ))}
             </div>
          </div>

          {/* 3. Admin Flow */}
          <div 
            onClick={() => setCurrentView(View.ADMIN_DASHBOARD)}
            className="bg-white/95 backdrop-blur p-6 rounded-2xl shadow-xl border border-slate-200 hover:scale-[1.02] transition-transform duration-300 cursor-pointer group"
          >
             <div className="h-12 w-12 bg-purple-100 text-purple-700 rounded-xl flex items-center justify-center mb-4 group-hover:bg-purple-600 group-hover:text-white transition-colors">
               <LayoutGrid size={24} />
             </div>
             <h3 className="text-lg font-bold text-gray-900 mb-2">Admin Dashboard</h3>
             <p className="text-sm text-slate-500">Manage departments, QR flows, analytics, and audit oversight.</p>
          </div>

          {/* 4. Reception Flow */}
          <div 
            onClick={() => setCurrentView(View.RECEPTION)}
            className="bg-white/95 backdrop-blur p-6 rounded-2xl shadow-xl border border-slate-200 hover:scale-[1.02] transition-transform duration-300 cursor-pointer group"
          >
             <div className="h-12 w-12 bg-teal-100 text-teal-700 rounded-xl flex items-center justify-center mb-4 group-hover:bg-teal-600 group-hover:text-white transition-colors">
               <ClipboardList size={24} />
             </div>
             <h3 className="text-lg font-bold text-gray-900 mb-2">Reception Desk</h3>
             <p className="text-sm text-slate-500">Manual patient entry for assisted check-ins and support needs.</p>
          </div>

          {/* 5. TV Display Flow */}
          <div 
             onClick={() => setCurrentView(View.TV_DISPLAY)}
             className="bg-slate-950 p-6 rounded-2xl shadow-xl shadow-slate-900/20 border border-slate-800 hover:scale-[1.02] transition-transform duration-300 cursor-pointer group"
          >
             <div className="h-12 w-12 bg-gray-800 text-gray-300 rounded-lg flex items-center justify-center mb-4 group-hover:bg-white group-hover:text-black transition-colors">
               <Monitor size={24} />
             </div>
             <h3 className="text-lg font-bold text-white mb-2">TV Display Mode</h3>
             <p className="text-sm text-gray-400">Launch the public waiting room display board.</p>
          </div>

        </div>

        <div className="mt-12 text-center">
            <button 
              onClick={async () => { await queueService.clearData(); alert('System reset.'); window.location.reload(); }}
              className="text-xs text-slate-400 hover:text-red-600 underline"
            >
              Reset System Data
            </button>
        </div>
      </div>
    </div>
  );
}

export default App;