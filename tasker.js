modules.export = 

function executeNextTask(task) {
	if (task) {
		incompleteTasks.push(task);
		console.log('added',task,'to list of incomplete tasks');
	};

	if (processingTasks.length>0) return;

	var task = incompleteTasks.shift();
	processingTasks.push(task);
	console.log('added',task,'to list of processing tasks');

	getTimes(task).then(function() {
		//task is done, call self. remove from processing
		processingTasks.shift();
		executeNextTask();
	}, function() {
		throw new Error('Failed to contact cloak server, giving up');
	})
}