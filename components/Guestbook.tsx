'use client';

import { useState, useRef, Suspense, FormEventHandler, FormEvent } from 'react';
import { signIn } from 'next-auth/react';
import useSWR, { useSWRConfig } from 'swr';

import fetcher from 'lib/fetcher';
import { Form, FormState, GuestbookType } from 'lib/types';
import SuccessMessage from 'components/SuccessMessage';
import ErrorMessage from 'components/ErrorMessage';
import LoadingSpinner from 'components/LoadingSpinner';
import { z } from 'zod';
import { Input } from './ui/Input';
import { Button } from './ui/Button';

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

export default function Guestbook({ fallbackData, session }) {
  const { mutate } = useSWRConfig();
  const [form, setForm] = useState<FormState>({ state: Form.Initial });
  const inputEl = useRef(null);
  const { data: entries } = useSWR<GuestbookType[]>('/api/guestbook', fetcher, {
    fallbackData
  });

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
          <div className="my-4">
            <Button
              onClick={() => signIn('github')}
              type="button"
              variant="outline"
            >
              <svg
                role="img"
                viewBox="0 0 24 24"
                xmlns="http://www.w3.org/2000/svg"
                className="mr-2 h-5 w-5 dark:fill-white"
              >
                <title>GitHub</title>
                <path d="M12 .297c-6.63 0-12 5.373-12 12 0 5.303 3.438 9.8 8.205 11.385.6.113.82-.258.82-.577 0-.285-.01-1.04-.015-2.04-3.338.724-4.042-1.61-4.042-1.61C4.422 18.07 3.633 17.7 3.633 17.7c-1.087-.744.084-.729.084-.729 1.205.084 1.838 1.236 1.838 1.236 1.07 1.835 2.809 1.305 3.495.998.108-.776.417-1.305.76-1.605-2.665-.3-5.466-1.332-5.466-5.93 0-1.31.465-2.38 1.235-3.22-.135-.303-.54-1.523.105-3.176 0 0 1.005-.322 3.3 1.23.96-.267 1.98-.399 3-.405 1.02.006 2.04.138 3 .405 2.28-1.552 3.285-1.23 3.285-1.23.645 1.653.24 2.873.12 3.176.765.84 1.23 1.91 1.23 3.22 0 4.61-2.805 5.625-5.475 5.92.42.36.81 1.096.81 2.22 0 1.606-.015 2.896-.015 3.286 0 .315.21.69.825.57C20.565 22.092 24 17.592 24 12.297c0-6.627-5.373-12-12-12" />
              </svg>
              Sign in with GitHub
            </Button>
          </div>
        )}
        {session?.user && (
          <form className="my-4flex relative gap-4" onSubmit={leaveEntry}>
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
          {entries?.map((entry) => (
            <GuestbookEntry key={entry.id} entry={entry} user={session?.user} />
          ))}
        </Suspense>
      </div>
    </>
  );
}
