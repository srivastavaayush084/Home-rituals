import { useState, useEffect } from 'react';
import { apiRequest } from '../utils/apiClient';
import Hero from '../components/blog/Hero';
import FeaturedArticle from '../components/blog/FeaturedArticle';
import BlogCard from '../components/blog/BlogCard';
import Newsletter from '../components/blog/Newsletter';

export function BlogPage() {
  const [blogs, setBlogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadBlogs() {
      try {
        const response = await apiRequest<any>('/api/blogs?limit=50');
        if (Array.isArray(response)) {
          setBlogs(response);
        } else if (response && Array.isArray(response.data)) {
          setBlogs(response.data);
        } else if (response && Array.isArray(response.items)) {
          setBlogs(response.items);
        }
      } catch (err) {
        console.warn('Failed to load blogs from API', err);
      } finally {
        setLoading(false);
      }
    }
    loadBlogs();
  }, []);

  const featuredPost = blogs.length > 0 ? blogs[0] : null;

  return (
    <div className="w-full bg-white">
      <Hero />

      <main className="mx-auto max-w-[1280px] px-4 py-10" id="articles">
        <div className="mb-6" />

        {loading ? (
          <div className="py-20 text-center text-[#666]">Loading articles...</div>
        ) : (
          <div className="space-y-8">
            {featuredPost && <FeaturedArticle post={featuredPost} />}

            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {blogs.map((post) => (
                <BlogCard key={post.id} post={post} />
              ))}
            </div>

            <div className="mt-8">
              <Newsletter />
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

export default BlogPage;
