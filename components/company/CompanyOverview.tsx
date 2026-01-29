import React, { useState } from 'react';
import {
    TrendingUp, TrendingDown, Users, Target, Zap, CheckCircle, AlertTriangle,
    Clock, ChevronRight, FileText, Activity
} from 'lucide-react';
import {
    LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
    BarChart, Bar, Legend, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar
} from 'recharts';
import { formatDate } from '../utils';

interface CompanyOverviewProps {
    commandHub: any;
    actionItems: any[];
    isAnalyzing: boolean;
    handleAction: (item: any) => void;
    companyLeaves: any[];
    companyGrievances: any[];
    handleLeaveAction: (id: number, status: string) => void;
    setSelectedGrievance: (g: any) => void;
    setReplyModalOpen: (open: boolean) => void;
    overview: any;
    rriTrend: any[];
    techTrend: any[];
    behavTrend: any[];
    competency: any;
    risks: any[];
    honorBoard: any;
    pending: any;
    peopleTab: 'RISK' | 'TOP' | 'AWARDS';
    setPeopleTab: (tab: 'RISK' | 'TOP' | 'AWARDS') => void;
}

const CompanyOverview: React.FC<CompanyOverviewProps> = ({
    commandHub,
    actionItems,
    isAnalyzing,
    handleAction,
    companyLeaves,
    companyGrievances,
    handleLeaveAction,
    setSelectedGrievance,
    setReplyModalOpen,
    overview,
    rriTrend,
    techTrend,
    behavTrend,
    competency,
    risks,
    honorBoard,
    pending,
    peopleTab,
    setPeopleTab
}) => {
    // Local UI State
    const [adminTab, setAdminTab] = useState<'LEAVES' | 'GRIEVANCES'>('LEAVES');
    const [trendTab, setTrendTab] = useState<'RRI' | 'TECH' | 'BEHAV'>('RRI');


    return (
        <div className="space-y-6 animate-in fade-in duration-500 pb-16">

            {/* 0. Command Hub Header */}
            <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
                {/* Readiness Scorecard */}
                <div className="lg:col-span-1 bg-gradient-to-br from-stone-900 to-stone-800 rounded-2xl p-6 text-white shadow-xl relative overflow-hidden group">
                    <div className="absolute top-0 right-0 w-32 h-32 bg-teal-500/20 rounded-full -mr-10 -mt-10 blur-xl group-hover:bg-teal-500/30 transition-all duration-700"></div>
                    <div className="relative z-10">
                        <div className="flex justify-between items-start mb-4">
                            <div>
                                <h2 className="text-sm font-bold uppercase tracking-widest text-stone-400">Company Readiness</h2>
                                <div className="flex items-baseline space-x-2 mt-1">
                                    <span className={`text-5xl font-black ${(commandHub?.readiness_score || 0) >= 75 ? 'text-teal-400' : 'text-orange-400'}`}>
                                        {commandHub?.readiness_score || 0}
                                    </span>
                                    <span className="text-sm text-stone-400">/ 100</span>
                                </div>
                            </div>
                            <div className={`flex items-center space-x-1 px-3 py-1 rounded-full text-xs font-bold ${(commandHub?.score_delta || 0) >= 0 ? 'bg-teal-500/20 text-teal-300' : 'bg-red-500/20 text-red-300'}`}>
                                {(commandHub?.score_delta || 0) >= 0 ? <TrendingUp size={14} /> : <TrendingDown size={14} />}
                                <span>{Math.abs(commandHub?.score_delta || 0)}% vs last month</span>
                            </div>
                        </div>

                        <div className="space-y-3">
                            <div className="flex justify-between items-center text-sm">
                                <span className="text-stone-400 flex items-center gap-2"><Users size={14} /> Manning</span>
                                <span className={`font-bold ${commandHub?.status.manning === 'Good' ? 'text-teal-400' : 'text-red-400'}`}>{commandHub?.status.manning}</span>
                            </div>
                            <div className="flex justify-between items-center text-sm">
                                <span className="text-stone-400 flex items-center gap-2"><Target size={14} /> Training</span>
                                <span className={`font-bold ${commandHub?.status.training === 'On Track' ? 'text-teal-400' : 'text-orange-400'}`}>{commandHub?.status.training}</span>
                            </div>
                            <div className="flex justify-between items-center text-sm mt-4 pt-4 border-t border-white/10">
                                <span className="text-stone-500">Battalion Avg</span>
                                <span className="font-mono text-stone-300">{commandHub?.battalion_avg}</span>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Action Center Widget */}
                <div className="lg:col-span-2 bg-white rounded-2xl shadow-sm border border-stone-200 p-0 overflow-hidden flex flex-col">
                    <div className="p-4 bg-stone-50 border-b border-stone-100 flex justify-between items-center">
                        <h3 className="font-bold text-stone-800 flex items-center gap-2">
                            <Zap className="text-orange-500" size={18} />
                            Command Priorities
                            <span className="bg-orange-100 text-orange-700 text-xs px-2 py-0.5 rounded-full">{actionItems.length}</span>
                        </h3>
                        <button className="text-xs font-bold text-teal-600 hover:text-teal-700">View All Tasks</button>
                    </div>
                    <div className="flex-1 overflow-y-auto max-h-[180px] p-2 space-y-2">
                        {actionItems.length === 0 ? (
                            <div className="flex flex-col items-center justify-center h-full py-8 text-stone-400">
                                <CheckCircle size={32} className="mb-2 text-green-500/50" />
                                <p className="text-sm">All clear! No urgent actions.</p>
                            </div>
                        ) : (
                            actionItems.map((item) => (
                                <div key={item.id} className="flex items-center justify-between p-3 bg-white hover:bg-stone-50 border border-stone-100 rounded-xl transition-colors group cursor-pointer shadow-sm">
                                    <div className="flex items-center space-x-3">
                                        <div className={`p-2 rounded-full ${item.type === 'URGENT' ? 'bg-red-100 text-red-600' :
                                            item.type === 'CRITICAL' ? 'bg-red-100 text-red-600' :
                                                item.type === 'WARNING' ? 'bg-orange-100 text-orange-600' : 'bg-blue-100 text-blue-600'
                                            }`}>
                                            {item.type === 'URGENT' || item.type === 'CRITICAL' ? <AlertTriangle size={16} /> : <Clock size={16} />}
                                        </div>
                                        <div>
                                            <p className="text-sm font-bold text-stone-700">{item.message}</p>
                                            <p className="text-[10px] font-bold text-stone-400 uppercase tracking-wider">{item.type}</p>
                                        </div>
                                    </div>
                                    <button
                                        onClick={() => handleAction(item)}
                                        disabled={isAnalyzing && item.target === 'ai_report'}
                                        className="px-3 py-1.5 text-xs font-bold bg-stone-100 text-stone-600 rounded-lg group-hover:bg-teal-50 group-hover:text-teal-700 transition-colors flex items-center gap-1 disabled:opacity-50"
                                    >
                                        {isAnalyzing && item.target === 'ai_report' ? (
                                            <>
                                                <div className="w-3 h-3 border-2 border-current border-t-transparent rounded-full animate-spin"></div>
                                                Thinking...
                                            </>
                                        ) : (
                                            <>
                                                {item.action} <ChevronRight size={12} />
                                            </>
                                        )}
                                    </button>
                                </div>
                            ))
                        )}
                    </div>
                </div>


                {/* Admin Actions Widget */}
                <div className="lg:col-span-1 bg-white p-5 rounded-2xl shadow-sm border border-stone-200 flex flex-col h-full">
                    <div className="flex justify-between items-center mb-4">
                        <h3 className="font-bold text-stone-700 flex items-center gap-2 text-sm"><FileText size={16} className="text-purple-600" /> Requests</h3>
                        <div className="flex gap-1 bg-stone-100 p-1 rounded-lg">
                            <button onClick={() => setAdminTab('LEAVES')} className={`px-2 py-0.5 text-[10px] font-bold rounded-md transition ${adminTab === 'LEAVES' ? 'bg-white shadow text-purple-700' : 'text-stone-500'}`}>Leaves</button>
                            <button onClick={() => setAdminTab('GRIEVANCES')} className={`px-2 py-0.5 text-[10px] font-bold rounded-md transition ${adminTab === 'GRIEVANCES' ? 'bg-white shadow text-purple-700' : 'text-stone-500'}`}>Grievances</button>
                        </div>
                    </div>

                    <div className="flex-1 overflow-y-auto pr-1 space-y-2 custom-scrollbar min-h-0">
                        {adminTab === 'LEAVES' ? (
                            companyLeaves.length === 0 ? <p className="text-center text-[10px] text-stone-400 italic py-8">No pending requests</p> :
                                companyLeaves.map(l => (
                                    <div key={l.id} className="p-2 bg-stone-50 rounded-lg border border-stone-100 hover:border-purple-200 transition">
                                        <div className="flex justify-between mb-1">
                                            <span className="text-[10px] font-bold text-stone-700">ID: {l.agniveer_id}</span>
                                            <span className="text-[8px] font-bold bg-yellow-100 text-yellow-700 px-1.5 py-0.5 rounded">{l.leave_type}</span>
                                        </div>
                                        <p className="text-[9px] text-stone-500 mb-1">{formatDate(l.start_date)} - {formatDate(l.end_date)}</p>
                                        <div className="flex gap-1 mt-2">
                                            <button onClick={() => handleLeaveAction(l.id, 'APPROVED')} className="flex-1 py-1 bg-white border border-green-200 text-green-600 text-[9px] font-bold rounded hover:bg-green-50">Approve</button>
                                            <button onClick={() => handleLeaveAction(l.id, 'REJECTED')} className="flex-1 py-1 bg-white border border-red-100 text-red-500 text-[9px] font-bold rounded hover:bg-red-50">Reject</button>
                                        </div>
                                    </div>
                                ))
                        ) : (
                            companyGrievances.length === 0 ? <p className="text-center text-[10px] text-stone-400 italic py-8">No grievances</p> :
                                companyGrievances.map(g => (
                                    <div key={g.id} className="p-2 bg-stone-50 rounded-lg border border-stone-100 hover:border-purple-200 transition">
                                        <div className="flex justify-between mb-1">
                                            <span className="text-[10px] font-bold text-stone-700 truncate max-w-[80px]">{g.type}</span>
                                            <span className={`text-[8px] font-bold px-1.5 py-0.5 rounded ${g.status === 'RESOLVED' ? 'bg-green-100 text-green-700' : 'bg-red-50 text-red-600'}`}>{g.status}</span>
                                        </div>
                                        <p className="text-[9px] text-stone-600 truncate mb-2">{g.description}</p>
                                        {g.status !== 'RESOLVED' && (
                                            <button onClick={() => { setSelectedGrievance(g); setReplyModalOpen(true); }} className="w-full py-1 bg-white border border-stone-200 text-stone-600 text-[9px] font-bold rounded hover:bg-stone-50">Reply</button>
                                        )}
                                    </div>
                                ))
                        )}
                    </div>
                </div>
            </div>

            {/* 1. Vital Signs (Secondary Context) */}
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                {/* Strength */}
                <div className="bg-white p-3 rounded-xl shadow-sm border border-stone-100 flex items-center space-x-3">
                    <div className="p-2 bg-teal-50 text-teal-600 rounded-lg"><Users size={16} /></div>
                    <div>
                        <p className="text-[10px] text-stone-400 uppercase font-bold">Strength</p>
                        <p className="text-lg font-black text-stone-800">{overview?.total_agniveers}</p>
                    </div>
                </div>

                {/* RRI */}
                <div className="bg-white p-3 rounded-xl shadow-sm border border-stone-100 flex items-center space-x-3">
                    <div className="p-2 bg-blue-50 text-blue-600 rounded-lg"><Activity size={16} /></div>
                    <div>
                        <p className="text-[10px] text-stone-400 uppercase font-bold">Avg RRI</p>
                        <p className="text-lg font-black text-stone-800">{overview?.average_rri}</p>
                    </div>
                </div>

                {/* Red Band */}
                <div className="bg-white p-3 rounded-xl shadow-sm border border-stone-100 flex items-center space-x-3">
                    <div className="p-2 bg-red-50 text-red-600 rounded-lg"><AlertTriangle size={16} /></div>
                    <div>
                        <p className="text-[10px] text-stone-400 uppercase font-bold">Red Band</p>
                        <p className="text-lg font-black text-red-600">{overview?.band_distribution.red}</p>
                    </div>
                </div>

                {/* Pending Tech */}
                <div className="bg-white p-3 rounded-xl shadow-sm border border-stone-100 flex items-center space-x-3">
                    <div className="p-2 bg-orange-50 text-orange-600 rounded-lg"><FileText size={16} /></div>
                    <div>
                        <p className="text-[10px] text-stone-400 uppercase font-bold">Assessments</p>
                        <p className="text-lg font-black text-stone-800">{pending?.pending_technical}</p>
                    </div>
                </div>

                {/* Retention Health - Mini Bar */}
                <div className="bg-white p-3 rounded-xl shadow-sm border border-stone-100 flex flex-col justify-center">
                    <div className="flex justify-between text-[10px] items-center mb-1 text-stone-500 font-bold">
                        <span>Health Distribution</span>
                    </div>
                    <div className="flex h-2 rounded-full overflow-hidden w-full">
                        <div className="bg-teal-500 h-full" style={{ width: `${(overview?.band_distribution.green || 0) / (overview?.total_agniveers || 1) * 100}%` }}></div>
                        <div className="bg-orange-500 h-full" style={{ width: `${(overview?.band_distribution.amber || 0) / (overview?.total_agniveers || 1) * 100}%` }}></div>
                        <div className="bg-red-500 h-full flex-1"></div>
                    </div>
                </div>
            </div>

            {/* 2. Middle Layer: Trends (Left) & Strategy (Right) */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

                {/* Left: Trend Intelligence Widget */}
                <div className="lg:col-span-2 bg-white rounded-2xl shadow-md hover:shadow-xl border border-stone-200/60 backdrop-blur-sm flex flex-col h-[400px] transition-shadow duration-300">
                    <div className="p-4 border-b border-stone-100 flex justify-between items-center bg-gradient-to-r from-stone-50 to-white">
                        <div>
                            <h3 className="font-bold text-stone-800">Performance Trends</h3>
                            <p className="text-[10px] text-stone-400 uppercase tracking-wider mt-0.5">Last 6 Months</p>
                        </div>
                        <div className="flex bg-white border border-stone-200 p-0.5 rounded-lg shadow-sm">
                            {['RRI', 'TECH', 'BEHAV'].map((tab) => (
                                <button
                                    key={tab}
                                    onClick={() => setTrendTab(tab as any)}
                                    className={`px-3 py-1.5 text-[10px] font-bold rounded-md transition-all duration-200 ${trendTab === tab ? 'bg-gradient-to-r from-teal-500 to-teal-600 shadow-sm text-white' : 'text-stone-500 hover:text-stone-700 hover:bg-stone-50'}`}
                                >
                                    {tab === 'TECH' ? 'TECHNICAL' : tab === 'BEHAV' ? 'BEHAVIORAL' : 'RRI SCORE'}
                                </button>
                            ))}
                        </div>
                    </div>

                    <div className="flex-1 p-4 min-h-0">
                        <ResponsiveContainer width="100%" height="100%">
                            {trendTab === 'RRI' ? (
                                <LineChart data={rriTrend}>
                                    <defs>
                                        <linearGradient id="colorRRI" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="5%" stopColor="#0d9488" stopOpacity={0.1} />
                                            <stop offset="95%" stopColor="#0d9488" stopOpacity={0} />
                                        </linearGradient>
                                    </defs>
                                    <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" vertical={false} />
                                    <XAxis dataKey="month" tick={{ fontSize: 10, fill: '#78716c' }} axisLine={false} tickLine={false} />
                                    <YAxis domain={[0, 100]} tick={{ fontSize: 10, fill: '#78716c' }} axisLine={false} tickLine={false} />
                                    <Tooltip contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)', padding: '12px' }} />
                                    <Line type="monotone" dataKey="avg_rri" stroke="#0d9488" strokeWidth={3} dot={{ r: 5, fill: '#fff', strokeWidth: 3, stroke: '#0d9488' }} activeDot={{ r: 7, fill: '#0d9488' }} />
                                </LineChart>
                            ) : trendTab === 'TECH' ? (
                                <LineChart data={techTrend}>
                                    <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" vertical={false} />
                                    <XAxis dataKey="month" tick={{ fontSize: 10, fill: '#78716c' }} axisLine={false} tickLine={false} />
                                    <YAxis domain={[0, 100]} tick={{ fontSize: 10, fill: '#78716c' }} axisLine={false} tickLine={false} />
                                    <Tooltip contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)', padding: '12px' }} />
                                    <Legend wrapperStyle={{ fontSize: '10px', paddingTop: '12px' }} iconType="circle" />
                                    <Line type="monotone" dataKey="firing" stroke="#f59e0b" strokeWidth={2.5} dot={{ r: 4 }} name="Firing" />
                                    <Line type="monotone" dataKey="weapon" stroke="#3b82f6" strokeWidth={2.5} dot={{ r: 4 }} name="Weapon" />
                                    <Line type="monotone" dataKey="tactical" stroke="#10b981" strokeWidth={2.5} dot={{ r: 4 }} name="Tactical" />
                                    <Line type="monotone" dataKey="cognitive" stroke="#8b5cf6" strokeWidth={2.5} dot={{ r: 4 }} name="Cognitive" />
                                </LineChart>
                            ) : (
                                <BarChart data={behavTrend} barSize={50}>
                                    <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" vertical={false} />
                                    <XAxis dataKey="quarter" tick={{ fontSize: 10, fill: '#78716c' }} axisLine={false} tickLine={false} />
                                    <YAxis domain={[0, 10]} tick={{ fontSize: 10, fill: '#78716c' }} axisLine={false} tickLine={false} />
                                    <Tooltip cursor={{ fill: 'transparent' }} contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)', padding: '12px' }} />
                                    <Bar dataKey="average" fill="url(#colorBar)" radius={[8, 8, 0, 0]} />
                                    <defs>
                                        <linearGradient id="colorBar" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="5%" stopColor="#14b8a6" stopOpacity={1} />
                                            <stop offset="95%" stopColor="#0d9488" stopOpacity={0.8} />
                                        </linearGradient>
                                    </defs>
                                </BarChart>
                            )}
                        </ResponsiveContainer>
                    </div>
                </div>

                {/* Right: Strategic Radar Widget */}
                <div className="bg-white rounded-2xl shadow-md hover:shadow-xl border border-stone-200/60 flex flex-col h-[400px] transition-shadow duration-300 relative overflow-hidden">
                    <div className="absolute inset-0 bg-gradient-to-br from-teal-500/5 via-transparent to-violet-500/5 pointer-events-none"></div>
                    <div className="relative z-10 p-4 border-b border-stone-100 bg-gradient-to-r from-white to-stone-50/50">
                        <div className="flex items-center justify-between">
                            <div>
                                <h3 className="font-bold text-stone-800">Competency Radar</h3>
                                <p className="text-[10px] text-stone-400 uppercase tracking-wider mt-0.5">Full Spectrum Analysis</p>
                            </div>
                            <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse shadow-lg shadow-green-500/50"></div>
                        </div>
                    </div>
                    <div className="relative z-10 flex-1 min-h-0">
                        <ResponsiveContainer width="100%" height="100%">
                            <RadarChart cx="50%" cy="42%" outerRadius="65%" data={competency?.radar_data || []}>
                                <PolarGrid stroke="#d6d3d1" strokeWidth={0.5} />
                                <PolarAngleAxis dataKey="subject" tick={{ fontSize: 9, fill: '#57534e', fontWeight: 600 }} />
                                <PolarRadiusAxis angle={30} domain={[0, 100]} tick={false} axisLine={false} />
                                <Radar name="Company Avg" dataKey="A" stroke="#0d9488" strokeWidth={3} fill="#14b8a6" fillOpacity={0.25} dot={{ r: 4, fill: '#0d9488', strokeWidth: 0 }} />
                                <Tooltip contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px rgba(0,0,0,0.1)' }} />
                            </RadarChart>
                        </ResponsiveContainer>

                        {/* Floating Priorities Card */}
                        <div className="absolute bottom-3 left-3 right-3 bg-gradient-to-r from-stone-900 via-stone-800 to-stone-900 backdrop-blur-lg p-3 rounded-xl shadow-2xl border border-white/10">
                            <div className="flex items-center gap-2 mb-2">
                                <svg className="w-4 h-4 text-orange-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
                                <p className="text-[10px] font-bold uppercase tracking-widest text-orange-400">Training Focus</p>
                            </div>
                            <div className="flex flex-wrap gap-2 text-xs">
                                {competency?.training_priorities.length === 0 ? (
                                    <span className="text-stone-400 text-xs">Insufficient data</span>
                                ) : (
                                    competency?.training_priorities.map((p: any, i: number) => (
                                        <div key={i} className="bg-gradient-to-r from-orange-500/20 to-red-500/20 backdrop-blur-sm px-3 py-1.5 rounded-lg flex items-center gap-2 border border-orange-500/30">
                                            <span className="font-bold text-orange-200">{p.subject}</span>
                                            <span className="font-mono text-orange-300/80 text-xs">{Math.round(p.A)}%</span>
                                        </div>
                                    ))
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* 3. Bottom Layer: People Intelligence Widget */}
            <div className="bg-white rounded-xl shadow-sm border border-stone-100 min-h-[300px] flex flex-col">
                <div className="p-4 border-b border-stone-100 flex flex-col sm:flex-row justify-between items-center gap-4 bg-stone-50/50">
                    <div className="flex items-center space-x-2">
                        <h3 className="font-bold text-stone-700">Roster Insights</h3>
                        <span className="text-xs text-stone-400 font-medium px-2 py-1 bg-white rounded border border-stone-200">
                            {peopleTab === 'RISK' ? `${risks.length} At Risk` : peopleTab === 'TOP' ? 'Top 5 Leaders' : 'Latest Awards'}
                        </span>
                    </div>
                    <div className="flex bg-stone-200 p-1 rounded-lg">
                        <button onClick={() => setPeopleTab('RISK')} className={`px-4 py-1.5 text-xs font-bold rounded-md transition-all ${peopleTab === 'RISK' ? 'bg-white shadow text-red-600' : 'text-stone-500'}`}>⚠️ WATCH LIST</button>
                        <button onClick={() => setPeopleTab('TOP')} className={`px-4 py-1.5 text-xs font-bold rounded-md transition-all ${peopleTab === 'TOP' ? 'bg-white shadow text-green-600' : 'text-stone-500'}`}>🏆 TOP PERFORMERS</button>
                        <button onClick={() => setPeopleTab('AWARDS')} className={`px-4 py-1.5 text-xs font-bold rounded-md transition-all ${peopleTab === 'AWARDS' ? 'bg-white shadow text-blue-600' : 'text-stone-500'}`}>🏅 ACHIEVEMENTS</button>
                    </div>
                </div>

                <div className="p-0 flex-1 overflow-x-auto">
                    <table className="w-full text-sm text-left">
                        <thead className="text-xs text-stone-400 uppercase bg-stone-50 border-b border-stone-100">
                            {peopleTab === 'RISK' && (
                                <tr>
                                    <th className="px-6 py-3 font-bold">Agniveer</th>
                                    <th className="px-6 py-3 font-bold">RRI Score</th>
                                    <th className="px-6 py-3 font-bold">Tech / Behav</th>
                                    <th className="px-6 py-3 font-bold text-right">Action</th>
                                </tr>
                            )}
                            {peopleTab === 'TOP' && (
                                <tr>
                                    <th className="px-6 py-3 font-bold">Rank</th>
                                    <th className="px-6 py-3 font-bold">Agniveer</th>
                                    <th className="px-6 py-3 font-bold">RRI Score</th>
                                    <th className="px-6 py-3 font-bold text-right">Badges</th>
                                </tr>
                            )}
                            {peopleTab === 'AWARDS' && (
                                <tr>
                                    <th className="px-6 py-3 font-bold">Date</th>
                                    <th className="px-6 py-3 font-bold">Agniveer</th>
                                    <th className="px-6 py-3 font-bold">Achievement</th>
                                    <th className="px-6 py-3 font-bold">Type</th>
                                </tr>
                            )}
                        </thead>
                        <tbody className="divide-y divide-stone-100">
                            {peopleTab === 'RISK' && (
                                risks.length === 0 ? (
                                    <tr><td colSpan={4} className="p-8 text-center text-stone-400">Great job! No high-risk personnel found.</td></tr>
                                ) : (
                                    risks.map((r, i) => (
                                        <tr key={i} className="hover:bg-red-50/30 transition-colors">
                                            <td className="px-6 py-4 font-bold text-stone-700">{r.name}</td>
                                            <td className="px-6 py-4 font-bold text-red-600">{r.rri_score}</td>
                                            <td className="px-6 py-4 text-stone-500">
                                                Tech: <span className="font-bold text-stone-700">{r.technical}</span> • Behav: <span className="font-bold text-stone-700">{r.behavioral}</span>
                                            </td>
                                            <td className="px-6 py-4 text-right">
                                                <button className="text-xs font-bold text-red-600 hover:text-red-800 uppercase tracking-wider">Investigate</button>
                                            </td>
                                        </tr>
                                    ))
                                )
                            )}

                            {peopleTab === 'TOP' && (
                                honorBoard?.top_performers.map((p: any, i: number) => (
                                    <tr key={i} className="hover:bg-green-50/30 transition-colors">
                                        <td className="px-6 py-4 font-bold text-stone-400">#{i + 1}</td>
                                        <td className="px-6 py-4 font-bold text-stone-700">{p.name}</td>
                                        <td className="px-6 py-4 font-bold text-green-600 text-lg">{p.score}</td>
                                        <td className="px-6 py-4 text-right">
                                            {i === 0 && <span className="text-xl">👑</span>}
                                            {i === 1 && <span className="text-xl">🥈</span>}
                                            {i === 2 && <span className="text-xl">🥉</span>}
                                        </td>
                                    </tr>
                                ))
                            )}

                            {peopleTab === 'AWARDS' && (
                                honorBoard?.recent_achievements.length === 0 ? (
                                    <tr><td colSpan={4} className="p-8 text-center text-stone-400">No recent achievements recorded.</td></tr>
                                ) : (
                                    honorBoard?.recent_achievements.map((a: any, i: number) => (
                                        <tr key={i} className="hover:bg-blue-50/30 transition-colors">
                                            <td className="px-6 py-4 font-mono text-xs text-stone-400">{a.date}</td>
                                            <td className="px-6 py-4 font-bold text-stone-700">{a.name}</td>
                                            <td className="px-6 py-4 font-bold text-teal-700">{a.title}</td>
                                            <td className="px-6 py-4">
                                                <span className="px-2 py-1 rounded text-[10px] uppercase font-bold bg-stone-100 text-stone-500">{a.type}</span>
                                            </td>
                                        </tr>
                                    ))
                                )
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Floating Action Button */}
            <div className="fixed bottom-8 right-8 z-50">
                <button className="bg-stone-900 hover:bg-black text-white p-4 rounded-full shadow-2xl hover:scale-105 transition-all duration-300 flex items-center justify-center group">
                    <span className="mr-0 w-0 overflow-hidden group-hover:w-auto group-hover:mr-2 transition-all duration-300 font-bold whitespace-nowrap">Quick Action</span>
                    <div className="grid grid-cols-2 gap-0.5">
                        <div className="w-1.5 h-1.5 bg-white/70 rounded-full"></div>
                        <div className="w-1.5 h-1.5 bg-white/70 rounded-full"></div>
                        <div className="w-1.5 h-1.5 bg-white/70 rounded-full"></div>
                        <div className="w-1.5 h-1.5 bg-white/70 rounded-full"></div>
                    </div>
                </button>
            </div>

        </div>
    );
};

export default CompanyOverview;
