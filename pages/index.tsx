import { Suspense } from 'react';
import Image from 'next/image';
import Link from 'next/link';

import Container from '../components/Container';
import BlogPostCard from '../components/BlogPostCard';
import Subscribe from '../components/Subscribe';
// import VideoCard from '../components/VideoCard';

export default function Home() {
  return (
    <Suspense fallback={null}>
      <Container
        title="Anil Seervi – Developer, Designer, Open Sourcerer"
        preTitle="Website"
      >
        <section className="mb-4 flex flex-col-reverse items-start sm:flex-row">
          <div className="flex flex-col pr-8">
            <h1 className="mb-1 text-3xl font-bold text-black dark:text-white md:text-5xl">
              Anil Seervi
            </h1>
            <h2 className="mb-4 text-gray-700 dark:text-gray-200">
              Software Development Engineer at{' '}
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
            title="Reduce Arrays like a pro"
            slug="reduce-arrays-like-a-pro"
            gradient="from-[#D8B4FE] to-[#818CF8]"
          />
          <BlogPostCard
            title="Higher Order Array functions forEach, map and filter"
            slug="hof-map-filter-foreach"
            gradient="from-[#FDE68A] via-[#FCA5A5] to-[#FECACA]"
          />
          <BlogPostCard
            title="Understanding Higher Order Functions in JavaScript"
            slug="hof-in-js"
            gradient="from-[#6EE7B7] via-[#3B82F6] to-[#9333EA]"
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
        {/* <h3 className="font-bold text-2xl md:text-4xl tracking-tight mb-4 mt-16 text-black dark:text-white">
            Learn React & Next.js
          </h3>
          <p className="text-gray-600 dark:text-gray-400 mb-4">
            Build and deploy a modern SaaS application using the most popular
            open-source software. This course is 12 hours long and is completely
            live streamed.
          </p>
          <VideoCard
            index="01"
            href="https://www.youtube.com/watch?v=MxR5I5_hOKk&list=PL6bwFJ82M6FXgctyoWXqj7H0GK8_YIeF1&index=2"
            length="1:02:45"
            title="Introduction to React 2025"
          />
          <VideoCard
            index="02"
            href="https://www.youtube.com/watch?v=AGl52moyISU&list=PL6bwFJ82M6FXgctyoWXqj7H0GK8_YIeF1&index=3"
            length="54:22"
            title="Firestore, Chakra UI, Absolute Imports"
          />
          <VideoCard
            index="03"
            href="https://www.youtube.com/watch?v=3g6-v3_BNbM&list=PL6bwFJ82M6FXgctyoWXqj7H0GK8_YIeF1&index=4"
            length="1:08:30"
            title="Designing & Building the Dashboard"
          />
          <VideoCard
            index="04"
            href="https://www.youtube.com/watch?v=u8iv_yhSRI8&list=PL6bwFJ82M6FXgctyoWXqj7H0GK8_YIeF1&index=5"
            length="1:13:45"
            title="Firebase Admin with Next.js + SWR"
          />
          <a
            target="_blank"
            rel="noopener noreferrer"
            href="https://www.youtube.com/playlist?list=PL6bwFJ82M6FXgctyoWXqj7H0GK8_YIeF1"
            className="flex mt-8 text-gray-600 dark:text-gray-400 leading-7 rounded-lg hover:text-gray-800 dark:hover:text-gray-200 transition-all h-6"
          >
            Watch all videos
            <svg
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
              className="h-6 w-6 ml-1"
            >
              <path
                stroke="currentColor"
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M17.5 12h-15m11.667-4l3.333 4-3.333-4zm3.333 4l-3.333 4 3.333-4z"
              />
            </svg>
          </a> */}
        <Subscribe />
      </Container>
    </Suspense>
  );
}
