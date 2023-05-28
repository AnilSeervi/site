'use client';

import { useRouter } from 'next/navigation';
import { useTransition } from 'react';

function Entry({ entry, user }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const deleteEntry = async (e) => {
    e.preventDefault();

    await fetch(`/api/guestbook/${entry.id}`, {
      method: 'DELETE'
    });

    startTransition(() => {
      router.refresh();
    });
  };

  return (
    <div className="flex flex-col space-y-2">
      <div className="w-full break-words text-gray-900 dark:text-gray-50">
        {entry.body}
      </div>
      <div className="flex items-center space-x-3">
        <p className="text-sm text-gray-500">{entry.created_by}</p>
        <span className=" text-gray-200 dark:text-gray-800">/</span>
        <p className="text-sm text-gray-400 dark:text-gray-600">
          <time dateTime={entry.updated_at}>
            {new Intl.DateTimeFormat('en-US', {
              year: 'numeric',
              month: 'short',
              day: 'numeric',
              hour: 'numeric',
              minute: 'numeric',
              dayPeriod: 'short'
            }).format(new Date(entry.updated_at))}
          </time>
        </p>
        {user && entry.created_by === user.name && (
          <>
            <span className="text-gray-200 dark:text-gray-800">/</span>
            <button
              className="text-sm text-red-600 dark:text-red-400"
              onClick={deleteEntry}
              disabled={isPending}
            >
              Delete
            </button>
          </>
        )}
      </div>
    </div>
  );
}

export default Entry;
