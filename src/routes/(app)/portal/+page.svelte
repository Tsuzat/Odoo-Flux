<script lang="ts">
	import { resolve } from '$app/paths';
	import { getMyInvoicesQuery, getMyOverviewQuery } from './data.remote.ts';
	import * as Card from '#lib/components/ui/card/index.ts';
	import { Badge, type BadgeVariant } from '#lib/components/ui/badge/index.ts';
	import { Button } from '#lib/components/ui/button/index.ts';
	import { Skeleton } from '#lib/components/ui/skeleton/index.ts';
	import { SidebarTrigger } from '#lib/components/ui/sidebar/index.ts';
	import { formatCurrency, formatDate, humanize } from '#lib/index.ts';
	import type { PageProps } from './$types';

	import CalendarClockIcon from '@lucide/svelte/icons/calendar-clock';
	import IndianRupeeIcon from '@lucide/svelte/icons/indian-rupee';
	import ReceiptTextIcon from '@lucide/svelte/icons/receipt-text';
	import RepeatIcon from '@lucide/svelte/icons/repeat';
	import TriangleAlertIcon from '@lucide/svelte/icons/triangle-alert';
	import WalletIcon from '@lucide/svelte/icons/wallet';

	const { data }: PageProps = $props();
	const overview = getMyOverviewQuery();
	const invoices = getMyInvoicesQuery();

	const INVOICE_BADGE: Record<string, BadgeVariant> = {
		draft: 'outline',
		confirmed: 'secondary',
		paid: 'default',
		cancelled: 'destructive'
	};
</script>

<svelte:head>
	<title>Overview — Brightloop</title>
</svelte:head>

<div class="flex flex-col gap-6">
	<div class="flex flex-col gap-1">
		<h1 class="text-2xl font-semibold tracking-tight">
			<SidebarTrigger class="mr-4" />
			Welcome back, {data.customer.name}
		</h1>
		<p class="text-sm text-muted-foreground">
			Your subscriptions, invoices and payments — no need to email anyone.
		</p>
	</div>

	{#if overview.error}
		<Card.Root>
			<Card.Header>
				<Card.Title class="flex items-center gap-2 text-destructive">
					<TriangleAlertIcon class="size-5" aria-hidden="true" />
					Couldn't load your overview
				</Card.Title>
				<Card.Description>{overview.error.message ?? 'Something went wrong.'}</Card.Description>
			</Card.Header>
			<Card.Footer>
				<Button variant="outline" onclick={() => overview.refresh()}>Try again</Button>
			</Card.Footer>
		</Card.Root>
	{:else if !overview.current}
		<div class="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
			<Skeleton class="h-32" />
			<Skeleton class="h-32" />
			<Skeleton class="h-32" />
			<Skeleton class="h-32" />
		</div>
	{:else}
		{@const o = overview.current}
		<div class="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
			<Card.Root>
				<Card.Header class="flex flex-row items-center justify-between">
					<Card.Title class="text-sm font-medium text-muted-foreground"
						>Active subscriptions</Card.Title
					>
					<RepeatIcon class="size-5 text-muted-foreground" aria-hidden="true" />
				</Card.Header>
				<Card.Content class="flex flex-col gap-1">
					<span class="text-3xl font-semibold">{o.activeSubscriptions}</span>
					<span class="text-xs text-muted-foreground">{o.totalSubscriptions} total</span>
				</Card.Content>
			</Card.Root>
			<Card.Root>
				<Card.Header class="flex flex-row items-center justify-between">
					<Card.Title class="text-sm font-medium text-muted-foreground">Outstanding</Card.Title>
					<ReceiptTextIcon class="size-5 text-muted-foreground" aria-hidden="true" />
				</Card.Header>
				<Card.Content class="flex flex-col gap-1">
					<span class="text-3xl font-semibold">{formatCurrency(o.outstandingAmount)}</span>
					<span class="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
						{o.outstandingInvoices} open invoices
						{#if o.overdueInvoices > 0}
							<Badge variant="destructive">{o.overdueInvoices} overdue</Badge>
						{/if}
					</span>
				</Card.Content>
			</Card.Root>
			<Card.Root>
				<Card.Header class="flex flex-row items-center justify-between">
					<Card.Title class="text-sm font-medium text-muted-foreground">Paid so far</Card.Title>
					<WalletIcon class="size-5 text-muted-foreground" aria-hidden="true" />
				</Card.Header>
				<Card.Content class="flex flex-col gap-1">
					<span class="text-3xl font-semibold">{formatCurrency(o.totalPaid)}</span>
					<span class="text-xs text-muted-foreground">Across all invoices</span>
				</Card.Content>
			</Card.Root>
			<Card.Root>
				<Card.Header class="flex flex-row items-center justify-between">
					<Card.Title class="text-sm font-medium text-muted-foreground">Next billing</Card.Title>
					<CalendarClockIcon class="size-5 text-muted-foreground" aria-hidden="true" />
				</Card.Header>
				<Card.Content class="flex flex-col gap-1">
					<span class="text-3xl font-semibold">{formatDate(o.nextBillingDate)}</span>
					<span class="text-xs text-muted-foreground">For your active subscriptions</span>
				</Card.Content>
			</Card.Root>
		</div>
	{/if}

	<Card.Root>
		<Card.Header class="flex flex-row items-center justify-between">
			<div>
				<Card.Title>Recent invoices</Card.Title>
				<Card.Description>Your latest bills from Brightloop.</Card.Description>
			</div>
			<Button variant="outline" size="sm" href={resolve('/(app)/portal/invoices')}>View all</Button>
		</Card.Header>
		<Card.Content class="flex flex-col gap-3">
			{#if !invoices.current}
				<Skeleton class="h-24" />
			{:else if invoices.current.length === 0}
				<p class="text-sm text-muted-foreground">No invoices yet.</p>
			{:else}
				{#each invoices.current.slice(0, 5) as inv (inv.id)}
					<div class="flex items-center justify-between gap-3 text-sm">
						<div class="flex flex-col">
							<span class="font-medium">{inv.number}</span>
							<span class="text-xs text-muted-foreground">
								{inv.subscription.number} · Due {formatDate(inv.dueDate)}
							</span>
						</div>
						<span class="flex items-center gap-2">
							<Badge variant={INVOICE_BADGE[inv.status] ?? 'outline'}>{humanize(inv.status)}</Badge>
							<span class="font-medium">{formatCurrency(inv.total)}</span>
						</span>
					</div>
				{/each}
			{/if}
		</Card.Content>
	</Card.Root>

	<div class="flex items-center gap-2 text-sm text-muted-foreground">
		<IndianRupeeIcon class="size-4" aria-hidden="true" />
		Questions about a bill? Email us at brightloop@tsuzat.com.
	</div>
</div>
