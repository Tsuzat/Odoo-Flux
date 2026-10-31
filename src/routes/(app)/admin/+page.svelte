<script lang="ts">
	import { getDashboard } from './data.remote.ts';
	import * as Card from '#lib/components/ui/card/index.ts';
	import * as Table from '#lib/components/ui/table/index.ts';
	import { Badge, type BadgeVariant } from '#lib/components/ui/badge/index.ts';
	import { Button } from '#lib/components/ui/button/index.ts';
	import { Skeleton } from '#lib/components/ui/skeleton/index.ts';
	import { formatCurrency, formatDate, humanize } from '#lib/index.ts';

	import BadgePercentIcon from '@lucide/svelte/icons/badge-percent';
	import CalendarClockIcon from '@lucide/svelte/icons/calendar-clock';
	import ChevronRightIcon from '@lucide/svelte/icons/chevron-right';
	import IndianRupeeIcon from '@lucide/svelte/icons/indian-rupee';
	import LayersIcon from '@lucide/svelte/icons/layers';
	import NotebookTextIcon from '@lucide/svelte/icons/notebook-text';
	import PackageIcon from '@lucide/svelte/icons/package';
	import PercentIcon from '@lucide/svelte/icons/percent';
	import ReceiptTextIcon from '@lucide/svelte/icons/receipt-text';
	import RefreshCwIcon from '@lucide/svelte/icons/refresh-cw';
	import RepeatIcon from '@lucide/svelte/icons/repeat';
	import TriangleAlertIcon from '@lucide/svelte/icons/triangle-alert';
	import UsersIcon from '@lucide/svelte/icons/users';
	import WalletIcon from '@lucide/svelte/icons/wallet';
	import { SidebarTrigger } from '#lib/components/ui/sidebar/index.ts';

	const dashboard = getDashboard();

	const SUBSCRIPTION_BADGE: Record<string, BadgeVariant> = {
		draft: 'outline',
		quotation: 'outline',
		confirmed: 'secondary',
		active: 'default',
		paused: 'secondary',
		closed: 'destructive'
	};

	const INVOICE_BADGE: Record<string, BadgeVariant> = {
		draft: 'outline',
		confirmed: 'secondary',
		paid: 'default',
		cancelled: 'destructive'
	};

	const maxSubscriptionCount = $derived(
		Math.max(1, ...(dashboard.current?.subscriptionsByStatus.map((s) => s.count) ?? [1]))
	);

	function refresh() {
		dashboard.refresh();
	}
</script>

<svelte:head>
	<title>Dashboard — Brightloop</title>
</svelte:head>

