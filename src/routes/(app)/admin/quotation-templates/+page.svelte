<script lang="ts">
	import {
		createTemplateCommand,
		deleteTemplateCommand,
		getPlans,
		getProducts,
		getQuotationTemplates,
		updateTemplateCommand
	} from '../data.remote.ts';
	import * as Card from '#lib/components/ui/card/index.ts';
	import * as Table from '#lib/components/ui/table/index.ts';
	import * as DropdownMenu from '#lib/components/ui/dropdown-menu/index.ts';
	import * as Sheet from '#lib/components/ui/sheet/index.ts';
	import * as AlertDialog from '#lib/components/ui/alert-dialog/index.ts';
	import * as Field from '#lib/components/ui/field/index.ts';
	import * as Select from '#lib/components/ui/select/index.ts';
	import { Button } from '#lib/components/ui/button/index.ts';
	import { Input } from '#lib/components/ui/input/index.ts';
	import { Skeleton } from '#lib/components/ui/skeleton/index.ts';
	import { SidebarTrigger } from '#lib/components/ui/sidebar/index.ts';
	import { toast } from 'svelte-sonner';
	import { BarSpinner } from '#lib/components/custom/index.ts';

	import EllipsisIcon from '@lucide/svelte/icons/ellipsis';
	import PencilIcon from '@lucide/svelte/icons/pencil';
	import PlusIcon from '@lucide/svelte/icons/plus';
	import Trash2Icon from '@lucide/svelte/icons/trash-2';
	import TriangleAlertIcon from '@lucide/svelte/icons/triangle-alert';

	type TemplateRow = NonNullable<typeof templates.current>[number];

	const templates = getQuotationTemplates();
	const plans = getPlans();
	const products = getProducts();

	interface LineForm {
		productId: string;
		variantId: string;
		quantity: number | undefined;
	}

	let sheetOpen = $state(false);
	let editing = $state<TemplateRow | null>(null);
	let form = $state<{ name: string; validityDays: number | undefined; planId: string }>({
		name: '',
		validityDays: 30,
		planId: ''
	});
	let lines = $state<LineForm[]>([{ productId: '', variantId: '', quantity: 1 }]);
	let saving = $state(false);
	let deleteTarget = $state<TemplateRow | null>(null);
	let deleting = $state(false);

	const productById = (id: string) => products.current?.find((p) => p.id === id);

	function openCreate() {
		editing = null;
		form = { name: '', validityDays: 30, planId: '' };
		lines = [{ productId: '', variantId: '', quantity: 1 }];
		sheetOpen = true;
	}

	function openEdit(t: TemplateRow) {
		editing = t;
		form = { name: t.name, validityDays: t.validityDays, planId: t.planId };
		lines = t.lines.map((l) => ({
			productId: l.productId,
			variantId: l.variantId ?? '',
			quantity: l.quantity
		}));
		sheetOpen = true;
	}

	async function save() {
		const cleanLines = lines.filter((l) => l.productId);
		if (!form.name.trim() || !form.planId || form.validityDays == null) {
			toast.error('Name, plan and validity days are required.');
			return;
		}
		if (cleanLines.length === 0 || cleanLines.some((l) => !l.quantity || l.quantity < 1)) {
			toast.error('Add at least one product line with a quantity.');
			return;
		}
		saving = true;
		try {
			const data = {
				name: form.name.trim(),
				validityDays: form.validityDays,
				planId: form.planId,
				lines: cleanLines.map((l) => ({
					productId: l.productId,
					variantId: l.variantId || null,
					quantity: l.quantity as number
				}))
			};
			if (editing) await updateTemplateCommand({ id: editing.id, data });
			else await createTemplateCommand(data);
			toast.success(editing ? 'Template saved.' : 'Template created.');
			sheetOpen = false;
		} catch (e) {
			toast.error(e instanceof Error ? e.message : 'Could not save the template.');
		} finally {
			saving = false;
		}
	}

	async function confirmDelete() {
		if (!deleteTarget) return;
		deleting = true;
		try {
			await deleteTemplateCommand(deleteTarget.id);
			toast.success('Template deleted.');
			deleteTarget = null;
		} catch (e) {
			toast.error(e instanceof Error ? e.message : 'Could not delete the template.');
		} finally {
			deleting = false;
		}
	}
