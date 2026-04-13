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
        console.log('🔗 Connected to esdm_kasir_db for POS Migration');

        // 1. Add points to user_profile
        await client.query(`
            ALTER TABLE user_profile 
            ADD COLUMN IF NOT EXISTS points INTEGER DEFAULT 0
        `);
        console.log('✅ Kolom points ditambahkan ke user_profile.');

        // 2. Create transaction table
        await client.query(`
            CREATE TABLE IF NOT EXISTS transaction (
                id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
                invoice_number VARCHAR(50) UNIQUE NOT NULL,
                id_user_account UUID REFERENCES user_account(id) ON DELETE SET NULL,
                subtotal NUMERIC(15,2) DEFAULT 0,
                discount NUMERIC(15,2) DEFAULT 0,
                tax NUMERIC(15,2) DEFAULT 0,
                total NUMERIC(15,2) DEFAULT 0,
                points_earned INTEGER DEFAULT 0,
                points_used INTEGER DEFAULT 0,
                payment_method VARCHAR(50) DEFAULT 'cash',
                created_by VARCHAR(50),
                created_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `);
        console.log('✅ Tabel transaction dibuat.');

        // 3. Create transaction_item table
        await client.query(`
            CREATE TABLE IF NOT EXISTS transaction_item (
                id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
                transaction_id UUID NOT NULL REFERENCES transaction(id) ON DELETE CASCADE,
                product_id UUID REFERENCES product(id) ON DELETE SET NULL,
                product_sku VARCHAR(100),
                product_name VARCHAR(255),
                quantity INTEGER NOT NULL,
                price NUMERIC(15,2) NOT NULL,
                subtotal NUMERIC(15,2) NOT NULL
            )
        `);
        console.log('✅ Tabel transaction_item dibuat.');

        console.log('\n🎉 Migrasi Modul POS selesai!');
    } catch (e) {
        console.error('❌ Error:', e.message);
    } finally {
        await client.end();
    }
}

main();
