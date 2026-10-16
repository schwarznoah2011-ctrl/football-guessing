# Football Guessing – Website mit Spielserver

Das Fußball-Rateduell für zwei Spieler: Online auf zwei Geräten oder lokal auf einem Gerät.
Der Server hat keine Abhängigkeiten (nur Node.js ab Version 18) und liefert Website und Spielräume aus.

## Inhalt
- `server.js` – Website + Spielserver (Räume, Live-Updates)
- `public/` – die Website (`index.html`, Favicon, Manifest)
- `render.yaml` – Vorlage für Render.com
- `package.json` – Startbefehl `npm start`

## Lokal testen
```
node server.js
```
Dann `http://localhost:3000` öffnen. Ein zweites Gerät im selben WLAN öffnet `http://<IP-deines-Rechners>:3000`.

## Kostenlos ins Internet (mit Link für deinen Freund)
**Render.com (empfohlen)**
1. Lege einen kostenlosen Account bei github.com und render.com an.
2. Lade diesen Ordner als neues GitHub-Repository hoch.
3. Render: *New → Web Service* → Repository wählen. Die `render.yaml` stellt alles ein.
4. Nach ca. 2 Minuten bekommst du eine Adresse wie `https://football-guessing.onrender.com`. Diese schickst du deinem Freund. Er braucht keinen Account.

**Alternativen:** Railway, Fly.io oder jeder Node-Hoster (Startbefehl `node server.js`, Port aus der Umgebungsvariable `PORT`).

**Eigene Domain:** In den Render-Einstellungen unter *Custom Domains* eine Domain eintragen, die du bei einem Anbieter (z. B. INWX, IONOS, Namecheap) gekauft hast.

## Gut zu wissen
- Der kostenlose Render-Tarif schläft nach einiger Zeit ein. Der erste Aufruf dauert dann etwa 30 Sekunden.
- Räume liegen im Arbeitsspeicher und werden nach 12 Stunden gelöscht. Bei einem Neustart des Servers können laufende Spiele verloren gehen.
- Wer die Adresse kennt, kann Räume sehen und beitreten. Es gibt keine Anmeldung und keinen Schutz gegen Mogeln: Die Geheimprofis liegen im Raum-Dokument.
- Nur Website ohne Server (z. B. Netlify Drop): Dann funktioniert nur der lokale Modus.
