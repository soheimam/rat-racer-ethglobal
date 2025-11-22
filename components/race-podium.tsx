import { RaceRat } from '@/lib/schema';
import { animated as a, config, useSpring } from '@react-spring/three';
import { Text } from '@react-three/drei';
import { Canvas } from '@react-three/fiber';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import RatEntity from './rat-entity';
import { Button } from './ui/button';

const animated = a as unknown as {
    mesh: React.FC<any>;
    group: React.FC<any>;
};

interface RacePodiumProps {
    topThreeRats: RaceRat[];
}

const RacePodium = ({ topThreeRats }: RacePodiumProps) => {
    const router = useRouter();
    const [showRats, setShowRats] = useState(false);

    const positions = {
        1: [0, 1, 0] as [number, number, number],
        2: [-3, 0, 0] as [number, number, number],
        3: [3, -0.5, 0] as [number, number, number],
    };

    const ratSpring1 = useSpring({
        from: { y: positions[1][1] + 10, opacity: 0 },
        to: { y: positions[1][1], opacity: 1 },
        delay: 500,
        config: { ...config.gentle, tension: 100 }
    });

    const ratSpring2 = useSpring({
        from: { y: positions[2][1] + 10, opacity: 0 },
        to: { y: positions[2][1], opacity: 1 },
        delay: 800,
        config: { ...config.gentle, tension: 100 }
    });

    const ratSpring3 = useSpring({
        from: { y: positions[3][1] + 10, opacity: 0 },
        to: { y: positions[3][1], opacity: 1 },
        delay: 1100,
        config: { ...config.gentle, tension: 100 }
    });

    const ratSprings = [ratSpring1, ratSpring2, ratSpring3];

    useEffect(() => {
        const timer = setTimeout(() => setShowRats(true), 500);
        return () => clearTimeout(timer);
    }, []);

    return (
        <div className="fixed inset-0 flex items-center justify-center bg-black/80">
            <div className="w-[800px] h-[600px] rounded-xl overflow-hidden relative">
                <Canvas camera={{ position: [0, 2, 12], fov: 45 }}>
                    <fog attach="fog" args={['#000', 8, 25]} />
                    <ambientLight intensity={0.7} />
                    <directionalLight position={[10, 10, 5]} intensity={1.2} />
                    <spotLight position={[0, 10, 0]} intensity={0.8} penumbra={1} />

                    {showRats && topThreeRats.slice(0, 3).map((rat, index) => {
                        const position = positions[index + 1 as keyof typeof positions];
                        const spring = ratSprings[index];
                        const medalColors = ["#FFD700", "#C0C0C0", "#CD7F32"];
                        const medalEmissive = [0.3, 0.2, 0.1];

                        return (
                            <animated.group
                                key={rat.id}
                                position-y={spring.y}
                                position-x={position[0]}
                                position-z={position[2]}
                            >
                                <RatEntity
                                    id={rat.id}
                                    modelPath={rat.modelPath}
                                    texturePath={rat.texturePath}
                                    initialPosition={[0, 0, 0]}
                                    speeds={[0, 0, 0]}
                                    showName={false}
                                    finishLineX={0}
                                    name={rat.name}
                                    raceStarted={false}
                                    onPositionChange={() => { }}
                                    onFinish={() => { }}
                                />
                                <mesh position={[0, 2, 0]} scale={0.5}>
                                    <circleGeometry args={[1, 32]} />
                                    <meshStandardMaterial
                                        color={medalColors[index]}
                                        metalness={0.9}
                                        roughness={0.1}
                                        emissive={medalColors[index]}
                                        emissiveIntensity={medalEmissive[index]}
                                    />
                                </mesh>
                                <Text
                                    position={[0, 2, 0.1]}
                                    fontSize={0.4}
                                    color="#000"
                                    anchorX="center"
                                    anchorY="middle"
                                >
                                    {`${index + 1}`}
                                </Text>
                                <Text
                                    position={[0, 1, 0]}
                                    fontSize={0.4}
                                    color={medalColors[index]}
                                    anchorX="center"
                                    anchorY="middle"
                                >
                                    {rat.name}
                                </Text>
                            </animated.group>
                        );
                    })}
                </Canvas>

                <div className="absolute bottom-8 left-1/2 -translate-x-1/2 flex flex-col items-center gap-4">
                    <p className="text-white text-lg font-medium">
                        Prizes have been sent to the rat owners.
                    </p>
                    <Button
                        onClick={() => {
                            console.log('🏠 Returning to city...');
                            try {
                                router.push('/');
                            } catch (error) {
                                console.error('Router push failed, using window.location:', error);
                                window.location.href = '/';
                            }
                        }}
                        className="px-8 py-2 bg-primary hover:bg-primary/80 text-white rounded-lg shadow-lg transition-all duration-300 transform hover:scale-105"
                    >
                        Return to the city
                    </Button>
                </div>
            </div>
        </div>
    );
};

export default RacePodium;