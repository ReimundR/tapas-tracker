'use client'

// pages/index.js (or .jsx)
// This file will contain your main application logic as a Next.js page component.

import React, { useState, useEffect, createContext, useContext, useCallback, useRef } from 'react';
import { initializeApp } from 'firebase/app';
import { getAuth, signInAnonymously, onAuthStateChanged, GoogleAuthProvider, signInWithPopup, signOut, createUserWithEmailAndPassword, signInWithEmailAndPassword, FacebookAuthProvider, OAuthProvider } from 'firebase/auth'; // Added FacebookAuthProvider and OAuthProvider for Apple
import { getFirestore, collection, addDoc, getDocs, getDoc, doc, updateDoc, deleteDoc, query, where, onSnapshot, orderBy, Timestamp, setDoc, writeBatch } from 'firebase/firestore';
import Head from 'next/head'; // Import Head from next/head for meta tags
import { Suspense } from 'react'
import GdprEN from "@/content/privacy-policy-en.mdx";
import GdprDE from "@/content/privacy-policy-de.mdx";

// Lexical Editor Imports
import { LexicalComposer } from '@lexical/react/LexicalComposer';
import { RichTextPlugin } from '@lexical/react/LexicalRichTextPlugin';
import { ContentEditable } from '@lexical/react/LexicalContentEditable';
import { HistoryPlugin } from '@lexical/react/LexicalHistoryPlugin';
import { LexicalErrorBoundary } from '@lexical/react/LexicalErrorBoundary';
import { HeadingNode, QuoteNode } from '@lexical/rich-text';
import { ListNode, ListItemNode } from '@lexical/list';
import { AutoLinkNode, LinkNode } from '@lexical/link';
import { LinkPlugin } from '@lexical/react/LexicalLinkPlugin';
import { ListPlugin } from '@lexical/react/LexicalListPlugin';
import { OnChangePlugin } from '@lexical/react/LexicalOnChangePlugin';
import { useLexicalComposerContext } from '@lexical/react/LexicalComposerContext';
import { $getRoot, $insertNodes } from 'lexical';
import { $generateHtmlFromNodes, $generateNodesFromDOM } from '@lexical/html';
import AutoLinkPlugin from "../plugins/AutoLinkPlugin";
import ToolbarPlugin from "../plugins/ToolbarPlugin";
import { translations } from "./translations";

let firebaseConfig;
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

const __app_id = firebaseConfig.appId;
const appVersion = process.env.version;
const repUrl = "https://github.com/ReimundR/tapas-tracker";

// Lexical Editor Configuration
const editorConfig = {
    namespace: 'TapasDescriptionEditor',
    theme: {
        // Basic theme for styling content editable
        // You might want to expand this with more specific styles
        placeholder: "editor-placeholder",
        paragraph: "editor-paragraph",
        quote: "editor-quote",
        heading: {
            h1: "editor-heading-h1",
            h2: "editor-heading-h2",
            h3: "editor-heading-h3",
            h4: "editor-heading-h4",
            h5: "editor-heading-h5"
        },
        text: {
            bold: 'editor-text-bold',
            italic: 'editor-text-italic',
            underline: 'editor-text-underline',
        },
        link: 'editor-link',
        list: {
            nested: {
                listitem: "editor-nested-listitem"
            },
            ol: "editor-list-ol",
            ul: "editor-list-ul",
            listitem: "editor-listitem"
        },
    },
    onError(error) {
        console.error(error);
    },
    nodes: [
        HeadingNode,
        ListNode,
        ListItemNode,
        QuoteNode,
        AutoLinkNode,
        LinkNode
    ]
};

const LoadInitialContent = ({ initialContent }) => {
    const [editor] = useLexicalComposerContext();

    useEffect(() => {
        if (!initialContent) { return; }

        editor.update(() => {
            const parser = new DOMParser();
            const dom = parser.parseFromString(initialContent, "text/html");
            const nodes = $generateNodesFromDOM(editor, dom);

            $getRoot().clear();
            $insertNodes(nodes);
        });
    }, [editor, initialContent]);
    return null;
};

const LanguageSelect = ({ locale, setLocale }) => {
    return (
        <select
            value={locale}
            onChange={(e) => setLocale(e.target.value)}
            className="bg-indigo-700 text-white px-2 py-1 rounded-md text-sm cursor-pointer"
        >
            <option value="en">English</option>
            <option value="de">Deutsch</option>
            <option value="ro">Română</option>
            <option value="ru">Русский</option>
            <option value="it">Italiano</option>
        </select>
    );
};

// RichTextEditor Component
const RichTextEditor = ({ initialContent, onEditorStateChange }) => {
    const { locale, setLocale, t } = useContext(LocaleContext);

    const initialConfig = {
        ...editorConfig,
        //editorState: initialEditorState, // Load initial state
    };

    return (
        <LexicalComposer initialConfig={initialConfig}>
            <LoadInitialContent initialContent={initialContent} />
            <div className="relative border border-gray-300 dark:border-gray-600 rounded-md">
                <ToolbarPlugin />
                <div className="editor-inner">
                <RichTextPlugin
                    contentEditable={<ContentEditable className="editor-input min-h-[150px] p-3 outline-none resize-y overflow-auto bg-white text-gray-900 dark:bg-gray-700 dark:text-gray-100 rounded-b-md" />}
                    placeholder={<div className="editor-placeholder">{t('enterDescription')}...</div>}
                    ErrorBoundary={LexicalErrorBoundary}
                />
                <HistoryPlugin />
                <ListPlugin />
                <LinkPlugin />
                <AutoLinkPlugin />
                <OnChangePlugin onChange={onEditorStateChange} />
                </div>
            </div>
        </LexicalComposer>
    );
};

// Helper to convert Lexical EditorState to HTML for display
const LexicalHtmlRenderer = ({ editorStateHtml }) => {
    const [htmlContent, setHtmlContent] = useState('');

    useEffect(() => {
        if (editorStateHtml) {
            setHtmlContent(editorStateHtml);
        } else {
            setHtmlContent('');
        }
    }, [editorStateHtml]);

    return (
        <div className="" dangerouslySetInnerHTML={{ __html: htmlContent }} />
    );
};


// Locale Context
const LocaleContext = createContext({
    locale: 'en',
    setLocale: () => {},
    t: (key, ...args) => key // Default translation function
});

// Locale Provider component
const LocaleProvider = ({ children }) => {
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
const ThemeContext = createContext({
    theme: 'light',
    toggleTheme: () => {},
});

// Theme Provider component
const ThemeProvider = ({ children }) => {
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

// Define context for Firebase and user data
const AppContext = createContext(null);


// Component for a custom confirmation dialog
const ConfirmDialog = ({ message, onConfirm, onCancel, confirmText, cancelText }) => {
    return (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-75 flex items-center justify-center p-4 z-50">
            <div className="p-6 rounded-lg shadow-xl max-w-sm w-full mx-auto bg-white text-gray-800 dark:bg-gray-800 dark:text-gray-100">
                <p className="text-lg font-semibold mb-6 text-center">{message}</p>
                <div className="flex justify-around space-x-4">
                    <button
                        onClick={onCancel}
                        className="flex-1 bg-gray-300 text-gray-800 px-4 py-2 rounded-md hover:bg-gray-400 transition-colors duration-200"
                    >
                        {cancelText}
                    </button>
                    <button
                        onClick={onConfirm}
                        className="flex-1 bg-red-500 text-white px-4 py-2 rounded-md hover:bg-red-600 transition-colors duration-200"
                    >
                        {confirmText}
                    </button>
                </div>
            </div>
        </div>
    );
};

const timeDayMs = 24 * 60 * 60 * 1000;

// Helper to get the start of the day in UTC from a local date
const getStartOfDayUTC = (date) => {
    return new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
};

// Helper to get the start of the week (Monday) in UTC from a local date
const getStartOfWeekUTC = (date) => {
    const d = new Date(date);
    const day = d.getUTCDay(); // Sunday - 0, Monday - 1, ..., Saturday - 6
    const diff = d.getUTCDate() - day + (day === 0 ? -6 : 1); // Adjust for Monday start
    return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), diff));
};

const getStartOfIntervalUTC = (date, tapas) => {
    const startDate = tapas.startDate.toDate();
    const daysDiff = Math.floor((date - startDate) / timeDayMs);
    const intervals = Math.ceil(daysDiff / tapas.scheduleInterval);
    const diff = intervals * tapas.scheduleInterval;
    return new Date(startDate.getTime() + diff * timeDayMs);
};

const getTapasWeekDiff = (startDateObj) => {
    return startDateObj - getStartOfWeekUTC(startDateObj);
};

const getTapasWeekDayUTC = (date, delta) => {
    return new Date(getStartOfWeekUTC(date).getTime() + delta);
};

const getTapasIntervalDayUTC = (date, tapas) => {
    return new Date(getStartOfIntervalUTC(date, tapas).getTime() + tapas.scheduleInterval);
};

const getTapasDay = (date, tapas, startDateObj) => {
    let tapasDate;
    if (tapas.scheduleType === 'weekly') {
        if (!startDateObj) {
            startDateObj = getStartOfDayUTC(tapas.startDate.toDate()); // Use UTC start of day
        }
        const delta = getTapasWeekDiff(startDateObj);
        tapasDate = getTapasWeekDayUTC(date, delta);
    } else if (tapas.scheduleType === 'everyNthDays') {
        tapasDate = getTapasIntervalDayUTC(date, tapas);
    } else {
        tapasDate = getStartOfDayUTC(date);
    }
    return tapasDate;
};

// Helper to format date objects toYYYY-MM-DD strings for comparison
const formatDateToISO = (date) => date.toISOString().split('T')[0];

const formatDateNoTimeToISO = (date) => {
    return formatDateToISO(getStartOfDayUTC(date));
};

const formatStartOfWeekNoTimeToISO = (date) => {
    return formatDateToISO(getStartOfWeekUTC(date));
};

const timestampToDate = (timestamp) => {
    let dateObj;
    // Handle Firebase Timestamp objects
    if (timestamp instanceof Timestamp) {
        dateObj = timestamp.toDate();
    }
    // Handle raw Date objects
    else if (timestamp instanceof Date) {
        dateObj = timestamp;
    }
    // Handle plain objects that might represent Firestore Timestamps (e.g., from JSON import)
    else if (timestamp && typeof timestamp === 'object' && 'seconds' in timestamp) {
        dateObj = new Timestamp(timestamp.seconds, timestamp.nanoseconds || 0).toDate();
    }
    // Handle ISO date strings (e.g., from JSON import)
    else if (typeof timestamp === 'string') {
        dateObj = new Date(timestamp);
        // Check for invalid date
        if (isNaN(dateObj.getTime())) {
            console.warn("Invalid date string encountered in checkedDaysArray:", timestamp);
            return null; // Skip invalid entries
        }
    }
    else {
        console.warn("Unexpected type in checkedDaysArray:", timestamp);
        return null; // Skip invalid entries
    }
    return dateObj;
};

const countCheckedSince = (checkedDaysArray, fromDate) => {
    let cnt = 0;
    if (checkedDaysArray && checkedDaysArray.length > 0) {
        checkedDaysArray.forEach(timestamp => {
            const dateObj = timestampToDate(timestamp);
            cnt += dateObj >= fromDate;
        });
    }
    return cnt;
};

// Helper to get unique checked days, handling potential duplicates and various date types
const getUniqueCheckedDays = (checkedDaysArray) => {
    if (!checkedDaysArray || checkedDaysArray.length === 0) {
        return [];
    }
    const uniqueDateStrings = new Set();
    const uniqueTimestamps = [];

    checkedDaysArray.forEach(timestamp => {
        const dateObj = timestampToDate(timestamp);
        // Normalize to UTC start of day for comparison and storage
        const utcStartOfDay = getStartOfDayUTC(dateObj);
        const dateString = utcStartOfDay.toISOString().split('T')[0];

        if (!uniqueDateStrings.has(dateString)) {
            uniqueDateStrings.add(dateString);
            uniqueTimestamps.push(Timestamp.fromDate(utcStartOfDay));
        }
    });
    return uniqueTimestamps;
};


const getTotalUnits = (unit) => {
    let value;
    if (unit === 'weeks' || unit === 'weekly') {
        value = 7;
    } else {
        value = 1;
    }
    return value;
};

const getScheduleFactor = (unit, scheduleInterval) => {
    let value;
    if (unit === 'weeks' || unit === 'weekly') {
        value = 7;
    } else if (unit === 'everyNthDays') {
        value = scheduleInterval;
    } else {
        value = 1;
    }
    return value;
};

const isTapasDateChecked = (checkedDays, date) => {
    // Ensure checkedDays are unique for accurate check
    const uniqueDays = getUniqueCheckedDays(checkedDays);
    const targetDateISO = formatDateNoTimeToISO(date); // Normalize target date to UTC start of day ISO string

    return uniqueDays.some(timestamp => {
        const checkedDate = timestamp.toDate();
        return formatDateNoTimeToISO(checkedDate) === targetDateISO;
    });
};

