import webPush from 'web-push';

// *** DEINE KEYS HIER EINFÜGEN ***
const VAPID_PUBLIC_KEY = 'BEtM3yYdduzemTmftBOqLVOrh89WPSrcwc8zrZbvKpZqVv4-GkYokrSAmKgWIkSyMRQah3P7JYJ2_RotR3H8MDQ';
const VAPID_PRIVATE_KEY = 'DEIN_PRIVATE_KEY_HIER'; // geheim!
const VAPID_EMAIL = 'deine@email.com';

webPush.setVapidDetails(`mailto:${VAPID_EMAIL}`, VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY);

// Subscriptions in Memory speichern (für Test; später Datei oder DB)
let subscriptions = [];

export default async function handler(req, res) {
    if (req.method === 'POST' && req.url.includes('subscribe')) {
        // Neue Subscription speichern
        const sub = req.body;
        if (!subscriptions.find(s => s.endpoint === sub.endpoint)) {
            subscriptions.push(sub);
        }
        res.status(201).json({ message: 'Abonniert' });
    } else {
        // Push an alle senden (wird vom Cron aufgerufen)
        const payload = JSON.stringify({
            title: 'Hier der Status:',
            body: `Alles läuft! ⏰ ${new Date().toLocaleTimeString()}`
        });

        const promises = subscriptions.map(sub =>
            webPush.sendNotification(sub, payload).catch(err => {
                console.error('Fehler:', err);
                // Abgelaufene entfernen
                if (err.statusCode === 410) {
                    subscriptions = subscriptions.filter(s => s.endpoint !== sub.endpoint);
                }
            })
        );

        await Promise.all(promises);
        res.status(200).json({ message: 'Push gesendet', count: subscriptions.length });
    }
}

export const config = { api: { bodyParser: true } };