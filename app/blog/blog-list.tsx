import BlogPost from 'components/BlogPost';
import { Suspense } from 'react';

function BlogList({ filteredBlogPosts }) {
  return (
    <>
      <Suspense fallback={null}>
        <h3 className="text-2xl font-bold text-black dark:text-white md:text-4xl">
          All Posts
        </h3>
        {!filteredBlogPosts.length && (
          <p className="text-gray-600 dark:text-gray-400">No posts found.</p>
        )}
        {filteredBlogPosts.map((post) => (
          <BlogPost
            date={post.date}
            key={post.slug}
            slug={post.slug}
            title={post.title}
            excerpt={post.excerpt}
          />
        ))}
      </Suspense>
    </>
  );
}

export default BlogList;
