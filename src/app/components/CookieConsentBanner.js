'use client'; // This component needs to run on the client for cookie interactions and state management

import React, { useState, useEffect } from 'react';
import { getCookie, setCookie, hasCookie } from 'cookies-next';
import Link from 'next/link'; // For linking to your privacy policy page

// Define translations for the cookie consent banner
const translations = {
  en: {
    message1: 'We use cookies to ensure the basic functionality of our app and to enhance your experience.',
    message2: 'By continuing to use our app, you agree to our use of these essential cookies.',
    moreDetailsPhrase: 'You can find more details in our',
    policyLink: 'Privacy Policy',
    buttonText: 'I Understand',
    showMore: 'Show more details',
    hideMore: 'Hide details',
    detailsTitle: 'Required Data Storage:',
    cookieName: 'Storage Item Name',
    purpose: 'Purpose',
    cookieConsentName: 'cookie_consent (Cookie)',
    cookieConsentPurpose: 'Stores user\'s consent preference for cookies.',
    tapasLocaleName: 'tapas_locale (Local Storage)',
    tapasLocalePurpose: 'Stores the user\'s selected language preference.',
    firebaseConnectionName: 'Firebase Auth Data (IndexedDB)',
    firebaseConnectionPurpose: 'Stores user ID (anonymous or authenticated) and last login time for Firebase authentication.',
  },
  de: {
    message1: 'Wir verwenden Cookies, um die grundlegende Funktionalität unserer App zu gewährleisten und Ihre Nutzungserfahrung zu verbessern.',
    message2: 'Durch die weitere Nutzung unserer App stimmen Sie der Verwendung dieser notwendigen Cookies zu.',
    moreDetailsPhrase: 'Weitere Details finden Sie in unserer',
    policyLink: 'Datenschutzerklärung',
    buttonText: 'Ich verstehe',
    showMore: 'Details anzeigen',
    hideMore: 'Details ausblenden',
    detailsTitle: 'Erforderliche Datenspeicherung:',
    cookieName: 'Name des Speicherelements',
    purpose: 'Zweck',
    cookieConsentName: 'cookie_consent (Cookie)',
    cookieConsentPurpose: 'Speichert die Einwilligung des Benutzers zur Cookienutzung.',
    tapasLocaleName: 'tapas_locale (Lokaler Speicher)',
    tapasLocalePurpose: 'Speichert die vom Benutzer gewählte Sprachpräferenz.',
    firebaseConnectionName: 'Firebase Auth-Daten (IndexedDB)',
    firebaseConnectionPurpose: 'Speichert die Benutzer-ID (anonym oder authentifiziert) und die letzte Anmeldezeit für die Firebase-Authentifizierung.',
  },
  ro: {
    message1: 'Folosim cookie-uri pentru a asigura funcționalitatea de bază a aplicației noastre și pentru a vă îmbunătăți experiența.',
    message2: 'Continuând să utilizați aplicația noastră, sunteți de acord cu utilizarea acestor cookie-uri esențiale.',
    moreDetailsPhrase: 'Puteți găsi mai multe detalii în',
    policyLink: 'Politica de confidențialitate',
    buttonText: 'Am înțeles',
    showMore: 'Afișează mai multe detalii',
    hideMore: 'Ascunde detaliile',
    detailsTitle: 'Stocarea datelor necesare:',
    cookieName: 'Numele Elementului de Stocare',
    purpose: 'Scop',
    cookieConsentName: 'cookie_consent (Cookie)',
    cookieConsentPurpose: 'Stochează preferința utilizatorului privind consimțământul pentru cookie-uri.',
    tapasLocaleName: 'tapas_locale (Stocare Locală)',
    tapasLocalePurpose: 'Stochează preferința de limbă selectată de utilizator.',
    firebaseConnectionName: 'Date de autentificare Firebase (IndexedDB)',
    firebaseConnectionPurpose: 'Stochează ID-ul utilizatorului (anonim sau autentificat) și ora ultimei conectări pentru autentificarea Firebase.',
  },
  it: {
    message1: 'Utilizziamo i cookie per garantire la funzionalità di base della nostra app e per migliorare la tua esperienza.',
    message2: 'Continuando a utilizzare la nostra app, accetti l\'utilizzo di questi cookie essenziali.',
    moreDetailsPhrase: 'Puoi trovare maggiori dettagli nella nostra',
    policyLink: 'Informativa sulla privacy',
    buttonText: 'Ho capito',
    showMore: 'Mostra più dettagli',
    hideMore: 'Nascondi dettagli',
    detailsTitle: 'Archiviazione dati richiesta:',
    cookieName: 'Nome Elemento Archiviazione',
    purpose: 'Scopo',
    cookieConsentName: 'cookie_consent (Cookie)',
    cookieConsentPurpose: 'Memorizza la preferenza di consenso dell\'utente per i cookie.',
    tapasLocaleName: 'tapas_locale (Archiviazione Locale)',
    tapasLocalePurpose: 'Memorizza la lingua preferita selezionata dall\'utente.',
    firebaseConnectionName: 'Dati di autenticazione Firebase (IndexedDB)',
    firebaseConnectionPurpose: 'Memorizza l\'ID utente (anonimo o autenticato) e l\'ora dell\'ultimo accesso per l\'autenticazione Firebase.',
  },
  ru: {
    message1: 'Мы используем файлы cookie для обеспечения базовой функциональности нашего приложения и улучшения вашего опыта.',
    message2: 'Продолжая использовать наше приложение, вы соглашаетесь с использованием этих необходимых файлов cookie.',
    moreDetailsPhrase: 'Вы можете найти более подробную информацию в нашей',
    policyLink: 'Политика конфиденциальности',
    buttonText: 'Я понимаю',
    showMore: 'Показать подробности',
    hideMore: 'Скрыть подробности',
    detailsTitle: 'Требуемые хранилища данных:',
    cookieName: 'Имя элемента хранения',
    purpose: 'Цель',
    cookieConsentName: 'cookie_consent (Файл cookie)',
    cookieConsentPurpose: 'Сохраняет настройки согласия пользователя на использование файлов cookie.',
    tapasLocaleName: 'tapas_locale (Локальное хранилище)',
    tapasLocalePurpose: 'Сохраняет выбранный пользователем язык.',
    firebaseConnectionName: 'Данные аутентификации Firebase (IndexedDB)',
    firebaseConnectionPurpose: 'Хранит идентификатор пользователя (анонимный или аутентифицированный) и время последнего входа для аутентификации Firebase.',
  },
};

