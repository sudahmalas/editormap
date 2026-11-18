<script setup>
import { ref, watch } from 'vue'
import { RACK_TYPES, getRoomStyle } from '../../data/hospitalDemoData'

const props = defineProps({
  floor: { type: Object, required: true },
  stageRef: { type: Object, default: null },
  selection: { type: Object, default: null },
  highlightedSlot: { type: Object, default: null },
  readOnly: { type: Boolean, default: false },
  canDrag: { type: Boolean, default: false },
  draftRoomBox: { type: Object, default: null }
})

const emit = defineEmits([
  'entity-mousedown',
  'drag-start',
  'drag-end',
  'transform-end',
  'open-rack-modal'
])

const transformerRef = ref(null)

watch(
  [() => props.selection, () => props.readOnly, () => props.floor?.id],
  () => {
    setTimeout(() => {
      const tr = transformerRef.value?.getNode?.()
      const stage = props.stageRef?.getNode?.()
      if (!tr || !stage) return
      if (props.readOnly || !props.selection || !['room', 'rack'].includes(props.selection.type)) {
        tr.nodes([])
        return
      }
      const node = stage.findOne(`#${props.selection.type}-${props.selection.id}`)
      tr.nodes(node ? [node] : [])
    }, 0)
  },
  { deep: true }
)

const getRackItemsCount = (rack) => (rack.slots || []).reduce((acc, s) => acc + (s.qty > 0 ? 1 : 0), 0)
</script>

<template>
  <v-layer>
    <!-- Generic / Linked Rooms -->
    <v-group
      v-for="room in floor.rooms"
      :key="`room-${room.id}`"
      :config="{
        id: `room-${room.id}`,
        x: room.x,
        y: room.y,
        width: room.w,
        height: room.h,
        draggable: canDrag
      }"
      @mousedown="emit('entity-mousedown', $event, 'room', room)"
      @dragstart="emit('drag-start')"
      @dragend="emit('drag-end', $event, 'room', room)"
      @transformend="emit('transform-end', $event, 'room', room)"
    >
      <v-rect
        :config="{
          x: 0,
          y: 0,
          width: room.w,
          height: room.h,
          cornerRadius: 6,
          fill: getRoomStyle(room).fill,
          stroke:
            !readOnly && selection?.type === 'room' && selection?.id === room.id
              ? '#2563eb'
              : getRoomStyle(room).stroke,
          strokeWidth: !readOnly && selection?.type === 'room' && selection?.id === room.id ? 2.5 : 1.75,
          dash: !room.masterRoomId ? [6, 4] : undefined
        }"
      />
      <v-text
        :config="{
          x: 10,
          y: 10,
          text: room.nama,
          fontSize: 12,
          fontStyle: 'bold',
          fill: room.masterRoomId ? '#0f172a' : '#854d0e',
          width: Math.max(40, room.w - 20),
          wrap: 'none',
          ellipsis: true,
          listening: false
        }"
      />
      <v-text
        :config="{
          x: 10,
          y: 28,
          text: room.masterRoomId
            ? `${room.kode} · ${room.is_medis ? 'Ruangan Medis' : 'Ruangan Non-Medis'}`
            : 'Belum di-link ke Master Ruangan',
          fontSize: 10,
          fontFamily: 'monospace',
          fill: room.masterRoomId ? '#475569' : '#a16207',
          width: Math.max(40, room.w - 20),
          wrap: 'none',
          ellipsis: true,
          listening: false
        }"
      />
    </v-group>

    <!-- Doors -->
    <template v-for="room in floor.rooms" :key="`doors-${room.id}`">
      <v-rect
        v-for="door in room.doors || []"
        :key="door.id"
        :config="{
          x: door.x - 10,
          y: door.y - 5,
          width: 20,
          height: 10,
          cornerRadius: 2,
          fill: '#fef08a',
          stroke: '#ca8a04',
          strokeWidth: 1.5,
          listening: false
        }"
      />
    </template>

    <!-- Drag-draw Room Preview -->
    <v-rect
      v-if="draftRoomBox"
      :config="{
        x: draftRoomBox.x,
        y: draftRoomBox.y,
        width: draftRoomBox.w,
        height: draftRoomBox.h,
        fill: 'rgba(37, 99, 235, 0.12)',
        stroke: '#2563eb',
        dash: [6, 4],
        strokeWidth: 2,
        listening: false
      }"
    />

    <!-- Storage / Racks -->
    <v-group
      v-for="rk in floor.racks"
      :key="`rack-${rk.id}`"
      :config="{
        id: `rack-${rk.id}`,
        x: rk.x,
        y: rk.y,
        width: rk.w,
        height: rk.h,
        rotation: rk.rotation || 0,
        draggable: canDrag
      }"
      @mousedown="emit('entity-mousedown', $event, 'rack', rk)"
      @dblclick="emit('open-rack-modal', rk.id)"
      @dragstart="emit('drag-start')"
      @dragend="emit('drag-end', $event, 'rack', rk)"
      @transformend="emit('transform-end', $event, 'rack', rk)"
    >
      <v-rect
        v-if="highlightedSlot?.rackId === rk.id"
        :config="{
          x: -6,
          y: -6,
          width: rk.w + 12,
          height: rk.h + 12,
          cornerRadius: 8,
          fill: 'rgba(14, 165, 233, 0.18)',
          stroke: '#0284c7',
          strokeWidth: 2.5,
          dash: [5, 3],
          listening: false
        }"
      />
      <v-rect
        :config="{
          x: 0,
          y: 0,
          width: rk.w,
          height: rk.h,
          cornerRadius: 5,
          fill: rk.masterStorageId ? '#ffffff' : '#fffbeb',
          stroke:
            !readOnly && selection?.type === 'rack' && selection?.id === rk.id
              ? '#2563eb'
              : rk.masterStorageId
                ? RACK_TYPES[rk.rackType]?.color || '#0ea5e9'
                : '#d97706',
          strokeWidth: !readOnly && selection?.type === 'rack' && selection?.id === rk.id ? 2.5 : 1.75,
          dash: !rk.masterStorageId ? [4, 3] : undefined,
          shadowColor: 'rgba(15, 23, 42, 0.08)',
          shadowBlur: 4,
          shadowOffsetY: 1
        }"
      />
      <v-line
        :config="{
          points: [4, rk.h - 10, rk.w - 4, rk.h - 10],
          stroke: '#e2e8f0',
          strokeWidth: 1,
          listening: false
        }"
      />
      <v-text
        :config="{
          x: 6,
          y: 6,
          text: rk.masterStorageId ? rk.kode : 'PILIH STORAGE',
          fontSize: 10,
          fontStyle: 'bold',
          fill: rk.masterStorageId ? '#0f172a' : '#b45309',
          listening: false
        }"
      />
      <v-text
        :config="{
          x: 6,
          y: 19,
          text: rk.masterStorageId ? `${rk.rows}×${rk.cols} · ${getRackItemsCount(rk)} isi` : 'Klik utk link asset',
          fontSize: 9,
          fill: '#475569',
          listening: false
        }"
      />
    </v-group>

    <v-transformer
      v-if="!readOnly"
      ref="transformerRef"
      :config="{
        rotateEnabled: selection?.type === 'rack',
        keepRatio: false,
        borderStroke: '#2563eb',
        anchorStroke: '#2563eb',
        anchorFill: '#ffffff',
        anchorSize: 7,
        boundBoxFunc: (oldBox, newBox) => (newBox.width < 40 || newBox.height < 28 ? oldBox : newBox)
      }"
    />
  </v-layer>
</template>
