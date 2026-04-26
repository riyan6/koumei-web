<script setup lang="ts">
import { useTemplateRef, h, ref, computed, resolveComponent } from 'vue'
import { upperFirst } from 'scule'
import type { TableColumn } from '@nuxt/ui'
import { getPaginationRowModel, type Row } from '@tanstack/table-core'
import type { Plan } from '../types'
import { fetchPlans } from '../api/plans'

const UButton = resolveComponent('UButton')
const UBadge = resolveComponent('UBadge')
const UDropdownMenu = resolveComponent('UDropdownMenu')

const toast = useToast()
const table = useTemplateRef('table')

const plans = ref<Plan[]>([])
const loading = ref(false)
const includeDisabled = ref(false)
const searchQuery = ref('')

const editingPlan = ref<Plan | null>(null)
const deletingPlan = ref<Plan | null>(null)
const showEditModal = ref(false)
const showDeleteModal = ref(false)

async function loadPlans() {
  loading.value = true
  try {
    plans.value = await fetchPlans(includeDisabled.value)
  } catch (e: unknown) {
    toast.add({ title: '加载失败', description: (e as Error).message, color: 'error' })
  } finally {
    loading.value = false
  }
}

loadPlans()

const filteredPlans = computed(() => {
  if (!searchQuery.value) return plans.value
  const q = searchQuery.value.toLowerCase()
  return plans.value.filter(p =>
    p.Name.toLowerCase().includes(q) || (p.Content ?? '').toLowerCase().includes(q)
  )
})

function formatBytes(bytes: number) {
  if (bytes === 0) return '不限'
  const gb = bytes / 1e9
  return gb >= 1 ? `${gb.toFixed(0)} GB` : `${(bytes / 1e6).toFixed(0)} MB`
}

function openEdit(plan: Plan) {
  editingPlan.value = plan
  showEditModal.value = true
}

function openDelete(plan: Plan) {
  deletingPlan.value = plan
  showDeleteModal.value = true
}

function getRowItems(row: Row<Plan>) {
  return [
    { type: 'label' as const, label: '操作' },
    {
      label: '编辑套餐',
      icon: 'i-lucide-pencil',
      onSelect() { openEdit(row.original) }
    },
    { type: 'separator' as const },
    {
      label: '删除套餐',
      icon: 'i-lucide-trash',
      color: 'error' as const,
      onSelect() { openDelete(row.original) }
    }
  ]
}

const columnVisibility = ref()
const pagination = ref({ pageIndex: 0, pageSize: 10 })

const columns: TableColumn<Plan>[] = [
  {
    accessorKey: 'ID',
    header: 'ID',
    cell: ({ row }) => h('span', { class: 'text-muted text-sm' }, `#${row.original.ID}`)
  },
  {
    accessorKey: 'Name',
    header: '套餐名称',
    cell: ({ row }) =>
      h('div', undefined, [
        h('p', { class: 'font-medium text-highlighted' }, row.original.Name),
        row.original.Content
          ? h('p', { class: 'text-xs text-muted truncate max-w-48' }, row.original.Content)
          : null
      ])
  },
  {
    accessorKey: 'TransferEnable',
    header: '流量',
    cell: ({ row }) => h('span', undefined, formatBytes(row.original.TransferEnable))
  },
  {
    accessorKey: 'SpeedLimit',
    header: '速度限制',
    cell: ({ row }) =>
      h('span', undefined, row.original.SpeedLimit ? `${row.original.SpeedLimit} Mbps` : '不限')
  },
  {
    accessorKey: 'DeviceLimit',
    header: '设备数',
    cell: ({ row }) =>
      h('span', undefined, row.original.DeviceLimit ? `${row.original.DeviceLimit}` : '不限')
  },
  {
    accessorKey: 'Sort',
    header: '排序'
  },
  {
    accessorKey: 'Show',
    header: '前端展示',
    cell: ({ row }) =>
      h(UBadge, { variant: 'subtle', color: row.original.Show ? 'success' : 'neutral' }, () =>
        row.original.Show ? '展示' : '隐藏'
      )
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
        h(UDropdownMenu, {
          content: { align: 'end' },
          items: getRowItems(row)
        }, () =>
          h(UButton, {
            icon: 'i-lucide-ellipsis-vertical',
            color: 'neutral',
            variant: 'ghost',
            class: 'ml-auto'
          })
        )
      )
  }
]
</script>

<template>
  <UDashboardPanel id="plans">
    <template #header>
      <UDashboardNavbar title="套餐管理">
        <template #leading>
          <UDashboardSidebarCollapse />
        </template>
        <template #right>
          <PlansFormModal @saved="loadPlans" />
        </template>
      </UDashboardNavbar>
    </template>

    <template #body>
      <div class="flex flex-wrap items-center justify-between gap-1.5">
        <UInput
          v-model="searchQuery"
          class="max-w-sm"
          icon="i-lucide-search"
          placeholder="搜索套餐名称..."
        />

        <div class="flex flex-wrap items-center gap-1.5">
          <UCheckbox v-model="includeDisabled" label="包含禁用" @update:model-value="loadPlans" />

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
        :data="filteredPlans"
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
          :total="filteredPlans.length"
          @update:page="(p: number) => table?.tableApi?.setPageIndex(p - 1)"
        />
      </div>
    </template>
  </UDashboardPanel>

  <!-- Edit modal -->
  <PlansFormModal
    v-if="editingPlan"
    v-model="showEditModal"
    :plan="editingPlan"
    @saved="loadPlans(); editingPlan = null"
    @update:model-value="(v: boolean) => { if (!v) editingPlan = null }"
  >
    <template #default><span /></template>
  </PlansFormModal>

  <!-- Delete modal -->
  <PlansDeleteModal
    v-if="deletingPlan"
    v-model="showDeleteModal"
    :plan="deletingPlan"
    @deleted="loadPlans(); deletingPlan = null"
    @update:model-value="(v: boolean) => { if (!v) deletingPlan = null }"
  >
    <span />
  </PlansDeleteModal>
</template>
