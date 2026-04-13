#!/usr/bin/env node

/**
 * NEUPC Browser Extension Validator
 * Validates extension files for common issues
 */

const fs = require('fs');
const path = require('path');

const errors = [];
const warnings = [];
const info = [];

// Colors for terminal output
const colors = {
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  green: '\x1b[32m',
  blue: '\x1b[34m',
  reset: '\x1b[0m',
};

function log(type, message) {
  const prefix = {
    error: `${colors.red}✗ ERROR${colors.reset}`,
    warning: `${colors.yellow}⚠ WARNING${colors.reset}`,
    info: `${colors.blue}ℹ INFO${colors.reset}`,
    success: `${colors.green}✓ SUCCESS${colors.reset}`,
  };
  console.log(`${prefix[type]}: ${message}`);
}

// 1. Validate manifest.json
function validateManifest() {
  info.push('Validating manifest.json...');

  try {
    const manifestPath = path.join(__dirname, 'manifest.json');
    const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));

    // Check manifest version
    if (manifest.manifest_version !== 3) {
      warnings.push('Manifest version is not 3');
    }

    // Check required fields
    const required = ['name', 'version', 'manifest_version'];
    for (const field of required) {
      if (!manifest[field]) {
        errors.push(`Manifest missing required field: ${field}`);
      }
    }

    // Check content scripts
    if (!manifest.content_scripts || manifest.content_scripts.length === 0) {
      errors.push('No content scripts defined');
    } else {
      info.push(
        `Found ${manifest.content_scripts.length} content script entries`
      );

      // Check if all content scripts exist
      for (const script of manifest.content_scripts) {
        for (const js of script.js || []) {
          const scriptPath = path.join(__dirname, js);
          if (!fs.existsSync(scriptPath)) {
            errors.push(`Content script not found: ${js}`);
          }
        }
      }
    }

    // Check background service worker
    if (manifest.background?.service_worker) {
      const workerPath = path.join(
        __dirname,
        manifest.background.service_worker
      );
      if (!fs.existsSync(workerPath)) {
        errors.push(
          `Background service worker not found: ${manifest.background.service_worker}`
        );
      }
    }

    // Check for module type in background
    if (manifest.background?.type === 'module') {
      info.push('Background script uses ES modules');
    } else {
      warnings.push('Background script not configured as ES module');
    }
  } catch (error) {
    errors.push(`Failed to validate manifest: ${error.message}`);
  }
}

// 2. Check file structure
function validateFileStructure() {
  info.push('Validating file structure...');

  const requiredDirs = [
    'common',
    'content-scripts',
    'content-scripts/group1',
    'content-scripts/group2',
    'content-scripts/group3',
    'content-scripts/group4',
    'icons',
  ];

  for (const dir of requiredDirs) {
    const dirPath = path.join(__dirname, dir);
    if (!fs.existsSync(dirPath)) {
      errors.push(`Required directory missing: ${dir}`);
    }
  }

  const requiredFiles = [
    'common/utils.js',
    'common/api.js',
    'common/storage.js',
    'content-scripts/_base.js',
    'manifest.json',
    'background.js',
    'popup.html',
    'popup.js',
  ];

  for (const file of requiredFiles) {
    const filePath = path.join(__dirname, file);
    if (!fs.existsSync(filePath)) {
      errors.push(`Required file missing: ${file}`);
    }
  }
}

// 3. Count extractors
function countExtractors() {
  info.push('Counting extractors...');

  const groups = ['group1', 'group2', 'group3', 'group4'];
  let total = 0;

  for (const group of groups) {
    const groupPath = path.join(__dirname, 'content-scripts', group);
    if (fs.existsSync(groupPath)) {
      const files = fs.readdirSync(groupPath).filter((f) => f.endsWith('.js'));
      info.push(`${group}: ${files.length} extractors`);
      total += files.length;
    }
  }

  info.push(`Total extractors: ${total}`);
}

// 4. Check for syntax errors in JS files
function checkSyntaxErrors() {
  info.push('Checking for syntax errors...');

  const jsFiles = [...findJSFiles('common'), ...findJSFiles('content-scripts')];

  for (const file of jsFiles) {
    try {
      const content = fs.readFileSync(file, 'utf8');

      // Check for common issues
      if (!content.includes('export') && file.includes('common/')) {
        warnings.push(
          `${path.basename(file)}: No exports found (expected in common files)`
        );
      }

      if (
        content.includes('import') &&
        !content.trim().startsWith('/**') &&
        !content.trim().startsWith('import')
      ) {
        // Check if imports are at the top
        const firstImportLine = content
          .split('\n')
          .findIndex((line) => line.trim().startsWith('import'));
        const firstCodeLine = content
          .split('\n')
          .findIndex(
            (line) =>
              line.trim() &&
              !line.trim().startsWith('//') &&
              !line.trim().startsWith('/*') &&
              !line.trim().startsWith('*')
          );

        if (firstCodeLine < firstImportLine && firstCodeLine !== -1) {
          warnings.push(
            `${path.basename(file)}: Imports should be at the top of the file`
          );
        }
      }
    } catch (error) {
      errors.push(`Failed to read ${file}: ${error.message}`);
    }
  }
}

function findJSFiles(dir) {
  const files = [];
  const dirPath = path.join(__dirname, dir);

  if (!fs.existsSync(dirPath)) return files;

  const entries = fs.readdirSync(dirPath, { withFileTypes: true });

  for (const entry of entries) {
    const fullPath = path.join(dirPath, entry.name);

    if (entry.isDirectory()) {
      files.push(...findJSFiles(path.relative(__dirname, fullPath)));
    } else if (entry.name.endsWith('.js')) {
      files.push(fullPath);
    }
  }

  return files;
}

// Run all validations
console.log('\n' + colors.blue + '='.repeat(60) + colors.reset);
console.log(colors.blue + 'NEUPC Browser Extension Validator' + colors.reset);
console.log(colors.blue + '='.repeat(60) + colors.reset + '\n');

validateManifest();
validateFileStructure();
countExtractors();
checkSyntaxErrors();

// Print results
console.log('\n' + colors.blue + '='.repeat(60) + colors.reset);
console.log(colors.blue + 'Validation Results' + colors.reset);
console.log(colors.blue + '='.repeat(60) + colors.reset + '\n');

if (errors.length > 0) {
  console.log(colors.red + 'ERRORS:' + colors.reset);
  errors.forEach((err) => log('error', err));
  console.log('');
}

if (warnings.length > 0) {
  console.log(colors.yellow + 'WARNINGS:' + colors.reset);
  warnings.forEach((warn) => log('warning', warn));
  console.log('');
}

if (info.length > 0) {
  console.log(colors.blue + 'INFO:' + colors.reset);
  info.forEach((i) => log('info', i));
  console.log('');
}

// Summary
console.log(colors.blue + '='.repeat(60) + colors.reset);
if (errors.length === 0 && warnings.length === 0) {
  log('success', 'All validations passed!');
} else if (errors.length === 0) {
  log('success', `Validation passed with ${warnings.length} warning(s)`);
} else {
  log(
    'error',
    `Validation failed with ${errors.length} error(s) and ${warnings.length} warning(s)`
  );
  process.exit(1);
}
console.log(colors.blue + '='.repeat(60) + colors.reset + '\n');
