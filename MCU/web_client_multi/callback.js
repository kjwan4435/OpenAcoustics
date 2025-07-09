/*
 * Connect to a device by passing the service UUID, and handler for response (a list of characteristics)
 */

function bleConnect() {
    if (!isConnected) {
        // Connect to a device by passing the service UUID *name should be same with it "XIAO nrf52840 sense" or "TMRsensor"
        myBLE.connect(serviceUUID, "TMRsensor", gotCharacteristics);
        connectBtn.elt.textContent = 'Disconnect Device';
        console.log("Connecting to myBLE Device...");
    } else {
        myBLE.disconnect();
        isConnected = myBLE.isConnected(); // Check if myBLE is connected
        connectBtn.elt.textContent = 'Connect Device';
        console.log("Disconnecting from myBLE Device...");
    }
}


// A function that will be called once got characteristics
function handleNotifications(data) {
    // Assuming `data` is a Uint8Array or Buffer
    // const label = String.fromCharCode(data.getUint8(0));
    const timeNow = millis();
    const label = String.fromCharCode(data.getUint8(0));
    console.log('Label: ', label, ', Length: ', data.byteLength);

    if (isBatchMode == true && batchState == 1) {

        batchState = 2;

        SendingCircle.changeColor(color(0,0,255));
        SendingCircle.display();

        RecordingCircle.changeColor(color(255,180,180));
        RecordingCircle.display();

    }

    if (data.byteLength == 243 && label == 'F') {

        const packetID = intToShort((data.getUint8(1) << 8) | (data.getUint8(2)));

        // console.log('packetID: ' ,packetID);
        
        // Extract timestamp (Next 4 bytes)
        const timestampPeripheral = ((data.getUint8(3) << 24) | (data.getUint8(4) << 16) | 
                    (data.getUint8(5) << 8) | data.getUint8(6));
        
        const timestampCentral = timeNow;

        // Extract IMU data (Next 12 bytes, indices 5 to 16)
        const imuData = {
            ax: intToShort((data.getUint8(7) << 8) | data.getUint8(8)),
            ay: intToShort((data.getUint8(9) << 8) | data.getUint8(10)),
            az: intToShort((data.getUint8(11) << 8) | data.getUint8(12)),
            gx: intToShort((data.getUint8(13) << 8) | data.getUint8(14)),
            gy: intToShort((data.getUint8(15) << 8) | data.getUint8(16)),
            gz: intToShort((data.getUint8(17) << 8) | data.getUint8(18)),
        };
        // console.log('IMU Data: ', imuData);

        const trialData = {
            block: currentBlock,
            condition: currentCondition,
            trial: currentTrial,
            gesture: currentGesture
        }

        // Extract sound data 
        const soundData = [];
        for (let i = 19; i < 19 + 224; i += 2) {
            const soundSample = intToShort((data.getUint8(i) << 8) | data.getUint8(i + 1));
            soundData.push(soundSample);
        }
        // Save the data to an object (you can modify this as needed for your use case)
        const IMUData = {
            timestampPeripheral: timestampPeripheral,
            timestampCentral: timestampCentral,
            packetID: label,
            imuData: imuData,
            trialData: trialData
        };

        // For example, save to a file or store in an array (assuming `dataArray` is used to store this)
        if (isRecording) {
            MotionDataArray.push(IMUData);
            SoundDataArray.push(soundData)
            console.log('Data saved at ', IMUData.timestampPeripheral, ", ", IMUData.timestampCentral);
        }
    } else if (data.byteLength == 227 && label == 'P') {

        const packetID = intToShort((data.getUint8(1) << 8) | (data.getUint8(2)));
        
        // console.log('packetID: ' ,packetID);

        // Extract sound data 
        const soundData = [];
        for (let i = 3; i < 3 + 224; i += 2) {
            const soundSample = intToShort((data.getUint8(i) << 8) | data.getUint8(i + 1));
            soundData.push(soundSample);
        }

        // For example, save to a file or store in an array (assuming `dataArray` is used to store this)
        if (isRecording) {
            SoundDataArray.push(soundData)
            console.log('Data saved at ', timeNow);
        }
    } 
    else if (data.byteLength == 19 && label == 'I') {
        const packetID = intToShort((data.getUint8(1) << 8) | (data.getUint8(2)));
        
        // Extract timestamp (Next 4 bytes)
        const timestampPeripheral = ((data.getUint8(3) << 24) | (data.getUint8(4) << 16) | 
                    (data.getUint8(5) << 8) | data.getUint8(6));
        
        const timestampCentral = timeNow;

        // Extract IMU data (Next 12 bytes, indices 5 to 16)
        const imuData = {
            ax: intToShort((data.getUint8(7) << 8) | data.getUint8(8)),
            ay: intToShort((data.getUint8(9) << 8) | data.getUint8(10)),
            az: intToShort((data.getUint8(11) << 8) | data.getUint8(12)),
            gx: intToShort((data.getUint8(13) << 8) | data.getUint8(14)),
            gy: intToShort((data.getUint8(15) << 8) | data.getUint8(16)),
            gz: intToShort((data.getUint8(17) << 8) | data.getUint8(18)),
        };
        // console.log('IMU Data: ', imuData);

        const trialData = {
            block: currentBlock,
            condition: currentCondition,
            trial: currentTrial,
            gesture: currentGesture
        }

        // Save the data to an object (you can modify this as needed for your use case)
        const IMUData = {
            timestampPeripheral: timestampPeripheral,
            timestampCentral: timestampCentral,
            packetID: label,
            imuData: imuData,
            trialData: trialData
        };

        // For example, save to a file or store in an array (assuming `dataArray` is used to store this)
        if (isRecording) {
            MotionDataArray.push(IMUData);
            console.log('Data saved at ', IMUData.timestampPeripheral, ", ", IMUData.timestampCentral);
        }
    } 
    else if (data.byteLength == 17 && label == 'B') {
        // Extract timestamp (Next 4 bytes)
        const timestampPeripheral = ((data.getUint8(1) << 24) | (data.getUint8(2) << 16) | 
                    (data.getUint8(3) << 8) | data.getUint8(4));
        
        const timestampCentral = timeNow;

        // Extract IMU data (Next 12 bytes, indices 5 to 16)
        const imuData = {
            ax: intToShort((data.getUint8(5) << 8) | data.getUint8(6)),
            ay: intToShort((data.getUint8(7) << 8) | data.getUint8(8)),
            az: intToShort((data.getUint8(9) << 8) | data.getUint8(10)),
            gx: intToShort((data.getUint8(11) << 8) | data.getUint8(12)),
            gy: intToShort((data.getUint8(13) << 8) | data.getUint8(14)),
            gz: intToShort((data.getUint8(15) << 8) | data.getUint8(16)),
        };
        // console.log('IMU Data: ', imuData);

        const trialData = {
            block: currentBlock,
            condition: currentCondition,
            trial: currentTrial,
            gesture: currentGesture
        }

        // Save the data to an object (you can modify this as needed for your use case)
        const IMUData = {
            timestampPeripheral: timestampPeripheral,
            timestampCentral: timestampCentral,
            packetID: label,
            imuData: imuData,
            trialData: trialData
        };

        // For example, save to a file or store in an array (assuming `dataArray` is used to store this)
        MotionDataArray.push(IMUData);

    }
    else if (data.byteLength == 226 && label == 'B') {
        
        const packetID = data.getUint8(1);
        // console.log("packetID: ", packetID);
        // Extract sound data 
        const soundData = [];
        for (let i = 2; i < 2 + 224; i += 2) {
            const soundSample = intToShort((data.getUint8(i) << 8) | data.getUint8(i + 1));
            soundData.push(soundSample);
        }

        // For example, save to a file or store in an array (assuming `dataArray` is used to store this)
        SoundDataArray.push(soundData)
    }
    else if (data.byteLength == 1 && label == 'e') {
        batchState = 0;
        // change the color of the indicator
        SendingCircle.changeColor(color(180,180,220));
        SendingCircle.display();

        StanbyCircle.changeColor(color(0,255,0));
        StanbyCircle.display();
    }
}

// A function that will be called once got characteristics
function gotCharacteristics(error, characteristics) {
    if (error) {console.log('ERROR: ', error); return;}  // log the problem
    else if (characteristics==null || characteristics.length==0) {
        // console.log(characteristics.length);
        console.log('ERROR: no characteristics. Probably user cancelled connect request.'); return;
    }  // log the problem    
    else {
        console.log('BLE device connected.');
        console.log('Characteristics: ', characteristics); // log the list of characterisitcs.
    }

    isConnected = myBLE.isConnected();
    for(let i = 0; i < characteristics.length; i++){
        if(rxCharacteristicUUID == characteristics[i].uuid){
            rxChar = characteristics[i];
            myBLE.startNotifications(rxChar, handleNotifications, 'custom');
        } else if(txCharacteristicUUID == characteristics[i].uuid) {
            txChar = characteristics[i]
        } else {
            console.log('characteristic error: ', characteristics[i].uuid)
        }
    }
}

function sendCharacteristics(text){
    myBLE.write(txChar, text);
}