/**
 * 团队协作管理器
 * v0.7.0 Phase 4 - 协作功能
 * 
 * 功能:
 * - 团队空间管理
 * - 共享书签库
 * - 权限管理
 * - 操作日志
 * - 评论系统
 */

import * as fs from 'fs';
import * as path from 'path';

export interface Team {
  id: string;
  name: string;
  description?: string;
  createdAt: string;
  owner: string;
  members: TeamMember[];
}

export interface TeamMember {
  userId: string;
  email: string;
  name: string;
  role: 'owner' | 'admin' | 'member' | 'viewer';
  joinedAt: string;
}

export interface SharedBookmark {
  id: string;
  bookmarkId: string;
  teamId: string;
  sharedBy: string;
  sharedAt: string;
  permissions: 'read' | 'write' | 'admin';
}

export interface Comment {
  id: string;
  bookmarkId: string;
  userId: string;
  userName: string;
  content: string;
  createdAt: string;
  updatedAt?: string;
}

export interface ActivityLog {
  id: string;
  teamId: string;
  userId: string;
  action: string;
  resource: string;
  timestamp: string;
  details?: string;
}

export class TeamManager {
  private readonly storageDir: string;
  private readonly teamsPath: string;
  private readonly bookmarksPath: string;
  private readonly commentsPath: string;
  private readonly logsPath: string;

  constructor(storageDir?: string) {
    const dir = storageDir || path.join(process.env.HOME || '~', '.dbmanager', 'teams');
    
    this.storageDir = dir;
    this.teamsPath = path.join(dir, 'teams.json');
    this.bookmarksPath = path.join(dir, 'shared_bookmarks.json');
    this.commentsPath = path.join(dir, 'comments.json');
    this.logsPath = path.join(dir, 'activity_logs.json');

    // 确保目录存在
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
  }

  /**
   * 创建团队
   */
  createTeam(name: string, ownerEmail: string): { success: boolean; team?: Team; error?: string } {
    try {
      const teams = this.loadTeams();
      
      // 检查是否已存在
      if (teams.some(t => t.name === name)) {
        return { success: false, error: '团队名称已存在' };
      }

      const team: Team = {
        id: `team_${Date.now()}`,
        name,
        createdAt: new Date().toISOString(),
        owner: ownerEmail,
        description: '',
        members: [{
          userId: `user_${Date.now()}`,
          email: ownerEmail,
          name: ownerEmail.split('@')[0],
          role: 'owner',
          joinedAt: new Date().toISOString(),
        }],
      };

      teams.push(team);
      this.saveTeams(teams);
      this.logActivity(team.id, ownerEmail, 'create_team', `创建了团队 "${name}"`);

      return { success: true, team };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      return { success: false, error: errorMessage };
    }
  }

  /**
   * 邀请成员
   */
  inviteMember(teamId: string, email: string, role: 'admin' | 'member' | 'viewer' = 'member'): {
    success: boolean;
    error?: string;
  } {
    try {
      const teams = this.loadTeams();
      const team = teams.find(t => t.id === teamId);

      if (!team) {
        return { success: false, error: '团队不存在' };
      }

      // 检查是否已是成员
      if (team.members.some(m => m.email === email)) {
        return { success: false, error: '该用户已是团队成员' };
      }

      team.members.push({
        userId: `user_${Date.now()}`,
        email,
        name: email.split('@')[0],
        role,
        joinedAt: new Date().toISOString(),
      });

      this.saveTeams(teams);
      this.logActivity(teamId, email, 'invite_member', `邀请了 ${email} 加入团队`);

      return { success: true };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      return { success: false, error: errorMessage };
    }
  }

  /**
   * 分享书签到团队
   */
  shareBookmark(
    teamId: string,
    bookmarkId: string,
    sharedBy: string,
    permissions: 'read' | 'write' | 'admin' = 'read'
  ): { success: boolean; sharedBookmark?: SharedBookmark; error?: string } {
    try {
      const bookmarks = this.loadSharedBookmarks();
      
      const sharedBookmark: SharedBookmark = {
        id: `share_${Date.now()}`,
        bookmarkId,
        teamId,
        sharedBy,
        sharedAt: new Date().toISOString(),
        permissions,
      };

      bookmarks.push(sharedBookmark);
      this.saveSharedBookmarks(bookmarks);
      this.logActivity(teamId, sharedBy, 'share_bookmark', `分享了书签 ${bookmarkId}`);

      return { success: true, sharedBookmark };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      return { success: false, error: errorMessage };
    }
  }

