import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { AiService } from '../ai/ai.service';
import { RagService } from '../ai/rag.service';
import { Message, MessageDocument, Conversation, ConversationDocument } from '../../database/schemas/communication.schema';

export interface TutorSessionMessage {
  id: string;
  sender: 'user' | 'tutor';
  text: string;
  timestamp: string;
  bloomsLevel?: string;
  citations?: any[];
  socraticHint?: string;
}

@Injectable()
export class AiTeacherService {
  constructor(
    private readonly aiService: AiService,
    private readonly ragService: RagService,
    @InjectModel(Message.name) private readonly messageModel: Model<MessageDocument>,
    @InjectModel(Conversation.name) private readonly conversationModel: Model<ConversationDocument>,
  ) {}

  async chat(params: {
    userId: string;
    message: string;
    subject: string;
    mode: 'teach' | 'practice' | 'explain' | 'challenge' | 'revision' | 'interview';
    bloomsLevel?: string;
    language?: 'en' | 'bn';
    useRag?: boolean;
  }) {
    const { userId, message, subject, mode, bloomsLevel, language = 'en', useRag = true } = params;
    const conversationId = `tutor-${userId}-${subject.toLowerCase().replace(/[^a-z0-9]/g, '-')}`;

    // Load existing messages for this conversation from MongoDB
    const pastRecords = await this.messageModel
      .find({ conversationId })
      .sort({ sentAt: 1 })
      .lean();

    const sessionHistory: TutorSessionMessage[] = pastRecords.map((m: any) => ({
      id: m.id || m._id.toString(),
      sender: m.senderId === userId ? 'user' : 'tutor',
      text: m.content,
      timestamp: m.sentAt ? new Date(m.sentAt).toISOString() : new Date().toISOString(),
    }));

    // Record user message in MongoDB
    const userMsgRecord = await this.messageModel.create({
      conversationId,
      senderId: userId,
      senderName: 'Learner',
      senderRole: 'learner',
      recipientId: 'ai-tutor',
      content: message,
      isRead: true,
      sentAt: new Date(),
    });

    const userMsg: TutorSessionMessage = {
      id: userMsgRecord._id.toString(),
      sender: 'user',
      text: message,
      timestamp: userMsgRecord.sentAt.toISOString(),
    };
    sessionHistory.push(userMsg);

    let citations: any[] = [];
    if (useRag) {
      const grounded = await this.ragService.answerWithGrounding(message);
      if (grounded.citations && grounded.citations.length > 0) {
        citations = grounded.citations;
      }
    }

    const aiResult = await this.aiService.chatWithTutor({
      message,
      mode,
      subject,
      bloomsLevel,
      preferredLanguage: language,
      history: sessionHistory.map((m) => ({
        role: m.sender === 'user' ? 'user' : 'model',
        content: m.text,
      })),
    });

    // Record tutor response in MongoDB
    const tutorMsgRecord = await this.messageModel.create({
      conversationId,
      senderId: 'ai-tutor',
      senderName: 'Skillora Socratic Tutor',
      senderRole: 'system',
      recipientId: userId,
      content: aiResult.response,
      isRead: true,
      sentAt: new Date(),
    });

    // Upsert conversation metadata
    await this.conversationModel.findOneAndUpdate(
      { participants: { $all: [userId, 'ai-tutor'] } },
      {
        participants: [userId, 'ai-tutor'],
        lastMessageAt: new Date(),
        lastMessagePreview: aiResult.response.slice(0, 100),
      },
      { upsert: true, new: true },
    );

    const tutorMsg: TutorSessionMessage = {
      id: tutorMsgRecord._id.toString(),
      sender: 'tutor',
      text: aiResult.response,
      timestamp: tutorMsgRecord.sentAt.toISOString(),
      bloomsLevel: aiResult.bloomsLevel,
      citations,
      socraticHint: aiResult.socraticHint,
    };
    sessionHistory.push(tutorMsg);

    return {
      reply: tutorMsg,
      history: sessionHistory,
      suggestedTopics: aiResult.suggestedTopics,
    };
  }

  async getSessionHistory(userId: string, subject: string): Promise<TutorSessionMessage[]> {
    const conversationId = `tutor-${userId}-${subject.toLowerCase().replace(/[^a-z0-9]/g, '-')}`;
    const pastRecords = await this.messageModel
      .find({ conversationId })
      .sort({ sentAt: 1 })
      .lean();

    return pastRecords.map((m: any) => ({
      id: m.id || m._id.toString(),
      sender: m.senderId === userId ? 'user' : 'tutor',
      text: m.content,
      timestamp: m.sentAt ? new Date(m.sentAt).toISOString() : new Date().toISOString(),
    }));
  }

  /**
   * Generates interactive flashcards for targeted revision
   */
  async generateFlashcards(subject: string) {
    return [
      {
        id: 'fc-1',
        topic: subject,
        front: 'What is the primary difference between Dependency Injection and Inversion of Control (IoC)?',
        back: 'IoC is the overarching architectural principle of inverting control flow; Dependency Injection (DI) is a concrete design pattern where dependencies are supplied externally rather than created internally.',
        difficulty: 'Intermediate',
      },
      {
        id: 'fc-2',
        topic: subject,
        front: 'Why should database connection pools be bounded in production serverless/microservice environments?',
        back: 'Unbounded pools can overwhelm database thread limits, cause connection exhaustion, increase CPU context switching, and degrade query response latency under sudden traffic spikes.',
        difficulty: 'Advanced',
      },
      {
        id: 'fc-3',
        topic: subject,
        front: 'How do React Server Components (RSC) differ from client components regarding bundle size?',
        back: 'RSC code executes exclusively on the server and its dependencies are never transmitted to the client, resulting in a zero-kilobyte JavaScript bundle footprint for those components.',
        difficulty: 'Intermediate',
      },
      {
        id: 'fc-4',
        topic: subject,
        front: 'What makes cosine similarity effective for dense vector search in RAG pipelines?',
        back: 'Cosine similarity measures the cosine of the angle between two vector directions irrespective of magnitude, capturing semantic meaning and topical alignment in high-dimensional embedding spaces.',
        difficulty: 'Advanced',
      },
    ];
  }
}
