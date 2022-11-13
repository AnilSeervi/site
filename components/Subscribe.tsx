import { useState, useRef } from 'react';
import useSWR from 'swr';

import fetcher from 'lib/fetcher';
import { Form, FormState, Subscribers } from 'lib/types';
import SuccessMessage from 'components/SuccessMessage';
import ErrorMessage from 'components/ErrorMessage';
import LoadingSpinner from 'components/LoadingSpinner';
import InlineMetric from './InlineMetric';
import LoadingDots from './LoadingDots';
import { useEnabledOnFirstIntersection } from 'hooks/useEnabledOnFirstIntersection';

export default function Subscribe() {
  const [form, setForm] = useState<FormState>({ state: Form.Initial });
  const inputEl = useRef(null);
  const { enabled, intersectionRef } = useEnabledOnFirstIntersection();

  const subscribe = async (e) => {
    e.preventDefault();
    setForm({ state: Form.Loading });

    const email = inputEl.current.value;
    const res = await fetch(`/api/subscribe?email=${email}`, {
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
    setForm({
      state: Form.Success,
      message: `Hooray!🎉 You're now on the list.`
    });
  };

  return (
    <aside
      className="my-4 w-full rounded border border-slate-200 bg-slate-100 p-6 dark:border-gray-800 dark:bg-zinc-900"
      ref={intersectionRef}
    >
      <p className="text-lg font-bold text-gray-900 dark:text-gray-100 md:text-xl">
        Subscribe to the newsletter
      </p>
      <p className="my-1 text-gray-800 dark:text-gray-200">
        Get emails from me about web development, tech, and early access to new
        articles.
      </p>
      <form className="relative my-4" onSubmit={subscribe}>
        <input
          ref={inputEl}
          aria-label="Email for newsletter"
          placeholder="steve@apple.com"
          type="email"
          autoComplete="email"
          required
          className="mt-1 block w-full rounded-md border-gray-300 bg-white px-4 py-2 pr-32 text-gray-900 focus:outline-emerald-500 focus:ring-emerald-500 dark:bg-gray-800 dark:text-gray-100"
        />
        <button
          className="absolute right-1 top-1 flex h-8 w-28 items-center justify-center rounded bg-gray-100 font-medium text-gray-900 dark:bg-gray-700 dark:text-gray-100"
          type="submit"
        >
          {form.state === Form.Loading ? <LoadingSpinner /> : 'Subscribe'}
        </button>
      </form>
      {form.state === Form.Error ? (
        <ErrorMessage>{form.message}</ErrorMessage>
      ) : form.state === Form.Success ? (
        <SuccessMessage>{form.message}</SuccessMessage>
      ) : (
        <p className="text-sm text-gray-800 dark:text-gray-200">
          <span className="mr-2">{enabled ? <Metrics /> : null}</span>
          subscribers -{' '}
          <a
            href="https://www.getrevue.co/profile/anilseervi"
            target="_blank"
            rel="noopener noreferrer"
          >
            View all issues
          </a>
        </p>
      )}
    </aside>
  );
}

const Metrics = () => {
  const { data, error } = useSWR<Subscribers>('/api/subscribers', fetcher);
  const isLoading = (!error && !data) || !!error;
  const subscriberCount = data?.count.toString() ?? '0';

  return (
    <>{isLoading ? <LoadingDots /> : <InlineMetric stat={subscriberCount} />}</>
  );
};
