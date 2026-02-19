import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ArrowRight, CheckCircle2, Mic, ShieldCheck, Activity,
  Menu, X, Clock, FileWarning, ClipboardX, Users, Scan, FileText,
  Shield, Lock, Cloud, FileKey, Database, Zap, Globe, Stethoscope,
  Server, Cpu, Code2, ChevronDown,
} from 'lucide-react';

/* ── Navbar ──────────────────────────────────────────── */

function Navbar() {
  const navigate = useNavigate();
  const [isScrolled, setIsScrolled] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  useEffect(() => {
    const handleScroll = () => setIsScrolled(window.scrollY > 10);
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <div className="fixed top-0 left-0 right-0 z-50 flex justify-center py-6 px-4 pointer-events-none">
      <nav
        className={`pointer-events-auto transition-all duration-300 mx-auto w-full max-w-5xl flex items-center justify-between px-6 rounded-full border shadow-sm ${
          isScrolled
            ? 'bg-white/90 backdrop-blur-md border-slate-200 py-3 shadow-slate-200/50'
            : 'bg-white/70 backdrop-blur-sm border-transparent py-4 shadow-none'
        }`}
      >
        <button onClick={() => navigate('/')} className="flex items-center gap-2 group" type="button">
          <div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center text-white font-bold text-lg group-hover:bg-blue-700 transition-colors shadow-blue-200 shadow-lg">
            G
          </div>
          <span className="text-xl font-bold text-slate-900 tracking-tight hidden sm:block">Gravity</span>
        </button>

        <div className="hidden md:flex items-center gap-1 bg-slate-100/50 p-1 rounded-full border border-slate-200/50">
          <a href="#features" className="px-4 py-1.5 text-sm font-medium text-slate-600 hover:text-slate-900 hover:bg-white rounded-full transition-all">Features</a>
          <a href="#how-it-works" className="px-4 py-1.5 text-sm font-medium text-slate-600 hover:text-slate-900 hover:bg-white rounded-full transition-all">Process</a>
          <a href="#trust" className="px-4 py-1.5 text-sm font-medium text-slate-600 hover:text-slate-900 hover:bg-white rounded-full transition-all">Security</a>
        </div>

        <div className="hidden md:flex items-center gap-4">
          <button onClick={() => navigate('/doctor/login')} className="text-sm font-medium text-slate-600 hover:text-blue-600 transition-colors" type="button">Doctor Login</button>
          <button onClick={() => navigate('/admin')} className="text-sm font-medium text-slate-600 hover:text-blue-600 transition-colors" type="button">Admin</button>
          <button onClick={() => navigate('/general/newpatient')} className="bg-blue-600 text-white px-6 py-2 rounded-full text-sm font-semibold hover:bg-blue-700 transition-colors shadow-lg shadow-blue-600/20" type="button">Join Queue</button>
        </div>

        <button className="md:hidden p-2 text-slate-600 hover:text-slate-900 bg-slate-100 rounded-full" onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)} type="button">
          {isMobileMenuOpen ? <X size={20} /> : <Menu size={20} />}
        </button>
      </nav>

      {isMobileMenuOpen && (
        <div className="md:hidden absolute top-20 left-4 right-4 bg-white/95 backdrop-blur-xl border border-slate-200 p-4 rounded-3xl shadow-2xl z-40 pointer-events-auto">
          <div className="flex flex-col gap-2">
            <a href="#features" className="text-slate-600 hover:text-blue-600 py-2" onClick={() => setIsMobileMenuOpen(false)}>Features</a>
            <a href="#how-it-works" className="text-slate-600 hover:text-blue-600 py-2" onClick={() => setIsMobileMenuOpen(false)}>How it Works</a>
            <a href="#trust" className="text-slate-600 hover:text-blue-600 py-2" onClick={() => setIsMobileMenuOpen(false)}>Security</a>
            <button onClick={() => { setIsMobileMenuOpen(false); navigate('/doctor/login'); }} className="text-slate-600 hover:text-blue-600 py-2 text-left" type="button">Doctor Login</button>
            <button onClick={() => { setIsMobileMenuOpen(false); navigate('/general/newpatient'); }} className="w-full bg-blue-600 text-white py-2.5 rounded-xl text-sm font-semibold" type="button">Join Queue</button>
          </div>
        </div>
      )}
    </div>
  );
}

