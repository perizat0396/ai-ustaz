import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useReducer,
  type ReactNode,
} from 'react'
import type { Comment, Contribution, Material, OllamaSettings, UserRef, Work } from '@/types'
import { CURRENT_USER, seedWorks } from './mockData'
import { DEFAULT_OLLAMA_SETTINGS } from './ollama'
import { uid } from './utils'

const STORAGE_KEY = 'ai-ustaz:v2'

interface State {
  user: UserRef
  works: Work[]
  drafts: Material[]
  ollama: OllamaSettings
}

type Action =
  | { type: 'HYDRATE'; state: State }
  | { type: 'ADD_DRAFT'; material: Material }
  | { type: 'DELETE_DRAFT'; id: string }
  | { type: 'PUBLISH'; material: Material; forkedFrom?: Work }
  | { type: 'TOGGLE_LIKE'; id: string }
  | { type: 'TOGGLE_SAVE'; id: string }
  | { type: 'ADD_VIEW'; id: string }
  | { type: 'ADD_COMMENT'; id: string; body: string }
  | { type: 'ADD_CONTRIBUTION'; id: string; note: string; addedItems: number }
  | { type: 'SET_OLLAMA'; patch: Partial<OllamaSettings> }
  | { type: 'RESET' }

function initialState(): State {
  return { user: CURRENT_USER, works: seedWorks(), drafts: [], ollama: DEFAULT_OLLAMA_SETTINGS }
}

// Модели, которые больше не поддерживаются (недоступный gated-путь KazLLM,
// сломанный локальный импорт). Если в localStorage сохранён такой —
// молча заменяем на дефолтную, иначе генерация/чат падают с 404.
const DEAD_MODELS = /kazllm|issai|KazLLM/i

function healModel(name: string | undefined, fallback: string): string {
  const v = (name ?? '').trim()
  if (!v || DEAD_MODELS.test(v)) return fallback
  return v
}

function load(): State {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return initialState()
    const parsed = JSON.parse(raw) as Partial<State>
    if (!parsed.works || !parsed.user) return initialState()
    const def = DEFAULT_OLLAMA_SETTINGS
    return {
      user: parsed.user,
      works: parsed.works,
      drafts: parsed.drafts ?? [],
      ollama: {
        ...def,
        ...parsed.ollama,
        models: {
          kk: healModel(parsed.ollama?.models?.kk, def.models.kk),
          ru: healModel(parsed.ollama?.models?.ru, def.models.ru),
        },
      },
    }
  } catch {
    return initialState()
  }
}

function reducer(state: State, action: Action): State {
  switch (action.type) {
    case 'HYDRATE':
      return action.state

    case 'ADD_DRAFT':
      return { ...state, drafts: [action.material, ...state.drafts] }

    case 'DELETE_DRAFT':
      return { ...state, drafts: state.drafts.filter((d) => d.id !== action.id) }

    case 'PUBLISH': {
      const work: Work = {
        id: uid('work'),
        material: action.material,
        author: state.user,
        publishedAt: Date.now(),
        likes: 0,
        likedByMe: false,
        savedByMe: false,
        views: 0,
        comments: [],
        contributions: [],
        forkedFrom: action.forkedFrom
          ? {
              id: action.forkedFrom.id,
              title: action.forkedFrom.material.title,
              author: action.forkedFrom.author.name,
            }
          : undefined,
      }
      return {
        ...state,
        works: [work, ...state.works],
        drafts: state.drafts.filter((d) => d.id !== action.material.id),
      }
    }

    case 'TOGGLE_LIKE':
      return {
        ...state,
        works: state.works.map((w) =>
          w.id === action.id
            ? { ...w, likedByMe: !w.likedByMe, likes: w.likes + (w.likedByMe ? -1 : 1) }
            : w,
        ),
      }

    case 'TOGGLE_SAVE':
      return {
        ...state,
        works: state.works.map((w) =>
          w.id === action.id ? { ...w, savedByMe: !w.savedByMe } : w,
        ),
      }

    case 'ADD_VIEW':
      return {
        ...state,
        works: state.works.map((w) => (w.id === action.id ? { ...w, views: w.views + 1 } : w)),
      }

    case 'ADD_COMMENT': {
      const comment: Comment = {
        id: uid('cm'),
        author: state.user,
        body: action.body,
        createdAt: Date.now(),
      }
      return {
        ...state,
        works: state.works.map((w) =>
          w.id === action.id ? { ...w, comments: [...w.comments, comment] } : w,
        ),
      }
    }

    case 'ADD_CONTRIBUTION': {
      const contribution: Contribution = {
        id: uid('co'),
        author: state.user,
        note: action.note,
        addedItems: action.addedItems,
        status: 'pending',
        createdAt: Date.now(),
      }
      return {
        ...state,
        works: state.works.map((w) =>
          w.id === action.id ? { ...w, contributions: [...w.contributions, contribution] } : w,
        ),
      }
    }

    case 'SET_OLLAMA':
      return { ...state, ollama: { ...state.ollama, ...action.patch } }

    case 'RESET':
      return { ...initialState(), ollama: state.ollama }

    default:
      return state
  }
}

interface StoreValue extends State {
  addDraft: (m: Material) => void
  deleteDraft: (id: string) => void
  publish: (m: Material, forkedFrom?: Work) => void
  toggleLike: (id: string) => void
  toggleSave: (id: string) => void
  addView: (id: string) => void
  addComment: (id: string, body: string) => void
  addContribution: (id: string, note: string, addedItems: number) => void
  setOllama: (patch: Partial<OllamaSettings>) => void
  reset: () => void
  getWork: (id: string) => Work | undefined
}

const StoreContext = createContext<StoreValue | null>(null)

export function StoreProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(reducer, undefined, load)

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state))
    } catch {
      /* quota / private mode — молча игнорируем */
    }
  }, [state])

  const value = useMemo<StoreValue>(
    () => ({
      ...state,
      addDraft: (m) => dispatch({ type: 'ADD_DRAFT', material: m }),
      deleteDraft: (id) => dispatch({ type: 'DELETE_DRAFT', id }),
      publish: (m, forkedFrom) => dispatch({ type: 'PUBLISH', material: m, forkedFrom }),
      toggleLike: (id) => dispatch({ type: 'TOGGLE_LIKE', id }),
      toggleSave: (id) => dispatch({ type: 'TOGGLE_SAVE', id }),
      addView: (id) => dispatch({ type: 'ADD_VIEW', id }),
      addComment: (id, body) => dispatch({ type: 'ADD_COMMENT', id, body }),
      addContribution: (id, note, addedItems) =>
        dispatch({ type: 'ADD_CONTRIBUTION', id, note, addedItems }),
      setOllama: (patch) => dispatch({ type: 'SET_OLLAMA', patch }),
      reset: () => dispatch({ type: 'RESET' }),
      getWork: (id) => state.works.find((w) => w.id === id),
    }),
    [state],
  )

  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>
}

// eslint-disable-next-line react-refresh/only-export-components
export function useStore(): StoreValue {
  const ctx = useContext(StoreContext)
  if (!ctx) throw new Error('useStore must be used within <StoreProvider>')
  return ctx
}
