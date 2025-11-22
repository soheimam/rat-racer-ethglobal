"use client"

import { RaceRat } from '@/lib/schema';
import { DEBUG_CAMERA } from '@/lib/utils';
import { useFrame, useThree } from '@react-three/fiber';
import { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { PerspectiveCamera, Vector3 } from 'three';

const CameraFollow = ({ rats, raceStarted }: { rats: RaceRat[], raceStarted: boolean }) => {
    const { camera } = useThree();
    const lastPosition = useRef(new Vector3());
    const lastLookAt = useRef(new Vector3());
    const cameraShake = useRef({ x: 0, y: 0 });
    const targetPosition = useRef(new Vector3());
    const targetLookAt = useRef(new Vector3());

    useFrame((state, delta) => {
        if (!DEBUG_CAMERA && rats.length > 0 && raceStarted) {
            const leadingRat = rats.reduce((leader, rat) => {
                const leaderX = leader.currentPosition ? leader.currentPosition.x : -Infinity;
                const ratX = rat.currentPosition ? rat.currentPosition.x : -Infinity;
                return ratX > leaderX ? rat : leader;
            });

            if (leadingRat && leadingRat.currentPosition) {
                const leaderPos = leadingRat.currentPosition;

                // Calculate speed for dynamic camera behavior
                const speed = Math.abs(leaderPos.x - lastPosition.current.x) / delta;
                const dynamicHeight = THREE.MathUtils.lerp(2, 3, Math.min(speed / 20, 1));
                const dynamicDistance = THREE.MathUtils.lerp(5, 8, Math.min(speed / 20, 1));

                // Set target position with smooth height adjustment
                targetPosition.current.set(
                    leaderPos.x - dynamicDistance,
                    dynamicHeight,
                    10 + Math.sin(state.clock.elapsedTime * 0.5) * 0.2
                );

                // Smooth camera movement
                const lerpFactor = Math.min(delta * 2.5, 1);
                camera.position.lerp(targetPosition.current, lerpFactor);

                // Set and smooth look-at point
                targetLookAt.current.set(
                    leaderPos.x + 2,
                    leaderPos.y + 0.5,
                    leaderPos.z
                );
                lastLookAt.current.lerp(targetLookAt.current, lerpFactor);
                camera.lookAt(lastLookAt.current);

                // Add subtle camera shake based on speed
                const shakeIntensity = Math.min(speed / 40, 1) * 0.02;
                cameraShake.current = {
                    x: (Math.random() - 0.5) * shakeIntensity,
                    y: (Math.random() - 0.5) * shakeIntensity
                };
                camera.position.x += cameraShake.current.x;
                camera.position.y += cameraShake.current.y;

                // Store last position for next frame
                lastPosition.current.copy(leaderPos);
            }
        }
    });

    useEffect(() => {
        if (!DEBUG_CAMERA) {
            const perspCamera = camera as PerspectiveCamera;
            perspCamera.fov = 40;
            perspCamera.near = 0.1;
            perspCamera.far = 1000;
            perspCamera.updateProjectionMatrix();
        }
    }, [camera]);

    return null;
};

export default CameraFollow;
