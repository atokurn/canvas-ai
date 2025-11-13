import React, { useState, useCallback } from 'react';
import { CropModal } from './CropModal';

interface ImageUploaderProps {
    id: string;
    label: string;
    description: string;
    files: string[];
    onFilesChange: (files: string[]) => void;
    showMessage: (text: string, type: 'info' | 'success' | 'error') => void;
    useCropper?: boolean;
    disabled?: boolean;
}

const fileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = (error) => reject(error);
    });
};

export const ImageUploader: React.FC<ImageUploaderProps> = ({ id, label, description, files, onFilesChange, showMessage, useCropper, disabled }) => {
    const [isCropModalOpen, setCropModalOpen] = useState(false);
    const [imageToCrop, setImageToCrop] = useState<string | null>(null);

    const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
        const inputFiles = event.target.files;
        if (!inputFiles || inputFiles.length === 0) return;

        if (useCropper) {
            const firstFile = inputFiles[0];
            const dataUrl = await fileToBase64(firstFile);
            setImageToCrop(dataUrl);
            setCropModalOpen(true);
        } else {
            // FIX: Use spread syntax to correctly convert FileList to File[], ensuring proper type inference.
            const base64Promises = [...inputFiles].map(file => fileToBase64(file));
            const dataUrls = await Promise.all(base64Promises);
            const base64Strings = dataUrls.map(url => url.split(',')[1]);
            onFilesChange(base64Strings);
        }
        // Reset file input to allow re-uploading the same file
        event.target.value = '';
    };

    const handleCropApply = (croppedDataUrl: string) => {
        const base64String = croppedDataUrl.split(',')[1];
        onFilesChange([...files, base64String]);
        setCropModalOpen(false);
        setImageToCrop(null);
    };

    const clearFiles = () => {
        onFilesChange([]);
    };

    return (
        <div className={`p-3 bg-slate-50 rounded-lg border-2 border-dashed  transition-colors ${disabled ? 'border-slate-200' : 'border-slate-300 hover:border-blue-400'}`}>
            <label htmlFor={id} className={`text-xs font-semibold mb-2 block ${disabled ? 'text-slate-600' : 'text-slate-900'}`}>{label}</label>
            <input 
                type="file" 
                id={id} 
                accept="image/*" 
                multiple={!useCropper}
                onChange={handleFileChange} 
                disabled={disabled}
                className="block w-full text-xs text-slate-700 file:mr-3 file:py-2 file:px-3 file:rounded-md file:border-0 file:text-xs file:font-semibold file:bg-blue-500 file:text-white hover:file:bg-blue-600 cursor-pointer disabled:file:bg-slate-400 disabled:cursor-not-allowed" 
            />
            {files.length > 0 && (
                <>
                    <div className="mt-2 flex flex-wrap gap-2">
                        {files.map((base64, index) => (
                            <img 
                                key={index} 
                                src={`data:image/png;base64,${base64}`} 
                                alt={`preview ${index}`}
                                className="w-16 h-16 object-cover rounded-md border-2 border-slate-300"
                            />
                        ))}
                    </div>
                    <button onClick={clearFiles} disabled={disabled} className="text-xs text-red-500 hover:text-red-700 mt-2 w-full text-center font-medium disabled:text-slate-600 disabled:cursor-not-allowed">
                        Hapus
                    </button>
                </>
            )}
            <p className={`text-xs mt-2 ${disabled ? 'text-slate-600' : 'text-slate-700'}`}>{description}</p>
            {useCropper && imageToCrop && (
                <CropModal 
                    isOpen={isCropModalOpen}
                    imageSrc={imageToCrop}
                    onClose={() => setCropModalOpen(false)}
                    onApply={handleCropApply}
                />
            )}
        </div>
    );
};