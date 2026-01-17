require("dotenv").config();
const { 
  Client, 
  GatewayIntentBits, 
  REST, 
  Routes, 
  SlashCommandBuilder, 
  EmbedBuilder,
  ActionRowBuilder,
  StringSelectMenuBuilder,
  ButtonBuilder,
  ButtonStyle,
} = require("discord.js");
const { QuickDB } = require("quick.db");
const db = new QuickDB();

/* =======================
   🔐 CONFIG
======================= */
const TOKEN = process.env.TOKEN;
const CLIENT_ID = process.env.CLIENT_ID;
const GUILD_ID = "1415990627195289612";
const OWNER_ID = "836076392244445194";
const COINS_CHANNEL_ID = "1461258314825470015";
const TOP_CHANNEL_ID = "1461258291916308541";
const SHOP_CHANNEL_ID = "1461258249574813707";

/* =======================
   🤖 CLIENT
======================= */
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent
  ]
});

/* =======================
   🛍️ ITEMS DE LA TIENDA
======================= */
const shopItemsMVP = [
  { name: "Discord Nitro", price: 600, description: "Canjea un Discord Nitro Boost (versión completa). Incluye dos boosts." },
  { name: "Spotify por un mes", price: 550, description: "Canjea un mes completo de Spotify Premium. Disponible únicamente para LATAM." },
  { name: "Steam Key", price: 450, description: "Canjea un juego aleatorio de toda la tienda de Steam." },
  { name: "Discord Nitro Classic", price: 350, description: "Canjea un Discord Nitro Classic (edición básica)." },
  { name: "Karaoke con Fani & Misa", price: 300, description: "Acceso a un canal privado para escuchar cantar a Fani & Misa por una hora. Prohibido grabar." },
  { name: "Creepypasta leído por Fani & Misa", price: 200, description: "Las owners leerán un copypaste de tu elección. Prohibido grabar." },
  { name: "Pase para compartir rol personalizado", price: 170, description: "Permite compartir un rol personalizado con otro miembro." },
  { name: "Pase para canal personalizado", price: 150, description: "Pase individual para acceder a un canal personalizado." },
  { name: "Cambio de color de rol personalizado", price: 100, description: "Permite cambiar el color del rol personalizado una sola vez." }
];

const shopItemsDiscord = [
  { name: "Canal personalizado", price: 320, description: "Canal personalizado para ti y tus amigos. Incluye dos pases gratis (3 miembros)." },
  { name: "Color cromático para el rol personalizado", price: 220, description: "Canjea un rol cromático para tu perfil. Duración de un mes." },
  { name: "Boosters", price: 120, description: "Mejora el servidor con la templanza de un héroe." },
  { name: "Silenciamiento a un miembro", price: 100, description: "Silenciamiento por una hora. No aplicable a miembros del Staff." },
  { name: "Rol personalizado", price: 80, description: "Canjea un rol personalizado para tu perfil. No incluye color." },
  { name: "Icono para tu rol personalizado", price: 60, description: "Adorna tu rol personalizado con un icono." },
  { name: "Añadir color al rol personalizado", price: 50, description: "Añade color a tu rol personalizado." },
  { name: "Añadir un sticker", price: 40, description: "Añade cualquier sticker al servidor." },
  { name: "Añadir un emoji", price: 30, description: "Añade cualquier emoji al servidor." }
];

/* =======================
   🔝 TOP COINS
======================= */
async function sendTopEmbed() {
  const channel = client.channels.cache.get(TOP_CHANNEL_ID);
  if (!channel) return;

  const all = await db.all();
  const users = all
    .filter(d => d.id.startsWith("coins_"))
    .map(d => ({ userId: d.id.split("_")[1], coins: d.value }))
    .sort((a, b) => b.coins - a.coins)
    .slice(0, 10);

  const description = users.length
    ? users.map((u, i) => `**${i + 1}.** <@${u.userId}> — 💰 ${u.coins}`).join("\n")
    : "No hay usuarios aún.";

  const embed = new EmbedBuilder()
    .setTitle("🏆 Top Coins • MVP")
    .setDescription(description)
    .setColor(0xFFD700)
    .setTimestamp();

  const msgId = await db.get("top_msg_id");
  let msg;
  if (msgId) {
    try { msg = await channel.messages.fetch(msgId); } catch {}
  }

  if (msg) {
    await msg.edit({ embeds: [embed] });
  } else {
    const sent = await channel.send({ embeds: [embed] });
    await db.set("top_msg_id", sent.id);
  }
}

/* =======================
   🤖 READY
======================= */
client.on("ready", () => {
  console.log("🤖 Bot conectado");
});

/* =======================
   ⚙️ INTERACCIONES
======================= */
client.on("interactionCreate", async i => {
  if (!i.isChatInputCommand()) return;

  // VER COINS
  if (i.commandName === "coins") {
    const coins = (await db.get(`coins_${i.user.id}`)) || 0;
    return i.reply({ content: `💰 Tienes **${coins} coins**`, ephemeral: true });
  }

  // MODIFICAR COINS (OWNER)
  if (i.commandName === "modifycoins") {
    if (i.user.id !== OWNER_ID) {
      return i.reply({ content: "❌ Sin permiso", ephemeral: true });
    }

    const user = i.options.getUser("usuario");
    const amount = i.options.getInteger("cantidad");
    const reason = i.options.getString("razon");

    await db.add(`coins_${user.id}`, amount);
    const total = await db.get(`coins_${user.id}`);

    const embed = new EmbedBuilder()
      .setTitle("💰 Coins modificadas")
      .setColor(amount >= 0 ? 0x2ecc71 : 0xe74c3c)
      .addFields(
        { name: "Usuario", value: `<@${user.id}>`, inline: true },
        { name: "Cambio", value: `${amount}`, inline: true },
        { name: "Total", value: `${total}`, inline: true },
        { name: "Razón", value: reason }
      )
      .setTimestamp();

    const channel = client.channels.cache.get(COINS_CHANNEL_ID);
    if (channel) await channel.send({ embeds: [embed] });

    await sendTopEmbed();
    return i.reply({ content: "✅ Coins actualizadas correctamente.", ephemeral: true });
  }
});

/* =======================
   🔑 LOGIN
======================= */
client.login(TOKEN);
