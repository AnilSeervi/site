import { type Options } from 'rehype-pretty-code';
import { visit } from 'unist-util-visit';
import { JetBrains_Mono } from 'next/font/google';

const jetBrainsMono = JetBrains_Mono({
  weight: '400',
  display: 'swap',
  variable: '--font-jetbrains-mono',
  subsets: ['latin']
});

// div.BLOCK > pre.PRE > code.CODE
const BLOCK =
  'overflow-hidden font-normal rounded-lg bg-gray-200/40 dark:bg-stone-900/20 shadow-surface-elevation-low ring-1 ring-rose-100/[3%] ring-inset';
const TITLE =
  'mb-0.5 rounded-md bg-gray-100/10 dark:bg-rose-100/10 px-3 py-1 font-mono text-xs dark:text-rose-100/70 text-gray-700 shadow-sm ' +
  jetBrainsMono.variable;
const PRE =
  'overflow-x-auto py-2 text-[13px] leading-6 [color-scheme:dark] bg-transparent m-0 px-0 ' +
  jetBrainsMono.variable;
const CODE =
  'grid [&>span]:border-l-4 [&>span]:border-l-transparent [&>span]:pl-2 [&>span]:pr-3';
const INLINE_BLOCK =
  'whitespace-nowrap font-normal border border-gray-200 dark:border-gray-800 px-1 py-[0.075rem] rounded-lg text-gray-800 dark:text-gray-200 bg-gray-200/50 dark:bg-stone-900/20';
const INLINE_CODE = '';
const NUMBERED_LINES =
  '[counter-reset:line] before:[&>span]:mr-3 before:[&>span]:inline-block before:[&>span]:w-4 before:[&>span]:text-right before:[&>span]:text-black/20 before:[&>span]:dark:text-white/20 before:[&>span]:![content:counter(line)] before:[&>span]:[counter-increment:line]';
const HIGHLIGHTED_LINE =
  '!border-l-rose-300/70 bg-rose-300/10 dark:bg-rose-200/10 before:!text-black/70 before:dark:!text-white/70';

export function rehypePrettyCodeClasses() {
  return (tree: any) => {
    visit(
      tree,
      (node: any) =>
        Boolean(
          node.tagName === 'code' &&
            Object.keys(node.properties).length === 0 &&
            node.children.some((n: any) => n.type === 'text')
        ),
      (node: any) => {
        const textNode = node.children.find((n: any) => n.type === 'text');
        textNode.type = 'element';
        textNode.tagName = 'code';
        textNode.properties = { className: [INLINE_CODE] };
        textNode.children = [{ type: 'text', value: textNode.value }];
        node.properties.className = [INLINE_BLOCK];
        node.tagName = 'span';
      }
    );

    visit(
      tree,
      (node: any) =>
        Boolean(
          typeof node?.properties?.['data-rehype-pretty-code-fragment'] !==
            'undefined'
        ),
      (node: any) => {
        if (node.tagName === 'span') {
          node.properties.className = [
            ...(node.properties.className || []),
            INLINE_BLOCK
          ];
          node.children[0].properties.className = [
            ...(node.children[0].properties.className || []),
            INLINE_CODE
          ];

          return node;
        }

        if (node.tagName === 'div') {
          node.properties.className = [
            ...(node.properties.className || []),
            BLOCK
          ];
          node.children = node.children.map((node: any) => {
            if (
              node.tagName === 'div' &&
              typeof node.properties?.['data-rehype-pretty-code-title'] !==
                'undefined'
            ) {
              node.properties.className = [
                ...(node.properties.className || []),
                TITLE
              ];
            }
            if (node.tagName === 'pre') {
              node.properties.className = [PRE];
              if (node.children[0].tagName === 'code') {
                node.children[0].properties.className = [
                  ...(node.children[0].properties.className || []),
                  CODE
                ];
                if (
                  typeof node.children[0].properties['data-line-numbers'] !==
                  'undefined'
                ) {
                  node.children[0].properties.className.push(NUMBERED_LINES);
                }
              }
            }

            return node;
          });

          return node;
        }
      }
    );
  };
}

export const rehypePrettyCodeOptions: Partial<Options> = {
  theme: {
    dark: 'vitesse-dark',
    light: 'vitesse-light'
  },
  onVisitLine(node) {
    // Prevent lines from collapsing in `display: grid` mode, and
    // allow empty lines to be copy/pasted
    if (node.children.length === 0) {
      node.children = [{ type: 'text', value: ' ' }];
    }
    node.properties.className = [''];
  },
  onVisitHighlightedLine(node) {
    node.properties.className.push(HIGHLIGHTED_LINE);
  }
};
