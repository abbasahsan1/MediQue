import React from 'react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer
} from 'recharts';
import { QueueStats, Department } from '../types';
import { DEPARTMENTS } from '../constants';
import { BarChart2 } from 'lucide-react';

interface QueueGraphProps {
  stats: Record<Department, QueueStats>;
}

export const QueueGraph: React.FC<QueueGraphProps> = ({ stats }) => {
  const data = Object.values(DEPARTMENTS).map((dept) => {
    const stat = stats[dept.id] ?? { waiting: 0, completed: 0, urgentCount: 0, avgWaitTime: 0 };
    return {
      name: dept.code,
      fullName: dept.name,
      waiting: stat.waiting,
      completed: stat.completed,
      urgent: stat.urgentCount,
    };
  });

  return (
    <div className="card p-6 h-full">
      <div className="flex items-center gap-3 mb-6">
        <div className="icon-circle icon-circle-brand" style={{ width: 38, height: 38 }}>
          <BarChart2 size={17} />
        </div>
        <div>
          <h3 className="font-bold text-foreground">Real-time Queue Volume</h3>
          <p className="text-xs text-muted-foreground">Live patient load per department</p>
        </div>
      </div>
      <div className="h-60">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} margin={{ top: 4, right: 10, left: -20, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border)" />
            <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: 'var(--muted-foreground)', fontSize: 12 }} />
            <YAxis axisLine={false} tickLine={false} tick={{ fill: 'var(--muted-foreground)', fontSize: 12 }} />
            <Tooltip
              cursor={{ fill: 'var(--surface-muted)' }}
              contentStyle={{ borderRadius: 12, border: '1px solid var(--border)', boxShadow: 'var(--shadow-1)', fontSize: 13, background: 'var(--surface)' }}
              labelFormatter={(label) => data.find(d => d.name === label)?.fullName ?? label}
            />
            <Legend wrapperStyle={{ fontSize: 12, color: 'var(--secondary)' }} />
            <Bar dataKey="waiting" name="Waiting" stackId="a" fill="var(--primary)" radius={[0, 0, 4, 4]} />
            <Bar dataKey="urgent"  name="Urgent"  stackId="a" fill="var(--destructive)" radius={[0, 0, 0, 0]} />
            <Bar dataKey="completed" name="Completed" fill="var(--success)" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};
