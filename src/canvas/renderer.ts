import Konva from 'konva'
import type { Door, NavNode, Pin, Room, Vec2, Wall } from '@/types/map'
import {
  CANVAS_BG,
  COLORS,
  GRID_MAJOR,
  GRID_MINOR,
  NODE_COLOR,
  ROOM_FILL,
  ROOM_STROKE,
  SIZES,
  WALL_COLOR,
} from '@/canvas/theme'
import { polygonArea, polygonCentroid } from '@/core/geometry'

export function createGridShape(getViewport: () => { x: number; y: number; scale: number; width: number; height: number }): Konva.Shape {
  return new Konva.Shape({
    listening: false,
    sceneFunc: (ctx, shape) => {
      const { x, y, scale, width, height } = getViewport()
      const startX = Math.floor(-x / scale / 100) * 100
      const startY = Math.floor(-y / scale / 100) * 100
      const endX = startX + width / scale + 200
      const endY = startY + height / scale + 200
      ctx.save()
      ctx.lineWidth = 1 / scale
      for (let gx = startX; gx <= endX; gx += 20) {
        ctx.beginPath()
        ctx.strokeStyle = gx % 100 === 0 ? GRID_MAJOR : GRID_MINOR
        ctx.moveTo(gx, startY)
        ctx.lineTo(gx, endY)
        ctx.stroke()
      }
      for (let gy = startY; gy <= endY; gy += 20) {
        ctx.beginPath()
        ctx.strokeStyle = gy % 100 === 0 ? GRID_MAJOR : GRID_MINOR
        ctx.moveTo(startX, gy)
        ctx.lineTo(endX, gy)
        ctx.stroke()
      }
      ctx.restore()
      void shape
    },
  })
}

export function createAreaFrame(width: number, height: number): Konva.Rect {
  return new Konva.Rect({
    x: 0,
    y: 0,
    width,
    height,
    fill: CANVAS_BG,
    stroke: COLORS.slate300,
    strokeWidth: 1,
    listening: false,
    shadowColor: 'rgba(15, 23, 42, 0.08)',
    shadowBlur: 18,
    shadowOffset: { x: 0, y: 4 },
  })
}

export interface RoomShapeHandlers {
  onSelect: (id: string) => void
  onDragEnd: (id: string, dx: number, dy: number) => void
  /** mode pencari rute: objek tidak boleh digeser */
  readOnly?: boolean
}

export function createRoomGroup(
  room: Room,
  handlers: RoomShapeHandlers,
  pixelsPerMeter = 20,
): Konva.Group {
  const flat = room.polygon.flatMap((p) => [p.x, p.y])
  const group = new Konva.Group({ draggable: !handlers.readOnly, name: 'room' })
  group.setAttr('entityId', room.id)

  const shape = new Konva.Line({
    points: flat,
    closed: true,
    fill: ROOM_FILL[room.category],
    stroke: ROOM_STROKE[room.category],
    strokeWidth: 2,
    strokeScaleEnabled: false,
  })
  group.add(shape)

  const centroid = polygonCentroid(room.polygon)
  const area = polygonArea(room.polygon)
  const label = new Konva.Text({
    x: centroid.x,
    y: centroid.y,
    text: room.name || 'Tanpa nama',
    fontSize: SIZES.labelFont,
    fontStyle: 'bold',
    fill: COLORS.slate900,
    align: 'center',
    listening: false,
    offsetX: 0,
  })
  label.offsetX(label.width() / 2)
  label.offsetY(area > 4000 ? 14 : 7)
  group.add(label)

  if (area > 5000) {
    const m2 = area / (pixelsPerMeter * pixelsPerMeter)
    const sub = new Konva.Text({
      x: centroid.x,
      y: centroid.y,
      text: `${m2 < 10 ? m2.toFixed(1) : Math.round(m2)} m\u00b2`,
      fontSize: 11,
      fill: COLORS.slate500,
      listening: false,
    })
    sub.offsetX(sub.width() / 2)
    sub.offsetY(-2)
    group.add(sub)
  }

  group.on('click tap', (evt) => {
    evt.cancelBubble = true
    handlers.onSelect(room.id)
  })
  group.on('dragstart', () => {
    group.setAttr('dragOrigin', { x: group.x(), y: group.y() })
  })
  group.on('dragend', () => {
    const origin = group.getAttr('dragOrigin') as Vec2 | undefined
    const dx = origin ? group.x() - origin.x : group.x()
    const dy = origin ? group.y() - origin.y : group.y()
    group.position({ x: 0, y: 0 })
    handlers.onDragEnd(room.id, dx, dy)
  })

  return group
}

