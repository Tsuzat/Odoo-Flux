<script lang="ts">
	import { getMyPaymentsQuery } from '../data.remote.ts';
	import { downloadPaymentPdf } from '#lib/pdf.ts';
	import type { PageProps } from './$types';
	import * as Card from '#lib/components/ui/card/index.ts';
	import * as Table from '#lib/components/ui/table/index.ts';
	import { Badge } from '#lib/components/ui/badge/index.ts';
	import { Button } from '#lib/components/ui/button/index.ts';
	import { Skeleton } from '#lib/components/ui/skeleton/index.ts';
	import { SidebarTrigger } from '#lib/components/ui/sidebar/index.ts';
	import { formatCurrency, formatDate, humanize } from '#lib/index.ts';

	import DownloadIcon from '@lucide/svelte/icons/download';
	import TriangleAlertIcon from '@lucide/svelte/icons/triangle-alert';

	const payments = getMyPaymentsQuery();
	const { data }: PageProps = $props();
</script>

<svelte:head>
	<title>Payment History — Brightloop</title>
</svelte:head>

<div class="flex flex-col gap-6">
	<div class="flex flex-col gap-1">
		<h1 class="text-2xl font-semibold tracking-tight">
			<SidebarTrigger class="mr-4" />
			Payment History
		</h1>
		<p class="text-sm text-muted-foreground">Every payment we've recorded for your account.</p>
	</div>

	{#if payments.error}
		<Card.Root>
			<Card.Header>
				<Card.Title class="flex items-center gap-2 text-destructive">
					<TriangleAlertIcon class="size-5" aria-hidden="true" />
					Couldn't load your payments
				</Card.Title>
				<Card.Description>{payments.error.message ?? 'Something went wrong.'}</Card.Description>
			</Card.Header>
			<Card.Footer>
				<Button variant="outline" onclick={() => payments.refresh()}>Try again</Button>
			</Card.Footer>
		</Card.Root>
	{:else if !payments.current}
		<Skeleton class="h-96" aria-label="Loading payments" />
	{:else if payments.current.length === 0}
		<Card.Root>
			<Card.Content class="flex flex-col items-center gap-2 py-12 text-center">
				<p class="font-medium">No payments yet</p>
				<p class="text-sm text-muted-foreground">Payments against your invoices will show here.</p>
			</Card.Content>
		</Card.Root>
	{:else}
		<Card.Root>
			<Card.Content>
				<Table.Root>
					<Table.Header>
						<Table.Row>
							<Table.Head>Date</Table.Head>
							<Table.Head>Invoice</Table.Head>
							<Table.Head>Method</Table.Head>
							<Table.Head>Note</Table.Head>
							<Table.Head class="text-right">Amount</Table.Head>
							<Table.Head class="text-right">Receipt</Table.Head>
						</Table.Row>
					</Table.Header>
					<Table.Body>
						{#each payments.current as p (p.id)}
							<Table.Row>
								<Table.Cell>{formatDate(p.paidOn)}</Table.Cell>
								<Table.Cell class="font-medium">{p.invoice.number}</Table.Cell>
								<Table.Cell>
									<Badge variant="outline">{humanize(p.method)}</Badge>
								</Table.Cell>
								<Table.Cell class="max-w-48 truncate text-muted-foreground"
									>{p.note ?? '—'}</Table.Cell
								>
								<Table.Cell class="text-right">{formatCurrency(p.amount)}</Table.Cell>
								<Table.Cell class="text-right">
									<Button
										variant="ghost"
										size="icon"
										aria-label="Download payment receipt PDF"
										onclick={() =>
											downloadPaymentPdf({
												paymentId: p.id,
												invoiceNumber: p.invoice.number,
												customerName: data.customer.name,
												amount: p.amount,
												methodLabel: p.note ?? humanize(p.method),
												paidOn: p.paidOn,
												note: p.note
											})}
									>
										<DownloadIcon />
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
