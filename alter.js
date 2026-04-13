import pg from 'pg';
const { Client } = pg;

const client = new Client({
    host: 'localhost',
    port: 5432,
    user: 'postgres',
    password: 'Brebet@123',
    database: 'esdm_kasir_db'
});

async function main() {
    try {
        await client.connect();
        // 1. Tambah kolom dengan default member
        await client.query("ALTER TABLE user_account ADD COLUMN IF NOT EXISTS type_user VARCHAR(50) DEFAULT 'member'");
        console.log("✅ Kolom type_user berhasil ditambahkan.");

        // 2. Set admin
        await client.query("UPDATE user_account SET type_user = 'admin' WHERE username = 'admin'");
        console.log("✅ Akun admin di-set type_user = 'admin'.");
    } catch (e) {
        console.error(e);
    } finally {
        await client.end();
    }
}
main();
