# SPDX-FileCopyrightText: 2020 Dan Halbert for Adafruit Industries
#
# SPDX-License-Identifier: MIT

# Connect to an "eval()" service over BLE UART.

from adafruit_ble import BLERadio
from adafruit_ble.advertising.standard import ProvideServicesAdvertisement
from adafruit_ble.services.nordic import UARTService

import matplotlib.pyplot as plt
from datetime import datetime
import numpy as np
import time
import keyboard
from scipy.io.wavfile import write
import csv
import os

ble = BLERadio()
uart_connection = None

sub_id = 0
streaming = 0
loggingData = False # state the logging state
samples = 0
sampleCount = 0
IMU_sampleCount = 0
startTime = 0

trialNum = 0
timeLimit = 3 # save the data for 1 second
bufSize = 16000 # save the data for 5 seconds

VPU_log = [] # list of byte (each sample is 1 byte size)
IMU_log = []
VPU_data =[] # list of short (each sample is 2 byte size)
IMU_data = []
VPU_saved_data = [] # just for verifying the sampling rate

ax_saved_data = [] # lists for saving IMU time series data
ay_saved_data = []
az_saved_data = []
gx_saved_data = []
gy_saved_data = []
gz_saved_data = []
time_stamp_data = []

GestureName = ['nothing', 'thumb_tab', 'index_tab', 'middle_tab', 'swipe_up', 'swipe_down', 'swipe_left', 'swipe_right']

csvName = "csvData"
ext = '.csv'

# get the current line number of .csv file
numSample = 0
numSamplePerGesture = 5

# ---------------------------------------------------------------------- #
def makeDirectories(dirName): # function for making directorys
    try:
        os.mkdir(dirName)
        os.chdir(dirName)
        print("Working directory set as %s\n" % os.getcwd())

        os.mkdir('WavFiles')
        file_object = open(f'{dirName}.csv', 'a')
        file_object.write("subNum, trialNum, blockNum, isCorrect, label, ax, ay, az, gx, gy, gz, timestamp\n")
        file_object.close()
        print("File Header Done!")
    except:
        print("Exception: working directory remains %s\n" % os.getcwd())