/* ── Hero ─────────────────────────────────────────────── */

function Hero() {
  const navigate = useNavigate();
  return (
    <section className="relative pt-32 pb-20 lg:pt-48 lg:pb-32 overflow-hidden bg-slate-50">
      <div className="absolute inset-0 z-0 bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-[size:24px_24px]" />
      <div className="absolute inset-0 z-0 bg-gradient-to-b from-white via-transparent to-white" />
      <div className="container mx-auto px-6 relative z-10">
        <div className="flex flex-col items-center gap-16 text-center">
          <div className="flex-1 max-w-4xl mx-auto">
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}
              className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-50 border border-blue-100 text-blue-700 text-sm font-medium mb-8"
            >
              <span className="flex h-2 w-2 rounded-full bg-blue-600 animate-pulse" />
              Smart hospital queue management
            </motion.div>

            <motion.h1 initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: 0.1 }}
              className="text-5xl lg:text-7xl font-bold tracking-tight text-slate-900 mb-6 leading-[1.1]"
            >
              Eliminate Hospital Queues with{' '}
              <span className="text-blue-600">Real-Time</span> Management.
            </motion.h1>

            <motion.p initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: 0.2 }}
              className="text-xl text-slate-600 mb-10 leading-relaxed max-w-2xl mx-auto"
            >
              Gravity transforms patient flow. Patients join queues via QR code, doctors manage calls in real-time, and everyone knows exactly where they stand.
            </motion.p>

            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: 0.3 }}
              className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-12"
            >
              <button onClick={() => navigate('/general/newpatient')}
                className="h-14 px-8 text-base shadow-lg shadow-blue-600/20 w-full sm:w-auto rounded-full bg-blue-600 text-white font-semibold hover:bg-blue-700 transition-colors flex items-center justify-center gap-2"
                type="button"
              >
                Join a Queue <ArrowRight className="w-5 h-5" />
              </button>
              <button onClick={() => navigate('/doctor/login')}
                className="h-14 px-8 text-base w-full sm:w-auto rounded-full bg-white text-slate-700 font-semibold border border-slate-200 hover:bg-slate-50 transition-colors flex items-center justify-center gap-2"
                type="button"
              >
                <Stethoscope className="w-5 h-5" /> Doctor Login
              </button>
            </motion.div>

            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.5, delay: 0.4 }}
              className="flex items-center justify-center gap-6 text-sm font-medium text-slate-500"
            >
              <div className="flex items-center gap-2"><ShieldCheck className="w-5 h-5 text-emerald-500" />Secure & Encrypted</div>
              <div className="flex items-center gap-2"><Activity className="w-5 h-5 text-blue-500" />Real-Time Updates</div>
              <div className="flex items-center gap-2"><CheckCircle2 className="w-5 h-5 text-slate-400" />No Setup Required</div>
            </motion.div>
          </div>

          {/* Visual Mockup */}
          <div className="relative w-full max-w-5xl mx-auto">
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.8, delay: 0.2 }}
              className="relative z-10 bg-white rounded-3xl shadow-2xl border border-slate-100 p-2 transform lg:rotate-1 hover:rotate-0 transition-transform duration-500"
            >
              <div className="bg-slate-50 rounded-2xl overflow-hidden border border-slate-200 aspect-[5/4] md:aspect-video shadow-inner relative flex flex-col">
                <div className="bg-white px-6 py-4 border-b border-slate-100 flex items-center justify-between shrink-0">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                      <span className="text-blue-600 font-bold">G</span>
                    </div>
                    <div>
                      <div className="font-semibold text-slate-900">Queue Dashboard</div>
                      <div className="text-xs text-slate-500">General Medicine &bull; Live</div>
                    </div>
                  </div>
                  <div className="hidden sm:flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-50 text-emerald-600 text-xs font-medium border border-emerald-100">
                    <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse" />
                    Live Processing
                  </div>
                </div>

                <div className="flex-1 flex overflow-hidden">
                  <div className="flex-1 border-r border-slate-200 bg-white/50 p-6 overflow-y-auto">
                    <div className="mb-4 flex items-center gap-2">
                      <div className="p-1.5 bg-blue-50 text-blue-600 rounded-lg"><Activity className="w-4 h-4" /></div>
                      <span className="text-sm font-bold text-slate-900 uppercase tracking-wider">Now Serving</span>
                    </div>
                    <div className="space-y-4">
                      <div className="bg-white p-4 rounded-xl border border-slate-100 shadow-sm">
                        <div className="text-xs text-slate-400 mb-1 font-medium">TOKEN</div>
                        <div className="text-slate-800 font-bold text-2xl">GM-104</div>
                      </div>
                      <div className="bg-white p-4 rounded-xl border border-slate-100 shadow-sm">
                        <div className="text-xs text-slate-400 mb-1 font-medium">WAITING</div>
                        <div className="flex flex-wrap gap-2">
                          <span className="px-2 py-1 rounded-md bg-blue-50 text-blue-600 text-xs font-medium border border-blue-100">GM-105</span>
                          <span className="px-2 py-1 rounded-md bg-slate-100 text-slate-600 text-xs font-medium">GM-106</span>
                          <span className="px-2 py-1 rounded-md bg-slate-100 text-slate-600 text-xs font-medium">GM-107</span>
                        </div>
                      </div>
                      <div className="bg-white p-4 rounded-xl border border-slate-100 shadow-sm opacity-50">
                        <div className="h-3 w-2/3 bg-slate-100 rounded mb-2" />
                        <div className="h-3 w-1/2 bg-slate-100 rounded" />
                      </div>
                    </div>
                  </div>

                  <div className="flex-1 bg-slate-50 relative flex flex-col items-center justify-center p-6">
                    <div className="text-center mb-8">
                      <h3 className="text-lg font-semibold text-slate-900 mb-2">Voice Check-In</h3>
                      <p className="text-sm text-slate-500 max-w-[200px] mx-auto">Describe your symptoms naturally.</p>
                    </div>
                    <div className="flex items-center gap-1 h-12 mb-8">
                      {[...Array(5)].map((_, i) => (
                        <motion.div key={i} animate={{ height: [16, 48, 16] }} transition={{ repeat: Infinity, duration: 1.2, delay: i * 0.15 }}
                          className="w-3 bg-blue-500 rounded-full"
                        />
                      ))}
                    </div>
                    <div className="w-20 h-20 bg-blue-600 rounded-full flex items-center justify-center shadow-2xl shadow-blue-500/40 relative mb-8">
                      <div className="absolute inset-0 bg-blue-600/20 rounded-full animate-ping" />
                      <Mic className="w-8 h-8 text-white relative z-10" />
                    </div>
                    <div className="absolute bottom-6 left-6 right-6">
                      <div className="bg-white/80 backdrop-blur-sm p-3 rounded-lg border border-slate-200 shadow-sm text-xs text-slate-600 text-center">
                        &ldquo;I have a persistent cough for 3 days...&rdquo;
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[120%] h-[120%] bg-blue-100/30 blur-3xl rounded-full z-0 pointer-events-none" />
          </div>
        </div>
      </div>
    </section>
  );
}

