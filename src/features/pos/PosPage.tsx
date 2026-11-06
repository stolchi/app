import { useQueryClient } from '@tanstack/react-query';
import {
  ArrowRight,
  Armchair,
  BellRing,
  ChefHat,
  Minus,
  Plus,
  Search,
  ShoppingBag,
  ShoppingCart,
  UtensilsCrossed,
  X,
} from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';
import { useMemo, useRef, useState, type MouseEvent } from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import { OrderDialog } from '@/features/orders/OrderDialog';
import { mayTakePayment } from '@/features/orders/order-rules';
import { SourceBadge } from '@/features/orders/SourceBadge';
import { StatusBadge } from '@/features/orders/StatusBadge';
import { TablePicker } from '@/features/orders/TablePicker';
import { useTables } from '@/features/orders/use-tables';
import { useCategoriesControllerList } from '@/shared/api/generated/categories/categories';
import {
  useOrdersControllerCreate,
  useOrdersControllerList,
} from '@/shared/api/generated/orders/orders';
import { useProductsControllerList } from '@/shared/api/generated/products/products';
import type { OrderDto, ProductDto } from '@/shared/api/generated/model';
import { ApiPath, invalidate } from '@/shared/api/invalidate';
import { usePermissions, useSessionStore } from '@/shared/auth/session-store';
import { playChime } from '@/shared/lib/chime';
import { useShortcuts } from '@/shared/lib/use-shortcuts';
import { formatMoney, formatTime } from '@/shared/lib/format';
import { AnimatedNumber } from '@/shared/motion/AnimatedNumber';
import { SPRING } from '@/shared/motion/variants';
import { useSocketEvent } from '@/shared/realtime/RealtimeProvider';
import { celebrate } from '@/shared/ui/Celebration';
import { EmptyState } from '@/shared/ui/EmptyState';
import { ErrorText } from '@/shared/ui/ErrorText';
import { FoodThumb } from '@/shared/ui/FoodThumb';
import { QueryState } from '@/shared/ui/QueryState';
import { Segmented } from '@/shared/ui/Segmented';
import { SoundHint } from '@/shared/ui/SoundHint';
import { activeDraft, useActiveCart, useCartStore } from './cart-store';
import { DraftTabs } from './DraftTabs';
import { flyToCart } from './fly-to-cart';

const ACTIVE_ORDERS = { active: true, limit: 100 } as const;

function flyPictureOf(tile: Element | null | undefined) {
  const picture = tile?.querySelector<HTMLElement>('[data-fly-thumb]');
  if (picture) flyToCart(picture);
}

function ProductTile({ product }: { product: ProductDto }) {
  const { t } = useTranslation();
  const add = useCartStore((state) => state.add);
  const inCart = useCartStore(
    (state) =>
      activeDraft(state).lines.find((line) => line.productId === product.id)
        ?.quantity,
  );

  const onClick = (event: MouseEvent<HTMLButtonElement>) => {
    add(product.id);
    navigator.vibrate?.(8);
    const picture =
      event.currentTarget.querySelector<HTMLElement>('[data-fly-thumb]');
    if (picture) flyToCart(picture);
  };

  return (
    <motion.button
      layout
      type="button"
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.9 }}
      whileHover={product.isAvailable ? { y: -3 } : undefined}
      whileTap={product.isAvailable ? { scale: 0.93 } : undefined}
      transition={SPRING}
      disabled={!product.isAvailable}
      data-product-id={product.id}
      aria-label={`${product.name}, ${
        product.isAvailable ? formatMoney(product.price) : t('menu.soldOut')
      }`}
      onClick={onClick}
      className="group relative flex flex-col overflow-hidden rounded-2xl border bg-card text-left shadow-xs outline-none hover:shadow-md focus-visible:ring-3 focus-visible:ring-ring/50 disabled:cursor-not-allowed"
    >
      <span className="relative block">
        <FoodThumb
          flyable
          name={product.name}
          imageUrl={product.imageUrl}
          className={cn(
            'aspect-[4/3] w-full text-4xl',
            !product.isAvailable && 'opacity-40 grayscale',
          )}
        />
        {product.isAvailable ? (
          <span className="absolute right-2 bottom-2 flex size-9 items-center justify-center rounded-full bg-card text-primary shadow-md transition-transform group-hover:scale-110">
            <Plus className="size-5" />
          </span>
        ) : (
          <span className="absolute inset-x-0 top-1/2 -translate-y-1/2 -rotate-6 bg-foreground py-1 text-center text-sm font-semibold text-background">
            {t('menu.soldOut')}
          </span>
        )}
      </span>
      <span className="flex flex-1 flex-col justify-between gap-1 p-3">
        <span className="leading-tight font-semibold">{product.name}</span>
        <span className="text-sm font-medium text-muted-foreground">
          {formatMoney(product.price)}
        </span>
      </span>
      <AnimatePresence>
        {inCart && (
          <motion.span
            key={inCart}
            initial={{ scale: 0.4 }}
            animate={{ scale: 1 }}
            exit={{ scale: 0 }}
            transition={{ type: 'spring', stiffness: 600, damping: 16 }}
            className="absolute top-2 right-2 flex size-8 items-center justify-center rounded-full bg-primary text-sm font-bold text-primary-foreground shadow-md"
          >
            {inCart}
          </motion.span>
        )}
      </AnimatePresence>
    </motion.button>
  );
}

