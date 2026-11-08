import { describe, expect, it } from 'vitest';
import { mapLinks, parseLocation } from './geo';

const point = { latitude: 41.311081, longitude: 69.240562 };

describe('parseLocation', () => {
  it.each([
    ['41.311081, 69.240562'],
    ['41.311081,69.240562'],
    ['geo:41.311081,69.240562'],
    ['https://www.google.com/maps/search/?api=1&query=41.311081,69.240562'],
    ['https://maps.google.com/?q=41.311081,69.240562'],
    ['https://www.google.com/maps/@41.311081,69.240562,17z'],
    ['https://yandex.uz/maps/?pt=69.240562,41.311081&z=17&l=map'],
    ['https://yandex.uz/maps/10335/tashkent/?ll=69.240562%2C41.311081&z=16'],
    [
      'https://yandex.ru/maps/?whatshere%5Bpoint%5D=69.240562%2C41.311081&whatshere%5Bzoom%5D=17',
    ],
  ])('reads %s', (input) => {
    expect(parseLocation(input)).toEqual(point);
  });

  it('prefers the marked point to the middle of a Yandex view', () => {
    expect(
      parseLocation(
        'https://yandex.uz/maps/?ll=69.1,41.1&pt=69.240562,41.311081',
      ),
    ).toEqual(point);
  });

  it.each([
    [''],
    ['Chilonzor 9'],
    ['https://maps.app.goo.gl/abc123'],
    ['95.1, 69.2'],
    ['0, 0'],
  ])('finds no point in %s', (input) => {
    expect(parseLocation(input)).toBeNull();
  });
});

describe('mapLinks', () => {
  it('routes to the point, longitude after latitude', () => {
    const links = mapLinks(point);
    expect(links.yandexMaps).toBe(
      'https://yandex.uz/maps/?rtext=~41.311081,69.240562&rtt=auto',
    );
    expect(links.yandexNavigator).toContain(
      'lat_to=41.311081&lon_to=69.240562',
    );
    expect(links.google).toContain('destination=41.311081,69.240562');
  });
});
