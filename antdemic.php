<!DOCTYPE html>
<html>
	<head>
		<?php include '../includes/head_template.php' ?>
	</head>
	<body>
		<?php include '../includes/header_template.php' ?>
		<h2>Antdemic</h2>
		<h3>About</h3>
		<p>
			Each worker ant has a very limited sense distance and finds food using scent trails laid down by other worker ants.
			Worker ants instinctively know their way back to their queen and feed her.
			As the queen feeds she spawns new workers.
			Each feeder has a limited food supply and when it is used up a new feeder is spawned in a new location.
			Worker ants will attack worker ants from other colonies if they come into contact.
			If a colony loses all its ants the queen will perish and the number of feeders on the canvas is reduced.
		</p>
		<h3>Controls</h3>
		<p>Left click on the canvas to add a feeder and right click on a feeder to remove it.</p>
		<script src="antdemic_model.js"></script>
		<script src="antdemic_view.js"></script>
		<script src="antdemic_controller.js"></script>
		<script>run();</script>
		<?php include '../includes/template_scripts.php' ?>
		<script>shifterOn = false; //deactivate shifter from template script to free up resources</script>
	</body>
</html>