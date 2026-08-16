import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import {
  SignUpSchema,
  SignInSchema,
  GetSessionSchema,
  AssignRoleSchema,
  CheckPermissionSchema,
  GetAuditLogSchema,
  RefreshTokenSchema,
  RevokeSessionSchema,
} from "./schemas.js";

const ROLE_PERMISSIONS = {
  user: ["read:own_profile", "update:own_profile", "read:public_content"],
  moderator: ["read:own_profile", "update:own_profile", "read:public_content", "read:all_content", "update:content", "delete:content", "read:users"],
  admin: ["read:own_profile", "update:own_profile", "read:public_content", "read:all_content", "update:content", "delete:content", "read:users", "update:users", "delete:users", "manage:roles", "read:analytics", "manage:settings"],
  super_admin: ["*"],
};

function hashPassword(pw) {
  let hash = 0;
  for (let i = 0; i < pw.length; i++) {
    const char = pw.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash |= 0;
  }
  return `hashed_${Math.abs(hash).toString(36)}_${pw.length}`;
}

function generateToken() {
  return `tok_${Date.now()}_${Math.random().toString(36).slice(2, 10)}${Math.random().toString(36).slice(2, 10)}`;
}

class AuthStore {
  constructor() {
    this.users = new Map();
    this.sessions = new Map();
    this.auditLog = [];
    this.loginAttempts = new Map();
    this.blockedIPs = new Map();
  }

  signUp(email, password, role, metadata) {
    if (this.users.has(email)) return { error: "User already exists" };
    const userId = `usr_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    const user = {
      id: userId,
      email,
      passwordHash: hashPassword(password),
      role,
      metadata: metadata || {},
      createdAt: new Date().toISOString(),
      lastLogin: null,
      loginCount: 0,
      mfaEnabled: false,
    };
    this.users.set(email, user);
    this.logAudit(userId, "signup", { email, role });
    const { passwordHash, ...safe } = user;
    return { user: safe };
  }

  signIn(email, password, ip = "unknown") {
    const blocked = this.blockedIPs.get(ip);
    if (blocked && Date.now() - blocked.blockedAt < 900000) {
      return { error: `IP blocked for ${Math.ceil((900000 - (Date.now() - blocked.blockedAt)) / 60000)} more minutes`, retryAfter: Math.ceil((900000 - (Date.now() - blocked.blockedAt)) / 60000) };
    }
    const user = this.users.get(email);
    if (!user) {
      this.recordFailedAttempt(ip, email);
      return { error: "Invalid credentials" };
    }
    if (user.passwordHash !== hashPassword(password)) {
      this.recordFailedAttempt(ip, email);
      return { error: "Invalid credentials" };
    }
    this.loginAttempts.delete(ip);
    const accessToken = generateToken();
    const refreshToken = generateToken();
    const sessionId = `sess_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    const session = {
      id: sessionId,
      userId: user.id,
      email: user.email,
      role: user.role,
      accessToken,
      refreshToken,
      createdAt: new Date().toISOString(),
      expiresAt: new Date(Date.now() + 3600000).toISOString(),
      refreshExpiresAt: new Date(Date.now() + 30 * 24 * 3600000).toISOString(),
      ip,
      lastActivity: new Date().toISOString(),
      isActive: true,
    };
    this.sessions.set(accessToken, session);
    user.lastLogin = new Date().toISOString();
    user.loginCount++;
    this.logAudit(user.id, "signin", { email, ip, sessionId });
    return { session, user: { id: user.id, email: user.email, role: user.role } };
  }

  recordFailedAttempt(ip, email) {
    const key = `${ip}:${email}`;
    const attempts = (this.loginAttempts.get(key) || 0) + 1;
    this.loginAttempts.set(key, { count: attempts, lastAttempt: Date.now() });
    if (attempts >= 5) {
      this.blockedIPs.set(ip, { blockedAt: Date.now(), reason: "brute_force", attempts });
      this.logAudit(null, "ip_blocked", { ip, email, attempts });
    }
  }

  getSession(accessToken) {
    const session = this.sessions.get(accessToken);
    if (!session) return { error: "Invalid token" };
    if (new Date(session.expiresAt) < new Date()) {
      this.sessions.delete(accessToken);
      return { error: "Session expired" };
    }
    session.lastActivity = new Date().toISOString();
    return { session };
  }

  refreshToken(refreshToken) {
    for (const [token, session] of this.sessions) {
      if (session.refreshToken === refreshToken) {
        if (new Date(session.refreshExpiresAt) < new Date()) {
          this.sessions.delete(token);
          return { error: "Refresh token expired" };
        }
        const newAccessToken = generateToken();
        this.sessions.delete(token);
        session.accessToken = newAccessToken;
        session.createdAt = new Date().toISOString();
        session.expiresAt = new Date(Date.now() + 3600000).toISOString();
        session.lastActivity = new Date().toISOString();
        this.sessions.set(newAccessToken, session);
        this.logAudit(session.userId, "token_refresh", { sessionId: session.id });
        return { session };
      }
    }
    return { error: "Invalid refresh token" };
  }

  revokeSession(sessionId, userId) {
    for (const [token, session] of this.sessions) {
      if (session.id === sessionId && session.userId === userId) {
        this.sessions.delete(token);
        this.logAudit(userId, "session_revoked", { sessionId });
        return { success: true };
      }
    }
    return { error: "Session not found" };
  }

