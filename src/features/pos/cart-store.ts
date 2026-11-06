import { create } from 'zustand';
import { useSessionStore } from '@/shared/auth/session-store';

export const MAX_QUANTITY = 999;

export interface CartLine {
  productId: string;
  quantity: number;
  note: string;
}

export type CartOrderType = 'DINE_IN' | 'TAKEAWAY';

/** One customer's order in the making. Names and prices come from the live menu. */
export interface CartDraft {
  /** Also the number the customer goes by on screen. Reused once free. */
  id: number;
  lines: CartLine[];
  type: CartOrderType;
  tableId: string;
}

interface CartState {
  /** Never empty: there is always a draft to add to. */
  drafts: CartDraft[];
  activeId: number;
  add: (productId: string) => void;
  setQuantity: (productId: string, quantity: number) => void;
  setNote: (productId: string, note: string) => void;
  setType: (type: CartOrderType) => void;
  setTableId: (tableId: string) => void;
  /** Sets the current customer aside and starts on another. */
  startNew: () => void;
  switchTo: (id: number) => void;
  /** Takes one draft away, and carries on with whoever is still waiting. */
  remove: (id: number) => void;
  clear: () => void;
}

const newDraft = (id: number): CartDraft => ({
  id,
  lines: [],
  type: 'DINE_IN',
  tableId: '',
});

const isEmpty = ({ lines, tableId }: CartDraft) =>
  lines.length === 0 && tableId === '';

const firstFreeId = (drafts: readonly CartDraft[]) => {
  let id = 1;
  while (drafts.some((draft) => draft.id === id)) id += 1;
  return id;
};

export const activeDraft = (
  state: Pick<CartState, 'drafts' | 'activeId'>,
): CartDraft =>
  state.drafts.find((draft) => draft.id === state.activeId) ?? state.drafts[0];

export const useCartStore = create<CartState>((set) => {
  const patchActive = (patch: (draft: CartDraft) => Partial<CartDraft>): void =>
    set(({ drafts, activeId }) => ({
      drafts: drafts.map((draft) =>
        draft.id === activeId ? { ...draft, ...patch(draft) } : draft,
      ),
    }));

  return {
    drafts: [newDraft(1)],
    activeId: 1,
    add: (productId) =>
      patchActive(({ lines }) => ({
        lines: lines.some((line) => line.productId === productId)
          ? lines.map((line) =>
              line.productId === productId
                ? {
                    ...line,
                    quantity: Math.min(line.quantity + 1, MAX_QUANTITY),
                  }
                : line,
            )
          : [...lines, { productId, quantity: 1, note: '' }],
      })),
    setQuantity: (productId, quantity) =>
      patchActive(({ lines }) => ({
        lines:
          quantity < 1
            ? lines.filter((line) => line.productId !== productId)
            : lines.map((line) =>
                line.productId === productId
                  ? { ...line, quantity: Math.min(quantity, MAX_QUANTITY) }
                  : line,
              ),
      })),
    setNote: (productId, note) =>
      patchActive(({ lines }) => ({
        lines: lines.map((line) =>
          line.productId === productId ? { ...line, note } : line,
        ),
      })),
    setType: (type) => patchActive(() => ({ type })),
    setTableId: (tableId) => patchActive(() => ({ tableId })),
    startNew: () =>
      set((state) => {
        // Nothing to set aside yet: this draft is already the new one.
        if (isEmpty(activeDraft(state))) return state;
        const id = firstFreeId(state.drafts);
        return {
          drafts: [...state.drafts, newDraft(id)].sort((a, b) => a.id - b.id),
          activeId: id,
        };
      }),
    switchTo: (id) =>
      set((state) => {
        if (id === state.activeId) return state;
        return {
          // A draft nobody started leaves no tab behind.
          drafts: state.drafts.filter(
            (draft) => draft.id !== state.activeId || !isEmpty(draft),
          ),
          activeId: id,
        };
      }),
    remove: (id) =>
      set((state) => {
        const drafts = state.drafts.filter((draft) => draft.id !== id);
        if (drafts.length === 0) return { drafts: [newDraft(1)], activeId: 1 };
        return {
          drafts,
          activeId:
            state.activeId === id
              ? (drafts[drafts.length - 1] as CartDraft).id
              : state.activeId,
        };
      }),
    clear: () => set({ drafts: [newDraft(1)], activeId: 1 }),
  };
});

/** The draft being worked on, along with what can be done to it. */
export function useActiveCart() {
  const state = useCartStore();
  return { ...state, ...activeDraft(state) };
}

// A shared tablet: the next person to sign in must not inherit these carts.
useSessionStore.subscribe((session) => {
  if (session.status === 'anonymous') useCartStore.getState().clear();
});
