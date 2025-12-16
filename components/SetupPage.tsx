import React from 'react';
import { CheckCircle, ExternalLink, Zap } from 'lucide-react';

interface SetupPageProps {
  onComplete: () => void;
  onClose: () => void;
}

const SetupPage: React.FC<SetupPageProps> = ({ onComplete, onClose }) => {
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
        <div className="flex items-center gap-3 p-4 bg-green-900/20 border border-green-500/30 rounded-xl">
          <CheckCircle size={20} className="text-green-400 flex-shrink-0" />
          <div className="space-y-1">
            <p className="text-sm text-green-300 font-medium">Ready to Generate</p>
            <p className="text-xs text-green-200">
              Using Depth Anything V2 via Gradio - no API key required!
            </p>
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
            onClick={onComplete}
            className="flex-1 px-4 py-3 bg-gradient-to-r from-cyan-600 to-purple-600 hover:from-cyan-500 hover:to-purple-500 text-white rounded-lg transition-colors"
          >
            Get Started
          </button>
        </div>
      </div>
    </div>
  );
};

export default SetupPage;
