'use client'

// pages/index.js (or .jsx)
// This file will contain your main application logic as a Next.js page component.

import React, { useState, useEffect, createContext, useContext, useCallback, useRef } from 'react';
import { initializeApp } from 'firebase/app';
import { getAuth, signInAnonymously, onAuthStateChanged, GoogleAuthProvider, signInWithPopup, signOut, createUserWithEmailAndPassword, signInWithEmailAndPassword } from 'firebase/auth';
import { getFirestore, collection, addDoc, getDocs, doc, updateDoc, deleteDoc, query, where, onSnapshot, orderBy, Timestamp, setDoc, writeBatch } from 'firebase/firestore';
import { Suspense, use } from 'react'

const __app_id = "1:136005099339:web:28b6186333d3ae2ef792ce"; // Directly assign provided appId

// Define translations for different languages
const translations = {
    en: {
        "appName": "Tapas Tracker",
        "hello": "Hello",
        "userId": "User ID",
        "logout": "Logout",
        "active": "Active",
        "history": "History",
        "statistics": "Statistics",
        "addNew": "Add New",
        "noTapasFound": "No Tapas found in this category.",
        "startDate": "Start Date",
        "endDate": "End Date",
        "duration": "Duration",
        "days": "days",
        "daysRemaining": "Days Remaining",
        "status": "Status",
        "successful": "Successful",
        "failed": "Failed",
        "todayFinished": "Today finished",
        "yesterdayFinished": "Yesterday finished",
        "markAsFailed": "Mark as Failed",
        "editTapas": "Edit Tapas",
        "deleteTapas": "Delete Tapas",
        "tapasDeletedSuccessfully": "Tapas deleted successfully!",
        "errorDeletingTapas": "Error deleting Tapas:",
        "nameMismatch": "Name mismatch. Please type the Tapas name correctly to confirm deletion.",
        "confirmDeletion": "To confirm deletion, please type the Tapas name",
        "typeTapasNameToConfirm": "Type Tapas name to confirm",
        "cancel": "Cancel",
        "confirmDelete": "Confirm Delete",
        "markTapasAsFailed": "Mark Tapas as Failed",
        "sureMarkFailed": "Are you sure you want to mark \"%s\" as failed?",
        "causeOptional": "Cause (optional)",
        "repeatTapas": "Repeat Tapas?",
        "noDoNotRepeat": "No, do not repeat",
        "repeatSameDuration": "Repeat with same duration (%s days)",
        "repeatNewDuration": "Repeat with new duration:",
        "repeatUntilOriginalEndDate": "Repeat until original end date (%s)",
        "confirmFail": "Confirm Fail",
        "tapasMarkedAsFailed": "Tapas marked as failed!",
        "invalidNewDuration": "Invalid new duration. Tapas not repeated.",
        "originalEndDateInPast": "Original end date is in the past. Tapas not repeated.",
        "failedTapasRepeated": "Failed Tapas repeated as a new Tapas!",
        "errorMarkingFailedRepeating": "Error marking failed or repeating:",
        "dayCheckedSuccessfully": "Day checked successfully!",
        "tapasCompletedSuccessfully": "Tapas completed successfully!",
        "dayAlreadyChecked": "This day has already been checked.",
        "tapasAutoMarkedSuccessful": "Tapas automatically marked as successful after review.",
        "tapasPeriodOverNotAllDaysChecked": "Tapas period is over, but not all days were checked. Consider marking as failed.",
        "addEditTapas": "Add New Tapas", // Used for both Add and Edit
        "editTapasTitle": "Edit Tapas",
        "name": "Name",
        "descriptionAndGoal": "Description and goal (optional)",
        "goals0n": "Goals 0..n (optional, one per line)",
        "parts0n": "Parts 0..n (optional, one per line)",
        "crystallizationTime": "Crystallisation and awareness time [days] (optional)",
        "updateTapas": "Update Tapas",
        "addTapas": "Add Tapas",
        "nameStartDateDurationRequired": "Name, Start Date, and Duration are required.",
        "durationPositiveNumber": "Duration must be a positive number.",
        "tapasUpdatedSuccessfully": "Tapas updated successfully!",
        "tapasAddedSuccessfully": "Tapas added successfully!",
        "errorSavingTapas": "Error saving Tapas:",
        "cancelEdit": "Cancel Edit",
        "tapasStatistics": "Tapas Statistics",
        "activeTapasCount": "Active Tapas",
        "count": "Count",
        "avgDuration": "Avg Duration",
        "successfulTapasCount": "Successful Tapas",
        "failedTapasCount": "Failed Tapas",
        "avgDone": "Avg % Done",
        "welcomeTapasTracker": "Welcome to Tapas Tracker!",
        "trackPersonalGoals": "Track your personal development goals.",
        "signInWithGoogle": "Sign in with Google",
        "continueAsGuest": "Continue as Guest",
        "loadingApp": "Loading app...",
        "anErrorOccurred": "An error occurred!",
        "pleaseRefreshContactSupport": "Please refresh or contact support if the issue persists.",
        "firebaseInitFailed": "Firebase initialization failed:",
        "errorLoadingTapasData": "Error loading Tapas data:",
        "googleSignInFailed": "Google Sign-in failed:",
        "logoutFailed": "Logout failed:",
        "overallProgress": "Progress",
        "guestUser": "Guest User",
        "startTime": "Start Time",
        "description": "Description",
        "parts": "Parts",
        "noPartsDefinedYet": "No parts defined yet",
        "goals": "Goals",
        "noGoalsDefinedYet": "No goals defined yet",
        "causeOfFailure": "Cause of Failure",
        "daysChecked": "days checked",
        "checkedDates": "Checked Dates",
        "below": "below",
        "repeat": "Repeat",
        "email": "Email",
        "password": "Password",
        "signInWithEmail": "Sign in with Email",
        "signUpWithEmail": "Sign up with Email",
        "or": "OR",
        "menu": "Menu",
        "exportData": "Export Data",
        "importData": "Import Data",
        "exportSuccessful": "Tapas data exported successfully!",
        "exportFailed": "Failed to export Tapas data:",
        "importSuccessful": "Tapas data imported successfully!",
        "importFailed": "Failed to import Tapas data:",
        "invalidJsonFile": "Invalid JSON file. Please upload a valid Tapas data file.",
        "uploadFile": "Upload File",
        "today": "Today",
        "7d": "7d",
        "49d": "49d",
        "signIn": "Sign In",
        "sureRepeat": "Are you sure you want to repeat \"%s\"?",
        "repeatOptionLabel": "Choose a repeat option:",
        "confirmRepeat": "Confirm Repeat",
        "tapasRepeatedSuccessfully": "Tapas repeated successfully!",
        "filterBy": "Filter by",
        "timeframe": "Timeframe",
        "all": "All",
        "1month": "1 Month",
        "3months": "3 Months",
        "1year": "1 Year",
        "2years": "2 Years",
        "yesterdayNotApplicable": "Yesterday check not applicable. Tapas either started today or yesterday was already checked.",
        "yesterdayCheckedSuccessfully": "Yesterday checked successfully!",
        "allowRecuperation": "Allow recuperation",
        "recuperatedDays": "Recuperated Days",
        "advancedDays": "Advanced Days",
        "yesterdayRecuperated": "Yesterday recuperated",
        "todayTomorrowFinishedInAdvance": "Today & Tomorrow finished in advance",
        "notApplicableAlreadyCheckedOrOutsideDuration": "Not applicable. Date already checked or outside tapas duration.",
        "dayRecuperatedSuccessfully": "Day recuperated successfully!",
        "daysAdvancedSuccessfully": "Days advanced successfully!",
        "daysLeftOut": "days left out",
        "yesterdayPending": "yesterday pending",
        "todayPending": "today pending",
        "addResults": "Add Results",
        "updateResults": "Update Results",
        "results": "Results",
        "noResultsDefinedYet": "No results defined yet.",
        "clearLastDay": "Clear Last Day",
        "noDayToClear": "No recent day to clear.",
        "dayClearedSuccessfully": "Day cleared successfully!",
        "cannotClearFutureDay": "Cannot clear a future day.",
        "tapasAutoMarkedActive": "Tapas automatically marked as active after review.",
        "errorClearingDay": "Error clearing day:",
        "gdpr": "GDPR",
        "legalNotice": "Legal Notice",
        "license": "License",
        "about": "About",
        "appVersion": "App Version",
        "tapasWebsite": "Tapas Tracker Website",
        "aboutDescription": "Tapas Tracker is a personal development tool designed to help you track and achieve your Tapas or goals consistently.  Tapas is a form of Yogic practice and part of the ten Yamas and Niyamas.  The application allows you to track your Tapas success or failure, sepcify flexibly the parts of the Tapas, its goals and add results after the end of the Tapas or in case of a Tapas failure the cause for it.  History and Statistics help analysing your Tapasya and plan repetitions of failed or successful Tapas, respectively.",
        "data": "Data",
        "cleanData": "Clean Data",
        "cleanDataConfirmation": "Are you sure you want to delete all Tapas with an end date older than the selected timeframe?",
        "cleaningDataSuccessful": "Data cleaning successful! %s Tapas deleted.",
        "cleaningDataFailed": "Data cleaning failed:",
        "selectTimeframe": "Select Timeframe",
        "5years": "5 Years",
        "cleaningOldTapas": "Cleaning Old Tapas",
        "clean": "Clean",
        "close": "Close"
    },
    de: {
        "appName": "Tapas-Verfolger",
        "hello": "Hallo",
        "userId": "Benutzer-ID",
        "logout": "Abmelden",
        "active": "Aktiv",
        "history": "Verlauf",
        "statistics": "Statistiken",
        "addNew": "Neu hinzufügen",
        "noTapasFound": "Keine Tapas in dieser Kategorie gefunden.",
        "startDate": "Startdatum",
        "endDate": "Enddatum",
        "duration": "Dauer",
        "days": "Tage",
        "daysRemaining": "Verbleibende Tage",
        "status": "Status",
        "successful": "Erfolgreich",
        "failed": "Fehlgeschlagen",
        "todayFinished": "Heute beendet",
        "yesterdayFinished": "Gestern beendet",
        "markAsFailed": "Als fehlgeschlagen markieren",
        "editTapas": "Tapas bearbeiten",
        "deleteTapas": "Tapas löschen",
        "tapasDeletedSuccessfully": "Tapas erfolgreich gelöscht!",
        "errorDeletingTapas": "Fehler beim Löschen der Tapas:",
        "nameMismatch": "Namensübereinstimmung. Bitte geben Sie den Tapas-Namen korrekt ein, um das Löschen zu bestätigen.",
        "confirmDeletion": "Um das Löschen zu bestätigen, geben Sie bitte den Tapas-Namen ein",
        "typeTapasNameToConfirm": "Tapas-Namen zur Bestätigung eingeben",
        "cancel": "Abbrechen",
        "confirmDelete": "Löschen bestätigen",
        "markTapasAsFailed": "Tapas als fehlgeschlagen markieren",
        "sureMarkFailed": "Sind Sie sicher, dass Sie „%s“ als fehlgeschlagen markieren möchten?",
        "causeOptional": "Ursache (optional)",
        "repeatTapas": "Tapas wiederholen?",
        "noDoNotRepeat": "Nein, nicht wiederholen",
        "repeatSameDuration": "Mit gleicher Dauer wiederholen (%s Tage)",
        "repeatNewDuration": "Mit neuer Dauer wiederholen:",
        "repeatUntilOriginalEndDate": "Bis zum ursprünglichen Enddatum wiederholen (%s)",
        "confirmFail": "Fehler bestätigen",
        "tapasMarkedAsFailed": "Tapas als fehlgeschlagen markiert!",
        "invalidNewDuration": "Ungültige neue Dauer. Tapas nicht wiederholt.",
        "originalEndDateInPast": "Das ursprüngliche Enddatum liegt in der Vergangenheit. Tapas nicht wiederholt.",
        "failedTapasRepeated": "Fehlgeschlagene Tapas als neue Tapas wiederholt!",
        "errorMarkingFailedRepeating": "Fehler beim Markieren als fehlgeschlagen oder Wiederholen:",
        "dayCheckedSuccessfully": "Tag erfolgreich überprüft!",
        "tapasCompletedSuccessfully": "Tapas erfolgreich abgeschlossen!",
        "dayAlreadyChecked": "Dieser Tag wurde bereits überprüft.",
        "tapasAutoMarkedSuccessful": "Tapas nach Überprüfung automatisch als erfolgreich markiert.",
        "tapasPeriodOverNotAllDaysChecked": "Die Tapas-Periode ist abgelaufen, aber nicht alle Tage wurden überprüft. Erwägen Sie, sie als fehlgeschlagen zu markieren.",
        "addEditTapas": "Neue Tapas hinzufügen",
        "editTapasTitle": "Tapas bearbeiten",
        "name": "Name",
        "descriptionAndGoal": "Beschreibung und Ziel (optional)",
        "goals0n": "Ziele 0..n (optional, pro Zeile)",
        "parts0n": "Teile 0..n (optional, pro Zeile)",
        "crystallizationTime": "Kristallisations- und Bewusstseinszeit [Tage] (optional)",
        "updateTapas": "Tapas aktualisieren",
        "addTapas": "Tapas hinzufügen",
        "nameStartDateDurationRequired": "Name, Startdatum und Dauer sind erforderlich.",
        "durationPositiveNumber": "Dauer muss eine positive Zahl sein.",
        "tapasUpdatedSuccessfully": "Tapas erfolgreich aktualisiert!",
        "tapasAddedSuccessfully": "Tapas erfolgreich hinzugefügt!",
        "errorSavingTapas": "Fehler beim Speichern der Tapas:",
        "cancelEdit": "Bearbeitung abbrechen",
        "tapasStatistics": "Tapas-Statistiken",
        "activeTapasCount": "Aktive Tapas",
        "count": "Anzahl",
        "avgDuration": "Durchschn. Dauer",
        "successfulTapasCount": "Erfolgreiche Tapas",
        "failedTapasCount": "Fehlgeschlagene Tapas",
        "avgDone": "Durchschn. % erledigt",
        "welcomeTapasTracker": "Willkommen beim Tapas Tracker!",
        "trackPersonalGoals": "Verfolgen Sie Ihre persönlichen Entwicklungsziele.",
        "signInWithGoogle": "Mit Google anmelden",
        "continueAsGuest": "Als Gast fortfahren",
        "loadingApp": "App wird geladen...",
        "anErrorOccurred": "Ein Fehler ist aufgetreten!",
        "pleaseRefreshContactSupport": "Bitte aktualisieren Sie die Seite oder wenden Sie sich an den Support, wenn das Problem weiterhin besteht.",
        "firebaseInitFailed": "Firebase-Initialisierung fehlgeschlagen:",
        "errorLoadingTapasData": "Fehler beim Laden der Tapas-Daten:",
        "googleSignInFailed": "Google-Anmeldung fehlgeschlagen:",
        "logoutFailed": "Abmeldung fehlgeschlagen:",
        "overallProgress": "Fortschritt",
        "guestUser": "Gastnutzer",
        "startTime": "Startzeit",
        "description": "Beschreibung",
        "parts": "Teile",
        "noPartsDefinedYet": "Noch keine Teile definiert",
        "goals": "Ziele",
        "noGoalsDefinedYet": "Noch keine Ziele definiert",
        "causeOfFailure": "Ursache des Fehlschlagens",
        "daysChecked": "Tage überprüft",
        "checkedDates": "Überprüfte Daten",
        "below": "unten",
        "repeat": "Wiederholen",
        "email": "E-Mail",
        "password": "Passwort",
        "signInWithEmail": "Mit E-Mail anmelden",
        "signUpWithEmail": "Mit E-Mail registrieren",
        "or": "ODER",
        "menu": "Menü",
        "exportData": "Daten exportieren",
        "importData": "Daten importieren",
        "exportSuccessful": "Tapas-Daten erfolgreich exportiert!",
        "exportFailed": "Fehler beim Exportieren der Tapas-Daten:",
        "importSuccessful": "Tapas-Daten erfolgreich importiert!",
        "importFailed": "Fehler beim Importieren der Tapas-Daten:",
        "invalidJsonFile": "Ungültige JSON-Datei. Bitte laden Sie eine gültige Tapas-Datendatei hoch.",
        "uploadFile": "Datei hochladen",
        "today": "Heute",
        "7d": "7T",
        "49d": "49T",
        "signIn": "Anmelden",
        "sureRepeat": "Möchten Sie „%s“ wirklich wiederholen?",
        "repeatOptionLabel": "Wählen Sie eine Wiederholungsoption:",
        "confirmRepeat": "Wiederholung bestätigen",
        "tapasRepeatedSuccessfully": "Tapas erfolgreich wiederholt!",
        "filterBy": "Filtern nach",
        "timeframe": "Zeitrahmen",
        "all": "Alle",
        "1month": "1 Monat",
        "3months": "3 Monate",
        "1year": "1 Jahr",
        "2years": "2 Jahre",
        "yesterdayNotApplicable": "Gestern überprüfen nicht anwendbar. Tapas entweder heute gestartet oder gestern wurde bereits überprüft.",
        "yesterdayCheckedSuccessfully": "Gestern erfolgreich überprüft!",
        "allowRecuperation": "Wiedergutmachung erlauben",
        "recuperatedDays": "Wiedergutgemachte Tage",
        "advancedDays": "Vorgezogene Tage",
        "yesterdayRecuperated": "Gestern wiedergutgemacht",
        "todayTomorrowFinishedInAdvance": "Heute & Morgen vorgezogen beendet",
        "notApplicableAlreadyCheckedOrOutsideDuration": "Nicht anwendbar. Datum bereits überprüft oder außerhalb der Tapas-Dauer.",
        "dayRecuperatedSuccessfully": "Tag erfolgreich wiedergutgemacht!",
        "daysAdvancedSuccessfully": "Tage erfolgreich vorgezogen!",
        "daysLeftOut": "Tage ausgelassen",
        "yesterdayPending": "gestern ausstehend",
        "todayPending": "heute ausstehend",
        "addResults": "Ergebnisse hinzufügen",
        "updateResults": "Ergebnisse aktualisieren",
        "results": "Ergebnisse",
        "noResultsDefinedYet": "Noch keine Ergebnisse definiert.",
        "clearLastDay": "Letzten Tag löschen",
        "noDayToClear": "Kein aktueller Tag zum Löschen.",
        "dayClearedSuccessfully": "Tag erfolgreich gelöscht!",
        "cannotClearFutureDay": "Zukünftiger Tag kann nicht gelöscht werden.",
        "tapasAutoMarkedActive": "Tapas nach Überprüfung automatisch als aktiv markiert.",
        "errorClearingDay": "Fehler beim Löschen des Tages:",
        "gdpr": "Datenschutz",
        "legalNotice": "Impressum",
        "license": "Lizenz",
        "about": "Über uns",
        "appVersion": "App-Version",
        "tapasWebsite": "Tapas Tracker Webseite",
        "aboutDescription": "Tapas Tracker ist ein Tool zur persönlichen Entwicklung, das Ihnen hilft, Ihre Tapas oder Ziele konsequent zu verfolgen und zu erreichen.  Tapas ist eine Form der Yoga-Praxis und Teil der zehn Yamas und Niyamas.  Die Anwendung ermöglicht es Ihnen, Ihren Tapas-Erfolg oder -Misserfolg zu verfolgen, die einzelnen Tapas-Teile und Ziele flexibel zu spezifizieren und Ergebnisse nach dem Ende des Tapas oder im Falle eines Tapas-Misserfolgs die Ursache dafür hinzuzufügen.  Verlauf und Statistiken helfen Ihnen, Ihr Tapasya zu analysieren und Wiederholungen fehlgeschlagener bzw. erfolgreicher Tapas zu planen.",
        "data": "Daten",
        "cleanData": "Daten bereinigen",
        "cleanDataConfirmation": "Möchten Sie wirklich alle Tapas löschen, deren Enddatum älter ist als der ausgewählte Zeitraum?",
        "cleaningDataSuccessful": "Datenbereinigung erfolgreich! %s Tapas gelöscht.",
        "cleaningDataFailed": "Datenbereinigung fehlgeschlagen:",
        "selectTimeframe": "Zeitrahmen auswählen",
        "5years": "5 Jahre",
        "cleaningOldTapas": "Alte Tapas bereinigen",
        "clean": "Bereinigen",
        "close": "Schließen"
    },
    ro: {
        "appName": "Urmăritor Tapas",
        "hello": "Salut",
        "userId": "ID utilizator",
        "logout": "Deconectare",
        "active": "Active",
        "history": "Istoric",
        "statistics": "Statistici",
        "addNew": "Adaugă Nou",
        "noTapasFound": "Nu s-au găsit Tapas în această categorie.",
        "startDate": "Data de început",
        "endDate": "Data de sfârșit",
        "duration": "Durată",
        "days": "zile",
        "daysRemaining": "Zile rămase",
        "status": "Stare",
        "successful": "Succes",
        "failed": "Eșuat",
        "todayFinished": "Azi terminat",
        "yesterdayFinished": "Ieri terminat",
        "markAsFailed": "Marchează ca eșuat",
        "editTapas": "Editează Tapas",
        "deleteTapas": "Șterge Tapas",
        "tapasDeletedSuccessfully": "Tapas șters cu succes!",
        "errorDeletingTapas": "Eroare la ștergerea Tapas:",
        "nameMismatch": "Numele nu corespunde. Vă rugăm să introduceți corect numele Tapas pentru a confirma ștergerea.",
        "confirmDeletion": "Pentru a confirma ștergerea, vă rugăm să introduceți numele Tapas",
        "typeTapasNameToConfirm": "Introduceți numele Tapas pentru a confirma",
        "cancel": "Anulează",
        "confirmDelete": "Confirmă ștergerea",
        "markTapasAsFailed": "Marchează Tapas ca eșuat",
        "sureMarkFailed": "Sigur doriți să marcați \"%s\" ca eșuat?",
        "causeOptional": "Cauză (opțional)",
        "repeatTapas": "Repetați Tapas?",
        "noDoNotRepeat": "Nu, nu repeta",
        "repeatSameDuration": "Repetați cu aceeași durată (%s zile)",
        "repeatNewDuration": "Repetați cu o nouă durată:",
        "repeatUntilOriginalEndDate": "Repetați până la data originală de sfârșit (%s)",
        "confirmFail": "Confirmă eșecul",
        "tapasMarkedAsFailed": "Tapas marcat ca eșuat!",
        "invalidNewDuration": "Durată nouă invalidă. Tapas nu a fost repetat.",
        "originalEndDateInPast": "Data originală de sfârșit este în trecut. Tapas nu a fost repetat.",
        "failedTapasRepeated": "Tapas eșuat repetat ca un nou Tapas!",
        "errorMarkingFailedRepeating": "Eroare la marcarea ca eșuat sau repetare:",
        "dayCheckedSuccessfully": "Zi verificată cu succes!",
        "tapasCompletedSuccessfully": "Tapas finalizat cu succes!",
        "dayAlreadyChecked": "Această zi a fost deja verificată.",
        "tapasAutoMarkedSuccessful": "Tapas marcat automat ca succes după revizuire.",
        "tapasPeriodOverNotAllDaysChecked": "Perioada Tapas s-a încheiat, dar nu toate zilele au fost verificate. Luați în considerare marcarea ca eșuat.",
        "addEditTapas": "Adaugă Tapas nou",
        "editTapasTitle": "Editează Tapas",
        "name": "Nume",
        "descriptionAndGoal": "Descriere și scop (opțional)",
        "goals0n": "Obiective 0..n (opțional, una pe linie)",
        "parts0n": "Părți 0..n (opțional, una pe linie)",
        "crystallizationTime": "Timp de cristalizare și conștientizare [zile] (opțional)",
        "updateTapas": "Actualizează Tapas",
        "addTapas": "Adaugă Tapas",
        "nameStartDateDurationRequired": "Numele, data de început și durata sunt obligatorii.",
        "durationPositiveNumber": "Durata trebuie să fie un număr pozitiv.",
        "tapasUpdatedSuccessfully": "Tapas actualizat cu succes!",
        "tapasAddedSuccessfully": "Tapas adăugat cu succes!",
        "errorSavingTapas": "Eroare la salvarea Tapas:",
        "cancelEdit": "Anulează editarea",
        "tapasStatistics": "Statistici Tapas",
        "activeTapasCount": "Tapas active",
        "count": "Număr",
        "avgDuration": "Durată medie",
        "successfulTapasCount": "Tapas reușite",
        "failedTapasCount": "Tapas eșuate",
        "avgDone": "Medie % finalizat",
        "welcomeTapasTracker": "Bine ați venit la Tapas Tracker!",
        "trackPersonalGoals": "Urmăriți-vă obiectivele de dezvoltare personală.",
        "signInWithGoogle": "Conectați-vă cu Google",
        "continueAsGuest": "Continuați ca invitat",
        "loadingApp": "Se încarcă aplicația...",
        "anErrorOccurred": "A apărut o eroare!",
        "pleaseRefreshContactSupport": "Vă rugăm să reîncărcați sau să contactați asistența dacă problema persistă.",
        "firebaseInitFailed": "Inițializarea Firebase a eșuat:",
        "errorLoadingTapasData": "Eroare la încărcarea datelor Tapas:",
        "googleSignInFailed": "Conectarea Google a eșuat:",
        "logoutFailed": "Deconectarea a eșuat:",
        "overallProgress": "Progres",
        "guestUser": "Utilizator invitat",
        "startTime": "Ora de început",
        "description": "Descriere",
        "parts": "Părți",
        "noPartsDefinedYet": "Nu s-au definit încă părți",
        "goals": "Obiective",
        "noGoalsDefinedYet": "Nu s-au definit încă obiective",
        "causeOfFailure": "Cauza eșecului",
        "daysChecked": "zile verificate",
        "checkedDates": "Date verificate",
        "below": "mai jos",
        "repeat": "Repetă",
        "email": "E-mail",
        "password": "Parolă",
        "signInWithEmail": "Conectare cu E-mail",
        "signUpWithEmail": "Înregistrare cu E-mail",
        "or": "SAU",
        "menu": "Meniu",
        "exportData": "Exportă date",
        "importData": "Importă date",
        "exportSuccessful": "Datele Tapas au fost exportate cu succes!",
        "exportFailed": "Eroare la exportarea datelor Tapas:",
        "importSuccessful": "Datele Tapas au fost importate cu succes!",
        "importFailed": "Eroare la importarea datelor Tapas:",
        "invalidJsonFile": "Fișier JSON invalid. Vă rugăm să încărcați un fișier de date Tapas valid.",
        "uploadFile": "Încarcă fișier",
        "today": "Azi",
        "7d": "7z",
        "49d": "49z",
        "signIn": "Conectare",
        "sureRepeat": "Sigur doriți să repetați \"%s\"?",
        "repeatOptionLabel": "Alegeți o opțiune de repetare:",
        "confirmRepeat": "Confirmă repetarea",
        "tapasRepeatedSuccessfully": "Tapas repetat cu succes!",
        "filterBy": "Filtrează după",
        "timeframe": "Perioadă de timp",
        "all": "Toate",
        "1month": "1 Lună",
        "3months": "3 Luni",
        "1year": "1 An",
        "2years": "2 Ani",
        "yesterdayNotApplicable": "Verificarea de ieri nu este aplicabilă. Tapas a început astăzi sau ieri a fost deja verificat.",
        "yesterdayCheckedSuccessfully": "Ieri verificat cu succes!",
        "allowRecuperation": "Permite recuperare",
        "recuperatedDays": "Zile recuperate",
        "advancedDays": "Zile avansate",
        "yesterdayRecuperated": "Ieri recuperat",
        "todayTomorrowFinishedInAdvance": "Azi & Mâine terminate în avans",
        "notApplicableAlreadyCheckedOrOutsideDuration": "Nu se aplică. Data deja verificată sau în afara duratei tapasului.",
        "dayRecuperatedSuccessfully": "Zi recuperată cu succes!",
        "daysAdvancedSuccessfully": "Zile avansate cu succes!",
        "daysLeftOut": "zile omise",
        "yesterdayPending": "ieri în așteptare",
        "todayPending": "azi în așteptare",
        "addResults": "Adaugă Rezultate",
        "updateResults": "Actualizează Rezultate",
        "results": "Rezultate",
        "noResultsDefinedYet": "Nu s-au definit încă rezultate.",
        "clearLastDay": "Șterge ultima zi",
        "noDayToClear": "Nicio zi recentă de șters.",
        "dayClearedSuccessfully": "Zi ștearsă cu succes!",
        "cannotClearFutureDay": "Nu se poate șterge o zi viitoare.",
        "tapasAutoMarkedActive": "Tapas marcat automat ca activ după revizuire.",
        "errorClearingDay": "Eroare la ștergerea zilei:",
        "gdpr": "GDPR",
        "legalNotice": "Notă legală",
        "license": "licenţă",
        "about": "Despre",
        "appVersion": "Versiunea aplicației",
        "tapasWebsite": "Site-ul Tapas Tracker",
        "aboutDescription": "Tapas Tracker este un instrument de dezvoltare personală conceput pentru a te ajuta să urmărești și să-ți atingi Tapas-urile sau obiectivele în mod constant.  Tapas este o formă de practică yoghină și face parte din cele zece Yama și Niyama.  Aplicația îți permite să urmărești succesul sau eșecul Tapas-ului tău, să specifici flexibil părțile Tapas-ului, obiectivele acestuia și să adaugi rezultate după încheierea Tapas-ului sau, în cazul unui eșec Tapas, cauza acestuia.  Istoricul și statisticile ajută la analizarea Tapas-ului tău și la planificarea repetărilor Tapas-urilor eșuate sau de succes, respectiv.",
        "data": "Date",
        "cleanData": "Curăță Date",
        "cleanDataConfirmation": "Sunteți sigur că doriți să ștergeți toate Tapas-urile cu o dată de sfârșit mai veche decât perioada selectată?",
        "cleaningDataSuccessful": "Curățare date reușită! %s Tapas șterse.",
        "cleaningDataFailed": "Curățare date eșuată:",
        "selectTimeframe": "Selectează intervalul de timp",
        "5years": "5 Ani",
        "cleaningOldTapas": "Curățarea Tapas-urilor vechi",
        "clean": "Curăță",
        "close": "Închide"
    },
    it: {
        "appName": "Tapas Tracker",
        "hello": "Ciao",
        "userId": "ID utente",
        "logout": "Esci",
        "active": "Attive",
        "history": "Cronologia",
        "statistics": "Statistiche",
        "addNew": "Aggiungi nuovo",
        "noTapasFound": "Nessuna Tapas trovata in questa categoria.",
        "startDate": "Data di inizio",
        "endDate": "Data di fine",
        "duration": "Durata",
        "days": "giorni",
        "daysRemaining": "Giorni rimanenti",
        "status": "Stato",
        "successful": "Riuscito",
        "failed": "Fallito",
        "todayFinished": "Oggi finito",
        "yesterdayFinished": "Ieri finito",
        "markAsFailed": "Segna come fallito",
        "editTapas": "Modifica Tapas",
        "deleteTapas": "Elimina Tapas",
        "tapasDeletedSuccessfully": "Tapas eliminato con successo!",
        "errorDeletingTapas": "Errore durante l'eliminazione di Tapas:",
        "nameMismatch": "Corrispondenza del nome errata. Digitare correttamente il nome del Tapas per confermare l'eliminazione.",
        "confirmDeletion": "Per confermare l'eliminazione, digita il nome del Tapas",
        "typeTapasNameToConfirm": "Digita il nome del Tapas per confermare",
        "cancel": "Annulla",
        "confirmDelete": "Conferma eliminazione",
        "markTapasAsFailed": "Segna Tapas come fallito",
        "sureMarkFailed": "Sei sicuro di voler segnare \"%s\" come fallito?",
        "causeOptional": "Causa (opzionale)",
        "repeatTapas": "Ripetere Tapas?",
        "noDoNotRepeat": "No, non ripetere",
        "repeatSameDuration": "Ripeti con la stessa durata (%s giorni)",
        "repeatNewDuration": "Ripeti con nuova durata:",
        "repeatUntilOriginalEndDate": "Ripeti fino alla data di fine originale (%s)",
        "confirmFail": "Conferma fallimento",
        "tapasMarkedAsFailed": "Tapas segnato come fallito!",
        "invalidNewDuration": "Nuova durata non valida. Tapas non ripetuto.",
        "originalEndDateInPast": "La data di fine originale è nel passato. Tapas non ripetuto.",
        "failedTapasRepeated": "Tapas fallito ripetuto come nuovo Tapas!",
        "errorMarkingFailedRepeating": "Errore durante la marcatura come fallito o la ripetizione:",
        "dayCheckedSuccessfully": "Giorno controllato con successo!",
        "tapasCompletedSuccessfully": "Tapas completato con successo!",
        "dayAlreadyChecked": "Questo giorno è già stato controllato.",
        "tapasAutoMarkedSuccessful": "Tapas automaticamente segnato come riuscito dopo la revisione.",
        "tapasPeriodOverNotAllDaysChecked": "Il periodo Tapas è terminato, ma non tutti i giorni sono stati controllati. Considera di segnarlo come fallito.",
        "addEditTapas": "Aggiungi nuova Tapas",
        "editTapasTitle": "Modifica Tapas",
        "name": "Nome",
        "descriptionAndGoal": "Descrizione e obiettivo (opzionale)",
        "goals0n": "Obiettivi 0..n (opzionali, una per riga)",
        "parts0n": "Părți 0..n (opzionali, una per riga)",
        "crystallizationTime": "Tempo di cristallizzazione e consapevolezza [giorni] (opzionale)",
        "updateTapas": "Aggiorna Tapas",
        "addTapas": "Add Tapas",
        "nameStartDateDurationRequired": "Nome, Data di inizio e Durata sono obbligatori.",
        "durationPositiveNumber": "La durata deve essere un numero positivo.",
        "tapasUpdatedSuccessfully": "Tapas aggiornato con successo!",
        "tapasAddedSuccessfully": "Tapas aggiunto con successo!",
        "errorSavingTapas": "Eroare la salvarea Tapas:",
        "cancelEdit": "Annulla modifica",
        "tapasStatistics": "Statistiche Tapas",
        "activeTapasCount": "Tapas attive",
        "count": "Conteggio",
        "avgDuration": "Durata media",
        "successfulTapasCount": "Tapas riuscite",
        "failedTapasCount": "Tapas fallite",
        "avgDone": "Medie % completata",
        "welcomeTapasTracker": "Benvenuto in Tapas Tracker!",
        "trackPersonalGoals": "Tieni traccia dei tuoi obiettivi di sviluppo personale.",
        "signInWithGoogle": "Accedi con Google",
        "continueAsGuest": "Continua come ospite",
        "loadingApp": "Caricamento app...",
        "anErrorOccurred": "Si è verificato un errore!",
        "pleaseRefreshContactSupport": "Aggiorna la pagina o contatta l'assistenza se il problema persiste.",
        "firebaseInitFailed": "Inizializzazione Firebase fallita:",
        "errorLoadingTapasData": "Errore durante il caricamento dei dati Tapas:",
        "googleSignInFailed": "Accesso con Google fallito:",
        "logoutFailed": "Disconnessione fallita:",
        "overallProgress": "Progres",
        "guestUser": "Utente ospite",
        "startTime": "Ora de început",
        "description": "Descriere",
        "parts": "Părți",
        "noPartsDefinedYet": "Nessuna parte definita ancora",
        "goals": "Obiettivi",
        "noGoalsDefinedYet": "Nessun obiettivo definito ancora.",
        "causeOfFailure": "Causa del fallimento",
        "daysChecked": "giorni controllati",
        "checkedDates": "Date controllate",
        "below": "sotto",
        "repeat": "Ripeti",
        "email": "Email",
        "password": "Password",
        "signInWithEmail": "Accedi con Email",
        "signUpWithEmail": "Registrati con Email",
        "or": "O",
        "menu": "Meniu",
        "exportData": "Esporta dati",
        "importData": "Importa dati",
        "exportSuccessful": "Dati Tapas esportati con successo!",
        "exportFailed": "Impossibile esportare i dati Tapas:",
        "importSuccessful": "Dati Tapas importati con successo!",
        "importFailed": "Impossibile importare i dati Tapas:",
        "invalidJsonFile": "Fișier JSON non valid. Carica un fișier dati Tapas valid.",
        "uploadFile": "Carica file",
        "today": "Oggi",
        "7d": "7g",
        "49d": "49g",
        "signIn": "Accedi",
        "sureRepeat": "Sei sicuro di voler repetare \"%s\"?",
        "repeatOptionLabel": "Scegli un'opțiune de repetare:",
        "confirmRepeat": "Conferma ripetizione",
        "tapasRepeatedSuccessfully": "Tapas ripetato con successo!",
        "filterBy": "Filtra per",
        "timeframe": "Intervallo di tempo",
        "all": "Tutti",
        "1month": "1 Mese",
        "3months": "3 Luni",
        "1year": "1 Anno",
        "2years": "2 Anni",
        "yesterdayNotApplicable": "Controllo di ieri non applicabile. Tapas è iniziato oggi o ieri era stato già controllato.",
        "yesterdayCheckedSuccessfully": "Ieri controllato con successo!",
        "allowRecuperation": "Consenti recupero",
        "recuperatedDays": "Giorni recuperati",
        "advancedDays": "Giorni avanzati",
        "yesterdayRecuperated": "Ieri recuperato",
        "todayTomorrowFinishedInAdvance": "Oggi e Domani terminati in anticipo",
        "notApplicableAlreadyCheckedOrOutsideDuration": "Non applicabile. Data già verificată o al di fuori della durata del tapas.",
        "dayRecuperatedSuccessfully": "Giorno recuperato con successo!",
        "daysAdvancedSuccessfully": "Giorni avanzati con successo!",
        "daysLeftOut": "giorni saltati",
        "yesterdayPending": "ieri în sospenso",
        "todayPending": "oggi in sospeso",
        "addResults": "Aggiungi Risultati",
        "updateResults": "Aggiorna Risultate",
        "results": "Risultate",
        "noResultsDefinedYet": "Nessun risultato definito ancora.",
        "clearLastDay": "Cancella ultimo giorno",
        "noDayToClear": "Nessun giorno recente da cancellare.",
        "dayClearedSuccessfully": "Giorno cancellato con successo!",
        "cannotClearFutureDay": "Non è possibile cancellare un giorno futuro.",
        "tapasAutoMarkedActive": "Tapas automaticamente segnato come attivo dopo la revisione.",
        "errorClearingDay": "Errore durante la cancellazione del giorno:",
        "gdpr": "GDPR",
        "legalNotice": "Note legali",
        "license": "licenza",
        "about": "Informazioni",
        "appVersion": "Versione dell'app",
        "tapasWebsite": "Sito web di Tapas Tracker",
        "aboutDescription": "Tapas Tracker è uno strumento di sviluppo personale progettato per aiutarti a monitorare e raggiungere i tuoi Tapas o obiettivi in ​​modo coerente.  Tapas è una forma di pratica yoga e fa parte dei dieci Yama e Niyama.  L'applicazione ti permette di monitorare il successo o il fallimento dei tuoi Tapas, di specificare in modo flessibile le parti del Tapas, i suoi obiettivi e di aggiungere i risultati al termine del Tapas o, in caso di fallimento, la causa.  Cronologia e statistiche aiutano ad analizzare i tuoi Tapasya e a pianificare le ripetizioni di Tapas fallite o riuscite.",
        "close": "Chiudere"
    },
    ru: {
        "appName": "Трекер Тапас",
        "hello": "Привет",
        "userId": "ID пользователя",
        "logout": "Выйти",
        "active": "Активные",
        "history": "История",
        "statistics": "Статистика",
        "addNew": "Добавить новую",
        "noTapasFound": "Тапас в этой категории не найдено.",
        "startDate": "Дата начала",
        "endDate": "Дата окончания",
        "duration": "Продолжительность",
        "days": "дней",
        "daysRemaining": "Дней осталось",
        "status": "Статус",
        "successful": "Успешно",
        "failed": "Неудача",
        "todayFinished": "Сегодня завершено",
        "yesterdayFinished": "Вчера завершено",
        "markAsFailed": "Пометить как проваленное",
        "editTapas": "Редактировать Тапас",
        "deleteTapas": "Удалить Тапас",
        "tapasDeletedSuccessfully": "Тапас успешно удален!",
        "errorDeletingTapas": "Ошибка при удалении Тапас:",
        "nameMismatch": "Несоответствие имени. Пожалуйста, введите имя Тапас правильно, чтобы подтвердить удаление.",
        "confirmDeletion": "Для подтверждения удаления, пожалуйста, введите имя Тапас",
        "typeTapasNameToConfirm": "Введите имя Тапас для подтверждения",
        "cancel": "Отмена",
        "confirmDelete": "Подтвердить удаление",
        "markTapasAsFailed": "Пометить Тапас как проваленное",
        "sureMarkFailed": "Вы уверены, что хотите пометить «%s» как проваленное?",
        "causeOptional": "Причина (необязательно)",
        "repeatTapas": "Повторить Тапас?",
        "noDoNotRepeat": "Нет, не повторять",
        "repeatSameDuration": "Повторить с той же продолжительностью (%s дней)",
        "repeatNewDuration": "Повторить с новой продолжительностью:",
        "repeatUntilOriginalEndDate": "Повторять до исходной даты окончания (%s)",
        "confirmFail": "Подтвердить провал",
        "tapasMarkedAsFailed": "Тапас помечено как проваленное!",
        "invalidNewDuration": "Неверная новая продолжительность. Тапас не повторен.",
        "originalEndDateInPast": "Исходная дата окончания в прошлом. Тапас не повторен.",
        "failedTapasRepeated": "Проваленное Тапас повторено как новое Тапас!",
        "errorMarkingFailedRepeating": "Ошибка при пометке проваленного или повторении:",
        "dayCheckedSuccessfully": "День успешно отмечен!",
        "tapasCompletedSuccessfully": "Тапас успешно завершено!",
        "dayAlreadyChecked": "Этот день уже был отмечен.",
        "tapasAutoMarkedSuccessful": "Тапас автоматически помечено как успешное после проверки.",
        "tapasPeriodOverNotAllDaysChecked": "Период Тапас закончился, но не все дни были отмечены. Рассмотрите возможность пометить как проваленное.",
        "addEditTapas": "Добавить новую Тапас",
        "editTapasTitle": "Редактировать Тапас",
        "name": "Имя",
        "descriptionAndGoal": "Описание и цель (необязательно)",
        "goals0n": "Цели 0..n (необязательно, одна на строку)",
        "parts0n": "Части 0..n (необязательно, одна на строку)",
        "crystallizationTime": "Время кристаллизации и осознания [дней] (необязательно)",
        "updateTapas": "Обновить Тапас",
        "addTapas": "Добавить Тапас",
        "nameStartDateDurationRequired": "Имя, дата начала и продолжительность обязательны.",
        "durationPositiveNumber": "Продолжительность должна быть положительным числом.",
        "tapasUpdatedSuccessfully": "Тапас успешно обновлен!",
        "tapasAddedSuccessfully": "Тапас успешно добавлено!",
        "errorSavingTapas": "Ошибка при сохранении Тапас:",
        "cancelEdit": "Отменить редактирование",
        "tapasStatistics": "Статистика Тапас",
        "activeTapasCount": "Активные Тапас",
        "count": "Количество",
        "avgDuration": "Средняя продолжительность",
        "successfulTapasCount": "Успешные Тапас",
        "failedTapasCount": "Проваленные Тапас",
        "avgDone": "Средний % выполнения",
        "welcomeTapasTracker": "Добро пожаловать в Тапас Трекер!",
        "trackPersonalGoals": "Отслеживайте свои цели личного развития.",
        "signInWithGoogle": "Войти через Google",
        "continueAsGuest": "Продолжить как гость",
        "loadingApp": "Загрузка приложения...",
        "anErrorOccurred": "Произошла ошибка!",
        "pleaseRefreshContactSupport": "Пожалуйста, обновите страницу или свяжитесь со службой поддержки, если проблема не исчезнет.",
        "firebaseInitFailed": "Firebase-инициализация не удалась:",
        "errorLoadingTapasData": "Ошибка загрузки данных Тапас:",
        "googleSignInFailed": "Вход через Google не удался:",
        "logoutFailed": "Выход не удался:",
        "overallProgress": "Прогресс",
        "guestUser": "Гостевой пользователь",
        "startTime": "Время начала",
        "description": "Описание",
        "parts": "Части",
        "noPartsDefinedYet": "Части еще не определены",
        "goals": "Цели",
        "noGoalsDefinedYet": "Цели еще не определены",
        "causeOfFailure": "Причина неудачи",
        "daysChecked": "дней отмечено",
        "checkedDates": "Отмеченные даты",
        "below": "ниже",
        "repeat": "Повторить",
        "email": "Эл. почта",
        "password": "Пароль",
        "signInWithEmail": "Войти с эл. почтой",
        "signUpWithEmail": "Зарегистрироваться с эл. почтой",
        "or": "ИЛИ",
        "menu": "МЕНЮ",
        "exportData": "Экспорт данных",
        "importData": "Импорт данных",
        "exportSuccessful": "Данные Tapas успешно экспортированы!",
        "exportFailed": "Не удалось экспортировать данные Tapas:",
        "importSuccessful": "Данные Tapas успешно импортированы!",
        "importFailed": "Не удалось импортировать данные Tapas:",
        "invalidJsonFile": "Неверный файл JSON. Пожалуйста, загрузите действительный файл данных Tapas.",
        "uploadFile": "Загрузить файл",
        "today": "Сегодня",
        "7d": "7дн",
        "49d": "49дн",
        "signIn": "Войти",
        "sureRepeat": "Вы уверены, что хотите повторить \"%s\"?",
        "repeatOptionLabel": "Выберите вариант повторения:",
        "confirmRepeat": "Подтвердить повтор",
        "tapasRepeatedSuccessfully": "Тапас успешно повторен!",
        "filterBy": "Фильтровать по",
        "timeframe": "Временной интервал",
        "all": "Все",
        "1month": "1 месяц",
        "3months": "3 месяца",
        "1year": "1 год",
        "2years": "2 года",
        "yesterdayNotApplicable": "Вчерашняя проверка неприменима. Тапас либо начался сегодня, либо вчера уже был проверен.",
        "yesterdayCheckedSuccessfully": "Вчера успешно проверено!",
        "allowRecuperation": "Разрешить восстановление",
        "recuperatedDays": "Восстановленные дни",
        "advancedDays": "Продвинутые дни",
        "yesterdayRecuperated": "Вчера восстановлено",
        "todayTomorrowFinishedInAdvance": "Сегодня и завтра завершено заранее",
        "notApplicableAlreadyCheckedOrOutsideDuration": "Неприменимо. Дата уже проверена или выходит за рамки продолжительности тапас.",
        "dayRecuperatedSuccessfully": "День успешно восстановлен!",
        "daysAdvancedSuccessfully": "Дни успешно продвинуты!",
        "daysLeftOut": "пропущенных дней",
        "yesterdayPending": "вчера в ожидании",
        "todayPending": "сегодня в ожидании",
        "addResults": "Добавить результаты",
        "updateResults": "Обновить результаты",
        "results": "Результаты",
        "noResultsDefinedYet": "Результаты еще не определены.",
        "clearLastDay": "Очистить последний день",
        "noDayToClear": "Нет недавнего дня для очистки.",
        "dayClearedSuccessfully": "День успешно очищен!",
        "cannotClearFutureDay": "Нельзя очистить будущий день.",
        "tapasAutoMarkedActive": "Тапас автоматически помечен как активный после проверки.",
        "errorClearingDay": "Ошибка при очистке дня:",
        "gdpr": "GDPR",
        "legalNotice": "Юридическое уведомление",
        "license": "лицензия",
        "about": "О программе",
        "appVersion": "Версия приложения",
        "tapasWebsite": "Веб-сайт Tapas Tracker",
        "aboutDescription": "Tapas Tracker — это инструмент для личного развития, призванный помочь вам отслеживать и последовательно достигать ваших тапасов или целей.  Тапас — это форма йогической практики и часть десяти Ям и Ниям.  Приложение позволяет вам отслеживать успехи или неудачи в тапасах, гибко определять части тапаса, его цели и добавлять результаты после окончания тапаса или, в случае неудачи тапаса, причину ее возникновения.  История и статистика помогают анализировать вашу тапасью и планировать повторения неудачных или успешных тапасов соответственно.",
        "data": "Данные",
        "cleanData": "Очистить данные",
        "cleanDataConfirmation": "Вы уверены, что хотите удалить все Тапасы с датой окончания, старше выбранного периода?",
        "cleaningDataSuccessful": "Очистка данных прошла успешно! %s Тапасов удалено.",
        "cleaningDataFailed": "Ошибка очистки данных:",
        "selectTimeframe": "Выбрать период",
        "5years": "5 лет",
        "cleaningOldTapas": "Очистка старых Тапасов",
        "clean": "Очистить",
        "close": "закрывать"
    }
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
            args.forEach(arg => {
                translatedText = translatedText.replace('%s', arg);
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


// Define context for Firebase and user data
const AppContext = createContext(null);


// Component for a custom confirmation dialog
const ConfirmDialog = ({ message, onConfirm, onCancel, confirmText, cancelText }) => {
    return (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-75 flex items-center justify-center p-4 z-50">
            <div className="bg-white p-6 rounded-lg shadow-xl max-w-sm w-full mx-auto">
                <p className="text-lg font-semibold text-gray-800 mb-6 text-center">{message}</p>
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

// Helper to format date objects toYYYY-MM-DD strings for comparison
const formatDateToISO = (date) => date.toISOString().split('T')[0];

const formatDateNoTimeToISO = (date) => {
    date.setHours(0, 0, 0, 0); // Normalize to start of day
    return formatDateToISO(date);
};

const isTapasDateChecked = (checkedDays, date) => checkedDays && checkedDays.some(timestamp => {
    if (timestamp && timestamp.seconds) {
        timestamp = new Timestamp(timestamp.seconds, timestamp.nanoseconds);
    }
    const checkedDate = timestamp.toDate();
    return formatDateNoTimeToISO(checkedDate) === formatDateToISO(date);
});

// Component for adding/editing a Tapas
const TapasForm = ({ onTapasAdded, editingTapas, onCancelEdit }) => {
    const { db, userId, t } = useContext(AppContext);
    const [name, setName] = useState('');
    const [startDate, setStartDate] = useState('');
    const [startTime, setStartTime] = useState('');
    const [duration, setDuration] = useState('');
    const [endDate, setEndDate] = useState(''); // New state for end date
    const [description, setDescription] = useState('');
    const [goals, setGoals] = useState(''); // New state for goals
    const [parts, setParts] = useState('');
    const [crystallizationTime, setCrystallizationTime] = useState('');
    const [errorMessage, setErrorMessage] = useState('');
    const [successMessage, setSuccessMessage] = useState('');
    const [allowRecuperation, setAllowRecuperation] = useState(false); // New state for recuperation

    // Effect to set form fields when editingTapas prop changes
    useEffect(() => {
        if (editingTapas) {
            setName(editingTapas.name || '');
            setStartDate(editingTapas.startDate ? new Date(editingTapas.startDate.toDate()).toISOString().split('T')[0] : '');
            setStartTime(editingTapas.startTime || '');
            
            // Ensure duration is handled correctly for editing
            const loadedDuration = editingTapas.duration;
            setDuration(loadedDuration || ''); // Set state from loaded data

            setDescription(editingTapas.description || null);
            setGoals(editingTapas.goals ? editingTapas.goals.join('\n') : ''); // Set goals from loaded data
            setParts(editingTapas.parts ? editingTapas.parts.join('\n') : '');
            setCrystallizationTime(editingTapas.crystallizationTime || '');
            setAllowRecuperation(editingTapas.allowRecuperation || false);

            // Calculate endDate from startDate and loadedDuration, ensuring validity
            if (editingTapas.startDate && loadedDuration && !isNaN(parseInt(loadedDuration)) && parseInt(loadedDuration) > 0) {
                const start = new Date(editingTapas.startDate.toDate());
                start.setHours(0, 0, 0, 0); // Normalize
                const end = new Date(start);
                end.setDate(start.getDate() + parseInt(loadedDuration)); // Adjust for 1-based duration
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
            setDescription('');
            setGoals(''); // Reset goals
            setParts('');
            setCrystallizationTime('');
            setEndDate(''); // Also reset endDate
            setAllowRecuperation(false); // Reset allowRecuperation
        }
        setErrorMessage('');
        setSuccessMessage('');
    }, [editingTapas]);

    // Effect to synchronize duration and endDate when startDate changes
    useEffect(() => {
        if (startDate) {
            if (duration && !isNaN(parseInt(duration)) && parseInt(duration) > 0) {
                // If duration is already set, recalculate endDate
                const start = new Date(startDate);
                start.setHours(0, 0, 0, 0);
                const end = new Date(start);
                end.setDate(start.getDate() + parseInt(duration));
                setEndDate(end.toISOString().split('T')[0]);
            } else if (endDate) {
                // If endDate is already set, recalculate duration
                const start = new Date(startDate);
                start.setHours(0, 0, 0, 0);
                const end = new Date(endDate);
                end.setHours(0, 0, 0, 0);
                if (end >= start) {
                    const diffTime = end.getTime() - start.getTime();
                    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
                    setDuration(diffDays.toString());
                } else {
                    setDuration(''); // Invalid end date relative to start
                }
            }
        } else {
            // If startDate is cleared, clear only endDate, keep duration
            setEndDate('');
        }
    }, [startDate]); // Dependency on startDate


    const handleChangeDuration = (e) => {
        const newDuration = e.target.value;
        setDuration(newDuration);
        if (startDate && newDuration && !isNaN(parseInt(newDuration)) && parseInt(newDuration) > 0) {
            const start = new Date(startDate);
            start.setHours(0, 0, 0, 0);
            const end = new Date(start);
            end.setDate(start.getDate() + parseInt(newDuration)); // Subtract 1 because duration includes the start day
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
                const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1; // +1 to include both start and end days
                setDuration(diffDays.toString());
            } else {
                setDuration(''); // Invalid end date relative to start
            }
        } else {
            setDuration('');
        }
    };

    const handleSetDurationFromButton = (days) => {
        setDuration(days.toString());
        if (startDate) {
            const start = new Date(startDate);
            start.setHours(0, 0, 0, 0);
            const end = new Date(start);
            end.setDate(start.getDate() + days);
            setEndDate(end.toISOString().split('T')[0]);
        }
    };


    const handleSubmit = async (e) => {
        e.preventDefault();
        setErrorMessage('');
        setSuccessMessage('');

        if (!name || !startDate || !duration) { // Duration is the source of truth for calculation
            setErrorMessage(t('nameStartDateDurationRequired'));
            return;
        }

        if (isNaN(parseInt(duration)) || parseInt(duration) <= 0) {
            setErrorMessage(t('durationPositiveNumber'));
            return;
        }

        const appId = typeof __app_id !== 'undefined' ? __app_id : 'default-app-id';
        const tapasData = {
            name,
            startDate: new Date(startDate),
            startTime: startTime || null,
            duration: parseInt(duration),
            description: description || null,
            goals: goals.split('\n').filter(g => g.trim() !== '') || [], // Include goals
            parts: parts.split('\n').filter(p => p.trim() !== '') || [],
            crystallizationTime: crystallizationTime ? parseInt(crystallizationTime) : null,
            allowRecuperation: allowRecuperation, // Include new field
            // Preserve existing status, checkedDays, failureCause, and createdAt when editing
            status: editingTapas ? editingTapas.status : 'active',
            checkedDays: editingTapas ? editingTapas.checkedDays : [],
            failureCause: editingTapas ? editingTapas.failureCause : null,
            recuperatedDays: editingTapas ? editingTapas.recuperatedDays || [] : [], // New field initialization
            advancedDays: editingTapas ? editingTapas.advancedDays || [] : [], // New field initialization
            createdAt: editingTapas ? editingTapas.createdAt : new Date(), // Keep original creation date
            userId: userId, // Ensure userId is associated with the Tapas
            checkedPartsByDate: editingTapas ? editingTapas.checkedPartsByDate : {}, // Initialize for new Tapas
            results: editingTapas ? editingTapas.results || null : null, // Initialize results field
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
                setDescription('');
                setGoals(''); // Clear goals
                setParts('');
                setCrystallizationTime('');
                setAllowRecuperation(false); // Reset after adding
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
        <div className="p-4 bg-white rounded-lg shadow-md mb-6">
            <h2 className="text-2xl font-bold text-gray-800 mb-4">{editingTapas ? t('editTapasTitle') : t('addEditTapas')}</h2>
            {errorMessage && <p className="text-red-600 mb-4 font-medium">{errorMessage}</p>}
            {successMessage && <p className="text-green-600 mb-4 font-medium">{successMessage}</p>}

            <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="col-span-1">
                    <label htmlFor="name" className="block text-sm font-medium text-gray-700">{t('name')}</label>
                    <input
                        type="text"
                        id="name"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                        required
                    />
                </div>
                <div className="col-span-1">
                    <label htmlFor="startDate" className="block text-sm font-medium text-gray-700">{t('startDate')}</label>
                    <div className="flex items-center mt-1">
                        <input
                            type="date"
                            id="startDate"
                            value={startDate}
                            onChange={(e) => setStartDate(e.target.value)}
                            className="block w-full px-3 py-2 border border-gray-300 rounded-l-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
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
                <div className="col-span-1">
                    <label htmlFor="startTime" className="block text-sm font-medium text-gray-700">{t('startTime')} ({t('causeOptional').split('(')[0].trim().toLowerCase()})</label>
                    <input
                        type="time"
                        id="startTime"
                        value={startTime}
                        onChange={(e) => setStartTime(e.target.value)}
                        className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                    />
                </div>
                <div className="col-span-1">
                    <label htmlFor="duration" className="block text-sm font-medium text-gray-700">{t('duration')} [{t('days').toLowerCase()}]</label>
                    <div className="flex items-center mt-1">
                        <input
                            type="number"
                            id="duration"
                            value={duration}
                            onChange={handleChangeDuration} // Use the new handler
                            className="block w-full px-3 py-2 border border-gray-300 rounded-l-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                            required
                            min="1"
                        />
                        <button
                            type="button"
                            onClick={() => handleSetDurationFromButton(7)} // Updated handler
                            className="px-3 py-2 bg-indigo-500 text-white hover:bg-indigo-600 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 transition-colors duration-200"
                        >
                            {t('7d')}
                        </button>
                        <button
                            type="button"
                            onClick={() => handleSetDurationFromButton(49)} // Updated handler
                            className="px-3 py-2 bg-indigo-500 text-white rounded-r-md hover:bg-indigo-600 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                        >
                            {t('49d')}
                        </button>
                    </div>
                </div>
                <div className="col-span-1">
                    <label htmlFor="endDate" className="block text-sm font-medium text-gray-700">{t('endDate')}</label>
                    <input
                        type="date"
                        id="endDate"
                        value={endDate}
                        onChange={handleChangeEndDate} // Use the new handler
                        className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                    />
                </div>
                <div className="col-span-full">
                    <label htmlFor="description" className="block text-sm font-medium text-gray-700">{t('descriptionAndGoal')}</label>
                    <textarea
                        id="description"
                        value={description}
                        onChange={(e) => setDescription(e.target.value)}
                        rows="3"
                        className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                    ></textarea>
                </div>
                {/* New: Goals input */}
                <div className="col-span-full">
                    <label htmlFor="goals" className="block text-sm font-medium text-gray-700">{t('goals0n')}</label>
                    <textarea
                        id="goals"
                        value={goals}
                        onChange={(e) => setGoals(e.target.value)}
                        rows="3"
                        className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                    ></textarea>
                </div>
                <div className="col-span-full">
                    <label htmlFor="parts" className="block text-sm font-medium text-gray-700">{t('parts0n')}</label>
                    <textarea
                        id="parts"
                        value={parts}
                        onChange={(e) => setParts(e.target.value)}
                        rows="3"
                        className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                    ></textarea>
                </div>
                <div className="col-span-full">
                    <label htmlFor="crystallizationTime" className="block text-sm font-medium text-gray-700">{t('crystallizationTime')}</label>
                    <input
                        type="number"
                        id="crystallizationTime"
                        value={crystallizationTime}
                        onChange={(e) => setCrystallizationTime(e.target.value)}
                        className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
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
                    />
                    <label htmlFor="allowRecuperation" className="ml-2 block text-sm font-medium text-gray-700">
                        {t('allowRecuperation')}
                    </label>
                </div>

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

// Component to display a list of Tapas
const TapasList = ({ tapas, onSelectTapas, showFilters = false, historyStatusFilter, setHistoryStatusFilter, historyTimeFilter, setHistoryTimeFilter }) => {
    const { t } = useContext(AppContext);

    // Helper function to calculate end date and remaining days
    const getTapasDatesInfo = (tapasItem) => {
        const today = new Date();
        today.setHours(0, 0, 0, 0); // Normalize today to start of day

        const startDate = tapasItem.startDate.toDate();
        startDate.setHours(0, 0, 0, 0); // Normalize start date to start of day

        const endDate = new Date(startDate);
        endDate.setDate(startDate.getDate() + tapasItem.duration - 1); // Reduced by one day
        endDate.setHours(0, 0, 0, 0);

        const diffTime = endDate.getTime() - today.getTime();
        const daysRemaining = Math.max(0, Math.ceil(diffTime / (1000 * 60 * 60 * 24)));

        return { endDate, daysRemaining };
    };

    // Helper to get detailed status for active tapas display
    const getDetailedStatus = useCallback((tapasItem) => {
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        const startDate = tapasItem.startDate.toDate();
        startDate.setHours(0, 0, 0, 0);

        const endDate = new Date(startDate);
        endDate.setDate(startDate.getDate() + tapasItem.duration - 1);
        endDate.setHours(0, 0, 0, 0);

        const yesterday = new Date(today);
        yesterday.setDate(today.getDate() - 1);
        const yesterdayISO = yesterday.toISOString().split('T')[0];
        const isYesterdayWithinDuration = yesterday >= startDate && yesterday <= endDate;
        const isYesterdayChecked = isTapasDateChecked(tapasItem.checkedDays, yesterday);
        const yesterdayPending = isYesterdayWithinDuration && !isYesterdayChecked;

        const todayISO = today.toISOString().split('T')[0];
        const isTodayWithinDuration = today >= startDate && today <= endDate;
        const isTodayChecked = isTapasDateChecked(tapasItem.checkedDays, today);
        const todayPending = isTodayWithinDuration && !isTodayChecked;

        let leftOutDaysCount = 0;
        const loopDate = new Date(startDate);
        while (loopDate < today && loopDate <= endDate) { // Iterate up to yesterday
            if (!isTapasDateChecked(tapasItem.checkedDays, loopDate)) {
                leftOutDaysCount++;
            }
            loopDate.setDate(loopDate.getDate() + 1);
        }

        // Changed priority: 1. yesterday pending, 2. today pending, 3. days left out
        if (yesterdayPending) {
            return { statusText: t('yesterdayPending'), statusClass: 'text-red-600' };
        } else if (todayPending) {
            return { statusText: t('todayPending'), statusClass: 'text-orange-600' }; // Changed to orange
        } else if (leftOutDaysCount > 0) {
            return { statusText: `${leftOutDaysCount} ${t('daysLeftOut')}`, statusClass: 'text-gray-600' };
        } else {
            return { statusText: '', statusClass: '' }; // No special pending status
        }
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
                <div className="bg-white p-4 rounded-lg shadow-md mb-6">
                    <div className="flex flex-col sm:flex-row justify-around items-center gap-4">
                        {/* Status Filter */}
                        <div className="flex items-center space-x-2">
                            <span className="text-gray-700 font-medium">{t('filterBy')}:</span>
                            <select
                                value={historyStatusFilter}
                                onChange={(e) => setHistoryStatusFilter(e.target.value)}
                                className="px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                            >
                                <option value="all">{t('all')}</option>
                                <option value="successful">{t('successful')}</option>
                                <option value="failed">{t('failed')}</option>
                            </select>
                        </div>

                        {/* Time Filter */}
                        <div className="flex items-center space-x-2">
                            <span className="text-gray-700 font-medium">{t('timeframe')}:</span>
                            <select
                                value={historyTimeFilter}
                                onChange={(e) => setHistoryTimeFilter(e.target.value)}
                                className="px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
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
                <p className="text-gray-600 text-center py-8">{t('noTapasFound')}</p>
            ) : (
                displayedTapas.map((tapasItem) => {
                    const { endDate, daysRemaining } = getTapasDatesInfo(tapasItem);
                    const { statusText, statusClass } = getDetailedStatus(tapasItem); // Get detailed status

                    return (
                        <div
                            key={tapasItem.id}
                            className="bg-white p-5 rounded-lg shadow-md hover:shadow-lg transition-shadow duration-200 cursor-pointer"
                            onClick={() => onSelectTapas(tapasItem)}
                        >
                            <h3 className="text-xl font-semibold text-indigo-700 mb-2">{tapasItem.name}</h3>
                            <p className="text-sm text-gray-600">{t('startDate')}: {tapasItem.startDate.toDate().toLocaleDateString()}</p>
                            <p className="text-sm text-gray-600">{t('endDate')}: {endDate.toLocaleDateString()}</p>
                            <p className="text-sm text-gray-600">{t('duration')}: {tapasItem.duration} {t('days').toLowerCase()}</p>
                            {tapasItem.status === 'active' && (
                                <p className="text-sm font-medium text-blue-600 mt-2">{t('daysRemaining')}: {daysRemaining}</p>
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
                        </div>
                    );
                })
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
            <div className="bg-white p-6 rounded-lg shadow-xl max-w-lg w-full mx-auto">
                <h3 className="text-xl font-bold text-gray-800 mb-4">{tapas.results ? t('updateResults') : t('addResults')}</h3>
                <textarea
                    value={resultsText}
                    onChange={(e) => setResultsText(e.target.value)}
                    rows="6"
                    className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 mb-4"
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
    const [showResultsModal, setShowResultsModal] = useState(false); // State for results modal


    const appId = typeof __app_id !== 'undefined' ? __app_id : 'default-app-id';
    const tapasRef = doc(db, `artifacts/${appId}/users/${userId}/tapas`, tapas.id);

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayDateString = today.toISOString().split('T')[0];

    const startDateObj = tapas.startDate.toDate();
    startDateObj.setHours(0, 0, 0, 0);

    const endDateObj = new Date(startDateObj);
    endDateObj.setDate(startDateObj.getDate() + tapas.duration - 1); // Reduced by one day
    endDateObj.setHours(0, 0, 0, 0);

    const daysTotal = tapas.duration;
    const checkedDaysCount = tapas.checkedDays ? tapas.checkedDays.length : 0;

    // Check if a specific date has been checked
    const isDateChecked = (date) => isTapasDateChecked(tapas.checkedDays, date);

    // Check if a specific date has been recuperated
    const isDateRecuperated = (date) => tapas.recuperatedDays && tapas.recuperatedDays.some(timestamp => {
        const recuperatedDate = timestamp.toDate();
        return formatDateToISO(recuperatedDate) === formatDateToISO(date);
    });

     // Check if a specific date has been advanced
    const isDateAdvanced = (date) => tapas.advancedDays && tapas.advancedDays.some(timestamp => {
        const advancedDate = timestamp.toDate();
        return formatDateToISO(advancedDate) === formatDateToISO(date);
    });

    const isTodayChecked = isDateChecked(today);

    const yesterday = new Date(today);
    yesterday.setDate(today.getDate() - 1);
    const isYesterdayChecked = isDateChecked(yesterday);

    const tomorrow = new Date(today);
    tomorrow.setDate(today.getDate() + 1);
    const isTomorrowChecked = isDateChecked(tomorrow);

    // Check if the tapas period is over
    const isPeriodOver = today >= endDateObj;
    const isSuccessful = tapas.status === 'successful';
    const isFailed = tapas.status === 'failed';

    // Load checkedPartsSelection from database on mount/tapas change
    useEffect(() => {
        const savedParts = tapas.checkedPartsByDate?.[todayDateString] || [];
        const initialSelection = savedParts.reduce((acc, index) => {
            acc[index] = true;
            return acc;
        }, {});
        setCheckedPartsSelection(initialSelection);
    }, [tapas.id, tapas.checkedPartsByDate, todayDateString]); // Add tapas.checkedPartsByDate to dependency array


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


    const handleTodayFinished = async () => {
        if (!isTodayChecked) {
            const updatedCheckedDays = [...(tapas.checkedDays || []), Timestamp.fromDate(new Date())];

            try {
                await updateDoc(tapasRef, {
                    checkedDays: updatedCheckedDays,
                });
                setMessage(t('dayCheckedSuccessfully'));
                setCheckedPartsSelection({}); // Clear the UI selection state for parts for next day/interaction
                setSelectedTapas(prev => ({ ...prev, checkedDays: updatedCheckedDays })); // Immediately update local state
            } catch (error) {
                console.error("Error marking day finished:", error);
                setMessage("Error marking day finished.");
            }

            // If all days checked, mark as successful
            if (updatedCheckedDays.length === daysTotal && isPeriodOver) {
                await updateDoc(tapasRef, { status: 'successful' });
                setMessage(t('tapasCompletedSuccessfully'));
                setSelectedTapas(prev => ({ ...prev, status: 'successful' })); // Immediately update local state for status
            }
        } else {
            setMessage(t('dayAlreadyChecked'));
        }
    };

    const handleYesterdayFinished = async () => {
        const yesterdayDate = new Date();
        yesterdayDate.setDate(yesterdayDate.getDate() - 1);
        yesterdayDate.setHours(0, 0, 0, 0); // Normalize to start of day

        // Check if yesterday is before the tapas start date
        if (yesterdayDate < startDateObj) {
            setMessage(t('yesterdayNotApplicable'));
            return;
        }

        // Check if yesterday was already checked
        const isYesterdayAlreadyChecked = tapas.checkedDays && tapas.checkedDays.some(timestamp => {
            const checkedDate = timestamp.toDate();
            return checkedDate.toDateString() === yesterdayDate.toDateString();
        });

        if (isYesterdayAlreadyChecked) {
            setMessage(t('dayAlreadyChecked'));
            return;
        }

        const updatedCheckedDays = [...(tapas.checkedDays || []), Timestamp.fromDate(yesterdayDate)];

        try {
            await updateDoc(tapasRef, {
                checkedDays: updatedCheckedDays,
            });
            setMessage(t('yesterdayCheckedSuccessfully'));
            setSelectedTapas(prev => ({ ...prev, checkedDays: updatedCheckedDays })); // Immediately update local state
            // No need to clear parts selection for yesterday as it's a retroactive action
        } catch (error) {
            console.error("Error marking yesterday finished:", error);
            setMessage("Error marking yesterday finished.");
        }
    };

    const handleYesterdayRecuperated = async () => {
        if (!tapas.allowRecuperation) return;

        const yesterdayDate = new Date(today);
        yesterdayDate.setDate(today.getDate() - 1);
        yesterdayDate.setHours(0, 0, 0, 0);

        if (isDateChecked(yesterdayDate) || yesterdayDate < startDateObj || yesterdayDate > endDateObj) {
            setMessage(t('notApplicableAlreadyCheckedOrOutsideDuration'));
            return;
        }

        const updatedCheckedDays = [...(tapas.checkedDays || []), yesterdayDate];
        const updatedRecuperatedDays = [...(tapas.recuperatedDays || []), yesterdayDate];

        try {
            await updateDoc(tapasRef, {
                checkedDays: updatedCheckedDays,
                recuperatedDays: updatedRecuperatedDays,
            });
            setMessage(t('dayRecuperatedSuccessfully'));
            setSelectedTapas(prev => ({ ...prev, checkedDays: updatedCheckedDays, recuperatedDays: updatedRecuperatedDays })); // Immediately update local state
            setShowRecuperationAdvanceMenu(false); // Close dropdown
        } catch (error) {
            console.error("Error recuperating yesterday:", error);
            setMessage(`Error: ${error.message}`);
        }
    };

    const handleTodayTomorrowFinishedInAdvance = async () => {
        if (!tapas.allowRecuperation) return;

        const datesToMark = [];
        const advancedDates = [];

        if (!isDateChecked(today) && today >= startDateObj && today <= endDateObj) {
            datesToMark.push(today);
        }

        if (!isDateChecked(tomorrow) && tomorrow >= startDateObj && tomorrow <= endDateObj) {
            datesToMark.push(tomorrow);
            advancedDates.push(tomorrow);
        }

        if (datesToMark.length === 0) {
            setMessage(t('notApplicableAlreadyCheckedOrOutsideDuration'));
            return;
        }

        const updatedCheckedDays = [...(tapas.checkedDays || []), ...datesToMark];
        const updatedAdvancedDays = [...(tapas.advancedDays || []), ...advancedDates];

        try {
            await updateDoc(tapasRef, {
                checkedDays: updatedCheckedDays,
                advancedDays: updatedAdvancedDays,
            });
            setMessage(t('daysAdvancedSuccessfully'));
            setSelectedTapas(prev => ({ ...prev, checkedDays: updatedCheckedDays, advancedDays: updatedAdvancedDays })); // Immediately update local state
            setShowRecuperationAdvanceMenu(false); // Close dropdown
        } catch (error) {
            console.error("Error advancing days:", error);
            setMessage(`Error: ${error.message}`);
        }
    };

    const handleClearLastDay = async () => {
        if (!tapas.checkedDays || tapas.checkedDays.length === 0) {
            setMessage(t('noDayToClear'));
            setShowRecuperationAdvanceMenu(false);
            return;
        }

        const sortedCheckedDays = [...tapas.checkedDays].sort((a, b) => b.toDate().getTime() - a.toDate().getTime());
        const lastCheckedDayTimestamp = sortedCheckedDays[0];
        const lastCheckedDay = lastCheckedDayTimestamp.toDate();
        lastCheckedDay.setHours(0, 0, 0, 0); // Normalize

        const diffToday = (today.getTime() - lastCheckedDay.getTime()) / (1000 * 60 * 60 * 24);

        // Check if the last checked day is today or yesterday
        if (diffToday < 0) { // Future day
            setMessage(t('cannotClearFutureDay'));
            setShowRecuperationAdvanceMenu(false);
            return;
        } else if (diffToday > 1) { // Older than yesterday
            setMessage(t('noDayToClear')); // More specific message could be added if needed
            setShowRecuperationAdvanceMenu(false);
            return;
        }

        // Proceed to clear
        const newCheckedDays = tapas.checkedDays.filter(
            ts => formatDateNoTimeToISO(ts.toDate()) !== formatDateToISO(lastCheckedDay)
        );

        // Also remove from recuperatedDays and advancedDays if it was one of them
        const newRecuperatedDays = tapas.recuperatedDays ? tapas.recuperatedDays.filter(
            ts => formatDateNoTimeToISO(ts.toDate()) !== formatDateToISO(lastCheckedDay)
        ) : [];
        const newAdvancedDays = tapas.advancedDays ? tapas.advancedDays.filter(
            ts => formatDateNoTimeToISO(ts.toDate()) !== formatDateToISO(lastCheckedDay)
        ) : [];

        // Clear checkedPartsByDate for the cleared day
        const newCheckedPartsByDate = { ...(tapas.checkedPartsByDate || {}) };
        delete newCheckedPartsByDate[formatDateToISO(lastCheckedDay)];

        try {
            await updateDoc(tapasRef, {
                checkedDays: newCheckedDays,
                recuperatedDays: newRecuperatedDays,
                advancedDays: newAdvancedDays,
                checkedPartsByDate: newCheckedPartsByDate,
                // If status was successful due to this last check, revert to active
                status: (tapas.status === 'successful' && newCheckedDays.length < daysTotal) ? 'active' : tapas.status
            });

            // Update local state immediately
            setSelectedTapas(prev => ({
                ...prev,
                checkedDays: newCheckedDays.map(d => d instanceof Date ? Timestamp.fromDate(d) : d),
                recuperatedDays: newRecuperatedDays.map(d => d instanceof Date ? Timestamp.fromDate(d) : d),
                advancedDays: newAdvancedDays.map(d => d instanceof Date ? Timestamp.fromDate(d) : d),
                checkedPartsByDate: newCheckedPartsByDate,
                status: (tapas.status === 'successful' && newCheckedDays.length < daysTotal) ? 'active' : tapas.status
            }));

            setMessage(t('dayClearedSuccessfully'));

            if (tapas.status === 'successful' && newCheckedDays.length < daysTotal) {
                setMessage(t('tapasAutoMarkedActive')); // Inform user about status change
            }
        } catch (error) {
            console.error("Error clearing last day:", error);
            setMessage(`${t('errorClearingDay')} ${error.message}`);
        } finally {
            setShowRecuperationAdvanceMenu(false); // Close dropdown
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
                let newDuration = tapas.duration;
                let newStartDate = new Date(); // New tapas starts today

                if (repeatOption === 'newDuration') {
                    if (isNaN(parseInt(newRepeatDuration)) || parseInt(newRepeatDuration) <= 0) {
                        setMessage(t('invalidNewDuration'));
                        return;
                    }
                    newDuration = parseInt(newRepeatDuration);
                } else if (repeatOption === 'untilEndDate') {
                    // Calculate duration until original end date (if it's in the future)
                    const diffTime = endDateObj.getTime() - newStartDate.getTime();
                    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
                    if (diffDays > 0) {
                        newDuration = diffDays;
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
                    duration: newDuration,
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
            let newDuration = tapas.duration;
            let newStartDate = new Date(); // New tapas starts today

            if (repeatOption === 'newDuration') {
                if (isNaN(parseInt(newRepeatDuration)) || parseInt(newRepeatDuration) <= 0) {
                    setMessage(t('invalidNewDuration'));
                    return;
                }
                newDuration = parseInt(newRepeatDuration);
            } else if (repeatOption === 'untilEndDate') {
                const originalEndDateAsDate = endDateObj; // Already calculated
                const diffTime = originalEndDateAsDate.getTime() - newStartDate.getTime();
                const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
                if (diffDays > 0) {
                    newDuration = diffDays;
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
                duration: newDuration,
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
                checkedPartsByDate: {},
                results: null, // New tapas starts with no results
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
        if (!isPeriodOver || isSuccessful || isFailed) return;

        // Automatically mark as successful if all days checked and period is over
        if (checkedDaysCount >= daysTotal) {
            await updateDoc(tapasRef, { status: 'successful' });
            setMessage(t('tapasAutoMarkedSuccessful'));
        } else {
            // If period is over but not all days checked, suggest marking as failed
            setMessage(t('tapasPeriodOverNotAllDaysChecked'));
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


    return (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-75 flex items-center justify-center p-4 z-40 overflow-y-auto">
            <div className="bg-white p-6 rounded-lg shadow-xl max-w-lg w-full mx-auto my-auto">
                <div className="flex justify-between items-center mb-6">
                    <h2 className="text-3xl font-bold text-gray-900">{tapas.name}</h2>
                    <button onClick={onClose} className="text-gray-500 hover:text-gray-700 text-3xl font-bold">
                        &times;
                    </button>
                </div>

                {message && <p className="mb-4 text-center text-green-600 font-medium">{message}</p>}

                <div className="space-y-4 text-gray-700">
                    <p><strong className="font-semibold">{t('startDate')}:</strong> {tapas.startDate.toDate().toLocaleDateString()}</p>
                    {tapas.startTime && <p><strong className="font-semibold">{t('startTime')}:</strong> {tapas.startTime}</p>}
                    <p><strong className="font-semibold">{t('duration')}:</strong> {tapas.duration} {t('days').toLowerCase()}</p>
                    {tapas.description && <p><strong className="font-semibold">{t('description')}:</strong> {tapas.description}</p>}
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
                        <p className="text-gray-500 italic">{t('noGoalsDefinedYet')}</p>
                    )}
                    {tapas.parts && tapas.parts.length > 0 ? (
                        <div>
                            <strong className="font-semibold">{t('parts')}:</strong>
                            <ul className="list-none ml-4 space-y-2"> {/* Changed to list-none to better control spacing with checkboxes */}
                                {tapas.parts.map((part, index) => (
                                    <li key={index} className="flex items-center space-x-2">
                                        {!isSuccessful && !isFailed && (
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
                            {!isSuccessful && !isFailed && (
                                <div className="flex justify-start space-x-2 mt-4">
                                    {!isTodayChecked && (
                                        <button
                                            onClick={handleTodayFinished} // Renamed
                                            className="bg-green-600 text-white px-4 py-2 rounded-lg shadow-md hover:bg-green-700 transition-colors duration-200 text-sm font-medium"
                                        >
                                            {t('todayFinished')}
                                        </button>
                                    )}
                                     {!isYesterdayChecked && (today.toDateString() !== startDateObj.toDateString()) && ( // Only show if yesterday wasn't checked and if tapas didn't start today
                                        <button
                                            onClick={handleYesterdayFinished}
                                            className="bg-blue-600 text-white px-4 py-2 rounded-lg shadow-md hover:bg-blue-700 transition-colors duration-200 text-sm font-medium"
                                        >
                                            {t('yesterdayFinished')}
                                        </button>
                                    )}
                                    <div className="relative">
                                        <button
                                            onClick={() => setShowRecuperationAdvanceMenu(!showRecuperationAdvanceMenu)}
                                            className="bg-blue-500 text-white px-4 py-2 rounded-lg shadow-lg hover:bg-blue-600 transition-colors duration-200 text-lg font-medium"
                                        >
                                            ...
                                        </button>
                                        {showRecuperationAdvanceMenu && ( // Moved Actions button here
                                            <div className="absolute left-0 mt-2 w-max bg-white rounded-md shadow-lg py-1 z-20">
                                                {/* Hide yesterdayRecuperated only if the date is already checked or outside duration */}
                                                {(tapas.allowRecuperation && !isDateChecked(yesterday) && yesterday >= startDateObj && yesterday <= endDateObj) && (
                                                    <button
                                                        onClick={handleYesterdayRecuperated}
                                                        className="block w-full text-left px-4 py-2 text-gray-800 hover:bg-gray-100"
                                                    >
                                                        {t('yesterdayRecuperated')}
                                                    </button>
                                                )}
                                                {/* Always show Today & Tomorrow Finished In Advance if recuperation is allowed */}
                                                {(!isDateChecked(today) && today >= startDateObj && today <= endDateObj) && (
                                                    <button
                                                        onClick={handleTodayTomorrowFinishedInAdvance}
                                                        className="block w-full text-left px-4 py-2 text-gray-800 hover:bg-gray-100"
                                                    >
                                                        {t('todayTomorrowFinishedInAdvance')}
                                                    </button>
                                                )}
                                                {/* New: Clear Last Day button */}
                                                <button
                                                    onClick={handleClearLastDay}
                                                    className="block w-full text-left px-4 py-2 text-gray-800 hover:bg-gray-100"
                                                >
                                                    {t('clearLastDay')}
                                                </button>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            )}
                        </div>
                    ) : (
                        <p className="text-gray-500 italic">{t('noPartsDefinedYet')}</p>
                    )}
                    {tapas.crystallizationTime && <p><strong className="font-semibold">{t('crystallizationTime')}:</strong> {tapas.crystallizationTime} {t('days').toLowerCase()}</p>}
                    <p><strong className="font-semibold">{t('status')}:</strong> <span className={`font-bold ${tapas.status === 'active' ? 'text-blue-600' : tapas.status === 'successful' ? 'text-green-600' : 'text-red-600'}`}>{t(tapas.status)}</span></p>
                    {tapas.failureCause && <p><strong className="font-semibold">{t('causeOfFailure')}:</strong> {tapas.failureCause}</p>}
                    {tapas.results && <p><strong className="font-semibold">{t('results')}:</strong> {tapas.results}</p>}
                    {!tapas.results && (isSuccessful || isFailed) && <p className="text-gray-500 italic">{t('noResultsDefinedYet')}</p>}

                    <p className="text-lg mt-4"><strong className="font-semibold">{t('overallProgress')}:</strong> {checkedDaysCount} / {daysTotal} {t('daysChecked')}</p>
                    {tapas.checkedDays && tapas.checkedDays.length > 0 && (
                        <div>
                            <strong className="font-semibold">{t('checkedDates')}:</strong>
                            <ul className="list-disc list-inside ml-4">
                                {tapas.checkedDays.map((timestamp, index) => (
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
                    {!isSuccessful && !isFailed && (
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

                    <button
                        onClick={() => setConfirmDelete(true)}
                        className="bg-gray-500 text-white px-6 py-3 rounded-lg shadow-lg hover:bg-gray-600 transition-colors duration-200 text-lg font-medium"
                    >
                        {t('deleteTapas')}
                    </button>
                </div>


                {confirmDelete && (
                    <div className="mt-6 p-4 border border-red-300 rounded-lg bg-red-50">
                        <p className="text-red-800 text-center mb-3">{t('confirmDeletion')} "<strong className="font-semibold">{tapas.name}</strong>" {t('below')}:</p>
                        <input
                            type="text"
                            value={confirmName}
                            onChange={(e) => setConfirmName(e.target.value)}
                            className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-red-500 focus:border-red-500 mb-4"
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
                        <div className="bg-white p-6 rounded-lg shadow-xl max-w-md w-full mx-auto">
                            <h3 className="text-xl font-bold text-gray-800 mb-4">{t('markTapasAsFailed')}</h3>
                            <p className="text-gray-700 mb-4">{t('sureMarkFailed', tapas.name)}</p>
                            <label htmlFor="failureCause" className="block text-sm font-medium text-gray-700 mb-2">{t('causeOptional')}</label>
                            <textarea
                                id="failureCause"
                                value={failureCause}
                                onChange={(e) => setFailureCause(e.target.value)}
                                rows="2"
                                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 mb-4"
                            ></textarea>

                            <label className="block text-sm font-medium text-gray-700 mb-2">{t('repeatTapas')}</label>
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
                                    <span className="ml-2 text-gray-700">{t('noDoNotRepeat')}</span>
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
                                    <span className="ml-2 text-gray-700">{t('repeatSameDuration', tapas.duration)}</span>
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
                                    <span className="ml-2 text-gray-700">{t('repeatNewDuration')}</span>
                                    {repeatOption === 'newDuration' && (
                                        <input
                                            type="number"
                                            value={newRepeatDuration}
                                            onChange={(e) => setNewRepeatDuration(e.target.value)}
                                            className="ml-2 w-24 px-2 py-1 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                                            min="1"
                                        />
                                    )}
                                    <span className="ml-1 text-gray-700">{t('days')}</span>
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
                                        <span className="ml-2 text-gray-700">{t('repeatUntilOriginalEndDate', endDateObj.toLocaleDateString())}</span>
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
                        <div className="bg-white p-6 rounded-lg shadow-xl max-w-md w-full mx-auto">
                            <h3 className="text-xl font-bold text-gray-800 mb-4">{t('repeatTapas')}</h3>
                            <p className="text-gray-700 mb-4">{t('sureRepeat', tapas.name)}</p>

                            <label className="block text-sm font-medium text-gray-700 mb-2">{t('repeatOptionLabel')}</label>
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
                                    <span className="ml-2 text-gray-700">{t('repeatSameDuration', tapas.duration)}</span>
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
                                    <span className="ml-2 text-gray-700">{t('repeatNewDuration')}</span>
                                    {repeatOption === 'newDuration' && (
                                        <input
                                            type="number"
                                            value={newRepeatDuration}
                                            onChange={(e) => setNewRepeatDuration(e.target.value)}
                                            className="ml-2 w-24 px-2 py-1 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                                            min="1"
                                        />
                                    )}
                                    <span className="ml-1 text-gray-700">{t('days')}</span>
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
                                        <span className="ml-2 text-gray-700">{t('repeatUntilOriginalEndDate', endDateObj.toLocaleDateString())}</span>
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
    const activeTapas = filteredTapas.filter(tapas => tapas.status === 'active');

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
            const checkedDaysCount = tapas.checkedDays ? tapas.checkedDays.length : 0;
            return sum + (checkedDaysCount / tapas.duration);
        }, 0);
        return (totalCompletion / tapasList.length * 100).toFixed(1);
    };

    const avgFailedCompletionPercentage = calculateAverageCompletion(failedTapas);


    return (
        <div className="p-4 bg-white rounded-lg shadow-md mb-6">
            <h2 className="text-2xl font-bold text-gray-800 mb-4">{t('tapasStatistics')}</h2>

            <div className="mb-4 flex flex-col sm:flex-row justify-end items-center gap-4">
                <div className="flex items-center space-x-2">
                    <span className="text-gray-700 font-medium">{t('timeframe')}:</span>
                    <select
                        value={statisticsTimeFilter}
                        onChange={(e) => setStatisticsTimeFilter(e.target.value)}
                        className="px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
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
                <div className="bg-green-50 p-4 rounded-lg shadow">
                    <h3 className="text-xl font-semibold text-green-800 mb-2">{t('activeTapasCount')}</h3>
                    <p className="text-gray-700">{t('count')}: <span className="font-bold text-green-900">{activeTapas.length}</span></p>
                    <p className="text-gray-700">{t('avgDuration')}: <span className="font-bold text-green-900">{avgActiveDuration} {t('days').toLowerCase()}</span></p>
                </div>

                <div className="bg-blue-50 p-4 rounded-lg shadow">
                    <h3 className="text-xl font-semibold text-blue-800 mb-2">{t('successfulTapasCount')}</h3>
                    <p className="text-gray-700">{t('count')}: <span className="font-bold text-blue-900">{successfulTapas.length}</span></p>
                    <p className="text-gray-700">{t('avgDuration')}: <span className="font-bold text-blue-900">{avgSuccessfulDuration} {t('days').toLowerCase()}</span></p>
                </div>

                <div className="bg-red-50 p-4 rounded-lg shadow">
                    <h3 className="text-xl font-semibold text-red-800 mb-2">{t('failedTapasCount')}</h3>
                    <p className="text-gray-700">{t('count')}: <span className="font-bold text-red-900">{failedTapas.length}</span></p>
                    <p className="text-gray-700">{t('avgDuration')}: <span className="font-bold text-red-900">{avgFailedDuration} {t('days').toLowerCase()}</span></p>
                    <p className="text-gray-700">{t('avgDone')}: <span className="font-bold text-red-900">{avgFailedCompletionPercentage}%</span></p>
                </div>
            </div>
        </div>
    );
};

// New About Modal Component
const AboutModal = ({ onClose }) => {
    const { t } = useContext(AppContext);
    return (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-75 flex items-center justify-center p-4 z-50">
            <div className="bg-white p-6 rounded-lg shadow-xl max-w-sm w-full mx-auto">
                <h3 className="text-2xl font-bold text-gray-800 mb-4">{t('about')}</h3>
                <p className="text-lg text-gray-700 mb-2"><strong>{t('appName')}</strong></p>
                <p className="text-md text-gray-600 mb-4">{t('appVersion')}: 1.0.0</p> {/* Hardcoded version */}
                <a
                    href="#" // Placeholder link
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-block bg-indigo-600 text-white px-5 py-2 rounded-lg shadow-md hover:bg-indigo-700 transition-colors duration-200 text-md font-medium mb-6"
                >
                    {t('tapasWebsite')}
                </a>
                <div className="text-gray-700 text-sm font-medium mb-6" style={{ whiteSpace: 'pre-wrap' }}>{t('aboutDescription').split("  ").join("\n\n")}</div>
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

// New Clean Data Modal Component
const CleanDataModal = ({ onClose, onCleanConfirmed }) => {
    const { t } = useContext(AppContext);
    const [selectedTimeframe, setSelectedTimeframe] = useState('5years'); // Default to 5 years

    const handleConfirm = () => {
        onCleanConfirmed(selectedTimeframe);
    };

    return (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-75 flex items-center justify-center p-4 z-50">
            <div className="bg-white p-6 rounded-lg shadow-xl max-w-sm w-full mx-auto">
                <h3 className="text-xl font-bold text-gray-800 mb-4">{t('cleaningOldTapas')}</h3>
                <p className="text-gray-700 mb-4 text-center">{t('cleanDataConfirmation')}</p>

                <label htmlFor="timeframeSelect" className="block text-sm font-medium text-gray-700 mb-2">
                    {t('selectTimeframe')}:
                </label>
                <select
                    id="timeframeSelect"
                    value={selectedTimeframe}
                    onChange={(e) => setSelectedTimeframe(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 mb-6"
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
            <div className="bg-white p-6 rounded-lg shadow-xl w-full max-w-2xl mx-auto my-auto">
                <button onClick={onClose} className="float-right text-gray-500 hover:text-gray-700 text-3xl font-bold">
                    &times;
                </button>
                <div className="flex justify-between items-center mb-6">
                    <div className="text-gray-700 text-sm font-medium mb-6" style={{ whiteSpace: 'pre-wrap' }}>
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
            <div className="bg-white p-6 rounded-lg shadow-xl w-full max-w-2xl mx-auto my-auto">
                <button onClick={onClose} className="float-right text-gray-500 hover:text-gray-700 text-3xl font-bold">
                    &times;
                </button>
                <h2 className="text-3xl font-bold text-gray-800 mb-6">{t('legalNotice')}</h2>
                <div className="flex justify-between items-center mb-6">
                    <div className="text-gray-700 text-sm font-medium mb-6" style={{ whiteSpace: 'pre-wrap' }}>
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
    const { t } = useContext(AppContext);
    return (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-75 flex items-center justify-center p-4 z-40 overflow-y-auto">
            <div className="bg-white p-6 rounded-lg shadow-xl w-full max-w-2xl mx-auto my-auto">
                <button onClick={onClose} className="float-right text-gray-500 hover:text-gray-700 text-3xl font-bold">
                    &times;
                </button>
                <h2 className="text-3xl font-bold text-gray-800 mb-6">{t('gdpr')}</h2>
                <div className="flex justify-between items-center mb-6">
                    <div className="text-gray-700 text-sm font-medium mb-6" style={{ whiteSpace: 'pre-wrap' }}>
                    </div>
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
    const [showCleanDataModal, setShowCleanDataModal] = useState(false); // State for Clean Data modal


    const { locale, setLocale, t } = useContext(LocaleContext);

    // Initialize Firebase and handle authentication
    useEffect(() => {
        const appId = typeof __app_id !== 'undefined' ? __app_id : 'default-app-id';
        const firebaseConfig = {
            apiKey: "AIzaSyB8O-7yvSsyaSyKTBFOzOY-E98zaiSsg6s",
            authDomain: "tapas-aya.firebaseapp.com",
            projectId: "tapas-aya",
            storageBucket: "tapas-aya.firebasestorage.app",
            messagingSenderId: "136005099339",
            appId: "1:136005099339:web:28b6186333d3ae2ef792ce"
        };

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
    }, [t]);

    // Fetch Tapas data
    useEffect(() => {
        if (!db || !userId) return;

        const appId = typeof __app_id !== 'undefined' ? __app_id : 'default-app-id';
        const tapasCollectionRef = collection(db, `artifacts/${appId}/users/${userId}/tapas`);
        const q = query(tapasCollectionRef);

        const unsubscribe = onSnapshot(q, (snapshot) => {
            const tapasData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            setTapas(tapasData);
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
                        if (key === 'checkedDays') {
                            exportableData[key] = data[key].map((timestamp) => {
                                if (timestamp && timestamp.seconds) {
                                    timestamp = new Timestamp(timestamp.seconds, timestamp.nanoseconds);
                                }
                                const checkedDate = timestamp.toDate();
                                return formatDateNoTimeToISO(checkedDate);
                            });
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
                        }
                        if (dataToSave.createdAt && typeof dataToSave.createdAt === 'string') {
                            dataToSave.createdAt = new Date(dataToSave.createdAt);
                        }
                        if (dataToSave.checkedDays && Array.isArray(dataToSave.checkedDays)) {
                            dataToSave.checkedDays = dataToSave.checkedDays.map(ts => {
                                if (typeof ts === 'string') return new Date(ts);
                                // If it's already a Firebase Timestamp, keep it
                                if (ts && ts.seconds) return new Timestamp(ts.seconds, ts.nanoseconds);
                                return ts;
                            });
                        }
                        if (dataToSave.completionDate && typeof dataToSave.completionDate === 'string') {
                            dataToSave.completionDate = new Date(dataToSave.completionDate);
                        }
                        // Handle checkedPartsByDate during import if present
                        if (dataToSave.checkedPartsByDate && typeof dataToSave.checkedPartsByDate === 'object') {
                            // No special conversion needed as keys are date strings and values are arrays of numbers
                        } else {
                            dataToSave.checkedPartsByDate = {}; // Ensure it's an object if missing
                        }
                        // Handle new recuperatedDays and advancedDays during import
                        if (!dataToSave.recuperatedDays) {
                            dataToSave.recuperatedDays = [];
                        } else if (Array.isArray(dataToSave.recuperatedDays)) {
                            dataToSave.recuperatedDays = dataToSave.recuperatedDays.map(ts => {
                                if (typeof ts === 'string') return new Date(ts);
                                if (ts && ts.seconds && ts.nanoseconds) return new Timestamp(ts.seconds, ts.nanoseconds);
                                return ts;
                            });
                        }
                        if (!dataToSave.advancedDays) {
                            dataToSave.advancedDays = [];
                        } else if (Array.isArray(dataToSave.advancedDays)) {
                            dataToSave.advancedDays = dataToSave.advancedDays.map(ts => {
                                if (typeof ts === 'string') return new Date(ts);
                                if (ts && ts.seconds && ts.nanoseconds) return new Timestamp(ts.seconds, ts.nanoseconds);
                                return ts;
                            });
                        }
                        // Handle new results field during import
                        if (!dataToSave.results) {
                            dataToSave.results = null;
                        }
                        // Handle new goals field during import
                        if (!dataToSave.goals) {
                            dataToSave.goals = [];
                        } else if (Array.isArray(dataToSave.goals)) {
                            // No conversion needed, already array of strings
                        } else if (typeof dataToSave.goals === 'string') {
                            dataToSave.goals = dataToSave.goals.split('\n').filter(g => g.trim() !== '');
                        } else {
                            dataToSave.goals = [];
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
                const startDate = tapasData.startDate.toDate();
                startDate.setHours(0, 0, 0, 0); // Normalize

                const endDate = new Date(startDate);
                endDate.setDate(startDate.getDate() + tapasData.duration - 1); // Calculate end date
                endDate.setHours(0, 0, 0, 0);

                if (!cutoffDate || endDate < cutoffDate) {
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


    const activeTapas = tapas.filter(tapas => tapas.status === 'active');

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
                <div className="bg-white p-8 rounded-lg shadow-2xl text-center max-w-sm w-full mx-auto">
                    <h2 className="text-3xl font-bold text-gray-800 mb-6">{t('welcomeTapasTracker')}</h2>
                    <p className="text-gray-600 mb-6">{t('trackPersonalGoals')}</p>

                    {/* Email/Password Login/Signup Form */}
                    {showEmailLoginForm ? (
                        <>
                            <input
                                type="email"
                                placeholder={t('email')}
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                className="w-full px-4 py-3 mb-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                            />
                            <input
                                type="password"
                                placeholder={t('password')}
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                className="w-full px-4 py-3 mb-4 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                            />
                            <button
                                onClick={handleEmailSignIn}
                                className="w-full bg-indigo-600 text-white px-6 py-3 rounded-lg shadow-lg hover:bg-indigo-700 transition-colors duration-200 text-lg font-medium mb-3"
                            >
                                {t('signInWithEmail')}
                            </button>
                            <button
                                onClick={handleEmailSignUp}
                                className="w-full bg-purple-600 text-white px-6 py-3 rounded-lg shadow-lg hover:bg-purple-700 transition-colors duration-200 text-lg font-medium mb-4"
                            >
                                {t('signUpWithEmail')}
                            </button>
                            <p className="text-gray-500 text-sm mb-4">
                                <button
                                    onClick={() => setShowEmailLoginForm(false)}
                                    className="text-indigo-600 hover:underline"
                                >
                                    {t('or')} {t('signInWithGoogle')}
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
                                {t('signInWithGoogle')}
                            </button>
                            <p className="text-gray-500 text-sm mb-4">
                                <button
                                    onClick={() => setShowEmailLoginForm(true)}
                                    className="text-indigo-600 hover:underline"
                                >
                                    {t('or')} {t('signInWithEmail')}
                                </button>
                            </p>
                        </>
                    )}

                    <button
                        onClick={handleGuestSignIn} // Call new guest sign-in function
                        className="w-full bg-gray-300 text-gray-800 px-6 py-3 rounded-lg shadow-lg hover:bg-gray-400 transition-colors duration-200 text-lg font-medium"
                    >
                        {t('continueAsGuest')}
                    </button>
                    {firebaseError && <p className="text-red-600 mt-4">{firebaseError}</p>}
                </div>
            </div>
        );
    }

    return (
        <AppContext.Provider value={{ db, auth, userId, userDisplayName, t, locale, setLocale }}>
            <div className="min-h-screen bg-gray-100 opacity-97 font-sans antialiased flex flex-col">
                {/* Global Styles for body, etc. - in a real Next.js app, these would be in styles/globals.css or _app.js */}
                <style>{`
                    body {
                        font-family: 'Inter', sans-serif;
                    }
                    /* Custom scrollbar for better aesthetics */
                    ::-webkit-scrollbar {
                        width: 8px;
                    }
                    ::-webkit-scrollbar-track {
                        background: #f1f1f1;
                        border-radius: 10px;
                    }
                    ::-webkit-scrollbar-thumb {
                        background: #888;
                        border-radius: 10px;
                    }
                    ::-webkit-scrollbar-thumb:hover {
                        background: #555;
                    }
                `}</style>

                {/* Header */}
                <header className="bg-gradient-to-r from-indigo-600 to-purple-700 text-white p-4 shadow-md">
                    <div className="container mx-auto flex justify-between items-center relative">
                        <h1 className="text-3xl font-bold">{t('appName')}</h1>
                        <div className="flex items-center space-x-4">
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

                            {userDisplayName && (
                                <span className="text-sm bg-indigo-700 px-3 py-1 rounded-full opacity-80 hidden md:inline-block">
                                    {t('hello')}, {userDisplayName.split(' ')[0]}!
                                </span>
                            )}
                            
                            <div className="relative">
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
                                    <div className="absolute right-0 mt-2 w-48 bg-white rounded-md shadow-lg py-1 z-20">
                                        {auth && auth.currentUser && !auth.currentUser.isAnonymous ? (
                                            <button
                                                onClick={handleLogout}
                                                className="block w-full text-left px-4 py-2 text-gray-800 hover:bg-gray-100"
                                            >
                                                {t('logout')}
                                            </button>
                                        ) : (
                                            <button
                                                onClick={() => { setShowLoginPrompt(true); setShowMenu(false); }}
                                                className="block w-full text-left px-4 py-2 text-gray-800 hover:bg-gray-100"
                                            >
                                                {t('signIn')}
                                            </button>
                                        )}
                                        <div className="border-t border-gray-200 my-1"></div> {/* Separator */}
                                        <button
                                            onClick={() => setShowDataMenu(!showDataMenu)}
                                            className="block w-full text-left px-4 py-2 text-gray-800 hover:bg-gray-100 flex justify-between items-center"
                                        >
                                            {t('data')}
                                            <svg className={`w-4 h-4 transform transition-transform ${showDataMenu ? 'rotate-180' : 'rotate-0'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path></svg>
                                        </button>
                                        {showDataMenu && (
                                            <div className="pl-4"> {/* Indent submenu items */}
                                                <button
                                                    onClick={handleImportDataClick}
                                                    className="block w-full text-left px-4 py-2 text-gray-800 hover:bg-gray-100"
                                                >
                                                    {t('importData')}
                                                </button>
                                                <button
                                                    onClick={handleExportData}
                                                    className="block w-full text-left px-4 py-2 text-gray-800 hover:bg-gray-100"
                                                >
                                                    {t('exportData')}
                                                </button>
                                                <button
                                                    onClick={handleCleanData}
                                                    className="block w-full text-left px-4 py-2 text-gray-800 hover:bg-gray-100"
                                                >
                                                    {t('cleanData')}
                                                </button>
                                            </div>
                                        )}
                                        <div className="border-t border-gray-200 my-1"></div> {/* Separator */}
                                        <button
                                            onClick={() => { setShowAboutModal(true); setShowMenu(false); }}
                                            className="block w-full text-left px-4 py-2 text-gray-800 hover:bg-gray-100"
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
                <nav className="bg-white shadow-sm p-3 sticky top-0 z-10">
                    <div className="container mx-auto flex justify-around">
                        <button
                            onClick={() => { setCurrentPage('active'); setSelectedTapas(null); setEditingTapas(null); }}
                            className={`px-4 py-2 rounded-md text-lg font-medium transition-colors duration-200 ${
                                currentPage === 'active' ? 'bg-blue-600 text-white shadow-lg border-2 border-blue-800' : 'text-gray-700 hover:bg-gray-100'
                            }`}
                        >
                            {t('active')}
                        </button>
                        <button
                            onClick={() => { setCurrentPage('history'); setSelectedTapas(null); setEditingTapas(null); }}
                            className={`px-4 py-2 rounded-md text-lg font-medium transition-colors duration-200 ${
                                currentPage === 'history' ? 'bg-blue-600 text-white shadow-lg border-2 border-blue-800' : 'text-gray-700 hover:bg-gray-100'
                            }`}
                        >
                            {t('history')}
                        </button>
                        <button
                            onClick={() => { setCurrentPage('statistics'); setSelectedTapas(null); setEditingTapas(null); }}
                            className={`px-4 py-2 rounded-md text-lg font-medium transition-colors duration-200 ${
                                currentPage === 'statistics' ? 'bg-blue-600 text-white shadow-lg border-2 border-blue-800' : 'text-gray-700 hover:bg-gray-100'
                            }`}
                        >
                            {t('statistics')}
                        </button>
                        <button
                            onClick={() => { setCurrentPage('add'); setSelectedTapas(null); }}
                            className={`px-4 py-2 rounded-md text-lg font-medium transition-colors duration-200 ${
                                currentPage === 'add' ? 'bg-blue-600 text-white shadow-lg border-2 border-blue-800' : 'text-gray-700 hover:bg-gray-100'
                            }`}
                        >
                            {t('addNew')}
                        </button>
                    </div>
                </nav>

                {/* Main Content Area */}
                <main className="container mx-auto p-4 flex-grow">
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
                </main>

                {/* Footer */}
                <footer className="bg-gray-800 text-white text-center p-4 mt-8 text-sm">
                    <p>&copy; {new Date().getFullYear()} {t('appName')}</p>
                    <p>Created by Reimund Renner</p>
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
                {showCleanDataModal && <CleanDataModal onClose={() => setShowCleanDataModal(false)} onCleanConfirmed={handleCleanDataConfirmed} />}
                {/* Login Prompt Overlay (conditionally rendered on top) */}
            </div>
        </AppContext.Provider>
    );
};

// Wrap HomePage with LocaleProvider
const WrappedHomePage = () => (
    <LocaleProvider>
        <HomePage />
    </LocaleProvider>
);

// Default export for the Next.js page
export default WrappedHomePage;
