import { z } from 'zod';

export const authSchemas = {
  register: z.object({
    body: z.object({
      email: z.string().email('Invalid email address').optional().nullable(),
      phone: z.string().min(10, 'Phone number must be at least 10 digits').optional().nullable(),
      password: z.string().min(8, 'Password must be at least 8 characters long').max(128, 'Password cannot exceed 128 characters'),
      name: z.string().min(1, 'Name is required'),
    }).refine(data => data.email || data.phone, {
      message: 'Either email or phone number is required',
      path: ['email']
    }),
  }),
  login: z.object({
    body: z.object({
      emailOrPhone: z.string().min(1, 'Email or Phone number is required'),
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
      newPassword: z.string().min(8, 'Password must be at least 8 characters long').max(128, 'Password cannot exceed 128 characters'),
    }),
  }),
  changePassword: z.object({
    body: z.object({
      currentPassword: z.string().min(1, 'Current password is required'),
      newPassword: z.string().min(8, 'New password must be at least 8 characters long').max(128, 'Password cannot exceed 128 characters'),
    }),
  }),
  verifyEmail: z.object({
    body: z.object({
      token: z.string().min(1, 'Verification token is required'),
    }),
  }),
  resendVerification: z.object({
    body: z.object({
      email: z.string().email('Invalid email address').optional(),
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
      categoryId: z.string().min(1, 'Category ID is required'),
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
      categoryId: z.string().optional(),
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
      author: z.string().optional(),
      images: z.array(z.string()).optional(),
      videos: z.array(z.string()).optional(),
    }),
  }),
};

export const orderSchemas = {
  create: z.object({
    body: z.object({
      addressId: z.string().min(1, 'Address ID is required'),
    }),
  }),
  updateStatus: z.object({
    body: z.object({
      status: z.enum(['Pending', 'Confirmed', 'Packed', 'Shipped', 'Delivered', 'Cancelled', 'Returned', 'Refunded']),
      courierName: z.string().optional(),
      trackingNumber: z.string().optional(),
    }),
  }),
  cancel: z.object({
    body: z.object({
      reason: z.string().min(1, 'Cancellation reason is required'),
      comment: z.string().max(500, 'Comment cannot exceed 500 characters').optional().nullable(),
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

export const cartSchemas = {
  add: z.object({
    body: z.object({
      productId: z.string().min(1, 'Product ID is required'),
      quantity: z.number().int().min(1, 'Quantity must be at least 1').max(99, 'Quantity cannot exceed 99').optional().default(1),
    }),
  }),
  update: z.object({
    body: z.object({
      quantity: z.number().int().min(1, 'Quantity must be at least 1').max(99, 'Quantity cannot exceed 99'),
    }),
  }),
};

export const wishlistSchemas = {
  toggle: z.object({
    body: z.object({
      productId: z.string().min(1, 'Product ID is required'),
    }),
  }),
};


export const returnSchemas = {
  create: z.object({
    body: z.object({
      orderId: z.string().min(1, 'Order ID is required'),
      items: z.array(
        z.object({
          orderItemId: z.string().min(1, 'Order item ID is required'),
          quantity: z.number().int().min(1, 'Quantity must be at least 1'),
        })
      ).min(1, 'At least one item must be selected for return'),
      reason: z.string().min(1, 'Return reason is required'),
      description: z.string().min(5, 'Please provide at least 5 characters describing the issue'),
      images: z.array(z.string()).optional().default([]),
      codUpiId: z.string().optional().nullable(),
      codAccountDetails: z.record(z.any()).optional().nullable(),
    }),
  }),
  review: z.object({
    body: z.object({
      action: z.enum(['APPROVE', 'REJECT']),
      rejectionReason: z.string().optional().nullable(),
      notes: z.string().optional().nullable(),
    }).refine(
      (data) => data.action !== 'REJECT' || (data.rejectionReason && data.rejectionReason.trim().length > 0),
      {
        message: 'Rejection reason is required when rejecting a return request',
        path: ['rejectionReason'],
      }
    ),
  }),
  reversePickup: z.object({
    body: z.object({
      courier: z.string().min(1, 'Courier name is required'),
      awb: z.string().min(1, 'AWB / Tracking number is required'),
      scheduledAt: z.string().optional().nullable(),
    }),
  }),
  updatePickupStatus: z.object({
    body: z.object({
      status: z.enum(['PICKUP_SCHEDULED', 'PICKED_UP']),
      notes: z.string().optional().nullable(),
    }),
  }),
  receive: z.object({
    body: z.object({
      notes: z.string().optional().nullable(),
    }),
  }),
  inspect: z.object({
    body: z.object({
      result: z.enum(['PASSED', 'FAILED']),
      notes: z.string().min(1, 'Inspection notes are required'),
      restoreStock: z.boolean().optional().default(true),
    }),
  }),
  codPayout: z.object({
    body: z.object({
      amount: z.number().positive('Refund amount must be positive'),
      payoutReference: z
        .string()
        .trim()
        .min(6, 'Bank UTR or UPI transaction reference must be at least 6 characters')
        .refine(
          (ref) => !['unpaid', 'pending', 'none', 'n/a', 'na', 'nil', 'null', '0', 'test'].includes(ref.toLowerCase()),
          {
            message: 'A real, completed bank or UPI transaction reference (UTR) is required. Unpaid or placeholder status is strictly prohibited.',
          }
        ),
      notes: z.string().optional().nullable(),
    }),
  }),
  retryRefund: z.object({
    body: z.object({
      notes: z.string().optional().nullable(),
    }).optional(),
  }),
};