// Component for adding/editing a Tapas
const TapasForm = ({ onTapasAdded, editingTapas, onCancelEdit }) => {
    const { db, userId, t } = useContext(AppContext);

    const [name, setName] = useState('');
    const firstRef = useRef(null); // Ref for the first input field
    const formContainerRef = useRef(null); // Ref for the form's main container
    const [startDate, setStartDate] = useState('');
    const [startTime, setStartTime] = useState('');
    const [duration, setDuration] = useState('');
    const [endDate, setEndDate] = useState(''); // New state for end date
    const [descriptionEditorState, setDescriptionEditorState] = useState(null); // Lexical EditorState
    const [goals, setGoals] = useState(''); // New state for goals
    const [parts, setParts] = useState('');
    const [crystallizationTime, setCrystallizationTime] = useState('');
    const [errorMessage, setErrorMessage] = useState('');
    const [successMessage, setSuccessMessage] = useState('');
    const [allowRecuperation, setAllowRecuperation] = useState(false); // New state for recuperation
    const [scheduleType, setScheduleType] = useState('daily'); // 'daily', 'weekly', 'everyNthDays', 'noTapas'
    const [scheduleInterval, setScheduleInterval] = useState(''); // For 'everyNthDays'
    const [acknowledgeAfter, setAcknowledgeAfter] = useState(false); // New state for acknowledgeAfter

    const initialDescription = editingTapas && editingTapas.description ? editingTapas.description : '';

    // Effect to set form fields when editingTapas prop changes
    useEffect(() => {
        // Reset messages
        setErrorMessage('');
        setSuccessMessage('');

        if (editingTapas) {
            // Use requestAnimationFrame to ensure focus and scroll happen after browser layout
            requestAnimationFrame(() => {
                if (firstRef.current) {
                    firstRef.current.focus();
                }
                if (formContainerRef.current) {
                    // Scroll the form container itself to the top
                    //formContainerRef.current.scrollIntoView({ behavior: 'instant', block: 'start' });
                }
            });

            setName(editingTapas.name || '');
            setStartDate(editingTapas.startDate ? new Date(editingTapas.startDate.toDate()).toISOString().split('T')[0] : '');
            setStartTime(editingTapas.startTime || '');
            
            // Ensure duration is handled correctly for editing
            let loadedScheduleType = editingTapas.scheduleType || 'daily';
            const loadedDuration = Math.ceil(editingTapas.duration / getScheduleFactor(loadedScheduleType, editingTapas.scheduleInterval));
            setDuration(loadedDuration || ''); // Set state from loaded data

            setGoals(editingTapas.goals ? editingTapas.goals.join('\n') : ''); // Set goals from loaded data
            setParts(editingTapas.parts ? editingTapas.parts.join('\n') : '');
            setCrystallizationTime(editingTapas.crystallizationTime || '');
            setAllowRecuperation(editingTapas.allowRecuperation || false);
            setScheduleType(loadedScheduleType); // Load schedule type
            setScheduleInterval(editingTapas.scheduleInterval || ''); // Load schedule interval
            setAcknowledgeAfter(editingTapas.acknowledgeAfter || false); // Load acknowledgeAfter

            // Calculate endDate from startDate and loadedDuration, ensuring validity
            if (editingTapas.startDate && loadedDuration && !isNaN(parseInt(loadedDuration)) && parseInt(loadedDuration) > 0) {
                const start = new Date(editingTapas.startDate.toDate());
                start.setHours(0, 0, 0, 0); // Normalize
                const end = new Date(start);
                /*let actualDays = parseInt(loadedDuration);
                if (loadedScheduleType === 'weekly') {
                    actualDays *= 7; // Convert weeks back to days for end date calculation
                } else if (loadedScheduleType === 'everyNthDays') {
                    actualDays *= editingTapas.scheduleInterval; // Convert weeks back to days for end date calculation
                }
                end.setDate(start.getDate() + actualDays); // Adjust for 1-based duration
                */
                end.setDate(start.getDate() + editingTapas.duration); // Adjust for 1-based duration
                setEndDate(end.toISOString().split('T')[0]);
            } else {
                setEndDate('');
            }
        } else {
            // Reset form when not editing
            setName('');
            setStartDate('');
            setStartTime('');
            setDuration('');
            setGoals(''); // Reset goals
            setParts('');
            setCrystallizationTime('');
            setEndDate(''); // Also reset endDate
            setAllowRecuperation(false); // Reset allowRecuperation
            setScheduleType('daily'); // Reset schedule type
            setScheduleInterval(''); // Reset schedule interval
            setAcknowledgeAfter(false); // Reset acknowledgeAfter
        }
    }, [editingTapas]);

    // Effect to synchronize duration and endDate when startDate changes
    useEffect(() => {
        if (scheduleType === 'noTapas') {
            setDuration('');
            setEndDate('');
            setScheduleInterval('');
            setAllowRecuperation(false);
            setAcknowledgeAfter(false);
            return;
        }

        if (startDate) {
            if (duration && !isNaN(parseInt(duration)) && parseInt(duration) > 0) {
                // If duration is already set, recalculate endDate
                const start = new Date(startDate);
                start.setHours(0, 0, 0, 0);
                const end = new Date(start);
                const actualDays = parseInt(duration) * getScheduleFactor(scheduleType, scheduleInterval);
                end.setDate(start.getDate() + actualDays); // Subtract 1 because duration includes the start day
                setEndDate(end.toISOString().split('T')[0]);
            } else if (endDate) {
                // If endDate is already set, recalculate duration
                const start = new Date(startDate);
                start.setHours(0, 0, 0, 0);
                const end = new Date(endDate);
                end.setHours(0, 0, 0, 0);
                if (end >= start) {
                    const diffTime = end.getTime() - start.getTime();
                    let diffDays = Math.ceil(diffTime / timeDayMs) + 1; // +1 to include both start and end days
                    diffDays = Math.ceil(diffDays / getScheduleFactor(scheduleType, scheduleInterval));
                    setDuration(diffDays.toString());
                } else {
                    setDuration(''); // Invalid end date relative to start
                }
            }
        } else {
            // If startDate is cleared, clear only endDate, keep duration
            setEndDate('');
        }
    }, [startDate, scheduleType, scheduleInterval, duration, endDate]); // Dependency on startDate, scheduleType, duration, endDate


    const handleChangeDuration = (e) => {
        const newDuration = e.target.value;
        setDuration(newDuration);
        if (startDate && newDuration && !isNaN(parseInt(newDuration)) && parseInt(newDuration) > 0) {
            const start = new Date(startDate);
            start.setHours(0, 0, 0, 0);
            const end = new Date(start);
            const actualDays = parseInt(newDuration) * getScheduleFactor(scheduleType, scheduleInterval);
            end.setDate(start.getDate() + actualDays); // Subtract 1 because duration includes the start day
            setEndDate(end.toISOString().split('T')[0]);
        } else {
            setEndDate('');
        }
    };

    const handleChangeInterval = (e) => {
        const newInterval = e.target.value;
        setScheduleInterval(newInterval);
        if (startDate && duration && newInterval && !isNaN(parseInt(newInterval)) && parseInt(newInterval) > 0) {
            const start = new Date(startDate);
            start.setHours(0, 0, 0, 0);
            const end = new Date(start);
            const actualDays = duration * parseInt(newInterval);
            end.setDate(start.getDate() + actualDays); // Subtract 1 because duration includes the start day
            setEndDate(end.toISOString().split('T')[0]);
        } else {
            setEndDate('');
        }
    };

    const handleChangeEndDate = (e) => {
        const newEndDate = e.target.value;
        setEndDate(newEndDate);
        if (startDate && newEndDate) {
            const start = new Date(startDate);
            start.setHours(0, 0, 0, 0);
            const end = new Date(newEndDate);
            end.setHours(0, 0, 0, 0);
            if (end >= start) {
                const diffTime = end.getTime() - start.getTime();
                let diffDays = Math.ceil(diffTime / timeDayMs) + 1; // +1 to include both start and end days
                diffDays = Math.ceil(diffDays / getScheduleFactor(scheduleType, scheduleInterval));
                setDuration(diffDays.toString());
            } else {
                setDuration(''); // Invalid end date relative to start
            }
        } else {
            setDuration('');
        }
    };

    const handleSetDurationFromButton = (value, unit) => {
        setDuration(value.toString()); // Set duration state as weeks or days for display
        if (startDate) {
            const actualDays = value * getScheduleFactor(unit, scheduleInterval);
            const start = new Date(startDate);
            start.setHours(0, 0, 0, 0);
            const end = new Date(start);
            end.setDate(start.getDate() + actualDays);
            setEndDate(end.toISOString().split('T')[0]);
        }
    };

    const handleDescriptionChange = (editorState, editor) => {
        setDescriptionEditorState([editorState, editor]);
    };


    const handleSubmit = async (e) => {
        e.preventDefault();
        setErrorMessage('');
        setSuccessMessage('');

        let descriptionHtml = '';
        if (descriptionEditorState) {
            const [editorState, editor] = descriptionEditorState;
            editorState.read(() => {
                const root = $getRoot();
                const isEmpty = root.getFirstChild().isEmpty() && root.getChildrenSize() === 1
                descriptionHtml = isEmpty ? '' : $generateHtmlFromNodes(editor);
            });
        }

        if (scheduleType !== 'noTapas') {
            if (!name || !startDate || !duration) { // Duration is the source of truth for calculation
                setErrorMessage(t('nameStartDateDurationRequired'));
                return;
            }

            if (isNaN(parseInt(duration)) || parseInt(duration) <= 0) {
                setErrorMessage(t('durationPositiveNumber'));
                return;
            }

            if (scheduleType === 'everyNthDays' && (isNaN(parseInt(scheduleInterval)) || parseInt(scheduleInterval) <= 0)) {
                setErrorMessage(t('scheduleInterval') + ' must be a positive number.');
                return;
            }
        } else if (!name || !startDate) {
            setErrorMessage(t('nameStartDateRequired'));
            return;
        }

        const durationToSave = scheduleType === 'noTapas' ? 0 : parseInt(duration) * getScheduleFactor(scheduleType, scheduleInterval);


        const appId = typeof __app_id !== 'undefined' ? __app_id : 'default-app-id';
        const tapasData = {
            name,
            startDate: new Date(startDate),
            startTime: scheduleType === 'noTapas' ? null : startTime || null,
            duration: durationToSave, // Save in days
            description: descriptionHtml, // Save Lexical EditorState as HTML
            goals: goals.split('\n').filter(g => g.trim() !== '') || [], // Include goals
            parts: parts.split('\n').filter(p => p.trim() !== '') || [],
            crystallizationTime: crystallizationTime ? parseInt(crystallizationTime) : null,
            allowRecuperation: scheduleType === 'noTapas' ? false : allowRecuperation, // Include new field
            // Preserve existing status, checkedDays, failureCause, and createdAt when editing
            status: editingTapas ? editingTapas.status : 'active',
            checkedDays: editingTapas ? getUniqueCheckedDays(editingTapas.checkedDays) : [], // Ensure unique on save
            failureCause: editingTapas ? editingTapas.failureCause : null,
            recuperatedDays: editingTapas ? getUniqueCheckedDays(editingTapas.recuperatedDays || []) : [], // New field initialization, ensure unique
            advancedDays: editingTapas ? getUniqueCheckedDays(editingTapas.advancedDays || []) : [], // New field initialization, ensure unique
            createdAt: editingTapas ? editingTapas.createdAt : new Date(), // Keep original creation date
            userId: userId, // Ensure userId is associated with the Tapas
            checkedPartsByDate: editingTapas ? editingTapas.checkedPartsByDate : {}, // Initialize for new Tapas
            results: editingTapas ? editingTapas.results || null : null, // Initialize results field
            shareReference: editingTapas ? editingTapas.shareReference || null : null, // Preserve shareReference
            scheduleType: scheduleType, // New field
            scheduleInterval: scheduleType === 'everyNthDays' ? parseInt(scheduleInterval) : null, // New field
            acknowledgeAfter: scheduleType === 'noTapas' ? false : acknowledgeAfter, // Include new field
        };

        try {
            if (editingTapas) {
                const tapasRef = doc(db, `artifacts/${appId}/users/${userId}/tapas`, editingTapas.id);
                await updateDoc(tapasRef, tapasData);
                setSuccessMessage(t('tapasUpdatedSuccessfully'));
                onCancelEdit(); // Close edit form
            } else {
                await addDoc(collection(db, `artifacts/${appId}/users/${userId}/tapas`), tapasData);
                setSuccessMessage(t('tapasAddedSuccessfully'));
                // Clear form after successful addition
                setName('');
                setStartDate('');
                setStartTime('');
                setDuration('');
                setEndDate('');
                setGoals(''); // Clear goals
                setParts('');
                setCrystallizationTime('');
                setAllowRecuperation(false); // Reset after adding
                setScheduleType('daily'); // Reset schedule type
                setScheduleInterval(''); // Reset schedule interval
                setAcknowledgeAfter(false); // Reset acknowledgeAfter
            }
            onTapasAdded(); // Trigger refresh in parent component
        } catch (e) {
            console.error("Error adding/updating document: ", e);
            setErrorMessage(`${t('errorSavingTapas')} ${e.message}`);
        }
    };

    const handleSetToday = () => {
        const today = new Date();
        const year = today.getFullYear();
        const month = String(today.getMonth() + 1).padStart(2, '0');
        const day = String(today.getDate()).padStart(2, '0');
        setStartDate(`${year}-${month}-${day}`);
    };


    return (
        <div ref={formContainerRef} className="p-4 rounded-lg shadow-md mb-6 bg-white dark:bg-gray-800">
            <h2 className="text-2xl font-bold mb-4 text-gray-800 dark:text-gray-100">{editingTapas ? t('editTapasTitle') : t('addEditTapas')}</h2>
            {errorMessage && <p className="text-red-600 mb-4 font-medium">{errorMessage}</p>}
            {successMessage && <p className="text-green-600 mb-4 font-medium">{successMessage}</p>}

            <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="col-span-1">
                    <label htmlFor="name" className="block text-sm font-medium text-gray-700 dark:text-gray-300">{t('name')}</label>
                    <input
                        ref={firstRef}
                        type="text"
                        id="name"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        className="mt-1 block w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 bg-white border-gray-300 text-gray-900 dark:bg-gray-700 dark:border-gray-600 dark:text-gray-100 focus:border-indigo-500"
                        required
                    />
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="col-span-1">
                        <label htmlFor="scheduleType" className="block text-sm font-medium text-gray-700 dark:text-gray-300">{t('schedule')}</label>
                        <select
                            id="scheduleType"
                            value={scheduleType}
                            onChange={(e) => setScheduleType(e.target.value)}
                            className="mt-1 block w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 bg-white border-gray-300 text-gray-900 dark:bg-gray-700 dark:border-gray-600 dark:text-gray-100 focus:border-indigo-500"
                        >
                            <option value="daily">{t('daily')}</option>
                            <option value="weekly">{t('weekly')}</option>
                            <option value="everyNthDays">{t('everyNthDays', t('nth'))}</option>
                            <option value="noTapas">{t('noTapas')}</option> {/* New option */}
                        </select>
                    </div>
                    {scheduleType === 'everyNthDays' && (
                        <div className="col-span-1">
                            <label htmlFor="scheduleInterval" className="block text-sm font-medium text-gray-700 dark:text-gray-300">{t('scheduleInterval')}</label>
                            <input
                                type="number"
                                id="scheduleInterval"
                                value={scheduleInterval}
                                onChange={handleChangeInterval}
                                className="mt-1 block w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 bg-white border-gray-300 text-gray-900 dark:bg-gray-700 dark:border-gray-600 dark:text-gray-100 focus:border-indigo-500"
                                min="1"
                                required
                            />
                        </div>
                    )}
                </div>
                <div className="col-span-1">
                    <label htmlFor="startDate" className="block text-sm font-medium text-gray-700 dark:text-gray-300">{t('startDate')}</label>
                    <div className="flex items-center mt-1">
                        <input
                            type="date"
                            id="startDate"
                            value={startDate}
                            onChange={(e) => setStartDate(e.target.value)}
                            className="block w-full px-3 py-2 border rounded-l-md shadow-sm focus:outline-none focus:ring-indigo-500 bg-white border-gray-300 text-gray-900 dark:bg-gray-700 dark:border-gray-600 dark:text-gray-100 focus:border-indigo-500"
                            required
                        />
                        <button
                            type="button"
                            onClick={handleSetToday}
                            className="px-4 py-2 bg-indigo-500 text-white rounded-r-md hover:bg-indigo-600 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 transition-colors duration-200"
                        >
                            {t('today')}
                        </button>
                    </div>
                </div>
                {scheduleType !== 'noTapas' && (
                    <>
                <div className="col-span-1">
                    <label htmlFor="startTime" className="block text-sm font-medium text-gray-700 dark:text-gray-300">{t('startTime')} ({t('causeOptional').split('(')[0].trim().toLowerCase()})</label>
                    <input
                        type="time"
                        id="startTime"
                        value={startTime}
                        onChange={(e) => setStartTime(e.target.value)}
                        className="mt-1 block w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 bg-white border-gray-300 text-gray-900 dark:bg-gray-700 dark:border-gray-600 dark:text-gray-100 focus:border-indigo-500"
                    />
                </div>
                <div className="col-span-1">
                    <label htmlFor="duration" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                        {t('duration')} [{scheduleType === 'weekly' ? t('weeks').toLowerCase() : t('days').toLowerCase()}]
                    </label>
                    <div className="flex items-center mt-1">
                        <input
                            type="number"
                            id="duration"
                            value={duration}
                            onChange={handleChangeDuration} // Use the new handler
                            className="block w-full px-3 py-2 border rounded-l-md shadow-sm focus:outline-none focus:ring-indigo-500 bg-white border-gray-300 text-gray-900 dark:bg-gray-700 dark:border-gray-600 dark:text-gray-100 focus:border-indigo-500"
                            required
                            min="1"
                        />
                        <button
                            type="button"
                            onClick={() => handleSetDurationFromButton(7, scheduleType === 'weekly' ? 'weeks' : 'days')} // Updated handler
                            className="px-3 py-2 bg-indigo-500 text-white hover:bg-indigo-600 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 transition-colors duration-200"
                        >
                            {scheduleType === 'weekly' ? t('7w') : t('7d')}
                        </button>
                        <button
                            type="button"
                            onClick={() => handleSetDurationFromButton(49, scheduleType === 'weekly' ? 'weeks' : 'days')} // Updated handler
                            className="px-3 py-2 bg-indigo-500 text-white rounded-r-md hover:bg-indigo-600 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                        >
                            {scheduleType === 'weekly' ? t('49w') : t('49d')}
                        </button>
                    </div>
                </div>
                <div className="col-span-1">
                    <label htmlFor="endDate" className="block text-sm font-medium text-gray-700 dark:text-gray-300">{t('endDate')}</label>
                    <input
                        type="date"
                        id="endDate"
                        value={endDate}
                        onChange={handleChangeEndDate} // Use the new handler
                        className="mt-1 block w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 bg-white border-gray-300 text-gray-900 dark:bg-gray-700 dark:border-gray-600 dark:text-gray-100 focus:border-indigo-500"
                    />
                </div>
                <div className="col-span-full flex items-center mt-2">
                    <input
                        type="checkbox"
                        id="acknowledgeAfter"
                        checked={acknowledgeAfter}
                        onChange={(e) => setAcknowledgeAfter(e.target.checked)}
                        className="form-checkbox h-5 w-5 text-indigo-600 rounded"
                    />
                    <label htmlFor="acknowledgeAfter" className="ml-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
                        {t('acknowledgeAfter')}
                    </label>
                </div>
                    </>
                )}
                <div className="col-span-full">
                    <label htmlFor="description" className="block text-sm font-medium text-gray-700 dark:text-gray-300">{t('descriptionAndGoal')}</label>
                    <RichTextEditor
                        key={editingTapas ? editingTapas.id : 'new-tapas'} // Add a key to force remount
                        initialContent={initialDescription}
                        onEditorStateChange={handleDescriptionChange}
                    />
                </div>
                <div className="col-span-full">
                    <label htmlFor="goals" className="block text-sm font-medium text-gray-700 dark:text-gray-300">{t('goals0n')}</label>
                    <textarea
                        id="goals"
                        value={goals}
                        onChange={(e) => setGoals(e.target.value)}
                        rows="3"
                        className="mt-1 block w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 bg-white border-gray-300 text-gray-900 dark:bg-gray-700 dark:border-gray-600 dark:text-gray-100 focus:border-indigo-500"
                    ></textarea>
                </div>
                <div className="col-span-full">
                    <label htmlFor="parts" className="block text-sm font-medium text-gray-700 dark:text-gray-300">{t('parts0n')}</label>
                    <textarea
                        id="parts"
                        value={parts}
                        onChange={(e) => setParts(e.target.value)}
                        rows="3"
                        className="mt-1 block w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 bg-white border-gray-300 text-gray-900 dark:bg-gray-700 dark:border-gray-600 dark:text-gray-100 focus:border-indigo-500"
                    ></textarea>
                </div>
                {scheduleType !== 'noTapas' && (
                    <>
                <div className="col-span-full">
                    <label htmlFor="crystallizationTime" className="block text-sm font-medium text-gray-700 dark:text-gray-300">{t('crystallizationTime')}</label>
                    <input
                        type="number"
                        id="crystallizationTime"
                        value={crystallizationTime}
                        onChange={(e) => setCrystallizationTime(e.target.value)}
                        className="mt-1 block w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 bg-white border-gray-300 text-gray-900 dark:bg-gray-700 dark:border-gray-600 dark:text-gray-100 focus:border-indigo-500"
                        min="0"
                    />
                </div>
                {/* New checkbox for Allow Recuperation */}
                <div className="col-span-full flex items-center mt-2">
                    <input
                        type="checkbox"
                        id="allowRecuperation"
                        checked={allowRecuperation}
                        onChange={(e) => setAllowRecuperation(e.target.checked)}
                        className="form-checkbox h-5 w-5 text-indigo-600 rounded"
                        disabled={scheduleType === 'noTapas'}
                    />
                    <label htmlFor="allowRecuperation" className="ml-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
                        {t('allowRecuperation')}
                    </label>
                </div>
                    </>
                )}

                <div className="col-span-full flex justify-end space-x-3">
                    {/* Always show cancel button for Add/Edit form */}
                    <button
                        type="button"
                        onClick={onCancelEdit}
                        className="inline-flex justify-center py-2 px-4 border border-transparent shadow-sm text-sm font-medium rounded-md text-gray-700 bg-gray-200 hover:bg-gray-300 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 transition-colors duration-200"
                    >
                        {t('cancel')}
                    </button>
                    <button
                        type="submit"
                        className="inline-flex justify-center py-2 px-4 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 transition-colors duration-200"
                    >
                        {editingTapas ? t('updateTapas') : t('addTapas')}
                    </button>
                </div>
            </form>
        </div>
    );
};

// Helper function to calculate end date and remaining days
const getTapasDatesInfo = (tapasItem) => {
    const today = getStartOfDayUTC(new Date()); // Use UTC start of day
    
    // For 'noTapas' scheduleType, duration and dates are not applicable
    if (tapasItem.scheduleType === 'noTapas') {
        return { endDate: null, daysRemaining: null, daysOver: null };
    }

    const startDate = getStartOfDayUTC(tapasItem.startDate.toDate()); // Use UTC start of day
    
    const endDate = new Date(startDate);
    endDate.setDate(startDate.getDate() + tapasItem.duration - 1); // Reduced by one day
    endDate.setHours(0, 0, 0, 0);

    const diffTime = endDate.getTime() - today.getTime();
    const daysOver = Math.ceil(diffTime / timeDayMs);
    const daysRemaining = Math.max(0, daysOver);

    return { endDate, daysRemaining, daysOver };
};

