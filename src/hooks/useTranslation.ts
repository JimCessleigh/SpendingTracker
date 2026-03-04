import { useApp } from '../context/AppContext';
import { translations, TranslationKey } from '../i18n/translations';

export function useTranslation() {
  const { state } = useApp();
  const lang = (state.language === 'zh' ? 'zh' : 'en') as 'en' | 'zh';
  return (key: TranslationKey) => translations[lang][key] as any;
}
