import { cleanup, render, screen } from '@testing-library/react';
import '@/shared/i18n';
import { TopProductsChart } from './TopProductsChart';

const products = [
  { productId: 'a', name: 'Osh', quantity: 12 },
  { productId: 'b', name: 'Choy', quantity: 6 },
  { productId: null, name: "O'chirilgan taom", quantity: 3 },
];

describe('TopProductsChart', () => {
  afterEach(cleanup);

  it('names each product with its amount, in the given order', () => {
    render(<TopProductsChart products={products} />);
    expect(
      screen
        .getAllByRole('listitem')
        .map((item) => item.getAttribute('aria-label')),
    ).toEqual([
      'Osh: 12 ta sotildi',
      'Choy: 6 ta sotildi',
      "O'chirilgan taom: 3 ta sotildi",
    ]);
  });

  it('sizes the columns against the best seller', () => {
    render(<TopProductsChart products={products} />);
    const heights = screen
      .getAllByTestId('column')
      .map((column) => column.style.height);
    expect(heights).toEqual(['75%', '37.5%', '18.75%']);
  });
});
