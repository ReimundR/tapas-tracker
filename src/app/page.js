'use client'

// pages/index.js (or .jsx)
// This file will contain your main application logic as a Next.js page component.

import React, { useState, useEffect, createContext, useContext, useCallback, useRef, Suspense } from 'react';
import { initializeApp } from 'firebase/app';
import { getAuth, signInAnonymously, onAuthStateChanged, GoogleAuthProvider, signInWithPopup,
    signOut, createUserWithEmailAndPassword, signInWithEmailAndPassword } from 'firebase/auth';
import { initializeFirestore, persistentLocalCache, persistentSingleTabManager, disableNetwork,
    enableNetwork, getFirestore, collection, addDoc, getDocs, getDoc, getDocsFromCache,
    getDocFromCache, doc, updateDoc, deleteDoc, query, where, onSnapshot, orderBy, Timestamp,
    setDoc, writeBatch } from 'firebase/firestore';
//import { useRouter } from "next/navigation";
import { $generateHtmlFromNodes } from '@lexical/html';
import { RichTextEditor, LexicalHtmlRenderer, LocaleContext } from './components/editor';
import { Tabs, TabList, Tab, TabPanel } from 'react-tabs';
import { Tooltip } from 'react-tooltip';
import * as Switch from "@radix-ui/react-switch";
import Head from 'next/head'; // Import Head from next/head for meta tags
import { startOfDay, differenceInMonths, getDaysInMonth, isLastDayOfMonth, getDate, setDate, startOfWeek, addDays, subDays,
    addMonths, subMonths, subYears, differenceInCalendarDays, getISOWeek,
    isToday, isYesterday, isTomorrow, isBefore, isAfter, isSameDay, isWithinInterval, format } from 'date-fns';
import GdprEN from "../content/privacy-policy-en.mdx";
import GdprDE from "../content/privacy-policy-de.mdx";
import { translations } from "./translations";
import { firebaseConfig, LocaleProvider, ThemeContext, ThemeProvider, InstallPrompt, useModalState } from "./helpers";
import ReactECharts from 'echarts-for-react';
import 'react-tabs/style/react-tabs.css';
//import ChangelogContent from '../../CHANGELOG.md';
import dynamic from 'next/dynamic';

const ChangelogContent = dynamic(() => import('../../CHANGELOG.md'), {
  loading: () => <div className="flex justify-center items-center">
    <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-indigo-500"></div></div>,
});

const __app_id = firebaseConfig.appId;
const appVersion = process.env.version;
const repUrl = "https://github.com/ReimundR/tapas-tracker";

const LanguageSelect = ({ locale, setLocale }) => {
    return (
        <select
            id="language"
            value={locale}
            onChange={(e) => setLocale(e.target.value)}
            className="bg-indigo-700 text-white px-2 py-1 rounded-md text-sm cursor-pointer"
        >
            {translations && (Object.keys(translations).map((lang, index) => (
                <option key={index} value={lang}>{translations[lang]['languageName']}</option>
            )))}
        </select>
    );
};

// Helper to get content in the preferred language with fallbacks
const getLocalizedContent = (contentObject, currentLocale, selectedTapasLanguage = null) => {
    if (!contentObject) return '';
    if (typeof contentObject === 'string') return contentObject; // Handle legacy string data
    if (Array.isArray(contentObject)) return contentObject; // Handle legacy array data (e.g., goals/parts)

    // 1. Try selectedTapasLanguage
    if (selectedTapasLanguage && contentObject[selectedTapasLanguage]) {
        return contentObject[selectedTapasLanguage];
    }
    // 2. Try currentLocale (main app language)
    if (contentObject[currentLocale]) {
        return contentObject[currentLocale];
    }
    // 3. Fallback to English
    if (contentObject['en']) {
        return contentObject['en'];
    }
    // 4. Fallback to the first available language
    const firstAvailableLang = Object.keys(contentObject)[0];
    return contentObject[firstAvailableLang] || '';
};


// Define context for Firebase and user data
const AppContext = createContext(null);

// Config
const ConfigModal = ({ onClose, db, userId, t, setConfig, wasPersistentCacheEnabled }) => {
    const persistentCacheCookie = localStorage.getItem('persistentLocalCache');
    const [dateAspects, setDateAspects] = useState([]);
    const [dateAspectDaysBefore, setDateAspectDaysBefore] = useState(7);
    const [dateAspectDaysAfter, setDateAspectDaysAfter] = useState(1);
    const [newAspectName, setNewAspectName] = useState('');
    const [newAspectPercentage, setNewAspectPercentage] = useState('');
    const [isPersistentCacheEnabled, setPersistentCacheEnabled] = useState(persistentCacheCookie === 'true');
    const [dayTime, setDayTime] = useState('04:00');

    const appId = typeof __app_id !== 'undefined' ? __app_id : 'default-app-id';
    const configRef = doc(db, `artifacts/${appId}/users/${userId}/config/appConfig`);

    const mySetDoc = async (ref, data, cfg) => {
        if (wasPersistentCacheEnabled) {
            setDoc(ref, data, cfg);
        } else {
            return await setDoc(ref, data, cfg);
        }
    };

    useEffect(() => {
        if (!persistentCacheCookie) {
            const isStandalone = window.matchMedia('(display-mode: standalone)').matches;
            if (isStandalone) {
                setPersistentCacheEnabled(true); // standalone default enabled
            }
        }

        const unsub = onSnapshot(configRef, (docSnap) => {
            if (docSnap.exists()) {
                const data = docSnap.data();
                setDateAspects(data.dateAspects || []);
                setDateAspectDaysBefore(data.dateAspectDaysBefore || 7);
                setDateAspectDaysAfter(data.dateAspectDaysAfter || 1);
                setDayTime(data.dayTime || '04:00');
            } else {
                // Set default values if the document doesn't exist
                setDateAspects([]);
                setDateAspectDaysBefore(7);
                setDateAspectDaysAfter(1);
                setDayTime('04:00');
            }
        });
        return () => unsub();
    }, [db]);

    const handleAddAspect = async () => {
        if (newAspectName && newAspectPercentage) {
            let newPercentage;
            if (newAspectPercentage.indexOf('/') !== -1) {
                const vals = newAspectPercentage.split('/');
                newPercentage = Math.round(parseFloat(vals[0]) / parseFloat(vals[1]) * 1e5)/1e3;
            } else {
                newPercentage = parseFloat(newAspectPercentage);
            }
            const newAspect = { name: newAspectName, percentage: newPercentage };
            setDateAspects([...dateAspects, newAspect]);
            setNewAspectName('');
            setNewAspectPercentage('');
        }
    };

    const handleRemoveAspect = async (aspect) => {
        const newAspects = dateAspects.filter(function( obj ) {
            return obj.name !== aspect.name;
        });
        setDateAspects(newAspects);
    };

    const handleSave = async () => {
        try {
            await mySetDoc(configRef, { dayTime: dayTime,
                dateAspectDaysBefore: dateAspectDaysBefore,
                dateAspectDaysAfter: dateAspectDaysAfter,
                dateAspects: dateAspects,
            }, { merge: true });
        } catch (e) {
            console.error("Error updating days: ", e);
        }

        const config = {};
        config.dayTime = dayTime;
        config.dateAspects = dateAspects;
        config.dateAspectDaysBefore = dateAspectDaysBefore;
        config.dateAspectDaysAfter = dateAspectDaysAfter;
        setConfig(config);

        localStorage.setItem('persistentLocalCache', isPersistentCacheEnabled.toString());
        // This is a client-side setting, Firebase persistence is enabled on app load
        // when the cookie is present. This button only updates the cookie.
        onClose();
    };

    return (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white text-gray-800 dark:bg-gray-800 dark:text-gray-100 p-6 rounded-lg shadow-lg w-full max-w-xl">
                <button onClick={onClose} className="float-right text-gray-500 hover:text-gray-700 text-3xl font-bold">
                    &times;
                </button>
                <h2 className="text-xl font-bold mb-4">{t('config')}</h2>

                <Tabs>
                    <TabList>
                        <Tab>{t('general')}</Tab>
                        <Tab>{t('dateAspects')}</Tab>
                    </TabList>
                    <TabPanel>
                        <div className="space-y-4">
                            <div className="flex row items-center">
                                <label htmlFor="dayTime" className="block text-sm font-medium text-gray-700 dark:text-gray-300">{t('dayTime')}</label>
                                <input
                                    type="time"
                                    id="dayTime"
                                    value={dayTime}
                                    onChange={(e) => setDayTime(e.target.value)}
                                    className="mt-1 ml-3 block w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 bg-white border-gray-300 text-gray-900 dark:bg-gray-700 dark:border-gray-600 dark:text-gray-100 focus:border-indigo-500"
                                />
                            </div>
                            <div>
                                <div style={{ display: "flex", alignItems: "center" }}>
                                    <label
                                        className="Label pr-4"
                                        htmlFor="local-persistance"
                                    >
                                        {t('enableLocalPersistence')}
                                    </label>
                                    <Switch.Root
                                        className="SwitchRoot"
                                        id="local-persistance"
                                        checked={isPersistentCacheEnabled}
                                        onCheckedChange={setPersistentCacheEnabled}
                                    >
                                        <Switch.Thumb className="SwitchThumb" />
                                    </Switch.Root>
                                </div>
                                <p className="text-xs text-gray-500 mt-1 dark:text-gray-400">
                                    {t('persistenceHint')}
                                </p>
                            </div>
                        </div>
                    </TabPanel>
                    <TabPanel>
                        <div className="mb-4">
                            <div className="flex gap-2 mb-2">
                                <input type="text"
                                    value={newAspectName}
                                    maxLength="120"
                                    onChange={(e) => setNewAspectName(e.target.value)}
                                    placeholder={t('aspectName')}
                                    className="flex-grow w-full p-2 border rounded"
                                />
                                <input type="text"
                                    value={newAspectPercentage}
                                    maxLength="20"
                                    onChange={(e) => setNewAspectPercentage(e.target.value)}
                                    placeholder="1/3 or %"
                                    aria-hidden="percent"
                                    className="w-24 p-2 border rounded"
                                />
                                <button onClick={handleAddAspect} className="px-4 py-2 bg-blue-500 text-white rounded" aria-hidden="add">+</button>
                            </div>
                            <ul className="list-disc pl-5">
                                {dateAspects.map((aspect, index) => (
                                    <li key={index} className="flex justify-between items-center my-1">{aspect.name}: {aspect.percentage}% <button onClick={() => handleRemoveAspect(aspect)} className="text-red-500">{t('remove')}</button></li>
                                ))}
                            </ul>
                        </div>
                        <div className="mb-4">
                            <h3 className="font-semibold mb-2">{t('dateAspectTimeframe')}</h3>
                            <div className="flex flex-wrap gap-4">
                                <label className="flex items-center">{t('daysBefore')}: <input type="number" value={dateAspectDaysBefore} onChange={(e) => setDateAspectDaysBefore(parseInt(e.target.value) || 0)} className="w-16 ml-2 p-2 border rounded" /></label>
                                <label className="flex items-center">{t('daysAfter')}: <input type="number" value={dateAspectDaysAfter} onChange={(e) => setDateAspectDaysAfter(parseInt(e.target.value) || 0)} className="w-16 ml-2 p-2 border rounded" /></label>
                            </div>
                            <p className="text-sm text-gray-500 mt-2">{t('dateAspectHint')}</p>
                        </div>
                    </TabPanel>
                </Tabs>
                <div className="flex justify-end gap-2 mt-6">
                    <button onClick={onClose} className="px-4 py-2 bg-gray-300 dark:bg-gray-600 hover:bg-gray-500 rounded">{t('cancel')}</button>
                    <button onClick={handleSave} className="capitalize px-4 py-2 bg-indigo-600 text-white rounded hover:bg-indigo-700 disabled:bg-indigo-400">
                        {t('save')}
                    </button>
                </div>
            </div>
        </div>
    );
};

const getDateStr = (date) => {
    return date.toLocaleDateString();
};

const getDateRangeReductionFormat = () => {
    const fmt = getLocaleDateFormat();
    const adate = getDateStr(new Date());
    let sep;
    for (let i=0; i<adate.length; i++) {
        sep = adate[i];
        if (sep < '0' || sep > '9') {
            break;
        }
    }
    const maxReductions = fmt.endsWith('MM' + sep + 'YYYY') ? 2 : fmt.endsWith('YYYY') ? 1 : 0;
    return {sep, maxReductions};
};

const redFormat = getDateRangeReductionFormat();

const reduceDateRange = (startStr, endStr) => {
    const n = Math.min(startStr.length, endStr.length);
    let x = 0;
    let reds = redFormat.maxReductions;
    for (let i=1; i <= n && reds != 0; i++) {
        const v = startStr[startStr.length-i];
        if (v != endStr[endStr.length-i]) {
            break;
        }
        if (v==redFormat.sep) {
            x = i;
            reds--;
        }
    }
    if (x > 0) {
        startStr = startStr.substring(0, startStr.length+1-x);
    }
    return `${startStr} - ${endStr}`;
};

