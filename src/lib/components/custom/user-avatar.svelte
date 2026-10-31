<script lang="ts">
	import * as Avatar from '#lib/components/ui/avatar/index.ts';
	import { getInitials } from '#lib/index.ts';

	interface Props {
		image?: string | null;
		name: string;
		class?: string;
	}
	const { image, name, class: className }: Props = $props();
</script>

<Avatar.Root class={className}>
	<Avatar.Image src={image ?? undefined} alt={name} />
	<Avatar.Fallback>{getInitials(name)}</Avatar.Fallback>
</Avatar.Root>
