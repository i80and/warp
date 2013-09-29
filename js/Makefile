BROWSERIFY=./node_modules/.bin/browserify

main.js: $(BROWSERIFY) src/example.js src/warp.js src/xorshift.js main_worker.js main_workerline.js
	$(BROWSERIFY) src/example.js -o main.js

main_worker.js: $(BROWSERIFY) src/example_worker.js src/warp.js src/xorshift.js
	$(BROWSERIFY) src/example_worker.js -o main_worker.js

main_workerline.js: $(BROWSERIFY) src/example_workerline.js src/warpline.js src/xorshift.js
	$(BROWSERIFY) src/example_workerline.js -o main_workerline.js

$(BROWSERIFY):
	npm update
