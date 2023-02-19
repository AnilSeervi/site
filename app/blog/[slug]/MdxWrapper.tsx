'use client';

import { components } from 'components/ProseComponents';
import { MDXRemote } from 'next-mdx-remote';

function MdxWrapper({ post }) {
  return (
    <>
      <MDXRemote
        {...post.content}
        components={{
          ...components
        }}
      />
    </>
  );
}

export default MdxWrapper;
