// client/src/components/DharmaTalksView.tsx
import React, { useState, useEffect, useRef } from 'react';
import { DharmaTalk } from '../types';
import { useToast } from './ToastProvider';
import { apiService } from '../services/apiService';
import { ClockIcon, UserIcon, PlayIcon, PauseIcon, HeartIcon } from './Icons';

const translations = {
    vi: {
        title: 'Pháp Thoại',
        subtitle: 'Lắng nghe các bài giảng pháp thoại từ các thiền sư và giảng sư uy tín từ khắp nơi.',
        loading: 'Đang tải pháp thoại...',
        loadError: 'Không thể tải dữ liệu pháp thoại.',
        noTalks: 'Chưa có bài pháp thoại nào cho không gian này.',
        speaker: 'Thuyết giảng',
        date: 'Ngày',
        listen: 'Nghe',
        fromSpace: 'Tại',
        host: 'Host',
        audioPlaybackError: 'Không thể phát âm thanh.',
        listenOnYoutube: 'Nghe trên YouTube',
        pauseAudio: 'Tạm dừng',
        playAudio: 'Phát',
        tabAll: 'Tất cả',
        tabDharmaTalk: 'Pháp Thoại',
        tabMusic: 'Nhạc',
        tabPodcast: 'Podcast & Shows',
        nowPlaying: 'ĐANG PHÁT',
        dharmaLabel: 'PHÁP THOẠI',
        musicSectionTitle: 'Nhạc giác ngộ',
        podcastSectionTitle: 'Podcasts & Shows',
        viewMore: 'XEM THÊM',
        episode: 'Tập',
    },
    en: {
        title: 'Dharma Talks',
        subtitle: 'Listen to dharma talks from reputable Zen masters and teachers from around the world.',
        loading: 'Loading dharma talks...',
        loadError: 'Could not load dharma talk data.',
        noTalks: 'No dharma talks available for this space yet.',
        speaker: 'Speaker',
        date: 'Date',
        listen: 'Listen',
        fromSpace: 'From',
        host: 'Host',
        audioPlaybackError: 'Failed to play audio.',
        listenOnYoutube: 'Listen on YouTube',
        pauseAudio: 'Pause',
        playAudio: 'Play',
        tabAll: 'All',
        tabDharmaTalk: 'Dharma Talks',
        tabMusic: 'Music',
        tabPodcast: 'Podcast & Shows',
        nowPlaying: 'NOW PLAYING',
        dharmaLabel: 'DHARMA TALK',
        musicSectionTitle: 'Awakening Music',
        podcastSectionTitle: 'Podcasts & Shows',
        viewMore: 'VIEW MORE',
        episode: 'Ep',
    }
};

const formatDuration = (seconds: number) => {
    if (isNaN(seconds) || seconds <= 0) return '--:--';
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const remainingSeconds = Math.floor(seconds % 60);
    if (hours > 0) {
        return `${hours}:${String(minutes).padStart(2, '0')}:${String(remainingSeconds).padStart(2, '0')}`;
    }
    return `${String(minutes).padStart(2, '0')}:${String(remainingSeconds).padStart(2, '0')}`;
};

const formatTime = (seconds: number) => {
    if (isNaN(seconds) || seconds < 0) return '00:00';
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
};

const formatDurationShort = (seconds: number) => {
    if (isNaN(seconds) || seconds <= 0) return '';
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    if (hours > 0) return `${hours}h ${String(minutes).padStart(2, '0')} phút`;
    return `${minutes || 1} phút`;
};

type TabFilter = 'all' | 'dharma_talk' | 'music' | 'podcast';

interface DharmaTalksViewProps {
    language: 'vi' | 'en';
    spaceId: number | null;
}

