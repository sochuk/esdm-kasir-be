import { pool } from '../config/db.config.js';

export const getAllProducts = async (req, res) => {
    try {
        const result = await pool.query(`
            SELECT p.*, c.name as category 
            FROM product p 
            LEFT JOIN category c ON p.category_id = c.id 
            ORDER BY p.created_date DESC
        `);
        res.status(200).json(result.rows);
    } catch (error) {
        console.error('Error fetching inventory:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
};

const getOrUpsertCategoryId = async (categoryName) => {
    let catName = categoryName ? categoryName.trim() : 'Lain-lain';
    if (!catName) catName = 'Lain-lain';
    
    // Insert if not exists, do nothing if exists (we use DO UPDATE because we need RETURNING id, DO NOTHING might not return if row exists)
    const result = await pool.query(
        `INSERT INTO category (name) VALUES ($1) 
         ON CONFLICT (name) DO UPDATE SET name = EXCLUDED.name 
         RETURNING id`,
        [catName]
    );
    return result.rows[0].id;
};

export const createProduct = async (req, res) => {
    const { sku, name, category, price, stock, image_url } = req.body;
    
    try {
        const category_id = await getOrUpsertCategoryId(category);

        const result = await pool.query(
            `INSERT INTO product (sku, name, category_id, price, stock, image_url) 
             VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
            [sku, name, category_id, price, stock, image_url || 'https://images.unsplash.com/photo-1572635196237-14b3f281503f?q=80&w=200&auto=format&fit=crop'] 
        );
        
        const newProduct = result.rows[0];
        // Ensure returning category as string for frontend compatibility
        newProduct.category = category ? category.trim() : 'Lain-lain';
        
        res.status(201).json(newProduct);
    } catch (error) {
        console.error('Error creating product:', error);
        res.status(500).json({ message: error.code === '23505' ? 'SKU (Barcode) is already registered' : 'Failed to register product' });
    }
};

export const updateProduct = async (req, res) => {
    const { id } = req.params;
    const { sku, name, category, price, stock, image_url } = req.body;
    
    try {
        const category_id = await getOrUpsertCategoryId(category);

        const result = await pool.query(
            `UPDATE product 
             SET sku = $1, name = $2, category_id = $3, price = $4, stock = $5, image_url = $6, updated_date = CURRENT_TIMESTAMP
             WHERE id = $7 RETURNING *`,
            [sku, name, category_id, price, stock, image_url, id]
        );
        
        if (result.rows.length === 0) {
            return res.status(404).json({ message: 'Product not found' });
        }
        
        const updatedProduct = result.rows[0];
        updatedProduct.category = category ? category.trim() : 'Lain-lain';

        res.status(200).json(updatedProduct);
    } catch (error) {
        console.error('Error updating product:', error);
        res.status(500).json({ message: 'Failed to update product' });
    }
};

export const deleteProduct = async (req, res) => {
    const { id } = req.params;
    try {
        const result = await pool.query('DELETE FROM product WHERE id = $1 RETURNING *', [id]);
        if (result.rows.length === 0) {
            return res.status(404).json({ message: 'Product not found' });
        }
        res.status(200).json({ message: 'Product deleted successfully', id });
    } catch (error) {
        console.error('Error deleting product:', error);
        res.status(500).json({ message: 'Failed to delete product' });
    }
};
