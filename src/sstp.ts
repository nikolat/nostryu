const sspServerURL = 'http://localhost:9801';

export const sendSSTP = async (script: string, type: string, content: string, name: string, display_name: string, picture: string) => {
	const protocol_version = 'Nostr/0.3';
	const mes = [
		'NOTIFY SSTP/1.1',
		'Charset: UTF-8',
		'SecurityLevel: external',
		'Sender: Node.js',
		'Event: OnNostr',
		`Reference0: ${protocol_version}`,
		`Reference1: ${type}`,
		`Reference2: ${content}`,
		`Reference3: ${name}`,
		`Reference4: ${display_name}`,
		`Reference5: ${picture}`,
		'Option: notranslate,nobreak',
		`Script: ${script}`,
		'',
		'',
	].join('\n');
	const res = await postData(sspServerURL + '/api/sstp/v1', mes);
};

const postData = async (url = '', data = '') => {
	const param = {
		method: 'POST',
		headers: {
			'Content-Type': 'text/plain',
			'Origin': sspServerURL,
		},
		body: data,
	};
	try {
		const response = await fetch(url, param);
		return response.text();
	} catch (error) {
		return '';
	}
};