/* ── Problem ──────────────────────────────────────────── */

const problems = [
  { icon: Clock, title: 'Long Wait Times', description: "Patients spend 20+ minutes in physical queues with no idea when they'll be seen." },
  { icon: FileWarning, title: 'No Visibility', description: 'Patients and staff have no real-time view of queue status or wait estimates.' },
  { icon: ClipboardX, title: 'Manual Processes', description: 'Reception staff manually tracks patients, leading to errors and inefficiency.' },
  { icon: Users, title: 'Patient Frustration', description: 'Crowded waiting rooms and unknown wait times are the #1 patient complaint.' },
];

function ProblemSection() {
  return (
    <section className="py-24 bg-slate-50">
      <div className="container mx-auto px-6">
        <div className="text-center max-w-3xl mx-auto mb-16">
          <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.5 }}
            className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-50 border border-blue-100 text-blue-700 text-sm font-medium mb-6"
          >
            <span className="flex h-2 w-2 rounded-full bg-blue-600 animate-pulse" />
            The Problem
          </motion.div>
          <h3 className="text-3xl md:text-4xl font-bold text-slate-900 mb-4">Hospital Queues Are Broken</h3>
          <p className="text-lg text-slate-600">Traditional queue management is outdated, inefficient, and creates bottlenecks that frustrate patients and burn out staff.</p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
          {problems.map((item, index) => (
            <motion.div key={item.title} initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.5, delay: index * 0.1 }}
              className="bg-white p-8 rounded-2xl border border-slate-100 shadow-sm hover:shadow-md transition-shadow"
            >
              <div className="w-12 h-12 bg-red-50 text-red-500 rounded-xl flex items-center justify-center mb-6"><item.icon className="w-6 h-6" /></div>
              <h4 className="text-xl font-semibold text-slate-900 mb-3">{item.title}</h4>
              <p className="text-slate-600 leading-relaxed">{item.description}</p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ── Solution ─────────────────────────────────────────── */

function SolutionSection() {
  return (
    <section id="how-it-works" className="py-24 bg-white overflow-hidden">
      <div className="container mx-auto px-6">
        <div className="text-center mb-20">
          <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.5 }}
            className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-50 border border-blue-100 text-blue-700 text-sm font-medium mb-6"
          >
            <span className="flex h-2 w-2 rounded-full bg-blue-600 animate-pulse" />
            How Gravity Works
          </motion.div>
          <h3 className="text-3xl md:text-4xl font-bold text-slate-900">
            Scan <span className="text-slate-300 mx-2">&rarr;</span> Check In <span className="text-slate-300 mx-2">&rarr;</span> Get Called
          </h3>
        </div>
        <div className="relative">
          <div className="hidden lg:block absolute top-1/2 left-0 w-full h-0.5 bg-slate-100 -translate-y-1/2 z-0" />
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-12 lg:gap-8 relative z-10">
            <motion.div initial={{ opacity: 0, x: -20 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true }} transition={{ duration: 0.6 }}
              className="flex flex-col items-center text-center group"
            >
              <div className="w-20 h-20 bg-white border-2 border-slate-100 rounded-2xl flex items-center justify-center mb-8 shadow-sm group-hover:border-blue-500 group-hover:scale-110 transition-all duration-300">
                <Scan className="w-8 h-8 text-blue-600" />
              </div>
              <h4 className="text-xl font-bold text-slate-900 mb-4">1. Scan QR Code</h4>
              <p className="text-slate-600 max-w-xs leading-relaxed">Patients scan a QR code at the department entrance. Instant registration begins.</p>
            </motion.div>
            <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.6, delay: 0.2 }}
              className="flex flex-col items-center text-center group"
            >
              <div className="w-20 h-20 bg-white border-2 border-slate-100 rounded-2xl flex items-center justify-center mb-8 shadow-sm group-hover:border-blue-500 group-hover:scale-110 transition-all duration-300">
                <Mic className="w-8 h-8 text-blue-600" />
              </div>
              <h4 className="text-xl font-bold text-slate-900 mb-4">2. Voice Check-In</h4>
              <p className="text-slate-600 max-w-xs leading-relaxed">Patients speak or type their details: name, age, and symptoms. AI transcribes everything.</p>
            </motion.div>
            <motion.div initial={{ opacity: 0, x: 20 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true }} transition={{ duration: 0.6, delay: 0.4 }}
              className="flex flex-col items-center text-center group"
            >
              <div className="w-20 h-20 bg-white border-2 border-slate-100 rounded-2xl flex items-center justify-center mb-8 shadow-sm group-hover:border-blue-500 group-hover:scale-110 transition-all duration-300">
                <FileText className="w-8 h-8 text-blue-600" />
              </div>
              <h4 className="text-xl font-bold text-slate-900 mb-4">3. Track & Get Called</h4>
              <p className="text-slate-600 max-w-xs leading-relaxed">Receive a token, track your position live, and get notified the instant it is your turn.</p>
            </motion.div>
          </div>
        </div>
      </div>
    </section>
  );
}

