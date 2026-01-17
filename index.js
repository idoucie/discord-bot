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
   🛍️ ITEMS (TODOS)
======================= */
const shopItemsMVP = [
  { name: "Discord Nitro", price: 600, description: "Canjea un Discord Nitro Boost completo. Incluye dos boosts." },
  { name: "Spotify por un mes", price: 550, description: "Un mes completo de Spotify Premium (LATAM)." },
  { name: "Steam Key", price: 450, description: "Juego aleatorio de toda la tienda de Steam." },
  { name: "Discord Nitro Classic", price: 350, description: "Discord Nitro Classic básico." },
  { name: "Karaoke con Fani & Misa", price: 300, description: "Canal privado para escuchar cantar por una hora. Prohibido grabar." },
  { name: "Creepypasta leído por Fani & Misa", price: 200, description: "Las owners leerán un texto de tu elección." },
  { name: "Pase para compartir rol personalizado", price: 170, description: "Permite compartir un rol personalizado con otro miembro." },
  { name: "Pase para canal personalizado", price: 150, description: "Acceso a un canal personalizado." },
  { name: "Cambio de color de rol personalizado", price: 100, description: "Cambio único de color del rol." }
];

const shopItemsDiscord = [
  { name: "Canal personalizado", price: 320, description: "Canal privado para 3 miembros." },
  { name: "Color cromático para rol personalizado", price: 220, description: "Rol cromático durante 1 mes." },
  { name: "Boosters", price: 120, description: "Apoya el servidor con boosts." },
  { name: "Silenciamiento a un miembro", price: 100, description: "Mute por una hora (no staff)." },
  { name: "Rol personalizado", price: 80, description: "Rol personalizado sin color." },
  { name: "Icono para rol personalizado", price: 60, description: "Icono para tu rol personalizado." },
  { name: "Añadir color al rol personalizado", price: 50, description: "Desbloquea el color del rol." },
  { name: "Añadir un sticker", price: 40, description: "Añade un sticker al servidor." },
  { name: "Añadir un emoji", price: 30, description: "Añade un emoji al servidor." }
];

const ALL_ITEMS = [...shopItemsMVP, ...shopItemsDiscord];

/* =======================
   📜 COMANDOS
======================= */
const commands = [
  new SlashCommandBuilder().setName("coins").setDescription("Ver tus coins"),
  new SlashCommandBuilder().setName("xp").setDescription("Ver tu XP"),
  new SlashCommandBuilder().setName("inventory").setDescription("Ver inventario"),
  new SlashCommandBuilder().setName("tienda").setDescription("Mostrar tienda"),
  new SlashCommandBuilder().setName("topcoins").setDescription("Ver top coins"),
  new SlashCommandBuilder().setName("givexp")
    .setDescription("Dar XP (OWNER)")
    .addUserOption(o => o.setName("usuario").setDescription("Usuario").setRequired(true))
    .addIntegerOption(o => o.setName("cantidad").setDescription("Cantidad").setRequired(true)),
  new SlashCommandBuilder().setName("modifycoins")
    .setDescription("Modificar coins (OWNER)")
    .addUserOption(o => o.setName("usuario").setDescription("Usuario").setRequired(true))
    .addIntegerOption(o => o.setName("cantidad").setDescription("Cantidad").setRequired(true))
    .addStringOption(o => o.setName("razon").setDescription("Razón").setRequired(true))
].map(c => c.toJSON());

/* =======================
   🚀 REGISTRAR
======================= */
const rest = new REST({ version: "10" }).setToken(TOKEN);
(async () => {
  await rest.put(Routes.applicationGuildCommands(CLIENT_ID, GUILD_ID), { body: commands });
  console.log("✅ Comandos registrados");
})();

/* =======================
   🔝 TOP COINS
======================= */
async function sendTopEmbed() {
  const all = await db.all();
  const users = all
    .filter(x => x.id.startsWith("coins_"))
    .map(x => ({ id: x.id.replace("coins_", ""), coins: x.value }))
    .sort((a, b) => b.coins - a.coins)
    .slice(0, 10);

  const channel = client.channels.cache.get(TOP_CHANNEL_ID);
  if (!channel) return;

  const desc = users.length
    ? users.map((u, i) => `**${i + 1}.** <@${u.id}> — 💰 ${u.coins}`).join("\n")
    : "No hay usuarios aún.";

  const embed = new EmbedBuilder()
    .setTitle("🏆 Top Coins • MVP")
    .setDescription(desc)
    .setColor(0xFFD700)
    .setTimestamp();

  const msgs = await channel.messages.fetch({ limit: 10 });
  await channel.bulkDelete(msgs, true);
  await channel.send({ embeds: [embed] });
}

