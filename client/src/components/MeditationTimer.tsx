import React, { useState, useEffect, useRef, useCallback } from 'react';
import { PlayIcon, PauseIcon } from './Icons';
import { apiService } from '../services/apiService';
import { MeditationSession } from '../types';
import { useToast } from './ToastProvider';

const translations = {
    vi: {
        title: 'Thiền Định',
        statusReady: 'Sẵn sàng',
        statusRunning: 'Đang thiền',
        statusFinished: 'Hoàn thành',
        startButton: 'Bắt đầu',
        pauseButton: 'Tạm dừng',
        stopButton: 'Dừng',
        noMeditation: 'Chưa có bài thiền cho không gian này',
        loading: 'Đang tải...',
        noAudioFileWarning: 'Chưa có file âm thanh thiền (dùng chuông báo)',
        audioLoadError: 'Không thể tải file âm thanh thiền (dùng chuông báo)',
        noAudioFileToast: 'Bài thiền này chưa có file âm thanh. Chuông thiền sẽ phát khi bắt đầu và kết thúc.',
        audioLoadErrorToast: 'Không tải được file âm thanh thiền. Chuyển sang chế độ chuông thiền.',
        mute: 'Tắt âm thanh',
        unmute: 'Bật âm thanh',
        audioPlaying: 'Đang phát âm thanh thiền',
        bellOnlyMode: 'Chế độ chuông tĩnh tâm',
    },
    en: {
        title: 'Meditation',
        statusReady: 'Ready',
        statusRunning: 'Meditating',
        statusFinished: 'Finished',
        startButton: 'Start',
        pauseButton: 'Pause',
        stopButton: 'Stop',
        noMeditation: 'No meditation available for this space',
        loading: 'Loading...',
        noAudioFileWarning: 'No meditation audio file (bell chimes only)',
        audioLoadError: 'Failed to load audio file (bell chimes only)',
        noAudioFileToast: 'No audio file configured for this session. Bell will chime at start and finish.',
        audioLoadErrorToast: 'Could not load meditation audio. Switched to bell chime mode.',
        mute: 'Mute audio',
        unmute: 'Unmute audio',
        audioPlaying: 'Playing meditation audio',
        bellOnlyMode: 'Bell chime mode',
    }
};

const StopIcon = ({ className }: { className?: string }) => (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className={className}>
        <path fillRule="evenodd" d="M4.5 7.5a3 3 0 013-3h9a3 3 0 013 3v9a3 3 0 01-3 3h-9a3 3 0 01-3-3v-9z" clipRule="evenodd" />
    </svg>
);

const VolumeUpIcon = ({ className }: { className?: string }) => (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className={className}>
        <path d="M13.5 4.06c0-1.336-1.616-2.005-2.56-1.06l-4.5 4.5H4.5A2.25 2.25 0 002.25 9.75v4.5A2.25 2.25 0 004.5 16.5h1.94l4.5 4.5c.944.945 2.56.276 2.56-1.06V4.06zM18.584 5.106a.75.75 0 011.06 0c3.808 3.807 3.808 9.98 0 13.788a.75.75 0 11-1.06-1.06 8.25 8.25 0 000-11.668.75.75 0 010-1.06z" />
        <path d="M15.932 7.757a.75.75 0 011.061 0 6 6 0 010 8.486.75.75 0 01-1.06-1.061 4.5 4.5 0 000-6.364.75.75 0 010-1.06z" />
    </svg>
);

const VolumeOffIcon = ({ className }: { className?: string }) => (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className={className}>
        <path d="M13.5 4.06c0-1.336-1.616-2.005-2.56-1.06l-4.5 4.5H4.5A2.25 2.25 0 002.25 9.75v4.5A2.25 2.25 0 004.5 16.5h1.94l4.5 4.5c.944.945 2.56.276 2.56-1.06V4.06zM17.28 9.22a.75.75 0 10-1.06 1.06L17.94 12l-1.72 1.72a.75.75 0 101.06 1.06L19 13.06l1.72 1.72a.75.75 0 101.06-1.06L20.06 12l1.72-1.72a.75.75 0 10-1.06-1.06L19 10.94l-1.72-1.72z" />
    </svg>
);

const BellIcon = ({ className }: { className?: string }) => (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className={className}>
        <path fillRule="evenodd" d="M5.25 9a6.75 6.75 0 0113.5 0v.75c0 2.123.8 4.057 2.118 5.52a.75.75 0 01-.297 1.206c-1.544.57-3.16.99-4.831 1.243a3.75 3.75 0 11-7.48 0 24.585 24.585 0 01-4.831-1.244.75.75 0 01-.298-1.205A8.217 8.217 0 005.25 9.75V9zm4.502 8.9a2.25 2.25 0 004.496 0 25.057 25.057 0 01-4.496 0z" clipRule="evenodd" />
    </svg>
);