/* ── Features ─────────────────────────────────────────── */

const features = [
  { icon: Scan, title: 'QR Code Check-In', description: 'Patients scan a QR code at the department entrance. Instant registration, instant queue position.', colSpan: 'md:col-span-2', bg: 'bg-blue-50/50' },
  { icon: Globe, title: 'Voice Input', description: 'AI-powered voice dictation so patients can speak their symptoms naturally instead of typing.', colSpan: 'md:col-span-1', bg: 'bg-white' },
  { icon: Activity, title: 'Real-Time Tracking', description: 'Patients watch their queue position update live. Estimated wait time calculated automatically.', colSpan: 'md:col-span-1', bg: 'bg-white' },
  { icon: Stethoscope, title: 'Doctor Control Panel', description: 'One-click "Call Next" to summon patients. Mark consultations complete. Instant status updates.', colSpan: 'md:col-span-2', bg: 'bg-amber-50/50' },
  { icon: Shield, title: 'Admin Dashboard', description: 'Full control over departments, doctors, and patient data. Create accounts and monitor performance.', colSpan: 'md:col-span-1', bg: 'bg-white' },
  { icon: Zap, title: 'TV Display Board', description: 'Large waiting room display shows "Now Serving" and "Up Next" for all departments in real-time.', colSpan: 'md:col-span-2', bg: 'bg-emerald-50/50' },
];

