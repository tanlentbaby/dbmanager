/**
 * 模板市场管理器
 * v0.7.0 Phase 5 - 社区模板
 * 
 * 功能:
 * - 社区模板库
 * - 模板上传/下载
 * - 评分和收藏
 * - 分类浏览
 * - 搜索
 */

import * as fs from 'fs';
import * as path from 'path';

export interface Template {
  id: string;
  name: string;
  description: string;
  sql: string;
  category: string;
  tags: string[];
  author: string;
  downloads: number;
  rating: number;
  ratingsCount: number;
  createdAt: string;
  updatedAt: string;
  isCommunity: boolean;
}

export interface TemplateReview {
  id: string;
  templateId: string;
  userId: string;
  rating: number;
  comment: string;
  createdAt: string;
}

export class TemplateMarketManager {
  private readonly storageDir: string;
  private readonly templatesPath: string;
  private readonly reviewsPath: string;
  private readonly favoritesPath: string;

  constructor(storageDir?: string) {
    const dir = storageDir || path.join(process.env.HOME || '~', '.dbmanager', 'market');
    
    this.storageDir = dir;
    this.templatesPath = path.join(dir, 'templates.json');
    this.reviewsPath = path.join(dir, 'reviews.json');
    this.favoritesPath = path.join(dir, 'favorites.json');

    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }

