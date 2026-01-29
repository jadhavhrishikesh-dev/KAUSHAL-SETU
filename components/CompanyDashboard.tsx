
import React, { useState, useEffect } from 'react';
import { User } from '../types';
import CompanyOverview from './company/CompanyOverview';
import CompanyAgniveers from './company/CompanyAgniveers';
import { Zap, FileText } from 'lucide-react';

import { API_BASE_URL } from '../config';
import { formatDate } from './utils';
import CounsellingModule from './CounsellingModule';

interface CompanyOverview {
  unit: string;
  total_agniveers: number;
  assessed_count: number;
  average_rri: number;
  band_distribution: {
    green: number;
    amber: number;
    red: number;
  };
}

interface TechnicalGaps {
  firing: number;
  weapon: number;
  tactical: number;
  cognitive: number;
}

interface RetentionRisk {
  agniveer_id: string;
  name: string;
  rri_score: number;
  technical: number;
  behavioral: number;
}

interface PendingData {
  pending_technical: number;
  pending_behavioral: number;
  current_quarter: string;
}

interface RRITrendPoint {
  month: string;
  avg_rri: number;
}

interface TechTrendPoint {
  month: string;
  firing: number;
  weapon: number;
  tactical: number;
  cognitive: number;
}

interface BehavTrendPoint {
  quarter: string;
  average: number;
  initiative: number;
  dedication: number;
  team_spirit: number;
  courage: number;
  motivation: number;
  adaptability: number;
  communication: number;
}

interface CompetencyInsight {
  radar_data: { subject: string; A: number; fullMark: number }[];
  training_priorities: { subject: string; A: number }[];
}

interface HonorBoard {
  top_performers: { name: string; score: number; agniveer_id: number }[];
  recent_achievements: { name: string; title: string; type: string; date: string }[];
  champions: any[];
}

interface CommandHubData {
  readiness_score: number;
  battalion_avg: number;
  score_delta: number;
  status: {
    manning: string;
    training: string;
    critical_actions: number;
  };
  overview: CompanyOverview;
  pending: PendingData;
}

interface ActionItem {
  id: string;
  type: 'URGENT' | 'WARNING' | 'CRITICAL' | 'INFO';
  message: string;
  action: string;
  target: string;
  data?: { agniveer_id: string };
}

