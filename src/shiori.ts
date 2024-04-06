import * as ShioriJK from 'shiorijk';
import { NostrUtil } from './nostr';
import { nip19 } from 'nostr-tools';
const r = String.raw;

class ShioriEngine {

	#nostrutil?: NostrUtil;
	#pubkey?: string;
	#pluginVersion = 'nostryu/0.1';
	
	load = (dirpath: string) => {};

	unload = () => { process.exit(); };

	request = async (request: ShioriJK.Message.Request) => {
		const response = new ShioriJK.Message.Response();
		response.status_line.protocol = 'PLUGIN';
		response.status_line.version = '2.0';
		response.headers.set('Charset', 'UTF-8');
		response.headers.set('Sender', 'Node.js');
		if (request.request_line.protocol !== response.status_line.protocol) {
			response.status_line.code = 400;
			return response;
		}
		if (request.headers.SecurityLevel === 'External') {
			response.status_line.code = 204;
			return response;
		}
		if (request.request_line.method === undefined || !['GET', 'NOTIFY'].includes(request.request_line.method)) {
			response.status_line.code = 400;
			return response;
		}
		const reference = request.headers.references();
		let script: string | undefined;

		const menu = (pubkey?: string) => {
			return r`\0\_qnpub:${pubkey ? nip19.npubEncode(pubkey) : 'none'}\n\n`
			+ r`\![*]\__q[OnNostryu,on]On\__q\n`
			+ r`\![*]\__q[OnNostryu,off]Off\__q\n\n`
			+ r`\![*]\__q[OnNostryu,inputnpub]input npub\__q\n\n`
			+ r`\![*]\__q[Menu_CANCEL]close\__q\e`
		};
		switch (request.headers.ID) {
			case 'version':
				response.status_line.code = 200;
				response.headers.set('Value', this.#pluginVersion);
				return response;
			case 'OnMenuExec':
				script = menu(this.#pubkey);
				break;
			case 'OnNostryu':
				switch (reference[0]) {
					case 'on':
						if (this.#nostrutil === undefined) {
							const promise: Promise<void> = new Promise(async (resolve) => {
								this.#nostrutil = new NostrUtil();
								let relays: string[] = [];
								let followList: string[] = [];
								if (this.#pubkey !== undefined) {
									relays = await this.#nostrutil.getRelayList(this.#pubkey);
									followList = await this.#nostrutil.getFollowList(this.#pubkey, relays);
								}
								this.#nostrutil.getTimeline(relays, followList);
								resolve();
							});
						}
						break;
					case 'off':
						this.#nostrutil?.close();
						this.#nostrutil = undefined;
						break;
					case 'inputnpub':
						script = r`\![open,inputbox,npub,,npub1...]\e`;
						break;
					default:
						break;
				}
				break;
			case 'OnUserInput':
				if (reference[0] === 'npub') {
					if (reference[1] === undefined) {
						script = r`\0\_qundefined\e`;
						break;
					}
					if (reference[1] === '') {
						this.#pubkey = undefined;
						script = menu(this.#pubkey);
						break;
					}
					const npub: string = reference[1];
					let dr;
					try {
						dr = nip19.decode(npub);
					} catch (error) {
						script = r`\0\_q${error}\e`;
						break;
					}
					if (dr.type !== 'npub') {
						script = r`\0\_qnot npub\![open,inputbox,npub,,npub1...]\e`;
						break;
					}
					this.#pubkey = dr.data;
					script = menu(this.#pubkey);
				}
				break;
			default:
				break;
		}
		if (request.request_line.method === 'NOTIFY') {
			response.status_line.code = 204;
			return response;
		}
		if (script) {
			response.status_line.code = 200;
			response.headers.set('Script', script);
		}
		else {
			response.status_line.code = 204;
		}
		return response;
	}

}

module.exports = new ShioriEngine();
