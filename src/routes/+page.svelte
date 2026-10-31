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
	import CalendarClock from '@lucide/svelte/icons/calendar-clock';
	import ChartColumn from '@lucide/svelte/icons/chart-column';
	import Check from '@lucide/svelte/icons/check';
	import CirclePlay from '@lucide/svelte/icons/circle-play';
	import IndianRupee from '@lucide/svelte/icons/indian-rupee';
	import Layers from '@lucide/svelte/icons/layers';
	import Landmark from '@lucide/svelte/icons/landmark';
	import NotebookText from '@lucide/svelte/icons/notebook-text';
	import Package from '@lucide/svelte/icons/package';
	import ReceiptText from '@lucide/svelte/icons/receipt-text';
	import Repeat from '@lucide/svelte/icons/repeat';
	import ShieldCheck from '@lucide/svelte/icons/shield-check';
	import Store from '@lucide/svelte/icons/store';
	import Building2 from '@lucide/svelte/icons/building-2';
	import CircleUserRound from '@lucide/svelte/icons/circle-user-round';
	import Users from '@lucide/svelte/icons/users';
	import Wallet from '@lucide/svelte/icons/wallet';
	import MenuIcon from '@lucide/svelte/icons/menu';
	import LayoutDashboard from '@lucide/svelte/icons/layout-dashboard';
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

	/** Where "Open Dashboard" sends each role. */
	const dashboardRoute = $derived.by((): '/(app)/admin' | '/(app)/staff' | '/(app)/portal' => {
		if (user?.role === 'admin') return '/(app)/admin';
		if (user?.role === 'staff') return '/(app)/staff';
		return '/(app)/portal';
	});

	const tabItems = [
		{ url: '#features', title: 'Features' },
		{ url: '#workflow', title: 'Workflow' },
		{ url: '#products', title: 'Products' },
		{ url: '#solutions', title: 'Solutions' },
		{ url: '#roles', title: 'Roles' },
		{ url: '#faqs', title: 'FAQs' }
	];

	/* Illustrative workspace figures — representative demo data, not live customer metrics. */
	const heroMetrics = [
		{
			id: 'active-subscriptions',
			label: 'Active subscriptions',
			value: '128',
			detail: '142 total · 6 paused',
			icon: Repeat
		},
		{
			id: 'mrr',
			label: 'Monthly recurring revenue',
			value: '₹2,84,500',
			detail: 'From active subscription lines',
			icon: IndianRupee
		},
		{
			id: 'revenue-collected',
			label: 'Revenue collected',
			value: '₹2,31,750',
			detail: '96 payments recorded',
			icon: Wallet
		},
		{
			id: 'outstanding',
			label: 'Outstanding',
			value: '₹38,240',
			detail: '6 open invoices · 1 overdue',
			icon: ReceiptText
		}
	];

	const invoicePipeline = [
		{ id: 'draft', label: 'Draft', count: '5', detail: 'Generated, awaiting review' },
		{ id: 'confirmed', label: 'Confirmed', count: '8', detail: 'Sent, awaiting payment' },
		{ id: 'paid', label: 'Paid', count: '132', detail: 'Settled to date' }
	];

	const upcomingRenewals = [
		{
			id: 'sub-0214',
			label: 'SUB-0214 · Acme Retail',
			detail: 'Growth · Monthly',
			date: '1 Feb'
		},
		{
			id: 'sub-0219',
			label: 'SUB-0219 · Northwind Studio',
			detail: 'Starter · Monthly',
			date: '3 Feb'
		}
	];

	const recentInvoices = [
		{
			id: 'inv-1048',
			number: 'INV-1048',
			detail: 'Acme Retail · SUB-0214',
			status: 'Paid',
			amount: '₹18,400',
			statusClass: 'bg-primary/10 text-primary'
		},
		{
			id: 'inv-1049',
			number: 'INV-1049',
			detail: 'Northwind Studio · SUB-0219',
			status: 'Confirmed',
			amount: '₹9,850',
			statusClass: 'bg-secondary text-secondary-foreground'
		},
		{
			id: 'inv-1050',
			number: 'INV-1050',
			detail: 'Kite & Co · SUB-0221',
			status: 'Draft',
			amount: '₹12,300',
			statusClass: 'border bg-background text-muted-foreground'
		}
	];

	const features = [
		{
			id: 'catalog-plans',
			name: 'Catalog, variants & plans',
			description:
				'Set up products, services and add-ons with attribute variants and per-variant pricing, then package them into plans with a price, billing period, validity window and minimum quantity.',
			icon: Package
		},
		{
			id: 'quotes-lifecycle',
			name: 'Quotations & lifecycle controls',
			description:
				'Start subscriptions from quotation templates that prefill the plan and lines, then move through draft, quotation, confirmed and active — with pause, resume, renew and close governed by the plan.',
			icon: NotebookText
		},
		{
			id: 'automated-billing',
			name: 'Automated recurring billing',
			description:
				'Run billing for every due subscription in one go. Taxes and discounts apply automatically, missed periods are caught up, already-billed periods are skipped, and invoices start as drafts for review.',
			icon: CirclePlay
		},
		{
			id: 'payments-portal',
			name: 'Payments, reporting & self-service',
			description:
				'Track confirmed, paid and overdue invoices, record payments, and see MRR, revenue collected and outstanding at a glance — while customers view, pay and download their own invoices in the portal.',
			icon: ChartColumn
		}
	];

	const workflowSteps = [
		{
			id: 'catalog',
			step: '01',
			name: 'Catalog',
			description:
				'Add the products, services and add-ons you sell, with variants and per-variant extra pricing.',
			icon: Package
		},
		{
			id: 'plan',
			step: '02',
			name: 'Plan',
			description:
				'Set the price and daily, weekly, monthly or yearly billing period, plus validity, minimum quantity and whether the plan can pause, close early, renew or auto-close.',
			icon: Layers
		},
		{
			id: 'quote',
			step: '03',
			name: 'Quote',
			description:
				'Start from a quotation template that prefills the plan and lines, adjust quantities and taxes, then send the quotation to the customer.',
			icon: NotebookText
		},
		{
			id: 'subscription',
			step: '04',
			name: 'Subscription',
			description:
				'Confirm and activate the subscription, add or remove lines, and pause, resume, renew or close it when the plan allows.',
			icon: Repeat
		},
		{
			id: 'billing',
			step: '05',
			name: 'Billing',
			description:
				'Run billing for due subscriptions. Draft invoices are generated with taxes and discounts applied, missed periods caught up and billed periods never duplicated.',
			icon: ReceiptText
		},
		{
			id: 'get-paid-report',
			step: '06',
			name: 'Get paid & report',
			description:
				'Confirm and send invoices, let customers pay in the portal, record payments, chase overdue balances and watch MRR, collected revenue and outstanding update.',
			icon: Wallet
		}
	];

	const roles = [
		{
			id: 'admin',
			name: 'Admin',
			description: 'Owns the workspace setup, the catalog and the money view.',
			icon: ShieldCheck,
			capabilities: [
				'Configure products, variants, plans, taxes, discounts and quotation templates',
				'Manage staff accounts and run billing for due subscriptions',
				'See MRR, revenue collected, outstanding, overdue invoices and upcoming renewals'
			],
			boundary: 'Full access — catalog setup, staff management and billing runs included.'
		},
		{
			id: 'staff',
			name: 'Internal Staff',
			description: 'Runs the day-to-day subscription operation for customers.',
			icon: Users,
			capabilities: [
				'Work with customers, subscriptions and quotation templates',
				'Confirm and send invoices, record payments and follow up overdue balances',
				'Pause, resume, renew or close subscriptions within plan rules'
			],
			boundary:
				'Operations only — no catalog pricing, tax or discount setup, staff management or billing runs.'
		},
		{
			id: 'customer',
			name: 'Customer Portal',
			description: 'A self-service account for each customer — no emails back and forth.',
			icon: CircleUserRound,
			capabilities: [
				'See their own subscriptions, invoices, payment history and next billing date',
				'Pay confirmed invoices and download invoice and receipt PDFs',
				'Toggle add-ons and pause, resume, renew or close when the plan allows'
			],
			boundary: 'Own account only — no other customers, internal records or workspace settings.'
		}
	];

	const audiences = [
		{
			id: 'small-shops',
			name: 'Small shops',
			description:
				'Start with a small catalog and a monthly plan, then let customers manage add-ons and pay invoices themselves in the portal.',
			icon: Store,
			plan: 'Monthly plans · Portal self-service'
		},
		{
			id: 'growing-teams',
			name: 'Growing teams',
			description:
				'Add products, variants and quotation templates as the offer grows, and let staff run subscriptions, invoices and payments day to day.',
			icon: Building2,
			plan: 'Daily to yearly cycles · Staff operations'
		},
		{
			id: 'large-companies',
			name: 'Large companies',
			description:
				'Run many customers on yearly plans with lifecycle controls, role-based access and revenue, outstanding and renewal reporting for admins.',
			icon: Landmark,
			plan: 'Yearly plans · Admin controls & reporting'
		}
	];

	const faqItems = [
		{
			id: 'item-1',
			question: 'How does recurring billing work in Brightloop?',
			answer:
				'An admin runs billing for every active subscription that is due. Brightloop generates a draft invoice for each due period, applies taxes and discounts automatically, and skips periods that were already billed — so nothing is ever invoiced twice. Invoices are then reviewed, confirmed and sent.'
		},
		{
			id: 'item-2',
			question: 'What billing periods are supported?',
			answer:
				'Plans can bill daily, weekly, monthly or yearly. The plan sets the price, billing period, validity window and minimum quantity, and each subscription tracks its own next billing date and expiry.'
		},
		{
			id: 'item-3',
			question: 'How do taxes and discounts apply?',
			answer:
				'Tax rates and discounts are configured once by an admin. When an invoice is generated, line taxes and discounts are calculated automatically and shown on the invoice, in the customer portal and on the downloadable PDF.'
		},
		{
			id: 'item-4',
			question: 'How do quotation templates work?',
			answer:
				'A quotation template prefills the plan and subscription lines. Staff or admins start a subscription from a template, adjust quantities, products, variants and taxes, then send the quotation before confirming and activating it.'
		},
		{
			id: 'item-5',
			question: 'What lifecycle controls do subscriptions have?',
			answer:
				'Subscriptions move from draft to quotation, confirmed and active. Depending on the plan, they can be paused, resumed, renewed or closed early, or auto-closed at expiry — and lines can be added or removed for the next invoice.'
		},
		{
			id: 'item-6',
			question: 'What can customers do in the portal?',
			answer:
				'Customers see only their own subscriptions, invoices and payment history. They can pay confirmed invoices in the portal, download invoice and receipt PDFs, toggle add-ons, and pause, resume, renew or close a subscription when its plan allows.'
		},
		{
			id: 'item-7',
			question: 'What can each role see and do?',
			answer:
				'Admins configure the catalog, taxes, discounts, plans and staff accounts and can run billing. Internal staff handle customers, subscriptions, invoices and payments day to day. Customers only ever see their own account in the portal.'
		},
		{
			id: 'item-8',
			question: 'What are product variants and add-ons?',
			answer:
				'Variants are attribute-and-value options on a product — for example a size or edition — each with its own extra price per unit. Add-ons are optional products customers can switch on or off from the portal; changes apply from the next invoice.'
		},
		{
			id: 'item-9',
			question: 'How are payments and overdue invoices tracked?',
			answer:
				'Payments are recorded against confirmed invoices, and dashboards show revenue collected, outstanding amounts and overdue invoices. Missed billing periods are caught up on the next run, and overdue reminders can be sent on a weekly cadence.'
		},
		{
			id: 'item-10',
			question: 'Who do I contact for help?',
			answer:
				'Email brightloop@tsuzat.com or use the contact link below, and the Brightloop team will get back to you.'
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
	<title>Brightloop Software | Subscription Management, Recurring Billing & Revenue Reporting</title
	>
	<meta
		name="description"
		content="Brightloop is a subscription-management platform for products, plans and quotations — with recurring billing, invoices, payments, automatic taxes and discounts, outstanding tracking and revenue reporting in one workspace."
	/>
	<link rel="canonical" href={canonicalUrl} />

	<!-- Open Graph overrides -->
	<meta property="og:type" content="website" />
	<meta
		property="og:title"
		content="Brightloop Software — Subscription Management & Recurring Billing"
	/>
	<meta
		property="og:description"
		content="Run products, plans, quotations and subscriptions in one system — with recurring billing, invoices, payments, discounts, taxes and revenue reporting."
	/>
	<meta property="og:url" content={canonicalUrl} />

	<!-- X/Twitter overrides -->
	<meta name="twitter:card" content="summary" />
	<meta
		name="twitter:title"
		content="Brightloop Software — Subscription Management & Recurring Billing"
	/>
	<meta
		name="twitter:description"
		content="Recurring billing, invoices, payments and revenue reporting for subscription businesses — catalog, plans, quotes and customer self-service included."
	/>

	<!-- Structured Data (JSON-LD) -->
	<script type="application/ld+json">
		{
			"@context": "https://schema.org",
			"@type": "SoftwareApplication",
			"name": "Brightloop Software",
			"applicationCategory": "BusinessApplication",
			"operatingSystem": "Web",
			"description": "Subscription-management platform for products, plans and quotations, with recurring billing, invoices, payments, automatic taxes and discounts, outstanding tracking and revenue reporting.",
			"featureList": [
				"Product catalog with variants",
				"Subscription plans and lifecycle controls",
				"Quotation templates",
				"Automated recurring billing with automatic taxes and discounts",
				"Invoice and payment tracking",
				"Revenue and outstanding reporting",
				"Customer self-service portal"
			]
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
	<div class="hidden items-center gap-5 lg:flex lg:gap-7">
		{#each tabItems as item (item.url)}
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
		<div class="lg:hidden">
			<DropdownMenu.Root>
				<DropdownMenu.Trigger
					aria-label="Links"
					class={buttonVariants({ variant: 'ghost', size: 'icon' })}
				>
					<MenuIcon />
				</DropdownMenu.Trigger>
				<DropdownMenu.Content class="w-fit" align="end">
					<DropdownMenu.Group>
						{#each tabItems as item (item.url)}
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
						<DropdownMenu.Item class="nodefault">
							{#snippet child({ props })}
								<a href={resolve(dashboardRoute)} {...props}>
									<LayoutDashboard />
									Open Dashboard
								</a>
							{/snippet}
						</DropdownMenu.Item>
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
			href="#workflow"
			title="See how it works"
		>
			<span class="text-sm text-foreground">✨ From catalog to cash — in one system ✨</span>
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
		<h1 class="text-balance">Run subscriptions, recurring billing and revenue in one place</h1>
		<p class="mx-auto max-w-2xl text-balance text-muted-foreground">
			Brightloop brings your products and plans, quotations, subscriptions, recurring billing,
			invoices, payments, discounts, taxes and revenue reporting into one system — so a quote
			becomes a subscription, a subscription becomes an invoice, and an invoice becomes paid revenue
			without spreadsheet work in between.
		</p>
		<div class="flex flex-wrap items-center justify-center gap-4">
			{#if user}
				<Button class="nodefault" href={resolve(dashboardRoute)}>Open Dashboard</Button>
			{:else}
				<Button class="nodefault" href={resolve('/signup')}>Get Started</Button>
			{/if}
			<Button class="nodefault" variant="outline" href="#workflow">See how it works</Button>
		</div>

		<div
			class="relative mx-auto w-full max-w-3xl overflow-hidden rounded-2xl border bg-background/80 p-4 text-left shadow-lg shadow-zinc-950/5 backdrop-blur sm:p-6 dark:shadow-black/30"
		>
			<BorderBeam size={180} borderWidth={2} duration={15} />
			<div class="flex flex-wrap items-center justify-between gap-3 border-b pb-4">
				<div class="flex min-w-0 items-center gap-3">
					<div
						class="flex size-9 shrink-0 items-center justify-center rounded-lg bg-primary text-sm font-bold text-primary-foreground"
						aria-hidden="true"
					>
						B
					</div>
					<div class="min-w-0">
						<p class="font-semibold">Brightloop workspace</p>
						<p class="text-xs text-muted-foreground">Admin overview · Illustrative demo data</p>
					</div>
				</div>
				<div class="flex flex-wrap items-center gap-2">
					<span
						class="inline-flex items-center gap-1.5 rounded-full bg-primary/10 px-3 py-1 text-xs font-medium text-primary"
					>
						<span class="size-1.5 rounded-full bg-primary" aria-hidden="true"></span>
						Billing status: Up to date
					</span>
					<span
						class="inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs text-muted-foreground"
					>
						<CalendarClock class="size-3.5" aria-hidden="true" />
						Next run · 1 Feb
					</span>
				</div>
			</div>

			<div class="mt-4 grid grid-cols-1 gap-3 min-[420px]:grid-cols-2 lg:grid-cols-4">
				{#each heroMetrics as metric (metric.id)}
					{@const MetricIcon = metric.icon}
					<div class="rounded-lg bg-muted/40 p-3">
						<div class="flex items-center justify-between gap-2">
							<p class="text-xs text-muted-foreground">{metric.label}</p>
							<MetricIcon class="size-4 shrink-0 text-muted-foreground" aria-hidden="true" />
						</div>
						<p class="mt-1 text-xl font-semibold tracking-tight">{metric.value}</p>
						<p class="mt-0.5 text-xs text-muted-foreground">{metric.detail}</p>
					</div>
				{/each}
			</div>

			<div class="mt-5 border-t pt-4">
				<div class="flex flex-wrap items-center justify-between gap-2">
					<p class="text-sm font-medium">Invoice pipeline</p>
					<p class="text-xs text-muted-foreground">Draft → Confirmed → Paid</p>
				</div>
				<ol class="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-3">
					{#each invoicePipeline as stage, index (stage.id)}
						<li class="relative rounded-lg bg-muted/40 px-3 py-2.5">
							<div class="flex items-center justify-between gap-2">
								<span class="text-sm font-medium">{stage.label}</span>
								<span class="text-sm font-semibold">{stage.count}</span>
							</div>
							<p class="mt-0.5 text-xs text-muted-foreground">{stage.detail}</p>
							{#if index < invoicePipeline.length - 1}
								<ArrowRight
									class="absolute top-1/2 -right-2 z-10 hidden size-4 -translate-y-1/2 text-muted-foreground sm:block"
									aria-hidden="true"
								/>
							{/if}
						</li>
					{/each}
				</ol>
			</div>

			<div class="mt-5 grid gap-5 border-t pt-4 md:grid-cols-2">
				<div>
					<p class="flex items-center gap-2 text-sm font-medium">
						<CalendarClock class="size-4 text-primary" aria-hidden="true" />
						Next billing run & renewals
					</p>
					<p class="mt-2 text-sm">
						1 Feb · 18 subscriptions due
						<span class="block text-xs text-muted-foreground">
							Estimated ₹62,400 before tax and discounts · missed periods caught up automatically
						</span>
					</p>
					<ul class="mt-3 space-y-2">
						{#each upcomingRenewals as renewal (renewal.id)}
							<li class="flex items-start justify-between gap-3 text-sm">
								<span class="min-w-0">
									<span class="block truncate font-medium">{renewal.label}</span>
									<span class="block text-xs text-muted-foreground">{renewal.detail}</span>
								</span>
								<span class="shrink-0 text-xs text-muted-foreground">{renewal.date}</span>
							</li>
						{/each}
					</ul>
				</div>

				<div>
					<p class="flex items-center gap-2 text-sm font-medium">
						<ReceiptText class="size-4 text-primary" aria-hidden="true" />
						Recent invoices
					</p>
					<ul class="mt-3 space-y-2">
						{#each recentInvoices as invoice (invoice.id)}
							<li class="flex items-center justify-between gap-3 text-sm">
								<span class="min-w-0">
									<span class="block truncate font-medium">{invoice.number}</span>
									<span class="block truncate text-xs text-muted-foreground">
										{invoice.detail}
									</span>
								</span>
								<span class="flex shrink-0 items-center gap-2">
									<span
										class="inline-flex rounded-full px-2 py-0.5 text-xs font-medium {invoice.statusClass}"
									>
										{invoice.status}
									</span>
									<span class="font-medium">{invoice.amount}</span>
								</span>
							</li>
						{/each}
					</ul>
				</div>
			</div>

			<p class="mt-4 border-t pt-3 text-xs text-muted-foreground">
				Representative preview of the admin dashboard — figures are illustrative, not live customer
				data.
			</p>
		</div>
	</section>

	<section id="features">
		<div class="flex flex-col items-center gap-4">
			<h2 class="text-4xl font-bold">Subscription management without the spreadsheet chase</h2>
			<p class="text-lg text-balance text-muted-foreground">
				Everything you sell, bill and collect — set up once, then run from one workspace instead of
				scattered tools and manual follow-ups.
			</p>
		</div>
		<div class="my-16 grid grid-cols-1 gap-x-10 gap-y-12 sm:grid-cols-2">
			{#each features as item (item.id)}
				{@const Icon = item.icon}
				<div>
					<div
						class="mx-auto flex w-fit rounded-lg p-2 shadow-md ring-1 shadow-primary/50 ring-black/5 dark:ring-white/5"
					>
						<Icon aria-hidden="true" class="size-6 text-muted-foreground" />
					</div>
					<h3 class="mt-6 text-center text-lg font-semibold">{item.name}</h3>
					<p class="mt-2 text-center leading-7 text-muted-foreground">
						{item.description}
					</p>
				</div>
			{/each}
		</div>
	</section>

	<section id="workflow">
		<div class="flex flex-col items-center gap-4">
			<h2 class="text-4xl font-bold">From catalog to cash in six steps</h2>
			<p class="text-lg text-balance text-muted-foreground">
				The same path every subscription follows in Brightloop — no re-typing between quoting,
				billing and getting paid.
			</p>
		</div>
		<ol class="mt-12 grid list-none grid-cols-1 gap-4 p-0 text-left sm:grid-cols-2 lg:grid-cols-3">
			{#each workflowSteps as step (step.id)}
				{@const StepIcon = step.icon}
				<li class="rounded-2xl border bg-background/70 p-5 shadow-sm">
					<div class="flex items-start justify-between gap-3">
						<div
							class="flex size-10 items-center justify-center rounded-lg bg-primary/10 text-primary"
						>
							<StepIcon class="size-5" aria-hidden="true" />
						</div>
						<span class="text-sm font-semibold text-muted-foreground" aria-hidden="true">
							{step.step}
						</span>
					</div>
					<h3 class="mt-4 text-base font-semibold">
						<span class="sr-only">Step {step.step}: </span>{step.name}
					</h3>
					<p class="mt-1.5 text-sm leading-6 text-muted-foreground">{step.description}</p>
				</li>
			{/each}
		</ol>
	</section>

	<section id="products">
		<div class="flex flex-col items-center gap-4">
			<h2 class="text-4xl font-bold">One catalog behind every quote, subscription and invoice</h2>
			<p class="text-lg text-balance text-muted-foreground">
				Products, services and add-ons — with variants and per-variant pricing — flow into plans and
				quotation templates, then into subscriptions and invoices. Change the catalog once and the
				next quote, subscription and billing run pick it up.
			</p>
		</div>
		<div class="relative mx-auto mt-12 w-2xl max-w-full overflow-hidden rounded-2xl">
			<BorderBeam />
			<MultiStream class="mx-auto rounded-2xl" />
		</div>
	</section>

	<section id="solutions">
		<div class="flex flex-col items-center gap-4">
			<h2 class="text-4xl font-bold">From the corner shop to the enterprise</h2>
			<p class="text-lg text-balance text-muted-foreground">
				Whether you bill a handful of customers or thousands, the same catalog, plans and billing
				run scale with you — customers help themselves in the portal as you grow.
			</p>
		</div>
		<div class="mt-12 grid grid-cols-1 gap-4 sm:grid-cols-3">
			{#each audiences as audience (audience.id)}
				{@const Icon = audience.icon}
				<div class="rounded-2xl border bg-background/70 p-6 text-left shadow-sm">
					<div
						class="flex size-10 items-center justify-center rounded-lg bg-primary/10 text-primary"
					>
						<Icon class="size-5" aria-hidden="true" />
					</div>
					<h3 class="mt-4 text-base font-semibold">{audience.name}</h3>
					<p class="mt-1 text-sm leading-6 text-muted-foreground">{audience.description}</p>
					<p class="mt-4 text-xs font-medium text-primary">{audience.plan}</p>
				</div>
			{/each}
		</div>
	</section>

	<section id="roles">
		<div class="flex flex-col items-center gap-4">
			<h2 class="text-4xl font-bold">Built for admins, staff and customers</h2>
			<p class="text-lg text-balance text-muted-foreground">
				Each role gets the tools it needs — and only the records it should see.
			</p>
		</div>
		<div class="mt-12 grid grid-cols-1 gap-4 text-left md:grid-cols-3">
			{#each roles as role (role.id)}
				{@const RoleIcon = role.icon}
				<div class="flex flex-col rounded-2xl border bg-background/70 p-6 shadow-sm">
					<div
						class="flex size-10 items-center justify-center rounded-lg bg-primary/10 text-primary"
					>
						<RoleIcon class="size-5" aria-hidden="true" />
					</div>
					<h3 class="mt-4 text-base font-semibold">{role.name}</h3>
					<p class="mt-1 text-sm leading-6 text-muted-foreground">{role.description}</p>
					<ul class="mt-4 mb-4 flex flex-col gap-2.5">
						{#each role.capabilities as capability (capability)}
							<li class="flex items-start gap-2 text-sm leading-6">
								<Check class="mt-1 size-4 shrink-0 text-primary" aria-hidden="true" />
								<span>{capability}</span>
							</li>
						{/each}
					</ul>
					<p class="mt-auto border-t pt-4 text-xs leading-5 text-muted-foreground">
						<span class="font-medium text-foreground">Access boundary:</span>
						{role.boundary}
					</p>
				</div>
			{/each}
		</div>
	</section>

	<section id="faqs" class="my-4">
		<div class="mx-auto px-4 md:px-6">
			<div class="mx-auto max-w-2xl text-center text-balance">
				<h2>Frequently Asked Questions</h2>
				<p class="mt-4 text-balance text-muted-foreground">
					Quick answers about recurring billing, quotation templates, taxes and discounts, payments,
					roles and the customer portal.
				</p>
			</div>

			<div class="mx-auto mt-12 max-w-2xl">
				<Accordion
					type="single"
					class="w-full rounded-xl border bg-background px-8 py-3 shadow-sm ring-4 ring-muted dark:ring-0"
				>
					{#each faqItems as item, index (item.id)}
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

	<section id="get-started">
		<div class="rounded-2xl border bg-primary/5 px-4 py-10 sm:px-8">
			<h2 class="text-3xl font-bold text-balance">Put your recurring revenue on rails</h2>
			<p class="mx-auto mt-3 max-w-2xl text-balance text-muted-foreground">
				{#if user}
					You are signed in and ready to go — open your dashboard to work on products, plans,
					subscriptions, invoices and payments.
				{:else}
					Create your Brightloop account to set up your catalog and plans, send your first quotation
					and let recurring billing, invoices and payments run from one workspace.
				{/if}
			</p>
			<div class="mt-6 flex flex-wrap items-center justify-center gap-4">
				{#if user}
					<Button class="nodefault" href={resolve(dashboardRoute)}>
						<LayoutDashboard aria-hidden="true" />
						Open Dashboard
					</Button>
					<Button class="nodefault" variant="outline" href="#workflow">See how it works</Button>
				{:else}
					<Button class="nodefault" href={resolve('/signup')}>Get Started</Button>
					<Button class="nodefault" variant="outline" href={resolve('/signin')}>Sign In</Button>
				{/if}
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
