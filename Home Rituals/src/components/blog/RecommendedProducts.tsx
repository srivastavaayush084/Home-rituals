import { products } from '../../data/content';

type Props = { category?: string };

export function RecommendedProducts({ category }: Props) {
  const related = products.filter((p) => {
    if (!category) return true;
    const catName = typeof p.category === 'object' && p.category ? (p.category as any).name : String(p.category || '');
    return catName.toLowerCase().includes(category.toLowerCase());
  }).slice(0, 4);

  return (
    <div className="space-y-3">
      <h4 className="text-lg font-semibold text-[#1a1a1a]">Recommended Products</h4>
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        {related.map((p) => (
          <div key={p.id} className="rounded-[8px] border border-[#e8efe7] bg-white p-3 text-center shadow-2xs">
            <img src={p.image} alt={p.name} className="mx-auto h-20 w-20 object-cover rounded-[6px]" />
            <div className="mt-2 text-sm font-semibold text-[#1a1a1a] truncate">{p.name}</div>
            <div className="mt-1 text-xs text-[#666666]">₹{p.price}</div>
            <button className="mt-3 inline-flex items-center gap-1.5 rounded-[6px] bg-[#0B8F3C] px-3 py-1.5 text-xs font-semibold text-white shadow-2xs hover:bg-[#097b33] transition">Add to Cart</button>
          </div>
        ))}
      </div>
    </div>
  );
}

export default RecommendedProducts;
