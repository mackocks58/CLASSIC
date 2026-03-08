import { Router } from 'express';
import { verifyToken } from '../middlewares/authMiddleware.js';
import { getVideos, watchVideo } from '../controllers/taskController.js';

const router = Router();

router.get('/videos', verifyToken, getVideos);
router.post('/videos/:videoId/watch', verifyToken, watchVideo);

export default router;
