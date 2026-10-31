<script lang="ts">
	import { resolve } from '$app/paths';
	import {
		getMyInvoiceQuery,
		payInvoiceCommand,
		type MockPaymentMethod
	} from '../../data.remote.ts';
	import * as Card from '#lib/components/ui/card/index.ts';
	import * as Table from '#lib/components/ui/table/index.ts';
	import { Badge } from '#lib/components/ui/badge/index.ts';
	import { Button } from '#lib/components/ui/button/index.ts';
	import { Skeleton } from '#lib/components/ui/skeleton/index.ts';
	import { SidebarTrigger } from '#lib/components/ui/sidebar/index.ts';
	import { toast } from 'svelte-sonner';
	import { formatCurrency, formatDate, humanize } from '#lib/index.ts';
	import { downloadInvoicePdf, downloadPaymentPdf } from '#lib/pdf.ts';
	import { BarSpinner } from '#lib/components/custom/index.ts';
	import type { PageProps } from './$types';
	import { onMount } from 'svelte';

	import AppleIcon from '@lucide/svelte/icons/apple';
	import ArrowLeftIcon from '@lucide/svelte/icons/arrow-left';
	import CircleCheckIcon from '@lucide/svelte/icons/circle-check';
	import CreditCardIcon from '@lucide/svelte/icons/credit-card';
	import DownloadIcon from '@lucide/svelte/icons/download';
	import LockIcon from '@lucide/svelte/icons/lock';
	import ShieldCheckIcon from '@lucide/svelte/icons/shield-check';
	import SmartphoneIcon from '@lucide/svelte/icons/smartphone';
	import TriangleAlertIcon from '@lucide/svelte/icons/triangle-alert';
	import WalletIcon from '@lucide/svelte/icons/wallet';

	const { params, data }: PageProps = $props();
	const invoice = $derived(getMyInvoiceQuery(params.id));

	type PaidResult = Awaited<ReturnType<typeof payInvoiceCommand>>;
	let paidResult = $state<PaidResult | null>(null);

	let isMac = $state(false);
	onMount(() => {
		isMac = /mac/i.test(navigator.platform ?? '') || /Macintosh/.test(navigator.userAgent);
	});

	const METHODS: {
		key: MockPaymentMethod;
		label: string;
		description: string;
		icon: typeof SmartphoneIcon;
		macOnly?: boolean;
	}[] = [
		{
			key: 'upi',
			label: 'UPI',
			description: 'Instant payment from your bank account',
			icon: SmartphoneIcon
		},
		{
			key: 'card',
			label: 'Credit Card',
			description: 'Visa, Mastercard, RuPay and more',
			icon: CreditCardIcon
		},
		{
			key: 'gpay',
			label: 'Google Pay',
			description: 'One-tap checkout with Google Pay',
			icon: WalletIcon
		},
		{
			key: 'apple_pay',
			label: 'Apple Pay',
			description: 'Touch ID checkout on Mac & iOS',
			icon: AppleIcon,
			macOnly: true
		}
	];

	const visibleMethods = $derived(METHODS.filter((m) => !m.macOnly || isMac));
	let selected = $state<MockPaymentMethod>('upi');
	let processing = $state(false);

	const balance = $derived(
		invoice.current
			? Math.max(
					0,
					Math.round((Number(invoice.current.total) - Number(invoice.current.amountPaid)) * 100) /
						100
				)
			: 0
	);
	const payable = $derived(invoice.current?.status === 'confirmed' && balance > 0);

	async function pay() {
		processing = true;
		try {
			// Mock gateway round-trip — no real money moves.
			await new Promise((r) => setTimeout(r, 1400));
			paidResult = await payInvoiceCommand({ invoiceId: params.id, method: selected });
			toast.success('Payment successful.');
		} catch (e) {
			toast.error(e instanceof Error ? e.message : 'Payment failed. Please try again.');
		} finally {
			processing = false;
		}
	}

	function invoicePdf() {
		const inv = invoice.current;
		if (!inv) return;
		downloadInvoicePdf({
			number: inv.number,
			customerName: data.customer.name,
			subscriptionNumber: inv.subscription.number,
			periodStart: inv.periodStart,
			periodEnd: inv.periodEnd,
			issueDate: inv.issueDate,
			dueDate: inv.dueDate,
			status: inv.status,
			lines: inv.lines,
			subtotal: inv.subtotal,
			discountTotal: inv.discountTotal,
			taxTotal: inv.taxTotal,
			total: inv.total,
			amountPaid: inv.amountPaid
		});
	}

	function receiptPdf() {
		const inv = invoice.current;
		if (!inv) return;
		if (paidResult) {
			downloadPaymentPdf({
				paymentId: paidResult.payment.id,
				invoiceNumber: inv.number,
				customerName: data.customer.name,
				amount: String(paidResult.amount),
				methodLabel: paidResult.methodLabel,
				paidOn: paidResult.payment.paidOn,
				note: paidResult.payment.note
			});
			return;
		}
		const last = inv.payments[0];
		if (last) {
			downloadPaymentPdf({
				paymentId: last.id,
				invoiceNumber: inv.number,
				customerName: data.customer.name,
				amount: last.amount,
				methodLabel: last.note ?? humanize(last.method),
				paidOn: last.paidOn,
				note: last.note
			});
		}
	}
