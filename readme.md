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

Our transmission system basically uses <bluefruit.h> library which is a part of Adafruit’s Bluefruit nRF52 Libraries, and it only supports Adafruit boards based on the Nordic nRF52 chipset. Thus our system supports boards which are listed below.
* Adafruit Feather nRF52832
* Adafruit Feather nRF52840 Express
* Adafruit ItsyBitsy nRF52840 Express
* Adafruit Clue
* Adafruit Circuit Playground Bluefruit
* Adafruit Metro nRF52840 Express
* Adafruit EdgeBadge
* Adafruit Bluefruit Sense

The system also supports seeed studio XIAO boards when the code uploaded through Adafruit's core and bootloader.

* XIAO nRF52840
* XIAO nRF52840 Sense

During the bluetooth communication, MCU boards does the role of peripheral device that sends data, and the computer is central device that recieves data. Arduino code and html code are both provided. You can test the BLE communication by just uploading .ino file to MCU board, and open .html file through chrome website.

In the provided .html file, there exists 5 different modes in transmission.

* IMU_ONLY : real-time streaming of IMU data only
* PDM_ONLY : real-time streaming of PDM(16 kHz, 16 bit) mic data only
* IMU_PDM Asynchronized : real-time streaming of both IMU and PDM data. IMU and PDM data is transmitted in different packets
* IMU_PDM Synchronized : real-time streaming of both IMU and PDM data. IMU and PDM data is transmitted in same packets
* Batch : buffered data transmission.

Detailed explanation of each modes will be followed.

## Multimodal sensing support
Provides optional motion data capture using built-in IMU sensors, allowing synchronized collection with audio signals. 

The provided .ino Arduino code, it contains <LSM6DS3.h> library for the IMU data collection as an example, and the IMU data is saved in 19 byte array packet for the BLE UART. This portion of the code can be easily modfided depending on which sensor you are using(e.g., temperature sensor, light sensor)

## Real-time transmission
Supports both real-time streaming and buffered transmission to mitigate data loss during wireless transfer.

1. real-time streaming : Data capturing and transmission is processed simulteneously on the MCU board.
2. buffered transmission : Data capturing and transmission processes are carried out separately. When the MCU receives initiation signal from central device(e.g., computer website), it starts to capture data and store it to MCU's RAM during predefined time duration. After the data collection is terminated, MCU transmits stored data through BLE UART.

## User manual for .html file utilization
The website which is designed with provided .html file is composed of toal 4 steps.

1. BLE device connection establishment
2. Choose data transmission mode
3. Start/Stop record
4. Check/download the received data

In the step 3, IMU_ONLY, PDM_ONLY, IMU_PDM Async, IMU_PDM Sync modes are real-time streaming system, but Batch mode is not. Therefore, real-time streaming mode and batch mode uses different recording control button, start recording, and batch record respectively. Currently, batch recording time is adjusted to 2 seconds, but it can be modified in the .ino Arduino code's "batch_recording_time" variable. The maximum value of "batch_recording_time" is 4 sec, but it can be differ by the size of MCU's RAM memory.

In the step 3 of batch mode, visual feedback is implemented in order to notify the current status of data transmission to the users. For the safe and reliable data collection, "batch record" button should be pressed only when the STANBY green light is changed to deep green.

![visual_feedback](visual_feedback.png)
