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
  icons: {
    shorcut: '/static/favicons/favicon.ico'
  },
  description: 'Front-end developer, Open Source enthusiast.',
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
  }
};

export default defaultMetadata;
