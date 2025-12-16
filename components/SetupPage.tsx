import React, { useState, useEffect } from 'react';
import { CheckCircle, AlertTriangle, ExternalLink, Zap, Key } from 'lucide-react';
import { saveApiKey } from '../services/depthService';

interface SetupPageProps {
  onComplete: () => void;
  onClose: () => void;
}

const SetupPage: React.FC<SetupPageProps> = ({ onComplete, onClose }) => {
  const [apiKey, setApiKey] = useState('');
  const [hasApiKey, setHasApiKey] = useState(false);

  useEffect(() => {
    // Check if API key exists
    const existingKey = localStorage.getItem('hf_api_key') ||
                       process.env.HF_API_KEY ||
                       process.env.NEXT_PUBLIC_HF_API_KEY;
    setHasApiKey(!!existingKey);
  }, []);

  const handleSave = () => {
    if (apiKey.trim()) {
      saveApiKey(apiKey.trim());
      setApiKey('');
      setHasApiKey(true);
    }
  };

  const handleSkip = () => {
    onClose();
  };

  const handleContinue = () => {
    onComplete();
  };

  return (
    <div className="min-h-screen bg-neutral-900 flex items-center justify-center p-4">
      <div className="max-w-md w-full space-y-8">
        <div className="text-center">
          <div className="w-16 h-16 bg-gradient-to-r from-cyan-500 to-purple-500 rounded-full flex items-center justify-center mx-auto mb-4">
            <Zap size={32} className="text-white" />
          </div>
          <h1 className="text-3xl font-bold text-white mb-2">Welcome to Nebula</h1>
          <p className="text-gray-400">
            Depth Cloud Visualizer is ready to use!
          </p>
        </div>

        {/* Status */}
        {hasApiKey ? (
          <div className="flex items-center gap-3 p-4 bg-green-900/20 border border-green-500/30 rounded-xl">
            <CheckCircle size={20} className="text-green-400 flex-shrink-0" />
            <div className="space-y-1">
              <p className="text-sm text-green-300 font-medium">API Key Configured</p>
              <p className="text-xs text-green-200">
                Higher quota limits and priority access enabled!
              </p>
            </div>
          </div>
        ) : (
          <div className="flex items-center gap-3 p-4 bg-amber-900/20 border border-amber-500/30 rounded-xl">
            <AlertTriangle size={20} className="text-amber-400 flex-shrink-0" />
            <div className="space-y-1">
              <p className="text-sm text-amber-300 font-medium">Optional API Key</p>
              <p className="text-xs text-amber-200">
                Add your Hugging Face API key for higher limits and priority access.
              </p>
            </div>
          </div>
        )}

        {/* API Key Input */}
        <div className="space-y-4">
          <div className="space-y-2">
            <label className="text-sm text-gray-300 font-medium flex items-center gap-2">
              <Key size={16} />
              Hugging Face API Key (Optional)
            </label>
            <input
              type="password"
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              placeholder="hf_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
              autoComplete="new-password"
              data-form-type="other"
              className="w-full px-4 py-3 bg-gray-800 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-transparent"
              autoFocus={!hasApiKey}
            />
          </div>

          {/* Instructions */}
          <div className="text-sm text-gray-400 space-y-2">
            <p>Benefits of adding an API key:</p>
            <ul className="text-xs text-gray-500 space-y-1 list-disc list-inside ml-4">
              <li>Higher rate limits</li>
              <li>Priority access during peak times</li>
              <li>Access to latest model versions</li>
            </ul>
            <p>Get your free API key from:</p>
            <a
              href="https://huggingface.co/settings/tokens"
              target="_blank"
              rel="noopener noreferrer"
              className="text-cyan-400 hover:text-cyan-300 underline flex items-center gap-1"
            >
              Hugging Face Settings <ExternalLink size={14} />
            </a>
          </div>
        </div>

        {/* Information */}
        <div className="space-y-4">
          <div className="space-y-2">
            <h3 className="text-sm text-gray-300 font-medium">How it works:</h3>
            <ul className="text-xs text-gray-400 space-y-1 list-disc list-inside">
              <li>Upload an image or PLY file</li>
              <li>AI generates a 3D depth map</li>
              <li>Visualize the depth cloud in 3D space</li>
              <li>Adjust simulation parameters in real-time</li>
            </ul>
          </div>

          {/* Powered by */}
          <div className="text-sm text-gray-400 space-y-2">
            <p>Powered by:</p>
            <a
              href="https://huggingface.co/spaces/depth-anything/Depth-Anything-V2"
              target="_blank"
              rel="noopener noreferrer"
              className="text-cyan-400 hover:text-cyan-300 underline flex items-center gap-1"
            >
              Depth Anything V2 on Hugging Face <ExternalLink size={14} />
            </a>
            <p className="text-xs text-gray-500">
              Free AI model hosted on Hugging Face Spaces.
            </p>
          </div>
        </div>

        {/* Actions */}
        <div className="flex gap-3">
          <button
            onClick={handleSkip}
            className="flex-1 px-4 py-3 bg-gray-700 hover:bg-gray-600 text-white rounded-lg transition-colors"
          >
            {hasApiKey ? 'Close' : 'Skip for Now'}
          </button>
          <button
            onClick={() => {
              // Save API key if entered
              if (apiKey.trim()) {
                saveApiKey(apiKey.trim());
                setHasApiKey(true); // Update state immediately
                setApiKey(''); // Clear input after saving
              }
              handleContinue();
            }}
            className="flex-1 px-4 py-3 bg-gradient-to-r from-cyan-600 to-purple-600 hover:from-cyan-500 hover:to-purple-500 text-white rounded-lg transition-colors"
          >
            {hasApiKey ? 'Continue' : 'Get Started'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default SetupPage;
