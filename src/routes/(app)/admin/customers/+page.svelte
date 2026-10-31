<script lang="ts">
	import { getCustomers } from '../data.remote.ts';
	import UserManage from '../user-manage.svelte';
	import type { PageProps } from './$types';
	import * as Card from '#lib/components/ui/card/index.ts';
	import * as Table from '#lib/components/ui/table/index.ts';
	import { Badge } from '#lib/components/ui/badge/index.ts';
	import { Button } from '#lib/components/ui/button/index.ts';
	import { Skeleton } from '#lib/components/ui/skeleton/index.ts';
	import { SidebarTrigger } from '#lib/components/ui/sidebar/index.ts';

	import TriangleAlertIcon from '@lucide/svelte/icons/triangle-alert';

	const customers = getCustomers();
	const { data }: PageProps = $props();
</script>

<svelte:head>
	<title>Customers — Brightloop</title>
</svelte:head>

<div class="flex flex-col gap-6">
	<div class="flex flex-col gap-1">
		<h1 class="text-2xl font-semibold tracking-tight">
			<SidebarTrigger class="mr-4" />
			Customers
		</h1>
		<p class="text-sm text-muted-foreground">
			Customer accounts and their logins. Admins can change a role, ban with a reason, or delete a
			user.
		</p>
	</div>

	{#if customers.error}
		<Card.Root>
			<Card.Header>
				<Card.Title class="flex items-center gap-2 text-destructive">
					<TriangleAlertIcon class="size-5" aria-hidden="true" />
					Couldn't load customers
				</Card.Title>
				<Card.Description>{customers.error.message ?? 'Something went wrong.'}</Card.Description>
			</Card.Header>
			<Card.Footer>
				<Button variant="outline" onclick={() => customers.refresh()}>Try again</Button>
			</Card.Footer>
		</Card.Root>
	{:else if !customers.current}
		<Skeleton class="h-96" aria-label="Loading customers" />
	{:else if customers.current.length === 0}
		<Card.Root>
			<Card.Content class="flex flex-col items-center gap-2 py-12 text-center">
				<p class="font-medium">No customers yet</p>
				<p class="text-sm text-muted-foreground">
					Customers appear here when they sign up on Brightloop.
				</p>
			</Card.Content>
		</Card.Root>
	{:else}
		<Card.Root>
			<Card.Content>
				<Table.Root>
					<Table.Header>
						<Table.Row>
							<Table.Head>Customer</Table.Head>
							<Table.Head>Login email</Table.Head>
							<Table.Head>Phone</Table.Head>
							<Table.Head class="text-right">Subscriptions</Table.Head>
							<Table.Head class="text-right">Invoices</Table.Head>
							<Table.Head>Status</Table.Head>
							<Table.Head class="text-right">Manage</Table.Head>
						</Table.Row>
					</Table.Header>
					<Table.Body>
						{#each customers.current as row (row.customer.id)}
							<Table.Row>
								<Table.Cell>
									<div class="flex flex-col">
										<span class="font-medium">{row.customer.name}</span>
										{#if row.customer.company}
											<span class="text-xs text-muted-foreground">{row.customer.company}</span>
										{/if}
									</div>
								</Table.Cell>
								<Table.Cell>{row.user.email}</Table.Cell>
								<Table.Cell class="text-muted-foreground">{row.customer.phone ?? '—'}</Table.Cell>
								<Table.Cell class="text-right">{row.subscriptionCount}</Table.Cell>
								<Table.Cell class="text-right">{row.invoiceCount}</Table.Cell>
								<Table.Cell>
									{#if row.user.banned}
										<Badge variant="destructive">Banned</Badge>
									{:else}
										<Badge variant="outline">Active</Badge>
									{/if}
								</Table.Cell>
								<Table.Cell class="text-right">
									<UserManage user={row.user} isSelf={row.user.id === data.user.id} />
								</Table.Cell>
							</Table.Row>
						{/each}
					</Table.Body>
				</Table.Root>
			</Card.Content>
		</Card.Root>
	{/if}
</div>