<div class="flex flex-col gap-6">
	<div class="flex flex-wrap items-start justify-between gap-4">
		<div class="flex flex-col gap-1">
			<h1 class="text-2xl font-semibold tracking-tight">
				<SidebarTrigger class="mr-4" />
				Dashboard
			</h1>
			<p class="text-sm text-muted-foreground">
				Active subscriptions, revenue, payments and overdue invoices at a glance.
			</p>
		</div>
		<Button variant="outline" onclick={refresh} disabled={dashboard.loading}>
			<RefreshCwIcon data-icon="inline-start" class={dashboard.loading ? 'animate-spin' : ''} />
			Refresh
		</Button>
	</div>

	{#if dashboard.error}
		<Card.Root>
			<Card.Header>
				<Card.Title class="flex items-center gap-2 text-destructive">
					<TriangleAlertIcon class="size-5" aria-hidden="true" />
					Couldn't load the dashboard
				</Card.Title>
				<Card.Description>
					{dashboard.error.message ?? 'Something went wrong while loading the numbers.'}
				</Card.Description>
			</Card.Header>
			<Card.Footer>
				<Button variant="outline" onclick={refresh}>Try again</Button>
			</Card.Footer>
		</Card.Root>
	{:else if !dashboard.current}
		<div class="grid gap-4 md:grid-cols-2 xl:grid-cols-4" aria-label="Loading dashboard">
			<Skeleton class="h-32" />
			<Skeleton class="h-32" />
			<Skeleton class="h-32" />
			<Skeleton class="h-32" />
		</div>
		<div class="grid gap-4 lg:grid-cols-3">
			<Skeleton class="h-64" />
			<Skeleton class="h-64" />
			<Skeleton class="h-64" />
		</div>
		<Skeleton class="h-72" />
	{:else}
		{@const d = dashboard.current}
		{@const stats = d.stats}

		<div class="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
			<Card.Root>
				<Card.Header class="flex flex-row items-center justify-between">
					<Card.Title class="text-sm font-medium text-muted-foreground">
						Active subscriptions
					</Card.Title>
					<RepeatIcon class="size-5 text-muted-foreground" aria-hidden="true" />
				</Card.Header>
				<Card.Content class="flex flex-col gap-1">
					<span class="text-3xl font-semibold">{stats.activeSubscriptions}</span>
					<span class="text-xs text-muted-foreground">
						{stats.totalSubscriptions} total · {stats.customers} customers
					</span>
				</Card.Content>
			</Card.Root>

			<Card.Root>
				<Card.Header class="flex flex-row items-center justify-between">
					<Card.Title class="text-sm font-medium text-muted-foreground">
						Monthly recurring revenue
					</Card.Title>
					<IndianRupeeIcon class="size-5 text-muted-foreground" aria-hidden="true" />
				</Card.Header>
				<Card.Content class="flex flex-col gap-1">
					<span class="text-3xl font-semibold">{formatCurrency(stats.monthlyRecurringRevenue)}</span
					>
					<span class="text-xs text-muted-foreground">From active subscription lines</span>
				</Card.Content>
			</Card.Root>

			<Card.Root>
				<Card.Header class="flex flex-row items-center justify-between">
					<Card.Title class="text-sm font-medium text-muted-foreground">
						Revenue collected
					</Card.Title>
					<WalletIcon class="size-5 text-muted-foreground" aria-hidden="true" />
				</Card.Header>
				<Card.Content class="flex flex-col gap-1">
					<span class="text-3xl font-semibold">{formatCurrency(stats.revenueCollected)}</span>
					<span class="text-xs text-muted-foreground">
						{stats.paymentsCount} payments recorded
					</span>
				</Card.Content>
			</Card.Root>

			<Card.Root>
				<Card.Header class="flex flex-row items-center justify-between">
					<Card.Title class="text-sm font-medium text-muted-foreground">Outstanding</Card.Title>
					<ReceiptTextIcon class="size-5 text-muted-foreground" aria-hidden="true" />
				</Card.Header>
				<Card.Content class="flex flex-col gap-1">
					<span class="text-3xl font-semibold">{formatCurrency(stats.outstandingAmount)}</span>
					<span class="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
						{stats.outstandingInvoices} open invoices
						{#if stats.overdueInvoices > 0}
							<Badge variant="destructive">
								{stats.overdueInvoices} overdue · {formatCurrency(stats.overdueAmount)}
							</Badge>
						{/if}
					</span>
				</Card.Content>
			</Card.Root>
		</div>

		<div class="grid gap-4 lg:grid-cols-3">
			<Card.Root>
				<Card.Header>
					<Card.Title>Subscriptions by status</Card.Title>
					<Card.Description>Where every subscription stands right now.</Card.Description>
				</Card.Header>
				<Card.Content class="flex flex-col gap-3">
					{#each d.subscriptionsByStatus as row (row.status)}
						<div class="flex flex-col gap-1.5">
							<div class="flex items-center justify-between gap-2">
								<Badge variant={SUBSCRIPTION_BADGE[row.status] ?? 'outline'}>
									{humanize(row.status)}
								</Badge>
								<span class="text-sm font-medium">{row.count}</span>
							</div>
							<div class="h-2 overflow-hidden rounded-full bg-muted" aria-hidden="true">
								<div
									class="h-full rounded-full bg-primary"
									style="width: {(row.count / maxSubscriptionCount) * 100}%"
								></div>
							</div>
						</div>
					{/each}
				</Card.Content>
			</Card.Root>

			<Card.Root>
				<Card.Header>
					<Card.Title>Invoices by status</Card.Title>
					<Card.Description>Draft to confirmed to paid.</Card.Description>
				</Card.Header>
				<Card.Content class="flex flex-col gap-3">
					{#each d.invoicesByStatus as row (row.status)}
						<div class="flex items-center justify-between gap-2">
							<Badge variant={INVOICE_BADGE[row.status] ?? 'outline'}>{humanize(row.status)}</Badge>
							<span class="text-sm font-medium">{row.count}</span>
						</div>
					{/each}
					{#if stats.overdueInvoices > 0}
						<p class="flex items-center gap-2 text-sm text-destructive">
							<TriangleAlertIcon class="size-4" aria-hidden="true" />
							{stats.overdueInvoices} overdue, {formatCurrency(stats.overdueAmount)} at risk
						</p>
					{/if}
				</Card.Content>
			</Card.Root>

			<Card.Root>
				<Card.Header>
					<Card.Title>Catalog</Card.Title>
					<Card.Description>What Brightloop sells on subscription.</Card.Description>
				</Card.Header>
				<Card.Content class="flex flex-col">
					<!-- eslint-disable svelte/no-navigation-without-resolve -- catalog routes are built in the next steps -->
					<a
						href="/admin/products"
						class="nodefault flex items-center gap-3 rounded-md px-2 py-2 text-sm hover:bg-muted"
					>
						<PackageIcon class="size-4 text-muted-foreground" aria-hidden="true" />
						<span class="flex-1">Products & variants</span>
						<span class="text-muted-foreground">
							{d.catalog.activeProducts}/{d.catalog.products} active
						</span>
						<ChevronRightIcon class="size-4 text-muted-foreground" aria-hidden="true" />
					</a>
					<a
						href="/admin/plans"
						class="nodefault flex items-center gap-3 rounded-md px-2 py-2 text-sm hover:bg-muted"
					>
						<LayersIcon class="size-4 text-muted-foreground" aria-hidden="true" />
						<span class="flex-1">Plans</span>
						<span class="text-muted-foreground"
							>{d.catalog.activePlans}/{d.catalog.plans} active</span
						>
						<ChevronRightIcon class="size-4 text-muted-foreground" aria-hidden="true" />
					</a>
					<a
						href="/admin/taxes"
						class="nodefault flex items-center gap-3 rounded-md px-2 py-2 text-sm hover:bg-muted"
					>
						<PercentIcon class="size-4 text-muted-foreground" aria-hidden="true" />
						<span class="flex-1">Taxes</span>
						<span class="text-muted-foreground">{d.catalog.taxes} rates</span>
						<ChevronRightIcon class="size-4 text-muted-foreground" aria-hidden="true" />
					</a>
					<a
						href="/admin/discounts"
						class="nodefault flex items-center gap-3 rounded-md px-2 py-2 text-sm hover:bg-muted"
					>
						<BadgePercentIcon class="size-4 text-muted-foreground" aria-hidden="true" />
						<span class="flex-1">Discounts</span>
						<span class="text-muted-foreground">
							{d.catalog.activeDiscounts}/{d.catalog.discounts} active
						</span>
						<ChevronRightIcon class="size-4 text-muted-foreground" aria-hidden="true" />
					</a>
					<a
						href="/admin/quotation-templates"
						class="nodefault flex items-center gap-3 rounded-md px-2 py-2 text-sm hover:bg-muted"
					>
						<NotebookTextIcon class="size-4 text-muted-foreground" aria-hidden="true" />
						<span class="flex-1">Quotation templates</span>
						<span class="text-muted-foreground">{d.catalog.quotationTemplates} templates</span>
						<ChevronRightIcon class="size-4 text-muted-foreground" aria-hidden="true" />
					</a>
					<!-- eslint-enable svelte/no-navigation-without-resolve -->
				</Card.Content>
			</Card.Root>
		</div>

		<div class="grid gap-4 lg:grid-cols-5">
			<Card.Root class="lg:col-span-3">
				<Card.Header>
					<Card.Title>Recent invoices</Card.Title>
					<Card.Description>The latest invoices generated from subscriptions.</Card.Description>
				</Card.Header>
				<Card.Content>
					{#if d.recentInvoices.length === 0}
						<p class="text-sm text-muted-foreground">
							No invoices yet. They will appear here automatically on billing day.
						</p>
					{:else}
						<Table.Root>
							<Table.Header>
								<Table.Row>
									<Table.Head>Number</Table.Head>
									<Table.Head>Customer</Table.Head>
									<Table.Head>Status</Table.Head>
									<Table.Head>Due</Table.Head>
									<Table.Head class="text-right">Total</Table.Head>
								</Table.Row>
							</Table.Header>
							<Table.Body>
								{#each d.recentInvoices as inv (inv.id)}
									<Table.Row>
										<Table.Cell class="font-medium">{inv.number}</Table.Cell>
										<Table.Cell>{inv.customerName}</Table.Cell>
										<Table.Cell>
											<Badge variant={INVOICE_BADGE[inv.status] ?? 'outline'}>
												{humanize(inv.status)}
											</Badge>
										</Table.Cell>
										<Table.Cell>{formatDate(inv.dueDate)}</Table.Cell>
										<Table.Cell class="text-right">{formatCurrency(inv.total)}</Table.Cell>
									</Table.Row>
								{/each}
							</Table.Body>
						</Table.Root>
					{/if}
				</Card.Content>
			</Card.Root>

			<div class="flex flex-col gap-4 lg:col-span-2">
				<Card.Root>
					<Card.Header>
						<Card.Title class="flex items-center gap-2">
							<WalletIcon class="size-5 text-muted-foreground" aria-hidden="true" />
							Recent payments
						</Card.Title>
					</Card.Header>
					<Card.Content class="flex flex-col gap-3">
						{#if d.recentPayments.length === 0}
							<p class="text-sm text-muted-foreground">No payments recorded yet.</p>
						{:else}
							{#each d.recentPayments as pay (pay.id)}
								<div class="flex items-start justify-between gap-3 text-sm">
									<div class="flex flex-col">
										<span class="font-medium">{pay.invoiceNumber}</span>
										<span class="text-xs text-muted-foreground">
											{pay.customerName} · {humanize(pay.method)} · {formatDate(pay.paidOn)}
										</span>
									</div>
									<span class="font-medium">{formatCurrency(pay.amount)}</span>
								</div>
							{/each}
						{/if}
					</Card.Content>
				</Card.Root>

				<Card.Root>
					<Card.Header>
						<Card.Title class="flex items-center gap-2">
							<CalendarClockIcon class="size-5 text-muted-foreground" aria-hidden="true" />
							Upcoming renewals
						</Card.Title>
					</Card.Header>
					<Card.Content class="flex flex-col gap-3">
						{#if d.upcomingRenewals.length === 0}
							<p class="text-sm text-muted-foreground">No renewals scheduled.</p>
						{:else}
							{#each d.upcomingRenewals as sub (sub.id)}
								<div class="flex items-start justify-between gap-3 text-sm">
									<div class="flex flex-col">
										<span class="font-medium">{sub.number}</span>
										<span class="text-xs text-muted-foreground">
											{sub.customerName} · {sub.planName}
										</span>
									</div>
									<span class="text-muted-foreground">{formatDate(sub.nextBillingDate)}</span>
								</div>
							{/each}
						{/if}
					</Card.Content>
				</Card.Root>

				<Card.Root>
					<Card.Header>
						<Card.Title class="flex items-center gap-2">
							<UsersIcon class="size-5 text-muted-foreground" aria-hidden="true" />
							Customers
						</Card.Title>
					</Card.Header>
					<Card.Content>
						<p class="text-sm text-muted-foreground">
							{stats.customers} customer accounts on Brightloop.
						</p>
					</Card.Content>
				</Card.Root>
			</div>
		</div>

		<p class="text-xs text-muted-foreground">
			Updated {formatDate(d.generatedAt)} · figures cached for 60 seconds
		</p>
	{/if}
</div>
