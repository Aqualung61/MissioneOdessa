import express from 'express';
import { getGameData } from '../logic/core/gameData.js';

const router = express.Router();

// GET /api/lingue - restituisce tutte le lingue
router.get('/', async (req, res) => {
  res.json(getGameData().Lingue || []);
});

export default router;
