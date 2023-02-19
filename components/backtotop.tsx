'use client';

function Backtotop() {
  return (
    <span
      className="cursor-pointer transition-colors hover:text-gray-900 hover:dark:text-gray-100 xl:hidden"
      onClick={() => window.scrollTo({ top: 0 })}
    >
      Back to top
    </span>
  );
}

export default Backtotop;
