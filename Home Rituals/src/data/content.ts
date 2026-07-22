export interface Product {
  id: number;
  name: string;
  slug?: string;
  description: string;
  price: number;
  originalPrice?: number;
  badge?: string;
  rating: number;
  reviews: number;
  image: string;
  images?: string[];
  category: string;
  concern: string;
  collection: string;
  variant?: string;
  packSize?: string;
  stockStatus?: string;
  features?: string[];
  highlights?: string[];
  shortDescription?: string;
  materials?: string;
  howToUse?: string;
  careInstructions?: string;
  shippingReturns?: string;
  faqs?: { question: string; answer: string }[];
}

export interface Review {
  id: number;
  author: string;
  title: string;
  text: string;
  rating: number;
}

export interface BlogPost {
  id: number;
  slug: string;
  title: string;
  excerpt: string;
  category: string;
  image: string;
  readTime: string;
  author: string;
  publishedAt: string;
  content: (string | { type: 'table'; html: string })[];
}

const blogMarkdownFiles = import.meta.glob('../content/blogs/*.md', { eager: true, query: '?raw', import: 'default' }) as Record<string, string>;

function parseTable(tableText: string): string {
  const lines = tableText.trim().split('\n');
  if (lines.length < 2) return '';

  const headerRow = lines[0].split('|').map(cell => cell.trim()).filter(Boolean);
  const rows = lines.slice(2).map(line => 
    line.split('|').map(cell => cell.trim()).filter(Boolean)
  ).filter(row => row.length > 0);

  let html = '<table class="markdown-table"><thead><tr>';
  headerRow.forEach(header => {
    html += `<th>${header}</th>`;
  });
  html += '</tr></thead><tbody>';

  rows.forEach(row => {
    html += '<tr>';
    row.forEach(cell => {
      html += `<td>${cell}</td>`;
    });
    html += '</tr>';
  });

  html += '</tbody></table>';
  return html;
}

