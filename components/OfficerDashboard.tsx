
import React, { useState, useEffect } from 'react';
import { User } from '../types';

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
  const [assessmentType, setAssessmentType] = useState<'TECHNICAL' | 'BEHAVIORAL' | 'ACHIEVEMENT'>('TECHNICAL');

  // Technical Form
  const [techForm, setTechForm] = useState({
    firing_score: '',
    weapon_handling_score: '',
    tactical_score: '',
    cognitive_score: '',
    remarks: ''
  });

  // Behavioral Form
  const [behavForm, setBehavForm] = useState({
    quarter: 'Q1',
    initiative: '',
    dedication: '',
    team_spirit: '',
    courage: '',
    motivation: '',
    adaptability: '',
    communication: '',
    remarks: ''
  });

  // Achievement Form
  const [achieveForm, setAchieveForm] = useState({
    title: '',
    type: 'SPORTS',
    points: '',
    validity_months: '24'
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
        const res = await fetch(`http://localhost:8000/api/agniveers/?skip=0&limit=100`);
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

    let url = '';
    let body = {};

    if (assessmentType === 'TECHNICAL') {
      url = 'http://localhost:8000/api/assessments/technical';
      body = {
        agniveer_id: selectedAgniveer.id,
        assessment_date: new Date().toISOString(),
        firing_score: parseFloat(techForm.firing_score),
        weapon_handling_score: parseFloat(techForm.weapon_handling_score),
        tactical_score: parseFloat(techForm.tactical_score),
        cognitive_score: parseFloat(techForm.cognitive_score),
        remarks: techForm.remarks
      };
    } else if (assessmentType === 'BEHAVIORAL') {
      url = 'http://localhost:8000/api/assessments/behavioral';
      body = {
        agniveer_id: selectedAgniveer.id,
        assessment_date: new Date().toISOString(),
        quarter: behavForm.quarter,
        initiative: parseFloat(behavForm.initiative),
        dedication: parseFloat(behavForm.dedication),
        team_spirit: parseFloat(behavForm.team_spirit),
        courage: parseFloat(behavForm.courage),
        motivation: parseFloat(behavForm.motivation),
        adaptability: parseFloat(behavForm.adaptability),
        communication: parseFloat(behavForm.communication),
        remarks: behavForm.remarks
      };
    } else {
      url = 'http://localhost:8000/api/achievements';
      body = {
        agniveer_id: selectedAgniveer.id,
        title: achieveForm.title,
        type: achieveForm.type,
        points: parseFloat(achieveForm.points),
        date_earned: new Date().toISOString(),
        validity_months: parseInt(achieveForm.validity_months)
      };
    }

    try {
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      });

      if (res.ok) {
        setSuccessMessage(`${assessmentType} Assessment Saved Successfully!`);
        // Trigger RRI Recalculation
        await fetch(`http://localhost:8000/api/rri/calculate/${selectedAgniveer.id}`, { method: 'POST' });

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
          <h2 className="font-bold text-stone-700">New Assessment Entry</h2>
          <div className="flex space-x-2">
            {(['TECHNICAL', 'BEHAVIORAL', 'ACHIEVEMENT'] as const).map(type => (
              <button
                key={type}
                onClick={() => setAssessmentType(type)}
                className={`text-xs font-bold px-3 py-1.5 rounded uppercase tracking-wider ${assessmentType === type ? 'bg-teal-600 text-white shadow-md' : 'bg-white text-stone-500 border border-stone-200'}`}
              >
                {type}
              </button>
            ))}
          </div>
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

          {assessmentType === 'BEHAVIORAL' && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 bg-stone-50 p-6 rounded-xl border border-stone-200">
              <h3 className="md:col-span-3 text-sm font-bold text-stone-700 uppercase">Behavioral Competencies (1-10 Scale)</h3>
              <div>
                <label className="block text-xs font-bold text-stone-500 mb-1">Quarter</label>
                <select className={inputClass} value={behavForm.quarter} onChange={e => setBehavForm({ ...behavForm, quarter: e.target.value })}>
                  <option>Q1</option><option>Q2</option><option>Q3</option><option>Q4</option>
                </select>
              </div>
              {['Initiative', 'Dedication', 'Team Spirit', 'Courage', 'Motivation', 'Adaptability', 'Communication'].map(field => {
                const key = field.toLowerCase().replace(' ', '_') as keyof typeof behavForm;
                if (key === 'quarter' || key === 'remarks') return null;
                return (
                  <div key={key}>
                    <label className="block text-xs font-bold text-stone-500 mb-1">{field}</label>
                    <input required type="number" min="1" max="10" step="0.1" className={inputClass} value={behavForm[key]} onChange={(e) => setBehavForm({ ...behavForm, [key]: e.target.value })} />
                  </div>
                );
              })}
            </div>
          )}

          {assessmentType === 'ACHIEVEMENT' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 bg-stone-50 p-6 rounded-xl border border-stone-200">
              <h3 className="md:col-span-2 text-sm font-bold text-stone-700 uppercase">Special Achievement</h3>
              <div>
                <label className="block text-xs font-bold text-stone-500 mb-1">Title</label>
                <input required type="text" className={inputClass} value={achieveForm.title} onChange={e => setAchieveForm({ ...achieveForm, title: e.target.value })} placeholder="e.g. Gold Medal Boxing" />
              </div>
              <div>
                <label className="block text-xs font-bold text-stone-500 mb-1">Type</label>
                <select className={inputClass} value={achieveForm.type} onChange={e => setAchieveForm({ ...achieveForm, type: e.target.value })}>
                  <option value="SPORTS">Sports</option>
                  <option value="TECHNICAL">Technical</option>
                  <option value="LEADERSHIP">Leadership</option>
                  <option value="BRAVERY">Bravery</option>
                  <option value="INNOVATION">Innovation</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-bold text-stone-500 mb-1">Points</label>
                <input required type="number" min="1" className={inputClass} value={achieveForm.points} onChange={e => setAchieveForm({ ...achieveForm, points: e.target.value })} />
              </div>
              <div>
                <label className="block text-xs font-bold text-stone-500 mb-1">Validity (Months)</label>
                <input required type="number" className={inputClass} value={achieveForm.validity_months} onChange={e => setAchieveForm({ ...achieveForm, validity_months: e.target.value })} />
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
