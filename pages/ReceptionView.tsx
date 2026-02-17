import React, { useState } from 'react';
import { Department } from '../types';
import { DEPARTMENTS, COMMON_SYMPTOMS } from '../constants';
import { queueService } from '../services/queueService';
import { User, Activity, AlertCircle, Printer, ArrowLeft } from 'lucide-react';

interface ReceptionViewProps {
  onExit: () => void;
}

export const ReceptionView: React.FC<ReceptionViewProps> = ({ onExit }) => {
  const [selectedDept, setSelectedDept] = useState<Department>(Department.GENERAL);
  const [name, setName] = useState('');
  const [age, setAge] = useState('');
  const [selectedSymptoms, setSelectedSymptoms] = useState<string[]>([]);
  const [generatedToken, setGeneratedToken] = useState<string | null>(null);

  const toggleSymptom = (symptom: string) => {
    if (selectedSymptoms.includes(symptom)) {
      setSelectedSymptoms(selectedSymptoms.filter((s) => s !== symptom));
    } else {
      setSelectedSymptoms([...selectedSymptoms, symptom]);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !age) return;
    const patient = queueService.addPatient(name, parseInt(age), selectedDept, selectedSymptoms);
    setGeneratedToken(patient.tokenNumber);
  };

  const handleReset = () => {
    setName('');
    setAge('');
    setSelectedSymptoms([]);
    setGeneratedToken(null);
  };

  return (
    <div className="min-h-screen bg-gray-100 p-6 flex items-center justify-center">
      <div className="max-w-2xl w-full bg-white rounded-xl shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="bg-gray-900 text-white p-6 flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold">Reception Desk</h1>
            <p className="text-gray-400 text-sm">Manual Patient Entry System</p>
          </div>
          <button onClick={onExit} className="text-gray-400 hover:text-white flex items-center gap-2">
            <ArrowLeft size={18} /> Exit
          </button>
        </div>

        <div className="p-8">
          {generatedToken ? (
            <div className="text-center py-12 animate-fade-in">
              <div className="bg-green-100 text-green-800 h-20 w-20 rounded-full flex items-center justify-center mx-auto mb-6">
                 <Printer size={32} />
              </div>
              <h2 className="text-3xl font-bold text-gray-800 mb-2">Token Generated</h2>
              <div className="text-6xl font-black text-blue-600 my-6 tracking-tighter">
                {generatedToken}
              </div>
              <p className="text-gray-500 mb-8">
                Please write this number on a slip for the patient.
              </p>
              <button 
                onClick={handleReset}
                className="bg-blue-600 text-white px-8 py-3 rounded-lg font-bold hover:bg-blue-700 transition-colors shadow-lg"
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
                      className={`p-3 rounded-lg text-sm font-medium border-2 transition-all text-left ${
                        selectedDept === dept.id 
                          ? `border-blue-500 bg-blue-50 text-blue-700` 
                          : 'border-gray-200 hover:border-gray-300 text-gray-600'
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
                    className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-blue-500 outline-none"
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
                    className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-blue-500 outline-none"
                    placeholder="Years"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-3 flex items-center gap-2">
                  <AlertCircle size={16} /> Symptoms
                </label>
                <div className="flex flex-wrap gap-2">
                  {COMMON_SYMPTOMS.map((symptom) => (
                    <button
                      key={symptom}
                      type="button"
                      onClick={() => toggleSymptom(symptom)}
                      className={`px-3 py-2 rounded-full text-sm font-medium transition-colors ${
                        selectedSymptoms.includes(symptom)
                          ? 'bg-red-100 text-red-700 border border-red-200'
                          : 'bg-gray-50 text-gray-600 border border-gray-200 hover:bg-gray-100'
                      }`}
                    >
                      {symptom}
                    </button>
                  ))}
                </div>
              </div>

              <div className="pt-4">
                <button
                  type="submit"
                  className="w-full bg-gray-900 text-white py-4 rounded-xl font-bold shadow-lg hover:bg-black transition-transform transform hover:-translate-y-1"
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