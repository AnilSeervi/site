'use client';

import { usePageViews } from 'hooks/usePageViews';
import { usePathname } from 'next/navigation';
import { useEffect } from 'react';

function IncrementView() {
  const slug = usePathname();

  const { increment: incrementView } = usePageViews(slug, false);

  useEffect(() => {
    incrementView();
  }, [slug]);
  return <></>;
}

export default IncrementView;
