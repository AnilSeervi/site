import { Suspense } from 'react';

import { GuestbookType } from 'lib/types';
import { SignUsingDiscord, SignUsingGitHub } from 'app/guestbook/actions';
import FormView from 'app/guestbook/form';

function GuestbookEntry({ entry, user }) {
  const deleteEntry = async (e) => {
    e.preventDefault();

    await fetch(`/api/guestbook/${entry.id}`, {
      method: 'DELETE'
    });

    window.location.reload();
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
            >
              Delete
            </button>
          </>
        )}
      </div>
    </div>
  );
}

export default function Guestbook({ entries, session }) {
  return (
    <>
      <div className="my-4 w-full rounded border border-slate-200 bg-slate-100 p-6 dark:border-gray-800 dark:bg-zinc-900">
        <h5 className="text-lg font-bold text-gray-900 dark:text-gray-100 md:text-xl">
          Sign the Guestbook
        </h5>
        <p className="my-1 text-gray-800 dark:text-gray-200">
          Share a message for a future visitor of my site.
        </p>
        {!session && (
          <div className="my-4 flex flex-wrap items-center gap-2">
            <SignUsingGitHub />
            <SignUsingDiscord />
          </div>
        )}
        {session?.user && <FormView />}
      </div>
      <div className="mt-4 space-y-8">
        <Suspense fallback={null}>
          {entries?.map((entry: GuestbookType) => (
            <GuestbookEntry key={entry.id} entry={entry} user={session?.user} />
          ))}
        </Suspense>
      </div>
    </>
  );
}
