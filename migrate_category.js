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
        console.log('🔗 Connected to esdm_kasir_db');

        // 1. Buat tabel category
        await client.query(`
            CREATE TABLE IF NOT EXISTS category (
                id   UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
                name VARCHAR(100) UNIQUE NOT NULL,
                created_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `);
        console.log('✅ Tabel category dibuat.');

        // 2. Seed default categories
        const defaults = ['Makanan', 'Minuman', 'Snack', 'Rokok', 'Lain-lain'];
        for (const name of defaults) {
            await client.query(
                `INSERT INTO category (name) VALUES ($1) ON CONFLICT (name) DO NOTHING`,
                [name]
            );
        }
        console.log('✅ Default kategori di-seed.');

        // 3. Migrate kategori yang ada di produk ke tabel category (sebelum FK dibuat)
        const existingCategories = await client.query(
            `SELECT DISTINCT category FROM product WHERE category IS NOT NULL AND category != ''`
        );
        for (const row of existingCategories.rows) {
            await client.query(
                `INSERT INTO category (name) VALUES ($1) ON CONFLICT (name) DO NOTHING`,
                [row.category]
            );
        }
        console.log(`✅ Migrasi ${existingCategories.rows.length} kategori produk existing selesai.`);

        // 4. Tambah kolom category_id ke product (jika belum ada)
        await client.query(`
            ALTER TABLE product
            ADD COLUMN IF NOT EXISTS category_id UUID REFERENCES category(id) ON DELETE SET NULL
        `);
        console.log('✅ Kolom category_id ditambahkan ke tabel product.');

        // 5. Isi category_id berdasarkan kolom category teks lama
        await client.query(`
            UPDATE product p
            SET category_id = c.id
            FROM category c
            WHERE p.category = c.name
              AND p.category_id IS NULL
        `);
        console.log('✅ category_id diisi berdasarkan nama kategori lama.');

        // 6. Drop kolom category teks lama (opsional — hanya jika semua produk sudah terhubung)
        const unlinked = await client.query(
            `SELECT COUNT(*) FROM product WHERE category_id IS NULL AND category IS NOT NULL AND category != ''`
        );
        if (Number(unlinked.rows[0].count) === 0) {
            await client.query(`ALTER TABLE product DROP COLUMN IF EXISTS category`);
            console.log('✅ Kolom category teks lama dihapus.');
        } else {
            console.warn(`⚠️  ${unlinked.rows[0].count} produk tidak terhubung ke category. Kolom lama tidak dihapus.`);
        }

        console.log('\n🎉 Migrasi master kategori selesai!');
    } catch (e) {
        console.error('❌ Error:', e.message);
    } finally {
        await client.end();
    }
}

main();
