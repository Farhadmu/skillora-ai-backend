import { Injectable, NotFoundException, ForbiddenException, BadRequestException, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, isValidObjectId } from 'mongoose';
import { Profile, ProfileDocument } from '../../database/schemas/profile.schema';
import {
  Course, CourseDocument,
  Cohort, CohortDocument,
  Enrollment, EnrollmentDocument,
  Assignment, AssignmentDocument,
  AssignmentSubmission, AssignmentSubmissionDocument,
} from '../../database/schemas/learning.schema';
import { Assessment, AssessmentDocument } from '../../database/schemas/assessment.schema';
import { SkillEvidence, SkillEvidenceDocument } from '../../database/schemas/skill.schema';
import { Job, JobDocument } from '../../database/schemas/job.schema';
import { Notification, NotificationDocument } from '../../database/schemas/communication.schema';
import { AnalyticsEvent, AnalyticsEventDocument } from '../../database/schemas/analytics-audit.schema';
import { AiService } from '../ai/ai.service';

@Injectable()
export class EducatorService {
  private readonly logger = new Logger(EducatorService.name);

  constructor(
    @InjectModel(Profile.name) private readonly profileModel: Model<ProfileDocument>,
    @InjectModel(Course.name) private readonly courseModel: Model<CourseDocument>,
    @InjectModel(Cohort.name) private readonly cohortModel: Model<CohortDocument>,
    @InjectModel(Enrollment.name) private readonly enrollmentModel: Model<EnrollmentDocument>,
    @InjectModel(Assignment.name) private readonly assignmentModel: Model<AssignmentDocument>,
    @InjectModel(AssignmentSubmission.name) private readonly submissionModel: Model<AssignmentSubmissionDocument>,
    @InjectModel(Assessment.name) private readonly assessmentModel: Model<AssessmentDocument>,
    @InjectModel(SkillEvidence.name) private readonly evidenceModel: Model<SkillEvidenceDocument>,
    @InjectModel(Job.name) private readonly jobModel: Model<JobDocument>,
    @InjectModel(Notification.name) private readonly notificationModel: Model<NotificationDocument>,
    @InjectModel(AnalyticsEvent.name) private readonly analyticsModel: Model<AnalyticsEventDocument>,
    private readonly aiService: AiService,
  ) {}

  /**
   * Educator Cohort & Performance Overview (Scoped to Educator's Cohorts)
   */
  async getCohortOverview(user?: any) {
    const isAdmin = user?.role?.toUpperCase() === 'ADMIN';
    const cohortFilter = isAdmin ? {} : user?.id ? { educatorId: user.id } : {};
    const educatorCohorts = await this.cohortModel.find(cohortFilter).lean();

    const cohortIds = educatorCohorts.map((c: any) => c.id || c._id.toString());
    const enrollmentFilter = isAdmin ? {} : { cohortId: { $in: cohortIds } };
    const enrollments = await this.enrollmentModel.find(enrollmentFilter).lean();

    const enrolledUserIds = Array.from(new Set(enrollments.map((e: any) => e.userId)));
    const learners = enrolledUserIds.length > 0
      ? await this.profileModel.find({ userId: { $in: enrolledUserIds } }).lean()
      : [];

    // Compute intervention alerts
    const alerts = learners
      .filter((l: any) => (l.readinessScore || 0) < 70 || (l.weeklyHours || 0) < 10)
      .map((l: any) => ({
        learnerId: l.userId,
        name: l.name,
        targetRole: l.targetRole,
        readinessScore: l.readinessScore || 0,
        weeklyHours: l.weeklyHours || 0,
        alertType: (l.readinessScore || 0) < 70 ? 'Struggling with Core Verification' : 'Low Weekly Engagement',
        recommendedIntervention:
          (l.readinessScore || 0) < 70
            ? 'Assign Socratic Practice Lab on TypeScript & Backend Patterns'
            : 'Schedule 15-minute 1-on-1 career alignment checkpoint',
      }));

    // Educator courses
    const courseFilter = isAdmin ? {} : user?.id ? { educatorId: user.id } : {};
    const courses = await this.courseModel.find(courseFilter).lean();
    const curriculumModules = courses.map((c: any) => ({
      id: c.id || c._id.toString(),
      title: c.title,
      enrolledLearners: c.enrolledLearners || 0,
      completionRate: 0,
    }));

    // Pending assignment submissions count
    const assignmentIds = (await this.assignmentModel.find(courseFilter).lean()).map((a: any) => a.id);
    const pendingSubmissionsCount = await this.submissionModel.countDocuments({
      assignmentId: { $in: assignmentIds },
      status: 'submitted',
    });

    return {
      cohortName: educatorCohorts.length > 0 ? educatorCohorts[0].name : 'Active Educator Cohort',
      cohortsCount: educatorCohorts.length,
      totalLearners: learners.length,
      averageReadiness:
        learners.length > 0
          ? Math.round(learners.reduce((acc: number, l: any) => acc + (l.readinessScore || 0), 0) / learners.length)
          : 0,
      activeInterventionsCount: alerts.length,
      pendingSubmissionsCount,
      alerts,
      curriculumModules,
    };
  }

