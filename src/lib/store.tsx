import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import type { Comment, Contribution, Material, UserRef, Work } from '@/types'
import { useAuth } from './auth'
import { supabase } from './supabase'

/* --------------------------------------------------------------------------
 *  Данные сообщества — теперь общая база (Supabase), а не localStorage.
 *  Черновики принадлежат пользователю (таблица drafts), публикации видны
 *  всем (таблица works + likes/saves/comments/contributions).
 * ----------------------------------------------------------------------- */

type ProfileRow = { id: string; name: string; role: string; avatar_color: string }

function toUserRef(p: ProfileRow | null | undefined): UserRef {
  if (!p) return { id: '', name: '—', role: '', avatarColor: '#94a3b8' }
  return { id: p.id, name: p.name, role: p.role, avatarColor: p.avatar_color }
}

async function loadWorks(userId: string | undefined): Promise<Work[]> {
  const { data: workRows, error } = await supabase
    .from('works')
    .select(
      'id, material, published_at, views, forked_from_id, forked_from_title, forked_from_author, author:profiles!works_author_id_fkey(id, name, role, avatar_color)',
    )
    .order('published_at', { ascending: false })
  if (error) throw new Error(error.message)
  const rows = (workRows ?? []) as unknown as Array<{
    id: string
    material: Material
    published_at: string
    views: number
    forked_from_id: string | null
    forked_from_title: string | null
    forked_from_author: string | null
    author: ProfileRow | null
  }>
  const ids = rows.map((w) => w.id)
  if (ids.length === 0) return []

  const [{ data: likeRows }, { data: commentRows }, { data: contribRows }, saveRes] =
    await Promise.all([
      supabase.from('likes').select('work_id, user_id').in('work_id', ids),
      supabase
        .from('comments')
        .select('id, work_id, body, created_at, author:profiles!comments_author_id_fkey(id, name, role, avatar_color)')
        .in('work_id', ids)
        .order('created_at', { ascending: true }),
      supabase
        .from('contributions')
        .select(
          'id, work_id, note, added_items, status, created_at, author:profiles!contributions_author_id_fkey(id, name, role, avatar_color)',
        )
        .in('work_id', ids)
        .order('created_at', { ascending: true }),
      userId
        ? supabase.from('saves').select('work_id').eq('user_id', userId).in('work_id', ids)
        : Promise.resolve({ data: [] as Array<{ work_id: string }> }),
    ])

  const likesByWork = new Map<string, number>()
  const likedByMe = new Set<string>()
  for (const l of likeRows ?? []) {
    likesByWork.set(l.work_id, (likesByWork.get(l.work_id) ?? 0) + 1)
    if (userId && l.user_id === userId) likedByMe.add(l.work_id)
  }
  const savedByMe = new Set((saveRes.data ?? []).map((s) => s.work_id))

  const commentsByWork = new Map<string, Comment[]>()
  for (const c of (commentRows ?? []) as unknown as Array<{
    id: string
    work_id: string
    body: string
    created_at: string
    author: ProfileRow | null
  }>) {
    const list = commentsByWork.get(c.work_id) ?? []
    list.push({ id: c.id, author: toUserRef(c.author), body: c.body, createdAt: Date.parse(c.created_at) })
    commentsByWork.set(c.work_id, list)
  }

  const contribByWork = new Map<string, Contribution[]>()
  for (const c of (contribRows ?? []) as unknown as Array<{
    id: string
    work_id: string
    note: string
    added_items: number
    status: 'pending' | 'merged'
    created_at: string
    author: ProfileRow | null
  }>) {
    const list = contribByWork.get(c.work_id) ?? []
    list.push({
      id: c.id,
      author: toUserRef(c.author),
      note: c.note,
      addedItems: c.added_items,
      status: c.status,
      createdAt: Date.parse(c.created_at),
    })
    contribByWork.set(c.work_id, list)
  }

  return rows.map((w) => ({
    id: w.id,
    material: w.material,
    author: toUserRef(w.author),
    publishedAt: Date.parse(w.published_at),
    likes: likesByWork.get(w.id) ?? 0,
    likedByMe: likedByMe.has(w.id),
    savedByMe: savedByMe.has(w.id),
    views: w.views,
    comments: commentsByWork.get(w.id) ?? [],
    contributions: contribByWork.get(w.id) ?? [],
    forkedFrom: w.forked_from_id
      ? { id: w.forked_from_id, title: w.forked_from_title ?? '', author: w.forked_from_author ?? '' }
      : undefined,
  }))
}