export function createWallShape(
  wall: Wall,
  handlers: {
    onSelect: (id: string) => void
    onDragEnd: (id: string, dx: number, dy: number) => void
    readOnly?: boolean
  },
): Konva.Group {
  const group = new Konva.Group({ draggable: !handlers.readOnly, name: 'wall' })
  group.setAttr('entityId', wall.id)
  const flat = wall.points.flatMap((p) => [p.x, p.y])

  const hit = new Konva.Line({
    points: flat,
    stroke: 'transparent',
    strokeWidth: Math.max(wall.thickness + 12, 18),
    lineCap: 'round',
    lineJoin: 'round',
  })
  group.add(hit)

  const line = new Konva.Line({
    points: flat,
    stroke: WALL_COLOR[wall.kind],
    strokeWidth: wall.thickness,
    lineCap: 'round',
    lineJoin: 'round',
  })
  group.add(line)

  group.on('click tap', (evt) => {
    evt.cancelBubble = true
    handlers.onSelect(wall.id)
  })
  group.on('dragstart', () => {
    group.setAttr('dragOrigin', { x: group.x(), y: group.y() })
  })
  group.on('dragend', () => {
    const origin = group.getAttr('dragOrigin') as Vec2 | undefined
    const dx = origin ? group.x() - origin.x : group.x()
    const dy = origin ? group.y() - origin.y : group.y()
    group.position({ x: 0, y: 0 })
    handlers.onDragEnd(wall.id, dx, dy)
  })

  return group
}

export function createDoorShape(
  door: Door,
  handlers: {
    onSelect: (id: string) => void
    onDragEnd: (id: string, dx: number, dy: number) => void
    readOnly?: boolean
  },
): Konva.Group {
  const group = new Konva.Group({
    x: door.position.x,
    y: door.position.y,
    rotation: door.rotation,
    draggable: !handlers.readOnly,
    name: 'door',
  })
  group.setAttr('entityId', door.id)

  const half = door.width / 2
  group.add(
    new Konva.Rect({
      x: -half,
      y: -4,
      width: door.width,
      height: 8,
      fill: COLORS.white,
      stroke: COLORS.slate700,
      strokeWidth: 2,
    }),
  )
  group.add(
    new Konva.Arc({
      x: -half,
      y: 0,
      innerRadius: 0,
      outerRadius: door.width,
      angle: 90,
      rotation: 0,
      stroke: COLORS.slate400,
      strokeWidth: 1,
      dash: [4, 4],
      listening: false,
    }),
  )

  group.on('click tap', (evt) => {
    evt.cancelBubble = true
    handlers.onSelect(door.id)
  })
  group.on('dragend', () => {
    const x = group.x()
    const y = group.y()
    group.position({ x: 0, y: 0 })
    handlers.onDragEnd(door.id, x - door.position.x, y - door.position.y)
  })

  return group
}

export interface NodeHandlers {
  onSelect: (id: string) => void
  onDragEnd: (id: string, x: number, y: number) => void
  onDragMove?: (id: string, x: number, y: number) => void
  /** mode pencari rute: titik tidak boleh digeser */
  readOnly?: boolean
}

