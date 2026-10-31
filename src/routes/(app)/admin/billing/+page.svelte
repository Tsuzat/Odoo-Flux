<script lang="ts">
	import { getBillingPreview, runBillingCommand } from '../data.remote.ts';
	import * as Card from '#lib/components/ui/card/index.ts';
	import * as Table from '#lib/components/ui/table/index.ts';
	import { Badge } from '#lib/components/ui/badge/index.ts';
	import { Button } from '#lib/components/ui/button/index.ts';
	import { Skeleton } from '#lib/components/ui/skeleton/index.ts';
	import { SidebarTrigger } from '#lib/components/ui/sidebar/index.ts';
	import { toast } from 'svelte-sonner';
	import { formatCurrency, formatDate, humanize } from '#lib/index.ts';
	import { BarSpinner } from '#lib/components/custom/index.ts';

	import CirclePlayIcon from '@lucide/svelte/icons/circle-play';
	import TriangleAlertIcon from '@lucide/svelte/icons/triangle-alert';

	const preview = getBillingPreview();

	type BillingRunSummary = Awaited<ReturnType<typeof runBillingCommand>>;

	let running = $state(false);
	let summary = $state<BillingRunSummary | null>(null);

	const dueTotal = $derived((preview.current ?? []).reduce((sum, s) => sum + s.estimatedAmount, 0));

	async function runBilling() {
		running = true;
		try {
			summary = await runBillingCommand();
			if (summary.errors.length > 0) {
				toast.warning(
					`Billing run finished with ${summary.errors.length} error(s) — see details below.`
				);
			} else {
				toast.success(`Billing run complete: ${summary.created.length} invoice(s) created.`);
			}
		} catch (e) {
			toast.error(e instanceof Error ? e.message : 'Billing run failed.');
		} finally {
			running = false;
		}
	}
</script>

<svelte:head>
	<title>Run Billing — Brightloop</title>
</svelte:head>

<div class="flex flex-col gap-6">
	<div class="flex flex-wrap items-start justify-between gap-4">
		<div class="flex flex-col gap-1">
			<h1 class="text-2xl font-semibold tracking-tight">
				<SidebarTrigger class="mr-4" />
				Run Billing
			</h1>
			<p class="text-sm text-muted-foreground">
				Generate invoices for every due subscription. Taxes and discounts apply automatically, and
				nothing is ever billed twice.
			</p>
		</div>
		<Button
			onclick={runBilling}
			disabled={running || !preview.current || preview.current.length === 0}
		>
			{#if running}
				<BarSpinner role="status" aria-label="Running billing" />
			{:else}
				<CirclePlayIcon data-icon="inline-start" />
			{/if}
			Run billing now
		</Button>
	</div>

	{#if preview.error}
		<Card.Root>
			<Card.Header>
				<Card.Title class="flex items-center gap-2 text-destructive">
					<TriangleAlertIcon class="size-5" aria-hidden="true" />
					Couldn't load the billing preview
				</Card.Title>
				<Card.Description>{preview.error.message ?? 'Something went wrong.'}</Card.Description>
			</Card.Header>
			<Card.Footer>
				<Button variant="outline" onclick={() => preview.refresh()}>Try again</Button>
			</Card.Footer>
		</Card.Root>
	{:else if !preview.current}
		<Skeleton class="h-96" aria-label="Loading billing preview" />
	{:else}
		<Card.Root>
			<Card.Header>
				<Card.Title>Due for billing</Card.Title>
				<Card.Description>
					{preview.current.length} active subscription(s) due, estimated {formatCurrency(dueTotal)} before
					tax and discounts. Missed periods are caught up automatically (max 12 per run).
				</Card.Description>
			</Card.Header>
			<Card.Content>
				{#if preview.current.length === 0}
					<p class="text-sm text-muted-foreground">
						Nothing is due right now. Subscriptions appear here when their next billing date
						arrives.
					</p>
				{:else}
					<Table.Root>
						<Table.Header>
							<Table.Row>
								<Table.Head>Subscription</Table.Head>
								<Table.Head>Customer</Table.Head>
								<Table.Head>Plan</Table.Head>
								<Table.Head>Next billing</Table.Head>
								<Table.Head class="text-right">Estimated</Table.Head>
							</Table.Row>
						</Table.Header>
						<Table.Body>
							{#each preview.current as s (s.id)}
								<Table.Row>
									<Table.Cell class="font-medium">{s.number}</Table.Cell>
									<Table.Cell>{s.customerName}</Table.Cell>
									<Table.Cell>
										{s.planName}
										<Badge variant="outline" class="ml-1">{humanize(s.billingPeriod)}</Badge>
									</Table.Cell>
									<Table.Cell>{formatDate(s.nextBillingDate)}</Table.Cell>
									<Table.Cell class="text-right">{formatCurrency(s.estimatedAmount)}</Table.Cell>
								</Table.Row>
							{/each}
						</Table.Body>
					</Table.Root>
				{/if}
			</Card.Content>
		</Card.Root>
	{/if}

	{#if summary}
		<Card.Root>
			<Card.Header>
				<Card.Title>Last run</Card.Title>
				<Card.Description>
					{summary.created.length} created · {summary.skipped.length} skipped · {summary.closed
						.length} auto-closed · {summary.errors.length} errors
				</Card.Description>
			</Card.Header>
			<Card.Content class="flex flex-col gap-4">
				{#if summary.created.length > 0}
					<div class="flex flex-col gap-1">
						<p class="text-sm font-medium">Invoices created</p>
						{#each summary.created as c (c.number)}
							<p class="text-sm text-muted-foreground">{c.number} for {c.subscriptionNumber}</p>
						{/each}
					</div>
				{/if}
				{#if summary.closed.length > 0}
					<p class="text-sm text-muted-foreground">
						Auto-closed: {summary.closed.join(', ')}
					</p>
				{/if}
				{#if summary.errors.length > 0}
					<div class="flex flex-col gap-1">
						<p class="flex items-center gap-2 text-sm font-medium text-destructive">
							<TriangleAlertIcon class="size-4" aria-hidden="true" />
							Errors
						</p>
						{#each summary.errors as err (err.subscriptionNumber)}
							<p class="text-sm text-destructive">{err.subscriptionNumber}: {err.message}</p>
						{/each}
					</div>
				{/if}
				<p class="text-sm text-muted-foreground">
					Generated invoices start as drafts — review and confirm them under Invoices.
				</p>
			</Card.Content>
		</Card.Root>
	{/if}
</div>
