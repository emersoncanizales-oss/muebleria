export function money(value) {
  return new Intl.NumberFormat("es-HN", {
    style: "currency",
    currency: "HNL",
  }).format(Number(value));
}
export function whatsappUrl(product, variant, quantity = 1) {
  if (!Number.isInteger(quantity) || quantity < 1 || quantity > variant.stock)
    throw new Error("Cantidad no disponible");
  const url = new URL(window.location.href);
  url.hash = `producto/${product.id}`;
  const text = `Hola, me interesa este producto de Zapatería Canizales:\n${product.name}\nCódigo: ${product.code}\nSKU: ${variant.sku}\nTalla: ${variant.size} (${variant.system})\nColor: ${variant.color}\nCantidad: ${quantity}\nPrecio unitario consultado: ${money(product.price)}\n${url.href}\n¿Me confirma disponibilidad y total?`;
  return `https://wa.me/50498211001?text=${encodeURIComponent(text)}`;
}
export function validImage(value) {
  try {
    return new URL(value).protocol === "https:";
  } catch {
    return false;
  }
}
