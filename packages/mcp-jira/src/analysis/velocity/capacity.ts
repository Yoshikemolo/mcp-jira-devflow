/**
 * Capacity Forecaster
 *
 * Calculates team capacity and recommends sprint load.
 */

import type { JiraUser, SprintVelocityEntry } from "../../domain/types.js";
import type {
  CapacityForecast,
  CapacityOptions,
  TeamMemberAvailability,
} from "./types.js";

/**
 * Default capacity options.
 */
const DEFAULT_SPRINT_DAYS = 10;
const DEFAULT_MEETING_OVERHEAD = 0.15;
const DEFAULT_BUFFER_PERCENTAGE = 0.1;

/**
 * Default points per person-day if no historical data.
 */
const DEFAULT_POINTS_PER_DAY = 1.0;

/**
 * Calculates points per person-day from historical velocity.
 */
function calculatePointsPerPersonDay(
  velocitySprints: readonly SprintVelocityEntry[],
  teamSize: number,
  sprintDays: number,
  meetingOverhead: number
): number {
  if (velocitySprints.length === 0 || teamSize === 0) {
    return DEFAULT_POINTS_PER_DAY;
  }

  // Calculate average velocity
  const totalPoints = velocitySprints.reduce(
    (sum, s) => sum + s.completedPoints,
    0
  );
  const avgVelocity = totalPoints / velocitySprints.length;

  // Calculate effective person-days per sprint
  const effectiveCapacity = teamSize * sprintDays * (1 - meetingOverhead);

  if (effectiveCapacity === 0) {
    return DEFAULT_POINTS_PER_DAY;
  }

  return Math.round((avgVelocity / effectiveCapacity) * 100) / 100;
}

/**
 * Calculates capacity forecast for a team.
 *
 * @param teamMembers - List of team members (for availability tracking)
 * @param options - Capacity calculation options
 * @returns Capacity forecast
 */
export function forecastCapacity(
  teamMembers?: readonly { user: JiraUser; availabilityFactor?: number }[],
  options: CapacityOptions = {}
): CapacityForecast {
  // Extract options with defaults
  const sprintDays = options.sprintDays !== undefined ? options.sprintDays : DEFAULT_SPRINT_DAYS;
  const meetingOverhead = options.meetingOverhead !== undefined ? options.meetingOverhead : DEFAULT_MEETING_OVERHEAD;
  const bufferPercentage = options.bufferPercentage !== undefined ? options.bufferPercentage : DEFAULT_BUFFER_PERCENTAGE;
  const velocitySprints = options.velocitySprints ?? [];

  const factors: string[] = [];
  let memberCapacity: TeamMemberAvailability[] | undefined;
  let totalCapacity: number;

  if (teamMembers && teamMembers.length > 0) {
    // Calculate from team member availability
    memberCapacity = teamMembers.map((member) => {
      const availabilityFactor = member.availabilityFactor ?? 1.0;
      const availableDays = sprintDays * availabilityFactor;
      const effectiveCapacity = availableDays * (1 - meetingOverhead);

      return {
        memberId: member.user.accountId,
        displayName: member.user.displayName,
        availableDays,
        availabilityFactor,
        effectiveCapacity: Math.round(effectiveCapacity * 10) / 10,
      };
    });

    totalCapacity = memberCapacity.reduce(
      (sum, m) => sum + m.availableDays,
      0
    );

    factors.push(`Team of ${teamMembers.length} member(s)`);
  } else {
    // Use velocity data to infer team size
    if (velocitySprints.length > 0) {
      // Estimate team size from velocity patterns (rough estimate)
      const avgVelocity = velocitySprints.reduce(
        (sum, s) => sum + s.completedPoints,
        0
      ) / velocitySprints.length;

      // Assume ~1 point per person-day as baseline
      const estimatedTeamSize = Math.ceil(avgVelocity / (sprintDays * 0.7));
      totalCapacity = estimatedTeamSize * sprintDays;

      factors.push(`Estimated team size from velocity: ~${estimatedTeamSize}`);
      factors.push("For accurate capacity, provide team member list");
    } else {
      // No data available - return minimal forecast
      totalCapacity = 0;
      factors.push("No team data or velocity history available");
      factors.push("Provide team members or velocity sprints for forecast");
    }
  }

  // Calculate effective capacity after meetings
  const effectiveCapacity = Math.round(totalCapacity * (1 - meetingOverhead) * 10) / 10;

  // Calculate points per person-day
  const teamSize = memberCapacity?.length ?? Math.ceil(totalCapacity / sprintDays);
  const pointsPerPersonDay = calculatePointsPerPersonDay(
    velocitySprints,
    teamSize,
    sprintDays,
    meetingOverhead
  );

  // Calculate recommended points
  const rawRecommendedPoints = effectiveCapacity * pointsPerPersonDay;
  const recommendedPoints = Math.round(rawRecommendedPoints * (1 - bufferPercentage) * 10) / 10;
  const maxPoints = Math.round(rawRecommendedPoints * 10) / 10;

  // Calculate confidence
  let confidence = 0.5; // Base confidence
  if (velocitySprints.length >= 3) {
    confidence += 0.2;
  }
  if (velocitySprints.length >= 5) {
    confidence += 0.1;
  }
  if (memberCapacity && memberCapacity.length > 0) {
    confidence += 0.2;
  }
  confidence = Math.min(1, Math.round(confidence * 100) / 100);

  // Add contextual factors
  if (meetingOverhead > 0.2) {
    factors.push("High meeting overhead (>20%) reduces capacity");
  }
  if (bufferPercentage > 0.15) {
    factors.push("Conservative buffer applied for risk mitigation");
  }
  if (velocitySprints.length > 0) {
    factors.push(`Based on ${velocitySprints.length} sprint(s) of history`);
    factors.push(`Points per person-day: ${pointsPerPersonDay}`);
  }

  return {
    sprintDays,
    totalCapacity: Math.round(totalCapacity * 10) / 10,
    effectiveCapacity,
    meetingOverhead,
    recommendedBuffer: bufferPercentage,
    recommendedPoints,
    maxPoints,
    memberCapacity,
    pointsPerPersonDay,
    confidence,
    factors,
  };
}