// Component to display a list of Tapas
const TapasList = ({ tapas, onSelectTapas, showFilters = false, historyStatusFilter, setHistoryStatusFilter, historyTimeFilter, setHistoryTimeFilter }) => {
    const { locale } = useContext(LocaleContext);
    const { t } = useContext(AppContext);

    // Helper to get detailed status for active tapas display
    const getDetailedStatus = useCallback((tapasItem) => {
        const noTapas = tapasItem.scheduleType === 'noTapas';
        const startDate = noTapas ? null : getStartOfDayUTC(tapasItem.startDate.toDate()); // Use UTC start of day
        const today = getTapasDay(new Date(), tapasItem, startDate);

        if (noTapas) {
            const uniqueCheckedDays = getUniqueCheckedDays(tapasItem.checkedDays);
            let statusText = '';
            const dates = { "Week": 7, "Month": 30, "Year": 365 };
            let lastChecked = 0;
            Object.keys(dates).forEach(name => {
                const duration = dates[name];
                const date = getStartOfDayUTC(new Date(today.getTime() - (duration * timeDayMs)));
                const checkedDates = countCheckedSince(uniqueCheckedDays, date);
                if (checkedDates > lastChecked || (!statusText && duration==365)) {
                    if (statusText) {
                        statusText += ' ~ '
                    }
                    statusText += t('last' + name) + ': ' + checkedDates;
                }
                lastChecked = checkedDates;
            });
            return { statusText: statusText, statusClass: 'text-gray-600 dark:text-gray-400' }; // No pending status for 'noTapas'
        }

        let pendingStatus = { statusText: '', statusClass: '' };

        const endDate = new Date(startDate);
        endDate.setDate(startDate.getDate() + tapasItem.duration - 1);

        const isWeekly = tapasItem.scheduleType === 'weekly';

        const daysDelta = getScheduleFactor(tapasItem.scheduleType, tapasItem.scheduleInterval);
        const yesterday = getStartOfDayUTC(new Date(today.getTime() - (daysDelta * timeDayMs)));
        const tomorrow = getStartOfDayUTC(new Date(today.getTime() + (daysDelta * timeDayMs)));

        const isTodayWithinDuration = today >= startDate && today <= endDate;
        const isTodayChecked = isTapasDateChecked(tapasItem.checkedDays, today);
        const todayPending = isTodayWithinDuration && !isTodayChecked;

        const isYesterdayWithinDuration = yesterday >= startDate && yesterday <= endDate;
        const isYesterdayChecked = isTapasDateChecked(tapasItem.checkedDays, yesterday);
        const yesterdayPending = isYesterdayWithinDuration && !isYesterdayChecked;

        if (yesterdayPending) {
            pendingStatus = { statusText: t((isWeekly ? 'lastWeek' : 'yesterday') + 'Pending'), statusClass: 'text-red-600' };
        } else if (todayPending && !tapasItem.acknowledgeAfter) {
            const isTodayPending = !isWeekly || today.getTime() == getStartOfDayUTC(new Date()).getTime();
            const pendingDay = isTodayPending ? 'today' : 'thisWeek';
            const pendingColor = isTodayPending ? 'text-orange-600' : 'text-gray-600';
            pendingStatus = { statusText: t(pendingDay + 'Pending'), statusClass: pendingColor };
        }

        let leftOutDaysCount = 0;
        const loopDate = new Date(startDate);
        const loopEnd = tapasItem.acknowledgeAfter ? yesterday : today;
        while (loopDate < loopEnd && loopDate <= endDate) { // Iterate up to yesterday
            if (!isTapasDateChecked(tapasItem.checkedDays, loopDate)) {
                leftOutDaysCount++;
            }
            loopDate.setDate(loopDate.getDate() + daysDelta);
        }
        if (!pendingStatus.statusText && leftOutDaysCount > 0) {
            pendingStatus = { statusText: `${leftOutDaysCount} ${t((isWeekly ? 'weeks' : 'days') + 'LeftOut')}`, statusClass: 'text-gray-600' };
        }

        return pendingStatus;
    }, [t]);

    // Filter tapas based on status and time for history tab
    const filterTapas = useCallback((tapasList) => {
        let filtered = tapasList;

        // Apply status filter
        if (historyStatusFilter !== 'all') {
            filtered = filtered.filter(tapas => tapas.status === historyStatusFilter);
        }

        // Apply time filter
        if (historyTimeFilter !== 'all') {
            const today = new Date();
            let filterDate = new Date();

            switch (historyTimeFilter) {
                case '1month':
                    filterDate.setMonth(today.getMonth() - 1);
                    break;
                case '3months':
                    filterDate.setMonth(today.getMonth() - 3);
                    break;
                case '1year':
                    filterDate.setFullYear(today.getFullYear() - 1);
                    break;
                case '2years':
                    filterDate.setFullYear(today.getFullYear() - 2);
                    break;
                default:
                    break;
            }
            filterDate.setHours(0, 0, 0, 0); // Normalize filter date

            filtered = filtered.filter(tapas => {
                const completionDate = tapas.completionDate ? tapas.completionDate.toDate() : tapas.createdAt.toDate(); // Use completionDate if available, otherwise createdAt
                return completionDate >= filterDate;
            });
        }
        return filtered;
    }, [historyStatusFilter, historyTimeFilter]);

    const displayedTapas = showFilters ? filterTapas(tapas) : tapas;


    return (
        <div className="space-y-4">
            {showFilters && (
                <div className="p-4 rounded-lg shadow-md mb-6 bg-white dark:bg-gray-800">
                    <div className="flex flex-col sm:flex-row justify-around items-center gap-4">
                        {/* Status Filter */}
                        <div className="flex items-center space-x-2">
                            <span className="font-medium text-gray-700 dark:text-gray-300">{t('filterBy')}:</span>
                            <select
                                value={historyStatusFilter}
                                onChange={(e) => setHistoryStatusFilter(e.target.value)}
                                className="px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 bg-white border-gray-300 text-gray-900 dark:bg-gray-700 dark:border-gray-600 dark:text-gray-100"
                            >
                                <option value="all">{t('all')}</option>
                                <option value="successful">{t('successful')}</option>
                                <option value="failed">{t('failed')}</option>
                            </select>
                        </div>

                        {/* Time Filter */}
                        <div className="flex items-center space-x-2">
                            <span className="font-medium text-gray-700 dark:text-gray-300">{t('timeframe')}:</span>
                            <select
                                value={historyTimeFilter}
                                onChange={(e) => setHistoryTimeFilter(e.target.value)}
                                className="px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 bg-white border-gray-300 text-gray-900 dark:bg-gray-700 dark:border-gray-600 dark:text-gray-100"
                            >
                                <option value="all">{t('all')}</option>
                                <option value="1month">{t('1month')}</option>
                                <option value="3months">{t('3months')}</option>
                                <option value="1year">{t('1year')}</option>
                                <option value="2years">{t('2years')}</option>
                            </select>
                        </div>
                    </div>
                </div>
            )}
            {displayedTapas.length === 0 ? (
                <p className="text-center py-8 text-gray-600 dark:text-gray-400">{t('noTapasFound')}</p>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {displayedTapas.map((tapasItem) => {
                    const { endDate, daysRemaining, daysOver } = getTapasDatesInfo(tapasItem);
                    const { statusText, statusClass } = getDetailedStatus(tapasItem); // Get detailed status

                    // Calculate undone parts for active tapas
                    const undoneParts = [];
                    if (tapasItem.status === 'active' && tapasItem.parts && tapasItem.parts.length > 0) {
                        const todayDateString = formatDateNoTimeToISO(new Date());
                        const checkedPartsForToday = tapasItem.checkedPartsByDate?.[todayDateString] || [];
                        if (checkedPartsForToday.length > 0) {
                            tapasItem.parts.forEach((part, index) => {
                                if (!checkedPartsForToday.includes(index)) {
                                    undoneParts.push(part);
                                }
                            });
                        }
                    }

                    const dayOfWeek = tapasItem.startDate?.toDate().toLocaleDateString(locale, { weekday: "long" });

                    return (
                        <div
                            key={tapasItem.id}
                            className="p-5 rounded-lg shadow-md hover:shadow-lg transition-shadow duration-200 cursor-pointer bg-white text-gray-700 dark:bg-gray-800 dark:text-gray-200"
                            onClick={() => onSelectTapas(tapasItem)}
                        >
                            <h3 className="text-xl font-semibold text-indigo-700 mb-2">{tapasItem.name}
                                {tapasItem.status === 'active' && tapasItem.scheduleType !== 'noTapas' && (<span className="text-sm text-red-700">&nbsp;&nbsp;&nbsp;{daysOver < 0 ? '['+t('expired')+']' : (tapasItem.scheduleType === 'weekly' ? dayOfWeek : '')}</span>)}
                            </h3>
                            {tapasItem.scheduleType !== 'noTapas' && (
                                <>
                                    <p className="text-sm text-gray-600 dark:text-gray-400">{t('timeframe')}: {tapasItem.startDate.toDate().toLocaleDateString()} - {endDate.toLocaleDateString()}</p>
                                    <p className="text-sm text-gray-600 dark:text-gray-400">
                                        {t('duration')}: {Math.ceil(tapasItem.duration / getTotalUnits(tapasItem.scheduleType))} {t(tapasItem.scheduleType === 'weekly' ? 'weeks' : 'days').toLowerCase()}
                                    </p>
                                    {tapasItem.scheduleType === 'everyNthDays' && (<p className="text-sm text-gray-600 dark:text-gray-400">
                                        {t('schedule')}: {t('Ntimes', Math.ceil(tapasItem.duration / tapasItem.scheduleInterval))} {t('everyNthDays', tapasItem.scheduleInterval).toLowerCase()}</p>
                                    )}
                                    {tapasItem.status === 'active' && (
                                        <p className="text-sm font-medium text-blue-600 mt-2">{t('daysRemaining')}: {daysRemaining}</p>
                                    )}
                                </>
                            )}
                            {tapasItem.status === 'successful' && (
                                <p className="text-sm font-medium text-green-600 mt-2">{t('status')}: {t('successful')}</p>
                            )}
                            {tapasItem.status === 'failed' && (
                                <p className="text-sm font-medium text-red-600 mt-2">{t('status')}: {t('failed')}</p>
                            )}
                            {/* Display new statuses for active tapas */}
                            {tapasItem.status === 'active' && statusText && (
                                <p className={`text-sm font-bold mt-1 ${statusClass}`}>{statusText}</p>
                            )}
                            {/* Display undone parts for active tapas */}
                            {tapasItem.status === 'active' && undoneParts.length > 0 && tapasItem.scheduleType !== 'noTapas' && (
                                <div className="mt-2">
                                    <p className="text-sm font-semibold text-gray-700 dark:text-gray-300">Unerledigte Teile für heute:</p>
                                    <ul className="list-disc list-inside ml-4 text-sm text-gray-600 dark:text-gray-400">
                                        {undoneParts.map((part, idx) => (
                                            <li key={idx}>{part}</li>
                                        ))}
                                    </ul>
                                </div>
                            )}
                        </div>
                    );
                })}
                </div>
            )}
        </div>
    );
};

// Component for adding/updating results
const ResultsModal = ({ tapas, onClose, onSaveResults }) => {
    const { t } = useContext(AppContext);
    const [resultsText, setResultsText] = useState(tapas.results || '');

    const handleSave = () => {
        onSaveResults(resultsText);
        // onClose(); // We no longer close the modal after save to allow for immediate review
    };

    return (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-75 flex items-center justify-center p-4 z-50">
            <div className="p-6 rounded-lg shadow-xl max-w-lg w-full mx-auto bg-white text-gray-800 dark:bg-gray-800 dark:text-gray-100">
                <h3 className="text-xl font-bold mb-4">{tapas.results ? t('updateResults') : t('addResults')}</h3>
                <textarea
                    value={resultsText}
                    onChange={(e) => setResultsText(e.target.value)}
                    rows="6"
                    className="mt-1 block w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 bg-white border-gray-300 text-gray-900 dark:bg-gray-700 dark:border-gray-600 dark:text-gray-100 focus:border-indigo-500 mb-4"
                    placeholder={t('results')}
                ></textarea>
                <div className="flex justify-end space-x-4">
                    <button
                        onClick={onClose}
                        className="bg-gray-300 text-gray-800 px-4 py-2 rounded-md hover:bg-gray-400 transition-colors duration-200"
                    >
                        {t('cancel')}
                    </button>
                    <button
                        onClick={handleSave}
                        className="bg-indigo-600 text-white px-4 py-2 rounded-md hover:bg-indigo-700 transition-colors duration-200"
                    >
                        {tapas.results ? t('updateResults') : t('addResults')}
                    </button>
                </div>
            </div>
        </div>
    );
};


