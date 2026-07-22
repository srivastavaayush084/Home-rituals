import { blogPosts } from '../../data/content';

type Props = { categories: string[] };

export function Sidebar({ categories }: Props) {
  const trending = blogPosts.slice(0, 4);

  return (
    <aside className="space-y-6">
      <div className="rounded-[12px] border border-[#e8efe7] bg-white p-4 shadow-sm">
        <h4 className="text-sm font-semibold text-[#1a1a1a]">Trending Articles</h4>
        <ul className="mt-3 space-y-3">
          {trending.map((t) => (
            <li key={t.id} className="flex items-center gap-3">
              <img src={t.image} alt={t.title} className="h-12 w-12 rounded object-cover" />
              <div className="flex-1 text-sm">
                <div className="font-medium text-[#1a1a1a]">{t.title}</div>
                <div className="text-xs text-[#9aa09a]">{t.readTime ?? '4 min read'}</div>
              </div>
            </li>
          ))}
        </ul>
      </div>

      <div className="rounded-[12px] border border-[#e8efe7] bg-white p-4 shadow-sm">
        <h4 className="text-sm font-semibold text-[#1a1a1a]">Categories</h4>
        <ul className="mt-3 space-y-2 text-sm text-[#666666]">
          {categories.map((c) => (
            <li key={c} className="flex items-center justify-between">
              <span>{c}</span>
              <span className="text-[#9aa09a]">{Math.floor(Math.random() * 20) + 1}</span>
            </li>
          ))}
        </ul>
      </div>
    </aside>
  );
}

export default Sidebar;
