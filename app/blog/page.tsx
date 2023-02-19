import SearchInput from 'app/blog/SearchInput';
import { indexQuery } from 'lib/queries';
import { getClient } from 'lib/sanity-server';
import { Post } from 'lib/types';

async function BlogIndex({ preview = false }) {
  let posts: Post[] = [];
  try {
    posts = await getClient(preview).fetch(indexQuery);
  } catch (e) {
    console.log(e);
  }

  return (
    <>
      <h1 className="text-3xl font-bold text-black dark:text-white md:text-5xl">
        /blog
      </h1>
      <p className="text-gray-600 dark:text-gray-400">
        {`I recently started writing online, mostly about Web development and JS.
            In total, I've written ${posts.length} articles on my blog.`}
      </p>
      <SearchInput posts={posts} />
      {/* {!searchValue && (
          <>
            <h3 className="mt-8 mb-4 text-2xl font-bold tracking-tight text-black md:text-4xl dark:text-white">
              Most Popular
            </h3>
            <BlogPost
              title="Rust Is The Future of JavaScript Infrastructure"
              excerpt="Why is Rust being used to replace parts of the JavaScript web ecosystem like minification (Terser), transpilation (Babel), formatting (Prettier), bundling (webpack), linting (ESLint), and more?"
              slug="rust"
            />
            <BlogPost
              title="Everything I Know About Style Guides, Design Systems, and Component Libraries"
              excerpt="A deep-dive on everything I've learned in the past year building style guides, design systems, component libraries, and their best practices."
              slug="style-guides-component-libraries-design-systems"
            />
            <BlogPost
              title="Building a Design System Monorepo with Turborepo"
              excerpt="Manage multiple packages with a shared build, test, and release process using Turborepo, Changesets, Storybook, and more."
              slug="turborepo-design-system-monorepo"
            />
          </>
        )} */}
    </>
  );
}

export default BlogIndex;

// title={`Blog – ${siteTitle}`}
// description="Thoughts on the software industry, programming, tech, videography, music, and my personal life."
// preTitle="Check out this Blog"
// image="unsplash/photo-1519337265831-281ec6cc8514"
// ogTitle="Priceless insights, ideas, and experiences for your dev work"
