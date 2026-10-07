require("dotenv").config();

const express = require("express");
const path = require("path");

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Servir la página web
app.use(express.static(path.join(__dirname, "public")));

// Datos de demostración
const leads = [];
const events = [];

// Configuración de tu producto Hotmart
const config = {
  product: "Diseña y Crea con Resina",
  checkout: "https://go.hotmart.com/S107105142R?dp=1"
};

// Palabras que activan respuestas
const rules = [
  {
    keywords: ["quiero", "info", "informacion", "información"],
    status: "interesado",
    reply:
      "¡Hola! 😊 Qué gusto. Te puedo dar información del curso completo para aprender resina desde cero. ¿Quieres que te pase los detalles?"
  },

  {
    keywords: ["aprender", "desde cero", "curso"],
    status: "interesado",
    reply:
      "¡Claro! 🙌 El curso está pensado para aprender paso a paso, incluso si empiezas desde cero. ¿Quieres conocer el contenido y el precio?"
  },

  {
    keywords: ["precio", "cuanto", "cuánto", "costo"],
    status: "link_enviado",
    reply:
      "Puedes revisar el precio y la oferta actual directamente en Hotmart: " +
      config.checkout
  },

  {
    keywords: ["link", "enlace", "comprar", "compra"],
    status: "link_enviado",
    reply:
      "Aquí tienes el enlace para revisar la oferta y comprar en Hotmart: " +
      config.checkout
  }
];

// Normalizar texto
function normalize(text = "") {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

// Buscar respuesta automática
function classify(text = "") {
  const normalized = normalize(text);

  return (
    rules.find((rule) =>
      rule.keywords.some((keyword) =>
        normalized.includes(normalize(keyword))
      )
    ) || null
  );
}

// Crear prospecto
function createLead(data) {
  const lead = {
    id:
      Date.now().toString(36) +
      Math.random().toString(36).substring(2, 8),

    name: data.name || "Prospecto",

    channel: data.channel || "unknown",

    text: data.text || "",

    status: data.status || "nuevo",

    reply: data.reply || "",

    createdAt: new Date().toISOString()
  };

  leads.unshift(lead);

  return lead;
}

// Configuración
app.get("/api/config", (req, res) => {
  res.json({
    product: config.product,
    checkout: config.checkout,

    channels: {
      tiktok: false,
      messenger: false,
      whatsapp: false
    }
  });
});

// Dashboard
app.get("/api/dashboard", (req, res) => {
  res.json({
    stats: {
      leads: leads.length,

      interested: leads.filter(
        (lead) => lead.status === "interesado"
      ).length,

      links: leads.filter(
        (lead) => lead.status === "link_enviado"
      ).length,

      sales: events.filter(
        (event) => event.type === "PURCHASE"
      ).length
    },

    leads: leads.slice(0, 100)
  });
});

// Probar automatización
app.post("/api/test-message", (req, res) => {
  const { channel, name, text } = req.body;

  const rule = classify(text);

  const lead = createLead({
    channel,
    name,
    text,

    status: rule ? rule.status : "nuevo",

    reply: rule ? rule.reply : ""
  });

  res.json({
    ok: true,

    lead,

    automatedReply:
      rule?.reply ||
      "No encontré una regla para este mensaje. Responde manualmente."
  });
});

// Webhooks para futuras integraciones
app.post("/webhooks/:channel", (req, res) => {
  const channel = req.params.channel;

  events.push({
    type: "MESSAGE",

    channel,

    payload: req.body,

    createdAt: new Date().toISOString()
  });

  res.json({
    ok: true
  });
});

// Webhook de Hotmart
app.post("/webhooks/hotmart", (req, res) => {
  const payload = req.body || {};

  const event =
    payload.event ||
    payload.type ||
    payload.data?.event ||
    "UNKNOWN";

  const eventName = String(event).toUpperCase();

  events.push({
    type:
      eventName.includes("PURCHASE") ||
      eventName.includes("APPROVED")
        ? "PURCHASE"
        : eventName,

    payload,

    createdAt: new Date().toISOString()
  });

  res.json({
    ok: true
  });
});

// Estado del servidor
app.get("/health", (req, res) => {
  res.json({
    status: "ok",

    message: "Hotmart Social Sales funcionando",

    time: new Date().toISOString()
  });
});

// Cargar página
app.get("*", (req, res) => {
  res.sendFile(
    path.join(__dirname, "public", "index.html")
  );
});

// Iniciar servidor
app.listen(PORT, () => {
  console.log(
    `Hotmart Social Sales funcionando en el puerto ${PORT}`
  );
});
