<template>
  <div class="storage-page">
    <div class="page-header">
      <div class="header-content">
        <h2 class="page-title">💾 存储管理</h2>
        <p class="page-subtitle">管理测试系统v1.1的存储空间和数据</p>
      </div>
      <button class="btn btn-back" @click="$emit('navigate', 'home')">
        <span class="back-icon">←</span>
        返回主页
      </button>
    </div>

    <div class="storage-container">

      <div class="storage-info">
        <div class="storage-stats">
          <h3>存储统计</h3>

          <div v-if="storageInfo" class="stats-content">
            <div v-if="usagePercent > 80" class="storage-warning">
              ⚠️ 存储空间使用率较高，建议清理数据
            </div>
            <div v-else-if="usagePercent < 50" class="storage-success">
              ✅ 存储空间充足
            </div>

            <div class="stat-item">
              <span class="stat-label">总存储大小:</span>
              <span class="stat-value">{{ storageInfo.totalSizeMB }} MB</span>
            </div>
            <div class="stat-item">
              <span class="stat-label">预估使用率:</span>
              <span class="stat-value">{{ usagePercent.toFixed(1) }}%</span>
            </div>
            <div class="progress-bar">
              <div class="progress-fill" :style="{ width: Math.min(usagePercent, 100) + '%' }"></div>
            </div>
            <div class="stat-item">
              <span class="stat-label">用户数量:</span>
              <span class="stat-value">{{ storageInfo.userCount }}</span>
            </div>
            <div class="stat-item">
              <span class="stat-label">文件总数:</span>
              <span class="stat-value">{{ storageInfo.itemCount }}</span>
            </div>
          </div>

          <div v-else class="storage-warning">
            无法获取存储信息
          </div>
        </div>

        <div class="button-group">
          <button class="btn btn-info" @click="refreshStorageInfo" :disabled="loading">
            {{ loading ? '刷新中...' : '刷新信息' }}
          </button>
          <button class="btn btn-secondary" @click="clearAllStorage">
            清空所有数据
          </button>
        </div>
      </div>

      <div class="storage-content">
        <div v-if="allData.length === 0" class="no-content">
          暂无存储数据
        </div>

        <div v-else>
          <h3>存储详情</h3>

          <div v-for="(userItems, userId) in groupedData" :key="userId" class="user-section">
            <div class="user-header">
              <div class="user-title">👤 {{ userId }}</div>
              <div class="user-count">{{ userItems.length }} 个文件</div>
            </div>

            <div class="item-list">
              <div v-for="item in userItems" :key="item.id" class="item-row">
                <div class="item-info">
                  <div class="item-title">📄 {{ item.title }}</div>
                  <div class="item-meta">
                    视频: {{ getVideoSize(item) }} |
                    文档: {{ getMarkdownSize(item) }} |
                    {{ formatTimestamp(item.timestamp) }}
                  </div>
                </div>
                <div class="item-actions">
                  <button class="btn btn-info btn-small" @click="viewContent(item)">
                    查看
                  </button>
                  <button class="btn btn-secondary btn-small" @click="deleteContent(item)">
                    删除
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { database, type FileData } from '../utils/database'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const storageInfo = ref<any>(null)
const allData = ref<FileData[]>([])
const loading = ref(false)

const usagePercent = computed(() => {
  if (!storageInfo.value) return 0
  const estimatedLimit = 5000 * 1024 * 1024 // 5GB估算 (考虑到500MB视频文件限制)
  return (storageInfo.value.totalSize / estimatedLimit) * 100
})

const groupedData = computed(() => {
  const grouped: Record<string, FileData[]> = {}
  allData.value.forEach(item => {
    if (!grouped[item.userId]) {
      grouped[item.userId] = []
    }
    grouped[item.userId].push(item)
  })
  return grouped
})

const refreshStorageInfo = async () => {
  loading.value = true

  try {
    const [info, data] = await Promise.all([
      database.getStorageInfo(),
      database.getAllData()
    ])

    storageInfo.value = info
    allData.value = data
  } catch (error) {
    console.error('刷新存储信息失败:', error)
    alert('刷新存储信息失败')
  } finally {
    loading.value = false
  }
}

const clearAllStorage = async () => {
  if (confirm('确定要清空所有存储数据吗？此操作不可恢复！')) {
    try {
      const success = await database.clearAllData()
      if (success) {
        alert('所有数据已清空')
        await refreshStorageInfo()
      } else {
        alert('清空数据失败')
      }
    } catch (error) {
      console.error('清空数据失败:', error)
      alert('清空数据失败')
    }
  }
}

const deleteContent = async (item: FileData) => {
  if (confirm(`确定要删除 "${item.userId}/${item.title}" 吗？`)) {
    try {
      const success = await database.deleteUserContent(item.userId, item.title)
      if (success) {
        alert('数据删除成功')
        await refreshStorageInfo()
      } else {
        alert('数据删除失败')
      }
    } catch (error) {
      console.error('删除数据失败:', error)
      alert('数据删除失败')
    }
  }
}

const emit = defineEmits<{
  navigate: [page: string]
  viewContent: [userId: string, title: string]
}>()

const viewContent = (item: FileData) => {
  emit('viewContent', item.userId, item.title)
}

const getVideoSize = (item: FileData): string => {
  const size = new Blob([item.video]).size
  return (size / 1024 / 1024).toFixed(2) + ' MB'
}

