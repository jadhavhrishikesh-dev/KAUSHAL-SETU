
import React, { useState, useEffect } from 'react';
import { User, Message, AgniveerProfile } from '../types';
import { Radar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, ResponsiveContainer } from 'recharts';

interface RRIResponse {
  rri_score: number;
  retention_band: string;
  technical: {
    breakdown: {
      firing: number;
      weapon: number;
      tactical: number;
      cognitive: number;
    };
    total_score: number;
  };
  behavioral: {
    total_score: number;
  };
  achievement?: { // Added achievement to RRIResponse
    total_score: number;
  };
}

const AgniveerDashboard: React.FC<{ user: User }> = ({ user }) => {
  const [suggestion, setSuggestion] = useState('');
  const [recipient, setRecipient] = useState('COY_CDR'); // Value matches Schema enum
  const [historyTab, setHistoryTab] = useState<'COY_CDR' | 'CO'>('COY_CDR'); // Filter for history
  const [messageStatus, setMessageStatus] = useState<string | null>(null);
  const [rriData, setRriData] = useState<RRIResponse | null>(null);
  const [profile, setProfile] = useState<AgniveerProfile | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);

  const formatDate = (dateString: string | Date | null) => {
    if (!dateString) return 'N/A';
    const d = new Date(dateString);
    return `${d.getDate().toString().padStart(2, '0')}-${(d.getMonth() + 1).toString().padStart(2, '0')}-${d.getFullYear()}`;
  };

  // Fetch RRI & Messages with Polling
  useEffect(() => {
    const fetchRRI = async () => {
      if (!user.agniveer_id) return;
      try {
        setLoading(true);
        const rriRes = await fetch(`http://localhost:8000/api/rri/${user.agniveer_id}`);
        if (rriRes.ok) setRriData(await rriRes.json());
      } catch (e) {
        console.error("Failed to fetch RRI", e);
      } finally {
        setLoading(false);
      }
    };

    const fetchProfile = async () => {
      if (!user.agniveer_id) return;
      try {
        const res = await fetch(`http://localhost:8000/api/agniveers/${user.agniveer_id}`);
        if (res.ok) setProfile(await res.json());
      } catch (e) { console.error("Failed to fetch profile", e); }
    };

    const fetchMessages = async () => {
      if (!user.agniveer_id) return;
      try {
        const msgRes = await fetch(`http://localhost:8000/api/messages/${user.agniveer_id}`);
        if (msgRes.ok) {
          setMessages(await msgRes.json());
        }
      } catch (e) { console.error("Failed to fetch messages", e); }
    };

    fetchProfile();
    fetchRRI();
    fetchMessages();

    // Poll messages every 5 seconds
    const interval = setInterval(fetchMessages, 5000);
    return () => clearInterval(interval);
  }, [user.agniveer_id]);

  const radarData = rriData ? [
    { subject: 'Firing', A: rriData.technical.breakdown.firing || 0, fullMark: 100 },
    { subject: 'Weapon', A: rriData.technical.breakdown.weapon || 0, fullMark: 100 },
    { subject: 'Tactical', A: rriData.technical.breakdown.tactical || 0, fullMark: 100 },
    { subject: 'Cognitive', A: rriData.technical.breakdown.cognitive || 0, fullMark: 100 },
    { subject: 'Behavioral', A: rriData.behavioral.total_score || 0, fullMark: 100 },
  ] : [];

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!suggestion.trim() || !user.agniveer_id) return;

    try {
      const res = await fetch('http://localhost:8000/api/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          agniveer_id: user.agniveer_id,
          sender_role: 'AGNIVEER',
          recipient_role: recipient,
          content: suggestion
        })
      });

      if (res.ok) {
        setMessageStatus('Message sent.');
        setSuggestion('');
        // fetchMessages will pick it up, but we can optimistically update or just manually fetch once
        const newMsg = await res.json();
        setMessages(prev => [...prev, newMsg]);
        setTimeout(() => setMessageStatus(null), 3000);
      } else {
        setMessageStatus('Failed to send.');
      }
    } catch (e) {
      console.error(e);
      setMessageStatus('Network Error');
    }
  };

  // Badge Counts & Read Status
  const [lastRead, setLastRead] = useState<{ [key: string]: number }>({ COY_CDR: 0, CO: 0 });

  useEffect(() => {
    // Load read counts from local storage on mount
    const saved = localStorage.getItem('lastReadCounts');
    if (saved) setLastRead(JSON.parse(saved));
  }, []);

  useEffect(() => {
    // When switching recipients, update read count to max
    if (recipient === 'COY_CDR') {
      const currentTotal = messages.filter(m => m.sender_role === 'COY_CDR').length;
      setLastRead(prev => {
        const newState = { ...prev, COY_CDR: currentTotal };
        localStorage.setItem('lastReadCounts', JSON.stringify(newState));
        return newState;
      });
    } else if (recipient === 'CO') {
      const currentTotal = messages.filter(m => m.sender_role === 'CO').length;
      setLastRead(prev => {
        const newState = { ...prev, CO: currentTotal };
        localStorage.setItem('lastReadCounts', JSON.stringify(newState));
        return newState;
      });
    }
  }, [recipient, messages.length]); // Dependencies: updates when we open tag or new msg arrives while open

  const coyTotal = messages.filter(m => m.sender_role === 'COY_CDR').length;
  const bnTotal = messages.filter(m => m.sender_role === 'CO').length;

  // Badge = Total - LastRead (If active tab, it should be 0 because effect above updates it instantly)
  const coyBadge = recipient === 'COY_CDR' ? 0 : Math.max(0, coyTotal - (lastRead.COY_CDR || 0));
  const bnBadge = recipient === 'CO' ? 0 : Math.max(0, bnTotal - (lastRead.CO || 0));

  // Hidden retention band color logic - always return neutral
  const getHeaderColor = () => 'bg-stone-700';

  // Helper for Recommendations (kept for potential future use, though not displayed in current layout)
  const getRecommendation = (data: RRIResponse | null) => {
    if (!data) return { text: "Complete your initial assessments to get insights.", target: "N/A" };
    if (data.retention_band === 'GREEN') {
      return { text: "Maintain current physical and technical standards. Focus on leadership roles.", target: "Maintain > 80 RRI" };
    } else if (data.retention_band === 'AMBER') {
      // Find weakest link
      const tech = data.technical.total_score;
      const behav = data.behavioral.total_score;
      if (tech < behav) return { text: "Focus on Technical Skills (Firing & Weapon Handling).", target: "Target > 75 Technical" };
      return { text: "Focus on Behavioral Competencies (Initiative & Team Spirit).", target: "Target > 8.0 Behavioral" };
    } else {
      return { text: "Urgent improvement needed in all sectors. Consult Cdr immediately.", target: "Target > 65 RRI" };
    }
  };

  const recommendation = getRecommendation(rriData);

  if (loading) return <div className="p-10 text-center text-stone-500 font-bold">Loading Profile...</div>;

  return (
    <div className="space-y-6">
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-stone-800">Agniveer Portal: {profile?.name || user.name}</h1>
          <p className="text-stone-500">Service ID: {profile?.service_id || user.agniveer_id} • {profile?.company || 'Unknown Unit'} • Rank: {profile?.rank || 'Agniveer'}</p>
        </div>
        <div className={`px-6 py-3 rounded-xl shadow-md flex items-center space-x-4 bg-stone-700 text-white`}>
          <div className="text-center px-4">
            <span className="text-3xl font-black">{rriData?.rri_score || 0}</span>
            <span className="text-xs block opacity-80 uppercase tracking-widest font-bold">RRI Score</span>
          </div>
        </div>
      </header>

      {rriData ? (
        <>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* 1. Radar Chart */}
            <div className="bg-white p-6 rounded-xl shadow-sm border border-stone-100">
              <h3 className="font-bold text-stone-700 mb-4">Competency Quadrants</h3>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <RadarChart cx="50%" cy="50%" outerRadius="80%" data={radarData}>
                    <PolarGrid stroke="#e5e7eb" />
                    <PolarAngleAxis dataKey="subject" tick={{ fontSize: 10, fill: '#6b7280' }} />
                    <PolarRadiusAxis angle={30} domain={[0, 100]} tick={false} axisLine={false} />
                    <Radar name="Agniveer" dataKey="A" stroke="#14b8a6" fill="#14b8a6" fillOpacity={0.6} />
                  </RadarChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* 2. Detailed Scores */}
            <div className="bg-white p-6 rounded-xl shadow-sm border border-stone-100 overflow-hidden">
              <h3 className="font-bold text-stone-700 mb-4 flex items-center space-x-2">
                <svg className="w-5 h-5 text-teal-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                <span>Performance Overview</span>
              </h3>
              <div className="overflow-y-auto max-h-[240px]">
                <table className="w-full text-xs text-left">
                  <thead className="sticky top-0 bg-white border-b border-stone-100 text-stone-400">
                    <tr>
                      <th className="pb-2 font-bold uppercase tracking-tighter">Component</th>
                      <th className="pb-2 font-bold uppercase tracking-tighter text-right">Score</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-stone-50">
                    {Object.entries(rriData.technical.breakdown).map(([k, v]) => (
                      <tr key={k} className="hover:bg-stone-50 transition-colors">
                        <td className="py-3 font-semibold text-stone-800 capitalize">{k} (Tech)</td>
                        <td className="py-3 text-right font-black text-teal-700">{Number(v).toFixed(2)}</td>
                      </tr>
                    ))}
                    <tr className="hover:bg-stone-50 transition-colors">
                      <td className="py-3 font-semibold text-stone-800 capitalize">Behavioral Agg.</td>
                      <td className="py-3 text-right font-black text-teal-700">{rriData.behavioral.total_score.toFixed(2)}</td>
                    </tr>
                    <tr className="hover:bg-stone-50 transition-colors">
                      <td className="py-3 font-semibold text-stone-800 capitalize">Achievements</td>
                      <td className="py-3 text-right font-black text-teal-700">{(rriData.achievement?.total_score || 0).toFixed(2)}</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>

            {/* 3. Performance & Targets (Restored & Neutralized) */}
            <div className="bg-stone-800 p-6 rounded-xl shadow-xl text-white flex flex-col justify-between">
              <div>
                <h3 className="font-bold mb-4 flex items-center space-x-2">
                  <svg className="w-5 h-5 text-orange-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
                  <span>Targets & Growth</span>
                </h3>
                <div className="text-center py-2">
                  <p className="text-sm text-stone-400 mb-1">Performance Status</p>
                  <span className="text-2xl font-black text-teal-100">
                    {rriData.rri_score >= 70 ? 'SATISFACTORY' : 'NEEDS IMPROVEMENT'}
                  </span>
                </div>
              </div>

              <div className="bg-stone-700/50 p-4 rounded-lg border border-stone-600 space-y-2">
                <p className="text-xs font-bold text-stone-400 uppercase tracking-widest">Recommendation</p>
                <p className="text-sm font-medium text-white">{recommendation.text}</p>
                <div className="flex justify-between items-center pt-2 border-t border-stone-600 mt-2">
                  <span className="text-xs text-stone-400">Goal</span>
                  <span className="text-xs font-bold text-teal-300 bg-teal-900/50 px-2 py-1 rounded">{recommendation.target}</span>
                </div>
              </div>

              <div className="mt-4">
                <p className="text-xs font-bold text-stone-400 uppercase tracking-widest mb-2">Upcoming Assessment</p>
                <div className="flex justify-between text-xs bg-stone-900/30 p-2 rounded">
                  <span>Annual Technical Review</span>
                  <span className="text-orange-300 font-mono">15-10-2026</span>
                </div>
              </div>
            </div>
          </div>
        </>
      ) : (
        <div className="p-10 text-center bg-stone-100 rounded-lg border-dashed border-2 border-stone-300">
          <p className="text-stone-500 font-bold">No RRI Assessment Data Available.</p>
        </div>
      )}

      {/* Messaging Section - Unified Chat Console */}
      <div className="bg-white rounded-xl shadow-lg border border-stone-200 overflow-hidden flex flex-col md:flex-row h-[600px] mt-6">

        {/* 1. Sidebar (Contacts) */}
        <div className="w-full md:w-1/3 bg-stone-50 border-r border-stone-200 flex flex-col">
          <div className="p-4 border-b border-stone-200 bg-white">
            <h3 className="font-bold text-stone-700 flex items-center space-x-2">
              <svg className="w-5 h-5 text-teal-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 8h2a2 2 0 012 2v6a2 2 0 01-2 2h-2v4l-4-4H9a1.994 1.994 0 01-1.414-.586m0 0L11 14h4a2 2 0 002-2V6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2v4l.586-.586z" /></svg>
              <span>Command Channels</span>
            </h3>
          </div>
          <div className="flex-1 overflow-y-auto p-2 space-y-2">
            {/* Contact: Company Commander */}
            <button
              onClick={() => { setRecipient('COY_CDR'); setHistoryTab('COY_CDR'); }}
              className={`w-full text-left p-3 rounded-lg flex items-center justify-between transition-all ${recipient === 'COY_CDR' ? 'bg-white shadow-md border border-teal-100 ring-1 ring-teal-500' : 'hover:bg-stone-200 border border-transparent'}`}
            >
              <div className="flex items-center space-x-3">
                <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-white shadow-sm ${recipient === 'COY_CDR' ? 'bg-teal-600' : 'bg-stone-400'}`}>CC</div>
                <div>
                  <p className={`text-sm font-bold ${recipient === 'COY_CDR' ? 'text-teal-900' : 'text-stone-600'}`}>Company Cdr</p>
                  <p className="text-[10px] text-stone-400">Direct Senior</p>
                </div>
              </div>
              {coyBadge > 0 && <span className="bg-red-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-full shadow-sm">{coyBadge}</span>}
            </button>

            {/* Contact: Battalion Commander */}
            <button
              onClick={() => { setRecipient('CO'); setHistoryTab('CO'); }}
              className={`w-full text-left p-3 rounded-lg flex items-center justify-between transition-all ${recipient === 'CO' ? 'bg-white shadow-md border border-teal-100 ring-1 ring-teal-500' : 'hover:bg-stone-200 border border-transparent'}`}
            >
              <div className="flex items-center space-x-3">
                <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-white shadow-sm ${recipient === 'CO' ? 'bg-teal-600' : 'bg-stone-400'}`}>BC</div>
                <div>
                  <p className={`text-sm font-bold ${recipient === 'CO' ? 'text-teal-900' : 'text-stone-600'}`}>Battalion Cdr</p>
                  <p className="text-[10px] text-stone-400">Unit Head</p>
                </div>
              </div>
              {bnBadge > 0 && <span className="bg-red-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-full shadow-sm">{bnBadge}</span>}
            </button>
          </div>
        </div>

        {/* 2. Main Chat Area */}
        <div className="flex-1 flex flex-col bg-stone-100/50 backdrop-blur-sm relative">
          {/* Chat Header */}
          <div className="p-4 bg-white border-b border-stone-200 shadow-sm flex justify-between items-center z-10">
            <div className="flex items-center space-x-3">
              <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></div>
              <div>
                <h3 className="font-bold text-stone-800">{recipient === 'COY_CDR' ? 'Company Commander' : 'Battalion Commander'}</h3>
                <p className="text-[10px] text-stone-500 uppercase tracking-widest font-semibold">Official Secure Line</p>
              </div>
            </div>
            <span className="text-[10px] text-stone-400">Encrypted • Kaushal Setu Network</span>
          </div>

          {/* Messages Stream */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4 custom-scrollbar bg-[url('https://www.transparenttextures.com/patterns/cubes.png')]">
            {messages.filter(m =>
              (recipient === 'COY_CDR' && (m.sender_role === 'COY_CDR' || (m.sender_role === 'AGNIVEER' && m.recipient_role === 'COY_CDR'))) ||
              (recipient === 'CO' && (m.sender_role === 'CO' || (m.sender_role === 'AGNIVEER' && m.recipient_role === 'CO')))
            ).length === 0 && (
                <div className="flex flex-col items-center justify-center h-full opacity-40">
                  <svg className="w-16 h-16 text-stone-300 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" /></svg>
                  <p className="text-sm font-bold text-stone-400">Start a conversation</p>
                </div>
              )}

            {messages.filter(m =>
              (recipient === 'COY_CDR' && (m.sender_role === 'COY_CDR' || (m.sender_role === 'AGNIVEER' && m.recipient_role === 'COY_CDR'))) ||
              (recipient === 'CO' && (m.sender_role === 'CO' || (m.sender_role === 'AGNIVEER' && m.recipient_role === 'CO')))
            ).map((msg) => {
              const isMe = msg.sender_role === 'AGNIVEER';
              return (
                <div key={msg.id} className={`flex w-full ${isMe ? 'justify-end' : 'justify-start'}`}>
                  <div className={`max-w-[70%] flex flex-col ${isMe ? 'items-end' : 'items-start'}`}>
                    <div className={`p-3 rounded-2xl shadow-sm text-sm ${isMe ? 'bg-teal-600 text-white rounded-tr-none' : 'bg-white text-stone-700 border border-stone-200 rounded-tl-none'}`}>
                      <p>{msg.content}</p>
                    </div>
                    <span className="text-[10px] text-stone-400 mt-1 px-1">{formatDate(msg.timestamp)} {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Input Area */}
          <div className="p-4 bg-white border-t border-stone-200">
            <form onSubmit={handleSendMessage} className="flex items-end space-x-2">
              <textarea
                value={suggestion}
                onChange={(e) => setSuggestion(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    handleSendMessage(e);
                  }
                }}
                placeholder="Type your message..."
                className="flex-1 bg-stone-50 border border-stone-200 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-teal-500 focus:border-teal-500 outline-none resize-none h-[50px] custom-scrollbar"
              ></textarea>
              <button
                type="submit"
                disabled={!suggestion.trim()}
                className="bg-teal-600 hover:bg-teal-700 disabled:bg-stone-300 disabled:cursor-not-allowed text-white p-3 rounded-xl shadow-md transition-all flex items-center justify-center"
              >
                <svg className="w-5 h-5 transform rotate-90" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" /></svg>
              </button>
            </form>
            {messageStatus && <p className="text-[10px] text-teal-600 mt-1 text-center font-bold animate-pulse">{messageStatus}</p>}
          </div>
        </div>

      </div>


    </div>
  );
};


export default AgniveerDashboard;
