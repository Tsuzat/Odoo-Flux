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
