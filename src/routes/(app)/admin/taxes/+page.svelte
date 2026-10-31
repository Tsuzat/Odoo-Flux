<script lang="ts">
	import {
		createTaxCommand,
		deleteTaxCommand,
		getTaxes,
		updateTaxCommand
	} from '../data.remote.ts';
	import * as Card from '#lib/components/ui/card/index.ts';
	import * as Table from '#lib/components/ui/table/index.ts';
	import * as DropdownMenu from '#lib/components/ui/dropdown-menu/index.ts';
	import * as Sheet from '#lib/components/ui/sheet/index.ts';
	import AppSheetContent from '#lib/components/custom/app-sheet-content.svelte';
	import * as AlertDialog from '#lib/components/ui/alert-dialog/index.ts';
	import * as Field from '#lib/components/ui/field/index.ts';
	import { Badge } from '#lib/components/ui/badge/index.ts';
	import { Button } from '#lib/components/ui/button/index.ts';
	import { Input } from '#lib/components/ui/input/index.ts';
	import { Switch } from '#lib/components/ui/switch/index.ts';
	import { Skeleton } from '#lib/components/ui/skeleton/index.ts';
	import { SidebarTrigger } from '#lib/components/ui/sidebar/index.ts';
	import { toast } from 'svelte-sonner';
	import { BarSpinner } from '#lib/components/custom/index.ts';

	import EllipsisIcon from '@lucide/svelte/icons/ellipsis';
	import PencilIcon from '@lucide/svelte/icons/pencil';
	import PlusIcon from '@lucide/svelte/icons/plus';
	import Trash2Icon from '@lucide/svelte/icons/trash-2';
	import TriangleAlertIcon from '@lucide/svelte/icons/triangle-alert';

	type TaxRow = NonNullable<typeof taxes.current>[number];
	const taxes = getTaxes();

	let sheetOpen = $state(false);
	let editing = $state<TaxRow | null>(null);
	let form = $state({ name: '', ratePercent: undefined as number | undefined, active: true });
	let saving = $state(false);
	let deleteTarget = $state<TaxRow | null>(null);
	let deleting = $state(false);

	function openCreate() {
		editing = null;
		form = { name: '', ratePercent: undefined, active: true };
		sheetOpen = true;
	}

	function openEdit(t: TaxRow) {
		editing = t;
		form = { name: t.name, ratePercent: Number(t.ratePercent), active: t.active };
		sheetOpen = true;
	}

	async function save() {
		if (!form.name.trim() || form.ratePercent == null) {
			toast.error('Name and rate are required.');
			return;
		}
		saving = true;
		try {
			const data = { name: form.name.trim(), ratePercent: form.ratePercent, active: form.active };
			if (editing) await updateTaxCommand({ id: editing.id, data });
			else await createTaxCommand(data);
			toast.success(editing ? 'Tax saved.' : 'Tax created.');
			sheetOpen = false;
		} catch (e) {
			toast.error(e instanceof Error ? e.message : 'Could not save the tax.');
		} finally {
			saving = false;
		}
	}

	async function toggleActive(t: TaxRow) {
		try {
			await updateTaxCommand({
				id: t.id,
				data: { name: t.name, ratePercent: Number(t.ratePercent), active: !t.active }
			});
			toast.success(t.active ? 'Tax deactivated.' : 'Tax activated.');
		} catch (e) {
			toast.error(e instanceof Error ? e.message : 'Could not update the tax.');
		}
	}

	async function confirmDelete() {
		if (!deleteTarget) return;
		deleting = true;
		try {
			await deleteTaxCommand(deleteTarget.id);
			toast.success('Tax deleted.');
			deleteTarget = null;
		} catch (e) {
			toast.error(e instanceof Error ? e.message : 'Could not delete the tax.');
		} finally {
			deleting = false;
		}
	}
</script>

<svelte:head>
	<title>Taxes — Brightloop</title>
</svelte:head>

