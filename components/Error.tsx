'use client';

import React, { useState } from 'react';
import { Button } from './ui/Button';
import { track } from '@vercel/analytics';

function Error() {
  const [crash, setCrash] = useState(false);

  return (
    <div className="grid h-72 place-items-center rounded-lg bg-white p-8 dark:bg-stone-900/20">
      {crash ? (
        <div>
          <p>
            Uh oh, looks like you tried to break the page—intentionally! but
            your guardian Error Boundary caught it just in time. Meanwhile the
            error is being reported to Sentry, and the blog author will get a
            heads-up on{' '}
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
            <Button
              onClick={() => {
                setCrash(false);
                track('continue_reading_button_clicked');
              }}
            >
              Continue Reading
            </Button>
          </div>
        </div>
      ) : (
        <div>
          <Button
            onClick={() => {
              track('error_button_clicked');
              setCrash(true);
            }}
          >
            🔥 Crash this page 🔥
          </Button>
        </div>
      )}
    </div>
  );
}

export default Error;
