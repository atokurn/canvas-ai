import React, { useState, useRef, useEffect, useCallback } from 'react';
import { CropRect } from '../types';
import { X } from 'lucide-react';

interface CropModalProps {
    isOpen: boolean;
    imageSrc: string | null;
    onClose: () => void;
    onApply: (croppedDataUrl: string) => void;
}

const MIN_CROP_SIZE = 50;
const HANDLE_SIZE = 10;
const handles = ['top-left', 'top-right', 'bottom-left', 'bottom-right', 'top', 'bottom', 'left', 'right'];
const aspectRatios = ['Free', '1:1', '4:3', '3:4', '16:9', '9:16'];

const parseAspectRatio = (ratioStr: string): number | null => {
    if (ratioStr === 'Free') return null;
    const parts = ratioStr.split(':');
    if (parts.length !== 2) return null;
    const w = parseFloat(parts[0]);
    const h = parseFloat(parts[1]);
    if (isNaN(w) || isNaN(h) || h === 0) return null;
    return w / h;
};

export const CropModal: React.FC<CropModalProps> = ({ isOpen, imageSrc, onClose, onApply }) => {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const previewCanvasRef = useRef<HTMLCanvasElement>(null);
    const imageRef = useRef<HTMLImageElement>(new Image());
    const [cropRect, setCropRect] = useState<CropRect>({ x: 10, y: 10, w: 200, h: 200 });
    const [dragState, setDragState] = useState<{ mode: 'move' | 'resize' | null, handle: string | null, startX: number, startY: number, startRect: CropRect | null }>({ mode: null, handle: null, startX: 0, startY: 0, startRect: null });
    const [aspectRatio, setAspectRatio] = useState('Free');

    const getHandlePositions = useCallback((rect: CropRect): Record<string, { x: number, y: number }> => {
        const hs = HANDLE_SIZE / 2;
        return {
            'top-left': { x: rect.x - hs, y: rect.y - hs },
            'top-right': { x: rect.x + rect.w - hs, y: rect.y - hs },
            'bottom-left': { x: rect.x - hs, y: rect.y + rect.h - hs },
            'bottom-right': { x: rect.x + rect.w - hs, y: rect.y + rect.h - hs },
            'top': { x: rect.x + rect.w / 2 - hs, y: rect.y - hs },
            'bottom': { x: rect.x + rect.w / 2 - hs, y: rect.y + rect.h - hs },
            'left': { x: rect.x - hs, y: rect.y + rect.h / 2 - hs },
            'right': { x: rect.x + rect.w - hs, y: rect.y + rect.h / 2 - hs },
        };
    }, []);

    const draw = useCallback(() => {
        const canvas = canvasRef.current;
        const ctx = canvas?.getContext('2d');
        const previewCanvas = previewCanvasRef.current;
        const img = imageRef.current;

        if (!canvas || !ctx || !previewCanvas || !img.src) return;

        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

        ctx.save();
        ctx.fillStyle = 'rgba(0,0,0,0.5)';
        ctx.beginPath();
        ctx.rect(0, 0, canvas.width, canvas.height);
        ctx.rect(cropRect.x, cropRect.y, cropRect.w, cropRect.h);
        ctx.fill('evenodd');
        ctx.restore();

        ctx.strokeStyle = '#38bdf8';
        ctx.lineWidth = 2;
        ctx.strokeRect(cropRect.x, cropRect.y, cropRect.w, cropRect.h);

        ctx.fillStyle = '#38bdf8';
        const handlePositions = getHandlePositions(cropRect);
        Object.values(handlePositions).forEach((pos: {x: number, y: number}) => {
            ctx.fillRect(pos.x, pos.y, HANDLE_SIZE, HANDLE_SIZE);
        });
        
        // Dynamically set preview canvas dimensions to match crop aspect ratio
        if (cropRect.h > 0) {
            const previewAspectRatio = cropRect.w / cropRect.h;
            // The container's width is defined as 16rem (256px) in the parent grid
            const previewWidth = 256;
            const previewHeight = previewWidth / previewAspectRatio;
            
            if (previewCanvas.width !== previewWidth) {
                previewCanvas.width = previewWidth;
            }
            if (previewCanvas.height !== previewHeight) {
                previewCanvas.height = previewHeight;
            }
        }
        
        const previewCtx = previewCanvas.getContext('2d');
        if (!previewCtx) return;
        
        previewCtx.clearRect(0, 0, previewCanvas.width, previewCanvas.height);
        const sourceX = cropRect.x * (img.width / canvas.width);
        const sourceY = cropRect.y * (img.height / canvas.height);
        const sourceWidth = cropRect.w * (img.width / canvas.width);
        const sourceHeight = cropRect.h * (img.height / canvas.height);
        previewCtx.drawImage(img, sourceX, sourceY, sourceWidth, sourceHeight, 0, 0, previewCanvas.width, previewCanvas.height);

    }, [cropRect, getHandlePositions]);

    useEffect(() => {
        if (!imageSrc) return;
        const img = imageRef.current;
        img.crossOrigin = 'anonymous';
        img.onload = () => {
            const canvas = canvasRef.current;
            if (!canvas) return;

            const containerW = canvas.parentElement?.clientWidth || 500;
            const aspect = img.width / img.height;
            canvas.width = Math.min(containerW, img.width);
            canvas.height = canvas.width / aspect;

            const defaultW = Math.min(canvas.width * 0.8, img.width);
            const defaultH = Math.min(canvas.height * 0.8, img.height);
            setCropRect({
                w: defaultW,
                h: defaultH,
                x: (canvas.width - defaultW) / 2,
                y: (canvas.height - defaultH) / 2,
            });
        };
        img.src = imageSrc;
    }, [imageSrc]);

    useEffect(() => {
        draw();
    }, [cropRect, draw]);
    
    const handleApply = () => {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        const img = imageRef.current;
        if(!ctx || !canvasRef.current) return;
        
        const sourceX = cropRect.x * (img.width / canvasRef.current.width);
        const sourceY = cropRect.y * (img.height / canvasRef.current.height);
        const sourceWidth = cropRect.w * (img.width / canvasRef.current.width);
        const sourceHeight = cropRect.h * (img.height / canvasRef.current.height);
        
        canvas.width = sourceWidth;
        canvas.height = sourceHeight;

        ctx.drawImage(img, sourceX, sourceY, sourceWidth, sourceHeight, 0, 0, sourceWidth, sourceHeight);
        onApply(canvas.toDataURL('image/png'));
    };
    
    const getHandleAtPos = (mx: number, my: number) => {
        const handlePositions = getHandlePositions(cropRect);
        for (const handle of handles) {
            const pos = handlePositions[handle] as {x: number, y: number};
            if (pos && mx >= pos.x && mx <= pos.x + HANDLE_SIZE && my >= pos.y && my <= pos.y + HANDLE_SIZE) {
                return handle;
            }
        }
        return null;
    };
    
    const handleAspectRatioChange = (newRatioStr: string) => {
        setAspectRatio(newRatioStr);
        const canvas = canvasRef.current;
        if (!canvas) return;

        const ratio = parseAspectRatio(newRatioStr);
        if (!ratio) return;

        const { x, y, w, h } = cropRect;
        const centerX = x + w / 2;
        const centerY = y + h / 2;

        let newW = w;
        let newH = h;
        
        if (w / h > ratio) {
            newW = h * ratio;
        } else {
            newH = w / ratio;
        }

        let newX = centerX - newW / 2;
        let newY = centerY - newH / 2;

        if (newX < 0) newX = 0;
        if (newY < 0) newY = 0;
        if (newX + newW > canvas.width) {
            newW = canvas.width - newX;
            newH = newW / ratio;
        }
        if (newY + newH > canvas.height) {
            newH = canvas.height - newY;
            newW = newH * ratio;
        }

        setCropRect({ x: newX, y: newY, w: newW, h: newH });
    };

    const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const rect = canvas.getBoundingClientRect();
        const mx = e.clientX - rect.left;
        const my = e.clientY - rect.top;
        
        const handle = getHandleAtPos(mx, my);
        if (handle) {
            setDragState({ mode: 'resize', handle, startX: mx, startY: my, startRect: cropRect });
        } else if (mx > cropRect.x && mx < cropRect.x + cropRect.w && my > cropRect.y && my < cropRect.y + cropRect.h) {
            setDragState({ mode: 'move', handle: null, startX: mx, startY: my, startRect: cropRect });
        }
    };
    
    const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const rect = canvas.getBoundingClientRect();
        const mx = e.clientX - rect.left;
        const my = e.clientY - rect.top;

        if (!dragState.mode) {
            const handle = getHandleAtPos(mx, my);
            if (handle) {
                if (handle.includes('top') || handle.includes('bottom')) canvas.style.cursor = 'ns-resize';
                if (handle.includes('left') || handle.includes('right')) canvas.style.cursor = 'ew-resize';
                if (handle === 'top-left' || handle === 'bottom-right') canvas.style.cursor = 'nwse-resize';
                if (handle === 'top-right' || handle === 'bottom-left') canvas.style.cursor = 'nesw-resize';
            } else if (mx > cropRect.x && mx < cropRect.x + cropRect.w && my > cropRect.y && my < cropRect.y + cropRect.h) {
                canvas.style.cursor = 'move';
            } else {
                canvas.style.cursor = 'default';
            }
            return;
        }
        
        if (!dragState.startRect) return;

        const dx = mx - dragState.startX;
        const dy = my - dragState.startY;
        let newRect = { ...dragState.startRect };

        if (dragState.mode === 'move') {
            newRect.x += dx;
            newRect.y += dy;
        } else if (dragState.mode === 'resize') {
            const handle = dragState.handle!;
            const ratio = parseAspectRatio(aspectRatio);

            if (!ratio) {
                if (handle.includes('right')) newRect.w += dx;
                if (handle.includes('left')) { newRect.w -= dx; newRect.x += dx; }
                if (handle.includes('bottom')) newRect.h += dy;
                if (handle.includes('top')) { newRect.h -= dy; newRect.y += dy; }
            } else {
                const { x: sx, y: sy, w: sw, h: sh } = dragState.startRect;
                switch (handle) {
                    case 'bottom-right': newRect.w = sw + dx; newRect.h = newRect.w / ratio; break;
                    case 'top-left': newRect.w = sw - dx; newRect.h = newRect.w / ratio; newRect.x = sx + dx; newRect.y = sy + (sh - newRect.h); break;
                    case 'bottom-left': newRect.w = sw - dx; newRect.h = newRect.w / ratio; newRect.x = sx + dx; break;
                    case 'top-right': newRect.w = sw + dx; newRect.h = newRect.w / ratio; newRect.y = sy + (sh - newRect.h); break;
                    case 'right': newRect.w = sw + dx; newRect.h = newRect.w / ratio; newRect.y = sy - (newRect.h - sh) / 2; break;
                    case 'left': newRect.w = sw - dx; newRect.h = newRect.w / ratio; newRect.x = sx + dx; newRect.y = sy - (newRect.h - sh) / 2; break;
                    case 'bottom': newRect.h = sh + dy; newRect.w = newRect.h * ratio; newRect.x = sx - (newRect.w - sw) / 2; break;
                    case 'top': newRect.h = sh - dy; newRect.w = newRect.h * ratio; newRect.y = sy + dy; newRect.x = sx - (newRect.w - sw) / 2; break;
                }
            }
            if (newRect.w < MIN_CROP_SIZE || newRect.h < MIN_CROP_SIZE) return;
        }
        
        if (newRect.x < 0) { newRect.x = 0; }
        if (newRect.y < 0) { newRect.y = 0; }
        if (newRect.x + newRect.w > canvas.width) { newRect.w = canvas.width - newRect.x; if(parseAspectRatio(aspectRatio)) newRect.h = newRect.w / parseAspectRatio(aspectRatio)!; }
        if (newRect.y + newRect.h > canvas.height) { newRect.h = canvas.height - newRect.y; if(parseAspectRatio(aspectRatio)) newRect.w = newRect.h * parseAspectRatio(aspectRatio)!; }

        setCropRect(newRect);
    };

    const handleMouseUp = () => {
        setDragState({ mode: null, handle: null, startX: 0, startY: 0, startRect: null });
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 z-50" onClick={onClose}>
            <div className="bg-white rounded-xl shadow-2xl w-full max-w-5xl overflow-hidden flex flex-col max-h-[90vh]" onClick={e => e.stopPropagation()}>
                <div className="px-4 py-3 border-b flex items-center justify-between">
                    <h3 className="text-sm font-semibold text-slate-900">Edit Crop Referensi Subjek</h3>
                    <button onClick={onClose}><X size={20} /></button>
                </div>
                <div className="px-4 py-2 border-b flex items-center gap-2 flex-wrap">
                    <span className="text-xs font-medium text-slate-800">Aspek Rasio:</span>
                    <div className="flex flex-wrap gap-1">
                        {aspectRatios.map(ratio => (
                            <button
                                key={ratio}
                                onClick={() => handleAspectRatioChange(ratio)}
                                className={`px-2 py-1 text-xs rounded-md font-semibold transition-colors ${
                                    aspectRatio === ratio
                                        ? 'bg-blue-600 text-white'
                                        : 'bg-slate-200 text-slate-900 hover:bg-slate-300'
                                }`}
                            >
                                {ratio}
                            </button>
                        ))}
                    </div>
                </div>
                <div className="p-4 overflow-y-auto grid grid-cols-1 md:grid-cols-[1fr_16rem] gap-4">
                    <div>
                        <canvas ref={canvasRef} className="w-full h-auto block border rounded-md" onMouseDown={handleMouseDown} onMouseMove={handleMouseMove} onMouseUp={handleMouseUp} onMouseLeave={handleMouseUp} />
                    </div>
                    <div className="hidden md:block">
                        <p className="text-xs font-medium text-slate-900 mb-1">Preview</p>
                        <canvas ref={previewCanvasRef} className="w-full h-auto border rounded-md bg-slate-100" />
                    </div>
                </div>
                <div className="px-4 py-3 border-t flex justify-end gap-2">
                    <button onClick={onClose} className="px-3 py-1.5 text-sm rounded-md border text-slate-900 hover:bg-slate-100">Batal</button>
                    <button onClick={handleApply} className="px-3 py-1.5 text-sm rounded-md bg-blue-600 text-white hover:bg-blue-700">Simpan Crop</button>
                </div>
            </div>
        </div>
    );
};