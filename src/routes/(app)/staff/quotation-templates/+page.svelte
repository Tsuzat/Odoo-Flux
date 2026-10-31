<script lang="ts">
	import { getQuotationTemplates } from '../data.remote.ts';
	import * as Card from '#lib/components/ui/card/index.ts';
	import * as Table from '#lib/components/ui/table/index.ts';
	import { Button } from '#lib/components/ui/button/index.ts';
	import { Skeleton } from '#lib/components/ui/skeleton/index.ts';
	import { SidebarTrigger } from '#lib/components/ui/sidebar/index.ts';

	import TriangleAlertIcon from '@lucide/svelte/icons/triangle-alert';

	const templates = getQuotationTemplates();
</script>

<svelte:head>
	<title>Quotation Templates — Brightloop Staff</title>
</svelte:head>

<div class="flex flex-col gap-6">
	<div class="flex flex-col gap-1">
		<h1 class="text-2xl font-semibold tracking-tight">
			<SidebarTrigger class="mr-4" />
			Quotation Templates
		</h1>
		<p class="text-sm text-muted-foreground">
			Start a new subscription from a template — the plan and lines are prefilled for you. Templates
			themselves are managed by admins.
		</p>
	</div>

	{#if templates.error}
		<Card.Root>
			<Card.Header>
				<Card.Title class="flex items-center gap-2 text-destructive">
					<TriangleAlertIcon class="size-5" aria-hidden="true" />
					Couldn't load templates
				</Card.Title>
				<Card.Description>{templates.error.message ?? 'Something went wrong.'}</Card.Description>
			</Card.Header>
			<Card.Footer>
				<Button variant="outline" onclick={() => templates.refresh()}>Try again</Button>
			</Card.Footer>
		</Card.Root>
	{:else if !templates.current}
		<Skeleton class="h-96" aria-label="Loading templates" />
	{:else if templates.current.length === 0}
		<Card.Root>
			<Card.Content class="flex flex-col items-center gap-2 py-12 text-center">
				<p class="font-medium">No templates yet</p>
				<p class="text-sm text-muted-foreground">Ask an admin to create the first template.</p>
			</Card.Content>
		</Card.Root>
	{:else}
		<Card.Root>
			<Card.Content>
				<Table.Root>
					<Table.Header>
						<Table.Row>
							<Table.Head>Template</Table.Head>
							<Table.Head>Plan</Table.Head>
							<Table.Head class="text-right">Valid for</Table.Head>
							<Table.Head>Lines</Table.Head>
						</Table.Row>
					</Table.Header>
					<Table.Body>
						{#each templates.current as t (t.id)}
							<Table.Row>
								<Table.Cell class="font-medium">{t.name}</Table.Cell>
								<Table.Cell>{t.plan.name}</Table.Cell>
								<Table.Cell class="text-right">{t.validityDays} days</Table.Cell>
								<Table.Cell>
									<div class="flex max-w-72 flex-col gap-0.5">
										{#each t.lines as l (l.id)}
											<span class="text-xs text-muted-foreground">
												{l.product.name}{l.variant
													? ` (${l.variant.attribute}: ${l.variant.value})`
													: ''} × {l.quantity}
											</span>
										{/each}
									</div>
								</Table.Cell>
							</Table.Row>
						{/each}
					</Table.Body>
				</Table.Root>
			</Card.Content>
		</Card.Root>
	{/if}
</div>
