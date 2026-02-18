import React, { useEffect, useState } from 'react';
import { queueService } from '../services/queueService';
import { generateQueueAnalysis } from '../services/geminiService';
import { QueueStats, Department, DepartmentConfig } from '../types';
import { DEPARTMENTS } from '../constants';
import { QueueGraph } from '../components/QueueGraph';
import { Sparkles, BarChart2, Users, Home, QrCode, CheckCircle, Building2, ToggleLeft, ToggleRight } from 'lucide-react';

type ManagedDepartment = DepartmentConfig & { isActive: boolean };

export const AdminDashboard: React.FC<{ onExit: () => void }> = ({ onExit }) => {
  const [stats, setStats] = useState<Record<Department, QueueStats>>({} as Record<Department, QueueStats>);
  const [aiReport, setAiReport] = useState<string>('');
  const [loadingAi, setLoadingAi] = useState(false);
  const [activeTab, setActiveTab] = useState<'overview' | 'qr' | 'departments'>('overview');
  const [departments, setDepartments] = useState<ManagedDepartment[]>([]);

  useEffect(() => {
    const load = async () => {
      const nextStats = await queueService.getAllStats();
      setStats(nextStats);
      const nextDepartments = await queueService.getManagedDepartments();
      setDepartments(nextDepartments as ManagedDepartment[]);
    };

    void load();
    const interval = setInterval(() => {
      void load();
    }, 3000);
    return () => clearInterval(interval);
  }, []);

  const handleGenerateReport = async () => {
    setLoadingAi(true);
    setAiReport('');
    const report = await generateQueueAnalysis(stats);
    setAiReport(report);
    setLoadingAi(false);
  };

  const totalWaiting = Object.values(stats).reduce((acc, stat) => acc + stat.waiting, 0);
  const totalCompleted = Object.values(stats).reduce((acc, stat) => acc + stat.completed, 0);
  const statsReady = Object.keys(stats).length > 0;

  const toggleDepartment = async (department: ManagedDepartment) => {
    try {
      await queueService.updateDepartment(department.id as Department, { isActive: !department.isActive });
      const nextDepartments = await queueService.getManagedDepartments();
      setDepartments(nextDepartments as ManagedDepartment[]);
    } catch {
      alert('Failed to update department status.');
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-100 via-white to-slate-200 p-8">
      <div className="max-w-7xl mx-auto">
        <div className="flex justify-between items-center mb-8">
          <div>
            <p className="text-xs uppercase tracking-[0.28em] text-slate-500 mb-2">Operations</p>
            <h1 className="text-4xl font-black text-slate-900">Hospital Command Center</h1>
            <p className="text-slate-600">Live Operational and Department Governance</p>
          </div>
          <button onClick={onExit} className="text-gray-600 hover:text-gray-900 flex items-center gap-2">
            <Home size={20} /> Home
          </button>
        </div>

        {/* Tab Nav */}
        <div className="flex space-x-1 bg-white p-1 rounded-2xl shadow-sm border border-slate-200 mb-8 w-fit">
          <button 
            onClick={() => setActiveTab('overview')}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${activeTab === 'overview' ? 'bg-gray-100 text-gray-900' : 'text-gray-500 hover:text-gray-700'}`}
          >
            Overview
          </button>
          <button 
             onClick={() => setActiveTab('qr')}
             className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors flex items-center gap-2 ${activeTab === 'qr' ? 'bg-gray-100 text-gray-900' : 'text-gray-500 hover:text-gray-700'}`}
          >
            <QrCode size={16} /> QR Codes
          </button>
          <button 
             onClick={() => setActiveTab('departments')}
             className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors flex items-center gap-2 ${activeTab === 'departments' ? 'bg-gray-100 text-gray-900' : 'text-gray-500 hover:text-gray-700'}`}
          >
            <Building2 size={16} /> Departments
          </button>
        </div>

        {activeTab === 'overview' ? (
          <>
            {!statsReady && (
              <div className="bg-white p-6 rounded-xl border border-gray-200 text-gray-500 mb-6">
                Loading live stats...
              </div>
            )}

            {/* KPI Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
              <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200 flex items-center gap-4">
                <div className="p-3 bg-blue-100 text-blue-600 rounded-lg">
                  <Users size={24} />
                </div>
                <div>
                  <p className="text-sm text-gray-500 font-medium">Currently Waiting</p>
                  <p className="text-3xl font-bold text-gray-900">{totalWaiting}</p>
                </div>
              </div>
              
              <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200 flex items-center gap-4">
                <div className="p-3 bg-green-100 text-green-600 rounded-lg">
                  <CheckCircle size={24} />
                </div>
                <div>
                  <p className="text-sm text-gray-500 font-medium">Total Served Today</p>
                  <p className="text-3xl font-bold text-gray-900">{totalCompleted}</p>
                </div>
              </div>

              <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200 flex items-center gap-4">
                <div className="p-3 bg-purple-100 text-purple-600 rounded-lg">
                  <BarChart2 size={24} />
                </div>
                <div>
                  <p className="text-sm text-gray-500 font-medium">Active Departments</p>
                  <p className="text-3xl font-bold text-gray-900">{Object.keys(stats).length}</p>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              
              {/* Main Chart */}
              <div className="lg:col-span-2">
                  {statsReady && <QueueGraph stats={stats} />}
              </div>

              {/* AI Insights Panel */}
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden flex flex-col">
                <div className="bg-gradient-to-r from-indigo-600 to-purple-600 p-6 text-white">
                  <h3 className="font-bold text-lg flex items-center gap-2">
                    <Sparkles size={20} className="text-yellow-300" /> AI Operations Analyst
                  </h3>
                  <p className="text-indigo-100 text-sm opacity-90">Get real-time insights on bottlenecks.</p>
                </div>
                <div className="p-6 flex-1 flex flex-col">
                  {aiReport ? (
                    <div className="bg-gray-50 p-4 rounded-lg border border-gray-200 text-sm text-gray-700 leading-relaxed mb-4 flex-1 overflow-y-auto">
                      {aiReport}
                    </div>
                  ) : (
                    <div className="flex-1 flex items-center justify-center text-gray-400 text-sm text-center p-4">
                      Click generate to analyze current queue data using Gemini AI.
                    </div>
                  )}
                  
                  <button
                    onClick={handleGenerateReport}
                    disabled={loadingAi}
                    className={`w-full py-3 rounded-lg font-bold text-white transition-all ${
                      loadingAi 
                        ? 'bg-gray-400 cursor-not-allowed' 
                        : 'bg-indigo-600 hover:bg-indigo-700 shadow-lg hover:shadow-xl'
                    }`}
                  >
                    {loadingAi ? 'Analyzing Data...' : 'Generate AI Report'}
                  </button>
                </div>
              </div>

            </div>

            {/* Detailed Table */}
            <div className="mt-8 bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
              <table className="w-full text-left">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase">Department</th>
                    <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase">Waiting</th>
                    <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase">Avg Wait Time</th>
                    <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase">Urgent Cases</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {statsReady && Object.entries(stats).map(([deptId, stat]) => (
                    <tr key={deptId} className="hover:bg-gray-50">
                      <td className="px-6 py-4 text-sm font-medium text-gray-900 capitalize">
                        {deptId.toLowerCase().replace('_', ' ')}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-600">{stat.waiting}</td>
                      <td className="px-6 py-4 text-sm text-gray-600">
                        <span className={`px-2 py-1 rounded text-xs font-bold ${stat.avgWaitTime > 20 ? 'bg-red-100 text-red-600' : 'bg-green-100 text-green-600'}`}>
                          {stat.avgWaitTime} min
                        </span>
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-600">{stat.urgentCount}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        ) : (
          activeTab === 'qr' ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 animate-fade-in">
            {Object.values(DEPARTMENTS).map(dept => {
               // In a real app, this URL would be the actual production URL + routing param
               const dummyUrl = `https://mediqueue.app/checkin/${dept.id}`;
               const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(dummyUrl)}`;
               
               return (
                 <div key={dept.id} className="bg-white p-6 rounded-xl shadow-sm border border-gray-200 flex flex-col items-center text-center">
                    <div className={`w-full h-2 rounded-full ${dept.color} mb-4`}></div>
                    <h3 className="text-xl font-bold text-gray-900 mb-2">{dept.name}</h3>
                    <p className="text-sm text-gray-500 mb-6">Scan to enter queue</p>
                    <div className="bg-gray-50 p-4 rounded-lg border border-gray-100 mb-4">
                      <img src={qrUrl} alt={`${dept.name} QR Code`} className="w-40 h-40 mix-blend-multiply" />
                    </div>
                    <button 
                      onClick={() => window.print()}
                      className="text-sm text-blue-600 font-medium hover:text-blue-800"
                    >
                      Print Poster
                    </button>
                 </div>
               );
            })}
          </div>
          ) : (
            <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
              <h3 className="text-lg font-bold text-slate-900 mb-1">Department Management</h3>
              <p className="text-sm text-slate-500 mb-6">Enable or disable departments for patient check-in.</p>
              <div className="space-y-3">
                {departments.map((department) => (
                  <div key={department.id} className="flex items-center justify-between border border-slate-200 rounded-xl p-4">
                    <div>
                      <p className="font-semibold text-slate-900">{department.name}</p>
                      <p className="text-xs text-slate-500">Code: {department.code}</p>
                    </div>
                    <button
                      onClick={() => void toggleDepartment(department)}
                      className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-colors ${department.isActive ? 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'}`}
                    >
                      {department.isActive ? <ToggleRight size={16} /> : <ToggleLeft size={16} />}
                      {department.isActive ? 'Active' : 'Inactive'}
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )
        )}
      </div>
    </div>
  );
};
