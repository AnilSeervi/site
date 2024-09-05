import BlogPostCard from 'components/BlogPostCard';
import Image from 'next/image';
import Link from 'next/link';

function HomePage() {
  return (
    <>
      <section className="mb-4 flex flex-col-reverse items-start sm:flex-row">
        <div className="flex flex-col pr-8">
          <h1 className="mb-1 text-3xl font-bold text-black dark:text-white md:text-5xl">
            Anil Seervi
          </h1>
          <h2 className="mb-4 text-gray-700 dark:text-gray-200">
            Software Development Engineer II at{' '}
            <a
              className="border-b-2 border-b-orange-400 font-semibold"
              target="_blank"
              rel="noopener noreferrer"
              href="https://www.zenduty.com"
            >
              Zenduty
            </a>
          </h2>
          <p className="text-gray-600 dark:text-gray-400">
            Desgining web with code for faster and better accessibility.
            Sometimes also does some open-sourcery stuff.
          </p>
        </div>
        <div className="relative mb-8 mr-auto w-[80px] sm:mb-0 sm:w-[176px]">
          <Image
            alt="Anil Seervi"
            height={176}
            width={176}
            src="/logo.jpeg"
            sizes="30vw"
            priority
            className="rounded-full grayscale filter"
          />
        </div>
      </section>
      <h3 className="text-2xl font-bold text-black dark:text-white md:text-4xl">
        Featured Posts
      </h3>
      <section className="flex w-full flex-col gap-6 md:flex-row">
        <BlogPostCard
          title="The Beauty of Stateless Components"
          slug="the-beauty-of-stateless-components"
          gradient="from-[#FDE68A] via-[#FCA5A5] to-[#FECACA]"
        />
        <BlogPostCard
          title="Deep cloning nested objects natively without using lodash"
          slug="deepclone-without-lodash"
          gradient="from-[#6EE7B7] via-[#3B82F6] to-[#9333EA]"
        />
        <BlogPostCard
          title="Reduce Arrays like a pro"
          slug="reduce-arrays-like-a-pro"
          gradient="from-[#D8B4FE] to-[#818CF8]"
        />
      </section>
      <Link
        href="/blog"
        className="flex h-6 items-center rounded-lg leading-7 text-gray-600 transition-all hover:text-gray-800 dark:text-gray-400 dark:hover:text-gray-200"
      >
        Read all posts
        <svg
          xmlns="http://www.w3.org/2000/svg"
          fill="none"
          viewBox="0 0 24 24"
          className="ml-1 h-6 w-6"
        >
          <path
            stroke="currentColor"
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M17.5 12h-15m11.667-4l3.333 4-3.333-4zm3.333 4l-3.333 4 3.333-4z"
          />
        </svg>
      </Link>
    </>
  );
}

export default HomePage;

//  preTitle = 'Website';
