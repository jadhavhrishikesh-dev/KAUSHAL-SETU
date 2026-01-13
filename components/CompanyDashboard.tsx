
import React, { useState, useEffect } from 'react';
import { User } from '../types';

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
  agniveer_id: string; // Assuming mapped from integer ID to string in future or backend sends int
  name: string;
  rri_score: number;
  technical: number;
  behavioral: number;
}

// ... (Imports)
import { Message } from '../types';

// ... (Interfaces)

const CompanyDashboard: React.FC<{ user: User }> = ({ user }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [overview, setOverview] = useState<CompanyOverview | null>(null);
  const [techGaps, setTechGaps] = useState<TechnicalGaps | null>(null);
  const [risks, setRisks] = useState<RetentionRisk[]>([]);
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);

  // Reply State
  const [replyContent, setReplyContent] = useState('');
  const [activeReplyId, setActiveReplyId] = useState<number | null>(null); // Message ID we are replying to (to get agniveer_id)

  // Agniveer Management State
  const [activeTab, setActiveTab] = useState<'overview' | 'manage'>('overview');
  const [agniveers, setAgniveers] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [editingAgniveer, setEditingAgniveer] = useState<any | null>(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);

  // Date formatted helper
  const formatDate = (dateString: string | null) => {
    if (!dateString) return '';
    const d = new Date(dateString);
    if (isNaN(d.getTime())) return dateString;
    return `${d.getDate().toString().padStart(2, '0')}-${(d.getMonth() + 1).toString().padStart(2, '0')}-${d.getFullYear()}`;
  };

  useEffect(() => {
    if (activeTab === 'manage') {
      fetchAgniveers();
    }
  }, [activeTab, searchQuery]);

  const fetchAgniveers = async () => {
    // Auto-filter by backend's role access (only returns company agniveers)
    let url = 'http://localhost:8000/api/admin/agniveers?';
    if (searchQuery) url += `q=${searchQuery}`;

    try {
      const token = localStorage.getItem('token');
      const res = await fetch(url, { headers: { 'Authorization': `Bearer ${token}` } });
      if (res.ok) setAgniveers(await res.json());
    } catch (e) { console.error(e); }
  };

  const openEditModal = (agniveer: any) => {
    const formatted = { ...agniveer };
    // Pre-format dates for display
    if (formatted.dob) formatted.dob = formatDate(formatted.dob);
    if (formatted.reporting_date) formatted.reporting_date = formatDate(formatted.reporting_date);
    setEditingAgniveer(formatted);
    setIsEditModalOpen(true);
  };

  const handleEditChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    if (!editingAgniveer) return;
    setEditingAgniveer({ ...editingAgniveer, [e.target.name]: e.target.value });
  };

  const handleSaveEdit = async () => {
    if (!editingAgniveer) return;

    // Payload Prep
    const payload: any = { ...editingAgniveer };
    const dateFields = ['dob', 'reporting_date'];

    dateFields.forEach(f => {
      if (payload[f] && /^\d{2}-\d{2}-\d{4}$/.test(payload[f])) {
        const [d, m, y] = payload[f].split('-');
        payload[f] = `${y}-${m}-${d}`;
      } else if (payload[f] && payload[f].includes('T')) {
        payload[f] = payload[f].split('T')[0];
      }
    });

    Object.keys(payload).forEach(key => {
      if (payload[key] === '') payload[key] = null;
    });

    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`http://localhost:8000/api/admin/agniveers/${editingAgniveer.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(payload)
      });

      if (res.ok) {
        setIsEditModalOpen(false);
        setEditingAgniveer(null);
        fetchAgniveers();
        alert("Updated Successfully");
      } else {
        const err = await res.json();
        alert(`Update Failed: ${err.detail}`);
      }
    } catch (e) { alert("Network Error"); }
  };

  useEffect(() => {
    const fetchAnalytics = async () => {
      if (!user.company) return;

      try {
        setLoading(true);
        const baseUrl = 'http://localhost:8000/api';

        const [overviewRes, gapsRes, riskRes, msgRes] = await Promise.all([
          fetch(`${baseUrl}/analytics/company/${user.company}/overview`),
          fetch(`${baseUrl}/analytics/company/${user.company}/technical-gaps`),
          fetch(`${baseUrl}/analytics/company/${user.company}/retention-risk`),
          fetch(`${baseUrl}/messages/role/COY_CDR`)
        ]);

        if (overviewRes.ok) setOverview(await overviewRes.json());
        if (gapsRes.ok) setTechGaps(await gapsRes.json());
        if (riskRes.ok) setRisks(await riskRes.json());
        if (msgRes.ok) setMessages(await msgRes.json());

      } catch (error) {
        console.error("Failed to fetch data", error);
      } finally {
        setLoading(false);
      }
    };

    fetchAnalytics();
  }, [user.company]);

  const handleReply = async (agniveer_id: number) => {
    if (!replyContent.trim()) return;
    try {
      const res = await fetch('http://localhost:8000/api/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          agniveer_id: agniveer_id,
          sender_role: 'COY_CDR',
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
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-stone-800">{user.company} Dashboard</h1>
          <p className="text-stone-500">{user.role === 'coy_cdr' ? 'Commander' : 'Clerk'} Panel</p>
        </div>
        <div className="flex space-x-2 bg-stone-200 p-1 rounded-lg">
          <button onClick={() => setActiveTab('overview')} className={`px-4 py-2 rounded-md font-bold text-xs uppercase ${activeTab === 'overview' ? 'bg-white shadow text-teal-700' : 'text-stone-500'}`}>Overview</button>
          <button onClick={() => setActiveTab('manage')} className={`px-4 py-2 rounded-md font-bold text-xs uppercase ${activeTab === 'manage' ? 'bg-white shadow text-teal-700' : 'text-stone-500'}`}>Agniveers</button>
        </div>
      </header>

      {loading && activeTab === 'overview' ? (
        <div>Loading Analytics...</div>
      ) : activeTab === 'overview' ? (
        <>
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
            {/* Stats Panel (Same as before) */}
            <div className="lg:col-span-3 bg-white p-6 rounded-xl shadow-sm border border-stone-100">
              {/* ... Keep Stats Rendering ... */}
              <div className="flex justify-between items-center mb-6">
                <h3 className="font-bold text-stone-700">Company Stats (Assessed: {overview?.assessed_count || 0})</h3>
                <div className="flex space-x-4 text-[10px] font-bold uppercase tracking-widest text-stone-400">
                  <div className="flex items-center"><div className="w-2 h-2 rounded-full bg-teal-500 mr-1"></div> Green: {overview?.band_distribution.green}</div>
                  <div className="flex items-center"><div className="w-2 h-2 rounded-full bg-orange-500 mr-1"></div> Amber: {overview?.band_distribution.amber}</div>
                  <div className="flex items-center"><div className="w-2 h-2 rounded-full bg-red-500 mr-1"></div> Red: {overview?.band_distribution.red}</div>
                </div>
              </div>

              <div className="flex items-center justify-center p-10 bg-stone-50 rounded-lg">
                <div className="text-center">
                  <p className="text-4xl font-black text-stone-700">{overview?.average_rri || 0}</p>
                  <p className="text-xs uppercase tracking-widest text-stone-400">Average RRI</p>
                </div>
              </div>
            </div>

            {/* Retention Risk Panel */}
            <div className="bg-white p-6 rounded-xl shadow-sm border border-stone-100 h-64 overflow-y-auto">
              <h3 className="font-bold text-stone-700 mb-4">Retention Risk (Red Band)</h3>
              {risks.map((r, i) => (
                <div key={i} className="flex items-center justify-between p-3 bg-red-50 rounded-lg border border-red-100 mb-2">
                  <div className="flex items-center space-x-3">
                    <div>
                      <p className="text-xs font-bold text-red-800">{r.name}</p>
                      <p className="text-[10px] text-red-600">RRI: {r.rri_score}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Inbox Panel */}
            <div className="bg-stone-800 p-6 rounded-xl shadow-xl text-white h-[400px] flex flex-col">
              <h3 className="font-bold mb-4 flex items-center space-x-2 border-b border-stone-600 pb-2">
                <svg className="w-5 h-5 text-teal-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" /></svg>
                <span>Unit Inbox ({messages.length})</span>
              </h3>
              <div className="flex-1 overflow-y-auto space-y-4 pr-2 custom-scrollbar">
                {messages.map(msg => {
                  const isFromMe = msg.sender_role === 'COY_CDR';
                  return (
                    <div key={msg.id} className={`p-3 rounded-lg border ${isFromMe ? 'border-teal-700 bg-teal-900/20 ml-8' : 'border-stone-600 bg-stone-700 mr-8'}`}>
                      <div className="flex justify-between items-start mb-1">
                        <span className="text-[10px] font-bold text-stone-400 uppercase tracking-widest">
                          {isFromMe ? 'To: Agniveer ID ' + msg.agniveer_id : 'From: Agniveer ID ' + msg.agniveer_id}
                        </span>
                        <span className="text-[10px] text-stone-500">{new Date(msg.timestamp).toLocaleDateString()}</span>
                      </div>
                      <p className="text-sm text-stone-200">{msg.content}</p>
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

            {/* Tech Gaps (Existing) */}
            <div className="bg-white p-6 rounded-xl shadow-sm border border-stone-100">
              <h3 className="font-bold text-stone-700 mb-4">Competency Averages (Technical)</h3>
              <div className="space-y-6">
                {techGaps && Object.entries(techGaps).map(([key, value]) => (
                  <div key={key}>
                    <div className="flex justify-between text-xs font-bold mb-2">
                      <span className="text-stone-500 uppercase tracking-widest">{key}</span>
                      <span className="text-teal-600">{value}%</span>
                    </div>
                    <div className="w-full bg-stone-100 h-2 rounded-full overflow-hidden">
                      <div className="bg-teal-500 h-full transition-all duration-500" style={{ width: `${value}%` }}></div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </>
      ) : (
        // Management Tab
        <div className="bg-white rounded-xl shadow border border-stone-200 overflow-hidden">
          <div className="p-4 border-b border-stone-200 bg-stone-50 flex justify-between items-center">
            <h2 className="font-bold text-stone-700">Company Roster</h2>
            <input
              type="text"
              placeholder="Search Name / service ID..."
              className="border border-stone-300 rounded-lg px-4 py-2 text-sm outline-none focus:border-teal-500"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
            />
          </div>
          <table className="w-full text-sm text-left">
            <thead className="bg-white text-stone-500 font-bold uppercase text-xs border-b border-stone-200">
              <tr>
                <th className="p-3">Service ID</th>
                <th className="p-3">Name</th>
                <th className="p-3">Rank</th>
                <th className="p-3">Batch</th>
                <th className="p-3 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-100 font-mono text-xs">
              {agniveers.map((a: any) => (
                <tr key={a.id} className="hover:bg-stone-50">
                  <td className="p-3 font-bold text-teal-700">{a.service_id}</td>
                  <td className="p-3 text-stone-800">{a.name}</td>
                  <td className="p-3 text-stone-600">{a.rank || '-'}</td>
                  <td className="p-3 text-stone-600">{a.batch_no}</td>
                  <td className="p-3 text-right">
                    <button onClick={() => openEditModal(a)} className="text-blue-600 hover:text-blue-800 font-bold">Edit Profile</button>
                  </td>
                </tr>
              ))}
              {agniveers.length === 0 && <tr><td colSpan={5} className="p-8 text-center text-stone-400">No Agniveers found.</td></tr>}
            </tbody>
          </table>
        </div>
      )}

      {/* Edit Modal (Reused Logic) */}
      {isEditModalOpen && editingAgniveer && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-y-auto flex flex-col">
            <div className="p-6 border-b border-stone-200 flex justify-between items-center bg-stone-50">
              <h3 className="text-xl font-bold text-stone-800">Edit Agniveer Profile</h3>
              <button onClick={() => setIsEditModalOpen(false)} className="text-stone-400 hover:text-stone-600">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>
            <div className="p-8 grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Basic Fields */}
              <div><label className="text-xs font-bold text-stone-500 uppercase">Service ID</label><input name="service_id" value={editingAgniveer.service_id || ''} onChange={handleEditChange} className="w-full p-2 border rounded" /></div>
              <div><label className="text-xs font-bold text-stone-500 uppercase">Name</label><input name="name" value={editingAgniveer.name || ''} onChange={handleEditChange} className="w-full p-2 border rounded" /></div>
              <div><label className="text-xs font-bold text-stone-500 uppercase">DOB (DD-MM-YYYY)</label><input name="dob" value={editingAgniveer.dob || ''} onChange={handleEditChange} className="w-full p-2 border rounded" placeholder="DD-MM-YYYY" /></div>
              <div><label className="text-xs font-bold text-stone-500 uppercase">Reporting Date</label><input name="reporting_date" value={editingAgniveer.reporting_date || ''} onChange={handleEditChange} className="w-full p-2 border rounded" placeholder="DD-MM-YYYY" /></div>

              {/* Service Fields */}
              <div><label className="text-xs font-bold text-stone-500 uppercase">Rank</label><input name="rank" value={editingAgniveer.rank || ''} onChange={handleEditChange} className="w-full p-2 border rounded" /></div>
              <div><label className="text-xs font-bold text-stone-500 uppercase">Unit</label><input name="unit" value={editingAgniveer.unit || ''} onChange={handleEditChange} className="w-full p-2 border rounded" /></div>

              {/* Contact & NOK */}
              <div><label className="text-xs font-bold text-stone-500 uppercase">Email</label><input name="email" value={editingAgniveer.email || ''} onChange={handleEditChange} className="w-full p-2 border rounded" /></div>
              <div><label className="text-xs font-bold text-stone-500 uppercase">Phone</label><input name="phone" value={editingAgniveer.phone || ''} onChange={handleEditChange} className="w-full p-2 border rounded" /></div>
              <div><label className="text-xs font-bold text-stone-500 uppercase">NOK Name</label><input name="nok_name" value={editingAgniveer.nok_name || ''} onChange={handleEditChange} className="w-full p-2 border rounded" /></div>
              <div><label className="text-xs font-bold text-stone-500 uppercase">NOK Phone</label><input name="nok_phone" value={editingAgniveer.nok_phone || ''} onChange={handleEditChange} className="w-full p-2 border rounded" /></div>

              {/* Full Banking & IDs could be added here similar to Admin Dashboard */}
              <div className="md:col-span-2"><label className="text-xs font-bold text-stone-500 uppercase">Address</label><textarea name="hometown_address" value={editingAgniveer.hometown_address || ''} onChange={handleEditChange as any} className="w-full p-2 border rounded" /></div>
            </div>
            <div className="p-6 bg-stone-50 border-t border-stone-200 flex justify-end space-x-4">
              <button onClick={() => setIsEditModalOpen(false)} className="px-6 py-2 rounded-lg font-bold text-stone-500 hover:bg-stone-200">Cancel</button>
              <button onClick={handleSaveEdit} className="px-6 py-2 rounded-lg font-bold bg-teal-700 text-white hover:bg-teal-800 shadow-md">Save Changes</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CompanyDashboard;
