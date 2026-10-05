import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type RoadmapDocument = Roadmap & Document;

@Schema({ _id: false })
export class RoadmapTaskItem {
  @Prop({ required: true })
  id: string;

  @Prop({ required: true })
  title: string;

  @Prop({
    default: 'practice',
    enum: ['reading', 'practice', 'quiz', 'project', 'revision'],
  })
  type: string;

  @Prop({ default: false })
  completed: boolean;

  @Prop({ default: 30 })
  estimatedMinutes: number;
}

export const RoadmapTaskItemSchema = SchemaFactory.createForClass(RoadmapTaskItem);

@Schema({ _id: false })
export class RoadmapMilestone {
  @Prop({ required: true })
  dayRange: string;

  @Prop({ required: true })
  title: string;

  @Prop({ required: true })
  focusSkill: string;

  @Prop({ default: false })
  completed: boolean;

  @Prop({ type: [String], default: [] })
  learningObjectives: string[];

  @Prop({ type: [RoadmapTaskItemSchema], default: [] })
  tasks: RoadmapTaskItem[];

  @Prop({ default: '' })
  projectPrompt: string;

  @Prop({ default: '' })
  assessmentTopic: string;
}

export const RoadmapMilestoneSchema = SchemaFactory.createForClass(RoadmapMilestone);

@Schema({ timestamps: true, collection: 'roadmaps' })
export class Roadmap {
  @Prop({ required: true, index: true })
  userId: string;

  @Prop({ required: true, trim: true })
  targetRole: string;

  @Prop({ default: 60 })
  durationDays: number;

  @Prop({ default: 0, min: 0, max: 100, index: true })
  progressPercent: number;

  @Prop({ default: '' })
  summary: string;

  @Prop({ type: [RoadmapMilestoneSchema], default: [] })
  milestones: RoadmapMilestone[];

  @Prop({ default: 'active', enum: ['active', 'completed', 'archived'] })
  status: string;
}

export const RoadmapSchema = SchemaFactory.createForClass(Roadmap);
RoadmapSchema.index({ userId: 1, status: 1 });
