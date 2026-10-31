import { useEffect, useState, type FormEvent } from "react";
import {
  ArrowUpRight,
  ArrowRight,
  Search,
  ShoppingBag,
  MessageCircle,
  X,
  Plus,
  LogOut,
  ShieldCheck,
  Package,
  Check,
} from "lucide-react";
import { db } from "./db";
import { demoProducts, demoVariants } from "./demo";
import { money, whatsappUrl, validImage } from "./domain.js";
import type { Product, Variant, Sale } from "./types";
const blank = {
  code: "",
  name: "",
  description: "",
  category: "Hombre",
  price: 0,
  image_url: "",
  active: true,
};
export default function App() {
  const [products, setProducts] = useState<Product[]>(db ? [] : demoProducts),
    [variants, setVariants] = useState<Variant[]>(db ? [] : demoVariants);
  const [sales, setSales] = useState<Sale[]>([]),
    [admin, setAdmin] = useState(false),
    [panel, setPanel] = useState(location.hash === "#admin");
  const [loading, setLoading] = useState(!!db),
    [busy, setBusy] = useState(false),
    [error, setError] = useState(""),
    [notice, setNotice] = useState("");
  const [category, setCategory] = useState("Todos"),
    [search, setSearch] = useState(""),
    [selected, setSelected] = useState<Product | null>(null);
  const [variantId, setVariantId] = useState(""),
    [quantity, setQuantity] = useState(1),
    [tab, setTab] = useState("Productos");
  const [editing, setEditing] = useState<Partial<Product> | null>(null),
    [stockProduct, setStockProduct] = useState<Product | null>(null),
    [editVariant, setEditVariant] = useState<Variant | null>(null);
  const [saleRequest, setSaleRequest] = useState(crypto.randomUUID());
  async function load() {
    if (!db) return;
    setLoading(true);
    const [p, v] = await Promise.all([
      db.from("products").select("*").order("name"),
      db.from("variants").select("*").order("sku"),
    ]);
    if (p.error || v.error)
      setError(
        p.error?.message || v.error?.message || "No se pudo cargar el catálogo",
      );
    else {
      setProducts(p.data || []);
      setVariants(v.data || []);
    }
    setLoading(false);
  }
  useEffect(() => {
    void load();
    if (!db) return;
    let current = true;
    const {
      data: { subscription },
    } = db.auth.onAuthStateChange((_event, session) => {
      setAdmin(false);
      if (session) {
        void db!
          .from("admins")
          .select("user_id")
          .eq("user_id", session.user.id)
          .maybeSingle()
          .then(({ data, error }) => {
            if (current) {
              setAdmin(!!data);
              if (error) setError(error.message);
            }
          });
      }
    });
    return () => {
      current = false;
      subscription.unsubscribe();
    };
  }, []);
  useEffect(() => {
    void load();
    if (admin && db)
      void db
        .from("sales")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(200)
        .then(({ data, error }) => {
          if (error) setError(error.message);
          else setSales(data || []);
        });
    else setSales([]);
  }, [admin]);
  useEffect(() => {
    function route() {
      setPanel(location.hash === "#admin");
      const id = location.hash.startsWith("#producto/")
        ? decodeURIComponent(location.hash.slice(10))
        : "";
      setSelected(products.find((p) => p.id === id && p.active) || null);
      setVariantId("");
      setQuantity(1);
    }
    route();
    window.addEventListener("hashchange", route);
    return () => window.removeEventListener("hashchange", route);
  }, [products]);
  useEffect(() => {
    const close = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        if (editing) setEditing(null);
        else if (stockProduct) setStockProduct(null);
        else if (selected) location.hash = "catalogo";
      }
    };
    window.addEventListener("keydown", close);
    return () => window.removeEventListener("keydown", close);
  }, [editing, stockProduct, selected]);
  useEffect(() => {
    if (!editing && !stockProduct && !selected) return;
    const previous = document.activeElement as HTMLElement | null;
    const dialog = document.querySelector<HTMLElement>('[role="dialog"]');
    if (!dialog) return;
    const oldOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const focusable = () =>
      Array.from(
        dialog.querySelectorAll<HTMLElement>(
          "button:not(:disabled),a[href],input,select,textarea",
        ),
      ).filter((e) => e.offsetParent !== null);
    focusable()[0]?.focus();
    const trap = (e: KeyboardEvent) => {
      if (e.key !== "Tab") return;
      const nodes = focusable(),
        first = nodes[0],
        last = nodes[nodes.length - 1];
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last?.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first?.focus();
      }
    };
    document.addEventListener("keydown", trap);
    return () => {
      document.body.style.overflow = oldOverflow;
      document.removeEventListener("keydown", trap);
      previous?.focus();
    };
  }, [editing, stockProduct, selected]);
  async function action(task: () => Promise<void>) {
    if (busy) return;
    setBusy(true);
    setError("");
    setNotice("");
    try {
      await task();
    } catch (e) {
      setError(
        e instanceof Error
          ? e.message
          : typeof e === "object" && e !== null && "message" in e
            ? String(e.message)
            : String(e),
      );
    } finally {
      setBusy(false);
    }
  }
  async function login(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    void action(async () => {
      if (!db) throw Error("Conecta Supabase para habilitar el acceso real.");
      const { error } = await db.auth.signInWithPassword({
        email: String(f.get("email")),
        password: String(f.get("password")),
      });
      if (error) throw error;
      setNotice("Sesión iniciada. Comprobando permisos de administrador.");
    });
  }
  async function saveProduct(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    void action(async () => {
      const image = String(f.get("image_url"));
      if (!validImage(image))
        throw Error("La imagen debe tener una dirección HTTPS.");
      const data = {
        code: String(f.get("code")).trim(),
        name: String(f.get("name")).trim(),
        description: String(f.get("description")).trim(),
        category: String(f.get("category")),
        price: Number(f.get("price")),
        image_url: image,
        active: f.get("active") === "on",
      };
      const result = editing?.id
        ? await db!.from("products").update(data).eq("id", editing.id)
        : await db!.from("products").insert(data);
      if (result.error) throw result.error;
      setEditing(null);
      await load();
      setNotice("Producto guardado.");
    });
  }
  async function saveVariant(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    void action(async () => {
      const data = {
        product_id: stockProduct!.id,
        sku: String(f.get("sku")).trim(),
        size: String(f.get("size")).trim(),
        system: String(f.get("system")),
        color: String(f.get("color")).trim(),
        stock: Number(f.get("stock")),
      };
      const r = editVariant
        ? await db!.from("variants").update(data).eq("id", editVariant.id)
        : await db!.from("variants").insert(data);
      if (r.error) throw r.error;
      setEditVariant(null);
      (document.getElementById("variant-form") as HTMLFormElement)?.reset();
      await load();
      setNotice("Existencias guardadas.");
    });
  }
  async function remove(table: string, id: string) {
    if (
      !confirm("¿Eliminar este registro? El historial de ventas se conservará.")
    )
      return;
    void action(async () => {
      const { error } = await db!.from(table).delete().eq("id", id);
      if (error) throw error;
      await load();
      setNotice("Registro eliminado.");
    });
  }
  async function sell(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    void action(async () => {
      const { error } = await db!.rpc("record_sale", {
        p_variant: String(f.get("variant")),
        p_quantity: Number(f.get("quantity")),
        p_request_id: saleRequest,
      });
      if (error) throw error;
      setSaleRequest(crypto.randomUUID());
      await load();
      const r = await db!
        .from("sales")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(200);
      if (r.error) {
        setError(
          "La venta quedó registrada. No repitas la venta: falló la actualización del historial. Recarga la página.",
        );
      } else setSales(r.data || []);
      setNotice("Venta registrada y existencias actualizadas.");
    });
  }
  const shown = products.filter(
    (p) =>
      p.active &&
      (category === "Todos" || p.category === category) &&
      `${p.name} ${p.code} ${p.description}`
        .toLowerCase()
        .includes(search.toLowerCase()),
  );
  const chosen = variants.find((v) => v.id === variantId);
  return (
    <>
      <div className="announcement">
        UN PAR PARA CADA HISTORIA <span>•</span> HECHO PARA SEGUIR TUS PASOS
      </div>
      <header>
        <a className="brand" href="#inicio">
          <span className="brand-mark">
            C<span>★</span>
          </span>
          <span>
            CANIZALES<small>ZAPATERÍA · HONDURAS</small>
          </span>
        </a>
        <nav aria-label="Principal">
          <a href="#catalogo">Colección</a>
          <a href="#nosotros">Nuestra esencia</a>
          <a
            className="nav-contact"
            href="https://wa.me/50498211001"
            target="_blank"
            rel="noreferrer"
          >
            Hablemos <ArrowUpRight size={16} />
          </a>
        </nav>
        <a className="admin-link" href="#admin" aria-label="Administración">
          <ShieldCheck size={21} />
        </a>
      </header>
      {!db && (
        <div className="demo-bar">
          PROYECTO ACADÉMICO · Catálogo de demostración con productos ficticios.
          Las consultas no constituyen compras.
        </div>
      )}
      <main>
        {error && (
          <div role="alert" className="message error">
            {error}
            <button aria-label="Cerrar error" onClick={() => setError("")}>
              <X size={17} />
            </button>
          </div>
        )}
        {notice && (
          <div role="status" className="message">
            <Check size={18} />
            {notice}
          </div>
        )}
        {panel ? (
          <section className="admin-section">
            <a href="#catalogo" className="eyebrow">
              ← VOLVER AL CATÁLOGO
            </a>
            <h1>
              Tu tienda, en orden<span>.</span>
            </h1>
            {!admin ? (
              <div className="login-box">
                <ShieldCheck size={30} />
                <h2>Acceso de administración</h2>
                <p>Gestiona tu catálogo, inventario y ventas.</p>
                {!db ? (
                  <p className="message">
                    La demostración es de solo lectura. Sigue la guía del
                    repositorio para conectar Supabase y crear el administrador.
                  </p>
                ) : (
                  <form onSubmit={login}>
                    <label>
                      Correo
                      <input
                        name="email"
                        type="email"
                        autoComplete="username"
                        required
                      />
                    </label>
                    <label>
                      Contraseña
                      <input
                        name="password"
                        type="password"
                        autoComplete="current-password"
                        required
                        minLength={8}
                      />
                    </label>
                    <button className="primary" disabled={busy}>
                      Ingresar <ArrowRight size={17} />
                    </button>
                  </form>
                )}
              </div>
            ) : (
              <>
                <div className="admin-toolbar">
                  <div className="tabs">
                    {["Productos", "Ventas"].map((t) => (
                      <button
                        className={tab === t ? "active" : ""}
                        key={t}
                        onClick={() => setTab(t)}
                      >
                        {t}
                      </button>
                    ))}
                  </div>
                  <button
                    onClick={() =>
                      void action(async () => {
                        const { error } = await db!.auth.signOut();
                        if (error) throw error;
                      })
                    }
                  >
                    <LogOut size={16} />
                    Cerrar sesión
                  </button>
                </div>
                {tab === "Productos" ? (
                  <>
                    <div className="section-heading">
                      <p>
                        {products.length} productos ·{" "}
                        {variants.reduce((s, v) => s + v.stock, 0)} pares
                      </p>
                      <button
                        className="primary"
                        onClick={() => setEditing(blank)}
                      >
                        <Plus size={17} />
                        Nuevo producto
                      </button>
                    </div>
                    <div className="table-scroll">
                      <table>
                        <thead>
                          <tr>
                            <th>Producto</th>
                            <th>Precio</th>
                            <th>Estado</th>
                            <th>Acciones</th>
                          </tr>
                        </thead>
                        <tbody>
                          {products.map((p) => (
                            <tr key={p.id}>
                              <td>
                                <b>{p.name}</b>
                                <small>
                                  {p.code} · {p.category}
                                </small>
                              </td>
                              <td>{money(p.price)}</td>
                              <td>{p.active ? "Publicado" : "Oculto"}</td>
                              <td className="actions">
                                <button onClick={() => setEditing(p)}>
                                  Editar
                                </button>
                                <button
                                  onClick={() => {
                                    setStockProduct(p);
                                    setEditVariant(null);
                                  }}
                                >
                                  Tallas / stock
                                </button>
                                <button
                                  disabled={busy}
                                  className="danger"
                                  onClick={() => void remove("products", p.id)}
                                >
                                  Eliminar
                                </button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </>
                ) : (
                  <>
                    <div className="sale-layout">
                      <form
                        className="login-box"
                        onChange={() => setSaleRequest(crypto.randomUUID())}
                        onSubmit={sell}
                      >
                        <h2>Registrar venta confirmada</h2>
                        <p>
                          Registra aquí la venta acordada por WhatsApp. Se usará
                          el precio actual del catálogo.
                        </p>
                        <label>
                          Producto y variante
                          <select name="variant" required>
                            {variants
                              .filter(
                                (v) =>
                                  v.stock > 0 &&
                                  products.find((p) => p.id === v.product_id)
                                    ?.active,
                              )
                              .map((v) => (
                                <option value={v.id} key={v.id}>
                                  {
                                    products.find((p) => p.id === v.product_id)
                                      ?.name
                                  }{" "}
                                  · {v.sku} · {v.size} {v.system} · {v.color} ·{" "}
                                  {v.stock} disponibles
                                </option>
                              ))}
                          </select>
                        </label>
                        <label>
                          Cantidad
                          <input
                            name="quantity"
                            type="number"
                            min="1"
                            step="1"
                            defaultValue="1"
                            required
                          />
                        </label>
                        <button className="primary" disabled={busy}>
                          Confirmar venta
                        </button>
                      </form>
                      <div className="stat">
                        <small>ÚLTIMAS {sales.length} VENTAS</small>
                        <h2>
                          {money(
                            sales.reduce((s, v) => s + Number(v.total), 0),
                          )}
                        </h2>
                        <p>
                          Ventas registradas, no ingresos verificados por
                          WhatsApp.
                        </p>
                      </div>
                    </div>
                    <div className="table-scroll">
                      <table>
                        <thead>
                          <tr>
                            <th>Fecha</th>
                            <th>Producto / variante</th>
                            <th>Pares</th>
                            <th>Total</th>
                          </tr>
                        </thead>
                        <tbody>
                          {sales.map((s) => (
                            <tr key={s.id}>
                              <td>
                                {new Date(s.created_at).toLocaleString(
                                  "es-HN",
                                  { timeZone: "America/Tegucigalpa" },
                                )}
                              </td>
                              <td>
                                {s.product_name}
                                <small>
                                  {s.sku} · {s.size} {s.system} · {s.color}
                                </small>
                              </td>
                              <td>{s.quantity}</td>
                              <td>{money(s.total)}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                      {sales.length === 0 && <p>No hay ventas registradas.</p>}
                    </div>
                  </>
                )}
              </>
            )}
          </section>
        ) : (
          <>
            <section id="inicio" className="hero">
              <div className="hero-copy">
                <p className="eyebrow">
                  <span className="tiny-line" /> ESTILO QUE TE ACOMPAÑA
                </p>
                <h1>
                  Tu camino.
                  <br />
                  Tu estilo.
                  <br />
                  <em>Tu próximo par.</em>
                </h1>
                <p className="hero-description">
                  De los días de siempre a los momentos que importan. Encuentra
                  el calzado que va contigo.
                </p>
                <a className="primary" href="#catalogo">
                  Explorar colección <ArrowUpRight size={19} />
                </a>
                <div className="hero-foot">
                  <span>01 / COMODIDAD SIN COMPLICACIONES</span>
                  <span>↓</span>
                </div>
              </div>
              <div className="hero-visual">
                <div className="hero-orbit" />
                <span className="vertical-label">
                  CANIZALES / CADA PASO CUENTA
                </span>
                <img
                  src={demoProducts[0].image_url}
                  alt="Zapatilla deportiva roja, fotografía ilustrativa de la colección"
                  fetchPriority="high"
                />
                <div className="hero-sticker">
                  BUEN ESTILO.
                  <br />
                  MEJORES PASOS.<span>↗</span>
                </div>
                <div className="image-caption">
                  <span>EL MOVIMIENTO EMPIEZA CONTIGO</span>
                  <span>★ ★ ★</span>
                </div>
              </div>
            </section>
            <div className="benefits">
              <span>
                <Package size={20} /> Opciones para toda la familia
              </span>
              <span>
                <ShoppingBag size={20} /> Tallas EU y US
              </span>
              <span>
                <MessageCircle size={20} /> Atención directa por WhatsApp
              </span>
            </div>
            <section id="catalogo" className="catalog">
              <div className="section-heading">
                <div>
                  <p className="eyebrow">ENCUENTRA TU FAVORITO</p>
                  <h2>
                    Pares con personalidad<span>.</span>
                  </h2>
                </div>
                <p>
                  Un estilo para cada paso.
                  <br />
                  Elige el tuyo.
                </p>
              </div>
              <div className="catalog-toolbar">
                <div className="tabs" aria-label="Categorías">
                  {["Todos", "Hombre", "Mujer", "Infantil"].map((c) => (
                    <button
                      className={category === c ? "active" : ""}
                      key={c}
                      onClick={() => setCategory(c)}
                    >
                      {c}
                    </button>
                  ))}
                </div>
                <label className="search">
                  <Search size={18} />
                  <input
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="Buscar tu próximo par"
                    aria-label="Buscar productos"
                  />
                </label>
              </div>
              <div className="product-grid">
                {shown.map((p, i) => (
                  <a
                    href={`#producto/${p.id}`}
                    className="product-card"
                    key={p.id}
                  >
                    <div className={`product-image tone-${i % 3}`}>
                      <span className="product-tag">
                        {p.category.toUpperCase()}
                      </span>
                      <img
                        src={p.image_url}
                        alt={p.name}
                        loading="lazy"
                        onError={(e) => {
                          e.currentTarget.style.visibility = "hidden";
                        }}
                      />
                      <span className="product-arrow">
                        <ArrowUpRight size={22} />
                      </span>
                    </div>
                    <div className="product-title">
                      <h3>{p.name}</h3>
                      <b>{money(p.price)}</b>
                    </div>
                    <p>
                      {p.code} <span>·</span>{" "}
                      {variants
                        .filter((v) => v.product_id === p.id)
                        .reduce((s, v) => s + v.stock, 0) > 0
                        ? "Disponible"
                        : "Agotado"}
                    </p>
                  </a>
                ))}
              </div>
              {loading && <p role="status">Cargando catálogo…</p>}
              {!loading && shown.length === 0 && (
                <div className="empty">
                  <Search />
                  <h3>No encontramos productos</h3>
                  <p>Prueba otra búsqueda o categoría.</p>
                </div>
              )}
              <p className="catalog-note">
                Selecciona un modelo para elegir talla y color y consultar por
                WhatsApp.
              </p>
            </section>
            <section id="nosotros" className="story">
              <span className="story-star">✳</span>
              <div>
                <p className="eyebrow">SOMOS ZAPATERÍA CANIZALES</p>
                <h2>
                  Los mejores caminos
                  <br />
                  empiezan con un buen par.
                </h2>
                <p>
                  Estilo para él, para ella y para los pequeños. Atención
                  cercana en Honduras y una conversación directa para encontrar
                  lo que buscas.
                </p>
              </div>
              <a
                href="https://wa.me/50498211001"
                target="_blank"
                rel="noreferrer"
                className="light-button"
              >
                Conversemos <ArrowUpRight size={20} />
              </a>
            </section>
          </>
        )}
      </main>
      <footer>
        <a href="#inicio" className="brand">
          CANIZALES<span className="footer-star">★</span>
        </a>
        <p>Honduras · Precios en lempiras</p>
        <a href="#admin">Administración</a>
        <small>Proyecto académico · Imágenes ilustrativas de Unsplash</small>
      </footer>
      {selected && !panel && (
        <div className="overlay">
          <section
            className="dialog product-dialog"
            role="dialog"
            aria-modal="true"
            aria-label={selected.name}
          >
            <button
              autoFocus
              className="close"
              aria-label="Cerrar producto"
              onClick={() => {
                location.hash = "catalogo";
              }}
            >
              <X />
            </button>
            <img
              className="detail-image"
              src={selected.image_url}
              alt={selected.name}
            />
            <div>
              <p className="eyebrow">
                {selected.category} / {selected.code}
              </p>
              <h2>{selected.name}</h2>
              <h3>{money(selected.price)}</h3>
              <p>{selected.description}</p>
              <label>
                Talla y color
                <select
                  value={variantId}
                  onChange={(e) => setVariantId(e.target.value)}
                >
                  <option value="">Selecciona una opción</option>
                  {variants
                    .filter((v) => v.product_id === selected.id)
                    .map((v) => (
                      <option key={v.id} value={v.id} disabled={v.stock === 0}>
                        {v.size} {v.system} · {v.color} ·{" "}
                        {v.stock > 0 ? `${v.stock} disponibles` : "Agotado"}
                      </option>
                    ))}
                </select>
              </label>
              <label>
                Cantidad
                <input
                  type="number"
                  min="1"
                  max={chosen?.stock || 1}
                  step="1"
                  value={quantity}
                  onChange={(e) => setQuantity(Number(e.target.value))}
                />
              </label>
              {chosen &&
              Number.isInteger(quantity) &&
              quantity > 0 &&
              quantity <= chosen.stock ? (
                <a
                  className="primary"
                  href={whatsappUrl(selected, chosen, quantity)}
                  target="_blank"
                  rel="noreferrer"
                >
                  <MessageCircle size={18} />
                  Consultar por WhatsApp
                </a>
              ) : (
                <button className="primary" disabled>
                  Elige talla, color y cantidad
                </button>
              )}
              <p className="fine">
                La consulta incluye el código y la variante exacta. El vendedor
                confirma precio y disponibilidad.
                {!db && " Producto ficticio de demostración."}
              </p>
            </div>
          </section>
        </div>
      )}
      {editing && admin && (
        <div className="overlay">
          <section
            className="dialog"
            role="dialog"
            aria-modal="true"
            aria-label="Editar producto"
          >
            <button
              className="close"
              aria-label="Cerrar"
              onClick={() => setEditing(null)}
            >
              <X />
            </button>
            <h2>{editing.id ? "Editar producto" : "Nuevo producto"}</h2>
            <form onSubmit={saveProduct}>
              <label>
                Código único
                <input
                  autoFocus
                  name="code"
                  maxLength={40}
                  required
                  defaultValue={editing.code}
                />
              </label>
              <label>
                Nombre
                <input
                  name="name"
                  maxLength={120}
                  required
                  defaultValue={editing.name}
                />
              </label>
              <label>
                Descripción
                <textarea
                  name="description"
                  defaultValue={editing.description}
                />
              </label>
              <div className="form-row">
                <label>
                  Categoría
                  <select name="category" defaultValue={editing.category}>
                    {["Hombre", "Mujer", "Infantil"].map((c) => (
                      <option key={c}>{c}</option>
                    ))}
                  </select>
                </label>
                <label>
                  Precio (HNL)
                  <input
                    name="price"
                    type="number"
                    min="0.01"
                    max="9999999999.99"
                    step="0.01"
                    required
                    defaultValue={editing.price || ""}
                  />
                </label>
              </div>
              <label>
                URL de fotografía HTTPS
                <input
                  name="image_url"
                  type="url"
                  required
                  defaultValue={editing.image_url}
                />
              </label>
              <label className="checkbox">
                <input
                  name="active"
                  type="checkbox"
                  defaultChecked={editing.active}
                />
                Publicado en el catálogo
              </label>
              <button disabled={busy} className="primary">
                Guardar producto
              </button>
            </form>
          </section>
        </div>
      )}
      {stockProduct && admin && (
        <div className="overlay">
          <section
            className="dialog wide"
            role="dialog"
            aria-modal="true"
            aria-label="Inventario"
          >
            <button
              className="close"
              aria-label="Cerrar inventario"
              onClick={() => setStockProduct(null)}
            >
              <X />
            </button>
            <h2>Inventario · {stockProduct.name}</h2>
            <p>Cada combinación de talla y color tiene un SKU único.</p>
            <div className="table-scroll">
              <table>
                <thead>
                  <tr>
                    <th>SKU</th>
                    <th>Talla / color</th>
                    <th>Stock</th>
                    <th>Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {variants
                    .filter((v) => v.product_id === stockProduct.id)
                    .map((v) => (
                      <tr key={v.id}>
                        <td>{v.sku}</td>
                        <td>
                          {v.size} {v.system} · {v.color}
                        </td>
                        <td>{v.stock}</td>
                        <td>
                          <button onClick={() => setEditVariant(v)}>
                            Editar
                          </button>
                          <button
                            className="danger"
                            disabled={busy}
                            onClick={() => void remove("variants", v.id)}
                          >
                            Eliminar
                          </button>
                        </td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>
            <form
              id="variant-form"
              key={editVariant?.id || "new"}
              onSubmit={saveVariant}
            >
              <h3>{editVariant ? "Editar variante" : "Añadir variante"}</h3>
              <div className="form-row">
                <label>
                  SKU
                  <input
                    name="sku"
                    required
                    maxLength={60}
                    defaultValue={editVariant?.sku}
                  />
                </label>
                <label>
                  Color
                  <input
                    name="color"
                    required
                    maxLength={40}
                    defaultValue={editVariant?.color}
                  />
                </label>
              </div>
              <div className="form-row">
                <label>
                  Talla
                  <input
                    name="size"
                    required
                    maxLength={12}
                    defaultValue={editVariant?.size}
                  />
                </label>
                <label>
                  Sistema
                  <select
                    name="system"
                    defaultValue={editVariant?.system || "EU"}
                  >
                    <option>EU</option>
                    <option>US</option>
                  </select>
                </label>
                <label>
                  Existencias
                  <input
                    name="stock"
                    required
                    type="number"
                    min="0"
                    max="2147483647"
                    step="1"
                    defaultValue={editVariant?.stock ?? 0}
                  />
                </label>
              </div>
              <button disabled={busy} className="primary">
                Guardar variante
              </button>
              {editVariant && (
                <button type="button" onClick={() => setEditVariant(null)}>
                  Cancelar edición
                </button>
              )}
            </form>
          </section>
        </div>
      )}
    </>
  );
}
