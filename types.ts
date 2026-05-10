
export type PhotoSize = '2x3' | '3x4' | '4x6' | '5x5' | '3.5x4.5' | '4.5x4.5' | 'custom';

export type BackgroundType = 'solid' | 'gradient' | 'image';

export interface BackgroundColor {
  type: BackgroundType;
  name: string;
  value: string;
  extraValue?: string;
}

export interface HistoryItem {
  id: string;
  imageUrl: string;
  photoSize: PhotoSize;
  timestamp: number;
  outfit: string;
}

export interface SubCategory {
  id: string;
  label: string;
  size: PhotoSize;
  availableSizes?: PhotoSize[];
  description: string;
  checklist: string[];
  aspectRatio: string;
  bgColor: string;
  displaySize: string;
}

export interface Category {
  id: string;
  title: string;
  icon: string;
  subCategories: SubCategory[];
}
