<script lang="ts">
	import {
		createDiscountCommand,
		deleteDiscountCommand,
		getDiscounts,
		getProducts,
		updateDiscountCommand
	} from '../data.remote.ts';
	import * as Card from '#lib/components/ui/card/index.ts';
	import * as Table from '#lib/components/ui/table/index.ts';
	import * as DropdownMenu from '#lib/components/ui/dropdown-menu/index.ts';
	import * as Sheet from '#lib/components/ui/sheet/index.ts';
	import * as AlertDialog from '#lib/components/ui/alert-dialog/index.ts';
	import * as Field from '#lib/components/ui/field/index.ts';
	import * as Select from '#lib/components/ui/select/index.ts';
	import { Badge, type BadgeVariant } from '#lib/components/ui/badge/index.ts';
	import { Button } from '#lib/components/ui/button/index.ts';
	import { Input } from '#lib/components/ui/input/index.ts';
	import { Switch } from '#lib/components/ui/switch/index.ts';
	import { Skeleton } from '#lib/components/ui/skeleton/index.ts';
	import { SidebarTrigger } from '#lib/components/ui/sidebar/index.ts';
	import { toast } from 'svelte-sonner';
	import { formatCurrency, formatDate } from '#lib/index.ts';
	import { BarSpinner } from '#lib/components/custom/index.ts';

	import EllipsisIcon from '@lucide/svelte/icons/ellipsis';
	import PencilIcon from '@lucide/svelte/icons/pencil';
	import PlusIcon from '@lucide/svelte/icons/plus';
	import Trash2Icon from '@lucide/svelte/icons/trash-2';
	import TriangleAlertIcon from '@lucide/svelte/icons/triangle-alert';

	type DiscountTypeName = 'fixed' | 'percentage';
	type DiscountScopeName = 'product' | 'subscription';
	type DiscountRow = NonNullable<typeof discounts.current>[number];

	const discounts = getDiscounts();
	const products = getProducts();

	const TYPE_OPTIONS: { value: DiscountTypeName; label: string }[] = [
		{ value: 'percentage', label: 'Percentage' },
		{ value: 'fixed', label: 'Fixed amount' }
	];

	const SCOPE_OPTIONS: { value: DiscountScopeName; label: string }[] = [
		{ value: 'subscription', label: 'Whole subscription' },
		{ value: 'product', label: 'Specific product' }
	];

	interface DiscountForm {
		name: string;
		type: DiscountTypeName;
		value: number | undefined;
		scope: DiscountScopeName;
		productId: string;
		minPurchase: number | undefined;
		minQuantity: number | undefined;
		startDate: string;
		endDate: string;
		usageLimit: number | undefined;
		active: boolean;
	}

	const today = () => new Date().toISOString().slice(0, 10);

	const blankForm = (): DiscountForm => ({
		name: '',
		type: 'percentage',
		value: undefined,
		scope: 'subscription',
		productId: '',
		minPurchase: undefined,
		minQuantity: undefined,
		startDate: today(),
		endDate: '',
		usageLimit: undefined,
		active: true
	});

	let sheetOpen = $state(false);
	let editing = $state<DiscountRow | null>(null);
	let form = $state<DiscountForm>(blankForm());
	let saving = $state(false);

	let deleteTarget = $state<DiscountRow | null>(null);
	let deleting = $state(false);

	function discountStatus(d: DiscountRow): { label: string; variant: BadgeVariant } {
		const now = today();
		if (!d.active) return { label: 'Inactive', variant: 'outline' };
		if (d.endDate && d.endDate < now) return { label: 'Expired', variant: 'destructive' };
		if (d.usageLimit != null && d.usedCount >= d.usageLimit)
			return { label: 'Used up', variant: 'destructive' };
		if (d.startDate > now) return { label: 'Scheduled', variant: 'secondary' };
		return { label: 'Active', variant: 'default' };
	}

	function openCreate() {
		editing = null;
		form = blankForm();
		sheetOpen = true;
	}

	function openEdit(d: DiscountRow) {
		editing = d;
		form = {
			name: d.name,
			type: d.type,
			value: Number(d.value),
			scope: d.scope,
			productId: d.productId ?? '',
			minPurchase: d.minPurchase != null ? Number(d.minPurchase) : undefined,
			minQuantity: d.minQuantity ?? undefined,
			startDate: d.startDate,
			endDate: d.endDate ?? '',
			usageLimit: d.usageLimit ?? undefined,
			active: d.active
		};
		sheetOpen = true;
	}

	function toInput(f: DiscountForm) {
		return {
			name: f.name.trim(),
			type: f.type,
			value: f.value as number,
			scope: f.scope,
			productId: f.scope === 'product' ? f.productId || null : null,
			minPurchase: f.minPurchase ?? null,
			minQuantity: f.minQuantity ?? null,
			startDate: f.startDate,
			endDate: f.endDate || null,
			usageLimit: f.usageLimit ?? null,
			active: f.active
		};
	}

	async function saveDiscount() {
		if (!form.name.trim() || form.value == null || !form.startDate) {
			toast.error('Name, value and a start date are required.');
			return;
		}
		if (form.type === 'percentage' && form.value > 100) {
			toast.error('A percentage discount cannot exceed 100.');
			return;
		}
		if (form.scope === 'product' && !form.productId) {
			toast.error('Choose a product for a product-scoped discount.');
			return;
		}
		if (form.endDate && form.endDate < form.startDate) {
			toast.error('The end date cannot be before the start date.');
			return;
		}
		saving = true;
		try {
			if (editing) {
				await updateDiscountCommand({ id: editing.id, data: toInput(form) });
				toast.success('Discount saved.');
			} else {
				await createDiscountCommand(toInput(form));
				toast.success('Discount created.');
			}
			sheetOpen = false;
		} catch (e) {
			toast.error(e instanceof Error ? e.message : 'Could not save the discount.');
		} finally {
			saving = false;
		}
	}

	async function toggleActive(d: DiscountRow) {
		try {
			await updateDiscountCommand({
				id: d.id,
				data: {
					name: d.name,
					type: d.type,
					value: Number(d.value),
					scope: d.scope,
					productId: d.productId,
					minPurchase: d.minPurchase != null ? Number(d.minPurchase) : null,
					minQuantity: d.minQuantity,
					startDate: d.startDate,
					endDate: d.endDate,
					usageLimit: d.usageLimit,
					active: !d.active
				}
			});
			toast.success(d.active ? 'Discount deactivated.' : 'Discount activated.');
		} catch (e) {
			toast.error(e instanceof Error ? e.message : 'Could not update the discount.');
		}
	}

	async function confirmDelete() {
		if (!deleteTarget) return;
		deleting = true;
		try {
			await deleteDiscountCommand(deleteTarget.id);
			toast.success('Discount deleted.');
			deleteTarget = null;
		} catch (e) {
			toast.error(e instanceof Error ? e.message : 'Could not delete the discount.');
		} finally {
			deleting = false;
		}
	}
