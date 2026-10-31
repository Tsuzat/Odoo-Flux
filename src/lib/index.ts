// place files you want to import through the `#lib` alias in this folder.

/**
 * Get the initials of a name.
 *
 * @param name The name to get the initials of.
 * @returns The initials, max 2 characters, uppercase letters.
 */
export const getInitials = (name: string): string => {
	return name
		.split(' ')
		.map((word) => word[0])
		.join('')
		.toUpperCase()
		.slice(0, 2);
};

const inr = new Intl.NumberFormat('en-IN', {
	style: 'currency',
	currency: 'INR',
	maximumFractionDigits: 2
});

/** Format a money value (number or numeric string from the DB) as INR. */
export function formatCurrency(value: number | string): string {
	const amount = typeof value === 'string' ? Number(value) : value;
	return inr.format(Number.isFinite(amount) ? amount : 0);
}

const dateFmt = new Intl.DateTimeFormat('en-IN', {
	day: 'numeric',
	month: 'short',
	year: 'numeric'
});

/** Format an ISO date (`YYYY-MM-DD`) or timestamp for display. */
export function formatDate(value: string | Date | null | undefined): string {
	if (!value) return '—';
	const date = value instanceof Date ? value : new Date(value);
	return Number.isNaN(date.getTime()) ? '—' : dateFmt.format(date);
}

/** `bank_transfer` → `Bank transfer` for enum-ish display values. */
export function humanize(value: string): string {
	const text = value.replaceAll('_', ' ');
	return text.charAt(0).toUpperCase() + text.slice(1);
}
