//requestAnimFrame
window.requestAnimFrame=(function(){
	return  window.requestAnimationFrame ||
	window.webkitRequestAnimationFrame ||
	window.mozRequestAnimationFrame ||
	function(callback){
		window.setTimeout(callback, 1000 / 60);
	};
})();
//model
//declaration
var intColonies = 8;
var environment;
var workerAnts = [], queens = [], feeders = [], colonies = [];

//canvas setup
canvas = document.createElement('canvas');
canvas.width = 640;
canvas.height = canvas.width;
context = canvas.getContext('2d');

//Circle Object
function CircleObject() {
	this.draw = function (color) {
		context.fillStyle = color;
		context.beginPath();
		context.arc(this.x, this.y, this.radius, 0, Math.PI * 2, true);
		context.closePath();
		context.fill();
	};
}

//controller
var scentMapSwitch = false;
var statsSwitch = true;
var scentMapButton = document.createElement('button');
var statsButton = document.createElement('button');
scentMapButton.innerHTML = 'Show / Hide Scent Map';
statsButton.innerHTML = 'Show / Hide Stats';
scentMapButton.onclick = function () { scentMapSwitch = !scentMapSwitch; };
statsButton.onclick = function () { statsSwitch = !statsSwitch; };
function getMousePos(canvas, evt) {
	var rect = canvas.getBoundingClientRect();
	return {
		x: evt.clientX - rect.left,
		y: evt.clientY - rect.top
	};
}
canvas.addEventListener('click', function(evt) {
	var mousePos = getMousePos(canvas, evt);
	feeders[feeders.length] = new Feeder(mousePos.x, mousePos.y);
}, false);

//view
document.body.appendChild(statsButton);
document.body.appendChild(scentMapButton);
document.body.appendChild(canvas);

//model
//ScentMapObject
function ScentMapObject (x, y, foodTheta, scent) {
	this.x = x;
	this.y = y;
	this.foodTheta = foodTheta;
	this.scent = scent;
}
ScentMapObject.prototype = new CircleObject();
ScentMapObject.prototype.constructor = ScentMapObject;
ScentMapObject.prototype.radius = 3;
ScentMapObject.prototype.color = function () {
return 'rgb(127, 255, 255)';
};
//Environment
function Environment () {
	this.allXYObjects = [];
	this.getAllXYObjects = function () {
		this.allXYObjects.splice(0, this.allXYObjects.length);
		this.allXYObjects = this.scentMap.concat(feeders);
		for (var i = 0; i < colonies.length; i++) {
			this.allXYObjects = this.allXYObjects.concat(colonies[i].workers, colonies[i].queen);
		}
	};
	this.getInteractions = function () {
		var j;
		var obj0, obj1;
		function checkInteraction (obj0, obj1, interactionDist) {
			var xSeparation = obj0.x - obj1.x;
			if (xSeparation < interactionDist && xSeparation > -interactionDist) {
				var ySeparation = obj0.y - obj1.y;
				if (ySeparation < interactionDist && ySeparation > -interactionDist) {
					return true;
				}
			}
			return false;
		}
		function searchLeftRight (j, obj0) {
			obj1 = environment.allXYObjects[j];
			if (!(obj1.constructor === WorkerAnt && obj1.colonyId === obj0.colonyId)) {
				if (checkInteraction(obj0, obj1, obj0.senseDist)) {
					obj0.nearbyObjects.push(obj1);
				} else {
					return true;
				}
			}
			return false;
		}
		this.allXYObjects.sort(function (a, b) {return a.x - b.x;});
		for (var i = 0; i < this.allXYObjects.length; i++) {
			obj0 = environment.allXYObjects[i];
			if (obj0.constructor === WorkerAnt) {
				j = i;
				//check left
				while (--j >= 0) {
					if (!searchLeftRight (j, obj0)) {
						break;
					}
				}
				j = i;
				//check right
				while (++j < environment.allXYObjects.length) {
					if (!searchLeftRight (j, obj0)) {
						break;
					}
				}
			}
		}
	};
	this.scentMap = [];
	this.scentMapSize = 4096;
	this.scentMapMinScent = .1;
	this.createScent = function (x, y, foodTheta, scent) {
	function mapToScale (num) {
	var r = ScentMapObject.prototype.radius;
	var quantum = Math.floor(Math.sqrt(2 * Math.pow(2 * r, 2)) / 2);
	if (quantum === 0) {
	quantum = 1;
	}
	return (num / quantum).toFixed(0) * quantum;
	//return (num / ScentMapObject.prototype.radius).toFixed(0) * ScentMapObject.prototype.radius;
	}



	environment.scentMap.push(new ScentMapObject(mapToScale(x), mapToScale(y), foodTheta, scent));
	};
	this.degradeScentMap = function () {
	var num = this.scentMap.length;
	var excessMap = num - this.scentMapSize;
	//degrade scent
	//this.scentMap = this.scentMap.map(function(x) {return x * .99;});
	while (num--) {
	this.scentMap[num].scent *= .995;
	}
	this.scentMap.sort(function (a, b) {return b.scent - a.scent;});
	//kill off weak scents
	var spliceFromIndex = this.scentMap.map(function (e) {if (e.scent < environment.scentMapMinScent) {return true;}}).indexOf(true);
	this.scentMap.splice(spliceFromIndex, this.scentMap.length - spliceFromIndex);
	if (excessMap > 0) {
	this.scentMap.splice(this.scentMapSize, excessMap);
	}
	};
	this.drawScentMap = function () {
	for (var i = 0; i < environment.scentMap.length; i++) {
	this.scentMap[i].draw(this.scentMap[i].color());
	}
	};
}
environment = new Environment();

