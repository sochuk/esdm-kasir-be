import { pool } from '../config/db.config.js';

export const lookupMember = async (req, res) => {
    let { qr } = req.query; // we expect 'qr' to hold the no_anggota or username or JSON string
    if (!qr) return res.status(400).json({ message: 'QR Code atau ID Anggota diperlukan' });

    try {
        // Handle scenario where QR is a JSON string emitted by scanner
        try {
            const parsed = JSON.parse(qr);
            if (parsed.no_anggota) {
                qr = parsed.no_anggota.toString();
            }
        } catch(e) {
            // Not a JSON string, treat as raw ID
        }

        const result = await pool.query(
            `SELECT a.id, a.username, p.nama, p.no_anggota, p.unit, p.points, p.no_handphone 
             FROM user_account a
             JOIN user_profile p ON p.id_user_account = a.id
             WHERE a.username = $1 OR p.no_anggota::text = $1 OR p.no_handphone = $1`,
            [qr]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ message: 'Anggota tidak ditemukan' });
        }
        res.status(200).json(result.rows[0]);
    } catch (error) {
        console.error('Error lookup member:', error);
        res.status(500).json({ message: 'Gagal mencari anggota' });
    }
};

export const checkoutTransaction = async (req, res) => {
    const { items, member_id, payment_method, points_used, subtotal, discount, tax, total, points_earned } = req.body;
    
    if (!items || items.length === 0) {
        return res.status(400).json({ message: 'Keranjang kosong' });
    }

    const client = await pool.connect();
    
    try {
        await client.query('BEGIN'); // Start Transaction

        // Generate Invoice Number (e.g., INV-1712312312)
        const invoice_number = `INV-${Date.now()}`;

        // 1. Insert Transaction Header
        const txRes = await client.query(
            `INSERT INTO transaction (
                invoice_number, id_user_account, subtotal, discount, tax, total, 
                points_earned, points_used, payment_method, created_by
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10) RETURNING id`,
            [invoice_number, member_id || null, subtotal, discount, tax, total, points_earned, points_used, payment_method, 'kasir']
        );
        const transaction_id = txRes.rows[0].id;

        // 2. Insert Items & Decrement Stock
        for (const item of items) {
            // Check stock first
            const stockCheck = await client.query('SELECT stock FROM product WHERE id = $1', [item.id]);
            if (stockCheck.rows.length === 0) {
                throw new Error(`Produk dengan ID ${item.id} tidak ditemukan`);
            }
            if (stockCheck.rows[0].stock < item.qty) {
                throw new Error(`Stok produk ${item.name} tidak mencukupi (Sisa: ${stockCheck.rows[0].stock})`);
            }

            // Insert details
            await client.query(
                `INSERT INTO transaction_item (
                    transaction_id, product_id, product_sku, product_name, quantity, price, subtotal
                ) VALUES ($1, $2, $3, $4, $5, $6, $7)`,
                [transaction_id, item.id, item.sku, item.name, item.qty, item.price, item.qty * item.price]
            );

            // Decrement Stock
            await client.query('UPDATE product SET stock = stock - $1 WHERE id = $2', [item.qty, item.id]);
        }

        // 3. Update Member Points
        if (member_id) {
            // decrease used points, increase earned points
            await client.query(
                `UPDATE user_profile 
                 SET points = points - $1 + $2 
                 WHERE id_user_account = $3`,
                [points_used || 0, points_earned || 0, member_id]
            );
        }

        await client.query('COMMIT'); // Commit Transaction
        res.status(201).json({ message: 'Transaksi berhasil', invoice_number, transaction_id });

    } catch (error) {
        await client.query('ROLLBACK'); // Rollback on error
        console.error('Error during checkout transaction:', error);
        res.status(500).json({ message: error.message || 'Gagal memproses transaksi' });
    } finally {
        client.release();
    }
};

// =====================================
// NEW: TRANSACTION HISTORY & RECEIPT
// =====================================

export const getTransactions = async (req, res) => {
    try {
        const query = `
            SELECT t.id, t.invoice_number, t.created_date, t.total, t.payment_method, t.created_by,
                   u.nama as member_name
            FROM transaction t
            LEFT JOIN user_account ua ON t.id_user_account = ua.id
            LEFT JOIN user_profile u ON ua.id = u.id_user_account
            ORDER BY t.created_date DESC
            LIMIT 100
        `;
        const result = await pool.query(query);
        res.status(200).json(result.rows);
    } catch (error) {
        console.error('Error fetching transactions:', error);
        res.status(500).json({ message: 'Gagal mengambil riwayat transaksi' });
    }
};

export const getTransactionReceipt = async (req, res) => {
    const { id } = req.params;
    try {
        const headerQuery = `
            SELECT t.*, u.nama as member_name, u.no_anggota, u.unit
            FROM transaction t
            LEFT JOIN user_account ua ON t.id_user_account = ua.id
            LEFT JOIN user_profile u ON ua.id = u.id_user_account
            WHERE t.id = $1
        `;
        const headerRes = await pool.query(headerQuery, [id]);

        if (headerRes.rows.length === 0) {
            return res.status(404).json({ message: 'Transaksi tidak ditemukan' });
        }

        const itemsQuery = `
            SELECT product_name, quantity, price, subtotal
            FROM transaction_item
            WHERE transaction_id = $1
            ORDER BY id ASC
        `;
        const itemsRes = await pool.query(itemsQuery, [id]);

        res.status(200).json({
            header: headerRes.rows[0],
            items: itemsRes.rows
        });
    } catch (error) {
        console.error('Error fetching receipt:', error);
        res.status(500).json({ message: 'Gagal mengambil detail struk' });
    }
};
