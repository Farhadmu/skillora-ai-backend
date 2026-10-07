import { Injectable, NotFoundException } from '@nestjs/common';
import { DataStoreService } from '../../database/data-store.service';
import { AiService } from '../ai/ai.service';
import { Role } from '../../common/enums/roles.enum';

@Injectable()
export class AdminService {
  constructor(
    private readonly dataStore: DataStoreService,
    private readonly aiService: AiService,
  ) {}

  getPlatformStats() {
    const users = Array.from(this.dataStore.users.values());
    const jobs = Array.from(this.dataStore.jobs.values());
    const applications = Array.from(this.dataStore.applications.values());
    const skills = Array.from(this.dataStore.skills.values());
    const assessments = Array.from(this.dataStore.assessments.values());

    const verifiedEvidences = Array.from(this.dataStore.skillEvidences.values()).filter((e) => e.verified);
    const aiUsages = this.dataStore.aiUsages || [];
    const totalTokens = aiUsages.reduce((acc, u) => acc + (u.tokens || 0), 0);
    const avgLatency =
      aiUsages.length > 0
        ? Math.round(aiUsages.reduce((acc, u) => acc + (u.latencyMs || 0), 0) / aiUsages.length)
        : 0;

    return {
      overview: {
        totalUsers: users.length,
        learnersCount: users.filter((u) => u.role === 'LEARNER').length,
        educatorsCount: users.filter((u) => u.role === 'EDUCATOR').length,
        employersCount: users.filter((u) => u.role === 'EMPLOYER').length,
        totalJobs: jobs.length,
        totalApplications: applications.length,
        totalSkillsStandardized: skills.length,
        totalAssessments: assessments.length,
        verifiedSkillsAwarded: verifiedEvidences.length,
      },
      aiGovernance: {
        totalInferenceRequests: aiUsages.length,
        estimatedTokensUsed: totalTokens,
        averageLatencyMs: avgLatency,
        fallbackEngineHitRatio:
          aiUsages.length > 0
            ? `${Math.round((aiUsages.filter((u) => u.isFallback).length / aiUsages.length) * 100)}%`
            : '0%',
        activeModels: [
          'gemini-1.5-flash',
          'gemini-2.0-flash',
          'llama-3.3-70b-versatile',
          'skillora-semantic-heuristics-v2',
        ],
        costEstimateUsd: '$0.00 (Zero-Cost Free Provider Cascade)',
      },
      systemHealth: {
        apiStatus: 'HEALTHY',
        databaseStatus: this.dataStore.isMongoConnected ? 'CONNECTED' : 'PERSISTENT_FILE_BACKED',
        vectorDbStatus: 'ACTIVE',
        uptimeSeconds: Math.round(process.uptime()),
        memoryUsageMb: Math.round(process.memoryUsage().rss / 1024 / 1024),
      },
      auditLogs: this.dataStore.auditLogs.slice(-20).reverse(),
    };
  }

  getUsersList() {
    return Array.from(this.dataStore.users.values()).map((u) => ({
      id: u.id,
      name: u.name,
      email: u.email,
      role: u.role,
      headline: u.headline,
      createdAt: u.createdAt,
    }));
  }

  getAiProviders() {
    return this.aiService.getProvidersStatus();
  }

  async testAiCascade(prompt?: string) {
    return this.aiService.testCascade(prompt);
  }

  updateUserRole(userId: string, role: Role) {
    const user = this.dataStore.users.get(userId);
    if (!user) {
      throw new NotFoundException(`User with ID ${userId} not found`);
    }

    user.role = role;
    this.dataStore.saveUser(user);

    this.dataStore.logAudit({
      action: 'USER_ROLE_UPDATED',
      resourceType: 'user',
      resourceId: userId,
      userRole: role,
      details: { previousRole: user.role, newRole: role, targetUser: user.email },
    });

    return {
      success: true,
      message: `User ${user.name} role updated to ${role}`,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
      },
    };
  }

  updateUserStatus(userId: string, status: string) {
    const user = this.dataStore.users.get(userId);
    if (!user) {
      throw new NotFoundException(`User with ID ${userId} not found`);
    }

    (user as any).status = status;
    this.dataStore.saveUser(user);

    this.dataStore.logAudit({
      action: 'USER_STATUS_UPDATED',
      resourceType: 'user',
      resourceId: userId,
      details: { newStatus: status, targetUser: user.email },
    });

    return {
      success: true,
      message: `User ${user.email} status updated to ${status}`,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        status: (user as any).status,
      },
    };
  }
}

