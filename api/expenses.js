// API de gastos con Vercel KV
import { kv } from '@vercel/kv';

// Helper para verificar autenticación
const verifyAuth = (req) => {
    const authHeader = req.headers.authorization;
    if (!authHeader) return false;
    
    const token = authHeader.replace('Bearer ', '');
    try {
        const decoded = Buffer.from(token, 'base64').toString('utf-8');
        const [timestamp, password] = decoded.split(':');
        const APP_PASSWORD = process.env.APP_PASSWORD || 'panza';
        
        // Verificar que el token no sea muy antiguo (24 horas)
        const tokenAge = Date.now() - parseInt(timestamp);
        const maxAge = 24 * 60 * 60 * 1000; // 24 horas
        
        return password === APP_PASSWORD && tokenAge < maxAge;
    } catch {
        return false;
    }
};

// Helper para generar ID
const generateId = () => {
    return crypto.randomUUID ? crypto.randomUUID() : 
        Math.random().toString(36).substring(2, 15) + 
        Math.random().toString(36).substring(2, 15);
};

export default async function handler(req, res) {
    // CORS headers
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, DELETE, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    // Verificar autenticación para todas las operaciones
    if (!verifyAuth(req)) {
        return res.status(401).json({ error: 'No autorizado' });
    }

    const KV_KEY = 'expenses:all';

    try {
        // GET - Obtener todos los gastos
        if (req.method === 'GET') {
            let expenses = [];
            
            // Intentar obtener de KV, si no existe usar array vacío
            if (kv) {
                expenses = await kv.get(KV_KEY) || [];
            }
            
            return res.status(200).json(expenses);
        }

        // POST - Añadir nuevo gasto
        if (req.method === 'POST') {
            const { project, category, description, date, amount } = req.body;

            // Validación
            if (!project || !category || !date || amount === undefined) {
                return res.status(400).json({ error: 'Faltan campos obligatorios' });
            }

            const newExpense = {
                id: generateId(),
                project: project.trim(),
                category: category.trim(),
                description: description?.trim() || '',
                date,
                amount: parseFloat(amount),
                createdAt: new Date().toISOString()
            };

            // Obtener gastos existentes
            let expenses = [];
            if (kv) {
                expenses = await kv.get(KV_KEY) || [];
            }

            // Añadir al principio
            expenses.unshift(newExpense);

            // Guardar
            if (kv) {
                await kv.set(KV_KEY, expenses);
            }

            return res.status(201).json(newExpense);
        }

        // DELETE - Eliminar gasto
        if (req.method === 'DELETE') {
            const { id } = req.query;

            if (!id) {
                return res.status(400).json({ error: 'ID requerido' });
            }

            let expenses = [];
            if (kv) {
                expenses = await kv.get(KV_KEY) || [];
            }

            const initialLength = expenses.length;
            expenses = expenses.filter(e => e.id !== id);

            if (expenses.length === initialLength) {
                return res.status(404).json({ error: 'Gasto no encontrado' });
            }

            if (kv) {
                await kv.set(KV_KEY, expenses);
            }

            return res.status(200).json({ success: true, message: 'Gasto eliminado' });
        }

        return res.status(405).json({ error: 'Método no permitido' });

    } catch (error) {
        console.error('Error en API de gastos:', error);
        return res.status(500).json({ error: 'Error interno del servidor' });
    }
}
