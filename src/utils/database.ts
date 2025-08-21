// database.ts —— 改为服务端存储实现（保留与原版相同的接口）
// 说明：所有方法通过 fetch 调用后端 /api，返回结构与原先一致。
// 如需修改后端地址，改 BASE_URL 即可（默认同域 /api）。

export interface FileData {
  id: string;         // 建议为 `${userId}:${title}`
  userId: string;
  title: string;
  video: string;      // base64 data URL
  markdown: string;
  timestamp: string;  // ISO 字符串

  videoBytes?: number;
  markdownBytes?: number;
}

export interface StorageInfo {
  totalSize: number;
  totalSizeMB: string;
  itemCount: number;
  userCount: number;
  userInfo: Record<string, number>; // userId -> 项目数
}

class RemoteDatabaseManager {
  private BASE_URL = '/api';

  // 与原 IndexedDB 版本保持签名一致（这里为 no-op）
  async init(): Promise<boolean> {
    return true;
  }

  // 保存/更新一条数据
// 同时兼容：
// 1) saveData({ userId, title, video, markdown, ... })
// 2) saveData(userId, title, video, markdown)
async saveData(data: FileData): Promise<boolean>;
async saveData(
  userId: string,
  title: string,
  video: string,
  markdown: string
): Promise<boolean>;
async saveData(
  a: FileData | string,
  b?: string,
  c?: string,
  d?: string
): Promise<boolean> {
  try {
    let payload: FileData;

    if (typeof a === 'string') {
      // 走旧的 4 参调用
      const userId = a;
      const title = b ?? '';
      const video = c ?? '';
      const markdown = d ?? '';
      payload = {
        id: `${userId}:${title}`,
        userId,
        title,
        video,
        markdown,
        timestamp: new Date().toISOString(),
      };
    } else {
      // 走新的对象调用
      payload = { ...a };
      payload.id = payload.id || `${payload.userId}:${payload.title}`;
      payload.timestamp = payload.timestamp || new Date().toISOString();
    }

    const res = await fetch(`${this.BASE_URL}/items`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    if (!res.ok) throw new Error(await res.text());
    return true;
  } catch (e) {
    console.error('保存数据失败:', e);
    return false;
  }
}


  // 获取指定 userId 的所有标题（用于下拉/提示）
  async getUserTitles(userId: string): Promise<string[]> {
    try {
      const res = await fetch(
        `${this.BASE_URL}/items/titles?` + new URLSearchParams({ userId })
      );
      if (!res.ok) throw new Error(await res.text());
      const data = (await res.json()) as { titles: string[] };
      return data.titles || [];
    } catch (e) {
      console.error('获取标题列表失败:', e);
      return [];
    }
  }

  // 获取指定 userId + title 的完整内容
  async getUserContent(userId: string, title: string): Promise<FileData | null> {
    try {
      const res = await fetch(
        `${this.BASE_URL}/items/content?` +
          new URLSearchParams({ userId, title })
      );
      if (res.status === 404) return null;
      if (!res.ok) throw new Error(await res.text());
      const data = (await res.json()) as FileData;
      return data;
    } catch (e) {
      console.error('获取内容失败:', e);
      return null;
    }
  }

  // 获取所有数据（用于“存储信息/总览”页）
// database.ts 中：
async getAllData(): Promise<FileData[]> {
  try {
    // 关键：请求精简列表，不含大字段
    const res = await fetch(`${this.BASE_URL}/items?lean=1`);
    if (!res.ok) throw new Error(await res.text());
    const data = await res.json(); // { items: [{id,userId,title,timestamp,videoBytes,markdownBytes}, ...] }

    // 为了不破坏旧 UI 的类型预期，补齐空字段（不再一次性传大 base64）
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return (data.items || []).map((x: any) => ({
      id: x.id,
      userId: x.userId,
      title: x.title,
      timestamp: x.timestamp,
      video: '',       // 懒加载：真正需要内容时再调用 getUserContent()
      markdown: '',
      // 可选：把大小也带上（你的 UI 用得上就取，不用也没影响）
      videoBytes: x.videoBytes,
      markdownBytes: x.markdownBytes,
    }));
  } catch (e) {
    console.error('获取所有数据失败:', e);
    return [];
  }
}


  // 获取存储统计信息
  async getStorageInfo(): Promise<StorageInfo> {
    try {
      const res = await fetch(`${this.BASE_URL}/storage-info`);
      if (!res.ok) throw new Error(await res.text());
      const info = (await res.json()) as StorageInfo;
      return info;
    } catch (e) {
      console.error('获取存储信息失败:', e);
      return {
        totalSize: 0,
        totalSizeMB: '0.00 MB',
        itemCount: 0,
        userCount: 0,
        userInfo: {},
      };
    }
  }

  // 删除某一条（按 userId + title）
  async deleteUserContent(userId: string, title: string): Promise<boolean> {
    try {
      const url =
        `${this.BASE_URL}/items?` +
        new URLSearchParams({ userId, title }).toString();
      const res = await fetch(url, { method: 'DELETE' });
      if (!res.ok) throw new Error(await res.text());
      return true;
    } catch (e) {
      console.error('删除失败:', e);
      return false;
    }
  }

  // 清空所有数据（危险操作）
  async clearAllData(): Promise<boolean> {
    try {
      const res = await fetch(`${this.BASE_URL}/items/all`, {
        method: 'DELETE',
      });
      if (!res.ok) throw new Error(await res.text());
      return true;
    } catch (e) {
      console.error('清空数据失败:', e);
      return false;
    }
  }
}

export const database = new RemoteDatabaseManager();
