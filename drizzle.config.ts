import { config } from 'dotenv';
import { defineConfig } from 'drizzle-kit';

config({ path: '.env.local' });

const databaseUrl = process.env.DATABASE_URL;

if (!databaseUrl) {
    throw new Error('DATABASE_URL is not set');
}

const parsedUrl = new URL(databaseUrl);

export default defineConfig({
    schema: './lib/db/schema.ts',
    out: './drizzle',
    dialect: 'mysql',
    dbCredentials: {
        host: parsedUrl.hostname,
        port: Number(parsedUrl.port || 3306),
        user: decodeURIComponent(parsedUrl.username),
        password: decodeURIComponent(parsedUrl.password),
        database: parsedUrl.pathname.replace(/^\//, ''),
        ssl: {
            rejectUnauthorized: true,
        },
    },
});
