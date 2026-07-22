import fs from 'fs';
import path from 'path';
import { PrismaClient, Role } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

function parseBlogMarkdownFile(filepath: string) {
  const content = fs.readFileSync(filepath, 'utf-8');
  const match = content.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n([\s\S]*)$/);
  const frontMatterStr = match ? match[1] : '';
  const bodyStr = (match ? match[2] : content).trim();

  const metadata: Record<string, string> = {};
  frontMatterStr.split(/\r?\n/).forEach((line: string) => {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) return;
    const sepIndex = trimmed.indexOf(':');
    if (sepIndex === -1) return;
    const key = trimmed.slice(0, sepIndex).trim();
    let val = trimmed.slice(sepIndex + 1).trim();
    val = val.replace(/^['"]|['"]$/g, '');
    metadata[key] = val;
  });

  const slug = metadata.slug || path.basename(filepath, '.md');
  const title = metadata.title || 'Untitled Blog';
  const excerpt = metadata.excerpt || '';
  const category = metadata.category || 'Laundry Care';
  const image = metadata.featuredImage || metadata.thumbnail || metadata.image || '/collection-1.svg';
  const readTime = metadata.readingTime || metadata.readTime || '5 min read';
  const author = metadata.author || 'Home Rituals Team';
  const publishedAt = metadata.date || metadata.publishedAt || 'July 2026';

  const paragraphs = bodyStr
    .split(/\r?\n\r?\n/)
    .map((p: string) => p.trim())
    .filter(Boolean);

  return {
    slug,
    title,
    excerpt,
    category,
    image,
    readTime,
    author,
    publishedAt,
    contentJson: paragraphs,
  };
}

