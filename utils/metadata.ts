import { getOG } from './og';

const ogURL = getOG({
  title: 'Anil Seervi – Developer, Designer, Open Sourcerer',
  slug: ''
});

const defaultMetadata = {
  title: {
    default: 'Anil Seervi – Developer, Designer, Open Sourcerer',
    template: '%s | Anil Seervi'
  },
  description: 'Front-end developer, Open Source enthusiast.',
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: 'white' },
    { media: '(prefers-color-scheme: dark)', color: 'black' }
  ],
  creator: 'Anil Seervi',
  icons: {
    icon: '/static/favicons/favicon.svg',
    shorcut: '/static/favicons/favicon.ico',
    apple: '/static/favicons/apple-touch-icon.png',
    other: [
      {
        rel: 'mask-icon',
        url: '/static/favicons/masked-icon.svg',
        color: '#4a9885'
      },
      {
        rel: 'alternate icon',
        url: '/static/favicons/favicon_32x32.png'
      }
    ]
  },
  manifest: '/static/favicons/site.webmanifest',
  openGraph: {
    title: 'Anil Seervi – Developer, Designer, Open Sourcerer',
    description: 'Front-end developer, Open Source enthusiast.',
    locale: 'en_US',
    type: 'website',
    url: 'https://anil.vercel.app',
    siteName: 'Anil Seervi',
    images: [
      {
        url: ogURL,
        width: 1920,
        height: 1080
      }
    ]
  },
  twitter: {
    title: 'Anil Seervi',
    card: 'summary_large_image',
    site: '@anil_seervi',
    creator: '@anil_seervi'
  },
  robots: {
    index: true,
    follow: true,
    nocache: true,
    googleBot: {
      index: true,
      follow: true,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1
    }
  },
  verification: {
    google: 'AlcrbE7Ls7GlEZia-k9tF8tL7qG_aEsm9gwXOGJXwXU'
  },
  other: {
    'msapplication-config': '/static/favicons/browserconfig.xml'
  }
};

export default defaultMetadata;
