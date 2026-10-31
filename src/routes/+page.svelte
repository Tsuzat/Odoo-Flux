<script lang="ts">
	import { resolve } from '$app/paths';
	import { page } from '$app/state';
	import {
		AppLogo,
		MultiStream,
		Particles,
		Spotlight,
		UserAvatar,
		AnimatedThemeToggler,
		BorderBeam
	} from '#lib/components/custom/index.js';

	import { Button, buttonVariants } from '#lib/components/ui/button/index.js';
	import * as DropdownMenu from '#lib/components/ui/dropdown-menu/index.ts';
	import ArrowRight from '@lucide/svelte/icons/arrow-right';
	import CalendarDays from '@lucide/svelte/icons/calendar-days';
	import CreditCard from '@lucide/svelte/icons/credit-card';
	import Layers from '@lucide/svelte/icons/layers';
	import Landmark from '@lucide/svelte/icons/landmark';
	import Store from '@lucide/svelte/icons/store';
	import Building2 from '@lucide/svelte/icons/building-2';
	import ToggleRight from '@lucide/svelte/icons/toggle-right';
	import MenuIcon from '@lucide/svelte/icons/menu';
	import Logout from '@lucide/svelte/icons/log-out';
	import { onMount } from 'svelte';
	import { fade } from 'svelte/transition';
	import { cn } from '#lib/utils.ts';
	import {
		Accordion,
		AccordionContent,
		AccordionItem,
		AccordionTrigger
	} from '#lib/components/ui/accordion/index.js';

	const { data } = $props();
	const { user } = $derived(data);

	let showFirstSection = $state(false);
	let activeSection = $state('');
	let y = $state(0);
	let isScrolled = $derived(y > 20);

	const canonicalUrl = $derived(`${page.url.origin}/`);
	const year = new Date().getFullYear();

	const tabItems = [
		{ url: '#features', title: 'Features' },
		{ url: '#products', title: 'Products' },
		{ url: '#faqs', title: 'FAQs' }
	];

	const features = [
		{
			name: 'One subscription, every tool',
			description:
				'Bring your business software together under one account and one predictable invoice — no separate contracts for every product.',
			icon: CreditCard
		},
		{
			name: 'Monthly or yearly billing',
			description:
				'Pay by the month when cash flow is tight, or move to a yearly plan and save. Switch cycles whenever your business needs change.',
			icon: CalendarDays
		},
		{
			name: 'Add-ons you control',
			description:
				'Turn extra products on when you need them and off when you do not. Your subscription — and your bill — adapts with you.',
			icon: ToggleRight
		},
		{
			name: 'The right variant for the job',
			description:
				'Some products come in different variants, so a small shop and a large company can each choose the fit that works for them.',
			icon: Layers
		}
	];

	const audiences = [
		{
			name: 'Small shops',
			description: 'Start on a monthly plan with the essentials and no long-term contract.',
			icon: Store,
			plan: 'Monthly plans'
		},
		{
			name: 'Growing teams',
			description:
				'Add products and variants as you grow, with the flexibility to mix billing cycles.',
			icon: Building2,
			plan: 'Monthly or yearly'
		},
		{
			name: 'Large companies',
			description:
				'Buy on a yearly contract with custom variants, governance and dedicated support.',
			icon: Landmark,
			plan: 'Yearly contracts'
		}
	];

	const faqItems = [
		{
			id: 'item-1',
			question: 'How does Brightloop billing work?',
			answer:
				'Every product is sold as a subscription. You can pay monthly or yearly, and your invoice is issued at the start of each billing period. Add-ons are billed on the same cycle as your plan.'
		},
		{
			id: 'item-2',
			question: 'Can I switch from monthly to yearly billing?',
			answer:
				'Yes. You can change your billing cycle from your workspace at any time. The remaining balance is prorated and the yearly discount applies from your next invoice.'
		},
		{
			id: 'item-3',
			question: 'How do add-ons work?',
			answer:
				'Add-ons are optional products that sit alongside your subscription. Switch them on when you need them and off when you do not — billing adjusts from the next cycle.'
		},
		{
			id: 'item-4',
			question: 'What are product variants?',
			answer:
				'Some products come in different variants, such as Retail or Services, and Basic or Multi-store. Choose the variant that matches how your business operates; you can change it as you grow.'
		},
		{
			id: 'item-5',
			question: 'Is there a plan for small shops?',
			answer:
				'Yes. Starter is designed for small shops on monthly billing, with the essentials, self-serve add-ons and no long-term contract.'
		},
		{
			id: 'item-6',
			question: 'Do you support large companies?',
			answer:
				'Yes. Enterprise plans are billed yearly and include custom variants, SSO, audit logs, an uptime SLA and a dedicated account manager.'
		},
		{
			id: 'item-7',
			question: 'Can I change plans or cancel?',
			answer:
				'You can upgrade, downgrade or cancel from your workspace. Changes take effect at the end of the current billing period, and upgrades are prorated.'
		},
		{
			id: 'item-8',
			question: 'Do add-ons have their own contracts?',
			answer:
				'No. Add-ons follow your main subscription and are billed on the same cycle. Turn them off whenever you no longer need them.'
		},
		{
			id: 'item-9',
			question: 'What payment methods do you accept?',
			answer:
				'We accept major credit and debit cards, as well as bank transfers for yearly Enterprise contracts.'
		},
		{
			id: 'item-10',
			question: 'Who do I contact for help?',
			answer:
				'Email brightloop@tsuzat.com or use the contact link below. Enterprise customers also get a dedicated account manager.'
		}
	];

	onMount(() => {
		setTimeout(() => {
			showFirstSection = true;
		}, 500);

		// Intersection observer for section visibility (animations)
		const sections = document.querySelectorAll('section:not(#landing)');
		const animationObserver = new IntersectionObserver((entries) => {
			entries.forEach((entry) => {
				if (entry.isIntersecting) {
					entry.target.classList.add('show');
				}
			});
		});
		sections.forEach((section) => {
			section.classList.add('hide');
			animationObserver.observe(section);
		});

		// Intersection observer for active nav item
		const navObserver = new IntersectionObserver(
			(entries) => {
				entries.forEach((entry) => {
					if (entry.isIntersecting) {
						activeSection = entry.target.id;
					}
				});
			},
			{ rootMargin: '-20% 0px -60% 0px' }
		);
		const allSections = document.querySelectorAll('section');
		allSections.forEach((section) => navObserver.observe(section));
	});
