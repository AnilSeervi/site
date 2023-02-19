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
  robots: {
    index: true,
    follow: true
  },
  twitter: {
    title: 'Anil Seervi',
    card: 'summary_large_image'
  },
  openGraph: {
    title: 'Anil Seervi – Developer, Designer, Open Sourcerer',
    description: 'Front-end developer, Open Source enthusiast.',
    images: [
      {
        url: ogURL,
        width: 1920,
        height: 1080
      }
    ]
  },
  locale: 'en_US',
  type: 'website',
  url: 'https://anil.vercel.app',
  siteName: 'Anil Seervi',
  other: {
    'google-site-verification': 'eZSdmzAXlLkKhNJzfgwDqWORghxnJ8qR9_CHdAh5-xw',
    robots: 'max-snippet:-1, max-image-preview:large, max-video-preview:-1'
  }
};

export default defaultMetadata;