  assignRole(userId, role, assignedBy) {
    for (const [, user] of this.users) {
      if (user.id === userId) {
        const oldRole = user.role;
        user.role = role;
        this.logAudit(assignedBy, "role_assigned", { targetUserId: userId, oldRole, newRole: role });
        return { success: true, userId, oldRole, newRole: role };
      }
    }
    return { error: "User not found" };
  }

  checkPermission(userId, permission, resource) {
    let user = null;
    for (const [, u] of this.users) {
      if (u.id === userId) { user = u; break; }
    }
    if (!user) return { error: "User not found", allowed: false };
    const perms = ROLE_PERMISSIONS[user.role] || [];
    const hasWildcard = perms.includes("*");
    const hasExact = perms.includes(permission);
    const hasResource = resource && perms.includes(`${permission.split(":")[0]}:${resource}`);
    const allowed = hasWildcard || hasExact || hasResource;
    this.logAudit(userId, "permission_check", { permission, resource, allowed, role: user.role });
    return { allowed, userId, role: user.role, permission, resource };
  }

  getAuditLog(userId, action, limit, after) {
    let log = this.auditLog;
    if (userId) log = log.filter((e) => e.userId === userId);
    if (action) log = log.filter((e) => e.action === action);
    if (after) log = log.filter((e) => e.timestamp > after);
    return log.sort((a, b) => b.timestamp.localeCompare(a.timestamp)).slice(0, limit);
  }

  logAudit(userId, action, details) {
    this.auditLog.push({
      id: `log_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      userId,
      action,
      details,
      timestamp: new Date().toISOString(),
    });
    if (this.auditLog.length > 10000) this.auditLog.splice(0, this.auditLog.length - 10000);
  }

  getRateLimitInfo(ip) {
    const blocked = this.blockedIPs.get(ip);
    const attempts = this.loginAttempts.get(ip);
    return { ip, isBlocked: blocked && (Date.now() - blocked.blockedAt < 900000), attempts: attempts?.count || 0, blockedUntil: blocked ? new Date(blocked.blockedAt + 900000).toISOString() : null };
  }
}

const store = new AuthStore();

export class SupabaseAuthStarterServer {
  constructor() {
    this.server = new McpServer({
      name: "supabase-auth-starter",
      version: "1.0.0",
    });
    this.setupTools();
  }

  setupTools() {
    this.server.tool(
      "sign_up",
      "Register a new user with email, password, role assignment, and metadata",
      SignUpSchema.shape,
      async (args) => {
        const result = store.signUp(args.email, args.password, args.role, args.metadata);
        return { content: [{ type: "text", text: JSON.stringify(result, null, 2) }] };
      }
    );

    this.server.tool(
      "sign_in",
      "Authenticate with rate limiting, brute force protection, and session creation",
      SignInSchema.shape,
      async (args) => {
        const result = store.signIn(args.email, args.password, args.ip || "cli");
        return { content: [{ type: "text", text: JSON.stringify(result, null, 2) }] };
      }
    );

    this.server.tool(
      "get_session",
      "Get current session details with automatic expiry check and activity tracking",
      GetSessionSchema.shape,
      async (args) => {
        const result = store.getSession(args.accessToken);
        return { content: [{ type: "text", text: JSON.stringify(result, null, 2) }] };
      }
    );

    this.server.tool(
      "refresh_token",
      "Refresh an expired access token using a valid refresh token",
      RefreshTokenSchema.shape,
      async (args) => {
        const result = store.refreshToken(args.refreshToken);
        return { content: [{ type: "text", text: JSON.stringify(result, null, 2) }] };
      }
    );

    this.server.tool(
      "revoke_session",
      "Revoke/invalidate a specific session by session ID",
      RevokeSessionSchema.shape,
      async (args) => {
        const result = store.revokeSession(args.sessionId, args.userId);
        return { content: [{ type: "text", text: JSON.stringify(result, null, 2) }] };
      }
    );

    this.server.tool(
      "assign_role",
      "Assign a role to a user with full audit trail",
      AssignRoleSchema.shape,
      async (args) => {
        const result = store.assignRole(args.userId, args.role, args.assignedBy);
        return { content: [{ type: "text", text: JSON.stringify(result, null, 2) }] };
      }
    );

    this.server.tool(
      "check_permission",
      "Check if a user has a specific permission based on their role (RBAC)",
      CheckPermissionSchema.shape,
      async (args) => {
        const result = store.checkPermission(args.userId, args.permission, args.resource);
        return { content: [{ type: "text", text: JSON.stringify(result, null, 2) }] };
      }
    );

    this.server.tool(
      "get_audit_log",
      "Retrieve audit log entries filtered by user, action, with pagination",
      GetAuditLogSchema.shape,
      async (args) => {
        const log = store.getAuditLog(args.userId, args.action, args.limit, args.after);
        return { content: [{ type: "text", text: JSON.stringify({ count: log.length, entries: log }, null, 2) }] };
      }
    );

    this.server.tool(
      "get_rate_limit_info",
      "Check rate limiting status and brute force protection for an IP address",
      z.object({ ip: z.string() }).shape,
      async (args) => {
        const info = store.getRateLimitInfo(args.ip);
        return { content: [{ type: "text", text: JSON.stringify(info, null, 2) }] };
      }
    );
  }

  async run() {
    const transport = new StdioServerTransport();
    await this.server.connect(transport);
    console.log("Supabase Auth MCP Server running on stdio");
  }
}
