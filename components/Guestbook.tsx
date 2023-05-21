'use client';

import { useState, useRef, Suspense, FormEvent } from 'react';
import { useSWRConfig } from 'swr';
import { Form, FormState, GuestbookType } from 'lib/types';
import SuccessMessage from 'components/SuccessMessage';
import ErrorMessage from 'components/ErrorMessage';
import LoadingSpinner from 'components/LoadingSpinner';
import { z } from 'zod';
import { Input } from './ui/Input';
import { Button } from './ui/Button';
import { SignUsingDiscord, SignUsingGitHub } from 'app/guestbook/actions';

function GuestbookEntry({ entry, user }) {
  const { mutate } = useSWRConfig();
  const deleteEntry = async (e) => {
    e.preventDefault();

    await fetch(`/api/guestbook/${entry.id}`, {
      method: 'DELETE'
    });

    mutate('/api/guestbook');
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
  const { mutate } = useSWRConfig();
  const [form, setForm] = useState<FormState>({ state: Form.Initial });
  const inputEl = useRef(null);

  const leaveEntry = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setForm({ state: Form.Loading });
    const bodyValue = z
      .string()
      .min(1, { message: 'Must be more than 1 character' })
      .max(500, { message: 'Must be less than 500 characters' })
      .safeParse(inputEl.current.value);

    if (bodyValue.success === false) {
      setForm({
        state: Form.Error,
        message: bodyValue.error.issues[0].message
      });
      return;
    }
    const res = await fetch('/api/guestbook', {
      body: JSON.stringify({
        body: bodyValue.data
      }),
      headers: {
        'Content-Type': 'application/json'
      },
      method: 'POST'
    });

    const { error } = await res.json();
    if (error) {
      setForm({
        state: Form.Error,
        message: error
      });
      return;
    }

    inputEl.current.value = '';
    mutate('/api/guestbook');
    setForm({
      state: Form.Success,
      message: `Hooray! Thanks for signing my Guestbook.`
    });
  };

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
        {session?.user && (
          <form className="relative my-4 flex gap-4" onSubmit={leaveEntry}>
            <Input
              ref={inputEl}
              aria-label="Your message"
              placeholder="Your message..."
              required
              className="bg-white text-base dark:bg-gray-800"
            />
            <Button
              type="submit"
              className="whitespace-nowrap"
              variant="subtle"
            >
              {form.state === Form.Loading ? <LoadingSpinner /> : 'Sign'}
            </Button>
          </form>
        )}
        <div className="my-2">
          {form.state === Form.Error ? (
            <ErrorMessage>{form.message}</ErrorMessage>
          ) : form.state == Form.Success ? (
            <SuccessMessage>{form.message}</SuccessMessage>
          ) : (
            <p className="text-sm text-gray-800 dark:text-gray-200">
              Your information is only used to display your name and reply by
              email.
            </p>
          )}
        </div>
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
