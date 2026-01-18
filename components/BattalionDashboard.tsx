
import React from 'react';
import { User } from '../types';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell, PieChart, Pie } from 'recharts';

const BattalionDashboard: React.FC<{ user: User }> = ({ user }) => {
  const companyData = [
    { name: 'Alpha', avg: 76, color: '#14b8a6' },
    { name: 'Bravo', avg: 68, color: '#f97316' },
    { name: 'Charlie', avg: 82, color: '#0d9488' },
    { name: 'Delta', avg: 71, color: '#fb923c' },
  ];

  const pieData = [
    { name: 'Green Band', value: 50, fill: '#14b8a6' },
    { name: 'Amber Band', value: 120, fill: '#f97316' },
    { name: 'Red Band', value: 30, fill: '#ef4444' },
  ];

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-bold text-stone-800">Battalion Strategic Command</h1>
        <p className="text-stone-500">Consolidated Assessment Data for 200 Agniveers</p>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {/* ... Keep Stats ... */}
        <div className="bg-white p-4 rounded-xl border border-stone-200 shadow-sm">
          <p className="text-[10px] font-black text-stone-400 uppercase tracking-widest mb-1">Total Strength</p>
          <p className="text-2xl font-black text-stone-800">200</p>
        </div>
        <div className="bg-teal-50 p-4 rounded-xl border border-teal-100 shadow-sm">
          <p className="text-[10px] font-black text-teal-600 uppercase tracking-widest mb-1">Retention Ready</p>
          <div className="flex items-end justify-between">
            <p className="text-2xl font-black text-teal-700">50</p>
            <span className="text-[10px] font-bold text-teal-600 bg-white px-2 py-0.5 rounded-full">TOP 25%</span>
          </div>
        </div>
        <div className="bg-orange-50 p-4 rounded-xl border border-orange-100 shadow-sm">
          <p className="text-[10px] font-black text-orange-600 uppercase tracking-widest mb-1">At Risk (Red Band)</p>
          <p className="text-2xl font-black text-orange-700">30</p>
        </div>
        <div className="bg-stone-800 p-4 rounded-xl shadow-lg">
          <p className="text-[10px] font-black text-stone-400 uppercase tracking-widest mb-1">Counseling Compliance</p>
          <p className="text-2xl font-black text-white">92%</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Charts expanded to fill space */}
        <div className="bg-white p-6 rounded-xl border border-stone-200 shadow-sm">
          <h3 className="font-bold text-stone-700 mb-6">Company Performance Comparison</h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={companyData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f3f4f6" />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#9ca3af' }} />
                <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#9ca3af' }} />
                <Tooltip cursor={{ fill: '#f9fafb' }} contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} />
                <Bar dataKey="avg" radius={[4, 4, 0, 0]}>
                  {companyData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-white p-6 rounded-xl border border-stone-200 shadow-sm">
          <h3 className="font-bold text-stone-700 mb-6">Battalion RRI Distribution</h3>
          <div className="flex items-center justify-around h-64">
            <div className="w-1/2 h-full">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={pieData} cx="50%" cy="50%" innerRadius={50} outerRadius={80} paddingAngle={5} dataKey="value" stroke="none">
                    {pieData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.fill} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="space-y-4">
              {pieData.map(p => (
                <div key={p.name} className="flex items-center space-x-3">
                  <div className="w-3 h-3 rounded-full" style={{ backgroundColor: p.fill }}></div>
                  <div>
                    <p className="text-xs font-bold text-stone-800">{p.name}</p>
                    <p className="text-[10px] text-stone-400">{p.value} Agniveers</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-stone-200 shadow-sm overflow-hidden">
        <div className="p-6 border-b border-stone-100 flex justify-between items-center bg-stone-50/50">
          <h3 className="font-bold text-stone-700">Top 50 Retention Recommendations (Preview)</h3>
          <button className="text-teal-700 text-xs font-bold hover:underline">View Full List →</button>
        </div>
        <table className="w-full text-sm">
          <thead className="bg-stone-50 text-stone-400 text-left">
            <tr>
              <th className="px-6 py-3 font-medium uppercase tracking-widest text-[10px]">Rank</th>
              <th className="px-6 py-3 font-medium uppercase tracking-widest text-[10px]">Service ID</th>
              <th className="px-6 py-3 font-medium uppercase tracking-widest text-[10px]">Name</th>
              <th className="px-6 py-3 font-medium uppercase tracking-widest text-[10px]">Company</th>
              <th className="px-6 py-3 font-medium uppercase tracking-widest text-[10px]">RRI Score</th>
              <th className="px-6 py-3 font-medium uppercase tracking-widest text-[10px]">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-stone-50">
            {[1, 2, 3, 4, 5].map(i => (
              <tr key={i} className="hover:bg-teal-50/30 transition-colors">
                <td className="px-6 py-4 font-bold text-stone-400">#0{i}</td>
                <td className="px-6 py-4 font-mono text-stone-800">AG00{i + 15}</td>
                <td className="px-6 py-4 font-medium text-stone-800">Agniveer {['Vikram', 'Anil', 'Sanjay', 'Rahul', 'Mukesh'][i - 1]} Singh</td>
                <td className="px-6 py-4 text-stone-600">{['Alpha', 'Charlie', 'Alpha', 'Delta', 'Bravo'][i - 1]}</td>
                <td className="px-6 py-4 font-black text-teal-700">{92 - i * 2}</td>
                <td className="px-6 py-4"><span className="px-2 py-0.5 bg-green-100 text-green-700 text-[10px] font-bold rounded-full">HIGH POTENTIAL</span></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default BattalionDashboard;