const CompanyDashboard: React.FC<{ user: User }> = ({ user }) => {
  const [overview, setOverview] = useState<CompanyOverview | null>(null);
  const [techGaps, setTechGaps] = useState<TechnicalGaps | null>(null);
  const [risks, setRisks] = useState<RetentionRisk[]>([]);
  const [pending, setPending] = useState<PendingData | null>(null);
  const [rriTrend, setRriTrend] = useState<RRITrendPoint[]>([]);
  const [techTrend, setTechTrend] = useState<TechTrendPoint[]>([]);
  const [behavTrend, setBehavTrend] = useState<BehavTrendPoint[]>([]);
  const [competency, setCompetency] = useState<CompetencyInsight | null>(null);
  const [honorBoard, setHonorBoard] = useState<HonorBoard | null>(null);
  const [commandHub, setCommandHub] = useState<CommandHubData | null>(null);
  const [actionItems, setActionItems] = useState<ActionItem[]>([]);
  const [loading, setLoading] = useState(true);

  // AI State
  const [aiReport, setAiReport] = useState<{ name: string, content: string } | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  // Admin Actions State
  const [companyLeaves, setCompanyLeaves] = useState<any[]>([]);
  const [companyGrievances, setCompanyGrievances] = useState<any[]>([]);

  const [peopleTab, setPeopleTab] = useState<'RISK' | 'TOP' | 'AWARDS'>('RISK');
  const [replyModalOpen, setReplyModalOpen] = useState(false);
  const [selectedGrievance, setSelectedGrievance] = useState<any | null>(null);
  const [replyText, setReplyText] = useState('');



  // Agniveer Management State
  const [activeTab, setActiveTab] = useState<'overview' | 'manage' | 'counselling'>('overview');
  const [agniveers, setAgniveers] = useState<any[]>([]);






  const fetchAdminData = async () => {
    try {
      if (!user.company) return;
      const leaveRes = await fetch(`${API_BASE_URL}/api/company/${user.company}/leaves`);
      if (leaveRes.ok) setCompanyLeaves(await leaveRes.json());

      const grievanceRes = await fetch(`${API_BASE_URL}/api/company/${user.company}/grievances`);
      if (grievanceRes.ok) setCompanyGrievances(await grievanceRes.json());
    } catch (e) { console.error(e); }
  };

  const handleLeaveAction = async (id: number, status: string) => {
    try {
      await fetch(`${API_BASE_URL}/api/leave/${id}/status`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status })
      });
      fetchAdminData(); // Refresh
    } catch (e) { alert("Failed to update status"); }
  };

  const handleGrievanceReply = async () => {
    if (!selectedGrievance) return;
    try {
      await fetch(`${API_BASE_URL}/api/grievance/${selectedGrievance.id}/resolve`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'RESOLVED', resolution_notes: replyText })
      });
      setReplyModalOpen(false);
      setReplyText('');
      fetchAdminData();
    } catch (e) { alert("Failed to send reply"); }
  };

  const handleAction = async (item: ActionItem) => {
    if (item.target === 'ai_report' && item.data?.agniveer_id) {
      setIsAnalyzing(true);
      try {
        const res = await fetch(`${API_BASE_URL}/api/ai/report/${item.data.agniveer_id}`, { method: 'POST' });
        if (res.ok) {
          const data = await res.json();
          // Extract name from message for now or would ideally get from API
          const nameMatch = item.message.match(/: (.*?) \(/);
          const name = nameMatch ? nameMatch[1] : "Agniveer";
          setAiReport({ name, content: data.report });
        } else {
          alert("AI Analysis failed. Ensure AI Service is active.");
        }
      } catch (e) {
        console.error(e);
        alert("Connection error to AI Service.");
      } finally {
        setIsAnalyzing(false);
      }
    } else if (item.target === 'process_assessments') {
      // logic to open modal or scroll
      alert("Redirecting to Assessment Form...");
    } else if (item.target === 'view_risks') {
      setPeopleTab('RISK');
      document.querySelector('#people-widget')?.scrollIntoView({ behavior: 'smooth' });
    }
  };

  useEffect(() => {
    if (activeTab === 'manage' || activeTab === 'counselling') {
      fetchAgniveers();
    }
  }, [activeTab]);

  const fetchAgniveers = async () => {
    // Auto-filter by backend's role access (only returns company agniveers)
    let url = `${API_BASE_URL}/api/admin/agniveers?`;


    try {
      const token = localStorage.getItem('token');
      const res = await fetch(url, { headers: { 'Authorization': `Bearer ${token}` } });
      if (res.ok) setAgniveers(await res.json());
    } catch (e) { console.error(e); }
  };



  useEffect(() => {
    const fetchAnalytics = async () => {
      if (!user.company) return;

      try {
        setLoading(true);
        const baseUrl = `${API_BASE_URL}/api`;

        const [overviewRes, gapsRes, riskRes, pendingRes, rriTrendRes, techTrendRes, behavTrendRes, compRes, honorRes, hubRes, actionRes] = await Promise.all([
          fetch(`${baseUrl}/analytics/company/${user.company}/overview`),
          fetch(`${baseUrl}/analytics/company/${user.company}/technical-gaps`),
          fetch(`${baseUrl}/analytics/company/${user.company}/retention-risk`),
          fetch(`${baseUrl}/analytics/company/${user.company}/pending`),
          fetch(`${baseUrl}/analytics/company/${user.company}/rri-trend`),
          fetch(`${baseUrl}/analytics/company/${user.company}/technical-trend`),
          fetch(`${baseUrl}/analytics/company/${user.company}/behavioral-trend`),
          fetch(`${baseUrl}/analytics/company/${user.company}/competency-insights`),
          fetch(`${baseUrl}/analytics/company/${user.company}/honor-board`),
          fetch(`${baseUrl}/analytics/company/${user.company}/command-hub`),
          fetch(`${baseUrl}/analytics/company/${user.company}/action-center`)
        ]);

        if (overviewRes.ok) setOverview(await overviewRes.json());
        if (gapsRes.ok) setTechGaps(await gapsRes.json());
        if (riskRes.ok) setRisks(await riskRes.json());
        if (pendingRes.ok) setPending(await pendingRes.json());
        if (rriTrendRes.ok) setRriTrend(await rriTrendRes.json());
        if (techTrendRes.ok) setTechTrend(await techTrendRes.json());
        if (behavTrendRes.ok) setBehavTrend(await behavTrendRes.json());
        if (compRes.ok) setCompetency(await compRes.json());
        if (honorRes.ok) setHonorBoard(await honorRes.json());
        if (hubRes.ok) setCommandHub(await hubRes.json());
        if (actionRes.ok) setActionItems(await actionRes.json());

        // Also fetch admin data
        await fetchAdminData();

      } catch (error) {
        console.error("Failed to fetch data", error);
      } finally {
        setLoading(false);
      }
    };

    fetchAnalytics();
  }, [user.company]);


  return (
    <div className="space-y-6">
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-stone-800">{user.company} Dashboard</h1>
          <p className="text-stone-500">{user.role === 'coy_cdr' ? 'Commander' : 'Clerk'} Panel</p>
        </div>
        <div className="flex space-x-2 bg-stone-200 p-1 rounded-lg">
          <button onClick={() => setActiveTab('overview')} className={`px-4 py-2 rounded-md font-bold text-xs uppercase ${activeTab === 'overview' ? 'bg-white shadow text-teal-700' : 'text-stone-500'}`}>Overview</button>
          <button onClick={() => setActiveTab('manage')} className={`px-4 py-2 rounded-md font-bold text-xs uppercase ${activeTab === 'manage' ? 'bg-white shadow text-teal-700' : 'text-stone-500'}`}>Agniveers</button>
          <button onClick={() => setActiveTab('counselling')} className={`px-4 py-2 rounded-md font-bold text-xs uppercase ${activeTab === 'counselling' ? 'bg-white shadow text-teal-700' : 'text-stone-500'}`}>Counselling</button>
        </div>
      </header>

      {loading && activeTab === 'overview' ? (
        <div className="space-y-6 animate-pulse">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[1, 2, 3, 4].map(i => <div key={i} className="bg-gradient-to-br from-stone-100 to-stone-50 h-24 rounded-xl"></div>)}
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 bg-gradient-to-br from-stone-100 to-stone-50 h-96 rounded-xl"></div>
            <div className="bg-gradient-to-br from-stone-100 to-stone-50 h-96 rounded-xl"></div>
          </div>
          <div className="bg-gradient-to-br from-stone-100 to-stone-50 h-80 rounded-xl"></div>
        </div>
      ) : activeTab === 'overview' ? (
        <CompanyOverview
          commandHub={commandHub}
          actionItems={actionItems}
          isAnalyzing={isAnalyzing}
          handleAction={handleAction}
          companyLeaves={companyLeaves}
          companyGrievances={companyGrievances}
          handleLeaveAction={handleLeaveAction}
          setSelectedGrievance={setSelectedGrievance}
          setReplyModalOpen={setReplyModalOpen}
          peopleTab={peopleTab}
          setPeopleTab={setPeopleTab}
          overview={overview}
          rriTrend={rriTrend}
          techTrend={techTrend}
          behavTrend={behavTrend}
          competency={competency}
          risks={risks}
          honorBoard={honorBoard}
          pending={pending}
        />
      ) : null}

      {/* Management Tab */}
      {activeTab === 'manage' && (
        <CompanyAgniveers user={user} agniveers={agniveers} onRefresh={fetchAgniveers} />
      )}

      {/* Counselling Tab */}
      {activeTab === 'counselling' && (
        <div className="bg-stone-900 rounded-2xl p-6 border border-white/5">
          <CounsellingModule
            companyName={user.company || ''}
            batches={[...new Set(agniveers.map((a: any) => a.batch_no).filter(Boolean))]}
            agniveers={agniveers.map((a: any) => ({ id: a.id, name: a.name, service_id: a.service_id }))}
          />
        </div>
      )}



      {/* AI Report Modal */}
      {
        aiReport && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full overflow-hidden animate-in zoom-in-95 duration-200">
              <div className="p-6 bg-gradient-to-r from-stone-900 to-stone-800 text-white flex justify-between items-start">
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <div className="p-1.5 bg-white/10 rounded-lg backdrop-blur-md">
                      <Zap size={20} className="text-yellow-400" />
                    </div>
                    <h3 className="text-lg font-bold">Commander's AI Insight</h3>
                  </div>
                  <p className="text-stone-400 text-sm">Analysis for <span className="text-white font-bold">{aiReport.name}</span></p>
                </div>
                <button onClick={() => setAiReport(null)} className="p-2 hover:bg-white/10 rounded-full transition-colors">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                </button>
              </div>

              <div className="p-8 bg-stone-50 min-h-[300px]">
                <div className="prose prose-stone max-w-none">
                  <div className="whitespace-pre-wrap font-serif text-lg leading-relaxed text-stone-800">
                    {aiReport.content}
                  </div>
                </div>

                <div className="mt-8 flex gap-3 pt-6 border-t border-stone-200">
                  <button onClick={() => setAiReport(null)} className="flex-1 py-3 font-bold text-stone-600 bg-white border border-stone-200 rounded-xl hover:bg-stone-50 transition-colors">
                    Close
                  </button>
                  <button onClick={() => alert("Report saved to dossier.")} className="flex-1 py-3 font-bold text-white bg-stone-900 rounded-xl hover:bg-black transition-colors flex items-center justify-center gap-2">
                    <FileText size={18} /> Save to Dossier
                  </button>
                </div>
              </div>
            </div>
          </div>
        )
      }

      {/* Reply Modal */}
      {
        replyModalOpen && selectedGrievance && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50 animate-in fade-in duration-200">
            <div className="bg-white rounded-xl shadow-xl w-full max-w-md p-6 animate-in zoom-in-95 duration-200">
              <h3 className="font-bold text-lg mb-4">Reply to Grievance</h3>
              <p className="text-sm text-stone-600 mb-2 font-bold">Original Grievance:</p>
              <div className="p-3 bg-stone-50 rounded italic text-sm text-stone-500 mb-4 border border-stone-100">{selectedGrievance.description}</div>

              <label className="block text-xs font-bold text-stone-500 uppercase mb-1">Resolution Notes / Reply</label>
              <textarea
                className="w-full border rounded-lg p-3 text-sm min-h-[100px] mb-4 outline-none focus:border-teal-500"
                placeholder="Enter your reply and resolution details here..."
                value={replyText}
                onChange={(e) => setReplyText(e.target.value)}
              />

              <div className="flex justify-end gap-2">
                <button onClick={() => setReplyModalOpen(false)} className="px-4 py-2 rounded-lg text-stone-500 font-bold hover:bg-stone-100">Cancel</button>
                <button onClick={handleGrievanceReply} className="px-4 py-2 rounded-lg bg-teal-600 text-white font-bold hover:bg-teal-700 shadow-sm">Resolve & Reply</button>
              </div>
            </div>
          </div>
        )
      }

    </div >
  );
};

export default CompanyDashboard;
