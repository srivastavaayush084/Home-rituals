import { Link } from 'react-router-dom';
import type { BlogPost } from '../../data/content';

type Props = { post: BlogPost };

export function FeaturedArticle({ post }: Props) {
  return (
    <Link to={`/blog/${post.id}`} className="grid gap-6 overflow-hidden rounded-[18px] bg-white p-0 shadow-sm sm:grid-cols-2">
      <img src={post.image} alt={post.title} className="h-64 w-full object-cover sm:h-auto" />
      <div className="p-6">
        <div className="text-sm uppercase tracking-[0.2em] text-[#0B8F3C]">{post.category} • {post.readTime ?? '5 min read'}</div>
        <h2 className="mt-3 text-2xl font-semibold text-[#1a1a1a]">{post.title}</h2>
        <p className="mt-4 text-sm text-[#666666]">{post.excerpt}</p>
        <div className="mt-6 flex items-center gap-4">
          <div className="text-sm text-[#666666]">By {post.author}</div>
          <div className="text-sm text-[#666666]">{post.publishedAt}</div>
        </div>
        <div className="mt-6">
          <span className="inline-flex items-center gap-2 rounded-full bg-[#0B8F3C] px-5 py-3 text-sm font-semibold text-white transition hover:bg-[#16A34A]">Read More</span>
        </div>
      </div>
    </Link>
  );
}

export default FeaturedArticle;
