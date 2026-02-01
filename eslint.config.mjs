import { dirname } from 'path';
import { fileURLToPath } from 'url';
import { FlatCompat } from '@eslint/eslintrc';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const compat = new FlatCompat({
  baseDirectory: __dirname,
});

const eslintConfig = [
  ...compat.extends('next/core-web-vitals'),
  {
    rules: {
      'react/prop-types': 'off',
      'react/no-unescaped-entities': 'off',
      '@next/next/no-server-import-in-page': 'off',
    },
  },
];

export default eslintConfig;