  /* =========================================================================
     1. COURSES MANAGEMENT (EDUCATOR & CATALOG)
     ========================================================================= */

  async createCourse(user: any, data: any) {
    const courseId = data.id || `crs-${Date.now()}`;
    const normalizedModules = (data.modules || []).map((mod: any, mIdx: number) => ({
      id: mod.id || `mod-${mIdx + 1}-${Date.now()}`,
      title: mod.title || `Module ${mIdx + 1}`,
      lessons: (mod.lessons || []).map((les: any, lIdx: number) => ({
        id: les.id || `les-${mIdx + 1}-${lIdx + 1}-${Date.now()}`,
        title: les.title || `Lesson ${lIdx + 1}`,
        durationMinutes: les.durationMinutes || 15,
        type: ['video', 'article', 'interactive', 'quiz'].includes(les.type) ? les.type : 'article',
        contentUrl: les.contentUrl || '',
        summary: les.summary || '',
      })),
    }));

    const newCourse = await this.courseModel.create({
      id: courseId,
      title: data.title,
      educatorId: user.id,
      educatorName: user.name || 'Skillora Faculty',
      domain: data.domain || 'Software Engineering',
      level: data.level || 'Intermediate',
      description: data.description,
      modules: normalizedModules,
      tags: data.tags || [],
      status: data.status || 'published',
      enrolledLearners: 0,
      rating: 5.0,
      modulesCount: normalizedModules.length || 1,
    });

    return newCourse.toObject ? newCourse.toObject() : newCourse;
  }

  async getEducatorCourses(user: any) {
    const isAdmin = user?.role?.toUpperCase() === 'ADMIN';
    const filter = isAdmin ? {} : { educatorId: user.id };
    return this.courseModel.find(filter).sort({ createdAt: -1 }).lean();
  }

  async updateCourse(user: any, courseId: string, updates: any) {
    const query: any[] = [{ id: courseId }];
    if (isValidObjectId(courseId)) query.push({ _id: courseId });

    const course = await this.courseModel.findOne({ $or: query });
    if (!course) {
      throw new NotFoundException(`Course ${courseId} not found`);
    }

    const isAdmin = user?.role?.toUpperCase() === 'ADMIN';
    if (!isAdmin && course.educatorId && course.educatorId !== user.id) {
      throw new ForbiddenException('You do not have permission to modify this course.');
    }

    Object.assign(course, updates);
    await course.save();
    return course.toObject ? course.toObject() : course;
  }

  async getCourseCatalog() {
    return this.courseModel.find({ status: 'published' }).sort({ createdAt: -1 }).lean();
  }

  async getCourseById(courseId: string) {
    const query: any[] = [{ id: courseId }];
    if (isValidObjectId(courseId)) query.push({ _id: courseId });

    const course = await this.courseModel.findOne({ $or: query }).lean();
    if (!course) {
      throw new NotFoundException(`Course ${courseId} not found`);
    }
    return course;
  }

  /* =========================================================================
     2. COHORTS & ENROLLMENT MANAGEMENT
     ========================================================================= */

  async createCohort(user: any, data: { name: string; targetRole?: string; description?: string; courseId?: string; courseTitle?: string; capacity?: number; durationWeeks?: number }): Promise<any> {
    const cohortId = `coh-${Date.now()}`;
    const durationWeeks = data.durationWeeks || 8;
    const startDate = new Date();
    const endDate = new Date(Date.now() + durationWeeks * 7 * 86400000);

    const newCohort = await this.cohortModel.create({
      id: cohortId,
      name: data.name,
      courseId: data.courseId || 'crs-core-engineering',
      courseTitle: data.courseTitle || data.name,
      educatorId: user.id,
      startDate,
      endDate,
      capacity: data.capacity || 40,
      enrolledCount: 0,
      status: 'active',
    });

    const cohortObj = newCohort.toObject ? newCohort.toObject() : newCohort;
    return {
      ...cohortObj,
      id: cohortObj.id || cohortId,
    };
  }

