import { NostrEvent, SimplePool, SubCloser, useWebSocketImplementation } from 'nostr-tools';
useWebSocketImplementation(require('ws'));
import { sendSSTP } from './sstp';
const r = String.raw;

export class NostrUtil {

	#pool?: SimplePool;
	#sub?: SubCloser;
	#relays = [
		'wss://relay-jp.nostr.wirednet.jp',
		'wss://yabu.me',
		'wss://r.kojira.io',
	];

	getTimeline = () => {
		this.#pool = new SimplePool();
		const profiles = new Map<string, NostrEvent>();
		const getProfile = this.#getProfile;
		const escape = this.#escape;
		this.#sub = this.#pool.subscribeMany(
			this.#relays,
			[
				{
					kinds: [0, 1],
					since: Math.floor(Date.now() / 1000),
				},
			],
			{
				async onevent(event) {
					switch (event.kind) {
						case 0:
							profiles.set(event.pubkey, event);
							break;
						case 1:
							if (!profiles.has(event.pubkey)) {
								profiles.set(event.pubkey, await getProfile(event.pubkey));
							}
							let profile;
							try {
								profile = JSON.parse(profiles.get(event.pubkey)?.content ?? '{}');
							} catch (error) {
								profile = {};
							}
							const script = [
								r`\![set,autoscroll,disable]\0\b[2]\_q`,
								URL.canParse(profile.picture) ? r`\_b[${profile.picture},centerx,centery,--option=opaque,--option=use_self_alpha,--option=background]` : '',
								r`\f[bold,true]${escape(profile.display_name ?? '')}\f[bold,default] @${escape(profile.name ?? '')}\n`,
								r`${escape(event.content).replaceAll('\n', '\\n')}\e`,
							].join('');
							sendSSTP(script, 'note', event.content.replaceAll('\n', '\\n'), profile.name ?? '', profile.display_name ?? '', profile.picture ?? '');
							break;
						default:
							break;
					}
				},
				oneose() {
				}
			}
		);
	};

	#getProfile = (pubkey: string): Promise<NostrEvent> => {
		return new Promise((resolve) => {
			let eventKind0: NostrEvent;
			const sub = this.#pool?.subscribeMany(
				this.#relays,
				[
					{
						kinds: [0],
						authors: [pubkey],
					},
				],
				{
					onevent(event) {
						if (eventKind0 === undefined || eventKind0.created_at < event.created_at) {
							eventKind0 = event;
						}
					},
					oneose() {
						sub?.close();
						resolve(eventKind0);
					}
				}
			);
		});
	};

	#escape = (script: string) => {
		const ESCAPE_TAG_1 = '\x03\x03';
		const ESCAPE_TAG_2 = '\x04\x04';
		return script
			.replace(/\\\\/g, ESCAPE_TAG_1)
			.replace(/\\%/g, ESCAPE_TAG_2)
			.replace(/\\/g, '\\\\')
			.replace(/%/g, '\\%')
			.replaceAll(ESCAPE_TAG_2, '\\%')
			.replaceAll(ESCAPE_TAG_1, '\\\\');
	};

	close = () => {
		this.#sub?.close();
		this.#pool?.close(this.#relays);
	};

}
