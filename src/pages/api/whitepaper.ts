import type { APIRoute } from 'astro';
import fs from 'node:fs/promises';
import path from 'node:path';

export const prerender = false;

type SignupEntry = {
	name: string;
	email: string;
	role?: string;
	createdAt: string;
	updatedAt?: string;
};

const dataFile = path.join(process.cwd(), 'data', 'whitepaper-signups.json');
const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const parseBody = async (request: Request) => {
	const contentType = request.headers.get('content-type') || '';

	if (contentType.includes('application/json')) {
		const json = await request.json().catch(() => ({} as Record<string, unknown>));
		return {
			name: String(json?.name || '').trim(),
			email: String(json?.email || '').trim(),
			role: String(json?.role || '').trim(),
		};
	}

	if (
		contentType.includes('multipart/form-data') ||
		contentType.includes('application/x-www-form-urlencoded')
	) {
		const data = await request.formData();
		return {
			name: String(data.get('name') || '').trim(),
			email: String(data.get('email') || '').trim(),
			role: String(data.get('role') || '').trim(),
		};
	}

	const text = await request.text();
	const params = new URLSearchParams(text);
	return {
		name: String(params.get('name') || '').trim(),
		email: String(params.get('email') || '').trim(),
		role: String(params.get('role') || '').trim(),
	};
};

const readEntries = async (): Promise<SignupEntry[]> => {
	try {
		const raw = await fs.readFile(dataFile, 'utf8');
		const parsed = JSON.parse(raw);
		return Array.isArray(parsed) ? parsed : [];
	} catch (err) {
		return [];
	}
};

export const POST: APIRoute = async ({ request }) => {
	try {
		const { name: rawName, email, role } = await parseBody(request);
		const name = rawName.replace(/[0-9]/g, '').trim();

		if (!name || !email) {
			return new Response(JSON.stringify({ ok: false, error: 'Missing name or email.' }), {
				status: 400,
				headers: { 'Content-Type': 'application/json' },
			});
		}

		if (!emailRegex.test(email)) {
			return new Response(JSON.stringify({ ok: false, error: 'Invalid email format.' }), {
				status: 400,
				headers: { 'Content-Type': 'application/json' },
			});
		}

		await fs.mkdir(path.dirname(dataFile), { recursive: true });
		const entries = await readEntries();

		const now = new Date().toISOString();
		const normalizedEmail = email.toLowerCase();
		const existing = entries.find((entry) => entry.email?.toLowerCase() === normalizedEmail);

		if (existing) {
			existing.name = name;
			existing.role = role || undefined;
			existing.updatedAt = now;
		} else {
			entries.push({
				name,
				email,
				role: role || undefined,
				createdAt: now,
			});
		}

		await fs.writeFile(dataFile, JSON.stringify(entries, null, 2), 'utf8');

		return new Response(JSON.stringify({ ok: true }), {
			status: 200,
			headers: { 'Content-Type': 'application/json' },
		});
	} catch (err) {
		console.error('[whitepaper] signup failed', err);
		return new Response(JSON.stringify({ ok: false, error: 'Server error.' }), {
			status: 500,
			headers: { 'Content-Type': 'application/json' },
		});
	}
};
