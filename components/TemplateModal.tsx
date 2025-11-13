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
                    let finalThumbnail = rawThumbnail; // Default to the original value

                    try {
                        // Check if it's a Google Drive URL
                        if (rawThumbnail.includes('drive.google.com')) {
                            let fileId = null;
                            // Case 1: URL has query params (e.g., /uc?id=... or /uc?export=view&id=...)
                            if (rawThumbnail.includes('?')) {
                                const url = new URL(rawThumbnail);
                                fileId = url.searchParams.get('id');
                            }
                            // Case 2: URL is in the format /d/FILE_ID/
                            else {
                                const match = rawThumbnail.match(/d\/([a-zA-Z0-9_-]+)/);
                                if (match && match[1]) {
                                    fileId = match[1];
                                }
                            }
                            
                            if (fileId) {
                                // Reconstruct to a more reliable direct-view URL for embedding
                                finalThumbnail = `https://drive.google.com/uc?id=${fileId}`;
                            }
                        } else if (rawThumbnail && !rawThumbnail.startsWith('http')) {
                            // Case 3: The cell contains only the file ID
                            finalThumbnail = `https://drive.google.com/uc?id=${rawThumbnail}`;
                        }
                    } catch (e) {
                        // If URL parsing fails, quietly use the original URL.
                        console.warn('Error parsing thumbnail URL, using original:', rawThumbnail, e);
                    }
                    
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
        if (isOpen) {
            fetchTemplates();
        }
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [isOpen]);

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

    const groupedTemplates = filteredTemplates.reduce<Record<string, Template[]>>((acc, template) => {
        (acc[template.category] = acc[template.category] || []).push(template);
        return acc;
    }, {});

    return (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 z-50" onClick={onClose}>
            <div className="bg-white rounded-xl shadow-2xl w-full max-w-6xl overflow-hidden flex flex-col h-[90vh]" onClick={e => e.stopPropagation()}>
                {/* Header */}
                <div className="flex items-center justify-between px-4 py-3 border-b border-slate-200 gap-2 flex-wrap">
                    <div className="flex items-center gap-2">
                        <h2 className="text-lg font-semibold text-slate-900">Pilih Template</h2>
                        <button onClick={fetchTemplates} className="p-2 rounded-md bg-blue-50 hover:bg-blue-100 text-blue-600" title="Sinkronisasi Template">
                            <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
                        </button>
                    </div>
                    <div className="flex items-center gap-2 flex-1 min-w-[300px]">
                        <div className="flex-1 relative">
                            <Search className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                            <input type="text" value={searchTerm} onChange={e => setSearchTerm(e.target.value)} className="w-full pl-9 p-2 border border-slate-300 rounded-lg text-sm bg-white focus:ring-2 focus:ring-blue-500 focus:border-transparent" placeholder="Cari template..." />
                        </div>
                        <select value={categoryFilter} onChange={e => setCategoryFilter(e.target.value)} className="p-2 border border-slate-300 rounded-lg text-sm bg-white focus:ring-2 focus:ring-blue-500 focus:border-transparent">
                            {categories.map(c => <option key={c} value={c}>{c || 'Semua Kategori'}</option>)}
                        </select>
                         <button onClick={() => setViewMode(v => v === 'grid' ? 'list' : 'grid')} className="p-2 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-600" title="Ubah tampilan">
                            {viewMode === 'grid' ? <LayoutGrid className="w-5 h-5"/> : <List className="w-5 h-5" />}
                        </button>
                    </div>
                </div>

                {/* Body */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 flex-1 overflow-hidden">
                    <div className="lg:col-span-2 p-4 lg:border-r border-slate-200 h-full overflow-y-auto">
                        {isLoading ? (
                             <div className="flex items-center justify-center h-full">
                                <div className="spinner"></div>
                            </div>
                        ) :
                        Object.keys(groupedTemplates).length > 0 ? (
                            Object.entries(groupedTemplates).map(([category, templates]) => (
                                <div key={category} className="mb-6">
                                    <h3 className="text-sm font-semibold text-slate-800 uppercase tracking-wide col-span-full mb-3 pb-2 border-b">{category}</h3>
                                    <div className={viewMode === 'grid' ? 'grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4' : 'flex flex-col gap-2'}>
                                        {/* FIX: Add Array.isArray check as a type guard to prevent type errors. */}
                                        {Array.isArray(templates) && templates.map(template => (
                                            <button key={template.name} onClick={() => handleTemplateClick(template)} onMouseEnter={() => setHoveredTemplate(template)}
                                                className={`p-2 rounded-lg bg-white hover:bg-slate-50 border-2 transition-all duration-200 text-left relative group ${selectedTemplateNames.has(template.name) ? 'border-blue-500 ring-2 ring-blue-500/50' : 'border-slate-200'}`}>
                                                <img src={template.thumbnail || `https://placehold.co/150x150/e2e8f0/64748b?text=${encodeURIComponent(template.name.charAt(0))}`} alt={template.name} className={`${viewMode === 'grid' ? 'w-full h-auto aspect-square' : 'w-10 h-10'} object-cover rounded-md mb-2`} />
                                                <span className="text-xs font-medium text-slate-900 line-clamp-2">{template.name}</span>
                                                {selectedTemplateNames.has(template.name) && (
                                                    <div className="absolute top-1 right-1 w-4 h-4 bg-blue-500 rounded-full text-white flex items-center justify-center text-xs">✓</div>
                                                )}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            ))
                         ) : (
                            <div className="text-center text-slate-700 py-10">
                                <p className="font-semibold">Tidak ada template ditemukan</p>
                                <p className="text-sm">Coba ubah filter atau kata kunci pencarian Anda.</p>
                            </div>
                         )
                        }
                    </div>
                    <div className="p-4 h-full overflow-y-auto hidden lg:block bg-slate-50">
                         <div className="sticky top-0">
                            <h3 className="font-semibold text-slate-900 mb-2">Pratinjau</h3>
                            <div className="border border-slate-200 rounded-lg overflow-hidden bg-white shadow-sm">
                                <img src={hoveredTemplate?.thumbnail || 'https://placehold.co/480x320/e2e8f0/9ca3af?text=Arahkan+ke+Template'} className="w-full h-auto object-cover aspect-[4/3]" alt="Preview"/>
                            </div>
                            <div className="mt-3">
                                <h4 className="text-sm font-semibold text-slate-900">{hoveredTemplate?.name || 'Tidak ada template terpilih'}</h4>
                                <p className="text-xs text-slate-700 mt-1">{hoveredTemplate?.description || 'Arahkan kursor ke salah satu template di kiri untuk melihat detailnya.'}</p>
                                <p className="text-xs font-semibold text-slate-900 mt-3 mb-1">Prompt:</p>
                                <pre className="mt-2 p-3 bg-slate-100 border border-slate-200 rounded text-[11px] text-slate-900 whitespace-pre-wrap font-mono">{hoveredTemplate?.prompt}</pre>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Footer */}
                <div className="px-4 py-3 flex items-center justify-between gap-3 bg-white border-t border-slate-200">
                    <div className="text-sm text-slate-800 font-medium">
                        <span className="font-bold text-blue-600">{selectedTemplates.length}</span> template dipilih
                    </div>
                    <div className="flex items-center gap-2">
                         <button onClick={() => onSelectionChange([])} className="px-4 py-2 text-sm rounded-lg border border-slate-300 text-slate-900 hover:bg-slate-100 font-semibold" disabled={selectedTemplates.length === 0}>
                            Hapus Pilihan
                        </button>
                        <button onClick={onClose} className="px-6 py-2 text-sm rounded-lg bg-blue-600 text-white hover:bg-blue-700 font-semibold">
                            Selesai
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};