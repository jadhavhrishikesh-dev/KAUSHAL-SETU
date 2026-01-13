import React, { useState, useEffect } from 'react';
import { User, Message } from '../types';
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

  const [messages, setMessages] = useState<Message[]>([]);
  const [replyContent, setReplyContent] = useState('');
  const [activeReplyId, setActiveReplyId] = useState<number | null>(null);

  useEffect(() => {
    // Fetch Messages for CO
    const fetchMessages = async () => {
      try {
        const res = await fetch('http://localhost:8000/api/messages/role/CO');
        if (res.ok) setMessages(await res.json());
      } catch (e) { console.error(e); }
    };
    fetchMessages();
  }, []);

  const handleReply = async (agniveer_id: number) => {
    if (!replyContent.trim()) return;
    try {
      const res = await fetch('http://localhost:8000/api/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          agniveer_id: agniveer_id,
          sender_role: 'CO',
          recipient_role: 'AGNIVEER',
          content: replyContent
        })
      });
      if (res.ok) {
        const newMsg = await res.json();
        setMessages([newMsg, ...messages]);
        setReplyContent('');
        setActiveReplyId(null);
      }
    } catch (e) { console.error(e); }
  };

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

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Inbox Panel - Takes 1 column */}
        <div className="bg-stone-800 p-6 rounded-xl shadow-xl text-white h-[400px] flex flex-col">
          <h3 className="font-bold mb-4 flex items-center space-x-2 border-b border-stone-600 pb-2">
            <svg className="w-5 h-5 text-teal-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" /></svg>
            <span>Bn HQ Inbox ({messages.length})</span>
          </h3>
          <div className="flex-1 overflow-y-auto space-y-4 pr-2 custom-scrollbar">
            {messages.length === 0 && <p className="text-xs text-stone-500">No messages.</p>}
            {messages.map(msg => {
              const isFromMe = msg.sender_role === 'CO';
              return (
                <div key={msg.id} className={`p-3 rounded-lg border ${isFromMe ? 'border-teal-700 bg-teal-900/20 ml-4' : 'border-stone-600 bg-stone-700 mr-4'}`}>
                  <div className="flex justify-between items-start mb-1">
                    <span className="text-[10px] font-bold text-stone-400 uppercase tracking-widest">
                      {isFromMe ? 'To: AG ' + msg.agniveer_id : 'From: AG ' + msg.agniveer_id}
                    </span>
                    <span className="text-[10px] text-stone-500">{new Date(msg.timestamp).toLocaleDateString()}</span>
                  </div>
                  <p className="text-xs text-stone-200">{msg.content}</p>
                  {!isFromMe && (
                    <div className="mt-2 pt-2 border-t border-stone-600">
                      {activeReplyId === msg.id ? (
                        <div className="flex space-x-2">
                          <input className="flex-1 bg-stone-800 text-xs p-1 rounded border border-stone-500 text-white"
                            autoFocus
                            value={replyContent} onChange={e => setReplyContent(e.target.value)} placeholder="Reply..."
                          />
                          <button onClick={() => handleReply(msg.agniveer_id)} className="text-xs bg-teal-600 px-2 rounded font-bold">SEND</button>
                          <button onClick={() => setActiveReplyId(null)} className="text-xs text-stone-400">Cancel</button>
                        </div>
                      ) : (
                        <button onClick={() => setActiveReplyId(msg.id)} className="text-[10px] font-bold text-teal-400 hover:text-teal-300">REPLY</button>
                      )}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </div>

        {/* Existing Charts - Takes 2 columns */}
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white p-6 rounded-xl border border-stone-200 shadow-sm">
            <h3 className="font-bold text-stone-700 mb-6">Company Performance Comparison</h3>
            <div className="h-48">
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
            <div className="flex items-center justify-around h-48">
              <div className="w-1/2 h-full">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={pieData} cx="50%" cy="50%" innerRadius={40} outerRadius={60} paddingAngle={5} dataKey="value" stroke="none">
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
