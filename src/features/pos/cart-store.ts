import { create } from 'zustand';
import type { ProductUnit } from '@/shared/api/generated/model';
import { useSessionStore } from '@/shared/auth/session-store';
import type { Point } from '@/shared/lib/geo';
import { MAX_GRAMS } from '@/shared/lib/quantity';

export const MAX_QUANTITY = 999;

export interface CartLine {
  /** The product, and its size when it has sizes: each size is its own line. */
  key: string;
  productId: string;
  variantId?: string;
  unit: ProductUnit;
  /** Pieces, or grams for KG. */
  quantity: number;
  note: string;
}

export const lineKey = (productId: string, variantId?: string) =>
  variantId ? `${productId}:${variantId}` : productId;

const maxOf = (unit: ProductUnit) => (unit === 'KG' ? MAX_GRAMS : MAX_QUANTITY);

export type CartOrderType = 'DINE_IN' | 'TAKEAWAY' | 'DELIVERY';

/** One customer's order in the making. Names and prices come from the live menu. */
export interface CartDraft {
  /** Also the number the customer goes by on screen. Reused once free. */
  id: number;
  lines: CartLine[];
  type: CartOrderType;
  tableId: string;
  /** Who a delivery goes to, as told on the phone. */
  customer: {
    phone: string;
    name: string;
    address: string;
    location: Point | null;
  };
}

interface CartState {
  /** Never empty: there is always a draft to add to. */
  drafts: CartDraft[];
  activeId: number;
  /** One more piece of a product, or of one of its sizes. */
  add: (productId: string, variantId?: string) => void;
  /** Sets the weight of a weighed product, in grams. */
  weigh: (productId: string, grams: number) => void;
  setQuantity: (key: string, quantity: number) => void;
  setNote: (key: string, note: string) => void;
  setType: (type: CartOrderType) => void;
  setTableId: (tableId: string) => void;
  setCustomer: (customer: Partial<CartDraft['customer']>) => void;
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
  customer: { phone: '', name: '', address: '', location: null },
});

const isEmpty = ({ lines, tableId, customer }: CartDraft) =>
  lines.length === 0 &&
  tableId === '' &&
  !customer.phone &&
  !customer.name &&
  !customer.address &&
  !customer.location;

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
    add: (productId, variantId) =>
      patchActive(({ lines }) => {
        const key = lineKey(productId, variantId);
        return {
          lines: lines.some((line) => line.key === key)
            ? lines.map((line) =>
                line.key === key
                  ? {
                      ...line,
                      quantity: Math.min(line.quantity + 1, MAX_QUANTITY),
                    }
                  : line,
              )
            : [
                ...lines,
                {
                  key,
                  productId,
                  ...(variantId && { variantId }),
                  unit: 'PIECE',
                  quantity: 1,
                  note: '',
                },
              ],
        };
      }),
    weigh: (productId, grams) =>
      patchActive(({ lines }) => {
        const quantity = Math.min(Math.max(grams, 1), MAX_GRAMS);
        return {
          lines: lines.some((line) => line.key === productId)
            ? lines.map((line) =>
                line.key === productId ? { ...line, quantity } : line,
              )
            : [
                ...lines,
                { key: productId, productId, unit: 'KG', quantity, note: '' },
              ],
        };
      }),
    setQuantity: (key, quantity) =>
      patchActive(({ lines }) => ({
        lines:
          quantity < 1
            ? lines.filter((line) => line.key !== key)
            : lines.map((line) =>
                line.key === key
                  ? { ...line, quantity: Math.min(quantity, maxOf(line.unit)) }
                  : line,
              ),
      })),
    setNote: (key, note) =>
      patchActive(({ lines }) => ({
        lines: lines.map((line) =>
          line.key === key ? { ...line, note } : line,
        ),
      })),
    setType: (type) => patchActive(() => ({ type })),
    setTableId: (tableId) => patchActive(() => ({ tableId })),
    setCustomer: (change) =>
      patchActive(({ customer }) => ({ customer: { ...customer, ...change } })),
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
