import bcrypt from 'bcryptjs';
import pg from 'pg';

async function fixAdmin() {
    const hash = await bcrypt.hash('admin123', 10);
    const client = new pg.Client({
        host: 'localhost', 
        port: 5432, 
        user: 'postgres', 
        password: 'Brebet@123', 
        database: 'esdm_kasir_db'
    });
    
    try {
        await client.connect();
        await client.query("UPDATE user_account SET password = $1 WHERE username = 'admin'", [hash]);
        console.log('✅ Admin password fixed!');
    } catch (e) {
        console.error(e);
    } finally {
        await client.end();
    }
}

fixAdmin();
