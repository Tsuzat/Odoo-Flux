<script lang="ts">
	import {
		banUserCommand,
		removeUserCommand,
		setUserRoleCommand,
		unbanUserCommand
	} from './data.remote.ts';
	import * as DropdownMenu from '#lib/components/ui/dropdown-menu/index.ts';
	import * as Sheet from '#lib/components/ui/sheet/index.ts';
	import * as AlertDialog from '#lib/components/ui/alert-dialog/index.ts';
	import * as Field from '#lib/components/ui/field/index.ts';
	import * as Select from '#lib/components/ui/select/index.ts';
	import { Badge } from '#lib/components/ui/badge/index.ts';
	import { Button } from '#lib/components/ui/button/index.ts';
	import { Input } from '#lib/components/ui/input/index.ts';
	import { Textarea } from '#lib/components/ui/textarea/index.ts';
	import { toast } from 'svelte-sonner';
	import { BarSpinner } from '#lib/components/custom/index.ts';
	import type { User } from '#lib/server/db/auth.schema.ts';

	import BanIcon from '@lucide/svelte/icons/ban';
	import EllipsisIcon from '@lucide/svelte/icons/ellipsis';
	import ShieldCheckIcon from '@lucide/svelte/icons/shield-check';
	import Trash2Icon from '@lucide/svelte/icons/trash-2';
	import UserCogIcon from '@lucide/svelte/icons/user-cog';

	interface Props {
		user: User;
		/** Hide role options that don't apply (e.g. staff page keeps admin/staff). */
		roles?: ('admin' | 'staff' | 'customer')[];
		/** The signed-in admin's own row — self-management is never offered. */
		isSelf?: boolean;
	}

	let { user, roles = ['admin', 'staff', 'customer'], isSelf = false }: Props = $props();

	const ROLE_OPTIONS = [
		{ value: 'admin', label: 'Admin' },
		{ value: 'staff', label: 'Staff' },
		{ value: 'customer', label: 'Customer' }
	] as const;

	let sheetOpen = $state(false);
	// Seeded from the row; re-synced whenever the manage sheet opens.
	// svelte-ignore state_referenced_locally
	let selectedRole = $state<string>(user.role ?? 'customer');
	let banReason = $state('');
	let banDays = $state<number | undefined>(undefined);
	let pending = $state<string | null>(null);
	let deleteOpen = $state(false);

	const roleLabel = (r: string | null) =>
		ROLE_OPTIONS.find((o) => o.value === r)?.label ?? 'Customer';

	async function saveRole() {
		if (selectedRole === (user.role ?? 'customer')) {
			toast.info('Role unchanged.');
			return;
		}
		pending = 'role';
		try {
			await setUserRoleCommand({
				userId: user.id,
				role: selectedRole as 'admin' | 'staff' | 'customer'
			});
			toast.success(`${user.name} is now ${roleLabel(selectedRole)}.`);
			sheetOpen = false;
		} catch (e) {
			toast.error(e instanceof Error ? e.message : 'Could not change the role.');
		} finally {
			pending = null;
		}
	}

	async function ban() {
		pending = 'ban';
		try {
			await banUserCommand({
				userId: user.id,
				banReason: banReason.trim(),
				banExpiresInDays: banDays ?? null
			});
			toast.success(`${user.name} has been banned.`);
			sheetOpen = false;
		} catch (e) {
			toast.error(e instanceof Error ? e.message : 'Could not ban the user.');
		} finally {
			pending = null;
		}
	}

	async function unban() {
		pending = 'ban';
		try {
			await unbanUserCommand(user.id);
			toast.success(`${user.name} has been unbanned.`);
			sheetOpen = false;
		} catch (e) {
			toast.error(e instanceof Error ? e.message : 'Could not unban the user.');
		} finally {
			pending = null;
		}
	}

	async function confirmDelete() {
		pending = 'delete';
		try {
			await removeUserCommand(user.id);
			toast.success(`${user.name} has been deleted.`);
			deleteOpen = false;
			sheetOpen = false;
		} catch (e) {
			toast.error(e instanceof Error ? e.message : 'Could not delete the user.');
		} finally {
			pending = null;
		}
	}
</script>

