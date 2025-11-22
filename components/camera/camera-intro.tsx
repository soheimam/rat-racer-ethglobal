"use client";

import { RaceRat } from '@/lib/schema';
import { useFrame, useThree } from '@react-three/fiber';
import { useEffect, useRef } from 'react';
import * as THREE from 'three';

const CameraIntro = ({
    rats,
    startLineX,
    onComplete,
}: {
    rats: RaceRat[];
    startLineX: number;
    onComplete: () => void;
}) => {
    const { camera } = useThree();
    const startTime = useRef(Date.now());
    const perspCamera = camera as THREE.PerspectiveCamera;
    const targetPosition = useRef(new THREE.Vector3());
    const targetLookAt = useRef(new THREE.Vector3());
    const currentLookAt = useRef(new THREE.Vector3());
    const hasCompletedRef = useRef(false);

    useFrame((state) => {
        const elapsed = Date.now() - startTime.current;
        const timeUntilRace = 10000 - elapsed; // 10 seconds total intro

        // Final race position (where we want to end up)
        const raceViewPos = new THREE.Vector3(startLineX - 5, 3, 10);
        const raceLookAt = new THREE.Vector3(startLineX + 5, 0, 0);

        if (timeUntilRace > 5000) { // First 7 seconds: Dynamic camera movement
            // Create a circular motion around the start line
            const angle = state.clock.elapsedTime * 0.1; // Slow rotation
            const radius = 12 + Math.sin(state.clock.elapsedTime * 0.2) * 2; // Varying radius
            const height = 4 + Math.sin(state.clock.elapsedTime * 0.2) * 1; // Varying height

            targetPosition.current.set(
                startLineX + Math.sin(angle) * radius,
                height,
                Math.cos(angle) * radius
            );

            // Always look at the start line
            targetLookAt.current.set(startLineX, 0.5, 0);
        } else if (timeUntilRace > 0) { // Last 3 seconds: Hold steady at race position
            targetPosition.current.copy(raceViewPos);
            targetLookAt.current.copy(raceLookAt);
        } else if (!hasCompletedRef.current) { // Race start
            hasCompletedRef.current = true;
            camera.position.copy(raceViewPos);
            camera.lookAt(raceLookAt);
            onComplete();
        }

        // Smooth camera movement
        const lerpFactor = timeUntilRace > 3000 ? 0.02 : 0.1; // Slower during showcase, faster during transition
        camera.position.lerp(targetPosition.current, lerpFactor);
        currentLookAt.current.lerp(targetLookAt.current, lerpFactor);
        camera.lookAt(currentLookAt.current);

        // Update FOV smoothly
        const targetFOV = timeUntilRace > 3000 ? 45 : 40; // Slightly wider FOV during showcase
        perspCamera.fov = THREE.MathUtils.lerp(perspCamera.fov, targetFOV, 0.05);
        perspCamera.updateProjectionMatrix();
    });

    useEffect(() => {
        // Initialize camera
        const initialAngle = Math.PI / 4;
        const initialRadius = 12;
        perspCamera.position.set(
            startLineX + Math.sin(initialAngle) * initialRadius,
            4,
            Math.cos(initialAngle) * initialRadius
        );
        perspCamera.lookAt(startLineX, 0.5, 0);
        perspCamera.fov = 45;
        perspCamera.updateProjectionMatrix();
        hasCompletedRef.current = false;

        // Initialize refs
        currentLookAt.current.set(startLineX, 0.5, 0);

        return () => {
            hasCompletedRef.current = false;
        };
    }, [perspCamera, startLineX]);

    return null;
};

export default CameraIntro;
