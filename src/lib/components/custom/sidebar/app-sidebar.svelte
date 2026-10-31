<script lang="ts">
	import { resolve } from '$app/paths';
	import { page } from '$app/state';
	import * as Sidebar from '#lib/components/ui/sidebar/index.ts';
	import { useSidebar } from '#lib/components/ui/sidebar/index.ts';
	import * as DropdownMenu from '#lib/components/ui/dropdown-menu/index.ts';
	import UserAvatar from '../user-avatar.svelte';

	import LayoutDashboardIcon from '@lucide/svelte/icons/layout-dashboard';
	import RepeatIcon from '@lucide/svelte/icons/repeat';
	import NotebookTextIcon from '@lucide/svelte/icons/notebook-text';
	import ReceiptTextIcon from '@lucide/svelte/icons/receipt-text';
	import CreditCardIcon from '@lucide/svelte/icons/credit-card';
	import UsersIcon from '@lucide/svelte/icons/users';
	import PackageIcon from '@lucide/svelte/icons/package';
	import LayersIcon from '@lucide/svelte/icons/layers';
	import BadgePercentIcon from '@lucide/svelte/icons/badge-percent';
	import PercentIcon from '@lucide/svelte/icons/percent';
	import UserCogIcon from '@lucide/svelte/icons/user-cog';
	import CirclePlayIcon from '@lucide/svelte/icons/circle-play';
	import HouseIcon from '@lucide/svelte/icons/house';
	import WalletIcon from '@lucide/svelte/icons/wallet';
	import CircleUserRoundIcon from '@lucide/svelte/icons/circle-user-round';
	import ChevronsUpDownIcon from '@lucide/svelte/icons/chevrons-up-down';
	import LogOutIcon from '@lucide/svelte/icons/log-out';
	import type { ComponentProps } from 'svelte';
	import AppLogo from '../app-logo.svelte';
	import { Badge } from '../../ui/badge';
	import type { AuthSession } from '#lib/server/auth.ts';

	export type AppSidebarRole = 'admin' | 'staff' | 'customer';

	interface Props extends ComponentProps<typeof Sidebar.Root> {
		user: AuthSession['user'];
	}

	let { user, ...restProps }: Props = $props();

	const sidebar = useSidebar();

	type NavIcon = typeof LayoutDashboardIcon;
	interface NavItem {
		title: string;
		url: string;
		icon: NavIcon;
	}
	interface NavGroup {
		label: string;
		items: NavItem[];
	}

	const ROLE_LABELS: Record<AppSidebarRole, string> = {
		admin: 'Admin',
		staff: 'Staff',
		customer: 'Customer'
	};

	const ROLE_HOME: Record<AppSidebarRole, string> = {
		admin: '/admin',
		staff: '/staff',
		customer: '/portal'
	};

	const ROLE_SUBTITLE: Record<AppSidebarRole, string> = {
		admin: 'Admin console',
		staff: 'Staff console',
		customer: 'Customer portal'
	};

	/** Shared day-to-day operations for admin and internal staff. */
	function operations(base: string): NavItem[] {
		return [
			{ title: 'Subscriptions', url: `${base}/subscriptions`, icon: RepeatIcon },
			{ title: 'Quotation Templates', url: `${base}/quotation-templates`, icon: NotebookTextIcon },
			{ title: 'Invoices', url: `${base}/invoices`, icon: ReceiptTextIcon },
			{ title: 'Payments', url: `${base}/payments`, icon: CreditCardIcon },
			{ title: 'Customers', url: `${base}/customers`, icon: UsersIcon }
		];
	}

	const NAV: Record<AppSidebarRole, NavGroup[]> = {
		admin: [
			{
				label: 'Overview',
				items: [{ title: 'Dashboard', url: '/admin', icon: LayoutDashboardIcon }]
			},
			{ label: 'Operations', items: operations('/admin') },
			{
				label: 'Catalog',
				items: [
					{ title: 'Products & Variants', url: '/admin/products', icon: PackageIcon },
					{ title: 'Plans', url: '/admin/plans', icon: LayersIcon },
					{ title: 'Taxes', url: '/admin/taxes', icon: PercentIcon },
					{ title: 'Discounts', url: '/admin/discounts', icon: BadgePercentIcon }
				]
			},
			{
				label: 'Administration',
				items: [
					{ title: 'Staff', url: '/admin/staff', icon: UserCogIcon },
					{ title: 'Run Billing', url: '/admin/billing', icon: CirclePlayIcon }
				]
			}
		],
		staff: [
			{
				label: 'Overview',
				items: [{ title: 'Dashboard', url: '/staff', icon: LayoutDashboardIcon }]
			},
			{ label: 'Operations', items: operations('/staff') }
		],
		customer: [
			{
				label: 'My Account',
				items: [
					{ title: 'Overview', url: '/portal', icon: HouseIcon },
					{ title: 'My Subscriptions', url: '/portal/subscriptions', icon: RepeatIcon },
					{ title: 'My Invoices', url: '/portal/invoices', icon: ReceiptTextIcon },
					{ title: 'Payment History', url: '/portal/payments', icon: WalletIcon },
					{ title: 'Profile', url: '/portal/profile', icon: CircleUserRoundIcon }
				]
			}
		]
	};

	const role: AppSidebarRole = $derived.by(() => {
		const value = (user.role ?? 'customer').toLowerCase();
		return value === 'admin' || value === 'staff' ? value : 'customer';
	});
	const groups = $derived(NAV[role]);
	const home = $derived(ROLE_HOME[role]);
	const pathname = $derived(page.url.pathname);

	function isItemActive(item: NavItem): boolean {
		if (item.url === home) return pathname === item.url;
		return pathname === item.url || pathname.startsWith(`${item.url}/`);
	}
