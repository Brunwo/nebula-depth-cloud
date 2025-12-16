import React, { useRef, useState } from 'react';
import { Upload, Sliders, AlertCircle, Play, Eye, Activity, Wind, Waves, ChevronDown, Settings2, Cylinder, BoxSelect, Gauge, Palette, Grid3X3, Zap, RotateCcw } from 'lucide-react';
import { PointCloudState, SimulationConfig } from '../types';
import ApiKeysButton from './ApiKeysButton';

interface UIProps {
  appState: PointCloudState;
  config: SimulationConfig;
  onImageUpload: (file: File) => void;
  onConfigChange: (newConfig: Partial<SimulationConfig>) => void;
  onShowSetup?: () => void;
}

const UI: React.FC<UIProps> = ({ appState, config, onImageUpload, onConfigChange, onShowSetup }) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isSettingsOpen, setIsSettingsOpen] = useState(true);

  const [activeTab, setActiveTab] = useState<'basic' | 'advanced'>('basic');

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      onImageUpload(e.target.files[0]);
    }
  };

  const triggerUpload = () => {
    fileInputRef.current?.click();
  };

  const hasContent = (appState.mode === 'image' && appState.originalImage) || (appState.mode === 'ply' && appState.plyPositions);
  
  // Check if we are in PLY mode and have NO vertex colors
  const showColorPicker = appState.mode === 'ply' && !appState.plyColors;

  return (
    <div className="absolute inset-0 pointer-events-none flex flex-col justify-between p-6 z-10">

      {/* Header */}
      <div className="flex justify-between items-start pointer-events-auto">
        <div className="flex items-center gap-4">
          <ApiKeysButton
            isApiKeysOpen={false}
            onToggle={onShowSetup || (() => {})}
          />
          <div>
            <h1 className="text-4xl font-black tracking-tighter text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-purple-500 drop-shadow-sm">
              NEBULA
            </h1>
            <p className="text-gray-400 text-xs font-mono tracking-widest mt-1 uppercase">
              Depth Cloud Visualizer
            </p>
          </div>
        </div>

        <button
          onClick={triggerUpload}
          disabled={appState.isGenerating}
          className={`
            flex items-center gap-2 px-6 py-3 rounded-full font-bold text-sm transition-all duration-300 shadow-lg border border-white/10
            ${appState.isGenerating
              ? 'bg-gray-800 text-gray-500 cursor-not-allowed'
              : 'bg-white/10 hover:bg-white/20 text-white backdrop-blur-md hover:scale-105 active:scale-95'}
          `}
        >
          {appState.isGenerating ? (
            <>
              <div className="w-4 h-4 border-2 border-t-transparent border-white rounded-full animate-spin" />
              <span>Processing...</span>
            </>
          ) : (
            <>
              <Upload size={16} />
              <span>Upload Image / .PLY</span>
            </>
          )}
        </button>
        <input
          type="file"
          ref={fileInputRef}
          onChange={handleFileChange}
          accept="image/*,.ply"
          className="hidden"
        />
      </div>

      {/* Error Message */}
      {appState.error && (
        <div className="absolute top-24 left-6 right-6 mx-auto max-w-md bg-red-900/80 border border-red-500 text-red-100 px-4 py-3 rounded-lg backdrop-blur-md flex items-center gap-3 pointer-events-auto">
          <AlertCircle size={20} />
          <p className="text-sm">{appState.error}</p>
        </div>
      )}

      {/* Controls Panel & Toggle - Only show if we have content */}
      {hasContent && (
        <div className="self-end mt-auto pointer-events-auto flex flex-col items-end gap-4">

            {/* Collapsible Settings Panel */}
            {isSettingsOpen && (
              <div className="w-80 bg-black/60 backdrop-blur-xl border border-white/10 p-5 rounded-2xl shadow-2xl space-y-5 animate-in fade-in slide-in-from-bottom-4 duration-300 max-h-[70vh] overflow-y-auto custom-scrollbar">
                <div className="flex items-center justify-between text-cyan-300 border-b border-white/10 pb-2 mb-2">
                  <div className="flex items-center gap-2">
                    <Sliders size={16} />
                    <span className="text-xs font-bold uppercase tracking-widest">Simulation Config</span>
                  </div>
                </div>

                {/* Tab Buttons */}
                <div className="flex bg-gray-800 rounded-lg p-1 mb-4">
                  <button
                    onClick={() => setActiveTab('basic')}
                    className={`flex-1 py-1 px-3 rounded-md text-xs font-medium transition-all ${
                      activeTab === 'basic' ? 'bg-cyan-600 text-white shadow-sm' : 'text-gray-400 hover:text-white'
                    }`}
                  >
                    Basic
                  </button>
                  <button
                    onClick={() => setActiveTab('advanced')}
                    className={`flex-1 py-1 px-3 rounded-md text-xs font-medium transition-all ${
                      activeTab === 'advanced' ? 'bg-cyan-600 text-white shadow-sm' : 'text-gray-400 hover:text-white'
                    }`}
                  >
                    <Zap size={12} className="inline mr-1" />
                    Advanced
                  </button>
                </div>

                {/* Basic Tab Content */}
                {activeTab === 'basic' && (
                  <div className="space-y-5">

                {/* Noise Blend Slider */}
                <div className="space-y-2">
                  <div className="flex justify-between text-xs text-gray-300">
                    <div className="flex items-center gap-1"><Waves size={12} /> Flow Mode</div>
                    <span className="font-mono">
                      {config.noiseBlend === 0 ? 'Turbulence' :
                       config.noiseBlend === 1 ? 'Perlin Field' :
                       `${(config.noiseBlend * 100).toFixed(0)}% Blend`}
                    </span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="1"
                    step="0.01"
                    value={config.noiseBlend}
                    onChange={(e) => onConfigChange({ noiseBlend: parseFloat(e.target.value) })}
                    className="w-full h-1 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-cyan-400"
                  />
                  <div className="flex justify-between text-xs text-gray-500">
                    <span>Turbulence</span>
                    <span>Blend</span>
                    <span>Perlin Field</span>
                  </div>
                </div>

                {/* Time Randomization Slider */}
                <div className="space-y-2">
                  <div className="flex justify-between text-xs text-gray-300">
                    <div className="flex items-center gap-1"><Zap size={12} /> Time Variation</div>
                    <span className="font-mono">
                      {config.timeRandomization === 0 ? 'Synchronized' :
                       `${(config.timeRandomization * 100).toFixed(0)}% Random`}
                    </span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="1"
                    step="0.01"
                    value={config.timeRandomization}
                    onChange={(e) => onConfigChange({ timeRandomization: parseFloat(e.target.value) })}
                    className="w-full h-1 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-purple-400"
                  />
                  <div className="flex justify-between text-xs text-gray-500">
                    <span>Sync</span>
                    <span>Random</span>
                  </div>
                </div>

                {/* Time Randomization Scale Slider */}
                <div className="space-y-2">
                  <div className="flex justify-between text-xs text-gray-300">
                    <div className="flex items-center gap-1"><Gauge size={12} /> Time Range</div>
                    <span className="font-mono">
                      ±{(config.timeRandomizationScale * 5).toFixed(1)}s
                    </span>
                  </div>
                  <input
                    type="range"
                    min="0.1"
                    max="3.0"
                    step="0.1"
                    value={config.timeRandomizationScale}
                    onChange={(e) => onConfigChange({ timeRandomizationScale: parseFloat(e.target.value) })}
                    className="w-full h-1 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-purple-500"
                  />
                  <div className="flex justify-between text-xs text-gray-500">
                    <span>±0.5s</span>
                    <span>±15s</span>
                  </div>
                </div>

                 {/* Trail Thickness Mode Toggle */}
                 <div className="space-y-2">
                  <div className="flex justify-between text-xs text-gray-300">
                    <div className="flex items-center gap-1"><Cylinder size={12} />Particles Thickness</div>
                  </div>
                  <div className="flex bg-gray-800 rounded-lg p-1">
                    <button
                      onClick={() => onConfigChange({ useRealTrailThickness: false })}
                      className={`flex-1 py-1 px-2 rounded-md text-xs font-medium transition-all ${
                        !config.useRealTrailThickness ? 'bg-purple-600 text-white shadow-sm' : 'text-gray-400 hover:text-white'
                      }`}
                    >
                      invariant (faster)
                    </button>
                    <button
                      onClick={() => onConfigChange({ useRealTrailThickness: true })}
                      className={`flex-1 py-1 px-2 rounded-md text-xs font-medium transition-all ${
                        config.useRealTrailThickness ? 'bg-purple-600 text-white shadow-sm' : 'text-gray-400 hover:text-white'
                      }`}
                    >
                      relative to distance
                    </button>
                  </div>
                </div>



                {/* Particle Count Slider (Exponential Scale) */}
                <div className="space-y-2">
                  <div className="flex justify-between text-xs text-gray-300">
                    <div className="flex items-center gap-1"><Grid3X3 size={12} /> Particle Count</div>
                    <span>{config.particleCount.toLocaleString()}</span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="100"
                    step="1"
                    value={Math.max(0, Math.min(100, Math.round(Math.log10(Math.max(1000, config.particleCount)) * 20)))} // Convert particle count to slider position (min 1000 particles)
                    onChange={(e) => {
                      const sliderValue = parseInt(e.target.value);
                      const particleCount = Math.max(1000, Math.min(1000000, Math.round(Math.pow(10, sliderValue / 20)))); // Convert slider position to particle count (1000 to 1M range)
                      onConfigChange({ particleCount });
                    }}
                    className="w-full h-1 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-blue-500"
                  />
                </div>

                {/* Particle Color (Only for colorless PLY) */}
                {showColorPicker && (
                  <div className="space-y-2 animate-in fade-in zoom-in duration-300">
                    <div className="flex justify-between text-xs text-gray-300">
                      <div className="flex items-center gap-1"><Palette size={12} /> Particle Color</div>
                      <span className="uppercase">{config.particleColor}</span>
                    </div>
                    <div className="flex items-center gap-2">
                        <input
                          type="color"
                          value={config.particleColor}
                          onChange={(e) => onConfigChange({ particleColor: e.target.value })}
                          className="w-full h-8 rounded cursor-pointer bg-transparent border-0 p-0"
                        />
                    </div>
                  </div>
                )}

                {/* Displacement (Only for Images mostly, but can affect logic) */}
                {appState.mode === 'image' && (
                  <div className="space-y-2">
                    <div className="flex justify-between text-xs text-gray-300">
                      <div className="flex items-center gap-1"><Eye size={12} /> Depth Scale</div>
                      <span>{config.displacementScale.toFixed(1)}</span>
                    </div>
                    <input
                      type="range"
                      min="0"
                      max="10"
                      step="0.1"
                      value={config.displacementScale}
                      onChange={(e) => onConfigChange({ displacementScale: parseFloat(e.target.value) })}
                      className="w-full h-1 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-cyan-400"
                    />
                  </div>
                )}

                {/* Noise Amp */}
                <div className="space-y-2">
                  <div className="flex justify-between text-xs text-gray-300">
                    <div className="flex items-center gap-1"><Activity size={12} /> Amplitude</div>
                    <span>{config.noiseAmplitude.toFixed(2)}</span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="2"
                    step="0.01"
                    value={config.noiseAmplitude}
                    onChange={(e) => onConfigChange({ noiseAmplitude: parseFloat(e.target.value) })}
                    className="w-full h-1 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-purple-400"
                  />
                </div>

                {/* Noise Scale (Perlin Field) */}
                {config.noiseBlend > 0.3 && (
                  <div className="space-y-2 animate-in fade-in zoom-in duration-300">
                    <div className="flex justify-between text-xs text-gray-300">
                      <div className="flex items-center gap-1"><Gauge size={12} /> Field Scale</div>
                      <span>{config.noiseScale.toFixed(2)}</span>
                    </div>
                    <input
                      type="range"
                      min="0.02"
                      max="2.0"
                      step="0.02"
                      value={config.noiseScale}
                      onChange={(e) => onConfigChange({ noiseScale: parseFloat(e.target.value) })}
                      className="w-full h-1 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-indigo-400"
                    />
                  </div>
                )}

                {/* Speed */}
                <div className="space-y-2">
                  <div className="flex justify-between text-xs text-gray-300">
                    <div className="flex items-center gap-1"><Play size={12} /> Speed</div>
                    <span>{config.noiseSpeed.toFixed(2)}</span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="5"
                    step="0.02"
                    value={config.noiseSpeed}
                    onChange={(e) => onConfigChange({ noiseSpeed: parseFloat(e.target.value) })}
                    className="w-full h-1 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-green-400"
                  />
                </div>

                {/* Trails */}
                <div className="space-y-2">
                  <div className="flex justify-between text-xs text-gray-300">
                    <div className="flex items-center gap-1"><Wind size={12} /> Trail Length</div>
                    <span>{config.trailLength.toFixed(3)}</span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="5.0"
                    step="0.05"
                    value={config.trailLength}
                    onChange={(e) => onConfigChange({ trailLength: parseFloat(e.target.value) })}
                    className="w-full h-1 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-pink-400"
                  />
                </div>
                
                {/* Point Size */}
                 <div className="space-y-2">
                  <div className="flex justify-between text-xs text-gray-300">
                    <div className="flex items-center gap-1">Point Size (0 to hide)</div>
                    <span>{config.pointSize.toFixed(2)}</span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="3.5"
                    step="0.02"
                    value={config.pointSize}
                    onChange={(e) => onConfigChange({ pointSize: parseFloat(e.target.value) })}
                    className="w-full h-1 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-yellow-400"
                  />
                </div>

                {/* Trail Thickness */}
                 <div className="space-y-2">
                  <div className="flex justify-between text-xs text-gray-300">
                    <div className="flex items-center gap-1">Trail Thickness (0 to hide)</div>
                    <span>{config.trailThickness.toFixed(2)}</span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="3.5"
                    step="0.01"
                    value={config.trailThickness}
                    onChange={(e) => onConfigChange({ trailThickness: parseFloat(e.target.value) })}
                    className="w-full h-1 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-orange-400"
                  />
                </div>
                  </div>
                )}

                {/* Advanced Tab Content */}
                {activeTab === 'advanced' && (
                  <div className="space-y-5">
                    {/* Up Axis Toggle */}
                    <div className="space-y-2">
                      <div className="flex justify-between text-xs text-gray-300">
                        <div className="flex items-center gap-1"><RotateCcw size={12} /> World Up Axis</div>
                        <span className="font-mono">{config.upAxis}</span>
                      </div>
                      <div className="flex bg-gray-800 rounded-lg p-1 gap-1">
                        <button
                          onClick={() => {
                            const axes: ('Y' | 'Z' | 'X')[] = ['Y', 'Z', 'X'];
                            const currentIndex = axes.indexOf(config.upAxis);
                            const nextIndex = (currentIndex + 1) % axes.length;
                            onConfigChange({ upAxis: axes[nextIndex] });
                          }}
                          className="flex-1 py-1 px-2 rounded-md text-xs font-medium transition-all bg-gradient-to-r from-cyan-600 to-purple-600 text-white shadow-sm hover:from-cyan-500 hover:to-purple-500"
                        >
                          Cycle
                        </button>
                        <button
                          onClick={() => {
                            // Auto-detect will be handled in App.tsx
                            onConfigChange({ autoDetectAxis: true });
                          }}
                          className="flex-1 py-1 px-2 rounded-md text-xs font-medium transition-all bg-gradient-to-r from-purple-600 to-pink-600 text-white shadow-sm hover:from-purple-500 hover:to-pink-500"
                        >
                          Auto
                        </button>
                      </div>
                    </div>

                    {/* Color Filter Checkbox */}
                    <div className="space-y-2">
                      <div className="flex justify-between text-xs text-gray-300">
                        <div className="flex items-center gap-1"><BoxSelect size={12} /> Filter by Color</div>
                      </div>
                      <label className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          checked={config.enableColorFilter}
                          onChange={(e) => onConfigChange({ enableColorFilter: e.target.checked })}
                          className="w-4 h-4 text-cyan-600 bg-gray-800 border-gray-600 rounded focus:ring-cyan-500 focus:ring-2"
                        />
                        <span className="text-xs text-gray-300">Remove points matching filter color</span>
                      </label>
                    </div>

                    {/* Filter Color Picker */}
                    {config.enableColorFilter && (
                      <div className="space-y-2 animate-in fade-in zoom-in duration-300">
                        <div className="flex justify-between text-xs text-gray-300">
                          <div className="flex items-center gap-1"><Palette size={12} /> Filter Color</div>
                          <span className="uppercase">{config.filterColor}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <input
                            type="color"
                            value={config.filterColor}
                            onChange={(e) => onConfigChange({ filterColor: e.target.value })}
                            className="w-full h-8 rounded cursor-pointer bg-transparent border-0 p-0"
                          />
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* Settings Toggle Button */}
            <button
              onClick={() => setIsSettingsOpen(!isSettingsOpen)}
              className="w-12 h-12 flex items-center justify-center rounded-full bg-black/60 hover:bg-black/80 text-white border border-white/10 backdrop-blur-xl shadow-lg transition-transform hover:scale-110 active:scale-95 group"
              title={isSettingsOpen ? "Hide Settings" : "Show Settings"}
            >
              {isSettingsOpen ? (
                <ChevronDown size={24} className="text-gray-300 group-hover:text-white" />
              ) : (
                <Settings2 size={24} className="text-cyan-400 group-hover:text-cyan-200" />
              )}
            </button>
        </div>
      )}
      
      {!hasContent && !appState.isGenerating && (
         <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <div className="text-center space-y-4 max-w-lg mx-auto p-6">
                <div className="text-6xl text-white/5 font-black">DROP ZONE</div>
                <p className="text-gray-400">Upload an image to generate a 3D depth cloud or a .PLY file for direct visualization.</p>
            </div>
         </div>
      )}
    </div>
  );
};

export default UI;
