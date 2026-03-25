require('dotenv').config();
const { Client, GatewayIntentBits, Collection, REST, Routes } = require('discord.js');
const fs = require('fs');
const path = require('path');
const express = require('express');
const axios = require('axios');

// --- Setup Web Server & Keep-Alive ---
const app = express();
const PORT = process.env.PORT || 3000;

app.get('/', (req, res) => {
  res.send({ status: 'online', timestamp: new Date() });
});

// Auto-Ping (strategia di backup per Render/Glitch/Replit)
// Pinga se stesso ogni 14 minuti per evitare lo sleep
if (process.env.RENDER_EXTERNAL_URL) {
  const url = process.env.RENDER_EXTERNAL_URL;
  console.log(`⏰ Keep-Alive attivato per: ${url}`);
  
  setInterval(() => {
    axios.get(url)
      .then(() => console.log(`[Keep-Alive] Ping riuscito a ${url}`))
      .catch(err => console.error(`[Keep-Alive] Errore: ${err.message}`));
  }, 14 * 60 * 1000); // 14 minuti
}

app.listen(PORT, () => {
  console.log(`🌐 Server web in ascolto sulla porta ${PORT}`);
});
// --------------------------------------------

const client = new Client({ 
  intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages, GatewayIntentBits.MessageContent] 
});

// Carica i comandi
client.commands = new Collection();
const commandsPath = path.join(__dirname, 'commands');
const commandFiles = fs.readdirSync(commandsPath).filter(file => file.endsWith('.js'));

const commands = [];
for (const file of commandFiles) {
  const filePath = path.join(commandsPath, file);
  const command = require(filePath);
  client.commands.set(command.data.name, command);
  commands.push(command.data.toJSON());
}

// Registra gli slash command su Discord
client.once('ready', async () => {
  console.log(`✓ Bot loggato come ${client.user.tag}`);
  
  try {
    console.log('📝 Registrazione slash command...');
    const rest = new REST({ version: '10' }).setToken(process.env.DISCORD_TOKEN);
    
    await rest.put(
      Routes.applicationCommands(process.env.DISCORD_CLIENT_ID),
      { body: commands }
    );
    
    console.log('✓ Slash command registrati');
  } catch (error) {
    console.error('✗ Errore registrazione slash command:', error);
  }
});

// Gestisce gli slash command
client.on('interactionCreate', async (interaction) => {
  if (!interaction.isChatInputCommand()) return;

  const command = client.commands.get(interaction.commandName);
  if (!command) return;

  try {
    await command.execute(interaction);
  } catch (error) {
    console.error(error);
    await interaction.reply({
      content: '❌ Errore nell\'eseguire il comando!',
      ephemeral: true
    });
  }
});

client.login(process.env.DISCORD_TOKEN);
