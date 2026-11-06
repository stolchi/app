import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import uz from './uz.json';

void i18n.use(initReactI18next).init({
  lng: 'uz',
  fallbackLng: 'uz',
  resources: { uz: { translation: uz } },
  interpolation: { escapeValue: false },
});

export default i18n;
