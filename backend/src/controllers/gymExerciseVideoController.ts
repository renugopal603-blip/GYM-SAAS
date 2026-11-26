import { Response } from 'express';
import GymExerciseVideo from '../models/GymExerciseVideo';
import Gym from '../models/Gym';
import { AuthRequest } from '../middlewares/auth';

// Helper to resolve gymId for current user
const resolveGymId = async (req: AuthRequest): Promise<string | undefined> => {
  if (req.user?.gymId) return req.user.gymId.toString();
  if (req.query.gymId) return req.query.gymId as string;
  const gym = await Gym.findOne().sort({ createdAt: -1 });
  return gym?._id?.toString();
};

// Helper to extract YouTube video ID
export const extractYouTubeId = (input?: string): string => {
  if (!input) return '';
  const trimmed = input.trim();
  if (/^[a-zA-Z0-9_-]{11}$/.test(trimmed)) {
    return trimmed;
  }
  const regExp = /(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([^"&?\/\s]{11})/i;
  const match = trimmed.match(regExp);
  if (match && match[1]) {
    return match[1];
  }
  return '';
};

// GET /api/gym-exercise-videos
export const getGymExerciseVideos = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const gymId = (await resolveGymId(req)) || req.user?.gymId;
    if (!gymId) {
      res.status(400).json({ success: false, message: 'Gym context required' });
      return;
    }

    const { category, language, search } = req.query;
    const query: any = { gymId };

    if (category && category !== 'All') {
      query.category = category;
    }
    if (language && language !== 'All') {
      query.language = language;
    }
    if (search && typeof search === 'string' && search.trim()) {
      const s = search.trim();
      query.$or = [
        { title: new RegExp(s, 'i') },
        { titleTamil: new RegExp(s, 'i') },
        { targetMuscle: new RegExp(s, 'i') },
        { equipment: new RegExp(s, 'i') }
      ];
    }

    const docs = await GymExerciseVideo.find(query).sort({ createdAt: -1 });

    const videos = docs.map(doc => {
      const obj = doc.toObject();
      return {
        ...obj,
        id: obj._id.toString(),
        _id: obj._id.toString()
      };
    });

    res.status(200).json({
      success: true,
      count: videos.length,
      videos
    });
  } catch (error: any) {
    console.error('Error fetching gym exercise videos:', error);
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
};

// POST /api/gym-exercise-videos
export const createGymExerciseVideo = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const gymId = (await resolveGymId(req)) || req.user?.gymId;
    if (!gymId) {
      res.status(400).json({ success: false, message: 'Gym context required' });
      return;
    }

    const {
      title,
      titleTamil,
      language,
      category,
      youtubeId,
      youtubeUrl,
      videoUrl,
      thumbnailUrl,
      duration,
      targetMuscle,
      equipment,
      level,
      description,
      descriptionTamil,
      tips,
      branchId
    } = req.body;

    if (!title || !String(title).trim()) {
      res.status(400).json({ success: false, message: 'Exercise Title is required' });
      return;
    }

    const rawUrl = videoUrl || youtubeUrl || '';
    const detectedYtId = youtubeId || extractYouTubeId(rawUrl);

    let finalThumbnail = thumbnailUrl ? String(thumbnailUrl).trim() : '';
    if (!finalThumbnail && detectedYtId) {
      finalThumbnail = `https://img.youtube.com/vi/${detectedYtId}/hqdefault.jpg`;
    }

    const newVideo = new GymExerciseVideo({
      gymId,
      branchId: branchId || req.user?.branchId,
      createdBy: req.user?.id,
      title: String(title).trim(),
      titleTamil: titleTamil ? String(titleTamil).trim() : undefined,
      language: language || 'English',
      category: category || 'Chest',
      youtubeId: detectedYtId || '',
      videoUrl: rawUrl.trim() || (detectedYtId ? `https://www.youtube.com/watch?v=${detectedYtId}` : ''),
      thumbnailUrl: finalThumbnail,
      duration: duration ? String(duration).trim() : '8:00',
      targetMuscle: targetMuscle ? String(targetMuscle).trim() : 'General Muscle Group',
      equipment: equipment ? String(equipment).trim() : 'Gym Equipment',
      level: level || 'Beginner',
      description: description ? String(description).trim() : '',
      descriptionTamil: descriptionTamil ? String(descriptionTamil).trim() : '',
      tips: Array.isArray(tips) ? tips.filter(Boolean) : [],
      isCustom: true
    });

    await newVideo.save();

    const obj = newVideo.toObject();
    const formattedVideo = {
      ...obj,
      id: obj._id.toString(),
      _id: obj._id.toString()
    };

    res.status(201).json({
      success: true,
      message: 'Exercise video added successfully',
      video: formattedVideo
    });
  } catch (error: any) {
    console.error('Error creating gym exercise video:', error);
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
};

// DELETE /api/gym-exercise-videos/:id
export const deleteGymExerciseVideo = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const gymId = (await resolveGymId(req)) || req.user?.gymId;
    const { id } = req.params;

    const deleted = await GymExerciseVideo.findOneAndDelete({
      _id: id,
      ...(gymId ? { gymId } : {})
    });

    if (!deleted) {
      res.status(404).json({ success: false, message: 'Exercise video not found' });
      return;
    }

    res.status(200).json({ success: true, message: 'Exercise video removed successfully' });
  } catch (error: any) {
    console.error('Error deleting gym exercise video:', error);
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
};