// Component for a single Tapas detail view
const TapasDetail = ({ tapas, onClose, onEdit, setSelectedTapas }) => { // Added setSelectedTapas prop
    const { locale } = useContext(LocaleContext);
    const { db, userId, t } = useContext(AppContext);

    const [confirmDelete, setConfirmDelete] = useState(false);
    const [confirmName, setConfirmName] = useState('');
    const [showFailDialog, setShowFailDialog] = useState(false);
    const [failureCause, setFailureCause] = useState('');
    const [repeatOption, setRepeatOption] = useState('sameDuration'); // Default for repeat dialog
    const [newRepeatDuration, setNewRepeatDuration] = useState('');
    const [message, setMessage] = useState('');
    const [checkedPartsSelection, setCheckedPartsSelection] = useState({}); // { index: true, ... } for parts checked today (transient)
    const [showRepeatDialog, setShowRepeatDialog] = useState(false); // New state for repeat dialog
    const [showRecuperationAdvanceMenu, setShowRecuperationAdvanceMenu] = useState(false); // State for dropdown menu
    const [showAcknowledgeNDaysMenu, setShowAcknowledgeNDaysMenu] = useState(false); // New state for acknowledge N days menu
    const [acknowledgeNDaysInput, setAcknowledgeNDaysInput] = useState(''); // Input for N days
    const [showResultsModal, setShowResultsModal] = useState(false); // State for results modal


    const appId = typeof __app_id !== 'undefined' ? __app_id : 'default-app-id';
    const tapasRef = doc(db, `artifacts/${appId}/users/${userId}/tapas`, tapas.id);

    const startDateObj = tapas.startDate ? getStartOfDayUTC(tapas.startDate.toDate()) : null; // Use UTC start of day

    const endDateObj = tapas.duration ? new Date(startDateObj) : null;
    if (endDateObj && tapas.duration) {
        endDateObj.setDate(startDateObj.getDate() + tapas.duration - 1); // Reduced by one day
    }

    const noTapas = tapas.scheduleType === 'noTapas';
    const totalUnits = noTapas ? 0 : Math.ceil(tapas.duration / getScheduleFactor(tapas.scheduleType, tapas.scheduleInterval));
    const checkedUnitsCount = tapas.checkedDays ? getUniqueCheckedDays(tapas.checkedDays).length : 0; // Use unique count

    // Check if a specific date has been checked
    const isDateChecked = (date) => isTapasDateChecked(tapas.checkedDays, date);

    // Check if a specific date has been recuperated
    const isDateRecuperated = (date) => tapas.recuperatedDays && getUniqueCheckedDays(tapas.recuperatedDays).some(timestamp => {
        const recuperatedDate = timestamp.toDate();
        return formatDateNoTimeToISO(recuperatedDate) === formatDateNoTimeToISO(date);
    });

     // Check if a specific date has been advanced
    const isDateAdvanced = (date) => tapas.advancedDays && getUniqueCheckedDays(tapas.advancedDays).some(timestamp => {
        const advancedDate = timestamp.toDate();
        return formatDateNoTimeToISO(advancedDate) === formatDateNoTimeToISO(date);
    });

    const today = getTapasDay(new Date(), tapas, startDateObj);
    const daysDelta = getScheduleFactor(tapas.scheduleType, tapas.scheduleInterval);
    const yesterday = getStartOfDayUTC(new Date(today.getTime() - (daysDelta * timeDayMs))); // Calculate from UTC today
    const tomorrow = getStartOfDayUTC(new Date(today.getTime() + (daysDelta * timeDayMs))); // Calculate from UTC today

    const isTodayChecked = isDateChecked(today);
    const isYesterdayChecked = isDateChecked(yesterday);
    const isTomorrowChecked = isDateChecked(tomorrow);

    const todayDateString = formatDateNoTimeToISO(today);

    // Check if the tapas period is over
    const isTodayValid = startDateObj <= today && (noTapas || today <= endDateObj);
    const isYesterdayValid = startDateObj <= yesterday && (noTapas || yesterday <= endDateObj);
    const isPeriodEndOrOver = !noTapas && today >= endDateObj;
    const isSuccessful = tapas.status === 'successful';
    const isFailed = tapas.status === 'failed';

    // Load checkedPartsSelection from database on mount/tapas change
    useEffect(() => {
        if (noTapas || !todayDateString) {
            setCheckedPartsSelection({});
            return;
        }
        const savedParts = tapas.checkedPartsByDate?.[todayDateString] || [];
        const initialSelection = savedParts.reduce((acc, index) => {
            acc[index] = true;
            return acc;
        }, {});
        setCheckedPartsSelection(initialSelection);
    }, [tapas.id, tapas.checkedPartsByDate, todayDateString, noTapas, tapas.scheduleType]); // Add tapas.checkedPartsByDate to dependency array


    const handlePartCheckboxChange = async (index) => {
        const newCheckedPartsSelection = {
            ...checkedPartsSelection,
            [index]: !checkedPartsSelection[index]
        };
        setCheckedPartsSelection(newCheckedPartsSelection);

        const updatedCheckedPartsIndices = Object.keys(newCheckedPartsSelection)
            .filter(key => newCheckedPartsSelection[key])
            .map(Number); // Convert keys back to numbers

        const updatedCheckedPartsByDate = {
            ...(tapas.checkedPartsByDate || {}),
            [todayDateString]: updatedCheckedPartsIndices
        };

        try {
            await updateDoc(tapasRef, { checkedPartsByDate: updatedCheckedPartsByDate });
        } catch (error) {
            console.error("Error updating checked parts for today:", error);
            setMessage("Error saving part progress.");
        }
    };


    const handleMarkUnitFinished = async (dateToMark) => {
        let successMessageKey;

        const dateForCheckedDays = getStartOfDayUTC(dateToMark);
        if (tapas.scheduleType === 'weekly') {
            successMessageKey = 'weekCheckedSuccessfully';
        } else {
            successMessageKey = 'dayCheckedSuccessfully';
        }

        if (isTapasDateChecked(tapas.checkedDays, dateForCheckedDays)) {
            setMessage(t('dayAlreadyChecked')); // Re-using dayAlreadyChecked for now
            return;
        }

        const updatedCheckedDays = getUniqueCheckedDays([...(tapas.checkedDays || []), Timestamp.fromDate(dateForCheckedDays)]);

        try {
            await updateDoc(tapasRef, {
                checkedDays: updatedCheckedDays,
            });
            setMessage(t(successMessageKey));
            if (dateForCheckedDays.toISOString().split('T')[0] === todayDateString) {
                 setCheckedPartsSelection({}); // Clear the UI selection state for parts for next day/interaction
            }
            setSelectedTapas(prev => ({ ...prev, checkedDays: updatedCheckedDays })); // Immediately update local state
        } catch (error) {
            console.error("Error marking unit finished:", error);
            setMessage("Error marking unit finished.");
        }

        // If all units checked, mark as successful
        if (updatedCheckedDays.length === totalUnits && isPeriodEndOrOver) {
            await updateDoc(tapasRef, { status: 'successful' });
            setMessage(t('tapasCompletedSuccessfully'));
            setSelectedTapas(prev => ({ ...prev, status: 'successful' })); // Immediately update local state for status
        }
    };

    const handleRecuperateUnit = async (dateToRecuperate) => {
        if (!tapas.allowRecuperation) return;

        let dateForCheckedDays;
        if (tapas.scheduleType === 'weekly') {
            dateForCheckedDays = getStartOfWeekUTC(dateToRecuperate);
        } else {
            dateForCheckedDays = getStartOfDayUTC(dateToRecuperate);
        }

        if (isDateChecked(dateForCheckedDays) || dateForCheckedDays < startDateObj || dateForCheckedDays > endDateObj) {
            setMessage(t('notApplicableAlreadyCheckedOrOutsideDuration'));
            return;
        }

        const updatedCheckedDays = getUniqueCheckedDays([...(tapas.checkedDays || []), Timestamp.fromDate(dateForCheckedDays)]);
        const updatedRecuperatedDays = getUniqueCheckedDays([...(tapas.recuperatedDays || []), Timestamp.fromDate(dateForCheckedDays)]);

        try {
            await updateDoc(tapasRef, {
                checkedDays: updatedCheckedDays,
                recuperatedDays: updatedRecuperatedDays,
            });
            setMessage(t('dayRecuperatedSuccessfully')); // Re-using dayRecuperatedSuccessfully
            setSelectedTapas(prev => ({ ...prev, checkedDays: updatedCheckedDays, recuperatedDays: updatedRecuperatedDays })); // Immediately update local state
            setShowRecuperationAdvanceMenu(false); // Close dropdown
        } catch (error) {
            console.error("Error recuperating unit:", error);
            setMessage(`Error: ${error.message}`);
        }
    };

    const handleAdvanceUnits = async () => {
        if (!tapas.allowRecuperation) return;

        const datesToMark = [];
        const advancedDates = [];

        const thisUnit = getTapasDay(today, tapas, startDateObj);
        const nextUnit = new Date(thisUnit.getTime() + (getScheduleFactor(tapas.scheduleType, tapas.scheduleInterval) * timeDayMs)); // Calculate from UTC next week

        if (!isDateChecked(thisUnit) && thisUnit >= startDateObj && thisUnit <= endDateObj) {
            datesToMark.push(thisUnit);
        }
        if (!isDateChecked(nextUnit) && nextUnit >= startDateObj && nextUnit <= endDateObj) {
            datesToMark.push(nextUnit);
            advancedDates.push(nextUnit);
        }

        if (datesToMark.length === 0) {
            setMessage(t('notApplicableAlreadyCheckedOrOutsideDuration'));
            return;
        }

        const updatedCheckedDays = getUniqueCheckedDays([...(tapas.checkedDays || []), ...datesToMark.map(d => Timestamp.fromDate(d))]);
        const updatedAdvancedDays = getUniqueCheckedDays([...(tapas.advancedDays || []), ...advancedDates.map(d => Timestamp.fromDate(d))]);

        try {
            await updateDoc(tapasRef, {
                checkedDays: updatedCheckedDays,
                advancedDays: updatedAdvancedDays,
            });
            setMessage(t('daysAdvancedSuccessfully')); // Re-using daysAdvancedSuccessfully
            setSelectedTapas(prev => ({ ...prev, checkedDays: updatedCheckedDays, advancedDays: updatedAdvancedDays })); // Immediately update local state
            setShowRecuperationAdvanceMenu(false); // Close dropdown
        } catch (error) {
            console.error("Error advancing units:", error);
            setMessage(`Error: ${error.message}`);
        }
    };

    const handleAcknowledgeLastNUnits = async (nUnits) => {
        if (isNaN(nUnits) || nUnits <= 0) {
            setMessage("Please enter a valid number.");
            return;
        }

        let unitsToAcknowledge = [];
        const currentRefDate = getTapasDay(new Date(), tapas, startDateObj);
        const daysDelta = getScheduleFactor(tapas.scheduleType, tapas.scheduleInterval);

        for (let i = nUnits - 1; i >= 2; i--) {
            const dateToAcknowledge = getStartOfDayUTC(new Date(currentRefDate.getTime() - (i * daysDelta * timeDayMs)));
            
            // Ensure the date is within the tapas duration
            if (dateToAcknowledge < startDateObj || dateToAcknowledge > endDateObj) {
                continue; // Skip if outside duration
            }

            if (!isTapasDateChecked(tapas.checkedDays, dateToAcknowledge)) {
                unitsToAcknowledge.push(Timestamp.fromDate(dateToAcknowledge));
            }
        }

        const updatedCheckedDays = getUniqueCheckedDays([...(tapas.checkedDays || []), ...unitsToAcknowledge]);

        try {
            await updateDoc(tapasRef, { checkedDays: updatedCheckedDays });
            setMessage(`Successfully acknowledged last ${nUnits} ${tapas.scheduleType === 'weekly' ? t('weeks').toLowerCase() : t('days').toLowerCase()}.`);
            setSelectedTapas(prev => ({ ...prev, checkedDays: updatedCheckedDays }));
        } catch (error) {
            console.error("Error acknowledging last N units:", error);
            setMessage(`Error acknowledging units: ${error.message}`);
        } finally {
            setShowAcknowledgeNDaysMenu(false);
            setAcknowledgeNDaysInput('');
        }
    };


    const handleClearLastUnit = async () => {
        if (!tapas.checkedDays || tapas.checkedDays.length === 0) {
            setMessage(t('noDayToClear')); // Re-using noDayToClear
            setShowRecuperationAdvanceMenu(false);
            return;
        }

        const sortedCheckedDays = [...tapas.checkedDays].sort((a, b) => b.toDate().getTime() - a.toDate().getTime());
        const lastCheckedDayTimestamp = sortedCheckedDays[0];
        const lastCheckedUnitDate = getTapasDay(lastCheckedDayTimestamp.toDate(), tapas, startDateObj);

        /*const currentRefDate = getTapasDay(new Date(), tapas, startDateObj);
        const diffUnits = (currentRefDate.getTime() - lastCheckedUnitDate.getTime()) / (timeDayMs * getScheduleFactor(tapas.scheduleType, tapas.scheduleInterval));

        if (diffUnits < 0) { // Future unit
            setMessage(t('cannotClearFutureDay')); // Re-using cannotClearFutureDay
            setShowRecuperationAdvanceMenu(false);
            return;
        } else if (diffUnits > 1) { // Older than last/current unit
            setMessage(t('noDayToClear')); // Re-using noDayToClear
            setShowRecuperationAdvanceMenu(false);
            return;
        }*/

        const dateFunc = tapas.scheduleType === 'weekly' ? formatStartOfWeekNoTimeToISO : formatDateNoTimeToISO;

        const newCheckedDays = tapas.checkedDays.filter(
            ts => dateFunc(ts.toDate()) !== dateFunc(lastCheckedUnitDate)
        );

        const newRecuperatedDays = tapas.recuperatedDays ? tapas.recuperatedDays.filter(
            ts => dateFunc(ts.toDate()) !== dateFunc(lastCheckedUnitDate)
        ) : [];
        const newAdvancedDays = tapas.advancedDays ? tapas.advancedDays.filter(
            ts => dateFunc(ts.toDate()) !== dateFunc(lastCheckedUnitDate)
        ) : [];

        const newCheckedPartsByDate = { ...(tapas.checkedPartsByDate || {}) };
        delete newCheckedPartsByDate[formatDateToISO(lastCheckedUnitDate)];

        try {
            await updateDoc(tapasRef, {
                checkedDays: getUniqueCheckedDays(newCheckedDays),
                recuperatedDays: getUniqueCheckedDays(newRecuperatedDays),
                advancedDays: getUniqueCheckedDays(newAdvancedDays),
                checkedPartsByDate: newCheckedPartsByDate,
                status: (tapas.status === 'successful' && getUniqueCheckedDays(newCheckedDays).length < totalUnits) ? 'active' : tapas.status
            });

            setSelectedTapas(prev => ({
                ...prev,
                checkedDays: getUniqueCheckedDays(newCheckedDays),
                recuperatedDays: getUniqueCheckedDays(newRecuperatedDays),
                advancedDays: getUniqueCheckedDays(newAdvancedDays),
                checkedPartsByDate: newCheckedPartsByDate,
                status: (tapas.status === 'successful' && getUniqueCheckedDays(newCheckedDays).length < totalUnits) ? 'active' : tapas.status
            }));

            setMessage(t('dayClearedSuccessfully')); // Re-using dayClearedSuccessfully

            if (tapas.status === 'successful' && getUniqueCheckedDays(newCheckedDays).length < totalUnits) {
                setMessage(t('tapasAutoMarkedActive'));
            }
        } catch (error) {
            console.error("Error clearing last unit:", error);
            setMessage(`${t('errorClearingDay')} ${error.message}`); // Re-using errorClearingDay
        } finally {
            setShowRecuperationAdvanceMenu(false);
        }
    };


    const handleDelete = async () => {
        if (confirmName === tapas.name) {
            try {
                await deleteDoc(tapasRef);
                setMessage(t('tapasDeletedSuccessfully'));
                onClose(); // Close the detail view
            } catch (e) {
                console.error("Error deleting document: ", e);
                setMessage(`${t('errorDeletingTapas')} ${e.message}`);
            } finally {
                setConfirmDelete(false);
                setConfirmName('');
            }
        } else {
            setMessage(t('nameMismatch'));
        }
    };

    const handleMarkFailed = async () => {
        setShowFailDialog(true);
        // Ensure repeatOption is reset when opening the fail dialog
        setRepeatOption('none');
        setNewRepeatDuration('');
    };

    const handleRepeat = () => {
        setShowRepeatDialog(true);
        // Set a sensible default for the repeat dialog
        setRepeatOption('sameDuration');
        setNewRepeatDuration('');
    };

    const confirmFail = async () => {
        try {
            await updateDoc(tapasRef, { status: 'failed', failureCause: failureCause || null });
            setMessage(t('tapasMarkedAsFailed'));
            setShowFailDialog(false);

            if (repeatOption !== 'none') {
                let newDurationDays = tapas.duration; // Default to original duration in days
                let newStartDate = getStartOfDayUTC(new Date()); // New tapas starts today in UTC

                if (repeatOption === 'newDuration') {
                    if (isNaN(parseInt(newRepeatDuration)) || parseInt(newRepeatDuration) <= 0) {
                        setMessage(t('invalidNewDuration'));
                        return;
                    }
                    newDurationDays = parseInt(newRepeatDuration);
                    if (tapas.scheduleType === 'weekly') {
                        newDurationDays *= 7; // Convert weeks to days for storage
                    }
                } else if (repeatOption === 'untilEndDate') {
                    // Calculate duration until original end date (if it's in the future)
                    const diffTime = endDateObj.getTime() - newStartDate.getTime();
                    const diffDays = Math.ceil(diffTime / timeDayMs);
                    if (diffDays > 0) {
                        newDurationDays = diffDays;
                    } else {
                        setMessage(t('originalEndDateInPast'));
                        return;
                    }
                }

                let newName = tapas.name;
                const repeatRegex = /\(Repeat(?: (\d+))?\)/;
                const match = newName.match(repeatRegex);

                if (match) {
                    if (match[1]) {
                        const currentRepeatNum = parseInt(match[1]);
                        newName = newName.replace(repeatRegex, `(Repeat ${currentRepeatNum + 1})`);
                    } else {
                        newName = newName.replace('(Repeat)', '(Repeat 2)');
                    }
                } else {
                    newName = `${newName} (Repeat)`;
                }

                const newTapasData = {
                    name: newName,
                    startDate: newStartDate,
                    startTime: tapas.startTime,
                    duration: newDurationDays, // Save in days
                    description: tapas.description,
                    goals: tapas.goals, // Carry over goals to new tapas
                    parts: tapas.parts,
                    crystallizationTime: tapas.crystallizationTime,
                    status: 'active',
                    checkedDays: [],
                    failureCause: null,
                    recuperatedDays: [], // Reset for new tapas
                    advancedDays: [], // Reset for new tapas
                    createdAt: new Date(),
                    userId: userId,
                    checkedPartsByDate: {}, // New tapas starts with no checked parts
                    results: null, // New tapas starts with no results
                    shareReference: tapas.shareReference || null, // Carry over share reference if exists
                    scheduleType: tapas.scheduleType, // Carry over schedule type
                    scheduleInterval: tapas.scheduleInterval, // Carry over schedule interval
                    acknowledgeAfter: tapas.acknowledgeAfter, // Carry over acknowledgeAfter
                };
                const appId = typeof __app_id !== 'undefined' ? __app_id : 'default-app-id';
                await addDoc(collection(db, `artifacts/${appId}/users/${userId}/tapas`), newTapasData);
                setMessage(t('failedTapasRepeated'));
            }
            onClose(); // Close the detail view
        } catch (e) {
            console.error("Error marking failed or repeating: ", e);
            setMessage(`${t('errorMarkingFailedRepeating')} ${e.message}`);
        } finally {
            setShowFailDialog(false);
            setFailureCause('');
            setRepeatOption('none');
            setNewRepeatDuration('');
        }
    };

    const confirmRepeat = async () => {
        try {
            let newDurationDays = tapas.duration; // Default to original duration in days
            let newStartDate = getStartOfDayUTC(new Date()); // New tapas starts today in UTC

            if (repeatOption === 'newDuration') {
                if (isNaN(parseInt(newRepeatDuration)) || parseInt(newRepeatDuration) <= 0) {
                    setMessage(t('invalidNewDuration'));
                    return;
                }
                newDurationDays = parseInt(newRepeatDuration);
                if (tapas.scheduleType === 'weekly') {
                    newDurationDays *= 7; // Convert weeks to days for storage
                }
            } else if (repeatOption === 'untilEndDate') {
                const originalEndDateAsDate = endDateObj; // Already calculated
                const diffTime = originalEndDateAsDate.getTime() - newStartDate.getTime();
                const diffDays = Math.ceil(diffTime / timeDayMs);
                if (diffDays > 0) {
                    newDurationDays = diffDays;
                } else {
                    setMessage(t('originalEndDateInPast'));
                    return;
                }
            }

            let newName = tapas.name;
            const repeatRegex = /\(Repeat(?: (\d+))?\)/;
            const match = newName.match(repeatRegex);

            if (match) {
                if (match[1]) {
                    // Already has (Repeat X) -> increment X
                    const currentRepeatNum = parseInt(match[1]);
                    newName = newName.replace(repeatRegex, `(Repeat ${currentRepeatNum + 1})`);
                } else {
                    // Has (Repeat) -> change to (Repeat 2)
                    newName = newName.replace('(Repeat)', '(Repeat 2)');
                }
            } else {
                // No repeat part, add (Repeat)
                newName = `${newName} (Repeat)`;
            }

            const newTapasData = {
                name: newName,
                startDate: newStartDate,
                startTime: tapas.startTime,
                duration: newDurationDays, // Save in days
                description: tapas.description,
                goals: tapas.goals, // Carry over goals to new tapas
                parts: tapas.parts,
                crystallizationTime: tapas.crystallizationTime || '',
                allowRecuperation: tapas.allowRecuperation || false,
                status: 'active',
                checkedDays: [],
                failureCause: null,
                recuperatedDays: [], // Reset for new tapas
                advancedDays: [], // Reset for new tapas
                createdAt: new Date(),
                userId: userId,
                checkedPartsByDate: {},
                results: null, // New tapas starts with no results
                shareReference: tapas.shareReference || null, // Carry over share reference if exists
                scheduleType: tapas.scheduleType || 'daily', // Carry over schedule type
                scheduleInterval: tapas.scheduleInterval || '', // Carry over schedule interval
                acknowledgeAfter: tapas.acknowledgeAfter || false, // Carry over acknowledgeAfter
            };
            const appId = typeof __app_id !== 'undefined' ? __app_id : 'default-app-id';
            await addDoc(collection(db, `artifacts/${appId}/users/${userId}/tapas`), newTapasData);
            setMessage(t('tapasRepeatedSuccessfully'));
            setShowRepeatDialog(false); // Close the dialog
            onClose(); // Close the detail view
        } catch (e) {
            console.error("Error repeating tapas: ", e);
            setMessage(`Error repeating Tapas: ${e.message}`);
        } finally {
            setRepeatOption('none');
            setNewRepeatDuration('');
        }
    };


    const checkDailyProgress = async () => {
        if (tapas.scheduleType === 'noTapas' || !isPeriodEndOrOver || isSuccessful || isFailed) return;

        // Automatically mark as successful if all units checked (unique count) and period is over
        if (checkedUnitsCount >= totalUnits) {
            await updateDoc(tapasRef, { status: 'successful' });
            setMessage(t('tapasAutoMarkedSuccessful'));
        } else {
            // If period is over but not all units checked, suggest marking as failed
            setMessage(t('tapasPeriodOverNotAllDaysChecked')); // Re-using this message
        }
    };

    // Run this check when the component mounts or tapas data changes
    useEffect(() => {
        checkDailyProgress();
    }, [tapas]);

    const handleSaveResults = async (results) => {
        try {
            await updateDoc(tapasRef, { results: results });
            setSelectedTapas(prevTapas => ({ ...prevTapas, results: results })); // Immediately update local state
            setMessage(tapas.results ? t('updateResults') : t('addResults') + ' ' + t('successfully') + '!'); // Update results message
        } catch (error) {
            console.error("Error saving results:", error);
            setMessage("Error saving results.");
        }
    };

    const handleShareTapas = async () => {
        if (tapas.scheduleType === 'noTapas') {
            setMessage(t('noShareNoTapas'));
            return;
        }

        if (!db || !tapas.id) {
            setMessage(t('shareLinkError') + " Database or Tapas ID missing.");
            return;
        }

        const appId = typeof __app_id !== 'undefined' ? __app_id : 'default-app-id';
        // Corrected path for public shared tapas collection
        const publicSharedTapasCollectionRef = collection(db, `artifacts/${appId}/public/data/sharedTapas`);
        let currentShareReference = tapas.shareReference;

        try {
            if (!currentShareReference) {
                // Generate a new unique ID for the shared reference
                currentShareReference = crypto.randomUUID();

                // Store this shareReference in the user's private tapas document
                await updateDoc(tapasRef, { shareReference: currentShareReference });
                setSelectedTapas(prev => ({ ...prev, shareReference: currentShareReference })); // Update local state immediately
            }

            // Prepare static data for public sharing
            const staticTapasData = {
                name: tapas.name,
                sharedAt: new Date(),
                userId: userId,
                startDate: tapas.startDate,
                startTime: tapas.startTime,
                duration: tapas.duration,
                description: tapas.description || null,
                goals: tapas.goals || [],
                parts: tapas.parts || [],
                scheduleType: tapas.scheduleType,
                scheduleInterval: tapas.scheduleInterval,
                crystallizationTime: tapas.crystallizationTime || null,
                acknowledgeAfter: tapas.acknowledgeAfter, // Include acknowledgeAfter
                allowRecuperation: tapas.allowRecuperation || false,
                sharedCount: (tapas.sharedCount || 0) + 1, // Increment shared count
                adoptedCount: (tapas.adoptedCount || 0), // Initialize or preserve
            };

            // Get the public document reference
            const publicTapasDocRef = doc(publicSharedTapasCollectionRef, currentShareReference);
            const publicTapasDocSnap = await getDoc(publicTapasDocRef);

            if (publicTapasDocSnap.exists()) {
                // If it exists, update the counts
                await updateDoc(publicTapasDocRef, {
                    sharedCount: (publicTapasDocSnap.data().sharedCount || 0) + 1,
                });
            } else {
                // If it doesn't exist, create it with the static data and counts
                await setDoc(publicTapasDocRef, staticTapasData);
            }

            // Construct the shareable URL
            const shareUrl = `${window.location.origin}?ref=${currentShareReference}`;

            // Use native Share API if available
            if (navigator.share) {
                await navigator.share({
                    title: tapas.name,
                    text: t('appName') + `: ${tapas.name}`,
                    url: shareUrl,
                });
                setMessage(t('shareLinkCopied')); // Message after successful share
            } else {
                // Fallback to clipboard copy
                await navigator.clipboard.writeText(shareUrl);
                setMessage(t('shareLinkCopied'));
            }
        } catch (error) {
            console.error("Error sharing Tapas:", error);
            setMessage(`${t('shareLinkError')} ${error.message}`);
        }
    };

    // Determine the current date/week display based on scheduleType
    let displayDateInfo;
    const todayFormatted = new Date().toLocaleDateString(locale, { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });

    if (tapas.scheduleType === 'weekly') {
        const currentWeekStart = getStartOfWeekUTC(today);
        const currentWeekEnd = new Date(currentWeekStart);
        currentWeekEnd.setDate(currentWeekStart.getDate() + 6); // Sunday of the current week

        const currentWeekStartFormatted = currentWeekStart.toLocaleDateString(undefined, { day: 'numeric', month: 'short' });
        const currentWeekEndFormatted = currentWeekEnd.toLocaleDateString(undefined, { day: 'numeric', month: 'short' });

        displayDateInfo = t('thisWeekIs', currentWeekStartFormatted, currentWeekEndFormatted);
    } else {
        displayDateInfo = `${t('todayIs')} ${todayFormatted}`;
    }

    const { endDate, daysRemaining } = getTapasDatesInfo(tapas);

    return (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-75 flex items-center justify-center p-4 z-40 overflow-y-auto">
            <div className="p-6 rounded-lg shadow-xl max-w-lg w-full mx-auto my-auto bg-white text-gray-800 dark:bg-gray-800 dark:text-gray-100">
                <div className="flex justify-between items-center mb-6">
                    <h2 className="text-3xl font-bold text-gray-900 dark:text-gray-100">{tapas.name}</h2>
                    <button onClick={onClose} className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 text-3xl font-bold">
                        &times;
                    </button>
                </div>

                {message && <p className="mb-4 text-center text-green-600 font-medium">{message}</p>}

                <div className="space-y-4 text-gray-700 dark:text-gray-300">
                    {tapas.scheduleType === 'noTapas' && (
                        <p><strong className="font-semibold">{t('startDate')}:</strong> {tapas.startDate?.toDate().toLocaleDateString()}
                        </p>
                    )}
                    {tapas.scheduleType !== 'noTapas' && (
                        <>
                            <p><strong className="font-semibold">{t('timeframe')}:</strong> {tapas.startDate?.toDate().toLocaleDateString()} - {endDate?.toLocaleDateString()}
                            </p>
                            {tapas.startTime && <p><strong className="font-semibold">{t('startTime')}:</strong> {tapas.startTime}</p>}
                            <p>
                                <strong className="font-semibold">{t('duration')}:</strong> {Math.ceil(tapas.duration / getTotalUnits(tapas.scheduleType))} {t(tapas.scheduleType === 'weekly' ? 'weeks' : 'days').toLowerCase()}
                            </p>
                            {tapas.scheduleType === 'everyNthDays' && (
                            <p><strong className="font-semibold">{t('schedule')}:</strong> {t('Ntimes', Math.ceil(tapas.duration / tapas.scheduleInterval))} {t('everyNthDays', tapas.scheduleInterval).toLowerCase()}</p>
                            )}
                            {tapas.acknowledgeAfter && <p><strong className="font-semibold">{t('acknowledgeAfter')}:</strong> {t('yes')}</p>}
                        </>
                    )}
                    {tapas.description && (
                        <div>
                            <strong className="font-semibold">{t('description')}:</strong>
                            <LexicalHtmlRenderer editorStateHtml={tapas.description} />
                        </div>
                    )}
                    {tapas.goals && tapas.goals.length > 0 ? ( // Display goals if present
                        <div>
                            <strong className="font-semibold">{t('goals')}:</strong>
                            <ul className="list-disc list-inside ml-4">
                                {tapas.goals.map((goal, index) => (
                                    <li key={`goal-${index}`}>{goal}</li>
                                ))}
                            </ul>
                        </div>
                    ) : (
                        <p className="italic text-gray-500 dark:text-gray-400">{t('noGoalsDefinedYet')}</p>
                    )}
                    {tapas.parts && tapas.parts.length > 0 ? (
                        <div>
                            <strong className="font-semibold">{t('parts')}:</strong>
                            <ul className="list-none ml-4 space-y-2"> {/* Changed to list-none to better control spacing with checkboxes */}
                                {tapas.parts.map((part, index) => (
                                    <li key={index} className="flex items-center space-x-2">
                                        {!isSuccessful && !isFailed && tapas.scheduleType !== 'noTapas' && (
                                            <input
                                                type="checkbox"
                                                checked={!!checkedPartsSelection[index]}
                                                onChange={() => handlePartCheckboxChange(index)}
                                                className="form-checkbox h-4 w-4 text-indigo-600 rounded"
                                            />
                                        )}
                                        <span className={`${!!checkedPartsSelection[index] ? 'line-through text-gray-500' : ''}`}>{part}</span>
                                    </li>
                                ))}
                            </ul>
                        </div>
                    ) : (
                        <p className="italic text-gray-500 dark:text-gray-400">{t('noPartsDefinedYet')}</p>
                    )}
                    {!isSuccessful && !isFailed && (
                        <div className="flex justify-between space-x-2 mt-4"> {/* Use justify-between to push the "..." to the right */}
                            <div className="flex space-x-2">
                                <p className="text-sm font-medium text-gray-700 dark:text-gray-300">
                                    {displayDateInfo}
                                </p>
                                {!isTodayChecked && isTodayValid && !tapas.acknowledgeAfter && (
                                    <button
                                        onClick={() => handleMarkUnitFinished(today)}
                                        className="bg-green-600 text-white px-4 py-2 rounded-lg shadow-md hover:bg-green-700 transition-colors duration-200 text-sm font-medium"
                                    >
                                        {t((tapas.scheduleType === 'weekly' ? 'thisWeek' : 'today') + 'Finished')}
                                    </button>
                                )}
                                {!isYesterdayChecked && isYesterdayValid && (
                                    <button
                                        onClick={() => handleMarkUnitFinished(yesterday)}
                                        className="bg-blue-600 text-white px-4 py-2 rounded-lg shadow-md hover:bg-blue-700 transition-colors duration-200 text-sm font-medium"
                                    >
                                        {t((tapas.scheduleType === 'weekly' ? 'lastWeek' : 'yesterday') + 'Finished')}
                                    </button>
                                )}
                            </div>
                            <div className="relative"> {/* "..." button container */}
                                <button
                                    onClick={() => setShowRecuperationAdvanceMenu(!showRecuperationAdvanceMenu)}
                                    className="bg-blue-500 text-white px-4 py-2 rounded-lg shadow-lg hover:bg-blue-600 transition-colors duration-200 text-lg font-medium"
                                >
                                    ...
                                </button>
                                {showRecuperationAdvanceMenu && (
                                    <div className="absolute right-0 mt-2 w-max rounded-md shadow-lg py-1 z-20 bg-white text-gray-800 dark:bg-gray-700 dark:text-gray-100">
                                        {(tapas.allowRecuperation && !isYesterdayChecked && yesterday >= startDateObj && yesterday <= endDateObj) && (
                                            <button
                                                onClick={() => handleRecuperateUnit(yesterday)}
                                                className="block w-full text-left px-4 py-2 hover:bg-gray-100 dark:hover:bg-gray-600"
                                            >
                                                {t(tapas.scheduleType === 'weekly' ? 'lastWeekRecuperated' : 'yesterdayRecuperated')}
                                            </button>
                                        )}
                                        {(tapas.allowRecuperation && (!isTodayChecked || !isTomorrowChecked) && today >= startDateObj && today <= endDateObj) && (
                                            <button
                                                onClick={handleAdvanceUnits}
                                                className="block w-full text-left px-4 py-2 hover:bg-gray-100 dark:hover:bg-gray-600"
                                            >
                                                {t(tapas.scheduleType === 'weekly' ? 'thisNextWeekFinishedInAdvance' : 'todayTomorrowFinishedInAdvance')}
                                            </button>
                                        )}
                                        <button
                                            onClick={() => setShowAcknowledgeNDaysMenu(!showAcknowledgeNDaysMenu)}
                                            className="block w-full text-left px-4 py-2 hover:bg-gray-100 dark:hover:bg-gray-600"
                                        >
                                            {t('acknowledgeLastN', 'N', t(tapas.scheduleType === 'weekly' ? 'weeks' : 'days'))}
                                        </button>
                                        {showAcknowledgeNDaysMenu && (
                                            <div className="px-4 py-2">
                                                <input
                                                    type="number"
                                                    value={acknowledgeNDaysInput}
                                                    onChange={(e) => setAcknowledgeNDaysInput(e.target.value)}
                                                    placeholder={t('count') + " " + t(tapas.scheduleType === 'weekly' ? 'weeks' : 'days')}
                                                    className="w-full px-2 py-1 border rounded-md shadow-sm bg-white border-gray-300 text-gray-900 dark:bg-gray-700 dark:border-gray-600 dark:text-gray-100"
                                                    min="1"
                                                />
                                                <button
                                                    onClick={() => handleAcknowledgeLastNUnits(parseInt(acknowledgeNDaysInput))}
                                                    className="mt-2 w-full bg-indigo-500 text-white px-3 py-1 rounded-md hover:bg-indigo-600"
                                                >
                                                    {t('confirm')}
                                                </button>
                                            </div>
                                        )}
                                        <button
                                            onClick={handleClearLastUnit}
                                            className="block w-full text-left px-4 py-2 hover:bg-gray-100 dark:hover:bg-gray-600"
                                        >
                                            {t('clearX', t('last' + (tapas.scheduleType === 'weekly' ? 'Week': 'Day')))}
                                        </button>
                                    </div>
                                )}
                            </div>
                        </div>
                    )}
                    {tapas.crystallizationTime && <p><strong className="font-semibold">{t('crystallizationTime')}:</strong> {tapas.crystallizationTime} {t('days').toLowerCase()}</p>}
                    <p><strong className="font-semibold">{t('status')}:</strong> <span className={`font-bold ${tapas.status === 'active' ? 'text-blue-600' : tapas.status === 'successful' ? 'text-green-600' : 'text-red-600'}`}>{t(tapas.status)}</span></p>
                    {tapas.failureCause && <p><strong className="font-semibold">{t('causeOfFailure')}:</strong> {tapas.failureCause}</p>}
                    {tapas.results && <p><strong className="font-semibold">{t('results')}:</strong> {tapas.results}</p>}
                    {!tapas.results && (isSuccessful || isFailed) && <p className="italic text-gray-500 dark:text-gray-400">{t('noResultsDefinedYet')}</p>}

                    {tapas.scheduleType !== 'noTapas' && (<p className="text-lg mt-4 text-gray-700 dark:text-gray-200">
                        <strong className="font-semibold">{t('overallProgress')}:</strong> {checkedUnitsCount} / {totalUnits} {t(tapas.scheduleType === 'weekly' ? 'weeksChecked' : 'daysChecked')}
                    </p>)}
                    {tapas.checkedDays && tapas.checkedDays.length > 0 && (
                        <div>
                            <strong className="font-semibold">{t('checkedDates')}:</strong>
                            <ul className="list-disc list-inside ml-4">
                                {getUniqueCheckedDays(tapas.checkedDays).map((timestamp, index) => ( // Display unique checked days
                                    <li key={index}>{timestamp.toDate().toLocaleDateString()}
                                        {isDateRecuperated(timestamp.toDate()) && <span className="text-green-500 ml-2">({t('recuperatedDays').toLowerCase().replace('days', '')})</span>}
                                        {isDateAdvanced(timestamp.toDate()) && <span className="text-purple-500 ml-2">({t('advancedDays').toLowerCase().replace('days', '')})</span>}
                                    </li>
                                ))}
                            </ul>
                        </div>
                    )}
                </div>

                <div className="mt-8 flex flex-wrap justify-center gap-4">
                    {!isSuccessful && !isFailed && tapas.scheduleType !== 'noTapas' && (
                        <button
                            onClick={handleMarkFailed}
                            className="bg-red-600 text-white px-6 py-3 rounded-lg shadow-lg hover:bg-red-700 transition-colors duration-200 text-lg font-medium"
                        >
                            {t('markAsFailed')}
                        </button>
                    )}
                    {!isSuccessful && !isFailed && (
                        <button
                            onClick={() => onEdit(tapas)}
                            className="bg-yellow-500 text-white px-6 py-3 rounded-lg shadow-lg hover:bg-yellow-600 transition-colors duration-200 text-lg font-medium"
                        >
                            {t('editTapas')}
                        </button>
                    )}
                    {(isSuccessful || isFailed) && (
                        <button
                            onClick={handleRepeat}
                            className="bg-purple-600 text-white px-6 py-3 rounded-lg shadow-lg hover:bg-purple-700 transition-colors duration-200 text-lg font-medium"
                        >
                            {t('repeatTapas')}
                        </button>
                    )}

                    {/* Results button for successful tapas */}
                    {isSuccessful && (
                        <button
                            onClick={() => setShowResultsModal(true)}
                            className="bg-orange-500 text-white px-6 py-3 rounded-lg shadow-lg hover:bg-orange-600 transition-colors duration-200 text-lg font-medium"
                        >
                            {tapas.results ? t('updateResults') : t('addResults')}
                        </button>
                    )}

                    {tapas.scheduleType !== 'noTapas' && (
                        <button
                            onClick={handleShareTapas}
                            className="flex items-center justify-center bg-indigo-500 text-white px-6 py-3 rounded-lg shadow-lg hover:bg-indigo-600 transition-colors duration-200 text-lg font-medium"
                        >
                            <svg rpl="" aria-hidden="true" className="icon-share" fill="currentColor" height="16" icon-name="share-new-outline" viewBox="0 0 20 20" width="16" xmlns="http://www.w3.org/2000/svg">
                                <path d="M2.239 18.723A1.235 1.235 0 0 1 1 17.488C1 11.5 4.821 6.91 10 6.505V3.616a1.646 1.646 0 0 1 2.812-1.16l6.9 6.952a.841.841 0 0 1 0 1.186l-6.9 6.852A1.645 1.645 0 0 1 10 16.284v-2.76c-2.573.243-3.961 1.738-5.547 3.445-.437.47-.881.949-1.356 1.407-.23.223-.538.348-.858.347ZM10.75 7.976c-4.509 0-7.954 3.762-8.228 8.855.285-.292.559-.59.832-.883C5.16 14 7.028 11.99 10.75 11.99h.75v4.294a.132.132 0 0 0 .09.134.136.136 0 0 0 .158-.032L18.186 10l-6.438-6.486a.135.135 0 0 0-.158-.032.134.134 0 0 0-.09.134v4.36h-.75Z"></path>
                            </svg>
                            &nbsp;{t('shareTapas')}
                        </button>
                    )}

                    <button
                        onClick={() => setConfirmDelete(true)}
                        className="bg-gray-500 text-white px-6 py-3 rounded-lg shadow-lg hover:bg-gray-600 transition-colors duration-200 text-lg font-medium"
                    >
                        {t('deleteTapas')}
                    </button>
                </div>


                {confirmDelete && (
                    <div className="mt-6 p-4 border rounded-lg bg-red-50 border-red-300 dark:bg-red-900 dark:border-red-700">
                        <p className="text-center mb-3 text-red-800 dark:text-red-100">{t('confirmDeletion')} "<strong className="font-semibold">{tapas.name}</strong>" {t('below')}:</p>
                        <input
                            type="text"
                            value={confirmName}
                            onChange={(e) => setConfirmName(e.target.value)}
                            className="block w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-red-500 bg-white border-gray-300 text-gray-900 dark:bg-gray-700 dark:border-gray-600 dark:text-gray-100 focus:border-red-500 mb-4"
                            placeholder={t('typeTapasNameToConfirm')}
                        />
                        <div className="flex justify-around space-x-4">
                            <button
                                onClick={() => setConfirmDelete(false)}
                                className="flex-1 bg-gray-300 text-gray-800 px-4 py-2 rounded-md hover:bg-gray-400 transition-colors duration-200"
                            >
                                {t('cancel')}
                            </button>
                            <button
                                onClick={handleDelete}
                                className="flex-1 bg-red-600 text-white px-4 py-2 rounded-md hover:bg-red-700 transition-colors duration-200"
                            >
                                {t('confirmDelete')}
                            </button>
                        </div>
                    </div>
                )}

                {showFailDialog && (
                    <div className="fixed inset-0 bg-gray-600 bg-opacity-75 flex items-center justify-center p-4 z-50">
                        <div className="p-6 rounded-lg shadow-xl max-w-md w-full mx-auto bg-white text-gray-800 dark:bg-gray-800 dark:text-gray-100">
                            <h3 className="text-xl font-bold mb-4">{t('markTapasAsFailed')}</h3>
                            <p className="mb-4 text-gray-700 dark:text-gray-300">{t('sureMarkFailed', tapas.name)}</p>
                            <label htmlFor="failureCause" className="block text-sm font-medium mb-2 text-gray-700 dark:text-gray-300">{t('causeOptional')}</label>
                            <textarea
                                id="failureCause"
                                value={failureCause}
                                onChange={(e) => setFailureCause(e.target.value)}
                                rows="2"
                                className="mt-1 block w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 bg-white border-gray-300 text-gray-900 dark:bg-gray-700 dark:border-gray-600 dark:text-gray-100 focus:border-indigo-500 mb-4"
                            ></textarea>

                            <label className="block text-sm font-medium mb-2 text-gray-700 dark:text-gray-300">{t('repeatTapas')}</label>
                            <div className="mb-4 space-y-2">
                                {/* This option is for the FAIL dialog, where 'none' is relevant */}
                                <label className="flex items-center">
                                    <input
                                        type="radio"
                                        name="repeatOption"
                                        value="none"
                                        checked={repeatOption === 'none'}
                                        onChange={(e) => setRepeatOption(e.target.value)}
                                        className="form-radio text-indigo-600"
                                    />
                                    <span className="ml-2 text-gray-700 dark:text-gray-300">{t('noDoNotRepeat')}</span>
                                </label>
                                <label className="flex items-center">
                                    <input
                                        type="radio"
                                        name="repeatOption"
                                        value="sameDuration"
                                        checked={repeatOption === 'sameDuration'}
                                        onChange={(e) => setRepeatOption(e.target.value)}
                                        className="form-radio text-indigo-600"
                                    />
                                    <span className="ml-2 text-gray-700 dark:text-gray-300">
                                        {t('repeatSameDuration', tapas.scheduleType === 'weekly' ? Math.ceil(tapas.duration / 7) : tapas.duration, t(tapas.scheduleType === 'weekly' ? 'weeks' : 'days').toLowerCase())}
                                    </span>
                                </label>
                                <label className="flex items-center">
                                    <input
                                        type="radio"
                                        name="repeatOption"
                                        value="newDuration"
                                        checked={repeatOption === 'newDuration'}
                                        onChange={(e) => setNewRepeatDuration(e.target.value)}
                                        className="form-radio text-indigo-600"
                                    />
                                    <span className="ml-2 text-gray-700 dark:text-gray-300">{t('repeatNewDuration')}</span>
                                    {repeatOption === 'newDuration' && (
                                        <input
                                            type="number"
                                            value={newRepeatDuration}
                                            onChange={(e) => setNewRepeatDuration(e.target.value)}
                                            className="ml-2 w-24 px-2 py-1 border rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 bg-white border-gray-300 text-gray-900 dark:bg-gray-700 dark:border-gray-600 dark:text-gray-100 focus:border-indigo-500"
                                            min="1"
                                        />
                                    )}
                                    <span className="ml-1 text-gray-700 dark:text-gray-300">
                                        {t(tapas.scheduleType === 'weekly' ? 'weeks' : 'days')}
                                    </span>
                                </label>
                                {endDateObj > today && (
                                    <label className="flex items-center">
                                        <input
                                            type="radio"
                                            name="repeatOption"
                                            value="untilEndDate"
                                            checked={repeatOption === 'untilEndDate'}
                                            onChange={(e) => setRepeatOption(e.target.value)}
                                            className="form-radio text-indigo-600"
                                        />
                                        <span className="ml-2 text-gray-700 dark:text-gray-300">{t('repeatUntilOriginalEndDate', endDateObj.toLocaleDateString())}</span>
                                    </label>
                                )}
                            </div>

                            <div className="flex justify-around space-x-4">
                                <button
                                    onClick={() => setShowFailDialog(false)}
                                    className="flex-1 bg-gray-300 text-gray-800 px-4 py-2 rounded-md hover:bg-gray-400 transition-colors duration-200"
                                >
                                    {t('cancel')}
                                </button>
                                <button
                                    onClick={confirmFail}
                                    className="flex-1 bg-red-500 text-white px-4 py-2 rounded-md hover:bg-red-600 transition-colors duration-200"
                                >
                                    {t('confirmFail')}
                                </button>
                            </div>
                        </div>
                    </div>
                )}

                {showRepeatDialog && (
                    <div className="fixed inset-0 bg-gray-600 bg-opacity-75 flex items-center justify-center p-4 z-50">
                        <div className="p-6 rounded-lg shadow-xl max-w-md w-full mx-auto bg-white text-gray-800 dark:bg-gray-800 dark:text-gray-100">
                            <h3 className="text-xl font-bold mb-4">{t('repeatTapas')}</h3>
                            <p className="mb-4 text-gray-700 dark:text-gray-300">{t('sureRepeat', tapas.name)}</p>

                            <label className="block text-sm font-medium mb-2 text-gray-700 dark:text-gray-300">{t('repeatOptionLabel')}</label>
                            <div className="mb-4 space-y-2">
                                {/* Hidden "noDoNotRepeat" option as per request */}
                                <label className="flex items-center">
                                    <input
                                        type="radio"
                                        name="repeatOption"
                                        value="sameDuration"
                                        checked={repeatOption === 'sameDuration'}
                                        onChange={(e) => setRepeatOption(e.target.value)}
                                        className="form-radio text-indigo-600"
                                    />
                                    <span className="ml-2 text-gray-700 dark:text-gray-300">
                                        {t('repeatSameDuration', tapas.scheduleType === 'weekly' ? Math.ceil(tapas.duration / 7) : tapas.duration, t(tapas.scheduleType === 'weekly' ? 'weeks' : 'days').toLowerCase())}
                                    </span>
                                </label>
                                <label className="flex items-center">
                                    <input
                                        type="radio"
                                        name="repeatOption"
                                        value="newDuration"
                                        checked={repeatOption === 'newDuration'}
                                        onChange={(e) => setRepeatOption(e.target.value)}
                                        className="form-radio text-indigo-600"
                                    />
                                    <span className="ml-2 text-gray-700 dark:text-gray-300">{t('repeatNewDuration')}</span>
                                    {repeatOption === 'newDuration' && (
                                        <input
                                            type="number"
                                            value={newRepeatDuration}
                                            onChange={(e) => setNewRepeatDuration(e.target.value)}
                                            className="ml-2 w-24 px-2 py-1 border rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 bg-white border-gray-300 text-gray-900 dark:bg-gray-700 dark:border-gray-600 dark:text-gray-100 focus:border-indigo-500"
                                            min="1"
                                        />
                                    )}
                                    <span className="ml-1 text-gray-700 dark:text-gray-300">
                                        {t(tapas.scheduleType === 'weekly' ? 'weeks' : 'days')}
                                    </span>
                                </label>
                                {endDateObj > today && ( // Conditionally render if original end date is in the future
                                    <label className="flex items-center">
                                        <input
                                            type="radio"
                                            name="repeatOption"
                                            value="untilEndDate"
                                            checked={repeatOption === 'untilEndDate'}
                                            onChange={(e) => setRepeatOption(e.target.value)}
                                            className="form-radio text-indigo-600"
                                        />
                                        <span className="ml-2 text-gray-700 dark:text-gray-300">{t('repeatUntilOriginalEndDate', endDateObj.toLocaleDateString())}</span>
                                    </label>
                                )}
                            </div>

                            <div className="flex justify-around space-x-4">
                                <button
                                    onClick={() => setShowRepeatDialog(false)}
                                    className="flex-1 bg-gray-300 text-gray-800 px-4 py-2 rounded-md hover:bg-gray-400 transition-colors duration-200"
                                >
                                    {t('cancel')}
                                </button>
                                <button
                                    onClick={confirmRepeat}
                                    className="flex-1 bg-purple-600 text-white px-4 py-2 rounded-md hover:bg-purple-700 transition-colors duration-200"
                                >
                                    {t('confirmRepeat')}
                                </button>
                            </div>
                        </div>
                    </div>
                )}

                {showResultsModal && (
                    <ResultsModal
                        tapas={tapas}
                        onClose={() => setShowResultsModal(false)}
                        onSaveResults={handleSaveResults}
                    />
                )}
            </div>
        </div>
    );
};


