import React, { useState, useEffect } from 'react';
import { User, AgniveerProfile } from '../types';
import { API_BASE_URL } from '../config';
import { RRIResponse, LeaveRequest, Grievance } from './agniveer/types';
import { translations, Language } from './agniveer/translations';
import { AgniveerProvider } from './agniveer/context';
import ProfileSection from './agniveer/ProfileSection';
import PerformanceSection from './agniveer/PerformanceSection';
import ActionSection from './agniveer/ActionSection';
import LeaveStatus from './agniveer/LeaveStatus';
import GrievanceStatus from './agniveer/GrievanceStatus';
import HealthPayCards from './agniveer/HealthPayCards';
import LeaveModal from './agniveer/LeaveModal';
import GrievanceModal from './agniveer/GrievanceModal';

const AgniveerDashboard: React.FC<{ user: User }> = ({ user }) => {
  const [profile, setProfile] = useState<AgniveerProfile | null>(null);
  const [rriData, setRriData] = useState<RRIResponse | null>(null);
  const [leaves, setLeaves] = useState<LeaveRequest[]>([]);
  const [grievances, setGrievances] = useState<Grievance[]>([]);
  const [lang, setLang] = useState<Language>('en');

  // UI State for Modals
  const [showLeaveModal, setShowLeaveModal] = useState(false);
  const [showGrievanceModal, setShowGrievanceModal] = useState(false);

  const t = translations[lang];

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

  useEffect(() => {
    fetchProfile();
    fetchRRI();
    fetchLeaves();
    fetchGrievances();
  }, [user.agniveer_id]);

  return (
    <AgniveerProvider value={{
      user, profile, rriData, leaves, grievances, lang, setLang, t,
      refreshLeaves: fetchLeaves, refreshGrievances: fetchGrievances
    }}>
      <div className="space-y-6 pb-16">
        {/* Header Bar */}
        <header className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-stone-800">{t.portalTitle}</h1>
            <p className="text-stone-500">{t.welcome}, {profile?.name || user.name}</p>
          </div>
          <div className="flex items-center gap-4">
            <div className="flex bg-stone-200 p-1 rounded-lg">
              <button onClick={() => setLang('en')} className={`px-4 py-1.5 text-xs font-bold rounded-md transition-all ${lang === 'en' ? 'bg-white shadow text-teal-700' : 'text-stone-500'}`}>English</button>
              <button onClick={() => setLang('hi')} className={`px-4 py-1.5 text-xs font-bold rounded-md transition-all ${lang === 'hi' ? 'bg-white shadow text-orange-600' : 'text-stone-500'}`}>हिंदी</button>
            </div>
          </div>
        </header>

        {/* Main Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <ProfileSection />
          <PerformanceSection />
          <ActionSection
            openLeaveModal={() => setShowLeaveModal(true)}
            openGrievanceModal={() => setShowGrievanceModal(true)}
          />
        </div>

        {/* Bottom Row */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <LeaveStatus />
          <GrievanceStatus />
          <HealthPayCards />
        </div>

        {/* Modals */}
        <LeaveModal isOpen={showLeaveModal} onClose={() => setShowLeaveModal(false)} />
        <GrievanceModal isOpen={showGrievanceModal} onClose={() => setShowGrievanceModal(false)} />
      </div>
    </AgniveerProvider>
  );
};

export default AgniveerDashboard;
