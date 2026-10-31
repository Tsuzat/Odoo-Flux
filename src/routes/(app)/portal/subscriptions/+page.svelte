<script lang="ts">
	import {
		getMySubscriptionQuery,
		getMySubscriptionsQuery,
		transitionMySubscriptionCommand
	} from '../data.remote.ts';
	import * as Card from '#lib/components/ui/card/index.ts';
	import * as Table from '#lib/components/ui/table/index.ts';
	import * as Sheet from '#lib/components/ui/sheet/index.ts';
	import AppSheetContent from '#lib/components/custom/app-sheet-content.svelte';
	import { Badge, type BadgeVariant } from '#lib/components/ui/badge/index.ts';
	import { Button } from '#lib/components/ui/button/index.ts';
	import { Skeleton } from '#lib/components/ui/skeleton/index.ts';
	import { SidebarTrigger } from '#lib/components/ui/sidebar/index.ts';
	import { toast } from 'svelte-sonner';
	import { formatCurrency, formatDate, humanize } from '#lib/index.ts';
	import { BarSpinner } from '#lib/components/custom/index.ts';

	import EyeIcon from '@lucide/svelte/icons/eye';
	import TriangleAlertIcon from '@lucide/svelte/icons/triangle-alert';

	const subscriptions = getMySubscriptionsQuery();

	const STATUS_BADGE: Record<string, BadgeVariant> = {
		draft: 'outline',
		quotation: 'outline',
		confirmed: 'secondary',
		active: 'default',
		paused: 'secondary',
		closed: 'destructive'
	};

	let selectedId = $state<string | null>(null);
	const detail = $derived(selectedId ? getMySubscriptionQuery(selectedId) : null);
	let acting = $state<string | null>(null);

	async function act(id: string, action: 'pause' | 'resume' | 'renew' | 'close') {
		acting = action;
		try {
			await transitionMySubscriptionCommand({ id, action });
			toast.success(
				action === 'pause'
					? 'Subscription paused.'
					: action === 'resume'
						? 'Subscription resumed.'
						: action === 'renew'
							? 'Subscription renewed.'
							: 'Subscription closed.'
			);
		} catch (e) {
			toast.error(e instanceof Error ? e.message : 'Action failed.');
		} finally {
			acting = null;
		}
	}
</script>

<svelte:head>
	<title>My Subscriptions — Brightloop</title>
</svelte:head>

