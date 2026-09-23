import { describe, expect, it } from 'vitest'
import { initialState, reducer } from './editorReducer'
import { rectToPoints } from './geometry'

const IMAGE = { src: 'x', width: 1000, height: 500, name: 'g.jpg', remote: true }
const rect = (x) => rectToPoints({ x, y: 10, width: 100, height: 50 })

const run = (actions, start = initialState) => actions.reduce(reducer, start)

describe('editorReducer', () => {
  it('load сбрасывает зоны и историю, но помнит привязку к сетке', () => {
    const s = run([
      { type: 'setGridSnap', value: true },
      { type: 'add', zone: { type: 'rect', points: rect(0) } },
      { type: 'load', image: IMAGE, blocks: [{ id: 'b', name: 'Блок A' }], media: { visual_view: 'x' } },
    ])
    expect(s.zones).toEqual([])
    expect(s.past).toEqual([])
    expect(s.gridSnap).toBe(true)
    expect(s.blocks[0].name).toBe('Блок A')
  })

  it('add выделяет новую зону, undo/redo ходят по снимкам', () => {
    const s1 = run([{ type: 'load', image: IMAGE }, { type: 'add', zone: { type: 'rect', points: rect(0) } }])
    expect(s1.zones).toHaveLength(1)
    expect(s1.selectedIds).toEqual([s1.zones[0].id])
    expect(s1.zones[0].name).toBe('Зона 1')
    const s2 = reducer(s1, { type: 'add', zone: { type: 'rect', points: rect(200), name: 'Блок B' } })
    const undone = reducer(s2, { type: 'undo' })
    expect(undone.zones).toHaveLength(1)
    expect(undone.future).toHaveLength(1)
    const redone = reducer(undone, { type: 'redo' })
    expect(redone.zones.map((z) => z.name)).toEqual(['Зона 1', 'Блок B'])
    expect(reducer(initialState, { type: 'undo' })).toBe(initialState)
  })

  it('жест: beginGesture пишет один снимок, patchLive — нет; после жеста один undo возвращает начало', () => {
    const s0 = run([{ type: 'load', image: IMAGE }, { type: 'add', zone: { type: 'rect', points: rect(0) } }])
    const id = s0.zones[0].id
    const s1 = run([
      { type: 'beginGesture' },
      { type: 'patchLive', id, props: { points: rect(10) } },
      { type: 'patchLive', id, props: { points: rect(20) } },
      { type: 'patchLive', id, props: { points: rect(30) } },
    ], s0)
    expect(s1.zones[0].points[0].x).toBe(30)
    expect(s1.past).toHaveLength(s0.past.length + 1)
    expect(reducer(s1, { type: 'undo' }).zones[0].points[0].x).toBe(0)
  })

  it('update правит одну зону, delete снимает выделение, новое действие стирает future', () => {
    const s0 = run([{ type: 'load', image: IMAGE }, { type: 'add', zone: { type: 'rect', points: rect(0) } }])
    const id = s0.zones[0].id
    const s1 = reducer(s0, { type: 'update', id, props: { blockId: 'b1', name: 'Блок A' } })
    expect(s1.zones[0]).toMatchObject({ blockId: 'b1', name: 'Блок A' })
    const undone = reducer(s1, { type: 'undo' })
    expect(undone.future).toHaveLength(1)
    const branched = reducer(undone, { type: 'delete', ids: [id] })
    expect(branched.zones).toEqual([])
    expect(branched.selectedIds).toEqual([])
    expect(branched.future).toEqual([])
    expect(reducer(s1, { type: 'delete', ids: [] })).toBe(s1)
  })

  it('setMode вне выделения сбрасывает выделение', () => {
    const s0 = run([{ type: 'load', image: IMAGE }, { type: 'add', zone: { type: 'rect', points: rect(0) } }])
    expect(reducer(s0, { type: 'setMode', mode: 'polygon' }).selectedIds).toEqual([])
    expect(reducer(s0, { type: 'setMode', mode: 'select' }).selectedIds).toEqual(s0.selectedIds)
  })
})