// Component for statistics
const Statistics = ({ allTapas }) => {
    const { t } = useContext(AppContext);
    const [statisticsTimeFilter, setStatisticsTimeFilter] = useState('all');

    const filterTapasByTime = useCallback((tapasList) => {
        if (statisticsTimeFilter === 'all') {
            return tapasList;
        }

        const today = new Date();
        let filterDate = new Date();

        switch (statisticsTimeFilter) {
            case '1month':
                filterDate.setMonth(today.getMonth() - 1);
                break;
            case '3months':
                filterDate.setMonth(today.getMonth() - 3);
                break;
            case '1year':
                filterDate.setFullYear(today.getFullYear() - 1);
                break;
            case '2years':
                filterDate.setFullYear(today.getFullYear() - 2);
                break;
            default:
                break;
        }
        filterDate.setHours(0, 0, 0, 0); // Normalize filter date

        return tapasList.filter(tapas => {
            const completionDate = tapas.status !== 'active' && tapas.completionDate ? tapas.completionDate.toDate() : tapas.createdAt.toDate();
            return completionDate >= filterDate;
        });
    }, [statisticsTimeFilter]);

    const filteredTapas = filterTapasByTime(allTapas);

    const successfulTapas = filteredTapas.filter(tapas => tapas.status === 'successful');
    const failedTapas = filteredTapas.filter(tapas => tapas.status === 'failed');
    const activeTapas = filteredTapas.filter(tapas => tapas.status === 'active' && tapas.scheduleType !== 'noTapas');

    const calculateAverageDuration = (tapasList) => {
        if (tapasList.length === 0) return 0;
        const totalDuration = tapasList.reduce((sum, tapas) => sum + tapas.duration, 0);
        return (totalDuration / tapasList.length).toFixed(1);
    };

    const avgSuccessfulDuration = calculateAverageDuration(successfulTapas);
    const avgFailedDuration = calculateAverageDuration(failedTapas);
    const avgActiveDuration = calculateAverageDuration(activeTapas);

    const calculateAverageCompletion = (tapasList) => {
        if (tapasList.length === 0) return 0;
        const totalCompletion = tapasList.reduce((sum, tapas) => {
            const checkedDaysCount = tapas.checkedDays ? getUniqueCheckedDays(tapas.checkedDays).length : 0; // Use unique count
            return sum + (checkedDaysCount / tapas.duration);
        }, 0);
        return (totalCompletion / tapasList.length * 100).toFixed(1);
    };

    const avgFailedCompletionPercentage = calculateAverageCompletion(failedTapas);


    return (
        <div className="p-4 rounded-lg shadow-md mb-6 bg-white dark:bg-gray-800">
            <h2 className="text-2xl font-bold mb-4 text-gray-800 dark:text-gray-100">{t('tapasStatistics')}</h2>

            <div className="mb-4 flex flex-col sm:flex-row justify-end items-center gap-4">
                <div className="flex items-center space-x-2">
                    <span className="font-medium text-gray-700 dark:text-gray-300">{t('timeframe')}:</span>
                    <select
                        value={statisticsTimeFilter}
                        onChange={(e) => setStatisticsTimeFilter(e.target.value)}
                        className="px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 bg-white border-gray-300 text-gray-900 dark:bg-gray-700 dark:border-gray-600 dark:text-gray-100"
                    >
                        <option value="all">{t('all')}</option>
                        <option value="1month">{t('1month')}</option>
                        <option value="3months">{t('3months')}</option>
                        <option value="1year">{t('1year')}</option>
                        <option value="2years">{t('2years')}</option>
                    </select>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Active Tapas Statistics */}
                <div className="p-4 rounded-lg shadow bg-green-50 text-green-800 dark:bg-green-900 dark:text-green-100">
                    <h3 className="text-xl font-semibold mb-2">{t('activeTapasCount')}</h3>
                    <p>{t('count')}: <span className="font-bold">{activeTapas.length}</span></p>
                    <p>{t('avgDuration')}: <span className="font-bold">{avgActiveDuration} {t('days').toLowerCase()}</span></p>
                </div>

                <div className="p-4 rounded-lg shadow bg-blue-50 text-blue-800 dark:bg-blue-900 dark:text-blue-100">
                    <h3 className="text-xl font-semibold mb-2">{t('successfulTapasCount')}</h3>
                    <p>{t('count')}: <span className="font-bold">{successfulTapas.length}</span></p>
                    <p>{t('avgDuration')}: <span className="font-bold">{avgSuccessfulDuration} {t('days').toLowerCase()}</span></p>
                </div>

                <div className="p-4 rounded-lg shadow bg-red-50 text-red-800 dark:bg-red-900 dark:text-red-100">
                    <h3 className="text-xl font-semibold mb-2">{t('failedTapasCount')}</h3>
                    <p>{t('count')}: <span className="font-bold">{failedTapas.length}</span></p>
                    <p>{t('avgDuration')}: <span className="font-bold">{avgFailedDuration} {t('days').toLowerCase()}</span></p>
                    <p>{t('avgDone')}: <span className="font-bold">{avgFailedCompletionPercentage}%</span></p>
                </div>
            </div>
        </div>
    );
};

