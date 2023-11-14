import { websiteURL } from 'lib/constants';
import type { Metadata } from 'next';
import { getOG } from './og';

const ogURL = getOG({
  title: 'Anil Seervi – Developer, Designer, Open Sourcerer',
  slug: ''
});

const defaultMetadata: Metadata = {
  title: {
    default: 'Anil Seervi – Developer, Designer, Open Sourcerer',
    template: '%s | Anil Seervi'
  },
  description: 'Front-end developer, Open Source enthusiast.',
  creator: 'Anil Seervi',
  metadataBase: new URL(websiteURL),
  icons: {
    icon: '/static/favicons/favicon.svg',
    shortcut: '/static/favicons/favicon.ico',
    apple: '/static/favicons/apple-touch-icon.png',
    other: [
      {
        rel: 'mask-icon',
        url: '/static/favicons/masked-icon.svg'
        // color: '#4a9885'
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
        width: 1280,
        height: 720
      }
    ]
  },
  twitter: {
    title: 'Anil Seervi',
    description: 'Front-end developer, Open Source enthusiast.',
    card: 'summary_large_image',
    site: '@anil_seervi',
    creator: '@anil_seervi',
    images: {
      url: ogURL,
      alt: 'Anil Seervi – Developer, Designer, Open Sourcerer'
    }
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
