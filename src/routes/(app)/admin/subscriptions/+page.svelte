<script lang="ts">
	import {
		addSubscriptionLineCommand,
		createSubscriptionCommand,
		deleteSubscriptionCommand,
		generateInvoiceCommand,
		getCustomers,
		getPlans,
		getProducts,
		getQuotationTemplates,
		getSubscription,
		getSubscriptions,
		getTaxes,
		removeSubscriptionLineCommand,
		transitionSubscriptionCommand,
		updateSubscriptionLineCommand
	} from '../data.remote.ts';
	import * as Card from '#lib/components/ui/card/index.ts';
	import * as Table from '#lib/components/ui/table/index.ts';
	import * as DropdownMenu from '#lib/components/ui/dropdown-menu/index.ts';
	import * as Sheet from '#lib/components/ui/sheet/index.ts';
	import AppSheetContent from '#lib/components/custom/app-sheet-content.svelte';
	import * as Field from '#lib/components/ui/field/index.ts';
	import * as Select from '#lib/components/ui/select/index.ts';
	import { Badge, type BadgeVariant } from '#lib/components/ui/badge/index.ts';
	import { Button } from '#lib/components/ui/button/index.ts';
	import { Input } from '#lib/components/ui/input/index.ts';
	import { Skeleton } from '#lib/components/ui/skeleton/index.ts';
	import { SidebarTrigger } from '#lib/components/ui/sidebar/index.ts';
	import { toast } from 'svelte-sonner';
	import { formatCurrency, formatDate, humanize } from '#lib/index.ts';
	import { BarSpinner } from '#lib/components/custom/index.ts';
	import DatePicker from '#lib/components/custom/date-picker.svelte';

	import EllipsisIcon from '@lucide/svelte/icons/ellipsis';
	import EyeIcon from '@lucide/svelte/icons/eye';
	import PlusIcon from '@lucide/svelte/icons/plus';
	import ReceiptTextIcon from '@lucide/svelte/icons/receipt-text';
	import Trash2Icon from '@lucide/svelte/icons/trash-2';
	import TriangleAlertIcon from '@lucide/svelte/icons/triangle-alert';

	type SubRow = NonNullable<typeof subscriptions.current>[number];
	type Action = 'send-quotation' | 'confirm' | 'activate' | 'pause' | 'resume' | 'close' | 'renew';

	const subscriptions = getSubscriptions();
	const customers = getCustomers();
	const plans = getPlans();
	const products = getProducts();
	const taxes = getTaxes();
	const templates = getQuotationTemplates();

	const STATUS_BADGE: Record<string, BadgeVariant> = {
		draft: 'outline',
		quotation: 'outline',
		confirmed: 'secondary',
		active: 'default',
		paused: 'secondary',
		closed: 'destructive'
	};

	let statusFilter = $state('all');
	const filtered = $derived(
		(subscriptions.current ?? []).filter((s) => statusFilter === 'all' || s.status === statusFilter)
	);

	const lineTotal = (s: SubRow) => s.lines.reduce((sum, l) => sum + Number(l.amount), 0);

	/* ── create ── */
	interface LineForm {
		productId: string;
		variantId: string;
		quantity: number | undefined;
		taxId: string;
	}

	let createOpen = $state(false);
	let form = $state({
		customerId: '',
		planId: '',
		templateId: '',
		startDate: new Date().toISOString().slice(0, 10),
		paymentTermsDays: 15 as number | undefined
	});
	let lines = $state<LineForm[]>([{ productId: '', variantId: '', quantity: 1, taxId: '' }]);
	let creating = $state(false);

	const productById = (id: string) => products.current?.find((p) => p.id === id);

	function unitPrice(line: LineForm): number {
		const p = productById(line.productId);
		if (!p) return 0;
		const v = p.variants.find((x) => x.id === line.variantId);
		return Number(p.salesPrice) + (v ? Number(v.extraPrice) : 0);
	}

	const estimatedTotal = $derived(
		lines.reduce((sum, l) => sum + unitPrice(l) * (l.quantity ?? 0), 0)
	);

	function applyTemplate(templateId: string) {
		form.templateId = templateId;
		const t = templates.current?.find((x) => x.id === templateId);
		if (!t) return;
		form.planId = t.planId;
		lines = t.lines.map((l) => ({
			productId: l.productId,
			variantId: l.variantId ?? '',
			quantity: l.quantity,
			taxId: ''
		}));
	}

	async function create() {
		const clean = lines.filter((l) => l.productId);
		if (!form.customerId || !form.planId || !form.startDate || form.paymentTermsDays == null) {
			toast.error('Customer, plan, start date and payment terms are required.');
			return;
		}
		if (clean.length === 0 || clean.some((l) => !l.quantity || l.quantity < 1)) {
			toast.error('Add at least one product line with a quantity.');
			return;
		}
		creating = true;
		try {
			await createSubscriptionCommand({
				customerId: form.customerId,
				planId: form.planId,
				templateId: form.templateId || null,
				startDate: form.startDate,
				paymentTermsDays: form.paymentTermsDays,
				lines: clean.map((l) => ({
					productId: l.productId,
					variantId: l.variantId || null,
					quantity: l.quantity as number,
					taxId: l.taxId || null
				}))
			});
			toast.success('Subscription created as draft.');
			createOpen = false;
		} catch (e) {
			toast.error(e instanceof Error ? e.message : 'Could not create the subscription.');
		} finally {
			creating = false;
		}
	}

	/* ── detail / actions ── */
	let selectedId = $state<string | null>(null);
	const detail = $derived(selectedId ? getSubscription(selectedId) : null);
	let acting = $state<string | null>(null);

	let addonForm = $state({ productId: '', variantId: '', quantity: 1, taxId: '' });
	let addingLine = $state(false);

	async function addLine(subscriptionId: string) {
		if (!addonForm.productId || !addonForm.quantity) {
			toast.error('Choose a product and quantity.');
			return;
		}
		addingLine = true;
		try {
			await addSubscriptionLineCommand({
				subscriptionId,
				data: {
					productId: addonForm.productId,
					variantId: addonForm.variantId || null,
					quantity: addonForm.quantity,
					taxId: addonForm.taxId || null
				}
			});
			toast.success('Line added — it will appear on the next invoice.');
			addonForm = { productId: '', variantId: '', quantity: 1, taxId: '' };
		} catch (e) {
			toast.error(e instanceof Error ? e.message : 'Could not add the line.');
		} finally {
			addingLine = false;
		}
	}

	async function changeQty(
		subscriptionId: string,
		line: { id: string; quantity: number },
		event: Event
	) {
		const quantity = Number((event.currentTarget as HTMLInputElement).value);
		if (!Number.isInteger(quantity) || quantity < 1 || quantity === line.quantity) return;
		try {
			await updateSubscriptionLineCommand({ lineId: line.id, subscriptionId, quantity });
			toast.success('Quantity updated.');
		} catch (e) {
			toast.error(e instanceof Error ? e.message : 'Could not update the quantity.');
		}
	}

	async function removeLine(subscriptionId: string, lineId: string) {
		try {
			await removeSubscriptionLineCommand({ lineId, subscriptionId });
			toast.success('Line removed.');
		} catch (e) {
			toast.error(e instanceof Error ? e.message : 'Could not remove the line.');
		}
	}

	async function transition(id: string, action: Action) {
		acting = action;
		try {
			await transitionSubscriptionCommand({ id, action });
			toast.success(`Subscription ${action.replace('-', ' ')} done.`);
		} catch (e) {
			toast.error(e instanceof Error ? e.message : 'Action failed.');
		} finally {
			acting = null;
		}
	}

	async function generateInvoice(id: string) {
		acting = 'generate';
		try {
			const result = await generateInvoiceCommand(id);
			toast.success(`Invoice ${result.number} generated.`);
		} catch (e) {
			toast.error(e instanceof Error ? e.message : 'Could not generate the invoice.');
		} finally {
			acting = null;
		}
	}

	async function removeSub(id: string) {
		acting = 'delete';
		try {
			await deleteSubscriptionCommand(id);
			toast.success('Subscription deleted.');
			selectedId = null;
		} catch (e) {
			toast.error(e instanceof Error ? e.message : 'Could not delete the subscription.');
		} finally {
			acting = null;
		}
	}
