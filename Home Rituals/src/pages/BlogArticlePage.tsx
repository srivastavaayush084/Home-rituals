import { useState, useEffect } from 'react';
import { Link, useParams } from 'react-router-dom';
import { ArrowLeft, Clock3, Sparkles } from 'lucide-react';
import { apiRequest } from '../utils/apiClient';

export function BlogArticlePage() {
  const { id } = useParams();
  const [post, setPost] = useState<any>(null);
  const [relatedPosts, setRelatedPosts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadPost() {
      if (!id) return;
      setLoading(true);
      try {
        const data = await apiRequest<any>(`/api/blogs/${id}`);
        setPost(data);

        // Fetch related posts
        const allBlogs = await apiRequest<any>('/api/blogs?limit=4');
        const blogsList = allBlogs.data || allBlogs;
        if (Array.isArray(blogsList)) {
          setRelatedPosts(blogsList.filter((item: any) => item.id !== data.id).slice(0, 3));
        }
      } catch (err) {
        console.error('Failed to load blog post', err);
      } finally {
        setLoading(false);
      }
    }
    loadPost();
  }, [id]);

  if (loading) {
    return (
      <div className="mx-auto max-w-5xl px-4 py-20 text-center text-[#666]">
        Loading article details...
      </div>
    );
  }

  if (!post) {
    return (
      <div className="mx-auto max-w-5xl px-4 py-20 text-center">
        <h1 className="text-3xl font-semibold text-[#1a1a1a]">Article not found</h1>
        <p className="mt-3 text-[#666666]">The blog post you are looking for does not exist.</p>
        <Link to="/blog" className="mt-6 inline-flex items-center gap-2 rounded-full bg-[#0B8F3C] px-5 py-3 text-sm font-semibold text-white">
          <ArrowLeft size={16} />
          Back to blog
        </Link>
      </div>
    );
  }

  // Ensure content is parsed (it could be stored as array or JSON)
  const contentArray = Array.isArray(post.contentJson)
    ? post.contentJson
    : (typeof post.contentJson === 'string'
      ? JSON.parse(post.contentJson)
      : []);

  return (
    <div className="bg-white">
      <div className="mx-auto max-w-5xl px-4 py-10 sm:px-6 lg:px-8 lg:py-16">
        <Link to="/blog" className="inline-flex items-center gap-2 text-sm font-semibold text-[#0B8F3C]">
          <ArrowLeft size={16} />
          Back to blog
        </Link>

        <div className="mt-8 overflow-hidden rounded-[28px] border border-[#e8efe7] bg-[#f8fbf8] shadow-sm">
          <img src={post.image} alt={post.title} className="h-[320px] w-full object-contain bg-[#f7faf7] p-4 sm:h-[420px] sm:p-6" />
          <div className="p-6 sm:p-8 lg:p-10">
            <div className="flex flex-wrap items-center gap-3 text-sm font-semibold uppercase tracking-[0.24em] text-[#0B8F3C]">
              <span>{post.category}</span>
              <span className="h-1.5 w-1.5 rounded-full bg-[#0B8F3C]" />
              <span className="inline-flex items-center gap-2 text-[11px] font-medium normal-case tracking-[0.1em] text-[#5f6b63]">
                <Clock3 size={14} />
                {post.readTime}
              </span>
            </div>

            <h1 className="mt-4 text-3xl font-semibold text-[#1a1a1a] sm:text-4xl" style={{ fontFamily: 'Playfair Display, serif' }}>
              {post.title}
            </h1>

            <div className="mt-4 flex flex-wrap items-center gap-3 text-sm text-[#666666]">
              <span>By {post.author}</span>
              <span>•</span>
              <span>{post.publishedAt}</span>
            </div>

            <div className="mt-8 space-y-6 text-lg leading-8 text-[#4b4b4b]">
              {contentArray.map((item: any, index: number) => {
                if (typeof item === 'string') {
                  if (item.includes('<')) {
                    if (item.startsWith('<h')) {
                      return (
                        <div
                          key={index}
                          className="markdown-heading"
                          dangerouslySetInnerHTML={{ __html: item }}
                        />
                      );
                    }
                    if (item.startsWith('<ul') || item.startsWith('<ol')) {
                      return (
                        <div
                          key={index}
                          className="markdown-list-container"
                          dangerouslySetInnerHTML={{ __html: item }}
                        />
                      );
                    }
                    return (
                      <p
                        key={index}
                        dangerouslySetInnerHTML={{ __html: item }}
                      />
                    );
                  }
                  return <p key={index}>{item}</p>;
                } else if (item && item.type === 'table') {
                  return (
                    <div
                      key={index}
                      className="markdown-table-container"
                      dangerouslySetInnerHTML={{ __html: item.html }}
                    />
                  );
                }
                return null;
              })}
            </div>

            <style>{`
              .markdown-heading {
                margin-top: 1.5rem;
                margin-bottom: 1rem;
              }

              .markdown-h1 {
                font-size: 2rem;
                font-weight: 700;
                font-family: 'Playfair Display', serif;
              }

              .markdown-h2 {
                font-size: 1.5rem;
                font-weight: 700;
                font-family: 'Playfair Display', serif;
              }

              .markdown-h3 {
                font-size: 1.25rem;
                font-weight: 700;
              }

              .markdown-h4 {
                font-size: 1.1rem;
                font-weight: 600;
              }

              .markdown-h5 {
                font-size: 1rem;
                font-weight: 600;
              }

              .markdown-h6 {
                font-size: 0.95rem;
                font-weight: 600;
              }

              .markdown-list-container {
                margin: 1.5rem 0;
              }

              .markdown-list {
                list-style-position: inside;
                line-height: 1.8;
              }

              .markdown-list li {
                margin-bottom: 0.5rem;
                margin-left: 1.5rem;
              }

              ul.markdown-list {
                list-style-type: disc;
              }

              ol.markdown-list {
                list-style-type: decimal;
              }

              .markdown-table-container {
                margin: 2rem 0;
                overflow-x: auto;
              }

              .markdown-table {
                width: 100%;
                border-collapse: collapse;
                border: 1px solid #e8efe7;
                font-size: 0.95rem;
              }

              .markdown-table thead {
                background-color: #f8fbf8;
              }

              .markdown-table th {
                padding: 12px 16px;
                text-align: left;
                font-weight: 600;
                border-bottom: 2px solid #0B8F3C;
                color: #0B8F3C;
              }

              .markdown-table td {
                padding: 12px 16px;
                border-bottom: 1px solid #e8efe7;
              }

              .markdown-table tbody tr:hover {
                background-color: #f8fbf8;
              }

              strong {
                font-weight: 600;
              }

              em {
                font-style: italic;
              }
            `}</style>

            <div className="mt-10 rounded-[20px] border border-[#e8efe7] bg-white p-5">
              <div className="flex items-center gap-2 text-sm font-semibold uppercase tracking-[0.2em] text-[#0B8F3C]">
                <Sparkles size={16} />
                Home Rituals tip
              </div>
              <p className="mt-3 text-base leading-8 text-[#4b4b4b]">
                A small, consistent routine often works better than an occasional deep clean. Keep your essentials visible, use them regularly, and let the space feel calm by design.
              </p>
            </div>
          </div>
        </div>

        <div className="mt-12">
          <h2 className="text-2xl font-semibold text-[#1a1a1a]" style={{ fontFamily: 'Playfair Display, serif' }}>
            More from the blog
          </h2>
          <div className="mt-6 grid gap-6 md:grid-cols-3">
            {relatedPosts.map((item) => (
              <Link key={item.id} to={`/blog/${item.id}`} className="overflow-hidden rounded-[20px] border border-[#e8efe7] bg-white shadow-sm transition hover:-translate-y-1 hover:shadow-md">
                <img src={item.image} alt={item.title} className="h-36 w-full object-contain bg-[#f7faf7] p-2" />
                <div className="p-4">
                  <p className="text-sm font-semibold uppercase tracking-[0.2em] text-[#0B8F3C]">{item.category}</p>
                  <h3 className="mt-2 text-lg font-semibold text-[#1a1a1a]">{item.title}</h3>
                  <p className="mt-2 text-sm text-[#666666]">{item.excerpt}</p>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

export default BlogArticlePage;
