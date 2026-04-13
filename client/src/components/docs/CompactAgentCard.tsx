import React from 'react';
import { BuddhistAgent } from '../../shared/buddhistAgents';

export const CompactAgentCard: React.FC<{ agent: BuddhistAgent, onClick: (agent: BuddhistAgent) => void, language: string }> = ({ agent, onClick }) => {
  return (
    <div onClick={() => onClick(agent)} className="border p-4 rounded-lg cursor-pointer hover:bg-gray-50">
      <h3 className="font-bold">{agent.name}</h3>
      <p className="text-sm text-gray-500">{agent.tagline}</p>
    </div>
  );
};
