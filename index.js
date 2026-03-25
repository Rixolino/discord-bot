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

// Auto-Ping (backup strategy for Render/Glitch/Replit)
// Pings itself every 14 minutes to prevent sleep
if (process.env.RENDER_EXTERNAL_URL) {
  const url = process.env.RENDER_EXTERNAL_URL;
  console.log(`⏰ Keep-Alive activated for: ${url}`);
  
  setInterval(() => {
    axios.get(url)
      .then(() => console.log(`[Keep-Alive] Ping successful to ${url}`))
      .catch(err => console.error(`[Keep-Alive] Error: ${err.message}`));
  }, 14 * 60 * 1000); // 14 minutes
}

app.listen(PORT, () => {
  console.log(`🌐 Web server listening on port ${PORT}`);
});
// --------------------------------------------

const client = new Client({ 
  intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages, GatewayIntentBits.MessageContent] 
});

// Load commands
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

// Register slash commands to Discord
client.once('ready', async () => {
  console.log(`✓ Bot logged in as ${client.user.tag}`);
  
  try {
    console.log('📝 Registering slash commands...');
    const rest = new REST({ version: '10' }).setToken(process.env.DISCORD_TOKEN);
    
    await rest.put(
      Routes.applicationCommands(process.env.DISCORD_CLIENT_ID),
      { body: commands }
    );
    
    console.log('✓ Slash commands registered');
  } catch (error) {
    console.error('✗ Error registering slash commands:', error);
  }
});

// Handles slash commands
client.on('interactionCreate', async (interaction) => {
  if (!interaction.isChatInputCommand()) return;

  const command = client.commands.get(interaction.commandName);
  if (!command) return;

  try {
    await command.execute(interaction);
  } catch (error) {
    console.error(error);
    if (interaction.replied || interaction.deferred) {
      await interaction.followUp({ content: '❌ Error executing command!', ephemeral: true });
    } else {
      await interaction.reply({ content: '❌ Error executing command!', ephemeral: true });
    }
  }
});

// Global error handling
process.on('unhandledRejection', error => {
  console.error('Unhandled promise rejection:', error);
});

client.login(process.env.DISCORD_TOKEN).catch(error => {
  console.error('LOGIN ERROR:', error.message);
  if (error.code === 'DisallowedIntents') {
    console.error('>>> WARNING: You must enable "Message Content Intent" in the Developer Portal!');
  }
  if (error.code === 'TokenInvalid') {
    console.error('>>> WARNING: The token is invalid (maybe you copied the Public Key?)');
  }
});
