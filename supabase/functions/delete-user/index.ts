import { serve } from 'https://deno.land/std@0.224.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.48.1'

function corsHeaders(origin: string | null) {
  return {
    'Access-Control-Allow-Origin': origin ?? '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
  }
}

function jsonResponse(body: unknown, status: number, origin: string | null) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      'Content-Type': 'application/json',
      ...corsHeaders(origin),
    },
  })
}

function resolveAdminProfileStoragePath(value: string): string {
  if (!value) return ''
  if (value.startsWith('data:')) return ''

  const cleaned = value.split('#')[0].split('?')[0]

  const markers = [
    '/storage/v1/object/public/admin-profiles/',
    '/storage/v1/object/admin-profiles/',
    'admin-profiles/',
  ]

  for (const marker of markers) {
    const idx = cleaned.indexOf(marker)
    if (idx >= 0) {
      return cleaned.slice(idx + marker.length).replace(/^\/+/, '')
    }
  }

  if (!cleaned.startsWith('http') && cleaned.includes('/')) return cleaned.replace(/^\/+/, '')
  return ''
}

serve(async (req) => {
  const origin = req.headers.get('origin')

  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders(origin) })
  }

  if (req.method !== 'POST') {
    return jsonResponse({ error: 'Method not allowed' }, 405, origin)
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL')
  const anonKey = Deno.env.get('SUPABASE_ANON_KEY')
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')

  if (!supabaseUrl || !anonKey || !serviceRoleKey) {
    return jsonResponse({ error: 'Missing function environment variables' }, 500, origin)
  }

  const authHeader = req.headers.get('authorization') || ''

  const supabaseUserClient = createClient(supabaseUrl, anonKey, {
    global: {
      headers: {
        Authorization: authHeader,
      },
    },
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  })

  const supabaseAdminClient = createClient(supabaseUrl, serviceRoleKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  })

  try {
    const payload = await req.json().catch(() => null)
    const userId = payload?.userId as string | undefined

    if (!userId) {
      return jsonResponse({ error: 'userId is required' }, 400, origin)
    }

    const { data: authData, error: authError } = await supabaseUserClient.auth.getUser()
    if (authError || !authData?.user) {
      return jsonResponse({ error: 'Unauthorized' }, 401, origin)
    }

    const requesterId = authData.user.id

    const { data: requesterRow, error: requesterDbError } = await supabaseAdminClient
      .from('users')
      .select('role')
      .eq('id', requesterId)
      .maybeSingle()

    if (requesterDbError) {
      return jsonResponse({ error: requesterDbError.message }, 500, origin)
    }

    if (!requesterRow || requesterRow.role !== 'grand_user') {
      return jsonResponse({ error: 'Forbidden' }, 403, origin)
    }

    const { data: vendorSuperAdmins, error: vendorSuperError } = await supabaseAdminClient
      .from('vendor_admins')
      .select('id')
      .eq('admin_id', userId)
      .eq('is_vendor_super_admin', true)

    if (vendorSuperError) {
      return jsonResponse({ error: vendorSuperError.message }, 500, origin)
    }

    if (vendorSuperAdmins && vendorSuperAdmins.length > 0) {
      return jsonResponse(
        { error: 'Cannot delete an admin who is a vendor super admin. Update vendor admin assignments first.' },
        400,
        origin,
      )
    }

    const { data: userRow, error: userError } = await supabaseAdminClient
      .from('users')
      .select('email, profile_image_url')
      .eq('id', userId)
      .maybeSingle()

    if (userError) {
      return jsonResponse({ error: userError.message }, 500, origin)
    }

    if (!userRow) {
      return jsonResponse({ storageDeleted: true, storageError: null, authDeleted: false }, 200, origin)
    }

    let storageDeleted = true
    let storageError: string | null = null

    try {
      const path = resolveAdminProfileStoragePath(userRow.profile_image_url || '')
      if (path) {
        const { error: removeError } = await supabaseAdminClient.storage.from('admin-profiles').remove([path])
        if (removeError) {
          storageDeleted = false
          storageError = removeError.message || String(removeError)
        }
      }
    } catch (err) {
      storageDeleted = false
      storageError = err instanceof Error ? err.message : String(err)
    }

    let authDeleted = false

    try {
      if (userRow.email) {
        const email = String(userRow.email).toLowerCase()
        let authUserId: string | null = null

        // Supabase doesn't provide a direct "get user by email" call.
        // For small/medium user counts, scanning pages is acceptable.
        for (let page = 1; page <= 10 && !authUserId; page += 1) {
          const { data: usersPage, error: listError } = await supabaseAdminClient.auth.admin.listUsers({
            page,
            perPage: 1000,
          })

          if (listError) break

          const match = (usersPage?.users || []).find((u) => (u.email || '').toLowerCase() === email)
          if (match?.id) authUserId = match.id

          // Stop early if we got less than a full page.
          if ((usersPage?.users || []).length < 1000) break
        }

        if (!authUserId) {
          // No auth user found for this email; treat as already deleted.
          authDeleted = true
        } else {
          const { error: deleteAuthError } = await supabaseAdminClient.auth.admin.deleteUser(authUserId)
          authDeleted = !deleteAuthError
        }
      }
    } catch {
      authDeleted = false
    }

    const { error: deleteDbError } = await supabaseAdminClient.from('users').delete().eq('id', userId)

    if (deleteDbError) {
      return jsonResponse({ error: deleteDbError.message }, 500, origin)
    }

    return jsonResponse({ storageDeleted, storageError, authDeleted }, 200, origin)
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    return jsonResponse({ error: message }, 500, origin)
  }
})
