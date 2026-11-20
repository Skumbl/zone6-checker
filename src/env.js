import { defineEnvVars } from '@sveltejs/kit/env';

// All optional. Set them in Netlify: Site configuration > Environment variables.
export const variables = defineEnvVars({
	GEOCODER_CONTACT: {
		description:
			'Contact (email or site URL) sent to OpenStreetMap Nominatim in the User-Agent, as their usage policy asks.',
		schema: (value) => value || undefined
	}
});
