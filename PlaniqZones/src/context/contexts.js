import { createContext } from 'react'

/** Сами контексты — отдельно от провайдеров и хуков, чтобы файлы компонентов экспортировали только компоненты (react-refresh). */
export const EditorContext = createContext(null)
export const ViewContext = createContext(null)
