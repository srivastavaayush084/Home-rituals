import { Link } from 'react-router-dom';
import type { BlogPost } from '../../data/content';

type Props = { post: BlogPost };

export function BlogCard({ post }: Props) {
  return (
    <Link to={`/blog/${post.id}`} className="group transform overflow-hidden rounded-[16px] border border-[#e8efe7] bg-white shadow-sm transition hover:-translate-y-1 hover:shadow-md">
      <img src={post.image} alt={post.title} className="h-44 w-full object-contain bg-[#f7faf7] p-2 transition duration-300 group-hover:scale-105" />
      <div className="p-4">
        <div className="flex items-center justify-between">
          <span className="text-sm font-semibold uppercase text-[#0B8F3C]">{post.category}</span>
          <span className="text-sm text-[#9aa09a]">{post.readTime ?? '4 min read'}</span>
        </div>
        <h3 className="mt-3 text-lg font-semibold text-[#1a1a1a]">{post.title}</h3>
        <p className="mt-2 text-sm text-[#666666]">{post.excerpt}</p>
        <div className="mt-4 flex items-center justify-between">
          <div className="text-sm text-[#666666]">By {post.author} • {post.publishedAt}</div>
          <span className="rounded-full bg-[#0B8F3C] px-4 py-2 text-sm font-semibold text-white transition group-hover:bg-[#16A34A]">Read More</span>
        </div>
      </div>
    </Link>
  );
}

export default BlogCard;
