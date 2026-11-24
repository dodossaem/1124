// 메인 페이지 진입점: Google 로그인 관리
import './styles.css'
import { onAuthStateChanged, signInWithPopup, signOut } from 'firebase/auth'
import { auth, googleProvider } from './firebaseConfig.js'
import { isAdmin } from './adminConfig.js'

const loginArea = document.getElementById('login-area')
const loginBtn = document.getElementById('login-btn')
const loginStatus = document.getElementById('login-status')
const userArea = document.getElementById('user-area')
const userName = document.getElementById('user-name')
const userPhoto = document.getElementById('user-photo')
const logoutBtn = document.getElementById('logout-btn')
const roleButtons = document.getElementById('role-buttons')
const teacherBtn = document.getElementById('teacher-btn')

const ERROR_MESSAGES = {
  'auth/popup-blocked': '팝업이 차단되었어요. 브라우저에서 팝업을 허용해 주세요.',
  'auth/unauthorized-domain': '이 주소는 Firebase에 로그인 허용 도메인으로 등록되지 않았어요.',
  'auth/network-request-failed': '인터넷 연결을 확인해 주세요.',
}

// 로그인 상태에 따라 화면 전환
onAuthStateChanged(auth, (user) => {
  document.getElementById('auth-checking').hidden = true
  const loggedIn = Boolean(user)
  loginArea.hidden = loggedIn
  userArea.hidden = !loggedIn
  roleButtons.hidden = !loggedIn
  // 교사 모니터링 버튼은 관리자 UID로 로그인한 경우에만 표시
  teacherBtn.hidden = !isAdmin(user)

  if (user) {
    userName.textContent = user.displayName || user.email
    if (user.photoURL) {
      userPhoto.src = user.photoURL
      userPhoto.hidden = false
    } else {
      userPhoto.hidden = true
    }
  }
})

loginBtn.addEventListener('click', async () => {
  loginBtn.disabled = true
  loginStatus.textContent = ''
  try {
    await signInWithPopup(auth, googleProvider)
  } catch (err) {
    // 사용자가 팝업을 닫은 경우는 안내하지 않음
    if (err.code !== 'auth/popup-closed-by-user' && err.code !== 'auth/cancelled-popup-request') {
      loginStatus.textContent = ERROR_MESSAGES[err.code] || `로그인하지 못했어요. (${err.code || err.message})`
    }
  } finally {
    loginBtn.disabled = false
  }
})

logoutBtn.addEventListener('click', () => signOut(auth))