function Cart({
  products,
  onSent,
}: {
  products: ProductDto[];
  /** `othersWaiting`: another customer's draft is there to carry on with. */
  onSent: (order: OrderDto, othersWaiting: boolean) => void;
}) {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const { tables } = useTables();
  const cart = useActiveCart();
  const createOrder = useOrdersControllerCreate();
  const [pickingTable, setPickingTable] = useState(false);

  // A product deleted from the menu meanwhile simply drops out of the cart.
  const lines = cart.lines.flatMap((line) => {
    const product = products.find(({ id }) => id === line.productId);
    return product ? [{ ...line, product }] : [];
  });
  const total = lines.reduce(
    (sum, { product, quantity }) => sum + product.price * quantity,
    0,
  );
  const soldOut = lines.filter(({ product }) => !product.isAvailable);
  const table = tables.find(({ id }) => id === cart.tableId);
  const tableSelected = cart.type === 'TAKEAWAY' || table !== undefined;
  const canSend =
    lines.length > 0 &&
    soldOut.length === 0 &&
    tableSelected &&
    !createOrder.isPending;

  const send = () => {
    if (!canSend) return;
    // By the time the answer comes, the user may be serving someone else.
    const draftId = cart.id;
    createOrder.mutate(
      {
        data: {
          type: cart.type,
          ...(cart.type === 'DINE_IN' && { tableId: cart.tableId }),
          items: lines.map(({ productId, quantity, note }) => ({
            productId,
            quantity,
            ...(note.trim() && { note: note.trim() }),
          })),
        },
      },
      {
        onSuccess: (order) => {
          cart.remove(draftId);
          void invalidate(queryClient, ApiPath.orders, ApiPath.dashboard);
          celebrate(t('pos.sentMessage', { number: order.displayNumber }));
          onSent(order, activeDraft(useCartStore.getState()).lines.length > 0);
        },
      },
    );
  };

  useShortcuts({
    'ctrl+enter': send,
    s: () => {
      if (cart.type === 'DINE_IN') setPickingTable(true);
    },
    t: () => cart.setType(cart.type === 'DINE_IN' ? 'TAKEAWAY' : 'DINE_IN'),
    n: cart.startNew,
  });

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="space-y-2 border-b p-3">
        <DraftTabs className="hidden md:flex" />
        <Segmented
          id="order-type"
          value={cart.type}
          onChange={cart.setType}
          options={[
            {
              value: 'DINE_IN',
              label: t('orders.type.DINE_IN'),
              icon: <UtensilsCrossed />,
            },
            {
              value: 'TAKEAWAY',
              label: t('orders.type.TAKEAWAY'),
              icon: <ShoppingBag />,
            },
          ]}
          itemClassName="flex-1"
        />
        {cart.type === 'DINE_IN' && (
          <Button
            variant={table ? 'secondary' : 'outline'}
            className="h-12 w-full justify-between px-4 text-base"
            onClick={() => setPickingTable(true)}
          >
            <span className="flex items-center gap-2">
              <Armchair />
              {table?.name ?? t('pos.chooseTable')}
            </span>
            <ArrowRight />
          </Button>
        )}
      </div>

      <ul className="min-h-0 flex-1 overflow-x-hidden overflow-y-auto">
        <AnimatePresence initial={false} mode="popLayout">
          {lines.length === 0 && (
            <motion.li
              key="empty"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="p-4"
            >
              <EmptyState icon={ShoppingCart}>{t('pos.emptyCart')}</EmptyState>
            </motion.li>
          )}
          {lines.map(({ productId, quantity, note, product }) => (
            <motion.li
              key={productId}
              layout
              initial={{ opacity: 0, x: 40 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 60 }}
              transition={SPRING}
              className="space-y-2 border-b p-3"
            >
              <div className="flex items-center gap-3">
                <FoodThumb
                  name={product.name}
                  imageUrl={product.imageUrl}
                  className="size-11 shrink-0 rounded-xl text-lg"
                />
                <span className="min-w-0 flex-1 truncate font-semibold">
                  {product.name}
                </span>
                <span className="text-sm font-medium whitespace-nowrap">
                  {formatMoney(product.price * quantity)}
                </span>
              </div>
              {!product.isAvailable && (
                <p className="text-sm text-destructive">{t('menu.soldOut')}</p>
              )}
              <div className="flex items-center gap-2">
                <div className="flex items-center rounded-xl bg-muted">
                  <Button
                    variant="ghost"
                    className="size-11"
                    aria-label={t('pos.decrease', { name: product.name })}
                    onClick={() => cart.setQuantity(productId, quantity - 1)}
                  >
                    <Minus />
                  </Button>
                  <span className="w-7 overflow-hidden text-center font-bold">
                    <motion.span
                      key={quantity}
                      className="block"
                      initial={{ y: -12, opacity: 0 }}
                      animate={{ y: 0, opacity: 1 }}
                      transition={SPRING}
                    >
                      {quantity}
                    </motion.span>
                  </span>
                  <Button
                    variant="ghost"
                    className="size-11"
                    aria-label={t('pos.increase', { name: product.name })}
                    onClick={() => cart.setQuantity(productId, quantity + 1)}
                  >
                    <Plus />
                  </Button>
                </div>
                <Input
                  className="h-11 min-w-0 flex-1 rounded-xl"
                  placeholder={t('pos.notePlaceholder')}
                  aria-label={t('pos.noteFor', { name: product.name })}
                  maxLength={500}
                  value={note}
                  onChange={(event) =>
                    cart.setNote(productId, event.target.value)
                  }
                />
              </div>
            </motion.li>
          ))}
        </AnimatePresence>
      </ul>

      <div className="space-y-2 border-t bg-card p-3">
        <ErrorText error={createOrder.error} />
        <div className="flex items-baseline justify-between">
          <span className="font-medium text-muted-foreground">
            {t('orders.total')}
          </span>
          <span className="font-heading text-2xl font-bold">
            <AnimatedNumber value={total} format={formatMoney} />
          </span>
        </div>
        <Button
          className="h-14 w-full text-lg"
          disabled={!canSend}
          onClick={send}
        >
          <ChefHat className="size-5" />
          {t('pos.send')}
        </Button>
        {lines.length > 0 && !tableSelected && (
          <p className="text-center text-sm text-muted-foreground">
            {t('pos.chooseTableHint')}
          </p>
        )}
      </div>
      <TablePicker
        open={pickingTable}
        onOpenChange={setPickingTable}
        title={t('pos.chooseTable')}
        selectedId={cart.tableId}
        onSelect={(id) => {
          cart.setTableId(id);
          setPickingTable(false);
        }}
      />
    </div>
  );
}

