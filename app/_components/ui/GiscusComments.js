/**
 * @file Giscus Comments
 * @module GiscusComments
 *
 * Setup steps:
 * 1. Enable GitHub Discussions on your repo (Settings → Features → Discussions)
 * 2. Install the Giscus GitHub App: https://github.com/apps/giscus
 * 3. Visit https://giscus.app, enter your repo, and copy the repoId + categoryId
 * 4. Replace GISCUS_REPO_ID and GISCUS_CATEGORY_ID below with those values
 */

'use client';

import { useEffect, useRef, useState } from 'react';

const GISCUS_REPO = 'eyasir329/NEUPC';
const GISCUS_REPO_ID = 'R_kgDORQJbpQ';
const GISCUS_CATEGORY = 'General';
const GISCUS_CATEGORY_ID = 'DIC_kwDORQJbpc4C4HyJ';

const isConfigured = true;

export default function GiscusComments() {
  const commentsRef = useRef(null);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    function onMessage(e) {
      if (e.origin === 'https://giscus.app') setLoaded(true);
    }
    window.addEventListener('message', onMessage);
    return () => window.removeEventListener('message', onMessage);
  }, []);

  useEffect(() => {
    if (!isConfigured) return;
    if (!commentsRef.current || commentsRef.current.querySelector('iframe'))
      return;

    const script = document.createElement('script');
    script.src = 'https://giscus.app/client.js';
    script.setAttribute('data-repo', GISCUS_REPO);
    script.setAttribute('data-repo-id', GISCUS_REPO_ID);
    script.setAttribute('data-category', GISCUS_CATEGORY);
    script.setAttribute('data-category-id', GISCUS_CATEGORY_ID);
    script.setAttribute('data-mapping', 'pathname');
    script.setAttribute('data-strict', '0');
    script.setAttribute('data-reactions-enabled', '1');
    script.setAttribute('data-emit-metadata', '0');
    script.setAttribute('data-input-position', 'bottom');
    script.setAttribute('data-theme', 'preferred_color_scheme');
    script.setAttribute('data-lang', 'en');
    script.setAttribute('data-loading', 'lazy');
    script.crossOrigin = 'anonymous';
    script.async = true;

    commentsRef.current.appendChild(script);
  }, []);

  if (!isConfigured) {
    return (
      <div className="flex flex-col items-center gap-3 py-8 text-center">
        <div className="text-3xl">💬</div>
        <p className="text-sm font-medium text-gray-400">
          Comments not configured yet
        </p>
        <p className="max-w-sm text-xs text-gray-600">
          Install the{' '}
          <a
            href="https://github.com/apps/giscus"
            target="_blank"
            rel="noopener noreferrer"
            className="text-primary-400 underline"
          >
            Giscus GitHub App
          </a>
          , enable Discussions on this repo, then fill in{' '}
          <code className="rounded bg-white/8 px-1 text-gray-400">
            GISCUS_REPO_ID
          </code>{' '}
          and{' '}
          <code className="rounded bg-white/8 px-1 text-gray-400">
            GISCUS_CATEGORY_ID
          </code>{' '}
          in{' '}
          <code className="rounded bg-white/8 px-1 text-gray-400">
            GiscusComments.js
          </code>
          .
        </p>
      </div>
    );
  }

  return (
    <div>
      {/* Loading skeleton — fades out once Giscus iframe posts its first message */}
      {!loaded && (
        <div className="mb-4 animate-pulse space-y-4">
          {[0, 1, 2].map((i) => (
            <div key={i} className="flex gap-3">
              <div className="h-8 w-8 shrink-0 rounded-full bg-white/5" />
              <div className="flex-1 space-y-2 pt-1">
                <div className="h-2.5 w-1/4 rounded-full bg-white/5" />
                <div className="h-2.5 w-3/4 rounded-full bg-white/5" />
                <div className="h-2.5 w-1/2 rounded-full bg-white/5" />
              </div>
            </div>
          ))}
        </div>
      )}
      <div ref={commentsRef} />
    </div>
  );
}
