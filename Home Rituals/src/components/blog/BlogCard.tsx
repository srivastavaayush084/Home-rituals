import { Link } from 'react-router-dom';
import type { BlogPost } from '../../data/content';

type Props = { post: BlogPost };

export function BlogCard({ post }: Props) {
  return (
    <Link to={`/blog/${post.id}`} className="group transform overflow-hidden rounded-[8px] border border-[#e8efe7] bg-white shadow-xs transition hover:-translate-y-1 hover:shadow-sm">
      <img src={post.image} alt={post.title} className="h-44 w-full object-contain bg-[#f7faf7] p-2 transition duration-300 group-hover:scale-105" />
      <div className="p-4">
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold uppercase tracking-wider text-[#0B8F3C]">{post.category}</span>
          <span className="text-xs text-[#9aa09a]">{post.readTime ?? '4 min read'}</span>
        </div>
        <h3 className="mt-2 text-base font-semibold text-[#1a1a1a] line-clamp-2">{post.title}</h3>
        <p className="mt-2 text-xs text-[#666666] line-clamp-2">{post.excerpt}</p>
        <div className="mt-4 flex items-center justify-between pt-2 border-t border-stone-100">
          <div className="text-xs text-[#666666]">By {post.author} • {post.publishedAt}</div>
          <span className="rounded-[6px] bg-[#0B8F3C] px-3.5 py-1.5 text-xs font-semibold text-white shadow-2xs transition group-hover:bg-[#16A34A]">Read More</span>
        </div>
      </div>
    </Link>
  );
}

export default BlogCard;