async function loadDrafts(userId: string): Promise<Material[]> {
  const { data, error } = await supabase
    .from('drafts')
    .select('id, material')
    .eq('owner_id', userId)
    .order('created_at', { ascending: false })
  if (error) throw new Error(error.message)
  // id черновика в БД — отдельная строка; id материала внутри material сохраняем как есть,
  // но подставляем id строки, чтобы deleteDraft/addDraft били по одной и той же таблице.
  return (data ?? []).map((d) => ({ ...(d.material as Material), id: d.id }))
}

interface StoreValue {
  works: Work[]
  drafts: Material[]
  loading: boolean
  loadError: string | null
  addDraft: (m: Material) => Promise<void>
  deleteDraft: (id: string) => Promise<void>
  /** Удалить свою публикацию (вместе с комментариями, лайками и дополнениями). */
  deleteWork: (id: string) => Promise<void>
  /** Снять свою публикацию с сообщества: материал возвращается в черновики. */
  unpublishWork: (id: string) => Promise<void>
  publish: (m: Material, forkedFrom?: Work) => Promise<void>
  toggleLike: (id: string) => Promise<void>
  toggleSave: (id: string) => Promise<void>
  addView: (id: string) => Promise<void>
  addComment: (id: string, body: string) => Promise<void>
  addContribution: (id: string, note: string, addedItems: number) => Promise<void>
  getWork: (id: string) => Work | undefined
}

const StoreContext = createContext<StoreValue | null>(null)

