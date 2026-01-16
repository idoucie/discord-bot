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
  { name: "Boosters", price: 120, description: "Mejora el servidor con la templanza de un héroe. La opción no es válida si es un ente errante." },
  { name: "Silenciamiento a un miembro", price: 100, description: "Silenciamiento por una hora. No aplicable a miembros del Staff." },
  { name: "Rol personalizado", price: 80, description: "Canjea un rol personalizado para tu perfil. No incluye color." },
  { name: "Icono para tu rol personalizado", price: 60, description: "Adorna tu rol personalizado con un icono. Debes tener un rol personalizado." },
  { name: "Añadir color al rol personalizado", price: 50, description: "Desbloquea la opción de añadir color a tu rol personalizado. Debes tener un rol personalizado." },
  { name: "Añadir un sticker", price: 40, description: "Añade cualquier sticker al servidor." },
  { name: "Añadir un emoji", price: 30, description: "Añade cualquier emoji al servidor." }
];

/* =======================
   📜 COMANDOS
======================= */
const commands = [
  new SlashCommandBuilder().setName("coins").setDescription("Ver tus coins"),
  new SlashCommandBuilder().setName("xp").setDescription("Ver tu XP"),
  new SlashCommandBuilder().setName("inventory").setDescription("Ver inventario"),
  new SlashCommandBuilder().setName("tienda").setDescription("Ver normas oficiales de la tienda MVP"),
  new SlashCommandBuilder().setName("buy").setDescription("Comprar item")
    .addStringOption(o => o.setName("item").setDescription("Nombre exacto del item").setRequired(true)),
  new SlashCommandBuilder().setName("modifycoins").setDescription("Sumar o quitar coins (OWNER)")
    .addUserOption(u => u.setName("usuario").setDescription("Usuario").setRequired(true))
    .addIntegerOption(n => n.setName("cantidad").setDescription("Cantidad").setRequired(true))
    .addStringOption(r => r.setName("razon").setDescription("Motivo").setRequired(true)),
  new SlashCommandBuilder().setName("givexp").setDescription("Dar XP a un usuario (OWNER)")
    .addUserOption(u => u.setName("usuario").setDescription("Usuario que recibirá XP").setRequired(true))
    .addIntegerOption(n => n.setName("cantidad").setDescription("Cantidad de XP").setRequired(true)),
  new SlashCommandBuilder().setName("topcoins").setDescription("Ver top 10 de coins"),
  new SlashCommandBuilder().setName("banner").setDescription("Enviar banner de la tienda (OWNER)")
].map(c => c.toJSON());

/* =======================
   🚀 REGISTRAR COMANDOS
======================= */
const rest = new REST({ version: "10" }).setToken(TOKEN);
(async () => {
  await rest.put(Routes.applicationGuildCommands(CLIENT_ID, GUILD_ID), { body: commands });
  console.log("✅ Comandos registrados");
})();

/* =======================
   🔝 FUNCIONES AUXILIARES
======================= */
async function getTopUsers(limit = 10) {
  const allData = await db.all();
  const users = [];
  for (const item of allData) {
    if (item.id.startsWith("coins_")) {
      const userId = item.id.split("_")[1];
      users.push({ userId, coins: item.value });
    }
  }
  users.sort((a, b) => b.coins - a.coins);
  return users.slice(0, limit);
}

async function sendTopEmbed() {
  const topUsers = await getTopUsers(10);
  const channel = client.channels.cache.get(TOP_CHANNEL_ID);
  if (!channel) return;

  const description = topUsers
    .map((u, i) => `**${i + 1}.** <@${u.userId}> — 💰 ${u.coins} coins`)
    .join("\n") || "No hay usuarios aún.";

  const embed = new EmbedBuilder()
    .setTitle("🏆 Top Coins • MVP")
    .setDescription(description)
    .setColor(0xFFD700)
    .setFooter({ text: "Actualizado automáticamente al iniciar el bot" })
    .setTimestamp();

  // Solo se envía un mensaje único
  const msgId = await db.get("top_msg_id");
  let msg;
  if (msgId) {
    try { msg = await channel.messages.fetch(msgId); } catch { msg = null; }
  }

  if (msg) {
    await msg.edit({ embeds: [embed] });
  } else {
    const sentMsg = await channel.send({ embeds: [embed] });
    await db.set("top_msg_id", sentMsg.id);
  }
}

