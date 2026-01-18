import React, { useState, useEffect } from 'react';
import { formatDate } from './utils';
import { User, AgniveerProfile } from '../types';
import { Radar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, ResponsiveContainer } from 'recharts';
import { Calendar, Clock, Activity, Shield, BookOpen, Heart, DollarSign, Bell, Award, Target, TrendingUp, AlertTriangle, CheckCircle, FileText, ChevronRight, Zap } from 'lucide-react';
import { API_BASE_URL } from '../config';

interface RRIResponse {
  rri_score: number;
  retention_band: string;
  technical: {
    breakdown: { firing: number; weapon: number; tactical: number; cognitive: number; };
    total_score: number;
  };
}

const AgniveerDashboard: React.FC<{ user: User }> = ({ user }) => {
  const [profile, setProfile] = useState<AgniveerProfile | null>(null);
  const [rriData, setRriData] = useState<RRIResponse | null>(null);
  const [leaves, setLeaves] = useState<any[]>([]);
  const [grievances, setGrievances] = useState<any[]>([]);

  // Language State
  const [lang, setLang] = useState<'en' | 'hi'>('en');

  // Translation Dictionary
  const t = {
    en: {
      portalTitle: "Agniveer Portal",
      welcome: "Welcome",
      myStatus: "My Status",
      rriScore: "RRI Score",
      retentionBand: "Retention Band",
      techPerf: "Technical Performance",
      nextAssessment: "Next Assessment",
      trainingSchedule: "Training Schedule",
      skillDev: "Skill Development",
      requestCourse: "Request New Course (Coming Soon)",
      leaveStatus: "Leave Status",
      apply: "Apply",
      applyForLeave: "Apply for Leave",
      annual: "Annual",
      balance: "Balance",
      recentRequests: "Recent Requests",
      noLeaves: "No recent leaves.",
      grievancePortal: "Grievance Portal",
      fileGrievance: "Submit Grievance",
      healthFitness: "Health & Fitness",
      medCategory: "Medical Category",
      vaccination: "Vaccination",
      upToDate: "Up to Date",
      upcomingEvent: "Upcoming",
      paySlip: "Pay & Allowances",
      comingSoon: "Coming Soon",
      secureAccess: "Secure access to monthly pay slips.",
      cancel: "Cancel",
      submitApp: "Submit",
      submitGriev: "Submit",
      startDate: "Start Date",
      endDate: "End Date",
      reason: "Reason",
      addressedTo: "Addressed To",
      category: "Category",
      desc: "Description",
      descPlaceholder: "Describe your grievance in detail...",
      quickActions: "Quick Actions",
      viewAll: "View All",
      days: "Days",
      batch: "Batch",
      dob: "DOB",
      editInfo: "Edit Emergency Info",
      other: "Other",
    },
    hi: {
      portalTitle: "अग्निवीर पोर्टल",
      welcome: "स्वागत है",
      myStatus: "मेरी स्थिति",
      rriScore: "RRI स्कोर",
      retentionBand: "रिटेंशन बैंड",
      techPerf: "तकनीकी प्रदर्शन",
      nextAssessment: "अगला मूल्यांकन",
      trainingSchedule: "प्रशिक्षण अनुसूची",
      skillDev: "कौशल विकास",
      requestCourse: "नए कोर्स का अनुरोध (जल्द आ रहा है)",
      leaveStatus: "छुट्टी की स्थिति",
      apply: "आवेदन करें",
      applyForLeave: "छुट्टी के लिए आवेदन",
      annual: "वार्षिक",
      balance: "शेष",
      recentRequests: "हाल के अनुरोध",
      noLeaves: "कोई हालिया छुट्टी नहीं।",
      grievancePortal: "शिकायत निवारण",
      fileGrievance: "शिकायत जमा करें",
      healthFitness: "स्वास्थ्य और फिटनेस",
      medCategory: "चिकित्सा श्रेणी",
      vaccination: "टीकाकरण",
      upToDate: "अद्यतन",
      upcomingEvent: "आगामी",
      paySlip: "वेतन और भत्ते",
      comingSoon: "जल्द आ रहा है",
      secureAccess: "मासिक वेतन पर्ची तक सुरक्षित पहुंच।",
      cancel: "रद्द करें",
      submitApp: "जमा करें",
      submitGriev: "जमा करें",
      startDate: "आरंभ तिथि",
      endDate: "अंतिम तिथि",
      reason: "कारण",
      addressedTo: "किसको",
      category: "श्रेणी",
      desc: "विवरण",
      descPlaceholder: "अपनी शिकायत का विस्तार से वर्णन करें...",
      quickActions: "त्वरित कार्रवाई",
      viewAll: "सभी देखें",
      days: "दिन",
      batch: "बैच",
      dob: "जन्म तिथि",
      editInfo: "आपातकालीन जानकारी बदलें",
      other: "अन्य",
    }
  };

  // UI State
  const [showLeaveModal, setShowLeaveModal] = useState(false);
  const [showGrievanceModal, setShowGrievanceModal] = useState(false);
  const [expandedLeaveId, setExpandedLeaveId] = useState<number | null>(null);
  const [expandedGrievanceId, setExpandedGrievanceId] = useState<number | null>(null);

  // Forms
  const [leaveForm, setLeaveForm] = useState({ type: 'CASUAL', start_date: '', end_date: '', reason: '' });
  const [grievanceForm, setGrievanceForm] = useState({ type: 'ADMIN', addressed_to: 'CO', description: '' });

  // Leave Logic Helpers
  const calculateDays = (start: string, end: string) => {
    const s = new Date(start);
    const e = new Date(end);
    const diffTime = Math.abs(e.getTime() - s.getTime());
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
  };

  const getUsedLeaves = () => {
    return leaves
      .filter(l => l.status === 'APPROVED' || l.status === 'PENDING')
      .reduce((acc, l) => acc + calculateDays(l.start_date, l.end_date), 0);
  };

  const daysUsed = getUsedLeaves();
  const daysRemaining = 30 - daysUsed;

  useEffect(() => {
    fetchProfile();
    fetchRRI();
    fetchLeaves();
    fetchGrievances();
  }, [user.agniveer_id]);

  const fetchProfile = async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/api/agniveers/${user.agniveer_id}`);
      if (res.ok) setProfile(await res.json());
    } catch (e) { console.error(e); }
  };

  const fetchRRI = async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/api/rri/${user.agniveer_id}`);
      if (res.ok) setRriData(await res.json());
    } catch (e) { console.error(e); }
  };

  const fetchLeaves = async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/api/leave/${user.agniveer_id}`);
      if (res.ok) setLeaves(await res.json());
    } catch (e) { console.error(e); }
  };

  const fetchGrievances = async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/api/grievance/${user.agniveer_id}`);
      if (res.ok) setGrievances(await res.json());
    } catch (e) { console.error(e); }
  };

  const submitLeave = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validation
    const duration = calculateDays(leaveForm.start_date, leaveForm.end_date);

    if (duration > 30) {
      alert("Maximum leave duration cannot exceed 30 days.");
      return;
    }

    if (duration > daysRemaining) {
      alert(`Insufficient leave balance. You only have ${daysRemaining} days remaining.`);
      return;
    }

    try {
      const res = await fetch(`${API_BASE_URL}/api/leave/apply`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          agniveer_id: user.agniveer_id,
          leave_type: leaveForm.type,
          start_date: leaveForm.start_date,
          end_date: leaveForm.end_date,
          reason: leaveForm.reason
        })
      });
      if (res.ok) {
        alert(lang === 'en' ? "Leave Applied!" : "छुट्टी लागू की गई!");
        setShowLeaveModal(false);
        fetchLeaves();
      } else {
        const errData = await res.json();
        console.error("Leave Error:", errData);
        alert(`Failed to apply leave: ${errData.detail || 'Unknown error'}`);
      }
    } catch (e) {
      console.error(e);
      alert("Failed to apply leave: Network Error");
    }
  };

  const submitGrievance = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const payload = { ...grievanceForm, agniveer_id: user.agniveer_id };
      console.log("Submitting Grievance Payload:", payload); // DEBUG

      const res = await fetch(`${API_BASE_URL}/api/grievance/submit`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      if (res.ok) {
        alert(lang === 'en' ? "Grievance Submitted!" : "शिकायत जमा की गई!");
        setShowGrievanceModal(false);
        fetchGrievances();
      } else {
        const errData = await res.json();
        console.error("Grievance Error:", errData);
        alert(`Failed to submit grievance: ${errData.detail || 'Unknown error'}`);
      }
    } catch (e) {
      console.error(e);
      alert("Failed to submit grievance: Network Error");
    }
  };

  const cancelLeave = async (leaveId: number) => {
    if (!confirm(lang === 'en' ? "Are you sure you want to cancel this request?" : "क्या आप सुनिश्चित हैं कि आप इस अनुरोध को रद्द करना चाहते हैं?")) return;

    try {
      const res = await fetch(`${API_BASE_URL}/api/leave/cancel/${leaveId}`, {
        method: 'DELETE',
      });
      if (res.ok) {
        alert(lang === 'en' ? "Request Cancelled" : "अनुरोध रद्द किया गया");
        setExpandedLeaveId(null);
        fetchLeaves();
      } else {
        const err = await res.json();
        alert(`Error: ${err.detail}`);
      }
    } catch (e) { console.error(e); alert("Network Error"); }
  };

  const radarData = rriData ? [
    { subject: lang === 'en' ? 'Firing' : 'फायरिंग', A: rriData.technical.breakdown.firing || 0, fullMark: 100 },
    { subject: lang === 'en' ? 'Weapon' : 'हथियार', A: rriData.technical.breakdown.weapon || 0, fullMark: 100 },
    { subject: lang === 'en' ? 'Tactical' : 'रणनीतिक', A: rriData.technical.breakdown.tactical || 0, fullMark: 100 },
    { subject: lang === 'en' ? 'Cognitive' : 'मानसिक', A: rriData.technical.breakdown.cognitive || 0, fullMark: 100 },
  ] : [];

  const bandColor = 'text-stone-700';
  const bandBg = 'bg-stone-100';

  return (
    <div className="space-y-6 pb-16">
      {/* Header Bar - PC Optimized */}
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-stone-800">{t[lang].portalTitle}</h1>
          <p className="text-stone-500">{t[lang].welcome}, {profile?.name || user.name}</p>
        </div>
        <div className="flex items-center gap-4">
          <div className="flex bg-stone-200 p-1 rounded-lg">
            <button onClick={() => setLang('en')} className={`px-4 py-1.5 text-xs font-bold rounded-md transition-all ${lang === 'en' ? 'bg-white shadow text-teal-700' : 'text-stone-500'}`}>English</button>
            <button onClick={() => setLang('hi')} className={`px-4 py-1.5 text-xs font-bold rounded-md transition-all ${lang === 'hi' ? 'bg-white shadow text-orange-600' : 'text-stone-500'}`}>हिंदी</button>
          </div>
        </div>
      </header>

      {/* Main Grid: Command Hub Style */}
      <div className="grid grid-cols-3 gap-6">

        {/* Left Column: Profile & RRI Card */}
        <div className="col-span-1 space-y-6">
          {/* Profile Card */}
          <div className="bg-gradient-to-br from-stone-900 to-stone-800 rounded-2xl p-6 text-white shadow-xl relative overflow-hidden group">
            <div className="absolute top-0 right-0 w-32 h-32 bg-teal-500/20 rounded-full -mr-10 -mt-10 blur-xl group-hover:bg-teal-500/30 transition-all duration-700"></div>
            <div className="relative z-10 flex flex-col items-center text-center">
              <div className="w-20 h-20 bg-stone-700 rounded-full mb-4 overflow-hidden border-4 border-stone-600 shadow-md">
                <img src={profile?.photo_url || "https://upload.wikimedia.org/wikipedia/commons/2/2c/Default_pfp.svg"} alt="Profile" className="w-full h-full object-cover" />
              </div>
              <h2 className="text-xl font-bold">{profile?.name || user.name}</h2>
              <p className="text-sm text-stone-400 font-mono mb-3">{profile?.service_id || user.agniveer_id}</p>
              <span className={`px-3 py-1 ${bandBg} ${bandColor} text-xs font-bold rounded-full`}>
                {profile?.rank || 'Agniveer'}
              </span>
              <div className="w-full grid grid-cols-2 gap-3 mt-6 text-left text-xs">
                <div className="p-2 bg-white/5 rounded-lg">
                  <span className="block text-stone-500">{t[lang].batch}</span>
                  <span className="font-bold text-white">{profile?.batch_no || 'N/A'}</span>
                </div>
                <div className="p-2 bg-white/5 rounded-lg">
                  <span className="block text-stone-500">{t[lang].dob}</span>
                  <span className="font-bold text-white">{formatDate(profile?.dob)}</span>
                </div>
              </div>
            </div>
          </div>

          {/* RRI Score Card */}
          <div className="bg-white rounded-2xl shadow-md border border-stone-200 p-5">
            <div className="flex justify-between items-center mb-4">
              <h3 className="font-bold text-stone-700 flex items-center gap-2"><Target size={16} className="text-teal-600" /> {t[lang].myStatus}</h3>
            </div>
            <div className="flex items-baseline space-x-2">
              <span className={`text-5xl font-black ${bandColor}`}>{rriData?.rri_score || 0}</span>
              <span className="text-sm text-stone-400">/ 100</span>
            </div>
            <p className="text-xs text-stone-500 mt-2">{t[lang].rriScore}</p>
          </div>
        </div>

        {/* Middle Column: Technical Performance */}
        <div className="col-span-1 space-y-6">
          <div className="bg-white rounded-2xl shadow-md border border-stone-200 p-5 h-full flex flex-col">
            <div className="flex justify-between items-center mb-4">
              <h3 className="font-bold text-stone-700 flex items-center gap-2"><Activity size={16} className="text-teal-600" /> {t[lang].techPerf}</h3>
              <span className="text-xs font-bold text-orange-500 bg-orange-50 px-2 py-1 rounded">{t[lang].nextAssessment}: Feb 15</span>
            </div>
            <div className="flex-1 min-h-[200px]">
              <ResponsiveContainer width="100%" height="100%">
                <RadarChart cx="50%" cy="50%" outerRadius="70%" data={radarData}>
                  <PolarGrid stroke="#e5e7eb" />
                  <PolarAngleAxis dataKey="subject" tick={{ fontSize: 11, fill: '#6b7280' }} />
                  <PolarRadiusAxis angle={30} domain={[0, 100]} tick={false} axisLine={false} />
                  <Radar name="Agniveer" dataKey="A" stroke="#14b8a6" fill="#14b8a6" fillOpacity={0.5} />
                </RadarChart>
              </ResponsiveContainer>
            </div>
            <div className="space-y-2 mt-4 border-t border-stone-100 pt-4">
              {radarData.map(item => (
                <div key={item.subject} className="flex justify-between items-center text-xs">
                  <span className="font-bold text-stone-600">{item.subject}</span>
                  <div className="flex items-center gap-2">
                    <div className="w-20 h-1.5 bg-stone-200 rounded-full overflow-hidden">
                      <div className="h-full bg-teal-500" style={{ width: `${item.A}%` }}></div>
                    </div>
                    <span className="font-black text-stone-800 w-6 text-right">{item.A}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right Column: Quick Actions & Info */}
        <div className="col-span-1 space-y-6">
          {/* Quick Actions Widget */}
          <div className="bg-white rounded-2xl shadow-md border border-stone-200 overflow-hidden">
            <div className="p-4 bg-stone-50 border-b border-stone-100 flex justify-between items-center">
              <h3 className="font-bold text-stone-800 flex items-center gap-2"><Zap className="text-orange-500" size={16} /> {t[lang].quickActions}</h3>
            </div>
            <div className="p-3 space-y-2">
              <button onClick={() => setShowLeaveModal(true)} className="w-full flex items-center justify-between p-3 bg-white hover:bg-stone-50 border border-stone-100 rounded-xl transition-colors group">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-green-100 text-green-600 rounded-full"><Clock size={14} /></div>
                  <span className="text-sm font-bold text-stone-700">{t[lang].applyForLeave}</span>
                </div>
                <ChevronRight size={14} className="text-stone-400 group-hover:text-stone-600" />
              </button>
              <button onClick={() => setShowGrievanceModal(true)} className="w-full flex items-center justify-between p-3 bg-white hover:bg-stone-50 border border-stone-100 rounded-xl transition-colors group">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-red-100 text-red-600 rounded-full"><Shield size={14} /></div>
                  <span className="text-sm font-bold text-stone-700">{t[lang].fileGrievance}</span>
                </div>
                <ChevronRight size={14} className="text-stone-400 group-hover:text-stone-600" />
              </button>
              <button className="w-full flex items-center justify-between p-3 bg-white hover:bg-stone-50 border border-stone-100 rounded-xl transition-colors group">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-purple-100 text-purple-600 rounded-full"><BookOpen size={14} /></div>
                  <span className="text-sm font-bold text-stone-700">{t[lang].requestCourse}</span>
                </div>
                <ChevronRight size={14} className="text-stone-400 group-hover:text-stone-600" />
              </button>
            </div>
          </div>

          {/* Upcoming Events */}
          <div className="bg-white rounded-2xl shadow-md border border-stone-200 p-5">
            <h3 className="font-bold text-stone-700 flex items-center gap-2 mb-4"><Calendar size={16} className="text-blue-600" /> {t[lang].trainingSchedule}</h3>
            <div className="space-y-3">
              {profile?.upcoming_tests && profile.upcoming_tests.length > 0 ? (
                profile.upcoming_tests.map((test, i) => {
                  const date = new Date(test.scheduled_date);
                  return (
                    <div key={i} className="flex gap-3 items-center">
                      <div className="w-12 text-center bg-blue-50 text-blue-700 rounded-lg py-1.5">
                        <span className="block text-xs font-bold">{date.getDate()}</span>
                        <span className="block text-[10px] uppercase">{date.toLocaleString('default', { month: 'short' })}</span>
                      </div>
                      <div>
                        <p className="text-sm font-bold text-stone-700">{test.name}</p>
                        <span className="text-[10px] font-bold text-stone-400 bg-stone-100 px-1.5 rounded">{test.test_type}</span>
                      </div>
                    </div>
                  );
                })
              ) : (
                <div className="text-stone-400 text-sm text-center py-2">No upcoming training scheduled.</div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Bottom Row: Leave, Grievance Status, Health, Pay */}
      <div className="grid grid-cols-4 gap-6">
        {/* Leave Status */}
        <div className="bg-white rounded-2xl shadow-md border border-stone-200 p-5">
          <div className="flex justify-between items-center mb-4">
            <h3 className="font-bold text-stone-700 flex items-center gap-2"><Clock size={16} className="text-green-600" /> {t[lang].leaveStatus}</h3>
          </div>
          <div className="flex gap-3 mb-4">
            <div className="flex-1 p-3 bg-green-50 rounded-xl text-center">
              <span className="block text-2xl font-black text-green-700">30</span>
              <span className="text-[10px] text-green-600 font-bold">{t[lang].annual}</span>
            </div>
            <div className="flex-1 p-3 bg-stone-100 rounded-xl text-center">
              <span className={`block text-2xl font-black ${daysRemaining < 5 ? 'text-red-500' : 'text-stone-700'}`}>{daysRemaining}</span>
              <span className="text-[10px] text-stone-500 font-bold">{t[lang].balance}</span>
            </div>
          </div>
          <p className="text-[10px] font-bold text-stone-400 uppercase mb-2">{t[lang].recentRequests}</p>
          {leaves.length === 0 ? <p className="text-xs text-stone-400 italic">{t[lang].noLeaves}</p> :
            leaves.slice(0, 3).map(l => (
              <div
                key={l.id}
                onClick={() => setExpandedLeaveId(expandedLeaveId === l.id ? null : l.id)}
                className={`text-xs p-3 bg-stone-50 rounded-lg mb-2 cursor-pointer transition-all border ${expandedLeaveId === l.id ? 'border-teal-500 shadow-sm' : 'border-transparent hover:bg-stone-100'}`}
              >
                <div className="flex justify-between items-center">
                  <div>
                    <span className="font-bold text-stone-700 block">{formatDate(l.start_date)} - {formatDate(l.end_date)}</span>
                  </div>
                  <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${l.status === 'APPROVED' ? 'bg-green-100 text-green-700' : l.status === 'REJECTED' ? 'bg-red-100 text-red-700' : 'bg-yellow-100 text-yellow-700'}`}>
                    {l.status}
                  </span>
                </div>

                {/* Expandable Details */}
                {expandedLeaveId === l.id && (
                  <div className="mt-3 pt-2 border-t border-stone-200 text-[10px] text-stone-500 animate-in slide-in-from-top-1">
                    <div className="flex justify-between mb-1">
                      <span className="font-bold">Duration:</span>
                      <span>{calculateDays(l.start_date, l.end_date)} Days</span>
                    </div>
                    <div>
                      <span className="font-bold block mb-0.5">Reason:</span>
                      <p className="italic leading-relaxed">{l.reason || "No reason provided"}</p>
                    </div>

                    {l.status === 'PENDING' && (
                      <div className="mt-2 text-right">
                        <button
                          onClick={(e) => { e.stopPropagation(); cancelLeave(l.id); }}
                          className="px-3 py-1 bg-red-50 text-red-600 font-bold rounded-md hover:bg-red-100 transition text-[10px]"
                        >
                          {t[lang].cancel || "Cancel Request"}
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </div>
            ))
          }
        </div>

        {/* Grievance Status */}
        <div className="bg-white rounded-2xl shadow-md border border-stone-200 p-5">
          <h3 className="font-bold text-stone-700 flex items-center gap-2 mb-4"><Shield size={16} className="text-red-600" /> {t[lang].grievancePortal}</h3>
          {grievances.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-24 text-stone-400">
              <CheckCircle size={24} className="mb-2 text-green-500/50" />
              <p className="text-xs">No pending grievances.</p>
            </div>
          ) : (
            grievances.slice(0, 3).map(g => (
              <div
                key={g.id}
                onClick={() => setExpandedGrievanceId(expandedGrievanceId === g.id ? null : g.id)}
                className={`text-xs p-3 bg-stone-50 rounded-lg mb-2 cursor-pointer transition-all border ${expandedGrievanceId === g.id ? 'border-red-400 shadow-sm' : 'border-transparent hover:bg-stone-100'}`}
              >
                <div className="flex justify-between items-center mb-1">
                  <span className="font-bold text-stone-700">{formatDate(g.submitted_at)}</span>
                  <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${g.status === 'RESOLVED' ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'}`}>
                    {g.status}
                  </span>
                </div>
                <div className="flex justify-between items-center text-[10px] text-stone-500">
                  <span>To: <span className="font-bold">{g.addressed_to}</span></span>
                  <span>Type: <span className="font-bold">{g.type}</span></span>
                </div>

                {/* Expandable Details */}
                {expandedGrievanceId === g.id && (
                  <div className="mt-3 pt-2 border-t border-stone-200 text-[10px] text-stone-600 animate-in slide-in-from-top-1">
                    <div className="mb-2">
                      <span className="font-bold block mb-0.5">Description:</span>
                      <p className="italic leading-relaxed bg-white p-2 rounded border border-stone-100">{g.description}</p>
                    </div>
                    {g.resolution_notes && (
                      <div className="bg-green-50 p-2 rounded border border-green-100">
                        <span className="font-bold block mb-0.5 text-green-800">Reply from Commander:</span>
                        <p className="text-green-700 leading-relaxed">{g.resolution_notes}</p>
                      </div>
                    )}
                    {!g.resolution_notes && (
                      <p className="text-stone-400 italic text-center py-1">-- No reply yet --</p>
                    )}
                  </div>
                )}
              </div>
            ))
          )}
        </div>

        {/* Health & Fitness */}
        <div className="bg-white rounded-2xl shadow-md border border-stone-200 p-5">
          <h3 className="font-bold text-stone-700 flex items-center gap-2 mb-4"><Heart size={16} className="text-pink-600" /> {t[lang].healthFitness}</h3>
          <div className="flex justify-between items-center mb-2">
            <span className="text-xs font-bold text-stone-500">{t[lang].medCategory}</span>
            <span className="text-sm font-black text-green-600 bg-green-50 px-2 py-1 rounded">SHAPE-1</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-xs font-bold text-stone-500">{t[lang].vaccination}</span>
            <span className="text-xs font-bold text-stone-400">{t[lang].upToDate}</span>
          </div>
        </div>

        {/* Pay Slip Placeholder */}
        <div className="bg-gradient-to-br from-stone-900 to-stone-800 rounded-2xl p-5 text-white flex flex-col justify-center">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-white/10 rounded-full"><DollarSign size={20} className="text-yellow-400" /></div>
            <div>
              <h3 className="font-bold">{t[lang].paySlip}</h3>
              <p className="text-xs text-stone-400">{t[lang].secureAccess}</p>
            </div>
          </div>
          <span className="px-3 py-1 bg-white/10 text-stone-300 text-xs font-bold rounded-full border border-white/10 self-start">{t[lang].comingSoon}</span>
        </div>
      </div>

      {/* MODALS */}
      {showLeaveModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl p-6 w-full max-w-md animate-in zoom-in-95">
            <h3 className="text-lg font-bold mb-4">{t[lang].applyForLeave}</h3>
            <form onSubmit={submitLeave} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-bold text-stone-500 block mb-1">{t[lang].startDate}</label>
                  <input
                    type="date"
                    required
                    min={new Date().toISOString().split('T')[0]}
                    className="w-full p-2 border rounded-lg bg-stone-50"
                    onChange={e => setLeaveForm({ ...leaveForm, start_date: e.target.value })}
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-stone-500 block mb-1">{t[lang].endDate}</label>
                  <input
                    type="date"
                    required
                    min={leaveForm.start_date}
                    max={leaveForm.start_date ? new Date(new Date(leaveForm.start_date).getTime() + (daysRemaining - 1) * 24 * 60 * 60 * 1000).toISOString().split('T')[0] : undefined}
                    className="w-full p-2 border rounded-lg bg-stone-50"
                    onChange={e => setLeaveForm({ ...leaveForm, end_date: e.target.value })}
                  />
                </div>
              </div>
              <div>
                <label className="text-xs font-bold text-stone-500 block mb-1">{t[lang].reason}</label>
                <textarea required className="w-full p-2 border rounded-lg bg-stone-50" rows={3} onChange={e => setLeaveForm({ ...leaveForm, reason: e.target.value })}></textarea>
              </div>
              <div className="flex gap-2 pt-2">
                <button type="button" onClick={() => setShowLeaveModal(false)} className="flex-1 py-2 font-bold text-stone-600 bg-stone-100 rounded-lg">{t[lang].cancel}</button>
                <button type="submit" className="flex-1 py-2 font-bold text-white bg-teal-600 rounded-lg hover:bg-teal-700">{t[lang].submitApp}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showGrievanceModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl p-6 w-full max-w-md animate-in zoom-in-95">
            <h3 className="text-lg font-bold mb-4 flex items-center gap-2"><Shield className="text-red-600" size={20} /> {t[lang].fileGrievance}</h3>
            <div className="bg-yellow-50 p-3 rounded-lg mb-4 text-xs text-yellow-800 border-l-4 border-yellow-400">
              {lang === 'en' ? "Grievances are taken seriously. Refrain from false reporting." : "शिकायतें गंभीरता से ली जाती हैं। झूठी रिपोर्टिंग से बचें।"}
            </div>
            <form onSubmit={submitGrievance} className="space-y-4">
              <div>
                <label className="text-xs font-bold text-stone-500 block mb-1">{t[lang].addressedTo}</label>
                <select className="w-full p-2 border rounded-lg bg-stone-50" onChange={e => setGrievanceForm({ ...grievanceForm, addressed_to: e.target.value })}>
                  <option value="CO">Commanding Officer (CO)</option>
                  <option value="COMMANDER">Company Commander</option>

                </select>
              </div>
              <div>
                <label className="text-xs font-bold text-stone-500 block mb-1">{t[lang].category}</label>
                <select className="w-full p-2 border rounded-lg bg-stone-50" onChange={e => setGrievanceForm({ ...grievanceForm, type: e.target.value })}>
                  <option value="ADMIN">Administrative / Pay</option>
                  <option value="MEDICAL">Medical / Health</option>
                  <option value="PERSONAL">Personal / Family</option>
                  <option value="OTHER">{t[lang].other}</option>
                </select>
              </div>
              <div>
                <label className="text-xs font-bold text-stone-500 block mb-1">{t[lang].desc}</label>
                <textarea required className="w-full p-2 border rounded-lg bg-stone-50" rows={4} placeholder={t[lang].descPlaceholder} onChange={e => setGrievanceForm({ ...grievanceForm, description: e.target.value })}></textarea>
              </div>
              <div className="flex gap-2 pt-2">
                <button type="button" onClick={() => setShowGrievanceModal(false)} className="flex-1 py-2 font-bold text-stone-600 bg-stone-100 rounded-lg">{t[lang].cancel}</button>
                <button type="submit" className="flex-1 py-2 font-bold text-white bg-red-600 rounded-lg hover:bg-red-700">{t[lang].submitGriev}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default AgniveerDashboard;