{#if isSelf}
	<Badge variant="outline">You</Badge>
{:else}
	<DropdownMenu.Root>
		<DropdownMenu.Trigger>
			{#snippet child({ props })}
				<Button {...props} variant="ghost" size="icon" aria-label="Manage user">
					<EllipsisIcon />
				</Button>
			{/snippet}
		</DropdownMenu.Trigger>
		<DropdownMenu.Content align="end">
			<DropdownMenu.Group>
				<DropdownMenu.Item
					onclick={() => {
						selectedRole = user.role ?? 'customer';
						banReason = user.banReason ?? '';
						sheetOpen = true;
					}}
				>
					<UserCogIcon />
					Manage user
				</DropdownMenu.Item>
				{#if user.banned}
					<DropdownMenu.Item onclick={unban}>
						<ShieldCheckIcon />
						Unban
					</DropdownMenu.Item>
				{/if}
				<DropdownMenu.Separator />
				<DropdownMenu.Item variant="destructive" onclick={() => (deleteOpen = true)}>
					<Trash2Icon />
					Delete user
				</DropdownMenu.Item>
			</DropdownMenu.Group>
		</DropdownMenu.Content>
	</DropdownMenu.Root>

	<Sheet.Root bind:open={sheetOpen}>
		<Sheet.Content class="overflow-y-auto sm:max-w-md">
			<Sheet.Header>
				<Sheet.Title>Manage user</Sheet.Title>
				<Sheet.Description>
					{user.name} · {user.email}
				</Sheet.Description>
			</Sheet.Header>

			<div class="flex flex-col gap-6 px-4 pb-6">
				<div class="flex flex-wrap items-center gap-2">
					<Badge variant="secondary">{roleLabel(user.role)}</Badge>
					{#if user.banned}
						<Badge variant="destructive">Banned</Badge>
						{#if user.banReason}
							<span class="text-xs text-muted-foreground">Reason: {user.banReason}</span>
						{/if}
					{:else}
						<Badge variant="default">Active</Badge>
					{/if}
				</div>

				<Field.FieldGroup>
					<Field.Field>
						<Field.FieldLabel for="manage-role">Role</Field.FieldLabel>
						<Select.Root
							type="single"
							value={selectedRole}
							onValueChange={(v) => (selectedRole = v)}
						>
							<Select.Trigger id="manage-role" class="w-full">
								{roleLabel(selectedRole)}
							</Select.Trigger>
							<Select.Content>
								<Select.Group>
									{#each ROLE_OPTIONS.filter( (o) => roles.includes(o.value) ) as option (option.value)}
										<Select.Item value={option.value} label={option.label} />
									{/each}
								</Select.Group>
							</Select.Content>
						</Select.Root>
						<Field.FieldDescription>
							Admins control everything, staff handle day-to-day work, customers only see their own
							portal.
						</Field.FieldDescription>
					</Field.Field>
				</Field.FieldGroup>
				<Button onclick={saveRole} disabled={pending !== null}>
					{#if pending === 'role'}<BarSpinner role="status" aria-label="Saving role" />{/if}
					Save role
				</Button>

				<div class="flex flex-col gap-3 border-t pt-4">
					<h3 class="flex items-center gap-2 font-semibold">
						<BanIcon class="size-4" aria-hidden="true" />
						{user.banned ? 'Lift the ban' : 'Ban this user'}
					</h3>
					{#if user.banned}
						<p class="text-sm text-muted-foreground">
							This user cannot sign in. Unbanning restores access immediately.
						</p>
						<Button variant="outline" onclick={unban} disabled={pending !== null}>
							{#if pending === 'ban'}<BarSpinner role="status" aria-label="Unbanning" />{/if}
							Unban user
						</Button>
					{:else}
						<Field.FieldGroup>
							<Field.Field>
								<Field.FieldLabel for="ban-reason">Reason</Field.FieldLabel>
								<Textarea
									id="ban-reason"
									bind:value={banReason}
									placeholder="Why is this user being banned?"
								/>
							</Field.Field>
							<Field.Field>
								<Field.FieldLabel for="ban-days">Ban duration (days, optional)</Field.FieldLabel>
								<Input
									id="ban-days"
									type="number"
									min="1"
									step="1"
									bind:value={banDays}
									placeholder="Permanent"
								/>
								<Field.FieldDescription>Leave empty for a permanent ban.</Field.FieldDescription>
							</Field.Field>
						</Field.FieldGroup>
						<Button variant="destructive" onclick={ban} disabled={pending !== null}>
							{#if pending === 'ban'}<BarSpinner role="status" aria-label="Banning" />{/if}
							Ban user
						</Button>
					{/if}
				</div>

				<div class="flex flex-col gap-3 border-t pt-4">
					<h3 class="font-semibold text-destructive">Danger zone</h3>
					<p class="text-sm text-muted-foreground">
						Deleting removes the login permanently
						{#if (user.role ?? 'customer') === 'customer'}along with their customer record{/if}.
						This cannot be undone.
					</p>
					<Button variant="destructive" onclick={() => (deleteOpen = true)}>
						<Trash2Icon data-icon="inline-start" />
						Delete user
					</Button>
				</div>
			</div>
		</Sheet.Content>
	</Sheet.Root>

	<AlertDialog.Root bind:open={deleteOpen}>
		<AlertDialog.Content>
			<AlertDialog.Header>
				<AlertDialog.Title>Delete “{user.name}”?</AlertDialog.Title>
				<AlertDialog.Description>
					This permanently deletes the user ({user.email}) and revokes all access. This cannot be
					undone.
				</AlertDialog.Description>
			</AlertDialog.Header>
			<AlertDialog.Footer>
				<AlertDialog.Cancel>Cancel</AlertDialog.Cancel>
				<AlertDialog.Action
					class="bg-destructive text-white hover:bg-destructive/90"
					disabled={pending === 'delete'}
					onclick={confirmDelete}
				>
					{#if pending === 'delete'}<BarSpinner role="status" aria-label="Deleting" />{/if}
					Delete user
				</AlertDialog.Action>
			</AlertDialog.Footer>
		</AlertDialog.Content>
	</AlertDialog.Root>
{/if}
