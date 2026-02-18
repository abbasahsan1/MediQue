import React from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Activity,
  Stethoscope,
  ShieldCheck,
  Monitor,
  Clock,
  AlertCircle,
  TrendingUp,
  Users,
  CheckCircle2,
  ArrowRight,
  QrCode,
} from 'lucide-react';

export const LandingPage: React.FC = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col">
      {/* Navigation */}
      <header className="border-b border-border/40 backdrop-blur-sm sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="h-10 w-10 bg-primary text-primary-foreground rounded-lg flex items-center justify-center">
              <Activity size={20} />
            </div>
            <span className="text-xl font-bold">MediQue</span>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={() => navigate('/doctor/login')}
              className="btn-ghost text-sm font-medium"
              type="button"
            >
              For Doctors
            </button>
            <button
              onClick={() => navigate('/admin')}
              className="btn-outline text-sm font-medium"
              type="button"
            >
              Admin Access
            </button>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="px-6 py-20 md:py-28 text-center">
        <div className="max-w-4xl mx-auto space-y-6">
          <h1 className="text-5xl md:text-6xl font-bold tracking-tight leading-tight">
            Eliminate Hospital Queues with <span className="text-primary">Real-Time</span> Management
          </h1>
          <p className="text-xl text-secondary max-w-2xl mx-auto">
            MediQue transforms patient flow. Patients join queues via QR code, doctors manage calls in real-time, and everyone knows exactly where they stand.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-4">
            <button
              onClick={() => navigate('/general/newpatient')}
              className="btn-primary px-8 py-3.5 text-base font-semibold flex items-center gap-2"
              type="button"
            >
              Join a Queue <ArrowRight size={18} />
            </button>
            <button
              onClick={() => navigate('/doctor/login')}
              className="btn-outline px-8 py-3.5 text-base font-semibold"
              type="button"
            >
              Doctor Login
            </button>
          </div>
        </div>
      </section>

      {/* Hero Image / Stats */}
      <section className="px-6 pb-20">
        <div className="max-w-6xl mx-auto bg-surface border border-border/60 rounded-2xl overflow-hidden">
          <div className="grid grid-cols-1 md:grid-cols-3 divide-y md:divide-y-0 md:divide-x divide-border">
            <div className="p-8 text-center">
              <div className="flex justify-center mb-3">
                <div className="icon-circle icon-circle-brand">
                  <Clock size={24} />
                </div>
              </div>
              <p className="text-3xl font-bold mb-1">30-50%</p>
              <p className="text-sm text-secondary">Reduction in wait times</p>
            </div>
            <div className="p-8 text-center">
              <div className="flex justify-center mb-3">
                <div className="icon-circle icon-circle-success">
                  <Users size={24} />
                </div>
              </div>
              <p className="text-3xl font-bold mb-1">Real-Time</p>
              <p className="text-sm text-secondary">Live patient tracking</p>
            </div>
            <div className="p-8 text-center">
              <div className="flex justify-center mb-3">
                <div className="icon-circle icon-circle-brand">
                  <TrendingUp size={24} />
                </div>
              </div>
              <p className="text-3xl font-bold mb-1">2-3x</p>
              <p className="text-sm text-secondary">Faster patient flow</p>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="px-6 py-20 bg-surface-muted/30">
        <div className="max-w-6xl mx-auto space-y-12">
          <div className="text-center space-y-3 mb-16">
            <p className="text-sm font-semibold uppercase tracking-widest text-primary">Platform Features</p>
            <h2 className="text-4xl font-bold leading-tight">Everything you need to run a smart queue</h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Patient Experience */}
            <div className="card p-8 space-y-4">
              <div className="flex items-start gap-4">
                <div className="icon-circle icon-circle-brand flex-shrink-0">
                  <QrCode size={20} />
                </div>
                <div>
                  <h3 className="text-lg font-bold mb-2">QR Code Check-In</h3>
                  <p className="text-sm text-secondary">Patients scan a QR code at department entrance. Instant registration, instant queue position.</p>
                </div>
              </div>
            </div>

            {/* Live Position */}
            <div className="card p-8 space-y-4">
              <div className="flex items-start gap-4">
                <div className="icon-circle icon-circle-success flex-shrink-0">
                  <Monitor size={20} />
                </div>
                <div>
                  <h3 className="text-lg font-bold mb-2">Live Position Tracking</h3>
                  <p className="text-sm text-secondary">Patients watch their position update in real-time. Estimated wait time calculated automatically.</p>
                </div>
              </div>
            </div>

            {/* Doctor Control */}
            <div className="card p-8 space-y-4">
              <div className="flex items-start gap-4">
                <div className="icon-circle icon-circle-brand flex-shrink-0">
                  <Stethoscope size={20} />
                </div>
                <div>
                  <h3 className="text-lg font-bold mb-2">Doctor Control Panel</h3>
                  <p className="text-sm text-secondary">One-click "call next" to summon patients. Mark consultations complete. Instant status updates to the queue.</p>
                </div>
              </div>
            </div>

            {/* TV Display */}
            <div className="card p-8 space-y-4">
              <div className="flex items-start gap-4">
                <div className="icon-circle icon-circle-brand flex-shrink-0">
                  <Monitor size={20} />
                </div>
                <div>
                  <h3 className="text-lg font-bold mb-2">Public Display Board</h3>
                  <p className="text-sm text-secondary">Large waiting room display shows "Now Serving" and "Up Next" for all departments. Keeps patients informed.</p>
                </div>
              </div>
            </div>

            {/* Admin Management */}
            <div className="card p-8 space-y-4">
              <div className="flex items-start gap-4">
                <div className="icon-circle icon-circle-success flex-shrink-0">
                  <ShieldCheck size={20} />
                </div>
                <div>
                  <h3 className="text-lg font-bold mb-2">Admin Dashboard</h3>
                  <p className="text-sm text-secondary">Full control over departments, doctors, and patient data. Create accounts and monitor hospital performance.</p>
                </div>
              </div>
            </div>

            {/* Notifications */}
            <div className="card p-8 space-y-4">
              <div className="flex items-start gap-4">
                <div className="icon-circle icon-circle-success flex-shrink-0">
                  <AlertCircle size={20} />
                </div>
                <div>
                  <h3 className="text-lg font-bold mb-2">Smart Notifications</h3>
                  <p className="text-sm text-secondary">Patients get browser alerts and sound notifications when they're almost up or it's their turn.</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* How It Works Section */}
      <section className="px-6 py-20">
        <div className="max-w-6xl mx-auto space-y-16">
          <div className="text-center space-y-3">
            <p className="text-sm font-semibold uppercase tracking-widest text-primary">The Process</p>
            <h2 className="text-4xl font-bold">How MediQue Works</h2>
          </div>

          {/* For Patients */}
          <div className="space-y-4">
            <h3 className="text-2xl font-bold flex items-center gap-3">
              <Users size={28} className="text-primary" />
              For Patients
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              {[
                { num: '1', title: 'Scan QR Code', desc: 'Scan the QR code at your department entrance' },
                { num: '2', title: 'Enter Details', desc: 'Provide your name, age, and symptoms (voice or text)' },
                { num: '3', title: 'Get Token', desc: 'Receive a unique queue token instantly' },
                { num: '4', title: 'Wait Smart', desc: 'Track your position live and get notified when it\'s your turn' },
              ].map((step, i) => (
                <div key={i} className="card p-6 text-center space-y-3">
                  <div className="h-12 w-12 bg-primary text-primary-foreground rounded-lg flex items-center justify-center mx-auto font-bold text-lg">
                    {step.num}
                  </div>
                  <p className="font-semibold">{step.title}</p>
                  <p className="text-sm text-secondary">{step.desc}</p>
                </div>
              ))}
            </div>
          </div>

          {/* For Doctors */}
          <div className="space-y-4">
            <h3 className="text-2xl font-bold flex items-center gap-3">
              <Stethoscope size={28} className="text-primary" />
              For Doctors
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {[
                { title: 'View Queue', desc: 'See all waiting patients with their symptoms and details' },
                { title: 'Call Next', desc: 'One-click to call next patient. Their phone lights up instantly' },
                { title: 'Complete Visit', desc: 'Mark consultations complete. Queue updates in real-time' },
              ].map((step, i) => (
                <div key={i} className="card p-6 space-y-4">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 size={20} className="text-success" />
                    <p className="font-semibold">{step.title}</p>
                  </div>
                  <p className="text-sm text-secondary">{step.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="px-6 py-20 bg-primary/5 border-t border-b border-border/60">
        <div className="max-w-2xl mx-auto text-center space-y-6">
          <p className="text-sm font-semibold uppercase tracking-widest text-primary">Ready to Start</p>
          <h2 className="text-4xl font-bold">Begin Your Queue Management Journey</h2>
          <p className="text-lg text-secondary">
            Whether you're a patient joining a queue or a doctor managing consultations, MediQue makes the process instant and seamless.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-6">
            <button
              onClick={() => navigate('/general/newpatient')}
              className="btn-primary px-8 py-3 text-base font-semibold flex items-center gap-2"
              type="button"
            >
              Join Queue <ArrowRight size={18} />
            </button>
            <button
              onClick={() => navigate('/doctor/login')}
              className="btn-ghost px-8 py-3 text-base font-semibold"
              type="button"
            >
              Doctor Dashboard
            </button>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border/40 px-6 py-12 mt-auto">
        <div className="max-w-6xl mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-8">
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <div className="h-8 w-8 bg-primary text-primary-foreground rounded-lg flex items-center justify-center">
                  <Activity size={16} />
                </div>
                <span className="font-bold">MediQue</span>
              </div>
              <p className="text-sm text-secondary">Smart hospital queue management for better patient experience.</p>
            </div>
            <div className="space-y-3">
              <p className="font-semibold text-sm">For Patients</p>
              <ul className="space-y-2 text-sm text-secondary">
                <li><button onClick={() => navigate('/general/newpatient')} className="hover:text-foreground transition-colors" type="button">Join Queue</button></li>
                <li><button onClick={() => navigate('/tv')} className="hover:text-foreground transition-colors" type="button">Queue Display</button></li>
              </ul>
            </div>
            <div className="space-y-3">
              <p className="font-semibold text-sm">For Staff</p>
              <ul className="space-y-2 text-sm text-secondary">
                <li><button onClick={() => navigate('/doctor/login')} className="hover:text-foreground transition-colors" type="button">Doctor Portal</button></li>
                <li><button onClick={() => navigate('/reception')} className="hover:text-foreground transition-colors" type="button">Reception Desk</button></li>
              </ul>
            </div>
            <div className="space-y-3">
              <p className="font-semibold text-sm">Administration</p>
              <ul className="space-y-2 text-sm text-secondary">
                <li><button onClick={() => navigate('/admin')} className="hover:text-foreground transition-colors" type="button">Admin Panel</button></li>
              </ul>
            </div>
          </div>
          <div className="border-t border-border/40 pt-8 text-center text-sm text-muted-foreground">
            <p>&copy; 2026 MediQue. Healthcare Made Simple.</p>
          </div>
        </div>
      </footer>
    </div>
  );
};