function FeaturesSection() {
  return (
    <section id="features" className="relative py-24 bg-slate-50 overflow-hidden">
      <div className="absolute inset-0 z-0 bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-[size:24px_24px]" />
      <div className="absolute inset-0 z-0 bg-gradient-to-b from-slate-50 via-transparent to-slate-50" />
      <div className="container mx-auto px-6 relative z-10">
        <div className="text-center max-w-3xl mx-auto mb-16">
          <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.5 }}
            className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-50 border border-blue-100 text-blue-700 text-sm font-medium mb-6"
          >
            <span className="flex h-2 w-2 rounded-full bg-blue-600 animate-pulse" />
            Features & Capabilities
          </motion.div>
          <h3 className="text-3xl md:text-4xl font-bold text-slate-900 mb-4">Everything your hospital needs to manage queues.</h3>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-6xl mx-auto">
          {features.map((feature, index) => (
            <motion.div key={feature.title} initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.5, delay: index * 0.1 }}
              className={`group p-8 rounded-3xl border border-slate-200 shadow-sm hover:shadow-xl transition-all duration-300 ${feature.colSpan} ${feature.bg} relative overflow-hidden`}
            >
              <div className="absolute top-0 right-0 p-8 opacity-10 group-hover:opacity-20 transition-opacity transform group-hover:scale-110 duration-500">
                <feature.icon className="w-24 h-24 text-blue-900" />
              </div>
              <div className="relative z-10">
                <div className="w-14 h-14 bg-white text-blue-600 rounded-full flex items-center justify-center mb-6 shadow-sm border border-slate-100 group-hover:scale-110 transition-transform duration-300">
                  <feature.icon className="w-6 h-6" />
                </div>
                <h4 className="text-xl font-bold text-slate-900 mb-3">{feature.title}</h4>
                <p className="text-slate-600 leading-relaxed">{feature.description}</p>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ── Trust ────────────────────────────────────────────── */

function TrustSection() {
  return (
    <section id="trust" className="py-24 bg-slate-900 text-white">
      <div className="container mx-auto px-6">
        <div className="flex flex-col lg:flex-row items-center gap-16">
          <div className="flex-1 space-y-8">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-50 border border-blue-100 text-blue-700 text-sm font-medium mb-6">
              <span className="flex h-2 w-2 rounded-full bg-blue-600 animate-pulse" />
              Enterprise-Grade Security
            </div>
            <h2 className="text-3xl md:text-4xl font-bold leading-tight">
              Built for Healthcare <br /><span className="text-blue-400">Security & Reliability</span>
            </h2>
            <p className="text-slate-400 text-lg leading-relaxed max-w-xl">
              Gravity is built with security at its core. Patient data is encrypted, access is role-based, and the system is designed for 24/7 hospital operations.
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 pt-4">
              <div className="flex items-start gap-3"><Lock className="w-6 h-6 text-emerald-400 mt-1" /><div><h4 className="font-semibold text-white">Encrypted Data</h4><p className="text-sm text-slate-400">All data encrypted in transit and at rest via Supabase.</p></div></div>
              <div className="flex items-start gap-3"><FileKey className="w-6 h-6 text-blue-400 mt-1" /><div><h4 className="font-semibold text-white">Role-Based Access</h4><p className="text-sm text-slate-400">Separate portals for patients, doctors, admin, and reception.</p></div></div>
              <div className="flex items-start gap-3"><Cloud className="w-6 h-6 text-purple-400 mt-1" /><div><h4 className="font-semibold text-white">Real-Time Sync</h4><p className="text-sm text-slate-400">Live updates via Supabase Realtime channels.</p></div></div>
              <div className="flex items-start gap-3"><Shield className="w-6 h-6 text-orange-400 mt-1" /><div><h4 className="font-semibold text-white">Audit Logging</h4><p className="text-sm text-slate-400">Complete audit trail via optimistic concurrency with version checks.</p></div></div>
            </div>
          </div>

          <div className="flex-1 w-full relative">
            <div className="relative z-10 bg-slate-800 rounded-2xl p-8 border border-slate-700 shadow-2xl">
              <div className="flex items-center gap-4 mb-6 pb-6 border-b border-slate-700">
                <div className="w-3 h-3 bg-red-500 rounded-full" />
                <div className="w-3 h-3 bg-yellow-500 rounded-full" />
                <div className="w-3 h-3 bg-green-500 rounded-full" />
                <div className="flex-1 text-right text-xs font-mono text-slate-500">SECURE_CONNECTION_ESTABLISHED</div>
              </div>
              <div className="space-y-4 font-mono text-sm">
                <div className="flex items-center justify-between text-slate-400"><span>Connection Status</span><span className="text-emerald-400">ACTIVE</span></div>
                <div className="w-full bg-slate-700 h-2 rounded-full overflow-hidden"><div className="w-full h-full bg-emerald-500 animate-pulse" /></div>
                <div className="pt-4 space-y-2">
                  <div className="flex gap-2"><span className="text-blue-400">{">"}</span><span className="text-slate-300">Verifying role-based access controls...</span></div>
                  <div className="flex gap-2"><span className="text-blue-400">{">"}</span><span className="text-slate-300">Supabase Realtime channel connected...</span></div>
                  <div className="flex gap-2"><span className="text-blue-400">{">"}</span><span className="text-emerald-400">Queue data secure. Live updates active.</span></div>
                </div>
              </div>
            </div>
            <div className="absolute -top-10 -right-10 w-32 h-32 bg-blue-500/20 rounded-full blur-3xl pointer-events-none" />
            <div className="absolute -bottom-10 -left-10 w-32 h-32 bg-emerald-500/20 rounded-full blur-3xl pointer-events-none" />
          </div>
        </div>
      </div>
    </section>
  );
}

/* ── Technical ────────────────────────────────────────── */

function TechnicalSection() {
  return (
    <section className="py-20 border-t border-slate-100 bg-white">
      <div className="container mx-auto px-6">
        <div className="text-center mb-12">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-50 border border-blue-100 text-blue-700 text-sm font-medium mb-6">
            <span className="flex h-2 w-2 rounded-full bg-blue-600 animate-pulse" />
            Tech Stack
          </div>
          <h2 className="text-2xl font-bold text-slate-900">Built with Modern, Reliable Technology</h2>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
          <div className="flex flex-col items-center text-center p-4">
            <div className="w-12 h-12 bg-indigo-50 text-indigo-600 rounded-xl flex items-center justify-center mb-4"><Cpu className="w-6 h-6" /></div>
            <h3 className="font-semibold text-slate-900 mb-1">Deepgram AI</h3>
            <p className="text-sm text-slate-500">Voice-to-text transcription for hands-free patient intake.</p>
          </div>
          <div className="flex flex-col items-center text-center p-4">
            <div className="w-12 h-12 bg-cyan-50 text-cyan-600 rounded-xl flex items-center justify-center mb-4"><Database className="w-6 h-6" /></div>
            <h3 className="font-semibold text-slate-900 mb-1">Supabase</h3>
            <p className="text-sm text-slate-500">PostgreSQL backend with real-time subscriptions and RLS.</p>
          </div>
          <div className="flex flex-col items-center text-center p-4">
            <div className="w-12 h-12 bg-emerald-50 text-emerald-600 rounded-xl flex items-center justify-center mb-4"><Server className="w-6 h-6" /></div>
            <h3 className="font-semibold text-slate-900 mb-1">Vercel Edge</h3>
            <p className="text-sm text-slate-500">Global CDN deployment with instant page loads.</p>
          </div>
          <div className="flex flex-col items-center text-center p-4">
            <div className="w-12 h-12 bg-slate-50 text-slate-600 rounded-xl flex items-center justify-center mb-4"><Code2 className="w-6 h-6" /></div>
            <h3 className="font-semibold text-slate-900 mb-1">React + TypeScript</h3>
            <p className="text-sm text-slate-500">Type-safe, component-driven frontend architecture.</p>
          </div>
        </div>
      </div>
    </section>
  );
}

/* ── FAQ ──────────────────────────────────────────────── */

const faqs = [
  { question: 'How do patients join the queue?', answer: 'Patients scan a QR code at the department entrance or are registered by reception staff. They fill in their name, age, and symptoms (via voice or text), and receive a queue token instantly.' },
  { question: 'How do doctors manage the queue?', answer: 'Doctors log into their department dashboard, see all waiting patients with symptoms, and click "Call Next" to summon the next patient. The patient is notified instantly on their phone.' },
  { question: 'Does voice input work on mobile?', answer: 'Yes. Voice input uses the Deepgram AI API over a secure WebSocket connection. It works on any modern browser including mobile Safari and Chrome. Typing is always available as a fallback.' },
  { question: 'How does the TV display work?', answer: 'The TV display shows "Now Serving" and "Up Next" for all departments. It updates in real-time via Supabase Realtime and can be displayed on any screen with a web browser.' },
  { question: 'Is the system real-time?', answer: 'Yes. All queue updates, patient status changes, and notifications happen in real-time via Supabase Realtime channels with polling fallback. There is zero delay between doctor actions and patient notifications.' },
];

function FAQSection() {
  const [openIndex, setOpenIndex] = useState<number | null>(0);
  return (
    <section id="faq" className="py-24 bg-white border-t border-slate-100">
      <div className="container mx-auto px-6 max-w-4xl">
        <div className="text-center mb-16">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-50 border border-blue-100 text-blue-700 text-sm font-medium mb-6">
            <span className="flex h-2 w-2 rounded-full bg-blue-600 animate-pulse" />
            FAQ
          </div>
          <h2 className="text-3xl md:text-4xl font-bold text-slate-900 mb-4">Frequently Asked Questions</h2>
          <p className="text-lg text-slate-600">Everything you need to know about Gravity queue management.</p>
        </div>
        <div className="space-y-4">
          {faqs.map((faq, index) => (
            <div key={index} className="bg-slate-50 rounded-2xl border border-slate-200 overflow-hidden transition-colors hover:border-blue-200">
              <button onClick={() => setOpenIndex(openIndex === index ? null : index)} className="w-full flex items-center justify-between p-6 text-left" type="button">
                <span className="font-semibold text-lg text-slate-900">{faq.question}</span>
                <ChevronDown className={`w-5 h-5 text-slate-500 transition-transform duration-300 flex-shrink-0 ${openIndex === index ? 'rotate-180 text-blue-600' : ''}`} />
              </button>
              <AnimatePresence>
                {openIndex === index && (
                  <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.3 }}>
                    <div className="px-6 pb-6 text-slate-600 leading-relaxed border-t border-slate-200/50 pt-4">{faq.answer}</div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ── Final CTA ────────────────────────────────────────── */

function FinalCTA() {
  const navigate = useNavigate();
  return (
    <section className="py-24 bg-blue-600">
      <div className="container mx-auto px-6 text-center">
        <h2 className="text-3xl md:text-5xl font-bold text-white mb-6">Ready to Eliminate Hospital Queues?</h2>
        <p className="text-xl text-blue-100 mb-10 max-w-2xl mx-auto">Whether you are a patient or a healthcare provider, Gravity makes the queue experience instant and seamless.</p>
        <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
          <button onClick={() => navigate('/general/newpatient')} className="h-14 px-8 text-lg w-full sm:w-auto bg-white text-blue-700 font-semibold rounded-full hover:bg-blue-50 transition-colors flex items-center justify-center gap-2" type="button">
            Join Queue <ArrowRight className="w-5 h-5" />
          </button>
          <button onClick={() => navigate('/doctor/login')} className="h-14 px-8 text-lg w-full sm:w-auto bg-blue-700 text-white font-semibold rounded-full hover:bg-blue-800 transition-colors flex items-center justify-center gap-2" type="button">
            Doctor Dashboard
          </button>
        </div>
      </div>
    </section>
  );
}

/* ── Footer ───────────────────────────────────────────── */

function LandingFooter() {
  const navigate = useNavigate();
  return (
    <footer className="bg-slate-50 pt-16 pb-8 border-t border-slate-200">
      <div className="container mx-auto px-6">
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-8 mb-12">
          <div className="col-span-2 lg:col-span-2">
            <button onClick={() => navigate('/')} className="flex items-center gap-2 mb-4" type="button">
              <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center text-white font-bold text-lg">G</div>
              <span className="text-xl font-bold text-slate-900 tracking-tight">Gravity</span>
            </button>
            <p className="text-slate-500 text-sm max-w-xs leading-relaxed">Smart hospital queue management. Eliminate wait time, improve patient experience.</p>
          </div>
          <div>
            <h4 className="font-semibold text-slate-900 mb-4">For Patients</h4>
            <ul className="space-y-3 text-sm text-slate-600">
              <li><button onClick={() => navigate('/general/newpatient')} className="hover:text-blue-600 transition-colors" type="button">Join Queue</button></li>
              <li><button onClick={() => navigate('/tv')} className="hover:text-blue-600 transition-colors" type="button">Queue Display</button></li>
            </ul>
          </div>
          <div>
            <h4 className="font-semibold text-slate-900 mb-4">For Staff</h4>
            <ul className="space-y-3 text-sm text-slate-600">
              <li><button onClick={() => navigate('/doctor/login')} className="hover:text-blue-600 transition-colors" type="button">Doctor Portal</button></li>
              <li><button onClick={() => navigate('/reception')} className="hover:text-blue-600 transition-colors" type="button">Reception Desk</button></li>
            </ul>
          </div>
          <div>
            <h4 className="font-semibold text-slate-900 mb-4">Administration</h4>
            <ul className="space-y-3 text-sm text-slate-600">
              <li><button onClick={() => navigate('/admin')} className="hover:text-blue-600 transition-colors" type="button">Admin Panel</button></li>
            </ul>
          </div>
        </div>
        <div className="pt-8 border-t border-slate-200 text-center text-sm text-slate-500">
          <p>&copy; {new Date().getFullYear()} Gravity. Healthcare Made Simple.</p>
        </div>
      </div>
    </footer>
  );
}

/* ── Landing Page ─────────────────────────────────────── */

export const LandingPage: React.FC = () => {
  return (
    <main className="min-h-screen font-sans bg-white text-slate-900">
      <Navbar />
      <Hero />
      <ProblemSection />
      <SolutionSection />
      <FeaturesSection />
      <TrustSection />
      <TechnicalSection />
      <FAQSection />
      <FinalCTA />
      <LandingFooter />
    </main>
  );
};
