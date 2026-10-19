import { Link } from 'react-router-dom';
import type { BlogPost } from '../../data/content';

type Props = { post: BlogPost };

export function FeaturedArticle({ post }: Props) {
  return (
    <Link to={`/blog/${post.id}`} className="grid gap-6 overflow-hidden rounded-[8px] border border-stone-200/80 bg-white p-0 shadow-xs sm:grid-cols-2">
      <img src={post.image} alt={post.title} className="h-64 w-full object-cover sm:h-auto" />
      <div className="p-6">
        <div className="text-xs uppercase tracking-[0.2em] font-semibold text-[#0B8F3C]">{post.category} • {post.readTime ?? '5 min read'}</div>
        <h2 className="mt-3 text-2xl font-semibold text-[#1a1a1a]" style={{ fontFamily: 'Playfair Display, serif' }}>{post.title}</h2>
        <p className="mt-4 text-sm text-[#666666] leading-relaxed">{post.excerpt}</p>
        <div className="mt-6 flex items-center gap-4 text-xs text-[#666666]">
          <div>By {post.author}</div>
          <div>•</div>
          <div>{post.publishedAt}</div>
        </div>
        <div className="mt-6">
          <span className="inline-flex items-center gap-2 rounded-[6px] bg-[#0B8F3C] px-4 py-2 text-xs font-semibold uppercase tracking-wider text-white shadow-xs transition hover:bg-[#16A34A]">Read More</span>
        </div>
      </div>
    </Link>
  );
}

export default FeaturedArticle;
