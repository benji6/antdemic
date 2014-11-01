var scentMapSwitch = false;
var statsSwitch = true;
var scentMapButton = document.createElement('button');
var statsButton = document.createElement('button');
var animationBlurRange = document.createElement('input');
animationBlurRange.setAttribute('type', 'range');
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
	var num = feeders.length
	while (num--) {
		if (mousePos.x > feeders[num].x - Feeder.prototype.radius && mousePos.x < feeders[num].x + Feeder.prototype.radius) {
			if (mousePos.y > feeders[num].y - Feeder.prototype.radius && mousePos.y < feeders[num].y + Feeder.prototype.radius) {
				feeders.splice(num, 1);
			}
		}
	}
	return false;
}, false);
canvas.addEventListener('click', function(e) {
	var mousePos = getMousePos(canvas, e);
	if (e.button === 0) {
		feeders[feeders.length] = new Feeder(mousePos.x, mousePos.y);
	}
}, false);


document.body.appendChild(statsButton);
document.body.appendChild(scentMapButton);
document.body.appendChild(animationBlurRange);
document.body.appendChild(canvas);