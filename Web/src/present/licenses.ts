/**
 * Open-source code inside the game (Settings → Legal → Licenses). Their licenses ask for the
 * notice to travel with every copy, so the texts come straight from the packages.
 * Only what ships to players: PeerJS (multiplayer, loaded on demand) and its dependencies, and
 * qrcode-generator (the lobby's QR code, also on demand).
 */
import peerjs from '../../node_modules/peerjs/LICENSE?raw';
import msgpack from '../../node_modules/@msgpack/msgpack/LICENSE?raw';
import eventemitter3 from '../../node_modules/eventemitter3/LICENSE?raw';
import binarypack from '../../node_modules/peerjs-js-binarypack/LICENSE?raw';
import webrtcAdapter from '../../node_modules/webrtc-adapter/LICENSE.md?raw';
import sdp from '../../node_modules/sdp/LICENSE?raw';

/** qrcode-generator ships no license file, only the notice in its source: the MIT text, with its copyright. */
const qrcodeGenerator = `Copyright (c) 2009 Kazuhiko Arase

Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated documentation files (the "Software"), to deal in the Software without restriction, including without limitation the rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the Software, and to permit persons to whom the Software is furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.`;

export interface License {
  name: string;
  license: string;
  text: string;
}

export const LICENSES: License[] = [
  { name: 'PeerJS', license: 'MIT', text: peerjs },
  { name: 'peerjs-js-binarypack', license: 'MIT', text: binarypack },
  { name: 'webrtc-adapter', license: 'BSD-3-Clause', text: webrtcAdapter },
  { name: 'sdp', license: 'MIT', text: sdp },
  { name: 'EventEmitter3', license: 'MIT', text: eventemitter3 },
  { name: '@msgpack/msgpack', license: 'ISC', text: msgpack },
  { name: 'qrcode-generator', license: 'MIT', text: qrcodeGenerator },
].map((l) => ({ ...l, text: l.text.trim() }));
