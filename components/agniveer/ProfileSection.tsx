import React from 'react';
import { Target } from 'lucide-react';
import { useAgniveer } from './context';
import { formatDate } from '../utils';

const ProfileSection: React.FC = () => {
    const { user, profile, rriData, t, lang } = useAgniveer();
    const bandBg = 'bg-stone-100';
    const bandColor = 'text-stone-700';

    return (
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
                            <span className="block text-stone-500">{t.batch}</span>
                            <span className="font-bold text-white">{profile?.batch_no || 'N/A'}</span>
                        </div>
                        <div className="p-2 bg-white/5 rounded-lg">
                            <span className="block text-stone-500">{t.dob}</span>
                            <span className="font-bold text-white">{formatDate(profile?.dob)}</span>
                        </div>
                    </div>
                </div>
            </div>

            {/* RRI Score Card */}
            <div className="bg-white rounded-2xl shadow-md border border-stone-200 p-5">
                <div className="flex justify-between items-center mb-4">
                    <h3 className="font-bold text-stone-700 flex items-center gap-2"><Target size={16} className="text-teal-600" /> {t.myStatus}</h3>
                </div>
                <div className="flex items-baseline space-x-2">
                    <span className={`text-5xl font-black ${bandColor}`}>{rriData?.rri_score || 0}</span>
                    <span className="text-sm text-stone-400">/ 100</span>
                </div>
                <p className="text-xs text-stone-500 mt-2">{t.rriScore}</p>
            </div>
        </div>
    );
};

export default ProfileSection;
