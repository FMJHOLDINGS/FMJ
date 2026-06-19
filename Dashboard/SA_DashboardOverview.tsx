import React from 'react';
import { Activity } from 'lucide-react';
const SA_DashboardOverview = () => (
    <div className="flex items-center justify-center h-[60vh] text-slate-500 flex-col">
       <Activity size={48} className="mb-4 text-indigo-500/50"/>
       <h2 className="text-2xl font-bold text-white">System Overview</h2>
       <p>Global statistics will appear here soon.</p>
    </div>
);
export default SA_DashboardOverview;