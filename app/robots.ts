import { websiteURL } from 'lib/constants';

export default function robots() {
  return {
    rules: [
      {
        userAgent: '*'
      }
    ],
    sitemap: `${websiteURL}/sitemap.xml`,
    host: websiteURL
  };
}