function ActiveOrders({
  onOpen,
  canFilterMine,
}: {
  onOpen: (id: string) => void;
  canFilterMine: boolean;
}) {
  const { t } = useTranslation();
  const { placeOf } = useTables();
  const [whose, setWhose] = useState<'mine' | 'all'>('mine');
  const mine = canFilterMine && whose === 'mine';
  const orders = useOrdersControllerList({
    ...ACTIVE_ORDERS,
    ...(mine && { mine: true }),
  });
  const filter = canFilterMine && (
    <div className="shrink-0 border-b p-2">
      <Segmented
        id="pos-orders-whose"
        value={whose}
        onChange={setWhose}
        itemClassName="flex-1"
        options={[
          { value: 'mine', label: t('waiter.mine') },
          { value: 'all', label: t('waiter.all') },
        ]}
      />
    </div>
  );

  if (!orders.data) {
    return (
      <>
        {filter}
        <QueryState
          isPending={orders.isPending}
          error={orders.error}
          refetch={orders.refetch}
        />
      </>
    );
  }
  if (orders.data.items.length === 0) {
    return (
      <>
        {filter}
        <div className="p-4">
          <EmptyState icon={ChefHat}>{t('pos.noActiveOrders')}</EmptyState>
        </div>
      </>
    );
  }
  return (
    <>
      {filter}
      <ul className="min-h-0 flex-1 space-y-2 overflow-x-hidden overflow-y-auto p-3">
        <AnimatePresence initial={false} mode="popLayout">
          {orders.data.items.map((order) => (
            <motion.li
              key={order.id}
              layout
              initial={{ opacity: 0, x: 40, scale: 0.96 }}
              animate={{ opacity: 1, x: 0, scale: 1 }}
              exit={{ opacity: 0, x: -40 }}
              transition={SPRING}
            >
              <motion.button
                type="button"
                whileTap={{ scale: 0.98 }}
                onClick={() => onOpen(order.id)}
                className={cn(
                  'w-full space-y-1 rounded-2xl border bg-card p-3 text-left shadow-xs outline-none hover:shadow-md focus-visible:ring-3 focus-visible:ring-ring/50',
                  order.status === 'NEW' && 'border-primary/50',
                  order.status === 'READY' && 'border-2 border-emerald-500',
                )}
              >
                <span className="flex items-center justify-between gap-2">
                  <span className="flex items-center gap-2">
                    <span className="font-heading text-lg font-bold">
                      {t('orders.title', { number: order.displayNumber })}
                    </span>
                    <SourceBadge source={order.source} />
                  </span>
                  <StatusBadge status={order.status} />
                </span>
                <span className="flex justify-between gap-2 text-sm text-muted-foreground">
                  <span>
                    {placeOf(order)} · {t(`orders.source.${order.source}`)} ·{' '}
                    {formatTime(order.createdAt)}
                  </span>
                  <span className="font-medium whitespace-nowrap text-foreground">
                    {formatMoney(order.total)}
                  </span>
                </span>
              </motion.button>
            </motion.li>
          ))}
        </AnimatePresence>
      </ul>
    </>
  );
}

