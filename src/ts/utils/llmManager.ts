/**
 * LLM 集成管理器 - AI 深度增强
 * v0.7.0 Phase 3 - 智能 NL2SQL
 * 
 * 支持:
 * - Bailian (通义千问)
 * - Claude (Anthropic)
 * - OpenAI (GPT)
 * 
 * 功能:
 * - 智能 NL2SQL 转换
 * - SQL 解释
 * - 查询优化建议
 * - 多轮对话
 */

import axios, { AxiosInstance } from 'axios';

export type LLMProvider = 'bailian' | 'claude' | 'openai';

export interface LLMConfig {
  provider: LLMProvider;
  apiKey: string;
  model?: string;
  baseUrl?: string;
}

export interface ConversationMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface NL2SQLResult {
  sql: string;
  explanation: string;
  confidence: number;
  tables?: string[];
}

export interface SQLExplanation {
  summary: string;
  breakdown: string[];
  suggestions: string[];
}

export class LLMManager {
  private config?: LLMConfig;
  private client: AxiosInstance;
  private conversationHistory: ConversationMessage[] = [];

  constructor() {
    this.client = axios.create({
      timeout: 30000,
      headers: {
        'Content-Type': 'application/json',
      },
    });
  }

  /**
   * 配置 LLM 提供商
   */
  configure(config: LLMConfig): void {
    this.config = config;

    if (config.baseUrl) {
      this.client.defaults.baseURL = config.baseUrl;
    }

    // 设置默认模型
    if (!config.model) {
      switch (config.provider) {
        case 'bailian':
          this.config.model = 'qwen-plus';
          break;
        case 'claude':
          this.config.model = 'claude-3-sonnet-20240229';
          break;
        case 'openai':
          this.config.model = 'gpt-4-turbo-preview';
          break;
      }
    }
  }

