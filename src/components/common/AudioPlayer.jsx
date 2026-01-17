import React, { useState, useRef, useEffect } from 'react';
import { Play, Pause, Square } from 'lucide-react';

const AudioPlayer = ({ audioData }) => {
    const [isPlaying, setIsPlaying] = useState(false);
    const [progress, setProgress] = useState(0);
    const audioRef = useRef(null);
    const animationRef = useRef();
    const progressBarRef = useRef();

    if (!audioRef.current) {
        audioRef.current = new Audio(audioData);
    }

    useEffect(() => {
        const audio = audioRef.current;
        if (audio.src !== audioData) {
            audio.pause();
            const wasPlaying = isPlaying;
            audio.src = audioData;
            audio.load();
            setProgress(0);
            setIsPlaying(false);
        }
    }, [audioData]);

    useEffect(() => {
        const audio = audioRef.current;
        const updateProgress = () => {
            if (audio.duration) {
                setProgress((audio.currentTime / audio.duration) * 100);
            }
            animationRef.current = requestAnimationFrame(updateProgress);
        };

        const onPlay = () => {
            setIsPlaying(true);
            animationRef.current = requestAnimationFrame(updateProgress);
        };

        const onPause = () => {
            setIsPlaying(false);
            cancelAnimationFrame(animationRef.current);
        };

        const onEnded = () => {
            setIsPlaying(false);
            setProgress(0);
            cancelAnimationFrame(animationRef.current);
        };

        audio.addEventListener('play', onPlay);
        audio.addEventListener('pause', onPause);
        audio.addEventListener('ended', onEnded);

        return () => {
            audio.pause();
            audio.removeEventListener('play', onPlay);
            audio.removeEventListener('pause', onPause);
            audio.removeEventListener('ended', onEnded);
            cancelAnimationFrame(animationRef.current);
        };
    }, []);

    const togglePlay = (e) => {
        e.stopPropagation();
        const audio = audioRef.current;
        if (isPlaying) {
            audio.pause();
        } else {
            audio.play();
        }
    };

    const stopAudio = (e) => {
        e.stopPropagation();
        const audio = audioRef.current;
        audio.pause();
        audio.currentTime = 0;
        setProgress(0);
    };

    const handleSeek = (e) => {
        e.stopPropagation();
        const rect = progressBarRef.current.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const percentage = Math.max(0, Math.min(100, (x / rect.width) * 100));
        const audio = audioRef.current;
        if (audio.duration) {
            audio.currentTime = (percentage / 100) * audio.duration;
            setProgress(percentage);
        }
    };

    return (
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '0.5rem', width: '100%', maxWidth: '250px' }} onClick={(e) => e.stopPropagation()}>
            <button
                className="neo-button icon-btn"
                onClick={togglePlay}
                style={{ width: '30px', height: '30px', background: 'var(--accent-soft)', color: 'var(--accent-color)', borderRadius: '50%', flexShrink: 0 }}
            >
                {isPlaying ? <Pause size={12} fill="currentColor" /> : <Play size={12} fill="currentColor" />}
            </button>
            <button
                className="neo-button icon-btn"
                onClick={stopAudio}
                style={{ width: '30px', height: '30px', borderRadius: '50%', flexShrink: 0 }}
            >
                <Square size={10} fill="currentColor" />
            </button>
            <div
                ref={progressBarRef}
                className="neo-inset"
                onClick={handleSeek}
                style={{ flex: 1, height: '6px', borderRadius: '3px', overflow: 'hidden', position: 'relative', cursor: 'pointer' }}
            >
                <div style={{
                    position: 'absolute', top: 0, left: 0, height: '100%',
                    width: `${progress}%`, background: 'var(--accent-color)',
                    transition: 'width 0.1s linear'
                }} />
            </div>
        </div>
    );
};

export default AudioPlayer;
