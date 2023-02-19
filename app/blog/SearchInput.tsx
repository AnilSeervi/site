'use client';

import { Input } from 'components/ui/Input';
import { useState } from 'react';
import BlogList from './blog-list';

function SearchInput({ posts }) {
  const [searchValue, setSearchValue] = useState('');
  const filteredBlogPosts = posts.filter((post) =>
    post.title.toLowerCase().includes(searchValue.toLowerCase())
  );
  return (
    <>
      <div className="relative w-full">
        <Input
          placeholder="Search articles"
          aria-label="Search articles"
          type="text"
          onChange={(e) => setSearchValue(e.target.value)}
          className="bg-white dark:bg-gray-800"
        />
        <svg
          className="absolute right-3 top-3 h-4 w-4 text-gray-400 dark:text-gray-300"
          xmlns="http://www.w3.org/2000/svg"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
          />
        </svg>
      </div>
      <BlogList filteredBlogPosts={filteredBlogPosts} />
    </>
  );
}

export default SearchInput;