  /**
   * 获取团队共享书签
   */
  getTeamBookmarks(teamId: string): SharedBookmark[] {
    const bookmarks = this.loadSharedBookmarks();
    return bookmarks.filter(b => b.teamId === teamId);
  }

  /**
   * 添加评论
   */
  addComment(bookmarkId: string, userId: string, userName: string, content: string): {
    success: boolean;
    comment?: Comment;
    error?: string;
  } {
    try {
      const comments = this.loadComments();
      
      const comment: Comment = {
        id: `comment_${Date.now()}`,
        bookmarkId,
        userId,
        userName,
        content,
        createdAt: new Date().toISOString(),
      };

      comments.push(comment);
      this.saveComments(comments);

      return { success: true, comment };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      return { success: false, error: errorMessage };
    }
  }

  /**
   * 获取书签评论
   */
  getComments(bookmarkId: string): Comment[] {
    const comments = this.loadComments();
    return comments.filter(c => c.bookmarkId === bookmarkId);
  }

  /**
   * 获取活动日志
   */
  getActivityLogs(teamId: string, limit: number = 50): ActivityLog[] {
    const logs = this.loadLogs();
    return logs
      .filter(l => l.teamId === teamId)
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
      .slice(0, limit);
  }

  /**
   * 获取团队列表
   */
  listTeams(): Team[] {
    return this.loadTeams();
  }

  /**
   * 获取团队详情
   */
  getTeam(teamId: string): Team | undefined {
    const teams = this.loadTeams();
    return teams.find(t => t.id === teamId);
  }

  /**
   * 记录活动日志
   */
  private logActivity(teamId: string, userId: string, action: string, details?: string): void {
    try {
      const logs = this.loadLogs();
      
      logs.push({
        id: `log_${Date.now()}`,
        teamId,
        userId,
        action,
        resource: 'team',
        timestamp: new Date().toISOString(),
        details,
      });

      // 保留最近 1000 条
      this.saveLogs(logs.slice(-1000));
    } catch {
      // 忽略日志记录失败
    }
  }

  /**
   * 加载团队数据
   */
  private loadTeams(): Team[] {
    try {
      if (!fs.existsSync(this.teamsPath)) {
        return [];
      }
      const data = fs.readFileSync(this.teamsPath, 'utf-8');
      return JSON.parse(data);
    } catch {
      return [];
    }
  }

  /**
   * 保存团队数据
   */
  private saveTeams(teams: Team[]): void {
    fs.writeFileSync(this.teamsPath, JSON.stringify(teams, null, 2), 'utf-8');
  }

  /**
   * 加载共享书签
   */
  private loadSharedBookmarks(): SharedBookmark[] {
    try {
      if (!fs.existsSync(this.bookmarksPath)) {
        return [];
      }
      const data = fs.readFileSync(this.bookmarksPath, 'utf-8');
      return JSON.parse(data);
    } catch {
      return [];
    }
  }

  /**
   * 保存共享书签
   */
  private saveSharedBookmarks(bookmarks: SharedBookmark[]): void {
    fs.writeFileSync(this.bookmarksPath, JSON.stringify(bookmarks, null, 2), 'utf-8');
  }

  /**
   * 加载评论
   */
  private loadComments(): Comment[] {
    try {
      if (!fs.existsSync(this.commentsPath)) {
        return [];
      }
      const data = fs.readFileSync(this.commentsPath, 'utf-8');
      return JSON.parse(data);
    } catch {
      return [];
    }
  }

  /**
   * 保存评论
   */
  private saveComments(comments: Comment[]): void {
    fs.writeFileSync(this.commentsPath, JSON.stringify(comments, null, 2), 'utf-8');
  }

  /**
   * 加载日志
   */
  private loadLogs(): ActivityLog[] {
    try {
      if (!fs.existsSync(this.logsPath)) {
        return [];
      }
      const data = fs.readFileSync(this.logsPath, 'utf-8');
      return JSON.parse(data);
    } catch {
      return [];
    }
  }

  /**
   * 保存日志
   */
  private saveLogs(logs: ActivityLog[]): void {
    fs.writeFileSync(this.logsPath, JSON.stringify(logs, null, 2), 'utf-8');
  }
}

export default TeamManager;
