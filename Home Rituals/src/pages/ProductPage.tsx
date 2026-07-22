import { useState, useEffect } from 'react';
import { ArrowRight, Heart, Minus, Plus, Star } from 'lucide-react';
import { useParams } from 'react-router-dom';
import { Button } from '../components/ui/Button';
import { Card } from '../components/ui/Card';
import { ImageZoom } from '../components/ui/ImageZoom';
import { ProductCard } from '../components/ui/ProductCard';
import { useApp } from '../context/AppContext';
import { apiRequest } from '../utils/apiClient';

export function ProductPage() {
  const { id } = useParams();
  const { products, addToCart, toggleWishlist, wishlistIds } = useApp();
  
  const [product, setProduct] = useState<any>(null);
  const [quantity, setQuantity] = useState(1);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadProduct() {
      if (!id) return;
      setLoading(true);
      try {
        const data = await apiRequest<any>(`/api/products/${id}`);
        setProduct(data);
      } catch (err) {
        console.warn('Failed to load product from API, falling back to local state', err);
        // Fallback: search in local context state
        const localProd = products.find((item) => String(item.id) === String(id) || item.slug === id);
        if (localProd) {
          setProduct(localProd);
        }
      } finally {
        setLoading(false);
      }
    }
    loadProduct();
  }, [id, products]);

  const handleIncrement = () => setQuantity((q) => q + 1);
  const handleDecrement = () => setQuantity((q) => Math.max(1, q - 1));

  if (loading) {
    return (
      <div className="mx-auto max-w-7xl px-4 py-20 text-center text-[#6f6f6f]">
        Loading product details...
      </div>
    );
  }

  if (!product) {
    return (
      <div className="mx-auto max-w-7xl px-4 py-20 text-center text-[#6f6f6f]">
        Product not found
      </div>
    );
  }

  const relatedProducts = products.filter((item) => item.id !== product.id).slice(0, 4);

  return (
    <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8 lg:py-16">
      <div className="grid gap-10 lg:grid-cols-[1.05fr_0.95fr]">
        <div className="space-y-4">
          <ImageZoom src={product.image} alt={product.name} className="h-[480px] w-full object-contain shadow-sm bg-white" />
          <div className="grid grid-cols-3 gap-4">
            {[product.image, ...(product.images || [])].slice(0, 3).map((image, index) => (
              <img key={index} src={image} alt={`${product.name} ${index + 1}`} className="h-28 w-full rounded-[20px] object-contain bg-white border border-black/5" />
            ))}
          </div>
        </div>

        <div>
          <p className="text-sm uppercase tracking-[0.35em] text-[#0B8F3C] font-semibold">{product.category?.name || product.category}</p>
          <h1 className="mt-3 text-4xl font-semibold text-[#242424]" style={{ fontFamily: 'Playfair Display, serif' }}>{product.name}</h1>
          <p className="mt-4 text-lg leading-8 text-[#6f6f6f]">{product.description}</p>
          <div className="mt-5 flex items-center gap-2 text-[#D7A86E]">
            {Array.from({ length: 5 }).map((_, index) => <Star key={index} size={16} fill="currentColor" />)}
            <span className="ml-2 text-sm text-[#6f6f6f]">{product.reviewsCount ?? product.reviews} reviews</span>
          </div>
          <div className="mt-6 flex items-end gap-4">
            <p className="text-3xl font-semibold text-black">₹{product.price}</p>
            {product.originalPrice ? <p className="text-lg text-[#8a8a8a] line-through">₹{product.originalPrice}</p> : null}
          </div>
          <div className="mt-6 rounded-[24px] border border-black/5 bg-[#EFE9DF] p-5 text-sm text-[#5f5f5f]">
            Complimentary refill pouch • Free express shipping • 30-day returns
          </div>
          <div className="mt-6 flex flex-wrap items-center gap-4">
            <div className="flex items-center rounded-full border border-black/5 bg-white px-3 py-2 shadow-sm">
              <button className="p-2" onClick={handleDecrement}><Minus size={16} /></button>
              <span className="px-4 text-sm font-semibold">{quantity}</span>
              <button className="p-2" onClick={handleIncrement}><Plus size={16} /></button>
            </div>
            <Button icon={<ArrowRight size={16} />} onClick={() => addToCart(product, quantity)}>Add to cart</Button>
            <button onClick={() => toggleWishlist(product.id)} className={`rounded-full p-3 ${wishlistIds.includes(product.id) ? 'bg-[#44D62C] text-white' : 'bg-[#EFE9DF] text-black'}`}><Heart size={16} /></button>
          </div>

          <div className="mt-10 grid gap-4 md:grid-cols-3">
            {[
              { title: 'Ingredients', content: product.ingredients || 'Thoughtfully crafted for clean, everyday rituals.' },
              { title: 'Instructions', content: product.usageInstructions || 'Simple application formulas.' },
              { title: 'Benefits', content: product.benefits || 'Botanical, chemical free and highly effective.' }
            ].map((section) => (
              <Card key={section.title} className="p-4">
                <p className="text-sm font-semibold text-black">{section.title}</p>
                <p className="mt-2 text-xs leading-5 text-[#6f6f6f]">{section.content}</p>
              </Card>
            ))}
          </div>
        </div>
      </div>

      <section className="mt-16">
        <div className="mb-8">
          <p className="text-sm uppercase tracking-[0.35em] text-black">Related products</p>
          <h2 className="mt-2 text-3xl font-semibold text-[#242424]" style={{ fontFamily: 'Playfair Display, serif' }}>You may also love</h2>
        </div>
        <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-4">
          {relatedProducts.map((item) => (
            <ProductCard
              key={item.id}
              product={item}
              isWishlisted={wishlistIds.includes(item.id)}
              onToggleWishlist={toggleWishlist}
              onAddToCart={addToCart}
            />
          ))}
        </div>
      </section>
    </div>
  );
}

export default ProductPage;
