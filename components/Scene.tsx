import React, { Suspense, useRef, useEffect, useState } from 'react';
import { Canvas, useThree } from '@react-three/fiber';
import { OrbitControls, Loader } from '@react-three/drei';
import * as THREE from 'three';
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

const CameraController: React.FC<{ upAxis: 'Y' | 'Z' | 'X'; onAxisChange: () => void }> = ({ upAxis, onAxisChange }) => {
  const { camera } = useThree();

  useEffect(() => {
    switch (upAxis) {
      case 'Y':
        camera.up.set(0, 1, 0);
        break;
      case 'Z':
        camera.up.set(0, 0, 1);
        break;
      case 'X':
        camera.up.set(1, 0, 0);
        break;
    }
    // Update the camera matrix
    camera.updateProjectionMatrix();
    // Trigger the visual indicator
    onAxisChange();
  }, [upAxis, camera, onAxisChange]);

  return null;
};

const UpAxisIndicator: React.FC<{ upAxis: 'Y' | 'Z' | 'X'; show: boolean }> = ({ upAxis, show }) => {
  if (!show) return null;

  const getArrowDirection = (axis: 'Y' | 'Z' | 'X') => {
    switch (axis) {
      case 'Y': return new THREE.Vector3(0, 1, 0); // Up direction for Y axis
      case 'Z': return new THREE.Vector3(0, 0, 1); // Forward direction for Z axis
      case 'X': return new THREE.Vector3(1, 0, 0); // Right direction for X axis
    }
  };

  const getPosition = (axis: 'Y' | 'Z' | 'X') => {
    switch (axis) {
      case 'Y': return new THREE.Vector3(0, 4, 0);
      case 'Z': return new THREE.Vector3(0, 0, 4);
      case 'X': return new THREE.Vector3(4, 0, 0);
    }
  };

  const direction = getArrowDirection(upAxis);
  const position = getPosition(upAxis);
  const length = 2.5;
  const color = 0x00ffff; // Cyan color

  // Use ArrowHelper which is specifically designed for this purpose
  const arrowHelper = new THREE.ArrowHelper(direction, position, length, color);

  return (
    <primitive object={arrowHelper} />
  );
};

const Scene: React.FC<SceneProps> = ({ appState, config }) => {
  const [showIndicator, setShowIndicator] = useState(false);

  const handleAxisChange = () => {
    setShowIndicator(true);
    setTimeout(() => setShowIndicator(false), 2000); // Show for 2 seconds
  };

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

        <CameraController upAxis={config.upAxis} onAxisChange={handleAxisChange} />
        <UpAxisIndicator upAxis={config.upAxis} show={showIndicator} />

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
