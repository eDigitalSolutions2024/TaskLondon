import { Ionicons } from "@expo/vector-icons";

export type IoniconName = keyof typeof Ionicons.glyphMap;

export const SEMANTIC_ICON_MAP: Record<string, IoniconName> = {
  // Turnos & Tiempos
  sunrise: "sunny-outline",
  sun: "sunny-outline",
  apertura: "sunny-outline",
  moon: "moon-outline",
  noche: "moon-outline",
  cierre: "moon-outline",
  "shift-change": "swap-horizontal-outline",

  // Café & Bebidas
  coffee: "cafe-outline",
  cafe: "cafe-outline",
  espresso: "cafe-outline",
  bar: "wine-outline",
  barra: "wine-outline",
  bebida: "wine-outline",
  water: "water-outline",
  agua: "water-outline",

  // Comida & Cocina
  restaurant: "restaurant-outline",
  cocina: "restaurant-outline",
  alimentos: "restaurant-outline",
  pan: "nutrition-outline",
  croissant: "nutrition-outline",
  muffin: "nutrition-outline",

  // Limpieza & Sanitización
  broom: "sparkles-outline",
  limpieza: "sparkles-outline",
  sanitizar: "sparkles-outline",
  aseo: "sparkles-outline",
  trash: "trash-outline",
  basura: "trash-outline",

  // Temperaturas & Refrigeración
  thermometer: "thermometer-outline",
  temperatura: "thermometer-outline",
  refrigerador: "snow-outline",
  frio: "snow-outline",
  hielo: "snow-outline",

  // Caja & Dinero
  cash: "cash-outline",
  caja: "cash-outline",
  dinero: "cash-outline",
  corte: "receipt-outline",
  venta: "card-outline",

  // Seguridad & Cierres
  shield: "shield-checkmark-outline",
  seguridad: "shield-checkmark-outline",
  lock: "lock-closed-outline",
  candado: "lock-closed-outline",
  door: "log-in-outline",
  puerta: "log-in-outline",

  // Inventario & Insumos
  package: "cube-outline",
  paquete: "cube-outline",
  insumos: "cube-outline",
  inventory: "file-tray-stacked-outline",
  inventario: "file-tray-stacked-outline",
  stock: "file-tray-stacked-outline",

  // Revisión & Calidad
  checklist: "checkmark-done-outline",
  clipboard: "clipboard-outline",
  revision: "clipboard-outline",
  auditoria: "shield-checkmark-outline",
  camera: "camera-outline",
  foto: "camera-outline",
  warning: "warning-outline",
  alerta: "alert-circle-outline",

  // Personas & Baños
  customers: "people-outline",
  clientes: "people-outline",
  personal: "person-outline",
  restroom: "male-female-outline",
  banos: "male-female-outline",
};

export const SEMANTIC_ICON_LIST: Array<{ key: string; label: string }> = [
  { key: "sunrise", label: "Apertura / Mañana" },
  { key: "moon", label: "Cierre / Noche" },
  { key: "coffee", label: "Café / Espresso" },
  { key: "bar", label: "Barra / Bebidas" },
  { key: "restaurant", label: "Cocina / Alimentos" },
  { key: "broom", label: "Limpieza / Aseo" },
  { key: "thermometer", label: "Temperaturas / Frío" },
  { key: "cash", label: "Caja / Cobro" },
  { key: "package", label: "Insumos / Bodega" },
  { key: "inventory", label: "Inventario" },
  { key: "lock", label: "Candado / Seguridad" },
  { key: "door", label: "Puerta / Acceso" },
  { key: "restroom", label: "Baños" },
  { key: "customers", label: "Clientes / Salón" },
  { key: "trash", label: "Basura" },
  { key: "camera", label: "Fotografía" },
  { key: "checklist", label: "Lista / Revisión" },
];

export const DEFAULT_ICON: IoniconName = "checkmark-circle-outline";

