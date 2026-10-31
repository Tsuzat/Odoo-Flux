<script lang="ts">
	import { enhance } from '$app/forms';
	import { resolve } from '$app/paths';
	import CheckIcon from '@lucide/svelte/icons/check';
	import EyeIcon from '@lucide/svelte/icons/eye';
	import EyeOffIcon from '@lucide/svelte/icons/eye-off';
	import LockIcon from '@lucide/svelte/icons/lock';
	import MailIcon from '@lucide/svelte/icons/mail';
	import UserIcon from '@lucide/svelte/icons/user';
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

	// Intentionally seeded once from the action result.
	// svelte-ignore state_referenced_locally
	let name = $state(form?.name ?? '');
	// svelte-ignore state_referenced_locally
	let email = $state(form?.email ?? '');
	let password = $state('');
	let passwordRules = $derived([
		{ label: 'More than 8 characters', met: password.length > 8 },
		{ label: 'An uppercase letter', met: /[A-Z]/.test(password) },
		{ label: 'A lowercase letter', met: /[a-z]/.test(password) },
		{ label: 'A special character (e.g. !@#$%)', met: /[^A-Za-z0-9\s]/.test(password) }
	]);
	let passwordValid = $derived(passwordRules.every((r) => r.met));
	let confirmPassword = $state('');
	let passwordsMatch = $derived(confirmPassword === '' || confirmPassword === password);
	let showPassword = $state(false);
	let pending = $state<string | null>(null);
</script>

<svelte:head>
	<title>Create account — Brightloop</title>
</svelte:head>

<main class="flex min-h-svh items-center justify-center px-4 py-10 text-foreground">
	<Particles class="fixed top-0 left-0 -z-10 h-screen w-screen bg-transparent!" />
	<div class="w-full max-w-100">
		<div class="flex flex-col items-center gap-2 text-center">
			<AppLogo class="mb-6" />
			<h1 class="text-4xl font-semibold tracking-tight">Create account</h1>
			<p class="text-sm text-muted-foreground">Create your Brightloop account to get started.</p>
		</div>

		{#if form?.message}
			<div
				id="signup-alert"
				role="alert"
				class="mt-6 rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive"
			>
				{form.message}
			</div>
		{/if}

		{#if form?.notice}
			<div
				id="signup-notice"
				role="status"
				class="border-success/30 bg-success/10 text-success-foreground mt-6 rounded-lg border px-3 py-2 text-sm"
			>
				{form.notice}
			</div>
		{/if}

		<form
			method="post"
			class="mt-8 flex flex-col gap-4"
			use:enhance={({ formData }) => {
				const action = formData.get('provider') ?? formData.get('intent');
				pending = action?.toString() ?? null;

				return async ({ update }) => {
					try {
						await update();
					} finally {
						pending = null;
					}
				};
			}}
		>
			<input type="hidden" name="next" value={data.next} />

			<div class="flex flex-col gap-2">
				<InputGroup class="h-10">
					<InputGroupInput
						aria-label="Name"
						id="name"
						name="name"
						type="text"
						autocomplete="name"
						required
						placeholder="Your name"
						bind:value={name}
						aria-describedby={form?.message ? 'signup-alert' : undefined}
					/>
					<InputGroupAddon>
						<UserIcon aria-hidden="true" />
					</InputGroupAddon>
				</InputGroup>
			</div>

			<div class="flex flex-col gap-2">
				<InputGroup class="h-10">
					<InputGroupInput
						aria-label="Email"
						id="email"
						name="email"
						type="email"
						autocomplete="email"
						required
						placeholder="you@example.com"
						bind:value={email}
						aria-describedby={form?.message ? 'signup-alert' : undefined}
					/>
					<InputGroupAddon>
						<MailIcon aria-hidden="true" />
					</InputGroupAddon>
				</InputGroup>
			</div>

			<div class="flex flex-col gap-2">
				<InputGroup class="h-10">
					<InputGroupInput
						aria-label="Password"
						id="password"
						name="password"
						type={showPassword ? 'text' : 'password'}
						autocomplete="new-password"
						required
						placeholder="Create a password"
						bind:value={password}
						aria-invalid={password.length > 0 && !passwordValid}
						aria-describedby={form?.message ? 'signup-alert' : undefined}
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
				<ul class="flex flex-col gap-1">
					{#each passwordRules as rule (rule.label)}
						<li
							class="flex items-center gap-1.5 text-xs {rule.met
								? 'text-success'
								: 'text-muted-foreground'}"
						>
							{#if rule.met}
								<CheckIcon class="size-3.5" aria-hidden="true" />
							{:else}
								<span class="size-3.5 text-center leading-none">•</span>
							{/if}
							{rule.label}
						</li>
					{/each}
				</ul>
			</div>

			<div class="flex flex-col gap-2">
				<InputGroup class="h-10">
					<InputGroupInput
						aria-label="Confirm password"
						id="confirm-password"
						name="confirmPassword"
						type={showPassword ? 'text' : 'password'}
						autocomplete="new-password"
						required
						placeholder="Confirm your password"
						bind:value={confirmPassword}
						aria-invalid={!passwordsMatch}
						aria-describedby={form?.message ? 'signup-alert' : undefined}
					/>
					<InputGroupAddon>
						<LockIcon aria-hidden="true" />
					</InputGroupAddon>
				</InputGroup>
				{#if !passwordsMatch}
					<p class="text-xs text-destructive">Passwords don't match.</p>
				{/if}
			</div>

			<Button
				type="submit"
				name="intent"
				value="email"
				formaction="?/signUpEmail"
				class="w-full"
				disabled={pending !== null}
			>
				{#if pending === 'email'}
					<BarSpinner role="status" aria-label="Loading" />
				{:else}
					Create account
				{/if}
			</Button>
		</form>

		<p class="mt-6 text-center text-sm text-muted-foreground">
			Already have an account?
			<Button href={resolve('/signin')} variant="link">Sign in</Button>
		</p>
	</div>
</main>
