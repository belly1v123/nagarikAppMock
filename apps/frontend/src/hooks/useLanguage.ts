import { useCallback, useEffect, useState } from 'react';

export type AppLanguage = 'en' | 'ne';

const STORAGE_KEY = 'appLanguage';

export function useLanguage(defaultLanguage: AppLanguage = 'en') {
    const [language, setLanguageState] = useState<AppLanguage>(defaultLanguage);

    useEffect(() => {
        const stored = localStorage.getItem(STORAGE_KEY);
        if (stored === 'en' || stored === 'ne') {
            setLanguageState(stored);
        }
    }, []);

    const setLanguage = useCallback((next: AppLanguage) => {
        setLanguageState(next);
        localStorage.setItem(STORAGE_KEY, next);
    }, []);

    const toggleLanguage = useCallback(() => {
        setLanguage(language === 'en' ? 'ne' : 'en');
    }, [language, setLanguage]);

    return {
        language,
        setLanguage,
        toggleLanguage,
        isNepali: language === 'ne',
    };
}

export default useLanguage;
