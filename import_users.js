import xlsx from 'xlsx';
import pg from 'pg';
import bcrypt from 'bcryptjs';
import path from 'path';

const { Client } = pg;

const importData = async () => {
    console.log("🚀 Memulai proses migrasi data dari Excel ke PostgreSQL...");

    // 1. Baca Excel
    const filePath = path.resolve('Data MDB BRI KDP APRIL 2026.xls');
    let data;
    try {
        const workbook = xlsx.readFile(filePath);
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        
        // Membaca baris sebagai array agar kolom tidak menggunakan key berantakan (__EMPTY_x)
        data = xlsx.utils.sheet_to_json(worksheet, { header: 1, defval: "" });
    } catch (err) {
        console.error("❌ Gagal membaca file Excel:", err.message);
        process.exit(1);
    }

    // Identifikasi password default yang baru saja dikonfirmasi (admin123)
    const DEFAULT_PASSWORD = 'admin123';
    console.log(`🔑 Mengamankan data: melakukan hashing massal untuk password '${DEFAULT_PASSWORD}'`);
    const hashedPassword = await bcrypt.hash(DEFAULT_PASSWORD, 10);

    // 2. Transaksi Database
    const client = new Client({
        host: 'localhost',
        port: 5432,
        user: 'postgres',
        password: 'Brebet@123',
        database: 'esdm_kasir_db'
    });

    try {
        await client.connect();
        
        // Kita menggunakan TRANSACTION agar aman, jika salah satu insert gagal, semua akan di-rollback
        await client.query('BEGIN');

        console.log(`📝 Memproses baris Excel...`);
        let insertedCount = 0;

        // Data dimulai pada baris ke-8 (index 7)
        for (let i = 7; i < data.length; i++) {
            const row = data[i];
            
            // Format [Urut, Unit, No Anggota, Rekening, Nama, Barcode]
            if (row.length < 5 || !row[2] || !row[4]) continue;

            const unit = row[1];
            const noAnggota = row[2];
            const rekening = row[3] ? row[3].toString().replace(/'/g, '').trim() : ''; 
            const nama = row[4];

            // Setup username identitas unik (kita ambil nomor anggota saja untuk kemudahan)
            const username = String(noAnggota).trim();
            const anggotaInt = parseInt(noAnggota, 10);

            // Skip jika username kosong, nama kosong, atau no_anggota bukan angka
            if (!username || !nama || isNaN(anggotaInt)) continue;

            // Masukkan ke user_account
            const accRes = await client.query(
                `INSERT INTO user_account (username, password, created_by) 
                 VALUES ($1, $2, $3) 
                 ON CONFLICT (username) DO NOTHING 
                 RETURNING id`,
                [username, hashedPassword, 'system-import']
            );

            // Karena kita menggunakan ON CONFLICT DO NOTHING, jika akun sdh ada, accRes.rows kosong
            if (accRes.rows.length > 0) {
                const accountId = accRes.rows[0].id;
                
                // Masukkan Profilnya
                await client.query(
                    `INSERT INTO user_profile (id_user_account, unit, no_anggota, no_rekening, nama)
                     VALUES ($1, $2, $3, $4, $5)`,
                    [accountId, unit, anggotaInt, rekening, nama]
                );
                insertedCount++;
            }
        }

        await client.query('COMMIT');
        console.log(`✅ SUKSES! Berhasil mengimpor ${insertedCount} pengguna dari Excel ke Database.`);
    } catch (err) {
        await client.query('ROLLBACK');
        console.error('❌ Terjadi kesalahan saat migrasi DB (Operasi Di-Rolback):', err.message);
    } finally {
        await client.end();
    }
};

importData();
