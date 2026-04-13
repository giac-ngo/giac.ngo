import React from 'react';

interface PricingModalProps {
  isOpen: boolean;
  onClose: () => void;
  user?: any;
  onUserUpdate?: any;
  language?: 'vi' | 'en';
  spaceId?: number | null;
  aiConfigId?: number | null;
}

export const PricingModal: React.FC<PricingModalProps> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
      <div className="bg-background-panel rounded-lg shadow-xl w-full max-w-md p-6 relative">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-text-light hover:text-text-main"
        >
          <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
        <h2 className="text-2xl font-bold mb-4 text-text-main">Pricing & Plans</h2>
        <p className="text-text-light mb-6">
          You have reached your daily chat limit. Please consider upgrading or offering a donation to continue using the service.
        </p>
        <div className="flex justify-end gap-3">
          <button
            onClick={onClose}
            className="px-4 py-2 border border-border-color rounded hover:bg-background-light text-text-main transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={onClose}
            className="px-4 py-2 bg-primary text-text-on-primary rounded hover:bg-primary-hover transition-colors"
          >
            Pledge Merit
          </button>
        </div>
      </div>
    </div>
  );
};
