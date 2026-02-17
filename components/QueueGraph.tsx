import React from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  Cell
} from 'recharts';
import { QueueStats, Department } from '../types';
import { DEPARTMENTS } from '../constants';

interface QueueGraphProps {
  stats: Record<Department, QueueStats>;
}

export const QueueGraph: React.FC<QueueGraphProps> = ({ stats }) => {
  const data = Object.values(DEPARTMENTS).map((dept) => ({
    name: dept.name.split(' ')[0], // Shorten name
    waiting: stats[dept.id].waiting,
    completed: stats[dept.id].completed,
    urgent: stats[dept.id].urgentCount,
    avgWait: stats[dept.id].avgWaitTime,
    color: dept.color.replace('bg-', 'text-').replace('-500', '-600') // Very rough approximation for demo
  }));

  // Map tailwind color names to hex for Recharts
  const getColor = (deptName: string) => {
    if (deptName.includes('General')) return '#3b82f6';
    if (deptName.includes('ENT')) return '#6366f1';
    if (deptName.includes('Orthopedics')) return '#f97316';
    if (deptName.includes('Dental')) return '#14b8a6';
    if (deptName.includes('Cardiology')) return '#ef4444';
    return '#8884d8';
  };

  return (
    <div className="h-80 w-full bg-white p-4 rounded-xl shadow-sm border border-gray-200">
      <h3 className="text-lg font-semibold text-gray-700 mb-4">Real-time Queue Volume</h3>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart
          data={data}
          margin={{
            top: 5,
            right: 30,
            left: 20,
            bottom: 5,
          }}
        >
          <CartesianGrid strokeDasharray="3 3" vertical={false} />
          <XAxis dataKey="name" axisLine={false} tickLine={false} />
          <YAxis axisLine={false} tickLine={false} />
          <Tooltip 
            cursor={{fill: '#f3f4f6'}}
            contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
          />
          <Legend />
          <Bar dataKey="waiting" name="Waiting" stackId="a" fill="#3b82f6" radius={[0,0,4,4]} />
          <Bar dataKey="urgent" name="Urgent" stackId="a" fill="#ef4444" radius={[4,4,0,0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
};