/**
 * Normalizes raw audio URL strings: checks validity, removes 'null'/'undefined',
 * and ensures proper leading slash for relative paths.
 */
const normalizeAudioUrl = (rawUrl?: string | null): string | null => {
    if (!rawUrl || typeof rawUrl !== 'string') return null;
    const trimmed = rawUrl.trim();
    if (!trimmed || trimmed === 'null' || trimmed === 'undefined') return null;
    if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) return trimmed;
    return trimmed.startsWith('/') ? trimmed : `/${trimmed}`;
};

export const MeditationTimer: React.FC<{ language?: 'vi' | 'en', spaceId?: number }> = ({ language = 'vi', spaceId }) => {
    const t = translations[language];
    const { showToast } = useToast();
    const [meditationData, setMeditationData] = useState<MeditationSession | null>(null);
    const [timeLeft, setTimeLeft] = useState(0);
    const [timerState, setTimerState] = useState<'idle' | 'playing' | 'paused' | 'stopped'>('idle');
    const [loading, setLoading] = useState(true);
    const [isMuted, setIsMuted] = useState(false);
    const [audioStatus, setAudioStatus] = useState<'has_file' | 'no_file' | 'error'>('has_file');

    // Use a ref for the audio element to control playback without re-rendering
    const audioRef = useRef<HTMLAudioElement | null>(null);

    /**
     * Web Audio API Tibetan Singing Bowl & Temple Bell Synthesizer
     * Generates rich, soothing bronze bell harmonics:
     * - Fundamental at 216Hz (sacred geometry harmonic)
     * - Inharmonic natural partials (1.0x, 1.003x, 1.503x, 2.762x, 4.071x)
     * - Long natural exponential decay
     */
    const playSingingBowl = useCallback((fundamental = 216, duration = 5, volume = 0.5) => {
        if (isMuted) return;
        try {
            const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
            if (!AudioCtx) return;
            const ctx = new AudioCtx();
            if (ctx.state === 'suspended') {
                ctx.resume();
            }
            const now = ctx.currentTime;
            const masterGain = ctx.createGain();
            masterGain.gain.setValueAtTime(volume, now);
            masterGain.connect(ctx.destination);

            // Natural partials of bronze singing bowls
            const partials = [
                { mult: 1.0, gain: 0.7, decay: duration },
                { mult: 1.003, gain: 0.5, decay: duration }, // slight beating shimmer
                { mult: 1.503, gain: 0.35, decay: duration * 0.8 },
                { mult: 2.762, gain: 0.2, decay: duration * 0.6 },
                { mult: 4.071, gain: 0.1, decay: duration * 0.4 },
            ];

            partials.forEach(p => {
                const osc = ctx.createOscillator();
                const gain = ctx.createGain();
                osc.type = 'sine';
                osc.frequency.setValueAtTime(fundamental * p.mult, now);

                gain.gain.setValueAtTime(0.0001, now);
                gain.gain.exponentialRampToValueAtTime(p.gain, now + 0.03); // gentle attack
                gain.gain.exponentialRampToValueAtTime(0.0001, now + p.decay); // long exponential release

                osc.connect(gain);
                gain.connect(masterGain);

                osc.start(now);
                osc.stop(now + p.decay + 0.1);
            });

            setTimeout(() => {
                try { ctx.close(); } catch (_) {}
            }, (duration + 0.5) * 1000);
        } catch (e) {
            console.warn('Web Audio bell failed', e);
        }
    }, [isMuted]);

    // Initialize audio element from URL
    const setupAudio = useCallback((url: string | null) => {
        if (audioRef.current) {
            audioRef.current.pause();
            audioRef.current.src = '';
            audioRef.current = null;
        }

        if (!url) {
            setAudioStatus('no_file');
            return;
        }

        try {
            const audio = new Audio(url);
            audio.loop = false;
            audio.muted = isMuted;

            audio.addEventListener('canplay', () => {
                setAudioStatus('has_file');
            });

            audio.addEventListener('error', () => {
                console.warn("Meditation audio source error for URL:", url);
                setAudioStatus('error');
            });

            audioRef.current = audio;
            setAudioStatus('has_file');
        } catch (err) {
            console.error("Failed to instantiate Audio:", err);
            setAudioStatus('error');
        }
    }, [isMuted]);

    useEffect(() => {
        if (spaceId) {
            setLoading(true);
            apiService.getMeditationBySpaceId(spaceId)
                .then(data => {
                    const session = Array.isArray(data) ? data[0] : data;
                    setMeditationData(session);
                    if (session) {
                        setTimeLeft(session.duration || 900);
                        const rawUrl = language === 'en' && session.audioUrlEn ? session.audioUrlEn : session.audioUrl;
                        const url = normalizeAudioUrl(rawUrl);
                        setupAudio(url);
                    } else {
                        setAudioStatus('no_file');
                    }
                })
                .catch(err => {
                    console.error("Failed to load meditation session:", err);
                    setAudioStatus('error');
                })
                .finally(() => setLoading(false));
        } else {
            setLoading(false);
            setAudioStatus('no_file');
        }

        return () => {
            if (audioRef.current) {
                audioRef.current.pause();
                audioRef.current.src = '';
                audioRef.current = null;
            }
        };
    }, [spaceId, language, setupAudio]);

    // Handle Mute toggle
    const handleToggleMute = () => {
        const nextMuted = !isMuted;
        setIsMuted(nextMuted);
        if (audioRef.current) {
            audioRef.current.muted = nextMuted;
        }
    };

    // Timer countdown effect
    useEffect(() => {
        let interval: number;
        if (timerState === 'playing' && timeLeft > 0) {
            interval = window.setInterval(() => {
                setTimeLeft((prev) => {
                    if (prev <= 1) {
                        handleFinish();
                        return 0;
                    }
                    return prev - 1;
                });
            }, 1000);
        }
        return () => clearInterval(interval);
    }, [timerState, timeLeft]);

    const handlePlay = () => {
        if (!meditationData) return;

        // Sound Opening Bell (Chuông nhập thiền) to peacefully begin meditation
        playSingingBowl(216, 6, 0.45);

        if (timerState === 'idle' || timerState === 'stopped') {
            if (timeLeft === 0) setTimeLeft(meditationData.duration || 900);
            if (audioRef.current) audioRef.current.currentTime = 0;
        }

        if (audioStatus === 'no_file') {
            showToast(t.noAudioFileToast, 'info');
        } else if (audioStatus === 'error') {
            showToast(t.audioLoadErrorToast, 'warning');
        }

        // Try playing the background audio track if available
        if (audioRef.current && audioStatus === 'has_file') {
            audioRef.current.play().catch(e => {
                console.warn("Audio play failed, falling back to bell-only mode:", e);
                setAudioStatus('error');
                showToast(t.audioLoadErrorToast, 'warning');
            });
        }

        setTimerState('playing');
    };

    const handlePause = () => {
        audioRef.current?.pause();
        setTimerState('paused');
    };

    const handleStop = () => {
        if (audioRef.current) {
            audioRef.current.pause();
            audioRef.current.currentTime = 0;
        }
        setTimeLeft(0);
        setTimerState('stopped');
    };

    const handleFinish = () => {
        if (audioRef.current) {
            audioRef.current.pause();
            audioRef.current.currentTime = 0;
        }

        // Each space can configure its own end sound via meditationData.endAudioUrl
        const rawEndUrl = meditationData
            ? (language === 'en' && meditationData.endAudioUrlEn
                ? meditationData.endAudioUrlEn
                : meditationData.endAudioUrl)
            : null;
        const endUrl = normalizeAudioUrl(rawEndUrl);

        if (endUrl && !isMuted) {
            const ringAudio = new Audio(endUrl);
            ringAudio.play().catch(() => {
                // File missing/unsupported — fallback to 3 resonant singing bowl gongs
                playTripleFinishBell();
            });
        } else {
            playTripleFinishBell();
        }

        setTimeLeft(0);
        setTimerState('stopped');
    };

    /**
     * 3-strike Closing Bell (Chuông xả thiền)
     */
    const playTripleFinishBell = () => {
        if (isMuted) return;
        playSingingBowl(216, 5, 0.45);
        setTimeout(() => playSingingBowl(216, 5, 0.45), 2200);
        setTimeout(() => playSingingBowl(216, 7, 0.5), 4400);
    };

    const formatTime = (seconds: number) => {
        const minutes = Math.floor(seconds / 60);
        const remainingSeconds = seconds % 60;
        return `${String(minutes).padStart(2, '0')} : ${String(remainingSeconds).padStart(2, '0')}`;
    };

    const getStatusText = () => {
        if (timeLeft === 0 && timerState === 'stopped') return t.statusReady;
        if (timeLeft === 0 && timerState !== 'idle') return t.statusFinished;
        if (timerState === 'playing') return t.statusRunning;
        if (timerState === 'paused') return t.pauseButton;
        return t.statusReady;
    };

    const titleDisplay = language === 'en' && meditationData?.titleEn ? meditationData.titleEn : meditationData?.title || t.title;
    const descDisplay = language === 'en' && meditationData?.descriptionEn ? meditationData.descriptionEn : meditationData?.description;

    if (loading) return <div className="flex justify-center items-center h-full text-text-light">{t.loading}</div>;

    if (!meditationData && !loading) return <div className="flex justify-center items-center h-full text-center px-4 text-text-light">{t.noMeditation}</div>;

    return (
        <div className="flex flex-col items-center justify-center h-full text-center p-4 bg-background-main text-text-main relative select-none">
            {/* Audio Mode / Missing File Status Notice */}
            <div className="mb-4">
                {audioStatus === 'no_file' && (
                    <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full text-xs font-medium bg-amber-500/10 text-amber-700 dark:text-amber-300 border border-amber-500/25 shadow-sm">
                        <BellIcon className="w-4 h-4 text-amber-500 flex-shrink-0" />
                        <span>{t.noAudioFileWarning}</span>
                    </div>
                )}
                {audioStatus === 'error' && (
                    <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full text-xs font-medium bg-rose-500/10 text-rose-700 dark:text-rose-300 border border-rose-500/25 shadow-sm">
                        <BellIcon className="w-4 h-4 text-rose-500 flex-shrink-0" />
                        <span>{t.audioLoadError}</span>
                    </div>
                )}
                {audioStatus === 'has_file' && (
                    <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full text-xs font-medium bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border border-emerald-500/25 shadow-sm">
                        <span className={`w-2 h-2 rounded-full bg-emerald-500 ${timerState === 'playing' ? 'animate-pulse' : ''}`} />
                        <span>{timerState === 'playing' ? t.audioPlaying : (language === 'vi' ? 'Âm thanh thiền đã sẵn sàng' : 'Meditation audio ready')}</span>
                    </div>
                )}
            </div>

            <div className="timer-display-container w-full max-w-xs md:max-w-md lg:max-w-lg bg-background-panel/60 backdrop-blur-md rounded-2xl p-6 md:p-8 border border-border-color shadow-sm">
                <h3 className="text-xl md:text-2xl font-bold mb-2 text-text-main">{titleDisplay}</h3>
                {descDisplay && <p className="text-xs md:text-sm text-text-light mb-4 line-clamp-3 leading-relaxed">{descDisplay}</p>}

                <span className="timer-label text-xs uppercase tracking-widest text-text-light font-medium">{t.title}</span><br />
                <span className="timer-time text-5xl md:text-6xl font-extralight tracking-wider text-text-main my-3 block font-mono">{formatTime(timeLeft)}</span>
                <span className="timer-status text-sm text-primary font-medium">{getStatusText()}</span>
            </div>

            {/* Control Buttons & Sound Toggle */}
            <div className="flex items-center gap-4 mt-8">
                {timerState === 'playing' ? (
                    <button onClick={handlePause} className="timer-btn-start flex flex-row items-center gap-2 px-6 py-3 rounded-xl bg-primary hover:bg-primary-dark text-white font-medium shadow-md transition-all">
                        <PauseIcon className="w-5 h-5" />
                        <span>{t.pauseButton}</span>
                    </button>
                ) : (
                    <button onClick={handlePlay} className="timer-btn-start flex flex-row items-center gap-2 px-6 py-3 rounded-xl bg-primary hover:bg-primary-dark text-white font-medium shadow-md transition-all">
                        <PlayIcon className="w-5 h-5" />
                        <span>{t.startButton}</span>
                    </button>
                )}

                <button onClick={handleStop} className="timer-btn-reset flex flex-row items-center gap-2 px-5 py-3 rounded-xl bg-background-panel border border-border-color hover:bg-border-color/40 text-text-main font-medium shadow-sm transition-all" title={t.stopButton}>
                    <StopIcon className="w-5 h-5" />
                    <span>{t.stopButton}</span>
                </button>

                {/* Mute / Unmute Button */}
                <button
                    onClick={handleToggleMute}
                    className={`p-3 rounded-xl border transition-all shadow-sm ${
                        isMuted 
                            ? 'bg-rose-500/10 border-rose-500/30 text-rose-500 hover:bg-rose-500/20' 
                            : 'bg-background-panel border-border-color hover:bg-border-color/40 text-text-main'
                    }`}
                    title={isMuted ? t.unmute : t.mute}
                    aria-label={isMuted ? t.unmute : t.mute}
                >
                    {isMuted ? <VolumeOffIcon className="w-5 h-5" /> : <VolumeUpIcon className="w-5 h-5" />}
                </button>
            </div>
        </div>
    );
};