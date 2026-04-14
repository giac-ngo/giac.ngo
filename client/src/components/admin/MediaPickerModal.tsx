import React from 'react';
import { Space } from '../../types';
import { MediaLibrary } from './MediaLibrary';
import { XIcon } from '../Icons';

interface MediaPickerModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSelect: (url: string) => void;
    space: Space | null;
    language: 'vi' | 'en';
    /** Pre-select file type tab: 'all' | 'image' | 'audio' | 'video' | 'document' */
    defaultFileType?: string;
}

export const MediaPickerModal: React.FC<MediaPickerModalProps> = ({
    isOpen,
    onClose,
    onSelect,
    space,
    language,
    defaultFileType,
}) => {
    if (!isOpen) return null;

    const handleSelect = (url: string) => {
        onSelect(url);
        onClose();
    };

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 md:p-8">
            <div className="relative w-full max-w-6xl h-full max-h-[90vh] flex flex-col">
                <button
                    onClick={onClose}
                    className="absolute -top-12 right-0 md:-right-12 z-10 w-10 h-10 flex items-center justify-center text-white/70 hover:text-white transition-colors"
                >
                    <XIcon className="w-8 h-8" />
                </button>
                
                <div className="bg-background-main w-full h-full rounded-2xl shadow-2xl overflow-hidden flex flex-col border border-border-color">
                    <MediaLibrary 
                        space={space} 
                        language={language} 
                        selectable={true} 
                        onSelect={handleSelect}
                        defaultFileType={defaultFileType}
                    />
                </div>
            </div>
        </div>
    );
};
