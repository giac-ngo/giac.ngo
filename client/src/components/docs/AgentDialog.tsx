import React from 'react';
import { BuddhistAgent } from '../../shared/buddhistAgents';

export const AgentDialog: React.FC<{ agent: BuddhistAgent | null, open: boolean, onOpenChange: (open: boolean) => void, language: string }> = ({ agent, open, onOpenChange }) => {
  if (!open || !agent) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-md p-6 relative">
        <button onClick={() => onOpenChange(false)} className="absolute top-4 right-4 text-gray-500 hover:text-gray-700">X</button>
        <h2 className="text-2xl font-bold mb-2 text-[#4B3226]">{agent.name}</h2>
        <p className="text-gray-500 italic mb-4">{agent.tagline}</p>
        <p className="text-gray-700 mb-6">{agent.purpose}</p>
        <button onClick={() => onOpenChange(false)} className="w-full py-2 bg-[#991b1b] text-white rounded hover:bg-[#7a1515]">Đóng</button>
      </div>
    </div>
  );
};
