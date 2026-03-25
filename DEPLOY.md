# Guida al Deployment Gratuito 🚀

Poiché Heroku non ha più un piano gratuito, ecco le migliori alternative moderne per ospitare il tuo bot Discord a costo zero.

---

## Opzione 1: Render (Consigliato) ☁️

Render offre un piano "Web Service" gratuito che supporta Node.js.
**Nota:** Il piano gratuito va in pausa dopo 15 minuti di inattività. Il bot si "sveglierà" quando qualcuno visiterà l'URL pubblico (o userai un servizio di monitoraggio), ma potrebbe impiegare 30 secondi.

### Passaggi:

1. Crea un account su [render.com](https://render.com) (puoi usare GitHub).
2. Carica questo codice su un repository **GitHub** (pubblico o privato).
3. Nella dashboard di Render, clicca **New +** -> **Web Service**.
4. Connetti il tuo repository GitHub.
5. Usa queste impostazioni:
   - **Name:** (quello che vuoi, es: `betacloud-bot`)
   - **Region:** Frankfurt (o la più vicina)
   - **Branch:** `main`
   - **Runtime:** `Node`
   - **Build Command:** `npm install`
   - **Start Command:** `npm start`
   - **Instance Type:** Free

6. Scorri in basso e clicca su **Advanced**.
7. Aggiungi le **Environment Variables** (copiale dal tuo `.env`):
   - `DISCORD_TOKEN`: (il tuo token)
   - `DISCORD_CLIENT_ID`: (il tuo ID applicazione)
   - `API_BASE_URL`: `https://betacloud.is-cool.dev` (o il tuo URL)
   - `PORT`: `10000` (opzionale, ma consigliato)

8. Clicca **Create Web Service**.

Il deploy inizierà. Una volta finito, il tuo bot sarà online!

---

## Opzione 2: Glitch (Più Semplice) 🎏

Ottimo per test veloci, ma ha limiti di ore di attività mensili.

1. Vai su [glitch.com](https://glitch.com).
2. Clicca **New Project** -> **Import from GitHub**.
3. Incolla l'URL del tuo repository.
4. Nel file `.env` di Glitch, inserisci le tue variabili (è sicuro).
5. Il bot si avvierà automaticamente.

---

## Opzione 3: Self-Hosting (Il tuo PC) 💻

Se hai un PC che lasci spesso acceso o un vecchio laptop/Raspberry Pi.

1. Installa [Node.js](https://nodejs.org).
2. Apri il terminale nella cartella del bot.
3. Installa le dipendenze: `npm install`.
4. Avvia il bot: `npm start`.

Per tenerlo attivo anche se chiudi il terminale, usa **PM2**:
```bash
npm install -g pm2
pm2 start index.js --name "bot-discord"
pm2 save
```

---

## Opzione 4: Oracle Cloud (Avanzato - Always Free) 🛡️

Se hai una carta di credito (non ti addebiteranno nulla, serve per verifica identità), Oracle offre un server VPS (VM) **Always Free** molto potente (4 core ARM, 24GB RAM). È la migliore opzione "vera" ma richiede configurazione Linux manuale.

1. Registrati a Oracle Cloud Free Tier.
2. Crea una VM "Ampere" (ARM).
3. Connettiti via SSH.
4. Installa Node.js e Git.
5. Clona il repo e usa PM2 (come nell'Opzione 3).
