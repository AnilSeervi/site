import type { ReactNode } from 'react';

function MdxWrapper({ post }: { post: { content: ReactNode } }) {
  return <>{post.content}</>;
}

export default MdxWrapper;
