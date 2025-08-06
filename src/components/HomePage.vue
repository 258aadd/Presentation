<template>
  <div class="home-page">
    <div class="welcome-section">
      <h2 class="welcome-title">欢迎使用测试系统</h2>
      <p class="welcome-subtitle">功能完善的文件测试与管理平台</p>
    </div>

    <div class="features-grid">
      <div class="feature-card" @click="$emit('navigate', 'browse')">
        <div class="feature-icon browse-icon">📁</div>
        <h3 class="feature-title">浏览文件</h3>
        <p class="feature-description">查看已上传的视频和文档内容，支持按用户分类浏览</p>
        <div class="feature-action">
          <span class="action-text">立即浏览</span>
          <span class="action-arrow">→</span>
        </div>
      </div>

      <div class="feature-card" @click="$emit('navigate', 'upload')">
        <div class="feature-icon upload-icon">📤</div>
        <h3 class="feature-title">上传文件</h3>
        <p class="feature-description">上传视频文件和Markdown文档，支持多种格式</p>
        <div class="feature-action">
          <span class="action-text">开始上传</span>
          <span class="action-arrow">→</span>
        </div>
      </div>

      <div class="feature-card" @click="$emit('navigate', 'storage')">
        <div class="feature-icon storage-icon">💾</div>
        <h3 class="feature-title">存储管理</h3>
        <p class="feature-description">管理存储空间，查看使用统计和数据详情</p>
        <div class="feature-action">
          <span class="action-text">管理存储</span>
          <span class="action-arrow">→</span>
        </div>
      </div>
    </div>


  </div>
</template>

<script setup lang="ts">
defineEmits<{
  navigate: [page: string]
}>()
</script>

<style scoped>
.home-page {
  max-width: 1200px;
  margin: 0 auto;
  padding: 20px;
}

.welcome-section {
  text-align: center;
  margin-bottom: 50px;
}

.welcome-title {
  color: white;
  font-size: 2.5rem;
  font-weight: 700;
  margin-bottom: 15px;
  text-shadow: 2px 2px 4px rgba(0,0,0,0.3);
}

.welcome-subtitle {
  color: rgba(255, 255, 255, 0.9);
  font-size: 1.2rem;
  font-weight: 400;
  margin: 0;
}

.features-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
  gap: 30px;
  margin-bottom: 50px;
}

.feature-card {
  background: white;
  border-radius: 20px;
  padding: 30px;
  box-shadow: 0 15px 35px rgba(0,0,0,0.1);
  cursor: pointer;
  transition: all 0.4s ease;
  position: relative;
  overflow: hidden;
}

.feature-card::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  height: 4px;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  transform: scaleX(0);
  transition: transform 0.3s ease;
}

.feature-card:hover::before {
  transform: scaleX(1);
}

.feature-card:hover {
  transform: translateY(-10px);
  box-shadow: 0 25px 50px rgba(0,0,0,0.15);
}

.feature-icon {
  font-size: 3rem;
  margin-bottom: 20px;
  display: inline-block;
  padding: 15px;
  border-radius: 50%;
  position: relative;
}

.browse-icon {
  background: linear-gradient(135deg, #667eea20, #764ba220);
}

.upload-icon {
  background: linear-gradient(135deg, #f093fb20, #f5576c20);
}

.storage-icon {
  background: linear-gradient(135deg, #4facfe20, #00f2fe20);
}

.feature-title {
  color: #2d3748;
  font-size: 1.5rem;
  font-weight: 600;
  margin-bottom: 15px;
  margin-top: 0;
}

.feature-description {
  color: #718096;
  font-size: 1rem;
  line-height: 1.6;
  margin-bottom: 25px;
}

.feature-action {
  display: flex;
  align-items: center;
  justify-content: space-between;
  color: #667eea;
  font-weight: 600;
  transition: all 0.3s ease;
}

.feature-card:hover .feature-action {
  color: #5a67d8;
}

.action-arrow {
  font-size: 1.2rem;
  transition: transform 0.3s ease;
}

.feature-card:hover .action-arrow {
  transform: translateX(5px);
}

.info-section {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
  gap: 20px;
  margin-top: 30px;
}

.info-card {
  background: rgba(255, 255, 255, 0.1);
  backdrop-filter: blur(10px);
  border-radius: 15px;
  padding: 25px;
  text-align: center;
  border: 1px solid rgba(255, 255, 255, 0.2);
}

.info-card h4 {
  color: white;
  font-size: 1.1rem;
  font-weight: 600;
  margin-bottom: 10px;
  margin-top: 0;
}

.info-card p {
  color: rgba(255, 255, 255, 0.8);
  font-size: 0.9rem;
  line-height: 1.5;
  margin: 0;
}

@media (max-width: 768px) {
  .home-page {
    padding: 15px;
  }

  .welcome-title {
    font-size: 2rem;
  }

  .welcome-subtitle {
    font-size: 1rem;
  }

  .features-grid {
    grid-template-columns: 1fr;
    gap: 20px;
    margin-bottom: 30px;
  }

  .feature-card {
    padding: 25px;
  }

  .feature-icon {
    font-size: 2.5rem;
  }

  .info-section {
    grid-template-columns: 1fr;
    gap: 15px;
  }

  .info-card {
    padding: 20px;
  }
}

@media (max-width: 480px) {
  .welcome-title {
    font-size: 1.8rem;
  }

  .feature-card {
    padding: 20px;
  }

  .feature-icon {
    font-size: 2rem;
    padding: 12px;
  }

  .feature-title {
    font-size: 1.3rem;
  }
}
</style>