</script>

<svelte:head>
	<title>Quotation Templates — Brightloop</title>
</svelte:head>

<div class="flex flex-col gap-6">
	<div class="flex flex-wrap items-start justify-between gap-4">
		<div class="flex flex-col gap-1">
			<h1 class="text-2xl font-semibold tracking-tight">
				<SidebarTrigger class="mr-4" />
				Quotation Templates
			</h1>
			<p class="text-sm text-muted-foreground">
				Ready-made offers: a plan plus product lines that stay valid for a set number of days.
			</p>
		</div>
		<Button onclick={openCreate}>
			<PlusIcon data-icon="inline-start" />
			New template
		</Button>
	</div>

	{#if templates.error}
		<Card.Root>
			<Card.Header>
				<Card.Title class="flex items-center gap-2 text-destructive">
					<TriangleAlertIcon class="size-5" aria-hidden="true" />
					Couldn't load templates
				</Card.Title>
				<Card.Description>{templates.error.message ?? 'Something went wrong.'}</Card.Description>
			</Card.Header>
			<Card.Footer>
				<Button variant="outline" onclick={() => templates.refresh()}>Try again</Button>
			</Card.Footer>
		</Card.Root>
	{:else if !templates.current}
		<Skeleton class="h-96" aria-label="Loading templates" />
	{:else if templates.current.length === 0}
		<Card.Root>
			<Card.Content class="flex flex-col items-center gap-2 py-12 text-center">
				<p class="font-medium">No templates yet</p>
				<p class="text-sm text-muted-foreground">
					Build a template so sales can start quotes in one click.
				</p>
				<Button class="mt-2" onclick={openCreate}>
					<PlusIcon data-icon="inline-start" />
					New template
				</Button>
			</Card.Content>
		</Card.Root>
	{:else}
		<Card.Root>
			<Card.Content>
				<Table.Root>
					<Table.Header>
						<Table.Row>
							<Table.Head>Template</Table.Head>
							<Table.Head>Plan</Table.Head>
							<Table.Head class="text-right">Valid for</Table.Head>
							<Table.Head>Lines</Table.Head>
							<Table.Head class="text-right">Actions</Table.Head>
						</Table.Row>
					</Table.Header>
					<Table.Body>
						{#each templates.current as t (t.id)}
							<Table.Row>
								<Table.Cell class="font-medium">{t.name}</Table.Cell>
								<Table.Cell>{t.plan.name}</Table.Cell>
								<Table.Cell class="text-right">{t.validityDays} days</Table.Cell>
								<Table.Cell>
									<div class="flex max-w-72 flex-col gap-0.5">
										{#each t.lines as l (l.id)}
											<span class="text-xs text-muted-foreground">
												{l.product.name}{l.variant
													? ` (${l.variant.attribute}: ${l.variant.value})`
													: ''} × {l.quantity}
											</span>
										{/each}
									</div>
								</Table.Cell>
								<Table.Cell class="text-right">
									<DropdownMenu.Root>
										<DropdownMenu.Trigger>
											{#snippet child({ props })}
												<Button
													{...props}
													variant="ghost"
													size="icon"
													aria-label="Template actions"
												>
													<EllipsisIcon />
												</Button>
											{/snippet}
										</DropdownMenu.Trigger>
										<DropdownMenu.Content align="end">
											<DropdownMenu.Group>
												<DropdownMenu.Item onclick={() => openEdit(t)}>
													<PencilIcon />
													Edit
												</DropdownMenu.Item>
												<DropdownMenu.Separator />
												<DropdownMenu.Item variant="destructive" onclick={() => (deleteTarget = t)}>
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
	<Sheet.Content class="overflow-y-auto sm:max-w-lg">
		<Sheet.Header>
			<Sheet.Title>{editing ? 'Edit template' : 'New template'}</Sheet.Title>
			<Sheet.Description>The plan and lines a new subscription starts from.</Sheet.Description>
		</Sheet.Header>
		<form
			class="flex flex-col gap-5 px-4 pb-6"
			onsubmit={(e) => {
				e.preventDefault();
				save();
			}}
		>
			<Field.FieldGroup>
				<Field.Field>
					<Field.FieldLabel for="tpl-name">Name</Field.FieldLabel>
					<Input id="tpl-name" bind:value={form.name} placeholder="Enterprise starter" required />
				</Field.Field>
				<div class="grid grid-cols-2 gap-4">
					<Field.Field>
						<Field.FieldLabel for="tpl-plan">Plan</Field.FieldLabel>
						<Select.Root type="single" value={form.planId} onValueChange={(v) => (form.planId = v)}>
							<Select.Trigger id="tpl-plan" class="w-full">
								{plans.current?.find((p) => p.id === form.planId)?.name ?? 'Select plan'}
							</Select.Trigger>
							<Select.Content>
								<Select.Group>
									{#each plans.current ?? [] as p (p.id)}
										<Select.Item value={p.id} label={p.name} />
									{/each}
								</Select.Group>
							</Select.Content>
						</Select.Root>
					</Field.Field>
					<Field.Field>
						<Field.FieldLabel for="tpl-validity">Validity (days)</Field.FieldLabel>
						<Input
							id="tpl-validity"
							type="number"
							min="1"
							step="1"
							bind:value={form.validityDays}
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
						onclick={() => lines.push({ productId: '', variantId: '', quantity: 1 })}
					>
						<PlusIcon data-icon="inline-start" />
						Add line
					</Button>
				</div>
				{#each lines as line, i (i)}
					<div class="flex flex-col gap-3 rounded-lg border p-3">
						<div class="grid grid-cols-2 gap-3">
							<Field.Field>
								<Field.FieldLabel for={`line-product-${i}`}>Product</Field.FieldLabel>
								<Select.Root
									type="single"
									value={line.productId}
									onValueChange={(v) => {
										line.productId = v;
										line.variantId = '';
									}}
								>
									<Select.Trigger id={`line-product-${i}`} class="w-full">
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
								<Field.FieldLabel for={`line-variant-${i}`}>Variant (optional)</Field.FieldLabel>
								<Select.Root
									type="single"
									value={line.variantId}
									onValueChange={(v) => (line.variantId = v)}
								>
									<Select.Trigger id={`line-variant-${i}`} class="w-full">
										{productById(line.productId)?.variants.find((v) => v.id === line.variantId)
											? `${productById(line.productId)?.variants.find((v) => v.id === line.variantId)?.attribute}: ${productById(line.productId)?.variants.find((v) => v.id === line.variantId)?.value}`
											: 'No variant'}
									</Select.Trigger>
									<Select.Content>
										<Select.Group>
											{#each productById(line.productId)?.variants ?? [] as v (v.id)}
												<Select.Item value={v.id} label={`${v.attribute}: ${v.value}`} />
											{/each}
										</Select.Group>
									</Select.Content>
								</Select.Root>
							</Field.Field>
						</div>
						<div class="flex items-end gap-3">
							<Field.Field class="max-w-32">
								<Field.FieldLabel for={`line-qty-${i}`}>Quantity</Field.FieldLabel>
								<Input
									id={`line-qty-${i}`}
									type="number"
									min="1"
									step="1"
									bind:value={line.quantity}
									required
								/>
							</Field.Field>
							{#if lines.length > 1}
								<Button
									type="button"
									variant="ghost"
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
			</div>

			<Sheet.Footer class="px-0">
				<Button type="submit" disabled={saving}>
					{#if saving}<BarSpinner role="status" aria-label="Saving" />{/if}
					{editing ? 'Save changes' : 'Create template'}
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
				Templates already used by subscriptions cannot be deleted.
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
