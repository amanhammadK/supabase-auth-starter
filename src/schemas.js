import { z } from "zod";

export const SignUpSchema = z.object({
  email: z.string().email("Valid email is required"),
  password: z.string().min(8, "Password must be at least 8 characters"),
  role: z.enum(["user", "admin", "moderator"]).optional().default("user"),
  metadata: z.record(z.any()).optional(),
});

export const SignInSchema = z.object({
  email: z.string().email("Valid email is required"),
  password: z.string().min(1, "Password is required"),
});

export const GetSessionSchema = z.object({
  accessToken: z.string().min(1, "Access token is required"),
});

export const AssignRoleSchema = z.object({
  userId: z.string().min(1, "User ID is required"),
  role: z.enum(["user", "admin", "moderator", "super_admin"]),
  assignedBy: z.string().min(1, "Assigned by user ID is required"),
});

export const CheckPermissionSchema = z.object({
  userId: z.string().min(1, "User ID is required"),
  permission: z.string().min(1, "Permission is required"),
  resource: z.string().optional(),
});

export const GetAuditLogSchema = z.object({
  userId: z.string().optional(),
  action: z.string().optional(),
  limit: z.number().int().positive().optional().default(50),
  after: z.string().optional(),
});

export const RefreshTokenSchema = z.object({
  refreshToken: z.string().min(1, "Refresh token is required"),
});

export const RevokeSessionSchema = z.object({
  sessionId: z.string().min(1, "Session ID is required"),
  userId: z.string().min(1, "User ID is required"),
});
