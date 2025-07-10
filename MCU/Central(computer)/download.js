function createWavFile(audioData, sampleRate = 16000) {
    // WAV file header constants
    const numChannels = 1; // Mono
    const bitsPerSample = 16; // 16-bit audio
    const byteRate = sampleRate * numChannels * (bitsPerSample / 8);
    const blockAlign = numChannels * (bitsPerSample / 8);
    const dataSize = audioData.length * (bitsPerSample / 8);
    const fileSize = 44 + dataSize; // 44 bytes for header + data size

    // Create the WAV header
    const header = new ArrayBuffer(44);
    const view = new DataView(header);

    // RIFF chunk descriptor
    view.setUint32(0, 0x52494646, false); // "RIFF" in ASCII
    view.setUint32(4, fileSize - 8, true); // File size - 8 bytes
    view.setUint32(8, 0x57415645, false); // "WAVE" in ASCII

    // fmt subchunk
    view.setUint32(12, 0x666d7420, false); // "fmt " in ASCII
    view.setUint32(16, 16, true); // Subchunk size (16 for PCM)
    view.setUint16(20, 1, true); // Audio format (1 for PCM)
    view.setUint16(22, numChannels, true); // Number of channels
    view.setUint32(24, sampleRate, true); // Sample rate
    view.setUint32(28, byteRate, true); // Byte rate
    view.setUint16(32, blockAlign, true); // Block align
    view.setUint16(34, bitsPerSample, true); // Bits per sample

    // data subchunk
    view.setUint32(36, 0x64617461, false); // "data" in ASCII
    view.setUint32(40, dataSize, true); // Data size

    // Create the WAV file buffer
    const wavBuffer = new ArrayBuffer(fileSize);
    const wavView = new DataView(wavBuffer);

    // Copy header into the WAV file buffer
    new Uint8Array(wavBuffer).set(new Uint8Array(header), 0);

    // Write audio data to the WAV buffer
    let offset = 44;
    for (let i = 0; i < audioData.length; i++) {
        wavView.setInt16(offset, audioData[i], true); // PCM data is little-endian
        offset += 2;
    }

    return new Blob([wavBuffer], { type: "audio/wav" });
}

function downloadSound(filename){
    // Convert byte array to Int16 sound data
    let audioData = SoundDataArray.reduce((acc, soundData) => {
        return acc.concat(soundData); // Concatenate each soundData array
    }, []); // Initialize accumulator as an empty array

    // Create a WAV file Blob
    const wavBlob = createWavFile(audioData);

    // Create a download link
    const link = document.createElement("a");
    link.href = URL.createObjectURL(wavBlob);
    link.download = filename + ".wav";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
}

function downloadData(){
    if (MotionDataArray.length != 0)
        downloadCSV();
    if (SoundDataArray.length != 0)
        downloadSound("sample");
}

function downloadCSV(){
    var tempData = "timestampPeripheral, timestampCentral, packetID, subject, block, condition, trial, gesture, ax, ay, az, gx, gy, gz\r\n";
    let subjectID = document.getElementsByName('subjectTextView')[0].value;
    console.log(MotionDataArray.length);
  
    for(var i=0; i<MotionDataArray.length; i++){
      tempData += MotionDataArray[i].timestampPeripheral + "," + MotionDataArray[i].timestampCentral + "," + MotionDataArray[i].packetID + "," + subjectID + "," + MotionDataArray[i].trialData.block + "," + MotionDataArray[i].trialData.condition + "," + 
                  MotionDataArray[i].trialData.trial + "," + MotionDataArray[i].trialData.gesture + "," + 
                  MotionDataArray[i].imuData.ax + "," + MotionDataArray[i].imuData.ay + "," + MotionDataArray[i].imuData.az + "," +
                  MotionDataArray[i].imuData.gx + "," + MotionDataArray[i].imuData.gy + "," + MotionDataArray[i].imuData.gz + "\r\n";
    }
  
    var downloadLink = document.createElement("a");
    var blob = new Blob([tempData], { type: "text/csv;charset=utf-8" });
    var url = URL.createObjectURL(blob);
    downloadLink.href = url;
    downloadLink.download = subjectID + "_" + MotionDataArray[0].blockNum + "_" + MotionDataArray[0].conditionNum + ".csv";
  
    document.body.appendChild(downloadLink);
    downloadLink.click();
    document.body.removeChild(downloadLink);
}