import React, { useState } from 'react';
import { Key } from 'lucide-react';
import { saveApiKey } from '../services/depthService';

const ApiKeysPanel: React.FC = () => {
  const [apiKeyInput, setApiKeyInput] = useState('');

  const handleSaveApiKey = () => {
    if (apiKeyInput.trim()) {
      saveApiKey(apiKeyInput.trim());
      setApiKeyInput('');
      alert('API key saved successfully!');
    } else {
      alert('Please enter a valid API key.');
    }
  };

  return (
    <div className="w-80 bg-black/60 backdrop-blur-xl border border-white/10 p-5 rounded-2xl shadow-2xl space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-300">
      <div className="flex items-center justify-between text-cyan-300 border-b border-white/10 pb-2 mb-2">
        <div className="flex items-center gap-2">
          <Key size={16} />
          <span className="text-xs font-bold uppercase tracking-widest">API Configuration</span>
        </div>
      </div>

      <div className="space-y-4">
        <div className="space-y-2">
          <label className="text-xs text-gray-300 font-medium">
            Hugging Face API Key
          </label>
          <input
            type="password"
            value={apiKeyInput}
            onChange={(e) => setApiKeyInput(e.target.value)}
            placeholder="Enter your Hugging Face API key..."
            className="w-full px-3 py-2 bg-gray-800 border border-gray-600 rounded-lg text-white text-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-transparent"
          />
          <p className="text-xs text-gray-400">
            Get your free API key from <a href="https://huggingface.co/settings/tokens" target="_blank" rel="noopener noreferrer" className="text-cyan-400 hover:text-cyan-300 underline">Hugging Face</a>.
            Required for depth map generation.
          </p>
        </div>

        <button
          onClick={handleSaveApiKey}
          className="w-full bg-gradient-to-r from-cyan-600 to-purple-600 hover:from-cyan-500 hover:to-purple-500 text-white font-medium py-2 px-4 rounded-lg transition-all duration-200 hover:scale-105 active:scale-95 shadow-lg"
        >
          Save API Key
        </button>
      </div>
    </div>
  );
};

export default ApiKeysPanel;
