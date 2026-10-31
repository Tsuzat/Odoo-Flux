<script lang="ts">
	import { enhance } from '$app/forms';
	import { resolve } from '$app/paths';
	import EyeIcon from '@lucide/svelte/icons/eye';
	import EyeOffIcon from '@lucide/svelte/icons/eye-off';
	import LockIcon from '@lucide/svelte/icons/lock';
	import { Button } from '#lib/components/ui/button/index.ts';
	import {
		InputGroup,
		InputGroupAddon,
		InputGroupButton,
		InputGroupInput
	} from '#lib/components/ui/input-group/index.ts';
	import { AppLogo, BarSpinner, Particles } from '#lib/components/custom/index.ts';
	import type { PageProps } from './$types';

	let { data, form }: PageProps = $props();

	let alertMessage = $derived(form?.message ?? data.linkError);
	let newPassword = $state('');
	let confirmPassword = $state('');
	let passwordsMatch = $derived(confirmPassword === '' || confirmPassword === newPassword);
	let showPassword = $state(false);
	let pending = $state(false);
</script>

<svelte:head>
	<title>Reset password — Brightloop</title>
</svelte:head>

<main class="flex min-h-svh items-center justify-center px-4 py-10 text-foreground">
	<Particles class="fixed top-0 left-0 -z-10 h-screen w-screen bg-transparent!" />
	<div class="w-full max-w-100">
		<div class="flex flex-col items-center gap-2 text-center">
			<AppLogo class="mb-6" />
			<h1 class="text-4xl font-semibold tracking-tight">Reset password</h1>
			<p class="text-sm text-muted-foreground">Choose a new password for your account.</p>
		</div>

		{#if alertMessage}
			<div
				id="reset-password-alert"
				role="alert"
				class="mt-6 rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive"
			>
				{alertMessage}
			</div>
		{/if}

		<form
			method="post"
			action="?/resetPassword"
			class="mt-8 flex flex-col gap-4"
			use:enhance={() => {
				pending = true;

				return async ({ update }) => {
					try {
						await update();
					} finally {
						pending = false;
					}
				};
			}}
		>
			<input type="hidden" name="token" value={data.token} />

			<div class="flex flex-col gap-2">
				<InputGroup class="h-10">
					<InputGroupInput
						aria-label="New password"
						id="newPassword"
						name="newPassword"
						type={showPassword ? 'text' : 'password'}
						autocomplete="new-password"
						required
						placeholder="Create a new password"
						bind:value={newPassword}
						aria-describedby={alertMessage ? 'reset-password-alert' : undefined}
					/>
					<InputGroupAddon>
						<LockIcon aria-hidden="true" />
					</InputGroupAddon>
					<InputGroupAddon align="inline-end">
						<InputGroupButton
							variant="ghost"
							size="icon-sm"
							aria-label={showPassword ? 'Hide password' : 'Show password'}
							aria-pressed={showPassword}
							onclick={() => (showPassword = !showPassword)}
						>
							{#if showPassword}
								<EyeOffIcon aria-hidden="true" />
							{:else}
								<EyeIcon aria-hidden="true" />
							{/if}
						</InputGroupButton>
					</InputGroupAddon>
				</InputGroup>
				<p class="text-xs text-muted-foreground">Use at least 8 characters.</p>
			</div>

			<div class="flex flex-col gap-2">
				<InputGroup class="h-10">
					<InputGroupInput
						aria-label="Confirm password"
						id="confirmPassword"
						name="confirmPassword"
						type={showPassword ? 'text' : 'password'}
						autocomplete="new-password"
						required
						placeholder="Confirm your new password"
						bind:value={confirmPassword}
						aria-invalid={!passwordsMatch}
						aria-describedby={alertMessage ? 'reset-password-alert' : undefined}
					/>
					<InputGroupAddon>
						<LockIcon aria-hidden="true" />
					</InputGroupAddon>
				</InputGroup>
				{#if !passwordsMatch}
					<p class="text-xs text-destructive">Passwords don't match.</p>
				{/if}
			</div>

			<Button type="submit" class="w-full" disabled={pending || !data.token}>
				{#if pending}
					<BarSpinner role="status" aria-label="Loading" />
				{:else}
					Reset password
				{/if}
			</Button>
		</form>

		{#if !data.token}
			<p class="mt-6 text-center text-sm text-muted-foreground">
				Need a new link?
				<Button href={resolve('/forget-password')} variant="link">Request a new reset link</Button>
			</p>
		{/if}

		<p class="mt-6 text-center text-sm text-muted-foreground">
			Remember your password?
			<Button href={resolve('/signin')} variant="link">Sign in</Button>
		</p>
	</div>
</main>
