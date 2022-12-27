import Link from 'next/link';
import Image from 'next/image';
import { components } from './ProseComponents';

import ProsCard from 'components/ProsCard';
import ConsCard from 'components/ConsCard';
import Step from 'components/Step';
import ImageWithTheme from 'components/ImageWithTheme';
import Aside from 'components/Aside';

function RoundedImage(props: any) {
  return <Image alt={props.alt} className="rounded-lg" {...props} />;
}

function Callout(props: { emoji: string; children: React.ReactNode }) {
  return (
    <div className="my-8 flex rounded-lg bg-gray-200 p-4 dark:bg-gray-800">
      <div className="mr-4 flex w-4 items-center">{props.emoji}</div>
      <div className="callout w-full">{props.children}</div>
    </div>
  );
}

const MDXComponents = {
  Image: RoundedImage,
  ImageWithTheme,
  Callout,
  ConsCard,
  ProsCard,
  Aside,
  Step,
  ...components
};

export default MDXComponents;
