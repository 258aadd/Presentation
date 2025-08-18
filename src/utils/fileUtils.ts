// 文件处理工具函数

export function readFileAsDataURL(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    console.log('开始读取视频文件:', file.name, file.type, (file.size / 1024 / 1024).toFixed(2) + ' MB');

    if (!file) {
      reject(new Error('没有选择文件'));
      return;
    }

    if (file.size > 500 * 1024 * 1024) { // 500MB限制
      reject(new Error('视频文件过大，请选择小于500MB的文件'));
      return;
    }

    const reader = new FileReader();
    reader.onload = e => {
      console.log('视频文件读取成功');
      resolve(e.target?.result as string);
    };
    reader.onerror = () => {
      console.error('视频文件读取失败');
      reject(new Error('视频文件读取失败'));
    };
    reader.readAsDataURL(file);
  });
}

export function readFileAsText(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    console.log('开始读取Markdown文件:', file.name, file.type, (file.size / 1024).toFixed(2) + ' KB');

    if (!file) {
      reject(new Error('没有选择文件'));
      return;
    }

    if (file.size > 1024 * 1024) { // 1MB限制
      reject(new Error('Markdown文件过大，请选择小于1MB的文件'));
      return;
    }

    const reader = new FileReader();
    reader.onload = e => {
      console.log('Markdown文件读取成功');
      resolve(e.target?.result as string);
    };
    reader.onerror = () => {
      console.error('Markdown文件读取失败');
      reject(new Error('Markdown文件读取失败'));
    };
    reader.readAsText(file, 'UTF-8');
  });
}

export function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 B';

  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));

  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

export function validateVideoFile(file: File): string | null {
  if (!file.type.startsWith('video/')) {
    return '请选择有效的视频文件';
  }

  if (file.size > 500 * 1024 * 1024) {
    return '视频文件过大，请选择小于500MB的文件';
  }

  return null;
}

export function validateMarkdownFile(file: File): string | null {
  const extension = file.name.toLowerCase().split('.').pop();
  if (!['md', 'markdown'].includes(extension || '')) {
    return '请选择有效的Markdown文件（.md或.markdown）';
  }

  if (file.size > 1024 * 1024) {
    return 'Markdown文件过大，请选择小于1MB的文件';
  }

  return null;
}
