require('dotenv').config();
const { Client, GatewayIntentBits, Collection, REST, Routes } = require('discord.js');
const fs = require('fs');
const path = require('path');
const express = require('express');
const axios = require('axios');

// --- Setup Web Server & Keep-Alive ---
const app = express();
const PORT = process.env.PORT || Math.floor(Math.random() * (10000 - 8000 + 1)) + 8000;

app.get('/', (req, res) => {
  res.send({ status: 'online', timestamp: new Date() });
});

// Se presente in .env, questo lo configura come worker classico (scelta per render/vps)
// Rimosso il supporto HTTP Interaction di Vercel, non è idoneo per carichi lunghi
if (false) {
  // Use HTTP interactions on Vercel
  const { verifyKeyMiddleware, InteractionType, InteractionResponseType } = require('discord-interactions');

  app.post('/interactions', verifyKeyMiddleware(process.env.DISCORD_PUBLIC_KEY), async (req, res) => {
    const { type, id, data, token, member } = req.body;
    
    if (type === InteractionType.PING) {
      return res.send({ type: InteractionResponseType.PONG });
    }

    if (type === InteractionType.APPLICATION_COMMAND) {
      const command = client.commands.get(data.name);
      if (!command) return res.status(404).end();
      
      // Defer automatically for long running commands (like ours)
      res.send({ type: InteractionResponseType.DEFERRED_CHANNEL_MESSAGE_WITH_SOURCE });

      // Mock interaction object for compatibility
      const mockInteraction = {
        options: {
          getString: (name) => data.options?.find(o => o.name === name)?.value,
          getBoolean: (name) => data.options?.find(o => o.name === name)?.value,
        },
        user: member.user,
        deferReply: async () => {}, // Already deferred via response
        editReply: async (payload) => {
          if (typeof payload === 'string') payload = { content: payload };
          
          if (payload.embeds) payload.embeds = payload.embeds.map(e => e.toJSON ? e.toJSON() : e);
          if (payload.components) payload.components = payload.components.map(c => c.toJSON ? c.toJSON() : c);
          
          const sendPatch = async (retries = 5) => {
            try {
              console.log(`[Webhook] Sending patch to app ${process.env.DISCORD_CLIENT_ID}, token ${token.substring(0, 10)}... (payload length: ${JSON.stringify(payload).length})`);
              const res = await axios.patch(
                `https://discord.com/api/v10/webhooks/${process.env.DISCORD_CLIENT_ID}/${token}/messages/@original`,
                payload
              );
              console.log(`[Webhook] Patch success! Status: ${res.status}`);
            } catch(e) { 
              if (e.response?.data?.code === 10008 && retries > 0) {
                console.log(`[Webhook] 10008 Unknown Message - retrying in 2s (retries left: ${retries - 1})...`);
                await new Promise(r => setTimeout(r, 2000));
                return sendPatch(retries - 1);
              }
              console.error('Webhook Error Details:', e.response?.data || e.message); 
            }
          };
          
          await sendPatch();
          
          // Return a mock message object for component collectors (not fully supported in serverless without DB)
          return { 
             createMessageComponentCollector: () => ({ on: () => {} }) // Stub: collectors don't work well on serverless
          };
        }
      };

      try {
        await command.execute(mockInteraction);
      } catch (error) {
        console.error(error);
      }
    }
  });
} 

// Auto-Ping (backup strategy for Render/Glitch/Replit)
// Pings itself every 14 minutes to prevent sleep
if (process.env.RENDER_EXTERNAL_URL) {
  const url = process.env.RENDER_EXTERNAL_URL;
  console.log(`⏰ Keep-Alive activated for: ${url}`);
  
  setInterval(() => {
    // Add / to the end of the URL if it doesn't have it to avoid redirect issues
    const targetUrl = url.endsWith('/') ? url : `${url}/`;
    axios.get(targetUrl)
      .then(() => console.log(`[Keep-Alive] Ping successful to ${targetUrl}`))
      .catch(err => console.error(`[Keep-Alive] Error: ${err.message}`));
  }, 14 * 60 * 1000); // 14 minutes
}

// Initialize client first, BEFORE app.listen
const client = new Client({ 
  intents: [
    GatewayIntentBits.Guilds, 
    GatewayIntentBits.GuildMessages, 
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.GuildIntegrations
  ],
  ws: {
    helloTimeout: 120000, 
    readyTimeout: 15000 
  }
});

// Ascolta attivamente per ogni piccolo log di debug del WebSocket per capire dove si blocca
client.on('debug', msg => console.log(`[WSS DEBUG] ${msg}`));


// Load commands (sync)
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

client.once('ready', async () => {
  console.log(`✓ Bot logged in as ${client.user.tag}`);
  // ... rest of ready event ...
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

  console.log(`[Interaction] Received command /${interaction.commandName} from ${interaction.user.tag}`);

  try {
    await command.execute(interaction);
    console.log(`[Interaction] Command /${interaction.commandName} executed successfully!`);
  } catch (error) {
    console.error(`[Interaction] Error executing /${interaction.commandName}:`, error.message || error);
    
    // Use flags: 64 instead of ephemeral: true to fix the deprecation warning
    const payload = { content: '❌ Si è verificato un errore durante l\'esecuzione del comando (il bot potrebbe aver impiegato troppo tempo). Riprova!', flags: 64 };
    
    try {
      if (interaction.replied || interaction.deferred) {
        await interaction.followUp(payload);
      } else {
        await interaction.reply(payload);
      }
    } catch (fallbackError) {
      if (fallbackError.code === 40060) {
         // Discord dice che è già stata data una risposta, proviamo il followUp come piano B
         await interaction.followUp(payload).catch(e => console.error('[Fallback] Errore critico finale:', e.message));
      } else {
         console.error('[Fallback] Impossibile avvisare l\'utente:', fallbackError.message);
      }
    }
  }
});

// Start express server only for Render's port binding requirement
app.listen(PORT, '0.0.0.0', () => {
  console.log(`🌐 Web server listening on port ${PORT}`);
});

// Login to Discord IMMEDIATELY
console.log('🔄 Attempting to login to Discord...');
console.log('TOKEN STATUS:', !!process.env.DISCORD_TOKEN);
if (!process.env.DISCORD_TOKEN) {
  console.error('❌ FATAL ERROR: DISCORD_TOKEN is missing! Please set it in Render Environment Variables!');
  process.exit(1); 
} else {
  client.login(process.env.DISCORD_TOKEN).then(() => {
    console.log('✅ Discord login sequence initiated successfully.');
  }).catch(err => {
    console.error('❌ FATAL LOGIN ERROR:', err);
    process.exit(1);
  });
}