<div class="flex flex-col gap-6">
	<div class="flex flex-col gap-1">
		<h1 class="text-2xl font-semibold tracking-tight">
			<SidebarTrigger class="mr-4" />
			My Subscriptions
		</h1>
		<p class="text-sm text-muted-foreground">
			See where each subscription stands, and pause, resume, renew or close it yourself.
		</p>
	</div>

	{#if subscriptions.error}
		<Card.Root>
			<Card.Header>
				<Card.Title class="flex items-center gap-2 text-destructive">
					<TriangleAlertIcon class="size-5" aria-hidden="true" />
					Couldn't load your subscriptions
				</Card.Title>
				<Card.Description>{subscriptions.error.message ?? 'Something went wrong.'}</Card.Description
				>
			</Card.Header>
			<Card.Footer>
				<Button variant="outline" onclick={() => subscriptions.refresh()}>Try again</Button>
			</Card.Footer>
		</Card.Root>
	{:else if !subscriptions.current}
		<Skeleton class="h-96" aria-label="Loading subscriptions" />
	{:else if subscriptions.current.length === 0}
		<Card.Root>
			<Card.Content class="flex flex-col items-center gap-2 py-12 text-center">
				<p class="font-medium">No subscriptions yet</p>
				<p class="text-sm text-muted-foreground">
					When you subscribe to a Brightloop product, it will show up here.
				</p>
			</Card.Content>
		</Card.Root>
	{:else}
		<Card.Root>
			<Card.Content>
				<Table.Root>
					<Table.Header>
						<Table.Row>
							<Table.Head>Number</Table.Head>
							<Table.Head>Plan</Table.Head>
							<Table.Head>Status</Table.Head>
							<Table.Head class="text-right">Per period</Table.Head>
							<Table.Head>Next billing</Table.Head>
							<Table.Head class="text-right">View</Table.Head>
						</Table.Row>
					</Table.Header>
					<Table.Body>
						{#each subscriptions.current as s (s.id)}
							<Table.Row>
								<Table.Cell class="font-medium">{s.number}</Table.Cell>
								<Table.Cell>{s.plan.name}</Table.Cell>
								<Table.Cell>
									<Badge variant={STATUS_BADGE[s.status] ?? 'outline'}>{humanize(s.status)}</Badge>
								</Table.Cell>
								<Table.Cell class="text-right">
									{formatCurrency(s.lines.reduce((sum, l) => sum + Number(l.amount), 0))}
								</Table.Cell>
								<Table.Cell>{formatDate(s.nextBillingDate)}</Table.Cell>
								<Table.Cell class="text-right">
									<Button
										variant="ghost"
										size="icon"
										aria-label="View subscription"
										onclick={() => (selectedId = s.id)}
									>
										<EyeIcon />
									</Button>
								</Table.Cell>
							</Table.Row>
						{/each}
					</Table.Body>
				</Table.Root>
			</Card.Content>
		</Card.Root>
	{/if}
</div>

<Sheet.Root
	open={selectedId !== null}
	onOpenChange={(open) => {
		if (!open) selectedId = null;
	}}
>
	<AppSheetContent>
		{#if detail?.error}
			<Sheet.Header>
				<Sheet.Title>Subscription</Sheet.Title>
				<Sheet.Description class="text-destructive">{detail.error.message}</Sheet.Description>
			</Sheet.Header>
		{:else if !detail?.current}
			<div class="flex flex-col gap-3 p-4">
				<Skeleton class="h-8 w-48" />
				<Skeleton class="h-64" />
			</div>
		{:else}
			{@const s = detail.current}
			<Sheet.Header>
				<Sheet.Title>{s.number}</Sheet.Title>
				<Sheet.Description>
					{s.plan.name} ({humanize(s.plan.billingPeriod)}) · Started {formatDate(s.startDate)}
				</Sheet.Description>
			</Sheet.Header>

			<div class="flex flex-col gap-5 px-4 pb-6">
				<div class="flex flex-wrap items-center gap-2">
					<Badge variant={STATUS_BADGE[s.status] ?? 'outline'}>{humanize(s.status)}</Badge>
					<span class="text-xs text-muted-foreground">
						Next billing {formatDate(s.nextBillingDate)}
						{#if s.expiryDate}· Expires {formatDate(s.expiryDate)}{/if}
					</span>
				</div>

				<Table.Root>
					<Table.Header>
						<Table.Row>
							<Table.Head>Product</Table.Head>
							<Table.Head class="text-right">Qty</Table.Head>
							<Table.Head class="text-right">Amount</Table.Head>
						</Table.Row>
					</Table.Header>
					<Table.Body>
						{#each s.lines as l (l.id)}
							<Table.Row>
								<Table.Cell>
									<div class="flex flex-col">
										<span>{l.product.name}</span>
										{#if l.variant}
											<span class="text-xs text-muted-foreground">
												{l.variant.attribute}: {l.variant.value}
											</span>
										{/if}
									</div>
								</Table.Cell>
								<Table.Cell class="text-right">{l.quantity}</Table.Cell>
								<Table.Cell class="text-right">{formatCurrency(l.amount)}</Table.Cell>
							</Table.Row>
						{/each}
					</Table.Body>
				</Table.Root>

				<div class="flex flex-col gap-2">
					<p class="text-sm font-medium">Invoices ({s.invoices.length})</p>
					{#if s.invoices.length === 0}
						<p class="text-sm text-muted-foreground">No invoices yet.</p>
					{:else}
						{#each s.invoices as inv (inv.id)}
							<div class="flex items-center justify-between text-sm">
								<span>{inv.number}</span>
								<span class="flex items-center gap-2">
									<Badge variant={STATUS_BADGE[inv.status] ?? 'outline'}
										>{humanize(inv.status)}</Badge
									>
									<span class="font-medium">{formatCurrency(inv.total)}</span>
								</span>
							</div>
						{/each}
					{/if}
				</div>

				<div class="flex flex-col gap-2 border-t pt-4">
					<p class="text-sm font-medium">Manage</p>
					<div class="flex flex-wrap items-center gap-2">
						{#if s.status === 'active' && s.plan.pausable}
							<Button
								size="sm"
								variant="outline"
								disabled={acting !== null}
								onclick={() => act(s.id, 'pause')}
							>
								Pause subscription
							</Button>
						{/if}
						{#if s.status === 'paused'}
							<Button size="sm" disabled={acting !== null} onclick={() => act(s.id, 'resume')}>
								Resume subscription
							</Button>
						{/if}
						{#if (s.status === 'active' || s.status === 'closed') && s.plan.renewable}
							<Button
								size="sm"
								variant="outline"
								disabled={acting !== null}
								onclick={() => act(s.id, 'renew')}
							>
								Renew
							</Button>
						{/if}
						{#if ['active', 'paused', 'confirmed'].includes(s.status) && s.plan.closable}
							<Button
								size="sm"
								variant="destructive"
								disabled={acting !== null}
								onclick={() => act(s.id, 'close')}
							>
								Close subscription
							</Button>
						{/if}
						{#if acting}
							<BarSpinner role="status" aria-label="Working" />
						{/if}
					</div>
					{#if s.status === 'active' && !s.plan.pausable && !s.plan.closable}
						<p class="text-xs text-muted-foreground">
							This plan can't be paused or closed early — it runs until {formatDate(s.expiryDate)}.
						</p>
					{/if}
				</div>
			</div>
		{/if}
	</AppSheetContent>
</Sheet.Root>
