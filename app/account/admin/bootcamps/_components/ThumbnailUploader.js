/**
 * @file Thumbnail uploader component with drag-and-drop and preview.
 * @component ThumbnailUploader
 *
 * Features:
 * - Drag-and-drop support
 * - Image preview with remove option
 * - File type validation (jpg, png, webp)
 * - File size validation (max 5MB)
 * - Upload progress indicator
 * - Error handling
 */

'use client';

import { useState, useCallback, useRef } from 'react';
import Image from 'next/image';

const MAX_SIZE = 5 * 1024 * 1024; // 5MB
const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp'];

export default function ThumbnailUploader({
  bootcampId,
  currentThumbnail,
  onUploadSuccess,
  onUploadError,
}) {
  const [preview, setPreview] = useState(currentThumbnail || null);
  const [isDragging, setIsDragging] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState(null);
  const fileInputRef = useRef(null);

  /**
   * Validate file before upload
   */
  const validateFile = useCallback((file) => {
    if (!ALLOWED_TYPES.includes(file.type)) {
      return 'Invalid file type. Please upload a JPG, PNG, or WebP image.';
    }
    if (file.size > MAX_SIZE) {
      return `File size exceeds 5MB. Your file is ${(file.size / (1024 * 1024)).toFixed(2)}MB.`;
    }
    return null;
  }, []);

  /**
   * Upload file to server
   */
  const uploadFile = useCallback(
    async (file) => {
      setIsUploading(true);
      setError(null);

      try {
        const formData = new FormData();
        formData.append('file', file);
        formData.append('bootcampId', bootcampId);

        const response = await fetch('/api/admin/upload/thumbnail', {
          method: 'POST',
          body: formData,
        });

        const result = await response.json();

        if (!response.ok) {
          throw new Error(result.error || 'Upload failed');
        }

        // Update preview with uploaded image
        const reader = new FileReader();
        reader.onloadend = () => {
          setPreview(reader.result);
        };
        reader.readAsDataURL(file);

        // Notify parent component
        if (onUploadSuccess) {
          onUploadSuccess(result.data);
        }
      } catch (err) {
        console.error('Upload error:', err);
        setError(err.message);
        if (onUploadError) {
          onUploadError(err);
        }
      } finally {
        setIsUploading(false);
      }
    },
    [bootcampId, onUploadSuccess, onUploadError]
  );

  /**
   * Handle file selection
   */
  const handleFileChange = useCallback(
    (e) => {
      const file = e.target.files?.[0];
      if (!file) return;

      const validationError = validateFile(file);
      if (validationError) {
        setError(validationError);
        return;
      }

      uploadFile(file);
    },
    [validateFile, uploadFile]
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

      const file = e.dataTransfer.files?.[0];
      if (!file) return;

      const validationError = validateFile(file);
      if (validationError) {
        setError(validationError);
        return;
      }

      uploadFile(file);
    },
    [validateFile, uploadFile]
  );

  /**
   * Handle remove thumbnail
   */
  const handleRemove = useCallback(() => {
    setPreview(null);
    setError(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  }, []);

  /**
   * Open file picker
   */
  const handleClick = useCallback(() => {
    fileInputRef.current?.click();
  }, []);

  return (
    <div className="space-y-3">
      <label className="block text-sm font-medium text-gray-900">
        Thumbnail
      </label>

      {/* Upload Area */}
      {!preview && (
        <div
          onClick={handleClick}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          className={`relative cursor-pointer rounded-lg border-2 border-dashed p-8 transition-colors ${
            isDragging
              ? 'border-blue-500 bg-blue-50'
              : 'border-gray-300 bg-gray-50 hover:border-gray-400'
          } ${isUploading ? 'pointer-events-none opacity-50' : ''} `}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            onChange={handleFileChange}
            className="hidden"
          />

          <div className="text-center">
            {isUploading ? (
              <>
                <div className="mx-auto mb-3 h-12 w-12 animate-spin rounded-full border-4 border-blue-600 border-t-transparent" />
                <p className="text-sm text-gray-600">Uploading...</p>
              </>
            ) : (
              <>
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
                    d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
                  />
                </svg>
                <p className="mb-1 text-sm text-gray-700">
                  <span className="font-semibold text-blue-600">
                    Click to upload
                  </span>{' '}
                  or drag and drop
                </p>
                <p className="text-xs text-gray-500">
                  JPG, PNG, or WebP (max 5MB)
                </p>
              </>
            )}
          </div>
        </div>
      )}

      {/* Preview */}
      {preview && !isUploading && (
        <div className="relative overflow-hidden rounded-lg border-2 border-gray-300">
          <div className="relative aspect-video w-full bg-gray-100">
            <Image
              src={preview}
              alt="Thumbnail preview"
              fill
              className="object-cover"
              unoptimized
            />
          </div>
          <button
            type="button"
            onClick={handleRemove}
            className="absolute top-2 right-2 rounded-full bg-red-600 p-2 text-white shadow-lg transition-colors hover:bg-red-700"
            title="Remove thumbnail"
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
            <p className="text-sm text-red-800">{error}</p>
          </div>
        </div>
      )}

      {/* Info Message */}
      {!error && !preview && !isUploading && (
        <p className="text-xs text-gray-500">
          Recommended size: 1280x720px (16:9 aspect ratio)
        </p>
      )}
    </div>
  );
}
