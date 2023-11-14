import { Analytics } from '@vercel/analytics/react';
import Footer from 'components/Footer';
import IncrementView from 'components/IncrementView';
import ProviderTheme from 'components/ProviderTheme';
import type { Metadata, Viewport } from 'next';
import { Karla } from 'next/font/google';
import globalMetadata from 'utils/metadata';
import '../styles/global.css';
import DockBottom from './DockBottom';

const karla = Karla({
  variable: '--font-karla',
  display: 'swap',
  subsets: ['latin']
});

export const viewport :Viewport = {
  themeColor:[
    { media: '(prefers-color-scheme: light)', color: 'white' },
    { media: '(prefers-color-scheme: dark)', color: 'black' }
  ]
}
export const metadata: Metadata = globalMetadata;

function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={karla.variable}>
      <head prefix="og:http//ogp.me/ns#"></head>
      <body className="bg-gray-50 text-black antialiased dark:bg-gray-900 dark:text-white">
        <ProviderTheme>
          <DockBottom />
          <main
            id="skip"
            className="relative mb-8 grid grid-cols-[1fr,min(672px,100%),1fr] gap-y-8 px-4 pt-32 text-base text-black dark:text-white xl:grid-cols-[1fr,minmax(auto,240px),min(672px,100%),minmax(auto,240px),1fr] xl:gap-x-9 xl:px-0 [&>*]:col-start-2 xl:[&>*]:col-start-3"
          >
            {children}
          </main>
          <Footer />
        </ProviderTheme>
        <Analytics />
        <IncrementView />
      </body>
    </html>
  );
}

export default RootLayout;
