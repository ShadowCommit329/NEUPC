/**
 * @file VideoPlayer component — handles video playback from different sources
 *   (Google Drive, YouTube, direct upload) with progress tracking.
 * @module VideoPlayer
 */

'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import {
  Play,
  Pause,
  Volume2,
  VolumeX,
  Maximize,
  Minimize,
  SkipBack,
  SkipForward,
  Settings,
  Loader2,
  AlertCircle,
  RefreshCw,
} from 'lucide-react';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatTime(seconds) {
  if (!seconds || isNaN(seconds)) return '0:00';
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);
  if (h > 0) {
    return `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  }
  return `${m}:${String(s).padStart(2, '0')}`;
}

// ─── YouTube Embed ────────────────────────────────────────────────────────────

function YouTubeEmbed({ videoId, onProgress }) {
  const [loading, setLoading] = useState(true);

  // Extract video ID from URL if needed
  const extractedId =
    videoId?.match(
      /(?:youtube\.com\/(?:watch\?v=|embed\/)|youtu\.be\/)([a-zA-Z0-9_-]{11})/
    )?.[1] || videoId;

  return (
    <div className="relative aspect-video w-full overflow-hidden rounded-xl bg-black">
      {loading && (
        <div className="absolute inset-0 flex items-center justify-center bg-gray-900">
          <Loader2 className="h-8 w-8 animate-spin text-gray-500" />
        </div>
      )}
      <iframe
        src={`https://www.youtube-nocookie.com/embed/${extractedId}?rel=0&modestbranding=1&enablejsapi=1`}
        title="Video player"
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
        allowFullScreen
        className="absolute inset-0 h-full w-full"
        onLoad={() => setLoading(false)}
      />
    </div>
  );
}

// ─── Drive Video Player ───────────────────────────────────────────────────────

