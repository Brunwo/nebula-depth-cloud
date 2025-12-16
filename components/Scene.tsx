import React, { Suspense } from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls, Loader } from '@react-three/drei';
import PointCloud from './PointCloud';
import PlyPointCloud from './PlyPointCloud';
import { PointCloudState, SimulationConfig } from '../types';

declare global {
  namespace JSX {
    interface IntrinsicElements {
      color: any;
    }
  }
}

interface SceneProps {
  appState: PointCloudState;
  config: SimulationConfig;
}

const Scene: React.FC<SceneProps> = ({ appState, config }) => {
  return (
    <div className="w-full h-full absolute inset-0 bg-black">
      <Canvas
        camera={{ position: [0, 0, 12], fov: 60 }}
        gl={{ 
            antialias: true,
            alpha: false, 
            powerPreference: "high-performance" 
        }}
        dpr={[1, 2]}
      >
        <color attach="background" args={['#050505']} />
        
        <Suspense fallback={null}>
          {appState.mode === 'image' && appState.originalImage && appState.depthImage && (
             <PointCloud 
                originalUrl={appState.originalImage} 
                depthUrl={appState.depthImage} 
                config={config} 
              />
          )}

          {appState.mode === 'ply' && appState.plyPositions && (
             <PlyPointCloud
                positions={appState.plyPositions}
                colors={appState.plyColors}
                config={config}
             />
          )}
        </Suspense>

        <OrbitControls 
            enablePan={true} 
            enableZoom={true} 
            enableRotate={true}
            autoRotate={true}
            autoRotateSpeed={0.5}
        />
      </Canvas>
      <Loader />
    </div>
  );
};

export default Scene;