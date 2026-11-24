// 관리자(교사) UID 설정
// 환경 변수 VITE_ADMIN_UIDS에 쉼표로 구분해 여러 UID를 넣을 수 있음
// 예) VITE_ADMIN_UIDS=uid1,uid2,uid3

export const ADMIN_UIDS = (import.meta.env.VITE_ADMIN_UIDS || '')
  .split(',')
  .map((uid) => uid.trim())
  .filter(Boolean)

if (ADMIN_UIDS.length === 0) {
  console.warn('관리자 UID(VITE_ADMIN_UIDS)가 설정되지 않았어요.')
}

export function isAdmin(user) {
  return Boolean(user) && ADMIN_UIDS.includes(user.uid)
}
