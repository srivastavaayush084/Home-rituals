import { z } from 'zod';

export const authSchemas = {
  register: z.object({
    body: z.object({
      email: z.string().email('Invalid email address'),
      password: z.string().min(6, 'Password must be at least 6 characters long'),
      name: z.string().min(1, 'Name is required'),
    }),
  }),
  login: z.object({
    body: z.object({
      email: z.string().email('Invalid email address'),
      password: z.string().min(1, 'Password is required'),
    }),
  }),
  forgotPassword: z.object({
    body: z.object({
      email: z.string().email('Invalid email address'),
    }),
  }),
  resetPassword: z.object({
    body: z.object({
      token: z.string().min(1, 'Token is required'),
      newPassword: z.string().min(6, 'Password must be at least 6 characters long'),
    }),
  }),
};

export const categorySchemas = {
  create: z.object({
    body: z.object({
      name: z.string().min(1, 'Category name is required'),
      description: z.string().optional(),
      image: z.string().optional(),
    }),
  }),
  update: z.object({
    body: z.object({
      name: z.string().min(1).optional(),
      description: z.string().optional(),
      image: z.string().optional(),
    }),
  }),
};

export const productSchemas = {
  create: z.object({
    body: z.object({
      name: z.string().min(1, 'Product name is required'),
      sku: z.string().min(1, 'SKU is required'),
      description: z.string().min(1, 'Description is required'),
      shortDescription: z.string().optional(),
      price: z.number().positive('Price must be a positive number'),
      originalPrice: z.number().positive().optional(),
      discountPrice: z.number().positive().optional(),
      badge: z.string().optional(),
      stock: z.number().int().nonnegative('Stock must be zero or positive'),
      featured: z.boolean().optional(),
      image: z.string().min(1, 'Primary image is required'),
      images: z.array(z.string()).optional(),
      tags: z.array(z.string()).optional(),
      seoTitle: z.string().optional(),
      seoDescription: z.string().optional(),
      ingredients: z.string().optional(),
      usageInstructions: z.string().optional(),
      benefits: z.string().optional(),
      faqs: z.array(z.object({
        question: z.string(),
        answer: z.string(),
      })).optional(),
      categoryId: z.number().int('Category ID must be an integer'),
      concern: z.string().min(1, 'Concern is required'),
      collection: z.string().min(1, 'Collection is required'),
      variant: z.string().optional(),
      packSize: z.string().optional(),
      materials: z.string().optional(),
      careInstructions: z.string().optional(),
      shippingReturns: z.string().optional(),
    }),
  }),
  update: z.object({
    body: z.object({
      name: z.string().optional(),
      sku: z.string().optional(),
      description: z.string().optional(),
      shortDescription: z.string().optional(),
      price: z.number().positive().optional(),
      originalPrice: z.number().positive().optional(),
      discountPrice: z.number().positive().optional(),
      badge: z.string().optional(),
      stock: z.number().int().nonnegative().optional(),
      featured: z.boolean().optional(),
      image: z.string().optional(),
      images: z.array(z.string()).optional(),
      tags: z.array(z.string()).optional(),
      seoTitle: z.string().optional(),
      seoDescription: z.string().optional(),
      ingredients: z.string().optional(),
      usageInstructions: z.string().optional(),
      benefits: z.string().optional(),
      faqs: z.array(z.object({
        question: z.string(),
        answer: z.string(),
      })).optional(),
      categoryId: z.number().int().optional(),
      concern: z.string().optional(),
      collection: z.string().optional(),
      variant: z.string().optional(),
      packSize: z.string().optional(),
      materials: z.string().optional(),
      careInstructions: z.string().optional(),
      shippingReturns: z.string().optional(),
    }),
  }),
};

export const reviewSchemas = {
  create: z.object({
    body: z.object({
      title: z.string().min(1, 'Review title is required'),
      text: z.string().min(1, 'Review text is required'),
      rating: z.number().int().min(1).max(5, 'Rating must be between 1 and 5'),
    }),
  }),
};

export const orderSchemas = {
  create: z.object({
    body: z.object({
      addressId: z.number().int('Address ID is required'),
    }),
  }),
  updateStatus: z.object({
    body: z.object({
      status: z.enum(['Pending', 'Confirmed', 'Packed', 'Shipped', 'Delivered', 'Cancelled', 'Returned', 'Refunded']),
      courierName: z.string().optional(),
      trackingNumber: z.string().optional(),
    }),
  }),
};

export const blogSchemas = {
  create: z.object({
    body: z.object({
      title: z.string().min(1, 'Title is required'),
      excerpt: z.string().min(1, 'Excerpt is required'),
      category: z.string().min(1, 'Category is required'),
      image: z.string().min(1, 'Primary image is required'),
      readTime: z.string().min(1, 'Read time is required'),
      author: z.string().min(1, 'Author is required'),
      publishedAt: z.string().min(1, 'Published date description is required'),
      contentJson: z.array(z.any()).min(1, 'Content elements are required'),
    }),
  }),
  update: z.object({
    body: z.object({
      title: z.string().optional(),
      excerpt: z.string().optional(),
      category: z.string().optional(),
      image: z.string().optional(),
      readTime: z.string().optional(),
      author: z.string().optional(),
      publishedAt: z.string().optional(),
      contentJson: z.array(z.any()).optional(),
    }),
  }),
};

export const addressSchemas = {
  create: z.object({
    body: z.object({
      fullName: z.string().min(1, 'Full name is required'),
      address1: z.string().min(1, 'Address line 1 is required'),
      address2: z.string().optional(),
      city: z.string().min(1, 'City is required'),
      state: z.string().min(1, 'State is required'),
      postalCode: z.string().min(1, 'Postal / ZIP code is required'),
      country: z.string().default('India'),
      landmark: z.string().optional(),
      phone: z.string().min(1, 'Phone number is required'),
      isDefault: z.boolean().optional(),
    }),
  }),
  update: z.object({
    body: z.object({
      fullName: z.string().optional(),
      address1: z.string().optional(),
      address2: z.string().optional(),
      city: z.string().optional(),
      state: z.string().optional(),
      postalCode: z.string().optional(),
      country: z.string().optional(),
      landmark: z.string().optional(),
      phone: z.string().optional(),
      isDefault: z.boolean().optional(),
    }),
  }),
};

export const contactSchemas = {
  create: z.object({
    body: z.object({
      name: z.string().min(1, 'Name is required'),
      email: z.string().email('Invalid email address'),
      subject: z.string().min(1, 'Subject is required'),
      message: z.string().min(1, 'Message is required'),
    }),
  }),
};

export const newsletterSchemas = {
  subscribe: z.object({
    body: z.object({
      email: z.string().email('Invalid email address'),
    }),
  }),
};
