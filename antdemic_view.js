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
	context.fillStyle = 'rgba(255, 255, 255, ' + animationBlurAlpha + ')';
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
		var liveColonies = 0;
		for (var i = 0; i < colonies.length; i++) {
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