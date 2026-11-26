import mongoose, { Document, Schema } from 'mongoose';

export interface IGymExerciseVideo extends Document {
  gymId: mongoose.Types.ObjectId;
  branchId?: mongoose.Types.ObjectId;
  createdBy?: mongoose.Types.ObjectId;
  title: string;
  titleTamil?: string;
  language: 'Tamil' | 'English' | 'All';
  category: string;
  youtubeId?: string;
  videoUrl?: string;
  thumbnailUrl?: string;
  duration: string;
  targetMuscle: string;
  equipment: string;
  level: 'Beginner' | 'Intermediate' | 'Advanced';
  description: string;
  descriptionTamil?: string;
  tips: string[];
  isCustom: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const gymExerciseVideoSchema = new Schema<IGymExerciseVideo>(
  {
    gymId: { type: Schema.Types.ObjectId, ref: 'Gym', required: true, index: true },
    branchId: { type: Schema.Types.ObjectId, ref: 'Branch', index: true },
    createdBy: { type: Schema.Types.ObjectId, ref: 'User' },
    title: { type: String, required: true, trim: true },
    titleTamil: { type: String, trim: true },
    language: { type: String, enum: ['Tamil', 'English', 'All'], default: 'English' },
    category: { type: String, required: true, trim: true, index: true },
    youtubeId: { type: String, trim: true },
    videoUrl: { type: String, trim: true },
    thumbnailUrl: { type: String, trim: true },
    duration: { type: String, default: '8:00' },
    targetMuscle: { type: String, default: 'General Muscle Group', trim: true },
    equipment: { type: String, default: 'Gym Equipment', trim: true },
    level: { type: String, enum: ['Beginner', 'Intermediate', 'Advanced'], default: 'Beginner' },
    description: { type: String, default: '' },
    descriptionTamil: { type: String, default: '' },
    tips: { type: [String], default: [] },
    isCustom: { type: Boolean, default: true }
  },
  { timestamps: true }
);

gymExerciseVideoSchema.index({ gymId: 1, category: 1 });
gymExerciseVideoSchema.index({ gymId: 1, title: 1 });

export default mongoose.model<IGymExerciseVideo>('GymExerciseVideo', gymExerciseVideoSchema);