/* =======================
   🛍️ TIENDA
======================= */
async function sendShop() {
  const channel = client.channels.cache.get(SHOP_CHANNEL_ID);
  if (!channel) return;

  async function sendCategory(title, items, key) {
    const embed = new EmbedBuilder()
      .setTitle(title)
      .setDescription(items.map(i =>
        `**${i.name}**\n${i.description}\n💰 ${i.price}`
      ).join("\n\n"))
      .setColor(0xF39C12);

    const menu = new StringSelectMenuBuilder()
      .setCustomId(`shop_${key}`)
      .setPlaceholder("Selecciona un ítem")
      .addOptions(items.map(i => ({
        label: i.name,
        description: `Precio: ${i.price} coins`,
        value: i.name
      })));

    const row = new ActionRowBuilder().addComponents(menu);
    await channel.send({ embeds: [embed], components: [row] });
  }

  await sendCategory("🛍️ Tienda Oficial MVP", shopItemsMVP, "mvp");
  await sendCategory("🎮 Items de Discord", shopItemsDiscord, "discord");
}

/* =======================
   🤖 READY
======================= */
client.once("ready", async () => {
  console.log("🤖 Bot conectado");
  await sendShop();
  await sendTopEmbed();
});

/* =======================
   ⚙️ XP AUTOMÁTICO
======================= */
client.on("messageCreate", async msg => {
  if (msg.author.bot) return;
  const xp = await db.get(`xp_${msg.author.id}`) || 0;
  await db.set(`xp_${msg.author.id}`, xp + 1);
});

/* =======================
   ⚙️ INTERACCIONES
======================= */
client.on("interactionCreate", async i => {

  /* SLASH */
  if (i.isChatInputCommand()) {

    if (i.commandName === "coins") {
      const coins = await db.get(`coins_${i.user.id}`) || 0;
      return i.reply({ content: `💰 Tienes **${coins} coins**`, ephemeral: true });
    }

    if (i.commandName === "xp") {
      const xp = await db.get(`xp_${i.user.id}`) || 0;
      return i.reply({ content: `✨ Tienes **${xp} XP**`, ephemeral: true });
    }

    if (i.commandName === "inventory") {
      const inv = await db.get(`inv_${i.user.id}`) || [];
      return i.reply({
        content: inv.length ? `🎒 Inventario:\n• ${inv.join("\n• ")}` : "🎒 Inventario vacío",
        ephemeral: true
      });
    }

    if (i.commandName === "tienda") {
      await sendShop();
      return i.reply({ content: "🛍️ Tienda enviada correctamente", ephemeral: true });
    }

    if (i.commandName === "topcoins") {
      await sendTopEmbed();
      return i.reply({ content: "🏆 Top actualizado", ephemeral: true });
    }

    if (i.commandName === "modifycoins") {
      if (i.user.id !== OWNER_ID) {
        return i.reply({ content: "❌ Sin permiso", ephemeral: true });
      }

      const user = i.options.getUser("usuario");
      const amount = i.options.getInteger("cantidad");
      const reason = i.options.getString("razon");

      const coins = await db.get(`coins_${user.id}`) || 0;
      await db.set(`coins_${user.id}`, coins + amount);

      return i.reply({
        content: `💰 Coins modificadas a <@${user.id}>\n📌 ${reason}`,
        ephemeral: true
      });
    }
  }

  /* SELECT MENU */
  if (i.isStringSelectMenu()) {
    const item = ALL_ITEMS.find(x => x.name === i.values[0]);
    if (!item) return;

    const embed = new EmbedBuilder()
      .setTitle(`🛒 ${item.name}`)
      .setDescription(item.description)
      .addFields({ name: "Precio", value: `${item.price} coins` })
      .setColor(0x2ecc71);

    const button = new ButtonBuilder()
      .setCustomId(`buy_${item.name}`)
      .setLabel("Comprar")
      .setStyle(ButtonStyle.Success);

    const row = new ActionRowBuilder().addComponents(button);
    return i.update({ embeds: [embed], components: [row] });
  }

  /* BOTÓN COMPRA */
  if (i.isButton() && i.customId.startsWith("buy_")) {
    const name = i.customId.replace("buy_", "");
    const item = ALL_ITEMS.find(x => x.name === name);
    if (!item) return;

    const coins = await db.get(`coins_${i.user.id}`) || 0;
    if (coins < item.price) {
      return i.reply({ content: "❌ No tienes coins suficientes", ephemeral: true });
    }

    await db.set(`coins_${i.user.id}`, coins - item.price);

    const inv = await db.get(`inv_${i.user.id}`) || [];
    inv.push(item.name);
    await db.set(`inv_${i.user.id}`, inv);

    await sendTopEmbed();
    return i.reply({ content: `✅ Compraste **${item.name}**`, ephemeral: true });
  }
});

/* =======================
   🔑 LOGIN
======================= */
client.login(TOKEN);