    // 初始化内置模板
    this.initializeBuiltInTemplates();
  }

  /**
   * 初始化内置模板
   */
  private initializeBuiltInTemplates(): void {
    const templates = this.loadTemplates();
    
    if (templates.length > 0) {
      return; // 已有模板
    }

    const builtInTemplates: Template[] = [
      {
        id: 'tpl_001',
        name: '查询所有表',
        description: '列出数据库中所有表',
        sql: "SELECT table_name FROM information_schema.tables WHERE table_schema = '{{database}}'",
        category: 'basic',
        tags: ['表结构', '信息'],
        author: 'DBManager',
        downloads: 0,
        rating: 5,
        ratingsCount: 0,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        isCommunity: false,
      },
      {
        id: 'tpl_002',
        name: '表结构查询',
        description: '查看表的列信息',
        sql: "SELECT column_name, data_type, is_nullable FROM information_schema.columns WHERE table_name = '{{table}}'",
        category: 'basic',
        tags: ['表结构', '列'],
        author: 'DBManager',
        downloads: 0,
        rating: 5,
        ratingsCount: 0,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        isCommunity: false,
      },
      {
        id: 'tpl_003',
        name: '最近 N 条记录',
        description: '查询表中最近的记录',
        sql: "SELECT * FROM {{table}} ORDER BY {{created_at_column}} DESC LIMIT {{n}}",
        category: 'basic',
        tags: ['查询', '排序'],
        author: 'DBManager',
        downloads: 0,
        rating: 5,
        ratingsCount: 0,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        isCommunity: false,
      },
      {
        id: 'tpl_004',
        name: '分组统计',
        description: '按字段分组统计',
        sql: "SELECT {{group_column}}, COUNT(*) as count, AVG({{value_column}}) as avg FROM {{table}} GROUP BY {{group_column}} ORDER BY count DESC",
        category: 'analytics',
        tags: ['统计', '分组'],
        author: 'DBManager',
        downloads: 0,
        rating: 5,
        ratingsCount: 0,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        isCommunity: false,
      },
      {
        id: 'tpl_005',
        name: 'JOIN 查询',
        description: '两表关联查询',
        sql: "SELECT {{select_columns}} FROM {{table1}} t1 JOIN {{table2}} t2 ON t1.{{join_column}} = t2.{{join_column}} WHERE {{condition}}",
        category: 'advanced',
        tags: ['JOIN', '关联'],
        author: 'DBManager',
        downloads: 0,
        rating: 5,
        ratingsCount: 0,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        isCommunity: false,
      },
    ];

    this.saveTemplates(builtInTemplates);
  }

  /**
   * 浏览模板
   */
  browseTemplates(category?: string, tag?: string): Template[] {
    let templates = this.loadTemplates();

    if (category) {
      templates = templates.filter(t => t.category === category);
    }

    if (tag) {
      templates = templates.filter(t => t.tags.includes(tag));
    }

    return templates.sort((a, b) => b.downloads - a.downloads);
  }

  /**
   * 搜索模板
   */
  searchTemplates(query: string): Template[] {
    const templates = this.loadTemplates();
    const lowerQuery = query.toLowerCase();

    return templates.filter(t =>
      t.name.toLowerCase().includes(lowerQuery) ||
      t.description.toLowerCase().includes(lowerQuery) ||
      t.tags.some(tag => tag.toLowerCase().includes(lowerQuery))
    );
  }

  /**
   * 获取模板详情
   */
  getTemplate(templateId: string): Template | undefined {
    const templates = this.loadTemplates();
    return templates.find(t => t.id === templateId);
  }

  /**
   * 下载/安装模板
   */
  downloadTemplate(templateId: string): { success: boolean; template?: Template; error?: string } {
    const template = this.getTemplate(templateId);
    
    if (!template) {
      return { success: false, error: '模板不存在' };
    }

    // 增加下载计数
    template.downloads++;
    this.saveTemplates(this.loadTemplates());

    return { success: true, template };
  }

  /**
   * 上传模板到市场
   */
  uploadTemplate(
    name: string,
    sql: string,
    description: string,
    category: string,
    tags: string[],
    author: string
  ): { success: boolean; template?: Template; error?: string } {
    try {
      const templates = this.loadTemplates();
      
      const template: Template = {
        id: `tpl_${Date.now()}`,
        name,
        sql,
        description,
        category,
        tags,
        author,
        downloads: 0,
        rating: 0,
        ratingsCount: 0,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        isCommunity: true,
      };

      templates.push(template);
      this.saveTemplates(templates);

      return { success: true, template };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      return { success: false, error: errorMessage };
    }
  }

  /**
   * 评分
   */
  rateTemplate(templateId: string, userId: string, rating: number): { success: boolean; error?: string } {
    if (rating < 1 || rating > 5) {
      return { success: false, error: '评分必须在 1-5 之间' };
    }

    const templates = this.loadTemplates();
    const template = templates.find(t => t.id === templateId);

    if (!template) {
      return { success: false, error: '模板不存在' };
    }

    // 更新评分
    const totalRating = template.rating * template.ratingsCount + rating;
    template.ratingsCount++;
    template.rating = Math.round((totalRating / template.ratingsCount) * 10) / 10;

    this.saveTemplates(templates);

    // 保存评论
    const reviews = this.loadReviews();
    reviews.push({
      id: `review_${Date.now()}`,
      templateId,
      userId,
      rating,
      comment: '',
      createdAt: new Date().toISOString(),
    });
    this.saveReviews(reviews);

    return { success: true };
  }

  /**
   * 收藏模板
   */
  favoriteTemplate(templateId: string, userId: string): { success: boolean; error?: string } {
    try {
      const favorites = this.loadFavorites();
      
      if (!favorites.some(f => f.templateId === templateId && f.userId === userId)) {
        favorites.push({ templateId, userId, createdAt: new Date().toISOString() });
        this.saveFavorites(favorites);
      }

      return { success: true };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      return { success: false, error: errorMessage };
    }
  }

  /**
   * 获取分类列表
   */
  getCategories(): { id: string; name: string; count: number }[] {
    const templates = this.loadTemplates();
    const categoryMap = new Map<string, number>();

    templates.forEach(t => {
      categoryMap.set(t.category, (categoryMap.get(t.category) || 0) + 1);
    });

    const categoryNames: Record<string, string> = {
      basic: '基础查询',
      analytics: '数据分析',
      advanced: '高级查询',
      optimization: '性能优化',
      maintenance: '维护管理',
    };

    return Array.from(categoryMap.entries()).map(([id, count]) => ({
      id,
      name: categoryNames[id] || id,
      count,
    }));
  }

  /**
   * 获取标签云
   */
  getTags(): { tag: string; count: number }[] {
    const templates = this.loadTemplates();
    const tagMap = new Map<string, number>();

    templates.forEach(t => {
      t.tags.forEach(tag => {
        tagMap.set(tag, (tagMap.get(tag) || 0) + 1);
      });
    });

    return Array.from(tagMap.entries())
      .map(([tag, count]) => ({ tag, count }))
      .sort((a, b) => b.count - a.count);
  }

  /**
   * 获取我的模板
   */
  getMyTemplates(author: string): Template[] {
    const templates = this.loadTemplates();
    return templates.filter(t => t.author === author);
  }

  /**
   * 获取收藏的模板
   */
  getFavorites(userId: string): Template[] {
    const favorites = this.loadFavorites();
    const favoriteIds = favorites.filter(f => f.userId === userId).map(f => f.templateId);
    
    const templates = this.loadTemplates();
    return templates.filter(t => favoriteIds.includes(t.id));
  }

  /**
   * 导出模板
   */
  exportTemplates(templateIds?: string[]): string {
    let templates = this.loadTemplates();
    
    if (templateIds && templateIds.length > 0) {
      templates = templates.filter(t => templateIds.includes(t.id));
    }

    return JSON.stringify(templates, null, 2);
  }

  /**
   * 导入模板
   */
  importTemplates(json: string): { success: number; failed: number; errors: string[] } {
    try {
      const imported = JSON.parse(json);
      const templates = this.loadTemplates();
      
      let success = 0;
      let failed = 0;
      const errors: string[] = [];

      if (!Array.isArray(imported)) {
        return { success: 0, failed: 1, errors: ['无效的 JSON 格式'] };
      }

      for (const tpl of imported) {
        try {
          if (!tpl.id || !tpl.name || !tpl.sql) {
            errors.push(`缺少必要字段：${tpl.name || '未知'}`);
            failed++;
            continue;
          }

          // 生成新 ID 避免冲突
          tpl.id = `tpl_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
          tpl.isCommunity = true;
          tpl.downloads = 0;
          
          templates.push(tpl as Template);
          success++;
        } catch (error) {
          errors.push(`导入失败：${tpl.name || '未知'} - ${error}`);
          failed++;
        }
      }

      this.saveTemplates(templates);
      return { success, failed, errors };
    } catch (error) {
      return {
        success: 0,
        failed: 1,
        errors: [`JSON 解析失败：${error instanceof Error ? error.message : String(error)}`],
      };
    }
  }

  /**
   * 加载模板
   */
  private loadTemplates(): Template[] {
    try {
      if (!fs.existsSync(this.templatesPath)) {
        return [];
      }
      const data = fs.readFileSync(this.templatesPath, 'utf-8');
      return JSON.parse(data);
    } catch {
      return [];
    }
  }

  /**
   * 保存模板
   */
  private saveTemplates(templates: Template[]): void {
    fs.writeFileSync(this.templatesPath, JSON.stringify(templates, null, 2), 'utf-8');
  }

  /**
   * 加载评论
   */
  private loadReviews(): TemplateReview[] {
    try {
      if (!fs.existsSync(this.reviewsPath)) {
        return [];
      }
      const data = fs.readFileSync(this.reviewsPath, 'utf-8');
      return JSON.parse(data);
    } catch {
      return [];
    }
  }

  /**
   * 保存评论
   */
  private saveReviews(reviews: TemplateReview[]): void {
    fs.writeFileSync(this.reviewsPath, JSON.stringify(reviews, null, 2), 'utf-8');
  }

  /**
   * 加载收藏
   */
  private loadFavorites(): { templateId: string; userId: string; createdAt: string }[] {
    try {
      if (!fs.existsSync(this.favoritesPath)) {
        return [];
      }
      const data = fs.readFileSync(this.favoritesPath, 'utf-8');
      return JSON.parse(data);
    } catch {
      return [];
    }
  }

  /**
   * 保存收藏
   */
  private saveFavorites(favorites: { templateId: string; userId: string; createdAt: string }[]): void {
    fs.writeFileSync(this.favoritesPath, JSON.stringify(favorites, null, 2), 'utf-8');
  }
}

export default TemplateMarketManager;
