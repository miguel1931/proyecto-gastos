// Autenticación simple con contraseña
// En producción, considera usar JWT o sesiones más seguras

// Contraseña del sistema - en producción usar variable de entorno
const APP_PASSWORD = process.env.APP_PASSWORD || 'panza';

export default async function handler(req, res) {
    // CORS headers
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Método no permitido' });
    }

    try {
        const { password } = req.body;

        if (password === APP_PASSWORD) {
            // Generar un token simple (en producción usar JWT)
            const token = Buffer.from(`${Date.now()}:${password}`).toString('base64');
            return res.status(200).json({ 
                success: true, 
                token,
                message: 'Autenticación exitosa' 
            });
        } else {
            return res.status(401).json({ 
                success: false, 
                message: 'Contraseña incorrecta' 
            });
        }
    } catch (error) {
        console.error('Error en autenticación:', error);
        return res.status(500).json({ error: 'Error interno del servidor' });
    }
}
