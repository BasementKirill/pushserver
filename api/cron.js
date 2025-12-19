import webPush from 'web-push';
import fs from 'fs';

// Deine VAPID Keys (Private Key hier eintragen!)
webPush.setVapidDetails(
      "mailto: <PfeifferLukas@dv-schulen.de>",
      "BEtM3yYdduzemTmftBOqLVOrh89WPSrcwc8zrZbvKpZqVv4-GkYokrSAmKgWIkSyMRQah3P7JYJ2_RotR3H8MDQ",
     "yHQANnTP-9lN-dH1cfohbWfv_p2GawBk9prj3iS0XP8"
);

// Speicher für Subscriptions (in Produktion besser Datenbank, hier Datei für Einfachheit)
const SUBSCRIPTIONS_FILE = 'subscriptions.json';

let subscriptions = [];
if (fs.existsSync(SUBSCRIPTIONS_FILE)) {
    subscriptions = JSON.parse(fs.readFileSync(SUBSCRIPTIONS_FILE));
}

export default function handler(req, res) {
    if (req.method === 'GET') {
        // Cron-Job: An alle abonnierten Geräte senden
        const payload = JSON.stringify({
            title: 'Hier der Status:',
            body: `Alles läuft! ⏰ ${new Date().toLocaleTimeString()}`
        });

        const promises = subscriptions.map(sub => {
            return webPush.sendNotification(sub, payload).catch(err => {
                console.error('Fehler beim Senden:', err);
                // Bei Fehler Subscription entfernen (abgelaufen)
                if (err.statusCode === 410) {
                    subscriptions = subscriptions.filter(s => s.endpoint !== sub.endpoint);
                    fs.writeFileSync(SUBSCRIPTIONS_FILE, JSON.stringify(subscriptions));
                }
            });
        });

        Promise.all(promises).then(() => {
            res.status(200).json({ message: 'Push gesendet!' });
        });
    } else if (req.method === 'POST') {
        // Neue Subscription speichern (von deiner PWA)
        const sub = req.body;
        if (!subscriptions.find(s => s.endpoint === sub.endpoint)) {
            subscriptions.push(sub);
            fs.writeFileSync(SUBSCRIPTIONS_FILE, JSON.stringify(subscriptions));
        }
        res.status(201).json({ message: 'Subscription gespeichert' });
    } else {
        res.status(405).end();
    }
}

// Für Vercel Cron
export const config = {
    api: {
        bodyParser: true,
    },
};