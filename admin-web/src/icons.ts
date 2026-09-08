import { createElement } from 'react';
import {
  Sunrise,
  Moon,
  ArrowLeftRight,
  Coffee,
  DoorOpen,
  Sparkles,
  Package,
  ShieldCheck,
  Lock,
  Banknote,
  Boxes,
  Clipboard,
  Wine,
  Users,
  Trash2,
  AlertTriangle,
  Camera,
  ListChecks,
  Circle,
  type LucideIcon,
} from 'lucide-react';

/**
 * Canonical semantic icon vocabulary shared with the backend and mobile app.
 * Keys must match exactly across admin-web (lucide-react) and mobile-app (Ionicons).
 */
export const SEMANTIC_ICON_MAP: Record<string, LucideIcon> = {
  sunrise: Sunrise,
  moon: Moon,
  'shift-change': ArrowLeftRight,
  coffee: Coffee,
  door: DoorOpen,
  broom: Sparkles,
  package: Package,
  shield: ShieldCheck,
  lock: Lock,
  cash: Banknote,
  inventory: Boxes,
  clipboard: Clipboard,
  bar: Wine,
  restroom: Users,
  customers: Users,
  trash: Trash2,
  warning: AlertTriangle,
  camera: Camera,
  checklist: ListChecks,
};

export const DEFAULT_ICON: LucideIcon = Circle;

/** Human-readable Spanish labels for the icon picker. */
export const SEMANTIC_ICON_LABELS: Record<string, string> = {
  sunrise: 'Amanecer',
  moon: 'Luna',
  'shift-change': 'Cambio de turno',
  coffee: 'Café',
  door: 'Puerta',
  broom: 'Limpieza',
  package: 'Insumos',
  shield: 'Seguridad',
  lock: 'Cierre/Candado',
  cash: 'Caja',
  inventory: 'Inventario',
  clipboard: 'Pendientes',
  bar: 'Barra',
  restroom: 'Baños',
  customers: 'Clientes',
  trash: 'Basura',
  warning: 'Incidencia',
  camera: 'Cámara',
  checklist: 'Lista/Genérico',
};

export const SEMANTIC_ICON_KEYS = Object.keys(SEMANTIC_ICON_MAP);

export function getIconComponent(name: string | undefined | null): LucideIcon {
  if (!name) return DEFAULT_ICON;
  return SEMANTIC_ICON_MAP[name] || DEFAULT_ICON;
}

interface IconPreviewProps {
  name: string | undefined | null;
  size?: number;
  color?: string;
  strokeWidth?: number;
  className?: string;
}

/** Renders the vector icon for a given semantic icon key, falling back to a generic circle. */
export function IconPreview({ name, size = 20, color, strokeWidth, className }: IconPreviewProps) {
  const Icon = getIconComponent(name);
  return createElement(Icon, { size, color, strokeWidth, className });
}
