<script lang="ts">
	import { createStaffCommand, getStaff } from '../data.remote.ts';
	import UserManage from '../user-manage.svelte';
	import type { PageProps } from './$types';
	import * as Card from '#lib/components/ui/card/index.ts';
	import * as Table from '#lib/components/ui/table/index.ts';
	import * as Sheet from '#lib/components/ui/sheet/index.ts';
	import * as Field from '#lib/components/ui/field/index.ts';
	import * as Select from '#lib/components/ui/select/index.ts';
	import { Badge } from '#lib/components/ui/badge/index.ts';
	import { Button } from '#lib/components/ui/button/index.ts';
	import { Input } from '#lib/components/ui/input/index.ts';
	import { Skeleton } from '#lib/components/ui/skeleton/index.ts';
	import { SidebarTrigger } from '#lib/components/ui/sidebar/index.ts';
	import { toast } from 'svelte-sonner';
	import { formatDate } from '#lib/index.ts';
	import { BarSpinner } from '#lib/components/custom/index.ts';

	import PlusIcon from '@lucide/svelte/icons/plus';
	import TriangleAlertIcon from '@lucide/svelte/icons/triangle-alert';

	const staff = getStaff();
	const { data }: PageProps = $props();

	let sheetOpen = $state(false);
	let form = $state({ name: '', email: '', password: '', role: 'staff' as 'admin' | 'staff' });
	let saving = $state(false);

	async function create() {
		if (!form.name.trim() || !form.email.trim() || !form.password) {
			toast.error('Name, email and password are required.');
			return;
		}
		saving = true;
		try {
			await createStaffCommand({ ...form, name: form.name.trim(), email: form.email.trim() });
			toast.success('Staff member created.');
			sheetOpen = false;
			form = { name: '', email: '', password: '', role: 'staff' };
		} catch (e) {
			toast.error(e instanceof Error ? e.message : 'Could not create the user.');
		} finally {
			saving = false;
		}
	}
</script>

<svelte:head>
	<title>Staff — Brightloop</title>
</svelte:head>

<div class="flex flex-col gap-6">
	<div class="flex flex-wrap items-start justify-between gap-4">
		<div class="flex flex-col gap-1">
			<h1 class="text-2xl font-semibold tracking-tight">
				<SidebarTrigger class="mr-4" />
				Staff
			</h1>
			<p class="text-sm text-muted-foreground">
				The internal team. Only admins can add staff, change roles, ban or delete users.
			</p>
		</div>
		<Button onclick={() => (sheetOpen = true)}>
			<PlusIcon data-icon="inline-start" />
			Add staff
		</Button>
	</div>

	{#if staff.error}
		<Card.Root>
			<Card.Header>
				<Card.Title class="flex items-center gap-2 text-destructive">
					<TriangleAlertIcon class="size-5" aria-hidden="true" />
					Couldn't load staff
				</Card.Title>
				<Card.Description>{staff.error.message ?? 'Something went wrong.'}</Card.Description>
			</Card.Header>
			<Card.Footer>
				<Button variant="outline" onclick={() => staff.refresh()}>Try again</Button>
			</Card.Footer>
		</Card.Root>
	{:else if !staff.current}
		<Skeleton class="h-96" aria-label="Loading staff" />
	{:else}
		<Card.Root>
			<Card.Content>
				<Table.Root>
					<Table.Header>
						<Table.Row>
							<Table.Head>Name</Table.Head>
							<Table.Head>Email</Table.Head>
							<Table.Head>Role</Table.Head>
							<Table.Head>Status</Table.Head>
							<Table.Head>Joined</Table.Head>
							<Table.Head class="text-right">Manage</Table.Head>
						</Table.Row>
					</Table.Header>
					<Table.Body>
						{#each staff.current as u (u.id)}
							<Table.Row>
								<Table.Cell class="font-medium">{u.name}</Table.Cell>
								<Table.Cell>{u.email}</Table.Cell>
								<Table.Cell>
									<Badge variant={u.role === 'admin' ? 'default' : 'secondary'}>
										{u.role === 'admin' ? 'Admin' : 'Staff'}
									</Badge>
								</Table.Cell>
								<Table.Cell>
									{#if u.banned}
										<Badge variant="destructive">Banned</Badge>
									{:else}
										<Badge variant="outline">Active</Badge>
									{/if}
								</Table.Cell>
								<Table.Cell class="text-muted-foreground">{formatDate(u.createdAt)}</Table.Cell>
								<Table.Cell class="text-right">
									<UserManage
										user={u}
										roles={['admin', 'staff', 'customer']}
										isSelf={u.id === data.user.id}
									/>
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
			<Sheet.Title>Add staff member</Sheet.Title>
			<Sheet.Description>
				Creates a login immediately (no verification email needed). Share the password securely.
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
					<Field.FieldLabel for="staff-name">Name</Field.FieldLabel>
					<Input id="staff-name" bind:value={form.name} placeholder="Priya Sharma" required />
				</Field.Field>
				<Field.Field>
					<Field.FieldLabel for="staff-email">Email</Field.FieldLabel>
					<Input
						id="staff-email"
						type="email"
						bind:value={form.email}
						placeholder="priya@brightloop.software"
						required
					/>
				</Field.Field>
				<Field.Field>
					<Field.FieldLabel for="staff-password">Password</Field.FieldLabel>
					<Input
						id="staff-password"
						type="password"
						minlength={6}
						bind:value={form.password}
						required
					/>
					<Field.FieldDescription>
						More than 8 characters, with an uppercase letter, a lowercase letter and a special
						character.
					</Field.FieldDescription>
				</Field.Field>
				<Field.Field>
					<Field.FieldLabel for="staff-role">Role</Field.FieldLabel>
					<Select.Root
						type="single"
						value={form.role}
						onValueChange={(v) => (form.role = v as 'admin' | 'staff')}
					>
						<Select.Trigger id="staff-role" class="w-full">
							{form.role === 'admin' ? 'Admin' : 'Staff'}
						</Select.Trigger>
						<Select.Content>
							<Select.Group>
								<Select.Item value="staff" label="Staff" />
								<Select.Item value="admin" label="Admin" />
							</Select.Group>
						</Select.Content>
					</Select.Root>
				</Field.Field>
			</Field.FieldGroup>
			<Sheet.Footer class="px-0">
				<Button type="submit" disabled={saving}>
					{#if saving}<BarSpinner role="status" aria-label="Creating" />{/if}
					Create user
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
