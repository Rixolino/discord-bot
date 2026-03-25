# Discord Bot - BetaCloud API

Bot Discord per cercare informazioni sui build Windows utilizzando l'API BetaCloud.

## Installazione

### 1. Prerequisiti
- Node.js 16.9.0 o superiore
- Discord bot token da [Discord Developer Portal](https://discord.com/developers/applications)
- Client ID del bot

### 2. Setup Locale

```bash
# Clona o scarica il progetto
cd discord-bot

# Installa dipendenze
npm install

# Copia il file di configurazione e modifica i valori
cp .env.example .env
```

### 3. Configurazione .env

Modifica il file `.env`:

```
DISCORD_TOKEN=your_bot_token_here
DISCORD_CLIENT_ID=your_client_id_here
API_BASE_URL=https://betacloud.is-cool.dev
```

### 4. Esecuzione Locale

**Con nodemon (auto-reload su modifiche)**:
```bash
npm run dev
```

**Esecuzione normale**:
```bash
npm start
```

## Comandi Discord

### `/build numero [all-os]`
Cerca informazioni su un build Windows specifico.

**Parametri:**
- `numero` (obbligatorio): Numero build (es: 22621, 4.10.1526)
- `all-os` (facoltativo): Se "Sì", cerca in TUTTI gli OS (default: No)

**Esempi:**
```
/build numero:22621
/build numero:22621 all-os:Sì
/build numero:4.10.1526
```

### `/latest [windows]`
Mostra i build Windows più recenti.

**Parametri:**
- `windows` (facoltativo): Seleziona la versione (default: Windows 11)
  - Windows 11
  - Windows 10
  - Windows Server 2025
  - Windows Server 2022

**Esempi:**
```
/latest
/latest windows:Windows 10
/latest windows:Windows Server 2022
```

## Deployment Remoto

### Deploy su Heroku

1. **Crea account Heroku** e installa Heroku CLI

2. **Login a Heroku**:
```bash
heroku login
```

3. **Crea app**:
```bash
heroku create your-bot-name
```

4. **Configura variabili d'ambiente**:
```bash
heroku config:set DISCORD_TOKEN="your_token"
heroku config:set DISCORD_CLIENT_ID="your_client_id"
heroku config:set API_BASE_URL="https://betacloud.is-cool.dev"
```

5. **Deploy**:
```bash
git push heroku main
# oppure
git push heroku master
```

6. **Visualizza log**:
```bash
heroku logs --tail
```

### Deploy su VPS (Ubuntu/Debian)

1. **SSH nel server**:
```bash
ssh user@your_server_ip
```

2. **Installa Node.js**:
```bash
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs
```

3. **Clona il repository**:
```bash
git clone your_repo_url
cd discord-bot
npm install
```

4. **Crea .env file**:
```bash
nano .env
# Incolla le variabili di configurazione
```

5. **Installa PM2** (process manager):
```bash
sudo npm install -g pm2
```

6. **Avvia il bot con PM2**:
```bash
pm2 start index.js --name "betacloud-bot"
pm2 save
pm2 startup
```

7. **Visualizza log**:
```bash
pm2 logs betacloud-bot
```

## Registrazione Bot su Discord

1. Vai a [Discord Developer Portal](https://discord.com/developers/applications)
2. Clicca "New Application"
3. Assegna un nome (es: "BetaCloud Bot")
4. Vai su "Bot" → "Add Bot"
5. Attiva **Message Content Intent** (importante!)
6. Copia il token e mettilo nel `.env`
7. Vai su "OAuth2" → "URL Generator"
8. Seleziona scope: `bot` e `applications.commands`
9. Seleziona permessi: `Send Messages`, `Read Messages`
10. Copia l'URL generato e aprilo per invitare il bot al server

## Troubleshooting

### Bot non risponde ai comandi
- Verifica che il token sia corretto in `.env`
- Assicurati che **Message Content Intent** sia attivato
- Riavvia il bot: `pm2 restart betacloud-bot`

### Errore API
- Controlla che `API_BASE_URL` in `.env` sia corretto
- Verifica la connessione internet con: `curl https://betacloud.is-cool.dev/api/public/build-info?build=22621`

### Build a 0 risultati
- Prova con `all-os:Sì` per cercare in tutti gli OS
- Verifica che il numero build sia valido

## Struttura File

```
discord-bot/
├── index.js              # Entry point del bot
├── package.json          # Dipendenze
├── .env                  # Configurazione (non commitare)
├── .env.example          # Template .env
└── commands/
    ├── build.js          # Comando /build
    └── latest.js         # Comando /latest
```

## Sviluppo

Per aggiungere nuovi comandi:

1. Crea file in `commands/nomefile.js`
2. Usa il template:
```javascript
const { SlashCommandBuilder } = require('discord.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('nomecomando')
    .setDescription('Descrizione'),
  
  async execute(interaction) {
    // Codice del comando
  }
};
```

3. Il bot caricherà automaticamente il comando

## Support

Problemi? Controlla il file dei log o apri una issue nel repository.