interface OrderToast {
  id: string;
  text: string;
}

/** Announces a customer's order, or a ready one, wherever the user is looking. */
function NewOrderToasts({
  toasts,
  onOpen,
  onDismiss,
}: {
  toasts: OrderToast[];
  onOpen: (id: string) => void;
  onDismiss: (id: string) => void;
}) {
  const { t } = useTranslation();
  return (
    <div className="pointer-events-none fixed top-16 right-3 z-40 flex w-[min(22rem,calc(100vw-1.5rem))] flex-col gap-2">
      <AnimatePresence>
        {toasts.map((order) => (
          <motion.div
            key={order.id}
            layout
            role="status"
            initial={{ opacity: 0, x: 80, scale: 0.9 }}
            animate={{ opacity: 1, x: 0, scale: 1 }}
            exit={{ opacity: 0, x: 80 }}
            transition={SPRING}
            className="pointer-events-auto flex items-center gap-2 rounded-2xl bg-foreground p-2 pl-3 text-background shadow-2xl"
          >
            <BellRing className="size-5 shrink-0 text-amber-300" />
            <button
              type="button"
              className="min-h-11 min-w-0 flex-1 text-left text-sm font-medium"
              onClick={() => {
                onDismiss(order.id);
                onOpen(order.id);
              }}
            >
              {order.text}
            </button>
            <button
              type="button"
              aria-label={t('pos.dismiss')}
              className="flex size-11 items-center justify-center rounded-xl hover:bg-white/10"
              onClick={() => onDismiss(order.id)}
            >
              <X className="size-4" />
            </button>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}

type Panel = 'menu' | 'cart' | 'orders';

/** `waiter` is the same screen without the till, for staff who only take orders. */
export function PosPage({
  variant = 'cashier',
}: {
  variant?: 'cashier' | 'waiter';
}) {
  const { t } = useTranslation();
  const permissions = usePermissions();
  const userId = useSessionStore((state) => state.user?.id);
  const categories = useCategoriesControllerList();
  const products = useProductsControllerList();
  const activeOrders = useOrdersControllerList(ACTIVE_ORDERS);
  const cartCount = useCartStore((state) =>
    activeDraft(state).lines.reduce((sum, line) => sum + line.quantity, 0),
  );
  const cartLines = useCartStore((state) => activeDraft(state).lines);
  const [categoryId, setCategoryId] = useState('all');
  const [panel, setPanel] = useState<Panel>('menu');
  const [openOrderId, setOpenOrderId] = useState<string | null>(null);
  const [toasts, setToasts] = useState<OrderToast[]>([]);
  const [query, setQuery] = useState('');
  const searchField = useRef<HTMLInputElement>(null);
  const addToCart = useCartStore((state) => state.add);

  useShortcuts({
    '/': () => {
      setPanel('menu');
      searchField.current?.focus();
    },
    b: () => setPanel((current) => (current === 'orders' ? 'cart' : 'orders')),
  });

  const dismissToast = (id: string) =>
    setToasts((current) => current.filter((order) => order.id !== id));
  const announce = (id: string, text: string) => {
    playChime();
    setToasts((current) => [
      ...current.filter((toast) => toast.id !== id),
      { id, text },
    ]);
    setTimeout(() => dismissToast(id), 8000);
  };

  // Staff place their own orders here. Only orders from customers need announcing.
  useSocketEvent<OrderDto>('order.created', (order) => {
    if (order.source === 'POS') return;
    announce(
      order.id,
      t('pos.newOrderToast', {
        source: t(`orders.source.${order.source}`),
        number: order.displayNumber,
      }),
    );
  });

  // Whoever took the order carries it out, and can't watch the kitchen meanwhile.
  useSocketEvent<OrderDto>('order.status_changed', (order) => {
    if (
      variant === 'waiter' &&
      order.status === 'READY' &&
      order.createdById === userId
    ) {
      announce(
        order.id,
        t('waiter.readyToast', { number: order.displayNumber }),
      );
    }
  });

  const activeCategories = useMemo(
    () => (categories.data ?? []).filter((category) => category.isActive),
    [categories.data],
  );
  const shownProducts = useMemo(() => {
    const ids = new Set(activeCategories.map(({ id }) => id));
    const wanted = query.trim().toLowerCase();
    return (products.data ?? []).filter((product) =>
      wanted
        ? // A search looks through the whole menu, whichever category is open.
          ids.has(product.categoryId) &&
          product.name.toLowerCase().includes(wanted)
        : categoryId === 'all'
          ? ids.has(product.categoryId)
          : product.categoryId === categoryId,
    );
  }, [products.data, activeCategories, categoryId, query]);

  if (!categories.data || !products.data) {
    return (
      <QueryState
        isPending={categories.isPending || products.isPending}
        error={categories.error ?? products.error}
        refetch={() => {
          void categories.refetch();
          void products.refetch();
        }}
      />
    );
  }

  const orderCount = activeOrders.data?.items.length ?? 0;
  const newOrders =
    activeOrders.data?.items.filter((order) => order.status === 'NEW').length ??
    0;
  const cartTotal = cartLines.reduce((sum, line) => {
    const product = products.data.find(({ id }) => id === line.productId);
    return sum + (product?.price ?? 0) * line.quantity;
  }, 0);
  const sidePanel = panel === 'orders' ? 'orders' : 'cart';
  const counted = (label: string, count: number) =>
    count > 0 ? `${label} (${count})` : label;
  const ordersLabel = (
    <>
      {counted(t('pos.panels.orders'), orderCount)}
      {newOrders > 0 && (
        <span className="inline-flex size-5 animate-pulse items-center justify-center rounded-full bg-primary text-xs text-primary-foreground">
          {newOrders}
        </span>
      )}
    </>
  );

  return (
    <div className="flex h-full flex-col md:flex-row">
      {/* On a phone the three parts take turns; on a tablet menu and side panel share the screen. */}
      <div className="shrink-0 border-b bg-card p-2 md:hidden">
        <Segmented
          id="pos-panel-phone"
          value={panel}
          onChange={setPanel}
          options={[
            { value: 'menu', label: t('pos.panels.menu') },
            {
              value: 'cart',
              label: counted(t('pos.panels.cart'), cartCount),
            },
            {
              value: 'orders',
              label: counted(t('pos.panels.ordersShort'), orderCount),
            },
          ]}
          itemClassName="flex-1 px-1.5"
        />
        {panel !== 'orders' && <DraftTabs className="mt-2" />}
      </div>

      <section
        className={cn(
          'relative min-h-0 min-w-0 flex-1 flex-col md:flex',
          panel === 'menu' ? 'flex' : 'hidden',
        )}
      >
        <div className="shrink-0 space-y-2 border-b bg-card p-2">
          <div className="relative">
            <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              ref={searchField}
              type="search"
              aria-label={t('pos.searchProduct')}
              placeholder={t('pos.searchProduct')}
              className="h-11 rounded-xl pl-9 text-base md:text-base"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === 'Escape') {
                  setQuery('');
                } else if (event.key === 'Enter') {
                  event.preventDefault();
                  const first = shownProducts.find(
                    (product) => product.isAvailable,
                  );
                  if (!first) return;
                  addToCart(first.id);
                  flyPictureOf(
                    document.querySelector(`[data-product-id="${first.id}"]`),
                  );
                  setQuery('');
                }
              }}
            />
          </div>
          <div className="overflow-x-auto [scrollbar-width:none]">
            <Segmented
              id="pos-category"
              tone="solid"
              value={categoryId}
              onChange={setCategoryId}
              className="w-max min-w-full"
              itemClassName="text-base"
              options={[
                { value: 'all', label: t('pos.allCategories') },
                ...activeCategories.map((category) => ({
                  value: category.id,
                  label: category.name,
                })),
              ]}
            />
          </div>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto p-3 pb-24 md:pb-3">
          {shownProducts.length === 0 ? (
            <EmptyState icon={UtensilsCrossed}>
              {t('pos.noProducts')}
            </EmptyState>
          ) : (
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-4">
              <AnimatePresence mode="popLayout" initial={false}>
                {shownProducts.map((product) => (
                  <ProductTile key={product.id} product={product} />
                ))}
              </AnimatePresence>
            </div>
          )}
        </div>
        <AnimatePresence>
          {cartCount > 0 && (
            <motion.div
              className="absolute inset-x-3 bottom-3 md:hidden"
              initial={{ y: 80, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 80, opacity: 0 }}
              transition={SPRING}
            >
              <button
                type="button"
                data-cart-target
                aria-label={t('pos.openCart')}
                onClick={() => setPanel('cart')}
                className="flex h-14 w-full items-center justify-between rounded-2xl bg-primary px-4 font-semibold text-primary-foreground shadow-xl shadow-primary/30"
              >
                <span className="flex items-center gap-2">
                  <ShoppingCart className="size-5" />
                  {t('pos.itemsInCart', { count: cartCount })}
                </span>
                <span>
                  <AnimatedNumber value={cartTotal} format={formatMoney} />
                </span>
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </section>

      <aside
        className={cn(
          'min-h-0 flex-1 flex-col bg-card md:flex md:w-[22rem] md:flex-none md:border-l lg:w-[26rem]',
          panel === 'menu' ? 'hidden' : 'flex',
        )}
      >
        <div className="hidden shrink-0 border-b p-2 md:block">
          <Segmented
            id="pos-panel-side"
            value={sidePanel}
            onChange={setPanel}
            itemClassName="flex-1 px-1"
            options={[
              {
                value: 'cart',
                label: counted(t('pos.panels.cart'), cartCount),
                icon: <ShoppingCart />,
                cartTarget: true,
              },
              { value: 'orders', label: ordersLabel },
            ]}
          />
        </div>
        {sidePanel === 'cart' ? (
          <Cart
            products={products.data}
            onSent={(order, othersWaiting) => {
              setPanel(othersWaiting ? 'cart' : 'orders');
              if (mayTakePayment(permissions)) setOpenOrderId(order.id);
            }}
          />
        ) : (
          <ActiveOrders
            onOpen={setOpenOrderId}
            canFilterMine={variant === 'waiter'}
          />
        )}
      </aside>
      <SoundHint />
      <NewOrderToasts
        toasts={toasts}
        onOpen={setOpenOrderId}
        onDismiss={dismissToast}
      />
      <OrderDialog orderId={openOrderId} onClose={() => setOpenOrderId(null)} />
    </div>
  );
}