export const DharmaTalksView: React.FC<DharmaTalksViewProps> = ({ language, spaceId }) => {
    const t = translations[language];
    const { showToast } = useToast();
    const [talks, setTalks] = useState<(DharmaTalk & { spaceName?: string })[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [activeTab, setActiveTab] = useState<TabFilter>('all');

    const [playingTalkId, setPlayingTalkId] = useState<number | 'new' | null>(null);
    const [isAudioPlaying, setIsAudioPlaying] = useState<boolean>(false);
    const [currentTime, setCurrentTime] = useState(0);
    const [duration, setDuration] = useState(0);
    const [viewIncremented, setViewIncremented] = useState<Set<number | 'new'>>(new Set());
    const audioRef = useRef<HTMLAudioElement | null>(null);

    // Expanded sections
    const [showAllMusic, setShowAllMusic] = useState(false);
    const [showAllPodcast, setShowAllPodcast] = useState(false);

    useEffect(() => {
        setIsLoading(true);
        const fetchTalks = async () => {
            try {
                let data: DharmaTalk[];
                if (typeof spaceId === 'number') {
                    data = await apiService.getDharmaTalksBySpaceId(spaceId);
                } else {
                    data = await apiService.getAllDharmaTalks();
                }
                setTalks(data || []);
            } catch (error) {
                showToast(t.loadError, 'error');
                console.error(error);
            } finally {
                setIsLoading(false);
            }
        };
        fetchTalks();
    }, [spaceId, showToast, t.loadError]);

    // Auto-detect duration for any talks in the list with 0 or missing duration
    useEffect(() => {
        if (!talks || talks.length === 0) return;
        talks.forEach(talk => {
            const audioUrl = language === 'en' && talk.urlEn ? talk.urlEn : talk.url;
            if ((!talk.duration || talk.duration <= 0) && audioUrl && !audioUrl.includes('youtube.com') && !audioUrl.includes('youtu.be')) {
                const tempAudio = new Audio();
                tempAudio.preload = 'metadata';
                tempAudio.src = audioUrl;
                tempAudio.onloadedmetadata = () => {
                    if (tempAudio.duration && isFinite(tempAudio.duration) && tempAudio.duration > 0) {
                        const dur = Math.round(tempAudio.duration);
                        setTalks(prev => prev.map(t => t.id === talk.id ? { ...t, duration: dur } : t));
                    }
                };
            }
        });
    }, [talks.length, language]);

    useEffect(() => {
        const audio = audioRef.current;
        if (!audio) return;

        const updateDuration = () => {
            if (audio.duration && isFinite(audio.duration) && audio.duration > 0) {
                setDuration(audio.duration);
                if (playingTalkId && typeof playingTalkId === 'number') {
                    const dur = Math.round(audio.duration);
                    setTalks(prev => prev.map(t => (t.id === playingTalkId && (!t.duration || t.duration === 0)) ? { ...t, duration: dur } : t));
                }
            }
        };

        const handleEnded = () => {
            setIsAudioPlaying(false);
            setCurrentTime(0);
        };
        const handlePause = () => {
            setIsAudioPlaying(false);
        };
        const handlePlay = () => {
            setIsAudioPlaying(true);
        };
        const handleTimeUpdate = () => {
            setCurrentTime(audio.currentTime);
            // Handle VBR MP3 duration drift where audio.duration updates mid-stream
            if (audio.duration && isFinite(audio.duration) && audio.duration > 0) {
                if (Math.abs(audio.duration - duration) > 0.5) {
                    setDuration(audio.duration);
                }
            }
        };

        audio.addEventListener('ended', handleEnded);
        audio.addEventListener('pause', handlePause);
        audio.addEventListener('play', handlePlay);
        audio.addEventListener('timeupdate', handleTimeUpdate);
        audio.addEventListener('loadedmetadata', updateDuration);
        audio.addEventListener('durationchange', updateDuration);
        audio.addEventListener('canplay', updateDuration);

        return () => {
            audio.removeEventListener('ended', handleEnded);
            audio.removeEventListener('pause', handlePause);
            audio.removeEventListener('play', handlePlay);
            audio.removeEventListener('timeupdate', handleTimeUpdate);
            audio.removeEventListener('loadedmetadata', updateDuration);
            audio.removeEventListener('durationchange', updateDuration);
            audio.removeEventListener('canplay', updateDuration);
            if (!audio.paused) audio.pause();
        };
    }, [playingTalkId, duration]);

    const playingTalk = talks.find(t => t.id === playingTalkId);

    const handlePlayPause = async (talk: DharmaTalk) => {
        const audio = audioRef.current;
        const audioUrl = language === 'en' && talk.urlEn ? talk.urlEn : talk.url;
        if (!audio || !audioUrl || typeof talk.id !== 'number') return;

        if (audioUrl.includes('youtube.com') || audioUrl.includes('youtu.be')) {
            window.open(audioUrl, '_blank', 'noopener,noreferrer');
            return;
        }

        if (playingTalkId === talk.id) {
            if (isAudioPlaying) {
                audio.pause();
                setIsAudioPlaying(false);
            } else {
                audio.play().then(() => setIsAudioPlaying(true)).catch(e => {
                    console.error("Audio playback error:", e);
                    showToast(t.audioPlaybackError, "error");
                    setIsAudioPlaying(false);
                });
            }
        } else {
            if (!audio.paused) audio.pause();
            audio.src = audioUrl;
            setCurrentTime(0);
            if (talk.duration && talk.duration > 0) {
                setDuration(talk.duration);
            } else {
                setDuration(0);
            }
            audio.play().then(() => {
                setIsAudioPlaying(true);
            }).catch(e => {
                console.error("Audio playback error:", e);
                showToast(t.audioPlaybackError, "error");
                setIsAudioPlaying(false);
            });
            setPlayingTalkId(talk.id);

            if (!viewIncremented.has(talk.id)) {
                try {
                    const result = await apiService.incrementDharmaTalkView(talk.id as number);
                    setViewIncremented(prev => new Set(prev).add(talk.id));
                    setTalks(prev => prev.map(t => t.id === talk.id ? { ...t, views: result.views } : t));
                } catch (error) { console.error("Failed to increment view:", error); }
            }
        }
    };

    const handleSeek = (e: React.MouseEvent<HTMLDivElement>) => {
        const audio = audioRef.current;
        const totalDuration = Math.max(duration, currentTime);
        if (!audio || !totalDuration) return;
        const rect = e.currentTarget.getBoundingClientRect();
        const clickX = e.clientX - rect.left;
        const percentage = Math.max(0, Math.min(1, clickX / rect.width));
        const seekTime = percentage * totalDuration;
        audio.currentTime = seekTime;
        setCurrentTime(seekTime);
    };

    const handleLike = async (talk: DharmaTalk) => {
        if (typeof talk.id !== 'number') return;
        try {
            const result = await apiService.likeDharmaTalk(talk.id);
            setTalks(prev => prev.map(t => t.id === talk.id ? { ...t, likes: result.likes } : t));
        } catch (error) {
            console.error("Failed to like talk:", error);
        }
    };

    // Filter talks by category
    const dharmaTalks = talks.filter(t => (t.category || 'dharma_talk') === 'dharma_talk');
    const musicTalks = talks.filter(t => t.category === 'music');
    const podcastTalks = talks.filter(t => t.category === 'podcast');

    const totalDuration = Math.max(duration, currentTime);
    const progress = playingTalkId && totalDuration > 0 ? Math.min(100, Math.max(0, (currentTime / totalDuration) * 100)) : 0;
    const getThumbnail = (talk: DharmaTalk) => talk.thumbnailUrl || talk.speakerAvatarUrl;

    const getTitle = (talk: DharmaTalk) => (language === 'en' && talk.titleEn) ? talk.titleEn : talk.title;
    const getSubtitle = (talk: DharmaTalk) => (language === 'en' && talk.subtitleEn) ? talk.subtitleEn : talk.subtitle;

    // Featured talk = first dharma talk (or currently playing)
    const featuredTalk = playingTalk && (playingTalk.category || 'dharma_talk') === 'dharma_talk'
        ? playingTalk
        : dharmaTalks[0];

    const dharmaListTalks = dharmaTalks.filter(t => t.id !== featuredTalk?.id).slice(0, 4);

    return (
        <div className="dharma-spotify-container">
            {/* Now Playing Bar */}
            {playingTalk && (
                <div className="dharma-now-playing">
                    <div className="now-playing-left">
                        <span className="now-playing-badge">{t.nowPlaying} · {(playingTalk.category || 'dharma_talk') === 'dharma_talk' ? t.tabDharmaTalk : playingTalk.category === 'music' ? t.tabMusic : t.tabPodcast}</span>
                        <div className="now-playing-info">
                            {getThumbnail(playingTalk) && <img src={getThumbnail(playingTalk)} alt="" className="now-playing-thumb" />}
                            <div>
                                <div className="now-playing-title">{getTitle(playingTalk)}</div>
                                <div className="now-playing-speaker">
                                    {playingTalk.speaker} · {(playingTalk.category || 'dharma_talk') === 'dharma_talk' ? 'Pháp thoại' : playingTalk.category === 'music' ? 'Nhạc' : 'Podcast'}
                                    {(() => {
                                        const talkDur = playingTalk.duration || Math.round(totalDuration);
                                        const durStr = formatDurationShort(talkDur);
                                        return durStr ? ` · ${durStr}` : '';
                                    })()}
                                </div>
                            </div>
                        </div>
                    </div>
                    <div className="now-playing-controls">
                        <span className="now-playing-time">{formatTime(currentTime)}</span>
                        <div className="now-playing-progress" onClick={handleSeek}>
                            <div className="now-playing-progress-fill" style={{ width: `${progress}%` }}></div>
                        </div>
                        <span className="now-playing-time">{formatTime(totalDuration)}</span>
                        <button className="now-playing-play-btn" onClick={() => handlePlayPause(playingTalk)}>
                            {isAudioPlaying ? <PauseIcon className="w-5 h-5" /> : <PlayIcon className="w-5 h-5" />}
                        </button>
                    </div>
                </div>
            )}

            {/* Tab Filters */}
            <div className="dharma-tabs">
                {([
                    ['all', t.tabAll],
                    ['dharma_talk', t.tabDharmaTalk],
                    ['music', t.tabMusic],
                    ['podcast', t.tabPodcast],
                ] as [TabFilter, string][]).map(([key, label]) => (
                    <button
                        key={key}
                        className={`dharma-tab ${activeTab === key ? 'active' : ''}`}
                        onClick={() => setActiveTab(key)}
                    >
                        {label}
                    </button>
                ))}
            </div>

            {isLoading ? (
                <p className="text-center" style={{ padding: '2rem' }}>{t.loading}</p>
            ) : talks.length === 0 ? (
                <p className="text-center" style={{ padding: '2rem' }}>{t.noTalks}</p>
            ) : (
                <div className="dharma-spotify-content">
                    {/* ===== PHÁP THOẠI SECTION ===== */}
                    {(activeTab === 'all' || activeTab === 'dharma_talk') && dharmaTalks.length > 0 && (
                        <div className="dharma-section">
                            {activeTab === 'all' && <h3 className="dharma-section-title">{t.tabDharmaTalk}</h3>}
                            <div className="dharma-featured-layout">
                                {/* Featured Card (Left) */}
                                {featuredTalk && (
                                    <div className="dharma-featured-card" onClick={() => handlePlayPause(featuredTalk)}>
                                        <div className="featured-image-wrapper">
                                            {getThumbnail(featuredTalk) ? (
                                                <img src={getThumbnail(featuredTalk)} alt={getTitle(featuredTalk)} className="featured-image" />
                                            ) : (
                                                <div className="featured-image featured-image-placeholder"><UserIcon className="w-20 h-20" /></div>
                                            )}
                                        </div>
                                        <div className="featured-info">
                                            <h4 className="featured-title">{getTitle(featuredTalk)}</h4>
                                            <p className="featured-meta">{getSubtitle(featuredTalk) || featuredTalk.speaker}</p>
                                            <span className="featured-badge">{t.dharmaLabel}</span>
                                        </div>
                                        <button className="featured-play-btn" onClick={(e) => { e.stopPropagation(); handlePlayPause(featuredTalk); }}>
                                            {playingTalkId === featuredTalk.id && isAudioPlaying ? <PauseIcon className="w-7 h-7" /> : <PlayIcon className="w-7 h-7" />}
                                        </button>
                                    </div>
                                )}

                                {/* Numbered List (Right) */}
                                <div className="dharma-numbered-list">
                                    <h3 className="dharma-section-title" style={{ marginBottom: '0.75rem' }}>{t.tabDharmaTalk}</h3>
                                    {dharmaListTalks.map((talk, index) => {
                                        const isPlaying = playingTalkId === talk.id && isAudioPlaying;
                                        return (
                                            <div key={talk.id} className={`dharma-list-row ${playingTalkId === talk.id ? 'playing' : ''}`} onClick={() => handlePlayPause(talk)}>
                                                <span className="list-number">{isPlaying ? <PauseIcon className="w-3 h-3" /> : (playingTalkId === talk.id ? <PlayIcon className="w-3 h-3" /> : index + 1)}</span>
                                                {getThumbnail(talk) ? <img src={getThumbnail(talk)} alt="" className="list-avatar" /> : <UserIcon className="list-avatar list-avatar-placeholder" />}
                                                <div className="list-info">
                                                    <div className="list-title">{getTitle(talk)}</div>
                                                    <div className="list-speaker">{talk.speaker}</div>
                                                </div>
                                                <span className="list-duration">{formatDuration(talk.duration || 0)}</span>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        </div>
                    )}

                    {/* ===== NHẠC GIÁC NGỘ SECTION ===== */}
                    {(activeTab === 'all' || activeTab === 'music') && musicTalks.length > 0 && (
                        <div className="dharma-section">
                            <div className="dharma-section-header">
                                <h3 className="dharma-section-title">{t.musicSectionTitle}</h3>
                                {activeTab === 'all' && musicTalks.length > 6 && (
                                    <button className="dharma-view-more" onClick={() => setShowAllMusic(!showAllMusic)}>
                                        {showAllMusic ? '▲' : t.viewMore}
                                    </button>
                                )}
                            </div>
                            <div className="dharma-music-table">
                                <div className="music-table-header">
                                    <span className="music-col-num"></span>
                                    <span className="music-col-title">TIÊU ĐỀ</span>
                                    <span className="music-col-likes"><HeartIcon className="w-4 h-4" /></span>
                                    <span className="music-col-duration"><ClockIcon className="w-4 h-4" /></span>
                                </div>
                                {(activeTab === 'music' || showAllMusic ? musicTalks : musicTalks.slice(0, 6)).map((talk, index) => {
                                    const isPlaying = playingTalkId === talk.id && isAudioPlaying;
                                    return (
                                        <div key={talk.id} className={`music-table-row ${playingTalkId === talk.id ? 'playing' : ''}`} onClick={() => handlePlayPause(talk)}>
                                            <span className="music-col-num">
                                                {isPlaying ? <span className="playing-indicator">⏸</span> : (playingTalkId === talk.id ? <span className="playing-indicator">▶</span> : index + 1)}
                                            </span>
                                            <div className="music-col-title">
                                                {getThumbnail(talk) ? <img src={getThumbnail(talk)} alt="" className="music-thumb" /> : <div className="music-thumb music-thumb-placeholder"><UserIcon className="w-6 h-6" /></div>}
                                                <div>
                                                    <div className="music-title">{getTitle(talk)}</div>
                                                    <div className="music-artist">{talk.speaker}</div>
                                                </div>
                                            </div>
                                            <span className="music-col-likes">
                                                <button onClick={(e) => { e.stopPropagation(); handleLike(talk); }} className="music-like-btn">
                                                    <HeartIcon className="w-4 h-4" /> {talk.likes || 0}
                                                </button>
                                            </span>
                                            <span className="music-col-duration">{formatDuration(talk.duration || 0)}</span>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    )}

                    {/* ===== PODCASTS & SHOWS SECTION ===== */}
                    {(activeTab === 'all' || activeTab === 'podcast') && podcastTalks.length > 0 && (
                        <div className="dharma-section">
                            <div className="dharma-section-header">
                                <h3 className="dharma-section-title">{t.podcastSectionTitle}</h3>
                                {activeTab === 'all' && podcastTalks.length > 4 && (
                                    <button className="dharma-view-more" onClick={() => setShowAllPodcast(!showAllPodcast)}>
                                        {showAllPodcast ? '▲' : t.viewMore}
                                    </button>
                                )}
                            </div>
                            <div className="dharma-podcast-grid">
                                {(activeTab === 'podcast' || showAllPodcast ? podcastTalks : podcastTalks.slice(0, 4)).map((talk) => {
                                    const tags = (language === 'en' && talk.tagsEn ? talk.tagsEn : talk.tags) || [];

                                    return (
                                        <div key={talk.id} className={`podcast-card ${playingTalkId === talk.id ? 'playing' : ''}`} onClick={() => handlePlayPause(talk)}>
                                            <div className="podcast-thumb-wrapper">
                                                {getThumbnail(talk) ? <img src={getThumbnail(talk)} alt="" className="podcast-thumb" /> : <div className="podcast-thumb podcast-thumb-placeholder"><UserIcon className="w-12 h-12" /></div>}
                                            </div>
                                            <div className="podcast-info">
                                                <div className="podcast-title">{getTitle(talk)}</div>
                                                <div className="podcast-speaker">{talk.speaker}{talk.subtitle ? `, ${talk.subtitle}` : ''}</div>
                                                <div className="podcast-meta">
                                                    {tags.slice(0, 1).map(tag => <span key={tag} className="podcast-tag">{tag}</span>)}
                                                    {talk.episodeNumber && <span>{t.episode} {talk.episodeNumber}</span>}
                                                    {talk.duration ? <span>· {formatDurationShort(talk.duration)}</span> : null}
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    )}

                    {/* Empty state for filtered tabs */}
                    {activeTab === 'dharma_talk' && dharmaTalks.length === 0 && <p className="text-center" style={{ padding: '2rem' }}>{t.noTalks}</p>}
                    {activeTab === 'music' && musicTalks.length === 0 && <p className="text-center" style={{ padding: '2rem' }}>{t.noTalks}</p>}
                    {activeTab === 'podcast' && podcastTalks.length === 0 && <p className="text-center" style={{ padding: '2rem' }}>{t.noTalks}</p>}
                </div>
            )}
            <audio ref={audioRef} />
        </div>
    );
};
