## Publications
If you use this code in your reseach, please cite our open-source project: 
```
@inproceedings{OpenAcoustics_25_Kim,
author = {Kim, Jiwan and Jung, Hohurn and Oakley, Ian},
title = {OpenAcoustics: An Open-Source Framework for Acoustic Data Capture on Smart Devices and Microcontrollers},
year = {2025},
}
```
Three external library was used for our BLE data transmission project.

* `<bluefruit.h>` : Fundamental library for BLE communication
  * Refer below link for the installation of the library.
    ```
    https://github.com/adafruit/Adafruit_nRF52_Arduino/tree/master
    ```
* `<PDM.h>` : Enables PDM microphone data capture
  * Please check whether your board supports PDM microphone library.
* `<LSM6DS3.h>` : Library related to IMU data collection
  * This library is included for the multimodal sensing support. If you want to use your own sensor(temperature, light, etc), you can chage this library to another.
  


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

If you are using `XIAO nRF52840 Sense` board for your project, please select board manager `Seeed nRF52 Boards` not Seeed nRF52 mbed-enabled Boards.
```
Tools > Boards > Seeed nRF52 Boards > XIAO nRF52840 Sense (O)
```
```
Tools > Boards > Seeed nRF52 mbed-enabled Boards > XIAO nRF52840 Sense (X)
```

As we mensioned in the section PC server, batch recording mode is currently records the PDM & IMU data for only 2 seconds. In order to change this time duration, change the value of variable `batch_recording_time` that defined in line 53.
```
int batch_recording_time = 2000; // change this value to change the recording time in the BATCH mode (unit: ms)
```

Right below of the definition `batch_recording_time`, the varible `batch_time_duration_max` indicates the maximum time duration of batch recording. Currently it's value is set to 4 sec, but if your board has larger RAM memory size, it is possible to increase value and enables of recording bigger length of audio data. 
```
const int batch_time_duration_max = 4; // maximum time for transmitting batched information (unit: s)
```
