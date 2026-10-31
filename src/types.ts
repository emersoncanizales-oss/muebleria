export type Product = {
  id: string;
  code: string;
  name: string;
  description: string;
  category: string;
  price: number;
  image_url: string;
  active: boolean;
};
export type Variant = {
  id: string;
  product_id: string;
  sku: string;
  size: string;
  system: string;
  color: string;
  stock: number;
};
export type Sale = {
  id: string;
  created_at: string;
  product_name: string;
  sku: string;
  size: string;
  system: string;
  color: string;
  quantity: number;
  unit_price: number;
  total: number;
};
