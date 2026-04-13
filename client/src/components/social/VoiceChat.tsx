// client/src/components/social/VoiceChat.tsx
// Voice Live: Audio-to-Audio với Gemini Live API
// Không qua text - native audio streaming

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { AIConfig, User } from '../../types';
import { GoogleGenAI } from '@google/genai';
import { useToast } from '../ToastProvider';
import { SpeakerWaveIcon } from '../Icons';

// ─── Model ─────────────────────────────────────────────────────────────────────
const LIVE_MODEL = 'models/gemini-3.1-flash-live-preview';

// ─── Types ─────────────────────────────────────────────────────────────────────
type VoiceState = 'idle' | 'connecting' | 'listening' | 'speaking' | 'error';

interface VoiceChatProps {
    currentAiConfig: AIConfig | null;
    user: User | null;
    language: 'vi' | 'en';
    setLanguage: (lang: 'vi' | 'en') => void;
    conversationId: number | null;
    onNewConversationId: (id: number) => void;
    onClose: () => void;
}

// ─── Audio Helpers ─────────────────────────────────────────────────────────────

/** Float32 PCM → base64-encoded Int16 PCM (for Gemini input) */
function float32ToBase64Pcm(float32: Float32Array): string {
    const int16 = new Int16Array(float32.length);
    for (let i = 0; i < float32.length; i++) {
        int16[i] = Math.max(-32768, Math.min(32767, Math.round(float32[i] * 32768)));
    }
    const bytes = new Uint8Array(int16.buffer);
    let binary = '';
    for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i]);
    return btoa(binary);
}

/** base64 Int16 PCM → Float32 array (for playback) */
function base64PcmToFloat32(base64: string): Float32Array {
    const binaryStr = atob(base64);
    const bytes = new Uint8Array(binaryStr.length);
    for (let i = 0; i < binaryStr.length; i++) bytes[i] = binaryStr.charCodeAt(i);
    const int16 = new Int16Array(bytes.buffer);
    const float32 = new Float32Array(int16.length);
    for (let i = 0; i < int16.length; i++) float32[i] = int16[i] / 32768.0;
    return float32;
}

// ─── Sub-components ─────────────────────────────────────────────────────────────

function Waveform({ active, color = '#1877f2', bars = 7 }: { active: boolean; color?: string; bars?: number }) {
    return (
        <div style={{ display: 'flex', alignItems: 'center', gap: 3, height: 40 }}>
            {[...Array(bars)].map((_, i) => (
                <div key={i} style={{
                    width: 4, borderRadius: 4, background: color,
                    height: 6, minHeight: 6, maxHeight: 36,
                    animation: active ? `vc-wave 1s ease-in-out infinite` : 'none',
                    animationDelay: `${i * 0.12}s`,
                }} />
            ))}
        </div>
    );
}

function PulseRing({ active, color }: { active: boolean; color: string }) {
    if (!active) return <div style={{ position: 'absolute', width: '100%', height: '100%' }} />;
    return (
        <div style={{ position: 'absolute', inset: 0, borderRadius: '50%' }}>
            {[1, 2, 3].map(i => (
                <div key={i} style={{
                    position: 'absolute', inset: 0, borderRadius: '50%',
                    border: `2px solid ${color}`, opacity: 0,
                    animation: `vc-pulse 2s cubic-bezier(0.2,0.6,0.4,1) infinite`,
                    animationDelay: `${i * 0.55}s`,
                }} />
            ))}
        </div>
    );
}

