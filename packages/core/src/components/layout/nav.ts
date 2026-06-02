import { LayoutDashboard, ArrowLeftRight, Users, BarChart3, Settings } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

export interface NavItem {
  path: string;
  label: string;
  icon: LucideIcon;
}

export const NAV_ITEMS: NavItem[] = [
  { path: '/', label: 'Panel', icon: LayoutDashboard },
  { path: '/transactions', label: 'İşlemler', icon: ArrowLeftRight },
  { path: '/contacts', label: 'Kişiler & Firmalar', icon: Users },
  { path: '/reports', label: 'Raporlar', icon: BarChart3 },
  { path: '/settings', label: 'Ayarlar', icon: Settings },
];
