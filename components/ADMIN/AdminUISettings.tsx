import React, { useState, useEffect } from 'react';
import { Palette, Save, RotateCcw, LayoutTemplate, Type, Square } from 'lucide-react';

const AdminUISettings: React.FC = () => {
    // 🟢 Light Mode Colors
    const [lMain, setLMain] = useState(() => localStorage.getItem('c_l_main') || '#FAFAFA');
    const [lSide, setLSide] = useState(() => localStorage.getItem('c_l_side') || '#FFFFFF');
    const [lCard, setLCard] = useState(() => localStorage.getItem('c_l_card') || '#FFFFFF');
    const [lText, setLText] = useState(() => localStorage.getItem('c_l_text') || '#0F172A'); // text-slate-900

    // 🟢 Dark Mode Colors
    const [dMain, setDMain] = useState(() => localStorage.getItem('c_d_main') || '#020617');
    const [dSide, setDSide] = useState(() => localStorage.getItem('c_d_side') || '#0B1121');
    const [dCard, setDCard] = useState(() => localStorage.getItem('c_d_card') || '#060d23'); // text-slate-800
    const [dText, setDText] = useState(() => localStorage.getItem('c_d_text') || '#F8FAFC'); // text-slate-50

    const handleSave = () => {
        // Light
        localStorage.setItem('c_l_main', lMain);
        localStorage.setItem('c_l_side', lSide);
        localStorage.setItem('c_l_card', lCard);
        localStorage.setItem('c_l_text', lText);
        // Dark
        localStorage.setItem('c_d_main', dMain);
        localStorage.setItem('c_d_side', dSide);
        localStorage.setItem('c_d_card', dCard);
        localStorage.setItem('c_d_text', dText);
        
        alert("Advanced UI Colors Saved! The UI will update instantly.");
    };

    const handleReset = () => {
        if(!window.confirm("Reset all colors to system default?")) return;
        setLMain('#FAFAFA'); setLSide('#FFFFFF'); setLCard('#FFFFFF'); setLText('#0F172A');
        setDMain('#020617'); setDSide('#0B1121'); setDCard('#060d23'); setDText('#F8FAFC');
        
        localStorage.removeItem('c_l_main'); localStorage.removeItem('c_l_side');
        localStorage.removeItem('c_l_card'); localStorage.removeItem('c_l_text');
        localStorage.removeItem('c_d_main'); localStorage.removeItem('c_d_side');
        localStorage.removeItem('c_d_card'); localStorage.removeItem('c_d_text');
        alert("Colors Reset to Default!");
    };

    return (
        <div className="bg-white dark:bg-slate-800 p-8 rounded-3xl border border-slate-200 dark:border-slate-700 shadow-sm animate-fade-in max-w-4xl mx-auto">
            
            <div className="flex items-center gap-4 mb-8">
                <div className="p-3 bg-fuchsia-100 dark:bg-fuchsia-900/30 text-fuchsia-600 dark:text-fuchsia-400 rounded-2xl">
                    <Palette size={24} />
                </div>
                <div>
                    <h3 className="text-xl font-black text-slate-800 dark:text-white uppercase tracking-tight">Advanced UI Colors</h3>
                    <p className="text-xs font-bold text-slate-500 uppercase tracking-widest mt-1">Full control over every UI element</p>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                {/* ☀️ LIGHT MODE SETTINGS */}
                <div className="space-y-4">
                    <h4 className="text-sm font-black text-amber-500 uppercase flex items-center gap-2 border-b border-slate-200 dark:border-slate-700 pb-2">
                        ☀️ Light Mode Theme
                    </h4>
                    <ColorPicker label="Main Background" icon={LayoutTemplate} val={lMain} setVal={setLMain} />
                    <ColorPicker label="Sidebar & Header" icon={Square} val={lSide} setVal={setLSide} />
                    <ColorPicker label="Cards & Tables" icon={Square} val={lCard} setVal={setLCard} />
                    <ColorPicker label="Primary Text" icon={Type} val={lText} setVal={setLText} />
                </div>

                {/* 🌙 DARK MODE SETTINGS */}
                <div className="space-y-4">
                    <h4 className="text-sm font-black text-indigo-400 uppercase flex items-center gap-2 border-b border-slate-200 dark:border-slate-700 pb-2">
                        🌙 Dark Mode Theme
                    </h4>
                    <ColorPicker label="Main Background" icon={LayoutTemplate} val={dMain} setVal={setDMain} />
                    <ColorPicker label="Sidebar & Header" icon={Square} val={dSide} setVal={setDSide} />
                    <ColorPicker label="Cards & Tables" icon={Square} val={dCard} setVal={setDCard} />
                    <ColorPicker label="Primary Text" icon={Type} val={dText} setVal={setDText} />
                </div>
            </div>

            <div className="flex gap-4 mt-10 pt-6 border-t border-slate-200 dark:border-slate-700">
                <button onClick={handleReset} className="flex-1 py-3 bg-slate-200 hover:bg-slate-300 dark:bg-slate-700 dark:hover:bg-slate-600 text-slate-700 dark:text-white rounded-xl font-black text-xs uppercase tracking-widest flex items-center justify-center gap-2 transition-colors">
                    <RotateCcw className="w-4 h-4" /> Reset Default
                </button>
                <button onClick={handleSave} className="flex-[2] py-3 bg-fuchsia-500 hover:bg-fuchsia-600 text-white rounded-xl font-black text-xs uppercase tracking-widest flex items-center justify-center gap-2 shadow-lg shadow-fuchsia-500/20 active:scale-95 transition-all">
                    <Save className="w-4 h-4" /> Save Colors
                </button>
            </div>
        </div>
    );
};

// --- Reusable Color Picker Component ---
const ColorPicker = ({ label, icon: Icon, val, setVal }: any) => (
    <div className="flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-900/50 rounded-xl border border-slate-200 dark:border-slate-700">
        <div className="flex items-center gap-3">
            <Icon size={16} className="text-slate-400" />
            <span className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase">{label}</span>
        </div>
        <div className="flex items-center gap-2">
            <input type="text" value={val} onChange={(e) => setVal(e.target.value)} className="w-20 px-2 py-1 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 rounded text-xs font-bold text-slate-700 dark:text-slate-200 text-center uppercase focus:outline-none" />
            <input type="color" value={val} onChange={(e) => setVal(e.target.value)} className="w-8 h-8 rounded cursor-pointer border-0 bg-transparent p-0" />
        </div>
    </div>
);

export default AdminUISettings;