const AboutModal = ({ onClose }) => {
    const { t } = useContext(AppContext);
    return (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-75 flex items-center justify-center p-4 z-50 overflow-y-auto max-h-screen">
            <div className="p-6 rounded-lg shadow-xl max-w-sm w-full mx-auto my-auto bg-white text-gray-800 dark:bg-gray-800 dark:text-gray-100">
                <h3 className="text-2xl font-bold mb-4">{t('about')}</h3>
                <p className="text-lg mb-2"><strong>{t('appName')}</strong></p>
                <p className="text-md mb-4 text-gray-600 dark:text-gray-300">{t('appVersion')}: {appVersion}</p>
                <a
                    href="https://tapas-tracker.app"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-block bg-indigo-600 text-white px-5 py-2 rounded-lg shadow-md hover:bg-indigo-700 transition-colors duration-200 text-md font-medium mb-6"
                >
                    {t('tapasWebsite')}
                </a>
                <div className="text-sm font-medium mb-6 text-gray-700 dark:text-gray-300" style={{ whiteSpace: 'pre-wrap' }}>{t('aboutDescription').split("  ").join("\n\n")+"\n"}<a className="text-blue-600 dark:text-blue-400" href={repUrl} target="_blank">{repUrl}</a></div>
                <button
                    onClick={onClose}
                    className="w-full bg-gray-300 text-gray-800 px-4 py-2 rounded-md hover:bg-gray-400 transition-colors duration-200"
                >
                    {t('close')}
                </button>
            </div>
        </div>
    );
};

const HelpModal = ({ onClose }) => {
    const { t } = useContext(AppContext);
    return (
        <div className="max-h-screen overflow-y-auto fixed inset-0 bg-gray-600 bg-opacity-75 flex items-center justify-center p-4 z-50">
            <div className="p-6 rounded-lg shadow-xl max-w-xl w-full mx-auto bg-white text-gray-800 dark:bg-gray-800 dark:text-gray-100">
                <h3 className="text-2xl font-bold mb-4">{t('help')}</h3>

                {t('helpContents').map((helpItem) => {
                    return (
                        <div className="text-sm mb-4">
                          <p className="text-blue-300"><strong>{helpItem.q}</strong></p>
                          <p>{helpItem.a}</p>
                        </div>
                    );
                })}
                            
                <button
                    onClick={onClose}
                    className="w-full bg-gray-300 text-gray-800 px-4 py-2 rounded-md hover:bg-gray-400 transition-colors duration-200"
                >
                    {t('close')}
                </button>
            </div>
        </div>
    );
};

const CleanDataModal = ({ onClose, onCleanConfirmed }) => {
    const { t } = useContext(AppContext);
    const [selectedTimeframe, setSelectedTimeframe] = useState('5years'); // Default to 5 years

    const handleConfirm = () => {
        onCleanConfirmed(selectedTimeframe);
    };

    return (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-75 flex items-center justify-center p-4 z-50">
            <div className="p-6 rounded-lg shadow-xl max-w-sm w-full mx-auto bg-white text-gray-800 dark:bg-gray-800 dark:text-gray-100">
                <h3 className="text-xl font-bold mb-4">{t('cleaningOldTapas')}</h3>
                <p className="mb-4 text-center text-gray-700 dark:text-gray-300">{t('cleanDataConfirmation')}</p>

                <label htmlFor="timeframeSelect" className="block text-sm font-medium mb-2 text-gray-700 dark:text-gray-300">
                    {t('selectTimeframe')}:
                </label>
                <select
                    id="timeframeSelect"
                    value={selectedTimeframe}
                    onChange={(e) => setSelectedTimeframe(e.target.value)}
                    className="w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 bg-white border-gray-300 text-gray-900 dark:bg-gray-700 dark:border-gray-600 dark:text-gray-100 focus:border-indigo-500 mb-6"
                >
                    <option value="all">{t('all')}</option>
                    <option value="1year">{t('1year')}</option>
                    <option value="2years">{t('2years')}</option>
                    <option value="5years">{t('5years')}</option>
                </select>

                <div className="flex justify-around space-x-4">
                    <button
                        onClick={onClose}
                        className="flex-1 bg-gray-300 text-gray-800 px-4 py-2 rounded-md hover:bg-gray-400 transition-colors duration-200"
                    >
                        {t('cancel')}
                    </button>
                    <button
                        onClick={handleConfirm}
                        className="flex-1 bg-red-600 text-white px-4 py-2 rounded-md hover:bg-red-700 transition-colors duration-200"
                    >
                        {t('clean')}
                    </button>
                </div>
            </div>
        </div>
    );
};

// New ShareView Component
const ShareView = ({ shareReference, onClose, onAdoptTapas, setStatusMessage }) => {
    const { db, userId, t } = useContext(AppContext);
    const [sharedTapas, setSharedTapas] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    const appId = typeof __app_id !== 'undefined' ? __app_id : 'default-app-id';
    // Corrected path for public shared tapas collection
    const publicSharedTapasCollectionRef = collection(db, `artifacts/${appId}/public/data/sharedTapas`);


    useEffect(() => {
        if (!db || !shareReference) {
            setError("Database or share reference missing.");
            setLoading(false);
            return;
        }

        const publicTapasDocRef = doc(publicSharedTapasCollectionRef, shareReference);

        const fetchSharedTapas = async () => {
            try {
                const docSnap = await getDoc(publicTapasDocRef);
                if (docSnap.exists()) {
                    setSharedTapas({ id: docSnap.id, ...docSnap.data() });
                    setError('');
                } else {
                    setError("Shared Tapas not found.");
                }
            } catch (e) {
                console.error("Error fetching shared Tapas:", e);
                setError("Error loading shared Tapas.");
            } finally {
                setLoading(false);
            }
        };

        fetchSharedTapas();

        // Increment sharedCount when the shared link is opened/viewed
        const incrementSharedCount = async () => {
            try {
                // Fetch the current document to get the latest sharedCount
                const docSnap = await getDoc(publicTapasDocRef);
                if (docSnap.exists()) {
                    const currentSharedCount = docSnap.data().sharedCount || 0;
                    await updateDoc(publicTapasDocRef, {
                        sharedCount: currentSharedCount + 1
                    });
                }
            } catch (e) {
                console.error("Error incrementing shared count:", e);
            }
        };
        // This causes issues when called from the useEffect. Let's increment only once.
        // It's already incremented when generating the link.
        // If we want to increment on *every* view, this needs to be re-thought (e.g., cloud function)
        // For now, it's simpler to increment only on generation.

    }, [db, shareReference, appId, publicSharedTapasCollectionRef]); // Added publicSharedTapasCollectionRef to dependencies

    const handleAdoptTapas = async () => {
        if (!db || !userId || !sharedTapas) {
            setStatusMessage(t('errorAdoptingTapas') + " Missing data.");
            return;
        }

        try {
            // Check if user already owns a tapas with this shareReference
            const existingTapasQuery = query(
                collection(db, `artifacts/${appId}/users/${userId}/tapas`),
                where('shareReference', '==', sharedTapas.id)
            );
            const existingTapasSnap = await getDocs(existingTapasQuery);

            if (!existingTapasSnap.empty) {
                setStatusMessage(t('alreadyOwnTapas'));
                onClose(); // Close share view
                return;
            }

            const newTapasData = {
                name: sharedTapas.name,
                startDate: sharedTapas.startDate || new Date(), // New Tapas starts today for the adopting user
                startTime: sharedTapas.startTime || null,
                duration: sharedTapas.duration,
                description: sharedTapas.description || null,
                goals: sharedTapas.goals || [],
                parts: sharedTapas.parts || [],
                crystallizationTime: sharedTapas.crystallizationTime || null,
                allowRecuperation: sharedTapas.allowRecuperation || false,
                acknowledgeAfter: sharedTapas.acknowledgeAfter || false,
                status: 'active', // Adopted tapas starts as active
                checkedDays: [],
                failureCause: null,
                recuperatedDays: [],
                advancedDays: [],
                createdAt: new Date(), // New creation timestamp
                userId: userId,
                checkedPartsByDate: {},
                results: null,
                shareReference: sharedTapas.id, // Inherit the share reference
                scheduleType: sharedTapas.scheduleType || 'daily',
                scheduleInterval: sharedTapas.scheduleInterval || '',
            };

            await addDoc(collection(db, `artifacts/${appId}/users/${userId}/tapas`), newTapasData);

            // Increment adoptedCount in the public shared document
            await updateDoc(doc(publicSharedTapasCollectionRef, sharedTapas.id), { // Corrected path here
                adoptedCount: (sharedTapas.adoptedCount || 0) + 1
            });

            setStatusMessage(t('tapasAdoptedSuccessfully'));
            onAdoptTapas(); // Trigger a refetch of user's tapas and close this view
        } catch (e) {
            console.error("Error adopting Tapas:", e);
            setStatusMessage(`${t('errorAdoptingTapas')} ${e.message}`);
        }
    };


    if (loading) {
        return (
            <div className="fixed inset-0 bg-gray-600 bg-opacity-75 flex items-center justify-center p-4 z-50">
                <div className="p-6 rounded-lg shadow-xl max-w-sm w-full mx-auto bg-white text-gray-800 dark:bg-gray-800 dark:text-gray-100">
                    <p className="text-center">{t('loadingTapas')}</p>
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="fixed inset-0 bg-gray-600 bg-opacity-75 flex items-center justify-center p-4 z-50">
                <div className="p-6 rounded-lg shadow-xl max-w-sm w-full mx-auto bg-white text-gray-800 dark:bg-gray-800 dark:text-gray-100">
                    <p className="text-center text-red-600">{error}</p>
                    <button onClick={onClose} className="mt-4 w-full bg-gray-300 text-gray-800 px-4 py-2 rounded-md hover:bg-gray-400">
                        {t('close')}
                    </button>
                </div>
            </div>
        );
    }

    if (!sharedTapas) {
        return null; // Should not happen if error handled above
    }

    const pageTitle = `${sharedTapas.name} - ${t('appName')}`;
    const pageDescription = sharedTapas.description || `${t('appName')}: ${t('trackPersonalGoals')}`;
    const pageUrl = `${window.location.origin}?ref=${sharedTapas.id}`;
    const scheduleType = sharedTapas.scheduleType || 'daily';

    let endDate = '';
    if (sharedTapas.startDate) {
        endDate = getTapasDatesInfo(sharedTapas).endDate;
    }

    return (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-75 flex items-center justify-center p-4 z-40 overflow-y-auto">
            <Head>
                <title>{pageTitle}</title>
                <meta property="og:title" content={pageTitle} />
                <meta property="og:description" content={pageDescription} />
                <meta property="og:url" content={pageUrl} />
                <meta property="og:type" content="website" />
                {/* Add more Open Graph tags if you have images, etc. */}
            </Head>
            <div className="p-6 rounded-lg shadow-xl max-w-lg w-full mx-auto my-auto bg-white text-gray-800 dark:bg-gray-800 dark:text-gray-100">
                <div className="flex justify-between items-center mb-6">
                    <h2 className="text-3xl font-bold text-gray-900 dark:text-gray-100">{sharedTapas.name}</h2>
                    <button onClick={onClose} className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 text-3xl font-bold">
                        &times;
                    </button>
                </div>

                <div className="space-y-4 text-gray-700 dark:text-gray-300">
                    {sharedTapas.startDate && (<p><strong className="font-semibold">{t('timeframe')}:</strong> {sharedTapas.startDate?.toDate().toLocaleDateString()} - {endDate?.toLocaleDateString()}</p>)}
                    {sharedTapas.startTime && <p><strong className="font-semibold">{t('startTime')}:</strong> {sharedTapas.startTime}</p>}
                    <p><strong className="font-semibold">{t('duration')}:</strong> {Math.ceil(sharedTapas.duration / getTotalUnits(sharedTapas.scheduleType))} {t(sharedTapas.scheduleType === 'weekly' ? 'weeks' : 'days').toLowerCase()}</p>
                    {sharedTapas.scheduleType === 'everyNthDays' && (
                    <p><strong className="font-semibold">{t('schedule')}:</strong> {t('Ntimes', Math.ceil(sharedTapas.duration / sharedTapas.scheduleInterval))} {t('everyNthDays', sharedTapas.scheduleInterval).toLowerCase()}</p>
                    )}
                    {sharedTapas.acknowledgeAfter && <p><strong className="font-semibold">{t('acknowledgeAfter')}:</strong> {t('yes')}</p>}
                    {sharedTapas.description && (<div><strong className="font-semibold">{t('description')}:</strong>
                            <LexicalHtmlRenderer editorStateHtml={sharedTapas.description} />
                        </div>
                    )}
                    {sharedTapas.goals && sharedTapas.goals.length > 0 ? (
                        <div>
                            <strong className="font-semibold">{t('goals')}:</strong>
                            <ul className="list-disc list-inside ml-4">
                                {sharedTapas.goals.map((goal, index) => (
                                    <li key={`goal-${index}`}>{goal}</li>
                                ))}
                            </ul>
                        </div>
                    ) : (
                        <p className="italic text-gray-500 dark:text-gray-400">{t('noGoalsDefinedYet')}</p>
                    )}
                    {sharedTapas.parts && sharedTapas.parts.length > 0 ? (
                        <div>
                            <strong className="font-semibold">{t('parts')}:</strong>
                            <ul className="list-disc list-inside ml-4">
                                {sharedTapas.parts.map((part, index) => (
                                    <li key={index}>{part}</li>
                                ))}
                            </ul>
                        </div>
                    ) : (
                        <p className="italic text-gray-500 dark:text-gray-400">{t('noPartsDefinedYet')}</p>
                    )}
                    {sharedTapas.crystallizationTime && <p><strong className="font-semibold">{t('crystallizationTime')}:</strong> {sharedTapas.crystallizationTime} {t('days').toLowerCase()}</p>}
                    {sharedTapas.allowRecuperation && <p><strong className="font-semibold">{t('allowRecuperation')}:</strong> {t('yes')}</p>}
                    <p className="mt-4"><strong className="font-semibold">{t('sharedCount')}:</strong> {sharedTapas.sharedCount || 0}</p>
                    <p><strong className="font-semibold">{t('adoptedCount')}:</strong> {sharedTapas.adoptedCount || 0}</p>
                </div>

                <div className="mt-8 flex justify-center">
                    <button
                        onClick={handleAdoptTapas}
                        className="bg-green-600 text-white px-6 py-3 rounded-lg shadow-lg hover:bg-green-700 transition-colors duration-200 text-lg font-medium"
                    >
                        {t('adoptTapas')}
                    </button>
                </div>
            </div>
        </div>
    );
};

const License = ({ onClose }) => {
    const { t } = useContext(AppContext);
    const [data, setData] = useState(null)
    const [isLoading, setLoading] = useState(true)

    useEffect(() => {
        fetch('https://raw.githubusercontent.com/ReimundR/tapas-tracker/refs/heads/main/LICENSE')
        .then(response => {
            return response.text()
        })
        .then((data) => {
            //setData(data.replace('\n\n', '[@2]').replace('\n ', '[@1]').replace('\n', ' ').replace('[@2]', '\n\n').replace('[@1]', '\n '))
            //setData(data.replace(/\n[^\s]/g, ' '))
            setData(data)
            setLoading(false)
        })
    }, [])
 
    //if (isLoading) return <p>Loading...</p>
    //if (!data) return <p>No profile data</p>

    return (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-75 flex items-center justify-center p-4 z-40 overflow-y-auto">
            <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-xl w-full max-w-2xl mx-auto my-auto">
                <button onClick={onClose} className="float-right text-gray-500 hover:text-gray-700 text-3xl font-bold">
                    &times;
                </button>
                <div className="flex justify-between items-center mb-6">
                    <div className="text-gray-700 dark:text-gray-100 text-sm font-medium mb-6" style={{ whiteSpace: 'pre-wrap' }}>
                        <Suspense fallback={<div>Loading...</div>}>
                        {data}
                        </Suspense>
                    </div>
                </div>
                <button onClick={onClose} className="w-full text-white shadow-lg border-2 border-blue-800 bg-blue-600 px-4 py-2 rounded-md font-medium transition-colors duration-200 hover:bg-blue-500 text-xl font-bold">
                    {t('close')}
                </button>
            </div>
        </div>
    );
};

const LegalNotice = ({ onClose }) => {
    const { t } = useContext(AppContext);
    return (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-75 flex items-center justify-center p-4 z-40 overflow-y-auto">
            <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-xl w-full max-w-2xl mx-auto my-auto">
                <button onClick={onClose} className="float-right text-gray-500 hover:text-gray-700 text-3xl font-bold">
                    &times;
                </button>
                <h2 className="text-3xl font-bold text-gray-800 dark:text-gray-100 mb-6">{t('legalNotice')}</h2>
                <div className="flex justify-between items-center mb-6">
                    <div className="text-gray-700 dark:text-gray-300 text-sm font-medium mb-6" style={{ whiteSpace: 'pre-wrap' }}>
                        <p>Reimund Renner</p>
                        <p>Zum Baumgarten 7</p>
                        <p>79249 Merzhausen</p>
                        <p className="py-2">Kontakt E-Mail: reimund.renner@gmail.com</p>
                        <p className="py-2">Inhaltlicher Verantwortlicher: wie oben</p>
                        <p className="py-2">Allgemeine Informationspflichten zur alternativen Streitbeilegung nach Art. 14 Abs. 1 ODR-VO und § 36 VSBG (Verbraucherstreitbeilegungsgesetz)</p>
                        <p className="py-2">Die europäische Kommission stellt eine Plattform zur Online-Streitbelegung (OS) zur Verfügung, die Sie unter dieser Adresse finden: http://ec.europa.eu/consumers/odr/. Zur Teilnahme an einem Streitbeilegungsverfahren vor einer Verbraucherschlichtungsstelle sind wir nicht verpflichtet und auch nicht bereit.</p>
                    </div>
                </div>
                <button onClick={onClose} className="text-white shadow-lg border-2 border-blue-800 bg-blue-600 px-4 py-2 rounded-md font-medium transition-colors duration-200 hover:bg-blue-500 text-xl font-bold">
                    {t('close')}
                </button>
            </div>
        </div>
    );
};

const GDPR = ({ onClose }) => {
    const { locale, setLocale, t } = useContext(LocaleContext);
    return (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-75 flex items-center justify-center p-4 z-40 overflow-y-auto">
            <div className="bg-white dark:bg-gray-800 dark:text-gray-100 p-6 rounded-lg shadow-xl w-full max-w-3xl mx-auto my-auto">
                <button onClick={onClose} className="float-right text-gray-500 hover:text-gray-700 text-5xl font-bold">
                    &times;
                </button>
                <div className="prose lg:prose-lg mx-auto p-4 sm:p-6 md:p-8 dark:text-gray-100">
                    {(locale=='de') && (
                        <GdprDE />
                    )}
                    {(locale!='de') && (
                        <GdprEN />
                    )}
                </div>                        
                <button onClick={onClose} className="w-full text-white shadow-lg border-2 border-blue-800 bg-blue-600 px-4 py-2 rounded-md font-medium transition-colors duration-200 hover:bg-blue-500 text-xl font-bold">
                    {t('close')}
                </button>
            </div>
        </div>
    );
};


