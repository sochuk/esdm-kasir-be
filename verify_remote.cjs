const { Client } = require('pg');

const client = new Client({
    host: '103.150.227.194',
    user: 'postgres',
    password: 'Brebet@123',
    database: 'esdm_kasir_db',
    port: 5432
});

async function verify() {
    await client.connect();
    
    // List all tables
    const tables = await client.query("SELECT tablename FROM pg_tables WHERE schemaname='public' ORDER BY tablename");
    console.log('TABLES ON REMOTE:', tables.rows.map(r => r.tablename));
    
    // Count rows per table
    for (const row of tables.rows) {
        const count = await client.query(`SELECT COUNT(*) FROM "${row.tablename}"`);
        console.log(`  ${row.tablename}: ${count.rows[0].count} rows`);
    }
    
    await client.end();
}

verify().catch(err => {
    console.error('ERROR:', err.message);
    process.exit(1);
});
