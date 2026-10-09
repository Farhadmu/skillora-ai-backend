import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type NotificationDocument = Notification & Document;
export type ConversationDocument = Conversation & Document;
export type MessageDocument = Message & Document;

@Schema({ timestamps: true, collection: 'notifications' })
export class Notification {
  @Prop({ index: true })
  id?: string;

  @Prop({ required: true, index: true })
  userId: string;

  @Prop({ required: true })
  title: string;

  @Prop({ required: true })
  message: string;

  @Prop({
    required: true,
    enum: [
      'application',
      'job_match',
      'assessment',
      'roadmap',
      'skill_improvement',
      'interview',
      'system',
      'educator',
    ],
    default: 'system',
    index: true,
  })
  type: string;

  @Prop({ default: '' })
  link?: string;

  @Prop({ default: false, index: true })
  isRead: boolean;

  @Prop({ default: () => new Date(), index: true })
  createdAt: Date;
}

export const NotificationSchema = SchemaFactory.createForClass(Notification);
NotificationSchema.index({ userId: 1, isRead: 1, createdAt: -1 });

@Schema({ timestamps: true, collection: 'conversations' })
export class Conversation {
  @Prop({ type: [String], required: true, index: true })
  participants: string[];

  @Prop({ default: () => new Date(), index: true })
  lastMessageAt: Date;

  @Prop({ default: '' })
  lastMessagePreview: string;
}

export const ConversationSchema = SchemaFactory.createForClass(Conversation);

@Schema({ timestamps: true, collection: 'messages' })
export class Message {
  @Prop({ required: true, index: true })
  conversationId: string;

  @Prop({ required: true, index: true })
  senderId: string;

  @Prop({ required: true })
  senderName: string;

  @Prop({ required: true })
  senderRole: string;

  @Prop({ required: true, index: true })
  recipientId: string;

  @Prop({ required: true })
  content: string;

  @Prop({ default: false, index: true })
  isRead: boolean;

  @Prop({ default: () => new Date(), index: true })
  sentAt: Date;
}

export const MessageSchema = SchemaFactory.createForClass(Message);
MessageSchema.index({ conversationId: 1, sentAt: 1 });
