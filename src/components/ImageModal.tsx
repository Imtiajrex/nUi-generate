import React from 'react';
import { Modal } from './Modal';

interface ImageModalProps {
  isOpen: boolean;
  onClose: () => void;
  imageUrl: string;
  title?: string;
}

export const ImageModal: React.FC<ImageModalProps> = ({ isOpen, onClose, imageUrl, title }) => {
  return (
    <Modal 
      isOpen={isOpen} 
      onClose={onClose} 
      maxWidth="max-w-4xl"
    >
      <div className="p-2 flex flex-col items-center">
        {title && (
          <div className="mb-4 text-center">
            <h3 className="text-lg font-bold text-white">{title}</h3>
          </div>
        )}
        <div className="relative w-full aspect-auto max-h-[80vh] flex items-center justify-center overflow-hidden rounded-xl bg-zinc-950">
          <img 
            src={imageUrl} 
            alt={title || "Preview"} 
            className="max-w-full max-h-full object-contain"
            referrerPolicy="no-referrer"
          />
        </div>
      </div>
    </Modal>
  );
};
