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
  ButtonStyle
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

const TOP_CHANNEL_ID = "1461258291916308541";
const LOG_COINS_CHANNEL_ID = "1461258314825470015";
const SHOP_CHANNEL_ID = "1461258249574813707";

/* =======================
   🖼️ BANNERS
======================= */
const SHOP_BANNER_URL =
  "https://cdn.discordapp.com/attachments/1416377941541261503/1461529196030459905/WhatsApp_Image_2026-01-15_at_19.14.20.jpeg";

const DISCORD_ITEMS_BANNER_URL =
  "https://cdn.discordapp.com/attachments/1416377941541261503/1461533727359373433/WhatsApp_Image_2026-01-15_at_19.32.25.jpeg";

/* =======================
   🤖 CLIENT
======================= */
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.DirectMessages
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
  { name: "Karaoke con Fani & Misa", price: 300, description: "Acceso a un canal privado por una hora. Prohibido grabar." },
  { name: "Creepypasta leído por Fani & Misa", price: 200, description: "Las owners leerán un copypaste de tu elección." },
  { name: "Pase para compartir rol personalizado", price: 170, description: "Permite compartir un rol personalizado con otro miembro." },
  { name: "Pase para canal personalizado", price: 150, description: "Acceso individual a un canal personalizado." },
  { name: "Cambio de color de rol personalizado", price: 100, description: "Cambio único de color del rol." }
];

const shopItemsDiscord = [
  { name: "Canal personalizado", price: 320, description: "Canal para ti y dos personas más." },
  { name: "Color cromático para rol", price: 220, description: "Rol cromático por un mes." },
  { name: "Boosters", price: 120, description: "Apoyo al servidor." },
  { name: "Silenciamiento", price: 100, description: "Mute por una hora." },
  { name: "Rol personalizado", price: 80, description: "Rol sin color." },
  { name: "Icono de rol", price: 60, description: "Icono para tu rol." },
  { name: "Color de rol", price: 50, description: "Añadir color." },
  { name: "Sticker", price: 40, description: "Añadir sticker." },
  { name: "Emoji", price: 30, description: "Añadir emoji." }
];

const ALL_ITEMS = [...shopItemsMVP, ...shopItemsDiscord];

/* =======================
   📜 COMANDOS
======================= */
const commands = [
  new SlashCommandBuilder().setName("coins").setDescription("Ver tus coins"),
  new SlashCommandBuilder().setName("xp").setDescription("Ver tu XP"),
  new SlashCommandBuilder().setName("inventory").setDescription("Ver inventario"),
  new SlashCommandBuilder().setName("tienda").setDescription("Mostrar la tienda"),
  new SlashCommandBuilder()
    .setName("modifycoins")
    .setDescription("Sumar o restar coins")
    .addUserOption(o => o.setName("usuario").setDescription("Usuario").setRequired(true))
    .addIntegerOption(o => o.setName("cantidad").setDescription("Cantidad").setRequired(true))
    .addStringOption(o => o.setName("razon").setDescription("Razón").setRequired(true))
].map(c => c.toJSON());

const rest = new REST({ version: "10" }).setToken(TOKEN);

/* =======================
   🔁 REGISTRO DE COMANDOS
======================= */
(async () => {
  try {
    await rest.put(
      Routes.applicationGuildCommands(CLIENT_ID, GUILD_ID),
      { body: commands }
    );
    console.log("✅ Comandos registrados");
  } catch (err) {
    console.error("❌ Error registrando comandos:", err);
  }
})();

/* =======================
   🔝 TOP AUTOMÁTICO
======================= */
async function updateTop() {
  const all = await db.all();
  const users = all
    .filter(x => x.id.startsWith("coins_"))
    .map(x => ({ id: x.id.replace("coins_", ""), value: x.value }))
    .sort((a, b) => b.value - a.value)
    .slice(0, 10);

  const channel = await client.channels.fetch(TOP_CHANNEL_ID).catch(() => null);
  if (!channel) return;

  const embed = new EmbedBuilder()
    .setTitle("🏆 Top Coins • MVP")
    .setDescription(
      users
        .map((u, i) => `**${i + 1}.** <@${u.id}> — 💰 ${u.value}`)
        .join("\n")
    )
    .setColor(0xFFD700);

  try {
    const msgs = await channel.messages.fetch({ limit: 5 });
    await channel.bulkDelete(msgs, true);
  } catch (err) {
    console.log("⚠️ No se pudieron borrar mensajes antiguos:", err.message);
  }

  await channel.send({ embeds: [embed] });
}

/* =======================
   🔑 LOGIN
======================= */
client.login(TOKEN);


