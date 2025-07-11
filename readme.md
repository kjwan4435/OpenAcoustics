# OpenAcoustics

## Publications
If you use this code in your reseach, please cite our open-source project: 
```
@inproceedings{OpenAcoustics_25_Kim,
author = {Kim, Jiwan and Jung, Hohurn and Oakley, Ian},
title = {OpenAcoustics: An Open-Source Framework for Acoustic Data Capture on Smart Devices and Microcontrollers},
year = {2025},
}
```

## ![example_platforms](example_platforms.png)    
 OpenAcoustics support following platforms and more. (A) Smartphones (left to right: Samsung Galaxy S24, Motorola Edge 40, and Xiaomi Redmi Note 12 Pro), (B) Smartwatches (Samsung Galaxy Watch 7, Google Pixel Watch 3, and Xiaomi Watch Pro 2), and (C) MCUs (XIAO nRF52840 Sense and Adafruit Feather nRF52840 Sense)


## High-fidelity audio capture on mobile devices
Supports 48 kHz, 16-bit PCM audio recording on Android smartphones, which enables stereo recording using two microphones (e.g., top and bottom), and on smartwatches, which support mono recording with a single built-in microphone. Data transmission is performed via Wi-Fi using TCP.

## Low-power audio capture on MCUs
Enables 16 kHz, 16-bit PDM audio recording on low-cost MCUs with data transmission over Bluetooth Low Energy (BLE) using Universal Asynchronous Receiver/Transmitter (UART).

During the bluetooth communication, MCU boards does the role of peripheral device that sends data, and the computer becomes central device that recieves data. Arduino code and html code are both provided. You can test the BLE communication by just uploading .ino file to MCU board, and open main.html file through chrome website.

## Multimodal sensing support
Provides optional motion data capture using built-in IMU sensors, allowing synchronized collection with audio signals. 

The provided .ino Arduino code, it contains <LSM6DS3.h> library for the IMU data collection as an example, and the IMU data is saved in 19 byte array packet for the BLE UART process. This portion of the code can be easily modfided depending on which sensor you are using(e.g., temperature sensor, light sensor).

## Real-time transmission
Supports both real-time streaming and buffered transmission to mitigate data loss during wireless transfer. 

1. real-time streaming : Data capturing and transmission is processed simulteneously on the MCU board.
2. buffered transmission : Data capturing and transmission processes are carried out separately. When the MCU receives initiation signal from central device(e.g., PC server), it starts to capture data and store it to MCU's RAM during predefined time duration. After the data collection is terminated, MCU transmits stored data through BLE UART.