def SaveData(VPU, isCorrect, ax, ay, az, gx, gy, gz, t): # saving data with cycle
    # save current VPU audio file in .wavs
    wavArray = np.int16(np.array(VPU))
    wavtitle = 'wav%d.wav' % numSample
    write('WavFiles'+'/'+wavtitle, 16000, wavArray)

    # save VPU & IMU data in current .csv file
    f = open(dir_name + ext, 'a')
    writer = csv.writer(f)
    writer.writerow([ sub_id, numSample, (numSample // numSamplePerGesture) // len(GestureName), isCorrect, GestureName[numSample%len(GestureName)], ListToString(ax), ListToString(ay), ListToString(az), ListToString(gx), ListToString(gy), ListToString(gz),  ListToString(t)])

# ---------------------------------------------------------------------- #

# utility functions #
    
def ListToString(list):
    retString = ""
    for i in range(len(list)):
        retString += str(list[i]) + " "
    
    return retString

def IntToShort(n):
    assert 0<=n<=65535

    if (n < 32768):
        return n
    else:
        return n - 65536

def convertLog(length): # convert byte data to int16(short) data
    VPU_data.clear()
    for i in range(len(VPU_log)-length,len(VPU_log)-1):
        if (i % 2 == 0):
            VPU_data.append(IntToShort(int(int.from_bytes(VPU_log[i], "big")) << 8 | int(int.from_bytes(VPU_log[i+1], "big"))))# change 1 byte list to 2 byte list
        i += 1
    VPU_log.clear()

def drawData(toDraw, tailsize):
    max_value = 500
    start = len(toDraw) - tailsize
    for i in range(start, len(toDraw) - 1):
        inMap = toDraw[i]
        #inMap = num_to_range(toDraw[i], -32768, 32767, 0, max_value) # rearrange the value of the data list
        print(inMap)

def convertIMU(bytelist):
    retlist = [] # list that saves ax, ay, az, gx, gy, gz
    for i in range(12):
        if (i % 2 == 0):
            retlist.append(IntToShort(int(int.from_bytes(bytelist[i], "big")) << 8 | int(int.from_bytes(bytelist[i+1], "big"))))

    return retlist

def ClearData(): # clear data arrays for the next data capture
    VPU_saved_data.clear()
    ax_saved_data.clear()
    ay_saved_data.clear()
    az_saved_data.clear()
    gx_saved_data.clear()
    gy_saved_data.clear()
    gz_saved_data.clear()
    time_stamp_data.clear()
# ---------------------------------------------------------------------- #

if __name__ == "__main__":
    path = os.getcwd()
    timestamp = int(time.mktime(datetime.now().timetuple())) # https://kdeon.tistory.com/50
    dir_name = f'sub{sub_id}_{timestamp}'
    # for Serial Communication
    # host_port = '/dev/cu.usbmodem1101'
    # print("\n-------------\n")
    # print("The current working directory is %s\n" % path)
    # print("Starting up a Serial Communication - ")
    # try:
    #     myPort = serial.Serial(port="/dev/cu.usbmodem1101", baudrate=9600)
    #     print(f'My serial: {myPort.name}')
    # except:
    #     print(f'Unable to connect port: {host_port}')

    #for BLE communication
    if not uart_connection:
        print("Trying to connect...")
        for adv in ble.start_scan(ProvideServicesAdvertisement):
            if UARTService in adv.services:
                uart_connection = ble.connect(adv)
                print(f'Connetecd: {adv.complete_name}')
                break
        ble.stop_scan()

    # uart_service = uart_connection[UARTService]
    makeDirectories(dir_name)

while True:
    uart_service = uart_connection[UARTService]
    if uart_connection and uart_connection.connected:

        if (keyboard.is_pressed('esc')): # in order to terminate the program, press esc keyboard
            break

        # ---------------------------------------------------------------------- #
        # codes for saving data log when 'space' keyboard is pushed
        if (keyboard.is_pressed('space') and (not loggingData)):
            startTime = time.time()
            loggingData = True
            print("Block # %d Trial # %d Gesture: %s log start!" % ((numSample // numSamplePerGesture) // len(GestureName), numSample, GestureName[numSample%len(GestureName)]))
        
        if (time.time() - startTime > timeLimit and loggingData):
            loggingData = False
            # print("Do you really want to save? (y: enter / n: shift)")

            isCorrect = True
            """
            while(True):
                if (keyboard.is_pressed('enter')):
                    isCorrect = True
                    break

                elif (keyboard.is_pressed('shift')):
                    isCorrect = False
                    break
            """
            print("Block # %d Trial # %d Gesture: %s saved! Saved VPU Data Length: %d Saved IMU Data Length: %d\n" % ((numSample // numSamplePerGesture) // len(GestureName), numSample, GestureName[numSample%len(GestureName)], len(VPU_saved_data), len(ax_saved_data)))
            # print("Time stamp length: %d" % len(time_stamp_data))
            # print("%d %d %d %d %d %d" %(len(ax_saved_data), len(ay_saved_data), len(az_saved_data), len(gx_saved_data), len(gy_saved_data), len(gz_saved_data)))

            SaveData(VPU_saved_data, isCorrect, ax_saved_data, ay_saved_data, az_saved_data, gx_saved_data, gy_saved_data, gz_saved_data, time_stamp_data)
            
            ClearData()

            numSample += 1
            print("Prepare gesture: %s" % GestureName[numSample%len(GestureName)])

        # ---------------------------------------------------------------------- #
            
        if (streaming == 1): # when we recieved VPU stream data
            # b = myPort.read(1)
            b = uart_service.read(1)
            VPU_log.append(b) # append each 1 byte data to 'log' list
            sampleCount += 1
            print(f'sample counter: {sampleCount}')
            if (samples > 0 and sampleCount >= samples - 1 ):

                streaming = 0
                # convert 1 byte data to int representation
                convertLog(sampleCount)
                # print(IMU_result)
                # drawData(data, sampleCount//2)
                if (loggingData):
                    VPU_saved_data += VPU_data

        elif (streaming == 2): # when we recieved IMU data
            # TimeStamp = myPort.readline().strip().decode('utf-8')
            TimeStamp = uart_service.readline().strip().decode('utf-8')

            # IMU read 6*2    
            for i in range(12):
                # b = myPort.read(1)
                b = uart_service.read(1)
                IMU_data.append(b)

            IMU_result = convertIMU(IMU_data)
            IMU_data.clear()
            streaming = 0

            if (loggingData):
                ax_saved_data.append(IMU_result[0])
                ay_saved_data.append(IMU_result[1])
                az_saved_data.append(IMU_result[2])
                gx_saved_data.append(IMU_result[3])
                gy_saved_data.append(IMU_result[4])
                gz_saved_data.append(IMU_result[5])
                time_stamp_data.append(TimeStamp)

        else: # keep reading a certain size of bucket from the serial communication + get the bucket size
            inString = uart_service.read()
            print(len(inString))
            print(f'Data: {inString}.')
            
            # if (inString != None):
            #     inString = str(inString)
            #     inString = inString.strip()

            #     if ( inString.find("START:") >= 0 ):
            #         # streaming = 1
            #         sampleCount = 0
            #         #sample length parsing 
            #         res = inString.split("START:") 
            #         length_str = res[1].split("\\")[0]
            #         # if (len(length_str)==0):
            #         #     print(inString)
            #         samples = int(length_str)

            #     elif (inString.find("IMU") >= 0 ):
            #         sampleCount = 0
            #         # streaming = 2

    # print(streaming)
    # print(uart_service.readline())
    # uart_service.reset_input_buffer()