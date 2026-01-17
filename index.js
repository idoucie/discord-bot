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
(async () => {
  await rest.put(Routes.applicationGuildCommands(CLIENT_ID, GUILD_ID), { body: commands });
  console.log("✅ Comandos registrados");
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
    .setDescription(users.map((u, i) => `**${i + 1}.** <@${u.id}> — 💰 ${u.value}`).join("\n"))
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
   🛍️ TIENDA AUTOMÁTICA
======================= */
async function sendShop(force = false) {
  const channel = await client.channels.fetch(SHOP_CHANNEL_ID).catch(() => null);
  if (!channel) return;

  try {
    const msgs = await channel.messages.fetch({ limit: 5 });
    await channel.bulkDelete(msgs, true);
  } catch {}

  // Embed MVP
  const mvpDescription = shopItemsMVP.map(i => `**${i.name}** — 💰 ${i.price}\n${i.description}`).join("\n\n");
  const embedMVP = new EmbedBuilder()
    .setTitle("🌟 Tienda MVP")
    .setDescription(mvpDescription)
    .setImage(SHOP_BANNER_URL)
    .setColor(0xFF69B4)
    .setFooter({ text: "Selecciona un item para comprar usando el menú de abajo" });

  const mvpMenu = new StringSelectMenuBuilder()
    .setCustomId("shop_menu")
    .setPlaceholder("🛒 Selecciona un item MVP")
    .addOptions(shopItemsMVP.map(i => ({ label: i.name, description: `💰 ${i.price}`, value: i.name })));

  await channel.send({ embeds: [embedMVP], components: [new ActionRowBuilder().addComponents(mvpMenu)] });

  // Embed Discord
  const discordDescription = shopItemsDiscord.map(i => `**${i.name}** — 💰 ${i.price}\n${i.description}`).join("\n\n");
  const embedDiscord = new EmbedBuilder()
    .setTitle("💻 Items Discord")
    .setDescription(discordDescription)
    .setImage(DISCORD_ITEMS_BANNER_URL)
    .setColor(0x1E90FF)
    .setFooter({ text: "Selecciona un item para comprar usando el menú de abajo" });

  const discordMenu = new StringSelectMenuBuilder()
    .setCustomId("shop_menu")
    .setPlaceholder("🛒 Selecciona un item Discord")
    .addOptions(shopItemsDiscord.map(i => ({ label: i.name, description: `💰 ${i.price}`, value: i.name })));

  await channel.send({ embeds: [embedDiscord], components: [new ActionRowBuilder().addComponents(discordMenu)] });
}

/* =======================
   🤖 READY
======================= */
client.once("ready", async () => {
  console.log("🤖 Bot conectado");
  await sendShop();
  await updateTop();
});

/* =======================
   ⚙️ XP AUTOMÁTICO
======================= */
client.on("messageCreate", async msg => {
  if (!msg.author.bot) await db.add(`xp_${msg.author.id}`, 1);
});

/* =======================
   ⚙️ INTERACCIONES
======================= */
client.on("interactionCreate", async i => {
  if (i.isChatInputCommand()) {

    if (i.commandName === "coins")
      return i.reply({ content: `💰 ${await db.get(`coins_${i.user.id}`) || 0}`, ephemeral: true });

    if (i.commandName === "xp")
      return i.reply({ content: `✨ ${await db.get(`xp_${i.user.id}`) || 0}`, ephemeral: true });

    if (i.commandName === "inventory") {
      const inv = await db.get(`inv_${i.user.id}`) || [];
      return i.reply({ content: inv.join("\n") || "Vacío", ephemeral: true });
    }

    if (i.commandName === "tienda") {
      await sendShop(true);
      return i.reply({ content: "🛍️ Tienda enviada", ephemeral: true });
    }

    if (i.commandName === "modifycoins" && i.user.id === OWNER_ID) {
      const user = i.options.getUser("usuario");
      const amount = i.options.getInteger("cantidad");
      const reason = i.options.getString("razon");

      const before = await db.get(`coins_${user.id}`) || 0;
      const total = before + amount;
      await db.add(`coins_${user.id}`, amount);

      const embed = new EmbedBuilder()
        .setTitle("💰 Registro de Coins • MVP")
        .setThumbnail(user.displayAvatarURL())
        .addFields(
          { name: "Usuario", value: `<@${user.id}>` },
          { name: "Cantidad", value: `${amount > 0 ? "🟢 +" : "🔴 "}${amount}` },
          { name: "Total", value: `${total}` },
          { name: "Razón", value: reason }
        )
        .setColor(amount > 0 ? 0x2ECC71 : 0xE74C3C)
        .setFooter({ text: `Modificado por ${i.user.tag}` })
        .setTimestamp();

      const logChannel = await client.channels.fetch(LOG_COINS_CHANNEL_ID).catch(() => null);
      logChannel?.send({ embeds: [embed] });
      await updateTop();

      return i.reply({ content: "✅ Coins actualizadas", ephemeral: true });
    }
  }

  if (i.isStringSelectMenu()) {
    const item = ALL_ITEMS.find(x => x.name === i.values[0]);
    const embed = new EmbedBuilder()
      .setTitle(item.name)
      .setDescription(`${item.description}\n\n💰 Precio: ${item.price}`)
      .setImage(DISCORD_ITEMS_BANNER_URL)
      .setColor(0xFFB6C1);

    const btn = new ButtonBuilder()
      .setCustomId(`buy_${item.name}`)
      .setLabel("Comprar")
      .setStyle(ButtonStyle.Success);

    return i.update({ embeds: [embed], components: [new ActionRowBuilder().addComponents(btn)] });
  }

  if (i.isButton()) {
    const item = ALL_ITEMS.find(x => x.name === i.customId.replace("buy_", ""));
    const coins = await db.get(`coins_${i.user.id}`) || 0;
    if (coins < item.price) return i.reply({ content: "❌ Coins insuficientes", ephemeral: true });

    await db.add(`coins_${i.user.id}`, -item.price);
    await db.push(`inv_${i.user.id}`, item.name);
    await updateTop();

    const owner = await client.users.fetch(OWNER_ID);
    await owner.send(`🛒 Nueva compra\nUsuario: ${i.user.tag}\nItem: ${item.name}`);

    return i.reply({ content: `✅ Compraste **${item.name}**`, ephemeral: true });
  }
});

/* =======================
   🔑 LOGIN
======================= */
client.login(TOKEN);

