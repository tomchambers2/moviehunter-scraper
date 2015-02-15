for (var i = 0; i < 10; i++) {
	var timer = Math.random() * 10000;
	function test(i, timer) {
		setTimeout(function() {
			console.log('test ',i,'has finished after',timer)
		}, timer)
	}

	test(i, timer);
};