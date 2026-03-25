# Discord Bot - BetaCloud API

Discord bot for searching Windows build information using the BetaCloud API.

## Installation

### 1. Requirements
- Node.js 16.9.0 or higher
- Discord bot token from [Discord Developer Portal](https://discord.com/developers/applications)
- Bot Client ID

### 2. Local Setup

```bash
# Clone or download the project
cd discord-bot

# Install dependencies
npm install

# Copy the configuration file and modify the values
cp .env.example .env
```

### 3. Configure .env

Edit the `.env` file:

```
DISCORD_TOKEN=your_bot_token_here
DISCORD_CLIENT_ID=your_client_id_here
API_BASE_URL=https://betacloud.is-cool.dev
```

### 4. Local Execution

**With nodemon (auto-reload on changes)**:
```bash
npm run dev
```

**Normal execution**:
```bash
npm start
```

## Discord Commands

### `/build numero [all-os]`
Search information on a specific Windows build.

**Parameters:**
- `numero` (required): Build number (e.g.: 22621, 4.10.1526)
- `all-os` (optional): If "Yes", search in ALL OS (default: No)

**Examples:**
```
/build numero:22621
/build numero:22621 all-os:Yes
/build numero:4.10.1526
```

### `/latest [windows]`
Show the most recent Windows builds.

**Parameters:**
- `windows` (optional): Select version (default: Windows 11)
  - Windows 11
  - Windows 10
  - Windows Server 2025
  - Windows Server 2022

**Examples:**
```
/latest
/latest windows:Windows 10
/latest windows:Windows Server 2022
```

## Remote Deployment

### Deploy to Heroku

1. **Create Heroku account** and install Heroku CLI

2. **Login to Heroku**:
```bash
heroku login
```

3. **Create app**:
```bash
heroku create your-bot-name
```

4. **Configure environment variables**:
```bash
heroku config:set DISCORD_TOKEN="your_token"
heroku config:set DISCORD_CLIENT_ID="your_client_id"
heroku config:set API_BASE_URL="https://betacloud.is-cool.dev"
```

5. **Deploy**:
```bash
git push heroku main
# or
git push heroku master
```

6. **View logs**:
```bash
heroku logs --tail
```

### Deploy to VPS (Ubuntu/Debian)

1. **SSH into server**:
```bash
ssh user@your_server_ip
```

2. **Install Node.js**:
```bash
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs
```

3. **Clone the repository**:
```bash
git clone your_repo_url
cd discord-bot
npm install
```

4. **Create .env file**:
```bash
nano .env
# Paste configuration variables
```

5. **Install PM2** (process manager):
```bash
sudo npm install -g pm2
```

6. **Start bot with PM2**:
```bash
pm2 start index.js --name "betacloud-bot"
pm2 save
pm2 startup
```

7. **View logs**:
```bash
pm2 logs betacloud-bot
```

## Register Bot on Discord

1. Go to [Discord Developer Portal](https://discord.com/developers/applications)
2. Click "New Application"
3. Assign a name (e.g.: "BetaCloud Bot")
4. Go to "Bot" → "Add Bot"
5. Enable **Message Content Intent** (important!)
6. Copy the token and put it in `.env`
7. Go to "OAuth2" → "URL Generator"
8. Select scope: `bot` and `applications.commands`
9. Select permissions: `Send Messages`, `Read Messages`
10. Copy the generated URL and open it to invite the bot to your server

## Troubleshooting

### Bot doesn't respond to commands
- Verify that the token in `.env` is correct
- Make sure **Message Content Intent** is enabled
- Restart the bot: `pm2 restart betacloud-bot`

### API Error
- Check that `API_BASE_URL` in `.env` is correct
- Verify internet connection with: `curl https://betacloud.is-cool.dev/api/public/build-info?build=22621`

### Build returns 0 results
- Try with `all-os:Yes` to search in all OS
- Verify that the build number is valid

## File Structure

```
discord-bot/
├── index.js              # Bot entry point
├── package.json          # Dependencies
├── .env                  # Configuration (don't commit)
├── .env.example          # .env template
└── commands/
    ├── build.js          # /build command
    └── latest.js         # /latest command
```

## Development

To add new commands:

1. Create file in `commands/filename.js`
2. Use the template:
```javascript
const { SlashCommandBuilder } = require('discord.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('commandname')
    .setDescription('Description'),
  
  async execute(interaction) {
    // Command code
  }
};
```

3. The bot will automatically load the command

## Support

Having issues? Check the log file or open an issue in the repository.
