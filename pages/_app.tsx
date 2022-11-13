import 'styles/global.css';

import { ThemeProvider } from 'next-themes';
import { SessionProvider } from 'next-auth/react';
import { Karla } from '@next/font/google';
import { Analytics } from '@vercel/analytics/react';
import clsx from 'clsx';

const karlaVariable = Karla({ variable: '--font-karla', display: 'swap' });

export default function App({
  Component,
  pageProps: { session, ...pageProps }
}) {
  return (
    <SessionProvider session={session}>
      <ThemeProvider attribute="class">
        <div className={clsx(karlaVariable.variable, karlaVariable.className)}>
          <Component {...pageProps} />
        </div>
        <Analytics />
      </ThemeProvider>
    </SessionProvider>
  );
}