export function StoreProvider({ children }: { children: ReactNode }) {
  const { session, profile } = useAuth()
  const userId = session?.user?.id
  const [works, setWorks] = useState<Work[]>([])
  const [drafts, setDrafts] = useState<Material[]>([])
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)

  const refreshWorks = useCallback(async () => {
    setWorks(await loadWorks(userId))
  }, [userId])

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    setLoadError(null)
    Promise.all([loadWorks(userId), userId ? loadDrafts(userId) : Promise.resolve([])])
      .then(([w, d]) => {
        if (cancelled) return
        setWorks(w)
        setDrafts(d)
      })
      .catch((e) => {
        if (!cancelled) setLoadError(e instanceof Error ? e.message : String(e))
      })
      .finally(() => !cancelled && setLoading(false))
    return () => {
      cancelled = true
    }
  }, [userId])

  const requireAuth = () => {
    if (!userId) throw new Error('Нужно войти в аккаунт, чтобы выполнить это действие.')
    return userId
  }

  const value = useMemo<StoreValue>(
    () => ({
      works,
      drafts,
      loading,
      loadError,

      addDraft: async (m) => {
        const uid = requireAuth()
        const { data, error } = await supabase
          .from('drafts')
          .insert({ owner_id: uid, material: m })
          .select('id')
          .single()
        if (error) throw new Error(error.message)
        setDrafts((d) => [{ ...m, id: data.id }, ...d])
      },

      deleteDraft: async (id) => {
        requireAuth()
        const { error } = await supabase.from('drafts').delete().eq('id', id)
        if (error) throw new Error(error.message)
        setDrafts((d) => d.filter((x) => x.id !== id))
      },

      deleteWork: async (id) => {
        const uid = requireAuth()
        const { data, error } = await supabase
          .from('works')
          .delete()
          .eq('id', id)
          .eq('author_id', uid)
          .select('id')
        if (error) throw new Error(error.message)
        if (!data || data.length === 0) throw new Error('Не удалось удалить: это не ваша публикация.')
        setWorks((ws) => ws.filter((w) => w.id !== id))
      },

      unpublishWork: async (id) => {
        const uid = requireAuth()
        const w = works.find((x) => x.id === id)
        if (!w || w.author.id !== uid) throw new Error('Можно снять с публикации только свою работу.')
        const { data: draft, error: dErr } = await supabase
          .from('drafts')
          .insert({ owner_id: uid, material: w.material })
          .select('id')
          .single()
        if (dErr) throw new Error(dErr.message)
        const { data, error } = await supabase
          .from('works')
          .delete()
          .eq('id', id)
          .eq('author_id', uid)
          .select('id')
        if (error || !data || data.length === 0) {
          // публикацию удалить не вышло — откатываем созданный черновик, чтобы не плодить дубликаты
          await supabase.from('drafts').delete().eq('id', draft.id)
          throw new Error(error?.message ?? 'Не удалось снять с публикации.')
        }
        setWorks((ws) => ws.filter((x) => x.id !== id))
        setDrafts((d) => [{ ...w.material, id: draft.id }, ...d])
      },

      publish: async (m, forkedFrom) => {
        const uid = requireAuth()
        const { error } = await supabase.from('works').insert({
          author_id: uid,
          material: m,
          forked_from_id: forkedFrom?.id,
          forked_from_title: forkedFrom?.material.title,
          forked_from_author: forkedFrom?.author.name,
        })
        if (error) throw new Error(error.message)
        // Материал, ставший публикацией, больше не черновик (если он им был).
        setDrafts((d) => d.filter((x) => x.id !== m.id))
        await refreshWorks()
      },

      toggleLike: async (id) => {
        const uid = requireAuth()
        const w = works.find((x) => x.id === id)
        if (!w) return
        setWorks((ws) =>
          ws.map((x) =>
            x.id === id ? { ...x, likedByMe: !x.likedByMe, likes: x.likes + (x.likedByMe ? -1 : 1) } : x,
          ),
        )
        if (w.likedByMe) {
          await supabase.from('likes').delete().eq('work_id', id).eq('user_id', uid)
        } else {
          await supabase.from('likes').insert({ work_id: id, user_id: uid })
        }
      },

      toggleSave: async (id) => {
        const uid = requireAuth()
        const w = works.find((x) => x.id === id)
        if (!w) return
        setWorks((ws) => ws.map((x) => (x.id === id ? { ...x, savedByMe: !x.savedByMe } : x)))
        if (w.savedByMe) {
          await supabase.from('saves').delete().eq('work_id', id).eq('user_id', uid)
        } else {
          await supabase.from('saves').insert({ work_id: id, user_id: uid })
        }
      },

      addView: async (id) => {
        setWorks((ws) => ws.map((x) => (x.id === id ? { ...x, views: x.views + 1 } : x)))
        await supabase.rpc('increment_work_views', { work_id: id })
      },

      addComment: async (id, body) => {
        const uid = requireAuth()
        const { data, error } = await supabase
          .from('comments')
          .insert({ work_id: id, author_id: uid, body })
          .select('id, created_at')
          .single()
        if (error) throw new Error(error.message)
        const comment: Comment = { id: data.id, author: profile ?? toUserRef(null), body, createdAt: Date.parse(data.created_at) }
        setWorks((ws) => ws.map((x) => (x.id === id ? { ...x, comments: [...x.comments, comment] } : x)))
      },

      addContribution: async (id, note, addedItems) => {
        const uid = requireAuth()
        const { data, error } = await supabase
          .from('contributions')
          .insert({ work_id: id, author_id: uid, note, added_items: addedItems })
          .select('id, created_at')
          .single()
        if (error) throw new Error(error.message)
        const contribution: Contribution = {
          id: data.id,
          author: profile ?? toUserRef(null),
          note,
          addedItems,
          status: 'pending',
          createdAt: Date.parse(data.created_at),
        }
        setWorks((ws) =>
          ws.map((x) => (x.id === id ? { ...x, contributions: [...x.contributions, contribution] } : x)),
        )
      },

      getWork: (id) => works.find((w) => w.id === id),
    }),
    [works, drafts, loading, loadError, profile, refreshWorks],
  )

  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>
}

// eslint-disable-next-line react-refresh/only-export-components
export function useStore(): StoreValue {
  const ctx = useContext(StoreContext)
  if (!ctx) throw new Error('useStore must be used within <StoreProvider>')
  return ctx
}
