import React from 'react';
import { Button } from './ui/Button';

function Error() {
  return (
    <div className="grid h-72 place-items-center rounded-lg dark:bg-stone-900/20">
      <div>
        <Button
          onClick={() => {
            undefined.crash();
          }}
        >
          🔥 Crash this page{' '}
        </Button>
      </div>
    </div>
  );
}

export default Error;
