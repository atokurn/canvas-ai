import React, { useState, useEffect, useCallback } from 'react';
import { Mode, Template, ListPrompt } from '../types';
import { TemplateModal } from './TemplateModal';
import { ListPanel } from './ListPanel';
import { ImageUploader } from './ImageUploader';
import { Sparkles } from 'lucide-react';

interface ControlPanelProps {
    onStandardGenerate: (options: any) => void;
    onBatchGenerate: (options: any) => void;
    onBatchStart: () => void;
    isGenerating: boolean;
    showMessage: (text: string, type: 'info' | 'success' | 'error') => void;
    message: { text: string; type: string } | null;
}

const RadioTab: React.FC<{ id: string, value: Mode, label: string, currentMode: Mode, onChange: (e: React.ChangeEvent<HTMLInputElement>) => void, disabled: boolean }> = ({ id, value, label, currentMode, onChange, disabled }) => (
    <>
        <input type="radio" id={id} name="mode" value={value} className="mode-radio" checked={currentMode === value} onChange={onChange} disabled={disabled} />
        <label htmlFor={id} className={`flex-1 text-center py-2 px-4 rounded-md font-medium text-sm transition-all duration-200 ${disabled ? 'cursor-not-allowed text-slate-500' : 'cursor-pointer hover:bg-slate-200 text-slate-800'}`}>
            {label}
        </label>
    </>
);

