import React from 'react';
import { Key } from 'lucide-react';

interface ApiKeysButtonProps {
  isApiKeysOpen: boolean;
  onToggle: () => void;
}

const ApiKeysButton: React.FC<ApiKeysButtonProps> = ({ isApiKeysOpen, onToggle }) => {
  return (
    <button
      onClick={onToggle}
      className="w-12 h-12 flex items-center justify-center rounded-full bg-black/60 hover:bg-black/80 text-white border border-white/10 backdrop-blur-xl shadow-lg transition-transform hover:scale-110 active:scale-95 group"
      title={isApiKeysOpen ? "Hide API Keys" : "Show API Keys"}
    >
      <Key size={20} className={isApiKeysOpen ? "text-gray-300 group-hover:text-white" : "text-cyan-400 group-hover:text-cyan-200"} />
    </button>
  );
};

export default ApiKeysButton;
