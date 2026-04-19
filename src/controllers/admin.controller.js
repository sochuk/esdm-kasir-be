import bcrypt from 'bcryptjs';
import { pool } from '../config/db.config.js';

// GET semua admin/kasir/super_admin
export const getAllAdmins = async (req, res) => {
    try {
        const result = await pool.query(`
            SELECT ua.id, ua.username, ua.type_user, ua.is_active, ua.created_date,
                   up.nama, up.unit, up.no_anggota, up.email, up.no_telpon
            FROM user_account ua
            LEFT JOIN user_profile up ON ua.id = up.id_user_account
            WHERE ua.type_user IN ('admin', 'super_admin', 'kasir')
            ORDER BY ua.created_date DESC
        `);
        res.status(200).json(result.rows);
    } catch (err) {
        console.error('Get admins error:', err);
        res.status(500).json({ error: 'Gagal mengambil data admin' });
    }
};

// POST tambah admin baru
export const createAdmin = async (req, res) => {
    const { username, password, type_user, nama, unit, email, no_telpon } = req.body;
    if (!username || !password || !nama) {
        return res.status(400).json({ error: 'Username, password, dan nama wajib diisi' });
    }
    const allowedRoles = ['admin', 'super_admin', 'kasir'];
    if (!allowedRoles.includes(type_user)) {
        return res.status(400).json({ error: 'Role tidak valid' });
    }

    const client = await pool.connect();
    try {
        await client.query('BEGIN');
        const hash = await bcrypt.hash(password, 10);
        const userRes = await client.query(
            `INSERT INTO user_account (username, password, type_user, is_active, created_by)
             VALUES ($1, $2, $3, true, $4) RETURNING id`,
            [username, hash, type_user, req.user?.username || 'admin']
        );
        const newId = userRes.rows[0].id;
        await client.query(
            `INSERT INTO user_profile (id_user_account, nama, unit, email, no_telpon)
             VALUES ($1, $2, $3, $4, $5)`,
            [newId, nama, unit || '', email || '', no_telpon || '']
        );
        await client.query('COMMIT');
        res.status(201).json({ message: 'Admin berhasil ditambahkan', id: newId });
    } catch (err) {
        await client.query('ROLLBACK');
        console.error('Create admin error:', err);
        res.status(500).json({ error: err.code === '23505' ? 'Username sudah digunakan' : 'Gagal menambahkan admin' });
    } finally {
        client.release();
    }
};

// PUT update admin
export const updateAdmin = async (req, res) => {
    const { id } = req.params;
    const { type_user, is_active, nama, unit, email, no_telpon, password } = req.body;

    const client = await pool.connect();
    try {
        await client.query('BEGIN');
        
        const updates = [];
        const vals = [];
        let i = 1;
        if (type_user !== undefined) { updates.push(`type_user = $${i++}`); vals.push(type_user); }
        if (is_active !== undefined) { updates.push(`is_active = $${i++}`); vals.push(is_active); }
        if (password) {
            const hash = await bcrypt.hash(password, 10);
            updates.push(`password = $${i++}`); vals.push(hash);
        }
        if (updates.length > 0) {
            vals.push(id);
            await client.query(`UPDATE user_account SET ${updates.join(', ')} WHERE id = $${i}`, vals);
        }

        await client.query(
            `UPDATE user_profile SET nama = $1, unit = $2, email = $3, no_telpon = $4 WHERE id_user_account = $5`,
            [nama, unit || '', email || '', no_telpon || '', id]
        );

        await client.query('COMMIT');
        res.status(200).json({ message: 'Admin berhasil diupdate' });
    } catch (err) {
        await client.query('ROLLBACK');
        console.error('Update admin error:', err);
        res.status(500).json({ error: 'Gagal mengupdate admin' });
    } finally {
        client.release();
    }
};

// DELETE (deactivate) admin
export const deleteAdmin = async (req, res) => {
    const { id } = req.params;
    // Jangan hapus diri sendiri
    if (id === req.user?.id) {
        return res.status(400).json({ error: 'Tidak bisa menonaktifkan akun sendiri' });
    }
    try {
        await pool.query(`UPDATE user_account SET is_active = false WHERE id = $1`, [id]);
        res.status(200).json({ message: 'Admin dinonaktifkan' });
    } catch (err) {
        console.error('Delete admin error:', err);
        res.status(500).json({ error: 'Gagal menonaktifkan admin' });
    }
};
