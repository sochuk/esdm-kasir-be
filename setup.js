import pg from 'pg';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const { Client } = pg;

// Required for ES modules __dirname
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const setupDatabase = async () => {
    console.log('⏳ Memulai setup database otomatis...');
    
    // 1. Connect to default 'postgres' database to create the new DB
    const client = new Client({
        host: 'localhost',
        port: 5432,
        user: 'postgres',
        password: 'Brebet@123',
        database: 'postgres' // Default fallback DB found in every Postgres install
    });

    try {
        await client.connect();
        
        // Check if database exists
        const res = await client.query(`SELECT datname FROM pg_catalog.pg_database WHERE datname = 'esdm_kasir_db'`);
        if (res.rowCount === 0) {
            console.log('🛠️ Database esdm_kasir_db belum ada. Membuatnya sekarang...');
            await client.query('CREATE DATABASE esdm_kasir_db');
            console.log('✅ Database esdm_kasir_db berhasil dibuat!');
        } else {
            console.log('✔️ Database esdm_kasir_db sudah tersedia.');
        }
    } catch (err) {
        console.error('❌ Gagal memeriksa atau membuat database:', err.message);
        process.exit(1);
    } finally {
        await client.end();
    }

    // 2. Connect to the newly created 'esdm_kasir_db' to run init migrations
    const appClient = new Client({
        host: 'localhost',
        port: 5432,
        user: 'postgres',
        password: 'Brebet@123',
        database: 'esdm_kasir_db'
    });

    try {
        await appClient.connect();
        const initSqlPath = path.join(__dirname, 'init.sql');
        const sql = fs.readFileSync(initSqlPath).toString();
        
        console.log('🔄 Menjalankan skrip inisialisasi tabel (init.sql)...');
        await appClient.query(sql);
        console.log('✅ Skema tabel dan akun Admin dummy berhasil ditanam!');
    } catch (err) {
        console.error('❌ Gagal menjalankan inisialisasi SQL:', err.message);
    } finally {
        await appClient.end();
    }
};

setupDatabase();
