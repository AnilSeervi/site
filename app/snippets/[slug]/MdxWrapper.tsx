'use client';

import { components } from 'components/ProseComponents';
import { MDXRemote } from 'next-mdx-remote';

function MdxWrapper({ snippet }) {
  return (
    <>
      <MDXRemote {...snippet.content} components={components} />
    </>
  );
}

export default MdxWrapper;