const getMarkdownSize = (item: FileData): string => {
  const size = new Blob([item.markdown]).size
  return (size / 1024).toFixed(2) + ' KB'
}

const formatTimestamp = (timestamp: string): string => {
  return new Date(timestamp).toLocaleString('zh-CN')
}

onMounted(() => {
  refreshStorageInfo()
})
</script>

<style scoped>
.storage-page {
  max-width: 1200px;
  margin: 0 auto;
  padding: 20px;
}

.page-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 30px;
  background: rgba(255, 255, 255, 0.1);
  backdrop-filter: blur(10px);
  border-radius: 20px;
  padding: 25px 30px;
  border: 1px solid rgba(255, 255, 255, 0.2);
}

.header-content {
  flex: 1;
}

.page-title {
  color: white;
  font-size: 1.8rem;
  font-weight: 700;
  margin: 0 0 8px 0;
  text-shadow: 2px 2px 4px rgba(0,0,0,0.3);
}

.page-subtitle {
  color: rgba(255, 255, 255, 0.8);
  font-size: 1rem;
  margin: 0;
}

.btn-back {
  display: flex;
  align-items: center;
  gap: 8px;
  background: rgba(255, 255, 255, 0.2);
  color: white;
  border: 1px solid rgba(255, 255, 255, 0.3);
  padding: 12px 20px;
  border-radius: 12px;
  font-weight: 600;
  transition: all 0.3s ease;
}

.btn-back:hover {
  background: rgba(255, 255, 255, 0.3);
  transform: translateY(-2px);
}

.back-icon {
  font-size: 1.2rem;
}

.storage-container {
  background: white;
  border-radius: 20px;
  padding: 40px;
  box-shadow: 0 15px 35px rgba(0,0,0,0.1);
}



.storage-info {
  margin-bottom: 30px;
}

.storage-stats {
  background: #f7fafc;
  padding: 20px;
  border-radius: 10px;
  margin-bottom: 20px;
}

.storage-stats h3 {
  color: #4a5568;
  margin-bottom: 15px;
  font-size: 1.3rem;
}

.stat-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 8px 0;
  border-bottom: 1px solid #e2e8f0;
}

.stat-item:last-child {
  border-bottom: none;
}

.stat-label {
  color: #4a5568;
  font-weight: 600;
}

.stat-value {
  color: #2d3748;
  font-weight: 500;
}

.progress-bar {
  width: 100%;
  height: 8px;
  background: #e2e8f0;
  border-radius: 4px;
  overflow: hidden;
  margin: 10px 0;
}

.progress-fill {
  height: 100%;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  transition: width 0.3s ease;
}

.storage-warning {
  background: #fed7d7;
  color: #9b2c2c;
  padding: 10px;
  border-radius: 6px;
  margin-bottom: 15px;
  font-weight: 600;
}

.storage-success {
  background: #c6f6d5;
  color: #2f855a;
  padding: 10px;
  border-radius: 6px;
  margin-bottom: 15px;
  font-weight: 600;
}

.storage-content {
  background: #f7fafc;
  padding: 20px;
  border-radius: 10px;
}

.storage-content h3 {
  color: #4a5568;
  margin-bottom: 20px;
  font-size: 1.3rem;
}

.no-content {
  text-align: center;
  color: #718096;
  padding: 40px;
  font-style: italic;
}

.user-section {
  margin-bottom: 25px;
  padding: 15px;
  background: white;
  border-radius: 8px;
  box-shadow: 0 2px 4px rgba(0,0,0,0.1);
}

.user-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 15px;
  padding-bottom: 10px;
  border-bottom: 1px solid #e2e8f0;
}

.user-title {
  color: #4a5568;
  font-size: 1.2rem;
  font-weight: 600;
}

.user-count {
  color: #718096;
  font-size: 0.9rem;
}

.item-list {
  display: grid;
  gap: 10px;
}

.item-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 10px;
  background: #f7fafc;
  border-radius: 6px;
}

.item-info {
  flex: 1;
}

.item-title {
  font-weight: 600;
  color: #2d3748;
}

.item-meta {
  font-size: 0.9rem;
  color: #718096;
  margin-top: 4px;
}

.item-actions {
  display: flex;
  gap: 8px;
}

.button-group {
  display: flex;
  gap: 15px;
  justify-content: center;
}

.btn {
  padding: 12px 24px;
  border: none;
  border-radius: 8px;
  cursor: pointer;
  font-size: 1rem;
  font-weight: 600;
  transition: all 0.3s ease;
  min-width: 120px;
}

.btn:hover:not(:disabled) {
  transform: translateY(-2px);
  box-shadow: 0 5px 15px rgba(0,0,0,0.2);
}

.btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.btn-small {
  padding: 6px 12px;
  font-size: 0.8rem;
  min-width: auto;
}

.btn-primary {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
}

.btn-secondary {
  background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%);
  color: white;
}

.btn-info {
  background: linear-gradient(135deg, #4facfe 0%, #00f2fe 100%);
  color: white;
}

@media (max-width: 768px) {
  .storage-page {
    padding: 15px;
  }

  .page-header {
    flex-direction: column;
    gap: 20px;
    align-items: stretch;
    text-align: center;
  }

  .storage-container {
    padding: 25px;
  }

  .button-group {
    flex-direction: column;
  }

  .item-row {
    flex-direction: column;
    gap: 10px;
    align-items: stretch;
  }

  .item-actions {
    justify-content: center;
  }
}
</style>
