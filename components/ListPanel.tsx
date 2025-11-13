import React, { useState, useEffect, useCallback, useRef } from 'react';
import { ListPrompt } from '../types';
import { ChevronDown, RefreshCw } from 'lucide-react';

const DEFAULT_LIST_EXAMPLE_URL = "https://docs.google.com/spreadsheets/d/e/2PACX-1vQLBAtKrciBdKf0A0UpkcwtgyegbOpQhrsw1Q7sSBw7Ttv1YGbpinSRJKTg0Cs3k_-Rzz6ig4UQNN_w/pub?output=csv";
const LIST_URL_KEY = 'geminiCanvasListUrl';


interface ListPanelProps {
    showMessage: (text: string, type: 'info' | 'success' | 'error') => void;
    onGenerate: (prompts: ListPrompt[], settings: any) => void;
    onBatchStart: () => void;
    isGlobalGenerating: boolean;
}

export const ListPanel: React.FC<ListPanelProps> = ({ showMessage, onGenerate, onBatchStart, isGlobalGenerating }) => {
    const [sheetUrl, setSheetUrl] = useState(localStorage.getItem(LIST_URL_KEY) || '');
    const [prompts, setPrompts] = useState<ListPrompt[]>([]);
    const [currentPromptIndex, setCurrentPromptIndex] = useState(0);
    const [isAccordionOpen, setAccordionOpen] = useState(false);
    const [isBatchRunning, setIsBatchRunning] = useState(false);

    // Settings
    const [intervalType, setIntervalType] = useState<'static' | 'random'>('static');
    const [staticInterval, setStaticInterval] = useState(5);
    const [minInterval, setMinInterval] = useState(5);
    const [maxInterval, setMaxInterval] = useState(30);
    const [autoDownload, setAutoDownload] = useState(false);
    const [repeatBatch, setRepeatBatch] = useState(false);
    const [repeatCount, setRepeatCount] = useState(0);
    const [autoSync, setAutoSync] = useState(false);
    const [disableHistory, setDisableHistory] = useState(false);

    const [imageCount, setImageCount] = useState(1);
    const [aspectRatio, setAspectRatio] = useState('1:1');

    // Timers
    const [countdown, setCountdown] = useState(0);
    const [totalTime, setTotalTime] = useState(0);
    const intervalRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const totalTimeRef = useRef<ReturnType<typeof setInterval> | null>(null);
    const countdownIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
    const repeatCounterRef = useRef(0);
    const activePromptRef = useRef<HTMLDivElement>(null);
    const isMounted = useRef(true);

    useEffect(() => {
        isMounted.current = true;
        return () => { isMounted.current = false; };
    }, []);
    
    const fetchPrompts = useCallback(async () => {
        showMessage("Memuat daftar prompt...", 'info');
        const urlToFetch = sheetUrl.trim() || DEFAULT_LIST_EXAMPLE_URL;
        try {
            const response = await fetch(urlToFetch);
            if (!response.ok) throw new Error("Gagal mengambil CSV.");
            const csvText = await response.text();
            const lines = csvText.trim().split('\n').slice(1);
            const fetchedPrompts = lines.map(line => {
                const promptText = line.split(',')[0].trim().replace(/^"|"$/g, '');
                return { prompt: promptText, name: promptText.substring(0, 50) + (promptText.length > 50 ? "..." : "") };
            }).filter(p => p.prompt);
            
            if (isMounted.current) {
                setPrompts(fetchedPrompts);
                showMessage(`Berhasil memuat ${fetchedPrompts.length} prompt.`, 'success');
            }
        } catch (error) {
            if (isMounted.current) {
                showMessage("Gagal memuat daftar prompt. Periksa URL.", 'error');
                setPrompts([]);
            }
        }
    }, [sheetUrl, showMessage]);

    const saveUrl = () => {
        localStorage.setItem(LIST_URL_KEY, sheetUrl);
        showMessage("URL disimpan!", 'success');
        fetchPrompts();
    };

    const stopBatch = useCallback((message: string, type: 'success' | 'info') => {
        setIsBatchRunning(false);
        showMessage(message, type);
        if (intervalRef.current) clearTimeout(intervalRef.current);
        if (totalTimeRef.current) clearInterval(totalTimeRef.current);
        if (countdownIntervalRef.current) clearInterval(countdownIntervalRef.current);
        setCurrentPromptIndex(0);
        setTotalTime(0);
        setCountdown(0);
        repeatCounterRef.current = 0;
    }, [showMessage]);

    const runNextTask = useCallback(async () => {
        let nextIndex = currentPromptIndex + 1;
        let didLoop = false;

        if (nextIndex >= prompts.length) {
            if (repeatBatch) {
                repeatCounterRef.current++;
                if (repeatCount > 0 && repeatCounterRef.current >= repeatCount) {
                    stopBatch("Batch selesai sesuai jumlah pengulangan.", 'success');
                    return;
                }
                if (autoSync) await fetchPrompts();
                nextIndex = 0;
                didLoop = true;
            } else {
                stopBatch("Batch selesai!", 'success');
                return;
            }
        }
        
        if (isMounted.current) {
            setCurrentPromptIndex(nextIndex);
            if (didLoop) {
                 showMessage(`Batch diulang (${repeatCounterRef.current}). Memulai prompt #1...`, 'info');
            }
        }

    }, [currentPromptIndex, prompts.length, repeatBatch, repeatCount, autoSync, fetchPrompts, stopBatch, showMessage]);
    
    
    useEffect(() => {
        if (!isBatchRunning) return;

        if (prompts.length === 0) {
            showMessage("Tidak ada prompt untuk dijalankan.", 'error');
            setIsBatchRunning(false);
            return;
        }

        const currentPrompt = prompts[currentPromptIndex];
        if (!currentPrompt) {
             stopBatch("Batch dihentikan: prompt tidak valid.", 'info');
             return;
        }
        
        onGenerate([currentPrompt], { imageCount, aspectRatio, disableHistory, autoDownload });

        const scheduleNext = () => {
            const interval = intervalType === 'static' ? staticInterval : Math.floor(Math.random() * (maxInterval - minInterval + 1)) + minInterval;
            setCountdown(interval);

            if (countdownIntervalRef.current) clearInterval(countdownIntervalRef.current);
            countdownIntervalRef.current = setInterval(() => setCountdown(c => Math.max(0, c - 1)), 1000);
            
            if (intervalRef.current) clearTimeout(intervalRef.current);
            intervalRef.current = setTimeout(runNextTask, interval * 1000);
        };
        
        // Schedule next task only after the current one is done (isGlobalGenerating is false)
        const checkGenerationStatus = setInterval(() => {
            if (!isGlobalGenerating) {
                clearInterval(checkGenerationStatus);
                if (isBatchRunning) { // Check if still running
                   scheduleNext();
                }
            }
        }, 100);
        
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [isBatchRunning, currentPromptIndex]);


    const handleToggleBatch = () => {
        if (isBatchRunning) {
            stopBatch("Batch dihentikan oleh pengguna.", 'info');
        } else {
            onBatchStart();
            setIsBatchRunning(true);
            setCurrentPromptIndex(0);
            setTotalTime(0);
            repeatCounterRef.current = 0;
            if (totalTimeRef.current) clearInterval(totalTimeRef.current);
            totalTimeRef.current = setInterval(() => {
                if(isMounted.current) setTotalTime(t => t + 1);
            }, 1000);
        }
    };


    useEffect(() => {
        if (!sheetUrl) fetchPrompts();
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);
    
    useEffect(() => {
        if (activePromptRef.current) {
            activePromptRef.current.scrollIntoView({
                behavior: 'smooth',
                block: 'nearest',
            });
        }
    }, [currentPromptIndex, isBatchRunning]);


    const formatTime = (seconds: number) => {
        const h = Math.floor(seconds / 3600).toString().padStart(2, '0');
        const m = Math.floor((seconds % 3600) / 60).toString().padStart(2, '0');
        const s = Math.floor(seconds % 60).toString().padStart(2, '0');
        return `${h}:${m}:${s}`;
    }

    return (
        <div className="space-y-3">
             <div className="p-3 bg-slate-50 rounded-lg border border-slate-200 space-y-2">
                <label htmlFor="list-sheet-url" className="text-sm font-semibold text-slate-800 block" title="Tempel URL dari Google Sheet yang dipublikasikan sebagai CSV.">URL Google Sheet (CSV)</label>
                <input type="text" id="list-sheet-url" value={sheetUrl} onChange={e => setSheetUrl(e.target.value)} disabled={isBatchRunning} className="w-full p-2 border border-slate-300 rounded-md text-xs" placeholder="Tempel URL ...pub?output=csv" />
                <div className="flex gap-2 justify-between items-center mt-2">
                    <a href={DEFAULT_LIST_EXAMPLE_URL} target="_blank" rel="noopener noreferrer" className="text-xs text-blue-600 hover:underline">Lihat Contoh</a>
                    <button onClick={saveUrl} disabled={isBatchRunning} className="text-xs py-1.5 px-3 rounded-md font-semibold bg-green-500 text-white hover:bg-green-600 disabled:bg-slate-400">Simpan</button>
                </div>
            </div>
            
             <div className="p-3 bg-slate-50 rounded-lg border border-slate-200">
                <label className="text-sm font-semibold text-slate-800 block">Status Batch</label>
                 <div className="mt-2 flex items-center justify-between text-xs">
                    <span className="font-medium text-slate-700">Total Prompt:</span>
                    <span className="font-bold text-blue-600">{prompts.length}</span>
                </div>
                <div className="mt-2 p-2 bg-white border border-slate-200 rounded-md h-28 overflow-y-auto space-y-1">
                    {prompts.length > 0 ? (
                        prompts.map((p, index) => (
                            <div
                                key={index}
                                ref={index === currentPromptIndex ? activePromptRef : null}
                                className={`p-1.5 rounded text-xs truncate transition-colors duration-300 ${
                                    isBatchRunning && index === currentPromptIndex
                                        ? 'bg-blue-100 text-blue-800 font-semibold'
                                        : 'text-slate-700'
                                }`}
                                title={p.prompt}
                            >
                                {index + 1}. {p.name}
                            </div>
                        ))
                    ) : (
                        <div className="flex items-center justify-center h-full text-xs text-slate-500">
                            Daftar prompt akan muncul di sini.
                        </div>
                    )}
                </div>
                <div className="flex items-center justify-between mt-2">
                    <span className="text-xs font-medium text-slate-700">Sedang Berjalan:</span>
                    <span className="font-bold text-slate-800 text-xs truncate">{isBatchRunning ? `${currentPromptIndex + 1}/${prompts.length}` : 'N/A'}</span>
                </div>
                <div className="flex items-center justify-between mt-1">
                    <span className="text-xs font-medium text-slate-700">Prompt Berikutnya:</span>
                    <span className="font-bold text-cyan-600 text-xs">{isBatchRunning && prompts.length > 1 ? `${countdown}s` : '--'}</span>
                </div>
                <div className="flex items-center justify-between mt-3 pt-3 border-t">
                    <span className="text-xs font-medium text-slate-700">Total Waktu Berjalan:</span>
                    <span className="font-bold text-slate-800 text-xs">{formatTime(totalTime)}</span>
                </div>
                <button onClick={fetchPrompts} disabled={isBatchRunning} className="w-full mt-3 text-xs text-center py-1.5 px-3 rounded-md font-semibold bg-blue-500 text-white hover:bg-blue-600 flex items-center justify-center gap-2 disabled:bg-slate-400">
                    <RefreshCw size={14} /> Sinkronisasi Daftar Prompt
                </button>
            </div>
            
            <div className="flex gap-3">
                <div className="flex-1 p-3 bg-gradient-to-r from-blue-50 to-cyan-50 rounded-lg border border-blue-200">
                    <label htmlFor="image-count-list" className="text-xs font-medium text-slate-800 block mb-2" title="Jumlah gambar yang akan dibuat untuk setiap prompt dalam daftar.">Jumlah Gambar/Prompt</label>
                    <input type="number" id="image-count-list" value={imageCount} onChange={e => setImageCount(Math.max(1, parseInt(e.target.value, 10)))} min="1" max="10" disabled={isBatchRunning} className="w-full p-2 border border-slate-300 rounded-md text-center text-xs" />
                </div>
                <div className="flex-1 p-3 bg-gradient-to-r from-blue-50 to-cyan-50 rounded-lg border border-blue-200">
                    <label htmlFor="select-aspect-ratio-list" className="text-xs font-medium text-slate-800 block mb-2" title="Rasio aspek untuk semua gambar yang dihasilkan.">Rasio Aspek</label>
                    <select id="select-aspect-ratio-list" value={aspectRatio} onChange={e => setAspectRatio(e.target.value)} disabled={isBatchRunning} className="w-full p-2 border border-slate-300 rounded-md text-xs">
                        <option value="1:1">1:1</option>
                        <option value="16:9">16:9</option>
                        <option value="9:16">9:16</option>
                        <option value="4:3">4:3</option>
                        <option value="3:4">3:4</option>
                    </select>
                </div>
            </div>

            <div className="border border-slate-200 rounded-lg bg-slate-50">
                <button onClick={() => setAccordionOpen(!isAccordionOpen)} className="w-full flex justify-between items-center p-3 text-sm font-semibold text-slate-800">
                    <span>Pengaturan System</span>
                    <ChevronDown className={`w-4 h-4 transition-transform duration-200 ${isAccordionOpen ? 'rotate-180' : ''}`} />
                </button>
                {isAccordionOpen && (
                    <div className="p-3 border-t border-slate-200 space-y-4">
                        <div title="Atur jeda antar prompt: Statis (detik yang sama setiap kali) atau Random (detik acak dalam rentang Min/Max).">
                            <label className="text-xs font-medium text-slate-800 block mb-2">Tipe Interval</label>
                            <select value={intervalType} onChange={e => setIntervalType(e.target.value as 'static' | 'random')} disabled={isBatchRunning} className="w-full p-2 border border-slate-300 rounded-md text-xs">
                                <option value="static">Statis (detik)</option>
                                <option value="random">Random (detik)</option>
                            </select>
                        </div>
                        {intervalType === 'static' ? (
                            <div title="Detik jeda antar prompt saat tipe Statis dipilih.">
                                <label className="text-xs font-medium text-slate-800 block mb-2">Interval Statis (detik)</label>
                                <input type="number" value={staticInterval} onChange={e => setStaticInterval(Number(e.target.value))} min="1" disabled={isBatchRunning} className="w-full p-2 border border-slate-300 rounded-md text-center text-xs"/>
                            </div>
                        ) : (
                            <div className="flex gap-2">
                                <div className="flex-1" title="Batas minimum jeda (detik) untuk tipe Random.">
                                    <label className="text-xs font-medium text-slate-800 block mb-2">Min (detik)</label>
                                    <input type="number" value={minInterval} onChange={e => setMinInterval(Number(e.target.value))} min="1" disabled={isBatchRunning} className="w-full p-2 border border-slate-300 rounded-md text-center text-xs"/>
                                </div>
                                <div className="flex-1" title="Batas maksimum jeda (detik) untuk tipe Random.">
                                    <label className="text-xs font-medium text-slate-800 block mb-2">Max (detik)</label>
                                    <input type="number" value={maxInterval} onChange={e => setMaxInterval(Number(e.target.value))} min="1" disabled={isBatchRunning} className="w-full p-2 border border-slate-300 rounded-md text-center text-xs"/>
                                </div>
                            </div>
                        )}
                        <div className="pt-2 border-t flex items-center justify-between" title="Jika aktif, setiap gambar yang berhasil dibuat akan otomatis diunduh ke perangkat Anda.">
                            <label className="text-sm font-semibold text-slate-800">Unduh Otomatis</label>
                            <input type="checkbox" checked={autoDownload} onChange={e => setAutoDownload(e.target.checked)} disabled={isBatchRunning} className="form-checkbox h-5 w-5 text-blue-600 rounded-md"/>
                        </div>
                        <div className="pt-2 border-t" title="Jika aktif, seluruh daftar prompt akan diulang dari awal setelah batch pertama selesai.">
                             <div className="flex items-center justify-between">
                                <label className="text-sm font-semibold text-slate-800">Ulangi Batch</label>
                                <input type="checkbox" checked={repeatBatch} onChange={e => setRepeatBatch(e.target.checked)} disabled={isBatchRunning} className="form-checkbox h-5 w-5 text-blue-600 rounded-md"/>
                             </div>
                             <div className="mt-2 flex items-center gap-2" title="Jumlah pengulangan batch. Masukkan 0 untuk pengulangan tanpa batas.">
                                 <label className="text-xs font-medium text-slate-800">Jumlah Pengulangan</label>
                                 <input type="number" value={repeatCount} onChange={e => setRepeatCount(Number(e.target.value))} min="0" disabled={isBatchRunning} className="w-24 p-1.5 border rounded-md text-center text-xs" />
                             </div>
                        </div>
                         <div className="pt-2 border-t flex items-center justify-between" title="Jika aktif, daftar prompt akan dimuat ulang dari Google Sheet setiap kali batch diulang. Berguna untuk daftar yang dinamis.">
                            <label className="text-sm font-semibold text-slate-800">Sinkronisasi Otomatis</label>
                            <input type="checkbox" checked={autoSync} onChange={e => setAutoSync(e.target.checked)} disabled={isBatchRunning} className="form-checkbox h-5 w-5 text-blue-600 rounded-md"/>
                        </div>
                        <div className="pt-2 border-t flex items-center justify-between" title="Jika aktif, hasil dari Mode List tidak akan disimpan ke dalam tab Riwayat.">
                            <label className="text-sm font-semibold text-slate-800">Nonaktifkan Riwayat (Mode List)</label>
                            <input type="checkbox" checked={disableHistory} onChange={e => setDisableHistory(e.target.checked)} disabled={isBatchRunning} className="form-checkbox h-5 w-5 text-blue-600 rounded-md"/>
                        </div>
                    </div>
                )}
            </div>

            <button
                onClick={handleToggleBatch}
                disabled={isGlobalGenerating && !isBatchRunning}
                className={`w-full mt-4 font-semibold py-3 px-4 rounded-lg transition-all duration-200 shadow-lg text-white flex items-center justify-center gap-2 active:scale-95 ${
                    isBatchRunning ? 'bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700' : 'bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700'
                } disabled:from-slate-400 disabled:to-slate-500 disabled:cursor-not-allowed`}
            >
                {isBatchRunning ? 'Hentikan Batch' : 'Mulai Batch'}
            </button>
        </div>
    );
};