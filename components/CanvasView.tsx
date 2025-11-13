import React, { useState, useEffect } from 'react';
import { GeneratedImage, HistoryItem } from '../types';
import { ImageCard } from './ImageCard';
import { HistoryView } from './HistoryView';
import { Download, Trash2 } from 'lucide-react';
import JSZip from 'jszip';
import { clearHistory } from '../services/databaseService';

interface CanvasViewProps {
    generatedImages: GeneratedImage[];
    onImageClick: (imageUrl: string) => void;
}

export const CanvasView: React.FC<CanvasViewProps> = ({ generatedImages, onImageClick }) => {
    const [view, setView] = useState<'canvas' | 'history'>('canvas');
    const [canDownload, setCanDownload] = useState(false);

    useEffect(() => {
        setCanDownload(generatedImages.some(img => img && img.base64));
    }, [generatedImages]);

    const handleDownloadZip = async () => {
        const validImages = generatedImages.filter(img => img && img.base64);
        if (validImages.length === 0) return;
        
        const zip = new JSZip();
        validImages.forEach((img, index) => {
            const base64Data = img.base64!.split(',')[1];
            zip.file(`image_${index + 1}.png`, base64Data, { base64: true });
        });
        
        const content = await zip.generateAsync({ type: "blob" });
        const link = document.createElement('a');
        link.href = URL.createObjectURL(content);
        link.download = `gemini_canvas_export_${Date.now()}.zip`;
        link.click();
        URL.revokeObjectURL(link.href);
    };

    const handleClearHistory = async () => {
        if (window.confirm('Are you sure you want to delete all history? This action cannot be undone.')) {
            await clearHistory();
            // Force re-render of history view
            setView('canvas'); 
            setTimeout(() => setView('history'), 0);
        }
    };

    return (
        <main className="w-full lg:w-2/3 xl:w-3/4 p-4 lg:p-8 min-h-screen lg:h-screen lg:overflow-y-auto">
            <header className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-8 pb-6 border-b-2 border-slate-200">
                <div className="flex items-center gap-6 mb-4 sm:mb-0">
                    <h2 onClick={() => setView('canvas')} className={`text-2xl cursor-pointer pb-2 transition-colors ${view === 'canvas' ? 'font-bold text-slate-900 border-b-2 border-blue-500' : 'font-medium text-slate-500 hover:text-slate-700'}`}>
                        Hasil
                    </h2>
                    <h2 onClick={() => setView('history')} className={`text-2xl cursor-pointer pb-2 transition-colors ${view === 'history' ? 'font-bold text-slate-900 border-b-2 border-blue-500' : 'font-medium text-slate-500 hover:text-slate-700'}`}>
                        Riwayat
                    </h2>
                </div>
                {view === 'canvas' && canDownload && (
                     <button onClick={handleDownloadZip} className="bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-white font-semibold py-2 px-5 rounded-lg transition-all duration-200 shadow-lg hover:shadow-xl flex items-center gap-2 active:scale-95">
                        <Download className="w-4 h-4" />
                        Download All (ZIP)
                    </button>
                )}
                 {view === 'history' && (
                     <button onClick={handleClearHistory} className="bg-gradient-to-r from-red-500 to-rose-600 hover:from-red-600 hover:to-rose-700 text-white font-semibold py-2 px-5 rounded-lg transition-all duration-200 shadow-lg hover:shadow-xl flex items-center gap-2 active:scale-95" title="Hapus semua riwayat">
                        <Trash2 className="w-4 h-4" />
                        Hapus Riwayat
                    </button>
                )}
            </header>

            {view === 'canvas' && (
                <div id="output-grid" className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-6">
                    {generatedImages.map((img, index) => (
                        <ImageCard key={index} image={img} onImageClick={onImageClick} />
                    ))}
                </div>
            )}

            {view === 'history' && <HistoryView onImageClick={onImageClick}/>}
        </main>
    );
};