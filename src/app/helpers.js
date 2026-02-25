import { useState, useEffect, createContext, useCallback, useTransition } from 'react';
import { useSearchParams, useRouter, usePathname } from "next/navigation";
import { LocaleContext } from './components/editor';
import { translations } from "./translations";
import { setCookie, getCookie } from 'cookies-next';

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
    const [theme, setTheme] = useState('');

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

// IOS install prompt
export const InstallPrompt = ({ t }) => {
  const [isIOS, setIsIOS] = useState(false)
  const [isStandalone, setIsStandalone] = useState(false)
  const [isMobile, setIsMobile] = useState(null);
  const [displayPrompt, setDisplayPrompt] = useState('');

  const COOKIE_NAME = 'addToHomeScreenPrompt';

  useEffect(() => {
    if (window) {
        const userAgentString = window.navigator.userAgent;
        let userAgent;

        /**
         * Parse user agent string to determine browser
         * The order of the if statements is important because some browsers
         * have multiple matches in their user agent string
         */
        if (userAgentString.indexOf('Firefox') > -1) {
            userAgent = 'Firefox';
        } else if (userAgentString.indexOf('FxiOS') > -1) {
            userAgent = 'FirefoxiOS';
        } else if (userAgentString.indexOf('CriOS') > -1) {
            userAgent = 'ChromeiOS';
        } else if (userAgentString.indexOf('Chrome') > -1) {
            userAgent = 'Chrome';
        } else if (userAgentString.indexOf('Safari') > -1) {
            userAgent = 'Safari';
        } else {
            userAgent = 'unknown';
        }

        // Check if user agent is mobile
        const isIOS = userAgentString.match(/iPhone|iPad|iPod/i);
        const isAndroid = userAgentString.match(/Android/i);
        setIsIOS(isIOS ? true : false);
        const isMobile = isIOS || isAndroid;
        setIsMobile(!!isMobile);

        setIsStandalone(window.matchMedia('(display-mode: standalone)').matches);
        setDisplayPrompt(userAgent);
    }
  }, []);

  const addToHomeScreenPromptCookie = getCookie(COOKIE_NAME);

  if (addToHomeScreenPromptCookie === 'dontShow' || !isMobile || isStandalone) {
    return null; // Don't show install button if already installed
  }

  const closePrompt = () => {
    setDisplayPrompt('');
  };

  const doNotShowAgain = () => {
    // Create date 1 year from now
    const date = new Date();
    date.setFullYear(date.getFullYear() + 1);
    setCookie(COOKIE_NAME, 'dontShow', { expires: date }); // Set cookie for a year
    setDisplayPrompt('');
  };

  return (
    <>
    {displayPrompt !== '' && (
      <div
        className="fixed top-0 left-0 right-0 bottom-0 bg-black/70 z-50"
        onClick={closePrompt}
      >
    <div className="max-h-screen overflow-y-auto fixed inset-0 flex items-center justify-center p-4 z-50">
    <div className="p-6 rounded-lg shadow-xl max-w-xl w-full mx-auto bg-white text-gray-800 dark:bg-gray-800 dark:text-gray-100">
        <button onClick={closePrompt} className="float-right text-gray-500 hover:text-gray-700 text-3xl font-bold">
            &times;
        </button>
      <h3 className="text-2xl font-bold mb-4">{t('installApp')}</h3>
      <h4 className="text-m font-bold mb-4">{t('addToHomeScreen')}</h4>
      {isIOS && displayPrompt === 'Safari' ? (
        <p>
          {t('installIos1')}{' '}
          <svg className="inline-flex" fill="currentColor" xmlns="http://www.w3.org/2000/svg" height="24" viewBox="0 0 24 24" width="24">
            <path d="M0 0h24v24H0V0z" fill="none"/><path d="M16 5l-1.42 1.42-1.59-1.59V16h-1.98V4.83L9.42 6.42 8 5l4-4 4 4zm4 5v11c0 1.1-.9 2-2 2H6c-1.11 0-2-.9-2-2V10c0-1.11.89-2 2-2h3v2H6v11h12V10h-3V8h3c1.1 0 2 .89 2 2z"/>
          </svg>{' '}
          {t('installOther2')} "{t('addToHomeScreen')}" <span className="text-2xl" role="img" aria-label="plus icon">{' '}⊞{' '}</span>.
        </p>
      ) : (
        <p>
          {t('installOther1')} <span className="font-bold" role="img" aria-label="three dots icon">{' '}⋮{' '}</span>
          {t('installOther2')}{' '}
          <svg className="inline-flex" stroke="currentColor" fill="currentColor" viewBox="0 0 24 24" height="1em" width="1em" xmlns="http://www.w3.org/2000/svg">
            <path fill="none" d="M0 0h24v24H0V0z"></path><path fill="none" d="M0 0h24v24H0V0z"></path><path d="M18 1.01 8 1c-1.1 0-2 .9-2 2v3h2V5h10v14H8v-1H6v3c0 1.1.9 2 2 2h10c1.1 0 2-.9 2-2V3c0-1.1-.9-1.99-2-1.99zM10 15h2V8H5v2h3.59L3 15.59 4.41 17 10 11.41z"></path>
          </svg>
          {' '}"{t('addToHomeScreen')}"
        </p>
      )}
      <button className="mt-4 border-2 p-1 hover:text-blue-300" onClick={doNotShowAgain}>{t('dontShowAgain')}</button>
      </div>
      </div>
      </div>
    )}
    </>
  );
};

