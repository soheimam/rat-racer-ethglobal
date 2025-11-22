'use client';

import { Slider } from '@/components/ui/slider';
import { Pause, Play, Volume2, VolumeX } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';

interface AudioPlayerProps {
    src: string;
    autoPlay?: boolean;
    loop?: boolean;
    className?: string;
}

export function AudioPlayer({ src, autoPlay = false, loop = true, className = '' }: AudioPlayerProps) {
    const audioRef = useRef<HTMLAudioElement>(null);
    const [isPlaying, setIsPlaying] = useState(autoPlay);
    const [volume, setVolume] = useState(0.5);
    const [isMuted, setIsMuted] = useState(false);

    useEffect(() => {
        const audio = audioRef.current;
        if (!audio) return;

        audio.volume = volume;

        if (autoPlay) {
            audio.play().catch((error) => {
                console.log('Autoplay prevented:', error);
                setIsPlaying(false);
            });
        }
    }, [autoPlay, volume]);

    const togglePlay = () => {
        const audio = audioRef.current;
        if (!audio) return;

        if (isPlaying) {
            audio.pause();
        } else {
            audio.play().catch((error) => {
                console.error('Error playing audio:', error);
            });
        }
        setIsPlaying(!isPlaying);
    };

    const toggleMute = () => {
        const audio = audioRef.current;
        if (!audio) return;

        audio.muted = !isMuted;
        setIsMuted(!isMuted);
    };

    const handleVolumeChange = (values: number[]) => {
        const newVolume = values[0];
        setVolume(newVolume);
        if (audioRef.current) {
            audioRef.current.volume = newVolume;
        }
    };

    return (
        <div className={`flex items-center gap-3 ${className}`}>
            <audio
                ref={audioRef}
                src={src}
                loop={loop}
                onPlay={() => setIsPlaying(true)}
                onPause={() => setIsPlaying(false)}
            />

            <button
                onClick={togglePlay}
                className="p-2 rounded-full bg-white/10 hover:bg-white/20 transition-colors"
                aria-label={isPlaying ? 'Pause' : 'Play'}
            >
                {isPlaying ? (
                    <Pause className="w-4 h-4" />
                ) : (
                    <Play className="w-4 h-4" />
                )}
            </button>

            <button
                onClick={toggleMute}
                className="p-2 rounded-full bg-white/10 hover:bg-white/20 transition-colors"
                aria-label={isMuted ? 'Unmute' : 'Mute'}
            >
                {isMuted ? (
                    <VolumeX className="w-4 h-4" />
                ) : (
                    <Volume2 className="w-4 h-4" />
                )}
            </button>

            <div className="w-24">
                <Slider
                    value={[isMuted ? 0 : volume]}
                    onValueChange={handleVolumeChange}
                    max={1}
                    step={0.01}
                    className="cursor-pointer"
                />
            </div>
        </div>
    );
}

