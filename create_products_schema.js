import pg from 'pg';
const { Client } = pg;

const client = new Client({
    host: 'localhost',
    port: 5432,
    user: 'postgres',
    password: 'Brebet@123',
    database: 'esdm_kasir_db'
});

async function createProducts() {
    try {
        await client.connect();
        
        // Buat tabelnya (Ensure it has category_id)
        await client.query(`
            CREATE TABLE IF NOT EXISTS product (
                id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
                sku VARCHAR(100) UNIQUE NOT NULL,
                name VARCHAR(255) NOT NULL,
                category_id UUID REFERENCES category(id) ON DELETE SET NULL,
                price NUMERIC(15,2) DEFAULT 0,
                stock INTEGER DEFAULT 0,
                image_url VARCHAR(1000),
                created_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                created_by VARCHAR(50),
                updated_by VARCHAR(50)
            );
        `);
        console.log("✅ Tabel 'product' berhasil dibuat/dicek.");
        
        // Ambil kategori default
        const catRes = await client.query("SELECT name, id FROM category");
        const categoryMap = {};
        catRes.rows.forEach(row => {
            categoryMap[row.name] = row.id;
        });

        const lainLainId = categoryMap['Lain-lain'];

        // Insert beberapa data awal untuk testing
        const items = [
            {
                sku: '74829381029',
                name: 'Kinetic Elite Headphones',
                category: 'Elektronik', // Will map to Lain-lain if not found
                price: 4500000,
                stock: 142,
                image_url: 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?q=80&w=200&auto=format&fit=crop'
            },
            {
                sku: '99210475822',
                name: 'Lunar Quartz Watch',
                category: 'Aksesoris',
                price: 2850000,
                stock: 12,
                image_url: 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?q=80&w=200&auto=format&fit=crop'
            },
            {
                sku: '88102374655',
                name: 'Velocity Run X2',
                category: 'Sepatu',
                price: 1400000,
                stock: 48,
                image_url: 'https://images.unsplash.com/photo-1542291026-7eec264c27ff?q=80&w=200&auto=format&fit=crop'
            }
        ];

        for (const item of items) {
             const categoryId = categoryMap[item.category] || lainLainId;
             await client.query(
                `INSERT INTO product (sku, name, category_id, price, stock, image_url) 
                 VALUES ($1, $2, $3, $4, $5, $6)
                 ON CONFLICT (sku) DO NOTHING`,
                [item.sku, item.name, categoryId, item.price, item.stock, item.image_url]
             );
        }
        console.log("✅ Data sampel dimasukkan.");

    } catch (e) {
        console.error("❌ " + e.message);
    } finally {
        await client.end();
    }
}

createProducts();
