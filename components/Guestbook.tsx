import { Suspense } from 'react';
import { GuestbookType } from 'lib/types';
import { SignUsingDiscord, SignUsingGitHub } from 'app/guestbook/actions';
import FormView from 'app/guestbook/form';
import Entry from 'app/guestbook/entry';

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
            <Entry key={entry.id} entry={entry} user={session?.user} />
          ))}
        </Suspense>
      </div>
    </>
  );
}
