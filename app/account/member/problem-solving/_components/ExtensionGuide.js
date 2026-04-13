/**
 * @file Extension Guide Component
 * @description Information card for browser extension setup and usage
 */

'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Puzzle,
  ChevronDown,
  ChevronRight,
  Chrome,
  Download,
  Key,
  Zap,
  CheckCircle2,
  ExternalLink,
  Copy,
  Check,
  Info,
  RefreshCw,
  Eye,
  EyeOff,
} from 'lucide-react';

export default function ExtensionGuide() {
  const [isExpanded, setIsExpanded] = useState(false);
  const [copiedStep, setCopiedStep] = useState(null);
  const [selectedBrowser, setSelectedBrowser] = useState('chrome'); // 'chrome' | 'firefox' | 'manual'
  const [browserDetection, setBrowserDetection] = useState({
    detected: false,
    label: 'Unknown',
    usedFallback: true,
  });
  const [extensionToken, setExtensionToken] = useState(null);
  const [showToken, setShowToken] = useState(false);
  const [isLoadingToken, setIsLoadingToken] = useState(false);
  const [tokenError, setTokenError] = useState(null);

  // Load extension token on mount
  useEffect(() => {
    detectBrowserAndSetDefault();
    loadExtensionToken();
  }, []);

  const detectBrowserAndSetDefault = () => {
    if (typeof navigator === 'undefined') {
      return;
    }

    const ua = navigator.userAgent.toLowerCase();

    if (ua.includes('firefox')) {
      setSelectedBrowser('firefox');
      setBrowserDetection({
        detected: true,
        label: 'Firefox',
        usedFallback: false,
      });
      return;
    }

    // Group Chromium-based browsers under the Chrome/Edge instructions.
    const isChromiumFamily =
      ua.includes('edg/') ||
      ua.includes('chrome/') ||
      ua.includes('chromium/') ||
      ua.includes('brave/') ||
      ua.includes('opr/') ||
      ua.includes('opera') ||
      ua.includes('vivaldi');

    if (isChromiumFamily) {
      setSelectedBrowser('chrome');
      setBrowserDetection({
        detected: true,
        label: 'Chrome / Edge (Chromium)',
        usedFallback: false,
      });
      return;
    }

    // Safari or unknown browser: fallback to manual instructions.
    setSelectedBrowser('manual');
    setBrowserDetection({
      detected: false,
      label: 'Unsupported / Unknown Browser',
      usedFallback: true,
    });
  };

  const loadExtensionToken = async () => {
    try {
      setIsLoadingToken(true);
      setTokenError(null);
      const response = await fetch('/api/problem-solving/extension-token');
      const data = await response.json();

      if (data.success && data.data.extensionToken) {
        setExtensionToken(data.data.extensionToken);
      }
    } catch (error) {
      console.error('Failed to load extension token:', error);
      setTokenError('Failed to load token');
    } finally {
      setIsLoadingToken(false);
    }
  };

  const generateExtensionToken = async () => {
    try {
      setIsLoadingToken(true);
      setTokenError(null);
      const response = await fetch('/api/problem-solving/extension-token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ regenerate: !!extensionToken }),
      });
      const data = await response.json();

      if (data.success) {
        setExtensionToken(data.data.extensionToken);
        setShowToken(true);
      } else {
        setTokenError(data.error || 'Failed to generate token');
      }
    } catch (error) {
      console.error('Failed to generate token:', error);
      setTokenError('Failed to generate token');
    } finally {
      setIsLoadingToken(false);
    }
  };

  const copyToClipboard = (text, stepId) => {
    navigator.clipboard.writeText(text);
    setCopiedStep(stepId);
    setTimeout(() => setCopiedStep(null), 2000);
  };

  // Browser-specific instructions
  const browserSteps = {
    chrome: {
      name: 'Chrome / Edge',
      icon: Chrome,
      color: 'blue',
      extensionsUrl: 'chrome://extensions/',
      steps: [
        {
          id: 'install',
          icon: Download,
          title: 'Install Extension',
          description: 'Load the NEUPC extension in Chrome/Edge',
          color: 'blue',
          instructions: [
            'Open Chrome/Edge and navigate to chrome://extensions/',
            'Enable "Developer mode" toggle (top-right corner)',
            'Click "Load unpacked" button',
            'Select the browser-extension folder from NEUPC project',
            'The NEUPC extension icon should appear in your toolbar',
          ],
        },
        {
          id: 'configure',
          icon: Key,
          title: 'Configure Settings',
          description: 'Set up your connection to NEUPC',
          color: 'purple',
          instructions: [
            'Click the NEUPC extension icon in your browser toolbar',
            'Enter API Endpoint: http://localhost:3000 (for local development)',
            'Copy your Extension Token from the section below this guide',
            'Paste the token in the "Extension Token" field',
            'Click "Save Settings" button',
            'Click "Test Connection" to verify (should show ✓ Connected)',
          ],
        },
        {
          id: 'use',
          icon: Zap,
          title: 'Start Syncing',
          description: 'Automatically sync your solutions',
          color: 'green',
          instructions: [
            'Toggle "Auto-sync on AC" switch to ON in extension settings',
            'Visit Codeforces and solve any problem',
            'Submit your solution and get AC (Accepted) verdict',
            'Extension automatically syncs your solution! ✨',
            'Alternative: Use "Bulk Import" to import all historical submissions',
          ],
        },
      ],
    },
    firefox: {
      name: 'Firefox',
      icon: Chrome, // We'll use Chrome icon as placeholder for Firefox
      color: 'orange',
      extensionsUrl: 'about:debugging#/runtime/this-firefox',
      steps: [
        {
          id: 'install',
          icon: Download,
          title: 'Install Extension',
          description: 'Load the NEUPC extension in Firefox',
          color: 'orange',
          instructions: [
            'Open Firefox and navigate to about:debugging#/runtime/this-firefox',
            'Click "Load Temporary Add-on..." button',
            'Navigate to browser-extension folder in NEUPC project',
            'Select the manifest.json file',
            'The NEUPC extension icon should appear in your toolbar',
            'Note: Temporary add-ons are removed when Firefox closes',
          ],
        },
        {
          id: 'configure',
          icon: Key,
          title: 'Configure Settings',
          description: 'Set up your connection to NEUPC',
          color: 'purple',
          instructions: [
            'Click the NEUPC extension icon in your browser toolbar',
            'Enter API Endpoint: http://localhost:3000 (for local development)',
            'Copy your Extension Token from the section below this guide',
            'Paste the token in the "Extension Token" field',
            'Click "Save Settings" button',
            'Click "Test Connection" to verify (should show ✓ Connected)',
          ],
        },
        {
          id: 'use',
          icon: Zap,
          title: 'Start Syncing',
          description: 'Automatically sync your solutions',
          color: 'green',
          instructions: [
            'Toggle "Auto-sync on AC" switch to ON in extension settings',
            'Visit Codeforces and solve any problem',
            'Submit your solution and get AC (Accepted) verdict',
            'Extension automatically syncs your solution! ✨',
            'Alternative: Use "Bulk Import" to import all historical submissions',
          ],
        },
      ],
    },
    manual: {
      name: 'Other / Manual Setup',
      icon: Puzzle,
      color: 'purple',
      extensionsUrl: null,
      steps: [
        {
          id: 'choose-browser-flow',
          icon: Download,
          title: 'Choose Your Browser Flow',
          description: 'Pick the matching extension-loading method',
          color: 'purple',
          instructions: [
            'Chromium browsers: open chrome://extensions/ and use Load unpacked',
            'Firefox: open about:debugging#/runtime/this-firefox and use Load Temporary Add-on',
            'Select the browser-extension folder (or manifest.json for Firefox)',
            'Pin the NEUPC extension icon in your browser toolbar',
          ],
        },
        {
          id: 'configure-manual',
          icon: Key,
          title: 'Configure Settings',
          description: 'Connect extension to your NEUPC account',
          color: 'purple',
          instructions: [
            'Open the NEUPC extension popup',
            'Set API Endpoint: http://localhost:3000',
            'Copy your Extension Token from the section below',
            'Paste token and click Save Settings',
            'Use Test Connection and confirm it shows Connected',
          ],
        },
        {
          id: 'sync-manual',
          icon: Zap,
          title: 'Start Syncing',
          description: 'Enable auto-sync and verify first import',
          color: 'green',
          instructions: [
            'Enable Auto-sync on AC in extension settings',
            'Submit an Accepted solution on Codeforces',
            'Verify the solve appears in your NEUPC dashboard',
            'Use Bulk Import if you want older submissions too',
          ],
        },
      ],
    },
  };

  const currentBrowser = browserSteps[selectedBrowser];
  const steps = currentBrowser.steps;

  const features = [
    {
      icon: CheckCircle2,
      text: 'Auto-sync solutions on AC',
      color: 'text-green-400',
    },
    {
      icon: CheckCircle2,
      text: 'Bulk import historical submissions',
      color: 'text-green-400',
    },
    {
      icon: CheckCircle2,
      text: 'Supports 41+ platforms',
      color: 'text-green-400',
    },
    {
      icon: CheckCircle2,
      text: 'AI analysis included',
      color: 'text-green-400',
    },
  ];

  const colorClasses = {
    blue: {
      gradient: 'from-blue-500/20 to-cyan-500/10',
      border: 'border-blue-500/30',
      icon: 'text-blue-400',
      bg: 'bg-blue-500/10',
    },
    orange: {
      gradient: 'from-orange-500/20 to-amber-500/10',
      border: 'border-orange-500/30',
      icon: 'text-orange-400',
      bg: 'bg-orange-500/10',
    },
    purple: {
      gradient: 'from-purple-500/20 to-pink-500/10',
      border: 'border-purple-500/30',
      icon: 'text-purple-400',
      bg: 'bg-purple-500/10',
    },
    green: {
      gradient: 'from-green-500/20 to-emerald-500/10',
      border: 'border-green-500/30',
      icon: 'text-green-400',
      bg: 'bg-green-500/10',
    },
  };

  return (
    <div className="overflow-hidden rounded-2xl border border-white/[0.06] bg-white/[0.02] shadow-lg shadow-black/5 backdrop-blur-sm">
      {/* Header - Always Visible */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="flex w-full items-center justify-between gap-4 p-5 transition-colors hover:bg-white/[0.02]"
      >
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-violet-500 to-purple-500 shadow-lg shadow-violet-500/20">
            <Puzzle className="h-5 w-5 text-white" />
          </div>
          <div className="text-left">
            <h3 className="text-sm font-semibold text-white">
              Browser Extension
            </h3>
            <p className="text-xs text-gray-500">
              Auto-sync solutions from 41+ platforms
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <span className="hidden rounded-full bg-violet-500/10 px-2.5 py-1 text-xs font-medium text-violet-400 sm:inline-block">
            Setup Guide
          </span>
          <motion.div
            animate={{ rotate: isExpanded ? 180 : 0 }}
            transition={{ duration: 0.2 }}
          >
            <ChevronDown className="h-5 w-5 text-gray-400" />
          </motion.div>
        </div>
      </button>

      {/* Expandable Content */}
      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3, ease: 'easeInOut' }}
            className="overflow-hidden"
          >
            <div className="border-t border-white/[0.06] p-5">
              <div
                className={`mb-4 rounded-lg border px-3 py-2 text-xs ${
                  browserDetection.usedFallback
                    ? 'border-amber-500/30 bg-amber-500/10 text-amber-300'
                    : 'border-emerald-500/30 bg-emerald-500/10 text-emerald-300'
                }`}
              >
                {browserDetection.usedFallback
                  ? 'Browser not detected reliably. Showing Other / Manual Setup as fallback. You can switch tabs manually.'
                  : `Detected browser: ${browserDetection.label}. Showing matching setup steps.`}
              </div>

              {/* Browser Selection Tabs */}
              <div className="mb-6 flex gap-2 rounded-lg border border-white/[0.06] bg-white/[0.02] p-1">
                <button
                  onClick={() => setSelectedBrowser('chrome')}
                  className={`flex flex-1 items-center justify-center gap-2 rounded-md px-4 py-2.5 text-xs font-medium transition-all ${
                    selectedBrowser === 'chrome'
                      ? 'bg-blue-500/20 text-blue-300 shadow-sm'
                      : 'text-gray-400 hover:text-gray-300'
                  }`}
                >
                  <Chrome className="h-4 w-4" />
                  Chrome / Edge
                </button>
                <button
                  onClick={() => setSelectedBrowser('firefox')}
                  className={`flex flex-1 items-center justify-center gap-2 rounded-md px-4 py-2.5 text-xs font-medium transition-all ${
                    selectedBrowser === 'firefox'
                      ? 'bg-orange-500/20 text-orange-300 shadow-sm'
                      : 'text-gray-400 hover:text-gray-300'
                  }`}
                >
                  <svg
                    className="h-4 w-4"
                    viewBox="0 0 24 24"
                    fill="currentColor"
                  >
                    <path d="M20.45 8.92c-.4-.73-.68-1.22-1.03-1.85-.13-.23-.27-.47-.42-.74-.36-.63-.77-1.37-1.24-2.2-.15-.27-.32-.55-.49-.82-.88-1.46-1.85-2.73-2.69-3.54-.19-.18-.37-.34-.54-.48-.17-.14-.33-.26-.48-.37-.15-.11-.29-.2-.42-.28-.26-.15-.49-.27-.69-.36-.2-.09-.37-.15-.52-.2-.15-.04-.28-.07-.4-.08-.23-.03-.43-.02-.6.02-.17.04-.32.1-.46.18-.14.08-.27.17-.39.28-.12.1-.24.22-.35.35-.47.54-.88 1.37-1.23 2.38-.17.5-.33 1.04-.47 1.61-.07.28-.13.57-.19.87-.06.3-.11.6-.15.92-.04.31-.08.64-.1.97-.03.33-.04.67-.05 1.02 0 .35.01.71.03 1.08.02.37.05.75.09 1.13.04.38.09.77.15 1.17.06.39.13.79.21 1.2.08.41.17.82.27 1.24.1.42.21.84.33 1.27.12.43.25.86.39 1.29.14.43.29.87.45 1.31.16.44.33.88.51 1.33.18.44.37.89.57 1.34.2.45.41.9.63 1.35.22.45.45.9.69 1.35.24.45.49.9.75 1.35.13.22.26.45.39.67l.1.17c.07.11.13.22.2.33.13.22.27.44.41.66.14.22.28.44.42.66.14.22.29.44.44.66.15.22.3.44.45.66.15.22.31.44.47.66.16.22.32.44.48.66.16.22.33.44.5.66.17.22.34.44.51.66.17.22.35.44.53.66.18.22.36.44.54.66.18.22.37.44.56.66.19.22.38.44.57.66.19.22.39.44.59.66.2.22.4.44.61.66.21.22.41.44.62.66.21.22.43.44.64.66.21.22.43.44.65.66.22.22.44.44.67.66.23.22.45.44.68.66.23.22.46.44.7.66.24.22.48.44.72.66.12.11.24.22.36.33l.06.05c.06.05.12.11.18.16.12.11.24.22.37.33.13.11.25.22.38.33.13.11.26.22.39.33.13.11.27.22.4.33.13.11.27.22.41.33.14.11.28.22.42.33.14.11.29.22.43.33.14.11.29.22.44.33.15.11.3.22.45.33.15.11.31.22.46.33.15.11.31.22.47.33.16.11.32.22.48.33.16.11.32.22.49.33.16.11.33.22.5.33.17.11.34.22.51.33.17.11.34.22.52.33.17.11.35.22.53.33.18.11.36.22.54.33.18.11.36.22.55.33.18.11.37.22.56.33.19.11.38.22.57.33.19.11.38.22.58.33.19.11.39.22.59.33.2.11.4.22.6.33.2.11.4.22.61.33.2.11.41.22.62.33.21.11.42.22.63.33.21.11.42.22.64.33.21.11.43.22.65.33.22.11.44.22.66.33.22.11.44.22.67.33.22.11.45.22.68.33.23.11.46.22.69.33.23.11.46.22.7.33.07.03.14.07.21.1z" />
                  </svg>
                  Firefox
                </button>
                <button
                  onClick={() => setSelectedBrowser('manual')}
                  className={`flex flex-1 items-center justify-center gap-2 rounded-md px-4 py-2.5 text-xs font-medium transition-all ${
                    selectedBrowser === 'manual'
                      ? 'bg-purple-500/20 text-purple-300 shadow-sm'
                      : 'text-gray-400 hover:text-gray-300'
                  }`}
                >
                  <Puzzle className="h-4 w-4" />
                  Other / Manual
                </button>
              </div>

              {/* Features Grid */}
              <div className="mb-6 grid grid-cols-2 gap-3">
                {features.map((feature, index) => (
                  <div
                    key={index}
                    className="flex items-center gap-2 rounded-lg bg-white/[0.02] p-2.5"
                  >
                    <feature.icon className={`h-4 w-4 ${feature.color}`} />
                    <span className="text-xs text-gray-300">
                      {feature.text}
                    </span>
                  </div>
                ))}
              </div>

              {/* Setup Steps */}
              <div className="space-y-4">
                <h4 className="flex items-center gap-2 text-sm font-semibold text-white">
                  <Info className="h-4 w-4 text-violet-400" />
                  Quick Setup for {currentBrowser.name} ({steps.length} steps)
                </h4>

                {steps.map((step, index) => {
                  const colors = colorClasses[step.color];
                  return (
                    <div
                      key={step.id}
                      className={`rounded-xl border ${colors.border} bg-gradient-to-r ${colors.gradient} p-4`}
                    >
                      {/* Step Header */}
                      <div className="mb-3 flex items-start gap-3">
                        <div
                          className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${colors.bg}`}
                        >
                          <step.icon className={`h-4 w-4 ${colors.icon}`} />
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <span
                              className={`text-xs font-bold ${colors.icon}`}
                            >
                              STEP {index + 1}
                            </span>
                          </div>
                          <h5 className="mt-0.5 text-sm font-semibold text-white">
                            {step.title}
                          </h5>
                          <p className="mt-0.5 text-xs text-gray-400">
                            {step.description}
                          </p>
                        </div>
                      </div>

                      {/* Step Instructions */}
                      <div className="ml-11 space-y-2">
                        {step.instructions.map((instruction, idx) => (
                          <div
                            key={idx}
                            className="flex items-start gap-2 text-xs text-gray-300"
                          >
                            <ChevronRight className="mt-0.5 h-3 w-3 shrink-0 text-gray-500" />
                            <span>{instruction}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Quick Links */}
              <div className="mt-6 flex flex-col gap-2 sm:flex-row">
                {currentBrowser.extensionsUrl ? (
                  <a
                    href={currentBrowser.extensionsUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex flex-1 items-center justify-center gap-2 rounded-lg border border-white/10 bg-white/[0.04] px-4 py-2.5 text-xs font-medium text-gray-300 transition-colors hover:bg-white/[0.08]"
                  >
                    <currentBrowser.icon className="h-4 w-4" />
                    Open {currentBrowser.name} Extensions
                    <ExternalLink className="h-3 w-3" />
                  </a>
                ) : (
                  <div className="flex flex-1 items-center justify-center gap-2 rounded-lg border border-white/10 bg-white/[0.04] px-4 py-2.5 text-xs font-medium text-gray-400">
                    <currentBrowser.icon className="h-4 w-4" />
                    Open your browser extension page manually
                  </div>
                )}
                <button
                  onClick={() =>
                    copyToClipboard(
                      currentBrowser.extensionsUrl ||
                        'chrome://extensions/ OR about:debugging#/runtime/this-firefox',
                      'extensions-url'
                    )
                  }
                  className="flex flex-1 items-center justify-center gap-2 rounded-lg border border-white/10 bg-white/[0.04] px-4 py-2.5 text-xs font-medium text-gray-300 transition-colors hover:bg-white/[0.08]"
                >
                  {copiedStep === 'extensions-url' ? (
                    <>
                      <Check className="h-4 w-4 text-green-400" />
                      Copied!
                    </>
                  ) : (
                    <>
                      <Copy className="h-4 w-4" />
                      Copy URL
                    </>
                  )}
                </button>
              </div>

              {/* Extension Token Section */}
              <div className="mt-6 space-y-3 rounded-lg border border-purple-500/20 bg-purple-500/5 p-4">
                <div className="flex items-center gap-2">
                  <Key className="h-4 w-4 text-purple-400" />
                  <h4 className="text-sm font-semibold text-purple-300">
                    Extension Token
                  </h4>
                </div>

                <p className="text-xs text-gray-400">
                  Use this token to authenticate the browser extension with your
                  account.
                </p>

                {tokenError && (
                  <div className="rounded-lg border border-red-500/20 bg-red-500/10 px-3 py-2 text-xs text-red-400">
                    {tokenError}
                  </div>
                )}

                {extensionToken ? (
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <div className="flex-1 overflow-hidden rounded-lg border border-white/10 bg-black/20 px-3 py-2 font-mono text-xs">
                        <div className="overflow-hidden text-ellipsis">
                          {showToken
                            ? extensionToken
                            : '••••••••••••••••••••••••••••••••'}
                        </div>
                      </div>
                      <button
                        onClick={() => setShowToken(!showToken)}
                        className="flex h-9 w-9 items-center justify-center rounded-lg border border-white/10 bg-white/[0.04] transition-colors hover:bg-white/[0.08]"
                      >
                        {showToken ? (
                          <EyeOff className="h-4 w-4 text-gray-400" />
                        ) : (
                          <Eye className="h-4 w-4 text-gray-400" />
                        )}
                      </button>
                      <button
                        onClick={() => copyToClipboard(extensionToken, 'token')}
                        className="flex h-9 w-9 items-center justify-center rounded-lg border border-white/10 bg-white/[0.04] transition-colors hover:bg-white/[0.08]"
                      >
                        {copiedStep === 'token' ? (
                          <Check className="h-4 w-4 text-green-400" />
                        ) : (
                          <Copy className="h-4 w-4 text-gray-400" />
                        )}
                      </button>
                    </div>
                    <button
                      onClick={generateExtensionToken}
                      disabled={isLoadingToken}
                      className="flex w-full items-center justify-center gap-2 rounded-lg border border-red-500/20 bg-red-500/10 px-3 py-2 text-xs font-medium text-red-400 transition-colors hover:bg-red-500/20 disabled:opacity-50"
                    >
                      {isLoadingToken ? (
                        <>
                          <RefreshCw className="h-3 w-3 animate-spin" />
                          Regenerating...
                        </>
                      ) : (
                        <>
                          <RefreshCw className="h-3 w-3" />
                          Regenerate Token (will invalidate current)
                        </>
                      )}
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={generateExtensionToken}
                    disabled={isLoadingToken}
                    className="flex w-full items-center justify-center gap-2 rounded-lg bg-purple-500/20 px-4 py-2.5 text-sm font-medium text-purple-300 transition-colors hover:bg-purple-500/30 disabled:opacity-50"
                  >
                    {isLoadingToken ? (
                      <>
                        <RefreshCw className="h-4 w-4 animate-spin" />
                        Generating Token...
                      </>
                    ) : (
                      <>
                        <Key className="h-4 w-4" />
                        Generate Extension Token
                      </>
                    )}
                  </button>
                )}

                <div className="rounded-lg border border-blue-500/20 bg-blue-500/10 px-3 py-2 text-xs text-blue-300">
                  <Info className="mb-1 inline-block h-3 w-3" /> Copy this token
                  and paste it in Step 2 (Configure Settings) of the extension.
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
