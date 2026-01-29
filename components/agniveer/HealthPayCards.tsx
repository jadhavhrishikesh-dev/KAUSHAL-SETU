import React from 'react';
import { Heart, DollarSign } from 'lucide-react';
import { useAgniveer } from './context';

const HealthPayCards: React.FC = () => {
    const { t } = useAgniveer();

    return (
        <>
            {/* Health & Fitness */}
            <div className="bg-white rounded-2xl shadow-md border border-stone-200 p-5">
                <h3 className="font-bold text-stone-700 flex items-center gap-2 mb-4"><Heart size={16} className="text-pink-600" /> {t.healthFitness}</h3>
                <div className="flex justify-between items-center mb-2">
                    <span className="text-xs font-bold text-stone-500">{t.medCategory}</span>
                    <span className="text-sm font-black text-green-600 bg-green-50 px-2 py-1 rounded">SHAPE-1</span>
                </div>
                <div className="flex justify-between items-center">
                    <span className="text-xs font-bold text-stone-500">{t.vaccination}</span>
                    <span className="text-xs font-bold text-stone-400">{t.upToDate}</span>
                </div>
            </div>

            {/* Pay Slip Placeholder */}
            <div className="bg-gradient-to-br from-stone-900 to-stone-800 rounded-2xl p-5 text-white flex flex-col justify-center">
                <div className="flex items-center gap-3 mb-2">
                    <div className="p-2 bg-white/10 rounded-full"><DollarSign size={20} className="text-yellow-400" /></div>
                    <div>
                        <h3 className="font-bold">{t.paySlip}</h3>
                        <p className="text-xs text-stone-400">{t.secureAccess}</p>
                    </div>
                </div>
                <span className="px-3 py-1 bg-white/10 text-stone-300 text-xs font-bold rounded-full border border-white/10 self-start">{t.comingSoon}</span>
            </div>
        </>
    );
};

export default HealthPayCards;