export const ControlPanel: React.FC<ControlPanelProps> = ({ onStandardGenerate, onBatchGenerate, onBatchStart, isGenerating, showMessage, message }) => {
    const [mode, setMode] = useState<Mode>('single');
    const [prompt, setPrompt] = useState('');
    const [imageCount, setImageCount] = useState(1);
    const [aspectRatio, setAspectRatio] = useState('1:1');
    const [optimizer, setOptimizer] = useState('off');
    
    const [subjectRefs, setSubjectRefs] = useState<string[]>([]);
    const [styleRefs, setStyleRefs] = useState<string[]>([]);

    const [isTemplateModalOpen, setTemplateModalOpen] = useState(false);
    const [selectedTemplates, setSelectedTemplates] = useState<Template[]>([]);
    
    const handleGenerateClick = () => {
        if (isGenerating) return;

        let prompts: string[] = [];
        if (mode === 'single') {
            if (!prompt.trim()) {
                showMessage("Silakan masukkan deskripsi gambar.", 'error');
                return;
            }
            prompts = [prompt];
        } else if (mode === 'template') {
            if (selectedTemplates.length === 0) {
                showMessage("Silakan pilih template terlebih dahulu.", 'error');
                return;
            }
            if (!prompt.trim() && subjectRefs.length === 0) {
                 showMessage("Silakan masukkan subjek atau unggah referensi subjek.", 'error');
                return;
            }
            prompts = selectedTemplates.map(t => t.prompt.replace(/\[SUBJECT\]/gi, prompt.trim()));
        }

        onStandardGenerate({
            mode,
            prompts,
            imageCount,
            aspectRatio,
            subjectRefs,
            styleRefs,
            optimizer: optimizer === 'image',
        });
    };
    
    const onBatchGeneration = (prompts: ListPrompt[], settings: any) => {
        onBatchGenerate({
            mode: 'list',
            prompts: prompts.map(p => p.prompt),
            imageCount: settings.imageCount,
            aspectRatio: settings.aspectRatio,
            subjectRefs: [], 
            styleRefs,
            optimizer: false,
            disableHistory: settings.disableHistory,
            autoDownload: settings.autoDownload,
        })
    }

    return (
        <>
            <aside className="w-full lg:w-1/3 xl:w-1/4 bg-white lg:h-screen shadow-xl lg:shadow-2xl flex flex-col border-r border-slate-200">
                <div className="flex-1 overflow-y-auto p-4 lg:p-6 space-y-6">
                    <header className="mb-6 pb-4 border-b-2 border-slate-200">
                        <div className="flex items-center gap-3 mb-2">
                            <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-cyan-500 rounded-lg flex items-center justify-center text-white">
                                <Sparkles className="w-6 h-6" />
                            </div>
                            <h1 className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-cyan-600 bg-clip-text text-transparent">Canvas AI</h1>
                        </div>
                        <p className="text-xs text-slate-600">Generasi gambar dengan teknologi Gemini</p>
                    </header>

                    {message && (
                        <div id="message-box" className={`p-3 rounded-lg text-sm font-medium text-center border ${
                            message.type === 'success' ? 'text-green-800 bg-green-100 border-green-300' :
                            message.type === 'error' ? 'text-red-800 bg-red-100 border-red-300' :
                            'text-blue-800 bg-blue-100 border-blue-300'
                        } ${isGenerating && message.type === 'info' ? 'animate-pulse' : ''}`}>
                            {message.text}
                        </div>
                    )}
                    
                    <section>
                        <label className="text-sm font-semibold text-slate-800 mb-2 block">Mode Input</label>
                        <div className="flex gap-1 p-1 bg-slate-100 rounded-lg border border-slate-200">
                            <RadioTab id="mode-single" value="single" label="Single" currentMode={mode} onChange={(e) => setMode(e.target.value as Mode)} disabled={isGenerating} />
                            <RadioTab id="mode-template" value="template" label="Template" currentMode={mode} onChange={(e) => setMode(e.target.value as Mode)} disabled={isGenerating} />
                            <RadioTab id="mode-list" value="list" label="List" currentMode={mode} onChange={(e) => setMode(e.target.value as Mode)} disabled={isGenerating} />
                        </div>
                    </section>
                    
                    <section className="space-y-4">
                        {mode === 'template' && (
                            <div id="panel-template">
                                <label className="text-sm font-semibold text-slate-800 mb-2 block">Template Gaya Terpilih</label>
                                <div id="selected-templates" className="grid grid-cols-2 sm:grid-cols-3 gap-2 mb-3">
                                  {selectedTemplates.map(t => (
                                      <div key={t.name} className="p-2 bg-slate-100 rounded text-xs truncate" title={t.name}>{t.name}</div>
                                  ))}
                                </div>
                                <div className="flex justify-between items-center">
                                    <span id="selected-templates-count" className="text-xs text-slate-700">{selectedTemplates.length} template dipilih</span>
                                    <button onClick={() => setTemplateModalOpen(true)} className="text-xs py-1.5 px-3 rounded-md font-semibold bg-blue-600 text-white hover:bg-blue-700" disabled={isGenerating}>Pilih Template</button>
                                </div>
                            </div>
                        )}

                        {mode === 'list' && <ListPanel showMessage={showMessage} onGenerate={onBatchGeneration} onBatchStart={onBatchStart} isGlobalGenerating={isGenerating} />}
                    </section>

                    <section className="space-y-3">
                        <h2 className="text-sm font-semibold text-slate-800">Pengaturan</h2>
                        
                        {(mode === 'single') && (
                            <div className="p-3 bg-gradient-to-r from-blue-50 to-cyan-50 rounded-lg border border-blue-200">
                                <label htmlFor="select-optimizer" className="text-xs font-medium text-slate-800 block mb-2">Optimasi Prompt</label>
                                <select id="select-optimizer" value={optimizer} onChange={e => setOptimizer(e.target.value)} disabled={isGenerating} className="w-full p-2 border border-slate-300 rounded-md text-xs focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white">
                                    <option value="off">Tidak (Gunakan Asli)</option>
                                    <option value="image">Ya (Per Gambar)</option>
                                </select>
                            </div>
                        )}
                        
                         {mode !== 'list' && (
                            <div className="flex gap-3">
                                <div className="flex-1 p-3 bg-gradient-to-r from-blue-50 to-cyan-50 rounded-lg border border-blue-200">
                                    <label htmlFor="image-count" className="text-xs font-medium text-slate-800 block mb-2">Jumlah Gambar</label>
                                    <input type="number" id="image-count" value={imageCount} onChange={e => setImageCount(Math.max(1, parseInt(e.target.value, 10)))} min="1" max="10" disabled={isGenerating} className="w-full p-2 border border-slate-300 rounded-md text-center text-xs focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white"/>
                                </div>
                                <div className="flex-1 p-3 bg-gradient-to-r from-blue-50 to-cyan-50 rounded-lg border border-blue-200">
                                    <label htmlFor="select-aspect-ratio" className="text-xs font-medium text-slate-800 block mb-2">Rasio Aspek</label>
                                    <select id="select-aspect-ratio" value={aspectRatio} onChange={e => setAspectRatio(e.target.value)} disabled={isGenerating} className="w-full p-2 border border-slate-300 rounded-md text-xs focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white">
                                        <option value="1:1">1:1</option>
                                        <option value="16:9">16:9</option>
                                        <option value="9:16">9:16</option>
                                        <option value="4:3">4:3</option>
                                        <option value="3:4">3:4</option>
                                    </select>
                                </div>
                            </div>
                        )}

                        {(mode === 'single' || mode === 'template') && (
                            <ImageUploader
                                id="subject-ref"
                                label="Referensi Subjek"
                                description="Gunakan untuk mempertahankan bentuk objek utama."
                                files={subjectRefs}
                                onFilesChange={setSubjectRefs}
                                showMessage={showMessage}
                                useCropper
                                disabled={isGenerating}
                            />
                        )}

                        <ImageUploader
                            id="style-ref"
                            label="Referensi Gaya"
                            description="Gunakan untuk tone, warna, dan tekstur."
                            files={styleRefs}
                            onFilesChange={setStyleRefs}
                            showMessage={showMessage}
                            useCropper
                            disabled={isGenerating}
                        />

                    </section>
                </div>
                
                <section className="p-4 lg:p-6 border-t-2 border-slate-200 space-y-3 bg-gradient-to-t from-slate-50 to-white">
                    {(mode === 'single' || mode === 'template') && (
                         <div id="panel-single">
                            <label htmlFor="prompt-single" className="text-sm font-semibold text-slate-800 mb-2 block">
                                {mode === 'template' ? 'Subjek Tambahan (opsional)' : 'Deskripsi Gambar / Subjek'}
                            </label>
                            <textarea id="prompt-single" rows={5} value={prompt} onChange={e => setPrompt(e.target.value)} disabled={isGenerating} className="w-full p-3 border-2 border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white placeholder:text-slate-500 text-sm resize-none" placeholder="Misalnya: Kucing berwarna emas sedang bermain di taman cyberpunk..."></textarea>
                        </div>
                    )}
                    
                    {mode !== 'list' && (
                         <button id="generate-btn" onClick={handleGenerateClick} disabled={isGenerating} className="w-full bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white font-semibold py-3 px-4 rounded-lg transition-all duration-200 shadow-lg hover:shadow-xl flex items-center justify-center gap-2 active:scale-95 disabled:from-slate-400 disabled:to-slate-500 disabled:cursor-not-allowed">
                            <Sparkles className={`w-5 h-5 ${isGenerating ? 'animate-spin' : ''}`} />
                            <span id="generate-btn-text">{isGenerating ? 'Menghasilkan...' : 'Hasilkan Gambar'}</span>
                        </button>
                    )}
                </section>
            </aside>
            <TemplateModal 
                isOpen={isTemplateModalOpen} 
                onClose={() => setTemplateModalOpen(false)} 
                selectedTemplates={selectedTemplates}
                onSelectionChange={setSelectedTemplates}
                showMessage={showMessage}
            />
        </>
    );
};