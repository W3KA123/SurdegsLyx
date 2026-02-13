import express from "express";
import dotenv from "dotenv";
import nodemailer from "nodemailer";
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const app = express();

const port = Number(process.env.PORT || 3000);
const dataDir = path.join(__dirname, "data");
const ordersFile = path.join(dataDir, "orders.json");
const adminKey = (process.env.ADMIN_KEY || "").trim();

app.use(express.json());
app.use(express.static(__dirname));

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function formatOrderNumber() {
  const timestamp = Date.now().toString().slice(-8);
  const random = Math.floor(Math.random() * 900 + 100);
  return `SD-${timestamp}-${random}`;
}

async function readOrders() {
  try {
    const raw = await fs.readFile(ordersFile, "utf-8");
    return JSON.parse(raw);
  } catch (error) {
    if (error.code === "ENOENT") return [];
    throw error;
  }
}

async function writeOrders(orders) {
  await fs.mkdir(dataDir, { recursive: true });
  await fs.writeFile(ordersFile, JSON.stringify(orders, null, 2), "utf-8");
}

function validateOrder(payload) {
  const name = payload?.customer?.name?.trim();
  const email = payload?.customer?.email?.trim();
  const phone = payload?.customer?.phone?.trim();
  const itemName = payload?.item?.name?.trim();
  const quantity = Number(payload?.item?.quantity);
  const unitPrice = Number(payload?.item?.unitPrice);
  const total = Number(payload?.item?.total);

  if (!name || !email || !phone || !itemName) {
    return { ok: false, message: "Fyll i alla obligatoriska fält." };
  }

  if (Number.isNaN(quantity) || Number.isNaN(unitPrice) || Number.isNaN(total) || quantity < 1) {
    return { ok: false, message: "Ogiltig orderdata." };
  }

  if (quantity * unitPrice !== total) {
    return { ok: false, message: "Totalpris stämmer inte." };
  }

  return { ok: true };
}

function createTransporter() {
  const { SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS, SMTP_SECURE } = process.env;
  if (!SMTP_HOST || !SMTP_PORT || !SMTP_USER || !SMTP_PASS) return null;

  return nodemailer.createTransport({
    host: SMTP_HOST,
    port: Number(SMTP_PORT),
    secure: String(SMTP_SECURE).toLowerCase() === "true",
    connectionTimeout: 10000,
    greetingTimeout: 10000,
    socketTimeout: 15000,
    auth: {
      user: SMTP_USER,
      pass: SMTP_PASS,
    },
  });
}

async function sendOrderEmails(order) {
  const notifyEmail = process.env.ORDER_NOTIFICATION_EMAIL;
  const from = process.env.SMTP_FROM || process.env.SMTP_USER;
  const transporter = createTransporter();

  if (!notifyEmail || !from || !transporter) {
    return { sent: false, reason: "SMTP eller mottagare saknas" };
  }

  const customerSummary = `${order.item.name} x ${order.item.quantity} (${order.item.total} kr)`;

  const adminHtml = `
    <h2>Ny bestallning: ${escapeHtml(order.orderNumber)}</h2>
    <p><strong>Kund:</strong> ${escapeHtml(order.customer.name)}</p>
    <p><strong>E-post:</strong> ${escapeHtml(order.customer.email)}</p>
    <p><strong>Telefon:</strong> ${escapeHtml(order.customer.phone)}</p>
    <p><strong>Bestallning:</strong> ${escapeHtml(customerSummary)}</p>
    <p><strong>Meddelande:</strong> ${escapeHtml(order.note || "-")}</p>
  `;

  const customerHtml = `
    <h2>Tack for din bestallning!</h2>
    <p>Ordernummer: <strong>${escapeHtml(order.orderNumber)}</strong></p>
    <p>Vi har tagit emot: ${escapeHtml(customerSummary)}</p>
    <p>Vi aterkommer snart med leverans- eller upphamtningsdetaljer.</p>
  `;

  try {
    await transporter.sendMail({
      from,
      to: notifyEmail,
      replyTo: order.customer.email,
      subject: `Ny brodbestallning (${order.orderNumber})`,
      html: adminHtml,
    });

    await transporter.sendMail({
      from,
      to: order.customer.email,
      subject: `Bekraftelse (${order.orderNumber})`,
      html: customerHtml,
    });

    return { sent: true };
  } catch (error) {
    return { sent: false, reason: "Mejl kunde inte skickas med nuvarande SMTP-installningar." };
  }
}

app.get("/api/health", (_req, res) => {
  res.json({ ok: true, service: "sourdough-backend" });
});

app.get("/api/orders", async (req, res) => {
  const requestKey = String(req.query.adminKey || "");
  if (adminKey && requestKey !== adminKey) {
    return res.status(401).json({ error: "Obehorig." });
  }

  try {
    const orders = await readOrders();
    const sorted = [...orders].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    const totalRevenue = sorted.reduce((sum, order) => sum + Number(order.item?.total || 0), 0);
    return res.json({
      ok: true,
      count: sorted.length,
      totalRevenue,
      orders: sorted,
    });
  } catch (error) {
    return res.status(500).json({ error: "Kunde inte hamta bestallningar." });
  }
});

app.post("/api/orders", async (req, res) => {
  const validation = validateOrder(req.body);
  if (!validation.ok) {
    return res.status(400).json({ error: validation.message });
  }

  const order = {
    orderNumber: formatOrderNumber(),
    createdAt: new Date().toISOString(),
    customer: {
      name: req.body.customer.name.trim(),
      email: req.body.customer.email.trim(),
      phone: req.body.customer.phone.trim(),
    },
    item: {
      id: req.body.item.id,
      name: req.body.item.name.trim(),
      quantity: Number(req.body.item.quantity),
      unitPrice: Number(req.body.item.unitPrice),
      total: Number(req.body.item.total),
    },
    note: (req.body.note || "").trim(),
    summary: (req.body.summary || "").trim(),
  };

  try {
    const orders = await readOrders();
    orders.push(order);
    await writeOrders(orders);
    const hasMailConfig =
      Boolean(process.env.ORDER_NOTIFICATION_EMAIL) &&
      Boolean(process.env.SMTP_HOST) &&
      Boolean(process.env.SMTP_PORT) &&
      Boolean(process.env.SMTP_USER) &&
      Boolean(process.env.SMTP_PASS);

    if (hasMailConfig) {
      sendOrderEmails(order).catch(() => {
        // Keep order flow successful even if mail provider is slow/fails.
      });
    }

    return res.status(201).json({
      ok: true,
      orderNumber: order.orderNumber,
      emailSent: hasMailConfig ? null : false,
      emailInfo: hasMailConfig ? "Mail skickas i bakgrunden." : "SMTP eller mottagare saknas.",
    });
  } catch (error) {
    return res.status(500).json({ error: "Kunde inte spara bestallningen." });
  }
});

app.get("*", (_req, res) => {
  res.sendFile(path.join(__dirname, "index.html"));
});

app.listen(port, () => {
  console.log(`Server kor pa http://localhost:${port}`);
});
