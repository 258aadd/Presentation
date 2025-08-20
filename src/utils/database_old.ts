// IndexedDB 数据库管理工具
export interface FileData {
  id: string;
  userId: string;
  title: string;
  video: string; // base64 data URL
  markdown: string;
  timestamp: string;
}

export interface StorageInfo {
  totalSize: number;
  totalSizeMB: string;
  itemCount: number;
  userCount: number;
  userInfo: Record<string, number>;
}

class DatabaseManager {
  private db: IDBDatabase | null = null;
  private readonly DB_NAME = 'FileManagerDB';
  private readonly DB_VERSION = 1;
  private readonly STORE_NAME = 'files';

  async init(): Promise<void> {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(this.DB_NAME, this.DB_VERSION);

      request.onerror = () => {
        console.error('IndexedDB 打开失败:', request.error);
        reject(request.error);
      };

      request.onsuccess = () => {
        this.db = request.result;
        console.log('IndexedDB 连接成功');
        resolve();
      };

      request.onupgradeneeded = (event) => {
        this.db = (event.target as IDBOpenDBRequest).result;
        console.log('IndexedDB 升级中...');

        if (!this.db.objectStoreNames.contains(this.STORE_NAME)) {
          const store = this.db.createObjectStore(this.STORE_NAME, { keyPath: 'id' });
          store.createIndex('userId', 'userId', { unique: false });
          store.createIndex('title', 'title', { unique: false });
          store.createIndex('timestamp', 'timestamp', { unique: false });
          console.log('对象存储创建成功');
        }
      };
    });
  }

  async saveData(userId: string, title: string, videoData: string, markdownContent: string): Promise<boolean> {
    try {
      if (!this.db) throw new Error('数据库未初始化');

      const id = `${userId}:${title}`;
      const dataObject: FileData = {
        id,
        userId,
        title,
        video: videoData,
        markdown: markdownContent,
        timestamp: new Date().toISOString()
      };

      const transaction = this.db.transaction([this.STORE_NAME], 'readwrite');
      const store = transaction.objectStore(this.STORE_NAME);

      return new Promise((resolve, reject) => {
        const request = store.put(dataObject);

        request.onsuccess = () => {
          console.log('数据保存成功');
          resolve(true);
        };

        request.onerror = () => {
          console.error('数据保存失败:', request.error);
          reject(request.error);
        };
      });
    } catch (error) {
      console.error('保存数据失败:', error);
      return false;
    }
  }

  async getUserTitles(userId: string): Promise<string[]> {
    try {
      if (!this.db) throw new Error('数据库未初始化');

      const transaction = this.db.transaction([this.STORE_NAME], 'readonly');
      const store = transaction.objectStore(this.STORE_NAME);
      const index = store.index('userId');

      return new Promise((resolve, reject) => {
        const request = index.getAll(userId);

        request.onsuccess = () => {
          const results = request.result;
          const titles = results.map((item: FileData) => item.title);
          resolve(titles);
        };

        request.onerror = () => {
          console.error('获取用户标题失败:', request.error);
          reject(request.error);
        };
      });
    } catch (error) {
      console.error('获取用户标题失败:', error);
      return [];
    }
  }

  async getUserContent(userId: string, title: string): Promise<FileData | null> {
    try {
      if (!this.db) throw new Error('数据库未初始化');

      const transaction = this.db.transaction([this.STORE_NAME], 'readonly');
      const store = transaction.objectStore(this.STORE_NAME);
      const id = `${userId}:${title}`;

      return new Promise((resolve, reject) => {
        const request = store.get(id);

        request.onsuccess = () => {
          resolve(request.result || null);
        };

        request.onerror = () => {
          console.error('获取用户内容失败:', request.error);
          reject(request.error);
        };
      });
    } catch (error) {
      console.error('获取用户内容失败:', error);
      return null;
    }
  }

  async getAllData(): Promise<FileData[]> {
    try {
      if (!this.db) throw new Error('数据库未初始化');

      const transaction = this.db.transaction([this.STORE_NAME], 'readonly');
      const store = transaction.objectStore(this.STORE_NAME);

      return new Promise((resolve, reject) => {
        const request = store.getAll();

        request.onsuccess = () => {
          resolve(request.result);
        };

        request.onerror = () => {
          console.error('获取所有数据失败:', request.error);
          reject(request.error);
        };
      });
    } catch (error) {
      console.error('获取所有数据失败:', error);
      return [];
    }
  }

  async getStorageInfo(): Promise<StorageInfo | null> {
    try {
      const results = await this.getAllData();
      let totalSize = 0;
      const userInfo: Record<string, number> = {};

      results.forEach(item => {
        const itemSize = new Blob([JSON.stringify(item)]).size;
        totalSize += itemSize;

        if (!userInfo[item.userId]) {
          userInfo[item.userId] = 0;
        }
        userInfo[item.userId]++;
      });

      return {
        totalSize,
        totalSizeMB: (totalSize / 1024 / 1024).toFixed(2),
        itemCount: results.length,
        userCount: Object.keys(userInfo).length,
        userInfo
      };
    } catch (error) {
      console.error('获取存储信息失败:', error);
      return null;
    }
  }

  async deleteUserContent(userId: string, title: string): Promise<boolean> {
    try {
      if (!this.db) throw new Error('数据库未初始化');

      const transaction = this.db.transaction([this.STORE_NAME], 'readwrite');
      const store = transaction.objectStore(this.STORE_NAME);
      const id = `${userId}:${title}`;

      return new Promise((resolve, reject) => {
        const request = store.delete(id);

        request.onsuccess = () => {
          console.log(`已删除: ${userId}/${title}`);
          resolve(true);
        };

        request.onerror = () => {
          console.error('删除数据失败:', request.error);
          reject(request.error);
        };
      });
    } catch (error) {
      console.error('删除数据失败:', error);
      return false;
    }
  }

  async clearAllData(): Promise<boolean> {
    try {
      if (!this.db) throw new Error('数据库未初始化');

      const transaction = this.db.transaction([this.STORE_NAME], 'readwrite');
      const store = transaction.objectStore(this.STORE_NAME);

      return new Promise((resolve, reject) => {
        const request = store.clear();

        request.onsuccess = () => {
          console.log('所有数据已清空');
          resolve(true);
        };

        request.onerror = () => {
          console.error('清空数据失败:', request.error);
          reject(request.error);
        };
      });
    } catch (error) {
      console.error('清空数据失败:', error);
      return false;
    }
  }
}

export const database = new DatabaseManager();