  async getEducatorCohorts(user: any) {
    const isAdmin = user?.role?.toUpperCase() === 'ADMIN';
    const filter = isAdmin ? {} : { educatorId: user.id };
    return this.cohortModel.find(filter).sort({ createdAt: -1 }).lean();
  }

  async getCohortLearners(user: any, cohortId: string) {
    const query: any[] = [{ id: cohortId }];
    if (isValidObjectId(cohortId)) query.push({ _id: cohortId });

    const cohort = await this.cohortModel.findOne({ $or: query }).lean();
    if (!cohort) {
      throw new NotFoundException(`Cohort ${cohortId} not found`);
    }

    const isAdmin = user?.role?.toUpperCase() === 'ADMIN';
    if (!isAdmin && cohort.educatorId && cohort.educatorId !== user.id) {
      throw new ForbiddenException('Access denied to this cohort roster.');
    }

    const enrollments = await this.enrollmentModel.find({ cohortId: cohort.id || cohortId }).lean();
    const userIds = enrollments.map((e: any) => e.userId);

    const profiles = await this.profileModel.find({ userId: { $in: userIds } }).lean();
    const profileMap = new Map(profiles.map((p: any) => [p.userId, p]));

    return enrollments.map((enr: any) => ({
      ...enr,
      profile: profileMap.get(enr.userId) || null,
    }));
  }

  /**
   * Learner enrolls into course or cohort
   */
  async enrollLearner(user: any, courseId: string, cohortId?: string) {
    const course: any = await this.getCourseById(courseId);

    const existing = await this.enrollmentModel.findOne({ userId: user.id, courseId: course.id || courseId }).lean();
    if (existing) {
      return existing;
    }

    const enrollmentId = `enr-${Date.now()}`;
    const newEnrollment = await this.enrollmentModel.create({
      userId: user.id,
      studentName: user.name || 'Skillora Learner',
      studentEmail: user.email || '',
      courseId: course.id || courseId,
      cohortId: cohortId || null,
      progressPercent: 0,
      status: 'active',
      enrolledAt: new Date(),
      lastActiveAt: new Date(),
    });

    // Increment counts
    await this.courseModel.updateOne(
      { $or: [{ id: course.id || courseId }, { _id: isValidObjectId(courseId) ? courseId : undefined }] },
      { $inc: { enrolledLearners: 1 } },
    );

    if (cohortId) {
      await this.cohortModel.updateOne(
        { $or: [{ id: cohortId }, { _id: isValidObjectId(cohortId) ? cohortId : undefined }] },
        { $inc: { enrolledCount: 1 } },
      );
    }

    return newEnrollment.toObject ? newEnrollment.toObject() : newEnrollment;
  }

  async getLearnerEnrollments(user: any) {
    const enrollments = await this.enrollmentModel.find({ userId: user.id }).lean();
    const courseIds = enrollments.map((e: any) => e.courseId);
    const courses = await this.courseModel.find({ id: { $in: courseIds } }).lean();
    const courseMap = new Map(courses.map((c: any) => [c.id, c]));

    return enrollments.map((e: any) => ({
      ...e,
      course: courseMap.get(e.courseId) || null,
    }));
  }

  /* =========================================================================
     3. ASSIGNMENTS & SUBMISSION / RUBRIC REVIEW PIPELINE (WORKFLOW 1)
     ========================================================================= */

  async createAssignment(user: any, data: any) {
    const course: any = await this.getCourseById(data.courseId);
    const isAdmin = user?.role?.toUpperCase() === 'ADMIN';
    if (!isAdmin && course.educatorId && course.educatorId !== user.id) {
      throw new ForbiddenException('You cannot publish assignments for a course you do not manage.');
    }

    const assignmentId = `asg-${Date.now()}`;
    const rawRubric = data.rubric || data.rubricCriteria || [];
    const normalizedRubric = rawRubric.length > 0
      ? rawRubric.map((r: any) => ({
          criteria: r.criteria || r.criterion || 'Technical Implementation',
          maxPoints: r.maxPoints || r.weight || 25,
          description: r.description || '',
        }))
      : [
          { criteria: 'Code Architecture & Pattern Quality', maxPoints: 30, description: 'Modular separation and static typing' },
          { criteria: 'Correctness & Edge-Case Handling', maxPoints: 40, description: 'Functional execution and defensive validations' },
          { criteria: 'Testing Coverage & Documentation', maxPoints: 30, description: 'Unit/e2e test suite and setup README' },
        ];

    const newAssignment = await this.assignmentModel.create({
      id: assignmentId,
      educatorId: user.id,
      educatorName: user.name || 'Skillora Faculty',
      courseId: course.id || data.courseId,
      cohortId: data.cohortId || null,
      title: data.title,
      description: data.description || data.instructions || 'Hands-on practical implementation assignment.',
      targetSkill: data.targetSkill,
      rubric: normalizedRubric,
      totalPoints: data.totalPoints || data.maxScore || 100,
      dueDate: data.dueDate ? new Date(data.dueDate) : null,
      status: 'published',
    });

    return newAssignment.toObject ? newAssignment.toObject() : newAssignment;
  }

