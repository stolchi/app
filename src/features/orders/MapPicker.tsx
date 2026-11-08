import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { useEffect, useRef } from 'react';
import { DEFAULT_CENTER, type Point } from '@/shared/lib/geo';

/** A drawn pin, so no marker image has to be found by the bundler. */
const PIN = L.divIcon({
  className: '',
  html: `<svg width="36" height="48" viewBox="0 0 36 48" aria-hidden="true"><path d="M18 0C8 0 0 8 0 18c0 13 18 30 18 30s18-17 18-30C36 8 28 0 18 0z" fill="#c2410c"/><circle cx="18" cy="18" r="7" fill="#fff"/></svg>`,
  iconSize: [36, 48],
  iconAnchor: [18, 48],
});

const toLatLng = ({ latitude, longitude }: Point): L.LatLngTuple => [
  latitude,
  longitude,
];

/** OpenStreetMap; a tap or a drag sets the point. Loaded only when a map is opened. */
export default function MapPicker({
  value,
  onChange,
  label,
}: {
  value: Point | null;
  onChange: (point: Point) => void;
  label: string;
}) {
  const box = useRef<HTMLDivElement>(null);
  const map = useRef<L.Map | null>(null);
  const marker = useRef<L.Marker | null>(null);
  const change = useRef(onChange);
  useEffect(() => {
    change.current = onChange;
  });

  useEffect(() => {
    if (!box.current) return;
    const created = L.map(box.current, {
      center: toLatLng(value ?? DEFAULT_CENTER),
      zoom: value ? 17 : 12,
    });
    L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
      attribution:
        '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
    }).addTo(created);
    created.on('click', (event: L.LeafletMouseEvent) =>
      change.current({
        latitude: event.latlng.lat,
        longitude: event.latlng.lng,
      }),
    );
    map.current = created;
    // The dialog is still opening when the map is made, so it measures again.
    const resize = setTimeout(() => created.invalidateSize(), 250);
    return () => {
      clearTimeout(resize);
      created.remove();
      map.current = null;
      marker.current = null;
    };
    // The map is made once; later points move the pin below.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const current = map.current;
    if (!current) return;
    if (!value) {
      marker.current?.remove();
      marker.current = null;
      return;
    }
    if (marker.current) {
      marker.current.setLatLng(toLatLng(value));
    } else {
      const pin = L.marker(toLatLng(value), {
        icon: PIN,
        draggable: true,
        keyboard: false,
      }).addTo(current);
      pin.on('dragend', () => {
        const at = pin.getLatLng();
        change.current({ latitude: at.lat, longitude: at.lng });
      });
      marker.current = pin;
    }
    // Close enough to see the house: a point set from a link may be across town.
    if (
      current.getZoom() < 16 ||
      !current.getBounds().contains(toLatLng(value))
    ) {
      current.setView(toLatLng(value), Math.max(current.getZoom(), 17));
    }
  }, [value]);

  return (
    <div
      ref={box}
      role="application"
      aria-label={label}
      className="h-[min(55dvh,26rem)] w-full overflow-hidden rounded-xl border"
    />
  );
}
