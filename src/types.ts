export interface TextBlock {
  id: string;
  text: string;           
  x: number;              
  y: number;              
  width: number;          
  height: number;         
  fontSize: number;       
  fontWeight: 'normal' | 'bold' | 'black';
  isItalic: boolean;
  align: 'left' | 'center' | 'right' | 'justify';
  hasCardBg: boolean;     
  blockType?: 'default' | 'chat_left' | 'chat_right'; 
  cardBgOpacity?: number;   
  cardBgRadius?: number;    
  verticalAlign?: 'top' | 'center' | 'bottom'; 
}
export interface Slide {
  id: string;
  blocks: TextBlock[];    
  backgroundImage: string | null; 
  bgColor: string | null; 
  backgroundZoom?: number; 
  backgroundX?: number;    
  backgroundY?: number;    
  backgroundOpacity?: number; 
  swipeHintText?: string | null; 
  slideDuration?: number; 
}
export interface ColorPalette {
  bg: string;       
  text: string;     
  accent: string;   
  accentText: string; 
  cardBg: string;   
}
export type PresetThemeId = 
  | 'romantic' 
  | 'thriller' 
  | 'gold_magic' 
  | 'noble_emerald' 
  | 'minimal_dark' 
  | 'bright_accent'
  | 'cyberpunk'
  | 'cosmic_indigo'
  | 'vintage_parchment'
  | 'sunset_orange';
export interface StylePreset {
  id: PresetThemeId;
  name: string;
  fontFamily: string; 
  fontImportUrl: string; 
  defaultPalette: ColorPalette;
  description: string;
  styles: {
    letterSpacing: string;
    borderStyle: string;  
  };
}
export type RatioId = '9:16' | '3:4';
export interface CarouselConfig {
  slides: Slide[];
  palette: ColorPalette;
  selectedGenre: PresetThemeId; 
  slideDuration: number; 
  transitionDuration: number; 
  useUniformDuration: boolean; 
  ratio: RatioId; 
  showTiktokHud: boolean; 
  showGrid?: boolean; 
  customFontFamily?: string; 
}
export function getRatioDimensions(ratio: RatioId): { exportW: number; exportH: number; previewW: number; previewH: number } {
  switch (ratio) {
    case '3:4':
      return { exportW: 1080, exportH: 1440, previewW: 315, previewH: 420 };
    case '9:16':
    default:
      return { exportW: 1080, exportH: 1920, previewW: 315, previewH: 560 };
  }
}
export interface UserTemplate {
  id: string;
  name: string;
  createdAt: number;
  blocks: TextBlock[];
  palette: ColorPalette;
  selectedGenre: PresetThemeId;
  backgroundImage?: string | null;
  backgroundOpacity?: number;
  bgColor?: string | null;
  customFontFamily?: string;
}
declare global {
  interface Window {
    electron?: {
      saveImagesDialog: (images: string[]) => Promise<{ success: boolean; error?: string; dirPath?: string }>;
      saveVideo: (webmBase64: string) => Promise<{ success: boolean; error?: string; filePath?: string; warning?: string }>;
      saveUserTemplates: (templates: UserTemplate[]) => Promise<{ success: boolean; error?: string }>;
      loadUserTemplates: () => Promise<{ success: boolean; error?: string; templates: UserTemplate[] }>;
      saveCarouselConfig: (config: CarouselConfig) => Promise<{ success: boolean; error?: string }>;
      loadCarouselConfig: () => Promise<{ success: boolean; error?: string; config: CarouselConfig | null }>;
      isElectron: boolean;
    };
  }
}