const AcknowledgeDateRangeModal = ({ onClose, tapas, db, userId, t, setSelectedTapas, isPersistentCacheEnabled }) => {
    const isMonthly = isMonthlyTapasType(tapas);

    const today = subDays(getTapasDay(new Date(), tapas), 1);
    //today.setHours(23, 59, 59, 999);
    const daysDelta = getScheduleFactor(tapas.scheduleType, tapas.scheduleInterval);
    const deltaName = t(getTypeUnit(tapas));

    const [endDate, setEndDate] = useState(formatDateToISO(today));
    const [numberOfDays, setNumberOfDays] = useState(1);
    const [startDate, setStartDate] = useState(formatDateToISO(isMonthly ? addDays(subMonths(today, numberOfDays), 1) : subDays(today, numberOfDays - 1)));
    const [status, setStatus] = useState('');
    const [isLoading, setIsLoading] = useState(false);

    const calculateDates = useCallback((type, value) => {
        if (type === 'days') {
            const count = parseInt(value, 10);
            if (!isNaN(count)) {
                setNumberOfDays(count);
                const end = startOfDay(new Date(endDate));
                let start;
                if (isMonthly) {
                    start = addDays(subMonths(end, count), 1);
                } else {
                    start = subDays(end, (count - 1) * daysDelta);
                }
                setStartDate(formatDateToISO(start));
            }
        } else if (type === 'end') {
            const end = startOfDay(new Date(value));
            setEndDate(value);
            let start;
            if (isMonthly) {
                start = addDays(subMonths(end, numberOfDays), 1);
            } else {
                start = subDays(end, (numberOfDays - 1) * daysDelta);
            }
            setStartDate(formatDateToISO(start));
        } else if (type === 'start') {
            const start = startOfDay(new Date(value));
            setStartDate(value);
            let end;
            if (isMonthly) {
                end = subDays(addMonths(start, numberOfDays), 1);
            } else {
                end = addDays(start, (numberOfDays - 1) * daysDelta);
            }
            setEndDate(formatDateToISO(end));
        }
    }, [endDate, numberOfDays]);

    const handleAcknowledge = async () => {
        setIsLoading(true);
        let done = 0;
        try {
            const startDateObj = startOfDay(tapas.startDate.toDate());
            const endDateObj = tapas.duration > 0 ? addDays(startDateObj, tapas.duration - 1) : null;

            let unitsToAcknowledge = [];
            const currentRefDate = getTapasDay(new Date(startDate), tapas, startDateObj);

            //for (let i = numberOfDays - 1; i >= 2; i--) {
            for (let i = 0; i < numberOfDays; i++) {
                let dateToAcknowledge;
                if (isMonthly) {
                    dateToAcknowledge = startOfDay(addMonths(currentRefDate, i));
                } else {
                    dateToAcknowledge = startOfDay(addDays(currentRefDate, i * daysDelta));
                }

                // Ensure the date is within the tapas duration
                if (isBefore(dateToAcknowledge, startDateObj) || (endDateObj && isAfter(dateToAcknowledge, endDateObj))) {
                    continue; // Skip if outside duration
                }

                if (!isTapasDateChecked(tapas.checkedDays, dateToAcknowledge)) {
                    unitsToAcknowledge.push(Timestamp.fromDate(dateToAcknowledge));
                    done += 1;
                }
            }

            const updatedCheckedDays = getUniqueCheckedDays([...(tapas.checkedDays || []), ...unitsToAcknowledge]);

            const appId = typeof __app_id !== 'undefined' ? __app_id : 'default-app-id';
            const tapasRef = doc(db, `artifacts/${appId}/users/${userId}/tapas`, tapas.id);
            let update;
            if (status === 'recuperated') {
                const updatedRecuperatedDays = getUniqueCheckedDays([...(tapas.recuperatedDays || []), ...unitsToAcknowledge]);
                update = { checkedDays: updatedCheckedDays, recuperatedDays: updatedRecuperatedDays };
            } else if (status === 'advanced') {
                const updatedAdvancedDays = getUniqueCheckedDays([...(tapas.advancedDays || []), ...unitsToAcknowledge]);
                update = { checkedDays: updatedCheckedDays, advancedDays: updatedAdvancedDays };
            } else {
                update = { checkedDays: updatedCheckedDays };
            }

            if (isPersistentCacheEnabled) {
                updateDoc(tapasRef, update);
            } else {
                await updateDoc(tapasRef, update);
            }

            setSelectedTapas(prev => ({ ...prev, ...update }));
            onClose(`${t('acknowledgedSuccessfully')} ${done} ${deltaName}.`);
        } catch (e) {
            console.error("Error acknowledging tapas: ", e);
            alert("Failed to acknowledge tapas.");
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white text-gray-800 dark:bg-gray-800 dark:text-gray-100 p-6 rounded-lg shadow-lg w-full max-w-md">
                <h2 className="text-xl capitalize font-bold mb-4">{t('acknowledgeN', deltaName)}</h2>
                <div className="flex flex-col gap-4">
                    <div className="flex gap-2 items-center">
                        <label className="w-1/3">{t('startDate')}:</label>
                        <input type="date" value={startDate} onChange={(e) => calculateDates('start', e.target.value)} className="flex-1 p-2 dark:bg-gray-700 border rounded" />
                    </div>
                    <div className="flex gap-2 items-center">
                        <label className="w-1/3">{t('endDate')}:</label>
                        <input type="date" value={endDate} onChange={(e) => calculateDates('end', e.target.value)} className="flex-1 p-2 dark:bg-gray-700 border rounded" />
                    </div>
                    <div className="flex gap-2 items-center">
                        <label className="w-1/3">{t('numberOf')} {deltaName}:</label>
                        <input type="number" value={numberOfDays} min="1" onChange={(e) => calculateDates('days', e.target.value)} className="flex-1 p-2 dark:bg-gray-700 border rounded" />
                    </div>
                    <div className="flex gap-2 items-center">
                        <label className="w-1/3">Status:</label>
                        <select value={status} onChange={(e) => setStatus(e.target.value)} className="flex-1 p-2 dark:bg-gray-700 border rounded">
                            <option value="">-</option>
                            {tapas.allowRecuperation && (
                                <option value="recuperated">{t('recuperated')}</option>
                            )}
                            <option value="advanced">{t('advanced')}</option>
                        </select>
                    </div>
                </div>
                <div className="flex justify-end gap-2 mt-6">
                    <button onClick={() => onClose('')} className="px-4 py-2 bg-gray-300 dark:bg-gray-600 hover:bg-gray-500 rounded">{t('cancel')}</button>
                    <button onClick={handleAcknowledge} disabled={isLoading} className="capitalize px-4 py-2 bg-indigo-600 text-white rounded hover:bg-indigo-700 disabled:bg-indigo-400">
                        {isLoading ? '...' : t('acknowledgeN', '')}
                    </button>
                </div>
            </div>
        </div>
    );
};

const EditResultModal = ({ onClose, db, userId, t, allTapas, tapasId, result, myAddDoc, myUpdateDoc, myDeleteDoc,
        setSelectedTapas, setMessage, setInitMessage=null, onResultAdded=null }) => {
    const isNew = result === null;
    const [content, setContent] = useState(result ? result.content : '');
    const [isLoading, setIsLoading] = useState(false);

    const resultsColRef = collection(db, 'artifacts', __app_id, 'users', userId, 'tapas', tapasId, 'results');

    const addResultsInfo = async (value) => {
        const tapas = Array.isArray(allTapas) ? allTapas.find(x => x.id == tapasId) : allTapas;
        if (typeof tapas.results !== 'number') {
            tapas.results = 0;
        }
        tapas.results += value;
        await handleClearOldResults(db, __app_id, userId, tapas.id, tapas.results, myUpdateDoc, setSelectedTapas, setMessage, setInitMessage);
    };

    const onAddNew = async (newContent, date, changedDate) => {
        try {
            await myAddDoc(resultsColRef, {
                content: newContent,
                date: date,
                changedDate: changedDate,
            });
            await addResultsInfo(1);
            setMessage(t('resultAdded'));
        } catch (e) {
            console.error("Error adding document: ", e);
            setMessage("Failed to add new result.");
        }
    };

    const onUpdate = async (resultId, newContent, newDate) => {
        try {
            const resultRef = doc(resultsColRef, resultId);
            await myUpdateDoc(resultRef, {
                content: newContent,
                changedDate: newDate,
            });
            setMessage(t('resultUpdated'));
        } catch (e) {
            console.error("Error updating result: ", e);
            setMessage("Failed to update result.");
        }
    };

    const onDelete = async (resultId) => {
        try {
            const resultRef = doc(resultsColRef, resultId);
            await myDeleteDoc(resultRef);
            await addResultsInfo(-1);
            setMessage(t('resultDeleted'));
        } catch (e) {
            console.error("Error deleting result: ", e);
            setMessage("Failed to delete result.");
        }
    };

    const handleAddNew = async () => {
        setIsLoading(true);
        try {
            const newDate = Timestamp.fromDate(new Date());
            await onAddNew(content, newDate, null);
            onClose();
        } catch (e) {
            console.error("Error adding result: ", e);
            alert("Failed to add result.");
        } finally {
            setIsLoading(false);
        }
    };

    const handleUpdate = async () => {
        setIsLoading(true);
        try {
            const newDate = Timestamp.fromDate(new Date());
            if (result.id === null) {
                await onAddNew(content, null, newDate);
                if (onResultAdded) {
                    onResultAdded();
                }
            } else {
                await onUpdate(result.id, content, newDate);
            }
            result.content = content;
            result.changedDate = newDate;
            onClose();
        } catch (e) {
            console.error("Error updating result: ", e);
            alert("Failed to update result.");
        } finally {
            setIsLoading(false);
        }
    };

    const handleDelete = async () => {
        setIsLoading(true);
        try {
            await onDelete(result.id);
            if (onResultAdded) {
                onResultAdded();
            }
            onClose();
        } catch (e) {
            console.error("Error deleting result: ", e);
            alert("Failed to delete result.");
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 flex mdh:items-center items-start justify-center p-4 z-50">
            <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-lg w-full max-w-md flex flex-col h-screen-70% mdh:h-screen-50%">
                <h2 className="text-xl font-bold mb-4">{t((isNew ? 'add' : 'update') + 'Results')} </h2>
                <div
                    className="gap-4"
                    style={{flex: '1 1 auto'}}
                >
                    <textarea
                        value={content}
                        maxLength="4000"
                        onChange={(e) => setContent(e.target.value)}
                        className="w-full p-2 border rounded-md resize-none"
                        style={{height: '100%'}}
                    />
                </div>
                <div className="flex flex-wrap justify-between gap-2 mt-6">
                    {!isNew && (
                        <button onClick={handleDelete} disabled={isLoading} className="capitalize px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 disabled:bg-red-400">
                            {t('deleteX', '') + (isLoading ? '...' : '')}
                        </button>)
                    }
                    <button onClick={onClose} className="px-4 py-2 bg-gray-300 text-gray-700 hover:bg-gray-400 rounded">{t('cancel')}</button>
                    {isNew ? (
                        <button onClick={handleAddNew} disabled={isLoading || !content} className="px-4 py-2 bg-indigo-600 text-white rounded hover:bg-indigo-700 disabled:bg-indigo-400">
                            {t('add') + (isLoading ? '...' : '')}
                        </button>
                    ) : (
                        <button onClick={handleUpdate} disabled={isLoading || !content} className="capitalize px-4 py-2 bg-indigo-600 text-white rounded hover:bg-indigo-700 disabled:bg-indigo-400">
                            {t('updateX', '') + (isLoading ? '...' : '')}
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
};

const ResultHistoryView = ({ tapas, endDate, db, userId, t, modalState, setTapasDetailMessage,
        myAddDoc, myUpdateDoc, myDeleteDoc, setDetailResults, setSelectedTapas, setInitMessage }) => {
    const [results, setResults] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [selectedResult, setSelectedResult] = useState(null);
    const [showPreview, setShowPreview] = useState(true);
    const editResultModal = modalState.getModalProps("editResult");

    const resultsColRef = tapas ? collection(db, 'artifacts', __app_id, 'users', userId, 'tapas', tapas.id, 'results') : null;
    const sortedResults = [...results].sort((a, b) => (a.date ? a.date.toMillis() : 0) - (b.date ? b.date.toMillis() : 0));
    const showDates = sortedResults.length > 1 || (sortedResults.length==1 && sortedResults[0].date && endDate && isBefore(startOfDay(sortedResults[0].date.toDate()), endDate));

    useEffect(() => {
        if (!resultsColRef) return;
        setIsLoading(true);
        if (typeof tapas.results !== 'number' && tapas.results) {
            const res = [{ id: null, content: tapas.results, date: null , changedDate: null }];
            setResults(res);
            setDetailResults(res);
            setIsLoading(false);
        } else {
            const unsub = onSnapshot(query(resultsColRef, orderBy('date')), (snapshot) => {
                const resultsData = snapshot.docs.map(doc => ({
                    id: doc.id,
                    ...doc.data(),
                }));

                const sortedWithFallback = resultsData.sort((a, b) => {
                    const dateA = a.date ? a.date.toMillis() : 0;
                    const dateB = b.date ? b.date.toMillis() : 0;
                    return dateA - dateB;
                });

                setResults(sortedWithFallback);
                setDetailResults(sortedWithFallback);
                if (tapas.results !== sortedWithFallback.length) {
                    tapas.results = sortedWithFallback.length;
                    handleClearOldResults(db, __app_id, userId, tapas.id, tapas.results, myUpdateDoc, setSelectedTapas, setTapasDetailMessage, setInitMessage);
                }
                setIsLoading(false);
            }, (error) => {
                console.error("Error getting results: ", error);
                setIsLoading(false);
                setTapasDetailMessage("Failed to load results.");
            });

            return () => unsub();
        }
    }, []);

    useEffect(() => {
        if (!showPreview) {
            const resultsDiv = document.getElementById('results');
            resultsDiv.scrollTop = resultsDiv.scrollHeight;
        }
    }, [showPreview]);

    const previewRes = sortedResults && sortedResults.length > 0 ? sortedResults[sortedResults.length - 1] : null;
    const hasPreview = previewRes && (sortedResults.length > 1 || previewRes.content.length > 120);

    return (
        <div className="flex-1 flex flex-col overflow-hidden">
            {/* Historical Results Timeline */}
            <div className="flex-1 rounded-lg bg-white dark:bg-gray-800 shadow-sm">
                <div className="flex justify-between space-x-2">
                <div className="flex">
                    <h3 className="text-m font-bold text-gray-700 dark:text-gray-300">{t('results')}:</h3>
                    {hasPreview && (
                        <button
                            onClick={() => {setShowPreview(!showPreview);}}
                            className="text-black dark:text-white hover:text-gray-500 px-2 py-1 ml-2 my-1 rounded text-xs font-medium"
                        >
                            {showPreview ? '▶' : '▼'}
                        </button>
                    )}
                </div>
                <button
                    onClick={() => {
                        setSelectedResult(null);
                        editResultModal.open();
                    }}
                    className="bg-green-600 hover:bg-green-700 text-white px-2 py-1 my-1 rounded text-xs font-medium"
                >
                    +
                </button>
                </div>
                {isLoading ? (
                    <div className="text-gray-500 dark:text-gray-400">{t('loadingX', t('results'))}...</div>
                ) : (
                    <div className="space-y-2">
                        {sortedResults.length === 0 ? (
                            <div className="italic text-gray-500 dark:text-gray-400">{t('noResultsDefinedYet')}</div>
                        ) : (
                            hasPreview && showPreview ? (
                                <div
                                    className="relative px-4 py-2 rounded-lg bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 cursor-pointer transition-colors duration-200"
                                    onClick={() => {setShowPreview(false);}}
                                >
                                    {showDates && (
                                        <span className="absolute top-2 left-2 text-xs font-mono text-gray-600 dark:text-gray-400">
                                            {previewRes.date ? previewRes.date.toDate().toLocaleDateString() : t('noDate')}{previewRes.changedDate ? ' (' + t('edited') + ')' : ''}
                                        </span>
                                    )}
                                    <div className={`${showDates ? 'mt-4' : ''}`}>
                                        <p>{previewRes.content.slice(0,120)}...</p>
                                    </div>
                                </div>
                            ) : (
                            <div className="max-h-half overflow-y-auto" id="results">
                                {sortedResults.map((res, index) => (
                                    <div
                                        key={res.id}
                                        className="relative px-4 py-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-950 hover:bg-gray-100 dark:hover:bg-gray-900 cursor-pointer transition-colors duration-200"
                                        onClick={() => {
                                            setSelectedResult(res);
                                            editResultModal.open();
                                        }}
                                    >
                                        {showDates && (
                                            <span className="absolute top-2 left-2 text-xs font-mono text-gray-600 dark:text-gray-400">
                                                {res.date ? res.date.toDate().toLocaleDateString() : t('noDate')}{res.changedDate ? ' (' + t('edited') + ')' : ''}
                                            </span>
                                        )}
                                        <div className={`${showDates ? 'mt-4' : ''}`}>
                                            <p className="whitespace-pre-wrap">{res.content}</p>
                                        </div>
                                    </div>
                                ))}
                            </div>
                            )
                        )}
                    </div>
                )}
            </div>
            {editResultModal.isOpen && (
                <EditResultModal
                    onClose={editResultModal.close}
                    db={db}
                    t={t}
                    userId={userId}
                    allTapas={tapas}
                    tapasId={tapas.id}
                    result={selectedResult}
                    setSelectedTapas={setSelectedTapas}
                    setMessage={setTapasDetailMessage}
                    setInitMessage={setInitMessage}
                    myAddDoc={myAddDoc}
                    myUpdateDoc={myUpdateDoc}
                    myDeleteDoc={myDeleteDoc}
                />
            )}
        </div>
    );
};

// Component for a custom confirmation dialog
const ConfirmDialog = ({ t, message, onConfirm, onCancel, confirmText="", cancelText="" }) => {
    if (!confirmText) {
        confirmText = t('yes');
    }

    if (!cancelText) {
        cancelText = t('cancel');
    }

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

// Helper to get the start of the week (Monday) in UTC from a local date
const getStartOfWeekUTC = (date) => {
    return startOfWeek(date, { weekStartsOn: 1 });
};

const getStartOfIntervalUTC = (date, tapas) => {
    const startDate = startOfDay(tapas.startDate.toDate());
    const daysDiff = differenceInCalendarDays(startOfDay(date), startDate);
    const intervals = Math.ceil(daysDiff / tapas.scheduleInterval);
    return startOfDay(addDays(startDate, intervals * tapas.scheduleInterval));
};

const getTapasWeekDiff = (startDateObj) => {
    const startOfW = getStartOfWeekUTC(startDateObj);
    const daysIntoWeek = differenceInCalendarDays(startDateObj, startOfW);
    return daysIntoWeek;
};

const getTapasMonthDiff = getDate;

const getTapasWeekDayUTC = (date, deltaDays) => {
    return addDays(getStartOfWeekUTC(date), deltaDays);
};

const getTapasIntervalDayUTC = (date, tapas) => {
    const startOfInterval = getStartOfIntervalUTC(date, tapas);
    return addDays(startOfInterval, tapas.scheduleInterval);
};

const getTapasDay = (date, tapas, startDateObj) => {
    if (!startDateObj) {
        startDateObj = startOfDay(tapas.startDate.toDate());
    }

    let tapasDate;
    if (isWeeklyTapasType(tapas)) {
        const deltaDays = getTapasWeekDiff(startDateObj);
        tapasDate = getTapasWeekDayUTC(date, deltaDays);
    } else if (isMonthlyTapasType(tapas)) {
        const startDayNum = getTapasMonthDiff(startDateObj);
        const dayNum = getTapasMonthDiff(date);
        if (dayNum < startDayNum) {
            tapasDate = subMonths(date, 1);
        } else {
            tapasDate = date;
        }
        const monthDays = getDaysInMonth(tapasDate);
        if (monthDays < startDayNum) {
            startDayNum = monthDays;
        }
        tapasDate = setDate(tapasDate, startDayNum);
    } else if (isIntervalTapasType(tapas)) {
        //tapasDate = getTapasIntervalDayUTC(date, tapas);
        tapasDate = getStartOfIntervalUTC(date, tapas);
    } else {
        tapasDate = startOfDay(date);
    }
    return tapasDate;
};

const getDateWeek = (dateIn) => {
    const date = (typeof dateIn === 'object') ? new Date(dateIn.getTime()) : new Date();
    return getISOWeek(date);
};

// Helper to format date objects toYYYY-MM-DD strings for comparison
const formatDateToISO = (date) => format(date, 'yyyy-MM-dd');

const formatDateNoTimeToISO = (date) => {
    return formatDateToISO(startOfDay(date));
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
            if (!isBefore(dateObj, fromDate)) { // dateObj >= fromDate
                cnt++;
            }
        });
    }
    return cnt;
};

const getLastDate = (daysArray) => {
    let lastDate = daysArray[0];
    daysArray.forEach(timestamp => {
        if (timestamp > lastDate) {
            lastDate = timestamp;
        }
    });
    return lastDate;
};

// Helper to get unique checked days, handling potential duplicates and various date types
const getUniqueCheckedDays = (checkedDaysArray) => {
    if (!checkedDaysArray || checkedDaysArray.length === 0) {
        return [];
    }
    return checkedDaysArray;
    const uniqueDateStrings = new Set();
    const uniqueTimestamps = [];

    checkedDaysArray.forEach(timestamp => {
        const dateObj = timestampToDate(timestamp);
        // Normalize to UTC start of day for comparison and storage
        const utcStartOfDay = startOfDay(dateObj);
        const dateString = formatDateToISO(utcStartOfDay);

        if (!uniqueDateStrings.has(dateString)) {
            uniqueDateStrings.add(dateString);
            uniqueTimestamps.push(Timestamp.fromDate(utcStartOfDay));
        }
    });
    return uniqueTimestamps;
};


const getTotalUnits = (unit) => {
    let value;
    if (unit === 'weeks' || isWeeklyTapas(unit)) {
        value = 7;
    } else {
        value = 1;
    }
    return value;
};

const getTapasEndDate = (startDate, duration, scheduleType, scheduleInterval) => {
    const start = startOfDay(startDate);
    let end = start;
    if (isMonthlyTapas(scheduleType)) {
        if (!isLastDayOfMonth(start)) {
            end = subDays(start, 1);
        }
        end = addMonths(end, duration);
    } else {
        const actualDays = duration * getScheduleFactor(scheduleType, scheduleInterval);
        end = addDays(start, actualDays-1);
    }
    return end;
};

const getTapasDurationInDays = (startDate, duration, scheduleType, scheduleInterval) => {
    let durationDays;
    if (isMonthlyTapas(scheduleType)) {
        const end = getTapasEndDate(startDate, duration, scheduleType, scheduleInterval);
        durationDays = differenceInCalendarDays(end, startDate) + 1;
    } else {
        durationDays = duration * getScheduleFactor(scheduleType, scheduleInterval);
    }
    return durationDays;
};

const getTapasDurationByType = (startDate, endDate, scheduleType, scheduleInterval) => {
    const start = startOfDay(startDate);
    const end = startOfDay(endDate);
    let duration;
    if (isMonthlyTapas(scheduleType)) {
        duration = Math.max(1, differenceInMonths(addDays(end, 15), start));
    } else {
        const durationDays = differenceInCalendarDays(end, start) + 1;
        duration = Math.ceil(durationDays / getScheduleFactor(scheduleType, scheduleInterval));
    }
    return duration;
};

const getTypeUnitNoInterval = (tapas) => getByTapasIntervalType(tapas, 'months', 'weeks', 'days', 'days');
const getTypeUnit = (tapas) => getByTapasIntervalType(tapas, 'months', 'weeks', 'days', 'intervals');

const getScheduleFactor = (unit, scheduleInterval) => {
    let value;
    if (unit === 'weeks' || isWeeklyTapas(unit)) {
        value = 7;
    } else if (isIntervalTapas(unit)) {
        value = scheduleInterval;
    } else {
        value = 1;
    }
    return value;
};

const isTapasDateChecked = (checkedDays, date) => {
    // Ensure checkedDays are unique for accurate check
    const uniqueDays = getUniqueCheckedDays(checkedDays);
    const targetDateStr = formatDateToISO(date);
    
    return uniqueDays.some(timestamp => {
        return formatDateToISO(timestamp.toDate()) === targetDateStr;
    });
};

// Component for adding/editing a Tapas
const TapasForm = ({ onTapasAddedUpdatedCancel, editingTapas, modalState, myAddDoc, myUpdateDoc }) => {
    const { db, userId, t, locale } = useContext(AppContext);

    const [tapasMultiLanguageData, setTapasMultiLanguageData] = useState({}); // Stores { lang: { name, description, goals, parts } }
    const [tapasDataInitialized, setTapasDataInitialized] = useState(false);
    const [currentFormLanguage, setCurrentFormLanguage] = useState(locale); // Language currently being edited in the form
    const [availableFormLanguages, setAvailableFormLanguages] = useState([locale]); // Languages for which data exists in the form
    const [otherLanguages, setOtherLanguages] = useState({}); // Stores custom language codes and names { 'br': 'Brasilian' }

    const firstRef = useRef(null); // Ref for the first input field
    const formContainerRef = useRef(null); // Ref for the form's main container
    const addLanguageDropdownRef = useRef(null); // Ref for the add language dropdown

    const [startDate, setStartDate] = useState('');
    const [startTime, setStartTime] = useState('');
    const [duration, setDuration] = useState('');
    const [endDate, setEndDate] = useState(''); // New state for end date
    const [crystallizationTime, setCrystallizationTime] = useState('');
    const [errorMessage, setErrorMessage] = useState('');
    const [successMessage, setSuccessMessage] = useState('');
    const [allowRecuperation, setAllowRecuperation] = useState(false); // New state for recuperation
    const [scheduleType, setScheduleType] = useState('daily'); // 'daily', 'weekly', 'everyNthDays', 'noTapas'
    const [scheduleInterval, setScheduleInterval] = useState(''); // For 'everyNthDays'
    const [acknowledgeAfter, setAcknowledgeAfter] = useState(false); // New state for acknowledgeAfter
    const [showAddLanguageDropdown, setShowAddLanguageDropdown] = useState(false); // State for showing language selector dropdown
    const [newLangCodeInput, setNewLangCodeInput] = useState('');
    const [newLangNameInput, setNewLangNameInput] = useState('');
    const otherLanguageModal = modalState.getModalProps("otherLanguage");

    // Effect to set form fields when editingTapas prop changes
    useEffect(() => {
        setErrorMessage('');
        setSuccessMessage('');

        if (editingTapas) {
            // Use requestAnimationFrame to ensure focus and scroll happen after browser layout
            requestAnimationFrame(() => {
                if (firstRef.current) {
                    firstRef.current.focus();
                }
            });

            // Load multi-language data
            const initialMultiLangData = {};
            const initialLangs = new Set();

            // Populate initialMultiLangData with existing translations
            // Handle legacy string data for name, description, goals, parts
            if (typeof editingTapas.name === 'string') {
                initialMultiLangData[locale] = {
                    name: editingTapas.name,
                    description: editingTapas.description || '',
                    goals: (Array.isArray(editingTapas.goals) ? editingTapas.goals : []).join('\n'),
                    parts: (Array.isArray(editingTapas.parts) ? editingTapas.parts : []).join('\n'),
                };
                initialLangs.add(locale);
            } else if (typeof editingTapas.name === 'object' && editingTapas.name !== null) {
                Object.keys(editingTapas.name).forEach(lang => {
                    initialMultiLangData[lang] = {
                        name: editingTapas.name[lang] || '',
                        description: editingTapas.description?.[lang] || '',
                        goals: (editingTapas.goals?.[lang] || []).join('\n'),
                        parts: (editingTapas.parts?.[lang] || []).join('\n'),
                    };
                    initialLangs.add(lang);
                });
            } else {
                initialMultiLangData[locale] = { name: '', description: '', goals: '', parts: '' };
                initialLangs.add(locale);
            }

            setTapasMultiLanguageData(initialMultiLangData);
            setAvailableFormLanguages(Array.from(initialLangs));
            setCurrentFormLanguage(locale); // Set current editing language to user's locale

            // Load otherLanguages from editingTapas.languages
            setOtherLanguages(editingTapas.languages || {});

            setStartDate(editingTapas.startDate ? formatDateToISO(editingTapas.startDate.toDate()) : '');
            setStartTime(editingTapas.startTime || '');
            
            setCrystallizationTime(editingTapas.crystallizationTime || '');
            setAllowRecuperation(editingTapas.allowRecuperation || false);
            setScheduleInterval(editingTapas.scheduleInterval || '');
            setAcknowledgeAfter(editingTapas.acknowledgeAfter || false);

            // Calculate endDate from startDate and loadedDuration, ensuring validity
            const loadedScheduleType = editingTapas.scheduleType || 'daily';
            setScheduleType(loadedScheduleType);
            const loadedDuration = editingTapas.duration || '';
            if (editingTapas.startDate && loadedDuration && !isNaN(parseInt(loadedDuration)) && parseInt(loadedDuration) > 0) {
                const start = startOfDay(editingTapas.startDate.toDate());
                const end = addDays(start, parseInt(loadedDuration) - 1);
                const duration = getTapasDurationByType(start, end, loadedScheduleType, editingTapas.scheduleInterval);
                setEndDate(formatDateToISO(end));
                setDuration(duration);
            } else {
                setEndDate('');
                setDuration('');
            }
            setTapasDataInitialized(true);
        } else {
            // Reset form for new tapas
            setTapasMultiLanguageData({
                [locale]: { name: '', description: '', goals: '', parts: '' }
            });
            setAvailableFormLanguages([locale]);
            setCurrentFormLanguage(locale);
            setOtherLanguages({}); // Reset custom languages

            setStartDate('');
            setStartTime('');
            setDuration('');
            setEndDate('');
            setCrystallizationTime('');
            setAllowRecuperation(false);
            setScheduleType('daily');
            setScheduleInterval('');
            setAcknowledgeAfter(false);
        }
    }, [editingTapas, locale]);

    // Effect to close dropdown when clicking outside
    useEffect(() => {
        const handleClickOutside = (event) => {
            if (addLanguageDropdownRef.current && !addLanguageDropdownRef.current.contains(event.target)) {
                setShowAddLanguageDropdown(false);
            }
        };

        if (showAddLanguageDropdown) {
            document.addEventListener('mousedown', handleClickOutside);
        } else {
            document.removeEventListener('mousedown', handleClickOutside);
        }

        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, [showAddLanguageDropdown]);


    // Effect to synchronize duration and endDate when startDate changes
    useEffect(() => {
        if (isNoTapas(scheduleType)) {
            setScheduleInterval('');
            setAllowRecuperation(false);
            setAcknowledgeAfter(false);
        }

        if (startDate) {
            if (duration && !isNaN(parseInt(duration)) && parseInt(duration) > 0) {
                // If duration is already set, recalculate endDate
                const end = getTapasEndDate(startDate, parseInt(duration), scheduleType, scheduleInterval);
                setEndDate(formatDateToISO(end));
            } else if (endDate) {
                // If endDate is already set, recalculate duration
                const start = startOfDay(startDate);
                const end = startOfDay(endDate);
                if (!isBefore(end, start)) { // end >= start
                    const diff = getTapasDurationByType(start, end, scheduleType, scheduleInterval);
                    setDuration(diff.toString());
                } else {
                    setDuration(1); // Invalid end date relative to start
                }
            }
        } else {
            // If startDate is cleared, clear only endDate, keep duration
            setEndDate('');
        }
    }, [startDate, scheduleType, scheduleInterval, duration, endDate]);


    const handleChangeDuration = (e) => {
        const newDuration = e.target.value;
        setDuration(newDuration);
    };

    const handleChangeInterval = (e) => {
        const newInterval = e.target.value;
        setScheduleInterval(newInterval);
    };

    const handleChangeEndDate = (e) => {
        const newEndDate = e.target.value;
        setDuration('');
        setEndDate(newEndDate);
    };

    const handleSetDurationFromButton = (value, scheduleType) => {
        setDuration(value.toString()); // Set duration state as weeks or days for display
    };

    const handleDescriptionChange = (editorState, editor) => {
        // This is called by Lexical's OnChangePlugin
        editorState.read(() => {
            const root = editor.getEditorState()._nodeMap.get('root');
            const isEmpty = root.getChildrenSize() === 1 && root.getFirstChild().isEmpty();
            const htmlContent = isEmpty ? '' : $generateHtmlFromNodes(editor);

            setTapasMultiLanguageData(prev => ({
                ...prev,
                [currentFormLanguage]: {
                    ...prev[currentFormLanguage],
                    description: htmlContent
                }
            }));
        });
    };

    const handleMultiLanguageInputChange = (field, value) => {
        setTapasMultiLanguageData(prev => ({
            ...prev,
            [currentFormLanguage]: {
                ...prev[currentFormLanguage],
                [field]: value
            }
        }));
    };

    const handleAddLanguage = (selectedLang) => {
        if (!availableFormLanguages.includes(selectedLang)) {
            setAvailableFormLanguages(prev => [...prev, selectedLang]);
            // Prefill with current language content if available, otherwise empty
            const defaultContent = tapasMultiLanguageData[currentFormLanguage] || { name: '', description: '', goals: '', parts: '' };
            setTapasMultiLanguageData(prev => ({
                ...prev,
                [selectedLang]: { ...defaultContent }
            }));
            setCurrentFormLanguage(selectedLang);
        }
        setShowAddLanguageDropdown(false); // Hide dropdown after adding
    };

    const handleAddNewCustomLanguage = () => {
        const langName = newLangNameInput.trim();
        if (!langName) {
            setErrorMessage(t('languageNameRequired'));
            return;
        }

        let newCode = newLangCodeInput.trim().toLowerCase();
        if (!newCode) {
            newCode = langName.substring(0, 2).toLowerCase();
        }

        if (availableFormLanguages.includes(newCode.toLowerCase()) || translations[newCode.toLowerCase()]) {
            setErrorMessage(t('languageCodeAlreadyExists'));
            return;
        }

        setAvailableFormLanguages(prev => [...prev, newCode]);
        setOtherLanguages(prev => ({ ...prev, [newCode]: langName }));

        const defaultContent = tapasMultiLanguageData[currentFormLanguage] || { name: '', description: '', goals: '', parts: '' };
        setTapasMultiLanguageData(prev => ({
            ...prev,
            [newCode]: { ...defaultContent }
        }));
        setCurrentFormLanguage(newCode);

        setNewLangCodeInput('');
        setNewLangNameInput('');
        otherLanguageModal.close();
        setShowAddLanguageDropdown(false); // Close main dropdown
        setErrorMessage('');
    };

    const handleDeleteLanguage = (langToDelete) => {
        if (availableFormLanguages.length <= 1) {
            setErrorMessage(t('cannotDeleteLastLanguage'));
            return;
        }

        setAvailableFormLanguages(prev => prev.filter(lang => lang !== langToDelete));
        setTapasMultiLanguageData(prev => {
            const newTapasData = { ...prev };
            delete newTapasData[langToDelete];
            return newTapasData;
        });
        setOtherLanguages(prev => {
            const newOtherLangs = { ...prev };
            delete newOtherLangs[langToDelete];
            return newOtherLangs;
        });

        if (currentFormLanguage === langToDelete) {
            // Switch to the first available language after deletion
            setCurrentFormLanguage(availableFormLanguages.filter(lang => lang !== langToDelete)[0]);
        }
        setErrorMessage('');
    };


    const currentTapasDataForForm = tapasMultiLanguageData[currentFormLanguage] || { name: '', description: '', goals: '', parts: '' };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setErrorMessage('');
        setSuccessMessage('');

        // Validate at least one language has a name
        const hasNameInAllLanguages = Object.values(tapasMultiLanguageData).every(langData => langData.name.trim() !== '');
        if (!hasNameInAllLanguages) {
            setErrorMessage(t('nameRequiredInAllLanguages'));
            return;
        }

        // Use the name of the current locale for the main validation
        const currentLocaleName = tapasMultiLanguageData[locale]?.name || '';

        if (!isNoTapas(scheduleType)) {
            if (!currentLocaleName || !startDate || !duration) { // Duration is the source of truth for calculation
                setErrorMessage(t('nameStartDateDurationRequired'));
                return;
            }

            if (isNaN(parseInt(duration)) || parseInt(duration) <= 0) {
                setErrorMessage(t('durationPositiveNumber'));
                return;
            }

            if (isIntervalTapas(scheduleType) && (isNaN(parseInt(scheduleInterval)) || parseInt(scheduleInterval) <= 0)) {
                setErrorMessage(t('scheduleInterval') + ' ' + t('mustBePositiveNumber'));
                return;
            }
        } else if (!currentLocaleName || !startDate) {
            setErrorMessage(t('nameStartDateRequired'));
            return;
        }

        const durationToSave = !duration ? 0 : getTapasDurationInDays(startDate, parseInt(duration), scheduleType, scheduleInterval);

        // Prepare multi-language data for saving
        let names = {};
        let descriptions = {};
        let goals = {};
        let parts = {};
        Object.keys(tapasMultiLanguageData).forEach(lang => {
            const data = tapasMultiLanguageData[lang];
            if (data.name) names[lang] = data.name;
            if (data.description) descriptions[lang] = data.description;
            if (data.goals) goals[lang] = data.goals.split('\n').filter(g => g.trim() !== '');
            if (data.parts) parts[lang] = data.parts.split('\n').filter(p => p.trim() !== '');
        });
        if (Object.keys(tapasMultiLanguageData).length === 1) {
            // Single language store only data
            const lang = Object.keys(tapasMultiLanguageData)[0];
            if (names) names = names[lang];
            if (descriptions) descriptions = descriptions[lang] || null;
            if (goals) goals = goals[lang] || [];
            if (parts) parts = parts[lang] || [];
        }

        const appId = typeof __app_id !== 'undefined' ? __app_id : 'default-app-id';
        const tapasData = {
            name: names, // Multi-language object
            startDate: new Date(startDate),
            startTime: isNoTapas(scheduleType) ? null : startTime || null,
            duration: durationToSave,
            description: descriptions, // Multi-language object
            goals: goals, // Multi-language object
            parts: parts, // Multi-language object
            crystallizationTime: crystallizationTime ? parseInt(crystallizationTime) : null,
            allowRecuperation: isNoTapas(scheduleType) ? false : allowRecuperation, // Include new field
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
            scheduleType: scheduleType,
            scheduleInterval: isIntervalTapas(scheduleType) ? parseInt(scheduleInterval) : null,
            acknowledgeAfter: isNoTapas(scheduleType) ? false : acknowledgeAfter,
            languages: otherLanguages, // Store custom languages
            version: editingTapas ? (editingTapas.version || 1) + 1 : 1, // Increment version on update, start at 1 for new
        };

        try {
            if (editingTapas) {
                const tapasRef = doc(db, `artifacts/${appId}/users/${userId}/tapas`, editingTapas.id);
                await myUpdateDoc(tapasRef, tapasData);
                setSuccessMessage(t('tapasUpdatedSuccessfully'));
            } else {
                await myAddDoc(collection(db, `artifacts/${appId}/users/${userId}/tapas`), tapasData);
                setSuccessMessage(t('tapasAddedSuccessfully'));
                // Clear form after successful addition
                setTapasMultiLanguageData({
                    [locale]: { name: '', description: '', goals: '', parts: '' }
                });
                setAvailableFormLanguages([locale]);
                setCurrentFormLanguage(locale);
                setOtherLanguages({}); // Reset custom languages
                setStartDate('');
                setStartTime('');
                setDuration('');
                setEndDate('');
                setCrystallizationTime('');
                setAllowRecuperation(false);
                setScheduleType('daily');
                setScheduleInterval('');
                setAcknowledgeAfter(false);
            }
            tapasData.startDate = Timestamp.fromDate(tapasData.startDate);
            onTapasAddedUpdatedCancel(tapasData); // Trigger refresh in parent component
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

    // Available languages for the selector (excluding already added ones and custom ones)
    const allKnownLanguages = { ...translations, ...otherLanguages };
    const languagesToAdd = Object.keys(allKnownLanguages).filter(lang => !availableFormLanguages.includes(lang));
    const scheduleUnit = getTypeUnit(scheduleType);

    const fixedCounts = isMonthlyTapas(scheduleType) ? [3, 7, 12] : [7, 21, 49];

    return (
        <div ref={formContainerRef} className="p-4 rounded-lg shadow-md mb-6 bg-white dark:bg-gray-800">
            <Tooltip id="my-tooltip" />
            <h2 className="text-2xl font-bold mb-4 text-gray-800 dark:text-gray-100 flex items-center">
                {editingTapas ? t('editTapasTitle') : t('addEditTapas')}
                <div className="relative ml-4" ref={addLanguageDropdownRef}>
                    <button
                        onClick={() => setShowAddLanguageDropdown(!showAddLanguageDropdown)}
                        className="ml-2 bg-blue-500 text-white px-3 py-1 rounded-md text-sm hover:bg-blue-600 transition-colors duration-200"
                    >
                        {t('addLanguage')}
                    </button>
                    {showAddLanguageDropdown && (
                        <div className="absolute left-0 mt-2 w-48 rounded-md shadow-lg text-sm bg-white dark:bg-gray-700 z-10">
                            {languagesToAdd.length > 0 ? (
                                languagesToAdd.map(lang => (
                                    <button
                                        key={lang}
                                        onClick={() => handleAddLanguage(lang)}
                                        className="block w-full text-left px-4 py-2 text-gray-800 dark:text-gray-100 hover:bg-gray-100 dark:hover:bg-gray-600"
                                    >
                                        {allKnownLanguages[lang].languageName || allKnownLanguages[lang]}
                                    </button>
                                ))
                            ) : (
                                <p className="px-4 py-2 text-gray-500 dark:text-gray-400">{t('allLanguagesAdded')}</p>
                            )}
                            <div className="border-t border-gray-200 dark:border-gray-600 my-1"></div>
                            <button
                                onClick={() => { otherLanguageModal.open(); setShowAddLanguageDropdown(false); }}
                                className="block w-full text-left px-4 py-2 text-gray-800 dark:text-gray-100 hover:bg-gray-100 dark:hover:bg-gray-600"
                            >
                                {t('otherLanguage')}...
                            </button>
                        </div>
                    )}
                </div>
            </h2>
            {errorMessage && <p className="text-red-600 mb-4 font-medium">{errorMessage}</p>}
            {successMessage && <p className="text-green-600 mb-4 font-medium">{successMessage}</p>}

            {/* Language Tabs */}
            {availableFormLanguages.length > 0 && (
                <div className="mb-4 border-b border-gray-200 dark:border-gray-700">
                    <nav className="-mb-px flex flex-wrap space-x-2" aria-label="Tabs">
                        {availableFormLanguages.map(lang => (
                            <div key={lang} className="flex items-center">
                                <button
                                    onClick={() => setCurrentFormLanguage(lang)}
                                    className={`whitespace-nowrap py-2 px-3 border-b-2 font-medium text-sm rounded-t-md ${
                                        currentFormLanguage === lang
                                            ? 'border-indigo-500 text-indigo-600 dark:text-indigo-400'
                                            : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-200 dark:hover:border-gray-500'
                                    }`}
                                >
                                    {translations[lang]?.languageName || otherLanguages[lang] || lang}
                                </button>
                                {availableFormLanguages.length > 1 && (
                                    <button
                                        onClick={() => handleDeleteLanguage(lang)}
                                        className="ml-1 text-red-500 hover:text-red-700 text-xs font-bold p-1 rounded-full hover:bg-gray-100 dark:hover:bg-gray-600"
                                        title={t('deleteLanguage')}
                                    >
                                        &times;
                                    </button>
                                )}
                            </div>
                        ))}
                    </nav>
                </div>
            )}

            <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="col-span-1">
                    <label htmlFor="name" className="block text-sm font-medium text-gray-700 dark:text-gray-300">{t('name')}</label>
                    <input
                        ref={firstRef}
                        type="text"
                        id="name"
                        maxLength="120"
                        value={currentTapasDataForForm.name}
                        onChange={(e) => handleMultiLanguageInputChange('name', e.target.value)}
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
                            <option value="monthly">{t('monthly')}</option>
                            <option value="everyNthDays">{t('everyNthDays', t('nth'))} {t('days')}</option>
                            <option value="noTapas">{t('noTapas')}</option>
                        </select>
                    </div>
                    {isIntervalTapas(scheduleType) && (
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
                {!isNoTapas(scheduleType) && (
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
                )}
                <div className="col-span-1">
                    <label htmlFor="duration" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                        {t('duration')} [{t(scheduleUnit)}]
                    </label>
                    <div className="flex items-center mt-1">
                        <input
                            type="number"
                            id="duration"
                            value={duration}
                            onChange={handleChangeDuration}
                            className="block w-full px-3 py-2 border rounded-l-md shadow-sm focus:outline-none focus:ring-indigo-500 bg-white border-gray-300 text-gray-900 dark:bg-gray-700 dark:border-gray-600 dark:text-gray-100 focus:border-indigo-500"
                            required={!isNoTapas(scheduleType)}
                            min="1"
                        />
                        {fixedCounts.map((count) => (
                            <button
                                key={count}
                                type="button"
                                onClick={() => handleSetDurationFromButton(count, scheduleType)}
                                className="px-3 py-2 bg-indigo-500 text-white hover:bg-indigo-600 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 transition-colors duration-200 last:rounded-r-md"
                            >
                                {count}
                            </button>))}
                    </div>
                </div>
                <div className="col-span-1">
                    <label htmlFor="endDate" className="block text-sm font-medium text-gray-700 dark:text-gray-300">{t('endDate')}</label>
                    <input
                        type="date"
                        id="endDate"
                        value={endDate}
                        onChange={handleChangeEndDate}
                        className="mt-1 block w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 bg-white border-gray-300 text-gray-900 dark:bg-gray-700 dark:border-gray-600 dark:text-gray-100 focus:border-indigo-500"
                    />
                </div>
                {!isNoTapas(scheduleType) && (
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
                        <span
                            className="infolink"
                            data-tooltip-id="my-tooltip"
                            data-tooltip-html={t('acknowledgeAfterInfo')}
                            >?
                        </span>
                    </div>
                )}
                <div className="col-span-full">
                    <label htmlFor="description" className="block text-sm font-medium text-gray-700 dark:text-gray-300">{t('descriptionAndGoal')} ({t('optional')})</label>
                    <RichTextEditor
                        key={`${currentFormLanguage}-${tapasDataInitialized}`} // Key to force remount on language change
                        initialContent={currentTapasDataForForm.description}
                        onEditorStateChange={handleDescriptionChange}
                    />
                </div>
                <div className="col-span-full">
                    <label htmlFor="goals" className="block text-sm font-medium text-gray-700 dark:text-gray-300">{t('goals0n')}</label>
                    <textarea
                        id="goals"
                        maxLength="1000"
                        value={currentTapasDataForForm.goals}
                        placeholder={t('enterGoals')}
                        onChange={(e) => handleMultiLanguageInputChange('goals', e.target.value)}
                        rows="3"
                        className="mt-1 block w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 bg-white border-gray-300 text-gray-900 dark:bg-gray-700 dark:border-gray-600 dark:text-gray-100 focus:border-indigo-500"
                    ></textarea>
                </div>
                <div className="col-span-full">
                    <label htmlFor="parts" className="block text-sm font-medium text-gray-700 dark:text-gray-300">{t('parts0n')}</label>
                    <textarea
                        id="parts"
                        maxLength="1000"
                        value={currentTapasDataForForm.parts}
                        placeholder={t('enterParts')}
                        onChange={(e) => handleMultiLanguageInputChange('parts', e.target.value)}
                        rows="3"
                        className="mt-1 block w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 bg-white border-gray-300 text-gray-900 dark:bg-gray-700 dark:border-gray-600 dark:text-gray-100 focus:border-indigo-500"
                    ></textarea>
                </div>
                {!isNoTapas(scheduleType) && (
                    <>
                <div className="col-span-full">
                    <label htmlFor="crystallizationTime" className="block text-sm font-medium text-gray-700 dark:text-gray-300">{t('crystallizationTime')} [{t('days')}] ({t('optional')})</label>
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
                        disabled={isNoTapas(scheduleType)}
                    />
                    <label htmlFor="allowRecuperation" className="ml-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
                        {t('allowRecuperation')}
                    </label>
                    <span
                        className="infolink"
                        data-tooltip-id="my-tooltip"
                        data-tooltip-html={t('allowRecuperationInfo')}
                        >?
                    </span>
                </div>
                    </>
                )}
                {errorMessage && <p className="text-red-600 mb-4 font-medium">{errorMessage}</p>}

                <div className="col-span-full flex justify-end space-x-3">
                    <button
                        type="button"
                        onClick={onTapasAddedUpdatedCancel}
                        className="inline-flex justify-center py-2 px-4 border border-transparent shadow-sm text-sm font-medium rounded-md text-gray-700 bg-gray-200 hover:bg-gray-300 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 transition-colors duration-200"
                    >
                        {t('cancel')}
                    </button>
                    <button
                        type="submit"
                        className="inline-flex justify-center py-2 px-4 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 transition-colors duration-200"
                    >
                        {editingTapas ? t('updateX', t('tapas')) : t('addTapas')}
                    </button>
                </div>
            </form>

            {otherLanguageModal.isOpen && (
                <div className="fixed inset-0 bg-gray-600 bg-opacity-75 flex items-center justify-center p-4 z-50">
                    <div className="p-6 rounded-lg shadow-xl max-w-sm w-full mx-auto bg-white text-gray-800 dark:bg-gray-800 dark:text-gray-100">
                        <h3 className="text-xl font-bold mb-4">{t('addLanguage')}</h3>
                        {errorMessage && <p className="text-red-600 mb-4 font-medium">{errorMessage}</p>}
                        <label htmlFor="newLangName" className="block text-sm font-medium text-gray-700 dark:text-gray-300">{t('language')} *</label>
                        <input
                            type="text"
                            id="newLangName"
                            value={newLangNameInput}
                            maxLength="30"
                            onChange={(e) => setNewLangNameInput(e.target.value)}
                            className="mt-1 block w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 bg-white border-gray-300 text-gray-900 dark:bg-gray-700 dark:border-gray-600 dark:text-gray-100 focus:border-indigo-500 mb-4"
                            placeholder={t('language')+'...'}
                        />
                        <label htmlFor="newLangCode" className="block text-sm font-medium text-gray-700 dark:text-gray-300">{t('countryCode')}</label>
                        <input
                            type="text"
                            id="newLangCode"
                            value={newLangCodeInput}
                            maxLength="3"
                            onChange={(e) => setNewLangCodeInput(e.target.value)}
                            className="mt-1 block w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 bg-white border-gray-300 text-gray-900 dark:bg-gray-700 dark:border-gray-600 dark:text-gray-100 focus:border-indigo-500 mb-4"
                            placeholder={t('countryCode')+'...'}
                        />
                        <div className="flex justify-end space-x-4">
                            <button
                                onClick={() => { otherLanguageModal.close(); setErrorMessage(''); }}
                                className="bg-gray-300 text-gray-800 px-4 py-2 rounded-md hover:bg-gray-400 transition-colors duration-200"
                            >
                                {t('cancel')}
                            </button>
                            <button
                                onClick={handleAddNewCustomLanguage}
                                className="bg-indigo-600 text-white px-4 py-2 rounded-md hover:bg-indigo-700 transition-colors duration-200"
                            >
                                {t('add')}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

// Helper function to calculate end date and remaining days
const getTapasDatesInfo = (tapasItem, config={}, t={}) => {
    const today = startOfDay(getDateNow(config));
    
    // For 'noTapas' scheduleType, duration and dates are not applicable
    if (!tapasItem.duration) {
        return { endDate: null, daysRemaining: null, daysOver: null };
    }

    const startDate = startOfDay(tapasItem.startDate.toDate());
    const endDate = addDays(startDate, tapasItem.duration - 1);

    const daysOver = differenceInCalendarDays(endDate, today);
    const daysRemaining = Math.max(0, daysOver);

    // date aspects
    let aspectDates = [];
    if (Object.keys(config).length > 0 && tapasItem.duration && tapasItem.duration >= 4 && config?.dateAspects) {
        const daysBefore = config.dateAspectDaysBefore || 7;
        const daysAfter = config.dateAspectDaysAfter || 1;
        for (const dateAspect of config.dateAspects) {
            const aspectDays = tapasItem.duration * dateAspect.percentage / 100;
            const aspectDate = addDays(startDate, aspectDays);
            const aspectDiff = differenceInCalendarDays(aspectDate, today);
            if ((aspectDiff < 0 && -aspectDiff <= daysAfter) || (aspectDiff >= 0 && aspectDiff <= daysBefore)) {
                const aspectDateUTC = startOfDay(aspectDate);
                let adate;
                if (isToday(aspectDateUTC)) {
                    adate = t('today');
                } else if (isTomorrow(aspectDateUTC)) {
                    adate = t('tomorrow');
                } else if (isYesterday(aspectDateUTC)) {
                    adate = t('yesterday', '');
                } else {
                    adate = aspectDate.toLocaleDateString() + ' (';
                    adate += aspectDiff > 0 ? t('inXDays', aspectDiff) : t('beforeXDays', -aspectDiff);
                    adate += ')';
                }
                aspectDates.push(dateAspect.name + ': ' + adate);
            }
        }
    }

    return { endDate, daysRemaining, daysOver, aspectDates };
};

// Helper to get shared tapas info (userId and version)
const getSharedTapasInfo = async (shareReference, db) => {
    if (!shareReference || !db) {
        return { userId: null, version: null };
    }
    const appId = typeof __app_id !== 'undefined' ? __app_id : 'default-app-id';
    const publicSharedTapasCollectionRef = collection(db, `artifacts/${appId}/public/data/sharedTapas`);
    const publicTapasDocRef = doc(publicSharedTapasCollectionRef, shareReference);

    try {
        const docSnap = await getDoc(publicTapasDocRef);
        if (docSnap.exists()) {
            const data = docSnap.data();
            return { userId: data.userId, version: data.version || 1 };
        }
    } catch (e) {
        if (e.code === 'unavailable') {
            // offline
            return null;
        }
        console.error("Error fetching shared tapas info:", e);
    }
    return { userId: null, version: null };
};


const isActive = (tapasItem) => {
    return tapasItem.status === 'active';
};

const isCrystallization = (tapasItem) => {
    return tapasItem.status === 'crystallization';
};

const isSuccessful = (tapasItem) => {
    return tapasItem.status === 'successful';
};

const isFinished = (tapasItem) => {
    return tapasItem.status === 'finished';
};

const isFailed = (tapasItem) => {
    return tapasItem.status === 'failed';
};

const isActiveOrCrystallization = (tapasItem) => {
    return isActive(tapasItem) || isCrystallization(tapasItem);
};

const isSuccessfulOrFinished = (tapasItem) => {
    return isSuccessful(tapasItem) || isFinished(tapasItem);
};

const isSuccessfulOrCrystallization = (tapasItem) => {
    return isSuccessful(tapasItem) || isCrystallization(tapasItem);
};

const isNoTapas = (scheduleType) => {
    return scheduleType === 'noTapas';
};

const isDailyTapas = (scheduleType) => {
    return scheduleType === 'daily';
};

const isWeeklyTapas = (scheduleType) => {
    return scheduleType === 'weekly';
};

const isMonthlyTapas = (scheduleType) => {
    return scheduleType === 'monthly';
};

const isIntervalTapas = (scheduleType) => {
    return scheduleType === 'everyNthDays';
};

const isNoTapasType = (tapasItem) => {
    return isNoTapas(tapasItem.scheduleType);
};

const isDailyTapasType = (tapasItem) => {
    return isDailyTapas(tapasItem.scheduleType);
};

const isWeeklyTapasType = (tapasItem) => {
    return isWeeklyTapas(tapasItem.scheduleType);
};

const isMonthlyTapasType = (tapasItem) => {
    return isMonthlyTapas(tapasItem.scheduleType);
};

const isIntervalTapasType = (tapasItem) => {
    return isIntervalTapas(tapasItem.scheduleType);
};

const getByTapasIntervalType = (tapas, m, w, d, i) => {
    let scheduleType = tapas;
    if (typeof tapas !== 'string') {
        scheduleType = tapas.scheduleType;
    }
    return isMonthlyTapas(scheduleType) ? m : isWeeklyTapas(scheduleType) ? w
        : isIntervalTapas(scheduleType) ? i : d;
}

const getDateNow = (config) => {
    const dayTime = (config.dayTime || '04:00').split(':');
    const date = new Date();
    date.setHours(date.getHours() - parseInt(dayTime[0]));
    date.setMinutes(date.getMinutes() - parseInt(dayTime[1]));
    return date;
};

// Component to display a list of Tapas
const TapasList = ({ tapas, config={}, onSelectTapas, showFilters = false, historyStatusFilter, setHistoryStatusFilter, historyTimeFilter, setHistoryTimeFilter, historyNameFilter, setHistoryNameFilter, sharedTapasInfoMap, selectedTapasLanguage }) => {
    const { locale } = useContext(LocaleContext);
    const { db, userId, t } = useContext(AppContext);
    const dateNow = getDateNow(config);

    // Helper to get detailed status for active tapas display
    const getDetailedStatus = useCallback((tapasItem) => {
        const noDuration = tapasItem.duration === null || tapasItem.duration <= 0;
        const startDate = startOfDay(tapasItem.startDate.toDate());
        const today = getTapasDay(dateNow, tapasItem, startDate);

        if (noDuration || (isNoTapasType(tapasItem) && tapasItem.checkedDays)) {
            let statusText = [];
            if (noDuration) {
                const uniqueCheckedDays = getUniqueCheckedDays(tapasItem.checkedDays);
                if (uniqueCheckedDays && uniqueCheckedDays.length > 0) {
                    const lastDate = startOfDay(getLastDate(uniqueCheckedDays).toDate());
                    const lastSince = differenceInCalendarDays(today, lastDate);
                    const lastInfo = lastSince === 0 ? t('todayX', '') : lastSince === 1 ? t('yesterdayX', '') : t('beforeXDays', lastSince);
                    statusText.push([t('isLastDay') + ': ' + lastInfo]);
                }

                const dates = { "Week": 7, "Month": 30, "Year": 365 };
                let lastChecked = 0;
                let statusZero = '';
                let statusStat = [];
                Object.keys(dates).forEach(name => {
                    const duration = dates[name];
                    const date = startOfDay(subDays(today, duration));
                    const checkedDates = countCheckedSince(uniqueCheckedDays, date);
                    const status = t('last' + name) + ': ' + checkedDates;
                    if (checkedDates == 0 && !statusStat.length) {
                        statusZero = status;
                    }
                    if (checkedDates > lastChecked || (!statusStat.length && duration==365)) {
                        if (statusZero) {
                            statusStat.push(statusZero);
                            statusZero = '';
                        }
                        statusStat.push(status);
                    }
                    lastChecked = checkedDates;
                });
                statusText.push(statusStat);
            }
            return { statusText: statusText, statusClass: 'text-gray-600 dark:text-gray-400' }; // No pending status for 'noTapas'
        }

        let pendingStatus = { statusText: [], statusClass: '' };

        const endDate = addDays(startDate, tapasItem.duration-1);

        const isDaily = isDailyTapasType(tapasItem);
        const isWeekly = isWeeklyTapasType(tapasItem);
        const isMonthly = isMonthlyTapasType(tapasItem);

        const daysDelta = getScheduleFactor(tapasItem.scheduleType, tapasItem.scheduleInterval);
        let yesterday;
        let tomorrow;
        if (isMonthly) {
            yesterday = startOfDay(subMonths(today, 1));
            tomorrow = startOfDay(addMonths(today, 1));
        } else {
            yesterday = startOfDay(subDays(today, daysDelta));
            tomorrow = startOfDay(addDays(today, daysDelta));
        }

        const isTodayWithinDuration = isWithinInterval(today, { start: startDate, end: endDate });
        const isTodayChecked = isTapasDateChecked(tapasItem.checkedDays, today);
        const todayPending = isTodayWithinDuration && !isTodayChecked;

        const isYesterdayWithinDuration = isWithinInterval(yesterday, { start: startDate, end: endDate });
        const isYesterdayChecked = isTapasDateChecked(tapasItem.checkedDays, yesterday);
        const yesterdayPending = isYesterdayWithinDuration && !isYesterdayChecked;

        if (yesterdayPending) {
            const statusText = t(getByTapasIntervalType(tapasItem, 'lastMonthX', 'lastWeekX', 'yesterdayX', 'lastIntervalX'), t('pending')).toLowerCase();
            pendingStatus = { statusText: [[statusText]], statusClass: 'text-red-600' };
        } else if (todayPending && !tapasItem.acknowledgeAfter) {
            const isTodayPending = isDaily || (isWeekly && isSameDay(today, getDateNow(config)));
            const pendingDay = isTodayPending ? 'todayX' : getByTapasIntervalType(tapasItem, 'thisMonthX', 'thisWeekX', 'todayX', 'thisIntervalX');
            const pendingColor = isTodayPending ? 'text-orange-600' : 'text-gray-600';
            const statusText = t(pendingDay, t('pending')).toLowerCase();
            pendingStatus = { statusText: [[statusText]], statusClass: pendingColor };
        }

        let leftOutDaysCount = 0;
        if (!isMonthly) {
            let loopDate = startOfDay(startDate);
            const loopEnd = tapasItem.acknowledgeAfter ? yesterday : today;
            while (!isAfter(loopDate, loopEnd) && !isAfter(loopDate, endDate)) { // Iterate up to yesterday
                if (!isTapasDateChecked(tapasItem.checkedDays, loopDate)) {
                    leftOutDaysCount++;
                }
                loopDate = addDays(loopDate, daysDelta);
            }
        }

        if (!pendingStatus.statusText.length && leftOutDaysCount > 0) {
            const statusText = `${leftOutDaysCount} ${t('xLeftOut', t(getTypeUnitNoInterval(tapasItem)))}`;
            pendingStatus = { statusText: [[statusText]], statusClass: 'text-gray-600' };
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
                const completionDate = tapas.completionDate ? tapas.completionDate.toDate() : tapas.createdAt.toDate();
                if (!isBefore(completionDate, filterDate)) {
                    return true;
                }

                if (!tapas.duration) {
                    return false;
                }

                const endDate = addDays(tapas.startDate.toDate(), tapas.duration - 1);
                return !isBefore(endDate, filterDate); // endDate >= filterDate
            });
        }

        // Apply name filter
        if (historyNameFilter) {
            const sname = historyNameFilter.toLowerCase();
            filtered = filtered.filter(tapas =>
                getLocalizedContent(tapas.name, locale, selectedTapasLanguage).toLowerCase().indexOf(sname) !== -1);
        }

        return filtered;
    }, [historyStatusFilter, historyTimeFilter, historyNameFilter]);

    const displayedTapas = showFilters ? filterTapas(tapas) : tapas;


    return (
        <div className="space-y-4">
            <Tooltip anchorSelect=".shareHint" content={t('sharedTapas')}></Tooltip>
            <Tooltip anchorSelect=".recupHint" content={t('allowRecuperation')}></Tooltip>
            <Tooltip anchorSelect=".resultsHint" content={t('results')}></Tooltip>
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
                        <div className="flex items-center space-x-2">
                            <input
                                type="search"
                                placeholder={t('searchByName')+"..."}
                                value={historyNameFilter}
                                maxLength="120"
                                onChange={(e) => setHistoryNameFilter(e.target.value)}
                                className="px-3 py-2 rounded-md border border-gray-300 w-full"
                            />                        
                        </div>
                    </div>
                </div>
            )}
            {displayedTapas.length === 0 ? (
                <p className="text-center py-8 text-gray-600 dark:text-gray-400">{t('noTapasFound')}</p>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 lg:gap-4"> {/* Added responsive grid classes */}
                    {displayedTapas.map((tapasItem) => {
                        const { endDate, daysRemaining, daysOver, aspectDates } = getTapasDatesInfo(tapasItem, config, t);
                        const { statusText, statusClass } = getDetailedStatus(tapasItem); 
                        const sharedInfo = sharedTapasInfoMap[tapasItem.id] || { userId: null, version: null };

                        // Get localized name for display in the list
                        const displayTapasName = getLocalizedContent(tapasItem.name, locale, selectedTapasLanguage);

                        // Calculate undone parts for active tapas
                        const undoneParts = [];
                        if (isActive(tapasItem) && tapasItem.parts) {
                            const todayDateString = formatDateNoTimeToISO(getDateNow(config));
                            const checkedPartsForToday = tapasItem.checkedPartsByDate?.[todayDateString] || [];
                            
                            // Get localized parts for display
                            const partsToDisplay = getLocalizedContent(tapasItem.parts, locale, selectedTapasLanguage);

                            if (Array.isArray(partsToDisplay) && checkedPartsForToday.length > 0) {
                                partsToDisplay.forEach((part, index) => {
                                    if (!checkedPartsForToday.includes(index)) {
                                        undoneParts.push(part);
                                    }
                                });
                            }
                        }

                        const dayOfWeek = tapasItem.startDate?.toDate().toLocaleDateString(locale, { weekday: "long" });
                        const checkedUnitsCount = tapasItem.checkedDays ? getUniqueCheckedDays(tapasItem.checkedDays).length : 0;
                        const totalUnits =  getTapasDurationByType(tapasItem.startDate?.toDate(), endDate, tapasItem.scheduleType, tapasItem.scheduleInterval);
                        const unitNoInt = getTypeUnitNoInterval(tapasItem);
                        const unit = getTypeUnit(tapasItem);
                        const daysToStart = daysRemaining - (tapasItem.duration-1);

                        return (
                            <div
                                key={tapasItem.id}
                                className="p-2 lg:p-5 rounded-lg shadow-md hover:shadow-lg transition-shadow duration-200 cursor-pointer bg-white text-gray-700 dark:bg-gray-800 dark:text-gray-200"
                                onClick={() => onSelectTapas(tapasItem)}
                            >
                                <div className="flex justify-between items-center">
                                    <h3 className="text-xl font-semibold text-indigo-700 lg:mb-2">
                                        {displayTapasName}
                                        {tapasItem.shareReference && (
                                            <span className={`ml-2 text-${sharedInfo.userId === userId ? 'blue-500' : 'gray-500'}`}>
                                                <svg onClick={(event) => event.stopPropagation()} className="shareHint inline-block" fill="currentColor" height="16" width="16" icon-name="shared" viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg">
                                                    <path d="M2.239 18.723A1.235 1.235 0 0 1 1 17.488C1 11.5 4.821 6.91 10 6.505V3.616a1.646 1.646 0 0 1 2.812-1.16l6.9 6.952a.841.841 0 0 1 0 1.186l-6.9 6.852A1.645 1.645 0 0 1 10 16.284v-2.76c-2.573.243-3.961 1.738-5.547 3.445-.437.47-.881.949-1.356 1.407-.23.223-.538.348-.858.347ZM10.75 7.976c-4.509 0-7.954 3.762-8.228 8.855.285-.292.559-.59.832-.883C5.16 14 7.028 11.99 10.75 11.99h.75v4.294a.132.132 0 0 0 .09.134.136.136 0 0 0 .158-.032L18.186 10l-6.438-6.486a.135.135 0 0 0-.158-.032.134.134 0 0 0-.09.134v4.36h-.75Z"></path>
                                                </svg>
                                            </span>
                                        )}
                                        {isActive(tapasItem) && !isNoTapasType(tapasItem) && (<span className="text-sm text-red-700">&nbsp;&nbsp;&nbsp;{daysOver < 0 ? '['+t('expired')+']' : (isWeeklyTapasType(tapasItem) ? dayOfWeek : '')}</span>)}
                                    </h3>
                                    {tapasItem.startTime && (
                                        <span className="ml-3 font-semibold text-indigo-700 dark:text-indigo-500">{tapasItem.startTime}</span>
                                    )}
                                    <p className="text-sm text-gray-500">
                                        {tapasItem.results > 0 && (
                                            <svg onClick={(event) => event.stopPropagation()} xmlns="http://www.w3.org/2000/svg" viewBox="0 0 640 640" className="resultsHint ml-1 inline-block" fill="currentColor" height="20">
                                            {/*!Font Awesome Free v7.0.1 by @fontawesome - https://fontawesome.com License - https://fontawesome.com/license/free Copyright 2025 Fonticons, Inc.*/}
                                            <path d="M320 576C178.6 576 64 461.4 64 320C64 178.6 178.6 64 320 64C461.4 64 576 178.6 576 320C576 461.4 461.4 576 320 576zM438 209.7C427.3 201.9 412.3 204.3 404.5 215L285.1 379.2L233 327.1C223.6 317.7 208.4 317.7 199.1 327.1C189.8 336.5 189.7 351.7 199.1 361L271.1 433C276.1 438 282.9 440.5 289.9 440C296.9 439.5 303.3 435.9 307.4 430.2L443.3 243.2C451.1 232.5 448.7 217.5 438 209.7z"/></svg>
                                        )}
                                        {tapasItem.allowRecuperation && (
                                            <svg onClick={(event) => event.stopPropagation()} xmlns="http://www.w3.org/2000/svg" viewBox="0 0 640 640" className="recupHint ml-1 inline-block" fill="currentColor" height="16">
                                            {/*!Font Awesome Free v7.0.1 by @fontawesome - https://fontawesome.com License - https://fontawesome.com/license/free Copyright 2025 Fonticons, Inc.*/}
                                            <path d="M552 256L408 256C398.3 256 389.5 250.2 385.8 241.2C382.1 232.2 384.1 221.9 391 215L437.7 168.3C362.4 109.7 253.4 115 184.2 184.2C109.2 259.2 109.2 380.7 184.2 455.7C259.2 530.7 380.7 530.7 455.7 455.7C463.9 447.5 471.2 438.8 477.6 429.6C487.7 415.1 507.7 411.6 522.2 421.7C536.7 431.8 540.2 451.8 530.1 466.3C521.6 478.5 511.9 490.1 501 501C401 601 238.9 601 139 501C39.1 401 39 239 139 139C233.3 44.7 382.7 39.4 483.3 122.8L535 71C541.9 64.1 552.2 62.1 561.2 65.8C570.2 69.5 576 78.3 576 88L576 232C576 245.3 565.3 256 552 256z"/></svg>
                                        )}
                                    </p>
                                </div>
                                {tapasItem.duration !== null && tapasItem.duration > 0 && (
                                    <>
                                        <p className="hidden lg:block text-sm text-gray-600 dark:text-gray-400">
                                            {t('timeframe')}: {reduceDateRange(tapasItem.startDate.toDate().toLocaleDateString(), endDate.toLocaleDateString())}
                                        </p>
                                        <div className="hidden lg:block flex justify-between items-center">
                                            {!statusText.length && isNoTapasType(tapasItem) && checkedUnitsCount==0 ? (
                                                <p className="text-sm text-gray-600 dark:text-gray-400">
                                                    {t('duration')}: {totalUnits} {t(unitNoInt)}
                                                </p>
                                            ) : (
                                                <p className="text-sm text-gray-600 dark:text-gray-400">
                                                    {t('overallProgress')}: {checkedUnitsCount} / {totalUnits} {t(unit)}
                                                </p>
                                            )}
                                        </div>
                                        {isIntervalTapasType(tapasItem) && (<p className="hidden lg:block text-sm text-gray-600 dark:text-gray-400">
                                            {t('schedule')}: {t('Ntimes', Math.ceil(tapasItem.duration / tapasItem.scheduleInterval))} {t('everyNthDays', tapasItem.scheduleInterval).toLowerCase()} {t('days')}</p>
                                        )}
                                        {isActive(tapasItem) && daysOver >= 0 && (
                                            <div className="text-sm font-medium mt-1 lg:mt-2">
                                            {daysRemaining <= 1 && (
                                                <p className="text-yellow-500 dark:text-yellow-200">{daysRemaining == 1 ? t('tomorrow') + ' ' : ''}{t('isLastDay')}</p>
                                            )}
                                            {daysRemaining > 1 && (daysToStart < 0 || (daysToStart==0 && checkedUnitsCount>0)) && (
                                                <p className="text-blue-600">{t('daysRemaining')}: {daysRemaining}</p>
                                            )}
                                            {daysToStart >= 0 && checkedUnitsCount==0 && (
                                                <p className="text-yellow-600 dark:text-yellow-500">
                                                    {daysToStart >=2 ? t('startsIn')+':' : t('startsIn').split(' ')[0]} {daysToStart == 0 ? t('todayX','') : daysToStart == 1 ? t('tomorrow') : daysToStart} {daysToStart > 1 ? t('days') : ''}
                                                </p>
                                            )}
                                            </div>
                                        )}
                                    </>
                                )}
                                {isSuccessful(tapasItem) && (
                                    <p className="text-sm font-medium text-green-600 mt-2">{t('status')}: {t('successful')}</p>
                                )}
                                {isFailed(tapasItem) && (
                                    <p className="text-sm font-medium text-red-600 mt-2">{t('status')}: {t('failed')}</p>
                                )}
                                {isCrystallization(tapasItem) && (
                                    <p className="text-sm font-medium text-indigo-600 mt-2">{t('crystallization')}</p>
                                )}
                                {isActive(tapasItem) && statusText.length > 0 && (<>
                                    {statusText.map((texts, idx) => 
                                        <p key={idx} className={`text-sm font-bold mt-1 ${statusClass}`}>
                                            {texts.map((text, tidx) => <span key={tidx} className="pr-3">{text}</span>)}
                                        </p>
                                    )}
                                    </>
                                )}
                                {aspectDates && aspectDates.length > 0 && (
                                    <p className={`text-sm font-bold mt-1`}>
                                        {aspectDates.map((aspect, idx) => <span key={idx} className="pr-3">{aspect}</span>)}
                                    </p>
                                )}
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
};

const getFirstDate = (dates) => {
    let first = dates[0];
    dates.forEach(timestamp => {
        if (timestamp.seconds < first.seconds) first = timestamp;
    });
    return first;
};

const CheckedDetails = ({ tapas, config, onClose, t, selectedTapasLanguage }) => {
    const { locale } = useContext(LocaleContext);
    const displayTapasName = getLocalizedContent(tapas.name, locale, selectedTapasLanguage);

    let startDateObj = startOfDay(tapas.startDate.toDate());
    let today = getTapasDay(getDateNow(config), tapas, startDateObj);

    const isWeekly = isWeeklyTapasType(tapas);
    const isMonthly = isMonthlyTapasType(tapas);

    if (isMonthly) {
        today = addDays(today, 15);
    }

    let endDateObj;
    if (!startDateObj || !tapas.duration) {
        if (!startDateObj) {
            const first = getFirstDate(tapas.checkedDays);
            startDateObj = startOfDay(first.toDate());
        }
        endDateObj = today;
    } else {
        endDateObj = new Date(startDateObj);
        if (endDateObj && tapas.duration) {
            endDateObj = addDays(startDateObj, tapas.duration - 1);
        }
        if (isBefore(today, endDateObj)) {
            endDateObj = today;
        }
    }

    const daysDelta = getScheduleFactor(tapas.scheduleType, tapas.scheduleInterval);
    //const daysDiff = differenceInCalendarDays(endDateObj, startDateObj);
    const totalUnits = getTapasDurationByType(startDateObj, endDateObj, tapas.scheduleType, tapas.scheduleInterval); //Math.ceil(daysDiff / daysDelta) + 1;
    const isDateChecked = (date) => isTapasDateChecked(tapas.checkedDays, date);

    const showParts = !isNoTapasType(tapas) && tapas.parts.length > 0 && Object.keys(tapas.checkedPartsByDate).length > 0;
    const displayParts = getLocalizedContent(tapas.parts, locale, selectedTapasLanguage);
    const numParts = displayParts.length;
    const parts = [];
    if (showParts) {
        for (let part=0; part < numParts; part++) {
            const partName = displayParts[part];
            parts.unshift(partName.length <= 20 ? partName : partName.substring(0,17) + '...');
        }
    }
    parts.unshift(t('finished'));

    const dates = [];
    const checked = [];
    for (let day=0; day < totalUnits; day++) {
        let date;
        if (isMonthly) {
            date = addMonths(startDateObj, day);
            const monthName = date.toLocaleString(undefined, { month: 'long' });
            const yearShort = date.toLocaleString(undefined, { year: '2-digit' });
            dates.push(monthName + " '" + yearShort);
        } else {
            date = addDays(startDateObj, daysDelta * day);
            if (isWeekly) {
                dates.push(t('cw') + getDateWeek(date));
            } else {
                dates.push(date.toLocaleDateString());
            }
        }

        if (isDateChecked(date)) {
            checked.push([0,day,1]);
        }
        if (showParts) {
            const todayDateString = formatDateToISO(date);
            const checkedPartsForToday = tapas.checkedPartsByDate?.[todayDateString] || [];
            for (let part=0; part < checkedPartsForToday.length; part++) {
                checked.push([numParts - checkedPartsForToday[part],day,1]);
            }
        }
    }

    const data = checked.map(function (item) {
        return [item[1], item[0], item[2] || '-'];
    });

    const option = {
        tooltip: {
            position: 'top'
        },
        grid: {
            height: '90%',
            top: '10%'
        },
        xAxis: {
            type: 'category',
            data: dates,
            splitArea: {
            show: true
            }
        },
        yAxis: {
            type: 'category',
            data: parts,
            splitArea: {
            show: true
            }
        },
        visualMap: {
            min: 0,
            max: 1,
            calculable: false,
            show: false
        },
        series: [
            {
            name: t('checkedDates'),
            type: 'heatmap',
            data: data,
            label: {
                show: false
            },
            emphasis: {
                itemStyle: {
                    borderWidth: 1,
                    borderColor: '#d9ff00ff',
                    borderRadius: 5,
                    shadowBlur: 10,
                    shadowColor: 'rgba(72, 255, 0, 0.5)'
                }
            }
            }
        ]
    };

    return (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-75 flex items-center justify-center p-4 z-50">
            <div className="p-6 rounded-lg shadow-xl max-w-4xl w-full mx-auto bg-white text-gray-800 dark:bg-gray-800 dark:text-gray-100">
                <button onClick={onClose} className="float-right text-gray-500 hover:text-gray-700 text-5xl font-bold">
                    &times;
                </button>
                <h2 className="text-2xl font-bold mb-1">{displayTapasName}</h2>
                <h3 className="text-lg font-bold">{t('checkedDates')}</h3>
                <ReactECharts option={option} />
            </div>
        </div>
    );
};

function getLocaleDateFormat() {
  const parts = new Intl.DateTimeFormat().formatToParts(new Date());
  return parts
    .map(part => {
      switch (part.type) {
        case 'day':   return 'DD';
        case 'month': return 'MM';
        case 'year':  return 'YYYY';
        case 'literal': return part.value;
        default: return '';
      }
    })
    .join('');
}

const RepeatTapas = ({ title, question, confirm, onCancel, onConfirm, isFailed, t,
        initRepeatOption, tapas, locale, intervalUnit, totalUnitsSchedule, unit, endDate, today,
        failureCause, setFailureCause, setRepeatOption, setNewRepeatDuration }) => {
    const [repeatOption, setRepeatOptionInt] = useState(initRepeatOption);
    const [newRepeatDuration, setNewRepeatDurationInt] = useState('');

    const setRepeatOptionInternal = (value) => {
        setRepeatOptionInt(value);
        setRepeatOption(value);
    };

    const setNewRepeatDurationInternal = (value) => {
        setNewRepeatDurationInt(value);
        setNewRepeatDuration(value);
    };

    return (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-75 flex items-center justify-center p-4 z-50">
            <div className="p-6 rounded-lg shadow-xl max-w-md w-full mx-auto bg-white text-gray-800 dark:bg-gray-800 dark:text-gray-100">
                <h3 className="text-xl font-bold mb-4">{t(title)}</h3>
                <p className="mb-4 text-gray-700 dark:text-gray-300">{t(question, getLocalizedContent(tapas.name, locale))}</p>

                {isFailed && (<>
                    <label htmlFor="failureCause" className="block text-sm font-medium mb-2 text-gray-700 dark:text-gray-300">{t('causeOptional')}</label>
                    <textarea
                        id="failureCause"
                        maxLength="4000"
                        value={failureCause}
                        onChange={(e) => setFailureCause(e.target.value)}
                        rows="2"
                        className="mt-1 block w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 bg-white border-gray-300 text-gray-900 dark:bg-gray-700 dark:border-gray-600 dark:text-gray-100 focus:border-indigo-500 mb-4"
                    ></textarea>
                </>)}

                <label className="block text-sm font-medium mb-2 text-gray-700 dark:text-gray-300">{t('repeatTapas')}</label>
                <div className="mb-4 space-y-2">
                    {isFailed && (
                        <label className="flex items-center">
                            <input
                                type="radio"
                                name="repeatOption"
                                value="none"
                                checked={repeatOption === 'none'}
                                onChange={(e) => setRepeatOptionInternal(e.target.value)}
                                className="form-radio text-indigo-600"
                            />
                            <span className="ml-2 text-gray-700 dark:text-gray-300">{t('noDoNotRepeat')}</span>
                        </label>
                    )}
                    <label className="flex items-center">
                        <input
                            type="radio"
                            name="repeatOption"
                            value="sameDuration"
                            checked={repeatOption === 'sameDuration'}
                            onChange={(e) => setRepeatOptionInternal(e.target.value)}
                            className="form-radio text-indigo-600"
                        />
                        <span className="ml-2 text-gray-700 dark:text-gray-300">
                            {t('repeatSameDuration', totalUnitsSchedule, t(unit))}
                        </span>
                    </label>
                    <label className="flex items-center">
                        <input
                            type="radio"
                            name="repeatOption"
                            value="newDuration"
                            checked={repeatOption === 'newDuration'}
                            onChange={(e) => setRepeatOptionInternal(e.target.value)}
                            className="form-radio text-indigo-600"
                        />
                        <span className="ml-2 text-gray-700 dark:text-gray-300">{t('repeatNewDuration')}</span>
                        {repeatOption === 'newDuration' && (
                            <input
                                type="number"
                                value={newRepeatDuration}
                                onChange={(e) => setNewRepeatDurationInternal(e.target.value)}
                                className="ml-2 w-16 px-2 py-1 border rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 bg-white border-gray-300 text-gray-900 dark:bg-gray-700 dark:border-gray-600 dark:text-gray-100 focus:border-indigo-500"
                                min="1"
                            />
                        )}
                        <span className="ml-1 text-gray-700 dark:text-gray-300">
                            {intervalUnit} {t(unit)}
                        </span>
                    </label>
                    {endDate > today && !isMonthlyTapasType(tapas) && (
                        <label className="flex items-center">
                            <input
                                type="radio"
                                name="repeatOption"
                                value="untilEndDate"
                                checked={repeatOption === 'untilEndDate'}
                                onChange={(e) => setRepeatOptionInternal(e.target.value)}
                                className="form-radio text-indigo-600"
                            />
                            <span className="ml-2 text-gray-700 dark:text-gray-300">{t('repeatUntilOriginalEndDate', endDate.toLocaleDateString())}</span>
                        </label>
                    )}
                </div>

                <div className="flex justify-around space-x-4">
                    <button
                        onClick={onCancel}
                        className="flex-1 bg-gray-300 text-gray-800 px-4 py-2 rounded-md hover:bg-gray-400 transition-colors duration-200"
                    >
                        {t('cancel')}
                    </button>
                    <button
                        onClick={onConfirm}
                        className={`flex-1 ${isFailed ? 'bg-red-500' : 'bg-purple-600'} text-white px-4 py-2 rounded-md hover:bg-red-600 transition-colors duration-200`}
                    >
                        {t(confirm)}
                    </button>
                </div>
            </div>
        </div>
    );
};

// Component for a single Tapas detail view
const TapasDetail = ({ tapas, config, onClose, onEdit, setSelectedTapas, modalState, openDateRangeModal,
        initMessage, setInitMessage, selectedTapasLanguage, isPersistentCacheEnabled, isOffline,
        myAddDoc, myUpdateDoc, myDeleteDoc }) => {
    const { locale } = useContext(LocaleContext);
    const { db, userId, t } = useContext(AppContext);

    const [confirmDelete, setConfirmDelete] = useState(false);
    const [confirmName, setConfirmName] = useState('');
    const [failureCause, setFailureCause] = useState('');
    const [repeatOption, setRepeatOption] = useState('sameDuration'); // Default for repeat dialog
    const [newRepeatDuration, setNewRepeatDuration] = useState('');
    const [message, setMessage] = useState('');
    const [checkedPartsSelection, setCheckedPartsSelection] = useState({}); // { index: true, ... } for parts checked today (transient)
    const [showRecuperationAdvanceMenu, setShowRecuperationAdvanceMenu] = useState(false); // State for dropdown menu
    const [publicSharedTapas, setPublicSharedTapas] = useState(null); // State for public shared tapas data
    const [showUpdateSharedTapasMenu, setShowUpdateSharedTapasMenu] = useState(false); // State for update shared tapas menu
    const [deleteSharedTapas, setDeleteSharedTapas] = useState(false);
    const [results, setResults] = useState([]);
    const [showCheckedDetails, setShowCheckedDetails] = useState(false);
    const failedModal = modalState.getModalProps("failed");
    const repeatModal = modalState.getModalProps("repeat");

    if (initMessage && message != initMessage) {
        setMessage(initMessage);
    }

    const btnShowUpdateSharedTapasMenu = (e) => {
        if (showUpdateSharedTapasMenu) {
            setShowUpdateSharedTapasMenu(false);
        } else if (e.target.offsetParent.offsetLeft < document.body.clientWidth/2) {
            setShowUpdateSharedTapasMenu('left');
        } else {
            setShowUpdateSharedTapasMenu('right');
        }
    };
    const sharedDropdownRef = useRef(null); // Ref for the main detail container to detect outside clicks
    const tapasDropdownRef = useRef(null); // Ref for the main detail container to detect outside clicks

    const appId = typeof __app_id !== 'undefined' ? __app_id : 'default-app-id';
    const tapasRef = doc(db, `artifacts/${appId}/users/${userId}/tapas`, tapas.id);
    const publicSharedTapasCollectionRef = collection(db, `artifacts/${appId}/public/data/sharedTapas`);

    const startDateObj = tapas.startDate ? startOfDay(tapas.startDate.toDate()) : null; // Use UTC start of day
    const endDateObj = startDateObj && tapas.duration ? addDays(startDateObj, tapas.duration - 1) : null;

    const noTapas = isNoTapasType(tapas);
    const isInterval = isIntervalTapasType(tapas);
    const noDuration = tapas.duration === null || tapas.duration <= 0;
    const totalUnits = noDuration ? 0 : getTapasDurationByType(startDateObj, endDateObj, tapas.scheduleType, tapas.scheduleInterval);
    const totalUnitsInt = isInterval ? tapas.duration : totalUnits;
    const intervalUnit = isInterval ? t('Ntimes', '') + ' ' + t('everyNthDays', tapas.scheduleInterval).toLowerCase() : '';
    const totalUnitsSchedule = isInterval ? t('Ntimes', Math.ceil(tapas.duration / tapas.scheduleInterval)) + ' '
        + t('everyNthDays', tapas.scheduleInterval).toLowerCase() : totalUnits;
    const unitNoInt = getTypeUnitNoInterval(tapas);
    const unit = getTypeUnit(tapas);
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

    const today = startOfDay(getDateNow(config));
    const tapasToday = getTapasDay(today, tapas, startDateObj);
    const daysDelta = getScheduleFactor(tapas.scheduleType, tapas.scheduleInterval);
    let beforeYesterday;
    let yesterday;
    let tomorrow;
    if (isMonthlyTapasType(tapas)) {
        beforeYesterday = startOfDay(subMonths(tapasToday, 2));
        yesterday = startOfDay(subMonths(tapasToday, 1));
        tomorrow = startOfDay(addMonths(tapasToday, 1));
    } else {
        beforeYesterday = startOfDay(subDays(tapasToday, 2 * daysDelta));
        yesterday = startOfDay(subDays(tapasToday, daysDelta));
        tomorrow = startOfDay(addDays(tapasToday, daysDelta));
    }

    const isTodayChecked = isDateChecked(tapasToday);
    const isBeforeYesterdayChecked = isDateChecked(beforeYesterday);
    const isYesterdayChecked = isDateChecked(yesterday);
    const isTomorrowChecked = isDateChecked(tomorrow);

    const todayDateString = formatDateToISO(tapasToday);

    // Check if the tapas period is over
    const isTodayValid = !isAfter(startDateObj, today) && (noDuration || !isAfter(today, endDateObj));
    const isYesterdayValid = !isAfter(startDateObj, yesterday) && (noDuration || !isAfter(yesterday, endDateObj));
    const isPeriodEndOrOver = !noDuration && !isBefore(today, endDateObj);
    const isPeriodOver = !noDuration && isAfter(today, endDateObj);

    // Get localized content for display
    const displayTapasName = getLocalizedContent(tapas.name, locale, selectedTapasLanguage);
    const displayDescription = getLocalizedContent(tapas.description, locale, selectedTapasLanguage);
    const displayGoals = getLocalizedContent(tapas.goals, locale, selectedTapasLanguage);
    const displayParts = getLocalizedContent(tapas.parts, locale, selectedTapasLanguage);

    // Fetch public shared tapas data if shareReference exists
    useEffect(() => {
        if (tapas.shareReference) {
            const publicTapasDocRef = doc(publicSharedTapasCollectionRef, tapas.shareReference);
            const unsubscribe = onSnapshot(publicTapasDocRef, (docSnap) => {
                if (docSnap.exists()) {
                    setPublicSharedTapas(docSnap.data());
                } else {
                    setPublicSharedTapas(null); // Public shared tapas deleted or not found
                }
            }, (error) => {
                console.error("Error fetching public shared tapas:", error);
                setPublicSharedTapas(null);
            });
            return () => unsubscribe();
        } else {
            setPublicSharedTapas(null);
        }
    }, [tapas.shareReference, publicSharedTapasCollectionRef]);

    // Load checkedPartsSelection from database on mount/tapas change
    useEffect(() => {
        if (!todayDateString) {
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
        const newVal = !checkedPartsSelection[index];
        const newCheckedPartsSelection = {
            ...checkedPartsSelection,
            [index]: newVal
        };
        if (!newVal) {
            delete newCheckedPartsSelection[index];
        }
        setCheckedPartsSelection(newCheckedPartsSelection);

        const updatedCheckedPartsIndices = Object.keys(newCheckedPartsSelection)
            .filter(key => newCheckedPartsSelection[key])
            .map(Number); // Convert keys back to numbers

        const updatedCheckedPartsByDate = {
            ...(tapas.checkedPartsByDate || {}),
            [todayDateString]: updatedCheckedPartsIndices
        };
        if (updatedCheckedPartsIndices.length == 0) {
            delete updatedCheckedPartsByDate[todayDateString];
        }

        try {
            await myUpdateDoc(tapasRef, { checkedPartsByDate: updatedCheckedPartsByDate });
            setSelectedTapas(prev => ({ ...prev, checkedPartsByDate: updatedCheckedPartsByDate })); // Immediately update local state
        } catch (error) {
            console.error("Error updating checked parts for today:", error);
            setMessage("Error saving part progress.");
        }
    };

    const handleMarkUnitFinished = async (dateToMark) => {
        setInitMessage('');

        const dateForCheckedDays = startOfDay(dateToMark);

        if (isTapasDateChecked(tapas.checkedDays, dateForCheckedDays)) {
            setMessage(t('dayAlreadyChecked')); // Re-using dayAlreadyChecked for now
            return;
        }

        const updatedCheckedDays = getUniqueCheckedDays([...(tapas.checkedDays || []), Timestamp.fromDate(dateForCheckedDays)]);

        try {
            await myUpdateDoc(tapasRef, { checkedDays: updatedCheckedDays, });
            setMessage(t(getByTapasIntervalType(tapas, 'month', 'week', 'day', 'interval') + 'CheckedSuccessfully'));
            /*if (formatDateToISO(dateForCheckedDays) === todayDateString) {
                 setCheckedPartsSelection({}); // Clear the UI selection state for parts for next day/interaction
            }*/
            setSelectedTapas(prev => ({ ...prev, checkedDays: updatedCheckedDays })); // Immediately update local state
        } catch (error) {
            console.error("Error marking unit finished:", error);
            setMessage("Error marking unit finished.");
        }

        // If all units checked, mark as successful
        if (updatedCheckedDays.length === totalUnits && isPeriodEndOrOver) {
            const newStatus = tapas.crystallizationTime ? 'crystallization' : 'successful';
            await myUpdateDoc(tapasRef, { status: newStatus });
            setMessage(t('tapasCompletedSuccessfully'));
            setSelectedTapas(prev => ({ ...prev, status: newStatus })); // Immediately update local state for status
        }
    };

    const handleRecuperateUnit = async (dateToRecuperate) => {
        setInitMessage('');
        if (!tapas.allowRecuperation) return;

        const dateForCheckedDays = getTapasDay(dateToRecuperate, tapas, startDateObj);
        if (isDateChecked(dateForCheckedDays) || !isWithinInterval(dateForCheckedDays, { start: startDateObj, end: endDateObj })) {
            setMessage(t('notApplicableAlreadyCheckedOrOutsideDuration'));
            return;
        }

        const updatedCheckedDays = getUniqueCheckedDays([...(tapas.checkedDays || []), Timestamp.fromDate(dateForCheckedDays)]);
        const updatedRecuperatedDays = getUniqueCheckedDays([...(tapas.recuperatedDays || []), Timestamp.fromDate(dateForCheckedDays)]);

        try {
            await myUpdateDoc(tapasRef, {
                checkedDays: updatedCheckedDays,
                recuperatedDays: updatedRecuperatedDays,
            });
            setMessage(t('xRecuperatedSuccessfully', t(unit)));
            setSelectedTapas(prev => ({ ...prev, checkedDays: updatedCheckedDays, recuperatedDays: updatedRecuperatedDays })); // Immediately update local state
            setShowRecuperationAdvanceMenu(false); // Close dropdown
        } catch (error) {
            console.error("Error recuperating unit:", error);
            setMessage(`Error: ${error.message}`);
        }
    };

    const handleAdvanceUnits = async () => {
        setInitMessage('');
        if (!tapas.allowRecuperation) return;

        const datesToMark = [];
        const advancedDates = [];

        const thisUnit = getTapasDay(tapasToday, tapas, startDateObj);
        const nextUnit = addDays(thisUnit, getScheduleFactor(tapas.scheduleType, tapas.scheduleInterval));

        if (!isDateChecked(thisUnit) && isWithinInterval(thisUnit, { start: startDateObj, end: endDateObj })) {
            datesToMark.push(thisUnit);
        }
        if (!isDateChecked(nextUnit) && isWithinInterval(nextUnit, { start: startDateObj, end: endDateObj })) {
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
            await myUpdateDoc(tapasRef, {
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

    const showAcknowledgeDateRangeMenu = () => {
        openDateRangeModal(true);
    };

    const handleClearLastUnit = async () => {
        setInitMessage('');
        if (!tapas.checkedDays || tapas.checkedDays.length === 0) {
            setMessage(t('noDayToClear')); // Re-using noDayToClear
            setShowRecuperationAdvanceMenu(false);
            return;
        }

        const sortedCheckedDays = [...tapas.checkedDays].sort((a, b) => b.toDate().getTime() - a.toDate().getTime());
        const lastCheckedDayTimestamp = sortedCheckedDays[0];
        const lastCheckedUnitDate = startOfDay(lastCheckedDayTimestamp.toDate());

        const dateFunc = isWeeklyTapasType(tapas) ? formatStartOfWeekNoTimeToISO : formatDateNoTimeToISO;

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
            await myUpdateDoc(tapasRef, {
                checkedDays: getUniqueCheckedDays(newCheckedDays),
                recuperatedDays: getUniqueCheckedDays(newRecuperatedDays),
                advancedDays: getUniqueCheckedDays(newAdvancedDays),
                checkedPartsByDate: newCheckedPartsByDate,
                status: (isSuccessfulOrCrystallization(tapas) && getUniqueCheckedDays(newCheckedDays).length < totalUnits) ? 'active' : tapas.status
            });

            setSelectedTapas(prev => ({
                ...prev,
                checkedDays: getUniqueCheckedDays(newCheckedDays),
                recuperatedDays: getUniqueCheckedDays(newRecuperatedDays),
                advancedDays: getUniqueCheckedDays(newAdvancedDays),
                checkedPartsByDate: newCheckedPartsByDate,
                status: (isSuccessfulOrCrystallization(tapas) && getUniqueCheckedDays(newCheckedDays).length < totalUnits) ? 'active' : tapas.status
            }));

            setMessage(t('dateClearedSuccessfully'));

            if (isSuccessfulOrCrystallization(tapas) && getUniqueCheckedDays(newCheckedDays).length < totalUnits) {
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
        setInitMessage('');
        // Use the default language name for confirmation
        const defaultName = getLocalizedContent(tapas.name, locale);
        if (confirmName === defaultName) {
            try {
                // Delete the results sub-collection documents first
                if (isPersistentCacheEnabled) {
                    results.forEach(result => {
                        deleteDoc(doc(tapasRef, 'results', result.id));
                    });
                } else {
                    const batch = writeBatch(db);
                    const resultsSnapshot = await getDocs(collection(tapasRef, 'results'));
                    resultsSnapshot.forEach((doc) => batch.delete(doc.ref));
                    await batch.commit();
                }
                await myDeleteDoc(tapasRef);
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

    const handleDeleteSharedTapas = async () => {
        setInitMessage('');
        if (!tapas.shareReference || !publicSharedTapas || publicSharedTapas.userId !== userId) {
            setMessage(t('notOwnerOfSharedTapas'));
            return;
        }
        try {
            await deleteDoc(doc(publicSharedTapasCollectionRef, tapas.shareReference));
            // Optionally, remove the shareReference from the user's local tapas as well
            await updateDoc(tapasRef, { shareReference: null });
            setSelectedTapas(prev => ({ ...prev, shareReference: null }));
            setMessage(t('sharedTapasDeletedFromPublic'));
            setShowUpdateSharedTapasMenu(false); // Close menu
        } catch (error) {
            console.error("Error deleting shared tapas from public:", error);
            setMessage(`${t('errorDeletingSharedTapasFromPublic')} ${error.message}`);
        }
    };

    const handleMarkFailed = async () => {
        setInitMessage('');
        failedModal.open();
    };

    const handleRepeat = () => {
        setInitMessage('');
        repeatModal.open();
    };

    const getRepeatDateOptions = (date) => {
        const year = String(date.getFullYear());
        const yearShort = year.slice(-2);
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const monthShort = month[0] == '0' ? month[1] : '';
        const ret = [[year, month], [month, year], [yearShort, month], [month, yearShort]];
        if (monthShort) {
            ret.push(...[[year, monthShort], [monthShort, year],
                [yearShort, monthShort], [monthShort, yearShort]]);
        }
        return ret;
    };

    const getDateIndex = (name, date) => {
        let ret = null;
        const seps = ['-', '.', '/'];
        const dateOpts = getRepeatDateOptions(date);
        dateOpts.every((opt, index) => {
            seps.every((sep) => {
                const optStr = opt[0] + sep + opt[1];
                const nameIndex = name.indexOf(optStr);
                if (nameIndex !== -1) {
                    ret = { index: index >= 4 ? index-4 : index, sep: sep, date: optStr };
                    return false;
                }
                return true;
            });
            return !ret;
        });
        return ret;
    };

    const updateRepeatName = (name, newDurationDays) => {
        let currentName = name;

        const startDateRet = getDateIndex(currentName, startDateObj);
        const endDateRet = getDateIndex(currentName, endDateObj);
        let repDate = null;
        let dateRet = null;
        if (startDateRet) {
            repDate = new Date();
            dateRet = startDateRet;
        } else if (endDateRet) {
            repDate = addDays(startOfDay(new Date()), newDurationDays - 1);
            dateRet = endDateRet;
        }

        if (repDate) {
            const newMonth = String(repDate.getMonth() + 1);
            let newYear = String(repDate.getFullYear());
            if (dateRet.index >= 2) {
                newYear = newYear.slice(-2); // short year
            }
            const newDate = (dateRet.index & 1) > 0 ? newMonth + dateRet.sep + newYear : newYear + dateRet.sep + newMonth;
            currentName = currentName.replace(dateRet.date, newDate);
        } else {
            const repStr = t('theRepeat');
            const repeatRegex = `\\(${repStr}(?: (\\d+))?\\)`;
            const match = currentName.match(repeatRegex);
            if (match) {
                if (match[1]) {
                    const currentRepeatNum = parseInt(match[1]);
                    currentName = currentName.replace(repeatRegex, `(${repStr} ${currentRepeatNum + 1})`);
                } else {
                    currentName = currentName.replace(`(${repStr})`, `(${repStr} 2)`);
                }
            } else {
                currentName = `${currentName} (${repStr})`;
            }
        }

        return currentName;
    };

    const repeatTapas = () => {
        let newStartDate = startOfDay(new Date()); // New tapas starts today in UTC
        let newDurationDays = tapas.duration; // Default to original duration in days
        if (isMonthlyTapasType(tapas)) {
            newDurationDays = getTapasDurationInDays(newStartDate, totalUnits, tapas.scheduleType, tapas.scheduleInterval);
        }

        if (repeatOption === 'newDuration') {
            if (isNaN(parseInt(newRepeatDuration)) || parseInt(newRepeatDuration) <= 0) {
                setMessage(t('invalidNewDuration'));
                return;
            }
            const units = parseInt(newRepeatDuration);
            newDurationDays = getTapasDurationInDays(newStartDate, units, tapas.scheduleType, tapas.scheduleInterval);
        } else if (repeatOption === 'untilEndDate') {
            const diffDays = differenceInCalendarDays(endDateObj, newStartDate);
            if (diffDays > 0) {
                newDurationDays = diffDays;
            } else {
                setMessage(t('originalEndDateInPast'));
                return;
            }
        }

        // Create new multi-language name object for the repeated tapas
        let newMultiLangName;
        if (typeof tapas.name === 'string') {
            newMultiLangName = updateRepeatName(tapas.name, newDurationDays);
        } else {
            newMultiLangName = {};
            Object.keys(tapas.name).forEach(lang => {
                newMultiLangName[lang] = updateRepeatName(tapas.name[lang] || '', newDurationDays);
            });
        }

        const newTapasData = {
            name: newMultiLangName, // Use multi-language name
            startDate: newStartDate,
            startTime: tapas.startTime,
            duration: newDurationDays,
            description: tapas.description, // Carry over multi-language description
            goals: tapas.goals, // Carry over multi-language goals
            parts: tapas.parts, // Carry over multi-language parts
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
            shareReference: null, // Don't carry over share reference
            scheduleType: tapas.scheduleType || 'daily', // Carry over schedule type
            scheduleInterval: tapas.scheduleInterval || '', // Carry over schedule interval
            acknowledgeAfter: tapas.acknowledgeAfter || false, // Carry over acknowledgeAfter
            languages: tapas.languages || {}, // Carry over custom languages
            version: 1, // New tapas starts with version 1
        };
        return newTapasData;
    };

    const confirmFail = async () => {
        setInitMessage('');
        try {
            await myUpdateDoc(tapasRef, { status: 'failed', failureCause: failureCause || null });
            setMessage(t('tapasMarkedAsFailed'));
            failedModal.close();

            if (repeatOption !== 'none') {
                const newTapasData = repeatTapas();
                const appId = typeof __app_id !== 'undefined' ? __app_id : 'default-app-id';
                await myAddDoc(collection(db, `artifacts/${appId}/users/${userId}/tapas`), newTapasData);
                setMessage(t('failedTapasRepeated'));
            }
            onClose(); // Close the detail view
        } catch (e) {
            console.error("Error marking failed or repeating: ", e);
            setMessage(`${t('errorMarkingFailedRepeating')} ${e.message}`);
        } finally {
            failedModal.close();
            setFailureCause('');
            setRepeatOption('none');
            setNewRepeatDuration('');
        }
    };

    const confirmRepeat = async () => {
        setInitMessage('');
        try {
            const newTapasData = repeatTapas();
            const appId = typeof __app_id !== 'undefined' ? __app_id : 'default-app-id';
            await myAddDoc(collection(db, `artifacts/${appId}/users/${userId}/tapas`), newTapasData);
            setMessage(t('tapasRepeatedSuccessfully'));
            repeatModal.close();
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
        setInitMessage('');
        if (!isPeriodEndOrOver || isSuccessful(tapas) || isFailed(tapas) || isFinished(tapas)) return;
        if (isNoTapasType(tapas)) {
            await myUpdateDoc(tapasRef, { status: 'finished' });
            setMessage(t('notapasAutoMarkedFinished'));
            setSelectedTapas(prev => ({ ...prev, status: 'finished' })); // Immediately update local state for status
            return;
        }

        if (isCrystallization(tapas)) {
            const crystallizationDate = addDays(endDateObj, tapas.crystallizationTime);
            if (today > crystallizationDate) {
                await myUpdateDoc(tapasRef, { status: 'successful' });
                setMessage(t('tapasAutoMarkedSuccessful', t('crystallization')));
                setSelectedTapas(prev => ({ ...prev, status: 'successful' })); // Immediately update local state for status
            }
            return;
        }

        // Automatically mark as successful if all units checked (unique count) and period is over
        if (checkedUnitsCount >= totalUnits) {
            if (tapas.crystallizationTime) {
                await myUpdateDoc(tapasRef, { status: 'crystallization' });
                setMessage(t('tapasAutoMarkedCrystallization'));
                setSelectedTapas(prev => ({ ...prev, status: 'crystallization' })); // Immediately update local state for status
            } else {
                await myUpdateDoc(tapasRef, { status: 'successful' });
                setMessage(t('tapasAutoMarkedSuccessful', t('confirmation')));
                setSelectedTapas(prev => ({ ...prev, status: 'successful' })); // Immediately update local state for status
            }
        } else if (isPeriodOver) {
            // If period is over but not all units checked, suggest marking as failed
            setMessage(t('tapasPeriodOverNotAllDaysChecked'));
        }
    };

    // Run this check when the component mounts or tapas data changes
    useEffect(() => {
        checkDailyProgress();
    }, [tapas]);

    const handleShareTapas = async () => {
        setInitMessage('');
        if (isNoTapasType(tapas)) {
            setMessage(t('noShareNoTapas'));
            return;
        }

        if (!db || !tapas.id) {
            setMessage(t('shareLinkError') + " Database or Tapas ID missing.");
            return;
        }

        const appId = typeof __app_id !== 'undefined' ? __app_id : 'default-app-id';
        const publicSharedTapasCollectionRef = collection(db, `artifacts/${appId}/public/data/sharedTapas`);
        let currentShareReference = tapas.shareReference;

        try {
            if (!currentShareReference) {
                // Generate a new unique ID for the shared reference
                currentShareReference = crypto.randomUUID();

                // Store this shareReference in the user's private tapas document
                await updateDoc(tapasRef, { shareReference: currentShareReference });
                setSelectedTapas(prev => ({ ...prev, shareReference: currentShareReference })); // Update local state immediately

                // Prepare static data for public sharing
                const staticTapasData = {
                    name: tapas.name, // Save multi-language name
                    sharedAt: new Date(),
                    userId: userId,
                    startDate: tapas.startDate,
                    startTime: tapas.startTime,
                    duration: tapas.duration,
                    description: tapas.description || null, // Save multi-language description
                    goals: tapas.goals || [], // Save multi-language goals
                    parts: tapas.parts || [], // Save multi-language parts
                    scheduleType: tapas.scheduleType,
                    scheduleInterval: tapas.scheduleInterval,
                    crystallizationTime: tapas.crystallizationTime || null,
                    acknowledgeAfter: tapas.acknowledgeAfter || false,
                    allowRecuperation: tapas.allowRecuperation || false,
                    languages: tapas.languages || {}, // Save custom languages
                    sharedCount: (publicSharedTapas?.sharedCount || 0) + 1, // Increment shared count from existing public data if available
                    adoptedCount: (publicSharedTapas?.adoptedCount || 0), // Initialize or preserve from existing public data
                    version: tapas.version || 1, // Use the current local tapas version
                };

                // Get the public document reference
                const publicTapasDocRef = doc(publicSharedTapasCollectionRef, currentShareReference);

                await setDoc(publicTapasDocRef, staticTapasData, { merge: true }); // Use merge to update existing fields and add new ones
            }

            // Construct the shareable URL
            const shareUrl = `${window.location.origin}?ref=${currentShareReference}`;

            // Use native Share API if available
            if (navigator.share) {
                await navigator.share({
                    title: getLocalizedContent(tapas.name, locale),
                    text: t('appName') + `: ${getLocalizedContent(tapas.name, locale)}`,
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

    const handleUpdateSharedTapas = async () => {
        setInitMessage('');
        if (!tapas.shareReference || !publicSharedTapas || publicSharedTapas.userId !== userId) {
            setMessage(t('notOwnerOfSharedTapas'));
            return;
        }

        try {
            const publicTapasDocRef = doc(publicSharedTapasCollectionRef, tapas.shareReference);
            const updatedSharedData = {
                name: tapas.name, // Update multi-language name
                sharedAt: new Date(), // Update shared timestamp
                startDate: tapas.startDate,
                startTime: tapas.startTime,
                duration: tapas.duration,
                description: tapas.description || null, // Update multi-language description
                goals: tapas.goals || [], // Update multi-language goals
                parts: tapas.parts || [], // Update multi-language parts
                scheduleType: tapas.scheduleType,
                scheduleInterval: tapas.scheduleInterval,
                crystallizationTime: tapas.crystallizationTime || null,
                acknowledgeAfter: tapas.acknowledgeAfter || false,
                allowRecuperation: tapas.allowRecuperation || false,
                languages: tapas.languages || {}, // Update custom languages
                version: tapas.version || 1, // Use the current local tapas version
            };
            await updateDoc(publicTapasDocRef, updatedSharedData);
            setMessage(t('sharedTapasUpdated'));
            setShowUpdateSharedTapasMenu(false); // Close menu
        } catch (error) {
            console.error("Error updating shared tapas:", error);
            setMessage(`${t('errorUpdatingSharedTapas')} ${error.message}`);
        }
    };

    const handleUpdateFromSharedTapas = async () => {
        setInitMessage('');
        if (!tapas.shareReference || publicSharedTapas.userId === userId || !publicSharedTapas) {
            setMessage(t('notSharedTapasOrOwner'));
            return;
        }

        try {
            const updatedLocalData = {
                name: publicSharedTapas.name, // Update multi-language name
                startDate: publicSharedTapas.startDate,
                startTime: publicSharedTapas.startTime,
                duration: publicSharedTapas.duration,
                description: publicSharedTapas.description || null, // Update multi-language description
                goals: publicSharedTapas.goals || [], // Update multi-language goals
                parts: publicSharedTapas.parts || [], // Update multi-language parts
                scheduleType: publicSharedTapas.scheduleType,
                scheduleInterval: publicSharedTapas.scheduleInterval,
                crystallizationTime: publicSharedTapas.crystallizationTime || null,
                acknowledgeAfter: publicSharedTapas.acknowledgeAfter || false,
                allowRecuperation: publicSharedTapas.allowRecuperation || false,
                languages: publicSharedTapas.languages || {}, // Update custom languages
                version: publicSharedTapas.version || 1, // Update local version to shared version
            };
            await updateDoc(tapasRef, updatedLocalData);
            setSelectedTapas(prev => ({ ...prev, ...updatedLocalData })); // Update local state
            setMessage(t('tapasUpdatedFromShared'));
            setShowUpdateSharedTapasMenu(false); // Close menu
        } catch (error) {
            console.error("Error updating local tapas from shared:", error);
            setMessage(`${t('errorUpdatingFromSharedTapas')} ${error.message}`);
        }
    };


    // Determine the current date/week display based on scheduleType
    const todayFormatted = getDateNow(config).toLocaleDateString(locale, { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
    let displayDateInfo = `${t('todayIs')} ${todayFormatted}`;
    if (config.dayTime !== '00:00') {
        displayDateInfo += ' (' + t('until') + ' ' + (config.dayTime || '04:00') + ')';
    }

    let displayDateInfoPre = '';
    if (isWeeklyTapasType(tapas)) {
        const currentWeekStart = getStartOfWeekUTC(tapasToday);
        const currentWeekEnd = addDays(currentWeekStart, 6); // Sunday of the current week

        const currentWeekStartFormatted = currentWeekStart.toLocaleDateString(undefined, { day: 'numeric', month: 'short' });
        const currentWeekEndFormatted = currentWeekEnd.toLocaleDateString(undefined, { day: 'numeric', month: 'short' });

        displayDateInfoPre = t('thisWeekIs', currentWeekStartFormatted, currentWeekEndFormatted);
    } else if (isIntervalTapasType(tapas)) {
        const start = getStartOfIntervalUTC(tapasToday, tapas);
        const end = addDays(start, tapas.scheduleInterval - 1);
        const intervalFormatted = reduceDateRange(getDateStr(start), getDateStr(end));
        displayDateInfoPre = t('thisIntervalIs', intervalFormatted);
    }

    const { endDate, daysRemaining } = getTapasDatesInfo(tapas);

    // Group successive checked dates into ranges
    const formatCheckedDays = (checkedDays) => {
        if (!checkedDays || checkedDays.length === 0) return [];

        const sortedDates = getUniqueCheckedDays(checkedDays)
            .map(ts => ts.toDate().getTime())
            .sort((a, b) => a - b);

        const ranges = [];
        let currentRangeStart = null;
        let currentRangeEnd = null;
        let currentType = null;

        for (let i = 0; i < sortedDates.length; i++) {
            const currentDate = new Date(sortedDates[i]);
            const isRecuperated = isDateRecuperated(currentDate);
            const isAdvanced = isDateAdvanced(currentDate);
            const type = isRecuperated ? 1 : isAdvanced ? 2 : 0;

            // Not recuperated or advanced, can be part of a range
            if (!currentRangeStart) {
                currentRangeStart = currentDate;
                currentRangeEnd = currentDate;
                currentType = type;
            } else {
                const calendarDiff = differenceInCalendarDays(currentDate, currentRangeEnd);
                if (currentType === type && calendarDiff === daysDelta) {
                    currentRangeEnd = currentDate;
                } else {
                    ranges.push({ start: currentRangeStart, end: currentRangeEnd, type: currentType});
                    currentRangeStart = currentDate;
                    currentRangeEnd = currentDate;
                    currentType = type;
                }
            }
        }
        if (currentRangeStart) {
            ranges.push({ start: currentRangeStart, end: currentRangeEnd, type: currentType });
        }

        const isWeekly = isWeeklyTapasType(tapas);

        return ranges.map(range => {
            let startStr = getDateStr(range.start);
            const endStr = range.start == range.end ? null : getDateStr(range.end);
            let text;
            if (endStr) {
                text = reduceDateRange(startStr, endStr);
                if (isWeekly) {
                    text += ' (' + t('cw') + getDateWeek(range.start) + ' - ' + getDateWeek(range.end) + ')';
                }
            } else {
                text = startStr;
                if (isWeekly) {
                    text += ' (' + t('cw') + getDateWeek(range.start) + ')';
                }
            }

            return (
                <li key={text}>
                    {text}
                    {range.type===1 && <span className="text-white bg-green-500 rounded-full font-medium px-1 ml-2"
                            data-tooltip-id="my-tooltip"
                            data-tooltip-html={t('recuperated')}
                        >{t('recuperated')[0]}</span>}
                    {range.type===2 && <span className="text-white bg-purple-500 rounded-full font-medium px-1 ml-2"
                            data-tooltip-id="my-tooltip"
                            data-tooltip-html={t('advanced')}
                        >{t('advanced')[0]}</span>}
                </li>
            );
        });
    };

    const tapasVersion = tapas.version || 1;
    const sharedVersion = publicSharedTapas ? publicSharedTapas.version || 1 : 0;
    const actualDataIsNewer = publicSharedTapas && publicSharedTapas.userId === userId && sharedVersion < tapasVersion;
    const updateAvailable = publicSharedTapas && publicSharedTapas.userId !== userId && sharedVersion > tapasVersion;

    // Effect to close dropdowns when clicking outside
    useEffect(() => {
        const handleClickOutside = (event) => {
            if (tapasDropdownRef.current && !tapasDropdownRef.current.contains(event.target)) {
                setShowRecuperationAdvanceMenu(false);
            }
            if (sharedDropdownRef.current && !sharedDropdownRef.current.contains(event.target)) {
                setShowUpdateSharedTapasMenu(false);
            }
        };

        // Attach the event listener to the document body when any dropdown is open
        if (showRecuperationAdvanceMenu || showUpdateSharedTapasMenu) {
            document.addEventListener('mousedown', handleClickOutside);
        } else {
            document.removeEventListener('mousedown', handleClickOutside);
        }

        // Clean up the event listener on component unmount
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, [showRecuperationAdvanceMenu, showUpdateSharedTapasMenu]);


    const sharedInfoColor = actualDataIsNewer ? 'orange' : (updateAvailable ? 'green' : 'gray');
    const sharedInfoBgColor = actualDataIsNewer ? 'bg-orange-500' : (updateAvailable ? 'bg-green-600' : 'bg-gray-400 dark:bg-gray-600');
    const posRight = true;
    const isActiveAndValid = isActive(tapas) && isTodayValid;
    const isActiveOrCryst = isActiveOrCrystallization(tapas);

    return (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-75 flex items-center justify-center p-4 z-40 overflow-y-auto">
            <Tooltip id="my-tooltip" />
            <div className="p-6 rounded-lg shadow-xl max-w-lg w-full mx-auto my-auto bg-white text-gray-800 dark:bg-gray-800 dark:text-gray-100">
                <div className="flex justify-between items-center mb-6">
                    <h2 className="text-3xl font-bold text-gray-900 dark:text-gray-100">{displayTapasName}</h2>
                    <button onClick={onClose} className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 text-5xl font-bold">
                        &times;
                    </button>
                </div>

                {message && <p className="mb-4 text-center text-green-600 font-medium">{message}</p>}

                <div className="space-y-4 text-gray-700 dark:text-gray-300">
                    {tapas.shareReference && (
                        <div className="text-sm font-semibold text-blue-600 dark:text-blue-400">
                            {t('sharedTapas')}
                            <span className={`ml-2 text-${sharedInfoColor}-600 dark:text-${sharedInfoColor}-400`}>
                                {actualDataIsNewer && ('('+t('actualDataIsNewer')+')')}
                                {updateAvailable && ('('+t('updateAvailable')+')')}
                                <div ref={sharedDropdownRef} className="relative inline-block ml-2">
                                    <button
                                        onClick={btnShowUpdateSharedTapasMenu}
                                        className={`${sharedInfoBgColor} text-white px-2 py-1 rounded text-xs font-medium`}
                                        disabled={isOffline}
                                    >
                                        ...
                                    </button>
                                    {showUpdateSharedTapasMenu && (
                                        <div className={`absolute ${showUpdateSharedTapasMenu}-0 mt-2 w-max rounded-md shadow-lg py-1 z-20 bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-100`}>
                                            {actualDataIsNewer && (
                                                <button
                                                    onClick={handleUpdateSharedTapas}
                                                    className="block w-full text-left px-4 py-5 md:py-2 hover:bg-gray-200 dark:hover:bg-gray-600"
                                                >
                                                    {t('updateSharedTapas')}
                                                </button>
                                            )}
                                            {updateAvailable && (
                                                <button
                                                    onClick={handleUpdateFromSharedTapas}
                                                    className="block w-full text-left px-4 py-5 md:py-2 hover:bg-gray-200 dark:hover:bg-gray-600"
                                                >
                                                    {t('updateFromShared')}
                                                </button>
                                            )}
                                            <button
                                                onClick={() => setDeleteSharedTapas(true)}
                                                className="block w-full text-left px-4 py-5 md:py-2 bg-red-700 text-white hover:bg-red-600"
                                            >
                                                {t('deleteSharedTapasFromPublic')}
                                            </button>
                                            {deleteSharedTapas && (<ConfirmDialog
                                                t={t}
                                                message={t('deleteSharedTapasFromPublic') + ':"' + displayTapasName + '" ?'}
                                                onConfirm={handleDeleteSharedTapas}
                                                onCancel={() => setDeleteSharedTapas(false)}
                                            />)}
                                        </div>
                                    )}
                                </div>
                            </span>
                        </div>
                    )}
                    {noDuration ? (
                        <p><strong className="font-semibold">{t('startDate')}:</strong> {tapas.startDate?.toDate().toLocaleDateString()}</p>
                    ) : (<>
                            <p><strong className="font-semibold">{t('timeframe')}:</strong> {reduceDateRange(tapas.startDate?.toDate().toLocaleDateString(), endDate?.toLocaleDateString())}
                            </p>
                            {tapas.startTime && <p><strong className="font-semibold">{t('startTime')}:</strong> {tapas.startTime}</p>}
                            <p>
                                <strong className="font-semibold">{t('duration')}:</strong> {totalUnitsInt} {t(unitNoInt)}
                            </p>
                        </>
                    )}
                    {isNoTapasType(tapas) ? (
                        <p><strong className="font-semibold">{t('schedule')}:</strong> {t(tapas.scheduleType)}</p>
                    ) : (
                        <>
                            {isIntervalTapasType(tapas) && (
                            <p><strong className="font-semibold">{t('schedule')}:</strong> {totalUnitsSchedule} {t('days')}</p>
                            )}
                            {tapas.acknowledgeAfter && <p><strong className="font-semibold">{t('acknowledgeAfter')}:</strong> {t('yes')}</p>}
                        </>
                    )}
                    {displayDescription && (
                        <div>
                            <strong className="font-semibold">{t('description')}:</strong>
                            <LexicalHtmlRenderer editorStateHtml={displayDescription} />
                        </div>
                    )}
                    {displayGoals && displayGoals.length > 0 ? (
                        <div>
                            <strong className="font-semibold">{t('goals')}:</strong>
                            <ul className="list-disc ml-4">
                                {displayGoals.map((goal, index) => (
                                    <li className="ml-4" key={`goal-${index}`}>{goal}</li>
                                ))}
                            </ul>
                        </div>
                    ) : (
                        <p className="italic text-gray-500 dark:text-gray-400">{t('noGoalsDefinedYet')}</p>
                    )}
                    {displayParts && displayParts.length > 0 ? (
                        <div>
                            <strong className="font-semibold">{t('parts')}:</strong>
                            <ul className={`list-${isActiveAndValid ? 'none' : 'disc'} ml-4 space-y-2`}>
                                {displayParts.map((part, index) => (
                                    <li key={index} className={`${isActiveAndValid ? 'flex space-x-2' : 'ml-4'}`}>
                                        {isActiveAndValid && (
                                            <input
                                                type="checkbox"
                                                checked={!!checkedPartsSelection[index]}
                                                onChange={() => handlePartCheckboxChange(index)}
                                                className="form-checkbox mt-1 h-4 w-4 text-indigo-600 rounded"
                                                disabled={isTodayChecked}
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
                    {isActiveOrCryst && (<>
                        <div className="text-sm font-medium text-gray-700 dark:text-gray-300">
                            {displayDateInfoPre && (<span>{displayDateInfoPre}</span>)}
                            <p>{displayDateInfo}</p>
                        </div>
                        <div className="flex justify-between space-x-2"> {/* Use justify-between to push the "..." to the right */}
                            <div className="flex space-x-2">
                                {!isTodayChecked && isTodayValid && !tapas.acknowledgeAfter && (
                                    <button
                                        onClick={() => handleMarkUnitFinished(tapasToday)}
                                        className="bg-green-600 text-white px-4 py-2 rounded-lg shadow-md hover:bg-green-700 transition-colors duration-200 text-sm font-medium"
                                    >
                                        {t('confirmX', t(getByTapasIntervalType(tapas, 'thisMonthX', 'thisWeekX', 'todayX', 'thisIntervalX'), ''))}
                                    </button>
                                )}
                                {!isYesterdayChecked && isYesterdayValid && (
                                    <button
                                        onClick={() => handleMarkUnitFinished(yesterday)}
                                        className="bg-blue-600 text-white px-4 py-2 rounded-lg shadow-md hover:bg-blue-700 transition-colors duration-200 text-sm font-medium"
                                    >
                                        {t('confirmX', t(getByTapasIntervalType(tapas, 'lastMonthX', 'lastWeekX', 'yesterdayX', 'lastIntervalX'), ''))}
                                    </button>
                                )}
                            </div>
                            <div ref={tapasDropdownRef} className="relative">
                                <button
                                    onClick={() => setShowRecuperationAdvanceMenu(!showRecuperationAdvanceMenu)}
                                    className="bg-blue-500 text-white px-4 py-2 rounded-lg shadow-lg hover:bg-blue-600 transition-colors duration-200 text-lg font-medium"
                                >
                                    ...
                                </button>
                                {showRecuperationAdvanceMenu && (
                                    <div className="absolute right-0 mt-2 w-max rounded-md shadow-lg py-1 z-20 bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-100">
                                        {tapas.allowRecuperation && !isYesterdayChecked && !isBefore(yesterday, startDateObj) && !isAfter(yesterday, endDateObj) && (
                                            <button
                                                onClick={() => handleRecuperateUnit(yesterday)}
                                                className="block w-full text-left px-4 py-5 md:py-2 hover:bg-gray-200 dark:hover:bg-gray-600"
                                            >
                                                {getByTapasIntervalType(tapas, t('lastMonthX', t('recuperatedW')), t('lastWeekX', t('recuperatedW')),
                                                    t('yesterdayX', t('recuperatedD')), t('lastIntervalX', t('recuperatedW')))}
                                            </button>
                                        )}
                                        {tapas.allowRecuperation && !isMonthlyTapasType(tapas) && !isBeforeYesterdayChecked && !isBefore(beforeYesterday, startDateObj) && !isAfter(beforeYesterday, endDateObj) && (
                                            <button
                                                onClick={() => handleRecuperateUnit(beforeYesterday)}
                                                className="block w-full text-left px-4 py-5 md:py-2 hover:bg-gray-200 dark:hover:bg-gray-600"
                                            >
                                                {getByTapasIntervalType(tapas, t('beforeLastMonthX', t('recuperatedW')), t('beforeLastWeekX', t('recuperatedW')),
                                                    t('beforeYesterdayX', t('recuperatedD')), t('beforeLastIntervalX', t('recuperatedW')))}
                                            </button>
                                        )}
                                        {!isNoTapasType(tapas) && isDailyTapasType(tapas) && (!isTodayChecked || !isTomorrowChecked) && !isBefore(tapasToday, startDateObj) && !isAfter(tapasToday, endDateObj) && (
                                            <button
                                                onClick={handleAdvanceUnits}
                                                className="block w-full text-left px-4 py-5 md:py-2 hover:bg-gray-200 dark:hover:bg-gray-600"
                                            >
                                                {t((isWeeklyTapasType(tapas) ? 'thisNextWeek' : 'todayTomorrow') + 'FinishedInAdvance')}
                                            </button>
                                        )}
                                        <button
                                            onClick={showAcknowledgeDateRangeMenu}
                                            className="block w-full text-left px-4 py-5 md:py-2 hover:bg-gray-200 dark:hover:bg-gray-600"
                                        >
                                            {t('acknowledgeN', t(getTypeUnit(tapas)))}
                                        </button>
                                        {tapas.checkedDays && tapas.checkedDays.length > 0 && (
                                            <button
                                                onClick={handleClearLastUnit}
                                                className="block w-full text-left px-4 py-5 md:py-2 hover:bg-gray-200 dark:hover:bg-gray-600"
                                            >
                                                {t('clearX', t('last' + (getByTapasIntervalType(tapas, 'Month', 'Week', 'Day', 'Interval'))))}
                                            </button>
                                        )}
                                    </div>
                                )}
                            </div>
                        </div>
                    </>)}
                    {tapas.crystallizationTime && <p><strong className="font-semibold">{t('crystallizationTime')}:</strong> {tapas.crystallizationTime} {t('days')}</p>}
                    <p><strong className="font-semibold">{t('status')}:</strong> <span className={`font-bold ${isActive(tapas) ? 'text-blue-600' : isCrystallization(tapas) ? 'text-indigo-600' : isSuccessfulOrFinished(tapas) ? 'text-green-600' : 'text-red-600'}`}>{t(tapas.status)}</span></p>
                    {!isNoTapasType(tapas) && (<p className="text-lg mt-4 text-gray-700 dark:text-gray-200">
                        <strong className="font-semibold">{t('overallProgress')}:</strong> {checkedUnitsCount} / {totalUnits} {t('xChecked', t(unit))}
                    </p>)}
                    {tapas.failureCause && <p><strong className="font-semibold">{t('causeOfFailure')}:</strong> {tapas.failureCause}</p>}
                    <ResultHistoryView
                        tapas={tapas}
                        endDate={endDate}
                        db={db}
                        userId={userId}
                        t={t}
                        modalState={modalState}
                        setInitMessage={setInitMessage}
                        setTapasDetailMessage={setMessage}
                        setSelectedTapas={setSelectedTapas}
                        setDetailResults={setResults}
                        myAddDoc={myAddDoc} myUpdateDoc={myUpdateDoc} myDeleteDoc={myDeleteDoc}
                    />

                    {tapas.checkedDays && tapas.checkedDays.length > 0 && (
                        <div>
                            <div className="row">
                                <strong className="font-semibold">{t('checkedDates')}: </strong>
                                <button
                                    onClick={() => setShowCheckedDetails(true)}
                                    className="bg-green-600 hover:bg-green-700 text-white align-middle px-1 ml-1 rounded-full text-xs font-medium"
                                >
                                    {t('overview')}
                                </button>
                            </div>
                            <ul className="list-disc list-inside ml-4">
                                {formatCheckedDays(tapas.checkedDays)}
                            </ul>
                        </div>
                    )}
                    {tapas.userId === userId && tapas.shareReference && publicSharedTapas && (
                        <div className="mt-4 text-sm">
                            <p><strong className="font-semibold">{t('sharedCount')}:</strong> {publicSharedTapas.sharedCount || 0}</p>
                            <p><strong className="font-semibold">{t('adoptedCount')}:</strong> {publicSharedTapas.adoptedCount || 0}</p>
                        </div>
                    )}
                </div>

                <div className="mt-8 flex flex-wrap justify-center gap-4">
                    {isActive(tapas) && !isNoTapasType(tapas) && (
                        <button
                            onClick={handleMarkFailed}
                            className="bg-red-600 text-white px-6 py-3 rounded-lg shadow-lg hover:bg-red-700 transition-colors duration-200 text-lg font-medium"
                        >
                            {t('markAsFailed')}
                        </button>
                    )}
                    {!isSuccessfulOrFinished(tapas) && !isFailed(tapas) && (
                        <button
                            onClick={() => onEdit(tapas)}
                            className="bg-yellow-500 text-white px-6 py-3 rounded-lg shadow-lg hover:bg-yellow-600 transition-colors duration-200 text-lg font-medium"
                        >
                            {t('editTapas')}
                        </button>
                    )}
                    {(isSuccessful(tapas) || isFailed(tapas)) && (
                        <button
                            onClick={handleRepeat}
                            className="bg-purple-600 text-white px-6 py-3 rounded-lg shadow-lg hover:bg-purple-700 transition-colors duration-200 text-lg font-medium"
                        >
                            {t('repeatTapas')}
                        </button>
                    )}

                    {!isNoTapasType(tapas) && (
                        <button
                            onClick={handleShareTapas}
                            className="flex items-center justify-center bg-indigo-500 text-white px-6 py-3 rounded-lg shadow-lg hover:bg-indigo-600 transition-colors duration-200 text-lg font-medium"
                            disabled={isOffline}
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
                        {t('deleteX', t('tapas'))}
                    </button>
                </div>

                {confirmDelete && (
                    <div className="mt-6 p-4 border rounded-lg bg-red-50 border-red-300 dark:bg-red-900 dark:border-red-700">
                        <p className="text-center mb-3 text-red-800 dark:text-red-100">{t('confirmDeletion')} "<strong className="font-semibold">{getLocalizedContent(tapas.name, locale)}</strong>" {t('below')}:</p>
                        <input
                            type="text"
                            value={confirmName}
                            maxLength="120"
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

                {failedModal.isOpen && (<RepeatTapas title='markTapasAsFailed' question='sureMarkFailed'
                    failureCause={failureCause} setFailureCause={setFailureCause} t={t}
                    initRepeatOption='none' tapas={tapas} locale={locale}
                    intervalUnit={intervalUnit} totalUnitsSchedule={totalUnitsSchedule} unit={unitNoInt}
                    endDate={endDateObj} today={today}
                    setRepeatOption={setRepeatOption} setNewRepeatDuration={setNewRepeatDuration}
                    confirm='confirmFail' onCancel={failedModal.close} onConfirm={confirmFail} isFailed={true}
                />)}

                {showCheckedDetails && (<CheckedDetails
                    tapas={tapas}
                    config={config}
                    onClose={() => setShowCheckedDetails(false)}
                    selectedTapasLanguage={selectedTapasLanguage}
                    t={t}
                />)}

                {repeatModal.isOpen && (<RepeatTapas title='repeatTapas' question='sureRepeat'
                    failureCause={failureCause} setFailureCause={setFailureCause} t={t}
                    initRepeatOption='sameDuration' tapas={tapas} locale={locale}
                    intervalUnit={intervalUnit} totalUnitsSchedule={totalUnitsSchedule} unit={unitNoInt}
                    endDate={endDateObj} today={today}
                    setRepeatOption={setRepeatOption} setNewRepeatDuration={setNewRepeatDuration}
                    confirm='confirmRepeat' onCancel={repeatModal.close} onConfirm={confirmRepeat}
                />)}
            </div>
        </div>
    );
};


// Component for statistics
const Statistics = ({ allTapas }) => {
    const { t } = useContext(AppContext);
    const [statisticsTimeFilter, setStatisticsTimeFilter] = useState('all');
    const today = startOfDay(new Date());

    const filterTapasByTime = useCallback((tapasList) => {
        if (statisticsTimeFilter === 'all') {
            return tapasList;
        }

        let filterDate = startOfDay(new Date());

        switch (statisticsTimeFilter) {
            case '1month':
                filterDate = subMonths(filterDate, 1);
                break;
            case '3months':
                filterDate = subMonths(filterDate, 3);
                break;
            case '1year':
                filterDate = subYears(filterDate, 1);
                break;
            case '2years':
                filterDate = subYears(filterDate, 2);
                break;
            default:
                break;
        }

        return tapasList.filter(tapas => {
            const completionDate = !isActiveOrCrystallization(tapas) && tapas.completionDate ? tapas.completionDate.toDate() : tapas.createdAt.toDate();
            if (!isBefore(completionDate, filterDate)) { // completionDate >= filterDate
                return true;
            }

            if (!tapas.duration) {
                return false;
            }

            const startDate = startOfDay(tapas.startDate.toDate());
            const endDate = addDays(startDate, tapas.duration - 1);
            return !isBefore(endDate, filterDate);
        });
    }, [statisticsTimeFilter]);

    const filteredTapas = filterTapasByTime(allTapas);

    const successfulTapas = filteredTapas.filter(tapas => isSuccessfulOrCrystallization(tapas));
    const failedTapas = filteredTapas.filter(tapas => isFailed(tapas));
    const activeTapas = filteredTapas.filter(tapas =>
        isActive(tapas) && !isNoTapasType(tapas) && !isAfter(startOfDay(tapas.startDate.toDate()), today));
    const pendingTapas = filteredTapas.filter(tapas =>
        isActive(tapas) && !isNoTapasType(tapas) && isAfter(startOfDay(tapas.startDate.toDate()), today));

    const calculateAverageDuration = (tapasList) => {
        if (tapasList.length === 0) return 0;
        const totalDuration = tapasList.reduce((sum, tapas) => sum + tapas.duration, 0);
        return (totalDuration / tapasList.length).toFixed(1);
    };

    const countRecuperations = (tapasList) => {
        if (tapasList.length === 0) return 0;
        const totalRecDuration = tapasList.reduce((sum, tapas) => sum + tapas.recuperatedDays.length, 0);
        return totalRecDuration;
    };

    const calculateAverageRecuperations = (tapasList, active=false) => {
        if (tapasList.length === 0) return 0;
        const totalRecDuration = tapasList.reduce((sum, tapas) => sum + tapas.recuperatedDays.length, 0);
        let totalDuration;
        if (active) {
            totalDuration = tapasList.reduce((sum, tapas) =>
                sum + Math.min(tapas.duration, differenceInCalendarDays(today, startOfDay(tapas.startDate.toDate())) + 1), 0);
        } else {
            totalDuration = tapasList.reduce((sum, tapas) => sum + tapas.duration, 0);
        }
        return (totalRecDuration / totalDuration * 100).toFixed(1);
    };

    const countAdvanced = (tapasList) => {
        if (tapasList.length === 0) return 0;
        const totalRecDuration = tapasList.reduce((sum, tapas) => sum + tapas.advancedDays.length, 0);
        return totalRecDuration;
    };

    const calculateAverageAdvanced = (tapasList) => {
        if (tapasList.length === 0) return 0;
        const totalRecDuration = tapasList.reduce((sum, tapas) => sum + tapas.advancedDays.length, 0);
        const totalDuration = tapasList.reduce((sum, tapas) => sum + tapas.duration, 0);
        return (totalRecDuration / totalDuration * 100).toFixed(1);
    };

    const avgSuccessfulDuration = calculateAverageDuration(successfulTapas);
    const avgFailedDuration = calculateAverageDuration(failedTapas);
    const avgActiveDuration = calculateAverageDuration(activeTapas);

    const countSuccessfulRecuperations = countRecuperations(successfulTapas);
    const countFailedRecuperations = countRecuperations(failedTapas);
    const countActiveRecuperations = countRecuperations(activeTapas);

    const avgSuccessfulRecuperationsPerc = calculateAverageRecuperations(successfulTapas);
    const avgFailedRecuperationsPerc = calculateAverageRecuperations(failedTapas);
    const avgActiveRecuperationsPerc = calculateAverageRecuperations(activeTapas, true);

    const countSuccessfulAdvanced = countAdvanced(successfulTapas);
    const countFailedAdvanced = countAdvanced(failedTapas);
    const countActiveAdvanced = countAdvanced(activeTapas);

    const avgSuccessfulAdvancedPerc = calculateAverageAdvanced(successfulTapas);
    const avgFailedAdvancedPerc = calculateAverageAdvanced(failedTapas);
    const avgActiveAdvancedPerc = calculateAverageAdvanced(activeTapas);

    const calculateAverageCompletion = (tapasList) => {
        if (tapasList.length === 0) return 0;
        const totalCompletion = tapasList.reduce((sum, tapas) => {
            const checkedDaysCount = tapas.checkedDays ? getUniqueCheckedDays(tapas.checkedDays).length : 0;
            return sum + (checkedDaysCount / tapas.duration);
        }, 0);
        return (totalCompletion / tapasList.length * 100).toFixed(1);
    };

    const avgFailedCompletionPercentage = calculateAverageCompletion(failedTapas);


            //<h2 className="text-2xl font-bold mb-4 text-gray-800 dark:text-gray-100">{t('tapasStatistics')}</h2>
    return (
        <div className="p-4 rounded-lg shadow-md mb-6 bg-white dark:bg-gray-800">

            <div className="mb-4 flex flex-col sm:flex-row justify-center items-center gap-4">
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
                    <p>{t('count')}: <span className="font-bold">{activeTapas.length}</span>
                    {pendingTapas.length > 0 && (
                        <span className="font-bold"> ({t('pending')} {pendingTapas.length})</span>
                    )}
                    {activeTapas.length > 0 && (
                        <span className="px-5">{t('avgDuration')}: <span className="font-bold">{avgActiveDuration} {t('days').toLowerCase()}</span></span>
                    )}
                    </p>
                    <p>
                    {countActiveRecuperations > 0 && (
                        <span className="capitalize">{t('recuperated')}: <span className="font-bold">{countActiveRecuperations}x ({avgActiveRecuperationsPerc}%)</span></span>
                    )}
                    {countActiveAdvanced > 0 && (
                        <span className="px-5 capitalize">{t('advanced')}: <span className="font-bold">{countActiveAdvanced}x ({avgActiveAdvancedPerc}%)</span></span>
                    )}
                    </p>
                </div>

                <div className="p-4 rounded-lg shadow bg-blue-50 text-blue-800 dark:bg-blue-900 dark:text-blue-100">
                    <h3 className="text-xl font-semibold mb-2">{t('successfulTapasCount')}</h3>
                    <p>{t('count')}: <span className="font-bold">{successfulTapas.length}</span>
                    {successfulTapas.length > 0 && (
                        <span className="px-5">{t('avgDuration')}: <span className="font-bold">{avgSuccessfulDuration} {t('days').toLowerCase()}</span></span>
                    )}
                    </p>
                    <p>
                    {countSuccessfulRecuperations > 0 && (
                        <span className="capitalize">{t('recuperated')}: <span className="font-bold">{countSuccessfulRecuperations}x ({avgSuccessfulRecuperationsPerc}%)</span></span>
                    )}
                    {countSuccessfulAdvanced > 0 && (
                        <span className="px-5 capitalize">{t('advanced')}: <span className="font-bold">{countSuccessfulAdvanced}x ({avgSuccessfulAdvancedPerc}%)</span></span>
                    )}
                    </p>
                </div>

                <div className="p-4 rounded-lg shadow bg-red-50 text-red-800 dark:bg-red-900 dark:text-red-100">
                    <h3 className="text-xl font-semibold mb-2">{t('failedTapasCount')}</h3>
                    <p>{t('count')}: <span className="font-bold">{failedTapas.length}</span>
                    {failedTapas.length > 0 && (
                        <>
                        <span className="px-5">{t('avgDuration')}: <span className="font-bold">{avgFailedDuration} {t('days').toLowerCase()}</span></span>
                        <span>{t('avgDone')}: <span className="font-bold">{avgFailedCompletionPercentage}%</span></span>
                        </>
                    )}
                    </p>
                    <p>
                    {countFailedRecuperations > 0 && (
                        <span className="capitalize">{t('recuperated')}: <span className="font-bold">{countFailedRecuperations}x ({avgFailedRecuperationsPerc}%)</span></span>
                    )}
                    {countFailedAdvanced > 0 && (
                        <span className="px-5 capitalize">{t('advanced')}: <span className="font-bold">{countFailedAdvanced}x ({avgFailedAdvancedPerc}%)</span></span>
                    )}
                    </p>
                </div>
            </div>
        </div>
    );
};

// Component for Results
const Results = ({ tapas, setSelectedTapas, modalState, myAddDoc, myUpdateDoc, myDeleteDoc }) => {
    const { locale } = useContext(LocaleContext);
    const { db, userId, t } = useContext(AppContext);
    const [statusFilter, setStatusFilter] = useState('all');
    const [showExtendedFilters, setShowExtendedFilters] = useState(false);
    const [nameFilter, setNameFilter] = useState('');
    const [textFilter, setTextFilter] = useState('');
    const [nameOnly, setNameOnly] = useState('');
    const [results, setResults] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [resultsMessage, setResultsMessage] = useState('');
    const [selectedResult, setSelectedResult] = useState(null);
    const [update, setUpdate] = useState(0);
    const editResultModal = modalState.getModalProps("editResult");

    const tapasListenersRef = useRef([]);

    const clearNameOnly = () => {
        setNameOnly('');
    };

    useEffect(() => {
        let filtered = tapas;
        if (statusFilter !== 'all') {
            filtered = filtered.filter(tapas => tapas.status === statusFilter);
        }

        if (nameOnly) {
            filtered = filtered.filter(tapas => getLocalizedContent(tapas.name, locale) == nameOnly);
        } else if (nameFilter) {
            const sname = nameFilter.toLowerCase();
            filtered = filtered.filter(tapas => getLocalizedContent(tapas.name, locale).toLowerCase().indexOf(sname) !== -1);
        }

        const stext = textFilter.toLowerCase();

        const cleanupListeners = () => {
            tapasListenersRef.current.forEach(unsubscribe => unsubscribe());
            tapasListenersRef.current = [];
        };

        const fetchAndListenToAllTapasResults = async () => {
            setIsLoading(true);
            cleanupListeners(); // Vorherige Listener abmelden

            if (filtered.length === 0) {
                setIsLoading(false);
                setResults([]);
                return;
            }

            const tempResultsMap = new Map();
            let listenersReadyCount = 0;
            let listenersExpected = filtered.length;

            let working = true;
            const done = () => {
                const combinedResults = Array.from(tempResultsMap.values()).flat();
                const sortedWithFallback = combinedResults.sort((a, b) => {
                    const dateA = a.date ? a.date.toMillis() : 0;
                    const dateB = b.date ? b.date.toMillis() : 0;
                    return dateA - dateB;
                });
                if (sortedWithFallback.length > 0) {
                    sortedWithFallback[0].showDate = true;
                }
                for (let index = sortedWithFallback.length-1; index > 0; --index) {
                    const el1 = sortedWithFallback[index-1];
                    const el2 = sortedWithFallback[index];
                    const hideDate = el1.date && el2.date && isSameDay(el1.date.toDate(), el2.date.toDate());
                    sortedWithFallback[index].showDate = !hideDate;
                    if (hideDate) {
                        if (el1.name && el2.name) {
                            sortedWithFallback[index].name = '';
                        }
                    }
                }
                working = false;
                setResults(sortedWithFallback);
                setIsLoading(false);
            };

            filtered.forEach(tapasItem => {
                const tapasName = getLocalizedContent(tapasItem.name, locale);
                if (typeof tapasItem.results !== 'number' && tapasItem.results) {
                    const res = { tapasId: tapasItem.id, name: tapasName, id: null, content: tapasItem.results, date: null , changedDate: null };
                    if (!textFilter || res.content.toLowerCase().indexOf(stext) !== -1) {
                        tempResultsMap.set(tapasItem.id, [res]);
                    }
                    listenersReadyCount++;
                } else if (tapasItem.results > 0) {
                    const resultsColRef = collection(db, 'artifacts', __app_id, 'users', userId, 'tapas', tapasItem.id, 'results');
                    const unsub = onSnapshot(query(resultsColRef, orderBy('date')), (snapshot) => {
                        const resultsData = snapshot.docs.map(doc => ({
                            tapasId: tapasItem.id, 
                            id: doc.id,
                            ...doc.data(),
                        }));

                        const sortedWithFallback = resultsData.sort((a, b) => {
                            const dateA = a.date ? a.date.toMillis() : 0;
                            const dateB = b.date ? b.date.toMillis() : 0;
                            return dateA - dateB;
                        });

                        const res = [];
                        sortedWithFallback.forEach(resultItem => {
                            if (!textFilter || resultItem.content.toLowerCase().indexOf(stext) !== -1) {
                                res.push({name: tapasName, ...resultItem});
                            }
                        });

                        tempResultsMap.set(tapasItem.id, res);

                        // Loading nur beim ersten Durchlauf aller Listener ausschalten
                        if (listenersReadyCount < listenersExpected) {
                            listenersReadyCount++;
                            if (listenersReadyCount === listenersExpected) {
                                done();
                            }
                        }
                    }, (error) => {
                        console.error("Error getting results: ", error);
                        if (listenersReadyCount < listenersExpected) {
                            listenersReadyCount++;
                            if (listenersReadyCount === listenersExpected) {
                                done();
                            }
                        }
                        setResultsMessage("Failed to load results.");
                    });

                    tapasListenersRef.current.push(unsub);
                } else {
                    listenersReadyCount++;
                }

                if (working && listenersReadyCount === listenersExpected) {
                    done();
                }
            });
        };

        fetchAndListenToAllTapasResults();
        return cleanupListeners;
    }, [statusFilter, nameFilter, nameOnly, textFilter, update]);

    useEffect(() => {
        if (!isLoading) {
            const resultsDiv = document.getElementById('results');
            if (resultsDiv) {
                resultsDiv.scrollTop = resultsDiv.scrollHeight;
            }
        }
    }, [isLoading]);

    return (
        <div className="space-y-4">
            <div className="p-4 rounded-lg shadow-md mb-6 bg-white dark:bg-gray-800">
                <button onClick={() => {setShowExtendedFilters(!showExtendedFilters)}} className="ml-3 float-right text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 text-2xl font-bold">
                    ...
                </button>
                <div className="flex flex-col md:flex-row justify-around items-center gap-4">
                    {showExtendedFilters && (
                        <div className="flex items-center space-x-2">
                            <span className="font-medium text-gray-700 dark:text-gray-300">{t('status')}:</span>
                            <select
                                value={statusFilter}
                                onChange={(e) => setStatusFilter(e.target.value)}
                                className="px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 bg-white border-gray-300 text-gray-900 dark:bg-gray-700 dark:border-gray-600 dark:text-gray-100"
                            >
                                <option value="all">{t('all')}</option>
                                <option value="active">{t('active')}</option>
                                <option value="successful">{t('successful')}</option>
                                <option value="failed">{t('failed')}</option>
                            </select>
                        </div>
                    )}
                    <div className="flex items-center space-x-2">
                        {showExtendedFilters && (<span className="font-medium text-gray-700 dark:text-gray-300">{t('results')}:</span>)}
                        <input
                            type="search"
                            placeholder={t('searchByText')+"..."}
                            value={textFilter}
                            maxLength="120"
                            onChange={(e) => setTextFilter(e.target.value)}
                            className="px-3 py-2 min-w-2 rounded-md border border-gray-300 w-full"
                        />
                    </div>
                    {(showExtendedFilters || nameOnly) && (
                        <div className="flex items-center space-x-2">
                            {showExtendedFilters && (<span className="font-medium text-gray-700 dark:text-gray-300">{t('tapas')}:</span>)}
                            {nameOnly ? (
                                <>
                                <p className="text-gray-500">{nameOnly}</p>
                                <button onClick={clearNameOnly} className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 text-2xl font-bold">
                                    &times;
                                </button>
                                </>
                            ) : (
                                <input
                                    type="search"
                                    placeholder={t('searchByName')+"..."}
                                    value={nameFilter}
                                    maxLength="120"
                                    onChange={(e) => setNameFilter(e.target.value)}
                                    className="px-3 py-2 rounded-md border border-gray-300 w-full"
                                />
                            )}
                        </div>
                    )}
                </div>
            </div>
            {resultsMessage && (
                <div className={`p-3 text-center ${resultsMessage.includes(t('successful').toLowerCase()) ? 'text-green-700' : 'text-red-700'} mx-auto mt-4 max-w-lg`}>
                    {resultsMessage}
                </div>
            )}
            {isLoading ? (
                <div className="text-gray-500 dark:text-gray-400">{t('loadingX', t('results'))}...</div>
            ) : (
                <div className="space-y-2">
                    {results.length === 0 ? (
                        <p className="text-center py-8 text-gray-600 dark:text-gray-400">{t('noResultsFound')}</p>
                    ) : (
                        <div className="max-h-half overflow-y-auto" id="results">
                            {results.map((res, index) => (
                                <div key={res.id}>
                                    {res.showDate && res.date && (
                                        <div className="flex items-center justify-center mt-2">
                                        <p className="px-2 text-xs font-bold font-mono border rounded-lg text-gray-800 dark:text-gray-200 bg-gray-200 dark:bg-gray-700">
                                            {res.date.toDate().toLocaleDateString()}
                                        </p>
                                        </div>
                                    )}
                                    <div className="relative px-4 py-1">
                                        {res.name && (
                                            <h4
                                                className="cursor-pointer mb-1 text-gray-700 dark:text-gray-300"
                                                onClick={(e) => {setNameOnly(e.target.innerText)}}
                                            >
                                                {res.name}
                                            </h4>
                                        )}
                                        <div
                                            className="ml-3 rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 cursor-pointer"
                                            onClick={() => {
                                                setSelectedResult(res);
                                                editResultModal.open();
                                            }}
                                        >
                                            <p className="ml-1 whitespace-pre-wrap">{res.content}</p>
                                            <p className="text-right mx-4 text-xs font-mono text-gray-600 dark:text-gray-400">
                                                {res.changedDate ? ' (' + t('edited') + ')' : ''} {res.date ? res.date.toDate().toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}) : ''}
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            )}
            {editResultModal.isOpen && (
                <EditResultModal
                    onClose={editResultModal.close}
                    db={db}
                    t={t}
                    userId={userId}
                    allTapas={tapas}
                    tapasId={selectedResult.tapasId}
                    result={selectedResult}
                    setSelectedTapas={setSelectedTapas}
                    setMessage={setResultsMessage}
                    myAddDoc={myAddDoc}
                    myUpdateDoc={myUpdateDoc}
                    myDeleteDoc={myDeleteDoc}
                    onResultAdded={() => {setUpdate(update+1);}}
                />
            )}
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

                {t('helpContents').map((helpItem, index) => {
                    return (
                        <div key={index} className="mb-4">
                          <p className="text-base font-bold text-blue-700 dark:text-blue-300">{helpItem.q}</p>
                          <p className="text-sm">{helpItem.a}</p>
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
    const { db, userId, t, locale } = useContext(AppContext);
    const [sharedTapas, setSharedTapas] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    const appId = typeof __app_id !== 'undefined' ? __app_id : 'default-app-id';
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
                    setError(t('sharedTapasNotFound'));
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

    }, [db, shareReference, appId, publicSharedTapasCollectionRef]);

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
                name: sharedTapas.name, // Adopt multi-language name
                startDate: sharedTapas.startDate || new Date(), // New Tapas starts today for the adopting user
                startTime: sharedTapas.startTime || null,
                duration: sharedTapas.duration,
                description: sharedTapas.description || null, // Adopt multi-language description
                goals: sharedTapas.goals || [], // Adopt multi-language goals
                parts: sharedTapas.parts || [], // Adopt multi-language parts
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
                languages: sharedTapas.languages || {}, // Inherit custom languages
                version: sharedTapas.version || 1, // Inherit the version from shared tapas
            };

            await addDoc(collection(db, `artifacts/${appId}/users/${userId}/tapas`), newTapasData);

            // Increment adoptedCount in the public shared document
            await updateDoc(doc(publicSharedTapasCollectionRef, sharedTapas.id), {
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
            <div className="flex justify-center items-center h-screen">
                <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-indigo-500"></div>
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

    const displayTapasName = getLocalizedContent(sharedTapas.name, locale);
    const displayDescription = getLocalizedContent(sharedTapas.description, locale);
    const displayGoals = getLocalizedContent(sharedTapas.goals, locale);
    const displayParts = getLocalizedContent(sharedTapas.parts, locale);


    const pageTitle = `${displayTapasName} - ${t('appName')}`;
    const pageDescription = displayDescription || `${t('appName')}: ${t('trackPersonalGoals')}`;
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
                    <h2 className="text-3xl font-bold text-gray-900 dark:text-gray-100">{displayTapasName}</h2>
                    <button onClick={onClose} className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 text-3xl font-bold">
                        &times;
                    </button>
                </div>

                <div className="space-y-4 text-gray-700 dark:text-gray-300">
                    {sharedTapas.startDate && (<p><strong className="font-semibold">{t('timeframe')}:</strong> {sharedTapas.startDate?.toDate().toLocaleDateString()} - {endDate?.toLocaleDateString()}</p>)}
                    {sharedTapas.startTime && <p><strong className="font-semibold">{t('startTime')}:</strong> {sharedTapas.startTime}</p>}
                    <p><strong className="font-semibold">{t('duration')}:</strong> {Math.ceil(sharedTapas.duration / getTotalUnits(sharedTapas.scheduleType))} {t(getTypeUnitNoInterval(sharedTapas)).toLowerCase()}</p>
                    {sharedTapas.scheduleType === 'everyNthDays' && (
                    <p><strong className="font-semibold">{t('schedule')}:</strong> {t('Ntimes', Math.ceil(sharedTapas.duration / sharedTapas.scheduleInterval))} {t('everyNthDays', sharedTapas.scheduleInterval).toLowerCase()} {t('days')}</p>
                    )}
                    {sharedTapas.acknowledgeAfter && <p><strong className="font-semibold">{t('acknowledgeAfter')}:</strong> {t('yes')}</p>}
                    {displayDescription && (<div><strong className="font-semibold">{t('description')}:</strong>
                            <LexicalHtmlRenderer editorStateHtml={displayDescription} />
                        </div>
                    )}
                    {displayGoals && displayGoals.length > 0 ? (
                        <div>
                            <strong className="font-semibold">{t('goals')}:</strong>
                            <ul className="list-disc list-inside ml-4">
                                {displayGoals.map((goal, index) => (
                                    <li key={`goal-${index}`}>{goal}</li>
                                ))}
                            </ul>
                        </div>
                    ) : (
                        <p className="italic text-gray-500 dark:text-gray-400">{t('noGoalsDefinedYet')}</p>
                    )}
                    {displayParts && displayParts.length > 0 ? (
                        <div>
                            <strong className="font-semibold">{t('parts')}:</strong>
                            <ul className="list-disc list-inside ml-4">
                                {displayParts.map((part, index) => (
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
        fetch('LICENSE')
        .then(response => {
            return response.text()
        })
        .then((data) => {
            setData(data)
            setLoading(false)
        })
    }, [])
 
    return (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-75 flex items-center justify-center p-4 z-40 overflow-y-auto">
            <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-xl w-full max-w-2xl mx-auto my-auto">
                <button onClick={onClose} className="float-right text-gray-500 hover:text-gray-700 text-5xl font-bold">
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
                <button onClick={onClose} className="float-right text-gray-500 hover:text-gray-700 text-5xl font-bold">
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

const handleClearOldResults = async (db, appId, userId, tapasId, results, myUpdateDoc, setSelectedTapas, setMessage, setInitMessage) => {
    if (setInitMessage) {
        setInitMessage('');
    }

    try {
        const tapasRef = doc(db, `artifacts/${appId}/users/${userId}/tapas`, tapasId);
        await myUpdateDoc(tapasRef, { results: results });
        setSelectedTapas(prevTapas => ({ ...prevTapas, results: results })); // Immediately update local state
    } catch (error) {
        console.error("Error saving results:", error);
        setMessage("Error saving results.");
    }
};

function getLatestVersionOnly(text) {
  // Extrahiert alles bis zum zweiten großen Header (##)
  const sections = text.split(/^## /m);
  return sections.length > 1 ? `## ${sections[1]}` : text;
}

function getVersionDiff(text, stored, current) {
  // Logik um alles zwischen der alten und neuen Version zu finden
  // In der einfachsten Form: Zeige die aktuelle Version
  return getLatestVersionOnly(text);
}

const ChangelogOverlay = ({ lastSeenVersion, onClose, t }) => {
  let stopRendering = false;

  const components = {
    h1: () => null, // Wir verstecken die Hauptüberschrift "Changelog" aus der MD.md
    h3: (props) => {
      const content = props.children?.toString() || "";
      
      // Wenn wir die Version finden, die der User schon kennt -> Stop-Schild hoch!
      if (lastSeenVersion && content.includes(lastSeenVersion)) {
        stopRendering = true;
        return null; // Die alte Version selbst auch nicht mehr anzeigen
      }

      if (stopRendering) return null;
      return <h3 {...props} className="text-lg font-semibold text-blue-600 mt-4" />;
    },
    h4: (props) => {
        if (stopRendering) return null;
        const label = props.children?.toString().toLowerCase();
        
        return (
            <h4 {...props} className="flex items-center gap-2 font-bold mt-2">
            {label.includes('added') && '✨ '}
            {label.includes('fixed') && '🛠️ '}
            {label.includes('improved') && '🚀 '}
            {label.includes('changed') && '⚙️ '}
            {label.includes('removed') && '🗑️ '}
            {props.children}
            </h4>
        );
    },
    // Alle anderen Elemente prüfen das Stop-Schild
    ul: (props) => stopRendering ? null : <ul {...props} className="list-disc ml-5 mb-4" />,
    li: (props) => stopRendering ? null : <li {...props} />,
    p: (props) => stopRendering ? null : <p {...props} />,
    hr: () => null, // Dies löscht alle Trennlinien aus dem Rendering
    "\\n": () => null, // MDX-Zeilenumbrüche ignorieren
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="bg-white dark:bg-zinc-900 rounded-xl max-w-2xl w-full max-h-[80vh] flex flex-col shadow-2xl">
        <div className="p-6 overflow-y-auto prose dark:prose-invert">
          <h2 className="text-2xl font-bold mb-6 border-b pb-2">
            {t('whatsNew')} v{appVersion}?
          </h2>
          <div className="changelog-wrapper">
            <ChangelogContent components={components} />
          </div>
        </div>
        <div className="p-4 border-t flex justify-end bg-zinc-50 dark:bg-zinc-800/50 rounded-b-xl">
          <button 
            onClick={onClose}
            className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg font-medium transition-colors shadow-lg"
          >
            {t('Iunderstand')}
          </button>
        </div>
      </div>
    </div>
  );
};

// Main App Component (now the default export for pages/index.js)
const HomePage = () => {
    const [currentPage, setCurrentPage] = useState('active');
    const [config, setConfig] = useState({});
    const [tapas, setTapas] = useState([]);
    const [selectedTapas, setSelectedTapas] = useState(null);
    const [tapasDetailMessage, setTapasDetailMessage] = useState('');
    const [editingTapas, setEditingTapas] = useState(null);
    const [showMenu, setShowMenu] = useState(false); // State for menu visibility
    const [showDataMenu, setShowDataMenu] = useState(false); // State for Data submenu visibility
    const [showTapasLanguageMenu, setShowTapasLanguageMenu] = useState(false); // New state for Tapas Language submenu
    const [selectedTapasLanguage, setSelectedTapasLanguage] = useState(null); // New state for selected Tapas language
    const [customTapasLanguages, setCustomTapasLanguages] = useState({}); // New state for custom languages from user preferences
    const fileInputRef = useRef(null); // Ref for the hidden file input
    const [sharedRef, setSharedRef] = useState(null); // New state for shared tapas reference
    const [processing, setProcessing] = useState(false);
    const [processingText, setProcessingText] = useState('');

    // State for network and persistence settings
    const [isPersistentCacheEnabled, setPersistentCacheEnabled] = useState(false);
    const [isNetworkDisabled, setNetworkDisabled] = useState(false);
    const [isFirebaseInitialized, setFirebaseInitialized] = useState(false);

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
    const [scrollPosition, setScrollPosition] = useState(-1);
    const [sharedTapasInfoMap, setSharedTapasInfoMap] = useState({}); // Moved here
    const [isOffline, setIsOffline] = useState(false);

    // History filters
    const [historyStatusFilter, setHistoryStatusFilter] = useState('all');
    const [historyTimeFilter, setHistoryTimeFilter] = useState('all');
    const [historyNameFilter, setHistoryNameFilter] = useState('');

    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [showEmailLoginForm, setShowEmailLoginForm] = useState(false); // Toggle email/password form

    const modalState = useModalState();
    const aboutModal = modalState.getModalProps("about");
    const helpModal = modalState.getModalProps("help");
    const cleanDataModal = modalState.getModalProps("cleanData");
    const configModal = modalState.getModalProps("config");
    const changelogModal = modalState.getModalProps("changelog");
    const acknowledgeDateRangeModal = modalState.getModalProps("acknowledgeDateRange");
    const tapasDetailModal = modalState.getModalProps("tapasDetail");
    const tapasEditModal = modalState.getModalProps("tapasEdit");
    const licenseModal = modalState.getModalProps("license");
    const legalNoticeModal = modalState.getModalProps("legalNotice");
    const gdprModal = modalState.getModalProps("GDPR");

    const { locale, setLocale, t } = useContext(LocaleContext);
    const { theme, toggleTheme } = useContext(ThemeContext);

    const myAddDoc = async (ref, data) => {
        if (isPersistentCacheEnabled) {
            addDoc(ref, data);
        } else {
            return await addDoc(ref, data);
        }
    };

    const myUpdateDoc = async (ref, data) => {
        if (isPersistentCacheEnabled) {
            updateDoc(ref, data);
        } else {
            return await updateDoc(ref, data);
        }
    };

    const myDeleteDoc = async (ref) => {
        if (isPersistentCacheEnabled) {
            deleteDoc(ref);
        } else {
            return await deleteDoc(ref);
        }
    };

    const myGetDoc = async (ref, useCache=false) => {
        if (useCache || (isPersistentCacheEnabled && (isNetworkDisabled || isOffline))) {
            return await getDocFromCache(ref);
        } else {
            return await getDoc(ref);
        }
    };

    const myGetDocs = async (ref) => {
        if (isPersistentCacheEnabled && (isNetworkDisabled || isOffline)) {
            return await getDocsFromCache(ref);
        } else {
            return await getDocs(ref);
        }
    };

    const closeAcknowledgeDateRangeModal = useCallback((message) => {
        if (message) {
            setTapasDetailMessage(message);
        }
    }, []);

    const handleNetworkToggle = async () => {
        const newNetworkState = !isNetworkDisabled;
        newNetworkState ? await disableNetwork(db) : await enableNetwork(db);
        localStorage.setItem('networkDisabled', newNetworkState);
        setNetworkDisabled(newNetworkState);
    };

    // Initialize Firebase and handle authentication
    useEffect(() => {
        const appId = typeof __app_id !== 'undefined' ? __app_id : 'default-app-id';

        if (firebaseConfig && firebaseConfig.apiKey) {
            if (isFirebaseInitialized) return;

            try {
                const isStandalone = window.matchMedia('(display-mode: standalone)').matches;
                const persistentCacheCookie = localStorage.getItem('persistentLocalCache');
                const networkDisabledCookie = localStorage.getItem('networkDisabled');
                const app = initializeApp(firebaseConfig);
                const usePersistentCache = persistentCacheCookie === 'true';

                let firestore;
                let authentication;
                if (db) {
                    firestore = db;
                    authentication = auth;
                } else {
                    if (typeof window !== 'undefined' && (usePersistentCache || (!persistentCacheCookie && isStandalone))) {
                        try {
                            // persistentLocalCache is required to enable offline querying
                            firestore = initializeFirestore(app, {
                                //localCache: persistentLocalCache(/*settings*/ {}),
                                localCache: persistentLocalCache(/*settings*/{tabManager: persistentSingleTabManager()}),
                            });
                            setPersistentCacheEnabled(true);
                        } catch (e) {
                            if (e.code === 'failed-precondition') {
                                console.warn("Multiple tabs open, persistence not enabled.");
                            } else if (e.code === 'unimplemented') {
                                console.warn("The browser does not support persistence.");
                            }
                        }
                    } else {
                        firestore = getFirestore(app);
                    }

                    if (usePersistentCache && networkDisabledCookie === 'true') {
                        disableNetwork(firestore);
                        setNetworkDisabled(true);
                    }

                    authentication = getAuth(app);
                    setDb(firestore);
                    setAuth(authentication);
                }

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

                        // Load user preferences for Tapas language
                        let offline = false;
                        const userPrefsRef = doc(firestore, `artifacts/${appId}/users/${user.uid}/preferences/tapas`);
                        let userPrefsSnap = null;
                        try {
                            userPrefsSnap = await myGetDoc(userPrefsRef);
                        } catch (e) {
                            userPrefsSnap = null;
                            if (e.code === 'unavailable') {
                                offline = true;
                                setIsOffline(true);
                            } else {
                                alert("Failed to connect.");
                                return;
                            }
                        }
                        if (!userPrefsSnap) {
                            try {
                                userPrefsSnap = await getDocFromCache(userPrefsRef);
                            } catch (e) {
                                return;
                            }
                        }
                        if (!userPrefsSnap) {
                            return;
                        }
                        if (userPrefsSnap.exists()) {
                            const prefs = userPrefsSnap.data();
                            setSelectedTapasLanguage(prefs.selectedTapasLanguage || null);
                        } else {
                            setSelectedTapasLanguage(null);
                        }

                        // Load config
                        const configRef = doc(firestore, `artifacts/${appId}/users/${user.uid}/config/appConfig`);
                        const useCache = usePersistentCache && offline;
                        const configSnap = await myGetDoc(configRef, useCache);
                        if (configSnap.exists()) {
                            const config = configSnap.data();
                            setConfig(config || {});
                        } else {
                            setConfig({});
                        }
                    } else {
                        setUserId(null);
                        setUserDisplayName(null);
                        setIsGuestUser(false); // No user, so not a guest user
                        setShowLoginPrompt(true); // Show login prompt if no user is authenticated
                        setSelectedTapasLanguage(null); // Clear selected Tapas language
                        setCustomTapasLanguages({}); // Clear custom languages
                        setConfig({}); // Clear config
                    }
                    setLoadingFirebase(false);
                    setFirebaseInitialized(true);
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

    // Fetch Tapas data and shared info
    useEffect(() => {
        if (!db || !userId) return;

        const appId = typeof __app_id !== 'undefined' ? __app_id : 'default-app-id';
        const tapasCollectionRef = collection(db, `artifacts/${appId}/users/${userId}/tapas`);
        const q = query(tapasCollectionRef);

        const unsubscribe = onSnapshot(q, async (snapshot) => {
            const tapasData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            // Ensure checkedDays are unique when loading from Firestore
            const cleanedTapasData = tapasData.map(tapasItem => ({
                ...tapasItem,
                checkedDays: getUniqueCheckedDays(tapasItem.checkedDays || []),
                recuperatedDays: getUniqueCheckedDays(tapasItem.recuperatedDays || []),
                advancedDays: getUniqueCheckedDays(tapasItem.advancedDays || []),
            }));
            setTapas(cleanedTapasData);

            // Gather customTapasLanguages from the loaded tapas data
            const gatheredCustomLangs = {};
            cleanedTapasData.forEach(tapasItem => {
                if (tapasItem.languages) {
                    for (const langCode in tapasItem.languages) {
                        if (tapasItem.languages.hasOwnProperty(langCode) && !translations[langCode]) {
                            gatheredCustomLangs[langCode] = tapasItem.languages[langCode];
                        }
                    }
                }
            });
            setCustomTapasLanguages(gatheredCustomLangs);

            // Fetch shared tapas info for all tapas items here
            if (!isNetworkDisabled) {
                let netOffline = false;
                const newSharedTapasInfoMap = {};
                for (const tapasItem of cleanedTapasData) {
                    if (tapasItem.shareReference) {
                        const info = await getSharedTapasInfo(tapasItem.shareReference, db);
                        if (info === null) {
                            netOffline = true;
                            break;
                        }
                        newSharedTapasInfoMap[tapasItem.id] = info;
                    }
                }
                if (netOffline) {
                    setIsOffline(true);
                } else {
                    setSharedTapasInfoMap(newSharedTapasInfoMap);
                }
            }

        }, (error) => {
            console.error("Error fetching tapas: ", error);
            setFirebaseError(`${t('errorLoadingTapasData')} ${error.message}`);
        });

        return () => unsubscribe();
    }, [db, userId, t]);

    // Effect to handle changelog
    useEffect(() => {
        if (userId && config && Object.keys(config).length > 0 && appVersion !== config.lastSeenVersion) {
            changelogModal.open();
        }
    }, [userId, config, appVersion]);

    // Effect to handle clicks outside the menu
    useEffect(() => {
        const handleClickOutside = (event) => {
            // Close menu if it's open and the click is outside the menu itself
            if (showMenu && !event.target.closest('#main-menu')) { // Use closest to check if click is inside the menu
                setShowMenu(false);
                setShowDataMenu(false); // Close submenu too
                setShowTapasLanguageMenu(false); // Close Tapas Language submenu
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

    const handleConfirmChangelog = async () => {
        const appId = typeof __app_id !== 'undefined' ? __app_id : 'default-app-id';
        const configPath = `artifacts/${appId}/users/${userId}/config/appConfig`;
        const docRef = doc(db, configPath);
        await myUpdateDoc(docRef, { lastSeenVersion: appVersion });
        setConfig({ ...config, lastSeenVersion: appVersion });
        changelogModal.close();
    };

    const handleSelectTapas = (tapasItem) => {
        setScrollPosition(window.pageYOffset);
        setSelectedTapas(tapasItem);
        setTapasDetailMessage(null);
        tapasDetailModal.open(handleCloseTapasDetail);
    };

    const handleCloseTapasDetail = () => {
        setSelectedTapas(null);
        setTapasDetailMessage(null);
        setTimeout(() => window.scrollTo(0, scrollPosition), 30);
    };

    const handleTapasAddedUpdatedCancel = (updatedData = null) => {
        setEditingTapas(null);
        if (selectedTapas) {
            setSelectedTapas(prev => ({ ...prev, ...updatedData }));
        }
    };

    const handleEditTapas = (tapasItem) => {
        setEditingTapas(tapasItem);
        tapasEditModal.open(handleTapasAddedUpdatedCancel);
    };

    const mySignInWithPopup = async (auth, provider) => {
        try {
            await signInWithPopup(auth, provider);
        } catch (error) {
            if (error.code === 'auth/cancelled-popup-request' || error.code === 'auth/popup-closed-by-user') {
                // ignore user abort
                return false;
            } else {
                throw error;
            }
        }
        return true;
    };

    const handleGoogleSignIn = async () => {
        if (!auth) return;
        try {
            const provider = new GoogleAuthProvider();
            const ok = await mySignInWithPopup(auth, provider);
            if (ok) {
                setFirebaseError('');
                setShowLoginPrompt(false); // Close login prompt after successful sign-in
                setShowMenu(false); // Close menu after login
            }
        } catch (error) {
            console.error("Error signing in with Google:", error);
            setFirebaseError(`${t('googleSignInFailed')} ${error.message}`);
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
            setSelectedTapasLanguage(null); // Clear selected Tapas language on logout
            setCustomTapasLanguages({}); // Clear custom languages on logout
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
            setShowMenu(false); // Close main menu
            setShowDataMenu(false); // Close data submenu
            setProcessingText(t('exporting'));
            setProcessing(true);
            const appId = typeof __app_id !== 'undefined' ? __app_id : 'default-app-id';
            const tapasCollectionRef = collection(db, `artifacts/${appId}/users/${userId}/tapas`);
            const querySnapshot = await myGetDocs(tapasCollectionRef);
            const dataToExport = querySnapshot.docs.map(doc => {
                const data = doc.data();
                // Convert Firestore Timestamps to ISO strings for export
                const exportableData = {id: doc.id};
                for (const key in data) {
                    if (key !== 'id' && key !== 'userId') { // Exclude 'id' and 'userId'
                        if (key === 'checkedDays' || key === 'recuperatedDays' || key === 'advancedDays') {
                            // Ensure unique days are exported as ISO strings
                            exportableData[key] = getUniqueCheckedDays(data[key] || []).map(timestamp => formatDateToISO(timestamp.toDate()));
                        } else if (data[key] instanceof Timestamp) {
                            exportableData[key] = data[key].toDate().toISOString();
                        } else if (data[key] instanceof Date) {
                             exportableData[key] = data[key].toISOString();
                        } else if (typeof data[key] === 'object' && !Array.isArray(data[key]) && data[key] !== null) {
                            // Handle multi-language fields (name, description, goals, parts)
                            if (key === 'name' || key === 'description') {
                                exportableData[key] = data[key]; // Store as object {lang: value}
                            } else if (key === 'goals' || key === 'parts') {
                                // Convert object of arrays to object of string arrays
                                const localizedArrays = {};
                                for (const lang in data[key]) {
                                    if (Array.isArray(data[key][lang])) {
                                        localizedArrays[lang] = data[key][lang];
                                    }
                                }
                                exportableData[key] = localizedArrays;
                            } else {
                                exportableData[key] = data[key];
                            }
                        }
                        else {
                            exportableData[key] = data[key];
                        }
                    }
                }
                return exportableData; // Return data without 'id' and 'userId'
            });

            for (var i = 0; i < dataToExport.length; i++) {
                const tapasId = dataToExport[i].id;
                if (typeof dataToExport[i].results !== 'number' && dataToExport[i].results) {
                    dataToExport[i].results = [{ content: dataToExport[i].results, date: null , changedDate: null }];
                } else {
                    const resultsColRef = collection(db, `artifacts/${appId}/users/${userId}/tapas/${tapasId}/results`);
                    const rquerySnapshot = await getDocs(resultsColRef);
                    const resultsData = rquerySnapshot.docs.map(doc => {
                        const rdata = doc.data();
                        const exportableData = {};
                        for (const key in rdata) {
                            if (rdata[key] instanceof Timestamp) {
                                exportableData[key] = rdata[key].toDate().toISOString();
                            } else if (rdata[key] instanceof Date) {
                                exportableData[key] = rdata[key].toISOString();
                            }
                            else {
                                exportableData[key] = rdata[key];
                            }
                        }
                        return exportableData;
                    });
                    dataToExport[i].results = resultsData;
                }
                delete dataToExport[i].id;
            }

            const jsonString = JSON.stringify(dataToExport, null, 2);
            const blob = new Blob([jsonString], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `tapas_data_${formatDateToISO(new Date())}.json`; // Removed userId from filename
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
            setProcessing(false);
            setStatusMessage(t('exportSuccessful'));
        } catch (error) {
            console.error("Error exporting data:", error);
            setProcessing(false);
            setStatusMessage(`${t('exportFailed')} ${error.message}`);
        }
    };

    const handleImportDataClick = () => {
        fileInputRef.current.click(); // Trigger the hidden file input click
        // Do NOT close the menu here. It should remain open until file selection is done.
    };

    const handleFileChange = async (event) => {
        setShowMenu(false); // Close main menu after processing
        setShowDataMenu(false); // Close data submenu
        const file = event.target.files[0];
        if (!file) {
            return;
        }

        if (!db || !userId) {
            setStatusMessage("No user or database initialized for import.");
            return;
        }

        try {
            const reader = new FileReader();
            reader.onload = async (e) => {
                try {
                    setProcessingText(t('importing'));
                    setProcessing(true);
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
                        // Handle multi-language fields during import
                        if (dataToSave.name && typeof dataToSave.name === 'string') {
                            dataToSave.name = { [locale]: dataToSave.name }; // Convert old string to object
                        } else if (typeof dataToSave.name !== 'object' || dataToSave.name === null) {
                            dataToSave.name = {}; // Ensure it's an object
                        }

                        if (dataToSave.description && typeof dataToSave.description === 'string') {
                            dataToSave.description = { [locale]: dataToSave.description };
                        } else if (typeof dataToSave.description !== 'object' || dataToSave.description === null) {
                            dataToSave.description = {};
                        }

                        if (dataToSave.goals && Array.isArray(dataToSave.goals)) {
                            dataToSave.goals = { [locale]: dataToSave.goals }; // Convert old array to object
                        } else if (typeof dataToSave.goals !== 'object' || dataToSave.goals === null) {
                            dataToSave.goals = {};
                        }

                        if (dataToSave.parts && Array.isArray(dataToSave.parts)) {
                            dataToSave.parts = { [locale]: dataToSave.parts }; // Convert old array to object
                        } else if (typeof dataToSave.parts !== 'object' || dataToSave.parts === null) {
                            dataToSave.parts = {};
                        }

                        // Handle custom languages
                        if (dataToSave.languages && typeof dataToSave.languages !== 'object') {
                            dataToSave.languages = {};
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
                        if (isNoTapasType(dataToSave)) {
                            dataToSave.duration = 0;
                        }
                        // Set version to 1 if not present
                        if (typeof dataToSave.version !== 'number') {
                            dataToSave.version = 1;
                        }

                        const results = dataToSave.results;
                        dataToSave.results = results.length;

                        await setDoc(newDocRef, { ...dataToSave, userId: userId }); // Assign current userId

                        for (const resItem of results) {
                            const resDataToSave = { ...resItem };
                            if (resDataToSave.date && typeof resDataToSave.date === 'string') {
                                resDataToSave.date = new Date(resDataToSave.date);
                            }
                            else if (resDataToSave.changedDate && typeof resDataToSave.changedDate === 'string') {
                                resDataToSave.changedDate = new Date(resDataToSave.changedDate);
                            }
                            const resultsCollectionRef = collection(db, `artifacts/${appId}/users/${userId}/tapas/${newDocRef.id}/results`);
                            const newResDocRef = doc(resultsCollectionRef);
                            await setDoc(newResDocRef, { ...resDataToSave });
                        }
                    }
                    setStatusMessage(t('importSuccessful'));
                } catch (parseError) {
                    console.error("Error parsing JSON or saving data:", parseError);
                    setStatusMessage(`${t('invalidJsonFile')} ${parseError.message}`);
                }
                finally {
                    setProcessing(false);
                }
            };
            reader.readAsText(file);
        } catch (error) {
            console.error("Error importing data:", error);
            setStatusMessage(`${t('importFailed')} ${error.message}`);
        } finally {
            event.target.value = ''; // Clear the input so the same file can be selected again
        }
    };

    const handleCleanData = () => {
        cleanDataModal.open();
        setShowMenu(false); // Close main menu
        setShowDataMenu(false); // Close data submenu
    };

    const handleCleanDataConfirmed = async (timeframe) => {
        if (!db || !userId) {
            setStatusMessage("No user or database initialized for cleaning.");
            cleanDataModal.close();
            return;
        }

        try {
            cleanDataModal.close();
            setProcessingText(t('cleanData'));
            setProcessing(true);
            let cutoffDate = null; // If 'all', set a very old date so all tapas will be considered for deletion
            if (timeframe !== 'all') {
                const years = parseInt(timeframe.replace('years', '').replace('year', ''));
                cutoffDate = subYears(startOfDay(new Date()), years);
            }

            const appId = typeof __app_id !== 'undefined' ? __app_id : 'default-app-id';
            const tapasCollectionRef = collection(db, `artifacts/${appId}/users/${userId}/tapas`);
            const q = query(tapasCollectionRef);
            const querySnapshot = await getDocs(q);

            let deletedCount = 0;
            for (const docSnapshot of querySnapshot.docs) {
                const tapasData = docSnapshot.data();
                let doDelete = false;
                // Only clean tapas that are not 'noTapas' or have a defined start date
                if (!isNoTapasType(tapasData) && tapasData.startDate) {
                    const startDate = startOfDay(tapasData.startDate.toDate());
                    const endDate = addDays(startDate, tapasData.duration - 1);
                    if (!cutoffDate || isBefore(endDate, cutoffDate)) {
                        doDelete = true;
                    }
                } else if (isNoTapasType(tapasData) && !cutoffDate) {
                    // If 'noTapas' and cleaning all, delete it
                    doDelete = true;
                }

                if (doDelete) {
                    const tapaDocRef = doc(tapasCollectionRef, docSnapshot.id);
                    const resultsCollectionRef = collection(tapaDocRef, 'results');
                    const resultsSnapshot = await getDocs(query(resultsCollectionRef));
                    const resultsBatch = writeBatch(db);
                    resultsSnapshot.docs.forEach(resultsDoc => {
                        resultsBatch.delete(doc(resultsCollectionRef, resultsDoc.id));
                    });
                    await resultsBatch.commit();
                    await deleteDoc(tapaDocRef);
                    deletedCount++;
                }
            }

            if (deletedCount > 0) {
                setStatusMessage(t('cleaningDataSuccessful', deletedCount));
            } else {
                setStatusMessage("No old Tapas found to clean.");
            }

        } catch (error) {
            console.error("Error cleaning data:", error);
            setStatusMessage(`${t('cleaningDataFailed')} ${error.message}`);
        } finally {
            setProcessing(false);
        }
    };

    const handleSelectTapasLanguage = async (langCode) => {
        const newSelectedLang = selectedTapasLanguage === langCode ? null : langCode;
        setSelectedTapasLanguage(newSelectedLang);
        setShowTapasLanguageMenu(false); // Close submenu

        if (db && userId) {
            const appId = typeof __app_id !== 'undefined' ? __app_id : 'default-app-id';
            const userPrefsRef = doc(db, `artifacts/${appId}/users/${userId}/preferences/tapas`);
            try {
                await setDoc(userPrefsRef, { selectedTapasLanguage: newSelectedLang }, { merge: true });
            } catch (error) {
                console.error("Error saving selected Tapas language preference:", error);
                setStatusMessage("Error saving Tapas language preference.");
            }
        }
    };

    const tapasLanguagesForMenu = Object.keys(customTapasLanguages).filter(lang => lang !== locale);

    const isTapasTodayChecked = (tapasItem) => {
        const startDate = startOfDay(tapasItem.startDate.toDate());
        const today = getTapasDay(getDateNow(config), tapasItem, startDate);
        const isTodayWithinDuration = !isBefore(today, startDate);
        return !isTodayWithinDuration || isTapasDateChecked(tapasItem.checkedDays, today);
    };

    const isTapasYesterdayChecked = (tapasItem) => {
        const startDate = startOfDay(tapasItem.startDate.toDate());
        const today = getTapasDay(getDateNow(config), tapasItem, startDate);
        const daysDelta = getScheduleFactor(tapasItem.scheduleType, tapasItem.scheduleInterval);
        const yesterday = startOfDay(subDays(today, daysDelta));

        const isYesterdayWithinDuration = !isBefore(yesterday, startDate);
        return !isYesterdayWithinDuration || isTapasDateChecked(tapasItem.checkedDays, yesterday);
    };

    const isTapasExpired = (tapasItem) => {
        const startDate = startOfDay(tapasItem.startDate.toDate());
        if (!tapasItem.duration) {
            return false;
        }
        const today = startOfDay(getDateNow(config));
        const endDate = addDays(startDate, tapasItem.duration - 1);
        return today > endDate;
    };

    const activeTapas = tapas.filter(tapas => isActiveOrCrystallization(tapas)).sort((a, b) => {
        // Custom sorting logic for active tapas
        const isATapas = !isNoTapasType(a);
        const isBTapas = !isNoTapasType(b);

        // If one is 'noTapas' and the other isn't, 'noTapas' goes to the end
        if (isATapas && !isBTapas) return -1;
        if (!isATapas && isBTapas) return 1;

        const isACrystallization = isCrystallization(a);
        const isBCrystallization = isCrystallization(b);
        if (isACrystallization && !isBCrystallization) return -1;
        if (!isACrystallization && isBCrystallization) return 1;

        const isACheckedYesterday = isTapasYesterdayChecked(a);
        const isBCheckedYesterday = isTapasYesterdayChecked(b);
        const isAExpired = isTapasExpired(a) && isACheckedYesterday;
        const isBExpired = isTapasExpired(b) && isBCheckedYesterday;

        if (isAExpired && !isBExpired) return 1;
        if (!isAExpired && isBExpired) return -1;

        // If both are 'noTapas', sort by name alphabetically
        if (!isATapas && !isBTapas) {
            const nameA = getLocalizedContent(a.name, locale, selectedTapasLanguage);
            const nameB = getLocalizedContent(b.name, locale, selectedTapasLanguage);
            return nameA.localeCompare(nameB);
        }

        if (isACheckedYesterday && !isBCheckedYesterday) return 1;
        if (!isACheckedYesterday && isBCheckedYesterday) return -1;

        if (a.acknowledgeAfter && !b.acknowledgeAfter) return 1;
        if (!a.acknowledgeAfter && b.acknowledgeAfter) return -1;

        const isAChecked = isTapasTodayChecked(a);
        const isBChecked = isTapasTodayChecked(b);

        if (isAChecked && !isBChecked) return 1;
        if (!isAChecked && isBChecked) return -1;

        if (a.allowRecuperation && !b.allowRecuperation) return 1;
        if (!a.allowRecuperation && b.allowRecuperation) return -1;

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

        return 0; // Should not be reached
    });

    // History filter by end date latest first
    const baseHistoryTapas = tapas.filter(tapas => !isActiveOrCrystallization(tapas)).sort((a,b) => {
        const endDateA = getTapasDatesInfo(b).endDate;
        const endDateB = getTapasDatesInfo(a).endDate;

        // Handle cases where endDate might be null or invalid (shouldn't happen for active tapas normally)
        if (!endDateA && !endDateB) return 0;
        if (!endDateA) return 1; // Null end date goes to the end
        if (!endDateB) return -1; // Null end date goes to the end

        return endDateA.getTime() - endDateB.getTime(); // Sort by end date ascending (earliest first)
    });

    if (loadingFirebase || !theme) {
        return (
            <div className="flex justify-center items-center h-screen">
                <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-indigo-500"></div>
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
                                maxLength="120"
                                onChange={(e) => setEmail(e.target.value)}
                                className="w-full px-4 py-3 mb-3 border rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white border-gray-300 text-gray-900 dark:bg-gray-700 dark:border-gray-600 dark:text-gray-100"
                            />
                            <input
                                type="password"
                                placeholder={t('password')}
                                value={password}
                                maxLength="2048"
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

                <header className="bg-gradient-to-r from-indigo-600 to-purple-700 text-white p-4 pt-5 shadow-md">
                    <div className="container mx-auto flex flex-wrap justify-between items-center relative">
                        <h1 className="text-3xl font-bold">{t('appName')}</h1>
                        {isOffline && (
                            <span className="text-gray-300">{t('isOffline')}</span>
                        )}
                        <div className="flex items-center justify-right space-x-4">
                            {isPersistentCacheEnabled && (
                                <button onClick={handleNetworkToggle} className="p-2 rounded-md text-blue-400" aria-label="Network Status">
                                    {isNetworkDisabled ? (
                                        <svg xmlns="http://www.w3.org/2000/svg" height="32px" viewBox="0 -960 960 960" fill="currentColor"><path d="M280-80v-100l120-84v-144L80-280v-120l320-224v-176q0-33 23.5-56.5T480-880q33 0 56.5 23.5T560-800v176l320 224v120L560-408v144l120 84v100l-200-60-200 60Z"/></svg>
                                    ) : (
                                        <span className="text-2xl text-blue-300" role="img">🌐</span>
                                    )}
                                </button>
                            )}
                            <button
                                onClick={toggleTheme}
                                className="p-2 rounded-full bg-white bg-opacity-20 hover:bg-opacity-30 transition-colors duration-200 text-white focus:outline-none focus:ring-2 focus:ring-white"
                                aria-label="Toggle light/dark mode"
                                disabled={loadingFirebase}
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

                            <span className="text-sm bg-indigo-700 px-3 py-1 rounded-full opacity-80 hidden md:inline-block">
                                <div className="flex">{t('hello')},&nbsp;
                                {userDisplayName ? (
                                    <>{userDisplayName.split(' ')[0]}!</>
                                ) : (
                                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-indigo-300"></div>
                                )}
                                </div>
                            </span>
                            
                            <div className="relative" id="main-menu">
                                <button
                                    onClick={() => setShowMenu(!showMenu)}
                                    className="bg-white text-indigo-700 px-3 py-1 rounded-full text-sm font-semibold hover:bg-indigo-100 transition-colors duration-200"
                                    disabled={processing}
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
                                                disabled={loadingFirebase}
                                            >
                                                {t('logout')}
                                            </button>
                                        ) : (
                                            <button
                                                onClick={() => { setShowLoginPrompt(true); setShowMenu(false); }}
                                                className="block w-full text-left px-4 py-2 hover:bg-gray-100 dark:hover:bg-gray-600"
                                                disabled={loadingFirebase}
                                            >
                                                {t('signIn')}
                                            </button>
                                        )}
                                        {isPersistentCacheEnabled && (
                                            <div className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 dark:text-gray-200 dark:hover:bg-gray-700">
                                                <label
                                                    className="Label pr-4"
                                                    htmlFor="sync"
                                                >
                                                    {t('sync')}
                                                </label>
                                                <Switch.Root
                                                    className="SwitchRoot"
                                                    id="sync"
                                                    checked={!isNetworkDisabled}
                                                    onCheckedChange={handleNetworkToggle}
                                                >
                                                    <Switch.Thumb className="SwitchThumb" />
                                                </Switch.Root>
                                            </div>
                                        )}
                                        <div className="border-t border-gray-200 dark:border-gray-600 my-1"></div> {/* Separator */}
                                        <button
                                            onClick={() => {
                                                setScrollPosition(window.pageYOffset);
                                                configModal.open(handleCloseTapasDetail);
                                                setShowMenu(false);
                                            }}
                                            className="block w-full text-left px-4 py-2 hover:bg-gray-100 dark:hover:bg-gray-600"
                                        >
                                            {t('config')}
                                        </button>
                                        <button
                                            onClick={() => { setShowTapasLanguageMenu(!showTapasLanguageMenu); setShowDataMenu(false); }}
                                            className="block w-full text-left px-4 py-2 hover:bg-gray-100 dark:hover:bg-gray-600 flex justify-between items-center"
                                            disabled={loadingFirebase}
                                        >
                                            {t('tapasLanguage')}
                                            <svg className={`w-4 h-4 transform transition-transform ${showTapasLanguageMenu ? 'rotate-180' : 'rotate-0'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path></svg>
                                        </button>
                                        {showTapasLanguageMenu && (
                                            <div className="pl-4">
                                                {tapasLanguagesForMenu.length > 0 ? (
                                                    tapasLanguagesForMenu.map(langCode => (
                                                        <button
                                                            key={langCode}
                                                            onClick={() => handleSelectTapasLanguage(langCode)}
                                                            className={`block text-left px-4 py-1 ${
                                                                selectedTapasLanguage === langCode
                                                                    ? 'my-1 rounded-xl bg-blue-100 dark:bg-blue-800 text-blue-700 dark:text-blue-200'
                                                                    : 'w-full hover:bg-blue-100 dark:hover:bg-blue-600'
                                                            }`}
                                                        >
                                                            {customTapasLanguages[langCode]?.languageName || customTapasLanguages[langCode]}
                                                        </button>
                                                    ))
                                                ) : (
                                                    <p className="px-4 py-2 text-gray-500 dark:text-gray-400">{t('noOtherLanguages')}</p>
                                                )}
                                                {selectedTapasLanguage && (
                                                    <button
                                                        onClick={() => handleSelectTapasLanguage(null)}
                                                        className="block w-full text-left px-4 py-2 text-red-600 hover:bg-red-100 dark:hover:bg-red-900"
                                                    >
                                                        {t('clearX', '')}
                                                    </button>
                                                )}
                                            </div>
                                        )}
                                        <div className="border-t border-gray-200 dark:border-gray-600 my-1"></div> {/* Separator */}
                                        <button
                                            onClick={() => { setShowDataMenu(!showDataMenu); setShowTapasLanguageMenu(false); }}
                                            className="block w-full text-left px-4 py-2 hover:bg-gray-100 dark:hover:bg-gray-600 flex justify-between items-center"
                                            disabled={loadingFirebase}
                                        >
                                            {t('data')}
                                            <svg className={`w-4 h-4 transform transition-transform ${showDataMenu ? 'rotate-180' : 'rotate-0'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path></svg>
                                        </button>
                                        {showDataMenu && (
                                            <div className="pl-4"> {/* Indent submenu items */}
                                                <button
                                                    onClick={handleImportDataClick}
                                                    className="block w-full text-left px-4 py-2 hover:bg-gray-100 dark:hover:bg-gray-600"
                                                    disabled={isPersistentCacheEnabled && (isNetworkDisabled || isOffline)}
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
                                                    disabled={isPersistentCacheEnabled && (isNetworkDisabled || isOffline)}
                                                >
                                                    {t('cleanData')}
                                                </button>
                                            </div>
                                        )}
                                        <div className="border-t border-gray-200 dark:border-gray-600 my-1"></div> {/* Separator */}
                                        <button
                                            onClick={() => { helpModal.open(); setShowMenu(false); }}
                                            className="block w-full text-left px-4 py-2 hover:bg-gray-100 dark:hover:bg-gray-600"
                                        >
                                            {t('help')}
                                        </button>
                                        <button
                                            onClick={() => { aboutModal.open(); setShowMenu(false); }}
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
                    <div className={`p-3 text-center ${statusMessage.includes(t('successful').toLowerCase()) ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'} rounded-md mx-auto mt-4 max-w-lg`}>
                        {statusMessage}
                    </div>
                )}

                {/* Navigation Tabs */}
                <nav className="shadow-sm p-3 sticky top-0 z-10 bg-white dark:bg-gray-800">
                    <div className="container mx-auto flex flex-nowrap overflow-x-auto justify-around">
                        <button
                            onClick={() => { setCurrentPage('active'); setSelectedTapas(null); setEditingTapas(null); }}
                            className={`px-4 py-2 rounded-md text-lg font-medium transition-colors duration-200 ${
                                currentPage === 'active' ? 'bg-blue-600 text-white shadow-lg border-2 border-blue-800' : 'text-gray-700 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-700'
                            }`}
                            disabled={processing || tapasEditModal.isOpen}
                        >
                            {t('active')}
                        </button>
                        <button
                            onClick={() => { setCurrentPage('history'); setSelectedTapas(null); setEditingTapas(null); }}
                            className={`px-4 py-2 rounded-md text-lg font-medium transition-colors duration-200 ${
                                currentPage === 'history' ? 'bg-blue-600 text-white shadow-lg border-2 border-blue-800' : 'text-gray-700 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-700'
                            }`}
                            disabled={loadingFirebase || processing || tapasEditModal.isOpen}
                        >
                            {t('history')}
                        </button>
                        <button
                            onClick={() => { setCurrentPage('statistics'); setSelectedTapas(null); setEditingTapas(null); }}
                            className={`px-4 py-2 rounded-md text-lg font-medium transition-colors duration-200 ${
                                currentPage === 'statistics' ? 'bg-blue-600 text-white shadow-lg border-2 border-blue-800' : 'text-gray-700 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-700'
                            }`}
                            disabled={loadingFirebase || processing || tapasEditModal.isOpen}
                        >
                            {t('statistics')}
                        </button>
                        <button
                            onClick={() => { setCurrentPage('diary'); setSelectedTapas(null); setEditingTapas(null); }}
                            className={`px-4 py-2 rounded-md text-lg font-medium transition-colors duration-200 ${
                                currentPage === 'diary' ? 'bg-blue-600 text-white shadow-lg border-2 border-blue-800' : 'text-gray-700 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-700'
                            }`}
                            disabled={loadingFirebase || processing || tapasEditModal.isOpen}
                        >
                            {t('diary')}
                        </button>
                        <button
                            onClick={() => { setSelectedTapas(null); tapasEditModal.open(handleTapasAddedUpdatedCancel) }}
                            aria-label={t('addNew')}
                            className={`px-4 py-2 rounded-md text-2xl font-medium transition-colors duration-200 font-bold ${
                                tapasEditModal.isOpen && !tapasDetailModal.isActive ? 'bg-blue-600 text-white shadow-lg border-2 border-blue-800' : 'text-gray-700 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-700'
                            }`}
                            disabled={loadingFirebase || processing || tapasDetailModal.isActive}
                        >
                            +
                        </button>
                    </div>
                </nav>

                {/* Main Content Area */}
                <main className="container mx-auto p-2 lg:p-4 flex-grow bg-gray-100 dark:bg-gray-900">
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
                            {loadingFirebase && (
                                <div className="flex justify-center items-center h-screen">
                                    <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-indigo-500"></div>
                                </div>
                            )}
                            {processing && (
                                <div className="flex justify-center items-center h-screen">
                                    <button type="button" className="inline-flex items-center text-white bg-indigo-500 border border-default hover:bg-neutral-secondary-medium hover:text-heading focus:ring-4 focus:ring-neutral-tertiary-soft shadow-xs font-medium leading-5 rounded-md text-sm px-4 py-2.5 focus:outline-none">
                                        <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
                                        {processingText}…
                                    </button>
                                </div>
                            )}
                            {currentPage === 'active' && !loadingFirebase && !processing && !tapasEditModal.isOpen && (
                                <TapasList tapas={activeTapas} config={config} onSelectTapas={handleSelectTapas} sharedTapasInfoMap={sharedTapasInfoMap} selectedTapasLanguage={selectedTapasLanguage} />
                            )}
                            {currentPage === 'history' && !processing && !tapasEditModal.isOpen && (
                                <TapasList
                                    tapas={baseHistoryTapas}
                                    sharedTapasInfoMap={sharedTapasInfoMap}
                                    onSelectTapas={handleSelectTapas}
                                    showFilters={true}
                                    historyStatusFilter={historyStatusFilter}
                                    setHistoryStatusFilter={setHistoryStatusFilter}
                                    historyTimeFilter={historyTimeFilter}
                                    setHistoryTimeFilter={setHistoryTimeFilter}
                                    historyNameFilter={historyNameFilter}
                                    setHistoryNameFilter={setHistoryNameFilter}
                                    selectedTapasLanguage={selectedTapasLanguage}
                                />
                            )}
                            {currentPage === 'statistics' && !processing && !tapasEditModal.isOpen && (
                                <Statistics allTapas={tapas} />
                            )}
                            {currentPage === 'diary' && !processing && !tapasEditModal.isOpen && (
                                <Results tapas={tapas} setSelectedTapas={setSelectedTapas}
                                    modalState={modalState}
                                    myAddDoc={myAddDoc} myUpdateDoc={myUpdateDoc} myDeleteDoc={myDeleteDoc}
                                />
                            )}
                            {tapasEditModal.isActive && !processing && (
                                <TapasForm onTapasAddedUpdatedCancel={tapasEditModal.close}
                                    editingTapas={editingTapas} modalState={modalState}
                                    myAddDoc={myAddDoc} myUpdateDoc={myUpdateDoc}
                                />
                            )}
                            {selectedTapas && tapasDetailModal.isActive && !tapasEditModal.isOpen && !processing && (
                                <TapasDetail tapas={selectedTapas} config={config} onClose={tapasDetailModal.close} onEdit={handleEditTapas}
                                    setSelectedTapas={setSelectedTapas} selectedTapasLanguage={selectedTapasLanguage}
                                    openDateRangeModal={() => acknowledgeDateRangeModal.open(closeAcknowledgeDateRangeModal)}
                                    modalState={modalState} initMessage={tapasDetailMessage}
                                    setInitMessage={setTapasDetailMessage}
                                    isPersistentCacheEnabled={isPersistentCacheEnabled}
                                    isOffline={isPersistentCacheEnabled && (isNetworkDisabled || isOffline)}
                                    myAddDoc={myAddDoc} myUpdateDoc={myUpdateDoc} myDeleteDoc={myDeleteDoc}
                                />
                            )}
                            {licenseModal.isOpen && (<License onClose={licenseModal.close} />)}
                            {legalNoticeModal.isOpen && (<LegalNotice onClose={legalNoticeModal.close} />)}
                            {gdprModal.isOpen && (<GDPR onClose={gdprModal.close} />)}
                        </>
                    )}
                </main>

                {/* Footer */}
                <footer className="bg-gray-800 text-white text-center p-4 mt-8 text-sm">
                    <span className="text-nav">{t('appName')} &copy; {new Date().getFullYear()} by Reimund Renner</span>
                    <div className="flex justify-center space-x-4 mt-2">
                        <button
                            onClick={() => gdprModal.open()}
                            className="px-4 py-1 rounded-md text-sm font-medium transition-colors duration-200 text-lightblue-700 hover:text-blue-700 hover:bg-blue-100"
                        >
                            {t('gdpr')}
                        </button>
                        <span className="text-gray-500 py-1">|</span>
                        <button
                            onClick={() => legalNoticeModal.open()}
                            className="px-4 py-1 rounded-md text-sm font-medium transition-colors duration-200 text-lightblue-700 hover:text-blue-700 hover:bg-blue-100"
                        >
                            {t('legalNotice')}
                        </button>
                        <span className="text-gray-500 py-1">|</span>
                        <button
                            onClick={() => licenseModal.open()}
                            className="px-4 py-1 rounded-md text-sm font-medium transition-colors duration-200 text-lightblue-700 hover:text-blue-700 hover:bg-blue-100"
                        >
                            {t('license')}
                        </button>
                    </div>
                </footer>

                {/* Modals/Overlays */}
                {aboutModal.isOpen && <AboutModal onClose={aboutModal.close} />}
                {helpModal.isOpen && <HelpModal onClose={helpModal.close} />}
                {cleanDataModal.isOpen && <CleanDataModal onClose={cleanDataModal.close} onCleanConfirmed={handleCleanDataConfirmed} />}
                {configModal.isOpen && <ConfigModal onClose={configModal.close} db={db} userId={userId} t={t}
                    setConfig={setConfig} wasPersistentCacheEnabled={isPersistentCacheEnabled}
                />}
                {acknowledgeDateRangeModal.isOpen && <AcknowledgeDateRangeModal onClose={acknowledgeDateRangeModal.close}
                    tapas={selectedTapas} setSelectedTapas={setSelectedTapas} db={db} userId={userId} t={t}
                    isPersistentCacheEnabled={isPersistentCacheEnabled}
                />}
                {changelogModal.isOpen && <ChangelogOverlay lastSeenVersion={config.lastSeenVersion}
                    onClose={handleConfirmChangelog} t={t}
                />}

                <InstallPrompt t={t} />
                {/* Login Prompt Overlay (conditionally rendered on top) */}
            </div>
        </AppContext.Provider>
    );
};

// Wrap HomePage with LocaleProvider and ThemeProvider
const WrappedHomePage = () => (
    <LocaleProvider>
        <ThemeProvider>
            <Suspense fallback={
                        <div className="flex justify-center items-center h-screen">
                            <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-indigo-500"></div>
                        </div>
                    }>
                <HomePage />
            </Suspense>
        </ThemeProvider>
    </LocaleProvider>
);

// Default export for the Next.js page
export default WrappedHomePage;
