<script setup lang="ts">
import { useTemplateRef, h, ref, computed, resolveComponent } from 'vue'
import { upperFirst } from 'scule'
import type { TableColumn } from '@nuxt/ui'
import { getPaginationRowModel, type Row } from '@tanstack/table-core'
import type { AdminUser, Plan } from '../types'
import { fetchUsers } from '../api/users'
import { fetchPlans } from '../api/plans'

const UButton = resolveComponent('UButton')
const UBadge = resolveComponent('UBadge')
const UDropdownMenu = resolveComponent('UDropdownMenu')

const toast = useToast()
const table = useTemplateRef('table')

const users = ref<AdminUser[]>([])
const plans = ref<Plan[]>([])
const loading = ref(false)
const showDisabled = ref(false)
const searchQuery = ref('')
const filterPlanId = ref<number | null>(null)

const editingUser = ref<AdminUser | null>(null)
const deletingUser = ref<AdminUser | null>(null)
const showEditModal = ref(false)
const showDeleteModal = ref(false)

const loadUsers = async () => {
  loading.value = true
  try {
    const params: { plan_id?: number; status?: number } = {}
    if (filterPlanId.value !== null) params.plan_id = filterPlanId.value
    if (!showDisabled.value) params.status = 1
    users.value = await fetchUsers(params)
  } catch (e: unknown) {
    toast.add({ title: '加载失败', description: (e as Error).message, color: 'error' })
  } finally {
    loading.value = false
  }
}

const loadPlans = async () => {
  try {
    plans.value = await fetchPlans(true)
  } catch {
    // ignore
  }
}

loadPlans()
loadUsers()

const planMap = computed(() => {
  const map = new Map<number, string>()
  plans.value.forEach(p => map.set(p.id, p.name))
  return map
})

const filteredUsers = computed(() => {
  if (!searchQuery.value) return users.value
  const q = searchQuery.value.toLowerCase()
  return users.value.filter(u =>
    (u.email ?? '').toLowerCase().includes(q)
    || u.uuid.toLowerCase().includes(q)
    || (u.remarks ?? '').toLowerCase().includes(q)
  )
})

const openEdit = (user: AdminUser) => {
  editingUser.value = user
  showEditModal.value = true
}

const openDelete = (user: AdminUser) => {
  deletingUser.value = user
  showDeleteModal.value = true
}

const getRowItems = (row: Row<AdminUser>) => {
  return [
    { type: 'label' as const, label: '操作' },
    { label: '编辑用户', icon: 'i-lucide-pencil', onSelect() { openEdit(row.original) } },
    { type: 'separator' as const },
    { label: '删除用户', icon: 'i-lucide-trash', color: 'error' as const, onSelect() { openDelete(row.original) } }
  ]
}

const columnVisibility = ref()
const pagination = ref({ pageIndex: 0, pageSize: 10 })

const columns: TableColumn<AdminUser>[] = [
  {
    accessorKey: 'id',
    header: 'ID',
    cell: ({ row }) => h('span', { class: 'text-muted text-sm' }, `#${row.original.id}`)
  },
  {
    accessorKey: 'email',
    header: '邮箱',
    cell: ({ row }) =>
      h('div', undefined, [
        h('p', { class: 'font-medium text-highlighted' }, row.original.email || '-'),
        h('p', { class: 'text-xs text-muted truncate max-w-48' }, row.original.uuid)
      ])
  },
  {
    accessorKey: 'plan_id',
    header: '套餐',
    cell: ({ row }) =>
      h('span', undefined, row.original.plan_id ? (planMap.value.get(row.original.plan_id) || `#${row.original.plan_id}`) : '-')
  },
  {
    accessorKey: 'status',
    header: '状态',
    cell: ({ row }) =>
      h(UBadge, { variant: 'subtle', color: row.original.status === 1 ? 'success' : 'error' }, () =>
        row.original.status === 1 ? '启用' : '禁用'
      )
  },
  {
    accessorKey: 'is_admin',
    header: '角色',
    cell: ({ row }) =>
      h(UBadge, { variant: 'subtle', color: row.original.is_admin === 1 ? 'primary' : 'neutral' }, () =>
        row.original.is_admin === 1 ? '管理员' : '用户'
      )
  },
  {
    accessorKey: 'remarks',
    header: '备注',
    cell: ({ row }) => h('span', { class: 'text-sm text-muted truncate max-w-32 block' }, row.original.remarks || '-')
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

const planFilterOptions = computed(() => [
  { label: '全部套餐', value: null },
  ...plans.value.map(p => ({ label: p.name, value: p.id }))
])

function onPlanFilterChange(val: number | null) {
  filterPlanId.value = val
  loadUsers()
}

function onShowDisabledChange() {
  loadUsers()
}
</script>

<template>
  <UDashboardPanel id="users">
    <template #header>
      <UDashboardNavbar title="用户管理">
        <template #leading>
          <UDashboardSidebarCollapse />
        </template>
        <template #right>
          <UsersFormModal @saved="loadUsers" />
        </template>
      </UDashboardNavbar>
    </template>

    <template #body>
      <div class="flex flex-wrap items-center justify-between gap-1.5">
        <UInput
          v-model="searchQuery"
          class="max-w-sm"
          icon="i-lucide-search"
          placeholder="搜索邮箱、UUID 或备注..."
        />

        <div class="flex flex-wrap items-center gap-1.5">
          <USelect
            :model-value="filterPlanId"
            :items="planFilterOptions"
            class="w-40"
            @update:model-value="onPlanFilterChange"
          />

          <UCheckbox v-model="showDisabled" label="显示禁用" @update:model-value="onShowDisabledChange" />

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
        :data="filteredUsers"
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
          :total="filteredUsers.length"
          @update:page="(p: number) => table?.tableApi?.setPageIndex(p - 1)"
        />
      </div>
    </template>
  </UDashboardPanel>

  <UsersFormModal
    v-if="editingUser"
    v-model="showEditModal"
    :user="editingUser"
    @saved="loadUsers(); editingUser = null"
    @update:model-value="(v: boolean) => { if (!v) editingUser = null }"
  >
    <template #default><span /></template>
  </UsersFormModal>

  <UsersDeleteModal
    v-if="deletingUser"
    v-model="showDeleteModal"
    :user="deletingUser"
    @deleted="loadUsers(); deletingUser = null"
    @update:model-value="(v: boolean) => { if (!v) deletingUser = null }"
  >
    <span />
  </UsersDeleteModal>
</template>
