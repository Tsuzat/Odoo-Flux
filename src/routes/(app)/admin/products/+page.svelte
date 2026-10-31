<script lang="ts">
	import {
		createProductCommand,
		createVariantCommand,
		deleteProductCommand,
		deleteVariantCommand,
		getProducts,
		updateProductCommand,
		updateVariantCommand
	} from '../data.remote.ts';
	import * as Card from '#lib/components/ui/card/index.ts';
	import * as Table from '#lib/components/ui/table/index.ts';
	import * as DropdownMenu from '#lib/components/ui/dropdown-menu/index.ts';
	import * as Sheet from '#lib/components/ui/sheet/index.ts';
	import * as AlertDialog from '#lib/components/ui/alert-dialog/index.ts';
	import * as Field from '#lib/components/ui/field/index.ts';
	import * as Select from '#lib/components/ui/select/index.ts';
	import { Badge } from '#lib/components/ui/badge/index.ts';
	import { Button } from '#lib/components/ui/button/index.ts';
	import { Input } from '#lib/components/ui/input/index.ts';
	import { Textarea } from '#lib/components/ui/textarea/index.ts';
	import { Switch } from '#lib/components/ui/switch/index.ts';
	import { Skeleton } from '#lib/components/ui/skeleton/index.ts';
	import { SidebarTrigger } from '#lib/components/ui/sidebar/index.ts';
	import { toast } from 'svelte-sonner';
	import { formatCurrency, humanize } from '#lib/index.ts';
	import { BarSpinner } from '#lib/components/custom/index.ts';

	import EllipsisIcon from '@lucide/svelte/icons/ellipsis';
	import PencilIcon from '@lucide/svelte/icons/pencil';
	import PlusIcon from '@lucide/svelte/icons/plus';
	import Trash2Icon from '@lucide/svelte/icons/trash-2';
	import TriangleAlertIcon from '@lucide/svelte/icons/triangle-alert';

	type ProductType = 'service' | 'goods' | 'addon';
	type ProductRow = NonNullable<typeof products.current>[number];
	type VariantRow = ProductRow['variants'][number];

	const products = getProducts();

	const TYPE_OPTIONS: { value: ProductType; label: string }[] = [
		{ value: 'service', label: 'Service' },
		{ value: 'goods', label: 'Goods' },
		{ value: 'addon', label: 'Add-on' }
	];

	interface ProductForm {
		name: string;
		type: ProductType;
		salesPrice: number | undefined;
		costPrice: number | undefined;
		notes: string;
		active: boolean;
	}

	const blankForm = (): ProductForm => ({
		name: '',
		type: 'service',
		salesPrice: undefined,
		costPrice: 0,
		notes: '',
		active: true
	});

	let sheetOpen = $state(false);
	let editing = $state<ProductRow | null>(null);
	let form = $state<ProductForm>(blankForm());
	let saving = $state(false);

	let variantForm = $state({ attribute: '', value: '', extraPrice: 0 as number | undefined });
	let variantSaving = $state(false);
	let editingVariant = $state<VariantRow | null>(null);

	let deleteTarget = $state<ProductRow | null>(null);
	let deleting = $state(false);

	const editingVariants = $derived(
		editing ? (products.current?.find((p) => p.id === editing?.id)?.variants ?? []) : []
	);

	function openCreate() {
		editing = null;
		editingVariant = null;
		form = blankForm();
		variantForm = { attribute: '', value: '', extraPrice: 0 };
		sheetOpen = true;
	}

	function openEdit(product: ProductRow) {
		editing = product;
		editingVariant = null;
		form = {
			name: product.name,
			type: (TYPE_OPTIONS.some((o) => o.value === product.type)
				? product.type
				: 'service') as ProductType,
			salesPrice: Number(product.salesPrice),
			costPrice: Number(product.costPrice),
			notes: product.notes ?? '',
			active: product.active
		};
		variantForm = { attribute: '', value: '', extraPrice: 0 };
		sheetOpen = true;
	}

	async function saveProduct() {
		if (!form.name.trim() || form.salesPrice == null || form.costPrice == null) {
			toast.error('Name, sales price and cost price are required.');
			return;
		}
		saving = true;
		try {
			const data = {
				name: form.name.trim(),
				type: form.type,
				salesPrice: form.salesPrice,
				costPrice: form.costPrice,
				notes: form.notes.trim() || null,
				active: form.active
			};
			if (editing) {
				await updateProductCommand({ id: editing.id, data });
				toast.success('Product saved.');
			} else {
				await createProductCommand(data);
				toast.success('Product created.');
			}
			sheetOpen = false;
		} catch (e) {
			toast.error(e instanceof Error ? e.message : 'Could not save the product.');
		} finally {
			saving = false;
		}
	}

	async function toggleActive(product: ProductRow) {
		try {
			await updateProductCommand({
				id: product.id,
				data: {
					name: product.name,
					type: (TYPE_OPTIONS.some((o) => o.value === product.type)
						? product.type
						: 'service') as ProductType,
					salesPrice: Number(product.salesPrice),
					costPrice: Number(product.costPrice),
					notes: product.notes,
					active: !product.active
				}
			});
			toast.success(product.active ? 'Product deactivated.' : 'Product activated.');
		} catch (e) {
			toast.error(e instanceof Error ? e.message : 'Could not update the product.');
		}
	}

	async function saveVariant() {
		if (!editing) return;
		if (
			!variantForm.attribute.trim() ||
			!variantForm.value.trim() ||
			variantForm.extraPrice == null
		) {
			toast.error('Variant attribute, value and extra price are required.');
			return;
		}
		variantSaving = true;
		try {
			const data = {
				attribute: variantForm.attribute.trim(),
				value: variantForm.value.trim(),
				extraPrice: variantForm.extraPrice
			};
			if (editingVariant) {
				await updateVariantCommand({ id: editingVariant.id, data });
				toast.success('Variant saved.');
			} else {
				await createVariantCommand({ productId: editing.id, data });
				toast.success('Variant added.');
			}
			editingVariant = null;
			variantForm = { attribute: '', value: '', extraPrice: 0 };
		} catch (e) {
			toast.error(e instanceof Error ? e.message : 'Could not save the variant.');
		} finally {
			variantSaving = false;
		}
	}

	function editVariant(variant: VariantRow) {
		editingVariant = variant;
		variantForm = {
			attribute: variant.attribute,
			value: variant.value,
			extraPrice: Number(variant.extraPrice)
		};
	}

	async function removeVariant(variant: VariantRow) {
		try {
			await deleteVariantCommand(variant.id);
			toast.success('Variant deleted.');
			if (editingVariant?.id === variant.id) editingVariant = null;
		} catch (e) {
			toast.error(e instanceof Error ? e.message : 'Could not delete the variant.');
		}
	}

	async function confirmDelete() {
		if (!deleteTarget) return;
		deleting = true;
		try {
			await deleteProductCommand(deleteTarget.id);
			toast.success('Product deleted.');
			deleteTarget = null;
		} catch (e) {
			toast.error(e instanceof Error ? e.message : 'Could not delete the product.');
		} finally {
			deleting = false;
		}
	}
