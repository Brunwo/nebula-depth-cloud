import React, { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
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

interface PlyPointCloudProps {
  positions: Float32Array;
  colors: Float32Array | null;
  config: SimulationConfig;
}

// --- SHADERS ---
const PlyTrailMaterialSimple = {
  uniforms: {
    uTime: { value: 0 },
    uNoiseAmplitude: { value: 0.5 },
    uNoiseSpeed: { value: 1.0 },
    uNoiseScale: { value: 0.5 },
    uTrailLength: { value: 0.5 },
    uNoiseType: { value: 0 },
    uParticleColor: { value: new THREE.Color(1, 1, 1) },
    uUseVertexColors: { value: 0.0 },
  },
  vertexShader: `
    uniform float uTime;
    uniform float uNoiseAmplitude;
    uniform float uNoiseSpeed;
    uniform float uNoiseScale;
    uniform float uTrailLength;
    uniform int uNoiseType;
    uniform vec3 uParticleColor;
    uniform float uUseVertexColors;
    
    attribute vec3 aColor;
    attribute vec3 aBasePosition;
    attribute float aSegmentIndex; 
    
    varying vec3 vColor;

    ${SHARED_GLSL}

    void main() {
      vColor = mix(uParticleColor, aColor, uUseVertexColors);
      
      float speed = max(uNoiseSpeed, 0.1);
      float effectiveDuration = uTrailLength / speed;
      float timeLag = aSegmentIndex * effectiveDuration;
      float localTime = uTime - timeLag;

      vec3 finalPos = getDisplacedPosition(
        vec2(0.0), 0.0, localTime, 
        uNoiseAmplitude, uNoiseSpeed, 0.0, aBasePosition, uNoiseType, uNoiseScale
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

const PlyTrailMaterialRibbon = {
  uniforms: {
    uTime: { value: 0 },
    uNoiseAmplitude: { value: 0.5 },
    uNoiseSpeed: { value: 1.0 },
    uNoiseScale: { value: 0.5 },
    uTrailLength: { value: 0.5 },
    uNoiseType: { value: 0 },
    uTrailThickness: { value: 0.1 },
    uParticleColor: { value: new THREE.Color(1, 1, 1) },
    uUseVertexColors: { value: 0.0 },
  },
  vertexShader: `
    uniform float uTime;
    uniform float uNoiseAmplitude;
    uniform float uNoiseSpeed;
    uniform float uNoiseScale;
    uniform float uTrailLength;
    uniform float uTrailThickness;
    uniform int uNoiseType;
    uniform vec3 uParticleColor;
    uniform float uUseVertexColors;
    
    attribute vec3 aColor;
    attribute vec3 aBasePosition;
    attribute float aSegmentIndex;
    attribute float aSide;
    
    varying vec3 vColor;

    ${SHARED_GLSL}

    void main() {
      vColor = mix(uParticleColor, aColor, uUseVertexColors);
      
      float speed = max(uNoiseSpeed, 0.1);
      float effectiveDuration = uTrailLength / speed;
      float timeLag = aSegmentIndex * effectiveDuration;
      float localTime = uTime - timeLag;

      // 1. Position
      vec3 pos = getDisplacedPosition(
        vec2(0.0), 0.0, localTime, 
        uNoiseAmplitude, uNoiseSpeed, 0.0, aBasePosition, uNoiseType, uNoiseScale
      );

      // 2. Next Position for Tangent
      float dt = 0.05 * effectiveDuration;
      vec3 nextPos = getDisplacedPosition(
        vec2(0.0), 0.0, localTime + dt, 
        uNoiseAmplitude, uNoiseSpeed, 0.0, aBasePosition, uNoiseType, uNoiseScale
      );

      // 3. Expansion
      vec4 viewPos = modelViewMatrix * vec4(pos, 1.0);
      vec4 viewNextPos = modelViewMatrix * vec4(nextPos, 1.0);
      
      vec3 tangent = normalize(viewNextPos.xyz - viewPos.xyz);
      if (length(viewNextPos.xyz - viewPos.xyz) < 0.0001) tangent = vec3(0.0, 1.0, 0.0);
      
      vec3 viewDir = normalize(viewPos.xyz);
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

const PlyHeadMaterial = {
  uniforms: {
    uTime: { value: 0 },
    uPointSize: { value: 2.0 },
    uNoiseAmplitude: { value: 0.5 },
    uNoiseSpeed: { value: 1.0 },
    uNoiseScale: { value: 0.5 },
    uNoiseType: { value: 0 },
    uParticleColor: { value: new THREE.Color(1, 1, 1) },
    uUseVertexColors: { value: 0.0 },
  },
  vertexShader: `
    uniform float uTime;
    uniform float uPointSize;
    uniform float uNoiseAmplitude;
    uniform float uNoiseSpeed;
    uniform float uNoiseScale;
    uniform int uNoiseType;
    uniform vec3 uParticleColor;
    uniform float uUseVertexColors;
    
    attribute vec3 aColor; 
    
    varying vec3 vColor;

    ${SHARED_GLSL}

    void main() {
      vColor = mix(uParticleColor, aColor, uUseVertexColors);

      vec3 finalPos = getDisplacedPosition(
        vec2(0.0), 0.0, uTime, 
        uNoiseAmplitude, uNoiseSpeed, 0.0, position, uNoiseType, uNoiseScale
      );

      vec4 mvPosition = modelViewMatrix * vec4(finalPos, 1.0);
      gl_Position = projectionMatrix * mvPosition;

      // Size attenuation
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

const PlyPointCloud: React.FC<PlyPointCloudProps> = ({ positions, colors, config }) => {
  const pointsRef = useRef<THREE.Points>(null);
  const trailsRef = useRef<THREE.Object3D>(null);

  const SEGMENTS = 20;
  
  // Helper to convert hex string to THREE.Color
  const particleColorObj = useMemo(() => new THREE.Color(config.particleColor), [config.particleColor]);
  const hasVertexColors = colors !== null;

  const geometryData = useMemo(() => {
    const count = positions.length / 3;
    
    // 1. HEADS
    const headGeometry = new THREE.BufferGeometry();
    headGeometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    // If no colors, we fill with white, but shader will ignore it due to uUseVertexColors=0
    const effectiveColors = colors || new Float32Array(count * 3).fill(1.0);
    headGeometry.setAttribute('aColor', new THREE.BufferAttribute(effectiveColors, 3));

    // 2. TRAILS
    let trailPositions, trailColors, segmentIndices, indices, sides;

    if (config.useRealTrailThickness) {
         // Ribbon
         const vertexCount = count * SEGMENTS * 2;
         trailPositions = new Float32Array(vertexCount * 3);
         trailColors = new Float32Array(vertexCount * 3);
         segmentIndices = new Float32Array(vertexCount);
         sides = new Float32Array(vertexCount);
         indices = [];
    } else {
         // Line
         const vertexCount = count * SEGMENTS;
         trailPositions = new Float32Array(vertexCount * 3);
         trailColors = new Float32Array(vertexCount * 3);
         segmentIndices = new Float32Array(vertexCount);
         indices = [];
    }

    let vIdx = 0;

    for (let i = 0; i < count; i++) {
        const px = positions[i * 3 + 0];
        const py = positions[i * 3 + 1];
        const pz = positions[i * 3 + 2];
        
        const cx = effectiveColors[i * 3 + 0];
        const cy = effectiveColors[i * 3 + 1];
        const cz = effectiveColors[i * 3 + 2];

        for (let s = 0; s < SEGMENTS; s++) {
            const segRatio = s / (SEGMENTS - 1);

            if (config.useRealTrailThickness) {
                 // Left
                 trailPositions![vIdx*3+0] = px; trailPositions![vIdx*3+1] = py; trailPositions![vIdx*3+2] = pz;
                 trailColors![vIdx*3+0] = cx; trailColors![vIdx*3+1] = cy; trailColors![vIdx*3+2] = cz;
                 segmentIndices![vIdx] = segRatio;
                 sides![vIdx] = -1.0;
                 const idxL = vIdx;
                 vIdx++;

                 // Right
                 trailPositions![vIdx*3+0] = px; trailPositions![vIdx*3+1] = py; trailPositions![vIdx*3+2] = pz;
                 trailColors![vIdx*3+0] = cx; trailColors![vIdx*3+1] = cy; trailColors![vIdx*3+2] = cz;
                 segmentIndices![vIdx] = segRatio;
                 sides![vIdx] = 1.0;
                 const idxR = vIdx;
                 vIdx++;

                 if (s < SEGMENTS - 1) {
                    const nextL = idxL + 2;
                    const nextR = idxR + 2;
                    indices.push(idxL, idxR, nextL);
                    indices.push(idxR, nextR, nextL);
                 }
            } else {
                 trailPositions![vIdx*3+0] = px; trailPositions![vIdx*3+1] = py; trailPositions![vIdx*3+2] = pz;
                 trailColors![vIdx*3+0] = cx; trailColors![vIdx*3+1] = cy; trailColors![vIdx*3+2] = cz;
                 segmentIndices![vIdx] = segRatio;
                 
                 if (s < SEGMENTS - 1) {
                    indices.push(vIdx, vIdx + 1);
                 }
                 vIdx++;
            }
        }
    }

    const trailGeometry = new THREE.BufferGeometry();
    trailGeometry.setAttribute('position', new THREE.BufferAttribute(trailPositions!, 3));
    trailGeometry.setAttribute('aBasePosition', new THREE.BufferAttribute(trailPositions!, 3)); // For shader consistency
    trailGeometry.setAttribute('aColor', new THREE.BufferAttribute(trailColors!, 3));
    trailGeometry.setAttribute('aSegmentIndex', new THREE.BufferAttribute(segmentIndices!, 1));
    if (sides) {
        trailGeometry.setAttribute('aSide', new THREE.BufferAttribute(sides, 1));
    }
    trailGeometry.setIndex(indices);

    return { headGeometry, trailGeometry };
  }, [positions, colors, config.useRealTrailThickness]);

  useFrame((state) => {
    const time = state.clock.elapsedTime;

    if (pointsRef.current) {
      const mat = pointsRef.current.material as THREE.ShaderMaterial;
      mat.uniforms.uTime.value = time;
      mat.uniforms.uPointSize.value = config.pointSize;
      mat.uniforms.uNoiseAmplitude.value = config.noiseAmplitude;
      mat.uniforms.uNoiseSpeed.value = config.noiseSpeed;
      mat.uniforms.uNoiseScale.value = config.noiseScale;
      mat.uniforms.uNoiseType.value = config.noiseType;
      mat.uniforms.uParticleColor.value = particleColorObj;
      mat.uniforms.uUseVertexColors.value = hasVertexColors ? 1.0 : 0.0;
    }

    if (trailsRef.current) {
      const mesh = trailsRef.current as THREE.Mesh;
      const mat = mesh.material as THREE.ShaderMaterial;
      mat.uniforms.uTime.value = time;
      mat.uniforms.uNoiseAmplitude.value = config.noiseAmplitude;
      mat.uniforms.uNoiseSpeed.value = config.noiseSpeed;
      mat.uniforms.uNoiseScale.value = config.noiseScale;
      mat.uniforms.uTrailLength.value = config.trailLength;
      mat.uniforms.uNoiseType.value = config.noiseType;
      mat.uniforms.uParticleColor.value = particleColorObj;
      mat.uniforms.uUseVertexColors.value = hasVertexColors ? 1.0 : 0.0;
      
      if (config.useRealTrailThickness && mat.uniforms.uTrailThickness) {
          mat.uniforms.uTrailThickness.value = config.trailThickness;
      }
    }
  });

  const headShaderArgs = useMemo(() => ({
    uniforms: {
      uTime: { value: 0 },
      uPointSize: { value: config.pointSize },
      uNoiseAmplitude: { value: config.noiseAmplitude },
      uNoiseSpeed: { value: config.noiseSpeed },
      uNoiseScale: { value: config.noiseScale },
      uNoiseType: { value: config.noiseType },
      uParticleColor: { value: new THREE.Color(config.particleColor) },
      uUseVertexColors: { value: hasVertexColors ? 1.0 : 0.0 },
    },
    vertexShader: PlyHeadMaterial.vertexShader,
    fragmentShader: PlyHeadMaterial.fragmentShader,
    transparent: false,
    depthTest: true,
    depthWrite: true,
  }), [config, hasVertexColors]);

  const trailShaderArgs = useMemo(() => {
     if (config.useRealTrailThickness) {
        return {
            uniforms: {
              uTime: { value: 0 },
              uNoiseAmplitude: { value: config.noiseAmplitude },
              uNoiseSpeed: { value: config.noiseSpeed },
              uNoiseScale: { value: config.noiseScale },
              uTrailLength: { value: config.trailLength },
              uNoiseType: { value: config.noiseType },
              uTrailThickness: { value: config.trailThickness },
              uParticleColor: { value: new THREE.Color(config.particleColor) },
              uUseVertexColors: { value: hasVertexColors ? 1.0 : 0.0 },
            },
            vertexShader: PlyTrailMaterialRibbon.vertexShader,
            fragmentShader: PlyTrailMaterialRibbon.fragmentShader,
            transparent: false,
            depthTest: true,
            depthWrite: true,
            side: THREE.DoubleSide
        }
     } else {
        return {
            uniforms: {
              uTime: { value: 0 },
              uNoiseAmplitude: { value: config.noiseAmplitude },
              uNoiseSpeed: { value: config.noiseSpeed },
              uNoiseScale: { value: config.noiseScale },
              uTrailLength: { value: config.trailLength },
              uNoiseType: { value: config.noiseType },
              uParticleColor: { value: new THREE.Color(config.particleColor) },
              uUseVertexColors: { value: hasVertexColors ? 1.0 : 0.0 },
            },
            vertexShader: PlyTrailMaterialSimple.vertexShader,
            fragmentShader: PlyTrailMaterialSimple.fragmentShader,
            transparent: false,
            depthTest: true,
            depthWrite: true,
            blending: THREE.NormalBlending,
            linewidth: config.trailThickness,
        }
     }
  }, [config, hasVertexColors]);

  return (
    <group>
      {config.pointSize > 0 && (
        <points ref={pointsRef} geometry={geometryData.headGeometry}>
          <shaderMaterial attach="material" args={[headShaderArgs]} />
        </points>
      )}
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

export default PlyPointCloud;