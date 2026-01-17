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

const TOP_COINS_CHANNEL_ID = "1461258291916308541";
const TOP_XP_CHANNEL_ID = "1461258314825470015";
const SHOP_CHANNEL_ID = "1461258249574813707";

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
   🛍️ ITEMS
======================= */
const shopItemsMVP = [
  { name: "Discord Nitro", price: 600, description: "Discord Nitro completo con boosts." },
  { name: "Spotify 1 mes", price: 550, description: "Spotify Premium LATAM." },
  { name: "Steam Key", price: 450, description: "Juego aleatorio de Steam." },
  { name: "Nitro Classic", price: 350, description: "Discord Nitro Classic." },
  { name: "Karaoke con Owners", price: 300, description: "Canal privado 1 hora." },
  { name: "Creepypasta", price: 200, description: "Lectura personalizada." },
  { name: "Compartir rol", price: 170, description: "Comparte tu rol." },
  { name: "Canal personalizado", price: 150, description: "Canal privado." },
  { name: "Cambio de color", price: 100, description: "Cambio de color de rol." }
];

const shopItemsDiscord = [
  { name: "Canal privado x3", price: 320, description: "Canal para 3 miembros." },
  { name: "Rol cromático", price: 220, description: "Rol cromático 1 mes." },
  { name: "Boost", price: 120, description: "Apoyo al servidor." },
  { name: "Mute 1h", price: 100, description: "Mute a un miembro." },
  { name: "Rol personalizado", price: 80, description: "Rol sin color." },
  { name: "Icono de rol", price: 60, description: "Icono personalizado." },
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
  new SlashCommandBuilder().setName("tienda").setDescription("Enviar tienda"),
  new SlashCommandBuilder().setName("topcoins").setDescription("Actualizar top coins"),
  new SlashCommandBuilder().setName("topxp").setDescription("Actualizar top XP"),

  new SlashCommandBuilder().setName("modifycoins")
    .setDescription("Sumar o restar coins (OWNER)")
    .addUserOption(o => o.setName("usuario").setRequired(true))
    .addIntegerOption(o => o.setName("cantidad").setRequired(true))
    .addStringOption(o => o.setName("razon").setRequired(true)),

  new SlashCommandBuilder().setName("modifyxp")
    .setDescription("Sumar o restar XP (OWNER)")
    .addUserOption(o => o.setName("usuario").setRequired(true))
    .addIntegerOption(o => o.setName("cantidad").setRequired(true))
].map(c => c.toJSON());

/* =======================
   🚀 REGISTRO
======================= */
const rest = new REST({ version: "10" }).setToken(TOKEN);
(async () => {
  await rest.put(Routes.applicationGuildCommands(CLIENT_ID, GUILD_ID), { body: commands });
  console.log("✅ Comandos registrados");
})();

/* =======================
   🔝 TOP SYSTEM
======================= */
async function sendTop(type, channelId, title, emoji) {
  const all = await db.all();
  const users = all
    .filter(x => x.id.startsWith(`${type}_`))
    .map(x => ({ id: x.id.replace(`${type}_`, ""), value: x.value }))
    .sort((a, b) => b.value - a.value)
    .slice(0, 10);

  const channel = client.channels.cache.get(channelId);
  if (!channel) return;

  const embed = new EmbedBuilder()
    .setTitle(title)
    .setDescription(
      users.length
        ? users.map((u, i) => `**${i + 1}.** <@${u.id}> — ${emoji} ${u.value}`).join("\n")
        : "Sin datos"
    )
    .setColor(0xFFD700);

  const msgs = await channel.messages.fetch({ limit: 5 });
  await channel.bulkDelete(msgs, true);
  await channel.send({ embeds: [embed] });
}