</script>

<svelte:head>
	<title>Pay invoice — Brightloop</title>
</svelte:head>

<div class="flex flex-col gap-6">
	<div class="flex flex-col gap-1">
		<h1 class="text-2xl font-semibold tracking-tight">
			<SidebarTrigger class="mr-4" />
			Pay invoice
		</h1>
		<p class="text-sm text-muted-foreground">
			Secure checkout powered by the Brightloop payment portal.
		</p>
	</div>

	{#if invoice.error}
		<Card.Root>
			<Card.Header>
				<Card.Title class="flex items-center gap-2 text-destructive">
					<TriangleAlertIcon class="size-5" aria-hidden="true" />
					Couldn't load this invoice
				</Card.Title>
				<Card.Description>{invoice.error.message ?? 'Something went wrong.'}</Card.Description>
			</Card.Header>
			<Card.Footer>
				<Button variant="outline" href={resolve('/(app)/portal/invoices')}>
					<ArrowLeftIcon data-icon="inline-start" />
					Back to invoices
				</Button>
			</Card.Footer>
		</Card.Root>
	{:else if !invoice.current}
		<Skeleton class="h-96" aria-label="Loading invoice" />
	{:else}
		{@const inv = invoice.current}
		{#if paidResult || inv.status === 'paid'}
			<Card.Root class="mx-auto w-full max-w-xl">
				<Card.Content class="flex flex-col items-center gap-3 py-10 text-center">
					<CircleCheckIcon class="size-14 text-green-600" aria-hidden="true" />
					<h2 class="text-xl font-semibold">Payment successful</h2>
					<p class="text-sm text-muted-foreground">
						{formatCurrency(paidResult?.amount ?? inv.amountPaid)} paid towards invoice {inv.number}
						via {paidResult?.methodLabel ?? 'your payment method'}. A receipt is available below.
					</p>
					<Badge variant="default">Invoice paid</Badge>
					<div class="mt-3 flex flex-wrap justify-center gap-2">
						<Button variant="outline" onclick={invoicePdf}>
							<DownloadIcon data-icon="inline-start" />
							Invoice PDF
						</Button>
						<Button variant="outline" onclick={receiptPdf}>
							<DownloadIcon data-icon="inline-start" />
							Payment receipt PDF
						</Button>
						<Button href={resolve('/(app)/portal/invoices')}>Back to my invoices</Button>
					</div>
				</Card.Content>
			</Card.Root>
		{:else if !payable}
			<Card.Root class="mx-auto w-full max-w-xl">
				<Card.Content class="flex flex-col items-center gap-3 py-10 text-center">
					<TriangleAlertIcon class="size-12 text-muted-foreground" aria-hidden="true" />
					<h2 class="text-xl font-semibold">Nothing to pay right now</h2>
					<p class="text-sm text-muted-foreground">
						{#if inv.status === 'draft'}
							This invoice hasn't been confirmed by our team yet. You'll be able to pay as soon as
							it's confirmed.
						{:else if inv.status === 'cancelled'}
							This invoice was cancelled — there's nothing to pay.
						{:else}
							There's no outstanding balance on this invoice.
						{/if}
					</p>
					<Button variant="outline" href={resolve('/(app)/portal/invoices')}>
						<ArrowLeftIcon data-icon="inline-start" />
						Back to invoices
					</Button>
				</Card.Content>
			</Card.Root>
		{:else}
			<div class="grid gap-4 lg:grid-cols-5">
				<Card.Root class="lg:col-span-3">
					<Card.Header>
						<Card.Title>Invoice {inv.number}</Card.Title>
						<Card.Description>
							{inv.subscription.number} · {formatDate(inv.periodStart)} – {formatDate(
								inv.periodEnd
							)} · Due by {formatDate(inv.dueDate)}
						</Card.Description>
					</Card.Header>
					<Card.Content class="flex flex-col gap-4">
						<Table.Root>
							<Table.Header>
								<Table.Row>
									<Table.Head>Description</Table.Head>
									<Table.Head class="text-right">Qty</Table.Head>
									<Table.Head class="text-right">Amount</Table.Head>
								</Table.Row>
							</Table.Header>
							<Table.Body>
								{#each inv.lines as l (l.id)}
									<Table.Row>
										<Table.Cell>
											<div class="flex flex-col">
												<span>{l.description}</span>
												{#if Number(l.discountAmount) > 0 || Number(l.taxAmount) > 0}
													<span class="text-xs text-muted-foreground">
														{#if Number(l.discountAmount) > 0}Discount −{formatCurrency(
																l.discountAmount
															)} ·
														{/if}
														Tax {Number(l.taxRatePercent)}%: {formatCurrency(l.taxAmount)}
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

						<div class="flex flex-col gap-1 text-sm">
							<div class="flex justify-between">
								<span class="text-muted-foreground">Subtotal</span><span
									>{formatCurrency(inv.subtotal)}</span
								>
							</div>
							<div class="flex justify-between">
								<span class="text-muted-foreground">Discounts</span><span
									>−{formatCurrency(inv.discountTotal)}</span
								>
							</div>
							<div class="flex justify-between">
								<span class="text-muted-foreground">Tax</span><span
									>{formatCurrency(inv.taxTotal)}</span
								>
							</div>
							<div class="flex justify-between border-t pt-2 font-semibold">
								<span>Total</span><span>{formatCurrency(inv.total)}</span>
							</div>
							{#if Number(inv.amountPaid) > 0}
								<div class="flex justify-between">
									<span class="text-muted-foreground">Already paid</span><span
										>{formatCurrency(inv.amountPaid)}</span
									>
								</div>
							{/if}
							<div class="flex justify-between font-medium">
								<span>Payable now</span><span>{formatCurrency(balance)}</span>
							</div>
						</div>
					</Card.Content>
				</Card.Root>

				<Card.Root class="lg:col-span-2">
					<Card.Header>
						<Card.Title class="flex items-center gap-2">
							<LockIcon class="size-5 text-muted-foreground" aria-hidden="true" />
							Payment method
						</Card.Title>
						<Card.Description class="flex items-center gap-2">
							<Badge variant="secondary">Demo checkout</Badge>
							No real money moves — this is a mock gateway.
						</Card.Description>
					</Card.Header>
					<Card.Content class="flex flex-col gap-3">
						<div class="flex flex-col gap-2" role="radiogroup" aria-label="Payment method">
							{#each visibleMethods as m (m.key)}
								<button
									type="button"
									role="radio"
									aria-checked={selected === m.key}
									class="flex items-center gap-3 rounded-lg border p-3 text-left transition-colors {selected ===
									m.key
										? 'border-primary bg-primary/5'
										: 'hover:bg-muted'}"
									onclick={() => (selected = m.key)}
								>
									<m.icon class="size-5 shrink-0 text-primary" aria-hidden="true" />
									<span class="flex flex-1 flex-col">
										<span class="text-sm font-medium">{m.label}</span>
										<span class="text-xs text-muted-foreground">{m.description}</span>
									</span>
									<span
										class="size-4 shrink-0 rounded-full border {selected === m.key
											? 'border-5 border-primary'
											: 'border-muted-foreground/40'}"
										aria-hidden="true"
									></span>
								</button>
							{/each}
						</div>

						<Button class="w-full" size="lg" disabled={processing} onclick={pay}>
							{#if processing}
								<BarSpinner role="status" aria-label="Processing payment" />
								Processing…
							{:else}
								<LockIcon data-icon="inline-start" />
								Pay {formatCurrency(balance)}
							{/if}
						</Button>

						<p
							class="flex items-center justify-center gap-1.5 text-center text-xs text-muted-foreground"
						>
							<ShieldCheckIcon class="size-3.5" aria-hidden="true" />
							256-bit encrypted · PCI-DSS compliant (mock)
						</p>

						<Button variant="ghost" class="w-full" href={resolve('/(app)/portal/invoices')}>
							<ArrowLeftIcon data-icon="inline-start" />
							Pay later
						</Button>
					</Card.Content>
				</Card.Root>
			</div>
		{/if}
	{/if}
</div>
