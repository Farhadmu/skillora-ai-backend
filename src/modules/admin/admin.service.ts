import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel, InjectConnection } from '@nestjs/mongoose';
import { Model, Connection, isValidObjectId } from 'mongoose';
import { User, UserDocument } from '../../database/schemas/user.schema';
import { Job, JobDocument, JobApplication, JobApplicationDocument } from '../../database/schemas/job.schema';
import { Skill, SkillDocument, SkillEvidence, SkillEvidenceDocument } from '../../database/schemas/skill.schema';
import { Assessment, AssessmentDocument } from '../../database/schemas/assessment.schema';
import { AIUsage, AIUsageDocument, AuditLog, AuditLogDocument } from '../../database/schemas/analytics-audit.schema';
import { AiService } from '../ai/ai.service';
import { Role } from '../../common/enums/roles.enum';

@Injectable()
export class AdminService {
  constructor(
    @InjectModel(User.name) private readonly userModel: Model<UserDocument>,
    @InjectModel(Job.name) private readonly jobModel: Model<JobDocument>,
    @InjectModel(JobApplication.name) private readonly appModel: Model<JobApplicationDocument>,
    @InjectModel(Skill.name) private readonly skillModel: Model<SkillDocument>,
    @InjectModel(Assessment.name) private readonly assessmentModel: Model<AssessmentDocument>,
    @InjectModel(SkillEvidence.name) private readonly evidenceModel: Model<SkillEvidenceDocument>,
    @InjectModel(AIUsage.name) private readonly aiUsageModel: Model<AIUsageDocument>,
    @InjectModel(AuditLog.name) private readonly auditModel: Model<AuditLogDocument>,
    @InjectConnection() private readonly connection: Connection,
    private readonly aiService: AiService,
  ) {}

  async getPlatformStats() {
    const [
      totalUsers,
      learnersCount,
      educatorsCount,
      employersCount,
      totalJobs,
      totalApplications,
      totalSkillsStandardized,
      totalAssessments,
      verifiedSkillsAwarded,
      aiUsages,
      auditLogs,
    ] = await Promise.all([
      this.userModel.countDocuments(),
      this.userModel.countDocuments({ role: Role.LEARNER }),
      this.userModel.countDocuments({ role: Role.EDUCATOR }),
      this.userModel.countDocuments({ role: Role.EMPLOYER }),
      this.jobModel.countDocuments(),
      this.appModel.countDocuments(),
      this.skillModel.countDocuments(),
      this.assessmentModel.countDocuments(),
      this.evidenceModel.countDocuments({ verified: true }),
      this.aiUsageModel.find().sort({ createdAt: -1 }).limit(100).lean(),
      this.auditModel.find().sort({ createdAt: -1 }).limit(20).lean(),
    ]);

    const totalTokens = aiUsages.reduce((acc: number, u: any) => acc + (u.tokens || 0), 0);
    const avgLatency =
      aiUsages.length > 0
        ? Math.round(aiUsages.reduce((acc: number, u: any) => acc + (u.latencyMs || 0), 0) / aiUsages.length)
        : 0;

    const isMongo = this.connection.readyState === 1;

    return {
      overview: {
        totalUsers,
        learnersCount,
        educatorsCount,
        employersCount,
        totalJobs,
        totalApplications,
        totalSkillsStandardized,
        totalAssessments,
        verifiedSkillsAwarded,
      },
      aiGovernance: {
        totalInferenceRequests: aiUsages.length,
        estimatedTokensUsed: totalTokens,
        averageLatencyMs: avgLatency,
        activeModels: [
          'gemini-1.5-flash',
          'llama-3.3-70b-versatile',
          'openrouter-free-cascade',
        ],
        costEstimateUsd: '$0.00 (Zero-Cost Free Provider Cascade)',
      },
      systemHealth: {
        apiStatus: 'HEALTHY',
        databaseStatus: isMongo ? 'CONNECTED_MONGODB' : 'DISCONNECTED',
        uptimeSeconds: Math.round(process.uptime()),
        memoryUsageMb: Math.round(process.memoryUsage().rss / 1024 / 1024),
      },
      auditLogs,
    };
  }

  async getUsersList() {
    const users = await this.userModel.find().lean();
    return users.map((u: any) => ({
      id: u.id || u._id.toString(),
      name: u.name,
      email: u.email,
      role: u.role,
      headline: u.headline,
      status: u.status || 'active',
      createdAt: u.createdAt,
    }));
  }

  getAiProviders() {
    return this.aiService.getProvidersStatus();
  }

  async testAiCascade(prompt?: string) {
    return this.aiService.testCascade(prompt);
  }

  async updateUserRole(userId: string, role: Role) {
    const query: any[] = [{ id: userId }];
    if (isValidObjectId(userId)) query.push({ _id: userId });

    const user = await this.userModel.findOne({ $or: query });
    if (!user) {
      throw new NotFoundException(`User with ID ${userId} not found`);
    }

    const previousRole = user.role;
    user.role = role;
    await user.save();

    await this.auditModel.create({
      action: 'USER_ROLE_UPDATED',
      resourceType: 'user',
      resourceId: userId,
      userRole: role,
      details: { previousRole, newRole: role, targetUser: user.email },
    }).catch(() => {});

    return {
      success: true,
      message: `User ${user.name} role updated to ${role}`,
      user: {
        id: user.id || (user as any)._id?.toString(),
        name: user.name,
        email: user.email,
        role: user.role,
      },
    };
  }

  async updateUserStatus(userId: string, status: string) {
    const query: any[] = [{ id: userId }];
    if (isValidObjectId(userId)) query.push({ _id: userId });

    const user = await this.userModel.findOne({ $or: query });
    if (!user) {
      throw new NotFoundException(`User with ID ${userId} not found`);
    }

    user.status = status;
    await user.save();

    await this.auditModel.create({
      action: 'USER_STATUS_UPDATED',
      resourceType: 'user',
      resourceId: userId,
      details: { newStatus: status, targetUser: user.email },
    }).catch(() => {});

    return {
      success: true,
      message: `User ${user.email} status updated to ${status}`,
      user: {
        id: user.id || (user as any)._id?.toString(),
        name: user.name,
        email: user.email,
        role: user.role,
        status: user.status,
      },
    };
  }
}