// ─── Main Component ─────────────────────────────────────────────────────────────
export const VoiceChat: React.FC<VoiceChatProps> = ({
    currentAiConfig,
    user,
    language,
    setLanguage,
    conversationId,
    onNewConversationId,
    onClose,
}) => {
    const { showToast } = useToast();
    const [voiceState, setVoiceState] = useState<VoiceState>('idle');
    const [statusText, setStatusText] = useState('Nhấn micro để bắt đầu');
    const [isMuted, setIsMuted] = useState(false);
    const [liveTranscript, setLiveTranscript] = useState('');   // what user is saying now
    const [isRecording, setIsRecording] = useState(false);
    const [recordingUrl, setRecordingUrl] = useState<string | null>(null);

    // Refs
    const liveSessionRef = useRef<any>(null);
    const captureCtxRef = useRef<AudioContext | null>(null);
    const processorRef = useRef<ScriptProcessorNode | null>(null);
    const streamRef = useRef<MediaStream | null>(null);
    const playbackCtxRef = useRef<AudioContext | null>(null);
    const nextPlayTimeRef = useRef(0);
    const isMutedRef = useRef(isMuted);
    const recognitionRef = useRef<any>(null);
    const mediaRecorderRef = useRef<MediaRecorder | null>(null);
    const recordingChunks = useRef<Blob[]>([]);

    useEffect(() => { isMutedRef.current = isMuted; }, [isMuted]);

    const geminiKey = (user?.apiKeys as any)?.gemini;
    const geminiVoice = (user?.apiKeys as any)?.geminiVoice || 'Algieba';

    // ─── Schedule audio playback (seamless queue) ───────────────────────────
    const scheduleAudio = useCallback((base64Data: string, mimeType: string) => {
        if (isMutedRef.current) return;

        const rateMatch = mimeType?.match(/rate=(\d+)/);
        const sampleRate = rateMatch ? parseInt(rateMatch[1]) : 24000;

        const float32 = base64PcmToFloat32(base64Data);

        if (!playbackCtxRef.current || playbackCtxRef.current.state === 'closed') {
            playbackCtxRef.current = new AudioContext({ sampleRate });
            nextPlayTimeRef.current = 0;
        }
        const ctx = playbackCtxRef.current;
        if (ctx.state === 'suspended') ctx.resume();

        const buffer = ctx.createBuffer(1, float32.length, sampleRate);
        buffer.getChannelData(0).set(float32);

        const source = ctx.createBufferSource();
        source.buffer = buffer;
        source.connect(ctx.destination);

        const startAt = Math.max(ctx.currentTime, nextPlayTimeRef.current);
        source.start(startAt);
        nextPlayTimeRef.current = startAt + buffer.duration;
    }, []);

    // ─── Cleanup ────────────────────────────────────────────────────────────
    const cleanup = useCallback(() => {
        try { processorRef.current?.disconnect(); } catch {}
        processorRef.current = null;
        try { captureCtxRef.current?.close(); } catch {}
        captureCtxRef.current = null;
        streamRef.current?.getTracks().forEach(t => t.stop());
        streamRef.current = null;
        try { playbackCtxRef.current?.close(); } catch {}
        playbackCtxRef.current = null;
        nextPlayTimeRef.current = 0;
        try { liveSessionRef.current?.close(); } catch {}
        liveSessionRef.current = null;
        // stop speech recognition
        try { recognitionRef.current?.stop(); } catch {}
        recognitionRef.current = null;
        setLiveTranscript('');
    }, []);

    // ─── Stop Session ────────────────────────────────────────────────────────
    const stopSession = useCallback(() => {
        // Auto-stop recording and generate download link
        if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
            mediaRecorderRef.current.stop(); // onstop will set recordingUrl
        }
        setIsRecording(false);
        cleanup();
        setVoiceState('idle');
        setStatusText('Nhấn micro để bắt đầu lại');
    }, [cleanup]);

    // ─── Speech Recognition (live transcript) ───────────────────────────────
    const startSpeechRecognition = useCallback(() => {
        const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
        if (!SR) return;
        const rec = new SR();
        rec.lang = language === 'vi' ? 'vi-VN' : 'en-US';
        rec.continuous = true;
        rec.interimResults = true;
        rec.onresult = (e: any) => {
            let interim = '';
            for (let i = e.resultIndex; i < e.results.length; i++) {
                if (e.results[i].isFinal) {
                    setLiveTranscript('');  // clear after final
                } else {
                    interim += e.results[i][0].transcript;
                }
            }
            if (interim) setLiveTranscript(interim);
        };
        rec.onerror = () => {};
        rec.onend = () => {
            // restart if still in listening state
            if (liveSessionRef.current) {
                try { rec.start(); } catch {}
            }
        };
        recognitionRef.current = rec;
        try { rec.start(); } catch {}
    }, [language]);

    // ─── Start Live Session ──────────────────────────────────────────────────
    const startLiveSession = useCallback(async () => {
        if (!geminiKey) {
            showToast('Cần Gemini API Key. Vào Cài đặt → API Keys để thêm.', 'error');
            setVoiceState('error');
            setStatusText('⚠️ Chưa có Gemini API Key.');
            return;
        }
        if (!currentAiConfig) {
            showToast('Chưa chọn AI config.', 'error');
            return;
        }

        try {
            setVoiceState('connecting');
            setStatusText('Đang kết nối Gemini Live...');

            // 1. Mic stream
            const stream = await navigator.mediaDevices.getUserMedia({
                audio: { channelCount: 1, echoCancellation: true, noiseSuppression: true },
            });
            streamRef.current = stream;

            // 2. Capture context at 16kHz (Gemini Live requirement)
            const captureCtx = new AudioContext({ sampleRate: 16000 });
            captureCtxRef.current = captureCtx;
            const micSource = captureCtx.createMediaStreamSource(stream);
            const processor = captureCtx.createScriptProcessor(4096, 1, 1);
            processorRef.current = processor;

            // Silent output (prevent mic feedback)
            const silentGain = captureCtx.createGain();
            silentGain.gain.value = 0;
            processor.connect(silentGain);
            silentGain.connect(captureCtx.destination);
            micSource.connect(processor);

            // 3. Build system instruction from AI config
            const langInstruction = language === 'vi'
                ? 'Bạn phải trả lời hoàn toàn bằng tiếng Việt. Always respond in Vietnamese.'
                : 'You must respond entirely in English. Always respond in English.';
            const systemInstruction = [
                currentAiConfig.trainingContent,
                langInstruction,
            ].filter(Boolean).join('\n\n');

            // 4. Connect to Gemini Live
            const ai = new GoogleGenAI({ apiKey: geminiKey });

            const session = await (ai as any).live.connect({
                model: LIVE_MODEL,
                config: {
                    responseModalities: ['AUDIO'],
                    systemInstruction: systemInstruction
                        ? { parts: [{ text: systemInstruction }] }
                        : undefined,
                    speechConfig: {
                        voiceConfig: {
                            prebuiltVoiceConfig: { voiceName: geminiVoice },
                        },
                    },
                },
                callbacks: {
                    onmessage: (msg: any) => {
                        // Audio chunks from Gemini
                        const parts = msg?.serverContent?.modelTurn?.parts ?? [];
                        for (const part of parts) {
                            if (part?.inlineData?.data) {
                                if (!isMutedRef.current) {
                                    setVoiceState('speaking');
                                    setStatusText('AI đang nói...');
                                    setLiveTranscript('');  // clear user transcript when AI speaks
                                }
                                scheduleAudio(
                                    part.inlineData.data,
                                    part.inlineData.mimeType ?? 'audio/pcm;rate=24000'
                                );
                            }
                        }
                        // AI turn complete → go back to listening
                        if (msg?.serverContent?.turnComplete) {
                            setTimeout(() => {
                                if (liveSessionRef.current) {
                                    setVoiceState('listening');
                                    setStatusText('Đang nghe... (nói để AI trả lời)');
                                }
                            }, 300);
                        }
                    },
                    onerror: (e: any) => {
                        console.error('[GeminiLive] error:', e);
                        setVoiceState('error');
                        setStatusText('⚠️ Lỗi kết nối. Nhấn micro để thử lại.');
                        cleanup();
                    },
                    onclose: () => {
                        if (liveSessionRef.current) {
                            liveSessionRef.current = null;
                            setVoiceState('idle');
                            setStatusText('Phiên đã kết thúc. Nhấn micro để bắt đầu lại.');
                        }
                    },
                },
            });
            liveSessionRef.current = session;

            // 5. Stream mic PCM → Gemini Live
            processor.onaudioprocess = (e: AudioProcessingEvent) => {
                if (!liveSessionRef.current) return;
                const pcmBase64 = float32ToBase64Pcm(e.inputBuffer.getChannelData(0));
                try {
                    liveSessionRef.current.sendRealtimeInput({
                        audio: { data: pcmBase64, mimeType: 'audio/pcm;rate=16000' },
                    });
                } catch { /* session may have closed */ }
            };

            // 6. Start speech recognition for live transcript
            startSpeechRecognition();

            // 7. Auto-start recording
            setRecordingUrl(null);
            try {
                recordingChunks.current = [];
                const mr = new MediaRecorder(stream, { mimeType: 'audio/webm' });
                mr.ondataavailable = (e) => { if (e.data.size > 0) recordingChunks.current.push(e.data); };
                mr.onstop = () => {
                    if (recordingChunks.current.length > 0) {
                        const blob = new Blob(recordingChunks.current, { type: 'audio/webm' });
                        const url = URL.createObjectURL(blob);
                        setRecordingUrl(url);
                    }
                };
                mr.start(1000);
                mediaRecorderRef.current = mr;
                setIsRecording(true);
            } catch { /* recording not supported, silent fail */ }

            setVoiceState('listening');
            setStatusText('Đang nghe... (nói để AI trả lời)');

        } catch (err: any) {
            console.error('[GeminiLive] setup error:', err);
            cleanup();
            setVoiceState('error');
            setStatusText(
                err?.name === 'NotAllowedError'
                    ? '⚠️ Cần cấp quyền microphone.'
                    : `⚠️ ${err?.message || 'Không thể kết nối Gemini Live.'}`
            );
        }
    }, [geminiKey, geminiVoice, currentAiConfig, language, scheduleAudio, cleanup, showToast, startSpeechRecognition]);

    // ─── Mic button click ────────────────────────────────────────────────────
    const handleMicClick = () => {
        if (voiceState === 'idle' || voiceState === 'error') {
            startLiveSession();
        } else {
            stopSession();
        }
    };

    // ─── Mute toggle ─────────────────────────────────────────────────────────
    const handleMuteToggle = () => {
        const next = !isMuted;
        setIsMuted(next);
        if (next) {
            try { playbackCtxRef.current?.close(); } catch {}
            playbackCtxRef.current = null;
            nextPlayTimeRef.current = 0;
        }
    };


    // ─── Cleanup on unmount ──────────────────────────────────────────────────
    useEffect(() => () => {
        cleanup();
        if (mediaRecorderRef.current?.state === 'recording') {
            mediaRecorderRef.current.stop();
        }
    }, [cleanup]);

    // ─── Theme ───────────────────────────────────────────────────────────────
    const isGiacngo = document.documentElement.getAttribute('data-theme') === 'giacngo';
    const isDark = localStorage.getItem('spaceColorMode_v3') === 'dark' ||
        document.documentElement.getAttribute('data-theme') === 'dark' ||
        window.matchMedia('(prefers-color-scheme: dark)').matches;
    const isGiacngoDark = isGiacngo && isDark;

    const bg        = isGiacngoDark ? 'hsl(28, 22%, 9%)'
                    : isGiacngo     ? '#f5ede0'
                    : isDark        ? '#1c1c1e' : '#ffffff';
    const bgCard    = isGiacngoDark ? 'hsl(28, 20%, 13%)'
                    : isGiacngo     ? '#fdf8f0'
                    : isDark        ? '#242526' : '#f7f7f7';
    const textColor = isGiacngoDark ? 'hsl(44, 45%, 82%)'
                    : isGiacngo     ? '#1f2937'
                    : isDark        ? '#e4e6eb' : '#050505';
    const muted     = isGiacngoDark ? 'hsl(38, 20%, 55%)'
                    : isGiacngo     ? '#6b7280'
                    : isDark        ? '#8e8e93' : '#65676b';
    const border    = isGiacngoDark ? 'hsl(28, 15%, 22%)'
                    : isGiacngo     ? '#dcd5bc'
                    : isDark        ? '#38383a' : '#e4e6ea';
    const inputBg   = isGiacngoDark ? 'hsl(28, 18%, 18%)'
                    : isGiacngo     ? '#efe0bd'
                    : isDark        ? '#2c2c2e' : '#f0f2f5';
    const primary   = isGiacngo ? '#991b1b' : '#1877f2';


    const cfg = {
        idle:       { color: muted,                     micBg: inputBg,   glow: 'none' },
        connecting: { color: isGiacngo ? '#b45309' : '#f39c12', micBg: inputBg, glow: 'none' },
        listening:  { color: '#dc2626',                 micBg: '#dc2626', glow: '0 0 0 10px rgba(220,38,38,0.15), 0 0 0 20px rgba(220,38,38,0.07)' },
        speaking:   { color: primary,                   micBg: primary,   glow: `0 0 0 10px ${primary}22, 0 0 0 20px ${primary}10` },
        error:      { color: '#dc2626',                 micBg: inputBg,   glow: 'none' },
    }[voiceState];

    const isActive = voiceState === 'listening' || voiceState === 'speaking';

    return (
        <>
            <style>{`
                @import url('https://fonts.googleapis.com/css2?family=Lora:ital,wght@0,400;0,600;0,700;1,400;1,600&display=swap');
                .vc-wrap, .vc-wrap * { font-family: 'Lora','Palatino Linotype',Georgia,serif; box-sizing: border-box; }
                @keyframes vc-wave { 0%,100% { height:5px; } 50% { height:28px; } }
                @keyframes vc-pulse { 0% { transform:scale(0.9); opacity:0.6; } 100% { transform:scale(1.7); opacity:0; } }
                @keyframes vc-spin { to { transform:rotate(360deg); } }
                @keyframes vc-float { 0%,100% { transform:translateY(0); } 50% { transform:translateY(-6px); } }
                @keyframes vc-speak { 0%,100% { transform:scale(1); } 50% { transform:scale(1.03); } }
                .vc-mic { transition: transform 0.18s cubic-bezier(.34,1.56,.64,1), box-shadow 0.25s; }
                .vc-mic:hover:not(:disabled) { transform: scale(1.1); }
                .vc-mic:active:not(:disabled) { transform: scale(0.93); }
                .vc-ai-float { animation: vc-float 4s ease-in-out infinite; }
                .vc-ai-speak { animation: vc-speak 0.8s ease-in-out infinite; }
                .vc-transcript { animation: vc-fadein 0.2s ease; }
                @keyframes vc-fadein { from { opacity:0; transform:translateY(4px); } to { opacity:1; transform:translateY(0); } }
                .vc-rec-dot { width:10px; height:10px; border-radius:50%; background:#dc2626; animation: vc-recdot 1.2s ease-in-out infinite; display:inline-block; margin-right:6px; }
                @keyframes vc-recdot { 0%,100% { opacity:1; } 50% { opacity:0.2; } }
            `}</style>

            {/* Overlay */}
            <div className="vc-wrap" style={{
                position: 'fixed', inset: 0, zIndex: 10000,
                background: 'rgba(0,0,0,0.65)', backdropFilter: 'blur(12px)',
                display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16,
            }}>
                <div style={{
                    background: bg, borderRadius: 28,
                    width: '100%', maxWidth: 400,
                    boxShadow: isGiacngo
                        ? '0 32px 80px rgba(60,20,10,0.3), 0 0 0 1px rgba(220,213,188,0.8)'
                        : '0 28px 90px rgba(0,0,0,0.35)',
                    display: 'flex', flexDirection: 'column', overflow: 'hidden',
                    maxHeight: '94vh',
                }}>

                    {/* ── Header ── */}
                    <div style={{
                        padding: '16px 20px 12px',
                        borderBottom: `1px solid ${border}`,
                        display: 'flex', alignItems: 'center', gap: 12,
                        background: isGiacngoDark ? 'hsl(28, 20%, 11%)' : isGiacngo ? '#efe0bd' : 'transparent',
                    }}>
                        {currentAiConfig?.avatarUrl
                            ? <img src={currentAiConfig.avatarUrl} alt="" style={{ width: 40, height: 40, borderRadius: '50%', objectFit: 'cover', flexShrink: 0, border: `2px solid ${border}` }} />
                            : <div style={{ width: 40, height: 40, borderRadius: '50%', background: primary, color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: 18, flexShrink: 0 }}>
                                {currentAiConfig?.name?.[0] || 'AI'}
                              </div>
                        }
                        <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ fontWeight: 700, fontSize: 15, color: textColor }}>
                                {currentAiConfig?.name || 'AI'} · Kính Sư,
                            </div>
                            <div style={{ fontSize: 11, color: textColor, opacity: 0.7, fontStyle: 'italic' }}>
                                {language === 'vi' ? 'con xin thưa thỉnh...' : 'ask me anything...'}
                            </div>
                            <div style={{ fontSize: 12, color: cfg.color, fontWeight: 600, marginTop: 3, display: 'flex', alignItems: 'center', gap: 5 }}>
                                <span style={{ width: 7, height: 7, borderRadius: '50%', background: cfg.color, display: 'inline-block', flexShrink: 0 }} />
                                {voiceState === 'idle'       && (language === 'vi' ? 'Sẵn sàng' : 'Ready')}
                                {voiceState === 'connecting' && (language === 'vi' ? 'Đang kết nối...' : 'Connecting...')}
                                {voiceState === 'listening'  && (language === 'vi' ? 'Đang nghe...' : 'Listening...')}
                                {voiceState === 'speaking'   && (language === 'vi' ? 'AI đang nói...' : 'AI speaking...')}
                                {voiceState === 'error'      && (language === 'vi' ? 'Có lỗi' : 'Error')}
                            </div>
                        </div>
                        {/* Language switcher — clickable, changes app language */}
                        <div style={{ display: 'flex', gap: 4, marginRight: 4 }}>
                            {(['VIE', 'ENG'] as const).map(l => (
                                <span key={l}
                                    onClick={() => {
                                        if (voiceState !== 'idle') return;
                                        const newLang = l === 'VIE' ? 'vi' : 'en';
                                        setLanguage(newLang);
                                        localStorage.setItem('language', newLang);
                                    }}
                                    style={{
                                        padding: '3px 8px', borderRadius: 6, fontSize: 11, fontWeight: 700,
                                        background: (l === 'VIE') === (language === 'vi') ? primary : border,
                                        color: (l === 'VIE') === (language === 'vi') ? '#fff' : muted,
                                        cursor: voiceState === 'idle' ? 'pointer' : 'default',
                                        transition: 'background 0.15s',
                                        userSelect: 'none',
                                    }}>{l}</span>
                            ))}
                        </div>
                        <button
                            onClick={onClose}
                            style={{
                                width: 30, height: 30, borderRadius: '50%', border: 'none',
                                background: border, cursor: 'pointer', fontSize: 17, color: muted,
                                display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                            }}
                        >×</button>
                    </div>

                    {/* ── AI Avatar (large center image) ── */}
                    <div style={{
                        display: 'flex', flexDirection: 'column', alignItems: 'center',
                        padding: '28px 24px 16px',
                        background: isGiacngoDark
                            ? 'hsl(28, 20%, 13%)'
                            : isGiacngo
                            ? 'linear-gradient(180deg,#fdf8f0 0%,#f5ede0 100%)'
                            : bgCard,
                        position: 'relative',
                    }}>
                        {/* Centered AI image with pulse rings */}
                        <div
                            className={voiceState === 'idle' ? 'vc-ai-float' : voiceState === 'speaking' ? 'vc-ai-speak' : ''}
                            style={{ position: 'relative', width: 160, height: 160, display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 16 }}
                        >
                            <PulseRing active={isActive} color={cfg.color} />
                            <img
                                src={isGiacngo ? '/themes/giacngo/voichat.png' : (currentAiConfig?.avatarUrl || '/themes/giacngo/voichat.png')}
                                alt={currentAiConfig?.name || 'Voice Chat'}
                                style={{
                                    width: 140, height: 140, borderRadius: '50%',
                                    objectFit: 'cover', zIndex: 1,
                                    border: `3px solid ${border}`,
                                    boxShadow: isActive ? `0 0 0 4px ${cfg.color}30` : `0 4px 20px rgba(0,0,0,0.15)`,
                                    transition: 'box-shadow 0.3s',
                                }}
                            />
                        </div>

                        {/* ── Live Transcript (what user is saying) ── */}
                        <div style={{
                            minHeight: 38, width: '100%', textAlign: 'center',
                            padding: '0 8px', marginBottom: 8,
                        }}>
                            {liveTranscript ? (
                                <div className="vc-transcript" style={{
                                    fontSize: 13, color: textColor, fontStyle: 'italic',
                                    lineHeight: 1.5, padding: '6px 12px',
                                    background: isGiacngo ? 'rgba(153,27,27,0.06)' : 'rgba(0,0,0,0.05)',
                                    borderRadius: 10, border: `1px solid ${border}`,
                                }}>
                                    "{liveTranscript}"
                                </div>
                            ) : (
                                <div style={{ fontSize: 13, color: muted, fontStyle: 'italic', opacity: 0.7 }}>
                                    {statusText}
                                </div>
                            )}
                        </div>

                        {/* Hint */}
                        <div style={{ fontSize: 12, color: muted, textAlign: 'center', opacity: 0.65 }}>
                            {(voiceState === 'idle' || voiceState === 'error')
                                ? (language === 'vi' ? 'Nhấn micro để bắt đầu phiên trò chuyện' : 'Tap the mic to start a session')
                                : voiceState === 'listening'
                                    ? (language === 'vi' ? 'Nhấn micro để kết thúc phiên' : 'Tap the mic to end the session')
                                    : ''}
                        </div>
                    </div>

                    {/* ── Controls ── */}
                    <div style={{
                        padding: '14px 20px 18px',
                        borderTop: `1px solid ${border}`,
                        display: 'flex', gap: 16, alignItems: 'center', justifyContent: 'center',
                        background: isGiacngoDark ? 'hsl(28, 20%, 11%)' : isGiacngo ? '#efe0bd' : 'transparent',
                    }}>
                        {/* Stop / X button */}
                        <button
                            onClick={stopSession}
                            disabled={voiceState === 'idle' || voiceState === 'error' || voiceState === 'connecting'}
                            style={{
                                width: 44, height: 44, borderRadius: '50%', border: 'none',
                                background: (voiceState === 'idle' || voiceState === 'error') ? border : 'rgba(220,38,38,0.1)',
                                color: (voiceState === 'idle' || voiceState === 'error') ? muted : '#dc2626',
                                cursor: (voiceState === 'idle' || voiceState === 'error') ? 'default' : 'pointer',
                                display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20,
                                opacity: (voiceState === 'idle' || voiceState === 'error') ? 0.4 : 1,
                                flexShrink: 0,
                            }}
                            title="Kết thúc"
                        >×</button>

                        {/* Main mic button */}
                        <button
                            className="vc-mic"
                            onClick={handleMicClick}
                            disabled={voiceState === 'connecting'}
                            style={{
                                width: 64, height: 64, borderRadius: '50%',
                                background: isActive ? cfg.micBg : (isGiacngo ? '#efe0bd' : inputBg),
                                border: isGiacngo ? `2px solid ${border}` : 'none',
                                cursor: voiceState === 'connecting' ? 'not-allowed' : 'pointer',
                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                boxShadow: isActive ? cfg.glow : (isGiacngo ? '0 4px 16px rgba(153,27,27,0.12)' : '0 4px 16px rgba(0,0,0,0.12)'),
                                flexShrink: 0,
                            }}
                        >
                            {voiceState === 'connecting'
                                ? <div style={{ width: 26, height: 26, border: `3px solid ${border}`, borderTopColor: '#f39c12', borderRadius: '50%', animation: 'vc-spin 0.7s linear infinite' }} />
                                : voiceState === 'speaking'
                                    ? <Waveform active color="#fff" bars={5} />
                                    : <svg width="28" height="28" viewBox="0 0 24 24" fill="none">
                                        <path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3z"
                                            fill={isActive ? '#fff' : (isGiacngo ? primary : muted)} />
                                        <path d="M19 10v2a7 7 0 0 1-14 0v-2"
                                            stroke={isActive ? '#fff' : (isGiacngo ? primary : muted)}
                                            strokeWidth="2" strokeLinecap="round" />
                                        <line x1="12" y1="19" x2="12" y2="22" stroke={isActive ? '#fff' : (isGiacngo ? primary : muted)} strokeWidth="2" strokeLinecap="round"/>
                                        <line x1="8" y1="22" x2="16" y2="22" stroke={isActive ? '#fff' : (isGiacngo ? primary : muted)} strokeWidth="2" strokeLinecap="round"/>
                                      </svg>
                            }
                        </button>

                        {/* Mute button */}
                        <button
                            onClick={handleMuteToggle}
                            title={isMuted ? 'Bật loa' : 'Tắt loa'}
                            style={{
                                width: 44, height: 44, borderRadius: '50%', border: 'none',
                                background: isMuted ? 'rgba(220,38,38,0.12)' : (isGiacngo ? 'rgba(0,0,0,0.06)' : border),
                                color: isMuted ? '#dc2626' : muted,
                                cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
                                flexShrink: 0,
                            }}
                        >
                            {isMuted
                                ? <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4.702a.705.705 0 0 0-1.203-.498L6.413 7.587A1.4 1.4 0 0 1 5.416 8H3a1 1 0 0 0-1 1v6a1 1 0 0 0 1 1h2.416a1.4 1.4 0 0 1 .997.413l3.383 3.384A.705.705 0 0 0 11 19.298z" /><line x1="22" y1="2" x2="2" y2="22" /></svg>
                                : <div style={{ width: 18, height: 18, display: 'flex' }}><SpeakerWaveIcon className="w-full h-full" /></div>
                            }
                        </button>
                    </div>

                    {/* ── Recording status bar — always visible ── */}
                    <div style={{
                        padding: '8px 20px 12px',
                        background: isGiacngoDark ? 'hsl(28, 20%, 11%)' : isGiacngo ? '#efe0bd' : 'transparent',
                        display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                        flexDirection: 'column',
                    }}>
                        {/* State 1 & 2: idle/active recording pill */}
                        {!recordingUrl && (
                            <div style={{
                                display: 'flex', alignItems: 'center', gap: 6,
                                padding: '5px 14px', borderRadius: 20,
                                background: isRecording ? 'rgba(220,38,38,0.1)' : 'rgba(0,0,0,0.05)',
                                border: `1px solid ${isRecording ? '#dc2626' : border}`,
                                fontSize: 12, fontWeight: 600,
                                color: isRecording ? '#dc2626' : muted,
                                opacity: voiceState === 'idle' ? 0.45 : 1,
                                transition: 'all 0.2s',
                            }}>
                                {isRecording && <span className="vc-rec-dot" />}
                                {!isRecording && (
                                    <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor" style={{ opacity: 0.5 }}>
                                        <circle cx="12" cy="12" r="10"/>
                                    </svg>
                                )}
                                {isRecording
                                    ? (language === 'vi' ? 'Đang ghi âm...' : 'Recording...')
                                    : (language === 'vi' ? 'Ghi âm tự động khi bắt đầu' : 'Auto-records on start')}
                            </div>
                        )}
                        {/* State 3: download link after session ends */}
                        {recordingUrl && !isRecording && (
                            <a
                                href={recordingUrl}
                                download={`ghi-am-${new Date().toISOString().slice(0,19).replace(/:/g,'-')}.webm`}
                                style={{
                                    display: 'flex', alignItems: 'center', gap: 6,
                                    padding: '7px 18px', borderRadius: 20,
                                    background: primary, color: '#fff',
                                    fontWeight: 700, fontSize: 12, textDecoration: 'none',
                                    boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
                                }}
                            >
                                <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                                    <path d="M19 9h-4V3H9v6H5l7 7 7-7zm-14 9v2h14v-2H5z"/>
                                </svg>
                                {language === 'vi' ? 'Tải xuống ghi âm' : 'Download Recording'}
                            </a>
                        )}
                    </div>
                </div>
            </div>
        </>
    );
};

export default VoiceChat;
