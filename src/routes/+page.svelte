<script lang="ts">
	const works = [
		{
			name: 'Dippod',
			summary: 'AI flashcards from topics, PDFs, and notes.',
			icon: '/icons/dippod.webp',
			link: 'https://dippod.com'
		},
		{
			name: 'Echobell',
			summary: 'Turn webhooks and emails into instant alerts and phone calls.',
			icon: '/icons/echobell.webp',
			link: 'https://echobell.one'
		},
		{
			name: 'Spark Memos',
			summary: 'Capture ideas fast with rich notes and iCloud sync.',
			icon: '/icons/sparkmemos.webp',
			link: 'https://sparkmemos.com'
		},
		{
			name: 'CassetteOne',
			summary: 'A retro design cassette music player for iOS.',
			icon: '/icons/cassette-one.webp',
			link: 'https://cassette.one'
		},
		{
			name: 'YouminCO',
			summary: 'A digital nomad community in Chinese.',
			icon: '/icons/youminco.webp',
			link: 'https://youmin.co'
		}
	];

	const emailParts = ['nooc', 'nooc.me'];
	const emailAddress = $derived(emailParts.join('@'));

	let hostname = $state('');

	$effect(() => {
		hostname = window.location.hostname;
	});

	const emailHref = $derived.by(() => {
		const subject = encodeURIComponent(`Inquiry about ${hostname || 'this domain'}`);
		const body = encodeURIComponent(
			`Hi,\n\nI'm interested in the domain ${hostname || 'this domain'}.\n`
		);
		return `mailto:${emailAddress}?subject=${subject}&body=${body}`;
	});
</script>

<svelte:head>
	<title>Domain Parked</title>
</svelte:head>

<main>
	<section class="hero">
		<svg
			class="hero-icon"
			xmlns="http://www.w3.org/2000/svg"
			width="48"
			height="48"
			viewBox="0 0 24 24"
			fill="none"
			stroke="currentColor"
			stroke-width="1.5"
			stroke-linecap="round"
			stroke-linejoin="round"
			aria-hidden="true"
		>
			<circle cx="12" cy="12" r="10" />
			<path d="M12 2a14.5 14.5 0 0 0 0 20 14.5 14.5 0 0 0 0-20" />
			<path d="M2 12h20" />
		</svg>
		<h1>This domain is not currently in use</h1>
		<p class="subtitle">
			If you are interested in purchasing this domain, please contact
			<a class="email" href={emailHref}>{emailAddress}</a>
		</p>
	</section>

	<hr class="divider" />

	<section class="works">
		<h2>While You're Here</h2>
		<ul class="works-list">
			{#each works as work (work.name)}
				<li>
					<a href={work.link} target="_blank" rel="noopener noreferrer" class="work-item">
						{#if work.icon}
							<img src={work.icon} alt={work.name} class="work-icon" loading="lazy" />
						{:else}
							<span class="work-icon-placeholder">{work.name[0]}</span>
						{/if}
						<div class="work-info">
							<span class="work-name">{work.name}</span>
							<span class="work-summary">{work.summary}</span>
						</div>
						<span class="work-arrow">→</span>
					</a>
				</li>
			{/each}
		</ul>
	</section>

	<footer>
		<p>
			© {new Date().getFullYear()}
			<a href="https://nooc.me" target="_blank" rel="noopener noreferrer">Nooc</a>
		</p>
	</footer>
</main>

<style>
	main {
		max-width: 580px;
		margin: 0 auto;
		padding: 80px 24px 48px;
	}

	.hero {
		text-align: center;
		padding: 0 0 40px;
	}

	.hero-icon {
		color: #ccc;
		margin-bottom: 20px;
	}

	h1 {
		font-size: 1.5rem;
		font-weight: 600;
		letter-spacing: -0.02em;
		line-height: 1.4;
		margin-bottom: 16px;
	}

	.subtitle {
		font-size: 0.9rem;
		color: #666;
		line-height: 1.6;
	}

	.email {
		color: #111;
		font-weight: 500;
		text-decoration: underline;
		text-underline-offset: 3px;
		text-decoration-color: #ccc;
		transition: text-decoration-color 0.15s;
	}

	.email:hover {
		text-decoration-color: #111;
	}

	.divider {
		border: none;
		border-top: 1px solid #e5e5e5;
		margin: 0 0 40px;
	}

	.works {
		margin-bottom: 48px;
	}

	h2 {
		font-size: 0.8rem;
		font-weight: 500;
		letter-spacing: 0.02em;
		color: #999;
		margin-bottom: 16px;
	}

	.works-list {
		list-style: none;
	}

	.works-list li + li {
		border-top: 1px solid #f0f0f0;
	}

	.work-item {
		display: flex;
		align-items: center;
		gap: 14px;
		padding: 12px 0;
		text-decoration: none;
		color: inherit;
		transition: opacity 0.15s;
	}

	.work-item:hover {
		opacity: 0.7;
	}

	.work-icon {
		width: 40px;
		height: 40px;
		border-radius: 10px;
		flex-shrink: 0;
		object-fit: cover;
	}

	.work-icon-placeholder {
		width: 40px;
		height: 40px;
		border-radius: 10px;
		background-color: #f0f0f0;
		display: flex;
		align-items: center;
		justify-content: center;
		flex-shrink: 0;
		font-size: 1rem;
		font-weight: 600;
		color: #999;
	}

	.work-info {
		flex: 1;
		min-width: 0;
		display: flex;
		flex-direction: column;
		gap: 2px;
	}

	.work-name {
		font-size: 0.9rem;
		font-weight: 500;
	}

	.work-summary {
		font-size: 0.8rem;
		color: #888;
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
	}

	.work-arrow {
		flex-shrink: 0;
		color: #ccc;
		font-size: 0.85rem;
		transition: color 0.15s;
	}

	.work-item:hover .work-arrow {
		color: #666;
	}

	footer {
		text-align: center;
		padding-top: 16px;
		border-top: 1px solid #e5e5e5;
	}

	footer p {
		font-size: 0.75rem;
		color: #aaa;
	}

	footer a {
		color: inherit;
		text-decoration: none;
	}

	footer a:hover {
		text-decoration: underline;
	}

	/* Dark mode */
	@media (prefers-color-scheme: dark) {
		.hero-icon {
			color: #444;
		}

		.subtitle {
			color: #888;
		}

		.email {
			color: #e5e5e5;
			text-decoration-color: #555;
		}

		.email:hover {
			text-decoration-color: #e5e5e5;
		}

		.divider {
			border-top-color: #2a2a2a;
		}

		h2 {
			color: #666;
		}

		.works-list li + li {
			border-top-color: #1e1e1e;
		}

		.work-icon-placeholder {
			background-color: #1e1e1e;
			color: #666;
		}

		.work-summary {
			color: #666;
		}

		.work-arrow {
			color: #444;
		}

		.work-item:hover .work-arrow {
			color: #888;
		}

		footer {
			border-top-color: #2a2a2a;
		}

		footer p {
			color: #555;
		}
	}
</style>
