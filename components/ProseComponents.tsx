import Link from 'next/link';
import type { ImageProps } from 'next/image';
import clsx from 'clsx';
import { BlurImage } from './BlurImage';
import Step from './Step';
import Error from './Error';

export const LINK_STYLES = `text-gray-900/80 dark:text-gray-100/80 underline decoration-gray-900/30 dark:decoration-gray-200/30 underline-offset-2 transition-all hover:text-gray-900 hover:dark:text-gray-100 hover:dark:decoration-gray-100/50 hover:decoration-gray-900/50`;
export const FOCUS_VISIBLE_OUTLINE = `focus:outline-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/70`;

export const components = {
  h1: (props: any) => (
    <h2
      className="relative mt-3 border-t-2 border-gray-700/5 pt-9 text-xl font-medium dark:border-gray-200/5 sm:text-3xl"
      {...props}
    />
  ),
  h2: (props: any) => (
    <h3
      className="relative mt-3 border-t-2 border-gray-700/5 pt-9 text-xl font-medium dark:border-gray-200/5 sm:text-2xl"
      {...props}
    />
  ),
  h3: (props: any) => <h4 className="text-xl font-medium" {...props} />,
  h4: (props: any) => <h5 className="text-lg font-medium" {...props} />,
  hr: (props: any) => (
    <hr
      className="relative border-t-2 border-gray-700/5 pt-9 dark:border-gray-200/5 sm:pt-10"
      {...props}
    />
  ),
  a: ({ href = '', ...props }) => {
    const isExternal = href.startsWith('http');

    if (isExternal) {
      return (
        <a
          className={clsx(LINK_STYLES, FOCUS_VISIBLE_OUTLINE)}
          href={href}
          target="_blank"
          rel="noopener noreferrer"
          {...props}
        />
      );
    }

    if (href.startsWith('#')) {
      return (
        <a
          className={clsx(LINK_STYLES, FOCUS_VISIBLE_OUTLINE)}
          href={href}
          {...props}
        />
      );
    }

    return (
      <Link
        href={`${href}`}
        className={clsx(LINK_STYLES, FOCUS_VISIBLE_OUTLINE)}
        {...props}
      />
    );
  },
  ul: (props: any) => (
    <ul
      className="space-y-3 [&>li]:relative [&>li]:pl-7 before:[&>li]:absolute before:[&>li]:left-1 before:[&>li]:top-3 before:[&>li]:h-1.5 before:[&>li]:w-1.5 before:[&>li]:rounded-full before:[&>li]:bg-rose-100/20 [li>&]:mt-3"
      {...props}
    />
  ),
  ol: (props: any) => (
    <ol className="list-decimal space-y-3 pl-10" {...props} />
  ),
  strong: (props: any) => <strong className="font-semibold" {...props} />,
  Img: ({
    children,
    bleed,
    caption,
    ...props
  }: {
    children: React.ReactNode;
    bleed?: boolean;
    caption?: string;
  } & ImageProps) => {
    return (
      <>
        <div
          className={clsx({
            'xl:!col-start-2 xl:!col-end-4': bleed === true
          })}
        >
          <BlurImage {...props} />
        </div>
        {caption ? (
          <div className="mt-2 text-sm italic text-rose-100/60">{caption}</div>
        ) : null}
      </>
    );
  },
  blockquote: (props: any) => (
    <span className="relative xl:!col-start-2 xl:!col-end-3">
      <blockquote
        className="relative border-l-2 border-gray-700/10 pl-4 text-lg italic dark:border-gray-200/10 xl:absolute xl:left-0 xl:right-0 xl:top-0"
        {...props}
      />
    </span>
  ),
  del: (props: any) => (
    <del
      className="text-gray-900/70 line-through dark:text-gray-100/70"
      {...props}
    />
  ),
  Step: (props: any) => <Step {...props} />,
  Error: Error
};
