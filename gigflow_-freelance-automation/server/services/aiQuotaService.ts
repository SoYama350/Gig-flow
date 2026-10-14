import { PrismaClient } from "../src/generated/prisma/client.js";

export const DAILY_FREE_AI_LIMIT = 5;

export interface AiUsageStatus {
  allowed: boolean;
  usedToday: number;
  remainingFree: number;
  credits: number;
  tier: string;
  limit: number;
  message?: string;
}

export class AiQuotaService {
  /**
   * Get the current date in YYYY-MM-DD format (UTC).
   */
  static getTodayDateString(): string {
    return new Date().toISOString().slice(0, 10);
  }

  /**
   * Check if a user is eligible to make an AI generation request.
   */
  static async checkQuota(prisma: PrismaClient, userId: string): Promise<AiUsageStatus> {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        aiUsageToday: true,
        aiUsageDate: true,
        aiCredits: true,
        subscriptionTier: true,
      },
    });

    if (!user) {
      return {
        allowed: false,
        usedToday: 0,
        remainingFree: 0,
        credits: 0,
        tier: "FREE",
        limit: DAILY_FREE_AI_LIMIT,
        message: "User not found",
      };
    }

    const today = this.getTodayDateString();
    let currentUsageToday = user.aiUsageToday;

    // Reset daily counter if day changed
    if (user.aiUsageDate !== today) {
      currentUsageToday = 0;
      await prisma.user.update({
        where: { id: userId },
        data: {
          aiUsageToday: 0,
          aiUsageDate: today,
        },
      });
    }

    if (user.subscriptionTier === "UNLIMITED") {
      return {
        allowed: true,
        usedToday: currentUsageToday,
        remainingFree: 9999,
        credits: user.aiCredits,
        tier: "UNLIMITED",
        limit: 9999,
      };
    }

    const remainingFree = Math.max(0, DAILY_FREE_AI_LIMIT - currentUsageToday);
    const hasRemainingFree = remainingFree > 0;
    const hasCredits = user.aiCredits > 0;

    const allowed = hasRemainingFree || hasCredits;

    return {
      allowed,
      usedToday: currentUsageToday,
      remainingFree,
      credits: user.aiCredits,
      tier: user.subscriptionTier,
      limit: DAILY_FREE_AI_LIMIT,
      message: allowed
        ? undefined
        : "لقد استنفدت الحد اليومي المجاني (5 استخدامات/يوم). يرجى شحن رصيدك أو الترقية للمتابعة.",
    };
  }

  /**
   * Deduct quota or credits upon a successful AI generation.
   */
  static async consumeQuota(prisma: PrismaClient, userId: string): Promise<AiUsageStatus> {
    const status = await this.checkQuota(prisma, userId);
    if (!status.allowed) {
      throw new Error(status.message || "AI limit exceeded");
    }

    const today = this.getTodayDateString();

    if (status.remainingFree > 0) {
      // Use free daily quota
      const updated = await prisma.user.update({
        where: { id: userId },
        data: {
          aiUsageToday: { increment: 1 },
          aiUsageDate: today,
        },
      });
      return {
        allowed: true,
        usedToday: updated.aiUsageToday,
        remainingFree: Math.max(0, DAILY_FREE_AI_LIMIT - updated.aiUsageToday),
        credits: updated.aiCredits,
        tier: updated.subscriptionTier,
        limit: DAILY_FREE_AI_LIMIT,
      };
    } else if (status.credits > 0) {
      // Deduct from paid credits
      const updated = await prisma.user.update({
        where: { id: userId },
        data: {
          aiCredits: { decrement: 1 },
        },
      });
      return {
        allowed: true,
        usedToday: updated.aiUsageToday,
        remainingFree: 0,
        credits: updated.aiCredits,
        tier: updated.subscriptionTier,
        limit: DAILY_FREE_AI_LIMIT,
      };
    }

    return status;
  }
}