</script>

<svelte:head>
	<title>Discounts — Brightloop</title>
</svelte:head>

<div class="flex flex-col gap-6">
	<div class="flex flex-wrap items-start justify-between gap-4">
		<div class="flex flex-col gap-1">
			<h1 class="text-2xl font-semibold tracking-tight">
				<SidebarTrigger class="mr-4" />
				Discounts
			</h1>
			<p class="text-sm text-muted-foreground">
				Rules that apply themselves to the next invoice — and stop when they expire or run out.
			</p>
		</div>
		<Button onclick={openCreate}>
			<PlusIcon data-icon="inline-start" />
			New discount
		</Button>
	</div>

	{#if discounts.error}
		<Card.Root>
			<Card.Header>
				<Card.Title class="flex items-center gap-2 text-destructive">
					<TriangleAlertIcon class="size-5" aria-hidden="true" />
					Couldn't load discounts
				</Card.Title>
				<Card.Description>{discounts.error.message ?? 'Something went wrong.'}</Card.Description>
			</Card.Header>
			<Card.Footer>
				<Button variant="outline" onclick={() => discounts.refresh()}>Try again</Button>
			</Card.Footer>
		</Card.Root>
	{:else if !discounts.current}
		<Skeleton class="h-96" aria-label="Loading discounts" />
	{:else if discounts.current.length === 0}
		<Card.Root>
			<Card.Content class="flex flex-col items-center gap-2 py-12 text-center">
				<p class="font-medium">No discounts yet</p>
				<p class="text-sm text-muted-foreground">Create your first discount rule.</p>
				<Button class="mt-2" onclick={openCreate}>
					<PlusIcon data-icon="inline-start" />
					New discount
				</Button>
			</Card.Content>
		</Card.Root>
	{:else}
		<Card.Root>
			<Card.Content>
				<Table.Root>
					<Table.Header>
						<Table.Row>
							<Table.Head>Discount</Table.Head>
							<Table.Head>Value</Table.Head>
							<Table.Head>Applies to</Table.Head>
							<Table.Head>Conditions</Table.Head>
							<Table.Head>Valid</Table.Head>
							<Table.Head>Usage</Table.Head>
							<Table.Head>Status</Table.Head>
							<Table.Head class="text-right">Actions</Table.Head>
						</Table.Row>
					</Table.Header>
					<Table.Body>
						{#each discounts.current as d (d.id)}
							{@const status = discountStatus(d)}
							<Table.Row>
								<Table.Cell class="font-medium">{d.name}</Table.Cell>
								<Table.Cell>
									<Badge variant="outline">
										{d.type === 'percentage'
											? `${Number(d.value)}% off`
											: `${formatCurrency(d.value)} off`}
									</Badge>
								</Table.Cell>
								<Table.Cell>
									{d.scope === 'product' ? (d.product?.name ?? 'Product') : 'Whole subscription'}
								</Table.Cell>
								<Table.Cell class="text-muted-foreground">
									{#if d.minPurchase != null}Min {formatCurrency(d.minPurchase)}{/if}
									{#if d.minPurchase != null && d.minQuantity != null}
										·
									{/if}
									{#if d.minQuantity != null}Min {d.minQuantity} seats{/if}
									{#if d.minPurchase == null && d.minQuantity == null}—{/if}
								</Table.Cell>
								<Table.Cell class="text-muted-foreground">
									{formatDate(d.startDate)} – {d.endDate ? formatDate(d.endDate) : '∞'}
								</Table.Cell>
								<Table.Cell>
									{d.usedCount}{d.usageLimit != null ? ` / ${d.usageLimit}` : ' / ∞'}
								</Table.Cell>
								<Table.Cell>
									<Badge variant={status.variant}>{status.label}</Badge>
								</Table.Cell>
								<Table.Cell class="text-right">
									<DropdownMenu.Root>
										<DropdownMenu.Trigger>
											{#snippet child({ props })}
												<Button
													{...props}
													variant="ghost"
													size="icon"
													aria-label="Discount actions"
												>
													<EllipsisIcon />
												</Button>
											{/snippet}
										</DropdownMenu.Trigger>
										<DropdownMenu.Content align="end">
											<DropdownMenu.Group>
												<DropdownMenu.Item onclick={() => openEdit(d)}>
													<PencilIcon />
													Edit
												</DropdownMenu.Item>
												<DropdownMenu.Item onclick={() => toggleActive(d)}>
													{d.active ? 'Deactivate' : 'Activate'}
												</DropdownMenu.Item>
												<DropdownMenu.Separator />
												<DropdownMenu.Item variant="destructive" onclick={() => (deleteTarget = d)}>
													<Trash2Icon />
													Delete
												</DropdownMenu.Item>
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

<Sheet.Root bind:open={sheetOpen}>
	<Sheet.Content class="overflow-y-auto sm:max-w-md">
		<Sheet.Header>
			<Sheet.Title>{editing ? 'Edit discount' : 'New discount'}</Sheet.Title>
			<Sheet.Description>
				Discounts apply automatically to the next invoice while they are valid.
			</Sheet.Description>
		</Sheet.Header>

		<form
			class="flex flex-col gap-5 px-4 pb-6"
			onsubmit={(e) => {
				e.preventDefault();
				saveDiscount();
			}}
		>
			<Field.FieldGroup>
				<Field.Field>
					<Field.FieldLabel for="discount-name">Name</Field.FieldLabel>
					<Input id="discount-name" bind:value={form.name} placeholder="Volume 10%" required />
				</Field.Field>

				<div class="grid grid-cols-2 gap-4">
					<Field.Field>
						<Field.FieldLabel for="discount-type">Type</Field.FieldLabel>
						<Select.Root
							type="single"
							value={form.type}
							onValueChange={(v) => (form.type = v as DiscountTypeName)}
						>
							<Select.Trigger id="discount-type" class="w-full">
								{TYPE_OPTIONS.find((o) => o.value === form.type)?.label ?? 'Select type'}
							</Select.Trigger>
							<Select.Content>
								<Select.Group>
									{#each TYPE_OPTIONS as option (option.value)}
										<Select.Item value={option.value} label={option.label} />
									{/each}
								</Select.Group>
							</Select.Content>
						</Select.Root>
					</Field.Field>
					<Field.Field>
						<Field.FieldLabel for="discount-value">
							Value {form.type === 'percentage' ? '(%)' : '(₹)'}
						</Field.FieldLabel>
						<Input
							id="discount-value"
							type="number"
							min="0"
							step="0.01"
							bind:value={form.value}
							required
						/>
					</Field.Field>
				</div>

				<Field.Field>
					<Field.FieldLabel for="discount-scope">Applies to</Field.FieldLabel>
					<Select.Root
						type="single"
						value={form.scope}
						onValueChange={(v) => (form.scope = v as DiscountScopeName)}
					>
						<Select.Trigger id="discount-scope" class="w-full">
							{SCOPE_OPTIONS.find((o) => o.value === form.scope)?.label ?? 'Select scope'}
						</Select.Trigger>
						<Select.Content>
							<Select.Group>
								{#each SCOPE_OPTIONS as option (option.value)}
									<Select.Item value={option.value} label={option.label} />
								{/each}
							</Select.Group>
						</Select.Content>
					</Select.Root>
				</Field.Field>

				{#if form.scope === 'product'}
					<Field.Field>
						<Field.FieldLabel for="discount-product">Product</Field.FieldLabel>
						<Select.Root
							type="single"
							value={form.productId}
							onValueChange={(v) => (form.productId = v)}
						>
							<Select.Trigger id="discount-product" class="w-full">
								{products.current?.find((p) => p.id === form.productId)?.name ?? 'Select product'}
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
				{/if}

				<div class="grid grid-cols-2 gap-4">
					<Field.Field>
						<Field.FieldLabel for="discount-min-purchase">Min purchase (₹)</Field.FieldLabel>
						<Input
							id="discount-min-purchase"
							type="number"
							min="0"
							step="0.01"
							bind:value={form.minPurchase}
							placeholder="Any"
						/>
					</Field.Field>
					<Field.Field>
						<Field.FieldLabel for="discount-min-qty">Min quantity (seats)</Field.FieldLabel>
						<Input
							id="discount-min-qty"
							type="number"
							min="0"
							step="1"
							bind:value={form.minQuantity}
							placeholder="Any"
						/>
					</Field.Field>
				</div>

				<div class="grid grid-cols-2 gap-4">
					<Field.Field>
						<Field.FieldLabel for="discount-start">Start date</Field.FieldLabel>
						<Input id="discount-start" type="date" bind:value={form.startDate} required />
					</Field.Field>
					<Field.Field>
						<Field.FieldLabel for="discount-end">End date (optional)</Field.FieldLabel>
						<Input id="discount-end" type="date" bind:value={form.endDate} />
					</Field.Field>
				</div>

				<Field.Field>
					<Field.FieldLabel for="discount-limit">Usage limit (optional)</Field.FieldLabel>
					<Input
						id="discount-limit"
						type="number"
						min="1"
						step="1"
						bind:value={form.usageLimit}
						placeholder="Unlimited"
					/>
					<Field.FieldDescription
						>How many invoices this discount can apply to.</Field.FieldDescription
					>
				</Field.Field>

				<Field.Field orientation="horizontal">
					<Switch id="discount-active" bind:checked={form.active} />
					<Field.FieldLabel for="discount-active">Active</Field.FieldLabel>
				</Field.Field>
			</Field.FieldGroup>

			<Sheet.Footer class="px-0">
				<Button type="submit" disabled={saving}>
					{#if saving}<BarSpinner role="status" aria-label="Saving" />{/if}
					{editing ? 'Save changes' : 'Create discount'}
				</Button>
				<Sheet.Close>
					{#snippet child({ props })}
						<Button {...props} variant="outline" type="button">Cancel</Button>
					{/snippet}
				</Sheet.Close>
			</Sheet.Footer>
		</form>
	</Sheet.Content>
</Sheet.Root>

<AlertDialog.Root
	open={deleteTarget !== null}
	onOpenChange={(open) => {
		if (!open) deleteTarget = null;
	}}
>
	<AlertDialog.Content>
		<AlertDialog.Header>
			<AlertDialog.Title>Delete “{deleteTarget?.name}”?</AlertDialog.Title>
			<AlertDialog.Description>
				This permanently deletes the discount rule. Discounts already applied to invoices cannot be
				deleted — deactivate them instead.
			</AlertDialog.Description>
		</AlertDialog.Header>
		<AlertDialog.Footer>
			<AlertDialog.Cancel>Cancel</AlertDialog.Cancel>
			<AlertDialog.Action
				class="bg-destructive text-white hover:bg-destructive/90"
				disabled={deleting}
				onclick={confirmDelete}
			>
				{#if deleting}<BarSpinner role="status" aria-label="Deleting" />{/if}
				Delete
			</AlertDialog.Action>
		</AlertDialog.Footer>
	</AlertDialog.Content>
</AlertDialog.Root>
