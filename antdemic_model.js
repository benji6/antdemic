//declaration
var intColonies = 48;
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
WorkerAnt.prototype.decide = function () {
	function interact (constr, interactionRadius, callback) {
		var num = this.nearbyObjects.length;
		var separation = this.senseDist + 1;
		var nearbyObjectsIndex;
		while (num--) {
			if (this.nearbyObjects[num].constructor === constr) {
				if (Math.sqrt(Math.pow(this.nearbyObjects[num].x - this.x, 2) + Math.pow(this.nearbyObjects[num].y - this.y, 2)) < separation) {
					nearbyObjectsIndex = num;
					separation = Math.sqrt(Math.pow(this.nearbyObjects[num].x - this.x, 2) + Math.pow(this.nearbyObjects[num].y - this.y, 2));
				}
			}
		}
		if (separation <= interactionRadius) {
			callback.call(this, nearbyObjectsIndex);
			return true;
		}
	}
	if (this.food === 0) {
		//check contact with worker from different colony. NB - nearbyObjects should not contain ants from same colony
		if (interact.call(this, WorkerAnt, this.radius * 2, function (nearbyObjectsIndex) {
			this.attack(this.nearbyObjects[nearbyObjectsIndex]);
			this.nearbyObjects.splice(0, this.nearbyObjects.length);
		})) {return;}
		//Check contact with feeder
		if (interact.call(this, Feeder, Feeder.prototype.radius + this.radius, function (nearbyObjectsIndex) {
			this.food = 1;
			this.nearbyObjects[nearbyObjectsIndex].feed();
			this.nearbyObjects.splice(0, this.nearbyObjects.length);
		})) {return;}
		//Check sense dist with feeder
		if (interact.call(this, Feeder, this.senseDist, function (nearbyObjectsIndex) {
			this.phi = Math.atan2(this.nearbyObjects[nearbyObjectsIndex].y - this.y, this.nearbyObjects[nearbyObjectsIndex].x - this.x + Math.PI / 2);
			this.movePolar();
			this.nearbyObjects.splice(0, this.nearbyObjects.length);
		})) {return;}
		if (!this.borderControl()) {
			//check detection of scentMap
			interact.call(this, ScentMapObject, ScentMapObject.prototype.radius, function (nearbyObjectsIndex) {
				this.phi = this.nearbyObjects[nearbyObjectsIndex].foodTheta + Math.PI / 2;
			});
		}
	} else if (this.food === 1) {
		//check contact with queen. NB - nearbyObjects should not contain queens from different colonies
		if (!interact.call(this, Queen, Queen.prototype.radius, function (nearbyObjectsIndex) {
			this.food = 0;
			this.nearbyObjects[nearbyObjectsIndex].feed();
			this.phi += Math.PI;
			this.nearbyObjects.splice(0, this.nearbyObjects.length);
		})) {
			//go back to queen
			this.phi = Math.atan2(colonies[this.colonyId].queen.y - this.y, colonies[this.colonyId].queen.x - this.x + Math.PI / 2);
			//detect scent map and add / create scent
			if (!interact.call(this, ScentMapObject, ScentMapObject.prototype.radius, function (nearbyObjectsIndex) {
				this.nearbyObjects[nearbyObjectsIndex].foodTheta = this.phi - 1.5 * Math.PI;
				this.nearbyObjects[nearbyObjectsIndex].scent += 1;
			})) {
				environment.createScent(this.x, this.y, this.phi - 1.5 * Math.PI, 1);
			}
		}
	}
	this.movePolar();
	this.nearbyObjects.splice(0, this.nearbyObjects.length);
};
WorkerAnt.prototype.movePolar = function() {
	var spread = .1;
	this.phi += (.5 - Math.random()) * 2 * spread;				
	this.x += this.maxV * (Math.cos(this.phi));
	this.y += this.maxV * (Math.sin(this.phi));
};
WorkerAnt.prototype.borderControl = function () {
	var bounceDist = this.radius + this.maxV;
	function angleMove (angle) {
		this.phi = -this.phi + angle;
		this.movePolar();
		return true;
	}
	if (this.x - bounceDist <= 0) {
		if (Math.cos(this.phi) < 0) {angleMove.call(this, Math.PI);}
	} else if (this.x + bounceDist >= canvas.width) {
		if (Math.cos(this.phi) > 0) {angleMove.call(this, Math.PI);}	
	} else if (this.y - bounceDist <= 0) {
		if (Math.sin(this.phi) < 0) {angleMove.call(this, 0);}
	} else if (this.y + bounceDist >= canvas.height) {
		if (Math.sin(this.phi) > 0) {angleMove.call(this, 0);}
	}
	return false;
};
WorkerAnt.prototype.attack = function (ant) {
	ant.dead = true;
};
//ScentMapObject
function ScentMapObject (x, y, foodTheta, scent) {
	this.x = x;
	this.y = y;
	this.foodTheta = foodTheta;
	this.scent = scent;
}
ScentMapObject.prototype = new CircleObject();
ScentMapObject.prototype.constructor = ScentMapObject;
ScentMapObject.prototype.radius = WorkerAnt.prototype.radius * 3;
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
				var objRadius = Math.sqrt(Math.pow(xSeparation, 2) + Math.pow(ySeparation, 2));
				if (objRadius < interactionDist) {
					return true;
				}
			}
			return false;
		}
		function searchLeftRight (j, obj0) {
			obj1 = environment.allXYObjects[j];
			//do not include ants from the same colony or queens from different colonies in nearbyObjects
			if (!(obj1.constructor === WorkerAnt && obj1.colonyId === obj0.colonyId) && !(obj1.constructor === Queen && obj1.colonyId !== obj0.colonyId)) {
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
					if (!searchLeftRight (j, obj0)) {break;}
				}
				j = i;
				//check right
				while (++j < environment.allXYObjects.length) {
					if (!searchLeftRight (j, obj0)) {break;}
				}
			}
		}
	};
	this.scentMap = [];
	this.scentMapSize = 1024;
	this.scentMapMinScent = .1;
	this.createScent = function (x, y, foodTheta, scent) {
		function mapToScale (num) {
			quantum = ScentMapObject.prototype.radius * 2;
			return (num / quantum).toFixed(0) * quantum;
		}
		environment.scentMap.push(new ScentMapObject(mapToScale(x), mapToScale(y), foodTheta, scent));
	};
	this.degradeScentMap = function () {
		var num = this.scentMap.length;
		var excessMap = num - this.scentMapSize;
		//degrade scent
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
//Queens
function Queen(x, y, colonyId) {
	this.x = x;
	this.y = y;
	this.energy = 3;
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
	var spawnEnergy = 3;
	while (this.energy >= spawnEnergy) {
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
	this.energy = 128;
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
//set up new simulation
(function () {
	var intFeeders = intColonies - 1;
	for (var i = 0; i < intFeeders; i++) {
		feeders[i] = new Feeder(Math.random() * (canvas.width - 2 * Feeder.prototype.radius) + Feeder.prototype.radius, Math.random() * (canvas.height - 2 * Feeder.prototype.radius) + Feeder.prototype.radius, i);
	}
	for (var i = 0; i < intColonies; i++) {
		colonies[i] = new Colony(i);
		colonies[i].queen.spawn(i);
	}
})();
//run
function run () {
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
					feeders.pop();
				}
			} else {
				colonies[i].workers[j].decide();
			}
		}
	}
	draw();
}