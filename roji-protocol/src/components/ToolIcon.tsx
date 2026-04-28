"use client";

import {
  Activity,
  BookOpen,
  Calculator,
  ClipboardList,
  Clock,
  DollarSign,
  ShieldCheck,
  TrendingUp,
  type LucideIcon,
} from "lucide-react";

import type { IconKey } from "@/lib/tools";

const ICONS: Record<IconKey, LucideIcon> = {
  calculator: Calculator,
  clock: Clock,
  shieldCheck: ShieldCheck,
  dollarSign: DollarSign,
  activity: Activity,
  trendingUp: TrendingUp,
  bookOpen: BookOpen,
  clipboardList: ClipboardList,
};

interface ToolIconProps {
  name: IconKey;
  /** Pixel size; defaults to 20px per spec. */
  size?: number;
  className?: string;
}

export function ToolIcon({ name, size = 20, className = "" }: ToolIconProps) {
  const Icon = ICONS[name];
  return (
    <Icon
      size={size}
      strokeWidth={1.5}
      className={className}
      aria-hidden="true"
    />
  );
}
