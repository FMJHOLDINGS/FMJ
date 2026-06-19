import React from 'react';

const StoreSummary: React.FC = () => {
  return (
    <div className="p-4 animate-fade-in flex flex-col h-full">
      <div className="bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-200 dark:border-slate-700 p-6 flex-1 flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-lg font-bold text-slate-700 dark:text-slate-300 mb-2">Store Summary Dashboard</h2>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Graphical overview, low stock alerts, and summary reports will appear here.
          </p>
        </div>
      </div>
    </div>
  );
};

export default StoreSummary;