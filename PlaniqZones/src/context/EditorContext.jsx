import { useMemo, useReducer } from 'react'
import { EditorContext } from './contexts'
import { initialState, reducer } from '../lib/editorReducer'

/** Провайдер состояния редактора; сам reducer — `lib/editorReducer.js`, хук — `hooks/useEditor.js`. */
export default function EditorProvider({ children }) {
  const [state, dispatch] = useReducer(reducer, initialState)
  const value = useMemo(() => ({ state, dispatch, canUndo: state.past.length > 0, canRedo: state.future.length > 0 }), [state])
  return <EditorContext.Provider value={value}>{children}</EditorContext.Provider>
}
