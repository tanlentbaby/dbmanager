/**
 * 查询结果分页工具
 */

export interface PaginatedResult {
  data: unknown[][];
  columns: string[];
  totalRows: number;
  currentPage: number;
  pageSize: number;
  totalPages: number;
  hasPrev: boolean;
  hasNext: boolean;
}

export interface PaginationOptions {
  page?: number;
  pageSize?: number;
}

export class PaginationManager {
  private defaultPageSize = 100;
  private maxPageSize = 1000;

  /**
   * 分页显示结果
   */
  paginate(
    data: unknown[][],
    columns: string[],
    options: PaginationOptions = {}
  ): PaginatedResult {
    const page = options.page || 1;
    const pageSize = Math.min(
      options.pageSize || this.defaultPageSize,
      this.maxPageSize
    );

    const totalRows = data.length;
    const totalPages = Math.ceil(totalRows / pageSize);
    const currentPage = Math.min(Math.max(page, 1), totalPages || 1);

    const startIndex = (currentPage - 1) * pageSize;
    const endIndex = Math.min(startIndex + pageSize, totalRows);
    const pageData = data.slice(startIndex, endIndex);

    return {
      data: pageData,
      columns,
      totalRows,
      currentPage,
      pageSize,
      totalPages,
      hasPrev: currentPage > 1,
      hasNext: currentPage < totalPages,
    };
  }

  /**
   * 格式化分页信息
   */
  formatPageInfo(result: PaginatedResult): string {
    const { currentPage, totalPages, totalRows, pageSize, hasPrev, hasNext } = result;
    
    const info = [`第 ${currentPage}/${totalPages || 1} 页`];
    
    if (totalPages > 0) {
      info.push(`共 ${totalRows} 行`);
      info.push(`每页 ${pageSize} 行`);
    }

    const nav: string[] = [];
    if (hasPrev) nav.push('上一页 (P)');
    if (hasNext) nav.push('下一页 (N)');
    if (nav.length > 0) {
      info.push(nav.join(' | '));
    }

    return info.join('  •  ');
  }

  /**
   * 获取分页导航建议
   */
  getNavigationHints(result: PaginatedResult): string[] {
    const hints: string[] = [];

    if (result.hasPrev) {
      hints.push('输入 /page prev 或按 P 查看上一页');
    }
    if (result.hasNext) {
      hints.push('输入 /page next 或按 N 查看下一页');
    }
    if (result.totalPages > 1) {
      hints.push(`输入 /page <页码> 跳转到指定页 (1-${result.totalPages})`);
    }

    return hints;
  }

  /**
   * 设置默认每页大小
   */
  setDefaultPageSize(size: number): void {
    this.defaultPageSize = Math.min(size, this.maxPageSize);
  }

  /**
   * 获取最大每页大小
   */
  getMaxPageSize(): number {
    return this.maxPageSize;
  }
}
