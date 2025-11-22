"use client";

import { motion } from 'framer-motion';
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

const getPositionColor = (position: number) => {
    switch (position) {
        case 0: return { border: '#4a5568', glow: 'rgba(74, 85, 104, 0.5)', text: '#cbd5e0' }; // Silver (leader)
        case 1: return { border: '#4a5568', glow: 'rgba(74, 85, 104, 0.3)', text: '#a0aec0' }; // Dark silver
        case 2: return { border: '#4a5568', glow: 'rgba(74, 85, 104, 0.3)', text: '#718096' }; // Darker
        default: return { border: '#2d3748', glow: 'rgba(45, 55, 72, 0.3)', text: '#718096' }; // Charcoal
    }
};

const RaceOrderDisplay: React.FC<RaceOrderDisplayProps> = ({ ratOrder, metersRemaining, selectedSong }) => {
    const previousOrderRef = useRef<{ id: number; index: number }[]>([]);
    const [positionChanges, setPositionChanges] = useState<PositionChange[]>([]);

    const raceData = useMemo(() => {
        const TOTAL_RACE_DISTANCE = 200;
        const leaderProgress = ((TOTAL_RACE_DISTANCE - metersRemaining) / TOTAL_RACE_DISTANCE) * 100;
        return {
            TOTAL_RACE_DISTANCE,
            leaderProgress: Math.max(0, Math.min(100, leaderProgress))
        };
    }, [metersRemaining]);

    useEffect(() => {
        if (previousOrderRef.current.length === 0) {
            previousOrderRef.current = ratOrder.map((rat, index) => ({ id: rat.id, index }));
            setPositionChanges([]);
            return;
        }

        const currentOrderIds = ratOrder.map(rat => rat.id).join(',');
        const previousOrderIds = previousOrderRef.current.map(p => p.id).join(',');

        if (currentOrderIds === previousOrderIds) {
            return;
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
        <motion.div
            initial={{ opacity: 0, x: -50 }}
            animate={{ opacity: 1, x: 0 }}
            className="fixed top-4 left-4 bg-black border-2 w-96 p-6 flex flex-col max-h-[calc(100vh-2rem)] overflow-hidden z-40"
            style={{
                borderColor: '#4a5568',
                boxShadow: '0 0 20px rgba(74, 85, 104, 0.3)',
                fontFamily: 'monospace',
            }}
        >
            {/* Header */}
            <div className="flex-none mb-4">
                <h3
                    className="font-black text-3xl tracking-tighter glitch"
                    data-text="LIVE STANDINGS"
                    style={{
                        color: '#cbd5e0',
                        textShadow: '0 0 10px rgba(203, 213, 224, 0.3)',
                    }}
                >
                    LIVE STANDINGS
                </h3>
                <p className="text-xs tracking-widest mt-1" style={{ color: '#718096' }}>
                    [ REAL-TIME RACE DATA ]
                </p>
                <div className="h-px bg-linear-to-r from-transparent via-gray-600 to-transparent mt-3" />
            </div>

            {/* Rat List */}
            <div className="overflow-y-auto flex-1 space-y-2 pr-2">
                {ratOrder.map((order, index) => {
                    const colors = getPositionColor(index);
                    const positionChange = positionChanges.find(change => change.id === order.id);
                    const isLeader = index === 0;
                    const progress = Math.max(0, Math.min(100,
                        ((raceData.TOTAL_RACE_DISTANCE - (metersRemaining + order.delta)) / raceData.TOTAL_RACE_DISTANCE) * 100
                    ));

                    return (
                        <motion.div
                            key={order.id}
                            layout
                            className="relative bg-black border p-3"
                            style={{
                                borderColor: colors.border,
                                boxShadow: isLeader ? `0 0 15px ${colors.glow}` : `0 0 5px ${colors.glow}`,
                            }}
                        >
                            {/* Leader Badge */}
                            {isLeader && (
                                <div
                                    className="absolute -top-2 -right-2 px-2 py-0.5 text-[10px] font-black"
                                    style={{
                                        backgroundColor: '#4a5568',
                                        color: '#cbd5e0',
                                        boxShadow: '0 0 10px rgba(74, 85, 104, 0.5)',
                                    }}
                                >
                                    LEADER
                                </div>
                            )}

                            {/* Position Change */}
                            {positionChange && positionChange.change !== 0 && (
                                <motion.div
                                    initial={{ opacity: 0, scale: 0 }}
                                    animate={{ opacity: 1, scale: 1 }}
                                    className="absolute right-3 top-3 font-black text-sm"
                                    style={{
                                        color: positionChange.change > 0 ? '#4a5568' : '#718096',
                                    }}
                                >
                                    {positionChange.change > 0 ? '↑' : '↓'}
                                </motion.div>
                            )}

                            {/* Position and Name */}
                            <div className="flex items-center justify-between mb-2">
                                <div className="flex items-center space-x-2">
                                    <span
                                        className="font-black text-xl"
                                        style={{
                                            color: colors.text,
                                        }}
                                    >
                                        #{index + 1}
                                    </span>
                                    <span className="font-bold text-sm text-white truncate max-w-[180px]">
                                        {order.name}
                                    </span>
                                </div>
                                {!isLeader && (
                                    <span
                                        className="text-xs font-bold"
                                        style={{ color: '#718096' }}
                                    >
                                        -{Math.abs(order.delta).toFixed(1)}m
                                    </span>
                                )}
                            </div>

                            {/* Progress Bar */}
                            <div className="relative h-1.5 bg-gray-900 overflow-hidden">
                                <motion.div
                                    className="absolute inset-0"
                                    initial={{ width: 0 }}
                                    animate={{ width: `${progress}%` }}
                                    transition={{ type: "spring", stiffness: 100 }}
                                    style={{
                                        background: `linear-gradient(90deg, ${colors.border}, ${colors.border}80)`,
                                    }}
                                />
                                <div className="absolute inset-0 flex items-center justify-end pr-1">
                                    <span className="text-[9px] font-bold text-white">
                                        {progress.toFixed(0)}%
                                    </span>
                                </div>
                            </div>
                        </motion.div>
                    );
                })}
            </div>

            {/* Distance Remaining */}
            <div className="border-t pt-4 mt-4 flex-none" style={{ borderColor: '#4a5568' }}>
                <div className="text-center">
                    <h4 className="text-xs font-mono tracking-widest mb-2" style={{ color: '#718096' }}>
                        DISTANCE TO FINISH
                    </h4>
                    <p
                        className="font-black text-4xl mb-2"
                        style={{
                            color: metersRemaining <= 10 ? '#4a5568' : '#cbd5e0',
                            textShadow: metersRemaining <= 10 ? '0 0 10px rgba(74, 85, 104, 0.5)' : 'none',
                        }}
                    >
                        {metersRemaining.toFixed(1)}m
                    </p>
                    <div className="bg-gray-900 overflow-hidden h-2">
                        <motion.div
                            className="h-full"
                            initial={{ width: 0 }}
                            animate={{ width: `${raceData.leaderProgress}%` }}
                            transition={{ type: "spring", stiffness: 100 }}
                            style={{
                                background: 'linear-gradient(90deg, #4a5568, #2d3748)',
                            }}
                        />
                    </div>
                    {metersRemaining <= 10 && (
                        <p
                            className="text-xs font-black mt-2 tracking-widest"
                            style={{ color: '#4a5568' }}
                        >
                            [!] FINAL STRETCH
                        </p>
                    )}
                </div>
            </div>
        </motion.div>
    );
};

export default RaceOrderDisplay;
