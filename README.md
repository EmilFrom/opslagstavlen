# Opslagstavlen

En mobilvenlig PWA-klient til [Planka](https://github.com/plankanban/planka), bygget til mor.

## Udvikling

```bash
npm install
npm run dev
```

Åbn [http://localhost:3000](http://localhost:3000).

## Byg & kør med Docker lokalt

```bash
docker build -t opslagstavlen .
docker run -p 3000:3000 -e PLANKA_BASE_URL=https://tavlen.emilfrom.com opslagstavlen
```

---

## Deploy på TrueNAS Scale

### Trin 1: GitHub Container Registry (GHCR)

På hver push til `main` bygger GitHub Actions automatisk et Docker-image og push'er det til GHCR.

Når du har pushet til GitHub første gang, skal du gøre pakken offentlig:
1. Gå til **github.com/brugernavn/opslagstavlen/packages**
2. Klik på pakken **opslagstavlen**
3. Klik **Package settings** (i bunden af siden)
4. Under **Manage access** sæt **Package visibility** til **Public**

### Trin 2: Opret Custom App i TrueNAS Scale

1. Gå til **Apps → Discover → Custom App**
2. Fyld felterne ud:

| Felt | Værdi |
|---|---|
| **Application Name** | `opslagstavlen` |
| **Image Repository** | `ghcr.io/emilfrom/opslagstavlen` |
| **Image Tag** | `main` |
| **Image Pull Policy** | `Pull always` |
| **Container Port** | `3000` |
| **Node Port** | `3000` (eller en anden fri port) |

3. Scroll ned til **Environmental Variables** og tilføj:
   - **Name:** `PLANKA_BASE_URL`
   - **Value:** `https://tavlen.emilfrom.com`

4. Klik **Save** — appen starter automatisk.

### Trin 3: Cloudflare Tunnel

Da du allerede har en tunnel kørende for Planka, tilføj blot et nyt hostname i Cloudflare Zero Trust Dashboard:

- **Public hostname:** `opslagstavlen.emilfrom.com`
- **Service:** `http://DIN_TRUENAS_IP:3000`

...eller via CLI:
```bash
cloudflared tunnel route dns DIN_TUNNEL_ID opslagstavlen.emilfrom.com
```

---

## Opdatering

Hver gang du pusher til `main`, bygger GitHub Actions et nyt image automatisk. For at opdatere på TrueNAS:

1. Gå til **Apps → Installed Applications → opslagstavlen**
2. Klik **Edit** (blyanten)
3. Skift **Image Pull Policy** midlertidigt til **Pull always** (hvis ikke allerede)
4. Klik **Save** — TrueNAS henter det nyeste `main`-image

---

## Mor: Sådan installerer du på din iPhone/iPad

1. Åbn **Safari** og gå til `https://opslagstavlen.emilfrom.com`
2. Log ind med dit brugernavn og adgangskode
3. Tryk på **Del**-knappen (firkanten med pil op)
4. Scroll ned og tryk **"Tilføj til hjemmeskærm"**
5. Nu ligger Opslagstavlen som en app på din hjemmeskærm — tryk på den for at åbne
