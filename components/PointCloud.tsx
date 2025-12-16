import React, { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { useTexture } from '@react-three/drei';
import { SimulationConfig } from '../types';
import { SHARED_GLSL } from '../utils/shaderUtils';

declare global {
  namespace JSX {
    interface IntrinsicElements {
      group: any;
      points: any;
      mesh: any;
      lineSegments: any;
      shaderMaterial: any;
    }
  }
}

interface PointCloudProps {
  originalUrl: string;
  depthUrl: string;
  config: SimulationConfig;
}

// --- TRAIL (LINES) SHADER [SIMPLE MODE] ---
const TrailMaterialSimple = {
  uniforms: {
    uColorMap: { value: null },
    uDepthMap: { value: null },
    uTime: { value: 0 },
    uDisplacementScale: { value: 2.0 },
    uNoiseAmplitude: { value: 0.5 },
    uNoiseSpeed: { value: 1.0 },
    uNoiseScale: { value: 0.5 },
    uTrailLength: { value: 0.5 },
    uNoiseBlend: { value: 1.0 },
    uTimeRandomization: { value: 0.5 },
    uTimeRandomizationScale: { value: 1.0 },
  },
  vertexShader: `
    uniform sampler2D uDepthMap;
    uniform sampler2D uColorMap;
    uniform float uTime;
    uniform float uDisplacementScale;
    uniform float uNoiseAmplitude;
    uniform float uNoiseSpeed;
    uniform float uNoiseScale;
    uniform float uTrailLength;
    uniform float uNoiseBlend;
    uniform float uTimeRandomization;
    uniform float uTimeRandomizationScale;

    attribute vec2 aReferenceUV;
    attribute vec3 aBasePosition;
    attribute float aSegmentIndex;

    varying vec3 vColor;

    ${SHARED_GLSL}

    // Simple hash function for time randomization
    float hash(vec3 p) {
      return fract(sin(dot(p, vec3(127.1, 311.7, 74.7))) * 43758.5453123);
    }

    void main() {
      vColor = texture2D(uColorMap, aReferenceUV).rgb;
      vec3 depthRGB = texture2D(uDepthMap, aReferenceUV).rgb;
      float depth = dot(depthRGB, vec3(0.299, 0.587, 0.114));

      float speed = max(uNoiseSpeed, 0.1);
      float effectiveDuration = uTrailLength / speed;
      float timeLag = aSegmentIndex * effectiveDuration;

      // Generate time offset based on particle position
      float timeOffset = (hash(aBasePosition) - 0.5) * uTimeRandomization * uTimeRandomizationScale * 5.0;
      float localTime = uTime - timeLag + timeOffset;

      vec3 finalPos = getDisplacedPosition(
        aReferenceUV, depth, localTime, timeOffset, uTimeRandomizationScale,
        uNoiseAmplitude, uNoiseSpeed, uDisplacementScale, aBasePosition, uNoiseBlend, uNoiseScale
      );

      vec4 mvPosition = modelViewMatrix * vec4(finalPos, 1.0);
      gl_Position = projectionMatrix * mvPosition;
    }
  `,
  fragmentShader: `
    varying vec3 vColor;
    void main() {
      gl_FragColor = vec4(vColor, 1.0);
    }
  `
};

// --- TRAIL (RIBBONS) SHADER [REAL 3D MODE] ---
const TrailMaterialRibbon = {
  uniforms: {
    uColorMap: { value: null },
    uDepthMap: { value: null },
    uTime: { value: 0 },
    uDisplacementScale: { value: 2.0 },
    uNoiseAmplitude: { value: 0.5 },
    uNoiseSpeed: { value: 1.0 },
    uNoiseScale: { value: 0.5 },
    uTrailLength: { value: 0.5 },
    uNoiseBlend: { value: 1.0 },
    uTimeRandomization: { value: 0.5 },
    uTimeRandomizationScale: { value: 1.0 },
    uTrailThickness: { value: 0.1 },
  },
  vertexShader: `
    uniform sampler2D uDepthMap;
    uniform sampler2D uColorMap;
    uniform float uTime;
    uniform float uDisplacementScale;
    uniform float uNoiseAmplitude;
    uniform float uNoiseSpeed;
    uniform float uNoiseScale;
    uniform float uTrailLength;
    uniform float uTrailThickness;
    uniform float uNoiseBlend;
    uniform float uTimeRandomization;
    uniform float uTimeRandomizationScale;

    attribute vec2 aReferenceUV;
    attribute vec3 aBasePosition;
    attribute float aSegmentIndex;
    attribute float aSide; // -1.0 or 1.0 for ribbon expansion

    varying vec3 vColor;

    ${SHARED_GLSL}

    // Simple hash function for time randomization
    float hash(vec3 p) {
      return fract(sin(dot(p, vec3(127.1, 311.7, 74.7))) * 43758.5453123);
    }

    void main() {
      vColor = texture2D(uColorMap, aReferenceUV).rgb;
      vec3 depthRGB = texture2D(uDepthMap, aReferenceUV).rgb;
      float depth = dot(depthRGB, vec3(0.299, 0.587, 0.114));

      float speed = max(uNoiseSpeed, 0.1);
      float effectiveDuration = uTrailLength / speed;
      float timeLag = aSegmentIndex * effectiveDuration;

      // Generate time offset based on particle position
      float timeOffset = (hash(aBasePosition) - 0.5) * uTimeRandomization * uTimeRandomizationScale * 5.0;
      float localTime = uTime - timeLag + timeOffset;

      // 1. Calculate Current Position
      vec3 pos = getDisplacedPosition(
        aReferenceUV, depth, localTime, timeOffset, uTimeRandomizationScale,
        uNoiseAmplitude, uNoiseSpeed, uDisplacementScale, aBasePosition, uNoiseBlend, uNoiseScale
      );

      // 2. Calculate "Next" Position (slightly forward in time/path) to get tangent
      float dt = 0.05 * effectiveDuration; // Small delta
      vec3 nextPos = getDisplacedPosition(
        aReferenceUV, depth, localTime + dt, timeOffset, uTimeRandomizationScale,
        uNoiseAmplitude, uNoiseSpeed, uDisplacementScale, aBasePosition, uNoiseBlend, uNoiseScale
      );

      // 3. View Space Expansion (Billboarding)
      vec4 viewPos = modelViewMatrix * vec4(pos, 1.0);
      vec4 viewNextPos = modelViewMatrix * vec4(nextPos, 1.0);

      vec3 tangent = normalize(viewNextPos.xyz - viewPos.xyz);
      if (length(viewNextPos.xyz - viewPos.xyz) < 0.0001) {
         tangent = vec3(0.0, 1.0, 0.0);
      }

      vec3 viewDir = normalize(viewPos.xyz); // Vector from Camera to Point
      vec3 sideVec = normalize(cross(viewDir, tangent));

      float width = uTrailThickness * 0.05;
      vec3 finalViewPos = viewPos.xyz + (sideVec * aSide * width);

      gl_Position = projectionMatrix * vec4(finalViewPos, 1.0);
    }
  `,
  fragmentShader: `
    varying vec3 vColor;
    void main() {
      gl_FragColor = vec4(vColor, 1.0);
    }
  `
};

const HeadMaterial = {
  uniforms: {
    uColorMap: { value: null },
    uDepthMap: { value: null },
    uTime: { value: 0 },
    uDisplacementScale: { value: 2.0 },
    uPointSize: { value: 2.0 },
    uNoiseAmplitude: { value: 0.5 },
    uNoiseSpeed: { value: 1.0 },
    uNoiseScale: { value: 0.5 },
    uNoiseBlend: { value: 1.0 },
    uTimeRandomization: { value: 0.5 },
    uTimeRandomizationScale: { value: 1.0 },
  },
  vertexShader: `
    uniform sampler2D uDepthMap;
    uniform sampler2D uColorMap;
    uniform float uTime;
    uniform float uDisplacementScale;
    uniform float uPointSize;
    uniform float uNoiseAmplitude;
    uniform float uNoiseSpeed;
    uniform float uNoiseScale;
    uniform float uNoiseBlend;
    uniform float uTimeRandomization;
    uniform float uTimeRandomizationScale;

    varying vec3 vColor;

    ${SHARED_GLSL}

    // Simple hash function for time randomization
    float hash(vec3 p) {
      return fract(sin(dot(p, vec3(127.1, 311.7, 74.7))) * 43758.5453123);
    }

    void main() {
      vColor = texture2D(uColorMap, uv).rgb;
      vec3 depthRGB = texture2D(uDepthMap, uv).rgb;
      float depth = dot(depthRGB, vec3(0.299, 0.587, 0.114));

      // Generate time offset based on particle position
      float timeOffset = (hash(position) - 0.5) * uTimeRandomization * uTimeRandomizationScale * 5.0;

      vec3 finalPos = getDisplacedPosition(
        uv, depth, uTime, timeOffset, uTimeRandomizationScale,
        uNoiseAmplitude, uNoiseSpeed, uDisplacementScale, position, uNoiseBlend, uNoiseScale
      );

      vec4 mvPosition = modelViewMatrix * vec4(finalPos, 1.0);
      gl_Position = projectionMatrix * mvPosition;
      gl_PointSize = uPointSize * (100.0 / -mvPosition.z);
    }
  `,
  fragmentShader: `
    varying vec3 vColor;
    void main() {
      if (length(gl_PointCoord - vec2(0.5, 0.5)) > 0.5) discard;
      gl_FragColor = vec4(vColor, 1.0);
    }
  `
};

const PointCloud: React.FC<PointCloudProps> = ({ originalUrl, depthUrl, config }) => {
  const pointsRef = useRef<THREE.Points>(null);
  const trailsRef = useRef<THREE.Object3D>(null); // Can be LineSegments or Mesh
  
  const [colorMap, depthMap] = useTexture([originalUrl, depthUrl]);

  // Determine grid size based on particleCount
  const particleCount = config.particleCount || 40000;
  const side = Math.max(2, Math.round(Math.sqrt(particleCount)));
  const WIDTH = side;
  const HEIGHT = side;
  const SEGMENTS = 20;

  const geometryData = useMemo(() => {
    // 1. HEADS (Points)
    const headGeometry = new THREE.PlaneGeometry(10, 10, WIDTH - 1, HEIGHT - 1);

    // 2. TRAILS
    const actualParticleCount = WIDTH * HEIGHT;
    
    // Common arrays
    const uvs = new Float32Array(actualParticleCount * SEGMENTS * 2 * (config.useRealTrailThickness ? 2 : 1));
    const basePositions = new Float32Array(actualParticleCount * SEGMENTS * 3 * (config.useRealTrailThickness ? 2 : 1));
    const segmentIndices = new Float32Array(actualParticleCount * SEGMENTS * (config.useRealTrailThickness ? 2 : 1));
    
    let positions, indices, sides;

    if (config.useRealTrailThickness) {
        // RIBBON MODE
        const vertexCount = actualParticleCount * SEGMENTS * 2; // 2 verts per segment point
        positions = new Float32Array(vertexCount * 3);
        sides = new Float32Array(vertexCount); 
        indices = [];
    } else {
        // LINE MODE
        const vertexCount = actualParticleCount * SEGMENTS;
        positions = new Float32Array(vertexCount * 3);
        indices = [];
    }

    let vIdx = 0;

    for (let i = 0; i < actualParticleCount; i++) {
        const x = (i % WIDTH) / (Math.max(1, WIDTH - 1));
        const y = Math.floor(i / WIDTH) / (Math.max(1, HEIGHT - 1));
        const posX = (x - 0.5) * 10;
        const posY = (y - 0.5) * 10;
        const posZ = 0;

        for (let s = 0; s < SEGMENTS; s++) {
            const segRatio = s / (SEGMENTS - 1);

            if (config.useRealTrailThickness) {
                // RIBBON (2 vertices)
                // Left Vertex
                basePositions[vIdx*3+0] = posX; basePositions[vIdx*3+1] = posY; basePositions[vIdx*3+2] = posZ;
                uvs[vIdx*2+0] = x; uvs[vIdx*2+1] = y;
                segmentIndices[vIdx] = segRatio;
                sides![vIdx] = -1.0;
                positions![vIdx*3] = posX; positions![vIdx*3+1] = posY; positions![vIdx*3+2] = posZ; // dummy pos
                const idxL = vIdx;
                vIdx++;

                // Right Vertex
                basePositions[vIdx*3+0] = posX; basePositions[vIdx*3+1] = posY; basePositions[vIdx*3+2] = posZ;
                uvs[vIdx*2+0] = x; uvs[vIdx*2+1] = y;
                segmentIndices[vIdx] = segRatio;
                sides![vIdx] = 1.0;
                positions![vIdx*3] = posX; positions![vIdx*3+1] = posY; positions![vIdx*3+2] = posZ; // dummy pos
                const idxR = vIdx;
                vIdx++;

                if (s < SEGMENTS - 1) {
                    const nextL = idxL + 2;
                    const nextR = idxR + 2;
                    // Triangle 1: L, R, NextL
                    indices.push(idxL, idxR, nextL);
                    // Triangle 2: R, NextR, NextL
                    indices.push(idxR, nextR, nextL);
                }

            } else {
                // LINE (1 vertex)
                basePositions[vIdx*3+0] = posX; basePositions[vIdx*3+1] = posY; basePositions[vIdx*3+2] = posZ;
                uvs[vIdx*2+0] = x; uvs[vIdx*2+1] = y;
                segmentIndices[vIdx] = segRatio;
                positions![vIdx*3+0] = posX; positions![vIdx*3+1] = posY; positions![vIdx*3+2] = posZ;
                
                if (s < SEGMENTS - 1) {
                    indices.push(vIdx, vIdx + 1);
                }
                vIdx++;
            }
        }
    }

    const trailGeometry = new THREE.BufferGeometry();
    trailGeometry.setAttribute('position', new THREE.BufferAttribute(positions!, 3));
    trailGeometry.setAttribute('aBasePosition', new THREE.BufferAttribute(basePositions, 3));
    trailGeometry.setAttribute('aReferenceUV', new THREE.BufferAttribute(uvs, 2));
    trailGeometry.setAttribute('aSegmentIndex', new THREE.BufferAttribute(segmentIndices, 1));
    if (sides) {
        trailGeometry.setAttribute('aSide', new THREE.BufferAttribute(sides, 1));
    }
    trailGeometry.setIndex(indices);

    return { headGeometry, trailGeometry };
  }, [config.useRealTrailThickness, WIDTH, HEIGHT]); // Re-generate when count or mode changes

  useMemo(() => {
    colorMap.minFilter = THREE.LinearFilter;
    colorMap.magFilter = THREE.LinearFilter;
    depthMap.minFilter = THREE.LinearFilter;
    depthMap.magFilter = THREE.LinearFilter;
  }, [colorMap, depthMap]);

  useFrame((state) => {
    const time = state.clock.elapsedTime;

    // Update Heads
    if (pointsRef.current) {
      const mat = pointsRef.current.material as THREE.ShaderMaterial;
      mat.uniforms.uTime.value = time;
      mat.uniforms.uDisplacementScale.value = config.displacementScale;
      mat.uniforms.uPointSize.value = config.pointSize;
      mat.uniforms.uNoiseAmplitude.value = config.noiseAmplitude;
      mat.uniforms.uNoiseSpeed.value = config.noiseSpeed;
      mat.uniforms.uNoiseScale.value = config.noiseScale;
      mat.uniforms.uNoiseBlend.value = config.noiseBlend;
      mat.uniforms.uTimeRandomization.value = config.timeRandomization;
    }

    // Update Trails
    if (trailsRef.current) {
      // Cast to Mesh or LineSegments (both have material)
      const mesh = trailsRef.current as THREE.Mesh;
      const mat = mesh.material as THREE.ShaderMaterial;

      mat.uniforms.uTime.value = time;
      mat.uniforms.uDisplacementScale.value = config.displacementScale;
      mat.uniforms.uNoiseAmplitude.value = config.noiseAmplitude;
      mat.uniforms.uNoiseSpeed.value = config.noiseSpeed;
      mat.uniforms.uNoiseScale.value = config.noiseScale;
      mat.uniforms.uTrailLength.value = config.trailLength;
      mat.uniforms.uNoiseBlend.value = config.noiseBlend;
      mat.uniforms.uTimeRandomization.value = config.timeRandomization;

      if (config.useRealTrailThickness && mat.uniforms.uTrailThickness) {
          mat.uniforms.uTrailThickness.value = config.trailThickness;
      }
    }
  });

  const headShaderArgs = useMemo(() => ({
    uniforms: {
      uColorMap: { value: colorMap },
      uDepthMap: { value: depthMap },
      uTime: { value: 0 },
      uDisplacementScale: { value: config.displacementScale },
      uPointSize: { value: config.pointSize },
      uNoiseAmplitude: { value: config.noiseAmplitude },
      uNoiseSpeed: { value: config.noiseSpeed },
      uNoiseScale: { value: config.noiseScale },
      uNoiseBlend: { value: config.noiseBlend },
      uTimeRandomization: { value: config.timeRandomization },
      uTimeRandomizationScale: { value: config.timeRandomizationScale },
    },
    vertexShader: HeadMaterial.vertexShader,
    fragmentShader: HeadMaterial.fragmentShader,
    transparent: false,
    depthTest: true,
    depthWrite: true,
  }), [colorMap, depthMap, config]);

  const trailShaderArgs = useMemo(() => {
    if (config.useRealTrailThickness) {
        return {
            uniforms: {
                uColorMap: { value: colorMap },
                uDepthMap: { value: depthMap },
                uTime: { value: 0 },
                uDisplacementScale: { value: config.displacementScale },
                uNoiseAmplitude: { value: config.noiseAmplitude },
                uNoiseSpeed: { value: config.noiseSpeed },
                uNoiseScale: { value: config.noiseScale },
                uTrailLength: { value: config.trailLength },
                uNoiseBlend: { value: config.noiseBlend },
                uTimeRandomization: { value: config.timeRandomization },
                uTimeRandomizationScale: { value: config.timeRandomizationScale },
                uTrailThickness: { value: config.trailThickness },
            },
            vertexShader: TrailMaterialRibbon.vertexShader,
            fragmentShader: TrailMaterialRibbon.fragmentShader,
            transparent: false,
            depthTest: true,
            depthWrite: true,
            side: THREE.DoubleSide,
        };
    } else {
        return {
            uniforms: {
                uColorMap: { value: colorMap },
                uDepthMap: { value: depthMap },
                uTime: { value: 0 },
                uDisplacementScale: { value: config.displacementScale },
                uNoiseAmplitude: { value: config.noiseAmplitude },
                uNoiseSpeed: { value: config.noiseSpeed },
                uNoiseScale: { value: config.noiseScale },
                uTrailLength: { value: config.trailLength },
                uNoiseBlend: { value: config.noiseBlend },
                uTimeRandomization: { value: config.timeRandomization },
                uTimeRandomizationScale: { value: config.timeRandomizationScale },
            },
            vertexShader: TrailMaterialSimple.vertexShader,
            fragmentShader: TrailMaterialSimple.fragmentShader,
            transparent: false,
            depthTest: true,
            depthWrite: true,
            blending: THREE.NormalBlending,
            linewidth: config.trailThickness,
        };
    }
  }, [colorMap, depthMap, config]);

  return (
    <group>
      {/* Heads */}
      {config.pointSize > 0 && (
        <points ref={pointsRef} geometry={geometryData.headGeometry}>
          <shaderMaterial attach="material" args={[headShaderArgs]} />
        </points>
      )}
      
      {/* Trails */}
      {config.trailThickness > 0 && (
         config.useRealTrailThickness ? (
            <mesh ref={trailsRef as any} geometry={geometryData.trailGeometry}>
                <shaderMaterial attach="material" args={[trailShaderArgs]} />
            </mesh>
         ) : (
            <lineSegments ref={trailsRef as any} geometry={geometryData.trailGeometry}>
                <shaderMaterial attach="material" args={[trailShaderArgs]} />
            </lineSegments>
         )
      )}
    </group>
  );
};

export default PointCloud;