export function useModalState() {
    const useBackRouter = false;
    const router = useRouter();
    const pathname = usePathname();
    const searchParams = useSearchParams();

    const [isPending, startTransition] = useTransition();
    const [modalOrder, setModalOrder] = useState([]);
    const [dynamicOnClose, setDynamicOnClose] = useState({});

    const lastIndex = modalOrder.length - 1;
    const lastId = modalOrder[lastIndex];
    const currentModalInUrl = useBackRouter ? searchParams.get("modal") : lastId;

    useEffect(() => {
        if (isPending || !useBackRouter) return;

        //const lastIndex = modalOrder.length - 1;
        //const lastId = modalOrder[lastIndex];
        const previousId = modalOrder[lastIndex - 1];

        // Detection logic for a modal being closed (back button or code)
        const isLastClosed = (!currentModalInUrl && modalOrder.length > 0) ||
                             (modalOrder.length > 1 && currentModalInUrl === previousId);

        if (isLastClosed) {
            // Fix: Retrieve callback before updating state
            const onClose = dynamicOnClose[lastId];

            // Fix: Avoid direct mutation (delete modalOrder[i] is incorrect for arrays)
            setModalOrder(prev => prev.slice(0, -1));

            if (onClose) {
                // Fix: Immutably clear the callback
                setDynamicOnClose(prev => {
                    const next = { ...prev };
                    delete next[lastId];
                    return next;
                });
                onClose();
            }
        }
    }, [currentModalInUrl, modalOrder, dynamicOnClose, lastId, lastIndex]);

    const openModal = useCallback((modalId, onCloseCallback) => {
        //const lastId = modalOrder[modalOrder.length - 1];
        if (lastId === modalId) return;

        startTransition(() => {
            if (onCloseCallback) {
                // Fix: Use bracket notation [modalId] instead of .modalId literal
                setDynamicOnClose(prev => ({ ...prev, [modalId]: onCloseCallback }));
            }

            // Fix: Create a new array reference for React to detect change
            setModalOrder(prev => [...prev, modalId]);

            if (useBackRouter) {
                const params = new URLSearchParams(searchParams.toString());
                params.set("modal", modalId);
                router.push(`${pathname}?${params.toString()}`);
            }
        });
    }, [modalOrder, pathname, router, searchParams, lastId]);

    const closeModal = useCallback((modalId, ...args) => {
        //const lastId = modalOrder[modalOrder.length - 1];
        if (lastId === modalId) {
            const onClose = dynamicOnClose[modalId];
            if (args && onClose) {
                setDynamicOnClose(prev => {
                    const next = { ...prev };
                    delete next[lastId];
                    return next;
                });
                onClose(...args);
            }
            if (useBackRouter) {
                router.back();
            } else {
                setModalOrder(prev => prev.slice(0, -1));
            }
        }
    }, [modalOrder, router, lastId]);

    // Renamed from 'use' to follow React Hook Naming Rules
    const getModalProps = (modalId) => {
        return {
            isOpen: useBackRouter ? currentModalInUrl === modalId : lastId == modalId,
            isActive: modalOrder.includes(modalId),
            open: (onCloseCallback) => openModal(modalId, onCloseCallback),
            close: (...args) => closeModal(modalId, ...args),
        };
    };

    return { getModalProps };
}
