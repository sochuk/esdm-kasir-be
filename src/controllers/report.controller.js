import { pool } from '../config/db.config.js';

// Poin 7: Profit per produk dalam rentang tanggal
export const getProductProfit = async (req, res) => {
    const { product_id, start_date, end_date } = req.query;

    if (!start_date || !end_date) {
        return res.status(400).json({ error: 'start_date dan end_date wajib diisi' });
    }

    try {
        // Query transaksi produk tertentu dalam rentang tanggal
        let query = `
            SELECT 
                ti.id,
                ti.product_id,
                ti.product_name,
                ti.product_sku,
                ti.quantity,
                ti.price as sell_price,
                ti.buy_price,
                ti.subtotal as sell_subtotal,
                ti.is_consignment,
                ti.consignment_percentage,
                t.invoice_number,
                t.created_date,
                t.payment_method,
                -- Kalkulasi profit
                CASE 
                    WHEN ti.is_consignment = true 
                    THEN (ti.consignment_percentage / 100.0) * ti.subtotal
                    ELSE ti.subtotal - (ti.buy_price * ti.quantity)
                END as profit
            FROM transaction_item ti
            JOIN transaction t ON ti.transaction_id = t.id
            WHERE t.created_date::date >= $1 AND t.created_date::date <= $2
        `;
        const params = [start_date, end_date];

        if (product_id) {
            query += ` AND ti.product_id = $3`;
            params.push(product_id);
        }

        query += ` ORDER BY t.created_date DESC`;

        const result = await pool.query(query, params);

        // Hitung summary total
        const totalSellRevenue = result.rows.reduce((acc, r) => acc + Number(r.sell_subtotal), 0);
        const totalBuyCost = result.rows.reduce((acc, r) => acc + (Number(r.buy_price) * Number(r.quantity)), 0);
        const totalProfit = result.rows.reduce((acc, r) => acc + Number(r.profit), 0);
        const totalQty = result.rows.reduce((acc, r) => acc + Number(r.quantity), 0);

        res.status(200).json({
            transactions: result.rows,
            summary: {
                total_transactions: result.rows.length,
                total_qty_sold: totalQty,
                total_sell_revenue: totalSellRevenue,
                total_buy_cost: totalBuyCost,
                total_profit: totalProfit,
            }
        });
    } catch (err) {
        console.error('Get profit error:', err);
        res.status(500).json({ error: 'Gagal mengambil data profit' });
    }
};

// GET semua produk untuk dropdown filter
export const getProductList = async (req, res) => {
    try {
        const result = await pool.query(`
            SELECT p.id, p.name, p.sku, p.buy_price, p.price, p.is_consignment, p.consignment_percentage, c.name as category
            FROM product p
            LEFT JOIN category c ON p.category_id = c.id
            ORDER BY p.name ASC
        `);
        res.status(200).json(result.rows);
    } catch (err) {
        res.status(500).json({ error: 'Gagal mengambil daftar produk' });
    }
};
