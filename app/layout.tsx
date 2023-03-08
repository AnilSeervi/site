import '../styles/global.css';
import { Karla } from '@next/font/google';
import Header from 'components/Header';
import globalMetadata from 'utils/metadata';
import ProviderTheme from 'components/ProviderTheme';
import Footer from 'components/Footer';
import AnalyticsWrapper from 'components/AnalyticsWrapper';
import IncrementView from 'components/IncrementView';

import type { Metadata } from 'next';

const karla = Karla({ variable: '--font-karla', display: 'swap' });

export const metadata: Metadata = globalMetadata;

function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={karla.variable}>
      <head prefix="og:http//ogp.me/ns#"></head>
      <body className="bg-gray-50 text-white antialiased dark:bg-gray-900 dark:text-black">
        <ProviderTheme>
          <Header />
          <main
            id="skip"
            className="relative mb-8 grid grid-cols-[1fr,min(672px,100%),1fr] gap-y-8 px-4 text-base text-black dark:text-white xl:grid-cols-[1fr,minmax(auto,240px),min(672px,100%),minmax(auto,240px),1fr] xl:gap-x-9 xl:px-0 [&>*]:col-start-2 xl:[&>*]:col-start-3"
          >
            {children}
          </main>
          <Footer />
        </ProviderTheme>
        <AnalyticsWrapper />
        <IncrementView />
      </body>
    </html>
  );
}

export default RootLayout;
