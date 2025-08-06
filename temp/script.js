// 全局变量
let currentData = {};
let db = null;

// IndexedDB 配置
const DB_NAME = 'FileManagerDB';
const DB_VERSION = 1;
const STORE_NAME = 'files';

// IndexedDB 初始化
function initDB() {
    return new Promise((resolve, reject) => {
        const request = indexedDB.open(DB_NAME, DB_VERSION);
        
        request.onerror = () => {
            console.error('IndexedDB 打开失败:', request.error);
            reject(request.error);
        };
        
        request.onsuccess = () => {
            db = request.result;
            console.log('IndexedDB 连接成功');
            resolve(db);
        };
        
        request.onupgradeneeded = (event) => {
            db = event.target.result;
            console.log('IndexedDB 升级中...');
            
            // 创建对象存储
            if (!db.objectStoreNames.contains(STORE_NAME)) {
                const store = db.createObjectStore(STORE_NAME, { keyPath: 'id' });
                store.createIndex('userId', 'userId', { unique: false });
                store.createIndex('title', 'title', { unique: false });
                store.createIndex('timestamp', 'timestamp', { unique: false });
                console.log('对象存储创建成功');
            }
        };
    });
}

// 页面管理函数（异步版本）
async function showPageAsync(pageId) {
    // 隐藏所有页面
    const pages = document.querySelectorAll('.page');
    pages.forEach(page => page.classList.remove('active'));
    
    // 显示指定页面
    const targetPage = document.getElementById(pageId);
    if (targetPage) {
        targetPage.classList.add('active');
    }
    
    // 重置表单和初始化页面
    if (pageId === 'upload-page') {
        document.getElementById('upload-form').reset();
        clearFileInfo();
    } else if (pageId === 'browse-page') {
        document.getElementById('browse-form').reset();
        document.getElementById('browse-title').innerHTML = '<option value="">请先输入用户ID</option>';
    } else if (pageId === 'storage-page') {
        await refreshStorageInfo();
    }
}

// 页面管理函数（同步包装版本，供HTML onclick使用）
function showPage(pageId) {
    if (pageId === 'storage-page') {
        // 存储管理页面需要异步处理
        showPageAsync(pageId).catch(error => {
            console.error('显示存储管理页面失败:', error);
            showMessage('加载存储管理页面失败', 'error');
        });
    } else {
        // 其他页面可以同步处理
        showPageAsync(pageId);
    }
}

// 显示消息
function showMessage(text, type = 'success') {
    const messageDiv = document.getElementById('message');
    messageDiv.textContent = text;
    messageDiv.className = `message ${type}`;
    messageDiv.classList.remove('hidden');
    
    setTimeout(() => {
        messageDiv.classList.add('hidden');
    }, 3000);
}

// 显示/隐藏加载状态
function showLoading(show = true) {
    const loading = document.getElementById('loading');
    if (show) {
        loading.classList.remove('hidden');
    } else {
        loading.classList.add('hidden');
    }
}

// IndexedDB 数据存储相关函数
async function saveData(userId, title, videoData, markdownContent) {
    try {
        console.log('开始保存数据到IndexedDB...', { userId, title });
        
        if (!db) {
            throw new Error('数据库未初始化');
        }
        
        // 创建唯一ID
        const id = `${userId}:${title}`;
        
        // 准备数据对象
        const dataObject = {
            id: id,
            userId: userId,
            title: title,
            video: videoData,
            markdown: markdownContent,
            timestamp: new Date().toISOString()
        };
        
        // 计算数据大小
        const dataSize = new Blob([JSON.stringify(dataObject)]).size;
        const dataSizeMB = (dataSize / 1024 / 1024).toFixed(2);
        console.log('数据大小:', dataSizeMB + ' MB');
        
        // 开始事务
        const transaction = db.transaction([STORE_NAME], 'readwrite');
        const store = transaction.objectStore(STORE_NAME);
        
        return new Promise((resolve, reject) => {
            const request = store.put(dataObject);
            
            request.onsuccess = () => {
                console.log('数据保存成功，大小:', dataSizeMB + ' MB');
                resolve(true);
            };
            
            request.onerror = () => {
                console.error('数据保存失败:', request.error);
                reject(request.error);
            };
            
            transaction.oncomplete = () => {
                console.log('事务完成');
            };
            
            transaction.onerror = () => {
                console.error('事务失败:', transaction.error);
                reject(transaction.error);
            };
        });
        
    } catch (error) {
        console.error('保存数据失败:', error);
        alert('保存失败: ' + error.message);
        return false;
    }
}

