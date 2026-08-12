'use server'

import {
  setAdminPasswordRecord,
  verifyAdminPasswordRecord,
} from '@/lib/s3-data'

export async function setAdminPassword(password: string) {
  try {
    await setAdminPasswordRecord(password)
    return { success: true }
  } catch (error) {
    console.error('Error setting admin password:', error)
    return { success: false }
  }
}

export async function verifyAdminPassword(password: string) {
  try {
    return await verifyAdminPasswordRecord(password)
  } catch (error) {
    console.error('Error verifying admin password:', error)
    return false
  }
}
