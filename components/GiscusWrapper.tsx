'use client';

import Giscus from '@giscus/react';
import { useTheme } from 'next-themes';

function GiscusWrapper() {
  const { theme } = useTheme();

  return (
    <Giscus
      mapping="title"
      repo="AnilSeervi/site"
      repoId="R_kgDOIbUq6g"
      category="Comments"
      categoryId="DIC_kwDOIbUq6s4CU0cJ"
      strict="0"
      reactionsEnabled="1"
      emitMetadata="0"
      inputPosition="top"
      theme={theme === 'dark' ? 'dark' : 'light'}
      lang="en"
      loading="lazy"
    />
  );
}

export default GiscusWrapper;
