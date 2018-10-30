all:

deps:

test-deps: deps test-deps-main

test-deps-main: local local/sami-core.js local/sami-test.js

local:
	mkdir -p local

local/sami-core.js: local
	wget -O $@ https://raw.githubusercontent.com/wakaba/samijs/master/sami/script/sami-core.js
local/sami-test.js: local
	wget -O $@ https://raw.githubusercontent.com/wakaba/samijs/master/sami/script/sami-test.js

## License: Public Domain.