</script>

<svelte:window bind:scrollY={y} />
<svelte:head>
	<title>Brightloop Software | Business software on subscription</title>
	<meta
		name="description"
		content="Brightloop Software gives your business the tools it needs on one subscription. Choose monthly or yearly billing, switch add-ons on and off, and pick the product variant that fits."
	/>
	<link rel="canonical" href={canonicalUrl} />

	<!-- Open Graph overrides -->
	<meta property="og:title" content="Brightloop Software — Business software on subscription" />
	<meta
		property="og:description"
		content="One subscription for the business software you need. Monthly or yearly billing, add-ons you control and variants for every size of business."
	/>
	<meta property="og:url" content={canonicalUrl} />

	<!-- X/Twitter overrides -->
	<meta name="twitter:title" content="Brightloop Software — Business software on subscription" />
	<meta
		name="twitter:description"
		content="One subscription for the business software you need. Monthly or yearly billing, add-ons you control and variants for every size of business."
	/>

	<!-- Structured Data (JSON-LD) -->
	<script type="application/ld+json">
		{
			"@context": "https://schema.org",
			"@type": "Organization",
			"name": "Brightloop Software",
			"description": "Brightloop Software sells business software on subscription, with monthly or yearly billing, optional add-ons and product variants for small shops through to large companies.",
			"applicationCategory": "BusinessApplication"
		}
	</script>
</svelte:head>

<Particles class="fixed top-0 left-0 -z-10 h-screen w-screen bg-transparent!" />
<Spotlight />

<header
	class={cn(
		'sticky z-50 mx-auto flex items-center justify-between gap-8 rounded-xl px-2 backdrop-blur-sm transition-all duration-500',
		isScrolled
			? 'max-w-4xl border bg-background/60 p-2 shadow-lg sm:top-2'
			: 'top-0 max-w-6xl bg-background/20 px-2 py-2 sm:px-12'
	)}
