import React, { useState, useCallback, useEffect } from 'react';
import Scene from './components/Scene';
import UI from './components/UI';
import { PointCloudState, SimulationConfig } from './types';
import { generateDepthMap } from './services/geminiService';
import { PLYLoader } from 'three/addons/loaders/PLYLoader.js';
import * as THREE from 'three';

const DEFAULT_CONFIG: SimulationConfig = {
  pointSize: 0,
  trailThickness: 0.5,
  useRealTrailThickness: true,
  displacementScale: 3.5,
  noiseSpeed: 0.3,
  noiseAmplitude: 0.3,
  noiseScale: 0.5,
  trailLength: 2.0,
  noiseType: 1,
  particleColor: '#00ffff',
  particleCount: 40000, // Default 40k particles
  enableColorFilter: false,
  filterColor: '#ffffff', // Default to white
  upAxis: 'Y', // Default Y up
};

const App: React.FC = () => {
  const [state, setState] = useState<PointCloudState>({
    mode: 'image',
    originalImage: null,
    depthImage: null,
    rawPlyPositions: null,
    rawPlyColors: null,
    plyPositions: null,
    plyColors: null,
    isGenerating: false,
    error: null,
  });

  const [config, setConfig] = useState<SimulationConfig>(DEFAULT_CONFIG);

  const handleConfigChange = (newConfig: Partial<SimulationConfig>) => {
    setConfig(prev => ({ ...prev, ...newConfig }));
  };

  // Helper to subsample points with optional color filtering
  const subsamplePoints = useCallback((
      rawPos: Float32Array,
      rawCol: Float32Array | null,
      targetCount: number,
      enableColorFilter: boolean = false,
      filterColor: string = '#ffffff'
  ) => {
      const total = rawPos.length / 3;

      // Convert filter color to RGB values (0-1 range)
      let filterR = 1, filterG = 1, filterB = 1;
      if (enableColorFilter && rawCol) {
          const filterHex = filterColor.replace('#', '');
          filterR = parseInt(filterHex.substr(0, 2), 16) / 255;
          filterG = parseInt(filterHex.substr(2, 2), 16) / 255;
          filterB = parseInt(filterHex.substr(4, 2), 16) / 255;
      }

      // First pass: filter out points that match the filter color (if enabled)
      const validIndices: number[] = [];
      for (let i = 0; i < total; i++) {
          if (enableColorFilter && rawCol) {
              const r = rawCol[i * 3];
              const g = rawCol[i * 3 + 1];
              const b = rawCol[i * 3 + 2];

              // Check if color matches (with small tolerance for floating point precision)
              const tolerance = 0.01;
              if (Math.abs(r - filterR) < tolerance &&
                  Math.abs(g - filterG) < tolerance &&
                  Math.abs(b - filterB) < tolerance) {
                  continue; // Skip this point
              }
          }
          validIndices.push(i);
      }

      const filteredTotal = validIndices.length;
      if (filteredTotal <= targetCount) {
          // No subsampling needed, just copy filtered points
          const newPos = new Float32Array(filteredTotal * 3);
          const newCol = rawCol ? new Float32Array(filteredTotal * 3) : null;

          for (let i = 0; i < filteredTotal; i++) {
              const srcIdx = validIndices[i];
              newPos[i*3+0] = rawPos[srcIdx*3+0];
              newPos[i*3+1] = rawPos[srcIdx*3+1];
              newPos[i*3+2] = rawPos[srcIdx*3+2];
              if (rawCol && newCol) {
                  newCol[i*3+0] = rawCol[srcIdx*3+0];
                  newCol[i*3+1] = rawCol[srcIdx*3+1];
                  newCol[i*3+2] = rawCol[srcIdx*3+2];
              }
          }
          return { positions: newPos, colors: newCol };
      }

      // Second pass: subsample from filtered points
      const step = Math.ceil(filteredTotal / targetCount);
      const newCount = Math.floor(filteredTotal / step);
      const newPos = new Float32Array(newCount * 3);
      const newCol = rawCol ? new Float32Array(newCount * 3) : null;

      for (let i = 0; i < newCount; i++) {
          const srcIdx = validIndices[i * step];
          newPos[i*3+0] = rawPos[srcIdx*3+0];
          newPos[i*3+1] = rawPos[srcIdx*3+1];
          newPos[i*3+2] = rawPos[srcIdx*3+2];
          if (rawCol && newCol) {
              newCol[i*3+0] = rawCol[srcIdx*3+0];
              newCol[i*3+1] = rawCol[srcIdx*3+1];
              newCol[i*3+2] = rawCol[srcIdx*3+2];
          }
      }
      return { positions: newPos, colors: newCol };
  }, []);

  // Re-run subsampling when particleCount changes, color filtering changes, or raw data changes
  useEffect(() => {
    if (state.mode === 'ply' && state.rawPlyPositions) {
        const { positions, colors } = subsamplePoints(
            state.rawPlyPositions,
            state.rawPlyColors,
            config.particleCount,
            config.enableColorFilter,
            config.filterColor
        );
        setState(prev => ({
            ...prev,
            plyPositions: positions,
            plyColors: colors
        }));
    }
  }, [config.particleCount, config.enableColorFilter, config.filterColor, state.rawPlyPositions, state.rawPlyColors, state.mode, subsamplePoints]);

  const handleImageUpload = useCallback(async (file: File) => {
    // 1. PLY HANDLING
    if (file.name.toLowerCase().endsWith('.ply')) {
      setState(prev => ({ ...prev, isGenerating: true, error: null, mode: 'ply' }));
      
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const data = e.target?.result as ArrayBuffer;
          const loader = new PLYLoader();
          const geometry = loader.parse(data);
          
          let positions = geometry.attributes.position.array as Float32Array;
          let colors = geometry.attributes.color ? (geometry.attributes.color.array as Float32Array) : null;
          
          // Normalize Raw Coordinates immediately to fit in box
          let minX=Infinity, minY=Infinity, minZ=Infinity;
          let maxX=-Infinity, maxY=-Infinity, maxZ=-Infinity;
          
          for(let i=0; i<positions.length; i+=3) {
            minX = Math.min(minX, positions[i]);
            minY = Math.min(minY, positions[i+1]);
            minZ = Math.min(minZ, positions[i+2]);
            maxX = Math.max(maxX, positions[i]);
            maxY = Math.max(maxY, positions[i+1]);
            maxZ = Math.max(maxZ, positions[i+2]);
          }

          const centerX = (minX+maxX)/2;
          const centerY = (minY+maxY)/2;
          const centerZ = (minZ+maxZ)/2;
          
          const size = Math.max(maxX-minX, maxY-minY, maxZ-minZ);
          const scale = size > 0 ? 10.0 / size : 1.0;

          // Mutate in place for raw storage
          for(let i=0; i<positions.length; i+=3) {
             positions[i] = (positions[i] - centerX) * scale;
             positions[i+1] = (positions[i+1] - centerY) * scale;
             positions[i+2] = (positions[i+2] - centerZ) * scale;
          }
          
          // Initial subsample will be handled by useEffect because we set rawPlyPositions
          setState(prev => ({
             ...prev,
             rawPlyPositions: positions,
             rawPlyColors: colors,
             // plyPositions will be updated by useEffect
             isGenerating: false,
             mode: 'ply'
          }));

        } catch (err: any) {
           setState(prev => ({ ...prev, isGenerating: false, error: "Failed to parse PLY file." }));
        }
      };
      reader.readAsArrayBuffer(file);
      return;
    }

    // 2. IMAGE HANDLING
    if (!file.type.startsWith('image/')) {
      setState(prev => ({ ...prev, error: 'Please upload a valid image or .ply file.' }));
      return;
    }

    const reader = new FileReader();
    reader.onload = async (e) => {
      const base64 = e.target?.result as string;
      
      setState({
        mode: 'image',
        originalImage: base64,
        depthImage: null, 
        rawPlyPositions: null,
        rawPlyColors: null,
        plyPositions: null,
        plyColors: null,
        isGenerating: true,
        error: null
      });

      try {
        const depthBase64 = await generateDepthMap(base64);
        
        setState(prev => ({
          ...prev,
          depthImage: depthBase64,
          isGenerating: false
        }));
      } catch (err: any) {
        setState(prev => ({
          ...prev,
          isGenerating: false,
          error: err.message || 'Failed to generate depth map.'
        }));
      }
    };
    
    reader.onerror = () => {
      setState(prev => ({ ...prev, error: 'Failed to read file.' }));
    };

    reader.readAsDataURL(file);
  }, []);

  const hasContent = (state.mode === 'image' && state.originalImage && state.depthImage) || 
                     (state.mode === 'ply' && state.plyPositions);

  return (
    <div className="relative w-screen h-screen overflow-hidden bg-neutral-900">
      <UI 
        appState={state} 
        config={config} 
        onImageUpload={handleImageUpload}
        onConfigChange={handleConfigChange}
      />
      
      <div className="absolute inset-0 z-0">
        {hasContent ? (
           <Scene appState={state} config={config} />
        ) : (
            <div className="w-full h-full flex items-center justify-center bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-gray-800 via-gray-950 to-black">
                <div className="absolute inset-0 opacity-20 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] brightness-150 contrast-150"></div>
            </div>
        )}
      </div>
    </div>
  );
};

export default App;
