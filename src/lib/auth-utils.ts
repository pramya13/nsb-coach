import { getServerSession as nextAuthGetServerSession } from 'next-auth'
import { redirect } from 'next/navigation'
import { authOptions } from './auth'

export async function getServerSession() {
  return nextAuthGetServerSession(authOptions)
}

export async function requireRole(role: string | string[]) {
  const session = await getServerSession()

  if (!session?.user) {
    redirect('/login')
  }

  const roles = Array.isArray(role) ? role : [role]

  if (!roles.includes(session.user.role)) {
    redirect('/unauthorized')
  }

  return session
}

export async function getCurrentUser() {
  const session = await getServerSession()
  return session?.user ?? null
}
