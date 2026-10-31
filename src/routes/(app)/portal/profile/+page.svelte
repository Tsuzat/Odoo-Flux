<script lang="ts">
	import {
		changeMyPasswordCommand,
		getMyProfileQuery,
		updateMyProfileCommand
	} from '../data.remote.ts';
	import * as Card from '#lib/components/ui/card/index.ts';
	import * as Field from '#lib/components/ui/field/index.ts';
	import { Badge } from '#lib/components/ui/badge/index.ts';
	import { Button } from '#lib/components/ui/button/index.ts';
	import { Input } from '#lib/components/ui/input/index.ts';
	import { Textarea } from '#lib/components/ui/textarea/index.ts';
	import { Skeleton } from '#lib/components/ui/skeleton/index.ts';
	import { SidebarTrigger } from '#lib/components/ui/sidebar/index.ts';
	import { toast } from 'svelte-sonner';
	import { formatDate } from '#lib/index.ts';
	import { BarSpinner } from '#lib/components/custom/index.ts';

	import TriangleAlertIcon from '@lucide/svelte/icons/triangle-alert';

	const profile = getMyProfileQuery();

	let form = $state({ name: '', company: '', phone: '', address: '' });
	let seededFor = $state<string | null>(null);

	$effect(() => {
		const current = profile.current;
		if (current && seededFor !== current.customer.id) {
			seededFor = current.customer.id;
			form = {
				name: current.customer.name,
				company: current.customer.company ?? '',
				phone: current.customer.phone ?? '',
				address: current.customer.address ?? ''
			};
		}
	});

	let savingProfile = $state(false);
	let passwordForm = $state({ currentPassword: '', newPassword: '', confirmPassword: '' });
	let savingPassword = $state(false);

	async function saveProfile() {
		if (!form.name.trim()) {
			toast.error('Name is required.');
			return;
		}
		savingProfile = true;
		try {
			await updateMyProfileCommand({
				name: form.name.trim(),
				company: form.company.trim() || null,
				phone: form.phone.trim() || null,
				address: form.address.trim() || null
			});
			toast.success('Profile saved.');
		} catch (e) {
			toast.error(e instanceof Error ? e.message : 'Could not save your profile.');
		} finally {
			savingProfile = false;
		}
	}

	async function changePassword() {
		if (passwordForm.newPassword !== passwordForm.confirmPassword) {
			toast.error('New passwords do not match.');
			return;
		}
		savingPassword = true;
		try {
			await changeMyPasswordCommand({
				currentPassword: passwordForm.currentPassword,
				newPassword: passwordForm.newPassword
			});
			toast.success('Password changed. Other sessions have been signed out.');
			passwordForm = { currentPassword: '', newPassword: '', confirmPassword: '' };
		} catch (e) {
			toast.error(e instanceof Error ? e.message : 'Could not change the password.');
		} finally {
			savingPassword = false;
		}
	}
</script>

<svelte:head>
	<title>Profile — Brightloop</title>
</svelte:head>

<div class="flex flex-col gap-6">
	<div class="flex flex-col gap-1">
		<h1 class="text-2xl font-semibold tracking-tight">
			<SidebarTrigger class="mr-4" />
			Profile
		</h1>
		<p class="text-sm text-muted-foreground">Your account and billing details.</p>
	</div>

	{#if profile.error}
		<Card.Root>
			<Card.Header>
				<Card.Title class="flex items-center gap-2 text-destructive">
					<TriangleAlertIcon class="size-5" aria-hidden="true" />
					Couldn't load your profile
				</Card.Title>
				<Card.Description>{profile.error.message ?? 'Something went wrong.'}</Card.Description>
			</Card.Header>
			<Card.Footer>
				<Button variant="outline" onclick={() => profile.refresh()}>Try again</Button>
			</Card.Footer>
		</Card.Root>
	{:else if !profile.current}
		<Skeleton class="h-96" aria-label="Loading profile" />
	{:else}
		{@const p = profile.current}
		<div class="grid items-start gap-6 xl:grid-cols-2">
			<Card.Root>
				<Card.Header>
					<Card.Title>Account</Card.Title>
					<Card.Description>
						Signed in as {p.user.email} · Member since {formatDate(p.customer.createdAt)}
					</Card.Description>
				</Card.Header>
				<Card.Content>
					<form
						class="flex flex-col gap-5"
						onsubmit={(e) => {
							e.preventDefault();
							saveProfile();
						}}
					>
						<Field.FieldGroup>
							<Field.Field>
								<Field.FieldLabel for="profile-name">Name</Field.FieldLabel>
								<Input id="profile-name" bind:value={form.name} required />
							</Field.Field>
							<Field.Field>
								<Field.FieldLabel for="profile-email">Email</Field.FieldLabel>
								<Input id="profile-email" value={p.user.email} disabled />
								<Field.FieldDescription
									>Contact Brightloop support to change your email.</Field.FieldDescription
								>
							</Field.Field>
							<Field.Field>
								<Field.FieldLabel for="profile-company">Company (optional)</Field.FieldLabel>
								<Input id="profile-company" bind:value={form.company} />
							</Field.Field>
							<Field.Field>
								<Field.FieldLabel for="profile-phone">Phone (optional)</Field.FieldLabel>
								<Input id="profile-phone" bind:value={form.phone} />
							</Field.Field>
							<Field.Field>
								<Field.FieldLabel for="profile-address">Address (optional)</Field.FieldLabel>
								<Textarea id="profile-address" bind:value={form.address} />
							</Field.Field>
						</Field.FieldGroup>
						<div>
							<Button type="submit" disabled={savingProfile}>
								{#if savingProfile}<BarSpinner role="status" aria-label="Saving" />{/if}
								Save profile
							</Button>
						</div>
					</form>
				</Card.Content>
			</Card.Root>

			<Card.Root>
				<Card.Header>
					<Card.Title>Change password</Card.Title>
					<Card.Description>
						More than 8 characters, with an uppercase letter, a lowercase letter and a special
						character. Changing it signs out your other sessions.
					</Card.Description>
				</Card.Header>
				<Card.Content>
					<form
						class="flex flex-col gap-5"
						onsubmit={(e) => {
							e.preventDefault();
							changePassword();
						}}
					>
						<Field.FieldGroup>
							<Field.Field>
								<Field.FieldLabel for="pw-current">Current password</Field.FieldLabel>
								<Input
									id="pw-current"
									type="password"
									autocomplete="current-password"
									bind:value={passwordForm.currentPassword}
									required
								/>
							</Field.Field>
							<Field.Field>
								<Field.FieldLabel for="pw-new">New password</Field.FieldLabel>
								<Input
									id="pw-new"
									type="password"
									autocomplete="new-password"
									bind:value={passwordForm.newPassword}
									required
								/>
							</Field.Field>
							<Field.Field>
								<Field.FieldLabel for="pw-confirm">Confirm new password</Field.FieldLabel>
								<Input
									id="pw-confirm"
									type="password"
									autocomplete="new-password"
									bind:value={passwordForm.confirmPassword}
									required
								/>
							</Field.Field>
						</Field.FieldGroup>
						<div>
							<Button type="submit" disabled={savingPassword}>
								{#if savingPassword}<BarSpinner role="status" aria-label="Changing password" />{/if}
								Change password
							</Button>
						</div>
					</form>
				</Card.Content>
			</Card.Root>

			<p class="flex items-center gap-2 text-sm text-muted-foreground xl:col-span-2">
				Account type <Badge variant="secondary">Customer</Badge>
			</p>
		</div>
	{/if}
</div>
