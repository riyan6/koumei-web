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
const showDisabled = ref(false)
const searchQuery = ref('')

const editingNode = ref<Node | null>(null)
const deletingNode = ref<Node | null>(null)
const deployingNode = ref<Node | null>(null)
const showEditModal = ref(false)
const showDeleteModal = ref(false)
const showDeploySlideover = ref(false)

const loadNodes = async () => {
  loading.value = true
  try {
    nodes.value = await fetchNodes(showDisabled.value)
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
    n.name.toLowerCase().includes(q) || (n.remarks ?? '').toLowerCase().includes(q)
  )
})

const openEdit = (node: Node) => {
  editingNode.value = node
  showEditModal.value = true
}

const openDelete = (node: Node) => {
  deletingNode.value = node
  showDeleteModal.value = true
}

const openDeploy = (node: Node) => {
  deployingNode.value = node
  showDeploySlideover.value = true
}

const getRowItems = (row: Row<Node>) => {
  return [
    { type: 'label' as const, label: '操作' },
    { label: '编辑节点', icon: 'i-lucide-pencil', onSelect() { openEdit(row.original) } },
    { label: '部署到 sing-box', icon: 'i-lucide-terminal-square', onSelect() { openDeploy(row.original) } },
    { type: 'separator' as const },
    { label: '删除节点', icon: 'i-lucide-trash', color: 'error' as const, onSelect() { openDelete(row.original) } }
  ]
}

const columnVisibility = ref()
const pagination = ref({ pageIndex: 0, pageSize: 10 })

const columns: TableColumn<Node>[] = [
  {
    accessorKey: 'id',
    header: 'ID',
    cell: ({ row }) => h('span', { class: 'text-muted text-sm' }, `#${row.original.id}`)
  },
  {
    accessorKey: 'name',
    header: '节点名称',
    cell: ({ row }) =>
      h('div', undefined, [
        h('p', { class: 'font-medium text-highlighted' }, row.original.name),
        row.original.remarks
          ? h('p', { class: 'text-xs text-muted truncate max-w-48' }, row.original.remarks)
          : null
      ])
  },
  {
    accessorKey: 'type',
    header: '类型',
    cell: ({ row }) =>
      h(UBadge, { variant: 'subtle', color: 'primary' }, () =>
        row.original.type.toUpperCase()
      )
  },
  {
    accessorKey: 'host',
    header: '主机'
  },
  {
    accessorKey: 'port',
    header: '端口'
  },
  {
    accessorKey: 'sort',
    header: '排序'
  },
  {
    accessorKey: 'show',
    header: '状态',
    cell: ({ row }) =>
      h(UBadge, { variant: 'subtle', color: row.original.show ? 'success' : 'error' }, () =>
        row.original.show ? '启用' : '禁用'
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
          <UCheckbox v-model="showDisabled" label="显示禁用" @update:model-value="loadNodes" />

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

  <NodesDeploySlideover
    v-if="deployingNode"
    v-model="showDeploySlideover"
    :node="deployingNode"
    @update:model-value="(v: boolean) => { if (!v) deployingNode = null }"
  />
</template>
