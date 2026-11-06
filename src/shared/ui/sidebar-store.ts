import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface SidebarState {
  collapsed: boolean;
  toggle: () => void;
}

/** Tablets start with the small one, as the kassa needs the width. */
export const useSidebarStore = create<SidebarState>()(
  persist(
    (set) => ({
      collapsed: window.innerWidth < 1280,
      toggle: () => set(({ collapsed }) => ({ collapsed: !collapsed })),
    }),
    { name: 'stolchi-sidebar' },
  ),
);
