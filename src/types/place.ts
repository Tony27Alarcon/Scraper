export interface OpenHours {
  periods?: Array<{
    open:  { day: number; time: string }
    close: { day: number; time: string }
  }>
  weekday_text?: string[]
}

export interface CompleteAddress {
  street?:   string
  city?:     string
  state?:    string
  zip?:      string
  country?:  string
}

export interface ReviewsPerRating {
  '1': number
  '2': number
  '3': number
  '4': number
  '5': number
}

export interface UserReview {
  name?:    string
  rating?:  number
  text?:    string
  date?:    string
  photos?:  string[]
}

export interface Place {
  id:                    string
  input_id?:             string | null
  link?:                 string | null
  title?:                string | null
  category?:             string | null
  address?:              string | null
  open_hours?:           OpenHours | null
  popular_times?:        any | null
  website?:              string | null
  phone?:                string | null
  email?:                string | null
  plus_code?:            string | null
  review_count?:         number | null
  review_rating?:        number | string | null
  reviews_per_rating?:   ReviewsPerRating | null
  latitude?:             number | string | null
  longitude?:            number | string | null
  cid?:                  string | null
  status?:               string | null
  descriptions?:         string | null
  reviews_link?:         string | null
  thumbnail?:            string | null
  timezone?:             string | null
  price_range?:          string | null
  data_id?:              string | null
  place_id?:             string | null
  images?:               any | null
  reservations?:         any | null
  order_online?:         any | null
  menu?:                 any | null
  owner?:                any | null
  complete_address?:     CompleteAddress | null
  about?:                any | null
  user_reviews?:         UserReview[] | null
  user_reviews_extended?: any | null
  emails?:               string[] | any | null
  batch_tag?:            string | null
  lead_score?:           number | null
  lead_temperature?:     string | null
  isFavorited?:          boolean
  reactionCounts?:       { emoji: string; count: number; reacted: boolean }[]
  created_at:            string | Date
  updated_at:            string | Date
}

export interface PlaceNote {
  id:         number
  place_id:   string
  user_id:    number
  username?:  string | null
  content:    string
  created_at: string | Date
  updated_at: string | Date
}

export type ActivityType = 'call' | 'email' | 'whatsapp' | 'meeting' | 'contacted' | 'ai_action' | 'other'

export interface PlaceActivity {
  id:          number
  place_id:    string
  user_id:     number
  username?:   string | null
  type:        ActivityType | string
  content?:    string | null
  happened_at: string | Date
  created_at:  string | Date
}

// Entrada unificada del timeline (actividades + notas)
export interface TimelineEntry {
  id:         number
  kind:       'activity' | 'note'
  type:       string
  content?:   string | null
  username?:  string | null
  user_id:    number
  date:       string | Date   // happened_at para actividades, created_at para notas
  created_at: string | Date
}

export interface PlacesResponse {
  data:       Place[]
  total:      number
  page:       number
  totalPages: number
}
