<script setup lang="ts">
import { useTemplateRef, h, ref, computed, resolveComponent } from 'vue'
import { upperFirst } from 'scule'
import type { TableColumn } from '@nuxt/ui'
import { getPaginationRowModel, type Row } from '@tanstack/table-core'
import type { Node } from '../types'
import { fetchNodes } from '../api/nodes'

const UButton = resolveComponent('UButton')
const UBadge = resolveComponent('UBadge')
const UDropdownMenu = resolveComponent('UDropdownMenu')

const toast = useToast()
const table = useTemplateRef('table')

const nodes = ref<Node[]>([])
const loading = ref(false)
const includeDisabled = ref(false)
const typeFilter = ref('')
const searchQuery = ref('')

const editingNode = ref<Node | null>(null)
const deletingNode = ref<Node | null>(null)
const showEditModal = ref(false)
const showDeleteModal = ref(false)

async function loadNodes() {
  loading.value = true
  try {
    nodes.value = await fetchNodes(includeDisabled.value, typeFilter.value)
  } catch (e: unknown) {
    toast.add({ title: '加载失败', description: (e as Error).message, color: 'error' })
  } finally {
    loading.value = false
  }
}

loadNodes()

const filteredNodes = computed(() => {
  if (!searchQuery.value) return nodes.value
  const q = searchQuery.value.toLowerCase()
  return nodes.value.filter(n =>
    n.Name.toLowerCase().includes(q) || (n.Remarks ?? '').toLowerCase().includes(q)
  )
})

const tlsLabel: Record<number, string> = { 0: '无', 1: 'TLS', 2: 'REALITY' }

function openEdit(node: Node) {
  editingNode.value = node
  showEditModal.value = true
}

function openDelete(node: Node) {
  deletingNode.value = node
  showDeleteModal.value = true
}

function getRowItems(row: Row<Node>) {
  return [
    { type: 'label' as const, label: '操作' },
    { label: '编辑节点', icon: 'i-lucide-pencil', onSelect() { openEdit(row.original) } },
    { type: 'separator' as const },
    { label: '删除节点', icon: 'i-lucide-trash', color: 'error' as const, onSelect() { openDelete(row.original) } }
  ]
}

const columnVisibility = ref()
const pagination = ref({ pageIndex: 0, pageSize: 10 })

const columns: TableColumn<Node>[] = [
  {
    accessorKey: 'ID',
    header: 'ID',
    cell: ({ row }) => h('span', { class: 'text-muted text-sm' }, `#${row.original.ID}`)
  },
  {
    accessorKey: 'Name',
    header: '节点名称',
    cell: ({ row }) =>
      h('div', undefined, [
        h('p', { class: 'font-medium text-highlighted' }, row.original.Name),
        row.original.Remarks
          ? h('p', { class: 'text-xs text-muted truncate max-w-48' }, row.original.Remarks)
          : null
      ])
  },
  {
    accessorKey: 'Type',
    header: '类型',
    cell: ({ row }) =>
      h(UBadge, { variant: 'subtle', color: row.original.Type === 'vless' ? 'primary' : 'warning' }, () =>
        row.original.Type.toUpperCase()
      )
  },
  {
    accessorKey: 'ServerPort',
    header: '端口'
  },
  {
    accessorKey: 'Network',
    header: '网络',
    cell: ({ row }) => h('span', { class: 'uppercase' }, row.original.Network)
  },
  {
    accessorKey: 'TLS',
    header: 'TLS',
    cell: ({ row }) => h('span', undefined, tlsLabel[row.original.TLS] ?? String(row.original.TLS))
  },
  {
    accessorKey: 'Sort',
    header: '排序'
  },
  {
    accessorKey: 'Enabled',
    header: '状态',
    cell: ({ row }) =>
      h(UBadge, { variant: 'subtle', color: row.original.Enabled ? 'success' : 'error' }, () =>
        row.original.Enabled ? '启用' : '禁用'
      )
  },
  {
    id: 'actions',
    cell: ({ row }) =>
      h('div', { class: 'text-right' },
        h(UDropdownMenu, { content: { align: 'end' }, items: getRowItems(row) }, () =>
          h(UButton, { icon: 'i-lucide-ellipsis-vertical', color: 'neutral', variant: 'ghost', class: 'ml-auto' })
        )
      )
  }
]

