import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type AnalyticsEventDocument = AnalyticsEvent & Document;
export type AIUsageDocument = AIUsage & Document;
export type AuditLogDocument = AuditLog & Document;
export type SubscriptionDocument = Subscription & Document;

@Schema({ timestamps: true, collection: 'analytics_events' })
export class AnalyticsEvent {
  @Prop({ required: true, index: true })
  eventName: string;

  @Prop({ default: null, index: true })
  userId?: string;

  @Prop({ default: 'LEARNER', index: true })
  role: string;

  @Prop({ type: Object, default: {} })
  metadata: Record<string, any>;

  @Prop({ default: () => new Date(), index: true })
  timestamp: Date;
}

export const AnalyticsEventSchema = SchemaFactory.createForClass(AnalyticsEvent);
AnalyticsEventSchema.index({ eventName: 1, timestamp: -1 });

@Schema({ timestamps: true, collection: 'ai_usage' })
export class AIUsage {
  @Prop({ required: true, index: true })
  userId: string;

  @Prop({ required: true, index: true })
  feature: string;

  @Prop({ required: true })
  model: string;

  @Prop({ default: 0 })
  tokensUsed: number;

  @Prop({ default: 0 })
  latencyMs: number;

  @Prop({ default: 'success', enum: ['success', 'failed'] })
  status: string;

  @Prop({ default: 0 })
  cost: number;

  @Prop({ default: () => new Date(), index: true })
  timestamp: Date;
}

export const AIUsageSchema = SchemaFactory.createForClass(AIUsage);
AIUsageSchema.index({ userId: 1, timestamp: -1 });

@Schema({ timestamps: true, collection: 'audit_logs' })
export class AuditLog {
  @Prop({ required: true, index: true })
  userId: string;

  @Prop({ required: true })
  userEmail: string;

  @Prop({ required: true })
  userRole: string;

  @Prop({ required: true, index: true })
  action: string;

  @Prop({ required: true, index: true })
  resourceType: string;

  @Prop({ default: '' })
  resourceId?: string;

  @Prop({ type: Object, default: {} })
  details: Record<string, any>;

  @Prop({ default: '' })
  ipAddress?: string;

  @Prop({ default: () => new Date(), index: true })
  timestamp: Date;
}

export const AuditLogSchema = SchemaFactory.createForClass(AuditLog);
AuditLogSchema.index({ action: 1, timestamp: -1 });

@Schema({ timestamps: true, collection: 'subscriptions' })
export class Subscription {
  @Prop({ required: true, unique: true, index: true })
  userId: string;

  @Prop({
    required: true,
    enum: ['FREE', 'PRO', 'UNIVERSITY', 'BUSINESS'],
    default: 'FREE',
    index: true,
  })
  plan: string;

  @Prop({
    default: 'active',
    enum: ['active', 'past_due', 'canceled', 'trial'],
    index: true,
  })
  status: string;

  @Prop({
    type: Object,
    default: {
      aiRequestsPerDay: 50,
      advancedAssessments: 5,
      mockInterviews: 3,
      candidateSearches: 10,
    },
  })
  limits: {
    aiRequestsPerDay: number;
    advancedAssessments: number;
    mockInterviews: number;
    candidateSearches: number;
  };

  @Prop({
    type: Object,
    default: {
      aiRequestsToday: 0,
      lastResetDate: new Date().toISOString().split('T')[0],
    },
  })
  usage: {
    aiRequestsToday: number;
    lastResetDate: string;
  };

  @Prop({ default: () => new Date() })
  startDate: Date;

  @Prop({ default: null })
  expiresAt?: Date;
}

export const SubscriptionSchema = SchemaFactory.createForClass(Subscription);
