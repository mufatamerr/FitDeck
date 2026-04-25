export type ClothingCategory = 'shirt' | 'jacket' | 'pants' | 'shoes' | 'accessory'

export type ClothingItem = {
  id: string
  name: string
  brand?: string | null
  category: ClothingCategory
  image_url?: string | null
  try_on_asset?: string | null
  style_tags?: string[]
  color_tags?: string[]
  source?: 'catalog' | 'personal'
}

export type Outfit = {
  id: string
  name?: string | null
  items: ClothingItem[]
}

