import React, { useState, useEffect } from 'react';
import { GeneratedImage } from '../types';
import { Download, RefreshCw, Copy, AlertCircle } from 'lucide-react';

interface ImageCardProps {
    image: GeneratedImage | null;
    onImageClick: (imageUrl: string) => void;
}

export const ImageCard: React.FC<ImageCardProps> = ({ image, onImageClick }) => {
    const [isLoaded, setIsLoaded] = useState(false);

    useEffect(() => {
        // The image is considered "loaded" for animation purposes once the base64 is present.
        // A small timeout ensures the transition is applied after the element is in the DOM.
        if (image?.base64 && !image.loading) {
            const timer = setTimeout(() => setIsLoaded(true), 50);
            return () => clearTimeout(timer);
        } else {
            // Reset when a new image starts loading or is cleared
            setIsLoaded(false);
        }
    }, [image?.base64, image?.loading]);

    const handleCopyPrompt = (e: React.MouseEvent) => {
        e.stopPropagation();
        if (image?.prompt) {
            navigator.clipboard.writeText(image.prompt);
            // Optionally show a toast message here
        }
    };

    const handleDownload = (e: React.MouseEvent) => {
        e.stopPropagation();
        if (image?.base64) {
            const link = document.createElement('a');
            link.href = image.base64;
            link.download = `generated_image_${Date.now()}.png`;
            link.click();
        }
    };
    
    // Placeholder for regeneration functionality
    const handleRegenerate = (e: React.MouseEvent) => {
        e.stopPropagation();
        alert('Regeneration feature is not implemented in this version.');
    };
    
    if (!image || image.loading) {
        return (
            <div className="relative group bg-slate-100 rounded-lg shadow-md aspect-square flex flex-col items-center justify-center p-4 border border-slate-200 overflow-hidden text-slate-700">
                <div className="spinner"></div>
                 {image?.prompt && (
                    <div className="absolute bottom-0 left-0 right-0 p-3 bg-gradient-to-t from-black/40 to-transparent">
                        <p className="text-white text-xs font-medium line-clamp-3" title={image.prompt}>{image.prompt}</p>
                    </div>
                 )}
            </div>
        );
    }
    
    if (image.error) {
         return (
            <div className="relative group bg-red-50 rounded-lg shadow-md aspect-square flex flex-col items-center justify-center p-4 border border-red-300 overflow-hidden text-red-600">
                <AlertCircle className="w-10 h-10 mb-2" />
                <span className="text-sm font-medium text-center">{image.error}</span>
                <div className="absolute bottom-0 left-0 right-0 p-3 bg-gradient-to-t from-black/70 to-transparent">
                    <p className="text-white text-xs font-medium line-clamp-3" title={image.prompt}>{image.prompt}</p>
                </div>
            </div>
        );
    }

    return (
        <div className="relative group bg-slate-100 rounded-lg shadow-md aspect-square flex items-center justify-center p-4 border border-slate-200 overflow-hidden">
            {image.base64 ? (
                <img 
                    src={image.base64} 
                    alt={image.prompt} 
                    onClick={() => onImageClick(image.base64!)} 
                    className={`absolute inset-0 w-full h-full object-cover rounded-lg cursor-pointer transition-opacity duration-500 ease-in-out ${isLoaded ? 'opacity-100' : 'opacity-0'}`}
                />
            ) : (
                // This case should ideally not be hit if error/loading is handled
                <div className="text-slate-600">No Image</div>
            )}
            
            <div className="absolute bottom-0 left-0 right-0 p-3 bg-gradient-to-t from-black/70 to-transparent transition-opacity opacity-0 group-hover:opacity-100">
                <p className="text-white text-xs font-medium line-clamp-3" title={image.prompt}>{image.prompt}</p>
            </div>

            <div className="absolute top-3 right-3 flex flex-col gap-2 transition-opacity opacity-0 group-hover:opacity-100">
                <button onClick={handleDownload} disabled={!image.base64} className="p-2 rounded-full bg-green-500 hover:bg-green-600 text-white shadow-lg transition-colors disabled:bg-slate-400 active:scale-95" title="Download Image">
                    <Download className="w-4 h-4" />
                </button>
                <button onClick={handleRegenerate} disabled={!image.base64} className="p-2 rounded-full bg-blue-500 hover:bg-blue-600 text-white shadow-lg transition-colors disabled:bg-slate-400 active:scale-95" title="Regenerate">
                    <RefreshCw className="w-4 h-4" />
                </button>
                <button onClick={handleCopyPrompt} disabled={!image.base64} className="p-2 rounded-full bg-slate-50 hover:bg-slate-200 text-slate-900 shadow-lg transition-colors disabled:bg-slate-400 active:scale-95" title="Copy Prompt">
                    <Copy className="w-4 h-4" />
                </button>
            </div>
        </div>
    );
};