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
  noiseType: number; // 0 = Turbulence (Curl), 1 = Perlin (Field)
  particleColor: string;
  particleCount: number; // Target number of particles
}
