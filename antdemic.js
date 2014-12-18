var antdemic = (function() {
//
//Model
//
//declaration
var intColonies = 48;
var environment;
var workerAnts = [], queens = [], feeders = [], colonies = [];
//canvas setup
var canvas = document.createElement('canvas');
canvas.width = 640;
canvas.height = canvas.width;
var context = canvas.getContext('2d');
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
			var quantum = ScentMapObject.prototype.radius * 2;
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
	var i;
	var intFeeders = intColonies - 1;
	for (i = 0; i < intFeeders; i++) {
		feeders[i] = new Feeder(Math.random() * (canvas.width - 2 * Feeder.prototype.radius) + Feeder.prototype.radius, Math.random() * (canvas.height - 2 * Feeder.prototype.radius) + Feeder.prototype.radius, i);
	}
	for (i = 0; i < intColonies; i++) {
		colonies[i] = new Colony(i);
		colonies[i].queen.spawn(i);
	}
})();
//run
var running = true;
function run () {
	if (!running) {
		return;
	}
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



//
//View
//
var viewHolder = document.createElement('div');
//Text View
(function initView() {
	var curry = function(func) {
		var curried = function(args) {
			if (args.length >= func.length) {
				return func.apply(null, args);
			}
			return function() {
				return curried(args.concat(Array.prototype.slice.apply(arguments)));
			};
		};
		return curried(Array.prototype.slice.apply(arguments, [1]));
	};
	var addView = function(parentEl, childEl, txtNode) {
		var childElement = document.createElement(childEl);
		childElement.appendChild(document.createTextNode(txtNode));
		parentEl.appendChild(childElement);
	};
	var curryAddView = curry(addView);
	var addViewToVH = curryAddView(viewHolder);
	var addH2 = addViewToVH('h2');
	var addH3 = addViewToVH('h3');
	var addP = addViewToVH('p');
	
	addH2('Antdemic');
	addH3('About');
	addP('Each worker ant has a very limited sense distance and finds food using scent trails laid down by other worker ants. ' +
		'Worker ants instinctively know their way back to their queen and feed her. ' +
		'As the queen feeds she spawns new workers. ' +
		'Each feeder has a limited food supply and when it is used up a new feeder is spawned in a new location. '+
		'Worker ants will attack worker ants from other colonies if they come into contact. ' +
		'If a colony loses all its ants the queen will perish and the number of feeders on the canvas is reduced.');
	addH3('Controls');
	addP('Left click on the canvas to add a feeder and right click on a feeder to remove it.');
	

}());
function appendView() {
	viewHolder.appendChild(statsButton);
	viewHolder.appendChild(scentMapButton);
	viewHolder.appendChild(animationBlurLabel);
	viewHolder.appendChild(canvas);
	document.body.appendChild(viewHolder);
}

var animationBlurAlpha = .17;
//requestAnimFrame
window.requestAnimFrame=(function(){
	return  window.requestAnimationFrame ||
	window.webkitRequestAnimationFrame ||
	window.mozRequestAnimationFrame ||
	function(callback){
		window.setTimeout(callback, 1000 / 60);
	};
})();
//draw
function draw() {
	var i;
	context.fillStyle = 'rgba(255, 255, 255, ' + animationBlurAlpha + ')';
	context.fillRect(0, 0, canvas.width, canvas.height);
	environment.degradeScentMap();
	if (scentMapSwitch) {
		environment.drawScentMap();
	}
	for (i = 0; i < colonies.length; i++) {
		if (!colonies[i].dead) {
			colonies[i].queen.draw(colonies[i].color);
		}
	}
	for (i = 0; i < feeders.length; i++) {
		feeders[i].draw(feeders[i].color);
	}
	for (i = 0; i < colonies.length; i++) {
		for (var j = 0; j < colonies[i].workers.length; j++) {
			colonies[i].workers[j].draw(colonies[i].color);
		}
	}
	//analysis
	context.font = '10px Calibri';
	if (statsSwitch) {
		var totalWorkers = 0;
		var liveColonies = 0;
		for (i = 0; i < colonies.length; i++) {
			if (!colonies[i].dead){
				totalWorkers += colonies[i].workers.length;
				context.fillStyle = colonies[i].color;
				context.fillText('colonyId ' + i + ': ' + colonies[i].workers.length, 0, 10 * liveColonies + 10);
				liveColonies++;
			}
		}
		context.fillStyle = 'blue';
		context.fillText('Total Worker Ants: ' + totalWorkers, 0, 10 * liveColonies + 10);
		context.fillText('Scent Map Size: ' + environment.scentMap.length, 0, 10 * (liveColonies + 1) + 10);
	}
}



//
//Controller
//
var scentMapSwitch = false;
var statsSwitch = true;
var scentMapButton = document.createElement('button');
var statsButton = document.createElement('button');
var animationBlurLabel = document.createElement('label');
animationBlurLabel.innerHTML = 'Adjust Motion Blur Effect';
var animationBlurRange = document.createElement('input');
animationBlurRange.setAttribute('type', 'range');
animationBlurRange.setAttribute('min', '1');
animationBlurRange.setAttribute('max', '16');
animationBlurRange.setAttribute('step', '1');
animationBlurRange.setAttribute('value', 1 / animationBlurAlpha);
animationBlurRange.onchange = function () {
	animationBlurAlpha = 1 / this.value;
};
scentMapButton.onfocus = function () {
	if (this.blur) {
		this.blur();
	}
};
statsButton.onfocus = function () {
	if (this.blur) {
		this.blur();
	}
};
animationBlurLabel.appendChild(animationBlurRange);
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
canvas.addEventListener('contextmenu', function(e) {
	e.preventDefault();
	var mousePos = getMousePos(canvas, e);
	var num = feeders.length;
	while (num--) {
		if (mousePos.x > feeders[num].x - feeders[num].radius && mousePos.x < feeders[num].x + feeders[num].radius) {
			if (mousePos.y > feeders[num].y - feeders[num].radius && mousePos.y < feeders[num].y + feeders[num].radius) {
				feeders.splice(num, 1);
			}
		}
	}
	return;
}, false);
canvas.addEventListener('click', function(e) {
	var mousePos = getMousePos(canvas, e);
	if (e.button === 0) {
		feeders[feeders.length] = new Feeder(mousePos.x, mousePos.y);
	}
}, false);



function on() {
	appendView();
	running = true;
	run();
}

function off () {
	running = false;
	viewHolder.parentNode && viewHolder.parentNode.removeChild(viewHolder);
}

return {
	on: on,
	off: off
};

}());

antdemic.on();
