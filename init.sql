-- Harus enable extension UUID untuk generate UUID() function bawaan server Postgres.
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

DROP TABLE IF EXISTS user_profile;
DROP TABLE IF EXISTS user_account CASCADE;
DROP TABLE IF EXISTS product CASCADE;
DROP TABLE IF EXISTS category CASCADE;
DROP TABLE IF EXISTS users CASCADE; -- (Pembersihan skema terdahulu)

-- 1. Create Core Authentication Table
CREATE TABLE IF NOT EXISTS user_account (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    username VARCHAR(50) UNIQUE NOT NULL,
    password VARCHAR(255) NOT NULL,
    type_user VARCHAR(50) DEFAULT 'member',
    is_active BOOLEAN DEFAULT TRUE,
    created_by VARCHAR(50) DEFAULT 'system',
    created_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_by VARCHAR(50),
    updated_date TIMESTAMP,
    deleted_by VARCHAR(50),
    deleted_date TIMESTAMP
);

-- 2. Create Profile Table with relationships
CREATE TABLE IF NOT EXISTS user_profile (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    id_user_account UUID NOT NULL REFERENCES user_account(id) ON DELETE CASCADE,
    unit VARCHAR(100),
    no_anggota INTEGER,
    no_rekening VARCHAR(50),
    nama VARCHAR(150) NOT NULL,
    points INTEGER DEFAULT 0
);

-- 3. Create Master Category Table
CREATE TABLE IF NOT EXISTS category (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(100) UNIQUE NOT NULL,
    created_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Seed default categories
INSERT INTO category (name) VALUES 
('Makanan'), 
('Minuman'), 
('Snack'), 
('Rokok'), 
('Lain-lain')
ON CONFLICT (name) DO NOTHING;

-- 4. Create Product Content Table
CREATE TABLE IF NOT EXISTS product (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    sku VARCHAR(100),
    name VARCHAR(255) NOT NULL,
    category_id UUID REFERENCES category(id) ON DELETE SET NULL,
    price NUMERIC(15,2) DEFAULT 0,
    stock INTEGER DEFAULT 0,
    image_url VARCHAR(1000),
    created_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_by VARCHAR(50),
    updated_by VARCHAR(50)
);

-- 5. Create Transaction Tables
CREATE TABLE IF NOT EXISTS transaction (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    invoice_number VARCHAR(50) UNIQUE NOT NULL,
    id_user_account UUID REFERENCES user_account(id) ON DELETE SET NULL,
    subtotal NUMERIC(15,2) DEFAULT 0,
    discount NUMERIC(15,2) DEFAULT 0,
    tax NUMERIC(15,2) DEFAULT 0,
    total NUMERIC(15,2) DEFAULT 0,
    points_earned INTEGER DEFAULT 0,
    points_used INTEGER DEFAULT 0,
    payment_method VARCHAR(50) DEFAULT 'cash',
    created_by VARCHAR(50),
    created_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS transaction_item (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    transaction_id UUID NOT NULL REFERENCES transaction(id) ON DELETE CASCADE,
    product_id UUID REFERENCES product(id) ON DELETE SET NULL,
    product_sku VARCHAR(100),
    product_name VARCHAR(255),
    quantity INTEGER NOT NULL,
    price NUMERIC(15,2) NOT NULL,
    subtotal NUMERIC(15,2) NOT NULL
);

-- 6. Insert Dummy Administrator safely with explicit UUID
DO $$
DECLARE
    new_user_id UUID := uuid_generate_v4();
BEGIN
    IF NOT EXISTS (SELECT 1 FROM user_account WHERE username = 'admin') THEN
        
        -- Masukkan Logins Account
        -- Password is 'admin123'
        INSERT INTO user_account (id, username, password, type_user, is_active, created_by)
        VALUES (
            new_user_id, 
            'admin', 
            '$2a$10$C5b2j3h/2R1LgXm2E.52ue7sOM6T1J.Y6.G3j19iB5dF2H6fOaE0K', 
            'admin',
            TRUE, 
            'admin-seeder'
        );

        -- Hubungkan User ID yang digenerate dengan Detail Profilnya
        INSERT INTO user_profile (id_user_account, unit, no_anggota, no_rekening, nama)
        VALUES (
            new_user_id,
            'Kantor Pusat Administrasi ESDM',
            10001,
            91120011,
            'Administrator Pusat'
        );

    END IF;
END $$;
