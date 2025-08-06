// Markdown转HTML渲染器（简单实现）

export function markdownToHtml(markdown: string): string {
  let html = markdown;

  // 标题
  html = html.replace(/^### (.*$)/gim, '<h3>$1</h3>');
  html = html.replace(/^## (.*$)/gim, '<h2>$1</h2>');
  html = html.replace(/^# (.*$)/gim, '<h1>$1</h1>');

  // 粗体和斜体
  html = html.replace(/\*\*\*(.*)\*\*\*/gim, '<strong><em>$1</em></strong>');
  html = html.replace(/\*\*(.*)\*\*/gim, '<strong>$1</strong>');
  html = html.replace(/\*(.*)\*/gim, '<em>$1</em>');

  // 代码
  html = html.replace(/`([^`]+)`/gim, '<code>$1</code>');
  html = html.replace(/```([^`]+)```/gim, '<pre><code>$1</code></pre>');

  // 链接
  html = html.replace(/\[([^\]]+)\]\(([^\)]+)\)/gim, '<a href="$2" target="_blank">$1</a>');

  // 列表
  html = html.replace(/^\* (.*$)/gim, '<li>$1</li>');
  html = html.replace(/^\d+\. (.*$)/gim, '<li>$1</li>');

  // 包装列表项
  html = html.replace(/(<li>.*<\/li>)/s, '<ul>$1</ul>');

  // 段落
  html = html.replace(/\n\n/gim, '</p><p>');
  html = '<p>' + html + '</p>';

  // 清理空段落
  html = html.replace(/<p><\/p>/gim, '');
  html = html.replace(/<p>\s*<h/gim, '<h');
  html = html.replace(/<\/h([1-6])>\s*<\/p>/gim, '</h$1>');
  html = html.replace(/<p>\s*<ul>/gim, '<ul>');
  html = html.replace(/<\/ul>\s*<\/p>/gim, '</ul>');
  html = html.replace(/<p>\s*<pre>/gim, '<pre>');
  html = html.replace(/<\/pre>\s*<\/p>/gim, '</pre>');

  return html;
}
