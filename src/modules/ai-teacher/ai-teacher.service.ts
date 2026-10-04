import { Injectable } from '@nestjs/common';
import { AiService } from '../ai/ai.service';
import { RagService } from '../ai/rag.service';

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
  private sessions: Map<string, TutorSessionMessage[]> = new Map();

  constructor(
    private readonly aiService: AiService,
    private readonly ragService: RagService,
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
    const sessionId = `${userId}-${subject}`;

    const sessionHistory = this.sessions.get(sessionId) || [];

    // Save user message
    const userMsg: TutorSessionMessage = {
      id: `msg-${Date.now()}-u`,
      sender: 'user',
      text: message,
      timestamp: new Date().toISOString(),
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

    const tutorMsg: TutorSessionMessage = {
      id: `msg-${Date.now()}-t`,
      sender: 'tutor',
      text: aiResult.response,
      timestamp: new Date().toISOString(),
      bloomsLevel: aiResult.bloomsLevel,
      citations,
      socraticHint: aiResult.socraticHint,
    };
    sessionHistory.push(tutorMsg);

    this.sessions.set(sessionId, sessionHistory);

    return {
      reply: tutorMsg,
      history: sessionHistory,
      suggestedTopics: aiResult.suggestedTopics,
    };
  }

  getSessionHistory(userId: string, subject: string) {
    const sessionId = `${userId}-${subject}`;
    return this.sessions.get(sessionId) || [];
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
