export interface CertificateTemplate {
  id: number;
  key: string;
  title: string;
  background_file: string;
  name_x: number;
  name_y: number;
  name_font_size: number;
  date_x: number;
  date_y: number;
  date_font_size: number;
  certificate_type?: string;
  profitshare_x?: number;
  profitshare_y?: number;
  profitshare_font_size?: number;
  is_active: boolean;
  available_images?: string[];
}