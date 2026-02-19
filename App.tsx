import { lazy, Suspense } from 'react';
import { Routes, Route, Navigate, useNavigate } from 'react-router-dom';

/**
 * Retry wrapper for lazy imports — handles stale chunk errors after deployment.
 * If a dynamic import fails (e.g. chunk hash changed), reload the page once
 * to get the latest index.html with correct chunk references.
 */
function lazyWithRetry<T extends React.ComponentType<any>>(
  factory: () => Promise<{ default: T }>,
) {
  return lazy(() =>
    factory().catch((err: unknown) => {
      const alreadyRetried = sessionStorage.getItem('chunk_retry');
      if (!alreadyRetried) {
        sessionStorage.setItem('chunk_retry', '1');
        window.location.reload();
        return new Promise<never>(() => {});
      }
      sessionStorage.removeItem('chunk_retry');
      throw err;
    }),
  );
}

const LandingPage = lazyWithRetry(() => import('./pages/LandingPage').then(m => ({ default: m.LandingPage })));
const DoctorLogin = lazyWithRetry(() => import('./pages/DoctorLogin').then(m => ({ default: m.DoctorLogin })));
const DoctorDashboard = lazyWithRetry(() => import('./pages/DoctorDashboard').then(m => ({ default: m.DoctorDashboard })));
const AdminDashboard = lazyWithRetry(() => import('./pages/AdminDashboard').then(m => ({ default: m.AdminDashboard })));
const PatientIntake = lazyWithRetry(() => import('./pages/PatientIntake').then(m => ({ default: m.PatientIntake })));
const PatientView = lazyWithRetry(() => import('./pages/PatientView').then(m => ({ default: m.PatientView })));
const TVDisplay = lazyWithRetry(() => import('./pages/TVDisplay').then(m => ({ default: m.TVDisplay })));
const ReceptionView = lazyWithRetry(() => import('./pages/ReceptionView').then(m => ({ default: m.ReceptionView })));

function LazyFallback() {
  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="animate-spin rounded-full h-8 w-8 border-2 border-primary border-t-transparent" />
    </div>
  );
}

function TVDisplayRoute() {
  const navigate = useNavigate();
  return <TVDisplay onExit={() => navigate('/')} />;
}

function App() {
  return (
    <Routes>
      <Route path="/" element={<Suspense fallback={<LazyFallback />}><LandingPage /></Suspense>} />
      <Route path="/doctor/login" element={<Suspense fallback={<LazyFallback />}><DoctorLogin /></Suspense>} />
      <Route path="/doctor/dashboard" element={<Suspense fallback={<LazyFallback />}><DoctorDashboard /></Suspense>} />
      <Route path="/doctor/:doctorId/newpatient" element={<Suspense fallback={<LazyFallback />}><PatientIntake /></Suspense>} />
      <Route path="/admin" element={<Suspense fallback={<LazyFallback />}><AdminDashboard /></Suspense>} />
      <Route path="/:deptId/newpatient" element={<Suspense fallback={<LazyFallback />}><PatientIntake /></Suspense>} />
      <Route path="/patient/:patientId" element={<Suspense fallback={<LazyFallback />}><PatientView /></Suspense>} />
      <Route path="/tv" element={<Suspense fallback={<LazyFallback />}><TVDisplayRoute /></Suspense>} />
      <Route path="/reception" element={<Suspense fallback={<LazyFallback />}><ReceptionView /></Suspense>} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export default App;