  /**
   * 自然语言转 SQL
   */
  async nl2sql(
    naturalLanguage: string,
    tableSchema?: string
  ): Promise<{ success: boolean; result?: NL2SQLResult; error?: string }> {
    if (!this.config) {
      return { success: false, error: 'LLM 未配置' };
    }

    const systemPrompt = `你是一个专业的 SQL 专家。请将用户的自然语言查询转换为准确的 SQL 语句。

要求：
1. 只输出 SQL 语句，不要其他解释
2. 使用标准 SQL 语法
3. 考虑性能和最佳实践
4. 如果不确定，使用最合理的假设

如果提供了表结构，请严格基于表结构生成 SQL。`;

    const userPrompt = tableSchema
      ? `表结构:\n${tableSchema}\n\n查询：${naturalLanguage}`
      : `查询：${naturalLanguage}`;

    try {
      const response = await this.callLLM([
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ]);

      if (!response.success || !response.content) {
        return { success: false, error: response.error };
      }

      // 提取 SQL（可能包含在代码块中）
      const sql = this.extractSQL(response.content);
      
      // 生成解释
      const explanation = await this.generateExplanation(sql, naturalLanguage);

      return {
        success: true,
        result: {
          sql,
          explanation,
          confidence: 0.85, // 简化版本，固定置信度
          tables: this.extractTables(sql),
        },
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      return { success: false, error: errorMessage };
    }
  }

  /**
   * 解释 SQL
   */
  async explainSQL(sql: string): Promise<{ success: boolean; result?: SQLExplanation; error?: string }> {
    if (!this.config) {
      return { success: false, error: 'LLM 未配置' };
    }

    const systemPrompt = `你是一个 SQL 教学专家。请用清晰易懂的方式解释 SQL 语句的作用。

要求：
1. 用简洁的中文总结 SQL 的作用
2. 分解每个子句的功能
3. 提供优化建议（如果有）`;

    const userPrompt = `请解释以下 SQL 语句:\n\n\`\`\`sql\n${sql}\n\`\`\``;

    try {
      const response = await this.callLLM([
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ]);

      if (!response.success || !response.content) {
        return { success: false, error: response.error };
      }

      const explanation = this.parseExplanation(response.content);

      return {
        success: true,
        result: explanation,
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      return { success: false, error: errorMessage };
    }
  }

  /**
   * 优化 SQL
   */
  async optimizeSQL(sql: string): Promise<{ success: boolean; optimized?: string; suggestions?: string[]; error?: string }> {
    if (!this.config) {
      return { success: false, error: 'LLM 未配置' };
    }

    const systemPrompt = `你是一个数据库性能优化专家。请分析 SQL 语句并提供优化建议。

要求：
1. 识别性能瓶颈
2. 提供优化后的 SQL
3. 解释优化原因`;

    const userPrompt = `请优化以下 SQL 语句:\n\n\`\`\`sql\n${sql}\n\`\`\``;

    try {
      const response = await this.callLLM([
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ]);

      if (!response.success || !response.content) {
        return { success: false, error: response.error };
      }

      const optimized = this.extractSQL(response.content);
      const suggestions = this.extractSuggestions(response.content);

      return {
        success: true,
        optimized,
        suggestions,
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      return { success: false, error: errorMessage };
    }
  }

  /**
   * 多轮对话（聊天模式）
   */
  async chat(message: string, context?: string): Promise<{ success: boolean; response?: string; error?: string }> {
    if (!this.config) {
      return { success: false, error: 'LLM 未配置' };
    }

    const systemPrompt = `你是一个数据库助手，帮助用户编写和优化 SQL 查询。
你可以：
1. 将自然语言转换为 SQL
2. 解释 SQL 语句
3. 提供优化建议
4. 回答数据库相关问题

保持回答简洁专业，必要时提供代码示例。`;

    // 添加上下文
    const userMessage = context ? `${context}\n\n${message}` : message;

    // 添加到对话历史
    this.conversationHistory.push({ role: 'user', content: userMessage });

    // 保留最近 10 条消息
    if (this.conversationHistory.length > 10) {
      this.conversationHistory = this.conversationHistory.slice(-10);
    }

    try {
      const messages: ConversationMessage[] = [
        { role: 'system', content: systemPrompt },
        ...this.conversationHistory,
      ];

      const response = await this.callLLM(messages);

      if (!response.success || !response.content) {
        return { success: false, error: response.error };
      }

      // 添加助手回复到历史
      this.conversationHistory.push({ role: 'assistant', content: response.content });

      return {
        success: true,
        response: response.content,
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      return { success: false, error: errorMessage };
    }
  }

  /**
   * 清除对话历史
   */
  clearHistory(): void {
    this.conversationHistory = [];
  }

  /**
   * 调用 LLM API（根据提供商）
   */
  private async callLLM(messages: ConversationMessage[]): Promise<{ success: boolean; content?: string; error?: string }> {
    if (!this.config) {
      return { success: false, error: 'LLM 未配置' };
    }

    try {
      switch (this.config.provider) {
        case 'bailian':
          return await this.callBailian(messages);
        case 'claude':
          return await this.callClaude(messages);
        case 'openai':
          return await this.callOpenAI(messages);
        default:
          return { success: false, error: `不支持的提供商：${this.config.provider}` };
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      return { success: false, error: errorMessage };
    }
  }

  /**
   * 调用通义千问
   */
  private async callBailian(messages: ConversationMessage[]): Promise<{ success: boolean; content?: string; error?: string }> {
    const url = 'https://dashscope.aliyuncs.com/api/v1/services/aigc/text-generation/generation';

    const response = await this.client.post(
      url,
      {
        model: this.config!.model,
        input: {
          messages: messages.map(m => ({
            role: m.role,
            content: m.content,
          })),
        },
        parameters: {
          result_format: 'message',
        },
      },
      {
        headers: {
          Authorization: `Bearer ${this.config!.apiKey}`,
        },
      }
    );

    if (response.data.output?.choices?.[0]?.message?.content) {
      return { success: true, content: response.data.output.choices[0].message.content };
    }

    return { success: false, error: '无效的 API 响应' };
  }

  /**
   * 调用 Claude
   */
  private async callClaude(messages: ConversationMessage[]): Promise<{ success: boolean; content?: string; error?: string }> {
    const url = 'https://api.anthropic.com/v1/messages';

    // 转换消息格式
    const systemMessage = messages.find(m => m.role === 'system');
    const otherMessages = messages.filter(m => m.role !== 'system');

    const response = await this.client.post(
      url,
      {
        model: this.config!.model,
        max_tokens: 4096,
        system: systemMessage?.content,
        messages: otherMessages.map(m => ({
          role: m.role,
          content: m.content,
        })),
      },
      {
        headers: {
          'x-api-key': this.config!.apiKey,
          'anthropic-version': '2023-06-01',
        },
      }
    );

    if (response.data.content?.[0]?.text) {
      return { success: true, content: response.data.content[0].text };
    }

    return { success: false, error: '无效的 API 响应' };
  }

  /**
   * 调用 OpenAI
   */
  private async callOpenAI(messages: ConversationMessage[]): Promise<{ success: boolean; content?: string; error?: string }> {
    const url = this.config!.baseUrl || 'https://api.openai.com/v1/chat/completions';

    const response = await this.client.post(
      url,
      {
        model: this.config!.model,
        messages: messages.map(m => ({
          role: m.role,
          content: m.content,
        })),
        max_tokens: 4096,
      },
      {
        headers: {
          Authorization: `Bearer ${this.config!.apiKey}`,
        },
      }
    );

    if (response.data.choices?.[0]?.message?.content) {
      return { success: true, content: response.data.choices[0].message.content };
    }

    return { success: false, error: '无效的 API 响应' };
  }

  /**
   * 从响应中提取 SQL
   */
  private extractSQL(text: string): string {
    // 尝试从代码块中提取
    const codeBlockMatch = text.match(/```(?:sql)?\s*([\s\S]*?)```/);
    if (codeBlockMatch) {
      return codeBlockMatch[1].trim();
    }

    // 如果没有代码块，尝试查找 SQL 关键字
    const sqlKeywords = ['SELECT', 'INSERT', 'UPDATE', 'DELETE', 'CREATE', 'ALTER', 'DROP'];
    const lines = text.split('\n');
    
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      if (sqlKeywords.some(keyword => line.toUpperCase().startsWith(keyword))) {
        // 收集连续的 SQL 行
        let sql = line;
        for (let j = i + 1; j < lines.length; j++) {
          const nextLine = lines[j].trim();
          if (nextLine && !nextLine.startsWith('```')) {
            sql += ' ' + nextLine;
          } else {
            break;
          }
        }
        return sql.replace(/;$/, '').trim();
      }
    }

    return text.trim();
  }

  /**
   * 提取表名
   */
  private extractTables(sql: string): string[] {
    const tables: string[] = [];
    
    // 简单的表名提取（FROM 和 JOIN 后）
    const fromMatches = sql.match(/FROM\s+(\w+)/gi);
    const joinMatches = sql.match(/JOIN\s+(\w+)/gi);
    
    if (fromMatches) {
      fromMatches.forEach(match => {
        const table = match.split(/\s+/)[1];
        if (table) tables.push(table);
      });
    }
    
    if (joinMatches) {
      joinMatches.forEach(match => {
        const table = match.split(/\s+/)[1];
        if (table) tables.push(table);
      });
    }
    
    return [...new Set(tables)];
  }

  /**
   * 生成 SQL 解释
   */
  private async generateExplanation(sql: string, originalQuery: string): Promise<string> {
    // 简化版本：返回基本解释
    return `SQL 已生成，基于查询："${originalQuery}"`;
  }

  /**
   * 解析解释响应
   */
  private parseExplanation(text: string): SQLExplanation {
    const lines = text.split('\n').filter(l => l.trim());
    
    return {
      summary: lines[0] || '',
      breakdown: lines.slice(1, 5).map(l => l.replace(/^[-*•]\s*/, '').trim()),
      suggestions: lines.slice(5).map(l => l.replace(/^[-*•]\s*/, '').trim()).filter(l => l),
    };
  }

  /**
   * 提取优化建议
   */
  private extractSuggestions(text: string): string[] {
    const suggestions: string[] = [];
    const lines = text.split('\n');
    
    let inSuggestions = false;
    for (const line of lines) {
      const trimmed = line.trim();
      if (trimmed.match(/建议 | 优化 | 注意/i)) {
        inSuggestions = true;
      }
      if (inSuggestions && trimmed.startsWith('-')) {
        suggestions.push(trimmed.substring(1).trim());
      }
    }
    
    return suggestions;
  }
}

export default LLMManager;
