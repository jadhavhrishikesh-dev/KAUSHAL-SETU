import React, { useState, useEffect } from 'react';
import { API_BASE_URL } from '../../config';
import { Award, CheckCircle2, XCircle } from 'lucide-react';
import { ScheduledTest, TestAgniveer } from './types';

interface ResultEntryProps {
    tests: ScheduledTest[];
    selectedTest: ScheduledTest | null;
    setSelectedTest: (test: ScheduledTest | null) => void;
}

const ResultEntry: React.FC<ResultEntryProps> = ({ tests, selectedTest, setSelectedTest }) => {
    const [testAgniveers, setTestAgniveers] = useState<TestAgniveer[]>([]);
    const token = localStorage.getItem('token');

    const fetchTestAgniveers = async (test: ScheduledTest) => {
        try {
            const res = await fetch(`${API_BASE_URL}/api/tests/${test.id}/agniveers`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            if (res.ok) {
                const data = await res.json();
                setTestAgniveers(data);
            }
        } catch (e) { console.error(e); }
    };

    useEffect(() => {
        if (selectedTest) {
            fetchTestAgniveers(selectedTest);
        } else {
            setTestAgniveers([]);
        }
    }, [selectedTest]);

    const saveResult = async (agniveerId: number, score: number | null, isAbsent: boolean) => {
        if (!selectedTest) return;
        try {
            const res = await fetch(`${API_BASE_URL}/api/tests/${selectedTest.id}/results`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${token}`
                },
                body: JSON.stringify({ agniveer_id: agniveerId, score, is_absent: isAbsent })
            });
            if (res.ok) {
                setTestAgniveers(prev => prev.map(a =>
                    a.id === agniveerId ? { ...a, score, is_absent: isAbsent, has_result: true } : a
                ));
            }
        } catch (e) { console.error(e); }
    };

    return (
        <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
            <h2 className="text-2xl font-bold text-white mb-6 flex items-center gap-3">
                <div className="w-1 h-8 bg-amber-500 rounded-full"></div>
                Enter Results
            </h2>
            {!selectedTest ? (
                <div className="text-stone-400">
                    <p className="mb-4">Select a test from below to enter results:</p>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        {tests.filter(t => t.status === 'SCHEDULED' || t.status === 'COMPLETED').map(t => (
                            <button
                                key={t.id}
                                onClick={() => setSelectedTest(t)}
                                className="group relative p-6 bg-stone-900/60 border border-white/5 rounded-2xl text-left hover:border-amber-500/50 transition-all duration-300 hover:-translate-y-1 hover:shadow-xl hover:shadow-amber-500/5 overflow-hidden"
                            >
                                <div className="absolute inset-0 bg-gradient-to-br from-amber-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></div>
                                <p className="font-bold text-white text-lg mb-1 group-hover:text-amber-400 transition-colors">{t.name}</p>
                                <div className="flex justify-between items-center text-sm text-stone-500 group-hover:text-stone-400">
                                    <span>{t.test_type}</span>
                                    <span>{new Date(t.scheduled_date).toLocaleDateString()}</span>
                                </div>
                            </button>
                        ))}
                    </div>
                </div>
            ) : (
                <div>
                    <div className="flex justify-between items-center mb-6 bg-stone-800/30 p-4 rounded-2xl border border-white/5">
                        <div className="flex items-center gap-4">
                            <div className="p-3 bg-amber-500/20 rounded-xl text-amber-500">
                                <Award size={24} />
                            </div>
                            <div>
                                <h3 className="text-xl font-bold text-white">{selectedTest.name}</h3>
                                <p className="text-stone-400 text-sm font-mono mt-1">
                                    <span className="text-stone-500">MAX:</span> {selectedTest.max_marks} <span className="mx-2">|</span> <span className="text-stone-500">PASS:</span> {selectedTest.passing_marks}
                                </p>
                            </div>
                        </div>
                        <button onClick={() => setSelectedTest(null)} className="px-4 py-2 rounded-xl text-stone-400 hover:text-white hover:bg-stone-800 transition-all text-sm font-bold border border-transparent hover:border-stone-700">
                            ← Select Different Test
                        </button>
                    </div>

                    <div className="overflow-x-auto rounded-2xl border border-stone-800/50 shadow-inner bg-black/20">
                        <table className="w-full text-left">
                            <thead className="bg-stone-900/80 text-stone-400 text-xs font-bold uppercase tracking-wider backdrop-blur-sm">
                                <tr>
                                    <th className="p-5 rounded-l-lg">Service ID</th>
                                    <th className="p-5">Name</th>
                                    <th className="p-5">Score</th>
                                    <th className="p-5">Status</th>
                                    <th className="p-5 rounded-r-lg">Action</th>
                                </tr>
                            </thead>
                            <tbody className="text-stone-300 divide-y divide-stone-800/50">
                                {testAgniveers.map(a => (
                                    <tr key={a.id} className="hover:bg-stone-800/30 transition-colors">
                                        <td className="p-5 font-mono text-amber-400/80">{a.service_id}</td>
                                        <td className="p-5 font-bold text-white">{a.name}</td>
                                        <td className="p-5">
                                            <div className="relative group/input">
                                                <input
                                                    type="number"
                                                    value={a.score ?? ''}
                                                    onChange={(e) => {
                                                        const val = e.target.value === '' ? null : parseFloat(e.target.value);
                                                        setTestAgniveers(prev => prev.map(ag => ag.id === a.id ? { ...ag, score: val } : ag));
                                                    }}
                                                    className="w-24 px-3 py-2 bg-stone-950/50 border border-stone-700 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-amber-500/50 focus:border-amber-500 transition-all font-mono text-center disabled:opacity-50"
                                                    max={selectedTest.max_marks}
                                                    disabled={a.is_absent}
                                                    placeholder="--"
                                                />
                                            </div>
                                        </td>
                                        <td className="p-5">
                                            {a.has_result ? (
                                                a.is_absent ? (
                                                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-500/10 text-red-500 border border-red-500/20">Absent</span>
                                                ) : a.score !== null && a.score >= selectedTest.passing_marks ? (
                                                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-emerald-500/10 text-emerald-500 border border-emerald-500/20">Pass</span>
                                                ) : (
                                                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-500/10 text-red-500 border border-red-500/20">Fail</span>
                                                )
                                            ) : (
                                                <span className="text-stone-600 text-xs font-medium">Pending Entry</span>
                                            )}
                                        </td>
                                        <td className="p-5 flex gap-3">
                                            <button
                                                onClick={() => saveResult(a.id, a.score, false)}
                                                className="p-2 bg-emerald-500/10 text-emerald-500 rounded-lg hover:bg-emerald-500/20 border border-emerald-500/20 transition-all ring-emerald-500/50 focus:ring-2"
                                                title="Save Score"
                                            >
                                                <CheckCircle2 size={18} />
                                            </button>
                                            <button
                                                onClick={() => saveResult(a.id, null, true)}
                                                className={`p-2 rounded-lg border transition-all ${a.is_absent
                                                    ? 'bg-red-500/20 text-red-400 border-red-500/40'
                                                    : 'bg-stone-800 text-stone-500 border-stone-700 hover:text-red-400 hover:border-red-500/30'
                                                    }`}
                                                title="Mark Absent"
                                            >
                                                <XCircle size={18} />
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}
        </div>
    );
};
export default ResultEntry;
