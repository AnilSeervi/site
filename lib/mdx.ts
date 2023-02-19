import { serialize } from 'next-mdx-remote/serialize';
import readingTime from 'reading-time';
import remarkGfm from 'remark-gfm';
import rehypeSlug from 'rehype-slug';
import rehypeAutolinkHeadings from 'rehype-autolink-headings';
import rehypePrettyCode from 'rehype-pretty-code';
import {
  rehypePrettyCodeOptions,
  rehypePrettyCodeClasses
} from './rehypePrettyCode';
import rehypeTOC from 'rehype-toc';
import { HEADING_LINK_ANCHOR } from './constants';

const TOCHeading = {
  type: 'element',
  tagName: 'div',
  properties: {
    className: 'uppercase mb-2 text-gray-900/60 dark:text-gray-100/60'
  },
  children: [
    {
      type: 'text',
      value: 'On this Page'
    }
  ]
};

const TOCBackToTop = [
  {
    type: 'element',
    tagName: 'div',
    properties: {
      className: 'border-b border-gray-900/10 dark:border-gray-100/10 my-2'
    },
    children: []
  },
  {
    type: 'element',
    tagName: 'div',
    properties: {
      className: 'text-right'
    },
    children: [
      {
        type: 'element',
        tagName: 'a',
        properties: {
          className:
            'text-sm text-gray-900/60 dark:text-gray-100/60 transition-all hover:text-gray-900 hover:dark:text-gray-100',
          href: '#skip'
        },
        children: [
          {
            type: 'text',
            value: 'Back to Top'
          }
        ]
      }
    ]
  }
];

export async function mdxToHtml(source) {
  const mdxSource = await serialize(source, {
    mdxOptions: {
      remarkPlugins: [[remarkGfm]],
      rehypePlugins: [
        rehypeSlug,
        [rehypePrettyCode, rehypePrettyCodeOptions],
        [rehypePrettyCodeClasses],
        [
          rehypeTOC,
          {
            headings: ['h2', 'h3', 'h4'],
            cssClasses: {
              toc: 'sticky top-20 hidden h-0 xl:!col-start-4 xl:row-start-3 xl:block [&>ol]:pl-0',
              list: 'space-y-0 list-none pl-4',
              listItem: 'list-none !mt-1',
              link: `block text-gray-700/90 dark:text-gray-200/80 hover:underline decoration-gray-700/30 dark:decoration-gray-200/30 underline-offset-2 transition-all hover:text-gray-700 hover:dark:text-gray-200 hover:dark:decoration-gray-200/50 hover:decoration-gray-700/50`
            },
            customizeTOC: (toc) => {
              const tocWithHeading = {
                ...toc,
                children: [TOCHeading, ...toc.children, ...TOCBackToTop]
              };
              return tocWithHeading;
            }
          }
        ],
        [
          rehypeAutolinkHeadings,
          {
            behavior: 'wrap',
            properties: {
              className: [HEADING_LINK_ANCHOR]
            }
          }
        ]
      ],
      format: 'mdx'
    }
  });

  return {
    html: mdxSource,
    wordCount: source.split(/\s+/gu).length,
    readingTime: readingTime(source).text
  };
}
