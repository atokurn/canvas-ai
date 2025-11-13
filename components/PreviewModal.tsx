
import React, { useState, useEffect, useCallback } from 'react';
import { X, Download, ChevronLeft, ChevronRight } from 'lucide-react';

interface PreviewModalProps {
    imageUrl: string;
    allImages: string[];
    onClose: () => void;
}

export const PreviewModal: React.FC<PreviewModalProps> = ({ imageUrl, allImages, onClose }) => {
    const [currentIndex, setCurrentIndex] = useState(0);

    useEffect(() => {
        const index = allImages.findIndex(img => img === imageUrl);
        if (index !== -1) {
            setCurrentIndex(index);
        }
    }, [imageUrl, allImages]);
    
    const showPrev = useCallback(() => {
        setCurrentIndex(prev => (prev - 1 + allImages.length) % allImages.length);
    }, [allImages.length]);

    const showNext = useCallback(() => {
        setCurrentIndex(prev => (prev + 1) % allImages.length);
    }, [allImages.length]);

    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Escape') onClose();
            if (e.key === 'ArrowLeft') showPrev();
            if (e.key === 'ArrowRight') showNext();
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [onClose, showPrev, showNext]);

    const handleDownload = () => {
        const link = document.createElement('a');
        link.href = allImages[currentIndex];
        link.download = `preview_image_${Date.now()}.png`;
        link.click();
    };

    if (allImages.length === 0) return null;

    return (
        <div id="preview-modal" className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 z-50" onClick={onClose}>
            <div className="relative bg-white rounded-xl shadow-2xl max-w-4xl max-h-[90vh] overflow-hidden" onClick={e => e.stopPropagation()}>
                <div className="absolute top-4 right-4 flex gap-2 z-10">
                    <button onClick={handleDownload} className="p-2 rounded-full bg-black/50 hover:bg-green-600 text-white hover:shadow-lg transition-all duration-200 active:scale-95" title="Download Image">
                        <Download className="w-6 h-6" />
                    </button>
                    <button onClick={onClose} className="p-2 rounded-full bg-black/50 hover:bg-red-600 text-white hover:shadow-lg transition-all duration-200 active:scale-95" title="Close Preview">
                        <X className="w-6 h-6" />
                    </button>
                </div>

                {allImages.length > 1 && (
                    <>
                        <button onClick={showPrev} className="absolute left-3 top-1/2 -translate-y-1/2 p-2 rounded-full bg-black/50 hover:bg-black/70 text-white z-10">
                            <ChevronLeft className="w-6 h-6" />
                        </button>
                        <button onClick={showNext} className="absolute right-3 top-1/2 -translate-y-1/2 p-2 rounded-full bg-black/50 hover:bg-black/70 text-white z-10">
                            <ChevronRight className="w-6 h-6" />
                        </button>
                    </>
                )}
                
                <img id="modal-image" src={allImages[currentIndex]} alt="Pratinjau" className="w-full h-auto object-contain max-h-[85vh] rounded-lg" />
                
                {allImages.length > 1 && (
                    <div id="preview-counter" className="absolute bottom-3 left-1/2 -translate-x-1/2 px-2 py-1 rounded bg-black/50 text-white text-xs z-10">
                        {currentIndex + 1} / {allImages.length}
                    </div>
                )}
            </div>
        </div>
    );
};
