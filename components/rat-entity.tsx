"use client";

import { Html, useGLTF, useTexture } from '@react-three/drei';
import { useFrame } from '@react-three/fiber';
import { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';

interface RatProps {
    id: number;
    modelPath: string;
    texturePath: string;
    initialPosition: [number, number, number];
    finishLineX: number;
    speeds: number[];
    name: string;
    showName: boolean;
    raceStarted: boolean;
    onPositionChange: (id: number, position: THREE.Vector3) => void;
    onFinish: (Rat: RatFinishData) => void;
}

export interface RatFinishData {
    id: number;
    name: string;
    finishTime: number;
    position: number;
    totalTime: number;
}

const RatEntity: React.FC<RatProps> = ({
    id,
    modelPath,
    texturePath,
    initialPosition,
    finishLineX,
    name,
    speeds,
    raceStarted,
    showName,
    onPositionChange,
    onFinish,
}) => {
    const { scene, animations } = useGLTF(modelPath);
    const texture = useTexture(texturePath);
    const ratRef = useRef<THREE.Group>(null);
    const mixer = useRef<THREE.AnimationMixer>(null);
    const labelPosition = useRef<THREE.Vector3>(new THREE.Vector3());
    const [hasFinished, setHasFinished] = useState(false);
    const startTime = useRef<number>(0);
    const lastPosition = useRef<THREE.Vector3 | null>(null);
    const frameCount = useRef(0);
    const currentVelocity = useRef(0);

    const totalDistance = Math.abs(finishLineX - initialPosition[0]);
    const segmentCount = speeds.length;
    const segmentLength = totalDistance / segmentCount;

    // Enhanced material setup
    useEffect(() => {
        scene.traverse((child) => {
            if (child instanceof THREE.Mesh) {
                child.material.map = texture;
                child.material.roughness = 0.7;
                child.material.metalness = 0.3;
                child.castShadow = true;
                child.receiveShadow = true;
                child.material.needsUpdate = true;
            }
        });
    }, [scene, texture]);

    // Animation setup
    useEffect(() => {
        if (animations.length && ratRef.current) {
            mixer.current = new THREE.AnimationMixer(ratRef.current);
            const action = mixer.current.clipAction(animations[0]);
            action.play();
        }
        return () => {
            mixer.current?.stopAllAction();
        };
    }, [animations]);

    useEffect(() => {
        if (raceStarted) {
            startTime.current = performance.now();
        }
    }, [raceStarted]);

    // Enhanced movement logic
    useFrame((state, delta) => {
        if (raceStarted && ratRef.current && !hasFinished) {
            mixer.current?.update(delta);

            const currentX = ratRef.current.position.x;
            const distanceCovered = Math.abs(currentX - initialPosition[0]);
            const currentSegment = Math.min(
                Math.floor(distanceCovered / segmentLength),
                segmentCount - 1
            );
            const targetSpeed = speeds[currentSegment];

            // Smooth acceleration
            const acceleration = 5.0;
            currentVelocity.current = THREE.MathUtils.lerp(
                currentVelocity.current,
                targetSpeed,
                acceleration * delta
            );

            // Move rat with smooth acceleration
            const newX = currentX + currentVelocity.current * delta;
            ratRef.current.position.x = Math.min(newX, finishLineX);

            // Very subtle bobbing motion at proper height
            const baseHeight = 0.15; // Adjusted base height to sit on road
            ratRef.current.position.y = baseHeight + Math.sin(state.clock.elapsedTime * 4) * 0.01;

            // Reduce rotation effect
            ratRef.current.rotation.y = Math.PI + Math.sin(state.clock.elapsedTime * 1) * 0.02;

            // Update animation speed based on velocity
            if (mixer.current) {
                const action = mixer.current.clipAction(animations[0]);
                action.timeScale = currentVelocity.current * 0.228; // Increased by 15% from 0.198
            }

            // Update label position
            labelPosition.current.set(
                ratRef.current.position.x,
                ratRef.current.position.y + 2,
                ratRef.current.position.z
            );

            // Throttled position updates
            frameCount.current++;
            if (frameCount.current >= 2) { // Increased update frequency
                const currentPosition = ratRef.current.position.clone();
                lastPosition.current = currentPosition;
                onPositionChange(id, currentPosition);
                frameCount.current = 0;
            }

            // Check finish condition
            if (newX >= finishLineX && !hasFinished) {
                setHasFinished(true);
                const finishTime = performance.now();
                const totalTime = finishTime - startTime.current;

                onFinish({
                    id,
                    name,
                    finishTime: finishTime,
                    position: id,
                    totalTime: totalTime / 1000,
                });

                // Celebration effect
                if (ratRef.current) {
                    ratRef.current.scale.y *= 1.2;
                    setTimeout(() => {
                        if (ratRef.current) ratRef.current.scale.y /= 1.2;
                    }, 200);
                }
            }
        }
    });

    return (
        <primitive
            ref={ratRef}
            object={scene}
            position={[initialPosition[0], 0.15, initialPosition[2]]}
            rotation={[0, Math.PI, 0]}
            scale={0.5}
        >
            {showName && (
                <Html
                    center
                    occlude
                    position={[0, 2, 0]}
                    style={{
                        color: 'white',
                        fontSize: '12px',
                        textAlign: 'center',
                        textShadow: '2px 2px 2px black',
                        pointerEvents: 'none',
                        transition: 'all 0.3s ease',
                        background: 'rgba(0, 0, 0, 0.5)',
                        padding: '4px 8px',
                        borderRadius: '4px',
                        backdropFilter: 'blur(4px)'
                    }}
                >
                    {name}
                </Html>
            )}
        </primitive>
    );
};

export default RatEntity;