  async getEducatorAssignments(user: any) {
    const isAdmin = user?.role?.toUpperCase() === 'ADMIN';
    const filter = isAdmin ? {} : { educatorId: user.id };
    return this.assignmentModel.find(filter).sort({ createdAt: -1 }).lean();
  }

  async getLearnerAssignments(user: any) {
    const enrollments = await this.enrollmentModel.find({ userId: user.id }).lean();
    const courseIds = enrollments.map((e: any) => e.courseId);

    const assignments = await this.assignmentModel.find({
      courseId: { $in: courseIds },
      status: 'published',
    }).lean();

    const submissions = await this.submissionModel.find({ learnerId: user.id }).lean();
    const submissionMap = new Map(submissions.map((s: any) => [s.assignmentId, s]));

    return assignments.map((a: any) => ({
      ...a,
      submission: submissionMap.get(a.id) || null,
    }));
  }

  async submitAssignment(user: any, assignmentId: string, data: any) {
    const assignment: any = await this.assignmentModel.findOne({ id: assignmentId }).lean();
    if (!assignment) {
      throw new NotFoundException(`Assignment ${assignmentId} not found`);
    }

    const content = data.content || data.notes || data.solution || 'Project implementation deliverable';
    const repositoryUrl = data.repositoryUrl || data.githubUrl || '';

    const existingSubmission = await this.submissionModel.findOne({
      assignmentId,
      learnerId: user.id,
    });

    const version = existingSubmission ? (existingSubmission.submissionVersion || 1) + 1 : 1;
    const submissionId = existingSubmission?.id || `sub-${Date.now()}`;

    let submission;
    if (existingSubmission) {
      existingSubmission.content = content;
      existingSubmission.repositoryUrl = repositoryUrl || existingSubmission.repositoryUrl;
      existingSubmission.submissionVersion = version;
      existingSubmission.status = 'submitted';
      existingSubmission.submittedAt = new Date();
      submission = await existingSubmission.save();
    } else {
      submission = await this.submissionModel.create({
        id: submissionId,
        assignmentId,
        assignmentTitle: assignment.title,
        courseId: assignment.courseId,
        cohortId: assignment.cohortId || null,
        learnerId: user.id,
        learnerName: user.name || 'Skillora Learner',
        learnerEmail: user.email || '',
        content,
        repositoryUrl,
        submissionVersion: version,
        status: 'submitted',
        submittedAt: new Date(),
      });
    }

    // Notify educator
    await this.notificationModel.create({
      id: `notif-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      userId: assignment.educatorId,
      title: `Assignment Submission Received: ${assignment.title}`,
      message: `${user.name || 'Learner'} submitted their work for "${assignment.title}".`,
      type: 'educator',
      link: '/educator/dashboard',
    }).catch(() => {});

    return submission.toObject ? submission.toObject() : submission;
  }

  async getAssignmentSubmissions(user: any, assignmentId: string) {
    const assignment: any = await this.assignmentModel.findOne({ id: assignmentId }).lean();
    if (!assignment) {
      throw new NotFoundException(`Assignment ${assignmentId} not found`);
    }

    const isAdmin = user?.role?.toUpperCase() === 'ADMIN';
    if (!isAdmin && assignment.educatorId && assignment.educatorId !== user.id) {
      throw new ForbiddenException('Access denied to submissions for this assignment.');
    }

    return this.submissionModel.find({ assignmentId }).sort({ submittedAt: -1 }).lean();
  }

  async getLearnerSubmissions(user: any) {
    return this.submissionModel.find({ learnerId: user.id }).sort({ submittedAt: -1 }).lean();
  }

  /**
   * Educator reviews submission, grades rubric, stores verified evidence and recalculates readiness
   */
  async reviewSubmission(
    user: any,
    submissionId: string,
    reviewData: {
      score: number;
      feedback: string;
      rubricScores?: Array<{ criteria: string; pointsAwarded: number; feedback?: string }>;
      revisionRequested?: boolean;
    },
  ) {
    const query: any[] = [{ id: submissionId }];
    if (isValidObjectId(submissionId)) query.push({ _id: submissionId });

    const submission = await this.submissionModel.findOne({ $or: query });
    if (!submission) {
      throw new NotFoundException(`Submission ${submissionId} not found`);
    }

    const assignment = await this.assignmentModel.findOne({ id: submission.assignmentId }).lean();
    const isAdmin = user?.role?.toUpperCase() === 'ADMIN';
    if (!isAdmin && assignment?.educatorId && assignment.educatorId !== user.id) {
      throw new ForbiddenException('You are not authorized to grade this assignment.');
    }

    const isRevision = !!reviewData.revisionRequested;
    submission.score = reviewData.score;
    submission.feedback = reviewData.feedback;
    submission.rubricScores = reviewData.rubricScores || [];
    submission.status = isRevision ? 'revision_requested' : 'reviewed';
    submission.reviewerId = user.id;
    submission.reviewedAt = new Date();
    await submission.save();

    // Workflow 1: Store Verified Skill Evidence & Update Profile
    const targetSkill = assignment?.targetSkill || 'Software Engineering';
    const isVerified = reviewData.score >= 75 && !isRevision;
    const evidenceStatus = isVerified ? 'VERIFIED' : reviewData.score >= 60 ? 'ASSESSED' : 'PRACTICED';

    await this.evidenceModel.create({
      id: `evi-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      userId: submission.learnerId,
      skillId: targetSkill.toLowerCase().replace(/[^a-z0-9]/g, '-'),
      skillName: targetSkill,
      evidenceType: 'PROJECT',
      status: evidenceStatus,
      title: `Assignment Deliverable: ${assignment?.title || 'Course Project'}`,
      description: `Graded by ${user.name || 'Faculty'}: ${reviewData.feedback}`,
      score: reviewData.score,
      verified: isVerified,
      issuer: user.name || 'Skillora Lead Faculty',
    });

    // Update Learner Profile skill graph & readiness
    const profile = await this.profileModel.findOne({ userId: submission.learnerId });
    if (profile) {
      const skills = profile.skills || [];
      const skillIdx = skills.findIndex((s: any) => s.name.toLowerCase() === targetSkill.toLowerCase());

      if (skillIdx >= 0) {
        skills[skillIdx].proficiency = Math.max(skills[skillIdx].proficiency, reviewData.score);
        if (isVerified) {
          skills[skillIdx].verified = true;
          skills[skillIdx].evidence = Array.from(
            new Set([
              ...(skills[skillIdx].evidence || []),
              `Educator Reviewed Assignment: ${assignment?.title || 'Project'} (${reviewData.score}%) - Verified`,
            ]),
          );
        }
      } else {
        skills.push({
          name: targetSkill,
          category: 'Engineering',
          proficiency: reviewData.score,
          confidence: reviewData.score,
          source: 'PROJECT-VERIFIED',
          verified: isVerified,
          evidence: [`Educator Reviewed Assignment: ${assignment?.title || 'Project'} (${reviewData.score}%)`],
          learningProgress: reviewData.score,
        } as any);
      }
      profile.skills = skills;

      // Recalculate 7-D readiness dimension for projects
      if (profile.readinessDimensions) {
        profile.readinessDimensions.projects = Math.min(
          Math.round((profile.readinessDimensions.projects || 0) * 0.8 + reviewData.score * 0.2),
          100,
        );
      }
      profile.readinessScore = Math.min(
        Math.round((profile.readinessScore || 0) * 0.85 + reviewData.score * 0.15),
        100,
      );
      await profile.save();
    }

    // Notify learner of grade
    await this.notificationModel.create({
      id: `notif-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      userId: submission.learnerId,
      title: isRevision ? `Revision Requested: ${assignment?.title}` : `Assignment Graded: ${assignment?.title}`,
      message: `Score: ${reviewData.score}% — ${reviewData.feedback}`,
      type: 'educator',
      link: '/learner/dashboard',
    });

    return submission.toObject ? submission.toObject() : submission;
  }

  /* =========================================================================
     4. WORKFLOW 3: AGGREGATED EMPLOYER SKILL DEMAND INSIGHTS FOR EDUCATORS
     ========================================================================= */

  async getMarketDemandInsights() {
    const publishedJobs = await this.jobModel.find({ status: 'published' }).lean();

    const skillCounts: Record<string, number> = {};
    const roleCounts: Record<string, number> = {};

    publishedJobs.forEach((j: any) => {
      (j.requiredSkills || []).forEach((sk: string) => {
        skillCounts[sk] = (skillCounts[sk] || 0) + 1;
      });
      if (j.title) {
        roleCounts[j.title] = (roleCounts[j.title] || 0) + 1;
      }
    });

    const topSkills = Object.entries(skillCounts)
      .map(([skill, count]) => ({ skill, count, demandWeight: Math.round((count / (publishedJobs.length || 1)) * 100) }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);

    const topRoles = Object.entries(roleCounts)
      .map(([role, count]) => ({ role, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);

    return {
      totalJobsAnalyzed: publishedJobs.length,
      totalJobsSampled: publishedJobs.length,
      topSkillsDemand: topSkills.map((s) => ({ ...s, percentage: s.demandWeight })),
      topInDemandSkills: topSkills,
      topHiringRoles: topRoles,
      curriculumRecommendation:
        topSkills.length > 0
          ? `High employer demand detected for ${topSkills.slice(0, 3).map((s) => s.skill).join(', ')}. Recommend aligning cohort assignments with these competencies.`
          : 'Monitor upcoming employer job publications to benchmark syllabus.',
      curriculumRecommendations: [
        topSkills.length > 0
          ? `High employer demand detected for ${topSkills.slice(0, 3).map((s) => s.skill).join(', ')}. Recommend aligning cohort assignments with these competencies.`
          : 'Monitor upcoming employer job publications to benchmark syllabus.',
      ],
    };
  }

  /* =========================================================================
     5. AI QUIZ GENERATION & INTERVENTIONS
     ========================================================================= */

  async generateQuiz(params: {
    topic: string;
    category?: string;
    difficulty?: 'Beginner' | 'Intermediate' | 'Advanced';
    questionCount?: number;
    publishDirectly?: boolean;
  }) {
    const generated = await this.aiService.generateQuizForEducator(
      params.topic,
      params.questionCount || 4,
    );

    const assessmentId = `asm-${Date.now()}`;
    const assessment = {
      id: assessmentId,
      title: generated.title,
      category: params.category || 'Engineering',
      skillName: params.topic,
      difficulty: params.difficulty || 'Intermediate',
      durationMinutes: 15,
      passingScore: 75,
      questionsCount: generated.questions?.length || 0,
      questions: (generated.questions || []).map((q: any) => ({
        id: q.id,
        type: 'mcq',
        prompt: q.prompt,
        options: q.options || [],
        correctAnswer: q.correctAnswer,
        explanation: q.explanation || '',
      })),
    };

    if (params.publishDirectly) {
      await this.assessmentModel.create(assessment);
    }

    return {
      success: true,
      assessment,
      isPublished: !!params.publishDirectly,
      message: params.publishDirectly
        ? `Assessment "${assessment.title}" published directly to student catalog in MongoDB!`
        : `Assessment generated for educator review.`,
    };
  }

  async dispatchIntervention(learnerId: string, interventionNote: string, actionType: string = 'Socratic Practice Lab') {
    const query: any[] = [{ userId: learnerId }];
    if (isValidObjectId(learnerId)) query.push({ _id: learnerId });

    const profile = await this.profileModel.findOne({ $or: query });
    if (!profile) {
      throw new NotFoundException(`Learner ${learnerId} not found`);
    }

    const skills = profile.skills || [];
    skills.forEach((s: any) => {
      if ((s.proficiency || 0) < 70) {
        s.evidence = Array.from(new Set([...(s.evidence || []), `Educator Intervention Assigned: ${actionType} - "${interventionNote}"`]));
      }
    });
    profile.skills = skills;
    await profile.save();

    await this.notificationModel.create({
      id: `notif-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      userId: learnerId,
      title: `Educator Assigned Intervention: ${actionType}`,
      message: interventionNote,
      type: 'educator',
      link: '/learner/learning/ai-teacher',
    });

    return {
      success: true,
      learnerId,
      learnerName: profile.name,
      actionType,
      interventionNote,
      dispatchedAt: new Date().toISOString(),
    };
  }
}
