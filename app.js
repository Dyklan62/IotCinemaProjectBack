const express = require('express');
const mqtt = require('mqtt');

const app = express();

//Conf connexion MQTT
// const mqttBroker = 'wss://631c748724bc4a78bf14eddc2f2133a9.s2.eu.hivemq.cloud:8884/mqtt';
// const username= 'maciej';
// const password = 'Pgb2p2A8S9hUf8';
const mqttBroker = 'wss://31c1474781644cc99b02813714a2f9e6.s2.eu.hivemq.cloud:8884/mqtt';
const username = 'Maciej';
const password = 'toto123456';
const mqttClient = mqtt.connect(mqttBroker, { username: username, password: password });
const peopleChannel = 'PEOPLE';
const tempChannel = 'TEMP';
const climChannel = 'CLIM';

let temperature = 20;
let isClimActivate = false;
let peopleCount = 0;
let isActivateIncrementMoreTenPeople = false;
let climPower = 3000;
let intervalId = null;
let previousPeopleCount = 0
let intervalTime = 0

mqttClient.on('connect', () => {
	mqttClient.subscribe(peopleChannel);
	mqttClient.subscribe(tempChannel);
});

mqttClient.on('message', (topic, message) => {
	if (topic === peopleChannel) {
		peopleCount = parseInt(message, 10);
		if(previousPeopleCount < peopleCount) {
			newPersonEnter();
		} else {
			if(peopleCount < 10) {
				clearInterval(intervalId);
				isActivateIncrementMoreTenPeople = false;
			} else {
				increaseTemperature();
			}
		}
	}

	if(topic === tempChannel) {
		const temp = parseFloat(message);
		manageClimPower(temp)
		manageClim(parseFloat(message))
	}
	previousPeopleCount = peopleCount;
});

function manageClimPower(temp) {
	if(intervalTime <= 6) {
		if(temp >= 22) {
			climPower = 1000;
		} else if (temp >= 21 && temp <= 22) {
			climPower = 1500;
		} else if (temp < 21) {
			climPower = 2000;
		}
	} else {
		if(temp >= 22.5) {
			climPower = 1000;
		} else if (temp >= 21 && temp <= 22) {
			climPower = 2000;
		} else if (temp < 21) {
			climPower = 3000;
		}
	}
}

function newPersonEnter() {
		setTimeout(() => {
			temperature += 0.1;
			temperature = parseFloat(temperature.toFixed(2))
			mqttClient.publish(tempChannel, temperature.toString());
		}, 1500)

		if(peopleCount >= 10){
			increaseTemperature()
		}
}

function manageClim(temp) {
	if(temp >= 21) {
		if(!isClimActivate) {
			isClimActivate = true;
			mqttClient.publish(climChannel, isClimActivate.toString());
			climPower = 3000;
			decreaseTemperature();
		}
	}
}

function decreaseTemperature() {
	setTimeout(() => {
		temperature -= 0.1;
		temperature = parseFloat(temperature.toFixed(2))
		mqttClient.publish(tempChannel, temperature.toString());

		if (temperature <= 20) {
			isClimActivate = false;
			mqttClient.publish(climChannel, isClimActivate.toString());
		} else {
			decreaseTemperature()
		}
	}, climPower)
}

function increaseTemperature() {
	if(intervalId !== null) {
		clearInterval(intervalId);
		isActivateIncrementMoreTenPeople = false;
	}
	intervalTime = Math.max(14 - (Math.floor(peopleCount / 10) * 2), 2);
	if(isActivateIncrementMoreTenPeople === false) {
		intervalId = setInterval(() => {
			temperature +=  0.1;
			temperature = parseFloat(temperature.toFixed(2))
			mqttClient.publish(tempChannel, temperature.toFixed(2).toString());
			isActivateIncrementMoreTenPeople = true;
		}, intervalTime * 1000);
	}
}

module.exports = app;