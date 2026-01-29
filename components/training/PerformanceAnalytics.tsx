import React from 'react';
import { BarChart3 } from 'lucide-react';

const PerformanceAnalytics: React.FC = () => {
    return (
        <div className="text-center py-20 animate-in fade-in zoom-in duration-500">
            <div className="w-24 h-24 bg-stone-800/50 rounded-full flex items-center justify-center mx-auto mb-6 border border-white/5 shadow-2xl">
                <BarChart3 size={48} className="text-stone-600" />
            </div>
            <h3 className="text-2xl font-bold text-white mb-2">Performance Analytics</h3>
            <p className="text-stone-500 max-w-md mx-auto">
                Comprehensive charts and insights based on test results will be available here soon.
            </p>
        </div>
    );
};

export default PerformanceAnalytics;
