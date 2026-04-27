import xlsx from 'xlsx';
import pg from 'pg';
import bcrypt from 'bcryptjs';
import path from 'path';

const { Client } = pg;

const importData = async () => {
    console.log("🚀 Memulai proses cleansing & re-import data anggota...");

    // 1. Baca Excel (file .xlsx baru)
    // Format kolom baru: [No.Urut, UNIT, No.Anggota, Rekening, No Telpon, Email, Nama]
    const filePath = path.resolve('..', 'Data MDB BRI KDP APRIL 2026.xlsx');
    let data;
    try {
        const workbook = xlsx.readFile(filePath);
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        data = xlsx.utils.sheet_to_json(worksheet, { header: 1, defval: "" });
        console.log(`📂 File Excel dibaca: "${sheetName}" — ${data.length} total baris`);
    } catch (err) {
        console.error("❌ Gagal membaca file Excel:", err.message);
        process.exit(1);
    }

    const DEFAULT_PASSWORD = 'admin123';
    console.log(`🔑 Hashing password default: '${DEFAULT_PASSWORD}'`);
    const hashedPassword = await bcrypt.hash(DEFAULT_PASSWORD, 10);

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

        // 3. Hapus semua user anggota (type_user = 'member')
        //    user_profile akan ikut terhapus karena ON DELETE CASCADE
        const deleteRes = await client.query(
            `DELETE FROM user_account WHERE type_user = 'member'`
        );
        console.log(`🗑️  ${deleteRes.rowCount} user anggota lama berhasil dihapus.`);

        // 4. Import dari Excel
        // Header di baris index 8, data mulai index 12
        // Kolom: [0]=No.Urut [1]=UNIT [2]=No.Anggota [3]=Rekening [4]=No.Telpon [5]=Email [6]=Nama
        let insertedCount = 0;
        let skippedCount = 0;

        for (let i = 12; i < data.length; i++) {
            const row = data[i];

            const noAnggota = row[2];
            const nama      = row[6];

            // Skip baris kosong / tidak valid
            if (!noAnggota || !nama || isNaN(parseInt(noAnggota, 10))) {
                skippedCount++;
                continue;
            }

            const unit      = String(row[1] || '').trim();
            const rekening  = row[3] ? String(row[3]).replace(/'/g, '').trim() : '';
            const namaTrim  = String(nama).trim();
            const username  = String(noAnggota).trim();
            const anggotaInt = parseInt(noAnggota, 10);

            // Insert user_account
            const accRes = await client.query(
                `INSERT INTO user_account (username, password, type_user, is_active, created_by)
                 VALUES ($1, $2, 'member', TRUE, 'system-import')
                 ON CONFLICT (username) DO NOTHING
                 RETURNING id`,
                [username, hashedPassword]
            );

            if (accRes.rows.length > 0) {
                const accountId = accRes.rows[0].id;

                // Insert user_profile
                await client.query(
                    `INSERT INTO user_profile (id_user_account, unit, no_anggota, no_rekening, nama)
                     VALUES ($1, $2, $3, $4, $5)`,
                    [accountId, unit, anggotaInt, rekening, namaTrim]
                );
                insertedCount++;
            }
        }

        await client.query('COMMIT');
        console.log(`\n✅ SELESAI!`);
        console.log(`   ✔ Berhasil diimpor : ${insertedCount} user anggota`);
        console.log(`   ⏭ Dilewati (kosong): ${skippedCount} baris`);

    } catch (err) {
        await client.query('ROLLBACK');
        console.error('❌ Error — transaksi di-rollback:', err.message);
        console.error(err.stack);
    } finally {
        await client.end();
        console.log("🔌 Koneksi database ditutup.");
    }
};

importData();