function parseMarkdownContent(body: string): (string | { type: 'table'; html: string })[] {
  const content: (string | { type: 'table'; html: string })[] = [];
  const lines = body.split('\n');
  let i = 0;

  while (i < lines.length) {
    const line = lines[i];

    // Skip empty lines
    if (!line.trim()) {
      i++;
      continue;
    }

    // Skip horizontal rules (---, ***, ___)
    if (line.trim().match(/^[-*_]{3,}$/)) {
      i++;
      continue;
    }

    // Check for table
    if (line.includes('|')) {
      const tableLines = [line];
      i++;
      while (i < lines.length && lines[i].includes('|')) {
        tableLines.push(lines[i]);
        i++;
      }
      const tableHtml = parseTable(tableLines.join('\n'));
      if (tableHtml) {
        content.push({ type: 'table', html: tableHtml });
      }
      continue;
    }

    // Check for heading
    const headingMatch = line.match(/^(#{1,6})\s+(.+)$/);
    if (headingMatch) {
      const level = headingMatch[1].length;
      const text = headingMatch[2];
      content.push(`<h${level} class="markdown-heading markdown-h${level}">${text}</h${level}>`);
      i++;
      continue;
    }

    // Check for blockquote
    if (line.match(/^\s*>/)) {
      const quoteLines = [];
      while (i < lines.length && lines[i].match(/^\s*>/)) {
        quoteLines.push(lines[i].replace(/^\s*>\s?/, '').trim());
        i++;
      }
      let quoteText = quoteLines.join(' ');
      quoteText = quoteText.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
      quoteText = quoteText.replace(/\*(.*?)\*/g, '<em>$1</em>');
      content.push(`<blockquote class="markdown-blockquote">${quoteText}</blockquote>`);
      continue;
    }

    // Check for unordered list
    if (line.match(/^\s*[-*+]\s+/)) {
      const listItems = [];
      while (i < lines.length && lines[i].match(/^\s*[-*+]\s+/)) {
        const item = lines[i].replace(/^\s*[-*+]\s+/, '').trim();
        listItems.push(item);
        i++;
      }
      const listHtml = '<ul class="markdown-list">' + listItems.map(item => `<li>${item}</li>`).join('') + '</ul>';
      content.push(listHtml);
      continue;
    }

    // Check for ordered list
    if (line.match(/^\s*\d+\.\s+/)) {
      const listItems = [];
      while (i < lines.length && lines[i].match(/^\s*\d+\.\s+/)) {
        const item = lines[i].replace(/^\s*\d+\.\s+/, '').trim();
        listItems.push(item);
        i++;
      }
      const listHtml = '<ol class="markdown-list">' + listItems.map(item => `<li>${item}</li>`).join('') + '</ol>';
      content.push(listHtml);
      continue;
    }

    // Collect paragraph lines (any line that doesn't match a block-level element)
    const paragraphLines = [];
    while (i < lines.length && lines[i].trim() && !lines[i].match(/^(#{1,6}\s|>|\s*[-*+]\s|\s*\d+\.\s|\s*\|)|^[-*_]{3,}$/)) {
      paragraphLines.push(lines[i].trim());
      i++;
    }

    if (paragraphLines.length > 0) {
      let text = paragraphLines.join(' ');
      // Apply inline formatting
      text = text.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
      text = text.replace(/\*(.*?)\*/g, '<em>$1</em>');
      text = text.replace(/__(.*?)__/g, '<strong>$1</strong>');
      text = text.replace(/_(.*?)_/g, '<em>$1</em>');
      content.push(text);
    } else {
      // Safety: skip any unhandled line to prevent infinite loop
      i++;
    }
  }

  return content.length > 0 ? content : ['A new blog post is ready to be shared.'];
}

function parseBlogMarkdownFile(source: string): BlogPost {
  const match = source.match(/^---\s*([\s\S]*?)\s*---\s*([\s\S]*)$/);
  const frontMatter = match?.[1] ?? '';
  const body = (match?.[2] ?? source).trim();

  const metadata: Partial<BlogPost> = {};

  frontMatter.split(/\r?\n/).forEach((line) => {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) return;

    const separatorIndex = trimmed.indexOf(':');
    if (separatorIndex === -1) return;

    const key = trimmed.slice(0, separatorIndex).trim();
    const value = trimmed.slice(separatorIndex + 1).trim();

    switch (key) {
      case 'id':
        metadata.id = Number(value);
        break;
      case 'slug':
        metadata.slug = value;
        break;
      case 'title':
        metadata.title = value.replace(/^['"]|['"]$/g, '');
        break;
      case 'excerpt':
        metadata.excerpt = value.replace(/^['"]|['"]$/g, '');
        break;
      case 'category':
        metadata.category = value.replace(/^['"]|['"]$/g, '');
        break;
      case 'image':
      case 'featuredImage':
      case 'thumbnail':
        if (!metadata.image) {
          metadata.image = value.replace(/^['"]|['"]$/g, '');
        }
        break;
      case 'readTime':
        metadata.readTime = value.replace(/^['"]|['"]$/g, '');
        break;
      case 'author':
        metadata.author = value.replace(/^['"]|['"]$/g, '');
        break;
      case 'publishedAt':
        metadata.publishedAt = value.replace(/^['"]|['"]$/g, '');
        break;
      default:
        break;
    }
  });

  const parsedContent = parseMarkdownContent(body);

  return {
    id: metadata.id ?? Date.now(),
    slug: metadata.slug ?? 'blog-post',
    title: metadata.title ?? 'Untitled blog',
    excerpt: metadata.excerpt ?? (typeof parsedContent[0] === 'string' ? parsedContent[0] : 'A new blog post from Home Rituals.'),
    category: metadata.category ?? 'Home Care',
    image: metadata.image ?? '/blog-1.svg',
    readTime: metadata.readTime ?? '4 min read',
    author: metadata.author ?? 'Home Rituals Team',
    publishedAt: metadata.publishedAt ?? 'Just now',
    content: parsedContent,
  };
}

const markdownBlogPosts = Object.values(blogMarkdownFiles).map(parseBlogMarkdownFile);

export const products: Product[] = [
  { id: 1, name: 'Washing Machine Cleaner', description: 'Removes odor, limescale, and residue to keep every wash fresh and hygienic.', price: 349, originalPrice: 399, badge: 'Best Seller', rating: 4.9, reviews: 124, image: '/washing-machine-cleaner.png', images: ['/washing-machine-cleaner.png', '/washing-machine-cleaner.png', '/washing-machine-cleaner.png', '/washing-machine-cleaner.png'], category: 'Washing Machine Care', concern: 'Odor Removal', collection: 'Deep Clean', variant: 'Deep Clean Formula', packSize: 'Pack of 2', stockStatus: 'In Stock', features: ['Made from natural wood pulp', 'Food Grade', 'Chemical Free', 'Heat Resistant', 'Greaseproof', 'Microwave Safe', 'Oven Safe', 'Perfect for Wrapping Food'], highlights: ['Eco Friendly', 'Plastic Free', 'Recyclable', 'Food Safe', 'Premium Quality'], shortDescription: 'Our premium wash care formula is crafted to remove odor, limescale, and buildup while keeping your machine fresh and hygienic.', materials: 'Natural cleaning agents and plant-based surfactants for a deep, fresh clean.', howToUse: 'Place the cleaner in the drum and run a hot cycle with no laundry for the full recommended duration.', careInstructions: 'Store in a cool, dry place away from direct sunlight and moisture.', shippingReturns: 'Free shipping on orders above ₹499 and easy returns within 30 days.', faqs: [ { question: 'How often should I use this cleaner?', answer: 'Use once a month for regular maintenance or as needed for heavy buildup.' }, { question: 'Is it safe for all washing machines?', answer: 'Yes, it is safe for most front and top load machines. Check your machine manual for any specific restrictions.' } ] },
  { id: 2, name: 'Washing Machine Cleaning Pods', description: 'Pre-measured pods that make deep-cleaning appliances simple and mess-free.', price: 299, originalPrice: 349, badge: 'New', rating: 4.8, reviews: 88, image: '/washing-machine-cleaning-pods.png', images: ['/washing-machine-cleaning-pods.png', '/washing-machine-cleaning-pods.png', '/washing-machine-cleaning-pods.png', '/washing-machine-cleaning-pods.png'], category: 'Washing Machine Care', concern: 'Convenience', collection: 'Deep Clean', variant: 'Convenience Pods', packSize: 'Pack of 2', stockStatus: 'In Stock', features: ['Convenient single-use pods', 'No mess, no measuring', 'Freshens and cleans', 'Safe for regular use'], highlights: ['Easy to Use', 'Fast Acting', 'Odor Free', 'Premium Quality'], shortDescription: 'Pre-measured cleaning pods simplify maintenance, helping your washing machine stay fresh with less effort.', materials: 'Plant-based cleaning agents and biodegradable packaging.', howToUse: 'Drop one pod into the drum and run a cleaning cycle without laundry.', careInstructions: 'Keep the pouch sealed and dry until use.', shippingReturns: 'Complimentary shipping and a 30-day return window for unopened items.', faqs: [ { question: 'Can I use pods for every cycle?', answer: 'No — use pods specifically for cleaning cycles as directed, not during regular laundry loads.' }, { question: 'Are these pods biodegradable?', answer: 'Yes, they are formulated with biodegradable ingredients and packaging.' } ] },
  { id: 3, name: 'Magic Eraser', description: 'Tough on everyday marks and stains while being gentle on many household surfaces.', price: 149, rating: 4.7, reviews: 70, image: '/magic-eraser.png', images: ['/magic-eraser.png', '/magic-eraser.png', '/magic-eraser.png', '/magic-eraser.png'], category: 'Multi-Purpose Cleaning', concern: 'Stain Removal', collection: 'Everyday', variant: 'Surface Rescue', packSize: 'Pack of 1', stockStatus: 'In Stock', features: ['Powerful stain removal', 'Gentle on many surfaces', 'Reusable and practical', 'Daily household essential'], highlights: ['Eco Friendly', 'Easy to Use', 'Premium Quality', 'Highly Effective'], shortDescription: 'Designed for everyday marks and stubborn residue, this eraser helps tidy kitchens, bathrooms, and living spaces quickly.', materials: 'Durable foam and precision cleaning texture.', howToUse: 'Moisten lightly and wipe over marks before rinsing the surface.', careInstructions: 'Rinse and air dry after use to keep it ready for the next clean.', shippingReturns: 'Free returns for products that arrive damaged or defective.' },
  
];

export const reviews: Review[] = [
  { id: 1, author: 'Aarohi', title: 'Great for deep cleaning', text: 'The washing machine cleaner removed odors and left everything smelling fresh again.', rating: 5 },
  { id: 2, author: 'Nisha', title: 'Reliable and easy to use', text: 'The pods are so simple to use and the results are consistent every time.', rating: 5 },
  { id: 3, author: 'Raghav', title: 'Excellent kitchen cleaner', text: 'It cuts through grease quickly and makes the whole kitchen feel cleaner.', rating: 5 },
  { id: 4, author: 'Meera', title: 'Worth every rupee', text: 'These products are affordable, effective, and make cleaning much less stressful.', rating: 5 },
  { id: 5, author: 'Jai', title: 'Fresh and hygienic', text: 'The disinfectant gives me confidence that high-touch areas are properly cleaned.', rating: 5 },
  { id: 6, author: 'Kavya', title: 'Perfect for daily use', text: 'I use the cleaner across the kitchen and bathroom without any hassle.', rating: 5 },
  { id: 7, author: 'Sana', title: 'Easy on effort', text: 'The products are practical and work well for quick, regular household cleaning.', rating: 5 },
  { id: 8, author: 'Dev', title: 'Loved the results', text: 'The floor and glass cleaners leave surfaces spotless and shining.', rating: 5 },
  { id: 9, author: 'Pari', title: 'A real help at home', text: 'They make routine cleaning feel faster and more manageable.', rating: 5 },
  { id: 10, author: 'Rahul', title: 'Great range', text: 'There is a product for almost every cleaning need in the house.', rating: 5 },
];

export const blogPosts: BlogPost[] = markdownBlogPosts;

export const collections = [
  { id: 1, name: 'Deep Clean Essentials', description: 'Washing machine care and odor-fighting solutions for every laundry day.', image: '/collection-1.svg' },
  { id: 2, name: 'Kitchen & Surface Care', description: 'Powerful formulas that tackle grease, grime, and everyday mess.', image: '/collection-2.svg' },
  { id: 3, name: 'Bathroom Sanitation', description: 'Reliable cleaners for fresh, hygienic spaces.', image: '/collection-3.svg' },
  { id: 4, name: 'Floor & Glass', description: 'Streak-free shine for mirrors, windows, and hard surfaces.', image: '/collection-4.svg' },
  { id: 5, name: 'Everyday Cleaners', description: 'Practical essentials for quick, dependable daily cleaning.', image: '/collection-5.svg' },
  { id: 6, name: 'Sanitize & Protect', description: 'High-performance solutions for cleaner, healthier homes.', image: '/collection-6.svg' },
];
