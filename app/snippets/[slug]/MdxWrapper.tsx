import type { ReactNode } from 'react';

function MdxWrapper({ snippet }: { snippet: { content: ReactNode } }) {
  return <>{snippet.content}</>;
}

export default MdxWrapper;
