import { openDatabase } from './db.mjs';
const db = await openDatabase();
await db.close();
console.log('E-VIVLIO database migrations applied.');
