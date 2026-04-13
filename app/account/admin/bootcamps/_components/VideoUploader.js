/**
 * @file Video uploader component with chunked upload and progress tracking.
 * @component VideoUploader
 *
 * Features:
 * - Drag-and-drop support
 * - Video preview with remove option
 * - File type validation (mp4, webm, mov)
 * - File size validation (max 2GB)
 * - Chunked upload for large files (>100MB)
 * - Progress bar with percentage and speed
 * - Pause/resume support
 * - Error handling and retry
 */

'use client';

import { useState, useCallback, useRef } from 'react';

const MAX_SIZE = 2 * 1024 * 1024 * 1024; // 2GB
const ALLOWED_TYPES = ['video/mp4', 'video/webm', 'video/quicktime'];
const CHUNK_SIZE = 10 * 1024 * 1024; // 10MB
const CHUNK_THRESHOLD = 100 * 1024 * 1024; // 100MB - use chunked upload for files larger than this

export default function VideoUploader({
  bootcampId,
  lessonId,
  currentVideo,
  onUploadSuccess,
  onUploadError,
}) {
  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState(currentVideo || null);
  const [isDragging, setIsDragging] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [uploadSpeed, setUploadSpeed] = useState(0);
  const [error, setError] = useState(null);
  const [isPaused, setIsPaused] = useState(false);

  const fileInputRef = useRef(null);
  const uploadSessionRef = useRef(null);
  const abortControllerRef = useRef(null);
  const startTimeRef = useRef(null);
  const uploadedBytesRef = useRef(0);

  /**
   * Validate file before upload
   */
  const validateFile = useCallback((file) => {
    if (!ALLOWED_TYPES.includes(file.type)) {
      return 'Invalid file type. Please upload an MP4, WebM, or MOV video.';
    }
    if (file.size > MAX_SIZE) {
      return `File size exceeds 2GB. Your file is ${(file.size / (1024 * 1024 * 1024)).toFixed(2)}GB.`;
    }
    return null;
  }, []);

  /**
   * Format file size for display
   */
  const formatFileSize = (bytes) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(2)} KB`;
    if (bytes < 1024 * 1024 * 1024)
      return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
    return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`;
  };

  /**
   * Format upload speed
   */
  const formatSpeed = (bytesPerSecond) => {
    return `${formatFileSize(bytesPerSecond)}/s`;
  };

  /**
   * Upload file directly (for small files)
   */
  const uploadDirect = useCallback(
    async (file) => {
      try {
        const formData = new FormData();
        formData.append('file', file);
        formData.append('bootcampId', bootcampId);
        formData.append('lessonId', lessonId);

        abortControllerRef.current = new AbortController();

        const xhr = new XMLHttpRequest();

        // Track progress
        xhr.upload.addEventListener('progress', (e) => {
          if (e.lengthComputable) {
            const percentComplete = (e.loaded / e.total) * 100;
            setProgress(percentComplete);

            // Calculate upload speed
            const elapsed = (Date.now() - startTimeRef.current) / 1000;
            const speed = e.loaded / elapsed;
            setUploadSpeed(speed);
            uploadedBytesRef.current = e.loaded;
          }
        });

        // Handle completion
        xhr.addEventListener('load', () => {
          if (xhr.status === 200) {
            const result = JSON.parse(xhr.responseText);
            setIsUploading(false);
            setProgress(100);

            if (onUploadSuccess) {
              onUploadSuccess(result.data);
            }
          } else {
            const error = JSON.parse(xhr.responseText);
            throw new Error(error.error || 'Upload failed');
          }
        });

        // Handle errors
        xhr.addEventListener('error', () => {
          throw new Error('Network error during upload');
        });

        xhr.addEventListener('abort', () => {
          setIsUploading(false);
          setError('Upload cancelled');
        });

        xhr.open('POST', '/api/admin/upload/video');
        xhr.send(formData);
      } catch (err) {
        console.error('Direct upload error:', err);
        setError(err.message);
        setIsUploading(false);
        if (onUploadError) {
          onUploadError(err);
        }
      }
    },
    [bootcampId, lessonId, onUploadSuccess, onUploadError]
  );

  /**
   * Upload file in chunks (for large files)
   */
  const uploadChunked = useCallback(
    async (file) => {
      try {
        // Step 1: Initialize upload session
        const initResponse = await fetch(
          `/api/admin/upload/video?action=init&bootcampId=${bootcampId}&lessonId=${lessonId}&filename=${encodeURIComponent(file.name)}&mimeType=${encodeURIComponent(file.type)}&fileSize=${file.size}`,
          { method: 'POST' }
        );

        if (!initResponse.ok) {
          const error = await initResponse.json();
          throw new Error(error.error || 'Failed to initialize upload');
        }

        const initData = await initResponse.json();
        const { uploadId, totalChunks } = initData.data;
        uploadSessionRef.current = { uploadId, totalChunks, currentChunk: 0 };

        // Step 2: Upload chunks
        for (let i = 0; i < totalChunks; i++) {
          if (isPaused) {
            setError('Upload paused');
            return;
          }

          const start = i * CHUNK_SIZE;
          const end = Math.min(start + CHUNK_SIZE, file.size);
          const chunk = file.slice(start, end);

          abortControllerRef.current = new AbortController();

          const chunkResponse = await fetch(
            `/api/admin/upload/video?action=chunk&uploadId=${uploadId}&chunkIndex=${i}&totalChunks=${totalChunks}`,
            {
              method: 'POST',
              body: chunk,
              headers: {
                'Content-Type': 'application/octet-stream',
              },
              signal: abortControllerRef.current.signal,
            }
          );

          if (!chunkResponse.ok) {
            const error = await chunkResponse.json();
            throw new Error(error.error || `Failed to upload chunk ${i + 1}`);
          }

          const chunkData = await chunkResponse.json();
          setProgress(chunkData.data.progress);
          uploadSessionRef.current.currentChunk = i + 1;

          // Calculate upload speed
          const elapsed = (Date.now() - startTimeRef.current) / 1000;
          const uploaded = end;
          const speed = uploaded / elapsed;
          setUploadSpeed(speed);
          uploadedBytesRef.current = uploaded;
        }

        // Step 3: Complete upload
        const completeResponse = await fetch(
          `/api/admin/upload/video?action=complete&uploadId=${uploadId}`,
          { method: 'POST' }
        );

        if (!completeResponse.ok) {
          const error = await completeResponse.json();
          throw new Error(error.error || 'Failed to complete upload');
        }

        const completeData = await completeResponse.json();
        setIsUploading(false);
        setProgress(100);
        uploadSessionRef.current = null;

        if (onUploadSuccess) {
          onUploadSuccess(completeData.data);
        }
      } catch (err) {
        if (err.name === 'AbortError') {
          setError('Upload cancelled');
        } else {
          console.error('Chunked upload error:', err);
          setError(err.message);
        }
        setIsUploading(false);
        if (onUploadError) {
          onUploadError(err);
        }
      }
    },
    [bootcampId, lessonId, isPaused, onUploadSuccess, onUploadError]
  );

  /**
   * Upload file (choose strategy based on size)
   */
  const uploadFile = useCallback(
    async (file) => {
      setIsUploading(true);
      setError(null);
      setProgress(0);
      setUploadSpeed(0);
      setIsPaused(false);
      startTimeRef.current = Date.now();
      uploadedBytesRef.current = 0;

      if (file.size > CHUNK_THRESHOLD) {
        await uploadChunked(file);
      } else {
        await uploadDirect(file);
      }
    },
    [uploadChunked, uploadDirect]
  );

  /**
   * Handle file selection
   */
  const handleFileChange = useCallback(
    (e) => {
      const selectedFile = e.target.files?.[0];
      if (!selectedFile) return;

      const validationError = validateFile(selectedFile);
      if (validationError) {
        setError(validationError);
        return;
      }

      setFile(selectedFile);

      // Create video preview
      const videoUrl = URL.createObjectURL(selectedFile);
      setPreview(videoUrl);
    },
    [validateFile]
  );

  /**
   * Handle drag and drop
   */
  const handleDragOver = useCallback((e) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback(
    (e) => {
      e.preventDefault();
      setIsDragging(false);

      const droppedFile = e.dataTransfer.files?.[0];
      if (!droppedFile) return;

      const validationError = validateFile(droppedFile);
      if (validationError) {
        setError(validationError);
        return;
      }

      setFile(droppedFile);

      // Create video preview
      const videoUrl = URL.createObjectURL(droppedFile);
      setPreview(videoUrl);
    },
    [validateFile]
  );

  /**
   * Start upload
   */
  const handleStartUpload = useCallback(() => {
    if (file) {
      uploadFile(file);
    }
  }, [file, uploadFile]);

  /**
   * Cancel upload
   */
  const handleCancel = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    setIsUploading(false);
    setIsPaused(false);
    setProgress(0);
    setUploadSpeed(0);
    uploadSessionRef.current = null;
  }, []);

  /**
   * Pause/Resume upload
   */
  const handleTogglePause = useCallback(() => {
    setIsPaused((prev) => !prev);
  }, []);

  /**
   * Remove video
   */
  const handleRemove = useCallback(() => {
    if (preview && preview.startsWith('blob:')) {
      URL.revokeObjectURL(preview);
    }
    setFile(null);
    setPreview(null);
    setError(null);
    setProgress(0);
    setUploadSpeed(0);
    setIsUploading(false);
    setIsPaused(false);
    uploadSessionRef.current = null;
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  }, [preview]);

  /**
   * Open file picker
   */
  const handleClick = useCallback(() => {
    fileInputRef.current?.click();
  }, []);

  return (
    <div className="space-y-3">
      <label className="block text-sm font-medium text-gray-900">
        Video File
      </label>

      {/* Upload Area */}
      {!file && (
        <div
          onClick={handleClick}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          className={`relative cursor-pointer rounded-lg border-2 border-dashed p-8 transition-colors ${
            isDragging
              ? 'border-blue-500 bg-blue-50'
              : 'border-gray-300 bg-gray-50 hover:border-gray-400'
          } `}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept="video/mp4,video/webm,video/quicktime"
            onChange={handleFileChange}
            className="hidden"
          />

          <div className="text-center">
            <svg
              className="mx-auto mb-3 h-12 w-12 text-gray-400"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z"
              />
            </svg>
            <p className="mb-1 text-sm text-gray-700">
              <span className="font-semibold text-blue-600">
                Click to upload
              </span>{' '}
              or drag and drop
            </p>
            <p className="text-xs text-gray-500">MP4, WebM, or MOV (max 2GB)</p>
          </div>
        </div>
      )}

      {/* File Selected - Preview & Upload */}
      {file && !isUploading && (
        <div className="space-y-3">
          {/* Video Preview */}
          {preview && (
            <div className="relative overflow-hidden rounded-lg border-2 border-gray-300">
              <video
                src={preview}
                controls
                className="aspect-video w-full bg-black"
              />
            </div>
          )}

          {/* File Info */}
          <div className="rounded-lg border border-gray-200 bg-gray-50 p-3">
            <div className="flex items-start justify-between">
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium text-gray-900">
                  {file.name}
                </p>
                <p className="mt-1 text-xs text-gray-500">
                  {formatFileSize(file.size)}
                </p>
              </div>
              <button
                type="button"
                onClick={handleRemove}
                className="ml-3 p-1.5 text-gray-400 transition-colors hover:text-red-600"
                title="Remove video"
              >
                <svg
                  className="h-5 w-5"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
              </button>
            </div>
          </div>

          {/* Upload Button */}
          <button
            type="button"
            onClick={handleStartUpload}
            className="w-full rounded-lg bg-blue-600 px-4 py-2 font-medium text-white transition-colors hover:bg-blue-700"
          >
            Start Upload
          </button>
        </div>
      )}

      {/* Upload Progress */}
      {isUploading && (
        <div className="space-y-3">
          {/* Progress Bar */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="font-medium text-gray-700">
                {isPaused ? 'Paused' : 'Uploading...'}
              </span>
              <span className="text-gray-600">{Math.round(progress)}%</span>
            </div>
            <div className="h-2 w-full overflow-hidden rounded-full bg-gray-200">
              <div
                className={`h-full transition-all duration-300 ${
                  isPaused ? 'bg-yellow-500' : 'bg-blue-600'
                }`}
                style={{ width: `${progress}%` }}
              />
            </div>
            {uploadSpeed > 0 && (
              <p className="text-xs text-gray-500">
                {formatSpeed(uploadSpeed)} •{' '}
                {formatFileSize(uploadedBytesRef.current)} /{' '}
                {formatFileSize(file.size)}
              </p>
            )}
          </div>

          {/* Control Buttons */}
          <div className="flex gap-2">
            <button
              type="button"
              onClick={handleTogglePause}
              className="flex-1 rounded-lg bg-yellow-600 px-4 py-2 font-medium text-white transition-colors hover:bg-yellow-700"
            >
              {isPaused ? 'Resume' : 'Pause'}
            </button>
            <button
              type="button"
              onClick={handleCancel}
              className="flex-1 rounded-lg bg-red-600 px-4 py-2 font-medium text-white transition-colors hover:bg-red-700"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Error Message */}
      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-3">
          <div className="flex items-start gap-2">
            <svg
              className="mt-0.5 h-5 w-5 flex-shrink-0 text-red-600"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
            <div className="flex-1">
              <p className="text-sm text-red-800">{error}</p>
              {uploadSessionRef.current && (
                <button
                  type="button"
                  onClick={handleStartUpload}
                  className="mt-2 text-sm text-red-700 underline hover:text-red-900"
                >
                  Retry Upload
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Info Message */}
      {!error && !file && (
        <p className="text-xs text-gray-500">
          Files larger than 100MB will be uploaded in chunks for better
          reliability
        </p>
      )}
    </div>
  );
}
