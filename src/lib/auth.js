// Real accounts: Supabase Auth (email + password) plus the `profiles` row
// that carries the global display name/avatar, synced into `players` by a
// database trigger (see supabase/schema.sql).
import { supabase } from '../supabaseClient.js'

export async function signUp(email, password, displayName, avatar) {
  const { data, error } = await supabase.auth.signUp({
    email: email.trim(),
    password,
    options: { data: { display_name: displayName.trim(), avatar } },
  })
  if (error) throw error
  return data.session // null if the project requires email confirmation
}

export async function signIn(email, password) {
  const { data, error } = await supabase.auth.signInWithPassword({
    email: email.trim(),
    password,
  })
  if (error) throw error
  return data.session
}

export async function signOut() {
  const { error } = await supabase.auth.signOut()
  if (error) throw error
}

export async function getSession() {
  const { data, error } = await supabase.auth.getSession()
  if (error) throw error
  return data.session
}

export function onAuthStateChange(cb) {
  const { data } = supabase.auth.onAuthStateChange((_event, session) => cb(session))
  return () => data.subscription.unsubscribe()
}

export async function getProfile(userId) {
  const { data, error } = await supabase.from('profiles').select('*').eq('id', userId).maybeSingle()
  if (error) throw error
  return data
}

export async function updateProfile(userId, fields) {
  const { data, error } = await supabase.from('profiles').update(fields).eq('id', userId).select().single()
  if (error) throw error
  return data
}

// Sends the "reset your password" email. Supabase delivers a recovery link
// that lands on /reset-password with a session already established, which is
// why App.jsx routes that path ahead of the signed-in/signed-out gate.
// `redirectTo` must be listed under Authentication → URL Configuration in the
// Supabase dashboard, or the link bounces.
export async function requestPasswordReset(email) {
  const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
    redirectTo: `${window.location.origin}/reset-password`,
  })
  if (error) throw error
}

export async function changePassword(newPassword) {
  const { error } = await supabase.auth.updateUser({ password: newPassword })
  if (error) throw error
}
