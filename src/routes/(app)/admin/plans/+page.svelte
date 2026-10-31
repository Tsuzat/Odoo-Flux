<script lang="ts">
	import {
		createPlanCommand,
		deletePlanCommand,
		getPlans,
		updatePlanCommand
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
	import { Switch } from '#lib/components/ui/switch/index.ts';
	import { Skeleton } from '#lib/components/ui/skeleton/index.ts';
	import { SidebarTrigger } from '#lib/components/ui/sidebar/index.ts';
	import { toast } from 'svelte-sonner';
	import { formatCurrency, formatDate, humanize } from '#lib/index.ts';
	import { BarSpinner } from '#lib/components/custom/index.ts';

	import EllipsisIcon from '@lucide/svelte/icons/ellipsis';
	import PencilIcon from '@lucide/svelte/icons/pencil';
	import PlusIcon from '@lucide/svelte/icons/plus';
	import Trash2Icon from '@lucide/svelte/icons/trash-2';
	import TriangleAlertIcon from '@lucide/svelte/icons/triangle-alert';

	type BillingPeriod = 'daily' | 'weekly' | 'monthly' | 'yearly';
	type PlanRow = NonNullable<typeof plans.current>[number];

	const plans = getPlans();

	const PERIOD_OPTIONS: { value: BillingPeriod; label: string }[] = [
		{ value: 'daily', label: 'Daily' },
		{ value: 'weekly', label: 'Weekly' },
		{ value: 'monthly', label: 'Monthly' },
		{ value: 'yearly', label: 'Yearly' }
	];

	interface PlanForm {
		name: string;
		price: number | undefined;
		billingPeriod: BillingPeriod;
		minQuantity: number | undefined;
		validFrom: string;
		validTo: string;
		autoClose: boolean;
		closable: boolean;
		pausable: boolean;
		renewable: boolean;
		active: boolean;
	}

	const today = () => new Date().toISOString().slice(0, 10);

	const blankForm = (): PlanForm => ({
		name: '',
		price: undefined,
		billingPeriod: 'monthly',
		minQuantity: 1,
		validFrom: today(),
		validTo: '',
		autoClose: false,
		closable: true,
		pausable: false,
		renewable: true,
		active: true
	});

	let sheetOpen = $state(false);
	let editing = $state<PlanRow | null>(null);
	let form = $state<PlanForm>(blankForm());
	let saving = $state(false);

	let deleteTarget = $state<PlanRow | null>(null);
	let deleting = $state(false);

	function openCreate() {
		editing = null;
		form = blankForm();
		sheetOpen = true;
	}

	function openEdit(plan: PlanRow) {
		editing = plan;
		form = {
			name: plan.name,
			price: Number(plan.price),
			billingPeriod: plan.billingPeriod,
			minQuantity: plan.minQuantity,
			validFrom: plan.validFrom,
			validTo: plan.validTo ?? '',
			autoClose: plan.autoClose,
			closable: plan.closable,
			pausable: plan.pausable,
			renewable: plan.renewable,
			active: plan.active
		};
		sheetOpen = true;
	}

	function toInput(f: PlanForm) {
		return {
			name: f.name.trim(),
			price: f.price as number,
			billingPeriod: f.billingPeriod,
			minQuantity: f.minQuantity as number,
			validFrom: f.validFrom,
			validTo: f.validTo || null,
			autoClose: f.autoClose,
			closable: f.closable,
			pausable: f.pausable,
			renewable: f.renewable,
			active: f.active
		};
	}

	async function savePlan() {
		if (!form.name.trim() || form.price == null || form.minQuantity == null || !form.validFrom) {
			toast.error('Name, price, minimum quantity and a start date are required.');
			return;
		}
		if (form.validTo && form.validTo < form.validFrom) {
			toast.error('The end date cannot be before the start date.');
			return;
		}
		saving = true;
		try {
			if (editing) {
				await updatePlanCommand({ id: editing.id, data: toInput(form) });
				toast.success('Plan saved.');
			} else {
				await createPlanCommand(toInput(form));
				toast.success('Plan created.');
			}
			sheetOpen = false;
		} catch (e) {
			toast.error(e instanceof Error ? e.message : 'Could not save the plan.');
		} finally {
			saving = false;
		}
	}

	async function toggleActive(plan: PlanRow) {
		try {
			await updatePlanCommand({
				id: plan.id,
				data: {
					name: plan.name,
					price: Number(plan.price),
					billingPeriod: plan.billingPeriod,
					minQuantity: plan.minQuantity,
					validFrom: plan.validFrom,
					validTo: plan.validTo,
					autoClose: plan.autoClose,
					closable: plan.closable,
					pausable: plan.pausable,
					renewable: plan.renewable,
					active: !plan.active
				}
			});
			toast.success(plan.active ? 'Plan deactivated.' : 'Plan activated.');
		} catch (e) {
			toast.error(e instanceof Error ? e.message : 'Could not update the plan.');
		}
	}

	async function confirmDelete() {
		if (!deleteTarget) return;
		deleting = true;
		try {
			await deletePlanCommand(deleteTarget.id);
			toast.success('Plan deleted.');
			deleteTarget = null;
		} catch (e) {
			toast.error(e instanceof Error ? e.message : 'Could not delete the plan.');
		} finally {
			deleting = false;
		}
	}
</script>

<svelte:head>
	<title>Plans — Brightloop</title>
</svelte:head>

<div class="flex flex-col gap-6">
	<div class="flex flex-wrap items-start justify-between gap-4">
		<div class="flex flex-col gap-1">
			<h1 class="text-2xl font-semibold tracking-tight">
				<SidebarTrigger class="mr-4" />
				Plans
			</h1>
			<p class="text-sm text-muted-foreground">
				What a subscription costs, how often it bills, and how it behaves at renewal time.
			</p>
		</div>
		<Button onclick={openCreate}>
			<PlusIcon data-icon="inline-start" />
			New plan
		</Button>
	</div>

	{#if plans.error}
		<Card.Root>
			<Card.Header>
				<Card.Title class="flex items-center gap-2 text-destructive">
					<TriangleAlertIcon class="size-5" aria-hidden="true" />
					Couldn't load plans
				</Card.Title>
				<Card.Description>{plans.error.message ?? 'Something went wrong.'}</Card.Description>
			</Card.Header>
			<Card.Footer>
				<Button variant="outline" onclick={() => plans.refresh()}>Try again</Button>
			</Card.Footer>
		</Card.Root>
	{:else if !plans.current}
		<Skeleton class="h-96" aria-label="Loading plans" />
	{:else if plans.current.length === 0}
		<Card.Root>
			<Card.Content class="flex flex-col items-center gap-2 py-12 text-center">
				<p class="font-medium">No plans yet</p>
				<p class="text-sm text-muted-foreground">Create your first billing plan.</p>
				<Button class="mt-2" onclick={openCreate}>
					<PlusIcon data-icon="inline-start" />
					New plan
				</Button>
			</Card.Content>
		</Card.Root>
	{:else}
		<Card.Root>
			<Card.Content>
				<Table.Root>
					<Table.Header>
						<Table.Row>
							<Table.Head>Plan</Table.Head>
							<Table.Head class="text-right">Price</Table.Head>
							<Table.Head>Bills</Table.Head>
							<Table.Head class="text-right">Min qty</Table.Head>
							<Table.Head>Valid</Table.Head>
							<Table.Head>Behaviour</Table.Head>
							<Table.Head>Status</Table.Head>
							<Table.Head class="text-right">Actions</Table.Head>
						</Table.Row>
					</Table.Header>
					<Table.Body>
						{#each plans.current as plan (plan.id)}
							<Table.Row>
								<Table.Cell class="font-medium">{plan.name}</Table.Cell>
								<Table.Cell class="text-right">{formatCurrency(plan.price)}</Table.Cell>
								<Table.Cell>
									<Badge variant="outline">{humanize(plan.billingPeriod)}</Badge>
								</Table.Cell>
								<Table.Cell class="text-right">{plan.minQuantity}</Table.Cell>
								<Table.Cell class="text-muted-foreground">
									{formatDate(plan.validFrom)} – {plan.validTo ? formatDate(plan.validTo) : '∞'}
								</Table.Cell>
								<Table.Cell>
									<div class="flex max-w-52 flex-wrap gap-1">
										{#if plan.autoClose}<Badge variant="secondary">Auto-close</Badge>{/if}
										{#if plan.closable}<Badge variant="secondary">Closable</Badge>{/if}
										{#if plan.pausable}<Badge variant="secondary">Pausable</Badge>{/if}
										{#if plan.renewable}<Badge variant="secondary">Renewable</Badge>{/if}
									</div>
								</Table.Cell>
								<Table.Cell>
									<Badge variant={plan.active ? 'default' : 'secondary'}>
										{plan.active ? 'Active' : 'Inactive'}
									</Badge>
								</Table.Cell>
								<Table.Cell class="text-right">
									<DropdownMenu.Root>
										<DropdownMenu.Trigger>
											{#snippet child({ props })}
												<Button {...props} variant="ghost" size="icon" aria-label="Plan actions">
													<EllipsisIcon />
												</Button>
											{/snippet}
										</DropdownMenu.Trigger>
										<DropdownMenu.Content align="end">
											<DropdownMenu.Group>
												<DropdownMenu.Item onclick={() => openEdit(plan)}>
													<PencilIcon />
													Edit
												</DropdownMenu.Item>
												<DropdownMenu.Item onclick={() => toggleActive(plan)}>
													{plan.active ? 'Deactivate' : 'Activate'}
												</DropdownMenu.Item>
												<DropdownMenu.Separator />
												<DropdownMenu.Item
													variant="destructive"
													onclick={() => (deleteTarget = plan)}
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
			<Sheet.Title>{editing ? 'Edit plan' : 'New plan'}</Sheet.Title>
			<Sheet.Description>
				Set the price, billing period, availability window and lifecycle behaviour.
			</Sheet.Description>
		</Sheet.Header>

		<form
			class="flex flex-col gap-5 px-4 pb-6"
			onsubmit={(e) => {
				e.preventDefault();
				savePlan();
			}}
		>
			<Field.FieldGroup>
				<Field.Field>
					<Field.FieldLabel for="plan-name">Name</Field.FieldLabel>
					<Input id="plan-name" bind:value={form.name} placeholder="Monthly Business" required />
				</Field.Field>

				<div class="grid grid-cols-2 gap-4">
					<Field.Field>
						<Field.FieldLabel for="plan-price">Price (₹)</Field.FieldLabel>
						<Input
							id="plan-price"
							type="number"
							min="0"
							step="0.01"
							bind:value={form.price}
							required
						/>
					</Field.Field>
					<Field.Field>
						<Field.FieldLabel for="plan-period">Billing period</Field.FieldLabel>
						<Select.Root
							type="single"
							value={form.billingPeriod}
							onValueChange={(v) => (form.billingPeriod = v as BillingPeriod)}
						>
							<Select.Trigger id="plan-period" class="w-full">
								{PERIOD_OPTIONS.find((o) => o.value === form.billingPeriod)?.label ??
									'Select period'}
							</Select.Trigger>
							<Select.Content>
								<Select.Group>
									{#each PERIOD_OPTIONS as option (option.value)}
										<Select.Item value={option.value} label={option.label} />
									{/each}
								</Select.Group>
							</Select.Content>
						</Select.Root>
					</Field.Field>
				</div>

				<Field.Field>
					<Field.FieldLabel for="plan-min-qty">Minimum quantity</Field.FieldLabel>
					<Input
						id="plan-min-qty"
						type="number"
						min="0"
						step="1"
						bind:value={form.minQuantity}
						required
					/>
					<Field.FieldDescription
						>Smallest seat count a subscription can start with.</Field.FieldDescription
					>
				</Field.Field>

				<div class="grid grid-cols-2 gap-4">
					<Field.Field>
						<Field.FieldLabel for="plan-from">Valid from</Field.FieldLabel>
						<Input id="plan-from" type="date" bind:value={form.validFrom} required />
					</Field.Field>
					<Field.Field>
						<Field.FieldLabel for="plan-to">Valid to (optional)</Field.FieldLabel>
						<Input id="plan-to" type="date" bind:value={form.validTo} />
					</Field.Field>
				</div>

				<Field.Field orientation="horizontal">
					<Switch id="plan-auto-close" bind:checked={form.autoClose} />
					<div class="flex flex-col">
						<Field.FieldLabel for="plan-auto-close">Auto-close at expiry</Field.FieldLabel>
						<Field.FieldDescription
							>Close subscriptions on their own when the plan ends.</Field.FieldDescription
						>
					</div>
				</Field.Field>

				<Field.Field orientation="horizontal">
					<Switch id="plan-closable" bind:checked={form.closable} />
					<div class="flex flex-col">
						<Field.FieldLabel for="plan-closable">Can be closed early</Field.FieldLabel>
						<Field.FieldDescription
							>Allow closing a subscription before it expires.</Field.FieldDescription
						>
					</div>
				</Field.Field>

				<Field.Field orientation="horizontal">
					<Switch id="plan-pausable" bind:checked={form.pausable} />
					<div class="flex flex-col">
						<Field.FieldLabel for="plan-pausable">Pausable</Field.FieldLabel>
						<Field.FieldDescription>Allow pausing billing temporarily.</Field.FieldDescription>
					</div>
				</Field.Field>

				<Field.Field orientation="horizontal">
					<Switch id="plan-renewable" bind:checked={form.renewable} />
					<div class="flex flex-col">
						<Field.FieldLabel for="plan-renewable">Renewable</Field.FieldLabel>
						<Field.FieldDescription>Allow renewal for another period.</Field.FieldDescription>
					</div>
				</Field.Field>

				<Field.Field orientation="horizontal">
					<Switch id="plan-active" bind:checked={form.active} />
					<Field.FieldLabel for="plan-active">Active (available to sell)</Field.FieldLabel>
				</Field.Field>
			</Field.FieldGroup>

			<Sheet.Footer class="px-0">
				<Button type="submit" disabled={saving}>
					{#if saving}<BarSpinner role="status" aria-label="Saving" />{/if}
					{editing ? 'Save changes' : 'Create plan'}
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
				This permanently deletes the plan. Plans already used by subscriptions or quotation
				templates cannot be deleted — deactivate them instead.
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
