import { products } from '../../data/content';

type Props = { category?: string };

export function RecommendedProducts({ category }: Props) {
  const related = products.filter((p) => category ? p.category.toLowerCase().includes(category.toLowerCase()) : true).slice(0, 4);

  return (
    <div className="space-y-3">
      <h4 className="text-lg font-semibold text-[#1a1a1a]">Recommended Products</h4>
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        {related.map((p) => (
          <div key={p.id} className="rounded-[12px] border border-[#e8efe7] bg-white p-3 text-center">
            <img src={p.image} alt={p.name} className="mx-auto h-20 w-20 object-cover" />
            <div className="mt-2 text-sm font-semibold text-[#1a1a1a]">{p.name}</div>
            <div className="mt-1 text-sm text-[#666666]">₹{p.price}</div>
            <button className="mt-3 inline-flex items-center gap-2 rounded-full bg-[#0B8F3C] px-3 py-2 text-sm font-semibold text-white">Add to Cart</button>
          </div>
        ))}
      </div>
    </div>
  );
}

export default RecommendedProducts;
