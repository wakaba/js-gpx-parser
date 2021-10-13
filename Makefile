GIT = git

all:

deps:

git-submodules:
	$(GIT) submodule update --init

test-deps: deps git-submodules test-deps-main

test-deps-main: local local/sami-core.js local/sami-test.js

test: test-deps test-main

test-main:
#XXX

local:
	mkdir -p local

local/sami-core.js: local
	wget -O $@ https://raw.githubusercontent.com/wakaba/samijs/master/sami/script/sami-core.js
local/sami-test.js: local
	wget -O $@ https://raw.githubusercontent.com/wakaba/samijs/master/sami/script/sami-test.js

## License: Public Domain.
