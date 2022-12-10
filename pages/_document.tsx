import { Html, Head, Main, NextScript } from 'next/document';

export default function Document(props) {
  return (
    <Html lang="en">
      <Head prefix="og: http://ogp.me/ns#">
        {/* <link
          rel="preload"
          href="/fonts/ibm-plex-sans-var.woff2"
          as="font"
          type="font/woff2"
          crossOrigin="anonymous"
        />
        <link
          rel="preload"
          href="/fonts/iosevka-regular.woff2"
          as="font"
          type="font/woff2"
          crossOrigin="anonymous"
        /> */}
        <link
          color="#4a9885"
          href="/static/favicons/masked-icon.svg"
          rel="mask-icon"
        />
        <link
          rel="alternate icon"
          href="/static/favicons/favicon_32x32.png"
          type="image/png"
        />
        <link
          rel="icon"
          type="image/svg+xml"
          href="/static/favicons/favicon.svg"
        />
        <link href="/static/favicons/favicon.ico" rel="shortcut icon" />
        <link href="/static/favicons/site.webmanifest" rel="manifest" />
        <link
          href="/static/favicons/apple-touch-icon.png"
          rel="apple-touch-icon"
          sizes="180x180"
        />
        <meta content="#ffffff" name="theme-color" />
        <meta content="#ffffff" name="msapplication-TileColor" />
        <meta
          content="/static/favicons/browserconfig.xml"
          name="msapplication-config"
        />
        <meta content="14d2e73487fa6c71" name="yandex-verification" />
        <meta
          content="eZSdmzAXlLkKhNJzfgwDqWORghxnJ8qR9_CHdAh5-xw"
          name="google-site-verification"
        />
        <meta
          content="max-snippet:-1, max-image-preview:large, max-video-preview:-1"
          name="robots"
        />
      </Head>
      <body className="bg-gray-50 text-white antialiased dark:bg-gray-900 dark:text-black">
        <svg
          className="pointer-events-none fixed isolate z-50 opacity-60 mix-blend-soft-light"
          width="100%"
          height="100%"
        >
          <filter id="pedroduarteisalegend">
            <feTurbulence
              type="fractalNoise"
              baseFrequency="0.80"
              numOctaves="4"
              stitchTiles="stitch"
            />
          </filter>
          <rect
            width="100%"
            height="100%"
            filter="url(#pedroduarteisalegend)"
          ></rect>
        </svg>
        <Main />
        <NextScript />
      </body>
    </Html>
  );
}
