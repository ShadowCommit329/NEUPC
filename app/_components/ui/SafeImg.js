'use client';

/**
 * <img> wrapper that falls back to a placeholder on load error.
 * Use this instead of bare <img> in Server Components where
 * you need an onError handler (which requires a Client Component).
 */
export default function SafeImg({
  src,
  alt,
  fallback = '/placeholder-event.svg',
  className,
  style,
  ...props
}) {
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={src}
      alt={alt}
      className={className}
      style={style}
      onError={(e) => {
        e.currentTarget.onerror = null;
        e.currentTarget.src = fallback;
      }}
      {...props}
    />
  );
}
