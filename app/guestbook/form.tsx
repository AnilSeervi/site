'use client';

import ErrorMessage from 'components/ErrorMessage';
import LoadingSpinner from 'components/LoadingSpinner';
import SuccessMessage from 'components/SuccessMessage';
import { Button } from 'components/ui/Button';
import { Input } from 'components/ui/Input';
import { FormState, Form } from 'lib/types';
import { useRouter } from 'next/navigation';
import { useState, useTransition } from 'react';
import { z } from 'zod';

function FormView() {
  const router = useRouter();
  const [formState, setFormState] = useState<FormState>({
    state: Form.Initial
  });
  const [isPending, startTransition] = useTransition();
  const isMutating = formState.state === Form.Loading || isPending;

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setFormState({
      state: Form.Loading
    });
    const form = event.currentTarget;
    const input = form.elements.namedItem('message') as HTMLInputElement;

    const bodyValue = z
      .string()
      .min(1, {
        message: 'Must be more than 1 character'
      })
      .max(500, {
        message: 'Must be less than 500 characters'
      })
      .safeParse(input.value);

    if (bodyValue.success === false) {
      setFormState({
        state: Form.Error,
        message: bodyValue.error.issues[0].message
      });
      return;
    }

    const res = await fetch('/api/guestbook', {
      body: JSON.stringify({
        body: input.value
      }),
      headers: {
        'Content-Type': 'application/json'
      },
      method: 'POST'
    });
    input.value = '';

    const { error } = await res.json();

    if (error) {
      setFormState({
        state: Form.Error,
        message: error
      });
      return;
    }

    setFormState({
      state: Form.Success,
      message: `Hooray! Thanks for signing my Guestbook.`
    });

    startTransition(() => {
      router.refresh();
    });
  }
  return (
    <>
      <form className="relative my-4 flex gap-4" onSubmit={handleSubmit}>
        <Input
          aria-label="Your message"
          placeholder="Your message..."
          name="message"
          required
          className="bg-white text-base dark:bg-gray-800"
        />
        <Button
          type="submit"
          className="whitespace-nowrap"
          variant="subtle"
          disabled={isMutating}
        >
          {isMutating ? <LoadingSpinner /> : 'Sign'}
        </Button>
      </form>
      <div className="my-2">
        {formState.state === Form.Error ? (
          <ErrorMessage>{formState.message}</ErrorMessage>
        ) : formState.state == Form.Success ? (
          <SuccessMessage>{formState.message}</SuccessMessage>
        ) : (
          <p className="text-sm text-gray-800 dark:text-gray-200">
            Your information is only used to display your name and reply by
            email.
          </p>
        )}
      </div>
    </>
  );
}

export default FormView;
