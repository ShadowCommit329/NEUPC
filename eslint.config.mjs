import { defineConfig, globalIgnores } from 'eslint/config';
import nextVitals from 'eslint-config-next/core-web-vitals';

const eslintConfig = defineConfig([
  ...nextVitals,
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    '.next/**',
    'out/**',
    'build/**',
    'next-env.d.ts',
    // Deprecated middleware file (replaced by middleware.js)
    'proxy.js',
  ]),
  // Production-quality rules
  {
    rules: {
      // Warn on console.log (allow warn/error for legitimate logging)
      'no-console': ['warn', { allow: ['warn', 'error'] }],
      // Prevent unused variables (ignore prefixed with _)
      'no-unused-vars': [
        'warn',
        { argsIgnorePattern: '^_', varsIgnorePattern: '^_' },
      ],
    },
  },
]);

export default eslintConfig;
