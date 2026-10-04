import { CompiledQuery, PostgresAdapter, PostgresIntrospector, PostgresQueryCompiler, } from "kysely";
/** Factory used by `auth/server.ts`: `pgliteDialect(() => getPglite())`. */
export function pgliteDialect(getClient) {
    return {
        createAdapter: () => new PostgresAdapter(),
        createDriver: () => new LazyPGliteDriver(getClient),
        createQueryCompiler: () => new PostgresQueryCompiler(),
        createIntrospector: (db) => new PostgresIntrospector(db),
    };
}
class LazyPGliteDriver {
    getClient;
    client;
    connection;
    queue = [];
    constructor(getClient) {
        this.getClient = getClient;
    }
    async init() {
        this.client = await this.getClient();
    }
    async acquireConnection() {
        if (this.client === undefined) {
            this.client = await this.getClient();
        }
        if (this.connection !== undefined) {
            return new Promise((resolve) => {
                this.queue.push(resolve);
            });
        }
        this.connection = new PGliteConnection(this.client);
        return this.connection;
    }
    async releaseConnection(connection) {
        if (connection !== this.connection) {
            throw new Error("Invalid connection");
        }
        const next = this.queue.shift();
        if (next === undefined) {
            this.connection = undefined;
            return;
        }
        next(this.connection);
    }
    async beginTransaction(conn, settings) {
        const c = conn;
        if (settings.isolationLevel) {
            await c.executeQuery(CompiledQuery.raw(`start transaction isolation level ${settings.isolationLevel}`));
        }
        else {
            await c.executeQuery(CompiledQuery.raw("begin"));
        }
    }
    async commitTransaction(conn) {
        await conn.executeQuery(CompiledQuery.raw("commit"));
    }
    async rollbackTransaction(conn) {
        await conn.executeQuery(CompiledQuery.raw("rollback"));
    }
    async destroy() {
        // Do not close the client: it is the shared getPglite() singleton used by
        // app SQL (getSql). Only drop our local handle so auth teardown cannot
        // poison the rest of the process.
        this.client = undefined;
        this.connection = undefined;
        this.queue = [];
    }
}
class PGliteConnection {
    client;
    constructor(client) {
        this.client = client;
    }
    async executeQuery(compiledQuery) {
        const result = await this.client.query(compiledQuery.sql, [
            ...compiledQuery.parameters,
        ]);
        if (result.affectedRows) {
            return {
                numAffectedRows: BigInt(result.affectedRows),
                rows: result.rows,
            };
        }
        return { rows: result.rows };
    }
    async *streamQuery(compiledQuery, chunkSize) {
        if (!Number.isInteger(chunkSize) || chunkSize <= 0) {
            throw new Error("chunkSize must be a positive integer");
        }
        const result = await this.client.query(compiledQuery.sql, [
            ...compiledQuery.parameters,
        ]);
        for (let i = 0; i < result.rows.length; i += chunkSize) {
            yield { rows: result.rows.slice(i, i + chunkSize) };
        }
    }
}
