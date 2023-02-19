'use client';

import { ThemeProvider } from 'next-themes';
import React from 'react';

function ProviderTheme({ children }) {
  return <ThemeProvider attribute="class">{children}</ThemeProvider>;
}

export default ProviderTheme;
