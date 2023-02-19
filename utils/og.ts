import { websiteURL } from 'lib/constants';

type Metadata = {
  title: string;
  preTitle?: string;
  slug: string;
  description?: string;
  image?: string;
};

export const getOG = (metadata: Metadata) => {
  const { title, preTitle, slug, description, image } = metadata;

  const searchParams = new URLSearchParams([
    ['title', title],
    ['description', description ?? ''],
    ['image', image ?? ''],
    ['url', websiteURL.replace('https://', '') + slug],
    ['preTitle', preTitle ?? '']
  ]);

  const ogURL = `${websiteURL}/api/og?${searchParams.toString()}`;
  return ogURL;
};
