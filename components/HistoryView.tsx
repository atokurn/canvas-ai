import React, { useState, useEffect } from 'react';
import { HistoryItem } from '../types';
import { loadHistory } from '../services/databaseService';
import { Download, Copy } from 'lucide-react';

interface HistoryViewProps {
    onImageClick: (imageUrl: string) => void;
}

const HistoryCard: React.FC<{ item: HistoryItem, onImageClick: (url: string) => void }> = ({ item, onImageClick }) => {
    const date = new Date(item.timestamp).toLocaleString('id-ID', {
        year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit'
    });

    const handleDownload = () => {
        const link = document.createElement('a');
        link.href = item.base64;
        link.download = `history_image_${item.id.substring(0, 8)}.png`;
        link.click();
    };

    const handleCopy = () => {
        navigator.clipboard.writeText(item.prompt);
    };

    return (
        <div className="flex flex-col sm:flex-row bg-white p-4 rounded-lg shadow-md hover:shadow-lg transition-shadow border border-slate-200">
            <img src={item.base64} alt="History" onClick={() => onImageClick(item.base64)} className="w-full sm:w-24 h-auto sm:h-24 object-cover rounded-md mb-3 sm:mb-0 sm:mr-4 border border-slate-300 cursor-pointer" />
            <div className="flex-1">
                <p className="text-xs text-slate-600 mb-1">{date} - ID: {item.id.substring(0, 8)}</p>
                <p className="font-medium text-slate-800 line-clamp-3" title={item.prompt}>{item.prompt}</p>
            </div>
            <div className="flex sm:flex-col justify-end gap-2 mt-3 sm:mt-0 sm:ml-4">
                <button onClick={handleDownload} className="p-2 rounded-full bg-green-100 hover:bg-green-200 text-green-700 transition-colors"><Download className="w-4 h-4" /></button>
                <button onClick={handleCopy} className="p-2 rounded-full bg-blue-100 hover:bg-blue-200 text-blue-700 transition-colors"><Copy className="w-4 h-4" /></button>
            </div>
        </div>
    );
};

export const HistoryView: React.FC<HistoryViewProps> = ({ onImageClick }) => {
    const [history, setHistory] = useState<HistoryItem[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchHistory = async () => {
            setLoading(true);
            const items = await loadHistory();
            setHistory(items);
            setLoading(false);
        };
        fetchHistory();
    }, []);

    if (loading) {
        return <div className="text-center text-slate-600 py-10">Loading history...</div>;
    }

    if (history.length === 0) {
        return <div className="text-center text-slate-600 py-10">Tidak ada riwayat. Hasilkan gambar untuk memulai!</div>;
    }

    return (
        <div id="history-container" className="space-y-4">
            {history.map(item => (
                <HistoryCard key={item.id} item={item} onImageClick={onImageClick} />
            ))}
        </div>
    );
};