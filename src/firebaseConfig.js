// Firebase 설정 및 초기화 (다른 JS 파일에서 import해서 사용)
import { initializeApp } from 'firebase/app'
import { getAuth, GoogleAuthProvider } from 'firebase/auth'
import { getFirestore } from 'firebase/firestore'
import { getStorage } from 'firebase/storage'

// 설정값은 환경 변수(.env.local, Netlify 환경 변수)에서 불러옴
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
  measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID,
}

// measurementId(Google Analytics용)는 선택 항목이라 검사에서 제외
const missing = Object.entries(firebaseConfig)
  .filter(([key, value]) => key !== 'measurementId' && !value)
  .map(([key]) => key)
if (missing.length) {
  console.error(`Firebase 환경 변수가 비어 있어요: ${missing.join(', ')}`)
}

export const app = initializeApp(firebaseConfig)
export const auth = getAuth(app)
export const db = getFirestore(app)
export const storage = getStorage(app)
export const googleProvider = new GoogleAuthProvider()
googleProvider.setCustomParameters({ prompt: 'select_account' })
