import * as ShioriJK from 'shiorijk';
import { NostrUtil } from './nostr';
const r = String.raw;

class ShioriEngine {

	#nostrutil?: NostrUtil;
	#pluginVersion = 'nostryu/0.1';
	
	load = (dirpath: string) => {};

	unload = () => { process.exit(); };

	request = (request: ShioriJK.Message.Request) => {
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
		if (request.request_line.method === 'NOTIFY') {
			response.status_line.code = 204;
			return response;
		}
		if (request.request_line.method !== 'GET') {
			response.status_line.code = 400;
			return response;
		}
		const reference = request.headers.references();
		let script: string | undefined;

		switch (request.headers.ID) {
			case 'version':
				response.status_line.code = 200;
				response.headers.set('Value', this.#pluginVersion);
				return response;
			case 'OnMenuExec':
				script = r`\0\_q${this.#pluginVersion}\n\n\![*]\__q[OnNostryu,1]On\__q\n\![*]\__q[OnNostryu,0]Off\__q\e`;
				break;
			case 'OnNostryu':
				if (reference[0] === '1') {
					if (this.#nostrutil === undefined) {
						this.#nostrutil = new NostrUtil();
						this.#nostrutil.getTimeline();
					}
				}
				else {
					this.#nostrutil?.close();
					this.#nostrutil = undefined;
				}
				break;
			default:
				break;
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