async function getUserTitles(userId) {
    try {
        if (!db) {
            throw new Error('数据库未初始化');
        }
        
        const transaction = db.transaction([STORE_NAME], 'readonly');
        const store = transaction.objectStore(STORE_NAME);
        const index = store.index('userId');
        
        return new Promise((resolve, reject) => {
            const request = index.getAll(userId);
            
            request.onsuccess = () => {
                const results = request.result;
                const titles = results.map(item => item.title);
                console.log(`找到用户 ${userId} 的标题:`, titles);
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

async function getUserContent(userId, title) {
    try {
        if (!db) {
            throw new Error('数据库未初始化');
        }
        
        const transaction = db.transaction([STORE_NAME], 'readonly');
        const store = transaction.objectStore(STORE_NAME);
        const id = `${userId}:${title}`;
        
        return new Promise((resolve, reject) => {
            const request = store.get(id);
            
            request.onsuccess = () => {
                const result = request.result;
                if (result) {
                    console.log(`找到内容: ${userId}/${title}`);
                    resolve(result);
                } else {
                    console.log(`未找到内容: ${userId}/${title}`);
                    resolve(null);
                }
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

// 获取存储使用情况
async function getStorageInfo() {
    try {
        if (!db) {
            throw new Error('数据库未初始化');
        }
        
        const transaction = db.transaction([STORE_NAME], 'readonly');
        const store = transaction.objectStore(STORE_NAME);
        
        return new Promise((resolve, reject) => {
            const request = store.getAll();
            
            request.onsuccess = () => {
                const results = request.result;
                let totalSize = 0;
                const userInfo = {};
                
                // 计算总大小和用户信息
                results.forEach(item => {
                    const itemSize = new Blob([JSON.stringify(item)]).size;
                    totalSize += itemSize;
                    
                    if (!userInfo[item.userId]) {
                        userInfo[item.userId] = 0;
                    }
                    userInfo[item.userId]++;
                });
                
                const storageInfo = {
                    totalSize: totalSize,
                    totalSizeMB: (totalSize / 1024 / 1024).toFixed(2),
                    itemCount: results.length,
                    userCount: Object.keys(userInfo).length,
                    userInfo: userInfo
                };
                
                console.log('存储信息:', storageInfo);
                resolve(storageInfo);
            };
            
            request.onerror = () => {
                console.error('获取存储信息失败:', request.error);
                reject(request.error);
            };
        });
        
    } catch (error) {
        console.error('获取存储信息失败:', error);
        return null;
    }
}

// 删除指定用户的指定标题数据
async function deleteUserContent(userId, title) {
    try {
        if (!db) {
            throw new Error('数据库未初始化');
        }
        
        const transaction = db.transaction([STORE_NAME], 'readwrite');
        const store = transaction.objectStore(STORE_NAME);
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

// 清空所有数据
async function clearAllData() {
    try {
        if (!db) {
            throw new Error('数据库未初始化');
        }
        
        const transaction = db.transaction([STORE_NAME], 'readwrite');
        const store = transaction.objectStore(STORE_NAME);
        
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

// 获取所有数据（用于存储管理页面）
async function getAllData() {
    try {
        if (!db) {
            throw new Error('数据库未初始化');
        }
        
        const transaction = db.transaction([STORE_NAME], 'readonly');
        const store = transaction.objectStore(STORE_NAME);
        
        return new Promise((resolve, reject) => {
            const request = store.getAll();
            
            request.onsuccess = () => {
                const results = request.result;
                console.log('获取到所有数据:', results.length, '条');
                resolve(results);
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

// 文件处理函数
function handleFileSelect(input, infoElementId) {
    const file = input.files[0];
    const infoElement = document.getElementById(infoElementId);
    
    if (file) {
        const fileSize = (file.size / 1024 / 1024).toFixed(2);
        infoElement.innerHTML = `
            <strong>已选择文件:</strong> ${file.name}<br>
            <strong>文件大小:</strong> ${fileSize} MB<br>
            <strong>文件类型:</strong> ${file.type}
        `;
        infoElement.style.color = '#48bb78';
    } else {
        infoElement.innerHTML = '';
    }
}

function clearFileInfo() {
    document.getElementById('video-info').innerHTML = '';
    document.getElementById('markdown-info').innerHTML = '';
}

// 文件读取函数
function readFileAsDataURL(file) {
    return new Promise((resolve, reject) => {
        console.log('开始读取视频文件:', file.name, file.type, (file.size / 1024 / 1024).toFixed(2) + ' MB');
        
        if (!file) {
            reject(new Error('没有选择文件'));
            return;
        }
        
        if (file.size > 50 * 1024 * 1024) { // 50MB限制
            reject(new Error('视频文件过大，请选择小于50MB的文件'));
            return;
        }
        
        const reader = new FileReader();
        reader.onload = e => {
            console.log('视频文件读取成功');
            resolve(e.target.result);
        };
        reader.onerror = () => {
            console.error('视频文件读取失败');
            reject(new Error('视频文件读取失败'));
        };
        reader.readAsDataURL(file);
    });
}

function readFileAsText(file) {
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
            resolve(e.target.result);
        };
        reader.onerror = () => {
            console.error('Markdown文件读取失败');
            reject(new Error('Markdown文件读取失败'));
        };
        reader.readAsText(file, 'UTF-8');
    });
}

// Markdown转HTML函数（简单实现）
function markdownToHtml(markdown) {
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

// 加载用户标题
async function loadTitles() {
    const userId = document.getElementById('browse-user-id').value.trim();
    const titleSelect = document.getElementById('browse-title');
    
    if (!userId) {
        showMessage('请先输入用户ID', 'error');
        return;
    }
    
    showLoading(true);
    
    try {
        const titles = await getUserTitles(userId);
        titleSelect.innerHTML = '';
        
        if (titles.length === 0) {
            titleSelect.innerHTML = '<option value="">该用户暂无上传内容</option>';
            showMessage('该用户暂无上传内容', 'error');
        } else {
            titleSelect.innerHTML = '<option value="">请选择标题</option>';
            titles.forEach(title => {
                const option = document.createElement('option');
                option.value = title;
                option.textContent = title;
                titleSelect.appendChild(option);
            });
            showMessage(`找到 ${titles.length} 个标题`, 'success');
        }
    } catch (error) {
        console.error('加载标题失败:', error);
        showMessage('加载标题失败', 'error');
        titleSelect.innerHTML = '<option value="">加载失败</option>';
    } finally {
        showLoading(false);
    }
}

// 事件监听器设置
document.addEventListener('DOMContentLoaded', async function() {
    // 初始化IndexedDB
    try {
        await initDB();
        console.log('应用初始化完成');
    } catch (error) {
        console.error('数据库初始化失败:', error);
        showMessage('数据库初始化失败，部分功能可能无法使用', 'error');
    }
    // 文件选择事件
    document.getElementById('video-file').addEventListener('change', function() {
        handleFileSelect(this, 'video-info');
    });
    
    document.getElementById('markdown-file').addEventListener('change', function() {
        handleFileSelect(this, 'markdown-info');
    });
    
    // 上传表单提交
    document.getElementById('upload-form').addEventListener('submit', async function(e) {
        e.preventDefault();
        
        const userId = document.getElementById('upload-user-id').value.trim();
        const title = document.getElementById('upload-title').value.trim();
        const videoFile = document.getElementById('video-file').files[0];
        const markdownFile = document.getElementById('markdown-file').files[0];
        
        // 验证输入
        if (!userId || !title || !videoFile || !markdownFile) {
            showMessage('请填写所有必需的字段', 'error');
            return;
        }
        
        // 检查标题是否已存在
        const existingTitles = await getUserTitles(userId);
        if (existingTitles.includes(title)) {
            if (!confirm('该标题已存在，是否要覆盖？')) {
                return;
            }
        }
        
        showLoading(true);
        
        try {
            console.log('=== 主应用上传流程开始 ===');
            console.log(`数据库状态: ${db ? '已连接' : '未连接'}`);
            console.log(`视频文件: ${videoFile.name} (${(videoFile.size / 1024 / 1024).toFixed(2)} MB)`);
            console.log(`Markdown文件: ${markdownFile.name} (${(markdownFile.size / 1024).toFixed(2)} KB)`);
            
            // 验证数据库连接
            if (!db) {
                throw new Error('数据库未初始化，请刷新页面重试');
            }
            
            // 验证文件类型
            if (!videoFile.type.startsWith('video/')) {
                throw new Error('请选择有效的视频文件');
            }
            
            const markdownExtension = markdownFile.name.toLowerCase().split('.').pop();
            if (!['md', 'markdown'].includes(markdownExtension)) {
                throw new Error('请选择有效的Markdown文件（.md或.markdown）');
            }
            
            // 估算转换后的大小（Base64编码会增加约33%的大小）
            const estimatedSize = (videoFile.size + markdownFile.size) * 1.4; // 40%的缓冲
            const estimatedSizeMB = (estimatedSize / 1024 / 1024).toFixed(2);
            console.log(`预估转换后大小: ${estimatedSizeMB} MB`);
            
            // 读取文件
            console.log('读取文件中...');
            const videoData = await readFileAsDataURL(videoFile);
            const markdownContent = await readFileAsText(markdownFile);
            
            console.log('文件读取完成，开始保存...');
            console.log(`实际视频数据大小: ${(new Blob([videoData]).size / 1024 / 1024).toFixed(2)} MB`);
            
            // 保存数据
            console.log('调用saveData函数...');
            const success = await saveData(userId, title, videoData, markdownContent);
            console.log('saveData函数返回结果:', success);
            
            if (success) {
                showMessage('文件上传成功！', 'success');
                document.getElementById('upload-form').reset();
                clearFileInfo();
                setTimeout(() => {
                    showPageAsync('main-page');
                }, 1500);
            } else {
                showMessage('文件上传失败，请重试', 'error');
            }
        } catch (error) {
            console.error('上传过程中出错:', error);
            showMessage(error.message || '文件处理失败，请检查文件格式', 'error');
        } finally {
            showLoading(false);
        }
    });
    
    // 浏览表单提交
    document.getElementById('browse-form').addEventListener('submit', async function(e) {
        e.preventDefault();
        
        const userId = document.getElementById('browse-user-id').value.trim();
        const title = document.getElementById('browse-title').value;
        
        if (!userId || !title) {
            showMessage('请填写用户ID并选择标题', 'error');
            return;
        }
        
        showLoading(true);
        
        try {
            const content = await getUserContent(userId, title);
            
            if (content) {
                displayContent(title, content);
                showPageAsync('content-page');
                showMessage('内容加载成功', 'success');
            } else {
                showMessage('未找到相关内容', 'error');
            }
        } catch (error) {
            console.error('加载内容失败:', error);
            showMessage('加载内容失败', 'error');
        } finally {
            showLoading(false);
        }
    });
});

// 显示内容
function displayContent(title, content) {
    document.getElementById('content-title').textContent = title;
    
    // 显示视频
    const video = document.getElementById('content-video');
    video.src = content.video;
    
    // 显示Markdown内容
    const markdownDiv = document.getElementById('content-markdown');
    markdownDiv.innerHTML = markdownToHtml(content.markdown);
}

// 存储管理相关函数
async function refreshStorageInfo() {
    const statsDiv = document.getElementById('storage-stats');
    const contentDiv = document.getElementById('storage-content');
    
    try {
        const storageInfo = await getStorageInfo();
        
        if (!storageInfo) {
            statsDiv.innerHTML = '<div class="storage-warning">无法获取存储信息</div>';
            contentDiv.innerHTML = '';
            return;
        }
        
        // IndexedDB 通常有更大的存储限制（几GB）
        const estimatedLimit = 1000 * 1024 * 1024; // 1GB估算
        const usagePercent = ((storageInfo.totalSize / estimatedLimit) * 100).toFixed(1);
        
        // 显示统计信息
        let statsHtml = '<h3>存储统计 (IndexedDB)</h3>';
        
        if (parseFloat(usagePercent) > 80) {
            statsHtml += '<div class="storage-warning">⚠️ 存储空间使用率较高，建议清理数据</div>';
        } else if (parseFloat(usagePercent) < 50) {
            statsHtml += '<div class="storage-success">✅ 存储空间充足</div>';
        }
        
        statsHtml += `
            <div class="stat-item">
                <span class="stat-label">总存储大小:</span>
                <span class="stat-value">${storageInfo.totalSizeMB} MB</span>
            </div>
            <div class="stat-item">
                <span class="stat-label">预估使用率:</span>
                <span class="stat-value">${usagePercent}%</span>
            </div>
            <div class="progress-bar">
                <div class="progress-fill" style="width: ${Math.min(usagePercent, 100)}%"></div>
            </div>
            <div class="stat-item">
                <span class="stat-label">用户数量:</span>
                <span class="stat-value">${storageInfo.userCount}</span>
            </div>
            <div class="stat-item">
                <span class="stat-label">文件总数:</span>
                <span class="stat-value">${storageInfo.itemCount}</span>
            </div>
        `;
        
        statsDiv.innerHTML = statsHtml;
        
        // 显示详细内容
        if (storageInfo.userCount === 0) {
            contentDiv.innerHTML = '<div style="text-align:center; color:#718096; padding:40px;">暂无存储数据</div>';
            return;
        }
        
        const allData = await getAllData();
        let contentHtml = '<h3>存储详情</h3>';
        
        // 按用户分组数据
        const userGroups = {};
        allData.forEach(item => {
            if (!userGroups[item.userId]) {
                userGroups[item.userId] = [];
            }
            userGroups[item.userId].push(item);
        });
        
        for (const userId of Object.keys(userGroups)) {
            const userItems = userGroups[userId];
            contentHtml += `
                <div class="user-section">
                    <div class="user-header">
                        <div class="user-title">👤 ${userId}</div>
                        <div style="color:#718096; font-size:0.9rem;">${userItems.length} 个文件</div>
                    </div>
                    <div class="item-list">
            `;
            
            for (const item of userItems) {
                const timestamp = new Date(item.timestamp).toLocaleString('zh-CN');
                const videoSize = (new Blob([item.video]).size / 1024 / 1024).toFixed(2);
                const markdownSize = (new Blob([item.markdown]).size / 1024).toFixed(2);
                
                contentHtml += `
                    <div class="item-row">
                        <div class="item-info">
                            <div class="item-title">📄 ${item.title}</div>
                            <div class="item-meta">
                                视频: ${videoSize} MB | 文档: ${markdownSize} KB | ${timestamp}
                            </div>
                        </div>
                        <div class="item-actions">
                            <button class="btn btn-info btn-small" onclick="viewContent('${item.userId}', '${item.title}')">查看</button>
                            <button class="btn btn-secondary btn-small" onclick="deleteContent('${item.userId}', '${item.title}')">删除</button>
                        </div>
                    </div>
                `;
            }
            
            contentHtml += `
                    </div>
                </div>
            `;
        }
        
        contentDiv.innerHTML = contentHtml;
        
    } catch (error) {
        console.error('刷新存储信息失败:', error);
        statsDiv.innerHTML = '<div class="storage-warning">获取存储信息失败</div>';
        contentDiv.innerHTML = '';
    }
}

async function clearAllStorage() {
    if (confirm('确定要清空所有存储数据吗？此操作不可恢复！')) {
        try {
            const success = await clearAllData();
            if (success) {
                showMessage('所有数据已清空', 'success');
                await refreshStorageInfo();
            } else {
                showMessage('清空数据失败', 'error');
            }
        } catch (error) {
            console.error('清空数据失败:', error);
            showMessage('清空数据失败', 'error');
        }
    }
}

async function deleteContent(userId, title) {
    if (confirm(`确定要删除 "${userId}/${title}" 吗？`)) {
        try {
            const success = await deleteUserContent(userId, title);
            if (success) {
                showMessage('数据删除成功', 'success');
                await refreshStorageInfo();
            } else {
                showMessage('数据删除失败', 'error');
            }
        } catch (error) {
            console.error('删除数据失败:', error);
            showMessage('数据删除失败', 'error');
        }
    }
}

async function viewContent(userId, title) {
    try {
        const content = await getUserContent(userId, title);
        if (content) {
            displayContent(title, content);
            showPage('content-page');
        } else {
            showMessage('无法加载内容', 'error');
        }
    } catch (error) {
        console.error('加载内容失败:', error);
        showMessage('加载内容失败', 'error');
    }
}
