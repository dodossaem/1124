// 학생 활동 제출: 그림은 Storage(PNG), 나머지 기록은 Firestore에 저장
// 한 학생은 하루(한국 시간 기준)에 하나의 기록만 가지며, 같은 날 다시 제출하면 덮어씀
import { doc, setDoc, serverTimestamp, Timestamp } from 'firebase/firestore'
import { ref, uploadBytes } from 'firebase/storage'
import { db, storage } from './firebaseConfig.js'

export const SUBMISSIONS_COLLECTION = 'submissions'

const toSeconds = (from, to) => Math.max(0, Math.round((to - from) / 1000))

// 한국 시간 기준 날짜 키 (예: 20261124) — 보안 규칙의 todayKey()와 같은 형식
export function seoulDayKey(date) {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Seoul',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  })
    .format(date)
    .replaceAll('-', '')
}

export async function submitActivity({ user, chat, drawingBlob, drawingStartedAt, submittedAt }) {
  const dayKey = seoulDayKey(submittedAt)

  // 1) 그림 업로드: drawings/{uid}/{YYYYMMDD}.png (같은 날 다시 내면 덮어씀)
  const imagePath = `drawings/${user.uid}/${dayKey}.png`
  await uploadBytes(ref(storage, imagePath), drawingBlob, { contentType: 'image/png' })

  // 2) 기록 저장: submissions/{uid}_{YYYYMMDD}
  await setDoc(doc(db, SUBMISSIONS_COLLECTION, `${user.uid}_${dayKey}`), {
    uid: user.uid,
    name: user.displayName || '',
    email: user.email || '',

    conversation: chat.conversation.map((m) => ({
      role: m.role,
      content: m.content,
      sentAt: Timestamp.fromDate(m.sentAt),
    })),
    turnCount: chat.turnCount,

    // 챗봇과의 대화 시간: 첫 메시지 전송 ~ 대화 끝내기 버튼
    chatStartedAt: Timestamp.fromDate(chat.startedAt),
    chatEndedAt: Timestamp.fromDate(chat.endedAt),
    chatDurationSec: toSeconds(chat.startedAt, chat.endedAt),

    // 그림 그린 시간: 대화 끝내기 버튼 ~ 제출하기 버튼
    drawingStartedAt: Timestamp.fromDate(drawingStartedAt),
    drawingDurationSec: toSeconds(drawingStartedAt, submittedAt),

    imagePath,
    submittedAt: Timestamp.fromDate(submittedAt),
    savedAt: serverTimestamp(),
  })
}
