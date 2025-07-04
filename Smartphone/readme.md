# OpenAcoustics_phone

## Publications
If you use this code in your reseach, please cite our open-source project:  
```
@inproceedings{OpenAcoustics_25_Kim,
author = {Kim, Jiwan and Jung, Hohurn and Oakley, Ian},
title = {OpenAcoustics: An Open-Source Framework for Acoustic Data Capture on Smart Devices and Microcontrollers},
year = {2025},
}
```

## Android Studio Project Installation
1. Please open the OpenAcousticsPhone folder using Android studio. 
2. Connect smartphone using adb tools, over Wi-Fi recommended (https://developer.android.com/training/wearables/get-started/debugging)
3. Click 'Run App' button on Android studio.

## Data Capture
1. Please connect the phone and PC on the same Wi-Fi.  
2. Run the Python TCP server first on your terminal.  
```
python3 tcpserver.py
```

2. Setup your IP address to the denoted server IP address on the terminal (where you run the above code) and participant ID (defualt 0).

3. When you start block and click 'tap to start' button, data will be recorded on the folder where server code (tcpserver_phone.py) located.

4. Captured data structure
```
XXXX: subID, MM: month, DD: day, HH: hours, NN: minutes, SS: seconds, YYY: audio file ID.   
subXXXX_MMDD_HHNNSS
├──XXXX_MMDD_HHNNSS.csv (sensor data)
└──audioYYY.wav (audio data)
```