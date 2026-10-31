import type { Product, Variant } from "./types";
export const demoProducts: Product[] = [
  {
    id: "demo-1",
    code: "ZC-001",
    name: "Urban Classic",
    description:
      "Silueta deportiva para acompañarte todos los días. Fotografía ilustrativa de stock.",
    category: "Hombre",
    price: 1290,
    image_url:
      "https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=900&auto=format&fit=crop&q=85",
    active: true,
  },
  {
    id: "demo-2",
    code: "ZC-002",
    name: "Essential White",
    description:
      "Un clásico versátil y ligero. Fotografía ilustrativa de stock.",
    category: "Mujer",
    price: 1150,
    image_url:
      "https://images.unsplash.com/photo-1549298916-b41d501d3772?w=900&auto=format&fit=crop&q=85",
    active: true,
  },
  {
    id: "demo-3",
    code: "ZC-003",
    name: "Street Runner",
    description:
      "Comodidad para explorar nuevos caminos. Fotografía ilustrativa de stock.",
    category: "Hombre",
    price: 1490,
    image_url:
      "https://images.unsplash.com/photo-1600185365483-26d7a4cc7519?w=900&auto=format&fit=crop&q=85",
    active: true,
  },
  {
    id: "demo-4",
    code: "ZC-004",
    name: "Little Steps",
    description:
      "Un modelo de ejemplo para los más pequeños. La imagen es ilustrativa y no representa la talla.",
    category: "Infantil",
    price: 790,
    image_url:
      "https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=900&auto=format&fit=crop&q=85",
    active: true,
  },
];
export const demoVariants: Variant[] = demoProducts.flatMap((p, i) => [
  {
    id: `v-${i}-1`,
    product_id: p.id,
    sku: `${p.code}-EU-${i === 3 ? "28" : "38"}`,
    size: i === 3 ? "28" : "38",
    system: "EU",
    color: i === 0 ? "Rojo" : "Natural",
    stock: 5,
  },
  {
    id: `v-${i}-2`,
    product_id: p.id,
    sku: `${p.code}-US-${i === 3 ? "11C" : "8"}`,
    size: i === 3 ? "11C" : "8",
    system: "US",
    color: i === 0 ? "Rojo" : "Natural",
    stock: 3,
  },
]);
