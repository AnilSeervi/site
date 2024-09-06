'use client';

import { Button } from 'components/ui/Button';
import { track } from '@vercel/analytics';
import { useSearchParams } from 'next/navigation';

function Error() {
  const internalCrash = useSearchParams().get('crash');

  if (internalCrash) {
    return (
      <div>
        <p>
          Uh oh, looks like you broke the page—intentionally! Don’t worry, your
          guardian Error Boundary caught it. The error is being reported to
          Sentry, and the blog author will get a heads-up on{' '}
          <a
            href="https://www.zenduty.com"
            className="underline"
            target="_blank"
          >
            Zenduty
          </a>
          . Time to patch things up!
        </p>
        <div className="mt-4 flex items-center justify-center">
          <a
            href={window.location.pathname}
            onClick={() => track('clicked error page reload')}
          >
            <Button>Continue reading blog</Button>
          </a>
        </div>
      </div>
    );
  }
  return (
    <div>
      <p>Oh no, something went wrong... maybe refresh?</p>
    </div>
  );
}

export default Error;

// title={`404 – Oops!`}
//     description="You've hit a dead end"
//     noindex
//     preTitle="Thats a dead end"
//     image="unsplash/photo-1609743522653-52354461eb27"
