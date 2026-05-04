import { pool } from '../config/db.config.js';

export const getAllProducts = async (req, res) => {
    try {
        const result = await pool.query(`
            SELECT p.*, c.name as category 
            FROM product p 
            LEFT JOIN category c ON p.category_id = c.id 
            ORDER BY p.name ASC
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
    const result = await pool.query(
        `INSERT INTO category (name) VALUES ($1) 
         ON CONFLICT (name) DO UPDATE SET name = EXCLUDED.name 
         RETURNING id`,
        [catName]
    );
    return result.rows[0].id;
};

export const createProduct = async (req, res) => {
    // Poin 5: Tambahkan buy_price, is_consignment, consignment_percentage
    const { sku, name, category, price, buy_price, stock, image_url, is_consignment, consignment_percentage } = req.body;
    
    try {
        const category_id = await getOrUpsertCategoryId(category);

        const result = await pool.query(
            `INSERT INTO product (sku, name, category_id, price, buy_price, stock, image_url, is_consignment, consignment_percentage) 
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) RETURNING *`,
            [
                sku || null, name, category_id, 
                price, 
                buy_price || 0, 
                stock, 
                image_url || 'https://images.unsplash.com/photo-1572635196237-14b3f281503f?q=80&w=200&auto=format&fit=crop',
                is_consignment || false,
                consignment_percentage || 0
            ] 
        );
        
        const newProduct = result.rows[0];
        newProduct.category = category ? category.trim() : 'Lain-lain';
        
        res.status(201).json(newProduct);
    } catch (error) {
        console.error('Error creating product:', error);
        res.status(500).json({ message: error.code === '23505' ? 'SKU (Barcode) sudah terdaftar' : 'Gagal mendaftarkan produk' });
    }
};

export const updateProduct = async (req, res) => {
    const { id } = req.params;
    const { sku, name, category, price, buy_price, stock, image_url, is_consignment, consignment_percentage } = req.body;
    
    try {
        const category_id = await getOrUpsertCategoryId(category);

        const result = await pool.query(
            `UPDATE product 
             SET sku = $1, name = $2, category_id = $3, price = $4, buy_price = $5, stock = $6, image_url = $7,
                 is_consignment = $8, consignment_percentage = $9, updated_date = CURRENT_TIMESTAMP
             WHERE id = $10 RETURNING *`,
            [sku || null, name, category_id, price, buy_price || 0, stock, image_url, is_consignment || false, consignment_percentage || 0, id]
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
