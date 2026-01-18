
import React, { useState, useEffect } from 'react';
import { User } from '../types';
import { API_BASE_URL } from '../config';

interface AgniveerRecord {
  id: number;
  service_id: string;
  name: string;
  rank: string;
  unit: string;
}

const OfficerDashboard: React.FC<{ user: User }> = ({ user }) => {
  const [activeTab, setActiveTab] = useState<'entry' | 'analytics'>('entry');
  const [successMessage, setSuccessMessage] = useState('');

  // Search state
  const [agniveerSearch, setAgniveerSearch] = useState('');
  const [searchResults, setSearchResults] = useState<AgniveerRecord[]>([]);
  const [selectedAgniveer, setSelectedAgniveer] = useState<AgniveerRecord | null>(null);

  // Assessment Form State
  // const [assessmentType, setAssessmentType] = useState<'TECHNICAL' | 'BEHAVIORAL' | 'ACHIEVEMENT'>('TECHNICAL');
  // Hardcoded to TECHNICAL for Officer Dashboard
  const assessmentType = 'TECHNICAL';

  // Technical Form
  const [techForm, setTechForm] = useState({
    firing_score: '',
    weapon_handling_score: '',
    tactical_score: '',
    cognitive_score: ''
  });





  // Search API
  useEffect(() => {
    const search = async () => {
      if (!agniveerSearch) {
        setSearchResults([]);
        return;
      }
      // Ideally backend should have a search endpoint. For now we assume we fetch all or limited.
      // Or we use the RRI Get endpoint if we knew ID.
      // Let's assume there's a search endpoint or we just mock search results from a fetched list if small.
      // Actually, backend main.py has `read_agniveers`.

      try {
        const res = await fetch(`${API_BASE_URL}/api/agniveers/?skip=0&limit=100`);
        if (res.ok) {
          const data: AgniveerRecord[] = await res.json();
          // Client side filter
          const filtered = data.filter(a =>
            a.name.toLowerCase().includes(agniveerSearch.toLowerCase()) ||
            a.service_id.includes(agniveerSearch)
          );
          setSearchResults(filtered.slice(0, 5));
        }
      } catch (e) {
        console.error(e);
      }
    };
    const handler = setTimeout(search, 300);
    return () => clearTimeout(handler);
  }, [agniveerSearch]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedAgniveer) return;

    const url = `${API_BASE_URL}/api/assessments/technical`;
    const body = {
      agniveer_id: selectedAgniveer.id,
      assessment_date: new Date().toISOString(),
      firing_score: parseFloat(techForm.firing_score),
      weapon_handling_score: parseFloat(techForm.weapon_handling_score),
      tactical_score: parseFloat(techForm.tactical_score),
      cognitive_score: parseFloat(techForm.cognitive_score)
    };

    try {
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      });

      if (res.ok) {
        setSuccessMessage(`${assessmentType} Assessment Saved Successfully!`);
        // Trigger RRI Recalculation
        await fetch(`${API_BASE_URL}/api/rri/calculate/${selectedAgniveer.id}`, { method: 'POST' });

        setTimeout(() => setSuccessMessage(''), 3000);
        // Reset forms
        // (Simplified reset)
        setSelectedAgniveer(null);
        setAgniveerSearch('');
      } else {
        alert("Failed to save. Check inputs.");
      }
    } catch (e) {
      console.error(e);
      alert("Network Error");
    }
  };

  const inputClass = "w-full bg-white border border-stone-300 rounded-md py-2.5 px-4 focus:ring-2 focus:ring-teal-500 focus:border-teal-500 text-stone-900 placeholder:text-stone-400 outline-none transition-all shadow-sm font-medium";

  return (
    <div className="space-y-6">
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-stone-800">Training Officer Dashboard</h1>
          <p className="text-stone-500">Unit: {user.company || 'Alpha Coy'} • Assessment Entry</p>
        </div>
      </header>

      {successMessage && (
        <div className="bg-teal-50 border border-teal-200 text-teal-700 px-4 py-3 rounded-lg flex items-center shadow-sm animate-pulse">
          <span className="font-bold">{successMessage}</span>
        </div>
      )}

      <div className="bg-white rounded-xl shadow-sm border border-stone-200 overflow-hidden">
        <div className="p-6 border-b border-stone-100 bg-stone-50/50 flex justify-between items-center">
          <h2 className="font-bold text-stone-700">New Technical Assessment Entry</h2>
        </div>

        <form onSubmit={handleSubmit} className="p-8 space-y-8">
          {/* 1. Select Agniveer */}
          <div className="relative">
            <label className="block text-xs font-black text-stone-500 uppercase tracking-widest mb-2">Select Agniveer</label>
            <input
              type="text"
              placeholder="Search by ID or Name..."
              className={inputClass}
              value={selectedAgniveer ? `${selectedAgniveer.name} (${selectedAgniveer.service_id})` : agniveerSearch}
              onChange={(e) => {
                setAgniveerSearch(e.target.value);
                setSelectedAgniveer(null);
              }}
            />
            {searchResults.length > 0 && !selectedAgniveer && (
              <div className="absolute z-10 w-full bg-white border border-stone-200 mt-1 rounded-md shadow-lg max-h-60 overflow-auto">
                {searchResults.map(a => (
                  <div
                    key={a.id}
                    className="p-3 hover:bg-stone-50 cursor-pointer border-b border-stone-50"
                    onClick={() => {
                      setSelectedAgniveer(a);
                      setAgniveerSearch('');
                    }}
                  >
                    <p className="font-bold text-stone-800">{a.name}</p>
                    <p className="text-xs text-stone-500">{a.service_id} • {a.rank}</p>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* 2. Assessment Form */}
          {assessmentType === 'TECHNICAL' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 bg-stone-50 p-6 rounded-xl border border-stone-200">
              <h3 className="md:col-span-2 text-sm font-bold text-stone-700 uppercase">Technical Parameters (0-100 Score)</h3>
              <div>
                <label className="block text-xs font-bold text-stone-500 mb-1">Firing Score</label>
                <input required type="number" min="0" max="100" className={inputClass} value={techForm.firing_score} onChange={e => setTechForm({ ...techForm, firing_score: e.target.value })} />
              </div>
              <div>
                <label className="block text-xs font-bold text-stone-500 mb-1">Weapon Handling</label>
                <input required type="number" min="0" max="100" className={inputClass} value={techForm.weapon_handling_score} onChange={e => setTechForm({ ...techForm, weapon_handling_score: e.target.value })} />
              </div>
              <div>
                <label className="block text-xs font-bold text-stone-500 mb-1">Tactical Ops</label>
                <input required type="number" min="0" max="100" className={inputClass} value={techForm.tactical_score} onChange={e => setTechForm({ ...techForm, tactical_score: e.target.value })} />
              </div>
              <div>
                <label className="block text-xs font-bold text-stone-500 mb-1">Cognitive Skill</label>
                <input required type="number" min="0" max="100" className={inputClass} value={techForm.cognitive_score} onChange={e => setTechForm({ ...techForm, cognitive_score: e.target.value })} />
              </div>
            </div>
          )}





          <button
            type="submit"
            disabled={!selectedAgniveer}
            className="w-full bg-teal-700 hover:bg-teal-800 disabled:bg-stone-300 disabled:cursor-not-allowed text-white font-bold py-4 rounded-xl shadow-lg transition-all uppercase tracking-widest text-sm"
          >
            Submit & Recalculate RRI
          </button>
        </form>
      </div>
    </div>
  );
};

export default OfficerDashboard;
