import { useState, useEffect, createContext, useCallback } from 'react';
import { LocaleContext } from './components/editor';
import { translations } from "./translations";

export let firebaseConfig;
if (process.env.FIREBASE_WEBAPP_CONFIG) {
    try {
        firebaseConfig = JSON.parse(process.env.FIREBASE_WEBAPP_CONFIG);
    } catch (e) {
        console.error("Error parsing FIREBASE_WEBAPP_CONFIG:", e);
    }
} else {
    firebaseConfig = {
        apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
        authDomain: process.env.NEXT_PUBLIC_AUTH_DOMAIN,
        projectId: process.env.NEXT_PUBLIC_PROJECT_ID,
        storageBucket: process.env.NEXT_PUBLIC_STORAGE_BUCKET,
        messagingSenderId: process.env.NEXT_PUBLIC_MESSAGING_SENDER_ID,
        appId: process.env.NEXT_PUBLIC_APP_ID
    };
}

// Locale Provider component
export const LocaleProvider = ({ children }) => {
    const [locale, setLocaleState] = useState('en'); // Default to English

    useEffect(() => {
        // Load saved locale from localStorage
        const savedLocale = localStorage.getItem('tapas_locale');
        if (savedLocale && translations[savedLocale]) {
            setLocaleState(savedLocale);
        } else {
            // If no saved locale or invalid, detect browser language
            const browserLang = navigator.language.split('-')[0];
            if (translations[browserLang]) {
                setLocaleState(browserLang);
            }
        }
    }, []);

    const setLocale = (newLocale) => {
        if (translations[newLocale]) {
            setLocaleState(newLocale);
            localStorage.setItem('tapas_locale', newLocale);
        }
    };

    const t = useCallback((key, ...args) => {
        let translatedText = translations[locale][key] || translations.en[key] || key;
        // Basic string formatting for placeholders like %s
        if (args.length > 0) {
            // Replace all %s placeholders with arguments
            let argIndex = 0;
            translatedText = translatedText.replace(/%s/g, () => {
                const arg = args[argIndex];
                argIndex++;
                return arg !== undefined ? arg : '';
            });
        }
        return translatedText;
    }, [locale]);

    return (
        <LocaleContext.Provider value={{ locale, setLocale, t }}>
            {children}
        </LocaleContext.Provider>
    );
};

// Theme Context
export const ThemeContext = createContext({
    theme: 'light',
    toggleTheme: () => {},
});

// Theme Provider component
export const ThemeProvider = ({ children }) => {
    const [theme, setTheme] = useState('light');

    useEffect(() => {
        // On component mount, check for saved theme in local storage
        const savedTheme = localStorage.getItem('tapas_theme');
        if (savedTheme) {
            setTheme(savedTheme); // Set theme state
            if (savedTheme === 'dark') {
                document.documentElement.classList.add('dark'); // Add 'dark' class to html element
            } else {
                document.documentElement.classList.remove('dark'); // Ensure 'dark' class is removed
            }
        } else if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
            // If no saved theme, check system preference
            setTheme('dark');
            document.documentElement.classList.add('dark'); // Add 'dark' class for system preference
        } else {
            // Default to light mode if no saved theme and no system preference for dark
            setTheme('light');
            document.documentElement.classList.remove('dark'); // Ensure 'dark' class is removed
        }
    }, []); // Run only once on mount

    // Function to toggle the theme
    const toggleTheme = () => {
        setTheme(prevTheme => {
            const newTheme = prevTheme === 'light' ? 'dark' : 'light';
            localStorage.setItem('tapas_theme', newTheme); // Save the new theme to local storage

            // Apply/remove the 'dark' class directly to the html element
            if (newTheme === 'dark') {
                document.documentElement.classList.add('dark');
            } else {
                document.documentElement.classList.remove('dark');
            }
            return newTheme; // Update the theme state
        });
    };

    return (
        <ThemeContext.Provider value={{ theme, toggleTheme }}>
            {children}
        </ThemeContext.Provider>
    );
};
