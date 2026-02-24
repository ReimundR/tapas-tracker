import { NextResponse } from 'next/server';
import PouchDB from 'pouchdb';

export async function POST(request) {
  try {
    const { email, password } = await request.json();

    // Nutze 127.0.0.1, damit das Admin-Passwort den VPS nie verlässt
    // Ersetze ADMIN:PW durch deine echten Daten (am besten via process.env)
    const usersDB = new PouchDB('http://127.0.0.1');

    const userId = `org.couchdb.user:${email}`;

    await usersDB.put({
      _id: userId,
      name: email,
      password: password, // CouchDB hasht das automatisch
      roles: ['user'],
      type: 'user'
    });

    return NextResponse.json({ message: 'User created' }, { status: 201 });
  } catch (err) {
    console.error('Signup Error:', err);
    return NextResponse.json(
      { error: err.message || 'Signup failed' },
      { status: err.status || 500 }
    );
  }
}
