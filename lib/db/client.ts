import 'server-only';

import { connect } from '@tidbcloud/serverless';
import { drizzle } from 'drizzle-orm/tidb-serverless';
import * as schema from './schema';

export function getDb() {
    const url = process.env.DATABASE_URL;

    if (!url) {
        throw new Error('DATABASE_URL is not set');
    }

    const client = connect({ url });
    return drizzle(client, { schema });
}
