
export type Mode = 'single' | 'template' | 'list';

export interface GeneratedImage {
  base64: string | null;
  prompt: string;
  error?: string;
  loading: boolean;
}

export interface HistoryItem {
  id: string;
  prompt: string;
  base64: string;
  timestamp: number;
  model?: string;
}

export interface Template {
  category: string;
  name: string;
  description: string;
  prompt: string;
  thumbnail?: string;
}

export interface ListPrompt {
    prompt: string;
    name: string;
}

export interface CropRect {
  x: number;
  y: number;
  w: number;
  h: number;
}