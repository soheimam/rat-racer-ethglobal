"use client";

import { AnimatePresence, motion } from 'framer-motion';
import React, { useEffect, useMemo, useRef, useState } from 'react';

interface RaceOrderDisplayProps {
    ratOrder: { id: number; name: string; delta: number; gangId: string; position?: number }[];
    metersRemaining: number;
    selectedSong: string;
}

interface PositionChange {
    id: number;
    change: number;
}

const getGangStyle = (gangId: string | null | undefined) => {
    const styles = {
        '0': 'bg-gradient-to-r from-[#8b008b] to-[#ff1493] text-white',
        '1': 'bg-gradient-to-r from-[#006400] to-[#228b22] text-white',
        '2': 'bg-gradient-to-r from-[#3e2723] to-[#5d4037] text-white',
        '3': 'bg-gradient-to-r from-[#4682b4] to-[#1e90ff] text-white',
        '4': 'bg-gradient-to-r from-[#8b7500] to-[#b8860b] text-white',
        'default': 'bg-gradient-to-r from-gray-700 to-gray-900 text-white'
    };
    return styles[gangId as keyof typeof styles] || styles.default;
};

const RaceOrderDisplay: React.FC<RaceOrderDisplayProps> = ({ ratOrder, metersRemaining, selectedSong }) => {
    const previousOrderRef = useRef<{ id: number; index: number }[]>([]);
    const [positionChanges, setPositionChanges] = useState<PositionChange[]>([]);
    const [isVisible, setIsVisible] = useState(false);

    // Memoize expensive calculations
    const raceData = useMemo(() => {
        const TOTAL_RACE_DISTANCE = 200; // Race track length in meters
        const leaderProgress = ((TOTAL_RACE_DISTANCE - metersRemaining) / TOTAL_RACE_DISTANCE) * 100;

        return {
            TOTAL_RACE_DISTANCE,
            leaderProgress: Math.max(0, Math.min(100, leaderProgress))
        };
    }, [metersRemaining]);

    // Set initial visibility based on screen size
    useEffect(() => {
        const mediaQuery = window.matchMedia('(min-width: 640px)');
        setIsVisible(mediaQuery.matches);

        const handler = (e: MediaQueryListEvent) => setIsVisible(e.matches);
        mediaQuery.addEventListener('change', handler);
        return () => mediaQuery.removeEventListener('change', handler);
    }, []);

    // Track position changes with better performance
    useEffect(() => {
        if (previousOrderRef.current.length === 0) {
            // Initialize on first render
            previousOrderRef.current = ratOrder.map((rat, index) => ({ id: rat.id, index }));
            setPositionChanges([]);
            return;
        }

        // Debug: Log rat order data to help troubleshoot delta issues
        console.log('🏁 Race Order Data:', {
            metersRemaining,
            ratOrder: ratOrder.map(r => ({
                name: r.name,
                delta: r.delta,
                position: r.position
            }))
        });

        // Only update if the order actually changed
        const currentOrderIds = ratOrder.map(rat => rat.id).join(',');
        const previousOrderIds = previousOrderRef.current.map(p => p.id).join(',');

        if (currentOrderIds === previousOrderIds) {
            return; // No position changes
        }

        const changes = ratOrder.map((rat, currentIndex) => {
            const prevData = previousOrderRef.current.find(p => p.id === rat.id);
            const prevIndex = prevData?.index ?? currentIndex;
            return { id: rat.id, change: prevIndex - currentIndex };
        });

        setPositionChanges(changes);
        previousOrderRef.current = ratOrder.map((rat, index) => ({ id: rat.id, index }));
    }, [ratOrder, metersRemaining]);

    return (
        <>
            {/* Toggle Button */}
            <button
                onClick={() => setIsVisible(prev => !prev)}
                className="fixed top-4 left-4 z-50 bg-black/80 backdrop-blur-sm border border-purple-500/20 rounded-full p-2 shadow-xl hover:scale-105 transition-transform"
            >
                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-white">
                    <path d="M3 3v18h18" />
                    <path d="m19 9-5 5-4-4-3 3" />
                </svg>
            </button>

            <AnimatePresence>
                {isVisible && (
                    <motion.div
                        initial={{ opacity: 0, x: -100 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: -100 }}
                        className="fixed top-4 left-4 rounded-lg bg-black/80 backdrop-blur-sm border border-purple-500/20 shadow-xl w-[calc(100vw-2rem)] sm:w-80 p-3 sm:p-6 flex flex-col max-h-[calc(100vh-8rem)] sm:max-h-[calc(100vh-2rem)] overflow-x-hidden"
                    >
                        <div className="flex-none">
                            <div className="flex items-center justify-between mb-2">
                                <h3 className="font-bold mt-2 text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-pink-600 text-lg sm:text-2xl">
                                    Race Order
                                </h3>
                                {/* <AudioPlayer audioSrc={selectedSong} /> */}
                            </div>
                            <div className="h-px bg-gradient-to-r from-purple-500/50 to-transparent" />
                        </div>

                        <AnimatePresence mode="popLayout">
                            <div className="overflow-y-auto overflow-x-hidden flex-1 my-3 sm:my-4 space-y-2">
                                {ratOrder.map((order, index) => {
                                    const gangStyle = getGangStyle(order.gangId);
                                    const positionChange = positionChanges.find(change => change.id === order.id);
                                    const isLeader = index === 0;

                                    return (
                                        <motion.div
                                            key={order.id}
                                            layout
                                            initial={{ opacity: 0, y: 20 }}
                                            animate={{
                                                opacity: 1,
                                                y: 0,
                                                scale: isLeader ? [1, 1.02, 1] : 1
                                            }}
                                            exit={{ opacity: 0, y: -20 }}
                                            transition={{
                                                type: "spring",
                                                stiffness: 500,
                                                damping: 30,
                                                mass: 1,
                                                scale: {
                                                    repeat: isLeader ? Infinity : 0,
                                                    duration: 1.5
                                                }
                                            }}
                                            className={`${gangStyle} rounded-lg p-2.5 sm:p-3 transition-all duration-300 hover:scale-[1.02] relative overflow-hidden`}
                                        >
                                            {positionChange && positionChange.change !== 0 && (
                                                <motion.div
                                                    initial={{ x: positionChange.change > 0 ? 20 : -20, opacity: 0 }}
                                                    animate={{ x: 0, opacity: 1 }}
                                                    className={`absolute right-1 sm:right-2 top-1/2 -translate-y-1/2 font-bold ${positionChange.change > 0 ? 'text-green-400' : 'text-red-400'}`}
                                                >
                                                    {positionChange.change > 0 ? '↑' : '↓'}
                                                </motion.div>
                                            )}

                                            <div className="flex items-center justify-between relative z-10">
                                                <div className="flex items-center space-x-1.5 sm:space-x-3">
                                                    <motion.span
                                                        layout="position"
                                                        className={`font-bold text-sm sm:text-lg ${isLeader ? 'text-yellow-400' : ''}`}
                                                    >
                                                        {index + 1}.
                                                        {isLeader && <span className="ml-1">👑</span>}
                                                    </motion.span>
                                                    <motion.span
                                                        layout="position"
                                                        className="font-medium text-xs sm:text-base truncate max-w-[100px] sm:max-w-[150px]"
                                                    >
                                                        {order.name}
                                                    </motion.span>
                                                </div>
                                                {!isLeader && (
                                                    <motion.span
                                                        layout="position"
                                                        className="text-[10px] sm:text-sm opacity-75 ml-1"
                                                        title={`Delta: ${order.delta}, Position: ${order.position || 'N/A'}`}
                                                    >
                                                        -{Math.abs(order.delta).toFixed(1)}m
                                                    </motion.span>
                                                )}
                                            </div>

                                            <motion.div
                                                className="absolute bottom-0 left-0 h-1 bg-white/30 w-full"
                                            >
                                                <motion.div
                                                    className="h-full bg-white/60"
                                                    initial={{ width: 0 }}
                                                    animate={{
                                                        width: `${Math.max(0, Math.min(100,
                                                            ((raceData.TOTAL_RACE_DISTANCE - (metersRemaining + order.delta)) / raceData.TOTAL_RACE_DISTANCE) * 100
                                                        ))}%`
                                                    }}
                                                    transition={{ type: "spring", stiffness: 100 }}
                                                />
                                            </motion.div>
                                        </motion.div>
                                    );
                                })}
                            </div>
                        </AnimatePresence>

                        <div className="border-t border-purple-500/20 pt-2 flex-none">
                            <motion.div
                                className="text-center"
                                animate={{
                                    scale: metersRemaining <= 10 ? [1, 1.05, 1] : 1,
                                }}
                                transition={{
                                    duration: 0.5,
                                    repeat: metersRemaining <= 10 ? Infinity : 0
                                }}
                            >
                                <h4 className="text-gray-400 text-xs mb-0.5 sm:mb-1">Distance Remaining</h4>
                                <p className="font-bold text-white text-lg sm:text-2xl">
                                    {metersRemaining.toFixed(1)}m
                                </p>
                                <div className="mt-1 sm:mt-2 bg-gray-700 rounded-full overflow-hidden h-1 sm:h-2">
                                    <motion.div
                                        className="h-full bg-gradient-to-r from-purple-500 to-pink-500"
                                        initial={{ width: 0 }}
                                        animate={{ width: `${raceData.leaderProgress}%` }}
                                        transition={{ type: "spring", stiffness: 100 }}
                                    />
                                </div>
                            </motion.div>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </>
    );
};

export default RaceOrderDisplay;
