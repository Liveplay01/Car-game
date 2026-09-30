/**
 * Open-source code inside the game (Settings → Legal → Licenses). Their licenses ask for the
 * notice to travel with every copy, so the texts come straight from the packages.
 * Only what ships to players: PeerJS (multiplayer, loaded on demand) and its dependencies.
 */
import peerjs from '../../node_modules/peerjs/LICENSE?raw';
import msgpack from '../../node_modules/@msgpack/msgpack/LICENSE?raw';
import eventemitter3 from '../../node_modules/eventemitter3/LICENSE?raw';
import binarypack from '../../node_modules/peerjs-js-binarypack/LICENSE?raw';
import webrtcAdapter from '../../node_modules/webrtc-adapter/LICENSE.md?raw';
import sdp from '../../node_modules/sdp/LICENSE?raw';

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
].map((l) => ({ ...l, text: l.text.trim() }));
