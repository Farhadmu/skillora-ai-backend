import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type KnowledgeDocumentDocument = KnowledgeDocument & Document;
export type KnowledgeChunkDocument = KnowledgeChunk & Document;

@Schema({ timestamps: true, collection: 'knowledge_documents' })
export class KnowledgeDocument {
  @Prop({ required: true, trim: true, index: true })
  title: string;

  @Prop({ required: true, index: true })
  source: string;

  @Prop({ default: '' })
  url: string;

  @Prop({ required: true, index: true })
  category: string;

  @Prop({ required: true, index: true })
  skill: string;

  @Prop({ default: '' })
  topic: string;

  @Prop({ default: 'Intermediate', enum: ['Beginner', 'Intermediate', 'Advanced'] })
  difficulty: string;

  @Prop({ default: 'v1.0' })
  version: string;

  @Prop({ required: true })
  rawContent: string;

  @Prop({ default: 0 })
  chunkCount: number;

  @Prop({ default: 'indexed', enum: ['indexed', 'processing', 'failed'], index: true })
  status: string;
}

export const KnowledgeDocumentSchema = SchemaFactory.createForClass(KnowledgeDocument);
KnowledgeDocumentSchema.index({ title: 'text', rawContent: 'text', skill: 'text' });

@Schema({ timestamps: true, collection: 'knowledge_chunks' })
export class KnowledgeChunk {
  @Prop({ required: true, index: true })
  documentId: string;

  @Prop({ required: true })
  chunkIndex: number;

  @Prop({ required: true })
  content: string;

  @Prop({ type: Object, default: {} })
  metadata: {
    source: string;
    title: string;
    url: string;
    category: string;
    skill: string;
    topic: string;
    difficulty: string;
    version: string;
  };

  @Prop({ type: [Number], default: [] })
  embedding: number[];
}

export const KnowledgeChunkSchema = SchemaFactory.createForClass(KnowledgeChunk);
KnowledgeChunkSchema.index({ 'metadata.skill': 1, 'metadata.category': 1 });
KnowledgeChunkSchema.index({ content: 'text' });
