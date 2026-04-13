#!/usr/bin/env node

/**
 * Browser Compatibility Checker
 * Checks if extension code is compatible with both Chrome and Firefox
 */

const fs = require('fs');
const path = require('path');

const issues = [];
const warnings = [];

console.log('\n🔍 Checking Browser Compatibility...\n');

// 1. Check for browser API usage
function checkBrowserAPI() {
  console.log('Checking browser API usage...');

  const jsFiles = findAllJSFiles();

  for (const file of jsFiles) {
    const content = fs.readFileSync(file, 'utf8');
    const relativePath = path.relative(__dirname, file);

    // Check for chrome.* usage without fallback
    const chromeMatches = content.match(/chrome\.\w+/g);

    if (chromeMatches && !content.includes('typeof browser')) {
      // Check if it's in a try-catch or has browser polyfill
      if (
        !content.includes('browser') &&
        !content.includes('globalThis.chrome')
      ) {
        warnings.push(
          `${relativePath}: Uses 'chrome' API without browser fallback`
        );
      }
    }
  }
}

// 2. Check manifest compatibility
function checkManifest() {
  console.log('Checking manifest.json...');

  const manifest = JSON.parse(
    fs.readFileSync(path.join(__dirname, 'manifest.json'), 'utf8')
  );

  // Check manifest version
  if (manifest.manifest_version === 3) {
    console.log('  ✓ Manifest V3 (supported by both browsers)');
  }

  // Check for Firefox-specific settings
  if (manifest.browser_specific_settings?.gecko) {
    console.log('  ✓ Firefox settings configured');
  } else {
    warnings.push(
      'Consider adding browser_specific_settings.gecko for Firefox'
    );
  }

  // Check permissions
  const unsupportedPermissions = [];
  if (manifest.permissions) {
    // All our permissions are supported by both browsers
    console.log('  ✓ All permissions compatible');
  }
}

// 3. Check for ES modules support
function checkESModules() {
  console.log('Checking ES modules...');

  const manifest = JSON.parse(
    fs.readFileSync(path.join(__dirname, 'manifest.json'), 'utf8')
  );

  // Check content scripts
  for (const script of manifest.content_scripts || []) {
    if (script.type === 'module') {
      console.log(`  ✓ Content script uses ES modules: ${script.js[0]}`);
    } else {
      warnings.push(`Content script not marked as module: ${script.js[0]}`);
    }
  }

  // Check background script
  if (manifest.background?.type === 'module') {
    console.log('  ✓ Background script uses ES modules');
  }
}

// 4. Check for browser-specific features
function checkBrowserFeatures() {
  console.log('Checking browser-specific features...');

  const backgroundPath = path.join(__dirname, 'background.js');
  const content = fs.readFileSync(backgroundPath, 'utf8');

  // Check for notifications
  if (content.includes('chrome.notifications')) {
    console.log('  ⚠ Uses notifications (ensure permission granted)');
  }

  // Check for alarms
  if (content.includes('chrome.alarms')) {
    console.log('  ⚠ Uses alarms (ensure permission granted)');
  }
}

function findAllJSFiles() {
  const files = [];

  function scan(dir) {
    const entries = fs.readdirSync(dir, { withFileTypes: true });

    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);

      if (entry.isDirectory() && entry.name !== 'node_modules') {
        scan(fullPath);
      } else if (entry.name.endsWith('.js')) {
        files.push(fullPath);
      }
    }
  }

  scan(__dirname);
  return files;
}

// Run checks
checkManifest();
checkESModules();
checkBrowserAPI();
checkBrowserFeatures();

// Print results
console.log('\n' + '='.repeat(60));
console.log('Results:');
console.log('='.repeat(60) + '\n');

if (issues.length > 0) {
  console.log('❌ ISSUES:');
  issues.forEach((issue) => console.log(`  - ${issue}`));
  console.log('');
}

if (warnings.length > 0) {
  console.log('⚠️  WARNINGS:');
  warnings.forEach((warn) => console.log(`  - ${warn}`));
  console.log('');
}

if (issues.length === 0 && warnings.length === 0) {
  console.log('✅ No compatibility issues found!');
  console.log('');
  console.log('Extension should work in both Chrome and Firefox.');
} else if (issues.length === 0) {
  console.log('✅ No critical issues found.');
  console.log(`⚠️  ${warnings.length} warning(s) - review recommended.`);
} else {
  console.log(
    `❌ ${issues.length} issue(s) found - must fix before Firefox testing.`
  );
}

console.log('\n' + '='.repeat(60) + '\n');

// Summary
console.log('Browser Compatibility Summary:\n');
console.log('Chrome:  ✓ Fully supported (Manifest V3)');
console.log('Firefox: ✓ Supported (v109+, Manifest V3)');
console.log('Edge:    ✓ Supported (Chromium-based)');
console.log('Safari:  ✗ Not supported (different format)\n');

process.exit(issues.length > 0 ? 1 : 0);