async function main() {
  console.log('Seeding database...');

  // 1. Create Default Admin User
  const adminEmail = process.env.ADMIN_EMAIL || 'admin@homerituals.com';
  const adminPassword = process.env.ADMIN_PASSWORD || 'AdminPassword123!';
  const adminName = process.env.ADMIN_NAME || 'Home Rituals Admin';

  const existingAdmin = await prisma.user.findUnique({ where: { email: adminEmail } });
  if (!existingAdmin) {
    const passwordHash = await bcrypt.hash(adminPassword, 10);
    const admin = await prisma.user.create({
      data: {
        email: adminEmail,
        passwordHash,
        name: adminName,
        role: Role.ADMIN,
      },
    });
    console.log(`Created default Administrator: ${admin.email}`);
  } else {
    console.log(`Administrator already exists: ${adminEmail}`);
  }

  // 2. Create Categories
  const categoriesData = [
    { name: 'Washing Machine Care', description: 'Deep cleaning and maintenance for front and top load machines.', image: '/collection-1.svg' },
    { name: 'Kitchen & Surface Care', description: 'Degreasers and surface cleaners for counters, sinks, and stoves.', image: '/collection-2.svg' },
    { name: 'Bathroom Sanitation', description: 'Disinfectants and descalers for tiles, taps, and toilets.', image: '/collection-3.svg' },
    { name: 'Floor & Glass', description: 'Streak-free shining formulas for mirrors and floors.', image: '/collection-4.svg' },
    { name: 'Everyday Cleaners', description: 'Multi-purpose sprays and erasers for daily touch ups.', image: '/collection-5.svg' },
    { name: 'Sanitize & Protect', description: 'Disinfectant sprays and sanitizing agents for contact surfaces.', image: '/collection-6.svg' },
  ];

  const categories = [];
  for (const cat of categoriesData) {
    const slug = cat.name.toLowerCase().replace(/[^a-z0-9]/g, '-').replace(/-+/g, '-');
    const dbCat = await prisma.category.upsert({
      where: { slug },
      update: cat,
      create: {
        name: cat.name,
        slug,
        description: cat.description,
        image: cat.image,
      },
    });
    categories.push(dbCat);
    console.log(`Category upserted: ${dbCat.name}`);
  }

  // 3. Create Products
  const washingCat = categories.find((c) => c.name === 'Washing Machine Care')!;
  const kitchenCat = categories.find((c) => c.name === 'Kitchen & Surface Care')!;
  const everydayCat = categories.find((c) => c.name === 'Everyday Cleaners')!;

  const productsData = [
    {
      name: 'Washing Machine Cleaner',
      sku: 'WMC-01',
      description: 'Removes odor, limescale, and residue to keep every wash fresh and hygienic.',
      shortDescription: 'Our premium wash care formula is crafted to remove odor, limescale, and buildup while keeping your machine fresh and hygienic.',
      price: 349,
      originalPrice: 399,
      discountPrice: 329,
      badge: 'Best Seller',
      stock: 50,
      featured: true,
      image: '/washing-machine-cleaner.png',
      images: ['/washing-machine-cleaner.png', '/washing-machine-cleaner.png'],
      tags: ['washing-machine', 'cleaner', 'deep-clean'],
      seoTitle: 'Washing Machine Cleaner & Descaler | Home Rituals',
      seoDescription: 'Buy premium descaling powder for front and top load washing machines. Removes odor, limescale, and detergent residues.',
      ingredients: 'Organic citric acid, plant-based surfactants, sodium bicarbonate, active oxygen agents.',
      usageInstructions: 'Place one pouch in the empty drum. Run a normal tub clean cycle at 60°C or highest temperature.',
      benefits: 'Cleans hidden parts, removes bad smell, descales heating element, improves machine efficiency.',
      faqs: [
        { question: 'How often should I use this cleaner?', answer: 'Use once a month for regular maintenance or as needed for heavy buildup.' },
        { question: 'Is it safe for all washing machines?', answer: 'Yes, it is safe for most front and top load machines. Check your machine manual for any specific restrictions.' }
      ],
      categoryId: washingCat.id,
      concern: 'Odor Removal',
      collection: 'Deep Clean',
      variant: 'Deep Clean Formula',
      packSize: 'Pack of 2',
      materials: 'Natural cleaning agents and plant-based surfactants for a deep, fresh clean.',
      careInstructions: 'Store in a cool, dry place away from direct sunlight and moisture.',
      shippingReturns: 'Free shipping on orders above ₹499 and easy returns within 30 days.',
    },
    {
      name: 'Washing Machine Cleaning Pods',
      sku: 'WMP-02',
      description: 'Pre-measured pods that make deep-cleaning appliances simple and mess-free.',
      shortDescription: 'Pre-measured cleaning pods simplify maintenance, helping your washing machine stay fresh with less effort.',
      price: 299,
      originalPrice: 349,
      discountPrice: 279,
      badge: 'New',
      stock: 120,
      featured: true,
      image: '/washing-machine-cleaning-pods.png',
      images: ['/washing-machine-cleaning-pods.png', '/washing-machine-cleaning-pods.png'],
      tags: ['pods', 'washing-machine', 'cleaning-pods'],
      seoTitle: 'Washing Machine Cleaning Pods | Home Rituals',
      seoDescription: 'Eco-friendly and convenient washing machine cleaning pods. Safe for front and top loaders.',
      ingredients: 'Biodegradable surfactants, odor neutralizers, active enzymes.',
      usageInstructions: 'Toss one pod directly into the empty drum, start tub cleaning cycle.',
      benefits: 'Zero measurement required, fast acting, dissolves completely, septic safe.',
      faqs: [
        { question: 'Can I use pods for every cycle?', answer: 'No — use pods specifically for cleaning cycles as directed, not during regular laundry loads.' },
        { question: 'Are these pods biodegradable?', answer: 'Yes, they are formulated with biodegradable ingredients and packaging.' }
      ],
      categoryId: washingCat.id,
      concern: 'Convenience',
      collection: 'Deep Clean',
      variant: 'Convenience Pods',
      packSize: 'Pack of 2',
      materials: 'Plant-based cleaning agents and biodegradable packaging.',
      careInstructions: 'Keep the pouch sealed and dry until use.',
      shippingReturns: 'Complimentary shipping and a 30-day return window for unopened items.',
    },
    {
      name: 'Magic Eraser',
      sku: 'MER-03',
      description: 'Tough on everyday marks and stains while being gentle on many household surfaces.',
      shortDescription: 'Designed for everyday marks and stubborn residue, this eraser helps tidy kitchens, bathrooms, and living spaces quickly.',
      price: 149,
      originalPrice: 199,
      discountPrice: 139,
      badge: 'Popular',
      stock: 200,
      featured: false,
      image: '/magic-eraser.png',
      images: ['/magic-eraser.png'],
      tags: ['magic-eraser', 'sponge', 'stain-remover'],
      seoTitle: 'Magic Eraser Sponge - Multi-Surface Stain Remover | Home Rituals',
      seoDescription: 'Erase crayon, scuff marks, and grease from walls and appliances easily with our magic eraser sponge.',
      ingredients: 'Micro-abrasive melamine foam.',
      usageInstructions: 'Wet slightly, squeeze excess water, gently rub over stains. Wipe dry with clean cloth.',
      benefits: 'Cleans without chemical cleaners, works on walls, shoes, kitchen counters.',
      faqs: [
        { question: 'Do I need soap?', answer: 'No, just water activates the micro-structure of the sponge.' }
      ],
      categoryId: everydayCat.id,
      concern: 'Stain Removal',
      collection: 'Everyday',
      variant: 'Surface Rescue',
      packSize: 'Pack of 1',
      materials: 'Durable foam and precision cleaning texture.',
      careInstructions: 'Rinse and air dry after use to keep it ready for the next clean.',
      shippingReturns: 'Free returns for products that arrive damaged or defective.',
    },
    {
      name: 'Kitchen Cleaner',
      sku: 'KCL-04',
      description: 'Cuts through grease and food residue for cleaner counters, cabinets, and sinks.',
      shortDescription: 'A kitchen-ready cleaner that cuts through grease and food residue while keeping surfaces looking polished and fresh.',
      price: 199,
      originalPrice: 249,
      discountPrice: 189,
      badge: 'Popular',
      stock: 80,
      featured: true,
      image: '/kitchen-cleaner.png',
      images: ['/kitchen-cleaner.png'],
      tags: ['kitchen', 'surface-cleaner', 'degreaser'],
      seoTitle: 'Kitchen Cleaner Spray - Heavy Duty Degreaser | Home Rituals',
      seoDescription: 'Cuts through stubborn grease, oil, and food stains. Food-safe surface cleaner for counters, sinks, and chimneys.',
      ingredients: 'Plant-derived surfactants, citrus oil, citric acid, essential oils.',
      usageInstructions: 'Spray onto surface, let sit for 1 minute for tough grease, and wipe clean with damp microfiber cloth.',
      benefits: 'Cuts oil immediately, safe for food contact surfaces, fresh citrus aroma.',
      faqs: [
        { question: 'Is it safe for marble?', answer: 'Yes, it is pH-balanced and safe for sealed marble surfaces.' }
      ],
      categoryId: kitchenCat.id,
      concern: 'Grease Removal',
      collection: 'Kitchen',
      variant: 'Kitchen Shine',
      packSize: 'Pack of 2',
      materials: 'Effective cleaning agents formulated for modern kitchen care.',
      careInstructions: 'Store the bottle upright and keep it tightly sealed between uses.',
      shippingReturns: 'Free shipping and easy exchanges for your convenience.',
    },
  ];

  for (const prod of productsData) {
    const slug = prod.name.toLowerCase().replace(/[^a-z0-9]/g, '-').replace(/-+/g, '-');
    await prisma.product.upsert({
      where: { sku: prod.sku },
      update: { ...prod, slug },
      create: { ...prod, slug },
    });
    console.log(`Product upserted: ${prod.name} (SKU: ${prod.sku})`);
  }

  // 4. Create Blogs (Dynamically load all markdown blogs from frontend content/blogs)
  const blogsDir = path.resolve(__dirname, '../../Home Rituals/src/content/blogs');
  const blogsData: any[] = [];

  if (fs.existsSync(blogsDir)) {
    const files = fs.readdirSync(blogsDir).filter((f: string) => f.endsWith('.md'));
    for (const file of files) {
      const parsed = parseBlogMarkdownFile(path.join(blogsDir, file));
      if (parsed) {
        blogsData.push(parsed);
      }
    }
  }

  // Delete old stale blog posts with placeholder SVGs
  await prisma.blogPost.deleteMany({
    where: {
      image: { in: ['/collection-1.svg', '/collection-5.svg', '/blog-1.svg'] },
    },
  });

  for (const blog of blogsData) {
    await prisma.blogPost.upsert({
      where: { slug: blog.slug },
      update: blog,
      create: blog,
    });
    console.log(`Blog upserted: ${blog.title} (${blog.slug})`);
  }

  // 5. Create Banners
  const bannersData = [
    {
      title: 'Flat 47% OFF On All Products — Limited Time Offer',
      imageUrl: '/banner-flat-47-off.jpg',
      linkUrl: '/shop',
      active: true,
    },
    {
      title: 'Stay Tuned! More Offers & Deals Coming Soon',
      imageUrl: '/banner-stay-tuned.jpg',
      linkUrl: '/shop',
      active: true,
    },
  ];

  for (const banner of bannersData) {
    const existing = await prisma.banner.findFirst({
      where: { title: banner.title },
    });
    if (!existing) {
      await prisma.banner.create({ data: banner });
      console.log(`Banner created: ${banner.title}`);
    }
  }

  // 6. Create Reviews
  const firstProduct = await prisma.product.findFirst({ where: { sku: 'WMC-01' } });
  if (firstProduct) {
    const reviewsData = [
      { author: 'Aarohi', title: 'Great for deep cleaning', text: 'The washing machine cleaner removed odors and left everything smelling fresh again.', rating: 5, isApproved: true, verifiedPurchase: true },
      { author: 'Nisha', title: 'Reliable and easy to use', text: 'The pods are so simple to use and the results are consistent every time.', rating: 5, isApproved: true, verifiedPurchase: true },
      { author: 'Raghav', title: 'Excellent kitchen cleaner', text: 'It cuts through grease quickly and makes the whole kitchen feel cleaner.', rating: 5, isApproved: true, verifiedPurchase: true },
      { author: 'Meera', title: 'Worth every rupee', text: 'These products are affordable, effective, and make cleaning much less stressful.', rating: 5, isApproved: true, verifiedPurchase: true },
      { author: 'Jai', title: 'Fresh and hygienic', text: 'The disinfectant gives me confidence that high-touch areas are properly cleaned.', rating: 5, isApproved: true, verifiedPurchase: true },
      { author: 'Kavya', title: 'Perfect for daily use', text: 'I use the cleaner across the kitchen and bathroom without any hassle.', rating: 5, isApproved: true, verifiedPurchase: true },
      { author: 'Sana', title: 'Easy on effort', text: 'The products are practical and work well for quick, regular household cleaning.', rating: 5, isApproved: true, verifiedPurchase: true },
      { author: 'Dev', title: 'Loved the results', text: 'The floor and glass cleaners leave surfaces spotless and shining.', rating: 5, isApproved: true, verifiedPurchase: true },
      { author: 'Pari', title: 'A real help at home', text: 'They make routine cleaning feel faster and more manageable.', rating: 5, isApproved: true, verifiedPurchase: true },
      { author: 'Rahul', title: 'Great range', text: 'There is a product for almost every cleaning need in the house.', rating: 5, isApproved: true, verifiedPurchase: true },
    ];

    for (const rev of reviewsData) {
      const existing = await prisma.review.findFirst({
        where: { author: rev.author, title: rev.title, productId: firstProduct.id },
      });
      if (!existing) {
        await prisma.review.create({
          data: { ...rev, productId: firstProduct.id },
        });
        console.log(`Review created from ${rev.author}`);
      }
    }
  }

  console.log('Seeding completed successfully!');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