// Deduce inteligentemente el icono contextual analizando el nombre o texto
export function resolveSemanticIcon(keyOrName?: string | null, contextText?: string | null): IoniconName {
  const normalizedKey = (keyOrName || "").trim().toLowerCase();

  // 1. Si coincide directamente con el mapa
  if (normalizedKey && SEMANTIC_ICON_MAP[normalizedKey]) {
    return SEMANTIC_ICON_MAP[normalizedKey];
  }

  // 2. Si no, analizar el texto combinado (key + contextText)
  const fullText = `${normalizedKey} ${(contextText || "").toLowerCase()}`;

  if (fullText.includes("apertura") || fullText.includes("matutin") || fullText.includes("iniciar") || fullText.includes("abrir")) {
    return "sunny-outline";
  }
  if (fullText.includes("cierre") || fullText.includes("nocturn") || fullText.includes("cerrar") || fullText.includes("noche")) {
    return "moon-outline";
  }
  if (fullText.includes("cafe") || fullText.includes("café") || fullText.includes("espresso") || fullText.includes("molino") || fullText.includes("prensa") || fullText.includes("latte") || fullText.includes("capuchino")) {
    return "cafe-outline";
  }
  if (fullText.includes("barra") || fullText.includes("mostrador") || fullText.includes("bebida") || fullText.includes("jarabe") || fullText.includes("licuadora")) {
    return "wine-outline";
  }
  if (fullText.includes("limpi") || fullText.includes("sanitiz") || fullText.includes("aseo") || fullText.includes("lavad") || fullText.includes("trapear") || fullText.includes("desinfect")) {
    return "sparkles-outline";
  }
  if (fullText.includes("temperatura") || fullText.includes("refrigerador") || fullText.includes("congelador") || fullText.includes("frio") || fullText.includes("frío") || fullText.includes("hielo") || fullText.includes("leche")) {
    return "thermometer-outline";
  }
  if (fullText.includes("cocina") || fullText.includes("alimento") || fullText.includes("pan") || fullText.includes("croissant") || fullText.includes("muffin") || fullText.includes("reposteria") || fullText.includes("comida")) {
    return "restaurant-outline";
  }
  if (fullText.includes("caja") || fullText.includes("dinero") || fullText.includes("efectivo") || fullText.includes("corte") || fullText.includes("venta") || fullText.includes("ticket") || fullText.includes("terminal")) {
    return "cash-outline";
  }
  if (fullText.includes("seguridad") || fullText.includes("candado") || fullText.includes("cerradura") || fullText.includes("llave") || fullText.includes("alarma") || fullText.includes("puerta")) {
    return "lock-closed-outline";
  }
  if (fullText.includes("insumo") || fullText.includes("bodega") || fullText.includes("almacen") || fullText.includes("almacén") || fullText.includes("paquete") || fullText.includes("entrega") || fullText.includes("stock") || fullText.includes("inventario")) {
    return "cube-outline";
  }
  if (fullText.includes("baño") || fullText.includes("bano") || fullText.includes("sanitario") || fullText.includes("wc") || fullText.includes("lavabo")) {
    return "male-female-outline";
  }
  if (fullText.includes("basura") || fullText.includes("desecho") || fullText.includes("merma") || fullText.includes("bote")) {
    return "trash-outline";
  }
  if (fullText.includes("foto") || fullText.includes("fotografía") || fullText.includes("fotografia") || fullText.includes("evidencia") || fullText.includes("imagen") || fullText.includes("camara")) {
    return "camera-outline";
  }
  if (fullText.includes("cliente") || fullText.includes("servicio") || fullText.includes("mesa") || fullText.includes("salon") || fullText.includes("salón") || fullText.includes("terraza")) {
    return "people-outline";
  }
  if (fullText.includes("auditoria") || fullText.includes("revis") || fullText.includes("verific") || fullText.includes("control") || fullText.includes("calidad") || fullText.includes("supervis")) {
    return "shield-checkmark-outline";
  }

  return DEFAULT_ICON;
}