</script>

<svelte:head>
	<title>Products & Variants — Brightloop</title>
</svelte:head>

<div class="flex flex-col gap-6">
	<div class="flex flex-wrap items-start justify-between gap-4">
		<div class="flex flex-col gap-1">
			<h1 class="text-2xl font-semibold tracking-tight">
				<SidebarTrigger class="mr-4" />
				Products & Variants
			</h1>
			<p class="text-sm text-muted-foreground">
				Everything Brightloop sells — services, goods and add-ons, with per-variant pricing.
			</p>
		</div>
		<Button onclick={openCreate}>
			<PlusIcon data-icon="inline-start" />
			New product
		</Button>
	</div>

	{#if products.error}
		<Card.Root>
			<Card.Header>
				<Card.Title class="flex items-center gap-2 text-destructive">
					<TriangleAlertIcon class="size-5" aria-hidden="true" />
					Couldn't load products
				</Card.Title>
				<Card.Description>{products.error.message ?? 'Something went wrong.'}</Card.Description>
			</Card.Header>
			<Card.Footer>
				<Button variant="outline" onclick={() => products.refresh()}>Try again</Button>
			</Card.Footer>
		</Card.Root>
	{:else if !products.current}
		<Skeleton class="h-96" aria-label="Loading products" />
	{:else if products.current.length === 0}
		<Card.Root>
			<Card.Content class="flex flex-col items-center gap-2 py-12 text-center">
				<p class="font-medium">No products yet</p>
				<p class="text-sm text-muted-foreground">Create your first product to start selling.</p>
				<Button class="mt-2" onclick={openCreate}>
					<PlusIcon data-icon="inline-start" />
					New product
				</Button>
			</Card.Content>
		</Card.Root>
	{:else}
		<Card.Root>
			<Card.Content>
				<Table.Root>
					<Table.Header>
						<Table.Row>
							<Table.Head>Product</Table.Head>
							<Table.Head>Type</Table.Head>
							<Table.Head class="text-right">Sales price</Table.Head>
							<Table.Head class="text-right">Cost</Table.Head>
							<Table.Head>Variants</Table.Head>
							<Table.Head>Status</Table.Head>
							<Table.Head class="text-right">Actions</Table.Head>
						</Table.Row>
					</Table.Header>
					<Table.Body>
						{#each products.current as product (product.id)}
							<Table.Row>
								<Table.Cell>
									<div class="flex flex-col">
										<span class="font-medium">{product.name}</span>
										{#if product.notes}
											<span class="max-w-56 truncate text-xs text-muted-foreground">
												{product.notes}
											</span>
										{/if}
									</div>
								</Table.Cell>
								<Table.Cell>
									<Badge variant="outline">{humanize(product.type)}</Badge>
								</Table.Cell>
								<Table.Cell class="text-right">{formatCurrency(product.salesPrice)}</Table.Cell>
								<Table.Cell class="text-right">{formatCurrency(product.costPrice)}</Table.Cell>
								<Table.Cell>
									{#if product.variants.length === 0}
										<span class="text-muted-foreground">—</span>
									{:else}
										<div class="flex max-w-64 flex-col gap-0.5">
											{#each product.variants as variant (variant.id)}
												<span class="text-xs text-muted-foreground">
													{variant.attribute}: {variant.value} (+{formatCurrency(
														variant.extraPrice
													)})
												</span>
											{/each}
										</div>
									{/if}
								</Table.Cell>
								<Table.Cell>
									<Badge variant={product.active ? 'default' : 'secondary'}>
										{product.active ? 'Active' : 'Inactive'}
									</Badge>
								</Table.Cell>
								<Table.Cell class="text-right">
									<DropdownMenu.Root>
										<DropdownMenu.Trigger>
											{#snippet child({ props })}
												<Button {...props} variant="ghost" size="icon" aria-label="Product actions">
													<EllipsisIcon />
												</Button>
											{/snippet}
										</DropdownMenu.Trigger>
										<DropdownMenu.Content align="end">
											<DropdownMenu.Group>
												<DropdownMenu.Item onclick={() => openEdit(product)}>
													<PencilIcon />
													Edit & variants
												</DropdownMenu.Item>
												<DropdownMenu.Item onclick={() => toggleActive(product)}>
													{product.active ? 'Deactivate' : 'Activate'}
												</DropdownMenu.Item>
												<DropdownMenu.Separator />
												<DropdownMenu.Item
													variant="destructive"
													onclick={() => (deleteTarget = product)}
												>
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
			<Sheet.Title>{editing ? 'Edit product' : 'New product'}</Sheet.Title>
			<Sheet.Description>
				{editing
					? 'Update the product and manage its variants below.'
					: 'Add a product Brightloop sells on subscription.'}
			</Sheet.Description>
		</Sheet.Header>

		<form
			class="flex flex-col gap-5 px-4"
			onsubmit={(e) => {
				e.preventDefault();
				saveProduct();
			}}
		>
			<Field.FieldGroup>
				<Field.Field>
					<Field.FieldLabel for="product-name">Name</Field.FieldLabel>
					<Input id="product-name" bind:value={form.name} placeholder="Business Suite" required />
				</Field.Field>

				<Field.Field>
					<Field.FieldLabel for="product-type">Type</Field.FieldLabel>
					<Select.Root
						type="single"
						value={form.type}
						onValueChange={(v) => (form.type = v as ProductType)}
					>
						<Select.Trigger id="product-type" class="w-full">
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

				<div class="grid grid-cols-2 gap-4">
					<Field.Field>
						<Field.FieldLabel for="product-sales">Sales price (₹)</Field.FieldLabel>
						<Input
							id="product-sales"
							type="number"
							min="0"
							step="0.01"
							bind:value={form.salesPrice}
							required
						/>
					</Field.Field>
					<Field.Field>
						<Field.FieldLabel for="product-cost">Cost price (₹)</Field.FieldLabel>
						<Input
							id="product-cost"
							type="number"
							min="0"
							step="0.01"
							bind:value={form.costPrice}
							required
						/>
					</Field.Field>
				</div>

				<Field.Field>
					<Field.FieldLabel for="product-notes">Notes</Field.FieldLabel>
					<Textarea id="product-notes" bind:value={form.notes} placeholder="Optional notes" />
				</Field.Field>

				<Field.Field orientation="horizontal">
					<Switch id="product-active" bind:checked={form.active} />
					<Field.FieldLabel for="product-active">Active (available to sell)</Field.FieldLabel>
				</Field.Field>
			</Field.FieldGroup>

			<Sheet.Footer class="px-0">
				<Button type="submit" disabled={saving}>
					{#if saving}<BarSpinner role="status" aria-label="Saving" />{/if}
					{editing ? 'Save changes' : 'Create product'}
				</Button>
				<Sheet.Close>
					{#snippet child({ props })}
						<Button {...props} variant="outline" type="button">Cancel</Button>
					{/snippet}
				</Sheet.Close>
			</Sheet.Footer>
		</form>

		{#if editing}
			<div class="flex flex-col gap-4 px-4 pb-6">
				<div class="flex flex-col gap-1">
					<h3 class="font-semibold">Variants</h3>
					<p class="text-sm text-muted-foreground">
						E.g. Brand: Odoo adds an extra price per unit on top of the sales price.
					</p>
				</div>

				{#if editingVariants.length === 0}
					<p class="text-sm text-muted-foreground">No variants yet.</p>
				{:else}
					<div class="flex flex-col gap-2">
						{#each editingVariants as variant (variant.id)}
							<div class="flex items-center justify-between gap-2 rounded-lg border px-3 py-2">
								<div class="flex flex-col">
									<span class="text-sm font-medium">{variant.attribute}: {variant.value}</span>
									<span class="text-xs text-muted-foreground">
										+{formatCurrency(variant.extraPrice)} per unit
									</span>
								</div>
								<div class="flex items-center gap-1">
									<Button
										variant="ghost"
										size="icon"
										aria-label="Edit variant"
										onclick={() => editVariant(variant)}
									>
										<PencilIcon />
									</Button>
									<Button
										variant="ghost"
										size="icon"
										aria-label="Delete variant"
										onclick={() => removeVariant(variant)}
									>
										<Trash2Icon />
									</Button>
								</div>
							</div>
						{/each}
					</div>
				{/if}

				<form
					class="flex flex-col gap-3 rounded-lg border p-3"
					onsubmit={(e) => {
						e.preventDefault();
						saveVariant();
					}}
				>
					<p class="text-sm font-medium">{editingVariant ? 'Edit variant' : 'Add variant'}</p>
					<div class="grid grid-cols-2 gap-3">
						<Field.Field>
							<Field.FieldLabel for="variant-attribute">Attribute</Field.FieldLabel>
							<Input
								id="variant-attribute"
								bind:value={variantForm.attribute}
								placeholder="Brand"
								required
							/>
						</Field.Field>
						<Field.Field>
							<Field.FieldLabel for="variant-value">Value</Field.FieldLabel>
							<Input
								id="variant-value"
								bind:value={variantForm.value}
								placeholder="Odoo"
								required
							/>
						</Field.Field>
					</div>
					<Field.Field>
						<Field.FieldLabel for="variant-extra">Extra price (₹ per unit)</Field.FieldLabel>
						<Input
							id="variant-extra"
							type="number"
							min="0"
							step="0.01"
							bind:value={variantForm.extraPrice}
							required
						/>
					</Field.Field>
					<div class="flex gap-2">
						<Button type="submit" size="sm" disabled={variantSaving}>
							{#if variantSaving}<BarSpinner role="status" aria-label="Saving variant" />{/if}
							{editingVariant ? 'Save variant' : 'Add variant'}
						</Button>
						{#if editingVariant}
							<Button
								type="button"
								size="sm"
								variant="outline"
								onclick={() => {
									editingVariant = null;
									variantForm = { attribute: '', value: '', extraPrice: 0 };
								}}
							>
								Cancel edit
							</Button>
						{/if}
					</div>
				</form>
			</div>
		{/if}
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
				This permanently deletes the product and its variants. Products already used by
				subscriptions or invoices cannot be deleted — deactivate them instead.
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
