<script lang="ts">
	import { enhance } from '$app/forms';
	import { resolve } from '$app/paths';
	import EyeIcon from '@lucide/svelte/icons/eye';
	import EyeOffIcon from '@lucide/svelte/icons/eye-off';
	import LockIcon from '@lucide/svelte/icons/lock';
	import MailIcon from '@lucide/svelte/icons/mail';
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
	let email = $state(form?.email ?? '');
	let password = $state('');
	let showPassword = $state(false);
	let pending = $state<string | null>(null);
</script>

<svelte:head>
	<title>Sign in — Brightloop</title>
</svelte:head>

<main class="flex min-h-svh items-center justify-center px-4 py-10 text-foreground">
	<Particles class="fixed top-0 left-0 -z-10 h-screen w-screen bg-transparent!" />
	<div class="w-full max-w-100">
		<div class="flex flex-col items-center gap-2 text-center">
			<AppLogo class="mb-6" />
			<h1 class="text-4xl font-semibold tracking-tight">Sign in</h1>
			<p class="text-sm text-muted-foreground">
				Welcome back. Sign in to your account to continue.
			</p>
		</div>

		{#if form?.message}
			<div
				id="signin-alert"
				role="alert"
				class="mt-6 rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive"
			>
				{form.message}
			</div>
		{/if}

		<form
			method="post"
			class="mt-8 flex flex-col gap-4"
			use:enhance={({ formData }) => {
				pending = formData.get('intent')?.toString() ?? null;

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
						id="email"
						name="email"
						type="email"
						aria-label="Email"
						autocomplete="email"
						required
						placeholder="you@example.com"
						bind:value={email}
						aria-describedby={form?.message ? 'signin-alert' : undefined}
					/>
					<InputGroupAddon>
						<MailIcon aria-hidden="true" />
					</InputGroupAddon>
				</InputGroup>
			</div>

			<div class="flex flex-col gap-2">
				<div class="flex items-center justify-end">
					<a
						href={resolve('/forget-password')}
						class="text-sm font-medium text-primary underline-offset-4 hover:underline"
					>
						Forgot password?
					</a>
				</div>
				<InputGroup class="h-10">
					<InputGroupInput
						id="password"
						name="password"
						type={showPassword ? 'text' : 'password'}
						aria-label="Password"
						autocomplete="current-password"
						required
						placeholder="Enter your password"
						bind:value={password}
						aria-describedby={form?.message ? 'signin-alert' : undefined}
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
			</div>

			<Button
				type="submit"
				name="intent"
				value="email"
				formaction="?/signInEmail"
				class="w-full"
				disabled={pending !== null}
			>
				{#if pending === 'email'}
					<BarSpinner role="status" aria-label="Loading" />
				{:else}
					Continue
				{/if}
			</Button>
		</form>

		<p class="mt-6 text-center text-sm text-muted-foreground">
			New here?
			<Button href={resolve('/signup')} variant="link">Create account</Button>
		</p>
	</div>
</main>
