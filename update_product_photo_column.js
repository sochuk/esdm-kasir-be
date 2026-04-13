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
        // Change image_url column type to TEXT to support Base64 strings
        await client.query("ALTER TABLE product ALTER COLUMN image_url TYPE TEXT");
        console.log("✅ Column product.image_url successfully changed to TEXT.");
    } catch (e) {
        console.error("❌ Error altering table:", e);
    } finally {
        await client.end();
    }
}
main();
