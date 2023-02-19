'use client';

import NextLink from 'next/link';
import MobileMenu from 'components/MobileMenu';
import clsx from 'clsx';
import { usePathname } from 'next/navigation';
import Changetheme from './Changetheme';

function Header() {
  const slug = usePathname();

  return (
    <header className="flex flex-col justify-center px-4 xl:px-0">
      <nav className="relative mx-auto flex w-full max-w-2xl items-center justify-between border-gray-200 bg-gray-50 bg-opacity-60 pt-8 pb-8  text-gray-900 dark:border-gray-700  dark:bg-gray-900 dark:text-gray-100 sm:pb-16">
        <a href="#skip" className="skip-nav">
          Skip to content
        </a>
        <div className="ml-[-0.60rem]">
          <MobileMenu />
          <NavItem path={slug} href="/" text="Home" />
          <NavItem path={slug} href="/guestbook" text="Guestbook" />
          <NavItem path={slug} href="/projects" text="Projects" />
          <NavItem path={slug} href="/blog" text="Blog" />
          <NavItem path={slug} href="/snippets" text="Snippets" />
        </div>
        <Changetheme />
      </nav>
    </header>
  );
}

export default Header;

function NavItem({
  href,
  text,
  path
}: {
  href: string;
  text: string;
  path: string;
}) {
  const isActive = path === href;

  return (
    <NextLink
      href={href}
      className={clsx(
        isActive
          ? 'font-semibold text-gray-800 dark:text-gray-200'
          : 'font-normal text-gray-600 dark:text-gray-400',
        'hidden rounded-lg p-1 transition-all hover:bg-gray-200 dark:hover:bg-gray-800 sm:px-3 sm:py-2 md:inline-block'
      )}
    >
      <span className="capsize">{text}</span>
    </NextLink>
  );
}
