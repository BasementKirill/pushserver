import webPush from 'web-push';

// *** DEINE KEYS HIER EINFÜGEN ***
const VAPID_PUBLIC_KEY = 'BBBAR-W3O4VCHeGx0sDJGMwcvJrHIEkY1UBkfF7i2cdGPJXmb52hVo6DarYTx0PpobX462W6zLXsuXIlfYF2JO0';
const VAPID_PRIVATE_KEY = 'Lg9P9PFr4PQopXrLNXCcEPGJKXP8vpax4vVi7_rRDL4';
const VAPID_EMAIL = 'PfeifferLukas@dv-schulen.de';

webPush.setVapidDetails(`mailto:${VAPID_EMAIL}`, VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY);

// In-Memory für Test (vergeht bei cold start – später DB/Redis)
let subscriptions = [];

export default async function handler(req, res) {
    try {
        if (req.method === 'POST') {
            // Subscription speichern (aus Client)
            const sub = req.body;
            if (sub && sub.endpoint && !subscriptions.find(s => s.endpoint === sub.endpoint)) {
                subscriptions.push(sub);
            }
            res.status(201).json({ message: 'Abonniert', count: subscriptions.length });
        } else if (req.method === 'GET') {
            // Push an alle senden (für Cron)
            if (subscriptions.length === 0) {
                res.status(200).json({ message: 'Keine Subscriptions – nichts gesendet' });
                return;
            }

            const payload = JSON.stringify({
                title: 'Hier der Status:',
                body: `Alles läuft! ⏰ ${new Date().toLocaleTimeString()}`
            });

            const promises = subscriptions.map(sub =>
                webPush.sendNotification(sub, payload).catch(err => {
                    console.error('Push-Fehler für Subscription:', sub.endpoint, err);
                    if (err.statusCode === 410) {
                        subscriptions = subscriptions.filter(s => s.endpoint !== sub.endpoint);
                    }
                })
            );

            await Promise.all(promises);
            res.status(200).json({ message: 'Push gesendet', count: subscriptions.length });
        } else {
            res.status(405).json({ error: 'Method not allowed' });
        }
    } catch (error) {
        console.error('Unhandled Error:', error);
        res.status(500).json({ error: 'Internal Server Error', details: error.message });
    }
}

export const config = {
    api: {
        bodyParser: true
    }
};