/* =======================
   🔝 ENVÍO DE TIENDA (MENSAJE ÚNICO)
======================= */
async function sendShopOnce() {
  const channel = client.channels.cache.get(SHOP_CHANNEL_ID);
  if (!channel) return;

  async function sendCategory(title, items, bannerFile, dbKey) {
    const embed = new EmbedBuilder()
      .setTitle(title)
      .setDescription(items.map(item => `**Ítem:** ${item.name}\n${item.description}\n**Precio:** ${item.price} 💰`).join("\n\n"))
      .setColor(0xF39C12)
      .setImage(`attachment://${bannerFile}`)
      .setFooter({ text: "MVP • Tienda Oficial" })
      .setTimestamp();

    const selectMenu = new StringSelectMenuBuilder()
      .setCustomId(`shop_select_${title.replace(/\s/g,"_")}`)
      .setPlaceholder("Selecciona un ítem para ver más detalles o comprarlo")
      .addOptions(items.map(item => ({
        label: item.name,
        description: `Precio: ${item.price} 💰`,
        value: `${title}|${item.name}`
      })));

    const row = new ActionRowBuilder().addComponents(selectMenu);

    const msgId = await db.get(dbKey);
    let msg;
    if (msgId) {
      try { msg = await channel.messages.fetch(msgId); } catch { msg = null; }
    }

    if (msg) {
      // Solo editar si ya existe
      await msg.edit({
        embeds: [embed],
        components: [row],
        files: [{ attachment: `./${bannerFile}`, name: bannerFile }]
      });
    } else {
      // Crear mensaje solo si no existe
      const sentMsg = await channel.send({
        embeds: [embed],
        components: [row],
        files: [{ attachment: `./${bannerFile}`, name: bannerFile }]
      });
      await db.set(dbKey, sentMsg.id);
    }
  }

  await sendCategory("🛍️ Tienda Oficial MVP", shopItemsMVP, "banner-tienda.jpg", "shop_msg_mvp");
  await sendCategory("🎮 Items de Discord", shopItemsDiscord, "banner-discord.jpg", "shop_msg_discord");
}

/* =======================
   🤖 READY
======================= */
client.on("ready", async () => {
  console.log("🤖 Bot conectado");

  // Actualizar top y tienda una sola vez al iniciar
  await sendTopEmbed().catch(console.error);
  await sendShopOnce().catch(console.error);
});