>
	<AppLogo showLogo={!isScrolled} />
	<!-- Desktop Navigation -->
	<div class="hidden items-center gap-8 md:flex">
		{#each tabItems as item, idx (idx)}
			<a
				href={item.url}
				rel="external"
				title="Open Nav"
				class="nodefault relative py-1 text-muted-foreground capitalize transition-all duration-500 hover:text-primary {activeSection ===
				item.url.substring(1)
					? 'font-medium text-primary'
					: ''}"
			>
				{item.title}
				{#if activeSection === item.url.substring(1)}
					<div
						transition:fade={{ duration: 300 }}
						class="absolute -bottom-1 left-0 h-0.5 w-full bg-primary"
					></div>
				{/if}
			</a>
		{/each}
	</div>

	<div class="flex items-center gap-2">
		<!-- Mobile Navigation -->
		<div class="md:hidden">
			<DropdownMenu.Root>
				<DropdownMenu.Trigger
					aria-label="Links"
					class={buttonVariants({ variant: 'ghost', size: 'icon' })}
				>
					<MenuIcon />
				</DropdownMenu.Trigger>
				<DropdownMenu.Content class="w-fit" align="end">
					<DropdownMenu.Group>
						{#each tabItems as item, idx (idx)}
							<DropdownMenu.Item>
								{#snippet child({ props })}
									<!-- eslint-disable-next-line svelte/no-navigation-without-resolve -- in-page hash link -->
									<a {...props} href={item.url} class="capitalize">{item.title}</a>
								{/snippet}
							</DropdownMenu.Item>
						{/each}
					</DropdownMenu.Group>
				</DropdownMenu.Content>
			</DropdownMenu.Root>
		</div>
		<AnimatedThemeToggler />
		{#if user}
			<DropdownMenu.Root>
				<DropdownMenu.Trigger>
					{#snippet child({ props })}
						<Button
							{...props}
							variant="ghost"
							size="icon"
							class="rounded-full"
							aria-label="Account"
						>
							<UserAvatar image={user.image} name={user.name} />
						</Button>
					{/snippet}
				</DropdownMenu.Trigger>
				<DropdownMenu.Content class="w-fit" align="end">
					<DropdownMenu.Group>
						<DropdownMenu.Label>{user.name}</DropdownMenu.Label>
						<DropdownMenu.Label class="pt-0 text-xs font-normal text-muted-foreground"
							>{user.email}</DropdownMenu.Label
						>
					</DropdownMenu.Group>
					<DropdownMenu.Separator />
					<DropdownMenu.Group>
						<DropdownMenu.Item variant="destructive" class="nodefault">
							{#snippet child({ props })}
								<a href={resolve('/signout')} {...props}>
									<Logout />
									Sign Out
								</a>
							{/snippet}
						</DropdownMenu.Item>
					</DropdownMenu.Group>
				</DropdownMenu.Content>
			</DropdownMenu.Root>
		{:else}
			<Button class="nodefault" href={resolve('/signin')}>Sign In</Button>
		{/if}
	</div>
</header>

<main class="mx-auto max-w-4xl px-2 text-center sm:px-0">
	<section
		id="landing"
		class="transition-all duration-1000 *:my-8 {showFirstSection
			? 'translate-y-0 opacity-100'
			: 'translate-y-10 opacity-0'}"
	>
		<a
			class="group nodefault relative z-10 mx-auto flex w-fit items-center gap-4 rounded-2xl border bg-primary/30 p-1 pl-4 shadow-md shadow-zinc-950/5 transition-colors duration-300 hover:bg-background dark:border-t-white/5 dark:shadow-zinc-950 dark:hover:border-t-border"
			href="#products"
			title="Explore products"
		>
			<span class="text-sm text-foreground">✨ Monthly or yearly — switch anytime ✨</span>
			<span class="block h-4 w-0.5 border-l bg-muted-foreground dark:border-background"></span>
			<div
				class="size-6 overflow-hidden rounded-full bg-background duration-500 group-hover:bg-primary"
			>
				<div class="flex w-12 -translate-x-1/2 duration-500 ease-in-out group-hover:translate-x-0">
					<span class="flex size-6">
						<ArrowRight class="m-auto size-4 text-foreground!" />
					</span>
					<span class="flex size-6">
						<ArrowRight class="m-auto size-4 text-foreground!" />
					</span>
				</div>
			</div>
		</a>
		<h1 class="text-balance">Business software on one simple subscription</h1>
		<p class="text-balance text-muted-foreground">
			Brightloop Software gives small shops and large companies the tools they need to run their
			business. Choose monthly or yearly billing, switch add-ons on and off, and pick the variant
			that fits — all from one account.
		</p>
		<div class="flex items-center justify-center gap-4">
			<Button class="nodefault" href={resolve('/signup')}>Get started</Button>
			<Button class="nodefault" variant="outline" href="#products">Explore products</Button>
		</div>

		<div
			class="relative mx-auto w-full max-w-3xl rounded-2xl border bg-background/80 p-4 text-left shadow-lg shadow-zinc-950/5 backdrop-blur sm:p-6 dark:shadow-black/30"
		>
			<BorderBeam size={180} borderWidth={2} duration={15} />
			<div class="flex flex-wrap items-center justify-between gap-3 border-b pb-4">
				<div class="flex items-center gap-3">
					<div
						class="flex size-9 items-center justify-center rounded-lg bg-primary text-sm font-bold text-primary-foreground"
						aria-hidden="true"
					>
						B
					</div>
					<div>
						<p class="font-semibold">Brightloop workspace</p>
						<p class="text-xs text-muted-foreground">Acme Retail · 12 seats</p>
					</div>
				</div>
				<span
					class="inline-flex items-center gap-1.5 rounded-full bg-primary/10 px-3 py-1 text-xs font-medium text-primary"
				>
					<CalendarDays class="size-3.5" aria-hidden="true" />
					Yearly billing · save 20%
				</span>
			</div>

			<div class="mt-4 grid gap-3 sm:grid-cols-3">
				<div class="rounded-xl border bg-muted/40 p-3">
					<p class="text-xs text-muted-foreground">Current plan</p>
					<p class="mt-1 text-lg font-semibold">Growth</p>
					<p class="text-xs text-muted-foreground">Renews Jan 1, 2027</p>
				</div>
				<div class="rounded-xl border bg-muted/40 p-3">
					<p class="text-xs text-muted-foreground">Products</p>
					<p class="mt-1 text-lg font-semibold">3 active</p>
					<p class="text-xs text-muted-foreground">Billing · CRM · Inventory</p>
				</div>
				<div class="rounded-xl border bg-muted/40 p-3">
					<p class="text-xs text-muted-foreground">Add-ons</p>
					<p class="mt-1 text-lg font-semibold">2 active</p>
					<p class="text-xs text-muted-foreground">Switch on or off anytime</p>
				</div>
			</div>

			<div class="mt-3 grid gap-3 sm:grid-cols-2">
				<div class="rounded-xl border p-3">
					<div class="flex items-center justify-between gap-3">
						<div class="flex items-center gap-2">
							<Layers class="size-4 text-primary" aria-hidden="true" />
							<span class="text-sm font-medium">Product variant</span>
						</div>
						<span class="rounded-md border bg-muted px-2 py-1 text-xs">Retail · Multi-store</span>
					</div>
				</div>
				<div class="rounded-xl border p-3">
					<div class="flex items-center justify-between gap-3">
						<div class="flex items-center gap-2">
							<ToggleRight class="size-4 text-primary" aria-hidden="true" />
							<span class="text-sm font-medium">Add-ons</span>
						</div>
						<span class="text-xs text-muted-foreground">2 active</span>
					</div>
				</div>
			</div>

			<div
				class="mt-3 flex flex-wrap items-center justify-between gap-2 rounded-xl border border-dashed p-3 text-xs text-muted-foreground"
			>
				<span>3 products · 2 add-ons · 1 variant</span>
				<span>Next invoice · Jan 1</span>
			</div>
		</div>
	</section>

	<section id="features">
		<div class="flex flex-col items-center gap-4">
			<h2 class="text-4xl font-bold">Everything your business needs, on subscription</h2>
			<span class="text-lg text-balance text-muted-foreground"
				>One account, one bill, and the freedom to add what you need when you need it.
			</span>
		</div>
		<dl class="my-20 grid grid-cols-2 gap-10">
			{#each features as item, idx (idx)}
				{@const Icon = item.icon}
				<div class="col-span-full sm:col-span-2 lg:col-span-1">
					<div
						class="mx-auto flex w-fit rounded-lg p-2 shadow-md ring-1 shadow-primary/50 ring-black/5 dark:ring-white/5"
					>
						<Icon aria-hidden="true" class="size-6 text-muted-foreground" />
					</div>
					<dt class="mt-6 text-center font-semibold text-gray-900 dark:text-gray-50">
						{item.name}
					</dt>
					<dd class="mt-2 text-center leading-7 text-gray-600 dark:text-gray-400">
						{item.description}
					</dd>
				</div>
			{/each}
		</dl>
	</section>

	<section id="products">
		<div class="flex flex-col items-center gap-4">
			<h2 class="text-4xl font-bold">Every product, connected</h2>
			<span class="text-lg text-balance text-muted-foreground"
				>Billing, CRM, inventory, analytics and support connect to one Brightloop workspace. Add-ons
				switch on when you need them — and every product comes in the variant that fits your
				business.
			</span>
		</div>
		<div class="relative mx-auto mt-12 w-2xl max-w-full rounded-2xl">
			<BorderBeam />
			<MultiStream class="mx-auto rounded-2xl" />
		</div>
	</section>

	<section id="solutions">
		<div class="flex flex-col items-center gap-4">
			<h2 class="text-4xl font-bold">From the corner shop to the enterprise</h2>
			<span class="text-lg text-balance text-muted-foreground"
				>Plans that fit how you work today — and scale when you grow.
			</span>
		</div>
		<div class="mt-12 grid gap-4 sm:grid-cols-3">
			{#each audiences as audience, idx (idx)}
				{@const Icon = audience.icon}
				<div class="rounded-2xl border bg-background/70 p-6 text-left shadow-sm">
					<div
						class="flex size-10 items-center justify-center rounded-lg bg-primary/10 text-primary"
					>
						<Icon class="size-5" aria-hidden="true" />
					</div>
					<p class="mt-4 font-semibold">{audience.name}</p>
					<p class="mt-1 text-sm leading-6 text-muted-foreground">{audience.description}</p>
					<p class="mt-4 text-xs font-medium text-primary">{audience.plan}</p>
				</div>
			{/each}
		</div>
	</section>

	<section id="faqs" class="my-4">
		<div class="mx-auto px-4 md:px-6">
			<div class="mx-auto max-w-2xl text-center text-balance">
				<h2>Frequently Asked Questions</h2>
				<p class="mt-4 text-balance text-muted-foreground">
					Quick answers about subscriptions, billing cycles, add-ons and product variants.
				</p>
			</div>

			<div class="mx-auto mt-12 max-w-2xl">
				<Accordion
					type="single"
					class="w-full rounded-xl border bg-background px-8 py-3 shadow-sm ring-4 ring-muted dark:ring-0"
				>
					{#each faqItems as item, index (index)}
						<AccordionItem
							value={item.id}
							class={[faqItems.length - 1 !== index ? 'border-dashed' : 'border-none']}
						>
							<AccordionTrigger class="cursor-pointer text-base font-semibold hover:no-underline"
								>{item.question}</AccordionTrigger
							>
							<AccordionContent>
								<p class="text-base">{item.answer}</p>
							</AccordionContent>
						</AccordionItem>
					{/each}
				</Accordion>

				<p class="mt-6 px-4 text-muted-foreground">
					Can't find what you're looking for?
					<a
						href="mailto:brightloop@tsuzat.com"
						title="Contact Us"
						class="font-medium text-primary hover:underline"
					>
						Contact Us
					</a>
				</p>
			</div>
		</div>
	</section>

	<footer class="border-t px-4 py-4 text-center text-sm">
		<p>© {year} Brightloop Software. All rights reserved.</p>
		<div class="mt-2 flex flex-wrap items-center justify-center gap-x-2 gap-y-1">
			<!-- eslint-disable svelte/no-navigation-without-resolve -- routes not built yet -->
			<a href="/terms" title="Open Terms of Use" class="text-primary">Terms of Use</a>
			<span aria-hidden="true">•</span>
			<a href="/privacy" title="Open Privacy Policy" class="text-primary">Privacy Policy</a>
			<!-- eslint-enable svelte/no-navigation-without-resolve -->
			<span aria-hidden="true">•</span>
			<a href="mailto:brightloop@tsuzat.com" title="Contact Us" class="text-primary">Contact Us</a>
		</div>
	</footer>
</main>

<style>
	section {
		padding-top: 5rem;
	}

	:global(section.hide) {
		opacity: 0;
		filter: blur(4px);
		transform: translateY(4rem);
		transition: all 500ms ease-in-out;
		transition-delay: 300ms;
	}

	:global(section.show) {
		opacity: 1;
		filter: blur(0px);
		transform: translateY(0);
	}

	@media (prefers-reduced-motion: reduce) {
		:global(section.hide) {
			transition: none;
		}
	}
</style>
