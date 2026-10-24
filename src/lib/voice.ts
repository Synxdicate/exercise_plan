import { TextToSpeech } from '@capacitor-community/text-to-speech'
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

const mmss = (sec: number) => {
  const m = Math.floor(sec / 60)
  const s = Math.round(sec % 60)
  return s ? `${m} นาที ${s} วินาที` : `${m} นาที`
}

// ข้อความประกาศทุกกิโล เช่น "2 กิโลเมตร. เวลา 11 นาที 20 วินาที. กิโลล่าสุด 5 นาที 40 วินาที"
export const splitAnnouncement = (km: number, totalSec: number, splitSec: number) =>
  `${km} กิโลเมตร. เวลา ${mmss(totalSec)}. กิโลล่าสุด ${mmss(splitSec)}`