export function createNodeShape(node: NavNode, handlers: NodeHandlers, selected: boolean): Konva.Group {
  const group = new Konva.Group({
    x: node.position.x,
    y: node.position.y,
    draggable: !handlers.readOnly,
    name: 'node',
  })
  group.setAttr('entityId', node.id)

  const color = NODE_COLOR[node.type]
  const radius = selected ? SIZES.nodeRadius + 2 : SIZES.nodeRadius
  const isVertical = node.type === 'stair' || node.type === 'lift' || node.type === 'ramp'

  group.add(
    new Konva.Circle({
      radius,
      fill: isVertical ? color : COLORS.white,
      stroke: color,
      strokeWidth: selected ? 4 : 2.5,
    }),
  )

  if (isVertical) {
    const glyph = node.type === 'lift' ? 'L' : node.type === 'stair' ? 'T' : 'R'
    const badge = new Konva.Text({
      x: 0,
      y: 0,
      text: glyph,
      fontSize: 10,
      fontStyle: 'bold',
      fill: COLORS.white,
      listening: false,
    })
    badge.offsetX(badge.width() / 2)
    badge.offsetY(badge.height() / 2)
    group.add(badge)
  } else {
    group.add(
      new Konva.Circle({
        radius: selected ? 3.2 : 2.4,
        fill: color,
        listening: false,
      }),
    )
  }
  if (node.label) {
    const label = new Konva.Text({
      x: 0,
      y: 0,
      text: node.label,
      fontSize: 11,
      fill: COLORS.slate700,
      listening: false,
    })
    label.offsetX(label.width() / 2)
    label.offsetY(-SIZES.nodeRadius - 16)
    group.add(label)
  }

  group.on('click tap', (evt) => {
    evt.cancelBubble = true
    handlers.onSelect(node.id)
  })
  group.on('dragmove', () => {
    handlers.onDragMove?.(node.id, group.x(), group.y())
  })
  group.on('dragend', () => {
    handlers.onDragEnd(node.id, group.x(), group.y())
  })

  return group
}

export function createPinShape(pin: Pin, handlers: NodeHandlers, selected: boolean): Konva.Group {
  const group = new Konva.Group({
    x: pin.position.x,
    y: pin.position.y,
    draggable: !handlers.readOnly,
    name: 'pin',
  })
  group.setAttr('entityId', pin.id)

  group.add(
    new Konva.Circle({
      radius: selected ? SIZES.pinRadius + 2 : SIZES.pinRadius,
      fill: selected ? COLORS.primary : ROOM_STROKE[pin.category],
      stroke: COLORS.white,
      strokeWidth: 2.5,
      shadowColor: 'rgba(15,23,42,0.25)',
      shadowBlur: 6,
      shadowOffset: { x: 0, y: 2 },
    }),
  )
  group.add(
    new Konva.Circle({ radius: 2.6, fill: COLORS.white, listening: false }),
  )
  if (pin.label) {
    const label = new Konva.Text({
      x: 0,
      y: SIZES.pinRadius + 4,
      text: pin.label,
      fontSize: 11,
      fontStyle: 'bold',
      fill: COLORS.slate900,
      listening: false,
    })
    label.offsetX(label.width() / 2)
    group.add(label)
  }

  group.on('click tap', (evt) => {
    evt.cancelBubble = true
    handlers.onSelect(pin.id)
  })
  group.on('dragmove', () => {
    handlers.onDragMove?.(pin.id, group.x(), group.y())
  })
  group.on('dragend', () => {
    handlers.onDragEnd(pin.id, group.x(), group.y())
  })

  return group
}

export function createEdgeShape(
  id: string,
  from: Vec2,
  to: Vec2,
  handlers: { onSelect: (id: string) => void },
  highlighted = false,
): Konva.Group {
  const group = new Konva.Group({ name: 'edge' })
  group.setAttr('entityId', id)
  group.add(
    new Konva.Line({
      points: [from.x, from.y, to.x, to.y],
      stroke: 'transparent',
      strokeWidth: 16,
    }),
  )
  group.add(
    new Konva.Line({
      points: [from.x, from.y, to.x, to.y],
      stroke: highlighted ? COLORS.primary : COLORS.slate300,
      strokeWidth: highlighted ? 4 : SIZES.edgeWidth,
      lineCap: 'round',
      listening: false,
    }),
  )
  group.on('click tap', (evt) => {
    evt.cancelBubble = true
    handlers.onSelect(id)
  })
  return group
}

