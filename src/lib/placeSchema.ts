import { z } from 'zod'

export const JSON_FIELDS = [
  'open_hours',
  'popular_times',
  'reviews_per_rating',
  'complete_address',
  'about',
  'images',
  'reservations',
  'order_online',
  'menu',
  'owner',
  'user_reviews',
  'user_reviews_extended',
  'emails',
] as const

export type JsonFieldName = (typeof JSON_FIELDS)[number]

export const CreateSchema = z.object({
  title:                 z.string().min(1).optional(),
  input_id:              z.string().optional(),
  link:                  z.string().optional(),
  category:              z.string().optional(),
  address:               z.string().optional(),
  phone:                 z.string().optional(),
  website:               z.string().optional(),
  review_count:          z.coerce.number().int().nonnegative().optional(),
  review_rating:         z.coerce.number().min(0).max(5).optional(),
  latitude:              z.coerce.number().optional(),
  longitude:             z.coerce.number().optional(),
  status:                z.string().optional(),
  price_range:           z.string().optional(),
  thumbnail:             z.string().optional(),
  timezone:              z.string().optional(),
  cid:                   z.string().optional(),
  data_id:               z.string().optional(),
  place_id:              z.string().optional(),
  plus_code:             z.string().optional(),
  descriptions:          z.string().optional(),
  reviews_link:          z.string().optional(),
  open_hours:            z.any().optional(),
  popular_times:         z.any().optional(),
  reviews_per_rating:    z.any().optional(),
  complete_address:      z.any().optional(),
  about:                 z.any().optional(),
  images:                z.any().optional(),
  reservations:          z.any().optional(),
  order_online:          z.any().optional(),
  menu:                  z.any().optional(),
  owner:                 z.any().optional(),
  user_reviews:          z.any().optional(),
  user_reviews_extended: z.any().optional(),
  emails:                z.any().optional(),
  batch_tag:             z.string().optional(),
})

export type CreateInput = z.infer<typeof CreateSchema>