/* =======================
   🛍️ TIENDA (UNA SOLA VEZ)
======================= */
async function sendShopOnce() {
  const channel = client.channels.cache.get(SHOP_CHANNEL_ID);
  if (!channel) return;

  const msgs = await channel.messages.fetch({ limit: 5 });
  if (msgs.size > 0) return;

  const embed = new EmbedBuilder()
    .setTitle("🛍️ Tienda MVP")
    .setDescription("Selecciona un item y confirma la compra")
    .setColor(0xF39C12);

  const menu = new StringSelectMenuBuilder()
    .setCustomId("shop_menu")
    .setPlaceholder("Selecciona un item")
    .addOptions(ALL_ITEMS.map(i => ({
      label: i.name,
      description: `${i.price} coins`,
      value: i.name
    })));

  await channel.send({
    embeds: [embed],
    components: [new ActionRowBuilder().addComponents(menu)]
  });
}

/* =======================
   🤖 READY
======================= */
client.once("ready", async () => {
  console.log("🤖 Bot conectado");
  await sendShopOnce();
  await sendTop("coins", TOP_COINS_CHANNEL_ID, "🏆 Top Coins", "💰");
  await sendTop("xp", TOP_XP_CHANNEL_ID, "✨ Top XP", "✨");
});

/* =======================
   ⚙️ XP AUTOMÁTICO
======================= */
client.on("messageCreate", async msg => {
  if (msg.author.bot) return;
  await db.add(`xp_${msg.author.id}`, 1);
});

/* =======================
   ⚙️ INTERACCIONES
======================= */
client.on("interactionCreate", async i => {

  /* SLASH */
  if (i.isChatInputCommand()) {
    if (i.commandName === "coins") {
      return i.reply({ content: `💰 Coins: ${await db.get(`coins_${i.user.id}`) || 0}`, ephemeral: true });
    }

    if (i.commandName === "xp") {
      return i.reply({ content: `✨ XP: ${await db.get(`xp_${i.user.id}`) || 0}`, ephemeral: true });
    }

    if (i.commandName === "inventory") {
      const inv = await db.get(`inv_${i.user.id}`) || [];
      return i.reply({ content: inv.length ? inv.join("\n") : "Inventario vacío", ephemeral: true });
    }

    if (i.commandName === "modifycoins" && i.user.id === OWNER_ID) {
      const u = i.options.getUser("usuario");
      const c = i.options.getInteger("cantidad");
      await db.add(`coins_${u.id}`, c);
      await sendTop("coins", TOP_COINS_CHANNEL_ID, "🏆 Top Coins", "💰");
      return i.reply({ content: "Coins modificadas", ephemeral: true });
    }

    if (i.commandName === "modifyxp" && i.user.id === OWNER_ID) {
      const u = i.options.getUser("usuario");
      const c = i.options.getInteger("cantidad");
      await db.add(`xp_${u.id}`, c);
      await sendTop("xp", TOP_XP_CHANNEL_ID, "✨ Top XP", "✨");
      return i.reply({ content: "XP modificada", ephemeral: true });
    }
  }

  /* SELECT */
  if (i.isStringSelectMenu()) {
    const item = ALL_ITEMS.find(x => x.name === i.values[0]);
    const embed = new EmbedBuilder()
      .setTitle(item.name)
      .setDescription(item.description)
      .addFields({ name: "Precio", value: `${item.price} coins` });

    const btn = new ButtonBuilder()
      .setCustomId(`buy_${item.name}`)
      .setLabel("Comprar")
      .setStyle(ButtonStyle.Success);

    return i.update({ embeds: [embed], components: [new ActionRowBuilder().addComponents(btn)] });
  }

  /* BUY */
  if (i.isButton()) {
    const name = i.customId.replace("buy_", "");
    const item = ALL_ITEMS.find(x => x.name === name);

    const coins = await db.get(`coins_${i.user.id}`) || 0;
    if (coins < item.price) return i.reply({ content: "❌ Coins insuficientes", ephemeral: true });

    await db.add(`coins_${i.user.id}`, -item.price);
    await db.push(`inv_${i.user.id}`, item.name);

    const owner = await client.users.fetch(OWNER_ID);
    await owner.send(`🛒 Compra:\nUsuario: ${i.user.tag}\nItem: ${item.name}`);

    await sendTop("coins", TOP_COINS_CHANNEL_ID, "🏆 Top Coins", "💰");
    return i.reply({ content: `✅ Compraste **${item.name}**`, ephemeral: true });
  }
});

/* =======================
   🔑 LOGIN
======================= */
client.login(TOKEN);

