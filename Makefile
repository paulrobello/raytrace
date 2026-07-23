.PHONY: install build test lint fmt typecheck checkall clean screenshot serve

install:
	npm install

build:
	vite build

test:
	node tests/smoke-types.js
	node tests/headless-render.js

lint:
	npx eslint . --ext .js

fmt:
	npx eslint . --ext .js --fix

typecheck:
	@echo "typecheck: no type system (plain JavaScript)"

checkall: lint test
	@echo "checkall: OK"

clean:
	rm -rf node_modules

screenshot:
	node tests/render-screenshot.js

serve:
	@echo "dev server on http://localhost:5173 (vite)"
	vite
