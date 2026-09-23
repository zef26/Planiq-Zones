import { describe, expect, it } from 'vitest'
import { buildMedia, buildProjectFile, coverage, parseMedia, parseProjectFile } from './exportMedia'
import { rectToPoints } from './geometry'

const IMAGE = { src: 'https://storage.qoshni.uz/promedia/genplan.jpg', width: 2000, height: 1000, remote: true, name: 'genplan.jpg' }
const BLOCKS = [
  { id: '39db24f2', name: 'Блок A', floors: 12 },
  { id: '1db505fe', name: 'Блок B', floors: 12 },
]
const rectZone = { id: 'z1', name: 'Блок A', type: 'rect', points: rectToPoints({ x: 200, y: 100, width: 400, height: 300 }), blockId: '39db24f2', color: '#3960C7' }
const polyZone = { id: 'z2', name: 'Блок B', type: 'polygon', points: [{ x: 1000, y: 100 }, { x: 1500, y: 120 }, { x: 1400, y: 600 }], blockId: '1db505fe', color: '#3960C7' }

describe('buildMedia', () => {
  it('зоны → media бэка: shape + coords в процентах, чужие ключи и поля сохраняются', () => {
    const existing = { visual_view: 'https://x/genplan.jpg', images: ['a.jpg'], '39db24f2': { img: 'https://x/block-a.jpg', shape: 'rect', coords: [], shape_flr: 'rect', coords_flr: [[1, 2]] } }
    const { media, warnings } = buildMedia({ zones: [rectZone, polyZone], image: IMAGE, existing })
    expect(warnings).toEqual([])
    expect(media.visual_view).toBe('https://x/genplan.jpg')
    expect(media.images).toEqual(['a.jpg'])
    expect(media['39db24f2']).toEqual({ img: 'https://x/block-a.jpg', shape: 'rect', coords: [[10, 10], [30, 10], [30, 40], [10, 40]], shape_flr: 'rect', coords_flr: [[1, 2]] })
    expect(media['1db505fe']).toEqual({ img: 'self', shape: 'polygon', coords: [[50, 10], [75, 12], [70, 60]], shape_flr: 'rect', coords_flr: [] })
  })
  it('зона без корпуса и вторая зона на тот же корпус — предупреждения, в экспорт не идут', () => {
    const { media, warnings } = buildMedia({ zones: [rectZone, { ...polyZone, id: 'z3', blockId: '39db24f2', name: 'Дубль' }, { ...polyZone, id: 'z4', blockId: null, name: 'Сирота' }], image: IMAGE })
    expect(Object.keys(media)).toEqual(['39db24f2'])
    expect(warnings).toHaveLength(2)
    expect(warnings[0]).toContain('Дубль')
    expect(warnings[1]).toContain('Сирота')
  })
})

describe('parseMedia', () => {
  it('читает наш формат (проценты парами) и [x, y, w, h] у rect; пустые coords пропускает', () => {
    const media = {
      visual_view: 'x',
      '39db24f2': { img: 'self', shape: 'rect', coords: [[10, 10], [30, 10], [30, 40], [10, 40]] },
      '1db505fe': { img: 'self', shape: 'rect', coords: [50, 10, 25, 50] },
      'unknown': { shape: 'rect', coords: [[1, 1], [2, 2], [3, 3]] },
      'empty': { shape: 'rect', coords: [] },
    }
    const zones = parseMedia(media, BLOCKS, IMAGE)
    expect(zones.map((z) => z.blockId)).toEqual(['39db24f2', '1db505fe'])
    expect(zones[0].type).toBe('rect')
    expect(zones[0].points).toEqual(rectZone.points)
    expect(zones[1].points).toEqual(rectToPoints({ x: 1000, y: 100, width: 500, height: 500 }))
    expect(zones[0].name).toBe('Блок A')
  })
  it('мусор вместо media → пусто', () => {
    expect(parseMedia(null, BLOCKS, IMAGE)).toEqual([])
    expect(parseMedia('x', BLOCKS, IMAGE)).toEqual([])
  })
})

describe('project file', () => {
  it('сохраняется и читается обратно; локальная картинка не вкладывается', () => {
    const file = buildProjectFile({ project: { slug: 'nurafshon-park', name: 'Nurafshon Park' }, image: { ...IMAGE, remote: false }, blocks: BLOCKS, zones: [rectZone, polyZone] })
    expect(file.image.src).toBeNull()
    expect(file.image.width).toBe(2000)
    const parsed = parseProjectFile(JSON.stringify(file))
    expect(parsed.zones).toHaveLength(2)
    expect(parsed.zones[1].points).toEqual(polyZone.points)
    expect(parsed.blocks).toEqual(BLOCKS)
    expect(parsed.project.slug).toBe('nurafshon-park')
  })
  it('кривой файл — понятная ошибка, зоны без точек отсеиваются', () => {
    expect(() => parseProjectFile('{')).toThrow('не JSON')
    expect(() => parseProjectFile({ version: 99 })).toThrow('не файл проекта')
    const parsed = parseProjectFile({ version: 1, zones: [{ id: 'bad', points: [{ x: 1 }] }, rectZone] })
    expect(parsed.zones.map((z) => z.id)).toEqual(['z1'])
  })
})

describe('coverage', () => {
  it('кто без корпуса и какой корпус без зоны', () => {
    const c = coverage([rectZone, { ...polyZone, blockId: null }], BLOCKS)
    expect(c.unboundZones.map((z) => z.id)).toEqual(['z2'])
    expect(c.blocksWithoutZone.map((b) => b.name)).toEqual(['Блок B'])
  })
})
