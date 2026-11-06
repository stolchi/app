import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { OrderDto } from '@/shared/api/generated/model';
import '@/shared/i18n';
import uz from '@/shared/i18n/uz.json';
import { PaymentDialog } from './PaymentDialog';

const order = {
  id: 'o1',
  number: 7,
  displayNumber: '7',
  total: 200000,
  paidAmount: 0,
  payments: [],
} as unknown as OrderDto;

function setup(status = 201) {
  const sent: unknown[] = [];
  const onOpenChange = vi.fn();
  vi.stubGlobal(
    'fetch',
    vi.fn(async (_url: string, init?: RequestInit) => {
      sent.push(JSON.parse(String(init?.body)));
      return new Response(JSON.stringify(order), {
        status,
        headers: { 'Content-Type': 'application/json' },
      });
    }),
  );
  render(
    <QueryClientProvider client={new QueryClient()}>
      <PaymentDialog order={order} open onOpenChange={onOpenChange} />
    </QueryClientProvider>,
  );
  return { sent, onOpenChange };
}

const amountField = () => screen.getByRole('textbox');
const method = (name: RegExp) => screen.getByRole('button', { name });
const submit = () =>
  userEvent.click(screen.getByRole('button', { name: uz.orders.takePayment }));

describe('PaymentDialog', () => {
  afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
  });

  it('takes the whole amount in cash by default', async () => {
    const { sent, onOpenChange } = setup();
    await submit();
    await waitFor(() => expect(onOpenChange).toHaveBeenCalledWith(false));
    expect(sent).toEqual([{ payments: [{ method: 'CASH', amount: 200000 }] }]);
  });

  it('moves everything to the card when simply switched', async () => {
    const { sent } = setup();
    await userEvent.click(method(/Karta/));
    expect(amountField()).toHaveValue('200 000');
    await submit();
    await waitFor(() =>
      expect(sent).toEqual([
        { payments: [{ method: 'CARD', amount: 200000 }] },
      ]),
    );
  });

  it('fills in the rest on the card, and sends both at once', async () => {
    const { sent, onOpenChange } = setup();
    fireEvent.change(amountField(), { target: { value: '120000' } });
    await userEvent.click(method(/Karta/));

    expect(amountField()).toHaveValue('80 000');
    expect(method(/Karta/)).toHaveAttribute('aria-pressed', 'true');
    expect(method(/Naqd/)).toHaveTextContent('120 000');

    await submit();
    await waitFor(() => expect(onOpenChange).toHaveBeenCalledWith(false));
    expect(sent).toEqual([
      {
        payments: [
          { method: 'CASH', amount: 120000 },
          { method: 'CARD', amount: 80000 },
        ],
      },
    ]);
  });

  it('refuses more than what is owed', async () => {
    const { sent } = setup();
    fireEvent.change(amountField(), { target: { value: '300000' } });
    expect(
      screen.getByRole('button', { name: uz.orders.takePayment }),
    ).toBeDisabled();
    expect(sent).toEqual([]);
  });

  it('stays open when the payment fails', async () => {
    const { onOpenChange } = setup(409);
    await submit();
    expect(await screen.findByRole('alert')).toBeInTheDocument();
    expect(onOpenChange).not.toHaveBeenCalled();
    expect(amountField()).toHaveValue('200 000');
  });
});