</script>

<Sidebar.Root collapsible="icon" {...restProps}>
	<Sidebar.Header>
		<Sidebar.Menu>
			<Sidebar.MenuItem>
				<Sidebar.MenuButton size="lg" tooltipContent="Brightloop" class="nodefault">
					<AppLogo showLogo={useSidebar().open} size={useSidebar().open ? 2.5 : 2} />
				</Sidebar.MenuButton>
			</Sidebar.MenuItem>
		</Sidebar.Menu>
		<Sidebar.GroupLabel class="text-md font-semibold">{ROLE_SUBTITLE[role]}</Sidebar.GroupLabel>
	</Sidebar.Header>

	<Sidebar.Content>
		{#each groups as group (group.label)}
			<Sidebar.Group>
				<Sidebar.GroupLabel>{group.label}</Sidebar.GroupLabel>
				<Sidebar.GroupContent>
					<Sidebar.Menu>
						{#each group.items as item (item.url)}
							<Sidebar.MenuItem>
								<Sidebar.MenuButton
									isActive={isItemActive(item)}
									tooltipContent={item.title}
									class="nodefault"
								>
									{#snippet child({ props })}
										<!-- eslint-disable-next-line svelte/no-navigation-without-resolve -- app routes are not built yet -->
										<a href={item.url} {...props}>
											<item.icon />
											<span>{item.title}</span>
										</a>
									{/snippet}
								</Sidebar.MenuButton>
							</Sidebar.MenuItem>
						{/each}
					</Sidebar.Menu>
				</Sidebar.GroupContent>
			</Sidebar.Group>
		{/each}
	</Sidebar.Content>

	<Sidebar.Footer>
		<Sidebar.Menu>
			<Sidebar.MenuItem>
				<DropdownMenu.Root>
					<DropdownMenu.Trigger>
						{#snippet child({ props })}
							<Sidebar.MenuButton
								size="lg"
								class="nodefault data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground"
								{...props}
							>
								<UserAvatar image={user.image} name={user.name} class="size-8 rounded-lg" />
								<div class="grid flex-1 text-left text-sm leading-tight">
									<span class="truncate font-medium">{user.name}</span>
									<span class="truncate text-xs text-muted-foreground">{ROLE_LABELS[role]}</span>
								</div>
								<ChevronsUpDownIcon class="ml-auto size-4" />
							</Sidebar.MenuButton>
						{/snippet}
					</DropdownMenu.Trigger>
					<DropdownMenu.Content
						class="w-(--bits-dropdown-menu-anchor-width) min-w-56 rounded-lg"
						side={sidebar.isMobile ? 'bottom' : 'right'}
						align="end"
						sideOffset={4}
					>
						<DropdownMenu.Label class="p-0 font-normal">
							<div class="flex items-center gap-2 px-1 py-1.5 text-left text-sm">
								<UserAvatar image={user.image} name={user.name} class="size-8 rounded-lg" />
								<span class="flex flex-col gap-0.5">
									<span class="truncate"
										>{user.name}
										<Badge variant="default" class="ml-2">{ROLE_LABELS[role]}</Badge>
									</span>
									<span class="truncate text-xs">{user.email}</span>
								</span>
							</div>
						</DropdownMenu.Label>
						<DropdownMenu.Separator />
						<DropdownMenu.Group>
							<DropdownMenu.Item variant="destructive" class="nodefault">
								{#snippet child({ props })}
									<a href={resolve('/signout')} {...props}>
										<LogOutIcon />
										Sign out
									</a>
								{/snippet}
							</DropdownMenu.Item>
						</DropdownMenu.Group>
					</DropdownMenu.Content>
				</DropdownMenu.Root>
			</Sidebar.MenuItem>
		</Sidebar.Menu>
	</Sidebar.Footer>

	<Sidebar.Rail />
</Sidebar.Root>