//Worker Ants
function WorkerAnt(x, y, colonyId) {
	this.x = x;
	this.y = y;
	this.colonyId = colonyId;
	this.phi = (Math.random() * 2 - 1) * Math.PI;
	this.food = 0;
	this.nearbyObjects = [];
}
WorkerAnt.prototype = new CircleObject();
WorkerAnt.prototype.constructor = WorkerAnt;
WorkerAnt.prototype.maxV = 2;
WorkerAnt.prototype.dead = false;
WorkerAnt.prototype.radius = 1.2;
WorkerAnt.prototype.senseDist = WorkerAnt.prototype.radius * 16;
WorkerAnt.prototype.decide = function() {
	var separation;
	var nearbyObjectsIndex, num;
	var booWorkerAnt = false, booFeeder = false, booQueen = false, booScentMapObject = false;
	//develop - refactor
	function getClosestObjInfo(num) {

	}
	if (this.food === 0) {
		//check contact with worker from different colony. NB - nearbyObjects should not contain ants from same colony
		separation = canvas.width;
		num = this.nearbyObjects.length;
		while (num--) {
			if (this.nearbyObjects[num].constructor === WorkerAnt) {
				booWorkerAnt = true;
				if (Math.sqrt(Math.pow(this.nearbyObjects[num].x - this.x, 2) + Math.pow(this.nearbyObjects[num].y - this.y, 2)) < separation) {
					nearbyObjectsIndex = num;
					separation = Math.sqrt(Math.pow(this.nearbyObjects[num].x - this.x, 2) + Math.pow(this.nearbyObjects[num].y - this.y, 2));
				}
			}
		}
		if (booWorkerAnt) {
			if (separation < this.radius * 2) {
				this.attack(this.nearbyObjects[nearbyObjectsIndex]);
				this.nearbyObjects.splice(0, this.nearbyObjects.length);
				return;
			}
		}
		separation = canvas.width;
		num = this.nearbyObjects.length;
		while (num--) {
			if (this.nearbyObjects[num].constructor === Feeder) {
				booFeeder = true;
				if (Math.sqrt(Math.pow(this.nearbyObjects[num].x - this.x, 2) + Math.pow(this.nearbyObjects[num].y - this.y, 2)) < separation) {
					nearbyObjectsIndex = num;
					separation = Math.sqrt(Math.pow(this.nearbyObjects[num].x - this.x, 2) + Math.pow(this.nearbyObjects[num].y - this.y, 2));
				}
			}
		}
		if (booFeeder) {
			if (separation <= this.nearbyObjects[nearbyObjectsIndex].radius + this.radius) {
				this.food = 1;
				this.nearbyObjects[nearbyObjectsIndex].feed();
				this.nearbyObjects.splice(0, this.nearbyObjects.length);
				return;
			} else {
				this.phi = Math.atan2(this.nearbyObjects[nearbyObjectsIndex].y - this.y, this.nearbyObjects[nearbyObjectsIndex].x - this.x + Math.PI / 2);
				this.movePolar();
				this.nearbyObjects.splice(0, this.nearbyObjects.length);
				return;
			}
		}
		if (!this.borderControl()) {
			separation = canvas.width;
			num = this.nearbyObjects.length;
			while (num--) {
				if (this.nearbyObjects[num].constructor === ScentMapObject) {
					booScentMapObject = true;
					if (Math.sqrt(Math.pow(this.nearbyObjects[num].x - this.x, 2) + Math.pow(this.nearbyObjects[num].y - this.y, 2)) < separation) {
						nearbyObjectsIndex = num;
						separation = Math.sqrt(Math.pow(this.nearbyObjects[num].x - this.x, 2) + Math.pow(this.nearbyObjects[num].y - this.y, 2));
					}
				}
			}
			if (booScentMapObject) {
				if (separation <= this.nearbyObjects[nearbyObjectsIndex].radius) {
					var foodTheta = this.nearbyObjects[nearbyObjectsIndex].foodTheta;
					if (foodTheta !== null) {
						this.phi = foodTheta + Math.PI / 2;
					}
				}
			}
			this.movePolar();
			this.nearbyObjects.splice(0, this.nearbyObjects.length);
			return;
		}
	} else if (this.food === 1) {
		separation = canvas.width;
		num = this.nearbyObjects.length;
		while (num--) {
			if (this.nearbyObjects[num].constructor === Queen) {
				if (this.nearbyObjects[num].colonyId === this.colonyId) {
					booQueen = true;
					if (Math.sqrt(Math.pow(this.nearbyObjects[num].x - this.x, 2) + Math.pow(this.nearbyObjects[num].y - this.y, 2)) < separation) {
						nearbyObjectsIndex = num;
						separation = Math.sqrt(Math.pow(this.nearbyObjects[num].x - this.x, 2) + Math.pow(this.nearbyObjects[num].y - this.y, 2));
					}
				}
			}
		}
		if (booQueen) {
			if (separation <= this.nearbyObjects[nearbyObjectsIndex].radius) {
			this.food = 0;
			this.nearbyObjects[nearbyObjectsIndex].feed();
			this.phi += Math.PI;
			this.nearbyObjects.splice(0, this.nearbyObjects.length);
			return;
			} else {
				//go back to queen
				separation = canvas.width;
				this.phi = Math.atan2(colonies[this.colonyId].queen.y - this.y, colonies[this.colonyId].queen.x - this.x + Math.PI / 2);
				num = this.nearbyObjects.length;
				while (num--) {
					if (this.nearbyObjects[num].constructor === ScentMapObject) {
						booScentMapObject = true;
						if (Math.sqrt(Math.pow(this.nearbyObjects[num].x - this.x, 2) + Math.pow(this.nearbyObjects[num].y - this.y, 2)) < separation) {
							nearbyObjectsIndex = num;
							separation = Math.sqrt(Math.pow(this.nearbyObjects[num].x - this.x, 2) + Math.pow(this.nearbyObjects[num].y - this.y, 2));
						}
					}
				}
				if (booScentMapObject) {
					if (separation <= this.nearbyObjects[nearbyObjectsIndex].radius) {
						if (foodTheta !== null) {
							this.nearbyObjects[nearbyObjectsIndex].foodTheta = this.phi - 1.5 * Math.PI;
						}
						this.nearbyObjects[nearbyObjectsIndex].scent += 1;
					} else {
						environment.createScent(this.x, this.y, this.phi - 1.5 * Math.PI, 1);
					}
				} else {
					environment.createScent(this.x, this.y, this.phi - 1.5 * Math.PI, 1);
				}
				this.movePolar();
				this.nearbyObjects.splice(0, this.nearbyObjects.length);
				return;
			}
		} else {
			//go back to queen
			separation = canvas.width;
			this.phi = Math.atan2(colonies[this.colonyId].queen.y - this.y, colonies[this.colonyId].queen.x - this.x + Math.PI / 2);
			num = this.nearbyObjects.length;
			while (num--) {
				if (this.nearbyObjects[num].constructor === ScentMapObject) {
					booScentMapObject = true;
					if (Math.sqrt(Math.pow(this.nearbyObjects[num].x - this.x, 2) + Math.pow(this.nearbyObjects[num].y - this.y, 2)) < separation) {
						nearbyObjectsIndex = num;
						separation = Math.sqrt(Math.pow(this.nearbyObjects[num].x - this.x, 2) + Math.pow(this.nearbyObjects[num].y - this.y, 2));
					}
				}
			}
			if (booScentMapObject) {
				if (separation <= this.nearbyObjects[nearbyObjectsIndex].radius) {
					if (foodTheta !== null) {
						this.nearbyObjects[nearbyObjectsIndex].foodTheta = this.phi - 1.5 * Math.PI;
					}
					this.nearbyObjects[nearbyObjectsIndex].scent += 1;
				} else {
					environment.createScent(this.x, this.y, this.phi - 1.5 * Math.PI, 1);
				}
			} else {
				environment.createScent(this.x, this.y, this.phi - 1.5 * Math.PI, 1);
			}
			this.movePolar();
			this.nearbyObjects.splice(0, this.nearbyObjects.length);
			return;
		}
	}
};
WorkerAnt.prototype.movePolar = function() {
	var spread = .1;
	this.phi += (.5 - Math.random()) * 2 * spread;				
	this.x += this.maxV * (Math.cos(this.phi));
	this.y += this.maxV * (Math.sin(this.phi));
};
WorkerAnt.prototype.borderControl = function () {
	var bounceDist = this.radius + this.maxV;
	if (this.x - bounceDist <= 0) {
			if (Math.cos(this.phi) < 0) {
			this.phi = -this.phi + Math.PI;
			this.movePolar();
			return true;
		}
	} else if (this.x + bounceDist >= canvas.width) {
		if (Math.cos(this.phi) > 0) {
			this.phi = -this.phi + Math.PI;
			this.movePolar();
			return true;
		}	
	} else if (this.y - bounceDist <= 0 ) {
		if (Math.sin(this.phi) < 0) {
			this.phi = -this.phi;
			this.movePolar();
			return true;
		}
	} else if (this.y + bounceDist >= canvas.height) {
		if (Math.sin(this.phi) > 0) {
			this.phi = -this.phi;
			this.movePolar();
			return true;
		}
	}
	return false;
};
WorkerAnt.prototype.attack = function (ant) {
	ant.dead = true;
};

