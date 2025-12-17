export interface PointCloudState {
  mode: 'image' | 'ply';
  originalImage: string | null;
  depthImage: string | null;
  // PLY Data
  rawPlyPositions: Float32Array | null; // Full resolution data
  rawPlyColors: Float32Array | null;    // Full resolution data
  plyPositions: Float32Array | null;    // Subsampled data for rendering
  plyColors: Float32Array | null;       // Subsampled data for rendering
  
  isGenerating: boolean;
  error: string | null;
}

export interface SimulationConfig {
  pointSize: number;
  trailThickness: number;
  useRealTrailThickness: boolean;
  displacementScale: number;
  noiseSpeed: number;
  noiseAmplitude: number;
  noiseScale: number;
  trailLength: number;
  noiseBlend: number; // 0.0 = Pure Turbulence, 1.0 = Pure Perlin Field
  timeRandomization: number; // 0.0 = No randomization, 1.0 = Full randomization of particle timing
  timeRandomizationScale: number; // Scale factor for randomization range (1.0 = ±5 seconds, 2.0 = ±10 seconds, etc.)
  speedRandomization: number; // 0.0 = Uniform speed, 1.0 = Full speed randomization per particle
  particleColor: string;
  particleCount: number; // Target number of particles
  enableColorFilter: boolean;
  filterColor: string;
  upAxis: 'Y' | 'Z' | 'X'; // World up axis for camera
  autoDetectAxis?: boolean; // Flag to trigger auto-detection
  lightEmissionProportion: number; // Percentage (0-1) of particles that emit light
  lightSelectionMode: 'brightness' | 'random'; // How to select emitting particles
}
