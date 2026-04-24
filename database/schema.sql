-- Annapurna Tiffins core database schema
-- Compatible with MySQL 8+

CREATE DATABASE IF NOT EXISTS annapurna_tiffins;
USE annapurna_tiffins;

CREATE TABLE IF NOT EXISTS customers (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  name VARCHAR(120) NOT NULL,
  phone VARCHAR(20) NOT NULL UNIQUE,
  address TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS menu_items (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  name VARCHAR(120) NOT NULL UNIQUE,
  price DECIMAL(10,2) NOT NULL DEFAULT 45.00,
  is_available BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS orders (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  customer_id BIGINT NOT NULL,
  order_source ENUM('whatsapp', 'chatbot', 'website_form', 'call') NOT NULL DEFAULT 'website_form',
  status ENUM('pending', 'confirmed', 'preparing', 'out_for_delivery', 'delivered', 'cancelled') NOT NULL DEFAULT 'pending',
  subtotal DECIMAL(10,2) NOT NULL,
  delivery_charge DECIMAL(10,2) NOT NULL DEFAULT 0.00,
  total_amount DECIMAL(10,2) NOT NULL,
  notes TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_orders_customer FOREIGN KEY (customer_id) REFERENCES customers(id)
);

CREATE TABLE IF NOT EXISTS order_items (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  order_id BIGINT NOT NULL,
  menu_item_id BIGINT NOT NULL,
  quantity INT NOT NULL CHECK (quantity > 0),
  unit_price DECIMAL(10,2) NOT NULL,
  line_total DECIMAL(10,2) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_order_items_order FOREIGN KEY (order_id) REFERENCES orders(id),
  CONSTRAINT fk_order_items_menu_item FOREIGN KEY (menu_item_id) REFERENCES menu_items(id)
);

CREATE TABLE IF NOT EXISTS reviews (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  customer_id BIGINT NULL,
  review_type ENUM('item', 'delivery') NOT NULL,
  menu_item_id BIGINT NULL,
  rating TINYINT NOT NULL CHECK (rating BETWEEN 1 AND 5),
  review_text TEXT NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_reviews_customer FOREIGN KEY (customer_id) REFERENCES customers(id),
  CONSTRAINT fk_reviews_menu_item FOREIGN KEY (menu_item_id) REFERENCES menu_items(id)
);

CREATE TABLE IF NOT EXISTS chatbot_messages (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  customer_phone VARCHAR(20),
  sender ENUM('customer', 'bot') NOT NULL,
  message_text TEXT NOT NULL,
  intent VARCHAR(80),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Multi-restaurant support for MCP routing
CREATE TABLE IF NOT EXISTS restaurants (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  code VARCHAR(40) NOT NULL UNIQUE,
  name VARCHAR(120) NOT NULL,
  country_code CHAR(2) NOT NULL DEFAULT 'IN',
  timezone VARCHAR(64) NOT NULL DEFAULT 'Asia/Kolkata',
  currency_code CHAR(3) NOT NULL DEFAULT 'INR',
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- MCP integration registry for restaurant connectors
CREATE TABLE IF NOT EXISTS mcp_connections (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  restaurant_id BIGINT NOT NULL,
  provider_name VARCHAR(80) NOT NULL,
  endpoint_url VARCHAR(255) NOT NULL,
  auth_type ENUM('none', 'api_key', 'oauth') NOT NULL DEFAULT 'none',
  is_enabled BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_mcp_restaurant FOREIGN KEY (restaurant_id) REFERENCES restaurants(id)
);

-- International order fields and restaurant ownership for order processing
ALTER TABLE orders
  ADD COLUMN restaurant_id BIGINT NULL,
  ADD COLUMN customer_country_code CHAR(2) NOT NULL DEFAULT 'IN',
  ADD COLUMN currency_code CHAR(3) NOT NULL DEFAULT 'INR',
  ADD COLUMN fx_rate_to_inr DECIMAL(12,6) NULL,
  ADD COLUMN external_order_ref VARCHAR(80) NULL;

-- Add this once in environments that do not already have the constraint:
-- ALTER TABLE orders
--   ADD CONSTRAINT fk_orders_restaurant FOREIGN KEY (restaurant_id) REFERENCES restaurants(id);

INSERT IGNORE INTO menu_items (name, price) VALUES
('Idli', 45.00),
('Vada', 45.00),
('Puri', 45.00),
('Bonda', 45.00),
('Masala Dosa', 45.00),
('Onion Dosa', 45.00),
('Uthappam', 45.00),
('Set Dosa', 45.00);

INSERT IGNORE INTO restaurants (code, name, country_code, timezone, currency_code) VALUES
('ANNAPURNA-HNK', 'Annapurna Tiffins Hanamkonda', 'IN', 'Asia/Kolkata', 'INR');
