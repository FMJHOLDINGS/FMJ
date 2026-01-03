import React, { useState, useRef, useEffect, useMemo } from 'react';
import { ChevronDown, Search, Check, X } from 'lucide-react';

interface MultiSelectDropdownProps {
    label: string;
    options: string[];
    selected: string[];
    onChange: (selected: string[]) => void;
    icon?: React.ReactNode;
}

const MultiSelectDropdown: React.FC<MultiSelectDropdownProps> = ({
    label,
    options,
    selected,
    onChange,
    icon,
}) => {
    const [isOpen, setIsOpen] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const dropdownRef = useRef<HTMLDivElement>(null);

    // Close dropdown when clicking outside
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const filteredOptions = useMemo(() => {
        return options.filter(opt =>
            opt.toLowerCase().includes(searchQuery.toLowerCase())
        );
    }, [options, searchQuery]);

    const toggleOption = (option: string) => {
        if (selected.includes(option)) {
            onChange(selected.filter(item => item !== option));
        } else {
            onChange([...selected, option]);
        }
    };

    const handleSelectAll = () => {
        if (filteredOptions.length === 0) return;

        // If all filtered options are already selected, deselect them
        const allFilteredSelected = filteredOptions.every(opt => selected.includes(opt));

        if (allFilteredSelected) {
            // Remove filtered options from selected
            onChange(selected.filter(item => !filteredOptions.includes(item)));
        } else {
            // Add missing filtered options
            const newSelected = [...selected];
            filteredOptions.forEach(opt => {
                if (!newSelected.includes(opt)) {
                    newSelected.push(opt);
                }
            });
            onChange(newSelected);
        }
    };

    const clearSelection = (e: React.MouseEvent) => {
        e.stopPropagation();
        onChange([]);
    };

    return (
        <div className="relative" ref={dropdownRef}>
            <button
                onClick={() => setIsOpen(!isOpen)}
                className={`h-11 px-4 rounded-xl flex items-center gap-3 border transition-all min-w-[200px] ${isOpen
                        ? 'bg-indigo-50 border-indigo-500 dark:bg-indigo-900/20 dark:border-indigo-500'
                        : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 hover:border-indigo-300 dark:hover:border-indigo-700'
                    }`}
            >
                {icon && <span className="text-slate-400">{icon}</span>}
                <div className="text-left flex flex-col flex-1 mr-2">
                    <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">
                        {label}
                    </span>
                    <span className="text-xs font-black text-slate-700 dark:text-slate-200 truncate max-w-[140px]">
                        {selected.length === 0
                            ? `All ${label}s`
                            : selected.length === 1
                                ? selected[0]
                                : `${selected.length} Selected`
                        }
                    </span>
                </div>

                {selected.length > 0 ? (
                    <div onClick={clearSelection} className="p-0.5 rounded-full hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors mr-1">
                        <X className="w-3.5 h-3.5 text-slate-400" />
                    </div>
                ) : (
                    <ChevronDown
                        className={`w-3.5 h-3.5 text-slate-400 transition-transform ${isOpen ? 'rotate-180' : ''
                            }`}
                    />
                )}
            </button>

            {isOpen && (
                <div className="absolute top-full left-0 mt-2 w-64 bg-white dark:bg-slate-800 rounded-xl shadow-xl shadow-slate-200/50 dark:shadow-black/50 border border-slate-100 dark:border-slate-700 overflow-hidden z-[60] animate-in fade-in zoom-in-95 duration-100 flex flex-col">

                    {/* Search Bar */}
                    <div className="p-2 border-b border-slate-100 dark:border-slate-700/50 sticky top-0 bg-white dark:bg-slate-800 z-10">
                        <div className="relative">
                            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
                            <input
                                type="text"
                                placeholder={`Search ${label}...`}
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="w-full pl-8 pr-3 py-2 bg-slate-50 dark:bg-slate-900 rounded-lg text-xs font-bold text-slate-700 dark:text-slate-300 outline-none focus:ring-1 focus:ring-indigo-500/50 border border-transparent focus:border-indigo-500/30 transition-all placeholder:text-slate-400"
                                autoFocus
                            />
                        </div>
                    </div>

                    {/* Options List */}
                    <div className="max-h-64 overflow-y-auto custom-scrollbar p-1.5 space-y-0.5">
                        {/* Select All Option */}
                        {filteredOptions.length > 0 && (
                            <div
                                onClick={handleSelectAll}
                                className="px-3 py-2 rounded-lg cursor-pointer flex items-center gap-3 text-xs font-bold transition-colors text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-900/20"
                            >
                                <div className={`w-4 h-4 rounded border flex items-center justify-center transition-all ${filteredOptions.every(opt => selected.includes(opt))
                                        ? 'bg-indigo-500 border-indigo-500'
                                        : 'border-indigo-300 dark:border-indigo-700 bg-white dark:bg-slate-900'
                                    }`}>
                                    {filteredOptions.every(opt => selected.includes(opt)) && <Check className="w-3 h-3 text-white" strokeWidth={3} />}
                                </div>
                                <span>Select All</span>
                            </div>
                        )}

                        {filteredOptions.length === 0 ? (
                            <div className="px-4 py-8 text-center">
                                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">No results found</p>
                            </div>
                        ) : (
                            filteredOptions.map(opt => {
                                const isSelected = selected.includes(opt);
                                return (
                                    <div
                                        key={opt}
                                        onClick={() => toggleOption(opt)}
                                        className={`px-3 py-2 rounded-lg cursor-pointer flex items-center gap-3 text-xs font-medium transition-colors ${isSelected
                                                ? 'bg-indigo-50 dark:bg-indigo-900/10 text-indigo-700 dark:text-indigo-300'
                                                : 'text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700/50'
                                            }`}
                                    >
                                        <div className={`w-4 h-4 rounded border flex items-center justify-center transition-all ${isSelected
                                                ? 'bg-indigo-500 border-indigo-500 shadow-sm shadow-indigo-500/30'
                                                : 'border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900'
                                            }`}>
                                            {isSelected && <Check className="w-3 h-3 text-white" strokeWidth={3} />}
                                        </div>
                                        <span>{opt}</span>
                                    </div>
                                );
                            })
                        )}
                    </div>

                    {/* Footer with counts */}
                    <div className="px-3 py-2 bg-slate-50 dark:bg-slate-900/50 border-t border-slate-100 dark:border-slate-700 text-[10px] font-bold text-slate-400 flex justify-between items-center">
                        <span>{selected.length} selected</span>
                        {selected.length > 0 && (
                            <button onClick={() => onChange([])} className="text-rose-500 hover:text-rose-600 transition-colors uppercase tracking-wider">
                                Clear
                            </button>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
};

export default MultiSelectDropdown;
