import React, { useState, useEffect } from 'react';
import { Department, PatientStatus } from './types';
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

  // Edge Case: Session Persistence
  // Check for existing patient session on mount (Browser Reload / Re-open)
  useEffect(() => {
    const storedId = localStorage.getItem('mediqueue_patient_id');
    if (storedId) {
      const p = queueService.getPatient(storedId);
      // Only restore if patient exists and isn't finished/no-show
      if (p && p.status !== PatientStatus.COMPLETED && p.status !== PatientStatus.NO_SHOW) {
        setPatientId(storedId);
        setCurrentView(View.PATIENT_STATUS);
      } else {
        // Cleanup invalid or expired session (Edge Case: Stale local storage)
        localStorage.removeItem('mediqueue_patient_id');
      }
    }
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
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 flex items-center justify-center p-6">
      <div className="max-w-6xl w-full">
        <div className="text-center mb-12">
          <h1 className="text-4xl font-extrabold text-gray-900 mb-4 tracking-tight">MediQueue System</h1>
          <p className="text-xl text-gray-600">Select your role to simulate the experience.</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-6">
          
          {/* 1. Patient Flow (QR Simulation) */}
          <div className="bg-white p-6 rounded-2xl shadow-xl shadow-blue-500/10 border border-blue-100 hover:scale-105 transition-transform duration-300">
             <div className="h-12 w-12 bg-blue-100 text-blue-600 rounded-lg flex items-center justify-center mb-4">
               <Smartphone size={24} />
             </div>
             <h3 className="text-lg font-bold text-gray-900 mb-2">Patient (Scan QR)</h3>
             <p className="text-sm text-gray-500 mb-4">Simulate a patient scanning a QR code at a specific department.</p>
             <div className="space-y-2">
               {Object.values(DEPARTMENTS).slice(0, 3).map(dept => (
                 <button 
                   key={dept.id}
                   onClick={() => handleScanQR(dept.id)}
                   className="w-full text-left px-3 py-2 text-sm font-medium text-gray-700 bg-gray-50 hover:bg-blue-50 hover:text-blue-700 rounded-md transition-colors"
                 >
                   → {dept.name}
                 </button>
               ))}
             </div>
          </div>

          {/* 2. Doctor Flow */}
          <div className="bg-white p-6 rounded-2xl shadow-xl shadow-indigo-500/10 border border-indigo-100 hover:scale-105 transition-transform duration-300">
             <div className="h-12 w-12 bg-indigo-100 text-indigo-600 rounded-lg flex items-center justify-center mb-4">
               <Stethoscope size={24} />
             </div>
             <h3 className="text-lg font-bold text-gray-900 mb-2">Doctor Portal</h3>
             <p className="text-sm text-gray-500 mb-4">Manage queues, call patients, and write prescriptions.</p>
             <div className="space-y-2">
               {Object.values(DEPARTMENTS).slice(0, 3).map(dept => (
                 <button 
                   key={dept.id}
                   onClick={() => handleDoctorLogin(dept.id)}
                   className="w-full text-left px-3 py-2 text-sm font-medium text-gray-700 bg-gray-50 hover:bg-indigo-50 hover:text-indigo-700 rounded-md transition-colors"
                 >
                   Login to {dept.code}
                 </button>
               ))}
             </div>
          </div>

          {/* 3. Admin Flow */}
          <div 
            onClick={() => setCurrentView(View.ADMIN_DASHBOARD)}
            className="bg-white p-6 rounded-2xl shadow-xl shadow-purple-500/10 border border-purple-100 hover:scale-105 transition-transform duration-300 cursor-pointer group"
          >
             <div className="h-12 w-12 bg-purple-100 text-purple-600 rounded-lg flex items-center justify-center mb-4 group-hover:bg-purple-600 group-hover:text-white transition-colors">
               <LayoutGrid size={24} />
             </div>
             <h3 className="text-lg font-bold text-gray-900 mb-2">Admin Dashboard</h3>
             <p className="text-sm text-gray-500">View live analytics, wait times, generate QR codes, and AI insights.</p>
          </div>

          {/* 4. Reception Flow */}
          <div 
            onClick={() => setCurrentView(View.RECEPTION)}
            className="bg-white p-6 rounded-2xl shadow-xl shadow-teal-500/10 border border-teal-100 hover:scale-105 transition-transform duration-300 cursor-pointer group"
          >
             <div className="h-12 w-12 bg-teal-100 text-teal-600 rounded-lg flex items-center justify-center mb-4 group-hover:bg-teal-600 group-hover:text-white transition-colors">
               <ClipboardList size={24} />
             </div>
             <h3 className="text-lg font-bold text-gray-900 mb-2">Reception Desk</h3>
             <p className="text-sm text-gray-500">Manual entry for patients without smartphones or special assistance.</p>
          </div>

          {/* 5. TV Display Flow */}
          <div 
             onClick={() => setCurrentView(View.TV_DISPLAY)}
             className="bg-gray-900 p-6 rounded-2xl shadow-xl shadow-gray-900/20 border border-gray-800 hover:scale-105 transition-transform duration-300 cursor-pointer group"
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
              onClick={() => { queueService.clearData(); localStorage.removeItem('mediqueue_patient_id'); alert('System reset.'); window.location.reload(); }}
              className="text-xs text-red-400 hover:text-red-600 underline"
            >
              Reset System Data
            </button>
        </div>
      </div>
    </div>
  );
}

export default App;