//Queens
function Queen(x, y, colonyId) {
	this.x = x;
	this.y = y;
	this.energy = 256;
	this.colonyId = colonyId;
}
Queen.prototype = new CircleObject();
Queen.prototype.radius = WorkerAnt.prototype.radius * 2;
Queen.prototype.constructor = Queen;
Queen.prototype.feed = function() {
	this.energy += 1;
	this.spawn(this.colonyId);
};
Queen.prototype.spawn = function(colonyId) {
	var spawnEnergy = 2;
	while (this.energy > spawnEnergy) {
		this.energy -= spawnEnergy;
		colonies[colonyId].workers.push(new WorkerAnt(this.x, this.y, this.colonyId));
	}
};
var i = 0;
function Colony (colonyId) {
	this.workers = [];
	this.queen = new Queen(Math.random() * (canvas.width - 2 * Queen.prototype.radius) + Queen.prototype.radius, Math.random() * (canvas.height - 2 * Queen.prototype.radius) + Queen.prototype.radius, colonyId);
	this.colonyId = colonyId;
	this.color = 'rgb(' + (this.colonyId * 255 / (intColonies - 1)).toFixed(0) + ', 0, 0)';
}

//Feeders
function Feeder(x, y, feederId) {
	this.x = x;
	this.y = y;
	this.feederId = feederId;
	this.energy = 64;
}
Feeder.prototype = new CircleObject();
Feeder.prototype.color = '#7777FF';
Feeder.prototype.radius = WorkerAnt.prototype.radius * 3;
Feeder.prototype.constructor = Feeder;
Feeder.prototype.feed = function() {
	this.energy -= 1;
	if (this.energy <= 0) {
		feeders.push(new Feeder(Math.random() * (canvas.width - 2 * Feeder.prototype.radius) + Feeder.prototype.radius, Math.random() * (canvas.height - 2 * Feeder.prototype.radius) + Feeder.prototype.radius, i));
		feeders.splice(feeders.indexOf(this), 1);
	}
};
//setup new simulation
(function () {
	var intFeeders = intColonies;
	for (var i = 0; i < intFeeders; i++) {
		feeders[i] = new Feeder(Math.random() * (canvas.width - 2 * Feeder.prototype.radius) + Feeder.prototype.radius, Math.random() * (canvas.height - 2 * Feeder.prototype.radius) + Feeder.prototype.radius, i);
	}
	for (var i = 0; i < intColonies; i++) {
		colonies[i] = new Colony(i);
		colonies[i].queen.spawn(i);
	}
})();
//run
(function run () {
	window.requestAnimFrame(run);
	environment.getAllXYObjects();
	environment.getInteractions();
	for (var i = 0; i < colonies.length; i++) {
		for (var j = 0; j < colonies[i].workers.length; j++) {
			if (colonies[i].workers[j].dead) {
				colonies[i].workers.splice(j, 1);
				if (colonies[i].workers.length === 0) {
					//delete colonies[i].queen;
					colonies[i].dead = true;
				}
			} else {
				colonies[i].workers[j].decide();
			}
		}
	}
	draw();
})();

