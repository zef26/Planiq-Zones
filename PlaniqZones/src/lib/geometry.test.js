import { describe, expect, it } from 'vitest'
import {
  bboxOfPoints, fitView, fromPercent, handlePosition, isAxisAlignedRect, moveWithin, normalizeRect,
  pointInPolygon, rectToPoints, resizeRect, toPercent, zoomAround,
} from './geometry'

const IMG = { width: 2000, height: 1000 }

describe('rectToPoints / bboxOfPoints', () => {
  it('прямоугольник → четыре угла по часовой и обратно', () => {
    const pts = rectToPoints({ x: 10, y: 20, width: 100, height: 50 })
    expect(pts).toEqual([{ x: 10, y: 20 }, { x: 110, y: 20 }, { x: 110, y: 70 }, { x: 10, y: 70 }])
    expect(bboxOfPoints(pts)).toEqual({ x: 10, y: 20, width: 100, height: 50 })
    expect(isAxisAlignedRect(pts)).toBe(true)
  })
  it('нарисованный «назад» прямоугольник нормализуется', () => {
    expect(normalizeRect(110, 70, 10, 20)).toEqual({ x: 10, y: 20, width: 100, height: 50 })
  })
})

describe('toPercent / fromPercent', () => {
  it('пиксели картинки ↔ проценты, два знака', () => {
    const pts = [{ x: 500, y: 250 }, { x: 1234.567, y: 999 }]
    expect(toPercent(pts, IMG.width, IMG.height)).toEqual([[25, 25], [61.73, 99.9]])
    expect(fromPercent([[25, 25]], IMG.width, IMG.height)).toEqual([{ x: 500, y: 250 }])
  })
})

describe('resizeRect', () => {
  const rect = { x: 100, y: 100, width: 200, height: 100 }
  it('юго-восточная ручка двигает правый и нижний края', () => {
    expect(resizeRect(rect, 'se', 50, 20, IMG.width, IMG.height)).toEqual({ x: 100, y: 100, width: 250, height: 120 })
  })
  it('северо-западная — левый и верхний, противоположные стоят', () => {
    expect(resizeRect(rect, 'nw', -10, -10, IMG.width, IMG.height)).toEqual({ x: 90, y: 90, width: 210, height: 110 })
  })
  it('не схлопывается меньше минимума и не выходит за картинку', () => {
    expect(resizeRect(rect, 'e', -500, 0, IMG.width, IMG.height).width).toBe(4)
    expect(resizeRect(rect, 'e', 5000, 0, IMG.width, IMG.height)).toEqual({ x: 100, y: 100, width: 1900, height: 100 })
  })
  it('позиции ручек', () => {
    expect(handlePosition(rect, 'n')).toEqual({ x: 200, y: 100 })
    expect(handlePosition(rect, 'sw')).toEqual({ x: 100, y: 200 })
  })
})

describe('moveWithin', () => {
  it('сдвиг упирается в края картинки', () => {
    const pts = rectToPoints({ x: 0, y: 0, width: 100, height: 100 })
    expect(bboxOfPoints(moveWithin(pts, -50, 30, IMG.width, IMG.height))).toEqual({ x: 0, y: 30, width: 100, height: 100 })
    expect(bboxOfPoints(moveWithin(pts, 5000, 0, IMG.width, IMG.height)).x).toBe(1900)
  })
})

describe('pointInPolygon', () => {
  const tri = [{ x: 0, y: 0 }, { x: 100, y: 0 }, { x: 0, y: 100 }]
  it('внутри / снаружи', () => {
    expect(pointInPolygon({ x: 10, y: 10 }, tri)).toBe(true)
    expect(pointInPolygon({ x: 90, y: 90 }, tri)).toBe(false)
  })
})

describe('fitView / zoomAround', () => {
  it('картинка целиком в кадре и по центру', () => {
    const v = fitView(2000, 1000, 1000, 800)
    expect(v.zoom).toBeCloseTo(0.476, 3)
    expect(v.pan.x).toBeCloseTo((1000 - 2000 * v.zoom) / 2, 6)
  })
  it('зум вокруг курсора держит точку под ним на месте', () => {
    const view = { zoom: 1, pan: { x: 0, y: 0 } }
    const cursor = { x: 300, y: 200 }
    const next = zoomAround(view, 2, cursor)
    // точка картинки под курсором: (300-0)/1 = 300 → после зума (300 - pan.x)/2 должно быть 300
    expect((cursor.x - next.pan.x) / next.zoom).toBeCloseTo(300, 6)
    expect((cursor.y - next.pan.y) / next.zoom).toBeCloseTo(200, 6)
  })
})