/**
 * CookieConsentBanner Component
 *
 * Displays a consent banner for functional cookies.
 * This component is designed for apps that only use essential/functional cookies
 * and do not require complex cookie categorization or opt-out options for non-essential cookies.
 * It uses 'cookies-next' to manage the consent state.
 * It also integrates language selection based on a 'tapas_locale' stored in localStorage.
 */
const CookieConsentBanner = () => {
  // State to control the visibility of the banner
  const [showConsent, setShowConsent] = useState(false);
  // State to store the current language for the banner
  const [currentLang, setCurrentLang] = useState('en'); // Default to English
  // State to control the visibility of the detailed cookie list
  const [showDetails, setShowDetails] = useState(false);

  useEffect(() => {
    // Check if the 'cookie_consent' cookie already exists.
    // If it exists, the user has already given consent, so we don't show the banner.
    if (!hasCookie('cookie_consent')) {
      setShowConsent(true);
    }

    // Try to get the language from localStorage.
    // This part runs only on the client side, after hydration.
    if (typeof window !== 'undefined') {
      const storedLocale = localStorage.getItem('tapas_locale');
      if (storedLocale && translations[storedLocale]) {
        setCurrentLang(storedLocale);
      }
    }
  }, []); // Empty dependency array ensures this runs only once on mount

  // Get the translated texts based on the current language
  const text = translations[currentLang] || translations.en; // Fallback to English if language is not found

  // Define the list of required cookies and local storage items
  // Use properties from the 'text' object for translatable names/purposes
  const requiredCookies = [
    { name: text.cookieConsentName, purpose: text.cookieConsentPurpose },
    { name: text.tapasLocaleName, purpose: text.tapasLocalePurpose },
    { name: text.firebaseConnectionName, purpose: text.firebaseConnectionPurpose },
  ];

  /**
   * Handles the user accepting the cookies.
   * Sets a 'cookie_consent' cookie and hides the banner.
   */
  const handleAcceptCookies = () => {
    // Set the cookie_consent cookie.
    // Value 'true' indicates consent.
    // maxAge: Set to 1 year (in seconds) for long-term consent.
    // path: '/' ensures the cookie is accessible across the entire site.
    setCookie('cookie_consent', 'true', { maxAge: 365 * 24 * 60 * 60, path: '/' });
    setShowConsent(false); // Hide the banner
    setShowDetails(false); // Hide details when accepted
  };

  if (!showConsent) {
    return null; // Don't render anything if consent is not required or already given
  }

  const policyLocale = currentLang=='de' ? currentLang : 'en';
  
  return (
    <div
      className="fixed bottom-0 left-0 right-0 bg-gray-800 text-white p-4 shadow-lg z-50
                 flex flex-col gap-3 sm:flex-row items-center justify-between
                 rounded-t-lg sm:rounded-none max-h-full overflow-y-auto" // Add rounded top corners for mobile pop-up feel
    >
      <div className="text-sm text-center sm:text-left flex-grow">
        <p>
          {text.message1}
        </p>
        <p className="mt-2">
          {text.message2}
          <br />
          {text.moreDetailsPhrase}{' '}
          <Link href={`/privacy-policy-${policyLocale}`} className="text-blue-400 hover:underline">
            {text.policyLink}
          </Link>
          .
        </p>
        {/* "Show more details" button */}
        <button
          onClick={() => setShowDetails(!showDetails)}
          className="text-blue-400 hover:underline text-sm mt-2 focus:outline-none"
        >
          {showDetails ? text.hideMore : text.showMore}
        </button>

        {/* Collapsible details section */}
        {showDetails && (
          <div className="mt-4 p-3 bg-gray-700 rounded-md text-left">
            <h3 className="font-bold text-base mb-2">{text.detailsTitle}</h3>
            <table className="w-full text-left text-xs sm:text-sm">
              <thead>
                <tr className="border-b border-gray-600">
                  <th className="py-1 pr-2">{text.cookieName}</th>
                  <th className="py-1">{text.purpose}</th>
                </tr>
              </thead>
              <tbody>
                {requiredCookies.map((cookie, index) => (
                  <tr key={index} className="border-b border-gray-700 last:border-b-0">
                    <td className="py-1 pr-2 font-medium">{cookie.name}</td>
                    <td className="py-1">{cookie.purpose}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
      <button
        onClick={handleAcceptCookies}
        className="
          bg-green-600 hover:bg-green-700 text-white font-semibold py-2 px-5
          rounded-md shadow-md transition-colors duration-200
          whitespace-nowrap focus:outline-none focus:ring-2 focus:ring-green-500
          min-w-[120px]
        "
      >
        {text.buttonText}
      </button>
    </div>
  );
};

export default CookieConsentBanner;