// Main App Component (now the default export for pages/index.js)
const HomePage = () => {
    const [currentPage, setCurrentPage] = useState('active');
    const [tapas, setTapas] = useState([]);
    const [selectedTapas, setSelectedTapas] = useState(null);
    const [editingTapas, setEditingTapas] = useState(null);
    const [showMenu, setShowMenu] = useState(false); // State for menu visibility
    const [showDataMenu, setShowDataMenu] = useState(false); // State for Data submenu visibility
    const [selectedLicense, setSelectedLicense] = useState(false);
    const [selectedLegalNotice, setSelectedLegalNotice] = useState(false);
    const [selectedGDPR, setSelectedGDPR] = useState(false);
    const fileInputRef = useRef(null); // Ref for the hidden file input
    const [sharedRef, setSharedRef] = useState(null); // New state for shared tapas reference

    // Firebase state
    const [db, setDb] = useState(null);
    const [auth, setAuth] = useState(null);
    const [userId, setUserId] = useState(null);
    const [userDisplayName, setUserDisplayName] = useState(null);
    const [loadingFirebase, setLoadingFirebase] = useState(true);
    const [firebaseError, setFirebaseError] = useState('');
    const [showLoginPrompt, setShowLoginPrompt] = useState(false); // Changed to false by default
    const [statusMessage, setStatusMessage] = useState(''); // For import/export feedback
    const [isGuestUser, setIsGuestUser] = useState(false); // New state to track if user is anonymous
    const [pageBeforeDetail, setPageBeforeDetail] = useState('active'); // New state to remember previous page

    // History filters
    const [historyStatusFilter, setHistoryStatusFilter] = useState('all');
    const [historyTimeFilter, setHistoryTimeFilter] = useState('all');

    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [showEmailLoginForm, setShowEmailLoginForm] = useState(false); // Toggle email/password form
    const [showAboutModal, setShowAboutModal] = useState(false); // State for About modal
    const [showHelpModal, setShowHelpModal] = useState(false); // State for Help modal
    const [showCleanDataModal, setShowCleanDataModal] = useState(false); // State for Clean Data modal


    const { locale, setLocale, t } = useContext(LocaleContext);
    const { toggleTheme } = useContext(ThemeContext);


    // Initialize Firebase and handle authentication
    useEffect(() => {
        const appId = typeof __app_id !== 'undefined' ? __app_id : 'default-app-id';

        if (firebaseConfig && firebaseConfig.apiKey) {
            try {
                const app = initializeApp(firebaseConfig);
                const firestore = getFirestore(app);
                const authentication = getAuth(app);
                setDb(firestore);
                setAuth(authentication);

                const unsubscribe = onAuthStateChanged(authentication, async (user) => {
                    if (user) {
                        setUserId(user.uid);
                        setUserDisplayName(user.displayName || user.email || t('guestUser'));
                        setIsGuestUser(user.isAnonymous); // Set isGuestUser based on Firebase user object
                        // Only hide the login prompt if it's not a guest user initially
                        if (!user.isAnonymous) {
                            setShowLoginPrompt(false);
                        }
                        setCurrentPage('active');
                    } else {
                        setUserId(null);
                        setUserDisplayName(null);
                        setIsGuestUser(false); // No user, so not a guest user
                        setShowLoginPrompt(true); // Show login prompt if no user is authenticated
                    }
                    setLoadingFirebase(false);
                });

                return () => unsubscribe();
            } catch (error) {
                console.error("Error initializing Firebase: ", error);
                setFirebaseError(`${t('firebaseInitFailed')} ${error.message}`);
                setLoadingFirebase(false);
            }
        } else {
            console.warn("Firebase configuration is missing or incomplete. Firebase will not be initialized.");
        }
    }, [t]);

    // Fetch Tapas data
    useEffect(() => {
        if (!db || !userId) return;

        const appId = typeof __app_id !== 'undefined' ? __app_id : 'default-app-id';
        const tapasCollectionRef = collection(db, `artifacts/${appId}/users/${userId}/tapas`);
        const q = query(tapasCollectionRef);

        const unsubscribe = onSnapshot(q, (snapshot) => {
            const tapasData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            // Ensure checkedDays are unique when loading from Firestore
            const cleanedTapasData = tapasData.map(tapasItem => ({
                ...tapasItem,
                checkedDays: getUniqueCheckedDays(tapasItem.checkedDays || []),
                recuperatedDays: getUniqueCheckedDays(tapasItem.recuperatedDays || []),
                advancedDays: getUniqueCheckedDays(tapasItem.advancedDays || []),
            }));
            setTapas(cleanedTapasData);
        }, (error) => {
            console.error("Error fetching tapas: ", error);
            setFirebaseError(`${t('errorLoadingTapasData')} ${error.message}`);
        });

        return () => unsubscribe();
    }, [db, userId, t]);

    // Effect to handle clicks outside the menu
    useEffect(() => {
        const handleClickOutside = (event) => {
            // Close menu if it's open and the click is outside the menu itself
            if (showMenu && !event.target.parentElement.classList.contains('absolute')) {
                setShowMenu(false);
                setShowDataMenu(false); // Close submenu too
            }
            setStatusMessage('');
        };

        // Attach the event listener to the document body
        document.addEventListener('click', handleClickOutside);
        // Clean up the event listener on component unmount
        return () => {
            document.removeEventListener('click', handleClickOutside);
        };
    }, [showMenu]); // Re-run effect when showMenu state changes

    // Handle URL parameters for shared Tapas
    useEffect(() => {
        const params = new URLSearchParams(window.location.search);
        const ref = params.get('ref');
        if (ref) {
            setSharedRef(ref);
            // Optionally, remove the ref from the URL to keep it clean
            const newUrl = new URL(window.location.href);
            newUrl.searchParams.delete('ref');
            window.history.replaceState({}, document.title, newUrl.toString());
        }
    }, []);

    const handleSelectTapas = (tapasItem) => {
        setPageBeforeDetail(currentPage); // Store current page before opening detail
        setSelectedTapas(tapasItem);
        setCurrentPage('detail');
    };

    const handleCloseTapasDetail = () => {
        setSelectedTapas(null);
        setCurrentPage(pageBeforeDetail); // Go back to the page that was active before
    };

    const handleCloseLicense = () => {
        setSelectedLicense(null);
    };

    const handleCloseLegalNotice = () => {
        setSelectedLegalNotice(null);
    };
    
    const handleCloseGDPR = () => {
        setSelectedGDPR(null);
    };

    const handleEditTapas = (tapasItem) => {
        setEditingTapas(tapasItem);
        setCurrentPage('add');
    };

    const handleCancelEdit = () => {
        setEditingTapas(null);
        setCurrentPage('active'); // When canceling from 'add new', go back to active
    };

    const handleGoogleSignIn = async () => {
        if (!auth) return;
        try {
            const provider = new GoogleAuthProvider();
            await signInWithPopup(auth, provider);
            setFirebaseError('');
            setShowLoginPrompt(false); // Close login prompt after successful sign-in
            setShowMenu(false); // Close menu after login
        } catch (error) {
            console.error("Error signing in with Google:", error);
            setFirebaseError(`${t('googleSignInFailed')} ${error.message}`);
        }
    };

    const handleFacebookSignIn = async () => {
        if (!auth) return;
        try {
            const provider = new FacebookAuthProvider();
            await signInWithPopup(auth, provider);
            setFirebaseError('');
            setShowLoginPrompt(false); // Close login prompt after successful sign-in
            setShowMenu(false); // Close menu after login
        } catch (error) {
            console.error("Error signing in with Facebook:", error);
            setFirebaseError(`Error signing in with Facebook: ${error.message}`);
        }
    };

    const handleAppleSignIn = async () => {
        if (!auth) return;
        try {
            const provider = new OAuthProvider('apple.com');
            provider.addScope('email');
            provider.addScope('name');
            await signInWithPopup(auth, provider);
            setFirebaseError('');
            setShowLoginPrompt(false); // Close login prompt after successful sign-in
            setShowMenu(false); // Close menu after login
        } catch (error) {
            console.error("Error signing in with Apple:", error);
            setFirebaseError(`Error signing in with Apple: ${error.message}`);
        }
    };


    const handleEmailSignUp = async () => {
        if (!auth) return;
        try {
            await createUserWithEmailAndPassword(auth, email, password);
            setFirebaseError('');
            setShowLoginPrompt(false); // Close login prompt after successful sign-up
            setShowMenu(false); // Close menu after login
        } catch (error) {
            console.error("Error signing up with email:", error);
            setFirebaseError(`Error signing up: ${error.message}`);
        }
    };

    const handleEmailSignIn = async () => {
        if (!auth) return;
        try {
            await signInWithEmailAndPassword(auth, email, password);
            setFirebaseError('');
            setShowLoginPrompt(false); // Close login prompt after successful sign-in
            setShowMenu(false); // Close menu after login
        } catch (error) {
            console.error("Error signing in with email:", error);
            setFirebaseError(`Error signing in: ${error.message}`);
        }
    };

    const handleGuestSignIn = async () => {
        if (!auth) return;
        try {
            await signInAnonymously(auth);
            setFirebaseError('');
            setShowLoginPrompt(false); // Hide login prompt initially after guest sign-in
            setShowMenu(false); // Close menu after action
        } catch (error) {
            console.error("Error signing in anonymously:", error);
            setFirebaseError(`Error signing in as guest: ${error.message}`);
        }
    };

    const handleLogout = async () => {
        if (!auth) return;
        try {
            await signOut(auth);
            setUserId(null); // Clear userId
            setUserDisplayName(null); // Clear display name
            setIsGuestUser(false); // Not a guest after logout
            setShowLoginPrompt(true); // Show login prompt after logout
            setCurrentPage('active'); // Reset page
            setFirebaseError('');
            setShowMenu(false); // Close menu after logout
        } catch (error) {
            console.error("Error logging out:", error);
            setFirebaseError(`${t('logoutFailed')} ${error.message}`);
        }
    };

    const handleExportData = async () => {
        if (!db || !userId) {
            setStatusMessage("No user or database initialized for export.");
            return;
        }
        try {
            const appId = typeof __app_id !== 'undefined' ? __app_id : 'default-app-id';
            const tapasCollectionRef = collection(db, `artifacts/${appId}/users/${userId}/tapas`);
            const querySnapshot = await getDocs(tapasCollectionRef);
            const dataToExport = querySnapshot.docs.map(doc => {
                const data = doc.data();
                // Convert Firestore Timestamps to ISO strings for export
                const exportableData = {};
                for (const key in data) {
                    if (key !== 'id' && key !== 'userId') { // Exclude 'id' and 'userId'
                        if (key === 'checkedDays' || key === 'recuperatedDays' || key === 'advancedDays') {
                            // Ensure unique days are exported as ISO strings
                            exportableData[key] = getUniqueCheckedDays(data[key] || []).map(timestamp => timestamp.toDate().toISOString().split('T')[0]);
                        } else if (data[key] instanceof Timestamp) {
                            exportableData[key] = data[key].toDate().toISOString();
                        } else if (data[key] instanceof Date) {
                             exportableData[key] = data[key].toISOString();
                        }
                        else {
                            exportableData[key] = data[key];
                        }
                    }
                }
                return exportableData; // Return data without 'id' and 'userId'
            });

            const jsonString = JSON.stringify(dataToExport, null, 2);
            const blob = new Blob([jsonString], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `tapas_data_${new Date().toISOString().split('T')[0]}.json`; // Removed userId from filename
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
            setStatusMessage(t('exportSuccessful'));
            setShowMenu(false); // Close main menu
            setShowDataMenu(false); // Close data submenu
        } catch (error) {
            console.error("Error exporting data:", error);
            setStatusMessage(`${t('exportFailed')} ${error.message}`);
        }
    };

    const handleImportDataClick = () => {
        fileInputRef.current.click(); // Trigger the hidden file input click
        // Do NOT close the menu here. It should remain open until file selection is done.
    };

    const handleFileChange = async (event) => {
        const file = event.target.files[0];
        if (!file) {
            setShowMenu(false); // Close menu if file selection is cancelled
            setShowDataMenu(false); // Close submenu too
            return;
        }

        if (!db || !userId) {
            setStatusMessage("No user or database initialized for import.");
            setShowMenu(false); // Close menu
            setShowDataMenu(false); // Close submenu too
            return;
        }

        try {
            const reader = new FileReader();
            reader.onload = async (e) => {
                try {
                    const importedData = JSON.parse(e.target.result);
                    if (!Array.isArray(importedData)) {
                        setStatusMessage(t('invalidJsonFile'));
                        return;
                    }

                    const appId = typeof __app_id !== 'undefined' ? __app_id : 'default-app-id';
                    const tapasCollectionRef = collection(db, `artifacts/${appId}/users/${userId}/tapas`);

                    for (const item of importedData) {
                        // Create a new document reference with an auto-generated ID for each imported item
                        const newDocRef = doc(tapasCollectionRef);
                        const dataToSave = { ...item };

                        // Remove 'id' and 'userId' if present in imported data
                        delete dataToSave.id;
                        delete dataToSave.userId;

                        // Convert ISO date strings back to Date objects for Firestore
                        if (dataToSave.startDate && typeof dataToSave.startDate === 'string') {
                            dataToSave.startDate = new Date(dataToSave.startDate);
                        } else if (dataToSave.startDate === null) {
                            dataToSave.startDate = null; // Preserve null for 'noTapas'
                        }
                        if (dataToSave.createdAt && typeof dataToSave.createdAt === 'string') {
                            dataToSave.createdAt = new Date(dataToSave.createdAt);
                        }
                        if (dataToSave.checkedDays && Array.isArray(dataToSave.checkedDays)) {
                            // De-duplicate and convert to Timestamp objects
                            dataToSave.checkedDays = getUniqueCheckedDays(dataToSave.checkedDays);
                        } else {
                            dataToSave.checkedDays = [];
                        }
                        if (dataToSave.completionDate && typeof dataToSave.completionDate === 'string') {
                            dataToSave.completionDate = new Date(dataToSave.completionDate);
                        }
                        // Handle new fields during import
                        if (dataToSave.checkedPartsByDate && typeof dataToSave.checkedPartsByDate === 'object') {
                            // No special conversion needed as keys are date strings and values are arrays of numbers
                        } else {
                            dataToSave.checkedPartsByDate = {}; // Ensure it's an object if missing
                        }
                        // Handle new recuperatedDays and advancedDays during import
                        if (!dataToSave.recuperatedDays) {
                            dataToSave.recuperatedDays = [];
                        } else if (Array.isArray(dataToSave.recuperatedDays)) {
                            dataToSave.recuperatedDays = getUniqueCheckedDays(dataToSave.recuperatedDays);
                        }
                        if (!dataToSave.advancedDays) {
                            dataToSave.advancedDays = [];
                        } else if (Array.isArray(dataToSave.advancedDays)) {
                            dataToSave.advancedDays = getUniqueCheckedDays(dataToSave.advancedDays);
                        }
                        if (!dataToSave.results) {
                            dataToSave.results = null;
                        }
                        if (!dataToSave.goals) {
                            dataToSave.goals = [];
                        } else if (Array.isArray(dataToSave.goals)) {
                            // No conversion needed, already array of strings
                        } else if (typeof dataToSave.goals === 'string') {
                            dataToSave.goals = dataToSave.goals.split('\n').filter(g => g.trim() !== '');
                        } else {
                            dataToSave.goals = [];
                        }
                        if (!dataToSave.scheduleType) {
                            dataToSave.scheduleType = 'daily';
                        }
                        if (!dataToSave.scheduleInterval) {
                            dataToSave.scheduleInterval = null;
                        }
                        if (typeof dataToSave.acknowledgeAfter !== 'boolean') {
                            dataToSave.acknowledgeAfter = false;
                        }
                        // Ensure duration is set to 0 if scheduleType is 'noTapas'
                        if (dataToSave.scheduleType === 'noTapas') {
                            dataToSave.duration = 0;
                        }


                        await setDoc(newDocRef, { ...dataToSave, userId: userId }); // Assign current userId
                    }
                    setStatusMessage(t('importSuccessful'));
                } catch (parseError) {
                    console.error("Error parsing JSON or saving data:", parseError);
                    setStatusMessage(`${t('invalidJsonFile')} ${parseError.message}`);
                } finally {
                    setShowMenu(false); // Close main menu after processing
                    setShowDataMenu(false); // Close data submenu
                }
            };
            reader.readAsText(file);
        } catch (error) {
            console.error("Error importing data:", error);
            setStatusMessage(`${t('importFailed')} ${error.message}`);
            setShowMenu(false); // Close menu on error
            setShowDataMenu(false); // Close submenu on error
        } finally {
            event.target.value = ''; // Clear the input so the same file can be selected again
        }
    };

    const handleCleanData = () => {
        setShowCleanDataModal(true);
        setShowMenu(false); // Close main menu
        setShowDataMenu(false); // Close data submenu
    };

    const handleCleanDataConfirmed = async (timeframe) => {
        if (!db || !userId) {
            setStatusMessage("No user or database initialized for cleaning.");
            setShowCleanDataModal(false);
            return;
        }

        try {
            let cutoffDate = new Date();
            cutoffDate.setHours(0, 0, 0, 0); // Normalize to start of day

            if (timeframe !== 'all') {
                const years = parseInt(timeframe.replace('years', '').replace('year', ''));
                cutoffDate.setFullYear(cutoffDate.getFullYear() - years);
            } else {
                // If 'all', set a very old date so all tapas will be considered for deletion
                cutoffDate = null;
            }

            const appId = typeof __app_id !== 'undefined' ? __app_id : 'default-app-id';
            const tapasCollectionRef = collection(db, `artifacts/${appId}/users/${userId}/tapas`);
            const q = query(tapasCollectionRef);
            const querySnapshot = await getDocs(q);

            let deletedCount = 0;
            const batch = writeBatch(db); // Use a batch for efficient deletion

            querySnapshot.docs.forEach(docSnapshot => {
                const tapasData = docSnapshot.data();
                // Only clean tapas that are not 'noTapas' or have a defined start date
                if (tapasData.scheduleType !== 'noTapas' && tapasData.startDate) {
                    const startDate = tapasData.startDate.toDate();
                    startDate.setHours(0, 0, 0, 0); // Normalize

                    const endDate = new Date(startDate);
                    endDate.setDate(startDate.getDate() + tapasData.duration - 1); // Calculate end date
                    endDate.setHours(0, 0, 0, 0);

                    if (!cutoffDate || endDate < cutoffDate) {
                        batch.delete(doc(tapasCollectionRef, docSnapshot.id));
                        deletedCount++;
                    }
                } else if (tapasData.scheduleType === 'noTapas' && !cutoffDate) {
                    // If 'noTapas' and cleaning all, delete it
                    batch.delete(doc(tapasCollectionRef, docSnapshot.id));
                    deletedCount++;
                }
            });

            if (deletedCount > 0) {
                await batch.commit();
                setStatusMessage(t('cleaningDataSuccessful', deletedCount));
            } else {
                setStatusMessage("No old Tapas found to clean.");
            }

        } catch (error) {
            console.error("Error cleaning data:", error);
            setStatusMessage(`${t('cleaningDataFailed')} ${error.message}`);
        } finally {
            setShowCleanDataModal(false);
        }
    };


    const activeTapas = tapas.filter(tapas => tapas.status === 'active').sort((a, b) => {
        // Custom sorting logic for active tapas
        const isATapas = a.scheduleType !== 'noTapas';
        const isBTapas = b.scheduleType !== 'noTapas';

        // If one is 'noTapas' and the other isn't, 'noTapas' goes to the end
        if (isATapas && !isBTapas) return -1;
        if (!isATapas && isBTapas) return 1;

        // If both are 'noTapas' or both are regular tapas, sort by end date
        if (isATapas && isBTapas) {
            const endDateA = getTapasDatesInfo(a).endDate;
            const endDateB = getTapasDatesInfo(b).endDate;

            // Handle cases where endDate might be null or invalid (shouldn't happen for active tapas normally)
            if (!endDateA && !endDateB) return 0;
            if (!endDateA) return 1; // Null end date goes to the end
            if (!endDateB) return -1; // Null end date goes to the end

            return endDateA.getTime() - endDateB.getTime(); // Sort by end date ascending (earliest first)
        }

        // If both are 'noTapas', sort by name alphabetically
        if (!isATapas && !isBTapas) {
            return a.name.localeCompare(b.name);
        }

        return 0; // Should not be reached
    });

    // History tapas are already filtered by status and time in TapasList component
    // We only pass the base history tapas here, and let TapasList apply its internal filters.
    const baseHistoryTapas = tapas.filter(tapas => tapas.status !== 'active').sort((a,b) => {
        const dateA = a.completionDate ? a.completionDate.toDate() : a.createdAt.toDate();
        const dateB = b.completionDate ? b.completionDate.toDate() : b.createdAt.toDate();
        return dateB - dateA; // Sort descending by completion/creation date
    });

    if (loadingFirebase) {
        return (
            <div className="flex items-center justify-center min-h-screen bg-black text-white">
                <div className="text-indigo-400 text-3xl font-bold animate-pulse">{t('loadingApp')}</div>
            </div>
        );
    }

    // Only show login prompt if userId is null or if it's a guest user, and Firebase is done loading, and showLoginPrompt is true
    if (showLoginPrompt && !loadingFirebase && (!userId || isGuestUser)) {
        return (
            <div className="fixed inset-0 bg-gray-900 bg-opacity-90 flex flex-col items-center justify-center p-4 z-50">
                <div className="p-4 rounded-lg shadow-2xl text-center max-w-sm w-full mx-auto bg-white text-gray-800 dark:bg-gray-800 dark:text-gray-100">
                    <div className="p-0 grid justify-items-end">
                        <LanguageSelect locale={locale} setLocale={setLocale} />
                    </div>
                    <div className="p-4 rounded-lg shadow-2xl text-center max-w-sm w-full mx-auto bg-white text-gray-800 dark:bg-gray-800 dark:text-gray-100">
                    <h2 className="text-3xl font-bold mb-6">{t('welcomeTapasTracker')}</h2>
                    <p className="mb-6 text-gray-600 dark:text-gray-300">{t('trackPersonalGoals')}</p>

                    {/* Email/Password Login/Signup Form */}
                    {showEmailLoginForm ? (
                        <>
                            <input
                                type="email"
                                placeholder={t('email')}
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                className="w-full px-4 py-3 mb-3 border rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white border-gray-300 text-gray-900 dark:bg-gray-700 dark:border-gray-600 dark:text-gray-100"
                            />
                            <input
                                type="password"
                                placeholder={t('password')}
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                className="w-full px-4 py-3 mb-4 border rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white border-gray-300 text-gray-900 dark:bg-gray-700 dark:border-gray-600 dark:text-gray-100"
                            />
                            <button
                                onClick={handleEmailSignIn}
                                className="w-full bg-indigo-600 text-white px-6 py-3 rounded-lg shadow-lg hover:bg-indigo-700 transition-colors duration-200 text-lg font-medium mb-3"
                            >
                                {t('signInWithX', 'Email')}
                            </button>
                            <button
                                onClick={handleEmailSignUp}
                                className="w-full bg-purple-600 text-white px-6 py-3 rounded-lg shadow-lg hover:bg-purple-700 transition-colors duration-200 text-lg font-medium mb-4"
                            >
                                {t('signUpWithEmail')}
                            </button>
                            <p className="text-sm mb-4 text-gray-500 dark:text-gray-400">
                                <button
                                    onClick={() => setShowEmailLoginForm(false)}
                                    className="text-indigo-600 hover:underline"
                                >
                                    {t('or')} {t('signInWithX', 'Google')}
                                </button>
                            </p>
                        </>
                    ) : (
                        <>
                            <button
                                onClick={handleGoogleSignIn}
                                className="w-full flex items-center justify-center bg-blue-600 text-white px-6 py-3 rounded-lg shadow-lg hover:bg-blue-700 transition-colors duration-200 text-lg font-medium mb-4"
                            >
                                <svg className="w-5 h-5 mr-3" viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
                                    <path fill="#FFC107" d="M43.611 20.083H42V20H24v8h11.303c-1.619 4.484-5.904 7.512-10.303 7.512c-6.718 0-12.21-5.492-12.21-12.21s5.492-12.21 12.21-12.21c3.627 0 6.471 1.485 8.441 3.253l5.962-5.962C34.046 6.053 29.268 4 24 4C12.955 4 4 12.955 4 24s8.955 20 20 20s20-8.955 20-20c0-1.341-.138-2.65-.389-3.917z"/>
                                    <path fill="#FF3D00" d="M6.306 14.691L1.871 17.16C1.493 18.252 1.25 19.37 1.25 20.505C1.25 21.64 1.493 22.758 1.871 23.85L6.306 26.319L9.42 22.486L6.306 14.691z"/>
                                    <path fill="#4CAF50" d="M24 43.999C12.955 43.999 4 35.044 4 24L4.001 24.01L8.514 26.837L10.42 30.638L10.42 30.638C12.446 36.657 17.72 40.89 24 40.89C29.268 40.89 34.046 38.947 37.893 35.107L32.27 29.588C30.648 30.768 28.318 31.512 26.012 31.512C20.373 31.512 15.825 26.964 15.825 21.325L15.825 21.325L15.825 21.325L15.825 21.325L15.825 21.325L15.825 21.325L15.825 21.325L15.825 21.325L15.825 21.325C15.825 21.325 15.825 21.325 15.825 21.325V21.325V21.325C15.825 15.686 20.373 11.138 26.012 11.138C28.318 11.138 30.648 11.882 32.27 13.062L37.893 7.543L37.893 7.543C34.046 3.703 29.268 1.76 24 1.76C12.955 1.76 4 10.715 4 21.76z"/>
                                    <path fill="#1976D2" d="M43.611 20.083L43.611 20.083L43.611 20.083C43.611 20.083 43.611 20.083 43.611 20.083z"/>
                                </svg>
                                {t('signInWithX', 'Google')}
                            </button>
                            {0 && (<button
                                onClick={handleFacebookSignIn}
                                className="w-full flex items-center justify-center bg-blue-800 text-white px-6 py-3 rounded-lg shadow-lg hover:bg-blue-900 transition-colors duration-200 text-lg font-medium mb-4"
                            >
                                <svg className="w-5 h-5 mr-3" viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
                                    <path d="M12 0C5.373 0 0 5.373 0 12c0 6.016 4.388 11.008 10.125 11.854V15.46H7.078V12h3.047V9.356c0-3.007 1.792-4.669 4.533-4.669c1.306 0 2.684.235 2.684.235V8.07h-1.538c-1.505 0-1.97.931-1.97 1.898V12h3.328l-.532 3.46h-2.796v6.394C19.612 23.008 24 18.016 24 12C24 5.373 18.627 0 12 0z"/>
                                </svg>
                                {t('signInWithX', 'Facebook')}
                            </button>)}
                            {0 && (<button
                                onClick={handleAppleSignIn}
                                className="w-full flex items-center justify-center bg-gray-900 text-white px-6 py-3 rounded-lg shadow-lg hover:bg-gray-700 transition-colors duration-200 text-lg font-medium mb-4"
                            >
                                <svg fill="currentColor" width="24px" height="24px" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                                    <path d="M18.71 19.5C17.88 20.74 17 21.95 15.66 21.97C14.32 22 13.89 21.18 12.37 21.18C10.84 21.18 10.37 21.95 9.09997 22C7.78997 22.05 6.79997 20.68 5.95997 19.47C4.24997 17 2.93997 12.45 4.69997 9.39C5.56997 7.87 7.12997 6.91 8.81997 6.88C10.1 6.86 11.32 7.75 12.11 7.75C12.89 7.75 14.37 6.68 15.92 6.84C16.57 6.87 18.39 7.1 19.56 8.82C19.47 8.88 17.39 10.1 17.41 12.63C17.44 15.65 20.06 16.66 20.09 16.67C20.06 16.74 19.67 18.11 18.71 19.5ZM13 3.5C13.73 2.67 14.94 2.04 15.94 2C16.07 3.17 15.6 4.35 14.9 5.19C14.21 6.04 13.07 6.7 11.95 6.61C11.8 5.46 12.36 4.26 13 3.5Z"/>
                                </svg>
                                &nbsp;&nbsp;{t('signInWithX', 'Apple')}
                            </button>)}
                            <p className="text-sm mb-4 text-gray-500 dark:text-gray-400">
                                <button
                                    onClick={() => setShowEmailLoginForm(true)}
                                    className="text-indigo-600 hover:underline"
                                >
                                    {t('or')} {t('signInWithX', 'Email')}
                                </button>
                            </p>
                        </>
                    )}

                    <button
                        onClick={handleGuestSignIn} // Call new guest sign-in function
                        className="w-full bg-gray-300 text-gray-800 px-6 py-3 rounded-lg shadow-lg hover:bg-gray-400 transition-colors duration-200"
                    >
                        {t('continueAsGuest')}
                    </button>
                    {firebaseError && <p className="text-red-600 mt-4">{firebaseError}</p>}
                </div>
            </div>
            </div>
        );
    }

    return (
        <AppContext.Provider value={{ db, auth, userId, userDisplayName, t, locale, setLocale }}>
            <div className="min-h-screen font-sans antialiased flex flex-col">
                {/* Global Styles for body, etc. - in a real Next.js app, these would be in styles/globals.css or _app.js */}
                <style>{`
                    body {
                        font-family: 'Inter', sans-serif;
                    }
                    /* Custom scrollbar for better aesthetics */
                    ::-webkit-scrollbar {
                        width: 8px;
                    }
                    /* Base scrollbar track color */
                    ::-webkit-scrollbar-track {
                        background: #f1f1f1;
                        border-radius: 10px;
                    }
                    /* Dark mode scrollbar track color */
                    html.dark ::-webkit-scrollbar-track {
                        background: #333;
                    }
                    /* Base scrollbar thumb color */
                    ::-webkit-scrollbar-thumb {
                        background: #888;
                        border-radius: 10px;
                    }
                    /* Dark mode scrollbar thumb color */
                    html.dark ::-webkit-scrollbar-thumb {
                        background: #666;
                    }
                    /* Base scrollbar thumb hover color */
                    ::-webkit-scrollbar-thumb:hover {
                        background: #555;
                    }
                    /* Dark mode scrollbar thumb hover color */
                    html.dark ::-webkit-scrollbar-thumb:hover {
                        background: #888;
                    }
                `}</style>

                {/* Header */}
                <header className="bg-gradient-to-r from-indigo-600 to-purple-700 text-white p-4 shadow-md">
                    <div className="container mx-auto flex justify-between items-center relative">
                        <h1 className="text-3xl font-bold">{t('appName')}</h1>
                        <div className="flex items-center space-x-4">
                            {/* Theme Toggle */}
                            <button
                                onClick={toggleTheme}
                                className="p-2 rounded-full bg-white bg-opacity-20 hover:bg-opacity-30 transition-colors duration-200 text-white focus:outline-none focus:ring-2 focus:ring-white"
                                aria-label="Toggle light/dark mode"
                            >
                                {/* The theme is managed by the parent ThemeProvider via document.documentElement.classList.add('dark') */}
                                {/* This button's icon will reflect the *current* state of the 'dark' class on <html> */}
                                {document.documentElement.classList.contains('dark') ? (
                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="black">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
                                    </svg>
                                ) : (
                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="black">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v1m0 16v1m9-9h1M4 12H3m15.325 4.962l-.707.707M6.707 6.707l-.707-.707m12.793 0l-.707-.707M6.707 17.293l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
                                    </svg>
                                )}
                            </button>

                            <LanguageSelect locale={locale} setLocale={setLocale} />

                            {userDisplayName && (
                                <span className="text-sm bg-indigo-700 px-3 py-1 rounded-full opacity-80 hidden md:inline-block">
                                    {t('hello')}, {userDisplayName.split(' ')[0]}!
                                </span>
                            )}
                            
                            <div className="relative" id="main-menu">
                                <button
                                    onClick={() => setShowMenu(!showMenu)}
                                    className="bg-white text-indigo-700 px-3 py-1 rounded-full text-sm font-semibold hover:bg-indigo-100 transition-colors duration-200"
                                >
                                    {t('menu')}
                                </button>
                                <input
                                    type="file"
                                    ref={fileInputRef}
                                    onChange={handleFileChange}
                                    accept=".json"
                                    style={{ position: 'absolute', left: '-9999px', width: '1px', height: '1px', overflow: 'hidden' }}
                                />
                                {showMenu && (
                                    <div className="absolute right-0 mt-2 w-48 rounded-md shadow-lg py-1 z-20 bg-white text-gray-800 dark:bg-gray-700 dark:text-gray-100">
                                        {auth && auth.currentUser && !auth.currentUser.isAnonymous ? (
                                            <button
                                                onClick={handleLogout}
                                                className="block w-full text-left px-4 py-2 hover:bg-gray-100 dark:hover:bg-gray-600"
                                            >
                                                {t('logout')}
                                            </button>
                                        ) : (
                                            <button
                                                onClick={() => { setShowLoginPrompt(true); setShowMenu(false); }}
                                                className="block w-full text-left px-4 py-2 hover:bg-gray-100 dark:hover:bg-gray-600"
                                            >
                                                {t('signIn')}
                                            </button>
                                        )}
                                        <div className="border-t border-gray-200 dark:border-gray-600 my-1"></div> {/* Separator */}
                                        <button
                                            onClick={() => setShowDataMenu(!showDataMenu)}
                                            className="block w-full text-left px-4 py-2 hover:bg-gray-100 dark:hover:bg-gray-600 flex justify-between items-center"
                                        >
                                            {t('data')}
                                            <svg className={`w-4 h-4 transform transition-transform ${showDataMenu ? 'rotate-180' : 'rotate-0'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path></svg>
                                        </button>
                                        {showDataMenu && (
                                            <div className="pl-4"> {/* Indent submenu items */}
                                                <button
                                                    onClick={handleImportDataClick}
                                                    className="block w-full text-left px-4 py-2 hover:bg-gray-100 dark:hover:bg-gray-600"
                                                >
                                                    {t('importData')}
                                                </button>
                                                <button
                                                    onClick={handleExportData}
                                                    className="block w-full text-left px-4 py-2 hover:bg-gray-100 dark:hover:bg-gray-600"
                                                >
                                                    {t('exportData')}
                                                </button>
                                                <button
                                                    onClick={handleCleanData}
                                                    className="block w-full text-left px-4 py-2 hover:bg-gray-100 dark:hover:bg-gray-600"
                                                >
                                                    {t('cleanData')}
                                                </button>
                                            </div>
                                        )}
                                        <div className="border-t border-gray-200 dark:border-gray-600 my-1"></div> {/* Separator */}
                                        <button
                                            onClick={() => { setShowHelpModal(true); setShowMenu(false); }}
                                            className="block w-full text-left px-4 py-2 hover:bg-gray-100 dark:hover:bg-gray-600"
                                        >
                                            {t('help')}
                                        </button>
                                        <button
                                            onClick={() => { setShowAboutModal(true); setShowMenu(false); }}
                                            className="block w-full text-left px-4 py-2 hover:bg-gray-100 dark:hover:bg-gray-600"
                                        >
                                            {t('about')}
                                        </button>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </header>

                {statusMessage && (
                    <div className={`p-3 text-center ${statusMessage.includes('successfully') || statusMessage.includes('erfolgreich') || statusMessage.includes('reușită') ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'} rounded-md mx-auto mt-4 max-w-lg`}>
                        {statusMessage}
                    </div>
                )}

                {/* Navigation Tabs */}
                <nav className="shadow-sm p-3 sticky top-0 z-10 bg-white dark:bg-gray-800">
                    <div className="container mx-auto flex justify-around">
                        <button
                            onClick={() => { setCurrentPage('active'); setSelectedTapas(null); setEditingTapas(null); }}
                            className={`px-4 py-2 rounded-md text-lg font-medium transition-colors duration-200 ${
                                currentPage === 'active' ? 'bg-blue-600 text-white shadow-lg border-2 border-blue-800' : 'text-gray-700 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-700'
                            }`}
                        >
                            {t('active')}
                        </button>
                        <button
                            onClick={() => { setCurrentPage('history'); setSelectedTapas(null); setEditingTapas(null); }}
                            className={`px-4 py-2 rounded-md text-lg font-medium transition-colors duration-200 ${
                                currentPage === 'history' ? 'bg-blue-600 text-white shadow-lg border-2 border-blue-800' : 'text-gray-700 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-700'
                            }`}
                        >
                            {t('history')}
                        </button>
                        <button
                            onClick={() => { setCurrentPage('statistics'); setSelectedTapas(null); setEditingTapas(null); }}
                            className={`px-4 py-2 rounded-md text-lg font-medium transition-colors duration-200 ${
                                currentPage === 'statistics' ? 'bg-blue-600 text-white shadow-lg border-2 border-blue-800' : 'text-gray-700 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-700'
                            }`}
                        >
                            {t('statistics')}
                        </button>
                        <button
                            onClick={() => { setCurrentPage('add'); setSelectedTapas(null); }}
                            aria-label={t('addNew')}
                            className={`px-4 py-2 rounded-md text-2xl font-medium transition-colors duration-200 font-bold ${
                                currentPage === 'add' ? 'bg-blue-600 text-white shadow-lg border-2 border-blue-800' : 'text-gray-700 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-700'
                            }`}
                        >
                            +
                        </button>
                    </div>
                </nav>

                {/* Main Content Area */}
                <main className="container mx-auto p-4 flex-grow bg-gray-100 dark:bg-gray-900">
                    {sharedRef ? (
                        <ShareView
                            shareReference={sharedRef}
                            onClose={() => setSharedRef(null)} // Close share view and clear ref
                            onAdoptTapas={() => {
                                setSharedRef(null); // Clear ref after adoption
                                setCurrentPage('active'); // Go to active tapas view
                            }}
                            setStatusMessage={setStatusMessage}
                        />
                    ) : (
                        <>
                            {currentPage === 'active' && (
                                <TapasList tapas={activeTapas} onSelectTapas={handleSelectTapas} />
                            )}
                            {currentPage === 'history' && (
                                <TapasList
                                    tapas={baseHistoryTapas}
                                    onSelectTapas={handleSelectTapas}
                                    showFilters={true}
                                    historyStatusFilter={historyStatusFilter}
                                    setHistoryStatusFilter={setHistoryStatusFilter}
                                    historyTimeFilter={historyTimeFilter}
                                    setHistoryTimeFilter={setHistoryTimeFilter}
                                />
                            )}
                            {currentPage === 'statistics' && (
                                <Statistics allTapas={tapas} />
                            )}
                            {currentPage === 'add' && (
                                <TapasForm onTapasAdded={() => { setCurrentPage('active'); setEditingTapas(null); }} editingTapas={editingTapas} onCancelEdit={handleCancelEdit} />
                            )}
                            {selectedTapas && currentPage === 'detail' && (
                                <TapasDetail tapas={selectedTapas} onClose={handleCloseTapasDetail} onEdit={handleEditTapas} setSelectedTapas={setSelectedTapas} />
                            )}
                            {selectedLicense && (
                                <License onClose={handleCloseLicense} />
                            )}
                            {selectedLegalNotice && (
                                <LegalNotice onClose={handleCloseLegalNotice} />
                            )}
                            {selectedGDPR && (
                                <GDPR onClose={handleCloseGDPR} />
                            )}
                        </>
                    )}
                </main>

                {/* Footer */}
                <footer className="bg-gray-800 text-white text-center p-4 mt-8 text-sm">
                    <span className="text-nav">{t('appName')} &copy; {new Date().getFullYear()} by Reimund Renner</span>
                    <div className="flex justify-center space-x-4 mt-2">
                        <button
                            onClick={() => { setSelectedGDPR(true); }}
                            className="px-4 py-1 rounded-md text-sm font-medium transition-colors duration-200 text-lightblue-700 hover:text-blue-700 hover:bg-blue-100"
                        >
                            {t('gdpr')}
                        </button>
                        <span className="text-gray-500 py-1">|</span>
                        <button
                            onClick={() => { setSelectedLegalNotice(true); }}
                            className="px-4 py-1 rounded-md text-sm font-medium transition-colors duration-200 text-lightblue-700 hover:text-blue-700 hover:bg-blue-100"
                        >
                            {t('legalNotice')}
                        </button>
                        <span className="text-gray-500 py-1">|</span>
                        <button
                            onClick={() => { setSelectedLicense(true); }}
                            className="px-4 py-1 rounded-md text-sm font-medium transition-colors duration-200 text-lightblue-700 hover:text-blue-700 hover:bg-blue-100"
                        >
                            {t('license')}
                        </button>
                    </div>
                </footer>

                {/* Modals/Overlays */}
                {showAboutModal && <AboutModal onClose={() => setShowAboutModal(false)} />}
                {showHelpModal && <HelpModal onClose={() => setShowHelpModal(false)} />}
                {showCleanDataModal && <CleanDataModal onClose={() => setShowCleanDataModal(false)} onCleanConfirmed={handleCleanDataConfirmed} />}
                {/* Login Prompt Overlay (conditionally rendered on top) */}
            </div>
        </AppContext.Provider>
    );
};

// Wrap HomePage with LocaleProvider and ThemeProvider
const WrappedHomePage = () => (
    <LocaleProvider>
        <ThemeProvider>
            <HomePage />
        </ThemeProvider>
    </LocaleProvider>
);

// Default export for the Next.js page
export default WrappedHomePage;
