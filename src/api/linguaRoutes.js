import express from 'express';

const router = express.Router();

// GET /api/lingue - restituisce tutte le lingue
router.get('/', async (req, res) => {
  res.json(global.odessaData.Lingue || []);
});

export default router;
