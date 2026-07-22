
export function Hero() {
  return (
    <section className="w-full bg-white">
      <div className="mx-auto max-w-[1280px] px-4 py-12 sm:py-16">
        <div className="rounded-[18px] bg-gradient-to-br from-[#F6FFF6] to-[#F0FFF2] p-8 shadow-sm">
          <div className="max-w-4xl">
            <span className="inline-block rounded-full bg-[#E8F7EE] px-3 py-1 text-sm font-semibold text-[#0B8F3C]">📖 Home Rituals Blog</span>
            <h1 className="mt-4 text-3xl font-semibold text-[#1a1a1a] sm:text-4xl">Cleaning Tips, Home Care & Eco-Friendly Living</h1>
            <p className="mt-3 max-w-2xl text-lg text-[#666666]">Discover expert cleaning guides, home maintenance tips, product tutorials, and sustainable living ideas to help keep your home cleaner, healthier, and happier.</p>

            <div className="mt-6 flex flex-wrap gap-3">
              <a href="#articles" className="inline-flex items-center gap-2 rounded-full bg-[#0B8F3C] px-5 py-3 text-sm font-semibold text-white shadow transition hover:bg-[#16A34A]">Explore Articles</a>
              <a href="/shop" className="inline-flex items-center gap-2 rounded-full border border-[#e6f7ea] bg-white px-5 py-3 text-sm font-semibold text-[#0B8F3C] shadow-sm transition hover:shadow-md">Shop Cleaning Products</a>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

export default Hero;