const typeOptions = [
  { label: '全部类型', value: '' },
  { label: 'VLESS', value: 'vless' },
  { label: 'Shadowsocks', value: 'shadowsocks' }
]
</script>

<template>
  <UDashboardPanel id="nodes">
    <template #header>
      <UDashboardNavbar title="节点管理">
        <template #leading>
          <UDashboardSidebarCollapse />
        </template>
        <template #right>
          <NodesFormModal @saved="loadNodes" />
        </template>
      </UDashboardNavbar>
    </template>

    <template #body>
      <div class="flex flex-wrap items-center justify-between gap-1.5">
        <UInput
          v-model="searchQuery"
          class="max-w-sm"
          icon="i-lucide-search"
          placeholder="搜索节点名称..."
        />

        <div class="flex flex-wrap items-center gap-1.5">
          <USelect
            v-model="typeFilter"
            :items="typeOptions"
            class="min-w-32"
            @update:model-value="loadNodes"
          />

          <UCheckbox v-model="includeDisabled" label="包含禁用" @update:model-value="loadNodes" />

          <UDropdownMenu
            :items="
              table?.tableApi
                ?.getAllColumns()
                .filter((column: any) => column.getCanHide())
                .map((column: any) => ({
                  label: upperFirst(column.id),
                  type: 'checkbox' as const,
                  checked: column.getIsVisible(),
                  onUpdateChecked(checked: boolean) {
                    table?.tableApi?.getColumn(column.id)?.toggleVisibility(!!checked)
                  },
                  onSelect(e?: Event) { e?.preventDefault() }
                }))
            "
            :content="{ align: 'end' }"
          >
            <UButton label="显示列" color="neutral" variant="outline" trailing-icon="i-lucide-settings-2" />
          </UDropdownMenu>
        </div>
      </div>

      <UTable
        ref="table"
        v-model:column-visibility="columnVisibility"
        v-model:pagination="pagination"
        :pagination-options="{ getPaginationRowModel: getPaginationRowModel() }"
        class="shrink-0"
        :data="filteredNodes"
        :columns="columns"
        :loading="loading"
        :ui="{
          base: 'table-fixed border-separate border-spacing-0',
          thead: '[&>tr]:bg-elevated/50 [&>tr]:after:content-none',
          tbody: '[&>tr]:last:[&>td]:border-b-0',
          th: 'py-2 first:rounded-l-lg last:rounded-r-lg border-y border-default first:border-l last:border-r',
          td: 'border-b border-default',
          separator: 'h-0'
        }"
      />

      <div class="flex items-center justify-end gap-3 border-t border-default pt-4 mt-auto">
        <UPagination
          :default-page="(table?.tableApi?.getState().pagination.pageIndex || 0) + 1"
          :items-per-page="table?.tableApi?.getState().pagination.pageSize"
          :total="filteredNodes.length"
          @update:page="(p: number) => table?.tableApi?.setPageIndex(p - 1)"
        />
      </div>
    </template>
  </UDashboardPanel>

  <NodesFormModal
    v-if="editingNode"
    v-model="showEditModal"
    :node="editingNode"
    @saved="loadNodes(); editingNode = null"
    @update:model-value="(v: boolean) => { if (!v) editingNode = null }"
  >
    <template #default><span /></template>
  </NodesFormModal>

  <NodesDeleteModal
    v-if="deletingNode"
    v-model="showDeleteModal"
    :node="deletingNode"
    @deleted="loadNodes(); deletingNode = null"
    @update:model-value="(v: boolean) => { if (!v) deletingNode = null }"
  >
    <span />
  </NodesDeleteModal>
</template>
