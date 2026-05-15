import React, { useState, useRef, useEffect } from 'react';
import { Search, Plus, Check, ChevronDown } from 'lucide-react';

export default function ComboBox({ 
    options = [], 
    value = '', 
    onChange, 
    placeholder = 'Select...', 
    label = '',
    allowCustom = true,
    className = ""
}) {
    const [isOpen, setIsOpen] = useState(false);
    const [search, setSearch] = useState('');
    const containerRef = useRef(null);

    // Filter options based on search
    const filteredOptions = options.filter(opt => 
        (typeof opt === 'string' ? opt : opt.name)
            .toLowerCase()
            .includes(search.toLowerCase())
    );

    // Close on click outside
    useEffect(() => {
        const handleClickOutside = (event) => {
            if (containerRef.current && !containerRef.current.contains(event.target)) {
                setIsOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const handleSelect = (val) => {
        onChange(val);
        setIsOpen(false);
        setSearch('');
    };

    return (
        <div className={`space-y-1.5 relative ${className}`} ref={containerRef}>
            {label && <label className="text-[9px] font-black uppercase tracking-widest text-white/30 ml-2">{label}</label>}
            
            <div 
                onClick={() => setIsOpen(!isOpen)}
                className="w-full glass-panel border-white/5 bg-black/20 px-5 py-4 rounded-xl flex justify-between items-center cursor-pointer hover:border-white/10 transition-all border group"
            >
                <span className={`text-xs ${value ? 'text-white' : 'text-white/20'}`}>
                    {value || placeholder}
                </span>
                <ChevronDown size={14} className={`text-white/20 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
            </div>

            {isOpen && (
                <div className="absolute z-[60] left-0 right-0 mt-2 glass-panel border-white/10 bg-[#0A1225] shadow-[0_20px_50px_rgba(0,0,0,0.5)] rounded-2xl overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200">
                    <div className="p-3 border-b border-white/5 relative">
                        <Search size={12} className="absolute left-6 top-1/2 -translate-y-1/2 text-white/20" />
                        <input 
                            autoFocus
                            placeholder="Search or type custom..."
                            className="w-full bg-white/5 border-white/5 rounded-lg pl-10 pr-4 py-2.5 text-xs text-white focus:outline-none focus:border-primary/40 border"
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            onClick={(e) => e.stopPropagation()}
                        />
                    </div>

                    <div className="max-h-60 overflow-y-auto custom-scrollbar">
                        {filteredOptions.length > 0 ? (
                            filteredOptions.map((opt, idx) => {
                                const val = typeof opt === 'string' ? opt : opt.name;
                                return (
                                    <div 
                                        key={idx}
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            handleSelect(val);
                                        }}
                                        className="px-4 py-3 text-xs text-white/70 hover:text-white hover:bg-white/5 cursor-pointer flex items-center justify-between group"
                                    >
                                        <span>{val}</span>
                                        {value === val && <Check size={12} className="text-primary" />}
                                    </div>
                                );
                            })
                        ) : (
                            <div className="px-4 py-8 text-center">
                                <p className="text-[10px] text-white/20 uppercase font-black tracking-widest">No results found</p>
                            </div>
                        )}

                        {allowCustom && search && !filteredOptions.includes(search) && (
                            <div 
                                onClick={(e) => {
                                    e.stopPropagation();
                                    handleSelect(search);
                                }}
                                className="px-4 py-3 bg-primary/5 text-xs text-primary hover:bg-primary/10 cursor-pointer flex items-center gap-2 border-t border-white/5"
                            >
                                <Plus size={12} />
                                <span>Add "<span className="font-bold">{search}</span>" as Custom</span>
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}
