import { Card } from '../components/ui/Card';

const values = ['Powerful cleaning performance', 'Easy daily use', 'Affordable home hygiene essentials', 'Reliable results for every room'];
const timeline = [
  { year: '2019', title: 'Founded in Bombay', text: 'A small team focused on making homes cleaner, fresher, and easier to care for.' },
  { year: '2021', title: 'Cleaning essentials launch', text: 'We introduced practical products for laundry, kitchens, surfaces, and sanitation.' },
  { year: '2024', title: 'Expanded the Home Rituals range', text: 'Our collection now covers washing machine care, kitchen cleaners, magic erasers, and more.' },
];

export function AboutPage() {
  return (
    <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8 lg:py-16">
      <div className="grid gap-10 lg:grid-cols-[0.95fr_1.05fr]">
        <div>
          <p className="text-sm uppercase tracking-[0.35em] text-black">About</p>
          <h1 className="mt-2 text-4xl font-semibold text-[#242424]" style={{ fontFamily: 'Playfair Display, serif' }}>A trusted home hygiene brand for everyday cleaning.</h1>
          <p className="mt-5 text-lg leading-8 text-[#6f6f6f]">Home Rituals is dedicated to making every home cleaner, healthier, and more hygienic with reliable cleaning and sanitation solutions that simplify daily routines.</p>
        </div>
        <div className="flex items-center justify-center">
          <img
            src="/logo.png"
            alt="Home Rituals logo"
            className="h-64 w-64 rounded-full object-contain bg-white border-4 border-black/5 shadow-xl"
          />
        </div>
      </div>

      <div className="mt-16 grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        {values.map((value) => (
          <Card key={value} className="p-6">
            <p className="text-lg font-semibold text-[#242424]">{value}</p>
          </Card>
        ))}
      </div>

      <div className="mt-16 grid gap-8 lg:grid-cols-[1fr_0.95fr]">
        <div className="rounded-[32px] border border-black/5 bg-[#EFE9DF] p-8">
          <p className="text-sm uppercase tracking-[0.35em] text-black">Mission</p>
          <h2 className="mt-3 text-3xl font-semibold text-[#242424]" style={{ fontFamily: 'Playfair Display, serif' }}>To make everyday cleaning simpler, stronger, and more dependable.</h2>
          <p className="mt-4 text-lg leading-8 text-[#5f5f5f]">Our mission is to provide easy-to-use, affordable, and effective solutions that help households remove dirt, stains, odors, and harmful bacteria with confidence.</p>
        </div>
        <div className="rounded-[32px] border border-black/5 bg-white p-8 shadow-sm">
          <p className="text-sm uppercase tracking-[0.35em] text-black">Sustainability</p>
          <p className="mt-4 text-lg leading-8 text-[#6f6f6f]">We focus on practical products that help keep homes fresh and hygienic while supporting a more conscious, less wasteful way of living.</p>
        </div>
      </div>

      <div className="mt-16">
        <p className="text-sm uppercase tracking-[0.35em] text-black">Our story</p>
        <div className="mt-6 grid gap-6 md:grid-cols-3">
          {timeline.map((item) => (
            <Card key={item.year} className="p-6">
              <p className="text-sm font-semibold uppercase tracking-[0.25em] text-[#D7A86E]">{item.year}</p>
              <h3 className="mt-3 text-xl font-semibold text-[#242424]">{item.title}</h3>
              <p className="mt-3 text-sm leading-7 text-[#6f6f6f]">{item.text}</p>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
}

