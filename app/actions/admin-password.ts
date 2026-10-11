'use server'

import {
  setAdminPasswordRecord,
  verifyAdminPasswordRecord,
} from '@/lib/s3-data'
import { clearAdminSession, hasAdminSession, setAdminSession } from '@/lib/admin-session'

export async function setAdminPassword(password: string) {
  if (!(await hasAdminSession())) return { success: false }
  try {
    await setAdminPasswordRecord(password)
    await setAdminSession()
    return { success: true }
  } catch (error) {
    console.error('Error setting admin password:', error)
    return { success: false }
  }
}

export async function verifyAdminPassword(password: string) {
  try {
    const verified = await verifyAdminPasswordRecord(password)
    if (verified) await setAdminSession()
    else await clearAdminSession()
    return verified
  } catch (error) {
    console.error('Error verifying admin password:', error)
    return false
  }
}

export async function logoutAdmin() {
  await clearAdminSession()
}
