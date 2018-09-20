let verbose = false;

// -------------------------------------------------------------------------
let InfoOutput = {
	log: function() {
		let line = Array.prototype.slice.call(arguments).map(function(argument) {
			return typeof argument === 'string' ? argument : JSON.stringify(argument);
		}).join(' ');
		
		document.querySelector('#log').textContent += line + '\n';
	},
	
	clearLog: function() {
		document.querySelector('#log').textContent = '';
	},
};

log = InfoOutput.log;


// -------------------------------------------------------------------------
async function onSignButtonClick() {
	InfoOutput.clearLog();
	verbose = document.getElementById('verbose').checked;
    
	await connect();
	
	hashByteLen = 32;
	let hashValue = new Array(hashByteLen);
	for (let i = 0; i < hashValue.length; i++) {
		hashValue[i] = Math.floor(Math.random() * 256);
	}
	
	rsp = await send('300108');	
	log('Response Data:' + rsp.data);
    log('Status: ' + rsp.sw);
	log('Select applet');
	rsp = await send('00A40400' + '09A00000057420020101');         // select	
	log('Response Data:' + rsp.data);
    log('Status: ' + rsp.sw);
    let userCmd = document.querySelector('#cmd').value;
    if(userCmd){
    log('User Command ');    
    rsp = await send(userCmd);	
	log('Response Data:' + rsp.data);
    log('Status: ' + rsp.sw);
    }
   /* log('Initiate Shutdown');
	rsp = await send('300118');  // initiateShutdown
	log('sw ' + rsp.sw);
	log('data ' + rsp.data);*/
    await disconnect();
}
