import React, { useState } from 'react';
import { Department } from '../types';
import { DEPARTMENTS } from '../constants';
import { queueService } from '../services/queueService';
import { User, Activity, AlertCircle, Printer, ArrowLeft, Building2 } from 'lucide-react';

interface ReceptionViewProps {
  onExit: () => void;
}

export const ReceptionView: React.FC<ReceptionViewProps> = ({ onExit }) => {
  const [selectedDept, setSelectedDept] = useState<Department>(Department.GENERAL);
  const [name, setName] = useState('');
  const [age, setAge] = useState('');
  const [symptomsInput, setSymptomsInput] = useState('');
  const [generatedToken, setGeneratedToken] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !age) return;
    const symptoms = symptomsInput
      .split(/[,\n]/)
      .map((item) => item.trim())
      .filter(Boolean)
      .slice(0, 15);
    try {
      const patient = await queueService.checkIn(name, parseInt(age, 10), selectedDept, symptoms);
      setGeneratedToken(patient.tokenNumber);
    } catch {
      alert('Failed to register patient. Please retry.');
    }
  };

  const handleReset = () => {
    setName('');
    setAge('');
    setSymptomsInput('');
    setGeneratedToken(null);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-100 via-white to-slate-200 p-6 flex items-center justify-center">
      <div className="max-w-2xl w-full bg-white rounded-2xl shadow-2xl overflow-hidden border border-slate-200">
        {/* Header */}
        <div className="bg-slate-950 text-white p-6 flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2"><Building2 size={24} /> Reception Desk</h1>
            <p className="text-slate-300 text-sm">Manual Patient Entry System</p>
          </div>
          <button onClick={onExit} className="text-slate-300 hover:text-white flex items-center gap-2">
            <ArrowLeft size={18} /> Exit
          </button>
        </div>

        <div className="p-8">
          {generatedToken ? (
            <div className="text-center py-12 animate-fade-in">
              <div className="bg-green-100 text-green-800 h-20 w-20 rounded-full flex items-center justify-center mx-auto mb-6">
                 <Printer size={32} />
              </div>
              <h2 className="text-3xl font-bold text-slate-900 mb-2">Token Generated</h2>
              <div className="text-6xl font-black text-slate-800 my-6 tracking-tighter">
                {generatedToken}
              </div>
              <p className="text-slate-500 mb-8">
                Please write this number on a slip for the patient.
              </p>
              <button 
                onClick={handleReset}
                className="bg-slate-900 text-white px-8 py-3 rounded-xl font-bold hover:bg-black transition-colors shadow-lg"
              >
                Register Next Patient
              </button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-6">
              
              {/* Department Selector */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Select Department</label>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                  {Object.values(DEPARTMENTS).map((dept) => (
                    <button
                      key={dept.id}
                      type="button"
                      onClick={() => setSelectedDept(dept.id)}
                      className={`p-3 rounded-xl text-sm font-medium border-2 transition-all text-left ${
                        selectedDept === dept.id 
                          ? `border-slate-700 bg-slate-100 text-slate-900` 
                          : 'border-slate-200 hover:border-slate-300 text-slate-600'
                      }`}
                    >
                      {dept.name}
                    </button>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center gap-2">
                    <User size={16} /> Patient Name
                  </label>
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full px-4 py-3 rounded-xl border border-slate-300 focus:ring-2 focus:ring-slate-900/20 outline-none"
                    placeholder="Full Name"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center gap-2">
                    <Activity size={16} /> Age
                  </label>
                  <input
                    type="number"
                    required
                    value={age}
                    onChange={(e) => setAge(e.target.value)}
                    className="w-full px-4 py-3 rounded-xl border border-slate-300 focus:ring-2 focus:ring-slate-900/20 outline-none"
                    placeholder="Years"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-3 flex items-center gap-2">
                  <AlertCircle size={16} /> Symptoms (Free text)
                </label>
                <textarea
                  value={symptomsInput}
                  onChange={(event) => setSymptomsInput(event.target.value)}
                  className="w-full min-h-28 px-4 py-3 rounded-xl border border-slate-300 focus:ring-2 focus:ring-slate-900/20 outline-none resize-y"
                  placeholder="Enter symptoms separated by commas or new lines"
                />
              </div>

              <div className="pt-4">
                <button
                  type="submit"
                  className="w-full bg-slate-900 text-white py-4 rounded-xl font-bold shadow-lg hover:bg-black transition-transform transform hover:-translate-y-0.5"
                >
                  Generate Token
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};