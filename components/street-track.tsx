"use client"

import { DEBUG_CAMERA } from '@/lib/utils';
import { FlyControls, Stars, useGLTF, useHelper } from '@react-three/drei';
import { useFrame } from '@react-three/fiber';
import { useEffect, useRef } from 'react';
import * as THREE from 'three';

const StreetTrack = ({ modelPath }: { modelPath: string }) => {
    const { scene } = useGLTF(modelPath);
    const directionalLightRef = useRef<THREE.DirectionalLight>(null);
    const pointLightRef = useRef<THREE.PointLight>(null);

    // Add debug helpers for lights in debug mode
    useHelper(DEBUG_CAMERA && directionalLightRef, THREE.DirectionalLightHelper, 5);

    // Enhanced material setup
    useEffect(() => {
        scene.traverse((child) => {
            if (child instanceof THREE.Mesh) {
                child.frustumCulled = false;
                child.castShadow = true;
                child.receiveShadow = true;

                if (child.material) {
                    child.material.needsUpdate = true;

                    if (child.material.name.includes('light') || child.material.name.includes('glow')) {
                        child.material.emissive = new THREE.Color(0x00ff00);
                        child.material.emissiveIntensity = 2;
                    }

                    child.material.metalness = 0.8;
                    child.material.roughness = 0.2;
                }
            }
        });
    }, [scene]);

    // Dynamic lighting
    useFrame(() => {
        if (pointLightRef.current) {
            const time = Date.now() * 0.001;
            pointLightRef.current.intensity = 1 + Math.sin(time) * 0.2;
        }
    });

    return (
        <>
            <color attach="background" args={['#000000']} />

            <Stars
                radius={100}
                depth={50}
                count={5000}
                factor={4}
                saturation={0}
                fade
                speed={1}
            />

            <directionalLight
                ref={directionalLightRef}
                color={0xffffff}
                intensity={0.8}
                position={[10, 10, 5]}
                castShadow
                shadow-mapSize-width={2048}
                shadow-mapSize-height={2048}
            >
                <orthographicCamera attach="shadow-camera" args={[-10, 10, -10, 10, 0.1, 50]} />
            </directionalLight>

            <ambientLight color={0x111111} intensity={0.2} />

            <pointLight
                ref={pointLightRef}
                position={[0, 10, 0]}
                color={0x00ff00}
                intensity={1}
                distance={50}
                decay={2}
            />

            <primitive
                object={scene}
                scale={0.009}
                position={[0, 0, 65]}
                rotation={[0, 0, 0]}
            />

            {DEBUG_CAMERA && (
                <FlyControls
                    movementSpeed={10}
                    rollSpeed={0.1}
                    dragToLook={true}
                />
            )}

            <fog attach="fog" args={['#000000', 10, 150]} />
        </>
    );
};

export default StreetTrack;
