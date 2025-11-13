
import React, { useState, useCallback } from 'react';
import { ControlPanel } from './components/ControlPanel';
import { CanvasView } from './components/CanvasView';
import { PreviewModal } from './components/PreviewModal';
import { GeneratedImage, HistoryItem } from './types';
import { generateImage, optimizePrompt, generateMultimodalImage } from './services/geminiService';
import { saveImageToHistory } from './services/databaseService';

const App: React.FC = () => {
    const [generatedImages, setGeneratedImages] = useState<GeneratedImage[]>([]);
    const [isGenerating, setIsGenerating] = useState(false);
    const [activeModalImage, setActiveModalImage] = useState<string | null>(null);
    const [message, setMessage] = useState<{ text: string; type: 'info' | 'success' | 'error' } | null>(null);

    const showMessage = (text: string, type: 'info' | 'success' | 'error' = 'info') => {
        setMessage({ text, type });
        if (type !== 'info' || !text.startsWith("Generating")) {
            setTimeout(() => setMessage(null), 4000);
        }
    };

    const processImage = useCallback(async (prompt: string, index: number, options: any) => {
        const { optimizer, subjectRefs, styleRefs, aspectRatio, disableHistory, autoDownload } = options;
        const useMultimodal = subjectRefs.length > 0 || styleRefs.length > 0;
        const model = useMultimodal ? 'imagen-3.0-capability-001' : 'imagen-4.0-generate-001';

        try {
            let finalPrompt = prompt;
            if (optimizer && !useMultimodal) {
                finalPrompt = await optimizePrompt(prompt);
            }

            let base64: string | null = null;
            if (useMultimodal) {
                base64 = await generateMultimodalImage({ prompt: finalPrompt, subjectRefs, styleRefs });
            } else {
                const results = await generateImage({ prompt: finalPrompt, aspectRatio, numberOfImages: 1 });
                base64 = results.length > 0 ? results[0] : null;
            }

            if (!base64) throw new Error("API did not return an image.");
            
            setGeneratedImages(prev => {
                const newImages = [...prev];
                newImages[index] = { base64, prompt: finalPrompt, loading: false };
                return newImages;
            });

            if (!disableHistory) {
                const historyItem: HistoryItem = {
                    id: `img_${Date.now()}_${index}`,
                    prompt: finalPrompt,
                    base64,
                    timestamp: Date.now(),
                    model: model,
                };
                await saveImageToHistory(historyItem);
            }

            if (autoDownload) {
                const link = document.createElement('a');
                link.href = base64;
                link.download = `generated_image_${Date.now()}.png`;
                link.click();
            }
            return true;
        } catch (error) {
            console.error(`Error generating image for prompt: "${prompt}"`, error);
            setGeneratedImages(prev => {
                const newImages = [...prev];
                newImages[index] = { base64: null, prompt, loading: false, error: 'Failed to generate' };
                return newImages;
            });
            return false;
        }
    }, []);

    const handleStandardGenerate = useCallback(async (options: any) => {
        setIsGenerating(true);
        const { prompts, imageCount } = options;
        
        const placeholderImages: GeneratedImage[] = [];
        for (const prompt of prompts) {
            for (let i = 0; i < imageCount; i++) {
                placeholderImages.push({ prompt, base64: null, loading: true });
            }
        }
        setGeneratedImages(placeholderImages);
        showMessage(`Generating ${placeholderImages.length} images...`, 'info');

        const results = await Promise.all(
            placeholderImages.map((img, index) => processImage(img.prompt, index, options))
        );
        
        const successCount = results.filter(Boolean).length;
        if (successCount > 0) {
            showMessage(`Successfully generated ${successCount} images!`, 'success');
        } else {
            showMessage('Image generation failed.', 'error');
        }

        setIsGenerating(false);
    }, [processImage]);

    const handleBatchGenerate = useCallback(async (options: any) => {
        setIsGenerating(true);
        const { prompts, imageCount } = options;
        const prompt = prompts[0];

        const placeholderImages: GeneratedImage[] = [];
        for (let i = 0; i < imageCount; i++) {
            placeholderImages.push({ prompt, base64: null, loading: true });
        }
        
        const startIndex = generatedImages.length;
        setGeneratedImages(prev => [...prev, ...placeholderImages]);

        await Promise.all(
            placeholderImages.map((img, index) => processImage(img.prompt, startIndex + index, options))
        );
        setIsGenerating(false);

    }, [generatedImages, processImage]);

    const handleBatchStart = useCallback(() => {
        setGeneratedImages([]);
    }, []);

    const openPreview = (imageUrl: string) => {
        setActiveModalImage(imageUrl);
    };

    const closePreview = () => {
        setActiveModalImage(null);
    };

    return (
        <div className="flex flex-col lg:flex-row min-h-screen lg:h-screen lg:overflow-hidden">
            <ControlPanel
                onStandardGenerate={handleStandardGenerate}
                onBatchGenerate={handleBatchGenerate}
                onBatchStart={handleBatchStart}
                isGenerating={isGenerating}
                showMessage={showMessage}
                message={message}
            />
            <CanvasView generatedImages={generatedImages} onImageClick={openPreview} />
            {activeModalImage && (
                <PreviewModal
                    imageUrl={activeModalImage}
                    allImages={generatedImages.filter(img => img && img.base64).map(img => img!.base64!)}
                    onClose={closePreview}
                />
            )}
        </div>
    );
};

export default App;