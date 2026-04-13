import { pool } from '../config/db.config.js';

export const getAllCategories = async (req, res) => {
    try {
        const result = await pool.query('SELECT * FROM category ORDER BY name ASC');
        res.status(200).json(result.rows);
    } catch (error) {
        console.error('Error fetching categories:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
};

export const createCategory = async (req, res) => {
    const { name } = req.body;
    if (!name || !name.trim()) {
        return res.status(400).json({ message: 'Nama kategori tidak boleh kosong' });
    }
    try {
        const result = await pool.query(
            `INSERT INTO category (name) VALUES ($1) ON CONFLICT (name) DO NOTHING RETURNING *`,
            [name.trim()]
        );
        // If ON CONFLICT triggered (name already exists), return existing row
        if (result.rows.length === 0) {
            const existing = await pool.query('SELECT * FROM category WHERE name = $1', [name.trim()]);
            return res.status(200).json(existing.rows[0]);
        }
        res.status(201).json(result.rows[0]);
    } catch (error) {
        console.error('Error creating category:', error);
        res.status(500).json({ message: 'Gagal membuat kategori' });
    }
};

export const deleteCategory = async (req, res) => {
    const { id } = req.params;
    try {
        const result = await pool.query('DELETE FROM category WHERE id = $1 RETURNING *', [id]);
        if (result.rows.length === 0) {
            return res.status(404).json({ message: 'Kategori tidak ditemukan' });
        }
        res.status(200).json({ message: 'Kategori dihapus', id });
    } catch (error) {
        console.error('Error deleting category:', error);
        res.status(500).json({ message: 'Gagal menghapus kategori' });
    }
};
