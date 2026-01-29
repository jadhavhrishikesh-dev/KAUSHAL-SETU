import React from 'react';
import { Activity } from 'lucide-react';
import { Radar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, ResponsiveContainer } from 'recharts';
import { useAgniveer } from './context';

const PerformanceSection: React.FC = () => {
    const { rriData, t, lang } = useAgniveer();

    const radarData = rriData ? [
        { subject: t.firing, A: rriData.technical.breakdown.firing || 0, fullMark: 100 },
        { subject: t.weapon, A: rriData.technical.breakdown.weapon || 0, fullMark: 100 },
        { subject: t.tactical, A: rriData.technical.breakdown.tactical || 0, fullMark: 100 },
        { subject: t.cognitive, A: rriData.technical.breakdown.cognitive || 0, fullMark: 100 },
    ] : [];

    return (
        <div className="col-span-1 space-y-6">
            <div className="bg-white rounded-2xl shadow-md border border-stone-200 p-5 h-full flex flex-col">
                <div className="flex justify-between items-center mb-4">
                    <h3 className="font-bold text-stone-700 flex items-center gap-2"><Activity size={16} className="text-teal-600" /> {t.techPerf}</h3>
                    <span className="text-xs font-bold text-orange-500 bg-orange-50 px-2 py-1 rounded">{t.nextAssessment}: Feb 15</span>
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
    );
};

export default PerformanceSection;
