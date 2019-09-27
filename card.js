let bluetoothDevice = null;
let fullResponseData = [];
let fullResponseComplete = false;
let secondTime = false;
let fullResponseExpectedLen = null;
let writeCharacteristic = null;
let responseNotifier = null;
let options = {filters: []};
// -------------------------------------------------------------------------
function isWebBluetoothEnabled() {
	if (navigator.bluetooth) {
		return true;
	}
	else {
		log('Web Bluetooth API is not available. Please make sure the "Experimental Web Platform features" flag is enabled.');
		return false;
	}
}

// -------------------------------------------------------------------------
function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// -------------------------------------------------------------------------
function bytesToHex(bytes) {
    for (var hex = [], i = 0; i < bytes.length; i++) {
        hex.push((bytes[i] >>> 4).toString(16));
        hex.push((bytes[i] & 0xF).toString(16));
    }
    return hex.join('').toUpperCase();
}	

// -------------------------------------------------------------------------
function hexToBytes(hex) {
    for (var bytes = [], c = 0; c < hex.length; c += 2)
    bytes.push(parseInt(hex.substr(c, 2), 16));
    return bytes;
}

// -------------------------------------------------------------------------
function numToHex(num, len) {
    str = num.toString(16);
    hexStr = '0'.repeat(len - str.length) + str;
	return hexStr.toUpperCase();
}

// -------------------------------------------------------------------------
function strToAscii(str) {
	ascii = ''
	for (var i=0; i<str.length; i++) {
		ascii += numToHex(str.charCodeAt(i), 2);
	}
	return ascii;
}

// -------------------------------------------------------------------------
async function connect(serviceUUID=0xFFF0, writeChar=0xFFF5, readChar = 0xFFF4) {	
    if(!secondTime) {
	//options.filters.push({services: [serviceUUID]}); //0xFFF0
	options.filters.push({optionalService:[serviceUUID]});//0xFFF0
	options.filters.push({namePrefix: 'TYSC-'});  // todo - figure out why devices aren't listed when this is removed??
    secondTime = true;
    }
	let filterName = document.querySelector('#name').value;
	if (filterName) {
		options.filters.push({name: filterName});
	}
	
	try {
		log('Requesting Bluetooth Device ...');
		
		bluetoothDevice = await navigator.bluetooth.requestDevice(options);
		bluetoothDevice.addEventListener('gattserverdisconnected', onDisconnected);

		log('Connecting to ' + bluetoothDevice.name);
		const server = await bluetoothDevice.gatt.connect();

		log('Getting Service ...');
		const service = await server.getPrimaryService(serviceUUID);

		log('Getting Write Characteristic and Response Notifier ...');
		writeCharacteristic = await service.getCharacteristic(writeChar);
		responseNotifier = await service.getCharacteristic(readChar);
		await responseNotifier.startNotifications();
		responseNotifier.addEventListener('characteristicvaluechanged',handleNotifications);
		
		log('Connected to ' + bluetoothDevice.name);
    }
	catch(error) {
        log('Argh! ' + error);
    }
}

// -------------------------------------------------------------------------
async function send(command) {
    log('Command: ' + command);
	command = numToHex(command.length/2, 4) + command;
	
	// hexToArrayBuf
	let writeData = new Uint8Array(command.match(/[\da-f]{2}/gi).map(function (h) {
		return parseInt(h, 16)
	}));
	
	fullResponseData = [];
	fullResponseComplete = false;
	if (verbose) {
		log('WRITE: ' + bytesToHex(writeData));
	}
	
	let tmp = null;
	let offset = 0;
	while (writeData.length > 0) {
		offset = Math.min(writeData.length, 20);
		tmp = writeData.slice(0, offset);
		writeData = writeData.slice(offset);
		if (verbose) {
			log('WRITE TMP: ' + bytesToHex(tmp));
		}
		await writeCharacteristic.writeValue(tmp);
	}

	while (!fullResponseComplete) {
		// todo - turn this into a proper event driven sequence
		await sleep(10);
	}
	if (verbose) {
		log('RESPONSE: ' + bytesToHex(fullResponseData));
	}
	
	return {'sw':bytesToHex(fullResponseData.slice(-2)), 'data':bytesToHex(fullResponseData.slice(0,-2))}
}

// -------------------------------------------------------------------------
async function disconnect() {
	try {
//		log('disconnect');
		if (bluetoothDevice.gatt.connected) {
			await bluetoothDevice.gatt.disconnect();
		}
		else {
			log('disconnect when not connected');
		}
	}
	catch(error) {
        log('Argh! ' + error);
    }
	// ---/*log('TODO - fix disconnect');*/
}

// -------------------------------------------------------------------------
function handleNotifications(event) {
	if (verbose) {
		log('handleNotifications');
	}
    let value = event.target.value;
    let a = [];
    for (let i = 0; i < value.byteLength; i++){
        a.push(value.getUint8(i));      
    }
	if (verbose) {
		log('NOTIFIER DATA: ' + bytesToHex(a));
	}
	if (fullResponseData.length == 0) {
		fullResponseExpectedLen = (a[0]<<8 | a[1]) + 2;
		if (verbose) {
			log('fullResponseExpectedLen=' + fullResponseExpectedLen);
		}
		fullResponseData = a.slice(2);
		if (verbose) {
			log('fullResponseData=' + bytesToHex(fullResponseData));
		}
	}
	else {
		fullResponseData = fullResponseData.concat(a);
		if (verbose) {
			log('fullResponseData=' + bytesToHex(fullResponseData));
		}
	}
	if (verbose) {
		log('fullResponseData.length=' + fullResponseData.length);
	}
	if (fullResponseData.length >= fullResponseExpectedLen) {
		if (verbose) {
			log('got fullResponseComplete');
		}
		fullResponseComplete = true;
	}
}
	
// -------------------------------------------------------------------------
function onDisconnected(event) {
	// Object event.target is Bluetooth Device getting disconnected.
	let device = event.target;    
	log('Device ' + device.name + ' disconnected');
}
