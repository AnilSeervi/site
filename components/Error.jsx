import React from 'react';
import { Button } from './ui/Button';
import { track } from '@vercel/analytics';
import { useRouter } from 'next/navigation';

function Error() {
  const router = useRouter();

  return (
    <div className="grid h-72 place-items-center rounded-lg bg-white dark:bg-stone-900/20">
      <div>
        <Button
          onClick={() => {
            track('error_button_clicked');
            router.replace(`?crash=${true}`);
          }}
        >
          🔥 Crash this page 🔥
        </Button>
      </div>
    </div>
  );
}

export default Error;
