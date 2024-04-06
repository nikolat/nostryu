import { Filter, NostrEvent, SimplePool, SubCloser, useWebSocketImplementation } from 'nostr-tools';
useWebSocketImplementation(require('ws'));
import { sendSSTP } from './sstp';
const r = String.raw;

export class NostrUtil {

	#pool: SimplePool;
	#sub?: SubCloser;
	#relays = [
		'wss://relay-jp.nostr.wirednet.jp',
		'wss://yabu.me',
		'wss://r.kojira.io',
	];

	constructor () {
		this.#pool = new SimplePool();
	};

	getTimeline = (relays: string[], pubkeys: string[]) => {
		if (relays.length === 0) {
			relays = this.#relays;
		}
		const profiles = new Map<string, NostrEvent>();
		const filter: Filter = {
			kinds: [0, 1],
			since: Math.floor(Date.now() / 1000),
		};
		if (pubkeys.length > 0) {
			filter.authors = pubkeys;
		}
		const onevent = async (event: NostrEvent) => {
			switch (event.kind) {
				case 0:
					profiles.set(event.pubkey, event);
					break;
				case 1:
					if (!profiles.has(event.pubkey)) {
						const profile = await this.#getProfile(event.pubkey, relays);
						if (profile)
							profiles.set(event.pubkey, profile);
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
						r`\f[bold,true]${this.#escape(profile.display_name ?? '')}\f[bold,default] @${this.#escape(profile.name ?? '')}\n`,
						r`${this.#escape(event.content).replaceAll('\n', '\\n')}\e`,
					].join('');
					sendSSTP(script, 'note', event.content.replaceAll('\n', '\\n'), profile.name ?? '', profile.display_name ?? '', profile.picture ?? '');
					break;
				default:
					break;
			}
		};
		this.#sub = this.#pool.subscribeMany(
			relays,
			[filter],
			{
				onevent,
				oneose() {
				}
			}
		);
	};

	#getProfile = (pubkey: string, relays: string[]): Promise<NostrEvent | undefined> => {
		const filter: Filter = { kinds: [0], authors: [pubkey] };
		return this.#fetchLastEvent(filter, relays);
	};

	getRelayList = async (pubkey: string, relays: string[] = this.#relays): Promise<string[]> => {
		const filter: Filter = { kinds: [10002], authors: [pubkey] };
		const event10002 = await this.#fetchLastEvent(filter, relays);
		if (event10002 === undefined) {
			return [];
		}
		const relaysToRead: string[] = [];
		for (const tag of event10002.tags.filter(tag => tag.length >= 2 && tag[0] === 'r')) {
			if ((tag.length === 2 || tag[2] === 'read') && URL.canParse(tag[1])) {
				relaysToRead.push(tag[1]);
			}
		}
		return relaysToRead;
	};

	getFollowList = async (pubkey: string, relays: string[] = this.#relays): Promise<string[]> => {
		const filter: Filter = { kinds: [3], authors: [pubkey] };
		const event3 = await this.#fetchLastEvent(filter, relays);
		if (event3 === undefined) {
			return [];
		}
		return event3.tags.filter(tag => tag.length >= 2 && tag[0] === 'p').map(tag => tag[1]);
	};

	#fetchLastEvent = (filter: Filter, relays: string[]): Promise<NostrEvent | undefined> => {
		return new Promise((resolve) => {
			let res: NostrEvent | undefined;
			const sub = this.#pool.subscribeMany(
				relays,
				[filter],
				{
					onevent(event) {
						if (res === undefined || res.created_at < event.created_at) {
							res = event;
						}
					},
					oneose() {
						sub?.close();
						resolve(res);
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
		this.#pool.close(this.#relays);
	};

}
