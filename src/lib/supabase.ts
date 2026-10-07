import { createClient } from '@supabase/supabase-js'

const url = import.meta.env.VITE_SUPABASE_URL as string | undefined
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined

/** false — ключи не заданы, показываем экран настройки вместо приложения (см. App.tsx). */
export const supabaseConfigured = Boolean(url && anonKey)

// Плейсхолдеры, чтобы createClient не падал до проверки supabaseConfigured в App.tsx.
export const supabase = createClient(url || 'https://placeholder.supabase.co', anonKey || 'placeholder')
