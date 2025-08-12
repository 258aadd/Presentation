// Markdown转HTML渲染器（简单实现）

export function markdownToHtml(markdown: string): string {
  let html = markdown;

  // ====== 预处理：把 Markdown 里的反斜杠转义复原 ======
  // 解决：\<span ...\> / \</span\> / color:\#006400; 这类写法
  html = html
    // 先修正颜色值中的 \#
    .replace(/(:)\\#([0-9a-fA-F]{3,8})/g, '$1#$2')
    // 再复原对 < > # 的转义（保留其它符号的转义行为）
    .replace(/\\([<>#])/g, '$1');

  // ====== 标题 ======
  html = html.replace(/^### (.*$)/gim, '<h3>$1</h3>');
  html = html.replace(/^## (.*$)/gim, '<h2>$1</h2>');
  html = html.replace(/^# (.*$)/gim, '<h1>$1</h1>');

  // ====== 粗体 / 斜体 ======
  html = html.replace(/\*\*\*(.+?)\*\*\*/gim, '<strong><em>$1</em></strong>');
  html = html.replace(/\*\*(.+?)\*\*/gim, '<strong>$1</strong>');
  html = html.replace(/\*(.+?)\*/gim, '<em>$1</em>');

  // ====== 链接 ======
  html = html.replace(/\[([^\]]+)\]\(([^)]+)\)/gim, '<a href="$2" target="_blank" rel="noreferrer">$1</a>');

  // ====== 代码块（围栏） ======
  html = html.replace(/```([\s\S]*?)```/gim, '<pre><code>$1</code></pre>');

  // ====== 无序列表 ======
  // 将连续的 - / * / + 开头的行包到一个 <ul> 里
  html = html.replace(
    /(^|\n)(?:[ \t]*[-*+][ \t]+.+(?:\n|$))+/gm,
    (block) => {
      const items = block.trim().split('\n')
        .map(line => line.replace(/^[ \t]*[-*+][ \t]+(.+)$/, '<li>$1</li>'))
        .join('');
      return `\n<ul>${items}</ul>\n`;
    }
  );

  // ====== 有序列表 ======
  // 将连续的 "1. " / "2. " ... 行包到一个 <ol> 里
  html = html.replace(
    /(^|\n)(?:[ \t]*\d+\.[ \t]+.+(?:\n|$))+/gm,
    (block) => {
      const items = block.trim().split('\n')
        .map(line => line.replace(/^[ \t]*\d+\.[ \t]+(.+)$/, '<li>$1</li>'))
        .join('');
      return `\n<ol>${items}</ol>\n`;
    }
  );

  // ====== 段落 ======
  // 用空行分段，包裹成 <p>...<p>
  // 注意：在加入 <ul>/<ol>/<pre>/<h1-6> 之后，下面再做“段落清理”
  html = html.replace(/\r\n/g, '\n');
  html = html.replace(/\n{2,}/g, '</p><p>');
  html = '<p>' + html + '</p>';

  // ====== 段落清理：避免块级元素被 <p> 包裹 ======
  html = html.replace(/<p>\s*(<(?:h[1-6]|ul|ol|pre)\b)/gim, '$1');
  html = html.replace(/(<\/(?:h[1-6]|ul|ol|pre)>)\s*<\/p>/gim, '$1');

  // 收尾：去掉空段落
  html = html.replace(/<p>\s*<\/p>/gim, '');

  return html;
}
