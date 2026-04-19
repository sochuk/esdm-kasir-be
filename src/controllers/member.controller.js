import bcrypt from 'bcryptjs';
import { pool } from '../config/db.config.js';

// GET semua anggota (member)
export const getAllMembers = async (req, res) => {
    try {
        const result = await pool.query(`
            SELECT ua.id, ua.username, ua.is_active, ua.created_date,
                   up.nama, up.unit, up.no_anggota, up.no_rekening, up.points,
                   up.no_handphone, up.no_telpon, up.email
            FROM user_account ua
            LEFT JOIN user_profile up ON ua.id = up.id_user_account
            WHERE ua.type_user = 'member'
            ORDER BY up.no_anggota ASC
        `);
        res.status(200).json(result.rows);
    } catch (err) {
        console.error('Get members error:', err);
        res.status(500).json({ error: 'Gagal mengambil data anggota' });
    }
};

// POST tambah anggota baru
export const createMember = async (req, res) => {
    const { username, password, nama, unit, no_anggota, no_rekening, no_telpon, email } = req.body;
    if (!username || !password || !nama) {
        return res.status(400).json({ error: 'Username, password, dan nama wajib diisi' });
    }

    const client = await pool.connect();
    try {
        await client.query('BEGIN');
        const hash = await bcrypt.hash(password, 10);
        const userRes = await client.query(
            `INSERT INTO user_account (username, password, type_user, is_active, created_by)
             VALUES ($1, $2, 'member', true, $3) RETURNING id`,
            [username, hash, req.user?.username || 'admin']
        );
        const newId = userRes.rows[0].id;
        await client.query(
            `INSERT INTO user_profile (id_user_account, nama, unit, no_anggota, no_rekening, no_telpon, email, points)
             VALUES ($1, $2, $3, $4, $5, $6, $7, 0)`,
            [newId, nama, unit || '', no_anggota || null, no_rekening || '', no_telpon || '', email || '']
        );
        await client.query('COMMIT');
        res.status(201).json({ message: 'Anggota berhasil ditambahkan', id: newId });
    } catch (err) {
        await client.query('ROLLBACK');
        console.error('Create member error:', err);
        res.status(500).json({ error: err.code === '23505' ? 'Username atau No. Anggota sudah terdaftar' : 'Gagal menambahkan anggota' });
    } finally {
        client.release();
    }
};

// PUT update anggota
export const updateMember = async (req, res) => {
    const { id } = req.params;
    const { nama, unit, no_anggota, no_rekening, no_telpon, email, is_active, password } = req.body;

    const client = await pool.connect();
    try {
        await client.query('BEGIN');

        if (is_active !== undefined || password) {
            const acctUpdates = [];
            const acctVals = [];
            let i = 1;
            if (is_active !== undefined) { acctUpdates.push(`is_active = $${i++}`); acctVals.push(is_active); }
            if (password) {
                const hash = await bcrypt.hash(password, 10);
                acctUpdates.push(`password = $${i++}`); acctVals.push(hash);
            }
            acctVals.push(id);
            await client.query(`UPDATE user_account SET ${acctUpdates.join(', ')} WHERE id = $${i}`, acctVals);
        }

        await client.query(
            `UPDATE user_profile SET nama=$1, unit=$2, no_anggota=$3, no_rekening=$4, no_telpon=$5, email=$6
             WHERE id_user_account=$7`,
            [nama, unit || '', no_anggota || null, no_rekening || '', no_telpon || '', email || '', id]
        );

        await client.query('COMMIT');
        res.status(200).json({ message: 'Anggota berhasil diupdate' });
    } catch (err) {
        await client.query('ROLLBACK');
        console.error('Update member error:', err);
        res.status(500).json({ error: 'Gagal mengupdate anggota' });
    } finally {
        client.release();
    }
};

// DELETE (deactivate) anggota
export const deleteMember = async (req, res) => {
    const { id } = req.params;
    try {
        await pool.query(`UPDATE user_account SET is_active = false WHERE id = $1`, [id]);
        res.status(200).json({ message: 'Anggota dinonaktifkan' });
    } catch (err) {
        res.status(500).json({ error: 'Gagal menonaktifkan anggota' });
    }
};
