export const dynamic = 'force-dynamic'; // Force Next.js, not to check this page on build

import NextAuth from "next-auth";
import GoogleProvider from "next-auth/providers/google";
import CredentialsProvider from "next-auth/providers/credentials";
import PouchDB from 'pouchdb';

const handler = NextAuth({
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    }),
    CredentialsProvider({
      name: "Email",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" }
      },
      async authorize(credentials) {
        // 1. Verbindung zur CouchDB _users (Server-intern)
        const usersDB = new PouchDB(process.env.COUCHDB_USERS_ADMIN_URL);
        try {
          // 2. User einloggen (CouchDB prüft das Passwort)
          const user = await usersDB.logIn(credentials.email, credentials.password);
          return { id: user.name, email: user.name, name: user.name };
        } catch (err) {
          throw new Error("Invalid email or password");
        }
      }
    })
  ],
  session: {
    strategy: "jwt",
    maxAge: 30 * 24 * 60 * 60, // 30 Tage (in Sekunden)
    updateAge: 24 * 60 * 60,   // Session-Ablauf bei jeder Aktivität um 24h verschieben
  },
  cookies: {
    sessionToken: {
      name: `next-auth.session-token`,
      options: {
        httpOnly: true,
        sameSite: 'lax',
        path: '/',
        secure: true // WICHTIG: Da du SSL (Certbot) nutzt
      }
    }
  },
  callbacks: {
    async signIn({ user, account }) {
      if (account.provider === "google") {
        const usersDB = new PouchDB(process.env.COUCHDB_USERS_ADMIN_URL);
        const couchUserId = `org.couchdb.user:${user.email}`;
        try {
          await usersDB.get(couchUserId);
        } catch (err) {
          if (err.status === 404) {
            // Google User in CouchDB anlegen (Shadow User)
            await usersDB.put({
              _id: couchUserId,
              name: user.email,
              password: Math.random().toString(36), // Random PW for Google users
              roles: ['user'],
              type: 'user'
            });
          }
        }
      }
      return true;
    }
  },
  secret: process.env.NEXTAUTH_SECRET,
  pages: { signIn: '/auth/signin' } // Optionale eigene Login-Seite
});

export { handler as GET, handler as POST };