/**
 * Estimates capacity for a specific sprint.
 */
export function forecastSprintCapacity(
  sprintId: number,
  sprintName: string,
  teamMembers?: readonly { user: JiraUser; availabilityFactor?: number }[],
  options: CapacityOptions = {}
): CapacityForecast {
  const forecast = forecastCapacity(teamMembers, options);

  return {
    ...forecast,
    sprintId,
    sprintName,
  };
}

/**
 * Calculates adjustment factor for special periods.
 */
export function getSeasonalAdjustment(
  startDate: Date,
  endDate: Date
): { factor: number; reason?: string } {
  const startMonth = startDate.getMonth();
  const endMonth = endDate.getMonth();

  // End of quarter
  if (endMonth === 2 || endMonth === 5 || endMonth === 8 || endMonth === 11) {
    return {
      factor: 0.9,
      reason: "End of quarter - expect 10% reduction for demos and releases",
    };
  }

  // December holidays
  if (startMonth === 11 || endMonth === 11) {
    return {
      factor: 0.8,
      reason: "Holiday period - expect 20% reduction for team absences",
    };
  }

  // Summer months
  if (startMonth >= 5 && startMonth <= 7) {
    return {
      factor: 0.95,
      reason: "Summer period - expect slight reduction for vacations",
    };
  }

  return { factor: 1.0 };
}

/**
 * Suggests capacity adjustments based on team changes.
 */
export function getTeamChangeAdjustment(
  newMemberCount: number,
  leavingMemberCount: number,
  _teamSize: number
): { factor: number; reason?: string } {
  if (newMemberCount === 0 && leavingMemberCount === 0) {
    return { factor: 1.0 };
  }

  let factor = 1.0;
  const reasons: string[] = [];

  if (newMemberCount > 0) {
    // New members need onboarding, reduce capacity
    const onboardingPenalty = 0.1 * newMemberCount;
    factor -= Math.min(0.3, onboardingPenalty);
    reasons.push(`${newMemberCount} new member(s) onboarding`);
  }

  if (leavingMemberCount > 0) {
    // Knowledge transfer needed
    const transferPenalty = 0.15 * leavingMemberCount;
    factor -= Math.min(0.3, transferPenalty);
    reasons.push(`${leavingMemberCount} member(s) transitioning out`);
  }

  return {
    factor: Math.max(0.5, Math.round(factor * 100) / 100),
    reason: reasons.join("; "),
  };
}

/**
 * Gets capacity recommendation summary.
 */
export function getCapacitySummary(forecast: CapacityForecast): string {
  const lines: string[] = [];

  if (forecast.sprintName) {
    lines.push(`Sprint: ${forecast.sprintName}`);
  }

  lines.push(`Sprint Duration: ${forecast.sprintDays} days`);
  lines.push(`Team Capacity: ${forecast.totalCapacity} person-days`);
  lines.push(`Effective (after meetings): ${forecast.effectiveCapacity} person-days`);
  lines.push(`Recommended Load: ${forecast.recommendedPoints} points`);
  lines.push(`Maximum Load: ${forecast.maxPoints} points`);
  lines.push(`Confidence: ${Math.round(forecast.confidence * 100)}%`);

  return lines.join("\n");
}