/* =======================
   ⚙️ INTERACCIONES
======================= */
client.on("interactionCreate", async i => {
  if (!i.isChatInputCommand() && !i.isStringSelectMenu() && !i.isButton()) return;

  try {
    // --- COINS ---
    if (i.isChatInputCommand() && i.commandName === "coins") {
      const coins = (await db.get(`coins_${i.user.id}`)) || 0;
      return i.reply({ content: `🪙 Tienes **${coins} coins**`, ephemeral: true });
    }

    // --- XP ---
    if (i.isChatInputCommand() && i.commandName === "xp") {
      const xp = (await db.get(`xp_${i.user.id}`)) || 0;
      return i.reply({ content: `✨ Tienes **${xp} XP**`, ephemeral: true });
    }

    // --- DAR XP (OWNER) ---
    if (i.isChatInputCommand() && i.commandName === "givexp") {
      if (i.user.id !== OWNER_ID) return i.reply({ content: "❌ Solo el OWNER puede dar XP", ephemeral: true });

      const user = i.options.getUser("usuario");
      const amount = i.options.getInteger("cantidad");
      const current = (await db.get(`xp_${user.id}`)) || 0;
      const total = current + amount;
      await db.set(`xp_${user.id}`, total);

      const embed = new EmbedBuilder()
        .setTitle("✨ XP Otorgado")
        .setColor(0x00FF00)
        .setThumbnail(user.displayAvatarURL({ dynamic: true }))
        .addFields(
          { name: "👤 Usuario", value: `<@${user.id}>`, inline: true },
          { name: "✨ Cantidad", value: `+${amount} XP`, inline: true },
          { name: "🏆 Total actual", value: `${total} XP`, inline: true }
        )
        .setFooter({ text: `Otorgado por ${i.user.tag}` })
        .setTimestamp();

      return i.reply({ embeds: [embed], ephemeral: true });
    }

    // --- TIENDA ---
    if (i.isChatInputCommand() && i.commandName === "tienda") {
      await sendShopOnce();
      return i.reply({ content: "✅ Tienda enviada correctamente", ephemeral: true });
    }

    // --- SELECCIÓN DE ITEM ---
    if (i.isStringSelectMenu() && i.customId.startsWith("shop_select_")) {
      const [category, itemName] = i.values[0].split("|");
      const items = category.includes("MVP") ? shopItemsMVP : shopItemsDiscord;
      const item = items.find(x => x.name === itemName);
      if (!item) return i.reply({ content: "❌ Item no encontrado", ephemeral: true });

      const embed = new EmbedBuilder()
        .setTitle(`🛒 ${item.name}`)
        .setDescription(item.description)
        .addFields({ name: "💰 Precio", value: `${item.price} 💰`, inline: true })
        .setColor(0xF39C12)
        .setFooter({ text: "Haz clic en el botón para comprar" })
        .setTimestamp();

      const button = new ButtonBuilder()
        .setCustomId(`buy_${category}|${item.name}`)
        .setLabel("Comprar")
        .setStyle(ButtonStyle.Success);

      const row = new ActionRowBuilder().addComponents(button);
      await i.update({ embeds: [embed], components: [row] });
    }

    // --- BOTÓN DE COMPRA ---
    if (i.isButton() && i.customId.startsWith("buy_")) {
      await i.deferReply({ ephemeral: true });

      const [category, itemName] = i.customId.replace("buy_","").split("|");
      const items = category.includes("MVP") ? shopItemsMVP : shopItemsDiscord;
      const item = items.find(x => x.name === itemName);
      if (!item) return i.editReply({ content: "❌ Item no encontrado" });

      const coins = (await db.get(`coins_${i.user.id}`)) || 0;
      if (coins < item.price) return i.editReply({ content: "❌ No tienes coins suficientes" });

      await db.set(`coins_${i.user.id}`, coins - item.price);
      await sendTopEmbed();

      const dmEmbed = new EmbedBuilder()
        .setTitle(`🛒 Compra realizada: ${item.name}`)
        .setDescription(`**Usuario:** ${i.user.tag}\nHas comprado **${item.name}** por **${item.price} 💰**`)
        .setColor(0x2ecc71)
        .setTimestamp()
        .setFooter({ text: "MVP • Tienda Oficial" });

      try { await i.user.send({ embeds: [dmEmbed] }); } catch {}
      try { 
        const owner = await client.users.fetch(OWNER_ID);
        await owner.send({ embeds: [dmEmbed] });
      } catch {}

      return i.editReply({ content: `✅ Compra registrada correctamente. Revisa tu DM para los detalles.` });
    }

    // --- TOP COINS (manual) ---
    if (i.isChatInputCommand() && i.commandName === "topcoins") {
      await sendTopEmbed();
      return i.reply({ content: "✅ Top coins actualizado", ephemeral: true });
    }

    // --- OWNER – MODIFICAR COINS ---
    if (i.isChatInputCommand() && i.commandName === "modifycoins") {
      if (i.user.id !== OWNER_ID) return i.reply({ content: "❌ Sin permiso", ephemeral: true });

      const user = i.options.getUser("usuario");
      const amount = i.options.getInteger("cantidad");
      const reason = i.options.getString("razon");
      const current = (await db.get(`coins_${user.id}`)) || 0;
      const total = current + amount;
      await db.set(`coins_${user.id}`, total);

      const color = amount >= 0 ? 0x2ecc71 : 0xe74c3c;

      const embed = new EmbedBuilder()
        .setTitle("💰 Transacción de Coins")
        .setColor(color)
        .setThumbnail(user.displayAvatarURL({ dynamic: true }))
        .addFields(
          { name: "👤 Usuario", value: `<@${user.id}>`, inline: true },
          { name: "💰 Cantidad", value: `${amount >= 0 ? `+${amount}` : amount} coins`, inline: true },
          { name: "🧮 Total actual", value: `${total} coins`, inline: true },
          { name: "📌 Razón", value: reason, inline: false }
        )
        .setFooter({ text: `Modificado por ${i.user.tag}` })
        .setTimestamp()
        .setAuthor({ name: "Registro de Coins • MVP", iconURL: client.user.displayAvatarURL() });

      const coinsChannel = client.channels.cache.get(COINS_CHANNEL_ID);
      if (coinsChannel) await coinsChannel.send({ embeds: [embed] });

      await sendTopEmbed();
      return i.reply({ content: "✅ Coins modificadas correctamente.", ephemeral: true });
    }

  } catch (err) {
    console.error("Error en interactionCreate:", err);
  }
});

/* =======================
   🔑 LOGIN
======================= */
client.login(TOKEN);