export function createVertexHandle(
  x: number,
  y: number,
  index: number,
  onMove: (index: number, x: number, y: number, phase: 'move' | 'end') => void,
): Konva.Circle {
  const handle = new Konva.Circle({
    x,
    y,
    radius: SIZES.vertexRadius,
    fill: COLORS.white,
    stroke: COLORS.primary,
    strokeWidth: 2,
    draggable: true,
  })
  handle.on('dragmove', () => onMove(index, handle.x(), handle.y(), 'move'))
  handle.on('dragend', () => onMove(index, handle.x(), handle.y(), 'end'))
  handle.on('mouseenter', () => {
    const stage = handle.getStage()
    if (stage) stage.container().style.cursor = 'move'
  })
  handle.on('mouseleave', () => {
    const stage = handle.getStage()
    if (stage) stage.container().style.cursor = 'default'
  })
  return handle
}

export function drawRouteSegments(points: Vec2[]): Konva.Group {
  const group = new Konva.Group({ listening: false })
  if (points.length < 2) return group
  const flat = points.flatMap((p) => [p.x, p.y])
  group.add(
    new Konva.Line({
      points: flat,
      stroke: 'rgba(255,255,255,0.9)',
      strokeWidth: SIZES.routeWidth + 6,
      lineCap: 'round',
      lineJoin: 'round',
    }),
  )
  group.add(
    new Konva.Line({
      points: flat,
      stroke: COLORS.primaryDark,
      strokeWidth: SIZES.routeWidth,
      lineCap: 'round',
      lineJoin: 'round',
      dash: [16, 10],
    }),
  )
  return group
}

export function drawRouteMarker(point: Vec2, kind: 'start' | 'goal'): Konva.Group {
  const group = new Konva.Group({ x: point.x, y: point.y, listening: false })
  const color = kind === 'start' ? COLORS.success : COLORS.danger
  group.add(new Konva.Circle({ radius: 12, fill: COLORS.white, stroke: color, strokeWidth: 3 }))
  group.add(new Konva.Circle({ radius: 5, fill: color }))
  const label = new Konva.Text({
    x: 0,
    y: 0,
    text: kind === 'start' ? 'A' : 'B',
    fontSize: 10,
    fontStyle: 'bold',
    fill: COLORS.white,
    listening: false,
  })
  label.offsetX(label.width() / 2)
  label.offsetY(label.height() / 2)
  group.add(label)
  return group
}

export function drawDraftPolyline(points: Vec2[], cursor: Vec2 | null, closed: boolean): Konva.Group {
  const group = new Konva.Group({ listening: false })
  if (points.length === 0) return group
  const preview = cursor ? [...points, cursor] : [...points]
  const flat = preview.flatMap((p) => [p.x, p.y])
  group.add(
    new Konva.Line({
      points: flat,
      stroke: COLORS.primary,
      strokeWidth: closed ? 2 : 2.5,
      dash: closed ? undefined : [8, 6],
      fill: closed ? COLORS.primarySoft : undefined,
      closed,
      lineJoin: 'round',
      lineCap: 'round',
    }),
  )
  for (const p of points) {
    group.add(
      new Konva.Circle({
        x: p.x,
        y: p.y,
        radius: 4,
        fill: COLORS.white,
        stroke: COLORS.primary,
        strokeWidth: 2,
      }),
    )
  }
  if (closed && points.length >= 2) {
    group.add(
      new Konva.Line({
        points: [preview[preview.length - 1].x, preview[preview.length - 1].y, points[0].x, points[0].y],
        stroke: COLORS.primary,
        strokeWidth: 2,
        dash: [8, 6],
      }),
    )
  }
  return group
}