</script>

<svelte:head>
	<title>Subscriptions — Brightloop</title>
</svelte:head>

<div class="flex flex-col gap-6">
	<div class="flex flex-wrap items-start justify-between gap-4">
		<div class="flex flex-col gap-1">
			<h1 class="text-2xl font-semibold tracking-tight">
				<SidebarTrigger class="mr-4" />
				Subscriptions
			</h1>
			<p class="text-sm text-muted-foreground">
				Draft → Quotation → Confirmed → Active → Closed. Everyone can see where each one stands.
			</p>
		</div>
		<div class="flex items-center gap-2">
			<Select.Root type="single" value={statusFilter} onValueChange={(v) => (statusFilter = v)}>
				<Select.Trigger class="w-44">
					{statusFilter === 'all' ? 'All statuses' : humanize(statusFilter)}
				</Select.Trigger>
				<Select.Content>
					<Select.Group>
						<Select.Item value="all" label="All statuses" />
						{#each ['draft', 'quotation', 'confirmed', 'active', 'paused', 'closed'] as s (s)}
							<Select.Item value={s} label={humanize(s)} />
						{/each}
					</Select.Group>
				</Select.Content>
			</Select.Root>
			<Button onclick={() => (createOpen = true)}>
				<PlusIcon data-icon="inline-start" />
				New subscription
			</Button>
		</div>
	</div>

	{#if subscriptions.error}
		<Card.Root>
			<Card.Header>
				<Card.Title class="flex items-center gap-2 text-destructive">
					<TriangleAlertIcon class="size-5" aria-hidden="true" />
					Couldn't load subscriptions
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
	{:else if filtered.length === 0}
		<Card.Root>
			<Card.Content class="flex flex-col items-center gap-2 py-12 text-center">
				<p class="font-medium">No subscriptions found</p>
				<p class="text-sm text-muted-foreground">
					Create one from a quotation template or from scratch.
				</p>
				<Button class="mt-2" onclick={() => (createOpen = true)}>
					<PlusIcon data-icon="inline-start" />
					New subscription
				</Button>
			</Card.Content>
		</Card.Root>
	{:else}
		<Card.Root>
			<Card.Content>
				<Table.Root>
					<Table.Header>
						<Table.Row>
							<Table.Head>Number</Table.Head>
							<Table.Head>Customer</Table.Head>
							<Table.Head>Plan</Table.Head>
							<Table.Head>Status</Table.Head>
							<Table.Head class="text-right">Per period</Table.Head>
							<Table.Head>Start</Table.Head>
							<Table.Head>Next billing</Table.Head>
							<Table.Head class="text-right">Actions</Table.Head>
						</Table.Row>
					</Table.Header>
					<Table.Body>
						{#each filtered as s (s.id)}
							<Table.Row>
								<Table.Cell class="font-medium">{s.number}</Table.Cell>
								<Table.Cell>{s.customer.name}</Table.Cell>
								<Table.Cell>{s.plan.name}</Table.Cell>
								<Table.Cell>
									<Badge variant={STATUS_BADGE[s.status] ?? 'outline'}>{humanize(s.status)}</Badge>
								</Table.Cell>
								<Table.Cell class="text-right">{formatCurrency(lineTotal(s))}</Table.Cell>
								<Table.Cell>{formatDate(s.startDate)}</Table.Cell>
								<Table.Cell>{formatDate(s.nextBillingDate)}</Table.Cell>
								<Table.Cell class="text-right">
									<DropdownMenu.Root>
										<DropdownMenu.Trigger>
											{#snippet child({ props })}
												<Button
													{...props}
													variant="ghost"
													size="icon"
													aria-label="Subscription actions"
												>
													<EllipsisIcon />
												</Button>
											{/snippet}
										</DropdownMenu.Trigger>
										<DropdownMenu.Content align="end">
											<DropdownMenu.Group>
												<DropdownMenu.Item onclick={() => (selectedId = s.id)}>
													<EyeIcon />
													View
												</DropdownMenu.Item>
												{#if s.status === 'active'}
													<DropdownMenu.Item onclick={() => generateInvoice(s.id)}>
														<ReceiptTextIcon />
														Generate invoice
													</DropdownMenu.Item>
												{/if}
											</DropdownMenu.Group>
										</DropdownMenu.Content>
									</DropdownMenu.Root>
								</Table.Cell>
							</Table.Row>
						{/each}
					</Table.Body>
				</Table.Root>
			</Card.Content>
		</Card.Root>
	{/if}
</div>

<!-- Create sheet -->
<Sheet.Root bind:open={createOpen}>
	<AppSheetContent>
		<Sheet.Header>
			<Sheet.Title>New subscription</Sheet.Title>
			<Sheet.Description>
				Start from a quotation template or build the lines yourself. It begins as a Draft.
			</Sheet.Description>
		</Sheet.Header>
		<form
			class="flex flex-col gap-5 px-4 pb-6"
			onsubmit={(e) => {
				e.preventDefault();
				create();
			}}
		>
			<Field.FieldGroup>
				<Field.Field>
					<Field.FieldLabel for="sub-template">Quotation template (optional)</Field.FieldLabel>
					<Select.Root type="single" value={form.templateId} onValueChange={applyTemplate}>
						<Select.Trigger id="sub-template" class="w-full">
							{templates.current?.find((t) => t.id === form.templateId)?.name ?? 'No template'}
						</Select.Trigger>
						<Select.Content>
							<Select.Group>
								{#each templates.current ?? [] as t (t.id)}
									<Select.Item value={t.id} label={t.name} />
								{/each}
							</Select.Group>
						</Select.Content>
					</Select.Root>
				</Field.Field>
				<div class="grid grid-cols-2 gap-4">
					<Field.Field>
						<Field.FieldLabel for="sub-customer">Customer</Field.FieldLabel>
						<Select.Root
							type="single"
							value={form.customerId}
							onValueChange={(v) => (form.customerId = v)}
						>
							<Select.Trigger id="sub-customer" class="w-full">
								{customers.current?.find((c) => c.customer.id === form.customerId)?.customer.name ??
									'Select customer'}
							</Select.Trigger>
							<Select.Content>
								<Select.Group>
									{#each customers.current ?? [] as c (c.customer.id)}
										<Select.Item value={c.customer.id} label={c.customer.name} />
									{/each}
								</Select.Group>
							</Select.Content>
						</Select.Root>
					</Field.Field>
					<Field.Field>
						<Field.FieldLabel for="sub-plan">Plan</Field.FieldLabel>
						<Select.Root type="single" value={form.planId} onValueChange={(v) => (form.planId = v)}>
							<Select.Trigger id="sub-plan" class="w-full">
								{plans.current?.find((p) => p.id === form.planId)?.name ?? 'Select plan'}
							</Select.Trigger>
							<Select.Content>
								<Select.Group>
									{#each (plans.current ?? []).filter((p) => p.active) as p (p.id)}
										<Select.Item value={p.id} label={`${p.name} (${humanize(p.billingPeriod)})`} />
									{/each}
								</Select.Group>
							</Select.Content>
						</Select.Root>
					</Field.Field>
				</div>
				<div class="grid grid-cols-2 gap-4">
					<Field.Field>
						<Field.FieldLabel for="sub-start">Start date</Field.FieldLabel>
						<DatePicker id="sub-start" bind:value={form.startDate} />
					</Field.Field>
					<Field.Field>
						<Field.FieldLabel for="sub-terms">Payment terms (days)</Field.FieldLabel>
						<Input
							id="sub-terms"
							type="number"
							min="0"
							step="1"
							bind:value={form.paymentTermsDays}
							required
						/>
					</Field.Field>
				</div>
			</Field.FieldGroup>

			<div class="flex flex-col gap-3">
				<div class="flex items-center justify-between">
					<h3 class="font-semibold">Product lines</h3>
					<Button
						type="button"
						variant="outline"
						size="sm"
						onclick={() => lines.push({ productId: '', variantId: '', quantity: 1, taxId: '' })}
					>
						<PlusIcon data-icon="inline-start" />
						Add line
					</Button>
				</div>
				{#each lines as line, i (i)}
					<div class="flex flex-col gap-3 rounded-lg border p-3">
						<div class="grid grid-cols-2 gap-3">
							<Field.Field>
								<Field.FieldLabel for={`sline-product-${i}`}>Product</Field.FieldLabel>
								<Select.Root
									type="single"
									value={line.productId}
									onValueChange={(v) => {
										line.productId = v;
										line.variantId = '';
									}}
								>
									<Select.Trigger id={`sline-product-${i}`} class="w-full">
										{productById(line.productId)?.name ?? 'Select product'}
									</Select.Trigger>
									<Select.Content>
										<Select.Group>
											{#each products.current ?? [] as p (p.id)}
												<Select.Item value={p.id} label={p.name} />
											{/each}
										</Select.Group>
									</Select.Content>
								</Select.Root>
							</Field.Field>
							<Field.Field>
								<Field.FieldLabel for={`sline-variant-${i}`}>Variant</Field.FieldLabel>
								<Select.Root
									type="single"
									value={line.variantId}
									onValueChange={(v) => (line.variantId = v)}
								>
									<Select.Trigger id={`sline-variant-${i}`} class="w-full">
										{productById(line.productId)?.variants.find((v) => v.id === line.variantId)
											? `${productById(line.productId)?.variants.find((v) => v.id === line.variantId)?.attribute}: ${productById(line.productId)?.variants.find((v) => v.id === line.variantId)?.value}`
											: 'No variant'}
									</Select.Trigger>
									<Select.Content>
										<Select.Group>
											{#each productById(line.productId)?.variants ?? [] as v (v.id)}
												<Select.Item
													value={v.id}
													label={`${v.attribute}: ${v.value} (+${formatCurrency(v.extraPrice)})`}
												/>
											{/each}
										</Select.Group>
									</Select.Content>
								</Select.Root>
							</Field.Field>
						</div>
						<div class="flex items-end gap-3">
							<Field.Field class="max-w-28">
								<Field.FieldLabel for={`sline-qty-${i}`}>Qty</Field.FieldLabel>
								<Input
									id={`sline-qty-${i}`}
									type="number"
									min="1"
									step="1"
									bind:value={line.quantity}
									required
								/>
							</Field.Field>
							<Field.Field class="flex-1">
								<Field.FieldLabel for={`sline-tax-${i}`}>Tax</Field.FieldLabel>
								<Select.Root
									type="single"
									value={line.taxId}
									onValueChange={(v) => (line.taxId = v)}
								>
									<Select.Trigger id={`sline-tax-${i}`} class="w-full">
										{taxes.current?.find((t) => t.id === line.taxId)?.name ?? 'No tax'}
									</Select.Trigger>
									<Select.Content>
										<Select.Group>
											{#each taxes.current ?? [] as t (t.id)}
												<Select.Item value={t.id} label={`${t.name} (${Number(t.ratePercent)}%)`} />
											{/each}
										</Select.Group>
									</Select.Content>
								</Select.Root>
							</Field.Field>
							<span class="pb-2 text-sm text-muted-foreground">
								{formatCurrency(unitPrice(line) * (line.quantity ?? 0))}
							</span>
							{#if lines.length > 1}
								<Button
									type="button"
									variant="destructive"
									size="icon"
									aria-label="Remove line"
									onclick={() => lines.splice(i, 1)}
								>
									<Trash2Icon />
								</Button>
							{/if}
						</div>
					</div>
				{/each}
				<p class="text-right text-sm font-medium">
					Estimated per period: {formatCurrency(estimatedTotal)}
				</p>
			</div>

			<Sheet.Footer class="px-0">
				<Button type="submit" disabled={creating}>
					{#if creating}<BarSpinner role="status" aria-label="Creating" />{/if}
					Create subscription
				</Button>
				<Sheet.Close>
					{#snippet child({ props })}
						<Button {...props} variant="outline" type="button">Cancel</Button>
					{/snippet}
				</Sheet.Close>
			</Sheet.Footer>
		</form>
	</AppSheetContent>
</Sheet.Root>

<!-- Detail sheet -->
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
					{s.customer.name} · {s.plan.name} ({humanize(s.plan.billingPeriod)})
				</Sheet.Description>
			</Sheet.Header>

			<div class="flex flex-col gap-5 px-4 pb-6">
				<div class="flex flex-wrap items-center gap-2">
					<Badge variant={STATUS_BADGE[s.status] ?? 'outline'}>{humanize(s.status)}</Badge>
					<span class="text-xs text-muted-foreground">
						Starts {formatDate(s.startDate)} · Next billing {formatDate(s.nextBillingDate)}
						{#if s.expiryDate}· Expires {formatDate(s.expiryDate)}{/if}
					</span>
				</div>

				<div class="flex flex-col gap-3">
					<p class="text-sm font-medium">Lines & add-ons</p>
					<Table.Root>
						<Table.Header>
							<Table.Row>
								<Table.Head>Product</Table.Head>
								<Table.Head class="text-right">Qty</Table.Head>
								<Table.Head class="text-right">Unit</Table.Head>
								<Table.Head class="text-right">Amount</Table.Head>
								<Table.Head class="text-right">Remove</Table.Head>
							</Table.Row>
						</Table.Header>
						<Table.Body>
							{#each s.lines as l (l.id)}
								<Table.Row>
									<Table.Cell>
										<div class="flex flex-col">
											<span>{l.product.name}</span>
											<span class="text-xs text-muted-foreground">
												{#if l.variant}{l.variant.attribute}: {l.variant.value} ·
												{/if}
												{l.tax ? `Tax ${l.tax.name}` : 'No tax'}
											</span>
										</div>
									</Table.Cell>
									<Table.Cell class="text-right">
										{#if s.status !== 'closed'}
											<Input
												type="number"
												min="1"
												step="1"
												class="ml-auto w-20 text-right"
												value={l.quantity}
												aria-label="Line quantity"
												onchange={(e) => changeQty(s.id, l, e)}
											/>
										{:else}
											{l.quantity}
										{/if}
									</Table.Cell>
									<Table.Cell class="text-right">{formatCurrency(l.unitPrice)}</Table.Cell>
									<Table.Cell class="text-right">{formatCurrency(l.amount)}</Table.Cell>
									<Table.Cell class="text-right">
										{#if s.status !== 'closed'}
											<Button
												variant="destructive"
												size="icon"
												aria-label="Remove line"
												onclick={() => removeLine(s.id, l.id)}
											>
												<Trash2Icon />
											</Button>
										{/if}
									</Table.Cell>
								</Table.Row>
							{/each}
						</Table.Body>
					</Table.Root>

					{#if s.status !== 'closed'}
						<form
							class="flex flex-col gap-3 rounded-lg border p-3"
							onsubmit={(e) => {
								e.preventDefault();
								addLine(s.id);
							}}
						>
							<p class="text-sm font-medium">Add product / add-on</p>
							<div class="grid grid-cols-2 gap-3">
								<Field.Field>
									<Field.FieldLabel for="add-product">Product</Field.FieldLabel>
									<Select.Root
										type="single"
										value={addonForm.productId}
										onValueChange={(v) => {
											addonForm.productId = v;
											addonForm.variantId = '';
										}}
									>
										<Select.Trigger id="add-product" class="w-full">
											{productById(addonForm.productId)?.name ?? 'Select product'}
										</Select.Trigger>
										<Select.Content>
											<Select.Group>
												{#each products.current ?? [] as p (p.id)}
													<Select.Item value={p.id} label={p.name} />
												{/each}
											</Select.Group>
										</Select.Content>
									</Select.Root>
								</Field.Field>
								<Field.Field>
									<Field.FieldLabel for="add-variant">Variant</Field.FieldLabel>
									<Select.Root
										type="single"
										value={addonForm.variantId}
										onValueChange={(v) => (addonForm.variantId = v)}
									>
										<Select.Trigger id="add-variant" class="w-full">
											{productById(addonForm.productId)?.variants.find(
												(v) => v.id === addonForm.variantId
											)
												? `${productById(addonForm.productId)?.variants.find((v) => v.id === addonForm.variantId)?.attribute}: ${productById(addonForm.productId)?.variants.find((v) => v.id === addonForm.variantId)?.value}`
												: 'No variant'}
										</Select.Trigger>
										<Select.Content>
											<Select.Group>
												{#each productById(addonForm.productId)?.variants ?? [] as v (v.id)}
													<Select.Item
														value={v.id}
														label={`${v.attribute}: ${v.value} (+${formatCurrency(v.extraPrice)})`}
													/>
												{/each}
											</Select.Group>
										</Select.Content>
									</Select.Root>
								</Field.Field>
							</div>
							<div class="flex items-end gap-3">
								<Field.Field class="max-w-28">
									<Field.FieldLabel for="add-qty">Qty</Field.FieldLabel>
									<Input
										id="add-qty"
										type="number"
										min="1"
										step="1"
										bind:value={addonForm.quantity}
										required
									/>
								</Field.Field>
								<Field.Field class="flex-1">
									<Field.FieldLabel for="add-tax">Tax</Field.FieldLabel>
									<Select.Root
										type="single"
										value={addonForm.taxId}
										onValueChange={(v) => (addonForm.taxId = v)}
									>
										<Select.Trigger id="add-tax" class="w-full">
											{taxes.current?.find((t) => t.id === addonForm.taxId)?.name ?? 'No tax'}
										</Select.Trigger>
										<Select.Content>
											<Select.Group>
												{#each taxes.current ?? [] as t (t.id)}
													<Select.Item
														value={t.id}
														label={`${t.name} (${Number(t.ratePercent)}%)`}
													/>
												{/each}
											</Select.Group>
										</Select.Content>
									</Select.Root>
								</Field.Field>
								<Button type="submit" size="sm" disabled={addingLine}>
									{#if addingLine}<BarSpinner role="status" aria-label="Adding line" />{/if}
									Add line
								</Button>
							</div>
							<p class="text-xs text-muted-foreground">
								Changes apply from the next invoice — invoices already generated don't change.
							</p>
						</form>
					{/if}
				</div>

				<div class="flex flex-col gap-2">
					<p class="text-sm font-medium">Invoices ({s.invoices.length})</p>
					{#if s.invoices.length === 0}
						<p class="text-sm text-muted-foreground">No invoices generated yet.</p>
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
					<p class="text-sm font-medium">Lifecycle</p>
					<div class="flex flex-wrap gap-2">
						{#if s.status === 'draft'}
							<Button
								size="sm"
								disabled={acting !== null}
								onclick={() => transition(s.id, 'send-quotation')}
							>
								Send quotation
							</Button>
						{/if}
						{#if s.status === 'quotation'}
							<Button
								size="sm"
								disabled={acting !== null}
								onclick={() => transition(s.id, 'confirm')}
							>
								Confirm
							</Button>
						{/if}
						{#if s.status === 'confirmed'}
							<Button
								size="sm"
								disabled={acting !== null}
								onclick={() => transition(s.id, 'activate')}
							>
								Activate
							</Button>
						{/if}
						{#if s.status === 'active' && s.plan.pausable}
							<Button
								size="sm"
								variant="outline"
								disabled={acting !== null}
								onclick={() => transition(s.id, 'pause')}
							>
								Pause
							</Button>
						{/if}
						{#if s.status === 'paused'}
							<Button
								size="sm"
								disabled={acting !== null}
								onclick={() => transition(s.id, 'resume')}
							>
								Resume
							</Button>
						{/if}
						{#if s.status === 'active'}
							<Button
								size="sm"
								variant="outline"
								disabled={acting !== null}
								onclick={() => generateInvoice(s.id)}
							>
								<ReceiptTextIcon data-icon="inline-start" />
								Generate invoice
							</Button>
							{#if s.plan.renewable}
								<Button
									size="sm"
									variant="outline"
									disabled={acting !== null}
									onclick={() => transition(s.id, 'renew')}
								>
									Renew
								</Button>
							{/if}
						{/if}
						{#if s.status === 'closed' && s.plan.renewable}
							<Button
								size="sm"
								disabled={acting !== null}
								onclick={() => transition(s.id, 'renew')}
							>
								Renew
							</Button>
						{/if}
						{#if ['confirmed', 'active', 'paused'].includes(s.status)}
							<Button
								size="sm"
								variant="destructive"
								disabled={acting !== null}
								onclick={() => transition(s.id, 'close')}
							>
								Close
							</Button>
						{/if}
						{#if s.status === 'draft' || s.status === 'quotation'}
							<Button
								size="sm"
								variant="destructive"
								disabled={acting !== null}
								onclick={() => removeSub(s.id)}
							>
								Delete
							</Button>
						{/if}
						{#if acting}
							<BarSpinner role="status" aria-label="Working" />
						{/if}
					</div>
					<p class="text-xs text-muted-foreground">
						Plan rules: {s.plan.autoClose ? 'auto-closes at expiry' : 'no auto-close'} · {s.plan
							.closable
							? 'closable early'
							: 'cannot close early'} · {s.plan.pausable ? 'pausable' : 'not pausable'} · {s.plan
							.renewable
							? 'renewable'
							: 'not renewable'}.
					</p>
				</div>
			</div>
		{/if}
	</AppSheetContent>
</Sheet.Root>
