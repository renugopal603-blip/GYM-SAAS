import express from 'express';
import {
  getGymExerciseVideos,
  createGymExerciseVideo,
  deleteGymExerciseVideo
} from '../controllers/gymExerciseVideoController';
import { authenticate } from '../middlewares/auth';

const router = express.Router();

router.get('/', authenticate, getGymExerciseVideos);
router.post('/', authenticate, createGymExerciseVideo);
router.delete('/:id', authenticate, deleteGymExerciseVideo);

export default router;
