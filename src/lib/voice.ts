import { TextToSpeech } from '@capacitor-community/text-to-speech'
import { Haptics, ImpactStyle } from '@capacitor/haptics'
import { isNative } from './native'

// เสียงพูดภาษาไทย — แอปใช้ TTS ของเครื่อง (พูดได้แม้ปิดจอ), เว็บใช้ speechSynthesis
export async function speak(text: string) {
  try {
    if (isNative) {
      await TextToSpeech.speak({ text, lang: 'th-TH', rate: 1.0, queueStrategy: 1 })
      return
    }
    if ('speechSynthesis' in window) {
      const u = new SpeechSynthesisUtterance(text)
      u.lang = 'th-TH'
      window.speechSynthesis.speak(u)
    }
  } catch {
    /* ไม่มีเสียงภาษาไทยในเครื่อง — ข้ามไป */
  }
}

// สั่นตอนเปลี่ยนช่วง — รู้ตัวแม้ไม่ได้ยินเสียง (ข้างถนนเสียงดัง/เปิดเพลง)
// ยาว = เริ่มช่วงหนัก (วิ่ง/เร่ง), สั้น = ช่วงเบา (เดิน/พัก), สั้นมาก = เตือน 10 วิ, ยาวมาก = จบชุดซ้อม
// แอปใช้ Haptics (ทำงานแม้ปิดจอ เพราะถูกเรียกจาก callback ของ GPS), เว็บใช้ navigator.vibrate
export type Buzz = 'hard' | 'easy' | 'warn' | 'done'
const BUZZ_MS: Record<Buzz, number> = { hard: 700, easy: 300, warn: 120, done: 1200 }
export function buzz(kind: Buzz) {
  try {
    if (isNative) void Haptics.vibrate({ duration: BUZZ_MS[kind] }).catch(() => {})
    else navigator.vibrate?.(kind === 'hard' ? [300, 120, 300] : BUZZ_MS[kind])
  } catch {
    /* เครื่องไม่รองรับการสั่น */
  }
}

/** สั่นเบา ๆ ตอนติ๊ก "ทำแล้ว" — ยืนยันว่ากดติด */
export function tick() {
  try {
    if (isNative) void Haptics.impact({ style: ImpactStyle.Light }).catch(() => {})
    else navigator.vibrate?.(15)
  } catch {
    /* เครื่องไม่รองรับการสั่น */
  }
}

const mmss = (sec: number) => {
  const m = Math.floor(sec / 60)
  const s = Math.round(sec % 60)
  return s ? `${m} นาที ${s} วินาที` : `${m} นาที`
}

// ข้อความประกาศทุกกิโล เช่น "2 กิโลเมตร. เวลา 11 นาที 20 วินาที. กิโลล่าสุด 5 นาที 40 วินาที"
export const splitAnnouncement = (km: number, totalSec: number, splitSec: number) =>
  `${km} กิโลเมตร. เวลา ${mmss(totalSec)}. กิโลล่าสุด ${mmss(splitSec)}`