<div class="flex flex-col gap-6">
	<div class="flex flex-wrap items-start justify-between gap-4">
		<div class="flex flex-col gap-1">
			<h1 class="text-2xl font-semibold tracking-tight">
				<SidebarTrigger class="mr-4" />
				Taxes
			</h1>
			<p class="text-sm text-muted-foreground">
				Tax rules applied automatically when invoices are generated.
			</p>
		</div>
		<Button onclick={openCreate}>
			<PlusIcon data-icon="inline-start" />
			New tax
		</Button>
	</div>

	{#if taxes.error}
		<Card.Root>
			<Card.Header>
				<Card.Title class="flex items-center gap-2 text-destructive">
					<TriangleAlertIcon class="size-5" aria-hidden="true" />
					Couldn't load taxes
				</Card.Title>
				<Card.Description>{taxes.error.message ?? 'Something went wrong.'}</Card.Description>
			</Card.Header>
			<Card.Footer>
				<Button variant="outline" onclick={() => taxes.refresh()}>Try again</Button>
			</Card.Footer>
		</Card.Root>
	{:else if !taxes.current}
		<Skeleton class="h-96" aria-label="Loading taxes" />
	{:else if taxes.current.length === 0}
		<Card.Root>
			<Card.Content class="flex flex-col items-center gap-2 py-12 text-center">
				<p class="font-medium">No taxes yet</p>
				<p class="text-sm text-muted-foreground">Add your first tax rate, e.g. GST 18%.</p>
				<Button class="mt-2" onclick={openCreate}>
					<PlusIcon data-icon="inline-start" />
					New tax
				</Button>
			</Card.Content>
		</Card.Root>
	{:else}
		<Card.Root>
			<Card.Content>
				<Table.Root>
					<Table.Header>
						<Table.Row>
							<Table.Head>Name</Table.Head>
							<Table.Head class="text-right">Rate</Table.Head>
							<Table.Head>Status</Table.Head>
							<Table.Head class="text-right">Actions</Table.Head>
						</Table.Row>
					</Table.Header>
					<Table.Body>
						{#each taxes.current as t (t.id)}
							<Table.Row>
								<Table.Cell class="font-medium">{t.name}</Table.Cell>
								<Table.Cell class="text-right">{Number(t.ratePercent)}%</Table.Cell>
								<Table.Cell>
									<Badge variant={t.active ? 'default' : 'secondary'}>
										{t.active ? 'Active' : 'Inactive'}
									</Badge>
								</Table.Cell>
								<Table.Cell class="text-right">
									<DropdownMenu.Root>
										<DropdownMenu.Trigger>
											{#snippet child({ props })}
												<Button {...props} variant="ghost" size="icon" aria-label="Tax actions">
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
												<DropdownMenu.Item onclick={() => toggleActive(t)}>
													{t.active ? 'Deactivate' : 'Activate'}
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
	<AppSheetContent>
		<Sheet.Header>
			<Sheet.Title>{editing ? 'Edit tax' : 'New tax'}</Sheet.Title>
			<Sheet.Description
				>Taxes are snapshotted onto invoice lines at billing time.</Sheet.Description
			>
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
					<Field.FieldLabel for="tax-name">Name</Field.FieldLabel>
					<Input id="tax-name" bind:value={form.name} placeholder="GST 18%" required />
				</Field.Field>
				<Field.Field>
					<Field.FieldLabel for="tax-rate">Rate (%)</Field.FieldLabel>
					<Input
						id="tax-rate"
						type="number"
						min="0"
						max="100"
						step="0.01"
						bind:value={form.ratePercent}
						required
					/>
				</Field.Field>
				<Field.Field orientation="horizontal">
					<Switch id="tax-active" bind:checked={form.active} />
					<Field.FieldLabel for="tax-active">Active</Field.FieldLabel>
				</Field.Field>
			</Field.FieldGroup>
			<Sheet.Footer class="px-0">
				<Button type="submit" disabled={saving}>
					{#if saving}<BarSpinner role="status" aria-label="Saving" />{/if}
					{editing ? 'Save changes' : 'Create tax'}
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
				Taxes already used by subscription lines cannot be deleted — deactivate them instead.
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
