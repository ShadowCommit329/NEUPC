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
    <div className="relative aspect-video max-h-[85vh] w-full overflow-hidden rounded-xl bg-black">
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
  const containerRef = useRef(null);
  const progressTimerRef = useRef(null);
  const hideControlsTimerRef = useRef(null);
  const scrubbingRef = useRef(false);
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

  const showControlsTemporarily = useCallback(() => {
    setState((s) => ({ ...s, showControls: true }));
    clearTimeout(hideControlsTimerRef.current);
    const video = videoRef.current;
    if (video && !video.paused) {
      hideControlsTimerRef.current = setTimeout(() => {
        setState((s) => ({ ...s, showControls: false }));
      }, 3000);
    }
  }, []);

  // Hide controls after inactivity (pointer + touch)
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const handler = () => showControlsTemporarily();
    container.addEventListener('mousemove', handler);
    container.addEventListener('pointermove', handler);

    return () => {
      clearTimeout(hideControlsTimerRef.current);
      container.removeEventListener('mousemove', handler);
      container.removeEventListener('pointermove', handler);
    };
  }, [showControlsTemporarily]);

  // Sync fullscreen state with browser (handles ESC key & iOS native exit)
  useEffect(() => {
    const onFsChange = () => {
      const fs =
        !!document.fullscreenElement || !!document.webkitFullscreenElement;
      setState((s) => ({ ...s, fullscreen: fs }));
    };
    document.addEventListener('fullscreenchange', onFsChange);
    document.addEventListener('webkitfullscreenchange', onFsChange);
    return () => {
      document.removeEventListener('fullscreenchange', onFsChange);
      document.removeEventListener('webkitfullscreenchange', onFsChange);
    };
  }, []);

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
    const container = containerRef.current;
    const video = videoRef.current;
    if (!container || !video) return;

    const isFs =
      !!document.fullscreenElement || !!document.webkitFullscreenElement;

    if (isFs) {
      (document.exitFullscreen || document.webkitExitFullscreen)?.call(
        document
      );
      return;
    }

    // iOS Safari on iPhone doesn't support Element.requestFullscreen;
    // it only allows native video fullscreen.
    if (container.requestFullscreen) {
      container.requestFullscreen();
    } else if (container.webkitRequestFullscreen) {
      container.webkitRequestFullscreen();
    } else if (video.webkitEnterFullscreen) {
      video.webkitEnterFullscreen();
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

  const seekToClientX = useCallback((clientX, barEl) => {
    const video = videoRef.current;
    if (!video || !video.duration || !barEl) return;
    const rect = barEl.getBoundingClientRect();
    const pos = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));
    video.currentTime = pos * video.duration;
    setState((s) => ({ ...s, currentTime: pos * video.duration }));
  }, []);

  const handleProgressPointerDown = useCallback(
    (e) => {
      const bar = e.currentTarget;
      scrubbingRef.current = true;
      bar.setPointerCapture?.(e.pointerId);
      seekToClientX(e.clientX, bar);
    },
    [seekToClientX]
  );

  const handleProgressPointerMove = useCallback(
    (e) => {
      if (!scrubbingRef.current) return;
      seekToClientX(e.clientX, e.currentTarget);
    },
    [seekToClientX]
  );

  const handleProgressPointerUp = useCallback((e) => {
    scrubbingRef.current = false;
    e.currentTarget.releasePointerCapture?.(e.pointerId);
  }, []);

  // Tap on video surface: toggle controls (mobile) or toggle play (desktop)
  const handleSurfaceClick = useCallback(
    (e) => {
      // Pointer type comes from the click's source. Touch -> coarse pointer.
      const isCoarse =
        typeof window !== 'undefined' &&
        window.matchMedia?.('(pointer: coarse)').matches;
      if (isCoarse) {
        if (!state.showControls) {
          showControlsTemporarily();
        } else {
          togglePlay();
        }
      } else {
        togglePlay();
      }
    },
    [state.showControls, showControlsTemporarily, togglePlay]
  );

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
      const code = e.target?.error?.code;
      const errorMsg =
        code === 2
          ? 'Network error while loading video.'
          : 'Failed to load video. Please try again.';
      setState((s) => ({ ...s, loading: false, error: errorMsg }));
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
    <div
      ref={containerRef}
      className="group relative aspect-video max-h-[85vh] w-full overflow-hidden rounded-xl bg-black select-none"
    >
      {/* Video */}
      <video
        ref={videoRef}
        src={videoSrc}
        className="h-full w-full"
        preload="metadata"
        playsInline
        webkit-playsinline="true"
        x5-playsinline="true"
        controlsList="nodownload"
        onClick={handleSurfaceClick}
        {...handleVideoEvents}
      />

      {/* Loading overlay */}
      {state.loading && (
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center bg-black/50">
          <Loader2 className="h-10 w-10 animate-spin text-white" />
        </div>
      )}

      {/* Play button overlay (when paused) */}
      {!state.playing && !state.loading && (
        <button
          onClick={togglePlay}
          aria-label="Play"
          className="absolute inset-0 flex items-center justify-center bg-black/30 transition-opacity group-hover:opacity-100"
        >
          <div className="flex h-14 w-14 items-center justify-center rounded-full bg-white/20 backdrop-blur-sm sm:h-16 sm:w-16">
            <Play className="h-7 w-7 fill-current text-white sm:h-8 sm:w-8" />
          </div>
        </button>
      )}

      {/* Controls */}
      <div
        className={`absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 to-transparent px-3 pt-14 pb-3 transition-opacity sm:px-4 sm:pt-16 sm:pb-4 ${
          state.showControls || !state.playing
            ? 'opacity-100'
            : 'pointer-events-none opacity-0'
        }`}
      >
        {/* Progress bar — taller hit area, drag to scrub */}
        <div
          className="group/bar relative mb-3 flex h-5 cursor-pointer touch-none items-center"
          onPointerDown={handleProgressPointerDown}
          onPointerMove={handleProgressPointerMove}
          onPointerUp={handleProgressPointerUp}
          onPointerCancel={handleProgressPointerUp}
        >
          <div className="relative h-1 w-full rounded-full bg-white/20 transition-[height] group-hover/bar:h-1.5">
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
              className="absolute top-1/2 h-3.5 w-3.5 -translate-x-1/2 -translate-y-1/2 rounded-full bg-white shadow-lg sm:h-3 sm:w-3"
              style={{
                left: `${state.duration ? (state.currentTime / state.duration) * 100 : 0}%`,
              }}
            />
          </div>
        </div>

        {/* Control buttons */}
        <div className="flex items-center gap-1.5 sm:gap-3">
          <button
            onClick={togglePlay}
            aria-label={state.playing ? 'Pause' : 'Play'}
            className="flex h-10 w-10 items-center justify-center rounded-lg text-white hover:bg-white/10 sm:h-9 sm:w-9"
          >
            {state.playing ? (
              <Pause className="h-5 w-5 fill-current" />
            ) : (
              <Play className="h-5 w-5 fill-current" />
            )}
          </button>

          {/* Skip buttons hidden on very small screens */}
          <button
            onClick={() => seek(-10)}
            aria-label="Rewind 10 seconds"
            className="hidden h-10 w-10 items-center justify-center rounded-lg text-white hover:bg-white/10 min-[480px]:flex sm:h-9 sm:w-9"
          >
            <SkipBack className="h-4 w-4" />
          </button>

          <button
            onClick={() => seek(10)}
            aria-label="Forward 10 seconds"
            className="hidden h-10 w-10 items-center justify-center rounded-lg text-white hover:bg-white/10 min-[480px]:flex sm:h-9 sm:w-9"
          >
            <SkipForward className="h-4 w-4" />
          </button>

          <button
            onClick={toggleMute}
            aria-label={state.muted ? 'Unmute' : 'Mute'}
            className="flex h-10 w-10 items-center justify-center rounded-lg text-white hover:bg-white/10 sm:h-9 sm:w-9"
          >
            {state.muted ? (
              <VolumeX className="h-4 w-4" />
            ) : (
              <Volume2 className="h-4 w-4" />
            )}
          </button>

          {/* Time */}
          <span className="ml-0.5 font-mono text-[11px] text-white/80 tabular-nums sm:ml-1 sm:text-xs">
            {formatTime(state.currentTime)} / {formatTime(state.duration)}
          </span>

          <div className="flex-1" />

          <button
            onClick={toggleFullscreen}
            aria-label={state.fullscreen ? 'Exit fullscreen' : 'Fullscreen'}
            className="flex h-10 w-10 items-center justify-center rounded-lg text-white hover:bg-white/10 sm:h-9 sm:w-9"
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
