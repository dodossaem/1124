// 교사 모니터링용 Firestore / Storage 데이터 처리
import { collection, deleteDoc, doc, getDocs, orderBy, query } from 'firebase/firestore'
import { deleteObject, getDownloadURL, ref } from 'firebase/storage'
import { db, storage } from './firebaseConfig.js'
import { SUBMISSIONS_COLLECTION } from './submission.js'

// 모든 제출 기록을 최신순으로 불러옴
export async function fetchSubmissions() {
  const q = query(collection(db, SUBMISSIONS_COLLECTION), orderBy('submittedAt', 'desc'))
  const snapshot = await getDocs(q)
  return snapshot.docs.map((d) => {
    const data = d.data()
    return {
      id: d.id,
      ...data,
      submittedAt: data.submittedAt?.toDate() ?? new Date(0),
      conversation: (data.conversation || []).map((m) => ({
        ...m,
        sentAt: m.sentAt?.toDate?.() ?? null,
      })),
    }
  })
}

// 그림 주소 가져오기 (Storage 읽기 권한이 있는 관리자만 가능)
export function getDrawingUrl(imagePath) {
  return getDownloadURL(ref(storage, imagePath))
}

// 제출 기록과 그림 파일을 함께 삭제
export async function deleteSubmission(submission) {
  if (submission.imagePath) {
    try {
      await deleteObject(ref(storage, submission.imagePath))
    } catch (err) {
      // 그림 파일이 이미 없으면 기록만 지움
      if (err.code !== 'storage/object-not-found') throw err
    }
  }
  await deleteDoc(doc(db, SUBMISSIONS_COLLECTION, submission.id))
}
