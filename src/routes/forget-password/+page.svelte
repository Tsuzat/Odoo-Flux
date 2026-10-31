<script lang="ts">
	import { enhance } from '$app/forms';
	import { resolve } from '$app/paths';
	import ArrowLeftIcon from '@lucide/svelte/icons/arrow-left';
	import MailIcon from '@lucide/svelte/icons/mail';
	import { Button } from '#lib/components/ui/button/index.ts';
	import {
		InputGroup,
		InputGroupAddon,
		InputGroupInput
	} from '#lib/components/ui/input-group/index.ts';
	import { AppLogo, BarSpinner, Particles } from '#lib/components/custom/index.ts';
	import type { PageProps } from './$types';

	let { form }: PageProps = $props();

	// Intentionally seeded once from the action result.
	// svelte-ignore state_referenced_locally
	let email = $state(form?.email ?? '');
	let pending = $state(false);
</script>

<svelte:head>
	<title>Forgot password — Brightloop</title>
</svelte:head>

<main class="flex min-h-svh items-center justify-center px-4 py-10 text-foreground">
	<Particles class="fixed top-0 left-0 -z-10 h-screen w-screen bg-transparent!" />
	<div class="w-full max-w-100">
		<div class="flex flex-col items-center gap-2 text-center">
			<AppLogo class="mb-6" />
			<h1 class="text-4xl font-semibold tracking-tight">Forgot password</h1>
			<p class="text-sm text-muted-foreground">
				Enter the email address associated with your account and we'll send you a link to reset your
				password.
			</p>
		</div>

		{#if form?.message}
			<div
				id="forget-password-alert"
				role="alert"
				class="mt-6 rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive"
			>
				{form.message}
			</div>
		{/if}

		{#if form?.notice}
			<div
				id="forget-password-notice"
				role="status"
				class="border-success/30 bg-success/10 text-success-foreground mt-6 rounded-lg border px-3 py-2 text-sm"
			>
				{form.notice}
			</div>
		{/if}

		<form
			method="post"
			action="?/requestPasswordReset"
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
						aria-describedby={form?.message ? 'forget-password-alert' : undefined}
					/>
					<InputGroupAddon>
						<MailIcon aria-hidden="true" />
					</InputGroupAddon>
				</InputGroup>
			</div>

			<Button type="submit" class="w-full" disabled={pending}>
				{#if pending}
					<BarSpinner role="status" aria-label="Loading" />
				{:else}
					Send reset link
				{/if}
			</Button>
		</form>

		<p class="mt-6 text-center">
			<Button href={resolve('/signin')} variant="link">
				<ArrowLeftIcon class="size-4" aria-hidden="true" />
				Back to sign in
			</Button>
		</p>
	</div>
</main>