function DriveVideoPlayer({
  lessonId,
  fileId,
  initialPosition,
  onProgress,
  onComplete,
}) {
  const videoRef = useRef(null);
  const progressTimerRef = useRef(null);
  const [state, setState] = useState({
    playing: false,
    currentTime: initialPosition || 0,
    duration: 0,
    buffered: 0,
    volume: 1,
    muted: false,
    fullscreen: false,
    loading: true,
    error: null,
    showControls: true,
  });

  const videoSrc = `/api/video/${lessonId}${fileId ? `?fileId=${fileId}` : ''}`;

  // Hide controls after inactivity
  useEffect(() => {
    let timeout;
    const handleMouseMove = () => {
      setState((s) => ({ ...s, showControls: true }));
      clearTimeout(timeout);
      if (state.playing) {
        timeout = setTimeout(() => {
          setState((s) => ({ ...s, showControls: false }));
        }, 3000);
      }
    };

    const container = videoRef.current?.parentElement;
    container?.addEventListener('mousemove', handleMouseMove);
    container?.addEventListener('touchstart', handleMouseMove);

    return () => {
      clearTimeout(timeout);
      container?.removeEventListener('mousemove', handleMouseMove);
      container?.removeEventListener('touchstart', handleMouseMove);
    };
  }, [state.playing]);

  // Progress tracking with debounce
  useEffect(() => {
    if (state.playing && onProgress) {
      progressTimerRef.current = setInterval(() => {
        const video = videoRef.current;
        if (video && !video.paused) {
          onProgress({
            currentTime: video.currentTime,
            duration: video.duration,
            watchTime: video.currentTime,
          });
        }
      }, 10000); // Update every 10 seconds
    }

    return () => {
      if (progressTimerRef.current) {
        clearInterval(progressTimerRef.current);
        progressTimerRef.current = null;
      }
    };
  }, [state.playing, onProgress]);

  // Set initial position
  useEffect(() => {
    const video = videoRef.current;
    if (video && initialPosition > 0) {
      video.currentTime = initialPosition;
    }
  }, [initialPosition]);

  const togglePlay = useCallback(() => {
    const video = videoRef.current;
    if (!video) return;

    if (video.paused) {
      video.play();
    } else {
      video.pause();
    }
  }, []);

  const toggleMute = useCallback(() => {
    const video = videoRef.current;
    if (!video) return;
    video.muted = !video.muted;
    setState((s) => ({ ...s, muted: video.muted }));
  }, []);

  const toggleFullscreen = useCallback(() => {
    const container = videoRef.current?.parentElement;
    if (!container) return;

    if (document.fullscreenElement) {
      document.exitFullscreen();
      setState((s) => ({ ...s, fullscreen: false }));
    } else {
      container.requestFullscreen();
      setState((s) => ({ ...s, fullscreen: true }));
    }
  }, []);

  const seek = useCallback((seconds) => {
    const video = videoRef.current;
    if (!video) return;
    video.currentTime = Math.max(
      0,
      Math.min(video.currentTime + seconds, video.duration)
    );
  }, []);

  // Keyboard shortcuts for video control
  useEffect(() => {
    const handleKeyDown = (e) => {
      // Only handle if video player is in viewport and not typing in an input
      if (
        e.target.tagName === 'INPUT' ||
        e.target.tagName === 'TEXTAREA' ||
        !videoRef.current
      ) {
        return;
      }

      switch (e.key) {
        case ' ':
        case 'k':
          e.preventDefault();
          togglePlay();
          break;
        case 'ArrowLeft':
        case 'j':
          e.preventDefault();
          seek(-10);
          break;
        case 'ArrowRight':
        case 'l':
          e.preventDefault();
          seek(10);
          break;
        case 'm':
          e.preventDefault();
          toggleMute();
          break;
        case 'f':
          e.preventDefault();
          toggleFullscreen();
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [togglePlay, seek, toggleMute, toggleFullscreen]);

  const handleSeek = useCallback((e) => {
    const video = videoRef.current;
    if (!video) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const pos = (e.clientX - rect.left) / rect.width;
    video.currentTime = pos * video.duration;
  }, []);

  const handleVideoEvents = {
    onLoadedMetadata: (e) => {
      setState((s) => ({
        ...s,
        duration: e.target.duration,
        loading: false,
      }));
    },
    onTimeUpdate: (e) => {
      setState((s) => ({
        ...s,
        currentTime: e.target.currentTime,
      }));
    },
    onProgress: (e) => {
      const video = e.target;
      if (video.buffered.length > 0) {
        setState((s) => ({
          ...s,
          buffered: video.buffered.end(video.buffered.length - 1),
        }));
      }
    },
    onPlay: () => setState((s) => ({ ...s, playing: true })),
    onPause: () => setState((s) => ({ ...s, playing: false })),
    onEnded: () => {
      setState((s) => ({ ...s, playing: false }));
      onComplete?.();
    },
    onError: (e) => {
      setState((s) => ({
        ...s,
        loading: false,
        error: 'Failed to load video. Please try again.',
      }));
    },
    onWaiting: () => setState((s) => ({ ...s, loading: true })),
    onCanPlay: () => setState((s) => ({ ...s, loading: false })),
  };

  if (state.error) {
    return (
      <div className="relative flex aspect-video w-full flex-col items-center justify-center overflow-hidden rounded-xl bg-gray-900">
        <AlertCircle className="mb-3 h-10 w-10 text-red-500" />
        <p className="mb-4 text-sm text-gray-400">{state.error}</p>
        <button
          onClick={() => {
            setState((s) => ({ ...s, error: null, loading: true }));
            videoRef.current?.load();
          }}
          className="flex items-center gap-2 rounded-lg bg-white/10 px-4 py-2 text-sm text-white hover:bg-white/15"
        >
          <RefreshCw className="h-4 w-4" />
          Retry
        </button>
      </div>
    );
  }

  return (
    <div className="group relative aspect-video w-full overflow-hidden rounded-xl bg-black">
      {/* Video */}
      <video
        ref={videoRef}
        src={videoSrc}
        className="h-full w-full"
        preload="metadata"
        playsInline
        onClick={togglePlay}
        {...handleVideoEvents}
      />

      {/* Loading overlay */}
      {state.loading && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/50">
          <Loader2 className="h-10 w-10 animate-spin text-white" />
        </div>
      )}

      {/* Play button overlay (when paused) */}
      {!state.playing && !state.loading && (
        <button
          onClick={togglePlay}
          className="absolute inset-0 flex items-center justify-center bg-black/30 transition-opacity group-hover:opacity-100"
        >
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-white/20 backdrop-blur-sm">
            <Play className="h-8 w-8 fill-current text-white" />
          </div>
        </button>
      )}

      {/* Controls */}
      <div
        className={`absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 to-transparent px-4 pt-16 pb-4 transition-opacity ${
          state.showControls || !state.playing ? 'opacity-100' : 'opacity-0'
        }`}
      >
        {/* Progress bar */}
        <div
          className="relative mb-3 h-1 cursor-pointer rounded-full bg-white/20"
          onClick={handleSeek}
        >
          {/* Buffered */}
          <div
            className="absolute inset-y-0 left-0 rounded-full bg-white/30"
            style={{
              width: `${state.duration ? (state.buffered / state.duration) * 100 : 0}%`,
            }}
          />
          {/* Progress */}
          <div
            className="absolute inset-y-0 left-0 rounded-full bg-emerald-500"
            style={{
              width: `${state.duration ? (state.currentTime / state.duration) * 100 : 0}%`,
            }}
          />
          {/* Thumb */}
          <div
            className="absolute top-1/2 h-3 w-3 -translate-x-1/2 -translate-y-1/2 rounded-full bg-white shadow-lg"
            style={{
              left: `${state.duration ? (state.currentTime / state.duration) * 100 : 0}%`,
            }}
          />
        </div>

        {/* Control buttons */}
        <div className="flex items-center gap-3">
          <button
            onClick={togglePlay}
            className="flex h-8 w-8 items-center justify-center rounded-lg text-white hover:bg-white/10"
          >
            {state.playing ? (
              <Pause className="h-5 w-5 fill-current" />
            ) : (
              <Play className="h-5 w-5 fill-current" />
            )}
          </button>

          <button
            onClick={() => seek(-10)}
            className="flex h-8 w-8 items-center justify-center rounded-lg text-white hover:bg-white/10"
          >
            <SkipBack className="h-4 w-4" />
          </button>

          <button
            onClick={() => seek(10)}
            className="flex h-8 w-8 items-center justify-center rounded-lg text-white hover:bg-white/10"
          >
            <SkipForward className="h-4 w-4" />
          </button>

          <button
            onClick={toggleMute}
            className="flex h-8 w-8 items-center justify-center rounded-lg text-white hover:bg-white/10"
          >
            {state.muted ? (
              <VolumeX className="h-4 w-4" />
            ) : (
              <Volume2 className="h-4 w-4" />
            )}
          </button>

          {/* Time */}
          <span className="ml-1 font-mono text-xs text-white/80">
            {formatTime(state.currentTime)} / {formatTime(state.duration)}
          </span>

          <div className="flex-1" />

          <button
            onClick={toggleFullscreen}
            className="flex h-8 w-8 items-center justify-center rounded-lg text-white hover:bg-white/10"
          >
            {state.fullscreen ? (
              <Minimize className="h-4 w-4" />
            ) : (
              <Maximize className="h-4 w-4" />
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Main VideoPlayer Component ───────────────────────────────────────────────

export default function VideoPlayer({
  lesson,
  initialPosition = 0,
  onProgress,
  onComplete,
}) {
  const { video_source, video_id, video_url, id: lessonId } = lesson;

  // No video
  if (video_source === 'none' || (!video_id && !video_url)) {
    return (
      <div className="flex aspect-video w-full items-center justify-center rounded-xl bg-gray-900">
        <div className="text-center">
          <Play className="mx-auto mb-3 h-12 w-12 text-gray-700" />
          <p className="text-sm text-gray-500">
            This lesson doesn't have a video
          </p>
        </div>
      </div>
    );
  }

  // YouTube
  if (video_source === 'youtube') {
    return (
      <YouTubeEmbed videoId={video_id || video_url} onProgress={onProgress} />
    );
  }

  // Google Drive or upload
  if (video_source === 'drive' || video_source === 'upload') {
    return (
      <DriveVideoPlayer
        lessonId={lessonId}
        fileId={video_id}
        initialPosition={initialPosition}
        onProgress={onProgress}
        onComplete={onComplete}
      />
    );
  }

  // Unknown source
  return (
    <div className="flex aspect-video w-full items-center justify-center rounded-xl bg-gray-900">
      <div className="text-center">
        <AlertCircle className="mx-auto mb-3 h-10 w-10 text-yellow-500" />
        <p className="text-sm text-gray-400">
          Unsupported video source: {video_source}
        </p>
      </div>
    </div>
  );
}
