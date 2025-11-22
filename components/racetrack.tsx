"use client";

import { ErrorBoundary } from '@/components/error-boundary';
import RaceOrderDisplay from '@/components/race-order-display';
import RacePodium from '@/components/race-podium';
import StreetTrack from '@/components/street-track';
import { RaceRat } from '@/lib/schema';
import { Canvas } from '@react-three/fiber';
import { Suspense, useEffect, useMemo, useRef, useState } from 'react';
import * as THREE from 'three';
import CameraFollow from './camera/camera-follow';
import CameraIntro from './camera/camera-intro';
import RatEntity, { RatFinishData } from './rat-entity';

interface RaceTrackProps {
    rats: RaceRat[];
    selectedSong?: string;
}

interface RatPositions {
    [key: string]: THREE.Vector3;
}

// NOTE: No audio files found locally. Add .mp3 files to /public/audio/ directory
const SONGS = [
    '/audio/rat-racer.mp3',
    '/audio/neon-skys.mp3',
];

const Scene = ({
    rats,
    raceStarted,
    introPlaying,
    startLineX,
    finishLineX,
    cameraRef,
    handleIntroComplete,
    handlePositionChange,
    handleRatFinish,
    ratPositions
}: any) => {
    return (
        <Suspense fallback={null}>
            <ambientLight intensity={0.6} />
            <directionalLight
                position={[10, 20, 10]}
                intensity={1.2}
                castShadow
                shadow-mapSize-width={2048}
                shadow-mapSize-height={2048}
            />
            <pointLight
                position={[0, 10, 0]}
                intensity={0.8}
                color="#ffffff"
                distance={50}
                decay={2}
            />

            {introPlaying && (
                <CameraIntro
                    rats={rats}
                    startLineX={startLineX}
                    onComplete={handleIntroComplete}
                />
            )}

            {!introPlaying && raceStarted && (
                <CameraFollow
                    raceStarted={raceStarted}
                    rats={rats.map((rat: RaceRat) => ({
                        ...rat,
                        currentPosition: ratPositions[rat.id] || new THREE.Vector3(startLineX, 0, 0),
                    }))}
                />
            )}

            <StreetTrack modelPath="/city/city.gltf" />

            <mesh position={[startLineX, 0.01, 0]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
                <planeGeometry args={[0.5, 20]} />
                <shaderMaterial
                    uniforms={{
                        uTime: { value: 0 },
                        uSize: { value: 1.0 }
                    }}
                    vertexShader={`
                        varying vec2 vUv;
                        void main() {
                            vUv = uv;
                            gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
                        }
                    `}
                    fragmentShader={`
                        varying vec2 vUv;
                        void main() {
                            float size = 8.0;
                            vec2 pos = floor(vUv * size);
                            float pattern = mod(pos.x + pos.y, 2.0);
                            vec3 color = pattern < 1.0 ? vec3(1.0) : vec3(0.0);
                            gl_FragColor = vec4(color, 1.0);
                        }
                    `}
                />
            </mesh>

            <mesh position={[finishLineX, 0.01, 0]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
                <planeGeometry args={[0.5, 20]} />
                <shaderMaterial
                    uniforms={{
                        uTime: { value: 0 },
                        uSize: { value: 1.0 }
                    }}
                    vertexShader={`
                        varying vec2 vUv;
                        void main() {
                            vUv = uv;
                            gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
                        }
                    `}
                    fragmentShader={`
                        varying vec2 vUv;
                        void main() {
                            float size = 8.0;
                            vec2 pos = floor(vUv * size);
                            float pattern = mod(pos.x + pos.y, 2.0);
                            vec3 color = pattern < 1.0 ? vec3(1.0) : vec3(0.0);
                            gl_FragColor = vec4(color, 1.0);
                        }
                    `}
                />
            </mesh>

            {rats.map((rat: RaceRat, index: number) => {
                const laneWidth = 1.5;
                const zPosition = (index - (rats.length - 1) / 2) * laneWidth;

                return (
                    <RatEntity
                        key={rat.id}
                        id={rat.id}
                        showName={true}
                        modelPath={rat.modelPath}
                        texturePath={rat.texturePath}
                        initialPosition={[startLineX, 0, zPosition]}
                        speeds={rat.speeds}
                        finishLineX={finishLineX}
                        name={rat.name}
                        raceStarted={raceStarted}
                        onPositionChange={handlePositionChange}
                        onFinish={handleRatFinish}
                    />
                );
            })}

            <fog attach="fog" args={['#000000', 10, 150]} />
        </Suspense>
    );
};

const RaceTrack: React.FC<RaceTrackProps> = ({ rats, selectedSong }) => {
    const [raceStarted, setRaceStarted] = useState(false);
    const [introPlaying, setIntroPlaying] = useState(false);
    const [ratPositions, setRatPositions] = useState<RatPositions>({});
    const [ratOrder, setRatOrder] = useState<{ id: number; name: string; delta: number; gangId: string }[]>([]);
    const [finishedRats, setFinishedRats] = useState<RaceRat[]>([]);
    const [metersRemaining, setMetersRemaining] = useState<number>(0);
    const [countdown, setCountdown] = useState<number | "GO" | "Race starts in...">(10);
    const cameraRef = useRef<THREE.PerspectiveCamera>(null);
    const canvasRef = useRef<HTMLCanvasElement | null>(null);
    const [showPodium, setShowPodium] = useState(false);

    const trackLength = 200;
    const startLineX = -150;
    const finishLineX = startLineX + trackLength;

    const raceSong = selectedSong || SONGS[0];

    const startIntro = () => {
        setIntroPlaying(true);
        setRaceStarted(false);
    };

    const handleIntroComplete = () => {
        setIntroPlaying(false);
        setRaceStarted(true);
    };

    const handlePositionChange = (id: number, position: THREE.Vector3) => {
        setRatPositions((prevPositions) => ({
            ...prevPositions,
            [id]: position,
        }));
    };

    const handleRatFinish = (ratFinishData: RatFinishData) => {
        const rat = rats.find(r => r.id === ratFinishData.id);
        if (!rat) return;

        setFinishedRats((prevRats) => [...prevRats, rat]);
        setRatPositions((prevPositions) => {
            const newPositions = { ...prevPositions };
            delete newPositions[ratFinishData.id];
            return newPositions;
        });
        sendRatToBackend(ratFinishData);
    };

    const sendRatToBackend = (rat: RatFinishData) => {
        console.log('Sending data to backend:', rat);
    };

    // Memoize sorted unfinished rats
    const sortedUnfinishedRats = useMemo(() => {
        const unfinishedRats = rats.filter(rat => !finishedRats.some(finishedRat => finishedRat.id === rat.id));
        return unfinishedRats.slice().sort((a, b) => {
            const posA = ratPositions[a.id] ? ratPositions[a.id].x : startLineX;
            const posB = ratPositions[b.id] ? ratPositions[b.id].x : startLineX;
            return posB - posA;
        });
    }, [rats, finishedRats, ratPositions, startLineX]);

    useEffect(() => {
        if (introPlaying) {
            const countdownInterval = setInterval(() => {
                setCountdown((prev) => {
                    if (typeof prev === 'number' && prev > 1) {
                        return prev - 1;
                    }
                    if (prev === 1) {
                        return "GO";
                    }
                    clearInterval(countdownInterval);
                    handleIntroComplete(); // Start race immediately when GO is shown
                    return "GO";
                });
            }, 1000);

            return () => clearInterval(countdownInterval);
        }
    }, [introPlaying]);

    useEffect(() => {
        if (sortedUnfinishedRats.length > 0) {
            const combinedOrder = [...finishedRats, ...sortedUnfinishedRats];
            const leaderPosition = ratPositions[combinedOrder[0].id]?.x || startLineX;

            const ratOrderWithDelta = combinedOrder.map((rat) => {
                const ratPosition = ratPositions[rat.id]?.x || startLineX;
                const delta = leaderPosition - ratPosition;
                return {
                    id: rat.id,
                    name: rat.name,
                    delta: delta,
                    gangId: rat.gangId,
                };
            });

            // Only check if the order of ids has changed
            const hasOrderChanged = ratOrder.length !== ratOrderWithDelta.length ||
                ratOrder.some((rat, index) => rat.id !== ratOrderWithDelta[index].id);

            if (hasOrderChanged) {
                setRatOrder(ratOrderWithDelta);
            }

            const remainingDistance = finishLineX - leaderPosition;
            const newRemaining = remainingDistance > 0 ? remainingDistance : 0;

            if (metersRemaining !== newRemaining) {
                setMetersRemaining(newRemaining);
            }
        }
    }, [sortedUnfinishedRats, finishedRats, ratPositions, startLineX, finishLineX]);

    useEffect(() => {
        if (finishedRats.length === rats.length && rats.length > 0) {
            setShowPodium(true);
        }
    }, [finishedRats.length, rats.length]);

    useEffect(() => {
        // Initial countdown before race starts
        const countdownInterval = setInterval(() => {
            setCountdown(prev => {
                if (typeof prev === 'number' && prev > 1) {
                    return prev - 1;
                }
                clearInterval(countdownInterval);
                return prev;
            });
        }, 1000);

        const initialCountdown = setTimeout(() => {
            startIntro();
        }, 10000);

        return () => {
            clearTimeout(initialCountdown);
            clearInterval(countdownInterval);
        };
    }, []);

    return (
        <div style={{ position: 'relative', width: '100%', height: '100vh' }}>
            <ErrorBoundary>
                <Canvas
                    camera={{ position: [0, 5, 40], fov: 40 }}
                    ref={canvasRef}
                    gl={{
                        antialias: true,
                        alpha: true,
                        powerPreference: "high-performance",
                        stencil: false,
                        depth: true,
                        failIfMajorPerformanceCaveat: true
                    }}
                    dpr={[1, 2]}
                    performance={{ min: 0.5 }}
                >
                    <Scene
                        rats={rats}
                        raceStarted={raceStarted}
                        introPlaying={introPlaying}
                        startLineX={startLineX}
                        finishLineX={finishLineX}
                        cameraRef={cameraRef}
                        handleIntroComplete={handleIntroComplete}
                        handlePositionChange={handlePositionChange}
                        handleRatFinish={handleRatFinish}
                        ratPositions={ratPositions}
                    />
                </Canvas>
            </ErrorBoundary>

            <RaceOrderDisplay
                ratOrder={ratOrder}
                metersRemaining={metersRemaining}
                selectedSong={raceSong}
            />

            {showPodium && (
                <RacePodium topThreeRats={finishedRats.slice(0, 3)} />
            )}

            {!raceStarted && !introPlaying && (
                <div
                    style={{
                        position: 'absolute',
                        top: '50%',
                        left: '50%',
                        transform: 'translate(-50%, -50%)',
                        fontSize: '3em',
                        color: 'white',
                        pointerEvents: 'none',
                        zIndex: 10,
                    }}
                >
                    Race starts in {countdown} seconds
                </div>
            )}

            {introPlaying && (
                <div
                    style={{
                        position: 'absolute',
                        top: '50%',
                        left: '50%',
                        transform: 'translate(-50%, -50%)',
                        fontSize: '8em',
                        color: 'white',
                        pointerEvents: 'none',
                        zIndex: 10,
                    }}
                >
                    {countdown}
                </div>
            )}
        </div>
    );
};

export default RaceTrack;
