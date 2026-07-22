import { Button } from '../components/ui/Button';

export function NotFoundPage() {
  return (
    <div className="mx-auto flex min-h-[70vh] max-w-4xl items-center justify-center px-4 py-12 sm:px-6 lg:px-8 lg:py-16">
      <div className="rounded-[36px] border border-black/5 bg-white p-10 text-center shadow-sm">
        <p className="text-sm uppercase tracking-[0.35em] text-black">404</p>
        <h1 className="mt-3 text-4xl font-semibold text-[#242424]" style={{ fontFamily: 'Playfair Display, serif' }}>This page has wandered off.</h1>
        <p className="mt-4 text-lg leading-8 text-[#6f6f6f]">The ritual you’re looking for doesn’t exist here. Head back home and begin again.</p>
        <div className="mt-8 flex justify-center gap-4">
          <Button to="/">Back home</Button>
          <Button to="/shop" variant="secondary">Browse products</Button>
        </div>
      </div>
    </div>
  );
}

