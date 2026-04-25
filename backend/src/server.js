import "dotenv/config";
import express from "express";
import cors from "cors";
import path from "path";
import { fileURLToPath } from "url";
import pool from "./db.js";
import { routeOrderViaMcp } from "./mcpGateway.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
app.use(cors());
app.use(express.json());

// Serve static files from the root frontend directory
// Static files are handled by Vercel automatically
// app.use(express.static(path.join(__dirname, "../../")));

app.get("/api/health", async (_req, res) => {
  try {
    await pool.query("SELECT 1");
    res.json({ ok: true, db: "connected" });
  } catch (error) {
    res.status(500).json({ ok: false, error: error.message });
  }
});

app.post("/api/orders", async (req, res) => {
  const { name, phone, address, items, orderSource = "chatbot", countryCode = "IN", currencyCode = "INR" } = req.body;
  if (!name || !phone || !address || !Array.isArray(items) || items.length === 0) {
    return res.status(400).json({ ok: false, message: "Invalid order payload" });
  }

  const subtotal = items.reduce((sum, item) => sum + Number(item.qty || 0) * 45, 0);
  if (subtotal <= 100) {
    return res.status(400).json({ ok: false, message: "Minimum online order is above Rs 100" });
  }

  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();

    const [customerResult] = await conn.query(
      `INSERT INTO customers (name, phone, address)
       VALUES (?, ?, ?)
       ON DUPLICATE KEY UPDATE name = VALUES(name), address = VALUES(address)`,
      [name, phone, address]
    );

    const [customerRows] = await conn.query("SELECT id FROM customers WHERE phone = ?", [phone]);
    const customerId = customerRows[0].id;

    const [restaurantRows] = await conn.query("SELECT id, code FROM restaurants WHERE code = ? LIMIT 1", ["ANNAPURNA-HNK"]);
    const restaurantId = restaurantRows[0]?.id || null;
    const restaurantCode = restaurantRows[0]?.code || "ANNAPURNA-HNK";

    const [orderResult] = await conn.query(
      `INSERT INTO orders
      (customer_id, restaurant_id, order_source, subtotal, delivery_charge, total_amount, customer_country_code, currency_code, notes)
      VALUES (?, ?, ?, ?, 0, ?, ?, ?, ?)`,
      [customerId, restaurantId, orderSource, subtotal, subtotal, countryCode, currencyCode, "Created from website chatbot"]
    );

    const orderId = orderResult.insertId;

    for (const item of items) {
      const itemName = String(item.name || "").trim();
      const qty = Number(item.qty || 0);
      if (!itemName || qty <= 0) continue;

      const [menuRows] = await conn.query("SELECT id FROM menu_items WHERE name = ? LIMIT 1", [itemName]);
      if (!menuRows.length) continue;
      const menuItemId = menuRows[0].id;
      const unitPrice = 45;
      const lineTotal = unitPrice * qty;

      await conn.query(
        `INSERT INTO order_items (order_id, menu_item_id, quantity, unit_price, line_total)
         VALUES (?, ?, ?, ?, ?)`,
        [orderId, menuItemId, qty, unitPrice, lineTotal]
      );
    }

    const mcpResult = await routeOrderViaMcp({
      restaurantCode,
      orderPayload: { orderId, name, phone, address, items, subtotal }
    });

    await conn.query("UPDATE orders SET external_order_ref = ? WHERE id = ?", [mcpResult.externalOrderRef, orderId]);
    await conn.commit();

    res.status(201).json({
      ok: true,
      orderId,
      externalOrderRef: mcpResult.externalOrderRef,
      subtotal
    });
  } catch (error) {
    await conn.rollback();
    res.status(500).json({ ok: false, message: error.message });
  } finally {
    conn.release();
  }
});

app.get("/api/orders", async (req, res) => {
  try {
    const [orders] = await pool.query(`
      SELECT o.id, o.status, o.total_amount, o.created_at, 
             c.name as customer_name, c.phone as customer_phone, c.address as customer_address
      FROM orders o
      JOIN customers c ON o.customer_id = c.id
      ORDER BY o.created_at DESC
      LIMIT 100
    `);

    // Fetch items for each order
    for (const order of orders) {
      const [items] = await pool.query(`
        SELECT oi.quantity, m.name 
        FROM order_items oi
        JOIN menu_items m ON oi.menu_item_id = m.id
        WHERE oi.order_id = ?
      `, [order.id]);
      order.items = items;
    }

    res.json({ ok: true, orders });
  } catch (error) {
    res.status(500).json({ ok: false, message: error.message });
  }
});

app.patch("/api/orders/:id/status", async (req, res) => {
  const { id } = req.params;
  const { status } = req.body;
  
  const validStatuses = ['pending', 'confirmed', 'preparing', 'out_for_delivery', 'delivered', 'cancelled'];
  if (!validStatuses.includes(status)) {
    return res.status(400).json({ ok: false, message: "Invalid status" });
  }

  try {
    const [result] = await pool.query("UPDATE orders SET status = ? WHERE id = ?", [status, id]);
    if (result.affectedRows === 0) {
      return res.status(404).json({ ok: false, message: "Order not found" });
    }
    res.json({ ok: true, message: "Status updated successfully" });
  } catch (error) {
    res.status(500).json({ ok: false, message: error.message });
  }
});

const port = Number(process.env.PORT || 4000);
if (process.env.NODE_ENV !== "production") {
  app.listen(port, () => {
    console.log(`API running on http://localhost:${port}`);
  });
}

export default app;
