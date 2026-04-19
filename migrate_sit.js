/**
 * SIT Post-Testing Migration Script
 * Run: node migrate_sit.js
 * 
 * Perubahan:
 * - Poin 5: Tambah buy_price, is_consignment, consignment_percentage ke product
 * - Poin 6: Tambah buy_price, is_consignment, consignment_percentage ke transaction_item
 * - Poin 12: Tambah no_telpon, email ke user_profile
 * - Poin 4: Tambah type_user values baru (kasir, super_admin) — sudah varchar, tidak perlu alter
 */
import { pool } from './src/config/db.config.js';

async function migrate() {
    const client = await pool.connect();
    try {
        await client.query('BEGIN');
        console.log('🚀 Mulai migrasi SIT...');

        // === POIN 5: Kolom baru untuk produk ===
        console.log('📦 Menambahkan kolom harga beli & titipan ke tabel product...');
        await client.query(`
            ALTER TABLE product 
            ADD COLUMN IF NOT EXISTS buy_price NUMERIC(15,2) DEFAULT 0,
            ADD COLUMN IF NOT EXISTS is_consignment BOOLEAN DEFAULT FALSE,
            ADD COLUMN IF NOT EXISTS consignment_percentage NUMERIC(5,2) DEFAULT 0
        `);
        console.log('   ✅ product: buy_price, is_consignment, consignment_percentage ditambahkan');

        // === POIN 6: Kolom baru untuk detail transaksi ===
        console.log('🧾 Menambahkan kolom buy_price & titipan ke tabel transaction_item...');
        await client.query(`
            ALTER TABLE transaction_item 
            ADD COLUMN IF NOT EXISTS buy_price NUMERIC(15,2) DEFAULT 0,
            ADD COLUMN IF NOT EXISTS is_consignment BOOLEAN DEFAULT FALSE,
            ADD COLUMN IF NOT EXISTS consignment_percentage NUMERIC(5,2) DEFAULT 0
        `);
        console.log('   ✅ transaction_item: buy_price, is_consignment, consignment_percentage ditambahkan');

        // === POIN 12: Kolom baru untuk profil anggota ===
        console.log('👤 Menambahkan kolom no_telpon & email ke tabel user_profile...');
        await client.query(`
            ALTER TABLE user_profile 
            ADD COLUMN IF NOT EXISTS no_telpon VARCHAR(20),
            ADD COLUMN IF NOT EXISTS email VARCHAR(150)
        `);
        console.log('   ✅ user_profile: no_telpon, email ditambahkan');

        // === Pastikan no_handphone ada (mungkin sudah ada dari migrasi sebelumnya) ===
        await client.query(`
            ALTER TABLE user_profile 
            ADD COLUMN IF NOT EXISTS no_handphone VARCHAR(20),
            ADD COLUMN IF NOT EXISTS photo_base64 TEXT
        `);
        console.log('   ✅ user_profile: no_handphone & photo_base64 (pastikan ada)');

        await client.query('COMMIT');
        console.log('\n✅ Migrasi SIT berhasil!');
    } catch (err) {
        await client.query('ROLLBACK');
        console.error('❌ Migrasi gagal:', err.message);
        throw err;
    } finally {
        client.release();
        await pool.end();
    }
}

migrate().catch(() => process.exit(1));
