import pg from 'pg';
const { Client } = pg;
import dotenv from 'dotenv';
dotenv.config();

const client = new Client({
    host: process.env.DB_HOST || 'localhost',
    port: process.env.DB_PORT || 5432,
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || 'Brebet@123',
    database: process.env.DB_NAME || 'esdm_kasir_db'
});

async function main() {
    try {
        await client.connect();
        console.log('🔗 Connected to Database for Cleansing');

        console.log('🧹 Menghapus semua riwayat transaksi...');
        await client.query(`TRUNCATE TABLE transaction CASCADE;`);
        
        console.log('✅ Data transaksi berhasil dihapus.');
        console.log('✅ Data produk & anggota dipertahankan.');
        
        console.log('\n🎉 Cleansing selesai!');
    } catch (e) {
        console.error('❌ Error:', e.message);
    } finally {
        await client.end();
    }
}

main();