//viewer
function draw() {
	context.fillStyle = 'rgba(255, 255, 255, .17)';
	context.fillRect(0, 0, canvas.width, canvas.height);
	environment.degradeScentMap();
	if (scentMapSwitch) {
		environment.drawScentMap();
	}
	for (var i = 0; i < colonies.length; i++) {
		if (!colonies[i].dead) {
			colonies[i].queen.draw(colonies[i].color);
		}
	}
	for (var i = 0; i < feeders.length; i++) {
		feeders[i].draw(feeders[i].color);
	}
	for (var i = 0; i < colonies.length; i++) {
		for (var j = 0; j < colonies[i].workers.length; j++) {
			colonies[i].workers[j].draw(colonies[i].color);
		}
	}
	//analysis
	context.font = '10px Calibri';
	if (statsSwitch) {
		var totalWorkers = 0;
		var totalFood = 0;
		var liveColonies = 0;
		for (var i = 0; i < colonies.length; i++) {
			if (!colonies[i].dead){
				totalWorkers += colonies[i].workers.length;
				for (var j = 0; j < colonies[i].workers.length; j++) {
					totalFood += colonies[i].workers[j].food;
				}
				context.fillStyle = colonies[i].color;
				context.fillText('colonyId ' + i + ': ' + colonies[i].workers.length, 0, 10 * liveColonies + 10);
				liveColonies++;
			}
		}
		context.fillStyle = 'blue';
		context.fillText('Total Worker Ants: ' + totalWorkers, 0, 10 * liveColonies + 10);
		context.fillText('Total Food: ' + totalFood, 0, 10 * (liveColonies + 1) + 10);
		context.fillText('Total ScentMapObjects: ' + environment.scentMap.length, 0, 10 * (liveColonies + 2) + 10);
	}
}