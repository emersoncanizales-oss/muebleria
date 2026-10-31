import test from "node:test";
import assert from "node:assert/strict";
import { whatsappUrl, validImage } from "../src/domain.js";
global.window = {
  location: { href: "https://example.org/muebleria/#catalogo" },
};
const p = { id: "abc", code: "ZC-001", name: "Zapato & ejemplo", price: 950 };
const v = {
  sku: "ZC-001-US-8",
  size: "8",
  system: "US",
  color: "Azul & amarillo",
  stock: 3,
};
test("WhatsApp conserva producto, SKU, talla, color, cantidad y enlace compartible", () => {
  const url = new URL(whatsappUrl(p, v, 2));
  assert.equal(url.pathname, "/50498211001");
  const text = url.searchParams.get("text");
  for (const part of [
    "Zapato & ejemplo",
    "ZC-001",
    "ZC-001-US-8",
    "8 (US)",
    "Azul & amarillo",
    "Cantidad: 2",
    "https://example.org/muebleria/#producto/abc",
  ])
    assert.ok(text.includes(part));
});
test("rechaza cantidades invalidas o superiores al stock", () => {
  for (const q of [0, -1, 4, 1.5, NaN])
    assert.throws(() => whatsappUrl(p, v, q));
});
test("las imagenes exigen HTTPS", () => {
  assert.equal(validImage("https://images.unsplash.com/a"), true);
  for (const u of [
    "javascript:alert(1)",
    "http://example.org/a",
    "data:image/png;base64,abc",
    "no-url",
  ])
    assert.equal(validImage(u), false);
});
