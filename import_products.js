import xlsx from 'xlsx';
import pg from 'pg';
import path from 'path';

const { Client } = pg;

// Bulatkan harga ke ratusan terdekat
const roundPrice = (num) => Math.round(num / 100) * 100;

const importProducts = async () => {
    console.log("🚀 Memulai proses cleansing & re-import data produk...");

    // 1. Baca Excel — ambil semua sheet
    const filePath = path.resolve('..', 'Rincian Harga Beli Barang Bulan April 2026.xlsx');
    let workbook;
    try {
        workbook = xlsx.readFile(filePath);
        console.log(`📂 File Excel dibaca: ${workbook.SheetNames.length} sheet ditemukan → [${workbook.SheetNames.join(', ')}]`);
    } catch (err) {
        console.error("❌ Gagal membaca file Excel:", err.message);
        process.exit(1);
    }

    // Kolom Excel:
    // [0] No | [1] Nama Barang | [2] Jumlah | [3] Harga Satuan (beli) | [4] Harga Total | [5] Harga Jual +10%
    const allProducts = [];
    const namaSet = new Set();

    for (const sheetName of workbook.SheetNames) {
        const ws = workbook.Sheets[sheetName];
        const data = xlsx.utils.sheet_to_json(ws, { header: 1, defval: '' });

        let sheetCount = 0;
        for (let i = 6; i < data.length; i++) {
            const row = data[i];
            const nama      = String(row[1] || '').trim();
            const jumlah    = parseInt(row[2], 10);
            const hargaBeli = parseFloat(row[3]); // Harga Satuan → buy_price
            const hargaJual = parseFloat(row[5]); // Harga Jual +10% → price

            // Skip baris kosong / tidak valid
            if (!nama || isNaN(jumlah) || isNaN(hargaBeli) || hargaBeli <= 0) continue;
            // Skip baris "Total"
            if (String(row[2]).toLowerCase() === 'total') continue;
            // Skip duplikat nama
            const namaKey = nama.toLowerCase();
            if (namaSet.has(namaKey)) {
                console.log(`  ⚠️  Duplikat dilewati: "${nama}" (sudah ada dari sheet lain)`);
                continue;
            }
            namaSet.add(namaKey);

            allProducts.push({
                sku      : null,
                name     : nama,
                stock    : jumlah,
                buy_price: roundPrice(hargaBeli),
                price    : Math.round(hargaJual), // Harga Jual langsung dari Excel
            });
            sheetCount++;
        }
        console.log(`   📋 Sheet "${sheetName}": ${sheetCount} produk valid`);
    }

    console.log(`\n📦 Total produk akan diimpor: ${allProducts.length}`);

    // 2. Koneksi Database
    const client = new Client({
        host: '103.150.227.194',
        port: 5432,
        user: 'postgres',
        password: 'Brebet@123',
        database: 'esdm_kasir_db'
    });

    try {
        await client.connect();
        console.log("🔗 Terhubung ke database.");

        await client.query('BEGIN');

        // Pastikan kolom sku bisa NULL
        await client.query(`ALTER TABLE product ALTER COLUMN sku DROP NOT NULL`);
        console.log("🔧 Kolom 'sku' diubah menjadi nullable.");

        // Hapus semua produk lama (transaction_item.product_id → ON DELETE SET NULL, aman)
        const delRes = await client.query(`DELETE FROM product`);
        console.log(`🗑️  ${delRes.rowCount} produk lama berhasil dihapus.`);

        // Ambil category_id default "Lain-lain"
        const catRes = await client.query(
            `SELECT id FROM category WHERE name = 'Lain-lain' LIMIT 1`
        );
        const defaultCategoryId = catRes.rows.length > 0 ? catRes.rows[0].id : null;
        if (!defaultCategoryId) {
            console.warn("⚠️  Kategori 'Lain-lain' tidak ditemukan, category_id akan NULL.");
        }

        // Insert produk baru dengan buy_price & price
        let insertedCount = 0;
        for (const prod of allProducts) {
            await client.query(
                `INSERT INTO product (sku, name, category_id, price, buy_price, stock, created_by)
                 VALUES ($1, $2, $3, $4, $5, $6, $7)`,
                [prod.sku, prod.name, defaultCategoryId, prod.price, prod.buy_price, prod.stock, 'system-import']
            );
            insertedCount++;
        }

        await client.query('COMMIT');
        console.log(`\n✅ SELESAI!`);
        console.log(`   ✔ Berhasil diimpor : ${insertedCount} produk`);
        console.log(`   💡 Harga Beli  : Harga Satuan (dibulatkan ke ratusan)`);
        console.log(`   💡 Harga Jual  : Harga Jual +10% (dibulatkan ke ratusan)`);
        console.log(`   💡 Kategori    : Lain-lain (bisa diubah manual via UI)`);
        console.log(`   💡 SKU         : kosong/NULL (bisa diisi manual via UI)`);

    } catch (err) {
        await client.query('ROLLBACK');
        console.error('❌ Error — transaksi di-rollback:', err.message);
        console.error(err.stack);
    } finally {
        await client.end();
        console.log("🔌 Koneksi database ditutup.");
    }
};

importProducts();
