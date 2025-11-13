import React, { useState, useEffect, useMemo } from 'react';
import { Template } from '../types';
import { X, RefreshCw, Search, LayoutGrid, List } from 'lucide-react';

const DEFAULT_TEMPLATE_URL = "https://docs.google.com/spreadsheets/d/e/2PACX-1vTV-HBT1ra1sdrTL_2DjT_wFvdASQILFfwmZx4nYmR-uv-8Y8rturIAWlKWqnDQBeLr65NpgiYpKV2K/pub?output=csv";

interface TemplateModalProps {
    isOpen: boolean;
    onClose: () => void;
    selectedTemplates: Template[];
    onSelectionChange: (templates: Template[]) => void;
    showMessage: (text: string, type: 'info' | 'success' | 'error') => void;
}

export const TemplateModal: React.FC<TemplateModalProps> = ({ isOpen, onClose, selectedTemplates, onSelectionChange, showMessage }) => {
    const [allTemplates, setAllTemplates] = useState<Template[]>([]);
    const [filteredTemplates, setFilteredTemplates] = useState<Template[]>([]);
    const [categories, setCategories] = useState<string[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
    const [searchTerm, setSearchTerm] = useState('');
    const [categoryFilter, setCategoryFilter] = useState('');
    const [hoveredTemplate, setHoveredTemplate] = useState<Template | null>(null);

    const selectedTemplateNames = useMemo(() => new Set(selectedTemplates.map(t => t.name)), [selectedTemplates]);

    const fetchTemplates = async () => {
        setIsLoading(true);
        showMessage("Memuat template dari Google Sheet...", 'info');
        try {
            // Add a cache-busting parameter to ensure the latest sheet is fetched
            const url = `${DEFAULT_TEMPLATE_URL}&timestamp=${new Date().getTime()}`;
            const response = await fetch(url);
            if (!response.ok) throw new Error(`Gagal mengambil CSV: ${response.statusText}`);
            const csvText = await response.text();
            const lines = csvText.trim().split(/\r?\n/);
            lines.shift();
            
            const templates = lines.map((line): Template | null => {
                const values = line.split(/,(?=(?:(?:[^"]*"){2})*[^"]*$)/).map(v => v.replace(/^"|"$/g, '').trim());
                if (values.length >= 4) {
                    const rawThumbnail = values[4] || '';
                    // Handle both full URLs and Google Drive IDs in the thumbnail column
                    const finalThumbnail = rawThumbnail && !rawThumbnail.startsWith('http')
                        ? `https://drive.google.com/uc?export=view&id=${rawThumbnail}`
                        : rawThumbnail;
                    
                    return { 
                        category: values[0] || 'Lainnya', 
                        name: values[1], 
                        description: values[2], 
                        prompt: values[3], 
                        thumbnail: finalThumbnail 
                    };
                }
                return null;
            }).filter((t): t is Template => t !== null && !!t.name && !!t.prompt);

            setAllTemplates(templates);
            setCategories(['', ...Array.from(new Set(templates.map(t => t.category)))]);
            showMessage(`Berhasil memuat ${templates.length} template.`, 'success');
        } catch (error) {
            console.error("Gagal memuat template:", error);
            showMessage("Gagal memuat template.", 'error');
        } finally {
            setIsLoading(false);
        }
    };
    
    useEffect(() => {
        fetchTemplates();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    useEffect(() => {
        let result = allTemplates;
        if (categoryFilter) {
            result = result.filter(t => t.category === categoryFilter);
        }
        if (searchTerm) {
            const lowerSearch = searchTerm.toLowerCase();
            result = result.filter(t => 
                t.name.toLowerCase().includes(lowerSearch) ||
                t.description.toLowerCase().includes(lowerSearch) ||
                t.prompt.toLowerCase().includes(lowerSearch)
            );
        }
        setFilteredTemplates(result);
    }, [searchTerm, categoryFilter, allTemplates]);


    const handleTemplateClick = (template: Template) => {
        const isSelected = selectedTemplateNames.has(template.name);
        if (isSelected) {
            onSelectionChange(selectedTemplates.filter(t => t.name !== template.name));
        } else {
            onSelectionChange([...selectedTemplates, template]);
        }
    };

    if (!isOpen) return null;

    // FIX: Use a generic type parameter for reduce for clearer type inference.
    const groupedTemplates = filteredTemplates.reduce<Record<string, Template[]>>((acc, template) => {
        (acc[template.category] = acc[template.category] || []).push(template);
        return acc;
    }, {});

    return (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 z-50" onClick={onClose}>
            <div className="bg-white rounded-xl shadow-2xl w-full max-w-6xl overflow-hidden flex flex-col h-[90vh]" onClick={e => e.stopPropagation()}>
                {/* Header */}
                <div className="flex items-center justify-between px-4 py-3 border-b border-slate-200 gap-2">
                    <button onClick={onClose} className="p-2 rounded-md bg-slate-100 hover:bg-slate-200" title="Tutup"><X className="w-4 h-4" /></button>
                    <button onClick={() => setViewMode(v => v === 'grid' ? 'list' : 'grid')} className="p-2 rounded-md bg-slate-100 hover:bg-slate-200" title="Ubah tampilan">
                        {viewMode === 'grid' ? <LayoutGrid className="w-4 h-4"/> : <List className="w-4 h-4" />}
                    </button>
                    <div className="flex-1 relative">
                        <Search className="w-4 h-4 text-slate-600 absolute left-2 top-1/2 -translate-y-1/2" />
                        <input type="text" value={searchTerm} onChange={e => setSearchTerm(e.target.value)} className="w-full pl-8 p-2 border border-slate-300 rounded-md text-xs bg-white" placeholder="Cari template..." />
                    </div>
                    <select value={categoryFilter} onChange={e => setCategoryFilter(e.target.value)} className="p-2 border border-slate-300 rounded-md text-xs bg-white">
                        {categories.map(c => <option key={c} value={c}>{c || 'Semua Kategori'}</option>)}
                    </select>
                    <button onClick={fetchTemplates} className="p-1.5 rounded-md bg-blue-50 hover:bg-blue-100 text-blue-600" title="Sinkronisasi Template"><RefreshCw className="w-4 h-4" /></button>
                </div>

                {/* Body */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 flex-1 overflow-hidden px-2">
                    <div className="lg:col-span-2 p-4 lg:border-r border-slate-200 h-full overflow-y-auto">
                        {isLoading ? <div className="text-center">Loading templates...</div> :
                            Object.entries(groupedTemplates).map(([category, templates]) => (
                                <div key={category}>
                                    <h3 className="text-xs font-semibold text-slate-600 uppercase tracking-wide col-span-full mt-4 first:mt-0">{category}</h3>
                                    <div className={viewMode === 'grid' ? 'grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4' : 'flex flex-col gap-2'}>
                                        {/* FIX: Cast `templates` to `Template[]` because `Object.entries` weakens the type to `unknown`. */}
                                        {(templates as Template[]).map(template => (
                                            <button key={template.name} onClick={() => handleTemplateClick(template)} onMouseEnter={() => setHoveredTemplate(template)}
                                                className={`p-2 rounded-md bg-white hover:bg-slate-50 border transition-colors ${selectedTemplateNames.has(template.name) ? 'border-blue-500 ring-2 ring-blue-500' : 'border-slate-200'}`}>
                                                <img src={template.thumbnail || `https://placehold.co/150x150/e2e8f0/64748b?text=${encodeURIComponent(template.name.charAt(0))}`} alt={template.name} className={`${viewMode === 'grid' ? 'w-full h-auto aspect-square' : 'w-10 h-10'} object-cover rounded-sm`} />
                                                {viewMode === 'list' && <span className="text-sm font-medium text-slate-800 truncate">{template.name}</span>}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            ))
                        }
                    </div>
                    <div className="p-4 h-full overflow-y-auto hidden lg:block">
                        <div className="border border-slate-200 rounded-md overflow-hidden bg-slate-50">
                            <img src={hoveredTemplate?.thumbnail || 'https://placehold.co/480x320/94a3b8/ffffff?text=Preview'} className="w-full h-auto object-cover" alt="Preview"/>
                        </div>
                        <div className="mt-3">
                            <h3 className="text-sm font-semibold text-slate-800">{hoveredTemplate?.name || 'Tidak ada template terpilih'}</h3>
                            <p className="text-xs text-slate-700">{hoveredTemplate?.description || 'Pilih salah satu template di kiri untuk melihat detail prompt.'}</p>
                            <pre className="mt-2 p-2 bg-slate-100 rounded text-[11px] text-slate-800 whitespace-pre-wrap">{hoveredTemplate?.prompt}</pre>
                        </div>
                    </div>
                </div>

                {/* Footer */}
                <div className="px-4 py-2 flex items-center justify-between gap-3 bg-white border-t border-slate-200">
                    <div className="text-xs text-slate-700">Dipilih: {selectedTemplates.length} template</div>
                    <div className="flex items-center gap-2">
                         <button onClick={() => onSelectionChange([])} className="px-3 py-1.5 text-sm rounded-md border border-slate-300 text-slate-800 hover:bg-slate-100">Deselect All</button>
                        <button onClick={onClose} className="px-4 py-2 text-sm rounded-md bg-blue-600 text-white hover:bg-blue-700">Selesai</button>
                    </div>
                </div>
            </div>
        </div>
    );
};