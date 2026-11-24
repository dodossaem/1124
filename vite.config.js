import { defineConfig } from 'vite'

// 진입점은 루트의 HTML 파일들, 빌드 출력 폴더는 기본값인 dist
export default defineConfig({
  build: {
    rolldownOptions: {
      input: {
        index: 'index.html',
        student: 'student.html',
        teacherMonitor: 'teacherMonitor.html',
      },
    },
  },
})
