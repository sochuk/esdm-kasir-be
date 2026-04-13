import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { pool } from '../config/db.config.js';

export const login = async (req, res) => {
  const { username, password } = req.body;

  try {
    // 1. Initial Validation
    if (!username || !password) {
      return res.status(400).json({ error: 'Username and password are required' });
    }

    // 2. Query user joined with their profile from database
    const userResult = await pool.query(
      `SELECT ua.id, ua.username, ua.password, ua.type_user, ua.is_active, 
              up.nama, up.unit, up.no_anggota, up.no_rekening, up.points, up.photo_base64, up.no_handphone
       FROM user_account ua
       LEFT JOIN user_profile up ON ua.id = up.id_user_account
       WHERE ua.username = $1`, 
      [username]
    );
    
    if (userResult.rows.length === 0) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const user = userResult.rows[0];

    // 2.a Validasi Status Aktif
    if (!user.is_active) {
      return res.status(403).json({ error: 'Akun Anda dinonaktifkan. Silakan hubungi Administrator.' });
    }

    // 3. Verify password
    const isPasswordValid = await bcrypt.compare(password, user.password);
    
    if (!isPasswordValid) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    // 4. Generate Token (we don't pass massive objects, just core identities)
    const token = jwt.sign(
      { id: user.id, username: user.username, role: user.type_user },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN || '8h' }
    );

    // 5. Send Success Response With Full Profile Data
    res.json({
      message: 'Login successful',
      token,
      user: {
        id: user.id,
        username: user.username,
        role: user.type_user, // Dipetakan dari type_user di user_account
        name: user.nama, // Dipetakan dari nama di user_profile
        unit: user.unit,
        no_anggota: user.no_anggota,
        no_rekening: user.no_rekening,
        points: user.points,
        photo_base64: user.photo_base64,
        no_handphone: user.no_handphone,
        is_active: user.is_active
      }
    });

  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ error: 'Internal server error during authentication' });
  }
};

export const getMe = async (req, res) => {
    try {
        const userId = req.user.id;
        const userResult = await pool.query(
            `SELECT ua.id, ua.username, ua.type_user, ua.is_active, 
                    up.nama, up.unit, up.no_anggota, up.no_rekening, up.points, up.photo_base64, up.no_handphone
             FROM user_account ua
             LEFT JOIN user_profile up ON ua.id = up.id_user_account
             WHERE ua.id = $1`, 
            [userId]
        );

        if (userResult.rows.length === 0) return res.status(404).json({ error: 'User not found' });
        
        const user = userResult.rows[0];
        res.json({
            id: user.id,
            username: user.username,
            role: user.type_user,
            name: user.nama,
            unit: user.unit,
            no_anggota: user.no_anggota,
            no_rekening: user.no_rekening,
            points: user.points,
            photo_base64: user.photo_base64,
            no_handphone: user.no_handphone,
            is_active: user.is_active
        });
    } catch(err) {
        res.status(500).json({ error: 'Failed to fetch user data' });
    }
};

export const updateProfile = async (req, res) => {
    try {
        const userId = req.user.id;
        const { no_handphone, photo_base64 } = req.body;
        
        let updates = [];
        let values = [];
        let iter = 1;
        
        if (no_handphone !== undefined) {
            updates.push(`no_handphone = $${iter++}`);
            values.push(no_handphone);
        }
        
        if (photo_base64 !== undefined) {
            updates.push(`photo_base64 = $${iter++}`);
            values.push(photo_base64);
        }

        if (updates.length > 0) {
            values.push(userId);
            const query = `UPDATE user_profile SET ${updates.join(', ')} WHERE id_user_account = $${iter}`;
            await pool.query(query, values);
        }

        if (req.body.is_active !== undefined) {
            await pool.query('UPDATE user_account SET is_active = $1 WHERE id = $2', [req.body.is_active, userId]);
        }
        
        res.json({ message: 'Profile updated successfully' });
    } catch(err) {
        console.error('Update profile error:', err);
        res.status(500).json({ error: 'Failed to update profile' });
    }
};

export const changePassword = async (req, res) => {
    try {
        const userId = req.user.id;
        const { old_password, new_password } = req.body;
        
        if (!old_password || !new_password) return res.status(400).json({ error: 'Missing fields' });
        
        const q = await pool.query('SELECT password FROM user_account WHERE id = $1', [userId]);
        if (q.rows.length === 0) return res.status(404).json({ error: 'User not found' });
        
        const isMatch = await bcrypt.compare(old_password, q.rows[0].password);
        if (!isMatch) return res.status(400).json({ error: 'Password lama salah' });
        
        const hash = await bcrypt.hash(new_password, 10);
        await pool.query('UPDATE user_account SET password = $1 WHERE id = $2', [hash, userId]);
        
        res.json({ message: 'Password updated successfully' });
    } catch(err) {
        console.error('Change password error:', err);
        res.status(500).json({ error: 'Failed to change password' });
    }
};
