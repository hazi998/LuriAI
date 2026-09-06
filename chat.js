export default async function handler(req, res) {
    // Sadece POST isteklerine izin ver
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Yalnızca POST istekleri kabul edilir.' });
    }

    const { text, history } = req.body;

    // Vercel Environment Variables üzerinden gizli tutulan API Key
    const apiKey = process.env.GEMINI_API_KEY;

    if (!apiKey) {
        return res.status(500).json({ error: 'API Anahtarı sunucuda tanımlanmamış.' });
    }

    try {
        // gemini-2.0-flash kullanımı:
            const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`, { ... });
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                system_instruction: {
                    parts: [{
                        text: "Senin adın Luri AI. Sen sevimli, son derece zeki, yardımsever ve kibar bir yapay zeka asistanısın."
                    }]
                },
                contents: [{
                    parts: [{ text: text }]
                }]
            })
        });

        const data = await response.json();

        if (!response.ok) {
            return res.status(response.status).json({ error: data.error?.message || 'API Hatası' });
        }

        return res.status(200).json(data);
    } catch (error) {
        return res.status(500).json({ error: 'Sunucu bağlantı hatası oluştu.' });
    }
}
