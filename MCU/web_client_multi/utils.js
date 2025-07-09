
function speak(text) {
    if (typeof SpeechSynthesisUtterance === "undefined" || typeof window.speechSynthesis === "undefined") {
      alert("No speak service in this browser")
      console.log("No speak service in this browser")
      return;
    }
  
    window.speechSynthesis.cancel(); // if in speaking, init.
    
    // window.speechSynthesis.addEventListener("voiceschanged", () => {
    //   const voices = speechSynthesis.getVoices()
    // })
    voices = window.speechSynthesis.getVoices();
    // console.log(voices);
    const speechMsg = new SpeechSynthesisUtterance();
    speechMsg.rate = 1;
    speechMsg.voice = voices[0];
    speechMsg.pitch = 1;
    speechMsg.lang = "en-US";
    speechMsg.volume = 10;
    speechMsg.text = text;
  
    // SpeechSynthesisUtterance
    window.speechSynthesis.speak(speechMsg);
  }

  function beep(frequency = 800){
    var context = new AudioContext();
    var oscillator = context.createOscillator();
    oscillator.type = "sine";
    oscillator.frequency.value = frequency;
    oscillator.connect(context.destination);
    oscillator.start(); 
    // Beep for 500 milliseconds
    setTimeout(function () {
        oscillator.stop();
    }, 100);
  }


function playSound() {
    // Convert byte array to Int16 sound data
    let audioData = SoundDataArray.reduce((acc, soundData) => {
        return acc.concat(soundData); // Concatenate each soundData array
    }, []); // Initialize accumulator as an empty array

    console.log('sound data length: ', audioData.length);

    // Create an AudioContext to manage the audio playback
    const audioContext = new (window.AudioContext || window.webkitAudioContext)();
    
    // Create an AudioBuffer with 1 channel (mono) and the length of audioData
    const buffer = audioContext.createBuffer(1, audioData.length, 16000);
    
    // Get the channel data (the actual PCM samples)
    const channelData = buffer.getChannelData(0);  // We use channel 0 for mono sound
    
    // Normalize Int16 to [-1, 1] by dividing by 32768 (because 16-bit range is -32768 to 32767)
    for (let i = 0; i < audioData.length; i++) {
        channelData[i] = audioData[i] / 32768;
    }

    // Create a buffer source node to play the sound
    const source = audioContext.createBufferSource();
    source.buffer = buffer;
    
    // Connect the source to the audio context's destination (speakers)
    source.connect(audioContext.destination);

    // Start playback
    source.start();
}

function intToShort(n) {
    if (n < 32768) {
        return n; // Positive values stay the same
    } else {
        return n - 65536; // Handle two's complement for negative values
    }
}

function convertToInt16(bufferArray) {
    let audioData = [];
    
    // Process each pair of bytes and convert them into signed 16-bit integers
    for (let i = 0; i < bufferArray.length - 1; i += 2) {
        // Combine two bytes to form a 16-bit value
        let byte1 = bufferArray[i];
        let byte2 = bufferArray[i + 1];
        
        // Combine and convert to signed 16-bit integer (Int16)
        let combined = (byte1 << 8) | byte2;  // Combine two bytes (big-endian)
        let shortValue = intToShort(combined);  // Convert to signed 16-bit
        
        audioData.push(shortValue);  // Add to audio data
    }
    
    return audioData;
}

  // function for the display of the data
function keyPressed() {
    if (key=='a' || key=='A') { 
      chart = SHOW_ACC;
    }
    else if (key=='g' || key=='G') { 
      chart = SHOW_GYR;
    }
    else if (key=='v' || key=='V') { 
      chart = SHOW_VPU;
    }
  }
